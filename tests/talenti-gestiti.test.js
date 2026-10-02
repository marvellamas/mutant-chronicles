// Censimento dei Talenti (docs/censimento-talenti.md, «Metodo»): un Talento è «applicato» solo se un
// test mostra che il risultato cambia con e senza il Talento. Qui un caso per ciascun Talento che il
// censimento dice applicato fuori da «Lancia!» (quelli di lancio: tests/talenti-lancio.test.js), con il
// valore senza e con il Talento. I nomi dei casi sono i nomi dei Talenti: tools/effetti_talenti.py li
// cerca in questo file per scrivere la colonna del censimento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcolaAttaccoDistanza, calcolaAttaccoRavvicinato, profiloSenzArmi, manovreRavvicinate, valoriDisciplina,
} from '../src/attacco.js';
import { calcolaScheda } from '../src/calc.js';
import { applicaCondizioni, valoriTavolo } from '../src/condizioni.js';
import { inizializzaSessione, massimiSessione } from '../src/sessione.js';
import { risolviTalentoClasse } from '../src/avanzamento.js';
import { soglieCarico } from '../src/carico.js';
import { calcolaAR } from '../src/protezione.js';
import { calcolaEquipaggiamento, rapportoConversione } from '../src/equipaggiamento.js';
import { perOperazione } from '../src/ricarica.js';
import { calcolaLancio } from '../src/lancio.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, ARCANISTA } from './personaggi.js';

const { dati } = await datiReali();
const tc = (c, n) => { const x = dati.classi.classi.find((k) => k.nome === c); return [...x.talenti_fissi, ...x.talenti_a_scelta].find((t) => t.nome === n); };

// ---------------------------------------------------------------------------
// «Attacca!»: personaggio di prova con i Talenti (Liberi per id, di Classe dai dati)
const armaD = (m = {}) => ({
  uid: 'f', rif: 'armi_distanza:fucile', nome: 'Fucile', tipo: 'arma_distanza', abilita: 'Armi medie',
  va: 18, vaEffettivo: 18, scomposizione: [{ etichetta: 'VA Armi medie', valore: 18, fonte: 'regole' }],
  danno: { una_mano: '1d8+1', due_mani: null }, mani: 2, ac: 1, gittataQ: 1500, modalita: ['S', 'RB', 'RM', 'RL', 'TR', 'FS'],
  mirino: null, accessori: [], ...m,
});
const PISTOLA = (uid, nome) => armaD({ uid, nome, abilita: 'Armi leggere', mani: 1, va: 14, vaEffettivo: 14, scomposizione: [{ etichetta: 'VA Armi leggere', valore: 14, fonte: 'regole' }], modalita: ['S'] });
const armaR = (m = {}) => ({
  uid: 's', rif: 'armi:spada', nome: 'Spada', tipo: 'arma_ravvicinata', abilita: 'Armi da mischia',
  va: 10, vaEffettivo: 10, scomposizione: [{ etichetta: 'VA Armi da mischia', valore: 10, fonte: 'regole' }],
  danno: { una_mano: '1d6+1', due_mani: null }, mani: 1, portataQ: 1, manovre: ['Affondo', 'Spazzata', 'Stordire', 'Disarmare', 'Sbilanciare'], ...m,
});
const pg = (t = {}, armi = [armaR()]) => ({
  scheda: {
    talentiLiberi: (t.liberi ?? []).map((id) => ({ id })),
    classi: [{ nome: t.nomeClasse ?? 'Soldato', grado: 3, talenti: t.classe ?? [] }],
    abilita: [{ nome: 'Corpo a corpo', totale: 8, effettivo: 8, scomposizione: [{ etichetta: 'Valore da regole', valore: 8, fonte: 'regole' }] }],
    equipaggiamento: { armi }, movimento: { passo: 6, corsa: 12, scatto: 18 }, azioni: { principali: 1, movimento: 1 },
  },
  sessione: { munizioni: { f: { colpi: 30, riserve: 0 }, p: { colpi: 12, riserve: 0 } }, statiAttivi: [] },
});
const L = (...id) => ({ liberi: id });
const C = (c, ...n) => ({ classe: n.map((x) => tc(c, x)), nomeClasse: c });
const D = (t, d, a = armaD(), altre = []) => calcolaAttaccoDistanza(pg(t, [a, ...altre]), a, d, dati);
const R = (t, d, a = armaR(), altre = []) => calcolaAttaccoRavvicinato(pg(t, [a, ...altre]), a, d, dati);
const RN = (t, d) => { const p = pg(t, []); return calcolaAttaccoRavvicinato(p, profiloSenzArmi(p.scheda, dati), d, dati); };
const va = (r) => r.va_finale;

// [Talento, Talenti posseduti, funzione del risultato, senza, con]
const CASI = [
  // attacco a distanza
  ['Movimento Fluido', L('movimento-fluido'), (t) => va(D(t, { movimento: 'corsa' })), 16, 18],
  ['Imbracciatura Rapida', L('imbracciatura-rapida'), (t) => va(D(t, { movimento: 'passo' }, armaD({ abilita: 'Armi pesanti' }))), 14, 18],
  ['Raffica Breve Migliorata', L('raffica-breve-migliorata'), (t) => va(D(t, { modalita: 'RB' })), 20, 22],
  ['Raffica Media Migliorata', L('raffica-media-migliorata'), (t) => va(D(t, { modalita: 'RM' })), 16, 18],
  ['Raffica Lunga Migliorata', L('raffica-lunga-migliorata'), (t) => va(D(t, { modalita: 'RL' })), 12, 14],
  ['Fuoco di Soppressione Migliorato', L('fuoco-di-soppressione-migliorato'), (t) => D(t, { modalita: 'FS' }).munizioni, 10, 5],
  ['Tiro Ravvicinato Istintivo', L('tiro-ravvicinato-istintivo'), (t) => va(D(t, { ravvicinato: true, distanza: 2 })), 14, 16],
  ['Tiro Ravvicinato Migliorato', L('tiro-ravvicinato-migliorato'), (t) => D(t, { ravvicinato: true, distanza: 2 }).danno_per_colpo, '1d8+4', '1d8+6'],
  ['Tiro a Bruciapelo Migliorato', L('tiro-a-bruciapelo-migliorato'), (t) => D(t, { bruciapelo: true, distanza: 1 }).impossibile === null, false, true],
  ['Tiro Rapido Migliorato', L('tiro-rapido-migliorato'), (t) => va(D(t, { modalita: 'TR' })), 14, 16],
  ['Tiro Mirato Migliorato', L('tiro-mirato-migliorato'), (t) => { const r = D(t, { mirato: true }); return [r.va_finale, r.danno_per_colpo]; }, [20, '1d8+3'], [22, '1d8+5']],
  ['Tiro a Lunga Distanza', L('tiro-a-lunga-distanza'), (t) => va(D(t, { distanza: 200 })), 8, 10],
  ['Mira Rapida', L('mira-rapida'), (t) => D(t, { distanza: 200 }).azioni_principali, 2, 1],
  ['Fuoco di Precisione', L('fuoco-di-precisione'), (t) => { const r = D(t, { bersaglio: { impegnato: true } }); return [r.va_finale, r.seconda_prova.modificatore]; }, [14, -4], [16, -2]],
  ['Copertura Tattica', L('copertura-tattica'), (t) => va(D(t, { coperturaPropria: 'leggera', movimento: 'passo' })), 16, 18],
  ['Tiratore Imboscato', L('tiratore-imboscato'), (t) => { const r = D(t, { nascosto: true, bersaglio: { ignaro: true, copertura: 'leggera' } }); return [r.va_finale, r.danno_per_colpo]; }, [16, '1d8+1'], [18, '1d8+3']],
  ['Pistolero', L('pistolero'), (t) => D(t, { dueArmi: true }, PISTOLA('f', 'Pistola'), [PISTOLA('p', 'Pistola 2')]).attacchi.map((x) => x.va), [10, 10], [12, 12]],
  ['Duellante', L('duellante'), (t) => D(t, { dueArmi: true, distanza: 1 }, PISTOLA('f', 'Pistola'), [armaR()]).attacchi.map((x) => x.va), [10, 6], [12, 8]],
  ['Ambidestro', L('ambidestro'), (t) => [va(D(t, { manoNonDominante: true }, PISTOLA('f', 'Pistola'))), va(R(t, { manoNonDominante: true }))], [10, 6], [14, 10]],
  ['Fuoco Controllato', C('Agente', 'Fuoco Controllato'), (t) => { const r = D(t, { bersaglio: { impegnato: true } }); return [r.va_finale, r.seconda_prova?.modificatore ?? null]; }, [14, -4], [18, null]],
  ['Mira Selettiva', C('Agente', 'Mira Selettiva'), (t) => va(D(t, { mirato: true, bersaglio: { copertura: 'leggera' } })), 18, 20],
  ['Analisi Rapida', C('Agente', 'Analisi Rapida'), (t) => va(D(t, { analisiRapida: true })), 18, 20],
  ['Reazione Operativa', C('Agente', 'Reazione Operativa'), (t) => D(t, {}).promemoria.some((p) => /^Talenti: Reazione Operativa — Una volta per combattimento/.test(p)), false, true],
  ['Ottimizzare Proiettili', C('Artigliere', 'Ottimizzare Proiettili'), (t) => ['RB', 'RM', 'RL', 'FS'].map((m) => D(t, { modalita: m }).munizioni), [3, 5, 10, 10], [2, 4, 8, 8]],
  ['Postura d’Assedio', C('Artigliere', 'Postura d’Assedio'), (t) => D(t, {}, armaD({ abilita: 'Armi pesanti' })).danno_per_colpo, '1d8+1', '1d8+2'],
  ['Bersaglio Designato', C('Artigliere', 'Bersaglio Designato'), (t) => { const r = D(t, { preparazione: 2 }); return [r.azioni_principali, r.dopo_armatura.map((x) => x.etichetta)]; }, [1, []], [3, ['+2 dopo l’Armatura']]],
  ['Movimento Tattico', C('Incursore', 'Movimento Tattico'), (t) => va(D(t, { movimento: 'corsa' })), 16, 18],
  ['Rapidità Operativa', C('Incursore', 'Rapidità Operativa'), (t) => [va(D(t, { distanza: 8, primoAttacco: true })), va(D(t, { distanza: 20, primoAttacco: true })), va(R(t, { primoAttacco: true }))], [18, 16, 10], [20, 16, 12]],
  ['Attacco Silenzioso', C('Incursore', 'Attacco Silenzioso'), (t) => [va(D(t, { distanza: 8, bersaglio: { ignaro: true } }, armaD({ accessori: [{ nome: 'Silenziatore' }] }))), va(R(t, { bersaglio: { ignaro: true } }))], [18, 10], [20, 12]],
  ['Punto Vitale', C('Incursore', 'Punto Vitale'), (t) => [D(t, { distanza: 8, mirato: true }).dopo_armatura.length, D(t, { distanza: 20, mirato: true }).dopo_armatura.length, R(t, { manovra: 'mirato' }).dopo_armatura.length], [0, 0, 0], [1, 0, 1]],
  // corpo a corpo
  ['Carica Migliorata', L('carica-migliorata'), (t) => R(t, { carica: true, percorsoQ: 4 }).danno.testo, '(1d6+1) ×2', '(1d6+1) ×3'],
  ['Imboscata Migliorata', L('imboscata-migliorata'), (t) => va(R(t, { imboscata: true })), 8, 10],
  ['Incalzare Migliorato', L('incalzare-migliorato'), (t) => R(t, { manovra: 'incalzare' }).danno?.testo ?? null, null, '1d6+1'],
  ['Immobilizzare Istintivo', L('immobilizzare-istintivo'), (t) => [RN(t, { manovra: 'immobilizzare' }).danno?.testo ?? null, R(t, { manovra: 'immobilizzare' }, armaR({ mani: 1 })).danno?.testo ?? null], [null, null], ['1d4', '1d4']],
  ['Schermidore', L('schermidore'), (t) => R(t, { dueArmi: true }, armaR(), [armaR({ uid: 'q', nome: 'Pugnale' })]).attacchi.map((x) => x.va), [6, 6], [8, 8]],
  ['Affondo Migliorato', L('affondo-migliorato'), (t) => { const r = R(t, { manovra: 'affondo' }); return [r.danno.testo, r.dopo_armatura[0].etichetta]; }, ['1d6+2', 'Sanguinamento 1'], ['1d6+3', 'Sanguinamento 2']],
  ['Arti Marziali', L('arti-marziali'), (t) => RN(t, {}).danno.testo, '1d4', '1d6'],
  ['Arti Marziali Migliorate', L('arti-marziali', 'arti-marziali-migliorate'), (t) => va(RN(t, {})), 8, 9],
  ['Colpo Mirato Migliorato', L('colpo-mirato-migliorato'), (t) => { const r = R(t, { manovra: 'mirato' }); return [r.va_finale, r.danno.testo]; }, [12, '1d6+3'], [14, '1d6+5']],
  ['Disarmare Migliorato', L('disarmare-migliorato'), (t) => va(R(t, { manovra: 'disarmare' })), 6, 8],
  ['Sbilanciare Migliorato', L('sbilanciare-migliorato'), (t) => va(R(t, { manovra: 'sbilanciare' })), 6, 8],
  ['Spazzata Migliorata', L('spazzata-migliorata'), (t) => va(R(t, { manovra: 'spazzata', bersagli: 2 })), 6, 8],
  ['Stordire Migliorato', L('stordire-migliorato'), (t) => va(R(t, { manovra: 'stordire' })), 4, 6],
  ['Carica Brutale', C('Assaltatore', 'Carica Brutale'), (t) => R(t, { carica: true, percorsoQ: 4 }).danno.testo, '(1d6+1) ×2', '(1d6+3) ×2'],
  ['Coordinazione Offensiva', C('Assaltatore', 'Coordinazione Offensiva'), (t) => va(R(t, { bersaglio: { alleatoAdiacente: true } })), 10, 11],
  ['Raffica di Colpi', C('Lottatore', 'Raffica di Colpi'), (t) => ('raffica_di_colpi' in manovreRavvicinate(pg(t).scheda, dati) ? RN(t, { manovra: 'raffica_di_colpi' }).attacchi.map((x) => x.va) : null), null, [6, 6]],
  ['Combattimento Multiplo', C('Lottatore', 'Combattimento Multiplo'), (t) => ('combattimento_multiplo' in manovreRavvicinate(pg(t).scheda, dati) ? va(RN(t, { manovra: 'combattimento_multiplo', bersagli: 3 })) : null), null, 2],
  ['Punto Debole', C('Lottatore', 'Punto Debole'), (t) => ('punto_debole' in manovreRavvicinate(pg(t).scheda, dati) ? RN(t, { manovra: 'punto_debole' }).danno.testo : null), null, '(1d4) ×2'],
];

for (const [nome, t, f, senza, con] of CASI) {
  test(`${nome}: con e senza il Talento`, () => {
    assert.notDeepEqual(senza, con);
    assert.deepEqual(f({ nomeClasse: t.nomeClasse }), senza, 'senza il Talento');
    assert.deepEqual(f(t), con, 'con il Talento');
  });
}

test('«Bonus dei Talenti» spento: «Attacca!» calcola senza i Talenti anche per i casi nuovi', () => {
  const off = (t) => ({ ...pg(t, [PISTOLA('f', 'Pistola'), PISTOLA('p', 'Pistola 2')]), scheda: { ...pg(t, [PISTOLA('f', 'Pistola'), PISTOLA('p', 'Pistola 2')]).scheda, bonusTalenti: false } });
  const p = off(L('pistolero'));
  assert.deepEqual(calcolaAttaccoDistanza(p, p.scheda.equipaggiamento.armi[0], { dueArmi: true }, dati).attacchi.map((x) => x.va), [10, 10]);
});

// ---------------------------------------------------------------------------
// Disciplina del Lottatore (parametro scelto): Addestramento al Combattimento Senz’Armi e Padronanza
const disciplina = (id, conPadronanza) => {
  const N = 'Addestramento al Combattimento Senz’Armi';
  const t = risolviTalentoClasse({ ...tc('Lottatore', N), sceltaParametro: id }, 1);
  return { classe: [t, ...(conPadronanza ? [tc('Lottatore', 'Padronanza della Disciplina')] : [])], nomeClasse: 'Lottatore' };
};
test('Addestramento al Combattimento Senz’Armi: dado della Disciplina, Iniziativa di Rapidità, VA di Controllo', () => {
  assert.equal(RN({}, {}).danno.testo, '1d4');
  assert.equal(RN(disciplina('potenza'), {}).danno.testo, '1d8');
  assert.equal(va(RN(disciplina('controllo'), { manovra: 'stordire' })) - va(RN({}, { manovra: 'stordire' })), 2);
  assert.equal(disciplina('rapidita').classe[0].effetti.iniziativa, 3);
});
test('Padronanza della Disciplina: Potenza senza −1 a Difese; Guardia anche a distanza; Controllo anche per resistere', () => {
  const potenza = (x) => RN(x, {}).promemoria.some((p) => /−1 VA a Difese/.test(p));
  assert.deepEqual([potenza(disciplina('potenza')), potenza(disciplina('potenza', true))], [true, false]);
  assert.deepEqual(valoriDisciplina(pg(disciplina('guardia')).scheda, dati).map((x) => [x.contro, x.valore]), [['ravvicinati', 1]]);
  assert.deepEqual(valoriDisciplina(pg(disciplina('guardia', true)).scheda, dati).map((x) => [x.contro, x.valore]), [['diretti', 1]]);
  assert.deepEqual(valoriDisciplina(pg(disciplina('controllo')).scheda, dati), []);
  assert.deepEqual(valoriDisciplina(pg(disciplina('controllo', true)).scheda, dati).map((x) => [x.contro, x.valore]), [['resistenza', 2]]);
});

// ---------------------------------------------------------------------------
// Scheda (avanzamento): il Talento Libero al 3° livello, al posto di Sempre Allerta
const conL = (creazione, ...ids) => calcolaScheda({
  creazione,
  livelli: [{ livello: 2, caratteristiche: { SAG: 1, INT: 1 } }, ...ids.map((id, i) => ({ livello: 3 + 2 * i, talentoLibero: typeof id === 'string' ? { id } : id }))],
}, dati);
const neutro = 'sempre-allerta';
const SCHEDA = [
  ['Iniziativa Migliorata', MISHIMA_AGENTE, ['iniziativa-migliorata'], (s) => s.iniziativa, 3],
  ['Buona Costituzione', MISHIMA_AGENTE, ['buona-costituzione'], (s) => s.pv, 5],
  ['Prova Salvezza Migliorata', MISHIMA_AGENTE, [{ id: 'prova-salvezza-migliorata', parametro: 'tempra' }], (s) => s.salvezze.tempra.totale, 1],
  ['Scattante', MISHIMA_AGENTE, ['scattante'], (s) => s.movimento.scatto, 6],
  ['Potere Mistico', ARCANISTA, ['potere-mistico'], (s) => s.pm, 5],
  ['Meditazione Migliorata', ARCANISTA, ['meditazione-migliorata'], (s) => s.magia.meditazione.pmPerOra, 2],
  ['Meditazione Estesa', ARCANISTA, ['meditazione-estesa'], (s) => s.magia.meditazione.orePerGiorno, 7],
  ['Lancio in Combattimento', ARCANISTA, ['lancio-in-combattimento'], (s) => s.magia.penalitaIngaggio, 2],
  ['Focalizzazione Migliorata', ARCANISTA, ['focalizzazione-migliorata'], (s) => s.magia.focalizzazioneVa, 2],
  ['Incantesimi da Lancio', ARCANISTA, ['incantesimi-da-lancio'], (s) => s.magia.tiroArmiDaLancio, 2],
  ['Tecniche Interiori Supplementari', MISHIMA_AGENTE, ['risorse-interiori', 'tecniche-interiori-supplementari'], (s) => s.tecnicheAmmesse, 3],
  ['Potenziale Mistico Migliorato', MISHIMA_AGENTE, ['usufruitore-di-magia', 'potenziale-mistico-migliorato'], (s) => s.incantesimi.livelloMassimo, 3],
];
for (const [nome, creazione, ids, f, delta] of SCHEDA) {
  test(`${nome}: con e senza il Talento (scheda)`, () => {
    const senza = conL(creazione, ...ids.slice(0, -1), neutro);
    const con = conL(creazione, ...ids);
    assert.equal(f(con) - f(senza), delta);
  });
}
test('Talenti di Magia della scheda: Usufruitore di Magia, Incrementare Incantesimi, Contromagia, Contromagia Universale, Contromagia Migliorata, Magia Occultata, Recupero Meditativo, Risorse Interiori', () => {
  assert.deepEqual([conL(MISHIMA_AGENTE, neutro).incantesimi.livelloMassimo, conL(MISHIMA_AGENTE, 'usufruitore-di-magia').incantesimi.livelloMassimo], [0, 3]);
  const quote = (s) => JSON.stringify(s.incantesimi.quote);
  assert.notEqual(quote(conL(ARCANISTA, neutro)), quote(conL(ARCANISTA, 'incrementare-incantesimi')));
  assert.deepEqual([conL(ARCANISTA, neutro).magia.contromagia, conL(ARCANISTA, 'contromagia').magia.contromagia], [null, { penalita: -2, serveConoscenza: true }]);
  assert.equal(conL(ARCANISTA, 'contromagia', 'contromagia-universale').magia.contromagia.serveConoscenza, false);
  assert.equal(conL(ARCANISTA, 'contromagia', 'contromagia-migliorata').magia.contromagia.penalita, 0);
  assert.deepEqual([conL(ARCANISTA, neutro).magia.magiaOccultata, conL(ARCANISTA, 'magia-occultata').magia.magiaOccultata], [false, true]);
  assert.deepEqual([conL(MISHIMA_AGENTE, neutro).magia.meditazione, conL(MISHIMA_AGENTE, 'recupero-meditativo').magia.meditazione === null], [null, false]);
  assert.deepEqual([conL(MISHIMA_AGENTE, neutro).tecnicheAmmesse, conL(MISHIMA_AGENTE, 'risorse-interiori').tecnicheAmmesse > 0], [0, true]);
});
test('Rapidità Operativa: +2 Iniziativa dai Talenti di Classe', () => {
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  assert.ok(!s.vociIniziativa.some((v) => v.etichetta === 'Rapidità Operativa'));
  const incursore = [
    { livello: 2, caratteristiche: { DES: 2 } }, { livello: 3, talentoLibero: { id: neutro } }, { livello: 4, grado: { classe: 'Incursore' }, tiroPV: { valore: 4, origine: 'manuale' } },
    { livello: 5, talentoLibero: { id: 'scattante' } }, { livello: 6, caratteristiche: { SAG: 1 } }, { livello: 7, talentoLibero: { id: 'buona-costituzione' } },
    { livello: 8, grado: { classe: 'Incursore' }, tiroPV: { valore: 4, origine: 'manuale' } }, { livello: 9, talentoLibero: { id: 'iniziativa-migliorata' } },
    { livello: 10, caratteristiche: { SAG: 1 } }, { livello: 11, talentoLibero: { id: 'copertura-tattica' } }, { livello: 12, grado: { classe: 'Incursore' }, tiroPV: { valore: 4, origine: 'manuale' } },
  ];
  const conRO = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: incursore }, dati);
  const senzaRO = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: incursore.slice(0, -1) }, dati);
  assert.deepEqual(conRO.vociIniziativa.find((v) => v.etichetta === 'Rapidità Operativa'), { etichetta: 'Rapidità Operativa', valore: 2 });
  assert.equal(conRO.iniziativa - senzaRO.iniziativa, 2);
});

// ---------------------------------------------------------------------------
// Valori al tavolo: Stati ridotti dai Talenti, Movimento con armatura e scudo
const alTavolo = ({ liberi = [], classi = [], sessione = {} } = {}) => {
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const m = massimiSessione(s, MISHIMA_AGENTE, dati);
  s.talentiLiberi = [...s.talentiLiberi, ...liberi.map((id) => ({ id, nome: dati.talenti_liberi.talenti.find((t) => t.id === id).nome, parametro: null }))];
  s.classi = [...s.classi, ...classi.map(([nome, talento]) => ({ nome, grado: 2, talenti: [{ nome: talento }] }))];
  return applicaCondizioni(s, { ...inizializzaSessione(m), ...sessione }, dati);
};
const eff = (s, n) => s.abilita.find((a) => a.nome === n).effettivo;
test('Combattere alla Cieca: Accecato −8 → −4 per attaccare e difendersi (non per Pilotare)', () => {
  const senza = alTavolo({ sessione: { statiAttivi: ['accecato'] } });
  const con = alTavolo({ liberi: ['combattere-alla-cieca'], sessione: { statiAttivi: ['accecato'] } });
  const base = alTavolo();
  assert.deepEqual(['Armi leggere', 'Difese', 'Pilotare'].map((n) => eff(senza, n) - eff(base, n)), [-8, -8, -8]);
  assert.deepEqual(['Armi leggere', 'Difese', 'Pilotare'].map((n) => eff(con, n) - eff(base, n)), [-4, -4, -8]);
  assert.ok(con.abilita.find((a) => a.nome === 'Difese').provenienza.righe.some((r) => r.fonte === 'Combattere alla Cieca (Accecato)' && r.valore === 4));
  // senza lo Stato nessun bonus; con «Bonus dei Talenti» spento nessuna riduzione
  assert.equal(eff(alTavolo({ liberi: ['combattere-alla-cieca'] }), 'Difese'), eff(base, 'Difese'));
  assert.equal(eff(alTavolo({ liberi: ['combattere-alla-cieca'], sessione: { statiAttivi: ['accecato'], bonusTalenti: false } }), 'Difese') - eff(base, 'Difese'), -8);
});
test('Sangue Freddo: con l’interruttore acceso Terrorizzato −4 → −2 al VA (situazionale)', () => {
  const chiave = 'classe:Cacciatore:Sangue Freddo';
  const base = alTavolo();
  const spento = alTavolo({ classi: [['Cacciatore', 'Sangue Freddo']], sessione: { statiAttivi: ['terrorizzato'] } });
  const acceso = alTavolo({ classi: [['Cacciatore', 'Sangue Freddo']], sessione: { statiAttivi: ['terrorizzato'], talentiAccesi: [chiave] } });
  assert.equal(eff(spento, 'Percezione') - eff(base, 'Percezione'), -4);
  assert.equal(eff(acceso, 'Percezione') - eff(base, 'Percezione'), -2);
});
test('Assalto Armato: la penalità MOV di armatura e scudo scende di 2 Q, fino a 0; non quella delle armi', () => {
  const scheda = (talenti, movimentoQ, movimentoQProtezioni) => ({
    movimento: { passo: 6, corsa: 12, scatto: 18 }, azioni: { principali: 1, movimento: 1 }, carico: { livello: null },
    equipaggiamento: { movimentoQ, movimentoQProtezioni }, talentiLiberi: [], classi: [{ nome: 'Assaltatore', grado: 3, talenti: talenti.map((nome) => ({ nome })) }],
  });
  const passo = (s) => valoriTavolo(s, {}, dati).movimento.passo.effettivo;
  assert.deepEqual([passo(scheda([], -3, -3)), passo(scheda(['Assalto Armato'], -3, -3))], [3, 5]);
  assert.equal(passo(scheda(['Assalto Armato'], -2, -1)), 5); // solo 1 Q da armatura e scudo; −1 dall'arma resta
});

// ---------------------------------------------------------------------------
// Carico, sintonizzazione, AR, ricarica, Chroma
test('Forza da Lavoro: soglie di carico raddoppiate', () => {
  const finta = (talenti) => ({ caratteristiche: { FOR: { valore: 5 } }, classi: [{ nome: 'Operaio', talenti: talenti.map((nome) => ({ nome })) }] });
  assert.deepEqual([soglieCarico(finta([]), dati).ordinario, soglieCarico(finta(['Forza da Lavoro']), dati).ordinario], [50, 100]);
});
test('Architetto TecnoMistico: +2 alla capacità di sintonizzazione', () => {
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const art = [{ uid: 'b', rif: 'artefatti:batteria-da-5-pm-chroma-verde', stato: null, quantita: 1, note: '', sintonizzato: true }];
  const cap = (talenti) => calcolaEquipaggiamento({ caratteristiche: s.caratteristiche, abilita: s.abilita, specializzazioni: [], gradiComplessivi: 3, talenti }, art, dati).sintonizzazione.capacita;
  assert.deepEqual([cap([]), cap(['Architetto TecnoMistico'])], [10, 12]);
});
test('Corazza Potenziata: +1 AR magica con una protezione Artefatto', () => {
  const eq = { protezioni: [{ uid: 'a', nome: 'Armatura', tipo: 'armatura', ar: { totale: 5, magica: 1 }, artefatto: true }], effettiOggetti: [] };
  assert.deepEqual([calcolaAR(eq, dati).totale, calcolaAR(eq, dati, { talenti: ['Corazza Potenziata'] }).totale], [5, 6]);
});
test('Ricarica Migliorata: 3 cartucce per operazione invece di 1', () => {
  assert.deepEqual([perOperazione({ singolo: true }, [], dati), perOperazione({ singolo: true }, ['ricarica-migliorata'], dati)], [1, 3]);
});
test('Ricarica Efficiente e Conversione Migliorata: Convertire Potere 3:1 → 2:1 → 1:1; Bianco 2:1; solo Taumaturgo', () => {
  const s = (liberi = [], classi = [], addestramento = 'Taumaturgo') => ({
    addestramento, talentiLiberi: liberi.map((id) => ({ id })), classi: [{ nome: 'Tecnomante', talenti: classi.map((nome) => ({ nome })) }],
  });
  assert.equal(rapportoConversione(s(), dati).rapporto, 3);
  assert.equal(rapportoConversione(s(['conversione-migliorata']), dati).rapporto, 2);
  assert.equal(rapportoConversione(s([], ['Ricarica Efficiente']), dati).rapporto, 2);
  assert.equal(rapportoConversione(s(['conversione-migliorata'], ['Ricarica Efficiente']), dati).rapporto, 1);
  assert.deepEqual(rapportoConversione(s(), dati).fissi, { Bianco: 2 });
  assert.equal(rapportoConversione(s([], [], 'Combattente'), dati).disponibile, false);
  assert.equal(rapportoConversione({ ...s(['conversione-migliorata']), bonusTalenti: false }, dati).rapporto, 3);
});

// ---------------------------------------------------------------------------
// «Lancia!»: Talenti di lancio già letti dal motore (effetti.lancio); gli altri in tests/talenti-lancio.test.js
const inc = (nome) => dati.incantesimi.incantesimi.find((i) => i.nome === nome);
const mago = (liberi = []) => ({
  scheda: {
    abilita: [{ nome: 'Potere', effettivo: 10, scomposizione: [{ etichetta: 'Valore da regole', valore: 10, fonte: 'regole' }] }, { nome: 'Armi da lancio', effettivo: 5 }, { nome: 'Corpo a corpo', effettivo: 4 }],
    incantesimi: { livelloMassimo: 9, scalaPotere: 'taumaturgo' }, magia: { focalizzazioneVa: 4, penalitaIngaggio: -2, tiroArmiDaLancio: 2 },
    equipaggiamento: { contenitori: [] }, talentiLiberi: liberi.map((id) => ({ id })), classi: [{ talenti: [] }],
  },
  sessione: { pmAttuali: 30 },
});
const lancia = (liberi, nome, d) => calcolaLancio(mago(liberi), inc(nome), d, dati);
const LANCIO = [
  ['Incantesimi Ampliati', 'incantesimi-ampliati', 'Barriera di Forza', { versione: 3, anticipazione: 1 }, (r) => r.pm_costo, 6, 3],
  ['Incantesimi Estesi', 'incantesimi-estesi', 'Controllo Elementale', { versione: 1, anticipazione: 1 }, (r) => r.pm_costo, 2, 1],
  ['Incantesimi Proiettati', 'incantesimi-proiettati', 'Teletrasporto', { versione: 6, anticipazione: 1 }, (r) => r.pm_costo, 12, 6],
  ['Incantesimi Plurimi', 'incantesimi-plurimi', 'Prigione Dimensionale', { versione: 9, anticipazione: 0 }, (r) => r.pm_costo, 18, 9],
  ['Incantesimi Intensificati', 'incantesimi-intensificati', 'Irrobustire', { versione: 3, anticipazione: 0 }, (r) => r.pm_costo, 6, 3],
  ['Anticipazione Migliorata', 'anticipazione-migliorata', 'Irrobustire', { versione: 6, anticipazione: 0 }, (r) => r.va_potere_finale, 8, 10],
  ['Escludere la Componente Somatica', 'escludere-la-componente-somatica', 'Colpo Elementale', { versione: 3, componentiMancanti: ['gesto'] }, (r) => r.va_potere_finale, 8, 10],
  ['Escludere l’Invocazione', 'escludere-l-invocazione', 'Colpo Elementale', { versione: 3, componentiMancanti: ['invocazione'] }, (r) => r.va_potere_finale, 8, 10],
  ['Escludere il Focus', 'escludere-il-focus', 'Colpo Elementale', { versione: 3, componentiMancanti: ['focus'] }, (r) => r.va_potere_finale, 8, 10],
  ['Incantesimi Inarrestabili', 'incantesimi-inarrestabili', 'Colpo Elementale', { versione: 1 }, (r) => r.salvezza_bersaglio.talento?.valore ?? null, null, -1],
];
for (const [nome, id, incantesimo, d, f, senza, con] of LANCIO) {
  test(`${nome}: con e senza il Talento («Lancia!»)`, () => {
    assert.deepEqual([f(lancia([], incantesimo, d)), f(lancia([id], incantesimo, d))], [senza, con]);
  });
}
