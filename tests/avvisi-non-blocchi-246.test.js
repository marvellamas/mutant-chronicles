import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 246 — quello che la prova nel browser ha trovato, e che i test non vedevano.
// Il principio: un pulsante che finge è peggio di un pulsante spento (lezione del lotto 244). Qui si prova che i
// comandi liberati da questo lotto FANNO davvero quello che promettono, in un caso che prima non esisteva.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avanti, nuovoScontro, registraLancioNemico, cambiaStatoNemico } from '../src/scontro.js';

test('«Avanti» senza nessuna Iniziativa tirata fa avanzare il ROUND (e non salta per aria)', () => {
  // trovato nella prova sulla plancia: liberato il pulsante, il primo clic lanciava un errore («ordinati[0].nome» di
  // un elenco vuoto) e la pagina lo mangiava in silenzio — il Round restava a 1 e nessuno capiva perché
  let s = nuovoScontro({ id: 'x', pg: [] });
  assert.equal(s.partecipanti.length, 0);
  for (let i = 0; i < 3; i++) s = avanti(s, new Date(), { indietroMax: 5 });
  assert.equal(s.round, 4, 'tre «Avanti» portano al Round 4');
  assert.match(s.registro.at(-1).testo, /Round 4/);
  assert.doesNotMatch(s.registro.at(-1).testo, /Tocca a/, 'non nomina nessuno: non c’è un ordine di Iniziativa');
});

test('«Lancia!» di una creatura con i PM che non bastano: la riserva va a 0 e non sotto, l’azione si conclude', () => {
  const s = {
    ...nuovoScontro({ id: 'y', pg: [] }),
    partecipanti: [{ id: 'n1', tipo: 'nemico', nome: 'Lorath', pm: { attuali: 3, massimi: 9 }, stati: [], intensita: {} }],
  };
  const t = registraLancioNemico(s, { id: 'n1', incantesimo: 'Dardo', livello: 1, pm: 8, testo: 'Dardo' }, new Date(), null);
  assert.equal(t.partecipanti[0].pm.attuali, 0, 'a 0, mai sotto');
  assert.match(t.registro.at(-1).testo, /Lorath/);
});

test('uno Stato su una creatura immune si accende, e il registro dice che l’ha deciso il master', () => {
  const s = {
    ...nuovoScontro({ id: 'z', pg: [] }),
    partecipanti: [{ id: 'n1', tipo: 'nemico', nome: 'Golem', pm: null, stati: [], intensita: {}, scheda: { immunita: ['incendiato'] } }],
  };
  const t = cambiaStatoNemico(s, 'n1', { id: 'incendiato', nome: 'Incendiato' }, true, new Date());
  assert.deepEqual(t.partecipanti[0].stati, ['incendiato']);
  assert.match(t.registro.at(-1).testo, /immune/, 'resta scritto che la scheda lo dà immune');
});
