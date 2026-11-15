import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 200 (15/11/2026): **un personaggio, non un file.**
//
// **Perché questo test esiste, e perché gira su una cartella con più versioni.** L'istantanea del 14/11/2026 ha
// mostrato che la cartella vera di Davide contiene **37 file per sette personaggi**: cinque versioni datate
// ciascuno, perché l'app salva un file nuovo a ogni serata e non sovrascrive. Tutti i nostri strumenti erano
// provati su una cartella con **un file per personaggio**, dove file e personaggio sono la stessa cosa: così
// `tools/adegua-abilita.mjs` ha potuto camminare sui file per due giorni senza che niente diventasse rosso.
//
// Il danno peggiore non era il conto. `--annulla NOME` prendeva il **primo** file con quel nome — cioè la versione
// più vecchia — la riportava indietro, lasciava **adeguato il file attuale** e diceva di aver annullato. Alla serata
// dell'adeguamento quello è l'unico attrezzo di sicurezza: se un giocatore sbaglia e l'annullamento mente, non c'è
// una seconda rete.
//
// **I due controlli che devono restare verdi sempre:**
//   1. nessuno strumento pianifica più voci dei personaggi che ci sono;
//   2. `--annulla` non dichiara di aver annullato un personaggio il cui file attuale è ancora adeguato.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { rapporto, applica, annulla, stato } from '../tools/adegua-abilita.mjs';
import { fileAttuale, idStabileDiFile } from '../src/cartella.js';
import { PROFILO_NUOVO } from '../src/competenze.js';
import { cartellaComeDavide, improntaCartella, differenze, SETTE } from './cartella-come-davide.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
// il Predicatore d'esempio è bloccato dalla A.267, e `applica` non scrive per nessuno se anche uno solo è bloccato:
// le prove che devono arrivare a scrivere lo lasciano fuori, dicendolo
const SENZA_PREDICATORE = { escludi: ['Fratello-Anselmo-Viri'] };

/** Il file attuale di un personaggio, scelto come lo scelgono l'app, il server e il menu. */
function attualeDi(cartella, nome) {
  const righe = readdirSync(cartella).filter((f) => f.endsWith('.json')).map((f) => {
    const o = JSON.parse(readFileSync(join(cartella, f), 'utf8'));
    return { file: f, pg: o.pg ?? null, aggiornato: o.aggiornato_il ?? null, o };
  });
  const miei = righe.filter((r) => String(r.o?.scelte?.nome ?? '').trim() === nome);
  const a = fileAttuale(miei);
  return a ? { ...a, percorso: join(cartella, a.file) } : null;
}

/** Un file è adeguato quando dichiara il profilo nuovo: è il contrassegno che la procedura scrive. */
const eAdeguato = (o) => o?.scelte?.regimeAbilita === PROFILO_NUOVO;
const adeguati = (cartella) => readdirSync(cartella).filter((f) => f.endsWith('.json'))
  .filter((f) => eAdeguato(JSON.parse(readFileSync(join(cartella, f), 'utf8'))));

// --- 1. nessuno pianifica più voci dei personaggi che ci sono ----------------------------------------------

test('la pianificazione conta i personaggi, non i file: sette righe su una cartella da trentacinque', async () => {
  const c = cartellaComeDavide();
  assert.equal(c.quantiFile, 35, 'la cartella di collaudo deve somigliare a quella vera: più versioni per personaggio');
  assert.equal(c.voci.length, 7);

  const r = await rapporto({ cartella: c.cartella, d: dati });
  assert.equal(r.piani.length, c.voci.length,
    `pianificate ${r.piani.length} voci per ${c.voci.length} personaggi: su una cartella vera diventano 37 righe invece di 7`);

  // e ogni personaggio compare una volta sola, sul suo file attuale
  const conte = new Map();
  for (const p of r.piani) conte.set(p.nome, (conte.get(p.nome) ?? 0) + 1);
  for (const [nome, n] of conte) assert.equal(n, 1, `${nome} compare ${n} volte`);
  for (const p of r.piani) {
    const a = attualeDi(c.cartella, p.nome);
    assert.equal(p.file, a.file, `${p.nome}: il piano è sul file ${p.file}, l’attuale è ${a.file}`);
  }
});

test('«Controlla lo stato» dice sette righe, e dice su quale file si è basato', async () => {
  const c = cartellaComeDavide();
  const s = await stato({ cartella: c.cartella, d: dati });
  const righe = Array.isArray(s) ? s : s.righe ?? s.piani ?? [];
  assert.equal(righe.length, c.voci.length, `${righe.length} righe per ${c.voci.length} personaggi`);
  for (const x of righe) assert.ok(x.file, 'ogni riga dice su quale file si è basata: senza, non si sa cosa si è guardato');
});

// --- 2. l'annullamento non mente --------------------------------------------------------------------------

test('--annulla riporta il FILE ATTUALE, non la versione più vecchia che ha quel nome', async () => {
  const c = cartellaComeDavide(SENZA_PREDICATORE);
  const e = await applica({ cartella: c.cartella, salvataggi: c.salvataggi, d: dati });
  assert.ok(e.fatto, `applica non ha scritto: ${e.motivo}`);
  assert.equal(e.scritti.length, c.voci.length, 'si scrive una volta per personaggio, non una per file');

  // dopo applica: adeguato il file attuale di ciascuno, e SOLO quello
  for (const v of c.voci) {
    const a = attualeDi(c.cartella, v.nome);
    assert.equal(a.file, v.attuale.nome, `${v.nome}: l’attuale è cambiato sotto i piedi`);
    assert.ok(eAdeguato(a.o), `${v.nome}: il file attuale non è adeguato`);
  }
  assert.equal(adeguati(c.cartella).length, c.voci.length, 'adeguate anche le versioni vecchie: non si toccano');

  // l'annullamento di uno: deve riportare il file attuale
  const chi = c.voci[0].nome;
  const r = await annulla({ cartella: c.cartella, chi, d: dati });
  assert.ok(r.ok, `annulla ha rifiutato: ${r.motivo}`);
  const dopo = attualeDi(c.cartella, chi);
  assert.ok(!eAdeguato(dopo.o),
    `annulla ha detto «fatto» ma il file attuale (${dopo.file}) è ancora adeguato: è la bugia che al tavolo non ha una seconda rete`);
  assert.equal(r.file, dopo.file, 'annulla deve dire su quale file ha agito, e deve essere l’attuale');

  // e non ha toccato gli altri
  for (const v of c.voci.slice(1)) {
    const a = attualeDi(c.cartella, v.nome);
    assert.ok(eAdeguato(a.o), `${v.nome}: annullare un personaggio ne ha toccato un altro`);
  }
});

test('annullare riporta il file byte per byte, su una cartella con cinque versioni per personaggio', async () => {
  const c = cartellaComeDavide(SENZA_PREDICATORE);
  const prima = improntaCartella(c.cartella);
  const e = await applica({ cartella: c.cartella, salvataggi: c.salvataggi, d: dati });
  assert.ok(e.fatto, e.motivo);
  // toccati solo i sette file attuali
  const toccati = differenze(prima, improntaCartella(c.cartella));
  assert.deepEqual(
    toccati.map((x) => x.file).sort(),
    c.voci.map((v) => v.attuale.nome).sort(),
    'applica ha toccato file che non sono gli attuali',
  );
  // annullati tutti e sette, la cartella torna identica
  for (const v of c.voci) {
    const r = await annulla({ cartella: c.cartella, chi: v.nome, d: dati });
    assert.ok(r.ok, `${v.nome}: ${r.motivo}`);
  }
  assert.deepEqual(differenze(prima, improntaCartella(c.cartella)), [],
    'la cartella non è tornata identica byte per byte: con sette persone che aspettano non si rifà la serata');
});

test('--annulla si rifiuta invece di scegliere: nome che non c’è, nome ambiguo', async () => {
  const c = cartellaComeDavide(SENZA_PREDICATORE);
  await applica({ cartella: c.cartella, salvataggi: c.salvataggi, d: dati });

  const nessuno = await annulla({ cartella: c.cartella, chi: 'CHI NON ESISTE', d: dati });
  assert.equal(nessuno.ok, false);
  assert.match(String(nessuno.motivo), /non trovo/i);

  // due personaggi diversi con lo stesso nome: si rifiuta e li elenca, invece di prenderne uno
  const a = attualeDi(c.cartella, c.voci[1].nome);
  const clone = { ...a.o, pg: 'pg-collaudo-omonimo', scelte: { ...a.o.scelte, nome: c.voci[0].nome } };
  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(c.cartella, `OMONIMO_liv${1 + (clone.livelli?.length ?? 0)}_2026-11-12.json`), `${JSON.stringify(clone, null, 2)}\n`);
  const ambiguo = await annulla({ cartella: c.cartella, chi: c.voci[0].nome, d: dati });
  assert.equal(ambiguo.ok, false, 'con due personaggi dello stesso nome ha scelto il primo che ha trovato');
  assert.match(String(ambiguo.motivo), /pi(ù|u) d|ambigu/i);
});

// --- la cartella di collaudo è davvero come quella vera ---------------------------------------------------

test('la cartella di collaudo somiglia a quella di Davide: nomi, date, livelli e un identificativo per personaggio', () => {
  const c = cartellaComeDavide();
  for (const v of c.voci) {
    assert.equal(v.file.length, 5, `${v.nome}: cinque versioni, come nella cartella vera`);
    const id = new Set(v.file.map((f) => idStabileDiFile({ file: f.nome, pg: v.pg })));
    assert.equal(id.size, 1, `${v.nome}: le versioni non si raggruppano in un personaggio solo`);
    const date = v.file.map((f) => f.data);
    assert.deepEqual([...date].sort(), date, `${v.nome}: le date non sono in ordine`);
  }
  assert.deepEqual(c.voci.map((v) => v.nome), SETTE.map((s) => s.nome));
});
