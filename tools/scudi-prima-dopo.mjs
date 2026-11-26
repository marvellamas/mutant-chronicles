// Lotto 255 — **la non-regressione del catalogo degli scudi contro una base git** (sola lettura).
//
// Perché serve, e perché per gli scudi vale più che per le armi: la voce dell'inventario di un personaggio rimanda al
// catalogo con `rif`, e i valori si ricalcolano a ogni apertura della scheda. Cambiare `mov` su 25 scudi cambia il
// Movimento di chi ne ha uno in mano **senza toccare il suo file**, ed è esattamente quello che questo lotto vuole
// fare: la revisione approvata il 24/11. Quindi il confronto non serve a dire «niente è cambiato», serve a dire
// **che cosa** è cambiato, campo per campo, e che non è cambiato nient'altro.
//
// Uso:
//   node tools/scudi-prima-dopo.mjs                   (contro HEAD)
//   node tools/scudi-prima-dopo.mjs --da=<ref git>    (contro un'altra base: la rete a due basi)
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti } from './argomenti.mjs';
import { confrontaBasi } from './armi-prima-dopo.mjs';

fermaSeSconosciuti('scudi-prima-dopo.mjs', process.argv.slice(2));
const arg = (n) => process.argv.slice(2).find((x) => x.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? null;
const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
const FILE = ['data/equipaggiamento/scudi.json'];

/** I campi di uno scudo che contano al tavolo. `penalita` è nuovo del lotto 255 (il −1 VA della categoria Enorme). */
export const CAMPI_SCUDO = ['nome', 'taglia', 'mani', 'ar', 'for_richiesta', 'pi', 'mov', 'penalita', 'parata',
  'qualita', 'ps_int', 'reperibilita', 'costo', 'proprieta', 'profili_alternativi', 'famiglia', 'catalogo'];

const base = arg('da') ?? 'HEAD';
const e = confrontaBasi(base, RADICE, FILE, CAMPI_SCUDO);
console.log(`scudi contro ${base}: ${e.voci} voci · ${e.uguali} identiche · ${e.cambiate} cambiate · ${e.sparite.length} sparite · ${e.nuove.length} nuove`);
const perCampo = {};
for (const d of e.differenze) (perCampo[d.campo] ??= []).push(d);
const breve = (v) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
for (const [campo, l] of Object.entries(perCampo)) {
  console.log(`\n${campo}: ${l.length}`);
  for (const d of l) console.log(`  ${d.id}: ${breve(d.prima)} → ${breve(d.dopo)}`);
}
for (const s of e.sparite) console.log(`SPARITA: ${s.id} (${s.nome})`);
for (const n of e.nuove) console.log(`NUOVA: ${n.id} (${n.nome})`);
