// L'istantanea dello stato dei personaggi (lotto 196, 14/11/2026): dal PC di Davide a noi, per una cartella del cloud.
//
// I due controlli che devono restare verdi sempre, e sono i primi due di questo file:
//   1. **la cartella delle istantanee non può diventare la cartella dei dati dell'app.** Il cloud cancella, rinomina
//      e riscrive i file quando vuole: tenerci i personaggi è l'errore che a fine ottobre li ha fatti sparire
//      (docs/diagnosi-dati-spariti-2026-10-12.md). Né uguale, né dentro, né contenente.
//   2. **un'istantanea non entra fra i file tracciati da git.** Sono dati di gioco, come personaggi/.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  CARTELLE, PREFISSO, TIENI, nomeIstantanea, quandoDalNome, cartellaIstantanee, quanteTenere,
  erroreCartellaIstantanee, eCartellaIstantanee, indiceIstantanea, vociIstantanea, elencoIstantanee, ruota,
  faiIstantanea, leggiIstantanea, ultimaIstantanea, rigaFreschezza, GIORNI_AVVISO,
} from '../tools/istantanea.mjs';
import { eCartellaDiIstantanee, scriviImpostazione, cartellaDati } from '../tools/dati-pc.mjs';
import { salvaIstantanee, statoImpostazioni, testoIstantanee } from '../tools/impostazioni.mjs';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
const PG = { formato: 'mutant-personaggio', versione: 8, scelte: { nome: 'Prova Uno' }, livelli: [{}, {}, {}, {}, {}], sessione: {} };

/** Una cartella di prova con dentro i personaggi, i veicoli e i PX. Nasce qui, quindi la guardia la lascia scrivere. */
function conDati({ quanti = 2 } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'mutant-ist-'));
  for (const c of CARTELLE) mkdirSync(join(base, c), { recursive: true });
  for (let i = 0; i < quanti; i++) {
    writeFileSync(join(base, 'personaggi', `PG-${i}_liv6_2026-11-14.json`), JSON.stringify({ ...PG, scelte: { nome: `Prova ${i}` } }));
  }
  writeFileSync(join(base, 'veicoli', 'veicolo.json'), '{"id":"v1"}');
  writeFileSync(join(base, 'px', 'px.json'), '{"partite":[]}');
  const cartelle = Object.fromEntries(CARTELLE.map((c) => [c, join(base, c)]));
  const cloud = mkdtempSync(join(tmpdir(), 'mutant-cloud-'));
  return { base, cartelle, cloud };
}

// --- 1. la cartella delle istantanee non diventa la cartella dei dati ------------------------------------------

test('la cartella delle istantanee non può essere la cartella dei dati: né uguale, né dentro, né contenente', () => {
  const { base, cartelle, cloud } = conDati();
  // fuori va bene
  assert.equal(erroreCartellaIstantanee(cloud, base), null);
  // uguale, dentro, contenente: tre motivi diversi, tutti un rifiuto
  assert.match(erroreCartellaIstantanee(base, base), /è la cartella dei dati/);
  assert.match(erroreCartellaIstantanee(cartelle.personaggi, base), /sta dentro la cartella dei dati/);
  assert.match(erroreCartellaIstantanee(dirname(base), base), /contiene la cartella dei dati/);
  // e il salvataggio delle impostazioni lo rifiuta davvero, non solo la funzione che controlla
  const app = mkdtempSync(join(tmpdir(), 'mutant-app-'));
  assert.equal(salvaIstantanee(app, base, { dati: base }).ok, false);
  assert.equal(salvaIstantanee(app, cartelle.personaggi, { dati: base }).ok, false);
  const ok = salvaIstantanee(app, cloud, { dati: base });
  assert.equal(ok.ok, true);
  assert.equal(JSON.parse(readFileSync(join(app, 'config-salvataggi.json'), 'utf8')).cartella_istantanee, cloud.replace(/\\/g, '/'));
});

test('e al contrario: una cartella che contiene istantanee non diventa la cartella dei dati di Mutant', () => {
  const { base, cartelle, cloud } = conDati();
  faiIstantanea({ cartelle, dove: cloud, dati: base });
  // si riconosce dai file, non dal nome: il nome lo sceglie Davide
  assert.equal(eCartellaDiIstantanee(cloud), true);
  assert.equal(eCartellaIstantanee(cloud), true);
  assert.equal(eCartellaDiIstantanee(base), false);
  const profilo = mkdtempSync(join(tmpdir(), 'mutant-prof-'));
  assert.throws(() => scriviImpostazione(cloud, { profilo }), /non può essere la cartella dei dati/);
  // una cartella normale si imposta come sempre
  assert.equal(scriviImpostazione(base, { profilo }).cartella.toLowerCase(), base.toLowerCase());
});

// --- 2. le istantanee non entrano in git ------------------------------------------------------------------------

test('un’istantanea non entra fra i file tracciati da git', () => {
  const nome = nomeIstantanea(new Date(2026, 10, 14, 23, 40));
  // git check-ignore: lo dice git stesso, non una lettura del .gitignore
  const ignorato = (p) => {
    try { execFileSync('git', ['-C', RADICE, 'check-ignore', '-q', p]); return true; } catch { return false; }
  };
  assert.ok(ignorato(nome), `${nome} non è ignorato da git: una copia dei personaggi finirebbe nel repository`);
  assert.ok(ignorato(join('istantanee', nome)), 'la cartella istantanee/ non è ignorata');
  assert.ok(ignorato(join('istantanee', 'qualunque.zip')), 'tutta istantanee/ deve essere ignorata');
  // e nessuna istantanea è tracciata adesso
  const tracciati = execFileSync('git', ['-C', RADICE, 'ls-files'], { encoding: 'utf8' }).split('\n');
  assert.deepEqual(tracciati.filter((f) => f.includes(PREFISSO)), []);
});

// --- il nome, il contenuto, la rotazione -----------------------------------------------------------------------

test('il nome porta la data e l’ora, e si rilegge', () => {
  const d = new Date(2026, 10, 14, 23, 40);
  assert.equal(nomeIstantanea(d), 'mutant-stato_2026-11-14_2340.zip');
  assert.equal(quandoDalNome('mutant-stato_2026-11-14_2340.zip').getTime(), d.getTime());
  assert.equal(quandoDalNome('mutant-stato_2026-11-14_2340_2.zip').getTime(), d.getTime());
  assert.equal(quandoDalNome('salvataggio.zip'), null);
  assert.equal(quandoDalNome('mutant-stato.zip'), null);
});

test('dentro ci sono i personaggi, i veicoli, i PX, l’indice e il rapporto', () => {
  const { base, cartelle, cloud } = conDati({ quanti: 3 });
  writeFileSync(join(base, 'stato-mutant.txt'), 'STATO DI MUTANT - prova');
  const e = faiIstantanea({ cartelle, dove: cloud, dati: base, statoTxt: join(base, 'stato-mutant.txt') });
  assert.equal(e.fatto, true);
  assert.equal(e.quanti, 3);
  const i = leggiIstantanea(e.file);
  assert.equal(i.personaggi.length, 3);
  assert.deepEqual(i.personaggi.map((p) => p.livello), [6, 6, 6]);
  assert.deepEqual(i.personaggi.map((p) => p.nome), ['Prova 0', 'Prova 1', 'Prova 2']);
  assert.equal(i.veicoli, 1);
  assert.equal(i.px, 1);
  assert.match(i.stato, /STATO DI MUTANT/);
  // i file che non sono personaggi non entrano nel conto (riconosciuti dal contenuto, come il lotto 161)
  writeFileSync(join(base, 'personaggi', 'attese.json'), '{"nota":"non è un personaggio"}');
  assert.equal(faiIstantanea({ cartelle, dove: cloud, dati: base, adesso: new Date(Date.now() + 60000) }).quanti, 3);
});

test('la rotazione tiene le ultime N e butta le più vecchie', () => {
  const { base, cartelle, cloud } = conDati();
  const giorno = (n) => new Date(2026, 10, n, 22, 0);
  for (let n = 1; n <= 8; n++) faiIstantanea({ cartelle, dove: cloud, dati: base, adesso: giorno(n), tieni: 5 });
  const l = elencoIstantanee(cloud);
  assert.equal(l.length, 5, 'ne restano cinque');
  assert.deepEqual(l.map((x) => x.quando.getDate()), [8, 7, 6, 5, 4], 'le cinque più recenti, in ordine');
  // e la rotazione da sola fa lo stesso
  assert.equal(ruota(cloud, 2).length, 3);
  assert.deepEqual(elencoIstantanee(cloud).map((x) => x.quando.getDate()), [8, 7]);
  assert.equal(TIENI, 20, 'venti di partenza: una o due per sessione, una o due sessioni a settimana, circa due mesi');
  assert.equal(quanteTenere({}), 20);
  assert.equal(quanteTenere({ istantanee_da_tenere: 4 }), 4);
  assert.equal(quanteTenere({ istantanee_da_tenere: 1 }), 20, 'un valore assurdo non si applica');
});

test('la cartella non impostata: lo dice e non tocca niente', () => {
  const { base, cartelle } = conDati();
  const e = faiIstantanea({ cartelle, dove: null, dati: base });
  assert.equal(e.fatto, false);
  assert.equal(e.motivo, 'non impostata');
  assert.match(e.riga, /cartella non impostata/);
  assert.equal(cartellaIstantanee({}), null);
  assert.equal(cartellaIstantanee({ cartella_istantanee: '   ' }), null);
  assert.equal(cartellaIstantanee({ cartella_istantanee: ' G:/Drive/Stato ' }), 'G:/Drive/Stato');
  // una cartella dei personaggi vuota non produce un'istantanea vuota
  const vuota = mkdtempSync(join(tmpdir(), 'mutant-vuota-'));
  for (const c of CARTELLE) mkdirSync(join(vuota, c), { recursive: true });
  const cloud = mkdtempSync(join(tmpdir(), 'mutant-cloud2-'));
  assert.equal(faiIstantanea({ cartelle: Object.fromEntries(CARTELLE.map((c) => [c, join(vuota, c)])), dove: cloud, dati: vuota }).fatto, false);
  assert.deepEqual(readdirSync(cloud), []);
});

// --- la nostra parte: quanto è fresca --------------------------------------------------------------------------

test('la riga del controllo di inizio sessione dice il giorno, e avverte se è vecchia', () => {
  const { base, cartelle, cloud } = conDati({ quanti: 7 });
  const quando = new Date(2026, 10, 14, 23, 40);
  faiIstantanea({ cartelle, dove: cloud, dati: base, adesso: quando });
  const u = ultimaIstantanea(cloud);
  assert.equal(u.personaggi.length, 7);
  const oggi = rigaFreschezza(u, { adesso: new Date(2026, 10, 14, 23, 50) });
  assert.equal(oggi.fresca, true);
  assert.match(oggi.riga, /^Istantanea del 14\/11 alle 23:40, 7 personaggi \(oggi\)\.$/);
  assert.match(rigaFreschezza(u, { adesso: new Date(2026, 10, 15, 23, 50) }).riga, /ieri/);
  const vecchia = rigaFreschezza(u, { adesso: new Date(2026, 10, 14 + GIORNI_AVVISO, 23, 50) });
  assert.equal(vecchia.fresca, false);
  assert.match(vecchia.riga, /VECCHIA/);
  assert.match(vecchia.riga, /«Manda lo stato»/);
  // nessuna istantanea: la riga ricorda di datare ogni affermazione
  assert.match(rigaFreschezza(null).riga, /copia locale di personaggi\//);
  assert.equal(rigaFreschezza(null).vecchia, true);
});

test('uno zip rotto non ferma la lettura: si prende la precedente', () => {
  const { base, cartelle, cloud } = conDati();
  faiIstantanea({ cartelle, dove: cloud, dati: base, adesso: new Date(2026, 10, 10, 22, 0) });
  writeFileSync(join(cloud, nomeIstantanea(new Date(2026, 10, 12, 22, 0))), 'non è uno zip');
  const u = ultimaIstantanea(cloud);
  assert.ok(u, 'con l’ultima illeggibile si legge quella di prima');
  assert.equal(u.quando.getDate(), 10);
});

// --- le impostazioni -------------------------------------------------------------------------------------------

test('le impostazioni dicono in una riga com’è la cartella, e il file d’esempio la prevede', () => {
  const esempio = JSON.parse(readFileSync(join(RADICE, 'config-salvataggi.esempio.json'), 'utf8'));
  assert.equal(esempio.cartella_istantanee, '');
  assert.equal(esempio.istantanee_da_tenere, 20);
  assert.match(esempio._nota, /cartella_istantanee/);
  assert.match(esempio._nota, /NON può essere la cartella dei dati/);
  assert.match(testoIstantanee({ stato: 'vuota' }), /non impostata/);
  assert.match(testoIstantanee({ stato: 'inesistente', percorso: 'G:/x' }), /NON TROVATA/);
  assert.match(testoIstantanee({ stato: 'ok', percorso: 'G:/x', tenere: 20 }), /G:\/x \(trovata\) · ne tiene 20/);
  // e lo stato le legge dal file dell'app
  const app = mkdtempSync(join(tmpdir(), 'mutant-app2-'));
  const cloud = mkdtempSync(join(tmpdir(), 'mutant-cloud3-'));
  salvaIstantanee(app, cloud, { dati: mkdtempSync(join(tmpdir(), 'mutant-dati2-')) });
  assert.equal(statoImpostazioni(app).istantanee.stato, 'ok');
});

test('CARTELLE: l’istantanea porta i personaggi, i veicoli e i PX — non la sessione intera', () => {
  assert.deepEqual(CARTELLE, ['personaggi', 'veicoli', 'px']);
  const { base, cartelle } = conDati();
  mkdirSync(join(base, 'mappe'), { recursive: true });
  writeFileSync(join(base, 'mappe', 'grossa.png'), Buffer.alloc(1024));
  const i = indiceIstantanea({ cartelle, adesso: new Date(2026, 10, 14, 23, 40), pc: 'PC-DAVIDE' });
  assert.equal(i.formato, 'mutant-istantanea');
  assert.equal(i.pc, 'PC-DAVIDE');
  const voci = vociIstantanea({ cartelle, indice: i });
  assert.ok(voci.every((v) => /^(personaggi|veicoli|px)\/|^istantanea\.json$/.test(v.nome)), 'niente mappe, niente immagini');
  assert.ok(voci.some((v) => v.nome === 'istantanea.json'));
});
