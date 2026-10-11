// «Aggiungi nemico» (M4 dell'11/10/2026, segnalazione di Davide: la seconda volta non aveva più capito come mettere
// in campo un nemico prestabilito). Qui si prova la parte pura: l'elenco unico con la ricerca (nemici prestabiliti di
// nemici/ + creature del Bestiario proposto) e che aggiungere due volte di fila funzioni, con il nemico salvato nello
// scontro (o nella bozza) e il bestiario intatto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { datiReali } from './helpers.js';
import { vociAggiungiNemico } from '../src/ui/aggiungi-nemico.js';
import { vociBestiario } from '../src/nemici.js';
import { nuovoScontro, aggiungiNemici } from '../src/scontro.js';
import { nuovaBozza, aggiungiVoce } from '../src/preparazione.js';

const { dati } = await datiReali();
const BE = dati.bestiario;

/**
 * Un nemico prestabilito come quelli salvati in nemici/: si parte da un nemico d'esempio valido e si cambia il nome
 * in «Sorella Park», il caso raccontato da Davide.
 */
const esempio = JSON.parse(await readFile(new URL('../esempi/nemici/legionario-oscuro.json', import.meta.url), 'utf8'));
const park = { ...esempio, id: 'sorella-park', nome: 'Sorella Park' };
const voci = vociBestiario([{ file: 'sorella-park.json', nemico: park }], dati);

test('M4: un elenco solo, con i prestabiliti e le creature del Bestiario proposto', () => {
  const tutte = vociAggiungiNemico(voci, BE);
  assert.equal(tutte.length, voci.length + BE.creature.length);
  const p = tutte[0];
  assert.equal(p.tipo, 'prestabilito');
  assert.equal(p.nome, 'Sorella Park');
  assert.match(p.origine, /nemici\//, 'si vede da dove viene');
  assert.match(p.sottotitolo, new RegExp(`PV ${park.pv}`));
  assert.equal(p.nemico, park);
  const c = tutte.find((x) => x.tipo === 'creatura');
  assert.ok(c.gradi.length, 'la creatura porta i suoi Gradi, da scegliere');
  assert.match(c.origine, /Bestiario proposto/);
});

test('M4: la ricerca trova il nemico per nome, anche a pezzi e senza accenti', () => {
  assert.deepEqual(vociAggiungiNemico(voci, BE, 'park').map((x) => x.nome), ['Sorella Park']);
  assert.deepEqual(vociAggiungiNemico(voci, BE, 'SORELLA').map((x) => x.nome), ['Sorella Park']);
  assert.deepEqual(vociAggiungiNemico(voci, BE, '  park  ').map((x) => x.nome), ['Sorella Park']);
  // una creatura del Bestiario proposto si trova per nome e per famiglia
  const regina = BE.creature.find((c) => c.id === 'regina-della-covata');
  assert.ok(vociAggiungiNemico(voci, BE, 'regina').some((x) => x.nome === regina.nome));
  assert.ok(vociAggiungiNemico(voci, BE, regina.famiglia).length >= 1);
  // niente risultati: nessun errore, elenco vuoto
  assert.deepEqual(vociAggiungiNemico(voci, BE, 'zzzz'), []);
  // senza bestiario del server restano le creature
  assert.equal(vociAggiungiNemico([], BE).length, BE.creature.length);
  assert.equal(vociAggiungiNemico(null, null).length, 0, 'senza dati nessun errore');
});

test('M4: aggiungere lo stesso prestabilito due volte di fila, e il modello non cambia', () => {
  // nello scontro aperto: due aggiunte di fila, come dalla finestra che resta aperta
  let s = nuovoScontro({ id: 'sc1', pg: [] });
  s = aggiungiNemici(s, park, 2, { lato: 'avversario' });
  s = aggiungiNemici(s, park, 1, { lato: 'avversario' });
  const nemici = s.partecipanti.filter((p) => p.tipo === 'nemico');
  assert.equal(nemici.length, 3, 'tre nemici in campo');
  assert.deepEqual([...new Set(nemici.map((p) => p.id))].length, 3, 'id distinti: si colpiscono uno per uno');
  assert.deepEqual(nemici.map((p) => p.nome), ['Sorella Park 1', 'Sorella Park 2', 'Sorella Park 3']);
  // ogni copia ha i suoi PV attuali: ferire la prima non tocca le altre né il tipo del bestiario
  const pvTipo = park.pv;
  assert.equal(nemici[0].pv.massimo, pvTipo);
  nemici[0].pv.attuali = 1;
  assert.equal(nemici[1].pv.attuali, pvTipo);
  assert.equal(park.pv, pvTipo, 'il tipo del bestiario (nemici/) resta com’era');
  // nella bozza: due voci, ciascuna con la sua copia del nemico
  let b = nuovaBozza({ id: 'bz1', nome: 'Agguato' });
  b = aggiungiVoce(b, { nemico: park, quanti: 2, lato: 'avversario', origine: 'bestiario' });
  b = aggiungiVoce(b, { nemico: park, quanti: 1, lato: 'alleato', origine: 'bestiario' });
  assert.equal(b.nemici.length, 2);
  assert.equal(b.nemici.reduce((n, v) => n + v.quanti, 0), 3);
  assert.deepEqual(b.nemici.map((v) => v.lato), ['avversario', 'alleato']);
  assert.notEqual(b.nemici[0].nemico, park, 'nella bozza finisce una copia');
  const pv = park.pv;
  b.nemici[0].nemico.pv = 1;
  assert.equal(park.pv, pv, 'ritoccare la copia non cambia il modello di nemici/');
  assert.equal(b.nemici[1].nemico.pv, pv);
});
