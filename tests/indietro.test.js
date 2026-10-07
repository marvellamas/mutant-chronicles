// «Indietro» nell'Iniziativa (ritocchi del 07/10/2026, src/scontro.js → avanti, anteprimaIndietro, indietro): annulla
// l'ultimo «Avanti» e riporta turno, Round, durate, effetti, Stati dei nemici e perdite periodiche com'erano; più passi,
// con il limite di data/mappa.json → iniziativa.indietro_max; le modifiche fatte dopo restano e l'avviso lo dice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nuovoScontro, aggiungiNemici, registraTiro, registraDurata, cambiaStatoNemico, variaPvNemico, avanti, indietro, anteprimaIndietro, diTurno, validaScontro } from '../src/scontro.js';
import { registraPeriodico, perditeDovute, applicaPerdita } from '../src/periodici.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();
const T0 = new Date('2026-10-07T20:00:00Z');
const MAX = dati.mappa.iniziativa.indietro_max;
const leggi = (f) => JSON.parse(readFileSync(new URL(`../esempi/${f}`, import.meta.url), 'utf8'));
const legionario = leggi('nemici/legionario-oscuro.json');
const stato = (id) => dati.regole.stati.elenco.find((s) => s.id === id);
const av = (s) => avanti(s, T0, { indietroMax: MAX });

/** Ada (PG) e due Legionari: ordine Leg 1, Ada, Leg 2. */
function pronto() {
  let s = nuovoScontro({ id: 'indietro-prova', adesso: T0, pg: [{ chiave: 'ada', nome: 'Ada', iniziativa: 3, des: 7, int: 5 }] });
  s = aggiungiNemici(s, legionario, 2, {}, T0);
  const [n1, n2] = s.partecipanti.filter((p) => p.tipo === 'nemico').map((p) => p.id);
  s = registraTiro(s, n1, 'd10', { valore: 10, origine: 'vivo' }, dati, T0);
  s = registraTiro(s, 'pg:ada', 'd10', { valore: 5, origine: 'vivo' }, dati, T0);
  s = registraTiro(s, n2, 'd10', { valore: 1, origine: 'vivo' }, dati, T0);
  return { s, n1, n2 };
}

test('dati: limite dello storico in data/mappa.json, validato', () => {
  assert.ok(Number.isInteger(MAX) && MAX >= 1);
  const d = copia(dati);
  d.mappa.iniziativa.indietro_max = 0;
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'iniziativa.indietro_max'));
});

test('tre «Avanti» e due «Indietro» attraverso il cambio di Round: tutto com’era', () => {
  let { s, n1, n2 } = pronto();
  // Leg 2 Stordito fino alla fine del Round 1; un incantesimo di Leg 1 fino alla fine del Round 1
  s = cambiaStatoNemico(s, n2, stato('stordito'), true, T0);
  s = { ...s, durate: [{ partecipante: n2, stato: 'stordito', nome: 'Stordito', al: 1, rimasti: 1 }] };
  s = { ...s, effetti: [{ uid: 'e1', nome: 'Scudo', da: n1, daNome: 'Legionario Oscuro 1', dal: 1, al: 1, bersagli: [] }] };
  const iniziale = s;
  const nomi = [];
  for (let i = 0; i < 3; i++) { s = av(s); nomi.push(`${s.round}:${diTurno(s).nome}`); }
  assert.deepEqual(nomi, ['1:Ada', '1:Legionario Oscuro 2', '2:Legionario Oscuro 1']);
  assert.deepEqual([s.durate.length, s.effetti.length, s.partecipanti.find((p) => p.id === n2).stati], [0, 0, []]);
  assert.equal(validaScontro(s), null);
  // primo «Indietro»: torna il Round 1, con lo Stato, la durata e l'incantesimo
  const a = anteprimaIndietro(s);
  assert.deepEqual([a.cambiaRound, a.round, a.diTurno.nome, a.altre, a.passi], [true, 1, 'Legionario Oscuro 2', 0, 3]);
  s = indietro(s, T0);
  assert.deepEqual([s.round, diTurno(s).nome], [1, 'Legionario Oscuro 2']);
  assert.deepEqual(s.partecipanti.find((p) => p.id === n2).stati, ['stordito']);
  assert.deepEqual(s.durate.map((d) => [d.stato, d.al, d.rimasti]), [['stordito', 1, 1]]);
  assert.deepEqual(s.effetti.map((e) => e.nome), ['Scudo']);
  assert.match(s.registro.at(-1).testo, /^Indietro: torna il turno di Legionario Oscuro 2, Round 1\. Tornano in corso: Stordito, Scudo\./);
  assert.equal(anteprimaIndietro(s).altre, 0, 'le righe dell’«Indietro» non sono «altre modifiche»');
  // secondo «Indietro»: torna Ada
  s = indietro(s, T0);
  assert.deepEqual([s.round, diTurno(s).nome, s.indietro.length], [1, 'Ada', 1]);
  // a parte storico e registro, lo scontro è quello di prima dei due «Avanti»
  const togli = (x) => ({ ...x, registro: null, indietro: null });
  assert.deepEqual(togli(s), togli(av(iniziale)));
  // di nuovo «Avanti» due volte: le durate finiscono come la prima volta
  s = av(av(s));
  assert.deepEqual([s.round, s.durate.length], [2, 0]);
});

test('modifiche fatte dopo l’«Avanti» restano, e l’anteprima le conta', () => {
  let { s, n2 } = pronto();
  s = av(s);
  s = variaPvNemico(s, n2, -5, T0);
  const a = anteprimaIndietro(s);
  assert.equal(a.altre, 1);
  s = indietro(s, T0);
  assert.equal(diTurno(s).nome, 'Legionario Oscuro 1');
  assert.equal(s.partecipanti.find((p) => p.id === n2).pv.attuali, legionario.pv - 5, 'i PV cambiati dopo restano');
  assert.match(s.registro.at(-1).testo, /Restano le modifiche fatte dopo l’«Avanti» \(1 righe del registro\)/);
});

test('perdita periodica applicata al turno della fonte: «Indietro» la annulla (nemico) o la passa alla plancia (PG)', () => {
  let { s, n1, n2 } = pronto();
  // Leg 1 fa sanguinare Leg 2 (nemico) e Ada (PG): si applica al turno di Leg 1, nel Round 2
  s = registraPeriodico(s, { bersaglio: n2, nome: 'Legionario Oscuro 2', tipo: 'nemico', stato: 'sanguinamento', valore: 2, fonte: n1, fonteNome: 'Legionario Oscuro 1' }, T0, dati);
  s = registraPeriodico(s, { bersaglio: 'pg:ada', nome: 'Ada', tipo: 'pg', chiave: 'ada', stato: 'sanguinamento', valore: 1, fonte: n1, fonteNome: 'Legionario Oscuro 1' }, T0, dati);
  s = av(av(av(s)));
  assert.deepEqual([s.round, diTurno(s).id], [2, n1]);
  const dovute = perditeDovute(s, dati);
  assert.equal(dovute.length, 2);
  const pvN2 = s.partecipanti.find((p) => p.id === n2).pv.attuali;
  for (const d of dovute) s = applicaPerdita(s, d, d.tipo === 'pg' ? { pvPrima: 18, pvDopo: 17 } : null, T0, dati);
  assert.equal(s.partecipanti.find((p) => p.id === n2).pv.attuali, pvN2 - 2);
  const a = anteprimaIndietro(s);
  assert.equal(a.altre, 0, 'le righe delle perdite sono dell’«Avanti»');
  assert.deepEqual(a.perditePg.map((p) => [p.chiave, p.pvPrima, p.pvDopo]), [['ada', 18, 17]]);
  s = indietro(s, T0);
  assert.equal(s.round, 1);
  assert.equal(s.partecipanti.find((p) => p.id === n2).pv.attuali, pvN2, 'PV del nemico rimessi');
  assert.deepEqual(perditeDovute(s, dati), [], 'nel Round 1 nulla di dovuto');
  // di nuovo «Avanti»: le perdite tornano dovute una volta sola
  s = av(s);
  assert.equal(perditeDovute(s, dati).length, 2);
});

test('limite dello storico e niente «Indietro» senza «Avanti»; senza indietroMax nessuno storico', () => {
  let { s } = pronto();
  assert.equal(anteprimaIndietro(s), null);
  assert.equal(indietro(s, T0), s);
  for (let i = 0; i < MAX + 5; i++) s = av(s);
  assert.equal(s.indietro.length, MAX);
  assert.equal(avanti(pronto().s, T0).indietro, undefined);
  assert.match(validaScontro({ ...s, indietro: [{}] }), /Indietro/);
});

test('template scaduti al nuovo Round: Ctrl+Z e «Indietro» oltre il Round li rimettono', async () => {
  const { nuovaScena, validaScena } = await import('../src/mappa/scena.js');
  const { scadiTemplateAnnullabile, rimettiScaduti, annullaUltima } = await import('../src/mappa/annulla.js');
  const { nuovoTemplate } = await import('../src/mappa/template.js');
  let sc = { ...nuovaScena({ id: 's', nome: 'S', colonne: 10, righe: 10, nebbia: 'scoperta', dati }), revisione: 0 };
  const fumo = nuovoTemplate({ id: 'f', forma: 'cerchio', misure: { raggio: 1 }, origine: [3, 3], colore: '#868e96', nome: 'Fumo', durata: 1, round: 1, scontro: 'sc' });
  const muro = nuovoTemplate({ id: 'm', forma: 'cerchio', misure: { raggio: 1 }, origine: [6, 6], colore: '#868e96', nome: 'Fisso', durata: null, round: 1, scontro: 'sc' });
  sc = { ...sc, template: [fumo, muro] };
  const r = scadiTemplateAnnullabile(sc, (t) => t.id === 'f', { scontro: 'sc', round: 3 }, dati);
  assert.deepEqual(r.scena.template.map((t) => t.id), ['m']);
  assert.equal(validaScena(r.scena, dati), null);
  assert.deepEqual(annullaUltima(r.scena).scena.template.map((t) => t.id).sort(), ['f', 'm']);
  // «Indietro» al Round 3 (lo stesso): nulla; al Round 2: torna il Fumo, e la voce esce dalla pila
  assert.equal(rimettiScaduti(r.scena, 'sc', 3).rimessi.length, 0);
  const b = rimettiScaduti(r.scena, 'sc', 2);
  assert.deepEqual([b.rimessi.map((t) => t.id), b.scena.template.length, b.scena.annulla.length], [['f'], 2, 0]);
  assert.equal(rimettiScaduti(r.scena, 'altro', 2).rimessi.length, 0);
});
