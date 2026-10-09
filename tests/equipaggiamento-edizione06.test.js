// Manuale dell'Equipaggiamento, edizione 0.6 (08/10/2026): le voci nuove del lotto tools/lotti/lotto_equipaggiamento_edizione06.mjs,
// un test per gruppo (§3.3.1, §3.5.1, §3.7, §3.8, §4.1 e §4.4, §5.9 e §5.10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo, consumabili, risolvi } from '../src/equipaggiamento.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (rif) => cat.perRif.get(rif);
const numeri = (rif) => { const o = r(rif); return [o.peso, o.costo, o.reperibilita, o.qualita ?? null, o.ps_int ?? null, o.pi ?? null]; };
const nec = (rif) => { const a = r(rif).alimentazione; return [a.nec, a.consumo_lxh, a.autonomia_ore]; };

test('§3.3.1 Navigatore inerziale: 0,3 kg, 600 cr, NC, Comune 10, 2 PI; NEC Verde compatto 2 Lx/h, 50 ore', () => {
  assert.deepEqual(numeri('esplorazione:navigatore-inerziale'), [0.3, 600, 'NC', 'Comune', 10, 2]);
  assert.deepEqual(nec('esplorazione:navigatore-inerziale'), ['nec:verde-compatto', 2, 50]);
  assert.equal(r('esplorazione:navigatore-inerziale').versione_manuale, 'Equipaggiamento 0.6');
});

test('§3.5.1 Decontaminazione: dosi separate dai PI; cartuccia di ricambio senza peso (A.154)', () => {
  assert.deepEqual(numeri('esplorazione:decontaminante-personale'), [0.5, 200, 'NC', 'Comune', 10, 2]);
  assert.deepEqual(numeri('esplorazione:erogatore-decontaminante-ricaricabile'), [2.5, 800, 'NC', 'Comune', 10, 4]);
  assert.deepEqual([r('esplorazione:erogatore-decontaminante-ricaricabile').applicazioni, r('esplorazione:erogatore-decontaminante-ricaricabile').ricarica], [5, { applicazioni: 5, costo: 500 }]);
  const c = r('esplorazione:cartuccia-di-decontaminante');
  assert.deepEqual([c.peso, c.costo, c.applicazioni], [null, 500, 5]);
  assert.match(c['TODO(Davide)'], /^A\.154/);
});

test('§3.7 Emergenze: estintori, nastro, toppe, schiuma con dosi e ricambi', () => {
  assert.deepEqual(numeri('esplorazione:estintore-personale'), [0.3, 100, 'CO', 'Comune', 10, 2]);
  assert.deepEqual(numeri('esplorazione:estintore-ricaricabile'), [1.5, 400, 'CO', 'Comune', 10, 4]);
  assert.deepEqual(r('esplorazione:estintore-ricaricabile').ricarica, { applicazioni: 5, costo: 100 });
  assert.deepEqual(numeri('esplorazione:ricambio-estintore').slice(0, 3), [0.5, 100, 'CO']);
  assert.deepEqual(numeri('esplorazione:nastro-tecnico'), [0.2, 50, 'CO', 'Comune', 10, 2]);
  assert.deepEqual(numeri('esplorazione:toppe-pressurizzate'), [0.25, 250, 'NC', 'Comune', 10, 1]);
  assert.equal(r('esplorazione:toppe-pressurizzate').nome_applicazioni, 'toppe');
  assert.deepEqual(numeri('esplorazione:applicatore-di-schiuma'), [2, 600, 'NC', 'Comune', 10, 4]);
  assert.deepEqual(numeri('esplorazione:ricambio-schiuma').slice(0, 3), [1, 200, 'NC']);
  // nessun NEC per queste dotazioni
  for (const id of ['estintore-personale', 'nastro-tecnico', 'toppe-pressurizzate', 'applicatore-di-schiuma']) assert.equal(r(`esplorazione:${id}`).alimentazione, undefined, id);
  // le dosi si contano nell'Inventario, come le applicazioni dei kit
  const voci = [{ uid: 'e', rif: 'esplorazione:estintore-ricaricabile', stato: null, quantita: 1, note: '' }];
  assert.deepEqual(consumabili(voci, dati).map((x) => [x.capacita, x.unita, x.ricarica?.costo]), [[5, 'dosi', 100]]);
});

test('§3.8 Attività extraveicolari: tuta, riparo, calzature; aria separata dall’energia; climatizzazione +2 Tempra', () => {
  assert.deepEqual(numeri('esplorazione:tuta-extraveicolare'), [12, 8000, 'NC', 'Non comune', 12, 6]);
  assert.deepEqual(nec('esplorazione:tuta-extraveicolare'), ['nec:verde-standard', 25, 40]);
  assert.deepEqual([r('esplorazione:tuta-extraveicolare').applicazioni, r('esplorazione:tuta-extraveicolare').nome_applicazioni, r('esplorazione:tuta-extraveicolare').ricarica], [4, 'ore d’aria', { applicazioni: 2, costo: 100 }]);
  assert.deepEqual(numeri('esplorazione:riparo-pressurizzato'), [26, 12000, 'RA', 'Non comune', 12, 8]);
  assert.deepEqual(nec('esplorazione:riparo-pressurizzato'), ['nec:verde-standard', 50, 20]);
  assert.equal(r('esplorazione:riparo-pressurizzato').applicazioni, 8);
  assert.deepEqual(numeri('esplorazione:calzature-magnetiche'), [1.5, 600, 'NC', 'Comune', 10, 4]);
  const e = r('esplorazione:tuta-extraveicolare').effetti[0];
  assert.deepEqual([e.tipo, e.salvezza, e.valore, e.ambito, e.beneficio], ['salvezza', 'tempra', 2, 'uso_specifico', 'climatizzazione']);
  assert.equal(r('esplorazione:riparo-pressurizzato').effetti[0].beneficio, 'climatizzazione');
  // indossata: il +2 compare come valore a parte della Tempra
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [{ uid: 't', rif: 'esplorazione:tuta-extraveicolare', stato: 'in_uso', quantita: 1, note: '' }] }, livelli: [] }, dati);
  assert.ok(s.equipaggiamento.effettiOggetti.some((x) => x.salvezza === 'tempra' && x.valore === 2 && x.uso === 'contro caldo e freddo ambientali'));
});

test('§4.1 e §4.4: la cifratura chiede il modulo; modulo senza riserva propria; rilevatore +2 Tecnologia', () => {
  for (const id of ['comunicatore-personale', 'comunicatore-da-squadra', 'stazione-radio-portatile']) assert.match(r(`comunicazione:${id}`).note_manuale, /la cifratura richiede il modulo del §4\.4/, id);
  assert.deepEqual(numeri('comunicazione:modulo-di-cifratura'), [0.1, 500, 'NC', 'Non comune', 12, 2]);
  assert.equal(r('comunicazione:modulo-di-cifratura').alimentazione, undefined);
  assert.deepEqual(numeri('comunicazione:rilevatore-di-sorveglianza'), [1, 2000, 'NC', 'Non comune', 12, 4]);
  assert.deepEqual(nec('comunicazione:rilevatore-di-sorveglianza'), ['nec:verde-standard', 25, 40]);
  const e = r('comunicazione:rilevatore-di-sorveglianza').effetti[0];
  assert.deepEqual([e.abilita, e.valore, e.ambito], ['Tecnologia', 2, 'uso_specifico']);
});

test('§5.9 e §5.10: utensile laser (Rosso standard, 5 ore, nessun bonus) e analizzatore (+2 Scienza, 10 test)', () => {
  assert.deepEqual(numeri('strumenti_professionali:utensile-laser-da-taglio-e-saldatura'), [2, 1500, 'NC', 'Non comune', 12, 4]);
  assert.deepEqual(nec('strumenti_professionali:utensile-laser-da-taglio-e-saldatura'), ['nec:rosso-standard', 100, 5]);
  assert.equal(r('strumenti_professionali:utensile-laser-da-taglio-e-saldatura').effetti, undefined);
  assert.deepEqual(numeri('strumenti_professionali:analizzatore-alimentare-portatile'), [1, 1200, 'NC', 'Non comune', 12, 4]);
  const a = r('strumenti_professionali:analizzatore-alimentare-portatile');
  assert.deepEqual([a.applicazioni, a.nome_applicazioni, a.ricarica], [10, 'test', { applicazioni: 10, costo: 100 }]);
  assert.deepEqual([a.effetti[0].abilita, a.effetti[0].valore], ['Scienza', 2]);
  // si comprano dal catalogo Commerciale
  assert.ok(risolvi({ uid: 'x', rif: 'strumenti_professionali:analizzatore-alimentare-portatile', stato: null, quantita: 1 }, cat).def.catalogo === 'Commerciale');
});
