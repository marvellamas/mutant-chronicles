import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 242, ritocco 3 (visto al tavolo da Marcello, 23/11/2026): dopo il lancio la Focalizzazione torna a zero. Il livello
// dichiarato RESTA: azzerato, il pannello proporrebbe il livello più alto (2 PM → 8 PM al lancio dopo; motivo in src/lancio.js).
// Il reset tocca solo la Focalizzazione:
// questo file fallisce se cancella i PM spesi, lo storico o gli incantesimi in corso, o se il secondo lancio non parte pulito.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, clic, dati, ESEMPI } from './scheda-aiuti.js';
import { spendiPmLancio } from '../src/sessione.js';
import { registraIncantesimo } from '../src/durate-incantesimi.js';
import { azzeraDopoIlLancio, dichiarazioneLancio } from '../src/lancio.js';
import { rigaStorico } from '../src/storico.js';

const ANSELMO = ESEMPI.find((f) => f.startsWith('Fratello-Anselmo'));
const NOME = 'Colpo Elementale';

/** Il lancio come lo fa la scheda (src/ui/app.js → lancia): PM spesi, l'incantesimo fra quelli in corso, poi il reset. */
function lancia(sessione, massimi, pm, conDurata = true) {
  let s = spendiPmLancio(sessione, { personali: pm, contenitore: null }, massimi);
  if (conDurata) s = registraIncantesimo(s, { nome: NOME, livello: 3, durata: { tipo: 'round', round: 3, testo: '3 Round' }, bersagli: [] }, dati);
  return azzeraDopoIlLancio(s, NOME);
}

test('IL RESET NON CANCELLA I PM SPESI, LO STORICO NÉ GLI INCANTESIMI IN CORSO; spegne solo la Focalizzazione', () => {
  const ctx = contesto(ANSELMO, { attiva: 'poteri' });
  const max = ctx.massimi.pm;
  let s0 = { ...ctx.sessione, pmAttuali: max, lanci: { [NOME]: { focalizzazione: true, versione: 4, ingaggio: true, circostanza: 2 }, Altro: { focalizzazione: true, versione: 2 } } };
  s0 = rigaStorico(s0, 'Procedi comunque: una riga di prima');
  const s1 = lancia(s0, ctx.massimi, 3);
  assert.ok(max >= 7, `PM massimi ${max}`);
  assert.equal(s1.pmAttuali, max - 3, 'i 3 PM spesi restano spesi');
  assert.deepEqual(s1.storico, s0.storico, 'lo storico è quello di prima, riga per riga');
  assert.equal(s1.incantesimiAttivi.length, (s0.incantesimiAttivi?.length ?? 0) + 1, 'l’incantesimo lanciato è fra quelli in corso');
  const d = dichiarazioneLancio(s1.lanci[NOME]);
  assert.equal(d.focalizzazione, false, 'Focalizzazione a zero');
  assert.equal(d.versione, 4, 'il livello dichiarato resta (azzerato, il pannello proporrebbe il più alto)');
  assert.equal(s1.lanci[NOME].ingaggio, true, 'le altre scelte del pannello restano');
  assert.equal(s1.lanci[NOME].circostanza, 2);
  assert.deepEqual(s1.lanci.Altro, s0.lanci.Altro, 'un altro incantesimo non si tocca');
});

test('DUE LANCI DI FILA: IL SECONDO PARTE PULITO, e i PM si sommano', () => {
  const ctx = contesto(ANSELMO, { attiva: 'poteri' });
  const max = ctx.massimi.pm;
  const s0 = { ...ctx.sessione, pmAttuali: max, lanci: { [NOME]: { focalizzazione: true, versione: 4 } } };
  const s1 = lancia(s0, ctx.massimi, 4);
  // il giocatore non tocca niente e lancia di nuovo: la dichiarazione che il pannello legge è pulita
  assert.equal(dichiarazioneLancio(s1.lanci[NOME]).focalizzazione, false);
  const s2 = lancia(s1, ctx.massimi, 3);
  assert.equal(s2.pmAttuali, max - 7, '4 + 3 PM spesi, nessuno restituito');
  assert.equal(dichiarazioneLancio(s2.lanci[NOME]).focalizzazione, false);
  assert.equal(dichiarazioneLancio(s2.lanci[NOME]).versione, 4, 'il livello scelto resta: il secondo lancio costa quanto il primo');
});

test('IL PANNELLO PASSA IL NOME A «lancia», e la scheda pulisce nella stessa modifica dei PM (un «Annulla» rimette tutto)', () => {
  const ctx = contesto(ANSELMO, { attiva: 'poteri', cambia: (s) => { s.lanci = { [NOME]: { focalizzazione: true } }; } });
  ctx.ui.lancio = { nome: NOME, passo: 0 };
  const r = resa(ctx);
  const b = r.tutti.find((x) => x.tagName === 'BUTTON' && /^Lancia( comunque)? \(/.test(x.textContent));
  assert.ok(b, 'il pulsante del lancio');
  clic(b);
  const chiamata = ctx.chiamate.find((c) => c[0] === 'lancia');
  assert.ok(chiamata, `«lancia» chiamata: ${ctx.chiamate.map((c) => c[0]).join(', ')}`);
  assert.equal(chiamata[4], NOME, 'il nome dell’incantesimo è il quarto argomento');
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  const i = app.indexOf('lancia: async (fonte, registrazione = null, forza = false, nome = null)');
  assert.ok(i > 0, 'la firma con il nome');
  const corpo = app.slice(i, i + 1400);
  assert.ok(corpo.indexOf('spendiPmLancio') < corpo.indexOf('azzeraDopoIlLancio(nuova, nome)'), 'il reset dopo i PM, sulla sessione nuova');
  assert.ok(corpo.indexOf('azzeraDopoIlLancio(nuova, nome)') < corpo.indexOf('cambiaSessione(nuova)'), 'e prima di salvare: una modifica sola');
});
