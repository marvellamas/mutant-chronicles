import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 254, rif. 03 del collaudo di Davide del 25/11/2026 — «Uniformare "Costo 7500" e "non è un prezzo" in
// "Valore indicativo: 7.500 cr"».
//
// Il principio, che vale oltre la singola carta: **due frasi vere che insieme si contraddicono sono peggio di
// una frase sola.** Nella carta della CyberArma si leggevano «Costo 7500» (la riga della scheda) e «valore
// 7.500 cr (non è un prezzo)» (la riga dei dati dell'Inventario), e il Direttore doveva indovinare quale valesse.
// Adesso la forma la decide un posto solo, `etichettaValore`, e questo test fallisce se qualcuno ne riscrive
// un'altra accanto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dati } from './scheda-aiuti.js';
import { etichettaValore, condizioneCessione, catalogo } from '../src/equipaggiamento.js';
import { contenutoTooltip } from '../src/descrizioni.js';

const DIR = new URL('../data/equipaggiamento/', import.meta.url);
const vociDelCatalogo = () => {
  const out = [];
  for (const f of readdirSync(DIR)) {
    if (!f.endsWith('.json')) continue;
    const d = JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));
    for (const o of d.oggetti ?? []) out.push({ file: f, ...o });
  }
  return out;
};

test('rif. 03: un oggetto che non è in vendita dichiara «Valore indicativo», non un costo', () => {
  const voci = vociDelCatalogo().filter((o) => Number.isFinite(o.costo) && condizioneCessione(o));
  assert.ok(voci.length >= 7, `le carte con una cifra che non è un prezzo sono ${voci.length}: il censimento del lotto 254 ne contava almeno 7`);
  for (const o of voci) {
    const v = etichettaValore(o);
    assert.equal(v.etichetta, 'Valore indicativo', `${o.file}:${o.id}`);
    assert.match(v.valore, / cr$/, `${o.file}:${o.id}: la cifra porta l’unità`);
    assert.ok(v.indicativo && v.titolo, `${o.file}:${o.id}: il motivo sta nel titolo, non in una seconda frase`);
  }
});

test('rif. 03: un oggetto in vendita resta «Costo», e senza cifra non si scrive niente', () => {
  const inVendita = vociDelCatalogo().find((o) => Number.isFinite(o.costo) && !condizioneCessione(o));
  assert.ok(inVendita, 'nel catalogo c’è almeno un oggetto in vendita con un prezzo');
  assert.equal(etichettaValore(inVendita).etichetta, 'Costo');
  assert.equal(etichettaValore(inVendita).indicativo, false);
  assert.equal(etichettaValore({ nome: 'senza cifra' }), null);
  assert.equal(etichettaValore(null), null);
});

test('rif. 03: la CyberArma dice la cifra una volta sola, nella forma nuova', () => {
  const t = contenutoTooltip('oggetto', 'armi:cyberarma', dati);
  const riga = t.tabella.righe[0];
  assert.ok(!('Costo' in riga), 'la scheda non dice più «Costo» per un pezzo che non è in vendita');
  assert.ok(!t.tabella.colonne.includes('Costo'), 'né la colonna «Costo»');
  assert.equal(riga['Valore indicativo'], '7.500 cr', 'la forma è quella chiesta da Davide: «7.500 cr»');
});

test('mutante: nessun modulo riscrive a mano «non è un prezzo» accanto alla cifra', () => {
  // la frase sta nel titolo che `etichettaValore` costruisce; una seconda copia nel testo visibile
  // è la contraddizione che il collaudo ha trovato.
  for (const f of ['src/ui/equipaggiamento.js', 'src/ui/tab.js', 'src/descrizioni.js']) {
    const t = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    const righe = t.split('\n').filter((r) => !r.trimStart().startsWith('//') && !r.trimStart().startsWith('*'));
    assert.equal(righe.filter((r) => /\(non è un prezzo\)/.test(r)).length, 0, `${f}: la frase «(non è un prezzo)» accanto alla cifra`);
    assert.equal(righe.filter((r) => /costo \$\{[a-z]\.costo/.test(r)).length, 0, `${f}: una cifra scritta senza passare da etichettaValore`);
  }
});
