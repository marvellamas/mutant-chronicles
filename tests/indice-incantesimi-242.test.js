import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 242 (ritocco 2) e 243 — in testa agli incantesimi conosciuti un indice con nome e PM; un tocco sul nome porta la scheda in
// cima a quello che si vede. Dal 243 l'indice è in ordine alfabetico, una voce per riga; **dal 245 è raggruppato per tipo (rossi, blu, verdi) e l'ordine
// alfabetico vale dentro ogni gruppo** (tests/indice-incantesimi-245.test.js); i pixel veri (le colonne, la scheda in cima, non sotto le fasce) li misura la prova nel browser del lotto: qui
// l'ordine, i collegamenti, il modo del salto e il caso di una voce che non ha dove saltare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { contesto, resa, clic, dati, ESEMPI } from './scheda-aiuti.js';
import { idIncantesimo, pmLivelloBase } from '../src/ui/tab.js';

const ANSELMO = ESEMPI.find((f) => f.startsWith('Fratello-Anselmo'));
const nomeDi = (b) => String(b.getAttribute?.('title') ?? b.title ?? b.attributi?.title ?? '').replace(/^Vai a /, '').replace(/ \([^()]*\)$/, ''); // dal 245 il suggerimento dice anche il tipo: «Vai a X (Rosso · Fisica)»
const ISTANTANEA = new URL('../istantanee/stato_2026-11-21_2353/personaggi/', import.meta.url);
const LUCAS_2111 = '../istantanee/stato_2026-11-21_2353/personaggi/LUCAS_liv7_2026-11-21.json';
const SALTA_ISTANTANEA = !existsSync(new URL('LUCAS_liv7_2026-11-21.json', ISTANTANEA)) && 'istantanea del 21/11 non presente su questo PC';

function indice(file = ANSELMO) {
  const r = resa(contesto(file, { attiva: 'poteri' }));
  const sez = r.classe('indice-incantesimi')[0];
  const voci = sez ? sez.querySelectorAll('.link-indice') : [];
  const schede = r.classe('incantesimo-scheda').filter((x) => x.getAttribute?.('id') ?? x.id);
  return { r, sez, voci, schede };
}
const idSchede = (schede) => schede.map((x) => x.getAttribute?.('id') ?? x.id);
const nomiOrdinati = (nomi) => [...nomi].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));

test('L’INDICE C’È, NEL RIQUADRO «Incantesimi» IN CIMA ALLA TAB, PRIMA DEI GRUPPI, SENZA VOCI DOPPIE', () => {
  const { r, sez, voci, schede } = indice();
  assert.ok(sez, 'l’indice c’è');
  // nel riquadro del conteggio dei conosciuti (lo spazio che c’è già: è alto quanto i Punti Magia accanto)
  const riquadro = r.classe('contatore-tavolo').find((x) => x.children[0]?.textContent === 'Incantesimi');
  assert.ok(riquadro && riquadro.tutti().includes(sez), 'dentro il riquadro «Incantesimi»');
  const ordine = r.tutti;
  const primoGruppo = ordine.find((x) => x.tagName === 'H2' && /^(Fisica|Mentale|Spirituale)$/.test(x.textContent.trim()));
  assert.ok(ordine.indexOf(sez) < ordine.indexOf(primoGruppo), 'l’indice viene prima dei gruppi');
  const nomiIndice = voci.map(nomeDi);
  assert.ok(nomiIndice.length >= 2, `${nomiIndice.length} voci`);
  assert.equal(new Set(nomiIndice).size, nomiIndice.length, 'nessuna voce doppia (l’ordine, per tipo e alfabetico, è nel test del 245)');
  // ogni voce ha la sua scheda, e viceversa (a meno dell'ordine)
  assert.deepEqual(new Set(nomiIndice.map(idIncantesimo)), new Set(idSchede(schede)), 'ogni voce ha la sua scheda');
});

test('UNA VOCE PER RIGA: ogni voce è un elemento di lista a sé, col nome e i PM in due parti', () => {
  const { sez, voci } = indice();
  const righe = sez.tutti().filter((x) => x.tagName === 'LI');
  assert.equal(righe.length, voci.length, 'un <li> per voce');
  for (const b of voci) {
    assert.equal(b.querySelectorAll('.nome-indice').length, 1, `${nomeDi(b)}: il nome ha il suo elemento`);
  }
});

test('OGNI VOCE DICE I PM DEL LIVELLO BASE, presi dalla scheda dell’incantesimo', () => {
  const { voci } = indice();
  for (const b of voci) {
    const nome = nomeDi(b);
    const pm = pmLivelloBase(dati.incantesimi.incantesimi.find((x) => x.nome === nome));
    assert.ok(Number.isInteger(pm), `${nome}: PM del livello base`);
    assert.match(b.textContent, new RegExp(`${pm} PM`), `${nome}: «${b.textContent}»`);
  }
});

test('IL TOCCO PORTA LA SCHEDA IN CIMA (block: start), per il primo, uno in mezzo e l’ultimo', () => {
  const { voci } = indice();
  const chiamate = [];
  const docPrima = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) => ({ id, scrollIntoView: (o) => chiamate.push({ id, ...o }) });
  try {
    for (const b of [voci[0], voci[Math.floor(voci.length / 2)], voci.at(-1)]) clic(b);
  } finally { globalThis.document.getElementById = docPrima; }
  assert.equal(chiamate.length, 3);
  assert.ok(chiamate.every((c) => c.block === 'start'), 'in cima a quello che si vede, non a metà schermo');
  assert.deepEqual(chiamate.map((c) => c.id), [voci[0], voci[Math.floor(voci.length / 2)], voci.at(-1)].map((b) => idIncantesimo(nomeDi(b))));
});

test('UNA VOCE SENZA SCHEDA DA RAGGIUNGERE NON FINGE: il tocco non porta da nessuna parte, la voce diventa non cliccabile e si vede', () => {
  const { voci } = indice();
  const docPrima = globalThis.document.getElementById;
  globalThis.document.getElementById = () => null; // nessuna scheda nella pagina
  const b = voci[0];
  try { clic(b); } finally { globalThis.document.getElementById = docPrima; }
  assert.ok(b.getAttribute('disabled') !== null, 'la voce è disabilitata');
  assert.match(b.getAttribute('class') ?? '', /senza-scheda/, 'e porta la classe che la fa vedere diversa');
});

test('OGNI VOCE DELL’INDICE HA LA SUA SCHEDA, anche un incantesimo aggiunto a mano (Lucas, copia di ottobre: «Esorcizzare Oscurità»)', () => {
  // trovato nella prova del 242: la scheda di un incantesimo aggiunto a mano non aveva l'identificativo e il tocco non portava da nessuna parte
  const r = resa(contesto('../tests/fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json', { attiva: 'poteri' }));
  const voci = r.classe('indice-incantesimi')[0].querySelectorAll('.link-indice').map(nomeDi);
  const id = new Set(r.classe('incantesimo-scheda').map((x) => x.getAttribute?.('id') ?? x.id).filter(Boolean));
  assert.ok(voci.includes('Esorcizzare Oscurità'), 'l’aggiunto a mano è nell’indice');
  assert.equal(new Set(voci).size, voci.length, 'nessuna voce doppia');
  for (const v of voci) assert.ok(id.has(idIncantesimo(v)), `${v}: la sua scheda ha l’identificativo del salto`);
});

test('LUCAS DEL 21/11 (la copia buona): tutti i conosciuti, ognuno con la sua scheda, «Esorcizzare Oscurità» compreso', { skip: SALTA_ISTANTANEA }, () => {
  const { voci, schede } = indice(LUCAS_2111);
  const nomi = voci.map(nomeDi);
  assert.ok(nomi.length >= 17, `${nomi.length} voci`);
  assert.equal(new Set(nomi).size, nomi.length, 'nessuna voce doppia');
  assert.ok(nomi.includes('Esorcizzare Oscurità'));
  const id = new Set(idSchede(schede));
  for (const v of nomi) assert.ok(id.has(idIncantesimo(v)), `${v}: la sua scheda ha l’identificativo del salto`);
});
