// Ripristino di un salvataggio e console di Mutant (tools/ripristina.mjs, tools/console.mjs, Mutant.bat; richiesta di
// Marcello del 09/10/2026): elenco dei salvataggi, rifiuto con il server acceso, copia di sicurezza prima di toccare
// qualunque cosa, cartelle rimesse al loro posto (le altre lasciate, i LEGGIMI conservati), zip rovinati rifiutati.
// Cartelle temporanee e porta casuale.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { elencoSalvataggi, ripristina, statoServer, spegniServer, contenutoSalvataggio, nomeCopiaSicurezza, rigaSalvataggio } from '../tools/ripristina.mjs';
import { creaZip, leggiZip, cartelleDi, salvataggioCompleto } from '../tools/salva-sessione.mjs';
import { preparaImpostazioni, testoVersione } from '../tools/console.mjs';
import { creaServer } from '../server.mjs';

const radici = [];
after(() => radici.forEach((r) => rmSync(r, { recursive: true, force: true })));
const tmp = () => { const r = mkdtempSync(join(tmpdir(), 'mutant-ripristina-')); radici.push(r); return r; };
const spento = async () => false;
// le cartelle di prova anche per il server (mai quelle dell'app)
const cartelleServer = (r) => Object.fromEntries(Object.entries(cartelleDi(r)).map(([k, v]) => [k === 'personaggi' ? 'cartella' : k, v]).concat([['musica', join(r, 'musica')]]));
const scrivi = (r, rel, t) => { mkdirSync(join(r, rel, '..'), { recursive: true }); writeFileSync(join(r, rel), t); };
const leggi = (r, rel) => readFileSync(join(r, rel), 'utf8');
const ora = new Date();
const zipDi = (voci) => creaZip(voci.map(([nome, t]) => ({ nome, dati: Buffer.from(t), mtime: ora })));

/** Un'installazione di prova: lo stato «di adesso». */
function installazione() {
  const r = tmp();
  scrivi(r, 'personaggi/LEGGIMI.txt', 'leggimi dei personaggi');
  scrivi(r, 'personaggi/Lia_liv3_2026-10-09.json', '{"nome":"Lia","pv":2}');
  scrivi(r, 'personaggi/Nuovo_liv1_2026-10-09.json', '{"nome":"Nuovo"}');
  scrivi(r, 'scontri/scontro-9.json', '{"round":4}');
  scrivi(r, 'scene/cripta.json', '{"id":"cripta","revisione":9}');
  scrivi(r, 'mappe/cripta-abc.jpg', 'immagine');
  scrivi(r, 'tavolo/sessione.json', '{"personaggi":["Lia"]}');
  return r;
}

test('elenco dei salvataggi: sessioni, copie di sicurezza e i due autosave, dal più recente; il resto no', () => {
  const r = tmp();
  const s = join(r, 'salvataggi');
  const a = join(r, 'autosave');
  const data = (min) => new Date(2026, 9, 9, 21, min);
  for (const [dir, n, min] of [[s, 'sessione_2026-10-09_2110.zip', 10], [s, 'sessione_2026-10-09_2140.zip', 40], [s, 'prima-del-ripristino_2026-10-09_2150.zip', 50], [s, 'LEGGIMI.txt', 55], [s, 'altro.zip', 56], [a, 'autosave.zip', 45], [a, 'autosave-precedente.zip', 20], [a, 'autosave.json', 46]]) {
    scrivi(dir, n, 'x'.repeat(2048));
    utimesSync(join(dir, n), data(min), data(min));
  }
  const e = elencoSalvataggi({ salvataggi: s, autosave: a });
  assert.deepEqual(e.map((x) => x.nome), ['prima-del-ripristino_2026-10-09_2150.zip', 'autosave.zip', 'sessione_2026-10-09_2140.zip', 'autosave-precedente.zip', 'sessione_2026-10-09_2110.zip']);
  assert.deepEqual(e.map((x) => x.tipo), ['prima-del-ripristino', 'autosave', 'sessione', 'autosave-precedente', 'sessione']);
  assert.equal(rigaSalvataggio(e[1]), '09/10/2026 21:45  autosave (ultimo automatico)  2 KB');
  assert.equal(elencoSalvataggi({ salvataggi: s, autosave: a, massimo: 2 }).length, 2);
  assert.deepEqual(elencoSalvataggi({ salvataggi: join(r, 'manca'), autosave: join(r, 'manca2') }), []);
});

test('ripristino: copia di sicurezza, cartelle del salvataggio rimesse per intero, le altre lasciate, LEGGIMI conservato', async () => {
  const r = installazione();
  const prima = Object.fromEntries(['personaggi/Lia_liv3_2026-10-09.json', 'scontri/scontro-9.json', 'mappe/cripta-abc.jpg'].map((k) => [k, leggi(r, k)]));
  // un salvataggio vecchio (come quelli del 06/10: senza scene e mappe)
  const zip = join(r, 'salvataggi', 'sessione_2026-10-06_2300.zip');
  scrivi(r, 'salvataggi/sessione_2026-10-06_2300.zip', '');
  writeFileSync(zip, zipDi([['personaggi/Lia_liv2_2026-10-06.json', '{"nome":"Lia","pv":9}'], ['scontri/scontro-1.json', '{"round":1}'], ['scontri/archivio/scontro-0.json', '{}'], ['tavolo/sessione.json', '{"personaggi":[]}']]));
  const adesso = new Date(2026, 9, 9, 22, 15);
  const e = await ripristina({ zip, cartelle: cartelleDi(r), salvataggi: join(r, 'salvataggi'), adesso, serverAcceso: spento });
  assert.equal(e.ok, true, e.motivo);
  assert.deepEqual(e.rimesse, [{ cartella: 'personaggi', file: 1 }, { cartella: 'scontri', file: 2 }, { cartella: 'tavolo', file: 1 }]);
  assert.deepEqual(e.lasciate, ['veicoli', 'nemici', 'scene', 'mappe']);
  // le cartelle rimesse sono esattamente quelle del salvataggio (i file più nuovi non restano), più il LEGGIMI
  assert.deepEqual(readdirSync(join(r, 'personaggi')).sort(), ['LEGGIMI.txt', 'Lia_liv2_2026-10-06.json']);
  assert.equal(leggi(r, 'personaggi/LEGGIMI.txt'), 'leggimi dei personaggi');
  assert.deepEqual(readdirSync(join(r, 'scontri')).sort(), ['archivio', 'scontro-1.json']);
  assert.equal(leggi(r, 'scontri/archivio/scontro-0.json'), '{}');
  // le cartelle che il salvataggio non ha restano com'erano
  assert.equal(leggi(r, 'scene/cripta.json'), '{"id":"cripta","revisione":9}');
  assert.equal(leggi(r, 'mappe/cripta-abc.jpg'), 'immagine');
  // la copia di sicurezza ha lo stato di prima, per intero
  assert.equal(e.copiaSicurezza, join(r, 'salvataggi', nomeCopiaSicurezza(adesso)));
  const copia = leggiZip(readFileSync(e.copiaSicurezza));
  for (const [k, v] of Object.entries(prima)) assert.equal(copia[k].toString(), v);
  assert.ok(copia['personaggi/Nuovo_liv1_2026-10-09.json']);
  // nessuna cartella «da parte» lasciata in giro
  assert.ok(!readdirSync(r).some((n) => n.includes('.ripristino-')));
  // e dalla copia di sicurezza si torna indietro
  const indietro = await ripristina({ zip: e.copiaSicurezza, cartelle: cartelleDi(r), salvataggi: join(r, 'salvataggi'), adesso, serverAcceso: spento });
  assert.equal(indietro.ok, true);
  assert.equal(leggi(r, 'personaggi/Lia_liv3_2026-10-09.json'), '{"nome":"Lia","pv":2}');
  assert.equal(leggi(r, 'scontri/scontro-9.json'), '{"round":4}');
  assert.ok(!existsSync(join(r, 'scontri', 'scontro-1.json')));
  assert.notEqual(indietro.copiaSicurezza, e.copiaSicurezza, 'la seconda copia di sicurezza non sovrascrive la prima');
});

test('ripristino da un salvataggio completo vero (zip di salva-sessione)', async () => {
  const r = installazione();
  const s = await salvataggioCompleto({ cartelle: cartelleDi(r), salvataggi: join(r, 'salvataggi'), config: { ntfy: false } });
  writeFileSync(join(r, 'personaggi', 'Lia_liv3_2026-10-09.json'), '{"nome":"Lia","pv":0}');
  rmSync(join(r, 'scene', 'cripta.json'));
  const e = await ripristina({ zip: s.archivio, cartelle: cartelleDi(r), salvataggi: join(r, 'salvataggi'), serverAcceso: spento });
  assert.equal(e.ok, true);
  assert.equal(leggi(r, 'personaggi/Lia_liv3_2026-10-09.json'), '{"nome":"Lia","pv":2}');
  assert.equal(leggi(r, 'scene/cripta.json'), '{"id":"cripta","revisione":9}');
  assert.deepEqual(e.rimesse.map((x) => x.cartella), ['personaggi', 'scontri', 'tavolo', 'scene', 'mappe']);
});

test('rifiuti: server acceso, zip rovinato, nomi fuori dalla cartella, copia di sicurezza impossibile; nulla toccato', async () => {
  const r = installazione();
  const fotografia = () => JSON.stringify(['personaggi', 'scontri', 'scene', 'tavolo'].map((c) => readdirSync(join(r, c)).sort().map((n) => [n, leggi(r, `${c}/${n}`)])));
  const prima = fotografia();
  const buono = join(r, 'buono.zip');
  writeFileSync(buono, zipDi([['personaggi/X.json', '{}']]));
  // 1. server acceso (un server vero su una porta di prova)
  const server = creaServer({ radice: r, ...cartelleServer(r) });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const porta = server.address().port;
  try {
    assert.deepEqual(await statoServer(porta), { acceso: true, mutant: true });
    const e = await ripristina({ zip: buono, cartelle: cartelleDi(r), salvataggi: join(r, 'salvataggi'), serverAcceso: async () => (await statoServer(porta)).acceso });
    assert.equal(e.ok, false);
    assert.match(e.motivo, /Mutant è acceso/);
  } finally { await new Promise((ok) => server.close(ok)); }
  assert.deepEqual(await statoServer(porta), { acceso: false, mutant: false });
  // 2. zip rovinato (un byte cambiato: CRC sbagliato) e non-zip
  const rovinato = Buffer.from(readFileSync(buono));
  rovinato[rovinato.indexOf(Buffer.from('X.json')) + 6 + 1] ^= 0xff;
  writeFileSync(join(r, 'rovinato.zip'), rovinato);
  writeFileSync(join(r, 'testo.zip'), 'non sono uno zip');
  // 3. nomi che escono dalla cartella, zip senza cartelle di Mutant
  writeFileSync(join(r, 'cattivo.zip'), zipDi([['personaggi/../../fuori.json', '{}']]));
  writeFileSync(join(r, 'estraneo.zip'), zipDi([['src/app.js', 'x']]));
  for (const [z, atteso] of [['rovinato.zip', /non utilizzabile/], ['testo.zip', /non è uno zip/], ['cattivo.zip', /nome non valido/], ['estraneo.zip', /nessuna delle cartelle/]]) {
    const e = await ripristina({ zip: join(r, z), cartelle: cartelleDi(r), salvataggi: join(r, 'salvataggi'), serverAcceso: spento });
    assert.equal(e.ok, false, z);
    assert.match(e.motivo, atteso, z);
  }
  assert.ok(!existsSync(join(r, '..', 'fuori.json')));
  // 4. la copia di sicurezza non si può scrivere (salvataggi è un file): nessuna cartella toccata
  writeFileSync(join(r, 'occupato'), 'x');
  const e = await ripristina({ zip: buono, cartelle: cartelleDi(r), salvataggi: join(r, 'occupato'), serverAcceso: spento });
  assert.equal(e.ok, false);
  assert.match(e.motivo, /copia di sicurezza non riuscita.*non ho toccato nulla/);
  assert.equal(fotografia(), prima);
  assert.ok(!existsSync(join(r, 'salvataggi')) || !readdirSync(join(r, 'salvataggi')).length, 'nessuna copia di sicurezza per i rifiuti');
});

test('contenuto di un salvataggio: cartelle note e file estranei', () => {
  const c = contenutoSalvataggio(zipDi([['personaggi/A.json', '1'], ['mappe/m.jpg', '2'], ['note.txt', '3']]));
  assert.deepEqual(Object.keys(c.perCartella), ['personaggi', 'mappe']);
  assert.deepEqual(c.estranei, ['note.txt']);
});

test('«Spegni Mutant» dalla console: il server salva, si spegne e la console lo vede spento', async () => {
  const r = installazione();
  let fatto = null;
  const server = creaServer({ radice: r, ...cartelleServer(r), salvataggi: { salva: async (o) => ({ ok: true, riga: `salvata (${o})` }), spegni: () => { fatto = true; server.close(); server.closeAllConnections?.(); } } });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const porta = server.address().port;
  const s = await spegniServer(porta, { attesaMs: 5000 });
  assert.equal(s.spento, true, s.motivo);
  assert.equal(s.esito.riga, 'salvata (Spegni Mutant)');
  assert.equal(fatto, true);
  // niente server: la richiesta non riesce, senza eccezioni
  const n = await spegniServer(porta, { attesaMs: 500 });
  assert.equal(n.spento, false);
});

test('impostazioni: i file mancanti si creano dagli esempi, quelli presenti non si toccano; versione installata', () => {
  const r = tmp();
  scrivi(r, 'config-salvataggi.esempio.json', '{"autosave_minuti":5}');
  scrivi(r, 'avvisi/avvisi.esempio.json', '{"attivo":true}');
  scrivi(r, 'avvisi/avvisi.json', '{"attivo":false}');
  assert.deepEqual(preparaImpostazioni(r), [{ file: 'config-salvataggi.json', creato: true }, { file: join('avvisi', 'avvisi.json'), creato: false }]);
  assert.equal(leggi(r, 'config-salvataggi.json'), '{"autosave_minuti":5}');
  assert.equal(leggi(r, 'avvisi/avvisi.json'), '{"attivo":false}');
  assert.equal(preparaImpostazioni(r)[0].creato, false);
  assert.equal(testoVersione(r), 'sconosciuta');
  scrivi(r, 'versione.json', '{"versione":"abc123","data":"2026-10-09 10:00"}');
  assert.equal(testoVersione(r), 'abc123 del 2026-10-09 10:00');
});
