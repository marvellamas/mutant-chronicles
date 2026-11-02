// Lotto 162 (02/11/2026): A.211, risposta di Davide del 30/10/2026. «Per gli incantesimi aggiunti manualmente fuori dalle
// normali quote, solo il Direttore può confermare lo stato "appreso". Il giocatore può aggiungere un'annotazione e
// richiedere la conferma dell'apprendimento. Fino alla conferma, l'annotazione non concede nuove possibilità di lancio
// né vale come conoscenza per prerequisiti, creazione di Consumabili o insegnamento.»
import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import {
  aggiungiIncantesimoAMano, classificaIncantesimoAMano, normalizzaIncantesimiAMano, controllaAManoDaTablet, contaComeConosciuto,
  etichettaTipo, statoLancioAMano, richiestaAppreso, incantesimoPerId,
} from '../src/incantesimi-a-mano.js';
import { controllaTalentiDaTablet } from '../src/talenti-tablet.js';

const { dati } = await datiReali();
const inc = dati.incantesimi.incantesimi.find((i) => i.nome === 'Dardo Spirituale') ?? dati.incantesimi.incantesimi[0];

test('dal giocatore: annotato con la richiesta; non conta come conosciuto e non si lancia finché il Direttore non conferma', () => {
  const l = aggiungiIncantesimoAMano([], inc.id, { origine: 'a_mano', tipo: 'annotato', richiesta: true }, dati);
  const x = l[0];
  assert.deepEqual([x.tipo, x.richiesta], ['annotato', true]);
  assert.equal(richiestaAppreso(x), true);
  assert.equal(contaComeConosciuto(x), false);
  assert.equal(statoLancioAMano(x, { accesso: true }).lanciabile, false);
  assert.equal(etichettaTipo(x, dati), 'Annotato, appreso da confermare');
  // la richiesta vale solo per un annotato
  assert.equal(normalizzaIncantesimiAMano([{ nome: inc.nome, tipo: 'appreso', richiesta: true }], dati)[0].richiesta, undefined);
  // il Direttore conferma: appreso, la richiesta si chiude
  const conf = classificaIncantesimoAMano(l, inc.nome, 'appreso', {}, dati);
  assert.deepEqual([conf[0].tipo, conf[0].richiesta], ['appreso', undefined]);
  assert.equal(contaComeConosciuto(conf[0]), true);
  // o lo lascia annotato: la richiesta si chiude lo stesso
  assert.equal(classificaIncantesimoAMano(l, inc.nome, 'annotato', {}, dati)[0].richiesta, undefined);
  assert.ok(incantesimoPerId(inc.id, dati));
});

test('server: un tablet non scrive «appreso», non classifica, non concede; aggiunge annotati e chiede la conferma', () => {
  const annotato = { nome: inc.nome, origine: 'a_mano', quando: '2026-11-02', tipo: 'annotato' };
  const appreso = { ...annotato, tipo: 'appreso' };
  const daClass = { nome: inc.nome, origine: 'a_mano', quando: '2026-10-20' };
  assert.deepEqual(controllaAManoDaTablet([annotato], []), { ok: true });
  assert.deepEqual(controllaAManoDaTablet([{ ...annotato, richiesta: true }], []), { ok: true });
  assert.equal(controllaAManoDaTablet([appreso], []).stato, 403);
  assert.match(controllaAManoDaTablet([appreso], []).errore, /lo conferma il Direttore \(A\.211\)/);
  assert.equal(controllaAManoDaTablet([appreso], [annotato]).stato, 403, 'da annotato ad appreso: Direttore');
  assert.equal(controllaAManoDaTablet([annotato], [daClass]).stato, 403, 'i «da classificare» li classifica il Direttore (A.213)');
  assert.equal(controllaAManoDaTablet([{ ...annotato, concessione: 'con 2 PM' }], [annotato]).stato, 403);
  // chiedere, ritirare, lasciare com'è, togliere: sì
  assert.deepEqual(controllaAManoDaTablet([{ ...annotato, richiesta: true }], [annotato]), { ok: true });
  assert.deepEqual(controllaAManoDaTablet([annotato], [{ ...annotato, richiesta: true }]), { ok: true });
  assert.deepEqual(controllaAManoDaTablet([appreso], [appreso]), { ok: true });
  assert.deepEqual(controllaAManoDaTablet([], [appreso]), { ok: true });
  // attraverso il controllo che il server fa su ogni salvataggio da tablet
  const file = (lista) => ({ formato: 'mutant-personaggio', scelte: { nome: 'X', incantesimiAMano: lista }, livelli: [] });
  const r = controllaTalentiDaTablet(file([appreso]), file([annotato]), dati);
  assert.deepEqual([r.ok, r.stato], [false, 403]);
  assert.deepEqual(controllaTalentiDaTablet(file([{ ...annotato, richiesta: true }]), file([annotato]), dati), { ok: true });
});
