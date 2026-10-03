// Round della scheda collegato allo scontro del Tavolo del Master (src/round-scontro.js; regole in data/regole.json →
// durate_round): la scheda vede la sua sessione al Round dello scontro, la plancia la riallinea all'inizio e la porta al
// Round finale alla fine. Senza server, o fuori da uno scontro, tutto come prima.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { tecnicaDi, fineDurata, statoAttivazione } from '../src/tecniche.js';
import { attivaTecnica } from '../src/tecniche.js';
import { alRound, riallinea, terminaDurate, collegamentoScontro, tecnicheScadute, statiScaduti, durateCarta, testoDurata } from '../src/round-scontro.js';
import { nuovoScontro, avanti, registraTiro, registraDurata, chiudi } from '../src/scontro.js';
import { nuovoRoundSessione } from '../src/sessione.js';
import { testoConSessioneDa, vistaPlancia } from '../src/tavolo.js';
import { creaServer } from '../server.mjs';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();
const T0 = new Date(2026, 9, 3, 21, 0, 0);
const scheda = (ids) => ({ tecniche: ids.map((id) => ({ id })), tecnicheAmmesse: ids.length, pm: 20, umanita: null });
const sessione = (extra = {}) => ({ pmAttuali: 20, round: 1, ultimaTecnica: null, tecnicheAttive: [], statiAttivi: [], chroma: {}, ...extra });
const vivo = (valore) => ({ valore, origine: 'manuale' });
const sc = scheda(['aura-di-resistenza', 'pelle-di-rinoceronte']);
const aura = tecnicaDi('aura-di-resistenza', dati); // durata 3 Round

/** Scontro con Aiko (PG) e un avversario a mano, con l'Iniziativa tirata: Round 1, di turno il primo. */
function scontroConAiko() {
  let s = nuovoScontro({ id: 'scontro-prova', pg: [{ chiave: 'Aiko-Tenzan', nome: 'Aiko Tenzan', iniziativa: 4, des: 7, int: 5 }], adesso: T0 });
  s = registraTiro(s, 'pg:Aiko-Tenzan', 'd10', vivo(6), dati, T0);
  return s;
}
/** «Avanti» fino al Round `r` (un solo partecipante: un «Avanti» = un Round). */
const finoAlRound = (s, r) => { while (s.round < r) s = avanti(s, T0); return s; };

test('regola nei dati: durate dal Round R alla fine del Round R + N, il Round di attivazione non conta', () => {
  assert.equal(dati.regole.durate_round.round_attivazione_conta, false);
  assert.equal(fineDurata(2, 3, dati), 5);
  const conta = copia(dati);
  conta.regole.durate_round.round_attivazione_conta = true;
  assert.equal(fineDurata(2, 3, conta), 4); // se Davide decidesse diversamente, cambia il dato, non il codice
});

test('Tecnica attivata al Round 2 dello scontro con durata R + 3: scade al Round giusto avanzando dalla plancia', () => {
  let s = finoAlRound(scontroConAiko(), 2);
  let coll = collegamentoScontro(s, 'Aiko-Tenzan');
  assert.deepEqual([coll.round, coll.nome], [2, s.nome]);
  // la scheda attiva sulla sua sessione vista al Round dello scontro
  const pg = attivaTecnica(sc, alRound(sessione(), coll.round), aura, dati);
  assert.deepEqual(pg.tecnicheAttive, [{ id: 'aura-di-resistenza', dal: 2, al: 5 }]);
  assert.deepEqual(pg.ultimaTecnica, { id: 'aura-di-resistenza', round: 2 });
  // la plancia avanza: Round 3, 4, 5 in corso, con i Round che restano; al Round 6 scaduta
  for (const [r, restano] of [[3, 3], [4, 2], [5, 1]]) {
    s = finoAlRound(s, r);
    coll = collegamentoScontro(s, 'Aiko-Tenzan');
    const v = alRound(pg, coll.round);
    assert.deepEqual(durateCarta(v, coll, dati).map(testoDurata), [`Aura di Resistenza · ${restano} Round`], `Round ${r}`);
  }
  s = finoAlRound(s, 6);
  assert.deepEqual(tecnicheScadute(alRound(pg, 5), 5, 6, dati), ['Aura di Resistenza']);
  assert.deepEqual(alRound(pg, collegamentoScontro(s, 'Aiko-Tenzan').round).tecnicheAttive, []);
});

test('due attivazioni nello stesso Round dello scontro: la seconda è rifiutata; al Round dopo si può', () => {
  const pelle = tecnicaDi('pelle-di-rinoceronte', dati);
  const s3 = attivaTecnica(sc, alRound(sessione(), 3), aura, dati);
  assert.equal(attivaTecnica(sc, alRound(s3, 3), pelle, dati), null);
  assert.match(statoAttivazione(sc, alRound(s3, 3), pelle, dati).motivo, /una sola per Round/);
  // il master avanza al Round 4: la scheda vede il Round nuovo e la seconda Tecnica si attiva
  assert.ok(attivaTecnica(sc, alRound(s3, 4), pelle, dati));
});

test('fine dello scontro con una durata ancora attiva: resta con i Round che restano, poi segue il contatore della scheda', () => {
  const pg = attivaTecnica(sc, alRound(sessione(), 4), aura, dati); // Round 4–7
  let s = finoAlRound(scontroConAiko(), 6);
  s = chiudi(s, T0);
  assert.equal(collegamentoScontro(s, 'Aiko-Tenzan'), null); // scontro chiuso: la scheda torna al suo contatore
  const fine = alRound(pg, s.round); // la plancia porta la sessione al Round finale (6)
  assert.deepEqual([fine.round, fine.tecnicheAttive], [6, [{ id: 'aura-di-resistenza', dal: 4, al: 7 }]]);
  assert.deepEqual(durateCarta(fine, null, dati).map(testoDurata), ['Aura di Resistenza · 2 Round']);
  // non si azzera da sola; «Nuovo Round» della scheda la fa scadere al Round 8, «Termina le durate» subito
  const m = { pv: 20, pm: 20, puntiEroe: 3, tecniche: ['aura-di-resistenza', 'pelle-di-rinoceronte'] };
  let x = nuovoRoundSessione(fine, m);
  assert.equal(x.tecnicheAttive.length, 1);
  x = nuovoRoundSessione(x, m);
  assert.deepEqual([x.round, x.tecnicheAttive], [8, []]);
  assert.deepEqual(terminaDurate(fine).tecnicheAttive, []);
});

test('inizio dello scontro: le durate già in corso passano sul Round 1 dello scontro con i Round che restano', () => {
  const pg = attivaTecnica(sc, sessione({ round: 7 }), aura, dati); // contatore della scheda: Round 7–10
  const r = riallinea(pg, 1);
  assert.deepEqual([r.round, r.tecnicheAttive, r.ultimaTecnica], [1, [{ id: 'aura-di-resistenza', dal: 1, al: 4 }], { id: 'aura-di-resistenza', round: 1 }]);
  assert.deepEqual(durateCarta(pg, null, dati).map(testoDurata), durateCarta(r, null, dati).map(testoDurata));
  assert.equal(riallinea(r, 1), r); // idempotente
});

test('Stati del PG con durata nello scontro: fino alla fine del Round R + N (§5.18), visibili dalla scheda e scaduti', () => {
  const stordito = dati.regole.stati.elenco.find((x) => x.id === 'stordito');
  let s = finoAlRound(scontroConAiko(), 2);
  s = registraDurata(s, 'pg:Aiko-Tenzan', stordito, vivo(2), T0, dati); // Round 2–4
  let coll = collegamentoScontro(s, 'Aiko-Tenzan');
  assert.deepEqual(coll.durate, [{ stato: 'stordito', nome: 'Stordito', al: 4, rimasti: 3 }]);
  s = finoAlRound(s, 4);
  const prima = collegamentoScontro(s, 'Aiko-Tenzan');
  assert.equal(prima.durate[0].rimasti, 1);
  s = finoAlRound(s, 5);
  coll = collegamentoScontro(s, 'Aiko-Tenzan');
  assert.deepEqual([coll.durate, statiScaduti(prima, coll)], [[], ['Stordito']]);
});

test('senza server, o con il PG fuori dallo scontro: la sessione resta la stessa e il contatore è quello di sempre', () => {
  const pg = attivaTecnica(sc, sessione({ round: 2 }), aura, dati);
  assert.equal(collegamentoScontro(null, 'Aiko-Tenzan'), null);
  assert.equal(collegamentoScontro(scontroConAiko(), 'Altro-Pg'), null);
  assert.equal(alRound(pg, undefined), pg);
  assert.equal(alRound(pg, 1), pg); // un Round più indietro non cambia nulla
  // il contatore della scheda fa quello che faceva: Aura dal Round 2 alla fine del Round 5
  const m = { pv: 20, pm: 20, puntiEroe: 3, tecniche: ['aura-di-resistenza'] };
  let x = pg;
  for (let i = 0; i < 3; i++) x = nuovoRoundSessione(x, m);
  assert.deepEqual([x.round, x.tecnicheAttive.length], [5, 1]);
  assert.deepEqual(nuovoRoundSessione(x, m).tecnicheAttive, []);
});

test('nessun doppio conteggio: la vista al Round è idempotente, e due «Avanti» sulla stessa revisione fanno un Round solo', () => {
  const pg = attivaTecnica(sc, alRound(sessione(), 2), aura, dati);
  assert.deepEqual(alRound(alRound(pg, 4), 4), alRound(pg, 4));
  assert.deepEqual(alRound(alRound(pg, 3), 4), alRound(pg, 4));
  // il giocatore salva la vista del Round 4 (per esempio con un'altra modifica): le durate non si spostano
  assert.deepEqual(alRound(pg, 4).tecnicheAttive, pg.tecnicheAttive);
});

// server con cartelle temporanee: la revisione decide chi arriva prima
const cartelle = ['personaggi', 'tavolo', 'scontri'].map((n) => mkdtempSync(join(tmpdir(), `mutant-round-${n}-`)));
let server;
let base;
before(async () => {
  const [cartella, tavolo, scontri] = cartelle;
  server = creaServer({ cartella, tavolo, scontri });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); for (const d of cartelle) rmSync(d, { recursive: true, force: true }); });
const put = async (s) => { const r = await fetch(`${base}/api/scontri/${s.id}`, { method: 'PUT', body: JSON.stringify(s) }); return { status: r.status, corpo: await r.json() }; };

test('avanzamento concorrente: due finestre della plancia premono «Avanti» insieme, il Round avanza una volta', async () => {
  const salvato = (await put(scontroConAiko())).corpo;
  const a = await put(avanti(salvato, T0));
  const b = await put(avanti(salvato, T0)); // stessa revisione: conflitto, la seconda ricarica
  assert.deepEqual([a.status, a.corpo.round, b.status, b.corpo.attuale.round], [200, 2, 409, 2]);
});

test('file del PG: la plancia cambia la sessione (inizio, fine, «Termina le durate») e non scrive se non cambia nulla', () => {
  const testo = readFileSync(new URL('../esempi/Aiko-Tenzan_liv5_2026-10-02.json', import.meta.url), 'utf8');
  const sessioneDi = (t) => vistaPlancia(t, dati, 'Aiko-Tenzan_liv5_2026-10-02.json').sessione;
  assert.equal(testoConSessioneDa(testo, (x) => x, dati), null); // nessun cambiamento, nessuna scrittura
  // Aiko attiva Radici della Montagna al Round 7 della sua scheda; lo scontro comincia: Round 1, stessi Round rimasti
  const prima = testoConSessioneDa(testo, (x) => ({ ...x, round: 7, tecnicheAttive: [{ id: 'radici-della-montagna', dal: 7, al: 10 }] }), dati);
  const inizio = testoConSessioneDa(prima, (x) => riallinea(x, 1), dati);
  assert.deepEqual([sessioneDi(inizio).round, sessioneDi(inizio).tecnicheAttive], [1, [{ id: 'radici-della-montagna', dal: 1, al: 4 }]]);
  assert.equal(testoConSessioneDa(inizio, (x) => riallinea(x, 1), dati), null); // già allineata
  // fine dello scontro al Round 3: la sessione passa al Round 3, la Tecnica resta con 2 Round
  const fine = testoConSessioneDa(inizio, (x) => alRound(x, 3), dati);
  assert.deepEqual([sessioneDi(fine).round, durateCarta(sessioneDi(fine), null, dati).map(testoDurata)], [3, ['Radici della Montagna · 2 Round']]);
  assert.deepEqual(sessioneDi(testoConSessioneDa(fine, terminaDurate, dati)).tecnicheAttive, []);
});
