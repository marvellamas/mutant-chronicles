// Il riquadro «Condizioni attive» non si sovrappone più alla tabella delle Abilità (20/10/2026, difetto visto dal
// tablet di Marcello: il riquadro galleggiava sopra la tabella con la sua ombra, i pulsanti «Calcolo» della colonna di
// destra erano tagliati a metà e si leggevano «Calcol…»).
//
// La causa erano due cose insieme:
//   1. la tabella delle Abilità, con `table-layout: auto`, non scende sotto la propria larghezza minima: attorno ai
//      1180 px, dove le due tabelle stanno affiancate, sforava la sua colonna di 28 px misurati, e la colonna
//      «Calcolo» finiva fuori;
//   2. `.colonna-condizioni` era `position: sticky`, cioè un elemento posizionato: si disegnava sopra la parte di
//      tabella uscita dalla colonna (e, più alto dello schermo, lasciava il proprio fondo fuori portata).
//
// NB (onestà sui limiti): `node --test` non ha un motore di layout, quindi qui si prova il *contratto* — nessun
// posizionamento che tolga il riquadro dal flusso, nessun ritaglio del suo contenuto, e la tabella legata alla
// larghezza della sua colonna con le colonne fisse. La misura vera dei rettangoli (riquadro contro ogni «Calcolo»,
// a 768, 800, 820, 912, 1024, 1180 e 1280 px) è stata fatta nel browser con getBoundingClientRect: è nel riepilogo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa } from './scheda-aiuti.js';

const CSS = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const TAB_JS = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
const ESEMPIO = 'Fratello-Anselmo-Viri_liv3_2026-10-02.json';

/** Le dichiarazioni dei blocchi il cui selettore nomina la classe, dovunque siano nel foglio. */
function dichiarazioni(classe) {
  const fuori = [];
  const re = new RegExp(`([^{}]*\\.${classe}\\b[^{}]*)\\{([^}]*)\\}`, 'g');
  for (const m of CSS.matchAll(re)) fuori.push({ selettore: m[1].trim(), corpo: m[2] });
  return fuori;
}

for (const colonna of ['colonna-condizioni', 'colonna-stati']) {
  test(`${colonna}: nessun posizionamento che la tolga dal flusso`, () => {
    const blocchi = dichiarazioni(colonna);
    assert.ok(blocchi.length, `nessuna regola per .${colonna}`);
    for (const b of blocchi) {
      const pos = b.corpo.match(/(^|;)\s*position\s*:\s*([a-z-]+)/);
      if (!pos) continue;
      assert.ok(['static', 'relative'].includes(pos[2]),
        `.${colonna} con «position: ${pos[2]}» (${b.selettore}): sarebbe un elemento posizionato e si disegnerebbe sopra la tabella`);
    }
  });

  test(`${colonna}: non ritaglia il proprio contenuto`, () => {
    for (const b of dichiarazioni(colonna)) {
      assert.ok(!/(^|;)\s*max-height\s*:/.test(b.corpo), `.${colonna} con max-height (${b.selettore}): il contenuto resterebbe tagliato`);
      assert.ok(!/(^|;)\s*overflow(-y)?\s*:\s*hidden/.test(b.corpo), `.${colonna} con overflow nascosto (${b.selettore})`);
    }
  });
}

test('le Condizioni attive non hanno ombra: non devono sembrare un riquadro che galleggia', () => {
  for (const b of dichiarazioni('condizioni-attive')) {
    assert.ok(!/box-shadow\s*:\s*(?!none)/.test(b.corpo), `.condizioni-attive con un'ombra (${b.selettore})`);
  }
});

test('la tabella delle Abilità vale esattamente la sua colonna, con le colonne fisse', () => {
  const blocchi = dichiarazioni('abilita-tab').filter((b) => /table-layout/.test(b.corpo));
  assert.equal(blocchi.length, 1, 'serve una sola regola che fissi il layout della tabella delle Abilità');
  assert.match(blocchi[0].corpo, /table-layout\s*:\s*fixed/);
  assert.match(blocchi[0].corpo, /width\s*:\s*100%/);
  // la colonna del «Calcolo» ha una larghezza sua: il pulsante c'è sempre per intero
  const col = dichiarazioni('col-calcolo');
  assert.ok(col.length, 'manca la larghezza della colonna «Calcolo»');
  assert.match(col[0].corpo, /width\s*:\s*[\d.]+rem/);
});

test('niente nella tabella delle Abilità la allarga oltre la colonna', () => {
  for (const b of dichiarazioni('abilita-tab')) {
    assert.ok(!/(^|;)\s*min-width\s*:/.test(b.corpo), `.abilita-tab con min-width (${b.selettore}): tornerebbe a sforare`);
  }
  for (const b of dichiarazioni('cella-calcolo')) {
    assert.ok(!/white-space\s*:\s*nowrap/.test(b.corpo), `.cella-calcolo con nowrap (${b.selettore})`);
  }
});

test('la tabella delle Abilità dichiara le sue tre colonne (colgroup)', () => {
  const ctx = contesto(ESEMPIO, { attiva: 'abilita' });
  const { radice } = resa(ctx);
  const tabelle = radice.querySelectorAll('.abilita-tab');
  assert.ok(tabelle.length >= 1, 'nessuna tabella delle Abilità');
  for (const t of tabelle) {
    const col = t.tutti().filter((c) => c.tagName === 'COL');
    assert.equal(col.length, 3, 'servono tre col: Abilità, VA, Calcolo');
    assert.ok(col.some((c) => c.className === 'col-calcolo'), 'manca la col del «Calcolo»');
  }
});

test('ogni riga di Abilità ha il suo «Calcolo», nella terza colonna', () => {
  const ctx = contesto(ESEMPIO, { attiva: 'abilita' });
  const { radice } = resa(ctx);
  const bottoni = radice.querySelectorAll('.btn-calcolo');
  assert.ok(bottoni.length >= 20, `pulsanti «Calcolo» trovati: ${bottoni.length}`);
  for (const b of bottoni) assert.equal(b.textContent, 'Calcolo');
  // la cella del «Calcolo» è l'ultima della riga: con table-layout fixed è la colonna di larghezza nota
  for (const c of radice.querySelectorAll('.cella-calcolo')) assert.ok(c.querySelectorAll('.btn-calcolo').length === 1);
});

test('il riquadro delle Condizioni attive sta in una colonna sua, non sopra la tabella', () => {
  const ctx = contesto(ESEMPIO, {
    attiva: 'abilita',
    cambia: (s) => { s.ferite = 2; s.affaticamento = 3; s.statiAttivi = ['Accecato', 'Rallentato', 'Avvelenato']; s.circostanze = [{ id: 'c1', valore: 2, categorie: ['tutto'] }]; },
  });
  const { radice } = resa(ctx);
  const layout = radice.querySelectorAll('.abilita-layout');
  assert.equal(layout.length, 1);
  const figli = layout[0].children;
  assert.deepEqual(figli.map((f) => f.className), ['abilita-principale', 'colonna-condizioni'],
    'il riquadro deve essere il secondo figlio della griglia: una colonna vera accanto alla tabella');
  // e il riquadro contiene davvero le condizioni chieste dalla prova
  const testo = layout[0].textContent;
  for (const x of ['Condizioni attive', 'Ferita Importante', 'Stanco', 'Bonus di circostanza']) assert.ok(testo.includes(x), `manca «${x}» nelle Condizioni attive`);
});

test('tab.js: il commento dice perché le colonne sono fisse', () => {
  assert.match(TAB_JS, /colgroup/, 'manca il colgroup nella tabella delle Abilità');
  assert.match(TAB_JS, /sforava la colonna|sforava/, 'manca la nota sul perché');
});
