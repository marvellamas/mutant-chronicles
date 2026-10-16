// Morente (A.159, risposta di Davide approvata il 14/10/2026). Supera la decisione provvisoria di Marcello del
// 13/10 («oltre Grave vale come Grave e basta»): oltre Grave il personaggio è Morente, mantiene −8, sviene e ha
// un contatore di Round pari alla COS intera, che cala di 1 per Round e di 1 per ogni nuova Ferita; a 0 l'app
// avvisa e decide il master. «Stabilizza» riporta a Grave e spegne il contatore. I nemici restano come oggi
// (A.164 aperta). Tutti i numeri stanno in regole.json → ferite.morente, non nel codice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { descriviFerite, inizializzaSessione, massimiSessione, allineaSessione, modificaSessione, stabilizzaMorente, scalaMorente, nuovaSessione } from '../src/sessione.js';
import { statoMorente, roundRimasti, togliRound, contatoreIniziale, gradoMorente } from '../src/morente.js';
import { condizioniAttive, applicaCondizioni } from '../src/condizioni.js';
import { calcolaScheda } from '../src/calc.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { applicaColpo } from '../src/danno.js';

const { dati } = await datiReali();
const scheda = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
const m = massimiSessione(scheda, MISHIMA_AGENTE, dati);
const GRADO = gradoMorente(dati); // 6: oltre Grave
const COS = scheda.caratteristiche.COS.valore;
/** Sessione con le Ferite al gradino `n`, allineata (così il contatore si apre o si spegne da sé). */
const con = (n, extra = {}) => allineaSessione({ ...inizializzaSessione(m), ferite: n, ...extra }, m);

test('i dati di Morente ci sono e sono coerenti', () => {
  const R = dati.regole.ferite.morente;
  assert.equal(R.nome, 'Morente');
  assert.equal(R.penalita_come, 'Grave');
  assert.equal(R.stato, 'svenuto');
  assert.equal(R.contatore.caratteristica, 'COS');
  assert.equal(R.contatore.per_round, 1);
  assert.equal(R.contatore.per_ferita, 1);
  assert.match(R.morto.avviso, /decide il master/, 'a 0 è un avviso, non un blocco');
  assert.ok(R.vie.length >= 4, 'le vie approvate sono un promemoria di solo testo');
  assert.equal(dati.regole.ferite.oltre, 'Morente');
  // niente numeri nel codice
  const src = readFileSync(new URL('../src/morente.js', import.meta.url), 'utf8');
  assert.ok(!/COS\s*[:=]\s*\d/.test(src) && !src.includes('= 5'), 'il contatore viene dalla scheda, non da un numero scritto');
});

test('oltre Grave: penalità di Grave e Stato Svenuto acceso da solo', () => {
  const grave = descriviFerite(GRADO - 1, dati);
  const oltre = descriviFerite(GRADO, dati);
  assert.equal(oltre.penalita, grave.penalita, 'mantiene −8');
  assert.equal(oltre.come, 'Grave');
  const s = con(GRADO);
  assert.ok(s.statiAttivi.includes('svenuto'), 'sviene automaticamente (A.159, punto 1)');
  // si può togliere a mano: l'app propone, non obbliga
  const senza = allineaSessione({ ...s, statiAttivi: [] }, m);
  assert.deepEqual(senza.statiAttivi, [], 'toltolo a mano, non torna da sé');
  assert.ok(senza.morente, 'ma il contatore resta');
});

test('il contatore parte dalla COS intera, non dal modificatore', () => {
  const s = con(GRADO);
  assert.equal(contatoreIniziale(scheda, dati), COS);
  assert.equal(s.morente.iniziale, COS);
  assert.equal(s.morente.dal, 1, 'il Round d’ingresso resta come riferimento');
  const mo = statoMorente(s, dati);
  assert.equal(mo.round, COS);
  assert.equal(mo.etichetta, `Morente — ${COS} Round`);
  assert.equal(mo.morto, false);
  assert.notEqual(COS, scheda.caratteristiche.COS.mod, 'è il valore intero, non il modificatore');
});

test('cala di 1 a ogni Round e il riferimento resta: la vista a un Round è idempotente', () => {
  const s = con(GRADO);
  assert.equal(roundRimasti(s.morente, 1), COS);
  assert.equal(roundRimasti(s.morente, 2), COS - 1, 'un Round passato: −1');
  assert.equal(roundRimasti(s.morente, 1 + COS), 0, 'dopo COS Round il contatore è a 0');
  assert.equal(roundRimasti(s.morente, 1 + COS + 3), 0, 'non va sotto 0');
  // il Round della sessione lo fa avanzare la plancia (src/round-scontro.js): rileggerlo non conta due volte
  const alQuarto = allineaSessione({ ...s, round: 4 }, m);
  assert.equal(statoMorente(alQuarto, dati).round, COS - 3);
  assert.equal(statoMorente(allineaSessione(alQuarto, m), dati).round, COS - 3);
});

test('ogni nuova Ferita toglie 1 Round, non 1 per punto di danno', () => {
  const s = con(GRADO);
  const dopoUna = modificaSessione(s, { morente: togliRound(s.morente, 1, dati) }, m);
  assert.equal(statoMorente(dopoUna, dati).round, COS - 1);
  const dopoDue = modificaSessione(s, { morente: togliRound(s.morente, 2, dati) }, m);
  assert.equal(statoMorente(dopoDue, dati).round, COS - 2, 'due Ferite: due Round');
  // e il «−1» a mano fa lo stesso
  const aMano = scalaMorente(s, 1, m, dati);
  assert.equal(statoMorente(aMano, dati).round, COS - 1);
  assert.equal(scalaMorente(con(GRADO - 1), 1, m, dati), null, 'chi non è Morente non ha contatore');
});

test('a 0 Round: avviso, nessun blocco e nessuna cancellazione', () => {
  const s = con(GRADO, { round: 1 });
  const finito = modificaSessione(s, { morente: togliRound(s.morente, COS, dati) }, m);
  const mo = statoMorente(finito, dati);
  assert.equal(mo.round, 0);
  assert.equal(mo.morto, true);
  assert.match(mo.avviso, /decide il master/);
  assert.equal(finito.ferite, GRADO, 'la scheda resta com’è: niente cancellazioni');
  assert.ok(finito.pvAttuali >= 0);
});

test('«Stabilizza» riporta a Grave e spegne il contatore', () => {
  const s = con(GRADO);
  const dopo = stabilizzaMorente(s, m);
  assert.equal(dopo.ferite, GRADO - 1, 'torna a Grave');
  assert.equal(dopo.morente, undefined, 'il contatore non c’è più');
  assert.equal(statoMorente(dopo, dati), null);
  assert.equal(descriviFerite(dopo.ferite, dati).penalita, -8, 'resta a −8');
  assert.equal(stabilizzaMorente(con(GRADO - 1), m), null, 'chi non è Morente non si stabilizza');
  // un nuovo episodio apre un contatore nuovo e pieno (A.159, punto 2)
  const ancora = allineaSessione({ ...dopo, ferite: GRADO, round: 7 }, m);
  assert.equal(ancora.morente.iniziale, COS);
  assert.equal(statoMorente(ancora, dati).round, COS);
  assert.equal(ancora.morente.dal, 7);
});

test('il contatore scompare quando le Ferite scendono, e «Nuova sessione» lo azzera', () => {
  const s = con(GRADO);
  assert.ok(s.morente);
  assert.equal(allineaSessione({ ...s, ferite: 2 }, m).morente, undefined);
  const nuova = allineaSessione(nuovaSessione(s, m), m);
  assert.equal(nuova.ferite, 0);
  assert.equal(nuova.morente, undefined);
});

test('i VA al tavolo restano a −8 oltre Grave, con l’etichetta «Morente»', () => {
  const base = inizializzaSessione(m);
  const va = (s) => applicaCondizioni(scheda, s, dati).salvezze.tempra.effettivo;
  assert.equal(va(con(GRADO)), va(con(GRADO - 1)), 'Tempra: stesso valore di Grave');
  assert.ok(va(con(GRADO)) < va(base));
  const r = condizioniAttive(con(GRADO), dati, scheda).find((x) => x.fonte === 'ferite');
  assert.ok(r, 'la riga delle Ferite c’è anche oltre Grave');
  assert.match(r.etichetta, /^Morente \(malus di Grave\)/);
});

test('la penalità mantenuta sta nei dati', () => {
  const altro = copia(dati);
  altro.regole.ferite.oltre_penalita_come = 'Seria';
  assert.equal(descriviFerite(GRADO, altro).penalita, -6);
  assert.ok(!readFileSync(new URL('../src/sessione.js', import.meta.url), 'utf8').includes('penalita: -8'));
});

test('«Colpito»: PG e nemici entrano in Morente (A.164 del 16/10); l’eccezione è esplicita', () => {
  const colpo = { danni: [30], natura: 'Naturale', difesa: 'nessuna', proprieta: [], tempra: ['fallimento'] };
  const pg = applicaColpo({ nome: 'Lucas', pv: { attuali: 0, massimo: 20 }, ferite: 5, ar: { totale: 0, magica: 0 } }, colpo, dati);
  assert.equal(pg.morente, true);
  assert.equal(pg.morte, false, 'oltre Grave non è più la morte immediata');
  assert.ok(pg.promemoria.some((p) => /Morente/.test(p) && /contatore/.test(p)));
  const nemico = applicaColpo({ nome: 'Rasente', pv: { attuali: 0, massimo: 20 }, ferite: 5, ar: { totale: 0, magica: 0 } }, colpo, dati);
  assert.equal(nemico.morente, true, 'A.164: anche i nemici');
  assert.equal(nemico.morte, false);
  // solo la scheda che lo prevede (o una causa di morte diretta) salta Morente
  const eccezione = applicaColpo({ nome: 'Costrutto', pv: { attuali: 0, massimo: 20 }, ferite: 5, ar: { totale: 0, magica: 0 }, morente: false }, colpo, dati);
  assert.equal(eccezione.morte, true);
  assert.equal(eccezione.morente, false);
});

test('il colpo che fa entrare in Morente lascia il contatore pieno (punto 3)', () => {
  // un colpo che produrrebbe più Ferite: le eccedenti non riducono il contatore
  const colpo = { danni: [30, 30, 30], natura: 'Naturale', difesa: 'nessuna', proprieta: [], tempra: ['fallimento', 'fallimento', 'fallimento'] };
  const r = applicaColpo({ nome: 'Lucas', pv: { attuali: 0, massimo: 20 }, ferite: 5, ar: { totale: 0, magica: 0 }, morente: true }, colpo, dati);
  assert.ok(r.ferite.dopo > GRADO, 'il grado grezzo va oltre');
  assert.ok(r.feriteOltre >= 1, 'le Ferite eccedenti si contano a parte');
  // la sessione entra in Morente con tutti i Round
  const s = allineaSessione({ ...inizializzaSessione(m), ferite: r.ferite.dopo }, m);
  assert.equal(s.ferite, GRADO, 'il gradino si ferma a «oltre Grave»');
  assert.equal(statoMorente(s, dati).round, COS, 'contatore pieno');
  // chi era già Morente perde 1 Round per Ferita: lo fa la plancia con togliRound
  const gia = con(GRADO);
  assert.equal(roundRimasti(togliRound(gia.morente, r.feriteOltre, dati), 1), Math.max(0, COS - r.feriteOltre));
});
