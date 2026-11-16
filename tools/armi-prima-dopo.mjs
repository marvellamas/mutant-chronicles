// Le armi del catalogo prima e dopo, campo per campo. **Legge soltanto.**
//
// Lotto 206 (16/11/2026), parte C. È il controllo che nei lotti 204 e 205 ha trovato i difetti che i test non
// vedevano — un elenco di attacchi accorciato, una scheda nuova che perdeva quello che si era letto — e qui serve
// più che là: un'arma del catalogo non è una copia, è **la** fonte dei valori che la scheda di un personaggio
// ricalcola a ogni apertura. Un campo che cambia senza che nessuno l'abbia deciso cambia un tiro al tavolo.
//
// Confronta due basi, come il 205:
//   node tools/armi-prima-dopo.mjs --da=HEAD          (il commit precedente: il valore prima di questo lotto)
//   node tools/armi-prima-dopo.mjs --da=<ref>         (qualunque altro riferimento git)
//
// Stampa i campi diversi voce per voce e **conta**; `_edizione` e `versione_manuale` non sono valori di gioco e
// non si contano. Esce con 0 sempre: dice, non decide — a decidere se una differenza è voluta è una persona.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';
import { FILE_ARMI } from './lotti/lotto_206_armi.mjs';
import { CAMPI, CAMPI_NOSTRI, NOMI_CAMPI } from '../src/provenienza-catalogo.js';

/** I campi che si confrontano: i valori di gioco, compresi quelli che il lotto non scrive. */
export const CAMPI_CONFRONTO = [...CAMPI, ...CAMPI_NOSTRI, 'nome', 'tipo', 'paragrafo'];

const uguale = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Le voci di un file a un dato riferimento git, per id. */
export function vociA(ref, file, radice = '.') {
  const testo = ref
    ? execFileSync('git', ['show', `${ref}:${file}`], { cwd: radice, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    : readFileSync(`${radice}/${file}`, 'utf8');
  const json = JSON.parse(testo);
  return new Map((json.oggetti ?? []).map((o) => [o.id, o]));
}

/**
 * Il confronto fra due basi: `{ voci, uguali, cambiate, differenze, sparite, nuove }`.
 * Una voce sparita o nuova si dice a parte: nel 204 una rigenerazione cambiò un `id` e ruppe i rimandi.
 */
export function confrontaBasi(ref, radice = '.', file = FILE_ARMI) {
  const esito = { voci: 0, uguali: 0, cambiate: 0, differenze: [], sparite: [], nuove: [] };
  for (const f of file) {
    const prima = vociA(ref, f, radice);
    const dopo = vociA(null, f, radice);
    for (const [id, p] of prima) {
      esito.voci += 1;
      const d = dopo.get(id);
      if (!d) { esito.sparite.push({ file: f, id, nome: p.nome }); continue; }
      const diverse = CAMPI_CONFRONTO.filter((k) => !uguale(p[k], d[k]));
      if (!diverse.length) { esito.uguali += 1; continue; }
      esito.cambiate += 1;
      for (const k of diverse) {
        esito.differenze.push({ file: f, id, nome: d.nome ?? p.nome, campo: k, nome_campo: NOMI_CAMPI[k] ?? k, prima: p[k] ?? null, dopo: d[k] ?? null });
      }
    }
    for (const [id, d] of dopo) if (!prima.has(id)) esito.nuove.push({ file: f, id, nome: d.nome });
  }
  return esito;
}

const breve = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object' && !Array.isArray(v)) {
    if ('una_mano' in v) return `${v.una_mano ?? '—'} / ${v.due_mani ?? '—'}`;
    if ('capacita' in v) return `capacità ${v.capacita}`;
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? x.nome ?? JSON.stringify(x) : x)).join(' ');
  return String(v);
};

export function righe(e, ref) {
  const out = [`Confronto con ${ref ?? 'il disco'}: ${e.voci} voci, ${e.uguali} identiche, ${e.cambiate} con almeno un campo diverso.`];
  for (const d of e.differenze) out.push(`  ${d.nome} (${d.id}) · ${d.nome_campo}: ${breve(d.prima)} → ${breve(d.dopo)}`);
  if (e.sparite.length) out.push(`  SPARITE: ${e.sparite.map((x) => `${x.nome} (${x.id})`).join(', ')}`);
  if (e.nuove.length) out.push(`  nuove: ${e.nuove.map((x) => `${x.nome} (${x.id})`).join(', ')}`);
  if (!e.differenze.length && !e.sparite.length && !e.nuove.length) out.push('  nessuna differenza nei valori di gioco.');
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['armi-prima-dopo.mjs'], 'armi-prima-dopo.mjs');
  const a = process.argv.find((x) => x.startsWith('--da='));
  const ref = a ? a.slice('--da='.length) : 'HEAD';
  for (const r of righe(confrontaBasi(ref), ref)) console.log(r);
}
