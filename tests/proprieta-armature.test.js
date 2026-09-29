// Lotto proprietà delle armature corporative (docs/proprieta-armature.md): effetti tipizzati nei
// valori effettivi, promemoria per le proprietà testuali, Colpo assistito in «Attacca!».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { inizializzaSessione } from '../src/sessione.js';
import { calcolaAttaccoRavvicinato } from '../src/attacco.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato) => ({ uid, rif, stato, quantita: 1, note: '' });
const sessione = (extra = {}) => ({ ...inizializzaSessione({ pv: 10, pm: 5, puntiEroe: 10, ferite: 6, caricatori: {} }), ...extra });
const scheda = (equipaggiamento, s = sessione()) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento }, livelli: [], sessione: s }, dati);
const furt = (s) => s.abilita.find((a) => a.nome === 'Furtività');

test('Divisa operativa ASA: Imbottita 1 generale (Contromisura) e Mimetismo 1 situazionale (interruttore al tavolo)', () => {
  const ASA = voce('a', 'armature_corporative:divisa-operativa-asa', 'indossata');
  const spenta = scheda([ASA]);
  const eff = spenta.equipaggiamento.effettiOggetti.filter((e) => e.uid === 'a' && e.proprieta); // senza il −1 al lancio della categoria
  assert.deepEqual(eff.map((e) => [e.tipo ?? 'va', e.ambito, e.proprieta]), [['va', 'situazionale', 'Mimetismo 1'], ['contromisura', 'generale', 'Imbottita 1']]);
  const imb = eff.find((e) => e.tipo === 'contromisura');
  assert.deepEqual([imb.effetto, imb.valore], ['Concussivo', 1]);
  // Mimetismo: spento resta «disponibile», acceso entra nel VA effettivo di Furtività
  assert.ok(furt(spenta).disponibili.some((e) => e.oggetto === 'Divisa operativa ASA'));
  const accesa = scheda([ASA], sessione({ condizioniOggetti: ['a'] }));
  assert.equal(furt(accesa).effettivo, furt(spenta).effettivo + 1);
  // nella scheda delle protezioni: effetti tradotti, nessun promemoria
  const p = accesa.equipaggiamento.protezioni.find((x) => x.uid === 'a');
  assert.equal(p.effetti.filter((e) => e.proprieta).length, 2);
  assert.deepEqual(p.promemoria, []);
});

test('proprietà testuali come promemoria; quelle già nelle penalità del modello non si ripetono', () => {
  const d = scheda([voce('a', 'armature_corporative:divisa-d-ordinanza-asa', 'indossata')]).equipaggiamento.protezioni[0];
  assert.deepEqual(d.promemoria, ['Discreta']);
  const b = scheda([voce('a', 'armature_corporative:armatura-d-assalto-blitzer', 'indossata')]).equipaggiamento.protezioni[0];
  assert.ok(!b.promemoria.some((x) => /Articolazione|Assetto/.test(x)));
});

test('Colpo assistito 1 (Felis): +1 al danno delle armi ravvicinate e in «Attacca!»; Termoregolazione e Stabile per un uso', () => {
  const SPADA = voce('s', 'armi:spada-leggera', 'impugnata');
  const senza = scheda([SPADA]);
  const con = scheda([SPADA, voce('a', 'armature_corporative:mk-iv-felis-pattern-dei-golden-lions', 'indossata')]);
  const arma = (s) => s.equipaggiamento.armi.find((a) => a.uid === 's');
  // danno della spada con il +1 di Caratteristica (§5.13); Colpo assistito aggiunge +1
  assert.equal(arma(senza).danno.una_mano, '1d6+2');
  assert.equal(arma(con).danno.una_mano, '1d6+3');
  const r = calcolaAttaccoRavvicinato({ scheda: con, sessione: sessione() }, arma(con), {}, dati);
  assert.equal(r.danno.testo, '1d6+3');
  const tempra = con.equipaggiamento.effettiOggetti.find((e) => e.tipo === 'salvezza');
  assert.deepEqual([tempra.salvezza, tempra.valore, tempra.uso], ['tempra', 2, 'contro caldo e freddo ambientali']);
});

test('censimento: ogni proprietà delle armature corporative è tradotta, testuale o già gestita', () => {
  const gestite = new Set(dati.equipaggiamento.file.armature.proprieta_gestite);
  const testuali = new Set(['Discreta', 'Tenuta subacquea', 'Imbracatura da artigliere', 'Assetto anfibio']);
  for (const o of dati.equipaggiamento.file.armature_corporative.oggetti) {
    const tradotte = new Set((o.effetti ?? []).map((e) => e.proprieta));
    for (const p of o.proprieta) {
      const b = p.nome.replace(/\s+\d+$/, '');
      assert.ok(tradotte.has(p.nome) || gestite.has(b) || testuali.has(b), `${o.nome}: ${p.nome}`);
    }
  }
});
