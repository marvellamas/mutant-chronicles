import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 209 (17/11/2026), parte C — la motocicletta e il furgone civili (Veicoli 0.19 §12 e §13).
//
// Le prove che contano:
//  1. i numeri dei due profili sono quelli delle tabelle del manuale, ricontrollati contro il testo salvato (non
//     contro i numeri scritti nel generatore): se qualcuno cambia un valore, o il manuale cambia, il test lo dice;
//  2. si possono aggiungere a un PG, usare in una tratta, chiudere la giornata, farsi colpire e riparare;
//  3. la Neverlost, lo Scout e l'autovettura non sono cambiati (lo dice il confronto riga per riga 0.10 / 0.19 e qui
//     l'impronta del loro profilo nei dati).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { datiReali } from './helpers.js';
import { testoEdizione } from '../tools/manuali.mjs';
import {
  profiloVeicolo, profiliCreabili, nuovoVeicolo, vistaVeicolo, registraViaggio, chiudiGiornata, ricaricaEnergia,
  colpisciVeicolo, normalizzaVeicoli, movimentoMassimo, soglieStruttura, struttureVeicolo, statoStruttura,
} from '../src/veicoli.js';

const { dati } = await datiReali();
const TESTO = testoEdizione('veicoli', '0.19');
const sez = (da, a) => { const i = TESTO.indexOf(da); const j = TESTO.indexOf(a, i + 1); assert.ok(i >= 0 && j > i, `sezione «${da}» non trovata nel testo 0.19`); return TESTO.slice(i, j); };
const CAP12 = sez('# **12 Motocicletta civile**', '# **13 Furgone civile**');
const CAP13 = sez('# **13 Furgone civile**', '# **Tavole della Neverlost');
const celle = (testo) => testo.replace(/\\/g, '').replace(/\*\*/g, '');
const riga = (testo, etichetta) => {
  const l = celle(testo).split('\n').find((x) => x.startsWith(`| ${etichetta}`));
  assert.ok(l, `riga «${etichetta}» non trovata nella tabella`);
  return l.split('|').slice(2, -1).map((x) => x.trim()).join(' ');
};

test('Veicoli 0.19: il testo salvato è la 0.19 e ha i capitoli 12 e 13', () => {
  assert.match(TESTO, /EDIZIONE 0\.19/);
  assert.ok(CAP12.length > 3000 && CAP13.length > 3000);
});

test('motocicletta e furgone: ogni numero del profilo è quello della tabella del manuale', () => {
  const casi = [
    { id: 'motocicletta-civile', t: CAP12, posti: 2, ingombro: '2 × 1', massa: 250, carico: 200, mov: 50, man: 2, pi: [8, 6, 6], prezzo: 8000, kmCarica: 100, ricambi: [100, 50, 150], tutto: 2000 },
    { id: 'furgone-civile', t: CAP13, posti: 3, ingombro: '4 × 2', massa: 2500, carico: 1500, mov: 30, man: -1, pi: [20, 12, 12], prezzo: 35000, kmCarica: 50, ricambi: [250, 100, 250], tutto: 9200 },
  ];
  for (const c of casi) {
    const p = profiloVeicolo(c.id, dati);
    assert.ok(p, `${c.id} non nel catalogo`);
    assert.equal(p.fonte_edizione, 'Veicoli 0.19');
    assert.match(riga(c.t, 'Posti complessivi'), new RegExp(`^${c.posti};`));
    assert.equal(p.equipaggio.posti, c.posti);
    assert.ok(riga(c.t, 'Dimensioni').includes(c.ingombro.replace(' ', ' ')) || riga(c.t, 'Dimensioni').replace(/\s/g, ' ').includes(c.ingombro), 'ingombro');
    assert.equal(p.dimensioni.ingombro_q, c.ingombro);
    assert.match(riga(c.t, 'Massa a vuoto'), new RegExp(`^${String(c.massa).replace(/(\d)(?=(\d{3})+$)/g, '$1.?')}\\s*kg`));
    assert.equal(p.massa_kg, c.massa);
    assert.match(riga(c.t, 'Carico utile'), new RegExp(`^${String(c.carico).replace(/(\d)(?=(\d{3})+$)/g, '$1.?')}\\s*kg`));
    assert.equal(p.carico_kg, c.carico);
    const movMan = riga(c.t, 'MOV e MAN');
    assert.match(movMan, new RegExp(`^${c.mov} Q; MAN ${c.man >= 0 ? '\\+' : '−'}${Math.abs(c.man)}`));
    assert.deepEqual([p.mov_q, p.man], [c.mov, c.man]);
    assert.match(riga(c.t, 'PI Corpo'), new RegExp(`^${c.pi.join(' / ')}`));
    assert.deepEqual([p.pi.corpo, p.pi.propulsione, p.pi.motore], c.pi);
    assert.match(riga(c.t, 'Prezzo completo'), new RegExp(`^${String(c.prezzo).replace(/(\d)(?=(\d{3})+$)/g, '$1.?')} cr`));
    assert.equal(p.prezzo_cr, c.prezzo);
    assert.match(riga(c.t, 'Autonomia nominale'), new RegExp(`${c.kmCarica} km per carica`));
    assert.equal(p.alimentazione.km_per_carica, c.kmCarica);
    assert.equal(p.alimentazione.autonomia_km, c.kmCarica * 10);
    assert.deepEqual([p.ricambi_cr_per_pi.corpo, p.ricambi_cr_per_pi.propulsione, p.ricambi_cr_per_pi.motore], c.ricambi);
    // il totale che il manuale scrive per riparare tutto da 0 è la somma PI × cr per PI
    assert.equal(p.pi.corpo * c.ricambi[0] + p.pi.propulsione * c.ricambi[1] + p.pi.motore * c.ricambi[2], c.tutto);
    assert.match(celle(c.t), new RegExp(`${String(c.tutto).replace(/(\d)(?=(\d{3})+$)/g, '$1.?')} cr di materiali`));
    assert.equal(p.reperibilita, 'Comune');
    assert.equal(p.qualita, 'Comune');
    assert.equal(p.ps_integrita, 10);
    assert.deepEqual([p.ar.totale, p.ar.magica, p.corazzato], [1, 0, 0]);
  }
  // il furgone dichiara anche il volume del vano merci
  assert.equal(profiloVeicolo('furgone-civile', dati).volume_utile_m3, 10);
  assert.match(riga(CAP13, 'Volume utile'), /^10 m³/);
});

test('le soglie delle strutture dei due mezzi sono quelle degli stati scritti nel manuale', () => {
  // moto: Corpo 8 → Operativo 6–7, Colpito 3–5, Danneggiato 1–2; furgone: Corpo 20 → Operativo 14–19, Colpito 7–13, Danneggiato 1–6
  const atteso = {
    'motocicletta-civile': { corpo: { operativo: [6, 7], colpito: [3, 5], danneggiato: [1, 2] }, propulsione: { operativo: [5, 5], colpito: [3, 4], danneggiato: [1, 2] } },
    'furgone-civile': { corpo: { operativo: [14, 19], colpito: [7, 13], danneggiato: [1, 6] }, propulsione: { operativo: [9, 11], colpito: [5, 8], danneggiato: [1, 4] } },
  };
  for (const [id, per] of Object.entries(atteso)) {
    const p = profiloVeicolo(id, dati);
    for (const [s, stati] of Object.entries(per)) {
      for (const [stato, [da, a]] of Object.entries(stati)) {
        for (const pi of [da, a]) assert.equal(statoStruttura(s, pi, p.pi[s], dati).stato, stato, `${id} ${s} a ${pi} PI deve essere «${stato}»`);
      }
      assert.equal(statoStruttura(s, p.pi[s], p.pi[s], dati).stato, 'integro');
      assert.equal(statoStruttura(s, 0, p.pi[s], dati).stato, 'rotto');
    }
  }
});

test('la motocicletta e il furgone si possono aggiungere a un PG, usare in una tratta e chiudere la giornata', () => {
  const creabili = profiliCreabili(dati, []).map((p) => p.id);
  assert.ok(creabili.includes('motocicletta-civile') && creabili.includes('furgone-civile'), 'devono essere fra i mezzi che si aggiungono');
  for (const [id, km, caricheSpese] of [['motocicletta-civile', 250, 3], ['furgone-civile', 120, 3]]) {
    const m = nuovoVeicolo(id, dati, { uid: `prova-${id}` });
    assert.ok(m, `${id}: nuovoVeicolo non lo crea`);
    const [n] = normalizzaVeicoli([m], dati);
    assert.equal(n.profilo, id);
    assert.equal(n.energia.rosso, 10, 'la prima CEC è inclusa e piena');
    // una tratta: i km si sommano, le cariche si tolgono UNA volta alla chiusura della giornata
    const t1 = registraViaggio(n, km / 2, dati);
    assert.deepEqual(t1.avvisi, [], `${id}: nessun avviso sulla prima tratta`);
    assert.equal(t1.mezzo.energia.rosso, 10, 'una tratta da sola non toglie cariche');
    const t2 = registraViaggio(t1.mezzo, km / 2, dati);
    assert.equal(t2.mezzo.energia.km_giornata, km);
    const g = chiudiGiornata(t2.mezzo, dati);
    assert.deepEqual(g.avvisi, []);
    assert.equal(g.mezzo.energia.rosso, 10 - caricheSpese, `${id}: ${km} km → ${caricheSpese} cariche, arrotondando una sola volta`);
    assert.equal(g.mezzo.energia.km_giornata, 0);
    // ricarica alla stazione: 10 cr a carica, sei minuti per carica
    const r = ricaricaEnergia(g.mezzo, dati);
    assert.equal(r.mezzo.energia.rosso, 10);
    assert.equal(r.costo, caricheSpese * 10);
    assert.equal(r.minuti, caricheSpese * 6);
    // la vista si costruisce, con le tre strutture e il movimento dell'andatura
    const v = vistaVeicolo(g.mezzo, dati, { pilotareVa: 12 });
    assert.ok(v && v.strutture.length === 3, `${id}: la vista ha le tre strutture`);
  }
  // 100 km a carica per la moto, 50 per il furgone: 250 km sono 3 cariche, 120 km sono 3 cariche
  const mov = (id, andatura) => movimentoMassimo(profiloVeicolo(id, dati), andatura, dati).q;
  assert.deepEqual(['controllata', 'veloce', 'massima'].map((a) => mov('motocicletta-civile', a)), [50, 100, 150]);
  assert.deepEqual(['controllata', 'veloce', 'massima'].map((a) => mov('furgone-civile', a)), [30, 60, 90]);
});

test('un colpo sulla motocicletta si risolve con le sue strutture, e il furgone con le sue', () => {
  const prova = (id, struttura) => {
    const m = normalizzaVeicoli([nuovoVeicolo(id, dati, { uid: `colpo-${id}` })], dati)[0];
    const p = profiloVeicolo(id, dati);
    const r = colpisciVeicolo(m, { struttura }, { danni: [30], magistrale: false }, dati);
    assert.ok(!r.occupanti, 'il colpo va alla struttura scelta');
    assert.ok(r.piPersi > 0, `${id}: la struttura perde PI`);
    assert.equal(r.mezzo.pi[struttura], p.pi[struttura] - r.piPersi);
    for (const s of struttureVeicolo(dati).filter((x) => x !== struttura)) assert.equal(r.mezzo.pi[s], p.pi[s], 'le altre strutture non si toccano');
    return r;
  };
  const moto = prova('motocicletta-civile', 'corpo');
  const furgone = prova('furgone-civile', 'corpo');
  // con lo stesso colpo, la moto (8 PI) è messa peggio del furgone (20 PI): le soglie sono delle strutture, non del danno
  assert.ok(moto.dopo.stato !== furgone.dopo.stato || moto.dopo.pi < furgone.dopo.pi);
  assert.equal(struttureVeicolo(dati).length, 3);
});

test('la Neverlost, lo Scout e l\'autovettura non sono cambiati dal lotto', () => {
  // il profilo non cambia da quando il lotto 158/173/149 l'ha scritto: se cambia, il lotto 209 ha toccato ciò che non doveva
  // lotto 210: i settori di tiro delle armi di bordo sono ora strutturati (e quello dello Scout è a 120°, A.280): quelle chiavi non fanno
  // parte del confronto. Tutto il resto del profilo — PI, MOV, AR, prezzi, munizioni, riparazioni — è quello di prima del 209.
  const CHIAVI = ['arco', 'arco_di_tiro', 'arco_di_tiro_precedente', 'postazione', 'smontabile', 'schermo'];
  const pulito = (p) => ({ ...p, armi: (p.armi ?? []).map((a) => { const x = { ...a }; for (const k of CHIAVI) delete x[k]; return x; }) });
  const imp = (id) => createHash('sha1').update(JSON.stringify(pulito(profiloVeicolo(id, dati)))).digest('hex').slice(0, 10);
  const git = JSON.parse(readFileSync(new URL('./fixtures/veicoli-profili-209.json', import.meta.url), 'utf8'));
  for (const id of ['neverlost', 'asa-scout-mk4', 'autovettura-civile']) assert.equal(imp(id), git[id], `${id}: il profilo è cambiato`);
});
