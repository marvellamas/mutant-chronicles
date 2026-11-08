import '../tools/guardia-subito.mjs';
// Lotto 182 (08/11/2026): le tre risposte di Davide del 06/11 sulla mappa — A.253 (decollo e atterraggio della
// Neverlost), A.254 (dove sta la testa della Madre delle Murene) e A.255 (la Murena eterea dentro la roccia).
// Fra queste prove, due che devono fallire se si torna indietro:
//   - i movimenti in volo non si convertono nella scala della scena (A.253);
//   - la testa non esce mai dalla sagoma (A.254).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { decolla, atterra, finisciStazionamento, movimentoVolo, movimentoInScena, statoVolo, vola, testoVolo } from '../src/volo-veicolo.js';
import { decollaVeicolo, atterraVeicolo, voloDalRoundDopo } from '../src/veicoli-registro.js';
import { pezziDellaScena } from '../src/mappa/partecipanti.js';
import { nuovoVeicolo } from '../src/veicoli.js';
import { spostaTesta, testaAutomatica, cellaTesta, testaSpostabile, celle as celleToken } from '../src/mappa/sagoma.js';
import { immersoNellaRoccia, quadrettiEmersi, statoImmersione, motivoNonAttacca, motivoNonBersagliabile, usciteDallaRoccia, resaCorporeaNellaRoccia } from '../src/mappa/roccia.js';
import { registraAttacco, haAttaccatoNelRound } from '../src/scontro.js';
import { areaRaggiungibile, costoVerso } from '../src/mappa/area.js';
import { rocciaEffettiva } from '../src/mappa/porte.js';
import { daBase64 } from '../src/mappa/celle.js';

const { dati } = await caricaDati((n) => readFile(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const NEV = dati.veicoli.profili.find((p) => p.id === 'neverlost');
const REGOLE = dati.mappa.movimento;
const recNeverlost = () => ({ id: 'vei-nl', proprietario: { tipo: 'gruppo' }, conducente: { chiave: 'pilota', nome: 'Pilota' }, mezzo: { ...nuovoVeicolo('neverlost', dati), andatura: 'controllata' } });

// ───────────────────────────── A. A.253: decollo e atterraggio ─────────────────────────────

test('A.253: a terra la Neverlost non rulla — movimento 0, in qualunque scala', () => {
  const m = recNeverlost().mezzo;
  assert.equal(vola(NEV), true);
  assert.equal(statoVolo(m, dati).id, 'a_terra', 'un mezzo nuovo è a terra');
  assert.equal(movimentoVolo(NEV, m, dati).q, 0);
  for (const scala of ['base', 'tattica']) {
    const v = movimentoInScena(NEV, m, scala, dati);
    assert.equal(v.q, 0, `${scala}: movimento 0`);
    assert.equal(v.convertibile, true, 'uno zero non ha niente da convertire');
  }
  assert.match(testoVolo(NEV, m, dati), /A terra · movimento 0 Q/);
});

test('A.253: il decollo è una manovra complessa, 1 AzM + 1 AzP, normalmente senza prova', () => {
  const r = decolla(recNeverlost().mezzo, NEV, dati, { round: 3 });
  assert.ok(!r.errore, r.errore);
  assert.deepEqual([r.azioni.azm, r.azioni.azp], [1, 1]);
  assert.match(r.azioni.testo, /1 AzM \+ 1 AzP/);
  assert.equal(r.prova.serve, false, 'normalmente non richiede prova');
  // i tre casi in cui la prova serve
  for (const caso of ['spazio_ristretto', 'attacco_in_corso', 'danni']) {
    const p = decolla(recNeverlost().mezzo, NEV, dati, { round: 3, casi: [caso] });
    assert.equal(p.prova.serve, true, `${caso}: la prova serve`);
    assert.equal(p.prova.nomi.length, 1);
  }
  // un caso inventato non conta
  assert.equal(decolla(recNeverlost().mezzo, NEV, dati, { casi: ['vento'] }).prova.serve, false);
});

test('A.253: nel Round del decollo sale in stazionamento, senza spostamento orizzontale', () => {
  const r = decolla(recNeverlost().mezzo, NEV, dati, { round: 3 });
  assert.equal(statoVolo(r.mezzo, dati).id, 'stazionamento');
  assert.equal(r.mezzo.volo.dal_round, 3);
  // nel suo Round non si sposta di lato: movimento 0
  assert.equal(movimentoInScena(NEV, r.mezzo, 'tattica', dati).q, 0);
  assert.equal(movimentoInScena(NEV, r.mezzo, 'base', dati).q, 0);
  assert.match(r.testo, /sale in stazionamento, senza spostamento orizzontale/);
  // non si decolla due volte
  assert.ok(decolla(r.mezzo, NEV, dati).errore);
});

test('A.253: i movimenti in volo NON si convertono nella scala della scena', () => {
  let m = decolla(recNeverlost().mezzo, NEV, dati, { round: 3 }).mezzo;
  m = finisciStazionamento(m, NEV, dati, { round: 4 }).mezzo;
  // nella sua scala i numeri ci sono
  const tattica = movimentoInScena(NEV, m, 'tattica', dati);
  assert.equal(tattica.convertibile, true);
  assert.equal(tattica.q, 8, 'Controllata: 8 Q Tattici');
  // sulla mappa terrestre no: niente numero di quadretti, e le due strade
  const base = movimentoInScena(NEV, m, 'base', dati);
  // la prova che deve fallire se i movimenti in volo tornano a convertirsi
  assert.equal(base.convertibile, false, 'in volo i movimenti non si convertono (A.253)');
  assert.equal(base.q, undefined, 'nessun numero di quadretti inventato');
  assert.deepEqual(base.valori, { controllata: 8, veloce: 16, massima: 24 });
  assert.equal(base.da, 'tattica');
  assert.equal(base.a, 'base');
  assert.equal(base.strade.length, 2, 'le due strade: scala tattica, oppure fuori dalla mappa');
  assert.match(base.strade.join(' '), /tattica/);
  assert.match(base.strade.join(' '), /mappa/);
  // e in nessun punto compaiono 80, 160 o 240
  assert.ok(!/\b(80|160|240)\b/.test(JSON.stringify(base)), 'niente 80 / 160 / 240 Q Base');
});

test('A.253: le altre andature in volo, e lo Scout che non vola non cambia', () => {
  let m = decolla(recNeverlost().mezzo, NEV, dati, { round: 1 }).mezzo;
  m = finisciStazionamento(m, NEV, dati, { round: 2 }).mezzo;
  for (const [a, q] of [['controllata', 8], ['veloce', 16], ['massima', 24]]) {
    assert.equal(movimentoVolo(NEV, { ...m, andatura: a }, dati).q, q);
  }
  // un mezzo che non vola non passa di qui: vale il movimento di sempre
  const scout = dati.veicoli.profili.find((p) => p.id === 'asa-scout-mk4');
  assert.equal(vola(scout), false);
  assert.equal(movimentoVolo(scout, { andatura: 'controllata' }, dati), null);
});

test('A.253: l’atterraggio conclude il movimento e riporta a terra', () => {
  let m = decolla(recNeverlost().mezzo, NEV, dati, { round: 1 }).mezzo;
  m = finisciStazionamento(m, NEV, dati, { round: 2 }).mezzo;
  const a = atterra(m, NEV, dati, { round: 5 });
  assert.equal(a.concludeMovimento, true);
  assert.equal(statoVolo(a.mezzo, dati).id, 'a_terra');
  assert.equal(movimentoInScena(NEV, a.mezzo, 'tattica', dati).q, 0, 'a terra non rulla');
  assert.ok(atterra(a.mezzo, NEV, dati).errore, 'già a terra');
});

test('A.253: dalla mappa — il pezzo del veicolo porta lo stato e, in volo, l’avviso invece di un numero', () => {
  const rec = recNeverlost();
  const aTerra = pezziDellaScena({ veicoli: [rec], scena: { scala: 'base' } }, dati).find((p) => p.tipo === 'veicolo');
  assert.equal(aTerra.statoVolo.id, 'a_terra');
  assert.equal(aTerra.movimento.passo, 0);
  assert.equal(aTerra.movimentoNonConvertibile, undefined);
  // in volo, su una mappa in Q Base
  let r = decollaVeicolo(rec, NEV, dati, { round: 1 }).rec;
  r = voloDalRoundDopo(r, NEV, dati, { round: 2 });
  const inVolo = pezziDellaScena({ veicoli: [r], scena: { scala: 'base' } }, dati).find((p) => p.tipo === 'veicolo');
  assert.equal(inVolo.statoVolo.id, 'in_volo');
  assert.equal(inVolo.movimento.passo, null, 'nessun numero: non si converte');
  assert.ok(inVolo.movimentoNonConvertibile, 'il pezzo porta l’avviso con le due strade');
  assert.equal(inVolo.movimentoNonConvertibile.strade.length, 2);
  // sulla mappa tattica il numero c'è
  const tattica = pezziDellaScena({ veicoli: [r], scena: { scala: 'tattica' } }, dati).find((p) => p.tipo === 'veicolo');
  assert.equal(tattica.movimento.passo, 8);
  assert.equal(tattica.movimentoNonConvertibile, undefined);
  // l'atterraggio dal registro
  const giu = atterraVeicolo(r, NEV, dati, { round: 3 });
  assert.equal(giu.concludeMovimento, true);
  assert.equal(statoVolo(giu.rec.mezzo, dati).id, 'a_terra');
});

// ───────────────────────────── B. A.254: dove sta la testa ─────────────────────────────

/** La Madre delle Murene: una sagoma 2 × 6 che guarda in basso. */
const madre = () => ({ id: 'tk-madre', rif: { tipo: 'partecipante', id: 'p1' }, q: [5, 5], ingombro: [2, 6], base: [2, 6], angolo: 180 });

test('A.254: la testa va in qualunque quadretto della sagoma, anche centrale', () => {
  const t = madre();
  const mie = celleToken(t);
  assert.ok(mie.length > 1);
  for (const c of mie) {
    const r = spostaTesta(t, c);
    assert.ok(!r.errore, `${c}: ${r.errore}`);
    assert.deepEqual(cellaTesta(r.token), c, 'la testa finisce dove l’ha messa il Direttore');
  }
  // una centrale: la A.254 la ammette esplicitamente
  const centrale = mie[Math.floor(mie.length / 2)];
  assert.ok(!spostaTesta(t, centrale).errore);
});

test('A.254: la testa non esce mai dalla sagoma', () => {
  const t = madre();
  const mie = celleToken(t);
  const dentro = new Set(mie.map(([x, y]) => `${x},${y}`));
  // la prova che deve fallire se la testa può uscire dalla sagoma
  for (const fuori of [[0, 0], [4, 5], [11, 5], [5, 4], [5, 7], [100, 100], [-1, 5]]) {
    assert.ok(!dentro.has(`${fuori[0]},${fuori[1]}`), 'il quadretto di prova è davvero fuori');
    const r = spostaTesta(t, fuori);
    assert.ok(r.errore, `${fuori} è fuori dalla sagoma: va rifiutato`);
    assert.match(r.errore, /sagoma/);
  }
  // e comunque, qualunque sia il segno salvato, la testa cade su un quadretto occupato
  const falsato = { ...t, testa: { avanti: 99, lato: -99 } };
  assert.ok(dentro.has(cellaTesta(falsato).join(',')), 'la testa resta sulla sagoma anche con un segno assurdo');
});

test('A.254: la testa non si sposta fra un attacco e l’altro — l’app lo dice', () => {
  const t = madre();
  const cella = celleToken(t)[2];
  // non ha ancora attaccato: nessun avviso
  const libero = spostaTesta(t, cella, { haAttaccato: false, dati });
  assert.ok(!libero.errore);
  assert.equal(libero.avviso, undefined);
  assert.equal(testaSpostabile({ haAttaccato: false }, dati).si, true);
  // ha già attaccato in questo Round: si sposta lo stesso (l'ultima parola è del Direttore), con l'avviso
  const dopo = spostaTesta(t, cella, { haAttaccato: true, dati });
  assert.ok(!dopo.errore);
  assert.ok(dopo.token, 'avvisa, non blocca');
  assert.match(dopo.avviso, /non si sposta fra un attacco e l’altro/);
  assert.match(dopo.avviso, /A\.254/);
  // i motivi legittimi sono scritti nell'avviso
  for (const motivo of ['muove', 'ruota', 'configurazione', 'posa']) assert.match(dopo.avviso, new RegExp(motivo));
  assert.equal(testaSpostabile({ haAttaccato: true }, dati).si, false);
});

test('A.254: «ha già attaccato in questo Round» si legge dal registro dello scontro', () => {
  const s0 = { id: 'sc1', round: 2, partecipanti: [], registro: [] };
  assert.equal(haAttaccatoNelRound(s0, 'Madre delle Murene'), false);
  const s1 = registraAttacco(s0, { attaccante: 'Madre delle Murene', bersaglio: 'Lucas', arma: 'Morso', va: 14, tiri: [], esito: 'successo' }, new Date());
  assert.equal(haAttaccatoNelRound(s1, 'Madre delle Murene'), true);
  assert.equal(haAttaccatoNelRound(s1, 'Un altro'), false);
  // nel Round dopo riparte: la testa si può spostare
  assert.equal(haAttaccatoNelRound({ ...s1, round: 3 }, 'Madre delle Murene'), false);
});

test('A.254: il segno sposta solo l’origine, non movimento, spazio o portata', () => {
  const t = madre();
  const prima = { celle: celleToken(t).length, q: [...t.q], ingombro: [...t.ingombro] };
  const r = spostaTesta(t, celleToken(t)[1]);
  assert.deepEqual(r.token.q, prima.q, 'il token non si muove');
  assert.deepEqual(r.token.ingombro, prima.ingombro, 'lo spazio occupato non cambia');
  assert.equal(celleToken(r.token).length, prima.celle);
  // «Testa automatica» torna all'estremità del muso
  assert.equal(testaAutomatica(r.token).testa, undefined);
  // i dati dicono che cosa sposta e che cosa no
  assert.match(dati.mappa.testa.sposta_solo, /attacchi/);
  assert.deepEqual(dati.mappa.testa.non_sposta, ['movimento', 'spazio occupato', 'portata']);
});

// ───────────────────────────── C. A.255: la Murena dentro la roccia ─────────────────────────────

/** Una scena 10 × 10 con una parete di roccia nelle colonne 4–7 (roccia = anche muro, A.224). */
function scenaConRoccia({ colonne = 10, righe = 10, da = 4, a = 7 } = {}) {
  const bit = (lista) => {
    const m = new Uint8Array(Math.ceil((colonne * righe) / 8));
    for (const [x, y] of lista) { const i = y * colonne + x; m[i >> 3] |= 1 << (i & 7); }
    return Buffer.from(m).toString('base64');
  };
  const q = [];
  for (let y = 0; y < righe; y++) for (let x = da; x <= a; x++) q.push([x, y]);
  return { griglia: { colonne, righe, q_px: 50, scosto_x: 0, scosto_y: 0 }, muri: bit(q), roccia: bit(q), porte: [], token: [], linee: [] };
}
const murena = (q = [5, 5]) => ({ id: 'tk-mu', rif: { tipo: 'partecipante', id: 'm1' }, q: [...q], ingombro: 1 });
const eterea = { attraversaRoccia: true, nome: 'Murena della Roccia cucciolo' };

test('A.255: la Murena eterea può terminare il movimento dentro la roccia', () => {
  const scena = scenaConRoccia();
  const t = murena([5, 5]);
  assert.equal(immersoNellaRoccia(t, scena), true, 'il quadretto 5,5 è roccia');
  assert.equal(quadrettiEmersi(t, scena), 0);
  // fuori dalla parete non è immersa
  assert.equal(immersoNellaRoccia(murena([1, 5]), scena), false);
  assert.equal(quadrettiEmersi(murena([1, 5]), scena), 1);
  // i dati lo dicono
  assert.equal(dati.mappa.roccia.immersione.puo_fermarsi, true);
});

test('A.255: completamente immersa non vede, non attacca e non è bersagliabile', () => {
  const scena = scenaConRoccia();
  const s = statoImmersione(murena([5, 5]), scena, dati, { pezzo: eterea });
  assert.equal(s.immersa, true);
  assert.equal(s.vista, false);
  assert.equal(s.effetto, false);
  assert.equal(s.attacca, false);
  assert.equal(s.bersagliabile, false);
  assert.equal(s.percepisce, false);
  assert.match(s.perAttaccare, /emergere/);
  assert.ok(motivoNonAttacca(murena([5, 5]), scena, dati, { pezzo: eterea }));
  assert.ok(motivoNonBersagliabile(murena([5, 5]), scena, dati, { pezzo: eterea }));
  // emersa anche di un solo quadretto: vale tutto il normale
  const fuori = murena([3, 5]);
  const f = statoImmersione(fuori, scena, dati, { pezzo: eterea });
  assert.equal(f.immersa, false);
  assert.equal(f.attacca, true);
  assert.equal(motivoNonAttacca(fuori, scena, dati, { pezzo: eterea }), null);
  // chi non attraversa la roccia non è mai «immerso»: non ci può stare
  assert.equal(statoImmersione(murena([5, 5]), scena, dati, { pezzo: { attraversaRoccia: false } }).immersa, false);
});

test('A.255: emerge spendendo il normale movimento e rientra con il residuo, nello stesso Round', () => {
  const scena = scenaConRoccia({ da: 4, a: 7 });
  const g = scena.griglia;
  const comune = { colonne: g.colonne, righe: g.righe, muri: daBase64(scena.muri), terreno: null, token: [], regole: REGOLE, roccia: rocciaEffettiva(scena) };
  // dal 5,5 (dentro la roccia) la Murena eterea esce dalla parete con il normale movimento
  const area = areaRaggiungibile({ ...comune, chi: { id: 'tk-mu', q: [5, 5], ingombro: 1, attraversaRoccia: true }, massimo: 6 });
  const costoFuori = costoVerso(area, [3, 5]);
  assert.ok(Number.isFinite(costoFuori), 'esce dalla parete con il movimento normale');
  assert.ok(costoFuori <= 6);
  // il residuo basta a rientrare nello stesso Round
  const rientro = areaRaggiungibile({ ...comune, chi: { id: 'tk-mu', q: [3, 5], ingombro: 1, attraversaRoccia: true }, massimo: 6 - costoFuori });
  assert.ok(Number.isFinite(costoVerso(rientro, [5, 5])), 'con il residuo rientra nella roccia nello stesso Round');
  // la roccia resta un muro per chi non la attraversa
  const altro = areaRaggiungibile({ ...comune, chi: { id: 'altro', q: [1, 5], ingombro: 1 }, massimo: 10 });
  assert.equal(costoVerso(altro, [5, 5]), Infinity, 'chi non attraversa la roccia non ci entra');
});

test('A.255: resa corporea nella roccia — casella libera più vicina alla superficie, Prona, senza opportunità', () => {
  const scena = scenaConRoccia({ da: 4, a: 7 });
  const t = murena([5, 5]);
  const r = resaCorporeaNellaRoccia(t, scena, dati, { colonne: 10, righe: 10, muro: () => false, occupato: () => false });
  assert.ok(r, 'la creatura è dentro la roccia');
  assert.equal(r.stato, 'Prona');
  assert.equal(r.senzaOpportunita, true);
  assert.ok(r.proposte.length >= 1);
  // nessuna proposta è dentro la roccia
  for (const [x] of r.proposte) assert.ok(x < 4 || x > 7, `la proposta ${x} non è nella parete`);
  // la più vicina alla superficie: dal 5,5 la parete va da 4 a 7, quindi il 3 (a sinistra) dista 2
  assert.equal(r.distanza, 2);
  assert.ok(r.proposte.every(([x]) => x === 3), 'a sinistra è più vicino che a destra');
  // a parità di distanza decide il Direttore: l'app propone, non sceglie
  assert.equal(r.pariMerito, true, 'più caselle a pari distanza');
  assert.match(r.decideIlDirettore, /Direttore/);
  // una creatura non immersa non ha niente da proporre
  assert.equal(resaCorporeaNellaRoccia(murena([1, 5]), scena, dati), null);
});

test('A.255: le caselle occupate o murate non si propongono, e senza uscite lo dice', () => {
  const scena = scenaConRoccia({ da: 4, a: 7 });
  const t = murena([5, 5]);
  const ambiente = { colonne: 10, righe: 10, muro: (x) => x === 3, occupato: () => false };
  const r = usciteDallaRoccia(t, scena, ambiente);
  assert.ok(r.proposte.every(([x]) => x !== 3), 'il muro non si propone');
  assert.equal(r.distanza, 3, 'la prima libera è più lontana');
  // tutto occupato: nessuna proposta, e il Direttore decide a mano
  const niente = usciteDallaRoccia(t, scena, { colonne: 10, righe: 10, muro: () => true, occupato: () => false });
  assert.equal(niente.nessuna, true);
  assert.deepEqual(niente.proposte, []);
});

test('A.255: senza maschera della roccia nella scena non cambia niente (le scene di prima)', () => {
  const scena = { griglia: { colonne: 10, righe: 10, q_px: 50, scosto_x: 0, scosto_y: 0 }, muri: null, porte: [], token: [], linee: [] };
  assert.equal(immersoNellaRoccia(murena([5, 5]), scena), false);
  assert.equal(statoImmersione(murena([5, 5]), scena, dati, { pezzo: eterea }).immersa, false);
});
