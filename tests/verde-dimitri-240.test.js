import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 240 (23/11/2026) — A.308: il focalizzatore Verde è installato sulla CyberArma di Dimitri.
//
// Davide ha confermato quello che il §7.25.4 degli Armamenti dice («È installato soltanto il focalizzatore Verde»). Il Verde si dichiara
// **nei dati**, per l'uid della voce, e non si scrive nel file di Dimitri (principio 3: il valore è calcolato e arriva quando aggiorna l'app).
// Le prove che devono restare rosse:
//  1. i tre bonus (VA di Attacco, Parata, danno) valgono **solo con l'arma manifestata**: spenta, o a durata scaduta, non si contano;
//  2. ognuno si conta **una volta sola** (la dichiarazione dei dati e un cristallo dichiarato sull'esemplare non si sommano; il +1 al danno
//     del Verde e il +1 della Destrezza §5.13 sono due righe distinte: 1d8+2, mai 1d8+3);
//  3. **un solo esemplare**: dichiarare il cristallo non crea una seconda CyberArma né tocca nome, Integrità o storico;
//  4. gli altri sei personaggi non hanno nessuna dichiarazione che li riguardi; il file di Dimitri non si scrive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { coloreCristallo, dichiarazioneDeiDati, focalizzatoriCyberArma } from '../src/cyberarma.js';
import { applica, DICHIARATI } from '../tools/lotti/lotto_240_verde_dimitri.mjs';
import { calcolaAttaccoRavvicinato, dichiarazioneRavvicinato } from '../src/attacco.js';
import { propostaDaPg } from '../src/ui/attacco-pg.js';
import { applicaColpo } from '../src/danno.js';

const { dati } = await datiReali();
const ISTANTANEA = 'F:/REPOS/mutant/istantanee/stato_2026-11-21_2353/personaggi/';
const UID = 'emwqzcjim4d0k';

function fileIstantanea(prefisso) {
  try { return readdirSync(ISTANTANEA).filter((f) => f.startsWith(prefisso) && f.endsWith('.json')).sort().pop() ?? null; } catch { return null; }
}
function scheda(testo, { accesa, round = 1, esemplare = undefined, uid = UID }) {
  const p = deserializzaPersonaggio(testo);
  const creazione = normalizza(p.creazione, dati).scelte;
  if (esemplare) creazione.equipaggiamento = creazione.equipaggiamento.map((v) => (v.uid === uid ? { ...v, esemplare } : v));
  const sessione = { ...(p.sessione ?? {}), round, attivazioniArmi: accesa ? { [uid]: { dal: 1, round: 10 } } : {} };
  const s = calcolaScheda({ creazione, livelli: p.livelli, sessione }, dati);
  return { s, p, creazione, sessione, arma: (s.equipaggiamento?.armi ?? []).find((x) => x.uid === uid) };
}
const dimitriTesto = (() => { const f = fileIstantanea('Dimitri'); if (!f) return null; try { return readFileSync(ISTANTANEA + f, 'utf8'); } catch { return null; } })();
const SALTA = dimitriTesto === null && 'istantanea non presente su questo PC';

test('la dichiarazione dei dati è una sola, ben formata, e il generatore rifatto non cambia niente', () => {
  const dich = focalizzatoriCyberArma(dati).dichiarati;
  assert.deepEqual(dich.map((d) => d.uid), [UID], 'un solo esemplare dichiarato');
  const colori = focalizzatoriCyberArma(dati).elenco.map((f) => f.nome);
  for (const d of dich) {
    assert.ok(colori.includes(d.colore), `${d.uid}: il colore «${d.colore}» non è fra quelli del manuale`);
    assert.ok(d.perche && d.perche.length > 40, 'dice perché');
    assert.match(d.risposta, /^A\.\d+$/, 'cita la risposta di Davide');
  }
  assert.equal(new Set(dich.map((d) => d.uid)).size, dich.length, 'nessun uid dichiarato due volte');
  const json = JSON.parse(readFileSync(new URL('../data/equipaggiamento/armi.json', import.meta.url), 'utf8'));
  assert.equal(applica(json), false, 'il generatore è idempotente');
  assert.deepEqual(DICHIARATI, dich);
});

test('coloreCristallo: l’esemplare vince sulla dichiarazione, la dichiarazione sul profilo; altre voci non ne hanno', () => {
  const voce = { uid: UID, rif: 'armi:cyberarma' };
  assert.equal(coloreCristallo(voce, dati), 'Verde');
  assert.equal(dichiarazioneDeiDati(voce, dati)?.risposta, 'A.308');
  assert.equal(coloreCristallo({ ...voce, esemplare: { focalizzatore: 'Blu' } }, dati), 'Blu', 'un cristallo cambiato dal Direttore vince');
  assert.equal(coloreCristallo({ uid: 'altra', rif: 'armi:cyberarma' }, dati), null, 'un’altra CyberArma non riceve il Verde');
  assert.equal(coloreCristallo({ uid: UID, rif: 'armi:spada' }, dati), null, 'non è una CyberArma');
});

test('Dimitri: manifestata VA 9→10, danno 1d8+1→1d8+2, Parata 8→9; spenta resta com’era', { skip: SALTA }, () => {
  const spenta = scheda(dimitriTesto, { accesa: false }).arma;
  const accesa = scheda(dimitriTesto, { accesa: true }).arma;
  assert.deepEqual([spenta.vaEffettivo, spenta.danno.una_mano, spenta.parata.vaEffettivo], [9, '1d8+1', 8], 'a arma spenta: i numeri del 21/11');
  assert.deepEqual([accesa.vaEffettivo, accesa.danno.una_mano, accesa.parata.vaEffettivo], [10, '1d8+2', 9], 'manifestata: +1, +1, +1');
  assert.notEqual(accesa.danno.una_mano, '1d8+3', 'il +1 del Verde e il +1 di Destrezza sono due righe, ma il Verde non si somma due volte');
  assert.equal((accesa.righeDanno ?? []).filter((r) => /Focalizzatore/.test(r.fonte)).length, 1, 'una riga sola del cristallo nel danno');
  assert.equal(accesa.scomposizione.filter((c) => /Focalizzatore/.test(c.etichetta)).length, 1);
  assert.equal(accesa.parata.scomposizione.filter((c) => /Focalizzatore/.test(c.etichetta)).length, 1);
  assert.equal(accesa.vaEffettivo, accesa.scomposizione.reduce((t, c) => t + c.valore, 0), 'la somma delle righe è il totale');
  assert.equal(accesa.parata.vaEffettivo, accesa.parata.scomposizione.reduce((t, c) => t + c.valore, 0));
});

test('il Verde non si conta due volte: dichiarazione dei dati + cristallo sull’esemplare = un solo bonus', { skip: SALTA }, () => {
  const solo = scheda(dimitriTesto, { accesa: true }).arma;
  const doppio = scheda(dimitriTesto, { accesa: true, esemplare: { focalizzatore: 'Verde' } }).arma;
  assert.deepEqual([doppio.vaEffettivo, doppio.danno.una_mano, doppio.parata.vaEffettivo], [solo.vaEffettivo, solo.danno.una_mano, solo.parata.vaEffettivo]);
  assert.equal(doppio.scomposizione.filter((c) => /Focalizzatore/.test(c.etichetta)).length, 1);
});

test('a arma non manifestata nessun bonus: spenta, mai accesa, o con la durata scaduta', { skip: SALTA }, () => {
  const spenta = scheda(dimitriTesto, { accesa: false }).arma;
  for (const arma of [
    scheda(dimitriTesto, { accesa: false }).arma,
    scheda(dimitriTesto, { accesa: true, round: 11 }).arma, // dal Round 1 per 10 Round: al Round 11 è finita
  ]) {
    assert.deepEqual([arma.vaEffettivo, arma.danno.una_mano, arma.parata.vaEffettivo], [spenta.vaEffettivo, spenta.danno.una_mano, spenta.parata.vaEffettivo]);
    assert.equal(arma.scomposizione.filter((c) => /Focalizzatore/.test(c.etichetta)).length, 0);
  }
  assert.equal(scheda(dimitriTesto, { accesa: true, round: 10 }).arma.vaEffettivo, spenta.vaEffettivo + 1, 'all’ultimo Round della durata vale ancora');
});

test('un solo esemplare: dichiarare il Verde non crea una seconda CyberArma e non scrive il file di Dimitri', { skip: SALTA }, () => {
  const a = scheda(dimitriTesto, { accesa: true });
  const cy = (a.creazione.equipaggiamento ?? []).filter((v) => (v.rif ?? '').startsWith('armi:cyberarma'));
  assert.equal(cy.length, 1, 'una CyberArma sola nell’inventario');
  assert.equal(cy[0].uid, UID);
  assert.equal(cy[0].esemplare, undefined, 'nome, Integrità e storico non sono toccati: il colore è calcolato, non scritto');
  const nelFile = (a.p.creazione.equipaggiamento ?? []).find((v) => v.uid === UID);
  assert.equal(nelFile.esemplare, undefined, 'il file letto non porta nessun esemplare');
  assert.equal(a.s.equipaggiamento.armi.filter((x) => (x.rif ?? '').startsWith('armi:cyberarma')).length, 1, 'e nella scheda una sola arma');
});

test('gli altri sei personaggi non hanno nessuna dichiarazione che li riguardi', { skip: SALTA }, () => {
  const altri = readdirSync(ISTANTANEA).filter((f) => f.endsWith('.json') && !f.startsWith('Dimitri'));
  assert.ok(altri.length >= 6);
  for (const f of altri) {
    const p = deserializzaPersonaggio(readFileSync(ISTANTANEA + f, 'utf8'));
    for (const v of normalizza(p.creazione, dati).scelte.equipaggiamento ?? []) {
      assert.equal(dichiarazioneDeiDati(v, dati), null, `${f}: ${v.uid} non dovrebbe avere un cristallo dichiarato`);
    }
  }
});

test('un attacco completo, fino al danno applicato: manifestata +1 al danno e +1 al VA una volta sola; non manifestata niente', { skip: SALTA }, () => {
  const legionario = JSON.parse(readFileSync(new URL('../esempi/nemici/legionario-oscuro.json', import.meta.url), 'utf8'));
  const fisso = (f) => { const m = /([+−-])\s*(\d+)\s*$/.exec(String(f)); return m ? (m[1] === '+' ? 1 : -1) * Number(m[2]) : 0; };
  const DADO = 5; // un d8 uscito a 5: il tiro è uguale nei due casi, cambia solo ciò che il cristallo aggiunge
  const colpo = (accesa) => {
    const { s, sessione, arma } = scheda(dimitriTesto, { accesa });
    const r = calcolaAttaccoRavvicinato({ scheda: s, sessione }, arma, dichiarazioneRavvicinato({}), dati);
    const p = propostaDaPg(arma, r, { magistrale: false, riusciti: 1 }, { id: 'pg:DIMITRI', nome: 'Dimitri' });
    const totale = DADO + fisso(r.danno.testo);
    const bersaglio = { nome: 'Bersaglio', pv: { attuali: 60, massimo: 60 }, ferite: 0, ar: { ...legionario.ar, totale: 0 } };
    const ris = applicaColpo(bersaglio, { danni: [totale], natura: p.natura, tipo: p.tipo, difesa: 'nessuna', proprieta: p.proprieta }, dati);
    return { va: r.va_finale, formula: r.danno.testo, natura: p.natura, totale, pvDopo: ris.pv.dopo, parata: arma.parata.vaEffettivo,
      righeFoc: JSON.stringify(r.provenienza.righe).split('Focalizzatore Verde').length - 1 };
  };
  const spenta = colpo(false);
  const accesa = colpo(true);
  assert.deepEqual([spenta.va, spenta.formula, spenta.totale, spenta.parata], [9, '1d8+1', 6, 8]);
  assert.deepEqual([accesa.va, accesa.formula, accesa.totale, accesa.parata], [10, '1d8+2', 7, 9]);
  assert.equal(accesa.natura, 'Magico');
  assert.equal(spenta.pvDopo - accesa.pvDopo, 1, 'il danno applicato è esattamente 1 in più, non 2');
  assert.equal(spenta.righeFoc, 0);
  assert.equal(accesa.righeFoc, 1, 'il cristallo compare una volta sola nel «Calcolo» del VA');
});
