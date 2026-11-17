import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 210 (17/11/2026), parte D — il progetto «Paradise» descrive l'arma vera.
//
// Armamenti 0.86 §7.25.4 e l'E&L dell'11/11 (A.271): il Verde è già installato; resta il giorno 3 (modulo SIN, forma,
// collaudo). Il testo diceva ancora «metterla al posto del frammento Viola», e lo legge Davide prima di consegnare. I numeri
// (giorni, prove, ore, risorse) non cambiano: qui si controllano contro il manuale perché il lotto non li abbia toccati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { testoManuale } from '../tools/manuali.mjs';
import { modelliProgetto } from '../src/progetti.js';

const { dati } = await datiReali();
const MANUALE = testoManuale('armamenti').replace(/\\/g, '').replace(/\*\*/g, '');
const M = modelliProgetto(dati).find((m) => m.id === 'paradise-dimitri');

test('il manuale dice che il Verde è già installato e che resta una terza giornata (la fonte del testo)', () => {
  assert.match(MANUALE, /Dimitri ha sostituito il frammento Viola dell’esemplare recuperato da Park con la propria scheggia Verde stabilizzata/);
  assert.match(MANUALE, /È installato soltanto il focalizzatore Verde/);
  assert.match(MANUALE, /terza giornata, non compresa nella configurazione attuale/);
});

test('il testo del progetto non descrive più come futuro ciò che è già fatto', () => {
  assert.ok(M, 'il progetto c’è');
  assert.match(M.descrizione, /ha già il focalizzatore Verde al posto del Viola/);
  assert.doesNotMatch(M.descrizione, /preparare la scheggia Verde[^.]*metterla al posto del frammento Viola/, 'la frase falsa del piano di prima');
  assert.match(M.descrizione, /resta da fare il giorno 3/);
  const g = (n) => M.giorni.find((x) => x.n === n);
  assert.match(g(1).lavoro, /già compreso nella configurazione attuale/);
  assert.match(g(2).lavoro, /già eseguiti/);
  assert.match(g(3).lavoro, /^Da fare:/);
  assert.match(M.componenti.find((c) => c.id === 'scheggia').nota, /già installato/);
  assert.match(M.componenti.find((c) => c.id === 'viola').nota, /già stato rimosso/);
  assert.ok(M.regole.some((r) => /già installato/.test(r) && /non estrae un frammento Viola/.test(r)));
  // la regola sull'alimentazione era scritta due volte
  assert.equal(new Set(M.regole).size, M.regole.length, 'nessuna regola ripetuta');
});

test('i numeri del progetto sono quelli del manuale (il lotto ha toccato solo il testo)', () => {
  assert.match(MANUALE, /Prima giornata: 8 ore di studio e progetto, Prova finale di Artefatti −2 VA, 200 cr di risorse\. Seconda giornata: 8 ore di preparazione e stabilizzazione della scheggia, Tecnologia −2 VA, 100 cr di consumabili\./);
  assert.match(MANUALE, /8 ore per recupero, adattamento, installazione e collaudo del modulo, Tecnologia −2 VA, 100 cr di consumabili\. Il piano completo prevedeva 24 ore e 400 cr/);
  assert.deepEqual(M.giorni.map((g) => [g.n, g.ore, g.prova.abilita, g.prova.modificatore, g.risorse_cr]), [[1, 8, 'Artefatti', -2, 200], [2, 8, 'Tecnologia', -2, 100], [3, 8, 'Tecnologia', -2, 100]]);
  assert.deepEqual([M.budget.ore, M.budget.cr, M.giorni_disponibili], [24, 400, 3]);
  assert.equal(M.risultato.voce.focalizzatore, 'Verde');
});
