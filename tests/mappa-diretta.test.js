// Mappa di battaglia, diretta del movimento nella vista giocatori (richiesta di Marcello del 07/10/2026,
// src/mappa/diretta.js): stato del master, filtro dei segreti (token nascosti, nebbia, ZoC, interruttori) e il flusso
// di eventi del server (PUT e GET /api/vista-giocatori/diretta), su cartelle temporanee e porta casuale.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, rettangolo, cella } from '../src/mappa/celle.js';
import { areaRaggiungibile, celleArea, fasceRimaste, percorso } from '../src/mappa/area.js';
import { statoDiretta, validaDiretta, direttaPerGiocatori, celleDellaDiretta, zocDellaDiretta, trattiPercorso, visibileAiGiocatori } from '../src/mappa/diretta.js';

const { dati } = await datiReali();
const C = 12, R = 8;

/** Scena 12 × 8: nebbia sulle colonne 9–11; PG in [2, 3]; nemico visibile in [5, 3], nemico nascosto in [3, 6], nemico sotto la nebbia in [10, 3]. */
function scena() {
  const s = nuovaScena({ id: 'prova', nome: 'Prova', colonne: C, righe: R, nebbia: 'scoperta', dati });
  s.nebbia.coperti = inBase64(rettangolo(daBase64(s.nebbia.coperti), C, R, 9, 0, 11, R - 1, true));
  s.token = [
    { id: 'pg', rif: { tipo: 'segnaposto', id: 'a' }, nome: 'Oshi', q: [2, 3], ingombro: 1, nascosto: false },
    { id: 'nem', rif: { tipo: 'segnaposto', id: 'b' }, nome: 'Predone', q: [5, 3], ingombro: 1, nascosto: false },
    { id: 'nascosto', rif: { tipo: 'segnaposto', id: 'c' }, nome: 'Agguato', q: [3, 6], ingombro: 1, nascosto: true },
    { id: 'nebbia', rif: { tipo: 'segnaposto', id: 'd' }, nome: 'Ombra', q: [10, 3], ingombro: 1, nascosto: false },
  ];
  return s;
}
const MOV = { passo: 6, corsa: 12, scatto: 18 };
function area(s, chi = s.token[0]) {
  return areaRaggiungibile({ colonne: C, righe: R, muri: daBase64(s.muri), terreno: daBase64(s.terreno), token: [], chi: { id: chi.id, q: chi.q, ingombro: 1, lato: 'pg' }, massimo: 18, regole: dati.mappa.movimento });
}
const zocDi = (s, ...id) => id.map((x) => ({ token: s.token.find((t) => t.id === x), portata: 1 }));
function diretta(s, o = {}) {
  const a = area(s);
  const fino = [10, 3];
  return statoDiretta({
    scena: s, token: s.token[0], modo: 'corsa', usato: 0, disponibili: 12, celle: celleArea(a, fasceRimaste(MOV, 0), 2),
    percorso: { punti: percorso(a, fino), costo: 8, fascia: 'corsa' }, zoc: zocDi(s, 'nem', 'nascosto', 'nebbia'), quando: 1, ...o,
  });
}

test('stato del master: forma valida, tre maschere dell\'area, percorso e ZoC; null = nessuna selezione', () => {
  const s = scena();
  const d = diretta(s);
  assert.equal(validaDiretta(d), null);
  assert.equal(validaDiretta(null), null);
  assert.equal(d.area.length, 3);
  assert.deepEqual(d.zoc.map((a) => a.token), ['nem', 'nascosto', 'nebbia']);
  assert.match(validaDiretta({ ...d, modo: 'vola' }), /^modo/);
  assert.match(validaDiretta({ ...d, percorso: { punti: [[1]], costo: 1 } }), /^percorso/);
  assert.match(validaDiretta({ ...d, versione: 2 }), /^versione/);
  // gli interruttori del master sono campi della scena
  assert.equal(validaScena({ ...s, revisione: 0, movimentoGiocatori: false, zocGiocatori: true }, dati), null);
  assert.match(validaScena({ ...s, revisione: 0, zocGiocatori: 'no' }, dati), /zocGiocatori/);
});

test('filtro: area senza i Q sotto la nebbia, percorso interrotto nella nebbia, ZoC dei soli avversari visibili', () => {
  const s = scena();
  const g = direttaPerGiocatori(diretta(s), s);
  const nebbia = daBase64(s.nebbia.coperti);
  const celle = celleDellaDiretta(g, s);
  // dentro la Corsa ma sotto la nebbia: niente
  assert.ok(celle[3 * C + 8] > 0, 'Q visibile dell\'area');
  for (let y = 0; y < R; y++) for (let x = 9; x < C; x++) assert.equal(celle[y * C + x], 0, `Q ${x},${y} sotto la nebbia`);
  // percorso verso [10, 3]: i passi nella nebbia diventano interruzioni, il costo resta
  assert.ok(g.percorso.punti.some((p) => p === null));
  for (const p of g.percorso.punti.filter(Boolean)) assert.ok(!cella(nebbia, C, R, p[0], p[1]));
  assert.equal(trattiPercorso(g.percorso.punti).length, 1);
  assert.equal(g.percorso.costo, 8);
  // ZoC: solo il nemico visibile, senza id
  assert.deepEqual(g.zoc, [{ q: [5, 3], ingombro: 1, portata: 1 }]);
  const zoc = zocDellaDiretta(g, s);
  assert.equal(zoc[3 * C + 6], 1, 'attorno al nemico visibile');
  assert.equal(zoc[6 * C + 4], 0, 'niente ZoC del nascosto');
  assert.equal(zoc[3 * C + 9], 0, 'niente ZoC sotto la nebbia');
  const testo = JSON.stringify(g);
  for (const segreto of ['nascosto', 'Agguato', '"nebbia"', 'Ombra']) assert.ok(!testo.includes(segreto), segreto);
});

test('filtro: token nascosto o sotto la nebbia, altra scena, interruttori del master', () => {
  const s = scena();
  const d = diretta(s);
  assert.equal(direttaPerGiocatori(d, { ...s, token: s.token.map((t) => (t.id === 'pg' ? { ...t, nascosto: true } : t)) }), null, 'token scelto nascosto');
  assert.equal(direttaPerGiocatori({ ...d, q: [10, 3] }, s), null, 'token scelto (già spostato) sotto la nebbia');
  assert.equal(direttaPerGiocatori({ ...d, token: 'nascosto', q: [3, 6] }, s), null, 'il master muove il nascosto');
  assert.equal(direttaPerGiocatori({ ...d, scena: 'altra' }, s), null, 'altra scena');
  assert.equal(direttaPerGiocatori(d, { ...s, movimentoGiocatori: false }), null, '«Mostra il movimento» spento');
  const senzaZoc = direttaPerGiocatori(d, { ...s, zocGiocatori: false });
  assert.equal(senzaZoc.zoc, null, '«Mostra le ZoC» spento');
  assert.ok(senzaZoc.area);
  assert.equal(direttaPerGiocatori(null, s), null);
  assert.equal(direttaPerGiocatori({ ...d, modo: 'vola' }, s), null, 'stato non valido');
  // template (fase 2, lotto 1): l'anteprima, anche senza token e con il movimento spento; niente nascosti né sotto la nebbia
  const tp = (id, origine, o = {}) => ({ id, forma: 'cerchio', origine, misure: { raggio: 1 }, colore: '#f76707', nascosto: false, ...o });
  const t = direttaPerGiocatori({ ...d, template: [tp('a', [1, 1]), tp('b', [1, 1], { nascosto: true }), tp('c', [10, 3])] }, s, dati.mappa.template);
  assert.deepEqual(t.template.map((x) => x.id), ['a']);
  assert.ok(!('origine' in t.template[0]), 'arriva la maschera dei Q visibili, non la forma');
  const solo = direttaPerGiocatori({ versione: 1, scena: 'prova', token: null, template: [tp('a', [1, 1])], quando: 1 }, { ...s, movimentoGiocatori: false }, dati.mappa.template);
  assert.equal(solo.token, null);
  assert.equal(solo.template.length, 1);
  assert.equal(direttaPerGiocatori({ versione: 1, scena: 'prova', token: null, template: [tp('c', [10, 3])], quando: 1 }, s, dati.mappa.template), null, 'tutto sotto la nebbia: niente');
  assert.equal(direttaPerGiocatori({ ...d, template: [tp('a', [1, 1])] }, s).template.length, 0, 'senza regole nessun template');
  // visibile = non nascosto e almeno un Q fuori dalla nebbia (una pedina 2 × 2 sul confine si vede)
  assert.ok(visibileAiGiocatori({ q: [8, 1], ingombro: 2 }, s));
  assert.ok(!visibileAiGiocatori({ q: [9, 1], ingombro: 2 }, s));
});

// ── server ──
const radice = mkdtempSync(join(tmpdir(), 'mutant-diretta-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base;
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  writeFileSync(join(c.scene, 'prova.json'), JSON.stringify({ ...scena(), revisione: 1 }));
  writeFileSync(join(c.tavolo, 'mappa-giocatori.json'), JSON.stringify({ versione: 1, scena: 'prova' }));
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

/** Legge gli eventi del flusso finché `basta(eventi)` non è vero. */
async function eventi(basta, azione = async () => {}) {
  const ctrl = new AbortController();
  const r = await fetch(`${base}/api/vista-giocatori/diretta`, { signal: ctrl.signal });
  assert.match(r.headers.get('content-type'), /^text\/event-stream/);
  const lettore = r.body.getReader();
  const dec = new TextDecoder();
  const visti = [];
  let resto = '';
  let fatta = false;
  for (;;) {
    const { value, done } = await lettore.read();
    if (done) break;
    resto += dec.decode(value, { stream: true });
    const blocchi = resto.split('\n\n');
    resto = blocchi.pop();
    for (const b of blocchi) {
      const ev = /^event: (.+)$/m.exec(b)?.[1];
      const dati = /^data: (.+)$/m.exec(b)?.[1];
      if (ev) visti.push({ evento: ev, dati: JSON.parse(dati), ora: Date.now() });
    }
    if (!fatta && visti.length) { fatta = true; await azione(); }
    if (basta(visti)) break;
  }
  ctrl.abort();
  return visti;
}
const manda = (d) => fetch(`${base}/api/vista-giocatori/diretta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });

test('server: il master manda la diretta, la vista giocatori la riceve filtrata; null la toglie', async () => {
  const s = scena();
  const ricevuti = await eventi((v) => v.filter((x) => x.evento === 'diretta').length >= 3, async () => {
    assert.equal((await manda(diretta(s, { quando: Date.now() }))).status, 200);
    assert.equal((await manda(null)).status, 200);
  });
  const dirette = ricevuti.filter((x) => x.evento === 'diretta').map((x) => x.dati);
  assert.equal(dirette[0], null, 'all\'inizio nessuna selezione');
  assert.equal(dirette[1].token, 'pg');
  assert.deepEqual(dirette[1].zoc, [{ q: [5, 3], ingombro: 1, portata: 1 }]);
  assert.ok(!JSON.stringify(dirette[1]).includes('nascosto'));
  assert.equal(dirette[2], null, 'deselezionato: sparisce');
  assert.equal((await manda({ versione: 1 })).status, 400);
});

test('server: il master muove il token nascosto: ai giocatori non arriva nulla', async () => {
  const s = scena();
  await manda(null);
  const ricevuti = await eventi((v) => v.length >= 2, async () => {
    await manda(diretta(s, { token: s.token.find((t) => t.id === 'nascosto') }));
    await manda(diretta(s, { quando: 2 }));
  });
  const dirette = ricevuti.filter((x) => x.evento === 'diretta').map((x) => x.dati);
  assert.equal(dirette.length, 2, 'la diretta del nascosto è null come prima: nessun evento');
  assert.equal(dirette[1].token, 'pg');
});

test('server: salvare la scena manda «aggiorna» e rifiltra (token nascosto dal master: la diretta sparisce)', async () => {
  const s = scena();
  await manda(diretta(s, { quando: 3 }));
  const ricevuti = await eventi((v) => v.some((x) => x.evento === 'diretta' && x.dati === null), async () => {
    const nuova = { ...s, revisione: 1, token: s.token.map((t) => (t.id === 'pg' ? { ...t, nascosto: true } : t)) };
    const r = await fetch(`${base}/api/scene/prova`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuova) });
    assert.equal(r.status, 200);
  });
  assert.ok(ricevuti.some((x) => x.evento === 'aggiorna'));
});

test('server: «Adatta lo schermo dei giocatori» manda l’evento «adatta» alle viste aperte', async () => {
  const ricevuti = await eventi((v) => v.some((x) => x.evento === 'adatta'), async () => {
    const r = await fetch(`${base}/api/vista-giocatori/adatta`, { method: 'POST' });
    assert.equal(r.status, 200);
    assert.ok((await r.json()).giocatori >= 1);
  });
  assert.ok(ricevuti.some((x) => x.evento === 'adatta'));
  assert.equal((await fetch(`${base}/api/vista-giocatori/adatta`)).status, 405);
});

test('vista giocatori, «Adatta allo schermo»: la parte scoperta della mappa, nel riquadro con il margine', async () => {
  const { rettangoloScoperto } = await import('../src/mappa/nebbia.js');
  const { adattaRettangolo } = await import('../src/mappa/camera.js');
  const s = scena();
  const g = { ...s.griglia, q_px: 10, scosto_x: 0, scosto_y: 0 };
  // scoperte le colonne 0–8 (la nebbia copre 9–11), tutte le righe
  assert.deepEqual(rettangoloScoperto(daBase64(s.nebbia.coperti), g), { x: 0, y: 0, larghezza: 90, altezza: 80 });
  const tutta = inBase64(rettangolo(daBase64(s.nebbia.coperti), C, R, 0, 0, C - 1, R - 1, true));
  assert.equal(rettangoloScoperto(daBase64(tutta), g), null, 'tutta coperta: si adatta alla mappa intera');
  const V = dati.mappa.vista;
  const cam = adattaRettangolo({ x: 100, y: 50, larghezza: 200, altezza: 100 }, 448, 248, V);
  assert.equal(cam.scala, 2);
  assert.deepEqual([cam.ox + 100 * cam.scala, cam.oy + 50 * cam.scala], [24, 24], 'l’angolo del rettangolo al margine');
});
