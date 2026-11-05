// Lotto 173: A.239 (Davide, 02/11/2026) — munizioni della Neverlost: «La dotazione standard comprende 600 proiettili per
// ciascun mitragliatore e sei missili. Per la Neverlost già presente in campagna, il Direttore conferma le quantità
// effettivamente rimaste. Gli aggiornamenti del profilo conservano le munizioni registrate. Se il dato manca, si segnala
// come da verificare dal Direttore.» A.240 (03/11/2026) — «Il suo profilo è quello dello specifico esemplare della
// campagna e non deve essere preso come esempio, modello standard o riferimento commerciale per altre navi. Prezzo e
// fascia commerciale della configurazione attuale restano da definire.»
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { nuovoVeicolo, normalizzaVeicoli, vistaVeicoloPersonaggio, munizioniArmaVeicolo, registraMunizioniVeicolo, profiliCreabili } from '../src/veicoli.js';

const { dati } = await datiReali();
const NL = dati.veicoli.profili.find((p) => p.id === 'neverlost');

test('A.239: lo standard è un riferimento; senza dato le munizioni sono «da verificare», mai lo standard', () => {
  assert.deepEqual(NL.armi.filter((a) => a.munizioni_iniziali).map((a) => a.munizioni_iniziali.caricate), [600, 600, 6], 'dotazione standard: 600 + 600 proiettili e 6 missili');
  const nave = nuovoVeicolo('neverlost', dati);
  const mun = vistaVeicoloPersonaggio(nave, dati).risorse.munizioni;
  assert.deepEqual(mun.filter(Boolean).map((x) => x.da_verificare), [true, true, true]);
  assert.ok(mun.filter(Boolean).every((x) => x.caricate === null), 'nessun numero inventato');
  // non si spara né si ricarica finché il Direttore non conferma
  assert.equal(munizioniArmaVeicolo(nave, 0, { sparati: 20 }, dati), null);
  // il Direttore conferma: 420 rimasti al primo mitragliatore; gli altri restano da verificare
  const conf = registraMunizioniVeicolo(nave, 0, { caricate: 420, riserva: 0 }, dati);
  const [n] = normalizzaVeicoli([conf], dati);
  assert.deepEqual(n.munizioni[0], { caricate: 420, riserva: 0 });
  assert.equal(n.munizioni[1].da_verificare, true);
  // poi si spara come sempre, e la conferma resta dopo un aggiornamento del profilo (si riapre il mezzo)
  const sparato = munizioniArmaVeicolo(n, 0, { sparati: 20 }, dati);
  assert.equal(normalizzaVeicoli([JSON.parse(JSON.stringify(sparato))], dati)[0].munizioni[0].caricate, 400);
  // oltre la capacità no; valori non validi no
  assert.equal(registraMunizioniVeicolo(nave, 3, { caricate: 9 }, dati).munizioni[3].caricate, 6);
  assert.equal(registraMunizioniVeicolo(nave, 0, { caricate: -1 }, dati), null);
});

test('A.240: la Neverlost non ha prezzo di catalogo e non diventa un modello da cui crearne altre', () => {
  assert.equal(NL.esemplare_unico, true);
  assert.equal(NL.prezzo_cr, null);
  const v = vistaVeicoloPersonaggio(nuovoVeicolo('neverlost', dati), dati);
  assert.deepEqual([v.valore.esemplareUnico, v.valore.catalogo], [true, null]);
  assert.match(v.valore.nota, /non un modello standard né un riferimento commerciale/);
  // finché la nave della campagna non c'è si può registrare; dopo, «Aggiungi veicolo» non la offre più
  assert.ok(profiliCreabili(dati, []).some((p) => p.id === 'neverlost'));
  assert.ok(!profiliCreabili(dati, [{ profilo: 'neverlost' }]).some((p) => p.id === 'neverlost'));
  // lo Scout MK4 resta un modello di listino: se ne può avere più d'uno
  assert.ok(profiliCreabili(dati, [{ profilo: 'asa-scout-mk4' }]).some((p) => p.id === 'asa-scout-mk4'));
  // e lo Scout ha il suo prezzo di catalogo, non la Neverlost
  assert.equal(vistaVeicoloPersonaggio(nuovoVeicolo('asa-scout-mk4', dati), dati).valore.catalogo, 126510);
});

test('stampa: le munizioni della Neverlost si scrivono anche senza il riquadro dell’energia (prova nel browser)', async () => {
  const { veicoliDelGruppoStampa } = await import('../src/stampa.js');
  const { nuovoRecord } = await import('../src/veicoli-registro.js');
  const nave = registraMunizioniVeicolo(nuovoVeicolo('neverlost', dati, { uid: 'veinave0001' }), 0, { caricate: 420, riserva: 0 }, dati);
  const g = veicoliDelGruppoStampa([nuovoRecord(nave, { chiave: 'x' }, { gruppo: true })], dati);
  const m = g.fogli[0].dati.veicoli[0].risorse.munizioni;
  assert.deepEqual([m[0].caricate, m[1].da_verificare, m[3].da_verificare], [420, true, true]);
  // la stampa scrive le munizioni in un riquadro loro quando il mezzo non ha quello dell'energia (src/ui/stampa.js)
  const src = (await import('node:fs')).readFileSync(new URL('../src/ui/stampa.js', import.meta.url), 'utf8');
  assert.match(src, /const munizioni = !alimentazione && righeMunizioni \? box\(\{ titolo: 'Munizioni di bordo'/);
});
