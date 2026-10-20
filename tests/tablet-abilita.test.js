// Difetto del tablet del 19/10/2026, punto 4: nella tab Abilità, con le Condizioni attive, le due colonne restano
// leggibili a misura di tablet o vanno una sotto l'altra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, ESEMPI } from './scheda-aiuti.js';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const rem = (v) => Number(v);

test('Abilità: sotto 40rem di pannello le Condizioni attive vanno sotto la tabella, a tutta larghezza', () => {
  const m = /@container \(max-width: (\d+)rem\) \{\s*\.abilita-layout \{ grid-template-columns: minmax\(0, 1fr\); \}\s*\.colonna-condizioni \{ position: static; \}/.exec(css);
  assert.ok(m, 'regola di impilamento delle colonne');
  assert.ok(rem(m[1]) >= 38, `soglia ${m[1]}rem: alta abbastanza perché la tabella non si schiacci (≥ 24rem di tabella + 13rem di Condizioni)`);
  // nessuna regola più vecchia e più bassa che lasci le due colonne strette
  assert.doesNotMatch(css, /@container \(max-width: 30rem\) \{\s*\.abilita-layout/);
});

test('Abilità: con due colonne la colonna delle Condizioni non scende sotto 13rem', () => {
  assert.match(css, /@container \(max-width: 52rem\) \{\s*\.abilita-layout \{ grid-template-columns: minmax\(0, 1fr\) minmax\(13rem, 14rem\);/);
  assert.match(css, /\.abilita-layout \{ display: grid; grid-template-columns: minmax\(0, 1fr\) 17rem;/);
});

test('Abilità: la scheda mette le Condizioni attive accanto alla tabella nello stesso contenitore a griglia', () => {
  const c = ESEMPI.map((f) => contesto(f, { attiva: 'abilita' })).find((x) => (x.tab.scheda.equipaggiamento?.oggetti ?? []).length || true);
  const r = resa(c);
  const layout = r.classe('abilita-layout')[0];
  assert.ok(layout, 'il contenitore a griglia c’è');
  assert.deepEqual(layout.children.map((n) => n.className.split(' ')[0]), ['abilita-principale', 'colonna-condizioni']);
  const cond = layout.children[1];
  assert.equal(cond.tagName, 'ASIDE');
  assert.ok(cond.querySelector('.condizioni-attive') ?? cond.tutti().some((n) => n.className?.includes('condizioni-attive')), 'il riquadro «Condizioni attive»');
});
