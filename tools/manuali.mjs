// Il registro dei manuali, letto da un posto solo (lotto 188, 10/11/2026).
//
// Perché. Il 9/11 al tavolo un Lorath è stato descritto con il Getto acido invece del veleno paralizzante: su Drive
// convivevano due Manuali dei Mostri, e quello con il numero più basso (0.23) aveva la data di modifica più recente.
// Lo stesso, più in silenzio, era già successo con gli Armamenti, che fra la 0.50 e la 0.74 avevano cambiato ID.
// E in `docs/manuali-txt/` vivevano nomi senza versione — `giocatore.md`, `magia.md`, `armamenti.md`,
// `equipaggiamento.md`, `revisione-nec.md`, `mostri.md` — rimasti indietro di quattro, sei, ventiquattro versioni:
// l'app in partita non ne soffriva (legge i JSON), ma una rigenerazione avrebbe usato regole vecchie in silenzio.
//
// Le regole, in codice:
//   - **comanda il numero di versione, non la data**: `tools/manuali.json` ha come chiave ID di Drive + versione;
//   - chi legge un manuale chiede `testoManuale('magia')`, mai un percorso scritto a mano;
//   - la versione nel nome del file e quella scritta nella sua prima pagina devono coincidere (`versioneDichiarata`).
//
// Una cosa che la regola «comanda la versione» da sola non copre, e che va detta: **un manuale può cambiare senza
// cambiare numero**. È successo il 09/11 a Magia 1.11 ed Equipaggiamento 0.30. Per questo «è cambiato?» non si
// decide né dalla data né dal numero, ma dall'impronta del testo salvato (`improntaTesto`): è l'unico modo che non
// dipende dalla buona volontà di chi pubblica.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CARTELLA_TESTI = join(RADICE, 'docs', 'manuali-txt');
const FILE = join(RADICE, 'tools', 'manuali.json');

let cache = null;
/** Il registro, letto una volta sola. */
export function registro() {
  cache ??= JSON.parse(readFileSync(FILE, 'utf8'));
  return cache;
}

/** Tutte le voci con un testo salvato: manuali, schede e documenti di scambio. */
export const voci = () => [...registro().manuali, ...registro().schede, ...registro().scambio];

/** La voce di un manuale o di una scheda, per id. Si ferma se l'id non esiste: non si indovina un manuale. */
export function voce(id) {
  const v = voci().find((x) => x.id === id);
  if (!v) throw new Error(`manuale «${id}» non è nel registro (tools/manuali.json): ${voci().map((x) => x.id).join(', ')}`);
  return v;
}

/** Il percorso del testo salvato della versione corrente. */
export function percorsoManuale(id) {
  const v = voce(id);
  const p = join(CARTELLA_TESTI, v.testo);
  if (!existsSync(p)) throw new Error(`il testo di «${id}» (${v.versione ?? 'senza versione'}) non c'è: ${p}`);
  return p;
}

/** Il testo salvato della versione corrente. */
export const testoManuale = (id) => readFileSync(percorsoManuale(id), 'utf8');

/** La versione corrente dichiarata dal registro. */
export const versioneManuale = (id) => voce(id).versione ?? null;

/**
 * Il numero di versione scritto dentro il documento, dalla sua prima pagina: i Google Doc scrivono
 * «EDIZIONE 0.74» o «EDIZIONE CONSULTABILE 0.54», i Word «VERSIONE 0.47 • … • NOVEMBRE 2026», le schede
 * «Edizione 0.6 • 30 ottobre 2026». null se il documento non dichiara niente (certi appunti non lo fanno).
 */
export function versioneDichiarata(testo, righe = 40) {
  for (const r of String(testo).split('\n').slice(0, righe)) {
    const m = r.replace(/\*/g, '').match(/\b(?:EDIZIONE(?:\s+CONSULTABILE)?|VERSIONE)\b[^0-9]{0,12}(\d+(?:\.\d+)*)/i);
    if (m) return m[1];
  }
  return null;
}

/** La versione scritta nel nome del file: `magia-1.11.md` → `1.11`. null se il nome non la porta. */
export function versioneNelNome(nome) {
  const m = String(nome).match(/-(\d+(?:\.\d+)+)(?:-[0-9-]+)?\.md$/);
  return m ? m[1] : null;
}

/** L'impronta del testo salvato: dice «è cambiato?» senza dipendere dalla data né dal numero di versione. */
export const improntaTesto = (testo) => createHash('sha1').update(String(testo).replace(/\r/g, '')).digest('hex').slice(0, 12);

/**
 * Controllo C1: per ogni voce del registro, la versione del nome del file e quella scritta dentro devono coincidere.
 * @returns [{ id, testo, nome, dentro, problema }] — vuoto se è tutto in ordine. Non tocca la rete.
 */
export function versioniChePartono() {
  const fuori = [];
  for (const v of voci()) {
    if (!v.versione) continue; // i documenti di scambio non hanno un numero di versione
    const p = join(CARTELLA_TESTI, v.testo);
    if (!existsSync(p)) { fuori.push({ id: v.id, testo: v.testo, problema: 'il testo salvato non c’è' }); continue; }
    const nome = versioneNelNome(v.testo);
    const dentro = versioneDichiarata(readFileSync(p, 'utf8'));
    if (nome !== v.versione) fuori.push({ id: v.id, testo: v.testo, nome, dentro, problema: `il nome del file dice ${nome ?? 'niente'}, il registro ${v.versione}` });
    else if (dentro && dentro !== v.versione) fuori.push({ id: v.id, testo: v.testo, nome, dentro, problema: `il nome del file dice ${nome}, la prima pagina del documento ${dentro}` });
  }
  return fuori;
}

/**
 * Il testo di un manuale **in righe piatte**: senza i segni del Markdown (titoli `#`, grassetti `**`, escape `\`),
 * senza l'indice con i collegamenti ai segnalibri, senza spazi di contorno.
 *
 * Perché serve. I Doc di Davide si esportano in due forme — Markdown o testo semplice — e la forma cambia con chi
 * ha salvato il file, non con il manuale. Un lettore tarato su una delle due si rompe sull'altra senza dire niente:
 * il 10/11 `tests/specializzazioni-054.test.js` cercava una riga «8.10 Cataloghi…» che nel Markdown è
 * «## **8.10 Cataloghi…**». Chi legge la struttura di un manuale passa di qui, e la forma smette di contare.
 */
export const righeManuale = (id) => righeDiTesto(testoManuale(id));

/** Le stesse righe piatte, da un testo qualunque: serve a chi legge un'edizione precisa (lotto 191). */
export function righeDiTesto(testo) {
  return String(testo)
    .replace(/\r/g, '')
    .split('\n')
    .map((r) => r
      .replace(/^#+\s*/, '')
      .replace(/\*/g, '')
      .replace(/\\([^A-Za-z0-9\s])/g, '$1')
      .trimEnd())
    // le righe dell'indice del Doc esportato in Markdown: «[8.10 …](#bookmark=id.…)»
    .filter((r) => !/^\s*\[[^\]]*\]\(#bookmark=/.test(r));
}

/**
 * Le **celle** di un manuale, nell'ordine in cui si leggono: una per voce, senza i segni del Markdown.
 *
 * Perché serve. Una tabella dei Doc si esporta in due forme: Markdown, dove una riga è `| a | b | c |`, e testo
 * semplice, dove le stesse tre celle stanno su tre righe separate da tabulazioni. Un controllo scritto su una
 * delle due si rompe sull'altra senza che il manuale sia cambiato: il 10/11 `tests/tablet-tabelle.test.js` cercava
 * `| Attività pesante | Nessuno | …` in un manuale esportato in testo semplice. Qui le barre e le tabulazioni
 * diventano la stessa cosa — un confine fra celle — e la forma smette di contare.
 */
export const celleManuale = (id) => celleDiTesto(testoManuale(id));

/** Le stesse celle, da un testo qualunque: serve a chi legge un'edizione precisa (lotto 191). */
export function celleDiTesto(testo) {
  return String(testo)
    .replace(/\r/g, '')
    .replace(/\\([^A-Za-z0-9\s])/g, '$1')
    .replace(/\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/[|\t]/g, '\n')
    .split('\n')
    .map((c) => c.replace(/[ ]+/g, ' ').trim())
    .filter((c) => c && !/^[-: ]+$/.test(c) && !/^\[[^\]]*\]\(#bookmark=/.test(c));
}

/**
 * Vero se quelle celle compaiono **di fila** fra le celle del manuale: una riga di tabella, qualunque sia la forma
 * dell'esportazione. Il confronto è sul testo normalizzato dalla stessa `celleManuale`.
 */
export function rigaNelManuale(celle, valori) {
  const v = valori.map((x) => String(x).replace(/[|\t]/g, ' ').replace(/[ ]+/g, ' ').trim()).filter(Boolean);
  for (let i = 0; i + v.length <= celle.length; i++) {
    if (v.every((x, k) => celle[i + k] === x)) return true;
  }
  return false;
}

/**
 * Il testo di una **edizione precisa** di un manuale, anche superata: `testoEdizione('giocatore', '0.50')`.
 *
 * Serve a chi confronta i dati con il manuale da cui quei dati sono stati copiati. Ogni file di `data/` dichiara la
 * sua edizione (`versione_manuale`, principio 4 di CLAUDE.md) e oggi molte sono indietro rispetto alla corrente:
 * `dotazioni.json` dice Giocatore 0.45, `regole.json` 0.46, `incantesimi.json` Magia 1.3. Un confronto con la
 * versione corrente direbbe «non trovato» per una frase che il manuale di allora diceva benissimo, e nasconderebbe
 * la cosa vera da sapere: che quel dato è indietro. Qui si chiede l'edizione dichiarata, e la distanza fra quella e
 * la corrente resta scritta nel codice, dove si vede.
 */
export function testoEdizione(id, versione) {
  const v = voce(id);
  const nome = v.versione === versione ? v.testo : v.testo.replace(/-\d+(\.\d+)+/, `-${versione}`);
  const p = join(CARTELLA_TESTI, nome);
  if (!existsSync(p)) throw new Error(`del manuale «${id}» non c'è il testo dell'edizione ${versione}: ${nome}`);
  return readFileSync(p, 'utf8');
}
