// Ferite «Oltre» come «Grave» (13/10/2026, decisione di Marcello; A.159 per Davide): oltre Grave di norma è la
// morte (§5.14), ma se il personaggio resta in piedi valgono gli stessi malus di Grave. Il valore sta nei dati
// (regole.json → ferite.oltre_penalita_come), non nel codice; nessun blocco, solo un avviso al master.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { descriviFerite, inizializzaSessione, massimiSessione } from '../src/sessione.js';
import { condizioniAttive, applicaCondizioni } from '../src/condizioni.js';
import { calcolaScheda } from '../src/calc.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { applicaColpo } from '../src/danno.js';

const { dati } = await datiReali();

test('oltre Grave dà gli stessi malus di Grave, con l’avviso che di norma è la morte', () => {
  const grave = descriviFerite(dati.regole.ferite.stati.length, dati);
  const oltre = descriviFerite(dati.regole.ferite.stati.length + 1, dati);
  assert.equal(oltre.penalita, grave.penalita, 'stessa penalità di Grave');
  assert.equal(oltre.come, 'Grave');
  assert.match(oltre.nome, /^Oltre Grave:/);
  assert.match(oltre.avviso, /decide il master/, 'è un avviso, non un blocco');
});

test('il valore sta nei dati: togliendolo si torna a nessuna penalità', () => {
  const senza = copia(dati);
  senza.regole.ferite.oltre_penalita_come = null;
  assert.equal(descriviFerite(6, senza).penalita, null);
  const altro = copia(dati);
  altro.regole.ferite.oltre_penalita_come = 'Seria';
  assert.equal(descriviFerite(6, altro).penalita, -6, 'la penalità è quella dello Stato indicato nei dati');
  // niente numeri nel codice
  assert.ok(!readFileSync(new URL('../src/sessione.js', import.meta.url), 'utf8').includes('penalita: -8'));
});

test('i VA al tavolo scendono di 8 anche oltre Grave (prima restavano come senza Ferite)', () => {
  const scheda = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const m = massimiSessione(scheda, MISHIMA_AGENTE, dati);
  const base = inizializzaSessione(m);
  const conGrave = { ...base, ferite: 5 };
  const conOltre = { ...base, ferite: 6 };
  const va = (s) => applicaCondizioni(scheda, s, dati).salvezze.tempra.effettivo;
  assert.equal(va(conOltre), va(conGrave), 'Tempra: stesso valore di Grave');
  assert.ok(va(conOltre) < va(base), 'e più bassa che senza Ferite');
  const righe = condizioniAttive(conOltre, dati, scheda);
  const r = righe.find((x) => x.fonte === 'ferite');
  assert.ok(r, 'la riga delle Ferite c’è anche oltre Grave');
  assert.match(r.etichetta, /Ferita oltre Grave \(malus di Grave\)/);
  assert.equal(m.ferite, dati.regole.ferite.stati.length + 1);
});

test('nessun blocco: «Colpito» oltre Grave resta un promemoria per il master', () => {
  // già a 0 PV e a Grave: la PS di Tempra fallita aggiunge Ferite e si va oltre (§5.14)
  const r = applicaColpo({ nome: 'Lucas', pv: { attuali: 0, massimo: 20 }, ferite: 5, ar: { totale: 0, magica: 0 } }, { danni: [30], natura: 'Naturale', difesa: 'nessuna', proprieta: [], tempra: ['fallimento'] }, dati);
  assert.ok(r.promemoria.some((p) => /oltre Grave/.test(p)), 'la morte si segnala, non si applica da sola');
});
