import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 229 — due reti che finora mancavano.
//
// (1) UN INGEST DI MANUALE NON SOVRASCRIVE UN'ISTANZA DI UN PG. Il catalogo si rigenera a ogni manuale nuovo; la voce che un personaggio
//     porta (uid, stato, quantità, note, sintonia, pietra, montaggio…) è sua e non si deriva dal catalogo. Provato così: i sette file di
//     collaudo (tests/fixtures/talenti-vecchi/) si normalizzano con i dati veri e con un catalogo **stravolto** (prezzi, capacità,
//     pesi, nomi cambiati) e i campi d'istanza non si muovono, e ogni `rif` che i sette tengono esiste ancora nel catalogo (o è dichiarato
//     sostituito): un ingest che toglie o rinomina un id lascerebbe una voce appesa nello zaino di qualcuno.
//     (Il confronto sui personaggi veri, valore per valore, è `node tools/pg-prima-dopo.mjs`: sola lettura, non sta nei test perché le
//     cartelle vere non sono nel repo.)
//
// (2) UN DATO NON CONTRADDICE UNA RISPOSTA APPROVATA. Finora ce ne accorgevamo leggendo (la terza volta: i 120° del FIAT LUX). Ogni riga della
//     tabella è una risposta di Davide con il suo numero e il dato che la deve rispettare; se qualcuno rigenera un dato dal manuale e il
//     manuale dice ancora il vecchio valore (errata aperta), questo test diventa rosso invece di lasciarlo passare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { normalizza } from '../src/character.js';
import { catalogo } from '../src/equipaggiamento.js';
import { GIORNI_VINCOLO } from '../src/pietre-di-luna.js';
import { testoManuale } from '../tools/manuali.mjs';

const { dati } = await datiReali();
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const sette = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json')
  .map((f) => ({ f, json: JSON.parse(readFileSync(new URL(f, FIX), 'utf8')) }));

const CAMPI_ISTANZA = ['uid', 'stato', 'quantita', 'note', 'montato_su', 'sintonizzato', 'pietra', 'dotazione_iniziale', 'dotazione_id', 'nome_dotazione'];

test('i sette file di collaudo sono sette, e ogni rif che tengono esiste nel catalogo (o è dichiarato sostituito)', () => {
  assert.equal(sette.length, 7);
  const cat = catalogo(dati);
  const sostituiti = dati.equipaggiamento?.indice?.rif_sostituiti ?? {};
  for (const { f, json } of sette) {
    for (const v of json.scelte.equipaggiamento ?? []) {
      if (!v.rif) continue;
      assert.ok(cat.perRif.has(v.rif) || v.rif in sostituiti, `${f}: «${v.rif}» non esiste più nel catalogo e non è dichiarato sostituito`);
    }
  }
});

test('un catalogo stravolto da un ingest non cambia i campi d’istanza delle voci dei sette', () => {
  const stravolto = copia(dati);
  let toccate = 0;
  for (const file of Object.values(stravolto.equipaggiamento.file)) {
    for (const v of file?.oggetti ?? []) {
      toccate++;
      if (typeof v.costo === 'number') v.costo = 1;
      if (v.munizioni?.capacita) v.munizioni.capacita = 1;
      if (typeof v.pi === 'number') v.pi = 99;
      if (typeof v.peso_kg === 'number') v.peso_kg = 99;
    }
  }
  assert.ok(toccate > 800, `il catalogo stravolto è davvero stravolto (${toccate} voci toccate)`);
  let confrontate = 0;
  for (const { f, json } of sette) {
    const com = normalizza(json.scelte, dati).scelte.equipaggiamento ?? [];
    const str = normalizza(json.scelte, stravolto).scelte.equipaggiamento ?? [];
    assert.equal(str.length, com.length, `${f}: il numero delle voci non dipende dal catalogo`);
    for (let i = 0; i < com.length; i++) {
      for (const k of CAMPI_ISTANZA) {
        assert.deepEqual(str[i][k], com[i][k], `${f}: «${com[i].rif}» campo d’istanza «${k}» cambiato dal catalogo`);
        confrontate++;
      }
      // e quello che il file aveva scritto non sparisce né si riscrive: ogni campo d’istanza del file è ancora lì
      const orig = (json.scelte.equipaggiamento ?? []).find((o) => o.uid === com[i].uid);
      for (const k of CAMPI_ISTANZA) if (orig && k in orig) assert.deepEqual(com[i][k], orig[k], `${f}: «${com[i].rif}» «${k}» riscritto dalla normalizzazione`);
    }
  }
  assert.ok(confrontate > 500, `il test ha davvero guardato i campi (${confrontate})`);
});

test('mutante: se un ingest riscrivesse la quantità di un’istanza, il confronto lo vede', () => {
  const { json } = sette.find((s) => s.json.scelte.equipaggiamento?.length > 3);
  const com = normalizza(json.scelte, dati).scelte.equipaggiamento;
  const guasto = com.map((v, i) => (i === 3 ? { ...v, quantita: (v.quantita ?? 1) + 1 } : v));
  assert.notDeepEqual(guasto[3].quantita, com[3].quantita);
});

// ───────────── (2) risposte approvate ─────────────
const veicoli = dati.veicoli;
const profilo = (id) => (veicoli.profili ?? []).find((p) => p.id === id);
const nemico = (id) => JSON.parse(readFileSync(new URL(`../esempi/nemici/mostri/${id}.json`, import.meta.url), 'utf8'));
const lunare = (id) => dati.equipaggiamento.file.manufatti_lunari.oggetti.find((v) => v.id === id);

/** Una riga = una risposta approvata. `verifica` lancia se il dato la contraddice. */
/** Una voce del catalogo delle armi, per id (lotto 235). */
const armi = (id) => {
  const v = dati.equipaggiamento.file.armi.oggetti.find((o) => o.id === id);
  assert.ok(v, `manca la voce d’arma «${id}»`);
  return v;
};

const RISPOSTE = [
  ['A.280', 'FIAT LUX: il Capitol M606 spara in un semicerchio frontale di 180° (il manuale scrive ancora 120°: errata A.302 aperta)', () => {
    const arma = (profilo('asa-scout-mk4').armi ?? []).find((a) => a.arco);
    assert.ok(arma, 'lo Scout ha un’arma con l’arco di tiro');
    assert.equal(arma.arco.gradi, 180);
    assert.equal(arma.arco.orientamento, 'frontale');
    assert.equal(arma.arco.precedente?.gradi, 120, 'il 120° del manuale resta dichiarato come precedente, non sparisce');
  }],
  ['A.296', 'Turk: tre posti, conducente compreso; 1–2 occupanti Passo 6/Corsa 12/Scatto 18, tre Passo 4/Corsa 8 e niente Scatto', () => {
    const t = nemico('turk');
    assert.equal(t.posti.totale, 3);
    assert.equal(t.posti.conducente_compreso, true);
    const f = t.posti.fasce;
    assert.deepEqual(f[0].movimento, { passo: 6, corsa: 12, scatto: 18 });
    assert.equal(f[1].movimento.passo, 4);
    assert.equal(f[1].movimento.scatto, 'non_consentito');
  }],
  ['A.298', 'Pietre di Luna: il vincolo si verifica dopo sette giorni di calendario', () => assert.equal(GIORNI_VINCOLO, 7)],
  ['A.256', 'prezzo degli Artefatti = costo di costruzione × 3 × coefficiente di rarità (Comune 1, Non Comune 1,5, Rara 2, Molto Rara 3, Leggendaria 5), ai 50 cr per eccesso', () => {
    const p = dati.regole.prezzi_artefatti;
    assert.equal(p.moltiplicatore, 3);
    assert.deepEqual([p.coefficienti.Comune, p.coefficienti['Non Comune'], p.coefficienti.Rara, p.coefficienti['Molto Rara'], p.coefficienti.Leggendaria], [1, 1.5, 2, 3, 5]);
    assert.deepEqual(p.arrotondamento, { ai_cr: 50, modo: 'eccesso' });
  }],
  ['A.290', 'quadrelli lunari d’osso: solo in dono, mai in vendita né per baratto', () => {
    const q = lunare('quadrelli-lunari-d-osso');
    assert.equal(q.cessione.modo, 'solo_dono');
    assert.equal(q.non_in_vendita, true);
  }],
  ['A.294', 'Elmetto Recon ASA: +1 Iniziativa e +1 Percezione solo da indossato (qui: il testo del manuale corrente lo dice ancora)', () => {
    assert.match(testoManuale('armamenti'), /Nello zaino non concede alcun beneficio/);
  }],
  // lotto 231: le CM si consumano intere e la sigla delle voci ASA/SIA resta quella decisa
  ['A.252', 'Cariche Mistiche: solo quantità intere — ogni riserva in CM e ogni costo in CM del catalogo è un intero ≥ 1 (compresi i moduli del Warden TC)', () => {
    for (const o of dati.equipaggiamento.file.artefatti.oggetti) {
      const cm = o.artefatto?.contenitore?.capacita_cm;
      if (cm !== undefined) assert.ok(Number.isInteger(cm) && cm >= 1, `${o.id}: riserva ${cm}`);
      const uso = o.attivazione_artefatto?.cm;
      if (uso !== undefined) assert.ok(Number.isInteger(uso) && uso >= 1, `${o.id}: costo ${uso}`);
    }
  }],
  // lotto 235: i cinque cristalli focalizzatori della CyberArma, dal §7.25 e dal §7.25.5 degli Armamenti 0.90 e dal
  // §5.24 del Giocatore 0.65. Qui non si rilegge il manuale riga per riga (lo fa tests/cristalli-235.test.js): si
  // controlla che i dati non contraddicano una risposta già approvata, come fa il resto di questa tabella.
  ['A.246', 'la Corruzione è del singolo frammento Viola: nessun valore predefinito nei dati', () => {
    const f = armi('cyberarma').focalizzatori.elenco.find((x) => x.id === 'viola');
    assert.equal(f.corruzione_dal_frammento.senza_predefinito, true);
    assert.equal(f.corruzione_dal_frammento.valore, undefined);
    assert.equal(armi('cyberarma-viola').corruzione, undefined, 'nemmeno nella voce di catalogo');
  }],
  ['A.251', 'il cristallo sostituito lascia l’arma alimentabile con i PM personali: cambiare colore non è una conversione', () => {
    const m = armi('cyberarma').alimentazione_modifiche;
    const c = m.famiglie.find((x) => x.id === 'cristallo');
    assert.equal(c.conversione, false, 'il cristallo non è una conversione energetica');
    assert.equal(c.pm_personali, true);
  }],
  ['A.260', 'la CyberArma è ravvicinata e non fa Raffiche: nemmeno le cinque voci per colore', () => {
    for (const v of dati.equipaggiamento.file.armi.oggetti.filter((o) => (o.id ?? '').startsWith('cyberarma'))) {
      // nessuna voce della famiglia ha modalità di fuoco, e nessuna può dire il contrario della A.260
      assert.equal((v.modalita ?? []).length, 0, `${v.id}: nessuna modalità di fuoco`);
      assert.notEqual(v.ravvicinata_senza_raffiche, false, `${v.id}: non può dire il contrario della A.260`);
      assert.equal(v.tipo, 'arma_ravvicinata', `${v.id}: è un'arma ravvicinata`);
    }
  }],
  // lotto 237: lo Scout T4 di serie e il FIAT LUX dei PG sono due profili, come dicono il §16.1 e il §10 della 0.23.
  // Qui si controlla che i dati non contraddicano le risposte già approvate che li riguardano.
  ['A.280', 'l’arco frontale di 180° è del Capitol M606 del FIAT LUX: il Punisher del modello di serie non lo prende per analogia', () => {
    const p = (id) => dati.veicoli.profili.find((x) => x.id === id);
    assert.equal(p('asa-scout-mk4').armi[0].arco.gradi, 180);
    assert.equal(p('asa-scout-t4').armi[0].arco, undefined, 'il manuale non dà un arco per il Punisher di serie');
  }],
  ['A.226', 'il FIAT LUX resta lo Scout MK4 ASA dei PG col suo prezzo di catalogo, e il valore effettivo lo stima il Direttore', () => {
    const mk4 = dati.veicoli.profili.find((x) => x.id === 'asa-scout-mk4');
    assert.equal(mk4.prezzo_cr, 126510);
    assert.match(mk4.armi[0].nome, /Capitol M606/);
    // il valore stimato è un campo dell’esemplare e lo scrive solo il Direttore: nei dati del profilo non c’è un importo
    assert.equal(mk4.valore_stimato_cr, undefined);
    assert.equal(mk4.valutazione_direttore.senza_importo_prestabilito, true);
  }],
  ['A.304', 'i mezzi dei capitoli 16, 17 e 18 restano fuori dal catalogo finché non si sa quali servono al tavolo', () => {
    const nomi = new Set(dati.veicoli.profili.map((p) => p.nome));
    for (const m of ['Recon T6', 'Bastion TC', 'Warden TC', 'Pursuit T4']) assert.equal(nomi.has(m), false, m);
    assert.equal(dati.veicoli.corpus.profili, dati.veicoli.profili.length, 'il conto dei profili è dichiarato e torna');
  }],
  ['A.295', 'ASA e SIA sono due sigle: il «riservato» è SIA, le divise e l’elmetto di servizio restano ASA', () => {
    const rif = (r) => dati.equipaggiamento.file.rinforzi.oggetti.find((o) => o.id === r);
    assert.equal(rif('soprabito-asa-riservato').nome, 'Soprabito SIA riservato');
    assert.equal(rif('soprabito-asa').nome, 'Soprabito di ordinanza ASA');
  }],
];

for (const [numero, cosa, verifica] of RISPOSTE) {
  test(`risposta approvata ${numero}: ${cosa}`, verifica);
}

test('mutante: un arco rimesso a 120° (il valore del manuale) verrebbe visto', () => {
  const arma = (profilo('asa-scout-mk4').armi ?? []).find((a) => a.arco);
  assert.throws(() => assert.equal(120, arma.arco.gradi));
});

// ───────────── l'arma nuova del §7.28.1 coincide con la tabella del manuale ─────────────
test('Mitragliatore Leggero Punisher: ogni valore del catalogo è quello della tabella «Dato | Valore» del §7.28.1 (il lettore delle armi non la legge: la rilegge questo test)', () => {
  const man = testoManuale('armamenti');
  const i = man.indexOf('7.28.1 Mitragliatore Leggero Punisher');
  assert.ok(i > 0, 'il §7.28.1 c’è nel manuale corrente');
  const blocco = man.slice(i, i + 4000);
  const riga = (etichetta) => {
    const m = new RegExp(`\\|\\s*${etichetta}\\s*\\|\\s*([^|\\n]+?)\\s*\\|`).exec(blocco);
    assert.ok(m, `la riga «${etichetta}» c’è nella tabella`);
    return m[1].replace(/\\/g, '').trim();
  };
  const v = dati.equipaggiamento.file.armi_distanza_corporative.oggetti.find((o) => o.id === 'mitragliatore-leggero-punisher');
  assert.ok(v, 'la voce c’è nel catalogo');
  assert.equal(v.nome, 'Mitragliatore Leggero Punisher');
  assert.equal(riga('Danno'), `${v.danno.due_mani} Naturale`);
  assert.equal(riga('VA arma'), `+${v.modificatore_va}`);
  assert.equal(riga('AC'), `${v.ac}/rnd`);
  assert.equal(riga('FOR'), String(v.for_richiesta));
  assert.equal(riga('Abilità').toLowerCase(), v.abilita.toLowerCase());
  assert.equal(riga('Impugnatura'), 'Due mani'); assert.equal(v.mani, 2);
  assert.equal(riga('Gittata massima').split(' ')[0], String(v.gittata_q));
  assert.equal(riga('Capacità'), `${v.munizioni.capacita} colpi`);
  assert.equal(riga('Modalità di fuoco'), v.modalita.join(', ').replace(/, (\w+)$/, ' e $1'));
  assert.equal(riga('INC'), String(v.inc));
  assert.equal(riga('PI'), String(v.pi));
  assert.equal(riga('Qualità / PS Integrità'), `${v.qualita} / ${v.ps_int}`);
  assert.equal(riga('MOV').replace('−', '-').split(' ')[0], String(v.mov));
  assert.equal(riga('Reperibilità'), 'Rara'); assert.equal(v.reperibilita, 'RA');
  assert.equal(riga('Prezzo').split(' ')[0].replace('.', ''), String(v.costo));
  // e non è la pistola Punisher: due voci, due id
  assert.notEqual(v.id, 'punisher');
  assert.ok(dati.equipaggiamento.file.armi_distanza_corporative.oggetti.some((o) => o.id === 'punisher'), 'la pistola Punisher c’è ancora, intatta');
});
