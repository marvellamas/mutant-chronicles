// Mappa di battaglia, lotto 1 (docs/battlemap/piano.md): logica pura di src/mappa/ e dati di data/mappa.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import {
  nuovaMaschera, inBase64, daBase64, mascheraValida, cella, impostaCella, rettangolo, pennello, conta, senza, ridimensiona, byteMaschera,
} from '../src/mappa/celle.js';
import { tipoImmagine, dimensioniImmagine } from '../src/mappa/immagine.js';
import { ingombroDaTaglia, celleToken, tokenDentro, sovrapposti } from '../src/mappa/token.js';
import { tokenOrfani, pezziSenzaToken } from '../src/mappa/partecipanti.js';
import { nuovaScena, validaScena, dimensioniGriglia, riassuntoScena } from '../src/mappa/scena.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { validaDati } from '../src/validate.js';
import { versioniPersonaggio } from '../src/rules.js';

const { dati, errori } = await datiReali();
const adesso = new Date('2026-10-06T20:00:00Z');

// ── Immagini finte: solo l'intestazione, quanto basta per tipo e dimensioni ──
const byte = (...parti) => Uint8Array.from(parti.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le16 = (n) => [n & 255, (n >> 8) & 255];
const le24 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];
const PNG = (w, h) => byte([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a], be32(13), 'IHDR', be32(w), be32(h), [8, 6, 0, 0, 0], [0, 0, 0, 0]);
const JPEG = (w, h) => byte([0xff, 0xd8, 0xff, 0xe0, 0, 16], 'JFIF', [0, 1, 1, 0, 0, 1, 0, 1, 0, 0], [0xff, 0xc0, 0, 17, 8, h >> 8, h & 255, w >> 8, w & 255, 3], new Array(12).fill(0));
const WEBP_X = (w, h) => byte('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8X', [10, 0, 0, 0], [0, 0, 0, 0], le24(w - 1), le24(h - 1));
const WEBP_L = (w, h) => {
  const bits = (w - 1) | ((h - 1) << 14);
  return byte('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8L', [5, 0, 0, 0], [0x2f], [bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255]);
};
const WEBP_LOSSY = (w, h) => byte('RIFF', [0, 0, 0, 0], 'WEBP', 'VP8 ', [10, 0, 0, 0], [0, 0, 0], [0x9d, 0x01, 0x2a], le16(w), le16(h));

test('data/mappa.json: valido, solo del Tavolo del Master, con i TODO(Davide) del movimento', () => {
  assert.deepEqual(errori, []);
  assert.ok(dati.mappa, 'mappa.json caricato');
  // non entra nelle versioni dei dati scritte nei file dei PG
  assert.equal(versioniPersonaggio(dati).mappa, undefined);
  const testo = JSON.stringify(dati.mappa);
  for (const a of ['A.124', 'A.126', 'A.127', 'A.128', 'A.129']) assert.ok(testo.includes(a), `${a} nei dati`);
  // il validatore dice file, chiave e problema
  const d = copia(dati);
  d.mappa.token.ingombro_per_taglia.grande = 7;
  d.mappa.movimento.fasce = ['passo', 'corsa'];
  const e = validaDati(d);
  assert.ok(e.some((x) => x.file === 'mappa.json' && x.chiave === 'token.ingombro_per_taglia.grande'));
  assert.ok(e.some((x) => x.file === 'mappa.json' && x.chiave === 'movimento.fasce'));
  const senza = copia(dati);
  delete senza.mappa;
  assert.ok(validaDati(senza).some((x) => x.file === 'mappa.json' && x.chiave === ''));
});

test('maschere: base64 andata e ritorno, celle, rettangolo, pennello, conta', () => {
  const C = 11, R = 7;
  let m = nuovaMaschera(C, R);
  assert.equal(m.length, byteMaschera(C, R));
  assert.equal(conta(m, C, R), 0);
  assert.equal(conta(nuovaMaschera(C, R, true), C, R), 77);
  impostaCella(m, C, R, 10, 6, true);
  assert.ok(cella(m, C, R, 10, 6));
  assert.ok(!cella(m, C, R, 11, 6), 'fuori dalla griglia: falso');
  impostaCella(m, C, R, 99, 99, true); // fuori: non fa nulla
  assert.equal(conta(m, C, R), 1);
  const b = inBase64(m);
  assert.ok(mascheraValida(b, C, R));
  assert.ok(!mascheraValida(b, C + 8, R), 'lunghezza sbagliata');
  assert.ok(!mascheraValida('!!non base64!!', C, R));
  assert.deepEqual(daBase64(b), m);
  m = rettangolo(m, C, R, 3, 4, 1, 2, true); // estremi in ordine qualunque: 3 × 3
  assert.equal(conta(m, C, R), 10);
  const p = pennello(nuovaMaschera(C, R), C, R, 0, 0, 3, true); // tagliato dal bordo: 2 × 2
  assert.equal(conta(p, C, R), 4);
  assert.ok(cella(p, C, R, 1, 1) && !cella(p, C, R, 2, 2));
  const tolta = pennello(nuovaMaschera(C, R, true), C, R, 5, 3, 1, false);
  assert.equal(conta(tolta, C, R), 76);
  const diff = senza(nuovaMaschera(C, R, true), p);
  assert.equal(conta(diff, C, R), 73);
});

test('maschere: ridimensionamento della griglia ricalibrata', () => {
  const m = rettangolo(nuovaMaschera(4, 3), 4, 3, 0, 0, 3, 2, true);
  const piu = ridimensiona(m, 4, 3, 6, 5);
  assert.equal(conta(piu, 6, 5), 12, 'i Q nuovi restano a 0');
  const coperta = ridimensiona(m, 4, 3, 6, 5, true);
  assert.equal(conta(coperta, 6, 5), 30, 'nebbia: i Q nuovi coperti');
  const meno = ridimensiona(m, 4, 3, 2, 2);
  assert.equal(conta(meno, 2, 2), 4);
});

test('immagini: tipo e dimensioni dall’intestazione (PNG, JPEG, WEBP)', () => {
  assert.deepEqual(dimensioniImmagine(PNG(1920, 1080)), { tipo: 'png', larghezza: 1920, altezza: 1080 });
  assert.deepEqual(dimensioniImmagine(JPEG(4000, 3000)), { tipo: 'jpeg', larghezza: 4000, altezza: 3000 });
  assert.deepEqual(dimensioniImmagine(WEBP_X(5000, 2500)), { tipo: 'webp', larghezza: 5000, altezza: 2500 });
  assert.deepEqual(dimensioniImmagine(WEBP_L(300, 200)), { tipo: 'webp', larghezza: 300, altezza: 200 });
  assert.deepEqual(dimensioniImmagine(WEBP_LOSSY(640, 480)), { tipo: 'webp', larghezza: 640, altezza: 480 });
  assert.equal(tipoImmagine(byte('GIF89a', new Array(20).fill(0))), null);
  assert.equal(dimensioniImmagine(byte('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
  assert.equal(dimensioniImmagine(new Uint8Array(3)), null);
  // immagini vere del repository
  const vera = (p) => new Uint8Array(readFileSync(new URL(`../img/corporazioni/${p}`, import.meta.url)));
  assert.deepEqual(dimensioniImmagine(vera('alleanza-512.png')), { tipo: 'png', larghezza: 512, altezza: 512 });
  assert.deepEqual(dimensioniImmagine(vera('alleanza-512.webp')), { tipo: 'webp', larghezza: 512, altezza: 512 });
});

test('token: ingombro dalla Taglia, celle, dentro la griglia, sovrapposizioni', () => {
  assert.equal(ingombroDaTaglia('normale', dati), 1);
  assert.equal(ingombroDaTaglia('grande', dati), 2);
  assert.equal(ingombroDaTaglia(undefined, dati), 1, 'Taglia assente: normale (formato_nemici.json)');
  const g = { id: 'g', q: [3, 3], ingombro: 2 };
  assert.deepEqual(celleToken(g), [[3, 3], [4, 3], [3, 4], [4, 4]]);
  assert.ok(tokenDentro(g, 5, 5));
  assert.ok(!tokenDentro(g, 4, 5), 'esce a destra');
  assert.ok(!tokenDentro({ q: [-1, 0], ingombro: 1 }, 5, 5));
  assert.deepEqual(sovrapposti([g, { id: 'a', q: [4, 4], ingombro: 1 }, { id: 'b', q: [0, 0], ingombro: 1 }]), [['g', 'a']]);
});

test('token e scontro: token senza partecipante e partecipanti senza token', () => {
  const scontro = { partecipanti: [{ id: 'pg:lucas' }, { id: 'nem:predatore:1' }] };
  const scena = { token: [
    { id: 't1', rif: { tipo: 'partecipante', id: 'pg:lucas' } },
    { id: 't2', rif: { tipo: 'partecipante', id: 'nem:predatore:2' } },
    { id: 't3', rif: { tipo: 'segnaposto' } },
  ] };
  const pezzi = scontro.partecipanti.map((p) => ({ chiave: `partecipante:${p.id}` }));
  assert.deepEqual(tokenOrfani(scena, pezzi).map((t) => t.id), ['t2']);
  assert.deepEqual(pezziSenzaToken(scena, pezzi).map((p) => p.chiave), ['partecipante:nem:predatore:1']);
});

/** Scena di prova 10 × 8 Q con un po' di tutto. */
function scenaDiProva() {
  const s = nuovaScena({ id: 'cripta', nome: 'Cripta di Mishima', colonne: 10, righe: 8, dati, adesso });
  const C = 10, R = 8;
  let nebbia = daBase64(s.nebbia.coperti);
  nebbia = rettangolo(nebbia, C, R, 0, 0, 4, 7, false); // scoperta la metà sinistra
  s.nebbia.coperti = inBase64(nebbia);
  s.muri = inBase64(rettangolo(rettangolo(nuovaMaschera(C, R), C, R, 2, 0, 2, 3, true), C, R, 7, 0, 7, 7, true));
  s.terreno = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 8, 5, 9, 6, true));
  s.token = [
    { id: 't-lucas', rif: { tipo: 'partecipante', id: 'pg:lucas' }, q: [0, 0], ingombro: 1, nascosto: false },
    { id: 't-agguato', rif: { tipo: 'partecipante', id: 'nem:predatore:1' }, q: [1, 5], ingombro: 1, nascosto: true },
    { id: 't-ombra', rif: { tipo: 'partecipante', id: 'nem:predatore:2' }, q: [8, 1], ingombro: 1, nascosto: false },
    { id: 't-bordo', rif: { tipo: 'partecipante', id: 'nem:demone:1' }, q: [4, 2], ingombro: 2, nascosto: false },
    { id: 't-cassa', rif: { tipo: 'segnaposto' }, nome: 'Cassa', q: [3, 6], ingombro: 1, nascosto: false },
  ];
  s.template = [
    { id: 'tp-1', forma: 'cerchio', origine: [1, 1], misure: { raggio: 2 }, fine_round: 3, nascosto: false },
    { id: 'tp-2', forma: 'cono', origine: [9, 4], misure: { lunghezza: 6, larghezza: 3 }, direzione: 0, nascosto: false },
    { id: 'tp-3', forma: 'quadrato', origine: [0, 4], misure: { lato: 2 }, nascosto: true },
  ];
  s.mappa = { file: 'cripta-0123456789ab.jpg', ridotta: 'cripta-0123456789ab-ridotta.webp', larghezza: 640, altezza: 512 };
  s.collegamento = { scontro: 'scontro-20261006-200000', bozza: 'bozza-cripta' };
  s.movimenti = [{ round: 1, token: 't-ombra', da: [9, 1], a: [8, 1] }];
  s.annulla = [{ tipo: 'muri' }];
  return s;
}

test('scena nuova: griglia dai dati o dall’immagine, nebbia iniziale, valida', () => {
  const s = nuovaScena({ id: 'vuota', nome: 'Vuota', colonne: 20, righe: 15, dati, adesso });
  assert.equal(s.revisione, 0);
  assert.equal(s.griglia.q_px, dati.mappa.griglia.predefinita.q_px);
  assert.equal(conta(daBase64(s.nebbia.coperti), 20, 15), 300, 'nebbia iniziale coperta (§5)');
  assert.equal(conta(daBase64(s.muri), 20, 15), 0);
  assert.equal(validaScena(s, dati), null);
  const scoperta = nuovaScena({ id: 'aperta', nome: 'Aperta', colonne: 4, righe: 4, nebbia: 'scoperta', dati, adesso });
  assert.equal(conta(daBase64(scoperta.nebbia.coperti), 4, 4), 0);
  // con l'immagine: 1000 × 700 px a 64 px per Q con scostamento 10 → 16 × 11 Q
  const conMappa = nuovaScena({ id: 'img', nome: 'Img', mappa: { file: 'x-1.png', larghezza: 1000, altezza: 700 }, griglia: { scosto_x: 10, scosto_y: 10 }, dati, adesso });
  assert.deepEqual([conMappa.griglia.colonne, conMappa.griglia.righe], [16, 11]);
  assert.deepEqual(dimensioniGriglia({ larghezza: 1000, altezza: 700 }, { q_px: 64, scosto_x: 10, scosto_y: 10 }), { colonne: 16, righe: 11 });
  assert.equal(validaScena(conMappa, dati), null);
  assert.equal(validaScena(scenaDiProva(), dati), null);
  assert.deepEqual(riassuntoScena(scenaDiProva(), 5), { id: 'cripta', nome: 'Cripta di Mishima', revisione: 0, mappa: 'cripta-0123456789ab.jpg', colonne: 10, righe: 8, token: 5, collegamento: { scontro: 'scontro-20261006-200000', bozza: 'bozza-cripta' }, iniziale: null, mtime: 5 });
});

test('validaScena: ogni problema dice dove', () => {
  const casi = [
    [(s) => { s.formato = 'altro'; }, /^formato/],
    [(s) => { s.id = 'Con Spazi'; }, /^id/],
    [(s) => { s.griglia.q_px = 2; }, /^griglia\.q_px/],
    [(s) => { s.griglia.colonne = 11; }, /^muri/],
    [(s) => { s.nebbia.coperti = 'AAAA'; }, /^nebbia\.coperti/],
    [(s) => { s.mappa.file = '../personaggi/x.json'; }, /^mappa\.file/],
    [(s) => { s.token[1].id = 't-lucas'; }, /token\[1\]: id «t-lucas» ripetuto/],
    [(s) => { s.token[1].rif.id = 'pg:lucas'; }, /token\[1\]: il partecipante «pg:lucas» ha già un token/],
    [(s) => { s.token[3].q = [9, 2]; }, /^token\[3\]\.q/],
    [(s) => { s.token[0].ingombro = 4; }, /^token\[0\]\.ingombro/],
    [(s) => { delete s.token[4].nome; }, /^token\[4\]\.nome/],
    [(s) => { s.template[0].forma = 'stella'; }, /^template\[0\]\.forma/],
    [(s) => { s.template[1].origine = [10, 0]; }, /^template\[1\]\.origine/],
    [(s) => { s.collegamento.scontro = '../x'; }, /^collegamento\.scontro/],
    [(s) => { s.annulla = new Array(dati.mappa.scena.annulla_max + 1).fill({}); }, /^annulla/],
  ];
  for (const [cambia, atteso] of casi) {
    const s = scenaDiProva();
    cambia(s);
    assert.match(validaScena(s, dati) ?? '(nessun errore)', atteso);
  }
  assert.match(validaScena(scenaDiProva(), {}), /data\/mappa\.json/);
});

test('vista giocatori: niente nascosti, niente sotto la nebbia, solo la copia ridotta', () => {
  const s = scenaDiProva();
  const v = vistaGiocatori(s, null, dati.mappa.template);
  assert.equal(v.vista, 'giocatori');
  // token: Lucas (scoperto), il demone grande a cavallo del confine (un Q scoperto basta), la cassa;
  // fuori l'agguato nascosto e l'ombra sotto la nebbia
  assert.deepEqual(v.token.map((t) => t.id), ['t-lucas', 't-bordo', 't-cassa']);
  assert.ok(v.token.every((t) => !('nascosto' in t)));
  // template: il cerchio scoperto; fuori il cono con l'origine sotto la nebbia e il quadrato nascosto
  assert.deepEqual(v.template.map((t) => t.id), ['tp-1']);
  // muri: resta il tratto della colonna 2, sparisce quello della colonna 7 (sotto la nebbia); terreno tutto coperto
  const muri = daBase64(v.muri);
  assert.ok(cella(muri, 10, 8, 2, 1));
  assert.ok(!cella(muri, 10, 8, 7, 1));
  assert.equal(conta(muri, 10, 8), 4);
  assert.equal(conta(daBase64(v.terreno), 10, 8), 0);
  // nebbia intera, immagine ridotta, niente dati del master
  assert.equal(v.nebbia.coperti, s.nebbia.coperti);
  assert.deepEqual(v.mappa, { file: 'cripta-0123456789ab-ridotta.webp', larghezza: 640, altezza: 512 });
  for (const k of ['movimenti', 'annulla', 'creato', 'aggiornato']) assert.ok(!(k in v), `${k} tolto`);
  assert.deepEqual(v.collegamento, { scontro: 'scontro-20261006-200000' });
  assert.ok(!JSON.stringify(v).includes('nem:predatore'), 'nessuna traccia dei token tolti');
  // senza copia ridotta resta l'originale; la scena di partenza non cambia
  s.mappa.ridotta = null;
  assert.equal(vistaGiocatori(s).mappa.file, 'cripta-0123456789ab.jpg');
  assert.equal(s.token.length, 5);
  assert.equal(s.token[1].nascosto, true);
});
