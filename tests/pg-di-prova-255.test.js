import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 255, parte E — **i PG di prova devono portare quello che portano i sette.**
//
// Il difetto che ha aperto questa parte è del lotto 254: il «+X» dell'Elmetto Recon ASA è sopravvissuto **con il test
// verde**, perché quella riga dell'Inventario non passava dalla vista e i tre PG d'esempio **non hanno l'elmetto**.
// Il controllo passava sull'assenza. È una classe intera: un difetto su un oggetto che solo i sette portano è
// invisibile ai nostri test e si vede al tavolo.
//
// Qui due controlli. Il primo pretende la **copertura**: ogni categoria che almeno uno dei sette porta esiste in
// almeno un PG di prova (la fotografia dei sette, con la sua data, è in `tests/fixtures/cose-dei-sette.json`, rifatta
// da `node tools/cose-dei-sette.mjs --scrivi`). Il secondo **rende** le otto tab del PG che porta tutto e cerca i
// segnaposto: è il controllo che nel 254 non c'era, e che avrebbe trovato il «+X» da sé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dati, contesto, resa, ESEMPI, TAB } from './scheda-aiuti.js';
import { aggiungiCoseDeiSette, COPERTURE } from './pg-come-i-sette.mjs';
import { cosaPorta } from '../tools/cose-dei-sette.mjs';

const ELENCO = JSON.parse(readFileSync(new URL('./fixtures/cose-dei-sette.json', import.meta.url), 'utf8'));
const BASE = 'Torvald-Krane_liv6_2026-10-02.json';
const pgCompleto = (attiva = 'identita') => contesto(BASE, { attiva, scelte: (s) => aggiungiCoseDeiSette(s, dati).scelte });

test('parte E: ogni cosa che almeno uno dei sette porta esiste in almeno un PG di prova', () => {
  const unione = new Set();
  for (const f of ESEMPI) for (const x of cosaPorta(contesto(f).scelte)) unione.add(x);
  for (const x of cosaPorta(pgCompleto().scelte)) unione.add(x);
  const mancano = Object.keys(ELENCO.cose).filter((k) => !unione.has(k));
  assert.deepEqual(mancano, [], `categorie dei sette che nessun PG di prova ha:\n${mancano.map((m) => `  ${m} — ${ELENCO.cose[m].join(', ')}`).join('\n')}`);
  assert.ok(Object.keys(ELENCO.cose).length >= 20, 'la fotografia dei sette non è vuota');
  assert.equal(ELENCO.personaggi.length, 7, 'la fotografia viene dai sette');
});

test('parte E: il PG che porta tutto si rende, e le sue voci vengono dal catalogo', () => {
  const esito = aggiungiCoseDeiSette(contesto(BASE).scelte, dati);
  assert.deepEqual(esito.manca, [], `una categoria non si copre:\n${esito.manca.map((m) => `  ${m.categoria}: ${m.perche}`).join('\n')}`);
  // ogni copertura cerca nel catalogo: nessun rif scritto a mano nel fixture
  const src = readFileSync(new URL('./pg-come-i-sette.mjs', import.meta.url), 'utf8');
  const rifScritti = [...src.matchAll(/o\.rif === '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(rifScritti, ['elmetti:elmetto-asa-recon'], 'il solo rif scritto a mano è quello su cui il lotto 254 ha nascosto il difetto, e il suo perché è scritto');
  for (const c of COPERTURE) assert.ok(c.voce(dati) || c.perche, `${c.categoria}: senza voce e senza il motivo`);
});

test('parte E: nelle otto tab del PG che porta tutto non compare nessun segnaposto', () => {
  // gli stessi segnaposto del lotto 254, su un personaggio che ha l'elmetto, la CyberArma, i Guanti, lo scudo
  // enorme, l'impianto, il manufatto lunare, il veicolo e una correzione del Direttore
  const SEGNAPOSTO = [/\+\s*X\b/, /\{[A-Za-z_][A-Za-z0-9_.]*\}/, /\bundefined\b/, /\bNaN\b/, /%[A-Za-z]+%/];
  const guasti = [];
  for (const attiva of TAB) {
    const testo = resa(pgCompleto(attiva)).testo();
    for (const re of SEGNAPOSTO) {
      const m = re.exec(testo);
      if (m) guasti.push(`${attiva}: ${re} — «${testo.slice(Math.max(0, m.index - 60), m.index + 60)}»`);
    }
  }
  assert.deepEqual(guasti, [], `segnaposto a schermo:\n${guasti.slice(0, 6).join('\n')}`);
});

test('parte E: la fotografia dei sette dice da dove viene e quando', () => {
  assert.match(ELENCO.istantanea, /istantanee\/stato_\d{4}-\d{2}-\d{2}_\d{4}/, 'l’istantanea di partenza è nominata');
  assert.match(ELENCO.quando, /^\d{4}-\d{2}-\d{2}T/, 'con la data in cui è stata fatta');
  assert.ok(ELENCO._nota && ELENCO._nota.length > 200, 'e col perché, perché una fotografia senza data invecchia in silenzio');
  for (const [k, chi] of Object.entries(ELENCO.cose)) {
    assert.ok(Array.isArray(chi) && chi.length, `${k}: nessun personaggio la porta — una categoria senza nessuno non è una fotografia`);
  }
});
