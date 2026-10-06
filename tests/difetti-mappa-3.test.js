// Primo test della mappa sul PC di Marcello (06/10/2026), difetto 3: «non riesce a spostare i token». Causa: la stessa
// del difetto 1 (server acceso con il codice del lotto 2): con lo Scout in scena ogni salvataggio era rifiutato e gli
// spostamenti si perdevano al ricaricamento. Qui il percorso di un trascinamento come lo fa la pagina (puntatore →
// camera → aggancio → scena → server) per PG, nemico e veicolo, su una scena collegata a una bozza e poi allo scontro
// aperto che «Inizia» crea dalla bozza; più la nebbia del master che segue zoom e spostamenti (trovato nella verifica).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { adatta, zoomVerso, mappaDaSchermo, schermoDaMappa } from '../src/mappa/camera.js';
import { agganciaQ, centroToken, tokenSottoPunto } from '../src/mappa/token.js';
import { pezziDellaScena, tokenPerPezzo, tokenOrfani } from '../src/mappa/partecipanti.js';
import { nuovaBozza, aggiungiVoce, iniziaBozza } from '../src/preparazione.js';

const { dati } = await datiReali();
const V = dati.mappa.vista;
const radice = mkdtempSync(join(tmpdir(), 'mutant-difetto3-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base;
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const metti = async (s) => {
  const r = await fetch(`${base}/api/scene/${s.id}`, { method: 'PUT', body: JSON.stringify(s) });
  const corpo = await r.json();
  assert.equal(r.status, 200, corpo.errore);
  return corpo;
};

/** Il trascinamento della pagina (src/ui/mappa/pagina.js): presa sul token, rilascio altrove, aggancio, nuova scena. */
function trascina(scena, cam, idToken, daSchermo, aSchermo) {
  const g = scena.griglia;
  const presa = mappaDaSchermo(cam, daSchermo.x, daSchermo.y);
  const tok = scena.token.find((t) => t.id === idToken);
  assert.ok(tokenSottoPunto(g, tok, presa.x, presa.y), `il puntatore è sopra ${idToken}`);
  const c0 = centroToken(g, tok);
  const dx = presa.x - c0.x, dy = presa.y - c0.y;
  const m = mappaDaSchermo(cam, aSchermo.x, aSchermo.y);
  const q = agganciaQ(g, m.x - dx, m.y - dy, tok.ingombro);
  return { ...scena, token: scena.token.map((t) => (t.id === idToken ? { ...t, q } : t)) };
}

test('trascinamenti di PG, nemico e veicolo salvati, su bozza e poi sullo scontro aperto', async () => {
  const predone = JSON.parse(readFileSync(new URL('../esempi/nemici/predone-delle-lande.json', import.meta.url), 'utf8'));
  let b = aggiungiVoce(nuovaBozza({ nome: 'test' }), { nemico: predone, quanti: 1 });
  b = { ...b, pg: ['LUCAS', 'Dimitri-Orlav'] };
  const scout = { id: 'veimuu14mqa0', revisione: 1, proprietario: { tipo: 'gruppo' }, conducente: null, mitragliere: null, mezzo: { profilo: 'asa-scout-mk4', nome: 'ASA Scout MK4' } };
  let scena = nuovaScena({ id: 'test1', nome: 'test1', colonne: 21, righe: 21, dati });
  scena.collegamento = { scontro: null, bozza: b.id };
  const pezzi = pezziDellaScena({ bozza: b, veicoli: [scout] }, dati);
  scena.token = pezzi.map((p, i) => tokenPerPezzo(p, [2 + i * 4, 2]));
  assert.equal(validaScena(scena, dati), null);
  scena = await metti(scena);
  // vista come quella del test di Marcello: «Adatta» e un po' di zoom
  let cam = zoomVerso(adatta(21 * 64, 21 * 64, 900, 700, V), 450, 350, 1.6, V);
  const schermo = (t) => { const p = centroToken(scena.griglia, t); return schermoDaMappa(cam, p.x, p.y); };
  const qs = scena.griglia.q_px * cam.scala;
  for (const t of scena.token) {
    const da = schermo(t);
    // presa un po' fuori centro (come con il dito), tre quadretti a destra e due in basso
    const dopo = trascina(scena, cam, t.id, { x: da.x + qs * 0.2, y: da.y - qs * 0.2 }, { x: da.x + qs * 3.2, y: da.y + qs * 1.8 });
    const nuovo = dopo.token.find((x) => x.id === t.id);
    assert.deepEqual(nuovo.q, [t.q[0] + 3, t.q[1] + 2], `${t.id} si sposta di 3 × 2 Q`);
    assert.equal(validaScena(dopo, dati), null);
    scena = await metti(dopo);
  }
  const riletta = await (await fetch(`${base}/api/scene/test1`)).json();
  assert.deepEqual(riletta.token.map((t) => t.q), pezzi.map((_, i) => [2 + i * 4 + 3, 4]));
  // «Inizia»: lo scontro aperto ha gli stessi id, i token restano e si spostano ancora
  const s = iniziaBozza(b, { id: 'scontro-x', pg: [{ chiave: 'LUCAS', nome: 'LUCAS', iniziativa: 3 }, { chiave: 'Dimitri-Orlav', nome: 'Dimitri', iniziativa: 4 }], dati, tiro: () => ({ valore: 5, origine: 'app' }) });
  const pezziScontro = pezziDellaScena({ scontro: s, veicoli: [scout] }, dati);
  scena = { ...riletta, collegamento: { scontro: s.id, bozza: null } };
  assert.deepEqual(tokenOrfani(scena, pezziScontro), [], 'nessun token perso passando allo scontro');
  cam = zoomVerso(cam, 100, 100, 0.8, V);
  const nem = scena.token.find((t) => t.rif.id.startsWith('nem:'));
  const da = schermo(nem);
  scena = await metti(trascina(scena, cam, nem.id, da, { x: da.x - scena.griglia.q_px * cam.scala, y: da.y }));
  assert.deepEqual((await (await fetch(`${base}/api/scene/test1`)).json()).token.find((t) => t.id === nem.id).q, [nem.q[0] - 1, nem.q[1]]);
});

test('la nebbia del master segue zoom e spostamenti', () => {
  const pagina = readFileSync(new URL('../src/ui/mappa/pagina.js', import.meta.url), 'utf8');
  const i = pagina.indexOf('const cambiaCamera = (cam) =>');
  const corpo = pagina.slice(i, pagina.indexOf('};', i));
  assert.match(corpo, /ridisegna\(\['fondo', 'aree', 'sopra'\]\)/, 'cambiaCamera ridisegna anche il livello della nebbia');
});
