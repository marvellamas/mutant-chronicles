// A.160 (risposta di Davide del 16/10/2026): gli avversari costruiti con le regole dei personaggi ricevono
// 7 punti Abilità liberi alla creazione e a ogni Grado, come i PG. Il «5» del Manuale dei Mostri §5.2 era un
// refuso, corretto da Davide nella 0.4 e presente come 7 nella 0.9 che abbiamo letto il 16/10.
//
// Qui si blocca che l'app faccia così dappertutto: regole, creazione, avanzamento, bestiario umano
// (costruito come PG) e conversione «PG → nemico».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { nemicoDaPg } from '../src/nemico-da-pg.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();

/** I punti Abilità liberi previsti dai dati per un livello. */
const puntiDelLivello = (livello) => {
  const e = dati.regole.avanzamento.eventi.find((x) => x.livello === livello)?.eventi ?? [];
  const v = e.find((x) => x.startsWith('punti_abilita:'));
  return v ? Number(v.split(':')[1]) : 0;
};

test('A.160: 7 punti alla creazione e a ogni Grado, nei dati e per tutti', () => {
  assert.equal(dati.regole.creazione.punti_abilita_liberi, 7);
  // ogni livello che dà punti ne dà 7 (i livelli senza Grado non ne danno)
  const conPunti = dati.regole.avanzamento.eventi.filter((e) => e.eventi.some((x) => x.startsWith('punti_abilita:')));
  assert.ok(conPunti.length >= 5, 'i Gradi successivi danno punti');
  for (const e of conPunti) assert.equal(puntiDelLivello(e.livello), 7, `livello ${e.livello}`);
  // nessun «5» rimasto come regola nei dati
  assert.match(dati.regole.creazione._nota, /A\.160/, 'la nota cita la risposta del 16/10');
  assert.equal(dati.regole.creazione._nota.includes('punti_abilita:5'), false);
});

test('A.160: il manuale corretto (Mostri 0.9 §5.2) dice 7, non più 5', () => {
  const testo = readFileSync(new URL('../docs/manuali-txt/mostri.md', import.meta.url), 'utf8');
  const i = testo.indexOf('5.2 Umani e altri utilizzatori');
  assert.ok(i > 0, 'il §5.2 c’è');
  const paragrafo = testo.slice(i, i + 1200);
  assert.match(paragrafo, /7 punti Abilità liberi a ogni Grado, compreso il primo/);
  assert.equal(/5 punti Abilità liberi/.test(paragrafo), false, 'il refuso è sparito');
});

test('A.160: il bestiario umano è costruito come PG, con 7 punti per Grado', () => {
  // i nemici umani d'esempio sono generati con il motore dei PG (tools/genera_nemici_umani.mjs):
  // il loro VA viene dalla scheda, quindi dai 7 punti dei dati
  const cartella = new URL('../esempi/nemici/umani/', import.meta.url);
  const file = readdirSync(cartella).filter((f) => f.endsWith('.json'));
  assert.ok(file.length >= 3, 'il bestiario umano c’è');
  for (const f of file) {
    const n = JSON.parse(readFileSync(new URL(f, cartella), 'utf8'));
    assert.deepEqual(validaNemico(n, dati, f), [], `${f} valido`);
    assert.match(n.fonte, /costruito come PG/);
  }
  // e la generazione legge i punti dai dati, non da un numero scritto nel codice
  const gen = readFileSync(new URL('../tools/genera_nemici_umani.mjs', import.meta.url), 'utf8');
  assert.match(gen, /punti_abilita:\(\\d\+\)/, 'i punti si leggono da regole.json');
  assert.equal(/punti\s*=\s*5/.test(gen), false);
});

test('A.160: «PG → nemico» porta i VA del personaggio, senza ritarature', () => {
  // un PG d'esempio vero, come lo converte la plancia (il convertitore legge il file dell'export)
  const testo = readFileSync(new URL('../esempi/Torvald-Krane_liv6_2026-10-02.json', import.meta.url), 'utf8');
  const { nemico, avvisi } = nemicoDaPg(testo, dati);
  assert.deepEqual(avvisi, []);
  assert.deepEqual(validaNemico(nemico, dati, 'da-pg'), []);
  const p = deserializzaPersonaggio(testo);
  const scheda = calcolaScheda({ creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli ?? [] }, dati);
  // le Abilità convertite hanno lo stesso VA della scheda: i 7 punti liberi sono già dentro, senza ritarature
  for (const a of nemico.abilita ?? []) {
    const s = scheda.abilita.find((x) => x.nome === a.nome);
    assert.ok(s, `${a.nome} è un'Abilità della scheda`);
    assert.equal(a.va, s.effettivo ?? s.totale, `${a.nome}: stesso VA del PG`);
  }
  // e l'esempio del manuale (§2.13) con i 7 punti liberi resta quello: Percezione 12, Raggirare 11
  const agente = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const va = (nome) => agente.abilita.find((x) => x.nome === nome)?.totale;
  assert.equal(va('Percezione'), 12);
  assert.equal(va('Raggirare'), 11);
});
