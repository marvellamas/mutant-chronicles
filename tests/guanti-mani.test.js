// Guanti da Combattimento Mistico a 0 mani (manuali del 12/10/2026: Armamenti 0.61 §7.24, Equipaggiamento 0.7
// cap. 10, Magia 1.4 sez. 26, Giocatore 0.48 §5.13). Un oggetto può essere insieme Arma e Artefatto: i Guanti sono
// indossati, non occupano mani, e restano un Artefatto con la sua riserva, contata una volta sola.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { catalogo, risolvi, infoArtefattoVoce, assegnaMani } from '../src/equipaggiamento.js';
import { calcolaScheda } from '../src/calc.js';
import { calcolaCarico } from '../src/carico.js';
import { massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const RIF = 'artefatti:guanti-da-combattimento-mistico';

test('i Guanti sono un’Arma ravvicinata e insieme un Artefatto, con 0 mani', () => {
  const g = cat.perRif.get(RIF);
  assert.equal(g.mani, 0, 'indossati: non occupano mani');
  assert.equal(g.indossabile, true);
  assert.equal(g.impugnato, false);
  assert.ok(g.artefatto, 'resta un Artefatto Mistico');
  assert.equal(g.artefatto.sintonizzazione, 2, 'SnT invariata');
  assert.equal(g.artefatto.contenitore.capacita_pm, 10, 'riserva invariata');
  // il profilo dei pugni dei manuali
  assert.deepEqual([g.profilo_pugni.famiglia, g.profilo_pugni.tipo_arma, g.profilo_pugni.abilita, g.profilo_pugni.caratteristica, g.profilo_pugni.portata_q],
    ['Armi da pugno', 'Guanti da combattimento', 'Corpo a corpo', 'FOR', 1]);
  assert.deepEqual(g.profilo_pugni.manovre, ['Stordire']);
  assert.match(dati.equipaggiamento.file.artefatti._nota_classificazione, /una sola volta/);
});

test('con i Guanti indossati le due mani restano libere', () => {
  const voci = [
    { uid: 'g1', rif: RIF, stato: 'indossata', quantita: 1, note: '' },
    { uid: 'a1', rif: 'armi:tonfa', stato: 'impugnata', quantita: 1, note: '' },
  ];
  const pg = { ...MISHIMA_AGENTE, equipaggiamento: voci };
  const scheda = calcolaScheda({ creazione: pg, livelli: [] }, dati);
  const armi = (scheda.equipaggiamento.armi ?? []).filter((a) => !a.moduloDi && !a.daScudo);
  assert.ok(!armi.some((a) => /Guanti/.test(a.nome)), 'i Guanti non sono un’arma impugnata');
  const oggetti = armi.map((a) => ({ uid: String(a.uid).split(':')[0], nome: a.nome, arma: a, mani: a.mani === 2 ? 2 : 1 }));
  const { slot, oltre } = assegnaMani(oggetti, () => null);
  assert.equal(oltre.length, 0);
  assert.equal(slot.sinistra, null, 'una mano resta libera con i Guanti addosso');
  assert.ok(slot.destra?.nome === 'Tonfa' || slot.due?.nome === 'Tonfa', 'l’arma impugnata resta dov’è');
});

test('i Guanti si contano una volta sola: peso, quantità e riserva', () => {
  const voci = [{ uid: 'g1', rif: RIF, stato: 'indossata', quantita: 1, note: '' }];
  const pg = { ...MISHIMA_AGENTE, equipaggiamento: voci };
  const scheda = calcolaScheda({ creazione: pg, livelli: [] }, dati);
  const m = massimiSessione(scheda, pg, dati);
  const c = calcolaCarico(scheda, inizializzaSessione(m), dati);
  const righe = [...c.righe, ...c.esclusi].filter((r) => /Guanti/.test(r.nome));
  assert.ok(righe.length <= 1, 'una sola riga nel carico');
  const contenitori = (scheda.equipaggiamento.contenitori ?? []).filter((x) => /Guanti/.test(x.nome));
  assert.equal(contenitori.length, 1, 'una sola riserva');
  assert.equal(contenitori[0].capacita, 10);
  const info = infoArtefattoVoce(risolvi(voci[0], cat), dati);
  assert.equal(info.sintonizzazione, 2, 'una sola SnT');
});

test('gli effetti dei Guanti valgono sui pugni, non sull’arma impugnata', () => {
  const g = cat.perRif.get(RIF);
  const su = (g.effetti ?? []).map((e) => e.attacchi);
  assert.deepEqual(su, ['senz_armi', 'contatto_incantesimi'], 'solo pugni e incantesimi a contatto');
  assert.equal(g.attivazione_artefatto.attacchi, 'senz_armi', 'anche l’attivazione a 3 PM');
});
