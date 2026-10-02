// Personaggi e nemici d'esempio del repo (esempi/, tools/genera_esempi.mjs) e «Carica esempi» del Tavolo del
// Master (server.mjs → POST /api/esempi): gli esempi sono completi e coerenti con le regole attuali, e la copia
// nelle cartelle del server non sovrascrive mai un file già presente.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ESEMPI, costruisci } from '../tools/genera_esempi.mjs';
import { validaNemico, formattaErrore } from '../src/validate.js';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const cartellaEsempi = new URL('../esempi/', import.meta.url);

test('i 4 PG d’esempio: validi, wizard senza avvisi, livelli fra 3 e 8, file in sincronia con il generatore', () => {
  const file = readdirSync(cartellaEsempi).filter((f) => f.endsWith('.json')).sort();
  const costruiti = ESEMPI.map((s) => costruisci(s, dati));
  assert.deepEqual(costruiti.map((r) => r.file).sort(), file);
  for (const r of costruiti) {
    assert.deepEqual(r.problemi, [], r.file);
    const livello = 1 + r.personaggio.livelli.length;
    assert.ok(livello >= 3 && livello <= 8, `${r.file}: livello ${livello}`);
    // il file del repo è quello che il generatore scrive oggi (rigenerare con node tools/genera_esempi.mjs)
    assert.equal(readFileSync(new URL(r.file, cartellaEsempi), 'utf8'), r.testo, r.file);
  }
  // diversi fra loro: a distanza, corpo a corpo, Taumaturgo con batterie e un Artefatto, cibernetica
  const [rhea, torvald, anselmo, nadia] = costruiti.map((r) => r.scheda);
  assert.equal(rhea.equipaggiamento.armi[0].tipo, 'arma_distanza');
  assert.equal(torvald.equipaggiamento.armi[0].tipo, 'arma_ravvicinata');
  assert.ok(anselmo.equipaggiamento.contenitori.filter((c) => !c.integrato).length >= 2);
  assert.ok(anselmo.equipaggiamento.contenitori.some((c) => c.integrato));
  assert.ok(nadia.equipaggiamento.oggetti.filter((o) => o.tipo === 'impianto' && o.voce.stato === 'installato').length >= 3);
  // nessun dato dei giocatori reali
  const nomi = costruiti.map((r) => r.personaggio.creazione.nome).join(' ');
  assert.doesNotMatch(nomi, /Lucas|Dimitri|Botha|Duncan|Michele|Oshi|Pablo/);
});

test('i 2 nemici d’esempio seguono data/formato_nemici.json: uno debole da gruppo, uno forte', () => {
  const nemici = readdirSync(new URL('nemici/', cartellaEsempi)).filter((f) => f.endsWith('.json'));
  assert.equal(nemici.length, 2);
  const per = Object.fromEntries(nemici.map((f) => [f, JSON.parse(readFileSync(new URL(`nemici/${f}`, cartellaEsempi), 'utf8'))]));
  for (const [f, n] of Object.entries(per)) {
    assert.deepEqual(validaNemico(n, dati, f).map(formattaErrore), [], f);
    assert.equal(`${n.id}.json`, f);
  }
  const pv = Object.values(per).map((n) => n.pv).sort((a, b) => a - b);
  assert.ok(pv[1] >= 3 * pv[0]);
});

const cartelle = ['personaggi', 'nemici', 'tavolo', 'scontri'].map((x) => mkdtempSync(join(tmpdir(), `mutant-esempi-${x}-`)));
const [cPersonaggi, cNemici, cTavolo, cScontri] = cartelle;
let server;
let base;
before(async () => {
  server = creaServer({ cartella: cPersonaggi, nemici: cNemici, tavolo: cTavolo, scontri: cScontri });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); for (const d of cartelle) rmSync(d, { recursive: true, force: true }); });

test('«Carica esempi»: copia nelle cartelle attive, non sovrascrive mai, segnala i saltati', async () => {
  // un PG con lo stesso nome di file c'è già: resta com'è
  writeFileSync(join(cPersonaggi, 'Rhea-Valdis_liv5_2026-10-02.json'), 'IL MIO FILE');
  const r = await (await fetch(`${base}/api/esempi`, { method: 'POST' })).json();
  assert.deepEqual(r.saltati, ['Rhea-Valdis_liv5_2026-10-02.json']);
  assert.deepEqual(r.copiati.sort(), ['Fratello-Anselmo-Viri_liv3_2026-10-02.json', 'Nadia-Ferro_liv4_2026-10-02.json', 'Torvald-Krane_liv6_2026-10-02.json', 'legionario-oscuro.json', 'predone-delle-lande.json']);
  assert.equal(readFileSync(join(cPersonaggi, 'Rhea-Valdis_liv5_2026-10-02.json'), 'utf8'), 'IL MIO FILE');
  assert.deepEqual(readdirSync(cNemici).sort(), ['legionario-oscuro.json', 'predone-delle-lande.json']);
  // seconda volta: tutto già presente, nulla copiato
  const r2 = await (await fetch(`${base}/api/esempi`, { method: 'POST' })).json();
  assert.deepEqual([r2.copiati, r2.saltati.length], [[], 6]);
  assert.equal((await fetch(`${base}/api/esempi`)).status, 405);
  // i PG copiati si leggono dall'elenco della cartella
  const elenco = await (await fetch(`${base}/api/personaggi`)).json();
  assert.equal(elenco.length, 4);
});
