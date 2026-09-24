import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  modOrdinario, modSalvezza, valoreAbilita, salvezza, puntiVita, puntiMagia, iniziativa,
  calcolaScheda, validaScelte,
} from '../src/calc.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const tabOrd = dati.caratteristiche.modificatore_ordinario;
const tabSal = dati.caratteristiche.modificatore_salvezza;
const classe = (nome) => dati.classi.classi.find((c) => c.nome === nome);

// Manuale del Giocatore §2.1, §2.13, §2.14, §2.17
const MISHIMA_AGENTE = {
  corporazione: 'Mishima',
  puntiCaratteristica: { FOR: 1, COS: 2, DES: 1, SAG: 1 },
  addestramento: 'Avventuriero',
  classe: 'Agente',
  puntiAbilitaLiberi: { 'Furtività': 2, 'Percezione': 2, 'Medicina': 1 },
};

test('§2.1 modificatore ordinario: valore − 5', () => {
  for (let v = 1; v <= 10; v++) assert.equal(modOrdinario(v, tabOrd), v - 5);
  assert.throws(() => modOrdinario(11, tabOrd), RangeError);
});

test('§1.2.3 modificatore per le Salvezze', () => {
  const atteso = [-2, -2, -1, -1, 0, 1, 1, 2, 2, 3];
  atteso.forEach((m, i) => assert.equal(modSalvezza(i + 1, tabSal), m));
});

test('formule elementari', () => {
  assert.equal(valoreAbilita({ mod: 2, base: 4, corporazione: 0, avanzamento: 3 }), 9);
  assert.equal(salvezza({ base8: 8, modSpecifico: 1, addestramento: 1, corporazione: 1, avanzamento: 0 }), 11);
  assert.equal(iniziativa(2, 0), 2);
  assert.equal(puntiVita(6, classe('Agente'), { dadoMassimizzato: true }), 16);
  assert.equal(puntiVita(6, classe('Agente'), { dadoMassimizzato: false, tiro: 3 }), 13);
  assert.throws(() => puntiVita(6, classe('Agente'), { dadoMassimizzato: false }), RangeError);
  assert.equal(puntiMagia(7, classe('Agente')), 9);
  assert.equal(puntiMagia(7, classe('Arcanista'), { tiro: 4 }), 16);
  assert.throws(() => puntiMagia(7, classe('Arcanista')), RangeError);
});

test('esempio del manuale: Mishima Avventuriero Agente (§2.14, §2.17)', () => {
  const s = calcolaScheda(MISHIMA_AGENTE, dati);
  assert.deepEqual(s.errori, []);
  assert.equal(s.completa, true);

  const valori = Object.fromEntries(Object.entries(s.caratteristiche).map(([k, v]) => [k, v.valore]));
  assert.deepEqual(valori, { FOR: 6, COS: 6, DES: 7, INT: 5, SAG: 7, CAR: 5 });

  assert.equal(s.pv, 16);
  assert.equal(s.pm, 9);
  assert.equal(s.salvezze.tempra.totale, 10);
  assert.equal(s.salvezze.riflessi.totale, 11);
  assert.equal(s.salvezze.volonta.totale, 9);
  assert.equal(s.salvezze.magia.totale, 10);
  assert.equal(s.iniziativa, 2);

  const furt = s.abilita.find((a) => a.nome === 'Furtività');
  assert.deepEqual(
    { mod: furt.mod, base: furt.base, corporazione: furt.corporazione, avanzamento: furt.avanzamento, totale: furt.totale },
    { mod: 2, base: 4, corporazione: 0, avanzamento: 3, totale: 9 },
  );
  // §2.13: le altre tre Abilità dell'Agente conservano il +1 di Classe; Medicina ha solo il punto libero.
  const av = (n) => s.abilita.find((a) => a.nome === n).avanzamento;
  assert.equal(av('Percezione'), 3);
  assert.equal(av('Medicina'), 1);
  assert.equal(av('Armi leggere'), 1);
  assert.equal(av('Cultura'), 1);
  assert.equal(av('Raggirare'), 1);
  // §2.17: Mishima riceve +1 ad Armi da mischia.
  assert.equal(s.abilita.find((a) => a.nome === 'Armi da mischia').corporazione, 1);
  assert.equal(s.abilita.length, 24);
  assert.equal(s.talenti.length, 1);
  assert.equal(s.talenti[0].nome, 'Fuoco Controllato');
});

test('§1.2.3: Bauhaus Assaltatore con COS 7 ha Tempra 11', () => {
  const s = calcolaScheda({
    corporazione: 'Bauhaus', // COS iniziale 6
    puntiCaratteristica: { COS: 1, FOR: 2, DES: 2 },
    addestramento: 'Combattente',
    classe: 'Assaltatore',
    puntiAbilitaLiberi: { 'Armi da guerra': 2, 'Difese': 2, 'Percezione': 1 },
  }, dati);
  assert.deepEqual(s.errori, []);
  assert.equal(s.caratteristiche.COS.valore, 7);
  const t = s.salvezze.tempra;
  assert.deepEqual([t.base8, t.modSpecifico, t.addestramento, t.avanzamento, t.corporazione, t.totale], [8, 1, 1, 0, 1, 11]);
});

// --- validazione delle scelte ---------------------------------------------------------------

const campi = (errori) => errori.map((e) => e.campo);

test('§2.1: nessuna Caratteristica oltre 7 alla creazione', () => {
  // Mishima DES iniziale 6: +2 porta a 8
  const e = validaScelte({ ...MISHIMA_AGENTE, puntiCaratteristica: { FOR: 1, COS: 1, DES: 2, SAG: 1 } }, dati);
  assert.ok(e.some((x) => x.campo === 'puntiCaratteristica.DES' && x.tipo === 'violazione'), JSON.stringify(e));
  // esattamente 7 è ammesso
  assert.deepEqual(validaScelte(MISHIMA_AGENTE, dati), []);
});

test('§2.1: i punti Caratteristica non possono essere negativi né superare 5', () => {
  const neg = validaScelte({ ...MISHIMA_AGENTE, puntiCaratteristica: { FOR: 3, COS: 2, DES: 1, CAR: -1 } }, dati);
  assert.ok(campi(neg).includes('puntiCaratteristica.CAR'));
  const troppi = validaScelte({ ...MISHIMA_AGENTE, puntiCaratteristica: { FOR: 2, COS: 2, DES: 1, SAG: 1 } }, dati);
  assert.ok(troppi.some((x) => x.campo === 'puntiCaratteristica' && x.tipo === 'violazione'));
  const pochi = validaScelte({ ...MISHIMA_AGENTE, puntiCaratteristica: { FOR: 1 } }, dati);
  assert.ok(pochi.some((x) => x.campo === 'puntiCaratteristica' && x.tipo === 'incompleto'));
});

test('§2.13: Avanzamento iniziale al massimo 3, incluso il +1 di Classe', () => {
  // Furtività è Abilità di Classe dell'Agente: +1 +3 liberi = 4
  const e = validaScelte({ ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Furtività': 3, 'Percezione': 2 } }, dati);
  assert.ok(e.some((x) => x.campo === 'puntiAbilitaLiberi.Furtività' && /Avanzamento 4/.test(x.problema)), JSON.stringify(e));
  // su un'Abilità non di Classe 3 punti liberi sono ammessi
  const ok = validaScelte({ ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Medicina': 3, 'Percezione': 2 } }, dati);
  assert.deepEqual(ok, []);
});

test('§2.13: niente punti liberi su un\'Abilità con VA < 1', () => {
  // Mishima Avventuriero: Armi pesanti = FOR 6 (+1) + base 0 = 1 → ammessa;
  // Rituali = INT 5 (0) + base 0 = 0 → vietata; Potere = SAG 7 (+2) + 0 = 2 → ammessa.
  const e = validaScelte({ ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Rituali': 1, 'Armi pesanti': 1, 'Potere': 1, 'Percezione': 2 } }, dati);
  assert.deepEqual(e.map((x) => x.campo), ['puntiAbilitaLiberi.Rituali']);
  assert.match(e[0].problema, /VA 0/);
});

test('§2.13: il VA per i punti liberi include il +1 di Classe (§3.1: prima i punti di Classe)', () => {
  // Capitol (FOR 5) Taumaturgo Custode:
  // Atletica = FOR 0 + base 0, ma è Abilità di Classe (+1) → VA 1 → ammessa;
  // Armi pesanti = FOR 0 + base 0, non di Classe → VA 0 → vietata.
  const base = { corporazione: 'Capitol', puntiCaratteristica: { INT: 2, SAG: 2, CAR: 1 }, addestramento: 'Taumaturgo', classe: 'Custode', tiroDadoPM: 2 };
  const ok = validaScelte({ ...base, puntiAbilitaLiberi: { 'Atletica': 1, 'Potere': 2, 'Percezione': 2 } }, dati);
  assert.deepEqual(ok, []);
  const no = validaScelte({ ...base, puntiAbilitaLiberi: { 'Armi pesanti': 1, 'Potere': 2, 'Percezione': 2 } }, dati);
  assert.deepEqual(campi(no), ['puntiAbilitaLiberi.Armi pesanti']);
});

test('§2.12: la prima Classe deve appartenere all\'Addestramento', () => {
  const e = validaScelte({ ...MISHIMA_AGENTE, classe: 'Soldato' }, dati);
  assert.ok(e.some((x) => x.campo === 'classe' && /Combattente/.test(x.problema)));
  const s = calcolaScheda({ ...MISHIMA_AGENTE, classe: 'Soldato' }, dati);
  assert.equal(s.completa, false);
});

test('scelte inesistenti o incomplete non fanno crashare calcolaScheda', () => {
  assert.equal(calcolaScheda({}, dati).completa, false);
  assert.equal(calcolaScheda({ corporazione: 'Atlantide' }, dati).completa, false);
  const s = calcolaScheda({ ...MISHIMA_AGENTE, puntiAbilitaLiberi: {} }, dati);
  assert.equal(s.completa, false);
  assert.equal(s.pv, 16);
});

test('Taumaturgo: dado dei PM richiesto, incantesimi liberi 2 + Mod INT, quote di Classe', () => {
  const scelte = {
    corporazione: 'Fratellanza', // INT 5, SAG 6
    puntiCaratteristica: { INT: 2, SAG: 1, COS: 2 },
    addestramento: 'Taumaturgo',
    classe: 'Arcanista',
    puntiAbilitaLiberi: { 'Potere': 2, 'Occultismo': 2, 'Cultura': 1 },
  };
  const senzaTiro = calcolaScheda(scelte, dati);
  assert.ok(senzaTiro.errori.some((x) => x.campo === 'tiroDadoPM' && x.tipo === 'incompleto'));
  assert.equal(senzaTiro.pm, null);

  const s = calcolaScheda({ ...scelte, tiroDadoPM: 3 }, dati);
  assert.deepEqual(s.errori, []);
  assert.equal(s.pm, 7 + 5 + 3);
  assert.equal(s.pv, 7 + 1 + 4);
  assert.equal(s.incantesimi.liberi, 2 + 2);
  assert.deepEqual(s.incantesimi.diClasse, { Fisica: 3, Mentale: 3, Spirituale: 3 });
  assert.equal(s.incantesimi.livelloMassimo, 3);
});
