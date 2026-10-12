// «Ripristina» con la scelta (12/10/2026, docs/diagnosi-dati-spariti-2026-10-12.md): tutti i salvataggi dei
// quattro posti, dal più recente, con data, ora, tipo, dimensione e che cosa contengono; si sceglie quello
// giusto, anche uno vecchio, e prima di rimetterlo si fa comunque una copia dello stato attuale.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  elencoSalvataggi, postiSalvataggi, nomiNelloZip, perCartella, testoContenuto, contenutoPerElenco,
  ripristina, contenutoSalvataggio,
} from '../tools/ripristina.mjs';
import { creaZip, cartelleDi } from '../tools/salva-sessione.mjs';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const radici = [];
after(() => radici.forEach((r) => rmSync(r, { recursive: true, force: true })));
const tmp = () => { const r = mkdtempSync(join(tmpdir(), 'mutant-scelta-')); radici.push(r); return r; };
const spento = async () => false;

/** Uno zip di salvataggio con il contenuto indicato: { 'personaggi/aiko.json': '{}' , … } */
const zipDi = (file) => creaZip(Object.entries(file).map(([nome, testo]) => ({ nome, dati: Buffer.from(testo), mtime: new Date(2026, 9, 9) })));

/** Un'installazione con quattro salvataggi diversi, di date diverse, nei quattro posti. */
function installazione() {
  const r = tmp();
  for (const c of ['personaggi', 'nemici', 'scontri', 'tavolo', 'veicoli', 'scene', 'mappe', 'galleria', 'salvataggi', 'autosave', 'backup-prima-aggiornamento', 'drive']) mkdirSync(join(r, c), { recursive: true });
  for (const [c, n, t] of [['personaggi', 'LEGGIMI.txt', 'leggimi'], ['personaggi', 'Oggi.json', '{"nome":"Oggi"}'], ['scontri', 's1.json', '{}']]) writeFileSync(join(r, c, n), t);
  writeFileSync(join(r, 'config-salvataggi.json'), JSON.stringify({ cartella_drive: join(r, 'drive') }));

  const metti = (dove, nome, file, giorno) => {
    const p = join(dove, nome);
    writeFileSync(p, zipDi(file));
    const d = new Date(2026, 9, giorno, 22, 0);
    utimesSync(p, d, d);
    return p;
  };
  const zip = {
    vecchio: metti(join(r, 'salvataggi'), 'sessione_2026-10-05_2200.zip', {
      'personaggi/Aiko.json': '{"nome":"Aiko"}', 'personaggi/Kenta.json': '{"nome":"Kenta"}',
      'personaggi/LEGGIMI.txt': 'leggimi', 'scontri/vecchio.json': '{}', 'mappe/cripta.webp': 'img', 'mappe/strada.webp': 'img',
    }, 5),
    recente: metti(join(r, 'salvataggi'), 'sessione_2026-10-11_2200.zip', { 'personaggi/Solo.json': '{"nome":"Solo"}' }, 11),
    aggiornamento: metti(join(r, 'backup-prima-aggiornamento'), 'locali_2026-10-10_09-00-00.zip', {
      'personaggi/Dieci.json': '{}', 'nemici/legionario.json': '{}', 'galleria/volto.webp': 'img', 'config-salvataggi.json': '{}',
    }, 10),
    drive: metti(join(r, 'drive'), 'sessione_2026-10-08_2200.zip', { 'personaggi/Drive.json': '{}' }, 8),
    autosave: metti(join(r, 'autosave'), 'autosave.zip', { 'personaggi/Auto.json': '{}' }, 12),
  };
  return { r, zip };
}

test('l’elenco mostra tutti i salvataggi, dal più recente, non solo l’ultimo', () => {
  const { r } = installazione();
  const e = elencoSalvataggi(postiSalvataggi(r, { cartella_drive: join(r, 'drive') }));
  assert.deepEqual(e.map((x) => x.nome), [
    'autosave.zip', 'sessione_2026-10-11_2200.zip', 'locali_2026-10-10_09-00-00.zip',
    'sessione_2026-10-08_2200.zip', 'sessione_2026-10-05_2200.zip',
  ]);
  // ognuno dice data e ora, tipo, dove sta e quanto è grande
  for (const x of e) {
    assert.ok(x.mtime instanceof Date);
    assert.ok(x.tipoTesto && x.dove);
    assert.ok(x.dimensione > 0);
  }
});

test('che cosa contiene ogni salvataggio, letto dall’indice dello zip senza aprirlo tutto', () => {
  const { zip } = installazione();
  assert.deepEqual(perCartella(nomiNelloZip(zip.vecchio)), { personaggi: 2, scontri: 1, mappe: 2 });
  assert.equal(contenutoPerElenco(zip.vecchio), '2 personaggi · 1 scontro · 2 mappe');
  assert.equal(contenutoPerElenco(zip.recente), '1 personaggio');
  assert.equal(contenutoPerElenco(zip.aggiornamento), '1 personaggio · 1 nemico · 1 immagine');
  // singolare e plurale, ordine utile al tavolo, e il vuoto
  assert.equal(testoContenuto({ scene: 1, personaggi: 3, galleria: 5 }), '3 personaggi · 1 scena · 5 immagini');
  assert.equal(testoContenuto({}), 'vuoto');
  assert.equal(testoContenuto({ cosa_strana: 2 }), '2 in cosa_strana');
  // un file che non è uno zip non fa saltare l'elenco
  assert.equal(nomiNelloZip(join(REPO, 'package.json')), null);
  assert.equal(contenutoPerElenco(join(REPO, 'package.json')), null);
});

test('si sceglie un salvataggio vecchio, non l’ultimo, e prima si fa la copia dello stato attuale', async () => {
  const { r, zip } = installazione();
  const e = await ripristina({ zip: zip.vecchio, cartelle: cartelleDi(r), salvataggi: join(r, 'salvataggi'), adesso: new Date(2026, 9, 12, 20, 30), serverAcceso: spento });
  assert.equal(e.ok, true, e.motivo);
  // è tornato il salvataggio del 5, non quello dell'11
  assert.deepEqual(readdirSync(join(r, 'personaggi')).sort(), ['Aiko.json', 'Kenta.json', 'LEGGIMI.txt']);
  assert.equal(readFileSync(join(r, 'scontri', 'vecchio.json'), 'utf8'), '{}');
  // la copia dello stato di prima c'è e contiene il personaggio di oggi
  assert.ok(e.copiaSicurezza.endsWith('prima-del-ripristino_2026-10-12_2030.zip'));
  const dentro = contenutoSalvataggio(readFileSync(e.copiaSicurezza));
  assert.ok(dentro.perCartella.personaggi.some((x) => x.rel === 'Oggi.json'));
});

test('si ripristina anche da una copia fatta prima di un aggiornamento (zip di PowerShell)', async () => {
  const { r } = installazione();
  // Compress-Archive scrive i nomi con le barre rovesciate: il ripristino deve accettarli
  const zip = join(r, 'backup-prima-aggiornamento', 'locali_powershell.zip');
  writeFileSync(zip, creaZip([
    { nome: 'personaggi\\Dalla_copia.json', dati: Buffer.from('{"nome":"Dalla copia"}'), mtime: new Date() },
    { nome: 'config-salvataggi.json', dati: Buffer.from('{}'), mtime: new Date() },
  ]));
  const c = contenutoSalvataggio(readFileSync(zip));
  assert.deepEqual(c.perCartella.personaggi.map((x) => x.rel), ['Dalla_copia.json']);
  assert.deepEqual(c.estranei, ['config-salvataggi.json'], 'la configurazione non si rimette');

  const e = await ripristina({ zip, cartelle: cartelleDi(r), salvataggi: join(r, 'salvataggi'), serverAcceso: spento });
  assert.equal(e.ok, true, e.motivo);
  assert.ok(existsSync(join(r, 'personaggi', 'Dalla_copia.json')));
  assert.equal(perCartella(['personaggi\\x.json']).personaggi, 1);
});

test('la console elenca tutto, con tipo, posto, dimensione e contenuto', () => {
  const { r } = installazione();
  const e = spawnSync(process.execPath, [join(REPO, 'tools', 'console.mjs'), 'ripristina', `--radice=${r}`, '--porta=1'], { encoding: 'utf8', input: '\n' });
  const out = e.stdout;
  assert.match(out, / Salvataggi, dal piu' recente \(data e ora, tipo, dove sta, dimensione, che cosa contiene\):/);
  for (const n of ['autosave.zip', 'sessione_2026-10-11_2200.zip', 'locali_2026-10-10_09-00-00.zip', 'sessione_2026-10-08_2200.zip', 'sessione_2026-10-05_2200.zip']) {
    assert.ok(out.includes(n), `manca ${n} nell'elenco`);
  }
  assert.match(out, /2 personaggi · 1 scontro · 2 mappe/);
  assert.match(out, /prima di un aggiornamento · copie prima degli aggiornamenti/);
  assert.match(out, /Google Drive/);
  // cinque voci numerate
  assert.equal((out.match(/^ {2}\s?\d+\. /gm) ?? []).length, 5);
});

test('la console dice dove ha cercato quando non trova niente', () => {
  const r = tmp();
  const e = spawnSync(process.execPath, [join(REPO, 'tools', 'console.mjs'), 'ripristina', `--radice=${r}`, '--porta=1'], { encoding: 'utf8', input: '\n' });
  assert.match(e.stdout, /Nessun salvataggio trovato\. Cercati in:/);
  assert.ok(e.stdout.includes(join(r, 'salvataggi')));
  assert.ok(e.stdout.includes(join(r, 'backup-prima-aggiornamento')));
});
