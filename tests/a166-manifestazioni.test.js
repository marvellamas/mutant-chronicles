// A.166 (risposta di Davide approvata il 16/10/2026): manifestazioni della CyberArma. L'Abilità è sempre
// Armi da mischia; dalla forma manifestata dipendono famiglia, Specializzazione pertinente e Manovre.
// Il Custode sceglie la forma; il Tecnomante e gli altri usano quella del progetto (lama lunga).
// Sostituisce l'associazione provvisoria di ogni CyberArma alle Spade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { catalogo } from '../src/equipaggiamento.js';
import { calcolaScheda } from '../src/calc.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { manifestazioniDi, manifestazioneProgetto, manifestazioneAttiva, sceltaLibera, conManifestazione, testoManifestazione } from '../src/manifestazione.js';

const { dati } = await datiReali();
const def = () => catalogo(dati).perRif.get('armi:cyberarma');
const voce = (extra = {}) => ({ uid: 'c1', rif: 'armi:cyberarma', stato: 'impugnata', quantita: 1, ...extra });

test('A.166: le quattro forme con famiglia, Specializzazione e Manovre', () => {
  const b = def().manifestazioni;
  assert.equal(b.abilita, 'Armi da mischia');
  assert.equal(b.progetto, 'lama-lunga');
  assert.deepEqual(b.scelta_libera, ['Custode']);
  assert.equal(b.una_sola_specializzazione, true);
  const per = (id) => b.elenco.find((m) => m.id === id);
  assert.deepEqual([per('lama-lunga').famiglia, per('lama-lunga').specializzazione], ['Spade', 'specializzazione-spade']);
  assert.deepEqual([per('frusta').famiglia, per('frusta').specializzazione], ['Armi flessibili', 'specializzazione-armi-flessibili']);
  assert.deepEqual([per('ascia').famiglia, per('ascia').specializzazione], ['Asce', 'specializzazione-asce']);
  assert.deepEqual([per('lancia').famiglia, per('lancia').specializzazione], ['Armi inastate', 'specializzazione-armi-inastate']);
  // le Manovre sono quelle del modello manifestato (A.166: lama lunga → Affondo e Spazzata)
  assert.deepEqual(per('lama-lunga').manovre, ['Affondo', 'Spazzata']);
  assert.match(per('frusta').nota, /Immobilizzare con la Frusta/);
  // le Specializzazioni citate esistono davvero
  const idSpec = new Set(dati.specializzazioni.specializzazioni.map((s) => s.id));
  for (const m of b.elenco) assert.ok(idSpec.has(m.specializzazione), m.specializzazione);
  // e le famiglie sono quelle del catalogo delle armi
  const famiglie = new Set(catalogo(dati).oggetti.filter((o) => o.tipo === 'arma_ravvicinata').map((o) => o.famiglia));
  for (const m of b.elenco) assert.ok(famiglie.has(m.famiglia), m.famiglia);
});

test('A.166: chi sceglie la forma — il Custode sì, gli altri no', () => {
  assert.equal(sceltaLibera(def(), ['Custode']), true);
  assert.equal(sceltaLibera(def(), ['Tecnomante']), false);
  assert.equal(sceltaLibera(def(), ['Agente', 'Pilota']), false);
  assert.equal(sceltaLibera({}, ['Custode']), false, 'le altre armi non hanno manifestazioni');
  // senza scelta vale il progetto, per tutti
  assert.equal(manifestazioneProgetto(def()).id, 'lama-lunga');
  assert.equal(manifestazioneAttiva(def(), voce(), ['Tecnomante']).id, 'lama-lunga');
  assert.equal(manifestazioneAttiva(def(), voce({ manifestazione: 'frusta' }), ['Custode']).id, 'frusta');
  // una forma sconosciuta non inventa nulla: resta il progetto
  assert.equal(manifestazioneAttiva(def(), voce({ manifestazione: 'spadone-magico' }), ['Custode']).id, 'lama-lunga');
  assert.equal(manifestazioniDi(def()).length, 4);
  assert.match(testoManifestazione(manifestazioneProgetto(def())), /Lama lunga .* Spade .* Affondo, Spazzata/);
});

test('A.166: la voce manifestata cambia famiglia, Specializzazione e Manovre, mai l’Abilità', () => {
  for (const [id, famiglia, spec, manovre] of [
    ['lama-lunga', 'Spade', 'specializzazione-spade', ['Affondo', 'Spazzata']],
    ['frusta', 'Armi flessibili', 'specializzazione-armi-flessibili', ['generali']],
    ['ascia', 'Asce', 'specializzazione-asce', ['Spazzata']],
    ['lancia', 'Armi inastate', 'specializzazione-armi-inastate', ['Affondo']],
  ]) {
    const d = conManifestazione(def(), voce({ manifestazione: id }), ['Custode']);
    assert.equal(d.abilita, 'Armi da mischia', `${id}: Abilità fissa`);
    assert.equal(d.famiglia, famiglia);
    assert.equal(d.specializzazione, spec);
    assert.deepEqual(d.manovre, manovre);
  }
  // un'arma senza manifestazioni resta identica
  const coltello = catalogo(dati).perRif.get('armi:coltello');
  assert.equal(conManifestazione(coltello, { uid: 'x' }, ['Custode']), coltello);
});

test('A.166: nella scheda la forma arriva all’arma impugnata', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce({ manifestazione: 'ascia' })] };
  const scheda = calcolaScheda({ creazione, livelli: [] }, dati);
  const arma = scheda.equipaggiamento.armi.find((a) => a.uid === 'c1');
  assert.ok(arma, 'la CyberArma è fra le armi');
  assert.equal(arma.abilita, 'Armi da mischia');
  assert.equal(arma.manifestazione.id, 'ascia');
  assert.deepEqual(arma.manovre, ['Spazzata']);
  assert.equal(arma.manifestazioni.length, 4);
  // l'Agente non è un Custode: la forma la decide il progetto (qui cambiata dal Direttore sulla voce)
  assert.equal(arma.manifestazioneLibera, false);
  // una sola Specializzazione pertinente: quella della forma, e solo se posseduta
  assert.equal(arma.specializzazione, null, 'l’Agente non ha la Specializzazione in Asce');
});

test('A.166: una sola Specializzazione, quella della forma manifestata', () => {
  // la Specializzazione pertinente è quella della forma: l'app applica il +1 VA e +1 danno solo se il
  // personaggio possiede proprio quella (§8.8.1), quindi forme diverse non cumulano mai
  const spade = conManifestazione(def(), voce({ manifestazione: 'lama-lunga' }), ['Custode']).specializzazione;
  const frusta = conManifestazione(def(), voce({ manifestazione: 'frusta' }), ['Custode']).specializzazione;
  assert.equal(spade, 'specializzazione-spade');
  assert.equal(frusta, 'specializzazione-armi-flessibili');
  assert.notEqual(spade, frusta, 'chi ha la Specializzazione in Spade non la usa con la frusta');
  // una sola per volta: la voce manifestata non porta mai due Specializzazioni
  for (const m of manifestazioniDi(def())) {
    const d = conManifestazione(def(), voce({ manifestazione: m.id }), ['Custode']);
    assert.equal(typeof d.specializzazione, 'string');
    assert.equal(d.specializzazione, m.specializzazione);
  }
  // e la scheda la applica solo se posseduta: l'Agente, che non ne ha, non prende nulla
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce({ manifestazione: 'lama-lunga' })] };
  const arma = calcolaScheda({ creazione, livelli: [] }, dati).equipaggiamento.armi.find((a) => a.uid === 'c1');
  assert.equal(arma.specializzazione, null);
  assert.equal(arma.bonusDanno, 0);
});
