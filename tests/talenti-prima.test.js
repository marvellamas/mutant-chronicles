// La nota dei Talenti di prima (27/10/2026, docs/diagnosi-nota-talenti-2026-10-27.md): tutti i Talenti del file, livello
// per livello e con la categoria nuova; la voce «Ricostruisci la nota» rilegge lo zip del passaggio e nei personaggi
// aggiunge solo la riga, senza toccare le scelte fatte al tavolo. Tutto su copie in una cartella temporanea.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readdirSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { datiReali } from './helpers.js';
import { applica, pianoNota, applicaNota, righeNota } from '../tools/migra-talenti.mjs';
import { talentiDiPrima, testoNota, talentiDiPrimaPerScheda } from '../src/talenti-prima.js';

const { dati } = await datiReali();
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const pg = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json');
const radice = mkdtempSync(join(tmpdir(), 'mutant-nota-'));
const cartella = join(radice, 'personaggi');
const salvataggi = join(radice, 'salvataggi');
const leggi = (f) => JSON.parse(readFileSync(join(cartella, f), 'utf8'));
const PORTA_SPENTA = 9;

before(() => { mkdirSync(cartella, { recursive: true }); for (const f of pg) copyFileSync(new URL(f, FIX), join(cartella, f)); });
after(() => rmSync(radice, { recursive: true, force: true }));

test('talentiDiPrima raccoglie ogni strada: livelli, stringhe, creazione, Maestrie e Specializzazioni, id sconosciuti', () => {
  const o = {
    scelte: { specializzazioneIniziale: { id: 'specializzazione-informatica' }, talentiLiberi: ['ambidestro'] },
    livelli: [
      { livello: 2, maestria: { id: 'parata-istintiva' } },
      { livello: 3, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
      { livello: 4, talentoClasse: 'Bersaglio Designato', specializzazione: { id: 'specializzazione-sport', annotazione: 'Nuoto' } },
      { livello: 5, talentoLibero: 'raffica-breve-migliorata' },
      { livello: 6, talentoLibero: { id: 'talento-che-non-esiste-piu' } },
    ],
  };
  const r = talentiDiPrima(o, dati);
  assert.deepEqual(r.liberi.map((t) => [t.livello, t.id]), [
    [1, 'specializzazione-informatica'], [1, 'ambidestro'], [2, 'parata-istintiva'], [3, 'prova-salvezza-migliorata'],
    [4, 'specializzazione-sport'], [5, 'raffica-breve-migliorata'], [6, 'talento-che-non-esiste-piu']]);
  assert.deepEqual(r.liberi.map((t) => t.categoria), ['specializzazione', 'talento_libero', 'maestria', 'talento_libero', 'specializzazione', 'maestria', null]);
  assert.equal(r.liberi.find((t) => t.id === 'raffica-breve-migliorata').nuovoNome, 'Raffiche Migliorate');
  assert.deepEqual(r.classe, [{ livello: 4, nome: 'Bersaglio Designato' }]);
  const testo = testoNota(r, '26/10/2026');
  for (const parte of ['1° livello: Informatica', '3° livello: Prova Salvezza Migliorata (tempra)', '4° livello: Sport (Nuoto)', 'Raffiche Migliorate', 'categoria da stabilire', 'Talenti di Classe (restano): 4° livello: Bersaglio Designato']) assert.ok(testo.includes(parte), parte);
});

test('«Ricostruisci la nota»: dallo zip, la riga completa in ogni PG; le scelte del tavolo restano; una seconda volta non scrive', async () => {
  await applica({ cartella, salvataggi, porta: PORTA_SPENTA, d: dati, quando: new Date(2026, 9, 26, 20, 0) });
  // come al tavolo di Davide: note sparite o a metà, e una scelta fatta dopo il passaggio
  const prima = {};
  for (const f of pg) {
    const o = leggi(f);
    o.correzioni_master = o.correzioni_master.map((x) => (x.migrazioneTalenti ? { ...x, etichetta: 'Talenti prima del passaggio ai Talenti v1.0 (26/10/2026): ', talentiPrima: undefined } : x));
    o.livelli[0].maestria = { id: 'carica-migliorata' };
    writeFileSync(join(cartella, f), `${JSON.stringify(o, null, 2)}\n`);
    prima[f] = o;
  }
  const piano = await pianoNota({ cartella, salvataggi, d: dati, quando: new Date(2026, 9, 27, 9, 0) });
  assert.equal(piano.piani.length, 7);
  assert.ok(piano.piani.every((p) => p.riga && !p.giaCompleta), 'ogni PG ha la sua copia e la sua riga');
  assert.ok(righeNota(piano).some((r) => /nota completa:/.test(r)));
  const e = await applicaNota({ cartella, salvataggi, porta: PORTA_SPENTA, d: dati, quando: new Date(2026, 9, 27, 9, 0) });
  assert.deepEqual(e.errori, []);
  assert.equal(e.fatti.length, 7);
  assert.match(e.copia.zip, /prima-della-nota-talenti_/, 'copia di sicurezza con un nome suo');
  for (const f of pg) {
    const dopo = leggi(f);
    const riga = dopo.correzioni_master.at(-1);
    assert.equal(riga.ricostruita, true);
    assert.equal(riga.talentiPrima.length, 2, f);
    assert.match(riga.etichetta, /\(26\/10\/2026\): 3° livello: .+ — ora .+; 5° livello: .+ — ora .+\. Talenti di Classe \(restano\): 4° livello: /, 'la data è quella del passaggio');
    // solo il registro è cambiato
    assert.deepEqual({ ...dopo, correzioni_master: null, versione_salvataggio: null, versione_file: null, aggiornato_il: null, storico: null }, { ...prima[f], correzioni_master: null, versione_salvataggio: null, versione_file: null, aggiornato_il: null, storico: null }, `${f}: le scelte restano`);
    assert.deepEqual(dopo.livelli[0].maestria, { id: 'carica-migliorata' });
    // la scheda del giocatore legge la riga completa, non quella a metà
    const per = talentiDiPrimaPerScheda(dopo.correzioni_master);
    assert.equal(per.ricostruita, true);
    assert.equal(per.liberi.length, 2);
  }
  const di_nuovo = await applicaNota({ cartella, salvataggi, porta: PORTA_SPENTA, d: dati });
  assert.equal(di_nuovo.nulla, true);
});

test('percorso di Davide su un Taumaturgo: passaggio, Elementi e Manifestazione scelte, poi la nota: scelte e effetti restano', async () => {
  const { postiTalenti, applicaSceltaTalento } = await import('../src/avanzamento.js');
  const { calcolaScheda } = await import('../src/calc.js');
  const { calcolaLancio, dichiarazioneLancio } = await import('../src/lancio.js');
  const { massimiSessione, inizializzaSessione } = await import('../src/sessione.js');
  const f = pg.find((x) => /^LUCAS/.test(x));
  const disco = leggi(f);
  assert.equal(disco.scelte.regimeTalenti, 2);
  let p = { creazione: disco.scelte, livelli: disco.livelli };
  const posti = postiTalenti(p, dati, { opzioni: false }).posti.filter((x) => x.categoria === 'specializzazione');
  assert.ok(posti.length >= 2, 'due posti di Specializzazione');
  p = applicaSceltaTalento(p, posti[0], { id: 'specializzazione-elementi' });
  p = applicaSceltaTalento(p, posti[1], { id: 'specializzazione-manifestazione' });
  writeFileSync(join(cartella, f), `${JSON.stringify({ ...disco, scelte: p.creazione, livelli: p.livelli }, null, 2)}\n`);
  // la nota di Lucas era a metà: la rifaccio
  const o = leggi(f);
  o.correzioni_master = o.correzioni_master.filter((x) => !x.ricostruita).map((x) => (x.migrazioneTalenti ? { ...x, etichetta: 'Talenti prima del passaggio ai Talenti v1.0 (26/10/2026): ', talentiPrima: undefined } : x));
  writeFileSync(join(cartella, f), `${JSON.stringify(o, null, 2)}\n`);
  const e = await applicaNota({ cartella, salvataggi, porta: PORTA_SPENTA, d: dati, quando: new Date(2026, 9, 27, 10, 0) });
  assert.deepEqual(e.errori, []);
  const dopo = leggi(f);
  assert.equal(dopo.scelte.specializzazioneIniziale?.id ?? dopo.livelli.map((v) => v.specializzazione?.id).find(Boolean), 'specializzazione-elementi');
  assert.ok(dopo.livelli.some((v) => v.specializzazione?.id === 'specializzazione-manifestazione') || dopo.scelte.specializzazioneIniziale?.id === 'specializzazione-manifestazione');
  assert.equal(dopo.correzioni_master.at(-1).talentiPrima.length, 2);
  // gli effetti: «Lancia!» costa 1 PM in meno e +1 al VA di Potere, per le due sottofamiglie
  const creazione = dopo.scelte;
  const riposo = calcolaScheda({ creazione, livelli: dopo.livelli }, dati);
  const scheda = calcolaScheda({ creazione, livelli: dopo.livelli, sessione: inizializzaSessione(massimiSessione(riposo, creazione, dati)) }, dati);
  assert.deepEqual(scheda.specializzazioni.map((x) => x.id).sort(), ['specializzazione-elementi', 'specializzazione-manifestazione']);
  const senza = { ...scheda, specializzazioni: [] };
  for (const sottofamiglia of ['Elementi', 'Manifestazione']) {
    const inc = dati.incantesimi.incantesimi.find((i) => i.specializzazione === sottofamiglia && i.livello_base === 1 && i.meccanica);
    const lancia = (s) => calcolaLancio({ scheda: s, sessione: {} }, inc, dichiarazioneLancio({ versione: 3 }), dati);
    assert.equal(lancia(scheda).pm_costo, lancia(senza).pm_costo - 1, `${sottofamiglia}: PM`);
    assert.equal(lancia(scheda).va_potere_finale, lancia(senza).va_potere_finale + 1, `${sottofamiglia}: VA`);
  }
});
