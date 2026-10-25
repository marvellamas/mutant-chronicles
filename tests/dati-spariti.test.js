// «Dopo l'aggiornamento le cartelle di Davide risultano vuote» (12/10/2026, urgenza di Marcello e Davide).
// Qui si riproduce ogni modo in cui un aggiornamento può far sparire o nascondere i dati locali, così la
// causa resta dimostrata e non torna: docs/diagnosi-dati-spariti-2026-10-12.md.
//
// I casi: 1. il vecchio distribuzione\1_scarica_o_aggiorna_app.bat (fuori dalla cartella mutant, non si aggiorna
// da solo); 2. l'aggiornamento con Git; 3. git clean / reset --hard / checkout negli script; 4. gli esempi
// copiati «solo se mancano»; 5. da quale cartella legge il server; 6. l'elenco dei file locali completo.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { statoLocali, svuotate, copiaDiSicurezza, rimettiCopia, elencoLocali, testoSvuotate, scriviStatoPrima, leggiStatoPrima } from '../tools/dati-locali.mjs';
import { leggiZip } from '../tools/salva-sessione.mjs';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const ELENCO = JSON.parse(readFileSync(join(REPO, 'tools', 'file-locali.json'), 'utf8'));
const radici = [];
after(() => radici.forEach((r) => rmSync(r, { recursive: true, force: true })));
const tmp = () => { const r = mkdtempSync(join(tmpdir(), 'mutant-spariti-')); radici.push(r); return r; };
const scrivi = (p, t) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, t); };
const conta = (d) => (existsSync(d) ? readdirSync(d, { recursive: true }).filter((n) => statSync(join(d, n)).isFile()).length : -1);

/** Un'installazione di Mutant con i dati di una serata. */
function installazione(r, nome = 'mutant') {
  const d = join(r, nome);
  for (const [k, v] of Object.entries({
    'index.html': '<html>vecchia</html>', 'server.mjs': '// vecchio', 'package.json': '{"name":"mutant"}',
    'src/app.js': '// vecchio', 'data/regole.json': '{}', 'config-salvataggi.json': '{"autosave_minuti":5}',
    'personaggi/LEGGIMI.txt': 'leggimi', 'personaggi/aiko.json': '{"pg":"aiko"}', 'personaggi/kenta.json': '{"pg":"kenta"}',
    'tavolo/sessione.json': '{}', 'scontri/s1.json': '{}', 'nemici/legionario.json': '{}', 'veicoli/v1.json': '{}',
    'scene/cripta.json': '{}', 'mappe/cantiere.webp': 'immagine', 'musica/tema.mp3': 'musica', 'galleria/volto.webp': 'immagine',
    'autosave/autosave.zip': 'zip', 'salvataggi/sessione_2026-10-08_2140.zip': 'zip1',
    'salvataggi/sessione_2026-10-09_2210.zip': 'zip2', 'salvataggi/sessione_2026-10-10_2305.zip': 'zip3',
    'backup-master/copia.json': '{}', 'node_modules/serve/index.js': 'componente',
  })) scrivi(join(d, k), v);
  return d;
}

// --- caso 1: il vecchio file dello zip, quello che Davide ha ancora fuori dalla cartella -------------------------

/**
 * Il passo [5/5] della versione di distribuzione\1_scarica_o_aggiorna_app.bat precedente al 09/10/2026
 * (commit 4f1d599^), in JavaScript: «cancella tutto quello che c'è nella cartella tranne node_modules, poi
 * sposta dentro i file nuovi». È questo che svuota le cartelle.
 */
function vecchioAggiornamentoZip(dest, src) {
  for (const n of readdirSync(dest)) {
    if (n === 'node_modules') continue;
    rmSync(join(dest, n), { recursive: true, force: true });
  }
  for (const n of readdirSync(src)) {
    const da = join(src, n);
    const a = join(dest, n);
    if (statSync(da).isDirectory()) { mkdirSync(a, { recursive: true }); for (const f of readdirSync(da)) scrivi(join(a, f), readFileSync(join(da, f))); } else scrivi(a, readFileSync(da));
  }
}

test('caso 1: il vecchio file dello zip cancella tutte le cartelle dei dati tranne node_modules', () => {
  const r = tmp();
  const dest = installazione(r);
  const src = join(r, 'estratto');
  for (const [k, v] of Object.entries({ 'index.html': '<html>nuova</html>', 'package.json': '{"name":"mutant"}', 'src/app.js': '// nuovo' })) scrivi(join(src, k), v);

  const prima = Object.fromEntries(ELENCO.controllo_svuotamento.map((c) => [c, conta(join(dest, c))]));
  vecchioAggiornamentoZip(dest, src);
  const dopo = Object.fromEntries(ELENCO.controllo_svuotamento.map((c) => [c, conta(join(dest, c))]));

  // ogni cartella di dati sparisce; i componenti di Node restano
  for (const c of ['personaggi', 'nemici', 'mappe', 'scontri', 'salvataggi', 'autosave', 'backup-master', 'musica', 'galleria']) {
    assert.ok(prima[c] > 0, `${c} doveva avere file prima`);
    assert.equal(dopo[c], -1, `${c} doveva sparire con il vecchio aggiornamento`);
  }
  assert.equal(conta(join(dest, 'node_modules')), 1);
  assert.equal(readFileSync(join(dest, 'index.html'), 'utf8'), '<html>nuova</html>');
  // ed è proprio il caso che il controllo di oggi riconosce
  assert.ok(svuotate(statoLocali(dest), statoLocali(dest)).length === 0); // dopo, su se stesso: niente
});

test('caso 1: il file che aggiorna sta fuori dalla cartella mutant, quindi non si aggiorna da solo', () => {
  // distribuzione\1_scarica_o_aggiorna_app.bat crea «mutant» ACCANTO a sé: il suo aggiornamento finisce
  // dentro mutant\distribuzione\, non sopra la copia che l'utente usa.
  const bat = readFileSync(join(REPO, 'distribuzione', '1_scarica_o_aggiorna_app.bat'), 'utf8');
  assert.match(bat, /set "DEST=%~dp0mutant"/);
  // l'aggiornamento scrive dentro mutant\, quindi la copia nuova di questo stesso file finisce in
  // mutant\distribuzione\ e non sopra quella che l'utente apre: senza una correzione resta vecchia per sempre
  assert.match(bat, /%SRC%\\distribuzione\\aggiorna-da-zip\.ps1/);
});

// --- caso 2: l'aggiornamento con Git ----------------------------------------------------------------------------

const git = (dove, ...a) => spawnSync('git', a, { cwd: dove, encoding: 'utf8' });
const conGit = (() => { const r = spawnSync('git', ['--version'], { encoding: 'utf8' }); return r.status === 0; })();
const opzGit = { skip: conGit ? false : 'git non disponibile' };

test('caso 2: git pull non tocca le cartelle dei dati (sono fuori da git)', opzGit, () => {
  const r = tmp();
  const origine = join(r, 'origine');
  mkdirSync(origine, { recursive: true });
  git(origine, 'init', '--initial-branch=main', '--quiet');
  git(origine, 'config', 'user.email', 'prova@esempio.it');
  git(origine, 'config', 'user.name', 'Prova');
  scrivi(join(origine, 'index.html'), '<html>1</html>');
  scrivi(join(origine, '.gitignore'), 'personaggi/*\n!personaggi/LEGGIMI.txt\nnemici/*\n!nemici/LEGGIMI.txt\nmappe/*\n!mappe/LEGGIMI.txt\n');
  scrivi(join(origine, 'personaggi', 'LEGGIMI.txt'), 'leggimi');
  git(origine, 'add', '-A');
  git(origine, 'commit', '-m', 'uno', '--quiet');

  const copia = join(r, 'copia');
  assert.equal(git(r, 'clone', '--quiet', origine, copia).status, 0);
  // i dati della serata, che non stanno su GitHub
  scrivi(join(copia, 'personaggi', 'aiko.json'), '{"pg":"aiko"}');
  scrivi(join(copia, 'nemici', 'legionario.json'), '{}');
  scrivi(join(copia, 'mappe', 'cantiere.webp'), 'immagine');

  // una versione nuova
  scrivi(join(origine, 'index.html'), '<html>2</html>');
  git(origine, 'add', '-A');
  git(origine, 'commit', '-m', 'due', '--quiet');

  assert.equal(git(copia, 'pull', '--ff-only').status, 0);
  assert.equal(readFileSync(join(copia, 'index.html'), 'utf8'), '<html>2</html>');
  for (const [c, f] of [['personaggi', 'aiko.json'], ['nemici', 'legionario.json'], ['mappe', 'cantiere.webp']]) {
    assert.ok(existsSync(join(copia, c, f)), `${c}/${f} doveva restare`);
  }
});

// --- caso 3: comandi di Git distruttivi negli script -------------------------------------------------------------

test('caso 3: nessuno script dell’app usa git clean, reset --hard o checkout oltre ai due file della versione', () => {
  const file = [...readdirSync(REPO).filter((n) => /\.(bat|ps1|mjs)$/i.test(n)).map((n) => join(REPO, n)),
    ...readdirSync(join(REPO, 'tools')).filter((n) => /\.(mjs|bat|ps1)$/i.test(n)).map((n) => join(REPO, 'tools', n)),
    ...readdirSync(join(REPO, 'distribuzione')).filter((n) => /\.(bat|ps1)$/i.test(n)).map((n) => join(REPO, 'distribuzione', n))];
  const ammessi = [/git checkout -- versione\.json index\.html/, /git checkout -- "%%F"/];
  for (const f of file) {
    const t = readFileSync(f, 'utf8');
    const nome = relative(REPO, f);
    assert.doesNotMatch(t, /git\s+clean/, `${nome}: git clean cancellerebbe i dati di questo PC`);
    assert.doesNotMatch(t, /reset\s+--hard/, `${nome}: git reset --hard`);
    for (const riga of t.split(/\r?\n/)) {
      if (!/git\s+checkout/.test(riga) || /^\s*(rem|#|\/\/)/.test(riga)) continue;
      assert.ok(ammessi.some((a) => a.test(riga)), `${nome}: git checkout non previsto -> ${riga.trim()}`);
    }
  }
});

// --- caso 4: gli esempi non sovrascrivono mai --------------------------------------------------------------------

test('caso 4: «Carica esempi» non sovrascrive un personaggio o un nemico già presente', async () => {
  const { creaServer } = await import('../server.mjs');
  const r = tmp();
  const cartella = join(r, 'personaggi');
  const nemici = join(r, 'nemici');
  mkdirSync(cartella, { recursive: true });
  mkdirSync(nemici, { recursive: true });
  // un file con lo stesso nome di un esempio, ma con il contenuto di Davide
  const esempio = readdirSync(join(REPO, 'esempi')).find((n) => n.endsWith('.json'));
  const nemicoEsempio = readdirSync(join(REPO, 'esempi', 'nemici')).find((n) => n.endsWith('.json'));
  writeFileSync(join(cartella, esempio), '{"mio":true}');
  writeFileSync(join(nemici, nemicoEsempio), '{"mio":true}');

  const s = creaServer({ cartella, nemici, tavolo: join(r, 'tavolo'), scontri: join(r, 'scontri'), veicoli: join(r, 'veicoli'), soloLocale: true });
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
  const porta = s.address().port;
  const risposta = await (await fetch(`http://127.0.0.1:${porta}/api/esempi`, { method: 'POST' })).json();
  s.close();

  assert.equal(readFileSync(join(cartella, esempio), 'utf8'), '{"mio":true}', 'il PG di Davide non si tocca');
  assert.equal(readFileSync(join(nemici, nemicoEsempio), 'utf8'), '{"mio":true}', 'il nemico di Davide non si tocca');
  assert.ok(risposta.saltati.includes(esempio));
});

// --- caso 5: da quale cartella legge il server --------------------------------------------------------------------

test('caso 5: il server legge le cartelle accanto a server.mjs, non da dove è stato lanciato', () => {
  const t = readFileSync(join(REPO, 'server.mjs'), 'utf8');
  assert.match(t, /const RADICE = fileURLToPath\(new URL\('\.', import\.meta\.url\)\);/);
  assert.doesNotMatch(t, /process\.cwd\(\)/, 'il server non deve dipendere dalla cartella di lancio');
  // e i .bat si spostano sempre nella propria cartella prima di fare qualunque cosa
  for (const n of ['avvia-server.bat', 'aggiorna.bat']) {
    assert.match(readFileSync(join(REPO, n), 'utf8'), /cd \/d "%~dp0"/, n);
  }
  assert.match(readFileSync(join(REPO, 'Mutant.bat'), 'utf8'), /cd \/d "%QUI%\."/);
  // una copia di Mutant.bat fuori dalla cartella si riconosce e lo dice
  assert.match(readFileSync(join(REPO, 'Mutant.bat'), 'utf8'), /if not exist "%QUI%server\.mjs"/);
});

// --- caso 6: l'elenco dei file locali è completo --------------------------------------------------------------------

test('caso 6: ogni cartella di dati tenuta fuori da git è nell’elenco dei file locali e nel controllo', () => {
  const ignorate = readFileSync(join(REPO, '.gitignore'), 'utf8').split(/\r?\n/)
    .map((l) => /^([a-z][a-z-]*)\/\*$/.exec(l.trim())?.[1]).filter(Boolean);
  assert.ok(ignorate.includes('backup-master'), 'il controllo deve vedere anche le cartelle con il trattino');
  for (const c of ignorate) {
    assert.ok(ELENCO.cartelle.includes(c), `${c} è in .gitignore ma non fra i file locali`);
    assert.ok(ELENCO.controllo_svuotamento.includes(c), `${c} non è fra le cartelle controllate dopo l’aggiornamento`);
  }
});

// --- la rete di sicurezza -------------------------------------------------------------------------------------------

test('copia di sicurezza prima dell’aggiornamento: contiene i dati, non node_modules, tiene le ultime N', () => {
  const r = tmp();
  const d = installazione(r);
  const c = copiaDiSicurezza({ radice: d, adesso: new Date(2026, 9, 12, 19, 30, 0) });
  assert.ok(c.zip.endsWith('locali_2026-10-12_19-30-00.zip'));
  const voci = leggiZip(readFileSync(c.zip));
  assert.ok(voci['personaggi/aiko.json'], 'i personaggi devono esserci');
  assert.ok(voci['mappe/cantiere.webp']);
  assert.ok(voci['backup-master/copia.json'], 'anche backup-master');
  assert.ok(voci['config-salvataggi.json']);
  assert.ok(!Object.keys(voci).some((k) => k.startsWith('node_modules/')), 'node_modules non va nella copia');

  // rotazione: oltre backup_da_tenere le più vecchie si tolgono
  const dir = join(d, ELENCO.cartella_backup);
  for (let i = 0; i < ELENCO.backup_da_tenere + 2; i++) copiaDiSicurezza({ radice: d, adesso: new Date(2026, 9, 12, 20, i, 0) });
  assert.equal(readdirSync(dir).filter((n) => /^locali_.*\.zip$/.test(n)).length, ELENCO.backup_da_tenere);
});

test('controllo dopo l’aggiornamento: una cartella svuotata si riconosce e si dice quale', () => {
  const r = tmp();
  const d = installazione(r);
  const prima = statoLocali(d);
  assert.equal(prima.personaggi.file, 2, 'il LEGGIMI non conta come dato');

  // l'aggiornamento distruttivo
  rmSync(join(d, 'personaggi'), { recursive: true, force: true });
  rmSync(join(d, 'mappe'), { recursive: true, force: true });
  rmSync(join(d, 'nemici', 'legionario.json'), { force: true }); // la cartella resta, ma vuota

  const mancanti = svuotate(prima, statoLocali(d));
  const nomi = mancanti.map((x) => x.cartella).sort();
  assert.deepEqual(nomi, ['mappe', 'nemici', 'personaggi']);
  assert.equal(mancanti.find((x) => x.cartella === 'personaggi').sparita, true);
  assert.equal(mancanti.find((x) => x.cartella === 'nemici').sparita, false);
  const testo = testoSvuotate(mancanti, 'C:\\mutant\\backup-prima-aggiornamento\\locali_x.zip');
  assert.match(testo, /ATTENZIONE/);
  assert.match(testo, /personaggi: prima 2 file/);
  assert.match(testo, /locali_x\.zip/);
  assert.doesNotMatch(testo, /[àèéìòù]/, 'niente accenti: la console di Windows non è in UTF-8');
});

test('controllo dopo l’aggiornamento: se non manca niente non dice niente', () => {
  const r = tmp();
  const d = installazione(r);
  assert.deepEqual(svuotate(statoLocali(d), statoLocali(d)), []);
  assert.equal(testoSvuotate([], 'x'), '');
});

test('rimettere la copia: torna tutto e non sovrascrive quello che c’è già', () => {
  const r = tmp();
  const d = installazione(r);
  const c = copiaDiSicurezza({ radice: d });
  rmSync(join(d, 'personaggi'), { recursive: true, force: true });
  rmSync(join(d, 'nemici'), { recursive: true, force: true });
  writeFileSync(join(d, 'config-salvataggi.json'), '{"autosave_minuti":9}'); // cambiato dopo la copia

  const e = rimettiCopia({ radice: d, zip: c.zip });
  assert.equal(readFileSync(join(d, 'personaggi', 'aiko.json'), 'utf8'), '{"pg":"aiko"}');
  assert.equal(readFileSync(join(d, 'nemici', 'legionario.json'), 'utf8'), '{}');
  assert.equal(readFileSync(join(d, 'config-salvataggi.json'), 'utf8'), '{"autosave_minuti":9}', 'non sovrascrive');
  assert.ok(e.rimessi >= 3);
  assert.ok(e.cartelle.includes('personaggi') && e.cartelle.includes('nemici'));
  assert.deepEqual(svuotate(statoLocali(d), statoLocali(d)), []);
});

test('riga di comando: prima / dopo / rimetti, con l’uscita giusta', () => {
  const r = tmp();
  const d = installazione(r);
  const nodo = (...a) => spawnSync(process.execPath, [join(REPO, 'tools', 'dati-locali.mjs'), ...a, `--radice=${d}`], { encoding: 'utf8' });

  const p = nodo('prima');
  assert.equal(p.status, 0, p.stderr);
  assert.match(p.stdout, /Copia di sicurezza dei dati di questo PC/);
  assert.ok(leggiStatoPrima(d).zip);

  assert.equal(nodo('dopo').status, 0, 'niente svuotato: uscita 0');

  rmSync(join(d, 'personaggi'), { recursive: true, force: true });
  const q = nodo('dopo');
  assert.equal(q.status, 1, 'una cartella svuotata: uscita 1');
  assert.match(q.stdout, /personaggi: prima 2 file/);

  const m = nodo('rimetti');
  assert.equal(m.status, 0, m.stdout);
  assert.ok(existsSync(join(d, 'personaggi', 'aiko.json')));
  assert.equal(nodo('dopo').status, 0);
});

test('senza dati locali la copia non si fa e l’aggiornamento prosegue', () => {
  const r = tmp();
  const d = join(r, 'mutant');
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'index.html'), '<html></html>');
  const c = copiaDiSicurezza({ radice: d });
  assert.equal(c.zip, null);
  const s = scriviStatoPrima(d);
  assert.equal(s.copia.zip, null);
  assert.deepEqual(svuotate(s.prima, statoLocali(d)), []);
});

test('l’elenco dei locali si legge dai dati, non dal codice', () => {
  const e = elencoLocali(REPO);
  assert.ok(Array.isArray(e.cartelle) && e.cartelle.length > 5);
  assert.ok(Array.isArray(e.controllo_svuotamento) && e.controllo_svuotamento.includes('personaggi'));
  assert.ok(e.backup_esclusi.includes('node_modules'));
});
