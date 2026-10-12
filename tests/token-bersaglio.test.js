// Oggetti della scena come bersaglio (12/10/2026, punto 6 della sessione di gioco di Marcello e Davide): al token
// libero si mette la spunta «Bersaglio», e allora si può scegliere nella linea di tiro e in «Attacca!» («Attacca
// questo bersaglio») senza scheda — niente Difese né PV: l'app dà il VA dell'attaccante e l'esito lo decide il master.
// Il nome del token libero si legge sempre sulla mappa, anche a 1 × 1 Q, con lo stesso bordo bianco dei template.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { oggettiScena, proprietaOggetto, riassuntoSelezione, cambiaProprieta } from '../src/mappa/editor.js';
import { lineaPerTablet } from '../src/mappa/tablet.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { disegnaToken } from '../src/ui/mappa/disegno-token.js';

const { dati } = await caricaDati((n) => readFile(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const C = 16;
const R = 10;
const libero = (o = {}) => ({ id: 'barile', rif: { tipo: 'segnaposto', id: null }, q: [6, 4], ingombro: 1, nascosto: false, nome: 'Barile di carburante', colore: '#d9a400', immagine: null, blocca: false, ...o });
const pgTok = { id: 't-pg', rif: { tipo: 'partecipante', id: 'pg:Akira' }, q: [1, 4], ingombro: 1, nascosto: false };
const nemicoTok = { id: 't-n1', rif: { tipo: 'partecipante', id: 'nem:predone:1' }, q: [11, 4], ingombro: 1, nascosto: false };
const scena = (token) => ({ ...nuovaScena({ id: 'p', nome: 'P', colonne: C, righe: R, nebbia: 'scoperta', dati }), token });
const pezzi = [
  { tipo: 'pg', pg: 'Akira', chiave: 'partecipante:pg:Akira', rif: { tipo: 'partecipante', id: 'pg:Akira' }, nome: 'Akira', lato: 'pg' },
  { tipo: 'nemico', chiave: 'partecipante:nem:predone:1', rif: { tipo: 'partecipante', id: 'nem:predone:1' }, nome: 'Predone 1', lato: 'avversario' },
];
const linea = (s, token) => lineaPerTablet({ scena: s, pezzi, chiavePg: 'Akira', verso: { token }, visibili: new Set(s.token.map((t) => t.id)), dati });

test('«Bersaglio» è un campo del token libero, e solo suo', () => {
  assert.equal(validaScena(scena([libero({ bersaglio: true })]), dati), null);
  assert.equal(validaScena(scena([libero()]), dati), null, 'senza il campo va bene lo stesso (scene vecchie)');
  assert.match(validaScena(scena([libero({ bersaglio: 'sì' })]), dati), /bersaglio: vero o falso/);
  assert.match(validaScena(scena([{ ...pgTok, bersaglio: true }]), dati), /bersaglio: solo per i token liberi/);
});

test('la spunta sta nel pannello della selezione e si cambia da lì', () => {
  const s = scena([libero()]);
  const o = oggettiScena(s).find((x) => x.tipo === 'token');
  assert.equal(o.bersaglio, false);
  assert.deepEqual(proprietaOggetto(o).map((p) => p.chiave), ['nascosto', 'blocca', 'bersaglio']);
  assert.deepEqual(riassuntoSelezione(s, ['token:barile'], dati).proprieta.map((p) => p.chiave), ['nascosto', 'blocca', 'bersaglio']);
  const dopo = cambiaProprieta(s, 'token:barile', { bersaglio: true }, dati);
  assert.equal(dopo.token[0].bersaglio, true);
  assert.equal(validaScena(dopo, dati), null);
  assert.equal(oggettiScena(dopo).find((x) => x.tipo === 'token').bersaglio, true);
});

test('la linea di tiro: un oggetto senza spunta non si attacca, con la spunta sì', () => {
  const senza = linea(scena([pgTok, libero(), nemicoTok]), 'barile');
  assert.equal(senza.ok, true, 'la linea si traccia comunque (distanza e Copertura servono lo stesso)');
  assert.deepEqual([senza.distanza, senza.nome, senza.bersagliabile], [5, 'Barile di carburante', false]);
  assert.equal(senza.bersaglioId, null, 'nessuna scheda: niente id di scontro');
  const con = linea(scena([pgTok, libero({ bersaglio: true }), nemicoTok]), 'barile');
  assert.deepEqual([con.ok, con.bersagliabile, con.nome], [true, true, 'Barile di carburante']);
  // un nemico resta attaccabile come prima
  const n = linea(scena([pgTok, libero(), nemicoTok]), 't-n1');
  assert.deepEqual([n.bersagliabile, n.bersaglioId], [true, 'nem:predone:1']);
});

test('niente Difese né PV nel risultato: l’esito lo decide il master', () => {
  const r = linea(scena([pgTok, libero({ bersaglio: true })]), 'barile');
  const testo = JSON.stringify(r);
  for (const k of ['"difese"', '"pv"', '"ar"', '"scheda"', '"stati"']) assert.ok(!testo.includes(k), `la linea non porta ${k}`);
  // ai giocatori il token libero arriva con il nome e senza PV, come prima
  const v = vistaGiocatori(scena([pgTok, libero({ bersaglio: true })]), { completo: true, pezzi });
  const t = v.token.find((x) => x.id === 'barile');
  assert.deepEqual([t.info.nome, t.info.pv, t.bersaglio], ['Barile di carburante', null, true]);
});

// --- l'etichetta sulla mappa -------------------------------------------------------------------------------------

/** Contesto di disegno finto: registra le scritte, misura un carattere mezzo corpo. */
function contestoFinto() {
  const nulla = () => {};
  return {
    font: '', lineWidth: 0, lineJoin: '', strokeStyle: '', fillStyle: '', textAlign: '', textBaseline: '', globalAlpha: 1, filter: '', shadowColor: '', shadowBlur: 0,
    scritte: [], bordi: [],
    save: nulla, restore: nulla, beginPath: nulla, closePath: nulla, clip: nulla, fill: nulla, stroke: nulla, arc: nulla, ellipse: nulla,
    roundRect: nulla, rect: nulla, moveTo: nulla, lineTo: nulla, translate: nulla, rotate: nulla, drawImage: nulla,
    setLineDash: nulla, fillRect: nulla, strokeRect: nulla,
    measureText(t) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 12); return { width: t.length * px * 0.5 }; },
    fillText(t, x, y) { this.scritte.push({ t, x, y, px: Number(/(\d+(?:\.\d+)?)px/.exec(this.font)[1]), colore: this.fillStyle }); },
    strokeText(t, x, y) { this.bordi.push({ t, x, y, colore: this.strokeStyle, spessore: this.lineWidth }); },
  };
}
const disegna = (token, opzioni = {}) => {
  const c = contestoFinto();
  disegnaToken(c, {
    scena: scena(token), cam: { scala: 1, ox: 0, oy: 0 }, pezzi: new Map(), colori: { fondo: '#fff', testo: '#111', selezione: '#fb0' },
    immagine: () => null, stileNome: dati.mappa.template.nome, ...opzioni,
  });
  return c;
};

test('il nome del token libero si legge sempre, anche a 1 × 1 Q', () => {
  const c = disegna([libero({ nome: 'Carro' })]);
  const nome = c.scritte.find((s) => s.t === 'Carro');
  assert.ok(nome, 'il nome è scritto sotto la pedina');
  const bordo = c.bordi.find((b) => b.t === 'Carro');
  assert.deepEqual([bordo.colore, bordo.spessore], [dati.mappa.template.nome.bordo, dati.mappa.template.nome.bordo_px], 'stesso bordo bianco dei template');
  assert.equal(nome.colore, dati.mappa.template.nome.colore);
  // sta sotto il quadretto del token (q = [6, 4], 1 Q): y più in basso del bordo inferiore
  const g = scena([]).griglia;
  assert.ok(nome.y > g.scosto_y + 5 * g.q_px, 'la scritta sta sotto la pedina, non sopra le iniziali');
  // un token grande: stesso trattamento
  assert.ok(disegna([libero({ nome: 'Camion', ingombro: 2 })]).scritte.some((s) => s.t === 'Camion'));
});

test('un nome lungo si rimpicciolisce e poi si accorcia con i puntini, come nei template', () => {
  const g = scena([]).griglia;
  const sta = (c) => {
    const s = c.scritte.at(-1);
    assert.ok(s.t.length * s.px * 0.5 <= dati.mappa.template.nome.larghezza_max_q * g.q_px + 0.01, `«${s.t}» non supera i 3 Q`);
    return s;
  };
  // lungo: ci sta rimpicciolendo il corpo, senza tagli
  const medio = sta(disegna([libero({ nome: 'Generatore della stazione' })]));
  assert.equal(medio.t, 'Generatore della stazione');
  assert.ok(medio.px < dati.mappa.template.nome.px_max);
  // lunghissimo: nemmeno al corpo minimo, e allora si taglia
  const lungo = sta(disegna([libero({ nome: 'Generatore della stazione di pompaggio dell’acqua del quartiere nord' })]));
  assert.ok(lungo.t.endsWith('…'), `«${lungo.t}» finisce con i puntini`);
  assert.equal(lungo.px, dati.mappa.template.nome.px_min);
});

test('i token con la scheda (PG, nemici) non prendono l’etichetta: hanno la loro mini-scheda', () => {
  const c = disegna([pgTok, nemicoTok]);
  assert.deepEqual(c.scritte.filter((s) => s.colore === dati.mappa.template.nome.colore), []);
});

test('senza lo stile del nome (vista vecchia) non si scrive niente: nessun errore', () => {
  const c = disegna([libero({ nome: 'Carro' })], { stileNome: null });
  assert.ok(!c.scritte.some((s) => s.t === 'Carro'));
});
