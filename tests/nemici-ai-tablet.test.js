// Niente dati dei nemici ai tablet (12/10/2026, punto 2 della sessione di gioco di Marcello e Davide): dal tablet,
// scegliendo un nemico come bersaglio in «Attacca!» o dalla linea di tiro, il giocatore vedeva la scheda del nemico
// (Difese, PV, AR, Stati), perché il server mandava lo scontro intero a chiunque lo chiedesse. Qui si controlla il
// filtro dove conta: nelle risposte del server a un dispositivo che non è il PC del master.
//
// Due server sulle stesse cartelle: uno «master» (come la pagina aperta sul PC del server, daQuestoPc) e uno «tablet»
// (eMaster: () => false). Le richieste sono le stesse, le risposte no.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { nuovoScontro, aggiungiNemici, registraTiro, registraColpo, scontroPerGiocatori, validaScontro } from '../src/scontro.js';
import { collegamentoScontro } from '../src/round-scontro.js';
import { serializza } from '../src/character.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-segreti-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
const SCONTRO = join(radice, 'scontri', 'scontro-prova.json');
const predone = JSON.parse(readFileSync(new URL('../esempi/nemici/predone-delle-lande.json', import.meta.url), 'utf8'));
let master, tablet, aMaster, aTablet;

/** Lo scontro di prova: due PG, due predoni (il 2 colpito), un tiro d'Iniziativa a testa. */
function scontroDiProva() {
  let s = nuovoScontro({ id: 'scontro-prova', nome: 'Prova', pg: [{ chiave: 'Akira', nome: 'Akira', iniziativa: 9, des: 7, int: 5 }, { chiave: 'Bea', nome: 'Bea', iniziativa: 5, des: 7, int: 5 }] });
  s = aggiungiNemici(s, predone, 2);
  s = registraTiro(s, 'pg:Akira', 'd10', { valore: 10, origine: 'manuale' }, dati);
  s = registraTiro(s, 'pg:Bea', 'd10', { valore: 5, origine: 'manuale' }, dati);
  s = registraTiro(s, 'nem:predone-delle-lande:1', 'd10', { valore: 9, origine: 'manuale' }, dati);
  s = registraTiro(s, 'nem:predone-delle-lande:2', 'd10', { valore: 1, origine: 'manuale' }, dati);
  const n = s.partecipanti.find((p) => p.id === 'nem:predone-delle-lande:2');
  s = registraColpo(s, { bersaglio: n.id, nome: n.nome, tipo: 'nemico', testo: `${n.nome} colpito: PV 12 → 4.`,
    prima: { pv: 12, stati: [] }, dopo: { pv: 4, stati: ['a-terra'] } });
  return { ...s, revisione: 1 };
}

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  for (const nome of ['Akira', 'Bea']) {
    const pg = structuredClone(MISHIMA_AGENTE);
    pg.nome = nome;
    writeFileSync(join(c.personaggi, `${nome}_liv1_2026-10-06.json`), serializza(pg));
  }
  writeFileSync(SCONTRO, JSON.stringify(scontroDiProva()));
  writeFileSync(join(c.nemici, 'predone-delle-lande.json'), JSON.stringify(predone));
  const scena = nuovaScena({ id: 'cripta', nome: 'Cripta', colonne: 10, righe: 6, nebbia: 'scoperta', dati });
  scena.collegamento = { scontro: 'scontro-prova', bozza: null };
  scena.token = [
    { id: 't-akira', rif: { tipo: 'partecipante', id: 'pg:Akira' }, q: [1, 1], ingombro: 1, nascosto: false },
    { id: 't-p1', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:1' }, q: [3, 4], ingombro: 1, nascosto: true },
    { id: 't-p2', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:2' }, q: [2, 2], ingombro: 1, nascosto: false },
  ];
  writeFileSync(join(c.scene, 'cripta.json'), JSON.stringify({ ...scena, revisione: 1, aggiornato: '2026-10-12T20:00:00.000Z' }));
  const cartelle = { cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe };
  master = creaServer(cartelle);
  tablet = creaServer({ ...cartelle, eMaster: () => false });
  await new Promise((ok) => master.listen(0, '127.0.0.1', ok));
  await new Promise((ok) => tablet.listen(0, '127.0.0.1', ok));
  aMaster = `http://127.0.0.1:${master.address().port}`;
  aTablet = `http://127.0.0.1:${tablet.address().port}`;
});
after(async () => {
  for (const s of [master, tablet]) { s.closeAllConnections?.(); await new Promise((ok) => s.close(ok)); }
  rmSync(radice, { recursive: true, force: true });
});

const leggi = async (base, percorso) => { const r = await fetch(`${base}${percorso}`); return { stato: r.status, corpo: await r.text() }; };

test('lo scontro arriva al tablet senza niente dei nemici oltre al nome', async () => {
  const { stato, corpo } = await leggi(aTablet, '/api/scontri/scontro-prova');
  assert.equal(stato, 200);
  const s = JSON.parse(corpo);
  assert.equal(s.filtrato, true);
  const nemici = s.partecipanti.filter((p) => p.tipo === 'nemico');
  assert.equal(nemici.length, 2, 'i nemici ci sono, per nome');
  for (const n of nemici) assert.deepEqual(Object.keys(n).sort(), ['id', 'lato', 'nome', 'tipo']);
  assert.deepEqual(nemici.map((n) => n.nome), ['Predone delle Lande 1', 'Predone delle Lande 2']);
  // nessuna parola delle schede dei nemici nella risposta, da nessuna parte
  for (const chiave of ['scheda', 'difese', '"pv"', 'ferite', 'menomazioni', '"stati"', 'attacco', 'incantesimi', 'colpi', 'indietro']) {
    assert.ok(!corpo.includes(chiave), `la risposta al tablet non contiene «${chiave}»`);
  }
  // nemmeno i valori d'Iniziativa dei nemici (dei PG sì: sono i loro, e la barra dell'Iniziativa li mostra già)
  const testoNemici = JSON.stringify(nemici);
  for (const chiave of ['d10', 'spareggio', 'des']) assert.ok(!testoNemici.includes(chiave), `dei nemici niente «${chiave}»`);
  assert.ok(corpo.includes('"d10"'), 'il tiro d’Iniziativa dei PG resta');
  // nemmeno il registro: racconta i colpi, i PM e gli Stati dei nemici
  assert.deepEqual(s.registro, []);
  // il turno serve alla scheda e arriva già calcolato: il nome, non i valori d'Iniziativa
  assert.deepEqual(s.turnoDi, { id: 'pg:Akira', nome: 'Akira' });
  // Round, durate e perdite periodiche del proprio PG restano (la scheda ci conta)
  assert.equal(s.round, 1);
  assert.deepEqual(s.durate, []);
});

test('al PC del master lo scontro arriva intero, come prima', async () => {
  const { stato, corpo } = await leggi(aMaster, '/api/scontri/scontro-prova');
  assert.equal(stato, 200);
  const s = JSON.parse(corpo);
  assert.equal(s.filtrato, undefined);
  const n = s.partecipanti.find((p) => p.id === 'nem:predone-delle-lande:2');
  assert.deepEqual([n.pv.attuali, n.stati, n.scheda.difese], [4, ['a-terra'], predone.difese]);
  assert.ok(s.registro.length > 0 && s.colpi.length === 1);
  assert.equal(validaScontro(s), null);
});

test('durate, perdite periodiche ed effetti: solo quelli del PG', () => {
  const s = scontroDiProva();
  const con = {
    ...s,
    durate: [{ partecipante: 'pg:Akira', stato: 'sanguinamento', nome: 'Sanguinamento', al: 3, rimasti: 3 },
      { partecipante: 'nem:predone-delle-lande:1', stato: 'accecato', nome: 'Accecato', al: 2, rimasti: 2 }],
    periodici: [{ bersaglio: 'pg:Akira', stato: 'sanguinamento', nome: 'Sanguinamento', valore: 2, dal: 1, ultimo: 1 },
      { bersaglio: 'nem:predone-delle-lande:1', stato: 'veleno', nome: 'Veleno', valore: 3, dal: 1, ultimo: 1 }],
    effetti: [{ uid: 'eff:1', nome: 'Terrore', livello: 1, da: 'nem:predone-delle-lande:1', daNome: 'Predone delle Lande 1', dal: 1, al: 3, testo: 'tre Round', concentrazione: false, bersagli: [{ id: 'pg:Akira', nome: 'Akira' }, { id: 'pg:Bea', nome: 'Bea' }] },
      { uid: 'eff:2', nome: 'Furia', livello: 2, da: 'nem:predone-delle-lande:1', daNome: 'Predone delle Lande 1', dal: 1, al: 4, testo: 'quattro Round', concentrazione: false, bersagli: [{ id: 'nem:predone-delle-lande:2', nome: 'Predone delle Lande 2' }] }],
  };
  const f = scontroPerGiocatori(con);
  assert.deepEqual(f.durate.map((d) => d.partecipante), ['pg:Akira']);
  assert.deepEqual(f.periodici.map((x) => x.bersaglio), ['pg:Akira']);
  // l'incantesimo del nemico sul PG resta (con il nome di chi l'ha lanciato); quello su un altro nemico no
  assert.deepEqual(f.effetti.map((e) => e.uid), ['eff:1']);
  assert.equal(f.effetti[0].daNome, 'Predone delle Lande 1');
  assert.equal(f.effetti[0].da, undefined);
  // niente campi nuovi dello scontro per sbaglio: l'elenco è di campi ammessi
  const inventato = scontroPerGiocatori({ ...con, segretoNuovo: { pv: 3 } });
  assert.equal(inventato.segretoNuovo, undefined);
});

test('«Attacca!» dal tablet: il bersaglio ha solo il nome, e il collegamento non porta numeri', async () => {
  const s = JSON.parse((await leggi(aTablet, '/api/scontri/scontro-prova')).corpo);
  const coll = collegamentoScontro(s, 'Akira', () => 99);
  assert.equal(coll.filtrato, true);
  const nemici = coll.partecipanti.filter((p) => p.tipo === 'nemico');
  assert.equal(nemici.length, 2);
  for (const n of nemici) {
    assert.deepEqual(Object.keys(n).sort(), ['id', 'lato', 'nome', 'tipo']);
    assert.equal(n.pv, undefined);
    assert.equal(n.difese, undefined);
    assert.equal(n.ar, undefined);
  }
  assert.deepEqual([coll.diTurno, coll.turnoDi], [true, 'Akira']);
  // sul PC del master, come prima: PV, Difese e AR per il bersaglio di «Attacca!»
  const intero = JSON.parse((await leggi(aMaster, '/api/scontri/scontro-prova')).corpo);
  const suo = collegamentoScontro(intero, 'Akira', () => 99).partecipanti.find((p) => p.tipo === 'nemico');
  assert.deepEqual([suo.pv.massimo > 0, suo.difese, suo.ar], [true, 99, predone.ar.totale]);
});

test('dal tablet lo scontro non si riscrive: si aggiunge solo una riga al registro', async () => {
  const prima = JSON.parse(readFileSync(SCONTRO, 'utf8'));
  // il PUT dell'intero file (com'era prima) toglierebbe i nemici: rifiutato
  const put = await fetch(`${aTablet}/api/scontri/scontro-prova`, { method: 'PUT', body: JSON.stringify(scontroPerGiocatori(prima)), headers: { 'Content-Type': 'application/json' } });
  assert.equal(put.status, 403);
  assert.match((await put.json()).errore, /solo il PC del master/);
  assert.deepEqual(JSON.parse(readFileSync(SCONTRO, 'utf8')), prima, 'il file non è cambiato');
  // la riga del registro (tiri di dado, attacchi) passa: la scrive il server sul file intero
  const r = await fetch(`${aTablet}/api/scontri/scontro-prova/riga`, { method: 'POST', body: JSON.stringify({ testo: 'Akira attacca Predone delle Lande 1 con Spada: VA 12, tiro 7 (app) → colpito.' }), headers: { 'Content-Type': 'application/json' } });
  assert.equal(r.status, 200);
  const esito = await r.json();
  assert.deepEqual([esito.ok, esito.revisione, esito.round], [true, prima.revisione + 1, 1]);
  const dopo = JSON.parse(readFileSync(SCONTRO, 'utf8'));
  assert.match(dopo.registro.at(-1).testo, /Akira attacca Predone delle Lande 1/);
  assert.deepEqual(dopo.partecipanti, prima.partecipanti, 'i nemici sono tutti lì, com’erano');
  assert.equal(validaScontro(dopo), null);
  // testo vuoto o lunghissimo: no
  for (const testo of ['', '  ', 'x'.repeat(501)]) {
    const no = await fetch(`${aTablet}/api/scontri/scontro-prova/riga`, { method: 'POST', body: JSON.stringify({ testo }), headers: { 'Content-Type': 'application/json' } });
    assert.equal(no.status, 400);
  }
});

test('il bestiario, la scena completa e il movimento dei nemici restano al master', async () => {
  // i tipi del bestiario: nemmeno l'elenco
  for (const percorso of ['/api/nemici', '/api/nemici/predone-delle-lande']) {
    assert.equal((await leggi(aTablet, percorso)).stato, 403);
  }
  assert.equal((await leggi(aMaster, '/api/nemici')).stato, 200);
  // la scena intera ha i token nascosti e i muri sotto la nebbia: al tablet solo ?vista=giocatori
  const piena = await leggi(aTablet, '/api/scene/cripta');
  assert.equal(piena.stato, 403);
  const filtrata = await leggi(aTablet, '/api/scene/cripta?vista=giocatori');
  assert.equal(filtrata.stato, 200);
  assert.ok(!filtrata.corpo.includes('t-p1'), 'il nemico nascosto non arriva');
  assert.ok(filtrata.corpo.includes('t-p2'), 'quello che si vede sì');
  assert.equal((await leggi(aMaster, '/api/scene/cripta')).stato, 200);
  // «Attacca!» chiede quanto ha corso l'attaccante: il proprio PG sì, un nemico no
  assert.equal((await leggi(aTablet, '/api/movimento-round?scontro=scontro-prova&partecipante=pg:Akira')).stato, 200);
  assert.equal((await leggi(aTablet, '/api/movimento-round?scontro=scontro-prova&partecipante=nem:predone-delle-lande:1')).stato, 403);
  assert.equal((await leggi(aMaster, '/api/movimento-round?scontro=scontro-prova&partecipante=nem:predone-delle-lande:1')).stato, 200);
});

test('la vista del tablet non porta numeri dei nemici (come prima, e qui si controlla)', async () => {
  const { stato, corpo } = await leggi(aTablet, '/api/vista-giocatori?pg=Akira');
  assert.equal(stato, 200);
  const v = JSON.parse(corpo);
  const nemico = v.scena.token.find((t) => t.id === 't-p2');
  assert.ok(nemico, 'il nemico visibile c’è');
  assert.deepEqual([nemico.info.nome, nemico.info.pv], ['Predone delle Lande 2', null], 'nome sì, barretta dei PV no');
  assert.ok(!v.scena.token.some((t) => t.id === 't-p1'), 'il nascosto non c’è');
  assert.ok(!corpo.includes('scheda') && !corpo.includes('difese'), 'nessuna scheda nella vista');
});
