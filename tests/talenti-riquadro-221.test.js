import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 221, parte 2 — via il riquadro «Talenti: tutti scelti» (139 px in tutte e otto le tab per dire che non c'è niente da fare).
// Resta, e si vede, quando c'è un Talento da scegliere (è una cosa che il giocatore deve fare) o un posto da decidere dal Direttore;
// e resta un modo per cambiare un Talento: «Cambia un Talento» nel menu Azioni.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, clic, dati, ESEMPI, TAB } from './scheda-aiuti.js';
import { riquadroTalenti } from '../src/ui/talenti-scelta.js';

const TORVALD = ESEMPI.find((f) => f.startsWith('Torvald'));
const posto = (livello, categoria, scelta, extra = {}) => ({ livello, categoria, scelta, valida: true, chiuso: false, problemi: [], ...extra });
const categorie = (mancanti = 0) => ({ specializzazione: { mancanti }, talento_libero: { mancanti: 0 }, maestria: { mancanti: 0 } });
/** Un contesto dei Talenti come lo dà contestoTalenti (src/ui/app.js), con i soli campi che il riquadro e il menu leggono. */
const talenti = ({ posti, mancanti = 0, master = false, bloccato = null, aperto = false } = {}) => ({
  posti: { regime: 'nuovo', categorie: categorie(mancanti), posti, prossimo: posti.find((x) => !x.scelta) ?? null },
  successive: [], dati, ui: { aperto, posto: null, filtro: '' }, master, bloccato,
  azioni: { ridisegna() {}, scegli() {}, scegliSuccessiva() {}, svuota() {}, chiudi() {}, riapri() {} },
  disegna: riquadroTalenti,
});
const TUTTI_SCELTI = () => [posto(1, 'specializzazione', { id: 'specializzazione-armi-leggere' }), posto(3, 'talento_libero', { id: 'x' })];
const UNO_DA_SCEGLIERE = () => [posto(1, 'specializzazione', { id: 'specializzazione-armi-leggere' }), posto(3, 'talento_libero', null)];

test('TUTTO A POSTO: né il giocatore vede il riquadro «Talenti: tutti scelti»', () => {
  assert.equal(riquadroTalenti(talenti({ posti: TUTTI_SCELTI() })), null);
  // e nemmeno in nessuna delle otto tab
  for (const attiva of TAB) {
    const ctx = contesto(TORVALD, { attiva });
    ctx.talenti = talenti({ posti: TUTTI_SCELTI() });
    assert.equal(resa(ctx).classe('riquadro-talenti').length, 0, `tab ${attiva}: nessun riquadro`);
  }
});

test('UN TALENTO DA SCEGLIERE: l’avviso c’è, si vede (riquadro «attenzione») e dice che cosa manca — in ogni tab', () => {
  const r = riquadroTalenti(talenti({ posti: UNO_DA_SCEGLIERE(), mancanti: 1 }));
  assert.ok(r, 'il riquadro c’è');
  assert.ok(r.className.includes('attenzione'), 'come avviso, non come «ok»');
  assert.match(r.textContent, /Da scegliere: 1 /);
  assert.match(r.textContent, /Scegli/, 'con il pulsante per scegliere');
  for (const attiva of TAB) {
    const ctx = contesto(TORVALD, { attiva });
    ctx.talenti = talenti({ posti: UNO_DA_SCEGLIERE(), mancanti: 1 });
    assert.equal(resa(ctx).classe('riquadro-talenti').length, 1, `tab ${attiva}: l’avviso c’è`);
  }
});

test('IL TEST CHE DEVE RESTARE ROSSO SE L’AVVISO SPARISCE: con un posto vuoto il riquadro non può essere null, comunque sia ui.aperto', () => {
  for (const aperto of [false, true]) {
    assert.ok(riquadroTalenti(talenti({ posti: UNO_DA_SCEGLIERE(), mancanti: 1, aperto })), `aperto=${aperto}`);
  }
});

test('un posto da decidere dal Direttore (A.229, A.230) resta a vista anche con tutto scelto', () => {
  const tolta = posto(1, 'specializzazione', { id: 'specializzazione-armi-leggere' }, { problemi: [{ tipo: 'tolta', regola: 'A.229' }] });
  assert.ok(riquadroTalenti(talenti({ posti: [tolta, posto(3, 'talento_libero', { id: 'x' })] })), 'l’avviso resta');
});

test('CAMBIARE UN TALENTO si può ancora: «Cambia un Talento» nel menu Azioni apre le scelte (un tocco in più)', () => {
  const ctx = contesto(TORVALD, { attiva: 'identita' });
  ctx.talenti = talenti({ posti: TUTTI_SCELTI() });
  const r = resa(ctx);
  const voce = r.tutti.find((x) => x.tagName === 'BUTTON' && /^Cambia un Talento$/.test(x.textContent));
  assert.ok(voce, 'la voce c’è nel menu');
  assert.equal(ctx.talenti.ui.aperto, false);
  clic(voce);
  assert.equal(ctx.talenti.ui.aperto, true, 'apre il riquadro');
  // aperto, il riquadro c’è (con «Chiudi») anche a posti pieni
  const aperto = riquadroTalenti(ctx.talenti);
  assert.ok(aperto && /Chiudi/.test(aperto.textContent));
});

test('la voce del menu non c’è dove non si può cambiare: scelte chiuse dal Direttore, tablet bloccato, regime vecchio', () => {
  const senza = (t) => { const ctx = contesto(TORVALD); ctx.talenti = t; return !resa(ctx).tutti.some((x) => x.tagName === 'BUTTON' && /^Cambia un Talento$/.test(x.textContent)); };
  assert.ok(senza(talenti({ posti: TUTTI_SCELTI().map((x) => ({ ...x, chiuso: true })) })), 'chiuse dal Direttore');
  assert.ok(senza(talenti({ posti: TUTTI_SCELTI(), bloccato: 'bloccato' })), 'bloccato');
  assert.ok(senza(null), 'nessun contesto dei Talenti (PG di prima)');
});

test('il Direttore (modalità master) il riquadro lo vede sempre: ha «Chiudi le scelte»', () => {
  const r = riquadroTalenti(talenti({ posti: TUTTI_SCELTI(), master: true }));
  assert.ok(r && /Chiudi le scelte/.test(r.textContent));
});
