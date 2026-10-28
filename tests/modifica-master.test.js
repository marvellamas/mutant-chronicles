// «Modifica master» (12/10/2026, richiesta di Davide e Marcello): il DdG cambia qualsiasi valore di un PG, con registro
// e annulla. Le correzioni stanno a parte dal calcolo (src/correzioni-master.js) e il motore le applica dopo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installaDomFinto } from './dom-finto.js';
import { datiReali, copia } from './helpers.js';
import { creaServer } from '../server.mjs';
import { calcolaScheda } from '../src/calc.js';
import { preparaTab, preparaStampa } from '../src/stampa.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { applicaCorrezione } from '../src/avanzamento.js';
import { massimiSessione, allineaSessione, penalitaSessione } from '../src/sessione.js';
import { vistaPlancia } from '../src/tavolo.js';
import {
  applicaCorrezioni, nuovaCorrezione, aggiungiCorrezione, annullaCorrezione, avvisoAnnulla, registro, registraDiretta, differenzeDirette, differenzeOggetti,
  ripristinoDiretta, descriviScelte, soloScelte, ripristinaScelte, contestoMaster, modalitaMaster, mostraMarchio, circostanzeMasterAttive, scadutiAFineScontro,
  sessioneConCircostanzeMaster, proteggiBlocchiMaster, masterDiverso, testoConBlocchiMaster, conCircostanzaMandata, senzaCircostanza, senzaCircostanzeDelloScontro, FONTE,
} from '../src/correzioni-master.js';

installaDomFinto();
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { renderTab, tabFissi } = await import('../src/ui/tab.js');
const { dati } = await datiReali();
const cartellaEsempi = new URL('../esempi/', import.meta.url);
const ESEMPI = readdirSync(cartellaEsempi).filter((f) => f.endsWith('.json'));
const TORVALD = ESEMPI.find((f) => f.startsWith('Torvald'));
const testoDi = (f) => readFileSync(new URL(f, cartellaEsempi), 'utf8');

/** Il PG d'esempio: { creazione (normalizzata), livelli, sessione }. */
function pg(f = TORVALD) {
  const p = deserializzaPersonaggio(testoDi(f));
  return { creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli ?? [], sessione: p.sessione };
}
const con = (p, ...righe) => ({ ...p, creazione: { ...p.creazione, correzioniMaster: righe.reduce((l, r) => aggiungiCorrezione(l, r), p.creazione.correzioniMaster ?? []) } });
const scheda = (p) => calcolaScheda({ creazione: p.creazione, livelli: p.livelli }, dati);
const piuDieciPv = () => nuovaCorrezione({ chiave: 'pv', etichetta: 'Punti Vita massimi', tipo: 'aggiungi', numero: 10, motivo: 'dono del patrono' });

/** Contesto della scheda a tab (come tests/scheda-ritocchi.test.js), con o senza la modalità master. */
function contesto(p, { attiva = 'identita', master = false, marchio = true } = {}) {
  const riposo = preparaTab({ creazione: p.creazione, livelli: p.livelli }, dati);
  const massimi = massimiSessione(riposo.scheda, p.creazione, dati);
  const sessione = allineaSessione(p.sessione, massimi);
  const tab = preparaTab({ creazione: p.creazione, livelli: p.livelli }, dati, { sessione });
  tab.tab = tabFissi(tab.tab);
  const chiamate = [];
  const azioni = new Proxy({}, { get: (_, nome) => (...a) => { chiamate.push([nome, ...a]); } });
  const m = master ? new Proxy({}, { get: (_, nome) => (...a) => { chiamate.push([`master.${nome}`, ...a]); } }) : null;
  return { dati, tab, attiva, scelte: p.creazione, livelli: p.livelli, sessione, massimi, penalita: penalitaSessione(sessione, dati), posizione: 'alto', larghezza: 'piena',
    sfondi: [], passi: { background: 0, equipaggiamento: 8 }, ui: {}, azioni, chiamate, partecipanti: [], chi: {}, server: true, marchio, master: m, registroMaster: registro(p.creazione.correzioniMaster) };
}
function resa(ctx) {
  const radice = document.createElement('div');
  radice.append(...renderTab(ctx).filter(Boolean));
  return { radice, tutti: radice.tutti(), classe: (c) => radice.querySelectorAll(`.${c}`), testo: () => radice.textContent };
}
const clic = (nodo) => (nodo.ascolti.click ?? []).forEach((f) => f({ preventDefault() {}, stopPropagation() {}, target: nodo }));

// ---------------------------------------------------------------------------
// Correzioni applicate dopo il calcolo

test('+10 PV del master: il massimo sale di 10 e il valore da regole resta scritto accanto', () => {
  const p = pg();
  const base = scheda(p);
  const s = scheda(con(p, piuDieciPv()));
  assert.equal(s.pv, base.pv + 10);
  assert.deepEqual(s.correzioniMaster.pv, { calcolato: base.pv, righe: [{ fonte: FONTE, valore: 10, nota: 'dono del patrono', categoria: 'master' }] });
  // il massimo della sessione (PV attuali / massimi) è quello corretto
  assert.equal(massimiSessione(s, p.creazione, dati).pv, base.pv + 10);
  // tutto il resto della scheda è identico
  const { pv: _a, correzioniMaster: _b, ...resto } = s;
  const { pv: _c, ...restoBase } = base;
  const { correzioniMaster: _d, ...equip } = resto.equipaggiamento;
  assert.equal(JSON.stringify({ ...resto, equipaggiamento: equip }), JSON.stringify(restoBase));
});

test('la correzione sopravvive al ricalcolo, alla salita di livello e alla correzione di un livello passato (A.107)', () => {
  const p = con(pg(), piuDieciPv());
  // ricalcolo: salvato su file e riletto, i +10 ci sono ancora (e stanno a parte, fuori dalle scelte)
  const testo = serializza(p.creazione, { livelli: p.livelli, sessione: p.sessione });
  const file = JSON.parse(testo);
  assert.equal(file.correzioni_master.length, 1);
  assert.equal(file.correzioni_master[0].numero, 10);
  assert.equal('correzioniMaster' in file.scelte, false, 'nel file l’elenco è a parte, non fra le scelte');
  const riletto = deserializzaPersonaggio(testo);
  const dopo = { creazione: normalizza(riletto.creazione, dati).scelte, livelli: riletto.livelli };
  assert.equal(scheda(dopo).pv, scheda(pg()).pv + 10);
  // salita di livello: a ogni livello il massimo è quello da regole di quel livello più 10
  const senza = pg();
  for (let n = 0; n <= senza.livelli.length; n++) {
    const aLivello = (x) => scheda({ creazione: x.creazione, livelli: x.livelli.slice(0, n) }).pv;
    assert.equal(aLivello(p), aLivello(senza) + 10, `con ${n} livelli dopo il primo`);
  }
  // A.107: si corregge un livello passato (via il Talento del 3° livello): i livelli dopo si ricalcolano, i +10 restano
  const corretto = applicaCorrezione({ creazione: p.creazione, livelli: p.livelli }, 3, { ...p.livelli[1], talentoLibero: null });
  const correttoSenza = applicaCorrezione({ creazione: senza.creazione, livelli: senza.livelli }, 3, { ...senza.livelli[1], talentoLibero: null });
  assert.equal(scheda(corretto).pv, scheda(correttoSenza).pv + 10);
  assert.equal(scheda(corretto).correzioniMaster.pv.righe[0].valore, 10);
});

test('«Imposta a N»: il valore diventa N qualunque sia il calcolo, e resta N quando il calcolo cambia', () => {
  const p = pg();
  const imposta = nuovaCorrezione({ chiave: 'pv', etichetta: 'Punti Vita massimi', tipo: 'imposta', numero: 50, motivo: '' });
  const s = scheda(con(p, imposta));
  assert.equal(s.pv, 50);
  assert.equal(s.correzioniMaster.pv.righe[0].valore, 50 - scheda(p).pv, 'la riga dice di quanto sposta il calcolo');
  for (let n = 0; n <= p.livelli.length; n++) assert.equal(scheda({ creazione: con(p, imposta).creazione, livelli: p.livelli.slice(0, n) }).pv, 50);
  // poi +2: le correzioni si applicano in ordine
  assert.equal(scheda(con(p, imposta, nuovaCorrezione({ chiave: 'pv', etichetta: 'PV', tipo: 'aggiungi', numero: 2 }))).pv, 52);
  // la funzione pura, con i limiti
  assert.deepEqual(applicaCorrezioni(7, [{ id: 'a', chiave: 'x', tipo: 'imposta', numero: 30, stato: 'attiva' }], 'x', { massimo: 20 }).valore, 20);
  assert.equal(applicaCorrezioni(null, [imposta], 'pv').valore, null);
  assert.throws(() => nuovaCorrezione({ chiave: 'pv', tipo: 'aggiungi', numero: NaN }), /Serve un numero/);
});

test('ogni valore si corregge: Caratteristiche (con ciò che ne deriva), Abilità, Difese, Salvezze, Iniziativa, Movimento, AR, PM, Umanità', () => {
  const p = pg();
  const base = scheda(p);
  const r = (chiave, numero, tipo = 'aggiungi') => nuovaCorrezione({ chiave, etichetta: chiave, tipo, numero, motivo: 'prova' });
  // Caratteristica: cambia anche il modificatore e ciò che ne deriva
  const menoFor = scheda(con(p, r('car:FOR', -2)));
  assert.equal(menoFor.caratteristiche.FOR.valore, base.caratteristiche.FOR.valore - 2);
  assert.equal(menoFor.caratteristiche.FOR.calcolato, base.caratteristiche.FOR.valore);
  assert.ok(menoFor.caratteristiche.FOR.mod < base.caratteristiche.FOR.mod, 'il modificatore segue la Caratteristica corretta');
  // oltre il massimo della tabella non si va
  assert.equal(scheda(con(p, r('car:FOR', 50))).caratteristiche.FOR.valore, dati.caratteristiche.valore_massimo);
  // Abilità: il VA sale, e la riga compare nel conto («Calcolo»)
  const ab = (s, n) => s.abilita.find((a) => a.nome === n);
  const piuAtl = scheda(con(p, r('abilita:Atletica', 3)));
  assert.equal(ab(piuAtl, 'Atletica').totale, ab(base, 'Atletica').totale + 3);
  const tabAtl = preparaTab(con(p, r('abilita:Atletica', 3)), dati).tab.find((t) => t.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === 'Atletica');
  const rigaMaster = tabAtl.provenienza.righe.find((x) => x.fonte === FONTE);
  assert.deepEqual([rigaMaster.valore, rigaMaster.nota], [3, 'prova'], 'nel «Calcolo»: Correzione del master +3 (prova)');
  assert.equal(tabAtl.provenienza.totale, tabAtl.effettivo);
  // Difese: la Parata dello scudo la segue
  const piuDif = scheda(con(p, r('abilita:Difese', 2)));
  assert.equal(ab(piuDif, 'Difese').totale, ab(base, 'Difese').totale + 2);
  const scudo = (s) => s.equipaggiamento.protezioni.find((x) => x.parata);
  if (scudo(base)) assert.equal(scudo(piuDif).parata.ravvicinata, scudo(base).parata.ravvicinata + 2);
  // Prove Salvezza, Iniziativa, Movimento, PM, AR, Umanità
  assert.equal(scheda(con(p, r('salvezza:tempra', 1))).salvezze.tempra.totale, base.salvezze.tempra.totale + 1);
  assert.equal(scheda(con(p, r('iniziativa', 4))).iniziativa, base.iniziativa + 4);
  assert.equal(scheda(con(p, r('movimento:passo', 2))).movimento.passo, base.movimento.passo + 2);
  assert.equal(scheda(con(p, r('pm', 5))).pm, (base.pm ?? 0) + 5);
  const ar = scheda(con(p, r('ar', 2))).equipaggiamento.ar;
  assert.equal(ar.totale, base.equipaggiamento.ar.totale + 2);
  assert.ok(ar.valori.find((v) => v.id === 'totale').provenienza.righe.some((x) => x.fonte === FONTE && x.valore === 2));
  const umn = scheda(con(p, r('umanita', -2))).umanita;
  assert.equal(umn.valore, base.umanita.valore - 2);
  assert.ok(umn.provenienza.righe.some((x) => x.fonte === FONTE && x.valore === -2));
  // al tavolo (con la sessione) l'AR corretta vale lo stesso
  const sessione = allineaSessione(p.sessione, massimiSessione(base, p.creazione, dati));
  const tavolo = calcolaScheda({ creazione: con(p, r('ar', 2)).creazione, livelli: p.livelli, sessione }, dati);
  assert.equal(tavolo.equipaggiamento.arEffettiva.totale, calcolaScheda({ creazione: p.creazione, livelli: p.livelli, sessione }, dati).equipaggiamento.arEffettiva.totale + 2);
});

test('annulla di una correzione: la riga resta nel registro, segnata annullata, e l’effetto sparisce', () => {
  const p = pg();
  const riga = piuDieciPv();
  const lista = aggiungiCorrezione([], riga);
  const dopo = annullaCorrezione(lista, riga.id, new Date('2026-10-12T10:00:00Z'));
  assert.equal(dopo.length, 1, 'la riga non si cancella');
  assert.equal(dopo[0].stato, 'annullata');
  assert.equal(dopo[0].annullataIl, '2026-10-12T10:00:00.000Z');
  assert.equal(scheda({ ...p, creazione: { ...p.creazione, correzioniMaster: dopo } }).pv, scheda(p).pv, 'i PV tornano quelli da regole');
  const r = registro(dopo)[0];
  assert.deepEqual([r.cosa, r.motivo, r.annullata], ['Punti Vita massimi: +10', 'dono del patrono', true]);
  // una correzione di calcolo si annulla senza avvisi, anche con altre dopo
  assert.equal(avvisoAnnulla(aggiungiCorrezione(lista, piuDieciPv()), riga.id), null);
});

// ---------------------------------------------------------------------------
// Valori «a mano» e scelte

test('i valori già «a mano» cambiati dal master entrano nel registro (prima → dopo); più tocchi di fila, una riga sola', () => {
  const nomi = { ferite: (n) => ['Nessuna', 'Superficiale', 'Importante'][n] ?? String(n) };
  const d = differenzeDirette({ crediti: 120, puntiEroe: 2, ferite: 0, statiAttivi: [] }, { crediti: 620, puntiEroe: 2, ferite: 1, statiAttivi: ['svenuto'] }, nomi);
  assert.deepEqual(d.map((x) => [x.etichetta, x.prima, x.dopo]), [['Crediti', '120', '620'], ['Ferite', 'Nessuna', 'Superficiale'], ['Stati', 'nessuno', 'svenuto']]);
  const t0 = new Date('2026-10-12T10:00:00Z');
  let lista = registraDiretta([], { chiave: 'sessione:crediti', campo: 'crediti', etichetta: 'Crediti', prima: '120', dopo: '220', valorePrima: 120, valoreDopo: 220 }, { adesso: t0 });
  lista = registraDiretta(lista, { chiave: 'sessione:crediti', campo: 'crediti', etichetta: 'Crediti', prima: '220', dopo: '620', valorePrima: 220, valoreDopo: 620 }, { adesso: new Date(t0.getTime() + 5000) });
  assert.equal(lista.length, 1);
  assert.equal(registro(lista)[0].cosa, 'Crediti: 120 → 620');
  // tornati al valore di partenza: nessuna riga
  assert.equal(registraDiretta(lista, { chiave: 'sessione:crediti', campo: 'crediti', etichetta: 'Crediti', prima: '620', dopo: '120', valorePrima: 620, valoreDopo: 120 }, { adesso: new Date(t0.getTime() + 9000) }).length, 0);
  // dopo un minuto è un'altra modifica
  assert.equal(registraDiretta(lista, { chiave: 'sessione:crediti', campo: 'crediti', etichetta: 'Crediti', prima: '620', dopo: '700', valorePrima: 620, valoreDopo: 700 }, { adesso: new Date(t0.getTime() + 120000) }).length, 2);
  // annullare rimette il valore di prima; se nel frattempo è cambiato ancora, lo si dice
  assert.deepEqual(ripristinoDiretta(lista[0], { sessione: { crediti: 620 } }), { sessione: { campo: 'crediti', valore: 120 }, cambiato: false });
  assert.equal(ripristinoDiretta(lista[0], { sessione: { crediti: 900 } }).cambiato, true);
  // quantità degli oggetti, oggetti aggiunti e tolti
  const o = differenzeOggetti([{ uid: 'a', rif: 'x:granata', quantita: 2 }, { uid: 'b', rif: 'x:corda', quantita: 1 }], [{ uid: 'a', rif: 'x:granata', quantita: 5 }, { uid: 'c', rif: 'x:torcia', quantita: 1 }], (v) => v.rif.split(':')[1]);
  assert.deepEqual(o.map((x) => [x.etichetta, x.prima, x.dopo]), [['granata: quantità', '2', '5'], ['torcia: aggiunto all’Inventario', 'assente', '×1'], ['corda: tolto dall’Inventario', '×1', 'assente']]);
  const q = registraDiretta([], o[0])[0];
  assert.deepEqual(ripristinoDiretta(q, { equipaggiamento: [{ uid: 'a', quantita: 5 }] }), { oggetto: { uid: 'a', azione: 'quantita', quantita: 2 }, cambiato: false });
});

test('modifica di una scelta: descrizione leggibile, copia del file prima e ripristino con «Annulla»', () => {
  const prima = pg();
  const dopo = copia(prima);
  dopo.livelli[1] = { ...dopo.livelli[1], talentoLibero: { id: 'schivata-migliorata' } };
  const righe = (v) => [`Talento ${v.talentoLibero?.id ?? 'nessuno'}`];
  assert.equal(descriviScelte(prima, dopo, righe), 'Livello 3: Talento parata-migliorata → Talento schivata-migliorata');
  assert.equal(descriviScelte(prima, copia(prima), righe), null, 'nessuna differenza, nessuna riga');
  const creazione = copia(prima);
  creazione.creazione.nome = 'Altro nome';
  creazione.creazione.puntiCaratteristica = { ...creazione.creazione.puntiCaratteristica, FOR: 1 };
  assert.match(descriviScelte(prima, creazione, righe), /^Creazione: nome, puntiCaratteristica$/);
  // il registro del master non è una «scelta»: cambiarlo non fa nascere una riga di scelta
  assert.equal(descriviScelte(prima, con(prima, piuDieciPv()), righe), null);
  // «Annulla»: tornano le scelte della copia; il registro e i bonus del master di adesso restano
  const conRegistro = con(dopo, piuDieciPv());
  const rimesso = ripristinaScelte({ creazione: conRegistro.creazione, livelli: conRegistro.livelli }, { creazione: prima.creazione, livelli: prima.livelli });
  assert.deepEqual(rimesso.livelli, prima.livelli);
  assert.equal(rimesso.creazione.correzioniMaster.length, 1, 'il registro resta');
  assert.deepEqual(soloScelte(rimesso).creazione, soloScelte(prima).creazione);
});

test('annulla con modifiche successive: avviso e conferma («Procedi comunque»)', () => {
  const scelta = nuovaCorrezione({ chiave: 'scelte', etichetta: 'Livello 3: Talento X → Talento Y', tipo: 'scelta', copia: 'Torvald_prima_20261012-100000.json' });
  let lista = aggiungiCorrezione([], scelta);
  assert.equal(avvisoAnnulla(lista, scelta.id), null, 'senza altro dopo si annulla senza chiedere');
  lista = aggiungiCorrezione(lista, piuDieciPv());
  const avviso = avvisoAnnulla(lista, scelta.id);
  assert.match(avviso, /Dopo questa modifica ce ne sono altre \(una\): Punti Vita massimi/);
  assert.match(avviso, /le modifiche fatte dopo alle scelte si perdono/);
  // una modifica successiva già annullata non conta
  assert.equal(avvisoAnnulla(annullaCorrezione(lista, lista[1].id), scelta.id), null);
  // modifica diretta con un'altra dopo sullo stesso valore
  const t0 = new Date('2026-10-12T10:00:00Z');
  let d = registraDiretta([], { chiave: 'sessione:crediti', campo: 'crediti', etichetta: 'Crediti', prima: '1', dopo: '2', valorePrima: 1, valoreDopo: 2 }, { adesso: t0 });
  d = registraDiretta(d, { chiave: 'sessione:crediti', campo: 'crediti', etichetta: 'Crediti', prima: '2', dopo: '3', valorePrima: 2, valoreDopo: 3 }, { adesso: new Date(t0.getTime() + 600000) });
  assert.match(avvisoAnnulla(d, d[0].id), /Annullando si rimette il valore di prima/);
});

// ---------------------------------------------------------------------------
// Chi è il master; il registro e il tasto MUTANT

test('contesto master: solo la pagina aperta sul PC del server; i tablet mai; la modalità solo con «Modifica master»', () => {
  assert.equal(contestoMaster({ server: true, daQuestoPc: true }), true);
  assert.equal(contestoMaster({ server: true, daQuestoPc: false }), false, 'tablet in rete');
  assert.equal(contestoMaster({ server: false, daQuestoPc: true }), false, 'senza server non c’è master');
  assert.equal(modalitaMaster({ server: true, daQuestoPc: true, aperta: 'p1', id: 'p1' }), true);
  assert.equal(modalitaMaster({ server: true, daQuestoPc: true, aperta: null, id: 'p1' }), false, 'scheda aperta con «Apri»: quella di sempre');
  assert.equal(modalitaMaster({ server: true, daQuestoPc: true, aperta: 'p2', id: 'p1' }), false);
  assert.equal(modalitaMaster({ server: true, daQuestoPc: false, aperta: 'p1', id: 'p1' }), false, 'un tablet non entra in modalità master nemmeno col segno');
});

test('registro «Modifiche del master» in Identità: i giocatori lo leggono soltanto; in modalità master ogni riga ha «Annulla»', () => {
  const p = con(pg(), piuDieciPv(), nuovaCorrezione({ chiave: 'car:FOR', etichetta: 'Forza', tipo: 'imposta', numero: 9, motivo: 'A.111' }));
  const giocatore = resa(contesto(p));
  const sezione = giocatore.classe('registro-master')[0];
  assert.ok(sezione, 'la sezione c’è anche per il giocatore');
  assert.match(sezione.textContent, /Modifiche del master \(2\)/);
  assert.match(sezione.textContent, /Punti Vita massimi: \+10/);
  assert.match(sezione.textContent, /dono del patrono/);
  assert.match(sezione.textContent, /Forza: impostato a 9/);
  assert.match(sezione.textContent, /Sola lettura/);
  assert.equal(giocatore.classe('btn-annulla-master').length, 0, 'nessun «Annulla» per il giocatore');
  assert.equal(giocatore.classe('btn-tocco-master').length, 0, 'nessun ✎ fuori dalla modalità master');
  assert.equal(giocatore.classe('fascia-master').length, 0);
  // senza modifiche e fuori dalla modalità master la sezione non c'è
  assert.equal(resa(contesto(pg())).classe('registro-master').length, 0);
  // modalità master: fascia, ✎ sui valori, «Annulla» su ogni riga attiva
  const ctx = contesto(p, { master: true });
  const master = resa(ctx);
  assert.match(master.classe('fascia-master')[0].textContent, /Modalità master — ogni modifica viene registrata/);
  assert.ok(master.classe('btn-esci-master').length === 1);
  const annulla = master.classe('btn-annulla-master');
  assert.equal(annulla.length, 2);
  clic(annulla[0]);
  assert.equal(ctx.chiamate.at(-1)[0], 'master.annulla');
  assert.ok(master.classe('btn-tocco-master').length >= 6 + 4 + 2, 'Caratteristiche, Prove Salvezza, PV, AR…');
  // la riga «Correzione del master +10 (motivo)» sotto i PV, per tutti
  assert.match(giocatore.classe('riquadro-pv')[0].textContent, /Correzione del master \+10 \(dono del patrono\)/);
  // una riga annullata resta, barrata, senza «Annulla»
  const annullata = { ...p, creazione: { ...p.creazione, correzioniMaster: annullaCorrezione(p.creazione.correzioniMaster, p.creazione.correzioniMaster[0].id) } };
  const r = resa(contesto(annullata, { master: true }));
  assert.equal(r.classe('btn-annulla-master').length, 1);
  assert.match(r.classe('registro-master')[0].textContent, /annullata il/);
});

test('in modalità master ogni tab ha i suoi ✎; toccarne uno apre la finestrella con valore attuale e calcolato', () => {
  const p = con(pg(), piuDieciPv());
  for (const attiva of ['identita', 'abilita', 'combattimento', 'cibernetica']) {
    assert.ok(resa(contesto(p, { attiva, master: true })).classe('btn-tocco-master').length > 0, attiva);
    assert.equal(resa(contesto(p, { attiva })).classe('btn-tocco-master').length, 0, `${attiva}: niente fuori dalla modalità master`);
  }
  assert.equal(resa(contesto(p, { attiva: 'abilita', master: true })).classe('btn-tocco-master').length >= 24, true, 'un ✎ per Abilità');
  const ctx = contesto(p, { master: true });
  const pv = resa(ctx).classe('riquadro-pv')[0].querySelectorAll('.btn-tocco-master')[0];
  clic(pv);
  const finestra = document.body.querySelectorAll('.finestrella-master').at(-1);
  assert.ok(finestra?.open);
  const base = scheda(pg()).pv;
  assert.match(finestra.textContent, /Modifica master: Punti Vita massimi/);
  assert.deepEqual(finestra.querySelectorAll('.valori-master')[0].children.map((n) => n.textContent), [String(base + 10), String(base)], 'valore attuale e valore calcolato');
  assert.match(finestra.textContent, /Valore attuale: /);
  assert.match(finestra.textContent, /calcolato dalle regole: /);
  assert.match(finestra.textContent, /Aggiungi \/ togli/);
  assert.match(finestra.textContent, /Imposta a/);
  assert.match(finestra.textContent, /Motivo \(facoltativo\)/);
  // +1 e «Conferma»: la correzione parte con chiave, tipo e numero
  const tasti = finestra.tutti().filter((n) => n.tagName === 'BUTTON');
  clic(tasti.find((b) => b.textContent === '+1'));
  clic(finestra.tutti().filter((n) => n.tagName === 'BUTTON').find((b) => b.textContent === 'Conferma'));
  const ultima = ctx.chiamate.at(-1);
  assert.equal(ultima[0], 'master.correggi');
  assert.deepEqual({ chiave: ultima[1].chiave, tipo: ultima[1].tipo, numero: ultima[1].numero }, { chiave: 'pv', tipo: 'aggiungi', numero: 1 });
});

test('S1: il tasto MUTANT con il server si vede solo sul PC del master; sui tablet non compare; senza server resta', () => {
  assert.equal(mostraMarchio({ server: true, daQuestoPc: true }), true);
  assert.equal(mostraMarchio({ server: true, daQuestoPc: false }), false, 'tablet di un giocatore');
  assert.equal(mostraMarchio({ server: false, daQuestoPc: false }), true, 'app senza server: com’è sempre stata');
  const p = pg();
  assert.equal(resa(contesto(p, { marchio: false })).classe('marchio').length, 0, 'scheda sul tablet: niente MUTANT');
  assert.equal(resa(contesto(p, { marchio: true })).classe('marchio').length, 1);
  // anche nelle altre pagine (Tavolo, mappa, testata): una regola sola del foglio di stile
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.senza-marchio \.marchio \{ display: none !important; \}/);
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /classList\.toggle\('senza-marchio', !mostraMarchio\(\{ server: stato\.cartella, daQuestoPc: stato\.master \}\)\)/);
});

// ---------------------------------------------------------------------------
// S11: bonus di circostanza dal master

test('bonus «dal master»: entra nei valori del PG, il giocatore lo vede e non lo può togliere; lo toglie il master', () => {
  const p = pg();
  const tutte = dati.regole.circostanza.categorie.map((c) => c.id);
  const blocchi = conCircostanzaMandata({ correzioni: [], circostanze: [] }, { valore: 2, categorie: tutte, nota: 'terreno favorevole' });
  const conBonus = { ...p, creazione: { ...p.creazione, circostanzeMaster: blocchi.circostanze, correzioniMaster: blocchi.correzioni } };
  // nel registro
  assert.match(registro(blocchi.correzioni)[0].cosa, /Bonus di circostanza \+2 \(terreno favorevole\)/);
  // nei valori al tavolo: +2 alle Abilità, con la provenienza «dal master»
  const sessione = allineaSessione(p.sessione, massimiSessione(scheda(p), p.creazione, dati));
  const va = (x) => calcolaScheda({ creazione: x.creazione, livelli: x.livelli, sessione }, dati).abilita.find((a) => a.nome === 'Atletica');
  assert.equal(va(conBonus).effettivo, va(p).effettivo + 2);
  assert.ok(va(conBonus).scomposizione.some((x) => /dal master: terreno favorevole/.test(x.etichetta)));
  // la sessione salvata del giocatore non cambia: il bonus non è fra i suoi
  assert.equal(sessioneConCircostanzeMaster(sessione, []), sessione);
  assert.equal((sessione.circostanze ?? []).length, 0);
  // sulla scheda del giocatore: «dal master», senza «Togli»
  const giocatore = resa(contesto(conBonus, { attiva: 'combattimento' }));
  const riga = giocatore.classe('dal-master')[0];
  assert.match(riga.textContent, /dal master/);
  assert.match(riga.textContent, /terreno favorevole/);
  assert.equal(riga.tutti().filter((n) => n.tagName === 'BUTTON').length, 0, 'il giocatore non lo toglie');
  assert.equal(riga.tutti().filter((n) => n.tagName === 'INPUT').length, 0, 'né lo cambia');
  // anche nelle «Condizioni attive» della tab Abilità
  assert.match(resa(contesto(conBonus, { attiva: 'abilita' })).classe('colonna-condizioni')[0].textContent, /dal master/);
  // in modalità master c'è «Togli»
  const ctx = contesto(conBonus, { attiva: 'combattimento', master: true });
  const togli = resa(ctx).classe('dal-master')[0].tutti().filter((n) => n.tagName === 'BUTTON');
  assert.deepEqual(togli.map((b) => b.textContent), ['Togli']);
  clic(togli[0]);
  assert.deepEqual(ctx.chiamate.at(-1), ['master.togliCircostanza', blocchi.circostanze[0].id]);
  // tolto dal master: sparisce dai valori, la riga del registro resta annullata
  const senza = senzaCircostanza(blocchi, blocchi.circostanze[0].id);
  assert.deepEqual([senza.circostanze.length, senza.correzioni[0].stato], [0, 'annullata']);
  // i bonus che il giocatore si mette da solo restano com'erano
  const sua = { ...sessione, circostanze: [{ id: 'c1', valore: 1, categorie: tutte }] };
  assert.deepEqual(sessioneConCircostanzeMaster(sua, blocchi.circostanze).circostanze.map((x) => [x.id.startsWith('m-'), !!x.daMaster]), [[false, false], [true, true]]);
});

test('bonus «solo per questo scontro»: a «Fine scontro» si toglie da solo, gli altri restano', () => {
  const tutte = dati.regole.circostanza.categorie.map((c) => c.id);
  let b = conCircostanzaMandata({ correzioni: [], circostanze: [] }, { valore: -1, categorie: tutte, nota: 'fumo', scontro: 'scontro-1' });
  b = conCircostanzaMandata(b, { valore: 1, categorie: tutte, nota: 'benedizione' });
  assert.equal(circostanzeMasterAttive(b.circostanze).length, 2);
  // la scheda che sa qual è lo scontro aperto: fuori da quello scontro il bonus non conta già più
  assert.deepEqual(circostanzeMasterAttive(b.circostanze, { scontroAperto: 'scontro-1' }).map((x) => x.nota), ['fumo', 'benedizione']);
  assert.deepEqual(circostanzeMasterAttive(b.circostanze, { scontroAperto: null }).map((x) => x.nota), ['benedizione']);
  // «Fine scontro»: la plancia lo toglie dal file
  const dopo = senzaCircostanzeDelloScontro(b, 'scontro-1');
  assert.deepEqual(dopo.circostanze.map((x) => x.nota), ['benedizione']);
  assert.deepEqual(dopo.correzioni.map((x) => x.stato), ['annullata', 'attiva']);
  assert.deepEqual(scadutiAFineScontro(b.circostanze, 'scontro-1').tolti, 1);
  assert.deepEqual(senzaCircostanzeDelloScontro(b, 'altro-scontro'), b, 'un altro scontro non tocca nulla');
  // sul testo del file (quello che fa la plancia)
  const p = pg();
  const testo = serializza({ ...p.creazione, circostanzeMaster: b.circostanze, correzioniMaster: b.correzioni }, { livelli: p.livelli, sessione: p.sessione });
  const nuovo = testoConBlocchiMaster(testo, (x) => senzaCircostanzeDelloScontro(x, 'scontro-1'));
  assert.deepEqual(JSON.parse(nuovo).circostanze_master.map((x) => x.nota), ['benedizione']);
  assert.deepEqual(JSON.parse(nuovo).scelte, JSON.parse(testo).scelte, 'il resto del file non cambia');
  assert.equal(testoConBlocchiMaster(nuovo, (x) => senzaCircostanzeDelloScontro(x, 'scontro-1')), null, 'niente da togliere: nessuna scrittura');
  // la carta della plancia mostra i bonus mandati
  assert.deepEqual(vistaPlancia(testo, dati, 'Torvald-Krane_liv6_2026-10-02.json').circostanzeMaster.map((x) => x.nota), ['fumo', 'benedizione']);
});

// ---------------------------------------------------------------------------
// S33: Compra gratis

test('«gratis (dato dal DdG)» in Compra: solo in modalità master; l’oggetto entra senza scalare i crediti e va nel registro', () => {
  const p = pg();
  const scelto = { tipo: 'arma_ravvicinata', catalogo: 'Commerciale', famiglia: null, rif: 'armi:coltello', cerca: '' };
  // il giocatore non ha la casella
  const giocatore = contesto(p, { attiva: 'inventario' });
  giocatore.ui.equip = { ...scelto, famiglia: 'Coltelli e pugnali', pers: { nome: '', tipo: 'altro', abilita: '', danno: '', ar: '', potenza: '', energia: '', capacita: '', peso: '' } };
  assert.equal(resa(giocatore).classe('casella-gratis').length, 0);
  // il master sì; spuntata, «Compra» diventa «Compra gratis (dato dal DdG)» e non passa da «compra» (che scala i crediti)
  const ctx = contesto(p, { attiva: 'inventario', master: true });
  ctx.ui.equip = { ...giocatore.ui.equip };
  let r = resa(ctx);
  assert.equal(r.classe('casella-gratis').length, 1);
  assert.equal(r.classe('btn-gratis').length, 0, 'senza la spunta «Compra» è quello di sempre');
  ctx.ui.equip.gratis = true;
  r = resa(ctx);
  const gratis = r.classe('btn-gratis');
  assert.equal(gratis.length, 1);
  assert.match(gratis[0].textContent, /Compra gratis \(dato dal DdG\)/);
  clic(gratis[0]);
  const ultima = ctx.chiamate.at(-1);
  assert.equal(ultima[0], 'master.gratis');
  assert.equal(ultima[1].rif, 'armi:coltello');
  assert.equal(ultima[2], 'Coltello');
  assert.ok(!ctx.chiamate.some((c) => c[0] === 'compra'), 'i crediti non si toccano');
  // la riga del registro
  const riga = nuovaCorrezione({ chiave: `oggetto:${ultima[1].uid}`, etichetta: 'Coltello: gratis, dato dal DdG', tipo: 'gratis', uid: ultima[1].uid });
  assert.equal(registro([riga])[0].cosa, 'Coltello: gratis, dato dal DdG');
});

// ---------------------------------------------------------------------------
// Tablet aperti

test('tablet con dati vecchi: il suo salvataggio non cambia né cancella i blocchi del master (funzione pura)', () => {
  const master = { formato: 'mutant-personaggio', scelte: { nome: 'X' }, sessione: { pvAttuali: 20 }, correzioni_master: [piuDieciPv()] };
  const tablet = { formato: 'mutant-personaggio', scelte: { nome: 'X' }, sessione: { pvAttuali: 12 } };
  assert.equal(masterDiverso(tablet, master), true);
  const r = proteggiBlocchiMaster(tablet, master);
  assert.equal(r.ripristinato, true);
  assert.deepEqual(r.file.correzioni_master, master.correzioni_master, 'le correzioni del master restano');
  assert.equal(r.file.sessione.pvAttuali, 12, 'il resto è quello del tablet');
  // il tablet non può nemmeno aggiungerne di sue
  const furbo = { ...tablet, correzioni_master: [nuovaCorrezione({ chiave: 'pv', etichetta: 'PV', tipo: 'aggiungi', numero: 99 })] };
  assert.deepEqual(proteggiBlocchiMaster(furbo, master).file.correzioni_master, master.correzioni_master);
  assert.equal('correzioni_master' in proteggiBlocchiMaster(furbo, { ...tablet }).file, false, 'se sul disco non ce ne sono, non ne nascono');
  // dati allineati: niente da fare
  assert.deepEqual(proteggiBlocchiMaster({ ...tablet, correzioni_master: master.correzioni_master }, master), { file: { ...tablet, correzioni_master: master.correzioni_master }, ripristinato: false });
});

let server;
let base;
let serverTablet;
let baseTablet;
const cartella = mkdtempSync(join(tmpdir(), 'mutant-master-'));
const personaggi = join(cartella, 'personaggi');
const backup = join(cartella, 'backup-master');
before(async () => {
  server = creaServer({ cartella: personaggi, backupMaster: backup });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
  // lo stesso server visto da un tablet: le richieste non arrivano dal PC del master
  serverTablet = creaServer({ cartella: personaggi, backupMaster: backup, eMaster: () => false });
  await new Promise((ok) => serverTablet.listen(0, '127.0.0.1', ok));
  baseTablet = `http://127.0.0.1:${serverTablet.address().port}`;
});
after(() => { server.close(); serverTablet.close(); rmSync(cartella, { recursive: true, force: true }); });

test('server: il master è chi chiama dal PC del server; il tablet no', async () => {
  assert.equal((await (await fetch(`${base}/api/ping`)).json()).master, true);
  assert.equal((await (await fetch(`${baseTablet}/api/ping`)).json()).master, false);
});

test('server: il tablet con dati vecchi non sovrascrive la modifica del master, e la scheda la riceve', async () => {
  const p = pg();
  const file = 'Torvald-Krane_liv6_2026-10-12.json';
  const metti = (b, testo, mtime) => fetch(`${b}/api/personaggi/${file}`, { method: 'PUT', body: testo, headers: { 'Content-Type': 'application/json', ...(mtime ? { 'X-Mutant-Mtime': String(mtime) } : {}) } });
  const pgId = 'pg-0123456789abcdef01234567';
  // il tablet ha letto il file com'era
  const vecchio = serializza(p.creazione, { livelli: p.livelli, sessione: p.sessione, pg: pgId });
  // (A.187: il file di partenza lo scrive il PC del Direttore; un tablet non registra livelli senza PX)
  const primo = await (await metti(base, vecchio)).json();
  // il master dà +10 PV
  const conMaster = serializza(con(p, piuDieciPv()).creazione, { livelli: p.livelli, sessione: p.sessione, pg: pgId });
  const delMaster = await metti(base, conMaster, primo.mtime);
  assert.equal(delMaster.status, 200);
  // il tablet salva i suoi dati vecchi con la revisione di prima: rifiutato (409), la scheda rilegge
  const rifiutato = await metti(baseTablet, vecchio.replace('"formato"', '"formato"'), primo.mtime);
  assert.equal(rifiutato.status, 409);
  // anche forzando («Tieni la mia», senza revisione o con quella nuova) i +10 del master restano nel file
  const { mtime } = await delMaster.json();
  const forzato = await metti(baseTablet, vecchio, mtime);
  assert.equal(forzato.status, 200);
  assert.equal((await forzato.json()).masterRipristinato, true, 'il server lo dice: la scheda si rilegge');
  const sulDisco = JSON.parse(await (await fetch(`${baseTablet}/api/personaggi/${file}`)).text());
  assert.equal(sulDisco.correzioni_master.length, 1);
  assert.equal(sulDisco.correzioni_master[0].numero, 10);
  // e la scheda del giocatore, rileggendo, calcola i PV con i +10
  const riletto = deserializzaPersonaggio(JSON.stringify(sulDisco));
  assert.equal(scheda({ creazione: normalizza(riletto.creazione, dati).scelte, livelli: riletto.livelli }).pv, scheda(p).pv + 10);
  // nuovo giorno, nuovo nome di file: i blocchi si prendono dall'ultimo file dello stesso PG
  const domani = 'Torvald-Krane_liv6_2026-10-13.json';
  const altro = await fetch(`${baseTablet}/api/personaggi/${domani}`, { method: 'PUT', body: vecchio, headers: { 'Content-Type': 'application/json' } });
  assert.equal((await altro.json()).masterRipristinato, true);
  assert.equal(JSON.parse(await (await fetch(`${base}/api/personaggi/${domani}`)).text()).correzioni_master.length, 1);
  // il master invece può annullare: il suo salvataggio cambia il blocco
  const annullato = serializza({ ...p.creazione, correzioniMaster: annullaCorrezione(JSON.parse(conMaster).correzioni_master, JSON.parse(conMaster).correzioni_master[0].id) }, { livelli: p.livelli, sessione: p.sessione, pg: pgId });
  assert.equal((await fetch(`${base}/api/personaggi/${domani}`, { method: 'PUT', body: annullato, headers: { 'Content-Type': 'application/json' } })).status, 200);
  assert.equal(JSON.parse(await (await fetch(`${base}/api/personaggi/${domani}`)).text()).correzioni_master[0].stato, 'annullata');
});

test('server: la copia prima di una modifica di scelta si salva (solo dal PC del master), si rilegge e ruota', async () => {
  const p = pg();
  const testo = serializza(p.creazione, { livelli: p.livelli, sessione: p.sessione });
  const salva = (b, nome = 'Torvald Krane') => fetch(`${b}/api/backup-master`, { method: 'POST', body: JSON.stringify({ nome, testo }), headers: { 'Content-Type': 'application/json' } });
  assert.equal((await salva(baseTablet)).status, 403, 'un tablet non salva né legge copie');
  const r = await salva(base);
  assert.equal(r.status, 200);
  const { file } = await r.json();
  assert.match(file, /^Torvald Krane_prima_\d{8}-\d{6}\.json$/);
  assert.equal(await (await fetch(`${base}/api/backup-master/${encodeURIComponent(file)}`)).text(), testo, 'la copia è il file di prima, byte per byte');
  assert.equal((await fetch(`${baseTablet}/api/backup-master/${encodeURIComponent(file)}`)).status, 403);
  assert.equal((await fetch(`${base}/api/backup-master/..%2Fpersonaggi%2Fx.json`)).status, 400);
  // «Annulla»: dalla copia tornano le scelte di prima
  const copiaLetta = deserializzaPersonaggio(await (await fetch(`${base}/api/backup-master/${encodeURIComponent(file)}`)).text());
  const cambiato = copia(p);
  cambiato.livelli[1] = { ...cambiato.livelli[1], talentoLibero: null };
  assert.deepEqual(ripristinaScelte({ creazione: cambiato.creazione, livelli: cambiato.livelli }, { creazione: normalizza(copiaLetta.creazione, dati).scelte, livelli: copiaLetta.livelli }).livelli, p.livelli);
  // rotazione: restano le 40 più recenti
  for (let i = 0; i < 45; i++) writeFileSync(join(backup, `Vecchio_prima_20260101-0000${String(i).padStart(2, '0')}.json`), testo);
  const ultimo = await (await salva(base, 'Nuovo')).json();
  const rimaste = readdirSync(backup).filter((f) => f.endsWith('.json'));
  assert.equal(rimaste.length, 40);
  assert.ok(rimaste.includes(ultimo.file), 'la copia appena fatta resta');
  // un file che non è un personaggio non si salva
  assert.equal((await fetch(`${base}/api/backup-master`, { method: 'POST', body: JSON.stringify({ nome: 'x', testo: '{"a":1}' }), headers: { 'Content-Type': 'application/json' } })).status, 400);
});

// ---------------------------------------------------------------------------
// Nessun valore cambiato sui PG senza correzioni

test('PG senza correzioni: nessun valore cambia, il file esportato è identico, la stampa pure', () => {
  for (const f of ESEMPI) {
    const testo = testoDi(f);
    const file = JSON.parse(testo);
    assert.equal('correzioni_master' in file, false);
    const p = pg(f);
    assert.deepEqual(p.creazione.correzioniMaster, []);
    // il file riesportato non ha blocchi del master né chiavi nuove fra le scelte
    const ri = JSON.parse(serializza(p.creazione, { versioniDati: file.versioni_dati, livelli: p.livelli, sessione: p.sessione }));
    assert.equal('correzioni_master' in ri, false, f);
    assert.equal('circostanze_master' in ri, false, f);
    assert.ok(!('correzioniMaster' in ri.scelte) && !('circostanzeMaster' in ri.scelte), f);
    // la scheda senza il campo (come prima di oggi) e con il campo vuoto è la stessa, valore per valore
    const { correzioniMaster: _a, circostanzeMaster: _b, ...comePrima } = p.creazione;
    const a = calcolaScheda({ creazione: comePrima, livelli: p.livelli }, dati);
    const b = scheda(p);
    assert.equal(JSON.stringify(b), JSON.stringify(a), f);
    assert.ok(!JSON.stringify(b).includes('Correzione del master') && !('correzioniMaster' in b) && !('correzioniMaster' in b.equipaggiamento), f);
    // una correzione annullata non lascia tracce nei valori
    const annullata = annullaCorrezione(aggiungiCorrezione([], piuDieciPv()), aggiungiCorrezione([], piuDieciPv())[0]?.id ?? '');
    const riga = piuDieciPv();
    const c = scheda({ ...p, creazione: { ...p.creazione, correzioniMaster: annullaCorrezione([riga], riga.id) } });
    assert.equal(JSON.stringify({ ...c, equipaggiamento: { ...c.equipaggiamento, correzioniMaster: undefined } }), JSON.stringify(a), f);
    assert.ok(Array.isArray(annullata));
    // la stampa
    assert.equal(JSON.stringify(preparaStampa({ creazione: p.creazione, livelli: p.livelli }, dati).fogli), JSON.stringify(preparaStampa({ creazione: comePrima, livelli: p.livelli }, dati).fogli), f);
  }
});
