// Stati in colonna qualunque cosa compaia nella riga (12/10/2026, sessione di gioco di Marcello e Davide):
// con Ammalato acceso il menu delle intensità («Ammalato 3 — penalità −4») usciva dalla sua casella e copriva
// quella accanto. Misurato nel browser a 1280 px: menu di 215 px in una cella da 192, 112 px sopra il vicino.
// Qui si controlla la forma (il menu sta dentro la cella dello Stato, con le note) e le regole di stile che ce lo
// tengono a ogni larghezza; la misura vera si fa nel browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installaDomFinto } from './dom-finto.js';
import { datiReali, copia } from './helpers.js';
import { preparaTab } from '../src/stampa.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, allineaSessione, penalitaSessione } from '../src/sessione.js';

installaDomFinto();
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { renderTab, tabFissi } = await import('../src/ui/tab.js');
const { dati } = await datiReali();
const CSS = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const PG = 'Torvald-Krane_liv6_2026-10-02.json';

/** La tab Combattimento di un PG d'esempio, con gli Stati indicati accesi. */
function combattimentoCon(stati) {
  const p = deserializzaPersonaggio(readFileSync(new URL(`../esempi/${PG}`, import.meta.url), 'utf8'));
  const creazione = normalizza(p.creazione, dati).scelte;
  const riposo = preparaTab({ creazione, livelli: p.livelli }, dati);
  const massimi = massimiSessione(riposo.scheda, creazione, dati);
  const sessione = allineaSessione(copia(p.sessione), massimi);
  sessione.statiAttivi = stati;
  const tab = preparaTab({ creazione, livelli: p.livelli }, dati, { sessione });
  tab.tab = tabFissi(tab.tab);
  const azioni = new Proxy({}, { get: () => () => {} });
  const ctx = {
    dati, tab, attiva: 'combattimento', scelte: creazione, livelli: p.livelli, sessione, massimi,
    penalita: penalitaSessione(sessione, dati), posizione: 'alto', larghezza: 'piena', sfondi: [],
    passi: { background: 0, equipaggiamento: 8 }, ui: {}, azioni, partecipanti: [], chi: {}, server: false,
  };
  const radice = document.createElement('div');
  radice.append(...renderTab(ctx).filter(Boolean));
  return radice;
}
const conClasse = (radice, c) => radice.tutti().filter((n) => String(n.className ?? '').split(/\s+/).includes(c));

/** Le regole di stile che nominano una classe: [{ selettore, corpo }]. */
function regoleDi(classe) {
  const out = [];
  for (const m of CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim();
    if (sel.includes(`.${classe}`)) out.push({ selettore: sel, corpo: m[2].replace(/\s+/g, ' ').trim() });
  }
  return out;
}
const dichiara = (classe, proprieta, valore, dentro = null) => regoleDi(classe)
  .filter((r) => !dentro || r.selettore.includes(dentro))
  .some((r) => new RegExp(`(^|;)\\s*${proprieta}\\s*:\\s*${valore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(r.corpo));

test('il menu delle intensità sta dentro la casella del suo Stato', () => {
  const radice = combattimentoCon(['ammalato']);
  const liste = conClasse(radice, 'stati-compatti');
  assert.equal(liste.length, 1, 'la lista degli Stati c’è');
  const menu = conClasse(radice, 'intensita-stato');
  assert.equal(menu.length, 1, 'con Ammalato acceso c’è un menu, uno solo');
  // il menu è figlio della casella («label.stato-compatto»), non un fratello che sborda nella colonna accanto
  const celle = conClasse(radice, 'stato-compatto');
  const dentro = celle.filter((c) => c.tutti().includes(menu[0]));
  assert.equal(dentro.length, 1, 'il menu sta dentro la casella dello Stato');
  assert.equal(dentro[0].tagName, 'LABEL');
  // le opzioni vengono dai dati (A.119), non dal codice
  const opzioni = menu[0].tutti().filter((n) => n.tagName === 'OPTION');
  assert.equal(opzioni.length, dati.regole.stati.elenco.find((s) => s.id === 'ammalato').intensita.valori.length);
  assert.match(opzioni[2].textContent, /Ammalato 3/);
});

test('senza Ammalato non c’è nessun menu nelle caselle', () => {
  assert.equal(conClasse(combattimentoCon([]), 'intensita-stato').length, 0);
});

test('le note accanto al nome stanno anch’esse dentro la casella', () => {
  // Svenuto porta «· da Svenuto» su A Terra (sintesi del 05/10): la nota è dentro la casella, come il menu
  const radice = combattimentoCon(['svenuto', 'ammalato']);
  const celle = conClasse(radice, 'stato-compatto');
  const note = radice.tutti().filter((n) => n.tagName === 'SMALL' && /da Svenuto/.test(n.textContent ?? ''));
  assert.ok(note.length >= 1, 'la nota «· da Svenuto» c’è');
  for (const n of note) assert.ok(celle.some((c) => c.tutti().includes(n)), 'la nota sta dentro una casella');
});

test('le regole di stile tengono gli Stati in colonna a qualunque larghezza', () => {
  // le caselle della griglia si possono stringere: senza questo il contenuto allarga la colonna e sborda
  assert.ok(dichiara('stati-compatti', 'min-width', '0', 'li'), '.stati-compatti li: min-width 0');
  assert.ok(dichiara('stato-compatto', 'min-width', '0'), '.stato-compatto: min-width 0');
  // il menu va a capo dentro la cella e non supera mai la larghezza della cella
  assert.ok(dichiara('stato-compatto', 'flex-wrap', 'wrap'), '.stato-compatto: flex-wrap wrap');
  assert.ok(dichiara('intensita-stato', 'max-width', '100%'), 'il menu non supera la cella');
  assert.ok(dichiara('intensita-stato', 'flex', '1 1 100%'), 'il menu prende una riga sua dentro la cella');
  // la griglia resta a colonne: quante lo decide lei, non il contenuto
  assert.ok(regoleDi('stati-in-alto').some((r) => /grid-template-columns:\s*repeat\(auto-fill/.test(r.corpo)),
    'gli Stati in alto restano una griglia a colonne automatiche');
  // anche nella plancia il menu non allarga la fila delle pillole
  assert.ok(dichiara('plancia-stati', 'max-width', '100%', 'intensita-stato'));
});
