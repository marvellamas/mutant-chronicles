// Linea di visuale e di tiro (fase 2, lotto 3; src/mappa/visuale.js): ostacoli (muri, porte), Copertura «dal centro» (07/10)
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

test('dati: le regole del manuale e le risposte A.140, A.144, A.142 (decisioni 144–146)', () => {
  assert.match(RV._nota, /Leggera −2 VA/);
  assert.match(RV._nota, /direzionale/);
  // 07/10, «dal centro»: cinque linee, sei livelli (0 nessuna, 1–2 Leggera, 3–4 Media, 5 Totale)
  assert.deepEqual(RV.copertura_linee, ['nessuna', 'leggera', 'leggera', 'media', 'media', 'totale']);
  assert.equal(RV['TODO(Davide) raggio'], undefined);
  assert.match(RV._nota_raggio, /^A.142/);
  assert.equal(RV.raggio_q, null, 'A.142: in piena luce nessun limite fisso');
  assert.equal(RV['TODO(Davide) token in mezzo'], undefined);
  assert.match(RV._nota_token_in_mezzo, /A\.144/);
  assert.equal(RV['TODO(Davide) copertura'], undefined);
  assert.match(RV._nota_a140, /^A\.140/);
  const d = copia(dati);
  d.mappa.visuale.copertura_linee = ['nessuna', 'leggera', 'leggera', 'media', 'totale'];
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

test('Copertura dal centro (07/10): cinque linee dal centro di chi tira verso angoli e centro del bersaglio', () => {
  const s = { ...nuovaScena({ id: 'c', nome: 'C', colonne: C, righe: R, dati }), revisione: 0 };
  const chi = tok('a', [2, 5]);
  const vuoto = ostacoliVista(s, RP);
  const libera = copertura(s, chi, tok('b', [8, 5]), vuoto, RV);
  assert.deepEqual([libera.livello, libera.bloccate, libera.origine, libera.linee.length], ['nessuna', 0, [2.5, 5.5], 5]);
  assert.deepEqual(libera.linee.map((l) => l.a), [[8, 5], [9, 5], [8, 6], [9, 6], [8.5, 5.5]], 'quattro angoli e il centro');
  const liv = (q, da = chi) => { const r = copertura(s, da, tok('b', q), ostacoliVista(s, RP), RV); return `${r.livello}/${r.bloccate}`; };
  // un pilastro di 1 Q sulla stessa riga: dal centro non ci si sporge, Totale; una riga sopra o sotto, Media; due, nessuna
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 5, 5, 5, 5, true));
  assert.deepEqual([liv([8, 5]), liv([8, 6]), liv([8, 4]), liv([8, 7])], ['totale/5', 'media/3', 'media/3', 'nessuna/0']);
  // muro a metà (colonna 5, righe 0–5): il bersaglio subito sotto la fine del muro è coperto in parte
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 5, 0, 5, 5, true));
  assert.deepEqual([liv([8, 5]), liv([8, 6]), liv([7, 6]), liv([6, 6])], ['totale/5', 'media/3', 'leggera/2', 'leggera/2']);
  // dietro lo spigolo di un muro alto 5 Q (righe 3–7): la Copertura cala allontanandosi dalla fine del muro
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 5, 3, 5, 7, true));
  assert.deepEqual([liv([8, 5]), liv([7, 8]), liv([6, 8]), liv([6, 9]), liv([6, 10])], ['totale/5', 'totale/5', 'media/4', 'leggera/1', 'nessuna/0']);
});

test('Copertura e porte (07/10): la porta chiusa blocca tutte le linee, quella aperta è un varco largo 1 Q', () => {
  const da = tok('a', [8, 6]);
  const liv = (sc, q) => { const r = copertura(sc, da, tok('b', q), ostacoliVista(sc, RP), RV); return `${r.livello}/${r.bloccate}`; };
  const aperta = scena('aperta');
  assert.deepEqual([liv(scena('chiusa'), [14, 6]), liv(scena('bloccata'), [14, 6]), liv(aperta, [14, 6]), liv(aperta, [14, 7]), liv(aperta, [14, 4])],
    ['totale/5', 'totale/5', 'nessuna/0', 'leggera/2', 'totale/5']);
});

test('token grandi (07/10): chi tira parte dal centro del suo Q più favorevole; il bersaglio grande con i suoi angoli e il centro', () => {
  const s = { ...nuovaScena({ id: 'g', nome: 'G', colonne: C, righe: R, dati }), revisione: 0 };
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 5, 0, 5, 4, true));
  const ost = ostacoliVista(s, RP);
  const b = tok('b', [8, 5]);
  const piccolo = copertura(s, tok('a', [2, 4]), b, ost, RV);
  const grande = copertura(s, tok('a', [2, 4], { ingombro: 2 }), b, ost, RV);
  assert.deepEqual([piccolo.livello, piccolo.bloccate], ['media', 3]);
  assert.deepEqual([grande.livello, grande.bloccate, grande.origine], ['nessuna', 0, [2.5, 5.5]], 'dal Q (2, 5), il primo senza linee bloccate');
  // bersaglio 2 × 2: angoli dell'ingombro e il suo centro
  const g = copertura(s, tok('a', [2, 8]), tok('b', [8, 8], { ingombro: 2 }), ost, RV);
  assert.deepEqual(g.linee.map((l) => l.a), [[8, 8], [10, 8], [8, 10], [10, 10], [9, 9]]);
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

test('token in mezzo: A.144 «creatura interposta» (decisione 145); i valori di prima «protetto» (§5.10) e «copertura» (ostacolo); causa nell’etichetta', async () => {
  const { lineaDiTiro, testoCopertura } = await import('../src/mappa/visuale.js');
  const s = { ...nuovaScena({ id: 't', nome: 'T', colonne: C, righe: R, dati }), revisione: 0 };
  const chi = tok('a', [2, 5]), bers = tok('b', [9, 5]), mezzo = tok('c', [5, 5]);
  s.token = [chi, bers, mezzo];
  const ost = ostacoliVista(s, RP);
  // predefinito «interposta» (A.144): nessuna Copertura, il token è in mezzo e si propone la creatura interposta (−2)
  assert.equal(RV.token_in_mezzo, 'interposta');
  const i = lineaDiTiro(s, chi, bers, ost, RV);
  assert.deepEqual([i.copertura, i.interposta, i.protetto, i.inMezzo.map((t) => t.id)], ['nessuna', true, false, ['c']]);
  // due creature in mezzo: sempre una sola proposta (il −2 vale una volta)
  const due = { ...s, token: [...s.token, tok('d', [7, 5])] };
  const i2 = lineaDiTiro(due, chi, bers, ostacoliVista(due, RP), RV);
  assert.deepEqual([i2.interposta, i2.inMezzo.length], [true, 2]);
  // un token a 0 PV o A Terra non conta (contaToken)
  assert.equal(lineaDiTiro(s, chi, bers, ost, RV, { contaToken: (t) => t.id !== 'c' }).interposta, false);
  // il valore di prima «protetto»: si proponeva il bersaglio protetto del §5.10
  const p = lineaDiTiro(s, chi, bers, ost, { ...RV, token_in_mezzo: 'protetto' });
  assert.deepEqual([p.copertura, p.protetto, p.interposta], ['nessuna', true, false]);
  // «copertura»: il token blocca le cinque linee (sulla stessa riga, dal centro: Totale), causa «1 token»
  const RC = { ...RV, token_in_mezzo: 'copertura' };
  const c = lineaDiTiro(s, chi, bers, ost, RC);
  assert.deepEqual([c.copertura, c.protetto, c.interposta, c.causa.muro, c.causa.token.map((t) => t.id)], ['totale', false, false, 0, ['c']]);
  assert.equal(testoCopertura(c), 'Copertura Totale (1 token)');
  // muro e token insieme: «muro + 1 token»; il token più in basso copre solo una parte
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 6, 2, 6, 4, true));
  const m = lineaDiTiro({ ...s, token: [chi, tok('b', [9, 4]), tok('c', [5, 5])] }, chi, tok('b', [9, 4]), ostacoliVista(s, RP), RC);
  assert.ok(m.causa.muro > 0 && m.causa.token.length === 1, JSON.stringify(m.causa));
  assert.match(testoCopertura(m), /\(muro \+ 1 token\)$/);
  assert.equal(testoCopertura({ copertura: 'nessuna', causa: { muro: 0, token: [] } }), 'nessuna Copertura');
  // validatore: solo i due valori
  const d = copia(dati);
  d.mappa.visuale.token_in_mezzo = 'sì';
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'visuale.token_in_mezzo'));
});

test('vista giocatori: la linea arriva con la sua etichetta; un token nascosto non pesa sulla Copertura che vedono', async () => {
  const { validaDiretta } = await import('../src/mappa/diretta.js');
  const { lineaDiTiro } = await import('../src/mappa/visuale.js');
  const base = { versione: 1, scena: 's', quando: 1, token: null, linea: { da: 'a', a: 'b', punto: null, distanza: 7, copertura: 'leggera', vista: 'parziale', testo: '7 Q · Copertura Leggera (muro)' } };
  assert.equal(validaDiretta(base), null);
  assert.match(validaDiretta({ ...base, linea: { ...base.linea, testo: 5 } }), /linea\.testo/);
  // con «copertura» il nascosto blocca la linea del master, non quella dei giocatori (contaToken senza i nascosti)
  const s = { ...nuovaScena({ id: 't', nome: 'T', colonne: C, righe: R, dati }), revisione: 0 };
  const chi = tok('a', [2, 5]), bers = tok('b', [9, 5]), nascosto = tok('n', [5, 5], { nascosto: true });
  s.token = [chi, bers, nascosto];
  const RC = { ...RV, token_in_mezzo: 'copertura' };
  assert.equal(lineaDiTiro(s, chi, bers, ostacoliVista(s, RP), RC).copertura, 'totale');
  assert.equal(lineaDiTiro(s, chi, bers, ostacoliVista(s, RP, { perGiocatori: true }), RC, { contaToken: (t) => !t.nascosto }).copertura, 'nessuna');
});
