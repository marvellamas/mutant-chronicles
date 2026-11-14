// Che cosa cambia di prezzo a chi ha già comprato (lotto 195, A.261). **Legge e non scrive niente.**
//
//   node tools/prezzi-prima-dopo.mjs <cartella o file di personaggi> [--da <commit>]
//
// L'Equipaggiamento 0.41 e la Magia 1.17 hanno ricalcolato il catalogo degli Artefatti: una Batteria Rossa da
// 5 PM passa da 1.000 a 1.950 cr, una Batteria Matrice da 10 PM da 3.000 a 13.500. Un prezzo nuovo **non cancella
// quello che un personaggio ha già comprato, consumato o speso**: nel file del personaggio non c'è nessun prezzo —
// ci sono i crediti attuali e l'elenco degli oggetti — e il prezzo si legge dal catalogo ogni volta. Quindi non
// c'è niente da migrare e niente da convertire: cambia soltanto la cifra che la scheda mostra accanto all'oggetto.
//
// Questo programma lo dimostra invece di affermarlo: per ogni personaggio elenca gli oggetti il cui prezzo di
// catalogo è diverso fra i dati di un commit e quelli di adesso, e dice che crediti, quantità e dotazione non
// cambiano. Serve al Direttore prima di una serata: se un giocatore chiede «quanto vale la mia Batteria?», la
// risposta nuova è un'altra, e lui lo sa prima che glielo chiedano.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));

/** I dati come erano a un commit (git show), senza toccare la cartella di lavoro. */
async function datiDa(commit) {
  const { caricaDati } = await import(pathToFileURL(join(RADICE, 'src', 'rules.js')));
  const leggi = async (nome) => (commit
    ? execFileSync('git', ['-C', RADICE, 'show', `${commit}:data/${nome}.json`], { encoding: 'utf8', maxBuffer: 1e8 })
    : readFileSync(join(RADICE, 'data', `${nome}.json`), 'utf8'));
  return (await caricaDati(leggi)).dati;
}

/** I file di personaggio di una cartella, o il singolo file. */
export function fileDiPersonaggi(percorso) {
  const s = statSync(percorso);
  if (!s.isDirectory()) return [percorso];
  return readdirSync(percorso).filter((f) => f.endsWith('.json')).map((f) => join(percorso, f))
    .filter((f) => { try { return JSON.parse(readFileSync(f, 'utf8'))?.formato === 'mutant-personaggio'; } catch { return false; } });
}

/**
 * Per un personaggio, gli oggetti il cui prezzo di catalogo è cambiato.
 * @returns {{ nome, righe: [{ nome, rif, quantita, prima, dopo }], crediti }}
 */
export function cambiPrezzo(file, primaCat, dopoCat) {
  const o = JSON.parse(readFileSync(file, 'utf8'));
  const righe = [];
  for (const v of o.scelte?.equipaggiamento ?? []) {
    const a = primaCat.perRif.get(v.rif);
    const b = dopoCat.perRif.get(v.rif);
    if (!a || !b || a.costo === b.costo) continue;
    righe.push({ nome: b.nome ?? v.rif, rif: v.rif, quantita: v.quantita ?? 1, prima: a.costo, dopo: b.costo });
  }
  return { nome: o.scelte?.nome ?? basename(file), righe, crediti: o.sessione?.crediti ?? null };
}

const cr = (n) => (Number.isFinite(n) ? `${n.toLocaleString('it-IT')} cr` : 'nessun prezzo');

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('prezzi-prima-dopo.mjs')) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['prezzi-prima-dopo.mjs'], 'prezzi-prima-dopo.mjs');
  const percorso = argv.find((a) => !a.startsWith('--'));
  if (!percorso) { console.error('Serve la cartella (o il file) dei personaggi. Niente viene scritto.'); process.exit(2); }
  const i = argv.indexOf('--da');
  const commit = i >= 0 ? argv[i + 1] : 'HEAD';
  const { catalogo } = await import(pathToFileURL(join(RADICE, 'src', 'equipaggiamento.js')));
  const primaCat = catalogo(await datiDa(commit));
  const dopoCat = catalogo(await datiDa(null));
  const files = fileDiPersonaggi(percorso);
  console.log(`Prezzi di catalogo: ${commit} → cartella di lavoro. ${files.length} personaggi, in sola lettura.\n`);
  let totale = 0;
  for (const f of files) {
    const c = cambiPrezzo(f, primaCat, dopoCat);
    console.log(`${c.nome}${c.righe.length ? '' : ' — nessun oggetto cambia di prezzo'}`);
    for (const r of c.righe) console.log(`    ${r.nome}${r.quantita > 1 ? ` ×${r.quantita}` : ''}: ${cr(r.prima)} → ${cr(r.dopo)}`);
    if (c.righe.length) console.log(`    crediti attuali: ${c.crediti ?? '—'} (non cambiano: nel file non c’è nessun prezzo)`);
    totale += c.righe.length;
  }
  console.log(`\n${totale} oggetti con un prezzo diverso. Nessun file è stato toccato: il prezzo si legge dal catalogo, non dal personaggio.`);
}
