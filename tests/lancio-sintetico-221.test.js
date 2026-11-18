import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 221, parte 1 — «Lancia!» sintetico come «Attacca!» (docs/diff-lotto221-2026-11-18.md). Il pannello era alto 1618 px su una
// finestra da 1180 (820 × 1180, un tablet): «Lancia (−3 PM)» stava sotto il bordo e per lanciare si scorreva. Adesso l'essenziale è a
// vista e il resto sta dietro «Altro ▾». Il DOM finto non ha un motore di impaginazione: il metro del test è il NUMERO DI RIGHE DI TESTO
// che precedono il pulsante, tarato sulla misura nel browser (27 righe totali ↔ 803 px, pulsante a 672 px: circa 30 px per riga). Chi
// riporta il pulsante sotto il bordo fa salire quel numero oltre il limite e il test cade; la misura vera in px sta nel documento del lotto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, clic, dati, ESEMPI } from './scheda-aiuti.js';

const ANSELMO = ESEMPI.find((f) => f.startsWith('Fratello-Anselmo'));
/** La scheda di Anselmo (Custode, con due batterie) con il pannello «Lancia!» di un incantesimo aperto. */
function lancio(nome = 'Colpo Elementale', cambia = null) {
  const ctx = contesto(ANSELMO, { attiva: 'poteri' });
  ctx.ui.lancio = { nome, passo: 0 };
  cambia?.(ctx);
  const r = resa(ctx);
  const pannello = r.classe('lancio-pannello')[0];
  return { ctx, r, pannello };
}
/** Righe di testo (elementi con testo proprio) che precedono il nodo `fino` dentro il pannello, in ordine di documento; il contenuto
 *  di un <details> chiuso non si vede e non conta. */
function righeFinoA(pannello, fino) {
  let n = 0, trovato = false;
  const visita = (nodo) => {
    for (const x of nodo.children) {
      if (trovato) return;
      if (x === fino) { trovato = true; return; }
      if (String(x.testo ?? '').trim()) n++;
      if (x.tagName === 'DETAILS' && !x.open) { for (const c of x.children) if (c.tagName === 'SUMMARY') visita({ children: [c] }); continue; }
      visita(x);
    }
  };
  visita(pannello);
  return n;
}
const bottoneLancia = (pannello) => pannello.tutti().find((x) => x.tagName === 'BUTTON' && /^Lancia( comunque)? \(/.test(x.textContent));
const LIMITE_RIGHE_PRIMA_DEL_PULSANTE = 34; // ≈ 1000 px a ~30 px per riga: il pulsante entra in una finestra da 1180; il pannello di prima ne aveva ~85

test('«Lancia!» è sintetico: A vista il livello e il lancio, «Altro ▾» chiuso', () => {
  const { pannello } = lancio();
  assert.ok(pannello, 'il pannello c’è');
  assert.ok(pannello.className.includes('attacco-sintetico'), 'stessa struttura di «Attacca!»');
  const altro = pannello.querySelector('.attacco-altro');
  assert.ok(altro && !altro.open, '«Altro» c’è ed è chiuso');
  assert.equal(altro.querySelectorAll('.attacco-passo').length, 0, 'chiuso: niente del resto in vista');
});

test('IL PULSANTE DEL LANCIO NON FINISCE SOTTO IL BORDO a 820 × 1180: poche righe lo precedono (era il difetto che nessun test vedeva)', () => {
  for (const nome of ['Colpo Elementale', 'Armatura di Forza', 'Agilità Mutata']) {
    const { pannello } = lancio(nome);
    const b = bottoneLancia(pannello);
    assert.ok(b, `${nome}: «Lancia (−N PM)» c’è`);
    const prima = righeFinoA(pannello, b);
    assert.ok(prima <= LIMITE_RIGHE_PRIMA_DEL_PULSANTE, `${nome}: ${prima} righe prima del pulsante (limite ${LIMITE_RIGHE_PRIMA_DEL_PULSANTE}): sarebbe sotto il bordo di una finestra da 1180 px`);
  }
});

test('Anticipazione e Condizioni costano un tocco: dietro «Altro ▾», e aperto ci sono tutte e due', () => {
  const chiuso = lancio().pannello.textContent;
  assert.ok(!/Componenti mancanti|Focalizzazione|Circostanza del Direttore|Aspetto da anticipare/.test(chiuso), 'chiuso, né le Condizioni né l’Anticipazione');
  const aperto = lancio('Colpo Elementale', (ctx) => { ctx.ui.lancio.altro = true; }).pannello;
  const passi = aperto.querySelectorAll('.attacco-passo').map((p) => p.children[0]?.textContent);
  assert.ok(passi.includes('Anticipazione') && passi.includes('Condizioni'), `aperto: ${passi.join(', ')}`);
});

test('A VISTA: i PM che si pagano, il livello dichiarato e, quando serve, la Prova di Potere', () => {
  const { pannello } = lancio();
  const t = pannello.textContent;
  assert.match(t, /Lancia \(−3 PM\)/, 'il costo nel pulsante');
  assert.match(t, /· 3 personali/, 'i PM che si pagano e da dove');
  assert.match(t, /Livello 3 · 3 PM/, 'il livello dichiarato');
  assert.match(t, /Prova di Potere/, 'la Prova di Potere (anche «non richiesta») è detta');
  assert.match(t, /Da dove prendi i PM/, 'con due batterie c’è una scelta: resta a vista');
  assert.match(t, /Durata:/, 'la durata');
});

test('L’AVVISO «⚠ oltre il livello massimo» si raggruppa, non si nasconde: la riga resta scritta, e un livello sconsigliato scelto lo dice', () => {
  const { pannello } = lancio();
  assert.match(pannello.textContent, /⚠ Oltre il tuo livello massimo: 4, 5/, 'la riga del gruppo è a vista, chiuso');
  const det = pannello.querySelector('.livelli-oltre');
  assert.ok(det && !det.open, 'il gruppo è chiuso');
  // un livello oltre il massimo scelto: il gruppo si apre e l'avviso è una riga a vista
  const scelto = lancio('Colpo Elementale', (ctx) => { ctx.sessione.lanci = { 'Colpo Elementale': { versione: 4 } }; });
  assert.ok(scelto.pannello.querySelector('.livelli-oltre').open, 'aperto');
  assert.match(scelto.pannello.textContent, /⚠ Livello 4: oltre il tuo livello massimo/, 'l’avviso è detto, e si può scegliere comunque');
});

test('le scelte fatte dietro «Altro ▾» e diverse dal normale restano a vista come «Attive: … ✕», e ✕ le toglie', () => {
  const { ctx, pannello } = lancio('Colpo Elementale', (c) => { c.sessione.lanci = { 'Colpo Elementale': { focalizzazione: true, circostanza: -2 } }; });
  const attive = pannello.querySelector('.voci-attive');
  assert.ok(attive, 'la riga delle voci attive c’è');
  assert.match(attive.textContent, /Focalizzazione ✕/);
  assert.match(attive.textContent, /Circostanza −2 ✕/);
  const tolta = attive.querySelectorAll('.voce-attiva').find((b) => /Focalizzazione/.test(b.textContent));
  clic(tolta);
  const ricorda = ctx.chiamate.find((c) => c[0] === 'ricordaLancio');
  assert.ok(ricorda && ricorda[2].focalizzazione === false, 'toglie solo quella');
  assert.equal(lancio().pannello.querySelector('.voci-attive'), null, 'senza scelte, nessuna riga');
});

test('«Lancia» scala i PM come prima: il pulsante chiama lancia con il costo giusto', () => {
  const { ctx, pannello } = lancio();
  clic(bottoneLancia(pannello));
  const l = ctx.chiamate.find((c) => c[0] === 'lancia');
  assert.ok(l, 'chiama lancia');
  assert.equal(l[1].personali, 3, 'tre PM personali');
});

// ——— lo stesso pannello serve i nemici del Tavolo del Master (src/ui/lancio-nemico.js): il «finto» contesto non deve rompersi ———
import { readFileSync } from 'node:fs';
import { nuovoScontro, aggiungiNemici } from '../src/scontro.js';
import { calcolaLancioNemico } from '../src/nemico-lancio.js';
import { copia } from './helpers.js';
const { pannelloLancio } = await import('../src/ui/lancio.js');

test('il pannello sintetico serve anche i nemici della plancia: il lancio di un nemico si apre, con il suo costo e «Altro ▾» chiuso', () => {
  const legionario = JSON.parse(readFileSync(new URL('./nemici/legionario-non-morto.json', import.meta.url), 'utf8'));
  const n = { ...copia(legionario), id: 'inquisitore-prova', nome: 'Inquisitore di prova', pm: 12,
    incantesimi: [{ nome: 'Dardo Psichico', livello: 8, va: 14, costo_pm: 8, regime: 'taumaturgo', bonus_danno_magico: 2 }] };
  const T0 = new Date(2026, 9, 2, 21, 0, 0);
  const s = aggiungiNemici(nuovoScontro({ id: 'prova221', adesso: T0, pg: [] }), n, 1, {}, T0);
  const p = s.partecipanti.find((x) => x.tipo === 'nemico');
  const st = { dichiarazione: {}, ui: {} };
  const x = calcolaLancioNemico(p, 0, st.dichiarazione, dati);
  const chiamate = [];
  const finto = {
    dati, tab: { scheda: x.chi.scheda }, sessione: { ...x.chi.sessione, lanci: { [x.inc.nome]: st.dichiarazione } }, massimi: { pm: p.pm?.massimo ?? 0 },
    calcola: (d) => calcolaLancioNemico(p, 0, d, dati).risultato, ui: st.ui,
    partecipanti: [{ id: p.id, nome: `${p.nome} (sé)` }],
    azioni: { ridisegna() {}, ricordaLancio: (nome, d) => { st.dichiarazione = d; }, lancia: async (...a) => { chiamate.push(a); } },
  };
  const radice = document.createElement('div');
  radice.append(pannelloLancio(finto, x.inc));
  const pan = radice.querySelector('.lancio-pannello');
  assert.ok(pan && pan.className.includes('attacco-sintetico'), 'il pannello sintetico c’è');
  assert.ok(!pan.querySelector('.attacco-altro').open);
  const b = bottoneLancia(pan);
  assert.match(b.textContent, /Lancia \(−8 PM\)/, 'il costo del nemico: 8 PM');
  assert.ok(righeFinoA(pan, b) <= LIMITE_RIGHE_PRIMA_DEL_PULSANTE);
  clic(b);
  assert.equal(chiamate.length, 1, 'il pulsante chiama lancia del nemico');
});
