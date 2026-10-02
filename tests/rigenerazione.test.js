// Lotto 3 del 02/10 (docs/diff-manuali-2026-10-02.md): Rigenerazione come Rituale della Magia sez. 25
// (PM totali, ore, reagenti, Canali del §24.6, Prova di Rituali) e attivazione da Artefatto (§25.4,
// A.39 punto 3): senza Prove, l'intero costo dalla riserva integrata, che non paga altri Incantesimi (A.18).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaLancio, versioniLancio, aiutoCanale, attivazioneInfusa, contenitoriLancio, ripartizioneMagistrale } from '../src/lancio.js';
import { calcolaScheda } from '../src/calc.js';
import { normalizzaEquipaggiamento, infoArtefattoVoce, risolvi, catalogo } from '../src/equipaggiamento.js';
import { preparaStampa } from '../src/stampa.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const rig = dati.incantesimi.incantesimi.find((i) => i.nome === 'Rigenerazione');
const officiante = ({ rituali = 12, liberi = ['ritualista-minore'], pm = 20 } = {}) => ({
  scheda: { abilita: [{ nome: 'Rituali', effettivo: rituali }], incantesimi: { livelloMassimo: 3 }, talentiLiberi: liberi.map((id) => ({ id })) },
  sessione: { pmAttuali: pm },
});

test('Rituale di Rigenerazione: PM totali della tabella, Prova di Rituali con la penalità del Grado, ore e reagenti', () => {
  const r = calcolaLancio(officiante(), rig, { versione: 9 }, dati);
  assert.equal(r.impossibile, null);
  // Magia 21.10: «il valore in tabella è il costo totale della versione»
  assert.deepEqual([r.pm_costo, r.fonte_pm.personali, r.prova_richiesta, r.prova_abilita], [9, 9, true, 'Rituali']);
  // §25.1: Grado III, −4 VA, 3 ore, 1.500 cr; conta Ritualista, non il livello massimo (3) degli Incantesimi (A.74)
  assert.deepEqual([r.rituale.grado, r.va_potere_finale, r.rituale.ore, r.rituale.reagenti, r.rituale.rigenerazione], [3, 8, 3, 1500, '5 giorni']);
  assert.ok(r.promemoria.some((p) => /Fallimento: PM e reagenti consumati/.test(p)));
  // Grado IV (livello 12) richiede Ritualista Maggiore
  assert.match(calcolaLancio(officiante(), rig, { versione: 12 }, dati).impossibile.motivo, /Grado IV: serve Ritualista Maggiore/);
  const maggiore = calcolaLancio(officiante({ liberi: ['ritualista-minore', 'ritualista-maggiore'] }), rig, { versione: 18 }, dati);
  assert.deepEqual([maggiore.impossibile, maggiore.pm_costo, maggiore.rituale.grado, maggiore.va_potere_finale, maggiore.rituale.reagenti], [null, 18, 6, 2, 3000]);
  assert.deepEqual(versioniLancio(rig, officiante().scheda, dati).filter((v) => !v.motivo).map((v) => v.livello), [9, 10]);
});

test('Canali (§24.6): aiuto per VA fino a +5, al massimo tanti quanto il Grado, quote di PM con il minimo dell’Officiante', () => {
  assert.deepEqual([0, 1, 8, 9, 14, 15, 19, 20].map((va) => aiutoCanale(va, dati)), [0, 1, 1, 2, 2, 3, 3, 4]);
  const r = calcolaLancio(officiante(), rig, { versione: 9, canali: [{ va: 20, pm: 3 }, { va: 15, pm: 0 }] }, dati);
  assert.deepEqual([r.rituale.aiuto, r.va_potere_finale, r.rituale.officiante, r.rituale.pm_canali], [5, 13, 6, 3]);
  // Successo Magistrale: metà dei PM per eccesso (5); proposta valida: Canali fino alla quota, l'Officiante almeno metà Grado
  assert.deepEqual(r.rituale.magistrale, { totale: 5, officiante: 2, canali: [3, 0], errori: [], proposta: true, canaliTotale: 3 });
  assert.match(calcolaLancio(officiante(), rig, { versione: 9, canali: [{ va: 5, pm: 7 }] }, dati).impossibile.motivo, /almeno 3 PM personali/);
  const troppi = calcolaLancio(officiante(), rig, { versione: 9, canali: [1, 2, 3, 4].map(() => ({ va: 5, pm: 0 })) }, dati);
  assert.match(troppi.impossibile.motivo, /Al massimo 3 Canali/);
  assert.match(calcolaLancio(officiante({ pm: 4 }), rig, { versione: 9 }, dati).impossibile.motivo, /PM personali insufficienti: 4, ne servono 9/);
});

// Artefatto personalizzato con Rigenerazione 9 e riserva Verde da 10 PM (esempio del §25.4)
const anello = (energia = 'Verde', extra = {}) => ({
  uid: 'a', rif: null, stato: 'indossata', quantita: 1, note: '', sintonizzato: true,
  personalizzato: { nome: 'Anello di Rigenerazione', tipo: 'artefatto', potenza: 'Rara', energia, capacita_pm: 10, infuso: { incantesimo: 'Rigenerazione', livello: 9 } }, ...extra,
});

test('attivazione da Artefatto (§25.4): senza Prova, 9 PM dalla riserva integrata, 3 ore; Verde o Bianca', () => {
  const [v] = normalizzaEquipaggiamento([anello()]);
  assert.deepEqual(v.personalizzato.infuso, { incantesimo: 'Rigenerazione', livello: 9 });
  const info = infoArtefattoVoce(risolvi(v, catalogo(dati)), dati);
  assert.deepEqual([info.sintonizzazione, info.proprieta_attive, info.contenitore.integrato], [3, true, true]);
  const riserva = { energia: 'Verde', macrofamiglie: ['Spirituale'] };
  const a = attivazioneInfusa(info.infuso, riserva, { pm: 10, sintonizzato: true, deposito: false }, dati);
  assert.deepEqual([a.pm, a.prova, a.motivo], [9, false, null]);
  assert.match(a.tempo, /3 ore di attivazione continua/);
  assert.match(attivazioneInfusa(info.infuso, riserva, { pm: 8, sintonizzato: true, deposito: false }, dati).motivo, /ha 8 PM, ne servono 9/);
  assert.match(attivazioneInfusa(info.infuso, riserva, { pm: 10, sintonizzato: false, deposito: false }, dati).motivo, /non sintonizzato/);
  assert.match(attivazioneInfusa(info.infuso, { energia: 'Blu', macrofamiglie: ['Mentale'] }, { pm: 10, sintonizzato: true, deposito: false }, dati).motivo, /serve Verde o Bianco/);
});

test('la riserva dell’Artefatto di Rigenerazione non è una fonte di PM di «Lancia!» (A.18); la SS stampa l’attivazione', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [anello()] };
  const s = calcolaScheda({ creazione, livelli: [] }, dati);
  assert.ok(s.equipaggiamento.contenitori.some((c) => c.uid === 'a' && c.integrato));
  const cura = dati.incantesimi.incantesimi.find((i) => i.nome === 'Cura Ferite');
  assert.deepEqual(contenitoriLancio({ scheda: s, sessione: {} }, cura), []);
  const d = preparaStampa({ creazione, livelli: [] }, dati);
  assert.match(JSON.stringify(d.fogli), /Rigenerazione 9: 9 PM dalla riserva, 3 ore di attivazione continua, con contatto, nessuna Prova/);
});

test('A.74 punto 2 (E&L del 02/10): dopo il Magistrale ripartizione libera entro i limiti', () => {
  // esempio della decisione 2: Grado III da 9 PM, quote 3 + 3 + 3; il Magistrale porta a 5; 2 + 2 + 1 è valida
  const base = { pm: 9, grado: 3, officiante: 3, canali: [3, 3] };
  assert.deepEqual(ripartizioneMagistrale(base, { officiante: 2, canali: [2, 1] }, dati).errori, []);
  const prop = ripartizioneMagistrale(base, null, dati);
  assert.deepEqual([prop.totale, prop.errori, prop.officiante + prop.canali[0] + prop.canali[1]], [5, [], 5]);
  const err = (s) => ripartizioneMagistrale(base, s, dati).errori.join(' | ');
  assert.match(err({ officiante: 1, canali: [2, 2] }), /almeno metà del Grado, 2 PM/);
  assert.match(err({ officiante: 4, canali: [1, 0] }), /non paga più della quota dichiarata \(3 PM\).*almeno 1 PM/);
  assert.match(err({ officiante: 2, canali: [2, 2] }), /fanno 6 PM, il costo dimezzato è 5/);
  // un Canale presente solo per l'aiuto (quota 0) resta a 0
  assert.match(ripartizioneMagistrale({ pm: 9, grado: 3, officiante: 6, canali: [3, 0] }, { officiante: 2, canali: [2, 1] }, dati).errori.join(), /Canale 2 non aveva dichiarato PM/);
  // nel Rituale: la scelta dichiarata passa nel risultato
  const r = calcolaLancio(officiante(), rig, { versione: 9, canali: [{ va: 20, pm: 3 }], magistrale: { officiante: 3, canali: [2] } }, dati);
  assert.deepEqual([r.rituale.magistrale.officiante, r.rituale.magistrale.canali, r.rituale.magistrale.errori], [3, [2], []]);
  assert.equal(dati.regole.rituali['TODO(Davide)'], undefined);
  assert.equal(rig.meccanica.procedura_rituale['TODO(Davide)'], undefined);
});
