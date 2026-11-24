import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 242 (ritocco 5) → ROVESCIATO nel 243. Il 242 aveva scritto qui un test che FALLIVA se la nota della correzione del master
// diventava nascondibile («se sparisce dietro un tocco nessuno la apre, e un numero corretto a mano torna a sembrare un numero
// sbagliato dell'app»). Marcello ha deciso il contrario, e ha ragione lui: permanente sulla scheda dà fastidio. Adesso **decide il
// Direttore, e solo lui**: può dire «non visualizzare la nota» su una correzione, quando la fa, e per quelle già fatte «non visualizzare
// “modificato dal master”». Quello che il vecchio test proteggeva si tiene in altro modo e questo file lo prova:
//  - la nota di default c'è, leggibile da sola, e la fonte una volta sola (come nel 242);
//  - NASCONDERE LA NOTA NON ANNULLA LA CORREZIONE: il valore resta corretto;
//  - NASCONDERE LA NOTA NON CANCELLA LA TRACCIA: la riga resta nel registro «Modifiche del master», con data e motivo;
//  - solo il Direttore: nessun comando per un giocatore, e il server non lascia a un tablet cambiare il registro;
//  - nessuno dei due comandi blocca niente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, clic } from './scheda-aiuti.js';
import { nascondiNote, statoNote, nuovaCorrezione, aggiungiCorrezione, applicaCorrezioni, rigaRegistro, proteggiBlocchiMaster } from '../src/correzioni-master.js';
import { notaCorrezione, sezioneRegistro } from '../src/ui/master.js';
import { installaDomFinto } from './dom-finto.js';

installaDomFinto();
const DIMITRI = '../tests/fixtures/dimitri-225/Dimitri-Orlav_liv7_2026-11-11.json'; // copia dell'istantanea del 17/11 (sola lettura)

/** Dimitri con le correzioni di calcolo trasformate da `fn` (le righe del registro sono quelle del file). */
function dimitri(fn = null, attiva = 'identita') {
  return contesto(DIMITRI, { attiva, scelte: fn ? (c) => ({ ...c, correzioniMaster: fn(c.correzioniMaster ?? []) }) : null });
}
const note = (r) => r.classe('nota-correzione-master');
/** I valori della scheda senza le note: devono essere gli stessi con la nota visibile e nascosta. */
const valori = (ctx) => JSON.stringify([ctx.massimi.pv, ctx.massimi.pm, ctx.tab.scheda.caratteristiche, ctx.tab.scheda.abilita.map((a) => a.totale)],
  (k, v) => (k === 'correzioniMaster' ? undefined : v));

/** Gli antenati di un nodo nel DOM finto (cercati dall'alto: il DOM finto non ha i genitori). */
function antenati(radice, bersaglio) {
  const via = [];
  const cerca = (n) => { if (n === bersaglio) return true; for (const c of n.children ?? []) { via.push(c); if (cerca(c)) return true; via.pop(); } return false; };
  cerca(radice);
  return via.slice(0, -1);
}

test('DI DEFAULT LA NOTA C’È, CON IL SUO TESTO, LEGGIBILE DA SOLA (Dimitri: FOR, DES, CAR, SAG, INT corrette)', () => {
  const r = resa(dimitri().tab ? dimitri() : null);
  const n = note(r);
  assert.ok(n.length >= 3, `${n.length} note`);
  for (const x of n) {
    assert.match(x.textContent, /Correzione del master: [+−-]\d/, `si legge da sola: «${x.textContent}»`);
    assert.ok(!antenati(r.radice, x).some((a) => a.tagName === 'DETAILS'), 'non dentro qualcosa che si apre');
    assert.notEqual(x.tagName, 'BUTTON', 'non è un pulsante da toccare per leggerla');
  }
  const testi = n.map((x) => x.textContent);
  assert.ok(testi.every((t) => (t.match(/Correzione del master/g) ?? []).length === 1), 'la fonte non si ripete');
});

test('LO STILE LA TIENE PICCOLA E LEGGIBILE: molto più piccola del numero, mai nascosta dallo stile', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  const regole = [...css.matchAll(/([^{}]*\.nota-correzione-master[^{}]*)\{([^}]*)\}/g)].map((m) => ({ sel: m[1].trim(), corpo: m[2] }));
  assert.ok(regole.length >= 1, 'la regola c’è');
  for (const { sel, corpo } of regole) assert.doesNotMatch(corpo, /display:\s*none|visibility:\s*hidden|opacity:\s*0(?![.\d])|max-height:\s*0|overflow:\s*hidden/, `${sel}: lo stile non nasconde la nota (lo decide il Direttore)`);
  const base = regole.find((x) => /(^|\n|\*\/)\s*\.nota-correzione-master\s*$/.test(x.sel));
  const m = /font-size:\s*([\d.]+)rem/.exec(base?.corpo ?? '');
  assert.ok(m && Number(m[1]) <= 0.75 && Number(m[1]) >= 0.6, `carattere molto più piccolo ma leggibile: ${m?.[1]} rem`);
});

test('IL DIRETTORE NASCONDE LA NOTA DI UNA CORREZIONE QUANDO LA FA: la nota non c’è, il valore è corretto lo stesso, la riga è nel registro', () => {
  const lista = aggiungiCorrezione([], nuovaCorrezione({ chiave: 'car:FOR', etichetta: 'Forza', tipo: 'aggiungi', numero: 2, motivo: 'dono del patrono', notaNascosta: true }));
  const a = applicaCorrezioni(6, lista, 'car:FOR');
  assert.equal(a.valore, 8, 'il valore corretto resta corretto');
  assert.equal(a.righe[0].nascosta, true);
  assert.equal(notaCorrezione({ calcolato: 6, righe: a.righe }), null, 'nessuna nota sulla scheda');
  // la stessa correzione senza la scelta: la nota c'è
  const visibile = applicaCorrezioni(6, aggiungiCorrezione([], nuovaCorrezione({ chiave: 'car:FOR', etichetta: 'Forza', tipo: 'aggiungi', numero: 2, motivo: 'dono del patrono' })), 'car:FOR');
  assert.ok(notaCorrezione({ calcolato: 6, righe: visibile.righe }), 'senza la scelta la nota c’è');
  // la traccia: data e motivo nel registro
  const riga = rigaRegistro(lista[0]);
  assert.ok(riga.quando && riga.motivo === 'dono del patrono' && !riga.annullata, 'con data e motivo, attiva');
  assert.match(riga.cosa, /Forza: \+2/);
});

test('IL COMANDO PER LE CORREZIONI GIÀ FATTE: le note spariscono dalla scheda, i valori restano, e il registro le contiene ancora tutte', () => {
  const prima = dimitri();
  const dopo = dimitri((l) => nascondiNote(l, true));
  assert.ok(note(resa(prima)).length >= 3, 'prima le note ci sono');
  assert.equal(note(resa(dopo)).length, 0, 'dopo non ce n’è nessuna');
  assert.equal(valori(dopo), valori(prima), 'i valori corretti non cambiano');
  // il registro: stesse righe, stessi dati, nessuna annullata, nessuna tolta
  const l0 = prima.scelte.correzioniMaster;
  const l1 = dopo.scelte.correzioniMaster;
  assert.equal(l1.length, l0.length, 'nessuna riga tolta dal registro');
  for (const [i, x] of l1.entries()) {
    assert.equal(x.id, l0[i].id);
    assert.equal(x.quando, l0[i].quando);
    assert.equal(x.motivo, l0[i].motivo);
    assert.equal(x.stato, l0[i].stato, 'nessuna correzione annullata dal comando');
    if (['aggiungi', 'imposta'].includes(x.tipo) && x.stato === 'attiva') assert.equal(x.notaNascosta, true);
  }
  // e si rimettono: tornano identiche a prima
  assert.deepEqual(nascondiNote(l1, false), l0, 'visualizza di nuovo: le righe tornano com’erano');
  assert.deepEqual(statoNote(l0), { totale: statoNote(l0).totale, nascoste: 0, visibili: statoNote(l0).totale });
});

test('SOLO IL DIRETTORE: il comando nel registro c’è per il master, non per un giocatore; il server non lascia a un tablet nasconderle', () => {
  const lista = dimitri().scelte.correzioniMaster;
  const conMaster = { master: { nascondiNote: () => {} }, azioni: {} };
  const comando = (ctx) => {
    const sez = sezioneRegistro(ctx, lista.map((x) => ({ ...x, cosa: x.etichetta })));
    const radice = globalThis.document.createElement('div');
    if (sez) radice.append(sez);
    return radice.tutti().filter((n) => n.tagName === 'BUTTON' && /modificato dal master/.test(n.textContent));
  };
  assert.equal(comando({ ...conMaster, master: undefined }).length, 0, 'un giocatore non ha il comando');
  assert.equal(comando(conMaster).length, 1, 'il Direttore sì');
  // il comando chiama l'azione del master con true
  const chiamate = [];
  const b = comando({ master: { nascondiNote: (v) => chiamate.push(v) }, azioni: {} })[0];
  clic(b);
  assert.deepEqual(chiamate, [true]);
  // il tablet: un salvataggio che nasconde le note viene riportato alla versione del disco
  const disco = { formato: 'mutant-personaggio', scelte: {}, correzioni_master: lista };
  const dalTablet = { ...disco, correzioni_master: nascondiNote(lista, true) };
  const esito = proteggiBlocchiMaster(dalTablet, disco);
  assert.equal(esito.ripristinato, true, 'il server riporta il registro com’era');
  assert.deepEqual(esito.file.correzioni_master, lista, 'e le note restano come le ha lasciate il Direttore');
});

test('NESSUNO DEI DUE COMANDI BLOCCA NIENTE: nascondere non ha avvisi, non chiede conferme, e si può fare e disfare', () => {
  const lista = dimitri().scelte.correzioniMaster;
  const dopoDue = nascondiNote(nascondiNote(lista, true), true);
  assert.deepEqual(dopoDue, nascondiNote(lista, true), 'ripetere il comando non cambia niente (idempotente)');
  assert.deepEqual(nascondiNote(dopoDue, false), lista, 'e si disfa');
  // niente da nascondere: la lista torna uguale, senza errori
  assert.deepEqual(nascondiNote([], true), []);
  assert.deepEqual(statoNote([]), { totale: 0, nascoste: 0, visibili: 0 });
});
