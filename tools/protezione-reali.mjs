// La cartella dei personaggi veri non si tocca per sbaglio (lotto 145).
// Nel lotto 144 una prova nel browser ha aperto la cartella vera: la regola «PG reali: solo lettura» era scritta, non
// era un meccanismo. Qui i tre meccanismi:
//   1. tools/argomenti.mjs: un flag sconosciuto ferma il programma;
//   2. `controllaAvvioDiProva`: un server avviato per una prova (altra porta o cartelle indicate) rifiuta di partire
//      se una delle sue cartelle è quella vera;
//   3. `installaGuardiaScrittura`: nessuna scrittura (scrivere, creare, spostare, cancellare) dentro le cartelle vere,
//      con un errore chiaro al primo tentativo; la installano il server di prova e i test (tests/profilo-di-prova.mjs).
//
// «La cartella vera» è: le cartelle di dati dell'app stessa (personaggi/, tavolo/, scontri/… accanto a server.mjs, più
// PersonaggiBackup/) e la cartella dei dati scritta nel profilo di Windows di questo PC (%APPDATA%\Mutant\dati.json,
// tools/dati-pc.mjs). Il profilo conta solo se è quello vero: con MUTANT_CONFIG_DIR (profilo di prova, come nei test)
// la sua cartella dei dati è una prova.
import fs, { realpathSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join, resolve, relative, isAbsolute, dirname, basename } from 'node:path';
import { cartellaDati, CARTELLE_DATI, FILE_DATI } from './dati-pc.mjs';

const PORTA_VERA = 3000;
// il percorso vero (nomi lunghi, collegamenti sciolti) anche per ciò che non esiste ancora: si risolve il tratto che c'è
const norma = (p) => {
  let r = resolve(p);
  const coda = [];
  while (true) {
    try { r = join(realpathSync.native(r), ...coda); break; } catch { /* non c'è: si sale */ }
    const su = dirname(r);
    if (su === r) { r = join(r, ...coda); break; }
    coda.unshift(basename(r));
    r = su;
  }
  return r.toLowerCase();
};
const dentro = (figlia, madre) => { const r = relative(norma(madre), norma(figlia)); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };

/** Le cartelle vere: [{ percorso, nome, perche }]. */
export function cartelleReali(radice, { profiloVero = !process.env.MUTANT_CONFIG_DIR, dati = null } = {}) {
  const out = [];
  const aggiungi = (base, perche) => { for (const n of [...CARTELLE_DATI, ...FILE_DATI, 'PersonaggiBackup']) out.push({ percorso: join(base, n), nome: n, perche }); };
  aggiungi(radice, 'la cartella dei dati dell’app');
  if (profiloVero) {
    let d = dati;
    try { d ??= cartellaDati(radice); } catch { d = null; }
    if (d?.cartella && norma(d.cartella) !== norma(radice)) aggiungi(d.cartella, 'la cartella dei dati scritta nel profilo di Windows di questo PC');
  }
  return out;
}

/** La cartella vera che contiene (o è) questo percorso, o null. */
export const cartellaRealeDi = (percorso, reali) => reali.find((r) => dentro(percorso, r.percorso)) ?? null;

/**
 * Un server è «di prova» se non è quello di sempre: un'altra porta, o cartelle indicate a mano. Il server vero sta
 * sulla 3000 con le sue cartelle. Con `--dati-reali` (e nessuna cartella indicata) si può accendere il server vero
 * su un'altra porta, apposta.
 */
export function eAvvioDiProva({ porta, argv = [] }) {
  const cartelleIndicate = argv.some((a) => /^--(cartella|tavolo|scontri|nemici|veicoli|scene|mappe|musica|galleria|px|salvataggi|autosave)=/.test(a));
  return cartelleIndicate || porta !== PORTA_VERA;
}

/**
 * Rifiuta l'avvio di prova se una cartella è quella vera.
 * @param cartelle { personaggi, tavolo, scontri, … } i percorsi con cui il server sta per partire
 * @returns {{ ok: boolean, prova: boolean, errori: string[] }}
 */
export function controllaAvvioDiProva({ porta, argv = [], cartelle, radice }, opz = {}) {
  const prova = eAvvioDiProva({ porta, argv });
  if (!prova) return { ok: true, prova, errori: [] };
  const cartelleIndicate = argv.some((a) => /^--(cartella|tavolo|scontri|nemici|veicoli|scene|mappe|musica|galleria|px|salvataggi|autosave)=/.test(a));
  if (argv.includes('--dati-reali') && !cartelleIndicate) return { ok: true, prova, errori: [] };
  const reali = cartelleReali(radice, opz);
  const errori = [];
  for (const [chi, percorso] of Object.entries(cartelle)) {
    const r = percorso ? cartellaRealeDi(percorso, reali) : null;
    if (r) errori.push(`«${chi}» è ${percorso}, che è ${r.perche} (${r.percorso}).`);
  }
  if (errori.length) {
    errori.push(
      'Questo avvio è una prova (porta diversa dalla 3000 o cartelle indicate) e non può aprire le cartelle vere.',
      'Indica cartelle tue: --cartella=<dir> --tavolo=<dir> --scontri=<dir> --nemici=<dir> --veicoli=<dir> --scene=<dir> --mappe=<dir> --musica=<dir> --galleria=<dir> --px=<dir>.',
      'Se vuoi proprio accendere il server vero su un’altra porta: --dati-reali (senza indicare cartelle).',
    );
  }
  return { ok: !errori.length, prova, errori };
}

// --- 3. la guardia sulle scritture -------------------------------------------------------------------------

/** Le funzioni di fs che scrivono, e quali argomenti sono percorsi toccati. */
const SCRITTURE = {
  writeFile: [0], appendFile: [0], mkdir: [0], rename: [0, 1], rm: [0], rmdir: [0], unlink: [0], truncate: [0],
  copyFile: [1], cp: [1], symlink: [1], link: [1], utimes: [0], chmod: [0], chown: [0], createWriteStream: [0], mkdtemp: [],
};

export class ScritturaRifiutata extends Error {
  constructor(percorso, cartella) {
    super(`Scrittura rifiutata: ${percorso} sta nella cartella vera (${cartella.percorso}: ${cartella.perche}). Questa è una prova e non può scrivere lì: usa cartelle tue (--cartella=<dir> …).`);
    this.name = 'ScritturaRifiutata';
    this.code = 'MUTANT_CARTELLA_VERA';
  }
}


/**
 * Installa la guardia: da qui ogni scrittura dentro le cartelle vere lancia ScritturaRifiutata. Vale per fs, fs/promises e
 * le forme con callback. Restituisce una funzione che la spegne (le altre guardie restano).
 */
export function installaGuardiaScrittura(reali) {
  // più guardie possono convivere (i test ne installano una per tutti, una prova ne aggiunge un'altra): togliere
  // la propria la spegne e basta
  let attiva = true;
  const controlla = (p) => {
    if (typeof p !== 'string' && !(p instanceof URL) && !Buffer.isBuffer(p)) return;
    const testo = p instanceof URL ? (p.protocol === 'file:' ? decodeURIComponent(p.pathname.replace(/^\/([A-Za-z]:)/, '$1')) : null) : String(p);
    if (!testo) return;
    const r = cartellaRealeDi(testo, reali);
    if (r) throw new ScritturaRifiutata(testo, r);
  };
  const avvolgi = (oggetto, nome, indici, asincrona) => {
    const f = oggetto[nome];
    if (typeof f !== 'function') return;
    oggetto[nome] = function (...a) {
      try { if (attiva) for (const i of indici) controlla(a[i]); } catch (e) {
        if (asincrona === 'promessa') return Promise.reject(e);
        if (asincrona === 'callback') { const cb = a.at(-1); if (typeof cb === 'function') { process.nextTick(cb, e); return undefined; } }
        throw e;
      }
      return f.apply(this, a);
    };
  };
  for (const [nome, indici] of Object.entries(SCRITTURE)) {
    if (!indici.length) continue;
    avvolgi(fs, `${nome}Sync`, indici, null);
    avvolgi(fs, nome, indici, nome === 'createWriteStream' ? null : 'callback');
    if (nome !== 'createWriteStream') avvolgi(fs.promises, nome, indici, 'promessa');
  }
  syncBuiltinESMExports();
  return () => { attiva = false; };
}
