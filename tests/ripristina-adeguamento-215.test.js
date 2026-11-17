import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 215 — la copia che `--applica` fa prima dell'adeguamento deve comparire in «Ripristina» (voce 4 di Mutant.bat): è la sola via di ritorno
// dopo una serata andata storta, e prima di oggi `elencoSalvataggi` non la conosceva (la prova generale l'ha trovato).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { elencoSalvataggi, TIPI } from '../tools/ripristina.mjs';
import { PREFISSO, nomeZip } from '../tools/adegua-abilita.mjs';

test('il prefisso della copia dell\'adeguamento è quello che Ripristina riconosce', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rip215-'));
  const sal = join(dir, 'salvataggi'); mkdirSync(sal);
  const nome = nomeZip(new Date(2026, 10, 17, 21, 5, 0));
  assert.ok(nome.startsWith(PREFISSO));
  writeFileSync(join(sal, nome), 'zip finto');
  writeFileSync(join(sal, 'sessione_2026-11-17_2000.zip'), 'zip finto');
  const e = elencoSalvataggi({ salvataggi: sal, autosave: join(dir, 'autosave') });
  const mia = e.find((x) => x.nome === nome);
  assert.ok(mia, 'la copia di --applica manca dall\'elenco di Ripristina');
  assert.equal(mia.tipo, 'prima-adeguamento');
  assert.match(TIPI['prima-adeguamento'], /adeguamento/);
  assert.equal(e.length, 2, 'le altre copie restano nell\'elenco');
});

test('MUTANTE: un file zip con un altro nome non entra nell\'elenco (il riconoscimento non è «qualunque zip»)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rip215-'));
  const sal = join(dir, 'salvataggi'); mkdirSync(sal);
  writeFileSync(join(sal, 'qualcosa-altro_2026-11-17.zip'), 'x');
  assert.equal(elencoSalvataggi({ salvataggi: sal, autosave: join(dir, 'autosave') }).length, 0);
});
