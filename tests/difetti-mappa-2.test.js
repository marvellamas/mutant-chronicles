// Primo test della mappa sul PC di Marcello (06/10/2026), difetto 2: cliccando un PG si lasciava la mappa (la plancia
// si apriva con window.open, che nel suo browser sostituiva la pagina). Ora il clic apre la carta in un pannello accanto
// alla mappa; la scheda completa e la plancia aperte dalla mappa hanno «Torna alla mappa», che rimette scena, zoom,
// posizione, token scelto e carta aperta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  segnaDallaMappa, arrivoDallaMappa, cartaDallaMappa, tornaAllaMappa, vistaDaRimettere, dimenticaMappa,
  segnaDalTavolo, arrivoDalTavolo,
} from '../src/ui/ritorno.js';

/** sessionStorage finto. */
function memoria() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
const vista = { cam: { scala: 1.37, ox: -812, oy: -1490 }, selezionato: 't-partecipante-pg-LUCAS', carta: 'partecipante:pg:LUCAS' };

test('scheda completa aperta dalla mappa: «Torna alla mappa» e la vista di prima, una volta sola', () => {
  const s = memoria();
  segnaDallaMappa(s, { scena: 'test1-20261006-125057', id: 'pg-123', vista });
  assert.equal(arrivoDallaMappa(s, 'pg-123'), 'test1-20261006-125057');
  assert.equal(arrivoDallaMappa(s, 'pg-altro'), null, 'un’altra scheda non ha il pulsante');
  assert.equal(arrivoDallaMappa(s), null, 'la plancia non ha il pulsante se si è aperta una scheda');
  assert.equal(vistaDaRimettere(s, 'test1-20261006-125057'), null, 'finché non si preme il pulsante non si rimette nulla');
  assert.equal(tornaAllaMappa(s), 'test1-20261006-125057');
  assert.equal(vistaDaRimettere(s, 'altra-scena'), null);
  assert.deepEqual(vistaDaRimettere(s, 'test1-20261006-125057'), vista);
  assert.equal(vistaDaRimettere(s, 'test1-20261006-125057'), null, 'una volta sola');
  assert.equal(arrivoDallaMappa(s, 'pg-123'), null, 'tornati sulla mappa il pulsante sparisce');
});

test('plancia aperta dalla mappa: la carta si mostra una volta, «Torna alla mappa» resta finché non si torna', () => {
  const s = memoria();
  segnaDallaMappa(s, { scena: 'cripta', carta: 'partecipante:nem:predone-delle-lande:2', vista });
  assert.equal(arrivoDallaMappa(s), 'cripta');
  assert.equal(cartaDallaMappa(s), 'partecipante:nem:predone-delle-lande:2');
  assert.equal(cartaDallaMappa(s), null, 'la carta si porta in vista una volta');
  assert.equal(arrivoDallaMappa(s), 'cripta', 'il pulsante resta nei ridisegni della plancia');
  assert.equal(tornaAllaMappa(s), 'cripta');
  assert.deepEqual(vistaDaRimettere(s, 'cripta'), vista);
  // la pagina iniziale dimentica la mappa; il ritorno al tavolo non si tocca
  segnaDalTavolo(s, 'pg-9', 120);
  segnaDallaMappa(s, { scena: 'cripta', carta: 'x', vista });
  dimenticaMappa(s);
  assert.equal(arrivoDallaMappa(s), null);
  assert.ok(arrivoDalTavolo(s, 'pg-9'));
  // storage non disponibile: nessun errore, nessun pulsante
  assert.equal(arrivoDallaMappa(null), null);
  assert.doesNotThrow(() => segnaDallaMappa(null, { scena: 'x' }));
});

test('il clic su un token apre la carta accanto alla mappa e non cambia pagina', () => {
  const pagina = readFileSync(new URL('../src/ui/mappa/pagina.js', import.meta.url), 'utf8');
  const inizio = pagina.indexOf('function apriCarta(t)');
  assert.ok(inizio > 0, 'apriCarta c’è');
  const corpo = pagina.slice(inizio, pagina.indexOf('\n  }\n', inizio));
  for (const via of ['window.open', 'location', 'azioni.tavolo', 'vai(', 'apriCartaInPlancia']) assert.ok(!corpo.includes(via), `apriCarta non usa ${via}`);
  assert.match(corpo, /renderTavolo\(el\.cartaCorpo/, 'la carta è la plancia in modalità carta sola');
  assert.match(corpo, /soloCarta/);
  // il rilascio senza trascinamento su un token sceglie il token e apre la carta
  assert.match(pagina, /scegli\(tok\.id\);\s*apriCarta\(tok\);/);
  // il vecchio canale con window.open non c'è più
  const canale = readFileSync(new URL('../src/ui/mappa/canale.js', import.meta.url), 'utf8');
  assert.ok(!canale.includes('window.open('));
  // la plancia sa disegnare la carta sola e il «Torna alla mappa»
  const tavolo = readFileSync(new URL('../src/ui/tavolo.js', import.meta.url), 'utf8');
  assert.match(tavolo, /if \(ctx\.soloCarta\)/);
  assert.match(tavolo, /'← Torna alla mappa'/);
  const tab = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.match(tab, /btn-torna-mappa/);
});
