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
  // Equipaggiamento 0.5, cap. 5: il Corredo da scasso ha la sua scheda (§5.5)
  const scasso = risolvi(vecchiaDotazione('corredo-da-scasso', 'Corredo da scasso (Standard)'), cat);
  assert.deepEqual([scasso.def?.id, pesoVoce(scasso), scasso.nome], ['corredo-da-scasso-standard', 2, 'Corredo da scasso (Standard)']);
  // senza scheda (A.65): resta personalizzato, peso «da definire»
  const musica = risolvi(vecchiaDotazione('strumento-musicale-portatile', 'Strumento musicale portatile (Standard)'), cat);
  assert.equal(musica.def, null);
  assert.equal(pesoVoce(musica), null);
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

test('cap. 3 (0.5): 24 voci (−1 cartuccia, ora NEC Rosso; +4 del §3.6); PI e Qualità solo dove la scheda li dà; effetti di sopravvivenza e protezione', () => {
  const tutte = deiFile('esplorazione');
  assert.equal(tutte.length, 24);
  assert.deepEqual(tutte.filter((o) => o.pi !== undefined).map((o) => [o.id, o.pi, o.ps_int]), [['corredo-da-assalto-verticale', 6, 12], ['corredo-di-sopravvivenza-ambientale', 4, 12],
    ['scala-telescopica', 4, 10], ['passerella-pieghevole', 6, 10], ['verricello-portatile-chroma', 6, 12], ['barella-pieghevole', 4, 10]]);
  assert.equal(r('esplorazione:depuratore-portatile').reperibilita, 'NC');
  assert.deepEqual(r('esplorazione:corredo-di-sopravvivenza-ambientale').effetti.map((e) => [e.abilita, e.valore, e.ambito]), [['Sopravvivenza', 2, 'situazionale']]);
  assert.equal(r('esplorazione:maschera-filtrante').effetti[0].beneficio, 'filtro_respiratorio');
  assert.equal(r('esplorazione:tenda-da-2-persone').nomi_alternativi[0], 'Tenda da 2 posti');
});

test('cap. 3: Completo invernale e Sacco a pelo invernale danno un solo +2 contro il freddo (§3.1); assalto verticale e abiti da viaggio, il maggiore (§3.3)', () => {
  const voce = (uid, rif) => ({ uid, rif, stato: 'in_uso', quantita: 1, note: '' });
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [
    voce('c', 'dotazioni_personali:completo-invernale'), voce('s', 'esplorazione:sacco-a-pelo-invernale'),
    voce('v', 'dotazioni_personali:abiti-da-viaggio'), voce('a', 'esplorazione:corredo-da-assalto-verticale'),
  ] }, livelli: [] }, dati);
  const freddo = s.equipaggiamento.effettiOggetti.filter((e) => e.beneficio === 'freddo_ambientale');
  assert.equal(freddo.length, 1);
  const atl = s.abilita.find((a) => a.nome === 'Atletica');
  assert.equal(atl.usiSpecifici.find((u) => u.uso === 'arrampicata').valore - atl.effettivo, 2);
});

test('cap. 3: le voci di dotazione trovano la scheda (sacco a pelo, razione, tenda, corredi, maschera)', () => {
  for (const id of ['sacco-a-pelo', 'razione-da-viaggio', 'tenda-2-posti', 'corredo-orientamento', 'corredo-assalto-verticale', 'corredo-sopravvivenza-ambientale', 'maschera-filtrante']) {
    assert.ok(risolvi(vecchiaDotazione(id, id), cat).def, id);
  }
});

test('cap. 4: 11 voci con REP propria; Binocolo +1 Percezione per un uso (vale la scheda, non il «situazionale» del §2.16.7)', () => {
  const tutte = deiFile('comunicazione');
  assert.equal(tutte.length, 11);
  assert.deepEqual(['CO', 'NC', 'NC'], ['comunicatore-personale', 'comunicatore-da-squadra', 'stazione-radio-portatile'].map((id) => r(`comunicazione:${id}`).reperibilita));
  assert.equal(r('comunicazione:visore-termico').reperibilita, 'MR');
  const b = r('comunicazione:binocolo').effetti[0];
  assert.deepEqual([b.abilita, b.valore, b.ambito, b.uso], ['Percezione', 1, 'uso_specifico', 'dettagli a distanza']);
  // la voce di dotazione del Binocolo legge la scheda: niente più effetto situazionale
  const bin = risolvi(vecchiaDotazione('binocolo', 'Binocolo'), cat);
  assert.deepEqual([bin.def?.peso, bin.def?.costo, bin.effetti[0].ambito], [0.8, 500, 'uso_specifico']);
});

test('cap. 6: le 16 schede del §7.19 restano (stessi valori); 7 voci nuove: ricariche, ricambi, farmaco, antidoto', () => {
  const tutte = deiFile('sanitario');
  // 23 fino alla 0.3; la 0.5 aggiunge naniti, 8 postazioni e 3 consumabili del §6.8 (tests/sanitario-05.test.js)
  assert.equal(tutte.length, 35);
  // valori del §6.1 e §6.4 uguali a quelli già nel catalogo
  assert.deepEqual([r('sanitario:kit-di-pronto-soccorso-standard').pi, r('sanitario:kit-di-pronto-soccorso-standard').costo], [4, 1000]);
  assert.deepEqual(r('sanitario:kit-di-pronto-soccorso-professionale').ricarica, { applicazioni: 5, costo: 300 });
  assert.equal(r('sanitario:ricarica-kit-di-pronto-soccorso-professionale').costo, 300);
  assert.equal(r('sanitario:confezione-da-cinque-set-chirurgici').costo, 2500);
  const f = r('sanitario:farmaco-terapeutico-specifico').effetti[0];
  assert.deepEqual([f.tipo, f.salvezza, f.valore, f.ambito], ['salvezza', 'tempra', 2, 'uso_specifico']);
  assert.equal(r('sanitario:antidoto-specifico').effetti, undefined); // testuale: termina l'avvelenamento
  // nessun peso nei §§6.1–6.7: resta assente (§1.11); il §6.8 dà il peso di postazioni e ricariche nutritive
  assert.ok(tutte.filter((o) => !o.paragrafo.startsWith('§6.8')).every((o) => o.peso === undefined));
  // la Ricarica per il Kit trauma della dotazione trova la scheda Professionale
  assert.equal(risolvi(vecchiaDotazione('ricarica-kit-trauma', 'Ricarica per il Kit trauma (5 applicazioni)'), cat).def?.costo, 300);
});
