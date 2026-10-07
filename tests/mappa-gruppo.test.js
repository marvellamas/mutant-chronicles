// Selezione multipla e spostamento di gruppo (richiesta di Marcello del 07/10/2026; src/mappa/gruppo.js): rettangolo,
// aggiunta e rimozione (Maiusc+clic), formazione, collisioni (quadretto libero più vicino), un solo Ctrl+Z, una riga nel
// registro. Maiusc per il token singolo è il movimento libero di sempre (src/mappa/annulla.js → muoviToken, libero).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { tokenNelRettangolo, alternaSelezione, spostaGruppo } from '../src/mappa/gruppo.js';
import { annullaUltima, muoviToken } from '../src/mappa/annulla.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { muriEffettivi } from '../src/mappa/porte.js';
import { inBase64, rettangolo, nuovaMaschera } from '../src/mappa/celle.js';
import { nuovoScontro, rigaGruppo } from '../src/scontro.js';

const { dati } = await datiReali();
const C = 20, R = 12;
const tok = (id, q, ingombro = 1) => ({ id, q, ingombro, nascosto: false, rif: { tipo: 'partecipante', id } });
const scena = (token, o = {}) => ({ ...nuovaScena({ id: 'g', nome: 'G', colonne: C, righe: R, nebbia: 'scoperta', dati }), revisione: 0, token, ...o });
const posizioni = (s) => Object.fromEntries(s.token.map((t) => [t.id, t.q.join(',')]));

test('rettangolo: i token che toccano il rettangolo (anche gli ingombri grandi); Maiusc+clic aggiunge e toglie', () => {
  const s = scena([tok('pg:a', [1, 1]), tok('pg:b', [3, 2]), tok('nem:x:1', [8, 8], 2), tok('nem:x:2', [15, 1])]);
  assert.deepEqual(tokenNelRettangolo(s, [0.5, 0.5], [4.2, 3.4]), ['pg:a', 'pg:b']);
  assert.deepEqual(tokenNelRettangolo(s, [9.5, 9.5], [9.8, 9.8]), ['nem:x:1'], 'un 2 × 2 toccato nel suo secondo Q');
  assert.deepEqual(tokenNelRettangolo(s, [4.2, 3.4], [0.5, 0.5]), ['pg:a', 'pg:b'], 'trascinato al contrario');
  let sel = alternaSelezione(new Set(['pg:a']), 'pg:b');
  assert.deepEqual([...sel], ['pg:a', 'pg:b']);
  sel = alternaSelezione(sel, 'pg:a');
  assert.deepEqual([...sel], ['pg:b']);
});

test('spostamento di gruppo: la formazione resta, un solo Ctrl+Z, la scena resta valida', () => {
  const s = scena([tok('pg:a', [1, 1]), tok('pg:b', [2, 1]), tok('pg:c', [1, 2]), tok('nem:x:1', [10, 5])]);
  const r = spostaGruppo(s, ['pg:a', 'pg:b', 'pg:c'], [12, 6], muriEffettivi(s), dati);
  assert.deepEqual(posizioni(r.scena), { 'pg:a': '13,7', 'pg:b': '14,7', 'pg:c': '13,8', 'nem:x:1': '10,5' });
  assert.deepEqual([r.mossi.length, r.aggiustati.length, r.fermi.length], [3, 0, 0]);
  assert.equal(validaScena(r.scena, dati), null);
  assert.equal(r.scena.movimenti.length, 0, 'libero: niente conteggio dei Q');
  const u = annullaUltima(r.scena);
  assert.equal(u.testo, 'spostamento di 3 token');
  assert.deepEqual(posizioni(u.scena), posizioni(s));
  // nessuno spostamento
  assert.equal(spostaGruppo(s, ['pg:a'], [0, 0], muriEffettivi(s), dati).scena, s);
});

test('collisioni: un quadretto d’arrivo murato, occupato o fuori dalla griglia → il libero più vicino', () => {
  const muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 6, 0, 6, R - 1, true));
  const s = scena([tok('pg:a', [1, 1]), tok('pg:b', [2, 1]), tok('pg:c', [3, 1]), tok('nem:x:1', [9, 1])], { muri });
  // di 5 a destra: a → (6,1) muro, b → (7,1), c → (8,1); a va al libero più vicino
  const r = spostaGruppo(s, ['pg:a', 'pg:b', 'pg:c'], [5, 0], muriEffettivi(s), dati);
  const p = posizioni(r.scena);
  assert.deepEqual([p['pg:b'], p['pg:c']], ['7,1', '8,1']);
  assert.deepEqual(r.aggiustati.map((x) => x.id), ['pg:a']);
  assert.notEqual(p['pg:a'], '6,1');
  assert.equal(validaScena(r.scena, dati), null);
  // un token del gruppo non finisce sopra un altro: di 6, c → (9,1) occupato dal nemico
  const r2 = spostaGruppo(s, ['pg:a', 'pg:b', 'pg:c'], [6, 0], muriEffettivi(s), dati);
  const occ = r2.scena.token.map((t) => t.q.join(','));
  assert.equal(new Set(occ).size, occ.length, 'nessun Q condiviso');
  assert.ok(r2.aggiustati.some((x) => x.id === 'pg:c'));
  // fuori dalla griglia: resta dentro
  const r3 = spostaGruppo(s, ['pg:a'], [-5, -5], muriEffettivi(s), dati);
  assert.deepEqual(r3.scena.token.find((t) => t.id === 'pg:a').q, [0, 0]);
});

test('riga del registro e Maiusc per il singolo (movimento libero, senza conteggio)', () => {
  const sc = rigaGruppo(nuovoScontro({ id: 'sc', pg: [] }), { quanti: 4, aggiustati: 1 });
  assert.match(sc.registro.at(-1).testo, /^Mappa: spostati 4 token insieme \(1 al quadretto libero più vicino\); libero, non conta nel movimento\.$/);
  const s = scena([tok('pg:a', [1, 1])]);
  const m = muoviToken(s, 'pg:a', { a: [15, 9], costo: null, fascia: null, scontro: 'sc', round: 1, libero: true }, dati);
  assert.deepEqual(m.token[0].q, [15, 9]);
});
