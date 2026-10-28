// B del 20/10/2026 (chiarimento di Marcello sull'A.174): la scorciatoia di «Medita» unisce due azioni lecite — spendere i
// propri PM per ricaricare il cristallo e recuperarli meditando — e deve far pagare TUTTO ciò che pagherebbero i due passaggi
// separati. Un test per ciascun costo della ricarica (Magia sez. 6), applicato anche dalla strada breve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, clic, dati } from './scheda-aiuti.js';
import { pianoMedita, provaGruppi } from '../src/medita.js';

const ROSSO = { uid: 'rosso', rif: 'artefatti:batteria-matrice-da-10-pm-chroma-rosso', stato: 'trasportato', quantita: 1, note: '', sintonizzato: true };
const BIANCO = { uid: 'bianco', rif: 'artefatti:batteria-matrice-da-10-pm-chroma-bianco', stato: 'trasportato', quantita: 1, note: '', sintonizzato: true };
const TAUMATURGO = 'Fratello-Anselmo-Viri_liv3_2026-10-02.json';
const SENZA = 'Torvald-Krane_liv6_2026-10-02.json'; // Combattente: nessun Addestramento Taumaturgo

function ctxCon(file, equip, { pm = null, chroma = {}, talentiLiberi = [] } = {}) {
  const c = contesto(file, {
    attiva: 'poteri',
    scelte: (s) => { s.equipaggiamento = [...s.equipaggiamento, ...equip]; return s; },
    cambia: (s) => { if (pm !== null) s.pmAttuali = pm; s.chroma = { ...s.chroma, ...chroma }; },
  });
  if (talentiLiberi.length) c.tab.scheda.talentiLiberi = [...(c.tab.scheda.talentiLiberi ?? []), ...talentiLiberi.map((x) => (typeof x === 'string' ? { id: x } : x))];
  return c;
}
const piano = (c, scelta) => pianoMedita({ scheda: c.tab.scheda, sessione: c.sessione, massimi: c.massimi }, scelta, dati);

// ---------------------------------------------------------------------------
test('1. rapporto di conversione vero: 3, 2 con un Talento, 1 con entrambi, Bianco sempre 2 — la strada breve spende rapporto × gruppi', () => {
  const caso = (equip, talenti, gruppi, atteso) => {
    const c = ctxCon(TAUMATURGO, equip, { pm: 15, chroma: { [equip[0].uid]: { pmAttuali: 0 } }, talentiLiberi: talenti });
    const p = piano(c, { modo: 'breve', ore: 0, destinazione: equip[0].uid, gruppi, esito: 'successo' }).conversione;
    assert.equal(p.rapporto, atteso, `${equip[0].uid} con ${talenti.map((x) => x.nome ?? x).join(' + ') || 'nessun Talento'}`);
    assert.equal(p.spesa, gruppi * atteso, 'PM personali spesi = gruppi × rapporto');
    assert.equal(p.entrano, gruppi, 'ogni gruppo aggiunge 1 PM al cristallo');
  };
  caso([ROSSO], [], 3, 3);
  caso([ROSSO], ['conversione-migliorata'], 3, 2);
  caso([ROSSO], ['ricarica-migliorata'], 3, 3); // «Ricarica Migliorata» non è «Ricarica Efficiente»: non cambia il rapporto
  caso([ROSSO], ['conversione-migliorata', { id: 'ricarica-efficiente', nome: 'Ricarica Efficiente' }], 3, 1); // il Talento fisso del Tecnomante, per nome
  caso([BIANCO], [], 3, 2);
  caso([BIANCO], ['conversione-migliorata'], 3, 2);
});

// ---------------------------------------------------------------------------
test('2. Addestramento Taumaturgo: senza, la ricarica non si fa nemmeno meditando (avviso e «Procedi comunque»)', () => {
  const senza = ctxCon(SENZA, [ROSSO], { pm: 10, chroma: { rosso: { pmAttuali: 0 } } });
  const p = piano(senza, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 1 });
  assert.match(p.conversione.motivo, /la ricarica è riservata all’Addestramento Taumaturgo/);
  assert.match(p.avvisi.join(' '), /Si può procedere comunque: l’ultima parola è del Direttore/);
  // nel pannello la conferma non è immediata: «Conferma comunque…» passa dalla finestra di «Procedi comunque»
  senza.ui.medita = { modo: 'breve', ore: 0, oreGia: 0, destinazione: 'rosso', gruppi: 1, esito: 'successo', passo: 2 };
  const pannello = resa(senza).radice.tutti().find((n) => n.className?.includes('medita-pannello'));
  const conferma = pannello.tutti().find((n) => n.tagName === 'BUTTON' && /^Conferma/.test(n.textContent));
  assert.equal(conferma.textContent, 'Conferma comunque…');
  assert.match(conferma.className, /con-avviso/);
  clic(conferma);
  assert.ok(!senza.chiamate.some(([n]) => n === 'medita'), 'nessuna ricarica finché il Direttore non conferma l’avviso');
  // con l'Addestramento: nessun avviso, conferma diretta
  const si = ctxCon(TAUMATURGO, [ROSSO], { pm: 10, chroma: { rosso: { pmAttuali: 0 } } });
  assert.equal(piano(si, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 1 }).conversione.motivo, null);
  si.ui.medita = { modo: 'breve', ore: 0, oreGia: 0, destinazione: 'rosso', gruppi: 1, esito: 'successo', passo: 2 };
  const pann2 = resa(si).radice.tutti().find((n) => n.className?.includes('medita-pannello'));
  const conf2 = pann2.tutti().find((n) => n.tagName === 'BUTTON' && /^Conferma/.test(n.textContent));
  assert.equal(conf2.textContent, 'Conferma: Ricarica e medita');
  clic(conf2);
  assert.ok(si.chiamate.some(([n]) => n === 'medita'));
});

// ---------------------------------------------------------------------------
test('3. AzP e contatto con un contenitore sintonizzato: la riga «Azione 1 AzP» è nel conto; non trasportato o non sintonizzato avvisa', () => {
  const c = ctxCon(TAUMATURGO, [ROSSO], { pm: 10, chroma: { rosso: { pmAttuali: 0 } } });
  const p = piano(c, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 2, esito: 'successo' });
  const azione = p.righe.find((r) => r.etichetta === 'Azione');
  assert.equal(azione.valore, '1 AzP');
  assert.match(azione.nota, /contatto con il cristallo sintonizzato/);
  assert.match(p.avvisi.join(' '), /Ricaricare richiede 1 AzP e il contatto con il contenitore/);
  // senza gruppi (niente da ricaricare) l'Azione non si paga
  assert.ok(!piano(c, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 0 }).righe.some((r) => r.etichetta === 'Azione'));
  // non sintonizzato
  const ns = ctxCon(TAUMATURGO, [{ ...ROSSO, sintonizzato: false }], { pm: 10, chroma: { rosso: { pmAttuali: 0 } } });
  assert.match(piano(ns, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 2, esito: 'successo' }).conversione.motivo, /non è sintonizzato/);
  // non con sé (nello zaino)
  const nz = ctxCon(TAUMATURGO, [{ ...ROSSO, stato: 'zaino' }], { pm: 10, chroma: { rosso: { pmAttuali: 0 } } });
  const mz = piano(nz, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 2, esito: 'successo' }).conversione.motivo;
  assert.ok(mz === null || /non è con te/.test(mz), 'se è nello zaino conta come trasportato dalla scheda: nessun falso avviso');
});

// ---------------------------------------------------------------------------
test('4. limite di ore giornaliere della Meditazione: oltre non si recupera, e non si può versare nel cristallo ciò che non si è recuperato', () => {
  const c = ctxCon(TAUMATURGO, [ROSSO], { pm: 0, chroma: { rosso: { pmAttuali: 0 } } });
  const med = c.tab.scheda.magia.meditazione;
  const molte = piano(c, { modo: 'meditazione', ore: med.orePerGiorno + 5, oreGia: 0, destinazione: 'rosso', esito: 'successo' });
  assert.equal(molte.oreEffettive, med.orePerGiorno);
  assert.equal(molte.recupero, med.orePerGiorno * med.pmPerOra, 'solo le ore utili danno PM');
  // A.174: con 0 PM adesso non si ricarica niente, anche se la Meditazione ne recupererà
  const r = molte.conversione;
  assert.deepEqual([r.gruppi, r.spesa, r.entrano], [0, 0, 0], 'nessun PM speso in anticipo');
  // già fatte oggi: il limite si abbassa
  const gia = piano(c, { modo: 'meditazione', ore: 4, oreGia: med.orePerGiorno - 1, destinazione: 'rosso', esito: 'successo' });
  assert.equal(gia.oreEffettive, 1);
  assert.equal(gia.recupero, med.pmPerOra);
  assert.match(gia.avvisi.join(' '), /ore utili al giorno/);
  const fatte = piano(c, { modo: 'meditazione', ore: 2, oreGia: med.orePerGiorno, destinazione: 'rosso', esito: 'successo' });
  assert.equal(fatte.recupero, 0);
  assert.equal(fatte.conversione.entrano, 0);
});

// ---------------------------------------------------------------------------
test('5. Prova di Potere dal secondo gruppo in su: nessun esito di comodo, la conversione non si applica finché non lo si indica', () => {
  const c = ctxCon(TAUMATURGO, [ROSSO], { pm: 15, chroma: { rosso: { pmAttuali: 0 } } });
  // un gruppo: automatico, nessuna Prova
  const uno = piano(c, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 1 });
  assert.deepEqual([uno.conversione.prova.richiesta, uno.conversione.inAttesa, uno.conversione.entrano], [false, false, 1]);
  // due o più: senza esito la conversione è in attesa e non sposta niente
  for (const g of [2, 3, 5]) {
    const p = piano(c, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: g, esito: undefined });
    assert.equal(p.conversione.prova.richiesta, true, `${g} gruppi: Prova richiesta`);
    assert.equal(p.conversione.inAttesa, true);
    assert.deepEqual([p.conversione.spesa, p.conversione.entrano, p.finale.personali, p.finale.cristallo], [0, 0, 15, 0], 'nulla si sposta');
    assert.equal(p.conversione.prova.penalita, provaGruppi(g, dati).penalita);
    assert.match(p.avvisi.join(' '), /Prova di Potere da fare: una sola per l’intera ricarica/);
  }
  // il conto mostra il VA di Potere con la penalità
  const p3 = piano(c, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 3 });
  const riga = p3.righe.find((r) => r.etichetta === 'Prova di Potere');
  assert.match(riga.valore, /^VA \d+ −?\d+ = −?\d+$|^VA \d+ -\d+ = -?\d+$/);
  assert.equal(riga.nota, 'esito da indicare');
  // con l'esito indicato si applica (Successo, Fallimento, Magistrale, Maldestro come da manuale)
  assert.equal(piano(c, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 3, esito: 'successo' }).conversione.entrano, 3);
  assert.equal(piano(c, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 3, esito: 'fallimento' }).conversione.entrano, 0);
  // nel pannello «Conferma» è spento finché l'esito manca
  c.ui.medita = { modo: 'breve', ore: 0, oreGia: 0, destinazione: 'rosso', gruppi: 3, esito: null, passo: 2 };
  let pann = resa(c).radice.tutti().find((n) => n.className?.includes('medita-pannello'));
  let conferma = pann.tutti().find((n) => n.tagName === 'BUTTON' && /^Conferma/.test(n.textContent));
  assert.equal(conferma.disabled, true);
  assert.match(conferma.getAttribute('title'), /Indica prima l’esito della Prova di Potere/);
  c.ui.medita.esito = 'successo';
  pann = resa(c).radice.tutti().find((n) => n.className?.includes('medita-pannello'));
  conferma = pann.tutti().find((n) => n.tagName === 'BUTTON' && /^Conferma/.test(n.textContent));
  assert.ok(!conferma.disabled);
  // cambiando destinazione l'esito si azzera: non si porta dietro un esito vecchio
  const sorgente = readSorgente();
  assert.match(sorgente, /imposta\(\{ destinazione: x, gruppi: null, esito: null \}\)/);
});

import { readFileSync } from 'node:fs';
const readSorgente = () => readFileSync(new URL('../src/ui/medita.js', import.meta.url), 'utf8');
