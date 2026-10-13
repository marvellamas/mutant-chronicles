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
import { datiTestata, statiAttiviVista, contoVa, formulaVa, modificatoriAttivi, sintesiMani, sintesiProtezioni, sintesiSintonizzazione, inColonne, colonneInventario, colonnaInventario, preselezioneAggiungi } from '../src/scheda-vista.js';

import { contesto, resa, clic, TAB, ESEMPI, dati, cartella } from './scheda-aiuti.js';

export { contesto, resa, clic, TAB, ESEMPI } from './scheda-aiuti.js';
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

// ---------------------------------------------------------------------------
// S12–S16: Combattimento

const ordine = (r, ...classi) => classi.map((c) => r.tutti.indexOf(r.classe(c)[0]));
const titoliMani = (r) => r.classe('riquadro-mano').map((n) => n.getAttribute('aria-label'));
/** Solo quest'arma, impugnata. */
const conArma = (rif) => (c) => { c.equipaggiamento = [{ uid: 'prova-arma', rif, stato: 'impugnata', quantita: 1, note: '' }]; return c; };

test('S12: in Combattimento gli Stati sono in alto, i bonus di circostanza subito sotto, prima del resto', () => {
  for (const f of ESEMPI) {
    const r = resa(contesto(f, { attiva: 'combattimento' }));
    const [stati, circostanze, layout] = ordine(r, 'stati-in-alto', 'riquadro-circostanze', 'combattimento-layout');
    assert.ok(stati >= 0 && circostanze > stati && layout > circostanze, `${f}: Stati, poi circostanze, poi il resto`);
    const caselle = r.classe('stati-in-alto')[0].tutti().filter((n) => n.tagName === 'INPUT');
    assert.equal(caselle.length, dati.regole.stati.elenco.length, 'tutti gli Stati, da spuntare');
    // nella colonna destra non ci sono più Ferite, Affaticamento, Corruzione e Stati
    assert.equal(r.classe('colonna-equip')[0].querySelectorAll('.riquadro-gradi').length, 0);
  }
});

test('S14: a destra, nell’ordine, Protezioni e Armi, con la sintesi e sotto ciò che si possiede', () => {
  const ctx = contesto(TORVALD, { attiva: 'combattimento' });
  const r = resa(ctx);
  const colonna = r.classe('colonna-equip')[0];
  assert.deepEqual(colonna.children.map((n) => n.getAttribute('aria-label')), ['Protezioni', 'Armi']);
  const [protezioni, armi] = colonna.children;
  const d = ctx.tab.tab.find((t) => t.id === 'combattimento').dati;
  for (const p of d.protezioniCalcolate) assert.ok(protezioni.querySelectorAll('.sintesi-equip')[0].textContent.includes(p.nome), `sintesi: ${p.nome}`);
  assert.ok(protezioni.querySelectorAll('.elenco-disponibili').length === 1, 'elenco delle possedute');
  assert.ok(protezioni.querySelectorAll('.voce-info').length >= d.protezioniCalcolate.length, 'un «?» con i dettagli per protezione');
  const sintesi = armi.querySelectorAll('.sintesi-equip')[0].textContent;
  for (const a of d.armiCalcolate.filter((x) => !x.moduloDi && !x.daScudo)) assert.ok(sintesi.includes(a.nome), `sintesi: ${a.nome}`);
  assert.match(sintesi, /Mano destra /);
  assert.match(sintesi, /Mano sinistra /);
  // la tabella lunga delle Protezioni non c'è più: i dettagli stanno nel «?»
  assert.equal(r.tutti.filter((n) => n.tagName === 'TH' && n.textContent === 'Categoria o taglia').length, 0);
});

test('S14: senza protezioni indossate la sintesi dice «Nessuna»', () => {
  const r = resa(contesto(TORVALD, { attiva: 'combattimento', scelte: (c) => { c.equipaggiamento = c.equipaggiamento.map((v) => ({ ...v, stato: 'zaino' })); return c; } }));
  const protezioni = r.classe('riquadro-protezioni')[0];
  assert.equal(protezioni.querySelectorAll('.sintesi-vuota')[0].textContent, 'Nessuna');
  assert.equal(protezioni.querySelectorAll('.sintesi-equip').length, 0);
  assert.ok(protezioni.querySelectorAll('.elenco-disponibili')[0].textContent.includes('Indossa'), 'le possedute si possono indossare');
  assert.deepEqual(sintesiProtezioni([], dati.regole.protezioni_rapide.voci), { nessuna: true, righe: [] });
  const s = sintesiProtezioni([{ tipo: 'armatura', nome: 'Corazza' }, { tipo: 'rinforzo', nome: 'Mantello' }, { tipo: 'elmetto', nome: 'Elmo' }], dati.regole.protezioni_rapide.voci);
  assert.equal(s.nessuna, false);
  assert.deepEqual(s.righe.map((x) => [x.tipo, x.oggetti.map((o) => o.nome), x.rinforzi.map((o) => o.nome)]), [['armatura', ['Corazza'], ['Mantello']], ['elmetto', ['Elmo'], []]]);
});

test('S16: Mano destra e Mano sinistra con l’arma impugnata; libere se non c’è niente', () => {
  const una = resa(contesto(TORVALD, { attiva: 'combattimento', scelte: conArma('armi:spada-lunga') }));
  assert.deepEqual(titoliMani(una), ['Mano destra', 'Mano sinistra']);
  assert.match(una.classe('riquadro-mano')[0].textContent, /Spada lunga/);
  assert.match(una.classe('riquadro-mano')[1].textContent, /Libera\./);
  assert.ok(una.classe('riquadro-mano')[0].querySelectorAll('.btn-attacca').length === 1, '«Attacca!» nel riquadro della mano');
  const vuote = resa(contesto(TORVALD, { attiva: 'combattimento', scelte: (c) => { c.equipaggiamento = []; return c; } }));
  assert.deepEqual(titoliMani(vuote), ['Mano destra', 'Mano sinistra']);
  assert.ok(vuote.classe('riquadro-mano').every((n) => /Libera\./.test(n.textContent)));
  assert.match(vuote.classe('riquadro-armi')[0].textContent, /Mano destra libera/);
});

test('S16: con un’arma a due mani resta un riquadro solo', () => {
  const r = resa(contesto(TORVALD, { attiva: 'combattimento', scelte: conArma('armi:spadone') }));
  assert.deepEqual(titoliMani(r), ['Due mani']);
  assert.match(r.classe('riquadro-mano')[0].textContent, /Spadone/);
  const sintesi = r.classe('riquadro-armi')[0].querySelectorAll('.sintesi-equip')[0];
  assert.equal(sintesi.children.length, 1);
  assert.match(sintesi.textContent, /Due mani .*Spadone/);
  // la funzione pura
  assert.deepEqual(sintesiMani({ due: { nome: 'Spadone' }, destra: null, sinistra: null }, []), [{ mano: 'due', titolo: 'Due mani', nome: 'Spadone' }]);
  assert.deepEqual(sintesiMani({ due: null, destra: { nome: 'Spada' }, sinistra: null }, [{ nome: 'Pugnale' }]).map((x) => [x.mano, x.nome]), [['destra', 'Spada'], ['sinistra', null], ['oltre', 'Pugnale']]);
});

test('S13: Affaticamento e Corruzione stanno nella colonna di sinistra del Combattimento, sotto i PM, e si cambiano da lì', () => {
  const ctx = contesto(TORVALD, { attiva: 'combattimento' });
  const colonna = resa(ctx).classe('colonna-risorse')[0];
  const titoli = colonna.tutti().filter((n) => n.tagName === 'H3').map((n) => n.textContent);
  const posizione = (re) => titoli.findIndex((t) => re.test(t));
  assert.ok(posizione(/^Punti Vita/) < posizione(/^Ferite/) && posizione(/^Ferite/) < posizione(/^Affaticamento/), titoli.join(' | '));
  if (ctx.massimi.pm) assert.ok(posizione(/^Punti Magia/) < posizione(/^Affaticamento/));
  assert.ok(posizione(/^Corruzione/) > posizione(/^Affaticamento/));
  const grado = colonna.tutti().filter((n) => n.getAttribute('aria-label') === 'Affaticamento (§5.19)' && n.getAttribute('role') === 'radiogroup')[0].children[1];
  clic(grado);
  assert.deepEqual(ctx.chiamate.at(-1), ['imposta', 'affaticamento', 1]);
});

// ---------------------------------------------------------------------------
// S24, S25: Artefatti

/** Due Artefatti da sintonizzare: uno addosso e sintonizzato, uno nello zaino. */
const conArtefatti = (c) => {
  c.equipaggiamento = [
    { uid: 'art-1', rif: 'artefatti:batteria-da-10-pm-chroma-rosso', stato: 'trasportato', quantita: 1, note: '', sintonizzato: true },
    { uid: 'art-2', rif: 'artefatti:batteria-da-5-pm-chroma-blu', stato: 'zaino', quantita: 1, note: '' },
  ];
  return c;
};

test('S24: la Sintonizzazione sta in una riga («usata / capacità») e il «?» elenca gli Artefatti che impegnano i punti', () => {
  const ctx = contesto(TORVALD, { attiva: 'artefatti', scelte: conArtefatti });
  const st = ctx.tab.scheda.equipaggiamento.sintonizzazione;
  assert.ok(st, 'il PG di prova ha Artefatti da sintonizzare');
  const r = resa(ctx);
  const riga = r.classe('riga-sintonizzazione');
  assert.equal(riga.length, 1);
  assert.equal(riga[0].tagName, 'P', 'una riga, non un riquadro');
  assert.ok(riga[0].textContent.startsWith(`Sintonizzazione${st.usata} / ${st.capacita}`), riga[0].textContent);
  assert.equal(riga[0].querySelectorAll('.voce-info').length, 1, 'il «?»');
  assert.equal(r.classe('elenco-sintonie').length, 0, 'l’elenco non sta più nel riquadro');
  const sn = sintesiSintonizzazione(st);
  assert.equal(sn.testo, `${st.usata} / ${st.capacita}`);
  assert.equal(sn.impegnano.reduce((s, x) => s + x.costo, 0), st.usata, 'i punti impegnati sono la somma degli Artefatti sintonizzati');
  assert.deepEqual(sn.impegnano.map((x) => x.nome), st.artefatti.filter((x) => x.sintonizzato && x.costo > 0).map((x) => x.nome));
  assert.deepEqual(sintesiSintonizzazione({ usata: 10, capacita: 9, artefatti: [{ nome: 'A', costo: 6, sintonizzato: true }, { nome: 'B', costo: 4, sintonizzato: true, deposito: true }, { nome: 'C', costo: 2, sintonizzato: false }] }),
    { testo: '10 / 9', oltre: true, impegnano: [{ nome: 'A', costo: 6, deposito: false, testo: 'A: 6' }, { nome: 'B', costo: 4, deposito: true, testo: 'B: 4 (nel deposito comune)' }], liberi: [{ nome: 'C', costo: 2 }] });
  assert.equal(sintesiSintonizzazione(null), null);
});

test('S25: gli Artefatti sono in due colonne, «Addosso» e «Zaino e Deposito», come gli oggetti dell’Inventario', () => {
  const ctx = contesto(TORVALD, { attiva: 'artefatti', scelte: conArtefatti });
  const r = resa(ctx);
  const colonne = r.classe('artefatti-colonne')[0].children;
  assert.deepEqual(colonne.map((n) => n.getAttribute('aria-label')), ['Addosso', 'Zaino e Deposito']);
  const st = ctx.tab.scheda.equipaggiamento.sintonizzazione;
  const nomi = (n) => n.querySelectorAll('.artefatto-scheda').map((x) => x.querySelectorAll('.arma-testa')[0].textContent);
  assert.equal(nomi(colonne[0]).length + nomi(colonne[1]).length, st.artefatti.length, 'tutti gli Artefatti, una volta sola');
  assert.equal(nomi(colonne[0]).length, 1);
  assert.equal(nomi(colonne[1]).length, 1);
  assert.deepEqual(inColonne([{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }], (x) => ({ a: { voce: { stato: 'trasportato' } }, b: { voce: { stato: 'zaino' } }, c: { voce: { stato: 'deposito' }, deposito: true } })[x.uid]).map((c) => [c.id, c.voci.map((x) => x.uid)]),
    [['addosso', ['a']], ['zaino', ['b', 'c']]]);
});

// ---------------------------------------------------------------------------
// S27–S32: Inventario

const { catalogo, risolvi, opzioniCascata } = await import('../src/equipaggiamento.js');
const { SEZIONI_INVENTARIO } = await import('../src/palette.js');
const risolte = (ctx) => { const cat = catalogo(dati); return ctx.scelte.equipaggiamento.map((v) => risolvi(v, cat)); };

test('S29: gli oggetti sono in due colonne, «Addosso» e «Zaino e Deposito», con i gruppi giusti', () => {
  for (const f of ESEMPI) {
    // qualcosa nello zaino e qualcosa nel deposito comune, il resto com'è
    const ctx = contesto(f, { attiva: 'inventario', scelte: (c) => { c.equipaggiamento = c.equipaggiamento.map((v, i) => (i % 5 === 1 ? { ...v, stato: 'deposito' } : v)); return c; } });
    const lista = risolte(ctx);
    const { colonne } = colonneInventario(lista);
    assert.deepEqual(colonne.map((c) => [c.id, c.titolo]), [['addosso', 'Addosso'], ['zaino', 'Zaino e Deposito']]);
    // ogni oggetto in una colonna sola, quella del suo stato
    assert.equal(colonne[0].quanti + colonne[1].quanti, lista.length, f);
    for (const r of lista) {
      const attesa = r.deposito || r.voce.stato === 'zaino' ? 'zaino' : 'addosso';
      assert.equal(colonnaInventario(r), attesa, `${f}: ${r.nome} (${r.voce.stato ?? 'con sé'})`);
      const c = colonne.find((x) => x.id === attesa);
      assert.equal(c.sezioni.filter((s) => s.voci.includes(r)).length, 1, `${f}: ${r.nome} in una categoria sola`);
    }
    // le categorie sono quelle dell'Inventario, nel loro ordine, e solo quelle con oggetti
    const ordine = SEZIONI_INVENTARIO.map((s) => s.id);
    for (const c of colonne) {
      assert.ok(c.sezioni.every((s) => s.voci.length > 0));
      assert.deepEqual(c.sezioni.map((s) => s.id), ordine.filter((id) => c.sezioni.some((s) => s.id === id)));
    }
    assert.ok(colonne[1].quanti > 0, `${f}: qualcosa nel deposito`);
    // la pagina: due colonne riducibili, con dentro i gruppi riducibili
    const r = resa(ctx);
    const viste = r.classe('colonna-inventario');
    assert.deepEqual(viste.map((n) => n.tagName), ['DETAILS', 'DETAILS'], 'ogni colonna si riduce con la freccia');
    assert.match(viste[0].children[0].textContent, /^Addosso/);
    assert.match(viste[1].children[0].textContent, /^Zaino e Deposito/);
    for (const [i, c] of colonne.entries()) {
      const gruppi = viste[i].querySelectorAll('.gruppo-equip');
      assert.equal(gruppi.length, c.sezioni.length, `${f}: gruppi della colonna ${c.titolo}`);
      assert.ok(gruppi.every((g) => g.children[0].tagName === 'DETAILS'), 'ogni gruppo si riduce con la freccia');
      assert.equal(viste[i].querySelectorAll('.voce-equip').length, c.quanti, 'una riga per oggetto');
    }
  }
});

test('S29: «Con sé» (oggetti senza stati) è portato e sta in «Addosso»; zaino e deposito nell’altra colonna', () => {
  assert.equal(colonnaInventario({ voce: { stato: null } }), 'addosso');
  for (const stato of ['impugnata', 'imbracciato', 'indossata', 'in_uso', 'installato', 'pronta', 'trasportato']) assert.equal(colonnaInventario({ voce: { stato } }), 'addosso', stato);
  assert.equal(colonnaInventario({ voce: { stato: 'zaino' } }), 'zaino');
  assert.equal(colonnaInventario({ voce: { stato: 'deposito' }, deposito: true }), 'zaino');
});

test('S32: «Aggiungi» accanto a ogni categoria apre «Aggiungi oggetto» con il Tipo già scelto', () => {
  const ctx = contesto(TORVALD, { attiva: 'inventario' });
  const r = resa(ctx);
  const gruppi = r.classe('gruppo-equip');
  assert.ok(gruppi.length > 0);
  for (const g of gruppi) assert.equal(g.children[0].children[0].querySelectorAll('.btn-aggiungi-categoria').length, 1, 'un «Aggiungi» nell’intestazione di ogni categoria');
  // le categorie vuote hanno il loro «Aggiungi» sotto le colonne: nessuna categoria resta senza
  const { colonne, vuote } = colonneInventario(risolte(ctx));
  const conOggetti = new Set(colonne.flatMap((c) => c.sezioni.map((s) => s.id)));
  assert.equal(conOggetti.size + vuote.length, SEZIONI_INVENTARIO.length);
  assert.equal((r.classe('categorie-vuote')[0]?.querySelectorAll('.btn-aggiungi-categoria') ?? []).length, vuote.length);
  // Armi: il Tipo è preselezionato e la pagina si ridisegna
  const armi = gruppi.find((g) => g.querySelectorAll('.etichetta-cat')[0].textContent === 'Armi');
  clic(armi.querySelectorAll('.btn-aggiungi-categoria')[0]);
  assert.equal(ctx.ui.equip.tipo, 'arma_ravvicinata');
  assert.equal(ctx.ui.equip.catalogo, null);
  assert.equal(ctx.ui.equip.rif, null);
  assert.deepEqual(ctx.chiamate.at(-1), ['ridisegna']);
  const dopo = resa(ctx);
  const tipo = dopo.classe('cascata')[0].children[0].tutti().filter((n) => n.tagName === 'OPTION' && n.selected);
  assert.deepEqual(tipo.map((n) => n.value), ['arma_ravvicinata'], 'il Tipo risulta scelto nel pannello');
});

test('S32: la preselezione di ogni categoria dà un Tipo del catalogo; le categorie di un capitolo mostrano solo i loro oggetti', () => {
  const tipi = opzioniCascata(dati).tipi;
  for (const s of SEZIONI_INVENTARIO) {
    const p = preselezioneAggiungi(s.id);
    assert.equal(p.tipo, s.tipi[0], s.id);
    assert.ok(tipi.includes(p.tipo), `${s.id}: il Tipo ${p.tipo} è nel catalogo`);
    const op = opzioniCascata(dati, { tipo: p.tipo, cataloghiRif: p.cataloghi });
    assert.ok(op.cataloghi.length > 0, `${s.id}: c'è almeno un catalogo da cui scegliere`);
  }
  assert.equal(preselezioneAggiungi('inesistente'), null);
  // Esplorazione: solo gli oggetti del suo capitolo, non tutti gli «altro»
  const p = preselezioneAggiungi('esplorazione');
  assert.deepEqual([p.tipo, p.cataloghi], ['altro', ['esplorazione']]);
  const cat = catalogo(dati).oggetti.filter((o) => !o.modulo_di);
  const famiglie = (opz) => { const a = opzioniCascata(dati, opz); return a.cataloghi.flatMap((c) => opzioniCascata(dati, { ...opz, catalogo: c }).famiglie); };
  const sue = new Set(cat.filter((o) => o.tipo === 'altro' && String(o.rif).startsWith('esplorazione:')).map((o) => o.famiglia));
  assert.deepEqual(new Set(famiglie({ tipo: 'altro', cataloghiRif: ['esplorazione'] })), sue);
  assert.ok(new Set(famiglie({ tipo: 'altro' })).size > sue.size, 'senza filtro il Tipo «altro» ha più famiglie');
  // senza filtro la cascata è quella di sempre
  assert.deepEqual(opzioniCascata(dati, { tipo: 'altro', cataloghiRif: null }), opzioniCascata(dati, { tipo: 'altro' }));
});

test('S27, S28, S30: nell’Inventario niente Crediti; il Carico solo qui, sopra i PV; l’Integrità in basso', () => {
  const ctx = contesto(TORVALD, { attiva: 'inventario' });
  const r = resa(ctx);
  assert.equal(r.classe('riquadro-crediti').length, 0);
  const colonna = r.classe('colonna-risorse')[0];
  assert.match(colonna.children[0].className, /riquadro-carico/, 'il Carico è il primo riquadro della colonna');
  assert.match(colonna.children[1].className, /riquadro-pv/, 'subito sopra i PV');
  const c = ctx.tab.scheda.carico;
  assert.ok(colonna.children[0].textContent.includes(c.peso.toLocaleString('it-IT', { maximumFractionDigits: 1 })), 'il peso calcolato');
  assert.ok(colonna.children[0].textContent.includes(c.livello.nome), 'il livello di carico');
  for (const attiva of TAB.filter((t) => t !== 'inventario')) assert.equal(resa(contesto(TORVALD, { attiva })).classe('riquadro-carico').length, 0, `${attiva}: niente Carico`);
  // Integrità dopo gli oggetti e dopo «Aggiungi oggetto»
  const [oggetti, aggiungi, integrita] = ['inventario-colonne', 'aggiungi-equip', 'sezione-integrita'].map((k) => r.tutti.indexOf(r.classe(k)[0]));
  assert.ok(oggetti >= 0 && aggiungi > oggetti && integrita > aggiungi, `ordine: oggetti ${oggetti}, aggiungi ${aggiungi}, integrità ${integrita}`);
});

// ---------------------------------------------------------------------------
// Nessun valore calcolato cambiato; la stampa non cambia

test('rendere le tab non tocca i valori calcolati: scheda e dati delle tab restano identici, per ogni PG e ogni tab', () => {
  for (const f of ESEMPI) {
    for (const cambia of [null, conFerita]) {
      const ctx = contesto(f, { cambia });
      const prima = JSON.stringify({ scheda: ctx.tab.scheda, tab: ctx.tab.tab, sessione: ctx.sessione, massimi: ctx.massimi, scelte: ctx.scelte });
      for (const attiva of TAB) resa({ ...ctx, attiva });
      assert.equal(JSON.stringify({ scheda: ctx.tab.scheda, tab: ctx.tab.tab, sessione: ctx.sessione, massimi: ctx.massimi, scelte: ctx.scelte }), prima, f);
      // e un secondo calcolo dà gli stessi valori: le funzioni di disposizione non lasciano tracce
      const p = deserializzaPersonaggio(readFileSync(new URL(f, cartella), 'utf8'));
      const di_nuovo = preparaTab({ creazione: ctx.scelte, livelli: p.livelli }, dati, { sessione: ctx.sessione });
      assert.equal(JSON.stringify(di_nuovo.scheda), JSON.stringify(ctx.tab.scheda), f);
    }
  }
});

test('la scheda stampata non dipende dai riquadri tolti: stessi fogli e stessi dati, con o senza la scheda a tab resa', async () => {
  const { preparaStampa } = await import('../src/stampa.js');
  for (const f of ESEMPI) {
    const p = deserializzaPersonaggio(readFileSync(new URL(f, cartella), 'utf8'));
    const personaggio = { creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli };
    const prima = JSON.stringify(preparaStampa(copia(personaggio), dati).fogli);
    for (const attiva of TAB) resa(contesto(f, { attiva }));
    const dopo = preparaStampa(copia(personaggio), dati);
    assert.equal(JSON.stringify(dopo.fogli), prima, f);
    // i fogli che leggevano dagli stessi dati dei riquadri tolti ci sono ancora, con i loro valori
    const combattimento = dopo.fogli.find((x) => x.id === 'combattimento').dati;
    assert.ok(combattimento.stati.length > 0 && combattimento.affaticamento.length > 0, `${f}: Stati e Affaticamento nel foglio 3`);
    assert.ok(dopo.fogli.find((x) => x.id === 'inventario'), `${f}: foglio Inventario`);
    assert.ok(dopo.fogli.find((x) => x.id === 'identita').dati.movimento, `${f}: Movimento nel foglio 1`);
  }
});

test('S32: arrivati da «Aggiungi» di una categoria, «Aggiungi oggetto» sale sopra gli oggetti finché non lo si chiude', () => {
  const ctx = contesto(TORVALD, { attiva: 'inventario' });
  const posizioni = (r) => ['aggiungi-equip', 'inventario-colonne'].map((k) => r.tutti.indexOf(r.classe(k)[0]));
  let [pannello, oggetti] = posizioni(resa(ctx));
  assert.ok(pannello > oggetti, 'di solito sta sotto gli oggetti');
  clic(resa(ctx).classe('btn-aggiungi-categoria')[0]);
  const sopra = resa(ctx);
  [pannello, oggetti] = posizioni(sopra);
  assert.ok(pannello < oggetti, 'dopo «Aggiungi» sta sopra');
  clic(sopra.classe('btn-chiudi-aggiungi')[0]);
  assert.equal(ctx.ui.equip.daCategoria, false);
  [pannello, oggetti] = posizioni(resa(ctx));
  assert.ok(pannello > oggetti, '«Chiudi» lo rimette sotto');
});
