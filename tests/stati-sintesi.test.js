// Lotto Stati: le 11 sintesi approvate da Davide il 05/10/2026 e A.119 (Ammalato con intensità, 06/10/2026).
// regole.json → stati.elenco (sintesi, implica, intensita), attacco_distanza.a_terra; src/condizioni.js; src/nemico-attacco.js;
// src/scontro.js → cambiaIntensitaNemico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { condizioniAttive, intensitaStato, statiConImplicati, penalitaStatiAbilita } from '../src/condizioni.js';
import { inizializzaSessione, allineaSessione, massimiSessione } from '../src/sessione.js';
import { calcolaAttaccoDistanza, calcolaAttaccoRavvicinato } from '../src/attacco.js';
import { conStatiNemico, difeseNemico, armaDaAttacco, calcolaAttaccoNemico } from '../src/nemico-attacco.js';
import { durataStato, cambiaStatoNemico, cambiaIntensitaNemico } from '../src/scontro.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato) => ({ uid, rif, stato, quantita: 1, note: '' });
const CREAZIONE = { ...MISHIMA_AGENTE, equipaggiamento: [voce('t', 'armi:tonfa', 'impugnata')] };
const sessione = (modifica = {}) => ({ ...inizializzaSessione({ pv: 10, pm: 5, puntiEroe: 10, ferite: 6, caricatori: {} }), ...modifica });
const scheda = (s = null) => calcolaScheda({ creazione: CREAZIONE, livelli: [], ...(s ? { sessione: s } : {}) }, dati);
const RIPOSO = scheda();
const delta = (stati, nome, extra = {}) => {
  const s = scheda(sessione({ statiAttivi: stati, ...extra }));
  return s.abilita.find((a) => a.nome === nome).effettivo - RIPOSO.abilita.find((a) => a.nome === nome).effettivo;
};
const deltaPs = (stati, extra = {}) => {
  const s = scheda(sessione({ statiAttivi: stati, ...extra }));
  return Object.keys(s.salvezze).map((k) => s.salvezze[k].effettivo - RIPOSO.salvezze[k].effettivo);
};
const stato = (id) => dati.regole.stati.elenco.find((s) => s.id === id);
const movimento = (stati) => scheda(sessione({ statiAttivi: stati })).tavolo.movimento;

test('le 11 sintesi approvate sono nei dati, con la fonte; nessun TODO(Davide) sugli Stati', () => {
  const ids = ['a-terra', 'accecato', 'assordato', 'avvelenato', 'immobilizzato', 'incendiato', 'rallentato', 'sanguinamento', 'stordito', 'svenuto', 'terrorizzato'];
  for (const id of ids) {
    const s = stato(id);
    assert.ok(s.sintesi?.length >= 3, id);
    assert.match(s.sintesi_fonte, /05\/10\/2026/);
    assert.ok(s.promemoria && s.riassunto === true, id);
    assert.equal(s['TODO(Davide)'], undefined, id);
  }
  assert.match(stato('a-terra').sintesi[0], /^−4 VA agli attacchi ravvicinati/);
  assert.match(stato('ammalato').sintesi_fonte, /A\.119/);
});

test('A Terra: −4 ravvicinato e Difese, distanza no; striscia 3 Q; chi attacca +2 ravvicinato e −2 a distanza', () => {
  assert.deepEqual([delta(['a-terra'], 'Difese'), delta(['a-terra'], 'Armi da mischia'), delta(['a-terra'], 'Armi leggere'), delta(['a-terra'], 'Cultura')], [-4, -4, 0, 0]);
  assert.ok(deltaPs(['a-terra']).every((x) => x === 0));
  const m = movimento(['a-terra']);
  assert.equal(m.passo.effettivo, 3);
  assert.equal(m.corsa.effettivo, null);
  // chi lo attacca: +2 in ravvicinato, −2 a distanza
  const arma = { uid: 'f', nome: 'Fucile', tipo: 'arma_distanza', abilita: 'Armi medie', va: 12, vaEffettivo: 12, scomposizione: [{ etichetta: 'VA', valore: 12, fonte: 'regole' }], danno: { una_mano: '1d8', due_mani: null }, mani: 2, ac: 1, gittataQ: 100, modalita: ['S'], mirino: null, accessori: [] };
  const pg = { scheda: { talentiLiberi: [], classi: [{ talenti: [] }], azioni: { principali: 1 } }, sessione: { munizioni: { f: { colpi: 5, riserve: 0 } } } };
  const dist = (aTerra) => calcolaAttaccoDistanza(pg, arma, { distanza: 5, bersaglio: { aTerra } }, dati).va_finale;
  assert.equal(dist(true) - dist(false), -2);
  assert.equal(dati.regole.attacco_ravvicinato.a_terra.bersaglio, 2);
  assert.match(dati.regole.attacco_distanza.a_terra['TODO(Davide)'], /^A\.153/);
});

test('Accecato: −8 alle Prove con la vista (attacchi, Difese, Pilotare), niente Tiro o Colpo Mirato; luce non sommata', () => {
  assert.deepEqual([delta(['accecato'], 'Armi leggere'), delta(['accecato'], 'Difese'), delta(['accecato'], 'Pilotare'), delta(['accecato'], 'Cultura')], [-8, -8, -8, 0]);
  assert.deepEqual(stato('accecato').limiti.manovre_vietate, ['mirato']);
  // cumuli: con la penombra resta −8 (non −10); le Abilità con «Richiede la vista» ricevono il −8 una volta
  assert.equal(delta(['accecato'], 'Armi leggere', { luce: 'penombra' }), -8);
  assert.equal(delta(['accecato'], 'Tecnologia', { luce: 'penombra' }), -8);
  assert.equal(delta(['accecato'], 'Tecnologia'), -8);
  assert.equal(delta(['accecato'], 'Pilotare', { luce: 'buio' }), -8);
});

test('Assordato e Avvelenato: nessuna penalità generale (l’udito come valore a parte; il veleno dalla fonte)', () => {
  assert.equal(delta(['assordato'], 'Percezione'), 0);
  assert.equal(delta(['assordato'], 'Armi leggere'), 0);
  const p = scheda(sessione({ statiAttivi: ['assordato'] })).abilita.find((a) => a.nome === 'Percezione');
  assert.equal(p.usiSpecifici.find((u) => u.uso === 'quando l’udito è importante').modificatore, -4);
  assert.equal(delta(['avvelenato'], 'Cultura'), 0);
  assert.equal(stato('avvelenato').periodico.danno, 'dalla_fonte');
});

test('Immobilizzato, Rallentato, Incendiato, Terrorizzato: penalità e movimento delle sintesi', () => {
  assert.deepEqual([delta(['immobilizzato'], 'Atletica'), delta(['immobilizzato'], 'Cultura')], [-4, 0]);
  assert.ok(deltaPs(['immobilizzato']).every((x) => x === 0));
  assert.equal(movimento(['immobilizzato']).passo.effettivo, null); // nessun movimento
  assert.deepEqual([delta(['rallentato'], 'Difese'), delta(['rallentato'], 'Medicina')], [-2, 0]);
  assert.equal(movimento(['rallentato']).passo.effettivo, 3);
  assert.deepEqual([delta(['incendiato'], 'Cultura'), delta(['incendiato'], 'Difese')], [-2, -2]);
  assert.ok(deltaPs(['incendiato']).every((x) => x === 0));
  assert.equal(stato('incendiato').periodico.danno, '1d4');
  assert.equal(delta(['terrorizzato'], 'Cultura'), -4);
  assert.ok(deltaPs(['terrorizzato']).every((x) => x === -4));
});

test('Sanguinamento, Stordito, Svenuto: perdita periodica; Azioni; Svenuto cade A Terra', () => {
  assert.equal(stato('sanguinamento').periodico.non_si_somma, 'si usa il valore più alto');
  assert.equal(durataStato(stato('sanguinamento')), null);
  assert.equal(stato('stordito').azioni.principali, 0);
  assert.deepEqual(statiConImplicati(['svenuto'], dati).sort(), ['a-terra', 'svenuto']);
  assert.equal(delta(['svenuto'], 'Difese'), -4); // A Terra
  // A Terra e Svenuto insieme: A Terra una volta sola
  assert.equal(delta(['svenuto', 'a-terra'], 'Difese'), -4);
  assert.equal(stato('svenuto').azioni.movimento, 0);
});

test('A.119 Ammalato: sei intensità, a tutte le Prove di Abilità (attacchi e Difese), mai alle Prove Salvezza', () => {
  const valori = [-1, -2, -4, -6, -8, -10];
  assert.deepEqual(stato('ammalato').intensita.valori, valori);
  valori.forEach((v, k) => {
    const extra = { intensitaStati: { ammalato: k + 1 } };
    assert.equal(delta(['ammalato'], 'Cultura', extra), v, `intensità ${k + 1}`);
    assert.equal(delta(['ammalato'], 'Difese', extra), v);
    assert.equal(delta(['ammalato'], 'Armi da mischia', extra), v);
    assert.ok(deltaPs(['ammalato'], extra).every((x) => x === 0));
  });
  // senza intensità scelta: la prima; l'etichetta dice intensità e penalità
  assert.equal(delta(['ammalato'], 'Cultura'), -1);
  assert.deepEqual(intensitaStato(stato('ammalato'), { ammalato: 3 }), { livello: 3, valore: -4, etichetta: 'Ammalato 3 — penalità −4' });
  assert.deepEqual(condizioniAttive(sessione({ statiAttivi: ['ammalato'], intensitaStati: { ammalato: 3 } }), dati).map((c) => c.etichetta), ['Ammalato 3 — penalità −4']);
  // cambiare intensità sostituisce: da 3 a 5 vale −8, non −12
  assert.equal(delta(['ammalato'], 'Cultura', { intensitaStati: { ammalato: 5 } }), -8);
  // l'arma in mano (attacco) e la Parata penalizzate
  const t = scheda(sessione({ statiAttivi: ['ammalato'], intensitaStati: { ammalato: 3 } })).equipaggiamento.armi[0];
  assert.equal(t.vaEffettivo, t.va - 4);
  // niente durata generica di 1+1d3 Round
  assert.equal(durataStato(stato('ammalato')), null);
  // la sessione tiene l'intensità solo degli Stati attivi
  const m = massimiSessione(RIPOSO, CREAZIONE, dati);
  assert.deepEqual(allineaSessione({ ...inizializzaSessione(m), statiAttivi: ['ammalato'], intensitaStati: { ammalato: 4 } }, m).intensitaStati, { ammalato: 4 });
  assert.equal('intensitaStati' in allineaSessione({ ...inizializzaSessione(m), intensitaStati: { ammalato: 4 } }, m), false);
});

const NEMICO = { id: 'n1', tipo: 'nemico', nome: 'Predone', lato: 'nemici', stati: [], pv: { attuali: 10, massimo: 10 }, scheda: { difese: 10, ar: { totale: 2 }, attacchi: [{ nome: 'Machete', tipo: 'ravvicinato', va: 12, danno: '1d8', natura: 'Naturale', portata_q: 1 }] } };

test('nemico Ammalato e A Terra: penalità all’attacco e alle Difese; l’intensità sostituisce; spento si toglie', () => {
  let s = { partecipanti: [NEMICO], durate: [], registro: [], round: 1 };
  s = cambiaStatoNemico(s, 'n1', stato('ammalato'), true);
  s = cambiaIntensitaNemico(s, 'n1', stato('ammalato'), 3);
  let p = s.partecipanti[0];
  assert.deepEqual(p.intensita, { ammalato: 3 });
  assert.match(s.registro.at(-1).testo, /Ammalato 3 — penalità −4/);
  assert.equal(conStatiNemico(armaDaAttacco(NEMICO.scheda.attacchi[0], 'x', dati), p, dati).va, 8);
  assert.equal(difeseNemico(p, dati).valore, 6);
  assert.equal(calcolaAttaccoNemico(p, 0, {}, dati).risultato.va_finale, 8);
  // cambio d'intensità: sostituisce
  s = cambiaIntensitaNemico(s, 'n1', stato('ammalato'), 5);
  assert.equal(difeseNemico(s.partecipanti[0], dati).valore, 2);
  assert.throws(() => cambiaIntensitaNemico(s, 'n1', stato('ammalato'), 7));
  // A Terra in più: −4 al Machete e alle Difese, una volta sola
  s = cambiaStatoNemico(s, 'n1', stato('a-terra'), true);
  p = s.partecipanti[0];
  assert.equal(conStatiNemico(armaDaAttacco(NEMICO.scheda.attacchi[0], 'x', dati), p, dati).va, 12 - 8 - 4);
  assert.deepEqual(penalitaStatiAbilita(p.stati, p.intensita, 'Difese', dati).voci.map((v) => v.etichetta).sort(), ['A Terra', 'Ammalato 5 — penalità −8']);
  // spento Ammalato: via anche l'intensità
  s = cambiaStatoNemico(s, 'n1', stato('ammalato'), false);
  assert.equal(s.partecipanti[0].intensita, undefined);
});

test('validatore: intensità, sintesi e Stati implicati', () => {
  const d = copia(dati);
  const a = d.regole.stati.elenco.find((s) => s.id === 'ammalato');
  a.intensita.valori = [1, -2];
  a.intensita.etichetta = 'Ammalato';
  d.regole.stati.elenco.find((s) => s.id === 'svenuto').implica = ['caduto'];
  const e = validaDati(d).map((x) => JSON.stringify(x));
  assert.ok(e.some((x) => /intensita\.valori/.test(x)));
  assert.ok(e.some((x) => /intensita\.etichetta/.test(x)));
  assert.ok(e.some((x) => /caduto.{0,4} non è uno Stato/.test(x)));
});
