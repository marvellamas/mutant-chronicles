// Provenienza dei valori calcolati (src/provenienza.js): il motore dà per ogni valore la lista dei
// contributi { fonte, valore, nota? } accanto al totale; SD e SS la stampano. La somma delle righe
// che contano è il totale mostrato.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { calcolaAR } from '../src/protezione.js';
import { inizializzaSessione, massimiSessione } from '../src/sessione.js';
import { sommaRighe, righeRegoleAbilita } from '../src/provenienza.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const creazione = (equipaggiamento) => ({ ...MISHIMA_AGENTE, equipaggiamento });
const alTavolo = (c, modifica = {}) => {
  const m = massimiSessione(calcolaScheda({ creazione: c, livelli: [] }, dati), c, dati);
  return calcolaScheda({ creazione: c, livelli: [], sessione: { ...inizializzaSessione(m), ...modifica } }, dati);
};
const righe = (p) => p.righe.map((r) => [r.fonte, r.valore, !!r.escluso]);

// Armatura Vulcano (AR 4, di cui 1 magica, §7.17) + Rinforzo Leggero +1 (§7.11.2), elmetto standard
// (0, §7.21.1), Scudo delle Guardie Sacre (Artefatto, §7.4.10) e Corazza Potenziata (+1 magica, A.48)
const CORREDO = [
  voce('arm', 'armature_corporative:armatura-vulcano', 'indossata'),
  voce('kit', 'rinforzi:rinforzo-leggero', 'in_uso', { montato_su: 'arm' }),
  voce('elm', 'elmetti:elmetto-standard', 'indossata'),
  voce('gs', 'scudi:scudo-delle-guardie-sacre', 'imbracciato'),
];

test('provenienza dell’AR: armatura + rinforzo + elmetto + scudo + parte magica + Corazza Potenziata, somma = totale', () => {
  const eq = calcolaScheda({ creazione: creazione(CORREDO), livelli: [] }, dati).equipaggiamento;
  const scudo = eq.protezioni.find((p) => p.uid === 'gs');
  const ar = calcolaAR(eq, dati, { talenti: ['Corazza Potenziata'] });
  const [tot, mag] = ar.valori;
  assert.equal(tot.valore, ar.totale);
  assert.equal(sommaRighe(tot.provenienza.righe), tot.valore);
  assert.equal(tot.provenienza.totale, tot.valore);
  assert.deepEqual(righe(tot.provenienza), [
    ['Armatura Vulcano', 3, false],
    ['Rinforzo Leggero', 1, false],
    ['magica, Armatura Vulcano', 1, false],
    ['Elmetto standard (ricambio)', 0, false],
    ['Scudo delle Guardie Sacre', scudo.ar.totale - scudo.ar.magica, false],
    ...(scudo.ar.magica ? [['magica, Scudo delle Guardie Sacre', scudo.ar.magica, false]] : []),
    ['Corazza Potenziata', 1, false],
  ]);
  assert.equal(ar.totale, 5 + scudo.ar.totale + 1);
  assert.match(tot.provenienza.righe.find((r) => r.fonte === 'Elmetto standard (ricambio)').nota, /§7\.21\.1/);
  // contro Etereo: solo le parti magiche
  assert.equal(sommaRighe(mag.provenienza.righe), mag.valore);
  assert.deepEqual(mag.provenienza.righe.map((r) => r.fonte), ['magica, Armatura Vulcano', ...(scudo.ar.magica ? ['magica, Scudo delle Guardie Sacre'] : []), 'Corazza Potenziata']);
});

test('provenienza dell’AR: rinforzo Rotto barrato, «Rotto: non conta», fuori dalla somma', () => {
  const eq = calcolaScheda({ creazione: creazione(CORREDO), livelli: [] }, dati).equipaggiamento;
  const ar = calcolaAR(eq, dati, { talenti: ['Corazza Potenziata'], rotti: new Set(['kit']) });
  const kit = ar.valori[0].provenienza.righe.find((r) => r.fonte === 'Rinforzo Leggero');
  assert.deepEqual([kit.valore, kit.escluso, kit.barrato, kit.nota], [1, true, true, 'Rotto: non conta']);
  assert.equal(sommaRighe(ar.valori[0].provenienza.righe), ar.totale);
});

test('provenienza dell’AR: Aura di Resistenza nel totale, Pelle di Rinoceronte «solo ravvicinato» nel suo valore', () => {
  const eq = { protezioni: [{ uid: 'a', nome: 'Giubbotto', tipo: 'armatura', ar: { totale: 2, magica: 0 } }], effettiOggetti: [] };
  const ar = calcolaAR(eq, dati, { tecniche: ['aura-di-resistenza', 'pelle-di-rinoceronte'], accesi: new Set(['tecnica:aura-di-resistenza', 'tecnica:pelle-di-rinoceronte']) });
  const [tot, , rav] = ar.valori;
  assert.equal(tot.valore, 3);
  assert.equal(sommaRighe(tot.provenienza.righe), 3);
  const pelle = tot.provenienza.righe.find((r) => r.fonte === 'Pelle di Rinoceronte');
  assert.deepEqual([pelle.escluso, pelle.nota], [true, 'solo ravvicinato']);
  assert.equal(rav.etichetta, 'contro ravvicinato');
  assert.equal(sommaRighe(rav.provenienza.righe), rav.valore);
  assert.ok(rav.provenienza.righe.some((r) => r.fonte === 'Pelle di Rinoceronte' && !r.escluso && r.nota === 'solo ravvicinato'));
});

test('provenienza delle Difese: voci da regole, Stato attivo (Rallentato) e arma Difensiva (solo nella Parata)', () => {
  const c = creazione([voce('t', 'armi:tonfa', 'impugnata')]);
  const s = alTavolo(c, { statiAttivi: ['rallentato'] });
  const d = s.abilita.find((a) => a.nome === 'Difese');
  // somma delle righe che contano = VA effettivo mostrato
  assert.equal(sommaRighe(d.provenienza.righe), d.effettivo);
  assert.equal(d.provenienza.totale, d.effettivo);
  // le voci da regole sono quelle che valoreAbilita somma (Caratteristica, Addestramento…)
  const reg = righeRegoleAbilita(d, s);
  assert.equal(sommaRighe(reg), d.totale);
  assert.equal(reg[0].fonte, `Mod ${d.caratteristica}`);
  assert.match(reg[1].fonte, /^Addestramento /);
  const stato = d.provenienza.righe.find((r) => r.fonte === 'Rallentato');
  assert.deepEqual([stato.valore, stato.nota], [-2, 'Stato (§5.18)']);
  const difensiva = d.provenienza.righe.find((r) => r.fonte === 'Difensiva (Tonfa)');
  assert.deepEqual([difensiva.valore, difensiva.escluso], [2, true]);
  // la Parata con il tonfa: Difese (con il dettaglio) + Difensiva + Stato
  const w = s.equipaggiamento.armi.find((x) => x.uid === 't');
  assert.equal(sommaRighe(w.parata.provenienza.righe), w.parata.vaEffettivo);
  const base = w.parata.provenienza.righe[0];
  assert.equal(sommaRighe(base.dettaglio), base.valore);
  assert.ok(w.parata.provenienza.righe.some((r) => r.fonte === 'Difensiva (Tonfa)' && !r.escluso && r.valore === 2));
  assert.ok(w.parata.provenienza.righe.some((r) => r.fonte === 'Rallentato' && r.valore === -2));
});

test('provenienza di Salvezze, Iniziativa, Movimento, VA e danno delle armi: le righe tornano col totale', () => {
  const c = creazione([voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata'), voce('arm', 'armature:armatura-civile-leggera', 'indossata')]);
  const s = alTavolo(c, { statiAttivi: ['terrorizzato'] });
  for (const x of Object.values(s.salvezze)) assert.equal(sommaRighe(x.provenienza.righe), x.effettivo, x.nome);
  // Mishima Avventuriero Agente: Tempra 10 (§2.1), −4 da Terrorizzato al tavolo
  assert.equal(s.salvezze.tempra.provenienza.righe[0].valore, 8);
  assert.ok(s.salvezze.tempra.provenienza.righe.some((r) => r.fonte === 'Terrorizzato' && r.valore === -4));
  assert.equal(sommaRighe(s.tavolo.iniziativa.provenienza.righe), s.tavolo.iniziativa.effettivo);
  for (const m of ['passo', 'corsa', 'scatto']) {
    const v = s.tavolo.movimento[m];
    if (v.effettivo !== null) assert.equal(sommaRighe(v.provenienza.righe), v.effettivo, m);
  }
  for (const a of s.abilita) assert.equal(sommaRighe(a.provenienza.righe), a.effettivo, a.nome);
  // armatura senza penalità di Agilità: riga «+0» nelle Difese
  const d = s.abilita.find((a) => a.nome === 'Difese');
  assert.ok(d.provenienza.righe.some((r) => r.fonte === 'Armatura civile leggera' && r.valore === 0));
  const w = s.equipaggiamento.armi.find((x) => x.uid === 'p');
  assert.equal(sommaRighe(w.provenienza.righe), w.vaEffettivo);
  assert.equal(sommaRighe(w.provenienza.righe[0].dettaglio), w.provenienza.righe[0].valore);
  // danno: dado dell'arma, poi il bonus di Caratteristica (§5.13); totale = il danno mostrato
  assert.equal(w.provenienzaDanno.totale, w.danno.una_mano);
  assert.equal(w.provenienzaDanno.righe[0].fonte, 'Danno dell’arma');
  assert.match(w.provenienzaDanno.righe[1].fonte, /^DES \d+$/);
});

test('«Attacca!»: il VA finale è la somma delle righe della provenienza (distanza, corpo a corpo, senz’armi)', async () => {
  const { calcolaAttaccoDistanza, calcolaAttaccoRavvicinato, profiloSenzArmi } = await import('../src/attacco.js');
  const c = creazione([voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata'), voce('t', 'armi:tonfa', 'impugnata')]);
  const s = alTavolo(c, { statiAttivi: ['rallentato'] });
  const personaggio = { scheda: s, sessione: s.sessione ?? { statiAttivi: ['rallentato'] } };
  const p = s.equipaggiamento.armi.find((x) => x.uid === 'p');
  const t = s.equipaggiamento.armi.find((x) => x.uid === 't');
  const dist = calcolaAttaccoDistanza(personaggio, p, { distanza: 40, movimento: 'passo', bersaglio: { movimento: 'corsa', copertura: 'leggera' } }, dati);
  assert.equal(sommaRighe(dist.provenienza.righe), dist.va_finale);
  assert.equal(dist.provenienza.totale, dist.va_finale);
  // la base è la provenienza dell'arma nella SD (con il VA dell'Abilità in dettaglio), sotto la dichiarazione
  assert.deepEqual(dist.provenienza.righe.slice(0, p.provenienza.righe.length), p.provenienza.righe);
  assert.ok(dist.provenienza.righe.some((r) => r.categoria === 'copertura' && /§5\.8/.test(r.nota)));
  for (const d of [{}, { manovra: 'mirato' }, { carica: true, distanzaCarica: 6 }, { manovra: 'immobilizzare' }]) {
    const r = calcolaAttaccoRavvicinato(personaggio, t, d, dati);
    assert.equal(sommaRighe(r.provenienza.righe), r.va_finale, JSON.stringify(d));
  }
  // Immobilizzare: Corpo a corpo in una riga, con la sua scomposizione in dettaglio
  const imm = calcolaAttaccoRavvicinato(personaggio, t, { manovra: 'immobilizzare' }, dati);
  assert.equal(imm.provenienza.righe[0].fonte, 'VA Corpo a corpo');
  assert.equal(sommaRighe(imm.provenienza.righe[0].dettaglio), imm.provenienza.righe[0].valore);
  // senz'armi: VA e danno con la provenienza (riquadro della SD e utility)
  const nudo = profiloSenzArmi(s, dati);
  assert.equal(sommaRighe(nudo.provenienza.righe), nudo.vaEffettivo);
  const r = calcolaAttaccoRavvicinato(personaggio, nudo, {}, dati);
  assert.equal(sommaRighe(r.provenienza.righe), r.va_finale);
  assert.equal(nudo.provenienzaDanno.totale, nudo.danno.una_mano);
  assert.deepEqual(nudo.provenienzaDanno.righe.map((x) => x.fonte), ['Danno senz’armi', `FOR ${s.caratteristiche.FOR.valore}`]);
});
