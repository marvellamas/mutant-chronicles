// Tavolo del Master, pezzo 1 (docs/tavolo-direttore.md): la plancia legge gli stessi valori di
// calcolaScheda (src/tavolo.js → vistaPlancia), la selezione «al tavolo» si salva sul server e senza
// server l'app non offre la plancia.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vistaPlancia } from '../src/tavolo.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
// i personaggi d'esempio del repo (esempi/, tools/genera_esempi.mjs): a distanza, corpo a corpo, Taumaturgo, cibernetica
const FILE = {
  Rhea: 'esempi/Rhea-Valdis_liv5_2026-10-02.json',
  Torvald: 'esempi/Torvald-Krane_liv6_2026-10-02.json',
  Anselmo: 'esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json',
  Nadia: 'esempi/Nadia-Ferro_liv4_2026-10-02.json',
};
const leggi = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

/** Lo stesso calcolo della scheda digitale, fatto qui a mano per il confronto. */
function attesi(testo) {
  const p = deserializzaPersonaggio(testo);
  const { scelte } = normalizza(p.creazione, dati);
  const riposo = calcolaScheda({ creazione: scelte, livelli: p.livelli }, dati);
  const m = massimiSessione(riposo, scelte, dati);
  const sessione = allineaSessione(p.sessione, m);
  return { scheda: calcolaScheda({ creazione: scelte, livelli: p.livelli, sessione }, dati), sessione, m };
}

for (const [nome, f] of Object.entries(FILE)) {
  test(`plancia, ${nome}: gli stessi valori di calcolaScheda, con la provenienza`, () => {
    const testo = leggi(f);
    const v = vistaPlancia(testo, dati, 'x_liv1_2026-10-01.json');
    const { scheda, sessione, m } = attesi(testo);
    assert.equal(v.completa, true);
    assert.deepEqual([v.pv, v.pe], [{ attuali: sessione.pvAttuali, massimo: m.pv }, { attuali: sessione.puntiEroe, massimo: m.puntiEroe }]);
    assert.deepEqual(v.pm, m.pm ? { attuali: sessione.pmAttuali, massimo: m.pm } : null);
    const ar = scheda.equipaggiamento.arEffettiva ?? scheda.equipaggiamento.ar;
    assert.deepEqual(v.ar.valori.map((x) => [x.id, x.valore]), ar.valori.map((x) => [x.id, x.valore]));
    assert.ok(v.ar.valori.every((x) => x.provenienza?.righe));
    const difese = scheda.abilita.find((a) => a.nome === (scheda.equipaggiamento.abilitaDifese ?? 'Difese'));
    assert.deepEqual([v.difese.valore, v.difese.provenienza.totale], [difese.effettivo, difese.effettivo]);
    assert.deepEqual(v.armi.map((a) => [a.nome, a.va]), scheda.equipaggiamento.armi.filter((a) => !a.daScudo).map((a) => [a.nome, a.vaEffettivo ?? a.va]));
    assert.deepEqual(v.classi, scheda.classi.map((c) => ({ nome: c.nome, grado: c.grado })));
  });
}

test('plancia: la sessione del file cambia i valori effettivi (PV, Ferita, Stati) come nella scheda', () => {
  const o = JSON.parse(leggi(FILE.Nadia));
  const base = vistaPlancia(JSON.stringify(o), dati);
  o.sessione = { ...base.sessione, pvAttuali: 3, ferite: 1, statiAttivi: ['a-terra'] };
  const v = vistaPlancia(JSON.stringify(o), dati);
  assert.equal(v.pv.attuali, 3);
  assert.deepEqual([v.ferite.grado, v.ferite.nome], [1, dati.regole.ferite.stati[0].nome]);
  assert.ok(v.stati.some((s) => s.id === 'a-terra'));
  // la Ferita (e A Terra) cambiano le Difese effettive come in calcolaScheda
  const { scheda } = attesi(JSON.stringify(o));
  assert.equal(v.difese.valore, scheda.abilita.find((a) => a.nome === 'Difese').effettivo);
  assert.ok(v.difese.valore < base.difese.valore);
});

const tavolo = mkdtempSync(join(tmpdir(), 'mutant-tavolo-'));
const cartella = mkdtempSync(join(tmpdir(), 'mutant-personaggi-'));
let server;
let base;
before(async () => {
  server = creaServer({ cartella, tavolo });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(tavolo, { recursive: true, force: true }); rmSync(cartella, { recursive: true, force: true }); });

test('selezione «al tavolo»: vuota all’inizio, salvata sul server e riletta; dati non validi rifiutati', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/tavolo`)).json(), { versione: 1, personaggi: [] });
  const w = await fetch(`${base}/api/tavolo`, { method: 'PUT', body: JSON.stringify({ personaggi: ['Rhea-Valdis', 'Torvald-Krane', 'Rhea-Valdis'] }) });
  assert.deepEqual(await w.json(), { versione: 1, personaggi: ['Rhea-Valdis', 'Torvald-Krane'] });
  assert.deepEqual(await (await fetch(`${base}/api/tavolo`)).json(), { versione: 1, personaggi: ['Rhea-Valdis', 'Torvald-Krane'] });
  assert.deepEqual(JSON.parse(readFileSync(join(tavolo, 'sessione.json'), 'utf8')).personaggi, ['Rhea-Valdis', 'Torvald-Krane']);
  assert.equal((await fetch(`${base}/api/tavolo`, { method: 'PUT', body: '{"personaggi": "Rhea-Valdis"}' })).status, 400);
  // la cartella del tavolo non si serve come file statico
  assert.equal((await fetch(`${base}/tavolo/sessione.json`)).status, 404);
});

test('senza server la plancia non c’è: /api/ping assente → niente server (pulsante e rotta nascosti)', async () => {
  const fetchVero = globalThis.fetch;
  try {
    // server statico qualunque: versione.json c'è, ma senza X-Mutant-Server (nessuna richiesta a /api)
    const chieste = [];
    globalThis.fetch = async (u) => { chieste.push(String(u)); return String(u).startsWith('versione.json') ? new Response('{}', { status: 200 }) : new Response('Non trovato', { status: 404 }); };
    const senza = await import('../src/ui/cartella.js?senza-server');
    assert.equal(await senza.serverCartella(), false);
    assert.equal(await senza.elencoCartella(), null);
    assert.deepEqual(chieste, ['versione.json']);
    // il server di Mutant si riconosce dall'intestazione X-Mutant-Server (HEAD su versione.json), poi /api/ping
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true, app: 'mutant', cartella: 'personaggi' }), { status: 200, headers: { 'X-Mutant-Server': '1' } });
    const con = await import('../src/ui/cartella.js?con-server');
    assert.equal(await con.serverCartella(), true);
  } finally {
    globalThis.fetch = fetchVero;
  }
  // l'app mostra il pulsante e apre #/tavolo solo con stato.cartella (src/ui/app.js)
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /stato\.cartella \? h\('button', \{ type: 'button', class: 'btn btn-tavolo-direttore'/);
  assert.match(app, /if \(!stato\.cartella\) \{\s+stato\.messaggioHome = \{ tipo: 'attenzione', testo: 'Il Tavolo del Master serve il server di Mutant/);
});
