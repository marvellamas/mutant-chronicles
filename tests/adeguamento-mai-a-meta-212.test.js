import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 212 (17/11/2026) — **l'adeguamento non resta mai a metà.**
//
// La prova sulla copia dell'istantanea del 15/11 ha trovato un buco che i test del 194, 200, 207 e 210 non vedevano: la doppia
// passata rifiutava di partire se mancava **la nota di prima**, ma non se un file **non si poteva scrivere**. Con un solo file in
// sola lettura (Lucas) gli altri erano già stati scritti e la procedura moriva con un errore di sistema: sei adeguati, uno no, e
// nessuno lo diceva. Il giorno in cui succede è la serata con sette persone che aspettano.
//
// Qui: (1) un file non scrivibile → nessuno viene toccato, e lo dice; (2) un errore a metà → i già scritti tornano com'erano.
// Entrambi provati sul disco, su una cartella come quella di Davide, e il controllo SA fallire (il mutante: scrivere senza guardare).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applica } from '../tools/adegua-abilita.mjs';
import { scriviPersonaggio } from '../tools/scrivi-personaggio.mjs';
import { cartellaComeDavide, improntaCartella, differenze } from './cartella-come-davide.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

test('un file in sola lettura: non si tocca NESSUNO, e il motivo dice chi', async () => {
  const c = cartellaComeDavide({ quanti: 4, versioni: 3 });
  const attuali = [...new Set(c.voci.map((v) => v.attuale?.file ?? v.file))];
  const prima = improntaCartella(c.cartella);
  // il secondo personaggio per nome: gli altri vengono scritti prima e dopo di lui
  const { personaggiDellaCartella } = await import('../tools/personaggi-cartella.mjs');
  const lista = personaggiDellaCartella(c.cartella);
  const ro = lista[1];
  chmodSync(join(c.cartella, ro.file), 0o444);
  try {
    const e = await applica({ cartella: c.cartella, salvataggi: c.salvataggi, d: dati });
    assert.equal(e.fatto, false);
    assert.match(e.motivo, /non tocco nessuno/);
    assert.ok(e.motivo.includes(ro.nome), `il motivo non dice chi: ${e.motivo}`);
    assert.deepEqual(differenze(prima, improntaCartella(c.cartella)), [], 'qualcuno è stato scritto');
  } finally { chmodSync(join(c.cartella, ro.file), 0o666); }
  assert.ok(attuali.length >= 4);
});

test('un errore a metà: i personaggi già scritti tornano com\'erano, byte per byte', async () => {
  const c = cartellaComeDavide({ quanti: 4, versioni: 3 });
  const prima = improntaCartella(c.cartella);
  let n = 0;
  // la scrittura vera per i primi due, poi un errore: è la cosa che il disco può fare a metà serata
  const scrivi = (percorso, nuovo, opz) => {
    if (++n === 3) throw Object.assign(new Error('disco pieno (prova)'), { code: 'ENOSPC' });
    return scriviPersonaggio(percorso, nuovo, opz);
  };
  const e = await applica({ cartella: c.cartella, salvataggi: c.salvataggi, d: dati, scrivi });
  assert.equal(n, 3, 'la prova doveva arrivare al terzo');
  assert.equal(e.fatto, false);
  assert.match(e.motivo, /rimesse a posto le 2 già scritte/);
  assert.deepEqual(differenze(prima, improntaCartella(c.cartella)), [], 'dopo il ripristino la cartella è identica a prima, metadati compresi');
});

test('…e il controllo SA fallire: senza il rollback la cartella resterebbe a metà (il mutante)', async () => {
  const c = cartellaComeDavide({ quanti: 4, versioni: 3 });
  const prima = improntaCartella(c.cartella);
  // il mutante: la stessa scrittura, ma senza il rollback (lo simuliamo scrivendo i primi due e fermandoci)
  const { personaggiDellaCartella } = await import('../tools/personaggi-cartella.mjs');
  const lista = personaggiDellaCartella(c.cartella);
  for (const p of lista.slice(0, 2)) scriviPersonaggio(join(c.cartella, p.file), p.json, { chi: 'master', quando: new Date() });
  assert.ok(differenze(prima, improntaCartella(c.cartella)).length >= 2, 'il confronto deve accorgersi di due file scritti');
  writeFileSync(join(c.cartella, '_ok.txt'), readFileSync(join(c.cartella, lista[0].file))); // niente: solo per usare il file
});
