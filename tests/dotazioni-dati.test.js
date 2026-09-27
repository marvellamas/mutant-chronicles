// Dati dell'equipaggiamento iniziale (data/dotazioni.json, Giocatore §2.16, E&L A.5–A.5.29).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { validaDati } from '../src/validate.js';

const { dati, errori } = await datiReali();
const d = dati.dotazioni;

test('dotazioni.json: i dati reali passano il validatore', () => {
  assert.deepEqual(errori, []);
});

test('dotazioni.json: ogni Classe di classi.json ha una dotazione, e nessun’altra', () => {
  assert.deepEqual(Object.keys(d.classi).sort(), dati.classi.classi.map((c) => c.nome).sort());
});

test('dotazioni.json: la dotazione comune ha gli 11 oggetti del §2.16.1', () => {
  assert.equal(d.comune.oggetti.length, 11);
  const q = Object.fromEntries(d.comune.oggetti.map((x) => [x.dotazione, x.quantita]));
  assert.equal(q.borraccia, 2);
  assert.equal(q['razione-da-viaggio'], 3);
});

test('dotazioni.json: il testo è copiato dal §2.16 del Manuale del Giocatore', () => {
  const norm = (s) => s.replace(/\\/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ');
  const doc = norm(readFileSync(new URL('../docs/manuali-txt/giocatore.md', import.meta.url), 'utf8'));
  const frasi = [...d.comune.note, ...d.scambio.testo, ...d.corporativi.testo, ...d.crediti.testo];
  for (const c of Object.values(d.classi)) {
    frasi.push(c.introduzione, ...c.note);
    for (const g of c.gruppi) frasi.push(g.testo, ...(g.testo_munizioni ? [g.testo_munizioni] : []));
  }
  assert.ok(frasi.length > 300);
  const mancanti = frasi.filter((f) => !doc.includes(f));
  assert.deepEqual(mancanti, []);
});

test('dotazioni.json: FOR dichiarata diversa dal catalogo → errore, salvo TODO(Davide)', () => {
  const x = copia(dati);
  const op = x.dotazioni.classi.Agente.gruppi[0].opzioni[0];
  op.for_dichiarata = 4;
  assert.ok(validaDati(x).some((e) => e.file === 'dotazioni.json' && e.chiave.endsWith('.for_dichiarata') && e.problema.includes('FOR 4')));
  op['TODO(Davide)'] = 'Il §2.16.2 dice FOR 4, il catalogo FOR 3.';
  assert.deepEqual(validaDati(x).filter((e) => e.file === 'dotazioni.json'), []);
});

test('dotazioni.json: riferimento inesistente e Classe senza dotazione sono errori leggibili', () => {
  const x = copia(dati);
  x.dotazioni.classi.Agente.gruppi[0].opzioni[0].oggetti[0].rif = 'armi_distanza:non-esiste';
  delete x.dotazioni.classi.Mistico;
  const e = validaDati(x).filter((e) => e.file === 'dotazioni.json');
  assert.ok(e.some((e) => e.problema.includes('"armi_distanza:non-esiste" non esiste nel catalogo')));
  assert.ok(e.some((e) => e.chiave === 'classi.Mistico' && e.problema.includes('non ha una dotazione')));
});

test('regole.json: crediti iniziali 1000 + 2d6 × 100, da 1200 a 2200 (§2.16.28)', () => {
  const cr = dati.regole.crediti_iniziali;
  assert.equal(cr.minimo, 1200);
  assert.equal(cr.massimo, 2200);
  const x = copia(dati);
  x.regole.crediti_iniziali.massimo = 2000;
  assert.ok(validaDati(x).some((e) => e.chiave === 'crediti_iniziali.massimo'));
});

test('dotazioni.json: ogni Corporazione ha il suo catalogo (Imperiali → Imperial, Freelance → Commerciale)', () => {
  assert.equal(d.cataloghi_corporazioni.Imperiali, 'Imperial');
  assert.equal(d.cataloghi_corporazioni.Freelance, 'Commerciale');
  const x = copia(dati);
  delete x.dotazioni.cataloghi_corporazioni.Imperiali;
  assert.ok(validaDati(x).some((e) => e.chiave === 'cataloghi_corporazioni.Imperiali'));
});
