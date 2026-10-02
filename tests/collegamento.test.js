// Tavolo del Master, pezzo 6: la scheda del giocatore collegata al server (src/collegamento.js). Rilettura del
// proprio file quando il master lo cambia, conflitto con una modifica locale («Aggiorna» e «Tieni la mia», con
// la revisione come nel pezzo 4), riga di registro della scelta, indicatore assente senza server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { controllaRemoto, modificaLocale, revisioneDaScrivere, differenzeSessione, testoScelta, indicatoreCollegamento, fileRemoto, impronta } from '../src/collegamento.js';
import { testoConSessione } from '../src/tavolo.js';
import { deserializzaPersonaggio } from '../src/character.js';
import { nuovoScontro, registraRiga, validaScontro } from '../src/scontro.js';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const FILE = 'Torvald-Krane_liv6_2026-10-02.json';
const testoEsempio = readFileSync(new URL(`../esempi/${FILE}`, import.meta.url), 'utf8');
const voce = (cartella, aggiornato = cartella?.salvato ?? null) => ({ scelte: { nome: 'Torvald Krane' }, aggiornato, cartella });

test('controllaRemoto: niente se il file è quello ricordato, ricarica se l’ha cambiato il master', () => {
  const lista = [{ file: FILE, mtime: 1000 }, { file: 'Rhea-Valdis_liv5_2026-10-02.json', mtime: 5000 }, { file: 'Torvald-Krane_liv6_2026-10-01.json', mtime: 10 }];
  assert.equal(fileRemoto('Torvald Krane', lista).file, FILE);
  const c = { file: FILE, mtime: 1000, salvato: 'A' };
  assert.equal(controllaRemoto(voce(c), lista).azione, 'niente');
  assert.equal(controllaRemoto(voce(c), [{ file: FILE, mtime: 2000 }]).azione, 'ricarica');
  // mai sincronizzata o file sparito: niente da fare
  assert.equal(controllaRemoto(voce(null), lista).azione, 'niente');
  assert.equal(controllaRemoto(voce(c), []).azione, 'niente');
});

test('controllaRemoto: conflitto se la scheda ha una modifica non ancora scritta (in attesa o più nuova)', () => {
  const c = { file: FILE, mtime: 1000, salvato: 'A' };
  const cambiato = [{ file: FILE, mtime: 2000 }];
  assert.equal(modificaLocale(voce(c)), false);
  assert.equal(modificaLocale(voce(c, 'B')), true);
  assert.equal(modificaLocale(voce(c), true), true);
  assert.equal(controllaRemoto(voce(c, 'B'), cambiato).azione, 'conflitto');
  assert.equal(controllaRemoto(voce(c), cambiato, true).azione, 'conflitto');
  // senza cambi sul server una modifica locale non è un conflitto: si scrive e basta
  assert.equal(controllaRemoto(voce(c, 'B'), [{ file: FILE, mtime: 1000 }]).azione, 'niente');
});

test('modifica locale per contenuto: la scheda riaperta e risalvata senza cambiamenti non è un conflitto', () => {
  const testo = '{"formato":8}';
  const c = { file: FILE, mtime: 1000, salvato: 'A', impronta: impronta(testo) };
  const cambiato = [{ file: FILE, mtime: 2000 }];
  // la data della voce è cambiata (riaperta), il testo esportato no: si ricarica la versione del master
  assert.equal(controllaRemoto(voce(c, 'B'), cambiato, false, impronta(testo)).azione, 'ricarica');
  assert.equal(controllaRemoto(voce(c, 'B'), cambiato, false, impronta('{"formato":8,"x":1}')).azione, 'conflitto');
  // senza impronta (sincronizzazioni di prima del pezzo 6) vale la data
  assert.equal(controllaRemoto(voce({ ...c, impronta: undefined }, 'B'), cambiato, false, impronta(testo)).azione, 'conflitto');
  assert.notEqual(impronta('PV 30'), impronta('PV 32'));
});

test('revisioneDaScrivere: la data ricordata solo per lo stesso file', () => {
  assert.equal(revisioneDaScrivere(voce({ file: FILE, mtime: 1790930698109.123 }), FILE), '1790930698109.123');
  assert.equal(revisioneDaScrivere(voce({ file: FILE, mtime: 1 }), 'Torvald-Krane_liv7_2026-10-03.json'), null);
  assert.equal(revisioneDaScrivere(voce(null), FILE), null);
});

test('differenze di sessione e righe del registro', () => {
  const nomi = { sanguinamento: 'Sanguinamento', 'a-terra': 'A Terra' };
  const d = differenzeSessione({ pvAttuali: 32, ferite: 0, statiAttivi: ['a-terra'], munizioni: { a: 1 } }, { pvAttuali: 30, ferite: 1, statiAttivi: ['sanguinamento'], munizioni: { a: 0 } }, (id) => nomi[id]);
  assert.deepEqual(d, ['PV 32 → 30', 'Ferite 0 → 1', 'Stati: + Sanguinamento, − A Terra', 'munizioni']);
  assert.deepEqual(differenzeSessione({ pvAttuali: 5 }, { pvAttuali: 5 }), []);
  assert.match(testoScelta('Torvald Krane', 'aggiorna', ['PV 32 → 30']), /^Torvald Krane: il giocatore ha accettato l’aggiornamento del master nella sua scheda \(PV 32 → 30\)\.$/);
  assert.match(testoScelta('Torvald Krane', 'tieni', ['PV 30 → 32']), /tenuto la sua versione.*\(PV 30 → 32\)/);
  const s = registraRiga(nuovoScontro({ id: 'scontro-p6', pg: [] }), testoScelta('Torvald Krane', 'tieni'));
  assert.match(s.registro.at(-1).testo, /tenuto la sua versione/);
  assert.equal(validaScontro(s), null);
  assert.throws(() => registraRiga(s, '  '), /vuota/);
});

test('indicatore: assente senza server, verde o grigio con il server', async () => {
  assert.equal(indicatoreCollegamento(false), null);
  assert.deepEqual([indicatoreCollegamento(true).stato, indicatoreCollegamento(true).testo], ['collegato', 'collegato al tavolo']);
  assert.deepEqual([indicatoreCollegamento(true, false).stato, indicatoreCollegamento(true, false).testo], ['non_collegato', 'non collegato']);
  // senza server (npx serve, GitHub Pages) /api/ping non risponde: l'app non vede la cartella
  const originale = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('connessione rifiutata'); };
  try {
    const { serverCartella, elencoCartella } = await import('../src/ui/cartella.js?senza-server');
    assert.equal(await serverCartella(), false);
    assert.equal(await elencoCartella(), null);
    assert.equal(indicatoreCollegamento(await serverCartella()), null);
  } finally {
    globalThis.fetch = originale;
  }
});

// Con il server vero, su cartelle temporanee: le funzioni di src/ui/cartella.js usate dalla scheda
const cartelle = ['personaggi', 'nemici', 'tavolo', 'scontri'].map((x) => mkdtempSync(join(tmpdir(), `mutant-p6-${x}-`)));
const [cPersonaggi, cNemici, cTavolo, cScontri] = cartelle;
let server;
let ui;
const originale = globalThis.fetch;
before(async () => {
  copyFileSync(new URL(`../esempi/${FILE}`, import.meta.url), join(cPersonaggi, FILE));
  server = creaServer({ cartella: cPersonaggi, nemici: cNemici, tavolo: cTavolo, scontri: cScontri });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${server.address().port}/`;
  globalThis.fetch = (u, o) => originale(new URL(String(u), base), o);
  ui = await import('../src/ui/cartella.js?con-server');
});
after(() => { globalThis.fetch = originale; server.close(); for (const d of cartelle) rmSync(d, { recursive: true, force: true }); });

// la scheda: lettura iniziale e ricordo dell'ultima sincronizzazione
async function apriScheda() {
  const lista = await ui.elencoCartella();
  const { testo, mtime } = await ui.leggiCartellaConRevisione(FILE);
  return { voce: voce({ file: FILE, mtime: lista.find((f) => f.file === FILE).mtime, salvato: 'A' }), testo, mtime };
}
// la plancia: un colpo con la revisione (pezzo 4)
async function colpoDalMaster(pv) {
  const { testo, mtime } = await ui.leggiCartellaConRevisione(FILE);
  await new Promise((ok) => setTimeout(ok, 20)); // data di modifica diversa anche su file system veloci
  return ui.scriviCartella(FILE, testoConSessione(testo, { pvAttuali: pv }, dati), { mtime });
}

test('rilettura: il master cambia il file, la scheda senza modifiche se ne accorge e rilegge i PV', async () => {
  assert.equal(await ui.serverCartella(), true);
  const { voce: v } = await apriScheda();
  assert.equal(controllaRemoto(v, await ui.elencoCartella()).azione, 'niente');
  await colpoDalMaster(30);
  const c = controllaRemoto(v, await ui.elencoCartella());
  assert.equal(c.azione, 'ricarica');
  const { testo, mtime } = await ui.leggiCartellaConRevisione(c.remoto.file);
  assert.equal(deserializzaPersonaggio(testo).sessione.pvAttuali, 30);
  // ricordata la nuova revisione, il giro dopo non trova più niente
  const dopo = voce({ file: FILE, mtime: Number(mtime), salvato: 'B' });
  assert.equal(controllaRemoto(dopo, await ui.elencoCartella()).azione, 'niente');
});

test('conflitto: modifica locale non scritta e colpo del master; «Aggiorna» e «Tieni la mia» con la revisione', async () => {
  const { voce: v, testo: mio } = await apriScheda();
  const locale = { ...v, aggiornato: 'B' }; // il giocatore ha cambiato qualcosa, non ancora nella cartella
  await colpoDalMaster(25);
  const c = controllaRemoto(locale, await ui.elencoCartella());
  assert.equal(c.azione, 'conflitto');
  // la scrittura della scheda con la vecchia revisione è rifiutata: il master non si perde
  await assert.rejects(ui.scriviCartella(FILE, mio, { mtime: revisioneDaScrivere(locale, FILE) }), (e) => e.conflitto === true);
  // «Aggiorna»: si prende la versione del master
  const master = await ui.leggiCartellaConRevisione(FILE);
  assert.equal(deserializzaPersonaggio(master.testo).sessione.pvAttuali, 25);
  // «Tieni la mia» con la revisione vista nell'avviso: se il master ha scritto ancora, di nuovo conflitto
  await colpoDalMaster(20);
  await assert.rejects(ui.scriviCartella(FILE, mio, { mtime: master.mtime }), (e) => e.conflitto === true);
  const ultima = await ui.leggiCartellaConRevisione(FILE);
  const r = await ui.scriviCartella(FILE, mio, { mtime: ultima.mtime });
  assert.equal(r.file, FILE);
  assert.equal(deserializzaPersonaggio(await ui.leggiCartella(FILE)).sessione.pvAttuali, deserializzaPersonaggio(mio).sessione.pvAttuali);
});
