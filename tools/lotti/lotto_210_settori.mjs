// Lotto 210 (17/11/2026), parte B — **i settori di tiro delle armi di bordo: la M606 a 120°, e tutti gli altri, strutturati.**
//
// La regola. Veicoli 0.19 §10 (e la tavola del FIAT LUX): la M606 dello Scout ha una «postazione manuale ravvicinata alla
// botola… Arma e protezione bassa sono smontabili per l'allestimento civile. Lo schermo leggero comprende la mitragliatrice e
// lascia libera la canna; l'intera struttura ha un settore di rotazione orizzontale di 120°, ulteriormente limitato dagli
// ostacoli reali. La protezione concede Copertura soltanto nelle direzioni in cui scherma effettivamente il tiratore…; non
// aumenta l'AR del veicolo o dell'occupante». L'E&L dell'11/11/2026 la dà già («settore di rotazione dell'intera struttura
// 120°, con spazio per la canna»). Nell'app c'era «360°, limitato dagli ostacoli reali», che veniva dalla scheda 0.6 del
// 30/10 (più vecchia). Vale la più recente.
//
// I settori dichiarati nei manuali sono tutti qui, non solo il suo (Veicoli 0.19 e scheda Neverlost 1.6): torrette dei
// mitragliatori 360°, cannone arco frontale 90°, lanciamissili arco frontale 180°. Erano testo libero in `arco_di_tiro`; ora
// ognuno ha anche `arco: { gradi, orientamento }`, che un test confronta con il testo del manuale.
//
// **Il centro del settore dello Scout non è scritto da nessuna parte**: 120° di rotazione, ma centrati dove? Davanti? Sul
// lato? Il manuale dice «frontale» per i cannoni della Neverlost e non lo dice per lo Scout. Non si inventa: `orientamento:
// null` e `da_definire: 'A.280'`.
//
//   node tools/lotti/lotto_210_settori.mjs            — che cosa cambierebbe
//   node tools/lotti/lotto_210_settori.mjs --scrivi   — applica (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

const FILE = 'data/veicoli.json';
const FONTE_SCOUT = 'Veicoli 0.19 §10 e tavola del FIAT LUX; E&L 11/11/2026 (raccordo Armamenti e Veicoli)';

/** L'arco strutturato di ogni testo oggi nei dati, letto dal testo (stessa fonte, una volta sola). */
export function arcoDaTesto(testo, { scout = false } = {}) {
  // lotto 223: la A.280 (E&L 18/11/2026) ha risposto: semicerchio frontale di 180° per il FIAT LUX dei PG (prima 120° con il centro da definire)
  if (scout) return { gradi: 180, orientamento: 'frontale', fonte: 'E&L 18/11/2026, A.280 (vale solo per il FIAT LUX dei PG): semicerchio frontale, 90° a sinistra e 90° a destra del muso', precedente: { gradi: 120, orientamento: null, fonte: FONTE_SCOUT } };
  const t = String(testo ?? '');
  if (/^360°/.test(t)) return { gradi: 360, orientamento: 'libero', fonte: 'Neverlost 1.6, Settori' };
  const m = t.match(/arco frontale (\d+)°/);
  if (m) return { gradi: Number(m[1]), orientamento: 'frontale', fonte: 'Neverlost 1.6, Settori' };
  return null;
}

export function piano(radice = '.') {
  const json = JSON.parse(readFileSync(`${radice}/${FILE}`, 'utf8'));
  const cambi = [];
  for (const p of json.profili ?? []) {
    for (const a of p.armi ?? []) {
      const scout = p.id === 'asa-scout-mk4' && /M606/.test(a.nome);
      const voluto = arcoDaTesto(a.arco_di_tiro, { scout });
      if (!voluto) { if (a.arco_di_tiro) cambi.push({ profilo: p.id, arma: a.nome, errore: `testo non capito: «${a.arco_di_tiro}»` }); continue; }
      const testoNuovo = scout ? 'Settore di rotazione orizzontale di 120° (l’intera struttura: arma e schermo), limitato dagli ostacoli reali' : a.arco_di_tiro;
      if (JSON.stringify(a.arco ?? null) === JSON.stringify(voluto) && a.arco_di_tiro === testoNuovo) continue;
      cambi.push({ profilo: p.id, arma: a.nome, riga: a, voluto, testoNuovo, scout });
    }
  }
  return { json, cambi };
}

export function applica(cambi) {
  for (const c of cambi.filter((x) => !x.errore)) {
    c.riga.arco_di_tiro = c.testoNuovo;
    c.riga.arco = c.voluto;
    if (c.scout) {
      c.riga.postazione = 'Postazione manuale ravvicinata alla botola';
      c.riga.smontabile = true;
      c.riga.schermo = { testo: 'Arma e protezione bassa sono smontabili per l’allestimento civile. Lo schermo leggero comprende la mitragliatrice e lascia libera la canna. La protezione concede Copertura soltanto nelle direzioni in cui scherma effettivamente il tiratore, secondo le regole generali; non aumenta l’AR del veicolo o dell’occupante.', aggiunge_ar: false, fonte: FONTE_SCOUT };
      c.riga.arco_di_tiro_precedente = { testo: '360°, limitato dagli ostacoli reali', fonte: 'scheda ASA Scout MK4 0.6 (30/10/2026), superata da Veicoli 0.19 e dall’E&L dell’11/11/2026' };
    }
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_210_settori.mjs'], 'lotto_210_settori.mjs');
  const { json, cambi } = piano();
  const errori = cambi.filter((c) => c.errore);
  for (const e of errori) console.error(`${e.profilo} · ${e.arma}: ${e.errore}`);
  if (errori.length) process.exit(2);
  if (!cambi.length) { console.log('Niente da cambiare: i settori sono già strutturati.'); process.exit(0); }
  for (const c of cambi) console.log(`${c.profilo} · ${c.arma}: ${c.voluto.gradi}° ${c.voluto.orientamento ?? '(centro da definire, A.280)'}`);
  if (!argv.includes('--scrivi')) { console.log('\n(dry-run: --scrivi per applicare)'); process.exit(0); }
  applica(cambi);
  writeFileSync(FILE, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`\nScritto ${FILE}.`);
}
