// A.207 (risposta di Davide del 30/10/2026): armi ordinarie di umani e umanoidi — danni Naturali e AC 1 per singolo colpo, salvo
// indicazione del profilo. Il «Danno completo» comprende già i bonus ordinari: non si aggiungono Caratteristica o Specializzazione
// (l'EQ dei modelli PNG resta, una volta sola). AC 1 non limita il numero di attacchi del Round.
// Qui: nessun profilo del Tavolo somma due volte i bonus, in nessuna delle strade che producono un nemico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { datiReali } from './helpers.js';
import { calcolaAttaccoNemico } from '../src/nemico-attacco.js';
import { leggiDannoMoltiplicato } from '../src/danno.js';
import { scelteCreatura, profiloNemico } from '../src/crea-nemico.js';
import { profiloPng, classiPng, sommaEqDanno } from '../src/png-generici.js';
import { nemicoDaPg } from '../src/nemico-da-pg.js';

const { dati } = await datiReali();
const RADICE = fileURLToPath(new URL('../', import.meta.url));

function tuttiINemici() {
  const out = [];
  const visita = (d) => {
    for (const e of readdirSync(RADICE + d, { withFileTypes: true })) {
      if (e.isDirectory()) visita(`${d}${e.name}/`); else if (e.name.endsWith('.json')) out.push(JSON.parse(readFileSync(`${RADICE}${d}${e.name}`, 'utf8')));
    }
  };
  visita('esempi/nemici/');
  return out;
}

/** Per ogni attacco del nemico: il danno calcolato è quello della scheda, con il solo moltiplicatore in più, senza bonus aggiunti. */
function controlla(nemico, nome) {
  const p = { id: 'x', tipo: 'nemico', scheda: nemico, stati: [], intensita: {} };
  (nemico.attacchi ?? []).forEach((a, i) => {
    const r = calcolaAttaccoNemico(p, i, {}, dati);
    const letto = leggiDannoMoltiplicato(a.danno);
    const d = r.risultato.danno ?? null;
    if (d) {
      assert.equal(d.bonus, 0, `${nome}: ${a.nome}: nessun bonus di Caratteristica o Specializzazione aggiunto al danno «${a.danno}»`);
      assert.equal(d.formula, letto.formula, `${nome}: ${a.nome}: la formula calcolata è quella della scheda`);
    } else {
      const dist = r.risultato.danno_per_colpo;
      assert.equal(leggiDannoMoltiplicato(dist).formula, letto.formula, `${nome}: ${a.nome}: danno a distanza`);
    }
    assert.ok(Number.isInteger(a.ac ?? 1) && (a.ac ?? 1) >= 1, `${nome}: ${a.nome}: AC`);
  });
}

test('A.207: nei nemici prestabiliti (esempi/nemici, compresi umani e mostri) il danno calcolato è il «Danno completo» della scheda: nessun bonus in più', () => {
  const tutti = tuttiINemici();
  assert.ok(tutti.length > 250, `${tutti.length} nemici`);
  let attacchi = 0;
  for (const n of tutti) { controlla(n, n.nome); attacchi += (n.attacchi ?? []).length; }
  assert.ok(attacchi > 300, `${attacchi} attacchi controllati`);
});

test('A.207: danni Naturali e AC 1 per colpo salvo indicazione del profilo; Magico, Etereo e AC diverso solo dove il profilo li dichiara', () => {
  const eccezioni = { nonNaturali: new Set(), acDiverso: new Set() };
  let ordinari = 0;
  for (const n of tuttiINemici()) for (const a of n.attacchi ?? []) {
    const natura = a.natura ?? 'Naturale';
    if (natura !== 'Naturale') eccezioni.nonNaturali.add(`${n.id}:${a.nome}:${natura}`);
    if ((a.ac ?? 1) !== 1) eccezioni.acDiverso.add(`${n.id}:${a.nome}:AC${a.ac}`);
    if (natura === 'Naturale' && (a.ac ?? 1) === 1) ordinari += 1;
  }
  assert.ok(ordinari > 500, `${ordinari} attacchi ordinari: Naturali, AC 1`);
  // le sole eccezioni sono quelle dei profili che le dichiarano (Magico: Lama nefaria, elementali, Randello incantato, Dragomedusa; Etereo: non morti incorporei)
  for (const x of eccezioni.nonNaturali) assert.match(x, /:(Magico|Etereo)$/, x);
  assert.deepEqual([...eccezioni.acDiverso], ['mimic:Morso:AC2']);
  // AC 1 non limita gli attacchi del Round: il numero lo dicono Azioni e limiti del profilo; due attacchi dello stesso nemico si calcolano entrambi
  const scheda = tuttiINemici().find((n) => (n.attacchi ?? []).length >= 2 && (n.azioni?.principali ?? 1) >= 2);
  const p = { id: 'x', tipo: 'nemico', scheda, stati: [], intensita: {} };
  for (const i of [0, 1]) assert.ok(Number.isInteger(calcolaAttaccoNemico(p, i, {}, dati).risultato.va_finale), `${scheda.nome} attacco ${i}`);
});

test('A.207: il Bestiario proposto (creature pronte per grado, mutazioni e boss): il bonus di grado è sommato una volta al dado dell’arma, il calcolo dell’attacco non ne aggiunge altri', () => {
  let n = 0;
  for (const c of dati.bestiario.creature) {
    for (const g of c.gradi) {
      const sc = scelteCreatura(c.id, g, {}, dati);
      if (!sc) continue;
      const r = profiloNemico(sc, dati, { umani: {} });
      if (!r.nemico) continue; // umani da preparare: non hanno ancora il file
      controlla(r.nemico, `${c.id}/${g}`);
      n += 1;
    }
  }
  assert.ok(n > 20, `${n} profili controllati`);
});

test('A.207: i modelli PNG generici (10 Classi × 6 Gradi): la tabella dà il «Danno completo», l’EQ si somma una volta sola e nient’altro', () => {
  let n = 0;
  for (const cl of classiPng(dati)) {
    for (const g of dati.png_generici.gradi) {
      for (const eq of [0, 3]) {
        const r = profiloPng({ classe: cl.id, grado: g, eq }, dati);
        const classe = dati.png_generici.classi[cl.id];
        r.nemico.attacchi.forEach((a, i) => {
          const tab = classe.attacchi[g][i];
          assert.equal(a.danno, sommaEqDanno(tab.danno, eq) ?? tab.danno, `${cl.id} ${g} EQ ${eq}: ${a.nome}`);
          assert.equal(a.va, tab.va + eq, `${cl.id} ${g}: VA con EQ una volta`);
          assert.equal(a.natura, 'Naturale');
          assert.equal(a.ac, 1);
        });
        controlla(r.nemico, `${cl.id}/${g}/EQ${eq}`);
        n += 1;
      }
    }
  }
  assert.equal(n, 120);
});

test('A.207: «PG → nemico»: il danno del personaggio (con i suoi bonus) diventa il danno del nemico, e l’attacco non lo somma ancora', () => {
  const dir = RADICE + 'tests/fixtures/talenti-vecchi/';
  const file = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'attese.json')[0];
  const r = nemicoDaPg(readFileSync(dir + file, 'utf8'), dati);
  assert.ok(r.nemico, r.errore);
  controlla(r.nemico, file);
  assert.ok(r.nemico.attacchi.length > 0);
});
