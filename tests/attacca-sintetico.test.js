// «Attacca!» più sintetico (13/10/2026, S17, S20, S21: richiesta di Davide approvata da Marcello): un attacco normale in
// uno o due tocchi, senza perdere nessuna opzione. Nessuna regola cambia: i VA e i danni sono quelli di src/attacco.js
// (tests/attacco*.test.js restano com'erano); qui la presentazione, con il DOM finto, e le funzioni pure della sintesi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { installaDomFinto } from './dom-finto.js';
import { datiReali } from './helpers.js';
import { preparaTab } from '../src/stampa.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, allineaSessione, penalitaSessione } from '../src/sessione.js';
import { calcolaAttaccoDistanza, calcolaAttaccoRavvicinato, dichiarazioneDistanza, dichiarazioneRavvicinato, fasciaDistanza } from '../src/attacco.js';
import { conLineaDallaMappa } from '../src/dalla-mappa.js';
import { armiDelPannello, fasceDistanza, fasciaDi, mirato, vociAttive, vociAttiveConMappa, sceltePerScontro, conScontro, attaccoSemplice } from '../src/attacco-sintesi.js';
import { attaccanteDa, armaDaAttacco, attacchiDi } from '../src/nemico-attacco.js';
import { nuovoScontro, aggiungiNemici } from '../src/scontro.js';

installaDomFinto();
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.sessionStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { pannelloAttacco } = await import('../src/ui/attacco.js');
const { tabFissi } = await import('../src/ui/tab.js');
const { dati } = await datiReali();
const cartella = new URL('../esempi/', import.meta.url);
const TORVALD = readdirSync(cartella).find((f) => f.startsWith('Torvald'));

/** Il PG d'esempio con queste sole armi in mano; ctx come quello della scheda a tab, con «ricordaAttacco» che ricorda. */
function contesto(armi, { attacchi = {}, scontro = null, luce = null } = {}) {
  const p = deserializzaPersonaggio(readFileSync(new URL(TORVALD, cartella), 'utf8'));
  const creazione = normalizza({ ...p.creazione, equipaggiamento: armi.map((rif, i) => ({ uid: `arma-${i + 1}`, rif, stato: 'impugnata', quantita: 1, note: '' })) }, dati).scelte;
  const riposo = preparaTab({ creazione, livelli: p.livelli }, dati);
  const massimi = massimiSessione(riposo.scheda, creazione, dati);
  const ctx = { dati, scelte: creazione, livelli: p.livelli, massimi, ui: {}, chiamate: [], roundScontro: scontro ? { id: scontro, nome: 'Scontro' } : null, partecipanti: [] };
  ctx.sessione = { ...allineaSessione(p.sessione, massimi), attacchi, ...(luce ? { luce } : {}) };
  const ricalcola = () => {
    ctx.tab = preparaTab({ creazione, livelli: p.livelli }, dati, { sessione: ctx.sessione });
    ctx.tab.tab = tabFissi(ctx.tab.tab);
    ctx.penalita = penalitaSessione(ctx.sessione, dati);
  };
  ricalcola();
  ctx.azioni = new Proxy({
    ricordaAttacco: (uid, d) => { ctx.chiamate.push(['ricordaAttacco', uid, d]); ctx.sessione = { ...ctx.sessione, attacchi: { ...ctx.sessione.attacchi, [uid]: d } }; ricalcola(); },
    imposta: (campo, valore) => { ctx.chiamate.push(['imposta', campo, valore]); ctx.sessione = { ...ctx.sessione, [campo]: valore }; ricalcola(); },
    spara: (uid, n) => { ctx.chiamate.push(['spara', uid, n]); },
    ridisegna: () => { ctx.chiamate.push(['ridisegna']); },
  }, { get: (t, nome) => (nome in t ? t[nome] : undefined) });
  return ctx;
}
const arma = (ctx, n = 1) => ctx.tab.scheda.equipaggiamento.armi.find((a) => a.uid === `arma-${n}`);
function pannello(ctx, n = 1) {
  ctx.ui.attacco ??= { uid: `arma-${n}`, passo: 0 };
  const radice = document.createElement('div');
  radice.append(pannelloAttacco(ctx, arma(ctx, n)));
  const tutti = radice.tutti();
  return { radice, tutti, classe: (c) => radice.querySelectorAll(`.${c}`), bottoni: () => tutti.filter((x) => x.tagName === 'BUTTON'), sezione: (nome) => tutti.find((x) => x.tagName === 'SECTION' && x.getAttribute('aria-label') === nome) ?? null };
}
const clic = (nodo) => (nodo.ascolti.click ?? []).forEach((f) => f({ preventDefault() {}, stopPropagation() {}, target: nodo, currentTarget: null }));
const testi = (nodi) => nodi.map((b) => b.children.length ? b.children[0].textContent : b.textContent);
const PISTOLA = 'armi_distanza:pistola-semiautomatica';
const FUCILE = 'armi_distanza:fucile-d-assalto';
const SPADA = 'armi:spada-lunga';
const SPADONE = 'armi:spadone';

// ---------------------------------------------------------------------------
// Struttura e attacco semplice

test('struttura: dall’alto Arma, Modalità, Distanza, Risultato, poi «Altro ▾» chiuso', () => {
  const p = pannello(contesto([PISTOLA]));
  const sezioni = p.classe('sintesi-sezione').map((s) => s.getAttribute('aria-label'));
  assert.deepEqual(sezioni, ['Arma', 'Modalità', 'Distanza', 'Risultato']);
  const altro = p.classe('attacco-altro')[0];
  assert.ok(altro && !altro.open, '«Altro» c’è ed è chiuso');
  assert.ok(p.tutti.indexOf(altro) > p.tutti.indexOf(p.sezione('Risultato')), '«Altro» sta sotto il Risultato');
  assert.equal(altro.querySelectorAll('.attacco-passo').length, 0, 'chiuso: niente del resto in vista');
  assert.equal(p.classe('voci-attive').length, 0, 'nessuna voce attiva: nessuna riga');
  // il corpo a corpo non ha la Distanza a pulsanti (la portata sta in «Altro»)
  assert.deepEqual(pannello(contesto([SPADA])).classe('sintesi-sezione').map((s) => s.getAttribute('aria-label')), ['Arma', 'Modalità', 'Risultato']);
});

test('attacco semplice: dopo l’apertura basta un tocco («Spara» o «Attacca»), con gli stessi VA e danni del motore', () => {
  // a distanza
  const ctx = contesto([PISTOLA]);
  const p = pannello(ctx);
  const r = calcolaAttaccoDistanza({ scheda: ctx.tab.scheda, sessione: ctx.sessione }, arma(ctx), dichiarazioneDistanza({}), dati);
  const ris = p.sezione('Risultato');
  assert.equal(ris.querySelectorAll('.pillola-attacco')[0].textContent, String(r.va_finale), 'VA finale in evidenza');
  assert.equal(ris.querySelectorAll('.danno-valore')[0].textContent, r.danno_per_colpo, 'danno in evidenza');
  const spara = ris.tutti().filter((b) => b.tagName === 'BUTTON' && /^Spara/.test(b.textContent));
  assert.equal(spara.length, 1);
  clic(spara[0]);
  assert.deepEqual(ctx.chiamate.at(-1), ['spara', 'arma-1', r.munizioni], 'un tocco: lo sparo parte');
  assert.equal(attaccoSemplice('distanza', dichiarazioneDistanza({})), true);
  // corpo a corpo
  const cm = contesto([SPADA]);
  const pm = pannello(cm);
  const rm = calcolaAttaccoRavvicinato({ scheda: cm.tab.scheda, sessione: cm.sessione }, arma(cm), dichiarazioneRavvicinato({}), dati);
  const rism = pm.sezione('Risultato');
  assert.equal(rism.querySelectorAll('.pillola-attacco')[0].textContent, String(rm.va_finale));
  assert.equal(rism.querySelectorAll('.danno-valore')[0].textContent, rm.danno.testo);
  const attacca = rism.tutti().filter((b) => b.tagName === 'BUTTON' && b.textContent === 'Attacca');
  assert.equal(attacca.length, 1);
  clic(attacca[0]);
  assert.equal(cm.chiamate.at(-1)[0], 'ricordaAttacco');
  assert.equal(cm.chiamate.at(-1)[2].ultima.manovra, 'normale');
});

test('risultato: il conto del VA è a un tocco («Calcolo»), con le righe della provenienza', () => {
  const ctx = contesto([PISTOLA], { attacchi: { 'arma-1': { distanza: 20 } } });
  const p = pannello(ctx);
  assert.equal(p.sezione('Risultato').querySelectorAll('.tooltip-provenienza').length, 0, 'il conto non occupa il pannello');
  const calcolo = p.sezione('Risultato').querySelectorAll('.btn-calcolo');
  assert.equal(calcolo.length, 1);
  clic(calcolo[0]);
  const finestra = document.body.querySelectorAll('.finestrella-calcolo').at(-1);
  assert.ok(finestra?.open);
  const r = calcolaAttaccoDistanza({ scheda: ctx.tab.scheda, sessione: ctx.sessione }, arma(ctx), dichiarazioneDistanza({ distanza: 20 }), dati);
  for (const x of r.provenienza.righe) assert.ok(finestra.textContent.includes(x.fonte), `riga del conto: ${x.fonte}`);
  assert.match(finestra.textContent, /Distanza 20 Q/);
  finestra.remove();
});

// ---------------------------------------------------------------------------
// S17: l'arma

test('arma: quella impugnata è già scelta, con la mano; un tocco su un’altra la cambia', () => {
  const ctx = contesto([PISTOLA, SPADA]);
  const p = pannello(ctx);
  const armi = p.sezione('Arma').tutti().filter((b) => b.tagName === 'BUTTON');
  assert.deepEqual(armi.map((b) => b.textContent).slice(0, 2), ['Mano destra: Pistola semiautomatica', 'Mano sinistra: Spada lunga']);
  assert.deepEqual(armi.map((b) => b.getAttribute('aria-pressed')).slice(0, 2), ['true', 'false']);
  clic(armi[1]);
  assert.equal(ctx.ui.attacco.uid, 'arma-2', 'il pannello passa all’altra arma');
  assert.deepEqual(ctx.chiamate.at(-1), ['ridisegna']);
  // un'arma a due mani: «Due mani»
  const due = contesto([SPADONE]);
  assert.equal(pannello(due).sezione('Arma').tutti().filter((b) => b.tagName === 'BUTTON')[0].textContent, 'Due mani: Spadone');
  assert.deepEqual(armiDelPannello(due.tab.scheda.equipaggiamento.armi, due.scelte.equipaggiamento).map((x) => [x.mano, x.etichetta]), [['due', 'Due mani: Spadone']]);
  // la mano registrata sulla voce vale (A.60)
  const scambiate = armiDelPannello(ctx.tab.scheda.equipaggiamento.armi, ctx.scelte.equipaggiamento.map((v) => (v.uid === 'arma-1' ? { ...v, mano: 'sinistra' } : v)));
  assert.deepEqual(scambiate.map((x) => x.mano), ['sinistra', 'destra']);
});

// ---------------------------------------------------------------------------
// S20: modalità a pulsanti e Mirato

test('modalità a pulsanti affiancati: quelle dell’arma, come prima, più «Tiro Mirato» nella stessa fila', () => {
  const ctx = contesto([FUCILE]);
  const p = pannello(ctx);
  const sezione = p.sezione('Modalità');
  assert.equal(sezione.tutti().filter((x) => x.tagName === 'SELECT').length, 0, 'niente menu a tendina');
  const MF = dati.regole.modalita_di_fuoco;
  const attese = arma(ctx).modalita.filter((x) => x !== 'TM' && MF[x]).map((x) => MF[x].nome);
  const bottoni = sezione.tutti().filter((b) => b.tagName === 'BUTTON' && b.className.includes('scelta-btn'));
  assert.deepEqual(testi(bottoni), [...attese, 'Tiro Mirato']);
  assert.equal(bottoni[0].getAttribute('aria-pressed'), 'true', 'Tiro Singolo di partenza');
  // una modalità: un tocco
  clic(bottoni[1]);
  assert.equal(ctx.sessione.attacchi['arma-1'].modalita, arma(ctx).modalita.filter((x) => x !== 'TM' && MF[x])[1]);
});

test('Mirato: «Tiro Mirato» per le armi a distanza, «Colpo Mirato» per le ravvicinate; modificatori dei dati, gli stessi di prima', () => {
  const D = dati.regole.attacco_distanza.manovre.mirato;
  const C = dati.regole.attacco_ravvicinato.manovre.mirato;
  assert.deepEqual(mirato({ tipo: 'arma_distanza' }, dati), { id: 'mirato', nome: 'Tiro Mirato', va: D.va, danno: D.danno, azioni: D.azioni_principali, paragrafo: 'Giocatore §5.10', tipo: 'interruttore' });
  assert.deepEqual(mirato({ tipo: 'arma_ravvicinata' }, dati), { id: 'mirato', nome: 'Colpo Mirato', va: C.va, danno: C.danno, azioni: C.azioni_principali, paragrafo: 'Giocatore §5.12', tipo: 'manovra' });
  // a distanza: il pulsante accende lo stesso «mirato» di prima; il VA sale di quanto dicono i dati
  const ctx = contesto([PISTOLA]);
  const base = calcolaAttaccoDistanza({ scheda: ctx.tab.scheda, sessione: ctx.sessione }, arma(ctx), dichiarazioneDistanza({}), dati);
  const tm = pannello(ctx).sezione('Modalità').tutti().find((b) => b.tagName === 'BUTTON' && testi([b])[0] === 'Tiro Mirato');
  assert.equal(tm.getAttribute('aria-pressed'), 'false');
  clic(tm);
  assert.equal(ctx.sessione.attacchi['arma-1'].mirato, true);
  const dopo = pannello(ctx);
  const conMirato = calcolaAttaccoDistanza({ scheda: ctx.tab.scheda, sessione: ctx.sessione }, arma(ctx), dichiarazioneDistanza({ mirato: true }), dati);
  assert.equal(conMirato.va_finale, base.va_finale + D.va, '+2 VA come nei dati');
  assert.equal(dopo.sezione('Risultato').querySelectorAll('.pillola-attacco')[0].textContent, String(conMirato.va_finale));
  assert.equal(dopo.sezione('Risultato').querySelectorAll('.danno-valore')[0].textContent, conMirato.danno_per_colpo);
  assert.notEqual(conMirato.danno_per_colpo, base.danno_per_colpo, 'e +2 danni');
  // corpo a corpo: «Colpo Mirato» richiama la Manovra «mirato» (non ne nasce un'altra)
  const cm = contesto([SPADA]);
  const baseM = calcolaAttaccoRavvicinato({ scheda: cm.tab.scheda, sessione: cm.sessione }, arma(cm), dichiarazioneRavvicinato({}), dati);
  const bottoni = pannello(cm).sezione('Modalità').tutti().filter((b) => b.tagName === 'BUTTON' && b.className.includes('scelta-btn'));
  assert.deepEqual(testi(bottoni), [dati.regole.attacco_ravvicinato.manovre.normale.nome, 'Colpo Mirato']);
  clic(bottoni[1]);
  assert.equal(cm.sessione.attacchi['arma-1'].manovra, 'mirato');
  const conColpo = calcolaAttaccoRavvicinato({ scheda: cm.tab.scheda, sessione: cm.sessione }, arma(cm), dichiarazioneRavvicinato({ manovra: 'mirato' }), dati);
  assert.equal(conColpo.va_finale, baseM.va_finale + C.va);
  assert.equal(conColpo.azioni_principali, C.azioni_principali);
  const dopoM = pannello(cm);
  assert.equal(dopoM.sezione('Risultato').querySelectorAll('.pillola-attacco')[0].textContent, String(conColpo.va_finale));
  // in «Altro» la Manovra «mirato» non è ripetuta
  cm.ui.attacco.altro = true;
  const manovre = pannello(cm).tutti.find((x) => x.getAttribute('aria-label') === 'Manovra');
  assert.ok(manovre, 'le altre Manovre sono in «Altro»');
  assert.ok(!testi(manovre.tutti().filter((b) => b.tagName === 'BUTTON' && b.className.includes('scelta-btn'))).some((t) => t === 'Colpo Mirato' || t === dati.regole.attacco_ravvicinato.manovre.normale.nome));
});

test('modalità non ammessa: resta visibile e toccabile, con ⚠ («procedi comunque»)', () => {
  // Tiro Mirato in Corsa non è ammesso dalla regola: il pulsante resta, segnato
  const ctx = contesto([PISTOLA], { attacchi: { 'arma-1': { movimento: 'corsa' } } });
  const tm = pannello(ctx).sezione('Modalità').tutti().find((b) => b.tagName === 'BUTTON' && testi([b])[0] === 'Tiro Mirato');
  assert.ok(tm.className.includes('con-avviso'), 'segnato ⚠');
  assert.ok(tm.getAttribute('title'), 'con il motivo');
  assert.notEqual(tm.disabled, true, 'non è disabilitato');
  clic(tm);
  assert.equal(ctx.sessione.attacchi['arma-1'].mirato, true, 'si può scegliere lo stesso');
});

// ---------------------------------------------------------------------------
// S21: distanza

test('distanza a pulsanti: le fasce dei dati fino alla gittata dell’arma, con i Q e la penalità', () => {
  const F = dati.regole.attacco_distanza.distanza.fasce;
  const pistola = fasceDistanza({ gittataQ: 30 }, dati);
  assert.deepEqual(pistola.map((f) => [f.etichetta, f.va, f.q]), [['1–10 Q', F[0].va, 10], ['11–20 Q', F[1].va, 20], ['21–30 Q', F[2].va, 30]], 'l’ultima fascia si ferma alla gittata');
  assert.deepEqual(fasceDistanza({ gittataQ: 160 }, dati).map((f) => f.q), [10, 20, 40, 80, 160]);
  assert.equal(fasceDistanza({}, dati).length, F.length, 'senza gittata nota: tutte le fasce dei dati');
  // ogni pulsante dà la penalità che il motore calcola per quella distanza
  for (const f of fasceDistanza({ gittataQ: 1500 }, dati)) {
    assert.equal(fasciaDistanza(f.q, dati).va, f.va, f.etichetta);
    assert.equal(fasciaDistanza(f.da, dati).va, f.va, `${f.etichetta}: stessa penalità in tutta la fascia`);
  }
  assert.equal(fasciaDi(15, pistola).q, 20);
  assert.equal(fasciaDi(99, pistola), null);
  // nel pannello
  const ctx = contesto([PISTOLA]);
  const p = pannello(ctx);
  const bottoni = p.sezione('Distanza').tutti().filter((b) => b.tagName === 'BUTTON');
  assert.deepEqual(testi(bottoni), fasceDistanza(arma(ctx), dati).map((f) => f.etichetta));
  assert.equal(bottoni[0].getAttribute('aria-pressed'), 'true', 'la prima fascia di partenza (10 Q)');
  assert.equal(p.sezione('Distanza').tutti().filter((x) => x.tagName === 'INPUT').length, 0, 'il campo della distanza esatta sta in «Altro»');
  clic(bottoni[1]);
  assert.equal(ctx.sessione.attacchi['arma-1'].distanza, 20);
  const r = calcolaAttaccoDistanza({ scheda: ctx.tab.scheda, sessione: ctx.sessione }, arma(ctx), dichiarazioneDistanza({ distanza: 20 }), dati);
  assert.equal(pannello(ctx).sezione('Risultato').querySelectorAll('.pillola-attacco')[0].textContent, String(r.va_finale));
});

test('distanza dalla mappa: al posto dei pulsanti «Dalla mappa: 8 Q ✕»; un tocco la toglie e tornano i pulsanti', () => {
  const ctx = contesto([PISTOLA], { attacchi: { 'arma-1': conLineaDallaMappa({}, { distanza: 8, copertura: 'leggera' }) } });
  let p = pannello(ctx);
  const sezione = p.sezione('Distanza');
  assert.equal(sezione.querySelectorAll('.scelta-btn').length, 0, 'niente pulsanti delle fasce');
  const riga = sezione.querySelectorAll('.dalla-mappa')[0];
  assert.match(riga.textContent, /Dalla mappa: 8 Q ✕/);
  // il VA è quello della distanza della mappa
  const r = calcolaAttaccoDistanza({ scheda: ctx.tab.scheda, sessione: ctx.sessione }, arma(ctx), dichiarazioneDistanza({ distanza: 8, bersaglio: { copertura: 'leggera' } }), dati);
  assert.equal(p.sezione('Risultato').querySelectorAll('.pillola-attacco')[0].textContent, String(r.va_finale));
  // la Copertura arrivata dalla mappa è fra le voci attive, segnata
  const attive = p.classe('voce-attiva').map((b) => b.textContent);
  assert.deepEqual(attive, ['Copertura leggera (dalla mappa) ✕']);
  // ✕ sulla distanza: tornano i pulsanti
  clic(riga.tutti().find((b) => b.tagName === 'BUTTON'));
  p = pannello(ctx);
  assert.equal(p.sezione('Distanza').querySelectorAll('.dalla-mappa').length, 0);
  assert.ok(p.sezione('Distanza').querySelectorAll('.scelta-btn').length >= 3, 'tornano le fasce');
  assert.equal(dichiarazioneDistanza(ctx.sessione.attacchi['arma-1']).distanza, 10, 'la distanza torna al valore a mano di partenza');
  assert.deepEqual(p.classe('voce-attiva').map((b) => b.textContent), ['Copertura leggera (dalla mappa) ✕'], 'la Copertura resta finché non la si toglie');
});

// ---------------------------------------------------------------------------
// «Altro»

test('«Altro»: le voci attive sono riassunte sopra, ognuna con ✕ che la toglie', () => {
  const scelte = { movimento: 'passo', coperturaPropria: 'leggera', bersaglio: { copertura: 'media', aTerra: true, interposta: true } };
  const ctx = contesto([PISTOLA], { attacchi: { 'arma-1': scelte }, luce: 'penombra' });
  let p = pannello(ctx);
  assert.ok(!p.classe('attacco-altro')[0].open, '«Altro» resta chiuso');
  const riga = p.classe('voci-attive')[0];
  assert.ok(p.tutti.indexOf(riga) < p.tutti.indexOf(p.classe('attacco-altro')[0]), 'la riga sta sopra «Altro»');
  const nomeLuce = dati.regole.illuminazione.livelli.find((x) => x.id === 'penombra').nome;
  assert.deepEqual(p.classe('voce-attiva').map((b) => b.textContent), ['Tu: Passo ✕', 'Dalla Copertura leggera ✕', 'Creatura interposta ✕', 'Bersaglio A Terra ✕', 'Copertura media ✕', `Luce: ${nomeLuce} ✕`]);
  // ✕ sulla Copertura del bersaglio: sparisce, il resto resta, il VA cambia come nel motore
  clic(p.classe('voce-attiva').find((b) => b.textContent.startsWith('Copertura media')));
  assert.equal(ctx.sessione.attacchi['arma-1'].bersaglio.copertura, 'nessuna');
  assert.equal(ctx.sessione.attacchi['arma-1'].bersaglio.aTerra, true);
  p = pannello(ctx);
  const r = calcolaAttaccoDistanza({ scheda: ctx.tab.scheda, sessione: ctx.sessione }, arma(ctx), dichiarazioneDistanza({ ...scelte, bersaglio: { ...scelte.bersaglio, copertura: 'nessuna' } }), dati);
  assert.equal(p.sezione('Risultato').querySelectorAll('.pillola-attacco')[0].textContent, String(r.va_finale));
  // ✕ sulla luce: torna la luce di base (è della sessione)
  clic(p.classe('voce-attiva').find((b) => b.textContent.startsWith('Luce')));
  assert.deepEqual(ctx.chiamate.at(-1), ['imposta', 'luce', dati.regole.illuminazione.livelli.find((x) => x.base).id]);
  // corpo a corpo: Manovre, Carica, attaccanti, circostanza
  const d = dichiarazioneRavvicinato({ manovra: 'affondo', carica: true, percorsoQ: 5, attaccanti: 3, circostanza: -1, bersaglio: { ignaro: true } });
  assert.deepEqual(vociAttive('ravvicinato', d, { nomiManovre: { affondo: 'Affondo' } }).map((v) => v.testo), ['Carica (5 Q)', '3 attaccanti sul bersaglio', 'Circostanza −1', 'Manovra: Affondo', 'Bersaglio ignaro']);
  assert.deepEqual(vociAttive('ravvicinato', dichiarazioneRavvicinato({ manovra: 'mirato' })), [], 'Colpo Mirato è una modalità in cima, non una voce di «Altro»');
  // togliere una voce riporta la dichiarazione al valore di partenza
  for (const tipo of ['distanza', 'ravvicinato']) {
    const fn = tipo === 'distanza' ? dichiarazioneDistanza : dichiarazioneRavvicinato;
    const piena = fn(tipo === 'distanza' ? { movimento: 'corsa', evasivo: true, coperturaPropria: 'media', dueArmi: true, bersaglio: { movimento: 'scatto', evasivo: true, copertura: 'leggera', impegnato: true, interposta: true, aTerra: true, ignaro: true, tiImpegna: true }, ravvicinato: true, bruciapelo: true, imbracciata: false }
      : { movimento: 'passo', carica: true, aTerra: true, dueArmi: true, imboscata: true, opportunita: true, manovra: 'spazzata', attaccanti: 6, circostanza: 2, bersaglio: { aTerra: true, ignaro: true, copertura: 'media', coperturaMigliorata: true, distanza: 2 } });
    let attuale = piena;
    for (let giro = 0; giro < 30 && vociAttive(tipo, attuale).length; giro++) {
      const v = vociAttive(tipo, attuale)[0];
      attuale = fn({ ...attuale, ...v.togli, bersaglio: { ...attuale.bersaglio, ...(v.togli.bersaglio ?? {}) } });
    }
    assert.deepEqual(vociAttive(tipo, attuale), [], `${tipo}: tolte tutte, non resta niente`);
    assert.deepEqual({ ...attuale, percorsoQ: undefined }, { ...fn({}), percorsoQ: undefined }, `${tipo}: si torna alla dichiarazione di partenza`);
  }
});

test('«Altro» aperto: ci sono tutti i controlli di prima (nessuna opzione persa)', () => {
  // a Contatto, così ci sono anche Tiro Ravvicinato e Tiro a Bruciapelo
  const ctx = contesto([FUCILE], { attacchi: { 'arma-1': { distanza: 1 } } });
  ctx.ui.attacco = { uid: 'arma-1', passo: 0, altro: true };
  const p = pannello(ctx);
  const altro = p.classe('attacco-altro')[0];
  assert.equal(altro.open, true);
  assert.deepEqual(altro.querySelectorAll('.attacco-passo').map((s) => s.children[0].textContent), ['Il tuo movimento', 'Il bersaglio', 'Distanza esatta e mirino', 'Tiro Ravvicinato, Bruciapelo, Imbracciatura']);
  const gruppi = altro.tutti().filter((x) => x.getAttribute('role') === 'group').map((x) => x.getAttribute('aria-label'));
  for (const g of ['Movimento', 'Attacco dalla Copertura (AzM)', 'Movimento del bersaglio', 'Movimento Evasivo del bersaglio', 'Copertura del bersaglio']) assert.ok(gruppi.includes(g), `gruppo: ${g}`);
  assert.ok(gruppi.some((g) => /^Luce sul bersaglio/.test(g)), 'luce sul bersaglio');
  const interruttori = altro.tutti().filter((x) => x.getAttribute('role') === 'switch').map((x) => x.children[0].textContent);
  for (const t of ['Movimento Evasivo', 'Combatti con due armi', 'Solo la mano non dominante', 'Impegnato in Ravvicinato', 'Bersaglio A Terra', 'Creatura interposta', 'Ignaro, immobilizzato', 'Ti impegna in Ravvicinato', 'Tiro Ravvicinato', 'Tiro a Bruciapelo']) {
    assert.ok(interruttori.some((x) => x.includes(t)), `interruttore: ${t}`);
  }
  assert.ok(altro.tutti().some((x) => x.tagName === 'INPUT' && x.className.includes('input-distanza')), 'distanza esatta in Q');
  // corpo a corpo
  const cm = contesto([SPADA]);
  cm.ui.attacco = { uid: 'arma-1', passo: 0, altro: true };
  const am = pannello(cm).classe('attacco-altro')[0];
  assert.deepEqual(am.querySelectorAll('.attacco-passo').map((s) => s.children[0].textContent), ['Il tuo movimento', 'Il bersaglio', 'Manovre']);
  const im = am.tutti().filter((x) => x.getAttribute('role') === 'switch').map((x) => x.children[0].textContent);
  for (const t of ['Carica', 'Controcarica', 'Sei A Terra', 'Combatti con due armi', 'Solo la mano non dominante', 'Imboscata', 'Attacco di Opportunità', 'A Terra', 'Ignaro della tua presenza']) assert.ok(im.some((x) => x.includes(t)), `interruttore: ${t}`);
  const gm = am.tutti().filter((x) => x.getAttribute('role') === 'group').map((x) => x.getAttribute('aria-label'));
  for (const g of ['Movimento', 'Manovra', 'Circostanza del Direttore (§1.4)']) assert.ok(gm.includes(g), `gruppo: ${g}`);
  assert.ok(gm.some((g) => /^Copertura del bersaglio/.test(g)));
});

// ---------------------------------------------------------------------------
// Memoria

test('memoria: per ogni arma si ricordano modalità e distanza finché non cambia lo scontro', () => {
  // nello stesso scontro: riaprendo il pannello le scelte ci sono ancora
  const ctx = contesto([FUCILE, PISTOLA], { scontro: 's1' });
  let p = pannello(ctx);
  const MF = dati.regole.modalita_di_fuoco;
  const modi = arma(ctx).modalita.filter((x) => x !== 'TM' && MF[x]);
  const scelte = (x, nome) => x.sezione(nome).tutti().filter((b) => b.tagName === 'BUTTON' && b.className.includes('scelta-btn'));
  clic(scelte(p, 'Modalità')[1]);
  clic(scelte(pannello(ctx), 'Distanza')[2]);
  assert.deepEqual([ctx.sessione.attacchi['arma-1'].modalita, ctx.sessione.attacchi['arma-1'].distanza, ctx.sessione.attacchi['arma-1'].scontro], [modi[1], 40, 's1']);
  ctx.ui.attacco = null;
  p = pannello(ctx);
  assert.equal(scelte(p, 'Modalità')[1].getAttribute('aria-pressed'), 'true', 'la modalità è quella di prima');
  assert.equal(scelte(p, 'Distanza')[2].getAttribute('aria-pressed'), 'true', 'la distanza pure');
  // l'altra arma ha la sua memoria
  ctx.ui.attacco = null;
  assert.equal(scelte(pannello(ctx, 2), 'Distanza')[0].getAttribute('aria-pressed'), 'true');
  // cambia lo scontro: si riparte dai valori di partenza
  ctx.roundScontro = { id: 's2', nome: 'Altro scontro' };
  ctx.ui.attacco = null;
  p = pannello(ctx);
  assert.equal(scelte(p, 'Modalità')[0].getAttribute('aria-pressed'), 'true');
  assert.equal(scelte(p, 'Distanza')[0].getAttribute('aria-pressed'), 'true');
  // le funzioni pure
  const salvate = { modalita: 'RB', distanza: 40, scontro: 's1', ultima: { manovra: 'normale', nome: 'Attacco normale' } };
  assert.equal(sceltePerScontro(salvate, 's1'), salvate);
  assert.deepEqual(sceltePerScontro(salvate, 's2'), { ultima: salvate.ultima, scontro: 's2' });
  assert.deepEqual(sceltePerScontro(salvate, null), { ultima: salvate.ultima }, 'finito lo scontro');
  assert.deepEqual(sceltePerScontro({ modalita: 'RB', distanza: 40 }, null), { modalita: 'RB', distanza: 40 }, 'senza scontri la memoria resta, come prima');
  assert.deepEqual(conScontro({ modalita: 'S', scontro: 'vecchio' }, 's3'), { modalita: 'S', scontro: 's3' });
  assert.deepEqual(conScontro({ modalita: 'S', scontro: 'vecchio' }, null), { modalita: 'S' });
});

// ---------------------------------------------------------------------------
// Nemici (plancia): lo stesso pannello

test('nemico dalla plancia: lo stesso pannello sintetico, con il suo finale (tiro per colpire) al posto di «Spara»', () => {
  const nemico = JSON.parse(readFileSync(new URL('../esempi/nemici/legionario-oscuro.json', import.meta.url), 'utf8'));
  const [p] = aggiungiNemici(nuovoScontro({ id: 'scontro-sintesi', pg: [] }), nemico, 1).partecipanti;
  const attacchi = attacchiDi(p);
  assert.ok(attacchi.length > 0);
  for (const attacco of attacchi) {
    const a = armaDaAttacco(attacco, `${p.id}:${attacchi.indexOf(attacco)}`, dati);
    const chi = attaccanteDa(p, dati);
    const ctx = { dati, tab: { scheda: chi.scheda }, sessione: { ...chi.sessione, attacchi: { [a.uid]: {} } }, ui: {}, scelte: null,
      azioni: { ricordaAttacco: () => {}, ridisegna: () => {}, imposta: () => {}, finale: () => document.createElement('div') } };
    const radice = document.createElement('div');
    radice.append(pannelloAttacco(ctx, a));
    const sezioni = radice.querySelectorAll('.sintesi-sezione').map((s) => s.getAttribute('aria-label'));
    assert.deepEqual(sezioni, a.tipo === 'arma_distanza' ? ['Arma', 'Modalità', 'Distanza', 'Risultato'] : ['Arma', 'Modalità', 'Risultato'], attacco.nome);
    assert.equal(radice.querySelectorAll('.arma-pannello').length, 1, 'l’arma del nemico è quella scelta nella plancia');
    assert.equal(radice.tutti().filter((b) => b.tagName === 'BUTTON' && /^(Spara|Attacca$)/.test(b.textContent)).length, 0, 'il finale è quello della plancia');
    const r = a.tipo === 'arma_distanza' ? calcolaAttaccoDistanza(chi, a, dichiarazioneDistanza({}), dati) : calcolaAttaccoRavvicinato(chi, a, dichiarazioneRavvicinato({}), dati);
    assert.equal(radice.querySelectorAll('.pillola-attacco')[0].textContent, r.va_finale < 0 ? `−${-r.va_finale}` : String(r.va_finale), `${attacco.nome}: stesso VA del motore`);
  }
});

test('voci dalla mappa: ciò che la mappa ha compilato è segnato; la distanza ha la sua riga, non sta fra le voci', () => {
  const d = dichiarazioneDistanza(conLineaDallaMappa({}, { distanza: 8, copertura: 'media', protetto: true, interposta: true }));
  const voci = vociAttiveConMappa(vociAttive('distanza', d), [{ campo: 'distanza', testo: 'distanza 8 Q' }, { campo: 'copertura', testo: 'Copertura media' }, { campo: 'impegnato', testo: 'bersaglio protetto' }, { campo: 'interposta', testo: 'creatura interposta' }]);
  assert.deepEqual(voci.map((v) => [v.testo, !!v.mappa]), [['bersaglio protetto (dalla mappa)', true], ['creatura interposta (dalla mappa)', true], ['Copertura media (dalla mappa)', true]]);
  assert.deepEqual(vociAttiveConMappa(vociAttive('distanza', dichiarazioneDistanza({ bersaglio: { copertura: 'media' } })), []).map((v) => [v.testo, !!v.mappa]), [['Copertura media', false]]);
});
