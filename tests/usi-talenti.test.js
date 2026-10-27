// Usi limitati di Talenti/vantaggi, per scontro/sessione/giorno (27/10/2026, lotto 129, dal tavolo del 26/10).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vociConUso, allineaUsiTalenti, usatiDi, statoUsiTalenti, usaUnaVolta, azzeraUso } from '../src/usi-talenti.js';

const scheda = {
  talentiLiberi: [
    { id: 'mezzofondista', nome: 'Mezzofondista', usi: { ambito: 'giorno', quantita: 1 } },
    { id: 'senza-limite', nome: 'Senza Limite', usi: null },
  ],
  specializzazioni: [
    { id: 'incantesimi-massimizzati', nome: 'Incantesimi Massimizzati', usi: { ambito: 'scontro', quantita: 1 } },
  ],
  vantaggio: { nome: 'Colpo Perentorio', testo: '...', usi: { ambito: 'scontro', quantita: 1 } },
};

test('vociConUso: raccoglie Talenti, Specializzazioni/Maestrie e il vantaggio con un «usi», non gli altri', () => {
  const v = vociConUso(scheda);
  assert.deepEqual(v.map((x) => x.chiave).sort(), ['incantesimi-massimizzati', 'mezzofondista', 'vantaggio']);
  assert.deepEqual(v.find((x) => x.chiave === 'vantaggio'), { chiave: 'vantaggio', nome: 'Colpo Perentorio', ambito: 'scontro', quantita: 1 });
});

test('vociConUso: un personaggio senza vantaggio con «usi» (o senza vantaggio) non dà errore', () => {
  assert.deepEqual(vociConUso({ talentiLiberi: [], specializzazioni: [] }), []);
  assert.deepEqual(vociConUso({}), []);
});

test('allineaUsiTalenti: pulisce chiavi non valide, interi negativi, e tiene «scontro» solo se è un testo', () => {
  assert.deepEqual(allineaUsiTalenti(null), {});
  assert.deepEqual(allineaUsiTalenti({
    buono: { usati: 2, scontro: 's1' },
    senzaUsati: { scontro: 's1' },
    negativo: { usati: -1 },
    nonIntero: { usati: 1.5 },
  }), { buono: { usati: 2, scontro: 's1' } });
});

test('usatiDi: per l\'ambito "scontro", torna a 0 da sola quando lo scontro cambia (senza bisogno di azzerare)', () => {
  const voce = { chiave: 'incantesimi-massimizzati', ambito: 'scontro', quantita: 1 };
  const sessione = { usiTalenti: { 'incantesimi-massimizzati': { usati: 1, scontro: 's1' } } };
  assert.equal(usatiDi(sessione, voce, 's1'), 1); // stesso scontro: ancora usato
  assert.equal(usatiDi(sessione, voce, 's2'), 0); // scontro diverso: come se non fosse mai stato usato
  assert.equal(usatiDi(sessione, voce, null), 0); // fuori da uno scontro: idem
});

test('usatiDi: per "sessione" e "giorno" non si azzera da sola (nessun id di scontro conta)', () => {
  const voce = { chiave: 'mezzofondista', ambito: 'giorno', quantita: 1 };
  const sessione = { usiTalenti: { mezzofondista: { usati: 1 } } };
  assert.equal(usatiDi(sessione, voce, 's1'), 1);
  assert.equal(usatiDi(sessione, voce, 's2'), 1);
  assert.equal(usatiDi(sessione, voce, null), 1);
});

test('usaUnaVolta: registra un uso, mai sopra la quantità, con lo scontro solo per l\'ambito "scontro"', () => {
  const voce = { chiave: 'incantesimi-massimizzati', ambito: 'scontro', quantita: 1 };
  let s = { usiTalenti: {} };
  s = usaUnaVolta(s, voce, 's1', {});
  assert.deepEqual(s.usiTalenti['incantesimi-massimizzati'], { usati: 1, scontro: 's1' });
  const dopo = usaUnaVolta(s, voce, 's1', {}); // già alla quantità: non cambia
  assert.equal(dopo, s);
  // uno scontro nuovo: si azzera da sola, quindi la si può usare di nuovo
  const terzo = usaUnaVolta(s, voce, 's2', {});
  assert.deepEqual(terzo.usiTalenti['incantesimi-massimizzati'], { usati: 1, scontro: 's2' });
});

test('usaUnaVolta: con quantità 2, il secondo uso registra 2 e un terzo non cambia niente', () => {
  const voce = { chiave: 'x', ambito: 'sessione', quantita: 2 };
  let s = { usiTalenti: {} };
  s = usaUnaVolta(s, voce, null, {});
  assert.equal(s.usiTalenti.x.usati, 1);
  assert.equal(s.usiTalenti.x.scontro, undefined); // mai per un ambito diverso da "scontro"
  s = usaUnaVolta(s, voce, null, {});
  assert.equal(s.usiTalenti.x.usati, 2);
  const dopo = usaUnaVolta(s, voce, null, {});
  assert.equal(dopo, s);
});

test('azzeraUso: rimette a zero (togliendo la voce), senza toccare le altre', () => {
  const s = { usiTalenti: { a: { usati: 1 }, b: { usati: 1, scontro: 's1' } } };
  const dopo = azzeraUso(s, 'a');
  assert.deepEqual(dopo.usiTalenti, { b: { usati: 1, scontro: 's1' } });
  assert.equal(azzeraUso(dopo, 'non-cè'), dopo); // niente da togliere: stessa sessione
});

test('statoUsiTalenti: la lista pronta per la tab, con «usati» già risolto', () => {
  const sessione = { usiTalenti: { 'incantesimi-massimizzati': { usati: 1, scontro: 's1' } } };
  const stato = statoUsiTalenti(scheda, sessione, 's1');
  const voce = stato.find((x) => x.chiave === 'incantesimi-massimizzati');
  assert.deepEqual(voce, { chiave: 'incantesimi-massimizzati', nome: 'Incantesimi Massimizzati', ambito: 'scontro', quantita: 1, usati: 1 });
  // in un altro scontro, torna disponibile
  assert.equal(statoUsiTalenti(scheda, sessione, 's2').find((x) => x.chiave === 'incantesimi-massimizzati').usati, 0);
});
