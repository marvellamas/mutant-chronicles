// Dove sono i dati di Mutant su questo PC (26/10/2026, «Davide non trova i personaggi dopo ogni aggiornamento»).
//
// Fino a oggi i dati (personaggi, PX, tavolo, scontri, salvataggi…) stavano SEMPRE nella cartella dell'app da cui parte
// il server. Se un aggiornamento finiva in un'altra cartella (per esempio un 1_scarica_o_aggiorna_app.bat lanciato da
// un altro posto crea una «mutant» nuova accanto a sé), la copia nuova partiva con la cartella dei personaggi vuota, e
// alla fine dell'aggiornamento tools/riavvia.mjs spegneva il server della cartella vecchia e accendeva quello nuovo.
//
// Da oggi la cartella dei dati è un'impostazione di questo PC, nel profilo di Windows (%APPDATA%\Mutant\dati.json,
// accanto agli avvisi e al ruolo: tools/config-avvisi.mjs → cartellaProfilo), e nessun aggiornamento la tocca.
// Qualunque copia dell'app, nuova o vecchia, usa quella. Migrazione silenziosa: la prima volta che parte, una copia
// dell'app che ha già i suoi personaggi scrive sé stessa come cartella dei dati. Una copia vuota non lo fa mai.
//
// `cartella` è la cartella che CONTIENE personaggi\, px\, tavolo\, salvataggi\… (di solito la cartella «mutant»).
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { cartellaProfilo } from './config-avvisi.mjs';

/** Le cartelle e i file di dati che stanno nella cartella dei dati (gli stessi di tools/file-locali.json). */
export const CARTELLE_DATI = ['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'musica', 'galleria', 'px', 'salvataggi', 'autosave', 'backup-master'];
export const FILE_DATI = ['config-salvataggi.json'];

const NOME_FILE_PG = /_liv\d{1,2}_\d{4}-\d{2}-\d{2}\.json$/;

export const percorsoImpostazione = (opz = {}) => join(opz.profilo ?? cartellaProfilo(), 'dati.json');

/** Quanti personaggi (file) ha la cartella personaggi\ di una cartella di dati. */
export function quantiPersonaggi(cartella) {
  try { return readdirSync(join(cartella, 'personaggi')).filter((f) => NOME_FILE_PG.test(f)).length; } catch { return 0; }
}

/** L'impostazione salvata: { cartella, scelta, perche } o null. */
export function leggiImpostazione(opz = {}) {
  try {
    const o = JSON.parse(readFileSync(percorsoImpostazione(opz), 'utf8'));
    return typeof o?.cartella === 'string' && o.cartella.trim() ? o : null;
  } catch { return null; }
}

/** Scrive la cartella dei dati di questo PC (scrittura atomica). */
export function scriviImpostazione(cartella, { perche = '', adesso = new Date(), ...opz } = {}) {
  const p = percorsoImpostazione(opz);
  mkdirSync(dirname(p), { recursive: true });
  const o = { _nota: 'Dove sono i dati di Mutant (personaggi, PX, tavolo, salvataggi) su questo PC. Lo scrivono Mutant.bat e il server; nessun aggiornamento lo cambia.', cartella: resolve(cartella), scelta: adesso.toISOString(), perche };
  writeFileSync(`${p}.tmp`, `${JSON.stringify(o, null, 2)}\n`);
  renameSync(`${p}.tmp`, p);
  return o;
}

/**
 * La cartella dei dati per una copia dell'app che sta in `radiceApp`.
 * @returns {{ cartella, fonte: 'profilo'|'app', impostata: string|null, problema: string|null }}
 *   fonte «profilo»: l'impostazione di questo PC; «app»: la cartella dell'app (nessuna impostazione, o non valida).
 *   `problema`: l'impostazione c'è ma punta a una cartella che non esiste più (si usa l'app e lo si dice).
 */
export function cartellaDati(radiceApp, opz = {}) {
  const imp = leggiImpostazione(opz);
  if (imp) {
    if (existsSync(join(imp.cartella, 'personaggi'))) return { cartella: resolve(imp.cartella), fonte: 'profilo', impostata: imp.cartella, problema: null };
    return { cartella: resolve(radiceApp), fonte: 'app', impostata: imp.cartella, problema: `la cartella dei dati impostata su questo PC non c'è più: ${imp.cartella}` };
  }
  return { cartella: resolve(radiceApp), fonte: 'app', impostata: null, problema: null };
}

/**
 * Migrazione silenziosa (26/10): se questo PC non ha ancora la cartella dei dati e questa copia dell'app ha già dei
 * personaggi, la cartella dei dati diventa questa. Prima legge config-salvataggi.json: se mai indicasse un'altra
 * cartella dei personaggi (`cartella_personaggi` o `cartella_dati`), vale quella. Una copia vuota non scrive niente.
 * @returns l'impostazione scritta, o null
 */
export function migraSeServe(radiceApp, opz = {}) {
  if (leggiImpostazione(opz)) return null;
  let indicata = null;
  try {
    const c = JSON.parse(readFileSync(join(radiceApp, 'config-salvataggi.json'), 'utf8'));
    const x = c?.cartella_dati ?? (c?.cartella_personaggi ? dirname(resolve(radiceApp, c.cartella_personaggi)) : null);
    if (typeof x === 'string' && quantiPersonaggi(resolve(radiceApp, x)) > 0) indicata = resolve(radiceApp, x);
  } catch { /* nessuna configurazione: si guarda la cartella dell'app */ }
  if (indicata) return scriviImpostazione(indicata, { ...opz, perche: 'da config-salvataggi.json' });
  if (quantiPersonaggi(radiceApp) > 0) return scriviImpostazione(radiceApp, { ...opz, perche: 'la copia dell\'app che aveva i personaggi' });
  return null;
}

/** I percorsi delle cartelle di dati dentro la cartella dei dati: { personaggi, px, tavolo, … , config }. */
export function percorsiDati(cartella) {
  return { ...Object.fromEntries(CARTELLE_DATI.map((c) => [c, join(cartella, c)])), config: join(cartella, 'config-salvataggi.json') };
}

/** La data più recente fra i file personaggio di una cartella (per dire «aggiornata al …»). */
export function ultimaModifica(cartella) {
  try {
    return Math.max(0, ...readdirSync(join(cartella, 'personaggi')).filter((f) => NOME_FILE_PG.test(f)).map((f) => statSync(join(cartella, 'personaggi', f)).mtimeMs));
  } catch { return 0; }
}
