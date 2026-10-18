// Motore del calcolatore «PX della partita» (A.161): formule, nessuna assegnazione senza il pulsante, totale
// finale modificabile, la correzione sostituisce (non somma), premio di fine Atto una volta, import senza
// doppioni, CSV. Gli esempi usano i fattori di data/px_partita.json (riferimento: gestore di Davide, §9.3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import {
  titoloPerLivello, livelloDaPx, limiteAtto, livelloPg, correttivoPg, pxIncontro,
  componentiGiocatore, calcolaPartita, deltaAssegnazione, partitaAssegnata, riepilogo, csvRiepilogo, importaArchivio,
} from '../src/px-partita.js';

const { dati } = await datiReali();
const p = dati.px_partita;

test('Titoli e livelli dalle soglie', () => {
  assert.equal(titoloPerLivello(1, p).nome, 'Principiante');
  assert.equal(titoloPerLivello(6, p).nome, 'Inesperto');
  assert.equal(titoloPerLivello(6, p).fattore, 2);
  assert.equal(titoloPerLivello(20, p).nome, 'Leggenda');
  assert.equal(livelloDaPx(0, p), 1);
  assert.equal(livelloDaPx(520, p), 6); // soglia del livello 6
  assert.equal(livelloDaPx(519, p), 5);
  assert.equal(livelloDaPx(10340, p), 20);
  assert.equal(livelloDaPx(99999, p), 20);
  // l'Atto limita il livello: a 520 px (liv 6) con Atto I (limite 8) → 6; con px da liv 10 e Atto I → 8
  assert.equal(limiteAtto('I', p), 8);
  assert.equal(livelloPg(520, 'I', p), 6);
  assert.equal(livelloPg(1800, 'I', p), 8); // px da livello 10, ma Atto I ferma a 8
});

test('correttivo per numero di PG: ×1 a 4, +0,1 per ognuno in meno, mai sotto il minimo', () => {
  assert.equal(correttivoPg(4, p), 1);
  assert.ok(Math.abs(correttivoPg(3, p) - 1.1) < 1e-9);
  assert.ok(Math.abs(correttivoPg(5, p) - 0.9) < 1e-9);
  assert.ok(Math.abs(correttivoPg(2, p) - 1.2) < 1e-9);
  assert.equal(correttivoPg(20, p), p.correttivo_pg.minimo); // clamp
});

test('PX dell’incontro: principale al 100%, altri al 50%, correttivo e arrotondamento per incontro', () => {
  const inc = { nemici: [{ nome: 'Capo', px: 30, qty: 1, principale: true }, { nome: 'Gregari', px: 20, qty: 3, principale: false }] };
  // pesato = 30 + 3×20×0,5 = 30 + 30 = 60 ; a 4 PG ×1 = 60
  assert.deepEqual([pxIncontro(inc, 4, p).px, pxIncontro(inc, 4, p).pesato], [60, 60]);
  // a 2 PG ×1,2 = 72 ; a 5 PG ×0,9 = 54 (arrotondato per incontro)
  assert.equal(pxIncontro(inc, 2, p).px, 72);
  assert.equal(pxIncontro(inc, 5, p).px, 54);
  // copie in più del principale valgono al 50%: principale qty 2 → 30 + 1×30×0,5 = 45
  assert.equal(pxIncontro({ nemici: [{ px: 30, qty: 2, principale: true }] }, 4, p).pesato, 45);
  // serve esattamente un principale
  assert.match(pxIncontro({ nemici: [{ px: 10, qty: 1, principale: false }] }, 4, p).errore, /un nemico principale/);
  assert.equal(pxIncontro({ nemici: [] }, 4, p).px, 0);
  // il px può venire dal Titolo/GS del nemico se non è scritto a mano
  assert.equal(pxIncontro({ nemici: [{ titolo: 'Esperto', qty: 1, principale: true }] }, 4, p).pesato, 30);
});

function partitaEsempio() {
  return {
    id: 'prova', data: '2026-10-16', titolo: 'Prova', durata: 2, atto: 'I', premioAtto: true,
    partecipanti: {
      a: { presente: true, partecipazione: 4, interpretazione: 5, contributo: 3, eccezionale: 1 },
      b: { presente: true, partecipazione: 3, interpretazione: 3, contributo: 3, eccezionale: 0 },
      c: { presente: false, partecipazione: 5, interpretazione: 5, contributo: 5, eccezionale: 0 },
      d: { presente: true, partecipazione: 2, interpretazione: 2, contributo: 2, eccezionale: 0 },
    },
    incontri: [{ nome: 'Scontro', nemici: [{ px: 30, qty: 1, principale: true }] }],
  };
}
const PX = { a: 520, b: 520, c: 520, d: 520 }; // tutti livello 6 (Inesperto, fattore 2), 3 presenti

test('componenti e totale suggerito (durata lunga raddoppia solo i voti; premio una volta)', () => {
  const comp = componentiGiocatore(partitaEsempio(), 'a', 520, p);
  assert.equal(comp.fattore, 2);
  assert.equal(comp.sommaVoti, 12);
  assert.equal(comp.pxVoti, 48); // 12 × 2 × 2 (durata lunga)
  assert.equal(comp.pxBonus, 2); // 1 × 2 (il bonus NON raddoppia con la durata)
  // 3 presenti (a, b, d) → correttivo 1,1 ; incontro 30 × 1,1 = 33
  assert.equal(comp.pxIncontri, 33);
  assert.equal(comp.premio, 150); // premio Atto I
  assert.equal(comp.totaleSuggerito, 48 + 2 + 33 + 150);
  // un assente non prende nulla
  const assente = componentiGiocatore(partitaEsempio(), 'c', 520, p);
  assert.deepEqual([assente.pxVoti, assente.pxBonus, assente.pxIncontri, assente.premio, assente.totaleSuggerito], [0, 0, 0, 0, 0]);
});

test('il totale finale è modificabile e sostituisce il suggerito', () => {
  const partita = partitaEsempio();
  const base = calcolaPartita(partita, PX, p).perGiocatore.a;
  assert.equal(base.totaleFinale, base.totaleSuggerito);
  partita.finali = { a: 999 };
  const mod = calcolaPartita(partita, PX, p).perGiocatore.a;
  assert.equal(mod.totaleFinale, 999);
  assert.equal(mod.totaleSuggerito, base.totaleSuggerito, 'il suggerito resta, cambia solo il finale');
});

test('nessuna assegnazione dal solo calcolo: serve il pulsante (deltaAssegnazione/partitaAssegnata)', () => {
  const partita = partitaEsempio();
  // calcolare non scrive assegnato
  calcolaPartita(partita, PX, p);
  riepilogo([partita], [{ id: 'a' }], { baseline: 520, atto: 'I' }, p);
  assert.equal(partita.assegnato, undefined, 'il calcolo non assegna');
  // i delta ci sono (il pulsante li applicherà), ma la partita non è ancora assegnata
  const delta = deltaAssegnazione(partita, PX, p);
  assert.ok(delta.a > 0 && !('c' in delta), 'solo i presenti, con delta ≠ 0');
  // il riepilogo conta SOLO le partite assegnate: una bozza non muove i PX
  const r0 = riepilogo([partita], [{ id: 'a' }], { baseline: 520, atto: 'I' }, p);
  assert.equal(r0[0].px, 520, 'bozza non assegnata: px invariati');
});

test('assegnazione e correzione: sostituisce l’importo, non lo somma', () => {
  const partita = partitaEsempio();
  const gioc = [{ id: 'a', pg: 'PG A' }, { id: 'b' }, { id: 'd' }];
  const imp = { baseline: 520, atto: 'I' };
  // prima assegnazione
  const assegnata1 = partitaAssegnata(partita, PX, '2026-10-16', p);
  assert.equal(assegnata1.statoAssegnazione, 'assegnata');
  const totA = calcolaPartita(partita, PX, p).perGiocatore.a.totaleFinale;
  assert.equal(assegnata1.assegnato.a, totA);
  const r1 = riepilogo([assegnata1], gioc, imp, p);
  assert.equal(r1.find((x) => x.id === 'a').px, 520 + totA);
  // correzione dei voti e ri-assegnazione: la stessa partita, importo sostituito
  const corretta = { ...assegnata1, partecipanti: { ...assegnata1.partecipanti, a: { ...assegnata1.partecipanti.a, partecipazione: 5 } } };
  const assegnata2 = partitaAssegnata(corretta, PX, '2026-10-17', p);
  const totA2 = calcolaPartita(corretta, PX, p).perGiocatore.a.totaleFinale;
  assert.ok(totA2 > totA, 'il nuovo totale è maggiore');
  const r2 = riepilogo([assegnata2], gioc, imp, p);
  assert.equal(r2.find((x) => x.id === 'a').px, 520 + totA2, 'px = baseline + solo l’ultimo importo assegnato, non la somma dei due');
  // il delta della ri-assegnazione rispetto alla precedente è solo la differenza
  const delta = deltaAssegnazione({ ...corretta, assegnato: assegnata1.assegnato }, PX, p);
  assert.equal(delta.a, totA2 - totA);
});

test('premio di fine Atto contato una volta per partita, solo se disposto', () => {
  const senza = { ...partitaEsempio(), premioAtto: false };
  assert.equal(componentiGiocatore(senza, 'a', 520, p).premio, 0);
  const con = partitaEsempio();
  // due assegnazioni della stessa partita non raddoppiano il premio (riepilogo somma l’assegnato corrente)
  const a1 = partitaAssegnata(con, PX, 'x', p);
  const r = riepilogo([a1], [{ id: 'a' }], { baseline: 520, atto: 'I' }, p);
  const atteso = 520 + componentiGiocatore(con, 'a', 520, p).totaleSuggerito;
  assert.equal(r[0].px, atteso, 'il premio è compreso una sola volta nel totale assegnato');
});

test('riepilogo: px, livello, mancanti, medie dei voti; ordinato per px', () => {
  const partita = partitaAssegnata(partitaEsempio(), PX, 'x', p);
  const gioc = [{ id: 'a', pg: 'A', giocatore: 'Tizio' }, { id: 'b', pg: 'B' }, { id: 'd', pg: 'D' }];
  const r = riepilogo([partita], gioc, { baseline: 520, atto: 'I' }, p);
  // ordinato per px decrescente
  assert.deepEqual(r.map((x) => x.px), [...r.map((x) => x.px)].sort((x, y) => y - x));
  // a ha il totale più alto (bonus + voti migliori) → primo
  assert.equal(r[0].id, 'a');
  // medie: a ha votato 4/5/3
  assert.equal(r.find((x) => x.id === 'a').mediaPartecipazione, 4);
  assert.equal(r.find((x) => x.id === 'a').mediaInterpretazione, 5);
  // livello e mancanti coerenti con px e soglie
  const ra = r.find((x) => x.id === 'a');
  assert.ok(ra.px > 520);
  assert.equal(ra.livello, livelloPg(ra.px, 'I', p));
});

test('CSV: intestazione, separatore «;», medie con la virgola', () => {
  const partita = partitaAssegnata(partitaEsempio(), PX, 'x', p);
  const r = riepilogo([partita], [{ id: 'a', pg: 'PG; A', giocatore: 'Tizio' }], { baseline: 520, atto: 'I' }, p);
  const csv = csvRiepilogo(r, p);
  const righe = csv.split('\r\n');
  assert.ok(righe[0].startsWith('Giocatore;Personaggio;Partite;PX totali;Livello;PX al prossimo livello;Media Partecipazione;'));
  assert.ok(righe[1].includes('"PG; A"'), 'i campi con ; sono fra virgolette');
  assert.match(righe[1], /;4,00;5,00;3,00$/, 'medie con la virgola decimale');
});

test('import dell’archivio del vecchio gestore: normalizza e NON riassegna (delta 0)', () => {
  const gestore = {
    version: 1, title: 'EROI & LEGGENDE', act: 'I', baselineXP: 520,
    roster: [{ id: 'a', char: 'PG A', player: 'Tizio' }, { id: 'b', char: 'PG B', player: 'Caio' }],
    sessions: [{
      id: 's1', date: '2026-10-12', title: 'Prima', duration: 2, act: 'I', actAward: '',
      participants: { a: { present: true, participation: 4, interpretation: 5, contribution: 3, exceptional: 1 },
        b: { present: true, participation: 3, interpretation: 3, contribution: 3, exceptional: 0 } },
      encounters: [{ id: 'e1', name: 'Scontro', outcome: 'Superato', enemies: [{ title: 'Esperto', qty: 1, main: true }] }],
    }],
  };
  const { impostazioni, giocatori, partite, avvisi } = importaArchivio(gestore, p);
  assert.deepEqual(impostazioni, { baseline: 520, atto: 'I' });
  assert.deepEqual(giocatori.map((g) => g.id), ['a', 'b']);
  assert.equal(partite.length, 1);
  assert.equal(partite[0].statoAssegnazione, 'assegnata', 'importata come già assegnata');
  assert.deepEqual(avvisi, []);
  // «senza assegnare di nuovo»: con i px di baseline, il delta di una ri-assegnazione è 0
  const pxGioc = { a: impostazioni.baseline, b: impostazioni.baseline };
  assert.deepEqual(deltaAssegnazione(partite[0], pxGioc, p), {}, 'nessun doppione');
  // file non valido
  assert.match(importaArchivio(null, p).avvisi[0], /non riconosciuto/);
});

test('fasce dei Titoli di Davide (A.168, 18/10): un livello per fascia e i confini, con il moltiplicatore giusto', () => {
  // [livello, Titolo, moltiplicatore]: un livello a metà fascia e i due confini di ogni fascia
  const attesi = [
    [1, 'Principiante', 1], [2, 'Principiante', 1], [3, 'Principiante', 1],
    [4, 'Inesperto', 2], [5, 'Inesperto', 2], [7, 'Inesperto', 2],
    [8, 'Esperto', 3], [10, 'Esperto', 3], [11, 'Esperto', 3],
    [12, 'Veterano', 4], [14, 'Veterano', 4], [15, 'Veterano', 4],
    [16, 'Eroe', 5], [18, 'Eroe', 5], [19, 'Eroe', 5],
    [20, 'Leggenda', 6],
  ];
  for (const [liv, nome, fattore] of attesi) {
    const t = titoloPerLivello(liv, p);
    assert.deepEqual([t.nome, t.fattore], [nome, fattore], `livello ${liv}`);
  }
  // oltre il livello massimo resta Leggenda (20+)
  assert.equal(titoloPerLivello(25, p).nome, 'Leggenda');
  // Titolo, soglie cumulative e Grado di Sfida restano dati distinti: le soglie non sono cambiate
  assert.equal(p.soglie_px.length, 20);
  assert.deepEqual(p.soglie_px.slice(0, 7), [0, 50, 110, 180, 340, 520, 720]);
  assert.deepEqual(p.titoli.map((t) => t.px), [10, 20, 30, 50, 70, 100], 'PX base del GS invariati');
});

test('PX suggeriti con le fasce nuove: un PG di livello 11 è Esperto ×3 (prima Veterano ×4); i livelli 7, 15 e 19 scendono di un Titolo', () => {
  // livello 11 → 2220 PX; Atto IV (limite 17) per non fermarlo; partita lunga, voti 4/5/3, bonus 1, 4 presenti
  const partita = {
    durata: 2, atto: 'IV', premioAtto: false,
    partecipanti: { a: { presente: true, partecipazione: 4, interpretazione: 5, contributo: 3, eccezionale: 1 }, b: { presente: true }, c: { presente: true }, d: { presente: true } },
    incontri: [],
  };
  const c = componentiGiocatore(partita, 'a', 2220, p);
  assert.equal(c.livello, 11);
  assert.deepEqual([c.titolo, c.fattore], ['Esperto', 3]);
  assert.equal(c.pxVoti, 12 * 3 * 2); // 72 (prima 12 × 4 × 2 = 96)
  assert.equal(c.pxBonus, 1 * 3); // 3 (prima 4)
  assert.equal(c.totaleSuggerito, 75); // prima 100
  // 7 → Inesperto ×2 (prima Esperto ×3); 15 → Veterano ×4 (prima Eroe ×5); 19 → Eroe ×5 (prima Leggenda ×6)
  const px = (liv) => p.soglie_px[liv - 1];
  const atto6 = { ...partita, atto: 'VI' }; // limite 20: i livelli alti non vengono fermati dall’Atto
  const verifica = (liv, titolo, fattore) => {
    const g = componentiGiocatore(atto6, 'a', px(liv), p);
    assert.deepEqual([g.livello, g.titolo, g.fattore], [liv, titolo, fattore], `livello ${liv}`);
  };
  verifica(7, 'Inesperto', 2);
  verifica(15, 'Veterano', 4);
  verifica(19, 'Eroe', 5);
  verifica(20, 'Leggenda', 6);
});

test('Titolo nella riassegnazione (A.168, 18/10): resta quello dei PX di prima della partita, anche se il premio fa cambiare fascia', () => {
  const soglia8 = p.soglie_px[7];
  const prima = soglia8 - 20; // livello 7, Inesperto ×2: a un passo dal livello 8 (Esperto ×3)
  const partita = {
    durata: 1, atto: 'IV', premioAtto: false,
    partecipanti: { a: { presente: true, partecipazione: 4, interpretazione: 4, contributo: 4, eccezionale: 0 } },
    incontri: [],
  };
  const c0 = componentiGiocatore(partita, 'a', prima, p);
  assert.deepEqual([c0.livello, c0.titolo, c0.fattore, c0.totaleSuggerito], [7, 'Inesperto', 2, 24]);
  const assegnata = partitaAssegnata(partita, { a: prima }, '2026-10-18', p);
  assert.equal(assegnata.pxPrima.a, prima);
  // dopo l'assegnazione il PG ha più di 20 PX in più: ora è di livello 8 (Esperto)
  const dopo = prima + assegnata.assegnato.a + 20;
  assert.equal(livelloDaPx(dopo, p), 8);
  // correzione dei voti: il Titolo resta Inesperto ×2 (non Esperto ×3), e il delta è solo sui voti
  const corretta = { ...assegnata, partecipanti: { a: { ...partita.partecipanti.a, partecipazione: 5 } } };
  const c1 = componentiGiocatore(corretta, 'a', dopo, p);
  assert.deepEqual([c1.livello, c1.titolo, c1.fattore, c1.totaleSuggerito], [7, 'Inesperto', 2, 26]);
  assert.deepEqual(deltaAssegnazione(corretta, { a: dopo }, p), { a: 2 });
  // ri-assegnare non sposta pxPrima
  assert.equal(partitaAssegnata(corretta, { a: dopo }, '2026-10-19', p).pxPrima.a, prima);
  // il Direttore può cambiare il Titolo a mano
  const manuale = { ...corretta, titoliManuali: { a: 'Esperto' } };
  assert.deepEqual([componentiGiocatore(manuale, 'a', dopo, p).titolo, componentiGiocatore(manuale, 'a', dopo, p).totaleSuggerito], ['Esperto', 39]);
  // senza pxPrima (bozza o partite vecchie) si usano i PX attuali, come prima
  assert.equal(componentiGiocatore(partita, 'a', dopo, p).titolo, 'Esperto');
});
