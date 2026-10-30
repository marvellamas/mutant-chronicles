// A.206 (risposta di Davide del 30/10/2026): la Parata a Mani Nude è compresa nell'Addestramento al Combattimento Senz'Armi del
// I Grado del Lottatore; il Talento a scelta diventa «Parata a Mani Nude Migliorata» (+2 VA alle Difese per parare a mani nude).
// Le scelte già fatte del vecchio Talento si riconducono al nuovo: l'app lo fa leggendo il nome di prima, lo strumento
// tools/migra-parata.mjs lo scrive nel file (provato su copie).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { nuoveScelte } from '../src/character.js';
import { talentoAScelta } from '../src/avanzamento.js';
import { effettiTalenti } from '../src/talenti.js';
import { pianoParata, applicaParata, rapporto, VECCHIO, NUOVO } from '../tools/migra-parata.mjs';
import { datiReali } from './helpers.js';
import { tiro } from './personaggi.js';

const { dati } = await datiReali();
const N = 'Addestramento al Combattimento Senz’Armi';
const lottatore = dati.classi.classi.find((c) => c.nome === 'Lottatore');
const CREAZIONE = {
  ...nuoveScelte(), nome: 'Brutus', corporazione: 'Bauhaus', puntiCaratteristica: { FOR: 2, COS: 1, DES: 2 },
  addestramento: 'Combattente', classe: 'Lottatore', puntiEroe: tiro(5), parametriTalenti: { [N]: 'guardia' },
  puntiAbilitaLiberi: { 'Corpo a corpo': 2, 'Percezione': 2, 'Medicina': 1, 'Sopravvivenza': 2 },
};
const voceGrado2 = (talentoClasse) => ({
  livello: 4, grado: { classe: 'Lottatore' }, tiroPV: tiro(4), talentoClasse,
  puntiAbilita: { 'Armi da guerra': 3, 'Armi leggere': 2, 'Tecnologia': 2 },
});
const livelliAl4 = (talentoClasse) => [
  { livello: 2, caratteristiche: { FOR: 1, COS: 1 } }, { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } }, voceGrado2(talentoClasse),
];

test('dati: la Parata a Mani Nude è nell’Addestramento del I Grado, con le frasi del Giocatore §3.5.5 (a ogni Disciplina)', () => {
  const acs = lottatore.talenti_fissi[0];
  assert.equal(acs.nome, N);
  assert.match(acs.testo, /Parata a Mani Nude\. Può utilizzare Difese per parare attacchi ravvicinati senza impugnare armi o scudi/);
  assert.match(acs.testo, /il successo dimezza per eccesso il danno prima dell’Armatura; il Successo Magistrale annulla il danno/);
  assert.match(acs.testo, /Parata Istintiva, può utilizzare anche a mani nude la Parata gratuita concessa una volta per Round/);
  assert.match(acs.testo, /Non richiede PM\./);
  // nessuna delle quattro Discipline ne è condizione: il testo è del Talento, non del parametro
  assert.ok(acs.parametro.opzioni.every((o) => !/Parata a Mani Nude/.test(JSON.stringify(o))));
  // il vecchio Talento a scelta non c’è più, c’è il Migliorato con il nome di prima come alias
  assert.ok(!lottatore.talenti_a_scelta.some((t) => t.nome === VECCHIO));
  const mig = lottatore.talenti_a_scelta.find((t) => t.nome === NUOVO);
  assert.deepEqual(mig.nomi_precedenti, [VECCHIO]);
  assert.equal(lottatore.talenti_a_scelta.length, 5);
  assert.match(mig.testo, /\+2 VA alle Prove di Difese effettuate per Parare a mani nude/);
  assert.match(mig.testo, /si somma a quello della Disciplina Guardia/);
});

test('il nome di prima si riconduce al Talento nuovo; un nome qualunque no', () => {
  assert.equal(talentoAScelta(lottatore, VECCHIO).nome, NUOVO);
  assert.equal(talentoAScelta(lottatore, NUOVO).nome, NUOVO);
  assert.equal(talentoAScelta(lottatore, 'Punto Debole').nome, 'Punto Debole');
  assert.equal(talentoAScelta(lottatore, 'Inesistente'), undefined);
  assert.equal(talentoAScelta(lottatore, undefined), undefined);
});

test('un Lottatore che aveva il vecchio Talento: la scheda è la stessa con il nome di prima e con il nuovo, senza errori', () => {
  const prima = calcolaScheda({ creazione: CREAZIONE, livelli: livelliAl4(VECCHIO) }, dati);
  const dopo = calcolaScheda({ creazione: CREAZIONE, livelli: livelliAl4(NUOVO) }, dati);
  assert.deepEqual(prima.errori, []);
  assert.deepEqual(dopo.errori, []);
  assert.deepEqual(prima.classi[0].talenti.map((t) => t.nome), dopo.classi[0].talenti.map((t) => t.nome));
  assert.ok(prima.classi[0].talenti.some((t) => t.nome === NUOVO));
  assert.ok(!prima.classi[0].talenti.some((t) => t.nome === VECCHIO));
  // la validazione del livello accetta il nome di prima
  const p3 = { creazione: CREAZIONE, livelli: livelliAl4(VECCHIO).slice(0, 2) };
  const { livello, ...v } = voceGrado2(VECCHIO);
  assert.deepEqual(validaLivello(p3, v, dati).filter((e) => e.campo === 'talentoClasse'), []);
  assert.ok(validaLivello(p3, { ...v, talentoClasse: 'Parata Fantasma' }, dati).some((e) => e.campo === 'talentoClasse'));
});

test('+2 VA a Difese per parare a mani nude: uso specifico, nei dati del Talento, sommabile alla Guardia, non alla Schivata', () => {
  const s = calcolaScheda({ creazione: CREAZIONE, livelli: livelliAl4(VECCHIO) }, dati);
  const e = effettiTalenti(s, dati).filter((x) => x.talento === NUOVO);
  assert.equal(e.length, 1);
  assert.deepEqual([e[0].abilita, e[0].valore, e[0].ambito, e[0].uso], ['Difese', 2, 'uso_specifico', 'Parare a mani nude']);
  assert.ok(!e.some((x) => x.abilita === 'Schivata'));
});

// ---- la migrazione: su copie, mai sulla cartella vera ------------------------------------------------------------
const pg = (talentoClasse, classe = 'Lottatore') => ({
  formato: 'mutant-personaggio', pg: 'p1', scelte: { nome: 'X', note: 'ha la Parata a Mani Nude' },
  livelli: [{ livello: 2 }, { livello: 4, grado: { classe }, talentoClasse }],
});

test('migrazione: il piano riconduce solo le scelte del Lottatore e dice perché non tocca le altre', () => {
  assert.deepEqual(pianoParata(pg(VECCHIO)).ricondotte.map((r) => [r.indice, r.livello, r.classe]), [[1, 4, 'Lottatore']]);
  const altra = pianoParata(pg(VECCHIO, 'Agente'));
  assert.equal(altra.ricondotte.length, 0);
  assert.match(altra.nonRicondotte[0].perche, /non di un Lottatore/);
  const doppia = pg(VECCHIO); doppia.livelli.push({ livello: 8, grado: { classe: 'Lottatore' }, talentoClasse: NUOVO });
  assert.equal(pianoParata(doppia).ricondotte.length, 0);
  assert.match(pianoParata(doppia).nonRicondotte[0].perche, /già «Parata a Mani Nude Migliorata»/);
  // il nome di prima in un testo libero (una nota) non è una scelta: si dice dove sta e non si riscrive
  assert.ok(pianoParata(pg(VECCHIO)).nonRicondotte.some((n) => n.dove.includes('scelte.note') && /testo libero/.test(n.perche)));
  assert.equal(pianoParata(pg(NUOVO)).ricondotte.length, 0);
});

test('migrazione: applicaParata riscrive solo il nome, su una copia; il resto del file è identico', () => {
  const o = pg(VECCHIO);
  const c = applicaParata(o);
  assert.equal(o.livelli[1].talentoClasse, VECCHIO);
  assert.equal(c.livelli[1].talentoClasse, NUOVO);
  assert.deepEqual({ ...c, livelli: [] }, { ...o, livelli: [] });
  assert.deepEqual(c.livelli[0], o.livelli[0]);
});

test('migrazione: il rapporto legge una cartella senza scriverla; lo strumento rifiuta le cartelle vere', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'parata-'));
  try {
    writeFileSync(join(dir, 'a.json'), JSON.stringify(pg(VECCHIO)));
    writeFileSync(join(dir, 'b.json'), JSON.stringify({ ...pg(NUOVO), pg: 'p2', scelte: { nome: 'Y' } }));
    writeFileSync(join(dir, 'c.json'), '{ non json');
    writeFileSync(join(dir, 'd.json'), JSON.stringify({ formato: 'altro' }));
    const r = rapporto(dir);
    assert.deepEqual(r.map((x) => x.nome).sort(), ['a.json']);
    assert.equal(readFileSync(join(dir, 'a.json'), 'utf8'), JSON.stringify(pg(VECCHIO)));
    assert.equal(readdirSync(dir).length, 4);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('nessun personaggio della cartella dei test (le copie dei sette PG) nomina il vecchio Talento: la migrazione ne tocca 0', () => {
  const r = rapporto(new URL('./fixtures/talenti-vecchi/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  assert.deepEqual(r, []);
});
