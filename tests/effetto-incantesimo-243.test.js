import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 243, punto 4 — l'EFFETTO di un incantesimo si legge per primo e si vede. Nei dati l'effetto è un campo, `descrizione` (il paragrafo
// della scheda del manuale che dice che cosa fa), distinto da `intestazione` (Rituale, PM utilizzabili) e da `lancio` (le regole di
// lancio): su 90 schede su 90 c'è ed è scritto. Si usa il campo intero, mai una frase scelta per posizione. Dove il campo non c'è (vuoto o
// TODO) la scheda resta com'era e NON riceve nessuna evidenza: una frase evidenziata sbagliata è peggio di nessuna evidenza, perché al
// tavolo si legge quella e si gioca quella.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { contesto, resa, dati, ESEMPI } from './scheda-aiuti.js';
import { effettoIncantesimo, contenutoTooltip, schedaIncantesimo } from '../src/descrizioni.js';

const ANSELMO = ESEMPI.find((f) => f.startsWith('Fratello-Anselmo'));
const LUCAS_2111 = '../istantanee/stato_2026-11-21_2353/personaggi/LUCAS_liv7_2026-11-21.json';
const SALTA = !existsSync(new URL(LUCAS_2111, new URL('./', import.meta.url))) && 'istantanea del 21/11 non presente su questo PC';
const schede = () => dati.incantesimi.incantesimi;

test('IL CAMPO C’È: su tutte le schede del catalogo l’effetto è un campo scritto, distinto da intestazione e lancio (il censimento del lotto)', () => {
  const tutte = schede();
  assert.equal(tutte.length, 90);
  const senza = tutte.filter((i) => effettoIncantesimo(i) === null).map((i) => i.id);
  assert.deepEqual(senza, [], `schede senza un effetto leggibile: ${senza.join(', ')}`);
  for (const i of tutte) {
    assert.notEqual(i.descrizione, i.lancio, `${i.id}: l'effetto non è il testo del lancio`);
    assert.doesNotMatch(i.descrizione, /^Lancio/, `${i.id}: l'effetto non comincia con le regole di lancio`);
    assert.doesNotMatch(i.descrizione, /^Scheda \d/, `${i.id}: né con l'intestazione`);
  }
});

test('RESPIRO ADATTIVO: l’effetto è «Il beneficiario non ha bisogno di respirare…», non il lancio né la provenienza', () => {
  const r = schede().find((i) => i.nome === 'Respiro Adattivo');
  assert.equal(effettoIncantesimo(r), 'Il beneficiario non ha bisogno di respirare per tutta la durata dell’incantesimo.');
});

function articoli(file = ANSELMO) {
  const r = resa(contesto(file, { attiva: 'poteri' }));
  return { r, art: r.classe('incantesimo-scheda').filter((a) => !/da-oggetto|macro-oggetto/.test(a.className)) };
}
const h4di = (a) => (a.tutti().find((n) => n.tagName === 'H4')?.textContent ?? '').trim();
const testoDi = (n) => n.textContent.replace(/\s+/g, ' ').trim();

test('NELLA SCHEDA: l’effetto è il primo blocco dopo il titolo, in evidenza, e contiene il campo intero; l’intestazione e il lancio vengono dopo', () => {
  const { art } = articoli();
  assert.ok(art.length >= 3, `${art.length} schede`);
  for (const a of art) {
    const ev = a.querySelectorAll('.effetto-incantesimo')[0];
    assert.ok(ev, `${h4di(a)}: manca l'effetto evidenziato`);
    const nome = h4di(a).trim();
    const inc = schede().find((i) => nome.startsWith(i.nome));
    assert.ok(inc, `${nome}: scheda del catalogo`);
    assert.ok(testoDi(ev).includes(testoDi({ textContent: inc.descrizione })), `${inc.id}: dentro c'è tutto il campo, non una frase`);
    // ordine in documento: titolo, EFFETTO, poi intestazione e lancio
    const tutti = a.tutti();
    const iEff = tutti.indexOf(ev);
    const iInt = tutti.findIndex((n) => n.tagName === 'P' && testoDi(n).startsWith('Scheda '));
    const iLan = tutti.findIndex((n) => n.tagName === 'P' && testoDi(n).startsWith('Lancio'));
    assert.ok(iEff > 0, 'viene dopo il titolo');
    if (iInt >= 0) assert.ok(iEff < iInt, `${inc.id}: l'effetto prima dell'intestazione`);
    if (iLan >= 0) assert.ok(iEff < iLan, `${inc.id}: l'effetto prima del lancio`);
  }
});

test('UN INCANTESIMO SENZA EFFETTO INDIVIDUABILE NON RICEVE NESSUNA EVIDENZA: vuoto, solo spazi o TODO; la scheda resta com’era', () => {
  const { art: prima } = articoli();
  const bersaglio = schede().find((i) => prima.some((a) => h4di(a).startsWith(i.nome)));
  assert.ok(bersaglio);
  const originale = bersaglio.descrizione;
  try {
    for (const finto of ['', '   ', 'TODO(Davide): descrizione da scrivere']) {
      bersaglio.descrizione = finto;
      assert.equal(effettoIncantesimo(bersaglio), null, `«${finto}» non è un effetto`);
      const { art } = articoli();
      const a = art.find((x) => h4di(x).startsWith(bersaglio.nome));
      assert.ok(a, 'la scheda c’è lo stesso');
      assert.equal(a.querySelectorAll('.effetto-incantesimo').length, 0, `senza un effetto affidabile («${finto}») nessuna evidenza`);
      assert.ok(testoDi(a).includes('Lancio'), 'e il resto della scheda (lancio) è come prima');
    }
  } finally { bersaglio.descrizione = originale; }
});

test('NEL TOOLTIP E NEL PANNELLO: l’effetto prima del lancio; il pannello lo evidenzia solo se il campo è affidabile', () => {
  for (const i of schede()) {
    const c = contenutoTooltip('incantesimo', i.nome, dati);
    assert.equal(c.sezioni[0].testo, i.descrizione, `${i.id}: nel tooltip l'effetto è la prima sezione`);
    assert.equal(c.sezioni[1].testo, i.lancio, `${i.id}: poi il lancio`);
    const s = schedaIncantesimo(i.nome, dati);
    assert.equal(s.effetto, i.descrizione, `${i.id}: il pannello riceve l'effetto da evidenziare`);
  }
  const i = schede()[0];
  const originale = i.descrizione;
  try {
    i.descrizione = 'TODO(Davide): da scrivere';
    assert.equal(schedaIncantesimo(i.nome, dati).effetto, null, 'un TODO non si evidenzia');
  } finally { i.descrizione = originale; }
});

test('LUCAS DEL 21/11: ogni scheda della pagina Poteri ha il suo effetto evidenziato per primo', { skip: SALTA }, () => {
  const { art } = articoli(LUCAS_2111);
  assert.ok(art.length >= 17, `${art.length} schede`);
  for (const a of art) assert.equal(a.querySelectorAll('.effetto-incantesimo').length, 1, `${h4di(a)}: un solo blocco di effetto`);
});
