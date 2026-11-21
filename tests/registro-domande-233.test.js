import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 233 — «nessuna domanda persa», fatto da un test invece che da una persona che rilegge.
//
// Fino al 232 il conto per numero stava dentro il Doc «Per Davide» (sezione 6) e lo controllava chi lo rileggeva:
// 169 pagine, e tre voci sono rimaste a dire «da applicare» per sei settimane mentre erano applicate. Adesso la
// contabilità sta in docs/registro-domande.md, che è nostro, e questo test la tiene in piedi:
//   1. ogni numero da A.1 all'ultimo usato ha una riga nel registro **oppure** è una voce del Doc (sezioni 1, 2, 3);
//   2. nessun numero sta in tutti e due i posti (il doppio è il modo in cui le due copie divergono);
//   3. le righe del registro sono in ordine e senza ripetizioni.
// L'ultimo numero non è scritto qui: si legge dai due documenti, così il test non invecchia (regola del lotto 218).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const DOC = new URL('../docs/per-davide-nuovo.md', import.meta.url);
const REGISTRO = new URL('../docs/registro-domande.md', import.meta.url);
const righe = (u) => readFileSync(u, 'utf8').split(/\r?\n/);

/** Le righe della tabella del registro: [{ numero, riga }], nell'ordine in cui stanno nel file. */
export function righeRegistro(testo) {
  const out = [];
  for (const r of testo.split(/\r?\n/)) {
    const m = /^\|\s*A\.(\d+)\s*\|/.exec(r);
    if (m) out.push({ n: Number(m[1]), riga: r });
  }
  return out;
}

/** I numeri che nel Doc sono una **voce** (apertura di un capoverso o di un punto elenco) delle sezioni 1, 2 e 3. */
export function vociDelDoc(testo) {
  const righe = testo.split(/\r?\n/);
  const titolo = /^> > ## \*\*(\d)\\?\./;
  let sezione = '0';
  const out = new Set();
  for (const r of righe) {
    const t = titolo.exec(r);
    if (t) sezione = t[1];
    if (!['1', '2', '3'].includes(sezione)) continue;
    const m = /^(?:•\s*)?\*\*(?:A\.)(\d+)\b/.exec(r);
    if (m) out.add(Number(m[1]));
  }
  return out;
}

/** Il primo numero libero, come lo dichiara il Doc («Primo numero libero: **A.N**»): l'ultimo usato è quello prima. */
export function primoLibero(testo) {
  const m = /Primo numero libero:\s*\*\*A\.(\d+)\*\*/.exec(testo);
  if (!m) throw new Error('il Doc non dichiara più il primo numero libero');
  return Number(m[1]);
}

const testoDoc = readFileSync(DOC, 'utf8');
const testoRegistro = readFileSync(REGISTRO, 'utf8');
const registro = righeRegistro(testoRegistro);
const nelDoc = vociDelDoc(testoDoc);
const LIBERO = primoLibero(testoDoc);
const MAX = LIBERO - 1;

test('nessuna domanda persa: ogni numero da A.1 all’ultimo ha una riga nel registro o è una voce del Doc', () => {
  assert.ok(MAX >= 300, `l’ultimo numero usato è A.${MAX}: i due documenti non si leggono più`);
  const oltre = [...registro.map((x) => x.n), ...nelDoc].filter((n) => n >= LIBERO);
  assert.deepEqual(oltre, [], `il Doc dichiara libero A.${LIBERO}, ma questi numeri sono già usati: ${oltre.map((n) => 'A.' + n).join(', ')}`);
  const nelRegistro = new Set(registro.map((x) => x.n));
  const persi = [];
  for (let n = 1; n <= MAX; n++) if (!nelRegistro.has(n) && !nelDoc.has(n)) persi.push('A.' + n);
  assert.deepEqual(persi, [], `numeri senza una riga né nel registro né nel Doc: ${persi.join(', ')}`);
});

test('niente doppio: un numero sta nel registro oppure nel Doc, mai in tutti e due', () => {
  const doppi = registro.map((x) => x.n).filter((n) => nelDoc.has(n));
  assert.deepEqual(doppi, [], `numeri in tutti e due i posti: ${doppi.map((n) => 'A.' + n).join(', ')}`);
});

test('il registro è in ordine e senza ripetizioni', () => {
  const n = registro.map((x) => x.n);
  assert.ok(n.length > 250, `righe lette: ${n.length}`);
  assert.deepEqual(n.filter((x, i) => n.indexOf(x) !== i), [], 'numeri ripetuti nel registro');
  assert.deepEqual([...n], [...n].sort((a, b) => a - b), 'le righe non sono in ordine di numero');
});

test('ogni riga del registro ha le sue cinque colonne, e dice che cosa ne è stato', () => {
  for (const { n, riga } of registro) {
    const c = riga.slice(1, -1).split('|').map((x) => x.trim());
    assert.equal(c.length, 5, `A.${n}: ${c.length} colonne invece di 5`);
    assert.ok(c[1].length >= 3, `A.${n}: manca l’oggetto`);
    assert.ok(c[3].length >= 1, `A.${n}: manca lo stato dell’applicazione`);
  }
});

// I due mutanti: se qualcuno toglie una riga, o la mette in tutti e due i posti, il test lo dice.
test('mutante: tolta una riga dal registro, il controllo se ne accorge', () => {
  const senzaUna = testoRegistro.split(/\r?\n/).filter((r) => !/^\|\s*A\.150\s*\|/.test(r)).join('\n');
  const nelRegistro = new Set(righeRegistro(senzaUna).map((x) => x.n));
  assert.ok(!nelRegistro.has(150) && !nelDoc.has(150), 'A.150 sparirebbe e nessuno la coprirebbe');
});

test('mutante: una voce in tutti e due i posti verrebbe vista', () => {
  const finto = new Set(nelDoc);
  finto.add(registro[0].n);
  const doppi = registro.map((x) => x.n).filter((n) => finto.has(n));
  assert.equal(doppi.length, 1, 'il controllo del doppio non guarda i numeri giusti');
});
