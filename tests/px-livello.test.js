// Lotto 132 (27/10/2026): «i PX sembrano sfalsati di un livello». La tabella approvata (A.170) passata da ogni punto
// dell'app che collega PX e livello: tutti dicono lo stesso livello, e il confronto con il livello preso nella scheda
// è solo un'informazione (mai una correzione).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contesto, resa, dati } from './scheda-aiuti.js';
import { tabellaControllo, CASI } from '../tools/px-controllo.mjs';
import {
  livelloDaPx, confrontoLivelloPx, fraseLivelloPx, titoloPerLivello, componentiGiocatore, partiteDiverseSeSfalsato, fasceDiversePerScarto, passaggiDiLivello, riepilogo,
} from '../src/px-partita.js';
import { voceStato } from '../tools/console.mjs';

const p = dati.px_partita;
// le soglie approvate (A.170): totali da raggiungere, 1° → 0 … 20° → 10.340
const SOGLIE = [0, 50, 110, 180, 340, 520, 720, 1050, 1410, 1800, 2220, 2820, 3460, 4140, 4860, 5810, 6810, 7860, 8960, 10340];
const ATTESI = new Map([[0, 1], [49, 1], [50, 2], [519, 5], [520, 6], [600, 6], [719, 6], [720, 7], [1049, 7], [1050, 8], [10340, 20]]);

test('i dati hanno le soglie approvate, una per livello, e sono totali da raggiungere (non costi da sommare)', () => {
  assert.deepEqual(p.soglie_px, SOGLIE);
  SOGLIE.forEach((s, i) => assert.equal(livelloDaPx(s, p), i + 1, `${s} PX è il livello ${i + 1}`));
  SOGLIE.slice(1).forEach((s, i) => assert.equal(livelloDaPx(s - 1, p), i + 1, `${s - 1} PX è ancora il livello ${i + 1}`));
});

test('tabella di controllo: 0, 49, 50, 519, 520, 600, 719, 720, 1049, 1050, 10340 — ogni punto dell’app dice il livello atteso', () => {
  assert.deepEqual(CASI, [...ATTESI.keys()]);
  for (const r of tabellaControllo(p)) {
    const atteso = ATTESI.get(r.px);
    assert.equal(r.atteso, atteso, `${r.px}: atteso`);
    for (const k of ['livelloDaPx', 'livelloPg', 'riepilogo', 'pannelloPx', 'scheda']) assert.equal(r[k], atteso, `${r.px} PX: ${k}`);
    assert.equal(r.titolo, titoloPerLivello(atteso, p).nome, `${r.px}: Titolo del livello ${atteso}`);
  }
  // con 600 PX un personaggio è di 6° livello, con 720 di 7°
  assert.equal(livelloDaPx(600, p), 6);
  assert.equal(livelloDaPx(720, p), 7);
});

test('l’avviso di passaggio («↑ liv N») e «PX al prossimo» usano la stessa soglia', () => {
  const partita = (px) => ({ atto: 'VI', partecipanti: { a: { presente: true, partecipazione: 0, interpretazione: 0, contributo: 0, eccezionale: px } } });
  // 519 + 1 = 520: passa dal 5 al 6 (la soglia del livello 6), non al 7
  const [x] = passaggiDiLivello(partita(1), { a: 519 }, p);
  assert.deepEqual([x.da, x.a], [5, 6]);
  assert.equal(passaggiDiLivello(partita(1), { a: 520 }, p).length, 0, 'a 520 non passa: è già il 6');
  assert.deepEqual(passaggiDiLivello(partita(1), { a: 719 }, p).map((y) => [y.da, y.a]), [[6, 7]]);
  assert.equal(riepilogo([], [{ id: 'a' }], { baseline: 600, atto: 'VI' }, p)[0].mancanti, 120, 'da 600 a 720: 120 PX');
});

test('il Titolo di una partita dipende dal livello dei PX di prima: 520–719 PX è Inesperto (6°), 720 è ancora Inesperto (7°), 1050 Esperto', () => {
  const t = (px) => componentiGiocatore({ atto: 'VI', partecipanti: { a: { presente: true } } }, 'a', px, p);
  assert.deepEqual([t(179).titolo, t(180).titolo, t(719).titolo, t(720).titolo, t(1049).titolo, t(1050).titolo], ['Principiante', 'Inesperto', 'Inesperto', 'Inesperto', 'Inesperto', 'Esperto']);
});

test('confronto livello preso / livello dei PX: solo informazione, con la frase che dice cosa manca', () => {
  assert.equal(confrontoLivelloPx(6, null, p), null);
  assert.equal(confrontoLivelloPx(6, '', p), null);
  assert.deepEqual(confrontoLivelloPx(6, 600, p), { livelloPx: 6, livelloScheda: 6, inPiu: 0, mancanti: 0 });
  assert.equal(fraseLivelloPx(confrontoLivelloPx(6, 600, p)), '');
  // la scheda è al 7° con 600 PX: un livello in più, mancano 120 PX
  assert.deepEqual(confrontoLivelloPx(7, 600, p), { livelloPx: 6, livelloScheda: 7, inPiu: 1, mancanti: 120 });
  assert.match(fraseLivelloPx(confrontoLivelloPx(7, 600, p)), /I PX danno il livello 6, la scheda è al 7: un livello in più \(mancano 120 PX\)\. Non cambia niente da solo: decide il Direttore\./);
  assert.match(fraseLivelloPx(confrontoLivelloPx(7, 300, p)), /3 livelli in più/);
  // meno livelli dei PX: nessun avviso (è solo «puoi salire»)
  assert.equal(confrontoLivelloPx(5, 600, p).inPiu, 0);
});

function ctxIdentita(px) {
  return contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva: 'identita', scelte: (s) => ({ ...s, puntiEsperienza: px }) });
}

test('Identità: PX e livello a confronto — nessun avviso se tornano, avviso (senza toccare niente) se la scheda ha un livello in più', () => {
  const nota = (px) => resa(ctxIdentita(px)).radice.tutti().find((n) => /livello-oltre-px/.test(n.className ?? ''));
  assert.equal(nota(520), undefined, '6° livello con 520 PX: torna');
  assert.equal(nota(600), undefined);
  assert.equal(nota(null), undefined, 'senza PX non si dice niente');
  const c = ctxIdentita(519);
  assert.match(resa(c).radice.tutti().find((n) => /livello-oltre-px/.test(n.className ?? '')).textContent, /I PX danno il livello 5, la scheda è al 6: un livello in più \(mancano 1 PX\)/);
  assert.equal(c.livelli.length, 5, 'il livello della scheda non è cambiato');
  assert.equal(c.azioni && c.chiamate.length, 0, 'nessuna azione scritta');
});

test('voce C «Controlla lo stato»: per ogni personaggio PX, livello della scheda, livello dei PX e l’avviso se ne ha uno in più', async () => {
  const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
  const f = readdirSync(FIX).find((x) => x.startsWith('Dimitri'));
  const radice = mkdtempSync(join(tmpdir(), 'mutant-px-'));
  mkdirSync(join(radice, 'personaggi'), { recursive: true });
  mkdirSync(join(radice, 'data'), { recursive: true });
  copyFileSync(new URL('../data/px_partita.json', import.meta.url), join(radice, 'data', 'px_partita.json'));
  const scrivi = (px) => {
    const o = JSON.parse(readFileSync(new URL(f, FIX), 'utf8'));
    writeFileSync(join(radice, 'personaggi', f), JSON.stringify({ ...o, scelte: { ...o.scelte, puntiEsperienza: px } }));
  };
  const stato = async () => {
    const log = console.log; console.log = () => {};
    try { return (await voceStato({ radice, porta: 1, scrivi: false })).righe.find((r) => /Dimitri/i.test(r)); } finally { console.log = log; }
  };
  scrivi(600);
  assert.match(await stato(), /600 PX\s+liv\. 6 \(i PX danno il liv\. 6\)/);
  scrivi(519);
  assert.match(await stato(), /519 PX\s+liv\. 6 \(i PX danno il liv\. 5: LA SCHEDA HA UN LIVELLO IN PIU\)/);
});

test('Titolo: se il livello fosse sfalsato di +1 cambierebbero solo le partite con PX di prima nelle fasce 110–179, 720–1049, 2220–2819, 4860–5809, 8960–10339', () => {
  assert.deepEqual(fasceDiversePerScarto(1, p).map((f) => [f.da, f.a]), [[110, 179], [720, 1049], [2220, 2819], [4860, 5809], [8960, 10339]]);
  const partita = (id, pxPrima) => ({ id, data: '2026-10-20', atto: 'II', statoAssegnazione: 'assegnata', durata: 'normale', pxPrima: { a: pxPrima }, partecipanti: { a: { presente: true, partecipazione: 3, interpretazione: 3, contributo: 3, eccezionale: 2 } } });
  const diverse = partiteDiverseSeSfalsato([partita('m1', 600), partita('m2', 800), partita('m3', 150)], 1, p);
  assert.deepEqual(diverse.map((d) => d.partita), ['m2', 'm3'], '600 PX (6°→7°, stesso Titolo) non cambia');
  const m2 = diverse.find((d) => d.partita === 'm2');
  assert.deepEqual([m2.titolo, m2.fattore, m2.titoloSfalsato, m2.fattoreSfalsato], ['Inesperto', 2, 'Esperto', 3]);
  assert.equal(m2.deltaPx, (9 * 1 + 2) * 1, '(voti 9 + bonus 2) × (3 − 2)');
  // un Titolo scelto a mano non dipende dal livello: non compare
  const manuale = { ...partita('m4', 800), titoliManuali: { a: 'Esperto' } };
  assert.deepEqual(partiteDiverseSeSfalsato([manuale], 1, p), []);
});
