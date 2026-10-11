// Ritocchi della scheda dei giocatori (11/10/2026, richieste di Davide approvate da Marcello, S4–S32): solo
// disposizione e presentazione. Le funzioni pure sono in src/scheda-vista.js; le tab si rendono con il DOM finto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { installaDomFinto } from './dom-finto.js';
import { datiReali, copia } from './helpers.js';
import { preparaTab } from '../src/stampa.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, allineaSessione, penalitaSessione } from '../src/sessione.js';
import { datiTestata, statiAttiviVista, contoVa, formulaVa, modificatoriAttivi } from '../src/scheda-vista.js';

installaDomFinto();
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { renderTab, tabFissi } = await import('../src/ui/tab.js');
const { dati } = await datiReali();

const cartella = new URL('../esempi/', import.meta.url);
export const ESEMPI = readdirSync(cartella).filter((f) => f.endsWith('.json'));

/** Un PG d'esempio con la sua sessione (modificabile con `cambia`) e il contesto della scheda a tab. */
export function contesto(file, { attiva = 'identita', cambia = null, scelte = null } = {}) {
  const p = deserializzaPersonaggio(readFileSync(new URL(file, cartella), 'utf8'));
  let creazione = normalizza(p.creazione, dati).scelte;
  if (scelte) creazione = normalizza(scelte(copia(creazione)), dati).scelte;
  const riposo = preparaTab({ creazione, livelli: p.livelli }, dati);
  const massimi = massimiSessione(riposo.scheda, creazione, dati);
  const sessione = allineaSessione(p.sessione, massimi);
  cambia?.(sessione);
  const tab = preparaTab({ creazione, livelli: p.livelli }, dati, { sessione });
  tab.tab = tabFissi(tab.tab);
  const chiamate = [];
  const azioni = new Proxy({}, { get: (_, nome) => (...argomenti) => { chiamate.push([nome, ...argomenti]); } });
  return { dati, tab, attiva, scelte: creazione, livelli: p.livelli, sessione, massimi, penalita: penalitaSessione(sessione, dati), posizione: 'alto', larghezza: 'piena',
    sfondi: [], passi: { background: 0, equipaggiamento: 8 }, ui: {}, azioni, chiamate, partecipanti: [], chi: {}, server: false };
}

/** La scheda resa: radice finta con tutti i nodi, e gli aiuti per cercarli. */
export function resa(ctx) {
  const radice = document.createElement('div');
  radice.append(...renderTab(ctx).filter(Boolean));
  const tutti = radice.tutti();
  return { radice, tutti, classe: (c) => radice.querySelectorAll(`.${c}`), testo: () => radice.textContent };
}
export const clic = (nodo) => (nodo.ascolti.click ?? []).forEach((f) => f({ preventDefault() {}, stopPropagation() {}, target: nodo }));
export const TAB = ['identita', 'abilita', 'combattimento', 'poteri', 'artefatti', 'cibernetica', 'veicoli', 'inventario'];
const TORVALD = ESEMPI.find((f) => f.startsWith('Torvald'));

// ---------------------------------------------------------------------------
// S4: testata comune

test('S4: la testata con Punti Eroe, Distintivi e Crediti è accanto al titolo in tutte le tab, per ogni PG d’esempio', () => {
  for (const f of ESEMPI) {
    for (const attiva of TAB) {
      const r = resa(contesto(f, { attiva }));
      const titolo = r.classe('titolo-tab');
      assert.equal(titolo.length, 1, `${f} ${attiva}: un titolo`);
      const testata = titolo[0].querySelectorAll('.testata-comune');
      assert.equal(testata.length, 1, `${f} ${attiva}: testata nel titolo`);
      assert.equal(r.classe('testata-comune').length, 1, `${f} ${attiva}: una sola testata`);
      for (const c of ['voce-pe', 'voce-distintivi', 'voce-crediti']) assert.equal(testata[0].querySelectorAll(`.${c}`).length, 1, `${f} ${attiva}: ${c}`);
    }
  }
});

test('S4: Punti Eroe con il solo «−»; Distintivi con − / + e la conversione; Crediti con i tasti', () => {
  const ctx = contesto(TORVALD, { cambia: (s) => { s.puntiEroe = 1; s.distintivi = 0; } });
  const r = resa(ctx);
  const pe = r.classe('voce-pe')[0];
  const tastiPe = pe.tutti().filter((n) => n.tagName === 'BUTTON');
  assert.deepEqual(tastiPe.map((b) => b.textContent), ['−'], 'un solo tasto, il meno');
  clic(tastiPe[0]);
  assert.deepEqual(ctx.chiamate.at(-1), ['varia', 'puntiEroe', -1]);
  const dist = r.classe('voce-distintivi')[0].tutti().filter((n) => n.tagName === 'BUTTON');
  assert.deepEqual(dist.map((b) => b.textContent).slice(0, 2), ['−', '+']);
  assert.match(dist[2].textContent, /→ 1 PE/);
  assert.equal(dist[2].disabled, true, 'senza Distintivi non si converte');
  clic(dist[1]);
  assert.deepEqual(ctx.chiamate.at(-1), ['varia', 'distintivi', 1]);
  const crediti = r.classe('voce-crediti')[0];
  assert.equal(crediti.querySelectorAll('.input-crediti').length, 1);
  assert.equal(crediti.querySelectorAll('.btn-crediti').length, 14, 'da ±1 a ±1000');
});

test('S4: i dati della testata sono quelli della sessione; la conversione segue il §1.8.3', () => {
  const m = { puntiEroe: 3, distintiviPerPuntoEroe: 5 };
  assert.deepEqual(datiTestata({ puntiEroe: 0, distintivi: 5, crediti: 120, creditiIniziali: 1500 }, m), {
    puntiEroe: { valore: 0, massimo: 3, puoTogliere: false, puoAggiungere: false },
    distintivi: { valore: 5, puoTogliere: true, perPuntoEroe: 5, puoConvertire: true },
    crediti: { valore: 120, iniziali: 1500 },
  });
  assert.equal(datiTestata({ puntiEroe: 3, distintivi: 9, crediti: null }, m).distintivi.puoConvertire, false, 'riserva già al massimo');
  assert.equal(datiTestata({ puntiEroe: 3, distintivi: 9, crediti: null }, m).crediti, null);
});

test('S4: Punti Eroe, Distintivi e Crediti non sono più in Identità, nella colonna di sinistra e nell’Inventario', () => {
  for (const attiva of ['identita', 'inventario']) {
    const r = resa(contesto(TORVALD, { attiva }));
    assert.equal(r.classe('riquadro-pe').length, 0, `${attiva}: nessun riquadro dei Punti Eroe`);
    assert.equal(r.classe('riquadro-crediti').length, 0, `${attiva}: nessun riquadro dei Crediti`);
    assert.equal(r.tutti.filter((n) => n.tagName === 'H3' && /^(Distintivi|Crediti|Punti Eroe)$/.test(n.textContent)).length, 0);
  }
});

// ---------------------------------------------------------------------------
// S5: colonna di sinistra

test('S5: PV, Ferite e PM in ogni tab; gli Stati attivi sotto, in sola lettura, tranne che in Combattimento', () => {
  const stati = (s) => { s.statiAttivi = ['svenuto']; };
  for (const attiva of TAB) {
    const r = resa(contesto(TORVALD, { attiva, cambia: stati }));
    const colonna = r.classe('colonna-risorse')[0];
    assert.ok(colonna, `${attiva}: la colonna c'è`);
    assert.equal(colonna.querySelectorAll('.riquadro-pv').length, 1, `${attiva}: PV`);
    assert.ok(colonna.tutti().some((n) => n.tagName === 'H3' && /^Ferite/.test(n.textContent)), `${attiva}: Ferite`);
    const righe = colonna.querySelectorAll('.stati-attivi-colonna');
    if (attiva === 'combattimento') {
      assert.equal(righe.length, 0, 'in Combattimento gli Stati stanno in alto');
      assert.ok(colonna.tutti().some((n) => n.tagName === 'H3' && /^Affaticamento/.test(n.textContent)), 'Affaticamento sotto i PM (S13)');
      continue;
    }
    assert.equal(righe.length, 1, `${attiva}: riga degli Stati attivi`);
    assert.match(righe[0].textContent, /Svenuto/);
    assert.match(righe[0].textContent, /A Terra \(da Svenuto\)/, 'anche lo Stato che ne discende');
    assert.equal(righe[0].tutti().filter((n) => n.tagName === 'INPUT').length, 0, 'sola lettura');
  }
  const ctx = contesto(TORVALD, { attiva: 'abilita', cambia: stati });
  clic(resa(ctx).classe('stati-attivi-colonna')[0]);
  assert.deepEqual(ctx.chiamate.at(-1), ['vaiTab', 'combattimento'], 'un tocco porta al Combattimento');
});

test('S5: nessuno Stato attivo, nessuna riga', () => {
  for (const attiva of TAB) assert.equal(resa(contesto(TORVALD, { attiva })).classe('stati-attivi-colonna').length, 0, attiva);
  assert.deepEqual(statiAttiviVista({ statiAttivi: [] }, dati), []);
  assert.deepEqual(statiAttiviVista({ statiAttivi: ['svenuto'] }, dati).map((x) => [x.id, x.implicato]), [['a-terra', true], ['svenuto', false]].sort((a, b) => dati.regole.stati.elenco.findIndex((s) => s.id === a[0]) - dati.regole.stati.elenco.findIndex((s) => s.id === b[0])));
});

// ---------------------------------------------------------------------------
// S6: Identità

test('S6: in Identità non ci sono più i Distintivi né «Combattimento e movimento»; il resto resta', () => {
  for (const f of ESEMPI) {
    const r = resa(contesto(f, { attiva: 'identita' }));
    const titoli = r.tutti.filter((n) => n.tagName === 'H2').map((n) => n.textContent);
    assert.ok(!titoli.includes('Combattimento e movimento'), f);
    for (const t of ['Anagrafica', 'Caratteristiche', 'Prove Salvezza', 'Background', 'Note di sessione', 'Progressione']) assert.ok(titoli.includes(t), `${f}: ${t}`);
    assert.equal(r.tutti.filter((n) => n.tagName === 'H3' && /^(Iniziativa|Movimento|Azioni|Distintivi)$/.test(n.textContent)).length, 0, f);
  }
  // Iniziativa, Movimento e Azioni restano nella tab Combattimento
  const c = resa(contesto(TORVALD, { attiva: 'combattimento' }));
  for (const t of ['Iniziativa', 'Movimento', 'Azioni']) assert.equal(c.tutti.filter((n) => n.tagName === 'H3' && n.textContent === t).length, 1, t);
});

// ---------------------------------------------------------------------------
// S7, S8: Abilità

const segno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const numero = (n) => (n < 0 ? `−${-n}` : String(n));
const righeAbilita = (ctx) => ctx.tab.tab.find((t) => t.id === 'abilita').dati.categorie.flatMap((c) => c.abilita);
const conFerita = (s) => { s.ferite = 1; s.statiAttivi = ['a-terra']; };

test('S8: ogni riga ha il nome, il VA di prima e «Calcolo»; niente più colonne Mod, Base, Corp, Avanz, Equip', () => {
  for (const f of ESEMPI) {
    for (const cambia of [null, conFerita]) {
      const ctx = contesto(f, { attiva: 'abilita', cambia });
      const r = resa(ctx);
      const righe = r.tutti.filter((n) => n.tagName === 'TR' && n.querySelectorAll('.btn-calcolo').length === 1);
      const abilita = righeAbilita(ctx);
      assert.equal(abilita.length, 24);
      assert.equal(righe.length, 24, `${f}: una riga con «Calcolo» per Abilità`);
      assert.equal(r.classe('dettaglio').length, 0, 'nessuna colonna di dettaglio');
      assert.equal(r.classe('formula').length, 0, 'nessuna formula sotto il nome');
      for (const a of abilita) {
        const riga = righe.find((n) => n.children[0].children[0].textContent === a.nome);
        assert.ok(riga, `${f}: riga di ${a.nome}`);
        assert.equal(riga.children.length, 3, 'nome, VA, Calcolo');
        // il VA mostrato è quello calcolato, com'era
        assert.ok(riga.querySelectorAll('.pillola-va')[0].textContent.startsWith(numero(a.effettivo)), `${f} ${a.nome}: VA ${a.effettivo}`);
        // accanto, i bonus e i malus attivi
        assert.deepEqual(riga.querySelectorAll('.modificatore-attivo').map((n) => n.textContent), modificatoriAttivi(a).map((x) => x.testo));
        // e le spunte «a condizione», come prima
        assert.equal(riga.querySelectorAll('.condizionale-valore').length >= (a.disponibili ?? []).length, true);
      }
    }
  }
});

test('S8: il «Calcolo» fa lo stesso conto di prima (formula, colonne, valore da regole, VA) per ogni Abilità di ogni PG', () => {
  for (const f of ESEMPI) {
    for (const cambia of [null, conFerita]) {
      for (const a of righeAbilita(contesto(f, { cambia }))) {
        const prima = copia(a);
        const c = contoVa(a);
        assert.deepEqual(a, prima, 'il conto non tocca la riga');
        // la formula scritta nella riga prima dell'11/10/2026
        const vecchia = `${segno(a.mod)} Mod + ${a.base} Base + ${a.corporazione} Corp + ${a.avanzamento} Avanz${a.limite !== null ? `, limite ${a.limite}` : ''}${a.equip ? ` ${segno(a.equip)} Equip` : ''}`;
        assert.equal(c.formula, vecchia);
        assert.equal(formulaVa(a), vecchia);
        assert.deepEqual(c.colonne.map((x) => [x.sigla, x.valore]), [['Mod', a.mod], ['Base', a.base], ['Corp', a.corporazione], ['Avanz', a.avanzamento]]);
        assert.equal(c.equip, a.equip ?? 0);
        assert.equal(c.colonne.reduce((s, x) => s + x.valore, 0), a.grezzo, `${f} ${a.nome}: Mod + Base + Corp + Avanz = grezzo`);
        assert.equal(c.limitato, a.limite !== null && a.grezzo > a.limite);
        assert.equal(c.daRegole, a.totale);
        assert.equal(c.effettivo, a.effettivo);
        assert.equal(c.daRegole + c.condizioni.reduce((s, x) => s + x.valore, 0), a.effettivo, `${f} ${a.nome}: valore da regole più le condizioni dà il VA`);
        if (a.provenienza) assert.equal(a.provenienza.totale, a.effettivo);
      }
    }
  }
});

test('S8: «Calcolo» apre la finestrella con le colonne, la formula e il conto fino al VA', () => {
  const ctx = contesto(TORVALD, { attiva: 'abilita', cambia: conFerita });
  const a = righeAbilita(ctx).find((x) => x.nome === 'Atletica');
  const r = resa(ctx);
  const riga = r.tutti.find((n) => n.tagName === 'TR' && n.children[0]?.children[0]?.textContent === 'Atletica');
  clic(riga.querySelectorAll('.btn-calcolo')[0]);
  const finestra = document.body.querySelectorAll('.finestrella-calcolo').at(-1);
  assert.ok(finestra?.open, 'la finestrella è aperta');
  const testo = finestra.textContent;
  assert.match(testo, /^Calcolo: Atletica/);
  assert.ok(testo.includes(formulaVa(a)), 'la formula di prima');
  for (const x of ['Mod', 'Base', 'Corp', 'Avanz', 'Equip', 'Valore da regole: ', 'Conto del VA', 'Ferita Superficiale']) assert.ok(testo.includes(x), x);
  assert.ok(testo.includes(`VA: ${numero(a.effettivo)}`));
  for (const x of a.provenienza.righe) assert.ok(testo.includes(x.fonte), `riga della provenienza: ${x.fonte}`);
  finestra.remove();
});

test('S7: a destra un solo riquadro «Condizioni attive», con gli Stati attivi e i bonus di circostanza modificabili', () => {
  const ctx = contesto(TORVALD, { attiva: 'abilita', cambia: conFerita });
  const r = resa(ctx);
  const colonna = r.classe('colonna-condizioni')[0];
  assert.deepEqual(colonna.children.map((n) => n.className), ['riquadro condizioni-attive'], 'un solo riquadro');
  const testo = colonna.textContent;
  assert.match(testo, /^Condizioni attive/);
  assert.match(testo, /Stati: A Terra/);
  assert.match(testo, /Ferita Superficiale/);
  assert.match(testo, /Bonus di circostanza/);
  // niente luce, gradi di Ferite/Affaticamento/Corruzione, elenco degli Stati da spuntare, interruttori
  for (const c of ['riquadro-gradi', 'stati-compatti', 'caselle-vista', 'condizionali-oggetti', 'scelta-attacco']) assert.equal(colonna.querySelectorAll(`.${c}`).length, 0, c);
  // il giocatore mette i suoi bonus come prima
  const aggiungi = colonna.tutti().find((n) => n.tagName === 'BUTTON' && n.textContent === '+ Aggiungi');
  clic(aggiungi);
  assert.equal(ctx.chiamate.at(-1)[0], 'imposta');
  assert.equal(ctx.chiamate.at(-1)[1], 'circostanze');
  // senza condizioni: il riquadro resta, con i soli bonus di circostanza
  const vuoto = resa(contesto(TORVALD, { attiva: 'abilita', scelte: (c) => { c.equipaggiamento = []; return c; } })).classe('colonna-condizioni')[0];
  assert.match(vuoto.textContent, /Nessuna\./);
  assert.match(vuoto.textContent, /Bonus di circostanza/);
});
