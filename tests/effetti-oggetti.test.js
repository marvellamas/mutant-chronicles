// Effetti degli oggetti sui VA (docs/effetti-oggetti.md): generali, situazionali, d'uso specifico.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { inizializzaSessione, massimiSessione, allineaSessione, commutaCondizioneOggetto } from '../src/sessione.js';
import { preparaStampa } from '../src/stampa.js';
import { normalizza } from '../src/character.js';
import { normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, ARCANISTA } from './personaggi.js';

const { dati } = await datiReali();
const sessione = (modifica = {}) => ({ ...inizializzaSessione({ pv: 10, pm: 5, puntiEroe: 10, ferite: 6, caricatori: {} }), ...modifica });
const scheda = (voci, s = null) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: voci }, livelli: [], ...(s ? { sessione: s } : {}) }, dati);
const abil = (sc, nome) => sc.abilita.find((a) => a.nome === nome);

// oggetto personalizzato indossabile con un effetto generale (sempre attivo quando in uso)
const giacca = (stato) => ({
  uid: 'g', rif: null, stato, quantita: 1, note: '',
  personalizzato: { nome: 'Giacca imbottita', tipo: 'armatura', effetti: [{ abilita: 'Atletica', valore: 1, ambito: 'generale', condizione: 'prova' }] },
});
// oggetti di dotazione e del catalogo con effetti situazionali e d'uso specifico
const corredo = (stato = 'in_uso') => ({ uid: 'c', rif: null, stato, quantita: 1, note: '', dotazione_id: 'corredo-sopravvivenza-ambientale', personalizzato: { nome: 'Corredo di sopravvivenza ambientale (Forestale)', tipo: 'altro' } });
const orientamento = { uid: 'o', rif: null, stato: 'in_uso', quantita: 1, note: '', dotazione_id: 'corredo-orientamento', personalizzato: { nome: 'Corredo di orientamento', tipo: 'altro' } };
const valigetta = { uid: 'v', rif: 'corredi_dispositivi:valigetta-investigativa-capitol', stato: 'in_uso', quantita: 1, note: '' };

test('effetto generale: nello zaino non conta, indossato conta, con fonte nella scomposizione; il totale da regole non cambia', () => {
  const base = abil(scheda([]), 'Atletica');
  const zaino = abil(scheda([giacca('zaino')]), 'Atletica');
  assert.equal(zaino.vaEquip, base.totale);
  const indossata = abil(scheda([giacca('indossata')], sessione()), 'Atletica');
  assert.equal(indossata.totale, base.totale);
  assert.equal(indossata.vaEquip, base.totale + 1);
  assert.equal(indossata.effettivo, base.totale + 1);
  assert.deepEqual(indossata.scomposizione.map((x) => [x.etichetta, x.valore, x.fonte]), [
    ['Valore da regole', base.totale, 'regole'], ['Giacca imbottita', 1, 'equipaggiamento'],
  ]);
});

test('effetto situazionale: spento resta «disponibile», acceso entra nel VA effettivo; la stampa resta a riposo', () => {
  const spento = abil(scheda([corredo()], sessione()), 'Sopravvivenza');
  assert.equal(spento.effettivo, spento.totale);
  assert.deepEqual(spento.disponibili.map((e) => [e.oggetto, e.valore]), [['Corredo di sopravvivenza ambientale (Forestale)', 2]]);
  const acceso = scheda([corredo()], sessione({ condizioniOggetti: ['c'] }));
  const s = abil(acceso, 'Sopravvivenza');
  assert.equal(s.effettivo, s.totale + 2);
  assert.deepEqual(s.disponibili, []);
  assert.deepEqual(s.scomposizione.at(-1), { etichetta: 'Corredo di sopravvivenza ambientale (Forestale) (condizione attiva)', valore: 2, fonte: 'oggetto' });
  assert.deepEqual(acceso.oggettiAccesi.map((e) => e.uid), ['c']);
  // nello zaino l'interruttore non ha effetto
  assert.equal(abil(scheda([corredo('zaino')], sessione({ condizioniOggetti: ['c'] })), 'Sopravvivenza').effettivo, s.totale);
  // SS a riposo: nessun effetto situazionale nel VA stampato
  const st = preparaStampa({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [corredo()] }, livelli: [] }, dati);
  const riga = st.fogli.find((f) => f.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === 'Sopravvivenza');
  assert.equal(riga.va, s.totale);
});

test('uso specifico: il VA generale non cambia, accanto il valore per l’uso; un solo bonus degli strumenti (§1.4.1)', () => {
  const sc = scheda([valigetta], sessione());
  const perc = abil(sc, 'Percezione');
  assert.equal(perc.effettivo, perc.totale);
  assert.deepEqual(perc.usiSpecifici.map((u) => [u.uso, u.valore, u.modificatore]), [['tracce', perc.totale + 2, 2]]);
  assert.match(perc.usiSpecifici[0].oggetti[0].condizione, /^\+2 VA a Percezione per esaminare tracce/);
  assert.equal(perc.usiSpecifici[0].oggetti[0].fonte, 'Armamenti §7.13.8');
  // Corredo di orientamento (+1 per orientarsi) con il corredo di sopravvivenza acceso (+2): non si sommano
  const s = abil(scheda([corredo(), orientamento], sessione({ condizioniOggetti: ['c'] })), 'Sopravvivenza');
  const uso = s.usiSpecifici.find((u) => u.uso === 'orientamento');
  assert.equal(s.effettivo, s.totale + 2);
  assert.equal(uso.valore, s.effettivo);
  assert.equal(uso.assorbito, true);
  // spento il corredo di sopravvivenza, per orientarsi vale il +1
  const spento = abil(scheda([corredo(), orientamento], sessione()), 'Sopravvivenza');
  assert.equal(spento.usiSpecifici.find((u) => u.uso === 'orientamento').valore, spento.totale + 1);
});

test('armatura: il −1 al lancio con Potere è un uso specifico «lancio»; nella stampa compare nel foglio Poteri', () => {
  const armatura = { uid: 'a', rif: 'armature:armatura-civile-leggera', stato: 'indossata', quantita: 1, note: '' };
  const sc = scheda([armatura], sessione());
  const potere = abil(sc, 'Potere');
  assert.equal(potere.effettivo, potere.totale);
  assert.deepEqual(potere.usiSpecifici.map((u) => [u.uso, u.modificatore, u.permanente]), [['lancio', -1, true]]);
  const st = preparaStampa({ creazione: { ...ARCANISTA, equipaggiamento: [armatura] }, livelli: [] }, dati);
  const magia = st.fogli.find((f) => f.id === 'poteri');
  const potereArcanista = st.scheda.abilita.find((a) => a.nome === 'Potere');
  assert.deepEqual(magia.dati.lancio, { va: potereArcanista.vaEquip - 1, penalita: -1 });
});

test('sessione: l’interruttore della condizione vale solo per oggetti con effetti situazionali', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [corredo(), valigetta] };
  const m = massimiSessione({ pv: 10, pm: 5 }, creazione, dati);
  assert.deepEqual(m.oggettiSituazionali, ['c']);
  let s = allineaSessione(null, m);
  s = commutaCondizioneOggetto(s, 'c', m);
  assert.deepEqual(s.condizioniOggetti, ['c']);
  assert.deepEqual(allineaSessione({ ...s, condizioniOggetti: ['c', 'v', 'x', 3] }, m).condizioniOggetti, ['c']);
  assert.deepEqual(commutaCondizioneOggetto(s, 'c', m).condizioniOggetti, []);
});

test('oggetti personalizzati: gli effetti si normalizzano; senza stati propri e con effetti ricevono «in uso»', () => {
  const [v] = normalizzaEquipaggiamento([{ uid: 'p', rif: null, stato: null, personalizzato: { nome: 'Lente', tipo: 'altro', effetti: [
    { abilita: 'Percezione', valore: 1, ambito: 'uso_specifico', uso: 'tracce', condizione: 'da sola' }, { abilita: 'Percezione', valore: 0 }, 'x',
  ] } }]);
  assert.deepEqual(v.personalizzato.effetti, [{ abilita: 'Percezione', valore: 1, ambito: 'uso_specifico', uso: 'tracce', condizione: 'da sola' }]);
  const { scelte } = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: [v] }, dati);
  assert.equal(scelte.equipaggiamento[0].stato, 'in_uso');
  assert.equal(abil(scheda(scelte.equipaggiamento, sessione()), 'Percezione').usiSpecifici[0].valore, abil(scheda([]), 'Percezione').totale + 1);
});
