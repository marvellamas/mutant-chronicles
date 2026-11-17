import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 211 (17/11/2026) — le 90 schede d'incantesimo alla Magia 1.19: il lettore, la rete, la regola del 204, il segno e il conto.
//
// Quattro cose, ciascuna provata anche **in rosso** (un controllo che non sa fallire non prova niente):
//  1. la rete — il lettore, sull'edizione da cui i dati vengono (la 1.11), trova solo le sei differenze vere del manuale, e sulla
//     corrente nessuna: ogni altra differenza sarebbe un difetto del lettore (nel lotto 206 erano 54 su 59);
//  2. ogni costo in PM scritto in una scheda è quello del manuale corrente (e il controllo salta se ne cambia uno solo);
//  3. una lettura parziale non si scrive mai sopra un valore buono;
//  4. il segno «⚑» si spegne da sé, e il conto delle schede deve tornare coi dati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { testoManuale, testoEdizione, versioneManuale, registro } from '../tools/manuali.mjs';
import { leggiSchedeMagia, quadro, confrontaScheda, unisciScheda, differenzePm, sovrascrittaParziale, etichetteDelleTabelle, dividiTabelle } from '../tools/importa-incantesimi.mjs';
import { campiIndietroScheda, rigaProvenienzaIncantesimo, edizioneCorrenteIncantesimi, motivoIndietro } from '../src/provenienza-incantesimi.js';
import { validaDati } from '../src/validate.js';
import { datiReali } from './helpers.js';

const dati = JSON.parse(readFileSync(new URL('../data/incantesimi.json', import.meta.url), 'utf8'));
const corrente = versioneManuale('magia');
const schede = leggiSchedeMagia(testoManuale('magia'));

// ——— l'edizione ———
test('la Magia recepita è la 1.19 e il testo salvato porta lo stesso numero nel nome e nella prima pagina', () => {
  assert.equal(corrente, '1.19');
  assert.match(testoManuale('magia').slice(0, 400), /EDIZIONE 1\.19/);
  assert.equal(registro().manuali.find((m) => m.id === 'magia').recepimento_in_attesa, undefined, 'la 1.19 è recepita, non in attesa');
});

// ——— 1. la rete ———
test('il lettore trova 90 schede, tutte con nome, scheda e tabella principale', () => {
  assert.equal(schede.length, 90);
  assert.equal(new Set(schede.map((s) => s.scheda)).size, 90, 'nessun numero di scheda doppio');
  for (const s of schede) {
    assert.ok(s.nome && s.macrofamiglia && s.specializzazione, `${s.scheda}: nome, macrofamiglia e specializzazione`);
    assert.ok(s.lancio, `${s.scheda} ${s.nome}: manca il lancio`);
    assert.ok(s.tabelle[0]?.righe.length > 0, `${s.scheda} ${s.nome}: la tabella principale è vuota (lettura mancata, non «nessun livello»)`);
  }
});

test('LA RETE: sulla corrente il lettore non trova differenze coi dati; sulla 1.11 (da cui venivano) solo le sei vere', () => {
  const q = quadro(schede, dati);
  assert.deepEqual(q.conto, { schede: 90, invariate: 90, cambiate: 0, parziali: 0, nuove: 0, sparite: 0, nome_diverso: 0 });
  // sulla 1.11: le schede che la 1.17/1.19 hanno toccato (Morente) e nient'altro — se ne comparisse una in più sarebbe il lettore
  const q111 = quadro(leggiSchedeMagia(testoEdizione('magia', '1.11')), dati);
  assert.equal(q111.conto.parziali, 0, 'nessuna lettura parziale sulla 1.11');
  assert.equal(q111.conto.nuove + q111.conto.sparite + q111.conto.nome_diverso, 0);
  assert.deepEqual(q111.voci.filter((v) => v.stato === 'cambiata').map((v) => v.scheda),
    ['16.8', '18.7', '21.1', '21.4', '21.6', '22.6'],
    'le sei schede che il Morente ha toccato dalla 1.11 alla 1.19 (testo soltanto)');
});

test('le etichette delle tabelle si censiscono: nessuna colonna senza nome, e il censimento non è vuoto', () => {
  const e = etichetteDelleTabelle(schede);
  assert.ok(Object.keys(e).length > 200, 'le colonne distinte delle 90 schede');
  assert.equal(e[''], undefined, 'le colonne vuote di riempimento non entrano nel censimento');
});

test('due tabelle di fila si separano (intestazione in grassetto senza separatore) e una riga col grassetto in una cella no', () => {
  const doppia = ['| A | B |', '| :-: | :-: |', '| 1 | 2 |', '| **C** | **D** |', '| 3 | 4 |'];
  assert.equal(dividiTabelle(doppia).length, 2, 'la seconda tabella ha l’intestazione tutta in grassetto');
  const unaSola = ['| Distanza | Ritardo |', '| :--- | --- |', '| **Planetaria:** stesso corpo | Nessuno |', '| **Interplanetaria:** altri | 30 min |'];
  assert.equal(dividiTabelle(unaSola).length, 1, 'un grassetto su una parola non è un’intestazione (era il difetto di Telepatia)');
});

// ——— 2. i costi in PM ———
test('OGNI COSTO IN PM delle schede è quello del manuale corrente', () => {
  assert.deepEqual(differenzePm(schede, dati), []);
  const conCosto = dati.incantesimi.reduce((n, i) => n + i.versioni.filter((v) => Object.keys(v).some((k) => /^(PM|Livello e PM|PM base)$/.test(k))).length, 0);
  assert.ok(conCosto > 600, `le righe con un costo sono ${conCosto}: un controllo su zero righe non prova niente`);
});

test('…e il controllo SA fallire: un solo costo cambiato, una riga in meno, un costo in più', () => {
  const sporco = structuredClone(dati);
  const i = sporco.incantesimi.findIndex((x) => x.versioni[1] && 'PM' in x.versioni[1]);
  sporco.incantesimi[i].versioni[1].PM = '99';
  assert.equal(differenzePm(schede, sporco).length, 1, 'un PM cambiato');
  const corto = structuredClone(dati); corto.incantesimi[3].versioni.pop();
  assert.equal(differenzePm(schede, corto).length, 1, 'una versione in meno nei dati (la lettura è completa: è il dato a essere indietro)');
  const extra = structuredClone(dati);
  const j = extra.incantesimi.findIndex((x) => x.versioni[0] && 'Livello e PM' in x.versioni[0]);
  extra.incantesimi[j].versioni[0].PM = '5';
  assert.equal(differenzePm(schede, extra).length, 1, 'un costo scritto nei dati che il manuale non ha');
});

test('i sette: gli incantesimi di Lucas e Dimitri (istantanea del 15/11) ci sono tutti nel manuale corrente, coi costi dei dati', () => {
  // letti dall'istantanea del 15/11/2026 18:45 (sola lettura): Lucas Invocatore, Dimitri Tecnomante; gli altri cinque non hanno incantesimi
  const lucas = ['Colpo Elementale', 'Esplosione Elementale', 'Telecinesi', 'Armatura di Forza', 'Telepatia', 'Psicometria', 'Cura Ferite', 'Guarigione', 'Dardo Spirituale', 'Muro Elementale',
    'Psicometabolismo', 'Piattaforma Levitante', 'Sovraccarico Sinaptico', 'Teletrasporto', 'Esorcizzare Oscurità', 'Campo di Forza', 'Identificare Potere'];
  const dimitri = ['Dardo Spirituale', 'Esplosione Elementale', 'Dardo Psichico', 'Armatura di Forza', 'Psicometabolismo', 'Batteria Mistica', 'Nascondere Aura', 'Colpo Elementale', 'Barriera di Forza', 'Terrore',
    'Identificare Potere', 'Arma Mistica', 'Mimetismo', 'Forma Elementale', 'Velo Psichico', 'Telemeccanica', 'Sesto Senso', 'Negare Potere'];
  const nelManuale = new Map(schede.map((s) => [s.nome.toLowerCase(), s]));
  const errori = differenzePm(schede, dati);
  for (const nome of new Set([...lucas, ...dimitri])) {
    const s = nelManuale.get(nome.toLowerCase());
    assert.ok(s, `«${nome}» non è nel manuale ${corrente}`);
    assert.deepEqual(errori.filter((e) => e.scheda === s.scheda), [], `${nome}: un costo cambia`);
    assert.equal(confrontaScheda(s, dati.incantesimi.find((d) => d.scheda === s.scheda)).versioni.esito, 'uguale', `${nome}: la tabella dei livelli cambia`);
  }
});

// ——— 3. la lettura parziale ———
test('UNA LETTURA PARZIALE NON SI SCRIVE MAI SOPRA UN VALORE BUONO: meno righe, tabella persa, tabelle di dettaglio in meno', () => {
  const d = dati.incantesimi.find((x) => x.altre_tabelle?.length >= 2) ?? dati.incantesimi.find((x) => x.altre_tabelle?.length);
  const letta = schede.find((s) => s.scheda === d.scheda);
  // tre livelli su sette: parziale, non vuoto
  const tre = structuredClone(letta); tre.tabelle[0].righe = tre.tabelle[0].righe.slice(0, Math.max(1, Math.floor(tre.tabelle[0].righe.length / 2)));
  // tabella principale non letta
  const nessuna = structuredClone(letta); nessuna.tabelle = [];
  // una tabella di dettaglio in meno
  const menoDettagli = structuredClone(letta); menoDettagli.tabelle = menoDettagli.tabelle.slice(0, menoDettagli.tabelle.length - 1);
  for (const [chi, parziale] of [['meno livelli', tre], ['tabella persa', nessuna], ['dettagli in meno', menoDettagli]]) {
    const r = unisciScheda(d, parziale, corrente);
    assert.ok(r.tenuti.length, `${chi}: il lettore avrebbe dovuto dichiararla parziale`);
    assert.deepEqual(sovrascrittaParziale(d, r.scheda, parziale), [], `${chi}: ha riscritto un campo parziale`);
    assert.deepEqual(r.scheda.versioni, d.versioni, `${chi}: i livelli sono rimasti quelli di prima`);
    assert.ok(r.tenuti.every((t) => t.motivo), `${chi}: il motivo è scritto`);
  }
});

test('…e il controllo SA fallire: un\'unione sbagliata apposta (il mutante) lo accende', () => {
  const d = dati.incantesimi[0];
  const letta = structuredClone(schede.find((s) => s.scheda === d.scheda));
  letta.tabelle[0].righe = letta.tabelle[0].righe.slice(0, 1);
  const mutante = structuredClone(d); mutante.versioni = letta.tabelle[0].righe; // l'unione ingenua: scrive quello che ha letto
  assert.deepEqual(sovrascrittaParziale(d, mutante, letta), ['versioni']);
  assert.deepEqual(sovrascrittaParziale(d, unisciScheda(d, letta, corrente).scheda, letta), []);
});

test('un campo cambiato e letto per intero si scrive, con l’edizione corrente accanto; uno invariato non si tocca', () => {
  const d = structuredClone(dati.incantesimi.find((x) => x.scheda === '21.6'));
  d.regole = 'testo vecchio';
  d._edizione = { corrente: '1.11', campi: { ...d._edizione.campi, regole: '1.11' } };
  const letta = schede.find((s) => s.scheda === '21.6');
  const r = unisciScheda(d, letta, corrente);
  assert.deepEqual(r.scritti, ['regole']);
  assert.equal(r.scheda.regole, letta.regole);
  assert.equal(r.scheda._edizione.campi.regole, corrente);
  assert.equal(r.scheda.lancio, d.lancio, 'il lancio era uguale: non si riscrive (resta nella forma dei dati)');
});

// ——— 4. il segno e il conto ———
test('IL SEGNO SI SPEGNE DA SÉ: nessuna scheda dei dati ne ha, una con un campo indietro sì, col motivo', () => {
  const edizione = edizioneCorrenteIncantesimi(dati);
  assert.equal(edizione, corrente);
  assert.deepEqual(dati.incantesimi.filter((s) => campiIndietroScheda(s, edizione).length), [], 'oggi tutte le 90 sono alla corrente');
  assert.equal(rigaProvenienzaIncantesimo(dati.incantesimi[0], edizione), null);
  const vecchia = structuredClone(dati.incantesimi[0]);
  vecchia._edizione.campi.regole = '1.11';
  const riga = rigaProvenienzaIncantesimo(vecchia, edizione, 'Il Direttore non ha ancora risposto.');
  assert.match(riga, /regole della scheda da 1\.11/);
  assert.match(riga, /Il Direttore non ha ancora risposto/);
  assert.equal(rigaProvenienzaIncantesimo(structuredClone(dati.incantesimi[0]), edizione), null, 'tornata alla corrente, il segno sparisce');
  assert.equal(motivoIndietro(dati, dati.incantesimi[0]), null);
});

test('IL CONTO DELLE SCHEDE deve tornare coi dati: 90 schede, nessun campo indietro, ogni campo indietro col suo motivo', async () => {
  const { dati: base } = await datiReali();
  const problemi = (muta) => {
    const d = structuredClone(base); muta(d);
    return validaDati(d).filter((e) => e.file === 'incantesimi.json').map((e) => `${e.chiave}: ${e.problema}`);
  };
  assert.deepEqual(problemi(() => {}), [], 'i dati veri sono a posto');
  assert.ok(problemi((d) => { d.incantesimi.corpus.schede = 91; }).length, 'schede dichiarate ≠ schede nei dati');
  assert.ok(problemi((d) => { d.incantesimi.incantesimi.pop(); }).length, 'una scheda in meno: il manuale ne ha 90');
  assert.ok(problemi((d) => { delete d.incantesimi.incantesimi[5]._edizione; }).length, 'una scheda che non dichiara da dove viene');
  assert.ok(problemi((d) => { d.incantesimi.incantesimi[5]._edizione.campi.regole = '1.11'; }).length, 'un campo indietro senza il motivo e senza il conto');
  assert.ok(problemi((d) => { d.incantesimi.corpus.campi_letti = []; }).length, 'un conto su zero campi non prova niente');
  assert.ok(problemi((d) => { d.incantesimi.corpus.confronto_lotto_211.invariate = 80; d.incantesimi.corpus.confronto_lotto_211.cambiate = 5; }).length, 'invariate + cambiate ≠ schede');
  // e con il motivo scritto e il conto aggiornato, il campo indietro è accettato
  assert.deepEqual(problemi((d) => {
    d.incantesimi.incantesimi[5]._edizione.campi.regole = '1.11';
    d.incantesimi.corpus.campi_indietro = 1;
    d.incantesimi.corpus.motivi_indietro = [{ scheda: d.incantesimi.incantesimi[5].scheda, nome: d.incantesimi.incantesimi[5].nome, campi: [{ campo: 'regole', motivo: 'in attesa della risposta del Direttore (prova)' }] }];
  }), []);
});

test('le dieci schede aggiornate sono quelle dichiarate, e il Morente non cambia nessun costo', () => {
  const C = dati.corpus.confronto_lotto_211;
  assert.equal(C.invariate + C.cambiate, 90);
  assert.equal(C.aggiornate.length, 10);
  for (const x of C.aggiornate) assert.match(x, /: (regole|descrizione)$/, `${x}: solo testo`);
  assert.equal(dati.corpus.campi_indietro, 0);
});
