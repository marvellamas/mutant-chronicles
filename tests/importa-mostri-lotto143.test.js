// Lotto 143 (Bestiario 0.46): l'importatore deve leggere tutte le 307 schede, non solo le nuove.
// Nel lotto 141 il test «legge come le schede già presenti» saltava in silenzio i campi che il parser non leggeva (`if (a.ar)`),
// e il controllo a mano ha trovato due difetti su cinque: un valore scritto nella pagina comune (AC) e un ingombro parziale
// al posto del completo. Qui: nessun campo numerico saltato, AC dal blocco, ingombro completo, controllo incrociato.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { importa, leggiEsistenti, leggiRighe, dividi, differenze, controlloIncrociato, norm } from '../tools/importa-mostri.mjs';

const testo = readFileSync(new URL('../docs/manuali-txt/mostri-word.md', import.meta.url), 'utf8');
const { risultati } = importa(testo);
const esistenti = leggiEsistenti();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const file = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));

test('nessun campo numerico saltato: ogni scheda già presente è letta per intero e coincide in PV, PM, Difese, AR, Iniziativa, movimento, Salvezze, spazio, GS e PX', () => {
  // unica eccezione dichiarata: «INI dopo l’evocatore» dei quattro Elementali maggiori non ha un numero nel manuale
  const senzaIniziativa = new Set(['elementale-dellacqua-maggiore', 'elementale-dellaria-maggiore', 'elementale-del-fuoco-maggiore', 'elementale-della-terra-maggiore']);
  let lette = 0;
  for (const r of risultati) {
    const e = esistenti.get(norm(r.nome));
    if (!e) continue;
    assert.ok(r.anteprima, `${r.id}: nessuna lettura`);
    const a = r.anteprima; const v = e.nemico; lette += 1;
    for (const k of ['pv', 'pm', 'difese']) assert.equal(a[k], v[k], `${r.id}: ${k}`);
    assert.deepEqual(a.ar, v.ar, `${r.id}: ar`);
    if (senzaIniziativa.has(r.id)) assert.equal(a.iniziativa, undefined, `${r.id}: iniziativa non scritta nel manuale`);
    else assert.equal(a.iniziativa, v.iniziativa, `${r.id}: iniziativa`);
    assert.deepEqual(a.movimento, v.movimento, `${r.id}: movimento`);
    assert.deepEqual(a.salvezze, v.salvezze, `${r.id}: salvezze`);
    assert.deepEqual(a.caratteristiche, v.caratteristiche, `${r.id}: caratteristiche`);
    assert.deepEqual([a.gs_px?.gs, a.gs_px?.px], [v.gs_px?.gs, v.gs_px?.px], `${r.id}: GS e PX`);
    assert.equal(a.spazio ?? null, v.spazio ?? null, `${r.id}: spazio`);
  }
  assert.ok(lette >= 307, `schede lette: ${lette}`);
});

test('le differenze residue sono solo quelle dichiarate: attacchi d’arma senza natura nella tabella, Abilità con condizione, nomi degli sciami, carica dell’Unicorno', () => {
  const nonAmmesse = [];
  for (const r of risultati) {
    const e = esistenti.get(norm(r.nome));
    if (!e || !r.anteprima) continue;
    for (const d of differenze(r.anteprima, e.nemico)) if (!/^(attacchi|abilità|iniziativa):/.test(d)) nonAmmesse.push(`${r.id}: ${d}`);
  }
  assert.deepEqual(nonAmmesse, []);
});

test('AC dalla pagina comune del blocco: ogni attacco di ogni scheda ha la sua AC; dove il manuale la scrive, il file la riporta', () => {
  for (const n of file) for (const a of n.attacchi ?? []) assert.ok(a.ac !== undefined, `${n.id}: attacco «${a.nome}» senza AC`);
  // l'importatore e i file non si contraddicono mai sull'AC quando l'importatore la legge
  for (const r of risultati) {
    const e = esistenti.get(norm(r.nome));
    if (!e || !r.anteprima) continue;
    for (const a of r.anteprima.attacchi ?? []) {
      if (a.ac === undefined) continue;
      const v = (e.nemico.attacchi ?? []).find((x) => x.nome === a.nome);
      if (v) assert.equal(v.ac, a.ac, `${r.id}: AC di «${a.nome}»`);
    }
  }
});

test('AC dalla pagina del blocco: le sei schede corrette nel lotto 143 hanno AC 1, la pagina lo scrive', () => {
  const ids = ['piovra-gigante-di-iris', 'pseudodrago', 'drago-fatato-giovane', 'drago-fatato-maturo', 'mezzodrago-rosso-veterano', 'dracolich-blu-adulto'];
  for (const id of ids) {
    const n = file.find((x) => x.id === id);
    assert.ok(n.attacchi.length > 0 && n.attacchi.every((a) => a.ac === 1), id);
    const r = risultati.find((x) => x.id === id);
    assert.ok(r.anteprima.attacchi.every((a) => a.ac === 1), `${id}: l’importatore legge AC 1`);
  }
  // l'AC 2 del Morso del Mimic è scritta per quell'attacco e non si estende al Pseudopodo
  const mimic = file.find((x) => x.id === 'mimic');
  assert.deepEqual(mimic.attacchi.map((a) => [a.nome, a.ac]), [['Pseudopodo', 1], ['Morso', 2]]);
  const rm = risultati.find((x) => x.id === 'mimic');
  assert.notEqual(rm.anteprima.attacchi.find((a) => a.nome === 'Pseudopodo')?.ac, 2);
});

test('ingombro: dove il manuale dà un ingombro completo e uno parziale, vale il completo; nessuna scheda a una colonna ha due misure senza il completo', () => {
  const { schede } = dividi(leggiRighe(testo));
  let conDue = 0;
  for (const s of schede) {
    const righe = s.righe.map((r) => r.t);
    const i = righe.findIndex((t) => /^(Campo|Dato)$/.test(t));
    if (i < 0) continue;
    let j = i; while (j < righe.length && righe[j].length < 260 && !/^Attacco$/.test(righe[j])) j += 1;
    const tab = righe.slice(i, j);
    const misure = new Set(); for (const t of tab) for (const m of t.matchAll(/(\d+)\s*×\s*(\d+)\s*Q(?!\s*Tattici)/g)) misure.add(`${m[1]} × ${m[2]} Q`);
    if (misure.size < 2) continue;
    conDue += 1;
    const completo = tab.findIndex((t) => /^Ingombro completo$/.test(t));
    if (completo >= 0) {
      const v = tab[completo + 1].match(/(\d+)\s*×\s*(\d+)/);
      const n = esistenti.get(norm(s.nome))?.nemico;
      assert.equal(n.spazio, `${v[1]} × ${v[2]} Q`, `${s.nome}: lo spazio è l'ingombro completo`);
    } else assert.ok(/Raptor|Iene/.test(s.nome), `${s.nome}: due misure in una scheda a una colonna senza «Ingombro completo»`);
  }
  assert.equal(conDue, 3, 'Raptor, Iene mutate (due colonne) e la Madre delle Murene');
  assert.equal(file.find((x) => x.id === 'madre-delle-murene-della-roccia').spazio, '6 × 2 Q');
});

test('controllo incrociato: VA, danni e Abilità delle schede presenti si trovano nel manuale accanto al nome; le sole discordanze sono dichiarate', () => {
  const p = controlloIncrociato(testo, esistenti).map((x) => `${x.id}: ${x.campo}`).sort();
  // Turk e Vespe: attacco scritto in un paragrafo («Corpo a corpo 10, 1d6+3 …»), verificato a mano (VA 10, 1d6+3 e VA 11, 1d4+2);
  // Driade e Marinide: il manuale scrive «Diplomazia», l'importatore la legge come Oratoria (A.205, 30/10/2026): ora coincidono
  assert.deepEqual(p, ['turk: attacco Urto difensivo', 'vespe-del-deserto: attacco Puntura']);
});
