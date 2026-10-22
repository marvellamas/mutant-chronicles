// La classificazione dei campi (22/10/2026, «prima la classificazione, perché è lì che si fa il danno
// silenzioso»). Due garanzie, e sono il motivo per cui questo file esiste:
//   1. ogni campo numerico del modello di un personaggio è classificato — contatore (si somma) o assegnazione
//      dichiarata (si sostituisce). Un campo numerico nuovo, aggiunto senza deciderlo, fa fallire questo test;
//   2. un campo non classificato si comporta comunque da assegnazione (il default sicuro): sbagliare in questa
//      direzione produce una domanda in più al Direttore, mai una Caratteristica falsa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CONTATORI, ASSEGNA_DICHIARATI, campiNonClassificati, tipoCampo } from '../src/giornale.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { normalizzaCalendario } from '../src/calendario.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const cartellaEsempi = new URL('../esempi/', import.meta.url);

function statoDi(nomeFile) {
  const testo = readFileSync(new URL(nomeFile, cartellaEsempi), 'utf8');
  const p = deserializzaPersonaggio(testo);
  const { scelte } = normalizza(p.creazione, dati);
  const scheda = calcolaScheda({ creazione: scelte, livelli: p.livelli }, dati);
  const sessione = allineaSessione(p.sessione, massimiSessione(scheda, scelte, dati));
  return { scelte, sessione, calendario: normalizzaCalendario(p.calendario, dati) };
}

test('ogni campo numerico dei personaggi d\'esempio è classificato', () => {
  const esempi = readdirSync(cartellaEsempi).filter((f) => f.endsWith('.json'));
  assert.ok(esempi.length >= 3, 'servono dei personaggi d\'esempio da controllare');
  const fuori = new Set();
  for (const f of esempi) for (const c of campiNonClassificati(statoDi(f))) fuori.add(`${c} (${f})`);
  assert.deepEqual([...fuori], [], `Campi numerici non classificati: decidi in src/giornale.js se sono contatori (CONTATORI) o assegnazioni (ASSEGNA_DICHIARATI).\n${[...fuori].join('\n')}`);
});

/**
 * Una sessione con TUTTI i blocchi facoltativi pieni: nei personaggi d'esempio molti non ci sono (si scrivono
 * solo quando servono, src/sessione.js), ma al tavolo compaiono tutti. Ogni numero che c'è qui dentro deve
 * essere classificato: è questo il controllo che impedisce di aggiungere un campo numerico senza deciderlo.
 */
const SESSIONE_COMPLETA = {
  pvAttuali: 12, pmAttuali: 4, puntiEroe: 3, distintivi: 2, crediti: 450, creditiIniziali: 1000,
  ferite: 3, affaticamento: 2, corruzione: 1, caricoExtra: 7.5, round: 6,
  statiAttivi: ['Sanguinamento'], intensitaStati: { Ammalato: 4 },
  munizioni: { 'uid-1': { colpi: 4, riserve: 2, parziali: [3, 3], vuoti: 1, tipo: 'uid-gran' } },
  scorte: { 'uid-mun': 12 }, carichini: { 'uid-car': [6, 3] },
  chroma: { 'uid-bat': { pmAttuali: 3, iniziale: 5 } },
  integrita: { 'uid-arma': 2 }, nec: { 'cella-lx': 80 },
  impianti: { cartucce: { 'uid-iniettore': 2 }, processore: { attivo: 'uid-chip', usato: true } },
  morente: { dal: 4, turno: 2, iniziale: 7, tolti: 1 },
  attivazioniArmi: { 'uid-cyber': { dal: 3, round: 15 } },
  contenitori: { 'uid-custodia': { chiuso: true, riposto: true } },
  ultimaTecnica: { id: 'silenzio-mentale', round: 5 },
  tecnicheAttive: [{ id: 'aura-di-resistenza', dal: 4, al: 9 }],
  incantesimiAttivi: [{ id: 'scudo', dal: 3, al: 8 }],
  circostanze: [{ id: 'c1', valore: 2, categorie: ['attacco'], nota: 'in copertura' }],
  caratteristicheTemporanee: [{ sigla: 'FOR', valore: -2, numero: 3, unita: 'round', dal: 4, al: 6 }],
  storico: [{ quando: '2026-10-22T20:00:00.000Z', testo: 'procedi comunque: …' }],
  tiri: [{ quando: '2026-10-22T20:01:00.000Z', testo: 'Furtività', naturale: 14 }],
  attacchi: { 'uid-arma': { modalita: 'mirato', distanza: 8, altro: ['copertura'] } },
  lanci: { 'Dardo Mistico': { potere: 3, anticipazione: 2 } },
  condizioniArmi: { 'uid-arma': 'danneggiata' },
  condizioniOggetti: ['uid-corredo'], talentiAccesi: ['t1'], bonusTalenti: false,
  vistaAbilita: { Percezione: false }, luce: 'penombra', luceVisione: true, note: 'niente',
};

test('ogni campo numerico dei blocchi facoltativi della sessione è classificato', () => {
  const fuori = campiNonClassificati({ sessione: SESSIONE_COMPLETA });
  assert.deepEqual(fuori, [], `Campi numerici non classificati in src/giornale.js:\n${fuori.join('\n')}`);
});

test('un campo numerico nuovo e non classificato fa fallire il controllo (è il senso di questo file)', () => {
  const fuori = campiNonClassificati({ sessione: { pvAttuali: 10, ferite: 2, campoNuovoDiDomani: 3 } });
  assert.deepEqual(fuori, ['sessione.campoNuovoDiDomani']);
  // e nel frattempo si comporta da assegnazione, non da somma: il default sicuro
  assert.equal(tipoCampo(['sessione', 'campoNuovoDiDomani'], 3), 'assegna');
});

test('i due registri non si sovrappongono e non hanno doppioni', () => {
  const tutti = [...CONTATORI, ...ASSEGNA_DICHIARATI];
  assert.equal(new Set(tutti).size, tutti.length, 'un percorso compare due volte nei registri');
  for (const c of CONTATORI) assert.ok(!ASSEGNA_DICHIARATI.includes(c), `${c} è dichiarato sia contatore sia assegnazione`);
});

test('i contatori sono quelli che al tavolo si sommano davvero (PV, PM, crediti, munizioni, PI, NEC…)', () => {
  // non un elenco a caso: ciascuno è un valore che cambia «di quanto», non «a quanto»
  for (const [percorso, atteso] of [
    [['sessione', 'pvAttuali'], 'somma'],
    [['sessione', 'pmAttuali'], 'somma'],
    [['sessione', 'crediti'], 'somma'],
    [['sessione', 'puntiEroe'], 'somma'],
    [['sessione', 'distintivi'], 'somma'],
    [['sessione', 'scorte', 'uid-x'], 'somma'],
    [['sessione', 'chroma', 'uid-x', 'pmAttuali'], 'somma'],
    [['sessione', 'nec', 'cella'], 'somma'],
    [['sessione', 'impianti', 'cartucce', 'uid-x'], 'somma'],
  ]) assert.equal(tipoCampo(percorso, 1), atteso, percorso.join('.'));
});
