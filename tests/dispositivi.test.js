// src/dispositivi.js: l'abbinamento dispositivo (tablet) → personaggio (21/10/2026, «il tablet è una vista»;
// esteso lo stesso giorno, pomeriggio, «le code dell'originale» parte B: il dispositivo resta nell'elenco anche
// senza personaggio scelto o dopo «Stacca», così il Direttore lo vede e lo corregge invece di vederlo sparire).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizzaDispositivi, associazioneDi, dispositivoVisto, conAssociazione, senzaAssociazione, puoScrivere, elencoDispositivi } from '../src/dispositivi.js';

const ID1 = 'd-aaaaaa111111';
const ID2 = 'd-bbbbbb222222';

test('normalizzaDispositivi: archivio vuoto o mancante → nessuna voce', () => {
  assert.deepEqual(normalizzaDispositivi(null), { versione: 1, dispositivi: {} });
  assert.deepEqual(normalizzaDispositivi({}), { versione: 1, dispositivi: {} });
  assert.deepEqual(normalizzaDispositivi({ dispositivi: 'rotto' }), { versione: 1, dispositivi: {} });
});

test('normalizzaDispositivi: scarta solo gli id non plausibili; tiene le voci senza pgId (non ancora scelto)', () => {
  const db = normalizzaDispositivi({ dispositivi: {
    [ID1]: { pgId: 'pg-123', pgNome: 'Aiko', aggiornato: '2026-10-21T10:00:00.000Z' },
    'corto': { pgId: 'pg-456' }, // id troppo corto: scartato
    [ID2]: { pgId: null, aggiornato: '2026-10-21T09:00:00.000Z' }, // si è fatto vivo, non ha ancora scelto
  } });
  assert.deepEqual(Object.keys(db.dispositivi).sort(), [ID1, ID2].sort());
  assert.equal(db.dispositivi[ID2].pgId, null);
  assert.equal(db.dispositivi[ID2].pgNome, null);
});

test('associazioneDi: null solo se il dispositivo non si è MAI fatto vivo', () => {
  assert.equal(associazioneDi({}, ID1), null);
  assert.equal(associazioneDi({}, 'troppo-corto'.repeat(10)), null);
});

test('dispositivoVisto: la prima volta crea il record senza personaggio; non tocca mai pgId', () => {
  let db = dispositivoVisto({}, ID1, '2026-10-21T10:00:00.000Z');
  assert.deepEqual(associazioneDi(db, ID1), { pgId: null, pgNome: null, aggiornato: '2026-10-21T10:00:00.000Z' });
  // dopo aver scelto, «visto» aggiorna solo il momento, non il personaggio
  db = conAssociazione(db, ID1, 'pg-123', 'Aiko', '2026-10-21T10:05:00.000Z');
  db = dispositivoVisto(db, ID1, '2026-10-21T10:15:00.000Z');
  assert.deepEqual(associazioneDi(db, ID1), { pgId: 'pg-123', pgNome: 'Aiko', aggiornato: '2026-10-21T10:15:00.000Z' });
});

test('conAssociazione: sceglie, e si può cambiare', () => {
  let db = conAssociazione({}, ID1, 'pg-123', 'Aiko', '2026-10-21T10:00:00.000Z');
  assert.deepEqual(associazioneDi(db, ID1), { pgId: 'pg-123', pgNome: 'Aiko', aggiornato: '2026-10-21T10:00:00.000Z' });
  db = conAssociazione(db, ID1, 'pg-999', 'Lucas', '2026-10-21T11:00:00.000Z');
  assert.deepEqual(associazioneDi(db, ID1), { pgId: 'pg-999', pgNome: 'Lucas', aggiornato: '2026-10-21T11:00:00.000Z' });
});

test('conAssociazione: non tocca gli altri dispositivi', () => {
  let db = conAssociazione({}, ID1, 'pg-123', 'Aiko');
  db = conAssociazione(db, ID2, 'pg-456', 'Botha');
  assert.equal(associazioneDi(db, ID1).pgId, 'pg-123');
  assert.equal(associazioneDi(db, ID2).pgId, 'pg-456');
});

test('senzaAssociazione («Stacca»): svuota il personaggio ma il dispositivo resta nell’elenco', () => {
  let db = conAssociazione({}, ID1, 'pg-123', 'Aiko', '2026-10-21T10:00:00.000Z');
  db = senzaAssociazione(db, ID1, '2026-10-21T12:00:00.000Z');
  assert.deepEqual(associazioneDi(db, ID1), { pgId: null, pgNome: null, aggiornato: '2026-10-21T12:00:00.000Z' });
  // non è sparito: elencoDispositivi lo mostra ancora, leggibile come «non ancora assegnato» (lo fa l'interfaccia)
  assert.ok(elencoDispositivi(db).some((d) => d.id === ID1));
});

test('senzaAssociazione: un dispositivo mai visto resta sconosciuto (niente da staccare)', () => {
  const db = senzaAssociazione({}, ID1);
  assert.equal(associazioneDi(db, ID1), null);
});

test('puoScrivere: solo il proprio personaggio, e solo se lo ha scelto', () => {
  const db = conAssociazione({}, ID1, 'pg-123', 'Aiko');
  assert.equal(puoScrivere(db, ID1, 'pg-123'), true);
  assert.equal(puoScrivere(db, ID1, 'pg-999'), false);
  assert.equal(puoScrivere(db, ID2, 'pg-123'), false); // ID2 non ha scelto
  assert.equal(puoScrivere(db, ID1, null), false);
  // visto ma non ancora scelto (o staccato): non può scrivere niente
  const visto = dispositivoVisto({}, ID2);
  assert.equal(puoScrivere(visto, ID2, 'pg-123'), false);
});

test('elencoDispositivi: dal più recente, con le voci senza personaggio comprese', () => {
  let db = conAssociazione({}, ID1, 'pg-123', 'Aiko', '2026-10-21T09:00:00.000Z');
  db = dispositivoVisto(db, ID2, '2026-10-21T10:00:00.000Z'); // si è fatto vivo, non ha ancora scelto
  const e = elencoDispositivi(db);
  assert.deepEqual(e.map((x) => x.id), [ID2, ID1]);
  assert.equal(e[0].pgId, null);
});
