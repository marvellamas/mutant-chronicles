// Un PG attacca un nemico e ne applica il danno (ritocchi del 07/10/2026; src/ui/attacco-pg.js, src/colpo-nemico.js):
// bersagli dallo scontro con Difese, AR e PV; proposta per «Colpito» dall'arma del PG (natura, Perforante, Magistrale,
// colpi a segno); colpo sul nemico con una riga sola (attacco e colpo); annullabile; scrittura con la revisione.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nuovoScontro, aggiungiNemici, annullaUltimoColpo, validaScontro, testoAttacco } from '../src/scontro.js';
import { collegamentoScontro } from '../src/round-scontro.js';
import { colpoSuNemico } from '../src/colpo-nemico.js';
import { applicaColpo } from '../src/danno.js';
import { nemiciBersaglio, propostaDaPg, scriviScontro } from '../src/ui/attacco-pg.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const legionario = JSON.parse(readFileSync(new URL('../esempi/nemici/legionario-oscuro.json', import.meta.url), 'utf8'));
const T0 = new Date('2026-10-07T21:00:00Z');

function scontro() {
  let s = nuovoScontro({ id: 'pg-attacca', adesso: T0, pg: [{ chiave: 'OSHI', nome: 'Oshi', iniziativa: 3, des: 7, int: 5 }] });
  s = aggiungiNemici(s, legionario, 2, {}, T0);
  s = aggiungiNemici(s, legionario, 1, { lato: 'alleato' }, T0);
  return { ...s, revisione: 3 };
}
const pistola = { uid: 'p1', nome: 'Pistola Bolter', tipo: 'arma_distanza', ac: 1, proprieta: [{ nome: 'Perforante 2' }] };
const rDist = { va_finale: 12, tiri: 1, danno_per_colpo: '2d6+1', colpi_a_segno: 1, applicazioni: 1 };
const oshi = { id: 'pg:OSHI', nome: 'Oshi' };

test('bersagli: i nemici dello scontro con lato, PV, Difese e AR; prima gli avversari in piedi', () => {
  let s = scontro();
  const [n1] = s.partecipanti.filter((p) => p.tipo === 'nemico');
  s = { ...s, partecipanti: s.partecipanti.map((p) => (p.id === n1.id ? { ...p, pv: { ...p.pv, attuali: 0 } } : p)) };
  const c = collegamentoScontro(s, 'OSHI');
  const b = nemiciBersaglio(c.partecipanti);
  assert.deepEqual(b.map((x) => x.nome), ['Legionario Oscuro 2', 'Legionario Oscuro 1', 'Legionario Oscuro 3']);
  assert.deepEqual([b[0].lato, b[0].pv, b[0].difese, b[0].ar], ['avversario', { attuali: legionario.pv, massimo: legionario.pv }, legionario.difese, legionario.ar.totale]);
  assert.equal(b.at(-1).lato, 'alleato');
});

test('proposta dall’arma del PG: formula, natura, Perforante, Magistrale e colpi a segno; ravvicinato con il danno del calcolo', () => {
  const p = propostaDaPg(pistola, rDist, { magistrale: true, riusciti: 1 }, oshi);
  assert.deepEqual([p.formula, p.tipo, p.natura, p.magistrale, p.ac, p.fonte], ['2d6+1', 'distanza', 'Naturale', true, 1, 'pg:OSHI']);
  assert.deepEqual(p.proprieta, ['Perforante 2']);
  // raffica: due colpi a segno per tiro, due tiri riusciti → 4 applicazioni
  assert.equal(propostaDaPg(pistola, { ...rDist, colpi_a_segno: 2, tiri: 2 }, { magistrale: false, riusciti: 2 }, oshi).ac, 4);
  const spada = { uid: 's', nome: 'Spada', tipo: 'arma_ravvicinata', ac: 1, proprieta: [] };
  const q = propostaDaPg(spada, { va_finale: 11, danno: { formula: '1d8+3', moltiplicatore: 2, natura: 'Magico' } }, { magistrale: false, riusciti: 1 }, oshi);
  assert.deepEqual([q.formula, q.moltiplicatore, q.natura, q.tipo], ['1d8+3', 2, 'Magico', 'ravvicinato']);
  // Perforante conta contro l'AR del nemico, come dalla plancia
  const b = { nome: 'Leg', pv: { attuali: legionario.pv, massimo: legionario.pv }, ferite: 0, ar: legionario.ar };
  const con = applicaColpo(b, { danni: [10], natura: p.natura, tipo: p.tipo, difesa: 'nessuna', proprieta: p.proprieta }, dati);
  const senza = applicaColpo(b, { danni: [10], natura: p.natura, tipo: p.tipo, difesa: 'nessuna', proprieta: [] }, dati);
  assert.ok(con.pv.dopo < senza.pv.dopo, 'Perforante toglie AR');
});

test('colpo sul nemico: una riga sola con attacco e colpo, PV nello scontro, annullabile; nemico cambiato → errore', () => {
  const s = scontro();
  const n = s.partecipanti.find((p) => p.tipo === 'nemico');
  const p = propostaDaPg(pistola, rDist, { magistrale: false, riusciti: 1 }, oshi);
  const colpo = { danni: [12], natura: p.natura, tipo: p.tipo, difesa: 'nessuna', proprieta: p.proprieta };
  const ris = applicaColpo({ nome: n.nome, pv: n.pv, ferite: 0, ar: n.scheda.ar }, colpo, dati);
  const prefisso = testoAttacco({ attaccante: 'Oshi', bersaglio: n.nome, arma: pistola.nome, va: '12', tiri: [{ valore: 7, origine: 'app', esito: 'successo' }], esito: 'successo' });
  const righe = s.registro.length;
  const t = colpoSuNemico(s, n, ris, colpo, ['stordito', 'sanguinante'], [], dati, { prefisso, adesso: T0 });
  assert.equal(t.registro.length, righe + 1, 'una riga');
  assert.match(t.registro.at(-1).testo, /^Oshi attacca Legionario Oscuro 1 con Pistola Bolter: VA 12, tiro 7 \(app\) → colpito\. /);
  const dopo = t.partecipanti.find((x) => x.id === n.id);
  assert.equal(dopo.pv.attuali, ris.pv.dopo);
  assert.ok(dopo.stati.includes('stordito'));
  assert.equal(validaScontro(t), null);
  // «Annulla questo colpo» / «Annulla ultimo colpo»: tutto come prima
  const u = annullaUltimoColpo(t, T0).scontro;
  assert.deepEqual(u.partecipanti.find((x) => x.id === n.id).pv, n.pv);
  assert.deepEqual(u.partecipanti.find((x) => x.id === n.id).stati, n.stati);
  // il nemico è cambiato dopo l'apertura di «Colpito» (un altro colpo dalla plancia): errore, nessuna scrittura
  assert.throws(() => colpoSuNemico(t, n, ris, colpo, [], [], dati), /cambiato nel frattempo/);
  // immunità: lo Stato non entra
  const imm = { ...s, partecipanti: s.partecipanti.map((x) => (x.id === n.id ? { ...x, scheda: { ...x.scheda, immunita: ['stordito'] } } : x)) };
  assert.ok(!colpoSuNemico(imm, n, ris, colpo, ['stordito'], [], dati).partecipanti.find((x) => x.id === n.id).stati.includes('stordito'));
});

const fetchVero = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchVero; });

test('scrittura con la revisione: un 409 rilegge e riprova; se il nemico è cambiato si ferma con l’errore', async () => {
  const s = scontro();
  const n = s.partecipanti.find((p) => p.tipo === 'nemico');
  const p = propostaDaPg(pistola, rDist, { magistrale: false, riusciti: 1 }, oshi);
  const colpo = { danni: [12], natura: p.natura, tipo: p.tipo, difesa: 'nessuna', proprieta: p.proprieta };
  const ris = applicaColpo({ nome: n.nome, pv: n.pv, ferite: 0, ar: n.scheda.ar }, colpo, dati);
  // sul server: intanto la plancia ha scritto una riga (revisione 4)
  let server = { ...s, revisione: 4, registro: [...s.registro, { ora: T0.toISOString(), round: 1, testo: 'Riga della plancia.' }] };
  const scritture = [];
  globalThis.fetch = async (url, o = {}) => {
    if (o.method === 'PUT') {
      const corpo = JSON.parse(o.body);
      scritture.push(corpo.revisione);
      if (corpo.revisione !== server.revisione) return { ok: false, status: 409, json: async () => ({ attuale: server }) };
      server = { ...corpo, revisione: corpo.revisione + 1 };
      return { ok: true, status: 200, json: async () => server };
    }
    return { ok: true, status: 200, json: async () => (scritture.length ? server : s) };
  };
  const t = await scriviScontro(s.id, (x) => colpoSuNemico(x, n, ris, colpo, [], [], dati));
  assert.deepEqual(scritture, [3, 4], 'prima la revisione vecchia (409), poi quella riletta');
  assert.ok(t.registro.some((r) => r.testo === 'Riga della plancia.'), 'la riga della plancia resta');
  assert.equal(t.partecipanti.find((x) => x.id === n.id).pv.attuali, ris.pv.dopo);
  // ora il nemico è già stato colpito: un secondo «Applica» aperto prima non scrive
  await assert.rejects(scriviScontro(s.id, (x) => colpoSuNemico(x, n, ris, colpo, [], [], dati)), /cambiato nel frattempo/);
});
