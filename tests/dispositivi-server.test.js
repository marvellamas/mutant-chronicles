// «Il tablet è una vista» (21/10/2026): GET/POST /api/dispositivo (ogni dispositivo), GET /api/dispositivi e PUT
// /api/dispositivi/<id> (solo il Direttore), e l'enforcement su PUT /api/personaggi/<file>: chi dichiara
// X-Mutant-Da: giocatore e porta un X-Mutant-Dispositivo scrive solo il personaggio che ha scelto.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { deserializzaPersonaggio, normalizza, serializza, nomeFileEsportazione } from '../src/character.js';
import { idPersonaggio } from '../src/storico-personaggi.js';
import { chiaveDaFile } from '../src/cartella.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-dispositivi-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srvMaster, baseMaster, srvTablet, baseTablet;
const ID1 = 'd-tablet-uno-1234';
const ID2 = 'd-tablet-due-5678';

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  srvMaster = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster: () => true });
  await new Promise((ok) => srvMaster.listen(0, '127.0.0.1', ok));
  baseMaster = `http://127.0.0.1:${srvMaster.address().port}`;
  srvTablet = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster: () => false });
  await new Promise((ok) => srvTablet.listen(0, '127.0.0.1', ok));
  baseTablet = `http://127.0.0.1:${srvTablet.address().port}`;
});
after(async () => {
  await new Promise((ok) => srvMaster.close(ok));
  await new Promise((ok) => srvTablet.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

/** Scrive un PG d'esempio nella cartella di prova (come fa la scheda al salvataggio), restituisce { file, testo, pg }. */
async function metti(nomeEsempio, { livello = 1 } = {}) {
  const testoBase = readFileSync(new URL(`../esempi/${nomeEsempio}`, import.meta.url), 'utf8');
  const p = deserializzaPersonaggio(testoBase);
  const { scelte } = normalizza(p.creazione, dati);
  const esportato = serializza(scelte, { versioniDati: JSON.parse(testoBase).versioni_dati, livelli: p.livelli, sessione: p.sessione, pg: JSON.parse(testoBase).pg });
  const file = nomeFileEsportazione(scelte.nome, 1 + p.livelli.length, new Date(2026, 9, 21));
  const w = await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: esportato });
  assert.equal(w.status, 200, await w.text());
  // identificativo stabile: il `pg` del file, o — per gli esempi di prima senza `pg` — il ripiego sul «Nome» del
  // file (idPersonaggio, come fa il server): è quello che risolve il nome del file DOPO la scrittura, non prima.
  const pg = idPersonaggio(JSON.parse(testoBase), chiaveDaFile(file));
  return { file, testo: esportato, pg, nome: scelte.nome };
}

test('GET /api/dispositivo senza l’intestazione: 400', async () => {
  const r = await fetch(`${baseTablet}/api/dispositivo`);
  assert.equal(r.status, 400);
});

test('GET /api/dispositivo con un dispositivo che non ha ancora scelto: si è fatto vivo, ma pgId è null', async () => {
  // 21/10/2026 pomeriggio, parte B: il GET crea il record (si è fatto vivo), per «da quanto tempo» del Direttore;
  // il personaggio resta null finché non sceglie.
  const r = await fetch(`${baseTablet}/api/dispositivo`, { headers: { 'X-Mutant-Dispositivo': ID1 } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.pgId, null);
  assert.equal(j.pgNome, null);
  assert.match(j.aggiornato, /^\d{4}-\d\d-\d\dT/);
});

test('POST /api/dispositivo con un pgId che non esiste: 404', async () => {
  const r = await fetch(`${baseTablet}/api/dispositivo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': ID1 }, body: JSON.stringify({ pgId: 'pg-non-esiste' }),
  });
  assert.equal(r.status, 404);
});

test('POST /api/dispositivo con un personaggio vero: sceglie, GET lo rilegge, e si può cambiare', async () => {
  const aiko = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  const post = await fetch(`${baseTablet}/api/dispositivo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': ID1 }, body: JSON.stringify({ pgId: aiko.pg }),
  });
  assert.equal(post.status, 200);
  const j1 = await post.json();
  assert.equal(j1.pgId, aiko.pg);
  const get = await fetch(`${baseTablet}/api/dispositivo`, { headers: { 'X-Mutant-Dispositivo': ID1 } });
  assert.deepEqual((await get.json()).pgId, aiko.pg);

  // un secondo personaggio, e il dispositivo cambia scelta
  const botha = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  const cambia = await fetch(`${baseTablet}/api/dispositivo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': ID1 }, body: JSON.stringify({ pgId: botha.pg }),
  });
  assert.equal(cambia.status, 200);
  assert.equal((await cambia.json()).pgId, botha.pg);
});

test('PUT /api/personaggi/<file>: con X-Mutant-Da: giocatore e un dispositivo non associato, 403', async () => {
  const p = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  const w = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(p.file)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': ID2 }, body: p.testo,
  });
  assert.equal(w.status, 403);
  const j = await w.json();
  assert.equal(j.nonAutorizzato, true);
});

test('PUT /api/personaggi/<file>: un dispositivo associato a un altro PG viene rifiutato (non sovrascrive)', async () => {
  const uno = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  const due = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  const primaDelTentativo = JSON.parse(readFileSync(join(c.personaggi, due.file), 'utf8')).versione_salvataggio;
  await fetch(`${baseTablet}/api/dispositivo`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': ID2 }, body: JSON.stringify({ pgId: uno.pg }) });
  const w = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(due.file)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': ID2 }, body: due.testo,
  });
  assert.equal(w.status, 403);
  // il file non deve essere cambiato dal tentativo rifiutato: stessa versione di prima
  const letto = JSON.parse(readFileSync(join(c.personaggi, due.file), 'utf8'));
  assert.equal(letto.versione_salvataggio, primaDelTentativo);
});

test('PUT /api/personaggi/<file>: il proprio PG si scrive', async () => {
  const p = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  await fetch(`${baseTablet}/api/dispositivo`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': ID1 }, body: JSON.stringify({ pgId: p.pg }) });
  const w = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(p.file)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': ID1 }, body: p.testo,
  });
  assert.equal(w.status, 200, await w.text());
});

test('PUT senza X-Mutant-Dispositivo, o senza X-Mutant-Da: giocatore: il controllo non si applica (compatibilità)', async () => {
  const p = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  const senzaDispositivo = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(p.file)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore' }, body: p.testo,
  });
  assert.equal(senzaDispositivo.status, 200);
  const senzaChi = await fetch(`${baseTablet}/api/personaggi/${encodeURIComponent(p.file)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': ID2 }, body: p.testo,
  });
  assert.equal(senzaChi.status, 200);
});

test('PUT dal PC del master: il controllo non si applica mai, qualunque dispositivo dichiari', async () => {
  const p = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  await fetch(`${baseTablet}/api/dispositivo`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': ID2 }, body: JSON.stringify({ pgId: 'pg-altro' }) }).catch(() => {});
  const w = await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(p.file)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': ID2 }, body: p.testo,
  });
  assert.equal(w.status, 200);
});

test('PUT dal PC del master: resta autorizzato anche se la richiesta dichiara (per errore) X-Mutant-Da: giocatore', async () => {
  // req.mutantMaster viene dall'indirizzo di rete, non dall'intestazione: un client che sbagliasse a dichiararsi
  // non deve poter bloccare il PC del Direttore, che resta sempre autorizzato.
  const uno = await metti('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  const due = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  await fetch(`${baseMaster}/api/dispositivo`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mutant-Dispositivo': ID2 }, body: JSON.stringify({ pgId: uno.pg }) });
  const w = await fetch(`${baseMaster}/api/personaggi/${encodeURIComponent(due.file)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Mutant-Da': 'giocatore', 'X-Mutant-Dispositivo': ID2 }, body: due.testo,
  });
  assert.equal(w.status, 200, await w.text());
});

test('GET /api/dispositivi: solo il Direttore', async () => {
  const no = await fetch(`${baseTablet}/api/dispositivi`);
  assert.equal(no.status, 403);
  const si = await fetch(`${baseMaster}/api/dispositivi`);
  assert.equal(si.status, 200);
  const lista = await si.json();
  assert.ok(Array.isArray(lista));
  assert.ok(lista.some((d) => d.id === ID1));
});

test('PUT /api/dispositivi/<id>: il Direttore corregge l’abbinamento, e lo può togliere', async () => {
  const p = await metti('Nadia-Ferro_liv4_2026-10-02.json');
  const corretto = await fetch(`${baseMaster}/api/dispositivi/${encodeURIComponent(ID1)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgId: p.pg }),
  });
  assert.equal(corretto.status, 200);
  assert.equal((await corretto.json()).pgId, p.pg);
  const tolto = await fetch(`${baseMaster}/api/dispositivi/${encodeURIComponent(ID1)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgId: null }),
  });
  assert.equal(tolto.status, 200);
  // staccato: il dispositivo resta nell'elenco, senza personaggio (non sparisce)
  assert.equal((await tolto.json()).pgId, null);
  const get = await fetch(`${baseTablet}/api/dispositivo`, { headers: { 'X-Mutant-Dispositivo': ID1 } });
  assert.equal((await get.json()).pgId, null);
  // da un tablet, PUT /api/dispositivi/<id> è negato (solo il Direttore corregge un abbinamento altrui)
  const negato = await fetch(`${baseTablet}/api/dispositivi/${encodeURIComponent(ID1)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pgId: p.pg }),
  });
  assert.equal(negato.status, 403);
});
