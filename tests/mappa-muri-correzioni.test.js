// Correzioni di muri e porte (prove di Marcello del 12/10/2026): la gomma taglia i muri disegnati e
// salva; selezione ed eliminazione; «Raddrizza» (pochi vertici, angoli a 15°); Maiusc dritto; punto per punto; la porta
// interrompe il muro (linea di tiro e movimento) e togliendola il muro si richiude; spessore della porta centrato o
// adeguato al muro.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali, copia } from './helpers.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, impostaCella, cella } from '../src/mappa/celle.js';
import { tagliaLinee, conVoceMuriLinee, conMuriLinee, lineaSotto, lineeDi, semplifica, agganciaAngoli, raddrizza, trattoDritto, nuovaLinea, attraversa, erroreDatiMuriLinee, regoleRaddrizza } from '../src/mappa/muri-linee.js';
import { nuovaPorta, lineeEffettive, lineePerDisegno, muriEffettivi, muriPerDisegno, geometriaPorta, agganciaPorta, portePerGiocatori } from '../src/mappa/porte.js';
import { annullaUltima } from '../src/mappa/annulla.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { lineaDiTiro, ostacoliVista } from '../src/mappa/visuale.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const scena = (extra = {}) => ({ ...nuovaScena({ id: 'chiesa', nome: 'Chiesa', colonne: 12, righe: 8, nebbia: 'scoperta', dati }), revisione: 1, ...extra });
const muro = (id, punti, spessore = 0.25) => nuovaLinea({ id, punti, spessore });
const gradi = (a, b) => Math.round(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI * 100) / 100;
const vicino = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('gomma: taglia il muro disegnato dove passa, il resto rimane; un Ctrl+Z rimette tutto', () => {
  const lungo = muro('lungo', [[1, 1], [9, 1]]);
  const altro = muro('altro', [[1, 5], [9, 5]]);
  const s = scena({ muriLinee: [lungo, altro] });
  // la gomma passa sul Q [4, 0]–[4, 1] (rettangolo di un quadretto): via il pezzo fra x = 4 e x = 5
  const r = tagliaLinee(lineeDi(s), { tipo: 'rettangolo', x0: 4, y0: 0.5, x1: 5, y1: 1.5 });
  assert.deepEqual(r.toccate, ['lungo']);
  const pezzi = r.linee.filter((l) => l.id !== 'altro');
  assert.deepEqual(pezzi.map((l) => l.punti), [[[1, 1], [4, 1]], [[5, 1], [9, 1]]]);
  assert.ok(pezzi.every((l) => l.spessore === 0.25 && l.id !== 'lungo'));
  assert.equal(r.linee.find((l) => l.id === 'altro'), altro, 'il muro non toccato resta identico');
  // la passata diventa una voce di «annulla» sola; la scena tagliata è valida e si salva
  const tagliata = conVoceMuriLinee({ ...s, muriLinee: r.linee }, lineeDi(s), dati);
  assert.equal(validaScena(tagliata, dati), null);
  assert.deepEqual([tagliata.muriLinee.length, tagliata.annulla.at(-1).tipo], [3, 'muri-linee']);
  assert.deepEqual(annullaUltima(tagliata).scena.muriLinee.map((l) => [l.id, l.punti]).sort(), [['altro', altro.punti], ['lungo', lungo.punti]]);
  // in fondo al muro: si accorcia; tutto dentro: sparisce; un pennello tondo taglia lo stesso
  assert.deepEqual(tagliaLinee([lungo], { tipo: 'rettangolo', x0: 8, y0: 0, x1: 10, y1: 2 }).linee.map((l) => l.punti), [[[1, 1], [8, 1]]]);
  assert.deepEqual(tagliaLinee([lungo], { tipo: 'rettangolo', x0: 0, y0: 0, x1: 10, y1: 2 }).linee, []);
  assert.deepEqual(tagliaLinee([lungo], { tipo: 'cerchio', centro: [5, 1], raggio: 1 }).linee.map((l) => l.punti), [[[1, 1], [4, 1]], [[6, 1], [9, 1]]]);
  // un muro ad angolo tagliato su un lato tiene l'angolo
  const angolo = muro('angolo', [[1, 1], [5, 1], [5, 6]]);
  assert.deepEqual(tagliaLinee([angolo], { tipo: 'rettangolo', x0: 2, y0: 0.5, x1: 3, y1: 1.5 }).linee.map((l) => l.punti), [[[1, 1], [2, 1]], [[3, 1], [5, 1], [5, 6]]]);
  // fuori dalla gomma: niente
  assert.deepEqual(tagliaLinee([lungo], { tipo: 'rettangolo', x0: 4, y0: 3, x1: 5, y1: 4 }), { linee: [lungo], toccate: [] });
});

test('selezione ed eliminazione di un muro intero; Ctrl+Z lo rimette', () => {
  const a = muro('a', [[1, 1], [9, 1]]);
  const b = muro('b', [[1, 5], [9, 5]], 1);
  const s = scena({ muriLinee: [a, b] });
  assert.equal(lineaSotto(lineeDi(s), [5, 1.2]).id, 'a');
  assert.equal(lineaSotto(lineeDi(s), [5, 5.7]).id, 'b', 'dentro lo spessore di un muro largo un quadretto');
  assert.equal(lineaSotto(lineeDi(s), [5, 3]), null);
  const senza = conMuriLinee(s, { togli: ['a'] }, dati);
  assert.deepEqual(senza.muriLinee.map((l) => l.id), ['b']);
  assert.deepEqual(annullaUltima(senza).scena.muriLinee.map((l) => l.id).sort(), ['a', 'b']);
});

test('«Raddrizza»: via il tremolio, pochi vertici, angoli a multipli di 15° quando ci sono vicini', () => {
  // un tratto quasi orizzontale, tremolante: un segmento solo, orizzontale
  const storto = [[1, 2], [2, 2.1], [3, 1.95], [4, 2.12], [5, 1.9], [6, 2.05], [7, 2.08]];
  const dritto = raddrizza(storto, dati);
  assert.equal(dritto.length, 2);
  assert.deepEqual([dritto[0], gradi(dritto[0], dritto[1])], [[1, 2], 0]);
  // una «L» fatta a mano: tre vertici, angolo retto
  const elle = [[1, 1], [2, 1.1], [3, 0.95], [4, 1.05], [5, 1], [5.1, 2], [4.95, 3], [5.05, 4], [5, 5]];
  const l = raddrizza(elle, dati);
  assert.equal(l.length, 3);
  assert.deepEqual([gradi(l[0], l[1]), gradi(l[1], l[2])], [0, 90]);
  // semplificazione da sola: i punti entro la tolleranza dalla corda si tolgono, gli angoli veri restano
  assert.equal(semplifica(storto, 0.3).length, 2);
  assert.equal(semplifica(elle, 0.3).length, 3);
  assert.deepEqual(semplifica([[0, 0], [5, 0]], 0.3), [[0, 0], [5, 0]]);
  // aggancio: 18° va a 15°, 44° a 45°; 22° (lontano da 15 e da 30 più della soglia) resta com'è; la lunghezza non cambia
  const R = regoleRaddrizza(dati);
  const tratto = (g) => [[0, 0], [10 * Math.cos(g * Math.PI / 180), 10 * Math.sin(g * Math.PI / 180)]];
  for (const [da, a] of [[18, 15], [44, 45], [22, 22], [-88, -90], [3, 0]]) {
    const p = agganciaAngoli(tratto(da), R.angolo_gradi, R.soglia_gradi);
    assert.ok(vicino(gradi(p[0], p[1]), a, 0.01), `${da}° → ${a}°`);
    assert.ok(vicino(Math.hypot(p[1][0], p[1][1]), 10));
  }
});

test('Maiusc: una linea dritta dal punto di partenza; punto per punto: i vertici diventano un muro', () => {
  // senza «Raddrizza» la linea va dritta al punto; con «Raddrizza» l'angolo si aggancia
  assert.deepEqual(trattoDritto([1, 1], [7, 1.4]), [[1, 1], [7, 1.4]]);
  const agganciata = trattoDritto([1, 1], [7, 1.4], dati);
  assert.equal(agganciata.length, 2);
  assert.ok(vicino(agganciata[1][1], 1), 'quasi orizzontale: orizzontale');
  // punto per punto: i vertici messi a clic diventano un muro solo, con gli angoli agganciati se «Raddrizza» è acceso
  const vertici = [[1, 1], [6, 1.2], [6.1, 5]];
  const libero = nuovaLinea({ id: 'm1', punti: vertici, spessore: 0.25 });
  assert.deepEqual(libero.punti, vertici);
  const raddrizzato = nuovaLinea({ id: 'm2', punti: raddrizza(vertici, dati), spessore: 0.25 });
  assert.deepEqual([raddrizzato.punti.length, gradi(raddrizzato.punti[0], raddrizzato.punti[1]), gradi(raddrizzato.punti[1], raddrizzato.punti[2])], [3, 0, 90]);
  const s = conMuriLinee(scena(), { aggiungi: [raddrizzato] }, dati);
  assert.equal(validaScena(s, dati), null);
});

test('la porta taglia il muro disegnato: chiusa blocca, aperta lascia passare lì e solo lì; tolta, il muro si richiude', () => {
  const parete = muro('parete', [[0, 3], [12, 3]]);
  const base = scena({ muriLinee: [parete] });
  const aggancio = agganciaPorta(base, [5, 3], [5.5, 3.05], dati);
  assert.deepEqual([aggancio.muro, aggancio.punto], ['parete', [5.5, 3]]);
  const con = (stato) => ({ ...base, porte: [nuovaPorta({ id: 'p1', q: [5, 3], stato, aggancio })] });
  const attraversaPorta = (s) => attraversa(lineeEffettive(s), [5.5, 2], [5.5, 4]);
  const attraversaMuro = (s) => attraversa(lineeEffettive(s), [2, 2], [2, 4]);
  // movimento (src/mappa/area.js usa lineeEffettive): chiusa e bloccata come il muro, aperta è un passaggio
  assert.deepEqual([attraversaPorta(con('chiusa')), attraversaPorta(con('bloccata')), attraversaPorta(con('aperta'))], [true, true, false]);
  assert.deepEqual([attraversaMuro(con('aperta')), attraversaMuro(con('chiusa'))], [true, true], 'il resto del muro blocca sempre');
  // linea di tiro: attraverso la porta aperta si vede, attraverso quella chiusa no
  const tiro = (s) => lineaDiTiro(s, { id: 'a', q: [5, 1], ingombro: 1 }, { id: 'b', q: [5, 5], ingombro: 1 }, ostacoliVista(s, dati.mappa.porte), dati.mappa.visuale).copertura;
  assert.equal(tiro(con('chiusa')), 'totale');
  assert.notEqual(tiro(con('aperta')), 'totale');
  // nel disegno il muro è interrotto per la larghezza della porta, aperta o chiusa: al suo posto c'è la porta
  for (const stato of ['aperta', 'chiusa']) {
    const pezzi = lineePerDisegno(con(stato), dati).map((l) => l.punti);
    assert.deepEqual(pezzi, [[[0, 3], [5, 3]], [[6, 3], [12, 3]]], stato);
  }
  // per i giocatori una porta segreta non interrompe nulla
  const segreta = { ...base, porte: [{ ...con('chiusa').porte[0], segreta: true }] };
  assert.deepEqual(lineePerDisegno(segreta, dati, { perGiocatori: true }).map((l) => l.punti), [parete.punti]);
  // tolta la porta, il muro si richiude (il muro non è mai stato modificato)
  assert.deepEqual(lineePerDisegno(base, dati), [parete]);
  assert.equal(attraversa(lineeEffettive(base), [5.5, 2], [5.5, 4]), true);
  // dopo una passata di gomma altrove il muro ha id nuovi: la porta aperta resta un passaggio
  const tagliato = { ...con('aperta'), muriLinee: tagliaLinee([parete], { tipo: 'rettangolo', x0: 10, y0: 2, x1: 11, y1: 4 }).linee };
  assert.ok(!tagliato.muriLinee.some((l) => l.id === 'parete'));
  assert.equal(attraversaPorta(tagliato), false);
  assert.equal(attraversaMuro(tagliato), true);
});

test('la porta taglia il muro a quadretto: il suo Q non si disegna come muro; chiusa blocca, aperta no; tolta, il muro torna', () => {
  const base = scena();
  const m = daBase64(base.muri);
  for (let x = 0; x < 12; x++) impostaCella(m, 12, 8, x, 3, true);
  const murata = { ...base, muri: inBase64(m) };
  const con = (stato) => ({ ...murata, porte: [nuovaPorta({ id: 'p1', q: [5, 3], stato, orientamento: 'orizzontale' })] });
  const muroIn = (maschera, x) => cella(maschera, 12, 8, x, 3);
  assert.deepEqual([muroIn(muriEffettivi(con('chiusa')), 5), muroIn(muriEffettivi(con('aperta')), 5), muroIn(muriEffettivi(con('aperta')), 4)], [true, false, true]);
  for (const stato of ['aperta', 'chiusa']) assert.deepEqual([muroIn(muriPerDisegno(con(stato)), 5), muroIn(muriPerDisegno(con(stato)), 4)], [false, true], stato);
  assert.equal(muroIn(muriPerDisegno(murata), 5), true, 'senza porta il muro è intero');
  assert.equal(muroIn(muriEffettivi(murata), 5), true);
});

test('spessore della porta: più sottile del muro sta al centro del muro; più spessa prende lo spessore del muro', () => {
  const propria = dati.mappa.porte.spessore_q;
  // muro disegnato largo un quadretto: la porta tiene il suo spessore, centrata sull'asse del muro
  const largo = scena({ muriLinee: [muro('largo', [[0, 3], [12, 3]], 1)] });
  const pl = nuovaPorta({ id: 'p', q: [5, 3], aggancio: agganciaPorta(largo, [5, 3], [5.5, 3.3], dati) });
  const gl = geometriaPorta(largo, pl, dati);
  assert.deepEqual([gl.su, gl.centro, gl.direzione, gl.spessore, gl.spessoreMuro, gl.larghezza], ['disegnato', [5.5, 3], [1, 0], propria, 1, 1]);
  // muro sottile: la porta prende lo spessore del muro
  const sottile = scena({ muriLinee: [muro('sottile', [[4, 0], [4, 8]], 0.1)] });
  const ps = nuovaPorta({ id: 'p', q: [4, 4], aggancio: agganciaPorta(sottile, [4, 4], [4.05, 4.5], dati) });
  const gs = geometriaPorta(sottile, ps, dati);
  assert.deepEqual([gs.spessore, gs.spessoreMuro, gs.direzione, gs.centro], [0.1, 0.1, [0, 1], [4, 4.5]]);
  // porta salvata prima con lo spessore del muro nell'aggancio: si adegua alla lettura, senza toccare il file
  const vecchia = { id: 'v', q: [5, 3], stato: 'chiusa', segreta: false, aggancio: { muro: 'largo', punto: [5.5, 3], da: [0, 3], a: [12, 3], spessore: 1 } };
  assert.equal(geometriaPorta(largo, vecchia, dati).spessore, propria);
  // muro a quadretto: al centro del Q, lungo il muro, non sulla linea della griglia
  const m = daBase64(scena().muri);
  for (let x = 0; x < 12; x++) impostaCella(m, 12, 8, x, 3, true);
  const murata = scena({ muri: inBase64(m) });
  const gq = geometriaPorta(murata, { id: 'q', q: [5, 3], stato: 'chiusa', segreta: false, aggancio: { lato: 'n', spessore: 0.25 } }, dati);
  assert.deepEqual([gq.su, gq.centro, gq.direzione, gq.spessore, gq.spessoreMuro], ['quadretto', [5.5, 3.5], [1, 0], Math.min(propria, 1), 1]);
  // senza muro sotto: sulla linea della griglia, come prima
  const gg = geometriaPorta(scena(), { id: 'g', q: [5, 3], stato: 'chiusa', segreta: false, aggancio: { lato: 's', spessore: 0.25 } }, dati);
  assert.deepEqual([gg.su, gg.centro], ['griglia', [5.5, 4]]);
  // ai giocatori arriva la stessa geometria
  const perLoro = portePerGiocatori({ ...largo, porte: [{ ...pl, stato: 'chiusa', segreta: false }] }, dati);
  assert.deepEqual(perLoro[0].geo, gl);
});

test('validatore: data/mappa.json → muri_linee.raddrizza e aspetto', () => {
  assert.equal(erroreDatiMuriLinee(dati.mappa.muri_linee), null);
  const errori = (modifica) => { const d = copia(dati); modifica(d.mappa.muri_linee); return validaDati(d).map((e) => JSON.stringify(e)).join('\n'); };
  assert.match(errori((m) => { delete m.raddrizza; }), /muri_linee\.raddrizza/);
  assert.match(errori((m) => { m.raddrizza.soglia_gradi = 20; }), /muri_linee\.raddrizza/);
  assert.match(errori((m) => { m.aspetto.bordo = 'bianco'; }), /muri_linee\.aspetto/);
});

// salvataggio e schermo dei giocatori, su cartelle temporanee e porta casuale
const radice = mkdtempSync(join(tmpdir(), 'mutant-muri-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base;
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  writeFileSync(join(c.scene, 'chiesa.json'), JSON.stringify(scena({ muriLinee: [muro('lungo', [[1, 1], [9, 1]]), muro('altro', [[1, 5], [9, 5]])] })));
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections?.();
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

test('la cancellazione arriva al salvataggio e allo schermo dei giocatori', async () => {
  await fetch(`${base}/api/vista-giocatori/scelta`, { method: 'PUT', body: JSON.stringify({ scena: 'chiesa' }) });
  const prima = await (await fetch(`${base}/api/vista-giocatori`)).json();
  assert.deepEqual(prima.scena.muriLinee.map((l) => l.id), ['lungo', 'altro']);
  // il master passa la gomma e salva
  const s = await (await fetch(`${base}/api/scene/chiesa`)).json();
  const tagliata = conVoceMuriLinee({ ...s, muriLinee: tagliaLinee(lineeDi(s), { tipo: 'rettangolo', x0: 4, y0: 0, x1: 5, y1: 2 }).linee }, lineeDi(s), dati);
  const r = await fetch(`${base}/api/scene/chiesa`, { method: 'PUT', body: JSON.stringify(tagliata) });
  assert.equal(r.status, 200);
  const salvata = await (await fetch(`${base}/api/scene/chiesa`)).json();
  assert.deepEqual(salvata.muriLinee.map((l) => l.punti).sort(), [[[1, 1], [4, 1]], [[1, 5], [9, 5]], [[5, 1], [9, 1]]]);
  const dopo = await (await fetch(`${base}/api/vista-giocatori`)).json();
  assert.deepEqual(dopo.scena.muriLinee.map((l) => l.punti).sort(), [[[1, 1], [4, 1]], [[1, 5], [9, 5]], [[5, 1], [9, 1]]]);
  // eliminato il muro intero, sparisce anche per i giocatori
  const senza = conMuriLinee(salvata, { togli: [salvata.muriLinee.find((l) => l.punti[0][1] === 5).id] }, dati);
  assert.equal((await fetch(`${base}/api/scene/chiesa`, { method: 'PUT', body: JSON.stringify(senza) })).status, 200);
  const fine = await (await fetch(`${base}/api/vista-giocatori`)).json();
  assert.equal(fine.scena.muriLinee.length, 2);
  // e la vista pura dà lo stesso risultato
  assert.equal(vistaGiocatori(senza, { regoleTemplate: dati.mappa.template, regoleMappa: dati.mappa, pezzi: [] }).muriLinee.length, 2);
});
