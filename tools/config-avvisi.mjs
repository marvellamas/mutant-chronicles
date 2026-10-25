// La configurazione degli avvisi ntfy sta FUORI dalla cartella dell'app (25/10/2026, segnalazione di Davide del
// 24/10: «ogni volta che aggiorno devo reimpostare gli avvisi»).
//
// Fino al 24/10 stava in avvisi/avvisi.json, dentro la cartella che un aggiornamento (git pull, zip, cartella
// rimpiazzata a mano, un clone nuovo) può riscrivere, svuotare o sostituire. Adesso la fonte è il profilo
// dell'utente — %APPDATA%\Mutant\avvisi.json su Windows, ~/.config/mutant/avvisi.json altrove — che nessun
// aggiornamento dell'app tocca mai, perché non è nella cartella dell'app.
//
// Compatibilità, in silenzio:
//   - se il file nel profilo non c'è ma c'è il vecchio avvisi/avvisi.json, lo si copia nel profilo alla prima
//     lettura (la console, il server, aggiorna.bat): la configurazione che c'è già non va persa e non va rifatta;
//   - ogni salvataggio scrive il profilo e, per chi ha strumenti vecchi, anche il vecchio file (che non è più la
//     fonte: se i due differiscono vale quello del profilo);
//   - si può spostare il profilo con la variabile MUTANT_CONFIG_DIR (le prove la usano per non toccare quello vero).
// Funzioni pure salvo la lettura e la scrittura dei file.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const FILE_LEGACY = join('avvisi', 'avvisi.json');
export const ESEMPIO = join('avvisi', 'avvisi.esempio.json');

const leggi = (f) => { try { const v = JSON.parse(readFileSync(f, 'utf8')); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } };

/** La cartella del profilo dove sta la configurazione (mai dentro la cartella dell'app). */
export function cartellaProfilo({ env = process.env, casa = homedir(), piattaforma = process.platform } = {}) {
  if (env.MUTANT_CONFIG_DIR) return env.MUTANT_CONFIG_DIR;
  if (piattaforma === 'win32' && env.APPDATA) return join(env.APPDATA, 'Mutant');
  return join(env.XDG_CONFIG_HOME || join(casa, '.config'), 'mutant');
}

/** Il file della configurazione degli avvisi nel profilo. */
export const percorsoProfilo = (opz = {}) => join(cartellaProfilo(opz), 'avvisi.json');

/**
 * La configurazione degli avvisi di questo PC: { conf, origine: 'profilo' | 'migrata' | 'vecchio-file' } oppure null.
 * Se c'è solo il vecchio file lo copia nel profilo (migrazione silenziosa); se la copia non riesce la
 * configurazione si legge comunque dal vecchio file.
 */
export function leggiConfigAvvisi(radice, opz = {}) {
  const nelProfilo = leggi(percorsoProfilo(opz));
  if (nelProfilo) return { conf: nelProfilo, origine: 'profilo' };
  const vecchio = leggi(join(radice, FILE_LEGACY));
  if (!vecchio) return null;
  try {
    const p = percorsoProfilo(opz);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(vecchio, null, 2)}\n`, { flag: 'wx' });
    return { conf: vecchio, origine: 'migrata' };
  } catch {
    return { conf: vecchio, origine: 'vecchio-file' };
  }
}

/** Scrive la configurazione nel profilo e, per gli strumenti vecchi, anche nel vecchio file (best effort). */
export function scriviConfigAvvisi(radice, valore, opz = {}) {
  const p = percorsoProfilo(opz);
  mkdirSync(dirname(p), { recursive: true });
  const testo = `${JSON.stringify(valore, null, 2)}\n`;
  writeFileSync(p, testo);
  try {
    mkdirSync(join(radice, 'avvisi'), { recursive: true });
    writeFileSync(join(radice, FILE_LEGACY), testo);
  } catch { /* il profilo è la fonte: il vecchio file è solo una copia */ }
  return p;
}

/**
 * Per aggiorna.bat: dopo l'aggiornamento la configurazione c'è. Dal profilo se c'è; dal vecchio file (migrandolo);
 * dall'esempio del gruppo, la prima volta in assoluto. Mai sovrascrive niente.
 * @returns 'profilo' | 'migrata' | 'creata' | 'nessuna'
 */
export function assicuraConfigAvvisi(radice, opz = {}) {
  const r = leggiConfigAvvisi(radice, opz);
  if (r) return r.origine === 'profilo' ? 'profilo' : 'migrata';
  const esempio = leggi(join(radice, ESEMPIO));
  if (!esempio) return 'nessuna';
  scriviConfigAvvisi(radice, esempio, opz);
  return 'creata';
}

// riga di comando: «node tools/config-avvisi.mjs assicura» (aggiorna.bat), «… percorso» (dove sta il file)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
  const comando = process.argv[2];
  if (comando === 'assicura') {
    const esito = assicuraConfigAvvisi(radice);
    if (esito === 'migrata') console.log(`  Avvisi: configurazione messa al sicuro fuori dalla cartella dell'app (${percorsoProfilo()}).`);
  } else if (comando === 'percorso') {
    console.log(percorsoProfilo());
    console.log(existsSync(percorsoProfilo()) ? '(esiste)' : '(non esiste ancora)');
  } else {
    console.error('Comandi: assicura, percorso');
    process.exit(2);
  }
  process.exit(0);
}
