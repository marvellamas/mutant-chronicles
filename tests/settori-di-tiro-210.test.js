import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 210 (17/11/2026), parte B — i settori di tiro delle armi di bordo.
//
// La M606 dello Scout ha un settore di rotazione di 120° (Veicoli 0.19 §10, E&L 11/11), l'app diceva 360°. I settori
// dichiarati dai manuali sono tutti nei dati, strutturati, e un test li confronta con il testo; il centro di quello dello
// Scout il manuale non lo dice (A.280): lo dice l'app, invece di lasciar credere che stia davanti.
//
// **Che cosa questo test NON prova, e va detto:** il motore della mappa non sa niente di settori di tiro (né di armi di bordo
// che sparano da una pedina): l'arco è un dato che si legge nella scheda del mezzo e nella tabella, non un controllo sul bersaglio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { testoManuale, testoEdizione } from '../tools/manuali.mjs';
import { testoArco } from '../src/veicoli.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const norm = (t) => t.replace(/\\/g, '').replace(/\*\*/g, '');
const VEICOLI = norm(testoEdizione('veicoli', '0.19'));
const NEVERLOST = norm(testoManuale('neverlost'));

test('la M606 dello Scout: il manuale dice ancora 120°, ma vale la A.280 del 18/11 (semicerchio frontale di 180°, FIAT LUX dei PG) e non più 360°', () => {
  assert.match(VEICOLI, /l’intera struttura ha un settore di rotazione orizzontale di 120°/);
  assert.match(VEICOLI, /Arma e protezione bassa sono smontabili per l’allestimento civile/);
  assert.match(VEICOLI, /non aumenta l’AR del veicolo o dell’occupante/);
  const m606 = dati.veicoli.profili.find((p) => p.id === 'asa-scout-mk4').armi.find((a) => /M606/.test(a.nome));
  assert.equal(m606.arco.gradi, 180, 'A.280, 18/11/2026: vale la risposta, non la frase del manuale');
  assert.equal(m606.arco.orientamento, 'frontale', 'A.280: 90° a sinistra e 90° a destra del muso');
  assert.equal(m606.arco.da_definire, undefined, 'la A.280 è risolta');
  assert.equal(m606.arco.precedente.gradi, 120, 'il 120° di prima resta scritto come storia');
  assert.match(m606.arco_di_tiro, /180°/);
  assert.doesNotMatch(m606.arco_di_tiro, /^360°/);
  assert.equal(m606.smontabile, true);
  assert.equal(m606.schermo.aggiunge_ar, false);
  assert.match(m606.schermo.testo, /Copertura soltanto nelle direzioni in cui scherma/);
  assert.equal(testoArco(m606), 'arco frontale 180°');
  // la 360° vecchia resta scritta come storia, con la sua fonte superata
  assert.match(m606.arco_di_tiro_precedente.testo, /360°/);
});

test('i settori della Neverlost sono quelli della scheda 1.6, strutturati', () => {
  assert.match(NEVERLOST, /torrette dei mitragliatori 360°, salvo ostacoli; cannone arco frontale 90°; lanciamissili arco frontale 180°/);
  const armi = dati.veicoli.profili.find((p) => p.id === 'neverlost').armi;
  const per = Object.fromEntries(armi.map((a) => [a.nome, [a.arco.gradi, a.arco.orientamento]]));
  assert.deepEqual(per, {
    'Mitragliatore navale 1': [360, 'libero'], 'Mitragliatore navale 2': [360, 'libero'],
    'Cannone energetico': [90, 'frontale'], 'Lanciamissili antinave': [180, 'frontale'],
  });
  assert.equal(testoArco(armi.find((a) => /Cannone/.test(a.nome))), 'arco frontale 90°');
  assert.equal(testoArco(armi.find((a) => /navale 1/.test(a.nome))), '360°, limitato dagli ostacoli reali');
});

test('ogni arma di bordo del catalogo con un arco di tiro lo ha strutturato (nessuna resta solo testo)', () => {
  let viste = 0;
  for (const p of dati.veicoli.profili) {
    for (const a of p.armi ?? []) {
      if (a.arco_di_tiro === undefined) continue;
      viste += 1;
      assert.ok(Number.isInteger(a.arco?.gradi), `${p.id} · ${a.nome}: arco strutturato`);
    }
  }
  assert.equal(viste, 5, 'Scout 1, Neverlost 4: il test guarda davvero le armi');
});

test('il validatore rifiuta un settore sotto i 360° senza centro e senza la domanda che lo definisce', () => {
  const copia = JSON.parse(JSON.stringify(dati));
  const m606 = copia.veicoli.profili.find((p) => p.id === 'asa-scout-mk4').armi[0];
  m606.arco.gradi = 120; m606.arco.orientamento = null; // un settore sotto i 360° senza centro (com'era prima della A.280)
  delete m606.arco.da_definire;
  const errori = validaDati(copia).map((e) => JSON.stringify(e)).join('\n');
  assert.match(errori, /arco\.da_definire/, 'un settore senza centro deve dire quale domanda lo definisce');
  const ok = validaDati(JSON.parse(JSON.stringify(dati)));
  assert.equal(ok.filter((e) => /arco/.test(JSON.stringify(e))).length, 0, 'i dati veri passano');
  // e un arco fuori scala
  const c2 = JSON.parse(JSON.stringify(dati));
  c2.veicoli.profili.find((p) => p.id === 'neverlost').armi[2].arco.gradi = 400;
  assert.match(validaDati(c2).map((e) => JSON.stringify(e)).join('\n'), /arco\.gradi/);
});

test('la tabella delle armi di bordo ha la colonna «Arco di tiro»', () => {
  const ui = readFileSync(new URL('../src/ui/veicoli.js', import.meta.url), 'utf8');
  assert.match(ui, /'Operatore', 'Arco di tiro'/);
  assert.match(ui, /testoArco\(a\)/);
  void readdirSync;
});
