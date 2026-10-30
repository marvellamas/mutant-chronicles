// A.197 (risposta di Davide del 30/10/2026): il premio di fine Atto non si duplica. Blocco (non più solo avviso) della seconda
// assegnazione allo stesso personaggio nello stesso Atto, anche da un'altra partita; il premio spetta anche agli assenti;
// rettifica tracciata con il motivo; un premio aggiuntivo si registra a parte (Bonus). Il blocco sta nel server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { premiDoppi, nuoviPremiDoppi, premioBloccato, rettificaPremio, haPremio, premioGiaDato, componentiGiocatore } from '../src/px-partita.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const p = dati.px_partita;
const partita = (id, atto, premi, extra = {}) => ({ id, titolo: `Partita ${id}`, atto, premiAtto: premi, partecipanti: { a: { presente: true }, b: { presente: false } }, ...extra });

test('premi doppi: lo stesso personaggio, lo stesso Atto, due partite — presente o assente nella seconda', () => {
  const m1 = partita('m1', 'IV', { a: true });
  const m2 = partita('m2', 'IV', { a: true, b: true });
  const d = premiDoppi([m1, m2]);
  assert.deepEqual(d.map((x) => [x.atto, x.id, x.partite.map((y) => y.id)]), [['IV', 'a', ['m1', 'm2']]]);
  assert.deepEqual(premiDoppi([m1, partita('m3', 'V', { a: true })]), [], 'un altro Atto è un altro premio');
  // anche un assente: b è assente in m2 ma il premio è dell'Atto
  assert.deepEqual(premiDoppi([partita('x', 'IV', { b: true }), partita('y', 'IV', { b: true })]).map((x) => x.id), ['b']);
});

test('nuovi premi doppi: un salvataggio non ne fa entrare di nuovi; quelli già nell’archivio non lo bloccano', () => {
  const vecchie = [partita('m1', 'IV', { a: true }), partita('m2', 'IV', {})];
  const nuove = [partita('m1', 'IV', { a: true }), partita('m2', 'IV', { a: true })];
  assert.equal(nuoviPremiDoppi(nuove, vecchie).length, 1);
  assert.equal(nuoviPremiDoppi(vecchie, vecchie).length, 0);
  const preesistente = [partita('m1', 'IV', { a: true }), partita('m2', 'IV', { a: true })];
  assert.equal(nuoviPremiDoppi(preesistente, preesistente).length, 0, 'il doppione di prima resta finché non si rettifica');
  assert.equal(nuoviPremiDoppi([...preesistente, partita('m3', 'IV', { b: true })], preesistente).length, 0);
  assert.equal(nuoviPremiDoppi([...preesistente, partita('m3', 'IV', { a: true })], preesistente).length, 0, 'lo stesso doppione, non uno nuovo');
});

test('premio bloccato: già dato in un’altra partita dello stesso Atto, da una partita diversa; non in un altro Atto né nella stessa', () => {
  const m1 = partita('m1', 'IV', { a: true });
  const m2 = partita('m2', 'IV', {});
  assert.equal(premioBloccato(m2, 'a', [m1, m2]), true);
  assert.equal(premioBloccato(m2, 'b', [m1, m2]), false);
  assert.equal(premioBloccato(partita('m3', 'V', {}), 'a', [m1, m2]), false);
  assert.equal(premioBloccato(m1, 'a', [m1, m2]), false, 'nella partita che già lo ha non è «bloccato»: è suo');
});

test('rettifica: toglie il premio da quella partita, scrive il registro con data e motivo, non muta; senza motivo no', () => {
  const m1 = partita('m1', 'IV', { a: true }, { statoAssegnazione: 'assegnata' });
  const m2 = partita('m2', 'IV', {});
  const db = { giocatori: [{ id: 'a' }], partite: [m1, m2] };
  assert.throws(() => rettificaPremio(db, { atto: 'IV', id: 'a', dallaPartitaId: 'm1', motivo: '  ' }), /motivo/);
  const nuovo = rettificaPremio(db, { atto: 'IV', id: 'a', dallaPartitaId: 'm1', motivo: 'dato per errore a una partita di prova', quando: '2026-10-30T10:00:00.000Z' });
  assert.equal(haPremio(db.partite[0], 'a'), true, 'l’archivio di partenza non cambia');
  assert.equal(haPremio(nuovo.partite[0], 'a'), false);
  assert.equal(nuovo.rettifichePremi.length, 1);
  assert.deepEqual([nuovo.rettifichePremi[0].pg, nuovo.rettifichePremi[0].atto, nuovo.rettifichePremi[0].partitaId, nuovo.rettifichePremi[0].motivo, nuovo.rettifichePremi[0].daRiassegnare],
    ['a', 'IV', 'm1', 'dato per errore a una partita di prova', true]);
  // ora si può dare in m2: nessun blocco, nessun doppione
  assert.equal(premioBloccato(nuovo.partite[1], 'a', nuovo.partite), false);
  assert.deepEqual(premiDoppi([nuovo.partite[0], { ...nuovo.partite[1], premiAtto: { a: true } }]), []);
  assert.throws(() => rettificaPremio(db, { atto: 'V', id: 'a', dallaPartitaId: 'm1', motivo: 'x' }), /non c’è/);
  assert.throws(() => rettificaPremio(db, { atto: 'IV', id: 'b', dallaPartitaId: 'm1', motivo: 'x' }), /non c’è/);
});

test('l’assente prende il premio dell’Atto (è dell’Atto, non della partita) e un premio in più va nel Bonus, a parte', () => {
  const m = partita('m1', 'IV', { b: true }, { partecipanti: { a: { presente: true, partecipazione: 3, interpretazione: 3, contributo: 3, eccezionale: 0 }, b: { presente: false } } });
  const b = componentiGiocatore(m, 'b', 600, p);
  assert.ok(b.premio > 0, 'l’assente ha il premio');
  assert.equal(b.pxBonus, 0);
  m.partecipanti.b = { presente: true, partecipazione: 3, interpretazione: 3, contributo: 3, eccezionale: 2 };
  const b2 = componentiGiocatore(m, 'b', 600, p);
  assert.equal(b2.premio, b.premio, 'il Bonus non tocca il premio di fine Atto');
  assert.ok(b2.pxBonus > 0);
});

// ---- il server: il blocco vale anche da un’altra partita ------------------------------------------------------------
const radice = mkdtempSync(join(tmpdir(), 'mutant-premio-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srv, base;
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  srv = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster: () => true });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => { await new Promise((ok) => srv.close(ok)); rmSync(radice, { recursive: true, force: true }); });
const put = (db) => fetch(`${base}/api/px`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(db) });

test('server: la seconda assegnazione dello stesso premio è rifiutata (409) e l’archivio non cambia; la rettifica la rende possibile', async () => {
  const base1 = { versione: 1, giocatori: [{ id: 'a' }, { id: 'b' }], partite: [partita('m1', 'IV', { a: true }), partita('m2', 'IV', {})] };
  assert.equal((await put(base1)).status, 200);
  // tentativo da un'altra partita
  const doppio = { ...base1, partite: [base1.partite[0], partita('m2', 'IV', { a: true })] };
  const r = await put(doppio);
  assert.equal(r.status, 409);
  const corpo = await r.json();
  assert.match(corpo.errore, /già stato dato a a/);
  assert.equal(corpo.doppi[0].id, 'a');
  assert.deepEqual(JSON.parse(readFileSync(join(c.px, 'px.json'), 'utf8')), base1, 'l’archivio è rimasto com’era');
  // a un assente (b non è presente in nessuna delle due): stesso blocco
  assert.equal((await put({ ...base1, partite: [partita('m1', 'IV', { b: true }), partita('m2', 'IV', { b: true })] })).status, 409);
});

test('server: dopo la rettifica (motivo registrato) il premio si dà nell’altra partita', async () => {
  const m1 = partita('n1', 'V', { a: true });
  const m2 = partita('n2', 'V', {});
  const db0 = { versione: 1, giocatori: [{ id: 'a' }], partite: [m1, m2] };
  assert.equal((await put(db0)).status, 200);
  const rettificato = rettificaPremio(db0, { atto: 'V', id: 'a', dallaPartitaId: 'n1', motivo: 'dato per sbaglio' });
  rettificato.partite[1] = { ...rettificato.partite[1], premiAtto: { a: true } };
  assert.equal((await put(rettificato)).status, 200);
  const salvato = JSON.parse(readFileSync(join(c.px, 'px.json'), 'utf8'));
  assert.equal(salvato.rettifichePremi[0].motivo, 'dato per sbaglio');
  assert.equal(premioGiaDato(salvato.partite[1], salvato.partite).length, 0);
  assert.deepEqual(premiDoppi(salvato.partite), []);
});
