// Rete di sicurezza intorno a ogni aggiornamento (12/10/2026, docs/diagnosi-dati-spariti-2026-10-12.md):
// copia zip prima, controllo dopo, aggiornamento dei file che stanno fuori dalla cartella «mutant».
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AVVIATORI, daFare, aggiornaAvviatori, testoEsito, uguali } from '../tools/aggiorna-avviatori.mjs';
import { statoLocali, svuotate, leggiStatoPrima } from '../tools/dati-locali.mjs';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const ELENCO = JSON.parse(readFileSync(join(REPO, 'tools', 'file-locali.json'), 'utf8'));
const radici = [];
after(() => radici.forEach((r) => rmSync(r, { recursive: true, force: true })));
const tmp = () => { const r = mkdtempSync(join(tmpdir(), 'mutant-sicuro-')); radici.push(r); return r; };
const scrivi = (p, t) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, t); };

/** Un pacchetto zip installato: <base>\1_...bat, 3_avvia.bat… e <base>\mutant\ con l'app. */
function pacchetto(r, { avviatoriVecchi = true } = {}) {
  const app = join(r, 'mutant');
  for (const [k, v] of Object.entries({
    'server.mjs': '// app', 'package.json': '{}', 'personaggi/aiko.json': '{"pg":"aiko"}',
    'personaggi/LEGGIMI.txt': 'leggimi', 'nemici/legionario.json': '{}', 'mappe/cantiere.webp': 'immagine',
    'salvataggi/sessione_2026-10-10_2305.zip': 'zip',
  })) scrivi(join(app, k), v);
  // le versioni nuove dei file del pacchetto, dentro l'app
  for (const n of AVVIATORI) scrivi(join(app, 'distribuzione', n), `nuovo ${n}\n`);
  // quelle che l'utente apre, fuori dall'app
  for (const n of AVVIATORI) scrivi(join(r, n), avviatoriVecchi ? `vecchio ${n}\n` : `nuovo ${n}\n`);
  return app;
}

test('i file fuori dalla cartella mutant si rimettono al passo, tranne quello in uso', () => {
  const r = tmp();
  const app = pacchetto(r);
  const e = aggiornaAvviatori({ radice: app, fuori: r, salta: ['1_scarica_o_aggiorna_app.bat'] });

  assert.deepEqual(e.saltati, ['1_scarica_o_aggiorna_app.bat']);
  assert.deepEqual(e.aggiornati.sort(), ['2_installa_node.bat', '3_avvia.bat', '4_controlla_personaggi.bat', 'LEGGIMI.txt', 'aggiorna-da-zip.ps1']);
  assert.equal(e.errori.length, 0);
  assert.equal(readFileSync(join(r, '3_avvia.bat'), 'utf8'), 'nuovo 3_avvia.bat\n');
  assert.equal(readFileSync(join(r, '1_scarica_o_aggiorna_app.bat'), 'utf8'), 'vecchio 1_scarica_o_aggiorna_app.bat\n');
  // della copia di prima resta una sola traccia, per sicurezza
  assert.equal(readFileSync(join(r, '3_avvia.bat.precedente'), 'utf8'), 'vecchio 3_avvia.bat\n');

  // al giro dopo (3_avvia.bat all'avvio) tocca a quello che prima era in uso
  const e2 = aggiornaAvviatori({ radice: app, fuori: r, salta: ['3_avvia.bat'] });
  assert.deepEqual(e2.aggiornati, ['1_scarica_o_aggiorna_app.bat']);
  assert.equal(readFileSync(join(r, '1_scarica_o_aggiorna_app.bat'), 'utf8'), 'nuovo 1_scarica_o_aggiorna_app.bat\n');
  // e al terzo giro non c'è più niente da fare
  assert.deepEqual(aggiornaAvviatori({ radice: app, fuori: r, salta: [] }).aggiornati, []);
});

test('niente pacchetto zip (copia con Git): non si crea nessun file fuori dalla cartella', () => {
  const r = tmp();
  const app = pacchetto(r);
  for (const n of AVVIATORI) rmSync(join(r, n));
  const e = aggiornaAvviatori({ radice: app, fuori: r });
  assert.deepEqual(e.aggiornati, []);
  for (const n of AVVIATORI) assert.equal(existsSync(join(r, n)), false, n);
  assert.ok(daFare({ radice: app, fuori: r }).every((v) => v.stato === 'non-installato'));
});

test('file già uguali: non si tocca niente e non si dice niente', () => {
  const r = tmp();
  const app = pacchetto(r, { avviatoriVecchi: false });
  const e = aggiornaAvviatori({ radice: app, fuori: r });
  assert.deepEqual(e.aggiornati, []);
  assert.equal(testoEsito(e), '');
  assert.ok(uguali(join(app, 'distribuzione', '3_avvia.bat'), join(r, '3_avvia.bat')));
  assert.equal(existsSync(join(r, '3_avvia.bat.precedente')), false);
});

test('il messaggio dice che cosa è stato aggiornato e che cosa resta al prossimo avvio, senza accenti', () => {
  const t = testoEsito({ aggiornati: ['3_avvia.bat'], saltati: ['1_scarica_o_aggiorna_app.bat'], errori: [] });
  assert.match(t, /Aggiornati anche i file fuori dalla cartella mutant: 3_avvia\.bat/);
  assert.match(t, /Da aggiornare al prossimo avvio/);
  assert.doesNotMatch(t, /[àèéìòù]/);
});

// --- aggiorna.bat (Git) -------------------------------------------------------------------------------------

test('aggiorna.bat: copia prima, controllo dopo, proposta di rimettere, tutto su una riga sola', () => {
  const t = readFileSync(join(REPO, 'aggiorna.bat'), 'utf8');
  // la riga che sopravvive alla sostituzione del file durante il pull
  const riga = t.split(/\r?\n/).find((l) => l.includes('git pull --ff-only'));
  assert.ok(riga.startsWith('(call :prima'), 'il pull deve stare nella riga unica');
  assert.ok(riga.includes('call :dopo'), 'anche il dopo, nella stessa riga');
  assert.ok(riga.trim().endsWith('exit /b 0)'), 'exit /b: la console chiama questo file con call');
  assert.equal(t.split(/\r?\n/).filter((l) => l.includes('git pull --ff-only') && !/^\s*rem /.test(l)).length, 1);
  // i tre passi della rete di sicurezza
  assert.match(t, /node tools\\dati-locali\.mjs prima/);
  assert.match(t, /node tools\\dati-locali\.mjs dopo/);
  assert.match(t, /node tools\\dati-locali\.mjs rimetti/);
  assert.match(t, /node tools\\aggiorna-avviatori\.mjs/);
  // senza Node si aggiorna lo stesso: Git non tocca i dati
  assert.match(t, /senza Node non posso fare la copia/);
  assert.doesNotMatch(t, /[àèéìòù]/);
});

test('1_scarica_o_aggiorna_app.bat e 3_avvia.bat: controllo e file esterni', () => {
  const uno = readFileSync(join(REPO, 'distribuzione', '1_scarica_o_aggiorna_app.bat'), 'utf8');
  assert.match(uno, /dati-locali\.mjs" dopo --radice=%DEST%/);
  assert.match(uno, /dati-locali\.mjs" rimetti --radice=%DEST%/);
  assert.match(uno, /aggiorna-avviatori\.mjs" --radice=%DEST% --fuori=%~dp0\. --salta=1_scarica_o_aggiorna_app\.bat/);
  assert.doesNotMatch(uno, /[àèéìòù]/);
  const tre = readFileSync(join(REPO, 'distribuzione', '3_avvia.bat'), 'utf8');
  assert.match(tre, /aggiorna-avviatori\.mjs" --radice=%APP% --fuori=%QUI%\. --salta=3_avvia\.bat/);
  assert.doesNotMatch(tre, /[àèéìòù]/);
});

// --- lo zip scrive lo stato di prima, come lo scrive Node ----------------------------------------------------

const windows = process.platform === 'win32';
const opz = { skip: windows ? false : 'solo su Windows (PowerShell, robocopy)' };

test('aggiornamento da zip: scrive lo stato di prima e il controllo dopo lo rilegge', opz, () => {
  const r = tmp();
  const dest = join(r, 'mutant');
  for (const [k, v] of Object.entries({
    'index.html': '<html>vecchia</html>', 'package.json': '{"name":"mutant"}', 'personaggi/aiko.json': '{"pg":1}',
    'personaggi/LEGGIMI.txt': 'leggimi', 'nemici/legionario.json': '{}', 'backup-master/copia.json': '{}',
  })) scrivi(join(dest, k), v);

  // la versione «nuova»: l'app vera, senza le cartelle di dati
  const src = join(r, 'estratto', 'mutant-main');
  for (const [k, v] of Object.entries({ 'index.html': '<html>nuova</html>', 'server.mjs': '// nuovo', 'versione.json': '{"versione":"x"}', 'package.json': '{"name":"mutant"}', 'src/a.js': '//', 'data/regole.json': '{}' })) scrivi(join(src, k), v);
  mkdirSync(join(src, 'tools'), { recursive: true });
  // tutta la cartella tools: dati-locali.mjs usa salva-sessione.mjs, che a sua volta usa avvisi.mjs
  for (const f of readdirSync(join(REPO, 'tools')).filter((n) => /\.(mjs|json)$/.test(n))) writeFileSync(join(src, 'tools', f), readFileSync(join(REPO, 'tools', f)));
  mkdirSync(join(src, 'distribuzione'), { recursive: true });
  writeFileSync(join(src, 'distribuzione', 'aggiorna-da-zip.ps1'), readFileSync(join(REPO, 'distribuzione', 'aggiorna-da-zip.ps1')));

  const e = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(src, 'distribuzione', 'aggiorna-da-zip.ps1'),
    '-Sorgente', src, '-Destinazione', dest, '-BackupDati', join(r, 'backup_dati'), '-Lavoro', join(r, 'lavoro')], { encoding: 'utf8' });
  assert.equal(e.status, 0, e.stdout + e.stderr);

  // i dati ci sono ancora, backup-master compresa (prima si perdeva: non era fra i file locali)
  assert.ok(existsSync(join(dest, 'personaggi', 'aiko.json')));
  assert.ok(existsSync(join(dest, 'backup-master', 'copia.json')));
  assert.equal(readFileSync(join(dest, 'index.html'), 'utf8'), '<html>nuova</html>');

  // lo stato di prima è leggibile da Node e combacia con il conteggio di Node
  const stato = leggiStatoPrima(dest, ELENCO);
  assert.ok(stato, 'manca .stato-prima.json');
  assert.equal(stato.prima.personaggi.file, 1, 'il LEGGIMI non conta');
  assert.equal(stato.prima['backup-master'].file, 1);
  assert.ok(String(stato.zip).endsWith('.zip'));
  assert.deepEqual(svuotate(stato.prima, statoLocali(dest, ELENCO)), []);

  // il controllo da riga di comando dice che va tutto bene, e se si svuota una cartella lo dice
  const nodo = (...a) => spawnSync(process.execPath, [join(dest, 'tools', 'dati-locali.mjs'), ...a, `--radice=${dest}`], { encoding: 'utf8' });
  assert.equal(nodo('dopo').status, 0, nodo('dopo').stdout);
  rmSync(join(dest, 'personaggi'), { recursive: true, force: true });
  const q = nodo('dopo');
  assert.equal(q.status, 1);
  assert.match(q.stdout, /personaggi: prima 1 file/);
  assert.equal(nodo('rimetti').status, 0);
  assert.ok(existsSync(join(dest, 'personaggi', 'aiko.json')));
});

test('tutte le copie di sicurezza restano nella cartella giusta e non entrano in git', () => {
  const ignora = readFileSync(join(REPO, '.gitignore'), 'utf8');
  assert.match(ignora, /backup-prima-aggiornamento\//);
  assert.equal(ELENCO.cartella_backup, 'backup-prima-aggiornamento');
  assert.ok(ELENCO.backup_esclusi.includes('backup-prima-aggiornamento'), 'le copie non si copiano dentro se stesse');
  assert.ok(readdirSync(REPO).includes('tools'));
});
