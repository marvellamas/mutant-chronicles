// Lotto 163 (02/11/2026): A.215, risposta di Davide del 30/10/2026. Le celle e i pacchi si tolgono, si ricaricano fuori
// dall'arma e si rimettono; i caricatori si riempiono fuori dal combattimento con un'operazione sola.
//   «La cella energetica può essere ricaricata soltanto dopo essere stata tolta dall'arma.»
//   «Il comando di ricarica energetica non è disponibile mentre la cella è inserita nell'arma.»
//   «Rimuovere un caricatore non ne cancella il contenuto.» (esempio Axis: 8 colpi + 7 dai 30 sciolti → 15/15, 23 sciolti)
import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { contesto, resa, clic } from './scheda-aiuti.js';
import { calcolaScheda } from '../src/calc.js';
import {
  massimiSessione, allineaSessione, inizializzaSessione, variaMunizioni, ricaricaArma, togliCellaArma, inserisciCellaArma,
  riempiCaricatoriArma, ricaricaConTrasformatore,
} from '../src/sessione.js';
import { statoRicarica, disponibili, celleTolte } from '../src/ricarica.js';
import { elencoTrasformatori, statoTrasformatore, bersagliRicaricabili, fontiCec, pianoRicarica, RIFIUTO_INSERITA } from '../src/trasformatori.js';
import { deserializzaPersonaggio } from '../src/character.js';

const { dati } = await datiReali();
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: null, quantita: 1, note: '', ...extra });
const prepara = (equipaggiamento) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  return { m, s: inizializzaSessione(m), voci: equipaggiamento };
};
/** Quante celle esistono per quell'arma: inserita + tolte + piene di scorta. Non deve mai cambiare. */
const contaCelle = (s, m, uid) => (s.munizioni[uid].senzaCella ? 0 : 1) + celleTolte(s.munizioni[uid]).length
  + m.ricarica[uid].scorte.reduce((n, x) => n + disponibili(x, s.scorte), 0);
const ricaricaCol = (s, m, voci, bersaglio) => {
  const t = elencoTrasformatori(voci, dati)[0];
  const piano = pianoRicarica({ t, stato: statoTrasformatore(s.trasformatori, t.uid), bersaglio, colore: 'Rosso', fonte: fontiCec(voci, s.nec, 'Rosso', dati)[0] }, dati);
  return { piano, s: ricaricaConTrasformatore(s, { uid: t.uid, colore: 'Rosso', bersaglio, piano }, m) };
};

test('la sequenza della consegna: scarico, tolgo, metto una piena di scorta, ricarico la scarica fuori dall’arma, la rimetto', () => {
  let { m, s, voci } = prepara([voce('k', 'armi_distanza_corporative:kep-808', { stato: 'impugnata' }), voce('sc', 'munizioni:cella-kep-808', { quantita: 1 }),
    voce('t', 'nec:trasformatore-portatile-multicromatico'), voce('c', 'nec:cec-rosso')]);
  const n0 = contaCelle(s, m, 'k');
  assert.equal(n0, 2, 'una nell’arma e una di scorta');
  // sparo fino a scaricarla
  s = variaMunizioni(s, 'k', 'colpi', -10, m);
  assert.equal(s.munizioni.k.colpi, 0);
  // tolgo la cella: esce vuota e resta (non è «consumata»)
  s = togliCellaArma(s, 'k', m);
  assert.deepEqual([s.munizioni.k.senzaCella, s.munizioni.k.colpi, s.munizioni.k.celle], [true, 0, [0]]);
  assert.equal(contaCelle(s, m, 'k'), n0);
  // metto la piena di scorta
  s = inserisciCellaArma(s, 'k', { da: 'scorta', uid: 'sc' }, m);
  assert.deepEqual([s.munizioni.k.senzaCella, s.munizioni.k.colpi, s.munizioni.k.celle, s.scorte.sc], [undefined, 10, [0], 1]);
  assert.equal(contaCelle(s, m, 'k'), n0);
  // il trasformatore: la tolta (vuota) sì, l'inserita no
  const bersagli = bersagliRicaricabili(voci, { nec: s.nec, munizioni: s.munizioni }, m.ricarica, dati);
  const tolta = bersagli.find((b) => b.id === 'cella:k:0');
  assert.equal(tolta.mancanti, 10);
  const r = ricaricaCol(s, m, voci, tolta);
  assert.equal(r.piano.ok, true);
  s = r.s;
  assert.deepEqual(s.munizioni.k.celle, [10]);
  // la sparo di nuovo a 3 e la cambio: entra la ricaricata, la tolta resta con 3
  s = variaMunizioni(s, 'k', 'colpi', -7, m);
  s = ricaricaArma(s, 'k', m);
  assert.deepEqual([s.munizioni.k.colpi, s.munizioni.k.celle], [10, [3]]);
  assert.equal(contaCelle(s, m, 'k'), n0, 'nessuna cella creata o perduta');
});

test('il trasformatore non ricarica mai una cella inserita, e dice perché (se torna a farlo, questo test fallisce)', () => {
  let { m, s, voci } = prepara([voce('k', 'armi_distanza_corporative:kep-808', { stato: 'impugnata' }), voce('t', 'nec:trasformatore-portatile-multicromatico'), voce('c', 'nec:cec-rosso')]);
  s = variaMunizioni(s, 'k', 'colpi', -8, m);
  const dentro = bersagliRicaricabili(voci, { nec: s.nec, munizioni: s.munizioni }, m.ricarica, dati).find((b) => b.uid === 'k');
  assert.equal(dentro.inserita, true);
  assert.equal(dentro.rifiuto, RIFIUTO_INSERITA);
  const t = elencoTrasformatori(voci, dati)[0];
  const piano = pianoRicarica({ t, stato: statoTrasformatore(s.trasformatori, 't'), bersaglio: dentro, colore: 'Rosso', fonte: fontiCec(voci, s.nec, 'Rosso', dati)[0] }, dati);
  assert.equal(piano.ok, false);
  assert.match(piano.errore, /inserita nell’arma: si ricarica soltanto dopo averla tolta/);
  // anche con un piano «riuscito» forzato a mano, la sessione non cambia: la cella inserita resta a 2
  const forzato = { ok: true, trasferite: 8, tamponeInizio: 100, tamponeDopo: 92, preleva: false };
  for (const bersaglio of [dentro, { tipo: 'cella', uid: 'k' }, { tipo: 'cella', uid: 'k', indice: 0 }]) {
    const dopo = ricaricaConTrasformatore(s, { uid: 't', colore: 'Rosso', bersaglio, piano: forzato }, m);
    assert.equal(dopo.munizioni.k.colpi, 2, JSON.stringify(bersaglio));
  }
});

test('Gehemmapuker: il pacco si cambia a 1 AzP con entrambe le mani (§7.20.6); una cella d’arma a 1 AzP con le mani necessarie (§7.20.5)', () => {
  const CC = dati.equipaggiamento.file.munizioni.ricarica.cambio_cella;
  const { m } = prepara([voce('g', 'armi_distanza_corporative:gehemmapuker', { stato: 'impugnata' }), voce('p', 'munizioni:pacco-nec-gehemmapuker')]);
  assert.deepEqual([m.ricarica.g.modo, m.ricarica.g.cella.unita], ['cella', 'getti']);
  assert.equal(CC.per_unita[m.ricarica.g.cella.unita].azione, '1 AzP, entrambe le mani, nessuna Prova (Armamenti §7.20.6)');
  assert.equal(CC.azione, '1 AzP, senza Prova, con le mani necessarie (Armamenti §7.20.5)');
  // nella scheda: «Cambia pacco», con il costo del manuale; la riga del pacco dice il costo del cambio
  const c = contesto('Fratello-Anselmo-Viri_liv3_2026-10-02.json', {
    attiva: 'combattimento',
    scelte: (sc) => { sc.equipaggiamento = [...(sc.equipaggiamento ?? []), voce('xg', 'armi_distanza_corporative:gehemmapuker', { stato: 'impugnata' }), voce('xp', 'munizioni:pacco-nec-gehemmapuker')]; return sc; },
    cambia: (ses) => { ses.munizioni.xg = { colpi: 0, riserve: 0 }; },
  });
  const r = resa(c);
  const bottone = r.tutti.find((n) => n.tagName === 'BUTTON' && n.textContent === 'Cambia pacco');
  assert.ok(bottone, 'il pulsante del cambio del pacco');
  assert.match(bottone.attributi?.title ?? bottone.title ?? '', /entrambe le mani/);
  assert.match(r.testo(), /Cambio: 1 AzP, entrambe le mani, nessuna Prova \(Armamenti §7\.20\.6\)/);
  clic(bottone);
  assert.ok(c.chiamate.some(([n, uid]) => n === 'ricarica' && uid === 'xg'));
});

test('le armi ravvicinate a cella (spada elettrificata): senza celle di scorta niente ricarica gratis; con una, il cambio tiene la vecchia', () => {
  let { m, s } = prepara([voce('sp', 'armi_corporative:spada-elettrificata-csa-404', { stato: 'impugnata' })]);
  assert.equal(m.ricarica.sp.modo, 'cella');
  s = variaMunizioni(s, 'sp', 'colpi', -1, m);
  assert.equal(statoRicarica(m.ricarica.sp, s.munizioni.sp, s.scorte).possibile, false, 'prima «Ricarica» la riempiva senza una cella');
  assert.equal(ricaricaArma(s, 'sp', m).munizioni.sp.colpi, 4);
  ({ m, s } = prepara([voce('sp', 'armi_corporative:spada-elettrificata-csa-404', { stato: 'impugnata' }), voce('cr', 'munizioni:cella-ravvicinata-comune', { quantita: 2 })]));
  s = variaMunizioni(s, 'sp', 'colpi', -2, m);
  s = ricaricaArma(s, 'sp', m);
  assert.deepEqual([s.munizioni.sp.colpi, s.munizioni.sp.celle, s.scorte.cr], [5, [3], 1]);
});

test('caricatori: l’esempio dell’Axis — 8 colpi, 30 sciolti, «Riempi i caricatori» → 15/15, 23 sciolti, sempre un caricatore', () => {
  let { m, s } = prepara([voce('a', 'armi_distanza_corporative:axis-227', { stato: 'impugnata' }), voce('pp', 'munizioni:proiettili-da-pistola', { quantita: 30 })]);
  assert.equal(m.ricarica.a.modo, 'caricatore');
  s = variaMunizioni(s, 'a', 'colpi', -7, m);
  assert.equal(s.munizioni.a.colpi, 8);
  s = riempiCaricatoriArma(s, 'a', m);
  assert.deepEqual([s.munizioni.a.colpi, s.munizioni.a.riserve, s.scorte.pp, s.munizioni.a.parziali, s.munizioni.a.vuoti], [15, 0, 7, undefined, undefined]);
  assert.equal(30 - s.scorte.pp, 23);
  // un caricatore parziale e uno vuoto tolti: si riempiono anche loro, finché ci sono munizioni, e tornano fra i pieni
  s = allineaSessione({ ...s, munizioni: { a: { colpi: 15, riserve: 0, parziali: [6], vuoti: 1 } } }, m);
  s = riempiCaricatoriArma(s, 'a', m);
  assert.deepEqual([s.munizioni.a.riserve, s.munizioni.a.parziali, s.munizioni.a.vuoti, s.scorte.pp], [1, [14], undefined, 30]);
  // senza munizioni sciolte non cambia niente
  assert.deepEqual(riempiCaricatoriArma(s, 'a', m), s);
});

test('i personaggi di adesso non si rompono: la cella inserita resta con le sue cariche, le scorte restano piene, il file non cambia forma', () => {
  // la forma salvata prima della A.215: { colpi } e le scorte consumate
  const { m } = prepara([voce('k', 'armi_distanza_corporative:kep-808', { stato: 'impugnata' }), voce('sc', 'munizioni:cella-kep-808', { quantita: 3 })]);
  const prima = { munizioni: { k: { colpi: 4, riserve: 0 } }, scorte: { sc: 1 } };
  const s = allineaSessione(prima, m);
  assert.deepEqual([s.munizioni.k, s.scorte.sc], [{ colpi: 4, riserve: 0 }, 1]);
  // la copia di Dimitri (spada CSA 404, 4 cariche su 5): prima e dopo uguali
  const testo = readFileSync(new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url), 'utf8');
  const o = JSON.parse(testo);
  const p = deserializzaPersonaggio(testo);
  const mm = massimiSessione(calcolaScheda(p, dati), p.creazione, dati);
  const dopo = allineaSessione(o.sessione, mm);
  for (const [uid, x] of Object.entries(o.sessione.munizioni ?? {})) if (mm.ricarica[uid]?.modo === 'cella') assert.deepEqual(dopo.munizioni[uid], x, uid);
});
