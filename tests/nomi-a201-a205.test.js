// A.201 (nomi dei draghi metallici) e A.205 (Diplomazia → Oratoria), risposte di Davide del 30/10/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';
import { vociAggiungiNemico } from '../src/ui/aggiungi-nemico.js';
import { nomeCanonico, aliasDelNome, slug } from '../tools/importa-mostri.mjs';

const { dati } = await datiReali();
const DIR = fileURLToPath(new URL('../esempi/nemici/mostri/', import.meta.url));
const leggi = (id) => JSON.parse(readFileSync(`${DIR}${id}.json`, 'utf8'));
const draghiMetallici = readdirSync(DIR).filter((f) => /^drago-di-(ottone|rame|bronzo|argento|oro)-/.test(f)).map((f) => leggi(f.replace('.json', '')));

test('A.201: per tutti gli stadi Drago d’ottone, di rame, di bronzo, d’argento, d’oro — venti creature, nessuna duplicata', () => {
  assert.equal(draghiMetallici.length, 20);
  for (const n of draghiMetallici) {
    assert.match(n.nome, /^Drago (d’(ottone|argento|oro)|di (rame|bronzo)) (cucciolo|giovane|adulto|antico)$/, n.nome);
    assert.deepEqual(validaNemico(n, dati, n.id), [], n.id);
  }
  assert.equal(new Set(draghiMetallici.map((n) => n.id)).size, 20);
  assert.equal(new Set(draghiMetallici.map((n) => n.nome)).size, 20);
  // gli id non cambiano (nessun file di campagna si perde)
  assert.ok(draghiMetallici.some((n) => n.id === 'drago-di-ottone-adulto' && n.nome === 'Drago d’ottone adulto'));
});

test('A.201: la forma di prima resta come alias, solo dove era diversa (ottone, argento, oro); rame e bronzo non ne hanno bisogno', () => {
  for (const n of draghiMetallici) {
    const dOro = /d’(ottone|argento|oro)/.test(n.nome);
    if (dOro) assert.deepEqual(n.alias, [n.nome.replace('d’', 'di ')], n.nome);
    else assert.equal(n.alias, undefined, n.nome);
  }
  assert.equal(nomeCanonico('Drago di ottone adulto'), 'Drago d’ottone adulto');
  assert.equal(nomeCanonico('Drago d’oro antico'), 'Drago d’oro antico');
  assert.equal(nomeCanonico('Drago d\'argento giovane'), 'Drago d’argento giovane');
  assert.equal(nomeCanonico('Drago di rame cucciolo'), 'Drago di rame cucciolo');
  assert.equal(nomeCanonico('Drago d’rame cucciolo'), 'Drago di rame cucciolo');
  assert.equal(nomeCanonico('Drago rosso adulto'), 'Drago rosso adulto');
  assert.deepEqual(aliasDelNome('Drago d’oro adulto'), ['Drago di oro adulto']);
  assert.deepEqual(aliasDelNome('Drago di rame adulto'), []);
  assert.equal(slug('Drago d’oro adulto'), 'drago-di-oro-adulto');
});

test('A.201: cercando il nome vecchio («di ottone», «Drago di oro adulto», o l’apostrofo diritto) si trova il drago rinominato, una volta sola', () => {
  const voci = draghiMetallici.map((n) => ({ id: n.id, file: `${n.id}.json`, nemico: n }));
  const nomi = (q) => vociAggiungiNemico(voci, { creature: [], gradi: [], basi: {} }, q).map((x) => x.nome);
  assert.deepEqual(nomi('di ottone adulto'), ['Drago d’ottone adulto']);
  assert.deepEqual(nomi('Drago di oro adulto'), ['Drago d’oro adulto']);
  assert.deepEqual(nomi('drago d\'argento giovane'), ['Drago d’argento giovane']);
  assert.deepEqual(nomi('drago d’argento giovane'), ['Drago d’argento giovane']);
  assert.equal(nomi('ottone').length, 4);
  assert.equal(nomi('drago').length, 20);
});

test('A.205: «Diplomazia» è Oratoria ovunque, a valori invariati (Driade 13, Marinide 10); nessuna Abilità «Diplomazia» nei nemici', () => {
  assert.deepEqual(leggi('driade').abilita.find((a) => a.nome === 'Oratoria'), { nome: 'Oratoria', va: 13 });
  assert.deepEqual(leggi('marinide').abilita.find((a) => a.nome === 'Oratoria'), { nome: 'Oratoria', va: 10 });
  const visita = (d, f) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) visita(`${d}${e.name}/`, f); else if (e.name.endsWith('.json')) f(e.name, JSON.parse(readFileSync(`${d}${e.name}`, 'utf8'))); } };
  let controllati = 0;
  visita(fileURLToPath(new URL('../esempi/nemici/', import.meta.url)), (file, n) => {
    controllati += 1;
    assert.ok(!(n.abilita ?? []).some((a) => /Diplomazia/i.test(a.nome)), `${file}: Abilità «Diplomazia»`);
    for (const c of n.capacita ?? []) assert.ok(!/Diplomazia/i.test(`${c.nome} ${c.effetto} ${c.prova ?? ''}`), `${file}: ${c.nome}`);
    assert.ok(!/Diplomazia/.test(JSON.stringify(n.abilita ?? [])), file);
  });
  assert.ok(controllati > 250);
  // le abilità dei nemici sono tutte Abilità vere del Giocatore
  const vere = new Set(dati.abilita.abilita.map((a) => a.nome));
  visita(fileURLToPath(new URL('../esempi/nemici/', import.meta.url)), (file, n) => { for (const a of n.abilita ?? []) assert.ok(vere.has(a.nome), `${file}: «${a.nome}» non è un'Abilità`); });
});
