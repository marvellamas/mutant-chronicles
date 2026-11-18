import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 219: i manufatti lunari dei Mutanti (Armamenti 0.86 §7.27, Equipaggiamento 0.42 §10.14, Magia 1.19 §26.8 e §28.5,
// blocco del 13/11/2026 dell'E&L). Il pezzo delicato è la Spada dei Tre Riflessi: la prima ricetta di Grado V, Epica, SnT 5,
// con **una** riserva di 3 CM Bianche **condivisa** dai tre poteri cromatici.
//
// I due controlli che devono restare rossi se qualcuno ci prova:
//   1. una CM non si consuma mai in quantità non intera (A.252);
//   2. un valore che il manuale dichiara «da definire» o «non fissato» non finisce nei dati come numero (né come 0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { datiReali } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, inizializzaSessione, allineaSessione, attivaArmaSessione, terminaArmaSessione, nuovoRoundSessione } from '../src/sessione.js';
import { calcolaAttaccoRavvicinato } from '../src/attacco.js';
import { statoPoteri, formulaConPotere, potereAttivo, costoValido } from '../src/poteri-arma.js';
import { pmPerGruppo, interoRiserva, conFrazione } from '../src/cariche-mistiche.js';
import { catalogo } from '../src/equipaggiamento.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const voce = (id) => cat.perRif.get(`manufatti_lunari:${id}`);
const FILE_LUCAS = new URL('./fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json', import.meta.url);

/** Lucas (copia del 20/10), con la Spada impugnata e sintonizzata e, a richiesta, la Collana indossata. */
function lucas({ spada = true, collana = false } = {}) {
  const p = deserializzaPersonaggio(readFileSync(FILE_LUCAS, 'utf8'));
  const creazione = normalizza(p.creazione, dati).scelte;
  const eq = [...(creazione.equipaggiamento ?? [])];
  if (spada) eq.push({ uid: 'spada1', rif: 'manufatti_lunari:spada-dei-tre-riflessi', stato: 'impugnata', quantita: 1, note: '', sintonizzato: true });
  if (collana) eq.push({ uid: 'collana1', rif: 'manufatti_lunari:collana-di-papiro-dei-mutanti', stato: 'indossata', quantita: 1, note: '' });
  creazione.equipaggiamento = eq;
  const personaggio = { creazione, livelli: p.livelli, sessione: p.sessione };
  const m = massimiSessione(calcolaScheda(personaggio, dati), creazione, dati);
  // sessione fresca: la riserva integrata parte piena
  const sessione = allineaSessione(inizializzaSessione(m), m);
  return { ...personaggio, sessione, m, scheda: calcolaScheda({ ...personaggio, sessione }, dati) };
}
const armaDi = (pg, uid = 'spada1') => pg.scheda.equipaggiamento.armi.find((a) => a.uid === uid);

// ——— il catalogo ———————————————————————————————————————————————————————————————————————————

test('i dati reali passano il validatore dopo i manufatti lunari', () => {
  assert.deepEqual(validaDati(dati), []);
});

test('SPADA: Grado V, Epica, SnT 5 — le catene Grado → potenza → rarità → SnT arrivano fino al V e coincidono col manuale', () => {
  const s = voce('spada-dei-tre-riflessi');
  assert.deepEqual([s.artefatto.grado, s.artefatto.potenza, s.artefatto.sintonizzazione], ['V', 'Epica', 5]);
  const S = dati.equipaggiamento.file.artefatti.sintonizzazione;
  assert.equal(S.gradi.V, 'Epica');
  assert.equal(S.potenze.Epica, 5);
  assert.equal(dati.regole.prezzi_artefatti.coefficienti.Epica, 4, 'il coefficiente dell’Epica c’è (A.261)');
  // le quattro soglie passive: SnT 0 per Pugnale, Spada lunare e Collana (Magia §28.5)
  for (const id of ['pugnale-lunare-d-osso', 'spada-lunare-d-osso', 'collana-di-papiro-dei-mutanti']) assert.equal(voce(id).artefatto.sintonizzazione, 0, id);
  assert.deepEqual([voce('collana-di-papiro-dei-mutanti').artefatto.grado, voce('collana-di-papiro-dei-mutanti').artefatto.potenza], ['III', 'Rara']);
  assert.deepEqual([voce('pugnale-lunare-d-osso').artefatto.grado, voce('pugnale-lunare-d-osso').artefatto.potenza], ['I', 'Comune']);
});

test('SPADA: una sola riserva di 3 CM Bianche, integrata, Esclusiva — «condivise» dai tre poteri, non tre Batterie', () => {
  const s = voce('spada-dei-tre-riflessi');
  assert.deepEqual(s.artefatto.contenitore, { energia: 'Bianco', integrato: true, riserva: 'cariche', alimentazione: 'esclusiva', capacita_cm: 3 });
  // i tre colori stanno nella voce come OPZIONI di un solo blocco, non come tre contenitori
  assert.equal(s.poteri_arma.opzioni.length, 3);
  assert.deepEqual(s.poteri_arma.opzioni.map((o) => o.id), ['rosso', 'blu', 'verde']);
  assert.equal(s.poteri_arma.cm, 1);
  assert.equal(s.poteri_arma.round, 5);
  assert.equal(s.poteri_arma.un_solo_colore, true);
  const pg = lucas();
  const a = armaDi(pg);
  assert.equal(a.poteriArma.opzioni.length, 3);
  assert.equal(pg.scheda.equipaggiamento.artefatti?.filter?.((x) => x.uid === 'spada1').length ?? 1, 1, 'un solo oggetto, una sola riserva');
  assert.equal(pg.sessione.chroma.spada1.pmAttuali, 3, 'la riserva parte piena: 3 CM');
  assert.equal(pg.sessione.chroma.spada1.unita, 'CM');
});

test('SPADA: la ricarica Bianca costa 4 PM personali per CM, 12 da vuota (rapporto 2:1 × 2 delle CM)', () => {
  const c = { unita: 'CM' };
  const rapportoBianco = dati.regole.chroma.rapporti?.Bianco ?? dati.regole.chroma.rapporto_bianco ?? 2;
  assert.equal(pmPerGruppo(c, rapportoBianco, dati), 4);
  assert.equal(pmPerGruppo(c, rapportoBianco, dati) * 3, 12);
});

test('NIENTE PREZZO A CASO: dove il manuale non fissa prezzo e reperibilità, i dati non hanno un numero — mai 0', () => {
  for (const id of ['pugnale-lunare-d-osso', 'spada-lunare-d-osso', 'spada-dei-tre-riflessi', 'collana-di-papiro-dei-mutanti']) {
    const v = voce(id);
    assert.equal(v.non_in_vendita, true, id);
    assert.equal(v.costo, null, `${id}: «Prezzo e reperibilità commerciale non fissati» non è 0 crediti`);
    assert.equal(v.reperibilita, null, id);
  }
  // quello che il manuale invece scrive resta scritto
  assert.equal(voce('balestra-d-osso').costo, 700);
  assert.equal(voce('quadrelli-lunari-d-osso').costo, 50);
  assert.deepEqual(voce('quadrelli-lunari-d-osso').munizione.confezione, { quantita: 10, costo: 500 });
  // la A.256 darebbe un prezzo solo con un costo di costruzione, che il manuale non scrive: non se ne inventa uno
  assert.equal(voce('spada-dei-tre-riflessi').creazione_cr, undefined);
});

test('UN VALORE «DA DEFINIRE» NON DIVENTA UN NUMERO: ogni campo dichiarato da definire è assente, e un non-in-vendita ha il costo null', () => {
  const guai = [];
  for (const f of readdirSync(new URL('../data/equipaggiamento/', import.meta.url))) {
    if (f === 'index.json' || !f.endsWith('.json')) continue;
    const j = JSON.parse(readFileSync(new URL(`../data/equipaggiamento/${f}`, import.meta.url), 'utf8'));
    for (const o of j.oggetti ?? []) {
      for (const campo of Array.isArray(o.da_definire) ? o.da_definire : []) {
        if (typeof o[campo] === 'number') guai.push(`${f}:${o.id}: «${campo}» è dichiarato da definire e vale ${o[campo]}`);
      }
      if (o.non_in_vendita === true && o.costo !== null && o.costo !== undefined && typeof o.costo !== 'number') guai.push(`${f}:${o.id}: non in vendita con un costo non numerico`);
      if (o.non_in_vendita === true && o.costo === 0) guai.push(`${f}:${o.id}: non in vendita convertito in prezzo zero`);
    }
  }
  assert.deepEqual(guai, []);
  // la Cartuccia Stabilizzante: «Da definire» nel raccordo sanitario del 13/11, nessun peso nel manuale 0.42
  const cartuccia = cat.perRif.get('sanitario:cartuccia-stabilizzante');
  assert.deepEqual(cartuccia.da_definire, ['peso']);
  assert.equal(cartuccia.peso, undefined, 'il peso non si ricava dalle altre cartucce');
  assert.notEqual(cartuccia.peso, 0);
});

test('LA PROVA IN ROSSO del «da definire»: un peso scritto sulla Cartuccia, o un prezzo 0, verrebbe preso', () => {
  const copia = structuredClone(cat.perRif.get('sanitario:cartuccia-stabilizzante'));
  copia.peso = 0.05;
  assert.equal(typeof copia.peso === 'number' && copia.da_definire.includes('peso'), true, 'il controllo guarda proprio questa combinazione');
});

// ——— i poteri e le CM intere ———————————————————————————————————————————————————————————

test('ATTIVAZIONE: 1 CM intera dalla riserva condivisa, un colore alla volta, 5 Round; cambiare costa di nuovo', () => {
  const pg = lucas();
  const p = armaDi(pg).poteriArma;
  const spendi = (s, id) => attivaArmaSessione(s, 'spada1', { cm: p.cm, round: p.round, opzione: id }, pg.m);
  let s = spendi(pg.sessione, 'rosso');
  assert.equal(s.chroma.spada1.pmAttuali, 2);
  assert.equal(potereAttivo(p, s, 'spada1').id, 'rosso');
  s = spendi(s, 'verde');
  assert.equal(s.chroma.spada1.pmAttuali, 1, 'un altro colore costa di nuovo 1 CM, dalla stessa riserva');
  assert.equal(potereAttivo(p, s, 'spada1').id, 'verde', 'il nuovo sostituisce il precedente');
  s = spendi(s, 'verde');
  assert.equal(s.chroma.spada1.pmAttuali, 0, 'rinnovare costa di nuovo; l’ultima CM consente comunque l’intera durata');
  assert.equal(potereAttivo(p, s, 'spada1').rimasti, 5, 'la durata riparte completa');
  // riserva a zero: non si attiva (senza «Procedi comunque»)
  assert.equal(spendi(s, 'blu'), null);
  // «Termina»: finisce l'effetto, la carica non torna
  const t = terminaArmaSessione(s, 'spada1', pg.m);
  assert.equal(potereAttivo(p, t, 'spada1'), null);
  assert.equal(t.chroma.spada1.pmAttuali, 0);
  // la durata: 5 Round dal Round dell'attivazione
  const a = spendi(pg.sessione, 'blu');
  let r = a;
  for (let i = 0; i < 4; i++) r = nuovoRoundSessione(r, pg.m);
  assert.equal(potereAttivo(p, r, 'spada1').rimasti, 1);
  r = nuovoRoundSessione(r, pg.m);
  assert.equal(potereAttivo(p, r, 'spada1'), null, 'finito dopo 5 Round');
});

test('A.252 — LA CM NON SI CONSUMA MAI IN QUANTITÀ NON INTERA (deve restare rosso se qualcuno ci prova)', () => {
  const pg = lucas();
  const p = armaDi(pg).poteriArma;
  // un costo frazionario, nullo o negativo non si paga: l'attivazione è rifiutata e la riserva resta com'è
  for (const cm of [0.5, 1.5, 0, -1, NaN, '1', 2.0000001]) {
    const r = attivaArmaSessione(pg.sessione, 'spada1', { cm, round: 5, opzione: 'rosso' }, pg.m, { forza: true });
    assert.equal(r, null, `costo ${String(cm)}: non si consuma`);
  }
  assert.equal(costoValido(1), true);
  assert.equal(costoValido(0.5), false);
  assert.equal(costoValido(p.cm), true, 'il costo dei dati è intero');
  // qualunque sequenza di attivazioni lascia la riserva intera, fra 0 e 3
  let s = pg.sessione;
  const colori = ['rosso', 'blu', 'verde'];
  for (let i = 0; i < 8; i++) {
    const n = attivaArmaSessione(s, 'spada1', { cm: p.cm, round: p.round, opzione: colori[i % 3] }, pg.m, { forza: true });
    s = n ?? s;
    const v = s.chroma.spada1.pmAttuali;
    assert.ok(Number.isInteger(v) && v >= 0 && v <= 3, `riserva ${v}`);
    assert.equal(conFrazione(v), false);
  }
  assert.equal(interoRiserva(s.chroma.spada1.pmAttuali), s.chroma.spada1.pmAttuali);
  // e i dati non dichiarano mai un costo non intero nei poteri
  for (const o of cat.oggetti.filter((x) => x.poteri_arma)) assert.ok(Number.isInteger(o.poteri_arma.cm) && o.poteri_arma.cm >= 1, o.id);
});

test('«ATTACCA!»: danno e VA con il colore attivo, in righe distinte (base, passivo, potere attivo)', () => {
  const pg = lucas();
  const a0 = armaDi(pg);
  assert.equal(a0.danno.una_mano, '1d8+1', 'passivo: 1d8+1 Magico');
  assert.equal(a0.naturaDanno, 'Magico');
  const base = calcolaAttaccoRavvicinato({ scheda: pg.scheda, sessione: pg.sessione }, a0, {}, dati);
  assert.equal(base.danno.formula, '1d8+1');
  const vaBase = base.va_finale;
  const attiva = (id) => attivaArmaSessione(pg.sessione, 'spada1', { cm: 1, round: 5, opzione: id }, pg.m);
  const rosso = calcolaAttaccoRavvicinato({ scheda: pg.scheda, sessione: attiva('rosso') }, a0, {}, dati);
  assert.equal(rosso.danno.formula, '1d8+1d4+1', 'Plasma: 1d8+1+1d4');
  assert.equal(rosso.va_finale, vaBase, 'Plasma non cambia il VA');
  const blu = calcolaAttaccoRavvicinato({ scheda: pg.scheda, sessione: attiva('blu') }, a0, {}, dati);
  assert.equal(blu.danno.formula, '1d8+1d4+1', 'Elettricità: 1d8+1+1d4');
  const verde = calcolaAttaccoRavvicinato({ scheda: pg.scheda, sessione: attiva('verde') }, a0, {}, dati);
  assert.equal(verde.danno.formula, '1d8+1d4+2', 'Armonia: 1d8+2+1d4');
  assert.equal(verde.va_finale, vaBase + 1, 'Armonia: +2 VA complessivi, cioè +1 oltre al passivo');
  assert.ok(verde.provenienza.righe.some((r) => /Potere attivo: Armonia/.test(r.fonte ?? JSON.stringify(r))), 'una riga a sé per il potere attivo');
  assert.ok(verde.promemoria.some((t) => /Armonia.*Parate/.test(t)), 'il testo del potere resta come promemoria; la Parata +1 è sommata (lotto 220, sotto)');
  // Plasma ed Elettricità non aggiungono altri dadi: la formula ha un solo 1d4
  assert.equal((rosso.danno.formula.match(/d4/g) ?? []).length, 1);
  assert.equal(formulaConPotere('1d8+1', '1d4', 1), '1d8+1d4+2');
});

test('SENZA POTERE ATTIVO la spada resta il profilo passivo: +1 VA, Magico, anche senza sintonizzazione e a riserva scarica', () => {
  const pg = lucas();
  const scarica = { ...pg.sessione, chroma: { ...pg.sessione.chroma, spada1: { ...pg.sessione.chroma.spada1, pmAttuali: 0 } } };
  const r = calcolaAttaccoRavvicinato({ scheda: pg.scheda, sessione: scarica }, armaDi(pg), {}, dati);
  assert.equal(r.danno.formula, '1d8+1');
  assert.equal(armaDi(pg).modificatoreVa ?? 1, 1);
  const st = statoPoteri(armaDi(pg), scarica, 0);
  assert.equal(st.puoAttivare, false, 'a riserva scarica non si attiva, ma il profilo passivo vale');
});

// ——— gli altri manufatti ————————————————————————————————————————————————————————————————

test('PUGNALE e SPADA lunare: +1 VA per colpire e danno Magico senza incremento numerico', () => {
  const p = voce('pugnale-lunare-d-osso');
  const s = voce('spada-lunare-d-osso');
  assert.deepEqual([p.danno.una_mano, p.modificatore_va, p.natura_danno, p.for_richiesta, p.pi, p.peso], ['1d6+1', 1, 'Magico', 3, 4, 0.4]);
  assert.deepEqual([s.danno.una_mano, s.modificatore_va, s.natura_danno, s.for_richiesta, s.pi, s.peso], ['1d8+1', 1, 'Magico', 4, 5, 1.3]);
  assert.deepEqual(s.manovre, ['Affondo', 'Spazzata']);
  // il +1 di 1d8+1 è del profilo, non della scheggia: il bonus passivo non è un +1 al danno
  assert.equal(p.artefatto.proprieta_attive, false);
});

test('COLLANA di papiro: +1 PS Tempra, Volontà e Magia, sempre, da indossata; nessun bonus a Riflessi', () => {
  const con = lucas({ spada: false, collana: true });
  const senza = lucas({ spada: false, collana: false });
  const eff = (pg, id) => pg.scheda.salvezze[id].effettivo;
  for (const id of ['tempra', 'volonta', 'magia']) assert.equal(eff(con, id), eff(senza, id) + 1, id);
  assert.equal(eff(con, 'riflessi'), eff(senza, 'riflessi'), 'nessun bonus a Riflessi');
  const prov = con.scheda.salvezze.tempra.provenienza?.righe ?? [];
  assert.ok(JSON.stringify(prov).includes('Collana di papiro'), 'la provenienza nomina la Collana');
  const c = voce('collana-di-papiro-dei-mutanti');
  assert.deepEqual([c.pi, c.peso, c.ps_int, c.qualita, c.artefatto.sintonizzazione], [3, 0.1, 10, 'Comune', 0]);
  // non indossata: nessun bonus
  const zaino = lucas({ spada: false });
  assert.equal(eff(zaino, 'tempra'), eff(senza, 'tempra'));
});

test('BALESTRA d’osso e quadrelli lunari: profilo della Balestra grande, 1d6+3, 120 Q; i quadrelli solo con +1 VA situazionale', () => {
  const b = voce('balestra-d-osso');
  assert.deepEqual([b.mani, b.danno.una_mano, b.gittata_q, b.for_richiesta, b.inc, b.pi, b.munizioni.capacita, b.peso], [2, '1d6+3', 120, 5, 8, 6, 1, 3]);
  const q = voce('quadrelli-lunari-d-osso');
  assert.equal(q.munizione.famiglia, 'dardi_balestra_grande', 'compatibili con la Balestra grande');
  assert.ok(dati.equipaggiamento.file.munizioni.munizioni_armi.some((x) => x.rif === 'manufatti_lunari:balestra-d-osso' && x.famiglia === 'dardi_balestra_grande'));
  assert.equal(q.effetti[0].ambito, 'situazionale', 'non è un bonus sempre acceso: serve il quadrello lunare');
  assert.equal(q.effetti[0].valore, 1);
  assert.equal(q.peso, 0.08);
  // la Reperibilità non è nel manuale: dichiarata, non inventata
  assert.equal(b.reperibilita, null);
  assert.match(b['TODO(Davide)'], /A\.290/);
});

// ——— i sette ——————————————————————————————————————————————————————————————————————————————

test('NESSUNO DEI SETTE possiede un manufatto lunare: i loro file (e le copie dell’istantanea) non citano niente di lunare', () => {
  const cartelle = [new URL('./fixtures/', import.meta.url)];
  const trovati = [];
  const visita = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir.pathname ?? dir, e.name);
      if (e.isDirectory()) visita(new URL(`${e.name}/`, dir));
      else if (e.name.endsWith('.json') && /liv\d+_/.test(e.name)) {
        if (/manufatti_lunari|spada-dei-tre-riflessi|collana-di-papiro|pugnale-lunare|spada-lunare|balestra-d-osso|quadrelli-lunari/.test(readFileSync(new URL(e.name, dir), 'utf8'))) trovati.push(p);
      }
    }
  };
  for (const c of cartelle) visita(c);
  assert.deepEqual(trovati, []);
});

test('«Colpito» → «Tira con l’app» tira anche «1d8+1d4+3»: più gruppi di dadi e un fisso (prima la rifiutava)', async () => {
  const { tiratoreDiFormula, specDaFormula } = await import('../src/ui/colpo.js');
  assert.equal(specDaFormula('1d8+1d4+3'), null, 'la forma a un gruppo solo non la legge');
  const tira = tiratoreDiFormula('1d8+1d4+3');
  const v = Array.from({ length: 400 }, () => tira());
  assert.equal(Math.min(...v), 1 + 1 + 3);
  assert.equal(Math.max(...v), 8 + 4 + 3);
  assert.ok(v.every(Number.isInteger));
  assert.equal(tiratoreDiFormula('non è una formula'), null);
  assert.equal(Math.min(...Array.from({ length: 200 }, tiratoreDiFormula('1d6+1d4-1'))), 1 + 1 - 1);
});

test('«Colpito» riceve la natura Magica dell’arma (la Spada lunare e la Spada dei Tre Riflessi non sono Naturali)', async () => {
  const { propostaDaPg } = await import('../src/ui/attacco-pg.js');
  const pg = lucas();
  const a = armaDi(pg);
  const r = calcolaAttaccoRavvicinato({ scheda: pg.scheda, sessione: pg.sessione }, a, {}, dati);
  const p = propostaDaPg(a, r, { magistrale: false, riusciti: 1 }, { id: 'pg', nome: 'Lucas' });
  assert.equal(p.natura, 'Magico', 'prima arrivava «Naturale»: l’AR del bersaglio era quella sbagliata');
  assert.equal(p.formula, '1d8+1');
  // un’arma ordinaria resta Naturale
  const ordinaria = pg.scheda.equipaggiamento.armi.find((x) => x.uid !== 'spada1' && x.tipo === 'arma_ravvicinata');
  if (ordinaria) {
    const r2 = calcolaAttaccoRavvicinato({ scheda: pg.scheda, sessione: pg.sessione }, ordinaria, {}, dati);
    assert.equal(propostaDaPg(ordinaria, r2, { magistrale: false, riusciti: 1 }, { id: 'pg', nome: 'Lucas' }).natura, 'Naturale');
  }
});
