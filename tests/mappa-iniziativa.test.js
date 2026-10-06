// Lotto 6 della mappa di battaglia (docs/battlemap/piano.md): barra dell'Iniziativa (src/mappa/iniziativa.js), barra
// accanto alla mappa in tre disposizioni (src/mappa/disposizione.js), camera che resta centrata quando il riquadro
// cambia misura (src/mappa/camera.js → mantieniCentro) e barra filtrata per i giocatori (src/mappa/vista.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barraIniziativa, barraPerGiocatori, posizioneSullaScala, tacche, avanzamentoTurno } from '../src/mappa/iniziativa.js';
import { DISPOSIZIONI, prossimaDisposizione, disposizioneIniziale, normalizzaDisposizione, larghezzaBarra, trascinaBordo, chiaveSchermo } from '../src/mappa/disposizione.js';
import { mantieniCentro, mappaDaSchermo } from '../src/mappa/camera.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { avanti } from '../src/scontro.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const B = dati.mappa.vista.barra;

const part = (id, nome, base, d10, lato, des = 5, int = 5) => ({ id, nome, tipo: id.startsWith('pg:') ? 'pg' : 'nemico', base, d10: { valore: d10, origine: 'app' }, lato, des, int });
const scontroProva = () => ({
  id: 'scontro-prova', stato: 'aperto', round: 2, turno: 1, ordineAlleati: [], durate: [], registro: [],
  partecipanti: [
    part('pg:LUCAS', 'Lucas', 4, 10, 'alleato', 7),
    part('pg:OSHI', 'Oshi', 3, 4, 'alleato'),
    part('nem:predone:1', 'Predone 1', 2, 9, 'avversario', 6),
    part('nem:predone:2', 'Predone 2', 2, 9, 'avversario', 4),
    part('pg:PABLO', 'Pablo', 5, 9, 'alleato', 6, 6),
    { ...part('nem:predone:3', 'Predone 3', 2, 1, 'avversario'), d10: null }, // non ha ancora tirato
  ],
});
const pezzo = (id, lato, extra = {}) => ({ chiave: `partecipante:${id}`, nome: id, iniziali: id.slice(4, 6).toUpperCase(), lato, ritratto: `img-${id}`, pv: { attuali: 5, massimo: 10 }, ...extra });

test('barraIniziativa: valori, ordine della plancia, pile dei pari merito, turno, Round, token nascosti segnati', () => {
  const s = scontroProva();
  const scena = { token: [
    { id: 't1', rif: { tipo: 'partecipante', id: 'nem:predone:1' }, q: [1, 1], ingombro: 1, nascosto: true },
    { id: 't2', rif: { tipo: 'partecipante', id: 'pg:LUCAS' }, q: [2, 2], ingombro: 1, nascosto: false },
  ] };
  const b = barraIniziativa({ scontro: s, pezzi: [pezzo('pg:LUCAS', 'pg'), pezzo('nem:predone:1', 'avversario')], scena });
  assert.equal(b.round, 2);
  // Lucas 14 · Pablo 14 · Predone 1 11 · Predone 2 11 · Oshi 7; chi non ha tirato non c'è
  assert.deepEqual(b.voci.map((v) => [v.id, v.valore, v.pila]), [
    ['pg:LUCAS', 14, 0], ['pg:PABLO', 14, 1], ['nem:predone:1', 11, 0], ['nem:predone:2', 11, 1], ['pg:OSHI', 7, 0]]);
  assert.deepEqual([b.minimo, b.massimo, b.pile], [7, 14, 2]);
  // turno 1: il secondo nell'ordine
  assert.equal(b.diTurno, 'pg:PABLO');
  assert.deepEqual(b.voci.filter((v) => v.diTurno).map((v) => v.id), ['pg:PABLO']);
  const p1 = b.voci.find((v) => v.id === 'nem:predone:1');
  assert.deepEqual([p1.token, p1.nascosto, p1.ritratto, p1.lato], ['t1', true, 'img-nem:predone:1', 'avversario']);
  // senza pezzo: nome e iniziali dallo scontro
  assert.equal(b.voci.find((v) => v.id === 'pg:OSHI').iniziali, 'OS');
  // posizione: il valore più alto a sinistra
  assert.equal(posizioneSullaScala(b, 14), 0);
  assert.equal(posizioneSullaScala(b, 7), 1);
  assert.deepEqual(tacche(b), [14, 13, 12, 11, 10, 9, 8, 7]);
  // «Avanti» della plancia (lo stesso dalla mappa): il turno passa al terzo
  assert.equal(barraIniziativa({ scontro: avanti(s), pezzi: [], scena }).diTurno, 'nem:predone:1');
  // niente scontro aperto, niente barra
  assert.equal(barraIniziativa({ scontro: null }), null);
  assert.equal(barraIniziativa({ scontro: { ...s, stato: 'bozza' } }), null);
});

test('barraPerGiocatori: via i nascosti e i nemici sotto la nebbia; i PG restano (anche sotto la nebbia); turno solo se c’è', () => {
  const s = { ...scontroProva(), turno: 2 }; // di turno Predone 1, nascosto
  const scena = { token: [
    { id: 't1', rif: { tipo: 'partecipante', id: 'nem:predone:1' }, q: [1, 1], ingombro: 1, nascosto: true },
    { id: 't2', rif: { tipo: 'partecipante', id: 'nem:predone:2' }, q: [2, 2], ingombro: 1, nascosto: false },
    { id: 't3', rif: { tipo: 'partecipante', id: 'pg:OSHI' }, q: [3, 3], ingombro: 1, nascosto: true },
  ] };
  const b = barraIniziativa({ scontro: s, pezzi: [], scena });
  // si vede solo il token di Predone 2; Lucas e Pablo non hanno token; Oshi è nascosto
  const g = barraPerGiocatori(b, new Set(['partecipante:nem:predone:2']), (k) => `api/${k}`);
  assert.deepEqual(g.voci.map((v) => v.id ?? v.chiave), ['partecipante:pg:LUCAS', 'partecipante:pg:PABLO', 'partecipante:nem:predone:2']);
  assert.equal(g.diTurno, null, 'chi è di turno è nascosto: nessun nome');
  assert.ok(g.voci.every((v) => !('token' in v) && !('pv' in v) && !('nascosto' in v)));
  assert.equal(g.voci[2].ritratto, 'api/partecipante:nem:predone:2');
  assert.deepEqual([g.minimo, g.massimo, g.pile], [11, 14, 2]);
  assert.equal(barraPerGiocatori(null, new Set()), null);
  // un PG sotto la nebbia (token non visibile ma non nascosto) resta; un nemico sotto la nebbia no
  const sottoNebbia = barraIniziativa({ scontro: s, pezzi: [], scena: { token: [...scena.token, { id: 't4', rif: { tipo: 'partecipante', id: 'pg:LUCAS' }, q: [4, 4], ingombro: 1, nascosto: false }] } });
  assert.deepEqual(barraPerGiocatori(sottoNebbia, new Set()).voci.map((v) => v.chiave), ['partecipante:pg:LUCAS', 'partecipante:pg:PABLO']);
});

test('vista giocatori: con lo scontro nel contesto arriva la barra filtrata', () => {
  let s = nuovaScena({ id: 'prova', nome: 'Prova', mappa: null, dati });
  s = { ...s, nebbia: { ...s.nebbia }, token: [
    { id: 't1', rif: { tipo: 'partecipante', id: 'nem:predone:1' }, q: [1, 1], ingombro: 1, nascosto: true },
    { id: 't2', rif: { tipo: 'partecipante', id: 'pg:LUCAS' }, q: [2, 2], ingombro: 1, nascosto: false },
  ] };
  // nebbia tutta scoperta: si vede tutto ciò che non è nascosto
  const scoperta = { ...s, nebbia: { ...s.nebbia, coperti: nuovaScena({ id: 'x', nome: 'x', mappa: null, dati, nebbia: 'scoperta' }).nebbia.coperti } };
  const pezzi = [pezzo('pg:LUCAS', 'pg'), pezzo('nem:predone:1', 'avversario')];
  const v = vistaGiocatori(scoperta, { pezzi, round: 2, immagineDi: (p) => `api/ritratti/${p.chiave}`, scontro: scontroProva() });
  assert.ok(v.iniziativa);
  assert.ok(!v.iniziativa.voci.some((x) => x.chiave === 'partecipante:nem:predone:1'), 'nascosto: non c’è');
  assert.ok(v.iniziativa.voci.some((x) => x.chiave === 'partecipante:pg:LUCAS'));
  // senza scontro (bozza): nessuna barra
  assert.equal(vistaGiocatori(scoperta, { pezzi, round: null }).iniziativa, undefined);
});

test('disposizioni: Tab e doppio clic in giro, larghezza, bordo trascinato, valori letti normalizzati', () => {
  assert.deepEqual(DISPOSIZIONI, ['mappa', 'equilibrata', 'scontro']);
  assert.equal(prossimaDisposizione('mappa'), 'equilibrata');
  assert.equal(prossimaDisposizione('scontro'), 'mappa');
  assert.equal(prossimaDisposizione('mappa', -1), 'scontro');
  const st = disposizioneIniziale(B);
  assert.equal(st.disposizione, 'equilibrata');
  assert.equal(larghezzaBarra(st, 1920, B), Math.round(1920 * B.equilibrata));
  assert.equal(larghezzaBarra({ ...st, disposizione: 'mappa' }, 1920, B), B.mappa_grande_px);
  assert.equal(larghezzaBarra({ ...st, disposizione: 'scontro' }, 1366, B), Math.round(1366 * B.scontro_grande));
  // pagina stretta: la mappa tiene il suo minimo
  assert.equal(larghezzaBarra({ ...st, disposizione: 'scontro' }, 500, B), 500 - B.mappa_minima_px);
  // bordo trascinato: la frazione va nella disposizione in corso
  const t = trascinaBordo(st, 800, 1920, B);
  assert.deepEqual([t.disposizione, t.frazioni.equilibrata], ['equilibrata', Math.round((800 / 1920) * 1000) / 1000]);
  assert.equal(trascinaBordo(st, 100, 1920, B).disposizione, 'mappa');
  assert.equal(trascinaBordo({ ...st, disposizione: 'mappa' }, 600, 1920, B).disposizione, 'equilibrata');
  assert.equal(trascinaBordo(st, 1900, 1920, B).frazioni.equilibrata, B.frazione_massima);
  // dal localStorage: valori sbagliati tornano ai dati
  assert.deepEqual(normalizzaDisposizione(null, B), st);
  assert.deepEqual(normalizzaDisposizione({ disposizione: 'boh', frazioni: { equilibrata: 9 } }, B), { disposizione: 'equilibrata', frazioni: { equilibrata: B.frazione_massima, scontro: B.scontro_grande } });
  assert.equal(chiaveSchermo(1920, 1080), 'mutant-mappa-disposizione:1920x1080');
});

test('mantieniCentro: cambiando la misura del riquadro restano lo zoom e il punto al centro', () => {
  const cam = { scala: 1.7, ox: -300, oy: -120 };
  const prima = { larghezza: 1260, altezza: 900 };
  const dopo = { larghezza: 700, altezza: 900 };
  const centro = (c, r) => mappaDaSchermo(c, r.larghezza / 2, r.altezza / 2);
  const c2 = mantieniCentro(cam, prima, dopo);
  assert.equal(c2.scala, cam.scala);
  assert.deepEqual(centro(c2, dopo), centro(cam, prima));
  assert.equal(mantieniCentro(cam, { larghezza: 0, altezza: 0 }, dopo), cam, 'prima misura: niente da mantenere');
});

test('«Prepara la mappa»: la scena già collegata alla bozza è quella proposta; il collegamento sostituisce quello di prima', async () => {
  const { scenaDellaBozza, collegaABozza } = await import('../src/mappa/scena.js');
  const elenco = [
    { id: 'a', collegamento: { scontro: 'scontro-x', bozza: null } },
    { id: 'b', collegamento: { scontro: null, bozza: 'bozza-1' } },
    { id: 'c', collegamento: null },
  ];
  assert.equal(scenaDellaBozza(elenco, 'bozza-1'), 'b');
  assert.equal(scenaDellaBozza(elenco, 'bozza-2'), null);
  assert.deepEqual(collegaABozza({ id: 'a', collegamento: { scontro: 'scontro-x', bozza: null } }, 'bozza-2').collegamento, { scontro: null, bozza: 'bozza-2' });
});

test('avanzamentoTurno: la linea si colora dal più alto fino a chi è di turno; al nuovo Round riparte', () => {
  const s = scontroProva(); // turno 1: Pablo, 14 come il più alto
  assert.equal(avanzamentoTurno(barraIniziativa({ scontro: { ...s, turno: 0 } })), 0);
  assert.equal(avanzamentoTurno(barraIniziativa({ scontro: { ...s, turno: 2 } })), (14 - 11) / (14 - 7));
  assert.equal(avanzamentoTurno(barraIniziativa({ scontro: { ...s, turno: 4 } })), 1);
  // l'ultimo «Avanti» del Round: Round 3, di nuovo il primo, linea a 0
  const nuovo = avanti({ ...s, turno: 4 });
  assert.deepEqual([nuovo.round, avanzamentoTurno(barraIniziativa({ scontro: nuovo }))], [3, 0]);
});
