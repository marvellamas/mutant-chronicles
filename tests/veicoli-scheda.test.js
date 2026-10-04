// Veicoli, lotto 3: i mezzi nella scheda del personaggio (scelte.veicoli, decisione provvisoria A.91), tab
// Veicoli e foglio Veicoli della SS. Motore in src/veicoli.js; qui aggiunta e rimozione, colpo con
// localizzazione e cambio di stato, riparazione, Pilotare del conducente, stampa con 0, 1 e 2 veicoli, e
// i personaggi senza veicoli identici a prima.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nuovoVeicolo, normalizzaVeicoli, colpisciVeicolo, applicaRiparazione, vistaVeicoloPersonaggio,
  pilotareDelPersonaggio, montaRicambio, schedaManuale,
} from '../src/veicoli.js';
import { normalizza, serializza, deserializza, applicaModifica } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { preparaStampa, preparaTab } from '../src/stampa.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const scout = () => nuovoVeicolo('asa-scout-mk4', dati, { uid: 'v1' });

test('aggiunta e rimozione: catalogo e scritto a mano, più veicoli, nome, salvataggio e rilettura', () => {
  const a = nuovoVeicolo('autovettura-civile', dati, { uid: 'a', nome: 'La Grigia' });
  assert.equal(a.nome, 'La Grigia');
  assert.deepEqual(a.pi, { corpo: 12, propulsione: 8, motore: 8 });
  assert.deepEqual(a.nec, { lx: 50000 });
  const s = scout();
  assert.equal(s.nome, 'ASA Scout MK4');
  assert.deepEqual(s.rinforzi['copriruote-petra'], { montati: [3, 3, 3, 3], ricambi: [3, 3] });
  const m = nuovoVeicolo({ nome: 'Moto', mov_q: 50, man: 5, ar: { totale: 1 }, pi: { corpo: 4, propulsione: 3, motore: 0 } }, dati, { uid: 'm' });
  assert.equal(m.scheda.man, 2, 'MAN riportato nelle fasce del manuale');
  assert.equal(m.scheda.pi.motore, 1, 'almeno 1 PI per struttura');
  assert.equal(schedaManuale({}, dati).manuale, true);

  const { scelte } = applicaModifica(copia(MISHIMA_AGENTE), { veicoli: [a, s, m] }, dati);
  assert.equal(scelte.veicoli.length, 3);
  const riletto = deserializza(serializza(scelte, {}));
  const { scelte: dopo } = normalizza(riletto.scelte ?? riletto.creazione ?? riletto, dati);
  assert.deepEqual(dopo.veicoli, scelte.veicoli);
  // «Rimuovi»: la lista senza il mezzo; a lista vuota il campo non si scrive più
  const senza = applicaModifica(scelte, { veicoli: scelte.veicoli.filter((v) => v.uid !== 'a') }, dati).scelte;
  assert.deepEqual(senza.veicoli.map((v) => v.uid), ['v1', 'm']);
  const vuoto = applicaModifica(scelte, { veicoli: [] }, dati).scelte;
  assert.equal('veicoli' in JSON.parse(serializza(vuoto, {})).scelte, false);
});

test('profilo sparito dal catalogo: il mezzo resta nel file con un avviso', () => {
  const avvisi = [];
  const out = normalizzaVeicoli([{ uid: 'x', profilo: 'non-esiste', nome: 'Vecchio' }], dati, avvisi);
  assert.equal(out.length, 1);
  assert.equal(avvisi.length, 1);
  assert.equal(vistaVeicoloPersonaggio(out[0], dati), null);
});

test('colpo: localizzazione con il d20, Copriruote che assorbono, cambio di stato del Motore', () => {
  // d20 = 5 → Propulsione: 2 applicazioni da 9, AR 4 → 5 + 5 = 1 + 1 PI, PS fallita, Corazzato 1 → 1 PI
  const p = colpisciVeicolo(scout(), { d20: 5 }, { danni: [9, 9], natura: 'Naturale', ps: false }, dati);
  assert.equal(p.localizzazione.bersaglio, 'propulsione');
  assert.equal(p.rinforzi.assorbiti, 1, 'il Copriruote assorbe il PI');
  assert.equal(p.piPersi, 0);
  assert.deepEqual(p.mezzo.rinforzi['copriruote-petra'].montati, [2, 3, 3, 3]);
  // Motore (selezione accurata): 24 PI; colpi fino a Danneggiato (≤ 1/3 = 8)
  let m = scout();
  let r;
  for (let i = 0; i < 10 && (!r || r.dopo.stato !== 'danneggiato'); i++) {
    r = colpisciVeicolo(m, { struttura: 'motore' }, { danni: [24], natura: 'Naturale', ps: false }, dati);
    m = r.mezzo;
  }
  assert.equal(r.dopo.stato, 'danneggiato');
  assert.ok(m.pi.motore <= 8 && m.pi.motore > 0);
  assert.match(r.avviso, /→ Danneggiato/);
  // d20 = 1 con occupanti esposti: nessun PI, avviso; non esposti: il Motore
  assert.equal(colpisciVeicolo(scout(), { d20: 1 }, { danni: [10] }, dati).occupanti, true);
  assert.equal(colpisciVeicolo(scout(), { d20: 1 }, { danni: [10] }, dati, { occupantiEsposti: false }).localizzazione.bersaglio, 'motore');
  // Etereo: vale solo l'AR magica (0 per lo Scout)
  const e = colpisciVeicolo(scout(), { struttura: 'corpo' }, { danni: [5], natura: 'Etereo', ps: false }, dati);
  assert.equal(e.esito.applicazioni[0].residuo, 5);
  // ricambio dei Copriruote: solo con un pezzo esaurito
  assert.equal(montaRicambio(scout(), 'copriruote-petra'), null);
  const esaurito = { ...scout(), rinforzi: { 'copriruote-petra': { montati: [0, 3, 3, 3], ricambi: [3, 3] } } };
  assert.deepEqual(montaRicambio(esaurito, 'copriruote-petra').rinforzi['copriruote-petra'], { montati: [3, 3, 3, 3], ricambi: [3] });
});

test('riparazione: esito, capacità, costo dei ricambi o «da definire»', () => {
  const m = { ...scout(), pi: { corpo: 60, propulsione: 36, motore: 6 } };
  const { mezzo, riparazione: r } = applicaRiparazione(m, 'motore', 'magistrale', dati, { capacita: ['Meccanico di Bordo'] });
  assert.equal(mezzo.pi.motore, 8);
  assert.equal(r.minuti, 30);
  assert.equal(r.va, 2);
  assert.equal(r.costoDaDefinire, true, 'lo Scout non ha i costi per PI (A.101)');
  const a = nuovoVeicolo('autovettura-civile', dati, { uid: 'a' });
  const ra = applicaRiparazione({ ...a, pi: { ...a.pi, corpo: 5 } }, 'corpo', 'successo', dati).riparazione;
  assert.equal(ra.costoDaDefinire, false);
  assert.equal(ra.recuperati, 1);
  assert.equal(applicaRiparazione({ ...a, pi: { ...a.pi, corpo: 5 } }, 'corpo', 'maldestro', dati).mezzo.pi.corpo, 4);
});

test('Pilotare del conducente: VA personale con la provenienza, MAN, andatura e danni', () => {
  const tab = preparaTab({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const abilita = tab.tab.find((t) => t.id === 'abilita').dati.categorie.flatMap((c) => c.abilita);
  const pil = pilotareDelPersonaggio(abilita, dati);
  assert.equal(pil.va, 5);
  assert.ok(pil.provenienza.righe.length >= 2);
  // a riposo (stampa): la provenienza si ricostruisce dalla scheda
  const s = calcolaScheda(MISHIMA_AGENTE, dati);
  assert.equal(pilotareDelPersonaggio(s.abilita, dati, { scheda: s }).provenienza.totale, 5);
  const m = { ...scout(), conducente: true, andatura: 'veloce', pi: { corpo: 60, propulsione: 36, motore: 8 } };
  const v = vistaVeicoloPersonaggio(m, dati, { pilotare: pil });
  // 5 + MAN dello Scout + andatura veloce + Motore Danneggiato
  const atteso = 5 + (v.profilo.man ?? 0) + dati.veicoli.andature.elenco.find((a) => a.id === 'veloce').pilotare + v.vista.penalitaStrutturale;
  assert.equal(v.pilotare.valore, atteso);
  assert.deepEqual(v.pilotare.provenienza.righe[0].dettaglio, pil.provenienza.righe);
  assert.equal(vistaVeicoloPersonaggio({ ...m, conducente: false }, dati, { pilotare: pil }).pilotare, null);
});

test('stampa: nessun foglio Veicoli senza veicoli, un foglio con una pagina per veicolo', () => {
  const zero = preparaStampa({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  assert.equal(zero.fogli.some((f) => f.id === 'veicoli'), false);
  const uno = preparaStampa({ creazione: { ...MISHIMA_AGENTE, veicoli: [scout()] }, livelli: [] }, dati);
  const f1 = uno.fogli.find((f) => f.id === 'veicoli');
  assert.equal(f1.dati.veicoli.length, 1);
  assert.equal(f1.numero, zero.fogli.length + 1, 'per ultimo, gli altri fogli non cambiano numero');
  assert.deepEqual(uno.fogli.filter((f) => f.id !== 'veicoli').map((f) => [f.id, f.numero]), zero.fogli.map((f) => [f.id, f.numero]));
  const due = preparaStampa({ creazione: { ...MISHIMA_AGENTE, veicoli: [scout(), nuovoVeicolo('autovettura-civile', dati, { uid: 'a' })] }, livelli: [] }, dati);
  const f2 = due.fogli.find((f) => f.id === 'veicoli');
  assert.deepEqual(f2.dati.veicoli.map((v) => v.nome), ['ASA Scout MK4', 'Autovettura civile']);
  assert.deepEqual(f2.dati.veicoli[0].strutture.map((s) => [s.struttura, s.pi, s.massimi]), [['corpo', 60, 60], ['propulsione', 36, 36], ['motore', 24, 24]]);
});

test('migrazione: un personaggio senza veicoli si salva e si calcola come prima', () => {
  const prima = serializza(MISHIMA_AGENTE, {});
  const { scelte } = normalizza(copia(MISHIMA_AGENTE), dati);
  assert.deepEqual(scelte.veicoli, []);
  const dopo = serializza(scelte, {});
  assert.equal(dopo.includes('veicoli'), false);
  assert.equal(dopo, prima, 'file identico a quello di prima');
  assert.equal(prima.includes('"veicoli"'), false);
  // i valori calcolati non dipendono dai veicoli
  const conVeicolo = calcolaScheda({ ...MISHIMA_AGENTE, veicoli: [scout()] }, dati);
  const senza = calcolaScheda(MISHIMA_AGENTE, dati);
  assert.deepEqual(conVeicolo.abilita, senza.abilita);
  assert.deepEqual(conVeicolo.salvezze, senza.salvezze);
  assert.deepEqual(conVeicolo.carico, senza.carico);
});
