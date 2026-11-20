import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 213 (17/11/2026) — i Veicoli 0.19: il PROFILO si aggiorna, il RECORD no.
//
//  1. **IL RECORD NON CAMBIA.** Sui tre record veri dell'istantanea del 15/11 (FIAT LUX, Neverlost del gruppo, Neverlost di Pablo: copie in
//     `tests/fixtures/veicoli-record-213/`) la vista — PI attuali e soglie, penalità, movimento, munizioni, energia — è identica col catalogo di prima
//     del lotto (commit bba7ba07) e con quello di adesso. Il test **fallisce** se il recepimento cambia un valore che un record esistente ha già:
//     se un PI massimo cambiasse, «PI attuali» o le soglie cambierebbero con lui. Provato col mutante (un PI massimo ritoccato).
//  2. Una lettura parziale non si scrive mai sopra un valore buono (`unisciProfilo`), provato anche con l'unione sbagliata apposta.
//  3. Il segno «⚑» del profilo si spegne da sé; il conto dei mezzi (9 = 5 profili + 4 fuori catalogo) deve tornare coi dati.
//  4. Le quattro astronavi sono **dichiarate**, con il motivo e ciò che servirebbe: nessuna resta fuori in silenzio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { datiReali } from './helpers.js';
import { caricaDati } from '../src/rules.js';
import { vistaVeicolo, normalizzaVeicoli } from '../src/veicoli.js';
import { validaDati } from '../src/validate.js';
import { testoManuale, testoEdizione, versioneManuale, registro } from '../tools/manuali.mjs';
import { leggiSchede, confronta, CAPITOLO_PROFILO } from '../tools/importa-veicoli.mjs';
import { unisciProfilo, CAMPO_DATO } from '../tools/lotti/lotto_213_veicoli.mjs';
import { campiIndietroProfilo, rigaProvenienzaProfilo, edizioneCorrenteVeicoli } from '../src/provenienza-veicoli.js';

const RADICE = fileURLToPath(new URL('../', import.meta.url));
const { dati } = await datiReali();
const FIX = new URL('./fixtures/veicoli-record-213/', import.meta.url);
const record = readdirSync(FIX).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(new URL(f, FIX), 'utf8')));
// il catalogo di prima del lotto: l'ultimo commit del 212
const daGit = (nome) => Promise.resolve(execFileSync('git', ['-C', RADICE, 'show', `bba7ba07:data/${nome}.json`], { encoding: 'utf8', maxBuffer: 1e8 }));
const prima = (await caricaDati(daGit)).dati;

// Lotto 218: il numero lo dà il registro. Il senso è che nome, prima pagina e dati dichiarano la stessa edizione.
test('l\'edizione recepita, il testo salvato e i dati dichiarano lo stesso numero', () => {
  const v = versioneManuale('veicoli').replace('.', '\\.');
  assert.match(testoManuale('veicoli').slice(0, 600), new RegExp(`EDIZIONE ${v}`));
  // Lotto 229: i dati o dichiarano l'edizione corrente, o sono una eccezione dichiarata col suo motivo (edizioni_in_attesa)
  const attesa = registro().edizioni_in_attesa?.['data/veicoli.json']?.veicoli;
  if (attesa) assert.ok(attesa.motivo && attesa.motivo.length > 40, 'un file in attesa dichiara il motivo');
  else assert.match(dati.veicoli.versione_manuale, new RegExp(`Veicoli ${v}`));
});

// ——— 1. il record ———
const VISTA = (r, d) => JSON.parse(JSON.stringify(vistaVeicolo(r.mezzo, d, { pilotareVa: 12 }), (k, v) => (k === 'profilo' ? { id: v.id, pi: v.pi, mov_q: v.mov_q, man: v.man, ar: v.ar } : v)));

test('IL RECORD NON CAMBIA: sui tre record veri la vista è identica col catalogo di prima e con quello di adesso', () => {
  assert.equal(record.length, 3);
  for (const r of record) {
    assert.deepEqual(VISTA(r, dati), VISTA(r, prima), `${r.id} (${r.mezzo.profilo}): la vista cambia col profilo nuovo`);
    // i valori consumati, e quelli che il record ha già, sono ancora quelli del file
    const m = normalizzaVeicoli([r.mezzo], dati)[0];
    assert.deepEqual(m.pi, r.mezzo.pi, `${r.id}: i PI attuali del record`);
    assert.deepEqual(m.munizioni, r.mezzo.munizioni, `${r.id}: le munizioni del record`);
    // l'energia del FIAT LUX è ancora nel formato di prima (UE) e la migrazione A.193 la porta alle cariche: lo fa uguale col catalogo di prima e di adesso
    assert.deepEqual(m, normalizzaVeicoli([r.mezzo], prima)[0], `${r.id}: il record normalizzato cambia col profilo nuovo (energia compresa)`);
  }
});

test('…e il controllo SA fallire: un PI massimo ritoccato nel profilo cambia la vista di un record esistente (il mutante)', () => {
  const sporco = structuredClone(dati);
  sporco.veicoli.profili.find((p) => p.id === 'asa-scout-mk4').pi.corpo = 50;
  const fiat = record.find((r) => r.mezzo.profilo === 'asa-scout-mk4');
  assert.notDeepEqual(VISTA(fiat, sporco), VISTA(fiat, prima), 'se un PI massimo cambia, le soglie del record cambiano: il test deve accorgersene');
});

test('i numeri che i record hanno già coincidono con i massimi del manuale: nessun PI «attuale» supera il massimo, nessun valore consumato risulterebbe diverso', () => {
  const s = leggiSchede(testoManuale('veicoli'));
  for (const r of record) {
    const cap = Object.entries(CAPITOLO_PROFILO).find(([, id]) => id === r.mezzo.profilo)[0];
    const max = s[cap].campi.pi ?? s[cap].campi.pi_tabella;
    for (const k of ['corpo', 'propulsione', 'motore']) assert.ok(r.mezzo.pi[k] <= max[k], `${r.id}.${k}: ${r.mezzo.pi[k]} > ${max[k]}`);
  }
});

// ——— la rete ———
test('LA RETE: il lettore non trova scarti, né sulla 0.10 da cui i profili venivano né sulla 0.19', () => {
  const d10 = confronta(leggiSchede(testoEdizione('veicoli', '0.10')), dati.veicoli.profili);
  const d19 = confronta(leggiSchede(testoManuale('veicoli')), dati.veicoli.profili);
  assert.deepEqual(d10.scarti, []);
  assert.deepEqual(d19.scarti, []);
  assert.ok(Object.values(d19.letti).every((n) => n >= 2), `campi letti per profilo: ${JSON.stringify(d19.letti)}`);
  assert.equal(Object.keys(d19.letti).length, 5, 'tutti e cinque i profili sono letti (un controllo su zero schede non prova niente)');
});

test('…e il controllo SA fallire: un numero cambiato nel profilo è uno scarto', () => {
  const sporco = structuredClone(dati.veicoli.profili); sporco.find((p) => p.id === 'furgone-civile').carico_kg = 1200;
  assert.equal(confronta(leggiSchede(testoManuale('veicoli')), sporco).scarti.length, 1);
});

// ——— 2. la lettura parziale ———
const profilo = dati.veicoli.profili.find((p) => p.id === 'asa-scout-mk4');
test('UNA LETTURA PARZIALE NON SI SCRIVE MAI SOPRA UN VALORE BUONO: PI con un solo numero, campi non letti, NaN', () => {
  const parziale = { pi: { corpo: 10 }, mov: undefined, man: null, ar: Number.NaN, carico_kg: undefined, qualita: undefined };
  const r = unisciProfilo(profilo, parziale, '0.99');
  assert.deepEqual(r.profilo.pi, profilo.pi, 'PI incompleti: il valore di prima resta');
  assert.equal(r.profilo.mov_q, profilo.mov_q);
  assert.deepEqual(r.profilo.ar, profilo.ar);
  assert.deepEqual(r.scritti, []);
  assert.ok(r.tenuti.some((t) => t.campo === 'pi') && r.tenuti.every((t) => t.motivo), 'ogni campo tenuto ha il motivo');
  assert.equal(r.profilo._edizione.campi.pi, undefined, 'e non prende la provenienza di una lettura che non ha fatto');
});

test('…e il controllo SA fallire: l\'unione ingenua (il mutante) riscriverebbe il PI con un oggetto a metà', () => {
  const ingenuo = { ...profilo, pi: { corpo: 10 } };
  assert.notDeepEqual(ingenuo.pi, profilo.pi);
  const buono = unisciProfilo(profilo, { pi: { corpo: 10 } }, '0.99').profilo;
  assert.deepEqual(buono.pi, profilo.pi);
});

test('un campo letto per intero e diverso si scrive, con la provenienza; uno uguale prende solo la provenienza', () => {
  const r = unisciProfilo(profilo, { mov: 33, man: profilo.man, pi: profilo.pi }, '0.99');
  assert.equal(r.profilo.mov_q, 33);
  assert.deepEqual(r.scritti, ['mov_q']);
  assert.equal(r.profilo._edizione.campi.mov_q, '0.99');
  assert.equal(r.profilo._edizione.campi.man, '0.99');
});

// ——— 3. il segno e il conto ———
test('IL SEGNO SI SPEGNE DA SÉ: oggi nessun profilo ne ha; con un campo indietro compare, col motivo', () => {
  const ed = edizioneCorrenteVeicoli(dati.veicoli);
  assert.equal(ed, versioneManuale('veicoli'), 'l’edizione corrente dei campi è quella del registro (lotto 229: non scritta nel test)');
  assert.deepEqual(dati.veicoli.profili.filter((p) => campiIndietroProfilo(p, ed).length), []);
  const vecchio = structuredClone(profilo); vecchio._edizione.campi.mov_q = '0.10';
  assert.match(rigaProvenienzaProfilo(vecchio, ed, 'Aspetta Davide.'), /movimento da 0\.10.*Aspetta Davide/);
  assert.equal(rigaProvenienzaProfilo(structuredClone(profilo), ed), null);
});

test('IL CONTO DEI MEZZI deve tornare: 9 = 5 profili + 4 fuori catalogo, e un campo indietro vuole il motivo', () => {
  const problemi = (muta) => { const d = structuredClone(dati); muta(d); return validaDati(d).filter((e) => e.file === 'veicoli.json').map((e) => `${e.chiave}: ${e.problema}`); };
  assert.deepEqual(problemi(() => {}), []);
  assert.equal(dati.veicoli.corpus.mezzi_nel_manuale, 9);
  assert.ok(problemi((d) => { d.veicoli.corpus.profili = 6; }).length, 'profili dichiarati ≠ profili nei dati');
  assert.ok(problemi((d) => { d.veicoli.fuori_catalogo.mezzi.pop(); }).length, 'un\'astronave sparita dalla dichiarazione');
  assert.ok(problemi((d) => { delete d.veicoli.fuori_catalogo.motivo; }).length, 'fuori catalogo senza il motivo');
  assert.ok(problemi((d) => { d.veicoli.fuori_catalogo.servirebbe = ['uno']; }).length, 'senza ciò che servirebbe');
  assert.ok(problemi((d) => { d.veicoli.profili[1]._edizione.campi.mov_q = '0.10'; }).length, 'campo indietro senza motivo e senza conto');
  assert.ok(problemi((d) => { d.veicoli.corpus.campi_letti = {}; }).length, 'un conto su zero campi non prova niente');
  assert.deepEqual(problemi((d) => {
    d.veicoli.profili[1]._edizione.campi.mov_q = '0.10'; d.veicoli.corpus.campi_indietro = 1;
    d.veicoli.corpus.motivi_indietro = [{ profilo: d.veicoli.profili[1].id, campo: 'mov_q', motivo: 'prova' }];
  }), []);
});

// ——— 4. le astronavi ———
test('LE ASTRONAVI SONO DICHIARATE, non lasciate fuori in silenzio: tutte e quattro, col motivo e ciò che servirebbe', () => {
  const testo = testoManuale('veicoli');
  const nelManuale = [...testo.matchAll(/^## \*\*(14\.\d|15\.5|15\.6) ([^*]+)\*\*/gm)].map((m) => m[1]);
  assert.deepEqual(nelManuale.sort(), ['14.1', '14.2', '15.5', '15.6'], 'il manuale ha quattro mezzi nei capitoli 14 e 15');
  const FC = dati.veicoli.fuori_catalogo;
  assert.equal(FC.mezzi.length, 4);
  assert.ok(FC.motivo.length > 80 && FC.servirebbe.length >= 5);
  for (const id of ['nave-mineraria', 'rimorchiatore', 'nave-passeggeri-lusso', 'nave-passeggeri-sonno']) assert.ok(FC.mezzi.some((m) => m.id === id), id);
  assert.equal(dati.veicoli.profili.some((p) => FC.mezzi.some((m) => m.id === p.id)), false, 'né profilo né fuori catalogo: uno solo');
});

test('moto e furgone del 209 sono ancora al loro posto, coi loro numeri', () => {
  const moto = dati.veicoli.profili.find((p) => p.id === 'motocicletta-civile'); const fur = dati.veicoli.profili.find((p) => p.id === 'furgone-civile');
  assert.deepEqual(moto.pi, { corpo: 8, propulsione: 6, motore: 6 }); assert.equal(moto.mov_q, 50); assert.equal(moto.prezzo_cr, 8000);
  assert.deepEqual(fur.pi, { corpo: 20, propulsione: 12, motore: 12 }); assert.equal(fur.carico_kg, 1500); assert.equal(fur.prezzo_cr, 35000);
});
