// Catalogo dei rinforzi (Manuale degli Armamenti v0.53, §7.23): esempi del manuale come test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo } from '../src/equipaggiamento.js';
import { calcolaAR } from '../src/protezione.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const rinforzata = (armatura, kit) => {
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('a', armatura, 'indossata'), voce('k', `rinforzi:${kit}`, 'in_uso', { montato_su: 'a' })] }, livelli: [] }, dati);
  return { p: s.equipaggiamento.protezioni[0], eq: s.equipaggiamento };
};
const effetti = (eq, filtro) => eq.effettiOggetti.filter(filtro).map((e) => [e.oggetto, e.valore]);

test('§7.23: 2 profili di categoria, 4 modelli commerciali, 2 soprabiti di base, 14 specialistici, 9 dedicati e il Mantello Venusiano (0.55)', () => {
  const r = catalogo(dati).oggetti.filter((o) => o.file === 'rinforzi');
  assert.equal(r.length, 32);
  // §7.23.10: nove rinforzi dedicati da 1.500, Rari, PS 12; ognuno ottimizzato solo sulla propria armatura
  const dedicati = r.filter((o) => o.paragrafo === '§7.23.10');
  assert.equal(dedicati.length, 9);
  assert.ok(dedicati.every((o) => o.costo === 1500 && o.reperibilita === 'RA' && o.ps_int === 12 && o.abbinamento_ottimizzato.length === 1));
  const per = (id) => catalogo(dati).perRif.get(`rinforzi:${id}`);
  // §7.23.6: specialistici con Qualità Non comune e PS Integrità 12; Eisenwall 10 PI
  assert.deepEqual([per('piastre-eisenwall').pi, per('piastre-eisenwall').qualita, per('piastre-eisenwall').ps_int, per('piastre-eisenwall').costo], [10, 'Non comune', 12, 3200]);
  assert.deepEqual([per('mantello-kasumi').reperibilita, per('mantello-kasumi').costo, per('mantello-kasumi').rinforzo], ['RA', 2500, { kit: 'Leggero', ar: 1, for: 1 }]);
  // §7.23.3: i soprabiti di base restano Comuni, PS 10
  assert.deepEqual([per('soprabito-blu-di-ordinanza').nome, per('soprabito-blu-di-ordinanza').qualita, per('soprabito-blu-di-ordinanza').ps_int], ['Soprabito blu d’ordinanza BLEU', 'Comune', 10]);
});

test('§7.23.5: esempi commerciali', () => {
  for (const [armatura, kit, ar, forR, cat] of [
    ['armature:armatura-civile-leggera', 'soprabito-balistico', 2, 4, 'Leggera'],
    ['armature:armatura-civile-leggera', 'kit-di-piastre-supplementari-pesanti', 3, 5, 'Media'],
    ['armature:armatura-civile-media', 'kit-di-piastre-supplementari-leggere', 4, 6, 'Media'],
  ]) {
    const { p } = rinforzata(armatura, kit);
    assert.deepEqual([p.ar.totale, p.forRichiesta, p.categoria], [ar, forR, cat], `${armatura} + ${kit}`);
  }
});

test('§7.23.7: Antiesplosione delle Breacher — civile media AR 4, 5 contro esplosioni', () => {
  const { p, eq } = rinforzata('armature:armatura-civile-media', 'piastre-breacher');
  assert.equal(p.ar.totale, 4);
  const ar = calcolaAR(eq, dati);
  assert.equal(ar.totale, 4);
  assert.deepEqual(ar.contro.map((c) => [c.contro, c.totale]), [['esplosioni', 5]]);
});

test('§7.23.9: Sode d’assalto — la penalità ravvicinata arriva a 0, non oltre', () => {
  // «Civile leggera + Sode d’assalto: AR 2 e FOR 4; la penalità ravvicinata era già 0»
  let { p } = rinforzata('armature:armatura-civile-leggera', 'piastre-sode-d-assalto');
  assert.deepEqual([p.ar.totale, p.forRichiesta, p.penalita.attacchi_ravvicinati ?? 0], [2, 4, 0]);
  // «Civile media + Sode d’assalto: AR 4 e FOR 6; penalità ravvicinata da −1 a 0, con le altre penalità della Media»
  ({ p } = rinforzata('armature:armatura-civile-media', 'piastre-sode-d-assalto'));
  assert.deepEqual([p.ar.totale, p.forRichiesta, p.penalita.attacchi_ravvicinati, p.penalita.agilita], [4, 6, 0, -1]);
  assert.deepEqual(p.promemoria, []);
});

test('§7.23.9: proprietà uguali su armatura e rinforzo non si sommano, vale la maggiore', () => {
  // «Imbottita 2 dell’armatura + Imbottita 2 del Trenchcoat: soglia 2, non 4»
  let { eq } = rinforzata('armature_corporative:armatura-d-ordinanza-bleu', 'soprabito-trenchcoat');
  assert.equal(eq.effettiOggetti.filter((e) => e.tipo === 'contromisura' && e.effetto === 'Concussivo').length, 1);
  // «Mimetismo 2 dell’armatura + Mimetica ambientale 1 del Ranger: bonus massimo +2, non +3»
  ({ eq } = rinforzata('armature_corporative:tuta-delle-etoiles-mortants', 'mantello-ranger'));
  assert.deepEqual(effetti(eq, (e) => e.abilita === 'Furtività'), [['Tuta delle Étoiles Mortants', 2]]);
  // proprietà diverse conservano il proprio effetto: Pellegrino su una civile leggera
  ({ eq } = rinforzata('armature:armatura-civile-leggera', 'mantello-del-pellegrino'));
  assert.deepEqual(eq.effettiOggetti.filter((e) => e.tipo === 'contromisura').map((e) => [e.effetto, e.valore]), [['Fuoco', 2], ['Concussivo', 2]]);
});

test('§7.23.4, §7.23.9: le proprietà del rinforzo valgono solo se è montato su un’armatura che lo ammette', () => {
  // la Marte non accetta rinforzi esterni: le Piastre Missione non danno né AR né Contromisure
  let { p, eq } = rinforzata('armature_corporative:armatura-marte', 'piastre-missione');
  assert.equal(p.rinforzo, null);
  assert.equal(eq.effettiOggetti.filter((e) => e.oggetto === 'Piastre Missione').length, 0);
  assert.ok(eq.avvisi.some((a) => /Piastre Missione non è ammesso su Armatura Marte/.test(a)));
  // il Soprabito ASA riservato solo sulle due divise ASA
  ({ p } = rinforzata('armature:armatura-civile-leggera', 'soprabito-asa-riservato'));
  assert.equal(p.rinforzo, null);
  ({ p } = rinforzata('armature_corporative:divisa-d-ordinanza-asa', 'soprabito-asa-riservato'));
  assert.equal(p.rinforzo.nome, 'Soprabito ASA riservato');
  assert.ok(p.promemoria.includes('Discreta')); // proprietà testuale del rinforzo, nella riga della protezione
  // un Kasumi non montato non dà Mimetismo
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('k', 'rinforzi:mantello-kasumi', 'in_uso')] }, livelli: [] }, dati);
  assert.equal(s.equipaggiamento.effettiOggetti.filter((e) => e.abilita === 'Furtività').length, 0);
});

test('§7.23.7: SIN del CS-R20 alla sola Schivata, effetti del rinforzo nella riga della protezione', () => {
  const { p } = rinforzata('armature:armatura-civile-leggera', 'piastre-reattive-cs-r20');
  const sin = p.effetti.find((e) => e.proprieta === 'SIN 1');
  assert.deepEqual([sin.abilita, sin.valore, sin.ambito, sin.uso], ['Difese', 1, 'uso_specifico', 'Schivata']);
});
