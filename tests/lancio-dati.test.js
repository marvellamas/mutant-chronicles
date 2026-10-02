// Dati dell'utility «Lancia un incantesimo»: incantesimi.json → meccanica, regole.json → lancio,
// effetti.lancio dei Talenti (tools/estrai_lancio.py; Magia sez. 1–3, 5–7, 12.3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';

const { dati, errori } = await datiReali();
const inc = (nome) => dati.incantesimi.incantesimi.find((i) => i.nome === nome).meccanica;

test('lancio: i dati reali passano il validatore', () => {
  assert.deepEqual(errori, []);
});

test('meccanica estratta dalle schede: esempi', () => {
  assert.deepEqual(inc('Irrobustire').azioni, { azioni_principali: 1 });
  assert.deepEqual(inc('Irrobustire').componenti, ['focus', 'gesto', 'invocazione']);
  assert.deepEqual(inc('Irrobustire').pm_utilizzabili, ['universali', 'fisici']);
  assert.equal(inc('Irrobustire').contatto, true);
  assert.deepEqual(inc('Irrobustire').anticipazione.aspetti.map((a) => [a.etichetta, a.categoria]), [['quantità di PV temporanei', 'valori'], ['durata', 'durata']]);
  assert.deepEqual([inc('Comando').componenti, inc('Comando').invocazione_obbligatoria], [['focus', 'gesto'], true]);
  assert.deepEqual(inc('Dardo Psichico').salvezza.tipi, ['Volontà']);
  assert.equal(inc('Esplosione Elementale').richiede_colpire, true);
  assert.equal(inc('Possessione').concentrazione, 'obbligatoria');
  assert.equal(inc('Mimetismo').concentrazione, 'a_scelta');
  assert.equal(inc('Cura Malattie').concentrazione, 'durante_il_lancio');
  assert.deepEqual(inc('Memoria').azioni, { tempo: 'Procedura fuori dal combattimento' });
  // ogni gradino è testo del paragrafo «Anticipazione:» della scheda
  for (const i of dati.incantesimi.incantesimi) {
    for (const a of i.meccanica.anticipazione?.aspetti ?? []) {
      assert.ok(i.meccanica.anticipazione.frase.replace('Mod. PS', 'Mod. PS').includes(a.gradino.split(', ')[0]), `${i.nome}: ${a.gradino}`);
    }
  }
});

test('Anticipazione: ogni aspetto ha un nome breve; il gradino intero resta per il tooltip', () => {
  const nomi = (n) => inc(n).anticipazione.aspetti.map((a) => a.nome);
  for (const i of dati.incantesimi.incantesimi) {
    for (const a of i.meccanica.anticipazione?.aspetti ?? []) assert.ok(a.nome && a.gradino, `${i.nome}: ${a.etichetta}`);
  }
  assert.deepEqual(nomi('Irrobustire'), ['PV temporanei', 'Durata']);
  assert.ok(dati.incantesimi.incantesimi.some((i) => i.meccanica.anticipazione?.aspetti.some((a) => a.nome === 'Precisione del numero')));
  assert.ok(dati.incantesimi.incantesimi.some((i) => i.meccanica.anticipazione?.aspetti.some((a) => a.nome === 'Elemento +1')));
  // pezzi che continuano l'aspetto precedente non sono aspetti a sé
  assert.deepEqual(nomi('Luce Mistica').includes('Sorgente su un oggetto'), true);
  assert.equal(inc('Cura Malattie').anticipazione.aspetti.find((a) => a.nome === 'Origini').gradino,
    'origini naturale → naturale e artificiale → naturale, artificiale e mistica → universale');
});

test('casi non estratti: nessun TODO(Davide) (E&L 17–18); Rigenerazione con la procedura rituale della sez. 25', () => {
  const conTodo = dati.incantesimi.incantesimi.filter((i) => Object.keys(i.meccanica).some((k) => k.startsWith('TODO('))).map((i) => i.nome);
  assert.deepEqual(conTodo, []);
  const rig = dati.incantesimi.incantesimi.find((i) => i.nome === 'Rigenerazione');
  // E&L del 01/10 sera e Magia sez. 25: la procedura è definita (A.39 punto 3)
  assert.equal(rig.meccanica.procedura_rituale.stato, 'definita');
  assert.deepEqual(rig.meccanica.procedura_rituale.versioni.map((v) => [v.livello, v.grado, v.ore, v.pm, v.reagenti]), [[9, 3, 3, 9, 1500], [10, 3, 3, 10, 1500], [12, 4, 4, 12, 2000], [15, 5, 6, 15, 2500], [18, 6, 8, 18, 3000]]);
});

test('regole.json → lancio: scala del Potere e Anticipazione (sez. 1 e 12.3)', () => {
  const L = dati.regole.lancio;
  assert.deepEqual(L.penalita_livello.fasce.map((f) => [f.fino_a, f.taumaturgo, f.altri]), [[3, 0, 0], [6, 0, -2], [9, -2, -4], [12, -4, -6], [15, -6, -8], [18, -8, -10]]);
  assert.deepEqual(L.anticipazione.penalita_taumaturgo, [0, -2, -4, -6, -8, -10]);
  assert.deepEqual([L.componenti.penalita, L.componenti.massimo], [-2, -6]);
});

test('validatore: effetto sconosciuto e concentrazione non valida sono errori leggibili', () => {
  const x = copia(dati);
  x.incantesimi.incantesimi[0].meccanica.concentrazione = 'forse';
  x.classi.classi.find((c) => c.nome === 'Arcanista').talenti_fissi[0].effetti.lancio.volare = 1;
  const e = validaDati(x).map((y) => `${y.chiave}: ${y.problema}`).join('\n');
  assert.match(e, /meccanica\.concentrazione: uno fra/);
  assert.match(e, /Armonizzazione Arcana\.effetti\.lancio\.volare: effetto sconosciuto/);
});
