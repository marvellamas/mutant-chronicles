// Tablet del 19/10/2026, punto 5: tabelle di consultazione del recupero dei PM (tab Poteri) e dei PV (tab Combattimento),
// in sola lettura, con i valori dei manuali, in un blocco richiudibile e chiuso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, ESEMPI, dati } from './scheda-aiuti.js';
import { validaDati } from '../src/validate.js';

const norm = (t) => String(t).replace(/[’‘]/g, "'").replace(/\\/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const giocatore = norm(readFileSync(new URL('../docs/manuali-txt/giocatore.md', import.meta.url), 'utf8'));
const magia = norm(readFileSync(new URL('../docs/manuali-txt/magia.md', import.meta.url), 'utf8'));
const T = dati.regole.tabelle_consultazione;
const nei = (manuale, testo, quale) => assert.ok(manuale.includes(norm(testo)), `${quale}: «${testo}» non è nel manuale`);

test('dati: le tabelle ci sono e il validatore le controlla', () => {
  assert.deepEqual(validaDati(dati), []);
  const rotti = structuredClone(dati);
  rotti.regole.tabelle_consultazione.recupero_pv.riposo_completo.righe.pop();
  assert.ok(validaDati(rotti).some((e) => /riposo_completo/.test(e.chiave)));
  const senza = structuredClone(dati);
  delete senza.regole.tabelle_consultazione;
  assert.ok(validaDati(senza).some((e) => /tabelle_consultazione/.test(e.chiave)));
});

test('recupero dei PM: righe e parametri uguali al Manuale della Magia', () => {
  const pm = T.recupero_pm;
  assert.deepEqual(pm.righe.map((r) => [r.fase, r.valore]), [['Attività pesante', '0 per ora'], ['Attività leggera', '1 per ora'], ['Riposo breve', '2 per ora'], ['Riposo completo', '3 per ora']]);
  for (const r of pm.righe) nei(magia, `| ${r.fase} | ${r.valore.replace(' per ora', '')} per ora | ${r.esempi.replace('Sonno comodo e indisturbato: ', 'Sonno comodo e indisturbato: ')}`.replace('| Riposo completo | 3 per ora | Sonno comodo e indisturbato: ', '| Riposo completo | 3 per ora | Sonno comodo e indisturbato: '), `PM ${r.fase}`);
  for (const r of pm.meditazione.righe) nei(magia, `| ${r.parametro} | ${r.regola} |`, `Meditazione ${r.parametro}`);
  for (const frase of [
    'La Meditazione sostituisce il recupero naturale della stessa ora: i due recuperi non si sommano.',
    'Meditazione Migliorata richiede accesso alla Meditazione, è acquisibile una sola volta e aggiunge 2 PM al recupero di ogni ora completa, dopo aver applicato il minimo di 3.',
    "Meditazione Estesa richiede accesso alla Meditazione e raddoppia le ore giornaliere utili al recupero, dopo aver applicato il minimo di 1 ora.",
    "Attività pesante 0 PM, Attività leggera 2 PM, Riposo breve 3 PM e Riposo completo 4 PM",
    "Un combattimento di 10–15 Round è Attività pesante: non concede recupero e interrompe l'ora in corso, ma non viene conteggiato automaticamente come un'ora intera.",
  ]) nei(magia, frase, 'Magia');
  // le note dei dati dicono le stesse cose (numeri compresi)
  assert.match(pm.meditazione.note.join(' '), /aggiunge 2 PM/);
  assert.match(pm.note.join(' '), /Riposo completo 4 PM/);
  assert.match(pm.note.join(' '), /10–15 Round è Attività pesante/);
});

test('recupero dei PV: tabella e Riposo completo per COS uguali al Manuale del Giocatore (§5.16.1), kit in §5.15', () => {
  const pv = T.recupero_pv;
  for (const r of pv.righe) nei(giocatore, `| ${r.condizione} | ${r.recupero} | ${r.limite} |`, `PV ${r.condizione}`);
  const mod = (m) => (m > 0 ? `+${m}` : String(m).replace('-', '−'));
  for (const r of pv.riposo_completo.righe) nei(giocatore, `| ${r.cos} | ${mod(r.mod)} | ${r.pv} |`, `COS ${r.cos}`);
  assert.deepEqual(pv.riposo_completo.righe.map((r) => r.pv), [1, 1, 1, 5, 10, 20, 30, 40, 50, 60]);
  for (const frase of [
    'I recuperi non superano i PV massimi e possono cumularsi nello stesso giorno se il tempo viene realmente trascorso nelle diverse condizioni. Un Sanguinamento attivo impedisce il recupero.',
    'Il Riposo completo richiede il completamento delle sei ore e non cura le Ferite.',
  ]) nei(giocatore, frase, 'Giocatore §5.16.1');
  // §5.15: i tre kit
  nei(giocatore, "il kit Improvvisato sospende il Sanguinamento per 10 Round, lo Standard lo arresta, il Professionale lo arresta e recupera 1d4 PV", 'Giocatore §5.15 successo');
  nei(giocatore, "Con Magistrale, l'Improvvisato lo arresta, lo Standard lo arresta e recupera 1d4 PV, il Professionale lo arresta e recupera il doppio del risultato di un unico 1d4", 'Giocatore §5.15 Magistrale');
  assert.deepEqual(pv.in_combattimento.righe.map((r) => r.kit), ['Improvvisato', 'Standard', 'Professionale']);
  nei(giocatore, 'Arrestare il Sanguinamento con Medicina richiede un minuto continuativo, pari a 10 Round, un kit utilizzabile e accesso al paziente. Si consuma un\'applicazione all\'inizio.', 'Giocatore §5.15 tempi');
});

function conTabelle(attiva) {
  const c = ESEMPI.map((f) => contesto(f, { attiva })).find((x) => x.massimi.pm > 0);
  assert.ok(c, 'un PG d’esempio con PM');
  return { c, r: resa(c) };
}
const bloccoDi = (r, id) => r.radice.tutti().find((n) => n.id === `tabella-${id}`);

test('tab Poteri: la tabella dei PM c’è, in un blocco richiudibile chiuso e di sola lettura', () => {
  const { r } = conTabelle('poteri');
  const b = bloccoDi(r, 'recupero-pm');
  assert.ok(b, 'blocco del recupero dei PM');
  assert.equal(b.tagName, 'DETAILS');
  assert.ok(!b.open, 'chiuso di default');
  assert.ok(b.tutti().some((n) => n.tagName === 'SUMMARY'), 'si apre dal titolo');
  assert.equal(b.tutti().filter((n) => ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(n.tagName)).length, 0, 'sola lettura');
  const testo = b.textContent;
  for (const r2 of T.recupero_pm.righe) assert.ok(testo.includes(r2.fase) && testo.includes(r2.valore), r2.fase);
  assert.ok(testo.includes('3 + Mod SAG PM, con un minimo di 3 PM.'));
  // niente tabella dei PV nella tab Poteri
  assert.equal(bloccoDi(r, 'recupero-pv'), undefined);
});

test('tab Combattimento: la tabella dei PV c’è, chiusa e di sola lettura, con la riga del personaggio', () => {
  const { c, r } = conTabelle('combattimento');
  const b = bloccoDi(r, 'recupero-pv');
  assert.ok(b, 'blocco del recupero dei PV');
  assert.equal(b.tagName, 'DETAILS');
  assert.ok(!b.open, 'chiuso di default');
  assert.equal(b.tutti().filter((n) => ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(n.tagName)).length, 0, 'sola lettura');
  const testo = b.textContent;
  for (const riga of T.recupero_pv.righe) assert.ok(testo.includes(riga.condizione) && testo.includes(riga.recupero), riga.condizione);
  for (const k of T.recupero_pv.in_combattimento.righe) assert.ok(testo.includes(k.kit) && testo.includes(k.successo), k.kit);
  // evidenzia la riga della COS del personaggio, senza cambiare nessun valore
  const cos = c.tab.scheda.caratteristiche.COS.valore;
  const evidenziate = b.tutti().filter((n) => n.tagName === 'TR' && n.className === 'riga-tua');
  assert.equal(evidenziate.length, cos >= 1 && cos <= 10 ? 1 : 0);
  if (evidenziate[0]) assert.equal(evidenziate[0].children[0].textContent, String(cos));
  assert.equal(bloccoDi(r, 'recupero-pm'), undefined);
});

test('le tabelle non esistono nelle altre tab e non cambiano i valori della scheda', () => {
  for (const tab of ['identita', 'abilita', 'artefatti', 'inventario']) {
    const { r } = conTabelle(tab);
    assert.equal(bloccoDi(r, 'recupero-pm'), undefined, tab);
    assert.equal(bloccoDi(r, 'recupero-pv'), undefined, tab);
  }
});
