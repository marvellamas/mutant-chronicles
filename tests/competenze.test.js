// Categorie di competenza e limiti del VA personale (Giocatore, Doc del 29/09/2026, 23:45: §1.2.1, §2.3,
// §2.13, §8.3, §8.4, §8.7). Gli esempi e le tabelle del manuale sono test (CLAUDE.md, principio 5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { applicaCompletamento, validaCompletamento, puntiDaCompletare } from '../src/avanzamento.js';
import { competenzaDi, baseIniziale, limiteAbilita, vaPersonale, puntiUtili } from '../src/competenze.js';
import { datiReali, conPuntiLiberi } from './helpers.js';

const { dati } = await datiReali();
const R0 = dati;
const R = dati.regole;
const classe = (nome) => dati.classi.classi.find((c) => c.nome === nome);
const lim = (abilita, ...classi) => limiteAbilita(abilita, classi.map(([n, grado]) => ({ def: classe(n), grado })), R);

test('§8.3: con una sola Classe le formule del §8.7 danno la tabella dei limiti', () => {
  // «le formule restituiscono esattamente la tabella del §8.3»
  const tabella = { S: [12, 14, 16, 18, 20, 22], P: [9, 11, 13, 15, 17, 19], G: [7, 9, 11, 13, 15, 17], N: [5, 7, 9, 11, 13, 15] };
  // Agente: Percezione S, Furtività P, Medicina G, Potere N
  const esempio = { S: 'Percezione', P: 'Furtività', G: 'Medicina', N: 'Potere' };
  for (const [cat, righe] of Object.entries(tabella)) {
    righe.forEach((atteso, i) => {
      const l = lim(esempio[cat], ['Agente', i + 1]);
      assert.deepEqual([l.valore, l.categoria], [atteso, cat], `${cat} al Grado ${i + 1}`);
    });
  }
});

test('§2.3: basi iniziali dalla prima Classe (S 7, P 6, G 5, N 3), un solo profilo per Classe', () => {
  const agente = classe('Agente');
  assert.deepEqual(['Percezione', 'Furtività', 'Medicina', 'Potere'].map((n) => [competenzaDi(agente, n), baseIniziale(agente, n, R)]),
    [['S', 7], ['P', 6], ['G', 5], ['N', 3]]);
  assert.equal(competenzaDi(agente, 'Cucina'), null);
});

test('§8.7: esempi del multiclasse del manuale', () => {
  // «Pilota I e Agente I»: G = 2; Pilotare S per il Pilota → 10 + 2 + 1 = 13
  assert.deepEqual([lim('Pilotare', ['Pilota', 1], ['Agente', 1]).valore, lim('Pilotare', ['Pilota', 1], ['Agente', 1]).categoria], [13, 'S']);
  // Tecnologia: S per il Pilota (10 + 2 + 1 = 13), P per l'Agente (7 + 2 + 1 = 10): vale il più alto
  const tec = lim('Tecnologia', ['Pilota', 1], ['Agente', 1]);
  assert.deepEqual([tec.valore, tec.categoria, tec.classi], [13, 'S', ['Pilota']]);
  // «Pilota V e Agente I»: G = 6; Cultura G per il Pilota (5 + 12 = 17), P per l'Agente (7 + 6 + 1 = 14)
  const cul = lim('Cultura', ['Pilota', 5], ['Agente', 1]);
  assert.deepEqual([cul.valore, cul.categoria], [17, 'G']);
  // non si sommano i limiti e non si uniscono gS e gP: Difese P per entrambe → 7 + G + gP con gP = 2
  assert.equal(lim('Difese', ['Agente', 1], ['Soldato', 1]).valore, 11);
});

test('§8.4: progressione massima di un’Abilità Specializzata, VA grezzo e VA personale riga per riga', () => {
  // Corpo a corpo (S per il Lottatore): Base 7 + Corporazione 1; Mod +2 → +4 (livello 2) → +5 (livello 6);
  // Avanzamento = +1 di Classe per Grado + 1 punto alla creazione, al 16° e al 20°
  const righe = [
    // [livello, Grado, Mod, Avanzamento, grezzo, personale]
    [1, 1, 2, 2, 12, 12], [2, 1, 4, 2, 14, 12], [4, 2, 4, 3, 15, 14], [6, 2, 5, 3, 16, 14],
    [8, 3, 5, 4, 17, 16], [12, 4, 5, 5, 18, 18], [16, 5, 5, 7, 20, 20], [20, 6, 5, 9, 22, 22],
  ];
  for (const [livello, grado, mod, avanz, grezzo, personale] of righe) {
    assert.equal(mod + 7 + 1 + avanz, grezzo, `grezzo al ${livello}°`);
    assert.equal(vaPersonale(grezzo, lim('Corpo a corpo', ['Lottatore', grado]).valore), personale, `personale al ${livello}°`);
  }
  // i punti liberi della tabella aumentano il VA personale nell'evento in cui si spendono
  assert.deepEqual(puntiUtili(11, 12, 1), { utili: 1, inattivi: 0 }); // creazione: 2 + 8 + 1 = 11 → 12
  assert.deepEqual(puntiUtili(19, 20, 1), { utili: 1, inattivi: 0 }); // 16°: 5 + 8 + 6 = 19 → 20
  assert.deepEqual(puntiUtili(21, 22, 1), { utili: 1, inattivi: 0 }); // 20°: 5 + 8 + 8 = 21 → 22
  // un punto in più al 6° sarebbe inattivo: grezzo 16 già oltre il limite 14
  assert.deepEqual(puntiUtili(16, 14, 1), { utili: 0, inattivi: 1 });
});

test('file salvato con le regole del 27/09: si apre senza perdere scelte, i punti inattivi si riassegnano con «Assegna»', () => {
  // regole a 10 punti per Grado, quelle del file di collaudo corrente (dal 03/10 sono 5: E&L)
  const dati = conPuntiLiberi(R0, 10);
  const testo = readFileSync(new URL('collaudo/regole-27-09/b_fratellanza_arcanista_l12.json', import.meta.url), 'utf8');
  const p = deserializzaPersonaggio(testo);
  const { scelte, avvisi } = normalizza(p.creazione, dati);
  // nessun punto tolto al caricamento
  assert.deepEqual(avvisi, []);
  assert.deepEqual(scelte.puntiAbilitaLiberi, p.creazione.puntiAbilitaLiberi);
  // riesportato senza modifiche, è lo stesso file
  assert.equal(serializza(scelte, { versioniDati: JSON.parse(testo).versioni_dati, livelli: p.livelli, sessione: p.sessione }), testo);
  let pg = { creazione: scelte, livelli: p.livelli };
  const s = calcolaScheda(pg, dati);
  // la scheda funziona (niente errori, stessi PV, PM e incantesimi); l'avviso «Regole aggiornate» elenca
  // per ogni evento i punti che non aumentano più il VA
  assert.deepEqual(s.errori, []);
  assert.deepEqual([s.pv, s.pm, s.incantesimi.conosciuti.length], [33, 41, 31]);
  assert.deepEqual(s.completamenti.map((c) => [c.livello, c.mancanti, c.inattivi]), [
    [1, 8, { 'Artefatti': 1, 'Occultismo': 2, 'Oratoria': 2, 'Scienza': 2, 'Tecnologia': 1 }],
    [4, 4, { 'Rituali': 1, 'Percezione': 1, 'Scienza': 1, 'Tecnologia': 1 }],
    [8, 2, { 'Percezione': 1, 'Tecnologia': 1 }],
    [12, 1, { 'Artefatti': 1 }],
  ]);
  // riassegnazione come nel file di collaudo corrente, un evento alla volta dal più vecchio
  const corrente = deserializzaPersonaggio(readFileSync(new URL('collaudo/b_fratellanza_arcanista_l12.json', import.meta.url), 'utf8'));
  const dopo = { 1: corrente.creazione.puntiAbilitaLiberi, ...Object.fromEntries(corrente.livelli.filter((v) => v.puntiAbilita).map((v) => [v.livello, v.puntiAbilita])) };
  while (puntiDaCompletare(pg, dati).length) {
    const [ev] = puntiDaCompletare(pg, dati);
    const prima = ev.livello === 1 ? pg.creazione.puntiAbilitaLiberi : pg.livelli.find((v) => v.livello === ev.livello).puntiAbilita;
    // punti nuovi = punti del file corrente meno quelli che restano
    const restano = Object.fromEntries(Object.entries(prima).map(([a, n]) => [a, n - (ev.inattivi[a] ?? 0)]));
    const nuovi = Object.fromEntries(Object.entries(dopo[ev.livello]).map(([a, n]) => [a, n - (restano[a] ?? 0)]).filter(([, n]) => n > 0));
    assert.deepEqual(validaCompletamento(pg, ev.livello, nuovi, dati), [], `evento ${ev.livello}`);
    pg = applicaCompletamento(pg, ev.livello, nuovi, ev.inattivi);
  }
  assert.deepEqual(pg.creazione.puntiAbilitaLiberi, corrente.creazione.puntiAbilitaLiberi);
  assert.deepEqual(pg.livelli, corrente.livelli);
  const fine = calcolaScheda(pg, dati);
  assert.deepEqual([fine.errori, fine.completamenti], [[], []]);
});
