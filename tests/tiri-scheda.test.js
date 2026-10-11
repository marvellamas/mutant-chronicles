// Dadi nell'app: si tocca il valore e si tira (13/10/2026, S9, S15, S18). Il dado dal vivo resta il modo di base; le
// regole non cambiano: gli esiti sono quelli di src/prova.js (§1.6, §1.7, A.78) e i dadi vengono dai dati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { installaDomFinto } from './dom-finto.js';
import { datiReali, copia } from './helpers.js';
import { preparaTab } from '../src/stampa.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, allineaSessione, penalitaSessione } from '../src/sessione.js';
import { esitoProva } from '../src/prova.js';
import { calcolaAttaccoDistanza, calcolaAttaccoRavvicinato, dichiarazioneDistanza, dichiarazioneRavvicinato } from '../src/attacco.js';
import { validaDati } from '../src/validate.js';
import {
  dadoProva, dadoIniziativaScheda, specDaFormula, tiroDelValore, esitoTiro, tiraValore, siTira, rigaTiro, aggiungiTiro, tiriRecenti, rigaRegistroScontro, TIRI_MAX,
} from '../src/tiri-scheda.js';

installaDomFinto();
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.sessionStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.crypto ??= { getRandomValues: (a) => { a[0] = 7; return a; } };
const { renderTab, tabFissi } = await import('../src/ui/tab.js');
const { pannelloAttacco } = await import('../src/ui/attacco.js');
const { dati } = await datiReali();
const cartella = new URL('../esempi/', import.meta.url);
const TORVALD = readdirSync(cartella).find((f) => f.startsWith('Torvald'));

function contesto({ attiva = 'abilita', armi = null, sessione: sess = null, scontro = null } = {}) {
  const p = deserializzaPersonaggio(readFileSync(new URL(TORVALD, cartella), 'utf8'));
  const creazione = normalizza(armi ? { ...p.creazione, equipaggiamento: armi.map((rif, i) => ({ uid: `arma-${i + 1}`, rif, stato: 'impugnata', quantita: 1, note: '' })) } : p.creazione, dati).scelte;
  const riposo = preparaTab({ creazione, livelli: p.livelli }, dati);
  const massimi = massimiSessione(riposo.scheda, creazione, dati);
  const ctx = { dati, scelte: creazione, livelli: p.livelli, massimi, ui: {}, chiamate: [], posizione: 'alto', larghezza: 'piena', sfondi: [], passi: { background: 0, equipaggiamento: 8 }, partecipanti: [],
    attiva, roundScontro: scontro ? { id: scontro, nome: 'Scontro' } : null, scontroPg: scontro ? { id: scontro } : null };
  ctx.sessione = { ...allineaSessione(p.sessione, massimi), ...(sess ?? {}) };
  const ricalcola = () => {
    ctx.tab = preparaTab({ creazione, livelli: p.livelli }, dati, { sessione: ctx.sessione });
    ctx.tab.tab = tabFissi(ctx.tab.tab);
    ctx.penalita = penalitaSessione(ctx.sessione, dati);
  };
  ricalcola();
  ctx.azioni = new Proxy({
    tiro: (riga, testoScontro) => { ctx.chiamate.push(['tiro', riga, testoScontro]); ctx.sessione = aggiungiTiro(ctx.sessione, riga); ricalcola(); },
    ridisegna: () => ctx.chiamate.push(['ridisegna']),
    ricordaAttacco: (uid, d) => { ctx.sessione = { ...ctx.sessione, attacchi: { ...ctx.sessione.attacchi, [uid]: d } }; ricalcola(); },
  }, { get: (t, n) => (n in t ? t[n] : undefined) });
  return ctx;
}
function resa(ctx) {
  const radice = document.createElement('div');
  radice.append(...renderTab(ctx).filter(Boolean));
  return { radice, tutti: radice.tutti(), classe: (c) => radice.querySelectorAll(`.${c}`) };
}
const clic = (nodo) => (nodo.ascolti.click ?? []).forEach((f) => f({ preventDefault() {}, stopPropagation() {}, target: nodo }));
const finestra = () => document.body.querySelectorAll('.finestrella-tiro').at(-1) ?? null;
const chiudiFinestre = () => document.body.querySelectorAll('.finestrella').forEach((d) => d.remove());
const bottone = (d, re) => d.tutti().filter((b) => b.tagName === 'BUTTON').find((b) => re.test(b.textContent));

// ---------------------------------------------------------------------------
// I dadi vengono dai dati, gli esiti dalle regole

test('i dadi vengono dai dati, non dal codice: d20 delle Prove e dado dell’Iniziativa', () => {
  assert.equal(dati.regole.prova.dado, '1d20');
  assert.equal(dadoProva(dati).formula, '1d20');
  assert.equal(dadoIniziativaScheda(dati).formula, dati.regole.iniziativa.dado_in_combattimento);
  // il validatore pretende il dado
  const d = copia(dati);
  delete d.regole.prova.dado;
  assert.ok(validaDati(d).some((e) => e.chiave === 'prova.dado'), 'senza il dado il validatore si lamenta');
  const d2 = copia(dati);
  d2.regole.prova.dado = 'un dado';
  assert.ok(validaDati(d2).some((e) => e.chiave === 'prova.dado'));
  // le formule del danno si leggono, niente dadi inventati
  assert.deepEqual([specDaFormula('1d8+2').formula, specDaFormula('2d6').formula, specDaFormula('1d10−1').formula], ['1d8+2', '2d6', '1d10−1']);
  assert.deepEqual([specDaFormula('1d8+2').minimo, specDaFormula('1d8+2').massimo], [3, 10]);
  assert.equal(specDaFormula('')?.formula, undefined);
  assert.equal(specDaFormula('dalla munizione'), null);
});

test('esiti ai limiti: 1 e 20 naturali, VA 20 e 21 (§1.6, §1.7, A.78), con lo scarto', () => {
  const t = (va, opz = {}) => tiroDelValore({ genere: 'prova', nome: 'Prova', va, ...opz }, dati);
  // 1 naturale Magistrale, 20 naturale Maldestro, sempre
  for (const va of [5, 12, 19]) {
    assert.equal(esitoTiro(t(va), 1, dati).esito, 'magistrale');
    assert.equal(esitoTiro(t(va), 20, dati).esito, 'maldestro');
  }
  // scarto: VA − dado, positivo se riesce
  assert.equal(esitoTiro(t(12), 9, dati).scarto, 3);
  assert.equal(esitoTiro(t(12), 15, dati).scarto, -3);
  assert.equal(esitoTiro(t(12), 12, dati).scarto, 0);
  assert.match(esitoTiro(t(12), 9, dati).riga, /Prova: 9 → Successo, scarto \+3/);
  // §1.6: con VA finale almeno 21 anche il 2 è Magistrale nelle Prove di Abilità
  assert.equal(dati.regole.magistrale_naturale.soglia_va, 21);
  assert.equal(esitoTiro(t(19), 2, dati).esito, 'successo', 'sotto la soglia il 2 è un successo normale');
  // con VA 21 si tira solo quando il tiro è obbligatorio (attacchi e Difese, A.78): lì il 2 è Magistrale (§1.6)
  assert.equal(esitoTiro(t(21, { tipo: 'attacco' }), 2, dati).esito, 'magistrale');
  assert.equal(esitoTiro(t(21, { tipo: 'attacco' }), 2, dati).nome, 'Successo Magistrale');
  assert.equal(esitoTiro(t(21), 2, dati).esito, 'automatico', 'senza tiro obbligatorio con VA 21 il successo è automatico');
  // §1.7: da VA 20 il successo è automatico e non si tira…
  assert.equal(dati.regole.prova.successo_automatico_da, 20);
  assert.equal(siTira(t(20), dati).si, false);
  assert.match(siTira(t(20), dati).motivo, /successo automatico/);
  assert.equal(siTira(t(19), dati).si, true);
  // …ma attacchi e Difese si tirano comunque (A.78)
  assert.equal(siTira(t(25, { tipo: 'attacco' }), dati).si, true);
  assert.equal(siTira(t(25, { tipo: 'difesa' }), dati).si, true);
  // VA 0 o meno: Prova impossibile, non si tira
  assert.equal(siTira(t(0), dati).si, false);
  assert.match(siTira(t(0), dati).motivo, /impossibile/);
  // gli esiti sono quelli del motore di sempre, non ricalcolati qui
  for (const va of [1, 5, 12, 19, 20, 21, 25]) {
    for (const n of [1, 2, 3, 10, 19, 20]) {
      assert.equal(esitoTiro(t(va), n, dati).esito, esitoProva(va, n, dati, { abilita: true, tipo: null, magistraleMigliorato: false }).esito, `VA ${va}, naturale ${n}`);
    }
  }
});

test('tiro dell’Iniziativa e del danno: si sommano, non hanno esito', () => {
  const i = tiroDelValore({ genere: 'iniziativa', nome: 'Iniziativa', va: 5 }, dati);
  assert.equal(i.modo, 'somma');
  assert.equal(i.spec.formula, '1d10');
  const e = esitoTiro(i, 7, dati);
  assert.deepEqual([e.totale, e.esito, e.riga], [12, null, 'Iniziativa: 12']);
  const d = tiroDelValore({ genere: 'danno', nome: 'Spada lunga: danno', formula: '1d8+2' }, dati);
  assert.equal(esitoTiro(d, 7, dati).totale, 7, 'il danno è già la somma dei dadi e dei fissi');
  // tiraValore: nelle Prove conta il naturale, nel danno la somma
  const dadi = [4, 6];
  let k = 0;
  assert.equal(tiraValore(tiroDelValore({ genere: 'prova', nome: 'x', va: 10 }, dati), () => 13).naturale, 13);
  const r = tiraValore(specDaFormula('2d6') ? tiroDelValore({ genere: 'danno', nome: 'x', formula: '2d6' }, dati) : null, () => dadi[k++ % 2]);
  assert.equal(r.naturale, 10, '4 + 6');
});

// ---------------------------------------------------------------------------
// Il tocco sui valori della scheda

test('tocco sul VA di un’Abilità: finestrella con il VA giusto e i bonus già compresi', () => {
  chiudiFinestre();
  const ctx = contesto({ attiva: 'abilita', sessione: { ferite: 1 } });
  const r = resa(ctx);
  const a = ctx.tab.tab.find((t) => t.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((x) => x.nome === 'Atletica');
  const riga = r.tutti.find((n) => n.tagName === 'TR' && n.children[0]?.children[0]?.textContent === 'Atletica');
  const pillola = riga.querySelectorAll('.pillola-va')[0];
  assert.ok(pillola.className.includes('valore-tirabile'), 'il numero si tocca');
  clic(pillola);
  const d = finestra();
  assert.ok(d?.open);
  assert.match(d.textContent, new RegExp(`Tira Atletica — VA ${a.effettivo}`));
  assert.match(d.textContent, /Nel valore:.*Ferita Superficiale/, 'i bonus e i malus attivi sono elencati in piccolo');
  // tira: esito e scarto, e il tiro va nel registro
  clic(bottone(d, /^Tira 1d20/));
  const ultimo = ctx.chiamate.at(-1);
  assert.equal(ultimo[0], 'tiro');
  assert.equal(ultimo[1].cosa, 'Atletica');
  assert.ok(ultimo[1].naturale >= 1 && ultimo[1].naturale <= 20);
  assert.equal(ultimo[1].esito, esitoProva(a.effettivo, ultimo[1].naturale, dati, { abilita: true }).esito);
  assert.equal(ultimo[1].scarto, a.effettivo - ultimo[1].naturale);
  chiudiFinestre();
});

test('tocco su Difese, Iniziativa e Prove Salvezza: il VA giusto e il dado giusto', () => {
  chiudiFinestre();
  // Difese e Iniziativa (tab Combattimento)
  const ctx = contesto({ attiva: 'combattimento' });
  const d = ctx.tab.tab.find((t) => t.id === 'combattimento').dati;
  const r = resa(ctx);
  const difese = r.tutti.find((n) => n.className?.includes('contatore-tavolo') && n.children[0]?.textContent.startsWith('Difese'));
  clic(difese.querySelectorAll('.pillola-va')[0]);
  assert.match(finestra().textContent, new RegExp(`Tira Difese — VA ${d.difese.effettivo}`));
  chiudiFinestre();
  const iniz = r.tutti.find((n) => n.className?.includes('contatore-tavolo') && n.children[0]?.textContent.startsWith('Iniziativa'));
  clic(iniz.querySelectorAll('.pillola-va')[0]);
  const t = ctx.tab.scheda.tavolo.iniziativa;
  assert.match(finestra().textContent, new RegExp(`Tira Iniziativa — [+−]?\\d+ \\+ ${dati.regole.iniziativa.dado_in_combattimento}`));
  clic(bottone(finestra(), /^Tira 1d10/));
  const riga = ctx.chiamate.at(-1)[1];
  assert.equal(riga.totale, (t.effettivo ?? t.daRegole) + riga.naturale, 'l’Iniziativa si somma al dado');
  assert.equal(riga.esito, undefined, 'niente esito: non è una Prova');
  chiudiFinestre();
  // Prove Salvezza (Identità)
  const ci = contesto({ attiva: 'identita' });
  const sal = ci.tab.tab.find((t) => t.id === 'identita').dati.salvezze[0];
  const ri = resa(ci);
  const cella = ri.tutti.find((n) => n.tagName === 'TD' && n.className?.includes('cella-va'));
  clic(cella.querySelectorAll('.pillola-va')[0]);
  assert.match(finestra().textContent, new RegExp(`Tira Prova Salvezza: ${sal.nome} — VA ${sal.effettivo ?? sal.totale}`));
  chiudiFinestre();
});

test('nessun pulsante nuovo nella scheda: solo i numeri diventano toccabili', () => {
  chiudiFinestre();
  for (const attiva of ['identita', 'abilita', 'combattimento', 'inventario']) {
    const ctx = contesto({ attiva });
    const r = resa(ctx);
    assert.equal(r.tutti.filter((n) => n.tagName === 'BUTTON' && /🎲|Tira/.test(n.textContent)).length, 0, `${attiva}: nessun pulsante «Tira» o dado`);
    if (attiva !== 'inventario') assert.ok(r.classe('valore-tirabile').length > 0, `${attiva}: i valori si toccano`);
  }
  // il «Calcolo» delle Abilità resta
  const ctx = contesto({ attiva: 'abilita' });
  assert.equal(resa(ctx).classe('btn-calcolo').length, 24);
});

// ---------------------------------------------------------------------------
// S18: «Attacca!»

test('«Attacca!»: toccando il VA si tira per colpire, toccando il danno si tirano i dadi dell’arma', () => {
  chiudiFinestre();
  const ctx = contesto({ attiva: 'combattimento', armi: ['armi:spada-lunga'] });
  const a = ctx.tab.scheda.equipaggiamento.armi.find((x) => x.uid === 'arma-1');
  ctx.ui.attacco = { uid: 'arma-1', passo: 0 };
  const radice = document.createElement('div');
  radice.append(pannelloAttacco(ctx, a));
  const r = calcolaAttaccoRavvicinato({ scheda: ctx.tab.scheda, sessione: ctx.sessione }, a, dichiarazioneRavvicinato({}), dati);
  // il VA
  const va = radice.querySelectorAll('.pillola-attacco')[0];
  assert.ok(va.className.includes('valore-tirabile'));
  clic(va);
  assert.match(finestra().textContent, new RegExp(`Tira ${a.nome}: tiro per colpire — VA ${r.va_finale}`));
  clic(bottone(finestra(), /^Tira 1d20/));
  const tiro = ctx.chiamate.at(-1)[1];
  assert.equal(tiro.esito, esitoProva(r.va_finale, tiro.naturale, dati, { abilita: true, tipo: 'attacco' }).esito);
  chiudiFinestre();
  // il danno, con i dadi dell'arma
  const danno = radice.querySelectorAll('.danno-valore')[0];
  assert.equal(danno.tagName, 'BUTTON');
  assert.equal(danno.textContent, r.danno.testo);
  clic(danno);
  assert.match(finestra().textContent, new RegExp(`Tira il danno — ${r.danno.testo.replace(/[+]/g, '\\+')}`));
  clic(bottone(finestra(), /^Tira /));
  const d = ctx.chiamate.at(-1)[1];
  const spec = specDaFormula(r.danno.testo);
  assert.ok(d.totale >= spec.minimo && d.totale <= spec.massimo, `${d.totale} fra ${spec.minimo} e ${spec.massimo}`);
  assert.equal(d.esito, undefined);
  chiudiFinestre();
  // nessun pulsante in più nel pannello
  assert.equal(radice.tutti().filter((n) => n.tagName === 'BUTTON' && /🎲/.test(n.textContent)).length, 0);
});

test('«Attacca!» a distanza: stesso tocco, e i nemici della plancia restano con il loro tiro', () => {
  chiudiFinestre();
  const ctx = contesto({ attiva: 'combattimento', armi: ['armi_distanza:pistola-semiautomatica'] });
  const a = ctx.tab.scheda.equipaggiamento.armi.find((x) => x.uid === 'arma-1');
  ctx.ui.attacco = { uid: 'arma-1', passo: 0 };
  const radice = document.createElement('div');
  radice.append(pannelloAttacco(ctx, a));
  const r = calcolaAttaccoDistanza({ scheda: ctx.tab.scheda, sessione: ctx.sessione }, a, dichiarazioneDistanza({}), dati);
  clic(radice.querySelectorAll('.pillola-attacco')[0]);
  assert.match(finestra().textContent, new RegExp(`VA ${r.va_finale}`));
  chiudiFinestre();
  assert.equal(radice.querySelectorAll('.danno-valore')[0].tagName, 'BUTTON');
  // nemico della plancia: il finale è quello della plancia, il VA non si tocca
  const ctxN = { ...ctx, azioni: { ...ctx.azioni, finale: () => document.createElement('div') } };
  const rn = document.createElement('div');
  ctxN.ui = { attacco: { uid: 'arma-1', passo: 0 } };
  rn.append(pannelloAttacco(ctxN, a));
  assert.equal(rn.querySelectorAll('.pillola-attacco')[0].className.includes('valore-tirabile'), false);
  assert.equal(rn.querySelectorAll('.danno-valore')[0].tagName, 'STRONG');
});

// ---------------------------------------------------------------------------
// Registro dei tiri

test('registro: gli ultimi tiri nella scheda, i più recenti in cima, al massimo venti', () => {
  const t = tiroDelValore({ genere: 'prova', nome: 'Percezione', va: 12 }, dati);
  let s = {};
  for (let i = 1; i <= TIRI_MAX + 5; i++) s = aggiungiTiro(s, rigaTiro(t, esitoTiro(t, ((i - 1) % 20) + 1, dati), new Date(`2026-10-13T10:${String(i).padStart(2, '0')}:00Z`)));
  assert.equal(s.tiri.length, TIRI_MAX, 'restano gli ultimi venti');
  assert.equal(tiriRecenti(s)[0].quando, s.tiri.at(-1).quando, 'il più recente in cima');
  assert.deepEqual(tiriRecenti({}), []);
  // nella scheda: «Ultimi tiri» richiudibile, e non c'è finché non si tira
  chiudiFinestre();
  assert.equal(resa(contesto({ attiva: 'identita' })).classe('ultimi-tiri').length, 0);
  const ctx = contesto({ attiva: 'identita', sessione: { tiri: s.tiri.slice(-3) } });
  const sez = resa(ctx).classe('ultimi-tiri')[0];
  assert.equal(sez.tagName, 'DETAILS');
  assert.match(sez.children[0].textContent, /Ultimi tiri \(3\)/);
  assert.equal(sez.tutti().filter((n) => n.tagName === 'LI').length, 3);
  assert.match(sez.textContent, /Percezione: \d+ → /);
});

test('registro dello scontro: il tiro fatto dal tablet arriva al master, nessun tiro nascosto', () => {
  const t = tiroDelValore({ genere: 'prova', nome: 'Percezione', va: 11 }, dati);
  const e = esitoTiro(t, 8, dati);
  assert.equal(rigaRegistroScontro('Akira', e, t), 'Akira tira Percezione: 8 → Successo, scarto +3');
  const i = tiroDelValore({ genere: 'iniziativa', nome: 'Iniziativa', va: 4 }, dati);
  assert.equal(rigaRegistroScontro('Akira', esitoTiro(i, 6, dati), i), 'Akira tira Iniziativa: 10');
  // nella scheda: in uno scontro il tiro manda anche la riga al registro della plancia
  chiudiFinestre();
  const ctx = contesto({ attiva: 'abilita', scontro: 'scontro-1' });
  const riga = resa(ctx).tutti.find((n) => n.tagName === 'TR' && n.children[0]?.children[0]?.textContent === 'Atletica');
  clic(riga.querySelectorAll('.pillola-va')[0]);
  clic(bottone(finestra(), /^Tira 1d20/));
  const [, , testoScontro] = ctx.chiamate.at(-1);
  assert.match(testoScontro, /^Torvald Krane tira Atletica: \d+ → /);
  chiudiFinestre();
  // l'app manda la riga solo con uno scontro aperto (src/ui/app.js)
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /if \(stato\.scontroPg && testoScontro\) rigaRegistro\(testoScontro\);/);
});

// ---------------------------------------------------------------------------
// Nessuna regola cambia

test('nessun valore calcolato cambia: la scheda è quella di prima, tirare non la tocca', () => {
  for (const f of readdirSync(cartella).filter((x) => x.endsWith('.json'))) {
    const p = deserializzaPersonaggio(readFileSync(new URL(f, cartella), 'utf8'));
    const creazione = normalizza(p.creazione, dati).scelte;
    const prima = JSON.stringify(calcolaScheda({ creazione, livelli: p.livelli }, dati));
    // una sessione con dei tiri registrati non cambia nessun valore
    const massimi = massimiSessione(calcolaScheda({ creazione, livelli: p.livelli }, dati), creazione, dati);
    const sessione = allineaSessione(p.sessione, massimi);
    const t = tiroDelValore({ genere: 'prova', nome: 'Percezione', va: 12 }, dati);
    const conTiri = aggiungiTiro(sessione, rigaTiro(t, esitoTiro(t, 5, dati)));
    assert.equal(JSON.stringify(calcolaScheda({ creazione, livelli: p.livelli }, dati)), prima, f);
    assert.equal(JSON.stringify(calcolaScheda({ creazione, livelli: p.livelli, sessione: conTiri }, dati)),
      JSON.stringify(calcolaScheda({ creazione, livelli: p.livelli, sessione }, dati)), `${f}: i tiri non toccano i valori`);
    assert.equal(JSON.stringify(allineaSessione(conTiri, massimi).tiri), JSON.stringify(conTiri.tiri), 'i tiri restano nella sessione');
  }
});
