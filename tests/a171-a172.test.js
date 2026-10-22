// Due risposte di Davide del 21 ottobre 2026.
//
// A.171 — gli Sciami hanno portata 0 Q: «lo Sciame può colpire soltanto un bersaglio con cui condivide almeno
// un quadretto occupato. Registrare direttamente portata 0 Q, così che i bersagli soltanto adiacenti non
// risultino validi per questi attacchi.»
//
// A.172 — due criteri diversi, che non vanno confusi: i quadretti occupati e la portata si misurano sulla
// copertura di almeno metà quadretto; le collisioni con muri, ostacoli e altre pedine sulla sagoma geometrica
// effettiva, «comprese le parti che coprono meno di metà quadretto. La rotazione non deve consentire di
// attraversare un muro con un angolo della pedina.» La portata si misura dal quadretto occupato più favorevole,
// mai dal centro, ma senza colpire attraverso un ostacolo invalicabile.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validaNemico } from '../src/validate.js';
import { statoPortata } from '../src/attacco.js';
import { sagoma, celle, distanza, posizioneValida, sovrappone } from '../src/mappa/sagoma.js';
import { celleToken, celleToccateToken } from '../src/mappa/token.js';
import { celleToccate, formaRuotata } from '../src/mappa/forma.js';
import { lineaDiTiro } from '../src/mappa/visuale.js';
import { nuovaMaschera, impostaCella } from '../src/mappa/celle.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const cartellaMostri = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, cartellaMostri), 'utf8'));

// --- A.171: portata 0 Q --------------------------------------------------------------------------------------

test('A.171: il formato dei nemici accetta portata 0 e rifiuta ancora una portata negativa', () => {
  assert.equal(dati.formato_nemici.campi.attacchi.voce.campi.portata_q.min, 0);
  const base = leggi('sciame-di-corvi');
  assert.deepEqual(validaNemico(base, dati, 'sciame-di-corvi'), [], 'uno Sciame con portata 0 è valido');
  const negativa = { ...base, attacchi: base.attacchi.map((a) => ({ ...a, portata_q: -1 })) };
  assert.ok(validaNemico(negativa, dati, 'negativa').length > 0, 'una portata negativa resta un errore');
});

test('A.171: tutti e sei gli Sciami hanno portata 0 Q, senza più la nota di ripiego', () => {
  const sciami = readdirSync(cartellaMostri).filter((f) => f.startsWith('sciame-') && f.endsWith('.json'));
  assert.equal(sciami.length, 6);
  for (const f of sciami) {
    const n = JSON.parse(readFileSync(new URL(f, cartellaMostri), 'utf8'));
    const ravvicinati = n.attacchi.filter((a) => a.tipo === 'ravvicinato');
    assert.ok(ravvicinati.length, f);
    for (const a of ravvicinati) {
      assert.equal(a.portata_q, 0, `${f} · ${a.nome}`);
      assert.ok(!/A\.171/.test(a.note ?? ''), `${f} · ${a.nome}: la nota di ripiego se n'è andata`);
    }
  }
});

test('A.171: lo Sciame colpisce chi condivide un quadretto, non chi è soltanto adiacente', () => {
  const sciame = { q: [5, 5], ingombro: 1 };
  const dentro = { q: [5, 5], ingombro: 1 }; // nello stesso Q: lo Sciame ci sta sopra
  const accanto = { q: [6, 5], ingombro: 1 }; // adiacente
  assert.equal(distanza(sciame, dentro), 0);
  assert.equal(distanza(sciame, accanto), 1);

  const condiviso = statoPortata(distanza(sciame, dentro), 0);
  assert.equal(condiviso.ok, true);
  assert.equal(condiviso.soloSpazioCondiviso, true);
  assert.match(condiviso.testo, /spazio condiviso/);

  const adiacente = statoPortata(distanza(sciame, accanto), 0);
  assert.equal(adiacente.ok, false, 'un bersaglio soltanto adiacente non è valido per un attacco a portata 0');
  assert.match(adiacente.testo, /serve lo spazio condiviso/);
});

test('A.171: con una portata normale lo spazio condiviso e il Contatto restano validi', () => {
  assert.equal(statoPortata(1, 1).ok, true);
  assert.equal(statoPortata(1, 1).testo, 'Contatto');
  assert.equal(statoPortata(0, 1).ok, true, 'chi condivide il quadretto è dentro anche a portata 1');
  assert.equal(statoPortata(2, 1).ok, false);
  assert.equal(statoPortata(2, 1).testo, 'oltre la portata');
  assert.equal(statoPortata(3, 3).ok, true);
  // portata non indicata: vale 1 Q come sempre, non 0 (un attacco senza portata non diventa uno Sciame)
  assert.equal(statoPortata(1, undefined).ok, true);
  assert.equal(statoPortata(1, null).ok, true);
});

// --- A.172: i due criteri -----------------------------------------------------------------------------------

/** La Madre: 3 × 10 Q (A.167), la sagoma più lunga del bestiario. */
const madre = (q, angolo) => ({ q, base: [10, 3], angolo, ingombro: sagoma([10, 3], angolo).ingombro });

test('A.172: l’occupazione è la copertura di almeno metà quadretto, e 28 Q per una 3 × 10 ruotata vanno bene', () => {
  // dritta occupa i suoi 30 Q; ruotata può occuparne qualcuno in meno: «le sue dimensioni fisiche restano
  // invariate; cambia soltanto la rappresentazione sulla griglia»
  assert.equal(celle(madre([0, 0], 0)).length, 30);
  const diagonale = celle(madre([0, 0], 45)).length;
  assert.ok(diagonale >= 26 && diagonale <= 30, `a 45° la Madre occupa ${diagonale} Q`);
});

test('A.172: le collisioni guardano la sagoma piena, i quadretti occupati ne sono un sottoinsieme', () => {
  for (const angolo of [0, 45, 90, 135, 30]) {
    const t = madre([5, 5], angolo);
    const occupate = celleToken(t).map((c) => c.join(','));
    const toccate = new Set(celleToccateToken(t).map((c) => c.join(',')));
    for (const c of occupate) assert.ok(toccate.has(c), `${angolo}°: ogni Q occupato è anche toccato`);
    if (angolo % 90 === 0) assert.equal(toccate.size, occupate.length, `${angolo}°: senza rotazione i due criteri coincidono`);
    else assert.ok(toccate.size > occupate.length, `${angolo}°: la sagoma sfiora Q che non occupa`);
  }
});

test('A.172: un angolo che copre meno di metà quadretto non attraversa un muro', () => {
  const t = madre([5, 5], 45);
  const occupate = new Set(celleToken(t).map((c) => c.join(',')));
  const sfiorato = celleToccateToken(t).find((c) => !occupate.has(c.join(',')));
  assert.ok(sfiorato, 'a 45° la Madre sfiora almeno un quadretto che non occupa');
  const g = { colonne: 30, righe: 30 };
  // prima della A.172 questo muro non fermava niente: il quadretto non risultava «suo»
  const conMuro = posizioneValida(t, { ...g, muro: (x, y) => x === sfiorato[0] && y === sfiorato[1] });
  assert.equal(conMuro.ok, false);
  assert.equal(conMuro.motivo, 'muro');
  // un quadretto che la sagoma non tocca affatto continua a non fermarla
  const toccati = new Set(celleToccateToken(t).map((c) => c.join(',')));
  const lontano = [5 + t.ingombro[0] + 2, 5];
  assert.ok(!toccati.has(lontano.join(',')));
  assert.equal(posizioneValida(t, { ...g, muro: (x, y) => x === lontano[0] && y === lontano[1] }).ok, true);
});

test('A.172: due pedine che si sfiorano con un angolo si scontrano (collisione, non occupazione)', () => {
  const a = madre([5, 5], 45);
  const occupate = new Set(celleToken(a).map((c) => c.join(',')));
  const sfiorato = celleToccateToken(a).find((c) => !occupate.has(c.join(',')));
  const b = { q: sfiorato, ingombro: 1 };
  assert.equal(sovrappone(a, b), true, 'si scontrano sulla sagoma vera');
  // ma per l'occupazione (e quindi per la portata) quel quadretto non è della Madre: la distanza resta 1 Q
  assert.equal(distanza(a, b), 1);
});

test('A.172: il bordo della griglia non è un muro — una sagoma ruotata ci si può appoggiare', () => {
  const t = madre([0, 0], 45);
  assert.equal(posizioneValida(t, { colonne: 20, righe: 20 }).ok, true);
  assert.equal(posizioneValida(madre([15, 0], 45), { colonne: 20, righe: 20 }).motivo, 'fuori');
});

test('A.172: celleToccate è esatta — il contatto di solo bordo non conta come collisione', () => {
  // un rettangolo allineato tocca esattamente i suoi quadretti: i vicini che ne sfiorano solo il bordo no
  const dritta = celleToccate([10, 3], 0);
  assert.equal(dritta.length, 30);
  assert.deepEqual(celleToccate([10, 3], 0), formaRuotata([10, 3], 0).celle);
  assert.deepEqual(celleToccate([1, 1], 0), [[0, 0]]);
});

test('A.172: la portata si misura dal quadretto più favorevole, non dal centro', () => {
  // la Madre dritta (3 colonne × 10 righe) e un bersaglio accanto alla sua punta: dal centro sarebbe lontano,
  // dal quadretto occupato più vicino è a 1 Q
  const m = { q: [5, 5], ingombro: [3, 10] };
  const bersaglio = { q: [8, 5], ingombro: 1 }; // accanto all'angolo in alto a destra
  assert.equal(distanza(m, bersaglio), 1);
  const centro = Math.max(Math.abs(8 - (5 + 1)), Math.abs(5 - (5 + 5)));
  assert.ok(centro > 1, 'dal centro della sagoma sarebbe più lontano');
  assert.equal(statoPortata(distanza(m, bersaglio), 1).ok, true);
});

test('A.172: il quadretto più favorevole non permette di colpire attraverso un ostacolo invalicabile', () => {
  // un muro continuo fra la Madre e il bersaglio: la linea di tiro resta bloccata, anche se un quadretto
  // occupato della sagoma è vicino al bersaglio
  const colonne = 20, righe = 12;
  const muri = nuovaMaschera(colonne, righe);
  for (let y = 0; y < righe; y++) impostaCella(muri, colonne, righe, 9, y, true);
  const scena = {
    griglia: { colonne, righe },
    token: [
      { id: 'madre', rif: { tipo: 'partecipante', id: 'n:madre' }, q: [5, 1], ingombro: [3, 10], nascosto: false },
      { id: 'pg', rif: { tipo: 'partecipante', id: 'pg:A' }, q: [10, 5], ingombro: 1, nascosto: false },
    ],
  };
  const linea = lineaDiTiro(scena, scena.token[0], scena.token[1], muri, dati.mappa.visuale);
  assert.equal(linea.distanza, 3, 'la distanza si misura dal quadretto occupato più favorevole, non dal centro');
  assert.equal(linea.vista, 'bloccata', 'il muro invalicabile resta in mezzo: non si colpisce attraverso');
});
