import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 203 (15/11/2026), parte D: le creature senza Ferite al tavolo (Mostri 0.69 §4.2, §4.2.1).
//
// **Il controllo che deve restare verde sempre: il confine col Morente.** Il Morente del lotto 193 vale per i
// personaggi e per chi ha il tracciato delle Ferite. Una creatura del Bestiario a 0 PV **non entra in Morente e
// non ha contatore**: se la plancia gliene aprisse uno, al tavolo qualcuno le conterebbe i Round di sopravvivenza
// e aspetterebbe una stabilizzazione che non esiste.
//
// E il secondo: **il +30% non tocca danni e cure.** Sta nei PV massimi stampati e in nient'altro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sistemaSalute, usaFerite, senzaFerite, puoEntrareInMorente, statoAZeroPv, rigaSistemaSalute,
  feritaDiretta, curaFerita, tornaAttiva,
} from '../src/senza-ferite.js';
import { morenteDopoColpo } from '../src/scontro.js';
import { gradoMorente } from '../src/morente.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

const CREATURA = { nome: 'Lorath', pv: 52, _bestiario: { sistema_salute: 'solo_PV', edizione: 'Mostri 0.69' } };
const PNG = { nome: 'Agente I Grado', pv: 16, _bestiario: { sistema_salute: 'PV_e_Ferite' } };
const VECCHIO = { nome: 'un nemico salvato prima del lotto 197', pv: 30 }; // senza il campo

test('quale sistema usa un profilo, e il vecchio prende il predefinito senza cambiare da sé', () => {
  assert.equal(sistemaSalute(CREATURA, dati), 'solo_PV');
  assert.equal(sistemaSalute(PNG, dati), 'PV_e_Ferite');
  assert.equal(sistemaSalute(VECCHIO, dati), dati.formato_nemici.sistema_salute.predefinito);
  assert.equal(senzaFerite(CREATURA, dati), true);
  assert.equal(usaFerite(PNG, dati), true);
  // un valore che non esiste nei dati non si inventa: si ripiega sul predefinito
  assert.equal(sistemaSalute({ _bestiario: { sistema_salute: 'inventato' } }, dati), dati.formato_nemici.sistema_salute.predefinito);
});

// --- il confine col Morente -------------------------------------------------------------------------------

test('IL CONFINE: una creatura senza Ferite non entra in Morente, nemmeno oltre Grave', () => {
  assert.equal(puoEntrareInMorente(CREATURA, dati), false);
  assert.equal(puoEntrareInMorente(PNG, dati), true);
  // e lo scontro non le apre un contatore, qualunque numero di Ferite gli si passi
  const grado = gradoMorente(dati);
  const s = { round: 3, turno: 0, partecipanti: [] };
  const p = { id: 'nem:lorath:1', tipo: 'nemico', nome: 'Lorath', scheda: CREATURA };
  assert.equal(morenteDopoColpo(s, p, grado - 1, grado + 2, dati), undefined, 'ha aperto un contatore a una creatura senza Ferite');
  // un profilo che usa le Ferite invece sì (A.164, comportamento di sempre)
  const q = { id: 'nem:umano:1', tipo: 'nemico', nome: 'Mercenario', scheda: { ...PNG, caratteristiche: { COS: 6 } } };
  const mo = morenteDopoColpo(s, q, grado - 1, grado, dati);
  assert.ok(mo, 'un nemico con le Ferite deve ancora entrare in Morente');
});

test('a 0 PV la mini-scheda lo dice, invece di mostrare un contatore che non c’è', () => {
  const z = statoAZeroPv(CREATURA, dati);
  assert.ok(z, 'per una creatura senza Ferite ci deve essere qualcosa da leggere');
  assert.equal(z.contatore, false);
  assert.equal(z.fuoriCombattimento, true);
  assert.match(z.testo, /fuori combattimento/i);
  assert.match(z.testo, /Morente/, 'il nome va detto: è la domanda che il tavolo si farà');
  // per un profilo con le Ferite non si dice niente di tutto questo: ha il suo Morente
  assert.equal(statoAZeroPv(PNG, dati), null);
});

test('la riga si legge anche sopra 0 PV: detta prima, la domanda al tavolo non nasce', () => {
  const r = rigaSistemaSalute(CREATURA, dati);
  assert.ok(r);
  assert.match(r, /contatore di Morente/);
  assert.match(r, /Ferite/);
  assert.equal(rigaSistemaSalute(PNG, dati), null, 'chi ha le Ferite non ha niente di speciale da dire');
});

// --- le due conversioni ----------------------------------------------------------------------------------

test('§4.2.1: una Ferita diretta toglie 5 PV, ignorando l’AR; il danno non va sotto 0', () => {
  const e = feritaDiretta(CREATURA, dati, 52, 1);
  assert.equal(e.pv, 47);
  assert.equal(e.perdita, 5);
  assert.equal(e.ignoraAr, true);
  assert.match(e.testo, /−5 PV/);
  // due stati insieme
  assert.equal(feritaDiretta(CREATURA, dati, 52, 2).pv, 42);
  // non sotto 0 (§4.2)
  assert.equal(feritaDiretta(CREATURA, dati, 3, 1).pv, 0);
  assert.equal(feritaDiretta(CREATURA, dati, 3, 1).perdita, 3, 'si perde quello che c’era, non cinque');
  // su un profilo con le Ferite la conversione non si applica
  assert.equal(feritaDiretta(PNG, dati, 16, 1), null);
});

test('§4.2.1: uno stato curato ridà 5 PV, e si somma alla cura dei PV dello stesso effetto', () => {
  const e = curaFerita(CREATURA, dati, 20, 52, 2);
  assert.equal(e.pv, 30, 'due stati curati = 10 PV');
  assert.equal(e.convertito, 10);
  assert.equal(e.contaComeCuraFerite, true);
  // somma col recupero ordinario
  assert.equal(curaFerita(CREATURA, dati, 20, 52, 1, { pvCurati: 7 }).pv, 32);
  // non oltre il massimo
  assert.equal(curaFerita(CREATURA, dati, 50, 52, 2).pv, 52);
  // zero stati: non conta come cura di Ferite riuscita
  assert.equal(curaFerita(CREATURA, dati, 20, 52, 0).contaComeCuraFerite, false);
  assert.equal(curaFerita(PNG, dati, 10, 16, 1), null);
});

test('IL +30% NON tocca danni e cure: lo dicono i dati e si vede nei numeri', () => {
  const senzaAumento = dati.formato_nemici.sistema_salute.senza_ferite.senza_aumento.voci.join(' ');
  assert.match(senzaAumento, /cure/);
  assert.match(senzaAumento, /danni/);
  assert.match(senzaAumento, /rigenerazione/);
  // 5 PV sono 5, non 6,5 né 7
  assert.equal(feritaDiretta(CREATURA, dati, 52, 1).perdita, 5);
  assert.equal(curaFerita(CREATURA, dati, 20, 52, 1).convertito, 5);
});

test('§4.2: sopra 0 torna attiva al proprio turno successivo, e la conversione non resuscita', () => {
  const t = tornaAttiva(CREATURA, dati, 0, 10);
  assert.equal(t.attiva, false);
  assert.equal(t.alProssimoTurno, true);
  assert.match(t.testo, /turno/);
  // chi non era a 0 non ha niente da aspettare
  assert.equal(tornaAttiva(CREATURA, dati, 30, 20).attiva, true);
  assert.equal(tornaAttiva(PNG, dati, 0, 5), null);
});

test('i dati dichiarano il comportamento, e non c’è più un «da_fare» che faccia sembrare che manchi', () => {
  const SS = dati.formato_nemici.sistema_salute;
  assert.equal(SS.da_fare, undefined, 'il comportamento è dichiarato: «da_fare» non deve restare');
  assert.ok(SS.senza_ferite, 'il blocco del comportamento');
  assert.equal(SS.senza_ferite.a_zero_pv.contatore_morente, false);
  assert.match(SS.senza_ferite.paragrafo, /4\.2/);
  assert.equal(SS.versione_manuale, 'Mostri 0.69');
});
