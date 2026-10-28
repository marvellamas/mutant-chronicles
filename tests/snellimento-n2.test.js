// Snellimento N2 (deciso da Marcello e Davide: l'app avvisa, non blocca; l'ultima parola è del master). Ogni blocco per
// regola è diventato un avviso con «Procedi comunque»: il motore rifiuta ancora di suo, ma con `forza` / `procedi`
// procede, e nello storico del personaggio resta «procedi comunque: …». Restano fermi gli errori veri (dati mancanti).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { validaCorrezione, applicaRimozione } from '../src/avanzamento.js';
import { rigaStorico, testoProcedi, allineaStorico, procediComunque, STORICO_MAX } from '../src/storico.js';
import { massimiSessione, inizializzaSessione, allineaSessione, nuovaSessione, spendiPmLancio, attivaArtefatto } from '../src/sessione.js';
import { statoAttivazione, attivaTecnica, tecnicaDi } from '../src/tecniche.js';
import { usaConsumabile, motivoNonUsabile, consumabiliMistici, pianoCreazione, applicaCreazione } from '../src/consumabili-mistici.js';
import { cambioProtezione, catalogo, risolvi } from '../src/equipaggiamento.js';
import { muoviVeicolo, statoMovimento } from '../src/veicoli-registro.js';
import { vistaPlancia } from '../src/tavolo.js';
import { serializza } from '../src/character.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, tiro } from './personaggi.js';

const { dati } = await datiReali();
const pg = (pa4 = { 'Tecnologia': 3, 'Medicina': 2, 'Sopravvivenza': 2 }) => ({
  creazione: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 2, 'Tecnologia': 1, 'Cultura': 1, 'Raggirare': 3 } },
  livelli: [
    { livello: 2, caratteristiche: { DES: 2 } },
    { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
    { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: pa4 },
    { livello: 5, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
    { livello: 6, caratteristiche: { INT: 1, COS: 1 } },
  ],
});
const SETTIMO = { talentoLibero: { id: 'riflessi-fulminei' } };

test('storico: «procedi comunque: …» nella sessione, salvato con il file, visibile al master nella plancia', () => {
  const s = rigaStorico(rigaStorico(null, 'altra riga'), testoProcedi('Sali al livello 7', 'Punti Abilità in eccesso.'), new Date('2026-10-11T10:00:00Z'));
  assert.deepEqual(s.storico.at(-1), { quando: '2026-10-11T10:00:00.000Z', testo: 'procedi comunque: Sali al livello 7 (Punti Abilità in eccesso)' });
  assert.deepEqual(procediComunque(s).map((x) => x.testo), ['procedi comunque: Sali al livello 7 (Punti Abilità in eccesso)']);
  // la sessione allineata lo conserva; «Nuova sessione» non lo cancella; senza righe la chiave non c'è
  const scheda = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const m = massimiSessione(scheda, MISHIMA_AGENTE, dati);
  assert.equal(allineaSessione({ ...inizializzaSessione(m), storico: s.storico }, m).storico.length, 2);
  assert.equal(nuovaSessione({ ...inizializzaSessione(m), storico: s.storico }, m).storico.length, 2);
  assert.equal('storico' in allineaSessione(inizializzaSessione(m), m), false);
  // righe non valide scartate, al massimo STORICO_MAX
  assert.equal(allineaStorico([{ testo: '' }, 'x', { quando: 'ieri', testo: 'ok' }]).length, 1);
  let lungo = null;
  for (let i = 0; i < STORICO_MAX + 5; i++) lungo = rigaStorico(lungo, `riga ${i}`);
  assert.deepEqual([lungo.storico.length, lungo.storico[0].testo], [STORICO_MAX, 'riga 5']);
  // il master lo vede: la vista della plancia porta la sessione con lo storico
  const file = JSON.parse(serializza(MISHIMA_AGENTE));
  file.sessione = { ...inizializzaSessione(m), storico: s.storico };
  assert.equal(procediComunque(vistaPlancia(JSON.stringify(file), dati).sessione).length, 1);
});

test('«Sali di livello» con punti in eccesso (A.108) o riassegnazioni in sospeso (A.107): avviso, con «procedi» si sale', () => {
  // 8 punti al 4° livello invece di 7: eccesso
  const eccesso = pg({ 'Tecnologia': 3, 'Medicina': 3, 'Sopravvivenza': 2 });
  assert.equal(calcolaScheda(eccesso, dati).eccessi.length, 1);
  const e = validaLivello(eccesso, SETTIMO, dati);
  assert.deepEqual([e.length, e[0].procedibile, /Punti Abilità in eccesso \(A\.108\)/.test(e[0].problema)], [1, true, true]);
  assert.deepEqual(validaLivello(eccesso, SETTIMO, dati, { procedi: true }).filter((x) => x.campo === 'livelli'), []);
  // riassegnazione in sospeso: corretto il 2° livello, un punto del 4° non aumenta più il VA
  const sospeso = { ...pg(), livelli: pg().livelli.map((l) => (l.livello === 2 ? { livello: 2, caratteristiche: { INT: 2 } } : l)) };
  assert.equal(calcolaScheda(sospeso, dati).completamenti.length, 1);
  const c = validaLivello(sospeso, SETTIMO, dati);
  assert.deepEqual([c[0].procedibile, /riassegna/.test(c[0].problema)], [true, true]);
  assert.deepEqual(validaLivello(sospeso, SETTIMO, dati, { procedi: true }).filter((x) => x.campo === 'livelli'), []);
  // senza avvisi nulla cambia
  assert.deepEqual(validaLivello(pg(), SETTIMO, dati), validaLivello(pg(), SETTIMO, dati, { procedi: true }));
});

test('correzione retroattiva che renderebbe irregolare un livello dopo (A.107): avviso procedibile; gli errori del livello fermano', async () => {
  // copia di collaudo di Lucas (come tests/avanzamento-a107-a108.test.js): tolti gli eccessi, si corregge il 2° livello
  const { readFileSync } = await import('node:fs');
  const { deserializzaPersonaggio, normalizza } = await import('../src/character.js');
  const { creazione, livelli } = deserializzaPersonaggio(readFileSync(new URL('collaudo/Lucas_liv6_2026-09-28 (2).json', import.meta.url), 'utf8'));
  let p = { creazione: normalizza(creazione, dati).scelte, livelli };
  p = applicaRimozione(applicaRimozione(p, 4, { 'Medicina': 3 }), 1, { 'Potere': 2, 'Occultismo': 1 });
  // abbassando INT le quote degli incantesimi del 3° livello non tornano più: prima era un blocco, ora un avviso
  const voce = { incantesimi: ['Piattaforma Levitante'], caratteristiche: { SAG: 2 } };
  const err = validaCorrezione(p, 2, voce, dati);
  const dopo = err.filter((e) => /il 3° livello diventerebbe irregolare/.test(e.problema));
  assert.ok(dopo.length > 0 && dopo.every((e) => e.procedibile === true));
  // con «procedi» quegli avvisi non fermano più; il resto degli errori non cambia
  const forzata = validaCorrezione(p, 2, voce, dati, { procedi: true });
  assert.ok(!forzata.some((e) => /diventerebbe irregolare/.test(e.problema)));
  assert.deepEqual(forzata, err.filter((e) => !e.procedibile));
  // una correzione incompleta resta ferma anche con «procedi»: è un errore del livello stesso
  const incompleta = validaCorrezione(p, 2, { caratteristiche: { INT: 2 }, incantesimi: ['Piattaforma Levitante'] }, dati, { procedi: true });
  assert.ok(incompleta.some((e) => e.tipo === 'incompleto' && !e.procedibile));
});

test('Tecniche Interiori: una per Round, Umanità 0 e PM insufficienti avvisano; con «forza» si attiva e i PM non vanno sotto 0', () => {
  const t = tecnicaDi('aura-di-resistenza', dati);
  const scheda = { tecniche: [{ id: t.id }], tecnicheAmmesse: 1, pm: 20, umanita: null };
  const ses = (extra = {}) => ({ pmAttuali: 20, round: 1, ultimaTecnica: null, tecnicheAttive: [], statiAttivi: [], chroma: {}, ...extra });
  // una per Round
  const gia = ses({ ultimaTecnica: { id: 'colpo-interiore', round: 1 } });
  assert.match(statoAttivazione(scheda, gia, t, dati).motivo, /una sola per Round/);
  assert.equal(attivaTecnica(scheda, gia, t, dati), null);
  const f = attivaTecnica(scheda, gia, t, dati, { forza: true });
  assert.deepEqual([f.tecnicheAttive.map((x) => x.id), f.pmAttuali], [[t.id], 20 - t.costo_pm]);
  // PM insufficienti: a 0, non sotto
  const poveri = ses({ pmAttuali: 1 });
  assert.equal(attivaTecnica(scheda, poveri, t, dati), null);
  assert.equal(attivaTecnica(scheda, poveri, t, dati, { forza: true }).pmAttuali, 0);
  // Umanità 0
  const zero = { ...scheda, umanita: { valore: 0, risorseInteriori: false } };
  assert.match(statoAttivazione(zero, ses(), t, dati).motivo, /Umanità 0/);
  assert.equal(attivaTecnica(zero, ses(), t, dati, { forza: true }).tecnicheAttive.length, 1);
});

test('armature e rinforzi in Round (A.110): la regola resta un avviso con il motivo (il cambio lo decide il master)', () => {
  const cat = catalogo(dati);
  const armatura = cat.oggetti.find((o) => o.tipo === 'armatura');
  const r = risolvi({ uid: 'a', rif: armatura.rif, stato: 'indossata', quantita: 1, note: '' }, cat);
  const c = cambioProtezione(r, 'togli', { inRound: true, armaturaIndossata: false }, dati);
  assert.deepEqual([c.ammesso, /A\.110/.test(c.motivo)], [false, true]);
  // la funzione non cambia nulla: dice il motivo; la scheda chiede «Procedi comunque» e poi cambia lo stato
  assert.equal(testoProcedi(`togliere o riporre ${r.nome}`, c.motivo).startsWith('procedi comunque: togliere o riporre'), true);
});

test('consumabili: «Usa» nel deposito o in un Round con attivazione lunga avvisa; con «forza» si usa', () => {
  const voci = [{ uid: 'b', rif: 'artefatti:pergamena-di-esorcizzare-corruzione-6', stato: null, quantita: 1, note: '' },
    { uid: 'd', rif: 'artefatti:pergamena-di-cura-ferite-3', stato: 'deposito', quantita: 2, note: '' }];
  const [esorcizza, cura] = consumabiliMistici(voci, dati);
  assert.equal(motivoNonUsabile(esorcizza, { inScontro: true }), 'si usa fuori dal combattimento');
  assert.equal(usaConsumabile(voci, 'b', dati, { inScontro: true }), null);
  assert.equal(usaConsumabile(voci, 'b', dati, { inScontro: true, forza: true }).esaurito, true);
  assert.match(motivoNonUsabile(cura), /deposito comune/);
  assert.equal(usaConsumabile(voci, 'd', dati), null);
  assert.equal(usaConsumabile(voci, 'd', dati, { forza: true }).rimasti, 1);
  // un oggetto che non è un consumabile resta rifiutato: è un errore, non una regola
  assert.equal(usaConsumabile([{ uid: 'x', rif: 'esplorazione:nastro-tecnico', stato: null, quantita: 1, note: '' }], 'x', dati, { forza: true }), null);
});

test('«Crea consumabile» senza Ritualista o con versione non conosciuta: avvisi (irregolari), non errori; i dati mancanti fermano', () => {
  const scheda = { abilita: [], talentiLiberi: [], incantesimi: { conosciuti: [], livelloMassimo: 0 } };
  const p = pianoCreazione({ incantesimo: 'Cura Ferite', livello: 3, progetto: { disponibile: true } }, { scheda, crediti: 1000, pmAttuali: 20 }, dati);
  assert.deepEqual([p.errori, p.irregolari.length, p.creato], [[], 2, true]);
  assert.ok(p.irregolari.some((x) => /Ritualista Minore/.test(x)) && p.irregolari.some((x) => /non conosci/.test(x)));
  const calc = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [] }, livelli: [] }, dati);
  const m = massimiSessione(calc, { ...MISHIMA_AGENTE, equipaggiamento: [] }, dati);
  const sessione = { ...inizializzaSessione(m), crediti: 1000 };
  assert.equal(applicaCreazione({ voci: [], sessione }, p, m, 'u'), null);
  assert.equal(applicaCreazione({ voci: [], sessione }, p, m, 'u', { forza: true }).voci.length, 1);
  // supporto senza costo: manca un dato, e nemmeno «forza» lo registra
  const senza = pianoCreazione({ incantesimo: 'Cura Ferite', livello: 3, progetto: { disponibile: true }, supporto: { id: 'altro' } }, { scheda, crediti: 1000, pmAttuali: 20 }, dati);
  assert.ok(senza.errori.length > 0);
  assert.equal(applicaCreazione({ voci: [], sessione }, senza, m, 'u', { forza: true }), null);
});

test('«Lancia!» e Artefatti con PM che non bastano: senza «forza» rifiuto, con «forza» a 0', () => {
  const calc = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [{ uid: 'bat', rif: 'artefatti:batteria-da-5-pm-chroma-rosso', stato: 'trasportato', quantita: 1, note: '', sintonizzato: true }] }, livelli: [] }, dati);
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [{ uid: 'bat', rif: 'artefatti:batteria-da-5-pm-chroma-rosso', stato: 'trasportato', quantita: 1, note: '', sintonizzato: true }] };
  const m = massimiSessione(calc, creazione, dati);
  const s = inizializzaSessione(m);
  assert.equal(spendiPmLancio(s, { personali: s.pmAttuali + 5 }, m), null);
  assert.equal(spendiPmLancio(s, { personali: s.pmAttuali + 5 }, m, { forza: true }).pmAttuali, 0);
  assert.equal(spendiPmLancio(s, { personali: 0, contenitore: { uid: 'bat', pm: 9 } }, m), null);
  assert.equal(spendiPmLancio(s, { personali: 0, contenitore: { uid: 'bat', pm: 9 } }, m, { forza: true }).chroma.bat.pmAttuali, 0);
  assert.equal(attivaArtefatto(s, 'bat', 9, m), null);
  assert.equal(attivaArtefatto(s, 'bat', 9, m, { forza: true }).chroma.bat.pmAttuali, 0);
  // un contenitore che non c'è resta un errore
  assert.equal(attivaArtefatto(s, 'manca', 1, m, { forza: true }), null);
});

test('veicolo già mosso nel Round: il master può muoverlo lo stesso', () => {
  const scontro = { id: 's1', round: 2, stato: 'aperto', partecipanti: [{ id: 'pg:Akira', tipo: 'pg', chiave: 'Akira', nome: 'Akira' }] };
  const rec = { id: 'v1', mezzo: { nome: 'Furgone' }, conducente: { tipo: 'pg', chiave: 'Akira', nome: 'Akira' }, movimento: { scontro: 's1', round: 2, da: 'Akira' } };
  const st = statoMovimento(rec, scontro, scontro.partecipanti[0]);
  assert.equal(st.puo, false);
  assert.throws(() => muoviVeicolo(rec, scontro, scontro.partecipanti[0]));
  assert.deepEqual(muoviVeicolo(rec, scontro, scontro.partecipanti[0], { forza: true }).movimento, { scontro: 's1', round: 2, da: 'Akira' });
  // senza conducente non c'è niente da muovere: errore vero
  assert.throws(() => muoviVeicolo({ ...rec, conducente: null }, scontro, null, { forza: true }));
});

test('punti in eccesso tolti: la salita torna regolare senza avvisi', () => {
  const eccesso = pg({ 'Tecnologia': 3, 'Medicina': 3, 'Sopravvivenza': 2 });
  const tolto = applicaRimozione(eccesso, 4, { 'Medicina': 1 });
  assert.deepEqual(validaLivello(tolto, SETTIMO, dati).filter((x) => x.campo === 'livelli'), []);
});
