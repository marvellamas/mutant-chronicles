// Lotto 179, A.247 (Davide, 06/11/2026): «Se il Direttore, dopo l'avviso del sistema, forza deliberatamente
// l'assegnazione di un punto oltre il limite, il VA dell'Abilità aumenta realmente oltre il limite. L'operazione deve
// essere registrata come eccezione esplicita.» Prima (lotto 165) il punto restava registrato e il VA si fermava al
// limite: il contrario.
//
// A.248: «I punti che diventano inefficaci in seguito a una modifica forzata del Direttore possono essere riassegnati
// dal giocatore nello stesso livello originario, rispettando le normali regole di assegnazione. La riassegnazione va
// registrata.»
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, LIVELLI_AGENTE } from './personaggi.js';
import { calcolaScheda } from '../src/calc.js';
import { calcolaSchedaPersonaggio, statoCompletamento, puntiDaCompletare, applicaCompletamento } from '../src/avanzamento.js';
import { limiteConEccezioni, oltreIlLimite, vaPersonale } from '../src/competenze.js';
import { applicaSpostamento, descriviSpostamento, descriviEccezioni, descriviRiassegnazione, avvisiSpostamento, statoPannello } from '../src/sposta-punti.js';
import { applicaCorrezione, validaCompletamento } from '../src/avanzamento.js';
import { tiro } from './personaggi.js';
import { contoVa } from '../src/scheda-vista.js';
import { righeRegoleAbilita } from '../src/provenienza.js';
import { preparaStampa } from '../src/stampa.js';

const { dati } = await datiReali();

// la creazione del manuale: Furtività è al limite Professionale del I Grado (VA 9)
const CREAZIONE = { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { Percezione: 2, Tecnologia: 1, Cultura: 1, Raggirare: 2, 'Furtività': 1 } };
const FORZATA = { ...CREAZIONE, puntiDirettore: { quando: '2026-11-07T10:00:00.000Z', motivo: 'eccezione di prova', forzati: ['Furtività'] } };
const ab = (scheda, nome) => scheda.abilita.find((a) => a.nome === nome);

test('la regola, da sola: il limite sale delle unità concesse, e solo di quelle', () => {
  assert.equal(limiteConEccezioni(9, 1), 10);
  assert.equal(limiteConEccezioni(9, 0), 9);
  assert.equal(limiteConEccezioni(null, 3), null, 'senza limite non c’è niente da alzare');
  assert.equal(vaPersonale(10, limiteConEccezioni(9, 1)), 10);
  assert.equal(vaPersonale(12, limiteConEccezioni(9, 1)), 10, 'solo le unità concesse, non tutto il grezzo');
  // quante unità concede una forzatura: quanto passa il limite, meno quanto lo passava già
  assert.equal(oltreIlLimite(9, 9, 1), 1);
  assert.equal(oltreIlLimite(7, 9, 1), 0, 'sotto il limite non è un’eccezione');
  assert.equal(oltreIlLimite(10, 9, 1), 1, 'con un’eccezione già concessa non si conta due volte');
});

test('creazione: il punto forzato fa salire il VA oltre il limite', () => {
  const senza = ab(calcolaScheda({ creazione: CREAZIONE, livelli: [] }, dati), 'Furtività');
  assert.deepEqual([senza.totale, senza.limite, senza.liberi, senza.oltreLimite ?? 0], [9, 9, 0, 0], 'prima il punto non contava');
  const con = ab(calcolaScheda({ creazione: FORZATA, livelli: [] }, dati), 'Furtività');
  assert.deepEqual([con.totale, con.limite, con.liberi, con.oltreLimite], [10, 9, 1, 1], 'ora il VA è 10 con il limite 9');
});

test('livello: il punto forzato in un livello vale, e non vale per gli altri punti', () => {
  const livelli = LIVELLI_AGENTE.slice(0, 3);
  const quarto = (extra) => livelli.map((v) => (v.livello === 4 ? { ...v, puntiAbilita: { ...v.puntiAbilita, Atletica: 3 }, ...extra } : v));
  const senza = ab(calcolaSchedaPersonaggio({ creazione: MISHIMA_AGENTE, livelli: quarto({}) }, dati), 'Atletica');
  assert.deepEqual([senza.totale, senza.limite, senza.oltreLimite ?? 0], [9, 9, 0]);
  const forz = { puntiDirettore: { quando: '2026-11-07T10:00:00.000Z', forzati: ['Atletica'] } };
  const con = ab(calcolaSchedaPersonaggio({ creazione: MISHIMA_AGENTE, livelli: quarto(forz) }, dati), 'Atletica');
  assert.deepEqual([con.totale, con.limite, con.oltreLimite], [10, 9, 1]);
  // un'altra Abilità dello stesso livello, non forzata, resta al limite
  const altra = ab(calcolaSchedaPersonaggio({ creazione: MISHIMA_AGENTE, livelli: quarto(forz) }, dati), 'Sopravvivenza');
  assert.equal(altra.totale, Math.min(altra.grezzo, altra.limite), 'il limite vale ancora per tutti gli altri');
});

test('il VA oltre il limite arriva in tutti i posti dove si legge, non solo dove è stato scritto', () => {
  const pg = { creazione: FORZATA, livelli: [] };
  const scheda = calcolaScheda(pg, dati);
  const a = ab(scheda, 'Furtività');
  assert.equal(a.totale, 10);
  // 1) il conto del VA della finestrella «Calcolo»: non è «limitato», e lo dice
  const c = contoVa({ ...a, equip: 0, effettivo: a.totale, scomposizione: [] });
  assert.equal(c.limitato, false, 'il VA non è tagliato');
  assert.deepEqual([c.limite, c.limiteVero, c.oltreLimite], [9, 10, 1]);
  // 2) la provenienza (tooltip della scheda e della stampa): la riga dell'eccezione c'è e i conti tornano
  const righe = righeRegoleAbilita(a, scheda);
  assert.ok(righe.some((r) => /Eccezione del Direttore/.test(r.fonte)), JSON.stringify(righe));
  assert.ok(!righe.some((r) => /^Limite/.test(r.fonte)), 'niente riga che riporta al limite: il VA ci passa');
  // 3) la stampa (foglio 2) porta il valore vero e il segno dell'eccezione
  const st = preparaStampa(pg, dati);
  const riga = st.fogli.find((f) => f.id === 'abilita').dati.categorie.flatMap((x) => x.abilita).find((x) => x.nome === 'Furtività');
  assert.equal(riga.va, 10, 'nella stampa il VA è quello vero');
  assert.equal(riga.oltreLimite, 1, 'e la stampa sa che è un’eccezione');
  // 4) le Prove: il VA effettivo parte da quello vero
  assert.equal(a.effettivo ?? a.totale, 10);
});

test('l’eccezione lascia la sua riga, con Abilità, evento, da che VA a che VA e limite', () => {
  const senzaPunto = { ...CREAZIONE, puntiAbilitaLiberi: { Percezione: 2, Tecnologia: 1, Cultura: 1, Raggirare: 3 } };
  const prima = { creazione: senzaPunto, livelli: [] };
  const bozza = { 1: { Percezione: 2, Tecnologia: 1, Cultura: 1, Raggirare: 2, 'Furtività': 1 } };
  const dopo = applicaSpostamento(prima, bozza, dati, { quando: '2026-11-07T10:00:00.000Z', motivo: 'eccezione di prova', forzati: { 1: ['Furtività'] } });
  const righe = descriviEccezioni(prima, dopo, dati, { quando: '2026-11-07T10:00:00.000Z', dove: 'PC' });
  assert.equal(righe.length, 1, JSON.stringify(righe));
  const r = righe[0];
  assert.match(r, /Eccezione al limite \(A\.247\)/);
  assert.match(r, /Furtività/);
  assert.match(r, /nella creazione/);
  assert.match(r, /da VA 9 a VA 10/);
  assert.match(r, /oltre il limite 9/);
  assert.match(r, /forzata da il Direttore|forzata dal? Direttore/);
  assert.match(r, /\(PC, 07\/11 \d\d:\d\d\)/);
  // non è la riga generica dello spostamento
  assert.ok(!/Spostat/.test(r));
  // e senza forzature non si scrive niente
  assert.deepEqual(descriviEccezioni(prima, applicaSpostamento(prima, bozza, dati, {}), dati, {}), []);
});

test('la riga dell’eccezione non si ripete a ogni conferma successiva', () => {
  const senzaPunto = { ...CREAZIONE, puntiAbilitaLiberi: { Percezione: 2, Tecnologia: 1, Cultura: 1, Raggirare: 3 } };
  const prima = { creazione: senzaPunto, livelli: [] };
  const bozza = { 1: { Percezione: 2, Tecnologia: 1, Cultura: 1, Raggirare: 2, 'Furtività': 1 } };
  const dopo = applicaSpostamento(prima, bozza, dati, { quando: '2026-11-07T10:00:00.000Z', forzati: { 1: ['Furtività'] } });
  assert.equal(descriviEccezioni(prima, dopo, dati, {}).length, 1);
  // una conferma che non cambia niente: nessuna riga nuova
  assert.deepEqual(descriviEccezioni(dopo, dopo, dati, {}), []);
});

test('A.248: i punti divenuti inefficaci si riassegnano nello stesso livello, con le regole normali', () => {
  // il caso vero: il Direttore corregge un livello passato e un punto di un livello dopo non aumenta più il VA (A.107)
  const QUARTO = { 'Tecnologia': 3, 'Medicina': 2, 'Sopravvivenza': 2 };
  const pg = {
    creazione: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { Percezione: 2, Tecnologia: 1, Cultura: 1, Raggirare: 3 } },
    livelli: [
      { livello: 2, caratteristiche: { DES: 2 } },
      { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
      { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: QUARTO },
      { livello: 5, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
    ],
  };
  // al 2° livello INT +2 al posto di DES +2: il punto di Tecnologia del 4° non aumenta più il VA
  const c = applicaCorrezione(pg, 2, { caratteristiche: { INT: 2 } });
  const da = puntiDaCompletare(c, dati);
  assert.deepEqual(da.map((x) => [x.livello, x.mancanti, x.inattivi, x.riassegna]), [[4, 1, { 'Tecnologia': 1 }, true]],
    'un punto da riassegnare, nel 4° livello: lo stesso in cui era stato speso');
  // le regole normali valgono: non si rimettono dove non contano
  assert.ok(validaCompletamento(c, 4, { 'Tecnologia': 1 }, dati).some((e) => e.tipo === 'violazione'), 'non si rimettono dove non contano');
  assert.deepEqual(validaCompletamento(c, 4, { 'Atletica': 1 }, dati), []);
  // riassegnati: restano nel loro livello e non c'è più niente da fare
  const ok = applicaCompletamento(c, 4, { 'Atletica': 1 }, da[0].inattivi);
  assert.equal(ok.livelli[2].puntiAbilita['Atletica'], 1, 'il punto riassegnato resta nel 4° livello');
  assert.equal(ok.livelli[2].puntiAbilita['Tecnologia'], 2, 'e quello inefficace è uscito da lì');
  assert.deepEqual(puntiDaCompletare(ok, dati), []);
});

test('A.248: la riassegnazione lascia la sua riga, con quanti punti, dove e chi', () => {
  assert.equal(descriviRiassegnazione({ livello: 4, riassegna: true }, { Cultura: 1 }),
    'Riassegnati 1 Punto Abilità del 4° livello: Cultura 1');
  assert.equal(descriviRiassegnazione({ livello: 4, riassegna: true }, { Cultura: 1, Atletica: 2 }),
    'Riassegnati 3 Punti Abilità del 4° livello: Atletica 2, Cultura 1');
  assert.equal(descriviRiassegnazione({ livello: 1, riassegna: false }, { Cultura: 1 }),
    'Assegnati 1 Punto Abilità della creazione: Cultura 1');
  assert.equal(descriviRiassegnazione({ livello: 4, riassegna: true }, {}), '', 'senza punti nessuna riga');
  // chi e quando li aggiunge chi scrive nello storico (rigaIncantesimi): «(tablet, 07/11 18:20)»
});

test('un’Abilità forzata non chiede di riassegnare i suoi punti (sono un’eccezione, non un errore)', () => {
  const livelli = LIVELLI_AGENTE.slice(0, 3).map((v) => (v.livello === 4
    ? { ...v, puntiAbilita: { ...v.puntiAbilita, Atletica: 3 }, puntiDirettore: { quando: '2026-11-07T10:00:00.000Z', forzati: ['Atletica'] } }
    : v));
  const pg = { creazione: MISHIMA_AGENTE, livelli };
  assert.deepEqual(puntiDaCompletare(pg, dati), [], 'niente da riassegnare');
  assert.equal(ab(calcolaSchedaPersonaggio(pg, dati), 'Atletica').totale, 10);
});

test('il pannello avvisa prima di forzare: l’avviso resta, non è un clic distratto', () => {
  const pg = { creazione: CREAZIONE, livelli: [] };
  const bozza = { 1: { ...CREAZIONE.puntiAbilitaLiberi, 'Furtività': 2 } };
  const avvisi = avvisiSpostamento(pg, bozza, dati);
  assert.ok(avvisi.some((a) => a.tipo === 'limite' && a.abilita === 'Furtività'), JSON.stringify(avvisi));
  assert.match(avvisi.find((a) => a.tipo === 'limite').testo, /limite/);
  // e il pannello mostra il VA prima → dopo con l'eccezione già applicata
  const st = statoPannello(pg, bozza, 1, dati);
  const riga = st.righe.find((r) => r.nome === 'Furtività');
  assert.ok(riga, 'la riga di Furtività c’è');
});
