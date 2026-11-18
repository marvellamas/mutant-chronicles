import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 205 (16/11/2026) — **le pagine «regole comuni» di ogni blocco, agganciate per posizione.**
//
// Il lotto 204 ha lasciato 249 schede miste e ha detto perché: la 0.69 ha spostato informazione dalle schede alle
// pagine di regole di ogni blocco, e il lettore le agganciava solo ai blocchi scritti a mano in `GRUPPI_COMUNI`.
//
// **La regola che questo test difende: i blocchi si leggono dalla posizione, non dai titoli.** Il primo tentativo
// cercava i titoli che finiscono per «regole comuni» o «regole operative» — ne trovava 20 su 57, e i blocchi che
// il manuale apre con un altro titolo («Non morti spiriti e signori», «Geni e guardiani elementali») finivano
// inghiottiti dal precedente. Un elenco di titoli va rifatto a ogni edizione; la struttura no.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blocchiDelTesto, bloccoDiRiga, dividi, leggiRighe, importa } from '../tools/importa-mostri.mjs';
import { testoManuale, versioneManuale } from '../tools/manuali.mjs';
import { schedaMista, provenienza, rigaProvenienza } from '../src/provenienza-bestiario.js';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const leggi = (id) => JSON.parse(readFileSync(join(RADICE, 'esempi', 'nemici', 'mostri', `${id}.json`), 'utf8'));
// Lotto 218: il test legge il testo corrente (testoManuale), quindi l'edizione la dice il registro.
const ED = `Mostri ${versioneManuale('mostri')}`;
const testo = testoManuale('mostri');
const { schede, pagine } = dividi(leggiRighe(testo));
const blocchi = blocchiDelTesto(pagine, schede);

test('i blocchi del catalogo si leggono dalla posizione, e coprono TUTTE le sue schede', () => {
  assert.ok(blocchi.length >= 50, `blocchi riconosciuti: ${blocchi.length}`);
  const catalogo = pagine.find((p) => /^8\s+Catalogo delle creature$/i.test(p.titolo));
  assert.ok(catalogo, 'il capitolo 8 deve esserci: senza, questo controllo non prova niente');
  const delCatalogo = schede.filter((s) => s.riga >= catalogo.riga);
  const scoperte = delCatalogo.filter((s) => !bloccoDiRiga(blocchi, s.riga));
  assert.deepEqual(scoperte.map((s) => s.nome), [], 'ogni creatura del catalogo appartiene a un blocco');
  assert.ok(delCatalogo.length >= 400, `schede del catalogo: ${delCatalogo.length}`);
});

test('un elenco di titoli non basterebbe: la maggior parte dei blocchi non si chiama «regole comuni»', () => {
  // il controllo che spiega **perché** la regola è posizionale: se un giorno qualcuno la riscrivesse cercando i
  // titoli, questo numero gli direbbe subito quanti blocchi perderebbe
  const perTitolo = blocchi.filter((b) => b.pagine.some((p) => /regole (comuni|operative)$|^Regole del blocco$/i.test(p.titolo)));
  assert.ok(perTitolo.length < blocchi.length / 2, `blocchi riconoscibili dal titolo: ${perTitolo.length} su ${blocchi.length}`);
});

test('il capitolo 7 resta fuori dalla regola di posizione, e il motivo è nel testo', () => {
  // «La Covata regole comuni» vale per le sue caste, non per il Lorath o la Viverna che vengono dopo: applicando
  // la posizione anche lì si sarebbe presa 37 schede che non ne fanno parte
  const covata = pagine.find((p) => /^La Covata regole comuni$/i.test(p.titolo));
  assert.ok(covata, 'la pagina della Covata deve esserci');
  assert.equal(bloccoDiRiga(blocchi, covata.riga + 1), null, 'nessun blocco posizionale nel capitolo 7');
  const lorath = leggi('lorath');
  assert.ok(!(lorath.capacita ?? []).some((c) => /Covata/i.test(c.nome)), 'il Lorath non prende le regole della Covata');
});

test('le code del blocco precedente non entrano in quello nuovo', () => {
  // trovato nella prova sulla plancia: il Lich si trovava fra le capacità la presa e l'inchiostro del Polpo,
  // perché fra l'ultima creatura di un blocco e la prima del successivo il manuale mette di fila le pagine che
  // continuano le une e quelle che aprono le altre
  const lich = leggi('lich');
  const nomi = (lich.capacita ?? []).map((c) => c.nome).join(' | ');
  for (const estranea of ['Inchiostro', 'Presa dei tentacoli', 'Apnea e liberazione', 'Trascinare']) {
    assert.ok(!nomi.includes(estranea), `il Lich non deve avere «${estranea}»: è del Polpo`);
  }
  assert.ok(nomi.includes('Non morti spiriti e signori'), 'ma deve avere le regole del suo blocco');
});

test('una scheda che era mista è tutta alla 0.69, e il ⚑ si spegne', () => {
  // l'Aquila gigante teneva le capacità della 0.47 perché i suoi tratti comuni stanno nelle pagine del blocco
  const aquila = leggi('aquila-gigante');
  assert.equal(schedaMista(aquila, ED), false, 'tutti i campi dalla 0.69');
  assert.equal(rigaProvenienza(aquila, ED), null, 'e nella mini-scheda non si legge niente');
  assert.equal(provenienza(aquila).capacita, ED);
  assert.ok((aquila.capacita ?? []).some((c) => /regole operative|Creature alate/i.test(c.nome)), 'con le regole del suo blocco');
});

test('una scheda che resta mista lo dice, e il motivo è scritto', () => {
  const lorath = leggi('lorath');
  assert.ok(schedaMista(lorath, ED));
  const riga = rigaProvenienza(lorath, ED);
  assert.match(riga, /Mostri 0\.47/);
  assert.match(riga, /Attacchi/);
  assert.ok(!riga.includes('**'), 'niente marcatori sullo schermo');
});

test('un attacco che prima non si poteva tirare, adesso si tira', () => {
  // la Viverna della Sabbia e il Cavaliere della Morte avevano zero attacchi perché la 0.69 li scrive in forme
  // che il lettore non capiva: l'AC di blocco «ha AC 1», il tipo di danno prima della Natura, «vittima già presa»
  for (const id of ['cavaliere-della-morte', 'anomalia-acquatica']) {
    const n = leggi(id);
    assert.ok((n.attacchi ?? []).length > 0, `${id}: deve avere almeno un attacco`);
    for (const a of n.attacchi) {
      assert.ok(Number.isInteger(a.va), `${id}/${a.nome}: senza VA non si tira`);
      assert.match(String(a.danno), /^\d+d\d+([+−-]\d+)?(×\d+)?$/, `${id}/${a.nome}: la formula del danno`);
      assert.ok(['Naturale', 'Magico', 'Etereo'].includes(a.natura), `${id}/${a.nome}: la Natura`);
    }
  }
});

test('l’AC di blocco scritta «ha AC 1» e «con AC 1» si legge: nessun attacco resta senza AC', () => {
  const { risultati } = importa(testo);
  const senzaAc = [];
  for (const r of risultati) {
    for (const a of r.json?.attacchi ?? []) if (a.ac === undefined) senzaAc.push(`${r.nome}/${a.nome}`);
  }
  assert.deepEqual(senzaAc.slice(0, 5), [], `attacchi letti senza AC: ${senzaAc.length}`);
});

test('la condizione di un attacco si porta dietro: il Calpestare del Triceratopo non diventa sempre disponibile', () => {
  // **il controllo che deve restare verde sempre.** La 0.69 scrive la condizione nella prosa invece che accanto
  // all'attacco: un Calpestare senza «solo contro una vittima già A Terra» è un attacco usabile quando non si
  // dovrebbe, e al tavolo non si vede che è sbagliato.
  for (const [id, nome, cond] of [['triceratopo', 'Calpestare', /A Terra/], ['cavallo-da-guerra', 'Calpestare', /A Terra/]]) {
    const a = (leggi(id).attacchi ?? []).find((x) => x.nome === nome);
    assert.ok(a, `${id}: ${nome} deve esserci`);
    assert.match(String(a.note ?? ''), cond, `${id}/${nome}: la condizione deve restare accanto all’attacco`);
  }
  // e il Triceratopo **tiene i valori della 0.69**: senza il riporto della condizione l'elenco degli attacchi
  // verrebbe ereditato per intero dalla 0.47, e la scheda resterebbe mista per un dato che invece si legge
  assert.equal(provenienza(leggi('triceratopo')).attacchi, ED, 'gli attacchi vengono dall’edizione corrente');
});
