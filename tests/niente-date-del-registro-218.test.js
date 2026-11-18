// Lotto 218: un test non contiene un dato che il registro dei manuali cambia da solo.
// Il 17/11 l'E&L è cambiato su Drive, noi lo abbiamo riscaricato e `tests/ricognizione-scambio-209.test.js` è diventato
// rosso: aveva dentro la data dell'E&L scritta a mano. Un test che diventa rosso ogni volta che Davide scrive è un test
// che si impara a ignorare. Qui sotto la regola, provata in rosso: se il registro cambia, nessun test deve accorgersene.
import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { registro } from '../tools/manuali.mjs';

const CARTELLA = new URL('./', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const reg = registro();

/** Ogni file di test con il suo testo (questo file escluso: cita le regole per spiegarle). */
const test_ = readdirSync(CARTELLA)
  .filter((n) => n.endsWith('.test.js') && n !== 'niente-date-del-registro-218.test.js')
  .map((n) => ({ n, t: readFileSync(join(CARTELLA, n), 'utf8') }));

/** Le righe di un testo che contengono `cerca`, senza i commenti. */
function righeCon(testo, cerca) {
  return testo.split('\n').map((r, i) => ({ r, i: i + 1 })).filter(({ r }) => r.includes(cerca) && !/^\s*(\/\/|\*)/.test(r));
}

/** Una regola: la funzione che dice quali righe di un testo violano. Esportata per provarla in rosso. */
export function violazioni(testo, valori) {
  const trovate = [];
  for (const [che, v] of valori) {
    for (const { r, i } of righeCon(testo, v)) trovate.push(`riga ${i}: contiene ${che} «${v}»`);
  }
  return trovate;
}

/** I valori che il registro può cambiare: data al secondo, data ISO senza millisecondi, impronta del testo. */
function valoriDelRegistro() {
  const out = [];
  for (const v of [...reg.manuali, ...reg.schede, ...reg.scambio]) {
    if (v.modificato) {
      out.push([`la data di ${v.id}`, v.modificato]);
      out.push([`la data di ${v.id}`, v.modificato.replace(/\.\d+Z$/, 'Z')]);
    }
    if (v.impronta) out.push([`l'impronta di ${v.id}`, v.impronta]);
  }
  return out.filter(([, x]) => x.length > 8);
}

test('nessun test contiene la data o l\'impronta di un documento del registro, scritta a mano', () => {
  const valori = valoriDelRegistro();
  assert.ok(valori.length >= 20, `valori del registro letti: ${valori.length} (un controllo verde su zero voci ci ha ingannato tre volte)`);
  const guai = [];
  for (const { n, t } of test_) for (const g of violazioni(t, valori)) guai.push(`${n}, ${g}`);
  assert.deepEqual(guai, [], 'chiedi il valore al registro (registro(), versioneManuale()), non copiarlo nel test: alla prossima pubblicazione diventerebbe rosso');
});

test('la regola vede il difetto: un test con la data dell\'E&L dentro viene preso (prova in rosso)', () => {
  const el = reg.scambio.find((v) => v.id === 'e-l');
  const cattivo = `const r = referto(drive({ 'e-l': '${el.modificato}' }));\n`;
  assert.equal(violazioni(cattivo, valoriDelRegistro()).length >= 1, true);
  const buono = `const r = referto(drive({ 'e-l': unGiornoDopo(EL.modificato) }));\n`;
  assert.deepEqual(violazioni(buono, valoriDelRegistro()), []);
});

test('i test che leggono il registro non scrivono una data a mano per i documenti di scambio', () => {
  // Un test che fabbrica l'elenco di Drive con una data ISO letterale per 'e-l' o 'per-davide' ha lo stesso difetto
  // anche quando la data oggi non coincide con quella del registro: coinciderà il giorno che Davide scrive quella.
  const guai = [];
  for (const { n, t } of test_) {
    t.split('\n').forEach((r, i) => {
      if (/^\s*\/\//.test(r)) return;
      if (/['"](e-l|per-davide)['"]\s*:\s*['"]\d{4}-\d\d-\d\dT/.test(r)) guai.push(`${n}, riga ${i + 1}: data ISO scritta per un documento di scambio`);
    });
  }
  assert.deepEqual(guai, []);
});
