import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 220 (18/11/2026) — le due distanze dichiarate dal 219 e lasciate non sommate:
//  1. la Parata +1 del colore Verde (Armonia) della Spada dei Tre Riflessi (Armamenti §7.27.3): «+1 VA alle Parate con la spada»;
//  2. il danno Magico dei Quadrelli lunari (§7.27.6): «il danno dell'arma diventa Magico, senza incremento numerico».
// Un valore dichiarato e non sommato è un numero sbagliato al tavolo: qui è sommato, una volta sola, e il test cade se torna indietro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, inizializzaSessione, allineaSessione, attivaArmaSessione } from '../src/sessione.js';
import { calcolaAttaccoRavvicinato, calcolaAttaccoDistanza } from '../src/attacco.js';
import { propostaDaPg } from '../src/ui/attacco-pg.js';
import { validaDati } from '../src/validate.js';
import { catalogo } from '../src/equipaggiamento.js';

const { dati } = await datiReali();
const FILE_LUCAS = new URL('./fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json', import.meta.url);

/** Lucas (copia del 20/10) con gli oggetti dati; la sessione fresca ha la riserva integrata piena. */
function lucas(extra) {
  const p = deserializzaPersonaggio(readFileSync(FILE_LUCAS, 'utf8'));
  const creazione = normalizza(p.creazione, dati).scelte;
  creazione.equipaggiamento = [...(creazione.equipaggiamento ?? []), ...extra];
  const personaggio = { creazione, livelli: p.livelli, sessione: p.sessione };
  const m = massimiSessione(calcolaScheda(personaggio, dati), creazione, dati);
  const sessione = allineaSessione(inizializzaSessione(m), m);
  const scheda = (s = sessione) => calcolaScheda({ ...personaggio, sessione: s }, dati);
  return { personaggio, m, sessione, scheda };
}
const SPADA = { uid: 'spada1', rif: 'manufatti_lunari:spada-dei-tre-riflessi', stato: 'impugnata', quantita: 1, note: '', sintonizzato: true };
const BALESTRA = [
  { uid: 'bal1', rif: 'manufatti_lunari:balestra-d-osso', stato: 'impugnata', quantita: 1, note: '' },
  { uid: 'quad1', rif: 'manufatti_lunari:quadrelli-lunari-d-osso', stato: 'in_uso', quantita: 10, note: '' },
];
const armaDi = (scheda, uid) => scheda.equipaggiamento.armi.find((a) => a.uid === uid);

test('i dati con natura_danno passano il validatore, e il validatore rifiuta una natura inventata', () => {
  assert.deepEqual(validaDati(dati), []);
  const copia = structuredClone(dati);
  const q = copia.equipaggiamento.file.manufatti_lunari.oggetti.find((o) => o.id === 'quadrelli-lunari-d-osso');
  assert.equal(q.effetti[0].natura_danno, 'Magico');
  q.effetti[0].natura_danno = 'Radioattivo';
  assert.ok(validaDati(copia).some((e) => /natura_danno/.test(JSON.stringify(e))), 'una natura sconosciuta si rifiuta');
});

// ——— 1. la Parata +1 del Verde ———————————————————————————————————————————————————————————————

test('PARATA: con il Verde (Armonia) attivo la Parata con la spada sale di 1; con Rosso e Blu no; senza potere no', () => {
  const pg = lucas([SPADA]);
  const attiva = (id) => attivaArmaSessione(pg.sessione, 'spada1', { cm: 1, round: 5, opzione: id }, pg.m);
  const base = armaDi(pg.scheda(), 'spada1').parata;
  assert.ok(base, 'la spada ha una Parata (Lucas ha le Difese)');
  const verde = armaDi(pg.scheda(attiva('verde')), 'spada1').parata;
  assert.equal(verde.vaEffettivo, base.vaEffettivo + 1, 'Armonia: +1 alla Parata con la spada');
  assert.equal(verde.distanzaEffettiva, base.distanzaEffettiva + 1, 'la Parata a distanza con un’arma ha lo stesso +1');
  assert.ok(verde.scomposizione.some((r) => /Potere attivo: Armonia/.test(JSON.stringify(r)) && r.valore === 1), 'una riga a sé: la provenienza dice da dove viene');
  for (const id of ['rosso', 'blu']) assert.equal(armaDi(pg.scheda(attiva(id)), 'spada1').parata.vaEffettivo, base.vaEffettivo, `${id}: nessun +1 alla Parata`);
});

test('PARATA: una volta sola — «Attacca!» riceve la Parata della scheda, e il VA per colpire non cambia per questo', () => {
  const pg = lucas([SPADA]);
  const verdeS = attivaArmaSessione(pg.sessione, 'spada1', { cm: 1, round: 5, opzione: 'verde' }, pg.m);
  const schedaV = pg.scheda(verdeS);
  const a = armaDi(schedaV, 'spada1');
  const r = calcolaAttaccoRavvicinato({ scheda: schedaV, sessione: verdeS }, a, {}, dati);
  const va0 = calcolaAttaccoRavvicinato({ scheda: pg.scheda(), sessione: pg.sessione }, armaDi(pg.scheda(), 'spada1'), {}, dati).va_finale;
  assert.equal(r.va_finale, va0 + 1, 'il VA per colpire con il Verde resta +1 oltre il passivo (lotto 219): la Parata non ci entra');
  // un solo punto in cui la Parata si calcola: se «Attacca!» la ricalcolasse la sommerebbe di nuovo
  if (r.parata) assert.equal(r.parata.va, a.parata.vaEffettivo);
});

test('I DUE «VERDI»: il Verde della Spada e il focalizzatore Verde della CyberArma sono cose diverse nei dati ma lo stesso numero al tavolo', () => {
  const spada = dati.equipaggiamento.file.manufatti_lunari.oggetti.find((o) => o.id === 'spada-dei-tre-riflessi');
  assert.equal(spada.poteri_arma.opzioni.find((o) => o.id === 'verde').parata_va, 1, 'Spada: potere attivabile, Parata +1 con la spada per 5 Round');
  // la Spada non ha un focalizzatore e la CyberArma non ha poteri_arma: nessuno dei due può contare l'altro
  assert.equal(spada.focalizzatori, undefined);
  const cyber = catalogo(dati).perRif.get('armi:cyberarma');
  assert.ok(cyber?.focalizzatori, 'la CyberArma ha i focalizzatori');
  assert.equal(cyber.poteri_arma, undefined, 'e non ha poteri_arma: il Verde della CyberArma non si attiva, è una proprietà dell’esemplare');
});

test('PARATA: senza il potere attivo (o con quello scaduto) la Parata della spada è quella di prima', () => {
  const pg = lucas([SPADA]);
  const prima = armaDi(pg.scheda(), 'spada1').parata.vaEffettivo;
  const attiva = attivaArmaSessione(pg.sessione, 'spada1', { cm: 1, round: 5, opzione: 'verde' }, pg.m);
  assert.equal(armaDi(pg.scheda(attiva), 'spada1').parata.vaEffettivo, prima + 1);
  // dopo 5 Round dal Round d'attivazione il potere è scaduto: la sessione porta un Round avanti
  const scaduta = { ...attiva, round: (attiva.round ?? 1) + 6 };
  assert.equal(armaDi(pg.scheda(scaduta), 'spada1').parata.vaEffettivo, prima, 'a durata finita il +1 non c’è più');
});

// ——— 2. il danno Magico dei Quadrelli lunari ——————————————————————————————————————————————————

test('QUADRELLI: con la casella accesa il danno diventa Magico senza cambiare il numero; spenta resta quello dell’arma', () => {
  const pg = lucas(BALESTRA);
  const scheda = pg.scheda();
  const arma = armaDi(scheda, 'bal1');
  assert.ok(arma, 'la Balestra d’osso è un’arma impugnata');
  const spento = calcolaAttaccoDistanza({ scheda, sessione: pg.sessione }, arma, { distanza: 10 }, dati);
  const acceso = calcolaAttaccoDistanza({ scheda, sessione: pg.sessione }, arma, { distanza: 10, oggetti: ['quad1'] }, dati);
  assert.equal(spento.natura_danno, null, 'senza quadrelli lunari accesi: la natura è quella dell’arma');
  assert.equal(acceso.natura_danno, 'Magico');
  assert.equal(acceso.danno_per_colpo, spento.danno_per_colpo, '«senza incremento numerico»: stessa formula');
  assert.equal(acceso.va_finale, spento.va_finale + 1, 'e il +1 VA resta');
  assert.ok(acceso.promemoria.some((t) => /Magico/.test(t)), 'detto nel promemoria');
  // «Colpito» riceve la natura: contro l’AR pertinente (Magico), non Naturale
  const fonte = { id: 'pg', nome: 'Lucas' };
  const e = { magistrale: false, riusciti: 1 };
  assert.equal(propostaDaPg(arma, acceso, e, fonte).natura, 'Magico');
  assert.equal(propostaDaPg(arma, spento, e, fonte).natura, 'Naturale');
});

test('QUADRELLI: la natura non si trascina — senza la casella, la dichiarazione dopo torna alla natura dell’arma', () => {
  const pg = lucas(BALESTRA);
  const scheda = pg.scheda();
  const arma = armaDi(scheda, 'bal1');
  const prima = calcolaAttaccoDistanza({ scheda, sessione: pg.sessione }, arma, { distanza: 10, oggetti: ['quad1'] }, dati);
  const dopo = calcolaAttaccoDistanza({ scheda, sessione: pg.sessione }, arma, { distanza: 10 }, dati);
  assert.equal(prima.natura_danno, 'Magico');
  assert.equal(dopo.natura_danno, null);
});
