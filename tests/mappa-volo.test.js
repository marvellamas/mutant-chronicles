// Token in volo (08/10/2026; src/mappa/volo.js, data/mappa.json → volo): movimento sopra terreno difficile e token,
// muri come ostacolo; linea di tiro senza token in mezzo né Copertura Leggera o Media; visibilità oltre la nebbia con
// una linea di vista; ZoC con la quota; filtro dei giocatori; formato della scena.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { inVolo, quotaDi, sapeVolare, movimentoInVolo, regoleMovimento, conVolo, erroreVolo } from '../src/mappa/volo.js';
import { areaRaggiungibile, costoVerso } from '../src/mappa/area.js';
import { lineaDiTiro, ostacoliVista } from '../src/mappa/visuale.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { avversariZoc, attacchiDiOpportunita } from '../src/mappa/zoc.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { barraIniziativa, barraPerGiocatori } from '../src/mappa/iniziativa.js';
import { nuovaMaschera, inBase64, daBase64, rettangolo } from '../src/mappa/celle.js';

const { dati } = await datiReali();
const C = 12, R = 8;
const bit = (m, x, y) => { const i = y * C + x; m[i >> 3] |= 1 << (i & 7); };

test('dati: Volo del Giocatore §5.2.3 (6/12/18 Q), icona tracciata e leggera, regole del volo', async () => {
  const { statSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  assert.deepEqual(dati.mappa.volo.movimento_predefinito, { passo: 6, corsa: 12, scatto: 18 });
  const f = dati.mappa.volo.icona;
  assert.ok(statSync(new URL(`../${f}`, import.meta.url)).size < 20 * 1024, 'icona leggera');
  assert.equal(execFileSync('git', ['ls-files', f], { cwd: new URL('..', import.meta.url) }).toString().trim() !== '' || process.env.SENZA_GIT === '1', true, 'icona tracciata');
});

test('movimento in volo: profilo del nemico, Giocatore §5.2.3 per gli altri, Stordito soltanto Passo (§5.2.5)', () => {
  assert.deepEqual(movimentoInVolo({ voloQ: 8 }, dati), { passo: 8, corsa: 16, scatto: 24 });
  assert.deepEqual(movimentoInVolo({ tipo: 'pg' }, dati), { passo: 6, corsa: 12, scatto: 18 });
  const st = movimentoInVolo({ voloQ: 8, stati: [{ id: 'stordito' }] }, dati);
  assert.equal(st.corsa, null);
  assert.equal(sapeVolare({ voloQ: 8 }), true);
  assert.equal(sapeVolare({ tipo: 'pg' }), false);
  assert.equal(movimentoInVolo({ voloQ: 8, aZero: true }, dati).passo, 0);
});

test('area in volo: sopra il terreno difficile (costo 1) e sopra i token senza fermarsi; i muri restano', () => {
  const muri = nuovaMaschera(C, R), terreno = nuovaMaschera(C, R);
  for (let x = 1; x <= 4; x++) for (let y = 0; y < R; y++) bit(terreno, x, y);
  for (let y = 2; y <= 7; y++) bit(muri, 6, y);
  const nemico = { id: 'n', q: [2, 3], ingombro: 1, lato: 'avversario' };
  const chi = { id: 'v', q: [0, 0], ingombro: 1, lato: 'pg', volo: true };
  const area = (t) => areaRaggiungibile({ colonne: C, righe: R, muri, terreno, token: [nemico], chi: t, massimo: 12, regole: regoleMovimento(t, dati) });
  const aTerra = area({ ...chi, volo: undefined });
  const inAria = area(chi);
  assert.equal(costoVerso(aTerra, [5, 0]), 9, 'a terra il terreno difficile costa doppio');
  assert.equal(costoVerso(inAria, [5, 0]), 5, 'in volo no');
  // sopra il nemico si passa, ma non ci si ferma
  assert.equal(costoVerso(inAria, [2, 3]), Infinity);
  assert.equal(costoVerso(inAria, [2, 4]), 4);
  // il muro resta un ostacolo (soffitto): oltre la colonna 6 solo girandoci intorno, dalla riga 0–1
  const oltre = costoVerso(inAria, [7, 3]);
  assert.ok(Number.isFinite(oltre) && oltre > 7, `il muro fa girare: ${oltre}`);
  assert.equal(costoVerso(inAria, [6, 4]), Infinity, 'dentro il muro no');
});

test('linea di tiro (A.148, decisione 148): in volo valgono Copertura e creatura interposta come a terra; con i valori di prima no', () => {
  const s = { ...nuovaScena({ id: 'x', nome: 'X', colonne: C, righe: R, nebbia: 'scoperta', dati }) };
  const RV = dati.mappa.visuale, volo = dati.mappa.volo.linea_di_tiro;
  const da = { id: 'a', rif: { tipo: 'partecipante', id: 'pg:A' }, q: [0, 3], ingombro: 1 };
  const mezzo = { id: 'm', rif: { tipo: 'partecipante', id: 'nem:x:1' }, q: [4, 3], ingombro: 1 };
  const bers = { id: 'b', rif: { tipo: 'partecipante', id: 'nem:x:2' }, q: [8, 3], ingombro: 1 };
  // un muretto che copre in parte (Leggera o Media a terra)
  const muri = nuovaMaschera(C, R);
  bit(muri, 6, 2); bit(muri, 6, 3);
  const scena = { ...s, muri: inBase64(muri), token: [da, mezzo, bers] };
  const ost = ostacoliVista(scena, dati.mappa.porte);
  const terra = lineaDiTiro(scena, da, bers, ost, RV, { volo });
  assert.ok(['leggera', 'media', 'totale'].includes(terra.copertura) || terra.inMezzo.length, 'a terra c’è qualcosa in mezzo');
  assert.deepEqual([volo.ignora_token, volo.coperture_annullate], [false, []]);
  const aria = lineaDiTiro(scena, da, { ...bers, volo: true }, ost, RV, { volo });
  assert.equal(aria.copertura, terra.copertura, 'la stessa Copertura che a terra (il master corregge per le quote)');
  assert.deepEqual(aria.inMezzo.map((t) => t.id), terra.inMezzo.map((t) => t.id), 'la creatura interposta conta anche in volo');
  assert.equal(aria.interposta, terra.interposta);
  assert.equal(aria.inVolo, true);
  // con i valori di prima (indicazione dell'08/10, superata) in volo niente token in mezzo né Leggera e Media
  const prima = { ignora_token: true, coperture_annullate: ['leggera', 'media'] };
  const ariaPrima = lineaDiTiro(scena, da, { ...bers, volo: true }, ost, RV, { volo: prima });
  if (terra.copertura !== 'totale') assert.equal(ariaPrima.copertura, 'nessuna');
  assert.deepEqual(ariaPrima.inMezzo, []);
  assert.deepEqual(lineaDiTiro(scena, { ...da, volo: true }, bers, ost, RV, { volo: prima }).inMezzo, []);
  // un muro pieno dietro cui sta tutto il bersaglio: Copertura Totale comunque
  const pieno = nuovaMaschera(C, R);
  for (let y = 0; y < R; y++) bit(pieno, 6, y);
  const sp = { ...scena, muri: inBase64(pieno) };
  assert.equal(lineaDiTiro(sp, da, { ...bers, volo: true }, ostacoliVista(sp, dati.mappa.porte), RV, { volo }).copertura, 'totale');
});

test('visibilità (A.150, decisione 150): in volo come a terra, sotto la nebbia non si vede; con la regola di prima sì, con una linea senza muri', () => {
  const s = nuovaScena({ id: 'v', nome: 'V', colonne: C, righe: R, nebbia: 'scoperta', dati });
  // nebbia sulla metà destra
  s.nebbia.coperti = inBase64(rettangolo(daBase64(s.nebbia.coperti), C, R, 6, 0, 11, 7, true));
  const pg = { id: 'p', rif: { tipo: 'partecipante', id: 'pg:A' }, q: [1, 1], ingombro: 1, nascosto: false };
  const drago = { id: 'd', rif: { tipo: 'partecipante', id: 'nem:drago:1' }, q: [9, 1], ingombro: 1, nascosto: false, volo: true, quota: 4 };
  const lupo = { id: 'l', rif: { tipo: 'partecipante', id: 'nem:lupo:1' }, q: [9, 4], ingombro: 1, nascosto: false };
  assert.equal(dati.mappa.volo.visibile_oltre_nebbia, false);
  const base = { ...s, token: [pg, drago, lupo] };
  assert.deepEqual(vistaGiocatori(base, null, null, dati.mappa).token.map((t) => t.id), ['p'], 'A.150: il drago in volo sotto la nebbia non si vede, come il lupo');
  // fuori dalla nebbia il drago in volo si vede, come chiunque
  const fuori = { ...base, token: [pg, { ...drago, q: [3, 1] }, lupo] };
  assert.deepEqual(vistaGiocatori(fuori, null, null, dati.mappa).token.map((t) => t.id), ['p', 'd']);
  // la regola di prima (volo.visibile_oltre_nebbia true) resta possibile come dato
  const mappaPrima = { ...dati.mappa, volo: { ...dati.mappa.volo, visibile_oltre_nebbia: true } };
  const vede = (scena) => vistaGiocatori(scena, null, null, mappaPrima).token.map((t) => t.id);
  assert.deepEqual(vede(base), ['p', 'd'], 'con la regola di prima il drago in volo sotto la nebbia si vede, il lupo a terra no');
  const v = vistaGiocatori(base, null, null, mappaPrima).token.find((t) => t.id === 'd');
  assert.equal(v.volo, true);
  assert.equal(v.quota, 4);
  // un muro fra il PG e il drago: non si vede
  const muri = nuovaMaschera(C, R);
  for (let y = 0; y < R; y++) bit(muri, 4, y);
  assert.deepEqual(vede({ ...base, muri: inBase64(muri) }), ['p']);
  // nascosto dal master: mai
  assert.deepEqual(vede({ ...base, token: [pg, { ...drago, nascosto: true }, lupo] }), ['p']);
  // senza PG in mappa nessuno lo vede
  assert.deepEqual(vede({ ...base, token: [drago] }), []);
});

test('ZoC con la quota (A.149): chi vola più in alto della portata non è nella ZoC e non provoca uscendo', () => {
  const pezzi = [{ chiave: 'partecipante:pg:A', lato: 'pg' }, { chiave: 'partecipante:nem:x:1', lato: 'avversario', tipo: 'nemico' }];
  const pg = { id: 'p', rif: { tipo: 'partecipante', id: 'pg:A' }, q: [3, 3], ingombro: 1 };
  const nem = { id: 'n', rif: { tipo: 'partecipante', id: 'nem:x:1' }, q: [4, 3], ingombro: 1 };
  const s = (p) => ({ token: [p, nem], griglia: { colonne: C, righe: R } });
  assert.equal(avversariZoc(s(pg), pezzi, 'p', dati).length, 1);
  const alto = { ...pg, volo: true, quota: 3 };
  assert.equal(avversariZoc(s(alto), pezzi, 'p', dati).length, 0, 'a 3 Q d’altezza è fuori dalla portata di 1 Q');
  const basso = { ...pg, volo: true, quota: 1 };
  const avv = avversariZoc(s(basso), pezzi, 'p', dati);
  assert.equal(avv.length, 1, 'a 1 Q è ancora in portata');
  assert.equal(attacchiDiOpportunita([[3, 3], [2, 3], [1, 3]], 1, avv).length, 1, 'e uscendo provoca (anche salendo: §5.2.3)');
  assert.equal(quotaDi(alto), 3);
  assert.equal(quotaDi(pg), 0);
});

test('barra dell’Iniziativa e filtro dei giocatori: l’icona del volo arriva con il partecipante', () => {
  const scontro = { id: 's', stato: 'aperto', round: 1, turno: 0, partecipanti: [{ id: 'nem:drago:1', tipo: 'nemico', nome: 'Drago 1', lato: 'avversario', base: 5, d10: { valore: 5 }, des: 5, int: 5 }] };
  const scena = { token: [{ id: 'd', rif: { tipo: 'partecipante', id: 'nem:drago:1' }, q: [1, 1], ingombro: 1, volo: true }] };
  const b = barraIniziativa({ scontro, pezzi: [{ chiave: 'partecipante:nem:drago:1', lato: 'avversario', nome: 'Drago 1' }], scena });
  assert.equal(b.voci[0].volo, true);
  assert.equal(barraPerGiocatori(b, new Set(['partecipante:nem:drago:1'])).voci[0].volo, true);
});

test('formato della scena: volo e quota solo per le creature, quota intera', () => {
  const s = nuovaScena({ id: 'f', nome: 'F', colonne: C, righe: R, dati });
  const t = { id: 't', rif: { tipo: 'partecipante', id: 'pg:A' }, q: [1, 1], ingombro: 1, nascosto: false };
  assert.equal(validaScena({ ...s, token: [conVolo(t, true, 3)] }, dati), null);
  assert.equal(validaScena({ ...s, token: [conVolo(t, true)] }, dati), null);
  assert.deepEqual(conVolo(conVolo(t, true, 3), false), t, 'atterrando volo e quota spariscono');
  assert.match(validaScena({ ...s, token: [{ ...t, volo: 'sì' }] }, dati), /volo/);
  assert.match(validaScena({ ...s, token: [{ ...t, volo: true, quota: 1.5 }] }, dati), /quota/);
  assert.match(erroreVolo({ rif: { tipo: 'veicolo' }, volo: true }, dati.mappa), /veicoli/);
  assert.equal(inVolo(conVolo(t, true)), true);
});
