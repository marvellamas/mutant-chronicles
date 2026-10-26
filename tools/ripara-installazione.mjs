// Mutant si accorge di essere la copia sbagliata e si rimette a posto (27/10/2026, lotto 128: il PC di Davide aveva
// due cartelle "distribuzione" sul desktop — una vuota, aperta dal collegamento, l'altra con i personaggi veri).
//
// All'avvio (tools/console.mjs -> voceAvvio), se la cartella dei dati di questo PC e' vuota, si cerca un'altra
// installazione vera di Mutant (Mutant.bat o server.mjs) che ha i personaggi, con la stessa ricerca della voce P
// (tools/cerca-personaggi.mjs, lotto 127): se la trova, una domanda sola; con SI diventa lei la cartella dei dati di
// questo PC. Se le uniche copie trovate non sono installazioni vere (una cartella sul cloud, una copia di
// sicurezza), non si usano da dove sono — la sincronizzazione scriverebbe sui file mentre si gioca — ma si propone
// di copiarle dentro questa installazione.
//
// La cartella vuota non si rinomina subito: la rinomina ("<nome>-NON-USARE") e' rischiosa se e' la cartella da cui
// sta girando il programma in questo momento (su Windows rinominare la propria cartella di lavoro mentre gira puo'
// rompere il resto del .bat). Si mette in un elenco nel profilo di Windows (riparazioni-pendenti.json, accanto a
// dati.json) e la si rinomina quando un'ALTRA copia di Mutant parte (voceAvvio la rilegge sempre, in silenzio): a
// quel punto non e' piu' la cartella in uso, e si puo' rinominare senza rischi. Mai se nel frattempo ha di nuovo dei
// personaggi (l'ha rimessa in piedi qualcun altro) o se e' proprio quella da cui si sta partendo adesso.
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { cartellaProfilo } from './config-avvisi.mjs';
import { cartellaDati, quantiPersonaggi } from './dati-pc.mjs';
import { cerca, cartelleUtente } from './cerca-personaggi.mjs';

const norma = (p) => resolve(p).toLowerCase();

/**
 * Le radici per il controllo automatico (all'avvio, senza che nessuno l'abbia chiesto): solo i Desktop/Documenti/
 * Download (utente, pubblico, OneDrive) e la cartella dell'utente, poco in profondità. A differenza della ricerca
 * della voce P (tools/cerca-personaggi.mjs → radiciDiRicerca), NON risale le cartelle sopra a `radiceApp`: in una
 * prova (o in un'installazione messa in una cartella molto corta) risalire due livelli può arrivare alla cartella
 * TEMP del PC, piena delle cartelle di altre prove — qui dentro un controllo che parte da solo, senza che l'utente
 * l'abbia chiesto, deve restare prudente.
 */
function radiciSicure(radiceApp, { home = homedir() } = {}) {
  const out = [[resolve(radiceApp), 2], [resolve(home), 2]];
  for (const c of cartelleUtente(home)) out.push([c, 5]);
  return out;
}

/**
 * Questa copia e' quella sbagliata (la cartella dei dati di questo PC non ha personaggi) e un'altra ce li ha?
 * @returns null (niente da fare: ha già i personaggi, o non si trova nessun'altra copia) oppure
 *   { tipo: 'installazione'|'copia', cartella, quanti, ultima, altre: [{cartella,quanti,ultima}] }
 *   «installazione»: un'altra copia vera di Mutant (Mutant.bat o server.mjs) — da usare direttamente.
 *   «copia»: solo cartelle senza i marcatori dell'app (cloud, copie di sicurezza) — si copiano dentro, non si usano da li'.
 */
export function controllaSeSbagliata(radiceApp, opz = {}) {
  const dd = cartellaDati(radiceApp, opz);
  if (quantiPersonaggi(dd.cartella) > 0) return null;
  const radici = opz.radici ?? radiciSicure(radiceApp, opz);
  const t = cerca({ radiceApp, dati: dd.cartella, radici, home: opz.home });
  const qui = new Set([norma(radiceApp), norma(dd.cartella)]);
  const candidate = t.copie.filter((c) => !qui.has(norma(c.cartella)) && c.quanti > 0);
  if (!candidate.length) return null;
  const installazioni = candidate.filter((c) => c.appCopia);
  const [scelta, ...altre] = installazioni.length ? installazioni : candidate;
  return { tipo: installazioni.length ? 'installazione' : 'copia', cartella: scelta.cartella, quanti: scelta.quanti, ultima: scelta.ultima, altre };
}

/** Il file dell'elenco delle cartelle vuote in attesa di essere rinominate. */
const percorsoPendenti = (opz = {}) => join(opz.profilo ?? cartellaProfilo(), 'riparazioni-pendenti.json');

function leggiPendenti(opz) {
  try { const v = JSON.parse(readFileSync(percorsoPendenti(opz), 'utf8'))?.cartelle; return Array.isArray(v) ? v : []; } catch { return []; }
}
function scriviPendenti(elenco, opz) {
  const p = percorsoPendenti(opz);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${JSON.stringify({ cartelle: elenco }, null, 2)}\n`);
}

/** Segna `percorso` (una copia vuota di Mutant) perché venga rinominata la prossima volta che è sicuro farlo. */
export function segnaCartellaVuota(percorso, opz = {}) {
  const elenco = leggiPendenti(opz);
  const r = resolve(percorso);
  if (!elenco.some((c) => norma(c) === norma(r))) elenco.push(r);
  scriviPendenti(elenco, opz);
}

/**
 * Rinomina le cartelle in attesa, saltando quella da cui si sta partendo adesso (mai se stessi), quelle che non ci
 * sono più, quelle che hanno già un nome «-NON-USARE» e quelle che nel frattempo hanno di nuovo dei personaggi.
 * @returns [{ da, a }] le cartelle rinominate davvero.
 */
export function eseguiRinominePendenti(radiceAppCorrente, opz = {}) {
  const elenco = leggiPendenti(opz);
  if (!elenco.length) return [];
  const rinominate = [];
  const restano = [];
  for (const c of elenco) {
    if (!existsSync(c)) continue; // sparita da sola (per esempio cancellata a mano): tolta dall'elenco
    if (norma(c) === norma(radiceAppCorrente)) { restano.push(c); continue; }
    if (basename(c).endsWith('-NON-USARE')) continue;
    if (quantiPersonaggi(c) > 0) continue; // ha di nuovo dei personaggi: non si tocca
    const nuovo = join(dirname(c), `${basename(c)}-NON-USARE`);
    if (existsSync(nuovo)) continue; // già rinominata con questo nome in un'altra volta
    try { renameSync(c, nuovo); rinominate.push({ da: c, a: nuovo }); } catch { restano.push(c); } // non riuscita: si riprova
  }
  scriviPendenti(restano, opz);
  return rinominate;
}

/** La sottocartella «personaggi» di `c`, senza badare a maiuscole o spazi (come cerca-personaggi.mjs). */
function cartellaPersonaggiDi(c) {
  let voci;
  try { voci = readdirSync(c, { withFileTypes: true }); } catch { return join(c, 'personaggi'); }
  const trovata = voci.find((v) => v.isDirectory() && v.name.trim().toLowerCase() === 'personaggi');
  return join(c, trovata?.name ?? 'personaggi');
}

const NOME_FILE_PG = /_liv\d{1,2}_\d{4}-\d{2}-\d{2}\.json$/;

/**
 * Copia i file dei personaggi (e il px.json, se c'è) da una cartella trovata (tipo «copia», senza marcatori
 * dell'app: cloud, copia di sicurezza) dentro questa installazione. Non sposta né cancella l'originale.
 * @returns { copiati }
 */
export function copiaPersonaggiDentro({ daCartella, radiceApp }) {
  const src = cartellaPersonaggiDi(daCartella);
  const dest = join(radiceApp, 'personaggi');
  mkdirSync(dest, { recursive: true });
  let copiati = 0;
  try {
    for (const f of readdirSync(src).filter((x) => NOME_FILE_PG.test(x))) { copyFileSync(join(src, f), join(dest, f)); copiati++; }
  } catch { /* nessun file da copiare */ }
  try {
    const px = join(daCartella, 'px', 'px.json');
    if (existsSync(px)) { mkdirSync(join(radiceApp, 'px'), { recursive: true }); copyFileSync(px, join(radiceApp, 'px', 'px.json')); }
  } catch { /* senza px: non e' un problema */ }
  return { copiati };
}

/**
 * Mette al passo il codice di un'altra installazione («destinazione») con quello di questa copia («sorgente», di
 * solito quella appena aggiornata): riusa distribuzione/aggiorna-da-zip.ps1, che aggiorna i file dell'app senza
 * toccare personaggi, tavolo, salvataggi… di destinazione. Non fa niente se le due sono già alla stessa versione (o
 * sono la stessa cartella), o se la sorgente non ha quello script.
 * @returns { ok, fatto, motivo? }
 */
export function aggiornaCodiceAltra({ sorgente, destinazione }) {
  if (norma(sorgente) === norma(destinazione)) return { ok: true, fatto: false };
  let vS = null;
  let vD = null;
  try { vS = JSON.parse(readFileSync(join(sorgente, 'versione.json'), 'utf8'))?.impronta ?? null; } catch { /* sconosciuta */ }
  try { vD = JSON.parse(readFileSync(join(destinazione, 'versione.json'), 'utf8'))?.impronta ?? null; } catch { /* sconosciuta */ }
  if (vS && vD && vS === vD) return { ok: true, fatto: false };
  const script = join(sorgente, 'distribuzione', 'aggiorna-da-zip.ps1');
  if (!existsSync(script)) return { ok: false, fatto: false, motivo: 'manca distribuzione/aggiorna-da-zip.ps1 nella copia aggiornata' };
  const lavoro = join(tmpdir(), `mutant-ripara-${Date.now()}`);
  const backup = join(destinazione, 'backup-prima-aggiornamento');
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-Sorgente', sorgente, '-Destinazione', destinazione, '-BackupDati', backup, '-Lavoro', lavoro], { stdio: 'inherit' });
  if (r.status !== 0) return { ok: false, fatto: false, motivo: `aggiornamento dei file non riuscito (codice ${r.status})` };
  return { ok: true, fatto: true };
}
