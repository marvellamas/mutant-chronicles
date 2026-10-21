// src/dispositivi.js: l'abbinamento dispositivo (tablet) → personaggio (21/10/2026, «il tablet è una vista»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizzaDispositivi, associazioneDi, conAssociazione, senzaAssociazione, puoScrivere, elencoDispositivi } from '../src/dispositivi.js';

const ID1 = 'd-aaaaaa111111';
const ID2 = 'd-bbbbbb222222';

test('normalizzaDispositivi: archivio vuoto o mancante → nessuna voce', () => {
  assert.deepEqual(normalizzaDispositivi(null), { versione: 1, dispositivi: {} });
  assert.deepEqual(normalizzaDispositivi({}), { versione: 1, dispositivi: {} });
  assert.deepEqual(normalizzaDispositivi({ dispositivi: 'rotto' }), { versione: 1, dispositivi: {} });
});

test('normalizzaDispositivi: scarta le voci senza pgId o con un id non plausibile', () => {
  const db = normalizzaDispositivi({ dispositivi: {
    [ID1]: { pgId: 'pg-123' },
    'corto': { pgId: 'pg-456' }, // id troppo corto
    [ID2]: { pgNome: 'Aiko' }, // senza pgId
  } });
  assert.deepEqual(Object.keys(db.dispositivi), [ID1]);
});

test('associazioneDi: null se il dispositivo non ha ancora scelto', () => {
  assert.equal(associazioneDi({}, ID1), null);
  assert.equal(associazioneDi({}, 'troppo-corto'.repeat(10)), null);
});

test('conAssociazione: sceglie, e si può cambiare', () => {
  let db = conAssociazione({}, ID1, 'pg-123', 'Aiko', '2026-10-21T10:00:00.000Z');
  assert.deepEqual(associazioneDi(db, ID1), { pgId: 'pg-123', pgNome: 'Aiko', aggiornato: '2026-10-21T10:00:00.000Z' });
  // si può cambiare dallo stesso dispositivo
  db = conAssociazione(db, ID1, 'pg-999', 'Lucas', '2026-10-21T11:00:00.000Z');
  assert.deepEqual(associazioneDi(db, ID1), { pgId: 'pg-999', pgNome: 'Lucas', aggiornato: '2026-10-21T11:00:00.000Z' });
});

test('conAssociazione: non tocca gli altri dispositivi', () => {
  let db = conAssociazione({}, ID1, 'pg-123', 'Aiko');
  db = conAssociazione(db, ID2, 'pg-456', 'Botha');
  assert.equal(associazioneDi(db, ID1).pgId, 'pg-123');
  assert.equal(associazioneDi(db, ID2).pgId, 'pg-456');
});

test('senzaAssociazione: toglie solo quel dispositivo (correzione del Direttore)', () => {
  let db = conAssociazione({}, ID1, 'pg-123');
  db = conAssociazione(db, ID2, 'pg-456');
  db = senzaAssociazione(db, ID1);
  assert.equal(associazioneDi(db, ID1), null);
  assert.equal(associazioneDi(db, ID2).pgId, 'pg-456');
});

test('puoScrivere: solo il proprio personaggio, e solo con un abbinamento', () => {
  const db = conAssociazione({}, ID1, 'pg-123', 'Aiko');
  assert.equal(puoScrivere(db, ID1, 'pg-123'), true);
  assert.equal(puoScrivere(db, ID1, 'pg-999'), false);
  assert.equal(puoScrivere(db, ID2, 'pg-123'), false); // ID2 non ha scelto
  assert.equal(puoScrivere(db, ID1, null), false);
});

test('elencoDispositivi: dal più recente', () => {
  let db = conAssociazione({}, ID1, 'pg-123', 'Aiko', '2026-10-21T09:00:00.000Z');
  db = conAssociazione(db, ID2, 'pg-456', 'Botha', '2026-10-21T10:00:00.000Z');
  const e = elencoDispositivi(db);
  assert.deepEqual(e.map((x) => x.id), [ID2, ID1]);
});
