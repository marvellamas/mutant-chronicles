// Pulizia della cartella dei personaggi (20/10/2026, lotto «un originale solo», parte F; rifatto lo stesso giorno con
// la parte C di «chi tiene l'originale»): i file datati dello stesso personaggio vanno in `personaggi/storico/<id>/`,
// così in `personaggi/` resta un file per personaggio.
//
// Lo strumento NON sposta niente da solo: il primo comando produce un rapporto e si ferma. Lo spostamento avviene solo
// con il secondo comando, dopo che il rapporto è stato letto.
//
//   node tools/pulizia-personaggi.mjs                  rapporto, non tocca niente
//   node tools/pulizia-personaggi.mjs --cartella X     rapporto su un'altra cartella (prove)
//   node tools/pulizia-personaggi.mjs --sposta         sposta davvero, con il rapporto di ciò che fa
//   node tools/pulizia-personaggi.mjs --su FILE        scrive il rapporto anche in un file di testo
//
// Il rapporto guarda DENTRO i file, non solo la data: livello, PX, PV e PM, oggetti e crediti, l'ultima data del
// calendario di gioco, Ferite, Affaticamento e Stati (src/confronto-personaggi.js). La data del file dice quando è
// stato toccato, non quanto è avanti il personaggio: cinque PG su sette avevano la stessa ora, riscritti insieme da un
// recupero. Dove i segni non concordano, il personaggio è dichiarato **caso dubbio** e non si sceglie: lo guarda il Direttore.
//
// Lo spostamento non cancella niente e scrive una copia in `storico/` prima di muovere il file.
import { readdir, stat, readFile, mkdir, rename, copyFile, writeFile } from 'node:fs/promises';
import { cartellaDati } from './dati-pc.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOME_FILE, chiaveDaFile } from '../src/cartella.js';
import { idPersonaggio, cartellaStorico, CARTELLA_STORICO } from '../src/storico-personaggi.js';
import { segniDi, rigaSegni, proponiOriginale } from '../src/confronto-personaggi.js';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
const quando = (ms) => new Date(ms).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
const nomeDaMtime = (ms) => `${new Date(ms).toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

/**
 * Esamina la cartella: per ogni personaggio (id stabile) i suoi file con i segni che stanno dentro, quale si propone
 * come originale e perché, e i casi dubbi. Non tocca niente.
 * @returns {{ personaggi: [{ id, nome, segni, proposto, motivo, dubbio, altri }], ignorati, totale, dopo, dubbi }}
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
    file.push({ id: idPersonaggio(o, chiaveDaFile(f)), ...segniDi(o, { file: f, mtime: s.mtimeMs }) });
  }
  const per = new Map();
  for (const x of file) {
    if (!per.has(x.id)) per.set(x.id, []);
    per.get(x.id).push(x);
  }
  const personaggi = [...per.entries()].map(([id, suoi]) => {
    const segni = [...suoi].sort((a, b) => b.mtime - a.mtime);
    const p = proponiOriginale(segni);
    return {
      id, nome: segni.find((g) => g.nome)?.nome ?? chiaveDaFile(segni[0].file), segni,
      proposto: p.proposto, motivo: p.motivo, dubbio: p.dubbio, confronti: p.confronti,
      altri: p.proposto ? segni.filter((g) => g.file !== p.proposto.file) : [],
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  return { personaggi, ignorati, totale: file.length, dopo: personaggi.length, dubbi: personaggi.filter((p) => p.dubbio) };
}

/** Il rapporto in parole: per ogni personaggio i segni di ogni file, la proposta e il motivo. */
export function testoRapporto(r, { sposta = false } = {}) {
  const righe = [
    `${r.totale} file di personaggio, ${r.dopo} personaggi.`,
    'Per ogni file: livello · PX · PV · PM · oggetti · crediti · calendario di gioco · condizioni — data del file — nome.',
    '',
  ];
  for (const p of r.personaggi) {
    righe.push(`${p.nome} (${p.id}): ${p.segni.length} file`);
    for (const g of p.segni) {
      const segno = p.proposto && g.file === p.proposto.file ? '  → ' : '    ';
      righe.push(segno + rigaSegni(g, { quando }));
    }
    if (p.dubbio) {
      righe.push(`    ⚠ CASO DUBBIO: ${p.dubbio}.`);
      righe.push('      Non propongo niente: questo lo guarda il Direttore. Per ora restano tutti i file.');
    } else if (p.segni.length > 1) {
      righe.push(`    Propongo ${p.proposto.file}, perché ${p.motivo}.`);
      righe.push(`    ${sposta ? 'Spostati' : 'Andrebbero'} in storico: ${p.altri.map((g) => g.file).join(', ')}.`);
    }
    righe.push('');
  }
  if (r.dubbi.length) {
    righe.push(`${r.dubbi.length} caso${r.dubbi.length === 1 ? '' : 'i'} dubbio${r.dubbi.length === 1 ? '' : 'i'}: ${r.dubbi.map((p) => p.nome).join(', ')}. I loro file non si toccano.`);
    righe.push('');
  }
  righe.push(sposta
    ? 'Spostamento eseguito. Niente è stato cancellato: una copia di ogni file spostato è in personaggi/storico/.'
    : 'Niente è stato toccato. Per spostare davvero: node tools/pulizia-personaggi.mjs --sposta');
  return righe.join('\n');
}

/**
 * Sposta in `storico/<id>/` i file che non sono l'originale proposto. I casi dubbi non si toccano.
 * Prima di muovere, ne scrive una copia nella stessa cartella dello storico: niente si perde nemmeno se lo
 * spostamento si interrompe a metà.
 */
export async function sposta(cartella, r) {
  const fatti = [];
  for (const p of r.personaggi) {
    if (p.dubbio || !p.proposto) continue;
    for (const g of p.altri) {
      const dove = join(cartella, CARTELLA_STORICO, cartellaStorico(p.id));
      await mkdir(dove, { recursive: true });
      const nome = nomeDaMtime(g.mtime);
      // prima la copia, poi lo spostamento: se qualcosa va storto il file è già al sicuro
      await copyFile(join(cartella, g.file), join(dove, nome));
      await rename(join(cartella, g.file), join(dove, nome));
      fatti.push({ da: g.file, a: `${CARTELLA_STORICO}/${cartellaStorico(p.id)}/${nome}` });
    }
  }
  return fatti;
}

const arg = (nome) => { const i = process.argv.indexOf(nome); return i > 0 ? process.argv[i + 1] : null; };

if (process.argv[1]?.endsWith('pulizia-personaggi.mjs')) {
  fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['pulizia-personaggi.mjs'], 'pulizia-personaggi.mjs');
  const cartella = arg('--cartella') ?? join(cartellaDati(RADICE).cartella, 'personaggi'); // 26/10: tools/dati-pc.mjs
  const r = await rapporto(cartella);
  const fare = process.argv.includes('--sposta');
  const testo = `Cartella: ${cartella}\n\n${testoRapporto(r, { sposta: fare })}`;
  console.log(testo);
  const su = arg('--su');
  if (su) await writeFile(su, `${testo}\n`, 'utf8');
  if (fare) {
    const fatti = await sposta(cartella, r);
    console.log(`\n${fatti.length} file spostati.`);
    if (su) await writeFile(su, `${testo}\n\n${fatti.length} file spostati.\n`, 'utf8');
  }
}
