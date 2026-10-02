// Tavolo del Master, pezzo 4: il colpo applicato dalla plancia. Per un PG si riscrive il suo file in personaggi/
// con la revisione (data di modifica: 409 se è cambiato) e la scheda lo rilegge; per un nemico i valori stanno
// nello scontro. Ogni colpo è una riga di registro e si può annullare.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applicaColpo, testoColpo } from '../src/danno.js';
import { vistaPlancia, testoConSessione } from '../src/tavolo.js';
import { nuovoScontro, aggiungiNemici, registraColpo, annullaUltimoColpo, validaScontro } from '../src/scontro.js';
import { deserializzaPersonaggio } from '../src/character.js';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const FILE = 'Torvald-Krane_liv6_2026-10-02.json';
const esempio = (f) => new URL(`../esempi/${f}`, import.meta.url);
const predone = JSON.parse(readFileSync(esempio('nemici/predone-delle-lande.json'), 'utf8'));
const colpo = (danni, extra = {}) => ({ danni, natura: 'Naturale', tipo: 'ravvicinato', difesa: 'nessuna', proprieta: [], ...extra });

test('testoConSessione: cambia solo PV, Ferite e Stati della sessione, con la serializzazione dell’app', () => {
  const testo = readFileSync(esempio(FILE), 'utf8');
  const v = vistaPlancia(testo, dati, FILE);
  const nuovo = testoConSessione(testo, { pvAttuali: 5, ferite: 2, statiAttivi: ['sanguinamento'] }, dati);
  const p = deserializzaPersonaggio(nuovo);
  assert.deepEqual([p.sessione.pvAttuali, p.sessione.ferite, p.sessione.statiAttivi], [5, 2, ['sanguinamento']]);
  // tutto il resto è com'era: scelte, livelli, versioni dei dati, altri valori di sessione
  const prima = JSON.parse(testo);
  const dopo = JSON.parse(nuovo);
  assert.deepEqual([dopo.scelte, dopo.livelli, dopo.versioni_dati], [prima.scelte, prima.livelli, prima.versioni_dati]);
  assert.equal(dopo.sessione.puntiEroe, prima.sessione.puntiEroe);
  const w = vistaPlancia(nuovo, dati, FILE);
  assert.deepEqual([w.pv.attuali, w.ferite.grado, w.stati.map((s) => s.id)], [5, 2, ['sanguinamento']]);
  assert.ok(w.difese.valore < v.difese.valore); // la Ferita Importante pesa sulle Difese
});

test('scontro: un colpo a un nemico aggiorna PV e Stati, va nel registro e si annulla', () => {
  let s = aggiungiNemici(nuovoScontro({ id: 'scontro-colpi', pg: [] }), predone, 2);
  const id = s.partecipanti[0].id;
  const b = { nome: 'Predone delle Lande 1', pv: s.partecipanti[0].pv, ferite: null, ar: predone.ar };
  const r = applicaColpo(b, colpo([9]), dati);
  s = registraColpo(s, { bersaglio: id, nome: b.nome, tipo: 'nemico', testo: testoColpo(b.nome, colpo([9]), r), prima: { pv: 12, stati: [] }, dopo: { pv: r.pv.dopo, stati: ['a-terra'] } });
  assert.deepEqual([s.partecipanti[0].pv.attuali, s.partecipanti[0].stati, s.partecipanti[1].pv.attuali], [4, ['a-terra'], 12]);
  assert.match(s.registro.at(-1).testo, /Predone delle Lande 1 colpito \(Naturale\): 9 − AR 1 = 8; PV 12 → 4\./);
  assert.equal(validaScontro(s), null);
  const { scontro, colpo: annullato } = annullaUltimoColpo(s);
  assert.deepEqual([scontro.partecipanti[0].pv.attuali, scontro.partecipanti[0].stati, scontro.colpi.length, annullato.nome], [12, [], 0, 'Predone delle Lande 1']);
  assert.match(scontro.registro.at(-1).testo, /Annullato l’ultimo colpo a Predone delle Lande 1: PV 4 → 12/);
  assert.throws(() => annullaUltimoColpo(scontro), /nessun colpo/);
});

const cartelle = ['personaggi', 'nemici', 'tavolo', 'scontri'].map((x) => mkdtempSync(join(tmpdir(), `mutant-colpo-${x}-`)));
const [cPersonaggi, cNemici, cTavolo, cScontri] = cartelle;
let server;
let base;
before(async () => {
  copyFileSync(esempio(FILE), join(cPersonaggi, FILE));
  server = creaServer({ cartella: cPersonaggi, nemici: cNemici, tavolo: cTavolo, scontri: cScontri });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); for (const d of cartelle) rmSync(d, { recursive: true, force: true }); });

test('colpo su un PG: la plancia riscrive il file con la revisione; una revisione vecchia è rifiutata; la scheda rilegge', async () => {
  const url = `${base}/api/personaggi/${encodeURIComponent(FILE)}`;
  const r1 = await fetch(url);
  const mtime = r1.headers.get('X-Mutant-Mtime');
  const testo = await r1.text();
  assert.ok(mtime);
  const v = vistaPlancia(testo, dati, FILE);
  const ris = applicaColpo({ nome: v.nome, pv: v.pv, ferite: v.ferite.grado, ar: v.ar }, colpo([v.pv.attuali + v.ar.totale + 4]), dati);
  assert.equal(ris.pv.dopo, 0);
  const nuovo = testoConSessione(testo, { pvAttuali: ris.pv.dopo, ferite: ris.ferite.dopo }, dati);
  const w = await fetch(url, { method: 'PUT', body: nuovo, headers: { 'X-Mutant-Mtime': mtime } });
  assert.equal(w.status, 200);
  // la stessa revisione, ormai vecchia: 409 (un'altra finestra o la scheda del giocatore ha scritto)
  const vecchia = await fetch(url, { method: 'PUT', body: testo, headers: { 'X-Mutant-Mtime': mtime } });
  assert.equal(vecchia.status, 409);
  // la scheda (e la plancia) rileggono il file: PV a 0
  const riletto = await (await fetch(url)).text();
  assert.equal(riletto, nuovo);
  assert.equal(vistaPlancia(riletto, dati, FILE).pv.attuali, 0);
  assert.equal(deserializzaPersonaggio(riletto).sessione.pvAttuali, 0);
  // senza l'intestazione la scrittura resta quella di sempre (scheda digitale): nessun controllo
  assert.equal((await fetch(url, { method: 'PUT', body: testo })).status, 200);
});
