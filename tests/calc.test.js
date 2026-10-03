import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  modOrdinario, modSalvezza, valoreAbilita, salvezza, puntiVita, puntiMagia, iniziativa,
  calcolaScheda, validaScelte, incantesimiLiberi, livelloMassimoIncantesimi,
} from '../src/calc.js';
import { datiReali, copia } from './helpers.js';

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
  // §2.13 del Giocatore del 29/09: Percezione 2, Tecnologia 2, Cultura 2, Raggirare 4; ridotto ai
  // 5 punti per Grado (E&L del 03/10/2026): Percezione 2, Raggirare 3
  puntiAbilitaLiberi: {
    'Percezione': 2, 'Raggirare': 3,
  },
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

  // §2.17: «la Furtività […] vale 2 + 6 + 0 + 1 = VA 9, al limite Professionale del I Grado»
  const furt = s.abilita.find((a) => a.nome === 'Furtività');
  assert.deepEqual(
    { mod: furt.mod, base: furt.base, corporazione: furt.corporazione, avanzamento: furt.avanzamento, totale: furt.totale, competenza: furt.competenza, limite: furt.limite },
    { mod: 2, base: 6, corporazione: 0, avanzamento: 1, totale: 9, competenza: 'P', limite: 9 },
  );
  // §2.13 (tabella dell'esempio): Avanzamento = Classe + punti liberi; VA del testo
  const ab = (n) => s.abilita.find((a) => a.nome === n);
  // 5 punti per Grado, E&L del 03/10/2026: senza i punti liberi su Tecnologia e Cultura, Raggirare +3
  assert.deepEqual(['Furtività', 'Percezione', 'Tecnologia', 'Armi leggere', 'Cultura', 'Raggirare'].map((n) => ab(n).avanzamento), [1, 3, 0, 1, 1, 4]);
  // «Percezione: 2 + 7 + 0 + 3 = VA 12 […] Medicina è G e parte da 2 + 5 = VA 7»; con 5 punti per Grado
  // (E&L del 03/10/2026) Raggirare 0 + 7 + 0 + 4 = VA 11 (era 12), Tecnologia 0 + 6 + 0 + 0 = VA 6 (era 8),
  // Cultura 0 + 6 + 0 + 1 = VA 7 (era 9)
  assert.deepEqual(['Percezione', 'Raggirare', 'Tecnologia', 'Cultura', 'Armi leggere', 'Medicina'].map((n) => ab(n).totale), [12, 11, 6, 7, 9, 7]);
  assert.deepEqual(['Percezione', 'Raggirare', 'Tecnologia', 'Medicina', 'Potere'].map((n) => ab(n).competenza), ['S', 'S', 'P', 'G', 'N']);
  // §2.17 (Giocatore del 29/09): Mishima riceve +1 ad Armi da guerra, non più ad Armi da mischia.
  assert.equal(s.abilita.find((a) => a.nome === 'Armi da guerra').corporazione, 1);
  assert.equal(s.abilita.find((a) => a.nome === 'Armi da mischia').corporazione, 0);
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
    // limiti del I Grado (§2.13 del 29/09): ogni punto aumenta il VA personale
    puntiAbilitaLiberi: { 'Armi da mischia': 2, 'Percezione': 3 }, // 5 punti per Grado, E&L del 03/10/2026
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

test('§2.13 (29/09): ogni punto libero deve aumentare il VA personale, entro il limite della categoria al I Grado', () => {
  // Furtività (P) è già a 9 = limite P del I Grado con il solo +1 di Classe: nessun punto la aumenta
  const e = validaScelte({ ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 2, 'Raggirare': 1, 'Furtività': 2 } }, dati);
  const furt = e.find((x) => x.campo === 'puntiAbilitaLiberi.Furtività');
  assert.deepEqual([furt.tipo, furt.inattivi], ['violazione', 2]);
  assert.match(furt.problema, /limite 9/);
  // Percezione (S): 2 + 7 + 0 + 1 = 10, due punti portano a 12 = limite S; il terzo non conta
  const p3 = validaScelte({ ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 3, 'Raggirare': 2 } }, dati);
  assert.deepEqual(p3.filter((x) => x.inattivi).map((x) => [x.campo, x.inattivi]), [['puntiAbilitaLiberi.Percezione', 1]]);
  // il punto inattivo non entra nel VA (non si accantona)
  assert.equal(calcolaScheda({ ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 3, 'Raggirare': 2 } }, dati).abilita.find((a) => a.nome === 'Percezione').liberi, 2);
  assert.deepEqual(validaScelte(MISHIMA_AGENTE, dati), []);
});

test('§2.13: niente punti liberi su un\'Abilità con VA < 1', () => {
  // Con le basi da 3 a 7 (Doc del 29/09/2026) nessun VA scende sotto 1 con i dati reali: il caso si
  // prova su una copia dei dati con la base delle Non competenti a 0 (e il loro limite invariato).
  const d = copia(dati);
  d.regole.competenze.categorie.N.base = 0;
  // Mishima Agente (N: Armi pesanti, Armi da guerra, Potere, Rituali): Armi pesanti = FOR 6 (+1) + 0 = 1
  // → ammessa; Rituali = INT 5 (0) + 0 = 0 → vietata; Potere = SAG 7 (+2) + 0 = 2 → ammessa.
  const puntiAbilitaLiberi = { 'Rituali': 1, 'Armi pesanti': 1, 'Potere': 1, 'Percezione': 2 }; // 5 punti (E&L del 03/10/2026)
  const e = validaScelte({ ...MISHIMA_AGENTE, puntiAbilitaLiberi }, d);
  assert.deepEqual(e.map((x) => x.campo), ['puntiAbilitaLiberi.Rituali']);
  assert.match(e[0].problema, /VA 0/);
});

test('§2.13: il VA per i punti liberi include il +1 di Classe (§3.1: prima i punti di Classe)', () => {
  // Con le basi da 3 a 7 il caso non si presenta con i dati reali: copia con le basi P e N a 0.
  const d = copia(dati);
  d.regole.competenze.categorie.P.base = 0;
  d.regole.competenze.categorie.N.base = 0;
  // Capitol (FOR 5) Taumaturgo Custode (Atletica P, Armi pesanti N):
  // Atletica = FOR 0 + base 0, ma è Abilità di Classe (+1) → VA 1 → ammessa;
  // Armi pesanti = FOR 0 + base 0, non di Classe → VA 0 → vietata.
  const base = { corporazione: 'Capitol', puntiCaratteristica: { INT: 2, SAG: 2, CAR: 1 }, addestramento: 'Taumaturgo', classe: 'Custode' };
  const altri = { 'Armi da mischia': 2, 'Difese': 2 }; // con il punto in prova, 5 punti (E&L del 03/10/2026)
  const ok = validaScelte({ ...base, puntiAbilitaLiberi: { 'Atletica': 1, ...altri } }, d);
  assert.deepEqual(ok, []);
  const no = validaScelte({ ...base, puntiAbilitaLiberi: { 'Armi pesanti': 1, ...altri } }, d);
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

test('Taumaturgo: PM con il dado massimizzato, incantesimi liberi 2 + Mod INT, quote di Classe', () => {
  const scelte = {
    corporazione: 'Fratellanza', // INT 5, SAG 6
    puntiCaratteristica: { INT: 2, SAG: 1, COS: 2 },
    addestramento: 'Taumaturgo',
    classe: 'Arcanista',
    puntiAbilitaLiberi: { 'Potere': 2, 'Rituali': 2, 'Cultura': 1 }, // 5 punti per Grado, E&L del 03/10/2026
  };
  const s = calcolaScheda(scelte, dati);
  assert.deepEqual(s.errori, []);
  // decisione 6 del master: al 1° livello anche il dado dei PM è massimizzato (5 + 1d4 → 9)
  assert.equal(s.pm, 7 + 5 + 4);
  assert.equal(s.pv, 7 + 1 + 4);
  assert.equal(s.incantesimi.liberi, 2 + 2);
  assert.deepEqual(s.incantesimi.diClasse, { Fisica: 3, Mentale: 3, Spirituale: 3 });
  assert.equal(s.incantesimi.livelloMassimo, 3);
});

test('decisione 2 del master: gli incantesimi liberi «2 + Mod INT» sono almeno 1', () => {
  const formula = dati.regole.taumaturgo.incantesimi_liberi;
  assert.equal(incantesimiLiberi(-4, formula), 1); // INT 1
  assert.equal(incantesimiLiberi(-1, formula), 1); // INT 4
  assert.equal(incantesimiLiberi(0, formula), 2);
  assert.equal(incantesimiLiberi(3, formula), 5);
});

test('decisione 5 del master: livello massimo degli incantesimi dalla tabella per Gradi', () => {
  const r = dati.regole;
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((g) => livelloMassimoIncantesimi(g, r)), [0, 3, 8, 11, 14, 17, 18]);
  assert.match(r.taumaturgo._nota_livello_massimo, /3 volte i Gradi/); // la nota cita la discrepanza col manuale
  // è un dato: cambiando la tabella cambia il risultato
  const d = structuredClone(r);
  d.taumaturgo.livello_massimo_per_gradi[1].livello = 6;
  assert.equal(livelloMassimoIncantesimi(2, d), 6);
});
