// Talenti di lancio in «Lancia!» (docs/censimento-talenti.md): i valori entrano nel risultato di
// calcolaLancio, con la provenienza e le note del manuale; l'interruttore «Bonus dei Talenti» li spegne.
// Caso segnalato: Lucas (Invocatore, SAG 9) con Colpo Elementale livello 1 → 1d6+2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { calcolaLancio, dichiarazioneLancio, aggiungiDado, massimoFormula } from '../src/lancio.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const inc = (n) => dati.incantesimi.incantesimi.find((i) => i.nome === n);
const carica = (f, sessione = {}) => {
  const p = deserializzaPersonaggio(readFileSync(new URL(`collaudo/${f}`, import.meta.url), 'utf8'));
  const creazione = normalizza(p.creazione, dati).scelte;
  const riposo = calcolaScheda({ creazione, livelli: p.livelli }, dati);
  return calcolaScheda({ creazione, livelli: p.livelli, sessione: { ...inizializzaSessione(massimiSessione(riposo, creazione, dati)), ...sessione } }, dati);
};
const lucas = carica('Lucas_liv6_2026-09-28 (2).json');
const lancia = (scheda, nome, d) => calcolaLancio({ scheda, sessione: {} }, inc(nome), dichiarazioneLancio(d), dati);
// scheda con un Talento di Classe in più (per provare i Talenti che i personaggi di collaudo non hanno)
const conTalento = (scheda, classe, nome, grado = 1) => {
  const def = dati.classi.classi.find((c) => c.nome === classe);
  const t = [...def.talenti_fissi, ...def.talenti_a_scelta].find((x) => x.nome === nome);
  const altre = scheda.classi.filter((c) => c.nome !== classe);
  const questa = scheda.classi.find((c) => c.nome === classe) ?? { nome: classe, grado, talenti: [] };
  return { ...scheda, classi: [...altre, { ...questa, talenti: [...questa.talenti, { ...t }] }] };
};

test('Lucas: Colpo Elementale livello 1 → 1d6+2 con «1d6 +1 SAG +1 Incantesimi Aggressivi (Grado …)» e la nota del manuale', () => {
  assert.equal(lucas.classi.find((c) => c.nome === 'Invocatore').grado, 2);
  const r = lancia(lucas, 'Colpo Elementale', { versione: 1 });
  const [v] = r.danno.voci;
  assert.equal(v.testo, '1d6+2');
  assert.equal(v.provenienza, '1d6 +1 SAG +1 Incantesimi Aggressivi (Grado II)');
  assert.ok(r.danno.note.some((n) => /^Incantesimi Aggressivi: Il bonus si applica una sola volta per bersaglio, al primo colpo/.test(n)));
  // il valore dipende dal Grado di Invocatore (I–II +1, III–IV +2, V–VI +3), non dal livello dell'Incantesimo
  assert.equal(lancia(lucas, 'Colpo Elementale', { versione: 3 }).danno.voci[0].testo, '1d6+4'); // 1d6+2 +1 SAG +1
  const grado3 = { ...lucas, classi: lucas.classi.map((c) => (c.nome === 'Invocatore' ? { ...c, grado: 3 } : c)) };
  assert.equal(lancia(grado3, 'Colpo Elementale', { versione: 1 }).danno.voci[0].provenienza, '1d6 +1 SAG +2 Incantesimi Aggressivi (Grado III)');
  const grado5 = { ...lucas, classi: lucas.classi.map((c) => (c.nome === 'Invocatore' ? { ...c, grado: 5 } : c)) };
  assert.equal(lancia(grado5, 'Colpo Elementale', { versione: 1 }).danno.voci[0].testo, '1d6+4');
});

test('Incantesimi Aggressivi: spento con «Bonus dei Talenti», assente per un Taumaturgo senza il Talento, solo sugli offensivi', () => {
  const spento = carica('Lucas_liv6_2026-09-28 (2).json', { bonusTalenti: false });
  assert.equal(lancia(spento, 'Colpo Elementale', { versione: 1 }).danno.voci[0].testo, '1d6+1');
  // collaudo b: Arcanista e Mistico, senza Incantesimi Aggressivi
  const b = carica('b_fratellanza_arcanista_l12.json');
  const rb = lancia(b, 'Colpo Elementale', { versione: 1 });
  assert.equal(rb.danno.talenti.length, 0);
  assert.ok(!/Incantesimi Aggressivi/.test(rb.danno.voci[0].provenienza));
  // un incantesimo senza colonna Danno non è offensivo: niente danno, niente bonus
  assert.equal(lancia(lucas, 'Cura Ferite', { versione: 3 }).danno, null);
});

test('Sovraccarico Controllato (interruttore del pannello): un dado in più; Controllo Arcano: +1 sugli offensivi ad Area', () => {
  const s = conTalento(lucas, 'Invocatore', 'Sovraccarico Controllato');
  const r0 = lancia(s, 'Colpo Elementale', { versione: 1 });
  const t = r0.talenti_lancio.find((x) => x.nome === 'Sovraccarico Controllato');
  assert.ok(t && !t.acceso);
  const r1 = lancia(s, 'Colpo Elementale', { versione: 1, talentiLancio: [t.chiave] });
  assert.equal(r1.danno.voci[0].testo, '2d6+2');
  assert.match(r1.danno.voci[0].provenienza, /\+1 dado \(Sovraccarico Controllato\)/);
  // Controllo Arcano: Esplosione Elementale (Raggio) sì, Colpo Elementale no
  const ca = conTalento(lucas, 'Invocatore', 'Controllo Arcano');
  assert.ok(lancia(ca, 'Esplosione Elementale', { versione: 3 }).danno.talenti.some((x) => x.nome === 'Controllo Arcano'));
  assert.ok(!lancia(ca, 'Colpo Elementale', { versione: 1 }).danno.talenti.some((x) => x.nome === 'Controllo Arcano'));
  assert.equal(aggiungiDado('2d6+5'), '3d6+5');
});

test('Talenti di cura e massimo dei dadi: Canale Vitale +1 PV, Tocco Sacro su Cura Ferite a Contatto, Incantesimi Massimizzati', () => {
  const cv = conTalento(lucas, 'Mistico', 'Canale Vitale');
  const r = lancia(cv, 'Cura Ferite', { versione: 3 });
  assert.equal(r.cura.voci[0].testo, '1d4+3');
  assert.equal(r.cura.voci[0].provenienza, '1d4+2 +1 Canale Vitale');
  const ts = conTalento(lucas, 'Mistico', 'Tocco Sacro');
  assert.match(lancia(ts, 'Cura Ferite', { versione: 3 }).cura.voci[0].testo, /dadi al massimo: 6/);
  assert.equal(massimoFormula('3d6+2'), 20); // l'esempio del manuale
  const lucasMax = { ...lucas, talentiLiberi: [...lucas.talentiLiberi, { id: 'incantesimi-massimizzati', nome: 'Incantesimi Massimizzati', parametro: null }] };
  const k = lancia(lucasMax, 'Colpo Elementale', { versione: 1 }).talenti_lancio.find((x) => x.nome === 'Incantesimi Massimizzati').chiave;
  assert.match(lancia(lucasMax, 'Colpo Elementale', { versione: 1, talentiLancio: [k] }).danno.voci[0].testo, /massimo 8/); // 1d6+2 → 8
});

test('Talenti di lancio già gestiti: il risultato li applica davvero', () => {
  const b = carica('b_fratellanza_arcanista_l12.json');
  // Armonizzazione Arcana (Arcanista I): −1 PM, minimo 1
  const r = lancia(b, 'Colpo Elementale', { versione: 3 });
  assert.equal(r.pm_costo, 2);
  assert.ok(r.costo.some((c) => c.etichetta === 'Armonizzazione Arcana' && c.valore === -1));
  // Occhio Interiore (Mistico): +2 a Potere per la Divinazione; Presenza e Psicometria ora lo sono
  const occhio = conTalento(b, 'Mistico', 'Occhio Interiore');
  for (const nome of ['Presenza', 'Psicometria', 'Premonizione']) {
    const v = inc(nome).versioni.map((x) => Number(x.Livello)).filter((l) => l >= 6 && l <= b.incantesimi.livelloMassimo)[0];
    const con = lancia(occhio, nome, { versione: v });
    assert.ok(con.provenienza.righe.some((x) => x.fonte === 'Occhio Interiore' && x.valore === 2), nome);
  }
  // Architetto Arcano: la penalità di livello si riduce di 2
  const arch = conTalento(b, 'Arcanista', 'Architetto Arcano');
  const livAlto = { versione: 12 };
  assert.ok(lancia(arch, 'Colpo Elementale', livAlto).va_potere_finale > lancia(b, 'Colpo Elementale', livAlto).va_potere_finale);
  // Riserva Tecnica: −2 PM una volta per scena, dichiarata
  const ris = conTalento(b, 'Arcanista', 'Riserva Tecnica');
  assert.equal(lancia(ris, 'Colpo Elementale', { versione: 6, riservaTecnica: true }).pm_costo, lancia(ris, 'Colpo Elementale', { versione: 6 }).pm_costo - 2);
  // Focalizzazione e Ingaggio dai Talenti (scheda.magia): Focalizzazione Migliorata +6
  const foc = { ...b, magia: { ...b.magia, focalizzazioneVa: 6 } };
  assert.ok(lancia(foc, 'Colpo Elementale', { versione: 6, focalizzazione: true }).provenienza.righe.some((x) => x.valore === 6));
});

test('Talenti di lancio senza numero: una riga «Talenti: …» con la prima frase; numeri ricavabili fra parentesi', () => {
  const r = lancia(lucas, 'Colpo Elementale', { versione: 1 });
  const riga = r.promemoria.find((p) => p.startsWith('Talenti: '));
  assert.match(riga, /Canalizzazione Implacabile — Una volta per scena/);
  assert.ok(!/Incantesimi Aggressivi/.test(riga)); // quello ora è un valore
  const cs = conTalento(carica('b_fratellanza_arcanista_l12.json'), 'Arcanista', 'Canalizzazione Sicura');
  const rc = lancia(cs, 'Colpo Elementale', { versione: 9 });
  assert.match(rc.promemoria.find((p) => p.startsWith('Talenti: ')), /Canalizzazione Sicura — .*\(se la Prova fallisce recuperi \d+ PM\)/);
});
