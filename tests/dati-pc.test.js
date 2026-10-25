// 26/10/2026, «Davide non trova i personaggi dopo ogni aggiornamento»: la cartella dei dati di questo PC sta nel profilo
// di Windows (tools/dati-pc.mjs) e nessun modo di aggiornare tocca i dati. L'installazione di prova imita quella di
// Davide: il pacchetto zip (1_scarica_o_aggiorna_app.bat + mutant\), i personaggi con i PX nella copia vecchia, un
// aggiornamento che finisce in una copia nuova. Il profilo è sempre quello di prova (tests/profilo-di-prova.mjs).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cartellaDati, migraSeServe, leggiImpostazione, scriviImpostazione, percorsoImpostazione } from '../tools/dati-pc.mjs';
import { annotaPrima, confrontaPersonaggi, personaggiDalServer, personaggiAdesso } from '../tools/esito-aggiornamento.mjs';
import { cerca } from '../tools/cerca-personaggi.mjs';
import { voceCerca } from '../tools/console.mjs';
import { creaZip } from '../tools/salva-sessione.mjs';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const windows = process.platform === 'win32';
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const fixture = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json');
const scrivi = (p, t) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, t); };
const tmp = () => mkdtempSync(join(tmpdir(), 'mutant-datipc-'));
function impronta(dir, base = dir, out = {}) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) impronta(p, base, out);
    else out[relative(base, p).replace(/\\/g, '/')] = createHash('sha1').update(readFileSync(p)).digest('hex');
  }
  return out;
}
const DATI = ['personaggi', 'px', 'tavolo', 'salvataggi'];
// i LEGGIMI.txt sono file dell'app (l'aggiornamento li rimette), non dati
const improntaDati = (d) => Object.fromEntries(DATI.map((c) => [c, Object.fromEntries(Object.entries(impronta(join(d, c))).filter(([k]) => k !== 'LEGGIMI.txt'))]));

/** La copia dell'app di Davide con i suoi dati: sette personaggi con i PX di ieri sera, px.json, tavolo, salvataggi. */
function copiaConDati(r, nome = 'mutant') {
  const d = join(r, nome);
  for (const f of fixture) {
    const o = JSON.parse(readFileSync(new URL(f, FIX), 'utf8'));
    scrivi(join(d, 'personaggi', f), JSON.stringify({ ...o, scelte: { ...o.scelte, puntiEsperienza: 120 + f.length } }, null, 2));
  }
  scrivi(join(d, 'px', 'px.json'), JSON.stringify({ archivio: [{ data: '2026-10-25', px: 120 }] }));
  scrivi(join(d, 'tavolo', 'sessione.json'), '{"personaggi":[]}');
  scrivi(join(d, 'salvataggi', 'LEGGIMI.txt'), 'leggimi');
  scrivi(join(d, 'config-salvataggi.json'), '{"autosave_minuti":5,"cartella_drive":""}');
  scrivi(join(d, 'server.mjs'), '// app');
  return d;
}
/** Una copia dell'app vuota (com'è dopo un aggiornamento finito in un'altra cartella). */
function copiaVuota(r, nome) {
  const d = join(r, nome);
  for (const c of DATI) scrivi(join(d, c, 'LEGGIMI.txt'), 'leggimi');
  scrivi(join(d, 'server.mjs'), '// app');
  return d;
}

beforeEach(() => { rmSync(percorsoImpostazione(), { force: true }); });

test('B: la cartella dei dati sta nel profilo; la migrazione silenziosa la scrive solo da una copia che ha i personaggi', () => {
  const r = tmp();
  const vecchia = copiaConDati(r);
  const nuova = copiaVuota(r, 'mutant-nuova');
  assert.equal(migraSeServe(nuova), null, 'una copia vuota non scrive niente');
  assert.equal(leggiImpostazione(), null);
  assert.equal(cartellaDati(nuova).fonte, 'app');
  const imp = migraSeServe(vecchia);
  assert.equal(imp.cartella, vecchia);
  // da qui in avanti anche la copia nuova usa i personaggi della vecchia
  assert.deepEqual([cartellaDati(nuova).cartella, cartellaDati(nuova).fonte], [vecchia, 'profilo']);
  assert.equal(migraSeServe(vecchia), null, 'una volta sola');
  // config-salvataggi.json letto prima di migrare: se indica dove sono i personaggi, vale quello
  rmSync(percorsoImpostazione());
  const altrove = copiaConDati(r, 'altrove');
  scrivi(join(nuova, 'config-salvataggi.json'), JSON.stringify({ cartella_personaggi: join(altrove, 'personaggi') }));
  assert.equal(migraSeServe(nuova).cartella, altrove);
  // la cartella impostata sparisce: si usa l'app e lo si dice
  scriviImpostazione(join(r, 'non-ce-piu'));
  const d = cartellaDati(nuova);
  assert.equal(d.fonte, 'app');
  assert.match(d.problema, /non c'è più/);
});

test('B: il server di una copia nuova trova i personaggi della cartella impostata nel profilo', async () => {
  const r = tmp();
  const vecchia = copiaConDati(r);
  scriviImpostazione(vecchia);
  const porta = 3200 + Math.floor(Math.random() * 500);
  // il server.mjs del repository è «la copia nuova»: senza --cartella, deve leggere i personaggi dal profilo
  const p = spawn(process.execPath, [join(REPO, 'server.mjs'), `--porta=${porta}`, '--solo-locale', '--senza-avvisi'], { env: process.env, stdio: 'ignore' });
  try {
    let lista = null;
    for (let i = 0; i < 60 && !lista; i++) {
      await new Promise((ok) => setTimeout(ok, 250));
      try { lista = await (await fetch(`http://127.0.0.1:${porta}/api/personaggi`)).json(); } catch { /* non ancora */ }
    }
    assert.ok(lista, 'il server risponde');
    assert.equal(lista.length, fixture.length);
    const avvio = await (await fetch(`http://127.0.0.1:${porta}/api/avvio`)).json();
    assert.equal(avvio.percorso, join(vecchia, 'personaggi'));
  } finally { p.kill(); }
});

test('B, voce 2 e 1_scarica (zip): l’aggiornamento di una copia dell’app non scrive un byte nei dati', { skip: windows ? false : 'solo su Windows' }, () => {
  const r = tmp();
  const vecchia = copiaConDati(r);
  scriviImpostazione(vecchia);
  const prima = improntaDati(vecchia);
  // lo script vero dell'aggiornamento da zip (lo usano la voce 2 e 1_scarica_o_aggiorna_app.bat), sulla copia vecchia
  const s = join(r, 'estratto', 'mutant-main');
  for (const [k, v] of Object.entries({ 'index.html': 'nuova', 'server.mjs': '// nuovo', 'versione.json': '{"versione":"n"}', 'package.json': '{}', 'src/a.js': '', 'data/r.json': '{}', 'personaggi/LEGGIMI.txt': 'leggimi', 'px/LEGGIMI.txt': 'leggimi', 'tavolo/LEGGIMI.txt': 'leggimi', 'salvataggi/LEGGIMI.txt': 'leggimi' })) scrivi(join(s, k), v);
  mkdirSync(join(s, 'tools'), { recursive: true }); copyFileSync(join(REPO, 'tools', 'file-locali.json'), join(s, 'tools', 'file-locali.json'));
  mkdirSync(join(s, 'distribuzione'), { recursive: true }); copyFileSync(join(REPO, 'distribuzione', 'aggiorna-da-zip.ps1'), join(s, 'distribuzione', 'aggiorna-da-zip.ps1'));
  const ps = (dest) => spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(REPO, 'distribuzione', 'aggiorna-da-zip.ps1'), '-Sorgente', s, '-Destinazione', dest, '-Lavoro', join(r, 'lavoro')], { encoding: 'utf8' });
  assert.equal(ps(vecchia).status, 0);
  // e la stessa versione scaricata in un'altra cartella (il guaio di stamattina): i dati della vecchia non cambiano
  assert.equal(ps(join(r, 'pacchetto-nuovo', 'mutant')).status, 0);
  assert.deepEqual(improntaDati(vecchia), prima);
  assert.equal(cartellaDati(join(r, 'pacchetto-nuovo', 'mutant')).cartella, vecchia, 'la copia nuova usa i dati della vecchia');
});

test('B, git pull: i dati sono fuori da git e fuori dalla copia che si aggiorna', { skip: spawnSync('git', ['--version']).status === 0 ? false : 'git non disponibile' }, () => {
  const r = tmp();
  const git = (dove, ...a) => spawnSync('git', a, { cwd: dove, encoding: 'utf8' });
  const origine = join(r, 'origine');
  scrivi(join(origine, 'index.html'), '1');
  scrivi(join(origine, '.gitignore'), 'personaggi/*\n!personaggi/LEGGIMI.txt\npx/*\n!px/LEGGIMI.txt\ntavolo/*\n!tavolo/LEGGIMI.txt\nsalvataggi/*\n!salvataggi/LEGGIMI.txt\n');
  for (const c of DATI) scrivi(join(origine, c, 'LEGGIMI.txt'), 'leggimi');
  git(origine, 'init', '--initial-branch=main', '--quiet'); git(origine, 'config', 'user.email', 'p@e.it'); git(origine, 'config', 'user.name', 'P');
  git(origine, 'add', '-A'); git(origine, 'commit', '-m', 'uno', '--quiet');
  const copia = join(r, 'copia');
  assert.equal(git(r, 'clone', '--quiet', origine, copia).status, 0);
  // i dati nella copia stessa (come sul fisso) e quelli in un'altra cartella del profilo: nessuno dei due cambia
  for (const f of fixture.slice(0, 2)) copyFileSync(new URL(f, FIX), join(copia, 'personaggi', f));
  scrivi(join(copia, 'px', 'px.json'), '{"archivio":[1]}');
  const primaCopia = improntaDati(copia);
  const vecchia = copiaConDati(r, 'dati');
  scriviImpostazione(vecchia);
  const primaVecchia = improntaDati(vecchia);
  scrivi(join(origine, 'index.html'), '2'); git(origine, 'add', '-A'); git(origine, 'commit', '-m', 'due', '--quiet');
  assert.equal(git(copia, 'pull', '--ff-only').status, 0);
  assert.deepEqual(improntaDati(copia), primaCopia);
  assert.deepEqual(improntaDati(vecchia), primaVecchia);
});

test('B: nessuno script di aggiornamento scrive nelle cartelle dei dati', () => {
  for (const f of ['aggiorna.bat', 'distribuzione/1_scarica_o_aggiorna_app.bat', 'distribuzione/aggiorna-da-zip.ps1']) {
    const t = readFileSync(join(REPO, f), 'utf8');
    for (const c of DATI) assert.doesNotMatch(t, new RegExp(`(del|rmdir|rd|Remove-Item|copy|xcopy|move|Set-Content|Out-File)[^\\n]*\\\\${c}\\\\`, 'i'), `${f} scrive in ${c}`);
  }
});

test('C: prima e dopo l’aggiornamento — tutto uguale in verde, impostazione persa in rosso con i nomi', async () => {
  const r = tmp();
  const vecchia = copiaConDati(r);
  scriviImpostazione(vecchia);
  const nuova = copiaVuota(r, 'mutant-nuova');
  const prima = annotaPrima(vecchia).dati;
  assert.equal(prima.cartella, join(vecchia, 'personaggi'));
  assert.equal(prima.personaggi.length, fixture.length);
  assert.ok(prima.personaggi.every((p) => p.px >= 120));
  // dopo: dal server (acceso un momento sulla cartella dei dati), tutto uguale
  const dopo = await personaggiDalServer(nuova, { porta: 1 });
  const ok = confrontaPersonaggi(prima, dopo);
  assert.equal(ok.ok, true, ok.righe.join(' / '));
  assert.equal(ok.righe[0], `Personaggi: ${fixture.length} in ${join(vecchia, 'personaggi')}, PX invariati.`);
  // il guaio di stamattina: l'impostazione persa, la copia nuova guarda la sua cartella vuota
  rmSync(percorsoImpostazione());
  const male = confrontaPersonaggi(prima, await personaggiDalServer(nuova, { porta: 1 }));
  assert.equal(male.ok, false);
  assert.match(male.righe.join('\n'), /La cartella dei personaggi e' cambiata/);
  assert.match(male.righe.join('\n'), /Dimitri Orlav: non c'e' piu' \(prima \d+ PX\)/);
  assert.match(male.righe.join('\n'), /Cerca i personaggi/);
  // PX cambiati
  const meno = { ...prima, personaggi: prima.personaggi.map((p, i) => (i ? p : { ...p, px: 0 })) };
  assert.match(confrontaPersonaggi(prima, meno).righe.join('\n'), /prima \d+ PX, adesso 0 PX/);
});

test('D: «Cerca i personaggi» li ritrova nelle altre cartelle, negli zip e il pannello PX; con numero e SI li usa, con Invio niente', async () => {
  const r = tmp();
  const home = join(r, 'utente');
  const vecchia = copiaConDati(join(home, 'Desktop', 'Mutant'));
  // un salvataggio zip più vecchio, nella copia vecchia
  scrivi(join(vecchia, 'salvataggi', 'sessione_2026-10-20_2300.zip'), '');
  writeFileSync(join(vecchia, 'salvataggi', 'sessione_2026-10-20_2300.zip'), creaZip([{ nome: `personaggi/${fixture[0]}`, dati: readFileSync(new URL(fixture[0], FIX)), mtime: new Date(2026, 9, 20) }]));
  // una copia dello storico fatta adesso (la data del file è quella della copia, il contenuto è di prima): non va in cima
  const o0 = JSON.parse(readFileSync(new URL(fixture[0], FIX), 'utf8'));
  scrivi(join(vecchia, 'personaggi', 'storico', String(o0.pg), '2026-10-26T08-00-00.json'), JSON.stringify(o0));
  const nuova = copiaVuota(join(home, 'Downloads', 'Mutant (2)'), 'mutant');
  const t = cerca({ radiceApp: nuova, dati: nuova, home });
  for (const p of t.personaggi) assert.equal(p.versioni[0].tipo, 'cartella', `${p.nome}: in cima la cartella, non uno zip o lo storico`);
  assert.equal(t.personaggi.length, fixture.length);
  const dimitri = t.personaggi.find((p) => /Dimitri/.test(p.nome));
  assert.equal(dimitri.versioni[0].tipo, 'cartella', 'in cima la versione più recente: quella con i PX di ieri');
  assert.ok(dimitri.versioni[0].px >= 120);
  assert.ok(t.copie.some((c) => c.cartella === vecchia && c.quanti === fixture.length));
  assert.ok(t.px.some((x) => x.dove === join(vecchia, 'px', 'px.json') && x.partite === 1), 'il pannello PX di ieri sera');
  // la voce del menu: Invio = niente
  const risposte = (a) => { const coda = [...a]; return { chiedi: async () => coda.shift() ?? '', chiudi: () => {} }; };
  const log = console.log; console.log = () => {};
  try {
    await voceCerca({ radice: nuova, rl: risposte(['']), home, radici: [home] });
    assert.equal(leggiImpostazione(), null, 'Invio: non ha cambiato niente');
    const n = (await voceCerca({ radice: nuova, rl: risposte(['']), home, radici: [home] })).copie.findIndex((c) => c.cartella === vecchia) + 1;
    await voceCerca({ radice: nuova, rl: risposte([String(n), '']), home, radici: [home] });
    assert.equal(leggiImpostazione(), null, 'senza SI non cambia niente');
    await voceCerca({ radice: nuova, rl: risposte([String(n), 'SI']), home, radici: [home] });
  } finally { console.log = log; }
  assert.equal(leggiImpostazione().cartella, vecchia);
  assert.equal(cartellaDati(nuova).cartella, vecchia);
  assert.equal(personaggiAdesso(nuova).personaggi.length, fixture.length);
});
