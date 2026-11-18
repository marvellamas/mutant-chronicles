import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 218, parte C: **cancellare un record dal registro dei veicoli, e non perderlo.**
//
// Nei pacchetti dei lotti 202, 208, 214 e 215 abbiamo scritto a Davide che il secondo record della Neverlost «si cancella
// dalla tab Veicoli». Non c'era né un pulsante né un DELETE sul server. Adesso c'è, con quattro cautele — e queste prove
// sono le cautele:
//   1. la conferma nomina il mezzo e il suo identificativo;
//   2. se un personaggio lo cita, l'app lo dice prima, con i nomi;
//   3. il record cancellato va in una copia di sicurezza e si può rimettere;
//   4. solo dal PC del Direttore.
//
// **Il test che deve restare rosso se qualcuno ci prova:** un record di veicolo non può essere cancellato senza una copia
// di sicurezza. Provato in due modi, il comportamento (se la copia non si può scrivere, il record resta) e la forma del
// codice (nel server il file si toglie solo dopo che la copia è stata scritta e riletta).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { citazioniVeicolo, fraseDiConferma, copiaDiSicurezza, copiaValida, ripristinaDaCopia, nomeCopia, CARTELLA_CANCELLATI } from '../src/veicoli-cancella.js';

const radice = mkdtempSync(join(tmpdir(), 'mutant-cancella-218-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srvMaster, srvTablet, baseM, baseT;

const record = (id, nome = 'Neverlost', extra = {}) => ({
  formato: 'mutant-veicolo', versione: 1, id, revisione: 3, aggiornato: '2026-11-15T10:00:00.000Z',
  proprietario: { tipo: 'gruppo' }, conducente: null, mitragliere: null,
  // Integrità, munizioni e storico: quello che non deve andare perso
  mezzo: { uid: id, profilo: 'neverlost', nome, andatura: 'fermo', pi: { corpo: 111, motore: 40 }, rinforzi: {}, munizioni: [{ id: 'cannone', colpi: 7 }], avarie: 'scafo graffiato', storico: ['atterrata il 12/11'], ...extra }, movimento: null,
});
const scrivi = (r) => writeFileSync(join(c.veicoli, `${r.id}.json`), `${JSON.stringify(r, null, 2)}\n`);
const leggi = (id) => JSON.parse(readFileSync(join(c.veicoli, `${id}.json`), 'utf8'));
const elimina = (base, r, q = {}) => fetch(`${base}/api/veicoli/${r.id}?conferma=${q.conferma ?? r.id}&revisione=${q.revisione ?? r.revisione}`, { method: 'DELETE' });

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  const base = { cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px };
  // lo stesso server vero, due volte: dal PC del Direttore e da un tablet (le protezioni dei blocchi del master non si
  // applicano al PC del Direttore: chi prova qualcosa che un tablet può fare diversamente lo prova con eMaster falso)
  srvMaster = creaServer({ ...base, eMaster: () => true });
  srvTablet = creaServer({ ...base, eMaster: () => false });
  await Promise.all([srvMaster, srvTablet].map((s) => new Promise((ok) => s.listen(0, '127.0.0.1', ok))));
  baseM = `http://127.0.0.1:${srvMaster.address().port}`;
  baseT = `http://127.0.0.1:${srvTablet.address().port}`;
});
after(async () => {
  await Promise.all([srvMaster, srvTablet].map((s) => new Promise((ok) => s.close(ok))));
  rmSync(radice, { recursive: true, force: true });
});

// --- le cautele --------------------------------------------------------------------------------------------

test('3. LA REGOLA: il record cancellato va in una copia di sicurezza con tutto il suo contenuto', async () => {
  const r = record('veimvzoj07y0');
  scrivi(r);
  const risposta = await elimina(baseM, r);
  assert.equal(risposta.status, 200);
  const corpo = await risposta.json();
  assert.equal(corpo.cancellato, r.id);
  assert.equal(existsSync(join(c.veicoli, `${r.id}.json`)), false, 'il record è uscito dal registro');
  const copie = readdirSync(join(c.veicoli, CARTELLA_CANCELLATI));
  assert.equal(copie.length, 1, 'la copia c’è');
  const copia = JSON.parse(readFileSync(join(c.veicoli, CARTELLA_CANCELLATI, copie[0]), 'utf8'));
  assert.ok(copiaValida(copia));
  assert.deepEqual(copia.record, r, 'la copia è il record intero, Integrità, munizioni e storico compresi');
  assert.equal(copia.cancellato.da, 'master');
});

test('3. e si rimette: il record torna com’era, con la revisione che sale, e non si rimette due volte', async () => {
  const copie = await (await fetch(`${baseM}/api/veicoli/cancellati`)).json();
  assert.equal(copie.length, 1);
  assert.match(copie[0].testo, /Neverlost \(veimvzoj07y0\) — cancellato il /, 'la riga dice il mezzo, l’identificativo e quando');
  const rimesso = await fetch(`${baseM}/api/veicoli/cancellati/${encodeURIComponent(copie[0].file)}/ripristina`, { method: 'POST' });
  assert.equal(rimesso.status, 200);
  const dopo = leggi('veimvzoj07y0');
  assert.equal(dopo.revisione, 4, 'una pagina aperta prima della cancellazione non può sovrascriverlo senza accorgersene');
  assert.deepEqual(dopo.mezzo, record('veimvzoj07y0').mezzo, 'Integrità, munizioni e storico sono quelli di prima');
  const ancora = await fetch(`${baseM}/api/veicoli/cancellati/${encodeURIComponent(copie[0].file)}/ripristina`, { method: 'POST' });
  assert.equal(ancora.status, 409, 'non sovrascrive un record che c’è già');
  assert.match((await ancora.json()).errore, /veimvzoj07y0/);
});

test('4. solo dal PC del Direttore: un tablet non cancella il mezzo del gruppo, né lo rimette, né legge le citazioni', async () => {
  const r = record('veimwabc1234', 'Scout del gruppo');
  scrivi(r);
  assert.equal((await elimina(baseT, r)).status, 403);
  assert.equal(existsSync(join(c.veicoli, `${r.id}.json`)), true, 'il record è ancora lì');
  assert.equal((await fetch(`${baseT}/api/veicoli/${r.id}/citazioni`)).status, 403);
  assert.equal((await fetch(`${baseT}/api/veicoli/cancellati`)).status, 403);
  // e nessuna copia è nata per un rifiuto
  const dopo = existsSync(join(c.veicoli, CARTELLA_CANCELLATI)) ? readdirSync(join(c.veicoli, CARTELLA_CANCELLATI)) : [];
  assert.equal(dopo.filter((x) => x.startsWith(r.id)).length, 0);
});

test('1. la conferma deve nominare il mezzo: senza l’identificativo giusto, o con la revisione di un altro momento, non si cancella', async () => {
  const r = record('veimwabc1234', 'Scout del gruppo');
  assert.equal((await elimina(baseM, r, { conferma: 'veimsbagliato' })).status, 400, 'identificativo sbagliato');
  assert.equal((await fetch(`${baseM}/api/veicoli/${r.id}?revisione=${r.revisione}`, { method: 'DELETE' })).status, 400, 'identificativo assente');
  const vecchia = await elimina(baseM, r, { revisione: 1 });
  assert.equal(vecchia.status, 409, 'la revisione è quella di una lettura vecchia: il record è cambiato altrove');
  assert.equal((await vecchia.json()).attuale.id, r.id);
  assert.equal(existsSync(join(c.veicoli, `${r.id}.json`)), true);
});

test('2. se un personaggio lo cita, l’app lo dice prima con i nomi; e la scena con il token', async () => {
  const r = record('veimwabc1234', 'Scout del gruppo');
  scrivi(r);
  writeFileSync(join(c.personaggi, 'PABLO-ZAION_liv7_2026-11-14.json'), JSON.stringify({
    formato: 'mutant-personaggio', versione: 8, pg: 'pg-pablo', scelte: { nome: 'PABLO ZAION', veicoli: [{ rif: r.id, nome: 'Scout del gruppo' }] },
  }));
  writeFileSync(join(c.personaggi, 'LUCAS_liv7_2026-11-14.json'), JSON.stringify({ formato: 'mutant-personaggio', versione: 8, scelte: { nome: 'LUCAS', veicoli: [] } }));
  writeFileSync(join(c.scene, 'scena-1.json'), JSON.stringify({ id: 'scena-1', nome: 'Atterraggio', token: [{ rif: { tipo: 'veicolo', id: r.id } }, { rif: { tipo: 'veicolo', id: 'altro' } }] }));
  const k = await (await fetch(`${baseM}/api/veicoli/${r.id}/citazioni`)).json();
  assert.deepEqual(k.citato.personaggi.map((p) => p.nome), ['PABLO ZAION'], 'Lucas non lo cita e non compare');
  assert.deepEqual(k.citato.scene.map((s) => [s.nome, s.token]), [['Atterraggio', 1]]);
  // la frase che la finestra mostra: il mezzo, l'identificativo, i nomi, e che cosa succede
  assert.match(k.frase, /«Scout del gruppo» \(veimwabc1234/);
  assert.match(k.frase, /la scheda di PABLO ZAION/);
  assert.match(k.frase, /la scena «Atterraggio»/);
  assert.match(k.frase, /riferimenti restano senza un record/);
  assert.match(k.frase, /veicoli\/cancellati\//, 'dice dove resta la copia');
  // citare non impedisce: decide il Direttore, che ora sa. Il file del PG non si tocca
  const dopoPg = readFileSync(join(c.personaggi, 'PABLO-ZAION_liv7_2026-11-14.json'), 'utf8');
  assert.equal((await elimina(baseM, r)).status, 200);
  assert.equal(readFileSync(join(c.personaggi, 'PABLO-ZAION_liv7_2026-11-14.json'), 'utf8'), dopoPg, 'il file del personaggio è com’era');
});

test('LA PROVA IN ROSSO: se la copia di sicurezza non si può scrivere, il record NON si cancella', async () => {
  const r = record('veimwxyz9999', 'Mezzo da non perdere');
  scrivi(r);
  // la cartella delle copie è un FILE: scrivere lì dentro è impossibile
  rmSync(join(c.veicoli, CARTELLA_CANCELLATI), { recursive: true, force: true });
  writeFileSync(join(c.veicoli, CARTELLA_CANCELLATI), 'non sono una cartella');
  try {
    const risposta = await elimina(baseM, r);
    assert.notEqual(risposta.status, 200, 'cancellato senza una copia: è esattamente quello che non deve succedere');
    assert.deepEqual(leggi(r.id), r, 'il record è intatto, byte per byte');
  } finally {
    rmSync(join(c.veicoli, CARTELLA_CANCELLATI), { force: true });
  }
});

test('LA FORMA DEL CODICE: nel server il file si toglie solo dopo che la copia è stata scritta e riletta', () => {
  const sorgente = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
  const inizio = sorgente.indexOf('async function apiVeicoliCancella');
  const fine = sorgente.indexOf('async function apiVeicoli(', inizio);
  const corpo = sorgente.slice(inizio, fine);
  const scritta = corpo.indexOf('scriviJson(file, copiaDiSicurezza');
  const riletta = corpo.indexOf('copiaValida(riletta)');
  const tolta = corpo.indexOf('await unlink(dove)');
  assert.ok(scritta > 0 && riletta > scritta && tolta > riletta, 'la sequenza è: copia scritta → copia riletta e uguale → file tolto');
  assert.equal(corpo.split('unlink(').length - 1, 1, 'un solo punto in cui un record di veicolo si toglie');
  // e nessun altro punto del server toglie un file di veicoli/: cancellare un record passa di qui
  const altrove = sorgente.slice(0, inizio) + sorgente.slice(fine);
  assert.ok(!/unlink\(join\(veicoli/.test(altrove), 'nessun altro unlink su veicoli/');
});

// --- le funzioni pure ------------------------------------------------------------------------------------------

test('le funzioni pure: citazioni, frase, copia, ripristino', () => {
  const rec = record('veimaaaa0001', 'Autovettura');
  const k = citazioniVeicolo(rec.id, [{ nome: 'A', file: 'a.json', scelte: { veicoli: [{ rif: rec.id }] } }, { nome: 'B', file: 'b.json', scelte: { veicoli: [{ rif: 'x' }, { nome: 'locale' }] } }], []);
  assert.deepEqual(k.personaggi.map((p) => p.nome), ['A']);
  assert.equal(k.totale, 1);
  assert.match(fraseDiConferma(rec, { personaggi: [], scene: [], totale: 0 }), /Nessun personaggio e nessuna scena lo cita/);
  assert.throws(() => copiaDiSicurezza(rec, {}), /momento/, 'senza il momento non si fa la copia');
  assert.throws(() => copiaDiSicurezza({}, { quando: 'x' }), /record/);
  const copia = copiaDiSicurezza(rec, { quando: '2026-11-18T09:30:00.000Z' });
  assert.equal(nomeCopia(rec.id, '2026-11-18T09:30:00.000Z'), 'veimaaaa0001_2026-11-18T09-30-00-000Z.json');
  assert.ok(ripristinaDaCopia(copia, [], '2026-11-18T10:00:00.000Z').record.revisione === rec.revisione + 1);
  assert.match(ripristinaDaCopia(copia, [rec]).errore, /veimaaaa0001/);
  assert.match(ripristinaDaCopia({ formato: 'altro' }).errore, /valido/);
});
