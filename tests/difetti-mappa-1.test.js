// Primo test della mappa sul PC di Marcello (06/10/2026), difetto 1: «Scena non salvata: token[7].ingombro…» ripetuto
// in una pila di avvisi appena messo in scena lo Scout (4 × 2 Q). Il server era acceso da prima del lotto 3 e
// validava le scene con il codice vecchio (solo ingombri quadrati); la pagina riprovava il salvataggio ogni 600 ms.
// Qui: lo Scout 4 × 2 si salva e si sposta; il server dice con quale versione è stato acceso; gli avvisi uguali non
// si accumulano.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { serverDaRiavviare } from '../src/versione.js';
import { installaDomFinto, togliDomFinto } from './dom-finto.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-difetto1-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base;

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  // una radice dell'app con i dati e versione.json: il server legge la versione all'accensione
  cpSync(new URL('../data', import.meta.url), join(radice, 'data'), { recursive: true });
  writeFileSync(join(radice, 'versione.json'), JSON.stringify({ versione: 'aaaa000001', data: '2026-10-06 12:50' }));
  server = creaServer({ radice, cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const metti = (s) => fetch(`${base}/api/scene/${s.id}`, { method: 'PUT', body: JSON.stringify(s) });

test('lo Scout 4 × 2 si salva in una scena con 7 PG, e il suo spostamento resta', async () => {
  const s = nuovaScena({ id: 'test1', nome: 'test1', colonne: 21, righe: 21, dati });
  s.collegamento = { scontro: null, bozza: 'bozza-test-20261003-114801' };
  s.token = ['LUCAS', 'Dimitri-Orlav', 'DUNCAN-MCDUFF', 'Pablo-Zaion', 'OSHI-NAGATA', 'MICHELE-GIORGETTI', 'BOTHA-PRETORIUS']
    .map((k, i) => ({ id: `t-partecipante-pg-${k}`, rif: { tipo: 'partecipante', id: `pg:${k}` }, q: [18, 7 + i], ingombro: 1, nascosto: false }));
  s.token.push({ id: 't-veicolo-veimuu14mqa0', rif: { tipo: 'veicolo', id: 'veimuu14mqa0' }, q: [2, 2], ingombro: [4, 2], nascosto: false });
  assert.equal(validaScena(s, dati), null, 'token[7] (lo Scout) valido');
  const r1 = await metti(s);
  assert.equal(r1.status, 200, (await r1.clone().json()).errore);
  const salvata = await r1.json();
  // spostamento dello Scout e di un PG: si salva e si rilegge
  const mossa = { ...salvata, token: salvata.token.map((t) => (t.rif.tipo === 'veicolo' ? { ...t, q: [10, 15] } : t.id.endsWith('LUCAS') ? { ...t, q: [5, 5] } : t)) };
  assert.equal((await metti(mossa)).status, 200);
  const riletta = await (await fetch(`${base}/api/scene/test1`)).json();
  assert.deepEqual(riletta.token.find((t) => t.rif.tipo === 'veicolo'), { id: 't-veicolo-veimuu14mqa0', rif: { tipo: 'veicolo', id: 'veimuu14mqa0' }, q: [10, 15], ingombro: [4, 2], nascosto: false });
  assert.deepEqual(riletta.token[0].q, [5, 5]);
  // compatibile con le scene già salvate: veicolo con ingombro quadrato, creature 1/2/3
  assert.equal(validaScena({ ...s, token: [{ ...s.token[7], ingombro: 3 }] }, dati), null);
  // i limiti restano: rettangoli solo per i veicoli, entro veicolo_ingombro_max
  assert.match(validaScena({ ...s, token: [{ ...s.token[0], ingombro: [2, 1] }] }, dati), /solo per i veicoli/);
  assert.match(validaScena({ ...s, token: [{ ...s.token[7], ingombro: [dati.mappa.token.veicolo_ingombro_max + 1, 2] }] }, dati), /veicoli/);
});

test('il server dice con quale versione è stato acceso: dopo un aggiornamento senza riavvio l’app lo vede', async () => {
  const prima = await fetch(`${base}/versione.json`);
  assert.equal(prima.headers.get('x-mutant-versione-server'), 'aaaa000001');
  assert.equal(serverDaRiavviare(prima.headers.get('x-mutant-versione-server'), (await prima.json()).versione), false);
  // «git pull» con il server acceso: versione.json cambia sul disco, il codice in memoria no
  writeFileSync(join(radice, 'versione.json'), JSON.stringify({ versione: 'bbbb000002', data: '2026-10-06 13:37' }));
  const dopo = await fetch(`${base}/versione.json`);
  assert.equal(dopo.headers.get('x-mutant-versione-server'), 'aaaa000001');
  assert.equal(serverDaRiavviare(dopo.headers.get('x-mutant-versione-server'), (await dopo.json()).versione), true);
  assert.equal(serverDaRiavviare(null, 'bbbb000002'), false, 'senza server di Mutant: nessun avviso');
});

test('avvisi uguali ravvicinati: uno solo, con «×N»; quelli diversi restano separati', async () => {
  const documento = installaDomFinto();
  try {
    const { avviso, avvisoErrore } = await import('../src/ui/avvisi.js');
    const testo = 'Scena non salvata: token[7].ingombro: 1, 2, 3 Q per lato';
    const primo = avvisoErrore(testo);
    for (let i = 0; i < 4; i++) avvisoErrore(testo);
    const c = documento.getElementById('avvisi');
    assert.equal(c.querySelectorAll('.avviso').length, 1);
    assert.equal(primo.dataset.volte, '5');
    assert.equal(primo.querySelector('.avviso-volte').textContent, '×5');
    avviso(testo); // stesso testo ma conferma, non errore: è un altro avviso
    avvisoErrore('Un altro errore');
    assert.equal(c.querySelectorAll('.avviso').length, 3);
    // la «chiave» continua a sostituire il precedente (clic ripetuti su − e +)
    avviso('PV 10', { chiave: 'pv' });
    avviso('PV 9', { chiave: 'pv' });
    assert.equal(c.querySelectorAll('.avviso').filter((x) => x.dataset.chiave === 'pv').length, 1);
    for (const x of c.querySelectorAll('.avviso')) clearTimeout(x._timer);
  } finally {
    togliDomFinto();
  }
});
