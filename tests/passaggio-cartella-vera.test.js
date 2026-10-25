// 25/10/2026 sera: il passaggio ai Talenti nuovi sulla cartella com'era davvero sul fisso di Marcello, non sulle copie
// pulite. Più file dello stesso personaggio (la data del giorno nel nome), tutti con la stessa data di modifica (come
// dopo un ripristino), uno solo scritto dal server (`aggiornato_il`), lo storico, config-salvataggi.json accanto; il
// passaggio fatto due volte e il ripristino. Il controllo è sempre quello che vede l'app: il server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { datiReali } from './helpers.js';
import { applica, ripristina, controllaSulServer, zipDaRipristinare, zipDelPassaggio, statoPassaggio, copiaZip } from '../tools/migra-talenti.mjs';
import { statoDaDisco, perPersonaggio, elencoDaDisco } from '../tools/stato-personaggi.mjs';
import { fileAttuale } from '../src/cartella.js';
import { postiTalenti } from '../src/avanzamento.js';
import { deserializzaPersonaggio } from '../src/character.js';

const { dati } = await datiReali();
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const fixture = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json');
const radice = mkdtempSync(join(tmpdir(), 'mutant-cartella-vera-'));
const cartella = join(radice, 'personaggi');
const salvataggi = join(radice, 'salvataggi');
const leggi = (f) => JSON.parse(readFileSync(join(cartella, f), 'utf8'));
// una porta su cui non c'è nessuno: il controllo avvia un Mutant solo per sé, come fa la voce 7 a Mutant spento
const PORTA = 1;

/** Il personaggio come lo apre l'app: il file attuale (la stessa funzione dell'app e del server). */
const attuale = (nome) => {
  const g = perPersonaggio(elencoDaDisco(cartella)).find((x) => x.attuale.nome.toUpperCase().startsWith(nome.toUpperCase()));
  return { file: g.attuale.file, o: g.attuale.o, files: g.files.length };
};

before(() => {
  mkdirSync(cartella, { recursive: true });
  mkdirSync(join(cartella, 'storico', 'pg-qualcosa'), { recursive: true });
  writeFileSync(join(cartella, 'storico', 'pg-qualcosa', '2026-10-09T06-05-10.json'), '{"vecchio":true}');
  writeFileSync(join(radice, 'config-salvataggi.json'), '{"autosave_minuti":5,"cartella_drive":""}');
  for (const f of fixture) writeFileSync(join(cartella, f), readFileSync(new URL(f, FIX)));
  // tre personaggi con un secondo file, con la data di oggi: è quello scritto dal server (aggiornato_il), con un
  // segno nel contenuto per riconoscerlo
  for (const f of fixture.filter((x) => /^(LUCAS|MICHELE|Pablo)/.test(x))) {
    const o = JSON.parse(readFileSync(new URL(f, FIX), 'utf8'));
    const nuovo = f.replace(/_\d{4}-\d{2}-\d{2}\.json$/, '_2026-10-25.json');
    writeFileSync(join(cartella, nuovo), JSON.stringify({ ...o, aggiornato_il: '2026-10-25T13:50:48.000Z', aggiornato_da: 'giocatore', scelte: { ...o.scelte, concetto: 'IL FILE DI OGGI' } }, null, 2));
  }
  // tutti con la stessa data di modifica, al millisecondo (com'era dopo il ripristino delle 17:46)
  const t = new Date('2026-10-25T16:46:10.000Z');
  for (const f of readdirSync(cartella).filter((x) => x.endsWith('.json'))) utimesSync(join(cartella, f), t, t);
});
after(() => rmSync(radice, { recursive: true, force: true }));

test('il file attuale: quello scritto dal server per ultimo, anche a parità di data di modifica', () => {
  for (const n of ['LUCAS', 'MICHELE', 'Pablo']) {
    const a = attuale(n);
    assert.equal(a.files, 2, n);
    assert.match(a.file, /_2026-10-25\.json$/, `${n}: l'attuale è quello di oggi`);
    assert.equal(a.o.scelte.concetto, 'IL FILE DI OGGI');
  }
  // a parità di tutto, decide la data nel nome, non l'ordine della cartella
  const righe = [{ file: 'X_liv6_2026-10-25.json', mtime: 5 }, { file: 'X_liv6_2026-10-11.json', mtime: 5 }];
  assert.equal(fileAttuale(righe).file, 'X_liv6_2026-10-25.json');
  assert.equal(fileAttuale([...righe].reverse()).file, 'X_liv6_2026-10-25.json');
  // un file scritto dal server vince su uno di prima, anche se quello di prima ha la data di modifica più nuova
  assert.equal(fileAttuale([{ file: 'X_liv6_2026-10-11.json', mtime: 9e12 }, { file: 'X_liv6_2026-10-09.json', mtime: 1, aggiornato: '2026-10-20T10:00:00Z' }]).file, 'X_liv6_2026-10-09.json');
});

test('voce 7: un personaggio una volta (il suo file attuale), poi il controllo sul server: 7 su 7', async () => {
  const r = await applica({ cartella, salvataggi, porta: PORTA });
  assert.equal(r.fatti.length, 7, `un nome per personaggio, non per file: ${r.fatti.join(', ')}`);
  assert.equal(new Set(r.fatti).size, 7);
  assert.equal(r.controllo.ok, true, r.controllo.righe.join(' / '));
  assert.equal(r.controllo.righe[0], 'Controllato sul server: 7 personaggi su 7 con i Talenti nuovi.');
  // quello che apre l'app: il file di oggi, passato, con il suo contenuto (non la copia vecchia passata al suo posto)
  for (const n of ['LUCAS', 'MICHELE', 'Pablo']) {
    const a = attuale(n);
    assert.match(a.file, /_2026-10-25\.json$/, n);
    assert.equal(a.o.scelte.regimeTalenti, 2, n);
    assert.equal(a.o.scelte.concetto, 'IL FILE DI OGGI', n);
    const p = postiTalenti({ creazione: a.o.scelte, livelli: a.o.livelli }, dati, { opzioni: false });
    assert.deepEqual([p.categorie.talento_libero.mancanti, p.categorie.maestria.mancanti, p.categorie.specializzazione.mancanti], [2, 2, 2], n);
  }
  assert.deepEqual(statoPassaggio({ cartella, salvataggi }).passati, 7);
  assert.equal(statoDaDisco(cartella).filter((x) => x.nuovi).length, 7);
});

test('voce 7 rifatta su personaggi già passati: niente zip nuovo (era la trappola del ripristino che «non cambia niente»)', async () => {
  const prima = zipDelPassaggio(salvataggi).length;
  const r = await applica({ cartella, salvataggi, porta: PORTA });
  assert.equal(r.giaFatto, true);
  assert.equal(r.copia, null);
  assert.equal(zipDelPassaggio(salvataggi).length, prima);
  assert.equal(r.controllo.ok, true);
});

test('voce 8: torna da una copia di prima, anche se nel frattempo c\'è una copia dello stato già passato; controllo 0 su 7', async () => {
  // una copia «prima-dei-talenti-nuovi» dello stato GIÀ passato (le versioni di prima la facevano a ogni voce 7)
  copiaZip({ cartella, salvataggi, quando: new Date(Date.now() + 60000) });
  const ultimo = zipDelPassaggio(salvataggi)[0];
  const giusto = zipDaRipristinare(salvataggi);
  assert.notEqual(giusto, ultimo, 'non si torna allo zip dello stato già passato');
  const e = ripristina({ cartella, salvataggi });
  assert.equal(e.zip, giusto);
  const c = await controllaSulServer({ cartella, porta: PORTA, attesi: 'vecchi' });
  assert.equal(c.ok, true, c.righe.join(' / '));
  assert.equal(c.righe[0], 'Controllato sul server: 0 personaggi su 7 con i Talenti nuovi.');
  // il file attuale torna quello di oggi, con i Talenti di prima, anche se il ripristino li riscrive tutti insieme
  for (const n of ['LUCAS', 'MICHELE', 'Pablo']) {
    const a = attuale(n);
    assert.match(a.file, /_2026-10-25\.json$/, n);
    assert.equal(a.o.scelte.regimeTalenti, undefined, n);
    assert.equal(a.o.scelte.concetto, 'IL FILE DI OGGI', n);
  }
  // un personaggio di prima: nessun posto da scegliere, nessuna domanda sulla Specializzazione
  const pablo = attuale('Pablo').o;
  const p = deserializzaPersonaggio(JSON.stringify(pablo));
  assert.equal(postiTalenti(p, dati, { opzioni: false }).regime, 'vecchio');
  assert.ok(existsSync(join(cartella, 'storico', 'pg-qualcosa', '2026-10-09T06-05-10.json')), 'lo storico resta');
});

test('voce 7 di nuovo dopo il ripristino: 7 su 7', async () => {
  const r = await applica({ cartella, salvataggi, porta: PORTA });
  assert.equal(r.controllo.ok, true, r.controllo.righe.join(' / '));
  assert.equal(r.fatti.length, 7);
});
