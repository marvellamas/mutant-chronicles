import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 254, rif. 09 del collaudo di Davide del 25/11/2026 — «Mostrare una sola volta il paragrafo sul decollo
// A.253 e uniformare Rapida / Veloce per la fascia da 16 Q tattici.»
//
// Due guasti di due classi diverse, e vale la pena distinguerle:
//   · **il paragrafo ripetuto** è nostro: il generatore del lotto 182 appendeva la frase del decollo senza guardare
//     se c'era già, e rilanciato tre volte l'ha scritta tre volte. Si toglie dai dati e il generatore diventa
//     idempotente: la causa, non il sintomo;
//   · **la fascia con due nomi** non è nostra: il manuale la chiama «Veloce» dove definisce la sequenza e «Rapida»
//     nelle tabelle delle autonomie. È un'errata del manuale e sta in sezione 4 del Doc; l'app ne mostra uno, e i
//     dati tengono la citazione (`verifica_frasi` la controlla).
//
// È la stessa classe che ci ha morsi quattro volte — una cosa con due nomi — e questo test la tiene chiusa per le
// **scale**: andature, manovrabilità, copertura. Ogni nome che non è quello ufficiale va dichiarato in
// `nomi_alternativi`, e nei testi che si mostrano non compare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dati } from './scheda-aiuti.js';
import { conNomiDelleFasce, nomeAndatura, profiloVeicolo } from '../src/veicoli.js';

const stringhe = (x, out = []) => {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) x.forEach((y) => stringhe(y, out));
  else if (x && typeof x === 'object') Object.values(x).forEach((y) => stringhe(y, out));
  return out;
};
/** Le scale dei veicoli: elenchi in cui una cosa sola ha più gradini. */
const SCALE = () => [
  { dove: 'andature', nomi: dati.veicoli.andature.elenco },
  { dove: 'manovrabilità', nomi: dati.veicoli.manovrabilita.fasce },
  { dove: 'copertura', nomi: dati.veicoli.copertura.fasce },
];

test('rif. 09: il paragrafo del decollo (A.253) compare una volta sola', () => {
  const nev = dati.veicoli.profili.find((p) => p.id === 'neverlost');
  const quante = nev.mov_testo.split('A.253 (06/11/2026): a terra la nave non rulla').length - 1;
  assert.equal(quante, 1, `il paragrafo del decollo compare ${quante} volte: il generatore del lotto 182 lo appendeva senza guardare`);
  // e non torna: il generatore non lo riscrive se c'è già
  const gen = readFileSync(new URL('../tools/lotti/lotto_182_mappa.mjs', import.meta.url), 'utf8');
  assert.match(gen, /if \(!nev\.mov_testo\.includes\('A\.253/, 'l’append del lotto 182 deve restare idempotente');
});

test('rif. 09: la fascia da 16 Q tattici ha un nome solo in quello che si mostra', () => {
  const nev = dati.veicoli.profili.find((p) => p.id === 'neverlost');
  const alt = dati.veicoli.andature.elenco.find((f) => f.id === 'veloce').nomi_alternativi ?? [];
  assert.deepEqual(alt, ['Rapida'], 'il nome che il manuale usa nelle autonomie è dichiarato');
  for (const testo of [nev.mov_testo, nev.energia_neverlost.rosso.testo]) {
    assert.match(testo, /\bRapida\b/, 'nel dato resta la citazione del manuale');
    const reso = conNomiDelleFasce(testo, dati);
    assert.doesNotMatch(reso, /\bRapida\b/, 'in quello che si mostra la fascia ha un nome solo');
    assert.match(reso, /\bVeloce\b/, 'ed è il nome con cui la fascia è definita');
  }
  assert.equal(nomeAndatura('veloce', dati), 'Veloce');
});

test('rif. 09: il nome di una fascia non è scritto nel codice', () => {
  // nella tendina dell'andatura del volo si leggeva «Rapida (30 min)», scritto a mano accanto a una fascia che
  // l'app chiama «Veloce»: la stessa cosa con due nomi, nella stessa pagina.
  const ui = readFileSync(new URL('../src/ui/veicoli.js', import.meta.url), 'utf8');
  const righe = ui.split('\n').filter((r) => !r.trimStart().startsWith('//'));
  for (const f of dati.veicoli.andature.elenco) {
    for (const alt of f.nomi_alternativi ?? []) {
      assert.equal(righe.filter((r) => new RegExp(`'[^']*\\b${alt}\\b[^']*'`).test(r)).length, 0,
        `src/ui/veicoli.js scrive «${alt}» nel codice: il nome della fascia viene dai dati (nomeAndatura)`);
    }
  }
});

test('rif. 09: nessuna scala dei veicoli ha un gradino con due nomi non dichiarati', () => {
  const tutte = stringhe(dati.veicoli);
  const guasti = [];
  for (const s of SCALE()) {
    const ufficiali = new Set(s.nomi.map((f) => f.nome));
    const dichiarati = new Set(s.nomi.flatMap((f) => f.nomi_alternativi ?? []));
    for (const testo of tutte) {
      // una frase che elenca due o più gradini: è la sequenza della scala
      if (s.nomi.filter((f) => new RegExp(`\\b${f.nome}\\b`).test(testo)).length < 2) continue;
      for (const m of testo.matchAll(/(?:,\s|\so\s|\s\/\s|\(\s?)([A-ZÀ-Ù][a-zà-ù]{3,})(?=[,;)]|\s\/|\s(?:o|e)\s)/g)) {
        if (ufficiali.has(m[1]) || dichiarati.has(m[1])) continue;
        guasti.push(`${s.dove}: «${m[1]}» al posto di un gradino — «${testo.slice(Math.max(0, m.index - 40), m.index + 40)}»`);
      }
    }
  }
  assert.deepEqual(guasti, [], `gradini con un nome non dichiarato:\n${guasti.join('\n')}`);
});

test('mutante: un nome non dichiarato verrebbe visto, e la sostituzione non tocca le altre parole', () => {
  const finti = { veicoli: { andature: { elenco: [{ id: 'veloce', nome: 'Veloce', nomi_alternativi: ['Rapida'] }] } } };
  assert.equal(conNomiDelleFasce('30 min Rapida o 12 min Massima', finti), '30 min Veloce o 12 min Massima');
  assert.equal(conNomiDelleFasce('Inversione rapida', finti), 'Inversione rapida', 'la minuscola non è il nome della fascia');
  assert.equal(conNomiDelleFasce('Rapidamente', finti), 'Rapidamente', 'non tocca una parola che comincia come il nome');
  assert.equal(conNomiDelleFasce(null, finti), null);
  // senza la dichiarazione la sostituzione non avviene: è la dichiarazione a renderla possibile
  assert.equal(conNomiDelleFasce('30 min Rapida', { veicoli: { andature: { elenco: [{ id: 'veloce', nome: 'Veloce' }] } } }), '30 min Rapida');
});

test('il profilo della Neverlost non è cambiato: la fascia resta la stessa, cambia come si legge', () => {
  const p = profiloVeicolo('neverlost', dati);
  assert.ok(p, 'il profilo si legge');
  const a = dati.veicoli.andature.elenco.find((f) => f.id === 'veloce');
  assert.equal(a.moltiplicatore, 2, 'il moltiplicatore della fascia non si tocca');
  assert.equal(a.pilotare, -2);
  assert.equal(a.nome, 'Veloce');
});

