// Tab Combattimento (docs/layout-sd.md, pezzo 3): Corruzione Oscura nei valori effettivi (Giocatore
// §5.20), armi impugnate e «Ricarica», caricatori di riserva che cambiano solo nella sessione (dalla
// riga dell'Inventario). La disposizione nella SD è verificata nel browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { condizioniAttive } from '../src/condizioni.js';
import { inizializzaSessione, massimiSessione, allineaSessione, nuovaSessione, penalitaSessione, ricaricaArma, variaMunizioni } from '../src/sessione.js';
import { validaDati } from '../src/validate.js';
import { preparaStampa } from '../src/stampa.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const creazione = (equipaggiamento = []) => ({ ...MISHIMA_AGENTE, equipaggiamento });
const massimi = (c) => massimiSessione(calcolaScheda({ creazione: c, livelli: [] }, dati), c, dati);
const alTavolo = (c, modifica = {}) => calcolaScheda({ creazione: c, livelli: [], sessione: { ...inizializzaSessione(massimi(c)), ...modifica } }, dati);
const CROS = dati.regole.corruzione.stati;
const indice = (nome) => CROS.findIndex((x) => x.nome === nome);

test('§5.20: gradi della Corruzione Oscura nei dati, dal manuale (Umano … Caotico, Oscuro irreversibile)', () => {
  assert.deepEqual(CROS.map((x) => [x.nome, x.penalita]), [
    ['Umano', 0], ['Esposto', 0], ['Contagiato', -1], ['Infetto', -2], ['Corrotto', -4], ['Eretico', -6], ['Caotico', -10], ['Oscuro', null],
  ]);
  assert.equal(CROS.at(-1).irreversibile, true);
  assert.deepEqual(dati.regole.corruzione.si_applica_a, ['abilita', 'salvezze']);
});

test('§5.20: la penalità dello Stato attuale entra nei VA e nelle Salvezze effettivi, con la provenienza', () => {
  const c = creazione();
  const riposo = alTavolo(c);
  const s = alTavolo(c, { corruzione: indice('Corrotto') });
  const furt = s.abilita.find((a) => a.nome === 'Furtività');
  assert.equal(furt.effettivo, riposo.abilita.find((a) => a.nome === 'Furtività').effettivo - 4);
  const riga = furt.provenienza.righe.find((r) => r.fonte === 'Corrotto');
  assert.deepEqual([riga.valore, riga.nota], [-4, 'Corruzione Oscura (§5.20)']);
  // tutte le Prove Salvezza
  for (const id of Object.keys(s.salvezze)) assert.equal(s.salvezze[id].effettivo, riposo.salvezze[id].effettivo - 4, id);
  // solo lo Stato attuale, senza sommare i precedenti: Eretico −6, non −1 −2 −4 −6
  assert.equal(alTavolo(c, { corruzione: indice('Eretico') }).abilita.find((a) => a.nome === 'Furtività').effettivo, riposo.abilita.find((a) => a.nome === 'Furtività').effettivo - 6);
  // Umano, Esposto e Oscuro (PNG, penalità «—»): nessuna condizione
  for (const n of ['Umano', 'Esposto', 'Oscuro']) assert.ok(!condizioniAttive({ ...inizializzaSessione(massimi(c)), corruzione: indice(n) }, dati).some((x) => x.fonte === 'corruzione'), n);
  // non tocca Iniziativa (§5.20: «non modifica direttamente Iniziativa, Movimento, Azioni…»)
  assert.deepEqual(s.tavolo.iniziativa, riposo.tavolo.iniziativa);
  assert.deepEqual(s.tavolo.movimento, riposo.tavolo.movimento);
  // il promemoria delle penalità la conta
  assert.equal(penalitaSessione({ ...inizializzaSessione(massimi(c)), corruzione: indice('Infetto') }, dati).corruzione.nome, 'Infetto');
});

test('Corruzione nella sessione: limitata ai gradi, non azzerata da «Nuova sessione», assente nei salvataggi vecchi = Umano', () => {
  const m = massimi(creazione());
  assert.equal(m.corruzione, CROS.length - 1);
  assert.equal(allineaSessione({ ...inizializzaSessione(m), corruzione: 99 }, m).corruzione, CROS.length - 1);
  const vecchia = inizializzaSessione(m);
  delete vecchia.corruzione;
  assert.equal(allineaSessione(vecchia, m).corruzione, 0);
  assert.equal(nuovaSessione({ ...inizializzaSessione(m), corruzione: 3, affaticamento: 2 }, m).corruzione, 3);
});

test('validatore: gradi di Corruzione con penalità mancante o positiva, irreversibile con penalità', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d.regole.corruzione); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  assert.match(e((c) => { c.stati[2].penalita = 1; }), /corruzione\.stati\[2\]\.penalita: penalità intera ≤ 0/);
  assert.match(e((c) => { c.stati.at(-1).penalita = -12; }), /irreversibile ha penalità null/);
  assert.match(e((c) => { delete c.stati; }), /corruzione\.stati: elenco/);
  assert.match(e((c) => { c.si_applica_a = []; }), /corruzione\.si_applica_a/);
});

test('armi impugnate: solo quelle in mano sono calcolate per la tab; «Ricarica» consuma dalle riserve della sessione', () => {
  const c = creazione([
    voce('p', 'armi_distanza_corporative:belliger', 'impugnata'),
    voce('s', 'armi:spada-leggera', 'pronta'),
    voce('d', 'armi:pugnale', 'deposito'),
  ]);
  const s = alTavolo(c);
  assert.deepEqual(s.equipaggiamento.armi.map((a) => a.uid), ['p']);
  const m = massimi(c);
  let sess = inizializzaSessione(m);
  const cap = m.caricatori.p;
  assert.ok(cap > 0);
  // i caricatori di riserva si cambiano (dalla riga dell'Inventario) con variaMunizioni; la tab li legge
  sess = variaMunizioni(sess, 'p', 'colpi', -cap, m);
  sess = variaMunizioni(sess, 'p', 'riserve', 2, m);
  sess = ricaricaArma(sess, 'p', m);
  assert.deepEqual([sess.munizioni.p.colpi, sess.munizioni.p.riserve], [cap, 1]);
});

test('SS invariata: il foglio 3 ha ancora i gradi di Ferite e Affaticamento; la Corruzione è nei dati della tab', () => {
  const f3 = preparaStampa({ creazione: creazione(), livelli: [] }, dati).fogli.find((f) => f.id === 'combattimento').dati;
  assert.ok(f3.affaticamento.length && f3.ferite.stati.length);
  assert.deepEqual(f3.corruzione.map((x) => x.nome), CROS.map((x) => x.nome));
});
