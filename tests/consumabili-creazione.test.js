// «Crea consumabile» (Manuale della Magia §27.2, con le fasi del §24.3–24.6): costi per Grado, Magistrale, Prove fallite,
// supporti diversi, accesso dell'Officiante, consumabile creato usabile, crediti e PM scalati, stampa, validatore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { validaDati } from '../src/validate.js';
import { pianoCreazione, versioniCreabili, applicaCreazione, consumabiliMistici, usaConsumabile, motivoNonUsabile } from '../src/consumabili-mistici.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
// un Officiante con Ritualista Minore: Artefatti 14, Tecnologia 12, Rituali 11; incantesimi fino al livello 8
const scheda = (talenti = ['ritualista-minore']) => ({
  abilita: [{ nome: 'Artefatti', effettivo: 14 }, { nome: 'Tecnologia', effettivo: 12 }, { nome: 'Rituali', effettivo: 11 }],
  talentiLiberi: talenti.map((id) => ({ id })),
  incantesimi: { conosciuti: [{ nome: 'Arma Mistica' }, { nome: 'Cura Ferite' }, { nome: 'Individuare' }, { nome: 'Colpo Elementale' }], livelloMassimo: 8 },
});
const piano = (scelta, ctx = {}) => pianoCreazione({ progetto: { disponibile: true }, ...scelta }, { scheda: scheda(), ...ctx }, dati);
const sintesi = (p) => [p.grado, p.crediti, p.pm, p.ore, p.creato];

test('§27.2: costi per Grado I, II, III e IV (supporto + reagenti; PM = 3 × Grado + sigillati)', () => {
  // esempio del manuale: Cura Ferite 3, Grado I: 25 + 50 = 75 cr, 4 ore di costruzione e 1 ora d'infusione, 3 + 3 = 6 PM
  assert.deepEqual(sintesi(piano({ incantesimo: 'Cura Ferite', livello: 3 })), ['I', 75, 6, 5, true]);
  assert.deepEqual(sintesi(piano({ incantesimo: 'Individuare', livello: 6 })), ['II', 125, 12, 6, true]);
  assert.deepEqual(sintesi(piano({ incantesimo: 'Arma Mistica', livello: 9, conosciutaDaAltri: true })), ['III', 225, 18, 7, true]);
  const iv = pianoCreazione({ incantesimo: 'Arma Mistica', livello: 12, conosciutaDaAltri: true, progetto: { disponibile: true } }, { scheda: scheda(['ritualista-minore', 'ritualista-maggiore']) }, dati);
  assert.deepEqual(sintesi(iv), ['IV', 425, 24, 8, true]);
  // Prove: Tecnologia senza penalità per la pergamena (Semplice), Rituali con la penalità del Grado
  assert.deepEqual(iv.fasi.map((f) => [f.fase, f.totale]), [['costruzione', 12], ['infusione', 11 - 6]]);
});

test('§27.2: Successo Magistrale dimezza PM di lavoro e reagenti, non i PM sigillati né il supporto', () => {
  const p = piano({ incantesimo: 'Cura Ferite', livello: 3, infusione: { esito: 'magistrale' } });
  // esempio del manuale: 2 PM di lavoro + 3 sigillati = 5 PM; 25 + 25 = 50 cr di materiali
  assert.deepEqual([p.crediti, p.pm, p.fasi[1].pmLavoro, p.fasi[1].pmSigillati], [50, 5, 2, 3]);
  const iii = piano({ incantesimo: 'Arma Mistica', livello: 9, conosciutaDaAltri: true, infusione: { esito: 'magistrale' } });
  assert.deepEqual([iii.crediti, iii.pm], [25 + 100, 5 + 9]);
});

test('Prove fallite: infusione fallita, Maldestra o interrotta; supporto e progetto falliti; nuovi tentativi', () => {
  const f = piano({ incantesimo: 'Cura Ferite', livello: 3, infusione: { esito: 'fallimento' } });
  assert.deepEqual([f.crediti, f.pm, f.creato, f.voce], [75, 6, false, null]); // §24.5: PM e reagenti consumati (A.156)
  assert.match(piano({ incantesimo: 'Cura Ferite', livello: 3, infusione: { esito: 'maldestro' } }).fasi[1].supporto, /perde 1 PI/);
  const i = piano({ incantesimo: 'Cura Ferite', livello: 3, infusione: { esito: 'interrotta' } });
  assert.deepEqual([i.crediti, i.pm, i.creato], [75, 0, false]); // reagenti sì, PM no
  const s = piano({ incantesimo: 'Cura Ferite', livello: 3, costruzione: { esito: 'fallimento' } });
  assert.deepEqual([s.crediti, s.pm, s.fasi.length, s.creato], [25, 0, 1, false]);
  // nuovo tentativo del supporto dopo un Fallimento: metà tempo, materiali aggiuntivi 25% (§24.4)
  const r = piano({ incantesimo: 'Cura Ferite', livello: 3, costruzione: { tentativo: 'fallimento' } });
  assert.deepEqual([r.fasi[0].ore, r.fasi[0].crediti], [2, 7]);
  // progetto da realizzare (§24.3): Grado I, 4 ore e 100 cr anche se fallisce
  const pr = piano({ incantesimo: 'Cura Ferite', livello: 3, progetto: { disponibile: false, esito: 'fallimento' } });
  assert.deepEqual([pr.crediti, pr.ore, pr.fasi.length, pr.fasi[0].totale, pr.creato], [100, 4, 1, 14, false]);
  const prII = piano({ incantesimo: 'Individuare', livello: 6, progetto: { disponibile: false, tentativo: 'fallimento' } });
  assert.deepEqual([prII.fasi[0].ore, prII.fasi[0].crediti, prII.fasi[0].totale], [4, 200, 12]);
});

test('supporti diversi, bonus magistrali e Canali', () => {
  const senza = piano({ incantesimo: 'Arma Mistica', livello: 3, supporto: { id: 'altro', nome: 'Sigillo' } });
  assert.ok(senza.errori.some((e) => /costo del supporto/.test(e)));
  const altro = piano({ incantesimo: 'Arma Mistica', livello: 3, supporto: { id: 'altro', nome: 'Sigillo', costo: 200, complessita: 'Ordinaria' } });
  assert.deepEqual([altro.fasi[0].crediti, altro.fasi[0].ore, altro.fasi[0].totale, altro.crediti, altro.voce.personalizzato.nome], [200, 8, 10, 250, 'Sigillo di Arma Mistica 3']);
  // progetto magistrale +2 a Tecnologia; supporto magistrale +2 a Rituali; aiuto dei Canali fino a +5
  const b = piano({ incantesimo: 'Arma Mistica', livello: 3, progetto: { disponibile: true, magistrale: true }, costruzione: { esito: 'magistrale' }, infusione: { aiutoCanali: 9 } });
  assert.deepEqual(b.fasi.map((f) => f.totale), [14, 11 + 5 + 2]);
  // PM dei Canali: l'Officiante versa almeno il Grado
  assert.equal(piano({ incantesimo: 'Individuare', livello: 6, infusione: { pmCanali: 8 } }).pm, 4);
  assert.ok(piano({ incantesimo: 'Individuare', livello: 6, infusione: { pmCanali: 11 } }).errori.some((e) => /almeno 2 PM/.test(e)));
});

test('accesso: Ritualista per il Grado, versione conosciuta, «Rituale: non consentito» (A.157)', () => {
  assert.ok(pianoCreazione({ incantesimo: 'Cura Ferite', livello: 3, progetto: { disponibile: true } }, { scheda: scheda([]) }, dati).errori.some((e) => /Ritualista Minore/.test(e)));
  assert.ok(piano({ incantesimo: 'Arma Mistica', livello: 12, conosciutaDaAltri: true }).errori.some((e) => /Ritualista Maggiore/.test(e)));
  assert.ok(piano({ incantesimo: 'Arma Mistica', livello: 9 }).errori.some((e) => /non conosci/.test(e)));
  assert.ok(piano({ incantesimo: 'Colpo Elementale', livello: 3 }).avvisi.some((a) => /A\.157/.test(a)));
  const el = versioniCreabili(scheda(), dati);
  assert.deepEqual(el.map((x) => x.incantesimo), ['Arma Mistica', 'Colpo Elementale', 'Cura Ferite', 'Individuare']);
  assert.match(el[0].versioni.find((v) => v.livello === 9).motivo, /livello massimo/);
  assert.ok(versioniCreabili(scheda(), dati, { conosciutaDaAltri: true }).length > 80);
});

test('il consumabile creato si usa come le pergamene del campionario', () => {
  const voci = normalizzaEquipaggiamento([{ ...piano({ incantesimo: 'Arma Mistica', livello: 3 }).voce, uid: 'c1' },
    { ...piano({ incantesimo: 'Esorcizzare Corruzione', livello: 6, conosciutaDaAltri: true }).voce, uid: 'c2' }]);
  const [arma, esorcizza] = consumabiliMistici(voci, dati);
  assert.deepEqual([arma.nome, arma.creato, arma.consumabile.grado, arma.consumabile.pm_sigillati, arma.consumabile.energia, arma.attivazione.testo, arma.attivazione.inRound],
    ['Pergamena di Arma Mistica 3', true, 'I', 3, 'Verde', '1 AzP', true]);
  assert.deepEqual([esorcizza.attivazione.testo, motivoNonUsabile(esorcizza, { inScontro: true })], ['10 minuti', 'si usa fuori dal combattimento']);
  assert.match(arma.consumabile.effetto, /Versione 3: .*Durata 5 RND/);
  const u = usaConsumabile(voci, 'c1', dati);
  assert.deepEqual([u.esaurito, u.voci.map((v) => v.uid)], [true, ['c2']]);
  // SnT 0: fuori dalla sintonizzazione
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: voci }, livelli: [] }, dati);
  assert.equal(s.equipaggiamento.sintonizzazione, null);
  // Rigenerazione 9 (Rituale della sez. 25): 9 PM sigillati e 3 ore continuative
  const rig = consumabiliMistici([{ ...piano({ incantesimo: 'Rigenerazione', livello: 9, conosciutaDaAltri: true }).voce, uid: 'r' }], dati)[0];
  assert.deepEqual([rig.consumabile.grado, rig.consumabile.pm_sigillati, rig.attivazione.testo], ['III', 9, '3 ore continuative']);
});

test('registrare la creazione scala crediti e PM e mette il consumabile nell’Inventario', () => {
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [] }, livelli: [] }, dati);
  const m = massimiSessione(s, { ...MISHIMA_AGENTE, equipaggiamento: [] }, dati);
  const sessione = { ...inizializzaSessione(m), crediti: 1000 };
  const p = piano({ incantesimo: 'Cura Ferite', livello: 3 }, { crediti: 1000, pmAttuali: sessione.pmAttuali });
  const r = applicaCreazione({ voci: [], sessione }, p, m, 'nuovo');
  assert.deepEqual([r.sessione.crediti, r.sessione.pmAttuali, r.voci.map((v) => [v.uid, v.quantita])], [925, sessione.pmAttuali - 6, [['nuovo', 1]]]);
  // infusione fallita: si paga, nessun oggetto
  const f = applicaCreazione({ voci: [], sessione }, piano({ incantesimo: 'Cura Ferite', livello: 3, infusione: { esito: 'fallimento' } }), m, 'x');
  assert.deepEqual([f.sessione.crediti, f.voci.length], [925, 0]);
  // senza crediti o PM a sufficienza il piano non si registra
  const povero = piano({ incantesimo: 'Cura Ferite', livello: 3 }, { crediti: 50, pmAttuali: 3 });
  assert.equal(povero.errori.length, 2);
  assert.equal(applicaCreazione({ voci: [], sessione }, povero, m, 'y'), null);
});

test('validatore: supporti e tabelle delle tre fasi', () => {
  const errori = (modifica) => { const d = copia(dati); modifica(d.equipaggiamento.file.artefatti.consumabili); return validaDati(d).map((e) => JSON.stringify(e)).join('\n'); };
  assert.match(errori((c) => { c.supporti[0].costo = 30; }), /consumabili\.supporti/);
  assert.match(errori((c) => { c.creazione.infusione.gradi.pop(); }), /infusione\.gradi/);
  assert.match(errori((c) => { c.creazione.progetto.abilita = 'Artefattologia'; }), /progetto\.abilita/);
  assert.match(errori((c) => { delete c.creazione.costruzione.ritentare.maldestro; }), /costruzione\.ritentare/);
  assert.match(errori((c) => { c.creazione.infusione.esiti.interrotta.pm = 'no'; }), /infusione\.esiti/);
});
