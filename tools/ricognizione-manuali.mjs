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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { registro, voci, CARTELLA_TESTI, versioneDichiarata, versioneNelNome, improntaTesto } from './manuali.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';
import { cartellaIstantanee, leggiConfig } from './salva-sessione.mjs';
import { ultimaIstantanea, rigaFreschezza, RADICE as RADICE_APP } from './istantanea.mjs';
import { cartellaDati } from './dati-pc.mjs';

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

/**
 * I recepimenti in attesa: un'edizione che su Drive c'è, che sappiamo quale è, e che **non** è in cartella, con
 * il motivo per cui non lo è (lotto 191: il Veicoli 0.18, cambiato dopo la ricognizione del 190).
 *
 * Non è un errore e non ferma niente: è il contrario di un controllo che diventa verde per sbaglio. Senza questa
 * riga, un registro che dice «Veicoli 0.10» sembrerebbe aggiornato, e nessuno saprebbe che su Drive c'è la 0.18.
 */
export const recepimentiInAttesa = () => [...registro().manuali, ...registro().schede]
  .filter((v) => v.recepimento_in_attesa)
  .map((v) => ({ id: v.id, nome: v.nome, in_cartella: v.versione, su_drive: v.recepimento_in_attesa.versione, motivo: v.recepimento_in_attesa.motivo, documento: v.recepimento_in_attesa.documento ?? null }));

/** I manuali il cui confronto è stato fatto senza la riga di registro di Davide: una differenza ambigua è un'ipotesi. */
export const confrontiAllaCieca = () => [...registro().manuali, ...registro().schede]
  .filter((v) => v.confronto)
  .map((v) => ({ id: v.id, nome: v.nome, versione: v.versione, confronto: v.confronto }));

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

/**
 * **Di che giorno sono i personaggi che stiamo guardando (lotto 196).**
 *
 * Va in cima al controllo di inizio sessione, accanto alla ricognizione dei manuali, perché è la cosa che per
 * settimane non abbiamo saputo: `personaggi/` è una copia locale, e al 14/11/2026 conteneva file del 4 ottobre
 * (Dimitri), del 7 (Oshi), del 25 (Botha, Duncan, Michele, Pablo) e del 10 novembre (Lucas). Chiamarla «i file
 * veri» ci ha fatto presentare come «adesso» affermazioni su ottobre, e una di quelle ha prodotto una domanda
 * sbagliata a Davide (A.268, lotto 195).
 *
 * Legge l'ultima istantanea e dice quanto è fresca. Non scrive niente e non ferma nessuno: senza istantanee stampa
 * la riga che ricorda di datare ogni affermazione.
 *
 * **Due cartelle, non una (lotto 199).** `config-salvataggi.json → cartella_istantanee` è quella in cui l'app
 * **scrive** le istantanee: sta sul PC di Davide, dentro il cloud, e `erroreCartellaIstantanee` pretende che sia fuori
 * dalla cartella dei dati. Sul nostro PC le istantanee invece **arrivano**, e stanno in `istantanee/` accanto ai dati
 * (`.gitignore` e `tools/file-locali.json` la prevedono dal lotto 196). Chi legge guarda l'impostazione se c'è e poi
 * quella cartella: così il controllo di inizio sessione dice il giorno dei personaggi anche da noi, che è il posto
 * dove serve. Chi scrive continua a guardare solo l'impostazione.
 */
export function rigaIstantanea() {
  try {
    const dd = cartellaDati(RADICE_APP).cartella;
    const impostata = cartellaIstantanee(leggiConfig(join(dd, 'config-salvataggi.json')));
    const ricevute = join(dd, 'istantanee');
    const dove = [impostata, ricevute].filter(Boolean).find((c) => ultimaIstantanea(c)) ?? impostata;
    if (!dove) return 'Istantanea dei personaggi: cartella non impostata su questo PC. Ogni affermazione sui personaggi riguarda la copia locale di personaggi/, con la data del file su cui si basa.';
    return rigaFreschezza(ultimaIstantanea(dove)).riga;
  } catch (e) {
    return `Istantanea dei personaggi: non si legge (${e.message}). Vale la copia locale, con la data del file.`;
  }
}

/**
 * I riferimenti che non puntano a niente (lotto 201), accanto alla riga dell'istantanea.
 *
 * **Perché sta nel controllo di inizio sessione.** I due riferimenti rotti di Pablo e Lucas ci sono dal 4 e dal 9
 * ottobre, e li abbiamo trovati il 15 novembre **per caso**, correggendo un altro strumento. Un riferimento rotto
 * non si vede da nessuna parte finché qualcuno non apre quella scheda al tavolo, e allora è mezz'ora persa a
 * cercare un guasto che non c'è. Qui si vede appena si apre una sessione.
 *
 * Si guarda la cartella dei dati di questo PC e, se c'è, l'istantanea aperta più recente in `istantanee/`: la prima
 * è la nostra copia, la seconda è lo stato vero di Davide, e le due possono dire cose diverse. Non ferma nessuno e
 * non scrive niente: se qualcosa non si legge, lo dice e tira avanti.
 */
export async function righeRiferimentiRotti() {
  const out = [];
  try {
    const { quadroRiferimentiRotti } = await import(pathToFileURL(join(RADICE_APP, 'src', 'riferimenti-rotti.js')));
    const { personaggiDellaCartella } = await import('./personaggi-cartella.mjs');
    const { recordDelRegistro } = await import('./riferimenti-rotti.mjs');
    const { caricaDati } = await import(pathToFileURL(join(RADICE_APP, 'src', 'rules.js')));
    const { dati } = await caricaDati(async (n) => readFileSync(join(RADICE_APP, 'data', `${n}.json`), 'utf8'));
    const dd = cartellaDati(RADICE_APP).cartella;
    const posti = [{ che: 'copia locale', pg: join(dd, 'personaggi'), veicoli: join(dd, 'veicoli') }];
    // l'istantanea aperta più recente: è lo stato vero di Davide
    const ist = join(dd, 'istantanee');
    try {
      const aperte = readdirSync(ist, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^stato_/.test(d.name))
        .map((d) => d.name).sort();
      const ultima = aperte[aperte.length - 1];
      if (ultima) posti.push({ che: `istantanea ${ultima.replace(/^stato_/, '')}`, pg: join(ist, ultima, 'personaggi'), veicoli: join(ist, ultima, 'veicoli') });
    } catch { /* nessuna istantanea aperta: si guarda solo la copia locale */ }
    for (const p of posti) {
      if (!existsSync(p.pg)) continue;
      const q = quadroRiferimentiRotti(personaggiDellaCartella(p.pg), recordDelRegistro(p.veicoli), dati, { master: true });
      out.push(`${p.che}: ${q.riga}`);
    }
  } catch (e) {
    out.push(`Riferimenti rotti: non si leggono (${e.message}). Non blocca niente.`);
  }
  return out;
}

async function stampa(r, conDrive) {
  const L = (s, n) => String(s ?? '—').padEnd(n);
  console.log(rigaIstantanea());
  // lotto 201: accanto alla data dei personaggi, i riferimenti che non puntano a niente. I due di Pablo e Lucas
  // c'erano dal 4 e dal 9 ottobre e li abbiamo trovati il 15 novembre per caso: da qui si vedono aprendo la sessione.
  for (const riga of await righeRiferimentiRotti()) console.log(riga);
  console.log('');
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
  const attesa = recepimentiInAttesa();
  if (attesa.length) {
    console.log('\nSappiamo di non sapere — su Drive c’è un’edizione più recente che in cartella non è, e si sa perché:');
    for (const x of attesa) {
      console.log(`  ${x.nome}: in cartella ${x.in_cartella}, su Drive ${x.su_drive}${x.documento ? ` (${x.documento})` : ''}`);
      console.log(`    ${x.motivo}`);
    }
  }
  const cieche = confrontiAllaCieca();
  if (cieche.length) {
    console.log('\nConfrontati alla cieca — in sezione 7 del Doc non c’è la riga di registro di questa pubblicazione,');
    console.log('quindi per questi manuali una differenza ambigua è un’ipotesi, non una certezza:');
    for (const x of cieche) console.log(`  ${x.nome} ${x.versione}: ${x.confronto}`);
  }
  console.log('\nNota: la data non decide niente. Un manuale può cambiare senza cambiare numero (è successo il 09/11 a');
  console.log('Magia 1.11 ed Equipaggiamento 0.30): il confronto che se ne accorge è l’impronta del testo salvato.');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['ricognizione-manuali.mjs'], 'ricognizione-manuali.mjs');
  const da = argv.find((a) => a.startsWith('--drive='))?.slice(8) ?? null;
  const files = da ? (JSON.parse(readFileSync(da, 'utf8')).files ?? JSON.parse(readFileSync(da, 'utf8'))) : null;
  const r = referto(files);
  await stampa(r, Boolean(files));
  process.exit(r.fermati ? 2 : 0);
}
