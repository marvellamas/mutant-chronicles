// A.184 (Davide, 25/10/2026): se un Talento non viene ripreso, cessano le capacità e le quote che dipendevano solo da lui:
// le vecchie scelte (Tecniche, incantesimi) restano leggibili come storico, senza effetti attivi; quello che viene da
// fonti indipendenti resta; se il Talento viene ripreso, le scelte si conservano entro le quote.
// Su una copia in memoria di Oshi Nagata (tests/fixtures/talenti-vecchi/): niente cartelle reali.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { pianoMigrazione } from '../src/migrazione-talenti.js';
import { calcolaSchedaPersonaggio, applicaSceltaTalento } from '../src/avanzamento.js';
import { calcolaAR } from '../src/protezione.js';
import { haRisorseInteriori } from '../src/tecniche.js';

const { dati } = await datiReali();
const oshi = JSON.parse(readFileSync(new URL('./fixtures/talenti-vecchi/OSHI-NAGATA_liv6_2026-10-07.json', import.meta.url), 'utf8'));
const migrato = pianoMigrazione(oshi, dati, { quando: new Date(2026, 9, 26, 20, 0) }).nuovo;
const comeScheda = (o) => calcolaSchedaPersonaggio({ creazione: o.scelte, livelli: o.livelli }, dati);
const idTec = (s) => s.tecniche.map((t) => t.id);

test('A.184: senza Risorse Interiori le Tecniche di Oshi sono storico, senza effetti, e non c’è più l’avviso', () => {
  const prima = comeScheda(oshi);
  assert.equal(prima.tecniche.length, 3, 'nei Talenti di prima le tre Tecniche sono attive');
  const s = comeScheda(migrato);
  assert.deepEqual(s.tecniche, [], 'nessuna Tecnica attiva');
  assert.equal(s.storico.tecniche.length, 3, 'le tre Tecniche restano leggibili');
  assert.deepEqual(s.storico.tecniche.map((t) => t.id).sort(), idTec(prima).sort());
  assert.equal(haRisorseInteriori(s), false, 'la sezione delle Risorse Interiori non c’è');
  assert.ok(!s.errori.some((e) => /^Tecniche conosciute/.test(e.problema)), 'niente avviso «conosciute 3, ammesse 0»');
  // le scelte restano scritte nel file
  assert.equal(migrato.livelli.flatMap((v) => v.tecniche ?? []).length, 3);
});

test('A.184: l’Aura di Resistenza in storico non dà AR (nessun effetto attivo)', () => {
  const s = comeScheda(migrato);
  const eq = { protezioni: [], effettiOggetti: [] };
  const ar = calcolaAR(eq, dati, { tecniche: s.tecniche.map((t) => t.id), accesi: new Set(['tecnica:aura-di-resistenza']) });
  assert.equal(ar.totale, 0);
  // con il Talento le Tecniche tornano: l'Aura dà il suo +2
  const ripreso = comeScheda(riprendi(migrato));
  assert.ok(idTec(ripreso).includes('aura-di-resistenza'));
  const ar2 = calcolaAR(eq, dati, { tecniche: idTec(ripreso), accesi: new Set(['tecnica:aura-di-resistenza']) });
  assert.equal(ar2.totale, 2);
});

function riprendi(o) {
  const p = applicaSceltaTalento({ creazione: o.scelte, livelli: o.livelli }, { categoria: 'talento_libero', livello: 5 }, { id: 'risorse-interiori' });
  return { ...o, scelte: p.creazione, livelli: p.livelli };
}

test('A.184: se il Talento viene ripreso le scelte tornano attive, entro le quote', () => {
  const s = comeScheda(riprendi(migrato));
  assert.ok(s.tecnicheAmmesse > 0);
  assert.equal(s.tecniche.length + (s.storico?.tecniche.length ?? 0), 3, 'le tre scelte ci sono sempre');
  assert.ok(s.tecniche.length <= s.tecnicheAmmesse, 'attive entro la quota');
  assert.equal(s.tecniche.length, Math.min(3, s.tecnicheAmmesse));
  assert.ok(haRisorseInteriori(s));
});

test('A.184: i Talenti di prima non cambiano (nessuno storico)', () => {
  const s = comeScheda(oshi);
  assert.equal(s.storico, undefined);
});
