// Linea di visuale e di tiro (fase 2, lotto 3; src/mappa/visuale.js): ostacoli (muri, porte), Copertura «dagli angoli»
// (Giocatore §5.8; A.140), token in mezzo (§5.10; A.141), distanze (diagonale 1 Q), visuale dei PG e nebbia automatica,
// tempi su una mappa grande.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { ostacoliVista, segmentoBloccato, copertura, lineaDiTiro, qVisti, visuale, nebbiaDopoVisuale, tokenPg, tokenInMezzo } from '../src/mappa/visuale.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { nuovaPorta } from '../src/mappa/porte.js';
import { inBase64, daBase64, rettangolo, nuovaMaschera, cella } from '../src/mappa/celle.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const RV = dati.mappa.visuale;
const RP = dati.mappa.porte;
const C = 20, R = 12;

/** Muro verticale sulla colonna 10 (righe 0–11), con una porta in (10, 6). */
function scena(stato = 'chiusa') {
  const s = { ...nuovaScena({ id: 'v', nome: 'V', colonne: C, righe: R, nebbia: 'coperta', dati }), revisione: 0 };
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 10, 0, 10, R - 1, true));
  s.porte = [nuovaPorta({ id: 'p', q: [10, 6], stato })];
  return s;
}
const tok = (id, q, o = {}) => ({ id, q, ingombro: 1, nascosto: false, rif: { tipo: 'partecipante', id }, ...o });

test('dati: le regole del manuale e le provvisorie A.140, A.141, A.142', () => {
  assert.match(RV._nota, /Leggera −2 VA/);
  assert.match(RV._nota, /direzionale/);
  assert.deepEqual(RV.copertura_linee, ['nessuna', 'leggera', 'leggera', 'media', 'totale']);
  for (const [k, n] of [['copertura', 140], ['token in mezzo', 141], ['raggio', 142]]) assert.match(RV[`TODO(Davide) ${k}`], new RegExp(`^A\\.${n}`));
  const d = copia(dati);
  d.mappa.visuale.copertura_linee = ['leggera', 'leggera', 'media', 'totale', 'totale'];
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'visuale.copertura_linee'));
});

test('ostacoli: il muro e la porta chiusa o bloccata bloccano, la porta aperta no; sfiorare un bordo non blocca', () => {
  for (const [stato, bloccata] of [['chiusa', true], ['bloccata', true], ['aperta', false]]) {
    const ost = ostacoliVista(scena(stato), RP);
    assert.equal(segmentoBloccato(ost, C, R, [8.5, 6.5], [12.5, 6.5], 10), bloccata, stato);
  }
  const ost = ostacoliVista(scena('chiusa'), RP);
  assert.ok(!segmentoBloccato(ost, C, R, [10, 0], [10, 5], 10), 'lungo il bordo del muro');
  // la porta segreta per i giocatori è muro anche se aperta
  const s = scena('aperta');
  s.porte[0].segreta = true;
  assert.ok(cella(ostacoliVista(s, RP, { perGiocatori: true }), C, R, 10, 6));
});

test('Copertura dagli angoli: nessuna in campo aperto, Leggera, Media e Totale dietro il muro', () => {
  const s = { ...nuovaScena({ id: 'c', nome: 'C', colonne: C, righe: R, dati }), revisione: 0 };
  const chi = tok('a', [2, 5]);
  const vuoto = ostacoliVista(s, RP);
  assert.equal(copertura(s, chi, tok('b', [8, 5]), vuoto, RV).livello, 'nessuna');
  // un muro di 1 Q fra i due, sulla stessa riga: tutte e quattro le linee da ogni angolo lo attraversano? no: quelle
  // dagli angoli lo aggirano in parte
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 5, 5, 5, 5, true));
  const uno = copertura(s, chi, tok('b', [8, 5]), ostacoliVista(s, RP), RV);
  assert.ok(['leggera', 'media'].includes(uno.livello), uno.livello);
  // un muro alto 3 Q: Totale
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 5, 3, 5, 7, true));
  const tre = copertura(s, chi, tok('b', [8, 5]), ostacoliVista(s, RP), RV);
  assert.equal(tre.livello, 'totale');
  assert.equal(tre.bloccate, 4);
  // oltre l'estremità del muro la Copertura cala: Media (3 linee), Leggera (1–2), nessuna
  const liv = (q) => copertura(s, chi, tok('b', q), ostacoliVista(s, RP), RV);
  assert.deepEqual([liv([6, 8]).livello, liv([7, 9]).livello, liv([6, 9]).livello, liv([6, 10]).livello], ['media', 'leggera', 'leggera', 'nessuna']);
});

test('linea di tiro: distanza con la diagonale da 1 Q, vista, token in mezzo segnalati (non Copertura)', () => {
  const s = scena('aperta');
  const ost = ostacoliVista(s, RP);
  const a = tok('a', [8, 6]), b = tok('b', [14, 6]);
  const l = lineaDiTiro(s, a, b, ost, RV);
  assert.equal(l.distanza, 6);
  assert.equal(lineaDiTiro(s, a, tok('c', [14, 2]), ost, RV).distanza, 6, 'in diagonale: max(6, 4)');
  assert.equal(lineaDiTiro(s, a, tok('c', [14, 2]), ost, RV).vista, 'bloccata', 'di sbieco dietro una porta larga 1 Q');
  assert.equal(l.vista, 'libera', 'attraverso la porta aperta');
  const chiusa = lineaDiTiro(scena('chiusa'), a, b, ostacoliVista(scena('chiusa'), RP), RV);
  assert.equal(chiusa.vista, 'bloccata');
  // verso un Q vuoto
  assert.equal(lineaDiTiro(s, a, [9, 6], ost, RV).distanza, 1);
  // token in mezzo
  const s2 = { ...nuovaScena({ id: 'm', nome: 'M', colonne: C, righe: R, dati }), revisione: 0 };
  const amico = tok('c', [5, 5]);
  s2.token = [tok('a', [2, 5]), amico, tok('b', [8, 5])];
  assert.deepEqual(tokenInMezzo(s2, s2.token[0], s2.token[2], RV).map((t) => t.id), ['c']);
  assert.equal(lineaDiTiro(s2, s2.token[0], s2.token[2], ostacoliVista(s2, RP), RV).copertura, 'nessuna', 'i token non danno Copertura (A.141)');
});

test('visuale: muri e porte chiuse fermano la vista, il muro si vede; raggio; fra due muri in diagonale non si passa', () => {
  const s = scena('chiusa');
  const v = visuale(s, [tok('pg:a', [5, 6])], ostacoliVista(s, RP), RV);
  assert.ok(v[6 * C + 9] && v[6 * C + 10], 'fino alla porta, che si vede');
  assert.ok(!v[6 * C + 12], 'oltre la porta chiusa no');
  const aperta = scena('aperta');
  assert.ok(visuale(aperta, [tok('pg:a', [5, 6])], ostacoliVista(aperta, RP), RV)[6 * C + 12], 'con la porta aperta sì');
  // raggio
  const largo = { ...nuovaScena({ id: 'l', nome: 'L', colonne: 40, righe: 3, dati }), revisione: 0 };
  const vl = visuale(largo, [tok('pg:a', [0, 1])], ostacoliVista(largo, RP), { ...RV, raggio_q: 10 });
  assert.ok(vl[1 * 40 + 10] && !vl[1 * 40 + 11]);
  // diagonale chiusa fra due muri (1, 0) e (0, 1)
  const d = { ...nuovaScena({ id: 'd', nome: 'D', colonne: 5, righe: 5, dati }), revisione: 0 };
  d.muri = inBase64(rettangolo(rettangolo(nuovaMaschera(5, 5), 5, 5, 1, 0, 1, 0, true), 5, 5, 0, 1, 0, 1, true));
  assert.ok(!qVisti(ostacoliVista(d, RP), 5, 5, [0, 0], 5, 'quadretti')[1 * 5 + 1], 'chiuso fra due muri in diagonale');
});

test('nebbia automatica: i Q visti dai PG escono dalla nebbia; i token nascosti e i non PG non guardano', () => {
  const s = scena('chiusa');
  s.token = [tok('pg:a', [5, 6]), tok('nem:x', [15, 6]), tok('pg:b', [17, 2], { nascosto: true })];
  assert.deepEqual(tokenPg(s).map((t) => t.id), ['pg:a']);
  const v = visuale(s, tokenPg(s), ostacoliVista(s, RP), RV);
  const m = nebbiaDopoVisuale(s.nebbia.coperti, v, C, R);
  assert.ok(!cella(m, C, R, 5, 6) && !cella(m, C, R, 9, 6));
  assert.ok(cella(m, C, R, 15, 6), 'oltre il muro resta coperto');
  assert.equal(nebbiaDopoVisuale(inBase64(m), v, C, R), null, 'già scoperto: nulla cambia');
});

test('tempi: visuale di 6 PG con raggio 30 su 300 × 300 Q con muri; 100 linee di tiro', () => {
  const N = 300;
  const s = { ...nuovaScena({ id: 'g', nome: 'G', colonne: N, righe: N, dati }), revisione: 0 };
  let muri = nuovaMaschera(N, N);
  for (let k = 10; k < N; k += 20) muri = rettangolo(rettangolo(muri, N, N, k, 0, k, N - 30, true), N, N, 0, k + 5, N - 40, k + 5, true);
  s.muri = inBase64(muri);
  const ost = ostacoliVista(s, RP);
  const pg = [[50, 50], [52, 51], [150, 150], [151, 152], [250, 30], [30, 250]].map((q, i) => tok(`pg:${i}`, q));
  let t0 = performance.now();
  visuale(s, pg, ost, RV);
  const msVisuale = performance.now() - t0;
  t0 = performance.now();
  for (let i = 0; i < 100; i++) lineaDiTiro(s, pg[0], tok('b', [50 + (i % 40), 80 + (i % 30)]), ost, RV);
  const msLinee = performance.now() - t0;
  console.log(`visuale 6 PG raggio 30 su 300 × 300: ${msVisuale.toFixed(1)} ms; 100 linee di tiro: ${msLinee.toFixed(1)} ms`);
  assert.ok(msVisuale < 500, `visuale troppo lenta: ${msVisuale} ms`);
  assert.ok(msLinee < 500, `linee troppo lente: ${msLinee} ms`);
});

test('vista giocatori con la nebbia automatica: zone esplorate più scure (ombra), token non PG solo dove i PG vedono', async () => {
  const { vistaGiocatori } = await import('../src/mappa/vista.js');
  const { validaScena } = await import('../src/mappa/scena.js');
  const s = scena('chiusa');
  s.nebbia.coperti = inBase64(nuovaMaschera(C, R)); // tutto scoperto (esplorato)
  s.token = [tok('pg:a', [5, 6]), tok('nem:x', [15, 6]), tok('nem:y', [7, 6])];
  s.visuale = { automatica: true };
  assert.equal(validaScena(s, dati), null);
  assert.match(validaScena({ ...s, visuale: { automatica: 'sì' } }, dati), /^visuale/);
  const v = vistaGiocatori(s, null, dati.mappa.template, dati.mappa);
  assert.deepEqual(v.token.map((t) => t.id), ['pg:a', 'nem:y'], 'il nemico oltre la porta chiusa non si vede');
  const ombra = daBase64(v.ombra);
  assert.ok(cella(ombra, C, R, 15, 6) && !cella(ombra, C, R, 7, 6), 'oltre la porta: esplorato ma non visto');
  // senza nebbia automatica: niente ombra, tutti i token scoperti
  const senza = vistaGiocatori({ ...s, visuale: { automatica: false } }, null, dati.mappa.template, dati.mappa);
  assert.equal(senza.ombra, undefined);
  assert.equal(senza.token.length, 3);
});

test('diretta: la linea di tiro arriva ai giocatori solo fra token visibili; verso un Q sotto la nebbia no', async () => {
  const { statoDiretta, direttaPerGiocatori, validaDiretta } = await import('../src/mappa/diretta.js');
  const s = scena('aperta');
  s.nebbia.coperti = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 16, 0, C - 1, R - 1, true));
  s.token = [tok('pg:a', [5, 6]), tok('nem:x', [12, 6]), tok('nem:n', [8, 2], { nascosto: true }), tok('nem:f', [18, 6])];
  const linea = (a, punto = null) => statoDiretta({ scena: s, linea: { da: 'pg:a', a, punto, distanza: 7, copertura: 'leggera', vista: 'parziale' } });
  assert.equal(validaDiretta(linea('nem:x')), null);
  const ok = direttaPerGiocatori(linea('nem:x'), s, dati.mappa.template);
  assert.deepEqual(ok.linea.a, { q: [12, 6], ingombro: 1 });
  assert.ok(!JSON.stringify(ok).includes('nem:'), 'arrivano le posizioni, non gli id');
  assert.equal(direttaPerGiocatori(linea('nem:n'), s, dati.mappa.template), null, 'verso un nascosto: niente');
  assert.equal(direttaPerGiocatori(linea('nem:f'), s, dati.mappa.template), null, 'verso un token sotto la nebbia: niente');
  assert.equal(direttaPerGiocatori(linea(null, [17, 3]), s, dati.mappa.template), null, 'verso un Q sotto la nebbia: niente');
  assert.ok(direttaPerGiocatori(linea(null, [12, 3]), s, dati.mappa.template).linea);
});
