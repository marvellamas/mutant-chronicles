// Tavolo del Master, pezzo 2 (docs/tavolo-direttore.md): ordine d'Iniziativa (Giocatore §2.14, §5.1,
// parità comprese), Round e turni, partecipanti a mano, durate degli Stati, revisione e archivio sul server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  nuovoScontro, aggiungiPartecipante, registraTiro, ordineIniziativa, spostaAlleato, diTurno, avanti, chiudi,
  registraDurata, durataStato, dadoIniziativa, validaScontro, togliPartecipante,
} from '../src/scontro.js';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const T0 = new Date(2026, 9, 1, 21, 0, 0);
const vivo = (valore) => ({ valore, origine: 'manuale' });
const nomi = (s) => ordineIniziativa(s).ordinati.map((p) => p.nome);

function conTiri(s, tiri) {
  return Object.entries(tiri).reduce((acc, [id, v]) => registraTiro(acc, id, 'd10', vivo(v), dati, T0), s);
}
const tre = () => nuovoScontro({
  id: 'scontro-prova', adesso: T0,
  pg: [
    { chiave: 'Ada', nome: 'Ada', iniziativa: 3, des: 7, int: 5 },
    { chiave: 'Bea', nome: 'Bea', iniziativa: 2, des: 6, int: 6 },
    { chiave: 'Cleo', nome: 'Cleo', iniziativa: 4, des: 7, int: 4 },
  ],
});

test('dado dai dati: 1d10 (regole.json → iniziativa); durate degli Stati «1+1d3 Round»', () => {
  assert.equal(dadoIniziativa(dati).formula, '1d10');
  const st = (id) => dati.regole.stati.elenco.find((s) => s.id === id);
  assert.deepEqual([durataStato(st('stordito')).minimo, durataStato(st('stordito')).massimo], [2, 4]);
  assert.equal(durataStato(st('a-terra')), null); // «fino a quando si rialza»: solo promemoria
});

test('ordine d’Iniziativa: valore + d10, chi non ha tirato resta da tirare; tiro fuori dal dado rifiutato', () => {
  let s = conTiri(tre(), { 'pg:Ada': 5, 'pg:Bea': 9 });
  assert.deepEqual(nomi(s), ['Bea', 'Ada']); // 11 contro 8
  assert.deepEqual(ordineIniziativa(s).daTirare.map((p) => p.nome), ['Cleo']);
  assert.throws(() => registraTiro(s, 'pg:Cleo', 'd10', vivo(11), dati), /da 1 a 10/);
  s = conTiri(s, { 'pg:Cleo': 1 });
  assert.deepEqual(nomi(s), ['Bea', 'Ada', 'Cleo']);
  assert.match(s.registro.at(-1).testo, /Iniziativa di Cleo: 4 \+ 1d10 1 \(dal vivo\) = 5/);
});

test('parità (§5.1): prima Destrezza, poi Intelligenza; fra alleati scelgono loro; con un avversario lo spareggio', () => {
  // Ada 3+5 = 8, DES 7; Bea 2+6 = 8, DES 6 → Ada prima per Destrezza
  let s = conTiri(tre(), { 'pg:Ada': 5, 'pg:Bea': 6, 'pg:Cleo': 1 });
  assert.deepEqual(nomi(s), ['Ada', 'Bea', 'Cleo']);
  // Ada 3+5 = 8 e Cleo 4+4 = 8, stessa DES 7 → Intelligenza: Ada (5) prima di Cleo (4)
  s = conTiri(tre(), { 'pg:Ada': 5, 'pg:Bea': 1, 'pg:Cleo': 4 });
  assert.deepEqual(nomi(s), ['Ada', 'Cleo', 'Bea']);
  // alleati pari anche su DES e INT: scelgono loro (↑ ↓), l'ordine resta salvato
  s = aggiungiPartecipante(tre(), { nome: 'Dino', base: 3, lato: 'alleato', des: 7, int: 5 }, T0);
  const dino = s.partecipanti.at(-1).id;
  s = conTiri(s, { 'pg:Ada': 5, [dino]: 5, 'pg:Bea': 1, 'pg:Cleo': 1 });
  assert.deepEqual(ordineIniziativa(s).scelteAlleati, [['pg:Ada', dino].sort((a, b) => a.localeCompare(b))]);
  const prima = nomi(s).slice(0, 2);
  s = spostaAlleato(s, s.partecipanti.find((p) => p.nome === prima[1]).id, -1, T0);
  assert.deepEqual(nomi(s).slice(0, 2), [prima[1], prima[0]]);
  // con un avversario alla pari (DES e INT ignote): serve lo spareggio con il dado, poi ordina; pari di nuovo → si ritira
  let t = aggiungiPartecipante(tre(), { nome: 'Sgherro', base: 3, lato: 'avversario' }, T0);
  const sg = t.partecipanti.at(-1).id;
  t = conTiri(t, { 'pg:Ada': 5, [sg]: 5, 'pg:Bea': 1, 'pg:Cleo': 1 });
  assert.deepEqual(ordineIniziativa(t).spareggi, [['pg:Ada', sg].sort((a, b) => a.localeCompare(b))].map((g) => ordineIniziativa(t).ordinati.filter((p) => g.includes(p.id)).map((p) => p.id)));
  t = registraTiro(registraTiro(t, 'pg:Ada', 'spareggio', vivo(4), dati, T0), sg, 'spareggio', vivo(4), dati, T0);
  assert.equal(ordineIniziativa(t).spareggi.length, 1); // 4 e 4: ancora pari, si ritira
  t = registraTiro(t, sg, 'spareggio', vivo(9), dati, T0);
  assert.deepEqual(ordineIniziativa(t).spareggi, []);
  assert.deepEqual(nomi(t).slice(0, 2), ['Sgherro', 'Ada']);
  // lo spareggio non cambia il Valore di Iniziativa
  assert.equal(t.partecipanti.find((p) => p.id === sg).base + 5, 8);
});

test('partecipante scritto a mano: provvisorio, entra nell’ordine; si può togliere', () => {
  let s = aggiungiPartecipante(tre(), { nome: 'Non Morto', base: 6, lato: 'avversario' }, T0);
  const nm = s.partecipanti.at(-1);
  assert.deepEqual([nm.provvisorio, nm.tipo, nm.lato], [true, 'manuale', 'avversario']);
  s = conTiri(s, { 'pg:Ada': 2, 'pg:Bea': 2, 'pg:Cleo': 2, [nm.id]: 7 });
  assert.equal(nomi(s)[0], 'Non Morto'); // 6+7 = 13
  assert.throws(() => aggiungiPartecipante(s, { nome: '', base: 3 }), /nome/);
  s = togliPartecipante(s, nm.id, T0);
  assert.ok(!nomi(s).includes('Non Morto'));
});

test('turni e Round: «Avanti» passa al successivo; dopo l’ultimo nuovo Round; le durate scalano', () => {
  let s = conTiri(tre(), { 'pg:Ada': 5, 'pg:Bea': 9, 'pg:Cleo': 1 });
  const stordito = dati.regole.stati.elenco.find((x) => x.id === 'stordito');
  s = registraDurata(s, 'pg:Ada', stordito, vivo(2), T0);
  assert.equal(diTurno(s).nome, 'Bea');
  s = avanti(s, T0); assert.equal(diTurno(s).nome, 'Ada');
  s = avanti(s, T0); assert.equal(diTurno(s).nome, 'Cleo');
  s = avanti(s, T0);
  assert.deepEqual([s.round, diTurno(s).nome, s.durate[0].rimasti], [2, 'Bea', 1]);
  assert.match(s.registro.at(-1).testo, /Round 2\. Tocca a Bea/);
  for (let i = 0; i < 3; i++) s = avanti(s, T0);
  assert.equal(s.round, 3);
  assert.deepEqual(s.durate, []);
  assert.match(s.registro.at(-1).testo, /Stordito di Ada è finito: toglilo dalla scheda/);
  // una durata non in Round («fino a quando si rialza») non si registra: solo promemoria
  assert.throws(() => registraDurata(s, 'pg:Ada', dati.regole.stati.elenco.find((x) => x.id === 'a-terra'), vivo(1)), /solo promemoria/);
  // registro: ora e Round per ogni evento
  assert.ok(s.registro.every((r) => r.ora && Number.isInteger(r.round) && r.testo));
});

const scontri = mkdtempSync(join(tmpdir(), 'mutant-scontri-'));
const cartella = mkdtempSync(join(tmpdir(), 'mutant-personaggi-'));
const tavolo = mkdtempSync(join(tmpdir(), 'mutant-tavolo-'));
let server;
let base;
before(async () => {
  server = creaServer({ cartella, tavolo, scontri });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); for (const d of [scontri, cartella, tavolo]) rmSync(d, { recursive: true, force: true }); });

const put = (s) => fetch(`${base}/api/scontri/${s.id}`, { method: 'PUT', body: JSON.stringify(s) });

test('server: revisione vecchia rifiutata (409 con lo scontro attuale); elenco degli aperti', async () => {
  const s0 = tre();
  assert.equal(validaScontro(s0), null);
  const r1 = await (await put(s0)).json();
  assert.equal(r1.revisione, 1);
  // due finestre partono dalla revisione 1: la prima salva, la seconda viene rifiutata
  const a = conTiri(r1, { 'pg:Ada': 5 });
  const b = conTiri(r1, { 'pg:Bea': 9 });
  assert.equal((await put(a)).status, 200);
  const rifiuto = await put(b);
  assert.equal(rifiuto.status, 409);
  const { attuale } = await rifiuto.json();
  assert.equal(attuale.revisione, 2);
  assert.ok(attuale.partecipanti.find((p) => p.id === 'pg:Ada').d10);
  // anche un nuovo file con revisione diversa da 0 è rifiutato
  assert.equal((await put({ ...tre(), id: 'scontro-altro', revisione: 3 })).status, 409);
  const elenco = await (await fetch(`${base}/api/scontri`)).json();
  assert.deepEqual(elenco.map((x) => [x.id, x.stato, x.revisione]), [['scontro-prova', 'aperto', 2]]);
  assert.equal((await put({ ...tre(), id: 'Con_Maiuscole' })).status, 400); // id fuori dal formato
});

test('server: fine scontro → il file passa in scontri/archivio/, non si cancella', async () => {
  const attuale = await (await fetch(`${base}/api/scontri/scontro-prova`)).json();
  const chiuso = await (await put(chiudi(attuale, T0))).json();
  assert.equal(chiuso.stato, 'chiuso');
  assert.ok(!existsSync(join(scontri, 'scontro-prova.json')));
  const archiviato = JSON.parse(readFileSync(join(scontri, 'archivio', 'scontro-prova.json'), 'utf8'));
  assert.deepEqual([archiviato.stato, archiviato.revisione], ['chiuso', 3]);
  assert.match(archiviato.registro.at(-1).testo, /Scontro chiuso al Round 1/);
  assert.deepEqual(await (await fetch(`${base}/api/scontri`)).json(), []);
});
