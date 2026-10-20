// Difetti del tablet del 19/10/2026, punti 1 e 2: la pagina non torna in cima a ogni modifica di un valore; più PM in
// un cristallo con un solo gesto; pulsante «torna in cima» che compare solo oltre una soglia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conScorrimentoFisso, tornaSopraVisibile } from '../src/ui/scorrimento.js';
import { variazioneDaTesto } from '../src/scheda-vista.js';
import { massimiSessione, inizializzaSessione, variaChroma } from '../src/sessione.js';
import { calcolaScheda } from '../src/calc.js';
import { validaDati } from '../src/validate.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();

/** Finestra finta: lo scorrimento si comporta come sul tablet, che durante il ridisegno torna a 0. */
function finta(y = 700, altezza = 3400) {
  const chiamate = [];
  const f = { scrollY: y, scrollX: 0, document: { documentElement: { scrollHeight: altezza } }, scrollTo: (x, yy) => { f.scrollY = yy; chiamate.push([x, yy]); } };
  return { f, chiamate };
}

test('scorrimento: dopo il ridisegno la posizione è quella di prima, anche se il browser l’aveva portata in cima', () => {
  const { f, chiamate } = finta(700);
  const radice = { style: {} };
  const rinviate = [];
  let altezzaDuranteRidisegno = null;
  conScorrimentoFisso(radice, () => { altezzaDuranteRidisegno = radice.style.minHeight; f.scrollY = 0; }, { finestra: f, rinvia: (fn) => rinviate.push(fn) });
  assert.equal(altezzaDuranteRidisegno, '3400px', 'la radice tiene l’altezza di prima mentre si ridisegna');
  assert.equal(f.scrollY, 700);
  assert.deepEqual(chiamate, [[0, 700]]);
  // il browser la sposta ancora prima del fotogramma dopo: si rimette, e l’altezza si libera
  f.scrollY = 0;
  rinviate.forEach((fn) => fn());
  assert.equal(f.scrollY, 700);
  assert.equal(radice.style.minHeight, '');
});

test('scorrimento: se il ridisegno fallisce la posizione e l’altezza si rimettono lo stesso', () => {
  const { f } = finta(1200);
  const radice = { style: {} };
  const rinviate = [];
  assert.throws(() => conScorrimentoFisso(radice, () => { f.scrollY = 0; throw new Error('boom'); }, { finestra: f, rinvia: (fn) => rinviate.push(fn) }), /boom/);
  assert.equal(f.scrollY, 1200);
  rinviate.forEach((fn) => fn());
  assert.equal(radice.style.minHeight, '');
});

test('scorrimento: la scheda usa il blocco per ogni ridisegno che mantiene lo scorrimento', () => {
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /function renderScheda\(opzioni = \{\}\) \{\s*if \(!opzioni\.mantieniScorrimento\) return renderSchedaInterna\(opzioni\);\s*return conScorrimentoFisso\(radice/);
  // il tocco ±1 dei PM di un cristallo passa da cambiaSessione, che ridisegna con mantieniScorrimento
  assert.match(app, /const cambiaSessione = \(nuova, \{ ridisegna = true \} = \{\}\) => \{[\s\S]*?renderScheda\(\{ mantieniScorrimento: true \}\)/);
});

test('PM di un cristallo: «5», «+5» aggiungono, «-3» e «−3» tolgono, il resto non vale', () => {
  assert.equal(variazioneDaTesto('5'), 5);
  assert.equal(variazioneDaTesto('+5'), 5);
  assert.equal(variazioneDaTesto(' + 12 '), 12);
  assert.equal(variazioneDaTesto('-3'), -3);
  assert.equal(variazioneDaTesto('−3'), -3);
  for (const x of ['', 'abc', '0', '+0', '1,5', '5 PM', '1000', null, undefined]) assert.equal(variazioneDaTesto(x), null, String(x));
});

test('PM di un cristallo: 12 PM in un colpo solo, entro 0 e la capacità', () => {
  const equip = [{ uid: 'p', rif: null, personalizzato: { nome: 'Cristallo', tipo: 'artefatto', potenza: 'Rara', energia: 'Bianco', capacita_pm: 20 }, stato: 'trasportato', quantita: 1, note: '' }];
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: equip };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  let s = inizializzaSessione(m);
  s = variaChroma(s, 'p', -20, m);
  assert.equal(s.chroma.p.pmAttuali, 0);
  s = variaChroma(s, 'p', variazioneDaTesto('+12'), m);
  assert.equal(s.chroma.p.pmAttuali, 12);
  s = variaChroma(s, 'p', variazioneDaTesto('5'), m);
  assert.equal(s.chroma.p.pmAttuali, 17);
  s = variaChroma(s, 'p', variazioneDaTesto('9'), m); // oltre la capacità: si ferma a 20
  assert.equal(s.chroma.p.pmAttuali, 20);
  s = variaChroma(s, 'p', variazioneDaTesto('-25'), m); // sotto zero: si ferma a 0
  assert.equal(s.chroma.p.pmAttuali, 0);
  // il tocco da ±1 resta
  const tab = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.match(tab, /pulsante\(-1\), pulsante\(1\)\),\s*\/\/ 19\/10/);
  assert.match(tab, /campoVariazionePm\(ctx, c, pm\)/);
});

test('«torna in cima»: compare solo oltre la soglia dei dati', () => {
  const ts = dati.regole.interfaccia.torna_sopra;
  assert.ok(ts.soglia_px >= 100 && ts.etichetta);
  assert.equal(tornaSopraVisibile(0, ts.soglia_px), false);
  assert.equal(tornaSopraVisibile(ts.soglia_px, ts.soglia_px), false);
  assert.equal(tornaSopraVisibile(ts.soglia_px + 1, ts.soglia_px), true);
  assert.equal(tornaSopraVisibile(NaN, ts.soglia_px), false);
  // il dato è validato
  assert.deepEqual(validaDati(dati), []);
  const rotti = structuredClone(dati);
  rotti.regole.interfaccia.torna_sopra = { soglia_px: 5 };
  assert.ok(validaDati(rotti).some((e) => /torna_sopra/.test(e.chiave ?? e.key ?? JSON.stringify(e))));
});

test('«torna in cima»: pulsante fisso fuori dal flusso, nascosto in stampa, sopra la barra delle tab in basso', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.torna-sopra \{\s*position: fixed; right: 1rem;/);
  assert.match(css, /@media print \{ \.torna-sopra \{ display: none; \} \}/);
  assert.match(css, /body:has\(\.pos-basso\) \.torna-sopra/);
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /montaTornaSopra\(stato\.dati\.regole\.interfaccia\.torna_sopra\)/);
});

test('PM di un cristallo: il campo ±N chiama l’azione con la variazione scritta, e il tocco ±1 resta', async () => {
  const { contesto, resa, clic, ESEMPI } = await import('./scheda-aiuti.js');
  const c = ESEMPI.map((f) => contesto(f, { attiva: 'combattimento' })).find((x) => (x.tab.scheda.equipaggiamento?.contenitori ?? []).length);
  assert.ok(c, 'serve un PG d’esempio con un contenitore di Chroma');
  const r = resa(c);
  const riga = r.classe('riga-cristallo')[0];
  const campo = riga.tutti().find((n) => n.className?.includes('campo-variazione-pm'));
  assert.ok(campo, 'il campo c’è accanto ai tocchi');
  const applica = riga.tutti().find((n) => n.tagName === 'BUTTON' && n.textContent === 'Applica');
  // ±1 invariato
  const piu1 = riga.tutti().find((n) => n.tagName === 'BUTTON' && n.textContent === '+1');
  clic(piu1);
  const [, uid, uno] = c.chiamate.at(-1);
  assert.equal(uno, 1);
  const capacita = c.tab.scheda.equipaggiamento.contenitori.find((x) => x.uid === uid).capacita;
  const pm = c.sessione.chroma?.[uid]?.pmAttuali ?? 0;
  // «+5»: aggiunge 5 (ma non oltre la capacità)
  campo.value = '+5';
  clic(applica);
  assert.deepEqual(c.chiamate.at(-1), ['chroma', uid, Math.min(5, capacita - pm)]);
  // «-3» con Invio: toglie 3 (ma non sotto zero)
  campo.value = '-3';
  campo.ascolti.keydown[0]({ key: 'Enter', preventDefault() {} });
  assert.deepEqual(c.chiamate.at(-1), ['chroma', uid, -Math.min(3, pm)]);
  // testo non valido: nessuna azione, il campo si segna
  const n = c.chiamate.length;
  campo.value = 'abc';
  clic(applica);
  assert.equal(c.chiamate.length, n);
  assert.match(campo.className, /non-valido/);
});
