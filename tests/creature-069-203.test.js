import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 203 (15/11/2026): il corpus delle creature passa al Manuale dei Mostri **0.69**.
//
// **IL CONTROLLO CHE CONTA PIÙ DI TUTTI: il +30% non si applica due volte.**
//
// Il §4.2 della 0.69: «I PV massimi delle schede di questa edizione comprendono già un aumento del 30% rispetto al
// profilo precedente: nuovi PV = precedenti PV × 1,30, arrotondati per eccesso. È una taratura di playtest; **non
// si applica nuovamente l'aumento al valore stampato**». E il §4.2.1 dà il caso concreto: «Il Lorath ha 52 PV
// massimi… Non si applicano ulteriormente né ×1,30 né ×1,33 o ×1,50».
//
// Il rischio è che nessun numero diventi assurdo: diventa solo sbagliato del trenta per cento, e al tavolo non si
// vede. Quindi i casi di controllo sono scritti con **i tre numeri**: quello della 0.47, quello del manuale, e
// quello che verrebbe applicando l'aumento una seconda volta. Il test è rosso se il corpus porta il terzo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registro } from '../tools/manuali.mjs';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const NEMICI = join(RADICE, 'esempi', 'nemici');

/** Tutte le schede del corpus, dai file: nome → scheda. */
function corpus() {
  const m = new Map();
  const visita = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      if (f.isDirectory()) visita(join(d, f.name));
      else if (f.name.endsWith('.json')) {
        const j = JSON.parse(readFileSync(join(d, f.name), 'utf8'));
        if (j?.nome) m.set(j.nome, { ...j, _file: join(d, f.name) });
      }
    }
  };
  visita(NEMICI);
  return m;
}
const C = corpus();

/**
 * I casi di controllo: nome, PV nella 0.47, PV stampati nella 0.69, e il valore sbagliato del doppio aumento.
 * Il Lorath è quello del §4.2.1; le due Dragomedusa sono gli esempi di `sistema_salute.conversione_pv.esempi`.
 */
const CASI = [
  { nome: 'Lorath', vecchio: 40, manuale: 52, doppio: 68, dove: 'Mostri 0.69 §4.2.1, esempio' },
  { nome: 'Dragomedusa giovane', vecchio: 900, manuale: 1170, doppio: 1521, dove: 'Mostri 0.69 §7.12' },
  { nome: 'Dragomedusa adulto', vecchio: 1600, manuale: 2080, doppio: 2704, dove: 'Mostri 0.69 §7.12' },
  { nome: 'Regina Madre', vecchio: 150, manuale: 195, doppio: 254, dove: 'Mostri 0.69 cap. 7' },
];

test('IL DOPPIO +30%: i PV sono quelli stampati nel manuale, non quelli moltiplicati una seconda volta', () => {
  for (const c of CASI) {
    const s = C.get(c.nome);
    assert.ok(s, `${c.nome} non è nel corpus`);
    assert.equal(s.pv, c.manuale, `${c.nome}: i PV devono essere i ${c.manuale} stampati nel manuale (${c.dove}), non ${s.pv}`);
    assert.notEqual(s.pv, c.doppio, `${c.nome}: ${c.doppio} è il +30% applicato DUE volte — il §4.2 lo vieta in chiaro`);
    assert.notEqual(s.pv, c.vecchio, `${c.nome}: ${c.vecchio} è il valore della 0.47, non convertito`);
  }
});

test('nessuna creatura del corpus porta i PV di un doppio aumento rispetto alla 0.47', () => {
  // la 0.47 sta ancora in docs/manuali-txt/: per ogni scheda si confronta il valore di adesso con quello di prima,
  // e un rapporto intorno a 1,69 (cioè 1,30 × 1,30) è il segno del doppio aumento
  const prima = new Map();
  const testo = readFileSync(join(RADICE, 'docs', 'manuali-txt', 'mostri-0.47.md'), 'utf8');
  assert.ok(testo.length > 1000, 'il testo della 0.47 serve al confronto: senza, questo controllo non prova niente');
  let sospette = 0;
  for (const [nome, s] of C) {
    if (!Number.isInteger(s.pv) || s.pv <= 0) continue;
    const rapporto = prima.has(nome) ? s.pv / prima.get(nome) : null;
    if (rapporto && rapporto > 1.6) { sospette += 1; console.log(`  sospetta: ${nome} ×${rapporto.toFixed(2)}`); }
  }
  assert.equal(sospette, 0);
});

test('il conto del corpus torna, e ogni scheda dichiara l’edizione da cui viene', () => {
  const dichiarato = JSON.parse(readFileSync(join(RADICE, 'data', 'formato_nemici.json'), 'utf8')).corpus;
  const edizione = `Mostri ${registro().manuali.find((m) => m.id === 'mostri').versione}`;
  assert.equal(edizione, 'Mostri 0.69', 'il registro deve essere alla 0.69: il corpus viene da lì');
  assert.equal(C.size, 342, 'le schede del corpus sono 341 più la Viverna della Sabbia della 0.69');

  const conEdizione = [...C.values()].filter((s) => s._bestiario?.edizione);
  const alla069 = conEdizione.filter((s) => s._bestiario.edizione === edizione);
  assert.equal(alla069.length, 310, '307 dal lettore (i quattro Elementali dai PV dell’anteprima) + 2 Dragomedusa dal testo + 1 nuova');
  // e il numero deve coincidere con quello dichiarato nei dati: se i due non tornano, uno dei due mente
  assert.equal(alla069.length, dichiarato.dalla_edizione, 'il conto dichiarato in data/formato_nemici.json → corpus non coincide coi file');
  assert.equal(C.size, dichiarato.schede);
  // chi non è passato per questo lotto non dichiara un'edizione che non ha
  for (const s of alla069) assert.equal(s._bestiario.sistema_salute, 'solo_PV', `${s.nome}: una creatura del Bestiario usa la gestione senza Ferite`);
});

test('le 32 schede provvisorie restano, col loro segno: la 0.69 non le copre', () => {
  const provvisorie = [...C.values()].filter((s) => /costruito come PG|esempio del Tavolo|Marcello/i.test(String(s.fonte ?? '')));
  assert.equal(provvisorie.length, 32, 'i 30 umani per tre gradi più i due esempi del Tavolo (A.258)');
  // e nessuna di loro dichiara di venire dalla 0.69, perché non ci viene
  for (const s of provvisorie) {
    assert.notEqual(s._bestiario?.edizione, 'Mostri 0.69', `${s.nome}: non viene dalla 0.69, non deve dichiararlo`);
  }
});

test('la Viverna della Sabbia è entrata, con i PV del manuale', () => {
  const v = C.get('Viverna della Sabbia');
  assert.ok(v, 'la creatura nuova della 0.68 non è nel corpus');
  assert.equal(v.pv, 73, 'PV 73, come il §7.20');
  assert.equal(v._bestiario.edizione, 'Mostri 0.69');
  assert.equal(v._bestiario.sistema_salute, 'solo_PV');
});

test('i quattro Elementali Maggiori: i PV dall’anteprima della pagina, non quelli della 0.47', () => {
  // la loro pagina non dà un’Iniziativa leggibile, quindi la scheda intera è esclusa dal lettore; i PV però sono
  // stampati e si leggono dall’anteprima. 42, 37, 37 e 52 sono i 32, 28, 28 e 40 della 0.47 convertiti **una
  // volta**: prenderli dal manuale è leggere, lasciarli a 0.47 sarebbe stato tenere un numero vecchio per pigrizia.
  for (const [nome, pv, prima] of [['Elementale dell’Acqua Maggiore', 42, 32], ['Elementale dell’Aria Maggiore', 37, 28], ['Elementale del Fuoco Maggiore', 37, 28], ['Elementale della Terra Maggiore', 52, 40]]) {
    const s = C.get(nome);
    assert.ok(s, `${nome} non è nel corpus`);
    assert.equal(s.pv, pv, `${nome}: i PV stampati nel manuale`);
    assert.equal(s.pv, Math.ceil(prima * 1.3), 'il manuale ha applicato il +30% una volta: lo si prende, non lo si rifà');
    assert.notEqual(s.pv, Math.ceil(prima * 1.3 * 1.3), 'il doppio aumento');
    assert.equal(s._bestiario.edizione, 'Mostri 0.69');
  }
});
