// A.116 (E&L del 05/10/2026, decisione 125): luce e attività pratiche che richiedono la vista (regole.json →
// illuminazione.richiede_vista; src/condizioni.js → abilitaVista, condizioniAttive; sessione.vistaAbilita).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { preparaTab } from '../src/stampa.js';
import { massimiSessione, inizializzaSessione, allineaSessione } from '../src/sessione.js';
import { abilitaVista } from '../src/condizioni.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const creazione = { ...MISHIMA_AGENTE };
const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
const tab = (extra) => preparaTab({ creazione, livelli: [] }, dati, { sessione: allineaSessione({ ...inizializzaSessione(m), ...extra }, m) });
const delta = (extra, nome) => { const a = tab(extra).scheda.abilita.find((x) => x.nome === nome); return a.effettivo - a.totale; };
const salvezze = (extra) => Object.values(tab(extra).scheda.salvezze).map((s) => (s.effettivo ?? s.totale) - s.totale);

test('A.116: dati (esempi della risposta predefiniti, Potere e Percezione esclusi, −8 nel buio) e niente TODO', () => {
  const RV = dati.regole.illuminazione.richiede_vista;
  assert.deepEqual(Object.keys(RV.predefinite), ['Pilotare', 'Tecnologia', 'Medicina', 'Scienza', 'Sopravvivenza', 'Atletica']);
  assert.deepEqual(RV.escluse, ['Potere', 'Percezione']);
  assert.equal(RV.buio_va, -8);
  assert.equal(dati.regole.illuminazione['TODO(Davide)'], undefined);
  const l = abilitaVista({}, dati);
  assert.ok(!l.some((x) => ['Potere', 'Percezione', 'Armi leggere', 'Difese'].includes(x.nome)));
  assert.deepEqual(l.filter((x) => x.attiva).map((x) => x.nome).sort(), Object.keys(RV.predefinite).sort());
});

test('A.116: con e senza «Richiede la vista», penombra −2 e luce molto scarsa −4', () => {
  assert.equal(delta({}, 'Tecnologia'), 0); // luce sufficiente
  assert.equal(delta({ luce: 'penombra' }, 'Tecnologia'), -2); // predefinita: sì
  assert.equal(delta({ luce: 'scarsa' }, 'Tecnologia'), -4);
  assert.equal(delta({ luce: 'penombra' }, 'Cultura'), 0); // conoscenze: no
  // il Direttore corregge: Cultura sì (leggere una mappa), Tecnologia no (ricordare un modello)
  assert.equal(delta({ luce: 'penombra', vistaAbilita: { Cultura: true } }, 'Cultura'), -2);
  assert.equal(delta({ luce: 'scarsa', vistaAbilita: { Tecnologia: false } }, 'Tecnologia'), 0);
  // una visione che copre il bersaglio elimina −2/−4 anche qui
  assert.equal(delta({ luce: 'penombra', luceVisione: true }, 'Tecnologia'), 0);
});

test('A.116: buio totale −8 come Accecato, una volta sola (Pilotare è già penalizzato da Accecato)', () => {
  assert.equal(delta({ luce: 'buio' }, 'Tecnologia'), -8);
  assert.equal(delta({ luce: 'buio' }, 'Cultura'), 0);
  const pil = delta({ luce: 'buio' }, 'Pilotare');
  assert.equal(pil, -8, 'Accecato dà −8 a Pilotare: la casella non lo raddoppia');
});

test('A.116: mai su Potere e Prove Salvezza; attacchi e Difese una volta sola anche con la casella', () => {
  assert.equal(delta({ luce: 'scarsa', vistaAbilita: { Potere: true } }, 'Potere'), 0);
  assert.ok(salvezze({ luce: 'scarsa' }).every((x) => x === 0));
  // Armi leggere ricevono già la penalità (categorie_prove.luce): una sola volta
  assert.equal(delta({ luce: 'penombra', vistaAbilita: { 'Armi leggere': true } }, 'Armi leggere'), -2);
  // Percezione: il valore visivo resta a parte, il VA generale no
  const p = tab({ luce: 'penombra' }).scheda.abilita.find((x) => x.nome === 'Percezione');
  assert.equal(p.effettivo, p.totale);
  assert.equal(p.usiSpecifici.find((u) => u.uso === 'visiva').valore, p.totale - 2);
});

test('A.116: la sessione salva solo le correzioni; validatore dei nomi', () => {
  assert.equal('vistaAbilita' in allineaSessione(inizializzaSessione(m), m), false);
  assert.deepEqual(allineaSessione({ ...inizializzaSessione(m), vistaAbilita: { Cultura: true, X: 'sì' } }, m).vistaAbilita, { Cultura: true });
  const d = copia(dati);
  d.regole.illuminazione.richiede_vista.predefinite.Cucina = 'boh';
  assert.ok(validaDati(d).some((e) => /Cucina/.test(JSON.stringify(e))));
});
