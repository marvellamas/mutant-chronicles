import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 228 — A.294 (E&L del 19/11/2026): l'Elmetto Recon ASA.
//  - indossato: visione notturna, sensori (+1 VA a Percezione per vista o udito), allerta tattica (+1 Iniziativa),
//    filtro respiratorio (+2 alla PS Tempra contro veleni e agenti patogeni inalati, solo per quell'uso);
//  - nello zaino: nessun beneficio; i bonus si applicano una volta sola;
//  - le funzioni sono proprietà del modello storico ASA, distinte da quelle del SIA Recon (voce a parte, A.295);
//  - l'elmetto già assegnato resta com'è (uid, stato, Integrità): il lotto non tocca nessun file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { normalizza } from '../src/character.js';
import { massimiSessione, inizializzaSessione, allineaSessione } from '../src/sessione.js';
import { valoriTavolo } from '../src/condizioni.js';
import { catalogo } from '../src/equipaggiamento.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const RIF = 'elmetti:elmetto-asa-recon';
const sette = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json').map((f) => JSON.parse(readFileSync(new URL(f, FIX), 'utf8')));

function conElmetto(o, stato, { doppio = false } = {}) {
  const creazione = normalizza(structuredClone(o.scelte), dati).scelte;
  const eq = (creazione.equipaggiamento ??= []);
  const voce = eq.find((v) => v.rif === RIF);
  if (voce) voce.stato = stato;
  else eq.push({ uid: 'elm228', rif: RIF, stato, quantita: 1, note: '' });
  if (doppio) eq.push({ uid: 'elm228b', rif: RIF, stato, quantita: 1, note: '' });
  const pers = { creazione, livelli: o.livelli ?? [], sessione: o.sessione };
  const m = massimiSessione(calcolaScheda(pers, dati), creazione, dati);
  const ses = allineaSessione(inizializzaSessione(m), m);
  const scheda = calcolaScheda({ ...pers, sessione: ses }, dati);
  return { scheda, tavolo: valoriTavolo(scheda, ses, dati) };
}
const daElmetto = (scheda) => scheda.equipaggiamento.effettiOggetti.filter((e) => e.oggetto === 'Elmetto Recon ASA');

test('le funzioni nel catalogo sono quelle della risposta: visione notturna, sensori +1, allerta +1, filtro +2 (solo inalati)', () => {
  const e = cat.perRif.get(RIF);
  assert.deepEqual(e.proprieta.map((x) => x.nome), ['Visione notturna', 'Sensori 1 a vista e udito', 'Filtro respiratorio 2', 'Allerta tattica 1']);
  const per = (b) => e.effetti.find((x) => x.beneficio === b);
  assert.equal(per('sensori_vista_udito').valore, 1);
  assert.equal(per('sensori_vista_udito').abilita, 'Percezione');
  assert.equal(per('allerta_tattica').valore, 1);
  assert.equal(per('allerta_tattica').tipo, 'iniziativa');
  assert.equal(per('filtro_respiratorio').valore, 2);
  assert.equal(per('filtro_respiratorio').salvezza, 'tempra');
  assert.equal(per('filtro_respiratorio').ambito, 'uso_specifico', 'il +2 non entra nel valore generale della Tempra: vale solo per quell’uso');
  assert.match(per('filtro_respiratorio').uso, /veleni e agenti patogeni inalati/);
  assert.match(per('filtro_respiratorio').condizione, /maschera/);
});

test('INDOSSATO: +1 Iniziativa; i due effetti d’uso (Percezione, Tempra inalati) sono raccolti a parte, non nel valore generale', () => {
  for (const o of sette) {
    const zaino = conElmetto(o, 'zaino');
    const ind = conElmetto(o, 'indossata');
    const nome = o.scelte.nome;
    assert.equal(ind.tavolo.iniziativa.effettivo, zaino.tavolo.iniziativa.effettivo + 1, `${nome}: +1 Iniziativa una volta sola`);
    assert.equal(ind.scheda.salvezze.tempra.totale, zaino.scheda.salvezze.tempra.totale, `${nome}: la Tempra generale non cambia (+2 solo contro gli inalati)`);
    const eff = daElmetto(ind.scheda);
    assert.deepEqual(eff.map((e) => e.beneficio).sort(), ['allerta_tattica', 'filtro_respiratorio', 'sensori_vista_udito'], `${nome}: i tre effetti, e niente altro`);
    assert.equal(eff.find((e) => e.beneficio === 'filtro_respiratorio').ambito, 'uso_specifico');
    assert.equal(eff.find((e) => e.beneficio === 'sensori_vista_udito').ambito, 'situazionale');
  }
});

test('NELLO ZAINO: nessun beneficio — né Iniziativa, né sensori, né filtro', () => {
  for (const o of sette) {
    const zaino = conElmetto(o, 'zaino');
    assert.deepEqual(daElmetto(zaino.scheda), [], `${o.scelte.nome}: nello zaino l’elmetto non dà effetti`);
    assert.ok(!zaino.tavolo.iniziativa.scomposizione.some((r) => /Elmetto Recon/.test(r.etichetta)), `${o.scelte.nome}: nessuna riga dell’elmetto nell’Iniziativa`);
  }
});

test('UNA VOLTA SOLA: due Elmetti Recon indossati non danno +2 all’Iniziativa', () => {
  const o = sette[0];
  const uno = conElmetto(o, 'indossata');
  const due = conElmetto(o, 'indossata', { doppio: true });
  assert.equal(due.tavolo.iniziativa.effettivo, uno.tavolo.iniziativa.effettivo, 'i bonus dello stesso beneficio non si sommano (§7.21.1)');
});

test('mutante: se il catalogo desse +2 all’Allerta tattica, il test dell’Iniziativa lo vede', () => {
  const copia = structuredClone(dati);
  const e = copia.equipaggiamento.file.elmetti.oggetti.find((x) => x.id === 'elmetto-asa-recon');
  e.effetti.find((x) => x.beneficio === 'allerta_tattica').valore = 2;
  const o = sette[0];
  const creazione = normalizza(structuredClone(o.scelte), copia).scelte;
  const el = creazione.equipaggiamento.find((v) => v.rif === RIF);
  if (el) el.stato = 'indossata';
  const pers = { creazione, livelli: o.livelli ?? [], sessione: o.sessione };
  const m = massimiSessione(calcolaScheda(pers, copia), creazione, copia);
  const ses = allineaSessione(inizializzaSessione(m), m);
  const t = valoriTavolo(calcolaScheda({ ...pers, sessione: ses }, copia), ses, copia);
  assert.notEqual(t.iniziativa.effettivo, conElmetto(o, 'indossata').tavolo.iniziativa.effettivo);
});
