// I mezzi dei capitoli 16, 17 e 18 del Manuale dei Veicoli: che cosa c'è dentro, prima di applicarli.
//
// **Sola lettura.** Questo strumento non scrive niente: né in `data/`, né nelle cartelle dei dati, né nei file dei
// personaggi. Serve al confronto preventivo del lotto 236 — i ventuno mezzi terrestri dei capitoli 16 e 17 più i
// due del 18 sono un lavoro che merita il suo lotto, e prima di aprirlo conviene sapere quanto è grande.
//
// Dice quattro cose, e nessuna la deduce:
//  1. quanti mezzi, con nome e categoria d'impiego, per capitolo;
//  2. quali etichette della scheda **corrispondono a un campo** che `data/veicoli.json` ha già, e quali sono
//     **nuove**: una scheda nuova con un campo che non abbiamo è lavoro da fare, non un dato da buttare;
//  3. quanti valori il manuale dichiara **«da definire»**: quelli non si deducono (lotto 219), e si contano;
//  4. che cosa scrive il manuale dello **Scout T4** e del **FIAT LUX**, parola per parola, perché nei dati il
//     profilo `asa-scout-mk4` è anche il FIAT LUX dei sette: la separazione si fa su quello che c'è scritto
//     (A.284), non su una nostra ricostruzione.
//
//   node tools/veicoli-nuovi.mjs [--file=<testo>] [--mezzo=<nome>]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { testoManuale } from './manuali.mjs';
import { righeTesto, tabelleTesto, titoloNumerato } from './tabelle-testo.mjs';
import { chiave } from './importa-equipaggiamento.mjs';

export const CAPITOLI = [16, 17, 18];

/**
 * Le etichette di riga che **corrispondono a un campo** di `data/veicoli.json`, con il campo che riempirebbero.
 * Censite sulle schede dei capitoli 16, 17 e 18 della 0.23: una corrispondenza si scrive qui dopo averla
 * guardata, e un'etichetta che non è in elenco risulta **nuova**, non «ignorata».
 */
export const CAMPI_NOTI = {
  tipologia: 'tipo',
  "categoria d'impiego": 'tipo (descrizione)',
  'scudo energetico': 'scudo (c’è solo sulla Neverlost)',
  alimentazione: 'alimentazione',
  'supporto vitale': 'supporto_vitale',
  'armamenti del veicolo': 'armi',
  'autonomia di marcia': 'alimentazione (autonomia)',
  configurazione: 'tipo (descrizione)',
  'equipaggio e posti': 'equipaggio',
  'posti complessivi': 'equipaggio.posti',
  passeggeri: 'equipaggio.passeggeri',
  'dimensioni dello scafo': 'dimensioni',
  'dimensioni e ingombro': 'dimensioni',
  altezza: 'dimensioni (altezza: NON c’è)',
  'ingombro sulla mappa': 'mappa / dimensioni.ingombro_q',
  'massa a vuoto': 'massa_kg',
  'carico utile': 'carico_kg',
  'qualità / ps integrità': 'qualita, ps_integrita',
  protezioni: 'ar, corazzato',
  man: 'man',
  reperibilità: 'reperibilita',
  prezzo: 'prezzo_cr',
  'pi corpo / propulsione / motore': 'pi',
};

/** Le etichette che il manuale dà e che nei dati **non hanno un campo**: il lavoro vero del lotto che applicherà. */
export const CAMPI_NUOVI = {
  'vano materiali': 'volume del vano in m³ (c’è `volume_utile_m3` solo sul furgone)',
  'lunghezza con cannone rivolto in avanti': 'ingombro che cambia con l’orientamento dell’arma',
  capacità: 'capacità dello scudo in ScE (c’è `scudo` solo sulla Neverlost)',
  'recupero dopo tre rnd senza essere colpito': 'rigenerazione dello scudo per Round',
  'ingombro di trasporto': 'ingombro a bordo di una nave (L × l × h)',
  'passaggio libero consigliato': 'spazio di manovra per imbarcare',
  'piazzola di parcheggio': 'area di stazionamento a bordo',
  'massa a pieno carico': 'massa a vuoto + carico utile',
  'massa massima': 'massa a vuoto + carico utile (lo stesso dato con un altro nome)',
  'bagagliaio complessivo': 'volume del bagagliaio in litri',
  'bagagliaio libero oltre al vano di sicurezza': 'volume del bagagliaio al netto del vano',
  'vano di sicurezza': 'vano chiuso per l’equipaggiamento di servizio',
};

const DA_DEFINIRE = /\b(da definire|da approvare|non (?:ancora )?(?:definit|fissat|approvat)|in sviluppo|resta(?:no)? da)\b/i;

/** Le schede dei capitoli indicati: un mezzo per paragrafo, con le sue coppie etichetta/valore. */
export function leggiMezzi(testo, capitoli = CAPITOLI) {
  const righe = righeTesto(testo);
  const { tabelle, spaiate } = tabelleTesto(testo);
  const mezzi = new Map();
  for (const t of tabelle) {
    const ti = titoloNumerato(righe, t.riga);
    if (!ti || !capitoli.includes(ti.capitolo) || !ti.numero.includes('.')) continue;
    const m = mezzi.get(ti.numero) ?? { numero: ti.numero, capitolo: ti.capitolo, nome: ti.titolo, coppie: [], tabelle: 0 };
    m.tabelle++;
    if (t.colonne.length === 2) for (const r of t.righe) m.coppie.push([r[0], r[1]]);
    mezzi.set(ti.numero, m);
  }
  return { mezzi: [...mezzi.values()], spaiate };
}

/** Le dodici categorie d'impiego del §16 e i mezzi che ciascuna nomina. */
export function categorie(testo) {
  const righe = righeTesto(testo);
  for (const t of tabelleTesto(testo).tabelle) {
    if (t.colonne[0] !== 'Categoria') continue;
    const ti = titoloNumerato(righe, t.riga);
    if (ti?.capitolo !== 16) continue;
    return t.righe.map(([categoria, mezzi]) => ({ categoria, mezzi }));
  }
  return [];
}

/** Il quadro: per ogni mezzo, i campi noti, quelli nuovi e i valori «da definire». */
export function quadro(testo) {
  const { mezzi, spaiate } = leggiMezzi(testo);
  const noti = new Map(); const nuovi = new Map(); const sconosciute = new Map();
  const daDefinire = [];
  for (const m of mezzi) {
    for (const [et, v] of m.coppie) {
      const k = chiave(et);
      if (DA_DEFINIRE.test(String(v))) daDefinire.push({ mezzo: m.nome, etichetta: et, valore: v });
      const dove = CAMPI_NOTI[k] ? noti : CAMPI_NUOVI[k] ? nuovi : sconosciute;
      dove.set(k, (dove.get(k) ?? 0) + 1);
    }
  }
  return { mezzi, spaiate, noti, nuovi, sconosciute, daDefinire };
}

/** Le coppie di un mezzo, per nome: «Bastion TC» → le sue etichette e i suoi valori, come il manuale le scrive. */
export function mezzoPerNome(testo, nome) {
  const n = chiave(nome);
  return leggiMezzi(testo).mezzi.find((m) => chiave(m.nome) === n || chiave(m.nome).includes(n)) ?? null;
}

const DIRETTO = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (DIRETTO) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  const testo = arg('file') ? readFileSync(arg('file'), 'utf8') : testoManuale('veicoli');
  if (arg('mezzo')) {
    const m = mezzoPerNome(testo, arg('mezzo'));
    if (!m) { console.log(`nessun mezzo «${arg('mezzo')}» nei capitoli ${CAPITOLI.join(', ')}`); process.exit(1); }
    console.log(`§${m.numero} ${m.nome} — ${m.tabelle} tabelle, ${m.coppie.length} coppie etichetta/valore`);
    for (const [et, v] of m.coppie) {
      const k = chiave(et);
      const segno = CAMPI_NOTI[k] ? `→ ${CAMPI_NOTI[k]}` : CAMPI_NUOVI[k] ? `★ NUOVO: ${CAMPI_NUOVI[k]}` : '· non classificata';
      console.log(`  ${et.padEnd(42)} ${String(v).slice(0, 70).padEnd(72)} ${segno}`);
    }
    process.exit(0);
  }
  const q = quadro(testo);
  const perCap = {};
  for (const m of q.mezzi) (perCap[m.capitolo] ??= []).push(m);
  for (const c of CAPITOLI) {
    const l = perCap[c] ?? [];
    console.log(`\n--- capitolo ${c}: ${l.length} paragrafi con una scheda ---`);
    for (const m of l) console.log(`  §${m.numero.padEnd(6)} ${m.nome.padEnd(42)} ${m.coppie.length} coppie`);
  }
  console.log('\n--- le dodici categorie d’impiego (§16) ---');
  for (const x of categorie(testo)) console.log(`  ${x.categoria.padEnd(34)} ${x.mezzi}`);
  console.log(`\ncampi che abbiamo già: ${q.noti.size} etichette distinte`);
  for (const [k, n] of [...q.noti].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}× ${k.padEnd(40)} → ${CAMPI_NOTI[k]}`);
  console.log(`\ncampi NUOVI (non c’è un campo in data/veicoli.json): ${q.nuovi.size}`);
  for (const [k, n] of [...q.nuovi].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}× ${k.padEnd(40)} ★ ${CAMPI_NUOVI[k]}`);
  console.log(`\netichette non classificate: ${q.sconosciute.size} (si guardano una per una, non si deducono)`);
  for (const [k, n] of [...q.sconosciute].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${String(n).padStart(3)}× ${k}`);
  console.log(`\nvalori «da definire» nel manuale: ${q.daDefinire.length}`);
  for (const x of q.daDefinire) console.log(`  ${x.mezzo} · ${x.etichetta}: ${String(x.valore).slice(0, 110)}`);
  console.log(`\ncoppie spaiate in tutto il manuale: ${q.spaiate.length} (dichiarate, non riempite per deduzione)`);
}
