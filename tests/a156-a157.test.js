// A.156 e A.157 (risposte di Davide del 10/10/2026): PM persi quando l'infusione di un Consumabile fallisce, e
// «Rituale: non consentito» che non impedisce l'infusione. L'app faceva già così: qui i numeri della risposta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { pianoCreazione, costiCreazione, regoleConsumabili } from '../src/consumabili-mistici.js';

const { dati } = await datiReali();
const scheda = (talenti = ['ritualista-minore', 'ritualista-medio', 'ritualista-maggiore']) => ({
  talentiLiberi: talenti.map((id) => ({ id })), classi: [{ talenti: [] }],
  abilita: [{ nome: 'Artefatti', effettivo: 12 }, { nome: 'Tecnologia', effettivo: 12 }, { nome: 'Rituali', effettivo: 12 }],
  incantesimi: { conosciuti: dati.incantesimi.incantesimi.map((i) => ({ nome: i.nome })), livelloMassimo: 12 },
});
const piano = (scelta) => pianoCreazione({ progetto: { disponibile: true }, ...scelta }, { scheda: scheda() }, dati);

test('A.156: con il Fallimento si perdono tutti i PM impegnati (esempio: Grado II, 4 sigillati → 10)', () => {
  // la versione di Grado II con 4 PM sigillati dell'esempio della risposta
  const costi = costiCreazione({ grado: 'II', pmSigillati: 4 }, dati);
  assert.deepEqual([costi.pmLavoro, costi.pmSigillati, costi.pmTotali], [6, 4, 10], '3 × Grado + sigillati');
  // nel piano: con un Fallimento dell'infusione i PM spesi restano tutti e il Consumabile non si crea
  const riuscito = piano({ incantesimo: 'Individuare', livello: 6, conosciutaDaAltri: true, infusione: { esito: 'successo' } });
  const fallito = piano({ incantesimo: 'Individuare', livello: 6, conosciutaDaAltri: true, infusione: { esito: 'fallimento' } });
  assert.equal(riuscito.grado, 'II');
  assert.equal(riuscito.pmSigillati, 6, 'Individuare 6: 6 PM sigillati');
  assert.equal(fallito.pm, riuscito.pm, 'si perdono gli stessi PM del tentativo riuscito');
  assert.equal(fallito.creato, false, 'il Consumabile non viene creato');
  const inf = fallito.fasi.find((f) => f.fase === 'infusione');
  assert.equal(inf.pm, riuscito.fasi.find((f) => f.fase === 'infusione').pm);
  assert.ok(inf.crediti > 0, 'anche i reagenti si consumano');
});

test('A.156: lo stesso con il Fallimento Maldestro, e il dato sta nelle regole senza TODO', () => {
  const maldestro = piano({ incantesimo: 'Individuare', livello: 6, conosciutaDaAltri: true, infusione: { esito: 'maldestro' } });
  const riuscito = piano({ incantesimo: 'Individuare', livello: 6, conosciutaDaAltri: true, infusione: { esito: 'successo' } });
  assert.equal(maldestro.pm, riuscito.pm);
  assert.equal(maldestro.creato, false);
  const I = regoleConsumabili(dati).creazione.infusione;
  assert.deepEqual([I.esiti.fallimento.pm, I.esiti.maldestro.pm, I.esiti.interrotta.pm], [true, true, false]);
  assert.equal(I['TODO(Davide)'], undefined);
  assert.match(I._nota_a156, /6 \+ 4 = 10 PM/);
});

test('A.157: «Rituale: non consentito» non impedisce l’infusione, e l’avviso è diventato una nota', () => {
  const C = regoleConsumabili(dati).creazione;
  assert.equal(C.rituale_non_consentito.consentita, true);
  assert.match(C.rituale_non_consentito.nota, /vieta soltanto il lancio dell’incantesimo come Rituale/);
  assert.equal(C['TODO(Davide)'], undefined);
  const p = piano({ incantesimo: 'Colpo Elementale', livello: 3 });
  assert.ok(p.note.some((n) => /A\.157/.test(n)), 'nota informativa');
  assert.ok(!p.avvisi.some((a) => /A\.157/.test(a)), 'niente più avviso di dubbio');
  assert.ok(!p.irregolari.some((x) => /Rituale/.test(x)), 'l’infusione è permessa');
  assert.equal(p.creato, true, 'con le Prove riuscite il Consumabile si crea');
});
