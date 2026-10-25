// Il ruolo di questa installazione di Mutant (25/10/2026, «un ingresso solo», parte C): «PC del Direttore (originale)»
// oppure «copia di prova». Si sceglie una volta, da Mutant.bat (Impostazioni, o la domanda all'avvio), e si salva nel
// PROFILO dell'utente di Windows, come la configurazione degli avvisi (tools/config-avvisi.mjs): nessun aggiornamento la
// tocca, né con Git né dallo zip.
//
// Un profilo può avere più installazioni (sul fisso di Marcello il repository e una copia scaricata): il ruolo si salva
// per cartella dell'app. Il nome del PC si legge dal sistema (os.hostname()), mai scritto a mano.
//
// Senza ruolo scelto l'app si comporta come prima: decide il vecchio file COPIA-DI-LAVORO.txt, se c'è
// (src/copia-di-lavoro.js → statoDaRuolo).
import { readFileSync, writeFileSync, mkdirSync, renameSync, realpathSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { hostname } from 'node:os';
import { cartellaProfilo } from './config-avvisi.mjs';

export const RUOLI = {
  originale: 'PC del Direttore (originale)',
  prova: 'copia di prova',
};

export const percorsoRuoli = (opz = {}) => join(cartellaProfilo(opz), 'installazioni.json');
/** La chiave di un'installazione: la sua cartella, senza differenze di maiuscole (Windows) né barre finali. */
// il percorso reale: la stessa cartella scritta col nome corto (BEASTM~1) o lungo dà la stessa chiave
function percorsoReale(radice) {
  try { return realpathSync.native(resolve(radice)); } catch { return resolve(radice); }
}
export const chiaveInstallazione = (radice) => percorsoReale(radice).replace(/[\\/]+$/, '').toLowerCase();

function leggiTutto(opz) {
  try {
    const o = JSON.parse(readFileSync(percorsoRuoli(opz), 'utf8'));
    return o && typeof o === 'object' && o.installazioni && typeof o.installazioni === 'object' ? o : { installazioni: {} };
  } catch { return { installazioni: {} }; }
}

/**
 * Il ruolo di questa installazione: { ruolo: 'originale' | 'prova' | null, scelto (ISO) | null, nomePc }.
 * @param opz { env, casa, piattaforma } come cartellaProfilo (per le prove: env.MUTANT_CONFIG_DIR)
 */
export function leggiRuolo(radice, opz = {}) {
  const x = leggiTutto(opz).installazioni[chiaveInstallazione(radice)];
  const ruolo = x && Object.hasOwn(RUOLI, x.ruolo) ? x.ruolo : null;
  return { ruolo, scelto: ruolo ? x.scelto ?? null : null, nomePc: opz.nomePc ?? hostname() };
}

/** Salva il ruolo (scrittura atomica: un file a metà non deve mai far perdere quello delle altre installazioni). */
export function scriviRuolo(radice, ruolo, opz = {}) {
  if (!Object.hasOwn(RUOLI, ruolo)) throw new Error(`ruolo sconosciuto: ${ruolo}`);
  const tutto = leggiTutto(opz);
  tutto.installazioni[chiaveInstallazione(radice)] = { ruolo, scelto: (opz.adesso ?? new Date()).toISOString(), cartella: resolve(radice) };
  const p = percorsoRuoli(opz);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(`${p}.tmp`, `${JSON.stringify(tutto, null, 2)}\n`);
  renameSync(`${p}.tmp`, p);
  return leggiRuolo(radice, opz);
}

/** «PC del Direttore (originale) · scelto il 26/10» o «non ancora scelto». */
export function testoRuolo({ ruolo, scelto }) {
  if (!ruolo) return 'non ancora scelto';
  const d = scelto ? new Date(scelto) : null;
  return `${RUOLI[ruolo]}${d ? ` · scelto il ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : ''}`;
}
