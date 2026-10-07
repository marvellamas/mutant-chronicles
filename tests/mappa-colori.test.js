// Colori dei bordi dei token (decisione di Marcello del 06/10/2026; src/mappa/colori.js, data/mappa.json → colori).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bordoToken, assegnaColori, cambiaColore, contrasto, contornoPer, famiglia, tavolozzaPer } from '../src/mappa/colori.js';
import { validaScena, nuovaScena } from '../src/mappa/scena.js';
import { barraIniziativa } from '../src/mappa/iniziativa.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const C = dati.mappa.colori;

const pg = (k) => ({ chiave: `partecipante:pg:${k}`, rif: { tipo: 'partecipante', id: `pg:${k}` }, tipo: 'pg', pg: k, lato: 'pg', nome: k });
const nem = (tipo, n, lato = 'avversario') => ({ chiave: `partecipante:nem:${tipo}:${n}`, rif: { tipo: 'partecipante', id: `nem:${tipo}:${n}` }, tipo: 'nemico', nemico: tipo, lato, nome: `${tipo} ${n}` });
const tok = (p, i) => ({ id: `t${i}`, rif: p.rif, q: [i, 0], ingombro: 1, nascosto: false });

test('tavolozze: 7 colori per i PG e 7 per i nemici, diversi fra loro; contrasto col contorno per mappe chiare e scure', () => {
  assert.equal(C.pg.length, 7);
  assert.equal(C.nemici.length, 7);
  const valori = [...C.pg, ...C.nemici].map((c) => c.valore.toLowerCase());
  assert.equal(new Set(valori).size, valori.length, 'nessun colore ripetuto fra PG e nemici');
  for (const c of [...C.pg, ...C.nemici, { valore: C.alleati }, { valore: C.veicolo_del_gruppo }]) {
    const contorno = contornoPer(c.valore, C);
    assert.ok(contrasto(c.valore, contorno) >= C.contrasto_minimo, `${c.id ?? c.valore}: contrasto col contorno ${contrasto(c.valore, contorno).toFixed(2)}`);
  }
  // il bordo si legge sia su una mappa chiara sia su una scura: o il colore o il suo contorno contrasta col fondo
  for (const fondo of ['#efe8d8', '#1b1e1a']) {
    for (const c of [...C.pg, ...C.nemici]) {
      const migliore = Math.max(contrasto(c.valore, fondo), contrasto(contornoPer(c.valore, C), fondo));
      assert.ok(migliore >= C.contrasto_minimo, `${c.id} su ${fondo}`);
    }
  }
  // l'alone del turno non è il giallo dei PG
  assert.ok(!C.pg.some((c) => c.valore.toLowerCase() === C.alone_turno.toLowerCase()));
});

test('assegnaColori: al primo ingresso, un colore diverso per PG finché ce ne sono; un colore per tipo di nemico; stabile', () => {
  const pezzi = ['LUCAS', 'OSHI', 'PABLO'].map(pg).concat([nem('predone', 1), nem('predone', 2), nem('mutante', 1)]);
  let s = { token: pezzi.map(tok) };
  s = assegnaColori(s, pezzi, dati);
  assert.deepEqual(s.colori.pg, { LUCAS: 'blu', OSHI: 'rosso', PABLO: 'giallo' });
  assert.deepEqual(s.colori.nemici, { predone: 'viola', mutante: 'lilla' });
  // le copie dello stesso tipo hanno lo stesso colore, tratteggiato
  const b1 = bordoToken(pezzi[3], s.colori, dati), b2 = bordoToken(pezzi[4], s.colori, dati);
  assert.equal(b1.colore, b2.colore);
  assert.equal(b1.tratteggio, C.nemici_alterno);
  assert.equal(bordoToken(pezzi[0], s.colori, dati).tratteggio, null);
  // stabile: una seconda passata non cambia nulla (stessa scena)
  assert.equal(assegnaColori(s, pezzi, dati), s);
  // un PG che entra dopo prende il primo libero; uno tolto e rimesso tiene il suo
  const nuovo = pg('DIMITRI');
  const s2 = assegnaColori({ ...s, token: [...s.token.filter((t) => t.id !== 't0'), tok(nuovo, 9)] }, [...pezzi, nuovo], dati);
  assert.equal(s2.colori.pg.DIMITRI, 'verde-chiaro');
  assert.equal(s2.colori.pg.LUCAS, 'blu');
  // finiti i colori: il meno usato
  const otto = Array.from({ length: 8 }, (_, i) => pg(`PG${i}`));
  const s3 = assegnaColori({ token: otto.map(tok) }, otto, dati);
  assert.equal(new Set(Object.values(s3.colori.pg).slice(0, 7)).size, 7);
  assert.equal(s3.colori.pg.PG7, 'blu');
});

test('alleati, veicoli, cambio del master, validazione della scena, barra dell’Iniziativa', () => {
  const lucas = pg('LUCAS');
  const colori = { pg: { LUCAS: 'verde-scuro' }, nemici: {} };
  // alleato non PG: grigio-petrolio, doppio, non modificabile
  const alleato = nem('mercenario', 1, 'alleato');
  assert.deepEqual([famiglia(alleato), bordoToken(alleato, colori, dati).colore, bordoToken(alleato, colori, dati).doppio], ['alleato', C.alleati, true]);
  assert.equal(tavolozzaPer(alleato, dati), null);
  // veicolo: il colore del proprietario; del gruppo, grigio
  assert.equal(bordoToken({ tipo: 'veicolo', proprietario: 'LUCAS' }, colori, dati).colore, C.pg.find((c) => c.id === 'verde-scuro').valore);
  assert.equal(bordoToken({ tipo: 'veicolo', proprietario: null }, colori, dati).colore, C.veicolo_del_gruppo);
  // il master cambia il colore di un PG e di un tipo di nemico
  const s = cambiaColore(cambiaColore({ colori }, lucas, 'azzurro'), nem('predone', 3), 'ocra-scura');
  assert.equal(s.colori.pg.LUCAS, 'azzurro');
  assert.equal(bordoToken(nem('predone', 1), s.colori, dati).id, 'ocra-scura');
  // nella scena: colori della tavolozza, altrimenti errore
  const scena = { ...nuovaScena({ id: 'prova', nome: 'Prova', dati }), colori: s.colori };
  assert.equal(validaScena(scena, dati), null);
  assert.match(validaScena({ ...scena, colori: { pg: { LUCAS: 'fucsia' }, nemici: {} } }, dati), /colori\.pg\.LUCAS/);
  // la barra dell'Iniziativa porta lo stesso bordo
  const scontro = { stato: 'aperto', round: 1, turno: 0, ordineAlleati: [], partecipanti: [{ id: 'pg:LUCAS', nome: 'Lucas', tipo: 'pg', base: 3, d10: { valore: 5 }, lato: 'alleato' }] };
  const b = barraIniziativa({ scontro, pezzi: [lucas], bordoDi: (p) => bordoToken(p, s.colori, dati) });
  assert.equal(b.voci[0].bordo.id, 'azzurro');
});

test('lotto 7: blocco dei movimenti dei giocatori nella scena; avvio della pagina con «Mappa grande» ricordata', async () => {
  const scena = nuovaScena({ id: 'prova', nome: 'Prova', dati });
  assert.equal(validaScena({ ...scena, bloccaGiocatori: true }, dati), null);
  assert.match(validaScena({ ...scena, bloccaGiocatori: 'sì' }, dati), /bloccaGiocatori/);
  // collaudo del 06/10: con «Mappa grande» ricordata la pagina si bloccava (funzioni const usate prima della
  // definizione da applicaDisposizione): devono essere dichiarazioni di funzione
  const { readFileSync } = await import('node:fs');
  const pagina = readFileSync(new URL('../src/ui/mappa/pagina.js', import.meta.url), 'utf8');
  for (const f of ['barraAttuale', 'pezzoScelto', 'bordoDi', 'disegnaRidotta']) assert.ok(pagina.includes(`function ${f}(`), f);
  assert.doesNotMatch(pagina, /const (barraAttuale|pezzoScelto|bordoDi) = /);
});
