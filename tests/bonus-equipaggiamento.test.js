// I cinque bonus dell'equipaggiamento portati nei dati il 05/10/2026 (tools/lotti/lotto_bonus_equipaggiamento.mjs,
// docs/censimento-impianti.md, «Stesso rischio altrove»): Martello Spaccateste (Stordire +1), IAS3200 (Pilotare in volo),
// IAS3100 (SIN 2 con l'Interfaccia neurale), APE Capitol (Schivare con Pilotare −1), Utensile multiuso (Improvvisato −2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { preparaTab, preparaStampa } from '../src/stampa.js';
import { calcolaAttaccoRavvicinato, effettiSituazionaliAttacco } from '../src/attacco.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato) => ({ uid, rif, stato, quantita: 1, note: '' });
const pg = (equipaggiamento) => ({ creazione: { ...MISHIMA_AGENTE, equipaggiamento }, livelli: [] });
const abilita = (p, nome) => preparaTab(p, dati).tab.find((t) => t.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === nome);
const uso = (a, nome) => a.usiSpecifici.find((u) => u.uso === nome);
const nota = (p, nome) => preparaStampa(p, dati).fogli.find((f) => f.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === nome).condizionali;

test('Martello Spaccateste a due mani: +1 VA alla Manovra Stordire, da sé in «Attacca!», solo con quella Manovra', () => {
  const p = pg([voce('m', 'armi_corporative:martello-spaccateste-a-due-mani', 'impugnata')]);
  const s = calcolaScheda(p, dati);
  const arma = s.equipaggiamento.armi.find((w) => w.uid === 'm');
  const stordire = calcolaAttaccoRavvicinato({ scheda: s, sessione: null }, arma, { manovra: ['stordire'] }, dati);
  const normale = calcolaAttaccoRavvicinato({ scheda: s, sessione: null }, arma, {}, dati);
  assert.ok(stordire.provenienza.righe.some((r) => /Martello Spaccateste a due mani \(Stordire \+1\)/.test(r.fonte) && r.valore === 1));
  assert.equal(normale.provenienza.righe.some((r) => /Stordire \+1/.test(r.fonte)), false);
  // −6 della Manovra (§5.12) +1 del Martello: −5, come dice la proprietà
  const delta = (r) => r.va_finale - arma.va;
  assert.equal(delta(stordire), dati.regole.attacco_ravvicinato.manovre.stordire.va + 1);
  assert.equal(effettiSituazionaliAttacco(s, 'ravvicinati').length, 0, 'nessuna casella: vale da sé con la Manovra');
});

test('IAS3200 Imbracatura antigravità: Pilotare −2 in Corsa e −4 in Scatto in volo, valori d’uso con la nota in stampa', () => {
  const p = pg([voce('i', 'corredi_dispositivi:ias3200-imbracatura-antigravita', 'in_uso')]);
  const a = abilita(p, 'Pilotare');
  assert.equal(uso(a, 'volo in Corsa').valore, a.effettivo - 2);
  assert.equal(uso(a, 'volo in Scatto').valore, a.effettivo - 4);
  assert.deepEqual(nota(p, 'Pilotare').map((c) => [c.valore, c.se]), [[-2, 'in volo, in Corsa'], [-4, 'in volo, in Scatto']]);
  assert.equal(abilita(pg([voce('i', 'corredi_dispositivi:ias3200-imbracatura-antigravita', 'zaino')]), 'Pilotare').usiSpecifici.length, 0, 'nello zaino non vale');
});

test('IAS3100 Generatore Blink: SIN 2 a Pilotare per Power Blink, solo con l’Interfaccia neurale installata', () => {
  const senza = abilita(pg([voce('b', 'corredi_dispositivi:ias3100-generatore-blink', 'in_uso')]), 'Pilotare');
  assert.equal(uso(senza, 'Power Blink'), undefined);
  const con = abilita(pg([voce('b', 'corredi_dispositivi:ias3100-generatore-blink', 'in_uso'), voce('n', 'impianti:interfaccia-neurale-cybertronic', 'installato')]), 'Pilotare');
  assert.equal(uso(con, 'Power Blink').valore, con.effettivo + 2);
});

test('APE Capitol: Schivare usa Pilotare −1 VA', () => {
  const a = abilita(pg([voce('e', 'corredi_dispositivi:ape-capitol', 'indossata')]), 'Pilotare');
  assert.equal(uso(a, 'Schivare con l’APE').valore, a.effettivo - 1);
});

test('Utensile multiuso: −2 come strumento Improvvisato nei lavori specialistici, valore d’uso di Tecnologia', () => {
  const p = pg([voce('u', 'dotazioni_personali:utensile-multiuso', 'in_uso')]);
  const a = abilita(p, 'Tecnologia');
  assert.equal(uso(a, 'lavori specialistici').valore, a.effettivo - 2);
  assert.equal(a.effettivo, a.totale, 'il VA generale non cambia');
  assert.deepEqual(nota(p, 'Tecnologia').map((c) => [c.valore, c.se]), [[-2, 'come strumento Improvvisato']]);
});
