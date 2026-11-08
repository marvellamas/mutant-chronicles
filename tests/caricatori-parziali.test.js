// Caricatori parziali (richiesta di Marcello del 03/11/2026, dal tavolo): «un caricatore non è pieno o vuoto, ha i colpi
// che ha». Lo stesso modello delle celle della A.215 (lotto 163): si toglie con i colpi che ha, se ne mette uno di scorta
// scelto (anche parziale, 1 AzP: Armamenti 0.74 §7.20.2), si riempie fuori dal combattimento anche con pochi proiettili.
// Le armi caricate direttamente restano un'altra cosa: 2 cartucce per AzP, 4 con Ricarica Esperta (A.135, A.182).
// Nessuna operazione crea o perde un colpo: caricatore nell'arma + caricatori di scorta + munizioni sciolte.
import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { contesto, resa } from './scheda-aiuti.js';
import { calcolaScheda } from '../src/calc.js';
import {
  massimiSessione, allineaSessione, inizializzaSessione, variaMunizioni, consumaColpi, ricaricaArma, togliCaricatoreArma,
  inserisciCaricatoreArma, riempiCaricatoreArma, riempiCaricatoriArma,
} from '../src/sessione.js';
import { caricatoriDiScorta, totaleColpi, perOperazione, disponibili } from '../src/ricarica.js';
import { armiStampa } from '../src/stampa.js';
import { etichettaCaricatore } from '../src/ui/stampa.js';
import { vistaPlancia } from '../src/tavolo.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { contaColpi } from '../tools/caricatori-prima-dopo.mjs';

const { dati } = await datiReali();
const FUCILE = 'armi_distanza:fucile-d-assalto'; // caricatore da 30, proiettili da fucile
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: null, quantita: 1, note: '', ...extra });
const prepara = (equipaggiamento) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  return { m, s: inizializzaSessione(m), creazione };
};
const totale = (s, m, uid) => totaleColpi(m.ricarica[uid], s.munizioni[uid], s.scorte);

/** Il fucile con un caricatore di scorta a 22 colpi e 7 proiettili sciolti (la prova di Marcello). */
function preparaFucile() {
  const p = prepara([voce('f', FUCILE, { stato: 'impugnata' }), voce('sc', 'munizioni:proiettili-da-fucile', { quantita: 7 })]);
  p.s = allineaSessione({ ...p.s, munizioni: { f: { colpi: 30, riserve: 0, parziali: [22] } } }, p.m);
  return p;
}

test('la prova di Marcello: sparo fino a 15/30, tolgo, metto quello di scorta a 22/30, riempio quello da 15 con 7 sciolti → 22/30', () => {
  let { m, s } = preparaFucile();
  assert.equal(m.ricarica.f.modo, 'caricatore');
  assert.equal(m.ricarica.f.capacita, 30);
  const t0 = totale(s, m, 'f');
  assert.equal(t0, 30 + 22 + 7);
  s = consumaColpi(s, 'f', 15, m);
  assert.equal(s.munizioni.f.colpi, 15);
  const dopoSparo = totale(s, m, 'f');
  assert.equal(dopoSparo, t0 - 15, 'solo lo sparo toglie colpi');
  s = togliCaricatoreArma(s, 'f', m);
  assert.equal(s.munizioni.f.senzaCaricatore, true);
  assert.deepEqual(caricatoriDiScorta(s.munizioni.f, 30), [22, 15]);
  assert.equal(totale(s, m, 'f'), dopoSparo);
  s = inserisciCaricatoreArma(s, 'f', 22, m);
  assert.equal(s.munizioni.f.senzaCaricatore, undefined);
  assert.equal(s.munizioni.f.colpi, 22);
  assert.deepEqual(caricatoriDiScorta(s.munizioni.f, 30), [15]);
  assert.equal(totale(s, m, 'f'), dopoSparo);
  s = riempiCaricatoreArma(s, 'f', { quale: 15, quanti: 7 }, m);
  assert.deepEqual(caricatoriDiScorta(s.munizioni.f, 30), [22], 'quello da 15 è a 22/30');
  assert.equal(disponibili(m.ricarica.f.scorte[0], s.scorte), 0, 'i 7 sciolti sono nel caricatore');
  assert.equal(totale(s, m, 'f'), dopoSparo);
});

test('un riempimento può essere parziale: 7 proiettili nel caricatore vuoto da 30 → (7/30)', () => {
  let { m, s } = prepara([voce('f', FUCILE, { stato: 'impugnata' }), voce('sc', 'munizioni:proiettili-da-fucile', { quantita: 40 })]);
  s = allineaSessione({ ...s, munizioni: { f: { colpi: 30, riserve: 0, vuoti: 1 } } }, m);
  const t0 = totale(s, m, 'f');
  s = riempiCaricatoreArma(s, 'f', { quale: 0, quanti: 7 }, m);
  assert.deepEqual(caricatoriDiScorta(s.munizioni.f, 30), [7]);
  assert.equal(totale(s, m, 'f'), t0);
  // più di quanti ne entrano: si ferma al pieno; più degli sciolti: si ferma agli sciolti
  s = riempiCaricatoreArma(s, 'f', { quale: 7, quanti: 100 }, m);
  assert.deepEqual(caricatoriDiScorta(s.munizioni.f, 30), [30]);
  assert.equal(totale(s, m, 'f'), t0);
  // A.244 (06/11/2026, lotto 180): il caricatore nell'arma non si riempie — va estratto prima, e il totale non cambia
  s = consumaColpi(s, 'f', 10, m);
  assert.deepEqual(riempiCaricatoreArma(s, 'f', { quale: 'inserito', quanti: 4 }, m), s);
  assert.equal(s.munizioni.f.colpi, 20);
  assert.equal(totale(s, m, 'f'), t0 - 10);
});

test('il cambio di caricatore sceglie anche un parziale; senza scelta entra il più carico', () => {
  let { m, s } = prepara([voce('f', FUCILE, { stato: 'impugnata' })]);
  s = allineaSessione({ ...s, munizioni: { f: { colpi: 5, riserve: 1, parziali: [22, 12] } } }, m);
  const t0 = totale(s, m, 'f');
  const a = ricaricaArma(s, 'f', m);
  assert.equal(a.munizioni.f.colpi, 30, 'senza scelta il pieno');
  assert.deepEqual(caricatoriDiScorta(a.munizioni.f, 30), [22, 12, 5]);
  const b = ricaricaArma(s, 'f', m, 12);
  assert.equal(b.munizioni.f.colpi, 12, 'il giocatore sceglie quello a 12');
  assert.deepEqual(caricatoriDiScorta(b.munizioni.f, 30), [30, 22, 5]);
  for (const x of [a, b]) assert.equal(totale(x, m, 'f'), t0);
  // un caricatore che non c'è non entra e non cambia niente
  assert.deepEqual(ricaricaArma(s, 'f', m, 17).munizioni.f, s.munizioni.f);
});

test('il totale dei colpi non cambia in nessuna operazione (sequenze a caso)', () => {
  let seme = 7;
  const caso = (n) => { seme = (seme * 1103515245 + 12345) % 2147483648; return seme % n; };
  for (let giro = 0; giro < 60; giro++) {
    let { m, s } = prepara([voce('f', FUCILE, { stato: 'impugnata' }), voce('sc', 'munizioni:proiettili-da-fucile', { quantita: 25 })]);
    s = allineaSessione({ ...s, munizioni: { f: { colpi: caso(31), riserve: caso(3), parziali: [1 + caso(29)], vuoti: caso(2) } } }, m);
    const t0 = totale(s, m, 'f');
    for (let k = 0; k < 25; k++) {
      const scorta = caricatoriDiScorta(s.munizioni.f, 30);
      const una = scorta.length ? scorta[caso(scorta.length)] : null;
      const op = caso(6);
      if (op === 0) s = togliCaricatoreArma(s, 'f', m);
      else if (op === 1) s = inserisciCaricatoreArma(s, 'f', una, m);
      else if (op === 2) s = ricaricaArma(s, 'f', m, una);
      else if (op === 3) s = riempiCaricatoreArma(s, 'f', { quale: una ?? 'inserito', quanti: 1 + caso(12) }, m);
      else if (op === 4) s = riempiCaricatoreArma(s, 'f', { quale: 'inserito', quanti: 1 + caso(12) }, m);
      else s = riempiCaricatoriArma(s, 'f', m);
      assert.equal(totale(s, m, 'f'), t0, `giro ${giro}, passo ${k}, operazione ${op}`);
      assert.ok(caricatoriDiScorta(s.munizioni.f, 30).every((n) => n >= 0 && n <= 30));
    }
  }
});

test('armi caricate direttamente: restano un’altra cosa, 2 cartucce per AzP, 4 con Ricarica Esperta (A.135, A.182)', () => {
  let { m, s } = prepara([voce('r', 'armi_distanza:revolver', { stato: 'impugnata' }), voce('p', 'munizioni:proiettili-da-pistola', { quantita: 20 })]);
  const info = m.ricarica.r;
  assert.equal(info.modo, 'inserimento');
  assert.equal(info.singolo, true);
  assert.equal(perOperazione(info, [], dati), 2);
  assert.equal(perOperazione(info, ['ricarica-esperta'], dati), 4);
  // niente caricatori di scorta né «Togli il caricatore» per un revolver
  assert.deepEqual(togliCaricatoreArma(s, 'r', m), s);
  s = variaMunizioni(s, 'r', 'colpi', -6, m);
  const t0 = (x) => x.munizioni.r.colpi + disponibili(info.scorte[0], x.scorte);
  const n0 = t0(s);
  const due = ricaricaArma(s, 'r', m);
  assert.equal(due.munizioni.r.colpi, 2, '2 cartucce in 1 AzP');
  const mEsperta = { ...m, ricarica: { ...m.ricarica, r: { ...info, perOperazione: perOperazione(info, ['ricarica-esperta'], dati) } } };
  const quattro = ricaricaArma(s, 'r', mEsperta);
  assert.equal(quattro.munizioni.r.colpi, 4, '4 con Ricarica Esperta');
  for (const x of [due, quattro]) assert.equal(t0(x), n0);
  // Ricarica Esperta dà anche l'operazione gratuita del Round, fino a 4 cartucce (A.135, A.182)
  const R = dati.equipaggiamento.file.munizioni.ricarica;
  assert.ok(R.ricarica_rapida.talenti.includes('ricarica-esperta'));
  assert.ok(R.inserimento_singolo.migliorata.talenti.includes('ricarica-esperta'));
  assert.match(R.ricarica_rapida.promemoria, /gratuita per Round/);
});

test('la scheda da stampare: ogni caricatore con i suoi colpi, «nell’arma (15/30)», «car. 2 (22/30)»', () => {
  let { m, s, creazione } = preparaFucile();
  s = consumaColpi(s, 'f', 15, m);
  const scheda = calcolaScheda({ creazione, livelli: [], sessione: s }, dati);
  const riga = armiStampa(scheda, creazione, dati, s).find((x) => x.uid === 'f');
  assert.equal(riga.colpi.modo, 'caricatore');
  assert.deepEqual(riga.colpi.caricatori, [{ dove: 'arma', colpi: 15 }, { dove: 'scorta', colpi: 22 }]);
  assert.equal(etichettaCaricatore(riga.colpi, 1), 'nell’arma (15/30)');
  assert.equal(etichettaCaricatore(riga.colpi, 2), 'car. 2 (22/30)');
  // senza sessione la stampa resta quella di prima: «car. N» da segnare a penna
  const vuota = armiStampa(scheda, creazione, dati).find((x) => x.uid === 'f');
  assert.equal(vuota.colpi.caricatori, undefined);
  assert.equal(etichettaCaricatore(vuota.colpi, 1), 'car. 1');
});

test('plancia: le armi del PG hanno i colpi del caricatore e quelli di scorta', () => {
  let { m, s, creazione } = preparaFucile();
  s = consumaColpi(s, 'f', 15, m);
  const testo = serializza(creazione, { livelli: [], sessione: s });
  const v = vistaPlancia(testo, dati, 'Prova_liv1.json');
  const a = v.armi.find((x) => x.uid === 'f');
  assert.deepEqual(a.caricatore, { colpi: 15, capacita: 30, scorta: [22] });
});

test('la scheda digitale (Combattimento): «Caricatore inserito (15/30)», «Di scorta: (22/30)», Togli, Cambia, Metti N proiettili', () => {
  const ctx = contesto('Aiko-Tenzan_liv5_2026-10-02.json', { attiva: 'combattimento', scelte: (c) => ({ ...c, equipaggiamento: [...c.equipaggiamento, voce('f', FUCILE, { stato: 'impugnata' }), voce('sc', 'munizioni:proiettili-da-fucile', { quantita: 7 })] }),
    cambia: (x) => { x.munizioni = { ...x.munizioni, f: { colpi: 15, riserve: 0, parziali: [22] } }; } });
  const t = resa(ctx).testo();
  assert.match(t, /Caricatore inserito \(15\/30\)/);
  assert.match(t, /Di scorta: \(22\/30\)/);
  assert.match(t, /Togli il caricatore/);
  assert.match(t, /Cambia con questo/);
  assert.match(t, /Metti 7 proiettili/);
  assert.match(t, /A\.244/);
});

test('i personaggi di adesso: «un caricatore pieno» resta un caricatore a pieni colpi, nessun colpo in più o in meno', () => {
  // file salvato prima del 03/11: un caricatore nell'arma e due pieni di riserva come numero
  let { m, s, creazione } = prepara([voce('f', FUCILE, { stato: 'impugnata' }), voce('sc', 'munizioni:proiettili-da-fucile', { quantita: 12 })]);
  const vecchia = { ...s, munizioni: { f: { colpi: 18, riserve: 2, parziali: [9], vuoti: 1 } }, scorte: { sc: 2 } };
  const testo = serializza(creazione, { livelli: [], sessione: vecchia });
  const r = contaColpi(testo, dati);
  const f = r.armi.find((x) => x.uid === 'f');
  assert.equal(f.prima, 18 + 2 * 30 + 9 + 10);
  assert.equal(f.dopo, f.prima);
  assert.deepEqual(f.caricatori, ['nell’arma (18/30)', '(30/30)', '(30/30)', '(9/30)', '(0/30)']);
  // e su tutti i PG d'esempio con armi da fuoco
  const cartella = new URL('../esempi/', import.meta.url);
  for (const nome of readdirSync(cartella).filter((x) => x.endsWith('.json'))) {
    const x = contaColpi(readFileSync(new URL(nome, cartella), 'utf8'), dati);
    for (const a of x.armi) assert.equal(a.dopo, a.prima, `${nome}: ${a.nome}`);
  }
  assert.ok(m);
});
