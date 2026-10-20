// Pulizia della cartella dei personaggi (20/10/2026, lotto «un originale solo», parte F): i file datati dello stesso
// personaggio vanno in `personaggi/storico/<id>/`, così in `personaggi/` resta un file per personaggio.
//
// Lo strumento NON sposta niente da solo: il primo comando produce un rapporto e si ferma. Lo spostamento avviene solo
// con il secondo comando, dopo che Marcello ha letto il rapporto.
//
//   node tools/pulizia-personaggi.mjs                  rapporto, non tocca niente
//   node tools/pulizia-personaggi.mjs --cartella X      rapporto su un'altra cartella (prove)
//   node tools/pulizia-personaggi.mjs --sposta          sposta davvero (dopo l'ok), con il rapporto di ciò che fa
//
// Che cosa fa lo spostamento: per ogni personaggio tiene in `personaggi/` il file modificato più di recente e sposta
// gli altri in `personaggi/storico/<id>/<data-ora>.json` (la data-ora è quella di modifica del file). Niente viene
// cancellato. I file che non sono personaggi di Mutant e quelli di personaggi diversi non si toccano.
import { readdir, stat, readFile, mkdir, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOME_FILE, chiaveDaFile } from '../src/cartella.js';
import { idPersonaggio, cartellaStorico, CARTELLA_STORICO } from '../src/storico-personaggi.js';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
const quando = (ms) => new Date(ms).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
const nomeDaMtime = (ms) => `${new Date(ms).toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

/**
 * Esamina la cartella: per ogni personaggio (id stabile) i suoi file, quale è l'originale proposto (il più recente) e
 * quali andrebbero in storico. Non tocca niente.
 * @returns {{ personaggi: [{ id, nome, originale, altri, file }], ignorati: string[], totale, dopo }}
 */
export async function rapporto(cartella) {
  const nomi = (await readdir(cartella).catch(() => [])).filter((f) => NOME_FILE.test(f));
  const file = [];
  const ignorati = [];
  for (const f of nomi) {
    const dove = join(cartella, f);
    const s = await stat(dove);
    let o = null;
    try { o = JSON.parse(await readFile(dove, 'utf8')); } catch { /* rovinato */ }
    if (o?.formato !== 'mutant-personaggio') { ignorati.push(f); continue; }
    file.push({ file: f, mtime: s.mtimeMs, id: idPersonaggio(o, chiaveDaFile(f)), nome: o.scelte?.nome?.trim() || chiaveDaFile(f), dimensione: s.size });
  }
  const per = new Map();
  for (const x of file) {
    if (!per.has(x.id)) per.set(x.id, []);
    per.get(x.id).push(x);
  }
  const personaggi = [...per.entries()].map(([id, suoi]) => {
    const ordinati = [...suoi].sort((a, b) => b.mtime - a.mtime);
    return { id, nome: ordinati[0].nome, originale: ordinati[0], altri: ordinati.slice(1), file: ordinati };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  return { personaggi, ignorati, totale: file.length, dopo: personaggi.length };
}

/** Il rapporto in parole, una riga per personaggio. */
export function testoRapporto(r, { sposta = false } = {}) {
  const righe = [`${r.totale} file di personaggio in cartella, ${r.dopo} personaggi: dopo la pulizia resterebbero ${r.dopo} file.`, ''];
  for (const p of r.personaggi) {
    righe.push(`${p.nome} (${p.id}): ${p.file.length} file.`);
    righe.push(`  originale proposto: ${p.originale.file} — ${quando(p.originale.mtime)}`);
    for (const a of p.altri) righe.push(`  ${sposta ? 'spostato' : 'in storico'}: ${a.file} — ${quando(a.mtime)}`);
  }
  if (r.ignorati.length) righe.push('', `Non sono personaggi di Mutant (non toccati): ${r.ignorati.join(', ')}.`);
  righe.push('', sposta ? 'Spostamento eseguito: niente è stato cancellato, le copie stanno in personaggi/storico/.'
    : 'Niente è stato toccato. Per spostare davvero: node tools/pulizia-personaggi.mjs --sposta');
  return righe.join('\n');
}

/** Sposta in `storico/<id>/` tutti i file tranne l'originale di ogni personaggio. Restituisce gli spostamenti fatti. */
export async function sposta(cartella, r) {
  const fatti = [];
  for (const p of r.personaggi) {
    for (const a of p.altri) {
      const dove = join(cartella, CARTELLA_STORICO, cartellaStorico(p.id));
      await mkdir(dove, { recursive: true });
      const nome = nomeDaMtime(a.mtime);
      await rename(join(cartella, a.file), join(dove, nome));
      fatti.push({ da: a.file, a: `${CARTELLA_STORICO}/${cartellaStorico(p.id)}/${nome}` });
    }
  }
  return fatti;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('pulizia-personaggi.mjs')) {
  const i = process.argv.indexOf('--cartella');
  const cartella = i > 0 ? process.argv[i + 1] : join(RADICE, 'personaggi');
  const r = await rapporto(cartella);
  const fare = process.argv.includes('--sposta');
  console.log(`Cartella: ${cartella}\n`);
  console.log(testoRapporto(r, { sposta: fare }));
  if (fare) {
    const fatti = await sposta(cartella, r);
    console.log(`\n${fatti.length} file spostati.`);
  }
}
