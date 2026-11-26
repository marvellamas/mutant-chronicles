import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 231 (20/11/2026) — Magia 1.20 §28.6 «Dotazioni rimovibili del Warden TC».
//  1. ogni valore delle tre ricette è quello della tabella del manuale corrente (riletta dal testo, non copiata nel test);
//  2. le CM si spendono intere (A.252): il costo delle ricette è intero, le riserve sono intere, e il motore rifiuta un costo in CM non intero;
//  3. prezzi = costo di costruzione × 3 × coefficiente (A.256), ai 50 cr: e coincidono con quelli scritti nel manuale;
//  4. un valore «da definire» del manuale non finisce nei dati come numero (peso, Qualità, PS, PI e Reperibilità dei moduli);
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { testoManuale, versioneManuale } from '../tools/manuali.mjs';
import { catalogo } from '../src/equipaggiamento.js';
import { prezzoArtefatto, verificaFormula } from '../src/prezzi-artefatti.js';
import { pmPerGruppo } from '../src/cariche-mistiche.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, inizializzaSessione, allineaSessione, attivaArtefatto, usaArtefatto } from '../src/sessione.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const art = dati.equipaggiamento.file.artefatti.oggetti;
const MOD1 = 'modulo-individuare-6-warden-tc', MOD2 = 'modulo-esorcizzare-corruzione-12-warden-tc', COF = 'cofanetto-del-silenzio-corazzato-warden-tc';
const v = (id) => art.find((o) => o.id === id);
const magia = testoManuale('magia');
const i0 = magia.indexOf('28.6 Dotazioni rimovibili del Warden TC');
const sezione = magia.slice(i0, magia.indexOf('Registro delle modifiche dalla versione', i0));
const blocco = (titolo) => { const a = sezione.indexOf(titolo); assert.ok(a >= 0, `«${titolo}» è nel §28.6`); const b = sezione.indexOf('###', a + titolo.length); return sezione.slice(a, b < 0 ? undefined : b); };
const riga = (testo, etichetta) => { const m = new RegExp(`\\|\\s*${etichetta}\\s*\\|\\s*([^|\\n]+?)\\s*\\|`).exec(testo); assert.ok(m, `la riga «${etichetta}» c’è`); return m[1].replace(/\\/g, '').trim(); };
const num = (s) => Number(String(s).replace(/\./g, '').replace(',', '.'));

test('i dati con le tre voci del Warden passano il validatore (datiReali non lancia: si chiede l’elenco degli errori)', () => {
  assert.deepEqual(validaDati(dati), []);
});

test('il §28.6 c’è nel manuale corrente, che è la Magia 1.20', () => {
  assert.ok(i0 > 0);
  assert.ok(magia.includes(`EDIZIONE ${versioneManuale('magia')}`));
  assert.ok(Number(versioneManuale('magia')) >= 1.2 || versioneManuale('magia') >= '1.20');
});

test('Modulo Individuare 6: Grado, SnT, riserva e costo in CM, prezzi — tutti dalla tabella del manuale', () => {
  const t = blocco('Localizzazione tecnomistica');
  const o = v(MOD1);
  assert.equal(riga(t, 'Grado / SnT'), `${o.artefatto.grado}, ${o.artefatto.potenza.replace('Non Comune', 'Non Comune')} / ${o.artefatto.sintonizzazione}`);
  assert.deepEqual([o.artefatto.grado, o.artefatto.potenza, o.artefatto.sintonizzazione], ['II', 'Non Comune', 2]);
  const r = riga(t, 'Riserva e costo');
  assert.match(r, new RegExp(`^${o.artefatto.contenitore.capacita_cm} CM Verdi; ${o.attivazione_artefatto.cm} CM per scansione; sei utilizzi`));
  assert.equal(o.artefatto.contenitore.energia, 'Verde');
  assert.equal(o.artefatto.contenitore.capacita_cm / o.attivazione_artefatto.cm, 6, 'sei utilizzi a piena riserva');
});

test('Modulo Esorcizzare Corruzione 12: Grado, SnT, riserva e costo in CM — dalla tabella del manuale', () => {
  const t = blocco('Decontaminazione mistica');
  const o = v(MOD2);
  assert.equal(riga(t, 'Grado / SnT'), `${o.artefatto.grado}, ${o.artefatto.potenza} / ${o.artefatto.sintonizzazione}`);
  assert.deepEqual([o.artefatto.grado, o.artefatto.potenza, o.artefatto.sintonizzazione], ['IV', 'Molto Rara', 4]);
  assert.match(riga(t, 'Riserva e costo'), new RegExp(`^${o.artefatto.contenitore.capacita_cm} CM Verdi; ${o.attivazione_artefatto.cm} CM per trattamento; due trattamenti`));
  assert.equal(o.artefatto.contenitore.capacita_cm / o.attivazione_artefatto.cm, 2, 'due trattamenti a piena riserva');
});

test('Cofanetto corazzato: Grado IV, Molto Rara, SnT 0, nessuna CM, solo proprietà passiva; massa, Qualità, PS, PI e AR come il manuale', () => {
  const t = blocco('Cofanetto del Silenzio corazzato');
  const o = v(COF);
  assert.equal(riga(t, 'Grado / SnT / riserva'), 'IV, Molto Rara / 0 / nessuna CM');
  assert.deepEqual([o.artefatto.grado, o.artefatto.potenza, o.artefatto.sintonizzazione, o.artefatto.proprieta_attive, o.artefatto.sintonizzabile], ['IV', 'Molto Rara', 0, false, false]);
  assert.equal(o.artefatto.contenitore, undefined, 'nessuna riserva: nessuna CM');
  assert.equal(o.attivazione_artefatto, undefined);
  assert.match(riga(t, 'Massa a vuoto / carico del contenuto'), new RegExp(`^${o.peso} kg /`));
  // lotto 254 (rif. 07): l’AR di questa voce era l’unica scritta come numero nudo mentre tutte le altre sono
  // { totale, magica }, e la vista ci leggeva «AR undefined». Il valore non cambia (4): cambia la forma, e il
  // test la legge come la legge la vista invece di interpolare l’oggetto.
  const ar = typeof o.ar === 'number' ? o.ar : o.ar.totale;
  assert.equal(ar, 4, 'l’AR del manuale non cambia');
  assert.equal(riga(t, 'Qualità fisica / Integrità'), `${o.qualita}; PS ${o.ps_int}; ${o.pi} PI; AR ${ar}`);
  assert.match(riga(t, 'Capacità mistica'), new RegExp(`^Tre punti complessivi di Corruzione`));
  assert.equal(o.schermatura.corruzione, 3);
  // e non è il Cofanetto del Silenzio ordinario del §10.13.3
  assert.equal(cat.perRif.get('dotazioni_personali:cofanetto-del-silenzio')?.schermatura.corruzione, 1);
  assert.notEqual(o.nome, 'Cofanetto del Silenzio');
});

test('A.252: ogni costo in CM delle ricette è un intero ≥ 1, ogni riserva è intera, e nessuna ricetta scende sotto zero in un uso intero', () => {
  for (const id of [MOD1, MOD2]) {
    const o = v(id);
    const cm = o.attivazione_artefatto.cm;
    assert.ok(Number.isInteger(cm) && cm >= 1, `${id}: costo ${cm}`);
    assert.ok(Number.isInteger(o.artefatto.contenitore.capacita_cm), id);
    assert.equal(o.artefatto.contenitore.capacita_cm % cm, 0, `${id}: la riserva è un multiplo del costo (nessun uso lascia un resto)`);
    assert.equal(o.artefatto.contenitore.capacita_pm, undefined, `${id}: CM, non PM`);
  }
  // in tutto il catalogo nessuna riserva in CM è frazionaria
  for (const o of cat.oggetti) {
    const c = o.artefatto?.contenitore;
    if (c?.capacita_cm !== undefined) assert.ok(Number.isInteger(c.capacita_cm), o.id);
    if (o.attivazione_artefatto?.cm !== undefined) assert.ok(Number.isInteger(o.attivazione_artefatto.cm), o.id);
  }
});

test('mutante: un costo di 0,5 CM o una riserva di 5,5 CM sono errori del validatore, non dati', () => {
  const x = structuredClone(dati);
  const o = x.equipaggiamento.file.artefatti.oggetti.find((a) => a.id === MOD1);
  o.attivazione_artefatto.cm = 0.5;
  o.artefatto.contenitore.capacita_cm = 5.5;
  const e = validaDati(x).map((r) => `${r.chiave}: ${r.problema}`).join('\n');
  assert.match(e, /attivazione_artefatto/);
  assert.match(e, /capacita_cm: intero ≥ 1 atteso/);
});

// una sessione con i due moduli e il cofanetto addosso a un PG vero (collaudo)
const FILE = new URL('./fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json', import.meta.url);
function conModuli() {
  const p = deserializzaPersonaggio(readFileSync(FILE, 'utf8'));
  const creazione = normalizza(p.creazione, dati).scelte;
  creazione.equipaggiamento = [...(creazione.equipaggiamento ?? []),
    { uid: 'w1', rif: `artefatti:${MOD1}`, stato: 'trasportato', quantita: 1, note: '', sintonizzato: true },
    { uid: 'w2', rif: `artefatti:${MOD2}`, stato: 'trasportato', quantita: 1, note: '', sintonizzato: true },
    { uid: 'w3', rif: `artefatti:${COF}`, stato: 'trasportato', quantita: 1, note: '' }];
  const base = { creazione, livelli: p.livelli };
  const m = massimiSessione(calcolaScheda(base, dati), creazione, dati);
  const s = allineaSessione(p.sessione ?? inizializzaSessione(m), m);
  return { m, s, scheda: calcolaScheda({ ...base, sessione: s }, dati) };
}

test('al tavolo: 6 scansioni da 1 CM e poi la riserva è vuota; 2 trattamenti da 3 CM; le due riserve restano separate e i PM personali non si toccano', () => {
  const { m, s, scheda } = conModuli();
  assert.deepEqual([s.chroma.w1.pmAttuali, s.chroma.w1.unita, s.chroma.w2.pmAttuali, s.chroma.w2.unita], [6, 'CM', 6, 'CM'], 'riserve piene e in CM');
  assert.equal(s.chroma.w3, undefined, 'il cofanetto non ha riserva');
  assert.equal(scheda.pm, calcolaScheda({ creazione: normalizza(deserializzaPersonaggio(readFileSync(FILE, 'utf8')).creazione, dati).scelte, livelli: deserializzaPersonaggio(readFileSync(FILE, 'utf8')).livelli, sessione: s }, dati).pm);
  let x = s;
  for (let i = 0; i < 6; i++) { x = attivaArtefatto(x, 'w1', v(MOD1).attivazione_artefatto.cm, m); assert.ok(x, `scansione ${i + 1}`); assert.equal(x.chroma.w1.pmAttuali, 5 - i); }
  assert.equal(attivaArtefatto(x, 'w1', 1, m), null, 'la settima non c’è: riserva vuota');
  assert.equal(x.chroma.w2.pmAttuali, 6, 'l’altro modulo non è toccato: le CM non sono prelevabili');
  let y = s;
  for (let i = 0; i < 2; i++) { y = usaArtefatto(y, 'w2', v(MOD2).attivazione_artefatto.cm, m); assert.ok(y); }
  assert.equal(y.chroma.w2.pmAttuali, 0);
  assert.equal(usaArtefatto(y, 'w2', 3, m), null);
  assert.equal(y.pmAttuali, s.pmAttuali, 'i PM personali non si toccano');
});

test('mutante: una CM non intera non si scala mai, nemmeno con «Procedi comunque»', () => {
  const { m, s } = conModuli();
  for (const costo of [0.5, 1.5, 2.9, 0, -1, NaN]) {
    assert.equal(attivaArtefatto(s, 'w1', costo, m), null, `attiva ${costo}`);
    assert.equal(usaArtefatto(s, 'w1', costo, m), null, `usa ${costo}`);
    assert.equal(attivaArtefatto(s, 'w1', costo, m, { forza: true }), null, `attiva ${costo} (forza)`);
    assert.equal(usaArtefatto(s, 'w1', costo, m, { forza: true }), null, `usa ${costo} (forza)`);
  }
  // e con «Procedi comunque» un costo intero scende a 0, non sotto
  const quasi = { ...s, chroma: { ...s.chroma, w2: { ...s.chroma.w2, pmAttuali: 2 } } };
  assert.equal(usaArtefatto(quasi, 'w2', 3, m, { forza: true }).chroma.w2.pmAttuali, 0);
});

test('ricarica: 36 PM per 6 CM a 3:1, 4 PM per CM a 2:1, 2 a 1:1; una scansione 6 PM, un trattamento 18 PM (come dice il manuale)', () => {
  const cm = { unita: 'CM' };
  const t = blocco('Ricarica e prezzi delle ricette specifiche');
  assert.match(t, /36 PM personali per ripristinare 6 CM al rapporto ordinario 3:1/);
  assert.match(t, /una scansione richiede 6 PM; un trattamento 18 PM/i);
  assert.equal(6 * pmPerGruppo(cm, 3, dati), 36);
  assert.equal(v(MOD1).attivazione_artefatto.cm * pmPerGruppo(cm, 3, dati), 6);
  assert.equal(v(MOD2).attivazione_artefatto.cm * pmPerGruppo(cm, 3, dati), 18);
  assert.deepEqual([pmPerGruppo(cm, 2, dati), pmPerGruppo(cm, 1, dati)], [4, 2]);
});

test('A.256: i tre prezzi sono la cifra del manuale e coincidono con costo di costruzione × 3 × coefficiente, ai 50 cr', () => {
  const t = blocco('Ricarica e prezzi delle ricette specifiche');
  for (const [id, nome] of [[MOD1, 'Modulo Individuare 6'], [MOD2, 'Modulo Esorcizzare Corruzione 12'], [COF, 'Cofanetto corazzato']]) {
    const r = new RegExp(`\\|\\s*${nome}\\s*\\|\\s*([\\d.]+) cr\\s*\\|\\s*([\\d.]+) cr\\s*\\|`).exec(t);
    assert.ok(r, `${nome} è nella tabella dei prezzi`);
    const o = v(id);
    assert.equal(o.creazione_cr, num(r[1]), `${id}: creazione`);
    assert.equal(o.costo, num(r[2]), `${id}: vendita scritta nel manuale`);
    const f = verificaFormula(cat.perRif.get(`artefatti:${id}`), dati);
    assert.equal(f.torna, true, `${id}: la formula ritrova la cifra scritta`);
    assert.equal(prezzoArtefatto(cat.perRif.get(`artefatti:${id}`), dati).cr, o.costo);
  }
  assert.deepEqual([v(MOD1).costo, v(MOD2).costo, v(COF).costo], [9900, 37800, 27000]);
  assert.equal(9900 + 37800 + 27000, 74700, 'la dotazione mistica complessiva del manuale');
  assert.match(t, /74\.700 cr/);
  // la formula a mano: 2.200 × 3 × 1,5; 4.200 × 3 × 3; 3.000 × 3 × 3
  assert.deepEqual([2200 * 3 * 1.5, 4200 * 3 * 3, 3000 * 3 * 3], [9900, 37800, 27000]);
});

// ─────────────── un valore «da definire» non diventa un numero ───────────────
test('«da definire» mai come numero: i campi che il manuale non dà non sono nei dati (né 0, né un valore dedotto)', () => {
  for (const id of [MOD1, MOD2]) {
    const o = v(id);
    assert.deepEqual(o.da_definire, ['peso', 'qualita', 'ps_int', 'pi', 'reperibilita']);
    for (const campo of o.da_definire) assert.ok(o[campo] === undefined || o[campo] === null, `${id}.${campo} è «da definire»: ${o[campo]}`);
  }
  assert.deepEqual(v(COF).da_definire, ['reperibilita']);
  assert.equal(v(COF).reperibilita ?? null, null);
  // il manuale lo conferma: nei due moduli non c'è né una massa né una Qualità
  for (const titolo of ['Localizzazione tecnomistica', 'Decontaminazione mistica']) assert.doesNotMatch(blocco(titolo), /\bkg\b|Qualità|PS \d|\d+ PI/, `${titolo}: il manuale non dà peso, Qualità, PS o PI`);
  // regola generale: in tutto il catalogo, un campo dichiarato «da definire» non ha un valore numerico
  for (const o of cat.oggetti) for (const campo of o.da_definire ?? []) {
    const val = o[campo === 'integrita' ? 'ps_int' : campo];
    assert.ok(val === undefined || val === null || val === '' || (Array.isArray(val) && !val.length), `${o.id}.${campo} dichiarato da definire ma vale ${JSON.stringify(val)}`);
  }
});

test('mutante: se un modulo avesse un peso inventato (0 o 5 kg) il test dei «da definire» lo vedrebbe', () => {
  const o = structuredClone(v(MOD1)); o.peso = 5;
  assert.throws(() => assert.ok(o[o.da_definire[0]] === undefined || o[o.da_definire[0]] === null));
});

test('la riga dell’attivazione dei moduli non finisce con «: .» (nessun effetto numerico da scrivere) e quella dei Guanti conserva il suo', async () => {
  const { testoAttivazioneArtefatto } = await import('../src/stampa.js');
  for (const id of [MOD1, MOD2]) {
    const riga = testoAttivazioneArtefatto(v(id));
    assert.doesNotMatch(riga, /:\s*\.?$/, riga);
    assert.match(riga, /dalla riserva interna/);
  }
  assert.match(testoAttivazioneArtefatto(v('guanti-da-combattimento-mistico')), /: \+1 VA ai pugni, danno Magico, \+1 al danno/);
  const tab = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.ok(!tab.includes('${at.durata}: ${effetto}.'), 'la scheda dell’Artefatto non scrive più «: .»');
  assert.match(tab, /at\.attacchi === 'senz_armi' \? 'vale in «Attacca!» senz’armi; '/, 'la frase «vale in Attacca! senz’armi» è dei soli Guanti');
});
