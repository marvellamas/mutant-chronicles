// Posizione iniziale della scena (richiesta di Marcello del 07/10/2026; src/mappa/iniziale.js): salva token, porte,
// template e nebbia; il ripristino rimette tutto, ignora i token il cui partecipante non è più nello scontro, lascia
// dove sono i nuovi, azzera Q usati e AzP del Round; Ctrl+Z lo annulla; il formato della scena resta valido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { salvaIniziale, ripristinaIniziale } from '../src/mappa/iniziale.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { muoviToken, annullaUltima, usatoNelRound } from '../src/mappa/annulla.js';
import { nuovaPorta, conAzione } from '../src/mappa/porte.js';
import { nuovoTemplate } from '../src/mappa/template.js';
import { inBase64, rettangolo, daBase64, nuovaMaschera } from '../src/mappa/celle.js';

const { dati } = await datiReali();
const tok = (id, q, o = {}) => ({ id: `t-${id}`, rif: { tipo: 'partecipante', id }, q, ingombro: 1, nascosto: false, ...o });

function preparata() {
  const s = { ...nuovaScena({ id: 's', nome: 'S', colonne: 12, righe: 8, nebbia: 'coperta', dati }), revisione: 0 };
  s.token = [tok('pg:a', [1, 1]), tok('nem:x:1', [6, 3]), tok('nem:x:2', [7, 3], { nascosto: true })];
  s.porte = [nuovaPorta({ id: 'p', q: [5, 3], stato: 'chiusa' })];
  s.template = [nuovoTemplate({ id: 'f', forma: 'cerchio', misure: { raggio: 1 }, origine: [3, 3], colore: '#868e96', nome: 'Fumo', durata: 2, round: 1, scontro: 'sc' })];
  s.nebbia = { ...s.nebbia, coperti: inBase64(rettangolo(daBase64(s.nebbia.coperti), 12, 8, 0, 0, 4, 7, false)) };
  return s;
}

test('salva e ripristina: token, porte, template, nebbia come prima; Q usati e AzP azzerati; scontro non toccato', () => {
  let s = salvaIniziale(preparata(), new Date('2026-10-07T18:00:00Z'));
  assert.equal(s.iniziale.quando, '2026-10-07T18:00:00.000Z');
  assert.equal(validaScena(s, dati), null);
  // in gioco: movimento, porta aperta, template tolto, nebbia scoperta, AzP
  s = muoviToken(s, 't-pg:a', { a: [3, 1], costo: 2, fascia: 'passo', scontro: 'sc2', round: 3 }, dati);
  s = conAzione({ ...s, porte: [{ ...s.porte[0], stato: 'aperta' }], template: [] }, { id: 'a1', token: 't-pg:a', porta: 'p', azione: 'apri', scontro: 'sc2', round: 3, quando: 'x' }, dati.mappa.porte);
  s = { ...s, nebbia: { ...s.nebbia, coperti: inBase64(nuovaMaschera(12, 8)) } };
  const r = ripristinaIniziale(s, { chiaviPresenti: new Set(['partecipante:pg:a', 'partecipante:nem:x:1', 'partecipante:nem:x:2']), scontro: 'sc2', round: 3 });
  const n = r.scena;
  assert.deepEqual(n.token.map((t) => [t.id, t.q, t.nascosto]), [['t-pg:a', [1, 1], false], ['t-nem:x:1', [6, 3], false], ['t-nem:x:2', [7, 3], true]]);
  assert.equal(n.porte[0].stato, 'chiusa');
  assert.equal(n.template[0].nome, 'Fumo');
  assert.deepEqual([n.template[0].scontro, n.template[0].fine_round], ['sc2', 5], 'il template a durata riparte dal Round attuale');
  assert.equal(n.nebbia.coperti, preparata().nebbia.coperti);
  assert.equal(usatoNelRound(n, 't-pg:a', 'sc2', 3), 0);
  assert.deepEqual([n.movimenti, n.azioni], [[], []]);
  assert.equal(validaScena(n, dati), null);
  // Ctrl+Z annulla il ripristino
  const u = annullaUltima(n);
  assert.equal(u.testo, 'ripristino della posizione iniziale');
  assert.deepEqual(u.scena.token.find((t) => t.id === 't-pg:a').q, [3, 1]);
  assert.equal(u.scena.porte[0].stato, 'aperta');
  assert.equal(usatoNelRound(u.scena, 't-pg:a', 'sc2', 3), 2);
});

test('token fuori dallo scontro ignorati con avviso; token nuovi restano dove sono; senza posizione iniziale nulla', () => {
  let s = salvaIniziale(preparata());
  s = { ...s, token: [...s.token.filter((t) => t.id !== 't-nem:x:1'), tok('pg:b', [9, 6])] };
  const r = ripristinaIniziale(s, { chiaviPresenti: new Set(['partecipante:pg:a', 'partecipante:nem:x:2', 'partecipante:pg:b']) });
  assert.deepEqual(r.ignorati.map((t) => t.id), ['t-nem:x:1']);
  assert.deepEqual(r.nuovi.map((t) => t.id), ['t-pg:b']);
  assert.deepEqual(r.scena.token.map((t) => t.id).sort(), ['t-nem:x:2', 't-pg:a', 't-pg:b']);
  assert.deepEqual(r.scena.token.find((t) => t.id === 't-pg:b').q, [9, 6]);
  // un token tolto dalla mappa ma ancora nello scontro torna al suo posto
  const tolto = { ...salvaIniziale(preparata()), token: preparata().token.filter((t) => t.id !== 't-pg:a') };
  assert.deepEqual(ripristinaIniziale(tolto, { chiaviPresenti: new Set(['partecipante:pg:a', 'partecipante:nem:x:1', 'partecipante:nem:x:2']) }).scena.token.find((t) => t.id === 't-pg:a').q, [1, 1]);
  assert.equal(ripristinaIniziale(preparata()), null);
  assert.match(validaScena({ ...salvaIniziale(preparata()), iniziale: { quando: 'x', token: [], porte: [], template: [], nebbia: 'AAAA' } }, dati), /^iniziale\.nebbia/);
});
