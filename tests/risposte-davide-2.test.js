// Risposte di Davide del 28/09/2026, seconda serie (Doc «per-davide.md», sezione 7): A.52, A.51,
// A.43–A.50, A.13.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo } from '../src/equipaggiamento.js';
import { massimiSessione, inizializzaSessione, variaIntegrita } from '../src/sessione.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, LIVELLI_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
/** Scheda al tavolo con i PI indicati portati a 0 ({ uid: true }). */
const alTavolo = (equipaggiamento, aZero = {}, livelli = []) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const aRiposo = calcolaScheda({ creazione, livelli }, dati);
  const m = massimiSessione(aRiposo, creazione, dati);
  let s = inizializzaSessione(m);
  for (const uid of Object.keys(aZero)) s = variaIntegrita(s, uid, -999, m);
  return { aRiposo, tavolo: calcolaScheda({ creazione, livelli, sessione: s }, dati), sessione: s, m };
};

// --- A.13 -----------------------------------------------------------------------------------

test('A.13: Rainy Dayer, Specializzazione Carabine sul tiro; la copertura aperta non prende il +1', () => {
  const r = catalogo(dati).perRif.get('corredi_dispositivi:rainy-dayer');
  assert.deepEqual([r.specializzazione, r.abilita, r.mani, r.gittata_q], ['specializzazione-carabine', 'Armi medie', 2, 30]);
  const equip = [voce('r', 'corredi_dispositivi:rainy-dayer', 'impugnata')];
  const senza = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [LIVELLI_AGENTE[0]] }, dati);
  const con = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [LIVELLI_AGENTE[0], { livello: 3, talentoLibero: { id: 'specializzazione-carabine' } }] }, dati);
  const a = (s) => s.equipaggiamento.armi.find((x) => x.uid === 'r');
  assert.equal(a(con).va - a(senza).va, 1);
  assert.equal(a(con).bonusDanno, 1);
  assert.deepEqual(r.scudo_integrato.ar, { totale: 1, magica: 0 }); // invariata
  // nessuna arma del catalogo resta senza Specializzazione
  const senzaSpec = catalogo(dati).oggetti.filter((o) => (o.tipo === 'arma_ravvicinata' || o.tipo === 'arma_distanza') && !o.specializzazione).map((o) => o.nome);
  assert.deepEqual(senzaSpec, []);
});

// --- A.44, A.45 -----------------------------------------------------------------------------

test('A.44: armatura Rotta indossata, niente AR ma le penalità restano; scudo Rotto segnato come arma Rotta', () => {
  const { aRiposo, tavolo } = alTavolo([voce('a', 'armature:armatura-civile-media', 'indossata'), voce('s', 'scudi:scudo-punisher', 'imbracciato')], { a: true, s: true });
  assert.equal(tavolo.equipaggiamento.arEffettiva.totale, 0);
  // le penalità dell'armatura indossata restano (§7.11.1)
  assert.equal(tavolo.equipaggiamento.equipAbilita.Atletica, aRiposo.equipaggiamento.equipAbilita.Atletica);
  assert.ok(aRiposo.equipaggiamento.equipAbilita.Atletica < 0);
  assert.equal(tavolo.equipaggiamento.armi.find((w) => w.uid === 's:attacco').rotta, true);
});

test('A.45: civile leggera + rinforzo pesante: 3/5/Media → rinforzo a 0 PI 1/5/Media → rinforzo tolto 1/3/Leggera', () => {
  const arm = voce('a', 'armature:armatura-civile-leggera', 'indossata');
  const kit = voce('k', 'rinforzi:rinforzo-pesante', 'in_uso', { montato_su: 'a' });
  const integro = alTavolo([arm, kit]);
  const p1 = integro.tavolo.equipaggiamento.protezioni[0];
  assert.deepEqual([integro.tavolo.equipaggiamento.arEffettiva.totale, p1.forRichiesta, p1.categoria], [3, 5, 'Media']);
  const rotto = alTavolo([arm, kit], { k: true });
  const p2 = rotto.tavolo.equipaggiamento.protezioni[0];
  assert.deepEqual([rotto.tavolo.equipaggiamento.arEffettiva.totale, p2.forRichiesta, p2.categoria], [1, 5, 'Media']);
  const tolto = alTavolo([arm, { ...kit, stato: 'zaino', montato_su: undefined }]);
  const p3 = tolto.tavolo.equipaggiamento.protezioni[0];
  assert.deepEqual([tolto.tavolo.equipaggiamento.arEffettiva.totale, p3.forRichiesta, p3.categoria], [1, 3, 'Leggera']);
});
