// Parte C del 20/10/2026: «Medita». Il recupero dei PM calcolato con i valori del Manuale della Magia (recupero naturale,
// Meditazione, Recupero Mistico) e il versamento in un cristallo con la conversione (rapporto dai dati e dai Talenti), con
// il conto in chiaro, l'avviso sul cristallo pieno senza buttare via il resto, e il registro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, clic, dati } from './scheda-aiuti.js';
import { modiMedita, pianoMedita, applicaMedita, provaGruppi, motivoRicarica } from '../src/medita.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { calcolaScheda } from '../src/calc.js';
import { rapportoConversione } from '../src/equipaggiamento.js';
import { validaDati } from '../src/validate.js';

const norm = (t) => String(t).replace(/[’‘]/g, "'").replace(/\\/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const magia = norm(readFileSync(new URL('../docs/manuali-txt/magia.md', import.meta.url), 'utf8'));

const ESEMPIO = 'Fratello-Anselmo-Viri_liv3_2026-10-02.json';
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'trasportato', quantita: 1, note: '', sintonizzato: true, ...extra });
const ROSSO = voce('rosso', 'artefatti:batteria-matrice-da-10-pm-chroma-rosso');
const BIANCO = voce('bianco', 'artefatti:batteria-matrice-da-10-pm-chroma-bianco');

function ctxCon(equip = [ROSSO], { pm = null, chroma = {}, talentiLiberi = [] } = {}) {
  const c = contesto(ESEMPIO, {
    attiva: 'poteri',
    scelte: (s) => { s.equipaggiamento = [...s.equipaggiamento, ...equip]; return s; },
    cambia: (s) => { if (pm !== null) s.pmAttuali = pm; s.chroma = { ...s.chroma, ...chroma }; },
  });
  if (talentiLiberi.length) c.tab.scheda.talentiLiberi = [...(c.tab.scheda.talentiLiberi ?? []), ...talentiLiberi.map((id) => ({ id }))];
  return c;
}
const piano = (c, scelta) => pianoMedita({ scheda: c.tab.scheda, sessione: c.sessione, massimi: c.massimi }, scelta, dati);

test('dati: il blocco recupero_pm c’è, validato, e i numeri sono quelli del Manuale della Magia', () => {
  assert.deepEqual(validaDati(dati), []);
  const rp = dati.regole.recupero_pm;
  assert.deepEqual(rp.fasi.map((f) => [f.id, f.pm_per_ora]), [['pesante', 0], ['leggera', 1], ['breve', 2], ['completo', 3]]);
  for (const f of rp.fasi) assert.ok(magia.includes(norm(`| ${f.nome} | ${f.pm_per_ora} per ora | ${f.esempi}`)), `tabella del recupero naturale: ${f.nome}`);
  // Recupero Mistico: il Talento è a catalogo e il suo testo dice gli stessi numeri
  const t = dati.talenti_liberi.talenti.find((x) => x.id === rp.recupero_mistico.talento);
  assert.match(t.testo, /Attività pesante 0 PM; Attività leggera 2 PM; Riposo breve 3 PM; Rip/);
  assert.deepEqual([rp.recupero_mistico.pm_per_ora, rp.recupero_mistico.escluse], [1, ['pesante']]);
  // conversione e Prova per gruppi: già nei dati (chroma.conversione), uguali al manuale
  const pg = dati.regole.chroma.conversione.prova_gruppi;
  for (const [g, p] of Object.entries(pg.penalita)) assert.ok(magia.includes(norm(`| ${g} | ${p === 0 ? 'Potere' : `Potere ${String(p).replace('-', '−')}`} |`)), `Prova per ${g} gruppi`);
  assert.ok(magia.includes('| 1 | **Automatica:** nessuna Prova |'.replace(/\*\*/g, '')) || magia.includes('Automatica: nessuna Prova'));
});

test('modalità: la Meditazione ha i valori della scheda; il recupero naturale 0/1/2/3, Recupero Mistico +1 (non in Attività pesante)', () => {
  const c = ctxCon();
  const med = c.tab.scheda.magia.meditazione;
  assert.ok(med, 'il Taumaturgo d’esempio ha la Meditazione');
  const modi = modiMedita(c.tab.scheda, dati);
  const m = modi.find((x) => x.id === 'meditazione');
  assert.deepEqual([m.pmOra, m.oreGiorno, m.disponibile], [med.pmPerOra, med.orePerGiorno, true]);
  assert.deepEqual(modi.filter((x) => x.id !== 'meditazione').map((x) => [x.id, x.pmOra]), [['pesante', 0], ['leggera', 1], ['breve', 2], ['completo', 3]]);
  const cm = ctxCon([], { talentiLiberi: ['recupero-mistico'] });
  const mm = modiMedita(cm.tab.scheda, dati);
  assert.deepEqual(mm.filter((x) => x.id !== 'meditazione').map((x) => [x.id, x.pmOra]), [['pesante', 0], ['leggera', 2], ['breve', 3], ['completo', 4]]);
  assert.equal(mm.find((x) => x.id === 'meditazione').pmOra, med.pmPerOra, 'Recupero Mistico non aumenta la Meditazione');
  // senza la capacità la Meditazione non è disponibile e lo dice
  const senza = contesto('Aiko-Tenzan_liv5_2026-10-02.json', { attiva: 'poteri' });
  const ms = modiMedita(senza.tab.scheda, dati).find((x) => x.id === 'meditazione');
  assert.equal(ms.disponibile, false);
  assert.match(ms.motivo, /Addestramento Taumaturgo, Recupero Meditativo/);
});

test('recupero: ore × PM/ora, entro i PM massimi e, per la Meditazione, le ore utili al giorno', () => {
  const c = ctxCon([], { pm: 1 });
  const med = c.tab.scheda.magia.meditazione;
  const p = piano(c, { modo: 'meditazione', ore: 2, destinazione: 'personali' });
  assert.equal(p.recupero, 2 * med.pmPerOra);
  assert.equal(p.pmDopoRecupero, Math.min(c.massimi.pm, 1 + 2 * med.pmPerOra));
  // oltre le ore utili al giorno non si recupera
  const troppe = piano(c, { modo: 'meditazione', ore: med.orePerGiorno + 3, oreGia: 0, destinazione: 'personali' });
  assert.equal(troppe.oreEffettive, med.orePerGiorno);
  assert.match(troppe.avvisi.join(' '), new RegExp(`Oltre le ${med.orePerGiorno} ore utili al giorno`));
  const gia = piano(c, { modo: 'meditazione', ore: 2, oreGia: med.orePerGiorno, destinazione: 'personali' });
  assert.equal(gia.recupero, 0);
  // Riposo completo: 6 ore = 18 PM (Magia); senza Recupero Mistico
  const notte = piano(ctxCon([], { pm: 0 }), { modo: 'completo', ore: 6, destinazione: 'personali' });
  assert.equal(notte.recupero, 18);
  assert.equal(notte.pmDopoRecupero, Math.min(18, ctxCon([], { pm: 0 }).massimi.pm));
  // con Recupero Mistico, 6 ore di Riposo completo: 24
  assert.equal(piano(ctxCon([], { pm: 0, talentiLiberi: ['recupero-mistico'] }), { modo: 'completo', ore: 6, destinazione: 'personali' }).recupero, 24);
  // PM oltre il massimo: avviso
  const pieno = piano(ctxCon([], { pm: c.massimi.pm - 1 }), { modo: 'completo', ore: 6, destinazione: 'personali' });
  assert.ok(pieno.sprecati > 0);
  assert.match(pieno.avvisi.join(' '), /oltre il massimo personale/);
  // nessuna ora: avviso, nessun recupero
  assert.equal(piano(c, { modo: 'breve', ore: 0, destinazione: 'personali' }).recupero, 0);
});

test('conversione: rapporto dai dati e dai Talenti (3:1, 2:1, 1:1, Bianco sempre 2:1), gruppi, PM spesi e PM nel cristallo', () => {
  // 15 PM personali (il massimo del Taumaturgo d'esempio), cristallo Rosso da 10 a 4 PM
  const c = ctxCon([ROSSO], { pm: 15, chroma: { rosso: { pmAttuali: 4 } } });
  const cv = rapportoConversione(c.tab.scheda, dati);
  assert.equal(cv.rapporto, dati.regole.chroma.conversione.rapporto_per_talenti[cv.talenti.length], 'rapporto dai dati');
  const p = piano(c, { modo: 'breve', ore: 0, destinazione: 'rosso' });
  const r = p.conversione;
  assert.equal(r.rapporto, cv.rapporto);
  assert.equal(r.gruppi, Math.min(Math.floor(15 / cv.rapporto), 6), 'auto: quanti ne stanno (spazio 6)');
  assert.equal(r.spesa, r.gruppi * cv.rapporto);
  assert.equal(r.entrano, r.gruppi);
  assert.deepEqual([p.finale.personali, p.finale.cristallo], [15 - r.spesa, 4 + r.gruppi]);
  assert.match(r.fonteRapporto, /rapporto ordinario 3:1|Ricarica Efficiente|Conversione Migliorata/);
  // con Conversione Migliorata: 2:1, e il conto lo dice
  const cm = ctxCon([ROSSO], { pm: 15, chroma: { rosso: { pmAttuali: 4 } }, talentiLiberi: ['conversione-migliorata'] });
  const pm2 = piano(cm, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 4 }).conversione;
  assert.equal(pm2.rapporto, 2);
  assert.match(pm2.fonteRapporto, /Conversione Migliorata: da 3:1 a 2:1/);
  assert.deepEqual([pm2.gruppi, pm2.spesa, pm2.entrano], [4, 8, 4]);
  // il Bianco resta 2:1 in ogni caso
  const cb = ctxCon([BIANCO], { pm: 15, chroma: { bianco: { pmAttuali: 0 } }, talentiLiberi: ['conversione-migliorata', 'ricarica-migliorata'] });
  assert.equal(piano(cb, { modo: 'breve', ore: 0, destinazione: 'bianco', gruppi: 3 }).conversione.rapporto, 2);
  assert.match(piano(cb, { modo: 'breve', ore: 0, destinazione: 'bianco', gruppi: 3 }).conversione.fonteRapporto, /Chroma Bianco: sempre 2:1/);
  // «Bonus dei Talenti» spento: rapporto ordinario
  const spento = ctxCon([ROSSO], { pm: 15, talentiLiberi: ['conversione-migliorata'] });
  spento.tab.scheda.bonusTalenti = false;
  assert.equal(piano(spento, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 2 }).conversione.rapporto, dati.regole.chroma.conversione.rapporto_ordinario);
});

test('il conto unico: il recupero di Medita alimenta la conversione (PM recuperati, spesi, entrati)', () => {
  const c = ctxCon([ROSSO], { pm: 2, chroma: { rosso: { pmAttuali: 0 } } });
  const p = piano(c, { modo: 'completo', ore: 6, destinazione: 'rosso' }); // 18 PM
  assert.equal(p.recupero, 18);
  const r = p.conversione;
  assert.equal(p.pmDopoRecupero, Math.min(c.massimi.pm, 20));
  // la conversione usa tutto ciò che si è recuperato (2 + 18), non solo ciò che entra nei PM personali
  assert.equal(r.gruppi, Math.min(Math.floor(20 / r.rapporto), 10));
  assert.deepEqual([p.finale.personali, p.finale.cristallo], [Math.min(c.massimi.pm, 20 - r.spesa), r.entrano]);
  // le righe del conto dicono recupero, rapporto, spesa, ingresso
  const t = p.righe.map((x) => `${x.etichetta} ${x.valore}`).join(' | ');
  assert.match(t, /Riposo completo: 6 ore × 3 PM \+18/);
  assert.match(t, /Conversione \d:1/);
  assert.match(t, /PM personali spesi −\d+/);
  assert.match(t, /Entrano in .* \+\d+/);
});

test('cristallo pieno o quasi: avvisa e si ferma a quanto ci sta, il resto resta nei PM personali', () => {
  const pieno = ctxCon([ROSSO], { pm: 15, chroma: { rosso: { pmAttuali: 10 } } });
  const p = piano(pieno, { modo: 'breve', ore: 0, destinazione: 'rosso' });
  assert.equal(p.conversione.gruppi, 0);
  assert.ok(p.avvisi.join(' ').includes('è già pieno (10 / 10): niente da versare, i PM restano nei personali'));
  assert.equal(p.finale.personali, 15, 'nessun PM buttato');
  assert.equal(p.finale.cristallo, 10);
  const quasi = ctxCon([ROSSO], { pm: 15, chroma: { rosso: { pmAttuali: 7 } } });
  const q = piano(quasi, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 8 });
  assert.equal(q.conversione.gruppi, 3);
  assert.match(q.avvisi.join(' '), /ha spazio per 3 PM: mi fermo a 3 gruppi, il resto resta nei PM personali/);
  assert.equal(q.finale.cristallo, 10);
  // PM personali insufficienti per i gruppi chiesti
  const pochi = ctxCon([ROSSO], { pm: 4, chroma: { rosso: { pmAttuali: 0 } } });
  const k = piano(pochi, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 9 });
  assert.equal(k.conversione.gruppi, Math.floor(4 / k.conversione.rapporto));
  assert.match(k.avvisi.join(' '), /si possono convertire \d+ grupp/);
});

test('Prova di Potere per i gruppi: un gruppo è automatico, poi la tabella del manuale; l’esito lo indica chi gioca', () => {
  assert.deepEqual(provaGruppi(1, dati), { richiesta: false, penalita: 0 });
  assert.deepEqual([2, 3, 4, 5, 6].map((g) => provaGruppi(g, dati).penalita), [0, -2, -4, -6, -8]);
  assert.equal(provaGruppi(7, dati).penalita, -10, 'ogni gruppo ulteriore −2');
  const c = ctxCon([ROSSO], { pm: 15, chroma: { rosso: { pmAttuali: 0 } } });
  const base = { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 3 };
  const r = (esito) => piano(c, { ...base, esito });
  const s = r('successo');
  const rapporto = s.conversione.rapporto;
  assert.deepEqual([s.conversione.prova.richiesta, s.conversione.prova.penalita], [true, -2]);
  assert.deepEqual([s.conversione.convertiti, s.conversione.spesa, s.conversione.entrano], [3, 3 * rapporto, 3]);
  const f = r('fallimento');
  assert.deepEqual([f.conversione.spesa, f.conversione.entrano, f.finale.personali], [0, 0, 15], 'Fallimento: nessuna spesa e nessun PM');
  const m = r('maldestro');
  assert.deepEqual([m.conversione.spesa, m.conversione.entrano], [3 * rapporto, 0], 'Maldestro: perdita del costo, nessun PM');
  const g = r('magistrale');
  assert.deepEqual([g.conversione.convertiti, g.conversione.entrano, g.conversione.spesa], [4, 4, 4 * rapporto], 'Magistrale: un gruppo in più se ci sono riserva e spazio');
  // un gruppo solo: nessuna Prova, esito irrilevante
  const uno = piano(c, { ...base, gruppi: 1, esito: 'fallimento' });
  assert.equal(uno.conversione.prova.richiesta, false);
  assert.equal(uno.conversione.entrano, 1);
});

test('avvisi, mai blocchi: ricarica riservata al Taumaturgo, non sintonizzato, Scheggia, PM a 0', () => {
  const cv = { disponibile: false, addestramento: 'Taumaturgo' };
  assert.match(motivoRicarica({ trasportato: true, sintonizzato: true }, cv), /riservata all’Addestramento Taumaturgo/);
  assert.match(motivoRicarica({ trasportato: true, sintonizzato: false }, { disponibile: true }), /non è sintonizzato/);
  assert.match(motivoRicarica({ trasportato: false }, { disponibile: true }), /non è con te/);
  assert.match(motivoRicarica({ scheggia: true }, { disponibile: true }), /Scheggia instabile/);
  assert.equal(motivoRicarica({ trasportato: true, sintonizzato: true }, { disponibile: true }), null);
  // PM personali che arrivano a 0: avviso sullo svenimento
  const c = ctxCon([ROSSO], { pm: 6, chroma: { rosso: { pmAttuali: 0 } } });
  const p = piano(c, { modo: 'breve', ore: 0, destinazione: 'rosso', gruppi: 2 });
  if (p.finale.personali === 0) assert.match(p.avvisi.join(' '), /Svenuto/);
  // Meditazione non disponibile: recupero 0 e avviso, ma il piano si calcola lo stesso
  const senza = contesto('Aiko-Tenzan_liv5_2026-10-02.json', { attiva: 'poteri' });
  const ps = pianoMedita({ scheda: senza.tab.scheda, sessione: senza.sessione, massimi: senza.massimi }, { modo: 'meditazione', ore: 3, destinazione: 'personali' }, dati);
  assert.equal(ps.recupero, 0);
  assert.match(ps.avvisi.join(' '), /Meditazione: serve l’Addestramento Taumaturgo/);
});

test('applicare: PM personali e cristallo cambiano insieme, il registro dice cosa è successo', () => {
  const c = ctxCon([ROSSO], { pm: 2, chroma: { rosso: { pmAttuali: 1 } } });
  const m = massimiSessione(c.tab.scheda, c.scelte, dati);
  const p = piano(c, { modo: 'completo', ore: 4, destinazione: 'rosso', gruppi: 3, esito: 'successo' });
  const dopo = applicaMedita(allineaSessione(c.sessione, m), p, m);
  assert.equal(dopo.pmAttuali, p.finale.personali);
  assert.equal(dopo.chroma.rosso.pmAttuali, p.finale.cristallo);
  assert.equal(dopo.chroma.rosso.pmAttuali, 1 + p.conversione.entrano);
  assert.match(p.registro, /^Medita \(Riposo completo, 4 ore\): \+12 PM personali \(PM 2 → \d+\); ricarica .*: 3 gruppi a \d:1, −\d+ PM personali, \+3 PM nel cristallo \(1 → 4\)/);
  // solo ai personali: il cristallo non si tocca
  const pp = piano(c, { modo: 'breve', ore: 2, destinazione: 'personali' });
  const d2 = applicaMedita(allineaSessione(c.sessione, m), pp, m);
  assert.equal(d2.chroma.rosso.pmAttuali, 1);
  assert.equal(d2.pmAttuali, pp.pmDopoRecupero);
  assert.equal(pp.registro, `Medita (Riposo breve, 2 ore): +4 PM personali (PM 2 → ${pp.pmDopoRecupero}).`);
});

test('nessun numero scritto nel codice: rapporto e Prova dai dati e dai Talenti, recupero dai dati', () => {
  const src = readFileSync(new URL('../src/medita.js', import.meta.url), 'utf8');
  assert.match(src, /rapportoConversione\(scheda, dati\)/);
  assert.doesNotMatch(src, /rapporto\s*=\s*[123]\b/);
  assert.doesNotMatch(src, /\b(pm_per_ora|pmOra)\s*=\s*[1-9]/);
});

test('la scheda: «Medita» nei riquadri dei PM; il pannello a tre passi mostra il conto e «Conferma» chiama l’azione con il piano', async () => {
  const c = ctxCon([ROSSO], { pm: 3, chroma: { rosso: { pmAttuali: 2 } } });
  const r = resa(c);
  const bottoni = r.radice.tutti().filter((n) => n.tagName === 'BUTTON' && n.textContent === 'Medita');
  assert.ok(bottoni.length >= 1, 'il pulsante c’è');
  clic(bottoni[0]);
  assert.equal(c.ui.medita.modo, 'meditazione');
  assert.equal(c.ui.medita.destinazione, 'personali');
  // pannello aperto, con il cristallo scelto e il conto
  Object.assign(c.ui.medita, { modo: 'completo', ore: 3, destinazione: 'rosso', passo: 2 });
  const r2 = resa(c);
  const pannello = r2.radice.tutti().find((n) => n.className?.includes('medita-pannello'));
  assert.ok(pannello, 'pannello Medita aperto');
  const t = pannello.textContent;
  assert.match(t, /Medita · recupero dei PM/);
  assert.match(t, /Riposo completo: 3 ore × 3 PM/);
  assert.match(t, /Conversione \d:1/);
  assert.match(t, /Entrano in Batteria Matrice/);
  assert.match(t, /Resta nel registro: «Medita \(Riposo completo, 3 ore\)/);
  const conferma = pannello.tutti().find((n) => n.tagName === 'BUTTON' && /^Conferma e applica$/.test(n.textContent));
  assert.ok(conferma);
  clic(conferma);
  const [nome, p] = c.chiamate.find(([n]) => n === 'medita');
  assert.equal(nome, 'medita');
  assert.equal(p.recupero, 9);
  assert.ok(p.conversione.entrano > 0);
  assert.equal(c.ui.medita, null, 'il pannello si chiude dopo la conferma');
});

test('PM recuperati oltre il massimo personale: non si buttano se si versano nel cristallo; senza cristallo avvisa', () => {
  const c = ctxCon([ROSSO], { pm: 15, chroma: { rosso: { pmAttuali: 0 } } });
  const med = c.tab.scheda.magia.meditazione;
  const senza = piano(c, { modo: 'meditazione', ore: 1, destinazione: 'personali' });
  assert.equal(senza.sprecati, med.pmPerOra);
  assert.match(senza.avvisi.join(' '), /Versandoli in un cristallo si usano/);
  const con = piano(c, { modo: 'meditazione', ore: 1, destinazione: 'rosso' });
  const r = con.conversione;
  assert.equal(r.gruppi, Math.min(Math.floor((15 + med.pmPerOra) / r.rapporto), 10), 'la conversione usa anche i PM oltre il massimo');
  assert.equal(con.finale.personali, Math.min(15, 15 + med.pmPerOra - r.spesa));
  assert.equal(con.sprecati, 15 + med.pmPerOra - r.spesa - con.finale.personali);
});
