// Lotto 153 (01/11/2026): i completamenti dell'energia usciti con il registro NEC 2.9–2.11, gli Armamenti 0.70–0.74 e
// l'Equipaggiamento 0.24–0.30 (riepilogo «Energia per l'app» 1.0 del 31/10). Valori dal manuale; nessun dato inventato.
import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { catalogo, riserveNec } from '../src/equipaggiamento.js';
import { massimiSessione, allineaSessione, variaNec } from '../src/sessione.js';
import { calcolaScheda } from '../src/calc.js';
import { testoDurata } from '../src/trasformatori.js';
import { validaDati } from '../src/validate.js';
import { contenutoTooltip } from '../src/descrizioni.js';
import { acquistabili } from '../src/dotazioni.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (rif) => cat.perRif.get(rif);
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'zaino', quantita: 1, note: '', ...extra });
const sessione = (equipaggiamento, nec = {}) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  return { m, s: allineaSessione({ nec }, m) };
};
const T = dati.regole.nec.trasformatori.minuti_per_carica;

const IAS = ['ias3100-generatore-blink', 'ias3200-imbracatura-antigravita', 'ias3300-mirrorshard', 'ias3400-disturbatore-metafisico', 'smorzatore-acustico-silent'];

test('IAS, Smorzatore Silent e RF366: pacco da due NEC Blu 10, 20 cariche, 300 g, ricambio carico 800 cr (era 1.000)', () => {
  const pacco = r('nec:pacco-20-blu');
  assert.deepEqual([pacco.costo, pacco.peso, pacco.nec.capacita_cariche, pacco.ricarica_costo], [800, 0.3, 20, 200]);
  for (const rif of [...IAS.map((id) => `corredi_dispositivi:${id}`), 'unita_robotiche:generatore-di-risonanza-rf366']) {
    const a = r(rif).alimentazione;
    assert.deepEqual([a.nec, a.usi, a.da_definire], ['nec:pacco-20-blu', 20, undefined], rif);
    assert.doesNotMatch(JSON.stringify(r(rif)), /1\.000 cr|costa 1\.000|cella IAS/, `${rif}: il ricambio da 1.000 cr non c’è più`);
  }
  // ricarica da vuoto: 200 cr, 20 ore con il trasformatore personale, 3 ore e 20 con la stazione
  assert.deepEqual([testoDurata(20 * T.portatile), testoDurata(20 * T.industriale)], ['20 ore', '3 ore e 20 minuti']);
});

test('Pacchi dei lanciafiamme (§7.20.6): Gehemmapuker 2.000 cr (era 2.100), 750 g, cinque NEC 10; Purifier NEC 10 + NEC 5, 250 g', () => {
  const g = r('munizioni:pacco-nec-gehemmapuker');
  assert.deepEqual([g.costo, g.peso, g.accumulatore.formato, g.cella.capacita, g.cella.ricarica_costo, g.da_definire], [2000, 0.75, '5 NEC 10', 50, 500, undefined]);
  assert.match(g.note_manuale, /Sostituire un pacco compatibile pronto richiede 1 AzP, entrambe le mani/);
  // 50 cariche: 50 ore con il personale, 8 ore e 20 minuti con l'industriale
  assert.deepEqual([testoDurata(50 * T.portatile), testoDurata(50 * T.industriale)], ['50 ore', '8 ore e 20 minuti']);
  assert.match(g.note_manuale, /cinquanta ore personale o otto ore e venti minuti industriale/);
  const p = r('munizioni:pacco-nec-purifier');
  assert.deepEqual([p.costo, p.peso, p.accumulatore.formato, p.cella.capacita, p.cella.ricarica_costo, p.da_definire], [600, 0.25, 'NEC 10 + NEC 5', 15, 150, undefined]);
});

test('Esoscheletri, servoarmature e robot: NEC Rosso 10 o CEC Rossa, 10 o 5 ore (erano 8 e 6), una carica per impiego', () => {
  const casi = [
    ['armature_corporative:juggernaut-xo-102-steel-strider', 'nec:cec-rosso', 10], ['armature_corporative:vulkan', 'nec:cec-rosso', 10],
    ['unita_robotiche:cuirassier-attila', 'nec:cec-rosso', 10], ['corredi_dispositivi:ape-capitol', 'nec:cec-rosso', 5],
    ['armature_corporative:mk-iv-felis-pattern-dei-golden-lions', 'nec:nec-rosso-10', 10], ['armature_corporative:powersuit', 'nec:nec-rosso-10', 10],
    ['corredi_dispositivi:iron-mastiff', 'nec:nec-rosso-10', 10], ['armature_corporative:shoa-ace-custom', 'nec:nec-rosso-10', 5], ['armature_corporative:demonhunter', 'nec:nec-rosso-10', 5],
  ];
  for (const [rif, nec, ore] of casi) {
    const a = r(rif).alimentazione;
    assert.deepEqual([a.nec, a.usi], [nec, 10], rif);
    assert.match(a.descrizione, ore === 10 ? /una carica per impiego fino a un’ora; dieci ore massime/ : /una carica per impiego fino a mezz’ora; cinque ore massime/, rif);
    assert.match(a.unita_usi, ore === 10 ? /un’ora/ : /mezz’ora/, rif);
  }
  // l'APE indossato: un contatore da 10 cariche; un'ora d'impiego ne consuma due (mezz'ora a carica)
  const { m, s } = sessione([voce('a', 'corredi_dispositivi:ape-capitol', { stato: 'indossata' })]);
  assert.equal(s.nec['a#c'], 10);
  assert.equal(variaNec(variaNec(s, 'a#c', -1, m), 'a#c', -1, m).nec['a#c'], 8);
});

test('Esoscheletri salvati in ore (A.193): la frazione delle ore di prima passa alle cariche, senza ripetere', () => {
  // un Vulkan a 4 ore su 8 → metà delle 10 cariche; uno Shoa a 3 ore su 6 → 5 su 10
  const { s } = sessione([voce('v', 'armature_corporative:vulkan', { stato: 'indossata' }), voce('s', 'armature_corporative:shoa-ace-custom', { stato: 'indossata' })], { v: 4, s: 3 });
  assert.deepEqual([s.nec['v#c'], s.nec['s#c']], [5, 5]);
  assert.deepEqual([s.nec.v, s.nec.s], [4, 3], 'il valore di prima resta nel file');
  assert.deepEqual([s.necConvertite['v#c'].esatto, s.necConvertite['v#c'].capacita], [5, 8]);
  // l'Iron Mastiff non aveva una riserva: parte carico, niente da convertire
  assert.equal(riserveNec([voce('i', 'corredi_dispositivi:iron-mastiff')], dati)[0].precedenti, undefined);
});

test('Banshee commerciale (pacco da due NEC Rossi 10, una carica per Round di volo) e Jet-Chute (NEC Rosso 1, una carica per discesa)', () => {
  const b = r('corredi_dispositivi:propulsore-d-assalto-banshee');
  assert.deepEqual([b.costo, b.alimentazione.nec, b.alimentazione.usi], [12000, 'nec:pacco-20-rosso', 20]);
  assert.deepEqual([r('nec:pacco-20-rosso').costo, r('nec:pacco-20-rosso').peso], [800, 0.3]);
  const j = r('corredi_dispositivi:jet-chute-pile-driver');
  assert.deepEqual([j.costo, j.alimentazione.nec, j.alimentazione.usi], [6000, 'nec:nec-rosso-1', 1]);
  assert.deepEqual([r('nec:nec-rosso-1').costo, r('nec:nec-rosso-1').peso], [40, 0.1]);
  const [rb] = riserveNec([voce('b', 'corredi_dispositivi:propulsore-d-assalto-banshee')], dati);
  assert.deepEqual([rb.massimo, rb.unita], [20, 'cariche (Round di volo o sospensione)']);
});

test('Punisher Wächter: la Taglia c’è, «Medio, detto anche Grande» (A.195: una sola categoria, non due varianti)', () => {
  const w = r('scudi:scudo-punisher-wachter');
  assert.equal(w.taglia, 'Medio, detto anche Grande');
  assert.ok(JSON.stringify(contenutoTooltip('oggetto', 'scudi:scudo-punisher-wachter', dati)).includes('Medio, detto anche Grande'));
  assert.equal(cat.oggetti.filter((o) => /w(ä|a)chter/i.test(o.nome)).length, 1, 'una sola voce acquistabile');
});

test('Prezzi nuovi nel catalogo: ricambio IAS (Pacco Blu 20) 800 cr anche fra gli acquisti della creazione, pacco del Gehemmapuker 2.000 cr', () => {
  const lista = acquistabili('Mishima', dati);
  const prezzo = (rif) => lista.find((o) => o.rif === rif)?.costo;
  assert.equal(prezzo('nec:pacco-20-blu'), 800);
  // il pacco del Gehemmapuker (arma Molto rara dell'Alleanza) non è fra gli acquisti della creazione (§2.16): si compra dal catalogo dell'Inventario
  assert.equal(r('munizioni:pacco-nec-gehemmapuker').costo, 2000);
  // il pacco IAS comprato si usa come una riserva da 20 cariche: si toglie una carica
  const { m, s } = sessione([voce('p', 'nec:pacco-20-blu')]);
  assert.equal(variaNec(s, 'p#c', -1, m).nec['p#c'], 19);
});

test('Il validatore controlla ogni voce toccata: un NEC inesistente o un consumo senza unità si segnala con file e chiave', () => {
  assert.deepEqual(validaDati(dati), []);
  const toccate = [
    ['corredi_dispositivi', 'ias3100-generatore-blink'], ['corredi_dispositivi', 'smorzatore-acustico-silent'], ['unita_robotiche', 'generatore-di-risonanza-rf366'],
    ['armature_corporative', 'vulkan'], ['armature_corporative', 'shoa-ace-custom'], ['corredi_dispositivi', 'ape-capitol'], ['unita_robotiche', 'cuirassier-attila'],
    ['corredi_dispositivi', 'iron-mastiff'], ['corredi_dispositivi', 'propulsore-d-assalto-banshee'], ['corredi_dispositivi', 'jet-chute-pile-driver'],
  ];
  for (const [f, id] of toccate) {
    const d = copia(dati);
    d.equipaggiamento.file[f].oggetti.find((o) => o.id === id).alimentazione.nec = 'nec:inesistente';
    const err = validaDati(d);
    assert.ok(err.some((e) => JSON.stringify(e).includes(id)), `${f}:${id} con un NEC inesistente non è segnalato`);
  }
});
