// Manuale dell'Equipaggiamento 0.3, capitoli 2, 3, 4 e 6 (tools/lotti/lotto_equipaggiamento_03.mjs,
// docs/equipaggiamento-lotti.md): schede, effetti, collegamento delle voci di dotazione (A.34).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogo, risolvi, normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { pesoVoce } from '../src/carico.js';
import { acquistabili } from '../src/dotazioni.js';
import { calcolaScheda } from '../src/calc.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (rif) => cat.perRif.get(rif);
const deiFile = (f) => cat.oggetti.filter((o) => o.file === f);
// voce di dotazione come la salvava l'app prima dei lotti: personalizzata, con dotazione_id
const vecchiaDotazione = (id, nome, extra = {}) => normalizzaEquipaggiamento([{ uid: `dot-${id}`, rif: null, personalizzato: { nome, tipo: 'altro' }, stato: null, quantita: 1, note: '', dotazione_iniziale: true, dotazione_id: id, ...extra }])[0];

test('cap. 2: 19 voci del catalogo Commerciale, tutte CO, con peso e prezzo; niente PI né Qualità inventati', () => {
  const tutte = deiFile('dotazioni_personali');
  assert.equal(tutte.length, 19);
  assert.ok(tutte.every((o) => o.catalogo === 'Commerciale' && o.reperibilita === 'CO' && o.peso > 0 && o.costo > 0));
  assert.ok(tutte.every((o) => o.pi === undefined && o.qualita === undefined));
  assert.deepEqual([r('dotazioni_personali:zaino-da-viaggio').peso, r('dotazioni_personali:zaino-da-viaggio').costo], [1, 100]);
  assert.equal(r('dotazioni_personali:bastoncino-luminoso').peso, 0.05);
});

test('cap. 2: effetti degli abiti (§2.4) nello schema degli effetti', () => {
  const viaggio = r('dotazioni_personali:abiti-da-viaggio').effetti;
  assert.deepEqual(viaggio.map((e) => [e.abilita, e.valore, e.ambito, e.uso]), [['Atletica', 1, 'uso_specifico', 'arrampicata'], ['Atletica', 1, 'uso_specifico', 'equilibrio']]);
  assert.deepEqual(r('dotazioni_personali:abiti-eleganti').effetti.map((e) => [e.abilita, e.ambito]), [['Oratoria', 'situazionale']]);
  const inv = r('dotazioni_personali:completo-invernale').effetti[0];
  assert.deepEqual([inv.tipo, inv.salvezza, inv.valore, inv.beneficio], ['salvezza', 'tempra', 2, 'freddo_ambientale']);
});

test('dotazione collegata alla scheda: un personaggio già salvato vede peso, prezzo ed effetti; il nome resta quello della dotazione', () => {
  const z = risolvi(vecchiaDotazione('zaino-da-viaggio', 'Zaino da viaggio'), cat);
  assert.equal(z.def?.id, 'zaino-da-viaggio');
  assert.equal(pesoVoce(z), 1);
  assert.equal(z.personalizzato, false);
  const cer = risolvi(vecchiaDotazione('completo-cerimoniale', 'Completo cerimoniale, comprese le calzature (profilo Abiti eleganti)'), cat);
  assert.equal(cer.nome, 'Completo cerimoniale, comprese le calzature (profilo Abiti eleganti)');
  assert.equal(cer.def?.costo, 300);
  assert.equal(cer.effetti[0].abilita, 'Oratoria');
  // Corredo di manutenzione da campo: scheda degli Armamenti (§7.13.7)
  assert.equal(risolvi(vecchiaDotazione('corredo-manutenzione-campo', 'Corredo di manutenzione da campo'), cat).def?.id, 'corredo-di-manutenzione-da-campo');
  // senza scheda: resta personalizzato, peso «da definire»
  const scasso = risolvi(vecchiaDotazione('corredo-da-scasso', 'Corredo da scasso (Standard)'), cat);
  assert.equal(scasso.def, null);
  assert.equal(pesoVoce(scasso), null);
});

test('abiti da viaggio in uso: +1 ad Atletica per equilibrio e per arrampicata, il VA generale non cambia', () => {
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [{ uid: 'a', rif: 'dotazioni_personali:abiti-da-viaggio', stato: 'in_uso', quantita: 1, note: '' }] }, livelli: [] }, dati);
  const atl = s.abilita.find((a) => a.nome === 'Atletica');
  const usi = Object.fromEntries(atl.usiSpecifici.map((u) => [u.uso, u.valore - atl.effettivo]));
  assert.deepEqual(usi, { arrampicata: 1, equilibrio: 1 });
});

test('acquistabili alla creazione: le voci del catalogo Commerciale con prezzo (§2.16.29)', () => {
  const ids = new Set(acquistabili('Mishima', dati).map((o) => o.rif));
  assert.ok(ids.has('dotazioni_personali:zaino-da-viaggio'));
});
