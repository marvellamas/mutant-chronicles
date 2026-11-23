import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 241 (23/11/2026) — **nell'avanzamento di livello nessun controllo sulla distribuzione impedisce di concludere.**
//
// La sera del 22/11 l'app ha fermato il tavolo: sette giocatori in attesa e Dimitri che non chiudeva il passaggio all'8°.
// La regola di Marcello: «Togli tutti i blocchi quando si avanza di livello. Tutti. Li segnala ma non blocca.» Quello che giudica
// come il giocatore ha distribuito punti, Abilità, Talenti, incantesimi è un avviso coi numeri; fermano solo le scritture
// sbagliate (un id che non esiste, un numero non intero, Classe e dadi del Grado) e i controlli che proteggono il lavoro di un
// altro: il 403 del tablet senza «Scegli», il 409 dei due tablet, il tiro già registrato della A.297, la CM non intera (A.252).
//
// Questo file fallisce se:
//  1. un controllo sulla distribuzione torna a impedire di concludere un avanzamento (motore, pagina, pulsante, server);
//  2. Dimitri a 20 incantesimi all'8° riceve un avviso (20 è la quota giusta: A.287);
//  3. le correzioni a mano del Direttore entrano nel conto dei punti liberi;
//  4–7. uno dei quattro blocchi del punto B smette di fermare.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { datiReali, copia } from './helpers.js';
import { deserializzaPersonaggio, applicaLivello } from '../src/character.js';
import { validaLivello, prossimoLivello, ricalcolaAvanzamento, statoQuote, scritturaSbagliata } from '../src/avanzamento.js';
import { calcolaScheda } from '../src/calc.js';
import { avvisoIncantesimo, contoDaScheda } from '../src/quote-incantesimi.js';
import { controllaTalentiDaTablet } from '../src/talenti-tablet.js';
import { controllaTiriDaTablet } from '../src/tiri-avanzamento.js';
import { creaServer } from '../server.mjs';

const { dati } = await datiReali();
const FILE_DIMITRI = new URL('./fixtures/dimitri-225/Dimitri-Orlav_liv7_2026-11-11.json', import.meta.url);
const grezzoDimitri = () => JSON.parse(readFileSync(FILE_DIMITRI, 'utf8'));
const dimitri = () => deserializzaPersonaggio(readFileSync(FILE_DIMITRI, 'utf8'));
const tiro = (valore) => ({ valore, origine: 'manuale' });
const catalogo = dati.incantesimi.incantesimi;
const macro = (nome) => catalogo.find((i) => i.nome === nome)?.macrofamiglia;

const PERSONAGGI = [
  ...readdirSync(new URL('../esempi/', import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => new URL(`../esempi/${f}`, import.meta.url)),
  ...readdirSync(new URL('./collaudo/', import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => new URL(`./collaudo/${f}`, import.meta.url)),
  FILE_DIMITRI,
].map((u) => { try { return { nome: String(u).split('/').at(-1), p: deserializzaPersonaggio(readFileSync(u, 'utf8')) }; } catch { return null; } })
  .filter((x) => x && x.p?.creazione);

/** La voce minima del livello dopo: la prima Classe ammessa, i dadi al minimo, il Talento a scelta se serve. */
function voceBase(p) {
  const pr = prossimoLivello(p, dati);
  if (!pr) return null;
  const c = pr.classi.find((x) => x.ammessa && x.gradoAttuale > 0) ?? pr.classi.find((x) => x.ammessa);
  const v = { livello: pr.livello };
  if (c && pr.eventi.includes('grado_classe')) {
    v.grado = { classe: c.nome };
    if (c.tiroPV) v.tiroPV = tiro(c.tiroPV.minimo);
    if (c.tiroPM) v.tiroPM = tiro(c.tiroPM.minimo);
    if (c.talentiAScelta?.length) v.talentoClasse = c.talentiAScelta[0];
  }
  return { pr, v, classe: c?.nome ?? null };
}

/** Le distribuzioni sbagliate che un giocatore può fare in «Sali di livello». */
function distribuzioniSbagliate(p) {
  const b = voceBase(p);
  if (!b) return [];
  const { pr, v, classe } = b;
  const out = [['vuota (niente scelto)', v]];
  const s = calcolaScheda(applicaLivello(p, v), dati).abilita ?? [];
  const alta = [...s].sort((x, y) => y.grezzo - x.grezzo)[0]?.nome;
  if (pr.puntiAbilita && alta) {
    out.push(['tutti i punti su un\'Abilità già al limite, e troppi', { ...v, puntiAbilita: { [alta]: pr.puntiAbilita + 4 } }]);
    out.push(['meno punti del previsto', { ...v, puntiAbilita: { [alta]: 1 } }]);
  }
  if (pr.puntiCaratteristica) {
    const sigla = Object.keys(pr.caratteristiche ?? {})[0] ?? 'FOR';
    out.push(['Caratteristiche oltre il massimo e troppe', { ...v, caratteristiche: { [sigla]: pr.puntiCaratteristica + 6 } }]);
  }
  const nonAmmesso = (lista) => (lista ?? []).find((t) => t.ammesso === false || t.ammessa === false);
  if (pr.eventi.includes('talento_libero')) {
    const t = nonAmmesso(pr.talentiLiberi);
    if (t) out.push([`Talento non ammesso (${t.id})`, { ...v, talentoLibero: { id: t.id } }]);
  }
  if (v.maestria !== undefined || pr.maestrie?.length) {
    const t = nonAmmesso(pr.maestrie);
    if (t) out.push([`Maestria non ammessa (${t.id})`, { ...v, maestria: { id: t.id } }]);
  }
  const spec = nonAmmesso(pr.specializzazioni?.[classe]);
  if (spec) out.push([`Specializzazione non ammessa (${spec.id})`, { ...v, specializzazione: { id: spec.id } }]);
  const noti = new Set(ricalcolaAvanzamento(p, dati).stato.incantesimi);
  const tanti = catalogo.filter((i) => !noti.has(i.nome)).slice(0, 30).map((i) => i.nome);
  out.push(['trenta incantesimi, oltre quote e livello massimo', { ...v, incantesimi: tanti }]);
  return out;
}

test('1. NESSUN CONTROLLO SULLA DISTRIBUZIONE IMPEDISCE DI CONCLUDERE: ogni errore di «Sali di livello» è un avviso (procedibile)', () => {
  let casi = 0;
  let avvisi = 0;
  for (const { nome, p } of PERSONAGGI) {
    for (const [descr, voce] of distribuzioniSbagliate(p)) {
      const err = validaLivello(p, voce, dati);
      const fermi = err.filter((e) => !e.procedibile);
      assert.deepEqual(fermi, [], `${nome}, ${descr}: questi fermerebbero la salita`);
      casi += 1;
      avvisi += err.length;
    }
  }
  assert.ok(casi >= 30, `solo ${casi} casi: un controllo verde su pochi casi non prova niente`);
  assert.ok(avvisi >= casi, 'le distribuzioni sbagliate devono produrre davvero degli avvisi (altrimenti il test non guarda niente)');
});

test('1b. il criterio è la classe, e il controllo lo vede: un dato che non si può scrivere ferma ancora', () => {
  const p = dimitri();
  const { v } = voceBase(p);
  const sbagliati = [
    { ...v, puntiAbilita: { 'Abilità Inventata': 1 } },
    { ...v, puntiAbilita: { Percezione: 1.5 } },
    { ...v, incantesimi: ['Incantesimo Che Non Esiste'] },
    { ...v, grado: undefined },
    { ...v, tiroPV: tiro(99) },
    { ...v, cosaStrana: 1 },
  ];
  for (const voce of sbagliati) {
    const err = validaLivello(p, voce, dati);
    assert.ok(err.some((e) => !e.procedibile), `${JSON.stringify(voce).slice(0, 120)}: una scrittura sbagliata deve fermare (${JSON.stringify(err).slice(0, 300)})`);
  }
  assert.equal(scritturaSbagliata({ campo: 'puntiAbilita.Percezione', problema: 'Professionali: Percezione 2 punti su VA 13, il limite della categoria è 13 — 2 punti non aumentano il VA (§8.3)' }), false);
  assert.equal(scritturaSbagliata({ campo: 'incantesimi', problema: 'incantesimi: 20 conosciuti su 20 di quota; …' }), false);
});

test('1c. la pagina e il pulsante: la conferma si spegne solo per una scrittura sbagliata; «Sali al livello» non si spegne per gli errori dei livelli o i Talenti da scegliere', () => {
  const sali = readFileSync(new URL('../src/ui/sali.js', import.meta.url), 'utf8');
  assert.match(sali, /const bloccanti = errori\.filter\(\(e\) => !e\.procedibile\);/);
  assert.doesNotMatch(sali, /disabled: giaNoto \|\| \(!!motivo && !c\.master\)/, 'gli incantesimi fuori quota si scelgono anche dal tablet');
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /'Correggi gli errori dei livelli \(o annulla l’ultimo\) prima di salire ancora\.'/);
  assert.doesNotMatch(app, /'Scegli prima i Talenti nel riquadro «Da scegliere»/);
  const i = app.indexOf('Lotto 241 (regola di Marcello, 23/11/2026): nell\'avanzamento nessun controllo');
  assert.ok(i > 0);
  const conferma = app.slice(i, i + 2500);
  assert.match(conferma, /if \(errLivello\.some\(\(e\) => !e\.procedibile\)\) return renderSaliPagina\(\);/);
  assert.doesNotMatch(conferma, /errLivello\.length > forzati\.length/, 'il vecchio cancello (solo il Direttore forzava) non torna');
});

// ---------------------------------------------------------------------------
// 2. Dimitri all'8°: 18 incantesimi conservati, 2 nuovi, 20 su 20 (A.287)

/** La voce pulita dell'8° di Dimitri: Specializzazione ammessa, 7 punti che aumentano il VA, gli incantesimi dati. */
function ottavoDimitri(p, incantesimi) {
  const pr = prossimoLivello(p, dati);
  const v = { livello: 8, grado: { classe: 'Tecnomante' }, tiroPV: tiro(3), tiroPM: tiro(3) };
  const spec = pr.specializzazioni.Tecnomante.find((x) => x.ammesso !== false && x.ammessa !== false);
  if (spec) v.specializzazione = { id: spec.id };
  const ab = calcolaScheda(applicaLivello(p, v), dati).abilita;
  const pa = {};
  let restano = pr.puntiAbilita;
  for (const a of ab) {
    if (restano <= 0) break;
    const posto = Math.min(restano, (a.limite ?? 99) - a.grezzo);
    if (posto > 0 && a.totale >= 1) { pa[a.nome] = posto; restano -= posto; }
  }
  v.puntiAbilita = pa;
  if (incantesimi.length) v.incantesimi = incantesimi;
  return v;
}

/** Due incantesimi che rientrano nelle quote, scelti come li sceglierebbe la pagina (avvisoIncantesimo, il conto unico). */
function dueGiusti(p) {
  const noti = new Set(ricalcolaAvanzamento(p, dati).stato.incantesimi);
  const scelti = [];
  for (let k = 0; k < 2; k++) {
    const conto = contoDaScheda(calcolaScheda(applicaLivello(p, ottavoDimitri(p, scelti)), dati).incantesimi);
    const i = catalogo.find((x) => !noti.has(x.nome) && !scelti.includes(x.nome) && !avvisoIncantesimo(x, conto));
    assert.ok(i, 'la pagina deve offrire un incantesimo che rientra nelle quote');
    scelti.push(i.nome);
  }
  return scelti;
}

test('2. DIMITRI A 20 INCANTESIMI NON RICEVE NESSUN AVVISO: 18 conservati + 2 nuovi = 20, la quota giusta dell\'8° (A.287)', () => {
  const p = dimitri();
  // il caso è quello vero: al 7° i livelli passati risultano sopra quota per l'Intelligenza corretta (−2)
  const passati = ricalcolaAvanzamento(p, dati).errori.filter((e) => /incantesimi$/.test(e.campo));
  assert.ok(passati.length >= 1, 'il file di prova deve avere i livelli passati sopra quota, altrimenti il test non prova il rientro');
  assert.equal(ricalcolaAvanzamento(p, dati).stato.incantesimi.length, 18);
  const due = dueGiusti(p);
  const voce = ottavoDimitri(p, due);
  const err = validaLivello(p, voce, dati);
  assert.deepEqual(err, [], `a 20 nessun avviso: ${JSON.stringify(err)}`);
  const dopo = ricalcolaAvanzamento(applicaLivello(p, voce), dati).stato;
  const q = statoQuote(dopo, dati);
  assert.deepEqual([q.noti.length, q.totale], [20, 20]);
  assert.equal(calcolaScheda(applicaLivello(p, voce), dati).storico?.incantesimi?.length ?? 0, 0, 'all\'8° i due di prima rientrano nella quota: nessuno nello storico');
});

test('2b. Dimitri a 18 (nessun nuovo) e con due nella famiglia sbagliata: avvisi coi numeri, e la salita si chiude', () => {
  const p = dimitri();
  const a18 = validaLivello(p, ottavoDimitri(p, []), dati);
  assert.ok(a18.length >= 1 && a18.every((e) => e.procedibile), JSON.stringify(a18));
  assert.match(a18.find((e) => e.campo === 'incantesimi').problema, /18 conosciuti su 20 di quota, 2 ancora da scegliere/);
  const noti = new Set(ricalcolaAvanzamento(p, dati).stato.incantesimi);
  const fisici = catalogo.filter((i) => !noti.has(i.nome) && i.macrofamiglia === 'Fisica' && i.livello_base <= 2).slice(0, 2).map((i) => i.nome);
  const male = validaLivello(p, ottavoDimitri(p, fisici), dati);
  assert.ok(male.every((e) => e.procedibile), JSON.stringify(male));
  const testo = male.find((e) => e.campo === 'incantesimi')?.problema ?? '';
  assert.match(testo, /20 conosciuti su 20 di quota/);
  assert.match(testo, /Fisica \d+ su \d+ \(\+\d+\)/, 'dice quale famiglia sfora, coi numeri');
  assert.match(testo, /posti di Classe ancora liberi: Mentale 1/, 'e dove c\'era posto');
  assert.ok(fisici.every((n) => macro(n) === 'Fisica'));
});

// ---------------------------------------------------------------------------
// 3. Le correzioni a mano del Direttore non sono punti liberi (A.281, A.293)

test('3. LE CORREZIONI DEL MASTER NON ENTRANO NEL CONTO DEI PUNTI LIBERI: togliere le 4 del 2/11, o aggiungerne una grande (+6 a Scienza), non cambia niente', () => {
  const base = grezzoDimitri();
  const conCorr = (f, lista) => deserializzaPersonaggio(JSON.stringify({ ...f, correzioni_master: lista }));
  const tutte = base.correzioni_master;
  const senzaAbilita = tutte.filter((r) => !/^abilita:/.test(r.chiave));
  assert.equal(tutte.length - senzaAbilita.length, 4, 'il file di prova ha le quattro correzioni alle Abilità del 2/11');
  const grande = [...tutte, { id: 'cm-prova-241', quando: '2026-11-23T10:00:00.000Z', chiave: 'abilita:Scienza', etichetta: 'VA di Scienza', tipo: 'aggiungi', numero: 6, motivo: 'prova', stato: 'attiva' }];
  const varianti = [conCorr(base, tutte), conCorr(base, senzaAbilita), conCorr(base, grande)];
  // una voce che mette punti su Abilità vicine al limite, Scienza compresa (Professionale, al limite 13 con il Grado III)
  const voce = { livello: 8, grado: { classe: 'Tecnomante' }, tiroPV: tiro(3), tiroPM: tiro(3), puntiAbilita: { Scienza: 1, 'Armi da mischia': 4, Atletica: 2 } };
  // Armi da mischia (Generica, limite 11): VA 7 (DES con la correzione del Direttore, come in scheda) + 4 punti = 11, tutti utili;
  // contando le due +1 del 2/11 come punti, 2 non lo sarebbero
  assert.equal(validaLivello(varianti[0], voce, dati).find((e) => e.campo === 'puntiAbilita.Armi da mischia'), undefined, 'Armi da mischia: i 4 punti aumentano tutti il VA');
  const impronta = (p) => {
    const r = ricalcolaAvanzamento(p, dati);
    const err = validaLivello(p, voce, dati).filter((e) => /^puntiAbilita/.test(e.campo));
    return JSON.stringify({
      completamenti: r.completamenti, eccessi: r.eccessi, inattivi: r.stato.inattivi ?? [],
      // il testo può aggiungere «in scheda vedi …» per spiegare la correzione: il conto (campo, punti inattivi, tipo) no
      errori: err.map((e) => [e.campo, e.tipo, e.inattivi ?? 0, e.problema.split('; in scheda vedi')[0]]),
    });
  };
  const [a, b, c] = varianti.map(impronta);
  assert.equal(b, a, 'senza le 4 correzioni alle Abilità il conto dei punti liberi è lo stesso');
  assert.equal(c, a, 'con una correzione +6 a Scienza il conto dei punti liberi è lo stesso');
  // e il mutante: se il conto leggesse il VA corretto, la −1 del 2/11 (VA 12) darebbe posto a un punto, e la +6 a Scienza nessuno
  const err = validaLivello(varianti[2], { ...voce, puntiAbilita: { Scienza: 2, 'Armi da mischia': 5 } }, dati).find((e) => e.campo === 'puntiAbilita.Scienza');
  assert.ok(err?.inattivi >= 1, `Scienza è al limite senza correzioni: i punti non lo aumentano (${JSON.stringify(err)})`);
  assert.match(err.problema, /in scheda vedi \d+ per 2 correzioni del Direttore/, 'e l\'avviso dice perché la scheda mostra un altro numero');
});

test('3b. NIENTE AVVISO FALSO SUL LIMITE: il livello nuovo si giudica sul VA che il giocatore vede (Caratteristiche corrette), come la pagina', () => {
  // trovato nella prova del lotto 241: Atletica di Dimitri è 5 nella pagina e nella scheda (FOR con le correzioni del 2/11, netto −1); il
  // motore la contava 6 e diceva «1 punto non aumenta il VA» su 6 punti che invece portano esattamente al limite 11
  const p = dimitri();
  const voce = { livello: 8, grado: { classe: 'Tecnomante' }, tiroPV: tiro(3), tiroPM: tiro(3), puntiAbilita: { Atletica: 6, 'Furtività': 1 } };
  const pagina = calcolaScheda(applicaLivello(p, { ...voce, puntiAbilita: undefined }), dati).abilita.find((a) => a.nome === 'Atletica');
  assert.equal(pagina.grezzo + 6, pagina.limite, 'nella pagina Atletica arriva esattamente al limite');
  const err = validaLivello(p, voce, dati).filter((e) => /^puntiAbilita/.test(e.campo));
  assert.deepEqual(err, [], `nessun avviso: ${JSON.stringify(err)}`);
  // e i livelli già acquisiti restano contati com'erano: nessun punto «da riassegnare» nato oggi
  assert.deepEqual(ricalcolaAvanzamento(p, dati).completamenti, []);
  // e dopo la conferma la scheda dà quello che la pagina prometteva: Atletica 11, nessun punto da riassegnare (prima: 10, e «1 da riassegnare»)
  const dopo = calcolaScheda(applicaLivello(p, voce), dati);
  assert.equal(dopo.abilita.find((a) => a.nome === 'Atletica').totale, 11);
  assert.deepEqual(dopo.completamenti, []);
});

// ---------------------------------------------------------------------------
// 4–7. I blocchi del punto B: fermano ancora

const radice = mkdtempSync(join(tmpdir(), 'mutant-241-'));
const cartelle = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srvMaster, baseMaster, srvTablet, baseTablet;
before(async () => {
  for (const d of Object.values(cartelle)) mkdirSync(d, { recursive: true });
  const opz = { cartella: cartelle.personaggi, ...Object.fromEntries(['tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, cartelle[k]])) };
  srvMaster = creaServer({ ...opz, eMaster: () => true });
  await new Promise((ok) => srvMaster.listen(0, '127.0.0.1', ok));
  baseMaster = `http://127.0.0.1:${srvMaster.address().port}`;
  srvTablet = creaServer({ ...opz, eMaster: () => false });
  await new Promise((ok) => srvTablet.listen(0, '127.0.0.1', ok));
  baseTablet = `http://127.0.0.1:${srvTablet.address().port}`;
});
after(async () => {
  await new Promise((ok) => srvMaster.close(ok));
  await new Promise((ok) => srvTablet.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const FILE = 'Dimitri-Orlav_liv7_2026-11-23.json';
const json = { 'Content-Type': 'application/json' };
const sceglie = (id, pgId) => fetch(`${baseTablet}/api/dispositivo`, { method: 'POST', headers: { ...json, 'X-Mutant-Dispositivo': id }, body: JSON.stringify({ pgId }) });
const scrive = (id, testo, mtime) => fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(FILE)}`, {
  method: 'PUT', body: testo, headers: { ...json, 'X-Mutant-Da': 'giocatore', ...(id ? { 'X-Mutant-Dispositivo': id } : {}), ...(mtime ? { 'X-Mutant-Mtime': String(mtime) } : {}) },
});
const legge = async () => { const r = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(FILE)}`); return { testo: await r.text(), mtime: r.headers.get('X-Mutant-Mtime') }; };

/** Il file di Dimitri sul server di prova, con la concessione del Direttore per l'8° (A.286): la stessa che c'è nel file vero. */
async function mettiDimitri() {
  const o = grezzoDimitri();
  o.correzioni_master = [...o.correzioni_master, { id: 'cm-conc-241', quando: '2026-11-22T19:00:00.000Z', chiave: 'livello', etichetta: 'Passaggio al livello 8', tipo: 'concessione', livello: 8, motivo: 'A.286 (prova)', stato: 'attiva' }];
  const r = await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(FILE)}`, { method: 'PUT', body: JSON.stringify(o, null, 2) });
  assert.equal(r.status, 200, await r.text());
  return o.pg;
}
/** Il file letto con l'8° aggiunto, con la voce data. */
const conOttavo = (testo, voce) => { const o = JSON.parse(testo); o.livelli = [...o.livelli, voce]; return JSON.stringify(o); };

test('1d. IL SERVER NON RIFIUTA PIÙ UNA SALITA PER COME È DISTRIBUITA: Dimitri dal tablet, con Specializzazione e incantesimi fuori regola, scrive l\'8°', async () => {
  const pg = await mettiDimitri();
  assert.equal((await sceglie('tab-dimitri-1', pg)).status, 200);
  const l = await legge();
  const p = deserializzaPersonaggio(l.testo);
  const pr = prossimoLivello(p, dati);
  const spec = pr.specializzazioni.Tecnomante.find((x) => x.ammesso === false || x.ammessa === false);
  const noti = new Set(ricalcolaAvanzamento(p, dati).stato.incantesimi);
  const voce = { livello: 8, grado: { classe: 'Tecnomante' }, tiroPV: tiro(3), tiroPM: tiro(3), puntiAbilita: { Percezione: 7 },
    incantesimi: catalogo.filter((i) => !noti.has(i.nome)).slice(0, 5).map((i) => i.nome), ...(spec ? { specializzazione: { id: spec.id } } : {}) };
  // il controllo puro, prima: lo stesso file passa
  assert.deepEqual(controllaTalentiDaTablet(JSON.parse(conOttavo(l.testo, voce)), JSON.parse(l.testo), dati), { ok: true });
  const r = await scrive('tab-dimitri-1', conOttavo(l.testo, voce), l.mtime);
  assert.equal(r.status, 200, await r.text());
  const dopo = deserializzaPersonaggio((await legge()).testo);
  assert.equal(dopo.livelli.length, 7, 'l\'8° è scritto');
});

test('4. B — IL 403 DEL TABLET CHE NON HA SCELTO IL PERSONAGGIO FERMA ANCORA, anche con una salita di livello', async () => {
  await mettiDimitri();
  const l = await legge();
  const r = await scrive('tab-senza-scelta-241', conOttavo(l.testo, ottavoDimitri(deserializzaPersonaggio(l.testo), [])), l.mtime);
  assert.equal(r.status, 403);
  const corpo = await r.json();
  assert.equal(corpo.nonAutorizzato, true);
});

test('5. B — IL 409 DEI DUE TABLET SULLA STESSA SCHEDA FERMA ANCORA: il secondo, con la revisione vecchia, non sovrascrive la salita del primo', async () => {
  const pg = await mettiDimitri();
  assert.equal((await sceglie('tab-a-241', pg)).status, 200);
  assert.equal((await sceglie('tab-b-241', pg)).status, 200);
  const a = await legge();
  const b = await legge();
  const p = deserializzaPersonaggio(a.testo);
  assert.equal((await scrive('tab-a-241', conOttavo(a.testo, ottavoDimitri(p, [])), a.mtime)).status, 200);
  const rb = await scrive('tab-b-241', conOttavo(b.testo, { ...ottavoDimitri(p, []), puntiAbilita: { Atletica: 7 } }), b.mtime);
  assert.equal(rb.status, 409);
  const ora = deserializzaPersonaggio((await legge()).testo);
  assert.notDeepEqual(ora.livelli.at(-1).puntiAbilita, { Atletica: 7 }, 'la salita del primo tablet resta');
});

test('6. B — IL TIRO GIÀ REGISTRATO (A.297) NON SI RIFÀ DA UN TABLET', () => {
  const disco = grezzoDimitri();
  disco.livelli = [...disco.livelli, { livello: 8, grado: { classe: 'Tecnomante' }, tiroPV: tiro(2), tiroPM: tiro(3) }];
  disco.scelte = { ...disco.scelte, tiriAvanzamento: { 8: { classe: 'Tecnomante', PV: { valore: 2, origine: 'manuale' }, PM: { valore: 3, origine: 'manuale' } } } };
  const nuovo = copia(disco);
  nuovo.livelli.at(-1).tiroPV = tiro(4);
  nuovo.scelte.tiriAvanzamento[8].PV = { valore: 4, origine: 'manuale' };
  const r = controllaTiriDaTablet(nuovo, disco);
  assert.equal(r.ok, false);
  assert.equal(r.stato, 403);
  assert.match(r.errore, /già registrato/);
  // e senza registro: il tiro scritto nel livello non si cambia lo stesso
  const d2 = copia(disco); delete d2.scelte.tiriAvanzamento;
  const n2 = copia(d2); n2.livelli.at(-1).tiroPV = tiro(4);
  assert.equal(controllaTiriDaTablet(n2, d2).ok, false);
});

test('7. B — UNA CARICA MISTICA NON INTERA NON SI SPENDE (A.252), nemmeno con «Procedi comunque»', async () => {
  const { usaArtefatto, attivaArtefatto, massimiSessione, allineaSessione, inizializzaSessione } = await import('../src/sessione.js');
  const { normalizza } = await import('../src/character.js');
  // i Guanti di Lucas, la riserva in CM vera (come tests/cariche-mistiche.test.js)
  const p = deserializzaPersonaggio(readFileSync(new URL('./fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json', import.meta.url), 'utf8'));
  const creazione = normalizza(p.creazione, dati).scelte;
  const base = { creazione, livelli: p.livelli };
  const m = massimiSessione(calcolaScheda(base, dati), creazione, dati);
  const s = allineaSessione(p.sessione ?? inizializzaSessione(m), m);
  const uid = creazione.equipaggiamento.find((v) => v.rif === 'artefatti:guanti-da-combattimento-mistico')?.uid;
  assert.equal(s.chroma[uid]?.unita, 'CM', 'la riserva dei Guanti è in CM');
  assert.ok(usaArtefatto(s, uid, 1, m), 'una CM intera si spende (controllo positivo)');
  for (const f of [usaArtefatto, attivaArtefatto]) {
    for (const forza of [false, true]) assert.equal(f(s, uid, 1.5, m, { forza }), null, `${f.name} 1,5 CM ${forza ? 'con' : 'senza'} «Procedi comunque»: rifiutata`);
  }
});
