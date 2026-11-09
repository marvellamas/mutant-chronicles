// Lotto 161 (02/11/2026): in una prova la guardia protegge ogni cartella con personaggi, ovunque stia e comunque si
// chiami, riconosciuta dal contenuto. Il caso: i file di Davide estratti in `Desktop\Zip_davide` non erano fra le
// cartelle vere (quelle dell'app, PersonaggiBackup, il profilo) e un server di prova con --cartella= ci avrebbe scritto.
// Qui una cartella di personaggi finti fuori dal repo e fuori da ogni cartella di prova: la prova legge, non scrive.
// E le strade che restano: le cartelle nate in una prova (mkdtemp) si scrivono; una cartella di prova fatta a mano
// nasce vuota con tools/cartella-di-prova.mjs; la ricerca delle installazioni, in una prova, non esce da %TEMP%.
import '../tools/guardia-subito.mjs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs, { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tempProve, registroProve, cartellaConPersonaggiDi, inCartellaDiProva, eCartellaConPersonaggi } from '../tools/protezione-reali.mjs';
import { installazioniMutant, cercaAmmessa } from '../tools/cerca-personaggi.mjs';
import { guardiaAutomatica } from '../tools/guardia-automatica.mjs';
import { controllaSeSbagliata } from '../tools/ripara-installazione.mjs';
import { homedir } from 'node:os';
import { attendiServer } from './attesa-server.js';

const REPO = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const FIX = join(REPO, 'tests', 'fixtures', 'talenti-vecchi');
const PG = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json').slice(0, 2);

// un processo che NON è una prova (nessun segno ereditato, fuori da tests/): fa quello che farebbe Marcello a mano
const { NODE_TEST_CONTEXT: _n, MUTANT_PROVA: _p, ...ambientePulito } = process.env;
const aMano = (codice, ...arg) => {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', codice, '--', ...arg], { encoding: 'utf8', env: ambientePulito, cwd: tempProve() });
  assert.equal(r.status, 0, `processo a mano: ${r.stderr}`);
  return r.stdout;
};

// «i file di Davide»: una cartella dei dati con personaggi/ (contenuto vero di personaggi, nome qualunque) e px/,
// creata a mano direttamente in %TEMP% (non dentro una cartella di prova) e fuori dal repo
const zip = join(tempProve(), `Zip_finto_${process.pid}_${Date.now()}`);
aMano(`import fs from 'node:fs'; import { join } from 'node:path';
const [zip, fix, ...pg] = process.argv.slice(1);
fs.mkdirSync(join(zip, 'personaggi'), { recursive: true }); fs.mkdirSync(join(zip, 'px'));
for (const f of pg) fs.copyFileSync(join(fix, f), join(zip, 'personaggi', f));
fs.writeFileSync(join(zip, 'px', 'px.json'), '{"partite":[]}');`, zip, FIX, ...PG);
after(() => aMano("import fs from 'node:fs'; fs.rmSync(process.argv[1], { recursive: true, force: true });", zip));

function impronta(dir) {
  const out = {};
  const giro = (p, rel) => { const st = statSync(p); if (st.isDirectory()) { out[`${rel}/`] = 'cartella'; for (const n of readdirSync(p)) giro(join(p, n), `${rel}/${n}`); } else out[rel] = `${st.size}|${createHash('sha1').update(readFileSync(p)).digest('hex')}`; };
  giro(dir, '.');
  return out;
}
const rifiutata = (f, come) => assert.throws(f, (e) => e.code === 'MUTANT_CARTELLA_VERA' && /cartella con personaggi/.test(e.message), come);

test('la cartella si riconosce dal contenuto, non dal nome; fuori dalle cartelle di prova', () => {
  assert.ok(guardiaAutomatica(), 'questo test è una prova con la guardia accesa');
  assert.ok(!/personaggi|mutant/i.test(zip.split(/[\\/]/).at(-1)), 'il nome non dice niente');
  assert.ok(eCartellaConPersonaggi(zip) && eCartellaConPersonaggi(join(zip, 'personaggi')));
  assert.equal(inCartellaDiProva(join(zip, 'personaggi', PG[0])), false);
  assert.equal(cartellaConPersonaggiDi(join(zip, 'px', 'px.json')), zip, 'tutta la cartella dei dati, non solo personaggi/');
  // una cartella con file .json che non sono personaggi non è protetta
  const altri = mkdtempSync(join(tempProve(), 'mutant-altri-'));
  assert.equal(cartellaConPersonaggiDi(join(altri, 'x.json')), null);
  rmSync(altri, { recursive: true, force: true });
});

test('in una prova ogni scrittura nella cartella con personaggi è rifiutata, la lettura no, e la cartella resta identica', async () => {
  const prima = impronta(zip);
  const f = join(zip, 'personaggi', PG[0]);
  // lettura: permessa
  assert.match(readFileSync(f, 'utf8'), /mutant-personaggio/);
  assert.deepEqual(readdirSync(join(zip, 'personaggi')).sort(), [...PG].sort());
  // scrittura, in tutte le forme
  rifiutata(() => writeFileSync(f, '{}'), 'riscrivere un personaggio');
  rifiutata(() => writeFileSync(join(zip, 'personaggi', 'nuovo.json'), '{}'), 'un file nuovo fra i personaggi');
  rifiutata(() => writeFileSync(join(zip, 'px', 'px.json'), '{}'), 'px.json accanto');
  rifiutata(() => fs.appendFileSync(f, ' '), 'aggiungere');
  rifiutata(() => mkdirSync(join(zip, 'tavolo')), 'una cartella nuova');
  rifiutata(() => fs.renameSync(f, `${f}.bak`), 'rinominare');
  rifiutata(() => fs.unlinkSync(f), 'cancellare');
  rifiutata(() => rmSync(join(zip, 'personaggi'), { recursive: true }), 'cancellare la cartella');
  rifiutata(() => fs.copyFileSync(join(FIX, PG[1]), join(zip, 'personaggi', 'copia.json')), 'copiarci dentro');
  rifiutata(() => mkdtempSync(join(zip, 'sotto-')), 'una cartella «di prova» dentro');
  await assert.rejects(fs.promises.writeFile(f, '{}'), (e) => e.code === 'MUTANT_CARTELLA_VERA');
  await assert.rejects(new Promise((ok, ko) => fs.writeFile(f, '{}', (e) => (e ? ko(e) : ok()))), (e) => e.code === 'MUTANT_CARTELLA_VERA');
  // mkdir di una cartella che c'è già non cambia niente: lo fa il server prima di leggere
  mkdirSync(join(zip, 'personaggi'), { recursive: true });
  assert.deepEqual(impronta(zip), prima, 'la cartella con personaggi è cambiata');
});

test('le cartelle nate nella prova (mkdtemp) restano scrivibili, anche con personaggi finti; il registro no', () => {
  const mia = mkdtempSync(join(tempProve(), 'mutant-mia-'));
  assert.equal(readdirSync(mia).length, 0, 'dentro la cartella non si aggiunge niente');
  for (const f of PG) writeFileSync(join(mia, f), readFileSync(join(FIX, f)));
  writeFileSync(join(mia, PG[0]), readFileSync(join(FIX, PG[1])));
  mkdirSync(join(mia, 'personaggi'));
  writeFileSync(join(mia, 'personaggi', 'x.json'), readFileSync(join(FIX, PG[0])));
  fs.unlinkSync(join(mia, PG[1]));
  rmSync(mia, { recursive: true });
  assert.equal(existsSync(mia), false);
  // il registro delle cartelle di prova lo scrive solo mkdtemp
  assert.throws(() => writeFileSync(join(registroProve(), 'a-mano'), zip), (e) => e.code === 'MUTANT_CARTELLA_VERA' && /registro delle cartelle di prova/.test(e.message));
});

test('cartella di prova fatta a mano: nasce vuota, poi si riempie; non si può «liberare» una cartella che ha già personaggi', () => {
  const nuova = join(tempProve(), `mutant-a-mano-${process.pid}-${Date.now()}`);
  const strumento = join(REPO, 'tools', 'cartella-di-prova.mjs');
  const fuori = spawnSync(process.execPath, [strumento, zip], { encoding: 'utf8', env: ambientePulito });
  assert.notEqual(fuori.status, 0);
  assert.match(fuori.stderr, /non è vuota/);
  const dentroProva = spawnSync(process.execPath, [strumento, nuova], { encoding: 'utf8' });
  assert.notEqual(dentroProva.status, 0, 'da una prova non si annota niente a mano');
  const ok = spawnSync(process.execPath, [strumento, nuova], { encoding: 'utf8', env: ambientePulito });
  assert.equal(ok.status, 0, ok.stderr);
  writeFileSync(join(nuova, PG[0]), readFileSync(join(FIX, PG[0])));
  writeFileSync(join(nuova, PG[0]), readFileSync(join(FIX, PG[1])));
  rmSync(nuova, { recursive: true });
  // e i file di Davide restano protetti
  rifiutata(() => writeFileSync(join(zip, 'personaggi', PG[0]), '{}'), 'dopo il rifiuto dello strumento');
});

test('in una prova la ricerca delle installazioni non esce dalla cartella temporanea: non vede il repo né il Desktop', () => {
  assert.equal(cercaAmmessa(REPO), false);
  assert.equal(cercaAmmessa(join(tempProve(), 'qualcosa')), true);
  // il repo è un'installazione (server.mjs): fuori da una prova la troverebbe; qui no
  assert.deepEqual(installazioniMutant(REPO, { radici: [[REPO, 1], [join(REPO, '..'), 2]] }), []);
  const fuoriProva = aMano(`import { installazioniMutant } from ${JSON.stringify(new URL('../tools/cerca-personaggi.mjs', import.meta.url).href)};
console.log(JSON.stringify(installazioniMutant(process.argv[1], { radici: [[process.argv[1], 1]] })));`, REPO);
  assert.equal(JSON.parse(fuoriProva).length, 1, 'fuori da una prova la ricerca è quella di sempre');
  // la strada di tests/impostazioni.test.js: un'installazione nuova (senza personaggi) in una prova, con la cartella
  // dell'utente vera, non «trova i personaggi in un'altra installazione» (sul portatile: il repo e Zip_davide)
  const vuota = mkdtempSync(join(tempProve(), 'mutant-installazione-vuota-'));
  assert.equal(controllaSeSbagliata(vuota, { home: homedir() }), null);
  rmSync(vuota, { recursive: true, force: true });
});

test('un server di prova con --cartella= sulla cartella con personaggi: legge, non scrive', async () => {
  const prima = impronta(zip);
  const profilo = mkdtempSync(join(tempProve(), 'mutant-prof-srv-'));
  const porta = 3700 + Math.floor(Math.random() * 200);
  // lotto 185: stdout e stderr aperti, così se il server esce il rosso dice perché
  const p = spawn(process.execPath, [join(REPO, 'server.mjs'), `--porta=${porta}`, '--solo-locale', '--senza-avvisi', `--cartella=${join(zip, 'personaggi')}`], { env: { ...process.env, MUTANT_CONFIG_DIR: profilo }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    // attesa senza budget a caso (tests/attesa-server.js): finisce appena risponde, o appena il processo esce
    const lista = await attendiServer(async () => { try { const r = await fetch(`http://127.0.0.1:${porta}/api/personaggi`); return r.ok ? await r.json() : null; } catch { return null; } }, { figlio: p });
    assert.ok(Array.isArray(lista), 'l’elenco si legge');
    assert.deepEqual(lista.map((x) => x.file).sort(), [...PG].sort());
    const file = lista[0].file;
    const o = await (await fetch(`http://127.0.0.1:${porta}/api/personaggi/${encodeURIComponent(file)}`)).json();
    assert.equal(o.formato, 'mutant-personaggio', 'il personaggio si legge');
    const put = await fetch(`http://127.0.0.1:${porta}/api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...o, scelte: { ...o.scelte, nome: 'CAMBIATO' } }) });
    assert.ok(!put.ok, 'il salvataggio è rifiutato');
    assert.match(await put.text(), /cartella con personaggi/);
  } finally { p.kill(); }
  await new Promise((ok) => setTimeout(ok, 300));
  assert.deepEqual(impronta(zip), prima, 'la cartella con personaggi è cambiata');
  rmSync(profilo, { recursive: true, force: true });
});
