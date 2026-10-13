// Ritocchi della scheda del giocatore (13/10/2026, richieste di Marcello dopo la sessione del 12/10): solo
// disposizione, salvo le Ferite «Oltre» (tests/ferite-oltre.test.js). Si rende la scheda con il DOM finto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, clic, TAB, ESEMPI } from './scheda-aiuti.js';

const TORVALD = ESEMPI.find((f) => f.startsWith('Torvald'));

// ---------------------------------------------------------------------------
// punto 2: «Bonus dei Talenti» nelle Opzioni, con il segno in testata se è spento

test('l’interruttore dei Talenti non sta più nelle tab: è nelle Opzioni (⚙)', () => {
  for (const attiva of TAB) {
    const r = resa(contesto(TORVALD, { attiva }));
    assert.equal(r.classe('interruttore-talenti').length, 0, `${attiva}: niente riquadro nelle tab`);
    assert.equal(r.classe('opzione-talenti').length, 1, `${attiva}: una voce nelle Opzioni`);
  }
  // e funziona come prima: il tocco chiama la stessa azione
  const ctx = contesto(TORVALD, { attiva: 'combattimento' });
  const r = resa(ctx);
  const casella = r.classe('opzione-talenti')[0].tutti().find((n) => n.tagName === 'INPUT');
  casella.ascolti.change[0]({ target: casella });
  assert.deepEqual(ctx.chiamate.map((x) => x[0]), ['bonusTalenti']);
});

test('con i Talenti spenti la testata lo dice, in ogni tab; accesi non c’è nulla', () => {
  for (const attiva of TAB) {
    const acceso = resa(contesto(TORVALD, { attiva }));
    assert.equal(acceso.classe('segno-talenti-spenti').length, 0, `${attiva}: niente segno con i Talenti accesi`);
    const spento = resa(contesto(TORVALD, { attiva, cambia: (s) => { s.bonusTalenti = false; } }));
    const segno = spento.classe('segno-talenti-spenti');
    assert.equal(segno.length, 1, `${attiva}: il segno c’è`);
    assert.match(segno[0].textContent, /Talenti spenti/);
    assert.ok(spento.classe('testata-comune')[0].tutti().some((n) => n.className === 'segno-talenti-spenti'), `${attiva}: il segno sta nella testata`);
  }
});

// ---------------------------------------------------------------------------
// punto 3: i sei riquadri in basso nel Combattimento

test('Combattimento: sei riquadri in una griglia, Difese per prima e Luce in coda', () => {
  const r = resa(contesto(TORVALD, { attiva: 'combattimento' }));
  const griglia = r.classe('griglia-valori');
  assert.equal(griglia.length, 1, 'una sola griglia dei valori');
  const titoli = griglia[0].children.map((c) => c.tutti().find((n) => n.tagName === 'H3' || n.tagName === 'H2')?.textContent ?? '');
  assert.deepEqual(titoli.map((t) => t.replace(/\s*\(.*$/, '').trim()),
    ['Difese', 'Prove Salvezza', 'Iniziativa', 'Movimento', 'Azioni', 'Luce sul bersaglio'],
    'ordine chiesto: Difese, Prove Salvezza (la più evidente), Iniziativa, Movimento, Azioni, Luce');
  // «Luce sul bersaglio» non è più fuori dalla griglia
  assert.equal(r.classe('riquadro-luce').filter((n) => !n.parent?.className?.includes('griglia-valori')).length, 0);
  // Prove Salvezza: il riquadro grande con il suo colore
  const ps = griglia[0].children.find((c) => /Prove Salvezza/.test(c.textContent));
  assert.match(ps.className, /riquadro-grande/);
});

test('i sei riquadri hanno la stessa struttura: una section con il titolo', () => {
  for (const f of ESEMPI) {
    const r = resa(contesto(f, { attiva: 'combattimento' }));
    const g = r.classe('griglia-valori')[0];
    assert.equal(g.children.length, 6, `${f}: sei riquadri`);
    for (const c of g.children) assert.equal(c.tagName, 'SECTION', `${f}: ogni riquadro è una section`);
  }
});

test('il foglio di stile allinea la griglia e dà un colore proprio alle Prove Salvezza', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.griglia-valori \{[^}]*grid-template-columns[^}]*\}/, 'griglia a colonne');
  assert.match(css, /\.griglia-valori \{[^}]*align-items: stretch/, 'riquadri della stessa altezza');
  assert.match(css, /\.griglia-valori > \.riquadro-grande \{/, 'le Prove Salvezza più grandi');
  assert.match(css, /--salvezze-sfondo/, 'colore proprio, definito nella palette (chiaro e scuro)');
  const palette = readFileSync(new URL('../css/palette.css', import.meta.url), 'utf8');
  assert.ok((palette.match(/--salvezze-sfondo/g) ?? []).length >= 2, 'definito per tema chiaro e scuro');
});
