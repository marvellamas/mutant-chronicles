import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nuoveScelte, applicaModifica, normalizza, anteprima, serializza, deserializza, deserializzaPersonaggio, FORMATO_FILE,
} from '../src/character.js';
import { statoIncantesimi, motivoBloccoIncantesimo } from '../src/incantesimi.js';
import { checklist } from '../src/checklist.js';
import { calcolaScheda } from '../src/calc.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

const MISHIMA_AGENTE = {
  ...nuoveScelte(),
  nome: 'Kenji',
  concetto: 'Agente Mishima',
  corporazione: 'Mishima',
  puntiCaratteristica: { FOR: 1, COS: 2, DES: 1, SAG: 1 },
  addestramento: 'Avventuriero',
  classe: 'Agente',
  puntiAbilitaLiberi: { 'Furtività': 2, 'Percezione': 2, 'Medicina': 1 },
  puntiEroe: { valore: 5, origine: 'manuale' },
};

const ARCANISTA = {
  ...nuoveScelte(),
  nome: 'Sorella Ada',
  concetto: 'Arcanista della Fratellanza',
  corporazione: 'Fratellanza', // INT 5
  puntiCaratteristica: { INT: 2, SAG: 1, COS: 2 },
  addestramento: 'Taumaturgo',
  classe: 'Arcanista',
  puntiAbilitaLiberi: { 'Potere': 2, 'Occultismo': 2, 'Cultura': 1 },
  puntiEroe: { valore: 6, origine: 'app' },
};

test('le scelte di esempio sono già coerenti: normalizza non cambia nulla', () => {
  for (const s of [MISHIMA_AGENTE, ARCANISTA, nuoveScelte()]) {
    const r = normalizza(s, dati);
    assert.deepEqual(r.avvisi, []);
    assert.deepEqual(r.scelte, s);
  }
});

test('decisione 6 del master: il tiro dei PM alla creazione sparisce dalle scelte e i PM si ricalcolano', () => {
  const salvato = { ...ARCANISTA, tiroDadoPM: { valore: 1, origine: 'manuale' } };
  const r = normalizza(salvato, dati);
  assert.deepEqual(r.avvisi, []);
  assert.equal('tiroDadoPM' in r.scelte, false);
  assert.deepEqual(r.scelte, ARCANISTA);
  assert.equal(calcolaScheda(r.scelte, dati).pm, 7 + 5 + 4); // dado massimizzato, non il vecchio 1
  // anche nel formato numerico più vecchio
  assert.equal('tiroDadoPM' in normalizza({ ...ARCANISTA, tiroDadoPM: 3 }, dati).scelte, false);
  assert.equal('tiroDadoPM' in nuoveScelte(), false);
});

// --- invalidazione a valle ----------------------------------------------------------------

test('cambio di Addestramento: la Classe viene azzerata con un avviso', () => {
  const r = applicaModifica(MISHIMA_AGENTE, { addestramento: 'Combattente' }, dati);
  assert.equal(r.scelte.classe, null);
  assert.equal(r.avvisi.length, 1);
  assert.match(r.avvisi[0], /Agente/);
  // senza Classe i punti liberi restano: si ricontrollano quando la Classe viene scelta
  assert.deepEqual(r.scelte.puntiAbilitaLiberi, MISHIMA_AGENTE.puntiAbilitaLiberi);
});

test('cambio di Addestramento da Taumaturgo: via Classe e incantesimi', () => {
  const conIncantesimi = { ...ARCANISTA, incantesimi: ['Colpo Elementale', 'Telecinesi'] };
  const r = applicaModifica(conIncantesimi, { addestramento: 'Studioso' }, dati);
  assert.equal(r.scelte.classe, null);
  assert.deepEqual(r.scelte.incantesimi, []);
  assert.ok(r.avvisi.some((a) => /incantesimi/.test(a)));
});

test('cambio di Corporazione: i Punti Caratteristica che superano 7 vengono ridotti', () => {
  // Mishima COS 4 +2 = 6; con Freelance COS parte da 6 e +2 darebbe 8 → ridotto a +1.
  const r = applicaModifica(MISHIMA_AGENTE, { corporazione: 'Freelance' }, dati);
  assert.equal(r.scelte.puntiCaratteristica.COS, 1);
  assert.ok(r.avvisi.some((a) => /^COS:/.test(a)));
});

test('cambio di Classe: i punti liberi che sforano l’Avanzamento 3 vengono ridotti', () => {
  // Medicina +3 liberi: va bene per l'Agente (non di Classe), non per il Paramedico (+1 di Classe).
  const s = { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Medicina': 3, 'Percezione': 2 } };
  assert.deepEqual(normalizza(s, dati).avvisi, []);
  const r = applicaModifica(s, { classe: 'Paramedico' }, dati);
  assert.equal(r.scelte.puntiAbilitaLiberi.Medicina, 2);
  assert.ok(r.avvisi.some((a) => /^Medicina: punti liberi ridotti da 3 a 2/.test(a)));
});

test('cambio di Corporazione: punti liberi su un’Abilità che scende sotto VA 1 vengono tolti', () => {
  // Combattente Soldato: Rituali ha base 0. Con Cybertronic (INT 6, Mod +1) il VA è 1 e il punto
  // libero è ammesso; con Capitol (INT 5) il VA scende a 0 e il punto va tolto.
  const s = {
    ...nuoveScelte(), corporazione: 'Cybertronic', puntiCaratteristica: { FOR: 1, DES: 2, SAG: 2 },
    addestramento: 'Combattente', classe: 'Soldato',
    puntiAbilitaLiberi: { 'Rituali': 1, 'Difese': 2, 'Percezione': 2 },
  };
  assert.deepEqual(normalizza(s, dati).avvisi, []);
  const r = applicaModifica(s, { corporazione: 'Capitol' }, dati);
  assert.equal(r.scelte.puntiAbilitaLiberi.Rituali, undefined);
  assert.ok(r.avvisi.some((a) => /^Rituali:.*VA 0/.test(a)));
});

test('meno INT: gli incantesimi oltre la nuova quota vengono tolti, a partire dagli ultimi in eccesso', () => {
  const st = statoIncantesimi(ARCANISTA, dati);
  assert.equal(st.liberi, 4); // 2 + Mod INT 2
  assert.equal(st.totale, 13); // 3 + 3 + 3 di Classe + 4 liberi
  // 3 Mentali di quota + 4 liberi tutti Mentali
  const mentali = dati.incantesimi.incantesimi.filter((i) => i.macrofamiglia === 'Mentale' && i.livello_base <= 3).map((i) => i.nome).slice(0, 7);
  const s = { ...ARCANISTA, incantesimi: mentali };
  assert.deepEqual(normalizza(s, dati).avvisi, []);
  const r = applicaModifica(s, { puntiCaratteristica: { SAG: 1, COS: 2, DES: 2 } }, dati); // INT 5 → 2 liberi
  assert.deepEqual(r.scelte.incantesimi, mentali.slice(0, 5));
  assert.ok(r.avvisi.some((a) => /Quote incantesimi superate/.test(a)));
});

test('riferimenti che non esistono più nei dati vengono azzerati', () => {
  const r = normalizza({ ...MISHIMA_AGENTE, corporazione: 'Atlantide', incantesimi: ['Palla di Fuoco'] }, dati);
  assert.equal(r.scelte.corporazione, null);
  assert.ok(r.avvisi.some((a) => /Atlantide/.test(a)));
  assert.deepEqual(r.scelte.incantesimi, []);
});

// --- incantesimi e checklist --------------------------------------------------------------

test('incantesimi: livello base oltre 3 e quote esaurite sono bloccati con un motivo', () => {
  const st = statoIncantesimi(ARCANISTA, dati);
  const alto = dati.incantesimi.incantesimi.find((i) => i.livello_base === 6);
  assert.match(motivoBloccoIncantesimo(alto, st, ARCANISTA), /Livello base 6/);
  const basso = dati.incantesimi.incantesimi.find((i) => i.livello_base === 1);
  assert.equal(motivoBloccoIncantesimo(basso, st, ARCANISTA), null);
  assert.equal(statoIncantesimi(MISHIMA_AGENTE, dati), null);
});

test('checklist §2.17: tutto spuntato per un personaggio completo', () => {
  const c = checklist(MISHIMA_AGENTE, dati);
  assert.equal(c.length, 10);
  assert.deepEqual(c.filter((x) => !x.ok).map((x) => x.testo), []);
  const vuota = checklist(nuoveScelte(), dati);
  assert.ok(vuota.filter((x) => !x.ok).length >= 8);
  // Arcanista senza incantesimi: la voce incantesimi non è spuntata
  assert.equal(checklist(ARCANISTA, dati).find((x) => /Incantesimi/.test(x.testo)).ok, false);
});

test('anteprima: valori parziali durante il wizard', () => {
  const a = anteprima({ ...nuoveScelte(), corporazione: 'Mishima' }, dati);
  assert.equal(a.caratteristiche.DES.valore, 6);
  assert.equal(a.salvezze, null);
  assert.equal(a.pv, null);
  assert.equal(a.puntiCaratteristicaRimasti, 5);
  const completa = anteprima(MISHIMA_AGENTE, dati);
  const scheda = calcolaScheda(MISHIMA_AGENTE, dati);
  assert.equal(completa.pv, scheda.pv);
  assert.equal(completa.pm, scheda.pm);
  assert.equal(completa.iniziativa, scheda.iniziativa);
  for (const id of Object.keys(scheda.salvezze)) assert.equal(completa.salvezze[id].totale, scheda.salvezze[id].totale);
});

// --- serializzazione ----------------------------------------------------------------------

test('serializza → deserializza restituisce le stesse scelte', () => {
  for (const s of [MISHIMA_AGENTE, ARCANISTA, nuoveScelte()]) {
    const testo = serializza(s, { versioniDati: { classi: 'Giocatore 0.43' } });
    const obj = JSON.parse(testo);
    assert.equal(obj.formato, FORMATO_FILE);
    assert.equal(obj.versioni_dati.classi, 'Giocatore 0.43');
    assert.deepEqual(deserializza(testo), s);
  }
});

test('il file contiene solo le scelte, mai valori calcolati', () => {
  const obj = JSON.parse(serializza({ ...MISHIMA_AGENTE, pv: 99, abilita: [] }));
  assert.deepEqual(Object.keys(obj.scelte).sort(), Object.keys(nuoveScelte()).sort());
});

test('deserializza: errori leggibili su file non validi', () => {
  assert.throws(() => deserializza('non è json'), /JSON valido/);
  assert.throws(() => deserializza('[1,2]'), /non contiene un personaggio/);
  assert.throws(() => deserializza('{"formato":"altro","scelte":{}}'), /Formato "altro"/);
  assert.throws(() => deserializza(`{"formato":"${FORMATO_FILE}","versione":99,"scelte":{"nome":"x"}}`), /più recente/);
  assert.throws(() => deserializza('{"pippo":1}'), /non contiene le scelte/);
});

test('import: scelte grezze senza involucro sono accettate e poi normalizzate', () => {
  const grezze = deserializza(JSON.stringify({ corporazione: 'Mishima', classe: 'Soldato', addestramento: 'Avventuriero' }));
  const r = normalizza(grezze, dati);
  assert.equal(r.scelte.corporazione, 'Mishima');
  assert.equal(r.scelte.classe, null);
  assert.equal(r.avvisi.length, 1);
});

test('serializza con i livelli → deserializzaPersonaggio restituisce creazione e livelli', () => {
  const livelli = [{ livello: 2, caratteristiche: { DES: 2 } }, { livello: 3, talentoLibero: { id: 'sempre-allerta' } }];
  const testo = serializza(MISHIMA_AGENTE, { livelli });
  const obj = JSON.parse(testo);
  assert.equal(obj.versione, 3);
  assert.deepEqual(obj.livelli, livelli);
  assert.deepEqual(deserializzaPersonaggio(testo), { creazione: deserializza(testo), livelli });
  // al 1° livello il file non ha "livelli"; i file vecchi si leggono con livelli vuoti
  assert.equal('livelli' in JSON.parse(serializza(MISHIMA_AGENTE, { livelli: [] })), false);
  assert.deepEqual(deserializzaPersonaggio(JSON.stringify(MISHIMA_AGENTE)).livelli, []);
  assert.throws(() => deserializzaPersonaggio(JSON.stringify({ formato: FORMATO_FILE, versione: 3, scelte: MISHIMA_AGENTE, livelli: 'x' })), /livelli/);
});
