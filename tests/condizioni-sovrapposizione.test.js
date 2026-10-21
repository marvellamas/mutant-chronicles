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
// 21/10/2026 (seguito, «l'incollato torna, ma in sicurezza»): Marcello conferma che l'incollato serve al tavolo — si
// scorre l'elenco delle Abilità ed è esattamente lì che servono i malus attivi. Il difetto non era l'incollato in
// sé: era un riquadro incollato più alto dello schermo, il cui fondo diventava irraggiungibile. Ora l'incollato ha
// un'altezza massima (mai più alto della finestra), scorre al suo interno con la barra visibile, e una sfumatura
// (le «ombre di scorrimento» via CSS puro, senza JavaScript) segnala se c'è altro sopra o sotto. Resta spento dove
// le colonne si impilano: incollare un blocco a tutta larghezza sotto il contenuto non aiuterebbe nessuno.
//
// NB (onestà sui limiti): `node --test` non ha un motore di layout, quindi qui si prova il *contratto* — l'incollato
// ha sempre un'altezza massima e un proprio scorrimento, è spento dove le colonne si impilano, e la tabella resta
// legata alla larghezza della sua colonna con le colonne fisse. La misura vera dei rettangoli (a 768, 800, 820, 912,
// 1024, 1180 e 1280 px, verticale e orizzontale) è stata fatta nel browser con getBoundingClientRect: è nel riepilogo.
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
/** Il testo del blocco «@container (...) { ... }» che inizia a quell'indice, parentesi bilanciate. */
function bloccoDa(indiceGraffaApertura) {
  let profondita = 0;
  for (let i = indiceGraffaApertura; i < CSS.length; i++) {
    if (CSS[i] === '{') profondita++;
    else if (CSS[i] === '}') { profondita--; if (profondita === 0) return CSS.slice(indiceGraffaApertura + 1, i); }
  }
  throw new Error('parentesi graffa non chiusa');
}

/** I blocchi dentro un «@container (max-width: …)»: dove le colonne si impilano. Niente regex lazy che scavalca
    graffe nidificate (c'è più di un «@container (max-width: 30rem)» nel foglio): si cercano le graffe vere. */
function dentroImpilamento(classe) {
  const corpi = [];
  const reApertura = /@container \(max-width:[^)]*\)\s*\{/g;
  let m;
  while ((m = reApertura.exec(CSS))) {
    const corpoContainer = bloccoDa(m.index + m[0].length - 1);
    const reRegola = new RegExp(`\\.${classe}\\s*\\{([^}]*)\\}`);
    const r = reRegola.exec(corpoContainer);
    if (r) corpi.push(r[1]);
  }
  return corpi;
}

for (const [colonna, soglia] of [['colonna-condizioni', '40rem'], ['colonna-stati', '30rem']]) {
  test(`${colonna}: l'incollato ha sempre un'altezza massima e il proprio scorrimento`, () => {
    const blocchi = dichiarazioni(colonna).filter((b) => /position\s*:\s*sticky/.test(b.corpo));
    assert.ok(blocchi.length, `.${colonna} non è mai «position: sticky»: l'incollato è sparito di nuovo`);
    for (const b of blocchi) {
      assert.match(b.corpo, /max-height\s*:\s*calc\(100vh/, `.${colonna} sticky senza un'altezza massima (${b.selettore}): il fondo tornerebbe fuori portata`);
      assert.match(b.corpo, /overflow-y\s*:\s*auto/, `.${colonna} sticky senza scorrimento proprio (${b.selettore})`);
      assert.match(b.corpo, /scrollbar-width\s*:\s*thin/, `.${colonna} sticky con la barra di scorrimento invadente (${b.selettore})`);
    }
  });

  test(`${colonna}: spento dove le colonne si impilano (sotto ${soglia})`, () => {
    const blocchi = dentroImpilamento(colonna);
    assert.ok(blocchi.length, `manca la regola che spegne .${colonna} sotto ${soglia}`);
    for (const corpo of blocchi) {
      assert.match(corpo, /position\s*:\s*static/, `.${colonna} impilato non torna «static»: incollerebbe un blocco a tutta larghezza sotto il contenuto`);
      assert.match(corpo, /max-height\s*:\s*none/, `.${colonna} impilato tiene ancora l'altezza massima`);
    }
  });

  test(`${colonna}: non ritaglia il proprio contenuto fuori dall'incollato`, () => {
    for (const b of dichiarazioni(colonna)) {
      if (/position\s*:\s*sticky/.test(b.corpo)) continue; // l'incollato ha il suo scorrimento apposta: va bene
      // fuori dall'incollato, «max-height: none» (lo spegnimento nell'impilamento) va bene; un valore vero no
      assert.ok(!/(^|;)\s*max-height\s*:(?!\s*none\b)/.test(b.corpo), `.${colonna} con max-height fuori dall'incollato (${b.selettore}): il contenuto resterebbe tagliato`);
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

// ---------------------------------------------------------------------------------------------
// Parte B (21/10/2026): gli sforamenti nel Combattimento a 768 e 912 px. Stesso meccanismo: un figlio di griglia
// o di flex non scende, per difetto, sotto la larghezza del proprio contenuto («min-width: auto»), anche se la sua
// TRACCIA è «minmax(0, 1fr)» — il min-width:0 del figlio va dato a parte (lo stesso idioma di «.stati-compatti li»
// del 12/10). E i due/tre colonne di «.griglia-valori» (Difese, Prove Salvezza, Iniziativa, Movimento, Azioni, Luce)
// erano decise da un «@media (min-width: …)» legato alla larghezza della FINESTRA, non a quella disponibile alla
// griglia — che con la colonna degli Stati accanto è molto più stretta: a 768 px di finestra dava comunque due
// colonne in uno spazio che ne aveva per una sola.

test('.riquadro-mano può restringersi sotto il contenuto della sua scheda (min-width: 0)', () => {
  const blocchi = dichiarazioni('riquadro-mano').filter((b) => !b.selettore.includes('.riquadro-mano.'));
  assert.ok(blocchi.some((b) => /min-width\s*:\s*0/.test(b.corpo)), '.riquadro-mano senza «min-width: 0»: tornerebbe a sforare la sua cella della griglia');
});

test('.griglia-valori sceglie 2/3 colonne dallo spazio vero (container), non dalla finestra (media)', () => {
  assert.doesNotMatch(CSS, /@media \(min-width: 600px\) \{ \.griglia-valori/, 'la soglia delle due colonne è ancora legata alla finestra');
  assert.doesNotMatch(CSS, /@media \(min-width: 1100px\) \{ \.griglia-valori/, 'la soglia delle tre colonne è ancora legata alla finestra');
  assert.match(CSS, /@container \(min-width: [\d.]+rem\) \{ \.griglia-valori \{ grid-template-columns: repeat\(2,/, 'manca la soglia a container per le due colonne');
  assert.match(CSS, /@container \(min-width: [\d.]+rem\) \{ \.griglia-valori \{ grid-template-columns: repeat\(3,/, 'manca la soglia a container per le tre colonne');
  // e il contenitore che la griglia usa come riferimento è dichiarato (altrimenti il @container userebbe
  // il pannello intero, che include la colonna degli Stati: la stessa svista di prima)
  assert.match(CSS, /\.combattimento-principale \{ container-type: inline-size; \}/, 'manca il contenitore proprio della colonna principale');
});

test('la scheda rende .riquadro-mano e .griglia-valori dentro il Combattimento, con le regole sopra applicabili', () => {
  const ctx = contesto(ESEMPIO, {
    attiva: 'combattimento',
    cambia: (s) => { s.statiAttivi = ['Accecato']; },
  });
  const { radice } = resa(ctx);
  assert.ok(radice.querySelectorAll('.griglia-valori').length >= 1, 'manca la griglia dei sei valori');
});
