// Effetti degli impianti al tavolo (censimento del 04/10/2026, docs/censimento-impianti.md): condizionali con la
// nota «+2 se …» e la casella, bonus fissi nei valori con la provenienza, attivabili (iniettori, Processore),
// +1 danno del Braccio potenziato con la casella di «Attacca!», PG salvati prima che ricevono gli effetti.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { preparaTab, preparaStampa } from '../src/stampa.js';
import { calcolaAttaccoRavvicinato, effettiSituazionaliAttacco } from '../src/attacco.js';
import { massimiSessione, inizializzaSessione, modificaSessione, allineaSessione } from '../src/sessione.js';
import { impiantiAttivabili, cartucceDi, impostaCartucce, somministra, statoProcessore, attivaChip, terminaChip, nuovoIntervalloChip } from '../src/impianti.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, id, stato = 'installato') => ({ uid, rif: `impianti:${id}`, stato, quantita: 1, note: '' });
const pg = (equipaggiamento) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const s = calcolaScheda({ creazione, livelli: [] }, dati);
  return { creazione, s, m: massimiSessione(s, creazione, dati) };
};
const abilitaTab = (tab, nome) => tab.tab.find((t) => t.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === nome);
const abilitaStampa = (st, nome) => st.fogli.find((f) => f.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === nome);

test('Potenziamento visivo CYBERTRONIC: +2 a Percezione con la vista, condizionale in Abilità, con la casella e in stampa', () => {
  const { creazione, m } = pg([voce('pv', 'potenziamento-visivo-cybertronic')]);
  const p = { creazione, livelli: [] };
  // spento: il VA non cambia, la nota «+2 se con la vista» è disponibile accanto al valore
  const spento = abilitaTab(preparaTab(p, dati, { sessione: inizializzaSessione(m) }), 'Percezione');
  assert.equal(spento.effettivo, spento.totale);
  const d = spento.disponibili.find((e) => e.uid === 'pv');
  assert.deepEqual([d.valore, d.se, d.oggetto], [2, 'con la vista', 'Potenziamento visivo CYBERTRONIC']);
  // casella accesa: entra nel VA della Prova con la provenienza
  const acceso = abilitaTab(preparaTab(p, dati, { sessione: modificaSessione(inizializzaSessione(m), { condizioniOggetti: ['pv'] }, m) }), 'Percezione');
  assert.equal(acceso.effettivo, acceso.totale + 2);
  assert.ok(acceso.provenienza.righe.some((r) => /Potenziamento visivo CYBERTRONIC/.test(r.fonte) && r.valore === 2));
  assert.equal(acceso.disponibili.length, 0);
  // stampa a riposo: VA invariato, nota accanto al valore
  const st = abilitaStampa(preparaStampa(p, dati), 'Percezione');
  assert.equal(st.va, st.totale);
  assert.deepEqual(st.condizionali, [{ valore: 2, se: 'con la vista', oggetto: 'Potenziamento visivo CYBERTRONIC' }]);
  // vista e udito potenziati insieme: +2, non +4 (§7.4: una sola Prova, un solo bonus degli strumenti)
  const due = pg([voce('pv', 'potenziamento-visivo-cybertronic'), voce('pu', 'potenziamento-uditivo')]);
  const entrambi = abilitaTab(preparaTab({ creazione: due.creazione, livelli: [] }, dati, { sessione: modificaSessione(inizializzaSessione(due.m), { condizioniOggetti: ['pv', 'pu'] }, due.m) }), 'Percezione');
  assert.equal(entrambi.effettivo, entrambi.totale + 2);
});

test('bonus fissi: Coordinatore difensivo +1 alle Difese, Rinforzo sottocutaneo +1 AR, con la provenienza', () => {
  const senza = pg([]).s;
  const con = pg([voce('cd', 'coordinatore-difensivo'), voce('rs', 'rinforzo-sottocutaneo-cybertronic')]).s;
  const difese = (s) => s.abilita.find((a) => a.nome === 'Difese');
  assert.equal(difese(con).effettivo, difese(senza).effettivo + 1);
  assert.ok(difese(con).provenienza.righe.some((r) => r.fonte === 'Coordinatore difensivo' && r.valore === 1));
  assert.equal(con.equipaggiamento.ar.totale, senza.equipaggiamento.ar.totale + 1);
});

test('Braccio potenziato: +1 danno solo con la casella di «Attacca!» («con quell’arto», §7.5)', () => {
  const { s } = pg([voce('bp', 'braccio-potenziato')]);
  const sit = effettiSituazionaliAttacco(s, 'ravvicinati', { senzArmi: true });
  assert.deepEqual(sit.map((x) => [x.uid, x.danno, x.se]), [['bp', 1, 'con il braccio potenziato']]);
  assert.equal(s.equipaggiamento.bonusDanno.length, 0, 'non è più un bonus sempre attivo');
  const arma = { uid: 'senz', senzArmi: true, nome: 'Senz’armi', abilita: 'Corpo a corpo', va: 5, scomposizione: [], danno: { una_mano: '1d4' }, dannoBase: '1d4' };
  const no = calcolaAttaccoRavvicinato({ scheda: s, sessione: null }, arma, {}, dati);
  const si = calcolaAttaccoRavvicinato({ scheda: s, sessione: null }, arma, { oggetti: ['bp'] }, dati);
  assert.equal(si.danno.bonus, no.danno.bonus + 1);
  assert.ok(si.promemoria.some((x) => /Braccio potenziato \(con il braccio potenziato\): \+1 al danno/.test(x)));
});

test('attivabili: iniettore con le cartucce e «Somministra»; Processore con «Attiva», una volta ogni 24 ore', () => {
  const { creazione, m } = pg([voce('inj', 'iniettore-sanitario-impiantato'), voce('proc', 'processore-neurale-di-abilita'),
    voce('c1', 'chip-assistenza-percezione', 'in_uso'), voce('c2', 'chip-assistenza-furtivita', 'zaino'), voce('vn', 'visione-notturna')]);
  const att = impiantiAttivabili(creazione.equipaggiamento, dati);
  assert.deepEqual(att.map((x) => [x.uid, x.tipo]), [['inj', 'cariche'], ['proc', 'chip'], ['vn', 'promemoria']]);
  assert.match(att[2].todo, /A\.106/);
  let s = inizializzaSessione(m);
  assert.equal('impianti' in s, false, 'sessioni di prima identiche');
  // iniettore: venduto senza cartucce, caricatore fino a 5
  const inj = att[0];
  assert.equal(cartucceDi(s, 'inj'), 0);
  assert.equal(somministra(s, 'inj'), null);
  s = allineaSessione(impostaCartucce(s, 'inj', 9, inj.cartucce), m);
  assert.equal(cartucceDi(s, 'inj'), 5);
  s = allineaSessione(somministra(s, 'inj'), m);
  assert.equal(cartucceDi(s, 'inj'), 4);
  // Processore: il chip inserito si attiva e il bonus entra nel VA; il secondo nelle 24 ore no
  const proc = att[1];
  const st0 = statoProcessore(s, proc, dati);
  assert.match(st0.chip.find((c) => c.uid === 'c2').motivo, /non è inserito/);
  s = allineaSessione(attivaChip(s, proc, 'c1', dati), m);
  assert.deepEqual([s.impianti.processore, s.condizioniOggetti.includes('c1')], [{ attivo: 'c1', usato: true }, true]);
  const perc = abilitaTab(preparaTab({ creazione, livelli: [] }, dati, { sessione: s }), 'Percezione');
  assert.equal(perc.effettivo, perc.totale + 2);
  s = allineaSessione(terminaChip(s, proc), m);
  assert.equal(s.condizioniOggetti.includes('c1'), false);
  assert.equal(attivaChip(s, proc, 'c1', dati), null, 'una sola attivazione ogni 24 ore');
  s = allineaSessione(nuovoIntervalloChip(s, proc), m);
  assert.ok(attivaChip(s, proc, 'c1', dati));
});

test('PG salvato prima della correzione (Nadia Ferro d’esempio): gli impianti installati danno i loro effetti', () => {
  const file = JSON.parse(readFileSync(new URL('../esempi/Nadia-Ferro_liv4_2026-10-02.json', import.meta.url), 'utf8'));
  const tab = preparaTab({ creazione: file.scelte, livelli: file.livelli ?? [] }, dati, { sessione: file.sessione });
  const perc = abilitaTab(tab, 'Percezione');
  assert.ok([...perc.disponibili, ...(tab.scheda.oggettiAccesi ?? [])].some((e) => /Potenziamento visivo/.test(e.oggetto) && e.valore === 2 && e.se === 'con la vista'));
  const st = abilitaStampa(preparaStampa({ creazione: file.scelte, livelli: file.livelli ?? [] }, dati), 'Percezione');
  assert.ok(st.condizionali.some((c) => c.se === 'con la vista'));
});

test('validatore: «se» breve e solo situazionale; «attivabile» solo per gli impianti', () => {
  const d = copia(dati);
  const imp = d.equipaggiamento.file.impianti.oggetti;
  imp.find((o) => o.id === 'potenziamento-visivo').effetti[0].se = 'x'.repeat(41);
  imp.find((o) => o.id === 'filtro-ematico').effetti[0].se = 'contro i veleni';
  d.equipaggiamento.file.armi.oggetti[0].attivabile = { tipo: 'promemoria', azione: '1 AzP', frasi: ['x'] };
  const e = validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n');
  assert.match(e, /\(Potenziamento visivo\)\.effetti\[0\]\.se/);
  assert.match(e, /\(Filtro ematico\)\.effetti\[0\]\.se/);
  assert.match(e, /\.attivabile: solo per gli impianti/);
});
