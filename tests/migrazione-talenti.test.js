// Passaggio ai Talenti v1.0 (lotto 2, 25/10/2026): copia, nota nel registro del master, rimozione, regimeTalenti,
// rapporto senza scritture, ripristino identico, e un tablet con la copia di prima che non rimette i Talenti tolti.
// Tutto su copie in una cartella temporanea (i sette PG di tests/fixtures/talenti-vecchi/), mai su personaggi/.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readdirSync, readFileSync, copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { datiReali } from './helpers.js';
import { rapporto, applica, ripristina, zipDelPassaggio } from '../tools/migra-talenti.mjs';
import { pianoMigrazione } from '../src/migrazione-talenti.js';
import { controllaTalentiDaTablet } from '../src/talenti-tablet.js';
import { postiTalenti, applicaSceltaTalento, scelteSuccessive, applicaSceltaSuccessiva } from '../src/avanzamento.js';
import { creaServer } from '../server.mjs';

const { dati } = await datiReali();
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const pg = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json');
const radice = mkdtempSync(join(tmpdir(), 'mutant-talenti-'));
const cartella = join(radice, 'personaggi');
const salvataggi = join(radice, 'salvataggi');
const leggi = (f) => readFileSync(join(cartella, f), 'utf8');
const PORTA_SPENTA = 9; // nessun server: il programma ne avvia uno suo, sulla stessa cartella

before(() => { mkdirSync(cartella, { recursive: true }); for (const f of pg) copyFileSync(new URL(f, FIX), join(cartella, f)); });
after(() => rmSync(radice, { recursive: true, force: true }));

test('il rapporto dice Talenti, categorie, posti e casi da guardare, e non scrive niente (chiudere senza SI)', async () => {
  const prima = Object.fromEntries(pg.map((f) => [f, leggi(f)]));
  const r = await rapporto({ cartella, d: dati });
  assert.equal(r.piani.length, 7);
  assert.equal(r.daFare.length, 7);
  const testo = r.righe.join('\n');
  assert.match(testo, /OSHI NAGATA — 6° livello\n.*Schermidore \(3°\) → Maestria; Risorse Interiori \(5°\) → Talento Libero/);
  assert.match(testo, /Tecniche conosciute 3, ammesse 0.*A\.184/);
  assert.match(testo, /Dimitri Orlav[\s\S]*Ritualista Maggiore richiede Ritualista Minore \(A\.183/);
  assert.match(testo, /Posti da riempire: 2 Specializzazione, 2 Maestria, 2 Talento Libero/);
  for (const f of pg) assert.equal(leggi(f), prima[f], `${f} non deve cambiare`);
  assert.equal(zipDelPassaggio(salvataggi).length, 0, 'nessuna copia senza SI');
});

test('il passaggio: copia zip, poi per ogni PG nota nel registro, Talenti tolti dai livelli, regimeTalenti = 2', async () => {
  const r = await applica({ cartella, salvataggi, porta: PORTA_SPENTA, d: dati });
  assert.deepEqual(r.errori, []);
  assert.equal(r.fatti.length, 7);
  assert.ok(existsSync(r.copia.zip));
  assert.equal(r.copia.file, 7);
  for (const f of pg) {
    const o = JSON.parse(leggi(f));
    assert.equal(o.scelte.regimeTalenti, 2, f);
    assert.ok(o.livelli.every((v) => !v.talentoLibero), `${f}: nessun talentoLibero`);
    const nota = o.correzioni_master.at(-1);
    assert.match(nota.etichetta, /^Talenti prima del passaggio ai Talenti v1\.0 \(\d\d\/\d\d\/\d{4}\): 3° livello: .+ — ora .+; 5° livello: .+ — ora .+\./);
    assert.equal(nota.talentiPrima.length, 2, `${f}: elenco strutturato`);
    assert.equal(nota.tipo, 'scelta');
    assert.equal(o.aggiornato_da, 'master', 'scritto dal salvataggio normale, come il master');
  }
  // dal salvataggio normale: la copia di prima è nello storico
  assert.ok(existsSync(join(cartella, 'storico')));
  // i posti restano vuoti, da riempire dalla scheda
  const oshi = JSON.parse(leggi(pg.find((f) => f.startsWith('OSHI'))));
  const posti = postiTalenti({ creazione: oshi.scelte, livelli: oshi.livelli }, dati, { opzioni: false });
  assert.equal(posti.regime, 'nuovo');
  assert.deepEqual(Object.values(posti.categorie).map((c) => c.mancanti), [2, 2, 2]);
  // le Tecniche di Oshi non si toccano (A.184)
  assert.equal(oshi.livelli.flatMap((v) => v.tecniche ?? []).length, 3);
  // un secondo passaggio non rifà niente
  assert.equal((await rapporto({ cartella, d: dati })).daFare.length, 0);
});

test('un tablet con la copia di prima del passaggio non rimette i Talenti tolti', async () => {
  const f = pg.find((x) => x.startsWith('Dimitri'));
  const vecchio = readFileSync(new URL(f, FIX), 'utf8');
  const dopo = leggi(f);
  // il controllo puro
  const c = controllaTalentiDaTablet(JSON.parse(vecchio), JSON.parse(dopo), dati);
  assert.equal(c.ok, false);
  assert.equal(c.stato, 409);
  // dal server vero, come un tablet (non il PC del Direttore)
  const srv = creaServer({ cartella, tavolo: join(radice, 'tavolo'), scontri: join(radice, 'scontri'), nemici: join(radice, 'nemici'), scene: join(radice, 'scene'), mappe: join(radice, 'mappe'), px: join(radice, 'px'), eMaster: () => false });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  try {
    const r = await fetch(`http://127.0.0.1:${srv.address().port}/api/personaggi/${encodeURIComponent(f)}`, { method: 'PUT', body: vecchio });
    assert.equal(r.status, 409);
    assert.match((await r.json()).errore, /prima del passaggio ai Talenti nuovi/);
    assert.equal(leggi(f), dopo, 'il file resta quello del passaggio');
    // anche scrivendo un file con un nome nuovo (la data di oggi): il confronto è con il file attuale del personaggio
    const nuovoNome = f.replace(/_\d{4}-\d{2}-\d{2}\.json$/, '_2026-10-27.json');
    const r2 = await fetch(`http://127.0.0.1:${srv.address().port}/api/personaggi/${encodeURIComponent(nuovoNome)}`, { method: 'PUT', body: vecchio });
    assert.equal(r2.status, 409);
    assert.equal(existsSync(join(cartella, nuovoNome)), false, 'nessun file nuovo con i Talenti di prima');
  } finally { await new Promise((ok) => srv.close(ok)); }
});

test('dal tablet: solo opzioni ammesse, niente nei posti chiusi; il Direttore può forzare', () => {
  const f = pg.find((x) => x.startsWith('Dimitri'));
  const disco = JSON.parse(leggi(f));
  const p = { creazione: disco.scelte, livelli: disco.livelli };
  const conScelta = (posto, scelta) => { const n = applicaSceltaTalento(p, posto, scelta); return { ...disco, scelte: n.creazione, livelli: n.livelli }; };
  // ammessa: Informatica è nell'elenco del Tecnomante
  assert.equal(controllaTalentiDaTablet(conScelta({ categoria: 'specializzazione', livello: 1 }, { id: 'specializzazione-informatica' }), disco, dati).ok, true);
  // non ammessa: Spade non è nell'elenco; Ritualista Maggiore al 2° senza il Minore
  const spade = controllaTalentiDaTablet(conScelta({ categoria: 'specializzazione', livello: 1 }, { id: 'specializzazione-spade' }), disco, dati);
  assert.equal(spade.stato, 403);
  assert.match(spade.errore, /non è nell’elenco del Tecnomante/);
  assert.equal(controllaTalentiDaTablet(conScelta({ categoria: 'maestria', livello: 2 }, { id: 'ritualista-maggiore' }), disco, dati).stato, 403);
  // chiusi dal Direttore: il tablet non li cambia e non riapre
  const chiuso = { ...disco, scelte: { ...disco.scelte, talentiChiusiFino: 6, specializzazioneIniziale: { id: 'specializzazione-informatica' } } };
  const cambiato = { ...chiuso, scelte: { ...chiuso.scelte, specializzazioneIniziale: { id: 'specializzazione-laboratorio' } } };
  assert.match(controllaTalentiDaTablet(cambiato, chiuso, dati).errore, /l’ha chiusa il Direttore/);
  assert.equal(controllaTalentiDaTablet({ ...chiuso, scelte: { ...chiuso.scelte, talentiChiusiFino: null } }, chiuso, dati).stato, 403);
  // il passaggio lo fa solo il Direttore: un tablet non porta un PG di prima nei Talenti nuovi
  const vecchio = JSON.parse(readFileSync(new URL(f, FIX), 'utf8'));
  assert.equal(controllaTalentiDaTablet({ ...vecchio, scelte: { ...vecchio.scelte, regimeTalenti: 2 } }, vecchio, dati).stato, 403);
  // un PG di prima resta com'era: nessun controllo nuovo sui suoi salvataggi
  assert.equal(controllaTalentiDaTablet(vecchio, vecchio, dati).ok, true);
});

test('27/10 (lotto 131), dal tablet: gli Incantesimi aperti da un Talento si scelgono sempre; quota e livello massimo sono un avviso, mai un blocco', () => {
  const f = pg.find((x) => x.startsWith('Dimitri'));
  const disco0 = JSON.parse(leggi(f));
  // sul disco: Incrementare Incantesimi al 3° livello, i 2 incantesimi ancora da scegliere
  const p0 = applicaSceltaTalento({ creazione: disco0.scelte, livelli: disco0.livelli }, { categoria: 'talento_libero', livello: 3 }, { id: 'incrementare-incantesimi' });
  const disco = { ...disco0, scelte: p0.creazione, livelli: p0.livelli };
  const s = scelteSuccessive(p0, dati).find((x) => x.tipo === 'incantesimi' && x.livello === 3);
  assert.equal(s.quanti, 2);
  // nessuna opzione è in grigio: tutte ammesse, con un avviso se oltre livello o quota
  assert.ok(s.opzioni.every((o) => o.ammesso && o.motivo === null), 'nessun blocco');
  const troppoAlto = s.opzioni.find((o) => /oltre il livello massimo/.test(o.avviso ?? ''));
  assert.ok(troppoAlto, 'avviso del livello presente');
  const ammesso = s.opzioni.find((o) => !o.avviso);
  const conIncantesimo = (nome) => { const n = applicaSceltaSuccessiva(p0, s, nome); return { ...disco, livelli: n.livelli }; };
  assert.equal(controllaTalentiDaTablet(conIncantesimo(ammesso.id), disco, dati).ok, true);
  assert.equal(controllaTalentiDaTablet(conIncantesimo(troppoAlto.id), disco, dati).ok, true, 'oltre il livello massimo: avviso, il tablet scrive');
  // tre al posto di due: oltre la quota, ma il tablet scrive lo stesso
  const tre = s.opzioni.filter((o) => !o.avviso).slice(0, 3).reduce((q, o) => applicaSceltaSuccessiva(q, s, o.id), p0);
  assert.equal(controllaTalentiDaTablet({ ...disco, livelli: tre.livelli }, disco, dati).ok, true);
  // e anche con i posti chiusi dal Direttore
  const chiuso = { ...disco, scelte: { ...disco.scelte, talentiChiusiFino: 99 } };
  assert.equal(controllaTalentiDaTablet({ ...chiuso, livelli: conIncantesimo(ammesso.id).livelli }, chiuso, dati).ok, true, 'la chiusura non riguarda gli incantesimi');
});

test('il piano non cambia un PG già passato; i casi sono quelli della regola di ogni domanda aperta', () => {
  const oshi = JSON.parse(readFileSync(new URL(pg.find((f) => f.startsWith('OSHI')), FIX), 'utf8'));
  const piano = pianoMigrazione(oshi, dati, { quando: new Date(2026, 9, 26, 20, 0) });
  assert.equal(piano.casi.length, 1, 'un caso solo, non ripetuto');
  assert.equal(piano.nuovo.correzioni_master.at(-1).etichetta, 'Talenti prima del passaggio ai Talenti v1.0 (26/10/2026): 3° livello: Schermidore — ora Maestria; 5° livello: Risorse Interiori — ora Talento Libero. Talenti di Classe (restano): 4° livello: Carica Brutale.');
  assert.equal(pianoMigrazione(piano.nuovo, dati).giaMigrato, true);
});

test('«Ripristina com’era prima»: i file tornano identici a prima del passaggio', () => {
  // dopo il passaggio il server ha scritto un PG in un file nuovo (nome con la data del salvataggio): va tolto
  const primo = JSON.parse(leggi(pg[0]));
  const nuovo = pg[0].replace(/_\d{4}-\d{2}-\d{2}\.json$/, '_2026-10-26.json');
  writeFileSync(join(cartella, nuovo), JSON.stringify({ ...primo, nome_prova: 'scelte dopo il passaggio' }));
  // un file di un altro personaggio (non nello zip) resta
  writeFileSync(join(cartella, 'Estraneo_liv1_2026-10-26.json'), JSON.stringify({ formato: 'mutant-personaggio', pg: 'pg-estraneo' }));
  const r = ripristina({ cartella, salvataggi });
  assert.equal(r.rimessi, 7);
  assert.deepEqual(r.tolti, [nuovo]);
  assert.equal(existsSync(join(cartella, nuovo)), false, 'niente due file per lo stesso personaggio');
  assert.ok(existsSync(join(cartella, 'Estraneo_liv1_2026-10-26.json')));
  rmSync(join(cartella, 'Estraneo_liv1_2026-10-26.json'));
  for (const f of pg) assert.equal(leggi(f), readFileSync(new URL(f, FIX), 'utf8'), `${f} identico`);
  assert.ok(existsSync(r.sicurezza), 'com’era prima del ripristino resta in una copia');
});
