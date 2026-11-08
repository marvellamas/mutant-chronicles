// La Neverlost (A.196, risposta di Davide del 30/10/2026; Manuale dei Veicoli 0.10, «Neverlost scheda del veicolo»; scheda
// tecnica 1.6): profilo, tre Integrità dei veicoli, riserve che non si riempiono da sole, volo e giornata, Traiettoria in
// giorni, scudo energetico, circuito Bianco separato, pedina 3 × 2 in Q Tattici. Il test più importante: nessuna riserva
// della nave sale senza una ricarica esplicita.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { nuovoVeicolo, normalizzaVeicoli, profiloDi, statoStruttura, chiudiGiornata, ricaricaEnergia, registraViaggio, vistaVeicoloPersonaggio, movimentoMassimo, colpisciVeicolo } from '../src/veicoli.js';
import {
  registraValori, registraVolo, registraStazionario, impostaApprodo, chiudiGiornataNeverlost, entraTraiettoria, esciTraiettoria, traversata,
  sparaCannone, attivaScudo, oraScudo, spegniScudo, colpoAlloScudo, roundSenzaColpi, usaFunzione, variaCircuito, ricaricaNeverlost, vistaNeverlost,
} from '../src/neverlost.js';
import { ingombroVeicolo } from '../src/mappa/token.js';
import { pezziDellaScena } from '../src/mappa/partecipanti.js';

const { dati } = await datiReali();
const P = dati.veicoli.profili.find((p) => p.id === 'neverlost');
const nave = (valori = { rosso: 100, blu: 10, verde: 30, sce: 200, pm: 120 }) => registraValori(nuovoVeicolo('neverlost', dati, { uid: 'nl' }), P, valori);
const colori = (m) => [m.energia.rosso, m.energia.blu, m.energia.verde];

test('profilo: i valori della scheda 1.6 e del manuale', () => {
  assert.deepEqual([P.dimensioni.lunghezza_m, P.dimensioni.larghezza_m, P.pedina_tattica, P.scala_combattimento], [51, 30, '3 × 2', 'tattica']);
  assert.deepEqual([P.mov_q, P.mov_unita, P.man, P.qualita, P.ps_integrita, P.ar.totale, P.corazzato], [8, 'Q Tattici', -1, 'Rara', 14, 8, 2]);
  assert.deepEqual(P.pi, { corpo: 300, propulsione: 180, motore: 120 });
  const E = P.energia_neverlost;
  assert.deepEqual([E.rosso.cariche, E.blu.cariche, E.verde.cariche, E.riempimento_iniziale], [100, 10, 30, false]);
  assert.deepEqual(E.rosso.minuti_per_carica, { controllata: 60, veloce: 30, massima: 12 });
  assert.deepEqual([P.scudo.sce_max, P.circuito_bianco.pm, P.circuito_bianco.schegge], [200, 120, 6]);
  assert.deepEqual(P.armi.map((a) => [a.nome, a.danno, a.gittata_testo]), [
    ['Mitragliatore navale 1', '1d10×10+20', '12 / 24 Q Tattici'], ['Mitragliatore navale 2', '1d10×10+20', '12 / 24 Q Tattici'],
    ['Cannone energetico', '3d10×10', '24 / 48 Q Tattici'], ['Lanciamissili antinave', '5d10×10', '36 / 72 Q Tattici']]);
  // le scelte fra i due testi: la scheda 1.6 (MAN tecnologica, distacco da un aggancio esterno)
  assert.match(P.man_testo, /MAN tecnologica −1/);
  assert.equal(P.manovre_speciali[2].nome, 'Distacco da un aggancio esterno');
  assert.match(P.manovre_speciali[2].successo, /pareggio o fallimento/);
  // movimento dei veicoli: 8 / 16 / 24 Q Tattici
  assert.deepEqual(['controllata', 'veloce', 'massima'].map((a) => movimentoMassimo(P, a, dati).q), [8, 16, 24]);
});

test('le tre Integrità sono quelle dei veicoli, con le fasce della scheda', () => {
  const pen = (s, pi) => { const x = statoStruttura(s, pi, P.pi[s], dati); return x.fuoriUso ? 'fuori uso' : x.penalita; };
  assert.deepEqual([300, 250, 150, 50, 0].map((x) => pen('corpo', x)), [0, 0, -2, -4, 'fuori uso']);
  assert.deepEqual([150, 100, 30, 0].map((x) => pen('propulsione', x)), [-2, -4, -6, -8]);
  assert.deepEqual([100, 60, 20, 0].map((x) => pen('motore', x)), [-2, -4, -8, 'fuori uso']);
  // il colpo passa dalle regole dei veicoli (AR 8, 1 PI ogni 5, Corazzato 2)
  const r = colpisciVeicolo(nave(), { struttura: 'corpo' }, { danni: [58], natura: 'Naturale', ps: false }, dati);
  assert.equal(r.piPersi, 10 - 2); // 58 − 8 = 50 → 10 PI, Corazzato −2
});

test('LE RISERVE DELLA NEVERLOST NON SI RIEMPIONO DA SOLE', () => {
  // nave nuova: tutto «da registrare», mai il massimo
  const n0 = nuovoVeicolo('neverlost', dati);
  assert.deepEqual([...colori(n0), n0.scudo.sce, n0.circuito.pm], [null, null, null, null, null]);
  // un mezzo salvato senza valori, o con valori parziali, non si riempie rileggendolo
  const [letta] = normalizzaVeicoli([{ uid: 'x', profilo: 'neverlost', energia: { modello: 'neverlost', rosso: 37 } }], dati);
  assert.deepEqual(colori(letta), [37, null, null]);
  assert.equal(normalizzaVeicoli([letta], dati)[0].energia.rosso, 37);
  // nessuna operazione fa salire una riserva: solo la ricarica esplicita all'approdo
  let m = nave({ rosso: 40, blu: 5, verde: 12, sce: 80, pm: 50 });
  const ops = [
    (x) => chiudiGiornata(x, dati).mezzo, (x) => registraVolo(x, P, 45, 'veloce').mezzo, (x) => registraStazionario(x, P, 2).mezzo,
    (x) => chiudiGiornataNeverlost(x, P).mezzo, (x) => traversata(x, P, 3).mezzo, (x) => entraTraiettoria(x, P).mezzo, (x) => esciTraiettoria(x, P).mezzo,
    (x) => sparaCannone(x, P).mezzo, (x) => attivaScudo(x, P).mezzo, (x) => oraScudo(x, P).mezzo, (x) => spegniScudo(x, P),
    (x) => usaFunzione(x, P, 'impulso-energetico').mezzo, (x) => roundSenzaColpi(x, P).mezzo, (x) => normalizzaVeicoli([x], dati)[0],
    (x) => { vistaVeicoloPersonaggio(x, dati); return x; },
  ];
  for (const op of ops) {
    const prima = colori(m);
    m = op(m);
    colori(m).forEach((v, i) => assert.ok(v <= prima[i], `una riserva è salita: ${prima} → ${colori(m)}`));
  }
  // la ricarica è un atto esplicito, a pagamento, e riempie solo le cariche
  const r = ricaricaEnergia(m, dati);
  assert.deepEqual(colori(r.mezzo), [100, 10, 30]);
  assert.ok(r.costo > 0 && r.minuti === 480);
});

test('volo, stazionario e chiusura della giornata (arrotondamento una sola volta, Verde ogni giorno)', () => {
  let m = nave();
  m = registraVolo(m, P, 90, 'controllata').mezzo; // 1,5
  m = registraVolo(m, P, 10, 'massima').mezzo; // + 0,83
  m = registraStazionario(m, P, 0.5).mezzo; // + 0,5 → 2,83
  assert.equal(vistaNeverlost(m, P).daAddebitare, 3);
  const g = chiudiGiornata(m, dati);
  assert.deepEqual(colori(g.mezzo), [97, 10, 29]);
  // all'approdo alimentato niente Verde; a motori spenti niente Rosso
  const a = chiudiGiornata(impostaApprodo(g.mezzo, P, true), dati);
  assert.deepEqual(colori(a.mezzo), [97, 10, 29]);
  // riserva da registrare: non si sottrae, si avvisa
  const vuota = registraValori(nuovoVeicolo('neverlost', dati), P, { rosso: 10 });
  const d = chiudiGiornata(vuota, dati);
  assert.equal(d.mezzo.energia.verde, null);
  assert.ok(d.avvisi.some((x) => /Verde da registrare/.test(x)));
  // i chilometri non c'entrano
  assert.ok(registraViaggio(m, 100, dati).avvisi[0].includes('non conta i chilometri'));
});

test('Traiettoria in giorni: 20 giorni = 20 Rosse, 20 Verdi, 2 Blu (esempio della scheda)', () => {
  const t = traversata(nave(), P, 20);
  assert.deepEqual(colori(t.mezzo), [80, 8, 10]);
  assert.deepEqual(t.mezzo.energia.traiettoria, { dentro: false, giorni: 0, traversate: [{ giorni: 20 }] });
  // giorno per giorno: entrata, chiusure, uscita; dentro la Traiettoria niente voli atmosferici
  let m = entraTraiettoria(nave(), P).mezzo;
  assert.equal(m.energia.blu, 9);
  assert.ok(registraVolo(m, P, 60).avvisi.length);
  m = chiudiGiornata(m, dati).mezzo;
  m = chiudiGiornata(m, dati).mezzo;
  assert.equal(vistaNeverlost(m, P).traiettoria.giorni, 2);
  m = esciTraiettoria(m, P).mezzo;
  assert.deepEqual(colori(m), [98, 8, 28]);
  assert.deepEqual(m.energia.traiettoria.traversate, [{ giorni: 2 }]);
});

test('scudo energetico: 1 Blu l’ora, assorbe prima dell’AR, non si ripristina accendendolo, recupera dopo 3 Round', () => {
  let m = attivaScudo(nave({ rosso: 100, blu: 10, verde: 30, sce: 120, pm: 120 }), P).mezzo;
  assert.deepEqual([m.energia.blu, m.scudo.sce, m.scudo.attivo], [9, 120, true]);
  const c = colpoAlloScudo(m, P, 150, 'Naturale');
  assert.deepEqual([c.assorbito, c.residuo, c.mezzo.scudo.sce], [120, 30, 0]);
  // Magico: lo scudo ordinario non assorbe; con l'Ampliamento mistico dello scudo sì (PM dal circuito)
  m = registraValori(m, P, { sce: 100 });
  assert.equal(colpoAlloScudo(m, P, 40, 'Magico').residuo, 40);
  const amp = usaFunzione(m, P, 'ampliamento-scudo').mezzo;
  assert.deepEqual([amp.circuito.pm, amp.energia.blu, colpoAlloScudo(amp, P, 40, 'Magico').residuo], [114, 9, 0]);
  // spento e riacceso: gli ScE restano quelli; un'altra carica Blu
  const ri = attivaScudo(spegniScudo(m, P), P).mezzo;
  assert.deepEqual([ri.scudo.sce, ri.energia.blu], [100, 8]);
  // recupero: dal terzo Round senza colpi, +20 per Round
  let s = ri;
  for (let i = 0; i < 3; i++) s = roundSenzaColpi(s, P).mezzo;
  assert.equal(s.scudo.sce, 120);
});

test('circuito Bianco: PM separati, non toccati da cariche, giornate e ricariche dell’energia', () => {
  let m = nave({ rosso: 50, blu: 5, verde: 20, sce: 200, pm: 120 });
  const u = usaFunzione(m, P, 'occultamento-totale');
  assert.deepEqual([u.mezzo.circuito.pm, ...colori(u.mezzo)], [80, 50, 5, 20]);
  assert.match(u.righe[0], /40 PM dal circuito Bianco/);
  // giornata, traversata e ricarica all'approdo non toccano i PM
  m = chiudiGiornata(u.mezzo, dati).mezzo;
  m = traversata(m, P, 2).mezzo;
  m = ricaricaEnergia(m, dati).mezzo;
  assert.deepEqual([m.circuito.pm, ...colori(m)], [80, 100, 10, 30]);
  // e i PM a mano non toccano le cariche
  const v = variaCircuito(m, P, 5);
  assert.deepEqual([v.circuito.pm, ...colori(v)], [85, 100, 10, 30]);
  // PM insufficienti: avviso, niente; «Procedi comunque» a 0
  const poco = registraValori(m, P, { pm: 3 });
  assert.equal(usaFunzione(poco, P, 'impulso-energetico').mezzo, poco);
  assert.equal(usaFunzione(poco, P, 'impulso-energetico', { forza: true }).mezzo.circuito.pm, 0);
  // il cannone usa le cariche Rosse, non i PM
  assert.deepEqual([sparaCannone(m, P).mezzo.energia.rosso, sparaCannone(m, P).mezzo.circuito.pm], [99, 80]);
});

test('mappa: pedina 3 × 2 in Q Tattici; atterrata in Q Base con le dimensioni vere 34 × 20 e lo scafo ostacolo (A.238)', () => {
  assert.deepEqual(ingombroVeicolo(P, dati, 'tattica'), [3, 2]);
  const rec = { id: 'vei-nl', proprietario: { tipo: 'gruppo' }, conducente: null, mezzo: { ...nuovoVeicolo('neverlost', dati), andatura: 'controllata' } };
  const tattica = pezziDellaScena({ veicoli: [rec], scena: { scala: 'tattica' } }, dati).find((p) => p.tipo === 'veicolo');
  assert.deepEqual(tattica.ingombro, [2, 3], 'muso in basso: 2 colonne × 3 righe');
  // A.253 (Davide, 06/11/2026; lotto 182): un mezzo nuovo è a terra, e **a terra non rulla**: movimento 0 in
  // qualunque scala. Prima (A.238) la pedina in Q Tattici portava il MOV 8 anche da ferma.
  assert.equal(tattica.movimento.passo, 0);
  assert.equal(tattica.statoVolo.id, 'a_terra');
  // A.238 (03/11/2026): in Q Base entra con le dimensioni reali, 34 × 20 Q Base (51 × 30 m), e lo scafo è un ostacolo.
  // A.253 supera la parte della A.238 sulla conversione del MOV: i movimenti in volo **non si convertono** (niente 80 Q
  // Base), e a terra il movimento è 0.
  const base = pezziDellaScena({ veicoli: [rec], scena: { scala: 'base' } }, dati).find((p) => p.tipo === 'veicolo');
  assert.deepEqual(base.ingombro, [20, 34], 'muso in basso: 20 colonne × 34 righe');
  assert.equal(base.ostacolo, true);
  assert.equal(base.movimento.passo, 0, 'a terra: movimento 0, non 80 Q Base convertiti (A.253)');
  assert.deepEqual(ingombroVeicolo(P, dati, 'base'), [34, 20]);
  // le misure del corpo restano quelle vere
  assert.equal(profiloDi(rec.mezzo, dati).dimensioni.lunghezza_m, 51);
  // lo Scout non cambia
  const scout = { id: 'vei-scout', proprietario: { tipo: 'gruppo' }, conducente: null, mezzo: { profilo: 'asa-scout-mk4', nome: 'Scout' } };
  assert.ok(pezziDellaScena({ veicoli: [scout], scena: { scala: 'base' } }, dati).some((p) => p.tipo === 'veicolo'));
});
