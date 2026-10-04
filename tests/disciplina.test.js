// Disciplina del Lottatore (Giocatore §3.5.5): scelta permanente al I Grado, salvata nelle scelte
// (creazione o voce del livello), effetti strutturati in classi.json e usati da scheda e «Attacca!».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { nuoveScelte } from '../src/character.js';
import { risolviTalentoClasse } from '../src/avanzamento.js';
import { profiloSenzArmi, calcolaAttaccoRavvicinato, talentiAttacco, manovreRavvicinate } from '../src/attacco.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, tiro } from './personaggi.js';

const { dati } = await datiReali();
const N = 'Addestramento al Combattimento Senz’Armi';
const LOTTATORE = {
  ...nuoveScelte(), nome: 'Brutus', corporazione: 'Bauhaus', puntiCaratteristica: { FOR: 2, COS: 1, DES: 2 },
  addestramento: 'Combattente', classe: 'Lottatore', puntiEroe: tiro(5),
  // §2.13 del 29/09: ogni punto aumenta il VA personale entro i limiti del I Grado
  puntiAbilitaLiberi: { 'Corpo a corpo': 2, 'Percezione': 2, 'Medicina': 1, 'Sopravvivenza': 2 }, // 7 punti per Grado (A.90)
};
const con = (disciplina) => ({ ...LOTTATORE, parametriTalenti: { [N]: disciplina } });
const scheda = (creazione, livelli = []) => calcolaScheda({ creazione, livelli }, dati);
const pg = (s) => ({ scheda: s, sessione: {} });
const lottatore = dati.classi.classi.find((c) => c.nome === 'Lottatore');
const talento = (nome) => [...lottatore.talenti_fissi, ...lottatore.talenti_a_scelta].find((t) => t.nome === nome);

test('creazione: la Disciplina si sceglie al I Grado; senza, la scheda non è completa', () => {
  const s = scheda(LOTTATORE);
  assert.equal(s.completa, false);
  assert.ok(s.errori.some((e) => e.campo === `creazione.parametriTalenti.${N}` && e.tipo === 'incompleto'));
  assert.ok(scheda(con('volo')).errori.some((e) => /"volo" non è una Disciplina/.test(e.problema)));
  const p = scheda(con('potenza'));
  assert.deepEqual([p.completa, p.classi[0].talenti[0].parametroNome], [true, 'Potenza']);
});

test('Lottatore con Disciplina: il danno senz’armi viene dai dati (Potenza 1d8 ai Gradi I–II, 1d10 al III)', () => {
  const s = scheda(con('potenza'));
  const a = profiloSenzArmi(s, dati); // vale il dado della Disciplina, più alto dell'1d4 di base
  // il Lottatore di prova ha FOR 7: +1 al danno (§5.13)
  assert.deepEqual([a.danno.una_mano, a.dannoBase, a.dannoOrigine], ['1d8+1', '1d8', `${N} (Potenza)`]);
  const r = calcolaAttaccoRavvicinato(pg(s), a, {}, dati);
  assert.equal(r.danno.testo, '1d8+1');
  assert.deepEqual(r.avvisi, []);
  assert.ok(r.promemoria.some((x) => /−1 VA a Difese/.test(x)));
  // tabella per Grado: al III Grado nella Classe 1d10, al V 1d12
  const t = { ...talento(N), sceltaParametro: 'potenza' };
  assert.equal(risolviTalentoClasse(t, 3).effetti.attacco_ravvicinato.senz_armi.danno, '1d10');
  assert.equal(risolviTalentoClasse(t, 5).effetti.attacco_ravvicinato.senz_armi.danno, '1d12');
  assert.equal(risolviTalentoClasse({ ...t, sceltaParametro: 'rapidita' }, 1).effetti.attacco_ravvicinato.senz_armi.danno, '1d4');
});

test('Rapidità +3 Iniziativa; Controllo +2 alle Prove offensive di Corpo a corpo; Guardia +1 a Difese contro i ravvicinati', () => {
  const r = scheda(con('rapidita'));
  assert.equal(r.iniziativa, scheda(con('potenza')).iniziativa + 3);
  assert.deepEqual(r.vociIniziativa.at(-1), { etichetta: `${N} (Rapidità)`, valore: 3 });
  const c = scheda(con('controllo'));
  const nudo = profiloSenzArmi(c, dati);
  const imm = calcolaAttaccoRavvicinato(pg(c), nudo, { manovra: 'immobilizzare' }, dati);
  const normale = calcolaAttaccoRavvicinato(pg(c), nudo, {}, dati);
  assert.equal(imm.va_finale, normale.va_finale + 2);
  const g = scheda(con('guardia'));
  assert.deepEqual(talentiAttacco(g, dati, 'difese_ravvicinate').map((t) => t.e.va), [1]);
});

test('non Lottatore: danno senz’armi 1d4 più il bonus di FOR (E&L 12, A.22)', () => {
  const s = scheda(MISHIMA_AGENTE); // FOR 6: +1
  const nudo = profiloSenzArmi(s, dati);
  assert.deepEqual([nudo.danno.una_mano, nudo.dannoOrigine, nudo.bonusCaratteristica.sigla], ['1d4+1', 'base', 'FOR']);
  assert.deepEqual(calcolaAttaccoRavvicinato(pg(s), nudo, {}, dati).avvisi, []);
});

test('la Disciplina non si cambia dopo la conferma: un livello successivo non può riscriverla', () => {
  const livelli = [{ livello: 2, caratteristiche: { FOR: 1, COS: 1 } }, { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } }];
  const p = { creazione: con('potenza'), livelli };
  assert.equal(scheda(p.creazione, livelli).errori.length, 0);
  const aScelta = lottatore.talenti_a_scelta.find((t) => !t.requisito && !/Tecniche Interiori Supplementari|Risorse Interiori/.test(t.nome)).nome;
  const voce = { grado: { classe: 'Lottatore' }, tiroPV: tiro(4), talentoClasse: aScelta, puntiAbilita: { 'Armi da guerra': 3, 'Armi leggere': 2, 'Tecnologia': 2 }, // 7 punti per Grado (A.90)
  };
  const cambio = validaLivello(p, { ...voce, parametriTalenti: { [N]: 'rapidita' } }, dati);
  assert.ok(cambio.some((e) => e.tipo === 'violazione' && /una sola volta/.test(e.problema)), JSON.stringify(cambio));
  // su un livello senza Grado di Classe il campo non è nemmeno ammesso
  const p2 = { creazione: con('potenza'), livelli: [] };
  assert.ok(validaLivello(p2, { caratteristiche: { FOR: 1, COS: 1 }, parametriTalenti: { [N]: 'guardia' } }, dati).some((e) => e.campo === 'parametriTalenti'));
});

test('Combattimento Multiplo: Spazzata senz’armi contro tutti gli adiacenti, −4 contro due e −6 contro tre o più', () => {
  const s = { ...scheda(con('potenza')) };
  s.classi = [{ ...s.classi[0], talenti: [...s.classi[0].talenti, talento('Combattimento Multiplo')] }];
  assert.ok(manovreRavvicinate(s, dati).combattimento_multiplo);
  const nudo = profiloSenzArmi(s, dati);
  const base = calcolaAttaccoRavvicinato(pg(s), nudo, {}, dati).va_finale;
  assert.equal(calcolaAttaccoRavvicinato(pg(s), nudo, { manovra: 'combattimento_multiplo', bersagli: 3 }, dati).va_finale, base - 6);
  assert.equal(calcolaAttaccoRavvicinato(pg(s), nudo, { manovra: 'combattimento_multiplo', bersagli: 2 }, dati).va_finale, base - 4);
});
