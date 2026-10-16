// A.164 (risposta di Davide approvata il 16/10/2026): Morente vale anche per i nemici del Tavolo del
// Direttore, con le precisazioni che valgono pure per i PG:
//   - il primo decremento avviene dopo un Round completo, alla stessa posizione d'Iniziativa dell'ingresso;
//   - le Ferite eccedenti del colpo d'ingresso non abbreviano il contatore;
//   - ogni nuova Ferita successiva toglie un Round; a 0 si muore (avviso, non blocco);
//   - «Stabilizza» torna a Grave e spegne il contatore; un contatore spento a 0 non uccide;
//   - senza COS l'app lo segnala e chiede il dato: non lo ricava da Tempra o PV, non vale 0, nessuno muore.
//     Inserita a scontro in corso, contano i Round già trascorsi dall'ingresso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { apriMorente, conCos, togliRound, roundRimasti, roundTrascorsi, statoMorente, statoMorenteNemico, gradoMorente } from '../src/morente.js';
import { morenteDopoColpo, stabilizzaNemico, scalaMorenteNemico, cosNemico, registraColpo } from '../src/scontro.js';
import { colpoSuNemico } from '../src/colpo-nemico.js';
import { applicaColpo } from '../src/danno.js';

const { dati } = await datiReali();
const GRADO = gradoMorente(dati); // 6 = oltre Grave
const COS = 5;

/** Uno scontro di prova con un nemico (COS 5) e un PG, al Round e al turno indicati. */
function scontro({ round = 1, turno = 0, ferite = 0, cos = COS } = {}) {
  return {
    id: 'sc1', nome: 'Prova', round, turno, registro: [], colpi: [], durate: [], effetti: [],
    partecipanti: [
      { id: 'n1', tipo: 'nemico', nome: 'Bestione', lato: 'avversario', pv: { attuali: 0, massimo: 30 }, stati: [], ferite,
        scheda: { nome: 'Bestione', caratteristiche: cos === null ? { FOR: 8 } : { FOR: 8, COS: cos }, attacchi: [], capacita: [] } },
      { id: 'p1', tipo: 'pg', nome: 'Pablo', lato: 'alleato', chiave: 'Pablo-Zaion', stati: [] },
    ],
  };
}
const colpo = (danni = [30], tempra = ['fallimento']) => ({ danni, natura: 'Naturale', difesa: 'nessuna', proprieta: [], tempra });
const bersaglio = (p) => ({ nome: p.nome, pv: p.pv, ferite: p.ferite ?? 0, ar: { totale: 0, magica: 0 } });

test('A.164: i dati dicono che Morente vale per i nemici, con l’eccezione esplicita', () => {
  const M = dati.regole.ferite.morente;
  assert.equal(M.nemici.vale, true);
  assert.equal(M.nemici.campo_profilo, 'morente');
  assert.match(M.nemici._vale, /eccezioni esplicite della scheda/);
  assert.match(M.contatore.primo_decremento, /dopo un Round completo, alla stessa posizione d'Iniziativa/);
  assert.match(M.cos_mancante.avviso, /Non si ricava da Tempra o PV, non vale 0/);
});

test('A.164: il primo decremento è dopo un Round completo, alla stessa Iniziativa', () => {
  // ingresso al Round 3, quando tocca al quinto dell'ordine (turno 4)
  const m = apriMorente({ round: 3, turno: 4, cos: COS });
  assert.deepEqual(m, { dal: 3, turno: 4, iniziale: COS });
  assert.equal(roundTrascorsi(m, 3, 4), 0, 'appena entrato');
  assert.equal(roundTrascorsi(m, 3, 9), 0, 'più avanti nello stesso Round');
  assert.equal(roundTrascorsi(m, 4, 0), 0, 'Round nuovo, ma non è ancora il suo turno');
  assert.equal(roundTrascorsi(m, 4, 3), 0, 'il turno prima del suo');
  assert.equal(roundTrascorsi(m, 4, 4), 1, 'alla stessa posizione d’Iniziativa: un Round intero');
  assert.equal(roundTrascorsi(m, 5, 4), 2);
  assert.equal(roundRimasti(m, 4, 0), COS, 'prima della sua Iniziativa il contatore è ancora pieno');
  assert.equal(roundRimasti(m, 4, 4), COS - 1);
  // senza il turno (fuori scontro) si conta il cambio di Round, come prima
  assert.equal(roundRimasti({ dal: 3, iniziale: COS }, 4), COS - 1);
});

test('A.164: un nemico oltre Grave entra in Morente, con il contatore pieno', () => {
  const s = scontro({ round: 2, turno: 3, ferite: 5 });
  const p = s.partecipanti[0];
  const ris = applicaColpo(bersaglio(p), colpo(), dati);
  assert.equal(ris.morente, true, 'A.164: anche i nemici');
  assert.ok(ris.ferite.dopo > GRADO, 'il colpo produrrebbe Ferite in eccesso');
  const m = morenteDopoColpo(s, p, p.ferite, ris.ferite.dopo, dati);
  assert.deepEqual(m, { dal: 2, turno: 3, iniziale: COS }, 'le Ferite in eccesso del colpo d’ingresso non tolgono Round');
  const v = statoMorenteNemico({ ...p, morente: m }, { round: 2, turno: 3 }, dati);
  assert.equal(v.round, COS);
  assert.equal(v.cosMancante, false);
  assert.match(v.etichetta, /Morente — 5 Round/);
});

test('A.164: il colpo registra Morente, lo Stato e il gradino; ogni nuova Ferita toglie un Round', () => {
  const s = scontro({ round: 1, turno: 0, ferite: 5 });
  const p = s.partecipanti[0];
  const ris = applicaColpo(bersaglio(p), colpo(), dati);
  const dopo = colpoSuNemico(s, { id: 'n1', nome: p.nome, pv: p.pv, ferite: p.ferite }, ris, { ...colpo(), natura: 'Naturale' }, [], [], dati);
  const q = dopo.partecipanti[0];
  assert.equal(q.ferite, GRADO, 'il gradino si ferma a «oltre Grave»');
  assert.ok(q.stati.includes('svenuto'), 'sviene');
  assert.deepEqual(q.morente, { dal: 1, turno: 0, iniziale: COS });
  // un secondo colpo, già Morente: due nuove Ferite → due Round in meno
  const ris2 = applicaColpo({ ...bersaglio(q), ferite: q.ferite }, colpo([12], ['fallimento']), dati);
  const m2 = morenteDopoColpo(dopo, q, q.ferite, ris2.ferite.dopo, dati);
  const tolti = ris2.ferite.dopo - GRADO;
  assert.ok(tolti >= 1);
  assert.equal(roundRimasti(m2, 1, 0), COS - tolti);
});

test('A.164: «Stabilizza» torna a Grave e spegne il contatore; a 0 è un avviso', () => {
  let s = scontro({ round: 1, turno: 0, ferite: GRADO });
  s.partecipanti[0].morente = apriMorente({ round: 1, turno: 0, cos: COS });
  // a 0 Round: avviso, nessuna cancellazione del partecipante
  const finito = { ...s.partecipanti[0], morente: togliRound(s.partecipanti[0].morente, COS, dati) };
  const v = statoMorenteNemico(finito, { round: 1, turno: 0 }, dati);
  assert.equal(v.round, 0);
  assert.equal(v.morto, true);
  assert.match(v.avviso, /decide il master/);
  // «Stabilizza»
  const dopo = stabilizzaNemico(s, 'n1', dati);
  assert.equal(dopo.partecipanti[0].ferite, GRADO - 1, 'torna a Grave');
  assert.equal(dopo.partecipanti[0].morente, undefined, 'contatore spento');
  assert.equal(statoMorenteNemico(dopo.partecipanti[0], dopo, dati), null, 'un contatore spento non uccide');
  assert.match(dopo.registro.at(-1).testo, /stabilizzato/);
  // «−1 Round» a mano
  const meno = scalaMorenteNemico(s, 'n1', 1, dati);
  assert.equal(statoMorenteNemico(meno.partecipanti[0], meno, dati).round, COS - 1);
  assert.match(meno.registro.at(-1).testo, /−1 al contatore/);
});

test('A.164: senza COS l’app lo segnala, non la ricava e non dichiara morto nessuno', () => {
  const s = scontro({ round: 2, turno: 1, ferite: 5, cos: null });
  const p = s.partecipanti[0];
  const m = morenteDopoColpo(s, p, 5, 8, dati);
  assert.deepEqual(m, { dal: 2, turno: 1, iniziale: null }, 'il contatore si apre lo stesso, senza numero');
  const v = statoMorenteNemico({ ...p, morente: m }, { round: 2, turno: 1 }, dati);
  assert.equal(v.cosMancante, true);
  assert.equal(v.round, null, 'niente contatore finché manca la COS');
  assert.equal(v.morto, false, 'e nessuno muore per il dato mancante');
  assert.match(v.avviso, /inseriscila/);
  assert.match(v.etichetta, /COS da inserire/);
  // la COS arriva a scontro in corso: contano i Round già trascorsi dall'ingresso
  const conMorente = { ...s, partecipanti: [{ ...p, morente: m }, s.partecipanti[1]] };
  const avanti = { ...conMorente, round: 5, turno: 1 };
  const dopo = cosNemico(avanti, 'n1', COS, dati);
  const v2 = statoMorenteNemico(dopo.partecipanti[0], dopo, dati);
  assert.equal(v2.cosMancante, false);
  assert.equal(v2.trascorsi, 3, 'tre Round interi dall’ingresso');
  assert.equal(v2.round, COS - 3, 'il contatore non riparte da capo');
  assert.equal(dopo.partecipanti[0].scheda.caratteristiche.COS, COS, 'la COS resta nel profilo');
  assert.match(dopo.registro.at(-1).testo, /già trascorsi/);
});

test('A.164: le stesse precisazioni valgono per i PG (prompt 89)', () => {
  // il PG tiene il contatore nella sessione: stesso motore, stesse regole
  const m = apriMorente({ round: 4, turno: 2, cos: 7 });
  assert.equal(statoMorente({ morente: m, round: 4 }, dati, { turno: 2 }).round, 7);
  assert.equal(statoMorente({ morente: m, round: 5 }, dati, { turno: 1 }).round, 7, 'prima della sua Iniziativa');
  assert.equal(statoMorente({ morente: m, round: 5 }, dati, { turno: 2 }).round, 6);
  // COS mancante anche per un PG (scheda senza il dato): si chiede, non si deduce
  const senza = apriMorente({ round: 1, turno: 0, cos: null });
  const v = statoMorente({ morente: senza, round: 3 }, dati, { turno: 0 });
  assert.equal(v.cosMancante, true);
  assert.equal(v.morto, false);
  assert.equal(statoMorente({ morente: conCos(senza, 6), round: 3 }, dati, { turno: 0 }).round, 6 - 2, 'i Round già passati contano');
});
