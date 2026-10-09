// A.114 (E&L del 05/10/2026, decisione 124): il chip del Processore si somma al modificatore degli strumenti
// (§1.4.1) e non si somma ai benefici tecnologici equivalenti (Equipaggiamento §7.1): src/condizioni.js →
// effettiOggettiAbilita, regole.json → impianti.chip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { preparaTab } from '../src/stampa.js';
import { massimiSessione, inizializzaSessione, allineaSessione } from '../src/sessione.js';
import { impiantiAttivabili, attivaChip } from '../src/impianti.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato = 'installato') => ({ uid, rif, stato, quantita: 1, note: '' });
const imp = (uid, id, stato) => voce(uid, `impianti:${id}`, stato);
// Mishima Agente con Processore e un chip inserito, più altri oggetti; il chip si attiva con «Attiva»
const conChip = (chip, altri = [], accesi = []) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [imp('proc', 'processore-neurale-di-abilita'), imp('c', chip, 'in_uso'), ...altri] };
  const s = calcolaScheda({ creazione, livelli: [] }, dati);
  const m = massimiSessione(s, creazione, dati);
  let ses = allineaSessione({ ...inizializzaSessione(m), condizioniOggetti: accesi }, m);
  const proc = impiantiAttivabili(creazione.equipaggiamento, dati).find((x) => x.tipo === 'chip');
  ses = allineaSessione(attivaChip(ses, proc, 'c', dati), m);
  const tab = preparaTab({ creazione, livelli: [] }, dati, { sessione: ses });
  return (nome) => tab.tab.find((t) => t.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === nome);
};

test('A.114: dati della decisione (il chip si somma agli strumenti; equivalenti: impianti, elmetti, esoscheletri)', () => {
  const C = dati.regole.impianti.chip;
  assert.equal(C.strumenti, 'si_somma');
  assert.deepEqual(C.equivalenti, { tipi: ['impianto', 'elmetto'], famiglie: ['Esoscheletri'] });
  assert.match(C.decisione, /^A\.114/);
  assert.deepEqual([C.attivi_massimo, C.durata_minuti, C.intervallo_ore], [1, 30, 24]);
});

test('A.114, esempio della risposta: Medicina + chip +2 + Kit trauma +2 → +4 (Medicina 10 → VA 14)', () => {
  const ab = conChip('chip-assistenza-medicina', [voce('kit', 'corredi_dispositivi:kit-trauma-capitol', 'in_uso')]);
  const med = ab('Medicina');
  assert.equal(med.effettivo, med.totale + 2); // il chip nel VA
  assert.ok(med.provenienza.righe.some((r) => /Chip Assistenza: Medicina \(chip attivo\)/.test(r.fonte) && r.valore === 2));
  // il kit (uso specifico «pronto soccorso») si somma al chip: un solo modificatore degli strumenti, il chip a parte
  const u = med.usiSpecifici.find((x) => x.uso === 'pronto soccorso');
  assert.equal(u.valore, med.totale + 4);
  // con Medicina 10 il risultato è 14, come nell'esempio
  assert.equal(10 + (u.valore - med.totale), 14);
});

test('A.114: un chip non pertinente non cambia l’Abilità', () => {
  const ab = conChip('chip-assistenza-atletica', [voce('kit', 'corredi_dispositivi:kit-trauma-capitol', 'in_uso')]);
  const med = ab('Medicina');
  assert.equal(med.effettivo, med.totale);
  assert.equal(med.usiSpecifici.find((x) => x.uso === 'pronto soccorso').valore, med.totale + 2);
  assert.equal(ab('Atletica').effettivo, ab('Atletica').totale + 2);
});

test('A.114: un beneficio tecnologico equivalente (impianto) non si somma al chip: vale il maggiore', () => {
  // Potenziamento visivo CYBERTRONIC +2 a Percezione (casella «con la vista») e chip Assistenza Percezione +2: +2, non +4
  const pari = conChip('chip-assistenza-percezione', [imp('pv', 'potenziamento-visivo-cybertronic')], ['pv'])('Percezione');
  assert.equal(pari.effettivo, pari.totale + 2);
  assert.ok(pari.provenienza.righe.some((r) => r.escluso && /Equipaggiamento §7\.1, A\.114/.test(r.nota ?? '')));
  // con il chip Competenza avanzata (+4) vale il chip
  const piu = conChip('chip-competenza-avanzata-percezione', [imp('pv', 'potenziamento-visivo-cybertronic')], ['pv'])('Percezione');
  assert.equal(piu.effettivo, piu.totale + 4);
});
