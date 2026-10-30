// A.203 (la Madre delle Murene ha due configurazioni) e A.202 (la Murena della Roccia cucciolo è eterea, in overdose corporea),
// risposte di Davide del 30/10/2026. Il punto da non sbagliare: cambiare configurazione o forma a metà scontro non azzera niente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { datiReali } from './helpers.js';
import {
  nuovoScontro, aggiungiNemici, variaPvNemico, cambiaStatoNemico, usaCapacitaNemico, registraTiro, registraDurata, avanti, indietro,
  configurazioneAttuale, cambiaConfigurazione, formaAttuale, cambiaForma, formeFinite, ordineIniziativa,
} from '../src/scontro.js';
import { validaNemico } from '../src/validate.js';
import { pezziDellaScena, tokenDaAdattare, adattaToken, movimentoNemico } from '../src/mappa/partecipanti.js';
import { cellaTesta, tokenTesta } from '../src/mappa/sagoma.js';
import { formaDi, formaRuotata } from '../src/mappa/forma.js';
import { areaRaggiungibile, costoVerso } from '../src/mappa/area.js';
import { nuovaMaschera, inBase64 } from '../src/mappa/celle.js';
import { calcolaAttaccoNemico } from '../src/nemico-attacco.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';

const { dati } = await datiReali();
const T0 = new Date('2026-10-30T10:00:00Z');
const leggi = (id) => JSON.parse(readFileSync(fileURLToPath(new URL(`../esempi/nemici/mostri/${id}.json`, import.meta.url)), 'utf8'));
const madre = leggi('madre-delle-murene-della-roccia');
const cucciolo = leggi('murena-della-roccia-cucciolo');

// ---- A.203 ---------------------------------------------------------------------------------------------------------
test('A.203: la Madre ha le due configurazioni dei dati — parzialmente emersa 2 × 2, completamente emersa 6 × 2 — e gli attacchi partono dalla testa', () => {
  assert.deepEqual(validaNemico(madre, dati, 'madre'), []);
  assert.deepEqual(madre.configurazioni.map((c) => [c.id, c.nome, c.spazio]), [['parziale', 'Parzialmente emersa', '2 × 2 Q'], ['completa', 'Completamente emersa', '6 × 2 Q']]);
  assert.match(madre.configurazioni[0].nota, /fino a 4 Q restando parzialmente nella roccia/);
  assert.equal(madre.spazio, '6 × 2 Q', 'lo Spazio del profilo è la configurazione di partenza');
  assert.equal(madre.origine_testa, true);
});

function scontroConMadre() {
  let s = nuovoScontro({ id: 'a203', pg: [{ chiave: 'ada', nome: 'Ada', iniziativa: 3, des: 7, int: 5 }], adesso: T0 });
  s = aggiungiNemici(s, madre, 1, {}, T0);
  const id = s.partecipanti.find((p) => p.tipo === 'nemico').id;
  // metà scontro: PV persi, Ferite, Stati, un uso di capacità, un'Iniziativa tirata, una durata
  s = variaPvNemico(s, id, -(madre.pv - 17), T0);
  s = { ...s, partecipanti: s.partecipanti.map((p) => (p.id === id ? { ...p, ferite: 2, menomazioni: [{ parte: 'Braccia', tipo: 'temporanea' }], pm: { attuali: 3, massimo: p.pm?.massimo ?? 10 } } : p)) };
  const stato = dati.regole.stati.elenco.find((x) => x.id === 'accecato');
  s = cambiaStatoNemico(s, id, stato, true, T0);
  const cap = madre.capacita.find((c) => c.usi) ?? madre.capacita[0];
  s = usaCapacitaNemico(s, id, cap.nome, 1, T0);
  s = registraTiro(s, id, 'd10', { valore: 7, origine: 'app' }, dati, T0);
  s = registraTiro(s, 'pg:ada', 'd10', { valore: 2, origine: 'app' }, dati, T0);
  s = registraDurata(s, id, stato, { valore: 3, origine: 'app' }, T0, dati);
  return { s, id };
}

test('A.203: cambiare configurazione conserva PV, PM, Ferite, Menomazioni, Stati, durate, usi, Iniziativa e turno — cambia solo la misura', () => {
  const { s, id } = scontroConMadre();
  const prima = s.partecipanti.find((p) => p.id === id);
  assert.equal(configurazioneAttuale(prima).id, 'completa');
  const t = cambiaConfigurazione(s, id, 'parziale', T0);
  const dopo = t.partecipanti.find((p) => p.id === id);
  assert.equal(configurazioneAttuale(dopo).id, 'parziale');
  const { configurazione, ...senzaConf } = dopo;
  assert.equal(configurazione, 'parziale');
  assert.deepEqual(senzaConf, prima, 'ogni altro campo del partecipante è identico (PV, PM, Ferite, Stati, usi, d10, scheda…)');
  assert.deepEqual(t.durate, s.durate);
  assert.equal(t.round, s.round);
  assert.equal(t.turno, s.turno);
  assert.deepEqual(t.partecipanti.filter((p) => p.id !== id), s.partecipanti.filter((p) => p.id !== id));
  assert.deepEqual(ordineIniziativa(t).ordinati.map((p) => p.id), ordineIniziativa(s).ordinati.map((p) => p.id));
  assert.equal(t.registro.length, s.registro.length + 1);
  assert.match(t.registro.at(-1).testo, /Parzialmente emersa \(2 × 2 Q\)\. PV, PM, Ferite, Stati e Azioni già spese restano/);
  // e si torna: stato identico a quello di partenza (salvo il segno della scelta)
  const ritorno = cambiaConfigurazione(t, id, 'completa', T0);
  const { configurazione: _c, ...e } = ritorno.partecipanti.find((p) => p.id === id);
  assert.deepEqual(e, senzaConf);
  // una configurazione sconosciuta o una creatura senza non si cambia
  assert.throws(() => cambiaConfigurazione(s, id, 'sott’acqua', T0), /non prevista dal profilo/);
  assert.equal(cambiaConfigurazione(s, id, 'completa', T0), s, 'già così: nessuna riga');
});

test('A.203: il token sulla mappa segue la configurazione nello stesso punto e con lo stesso orientamento; gli altri campi del token restano', () => {
  const { s, id } = scontroConMadre();
  const scena = { ...nuovaScena({ id: 'sc', nome: 'Sc', colonne: 40, righe: 40, dati }), token: [] };
  const pezzoCompleta = pezziDellaScena({ scontro: s, scena }, dati).find((p) => p.tipo === 'nemico');
  assert.deepEqual(pezzoCompleta.ingombro, [6, 2]);
  assert.equal(pezzoCompleta.testaOrigine, true);
  const parziale = cambiaConfigurazione(s, id, 'parziale', T0);
  const pezzoParziale = pezziDellaScena({ scontro: parziale, scena }, dati).find((p) => p.tipo === 'nemico');
  assert.equal(pezzoParziale.ingombro, 2, '2 × 2 = un quadrato di lato 2');
  // un token della completa, allineato, nascosto, con luce
  const tokenAll = { id: 't-madre', rif: pezzoCompleta.rif, q: [10, 10], ingombro: [6, 2], nascosto: true, luce: 4 };
  assert.deepEqual(tokenDaAdattare({ ...scena, token: [tokenAll] }, [pezzoCompleta]), [], 'stessa misura: niente da adattare');
  const da = tokenDaAdattare({ ...scena, token: [tokenAll] }, [pezzoParziale]);
  assert.equal(da.length, 1);
  const nuovo = adattaToken(tokenAll, pezzoParziale, scena.griglia);
  assert.deepEqual([nuovo.id, nuovo.nascosto, nuovo.luce, nuovo.rif], ['t-madre', true, 4, pezzoCompleta.rif]);
  assert.equal(nuovo.ingombro, 2);
  // stesso centro: il 6 × 2 in (10,10) ha centro (13, 11); il 2 × 2 sta in (12, 10) con centro (13, 11)
  assert.deepEqual(nuovo.q, [12, 10]);
  assert.equal(nuovo.angolo, undefined);
  // ritorno alla completa: ancora lo stesso centro
  const ancora = adattaToken(nuovo, pezzoCompleta, scena.griglia);
  assert.deepEqual([ancora.q, ancora.ingombro], [[10, 10], [6, 2]]);
  assert.equal(validaScena({ ...scena, token: [ancora] }, dati), null);
  // girata di 45° il token tiene l'orientamento e il centro nel passare dalla parziale (quadrata) alla completa
  const f = formaRuotata([6, 2], 45);
  const ruotata = { id: 't-madre', rif: pezzoCompleta.rif, q: [15, 15], angolo: 45, base: [6, 2], ingombro: f.ingombro, perno: [15 + f.centro[0], 15 + f.centro[1]], nascosto: false };
  const quadrata = adattaToken(ruotata, pezzoParziale, scena.griglia);
  assert.equal(quadrata.base, undefined);
  const centroPrima = [ruotata.q[0] + f.centro[0], ruotata.q[1] + f.centro[1]];
  assert.ok(Math.abs(quadrata.q[0] + 1 - centroPrima[0]) <= 0.5 && Math.abs(quadrata.q[1] + 1 - centroPrima[1]) <= 0.5, 'il centro si sposta al più di mezzo quadretto (arrotondamento sulla griglia)');
  const girata = adattaToken(quadrata, pezzoCompleta, scena.griglia);
  assert.deepEqual(girata.ingombro, [6, 2], 'dal quadrato si riparte allineati: l’orientamento di una pedina quadrata non esiste');
});

test('A.203: la testa dà l’origine degli attacchi — è il quadretto all’estremità del muso, e segue la rotazione', () => {
  // 6 × 2 allineata (più larga che alta): guarda a destra, la testa è il quadretto più a destra
  const all = { id: 'm', q: [10, 10], ingombro: [6, 2] };
  const t = cellaTesta(all);
  assert.equal(t[0], 15);
  assert.ok([10, 11].includes(t[1]));
  // 2 × 6 (alta): guarda in basso
  assert.deepEqual(cellaTesta({ id: 'm', q: [10, 10], ingombro: [2, 6] }).slice(1)[0] >= 15, true);
  // ruotata a 90° e a 270°: la testa è all'estremità opposta
  for (const [a, lato] of [[90, 'destra'], [270, 'sinistra'], [0, 'alto'], [180, 'basso']]) {
    const f = formaRuotata([6, 2], a);
    const tok = { id: 'm', q: [10, 10], angolo: a, base: [6, 2], ingombro: f.ingombro };
    const c = cellaTesta(tok);
    const celle = formaDi(tok).celle.map(([x, y]) => [x + 10, y + 10]);
    const xs = celle.map((q) => q[0]); const ys = celle.map((q) => q[1]);
    if (lato === 'destra') assert.equal(c[0], Math.max(...xs));
    if (lato === 'sinistra') assert.equal(c[0], Math.min(...xs));
    if (lato === 'alto') assert.equal(c[1], Math.min(...ys));
    if (lato === 'basso') assert.equal(c[1], Math.max(...ys));
    assert.ok(celle.some((q) => q[0] === c[0] && q[1] === c[1]), 'la testa è un quadretto occupato');
  }
  // il token della testa è un quadretto solo, senza sagoma
  const h = tokenTesta({ id: 'm', q: [10, 10], angolo: 90, base: [6, 2], ingombro: formaRuotata([6, 2], 90).ingombro, rif: { tipo: 'partecipante', id: 'x' } });
  assert.deepEqual([h.ingombro, h.angolo, h.base, h.id], [1, undefined, undefined, 'm']);
  // una creatura di un quadretto: la testa è il suo quadretto
  assert.deepEqual(cellaTesta({ id: 'x', q: [3, 4], ingombro: 1 }), [3, 4]);
});

// ---- A.202 ---------------------------------------------------------------------------------------------------------
function scontroConCucciolo() {
  let s = nuovoScontro({ id: 'a202', pg: [], adesso: T0 });
  s = aggiungiNemici(s, cucciolo, 1, {}, T0);
  const id = s.partecipanti[0].id;
  s = registraTiro(s, id, 'd10', { valore: 5, origine: 'app' }, dati, T0);
  return { s, id };
}

test('A.202: la Murena cucciolo ha due forme — eterea (6 / 12 / 18 Q Base, attraversa la roccia) e corporea in overdose (ferma) — e il 6 / 12 / 18 non è un movimento terrestre', () => {
  assert.deepEqual(validaNemico(cucciolo, dati, 'cucciolo'), []);
  assert.deepEqual(cucciolo.forme.map((f) => [f.id, f.muove, f.attacca, f.schiva, f.attraversa_roccia]), [['eterea', true, true, true, true], ['corporea', false, false, false, false]]);
  assert.match(cucciolo.forme[0].nota, /in forma eterea, attraversamento della roccia compreso; nessun movimento terrestre/);
  const { s, id } = scontroConCucciolo();
  const p = s.partecipanti[0];
  assert.equal(formaAttuale(p).id, 'eterea');
  assert.deepEqual(movimentoNemico(p.scheda, p.stati, dati, formaAttuale(p)), { passo: 6, corsa: 12, scatto: 18 });
  const t = cambiaForma(s, id, 'corporea', { fino: s.round + 1 }, T0);
  const q = t.partecipanti[0];
  assert.equal(formaAttuale(q).id, 'corporea');
  assert.deepEqual(q.forma, { id: 'corporea', fino: 2 });
  const m = movimentoNemico(q.scheda, q.stati, dati, formaAttuale(q));
  assert.deepEqual([m.passo, m.corsa, m.scatto], [0, null, null]);
  assert.match(m.fermoPer, /Corporea/);
  assert.match(t.registro.at(-1).testo, /Corporea \(overdose\) fino alla fine del Round 2\. Non si muove volontariamente\. Non attacca\. Non Schiva\. Non attraversa la roccia\./);
  // i pezzi della mappa lo sanno: fermo, e non attraversa la roccia
  const pz = pezziDellaScena({ scontro: t }, dati).find((x) => x.tipo === 'nemico');
  assert.deepEqual([pz.movimento.passo, pz.forma, pz.attraversaRoccia], [0, 'corporea', false]);
  const pe = pezziDellaScena({ scontro: s }, dati).find((x) => x.tipo === 'nemico');
  assert.deepEqual([pe.movimento.passo, pe.forma, pe.attraversaRoccia], [6, 'eterea', true]);
});

test('A.202: in overdose «Attacca!» avvisa (non blocca) che non attacca; da eterea nessun avviso', () => {
  // il profilo del cucciolo non ha attacchi in tabella (il morso è nel testo): se ne dà uno, per provare l’avviso
  let s = nuovoScontro({ id: 'a202b', pg: [], adesso: T0 });
  s = aggiungiNemici(s, { ...cucciolo, attacchi: [{ nome: 'Morso', tipo: 'ravvicinato', va: 10, danno: '1d4', natura: 'Naturale', portata_q: 1 }] }, 1, {}, T0);
  const id = s.partecipanti[0].id;
  const eterea = calcolaAttaccoNemico(s.partecipanti[0], 0, {}, dati);
  assert.ok(!(eterea.risultato.avvisi ?? []).some((a) => /non attacca/.test(a)));
  const t = cambiaForma(s, id, 'corporea', { fino: 2 }, T0);
  const corp = calcolaAttaccoNemico(t.partecipanti[0], 0, {}, dati);
  assert.ok(corp.risultato.avvisi.some((a) => /«Corporea \(overdose\)»: in questa forma non attacca/.test(a)));
  assert.ok(Number.isFinite(corp.risultato.va_finale), 'il calcolo c’è comunque: decide il master');
});

test('A.202: l’overdose finisce da sola alla fine del Round R+1 e «Indietro» la rimette; il resto del partecipante non cambia', () => {
  const { s: s0, id } = scontroConCucciolo();
  let s = cambiaForma(s0, id, 'corporea', { fino: s0.round + 1 }, T0); // overdose al Round 1, vale fino al 2
  s = variaPvNemico(s, id, -1, T0);
  const dopo = (x) => { const { forma: _f, ...r } = x.partecipanti[0]; return r; };
  const opz = { indietroMax: 5 };
  // Round 1 → turno unico: avanti passa al Round 2: l'overdose vale ancora
  s = avanti(s, T0, opz);
  assert.equal(s.round, 2);
  assert.equal(formaAttuale(s.partecipanti[0]).id, 'corporea');
  assert.deepEqual(formeFinite(s, 2), []);
  // Round 2 → 3: finita
  const prima = s;
  s = avanti(s, T0, opz);
  assert.equal(s.round, 3);
  assert.equal(formaAttuale(s.partecipanti[0]).id, 'eterea');
  assert.equal(s.partecipanti[0].forma, undefined);
  assert.match(s.registro.map((r) => r.testo).join('\n'), /finita la forma limitata, torna Eterea/);
  assert.deepEqual(dopo(s), dopo(prima), 'PV, Stati e il resto sono quelli di prima');
  // Indietro: torna il Round 2 e l'overdose
  const ind = indietro(s, T0);
  assert.equal(ind.round, 2);
  assert.deepEqual(ind.partecipanti[0].forma, { id: 'corporea', fino: 2 });
  // forma di partenza: «torna eterea» a mano la rimette senza limiti
  const manuale = cambiaForma(prima, id, 'eterea', {}, T0);
  assert.equal(manuale.partecipanti[0].forma, undefined);
  assert.throws(() => cambiaForma(prima, id, 'corporea', { fino: 0 }, T0), /Round/);
});

test('A.202: in forma eterea la creatura attraversa la roccia sulla mappa (i muri), l’altra no', () => {
  const C = 20; const R = 8;
  const muri = nuovaMaschera(C, R);
  const metti = (x, y) => { const i = y * C + x; muri[i >> 3] |= 1 << (i & 7); };
  for (let y = 0; y < R; y++) { metti(6, y); metti(7, y); } // una parete di roccia spessa 2
  const chiamata = (extra) => areaRaggiungibile({ colonne: C, righe: R, muri, terreno: nuovaMaschera(C, R), token: [], chi: { id: 'm', q: [2, 3], ingombro: 1, lato: 'avversario', ...extra }, massimo: 12, regole: dati.mappa.movimento });
  assert.equal(costoVerso(chiamata({}), [10, 3]), Infinity, 'la roccia ferma una creatura qualunque');
  assert.equal(costoVerso(chiamata({ attraversaRoccia: true }), [10, 3]), 8, 'la forma eterea passa: 8 Q in linea retta');
  assert.equal(inBase64(muri).length > 0, true);
});
