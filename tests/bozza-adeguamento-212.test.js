import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 212 — la bozza dell'adeguamento è di un personaggio solo, e sopravvive a un ricaricamento.
// Trovato dalla prova sulla copia: cinque punti assegnati a Dimitri comparivano nella scheda di Pablo («9 punti») e «Conferma» li avrebbe scritti a lui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bozzaDi, impostaBozza, leggiBozzaSalvata, salvaBozza, chiaveBozza } from '../src/bozza-adeguamento.js';

const storage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };

test('LA BOZZA NON PASSA DA UN PERSONAGGIO ALL\'ALTRO: assegnati a Dimitri, aprendo Pablo non c\'è niente', () => {
  const st = { bozza: null, di: null };
  assert.equal(bozzaDi(st, 'dimitri', () => null), null);
  impostaBozza(st, 'dimitri', { Atletica: 3, Medicina: 2 });
  assert.deepEqual(bozzaDi(st, 'dimitri', () => null), { Atletica: 3, Medicina: 2 });
  assert.equal(bozzaDi(st, 'pablo', () => null), null, 'la scheda di Pablo non deve vedere i punti di Dimitri');
});

test('…e il controllo SA fallire: la bozza globale di prima (il mutante) la fa passare', () => {
  let globale = null; // com'era: una variabile sola per tutta l'app
  const bozzaGlobale = () => globale;
  globale = { Atletica: 3 };
  assert.deepEqual(bozzaGlobale(), { Atletica: 3 }); // «Pablo» la vede: è il difetto
  const st = { bozza: null, di: null };
  impostaBozza(st, 'dimitri', { Atletica: 3 });
  assert.equal(bozzaDi(st, 'pablo', () => null), null, 'la versione corretta non la vede');
});

test('un ricaricamento a metà non perde la bozza; un altro adeguamento o un altro personaggio sì', () => {
  const s = storage();
  salvaBozza(s, 'dimitri', 'riga-1', { Atletica: 3 });
  assert.deepEqual(leggiBozzaSalvata(s, 'dimitri', 'riga-1'), { Atletica: 3 });
  assert.equal(leggiBozzaSalvata(s, 'dimitri', 'riga-2'), null, 'adeguamento annullato e rifatto: la bozza vecchia non vale');
  assert.equal(leggiBozzaSalvata(s, 'pablo', 'riga-1'), null);
  // pagina nuova: lo stato in memoria è vuoto e la bozza torna dallo storage
  const st = { bozza: null, di: null };
  assert.deepEqual(bozzaDi(st, 'dimitri', () => leggiBozzaSalvata(s, 'dimitri', 'riga-1')), { Atletica: 3 });
  salvaBozza(s, 'dimitri', 'riga-1', null);
  assert.equal(s._m.has(chiaveBozza('dimitri')), false, 'confermato: la bozza si toglie');
});

test('uno storage che manca o è guasto non rompe niente: si perde soltanto la bozza', () => {
  assert.equal(leggiBozzaSalvata(null, 'x', null), null);
  assert.doesNotThrow(() => salvaBozza(null, 'x', null, { a: 1 }));
  const guasto = { getItem() { throw new Error('bloccato'); }, setItem() { throw new Error('bloccato'); }, removeItem() { throw new Error('bloccato'); } };
  assert.equal(leggiBozzaSalvata(guasto, 'x', null), null);
  assert.doesNotThrow(() => salvaBozza(guasto, 'x', null, { a: 1 }));
  const rotto = storage(); rotto.setItem(chiaveBozza('x'), '{non json'); assert.equal(leggiBozzaSalvata(rotto, 'x', null), null);
  rotto.setItem(chiaveBozza('x'), JSON.stringify({ riga: null, punti: [1, 2] })); assert.equal(leggiBozzaSalvata(rotto, 'x', null), null, 'una lista non è una bozza');
});

test('l\'app non tocca più una bozza globale: passa solo da bozzaAdeguamentoDi / impostaBozzaAdeguamento', () => {
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.equal(/stato\.bozzaAdeguamento\b/.test(app), false, 'stato.bozzaAdeguamento è la variabile unica di prima');
  assert.match(app, /bozzaAdeguamento: bozzaAdeguamentoDi\(\)/);
});
