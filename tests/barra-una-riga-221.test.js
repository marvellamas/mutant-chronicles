import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 221, parte 3 — la barra della scheda su una riga. A 820 px era passata da una riga a due (+39 px) perché alle azioni di ottobre si
// erano aggiunti ⛶, 🔍 e 🖼 Galleria. Adesso stanno nel menu «Azioni ▾» (un tocco in più); restano in barra la ✓ del salvataggio, il
// «⚔ Round N» dello scontro, ↶ Annulla, «Sali al livello», Azioni e ⚙. L'impaginazione vera si misura nel browser (documento del lotto);
// qui la struttura e le regole CSS, che sono quelle che la tengono su una riga e sotto la fascia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, clic, ESEMPI } from './scheda-aiuti.js';

const TORVALD = ESEMPI.find((f) => f.startsWith('Torvald'));
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
function barra({ server = true, scontro = true } = {}) {
  const ctx = contesto(TORVALD, { attiva: 'combattimento' });
  ctx.server = server;
  ctx.salvataggioMaster = { stato: 'salvato', testo: 'Salvato sul PC del master alle 20:00', breve: '✓' };
  ctx.collegamento = server ? { stato: 'collegato', testo: 'collegato al tavolo', titolo: 'Il file arriva al tavolo' } : null;
  ctx.roundScontro = scontro ? { round: 3, nome: 'Scontro del 18/11' } : null;
  const r = resa(ctx);
  return { ctx, r, azioni: r.classe('barra-azioni')[0] };
}
const classi = (nodo) => nodo.children.map((c) => c.className);

test('IN BARRA restano la ✓ del salvataggio e il «⚔ Round N» dello scontro (non si perdono)', () => {
  const { azioni } = barra();
  const c = classi(azioni).join(' ');
  assert.match(c, /indicatore-salvataggio/, 'la ✓');
  assert.match(c, /round-scontro-testa/, 'il Round');
  const round = azioni.querySelector('.round-scontro-testa');
  assert.match(round.textContent, /Round 3/);
  assert.equal(azioni.querySelector('.indicatore-salvataggio').textContent, '✓');
  assert.match(c, /indicatore-collegamento/, 'il collegamento al tavolo (la pallina)');
  assert.ok(azioni.children.some((x) => /^Sali al livello/.test(x.textContent)), '«Sali al livello»');
});

test('FUORI DALLA BARRA: schermo intero, ricerca e Galleria non sono più pulsanti della barra (ci sono nel menu Azioni)', () => {
  const { azioni, r } = barra();
  assert.equal(azioni.querySelectorAll('.btn-schermo-intero').filter((x) => x.parent === azioni).length, 0, 'né ⛶');
  assert.equal(azioni.children.filter((x) => /btn-galleria|btn-cerca/.test(x.className)).length, 0, 'né 🖼 né 🔍');
  const menu = azioni.children.find((x) => x.className.includes('menu-azioni') && !x.className.includes('impostazioni'));
  const testi = menu.querySelectorAll('.menu-voci').flatMap((v) => v.children).map((x) => x.textContent);
  assert.ok(testi.some((t) => /Cerca nella scheda/.test(t)), 'Cerca nel menu');
  assert.ok(testi.some((t) => /Galleria/.test(t)), 'Galleria nel menu');
  assert.ok(menu.querySelectorAll('.btn-schermo-intero').length >= 1, 'schermo intero nel menu');
});

test('senza il server la Galleria non c’è (le immagini stanno sul PC del master), la ricerca sì', () => {
  const { azioni } = barra({ server: false, scontro: false });
  const menu = azioni.children.find((x) => x.className.includes('menu-azioni') && !x.className.includes('impostazioni'));
  const testi = menu.querySelectorAll('.menu-voci').flatMap((v) => v.children).map((x) => x.textContent);
  assert.ok(!testi.some((t) => /Galleria/.test(t)));
  assert.ok(testi.some((t) => /Cerca nella scheda/.test(t)));
});

test('«Cerca nella scheda» dal menu apre la ricerca: il campo compare in barra, com’era', () => {
  const { ctx, r } = barra();
  const voce = r.tutti.find((x) => x.tagName === 'BUTTON' && /Cerca nella scheda/.test(x.textContent));
  assert.ok(voce);
  assert.ok(!ctx.ui.cerca?.aperta);
  clic(voce);
  assert.equal(ctx.ui.cerca.aperta, true);
  const dopo = resa(ctx);
  assert.ok(dopo.classe('campo-cerca').length >= 1, 'il campo di ricerca c’è');
});

test('«collegato» in barra è la pallina (la parola sta nel suggerimento); «non collegato» resta scritto per intero — è un avviso', () => {
  const { azioni } = barra();
  const pillola = azioni.querySelector('.indicatore-collegamento');
  assert.ok(pillola.children.some((x) => x.className === 'testo-collegato'), 'collegato: la parola è in uno span che il CSS nasconde sotto i 1000 px');
  assert.match(css, /@media \(max-width: 1000px\) \{ \.indicatore-collegamento\.collegato \.testo-collegato \{ display: none; \}/);
  const ctx = contesto(TORVALD); ctx.server = true; ctx.collegamento = { stato: 'non_collegato', testo: 'non collegato', titolo: 'x' };
  const p2 = resa(ctx).classe('indicatore-collegamento')[0];
  assert.equal(p2.textContent, 'non collegato');
});

test('SU UNA RIGA: il titolo si stringe invece di mandare le azioni a una seconda riga (regole CSS)', () => {
  assert.match(css, /\.barra-titolo \{ min-width: 0; flex: 1 1 10rem; \}/, 'il titolo ha una base piccola e si stringe');
  assert.match(css, /\.barra-scheda > \.barra-azioni \{ flex: 0 0 auto;/, 'le azioni non si stringono: il titolo prende quello che resta');
});

test('SOTTO LA FASCIA GIALLA (lotto 177): la barra non è fissa né incollata in cima — sta nel flusso, sotto le fasce impilate', () => {
  const blocco = /\.barra-scheda \{[^}]*\}/.exec(css)[0];
  assert.ok(!/position:\s*(fixed|sticky)/.test(blocco), 'la barra non è fixed né sticky: la fascia della copia di prova non la copre');
  // il menu Azioni si apre sopra il resto ma dentro la pagina (z-index del menu), non in cima alla finestra
  assert.match(css, /\.menu-voci \{\s*position: absolute; right: 0; top: calc\(100% \+ 0\.35rem\); z-index: var\(--z-menu\)/);
  // e le colonne incollate sottraggono --alto-fasce (tests/fasce-impilate.test.js lo controlla): qui non se ne aggiungono senza
  const incollate = css.match(/position: sticky; top: [^;]*;/g) ?? [];
  for (const s of incollate) assert.match(s, /alto-fasce|top: 0|0\.\d+rem|var\(--[a-z-]+\)/, s);
});
