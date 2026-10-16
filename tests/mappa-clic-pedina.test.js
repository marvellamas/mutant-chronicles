// BUG del 16/10/2026 (Marcello, in sessione): sulla mappa, nel turno di un PG, la pedina scelta mostrava
// l'area verde e il percorso ma al clic sul quadretto d'arrivo non si spostava; il trascinamento sì.
//
// Causa: regressione del 12/10 («editor unico degli oggetti», strumento «Seleziona» sempre acceso). In
// src/ui/mappa/pagina.js → premi, un clic su un quadretto vuoto diventava sempre il riquadro di selezione
// dell'editor; al rilascio quel ramo svuotava la selezione e tornava, senza arrivare al movimento.
//
// Questi test mancavano: la decisione del clic (src/mappa/clic.js, che prima non esisteva: il test fallisce
// sul codice di prima della correzione) e il giro completo clic sulla pedina → clic sul quadretto →
// posizione cambiata e salvata sul server, con token liberi, template, muri disegnati, porte, un veicolo e
// una creatura 2 × 2 in scena, dal PC del master e dal tablet del giocatore.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { muoviToken } from '../src/mappa/annulla.js';
import { areaRaggiungibile, costoVerso } from '../src/mappa/area.js';
import { agganciaQ, celleToken } from '../src/mappa/token.js';
import { nuovoTemplate } from '../src/mappa/template.js';
import { oggettoSotto } from '../src/mappa/editor.js';
import { mappaSemplice } from '../src/mappa/semplice.js';
import { azioneDelClic, pedinaCheMuove } from '../src/mappa/clic.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-clic-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base;

before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  cpSync(new URL('../data', import.meta.url), join(radice, 'data'), { recursive: true });
  writeFileSync(join(radice, 'versione.json'), JSON.stringify({ versione: 'clic000001', data: '2026-10-16 12:00' }));
  server = creaServer({ radice, cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const PG = { id: 't-pg', rif: { tipo: 'partecipante', id: 'pg:Pablo-Zaion' }, q: [1, 1], ingombro: 1, nascosto: false };
const NEMICO = { id: 't-nem', rif: { tipo: 'partecipante', id: 'nem:bestione:1' }, q: [8, 8], ingombro: 2, nascosto: false };
const VEICOLO = { id: 't-vei', rif: { tipo: 'veicolo', id: 'veimuu14mqa0' }, q: [14, 2], ingombro: [2, 4], base: [4, 2], angolo: 180, nascosto: false };
const LIBERO = { id: 't-lib', rif: { tipo: 'segnaposto', id: 'lib1' }, q: [5, 10], ingombro: 1, nome: 'token', colore: '#3366cc', nascosto: false };

/** La mappa di Marcello: PG di turno, creatura 2 × 2, veicolo, token libero, template, muri disegnati, porta. */
let contatoreScene = 0;
function scenaDiProva({ semplice = false } = {}) {
  contatoreScene += 1;
  const s = nuovaScena({ id: `clic-${semplice ? 'semplice' : 'piena'}-${contatoreScene}`, nome: 'Clic', colonne: 24, righe: 18, dati });
  s.token = [PG, NEMICO, VEICOLO, LIBERO].map((t) => ({ ...t, q: [...t.q] }));
  s.template = [nuovoTemplate({ id: 'tpl1', forma: 'cerchio', misure: { raggio: 2 }, origine: [18, 12], colore: dati.mappa.template.colori[0].valore, nome: 'S1' })];
  s.muriLinee = [{ id: 'mu1', punti: [[10, 0], [10, 6]], spessore: 1 }];
  s.porte = [{ id: 'po1', q: [10, 3], lato: 'o', stato: 'chiusa', segreta: false }];
  s.semplice = semplice;
  assert.equal(validaScena(s, dati), null, 'scena di prova valida');
  return s;
}

const leggi = async (id) => (await fetch(`${base}/api/scene/${id}`)).json();
const metti = async (s) => {
  const r = await fetch(`${base}/api/scene/${s.id}`, { method: 'PUT', body: JSON.stringify(s) });
  const corpo = await r.json();
  assert.equal(r.status, 200, corpo.errore);
  // dopo il salvataggio si rilegge la scena dal server (revisione nuova), come fa la pagina
  return leggi(s.id);
};

/**
 * Il clic della pagina, con le stesse decisioni di src/ui/mappa/pagina.js → premi/rilascia:
 * si guarda che cosa c'è sotto il puntatore, si decide l'azione e, se è della mappa, la pedina si sposta.
 * @returns {{ azione, scena, mosso }}
 */
function clic(scena, q, { scelto = null, alt = false, strumentoEditor = 'seleziona', tablet = null } = {}) {
  const sotto = scena.token.find((t) => celleToken(t).some(([x, y]) => x === q[0] && y === q[1])) ?? null;
  const oggetto = oggettoSotto(scena, [q[0] + 0.5, q[1] + 0.5], { dati }) ?? null;
  const pedina = scelto ? scena.token.find((t) => t.id === scelto) ?? null : null;
  const azione = azioneDelClic({ strumentoEditor, pedinaScelta: pedinaCheMuove(pedina), tokenSotto: sotto, oggettoSotto: oggetto, alt });
  if (azione !== 'mappa' || !pedina) return { azione, scena, mosso: false };
  // il ramo del movimento: con «Mappa semplice» si va dove si clicca, altrimenti dentro l'area
  const libero = mappaSemplice(scena);
  const a = agganciaQ(scena.griglia, (q[0] + 0.5) * scena.griglia.q_px, (q[1] + 0.5) * scena.griglia.q_px, pedina.ingombro);
  let costo = null;
  if (!libero) {
    const area = areaRaggiungibile({
      colonne: scena.griglia.colonne, righe: scena.griglia.righe, muri: scena.muri, terreno: scena.terreno,
      token: scena.token, chi: pedina, massimo: 8, regole: dati.mappa.movimento, linee: scena.muriLinee ?? null,
    });
    costo = costoVerso(area, a);
    if (costo === Infinity) return { azione, scena, mosso: false, fuoriArea: true };
  }
  const dopo = muoviToken(scena, pedina.id, { a, costo, fascia: null, scontro: 'sc1', round: 1, libero, ...(tablet ? { tablet } : {}) }, dati);
  return { azione, scena: dopo, mosso: true };
}

// --- la decisione del clic -------------------------------------------------------------------------

test('la pedina scelta ha la precedenza sul riquadro di selezione dell’editor (il bug)', () => {
  const s = scenaDiProva();
  const pg = s.token[0];
  // prima della correzione: con lo strumento «Seleziona» un clic su un quadretto vuoto era sempre «riquadro»
  assert.equal(azioneDelClic({ pedinaScelta: pg, tokenSotto: null, oggettoSotto: null }), 'mappa');
  assert.equal(azioneDelClic({ pedinaScelta: null, tokenSotto: null, oggettoSotto: null }), 'riquadro', 'senza pedine scelte resta il riquadro');
  // con una pedina scelta, anche un oggetto sotto il puntatore non le toglie il clic (serve Alt)
  assert.equal(azioneDelClic({ pedinaScelta: pg, oggettoSotto: { chiave: 'muro:mu1' } }), 'mappa');
  assert.equal(azioneDelClic({ pedinaScelta: pg, oggettoSotto: { chiave: 'muro:mu1' }, alt: true }), 'oggetto');
  assert.equal(azioneDelClic({ pedinaScelta: pg, tokenSotto: LIBERO }), 'mappa', 'nemmeno un token libero');
  assert.equal(azioneDelClic({ pedinaScelta: pg, tokenSotto: LIBERO, alt: true }), 'oggetto');
  // un token libero è un oggetto dell'editor quando nessuna pedina è scelta
  assert.equal(azioneDelClic({ pedinaScelta: null, tokenSotto: LIBERO }), 'oggetto');
  // un clic su un'altra pedina la prende, come è sempre stato
  assert.equal(azioneDelClic({ pedinaScelta: pg, tokenSotto: NEMICO }), 'token');
  assert.equal(azioneDelClic({ pedinaScelta: null, tokenSotto: VEICOLO }), 'token');
  // i token liberi non muovono con il clic: si spostano con l'editor, senza regole
  assert.equal(pedinaCheMuove(LIBERO), null);
  assert.equal(pedinaCheMuove(PG), PG);
  // con un altro strumento dell'editor acceso il clic non è dell'editor
  assert.equal(azioneDelClic({ strumentoEditor: 'muro', pedinaScelta: null, oggettoSotto: { chiave: 'muro:mu1' } }), 'mappa');
});

// --- giro completo: clic sulla pedina → clic sul quadretto → posizione salvata -----------------------

test('end-to-end dal PC del master: la pedina di turno si sposta con il clic e il server lo salva', async () => {
  const s = await metti(scenaDiProva());
  // primo clic: sulla pedina (la prende)
  const primo = clic(s, [1, 1]);
  assert.equal(primo.azione, 'token', 'il clic sulla pedina la sceglie');
  // secondo clic: su un quadretto raggiungibile
  const secondo = clic(s, [4, 3], { scelto: PG.id });
  assert.equal(secondo.azione, 'mappa');
  assert.equal(secondo.mosso, true, 'la pedina si sposta');
  assert.deepEqual(secondo.scena.token.find((t) => t.id === PG.id).q, [4, 3]);
  assert.equal(secondo.scena.movimenti.at(-1).da.join(), '1,1');
  await metti(secondo.scena);
  const salvata = await leggi(s.id);
  assert.deepEqual(salvata.token.find((t) => t.id === PG.id).q, [4, 3], 'la posizione nuova è sul server');
  assert.equal(salvata.movimenti.at(-1).token, PG.id);
  // gli altri oggetti della scena non si sono mossi
  assert.deepEqual(salvata.token.find((t) => t.id === LIBERO.id).q, LIBERO.q);
  assert.deepEqual(salvata.token.find((t) => t.id === VEICOLO.id).q, VEICOLO.q);
  assert.equal(salvata.template.length, 1);
  assert.equal(salvata.muriLinee.length, 1);
});

test('end-to-end con gli oggetti sotto il puntatore: template, token libero, muro disegnato e porta', async () => {
  const s = scenaDiProva();
  // il template «S1» copre [18,12] e dintorni: con la pedina scelta il clic è lo stesso suo
  for (const q of [[18, 12], [5, 10], [10, 3]]) {
    const r = clic(s, q, { scelto: PG.id });
    assert.equal(r.azione, 'mappa', `clic su ${q} con la pedina scelta`);
  }
  // senza pedina scelta quei clic prendono l'oggetto
  assert.equal(clic(s, [18, 12]).azione, 'oggetto', 'template');
  assert.equal(clic(s, [5, 10]).azione, 'oggetto', 'token libero');
  // e con Alt lo prendono anche con la pedina scelta
  assert.equal(clic(s, [5, 10], { scelto: PG.id, alt: true }).azione, 'oggetto');
  // il quadretto dietro al muro disegnato non è raggiungibile: la pedina non ci va (nessun movimento)
  const oltre = clic(s, [12, 3], { scelto: PG.id });
  assert.equal(oltre.azione, 'mappa');
  assert.equal(oltre.mosso, false);
  assert.equal(oltre.fuoriArea, true, 'oltre il muro resta fuori dall’area');
});

test('end-to-end con «Mappa semplice»: la pedina va dove si clicca, senza limiti', async () => {
  const s = await metti(scenaDiProva({ semplice: true }));
  const r = clic(s, [22, 16], { scelto: PG.id });
  assert.equal(r.azione, 'mappa');
  assert.equal(r.mosso, true);
  assert.deepEqual(r.scena.token.find((t) => t.id === PG.id).q, [22, 16], 'anche lontanissimo');
  assert.equal(r.scena.movimenti.at(-1).libero, true);
  await metti(r.scena);
  assert.deepEqual((await leggi(s.id)).token.find((t) => t.id === PG.id).q, [22, 16]);
});

test('end-to-end dal tablet del giocatore: il movimento passa dal server e resta scritto', async () => {
  const s = await metti(scenaDiProva());
  // il tablet non ha l'editor: il tocco sul quadretto è sempre un movimento del proprio PG
  const r = clic(s, [3, 4], { scelto: PG.id, strumentoEditor: 'nessuno', tablet: 'Pablo-Zaion' });
  assert.equal(r.azione, 'mappa');
  assert.equal(r.mosso, true);
  await metti(r.scena);
  const salvata = await leggi(s.id);
  assert.deepEqual(salvata.token.find((t) => t.id === PG.id).q, [3, 4]);
  assert.equal(salvata.movimenti.at(-1).tablet, 'Pablo-Zaion', 'il movimento dice che viene dal tablet');
});

test('nemico 2 × 2 e veicolo: anche loro si spostano con il clic', async () => {
  const s = scenaDiProva({ semplice: true });
  // il nemico grande: il clic lo prende, poi il clic sul quadretto lo sposta con tutto l'ingombro
  assert.equal(clic(s, [8, 8]).azione, 'token', 'un clic sulla creatura 2 × 2 la prende');
  assert.equal(clic(s, [9, 9]).azione, 'token', 'anche sull’altro suo quadretto');
  const nem = clic(s, [4, 14], { scelto: NEMICO.id });
  assert.equal(nem.mosso, true);
  const dopoNem = nem.scena.token.find((t) => t.id === NEMICO.id);
  assert.equal(celleToken(dopoNem).length, 4, 'resta 2 × 2');
  // il veicolo, con il suo ingombro orientato
  assert.equal(clic(s, [14, 3]).azione, 'token');
  const vei = clic(s, [20, 10], { scelto: VEICOLO.id });
  assert.equal(vei.mosso, true);
  assert.deepEqual(vei.scena.token.find((t) => t.id === VEICOLO.id).ingombro, VEICOLO.ingombro, 'l’ingombro non cambia muovendosi');
});

// --- il ramo dell'editor nella pagina passa davvero di qui -----------------------------------------

test('pagina.js decide il clic con azioneDelClic (se qualcuno lo scavalca, questo test lo dice)', async () => {
  const sorgente = await readFile(new URL('../src/ui/mappa/pagina.js', import.meta.url), 'utf8');
  assert.match(sorgente, /import \{ azioneDelClic, pedinaCheMuove \} from '\.\.\/\.\.\/mappa\/clic\.js';/);
  assert.match(sorgente, /const azione = azioneDelClic\(\{/, 'premi chiede l’azione a src/mappa/clic.js');
  // il ramo dell'editor non deve più partire da solo dallo strumento «Seleziona» (era la causa del bug)
  assert.equal(sorgente.includes("if (st.editor.strumento === 'seleziona' && !st.spazio && st.strumento !== 'calibra' && st.scena && (!tokSotto || liberoSotto))"), false,
    'il ramo dell’editor è guardato dall’azione, non dal solo strumento');
  assert.match(sorgente, /if \(azione !== 'token' && azione !== 'mappa'/, 'ci si entra solo quando l’azione lo dice');
});
