// Lotto 1 della ricognizione del 01/11/2026 (docs/diff-talenti-054-2026-11-01.md, docs/diff-specializzazioni-054-2026-11-01.md):
// elenchi delle Specializzazioni per Classe dal Giocatore 0.54 §8.10, Combattimento Senz'Armi (§8.8.1), voci tolte
// tenute a chi le ha già (A.230), voci di Potere lasciate finché vale la A.185 (A.229), «Indirizzi di Classe» (§3.2).
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { righeDeiDati } from '../tools/edizioni-dati.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { postiTalenti, controllaSceltaTalento, prossimoLivello } from '../src/avanzamento.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { profiloSenzArmi, senzArmiDisponibile } from '../src/attacco.js';
import { controllaTalentiDaTablet } from '../src/talenti-tablet.js';
import { etichettaIndirizzo, rigaBreve } from '../src/talenti-testi.js';

const { dati } = await datiReali();
const S = dati.specializzazioni;
const nome = (id) => S.specializzazioni.find((x) => x.id === id)?.nome;
const norma = (x) => x.normalize('NFC').replace(/[’']/g, '’').toLowerCase();
const NUOVA = 'specializzazione-combattimento-senz-armi';

/** Elenchi del §8.10 letti dal testo del manuale salvato (stesso taglio di tools/lotti/lotto_specializzazioni_054.mjs). */
function elenchiManuale() {
  // lotto 188: righe piatte dal registro, così la forma dell'esportazione (Markdown o testo semplice) non conta
  const righe = righeDeiDati('giocatore');
  const i0 = righe.findIndex((r, k) => k > 1000 && r.startsWith('8.10 Cataloghi delle acquisizioni'));
  const b = righe.slice(i0, i0 + 160).map((r) => r.replace(/\t/g, '').trim()).filter(Boolean);
  const out = {};
  for (let k = b.findIndex((r) => r.startsWith('Specializzazioni disponibili per Classe')); k < b.length; k++) {
    const m = b[k].match(/^(\S+) (\d+) opzioni$/);
    if (m && b[k + 1]) out[m[1]] = b[k + 1].replace(/\.$/, '').split(';').map((x) => x.trim()).filter(Boolean);
  }
  return out;
}

test('catalogo 0.54: 87 Specializzazioni, ogni elenco per Classe è esattamente quello del §8.10 (A.229 del 01/11)', () => {
  assert.equal(S.specializzazioni.length, 87);
  assert.equal(S.attesi.specializzazioni, 87);
  const man = elenchiManuale();
  assert.equal(Object.keys(man).length, 25);
  for (const [classe, voci] of Object.entries(man)) {
    assert.deepEqual(S.per_classe[classe].map(nome).map(norma), voci.map(norma), `${classe}: l’elenco non è quello del manuale`);
  }
  // alcuni allungamenti del 0.54 (20 Classi): un controllo a campione con i numeri del manuale
  assert.equal(S.per_classe.Incursore.length, 18);
  assert.equal(S.per_classe.Soldato.length, 24);
  assert.equal(S.per_classe.Lottatore.length, 15);
  assert.equal(S.per_classe.Medico.length, 15);
  assert.ok(S.per_classe.Lottatore.includes(NUOVA) && S.per_classe.Custode.includes(NUOVA));
});

test('A.229: le 20 voci di Potere uscite dagli elenchi di Custode, Invocatore, Mistico e Tecnomante stanno fra le tolte; l’Arcanista ha ancora le nove', () => {
  for (const id of S.gruppi.potere) assert.ok(S.per_classe.Arcanista.includes(id), `Arcanista: ${id}`);
  assert.equal(S.potere_in_attesa_a229, undefined, 'la A.229 è risposta: niente più voci in attesa');
  assert.deepEqual(S.per_classe_tolte.Tecnomante.map(nome), ['Elementi', 'Cambiamento', 'Influenza', 'Sintonia', 'Esorcismo', 'Trascendenza']);
  assert.deepEqual(S.per_classe.Tecnomante.filter((id) => S.gruppi.potere.includes(id)).map(nome), ['Manifestazione', 'Psionica', 'Incantamento']);
  const tolteDiPotere = Object.entries(S.per_classe_tolte).filter(([k]) => !k.startsWith('_')).flatMap(([, l]) => l).filter((id) => S.gruppi.potere.includes(id));
  assert.equal(tolteDiPotere.length, 20);
  for (const c of ['Custode', 'Invocatore', 'Mistico', 'Tecnomante']) for (const id of S.per_classe_tolte[c].filter((x) => S.gruppi.potere.includes(x))) assert.ok(!S.per_classe[c].includes(id), `${c}: ${id}`);
});

test('voci tolte non di Potere (A.230): fuori dall’elenco, annotate a parte', () => {
  assert.deepEqual(S.per_classe_tolte.Incursore, ['specializzazione-armi-inastate']);
  assert.ok(S.per_classe_tolte.Invocatore.includes('specializzazione-archi-e-balestre'));
  assert.ok(!S.per_classe.Incursore.includes('specializzazione-armi-inastate'));
  assert.ok(!S.per_classe.Invocatore.includes('specializzazione-archi-e-balestre'));
});

test('Combattimento Senz’Armi: voce distinta, +1 VA e +1 danno agli attacchi senz’armi, niente Difese né Parata', () => {
  const v = S.specializzazioni.find((x) => x.id === NUOVA);
  assert.equal(v.nome, 'Combattimento Senz’Armi');
  assert.deepEqual(v.effetto, { va: 1, danno: 1, attacchi: 'senz_armi' });
  assert.equal(v.solo_regime_nuovo, true);
  // nel testo che il giocatore legge: distinta da Armi da Pugno e dalla Parata a Mani Nude (A.206)
  assert.match(rigaBreve(NUOVA, dati), /Non dà Difese né la Parata a mani nude/);
  assert.match(v.ambito, /distinta da Armi da Pugno/);
  assert.match(v.ambito, /Parata a Mani Nude è dell’Addestramento al Combattimento Senz’Armi del Lottatore/);
  // la Parata a Mani Nude resta del Lottatore, con il suo Talento: nessuna voce con lo stesso nome
  const lottatore = dati.classi.classi.find((c) => c.nome === 'Lottatore');
  assert.ok(lottatore.talenti_a_scelta.some((t) => t.nome === 'Parata a Mani Nude Migliorata'));
  assert.ok(!S.specializzazioni.some((x) => /parata/i.test(x.nome)));
});

/** Lucas (Invocatore, 6° livello) dei Talenti nuovi, con o senza la Specializzazione iniziale. */
function lucas(spec) {
  const p = deserializzaPersonaggio(readFileSync(new URL('./collaudo/Lucas_liv6_2026-09-28 (2).json', import.meta.url), 'utf8'));
  const creazione = { ...normalizza(p.creazione, dati).scelte, regimeTalenti: 2, specializzazioneIniziale: spec ? { id: spec } : null };
  const livelli = p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; delete x.maestria; delete x.specializzazione; return x; });
  return { creazione, livelli };
}

test('Combattimento Senz’Armi sulla scheda: «Senz’armi» in «Attacca!» con +1 VA e +1 danno; Difese uguali', () => {
  const con = calcolaScheda(lucas(NUOVA), dati);
  const senza = calcolaScheda(lucas(null), dati);
  assert.ok(senzArmiDisponibile(con, dati));
  const a = profiloSenzArmi(con, dati); const b = profiloSenzArmi(senza, dati);
  assert.equal(a.vaEffettivo - b.vaEffettivo, 1);
  assert.equal(a.dannoBase, b.dannoBase);
  const bonus = (p) => Number(String(p.danno.una_mano).match(/\+(\d+)$/)?.[1] ?? 0);
  assert.equal(bonus(a) - bonus(b), 1);
  assert.ok(a.scomposizione.some((x) => x.etichetta === 'Specializzazione in Combattimento Senz’Armi' && x.valore === 1));
  assert.ok(a.provenienzaDanno.righe.some((r) => /Combattimento Senz’Armi/.test(r.fonte)));
  // niente Difese: la Specializzazione non tocca le Abilità né le Salvezze
  assert.deepEqual(con.abilita.map((x) => [x.nome, x.totale]), senza.abilita.map((x) => [x.nome, x.totale]));
  // Onda Interiore (Vettore Distanza) non la prende
  const onda = profiloSenzArmi(con, dati, { onda: { dado: '1d6', nota: '', gittataQ: 6, natura: 'Magico' } });
  assert.ok(!onda.scomposizione.some((x) => /Combattimento Senz’Armi/.test(x.etichetta)));
  // con i Talenti di prima la voce non si sceglie
  const vecchio = lucas(null);
  delete vecchio.creazione.regimeTalenti;
  const st = { regime: 'vecchio', talentiLiberi: [], classi: [], car: {}, abil: {}, livello: 3 };
  assert.ok(controllaSceltaTalento(st, 'talento_libero', { id: NUOVA }, dati).some((e) => /Talenti nuovi/.test(e.problema)));
});

/** Duncan (Incursore, 6° livello, fixture del 07/10) dei Talenti nuovi, con la Specializzazione del 4° livello data. */
function duncan(spec4) {
  const p = deserializzaPersonaggio(readFileSync(new URL('./fixtures/talenti-vecchi/DUNCAN-MCDUFF_liv6_2026-10-07.json', import.meta.url), 'utf8'));
  const creazione = { ...normalizza(p.creazione, dati).scelte, regimeTalenti: 2, specializzazioneIniziale: { id: 'specializzazione-spade' } };
  const livelli = p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; delete x.maestria; delete x.specializzazione; return x; });
  if (spec4) livelli[2].specializzazione = { id: spec4 };
  return { creazione, livelli };
}

test('A.230: chi ha già una voce tolta la tiene con un avviso; per una scelta nuova non c’è; il tablet non la scrive', () => {
  const d = duncan('specializzazione-armi-inastate');
  assert.equal(d.livelli[2].grado?.classe, 'Incursore');
  const posto = postiTalenti(d, dati, { opzioni: false }).posti.find((x) => x.categoria === 'specializzazione' && x.livello === 4);
  assert.equal(posto.valida, true, 'non è una regola infranta');
  const avviso = posto.problemi.find((e) => e.tipo === 'tolta');
  assert.match(avviso.problema, /non è più nell’elenco dell’Incursore \(Giocatore 0\.54\).*A\.230/);
  // la scheda la tiene e la segna
  const s = calcolaScheda(d, dati);
  assert.ok(!s.errori.some((e) => e.tipo === 'violazione'), JSON.stringify(s.errori.filter((e) => e.tipo === 'violazione')));
  const sp = s.specializzazioni.find((x) => x.id === 'specializzazione-armi-inastate');
  assert.equal(sp.tolta, true);
  // scelta nuova: l'opzione c'è ma non è ammessa, con il motivo
  const vuoto = duncan(null);
  const p4 = postiTalenti(vuoto, dati).posti.find((x) => x.categoria === 'specializzazione' && x.livello === 4);
  const o = p4.opzioni.find((x) => x.id === 'specializzazione-armi-inastate');
  assert.equal(o.ammesso, false);
  assert.match(o.motivo, /A\.230/);
  assert.ok(p4.opzioni.find((x) => x.id === 'specializzazione-carabine').ammesso, 'le voci nuove dell’Incursore si scelgono');
  // tablet: chi l'aveva la tiene (nessun cambio); scriverla di nuovo è del Direttore
  const file = (p) => JSON.parse(serializza(p.creazione, { livelli: p.livelli }));
  assert.deepEqual(controllaTalentiDaTablet(file(d), file(d), dati), { ok: true });
  const r = controllaTalentiDaTablet(file(d), file(duncan('specializzazione-carabine')), dati);
  assert.equal(r.ok, false);
  assert.equal(r.stato, 403);
  assert.match(r.errore, /A\.230/);
});

test('le voci nuove si vedono fra le opzioni della Classe aumentata (Lottatore: Combattimento Senz’Armi)', () => {
  const st = { regime: 'nuovo', talentiLiberi: [], classi: [{ nome: 'Lottatore', grado: 1, talenti: [] }], car: { FOR: 6, COS: 6, DES: 6, INT: 6, SAG: 6, CAR: 6 }, abil: {}, livello: 1 };
  assert.deepEqual(controllaSceltaTalento(st, 'specializzazione', { id: NUOVA }, dati, { classe: 'Lottatore' }).filter((e) => e.tipo !== 'incompleto'), []);
  assert.ok(controllaSceltaTalento(st, 'specializzazione', { id: NUOVA }, dati, { classe: 'Pilota' }).some((e) => e.tipo === 'violazione'));
  assert.ok(prossimoLivello);
});

test('«Indirizzi di Classe» (§3.2): etichette dei Talenti a scelta', () => {
  assert.equal(etichettaIndirizzo('Sicurezza'), 'Indirizzo Sicurezza');
  assert.equal(etichettaIndirizzo('Comune'), 'Comune');
  assert.equal(etichettaIndirizzo('TODO(Davide): x'), null);
  assert.equal(etichettaIndirizzo(undefined), null);
});
