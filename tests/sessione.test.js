import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import {
  massimiSessione, inizializzaSessione, allineaSessione, modificaSessione, variaSessione, commutaStato,
  nuovaSessione, convertiDistintivi, penalitaSessione, descriviFerite,
} from '../src/sessione.js';
import { serializza, deserializzaPersonaggio, normalizza, FORMATO_FILE } from '../src/character.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE, LIVELLI_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const agente = (livello) => ({ creazione: MISHIMA_AGENTE, livelli: LIVELLI_AGENTE.slice(0, livello - 1) });
const massimi = (p, d = dati) => massimiSessione(calcolaScheda(p, d), p.creazione, d);

test('inizializzazione: PV e PM ai massimi, Punti Eroe iniziali, il resto a zero', () => {
  const m = massimi(agente(1));
  assert.equal(m.pv, 16); // esempio del manuale (§2.14)
  assert.equal(m.pm, 9);
  assert.equal(m.puntiEroe, 10);
  const s = inizializzaSessione(m);
  assert.deepEqual(s, {
    pvAttuali: 16, pmAttuali: 9, puntiEroe: m.puntiEroeIniziali, distintivi: 0,
    statiAttivi: [], ferite: 0, affaticamento: 0, corruzione: 0, munizioni: {}, scorte: {}, chroma: {}, caricoExtra: 0,
    crediti: null, creditiIniziali: null, condizioniOggetti: [], bonusTalenti: true, talentiAccesi: [], attacchi: {}, lanci: {}, integrita: {}, nec: {}, condizioniArmi: {}, round: 1, ultimaTecnica: null, tecnicheAttive: [], note: '',
  });
  // una sessione assente si inizializza
  assert.deepEqual(allineaSessione(null, m), s);
  assert.deepEqual(allineaSessione(undefined, m), s);
});

test('quando un massimo cambia il valore attuale si limita, non si riazzera', () => {
  const m7 = massimi(agente(7)); // Buona Costituzione al 7° livello: +5 PV
  const m6 = massimi(agente(6));
  assert.ok(m7.pv > m6.pv);
  // al 6° livello, ferito: 10 PV su m6.pv
  const ferito = modificaSessione(inizializzaSessione(m6), { pvAttuali: 10, note: 'agguato' }, m6);
  // sale di livello: il massimo cresce, gli attuali restano 10 (non tornano al massimo)
  const dopo = allineaSessione(ferito, m7);
  assert.equal(dopo.pvAttuali, 10);
  assert.equal(dopo.note, 'agguato');
  // tabella modificata dal master: il massimo scende sotto gli attuali → limitati al nuovo massimo
  const pieno = inizializzaSessione(m7);
  const mMinore = { ...m7, pv: 12, pm: 3 };
  const limitata = allineaSessione(pieno, mMinore);
  assert.equal(limitata.pvAttuali, 12);
  assert.equal(limitata.pmAttuali, 3);
  // e se il massimo torna a salire, non si recupera nulla da solo
  assert.equal(allineaSessione(limitata, m7).pvAttuali, 12);
});

test('limiti: niente sotto 0 né sopra i massimi; Stati sconosciuti scartati', () => {
  const m = massimi(agente(1));
  let s = inizializzaSessione(m);
  s = variaSessione(s, 'pvAttuali', -50, m);
  assert.equal(s.pvAttuali, 0);
  s = variaSessione(s, 'pvAttuali', +500, m);
  assert.equal(s.pvAttuali, m.pv);
  s = variaSessione(s, 'puntiEroe', +20, m);
  assert.equal(s.puntiEroe, 10); // §1.8.3: massimo 10
  s = modificaSessione(s, { ferite: 99, affaticamento: -3, statiAttivi: ['stordito', 'inesistente', 'stordito'] }, m);
  assert.equal(s.ferite, m.ferite);
  assert.equal(s.affaticamento, 0);
  assert.deepEqual(s.statiAttivi, ['stordito']);
  // valori non numerici tornano ai predefiniti
  const rotta = allineaSessione({ pvAttuali: 'tanti', distintivi: -2, munizioni: { frecce: 12, rotte: -1 }, note: 5 }, m);
  assert.equal(rotta.pvAttuali, m.pv);
  assert.equal(rotta.distintivi, 0);
  assert.deepEqual(rotta.munizioni, {}); // nessuna arma a distanza nella lista: le munizioni di armi sconosciute spariscono
  // senza l'elenco dei caricatori (massimi vecchi) i valori numerici diventano { colpi, riserve }
  const { caricatori: _, ...senza } = m;
  assert.deepEqual(allineaSessione({ munizioni: { frecce: 12, rotte: -1 } }, senza).munizioni, { frecce: { colpi: 12, riserve: 0 } });
  assert.equal(rotta.note, '');
});

test('Stati, Ferite e Affaticamento: promemoria delle penalità dai dati', () => {
  const m = massimi(agente(1));
  let s = commutaStato(inizializzaSessione(m), 'rallentato', m);
  s = modificaSessione(s, { ferite: 2, affaticamento: 2 }, m);
  const p = penalitaSessione(s, dati);
  assert.equal(p.ferite.nome, 'Importante');
  assert.equal(p.ferite.penalita, -2); // §5.14
  assert.equal(p.affaticamento.nome, 'Affaticato');
  assert.equal(p.affaticamento.penalita, -1); // §5.19
  assert.deepEqual(p.stati.map((x) => x.id), ['rallentato']);
  assert.equal(p.totale, -3);
  assert.deepEqual(commutaStato(s, 'rallentato', m).statiAttivi, []);
  assert.equal(descriviFerite(0, dati).penalita, 0);
  assert.match(descriviFerite(m.ferite, dati).nome, /Oltre Grave: Morte/);
});

test('Nuova sessione: PV/PM ai massimi, Stati, Ferite, Affaticamento a zero; note, Punti Eroe e Distintivi restano', () => {
  const m = massimi(agente(1));
  const s = modificaSessione(inizializzaSessione(m), {
    pvAttuali: 3, pmAttuali: 1, puntiEroe: 2, distintivi: 4, statiAttivi: ['accecato'], ferite: 3, affaticamento: 4, note: 'debito con Vasco',
  }, m);
  assert.deepEqual(nuovaSessione(s, m), {
    ...s, pvAttuali: m.pv, pmAttuali: m.pm, statiAttivi: [], ferite: 0, affaticamento: 0,
  });
});

test('§1.8.3: 5 Distintivi diventano 1 Punto Eroe, senza superare 10', () => {
  const m = massimi(agente(1));
  const s = modificaSessione(inizializzaSessione(m), { distintivi: 6, puntiEroe: 4 }, m);
  const c = convertiDistintivi(s, m);
  assert.equal(c.distintivi, 1);
  assert.equal(c.puntiEroe, 5);
  assert.equal(convertiDistintivi(c, m), null); // un solo Distintivo
  assert.equal(convertiDistintivi({ ...s, puntiEroe: 10 }, m), null); // riserva piena
});

test('export/import: la sessione viaggia nel file; senza sessione il file la dà null e si inizializza', () => {
  const p = agente(3);
  const m = massimi(p);
  const sessione = modificaSessione(inizializzaSessione(m), { pvAttuali: 7, note: 'x' }, m);
  const testo = serializza(p.creazione, { livelli: p.livelli, sessione });
  const letto = deserializzaPersonaggio(testo);
  assert.deepEqual(letto.sessione, sessione);
  assert.deepEqual(letto.livelli, p.livelli);

  const senza = deserializzaPersonaggio(serializza(p.creazione, { livelli: p.livelli }));
  assert.equal(senza.sessione, null);
  const { scelte } = normalizza(senza.creazione, dati);
  assert.deepEqual(allineaSessione(senza.sessione, massimi({ creazione: scelte, livelli: senza.livelli })), inizializzaSessione(m));
  // una sessione non valida nel file viene ignorata
  const rotto = JSON.stringify({ formato: FORMATO_FILE, versione: 4, scelte: p.creazione, sessione: [1, 2] });
  assert.equal(deserializzaPersonaggio(rotto).sessione, null);
});

test('massimi dai dati: cambiando la tabella delle Ferite cambia il numero di gradini', () => {
  const d = copia(dati);
  d.regole.ferite.stati.pop();
  assert.equal(massimi(agente(1), d).ferite, dati.regole.ferite.stati.length);
});

test('«Attacca!»: le scelte si conservano anche per le armi ravvicinate e per «Senz’armi»', async () => {
  const { allineaSessione: allinea, inizializzaSessione: iniz } = await import('../src/sessione.js');
  const m = { pv: 10, pm: 0, puntiEroe: 10, puntiEroeIniziali: 3, ferite: 6, affaticamento: 6, stati: [], caricatori: { f: 30 }, oggetti: ['f', 'spada'] };
  const s = { ...iniz(m), attacchi: { f: { distanza: 10 }, spada: { manovra: 'affondo' }, senz_armi: { dannoSenzArmi: '1d3' }, sparita: { x: 1 } } };
  assert.deepEqual(Object.keys(allinea(s, m).attacchi).sort(), ['f', 'senz_armi', 'spada']);
});
