// Stati (§5.18, §5.5) nei valori effettivi e nelle utility (docs/ricognizione-stati.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { inizializzaSessione } from '../src/sessione.js';
import { calcolaAttaccoDistanza, calcolaAttaccoRavvicinato } from '../src/attacco.js';
import { calcolaLancio } from '../src/lancio.js';
import { condizioniAttive } from '../src/condizioni.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato) => ({ uid, rif, stato, quantita: 1, note: '' });
// una pistola e un tonfa impugnati (due mani), senza armatura
const CREAZIONE = { ...MISHIMA_AGENTE, equipaggiamento: [voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata'), voce('t', 'armi:tonfa', 'impugnata')] };
const sessione = (statiAttivi = []) => ({ ...inizializzaSessione({ pv: 10, pm: 5, puntiEroe: 10, ferite: 6, caricatori: {} }), statiAttivi });
const al = (stati) => {
  const s = sessione(stati);
  return { scheda: calcolaScheda({ creazione: CREAZIONE, livelli: [], sessione: s }, dati), sessione: s };
};
const riposo = al([]);
const arma = (p, uid) => p.scheda.equipaggiamento.armi.find((a) => a.uid === uid);
const va = (p, nome) => p.scheda.abilita.find((a) => a.nome === nome).effettivo;
const distanza = (p, d = {}) => calcolaAttaccoDistanza(p, arma(p, 'p'), { distanza: 5, ...d }, dati);
const ravvicinato = (p, d = {}) => calcolaAttaccoRavvicinato(p, arma(p, 't'), d, dati);

test('Accecato: −8 al VA per colpire a distanza (anche in «Attacca!») e alle Difese; niente Tiro Mirato', () => {
  const p = al(['accecato']);
  assert.equal(arma(p, 'p').vaEffettivo, arma(riposo, 'p').vaEffettivo - 8);
  assert.equal(va(p, 'Difese'), va(riposo, 'Difese') - 8);
  assert.equal(va(p, 'Pilotare'), va(riposo, 'Pilotare') - 8);
  // risposta A.51: Percezione non ha una penalità generale (le azioni solo visive falliscono)
  assert.equal(va(p, 'Percezione'), va(riposo, 'Percezione'));
  assert.equal(distanza(p).va_finale, distanza(riposo).va_finale - 8);
  assert.ok(distanza(p).provenienza.righe.some((x) => x.fonte === 'Accecato' && x.valore === -8));
  // anche nel corpo a corpo, e Colpo Mirato vietato
  assert.equal(ravvicinato(p).va_finale, ravvicinato(riposo).va_finale - 8);
  assert.match(distanza(p, { mirato: true }).impossibile?.motivo ?? '', /Accecato/);
  assert.match(ravvicinato(p, { manovra: 'mirato' }).impossibile?.motivo ?? '', /Accecato/);
  // una Prova che non richiede la vista non cambia
  assert.equal(va(p, 'Cultura'), va(riposo, 'Cultura'));
});

test('A Terra: −4 alle ravvicinate e alle Difese; il −2 a distanza è di chi attacca il personaggio, non suo', () => {
  const p = al(['a-terra']);
  assert.equal(arma(p, 't').vaEffettivo, arma(riposo, 't').vaEffettivo - 4);
  assert.equal(va(p, 'Difese'), va(riposo, 'Difese') - 4);
  // a distanza nessuna penalità per chi è A Terra (§5.5: «può usare normalmente armi a distanza»)
  assert.equal(arma(p, 'p').vaEffettivo, arma(riposo, 'p').vaEffettivo);
  assert.equal(distanza(p).va_finale, distanza(riposo).va_finale);
  assert.ok(!distanza(p).provenienza.righe.some((x) => x.valore === -2));
  // nel corpo a corpo il −4 arriva dallo Stato una volta sola
  assert.equal(ravvicinato(p).va_finale, ravvicinato(riposo).va_finale - 4);
  // equilibrio: uso specifico di Atletica, il VA generale non cambia
  const atl = p.scheda.abilita.find((a) => a.nome === 'Atletica');
  assert.equal(atl.effettivo, va(riposo, 'Atletica'));
  const eq = atl.usiSpecifici.find((u) => u.uso === 'equilibrio');
  assert.equal(eq.valore, atl.effettivo - 4);
});

test('Assordato: −4 solo per l’uso «udito» (Percezione), il VA generale non cambia', () => {
  const p = al(['assordato']);
  const perc = p.scheda.abilita.find((a) => a.nome === 'Percezione');
  assert.equal(perc.effettivo, va(riposo, 'Percezione'));
  assert.equal(perc.usiSpecifici.find((u) => u.uso === 'quando l’udito è importante').valore, perc.effettivo - 4);
});

test('Stordito: «Attacca!» e «Lancia!» avvisano che non c’è Azione Principale; Terrorizzato: solo azioni difensive', () => {
  const p = al(['stordito']);
  assert.ok(distanza(p).avvisi.some((x) => /Stordito: nessuna Azione Principale/.test(x)));
  assert.ok(ravvicinato(p).avvisi.some((x) => /Stordito: nessuna Azione Principale/.test(x)));
  const inc = dati.incantesimi.incantesimi.find((i) => i.nome === 'Colpo Elementale');
  assert.ok(calcolaLancio(p, inc, {}, dati).avvisi.some((x) => /Stordito/.test(x)));
  assert.deepEqual(distanza(riposo).avvisi, []);
  const t = al(['terrorizzato']);
  assert.ok(ravvicinato(t).avvisi.some((x) => /Terrorizzato: .*soltanto per difendersi/.test(x)));
});

test('due Stati insieme si sommano (il §5.18 non dà un’altra regola)', () => {
  const p = al(['accecato', 'a-terra']);
  assert.equal(va(p, 'Difese'), va(riposo, 'Difese') - 12);
  assert.equal(arma(p, 't').vaEffettivo, arma(riposo, 't').vaEffettivo - 12);
  assert.equal(arma(p, 'p').vaEffettivo, arma(riposo, 'p').vaEffettivo - 8);
  const incendiatoRallentato = al(['incendiato', 'rallentato']);
  assert.equal(va(incendiatoRallentato, 'Atletica'), va(riposo, 'Atletica') - 4);
});

// A.106 (E&L del 05/10/2026): luce della scena nella sessione (regole.json → illuminazione)
const conLuce = (luce, extra = {}, creazione = CREAZIONE, stati = []) => {
  const s = { ...sessione(stati), luce, ...extra };
  return { scheda: calcolaScheda({ creazione, livelli: [], sessione: s }, dati), sessione: s };
};
const usoVisiva = (p) => p.scheda.abilita.find((a) => a.nome === 'Percezione').usiSpecifici?.find((u) => u.uso === 'visiva')?.modificatore ?? 0;

test('A.106: penombra −2 e luce molto scarsa −4 ad attacchi e Difese; Percezione visiva a parte; buio come Accecato', () => {
  const pen = conLuce('penombra');
  assert.equal(arma(pen, 'p').vaEffettivo, arma(riposo, 'p').vaEffettivo - 2);
  assert.equal(va(pen, 'Difese'), va(riposo, 'Difese') - 2);
  assert.equal(va(pen, 'Percezione'), va(riposo, 'Percezione'), 'Percezione: nessuna penalità generale');
  assert.ok(usoVisiva(pen) < 0, 'Percezione visiva: valore a parte');
  assert.equal(va(pen, 'Potere'), va(riposo, 'Potere'), 'non Potere');
  const scarsa = conLuce('scarsa');
  assert.equal(distanza(scarsa).va_finale, distanza(riposo).va_finale - 4);
  // buio totale = Accecato (−8, niente Tiro Mirato), non sommato a un Accecato già attivo
  const buio = conLuce('buio');
  assert.equal(arma(buio, 'p').vaEffettivo, arma(riposo, 'p').vaEffettivo - 8);
  assert.match(distanza(buio, { mirato: true }).impossibile?.motivo ?? '', /Accecato/);
  assert.equal(arma(conLuce('buio', {}, CREAZIONE, ['accecato']), 'p').vaEffettivo, arma(riposo, 'p').vaEffettivo - 8);
  // la visione che copre il bersaglio elimina −2/−4, non il buio
  assert.equal(arma(conLuce('scarsa', { luceVisione: true }), 'p').vaEffettivo, arma(riposo, 'p').vaEffettivo);
  assert.equal(arma(conLuce('buio', { luceVisione: true }), 'p').vaEffettivo, arma(riposo, 'p').vaEffettivo - 8);
  // Visione Perfetta: −3 alla penalità della Percezione visiva, non agli attacchi
  const usi = (scheda) => condizioniAttive({ ...sessione(), luce: 'scarsa' }, dati, scheda).find((c) => c.etichetta === 'Luce: Luce molto scarsa');
  const perfetta = usi({ talentiLiberi: [{ id: 'visione-perfetta' }] });
  assert.deepEqual([usi({ talentiLiberi: [] }).usi[0].valore, perfetta.usi[0].valore], [-4, -1]);
  assert.equal(perfetta.effetto.va_gruppi.luce, -4, 'gli attacchi non migliorano');
});
