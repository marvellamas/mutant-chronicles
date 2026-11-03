// Il calendario si apre sull'ultimo giorno scritto (richiesta di Marcello del 03/11/2026). «Scritto» = una nota: testo,
// bandierina e «M» sono tutti parti di una nota. Senza note si apre come prima, sul giorno di oggi del gioco.
// Vale in Giorno, Settimana e Mese (il periodo che contiene quel giorno, il giorno segnato con .aperto); il tablet usa la
// stessa tab, quindi la stessa apertura.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attivaCalendario, aggiungiNota, ultimoGiornoScritto, giornoDiApertura } from '../src/calendario.js';
import { contesto, resa, dati } from './scheda-aiuti.js';

const [MATTINA, , SERA] = dati.regole.calendario.fasce.map((f) => f.id);
let n = 0;
const nota = (c, campi) => aggiungiNota(c, campi, { id: `a${++n}`, creato: `2026-11-03T10:00:${String(n).padStart(2, '0')}Z` }, dati);

/** La tab Calendario resa da zero (nessuno stato dell'interfaccia: come quando la si apre). */
function apri(calendario, vista = null) {
  const ctx = contesto('Aiko-Tenzan_liv5_2026-10-02.json', { attiva: 'calendario', scelte: (s) => s });
  ctx.calendario = calendario;
  ctx.tab.tab.push({ id: 'calendario', titolo: 'Calendario' });
  ctx.ui = {};
  let r = resa(ctx);
  if (vista) { ctx.ui.calendario.vista = vista; r = resa(ctx); }
  return { u: ctx.ui.calendario, r };
}
const aperti = (r) => r.radice.tutti().filter((x) => /\baperto\b/.test(x.className ?? ''));

// oggi del gioco a febbraio, note sparse fra gennaio e aprile, scritte non in ordine
function sparso() {
  let c = attivaCalendario(null, { inizio: '2026-01-10', fascia: MATTINA }, dati);
  c = { ...c, oggi: { data: '2026-02-05', fascia: MATTINA } };
  c = nota(c, { data: '2026-04-17', fascia: SERA, testo: 'Arrivo a Paradise' });
  c = nota(c, { data: '2026-01-12', fascia: MATTINA, testo: 'Partenza' });
  c = nota(c, { data: '2026-03-02', fascia: MATTINA, testo: 'Il porto', colore: 'giallo' });
  return c;
}

test('contenuto su più mesi: si apre sull\'ultimo giorno scritto, non su oggi del gioco né sull\'inizio', () => {
  const c = sparso();
  assert.equal(ultimoGiornoScritto(c), '2026-04-17');
  assert.equal(giornoDiApertura(c), '2026-04-17');
  const { u, r } = apri(c);
  assert.equal(u.vista, 'giorno');
  assert.equal(u.data, '2026-04-17');
  assert.match(r.testo(), /Arrivo a Paradise/);
  // Settimana e Mese: il periodo che contiene quel giorno, con il giorno segnato
  for (const vista of ['settimana', 'mese']) {
    const a = apri(c, vista);
    assert.equal(a.u.data, '2026-04-17', vista);
    const segnati = aperti(a.r);
    assert.equal(segnati.length, 1, `${vista}: un giorno segnato`);
    assert.match(segnati[0].getAttribute('aria-label') ?? segnati[0].getAttribute('title') ?? segnati[0].textContent, /17/, vista);
  }
});

test('calendario vuoto: si apre come prima, sul giorno di oggi del gioco, senza nessun giorno segnato', () => {
  let c = attivaCalendario(null, { inizio: '2026-01-10', fascia: MATTINA }, dati);
  c = { ...c, oggi: { data: '2026-02-05', fascia: MATTINA } };
  assert.equal(ultimoGiornoScritto(c), null);
  assert.equal(giornoDiApertura(c), '2026-02-05');
  const { u } = apri(c);
  assert.equal(u.data, '2026-02-05');
  for (const vista of ['settimana', 'mese']) assert.equal(aperti(apri(c, vista).r).length, 0, vista);
  // un blocco senza note del tutto (o con note non valide) non rompe niente
  assert.equal(ultimoGiornoScritto({ note: [{ data: 'non-una-data' }] }), null);
  assert.equal(ultimoGiornoScritto(null), null);
});

test('l\'ultimo scritto è una nota con la bandierina (e la «M»): conta come scritto', () => {
  let c = sparso();
  c = nota(c, { data: '2026-05-08', fascia: MATTINA, testo: 'Scontro con la Madre', colore: 'rosso', ricordare: true });
  assert.equal(ultimoGiornoScritto(c), '2026-05-08');
  const { u, r } = apri(c);
  assert.equal(u.data, '2026-05-08');
  assert.match(r.testo(), /Scontro con la Madre/);
  const mese = apri(c, 'mese');
  const [cella] = aperti(mese.r);
  assert.ok(cella, 'il giorno è segnato nel Mese');
  assert.ok(cella.tutti().some((x) => /evento-rosso/.test(x.className ?? '')), 'con la sua bandierina');
});
