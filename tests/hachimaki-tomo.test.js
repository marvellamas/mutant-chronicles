// Equipaggiamento 0.8 §10.10 e §10.11, Magia §28.1 e §28.4: Hachimaki della Disciplina Interiore e Tomo dei Guardiani
// nel catalogo; il −1 PM vale solo per le Tecniche Interiori, indossato e sintonizzato, e si vede nel costo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESEMPIO_TECNICHE, costruisci } from '../tools/genera_esempio_tecniche.mjs';
import { calcolaScheda } from '../src/calc.js';
import { validaDati } from '../src/validate.js';
import { catalogo, normalizzaEquipaggiamento, cercaNelCatalogo } from '../src/equipaggiamento.js';
import { statoAttivazione, costoEffettivo, tecnicaDi } from '../src/tecniche.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const r = costruisci(ESEMPIO_TECNICHE, dati);
const T = (id) => tecnicaDi(id, dati);
const HACH = 'artefatti:hachimaki-della-disciplina-interiore';
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'zaino', quantita: 1, note: '', ...extra });
const schedaCon = (equip) => calcolaScheda({ ...r.personaggio, creazione: { ...r.personaggio.creazione, equipaggiamento: [...r.personaggio.creazione.equipaggiamento, ...equip] } }, dati);
const sess = (s) => ({ pmAttuali: s.pm, round: 1, ultimaTecnica: null, tecnicheAttive: [], statiAttivi: [], chroma: {} });
const idTecniche = (s) => s.tecniche.map((t) => t.id);

test('catalogo: Hachimaki e Tomo sono validi per il validatore e hanno i valori del manuale', () => {
  assert.deepEqual(validaDati(dati), []);
  const c = catalogo(dati);
  const h = c.perRif.get(HACH);
  assert.ok(h);
  assert.deepEqual([h.peso, h.ps_int, h.pi, h.costo, h.reperibilita, h.qualita], [0.05, 12, 2, 1500, 'MR', 'Non comune']);
  assert.deepEqual([h.artefatto.potenza, h.artefatto.sintonizzazione, h.artefatto.contenitore], ['Non Comune', 1, undefined]);
  assert.deepEqual(h.sconto_tecniche, { pm: 1, minimo: 1, richiede_sintonizzazione: true, fonte: 'Equipaggiamento §10.10; Magia §28.1' });
  const t = c.perRif.get('artefatti:tomo-dei-guardiani');
  assert.ok(t);
  assert.equal(t.peso, null);
  assert.equal(t.integrita, 'da_definire');
  assert.equal(t.sconto_tecniche, undefined, 'il Tomo non concede bonus');
  assert.equal(t.artefatto, undefined, 'SnT e riserva non definiti');
  assert.match(t['TODO(Davide)'], /non sono ancora fissati/);
});

test('Hachimaki: −1 PM alle Tecniche, minimo 1, gratuite invariate; solo indossata e sintonizzata', () => {
  const senza = schedaCon([]);
  const ids = idTecniche(senza);
  const costi = (s) => ids.map((id) => costoEffettivo(s, T(id), 0).costo);
  const base = ids.map((id) => T(id).opzioni_costo ? T(id).opzioni_costo[0].pm : T(id).costo_pm);
  assert.deepEqual(costi(senza), base, 'senza fascia nulla cambia');
  // indossata e sintonizzata
  const con = schedaCon([voce('h1', HACH, { stato: 'indossata', sintonizzato: true })]);
  assert.equal(con.equipaggiamento.scontoTecniche.pm, 1);
  assert.deepEqual(costi(con), base.map((b) => (b > 0 ? Math.max(1, b - 1) : b)));
  assert.ok(base.some((b) => b >= 2), 'c’è una Tecnica da 2+ PM nell’esempio');
  // 3 PM → 2, 1 PM → 1, Imposizione 1/2/4/10 → 1/1/3/9
  assert.equal(costoEffettivo(con, { costo_pm: 3 }).costo, 2);
  assert.equal(costoEffettivo(con, { costo_pm: 1 }).costo, 1);
  assert.equal(costoEffettivo(con, { costo_pm: 0 }).costo, 0);
  const imp = { opzioni_costo: [{ pm: 1 }, { pm: 2 }, { pm: 4 }, { pm: 10 }] };
  assert.deepEqual([0, 1, 2, 3].map((i) => costoEffettivo(con, imp, i).costo), [1, 1, 3, 9]);
  // indossata ma non sintonizzata, o sintonizzata ma nello zaino: nessuno sconto
  for (const v of [voce('h1', HACH, { stato: 'indossata' }), voce('h1', HACH, { stato: 'zaino', sintonizzato: true })]) {
    const s = schedaCon([v]);
    assert.deepEqual(costi(s), base);
  }
  assert.deepEqual(schedaCon([voce('h1', HACH, { stato: 'indossata' })]).equipaggiamento.scontoTecniche.inattivi, ['Hachimaki della Disciplina Interiore']);
});

test('Hachimaki: il costo è visibile in «Attiva» (base, sconto, fonte) e i PM scalati sono quelli ridotti', () => {
  const con = schedaCon([voce('h1', HACH, { stato: 'indossata', sintonizzato: true })]);
  const t = T(idTecniche(con).find((id) => (T(id).costo_pm ?? 0) >= 2));
  const st = statoAttivazione(con, sess(con), t, dati);
  assert.equal(st.base, t.costo_pm);
  assert.equal(st.sconto, 1);
  assert.equal(st.costo, t.costo_pm - 1);
  assert.equal(st.pmDopo, con.pm - (t.costo_pm - 1));
  assert.ok(st.avvisi.some((a) => /Hachimaki/.test(a) && a.includes(`${t.costo_pm} PM della scheda − 1`)));
  // non sintonizzata: lo dice, non riduce
  const non = schedaCon([voce('h1', HACH, { stato: 'indossata' })]);
  const st2 = statoAttivazione(non, sess(non), t, dati);
  assert.equal(st2.costo, t.costo_pm);
  assert.ok(st2.avvisi.some((a) => /non sintonizzat/.test(a)));
});

test('Hachimaki: più fasce o altre fonti non si sommano', () => {
  const due = schedaCon([voce('h1', HACH, { stato: 'indossata', sintonizzato: true }), voce('h2', HACH, { stato: 'indossata', sintonizzato: true })]);
  assert.equal(due.equipaggiamento.scontoTecniche.pm, 1);
  assert.equal(costoEffettivo(due, { costo_pm: 4 }).costo, 3);
});

test('lo sconto non tocca altri costi in PM: solo src/tecniche.js lo legge', () => {
  const lettori = ['src/lancio.js', 'src/durate-incantesimi.js', 'src/consumabili-mistici.js', 'src/equipaggiamento.js', 'src/ricarica.js', 'src/impianti.js']
    .filter((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').includes('costoEffettivo'));
  assert.deepEqual(lettori, []);
  const incant = readFileSync(new URL('../src/lancio.js', import.meta.url), 'utf8');
  assert.ok(!incant.includes('scontoTecniche'));
});

test('nessun doppione: una riga scritta a mano resta una, e l’oggetto del catalogo si trova una volta sola', () => {
  const a_mano = [{ uid: 'x1', rif: null, personalizzato: { nome: 'Hachimaki Equip', tipo: 'accessorio' }, stato: 'indossata', quantita: 1, note: '' }];
  const norm = normalizzaEquipaggiamento(a_mano);
  assert.equal(norm.length, 1);
  assert.equal(norm[0].rif, null);
  assert.equal(norm[0].personalizzato.nome, 'Hachimaki Equip');
  const trovati = cercaNelCatalogo(dati, 'hachimaki');
  assert.equal(trovati.filter((o) => o.id === 'hachimaki-della-disciplina-interiore').length, 1);
  // nessun PG reale in repo (esempi/) lo possiede: il catalogo non assegna l'oggetto a nessuno
  assert.equal(JSON.stringify(r.personaggio).includes('hachimaki'), false);
});
