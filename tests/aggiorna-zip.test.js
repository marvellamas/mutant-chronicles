// Aggiornamento da zip senza perdere i dati di questo PC (09/10/2026): distribuzione/aggiorna-da-zip.ps1 con l'elenco
// unico tools/file-locali.json. Solo su Windows (PowerShell e robocopy); altrove i test si saltano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, rmSync, copyFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SCRIPT = join(REPO, 'distribuzione', 'aggiorna-da-zip.ps1');
const ELENCO = JSON.parse(readFileSync(join(REPO, 'tools', 'file-locali.json'), 'utf8'));
const windows = process.platform === 'win32';
const opz = { skip: windows ? false : 'solo su Windows (PowerShell, robocopy)' };

const scrivi = (p, t) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, t); };
/** Impronta di una cartella: { percorso relativo: sha1 } di tutti i file. */
function impronta(dir, base = dir, out = {}) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) impronta(p, base, out);
    else out[relative(base, p).replace(/\\/g, '/')] = createHash('sha1').update(readFileSync(p)).digest('hex');
  }
  return out;
}
const soloLocali = (imp) => Object.fromEntries(Object.entries(imp).filter(([k]) => [...ELENCO.cartelle, ...ELENCO.file].some((n) => k === n || k.startsWith(`${n}/`)) && !k.startsWith('backup-prima-aggiornamento/') && !/\/LEGGIMI\.txt$|\.esempio\.json$/.test(k)));

/** Zip «estratto» finto della versione nuova: l'app minima con lo script e l'elenco veri. */
function sorgente(r, { senza = null } = {}) {
  const s = join(r, 'estratto', 'mutant-main');
  const file = {
    'index.html': '<html>nuova</html>', 'server.mjs': '// nuovo', 'versione.json': '{"versione":"nuova"}', 'package.json': '{"name":"mutant"}',
    'src/app.js': '// nuovo', 'data/regole.json': '{}', 'personaggi/LEGGIMI.txt': 'LEGGIMI nuovo', 'avvisi/LEGGIMI.txt': 'nuovo', 'avvisi/avvisi.esempio.json': '{"attivo":true}',
    'img/immagini.json': '{}', 'img/sfondi/predefinito.jpg': 'sfondo nuovo',
  };
  for (const [k, v] of Object.entries(file)) if (k !== senza) scrivi(join(s, k), v);
  if (senza !== 'tools/file-locali.json') { mkdirSync(join(s, 'tools'), { recursive: true }); copyFileSync(join(REPO, 'tools', 'file-locali.json'), join(s, 'tools', 'file-locali.json')); }
  if (senza !== 'distribuzione/aggiorna-da-zip.ps1') { mkdirSync(join(s, 'distribuzione'), { recursive: true }); copyFileSync(SCRIPT, join(s, 'distribuzione', 'aggiorna-da-zip.ps1')); }
  return s;
}

/** Installazione vecchia con tutti i dati locali dell'elenco e file dell'app che nella nuova non ci sono più. */
function installazione(r) {
  const d = join(r, 'mutant');
  const file = {
    'index.html': '<html>vecchia</html>', 'vecchio-script.js': 'sparisce', 'src/app.js': '// vecchio', 'package.json': '{"name":"mutant"}',
    'personaggi/LEGGIMI.txt': 'LEGGIMI vecchio', 'personaggi/LUCAS_liv6.json': '{"pg":1}', 'tavolo/sessione.json': '{}', 'scontri/s1.json': '{}',
    'nemici/predone.json': '{}', 'veicoli/v1.json': '{}', 'scene/scena.json': '{}', 'mappe/mappa.webp': 'immagine', 'musica/brano.mp3': 'musica',
    'autosave/autosave.zip': 'zip', 'salvataggi/2026-10-08.zip': 'zip', 'avvisi/avvisi.json': '{"attivo":true,"nome_pc":"PC di Davide"}',
    'avvisi/stato.json': '{}', 'avvisi/registro.txt': 'riga', 'avvisi/LEGGIMI.txt': 'vecchio', 'config-salvataggi.json': '{"cartella_drive":"G:/x"}',
    '.versione': 'abc', 'node_modules/serve/index.js': 'componente', 'img/originali/foto.png': 'originale', 'img/sfondi/mio.jpg': 'sfondo mio',
  };
  for (const [k, v] of Object.entries(file)) scrivi(join(d, k), v);
  return d;
}
const esegui = (s, d, r) => spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, '-Sorgente', s, '-Destinazione', d, '-BackupDati', join(r, 'backup_dati'), '-Lavoro', join(r, 'lavoro')], { encoding: 'utf8' });

test('elenco unico dei file locali: tutte le cartelle del server, avvisi, config, node_modules, backup', () => {
  for (const c of ['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'musica', 'autosave', 'salvataggi', 'avvisi', 'node_modules', 'backup-prima-aggiornamento']) assert.ok(ELENCO.cartelle.includes(c), c);
  assert.ok(ELENCO.file.includes('config-salvataggi.json'));
  // ogni cartella con dati che .gitignore tiene fuori da git è nell'elenco
  const ignorate = readFileSync(join(REPO, '.gitignore'), 'utf8').split(/\r?\n/).map((l) => /^([a-z]+)\/\*$/.exec(l)?.[1]).filter(Boolean);
  for (const c of ignorate) assert.ok(ELENCO.cartelle.includes(c), `${c} è in .gitignore ma non nell’elenco dei locali`);
  assert.equal(ELENCO.backup_da_tenere, 5);
});

test('aggiornamento con tutte le cartelle locali: restano identiche, l’app si aggiorna, copia di sicurezza fatta', opz, () => {
  const r = mkdtempSync(join(tmpdir(), 'mutant-zip-'));
  const d = installazione(r);
  const prima = soloLocali(impronta(d));
  const e = esegui(sorgente(r), d, r);
  assert.equal(e.status, 0, e.stdout + e.stderr);
  const dopo = impronta(d);
  assert.deepEqual(soloLocali(dopo), prima, 'dati locali cambiati');
  // app nuova; file dell'app vecchia spariti; LEGGIMI e esempi aggiornati; annidati rimessi senza toccare i nuovi
  assert.equal(readFileSync(join(d, 'index.html'), 'utf8'), '<html>nuova</html>');
  assert.equal(existsSync(join(d, 'vecchio-script.js')), false);
  assert.equal(readFileSync(join(d, 'personaggi', 'LEGGIMI.txt'), 'utf8'), 'LEGGIMI nuovo');
  assert.equal(readFileSync(join(d, 'img', 'originali', 'foto.png'), 'utf8'), 'originale');
  assert.equal(readFileSync(join(d, 'img', 'sfondi', 'mio.jpg'), 'utf8'), 'sfondo mio');
  assert.equal(readFileSync(join(d, 'img', 'sfondi', 'predefinito.jpg'), 'utf8'), 'sfondo nuovo');
  assert.equal(readFileSync(join(d, 'node_modules', 'serve', 'index.js'), 'utf8'), 'componente');
  // copia di sicurezza dei dati locali (senza node_modules)
  const zip = readdirSync(join(d, 'backup-prima-aggiornamento'));
  assert.equal(zip.length, 1);
  assert.match(zip[0], /^locali_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.zip$/);
  assert.ok(statSync(join(d, 'backup-prima-aggiornamento', zip[0])).size > 0);
  rmSync(r, { recursive: true, force: true });
});

test('zip incompleto: non si tocca nulla, nemmeno la copia di sicurezza', opz, () => {
  for (const senza of ['server.mjs', 'tools/file-locali.json', 'src/app.js']) {
    const r = mkdtempSync(join(tmpdir(), 'mutant-zip-'));
    const d = installazione(r);
    const prima = impronta(d);
    const s = sorgente(r, { senza });
    if (senza === 'src/app.js') rmSync(join(s, 'src'), { recursive: true, force: true });
    const e = esegui(s, d, r);
    assert.equal(e.status, 3, `${senza}: ${e.stdout}${e.stderr}`);
    assert.match(e.stdout, /incompleto.*non ho toccato nulla/);
    assert.deepEqual(impronta(d), prima, senza);
    rmSync(r, { recursive: true, force: true });
  }
});

test('copie di sicurezza: si tengono le ultime 5', opz, () => {
  const r = mkdtempSync(join(tmpdir(), 'mutant-zip-'));
  const d = installazione(r);
  const dirB = join(d, 'backup-prima-aggiornamento');
  mkdirSync(dirB);
  // sei copie vecchie, dalla più vecchia
  for (let i = 1; i <= 6; i++) {
    const p = join(dirB, `locali_2026-01-0${i}_10-00-00.zip`);
    writeFileSync(p, 'vecchio');
    const t = new Date(`2026-01-0${i}T10:00:00Z`);
    utimesSync(p, t, t);
  }
  const e = esegui(sorgente(r), d, r);
  assert.equal(e.status, 0, e.stdout + e.stderr);
  const restano = readdirSync(dirB).sort();
  assert.equal(restano.length, 5);
  assert.ok(!restano.includes('locali_2026-01-01_10-00-00.zip') && !restano.includes('locali_2026-01-02_10-00-00.zip'));
  assert.ok(restano.includes('locali_2026-01-06_10-00-00.zip'));
  rmSync(r, { recursive: true, force: true });
});

test('installazione nuova (cartella vuota): l’app arriva, nessuna copia di sicurezza', opz, () => {
  const r = mkdtempSync(join(tmpdir(), 'mutant-zip-'));
  const d = join(r, 'mutant');
  const e = esegui(sorgente(r), d, r);
  assert.equal(e.status, 0, e.stdout + e.stderr);
  assert.equal(readFileSync(join(d, 'index.html'), 'utf8'), '<html>nuova</html>');
  assert.equal(existsSync(join(d, 'backup-prima-aggiornamento')), false);
  rmSync(r, { recursive: true, force: true });
});

test('il .bat chiama lo script della versione scaricata e si ferma con lo zip incompleto', () => {
  const b = readFileSync(join(REPO, 'distribuzione', '1_scarica_o_aggiorna_app.bat'), 'utf8');
  assert.match(b, /-File "%SRC%\\distribuzione\\aggiorna-da-zip\.ps1"/);
  assert.match(b, /if errorlevel 3 goto zip_incompleto/);
  assert.doesNotMatch(b, /Where-Object \{ \$_\.Name -ne 'node_modules' \} \| Remove-Item/, 'la vecchia cancellazione di tutto è sparita');
});
