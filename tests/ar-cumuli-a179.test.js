// A.179 (Davide, 25/10/2026): Aura di Resistenza + Pelle di Rinoceronte = +3 contro il Ravvicinato Naturale o Magico,
// +2 contro gli altri danni Naturali o Magici, +2 contro l'Etereo; aggiungendo Corazza Potenziata +4 / +3 / +3.
// Il calcolo reale di calcolaAR, non la somma dei numeri dei dati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { calcolaAR } from '../src/protezione.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato) => ({ uid, rif, stato, quantita: 1, note: '' });
const accese = (...t) => ({ tecniche: t, accesi: new Set(t.map((x) => `tecnica:${x}`)) });
const tre = (ar) => {
  const per = (e) => ar.valori.find((v) => v.etichetta === e)?.valore;
  return { ravvicinato: per('contro ravvicinato') ?? per('AR'), altri: per('AR'), etereo: per('contro Etereo') };
};

test('A.179: Aura + Pelle danno +3 contro il Ravvicinato, +2 contro gli altri danni e +2 contro l’Etereo', () => {
  const eq = { protezioni: [], effettiOggetti: [] };
  const base = tre(calcolaAR(eq, dati, {}));
  const ar = tre(calcolaAR(eq, dati, accese('aura-di-resistenza', 'pelle-di-rinoceronte')));
  assert.deepEqual([ar.ravvicinato - base.ravvicinato, ar.altri - base.altri, ar.etereo - base.etereo], [3, 2, 2]);
  // la sola Aura: +2 ovunque, la Pelle non aggiunge nulla fuori dal Ravvicinato
  const sola = tre(calcolaAR(eq, dati, accese('aura-di-resistenza')));
  assert.deepEqual([sola.ravvicinato - base.ravvicinato, sola.altri - base.altri, sola.etereo - base.etereo], [2, 2, 2]);
});

test('A.179: con Corazza Potenziata (Scudo delle Guardie Sacre) i totali diventano +4 / +3 / +3', () => {
  const c = { ...MISHIMA_AGENTE, equipaggiamento: [voce('gs', 'scudi:scudo-delle-guardie-sacre', 'imbracciato')] };
  const eq = calcolaScheda({ creazione: c, livelli: [] }, dati).equipaggiamento;
  const senza = tre(calcolaAR(eq, dati, {}));
  const solo = tre(calcolaAR(eq, dati, { talenti: ['Corazza Potenziata'] }));
  assert.deepEqual([solo.altri - senza.altri, solo.etereo - senza.etereo], [1, 1], 'Corazza Potenziata da sola: +1 magica');
  const tutto = tre(calcolaAR(eq, dati, { talenti: ['Corazza Potenziata'], ...accese('aura-di-resistenza', 'pelle-di-rinoceronte') }));
  assert.deepEqual([tutto.ravvicinato - senza.ravvicinato, tutto.altri - senza.altri, tutto.etereo - senza.etereo], [4, 3, 3]);
});
