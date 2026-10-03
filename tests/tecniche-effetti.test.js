// Effetti delle Tecniche Interiori al tavolo (Giocatore §8.9; tools/effetti_tecniche.mjs, src/tecniche.js,
// src/condizioni.js, src/attacco.js): i valori effettivi cambiano solo mentre la Tecnica è in corso e
// tornano alla scadenza; «Attacca!» legge gli effetti dallo stesso punto; Imposizione si applica.
// Personaggio: Aiko Tenzan (esempi/), Lottatrice Mishima di 5° livello, Disciplina Controllo, Grado II.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaSchedaPersonaggio } from '../src/avanzamento.js';
import { massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { attivaTecnica, nuovoRound, terminaTecnica, tecnicaDi, curaTecnica, sintesiTecnica } from '../src/tecniche.js';
import { profiloSenzArmi, profiloOndaInteriore, calcolaAttaccoRavvicinato } from '../src/attacco.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const T = (id) => tecnicaDi(id, dati);
const file = readFileSync(new URL('../esempi/Aiko-Tenzan_liv5_2026-10-02.json', import.meta.url), 'utf8');
const letto = deserializzaPersonaggio(file);
const creazione = normalizza(letto.creazione, dati).scelte;
const scheda = (sessione = null) => calcolaSchedaPersonaggio({ creazione, livelli: letto.livelli, sessione }, dati);
const m = massimiSessione(scheda(), creazione, dati);
const riposo = () => ({ ...inizializzaSessione(m), round: 1, ultimaTecnica: null, tecnicheAttive: [] });
// le Tecniche che Aiko non conosce si aggiungono alla scheda solo per poterle attivare
const conTecniche = (s, ids) => ({ ...s, tecniche: [...s.tecniche, ...ids.map((id) => ({ id, nome: T(id).nome }))] });
const attiva = (sess, id, opz = {}) => attivaTecnica(conTecniche(scheda(sess), [id]), sess, T(id), dati, opz);
const ab = (s, n) => s.abilita.find((a) => a.nome === n);
const uso = (s, abilita, u) => ab(s, abilita).usiSpecifici.find((x) => x.uso === u) ?? null;
const avanti = (sess, n) => Array.from({ length: n }).reduce((s) => nuovoRound(s), sess);

test('dati: 28 Tecniche con effetti; numeri in breve, frasi controllate, nessun TODO (A.81 e A.82 decise il 03/10)', () => {
  const t = dati.tecniche_interiori.tecniche;
  assert.equal(t.filter((x) => x.effetti).length, 28);
  assert.equal(sintesiTecnica(T('pelle-di-rinoceronte')), '+1 AR rav., +2 danno rav., +3 FOR');
  assert.equal(sintesiTecnica(T('volonta-adamantina')), null);
  assert.deepEqual(t.filter((x) => x.effetti['TODO(Davide)']).map((x) => x.id), []);
  // ogni numero della forma breve è nel testo della scheda
  for (const x of t.filter((y) => y.effetti.breve)) {
    for (const n of x.effetti.breve.match(/\d+/g) ?? []) assert.ok(x.testo.includes(n) || JSON.stringify(x.altri_campi ?? {}).includes(n), `${x.id}: ${n}`);
  }
});

test('Pelle di Rinoceronte: +2 danno ravvicinato, +3 FOR e manovre di forza solo finché è in corso', () => {
  const s0 = riposo();
  const a0 = scheda(s0);
  const dannoRiposo = profiloSenzArmi(a0, dati).danno.una_mano;
  assert.equal(uso(a0, 'Atletica', 'Sforzo di forza'), null);
  const s1 = attiva(s0, 'pelle-di-rinoceronte');
  assert.ok(s1);
  const a1 = scheda(s1);
  const senz = profiloSenzArmi(a1, dati);
  assert.notEqual(senz.danno.una_mano, dannoRiposo);
  assert.ok(senz.provenienzaDanno.righe.some((r) => r.fonte === 'Tecnica: Pelle di Rinoceronte (fino al Round 4)' && r.valore === 2));
  // A.81: Atletica per lo sforzo di forza e per le Prove di Immobilizzare e Sbilanciare; Corpo a corpo nelle manovre
  assert.equal(uso(a1, 'Atletica', 'Sforzo di forza').modificatore, 3);
  assert.equal(uso(a1, 'Atletica', 'Immobilizzare e opposizione a Sbilanciare').modificatore, 3);
  assert.equal(uso(a1, 'Corpo a corpo', 'Immobilizzare, Sbilanciare, Disarmare, Incalzare').modificatore, 3);
  // «Attacca!»: +3 sommato a Sbilanciare e Incalzare senz'armi, non all'Attacco normale né a Stordire
  const pg = { scheda: a1, sessione: s1 };
  const va = (manovra) => calcolaAttaccoRavvicinato(pg, senz, { manovra: [manovra] }, dati).va_finale;
  const pg0 = { scheda: a0, sessione: s0 };
  const senz0 = profiloSenzArmi(a0, dati);
  const va0 = (manovra) => calcolaAttaccoRavvicinato(pg0, senz0, { manovra: [manovra] }, dati).va_finale;
  for (const m of ['sbilanciare', 'incalzare']) assert.equal(va(m) - va0(m), 3, m);
  for (const m of ['normale', 'stordire']) assert.equal(va(m), va0(m), m);
  assert.deepEqual(a1.usiCaratteristicheTalenti.map((x) => [x.caratteristiche, x.valore, x.uso]), [[['FOR'], 3, 'prove di FOR']]);
  // «Bonus dei Talenti» spento: le Tecniche restano (sono attivazioni, non Talenti passivi)
  assert.equal(profiloSenzArmi(scheda({ ...s1, bonusTalenti: false }), dati).provenienzaDanno.righe.some((r) => /Pelle di Rinoceronte/.test(r.fonte)), true);
  // in corso fino alla fine del Round 4; dal Round 5 i valori tornano quelli a riposo
  const s4 = avanti(s1, 3);
  assert.equal(uso(scheda(s4), 'Atletica', 'Sforzo di forza').modificatore, 3);
  const a5 = scheda(avanti(s1, 4));
  assert.equal(profiloSenzArmi(a5, dati).danno.una_mano, dannoRiposo);
  assert.equal(uso(a5, 'Atletica', 'Sforzo di forza'), null);
  assert.deepEqual(a5.usiCaratteristicheTalenti, []);
});

test('Aura di Resistenza: +1 AR magica solo finché è in corso (A.48), con la provenienza della Tecnica', () => {
  const ar = (s) => scheda(s).equipaggiamento.arEffettiva;
  const s1 = attiva(riposo(), 'aura-di-resistenza');
  assert.equal(ar(s1).totale, ar(riposo()).totale + 1);
  assert.equal(ar(avanti(s1, 3)).totale, ar(riposo()).totale + 1);
  assert.equal(ar(avanti(s1, 4)).totale, ar(riposo()).totale);
});

test('Vista Felina: il senso compare solo mentre è attiva; durata a tempo, si termina a mano', () => {
  assert.deepEqual(scheda(riposo()).sensi, []);
  const s1 = attiva(riposo(), 'vista-felina');
  assert.deepEqual(scheda(s1).sensi.map((x) => [x.nome, x.raggioQ, x.fonte]), [['Vista nell’oscurità', 20, 'Tecnica: Vista Felina (finché è attiva)']]);
  // a tempo (1 ora): i Round non la fanno scadere
  assert.equal(scheda(avanti(s1, 10)).sensi.length, 1);
  assert.deepEqual(scheda(terminaTecnica(s1, 'vista-felina')).sensi, []);
});

test('Pugno di Pietra: in «Attacca!» senz’armi la PS Integrità −2 solo nel Round dell’attivazione; non con un’arma', () => {
  const s0 = riposo();
  const pg = (sess) => ({ scheda: scheda(sess), sessione: sess });
  const prima = calcolaAttaccoRavvicinato(pg(s0), profiloSenzArmi(scheda(s0), dati), {}, dati);
  assert.equal(prima.dopo_armatura.length, 0);
  const s1 = attiva(s0, 'pugno-di-pietra');
  const r = calcolaAttaccoRavvicinato(pg(s1), profiloSenzArmi(scheda(s1), dati), {}, dati);
  assert.deepEqual(r.dopo_armatura.map((x) => x.etichetta), ['PS Integrità −2, +1 PI']);
  assert.ok(r.promemoria.some((p) => /^Tecniche attive: Pugno di Pietra \(fino al Round 1\) — PS Integrità −2, \+1 PI/.test(p)));
  // con un'arma ravvicinata no: avviso
  const arma = { uid: 'x', nome: 'Katana', tipo: 'arma_ravvicinata', abilita: 'Armi da guerra', va: 10, vaEffettivo: 10, danno: { una_mano: '1d8', due_mani: null }, portataQ: 1, manovre: [], mani: 1 };
  const conArma = calcolaAttaccoRavvicinato(pg(s1), arma, {}, dati);
  assert.equal(conArma.dopo_armatura.length, 0);
  assert.ok(conArma.avvisi.some((a) => /^Pugno di Pietra: non vale con Katana/.test(a)));
  // Round successivo: scaduta
  const s2 = nuovoRound(s1);
  assert.equal(calcolaAttaccoRavvicinato(pg(s2), profiloSenzArmi(scheda(s2), dati), {}, dati).dopo_armatura.length, 0);
});

test('Onda Interiore: profilo d’attacco solo nel Round dell’attivazione, dado per Disciplina e Grado, danno Magico', () => {
  const s0 = riposo();
  assert.equal(profiloOndaInteriore(scheda(s0), s0, dati), null);
  const s1 = attiva(s0, 'onda-interiore');
  const a1 = scheda(s1);
  const o = profiloOndaInteriore(a1, s1, dati);
  // Controllo, Grado II di Lottatore: 1d4 (§8.9.4), più il bonus di SAG, non di FOR (A.82, E&L del 03/10/2026)
  assert.equal(o.dannoBase, '1d4');
  assert.equal(o.bonusCaratteristica?.sigla, 'SAG');
  assert.equal(o.portataQ, 6);
  assert.equal(o.vaEffettivo, ab(a1, 'Corpo a corpo').effettivo);
  const pg = { scheda: a1, sessione: s1 };
  const r = calcolaAttaccoRavvicinato(pg, o, { bersaglio: { distanza: 5 } }, dati);
  assert.equal(r.impossibile, null);
  assert.equal(r.danno.natura, 'Magico');
  assert.match(r.danno.base, /^1d4/);
  assert.match(r.prova.testo, /non Parabile con un’arma ordinaria/);
  assert.match(calcolaAttaccoRavvicinato(pg, o, { bersaglio: { distanza: 7 } }, dati).impossibile.motivo, /oltre la portata/);
  assert.match(calcolaAttaccoRavvicinato(pg, o, { manovra: ['sbilanciare'] }, dati).impossibile.motivo, /Onda Interiore/);
  // la tabella: Potenza al Grado III → 1d10, Guardia al V → 1d10
  const con = (disc, grado) => ({ ...a1, classi: a1.classi.map((c) => (c.nome === 'Lottatore' ? { ...c, grado, talenti: c.talenti.map((t) => (t.sceltaParametro ? { ...t, sceltaParametro: disc } : t)) } : c)) });
  assert.equal(profiloOndaInteriore(con('potenza', 3), s1, dati).dannoBase, '1d10');
  assert.equal(profiloOndaInteriore(con('guardia', 5), s1, dati).dannoBase, '1d10');
  assert.equal(profiloOndaInteriore(con('rapidita', 1), s1, dati).dannoBase, '1d4');
  // scaduta al Round successivo
  const s2 = nuovoRound(s1);
  assert.equal(profiloOndaInteriore(scheda(s2), s2, dati), null);
});

test('Imposizione della Mano Curativa: Sanguinamento, PV e Ferite applicati al proprio personaggio; promemoria per un altro', () => {
  const imp = T('imposizione-della-mano-curativa');
  const base = { ...riposo(), pvAttuali: 10, ferite: 2, statiAttivi: ['sanguinamento'] };
  // PV con Sanguinamento attivo: avviso, nessun recupero
  const a = scheda(base);
  const bloccata = curaTecnica(a, base, imp, 2, dati, { dado: 3 });
  assert.ok(bloccata.avvisi.some((x) => /Sanguinamento attivo/.test(x)));
  assert.equal(attiva(base, imp.id, { opzione: 2, cura: { dado: 3 } }).pvAttuali, 10);
  // senza il dado la Tecnica non parte (nessun tiro automatico)
  assert.equal(attiva(base, imp.id, { opzione: 2, cura: {} }), null);
  // arresta il Sanguinamento
  const s1 = attiva(base, imp.id, { opzione: 1 });
  assert.deepEqual(s1.statiAttivi, []);
  assert.equal(s1.pmAttuali, m.pm - 2);
  // Round dopo: 1d4 (3) + Mod SAG (3) = 6 PV
  const s2 = attiva(nuovoRound(s1), imp.id, { opzione: 2, cura: { dado: 3 } });
  assert.equal(s2.pvAttuali, 16);
  // Ferita Importante → Superficiale
  const s3 = attiva(nuovoRound(s2), imp.id, { opzione: 3 });
  assert.equal(s3.ferite, 1);
  // sospensione: 10 Round, poi il recupero di PV torna possibile anche con lo Stato acceso
  const s4 = attiva(nuovoRound({ ...s3, pmAttuali: m.pm, statiAttivi: ['sanguinamento'] }), imp.id, { opzione: 0 });
  assert.deepEqual(s4.tecnicheAttive.find((x) => x.id === imp.id), { id: imp.id, dal: 4, al: 14, opzione: 0 });
  assert.equal(curaTecnica(scheda(s4), s4, imp, 2, dati, { dado: 1 }).applica !== null, true);
  // su un altro personaggio: solo i PM, l'effetto è un promemoria
  const altro = attiva(base, imp.id, { opzione: 3, cura: { bersaglio: 'altro' } });
  assert.equal(altro.ferite, 2);
  assert.equal(altro.pmAttuali, m.pm - 10);
  assert.ok(curaTecnica(a, base, imp, 3, dati, { bersaglio: 'altro' }).righe.some((x) => /sulla sua scheda/.test(x)));
});

test('Corsa di Nomura raddoppia il movimento; Radici della Montagna lo porta a 0; a riposo invariato', () => {
  const r = scheda(riposo()).tavolo.movimento;
  const n = scheda(attiva(riposo(), 'corsa-di-nomura')).tavolo.movimento;
  assert.deepEqual([n.passo.effettivo, n.corsa.effettivo, n.scatto.effettivo], [r.passo.effettivo * 2, r.corsa.effettivo * 2, r.scatto.effettivo * 2]);
  assert.ok(n.passo.provenienza.righe.some((x) => x.fonte === 'Tecnica: Corsa di Nomura (fino al Round 4) (×2)'));
  const z = scheda(attiva(riposo(), 'radici-della-montagna')).tavolo.movimento;
  assert.deepEqual([z.passo.effettivo, z.corsa.effettivo, z.scatto.effettivo], [0, 0, 0]);
});

test('«Attacca!» con le altre Tecniche d’attacco: Presa dell’Anima, Colpo Interiore, Salto della Rana in Carica, Vipera', () => {
  const pg = (sess) => ({ scheda: scheda(sess), sessione: sess });
  const senz = (sess) => profiloSenzArmi(scheda(sess), dati);
  // Presa dell'Anima: +3 solo per Immobilizzare, Sbilanciare, Disarmare senz'armi
  const p1 = attiva(riposo(), 'presa-dell-anima');
  const imm = calcolaAttaccoRavvicinato(pg(p1), senz(p1), { manovra: ['immobilizzare'] }, dati);
  const immR = calcolaAttaccoRavvicinato(pg(riposo()), senz(riposo()), { manovra: ['immobilizzare'] }, dati);
  assert.equal(imm.va_finale - immR.va_finale, 3);
  assert.equal(calcolaAttaccoRavvicinato(pg(p1), senz(p1), {}, dati).va_finale, calcolaAttaccoRavvicinato(pg(riposo()), senz(riposo()), {}, dati).va_finale);
  // Colpo Interiore: danno Etereo
  const c1 = attiva(riposo(), 'colpo-interiore');
  assert.equal(calcolaAttaccoRavvicinato(pg(c1), senz(c1), {}, dati).danno.natura, 'Etereo');
  // Salto della Rana in Carica: +3 dopo il moltiplicatore, non moltiplicato
  const r1 = attiva(riposo(), 'salto-della-rana');
  const carica = calcolaAttaccoRavvicinato(pg(r1), senz(r1), { carica: true, percorsoQ: 4 }, dati);
  assert.match(carica.danno.testo, /×2 \+3$/);
  assert.equal(carica.danno.dopo_moltiplicatore, 3);
  // Vipera dal Cappuccio: non parabile, Sanguinamento 2 dopo l'Armatura
  const v1 = attiva(riposo(), 'vipera-dal-cappuccio');
  const v = calcolaAttaccoRavvicinato(pg(v1), senz(v1), {}, dati);
  assert.deepEqual(v.dopo_armatura.map((x) => x.etichetta), ['Sanguinamento 2']);
  assert.match(v.prova.testo, /Non può essere Parato con arma o scudo/);
});
