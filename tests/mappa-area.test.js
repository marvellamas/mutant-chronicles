// Mappa di battaglia, lotto 5 (docs/battlemap/piano.md): area raggiungibile (ricerca a costo minimo con muri, terreno
// difficile, alleati, avversari e ingombri), fasce Passo/Corsa/Scatto, muri a pennello e rettangolo, movimenti nel
// Round, pila «annulla» (Ctrl+Z) e prestazioni su 80 × 60 Q con 20 token.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { nuovaMaschera, rettangolo, impostaCella, inBase64, daBase64, cella, conta } from '../src/mappa/celle.js';
import { areaRaggiungibile, costoVerso, percorso, fasceRimaste, fasciaDi, celleArea, stessaParte } from '../src/mappa/area.js';
import { pennellataMuri, rettangoloMuri, trattoMuri, muriProvvisori, chiudiTrattoMuri } from '../src/mappa/muri.js';
import { muoviToken, usatoNelRound, mossoNelRound, annullaUltima, annullaUltimoMovimento, cambiaTokenAnnullabile, nuovoTurno, turnoDi } from '../src/mappa/annulla.js';
import { pennellata } from '../src/mappa/nebbia.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { movimentoNemico } from '../src/mappa/partecipanti.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const REG = dati.mappa.movimento;
const C = 12, R = 10;
const vuota = () => nuovaMaschera(C, R);
const area = (o) => areaRaggiungibile({ colonne: C, righe: R, muri: vuota(), terreno: vuota(), token: [], massimo: 6, regole: REG, ...o });
const chi = (q, ingombro = 1, lato = 'pg') => ({ id: 'me', q, ingombro, lato });

test('regole nei dati, confermate da Davide il 06/10 (A.124, A.127–A.129); resta il TODO(Davide) A.134', () => {
  assert.equal(REG.costo_diagonale, 1);
  assert.equal(REG.terreno_difficile_moltiplicatore, 2);
  assert.deepEqual([REG.attraversa_alleati, REG.attraversa_avversari, REG.fermarsi_su_alleato, REG.taglio_angoli_muri], [true, false, false, false]);
  const testo = JSON.stringify(dati.mappa.movimento);
  for (const a of ['A.124', 'A.127', 'A.128', 'A.129']) assert.ok(testo.includes(a), a);
  // A.124: diagonale 1 Q confermata, il TODO degli angoli è la A.134
  assert.equal(REG.diagonali_alterne, false);
  assert.equal(REG['TODO(Davide) diagonali'], undefined);
  assert.match(REG['TODO(Davide) angoli'], /^A.134/);
  const d = copia(dati);
  d.mappa.movimento.taglio_angoli_muri = 'no';
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'movimento.taglio_angoli_muri'));
});

test('area aperta: diagonale 1 Q (Chebyshev), percorso e limiti', () => {
  const a = area({ chi: chi([5, 5]) });
  assert.equal(costoVerso(a, [5, 5]), 0);
  assert.equal(costoVerso(a, [8, 8]), 3, 'tre diagonali');
  assert.equal(costoVerso(a, [11, 5]), 6);
  assert.equal(costoVerso(a, [0, 5]), 5);
  assert.equal(costoVerso(a, [11, 0]), 6, 'max(6, 5)');
  assert.equal(costoVerso(a, [12, 5]), Infinity, 'fuori dalla griglia');
  const p = percorso(a, [8, 7]);
  assert.deepEqual(p[0], [5, 5]);
  assert.deepEqual(p.at(-1), [8, 7]);
  assert.equal(p.length, 4);
  for (let i = 1; i < p.length; i++) assert.ok(Math.max(Math.abs(p[i][0] - p[i - 1][0]), Math.abs(p[i][1] - p[i - 1][1])) === 1, 'un Q alla volta');
  // con il limite di 3 Q
  const corto = area({ chi: chi([5, 5]), massimo: 3 });
  assert.equal(costoVerso(corto, [8, 5]), 3);
  assert.equal(costoVerso(corto, [9, 5]), Infinity);
});

test('diagonali alterne 1/2/1 se i dati lo chiedono', () => {
  const a = area({ chi: chi([0, 0]), massimo: 20, regole: { ...REG, diagonali_alterne: true } });
  assert.equal(costoVerso(a, [1, 1]), 1);
  assert.equal(costoVerso(a, [2, 2]), 3);
  assert.equal(costoVerso(a, [3, 3]), 4);
  assert.equal(costoVerso(a, [4, 4]), 6);
});

test('muri: si girano attorno, niente angoli tagliati', () => {
  // muro verticale nella colonna 6, righe 0–8 (un varco in basso)
  const muri = rettangolo(vuota(), C, R, 6, 0, 6, 8, true);
  const a = area({ chi: chi([4, 4]), muri, massimo: 20 });
  assert.equal(costoVerso(a, [6, 4]), Infinity, 'sul muro mai');
  // per passare: giù fino alla riga 9, il varco in ortogonale (la diagonale toccherebbe lo spigolo del muro), poi su:
  // 5 + 1 + 1 + 5
  assert.equal(costoVerso(a, [8, 4]), 12);
  assert.ok(percorso(a, [8, 4]).some(([x, y]) => x === 6 && y === 9), 'passa dal varco');
  // spigolo: muro in (6,5) e (5,6); da (5,5) a (6,6) in diagonale no
  const spigolo = impostaCella(impostaCella(vuota(), C, R, 6, 5, true), C, R, 5, 6, true);
  const b = area({ chi: chi([5, 5]), muri: spigolo });
  assert.equal(costoVerso(b, [6, 6]), 6, 'gira attorno ai due muri (5,4 → 6,4 → 7,4 → 7,5 → 7,6 → 6,6): niente diagonali accanto agli spigoli');
  const c = area({ chi: chi([5, 5]), muri: impostaCella(vuota(), C, R, 6, 5, true) });
  assert.equal(costoVerso(c, [6, 6]), 2, 'anche con un solo muro a lato la diagonale non taglia lo spigolo');
  const conTaglio = area({ chi: chi([5, 5]), muri: spigolo, regole: { ...REG, taglio_angoli_muri: true } });
  assert.equal(costoVerso(conTaglio, [6, 6]), 1);
});

test('terreno difficile: ×2 per ogni Q in cui si entra', () => {
  const terreno = rettangolo(vuota(), C, R, 6, 0, 7, 9, true);
  const a = area({ chi: chi([5, 5]), terreno, massimo: 12 });
  assert.equal(costoVerso(a, [6, 5]), 2);
  assert.equal(costoVerso(a, [7, 5]), 4);
  assert.equal(costoVerso(a, [8, 5]), 5);
});

test('alleati attraversabili ma non occupabili, avversari no', () => {
  const token = [
    { id: 'amico', q: [6, 5], ingombro: 1, lato: 'pg' },
    { id: 'alleato', q: [6, 4], ingombro: 1, lato: 'alleato' },
    { id: 'nemico', q: [4, 5], ingombro: 1, lato: 'avversario' },
    { id: 'cassa', q: [5, 6], ingombro: 1, lato: null },
  ];
  const a = area({ chi: chi([5, 5]), token });
  assert.equal(costoVerso(a, [6, 5]), Infinity, 'sull’alleato non ci si ferma');
  assert.equal(costoVerso(a, [7, 5]), 2, 'ma lo si attraversa');
  assert.equal(costoVerso(a, [4, 5]), Infinity, 'avversario');
  assert.equal(costoVerso(a, [5, 6]), Infinity, 'segnaposto: non ci si ferma');
  // il nemico vede i PG come avversari
  const n = area({ chi: { id: 'nemico', q: [4, 5], ingombro: 1, lato: 'avversario' }, token: [...token.filter((t) => t.id !== 'nemico'), { id: 'me', q: [5, 5], ingombro: 1, lato: 'pg' }] });
  assert.equal(costoVerso(n, [6, 5]), Infinity);
  assert.ok(stessaParte('pg', 'alleato') && !stessaParte('pg', 'avversario'));
});

test('ingombri 2 × 2, 3 × 3 e veicolo 4 × 2: tutto l’ingombro deve passare', () => {
  // corridoio largo 2 fra due muri orizzontali (righe 3 e 6): passa un 2 × 2, non un 3 × 3
  let muri = rettangolo(vuota(), C, R, 0, 3, 11, 3, true);
  muri = rettangolo(muri, C, R, 0, 6, 11, 6, true);
  const grande = area({ chi: chi([0, 4], 2), muri, massimo: 20 });
  assert.equal(costoVerso(grande, [10, 4]), 10);
  assert.equal(costoVerso(grande, [10, 5]), Infinity, 'uscirebbe sul muro');
  const enorme = area({ chi: chi([0, 7], 3), muri, massimo: 20 });
  assert.equal(costoVerso(enorme, [0, 4]), Infinity, 'un 3 × 3 non entra nel corridoio');
  assert.equal(costoVerso(enorme, [9, 7]), 9);
  const scout = area({ chi: chi([0, 4], [4, 2]), muri, massimo: 20 });
  assert.equal(costoVerso(scout, [8, 4]), 8);
  assert.equal(costoVerso(scout, [9, 4]), Infinity, 'il rettangolo uscirebbe dalla griglia');
  // un nemico che occupa un solo Q blocca tutte le posizioni del 2 × 2 che lo coprirebbero
  const blocco = area({ chi: chi([0, 0], 2), token: [{ id: 'n', q: [3, 1], ingombro: 1, lato: 'avversario' }], massimo: 6 });
  for (const q of [[2, 0], [3, 0], [2, 1], [3, 1]]) assert.equal(costoVerso(blocco, q), Infinity, String(q));
  assert.equal(costoVerso(blocco, [4, 0]), 5, 'oltre il nemico si arriva girandogli sotto');
});

test('fasce: Passo, Corsa, Scatto con il movimento già usato; Q colorati', () => {
  const rimaste = fasceRimaste({ passo: 6, corsa: 12, scatto: 18 }, 4);
  assert.deepEqual(rimaste, { passo: 2, corsa: 8, scatto: 14 });
  assert.equal(fasciaDi(2, rimaste), 'passo');
  assert.equal(fasciaDi(3, rimaste), 'corsa');
  assert.equal(fasciaDi(14, rimaste), 'scatto');
  assert.equal(fasciaDi(15, rimaste), null);
  assert.deepEqual(fasceRimaste({ passo: 3, corsa: null, scatto: null }), { passo: 3, corsa: null, scatto: null });
  const a = area({ chi: chi([5, 5]), massimo: 4 });
  const solo = celleArea(a, fasceRimaste({ passo: 2, corsa: 4, scatto: 6 }), 1);
  assert.equal(solo[5 * C + 7], 1);
  assert.equal(solo[5 * C + 8], 0, 'oltre il Passo non si colora con la sola fascia del Passo');
  assert.equal(solo[5 * C + 5], 0, 'la partenza no');
  const due = celleArea(a, fasceRimaste({ passo: 2, corsa: 4, scatto: 6 }), 2);
  assert.equal(due[5 * C + 8], 2);
  // 2 × 2: si colorano tutti i Q coperti
  const g = areaRaggiungibile({ colonne: C, righe: R, muri: vuota(), terreno: vuota(), token: [], chi: chi([0, 0], 2), massimo: 1, regole: REG });
  const cg = celleArea(g, fasceRimaste({ passo: 1, corsa: 2, scatto: 3 }), 1);
  assert.equal(cg[2 * C + 2], 1);
  assert.equal(cg[1 * C + 1], 1, 'anche i Q della partenza coperti dalle posizioni vicine');
  assert.equal(cg[0], 0, 'il Q d’angolo della partenza non lo copre nessun’altra posizione');
});

test('movimento dei nemici: profilo, moltiplicatori, «non_consentito» e Stati', () => {
  assert.deepEqual(movimentoNemico({ movimento: { passo: 6 } }, [], dati), { passo: 6, corsa: 12, scatto: 18 });
  assert.deepEqual(movimentoNemico({ movimento: { passo: 4, corsa: 10, scatto: 'non_consentito' } }, [], dati), { passo: 4, corsa: 10, scatto: null });
  assert.deepEqual(movimentoNemico({ movimento: { passo: 6 } }, ['a-terra'], dati), { passo: 6, corsa: null, scatto: null });
  assert.deepEqual(movimentoNemico({ movimento: { passo: 6 } }, ['rallentato'], dati), { passo: 3, corsa: null, scatto: null });
  assert.deepEqual(movimentoNemico({ movimento: { passo: 6 } }, ['immobilizzato'], dati), { passo: 0, corsa: null, scatto: null });
});

const scenaProva = () => {
  const s = nuovaScena({ id: 'sala', nome: 'Sala', colonne: C, righe: R, nebbia: 'scoperta', dati });
  s.token = [
    { id: 'a', rif: { tipo: 'partecipante', id: 'pg:Lucas' }, q: [1, 1], ingombro: 1, nascosto: false },
    { id: 'b', rif: { tipo: 'partecipante', id: 'nem:predone:1' }, q: [8, 8], ingombro: 2, nascosto: false },
  ];
  return s;
};

test('muri a pennello e rettangolo: muro, terreno, gomma; una voce di «annulla» per tratto', () => {
  let s = scenaProva();
  s = pennellataMuri(s, [0, 5], [5, 5], 1, 'muro', dati);
  assert.equal(conta(daBase64(s.muri), C, R), 6);
  s = rettangoloMuri(s, [2, 5], [3, 6], 'terreno', dati);
  assert.equal(conta(daBase64(s.muri), C, R), 4, 'il terreno toglie il muro');
  assert.equal(conta(daBase64(s.terreno), C, R), 4);
  s = rettangoloMuri(s, [0, 0], [11, 9], 'gomma', dati);
  assert.equal(conta(daBase64(s.muri), C, R) + conta(daBase64(s.terreno), C, R), 0);
  assert.deepEqual(s.annulla.map((v) => v.tipo), ['muri', 'muri', 'muri']);
  assert.equal(validaScena(s, dati), null);
  // trascinamento: passi provvisori, una voce sola
  const inizio = { muri: s.muri, terreno: s.terreno };
  let t = s;
  for (const [da, a] of [[[0, 0], [3, 0]], [[3, 0], [3, 4]]]) t = muriProvvisori(t, trattoMuri(t, da, a, 1, 'muro'));
  t = chiudiTrattoMuri(t, inizio, dati);
  assert.equal(t.annulla.length, 4);
  assert.equal(conta(daBase64(t.muri), C, R), 8);
  // Ctrl+Z su tutte le voci, in ordine inverso, torna alla scena vuota
  let u = t;
  for (let i = 0; i < 4; i++) u = annullaUltima(u).scena;
  assert.equal(u.muri, scenaProva().muri);
  assert.equal(u.terreno, scenaProva().terreno);
  assert.equal(annullaUltima(u), null);
});

test('movimenti nel Round, movimento diviso, Ctrl+Z e «Annulla ultimo movimento»', () => {
  let s = scenaProva();
  s = muoviToken(s, 'a', { a: [3, 1], costo: 2, fascia: 'passo', scontro: 'sc', round: 1 }, dati);
  s = pennellata(s, [5, 5], [5, 5], 1, 'copri', dati);
  s = muoviToken(s, 'a', { a: [6, 2], costo: 3, fascia: 'passo', scontro: 'sc', round: 1 }, dati);
  s = muoviToken(s, 'b', { a: [6, 6], costo: 2, fascia: 'passo', scontro: 'sc', round: 1 }, dati);
  s = muoviToken(s, 'a', { a: [0, 0], costo: null, scontro: 'sc', round: 1, libero: true }, dati);
  assert.equal(usatoNelRound(s, 'a', 'sc', 1), 5, 'i movimenti liberi (Maiusc) non contano');
  assert.equal(usatoNelRound(s, 'a', 'sc', 2), 0, 'nuovo Round');
  assert.equal(usatoNelRound(s, 'a', null, null), 0, 'senza scontro contano solo i movimenti fatti senza scontro');
  assert.ok(mossoNelRound(s, 'b', 'sc', 1) && !mossoNelRound(s, 'b', 'sc', 2));
  assert.equal(validaScena(s, dati), null);
  // «Annulla ultimo movimento» di a: l'ultimo suo, anche se dopo c'è altro
  const r = annullaUltimoMovimento(s, 'a');
  assert.deepEqual(r.scena.token.find((t) => t.id === 'a').q, [6, 2]);
  assert.equal(r.scena.movimenti.length, 3);
  assert.ok(!r.scena.annulla.some((v) => v.movimento === r.movimento.id));
  // Ctrl+Z in ordine: movimento libero di a, movimento di b, movimento di a, nebbia, primo movimento di a
  let u = s;
  const ordine = [];
  for (;;) { const x = annullaUltima(u); if (!x) break; ordine.push(x.testo ?? x.errore); u = x.scena; }
  assert.deepEqual(ordine, ['movimento', 'movimento', 'movimento', 'nebbia', 'movimento']);
  assert.deepEqual(u.token.map((t) => t.q), [[1, 1], [8, 8]]);
  assert.equal(u.movimenti.length, 0);
  assert.equal(annullaUltimoMovimento(u, 'a'), null);
});

test('token messi e tolti si annullano; un token del partecipante uscito non torna', () => {
  let s = scenaProva();
  const nuovo = { id: 'c', rif: { tipo: 'partecipante', id: 'pg:Nadia' }, q: [4, 4], ingombro: 1, nascosto: false };
  s = cambiaTokenAnnullabile(s, null, nuovo, dati);
  assert.equal(s.token.length, 3);
  s = cambiaTokenAnnullabile(s, s.token[1], null, dati); // tolto il predone
  s = cambiaTokenAnnullabile(s, s.token[0], { ...s.token[0], nascosto: true }, dati);
  assert.equal(s.token.length, 2);
  let x = annullaUltima(s);
  assert.equal(x.testo, 'token');
  assert.equal(x.scena.token.find((t) => t.id === 'a').nascosto, false);
  // il predone è uscito dallo scontro: non torna, la voce esce dalla pila
  const presenti = new Set(['partecipante:pg:Lucas', 'partecipante:pg:Nadia']);
  x = annullaUltima(x.scena, { chiaviPresenti: presenti });
  assert.match(x.errore, /non è più nello scontro/);
  assert.equal(x.scena.token.length, 2);
  x = annullaUltima(x.scena, { chiaviPresenti: presenti });
  assert.equal(x.testo, 'token messo');
  assert.deepEqual(x.scena.token.map((t) => t.id), ['a']);
});

test('prestazioni: 80 × 60 Q, 20 token, muri e terreno, Scatto 18 Q e 2 × 2', () => {
  const C2 = 80, R2 = 60;
  let muri = nuovaMaschera(C2, R2), terreno = nuovaMaschera(C2, R2);
  // stanze e corridoi: muri ogni 10 colonne con porte, terreno a strisce
  for (let x = 9; x < C2; x += 10) muri = rettangolo(muri, C2, R2, x, 0, x, R2 - 1, true);
  for (let x = 9; x < C2; x += 10) for (let y = 5; y < R2; y += 15) for (let k = 0; k < 3; k++) muri = impostaCella(muri, C2, R2, x, y + k, false);
  for (let y = 20; y < R2; y += 20) terreno = rettangolo(terreno, C2, R2, 0, y, C2 - 1, y + 2, true);
  const token = Array.from({ length: 20 }, (_, i) => ({ id: `t${i}`, q: [(i * 7) % 75, (i * 11) % 55], ingombro: i % 5 === 0 ? 2 : 1, lato: i % 2 ? 'avversario' : 'pg' }));
  const misura = (o) => { const t0 = performance.now(); const a = areaRaggiungibile({ colonne: C2, righe: R2, muri, terreno, token, regole: REG, ...o }); return { ms: performance.now() - t0, a }; };
  misura({ chi: { id: 't0', q: token[0].q, ingombro: 2, lato: 'pg' }, massimo: 18 }); // riscaldamento
  const tempi = [];
  for (let i = 0; i < 20; i++) tempi.push(misura({ chi: { ...token[i], id: token[i].id }, massimo: 18 }).ms);
  tempi.sort((a, b) => a - b);
  const tutto = misura({ chi: { id: 'x', q: [40, 30], ingombro: 1, lato: 'pg' }, massimo: 200 });
  const conDiag = misura({ chi: { id: 'x', q: [40, 30], ingombro: 1, lato: 'pg' }, massimo: 200, regole: { ...REG, diagonali_alterne: true } });
  console.log(`  area 80 × 60, 20 token: Scatto 18 Q mediana ${tempi[10].toFixed(2)} ms, massimo ${tempi[19].toFixed(2)} ms; tutta la mappa ${tutto.ms.toFixed(2)} ms; con diagonali alterne ${conDiag.ms.toFixed(2)} ms`);
  assert.ok(tempi[19] < 50, `Scatto: ${tempi[19]} ms`);
  assert.ok(tutto.ms < 100 && conDiag.ms < 150, 'tutta la mappa');
  assert.ok(costoVerso(tutto.a, [78, 59]) < Infinity, 'raggiunge l’angolo lontano passando dalle porte');
  assert.equal(costoVerso(tutto.a, [79, 59]), Infinity, 'la colonna 79 è un muro');
});

test('aggancio dentro l’area: la posizione raggiungibile più vicina al puntatore', async () => {
  const { piuVicinaRaggiungibile } = await import('../src/mappa/area.js');
  const muri = rettangolo(vuota(), C, R, 7, 0, 7, 9, true);
  const a = area({ chi: chi([5, 5]), muri, massimo: 2 });
  assert.deepEqual(piuVicinaRaggiungibile(a, [6, 5]), [6, 5], 'dentro: resta');
  assert.deepEqual(piuVicinaRaggiungibile(a, [11, 5]), [6, 5], 'oltre il muro: fino al muro');
  assert.deepEqual(piuVicinaRaggiungibile(a, [5, 0]), [5, 3], 'verso l’alto: fin dove arriva');
  assert.deepEqual(piuVicinaRaggiungibile(a, [0, 9], 1), [4, 6], 'con un limite più stretto');
  const vuotaArea = area({ chi: chi([5, 5]), massimo: 0 });
  assert.deepEqual(piuVicinaRaggiungibile(vuotaArea, [9, 9]), [5, 5], 'senza movimento resta dov’è');
});

test('senza scontro aperto il movimento si conta per turno; «Nuovo turno» lo fa ripartire, per un token o per tutti', () => {
  // primo test di Marcello (06/10/2026): con la scena collegata a una bozza il token si muoveva senza limite
  let s = scenaProva();
  const muovi = (id, a, costo) => { s = muoviToken(s, id, { a, costo, fascia: 'passo', scontro: null, round: null }, dati); };
  muovi('a', [3, 1], 2);
  muovi('a', [5, 1], 2);
  muovi('b', [8, 6], 2);
  s = muoviToken(s, 'a', { a: [0, 0], costo: null, libero: true }, dati);
  assert.equal(usatoNelRound(s, 'a', null, null), 4, 'i clic si sommano; il movimento libero non conta');
  assert.equal(usatoNelRound(s, 'b', null, null), 2);
  assert.equal(usatoNelRound(s, 'a', 'sc', 1), 0, 'lo scontro ha il suo conteggio');
  // «Nuovo turno» di a: solo a riparte
  s = nuovoTurno(s, 'a');
  assert.deepEqual([turnoDi(s, 'a'), turnoDi(s, 'b')], [1, 0]);
  assert.equal(usatoNelRound(s, 'a', null, null), 0);
  assert.equal(usatoNelRound(s, 'b', null, null), 2);
  muovi('a', [2, 0], 2);
  assert.equal(usatoNelRound(s, 'a', null, null), 2);
  // «Nuovo turno per tutti»
  s = nuovoTurno(s);
  assert.deepEqual([usatoNelRound(s, 'a', null, null), usatoNelRound(s, 'b', null, null)], [0, 0]);
  assert.equal(validaScena(s, dati), null);
  assert.match(validaScena({ ...s, turni: { tutti: -1, token: {} } }, dati), /turni/);
  // Ctrl+Z di un movimento lo toglie dal conteggio del turno
  muovi('b', [8, 8], 1);
  assert.equal(usatoNelRound(s, 'b', null, null), 1);
  assert.equal(usatoNelRound(annullaUltima(s).scena, 'b', null, null), 0);
});

test('«Libero»: una riga nel registro dello scontro, con il Round', async () => {
  const { rigaMovimentoLibero } = await import('../src/scontro.js');
  const s = rigaMovimentoLibero({ round: 2, registro: [] }, 'Predone 1', [3, 4], [10, 2], new Date('2026-10-06T18:00:00Z'));
  assert.deepEqual(s.registro, [{ ora: '2026-10-06T18:00:00.000Z', round: 2, testo: 'Mappa: Predone 1 spostato liberamente da (3, 4) a (10, 2); non conta nel movimento.' }]);
});
