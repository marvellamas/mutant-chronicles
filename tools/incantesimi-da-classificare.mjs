// Quanti incantesimi aggiunti a mano sono «da classificare» (A.176) e in quali personaggi. Solo lettura: non scrive nulla.
//   node tools/incantesimi-da-classificare.mjs [cartella o file…]
// Senza argomenti guarda esempi/, tests/collaudo/ e, se ci sono, personaggi/ e PersonaggiBackup/ (in sola lettura).
// Un incantesimo è «da classificare» quando non ha `tipo` (appreso o annotato): le righe salvate prima della distinzione.
import { readdir, readFile, stat } from 'node:fs/promises';
import { fileAttuale } from '../src/cartella.js';
import { join } from 'node:path';

const RADICE = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PREDEFINITE = ['esempi', 'tests/collaudo', 'personaggi', 'PersonaggiBackup'];

async function fileJson(percorso) {
  let st;
  try { st = await stat(percorso); } catch { return []; }
  if (st.isFile()) return percorso.endsWith('.json') ? [percorso] : [];
  const out = [];
  for (const v of await readdir(percorso, { withFileTypes: true })) {
    // «storico» e le copie di sicurezza sono la storia di un personaggio, non un personaggio in più
    if (v.isDirectory()) { if (!['storico', 'backup-master'].includes(v.name)) out.push(...await fileJson(join(percorso, v.name))); }
    else if (v.name.endsWith('.json')) out.push(join(percorso, v.name));
  }
  return out;
}

/** Le righe di un file di personaggio: { nome, tipo } per ogni incantesimo aggiunto a mano (null se non è un personaggio). */
export function righeAMano(testo) {
  let o;
  try { o = JSON.parse(testo); } catch { return null; }
  if (!o || o.formato !== 'mutant-personaggio') return null;
  const lista = o.scelte?.incantesimiAMano ?? o.incantesimiAMano ?? [];
  return {
    pg: o.pg ?? null,
    nome: o.scelte?.nome ?? o.nome ?? '(senza nome)',
    // lotto 200: serve a `fileAttuale`, che guarda `aggiornato_il` prima della data nel nome del file
    aggiornato: typeof o.aggiornato_il === 'string' ? o.aggiornato_il : null,
    righe: (Array.isArray(lista) ? lista : []).map((x) => ({ nome: x?.nome, tipo: ['appreso', 'annotato'].includes(x?.tipo) ? x.tipo : 'da_classificare' })),
  };
}

export async function elenco(percorsi) {
  const per = [];
  for (const [radice, p] of percorsi.entries()) {
    for (const f of await fileJson(p)) {
      let testo;
      try { testo = await readFile(f, 'utf8'); } catch { continue; }
      const r = righeAMano(testo);
      if (r) per.push({ file: f, radice, ...r });
    }
  }
  // Un personaggio con più file datati conta una volta: vale la prima cartella indicata che lo ha, e lì il suo file
  // attuale; una copia in un'altra cartella non lo sostituisce.
  //
  // **Lotto 200:** contare per personaggio lo faceva già, ma con una regola sua — il nome del file in ordine
  // alfabetico. Quale file sia l'attuale lo dice `src/cartella.js → fileAttuale`, che guarda `aggiornato_il` prima
  // della data nel nome: due regole che quasi sempre danno lo stesso file sono peggio di una, perché quando danno
  // file diversi nessuno se ne accorge.
  const gruppi = new Map();
  for (const x of per) {
    const cartella = x.file.replace(/[^/]*$/, '');
    const chiave = `${x.radice}\u0000${cartella}\u0000${x.pg ?? x.nome}`;
    if (!gruppi.has(chiave)) gruppi.set(chiave, []);
    gruppi.get(chiave).push(x);
  }
  const ultimi = new Map();
  // chi viene dopo vince: prima le cartelle più in fondo (per esempio `personaggi/storico/`), poi quella di lavoro,
  // così è la cartella di lavoro a valere e non l'ordine con cui il disco ha restituito i file
  const profondita = (v) => v.file.split('/').length;
  for (const voci of [...gruppi.values()].sort((a, b) => b[0].radice - a[0].radice || profondita(b[0]) - profondita(a[0]))) {
    const scelto = fileAttuale(voci.map((v) => ({ ...v, file: v.file.split('/').pop() })));
    const vero = voci.find((v) => v.file.endsWith(scelto.file));
    ultimi.set(vero.pg ?? `${vero.nome}|${vero.file.replace(/[^/]*$/, '')}`, vero);
  }
  return [...ultimi.values()].filter((x) => x.righe.length);
}

if (process.argv[1]?.endsWith('incantesimi-da-classificare.mjs')) {
  const arg = process.argv.slice(2);
  const percorsi = (arg.length ? arg : PREDEFINITE).map((p) => (/^([A-Za-z]:|\/)/.test(p) ? p : join(RADICE, p)).split(String.fromCharCode(92)).join('/'));
  const per = await elenco(percorsi);
  const da = per.map((x) => ({ ...x, daClassificare: x.righe.filter((r) => r.tipo === 'da_classificare') })).filter((x) => x.daClassificare.length);
  const totale = da.reduce((n, x) => n + x.daClassificare.length, 0);
  console.log(`Personaggi con incantesimi aggiunti a mano: ${per.length}. Con incantesimi da classificare: ${da.length} (${totale} incantesimi).`);
  for (const x of da) console.log(`- ${x.nome} [${x.file}]: ${x.daClassificare.map((r) => r.nome).join(', ')}`);
}
