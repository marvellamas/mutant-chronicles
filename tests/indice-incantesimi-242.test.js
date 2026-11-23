import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 242, ritocco 2 (visto al tavolo da Marcello, 23/11/2026): in testa agli incantesimi conosciuti un indice con nome e PM; un
// tocco sul nome porta la scheda in cima a quello che si vede. L'ordine dell'indice è quello della pagina sotto, così il salto non
// disorienta. I pixel veri (la scheda in cima, non sotto le fasce) li misura la prova nel browser del lotto: qui l'ordine, i
// collegamenti e il modo del salto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, clic, dati, ESEMPI } from './scheda-aiuti.js';
import { idIncantesimo, pmLivelloBase } from '../src/ui/tab.js';

const ANSELMO = ESEMPI.find((f) => f.startsWith('Fratello-Anselmo'));
const nomeDi = (b) => String(b.getAttribute?.('title') ?? b.title ?? b.attributi?.title ?? '').replace(/^Vai a /, '');

function indice() {
  const r = resa(contesto(ANSELMO, { attiva: 'poteri' }));
  const sez = r.classe('indice-incantesimi')[0];
  const voci = sez ? sez.querySelectorAll('.link-indice') : [];
  const schede = r.classe('incantesimo-scheda').filter((x) => x.getAttribute?.('id') ?? x.id);
  return { r, sez, voci, schede };
}

test('L’INDICE C’È, IN TESTA AGLI INCANTESIMI, E HA L’ORDINE DELLA PAGINA SOTTO', () => {
  const { r, sez, voci, schede } = indice();
  assert.ok(sez, 'l’indice c’è');
  const titoli = r.tutti.filter((x) => x.tagName === 'H2').map((x) => x.textContent.trim());
  const iIndice = titoli.findIndex((t) => /^Incantesimi conosciuti/.test(t));
  const iPrimoGruppo = titoli.findIndex((t) => /^(Fisica|Mentale|Spirituale)$/.test(t));
  assert.ok(iIndice >= 0 && iIndice < iPrimoGruppo, `l’indice prima dei gruppi: ${titoli.join(' | ')}`);
  const nomiIndice = voci.map(nomeDi);
  const idSchede = schede.map((x) => x.getAttribute?.('id') ?? x.id);
  assert.ok(nomiIndice.length >= 2, `${nomiIndice.length} voci`);
  assert.deepEqual(nomiIndice.map(idIncantesimo), idSchede, 'stesso ordine, e ogni voce ha la sua scheda');
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
