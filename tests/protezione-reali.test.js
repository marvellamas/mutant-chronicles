// Lotto 145: la cartella dei personaggi veri non si tocca per sbaglio. Nel lotto 144 una prova nel browser aprì la cartella
// vera perché in .claude/launch.json il flag era «--personaggi=» invece di «--cartella=» e il server lo ignorò.
// Tre meccanismi, un test ciascuno: (1) un flag sconosciuto ferma il programma; (2) un avvio di prova sulla cartella
// vera si rifiuta; (3) nessuna scrittura nelle cartelle vere, con un errore chiaro.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, createWriteStream } from 'node:fs';
import fs from 'node:fs';
import { writeFile as scriviAsync, mkdir as creaAsync, rename as spostaAsync } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { argomentiSconosciuti, suggerisci, fermaSeSconosciuti, ARGOMENTI } from '../tools/argomenti.mjs';
import { cartelleReali, controllaAvvioDiProva, eAvvioDiProva, installaGuardiaScrittura, ScritturaRifiutata } from '../tools/protezione-reali.mjs';

const RADICE = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const temp = mkdtempSync(join(tmpdir(), 'mutant-reali-'));
after(() => rmSync(temp, { recursive: true, force: true }));
const lancia = (...a) => spawnSync(process.execPath, a, { cwd: RADICE, encoding: 'utf8', timeout: 20000, env: { ...process.env, MUTANT_CONFIG_DIR: join(temp, 'profilo') } });

// --- 1. un flag sconosciuto ferma il programma ---------------------------------------------------------------------

test('1: «--personaggi» non esiste: si propone «--cartella»; i flag veri passano; i valori e i comandi non si controllano', () => {
  const ammessi = ARGOMENTI['server.mjs'];
  assert.deepEqual(argomentiSconosciuti(['--porta=3017', '--solo-locale', '--cartella=x', 'comando', 'percorso/x'], ammessi), []);
  const [x] = argomentiSconosciuti(['--personaggi=C:/vero'], ammessi);
  assert.deepEqual([x.nome, x.suggerimento], ['personaggi', 'cartella']);
  assert.equal(suggerisci('portta', ammessi), 'porta', 'un errore di battitura');
  assert.equal(suggerisci('solo-locali', ammessi), 'solo-locale');
  assert.equal(suggerisci('qualcosadiverso', ammessi), null);
  // senza il «=» e col valore dopo lo spazio (pulizia-personaggi, migra-talenti)
  assert.equal(argomentiSconosciuti(['--cartella', 'dir', '--su', 'f.txt'], ARGOMENTI['pulizia-personaggi.mjs']).length, 0);
  assert.equal(argomentiSconosciuti(['--cartela', 'dir'], ARGOMENTI['pulizia-personaggi.mjs'])[0].suggerimento, 'cartella');
  // fermaSeSconosciuti: scrive e chiede di uscire con 2
  let uscito = null; let scritto = '';
  fermaSeSconosciuti(['--personaggi=x'], ammessi, 'server.mjs', { esci: (c) => { uscito = c; }, scrivi: (t) => { scritto = t; } });
  assert.equal(uscito, 2);
  assert.match(scritto, /non conosco «--personaggi»: forse intendevi «--cartella»\?/);
});

test('1: il server e gli strumenti si fermano davvero con un flag inventato (codice 2, nessuna cartella aperta)', () => {
  const r = lancia('server.mjs', '--personaggi=C:/qualcosa', '--porta=3999');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /non conosco «--personaggi»: forse intendevi «--cartella»\?/);
  assert.doesNotMatch(r.stdout, /Mutant è acceso|http:\/\/localhost/);
  for (const tool of ['salva-sessione', 'migra-talenti', 'pulizia-personaggi', 'dati-locali', 'esito-aggiornamento', 'aggiorna-avviatori', 'console', 'riavvia']) {
    const t = lancia(`tools/${tool}.mjs`, '--personaggi=X');
    assert.equal(t.status, 2, `${tool}: deve fermarsi`);
    assert.match(t.stderr, /non conosco «--personaggi»/, tool);
  }
});

test('1: nessun flag sbagliato negli script, nei .bat e in .claude/launch.json: quelli che passano al server sono tutti ammessi', () => {
  const ammessi = new Set(ARGOMENTI['server.mjs']);
  const controlla = (testo, dove) => {
    for (const m of testo.matchAll(/--([a-z][a-z-]*)=/g)) if (!ammessi.has(m[1]) && !['radice', 'salta', 'fuori', 'avvia', 'config'].includes(m[1])) assert.fail(`${dove}: «--${m[1]}» non è un argomento che il server conosca`);
  };
  const launch = join(RADICE, '.claude', 'launch.json');
  if (existsSync(launch)) {
    for (const c of JSON.parse(readFileSync(launch, 'utf8')).configurations ?? []) {
      const args = c.runtimeArgs ?? [];
      if (!args.includes('server.mjs')) continue;
      assert.deepEqual(argomentiSconosciuti(args, ARGOMENTI['server.mjs']), [], `launch.json «${c.name}»`);
    }
  }
  for (const f of readdirSync(RADICE).filter((x) => x.endsWith('.bat'))) controlla(readFileSync(join(RADICE, f), 'utf8').split('\n').filter((r) => /server\.mjs/.test(r)).join('\n'), f);
  // i test che avviano il server con i suoi flag usano solo quelli veri
  for (const f of readdirSync(join(RADICE, 'tests')).filter((x) => x.endsWith('.js') && x !== 'protezione-reali.test.js')) {
    const t = readFileSync(join(RADICE, 'tests', f), 'utf8');
    // solo le righe che avviano il server
    const righe = t.split('\n').filter((r) => /server\.mjs/.test(r)).join('\n');
    for (const m of righe.matchAll(/['`"]--([a-z][a-z-]*)[=`'"]/g)) assert.ok(ammessi.has(m[1]) || ['import', 'test', 'abbrev-ref', 'porcelain', 'short', 'branch', 'ff-only', 'untracked-files', 'prova', 'radice', 'salta', 'fuori'].includes(m[1]), `${f}: «--${m[1]}»`);
  }
});

// --- 2. una prova non apre la cartella vera --------------------------------------------------------------------------

const cartelleDi = (base) => Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'musica', 'galleria', 'px', 'salvataggi', 'autosave'].map((k) => [k, join(base, k)]));

test('2: come si riconosce la cartella vera: le cartelle dei dati dell’app e quella scritta nel profilo vero; una prova su cartelle sue parte', () => {
  const reali = cartelleReali(RADICE, { profiloVero: true, dati: { cartella: join(temp, 'dati-del-pc') } });
  const percorsi = reali.map((r) => r.percorso);
  assert.ok(percorsi.includes(join(RADICE, 'personaggi')));
  assert.ok(percorsi.includes(join(temp, 'dati-del-pc', 'personaggi')), 'la cartella dei dati del profilo');
  assert.ok(percorsi.includes(join(RADICE, 'PersonaggiBackup')));
  // con un profilo di prova (MUTANT_CONFIG_DIR) la cartella dei dati del profilo non conta come vera
  assert.ok(!cartelleReali(RADICE, { profiloVero: false, dati: { cartella: join(temp, 'dati-del-pc') } }).some((r) => r.percorso.startsWith(join(temp, 'dati-del-pc'))));
  const mie = join(temp, 'mie');
  const ok = controllaAvvioDiProva({ porta: 3017, argv: [`--cartella=${mie}/personaggi`], radice: RADICE, cartelle: cartelleDi(mie) }, { profiloVero: false });
  assert.deepEqual([ok.ok, ok.prova], [true, true]);
});

test('2: un avvio di prova sulle cartelle vere si rifiuta e lo dice; il server vero (porta 3000, cartelle sue) non è una prova', () => {
  const vere = controllaAvvioDiProva({ porta: 3017, argv: ['--solo-locale'], radice: RADICE, cartelle: cartelleDi(RADICE) }, { profiloVero: false });
  assert.equal(vere.ok, false);
  assert.match(vere.errori[0], /«personaggi» è .*personaggi, che è la cartella dei dati dell’app/);
  assert.match(vere.errori.join('\n'), /non può aprire le cartelle vere/);
  // una sola cartella vera basta: --cartella di prova ma --px di quella vera
  const px = controllaAvvioDiProva({ porta: 3017, argv: ['--cartella=x', `--px=${join(RADICE, 'px')}`], radice: RADICE, cartelle: { ...cartelleDi(join(temp, 'mie')), px: join(RADICE, 'px') } }, { profiloVero: false });
  assert.equal(px.ok, false);
  assert.equal(px.errori.filter((e) => /^«/.test(e)).length, 1);
  // il server vero: porta 3000, nessuna cartella indicata → non è una prova, parte con le sue
  assert.equal(eAvvioDiProva({ porta: 3000, argv: ['--solo-locale'] }), false);
  assert.deepEqual(controllaAvvioDiProva({ porta: 3000, argv: [], radice: RADICE, cartelle: cartelleDi(RADICE) }, { profiloVero: false }).ok, true);
  // «--dati-reali»: il server vero su un'altra porta, apposta, senza cartelle indicate
  assert.equal(controllaAvvioDiProva({ porta: 3100, argv: ['--dati-reali'], radice: RADICE, cartelle: cartelleDi(RADICE) }, { profiloVero: false }).ok, true);
  assert.equal(controllaAvvioDiProva({ porta: 3100, argv: ['--dati-reali', `--cartella=${RADICE}/personaggi`], radice: RADICE, cartelle: cartelleDi(RADICE) }, { profiloVero: false }).ok, false, 'con cartelle indicate non vale');
});

test('2: il server avviato davvero per una prova sulla cartella vera non parte (codice 2) e non risponde', () => {
  // altra porta e cartelle di sempre
  const a = lancia('server.mjs', '--porta=3998', '--solo-locale', '--senza-avvisi');
  assert.equal(a.status, 2);
  assert.match(a.stderr, /Mutant non parte\./);
  assert.match(a.stderr, /«personaggi» è .*personaggi/);
  // --cartella che punta alla cartella vera dei personaggi
  const b = lancia('server.mjs', '--porta=3998', '--solo-locale', `--cartella=${join(RADICE, 'personaggi')}`);
  assert.equal(b.status, 2);
  assert.match(b.stderr, /che è la cartella dei dati dell’app/);
});

// --- 3. nessuna prova scrive nelle cartelle vere ---------------------------------------------------------------------

test('3: la guardia rifiuta ogni scrittura nelle cartelle vere (sync, promesse, callback, flussi) con un errore chiaro, e fuori lascia scrivere', async () => {
  const vera = join(temp, 'vera', 'personaggi');
  mkdirSync(vera, { recursive: true });
  const fuori = join(temp, 'fuori');
  mkdirSync(fuori, { recursive: true });
  const togli = installaGuardiaScrittura([{ percorso: vera, nome: 'personaggi', perche: 'la cartella dei dati dell’app' }]);
  try {
    const rifiuta = (f, quale) => assert.throws(f, (e) => e instanceof ScritturaRifiutata && e.code === 'MUTANT_CARTELLA_VERA' && /Scrittura rifiutata: .*la cartella vera/.test(e.message) && /cartelle tue/.test(e.message), quale);
    rifiuta(() => writeFileSync(join(vera, 'a.json'), '{}'), 'writeFileSync');
    rifiuta(() => fs.appendFileSync(join(vera, 'a.json'), 'x'), 'appendFileSync');
    rifiuta(() => fs.mkdirSync(join(vera, 'sotto'), { recursive: true }), 'mkdirSync');
    rifiuta(() => fs.renameSync(join(fuori, 'x'), join(vera, 'y')), 'renameSync verso la cartella vera');
    rifiuta(() => fs.rmSync(join(vera, 'a.json'), { force: true }), 'rmSync');
    rifiuta(() => fs.unlinkSync(join(vera, 'a.json')), 'unlinkSync');
    rifiuta(() => fs.copyFileSync(join(fuori, 'x'), join(vera, 'c')), 'copyFileSync');
    await assert.rejects(scriviAsync(join(vera, 'b.json'), '{}'), ScritturaRifiutata);
    await assert.rejects(creaAsync(join(vera, 'n')), ScritturaRifiutata);
    await assert.rejects(spostaAsync(join(vera, 'b.json'), join(fuori, 'b.json')), ScritturaRifiutata, 'spostare via un file vero è modificarlo');
    await assert.rejects(fs.promises.rm(join(vera, 'b.json')), ScritturaRifiutata);
    const errCallback = await new Promise((ok) => fs.writeFile(join(vera, 'c.json'), '{}', (e) => ok(e)));
    assert.ok(errCallback instanceof ScritturaRifiutata, 'writeFile con callback');
    rifiuta(() => createWriteStream(join(vera, 'flusso')), 'createWriteStream');
    assert.deepEqual(readdirSync(vera), [], 'nessun file è stato scritto');
    // fuori dalle cartelle vere si scrive come sempre; leggere la cartella vera non è mai vietato
    writeFileSync(join(fuori, 'ok.json'), '{}');
    await scriviAsync(join(fuori, 'ok2.json'), '{}');
    assert.equal(readdirSync(vera).length, 0);
    assert.ok(existsSync(join(fuori, 'ok2.json')));
    // anche una cartella con lo stesso inizio del nome («personaggi-prova») non è la cartella vera
    mkdirSync(join(temp, 'vera', 'personaggi-prova'));
    writeFileSync(join(temp, 'vera', 'personaggi-prova', 'k.json'), '{}');
  } finally { togli(); }
  writeFileSync(join(vera, 'dopo.json'), '{}');
  assert.ok(existsSync(join(vera, 'dopo.json')), 'tolta la guardia si scrive di nuovo');
});

test('3: i test girano con la guardia: una scrittura in personaggi/ dell’app è rifiutata', (t) => {
  // senza la guardia (node --test lanciato senza «--import ./tests/profilo-di-prova.mjs») la prova scriverebbe davvero: non si fa
  if (!/controlla/.test(String(fs.writeFileSync))) return t.skip('guardia non installata: usare npm test');
  assert.throws(() => writeFileSync(join(RADICE, 'personaggi', '__prova_guardia__.json'), '{}'), (e) => e.code === 'MUTANT_CARTELLA_VERA');
  assert.equal(existsSync(join(RADICE, 'personaggi', '__prova_guardia__.json')), false);
  assert.throws(() => fs.mkdirSync(join(RADICE, 'salvataggi', 'x'), { recursive: true }), (e) => e.code === 'MUTANT_CARTELLA_VERA');
});
