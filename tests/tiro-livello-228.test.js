import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 228 — A.297 (Davide, 19/11/2026): il primo tiro dei PV e dei PM all'avanzamento vale, e non si rifà.
//
// Com'era prima (verificato leggendo il codice e provato in rosso più sotto): la bozza del livello stava solo in memoria, «Tira»
// ripremuto sostituiva il risultato, il campo a mano si poteva riscrivere, cambiare Classe azzerava i tiri, chiudere la schermata li
// perdeva, e «Annulla l'ultimo livello» li buttava. Adesso il primo risultato è nel file del personaggio.
//
// I due test che devono restare verdi sempre:
//   1. un tiro già registrato NON cambia dopo aver chiuso e riaperto la schermata (cioè dopo serializza → deserializza → una nuova bozza);
//   2. un giocatore — non il Direttore — NON riesce a modificarlo: né dalla funzione, né da un tablet verso il server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { cartellaComeDavide } from './cartella-come-davide.mjs';
import { datiReali } from './helpers.js';
import { nuoveScelte, serializza, deserializza, normalizza } from '../src/character.js';
import { personaggi } from '../tools/adegua-abilita.mjs';
import {
  registraTiro, correggiTiro, liberaTiri, registraDaEvento, tiriPerVoce, tiroRegistrato, classeBloccata, tiriDelLivello,
  normalizzaTiriAvanzamento, controllaTiriDaTablet,
} from '../src/tiri-avanzamento.js';

const { dati } = await datiReali();
const QUANDO = new Date('2026-11-20T09:00:00.000Z');
const base = () => ({ ...nuoveScelte(), nome: 'Prova' });
const primo = (s, dado, valore, origine = 'app', classe = 'Agente', facce = 8) => registraTiro(s, 8, dado, { valore, origine }, { classe, facce, quando: QUANDO });

// ——— 1. il primo risultato resta ———————————————————————————————————————————————————————————————————————————————————————

test('il primo tiro si registra, il secondo no: né «Tira» di nuovo né il campo a mano (anche a mano è il primo che vale)', () => {
  const r1 = primo(base(), 'PV', 5);
  assert.equal(r1.ok, true);
  const r2 = registraTiro(r1.scelte, 8, 'PV', { valore: 8, origine: 'app' }, { classe: 'Agente', facce: 8, quando: QUANDO });
  assert.equal(r2.ok, false); assert.equal(r2.bloccato, true);
  assert.deepEqual(r2.tiro, { valore: 5, origine: 'app' }, 'si dice quale tiro vale');
  const r3 = registraTiro(r1.scelte, 8, 'PV', { valore: 2, origine: 'manuale' }, { classe: 'Agente', facce: 8 });
  assert.equal(r3.ok, false, 'nemmeno inserendolo a mano');
  assert.deepEqual(tiroRegistrato(r1.scelte, 8, 'PV'), { valore: 5, origine: 'app' });
});

test('un dado per i PV e uno per i PM: un tiro ciascuno, indipendenti; i contributi fissi non c\'entrano', () => {
  let s = primo(base(), 'PV', 5).scelte;
  const pm = primo(s, 'PM', 3, 'manuale'); assert.equal(pm.ok, true);
  s = pm.scelte;
  assert.deepEqual(tiroRegistrato(s, 8, 'PV'), { valore: 5, origine: 'app' });
  assert.deepEqual(tiroRegistrato(s, 8, 'PM'), { valore: 3, origine: 'manuale' });
  assert.equal(primo(s, 'PM', 1).ok, false);
});

test('un valore fuori dal dado non si registra: nessun tiro «impossibile» resta bloccato', () => {
  assert.equal(primo(base(), 'PV', 9).ok, false);
  assert.equal(primo(base(), 'PV', 0).ok, false);
  assert.equal(primo(base(), 'PV', 3.5).ok, false);
});

test('CHIUDERE E RIAPRIRE LA SCHERMATA NON MUOVE UN TIRO GIÀ REGISTRATO: serializza → deserializza → bozza nuova → stesso risultato, e il secondo tiro è ancora rifiutato', () => {
  const s = primo(base(), 'PV', 6).scelte;
  const file = serializza(s, { versioniDati: {}, livelli: [], sessione: null });
  const scelte2 = normalizza(deserializza(file), dati).scelte; // come la legge l'app all'apertura
  assert.deepEqual(tiroRegistrato(scelte2, 8, 'PV'), { valore: 6, origine: 'app' }, 'il file lo conserva');
  // la bozza nuova riparte da lì: Classe e dadi
  assert.deepEqual(tiriPerVoce(scelte2, 8, 'Agente'), { tiroPV: { valore: 6, origine: 'app' } });
  assert.equal(classeBloccata(scelte2, 8), 'Agente');
  // e il tentativo di rifarlo dopo la riapertura fallisce
  const ancora = registraTiro(scelte2, 8, 'PV', { valore: 1, origine: 'app' }, { classe: 'Agente', facce: 8 });
  assert.equal(ancora.ok, false);
  assert.equal(tiroRegistrato(scelte2, 8, 'PV').valore, 6, 'non si è mosso');
  // MUTANTE: senza il blocco (un registro che si lasciasse sovrascrivere) il valore cambierebbe
  const mutante = { ...scelte2, tiriAvanzamento: { 8: { ...scelte2.tiriAvanzamento[8], PV: { ...scelte2.tiriAvanzamento[8].PV, valore: 1 } } } };
  assert.notEqual(tiroRegistrato(mutante, 8, 'PV').valore, tiroRegistrato(scelte2, 8, 'PV').valore);
});

test('la Classe si fissa con il primo tiro: un\'altra Classe (altro dado) sarebbe un secondo tiro', () => {
  const s = primo(base(), 'PV', 6, 'app', 'Agente', 8).scelte;
  assert.deepEqual(tiriPerVoce(s, 8, 'Assaltatore'), {}, 'cambiando Classe i tiri non passano');
  const r = registraTiro(s, 8, 'PM', { valore: 2, origine: 'app' }, { classe: 'Assaltatore', facce: 6 });
  assert.equal(r.ok, false); assert.match(r.motivo, /Classe/);
});

test('un file di prima (senza registro) resta identico byte per byte: il campo si scrive solo se c\'è', () => {
  const f = serializza(base(), { versioniDati: {}, livelli: [], sessione: null });
  assert.ok(!f.includes('tiriAvanzamento'));
  assert.equal(normalizzaTiriAvanzamento({ x: 1, 8: { PV: { valore: 'a' } } }), null, 'il malformato si scarta');
});

test('annullare un livello (dal giocatore) non libera i tiri: rifarlo restituisce gli stessi dadi', () => {
  const evento = { grado: { classe: 'Agente' }, tiroPV: { valore: 7, origine: 'manuale' }, tiroPM: { valore: 2, origine: 'app' } };
  const s = registraDaEvento(base(), 8, evento, { PV: 8, PM: 4 }, QUANDO);
  assert.deepEqual(tiroRegistrato(s, 8, 'PV'), { valore: 7, origine: 'manuale' });
  assert.deepEqual(tiroRegistrato(s, 8, 'PM'), { valore: 2, origine: 'app' });
  assert.equal(registraTiro(s, 8, 'PV', { valore: 1, origine: 'app' }, { classe: 'Agente', facce: 8 }).ok, false);
  // un registro già presente non si sovrascrive dall'evento
  const gia = primo(base(), 'PV', 4).scelte;
  assert.equal(tiroRegistrato(registraDaEvento(gia, 8, evento, { PV: 8, PM: 4 }, QUANDO), 8, 'PV').valore, 4);
});

// ——— 2. solo il Direttore corregge ————————————————————————————————————————————————————————————————————————————————————————

test('UN GIOCATORE NON MODIFICA UN TIRO REGISTRATO: nessun valore tranne master === true apre la correzione', () => {
  const s = primo(base(), 'PV', 3).scelte;
  for (const master of [false, undefined, null, 0, 1, 'true', 'master', {}, []]) {
    const r = correggiTiro(s, 8, 'PV', 6, { master, motivo: 'il dado mostrava 6' });
    assert.equal(r.ok, false, `master=${JSON.stringify(master)} non deve passare`);
  }
  assert.equal(liberaTiri(s, 8, {}).ok, false);
  assert.equal(liberaTiri(s, 8, { master: 'sì' }).ok, false);
  assert.equal(tiroRegistrato(s, 8, 'PV').valore, 3);
});

test('il Direttore corregge un errore materiale: 3 trascritto, il dado mostrava 6 → 6, con motivo e valore di prima; non è un ritiro', () => {
  const s = primo(base(), 'PV', 3, 'manuale').scelte;
  assert.equal(correggiTiro(s, 8, 'PV', 6, { master: true, motivo: '' }).ok, false, 'senza motivo no');
  assert.equal(correggiTiro(s, 8, 'PV', 9, { master: true, motivo: 'x' }).ok, false, 'fuori dal dado no');
  assert.equal(correggiTiro(s, 8, 'PV', 3, { master: true, motivo: 'x' }).ok, false, 'è già 3: il dado che mostra 3 resta 3');
  assert.equal(correggiTiro(s, 8, 'PM', 2, { master: true, motivo: 'x' }).ok, false, 'un tiro che non c\'è non si «corregge»');
  const r = correggiTiro(s, 8, 'PV', 6, { master: true, motivo: 'il dado mostrava 6', quando: QUANDO });
  assert.equal(r.ok, true);
  assert.equal(tiroRegistrato(r.scelte, 8, 'PV').valore, 6);
  assert.deepEqual(tiriDelLivello(r.scelte, 8).PV.corretto, { da: 3, motivo: 'il dado mostrava 6', quando: QUANDO.toISOString() });
  assert.equal(tiriDelLivello(r.scelte, 8).PV.origine, 'manuale', 'l\'origine non cambia');
  // il Direttore può liberare i tiri (dopo aver annullato il livello)
  const l = liberaTiri(s, 8, { master: true });
  assert.equal(l.ok, true); assert.equal(tiriDelLivello(l.scelte, 8), null);
});

// ——— 3. il server: dal tablet non si cambia ————————————————————————————————————————————————————————————————————————————————

const evento = (c = 'Agente') => ({ grado: { classe: c }, tiroPV: { valore: 5, origine: 'app' }, tiroPM: { valore: 2, origine: 'app' } });
const file = (scelte, livelli = []) => ({ scelte, livelli });

test('controllaTiriDaTablet: cambiare, cancellare o ritoccare un tiro registrato è 403; il primo tiro e l\'aggiunta del PM passano', () => {
  const sPV = primo(base(), 'PV', 5).scelte;
  const disco = file(sPV);
  assert.equal(controllaTiriDaTablet(file(base()), null).ok, true, 'senza file sul disco non c\'è niente da proteggere');
  assert.equal(controllaTiriDaTablet(file(sPV), disco).ok, true, 'invariato');
  // il PM dopo il PV: è un tiro nuovo
  const conPM = primo(sPV, 'PM', 3).scelte;
  assert.equal(controllaTiriDaTablet(file(conPM), disco).ok, true);
  // il primo tiro di un livello senza registro sul disco
  assert.equal(controllaTiriDaTablet(file(sPV), file(base())).ok, true);
  // MODIFICARE
  const modificato = { ...sPV, tiriAvanzamento: { 8: { ...sPV.tiriAvanzamento[8], PV: { ...sPV.tiriAvanzamento[8].PV, valore: 8 } } } };
  const m = controllaTiriDaTablet(file(modificato), disco);
  assert.equal(m.ok, false); assert.equal(m.stato, 403);
  // CANCELLARE (il blocco, o il livello)
  assert.equal(controllaTiriDaTablet(file({ ...sPV, tiriAvanzamento: null }), disco).ok, false);
  // CAMBIARE CLASSE
  const altra = { ...sPV, tiriAvanzamento: { 8: { ...sPV.tiriAvanzamento[8], classe: 'Assaltatore' } } };
  assert.equal(controllaTiriDaTablet(file(altra), disco).ok, false);
});

test('controllaTiriDaTablet: un livello confermato non porta un tiro diverso dal registro, e un tiro già confermato non si ritocca', () => {
  const s = primo(primo(base(), 'PV', 5).scelte, 'PM', 2).scelte;
  const livelli8 = Array.from({ length: 6 }, () => ({})).concat([{ ...evento() }]); // l'evento 7 (indice 6) è il livello 8
  // i livelli 2..7 senza tiri, l'8° con quelli del registro: ok
  assert.equal(controllaTiriDaTablet(file(s, livelli8), file(s, livelli8.slice(0, 6))).ok, true);
  // l'8° con un PV diverso da quello registrato: no
  const falso = livelli8.slice(0, 6).concat([{ ...evento(), tiroPV: { valore: 8, origine: 'app' } }]);
  assert.equal(controllaTiriDaTablet(file(s, falso), file(s, livelli8.slice(0, 6))).ok, false);
  // un livello già sul disco: il suo tiro non cambia
  assert.equal(controllaTiriDaTablet(file(s, falso), file(s, livelli8)).ok, false);
  // annullato dal giocatore: l'evento sparisce, il registro resta: passa
  assert.equal(controllaTiriDaTablet(file(s, livelli8.slice(0, 6)), file(s, livelli8)).ok, true);
});

// ——— 4. la strada vera: server NON master e server master ——————————————————————————————————————————————————————————————————

let serata, srvTablet, srvMaster, urlT, urlM;
before(async () => {
  serata = cartellaComeDavide({ escludi: ['Fratello-Anselmo'] });
  const c = Object.fromEntries(['tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(serata.base, k)]));
  for (const x of Object.values(c)) mkdirSync(x, { recursive: true });
  srvTablet = creaServer({ cartella: serata.cartella, ...c, eMaster: () => false });
  srvMaster = creaServer({ cartella: serata.cartella, ...c, eMaster: () => true });
  await Promise.all([srvTablet, srvMaster].map((x) => new Promise((ok) => x.listen(0, '127.0.0.1', ok))));
  urlT = `http://127.0.0.1:${srvTablet.address().port}`;
  urlM = `http://127.0.0.1:${srvMaster.address().port}`;
});
after(async () => { await Promise.all([srvTablet, srvMaster].map((x) => new Promise((ok) => x.close(ok)))); rmSync(serata.base, { recursive: true, force: true }); });

const put = (url, v, f) => fetch(`${url}/api/personaggi/${encodeURIComponent(v.file)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
const conTiri = (o, tiri) => ({ ...o, scelte: { ...o.scelte, tiriAvanzamento: tiri } });
const livello = (v) => 2 + (v.json.livelli?.length ?? 0);

test('SERVER: il tablet registra il primo tiro; poi non lo cambia, non lo cancella; il Direttore (PC del server) sì, con la correzione', async () => {
  const v = personaggi(serata.cartella)[0];
  const L = livello(v);
  const registro = (valore) => ({ [L]: { classe: 'Agente', PV: { valore, origine: 'app', facce: 8, quando: QUANDO.toISOString() } } });
  // 1. il primo tiro dal tablet: passa
  let r = await put(urlT, v, conTiri(v.json, registro(4)));
  assert.equal(r.status, 200, await r.text());
  const v1 = personaggi(serata.cartella).find((x) => x.nome === v.nome);
  assert.equal(v1.json.scelte.tiriAvanzamento[L].PV.valore, 4, 'sul disco');
  // 2. lo stesso tablet lo cambia: 403
  r = await put(urlT, v1, conTiri(v1.json, registro(8)));
  assert.equal(r.status, 403);
  assert.equal((await r.json()).tiriLivello, true);
  // 3. lo cancella: 403
  r = await put(urlT, v1, conTiri(v1.json, null));
  assert.equal(r.status, 403);
  // 4. sul disco è ancora 4
  assert.equal(personaggi(serata.cartella).find((x) => x.nome === v.nome).json.scelte.tiriAvanzamento[L].PV.valore, 4);
  // 5. il Direttore corregge un errore materiale: passa
  const corretto = { [L]: { classe: 'Agente', PV: { valore: 6, origine: 'app', facce: 8, quando: QUANDO.toISOString(), corretto: { da: 4, motivo: 'il dado mostrava 6', quando: QUANDO.toISOString() } } } };
  r = await put(urlM, v1, conTiri(v1.json, corretto));
  assert.equal(r.status, 200, await r.text());
  assert.equal(personaggi(serata.cartella).find((x) => x.nome === v.nome).json.scelte.tiriAvanzamento[L].PV.valore, 6);
});
