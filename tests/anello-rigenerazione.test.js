// Lotto 173: l'Anello con Rigenerazione 9 (configurazione approvata da Davide il 02/11/2026; Magia 1.11 §25.4). «Riserva
// Verde dedicata da 5 Cariche Mistiche e consuma 5 CM per ogni Rigenerazione 9, consentendo un utilizzo a riserva piena.
// La ricarica completa costa 30 PM personali con conversione 3:1, 20 PM con 2:1 oppure 10 PM con 1:1. Restano Grado III,
// SnT 3 e proprietà Esclusiva. Il consumo avviene al completamento delle tre ore di attivazione continua: un’interruzione
// precedente impedisce l’effetto senza consumare cariche. Seguono i cinque giorni previsti per la rigenerazione. […] non
// assegna automaticamente un anello ai personaggi.»
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { avviaAttivazione, completaAttivazione, interrompiAttivazione, inCorso, attivazioneLunga } from '../src/attivazioni-lunghe.js';
import { pmPerGruppo } from '../src/cariche-mistiche.js';
import { contenitoriLancio } from '../src/lancio.js';

const { dati } = await datiReali();
const RIF = 'artefatti:anello-di-rigenerazione-9';
const VOCE = dati.equipaggiamento.file.artefatti.oggetti.find((o) => o.id === 'anello-di-rigenerazione-9');
const AL = attivazioneLunga(VOCE);

function conAnello() {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [{ uid: 'an', rif: RIF, stato: 'indossata', quantita: 1, note: '', sintonizzato: true }] };
  const scheda = calcolaScheda({ creazione, livelli: [] }, dati);
  const m = massimiSessione(scheda, creazione, dati);
  return { m, scheda, s: allineaSessione({}, m) };
}

test('la configurazione: Grado III, SnT 3, Esclusiva, riserva Verde da 5 CM, 5 CM per uso, 3 ore e poi 5 giorni', () => {
  const a = VOCE.artefatto;
  assert.deepEqual([a.grado, a.sintonizzazione, a.contenitore.energia, a.contenitore.capacita_cm, a.contenitore.alimentazione, a.contenitore.riserva], ['III', 3, 'Verde', 5, 'esclusiva', 'cariche']);
  assert.deepEqual([AL.cm, AL.ore, AL.giorni_dopo, AL.continua], [5, 3, 5, true]);
  assert.equal(VOCE.costo, undefined, 'il prezzo non è indicato: non si inventa');
});

test('a riserva piena un uso; le 5 CM si consumano solo a tre ore compiute; interrotta non consuma niente', () => {
  const { m, s } = conAnello();
  assert.deepEqual([s.chroma.an.pmAttuali, s.chroma.an.unita], [5, 'CM']);
  // avvio: niente si consuma ancora
  let r = avviaAttivazione(s, 'an', AL, m);
  assert.ok(inCorso(r.sessione, 'an'));
  assert.equal(r.sessione.chroma.an.pmAttuali, 5);
  // interrotta prima delle 3 ore: nessuna CM, nessun effetto
  r = interrompiAttivazione(r.sessione, 'an', AL, m);
  assert.equal(r.sessione.chroma.an.pmAttuali, 5);
  assert.ok(!inCorso(r.sessione, 'an'));
  assert.match(r.riga, /nessuna CM consumata e nessun effetto/);
  // di nuovo, e questa volta le 3 ore si compiono: −5 CM, si avvia la rigenerazione con i 5 giorni
  r = avviaAttivazione(r.sessione, 'an', AL, m);
  r = completaAttivazione(r.sessione, 'an', AL, m);
  assert.equal(r.sessione.chroma.an.pmAttuali, 0);
  assert.match(r.riga, /3 ore compiute, −5 CM/);
  assert.match(r.riga, /altri 5 giorni/);
  // a riserva vuota (o non piena) non si avvia: il residuo non paga un uso (A.228)
  assert.match(avviaAttivazione(r.sessione, 'an', AL, m).errore, /ne servono 5/);
  const quasi = allineaSessione({ chroma: { an: { pmAttuali: 4.2, unita: 'CM' } } }, m);
  assert.match(avviaAttivazione(quasi, 'an', AL, m).errore, /ne servono 5/);
  // senza un avvio non si «completa» niente
  assert.match(completaAttivazione(s, 'an', AL, m).errore, /nessuna attivazione in corso/);
});

test('ricarica: CM mancanti × 2 × conversione (30 PM a 3:1, 20 a 2:1, 10 a 1:1); le CM non pagano Incantesimi', () => {
  const { scheda, s } = conAnello();
  const c = scheda.equipaggiamento.contenitori.find((x) => x.uid === 'an');
  assert.deepEqual([3, 2, 1].map((rapporto) => 5 * pmPerGruppo(c, rapporto, dati)), [30, 20, 10]);
  const inc = dati.incantesimi.incantesimi.find((i) => /Rigenerazione/.test(i.nome));
  assert.ok(!contenitoriLancio({ scheda, sessione: s }, inc).some((x) => x.uid === 'an'), 'le CM non sono fonti di «Lancia!»');
});

test('la configurazione non assegna un anello a nessuno: nessun personaggio d’esempio lo ha', () => {
  const dir = new URL('../esempi/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) assert.ok(!readFileSync(new URL(f, dir), 'utf8').includes('anello-di-rigenerazione-9'), f);
});
