// Utility «Attacca!» corpo a corpo (src/attacco.js → calcolaAttaccoRavvicinato): Manovre del §5.12,
// Carica (§5.6), due armi (§5.7), Magistrale (§1.6), ordine del danno (§5.13), senz'armi (A.22).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcolaAttaccoRavvicinato, vincoliRavvicinato, profiloSenzArmi, senzArmiDisponibile, moltiplicatoreMagistrale,
  descriviManovraRavvicinata, dichiarazioneRavvicinato,
} from '../src/attacco.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

const arma = (modifiche = {}) => ({
  uid: 's', rif: 'armi:spada-leggera', nome: 'Spada leggera', tipo: 'arma_ravvicinata', abilita: 'Armi da mischia',
  va: 10, vaEffettivo: 10, scomposizione: [{ etichetta: 'VA Armi da mischia', valore: 10, fonte: 'regole' }],
  danno: { una_mano: '1d6+1', due_mani: null }, mani: 1, portataQ: 1, manovre: ['Affondo', 'Spazzata'], ...modifiche,
});
const MARTELLO = arma({ uid: 'm', nome: 'Martello', manovre: ['Stordire'], danno: { una_mano: '1d6+2', due_mani: null } });
const PUGNALE = arma({ uid: 'p', nome: 'Pugnale', va: 9, vaEffettivo: 9, manovre: ['Affondo'], danno: { una_mano: '1d4+1', due_mani: null } });
const talentoClasse = (classe, nome) => { const c = dati.classi.classi.find((x) => x.nome === classe); return [...c.talenti_fissi, ...c.talenti_a_scelta].find((t) => t.nome === nome); };
const pg = ({ liberi = [], classe = [], nomeClasse = 'Soldato', armi = [arma()], stati = [] } = {}) => ({
  scheda: {
    talentiLiberi: liberi.map((id) => ({ id })),
    classi: [{ nome: nomeClasse, talenti: classe }],
    abilita: [{ nome: 'Corpo a corpo', totale: 8, effettivo: 8, scomposizione: [{ etichetta: 'Valore da regole', valore: 8, fonte: 'regole' }] }],
    equipaggiamento: { armi },
    movimento: { passo: 6, corsa: 12, scatto: 18 },
    azioni: { principali: 1, movimento: 1 },
  },
  sessione: { statiAttivi: stati },
});
const attacca = (p, a, d) => calcolaAttaccoRavvicinato(p, a, d, dati);

test('Attacco normale: VA dell’arma, danno dell’arma, 1 AzP, Difese del bersaglio', () => {
  const r = attacca(pg(), arma(), {});
  assert.equal(r.impossibile, null);
  assert.equal(r.va_finale, 10);
  assert.equal(r.danno.testo, '1d6+1');
  assert.equal(r.danno.testo_magistrale, '(1d6+1) ×2');
  assert.equal(r.azioni_principali, 1);
  assert.equal(r.prova.tipo, 'per_colpire');
});

test('Affondo con arma compatibile (−4, +1 danno, Sanguinamento 1; Migliorato +2 e Sanguinamento 2) e non compatibile', () => {
  const r = attacca(pg(), arma(), { manovra: 'affondo' });
  assert.equal(r.impossibile, null);
  assert.equal(r.va_finale, 6);
  assert.equal(r.danno.formula, '1d6+2');
  assert.deepEqual(r.dopo_armatura.map((x) => x.etichetta), ['Sanguinamento 1']);
  const mig = attacca(pg({ liberi: ['affondo-migliorato'] }), arma(), { manovra: 'affondo' });
  assert.equal(mig.danno.formula, '1d6+3');
  assert.deepEqual(mig.dopo_armatura.map((x) => x.etichetta), ['Sanguinamento 2']);
  // Martello: solo Stordire fra le Manovre compatibili (Armamenti §7.1.7)
  const no = attacca(pg({ armi: [MARTELLO] }), MARTELLO, { manovra: 'affondo' });
  assert.match(no.impossibile.motivo, /Affondo non ammessa: l’arma non ha «Affondo»/);
  assert.equal(vincoliRavvicinato(pg({ armi: [MARTELLO] }), MARTELLO, {}, dati).manovre.affondo.nascosta, true);
});

test('Spazzata su 2 e 3 bersagli (−4, −6); Spazzata Migliorata riduce di 2', () => {
  assert.equal(attacca(pg(), arma(), { manovra: 'spazzata', bersagli: 2 }).va_finale, 6);
  assert.equal(attacca(pg(), arma(), { manovra: 'spazzata', bersagli: 3 }).va_finale, 4);
  assert.equal(attacca(pg({ liberi: ['spazzata-migliorata'] }), arma(), { manovra: 'spazzata', bersagli: 2 }).va_finale, 8);
  assert.equal(attacca(pg({ liberi: ['spazzata-migliorata'] }), arma(), { manovra: 'spazzata', bersagli: 3 }).va_finale, 6);
});

test('Colpo Mirato non si combina con Affondo (§5.12: le manovre offensive non si combinano)', () => {
  const r = attacca(pg(), arma(), { manovra: ['mirato', 'affondo'] });
  assert.match(r.impossibile.motivo, /Le manovre offensive non si combinano fra loro.*Colpo Mirato e Affondo/);
  // da solo: 2 AzP, +2/+2; Migliorato +4/+4
  const m = attacca(pg(), arma(), { manovra: 'mirato' });
  assert.deepEqual([m.va_finale, m.danno.formula, m.azioni_principali], [12, '1d6+3', 2]);
  assert.deepEqual([attacca(pg({ liberi: ['colpo-mirato-migliorato'] }), arma(), { manovra: 'mirato' }).va_finale], [14]);
  // Corsa o Scatto interrompono la preparazione
  assert.match(attacca(pg(), arma(), { manovra: 'mirato', movimento: 'corsa' }).impossibile.motivo, /Corsa o Scatto/);
});

test('Carica ×2 → ×3 con il Magistrale; Carica Migliorata ×3 resta ×3; Carica Brutale +2 prima del moltiplicatore', () => {
  const c = attacca(pg(), arma(), { carica: true, percorsoQ: 5 });
  assert.equal(c.impossibile, null);
  assert.equal(c.va_finale, 8);
  assert.deepEqual([c.danno.moltiplicatore, c.danno.moltiplicatore_magistrale, c.danno.testo], [2, 3, '(1d6+1) ×2']);
  assert.equal(c.azioni_movimento, 1);
  assert.equal(attacca(pg(), arma(), { carica: true, percorsoQ: 9 }).va_finale, 6);
  const mig = attacca(pg({ liberi: ['carica-migliorata'] }), arma(), { carica: true, percorsoQ: 5 });
  assert.deepEqual([mig.danno.moltiplicatore, mig.danno.moltiplicatore_magistrale], [3, 3]);
  const brutale = attacca(pg({ classe: [talentoClasse('Assaltatore', 'Carica Brutale')] }), arma(), { carica: true, percorsoQ: 5 });
  assert.equal(brutale.danno.testo, '(1d6+3) ×2');
  // la Carica permette un solo attacco normale; percorso minimo 3 Q
  assert.match(attacca(pg(), arma(), { carica: true, percorsoQ: 5, manovra: 'affondo' }).impossibile.motivo, /Carica permette un solo attacco normale/);
  assert.match(attacca(pg(), arma(), { carica: true, percorsoQ: 2 }).impossibile.motivo, /almeno 3 Q/);
  assert.deepEqual([1, 2, 3].map((x) => moltiplicatoreMagistrale(x, dati)), [2, 3, 3]);
});

test('Combattere con due armi: −4 a ciascun attacco con e senza Ambidestro; Schermidore −2', () => {
  const armi = [arma(), PUGNALE];
  const r = attacca(pg({ armi }), arma(), { dueArmi: true });
  assert.equal(r.impossibile, null);
  assert.deepEqual(r.attacchi.map((x) => [x.etichetta, x.va]), [['Spada leggera', 6], ['Pugnale', 5]]);
  const amb = attacca(pg({ armi, liberi: ['ambidestro'] }), arma(), { dueArmi: true });
  assert.deepEqual(amb.attacchi.map((x) => x.va), [6, 5]);
  assert.ok(amb.promemoria.some((p) => /Ambidestro non modifica/.test(p)));
  assert.deepEqual(attacca(pg({ armi, liberi: ['schermidore'] }), arma(), { dueArmi: true }).attacchi.map((x) => x.va), [8, 7]);
  // senza seconda arma non si può; con due armi niente altre manovre offensive
  assert.match(attacca(pg(), arma(), { dueArmi: true }).impossibile.motivo, /seconda arma/);
  assert.match(attacca(pg({ armi }), arma(), { dueArmi: true, manovra: 'affondo' }).impossibile.motivo, /non si combina/);
  // mano non dominante fuori dalle due armi: −4, Ambidestro lo elimina (A.23)
  assert.equal(attacca(pg(), arma(), { manoNonDominante: true }).va_finale, 6);
  assert.equal(attacca(pg({ liberi: ['ambidestro'] }), arma(), { manoNonDominante: true }).va_finale, 10);
});

test('Stordire con arma non compatibile → non ammesso; con il Martello −6 e PS Tempra', () => {
  const no = attacca(pg(), arma(), { manovra: 'stordire' });
  assert.match(no.impossibile.motivo, /Stordire non ammessa/);
  const si = attacca(pg({ armi: [MARTELLO] }), MARTELLO, { manovra: 'stordire' });
  assert.equal(si.impossibile, null);
  assert.equal(si.va_finale, 4);
  assert.deepEqual(si.dopo_armatura.map((x) => x.etichetta), ['PS Tempra']);
  assert.equal(attacca(pg({ armi: [MARTELLO], liberi: ['stordire-migliorato'] }), MARTELLO, { manovra: 'stordire' }).va_finale, 6);
});

test('Senz’armi: danno base 1d4 (E&L 12, A.22); Arti Marziali 1d6 e +1 VA con le Migliorate; Stordire ammesso', () => {
  const p = pg({ armi: [] });
  assert.equal(senzArmiDisponibile(p.scheda, dati), true);
  const nudo = profiloSenzArmi(p.scheda, dati);
  const r = attacca(p, nudo, {});
  assert.equal(r.va_finale, 8);
  // scheda di prova senza Caratteristiche: nessun bonus (§5.13)
  assert.deepEqual([r.danno.testo, r.avvisi.length, nudo.bonusCaratteristica], ['1d4', 0, null]);
  const m = pg({ armi: [], liberi: ['arti-marziali', 'arti-marziali-migliorate'] });
  const rm = attacca(m, profiloSenzArmi(m.scheda, dati), {});
  assert.deepEqual([rm.va_finale, rm.danno.testo, rm.avvisi.length], [9, '1d6', 0]);
  assert.equal(attacca(p, nudo, { manovra: 'stordire' }).impossibile, null);
  // Immobilizzare: Prova contrapposta Corpo a corpo, nessun danno; con un'arma a due mani serve una mano libera
  const imm = attacca(p, nudo, { manovra: 'immobilizzare' });
  assert.deepEqual([imm.prova.tipo, imm.danno], ['contrapposta', null]);
  assert.match(attacca(pg(), arma({ mani: 2 }), { manovra: 'immobilizzare' }).impossibile.motivo, /mano libera/);
});

test('bersaglio A Terra +2; attaccante A Terra −4 se non già nello Stato; oltre la portata non si attacca', () => {
  assert.equal(attacca(pg(), arma(), { bersaglio: { aTerra: true } }).va_finale, 12);
  assert.equal(attacca(pg(), arma(), { aTerra: true }).va_finale, 6);
  assert.equal(attacca(pg({ stati: ['a-terra'] }), arma(), { aTerra: true }).va_finale, 10); // già nel VA effettivo dell'arma
  assert.match(attacca(pg(), arma(), { bersaglio: { distanza: 2 } }).impossibile.motivo, /oltre la portata/);
  assert.equal(dichiarazioneRavvicinato({}).manovra[0], 'normale');
});

test('riga compatta delle Manovre per il pannello', () => {
  const s = pg().scheda;
  assert.equal(descriviManovraRavvicinata('affondo', s, dati).riga, '−4 VA · +1 danno · Sanguinamento 1');
  assert.equal(descriviManovraRavvicinata('spazzata', s, dati).riga, '−4 VA contro 2, −6 VA contro 3');
  assert.equal(descriviManovraRavvicinata('stordire', s, dati).riga, '−6 VA · PS Tempra');
  assert.equal(descriviManovraRavvicinata('affondo', pg({ liberi: ['affondo-migliorato'] }).scheda, dati).riga, '−4 VA · +2 danno · Sanguinamento 2');
});
