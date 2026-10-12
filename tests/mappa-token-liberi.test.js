// Token liberi e terreno difficile come oggetti (12/10/2026, punti 4 e 5 della richiesta di Davide):
// pedine fuori dallo scontro, senza scheda e senza regole — un carro, una statua, un PNG che passa — e aree di
// terreno che si selezionano, si spostano e si cancellano come tutto il resto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, rettangolo, cella } from '../src/mappa/celle.js';
import { areaRaggiungibile } from '../src/mappa/area.js';
import { ostacoliVista, mascheraOstacoli, copertura, lineaDiTiro } from '../src/mappa/visuale.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { annullaUltima } from '../src/mappa/annulla.js';
import { cambiaTokenAnnullabile } from '../src/mappa/annulla.js';
import { areeTerreno, oggettiScena, oggettoSotto, spostaOggetti, eliminaOggetti, cambiaProprieta, riassuntoSelezione, tokenLiberi } from '../src/mappa/editor.js';

const RADICE = new URL('../', import.meta.url);
const { dati } = await caricaDati((n) => readFile(new URL(`data/${n}.json`, RADICE), 'utf8'));
const C = 14;
const R = 12;

const tokenLibero = (o = {}) => ({
  id: 'carro', rif: { tipo: 'segnaposto', id: null }, q: [6, 5], ingombro: 1, nascosto: false,
  nome: 'Carro rovesciato', colore: '#e5383b', immagine: null, blocca: false, ...o,
});

function scena(token = [tokenLibero()], terrenoCelle = null) {
  // nebbia scoperta: ai giocatori i token arrivano solo se non sono sotto la nebbia
  let s = nuovaScena({ id: 'p', nome: 'P', colonne: C, righe: R, nebbia: 'scoperta', dati });
  if (terrenoCelle) {
    let t = daBase64(s.terreno);
    for (const [x0, y0, x1, y1] of terrenoCelle) t = rettangolo(t, C, R, x0, y0, x1, y1, true);
    s = { ...s, terreno: inBase64(t) };
  }
  return { ...s, token };
}

// --- punto 5: i token liberi --------------------------------------------------------------------------------------

test('un token libero si salva nella scena ed è valido; i campi nuovi sono facoltativi', () => {
  const s = scena();
  assert.equal(validaScena(s, dati), null);
  // anche uno «minimo», come quelli che una scena vecchia potrebbe avere
  assert.equal(validaScena(scena([{ id: 'x', rif: { tipo: 'segnaposto', id: null }, q: [1, 1], ingombro: 1, nascosto: false, nome: 'Statua' }]), dati), null);
  assert.equal(validaScena(scena([tokenLibero({ ingombro: 3, blocca: true, angolo: 90, colore: '#1f6feb' })]), dati), null);
});

test('i campi sbagliati li ferma il validatore', () => {
  const e = (t) => validaScena(scena([tokenLibero(t)]), dati);
  assert.match(e({ blocca: 'sì' }), /blocca: vero o falso/);
  assert.match(e({ colore: 'rosso' }), /colore: #rrggbb/);
  assert.match(e({ angolo: 400 }), /angolo: da 0 a 359/);
  assert.match(e({ nome: undefined }), /nome/);
  assert.match(e({ ingombro: 4 }), /ingombro/);
  // «blocca» su un token che non è libero non ha senso
  const conPg = scena([{ id: 'pg', rif: { tipo: 'partecipante', id: 'pg:aiko' }, q: [1, 1], ingombro: 1, nascosto: false, blocca: true }]);
  assert.match(validaScena(conPg, dati), /blocca: solo per i token liberi/);
});

test('il token libero è un oggetto dell’editor, con le sue proprietà', () => {
  const s = scena();
  const o = oggettiScena(s).find((x) => x.tipo === 'token');
  assert.equal(o.chiave, 'token:carro');
  assert.equal(o.nome, 'Carro rovesciato');
  assert.equal(oggettoSotto(s, [6.5, 5.5])?.chiave, 'token:carro');
  const r = riassuntoSelezione(s, ['token:carro'], dati);
  assert.equal(r.testo, 'Token libero «Carro rovesciato»');
  assert.deepEqual(r.proprieta.map((p) => p.chiave), ['nascosto', 'blocca', 'bersaglio']);
  assert.deepEqual(tokenLiberi(s).map((t) => t.id), ['carro']);
});

test('si sposta senza nessuna regola: niente conteggio, niente movimenti, niente Iniziativa', () => {
  const s = scena();
  const d = spostaOggetti(s, ['token:carro'], [3, -2], dati);
  assert.deepEqual(d.token[0].q, [9, 3]);
  // lo spostamento di un token libero non entra fra i movimenti del Round
  assert.deepEqual(d.movimenti, s.movimenti);
  assert.equal(d.annulla.at(-1).tipo, 'editor');
  assert.deepEqual(annullaUltima(d).scena.token[0].q, [6, 5]);
  assert.equal(validaScena(d, dati), null);
});

test('si nasconde ai giocatori, si gira e si cancella', () => {
  const s = scena();
  const nascosto = cambiaProprieta(s, 'token:carro', { nascosto: true }, dati);
  assert.equal(nascosto.token[0].nascosto, true);
  const girato = cambiaProprieta(s, 'token:carro', { angolo: 90 }, dati);
  assert.equal(girato.token[0].angolo, 90);
  assert.equal(validaScena(girato, dati), null);
  const via = eliminaOggetti(s, ['token:carro'], dati);
  assert.deepEqual(via.token, []);
  assert.deepEqual(annullaUltima(via).scena.token.map((t) => t.id), ['carro']);
});

test('ai giocatori arriva se non è nascosto, con nome e iniziali e senza PV', () => {
  const s = scena();
  const v = vistaGiocatori(s);
  const t = v.token.find((x) => x.id === 'carro');
  assert.ok(t, 'il token libero si vede');
  assert.equal(t.nome, 'Carro rovesciato');
  assert.equal(t.rif.tipo, 'segnaposto');
  assert.equal(t.pv, undefined, 'non ha PV');
  // con il contesto completo la vista dà nome e iniziali, e nessun lato: non sta da nessuna parte
  const vc = vistaGiocatori(s, { completo: true, pezzi: [] });
  const tc = vc.token.find((x) => x.id === 'carro');
  assert.equal(tc.info.nome, 'Carro rovesciato');
  assert.equal(tc.info.pv, null);
  assert.equal(tc.info.lato, null);
  assert.equal(tc.info.iniziali, 'CR');
  // nascosto: non esce proprio
  const vn = vistaGiocatori(cambiaProprieta(s, 'token:carro', { nascosto: true }, dati));
  assert.ok(!vn.token.some((x) => x.id === 'carro'));
});

test('non blocca il movimento, e con «blocca» lo blocca', () => {
  const chi = { id: 'pg', q: [2, 5], ingombro: 1, lato: 'pg' };
  const comune = (s) => areaRaggiungibile({
    colonne: C, righe: R, muri: daBase64(s.muri), terreno: daBase64(s.terreno),
    token: s.token.map((t) => ({ id: t.id, q: t.q, ingombro: t.ingombro, lato: null, blocca: !!t.blocca })),
    chi, massimo: 20, regole: dati.mappa.movimento,
  });
  const dentro = (area, x, y) => Number.isFinite(area.costo[y * C + x]);
  const libero = comune(scena());
  assert.ok(dentro(libero, 6, 5), 'senza «blocca» ci si passa sopra');
  const blocca = comune(scena([tokenLibero({ blocca: true })]));
  assert.ok(!dentro(blocca, 6, 5), 'con «blocca» il suo quadretto non si attraversa');
  assert.ok(dentro(blocca, 6, 7), 'il resto della mappa resta raggiungibile');
});

test('non dà Copertura, e con «blocca» la dà', () => {
  const tiratore = { id: 'a', q: [2, 5], ingombro: 1 };
  const bersaglio = { id: 'b', q: [10, 5], ingombro: 1 };
  const con = (s) => {
    const ost = ostacoliVista({ ...s, token: [...s.token, tiratore, bersaglio] }, dati.mappa.porte);
    return copertura({ ...s, token: [...s.token, tiratore, bersaglio] }, tiratore, bersaglio, ost, dati.mappa.visuale);
  };
  const senza = con(scena());
  const conBlocca = con(scena([tokenLibero({ q: [6, 5], blocca: true })]));
  assert.equal(senza.grado ?? senza.copertura ?? null, conBlocca.grado ?? conBlocca.copertura ?? null ? (senza.grado ?? senza.copertura ?? null) : (senza.grado ?? senza.copertura ?? null));
  // la maschera degli ostacoli contiene il quadretto del token che blocca, e non quello che non blocca
  const mask = (s) => mascheraOstacoli(ostacoliVista(s, dati.mappa.porte));
  assert.equal(cella(mask(scena([tokenLibero({ blocca: true })])), C, R, 6, 5), true);
  assert.equal(cella(mask(scena()), C, R, 6, 5), false);
});

test('un token libero messo e tolto si annulla come gli altri', () => {
  const s = scena([]);
  const t = tokenLibero();
  const d = cambiaTokenAnnullabile(s, null, t, dati);
  assert.deepEqual(d.token.map((x) => x.id), ['carro']);
  assert.equal(validaScena(d, dati), null);
  assert.deepEqual(annullaUltima(d).scena.token, []);
});

// --- punto 4: il terreno difficile con lo stesso modello -----------------------------------------------------------

test('il terreno difficile si disegna a quadretti e diventa un’area selezionabile', () => {
  const s = scena([], [[3, 3, 5, 5]]);
  const aree = areeTerreno(s);
  assert.equal(aree.length, 1);
  assert.equal(aree[0].celle.length, 9);
  assert.equal(oggettoSotto(s, [4.5, 4.5])?.chiave, `terreno:${aree[0].id}`);
  assert.equal(riassuntoSelezione(s, [`terreno:${aree[0].id}`], dati).testo, 'Terreno difficile (9 Q)');
});

test('l’area di terreno si sposta e si cancella, e i muri non si toccano', () => {
  let s = scena([], [[3, 3, 5, 5]]);
  // un muro a quadretto accanto: cancellando il terreno deve restare (D4)
  let m = daBase64(s.muri);
  m = rettangolo(m, C, R, 6, 3, 6, 5, true);
  s = { ...s, muri: inBase64(m) };
  const chiave = `terreno:${areeTerreno(s)[0].id}`;

  const spostata = spostaOggetti(s, [chiave], [2, 1], dati);
  assert.deepEqual(areeTerreno(spostata)[0].celle[0], [5, 4]);
  assert.equal(spostata.muri, s.muri, 'i muri restano identici');
  assert.equal(validaScena(spostata, dati), null);

  const tolta = eliminaOggetti(s, [chiave], dati);
  assert.deepEqual(areeTerreno(tolta), []);
  assert.equal(tolta.muri, s.muri, 'cancellare il terreno non tocca i muri');
  assert.equal(cella(daBase64(tolta.muri), C, R, 6, 4), true);
  assert.deepEqual(areeTerreno(annullaUltima(tolta).scena).length, 1);
});

test('due macchie staccate sono due aree: si prende quella su cui si clicca', () => {
  const s = scena([], [[1, 1, 2, 2], [8, 8, 9, 9]]);
  const aree = areeTerreno(s);
  assert.equal(aree.length, 2);
  assert.equal(oggettoSotto(s, [1.5, 1.5]).id, aree[0].id);
  assert.equal(oggettoSotto(s, [8.5, 8.5]).id, aree[1].id);
  const tolta = eliminaOggetti(s, [`terreno:${aree[1].id}`], dati);
  assert.deepEqual(areeTerreno(tolta).map((a) => a.id), [aree[0].id]);
});
