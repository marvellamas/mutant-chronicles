import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { datiReali } from './helpers.js';
import { validaDati } from '../src/validate.js';
import { verificaCompensazione, annullaCorrezioniRimaste, vaAbilita } from '../src/adeguamento-abilita.js';
import { pianoCompensazione, applicaCompensazione, metroDi } from '../tools/correzione-compensativa.mjs';
import { scriviPersonaggio } from '../tools/scrivi-personaggio.mjs';

// Lotto 256, parte C — **un attrezzo che corregge verifica la premessa su cui corregge.**
//
// Il lotto 252 ha costruito `correzione-compensativa.mjs` su ciò che Davide descrive: due +1 annullati dall'adeguamento e il −2 che li
// compensava rimasto in piedi. L'istantanea del 27/11 dice un'altra cosa: i tre sono tutti attivi, la somma fa 0 e il file non è adeguato.
// Annullare il −2 con i +1 ancora vivi darebbe +2 dove serve 0. Qui si prova che lo strumento non lo fa, e che se il conto dopo la
// scrittura non è quello atteso rimette i byte di prima.
const { dati } = await datiReali();
const base = JSON.parse(readFileSync(new URL('../esempi/Torvald-Krane_liv6_2026-10-02.json', import.meta.url), 'utf8'));
const ABIL = 'Armi da mischia';
const corr = (id, numero, stato, quando) => ({ id, quando, chiave: `abilita:${ABIL}`, etichetta: `VA di ${ABIL}`, tipo: 'aggiungi', numero, motivo: '', stato });
const file = (correzioni, { regime = 2, adeguamentoDel = null } = {}) => ({
  ...base,
  scelte: { ...base.scelte, ...(regime ? { regimeAbilita: regime } : {}), ...(adeguamentoDel ? { puntiDirettore: { quando: adeguamentoDel, adeguamento: true, totale: 0 } } : {}) },
  correzioni_master: correzioni,
});
const metro = (extra = {}) => ({ personaggio: 'Torvald', abilita: ABIL, va: null, fonte: 'prova', perche: 'prova', ...extra });
const conMetro = (m) => ({ ...dati, regole: { ...dati.regole, adeguamento_abilita: { ...dati.regole.adeguamento_abilita, metro: m ? [m] : [] } } });
const tmp = () => mkdtempSync(join(tmpdir(), 'compensativa-256-'));
const su = (o) => { const d = tmp(); const p = join(d, 'Torvald-Krane_liv6_2026-11-27.json'); writeFileSync(p, `${JSON.stringify(o, null, 2)}\n`); return p; };

// lo stato che Davide descrive: i due +1 annullati, il −2 in piedi
const statoDiDavide = () => file([corr('a', 1, 'annullata', '2026-11-02T18:32:21Z'), corr('b', 1, 'annullata', '2026-11-02T18:34:23Z'), corr('c', -2, 'attiva', '2026-11-23T19:21:36Z')], { adeguamentoDel: '2026-11-24T22:58:00.000Z' });
// lo stato dei file dell'istantanea del 27/11: tutti attivi, nessun adeguamento
const statoDeiFile = (regime) => file([corr('a', 1, 'attiva', '2026-11-02T18:32:21Z'), corr('b', 1, 'attiva', '2026-11-02T18:34:23Z'), corr('c', -2, 'attiva', '2026-11-23T19:21:36Z')], { regime });

test('IL CASO CHE LO STRUMENTO È NATO PER CORREGGERE: i +1 annullati e il −2 in piedi → si annulla il −2, e il VA sale di 2', () => {
  const o = statoDiDavide();
  const prima = vaAbilita(o, ABIL, dati).valore;
  const piano = pianoCompensazione(o, dati, { nome: 'Torvald' });
  assert.equal(piano.ok, true, piano.motivi.join(' | '));
  assert.equal(vaAbilita(piano.esito.nuovo, ABIL, dati).valore, prima + 2);
  const r = piano.verifica.abilita[0];
  assert.equal(r.sommaDaAnnullare, -2);
  assert.equal(r.atteso, prima + 2);
});

test('LO STATO DEI FILE DI DAVIDE (27/11): i tre attivi con somma 0 → lo strumento non scrive e dice perché', () => {
  // adeguato per ipotesi: la guardia deve fermarsi sulla somma, non solo sul regime
  const o = statoDeiFile(2);
  const v = verificaCompensazione(o, dati);
  assert.equal(v.ok, false);
  assert.match(v.motivi.join(' '), /si compensano già.*somma è 0/);
  // e la mossa pericolosa, fatta senza guardia, darebbe +2 dove serve 0 (qui la si dimostra, non la si fa)
  const prima = vaAbilita(o, ABIL, dati).valore;
  const senzaGuardia = annullaCorrezioniRimaste(o, dati, { quando: new Date(), chi: 'prova' });
  assert.equal(vaAbilita(senzaGuardia.nuovo, ABIL, dati).valore, prima, 'annullare tutte e tre non cambia il VA: la scrittura sarebbe inutile');
  const p = su(o);
  const grezzo = readFileSync(p, 'utf8');
  let chiamate = 0;
  const e = applicaCompensazione(p, dati, { nome: 'Torvald', scrivi: () => { chiamate += 1; } });
  assert.equal(e.scritto, false);
  assert.equal(chiamate, 0, 'con la somma già a 0 non si scrive nemmeno');
  assert.equal(readFileSync(p, 'utf8'), grezzo, 'il file è identico byte per byte');
});

test('UN FILE NON ADEGUATO: lo strumento lo dice invece di «niente da annullare»', () => {
  const o = statoDeiFile(null);
  const v = verificaCompensazione(o, dati);
  assert.equal(v.ok, false);
  assert.equal(v.adeguato, false);
  assert.match(v.motivi[0], /non dice di essere adeguato/);
  const p = su(o); const grezzo = readFileSync(p, 'utf8');
  const e = applicaCompensazione(p, dati, { nome: 'Torvald' });
  assert.equal(e.scritto, false);
  assert.equal(readFileSync(p, 'utf8'), grezzo);
});

test('I +1 CHE IL −2 COMPENSAVA SONO ANCORA ATTIVI (decisione presa dopo l’adeguamento): annullare il −2 lascerebbe +1 → si ferma', () => {
  const o = file([corr('x', -2, 'attiva', '2026-11-23T19:21:36Z'), corr('y', 1, 'attiva', '2026-11-25T10:00:00Z')], { adeguamentoDel: '2026-11-24T22:58:00.000Z' });
  const v = verificaCompensazione(o, dati);
  assert.equal(v.ok, false, 'le due correzioni non si compensano, ma una delle due è una decisione di adesso');
  assert.match(v.motivi.join(' '), /di segno opposto.*ancora in piedi/);
});

test('UNA CORREZIONE «IMPOSTA A N» non è un delta: lo strumento non la somma e si ferma', () => {
  const imposta = { ...corr('i', 0, 'attiva', '2026-11-23T19:21:36Z'), tipo: 'imposta', numero: 9 };
  const v = verificaCompensazione(file([corr('a', 1, 'annullata', '2026-11-02T18:32:21Z'), imposta], { adeguamentoDel: '2026-11-24T22:58:00.000Z' }), dati);
  assert.equal(v.ok, false);
  assert.match(v.motivi.join(' '), /imposta a N/);
});

test('IL METRO DI DAVIDE: se dopo la correzione l’Abilità non dà il numero dichiarato, non si scrive', () => {
  const o = statoDiDavide();
  const prima = vaAbilita(o, ABIL, dati).valore;
  const giusto = pianoCompensazione(o, conMetro(metro({ va: prima + 2 })), { nome: 'Torvald' });
  assert.equal(giusto.ok, true, giusto.motivi.join(' | '));
  const sbagliato = pianoCompensazione(o, conMetro(metro({ va: prima + 3 })), { nome: 'Torvald' });
  assert.equal(sbagliato.ok, false);
  assert.match(sbagliato.motivi.join(' '), /metro: .*dovrebbe dare/);
  // il contatore dei punti liberi si legge solo da un adeguamento aperto: se non c'è, il metro non si può confermare
  const senzaContatore = pianoCompensazione(o, conMetro(metro({ va: prima + 2, punti_disponibili: 21 })), { nome: 'Torvald' });
  assert.equal(senzaContatore.ok, false);
  assert.match(senzaContatore.motivi.join(' '), /contatore dovrebbe leggere 21.*non c’è un adeguamento aperto/);
});

test('IL METRO si riconosce dal nome del personaggio, e per gli altri non c’è', () => {
  assert.equal(metroDi('Dimitri Orlav', dati)?.va, 8);
  assert.equal(metroDi('Dimitri Orlav', dati)?.punti_disponibili, 21);
  assert.equal(metroDi('Torvald Krane', dati), null);
});

test('DOPO LA SCRITTURA IL CONTO SI RIFÀ: se non torna, i byte di prima tornano al loro posto', () => {
  const p = su(statoDiDavide());
  const grezzo = readFileSync(p, 'utf8');
  // una scrittura che «guasta» il risultato: dopo di lei una correzione compare di nuovo attiva
  const scriviGuasto = (percorso, nuovo, opz) => {
    scriviPersonaggio(percorso, nuovo, opz);
    const o = JSON.parse(readFileSync(percorso, 'utf8'));
    o.correzioni_master.push(corr('z', -3, 'attiva', '2026-11-23T20:00:00Z'));
    writeFileSync(percorso, `${JSON.stringify(o, null, 2)}\n`);
  };
  const e = applicaCompensazione(p, dati, { nome: 'Torvald', scrivi: scriviGuasto });
  assert.equal(e.scritto, false);
  assert.equal(e.annullato, true);
  assert.ok(e.motivi.length >= 1);
  assert.equal(readFileSync(p, 'utf8'), grezzo, 'il file è tornato identico byte per byte');
});

test('LA SCRITTURA GIUSTA passa da scriviPersonaggio e il file riletto ha il VA atteso', () => {
  const p = su(statoDiDavide());
  const prima = vaAbilita(JSON.parse(readFileSync(p, 'utf8')), ABIL, dati).valore;
  const e = applicaCompensazione(p, dati, { nome: 'Torvald' });
  assert.equal(e.scritto, true, e.motivi.join(' | '));
  const dopo = JSON.parse(readFileSync(p, 'utf8'));
  assert.equal(vaAbilita(dopo, ABIL, dati).valore, prima + 2);
  assert.equal(dopo.aggiornato_da, 'master');
  assert.ok(Number.isInteger(dopo.versione_salvataggio));
});

test('IL VALIDATORE pretende il metro, con il suo perché', () => {
  assert.deepEqual(validaDati(dati), []);
  const e = validaDati(conMetro(null)).map((x) => x.problema ?? x.errore ?? String(x)).join(' ');
  assert.match(e, /metro/);
  const m = validaDati(conMetro({ personaggio: 'X', abilita: ABIL, va: 8 })).map((x) => x.problema ?? String(x)).join(' ');
  assert.match(m, /fonte e il perché/);
});

test('SULL’ISTANTANEA VERA (se c’è): Dimitri del 27/11 non si corregge e il file non si muove', { skip: !existsSync(new URL('../istantanee/stato_2026-11-27_0015/personaggi/', import.meta.url)) && 'istantanea del 27/11 non presente (è fuori da git)' }, () => {
  const cartella = new URL('../istantanee/stato_2026-11-27_0015/personaggi/', import.meta.url);
  const nome = readdirSync(cartella).filter((f) => /^Dimitri/.test(f)).sort().at(-1);
  const p = new URL(nome, cartella);
  const grezzo = readFileSync(p, 'utf8');
  const piano = pianoCompensazione(JSON.parse(grezzo), dati, { nome: 'Dimitri Orlav' });
  assert.equal(piano.ok, false, 'sui file che ci arrivano la premessa non regge');
  assert.match(piano.motivi.join(' '), /non dice di essere adeguato/);
  assert.equal(readFileSync(p, 'utf8'), grezzo, 'lettura sola');
});
