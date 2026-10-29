// Lotto 143 (C): i dieci modelli PNG generici Classe / Grado / EQ (Mostri 0.46, Direttore 0.45 §9.6) in «Crea nemico».
// L'esempio numerico del manuale è un test (Assaltatore III con EQ Rara); i PX del manuale tornano con la formula del §9.6.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico, validaDati } from '../src/validate.js';
import { profiloPng, classiPng, pxPng, sommaEqDanno } from '../src/png-generici.js';
import { profiloNemico, proponiNome, proponiDescrizione } from '../src/crea-nemico.js';
import { importaPng } from '../tools/importa-png-generici.mjs';

const { dati } = await datiReali();
const GRADI = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const testo = readFileSync(new URL('../docs/manuali-txt/mostri-word.md', import.meta.url), 'utf8');

test('dieci modelli, sei righe di Grado ciascuno, Avventurieri e Combattenti nell’ordine del manuale', () => {
  const classi = classiPng(dati);
  assert.deepEqual(classi.map((c) => c.nome), ['Agente', 'Cacciatore', 'Esploratore', 'Lestofante', 'Paramedico', 'Artigliere', 'Assaltatore', 'Incursore', 'Lottatore', 'Soldato']);
  assert.deepEqual([...new Set(classi.map((c) => c.categoria))], ['Avventurieri', 'Combattenti']);
  for (const id of Object.keys(dati.png_generici.classi)) {
    const c = dati.png_generici.classi[id];
    for (const sez of ['caratteristiche', 'risorse', 'salvezze', 'attacchi']) assert.deepEqual(Object.keys(c[sez]), GRADI, `${id}.${sez}`);
    assert.equal(Object.keys(c.abilita).length, 24, `${id}: le 24 Abilità`);
  }
  assert.deepEqual(validaDati(dati), []);
});

test('esempio del manuale: Assaltatore III Grado con EQ Rara (Mostri 0.46, «Esempio pronto»)', () => {
  const { nemico: n, errori } = profiloPng({ classe: 'assaltatore', grado: 'III', eq: 2 }, dati);
  assert.deepEqual(errori, []);
  assert.equal(n.pv, 39); assert.equal(n.pm, 9);
  assert.equal(n.azioni.principali, 1); assert.equal(n.azioni.movimento, 1);
  assert.equal(n.iniziativa, 5); // 1d10+5
  assert.equal(n.ar.totale, 7); assert.equal(n.ar.magica, 0);
  assert.equal(n.attacchi[0].va, 18); assert.equal(n.attacchi[0].danno, '1d8+5');
  assert.equal(n.difese, 15); // Parata 15 (Schivata 14, nelle provenienze)
  assert.deepEqual(n.salvezze, { tempra: 13, riflessi: 14, volonta: 11, magia: 12 });
  assert.deepEqual([n.movimento.passo, n.movimento.corsa, n.movimento.scatto], [6, 12, 18]);
  assert.equal(pxPng('III', 2, dati), 60);
  assert.match(n.note, /PX pronti per quattro PG: 60/);
});

test('EQ (Direttore §9.6.1): una volta su Iniziativa, VA e danno degli attacchi, Parata, AR e le quattro Salvezze; niente su Caratteristiche, PV, PM, Azioni, Movimento, Abilità', () => {
  for (const id of Object.keys(dati.png_generici.classi)) {
    for (const g of GRADI) {
      const a = profiloPng({ classe: id, grado: g, eq: 0 }, dati).nemico;
      for (const eq of [1, 3, 5]) {
        const b = profiloPng({ classe: id, grado: g, eq }, dati).nemico;
        assert.equal(b.iniziativa, a.iniziativa + eq, `${id} ${g}: iniziativa`);
        assert.equal(b.ar.totale, a.ar.totale + eq);
        assert.equal(b.difese, a.difese + eq);
        for (const k of ['tempra', 'riflessi', 'volonta', 'magia']) assert.equal(b.salvezze[k], a.salvezze[k] + eq);
        b.attacchi.forEach((x, i) => { assert.equal(x.va, a.attacchi[i].va + eq); assert.equal(x.danno, sommaEqDanno(a.attacchi[i].danno, eq)); });
        for (const k of ['pv', 'pm', 'caratteristiche', 'azioni', 'movimento', 'abilita']) assert.deepEqual(b[k], a[k], `${id} ${g}: ${k} non cambia con EQ`);
      }
    }
  }
  assert.equal(sommaEqDanno('1d6', 2), '1d6+2');
  assert.equal(sommaEqDanno('1d8+3', 2), '1d8+5');
});

test('PX: la tabella del manuale coincide con PX base × (1 + 0,50 × EQ) per tutte le 36 combinazioni (Direttore §9.6)', () => {
  const base = { I: 10, II: 20, III: 30, IV: 50, V: 70, VI: 100 };
  for (const g of GRADI) for (let eq = 0; eq <= 5; eq += 1) assert.equal(pxPng(g, eq, dati), base[g] * (1 + 0.5 * eq), `${g} EQ ${eq}`);
  assert.equal(pxPng('III', 2, dati), 60); // esempio del §9.6
  assert.equal(pxPng('VI', 5, dati), 350); // esempio del §9.6
});

test('tutte le 360 combinazioni Classe × Grado × EQ passano il validatore dei nemici, con Iniziativa mai negativa e id unici', () => {
  const visti = new Set();
  let n = 0;
  for (const id of Object.keys(dati.png_generici.classi)) for (const g of GRADI) for (let eq = 0; eq <= 5; eq += 1) {
    const r = profiloNemico({ png: { classe: id, grado: g, eq } }, dati);
    assert.deepEqual(r.errori, []);
    assert.deepEqual(validaNemico(r.nemico, dati, ''), [], `${id} ${g} EQ ${eq}`);
    assert.ok(r.nemico.iniziativa >= 0);
    assert.ok(!visti.has(r.nemico.id), `id duplicato ${r.nemico.id}`);
    visti.add(r.nemico.id); n += 1;
    assert.equal(r.nemico.gs_px, undefined, 'il manuale non assegna un GS al Grado: nessun GS inventato');
    assert.deepEqual(r.nemico._bestiario.scelte, { png: { classe: id, grado: g, eq } });
  }
  assert.equal(n, 360);
});

test('un dato assente resta assente: la Parata «—» del Lottatore di I Grado non diventa 0; le Difese valgono la Schivata, con l’avviso (A.206)', () => {
  assert.equal(dati.png_generici.classi.lottatore.risorse.I.parata, null);
  const r = profiloPng({ classe: 'lottatore', grado: 'I', eq: 1 }, dati);
  assert.equal(r.nemico.difese, 12 + 1);
  assert.match(r.avvisi.join(' '), /Parata è «—»/);
  assert.match(r.avvisi.join(' '), /A\.206/);
  // le altre 59 righe hanno la Parata scritta
  let senza = 0;
  for (const c of Object.values(dati.png_generici.classi)) for (const g of GRADI) if (c.risorse[g].parata === null) senza += 1;
  assert.equal(senza, 1);
});

test('i dati coincidono con il manuale: rileggere il Word dà esattamente data/png_generici.json', () => {
  const letto = importaPng(testo);
  assert.deepEqual(JSON.parse(JSON.stringify(letto)), dati.png_generici);
});

test('armi e capacità: portata e modalità dagli armamenti astratti; Talenti di Classe fino al Grado; Pronto Soccorso solo al Paramedico', () => {
  const art = profiloPng({ classe: 'artigliere', grado: 'IV', eq: 0 }, dati).nemico;
  const mitra = art.attacchi.find((a) => a.nome === 'Mitragliatore');
  assert.equal(mitra.tipo, 'distanza'); assert.equal(mitra.gittata_q, 200);
  assert.deepEqual(mitra.modalita, ['S', 'RB', 'RM', 'RL', 'FS']);
  assert.equal(art.attacchi.find((a) => a.nome === 'Lama leggera').portata_q, 1);
  const talenti = (n) => n.capacita.filter((c) => /\((I|II|III|IV|V|VI) Grado\)/.test(c.nome)).length;
  assert.equal(talenti(profiloPng({ classe: 'agente', grado: 'I', eq: 0 }, dati).nemico), 1);
  assert.equal(talenti(profiloPng({ classe: 'agente', grado: 'VI', eq: 0 }, dati).nemico), 6);
  const par = profiloPng({ classe: 'paramedico', grado: 'II', eq: 0 }, dati).nemico;
  assert.ok(par.capacita.some((c) => c.nome === 'Pronto Soccorso'));
  assert.ok(!profiloPng({ classe: 'soldato', grado: 'II', eq: 0 }, dati).nemico.capacita.some((c) => c.nome === 'Pronto Soccorso'));
});

test('«Crea nemico»: nome e descrizione proposti, nome e id scelti dal master vincono, errori chiari', () => {
  assert.equal(proponiNome({ png: { classe: 'soldato', grado: 'III', eq: 2 } }, dati), 'Soldato PNG III Grado EQ 2 Rara');
  assert.match(proponiDescrizione({ png: { classe: 'soldato', grado: 'III', eq: 2 } }, dati), /./);
  const r = profiloNemico({ png: { classe: 'soldato', grado: 'III', eq: 2 }, nome: 'Guardia del cancello', id: 'guardia-cancello', descrizione: 'Guardia di turno.' }, dati);
  assert.equal(r.nemico.nome, 'Guardia del cancello'); assert.equal(r.nemico.id, 'guardia-cancello');
  assert.match(r.nemico.note, /^Guardia di turno\./);
  const male = profiloNemico({ png: { classe: 'mago', grado: 'VII', eq: 9 } }, dati);
  assert.equal(male.nemico, null);
  assert.equal(male.errori.length, 3);
});

test('il validatore dei dati dice file, chiave e che cosa non torna', () => {
  const x = structuredClone(dati);
  x.png_generici.px.III = [30, 45];
  x.png_generici.classi.agente.attacchi.I[0].arma = 'Cannone';
  delete x.png_generici.classi.agente.abilita.Atletica;
  const e = validaDati(x).map((y) => `${y.file} › ${y.chiave}: ${y.problema}`).join('\n');
  assert.match(e, /png_generici.json › px\.III: sei PX crescenti/);
  assert.match(e, /png_generici.json › classi\.agente\.attacchi\.I\[0\]: l’arma «Cannone»/);
  assert.match(e, /png_generici.json › classi\.agente\.abilita: manca l’Abilità «Atletica»/);
});
