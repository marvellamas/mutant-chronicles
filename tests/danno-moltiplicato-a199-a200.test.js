// A.199 e A.200 (risposte di Davide del 30/10/2026).
// A.199: l'app calcola anche i danni con moltiplicatore («4d10×5» = quattro d10 sommati, poi per cinque; Difese e Armatura
//        dopo), mostrando formula, dadi e totale, per tutte le creature e le armi navali; Dragomedusa 8d10×5 e 12d10×5.
// A.200: il minimo 0 dell'Iniziativa vale per il bonus base, non per il totale: Ferite, condizioni e altri effetti
//        continuano a dare penalità dopo il minimo e il totale può essere negativo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { datiReali } from './helpers.js';
import { leggiDannoMoltiplicato, moltiplicatoreMagistrale, applicaColpo } from '../src/danno.js';
import { specTiro, tira } from '../src/tiri.js';
import { tiroDelValore, esitoTiro, tiraValore, specDaFormula } from '../src/tiri-scheda.js';
import { calcolaAttaccoNemico, propostaColpo, leggiDanno } from '../src/nemico-attacco.js';
import { capacitaDi } from '../src/capacita-nemico.js';
import { validaNemico } from '../src/validate.js';
import { nuovoScontro, aggiungiNemici, registraTiro, registraIniziative, reimpostaIniziativaDi, ordineIniziativa } from '../src/scontro.js';
import { iniziativaCreatura, modificatoreIniziativa, baseIniziativaNemico } from '../src/iniziativa-creature.js';

const { dati } = await datiReali();
const T0 = new Date('2026-10-30T12:00:00Z');
const nemico = (nome) => JSON.parse(readFileSync(new URL(`../esempi/nemici/mostri/${nome}.json`, import.meta.url), 'utf8'));
const partecipante = (scheda) => ({ id: 'x', tipo: 'nemico', scheda, stati: [], intensita: {} });

test('A.199: «8d10×5», «8d10 × 5», «(1d8+2) ×2» si leggono come dadi e moltiplicatore', () => {
  assert.deepEqual(leggiDannoMoltiplicato('8d10×5'), { formula: '8d10', moltiplicatore: 5 });
  assert.deepEqual(leggiDannoMoltiplicato('12d10 × 5'), { formula: '12d10', moltiplicatore: 5 });
  assert.deepEqual(leggiDannoMoltiplicato('(1d8+2) ×2'), { formula: '1d8+2', moltiplicatore: 2 });
  assert.deepEqual(leggiDannoMoltiplicato('1d8+2'), { formula: '1d8+2', moltiplicatore: 1 });
  assert.deepEqual(leggiDanno('4d10×3'), { formula: '4d10', moltiplicatore: 3 });
  assert.deepEqual(leggiDannoMoltiplicato(null), { formula: null, moltiplicatore: 1 });
});

test('A.199: il Successo Magistrale non abbassa un moltiplicatore già alto (×5 resta ×5, non ×3)', () => {
  assert.equal(moltiplicatoreMagistrale(1, dati), 2);
  assert.equal(moltiplicatoreMagistrale(2, dati), 3);
  assert.equal(moltiplicatoreMagistrale(3, dati), 3);
  assert.equal(moltiplicatoreMagistrale(5, dati), 5);
  assert.equal(moltiplicatoreMagistrale(8, dati), 8);
});

test('A.199: l’attacco di una creatura con «8d10×5» ha i dadi 8d10 e il moltiplicatore ×5, e la proposta di «Colpito» lo porta con sé', () => {
  const drago = nemico('drago-rosso-adulto');
  const r = calcolaAttaccoNemico(partecipante(drago), 0, {}, dati);
  assert.equal(r.risultato.danno.formula, '8d10');
  assert.equal(r.risultato.danno.moltiplicatore, 5);
  assert.equal(r.risultato.danno.testo, '(8d10) ×5');
  const prop = propostaColpo(r.attacco, r.risultato);
  assert.deepEqual([prop.formula, prop.moltiplicatore], ['8d10', 5]);
  assert.ok(specDaFormula(prop.formula), 'la formula dei soli dadi si tira');
});

test('A.199: il tiro del danno mostra i dadi, la somma e il prodotto — Difese e Armatura dopo', () => {
  const t = tiroDelValore({ genere: 'danno', nome: 'Soffio', formula: '12d10', moltiplicatore: 5 }, dati);
  assert.equal(t.moltiplicatore, 5);
  assert.match(t.titolo, /12d10 ×5/);
  assert.equal(t.spec.dadi, 12);
  // dadi fissi: 12 dadi, ciascuno 5 → somma 60 → ×5 = 300
  const r = tiraValore(t, () => 5);
  assert.equal(r.risultati.length, 12);
  assert.equal(r.naturale, 60);
  const e = esitoTiro(t, r.naturale, dati, r.risultati);
  assert.equal(e.totale, 300);
  assert.equal(e.moltiplicatore, 5);
  assert.match(e.testo, /12d10: 5\+5\+5\+5\+5\+5\+5\+5\+5\+5\+5\+5 = 60 → ×5 = 300/);
  assert.match(e.riga, /300 \(60 ×5\)/);
  // senza moltiplicatore il danno è quello di prima
  const t1 = tiroDelValore({ genere: 'danno', nome: 'Colpo', formula: '1d8+2' }, dati);
  const e1 = esitoTiro(t1, 7, dati, [5]);
  assert.deepEqual([e1.totale, e1.moltiplicatore], [7, undefined]);
  // 300 contro AR 18 e una Difesa riuscita (Parata dimezza): il motore applica Difesa e Armatura dopo il moltiplicatore (§5.13)
  const colpo = applicaColpo({ pv: { attuali: 900, massimo: 900 }, ferite: null, ar: { totale: 18, magica: 4 } }, { danni: [60], moltiplicatore: 5, natura: 'Magico', difesa: 'parata', tipo: 'distanza', ac: 1 }, dati);
  assert.equal(colpo.applicazioni[0].dopoMoltiplicatore, 300);
  assert.equal(colpo.applicazioni[0].dopoDifesa, 150);
});

test('A.199: il Soffio del Dragomedusa è una capacità con il suo danno (8d10×5 il giovane, 12d10×5 l’adulto, Magico) e si può tirare', () => {
  for (const [id, danno, dadi] of [['dragomedusa-giovane', '8d10×5', 8], ['dragomedusa-adulto', '12d10×5', 12]]) {
    const n = nemico(id);
    assert.deepEqual(validaNemico(n, dati, id), [], id);
    const soffio = capacitaDi(n).find((v) => v.nome === 'Soffio di Fulmine');
    assert.equal(soffio.danno, danno);
    assert.equal(soffio.natura, 'Magico');
    const l = leggiDannoMoltiplicato(soffio.danno);
    const t = tiroDelValore({ genere: 'danno', nome: `${n.nome}: Soffio`, formula: l.formula, moltiplicatore: l.moltiplicatore }, dati);
    assert.equal(t.spec.dadi, dadi);
    const r = tiraValore(t, () => 10);
    assert.equal(r.risultati.length, dadi);
    assert.equal(esitoTiro(t, r.naturale, dati, r.risultati).totale, dadi * 10 * 5);
  }
});

test('A.199: ogni arma o attacco con moltiplicatore dei file dei nemici si legge e si tira (nessuna formula resta «da tirare a mano»)', () => {
  const dir = new URL('../esempi/nemici/', import.meta.url);
  const tutti = [];
  const visita = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d.pathname.replace(/^\/([A-Za-z]:)/, '$1'), e.name); if (e.isDirectory()) visita(new URL(`${e.name}/`, d)); else if (e.name.endsWith('.json')) tutti.push(JSON.parse(readFileSync(p, 'utf8'))); } };
  visita(dir);
  let conMolt = 0;
  for (const n of tutti) for (const a of n.attacchi ?? []) {
    if (!/×/.test(a.danno ?? '')) continue;
    conMolt += 1;
    const l = leggiDannoMoltiplicato(a.danno);
    assert.ok(l.moltiplicatore > 1 && specDaFormula(l.formula), `${n.nome}: ${a.nome} ${a.danno}`);
  }
  assert.ok(conMolt > 50, `${conMolt} attacchi con moltiplicatore`);
});

// ---- A.200 ---------------------------------------------------------------------------------------------------------
const scontroCon = (ferite, stati = []) => {
  const base = nemico('dragomedusa-giovane');
  let s = nuovoScontro({ id: 'a200', adesso: T0, pg: [] });
  s = aggiungiNemici(s, { ...base, iniziativa: 0 }, 1, {}, T0);
  s = { ...s, partecipanti: s.partecipanti.map((p) => ({ ...p, ferite, stati })) };
  return { s, id: s.partecipanti[0].id };
};

test('A.200: il minimo 0 è del bonus base: −1 nel file diventa 0, ma le penalità si aggiungono dopo', () => {
  assert.equal(iniziativaCreatura(-1), 0);
  assert.equal(iniziativaCreatura(2), 2);
  const sano = partecipante({ iniziativa: -1 });
  assert.deepEqual([baseIniziativaNemico(sano, dati).minimo, baseIniziativaNemico(sano, dati).base], [0, 0]);
  const ferito = { ...partecipante({ iniziativa: 0 }), ferite: 3 }; // Profonda: −4
  assert.deepEqual(modificatoreIniziativa(ferito, dati).voci.map((v) => [v.etichetta, v.valore]), [['Ferita Profonda', -4]]);
  assert.equal(baseIniziativaNemico(ferito, dati).base, -4);
  assert.equal(baseIniziativaNemico({ ...ferito, scheda: { iniziativa: 2 } }, dati).base, -2);
});

test('A.200: un nemico con Iniziativa 0 e una Ferita (Profonda) fa −4 + d10: il totale può essere negativo, e si legge nel registro', () => {
  const { s, id } = scontroCon(3);
  const t = registraTiro(s, id, 'd10', { valore: 2, origine: 'app' }, dati, T0);
  const p = t.partecipanti.find((x) => x.id === id);
  assert.equal(p.base, -4);
  assert.equal(p.modIni, -4);
  assert.equal(p.base + p.d10.valore, -2, 'il totale è negativo');
  assert.match(t.registro.at(-1).testo, /-4 \(−4 per Ferite e Stati\) \+ 1d10 2 \(tirato dall’app\) = -2/);
  // l'ordine: chi ha −2 sta dopo chi ha 0 + d10 1
  const altro = aggiungiNemici(t, { ...nemico('dragomedusa-giovane'), id: 'altro', iniziativa: 0 }, 1, {}, T0);
  const idAltro = altro.partecipanti.find((x) => x.nemico === 'altro').id;
  const u = registraTiro(altro, idAltro, 'd10', { valore: 1, origine: 'app' }, dati, T0);
  assert.deepEqual(ordineIniziativa(u).ordinati.map((x) => x.id), [idAltro, id]);
});

test('A.200: senza Ferite il nemico con Iniziativa 0 fa il solo d10; con il totale scritto a mano il numero è proprio quello', () => {
  const { s, id } = scontroCon(0);
  const t = registraTiro(s, id, 'd10', { valore: 6, origine: 'app' }, dati, T0);
  const p = t.partecipanti.find((x) => x.id === id);
  assert.deepEqual([p.base, p.modIni, p.base + p.d10.valore], [0, undefined, 6]);
  // totale scritto a mano: d10 = totale − base (con la penalità), il totale resta quello scritto
  const { s: s2, id: id2 } = scontroCon(3);
  const m = registraIniziative(s2, [{ id: id2, totale: -3 }], dati, T0);
  const q = m.partecipanti.find((x) => x.id === id2);
  assert.equal(q.base + q.d10.valore, -3);
  const r = reimpostaIniziativaDi(m, id2, { totale: 5 }, dati, T0);
  const z = r.partecipanti.find((x) => x.id === id2);
  assert.equal(z.base + z.d10.valore, 5);
});

test('A.200: gli Stati con un effetto sull’Iniziativa si sommano dopo il minimo; i PG non cambiano (hanno la loro Iniziativa effettiva)', () => {
  const stati = dati.regole.stati.elenco.filter((x) => (x.effetti ?? []).some((e) => e.iniziativa)).map((x) => x.id);
  // oggi nessuno Stato ha un effetto sull'Iniziativa nei dati: il meccanismo c'è e non inventa penalità
  assert.deepEqual(modificatoreIniziativa({ ferite: 0, stati: stati.length ? [stati[0]] : [] }, dati).voci.filter((v) => !/Ferita/.test(v.etichetta)).length, stati.length ? 1 : 0);
  let s = nuovoScontro({ id: 'pg', adesso: T0, pg: [{ chiave: 'ada', nome: 'Ada', iniziativa: -2, des: 5, int: 5 }] });
  s = registraTiro(s, 'pg:ada', 'd10', { valore: 4, origine: 'app' }, dati, T0);
  const ada = s.partecipanti[0];
  assert.deepEqual([ada.base, ada.modIni, ada.base + ada.d10.valore], [-2, undefined, 2], 'il PG con Iniziativa −2 resta −2: il minimo 0 è solo delle creature');
});
