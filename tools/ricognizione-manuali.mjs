// Ricognizione dei manuali: che cosa c'è su Drive e che cosa abbiamo nel repo (lotto 188, 10/11/2026).
//
// Si lancia all'inizio di una sessione, o quando serve. Dice in chiaro, per ogni manuale del registro: versione sul
// disco, versione su Drive, se coincidono; e segnala i due guai che hanno già morso:
//   - **due file dello stesso manuale** nella cartella di lavoro (il 9/11 un Lorath è stato descritto con il Getto
//     acido invece del veleno paralizzante, perché su Drive convivevano Mostri 0.23 e 0.46 e il 0.23 aveva la data
//     più recente);
//   - **un ID che non risponde più** (è successo agli Armamenti fra la 0.50 e la 0.74, senza che nessuno lo dicesse).
// In nessuno dei due casi sceglie da sé quale file sia buono: **si ferma e lo dice**.
//
// Un file con il prefisso «ARCHIVIO —» o fuori dalla cartella di lavoro non è un doppione: è archiviato, e si ignora.
//
// Questo controllo ha bisogno della rete, quindi NON sta nei test (dopo il lotto 185 `npm test` è deterministico e
// ci resta): i due controlli che si fanno sui soli file del repo sono in tests/manuali-versioni-188.test.js.
//
//   node tools/ricognizione-manuali.mjs                 solo il repo: versioni sul disco, nomi e prime pagine
//   node tools/ricognizione-manuali.mjs --drive=<file>  confronta anche con Drive, da un elenco salvato (JSON)
//
// L'elenco di Drive lo prende chi ha gli strumenti di Drive (Claude Code in sessione) con una sola chiamata —
// `search_files` su `parentId = <cartella_lavoro>`, tutte le pagine — e lo salva come JSON `{ files: [...] }`:
// così lo strumento resta senza rete e il confronto è ripetibile.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { registro, voci, CARTELLA_TESTI, versioneDichiarata, versioneNelNome, improntaTesto } from './manuali.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

/** Il numero di versione dal titolo di un file di Drive: «… v0.74», «… 0.47.docx», «… — scheda v0.6». */
export function versioneNelTitolo(titolo) {
  const m = String(titolo).match(/v?(\d+\.\d+(?:\.\d+)?)(?:\.docx|\.doc|\.pdf)?\s*$/i) ?? String(titolo).match(/\bv(\d+\.\d+)\b/i);
  return m ? m[1] : null;
}

/** È un file archiviato? Il prefisso lo dice, e un archiviato non è mai un doppione. */
export const eArchiviato = (titolo) => /^\s*ARCHIVIO\b/i.test(String(titolo));

/**
 * Il quadro: una riga per voce del registro, con la versione sul disco, quella su Drive e se coincidono.
 * @param files l'elenco dei file della cartella di lavoro di Drive (o null: solo il repo)
 */
export function quadro(files = null) {
  // le scorciatoie di Drive puntano al file vero (per-davide.md è una scorciatoia): si seguono, altrimenti
  // il registro sembrerebbe pieno di ID spariti
  const perId = new Map();
  for (const f of (files ?? []).filter((x) => !eArchiviato(x.title))) {
    perId.set(f.id, f);
    const bersaglio = f.shortcutDetails?.targetFileId;
    if (bersaglio && !perId.has(bersaglio)) perId.set(bersaglio, f);
  }
  const righe = [];
  for (const v of voci()) {
    const p = join(CARTELLA_TESTI, v.testo);
    const ci = existsSync(p);
    const testo = ci ? readFileSync(p, 'utf8') : '';
    const f = perId.get(v.drive) ?? null;
    const suDrive = f ? versioneNelTitolo(f.title) : null;
    righe.push({
      id: v.id,
      nome: v.nome,
      disco: v.versione ?? '—',
      dentro: ci ? versioneDichiarata(testo) : null,
      nome_file: versioneNelNome(v.testo),
      drive: suDrive,
      titolo: f?.title ?? null,
      modificato: f?.modifiedTime ?? v.modificato ?? null,
      impronta: ci ? improntaTesto(testo) : null,
      manca: !ci,
      sparito: Boolean(files) && !f,
      // i documenti di scambio (per-davide, E&L) non portano un numero di versione: basta che l'ID risponda
      coincidono: !files ? null : v.versione ? Boolean(suDrive) && suDrive === v.versione : Boolean(f),
    });
  }
  return righe;
}

/** Due o più file dello stesso manuale nella cartella di lavoro: [{ id, nome, titoli }]. Gli archiviati non contano. */
export function doppioni(files) {
  const vivi = (files ?? []).filter((f) => !eArchiviato(f.title) && f.mimeType !== 'application/vnd.google-apps.folder');
  const out = [];
  for (const v of [...registro().manuali, ...registro().schede]) {
    // «stesso manuale» = stesso nome senza il numero di versione (è così che si chiamavano i due Mostri)
    const radice = v.nome.toLowerCase().replace(/[^a-zà-ù]+/g, ' ').trim();
    const parole = radice.split(' ').filter((w) => w.length > 4);
    const candidati = vivi.filter((f) => {
      const t = String(f.title).toLowerCase().replace(/[^a-zà-ù]+/g, ' ');
      return parole.length && parole.every((w) => t.includes(w));
    });
    if (candidati.length > 1) out.push({ id: v.id, nome: v.nome, titoli: candidati.map((f) => `${f.title} (${f.id}, ${f.modifiedTime})`) });
  }
  return out;
}

/** Le righe da stampare, e se c'è qualcosa che deve fermare chi legge. */
export function referto(files = null) {
  const righe = quadro(files);
  const dop = files ? doppioni(files) : [];
  const spariti = righe.filter((r) => r.sparito);
  const diverse = righe.filter((r) => r.coincidono === false && !r.sparito);
  const incoerenti = righe.filter((r) => r.dentro && r.nome_file && r.dentro !== r.nome_file);
  const mancanti = righe.filter((r) => r.manca);
  return { righe, doppioni: dop, spariti, diverse, incoerenti, mancanti, fermati: dop.length > 0 || spariti.length > 0 || incoerenti.length > 0 || mancanti.length > 0 };
}

function stampa(r, conDrive) {
  const L = (s, n) => String(s ?? '—').padEnd(n);
  console.log(`Registro: ${registro().manuali.length} manuali, ${registro().schede.length} schede, ${registro().scambio.length} documenti di scambio. Controllato il ${registro().controllato}.`);
  console.log(`Cartella di lavoro ${registro().cartella_lavoro} · archivio ${registro().cartella_archivio}\n`);
  console.log(L('Manuale', 36), L('disco', 7), L('prima pagina', 13), conDrive ? L('Drive', 7) : '', conDrive ? 'esito' : '');
  console.log('-'.repeat(conDrive ? 82 : 60));
  for (const x of r.righe) {
    const esito = !conDrive ? '' : x.sparito ? 'ID SPARITO' : x.coincidono ? 'coincidono' : x.drive ? 'DIVERSE' : 'non trovato su Drive';
    console.log(L(x.nome, 36), L(x.disco, 7), L(x.dentro, 13), conDrive ? L(x.drive, 7) : '', esito);
  }
  if (r.incoerenti.length) {
    console.log('\nFERMARSI — il nome del file e la prima pagina dicono versioni diverse:');
    for (const x of r.incoerenti) console.log(`  ${x.nome}: il nome dice ${x.nome_file}, la prima pagina ${x.dentro}`);
  }
  if (r.mancanti.length) {
    console.log('\nFERMARSI — manca il testo salvato:');
    for (const x of r.mancanti) console.log(`  ${x.nome}`);
  }
  if (conDrive && r.doppioni.length) {
    console.log('\nFERMARSI — due file dello stesso manuale nella cartella di lavoro (non scelgo io quale vale):');
    for (const d of r.doppioni) { console.log(`  ${d.nome}:`); for (const t of d.titoli) console.log(`    - ${t}`); }
  }
  if (conDrive && r.spariti.length) {
    console.log('\nFERMARSI — un ID del registro non risponde più (il file è stato sostituito o spostato):');
    for (const x of r.spariti) console.log(`  ${x.nome} (${x.id})`);
  }
  if (conDrive && r.diverse.length) {
    console.log('\nDa guardare — su Drive c’è un numero di versione diverso da quello del registro:');
    for (const x of r.diverse) console.log(`  ${x.nome}: registro ${x.disco}, Drive ${x.drive} («${x.titolo}»)`);
  }
  if (!r.fermati && !r.diverse.length) console.log(conDrive ? '\nTutto in ordine: un file corrente per manuale, versioni coincidenti.' : '\nRepo in ordine. Per il confronto con Drive: --drive=<elenco.json>.');
  console.log('\nNota: la data non decide niente. Un manuale può cambiare senza cambiare numero (è successo il 09/11 a');
  console.log('Magia 1.11 ed Equipaggiamento 0.30): il confronto che se ne accorge è l’impronta del testo salvato.');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['ricognizione-manuali.mjs'], 'ricognizione-manuali.mjs');
  const da = argv.find((a) => a.startsWith('--drive='))?.slice(8) ?? null;
  const files = da ? (JSON.parse(readFileSync(da, 'utf8')).files ?? JSON.parse(readFileSync(da, 'utf8'))) : null;
  const r = referto(files);
  stampa(r, Boolean(files));
  process.exit(r.fermati ? 2 : 0);
}
