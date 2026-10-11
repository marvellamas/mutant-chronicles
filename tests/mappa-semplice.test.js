// «Mappa semplice» (N3), decisa da Marcello e Davide. Accesa: niente nebbia
// automatica, niente Atletica proposta dal movimento, niente Copertura automatica, pedina spostabile liberamente; spenta:
// come prima; le scene salvate prima (senza il campo) restano come sono. Cartelle temporanee e porta casuale.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena, validaScena, riassuntoScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, rettangolo } from '../src/mappa/celle.js';
import { nuovoScontro, aggiungiNemici, registraTiro } from '../src/scontro.js';
import { serializza } from '../src/character.js';
import { mappaSemplice, semplicePredefinita, conSemplice, nebbiaAutomaticaAttiva, lineaSemplice, automazioni } from '../src/mappa/semplice.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { provaMovimento, eseguiMovimentoGiocatore, areaPerTablet, lineaPerTablet, permessoMovimento } from '../src/mappa/tablet.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-semplice-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base, scontro;
const SCENA = join(radice, 'scene', 'cripta.json');
const scriviScena = (s) => writeFileSync(SCENA, JSON.stringify(s));
const leggiScena = () => JSON.parse(readFileSync(SCENA, 'utf8'));

// mappa lunga 30 Q: Akira (di turno) in [1, 1], un predone in [10, 1]; nebbia sulle colonne 27–29, un muro in [5, 0]–[5, 5]
const scenaBase = (extra = {}) => {
  const s = nuovaScena({ id: 'cripta', nome: 'Cripta', colonne: 30, righe: 6, nebbia: 'scoperta', dati });
  s.nebbia.coperti = inBase64(rettangolo(daBase64(s.nebbia.coperti), 30, 6, 27, 0, 29, 5, true));
  s.muri = inBase64(rettangolo(daBase64(s.muri), 30, 6, 5, 0, 5, 4, true));
  s.collegamento = { scontro: 'scontro-prova', bozza: null };
  s.token = [
    { id: 't-akira', rif: { tipo: 'partecipante', id: 'pg:Akira' }, q: [1, 1], ingombro: 1, nascosto: false },
    { id: 't-p1', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:1' }, q: [10, 1], ingombro: 1, nascosto: false },
  ];
  return { ...s, revisione: 1, aggiornato: '2026-10-11T10:00:00.000Z', ...extra };
};

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  const pg = structuredClone(MISHIMA_AGENTE);
  pg.nome = 'Akira';
  writeFileSync(join(c.personaggi, 'Akira_liv1_2026-10-06.json'), serializza(pg));
  const predone = JSON.parse(readFileSync(new URL('../esempi/nemici/predone-delle-lande.json', import.meta.url), 'utf8'));
  let s = nuovoScontro({ id: 'scontro-prova', nome: 'Prova', pg: [{ chiave: 'Akira', nome: 'Akira', iniziativa: 9, des: 7, int: 5 }] });
  s = aggiungiNemici(s, predone, 1);
  s = registraTiro(s, 'pg:Akira', 'd10', { valore: 10, origine: 'manuale' }, dati);
  s = registraTiro(s, 'nem:predone-delle-lande:1', 'd10', { valore: 1, origine: 'manuale' }, dati);
  scontro = { ...s, revisione: 1 };
  writeFileSync(join(c.scontri, 'scontro-prova.json'), JSON.stringify(scontro));
  scriviScena(scenaBase());
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections?.();
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});
const muovi = async (corpo) => { const r = await fetch(`${base}/api/vista-giocatori/movimento`, { method: 'POST', body: JSON.stringify({ scena: 'cripta', pg: 'Akira', fascia: 1, ...corpo }) }); return { stato: r.status, ...(await r.json()) }; };
const vista = async () => (await fetch(`${base}/api/vista-giocatori?pg=Akira`)).json();
const linea = async (corpo) => (await fetch(`${base}/api/vista-giocatori/linea`, { method: 'POST', body: JSON.stringify({ scena: 'cripta', pg: 'Akira', ...corpo }) })).json();

test('il campo: acceso di base per le scene nuove, assente nelle scene di prima (spento), validato', () => {
  assert.equal(semplicePredefinita(dati), true);
  const nuova = nuovaScena({ id: 'n', nome: 'N', colonne: 4, righe: 4, dati, semplice: semplicePredefinita(dati) });
  assert.deepEqual([nuova.semplice, mappaSemplice(nuova), validaScena(nuova, dati)], [true, true, null]);
  // una scena salvata prima non ha il campo: resta com'era
  const vecchia = nuovaScena({ id: 'v', nome: 'V', colonne: 4, righe: 4, dati });
  assert.deepEqual(['semplice' in vecchia, mappaSemplice(vecchia), riassuntoScena(vecchia).semplice], [false, false, false]);
  assert.deepEqual([conSemplice(vecchia, true).semplice, conSemplice(nuova, false).semplice], [true, false]);
  assert.match(validaScena({ ...vecchia, semplice: 'sì' }, dati), /semplice/);
  assert.deepEqual(automazioni(nuova), { nebbiaAutomatica: false, nebbia: 'semplice', luci: false, movimento: false, atletica: false, copertura: false, opportunita: false });
  assert.deepEqual(automazioni({ ...vecchia, visuale: { automatica: true } }), { nebbiaAutomatica: true, nebbia: 'completa', luci: true, movimento: true, atletica: true, copertura: true, opportunita: true });
});

test('nebbia automatica: accesa nella scena ma ferma con «Mappa semplice»; spenta la Mappa semplice torna', () => {
  // predone dietro il muro: con la nebbia automatica i giocatori non lo vedono; con la Mappa semplice vale solo la nebbia a mano
  const s = scenaBase({ visuale: { automatica: true } });
  const ctx = { regoleTemplate: dati.mappa.template, regoleMappa: dati.mappa, pezzi: [] };
  const auto = vistaGiocatori(s, ctx);
  const semplice = vistaGiocatori(conSemplice(s, true), ctx);
  const aMano = vistaGiocatori({ ...s, visuale: { automatica: false } }, ctx);
  assert.equal(nebbiaAutomaticaAttiva(s), true);
  assert.equal(nebbiaAutomaticaAttiva(conSemplice(s, true)), false);
  assert.deepEqual(semplice.token.map((t) => t.id), aMano.token.map((t) => t.id), 'come con la sola nebbia a mano');
  assert.deepEqual(semplice.nebbia, aMano.nebbia);
  assert.ok(auto.token.length <= semplice.token.length);
  assert.notDeepEqual(JSON.stringify(auto), JSON.stringify(semplice), 'la nebbia automatica cambia la vista, la Mappa semplice no');
  // spenta di nuovo: tutto come prima
  assert.deepEqual(vistaGiocatori(conSemplice(conSemplice(s, true), false), ctx), auto);
});

test('pedina spostabile liberamente dal tablet: nessuna area, nessun conteggio; spenta, i limiti di prima', async () => {
  try {
    // scena di prima (senza il campo): oltre il movimento rifiutato
    assert.equal((await muovi({ a: [20, 3] })).stato, 422);
    assert.ok((await vista()).io.area, 'con i limiti c’è l’area');
    // Mappa semplice: lo stesso quadretto va bene, senza fascia né Q contati (qui con «La nebbia si apre con i PG» spento,
    // per provare che la nebbia messa a mano resta un limite: tests/mappa-ritocchi.test.js prova l'apertura)
    scriviScena({ ...conSemplice(leggiScena(), true), visuale: { automatica: false } });
    const v = await vista();
    assert.deepEqual([v.io.semplice, v.io.area, v.io.permesso.puo, v.io.zoc], [true, null, true, []]);
    const p = await muovi({ a: [20, 3], prova: true });
    assert.deepEqual([p.stato, p.costo, p.fascia, p.opportunita], [200, 0, null, []]);
    const r = await muovi({ a: [20, 3] });
    assert.equal(r.stato, 200);
    const s = leggiScena();
    assert.deepEqual(s.token.find((t) => t.id === 't-akira').q, [20, 3]);
    assert.equal(s.movimenti.at(-1).libero, true, 'non conta nel movimento del Round');
    // restano i limiti veri: fuori dalla mappa e sotto la nebbia (quello che il giocatore non vede)
    assert.match((await muovi({ a: [28, 1] })).errore, /nebbia/);
    assert.equal((await muovi({ a: [99, 1] })).stato, 422);
    // spenta: tornano i limiti
    scriviScena(conSemplice({ ...leggiScena(), token: scenaBase().token, movimenti: [], annulla: [] }, false));
    assert.equal((await muovi({ a: [20, 3] })).stato, 422);
  } finally { scriviScena(scenaBase()); }
});

test('funzioni pure del tablet: prova, movimento libero e permesso anche senza profilo di movimento', () => {
  const s = conSemplice(scenaBase(), true);
  const pezzi = [{ tipo: 'pg', pg: 'Akira', chiave: 'partecipante:pg:Akira', nome: 'Akira', rif: { tipo: 'partecipante', id: 'pg:Akira' }, movimento: null, aZero: true }];
  assert.equal(permessoMovimento({ scena: s, pezzi, scontro, chiavePg: 'Akira', dati }).puo, true, 'niente controlli su movimento e PV');
  assert.equal(permessoMovimento({ scena: scenaBase(), pezzi, scontro, chiavePg: 'Akira', dati }).puo, false);
  assert.deepEqual(areaPerTablet({ scena: s, pezzi, scontro, chiavePg: 'Akira', fascia: 3, dati }).area, null);
  const p = provaMovimento({ scena: s, pezzi, scontro, chiavePg: 'Akira', a: [25, 5], fascia: 1, dati });
  assert.deepEqual([p.ok, p.semplice, p.costo, p.blocco], [true, true, 0, false]);
  const e = eseguiMovimentoGiocatore({ scena: s, pezzi, scontro, chiavePg: 'Akira', a: [25, 5], fascia: 1, dati });
  assert.deepEqual([e.ok, e.movimento.libero, e.scena.token[0].q], [true, true, [25, 5]]);
});

test('niente Atletica proposta dal movimento (A.136): /api/movimento-round non dà la fascia con «Mappa semplice»', async () => {
  const conScatto = { ...scenaBase(), movimenti: [{ id: 'm1', token: 't-akira', da: [1, 1], a: [18, 1], costo: 17, fascia: 'scatto', scontro: 'scontro-prova', round: scontro.round, libero: false, quando: '2026-10-11T10:00:00.000Z' }] };
  try {
    scriviScena(conScatto);
    const prima = await (await fetch(`${base}/api/movimento-round?scontro=scontro-prova&partecipante=pg%3AAkira`)).json();
    assert.equal(prima.fascia, 'scatto', 'scena di prima: come oggi');
    scriviScena(conSemplice(conScatto, true));
    const dopo = await (await fetch(`${base}/api/movimento-round?scontro=scontro-prova&partecipante=pg%3AAkira`)).json();
    assert.deepEqual([dopo.fascia, dopo.semplice], [null, true]);
    scriviScena(conSemplice(conScatto, false));
    assert.equal((await (await fetch(`${base}/api/movimento-round?scontro=scontro-prova&partecipante=pg%3AAkira`)).json()).fascia, 'scatto');
  } finally { scriviScena(scenaBase()); }
});

test('niente Copertura automatica: la linea di tiro si traccia e dà solo la distanza', async () => {
  try {
    // il muro fra Akira e il predone: scena di prima, Copertura calcolata
    const prima = await linea({ token: 't-p1' });
    assert.equal(prima.ok, true);
    assert.notEqual(prima.copertura, 'nessuna');
    scriviScena(conSemplice(leggiScena(), true));
    const dopo = await linea({ token: 't-p1' });
    assert.deepEqual([dopo.ok, dopo.semplice, dopo.distanza, dopo.copertura, dopo.protetto, dopo.interposta, dopo.luce], [true, true, prima.distanza, 'nessuna', false, false, null]);
    assert.deepEqual(dopo.da, prima.da, 'la linea si disegna come prima');
  } finally { scriviScena(scenaBase()); }
  // funzione pura
  const r = lineaSemplice({ distanza: 9, copertura: 'media', vista: 'parziale', interposta: true, protetto: true, inMezzo: [{ id: 'x' }], causa: { muro: true } });
  assert.deepEqual(r, { distanza: 9, copertura: 'nessuna', vista: 'libera', interposta: false, protetto: false, inMezzo: [], causa: null, semplice: true });
  const pezzi = [{ tipo: 'pg', pg: 'Akira', chiave: 'partecipante:pg:Akira', nome: 'Akira', rif: { tipo: 'partecipante', id: 'pg:Akira' } }];
  const l = lineaPerTablet({ scena: conSemplice(scenaBase(), true), pezzi, chiavePg: 'Akira', verso: { token: 't-p1' }, visibili: new Set(['t-akira', 't-p1']), dati });
  assert.deepEqual([l.semplice, l.copertura, l.testo], [true, 'nessuna', 'Mappa semplice: Copertura a mano']);
});
