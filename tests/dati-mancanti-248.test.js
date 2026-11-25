import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 248 — UN DATO CHE MANCA NON FERMA IL GIOCO.
//
// Il gruppo D del registro dei blocchi sono le impotenze: l'app ferma perché le manca un dato, non perché giudichi
// una scelta. Lunedì 22/11 il gioco si è fermato per un dato che non tornava, e un blocco di questa classe può
// essere un nostro difetto: quindi dice che cosa manca, coi nomi e i numeri, e lascia passare.
//
// Questo file è la guardia delle liberazioni del 248, nella stessa forma del 247 (`pulsanti-che-non-fingono-247`):
//   1. il comando fa quello che promette (non è un pulsante che finge);
//   2. l'avviso dice che cosa manca, con la chiave del file e il numero;
//   3. quello che è stato fatto resta scritto dove il Direttore lo legge;
//   4. il «no» resta solo dove passare non produrrebbe niente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { apriRaccolta, chiudiRaccolta, conRipiego, chiavePiuVicina, fasciaPiuVicina } from '../src/dati-mancanti.js';
import { modOrdinario, bonusAvanzamentoSalvezze } from '../src/calc.js';
import { permessoSalita } from '../src/livello-px.js';
import { dadoIniziativa, registraDurata, nuovoScontro } from '../src/scontro.js';
import { muoviVeicolo } from '../src/veicoli-registro.js';
import { decolla, atterra } from '../src/volo-veicolo.js';

const { dati } = await datiReali();
const leggi = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

// --------------------------------------------------------------------------- 1. le righe che mancano nelle tabelle
test('una riga che manca si surroga con la più vicina, E LO DICHIARA (mai in silenzio)', () => {
  apriRaccolta();
  const m = modOrdinario(11, dati.caratteristiche.modificatore_ordinario);
  const righe = chiudiRaccolta();
  assert.equal(m, 5, 'la riga più vicina (il valore 10) invece di un errore');
  assert.equal(righe.length, 1, 'il ripiego non è silenzioso: principio 3, nessun numero cambia senza dirlo');
  assert.match(righe[0].testo, /caratteristiche\.json/, 'la chiave del file, come vuole il principio 2');
  assert.match(righe[0].testo, /11/, 'il valore che non c’è');
  assert.match(righe[0].testo, /Controllalo tu/, 'chi decide è il Direttore');
});

test('un livello fuori dalle fasce non ferma il calcolo della scheda', () => {
  apriRaccolta();
  const b = bonusAvanzamentoSalvezze(25, dati.regole);
  const righe = chiudiRaccolta();
  assert.ok(Number.isInteger(b), 'un numero, non un errore');
  assert.equal(righe.length, 1);
  assert.match(righe[0].testo, /salvezze\.avanzamento_per_livello/);
});

test('senza nessuna riga in tabella il ripiego non si inventa: lì il «no» resta', () => {
  // è il confine della liberazione: con la tabella vuota non c'è nessun valore da cui ripiegare
  assert.equal(chiavePiuVicina({}, 7), null);
  assert.equal(fasciaPiuVicina([], 7), null);
  assert.throws(() => modOrdinario(3, {}), RangeError);
});

test('fuori da una raccolta il ripiego vale e non si accumula niente', () => {
  const prima = chiudiRaccolta(); // nessuna raccolta aperta
  conRipiego({ dato: 'una prova', chiave: 'x.json → y', valore: 1, ripiego: 0 });
  assert.deepEqual(chiudiRaccolta(), prima);
});

test('la scheda porta con sé le righe mancanti, e la pagina le scrive in cima', () => {
  assert.match(leggi('ui/tab.js'), /avvisoDatiMancanti\(tab\.scheda\)/, 'l’avviso è in cima a ogni tab');
  assert.match(leggi('ui/tab.js'), /scheda\?\.datiMancanti \?\? \[\]/);
});

// --------------------------------------------------------------------------- 2. «Sali al livello N»
test('un livello fuori dalla tabella dei PX non spegne «Sali»: avvisa e passa', () => {
  const p = { ...dati.px_partita, soglie_px: [100, 200] };
  const g = permessoSalita({ livello: 9, px: 999, atto: null }, p);
  assert.equal(g.ok, true, 'non è un giudizio su una scelta: è una riga che manca nei dati');
  assert.equal(g.motivo, null, 'niente motivo: il motivo spegne il pulsante');
  assert.match(g.avviso, /px_partita\.json/, 'l’avviso dice quale riga manca');
  assert.equal(g.datoMancante, true);
  // e l'avviso arriva davvero al pulsante (nella pagina «Sali» si spegne solo con `motivoNoSalita`)
  assert.match(leggi('ui/app.js'), /permessoPx\(\)\?\.avviso/, 'l’avviso di permessoSalita entra in avvisoSalita');
});

// --------------------------------------------------------------------------- 3. il dado dell'Iniziativa
test('senza il dado nei dati la plancia si disegna, e il «Tira con l’app» non c’è', () => {
  const senzaDado = { ...dati, regole: { ...dati.regole, iniziativa: { ...dati.regole.iniziativa, dado_in_combattimento: null } } };
  const d = dadoIniziativa(senzaDado);
  assert.equal(d.mancante, true);
  assert.match(d.motivo, /iniziativa\.dado_in_combattimento/, 'dice la chiave che manca');
  assert.match(d.motivo, /a mano/, 'e che cosa fare adesso');
  assert.notEqual(dadoIniziativa(dati).mancante, true, 'con i dati veri il dado c’è');
  // il pulsante che tirerebbe 0 non si disegna: un pulsante che finge è peggio di uno spento (lotto 244)
  const quanti = (leggi('ui/scontro.js').match(/dado\.mancante/g) ?? []).length;
  assert.ok(quanti >= 5, `i «Tira con l’app» guardati sono ${quanti}, ne servono almeno 5`);
});

// --------------------------------------------------------------------------- 4. la durata di uno Stato
test('uno Stato con durata non in Round si registra col numero scritto a mano, e la riga lo dice', () => {
  const s = { ...nuovoScontro({ id: 'sc1', pg: [] }), partecipanti: [{ id: 'p1', nome: 'BOTHA', lato: 'alleati' }], durate: [], round: 2 };
  const stato = { id: 'avvelenato', nome: 'Avvelenato', durata: 'finché non viene curato' };
  const dopo = registraDurata(s, 'p1', stato, { valore: 3, origine: 'mano' }, new Date('2026-11-25T10:00:00Z'), dati);
  const d = dopo.durate.find((x) => x.stato === 'avvelenato');
  assert.ok(d, 'il contatore c’è: il comando fa quello che promette');
  assert.match(dopo.registro.at(-1).testo, /durata non in Round nei dati/, 'il Direttore legge da dove viene il numero');
  assert.deepEqual(d.avvisi, ['i dati danno «finché non viene curato», non Round: 3 scritti a mano']);
  // senza il numero non c'è niente da registrare, e lì il «no» resta
  assert.throws(() => registraDurata(s, 'p1', stato, null, undefined, dati), /scrivi tu quanti Round/);
});

// --------------------------------------------------------------------------- 5. i veicoli
const recVeicolo = (extra = {}) => ({ id: 'vei1', revisione: 1, mezzo: { uid: 'u1', nome: 'FIAT LUX', rif: 'veicoli:asa-scout-mk4', andatura: 'controllata' }, conducente: null, ...extra });

test('un mezzo senza conducente e senza scontro si muove lo stesso, e il record dice perché', () => {
  const rec = recVeicolo();
  assert.throws(() => muoviVeicolo(rec, null, null), /nessuno scontro aperto/, 'senza «forza» resta un errore per chi chiama');
  const dopo = muoviVeicolo(rec, null, null, { forza: true });
  assert.notDeepEqual(dopo.movimento, rec.movimento, 'qualcosa è cambiato: non è un pulsante che finge');
  assert.equal(dopo.movimento.scontro, null);
  assert.equal(dopo.movimento.da, null);
  assert.match(dopo.movimento.avviso, /nessuno scontro aperto/, 'il motivo resta scritto nel record');
  // e nella carta della plancia il pulsante non è più spento
  assert.doesNotMatch(leggi('ui/veicoli.js'), /disabled: !rec\.conducente/, '«Muovi» non si spegne più senza conducente');
});

test('«Decolla comunque» e «Atterra comunque» fanno la cosa e scrivono il motivo', () => {
  const mezzo = { uid: 'u2', nome: 'Autovettura' };
  const profiloSenzaVolo = { nome: 'Autovettura' }; // nessun `vola`
  assert.ok(decolla(mezzo, profiloSenzaVolo, dati).errore, 'senza «forza» il motivo torna come errore');
  const d = decolla(mezzo, profiloSenzaVolo, dati, { forza: true, round: 3 });
  assert.equal(d.errore, undefined);
  assert.ok(d.mezzo.volo?.stato, 'lo stato di volo è stato scritto: la cosa è stata fatta');
  assert.match(d.avvisi.join(' '), /non vola/, 'e dice che cosa manca');
  const a = atterra(d.mezzo, profiloSenzaVolo, dati, { forza: true });
  assert.equal(a.errore, undefined);
  assert.match(a.avvisi.join(' '), /non vola/);
});

// --------------------------------------------------------------------------- 6. il «no» che resta, e perché
test('i «no» che restano sono integrità, e il registro li dichiara tutti', () => {
  const reg = readFileSync(new URL('../docs/registro-blocchi.md', import.meta.url), 'utf8');
  for (const id of ['motore:notaDiPrima:throw', 'motore:pianoAdeguamento:rifiuto dichiarato', 'motore:annullaAdeguamento:rifiuto dichiarato',
    'motore:eccezioneSpecializzazione:throw#2', 'pagina:pannelloCreaConsumabile:disabled#2']) {
    const riga = reg.split('\n').find((r) => r.includes('`' + id + '`'));
    assert.ok(riga, `manca la riga di ${id}`);
    assert.match(riga, /\|\s*B\s*\|/, `${id} deve stare nel gruppo B: passare romperebbe i dati`);
    assert.match(riga, /lotto 248/, `${id}: il motivo del lotto 248 va scritto`);
  }
  // e la sezione dei liberati dice che cosa non deve tornare
  assert.match(reg, /## Liberati dal lotto 248/);
});
