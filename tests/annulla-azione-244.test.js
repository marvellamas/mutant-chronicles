import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 244, punto 4 — «Annulla» in cima, grande, e ONESTO. Prima del 244 il pulsante rimetteva la fotografia «di prima dell'ultima
// modifica ai valori di sessione», anche se dopo era successo altro: dopo un acquisto (scelte e crediti scritti senza fotografia)
// «Annulla» annullava la modifica PRECEDENTE ai PV credendo di annullare l'acquisto. Adesso la fotografia ricorda com'era lo stato subito
// DOPO l'azione, e il pulsante è attivo solo se non è cambiato niente da allora. Questo file fallisce se «Annulla» risulta attivo su
// un'azione che non sa annullare, se non dice che cosa annullerà, o se può risalire più indietro dell'ultima azione.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fotografia, nuovoPrecedente, chiudiPrecedente, segnaNonAnnullabile, sincronizzaRiferimento, statoAnnulla, cosaCambiato } from '../src/annulla-azione.js';
import { differenzeSessione } from '../src/collegamento.js';

const opz = { differenze: differenzeSessione, nomeStato: (x) => x };
const stato0 = () => ({ sessione: { pvAttuali: 40, pmAttuali: 10, crediti: 500, statiAttivi: [] }, calendario: { giorno: 1 }, scelte: { equipaggiamento: [] }, livelli: [] });

/** Come fa app.js: la fotografia di prima, l'azione, e la fotografia di dopo. */
function azioneSessione(s, modifica) {
  const prec = nuovoPrecedente({ sessione: s.sessione, calendario: s.calendario });
  const nuovo = { ...s, sessione: { ...s.sessione, ...modifica } };
  chiudiPrecedente(prec, nuovo);
  return { s: nuovo, prec };
}

test('NIENTE DA ANNULLARE: il pulsante c’è, spento, e lo dice', () => {
  const s = stato0();
  const a = statoAnnulla(null, fotografia(s), fotografia(s), opz);
  assert.equal(a.attivo, false);
  assert.equal(a.vuoto, true);
  assert.match(a.motivo, /Niente da annullare/);
});

test('UN’AZIONE CHE SA ANNULLARE: attivo, e dice che cosa annullerà PRIMA di farlo («PV 34 → 40»)', () => {
  const { s, prec } = azioneSessione(stato0(), { pvAttuali: 34 });
  const a = statoAnnulla(prec, null, fotografia(s), opz);
  assert.equal(a.attivo, true);
  assert.equal(a.etichetta, 'PV 34 → 40', 'non «Annulla» e basta: PV adesso → PV che tornerà');
  assert.equal(a.motivo, null);
});

test('UN’AZIONE CHE NON SA ANNULLARE (acquisto: scelte e crediti) SPEGNE IL PULSANTE, e non annulla quella di PRIMA al posto sua', () => {
  // prima un'azione annullabile (i PV)…
  let { s, prec } = azioneSessione(stato0(), { pvAttuali: 34 });
  assert.equal(statoAnnulla(prec, null, fotografia(s), opz).attivo, true);
  // …poi un acquisto: scelte nuove e crediti scritti SENZA scattare una fotografia (come `compra` in app.js)
  s = { ...s, scelte: { equipaggiamento: [{ uid: 'x' }] }, sessione: { ...s.sessione, crediti: 400 } };
  const a = statoAnnulla(prec, null, fotografia(s), opz);
  assert.equal(a.attivo, false, 'il pulsante NON deve annullare i PV credendo di annullare l’acquisto');
  assert.match(a.motivo, /^L.ultima azione non si annulla: ha cambiato gli oggetti, i crediti o le scelte del personaggio/);
  assert.equal(a.etichetta, null);
});

test('UNA RIGA DELLO STORICO, UN TIRO, I LIVELLI, UN AGGIORNAMENTO DA FUORI: spento, con il motivo giusto', () => {
  const base = azioneSessione(stato0(), { pvAttuali: 34 });
  const casi = [
    ['una riga dello storico', { ...base.s, sessione: { ...base.s.sessione, storico: ['procedi comunque'] } }, /lo storico del personaggio/],
    ['un tiro', { ...base.s, sessione: { ...base.s.sessione, tiri: [{ v: 12 }] } }, /i tiri/],
    ['i livelli (salita)', { ...base.s, livelli: [{ grado: 2 }] }, /i livelli del personaggio/],
    ['il calendario di un altro tablet', { ...base.s, calendario: { giorno: 2 } }, /il calendario/],
    ['valori di sessione scritti da fuori', { ...base.s, sessione: { ...base.s.sessione, pmAttuali: 3, round: 4, durate: [1] } }, /valori di sessione/],
  ];
  for (const [nome, ora, motivo] of casi) {
    const a = statoAnnulla(base.prec, null, fotografia(ora), opz);
    assert.equal(a.attivo, false, `${nome}: non si annulla`);
    assert.match(a.motivo, motivo, nome);
    assert.match(a.motivo, /^L.ultima azione non si annulla:/);
  }
});

test('UN’AZIONE MISTA SEGNATA NON ANNULLABILE (Nuova sessione che rinnova i Capolavori): spento col suo motivo', () => {
  const { s, prec } = azioneSessione(stato0(), { pvAttuali: 40 });
  segnaNonAnnullabile(prec, 'ha rinnovato l’uso dei Capolavori degli oggetti, che questo pulsante non rimette');
  const a = statoAnnulla(prec, null, fotografia(s), opz);
  assert.equal(a.attivo, false);
  assert.match(a.motivo, /Capolavori/);
});

test('LA MEMORIA DELLE SCELTE DI «Attacca!» NON È UN’AZIONE: non toglie l’annullo a quella di prima', () => {
  let { s, prec } = azioneSessione(stato0(), { pmAttuali: 8 });
  s = { ...s, sessione: { ...s.sessione, attacchi: { a1: { modalita: 'raffica' } } } };
  assert.equal(statoAnnulla(prec, null, fotografia(s), opz).attivo, false, 'senza il riferimento che la segue, una scrittura qualunque spegnerebbe il pulsante');
  sincronizzaRiferimento(prec, null, fotografia(s));
  assert.equal(statoAnnulla(prec, null, fotografia(s), opz).attivo, true, 'con la memoria sincronizzata, resta attivo');
});

test('NON RISALE PIÙ INDIETRO DELL’ULTIMA AZIONE: dopo l’annullo non c’è più niente da annullare', () => {
  let { s, prec } = azioneSessione(stato0(), { pvAttuali: 34 });
  const { s: s2, prec: prec2 } = azioneSessione(s, { pvAttuali: 30 }); // seconda azione: la fotografia è una sola, quella dell'ultima
  assert.equal(prec2.prima.sessione.pvAttuali, 34, 'la fotografia è di prima della SECONDA azione, non della prima');
  // annullo: si rimette la fotografia e la scheda azzera la fotografia, con lo stato nuovo come riferimento
  const dopoAnnullo = { ...s2, sessione: prec2.prima.sessione };
  const a = statoAnnulla(null, fotografia(dopoAnnullo), fotografia(dopoAnnullo), opz);
  assert.equal(a.attivo, false);
  assert.equal(a.vuoto, true, 'un secondo «Annulla» non fa niente: non può tornare alla prima azione');
});

test('COSA È CAMBIATO: niente, se lo stato è lo stesso', () => {
  const f = fotografia(stato0());
  assert.deepEqual(cosaCambiato(f, f), []);
});

test('IL PULSANTE È CABLATO COSÌ: si ricontrolla al momento di premere, è spento col motivo, non si nasconde', () => {
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  const tab = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  const annulla = /annullaSessione: \(\) => \{[\s\S]*?\n      \},/.exec(app)[0];
  assert.match(annulla, /const ora = leggiAnnulla\(\);\s+if \(!ora\.attivo\)/, 'l’azione ricontrolla che sia attivo prima di rimettere qualcosa');
  assert.ok(annulla.indexOf('leggiAnnulla()') < annulla.indexOf('precedenteTavolo.prima'), 'prima il controllo, poi il ripristino');
  assert.match(app, /chiudiPrecedente\(snap, fotoStato\(\)\)/, 'ogni fotografia registra com’era lo stato subito dopo l’azione');
  // lotto 258: lo spegnimento passa dalla funzione unica (src/ui/spento.js): aria-disabled, mai `disabled`, e il tocco mostra il motivo
  assert.match(tab, /spegni\(annulla, a\.attivo \? null : \(a\.motivo \|\| 'Niente da annullare\.'\)\)/, 'spento (aria-disabled, toccabile) quando non si può, col motivo');
  assert.match(app, /stato\.messaggioScheda = \{ tipo: 'attenzione', testo: ora\.motivo \}/, 'il tocco su un pulsante spento dice il motivo per intero');
  assert.match(tab, /annulla\.title = a\.attivo \?/, 'col motivo o con l’effetto nel suggerimento');
  assert.doesNotMatch(tab, /annulla\.hidden/, 'non si nasconde più: è sempre lì, e dice');
});
