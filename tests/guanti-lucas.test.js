// Guanti da Combattimento Mistico riscritti dalla scheda «Guanti mistici di Lucas» 1.0 (31/10/2026; Armamenti 0.74 §7.24,
// Magia 1.11 §26.6.2): Grado III, SnT 3, riserva Rossa da 10 PM, nessun bonus passivo, Pugno mistico 2 PM con +1 VA,
// Getto di fuoco e Doppio getto. Il test più importante è quello del +1 VA fantasma: se il bonus passivo torna da
// qualunque parte (catalogo, scheda, «Attacca!», stampa, «Lancia!», PG → nemico) fallisce.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { massimiSessione, inizializzaSessione, allineaSessione, attivaArtefatto, usaArtefatto, variaChroma, modificaSessione } from '../src/sessione.js';
import { profiloSenzArmi, senzArmiDisponibile, pugniPotenziati } from '../src/attacco.js';
import { pianoGetto, maniOccupate } from '../src/getti-artefatto.js';
import { preparaStampa, testoAttivazioneArtefatto } from '../src/stampa.js';
import { nemicoDaPg } from '../src/nemico-da-pg.js';
import { incantesimiDaOggetti } from '../src/incantesimi-artefatti.js';
import { rapportoGuanti } from '../tools/guanti-lucas.mjs';

const { dati } = await datiReali();
const RIF = 'artefatti:guanti-da-combattimento-mistico';
const G = dati.equipaggiamento.file.artefatti.oggetti.find((o) => o.id === 'guanti-da-combattimento-mistico');
const FILE_LUCAS = new URL('./fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json', import.meta.url);

/** Lucas (copia del 20/10, Invocatore 6° livello: Guanti indossati e sintonizzati), con l'equipaggiamento cambiato a piacere. */
function lucas(cambia = (v) => v) {
  const p = deserializzaPersonaggio(readFileSync(FILE_LUCAS, 'utf8'));
  const creazione = normalizza(p.creazione, dati).scelte;
  creazione.equipaggiamento = cambia(creazione.equipaggiamento ?? []);
  const personaggio = { creazione, livelli: p.livelli, sessione: p.sessione };
  const m = massimiSessione(calcolaScheda(personaggio, dati), creazione, dati);
  const sessione = allineaSessione(p.sessione ?? inizializzaSessione(m), m);
  return { ...personaggio, sessione, m, scheda: calcolaScheda({ ...personaggio, sessione }, dati) };
}
const uidGuanti = (pg) => pg.creazione.equipaggiamento.find((v) => v.rif === RIF).uid;
const senzaGuanti = () => lucas((eq) => eq.filter((v) => v.rif !== RIF));

test('catalogo: i valori della scheda 1.0', () => {
  const a = G.artefatto;
  assert.deepEqual([a.potenza, a.grado, a.sintonizzazione], ['Rara', 'III', 3]);
  // revisione «Cariche Mistiche» (02/11/2026, lotto 171): 6 CM Rosse per la coppia, al posto dei 10 PM
  assert.deepEqual(a.contenitore, { energia: 'Rosso', integrato: true, riserva: 'cariche', alimentazione: 'esclusiva', capacita_cm: 6, precedente: { capacita_pm: 10, unita: 'PM', nota: 'Guanti da Combattimento Mistico' } });
  assert.deepEqual([G.qualita, G.ps_int, G.pi, G.peso, G.mani], ['Non comune', 12, 4, 0.5, 0]);
  const at = G.attivazione_artefatto;
  assert.deepEqual([at.nome, at.cm, at.pm, at.azione, at.durata, at.va, at.danno, at.natura, at.attacchi], ['Pugno mistico', 1, undefined, '1 AzP', '5 RND', 1, 1, 'Magico', 'senz_armi']);
  const [g1, g2] = G.getti_artefatto;
  assert.deepEqual([g1.nome, g1.cm, g1.mani_libere, g1.getti, g1.danno, g1.natura, g1.proprieta_danno, g1.prova_potere], ['Getto di fuoco', 3, 1, 1, '1d6+4', 'Naturale', ['Fuoco'], null]);
  assert.deepEqual([g1.area.lunghezza_q, g1.area.larghezza_q], [2, 1]);
  assert.deepEqual([g2.nome, g2.cm, g2.mani_libere, g2.getti, g2.danno, g2.prova_potere, g2.cm_anche_se_fallisce], ['Doppio getto', 6, 2, 2, '1d6+4', { abilita: 'Potere', modificatore: -2 }, true]);
  // A.175: proprietà attive, non incantesimi del catalogo
  assert.ok(!dati.incantesimi.incantesimi.some((i) => /Getto di fuoco|Pugno mistico|Doppio getto/i.test(i.nome)));
  const righe = incantesimiDaOggetti({ voci: [{ uid: 'g', rif: RIF, stato: 'indossata', quantita: 1, sintonizzato: true }], scheda: null }, dati);
  assert.deepEqual(righe.map((r) => [r.origine, r.getti.length]), [['proprieta', 2]]);
});

test('NESSUN +1 VA PASSIVO: con i Guanti solo indossati nessun valore cambia, da nessuna parte', () => {
  // catalogo
  assert.deepEqual(G.effetti, [], 'un effetto passivo è tornato nella voce dei Guanti');
  const con = lucas();
  const senza = senzaGuanti();
  // scheda: Abilità, Salvezze, bonus di equipaggiamento
  assert.deepEqual(con.scheda.abilita.map((a) => [a.nome, a.totale, a.effettivo]), senza.scheda.abilita.map((a) => [a.nome, a.totale, a.effettivo]));
  assert.ok(!(con.scheda.equipaggiamento.bonusAttacco ?? []).some((b) => /Guanti/.test(b.nome)), 'bonus d’attacco dai Guanti');
  assert.ok(!(con.scheda.equipaggiamento.bonusDanno ?? []).some((b) => /Guanti/.test(b.nome)), 'bonus al danno dai Guanti');
  assert.ok(!(con.scheda.equipaggiamento.effettiOggetti ?? []).some((e) => /Guanti/.test(e.oggetto ?? e.nome ?? '')), 'effetti dai Guanti');
  // «Attacca!» senz'armi: stesso VA e stesso danno; i Guanti si riconoscono lo stesso (pugni potenziati)
  const a1 = profiloSenzArmi(con.scheda, dati);
  const a0 = profiloSenzArmi(senza.scheda, dati);
  assert.equal(a1.vaEffettivo, a0.vaEffettivo);
  assert.equal(a1.danno.una_mano, a0.danno.una_mano);
  assert.ok(!a1.scomposizione.some((x) => /Guanti|Pugno mistico/.test(x.etichetta)));
  assert.equal(a1.nome, 'Pugni (Guanti da Combattimento Mistico)');
  assert.ok(pugniPotenziati(con.scheda) && senzArmiDisponibile(con.scheda, dati));
  // stampa: nessuna riga di provenienza dei Guanti con un valore
  const fantasmi = [];
  const cerca = (x) => {
    if (Array.isArray(x)) return x.forEach(cerca);
    if (!x || typeof x !== 'object') return;
    const etichetta = String(x.fonte ?? x.etichetta ?? x.voce ?? '');
    if (/Guanti|Pugno mistico/.test(etichetta) && typeof x.valore === 'number' && x.valore !== 0) fantasmi.push(etichetta);
    Object.values(x).forEach(cerca);
  };
  cerca(preparaStampa(con, dati, { sessione: con.sessione }));
  assert.deepEqual(fantasmi, [], 'valori dei Guanti nella stampa');
  // «Lancia!» e PG → nemico: incantesimi e attacchi identici con e senza Guanti
  const file = (pg) => serializza(pg.creazione, { livelli: pg.livelli, sessione: pg.sessione });
  const n1 = nemicoDaPg(file(con), dati);
  const n0 = nemicoDaPg(file(senza), dati);
  assert.ok(!n1.errore && !n0.errore);
  assert.deepEqual(n1.nemico?.incantesimi ?? n1.incantesimi, n0.nemico?.incantesimi ?? n0.incantesimi);
  assert.deepEqual(n1.nemico?.attacchi ?? n1.attacchi, n0.nemico?.attacchi ?? n0.attacchi);
});

test('Pugno mistico: 2 PM, +1 VA, danno Magico e +1 solo finché è acceso', () => {
  const pg = lucas();
  const uid = uidGuanti(pg);
  const base = profiloSenzArmi(pg.scheda, dati);
  const s1 = attivaArtefatto(pg.sessione, uid, 2, pg.m);
  assert.equal(s1.chroma[uid].pmAttuali, pg.sessione.chroma[uid].pmAttuali - 2);
  const acceso = profiloSenzArmi(calcolaScheda({ ...pg, sessione: s1 }, dati), dati);
  assert.equal(acceso.vaEffettivo - base.vaEffettivo, 1);
  assert.equal(acceso.natura, 'Magico');
  assert.ok(acceso.scomposizione.some((x) => /^Pugno mistico \(Guanti da Combattimento Mistico, 5 RND\)$/.test(x.etichetta) && x.valore === 1));
  // «Termina»: la condizione spenta, il +1 VA sparisce
  const s2 = modificaSessione(s1, { condizioniOggetti: s1.condizioniOggetti.filter((k) => k !== `attivazione:${uid}`) }, pg.m);
  const spento = profiloSenzArmi(calcolaScheda({ ...pg, sessione: s2 }, dati), dati);
  assert.equal(spento.vaEffettivo, base.vaEffettivo);
  // non passa ai getti né alle armi impugnate
  assert.ok(!(calcolaScheda({ ...pg, sessione: s1 }, dati).equipaggiamento.armi ?? []).filter((a) => !a.senzArmi).some((a) => a.scomposizione?.some((x) => /Pugno mistico/.test(x.etichetta))));
});

test('Getto di fuoco e Doppio getto: CM dalla riserva, mani libere, Prova di Potere −2, avvisi senza blocchi', () => {
  // nella copia Lucas impugna un'Axis-227 e un pugnale: due mani occupate, il Getto avvisa
  const armato = lucas();
  assert.equal(maniOccupate(armato.scheda), 2);
  assert.ok(pianoGetto(G.getti_artefatto[0], armato.scheda, { pm: 6, sintonizzato: true, indossato: true }).motivi.some((m) => /una mano libera, ne hai 0/.test(m)));
  // a mani libere (armi riposte)
  const pg = lucas((eq) => eq.map((v) => (v.stato === 'impugnata' ? { ...v, stato: 'trasportato' } : v)));
  const uid = uidGuanti(pg);
  const [getto, doppio] = G.getti_artefatto;
  const stato = { pm: 6, sintonizzato: true, indossato: true, deposito: false };
  const p1 = pianoGetto(getto, pg.scheda, stato);
  assert.equal(maniOccupate(pg.scheda), 0, 'Lucas a mani libere');
  assert.deepEqual([p1.costo, p1.motivi, p1.prova, p1.danni], [{ n: 3, unita: 'CM' }, [], null, ['1d6+4']]);
  assert.match(p1.testo, /linea 2 × 1 Q; 1d6\+4 danni \(Naturale, Fuoco\)/);
  const p2 = pianoGetto(doppio, pg.scheda, stato);
  const potere = pg.scheda.abilita.find((a) => a.nome === 'Potere');
  assert.equal(p2.prova.va, (potere.effettivo ?? potere.totale) - 2);
  assert.deepEqual(p2.danni, ['1d6+4', '1d6+4'], 'un tiro di danno per getto');
  // avvisi: riserva, sintonizzazione, mani
  const p3 = pianoGetto(doppio, pg.scheda, { pm: 4.2, sintonizzato: false, indossato: true });
  assert.ok(p3.motivi.some((m) => /la riserva ha 4,2 CM, ne servono 6/.test(m)) && p3.motivi.some((m) => /non sintonizzato/.test(m)));
  const conArma = lucas((eq) => eq.map((v) => (v.rif === 'armi_distanza_corporative:axis-227' ? { ...v, stato: 'trasportato' } : v)));
  assert.equal(maniOccupate(conArma.scheda), 1);
  assert.ok(pianoGetto(doppio, conArma.scheda, stato).motivi.some((m) => /entrambe le mani libere/.test(m)));
  assert.deepEqual(pianoGetto(getto, conArma.scheda, stato).motivi, [], 'per il Getto basta una mano');
  // la riserva: 6 → 3 → 0 CM; poi non basta; «Procedi comunque» scende a 0, non sotto
  const s1 = usaArtefatto(pg.sessione, uid, 3, pg.m);
  const s2 = usaArtefatto(s1, uid, 3, pg.m);
  assert.deepEqual([s1.chroma[uid].pmAttuali, s2.chroma[uid].pmAttuali], [3, 0]);
  assert.equal(usaArtefatto(s2, uid, 3, pg.m), null);
  assert.equal(usaArtefatto(s1, uid, 6, pg.m, { forza: true }).chroma[uid].pmAttuali, 0);
  // Doppio getto: le 6 CM si scalano al tentativo (anche se la Prova fallisce: la Prova si tira dopo)
  assert.equal(usaArtefatto(pg.sessione, uid, 6, pg.m).chroma[uid].pmAttuali, 0);
  // esempio della revisione: un Getto e due Pugni mistici lasciano 1 CM; sei Pugni la vuotano
  const e = attivaArtefatto(attivaArtefatto(usaArtefatto(pg.sessione, uid, 3, pg.m), uid, 1, pg.m), uid, 1, pg.m);
  assert.equal(e.chroma[uid].pmAttuali, 1);
  let sei = pg.sessione;
  for (let i = 0; i < 6; i++) sei = attivaArtefatto(sei, uid, 1, pg.m);
  assert.equal(sei.chroma[uid].pmAttuali, 0);
  assert.equal(attivaArtefatto(sei, uid, 1, pg.m), null);
});

test('la riserva Rossa cala e si ricarica a mano, entro le 6 CM; nessuna ricarica automatica', () => {
  const pg = lucas();
  const uid = uidGuanti(pg);
  const c = pg.scheda.equipaggiamento.contenitori.find((x) => x.uid === uid);
  assert.deepEqual([c.energia, c.capacita, c.unita, c.riserva, c.alimentazione], ['Rosso', 6, 'CM', 'cariche', 'esclusiva']);
  assert.equal(c.fontePg, false, 'Esclusiva: non paga i lanci del personaggio');
  const vuota = usaArtefatto(pg.sessione, uid, 6, pg.m);
  assert.equal(variaChroma(vuota, uid, 4, pg.m).chroma[uid].pmAttuali, 4);
  assert.equal(variaChroma(vuota, uid, 15, pg.m).chroma[uid].pmAttuali, 6, 'non oltre la capacità');
  // le CM salvate restano: niente riempimento al ricalcolo
  const meta = modificaSessione(pg.sessione, { chroma: { ...pg.sessione.chroma, [uid]: { pmAttuali: 3, unita: 'CM' } } }, pg.m);
  assert.equal(allineaSessione(meta, pg.m).chroma[uid].pmAttuali, 3);
});

test('Lucas (copia): kit da 9 su 9, i 10 PM di prima diventano 6 CM (A.193), rapporto in sola lettura; oltre la capacità solo un avviso', () => {
  const pg = lucas();
  const r = rapportoGuanti(pg, dati);
  assert.equal(r.haGuanti, true);
  assert.deepEqual(r.kit, { usata: 9, capacita: 9 });
  assert.equal(r.riserva, 6);
  assert.deepEqual(r.avvisi, []);
  assert.ok(r.voci.some((v) => v.cosa === 'Kit sintonizzato / capacità' && v.prima === '8 / 9' && v.dopo === '9 / 9'));
  assert.ok(r.daDire[0] === 'Non devi scegliere niente.');
  // il file non cambia: lo strumento non scrive e il calcolo non tocca le scelte
  const prima = readFileSync(FILE_LUCAS, 'utf8');
  rapportoGuanti(pg, dati);
  assert.equal(readFileSync(FILE_LUCAS, 'utf8'), prima);
  // se il kit non entrasse (capacità più bassa), avviso e nessuna sintonizzazione tolta
  const stretto = structuredClone(dati);
  stretto.equipaggiamento.file.artefatti.sintonizzazione.capacita_per_gradi = stretto.equipaggiamento.file.artefatti.sintonizzazione.capacita_per_gradi.map((n) => n - 1);
  const r2 = rapportoGuanti(pg, stretto);
  assert.deepEqual(r2.kit, { usata: 9, capacita: 8 });
  assert.ok(r2.avvisi.some((a) => /non toglie niente/.test(a)));
  const s2 = calcolaScheda(pg, stretto);
  assert.ok(s2.equipaggiamento.sintonizzazione.artefatti.filter((x) => x.costo).every((x) => x.sintonizzato));
});

test('stampa: le proprietà attive dei Guanti in una riga', () => {
  const t = testoAttivazioneArtefatto(G);
  assert.match(t, /^Pugno mistico: 1 CM dalla riserva interna, 1 AzP, 5 RND: \+1 VA ai pugni, danno Magico, \+1 al danno/);
  assert.match(t, /Getto di fuoco: 3 CM, 1 AzP, linea 2 × 1 Q, 1d6\+4 Naturale \(Fuoco\)/);
  assert.match(t, /Doppio getto: 6 CM, 1 AzP, Prova di Potere −2, due linee 2 × 1 Q, 1d6\+4 Naturale \(Fuoco\) per getto/);
});
