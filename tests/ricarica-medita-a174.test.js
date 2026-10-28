// A.174 (Davide, 23/10/2026): «Ricarica e medita». Un comando unico che rispetta l'ordine dei due passaggi: prima la
// ricarica con i PM che il personaggio ha adesso (rapporto dei Talenti, entro la capacità, Prova di Potere come da sola),
// poi la Meditazione con il suo esito; un'interruzione non annulla la ricarica; mai PM spesi in anticipo. Riepilogo in una
// riga: «Spesi 9 PM → cristallo +3 cariche · Meditazione: recuperati 4 PM».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, clic, dati } from './scheda-aiuti.js';
import { pianoMedita, applicaMedita, modiMedita } from '../src/medita.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';

const TAUMATURGO = 'Fratello-Anselmo-Viri_liv3_2026-10-02.json';
const voce = (uid, rif) => ({ uid, rif, stato: 'trasportato', quantita: 1, note: '', sintonizzato: true });
const ROSSO = voce('rosso', 'artefatti:batteria-matrice-da-10-pm-chroma-rosso');
const BIANCO = voce('bianco', 'artefatti:batteria-matrice-da-10-pm-chroma-bianco');

function ctxCon(equip = [ROSSO], { pm = 10, chroma = { rosso: { pmAttuali: 0 } }, talenti = [] } = {}) {
  const c = contesto(TAUMATURGO, {
    attiva: 'poteri',
    scelte: (s) => { s.equipaggiamento = [...s.equipaggiamento, ...equip]; return s; },
    cambia: (s) => { s.pmAttuali = pm; s.chroma = { ...s.chroma, ...chroma }; },
  });
  if (talenti.length) c.tab.scheda.talentiLiberi = [...(c.tab.scheda.talentiLiberi ?? []), ...talenti.map((x) => (typeof x === 'string' ? { id: x } : x))];
  return c;
}
const piano = (c, scelta) => pianoMedita({ scheda: c.tab.scheda, sessione: c.sessione, massimi: c.massimi }, { modo: 'meditazione', ore: 1, destinazione: 'rosso', esito: 'successo', ...scelta }, dati);

test('Taumaturgo con 10 PM e un cristallo vuoto: prima 3 gruppi (9 PM), poi la Meditazione dal PM rimasto', () => {
  const c = ctxCon();
  assert.equal(c.massimi.pm >= 10, true);
  const med = c.tab.scheda.magia.meditazione;
  const p = piano(c, {});
  assert.equal(p.nome, 'Ricarica e medita');
  const r = p.conversione;
  assert.deepEqual([r.rapporto, r.gruppi, r.spesa, r.entrano], [3, 3, 9, 3]);
  assert.equal(p.pmDopoRicarica, 1, 'la ricarica viene prima: 10 − 9');
  assert.equal(p.recupero, med.pmPerOra);
  assert.equal(p.finale.personali, Math.min(c.massimi.pm, 1 + med.pmPerOra));
  assert.equal(p.finale.cristallo, 3);
  const recuperati = p.finale.personali - 1;
  assert.equal(p.riepilogo, `Spesi 9 PM → ${r.nome} +3 cariche · Meditazione: recuperati ${recuperati} PM`);
  // applicato: PM e cristallo in una modifica sola
  const m = massimiSessione(c.tab.scheda, c.scelte, dati);
  const dopo = applicaMedita(allineaSessione(c.sessione, m), p, m);
  assert.deepEqual([dopo.pmAttuali, dopo.chroma.rosso.pmAttuali], [p.finale.personali, 3]);
});

test('la Meditazione si interrompe o fallisce: la ricarica già fatta resta, si recuperano solo le ore complete', () => {
  const c = ctxCon();
  const med = c.tab.scheda.magia.meditazione;
  const zero = piano(c, { ore: 2, meditazione: 'interrotta', oreCompletate: 0 });
  assert.deepEqual([zero.conversione.entrano, zero.conversione.spesa], [3, 9], 'la ricarica resta');
  assert.equal(zero.recupero, 0);
  assert.deepEqual([zero.finale.personali, zero.finale.cristallo], [1, 3]);
  assert.match(zero.avvisi.join(' '), /interrotta: contano 0 ore complete su .*la ricarica già fatta resta \(A\.174\)/);
  assert.match(zero.riepilogo, /· Meditazione: recuperati 0 PM$/);
  // interrotta dopo un'ora su due: conta un'ora
  const una = piano(c, { ore: 2, oreGia: 0, meditazione: 'interrotta', oreCompletate: 1 });
  assert.equal(una.recupero, med.pmPerOra);
  // le ore completate non possono superare quelle utili
  const troppe = piano(c, { ore: 1, meditazione: 'interrotta', oreCompletate: 5 });
  assert.equal(troppe.oreCompletate, 1);
});

test('chiedere più PM di quanti se ne hanno non si può: ci si ferma ai PM di adesso, con l’avviso', () => {
  const c = ctxCon(undefined, { pm: 10 });
  const p = piano(c, { gruppi: 5, ore: 3 });
  assert.equal(p.conversione.gruppiRichiesti, 5);
  assert.equal(p.conversione.gruppi, 3, '10 PM a 3:1 = 3 gruppi');
  assert.match(p.avvisi.join(' '), /Non si può: 5 gruppi costano 15 PM e ne hai 10 adesso\. I PM che recupererai meditando non si spendono in anticipo \(A\.174\)/);
  // con 2 PM: nessun gruppo, anche se la Meditazione ne recupererebbe molti
  const poco = ctxCon(undefined, { pm: 2 });
  const q = piano(poco, { ore: 4 });
  assert.deepEqual([q.conversione.gruppi, q.conversione.spesa, q.conversione.entrano], [0, 0, 0]);
  assert.ok(q.recupero > 0);
  // entro la capacità del cristallo
  const quasi = ctxCon(undefined, { pm: 30, chroma: { rosso: { pmAttuali: 8 } } });
  assert.equal(piano(quasi, {}).conversione.gruppi, 2);
});

test('rapporti di conversione: 3 per 1, 2 con Ricarica Efficiente o Conversione Migliorata, 1 con entrambi, Bianco sempre 2', () => {
  const caso = (equip, talenti, atteso) => {
    const c = ctxCon(equip, { pm: 12, chroma: { [equip[0].uid]: { pmAttuali: 0 } }, talenti });
    const r = piano(c, { destinazione: equip[0].uid, gruppi: null }).conversione;
    assert.equal(r.rapporto, atteso, `${equip[0].uid} con ${talenti.map((x) => x.nome ?? x).join(' + ') || 'nessun Talento'}`);
    assert.equal(r.gruppi, Math.min(Math.floor(12 / atteso), 10), 'tanti gruppi quanti ne pagano i PM di adesso');
    assert.equal(r.spesa, r.gruppi * atteso);
  };
  caso([ROSSO], [], 3);
  caso([ROSSO], ['conversione-migliorata'], 2);
  caso([ROSSO], [{ id: 'ricarica-efficiente', nome: 'Ricarica Efficiente' }], 2);
  caso([ROSSO], ['conversione-migliorata', { id: 'ricarica-efficiente', nome: 'Ricarica Efficiente' }], 1);
  caso([BIANCO], [], 2);
  caso([BIANCO], ['conversione-migliorata', { id: 'ricarica-efficiente', nome: 'Ricarica Efficiente' }], 2);
});

test('0.49 (A.178): la Meditazione è quella ordinaria della scheda, non la Meditazione Profonda; limite di ore al giorno', () => {
  const c = ctxCon();
  const modi = modiMedita(c.tab.scheda, dati);
  assert.ok(!modi.some((m) => /profonda/i.test(m.id) || /Profonda/.test(m.nome)), 'la Meditazione Profonda è una Tecnica a parte');
  const med = c.tab.scheda.magia.meditazione;
  assert.equal(modi.find((m) => m.id === 'meditazione').pmOra, med.pmPerOra);
  const oltre = piano(c, { ore: med.orePerGiorno + 2 });
  assert.equal(oltre.oreEffettive, med.orePerGiorno);
  assert.match(oltre.avvisi.join(' '), /ore utili al giorno/);
});

test('il pannello: «Ricarica e medita» con un cristallo, «Medita» senza; prima la ricarica, poi la Meditazione; la riga del riepilogo', () => {
  const c = ctxCon();
  c.ui.medita = { modo: 'meditazione', ore: 1, oreGia: 0, destinazione: 'rosso', gruppi: null, esito: 'successo', meditazione: 'completata', oreCompletate: 0, passo: 0 };
  let pannello = resa(c).radice.tutti().find((n) => n.className?.includes('medita-pannello'));
  const t = pannello.textContent;
  assert.match(t, /Ricarica e medita · prima la ricarica, poi il recupero/);
  assert.ok(t.indexOf('Ricarica') < t.indexOf('Meditazione'), 'il primo passo è la ricarica');
  c.ui.medita.passo = 2;
  pannello = resa(c).radice.tutti().find((n) => n.className?.includes('medita-pannello'));
  assert.match(pannello.textContent, /Spesi 9 PM → .* \+3 cariche · Meditazione: recuperati \d+ PM/);
  const conferma = pannello.tutti().find((n) => n.tagName === 'BUTTON' && n.textContent === 'Conferma: Ricarica e medita');
  assert.ok(conferma);
  clic(conferma);
  assert.ok(c.chiamate.some(([n, p]) => n === 'medita' && p.conversione.entrano === 3));
  // senza cristallo: «Medita» com'era
  c.ui.medita = { modo: 'meditazione', ore: 1, oreGia: 0, destinazione: 'personali', gruppi: null, esito: 'successo', meditazione: 'completata', passo: 2 };
  pannello = resa(c).radice.tutti().find((n) => n.className?.includes('medita-pannello'));
  assert.match(pannello.textContent, /Medita · recupero dei PM/);
  assert.ok(pannello.tutti().some((n) => n.tagName === 'BUTTON' && n.textContent === 'Conferma: Medita'));
});
