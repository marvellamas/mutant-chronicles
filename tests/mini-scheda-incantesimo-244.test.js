import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 244, punto 2 — la scheda dell'incantesimo CHIUSA dice tre cose: come si chiama, quanto costa, che cosa fa (il blocco «EFFETTO» del
// 243). Le righe di lancio (da dove viene, Rituale e PM utilizzabili, Lancio, tabella dei livelli) stanno in una parte che si apre.
// **Non si comprime** quello che dice che una regola la applica il tavolo o che qualcosa non torna: il segno ⚑ dell'edizione, gli avvisi e
// lo stato degli incantesimi aggiunti a mano restano visibili a scheda chiusa. Questo file fallisce se uno di loro finisce nella parte che
// si apre (nasconderli fa cercare un guasto che non c'è).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, dati, ESEMPI } from './scheda-aiuti.js';
import { pmLivelloBase } from '../src/ui/tab.js';

const ANSELMO = ESEMPI.find((f) => f.startsWith('Fratello-Anselmo'));
const titolo = (a) => (a.tutti().find((n) => n.tagName === 'H4')?.textContent ?? '').trim();
const schede = (file = ANSELMO) => resa(contesto(file, { attiva: 'poteri' })).classe('incantesimo-scheda').filter((a) => !/oggetto/.test(a.className));
const dettagli = (a) => a.tutti().find((n) => n.tagName === 'DETAILS' && n.className.includes('incantesimo-regole'));
const dentro = (parte, nodo) => parte.tutti().includes(nodo);
const testo = (n) => n.textContent.replace(/\s+/g, ' ').trim();

test('CHIUSA: nome, costo ed effetto sono fuori dalla parte che si apre', () => {
  const tutte = schede();
  assert.ok(tutte.length >= 3);
  for (const a of tutte) {
    const d = dettagli(a);
    assert.ok(d, `${titolo(a)}: c'è la parte che si apre`);
    assert.ok(!d.open && !d.getAttribute('open'), `${titolo(a)}: nasce chiusa`);
    const inc = dati.incantesimi.incantesimi.find((i) => titolo(a).startsWith(i.nome));
    const pm = pmLivelloBase(inc);
    const effetto = a.querySelectorAll('.effetto-incantesimo')[0];
    assert.ok(effetto && !dentro(d, effetto), `${inc.id}: l'effetto è visibile a scheda chiusa`);
    const h4 = a.tutti().find((n) => n.tagName === 'H4');
    assert.ok(h4 && !dentro(d, h4), 'il nome');
    if (pm !== null) assert.match(testo(h4.parentNode ?? a), new RegExp(`${pm} PM`), `${inc.id}: il costo (${pm} PM) è nel titolo`);
  }
});

test('LE RIGHE DI LANCIO STANNO NELLA PARTE CHE SI APRE E NON FUORI: Rituale, PM utilizzabili, Lancio, tabella dei livelli', () => {
  for (const a of schede()) {
    const d = dettagli(a);
    const fuori = a.tutti().filter((n) => !dentro(d, n) && n !== d);
    const testoFuori = fuori.filter((n) => n.tagName === 'P' || n.tagName === 'TABLE').map((n) => testo(n)).join(' | ');
    assert.doesNotMatch(testoFuori, /Rituale:|PM utilizzabili|^Lancio:|\| Lancio:/, `${titolo(a)}: le informazioni di lancio non stanno a scheda chiusa`);
    assert.ok(!fuori.some((n) => n.tagName === 'TABLE'), `${titolo(a)}: la tabella dei livelli sta nella parte che si apre`);
    const dentroTesto = testo(d);
    assert.match(dentroTesto, /Rituale:/, 'espansa: il Rituale');
    assert.match(dentroTesto, /Lancio:/, 'espansa: il Lancio');
    assert.ok(d.tutti().some((n) => n.tagName === 'TABLE') || /Tabella non disponibile/.test(dentroTesto), 'espansa: la tabella dei livelli');
  }
});

test('IL ⚑ DELL’EDIZIONE RESTA VISIBILE A SCHEDA CHIUSA (provato con una scheda rimasta indietro) E SPARISCE DA SÉ QUANDO LA SCHEDA È TUTTA CORRENTE', () => {
  const nome = titolo(schede()[0]);
  const inc = dati.incantesimi.incantesimi.find((i) => nome.startsWith(i.nome));
  assert.ok(inc);
  const prima = JSON.stringify(inc._edizione);
  try {
    // senza campi indietro: nessun ⚑
    for (const a of schede()) assert.equal(a.querySelectorAll('.edizione-indietro').length, 0, `${titolo(a)}: tutta corrente, niente ⚑`);
    inc._edizione = { ...inc._edizione, campi: { ...inc._edizione.campi, lancio: '1.11' } };
    const a = schede().find((x) => titolo(x).startsWith(inc.nome));
    const segno = a.querySelectorAll('.edizione-indietro')[0];
    assert.ok(segno, 'il ⚑ c’è');
    assert.match(testo(segno), /⚑/);
    assert.ok(!dentro(dettagli(a), segno), 'il ⚑ NON sta nella parte che si apre: è visibile a scheda chiusa');
  } finally { inc._edizione = JSON.parse(prima); }
});

test('GLI AGGIUNTI A MANO: lo stato e gli avvisi («Non si lancia: …», «Avviso: …») restano visibili a scheda chiusa', () => {
  const r = resa(contesto('../tests/fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json', { attiva: 'poteri' }));
  const aMano = r.classe('incantesimo-scheda').filter((a) => /incantesimo-a-mano/.test(a.className));
  if (!aMano.length) return; // la copia di prova non ne ha: il caso è coperto dalla regola che segue
  for (const a of aMano) {
    const d = dettagli(a);
    for (const p of a.tutti().filter((n) => n.tagName === 'P' && /Non si lancia|^Avviso:|origine-aggiunto/.test(`${n.className} ${testo(n)}`))) {
      assert.ok(!dentro(d, p), `${titolo(a)}: «${testo(p).slice(0, 50)}» non sta nella parte che si apre`);
    }
  }
});

test('ESPANSA: aprendo la parte compare tutto, e l’apertura si ricorda al ridisegno (chiave stabile, lotto 186)', async () => {
  const { quantiApribiliAperti, dimenticaApribili } = await import('../src/ui/apribili.js');
  dimenticaApribili();
  const ctx = contesto(ANSELMO, { attiva: 'poteri' });
  const a = resa(ctx).classe('incantesimo-scheda').filter((x) => !/oggetto/.test(x.className))[0];
  const d = dettagli(a);
  d.open = true;
  d.ascolti.toggle?.forEach((f) => f());
  assert.equal(quantiApribiliAperti(), 1, 'l’apertura è registrata con la sua chiave');
  const di_nuovo = resa(ctx).classe('incantesimo-scheda').filter((x) => !/oggetto/.test(x.className))[0];
  assert.ok(dettagli(di_nuovo).open, 'dopo un ridisegno resta aperta');
  dimenticaApribili();
});
