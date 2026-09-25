import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import {
  migraPersonaggio, livelloAttuale, prossimoLivello, applicaLivello, annullaUltimoLivello,
} from '../src/character.js';
import { passiDelLivello, descriviVoce, progressione } from '../src/avanzamento.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE, ARCANISTA, LIVELLI_AGENTE, tiro } from './personaggi.js';

const { dati } = await datiReali();

/** Personaggio con la creazione e i primi `n` livelli di un elenco (n = numero di voci). */
const fino = (creazione, livelli, n) => ({ versione: 2, creazione, livelli: livelli.slice(0, n) });
/** Voce del livello indicato nel percorso dell'Agente. */
const voce = (livello) => LIVELLI_AGENTE.find((v) => v.livello === livello);
/** Personaggio dell'Agente arrivato al livello indicato. */
const agente = (livello) => fino(MISHIMA_AGENTE, LIVELLI_AGENTE, livello - 1);
const problemi = (errori) => errori.map((e) => e.problema);
const violazioni = (errori) => errori.filter((e) => e.tipo === 'violazione');

// --- modello ------------------------------------------------------------------------------

test('migrazione v1 → v2: le scelte diventano la creazione, nessun livello', () => {
  const p = migraPersonaggio(MISHIMA_AGENTE);
  assert.deepEqual(p, { versione: 2, creazione: MISHIMA_AGENTE, livelli: [] });
  assert.equal(livelloAttuale(p), 1);
  assert.deepEqual(migraPersonaggio(p), p); // idempotente
  assert.equal(livelloAttuale(MISHIMA_AGENTE), 1);
});

test('un personaggio v2 senza livelli dà la stessa scheda della v1', () => {
  const v1 = calcolaScheda(MISHIMA_AGENTE, dati);
  const v2 = calcolaScheda(migraPersonaggio(MISHIMA_AGENTE), dati);
  assert.deepEqual(v2.errori, []);
  for (const k of ['pv', 'pm', 'iniziativa', 'livello']) assert.equal(v2[k], v1[k], k);
  for (const id of Object.keys(v1.salvezze)) assert.equal(v2.salvezze[id].totale, v1.salvezze[id].totale, id);
  for (const a of v1.abilita) assert.equal(v2.abilita.find((x) => x.nome === a.nome).totale, a.totale, a.nome);
  assert.deepEqual(v2.classi.map((c) => [c.nome, c.grado]), [['Agente', 1]]);
});

test('applicaLivello aggiunge il livello successivo; annulla l’ultimo ripristina la scheda', () => {
  const p3 = agente(3);
  const p4 = applicaLivello(p3, (({ livello, ...resto }) => resto)(voce(4)));
  assert.equal(livelloAttuale(p4), 4);
  assert.equal(p4.livelli.at(-1).livello, 4);
  const indietro = annullaUltimoLivello(p4);
  assert.deepEqual(indietro, p3);
  assert.deepEqual(calcolaScheda(indietro, dati), calcolaScheda(p3, dati));
  assert.notEqual(calcolaScheda(p4, dati).pv, calcolaScheda(p3, dati).pv);
});

// --- il Mishima Agente dal 1° al 20° livello ------------------------------------------------

test('Agente dal 1° al 20° livello: nessun errore, Agente al VI Grado', () => {
  const s = calcolaScheda(agente(20), dati);
  assert.deepEqual(s.errori, []);
  assert.equal(s.livello, 20);
  assert.deepEqual(s.classi.map((c) => [c.nome, c.grado]), [['Agente', 6]]);
  assert.deepEqual(s.classi[0].talenti.map((t) => t.nome),
    ['Fuoco Controllato', 'Reazione Operativa', 'Rete di Informatori', 'Analisi Rapida', 'Ottime Credenziali', 'Doppia Identità']);
  // PV: COS finale 7 + creazione (4 + 6 massimizzato) + Gradi tirati (4+4, 4+3, 4+5, 4+6, 4+2) + Buona Costituzione 5
  assert.equal(s.pv, 7 + 10 + 8 + 7 + 9 + 10 + 6 + 5);
  assert.equal(s.pm, 10 + 2 * 6); // SAG 10 + 2 PM per Grado
  assert.equal(s.iniziativa, 5 + 1 + 3); // DES 10, INT 6, Iniziativa Migliorata
  assert.deepEqual(s.specializzazioni.map((x) => x.nome), ['Spionaggio']);
});

test('2° livello: una Caratteristica a 7 può salire a 9, non a 10', () => {
  const p1 = agente(2 - 1 + 0); // solo creazione
  const prossimo = prossimoLivello(p1, dati);
  assert.equal(prossimo.livello, 2);
  assert.equal(prossimo.puntiCaratteristica, 2);
  assert.equal(prossimo.caratteristiche.DES.massimo, 9);
  assert.deepEqual(validaLivello(p1, { caratteristiche: { DES: 2 } }, dati), []);
  const e = validaLivello(p1, { caratteristiche: { DES: 3 } }, dati);
  assert.ok(problemi(e).includes('DES arriverebbe a 10: al 2° livello il massimo è 9 (§8.2)'), JSON.stringify(e));
  assert.equal(calcolaScheda(agente(2), dati).caratteristiche.DES.valore, 9);
});

test('3° livello: Salvezze +1 e un Talento Libero', () => {
  const s2 = calcolaScheda(agente(2), dati);
  const s3 = calcolaScheda(agente(3), dati);
  for (const id of Object.keys(s2.salvezze)) {
    assert.equal(s3.salvezze[id].avanzamento, 1);
    assert.equal(s3.salvezze[id].totale, s2.salvezze[id].totale + 1, id);
  }
  assert.deepEqual(s3.talentiLiberi.map((t) => t.id), ['iniziativa-migliorata']);
  assert.equal(s3.iniziativa, s2.iniziativa + 3);
  const e = validaLivello(agente(2), {}, dati);
  assert.ok(e.some((x) => x.campo === 'talentoLibero' && x.tipo === 'incompleto'));
});

test('4° livello: Grado II con Talento a scelta e limite di Avanzamento 4', () => {
  const p3 = agente(3);
  const prossimo = prossimoLivello(p3, dati);
  assert.equal(prossimo.avanzamentoMassimo, 4);
  const agenteInfo = prossimo.classi.find((c) => c.nome === 'Agente');
  assert.equal(agenteInfo.prossimoGrado, 2);
  assert.equal(agenteInfo.talentiAScelta.length, 5);
  assert.deepEqual(agenteInfo.tiroPV && [agenteInfo.tiroPV.formula, agenteInfo.tiroPV.minimo, agenteInfo.tiroPV.massimo], ['1d6', 1, 6]);

  const { livello, ...base } = voce(4);
  assert.deepEqual(validaLivello(p3, base, dati), []);
  // Furtività: 3 alla creazione + 1 di Classe = 4, già al limite
  const troppo = validaLivello(p3, { ...base, puntiAbilita: { 'Furtività': 1, 'Medicina': 2, 'Sopravvivenza': 2 } }, dati);
  assert.ok(problemi(troppo).includes('Avanzamento 5: al 4° livello il massimo è 4 (§8.3)'), JSON.stringify(troppo));
  const senzaTalento = validaLivello(p3, { ...base, talentoClasse: undefined }, dati);
  assert.ok(senzaTalento.some((x) => x.campo === 'talentoClasse' && x.tipo === 'incompleto'));
  const nonDellaClasse = validaLivello(p3, { ...base, talentoClasse: 'Predatore' }, dati);
  assert.ok(nonDellaClasse.some((x) => x.campo === 'talentoClasse' && /non è fra i Talenti a scelta/.test(x.problema)));
  const senzaTiro = validaLivello(p3, { ...base, tiroPV: undefined }, dati);
  assert.ok(senzaTiro.some((x) => x.campo === 'tiroPV' && x.tipo === 'incompleto'));
  const tiroImpossibile = validaLivello(p3, { ...base, tiroPV: tiro(7) }, dati);
  assert.ok(tiroImpossibile.some((x) => x.campo === 'tiroPV' && /7 non è possibile con 1d6/.test(x.problema)));

  const s4 = calcolaScheda(agente(4), dati);
  const furt = s4.abilita.find((a) => a.nome === 'Furtività');
  assert.deepEqual([furt.daClasse, furt.liberi, furt.avanzamento, furt.limite], [2, 2, 4, 4]);
  assert.equal(s4.classi[0].grado, 2);
});

test('6° livello: la Caratteristica arriva a 10 e il punto in eccesso va altrove', () => {
  const p5 = agente(5);
  assert.equal(prossimoLivello(p5, dati).caratteristiche.DES.massimo, 10);
  const e = validaLivello(p5, { caratteristiche: { DES: 2 } }, dati);
  assert.ok(problemi(e).includes('DES arriverebbe a 11: al 6° livello il massimo è 10 (§8.2)'));
  assert.deepEqual(validaLivello(p5, { caratteristiche: { DES: 1, COS: 1 } }, dati), []);
  const s6 = calcolaScheda(agente(6), dati);
  assert.equal(s6.caratteristiche.DES.valore, 10);
  assert.equal(s6.caratteristiche.DES.mod, 5);
  assert.equal(s6.caratteristiche.COS.valore, 7);
});

test('12° livello: due Azioni Principali', () => {
  assert.equal(calcolaScheda(agente(11), dati).azioni.principali, 1);
  assert.equal(calcolaScheda(agente(12), dati).azioni.principali, 2);
});

test('20° livello: Avanzamento fino a 8 e Salvezze +3 di Avanzamento', () => {
  const s = calcolaScheda(agente(20), dati);
  for (const a of s.abilita) assert.equal(a.limite, 8);
  assert.equal(Math.max(...s.abilita.map((a) => a.avanzamento)), 8);
  assert.equal(s.abilita.find((a) => a.nome === 'Furtività').avanzamento, 8);
  for (const x of Object.values(s.salvezze)) assert.equal(x.avanzamento, 3);
  // Tempra: 8 + 1 (COS 7) + 1 Avventuriero + 0 Mishima + 3 + 2 Prova Salvezza Migliorata
  assert.equal(s.salvezze.tempra.totale, 15);
  assert.equal(prossimoLivello(agente(20), dati), null);
  const oltre = validaLivello(agente(20), {}, dati);
  assert.match(oltre[0].problema, /livello massimo è 20/);
});

test('un +1 di Classe oltre il limite non si applica ed è annotato (§8.3)', () => {
  // Con le tabelle attuali il limite sale di 1 a ogni Grado e il caso non si presenta; se Davide
  // lasciasse il limite a 3 anche al 4° livello, il +1 dell'Agente a Furtività (già 3) andrebbe perso.
  const d = copia(dati);
  d.regole.avanzamento.avanzamento_massimo_abilita[1].massimo = 3;
  const p = fino(MISHIMA_AGENTE, [voce(2), voce(3), { ...voce(4), puntiAbilita: { 'Medicina': 2, 'Sopravvivenza': 3 } }], 3);
  const s = calcolaScheda(p, d);
  assert.deepEqual(s.errori, []);
  assert.equal(s.abilita.find((a) => a.nome === 'Furtività').avanzamento, 3);
  assert.ok(s.annotazioni.includes('4° livello: il +1 di Agente a Furtività non si applica perché l’Avanzamento è già al limite 3 (§8.3).'), JSON.stringify(s.annotazioni));
  assert.deepEqual(calcolaScheda(agente(20), dati).annotazioni, []);
});

// --- multiclasse ----------------------------------------------------------------------------

const MULTI = [
  { livello: 2, caratteristiche: { FOR: 1, COS: 1 } },
  { livello: 3, talentoLibero: { id: 'sempre-allerta' } },
  {
    livello: 4, grado: { classe: 'Soldato' }, tiroPV: tiro(5), // Combattente: nuova Classe di altro Addestramento
    puntiAbilita: { 'Medicina': 3, 'Atletica': 2 },
  },
  { livello: 5, talentoLibero: { id: 'mulo-da-soma' } },
  { livello: 6, caratteristiche: { SAG: 2 } },
  { livello: 7, talentoLibero: { id: 'sonno-leggero' } },
  { livello: 8, grado: { classe: 'Accademico' }, tiroPV: tiro(2), puntiAbilita: { 'Scienza': 2, 'Cultura': 2, 'Tecnologia': 1 } },
  { livello: 9, talentoLibero: { id: 'visione-perfetta' } },
  { livello: 10, caratteristiche: { INT: 2 } },
  { livello: 11, talentoLibero: { id: 'guarigione-migliorata' } },
  {
    livello: 12, grado: { classe: 'Agente' }, tiroPV: tiro(3), talentoClasse: 'Mira Selettiva',
    puntiAbilita: { 'Furtività': 2, 'Sopravvivenza': 1, 'Scienza': 2 },
  },
  { livello: 13, talentoLibero: { id: 'struttura-robusta' } },
  { livello: 14, caratteristiche: { CAR: 2 } },
  { livello: 15, talentoLibero: { id: 'duro-a-morire' } },
  { livello: 16, grado: { classe: 'Soldato' }, tiroPV: tiro(4), talentoClasse: 'Supporto d’Attacco', puntiAbilita: { 'Armi medie': 3, 'Difese': 2 } },
  { livello: 17, talentoLibero: { id: 'autosufficiente' } },
  { livello: 18, caratteristiche: { FOR: 2 } },
  { livello: 19, talentoLibero: { id: 'poliglotta', annotazione: 'Imperiale, Venusiano' } },
];

test('multiclasse: al 4° una nuova Classe di un altro Addestramento, al 20° la quarta è rifiutata', () => {
  const p4 = fino(MISHIMA_AGENTE, MULTI, 3);
  const s4 = calcolaScheda(p4, dati);
  assert.deepEqual(s4.errori, []);
  assert.deepEqual(s4.classi.map((c) => [c.nome, c.addestramento, c.grado]), [['Agente', 'Avventuriero', 1], ['Soldato', 'Combattente', 1]]);
  assert.equal(s4.addestramento, 'Avventuriero'); // la nuova Classe non cambia Addestramento
  assert.equal(s4.classi[1].talenti[0].nome, 'Addestramento Militare');

  const p19 = fino(MISHIMA_AGENTE, MULTI, MULTI.length);
  const s19 = calcolaScheda(p19, dati);
  assert.deepEqual(s19.errori, []);
  assert.deepEqual(s19.classi.map((c) => [c.nome, c.grado]), [['Agente', 2], ['Soldato', 2], ['Accademico', 1]]);
  const quarta = { grado: { classe: 'Pilota' }, tiroPV: tiro(3), puntiAbilita: { 'Pilotare': 3, 'Tecnologia': 2 } };
  const e = validaLivello(p19, quarta, dati);
  assert.ok(e.some((x) => x.campo === 'grado' && /al massimo 3 Classi/.test(x.problema)), JSON.stringify(e));
  const info = prossimoLivello(p19, dati);
  assert.equal(info.classi.find((c) => c.nome === 'Pilota').ammessa, false);
  assert.equal(info.classi.find((c) => c.nome === 'Soldato').ammessa, true);
  // al Grado III del Soldato il Talento è fisso
  assert.deepEqual(validaLivello(p19, { grado: { classe: 'Soldato' }, tiroPV: tiro(8), puntiAbilita: { 'Armi medie': 1, 'Difese': 1, 'Pilotare': 3 } }, dati), []);
});

test('Talento di Classe con requisito: Supporto Avanzato richiede un Supporto', () => {
  const p15 = fino(MISHIMA_AGENTE, MULTI, 14);
  const e = validaLivello(p15, { ...MULTI[14], talentoClasse: 'Supporto Avanzato', livello: undefined }, dati);
  assert.ok(e.some((x) => /Supporto Avanzato richiede Supporto d’Attacco oppure Supporto di Difesa oppure Supporto Logistico/.test(x.problema)), JSON.stringify(e));
});

// --- Talenti Liberi -------------------------------------------------------------------------

test('Prova Salvezza Migliorata su Tempra: la terza acquisizione è rifiutata', () => {
  const liv = [
    { livello: 2, caratteristiche: { COS: 2 } },
    { livello: 3, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
    { ...voce(4) },
    { livello: 5, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
    { livello: 6, caratteristiche: { DES: 1, SAG: 1 } },
  ];
  const p6 = fino(MISHIMA_AGENTE, liv, liv.length);
  const s6 = calcolaScheda(p6, dati);
  assert.deepEqual(s6.errori, []);
  assert.equal(s6.salvezze.tempra.talenti, 2);
  const e = validaLivello(p6, { talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } }, dati);
  assert.ok(problemi(e).some((x) => /al massimo due acquisizioni per ciascuna Salvezza/.test(x)), JSON.stringify(e));
  // su un'altra Salvezza si può
  assert.deepEqual(validaLivello(p6, { talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'riflessi' } }, dati), []);
  // il parametro è obbligatorio
  assert.ok(validaLivello(p6, { talentoLibero: { id: 'prova-salvezza-migliorata' } }, dati).some((x) => x.tipo === 'incompleto'));
});

test('tetto 18 di strutturale + Prova Salvezza Migliorata (valore del tetto dai dati)', () => {
  // Al 3° livello Tempra strutturale è 8 + 1 (COS 6) + 1 Avventuriero + 0 + 1 = 11.
  const d = copia(dati);
  d.regole.avanzamento.tetto_salvezza = 11;
  const p2 = agente(2);
  const e = validaLivello(p2, { talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } }, d);
  assert.ok(problemi(e).some((x) => /Tempra arriverebbe a 12: .* non può superare 11/.test(x)), JSON.stringify(e));
  // con il tetto reale (18) va bene, e la scheda non supera mai il tetto
  assert.deepEqual(validaLivello(p2, { talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } }, dati), []);
  const s = calcolaScheda(agente(20), dati);
  for (const x of Object.values(s.salvezze)) assert.ok(x.totale <= 18);
});

test('prerequisiti: Schivata Multipla richiede Schivata Istintiva', () => {
  const e = validaLivello(agente(2), { talentoLibero: { id: 'schivata-multipla' } }, dati);
  assert.ok(problemi(e).includes('Schivata Multipla richiede Schivata Istintiva'));
  const giaPreso = validaLivello(agente(4), { talentoLibero: { id: 'iniziativa-migliorata' } }, dati);
  assert.ok(problemi(giaPreso).some((x) => /già posseduto/.test(x)));
  const info = prossimoLivello(agente(4), dati);
  assert.equal(info.talentiLiberi.find((t) => t.id === 'iniziativa-migliorata').ammesso, false);
  assert.equal(info.talentiLiberi.find((t) => t.id === 'schivata-multipla').motivo, 'Schivata Multipla richiede Schivata Istintiva');
  assert.deepEqual(info.talentiLiberi.find((t) => t.id === 'prova-salvezza-migliorata').parametri, ['tempra', 'riflessi', 'volonta', 'magia']);
  // al 18° l'Agente ha già Tempra Migliorata due volte: Tempra non è più fra i parametri ammessi
  const info19 = prossimoLivello(agente(18), dati);
  assert.deepEqual(info19.talentiLiberi.find((t) => t.id === 'prova-salvezza-migliorata').parametri, ['riflessi', 'volonta', 'magia']);
});

test('Specializzazione: un Talento Libero acquisibile una volta', () => {
  const e = validaLivello(agente(12), { talentoLibero: { id: 'specializzazione-spionaggio' } }, dati);
  assert.ok(problemi(e).some((x) => /Specializzazione in Spionaggio è già posseduto/.test(x)));
});

// --- incompatibilità magia / Risorse Interiori (§8.6.10) ------------------------------------

const TECNICHE_4 = ['meditazione-profonda', 'vista-felina', 'aura-di-resistenza', 'salto-della-tigre'];

test('Taumaturgo che sceglie Risorse Interiori → errore', () => {
  const p2 = fino(ARCANISTA, [{ livello: 2, caratteristiche: { INT: 1, SAG: 1 } }], 1);
  assert.deepEqual(calcolaScheda(p2, dati).errori.filter((x) => x.tipo === 'violazione'), []);
  const e = validaLivello(p2, { talentoLibero: { id: 'risorse-interiori' }, tecniche: TECNICHE_4 }, dati);
  assert.ok(problemi(e).includes('Risorse Interiori è incompatibile con l’Addestramento Taumaturgo (§8.6.10)'), JSON.stringify(e));
  assert.ok(problemi(e).includes('Risorse Interiori è incompatibile con la Classe taumaturgica Arcanista (§8.6.10)'));
});

test('personaggio con Risorse Interiori che prende un Grado di Arcanista → errore', () => {
  // SAG 7 → Mod +2: 2 + 2 = 4 Tecniche
  const liv = [voce(2), { livello: 3, talentoLibero: { id: 'risorse-interiori' }, tecniche: TECNICHE_4 }];
  const p3 = fino(MISHIMA_AGENTE, liv, 2);
  const s3 = calcolaScheda(p3, dati);
  assert.deepEqual(s3.errori, []);
  assert.equal(s3.tecnicheAmmesse, 4);
  assert.deepEqual(s3.tecniche.map((t) => t.id), TECNICHE_4);
  const e = validaLivello(p3, { grado: { classe: 'Arcanista' }, tiroPV: tiro(2), tiroPM: tiro(2), puntiAbilita: { 'Medicina': 3, 'Sopravvivenza': 2 } }, dati);
  assert.ok(problemi(e).includes('Arcanista è una Classe taumaturgica: incompatibile con Risorse Interiori (§8.6.10)'), JSON.stringify(e));
  assert.equal(prossimoLivello(p3, dati).classi.find((c) => c.nome === 'Arcanista').ammessa, false);
  // anche nell'altra direzione con i Talenti che concedono il lancio
  const p4 = fino(MISHIMA_AGENTE, [...liv, voce(4)], 3);
  const e2 = validaLivello(p4, { talentoLibero: { id: 'usufruitore-di-magia' } }, dati);
  assert.ok(problemi(e2).some((x) => /Usufruitore di Magia concede il lancio di Incantesimi: incompatibile con Risorse Interiori/.test(x)), JSON.stringify(e2));
});

test('Risorse Interiori: le Tecniche vanno scelte, e le Scuole richiedono Mishima', () => {
  const p2 = agente(2);
  const mancano = validaLivello(p2, { talentoLibero: { id: 'risorse-interiori' }, tecniche: TECNICHE_4.slice(0, 2) }, dati);
  assert.ok(mancano.some((x) => x.campo === 'tecniche' && x.tipo === 'incompleto' && /restano 2/.test(x.problema)));
  const troppe = validaLivello(p2, { talentoLibero: { id: 'risorse-interiori' }, tecniche: [...TECNICHE_4, 'colpo-interiore'] }, dati);
  assert.ok(troppe.some((x) => x.campo === 'tecniche' && x.tipo === 'violazione'));
  const lottatore = validaLivello(p2, { talentoLibero: { id: 'risorse-interiori' }, tecniche: [...TECNICHE_4.slice(0, 3), 'onda-interiore'] }, dati);
  assert.ok(problemi(lottatore).includes('Onda Interiore è una Tecnica del Lottatore'));
  const dueScuole = validaLivello(p2, { talentoLibero: { id: 'risorse-interiori' }, tecniche: ['colpo-del-cobra', 'passo-dell-ombra', ...TECNICHE_4.slice(0, 2)] }, dati);
  assert.ok(problemi(dueScuole).some((x) => /una sola Scuola Mishima/.test(x)));
  // scheda: le Tecniche di Scuola sono annotate (iniziazione non verificabile)
  const p3 = fino(MISHIMA_AGENTE, [voce(2), { livello: 3, talentoLibero: { id: 'risorse-interiori' }, tecniche: ['colpo-del-cobra', ...TECNICHE_4.slice(0, 3)] }], 2);
  assert.ok(calcolaScheda(p3, dati).annotazioni.some((a) => /Scuola Sole/.test(a)));
});

// --- Classe taumaturgica senza Addestramento Taumaturgo --------------------------------------

test('Classe taumaturgica senza Addestramento: niente 2 + Mod INT, scala «altri utilizzatori»', () => {
  const noveIncantesimi = ['Colpo Elementale', 'Controllo Elementale', 'Muro Elementale', 'Ampliare Sensi', 'Barriera Mentale',
    'Biomanipolazione', 'Cura Ferite', 'Cura Malattie', 'Cura Avvelenamenti'];
  const livello4 = { grado: { classe: 'Arcanista' }, tiroPV: tiro(2), tiroPM: tiro(4), puntiAbilita: { 'Medicina': 3, 'Sopravvivenza': 2 } };
  const p3 = agente(3);
  const incompleto = validaLivello(p3, livello4, dati);
  assert.ok(incompleto.some((x) => x.campo === 'incantesimi' && x.tipo === 'incompleto' && /restano 9/.test(x.problema)), JSON.stringify(incompleto));
  const alto = validaLivello(p3, { ...livello4, incantesimi: [...noveIncantesimi.slice(0, 8), 'Evoca Elementale'] }, dati);
  assert.ok(problemi(alto).some((x) => /Evoca Elementale: livello base 6 oltre il livello massimo 3/.test(x)));
  assert.deepEqual(validaLivello(p3, { ...livello4, incantesimi: noveIncantesimi }, dati), []);

  const p4 = applicaLivello(p3, { ...livello4, incantesimi: noveIncantesimi });
  const s = calcolaScheda(p4, dati);
  assert.deepEqual(s.errori, []);
  assert.equal(s.incantesimi.scalaPotere, 'altri_utilizzatori');
  assert.equal(s.incantesimi.quote.liberi, 0);
  assert.equal(s.incantesimi.quote.totale, 9);
  assert.equal(s.incantesimi.livelloMassimo, 3);
  assert.ok(s.annotazioni.some((a) => /scala «altri utilizzatori»/.test(a)));
  assert.equal(s.pm, 7 + 2 + 5 + 4); // SAG 7, Agente 2, Arcanista 5 + 1d4
});

test('Taumaturgo: le quote del Grado II si sommano a quelle già possedute', () => {
  const liv = [
    { livello: 2, caratteristiche: { INT: 1, SAG: 1 } }, // INT 8: 2 + Mod 3 = 5 liberi (erano 4)
  ];
  const p2 = fino(ARCANISTA, liv, 1);
  const s2 = calcolaScheda(p2, dati);
  // il Mod INT più alto aumenta la quota libera: c'è un incantesimo da scegliere
  assert.ok(s2.errori.some((x) => x.campo === 'livelli[0].incantesimi' && x.tipo === 'incompleto'));
  const p2ok = fino(ARCANISTA, [{ ...liv[0], incantesimi: ['Telemeccanica'] }], 1);
  assert.ok(problemi(calcolaScheda(p2ok, dati).errori).some((x) => /Telemeccanica: livello base 6/.test(x)));
  const p2bis = fino(ARCANISTA, [{ ...liv[0], incantesimi: ['Empatia'] }], 1);
  assert.deepEqual(calcolaScheda(p2bis, dati).errori, []);
  assert.equal(calcolaScheda(p2bis, dati).incantesimi.quote.totale, 14);
});

test('decisione 5 del master: al Grado II di Arcanista il livello massimo è 8, non 6', () => {
  const liv = [
    { livello: 2, caratteristiche: { COS: 1, DES: 1 } },
    { livello: 3, talentoLibero: { id: 'sempre-allerta' } },
  ];
  const p3 = fino(ARCANISTA, liv, 2);
  const voce4 = {
    grado: { classe: 'Arcanista' }, tiroPV: tiro(2), tiroPM: tiro(3), talentoClasse: 'Riserva Tecnica',
    puntiAbilita: { 'Percezione': 2, 'Rituali': 2, 'Artefatti': 1 },
    // +2 per macrofamiglia; Evoca Elementale ha livello base 6
    incantesimi: ['Evoca Elementale', 'Irrobustire', 'Distrazione', 'Empatia', 'Cura Spirituale', 'Arma Mistica'],
  };
  assert.deepEqual(validaLivello(p3, voce4, dati), []);
  const s = calcolaScheda(applicaLivello(p3, voce4), dati);
  assert.equal(s.incantesimi.livelloMassimo, 8);
  assert.equal(s.incantesimi.quote.totale, 13 + 6);
  // Devastazione Elementale (livello base 9) resta oltre il limite
  const troppo = validaLivello(p3, { ...voce4, incantesimi: [...voce4.incantesimi.slice(1), 'Devastazione Elementale'] }, dati);
  assert.ok(troppo.some((x) => /Devastazione Elementale: livello base 9 oltre il livello massimo 8/.test(x.problema)), JSON.stringify(troppo));
  // alla creazione PM con il dado massimizzato: 7 SAG + 5 + 4; al Grado II il dado si tira (3)
  assert.equal(calcolaScheda(fino(ARCANISTA, [], 0), dati).pm, 16);
  assert.equal(s.pm, 16 + 5 + 3);
});

// --- passi dell'interfaccia "Sali di livello" (senza DOM) -------------------------------------

const idPassi = (x) => x.passi.map((p) => p.id);

test('passiDelLivello: un passo per evento di regole.json, gli eventi automatici come informazioni', () => {
  const l2 = passiDelLivello(agente(1), {}, dati);
  assert.equal(l2.livello, 2);
  assert.deepEqual(idPassi(l2), ['caratteristiche', 'riepilogo']);
  assert.equal(l2.passi[0].punti, 2);
  assert.deepEqual(l2.informazioni, []);

  const l3 = passiDelLivello(agente(2), {}, dati);
  assert.deepEqual(idPassi(l3), ['talento', 'riepilogo']);
  assert.equal(l3.informazioni.length, 1);
  assert.match(l3.informazioni[0], /\+1 a tutte le Prove Salvezza/);

  const l4 = passiDelLivello(agente(3), {}, dati);
  assert.deepEqual(idPassi(l4), ['grado', 'abilita', 'riepilogo']);
  assert.equal(l4.passi.find((p) => p.id === 'abilita').punti, 5);

  const l12 = passiDelLivello(agente(11), {}, dati);
  assert.deepEqual(idPassi(l12), ['grado', 'abilita', 'riepilogo']);
  assert.match(l12.informazioni.join('\n'), /Azioni Principali per Round: 2/);

  // al 20° livello non si sale più
  assert.equal(passiDelLivello(agente(20), {}, dati), null);
});

test('passiDelLivello: il passo Tecniche Interiori compare quando il Talento le concede', () => {
  const senza = passiDelLivello(agente(2), { talentoLibero: { id: 'sempre-allerta' } }, dati);
  assert.deepEqual(idPassi(senza), ['talento', 'riepilogo']);
  const con = passiDelLivello(agente(2), { talentoLibero: { id: 'risorse-interiori' } }, dati);
  assert.deepEqual(idPassi(con), ['talento', 'tecniche', 'riepilogo']);
});

test('passiDelLivello: il passo Incantesimi compare con un Grado taumaturgico o con INT che sale', () => {
  const arcanista3 = { versione: 2, creazione: ARCANISTA, livelli: [
    { livello: 2, caratteristiche: { COS: 1, DES: 1 } }, { livello: 3, talentoLibero: { id: 'sempre-allerta' } },
  ] };
  assert.deepEqual(idPassi(passiDelLivello(arcanista3, {}, dati)), ['grado', 'abilita', 'riepilogo']);
  assert.deepEqual(idPassi(passiDelLivello(arcanista3, { grado: { classe: 'Arcanista' } }, dati)), ['grado', 'incantesimi', 'abilita', 'riepilogo']);
  // un Grado non taumaturgico non aggiunge incantesimi
  assert.deepEqual(idPassi(passiDelLivello(arcanista3, { grado: { classe: 'Agente' } }, dati)), ['grado', 'abilita', 'riepilogo']);
  // al 2° livello: +2 INT alza il Mod e quindi gli incantesimi liberi dell'Addestramento (2 + Mod INT)
  const arcanista1 = { versione: 2, creazione: ARCANISTA, livelli: [] };
  assert.deepEqual(idPassi(passiDelLivello(arcanista1, { caratteristiche: { COS: 2 } }, dati)), ['caratteristiche', 'riepilogo']);
  assert.deepEqual(idPassi(passiDelLivello(arcanista1, { caratteristiche: { INT: 2 } }, dati)), ['caratteristiche', 'incantesimi', 'riepilogo']);
});

test('descriviVoce e progressione: una riga leggibile per scelta e per livello', () => {
  assert.deepEqual(descriviVoce(voce(2), dati), ['Caratteristiche: DES +2']);
  const r5 = descriviVoce(voce(5), dati);
  assert.equal(r5.length, 1);
  assert.match(r5[0], /^Talento Libero: .+ \(Tempra\)$/);
  const r4 = descriviVoce(voce(4), dati, { Agente: 1 });
  assert.match(r4[0], /^Grado: Agente II — Talento a scelta Reazione Operativa; PV 1d6 = 4/);
  assert.equal(r4[1], 'Punti Abilità: Medicina +3, Sopravvivenza +2');

  const pr = progressione(agente(4), dati);
  assert.deepEqual(pr.map((x) => x.livello), [1, 2, 3, 4]);
  assert.equal(pr[0].righe[0], 'Creazione: Mishima · Avventuriero · Agente I');
  assert.ok(pr[2].righe.includes('Prove Salvezza +1'));
  assert.match(pr[3].righe[0], /Agente II/);
  assert.deepEqual(calcolaScheda(agente(4), dati).progressione, pr);
});

test('Talento con annotazione (Sport): obbligatoria, ma il Talento resta acquisibile nell’elenco', () => {
  const senza = validaLivello(agente(2), { talentoLibero: { id: 'sport' } }, dati);
  assert.ok(senza.some((e) => e.campo === 'talentoLibero' && e.tipo === 'incompleto' && /Sport: indica/.test(e.problema)));
  assert.deepEqual(validaLivello(agente(2), { talentoLibero: { id: 'sport', annotazione: 'Scherma' } }, dati), []);
  const candidato = prossimoLivello(agente(2), dati).talentiLiberi.find((t) => t.id === 'sport');
  assert.equal(candidato.ammesso, true);
  const s = calcolaScheda(applicaLivello(agente(2), { talentoLibero: { id: 'sport', annotazione: 'Scherma' } }), dati);
  assert.equal(s.talentiLiberi.find((t) => t.id === 'sport').annotazione, 'Scherma');
});

test('Scuole Mishima: Tecniche solo con l’iniziazione dichiarata, una sola Scuola', () => {
  const base = { talentoLibero: { id: 'risorse-interiori' } };
  const tecnicheLuna = ['meditazione-profonda', 'imposizione-della-mano-curativa', 'passo-dell-ombra', 'corsa-di-nomura'];
  const conScuola = { ...base, scuolaMishima: 'Luna', tecniche: tecnicheLuna };
  assert.deepEqual(validaLivello(agente(2), conScuola, dati), []);
  assert.ok(validaLivello(agente(2), { ...base, tecniche: tecnicheLuna }, dati).some((e) => /iniziazione/.test(e.problema)));
  const altraScuola = { ...conScuola, tecniche: [...tecnicheLuna.slice(0, 3), 'colpo-del-cobra'] };
  assert.ok(violazioni(validaLivello(agente(2), altraScuola, dati)).some((e) => /iniziazione/.test(e.problema)));
  const s = calcolaScheda(applicaLivello(agente(2), conScuola), dati);
  assert.deepEqual(s.scuolaMishima, { nome: 'Luna', livello: 3 });
  assert.equal(s.tecniche.length, 4);
  assert.ok(s.annotazioni.some((a) => /Iniziato alla Scuola Luna/.test(a)));
  assert.ok(validaLivello(agente(2), { ...conScuola, scuolaMishima: 'Inesistente' }, dati).length > 0);
});
