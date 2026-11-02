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
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { cartellaDati, CARTELLE_DATI, FILE_DATI } from './dati-pc.mjs';

const PORTA_VERA = 3000;
// la scrittura vera, presa prima di ogni guardia: serve solo per il segno delle cartelle di prova
const scriviOriginale = fs.writeFileSync;
const creaCartellaOriginale = fs.mkdirSync;
const SEGNA = Symbol.for('mutant.segna-cartelle-di-prova');
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
/** `figlia` è `madre` o sta sotto (percorsi veri, senza badare alle maiuscole). */
export const dentroCartella = dentro;

// --- le cartelle con personaggi, ovunque stiano (lotto 161, 02/11/2026) ----------------------------------------------
// Le cartelle vere per nome (sopra) non bastano: i file di Davide arrivano sul Desktop o nelle Scaricate, con un nome
// qualunque (`Desktop\Zip_davide`). In una prova una cartella è protetta se contiene personaggi, riconosciuti dal
// CONTENUTO (`"formato": "mutant-personaggio"`), non dal nome: o file di personaggi direttamente, o una sottocartella
// «personaggi» con file di personaggi (la cartella dei dati intera: px\, tavolo\… compresi).
// L'unica eccezione sono le cartelle nate dentro una prova: `mkdtemp` in una prova annota la cartella nuova (vuota) nel
// registro delle cartelle di prova (%TEMP%\mutant-cartelle-di-prova\, un file per cartella). Dentro la cartella non si
// scrive niente: i test che contano i file o la puliscono non vedono differenze. Vale solo nella cartella temporanea
// del sistema; una prova non può scrivere nel registro (la guardia lo rifiuta), quindi non può annotare a mano una
// cartella che ha già personaggi. A mano, fuori da una prova: `node tools/cartella-di-prova.mjs <cartella nuova>`.
// Fuori da una prova (il server vero, gli strumenti del menu) niente di questo è attivo.
// la cartella temporanea della prova: quella del processo che ha acceso la guardia (MUTANT_TEMP_PROVA, ereditata dai
// processi figli anche se un test dà loro un'altra TEMP, come tests/dati-pc.test.js per il lotto 138), o quella di sistema
export const tempProve = () => process.env.MUTANT_TEMP_PROVA || tmpdir();
export const registroProve = (temp = tempProve()) => join(temp, 'mutant-cartelle-di-prova');
const chiaveProva = (d) => createHash('sha1').update(norma(d)).digest('hex');

/** Annota `dir` fra le cartelle di prova (scrittura vera: la usano mkdtemp in una prova e lo strumento a mano). */
export function registraCartellaDiProva(dir, { temp = tempProve() } = {}) {
  if (!dentro(dir, temp) || norma(dir) === norma(temp)) throw new Error(`${dir} non è dentro la cartella temporanea del sistema (${temp}): una cartella di prova sta lì`);
  creaCartellaOriginale(registroProve(temp), { recursive: true });
  scriviOriginale(join(registroProve(temp), chiaveProva(dir)), resolve(dir));
}

/** Il registro non cresce senza fine: oltre 2000 voci si tolgono quelle delle cartelle che non ci sono più. */
function potaRegistro(temp = tempProve()) {
  let voci;
  try { voci = fs.readdirSync(registroProve(temp)); } catch { return; }
  if (voci.length <= 2000) return;
  for (const v of voci) {
    try { const p = fs.readFileSync(join(registroProve(temp), v), 'utf8'); if (!fs.existsSync(p)) fs.unlinkSync(join(registroProve(temp), v)); } catch { /* resta */ }
  }
}
const RE_PERSONAGGIO = /"formato"\s*:\s*"mutant-personaggio"/;
const MAX_FILE_GUARDATI = 60;

/** Nella cartella `dir` c'è almeno un file .json che è un personaggio Mutant? (legge l'inizio di ogni file) */
export function haPersonaggiDentro(dir) {
  let nomi;
  try { nomi = fs.readdirSync(dir).filter((n) => /\.json$/i.test(n)); } catch { return false; }
  for (const n of nomi.slice(0, MAX_FILE_GUARDATI)) {
    let fd = null;
    try {
      fd = fs.openSync(join(dir, n), 'r');
      const buf = Buffer.alloc(4096);
      const letti = fs.readSync(fd, buf, 0, buf.length, 0);
      if (RE_PERSONAGGIO.test(buf.subarray(0, letti).toString('utf8'))) return true;
    } catch { /* illeggibile o cartella: si va avanti */ } finally { if (fd !== null) try { fs.closeSync(fd); } catch { /* niente */ } }
  }
  return false;
}

/** `dir` è una cartella con personaggi: file di personaggi dentro, o una sottocartella «personaggi» che li ha. */
export function eCartellaConPersonaggi(dir) {
  if (haPersonaggiDentro(dir)) return true;
  let voci;
  try { voci = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  const sotto = voci.find((v) => v.isDirectory() && v.name.trim().toLowerCase() === 'personaggi');
  return !!sotto && haPersonaggiDentro(join(dir, sotto.name));
}

const catena = (percorso) => {
  const out = [];
  let d = resolve(String(percorso));
  while (true) { out.push(d); const su = dirname(d); if (su === d) break; d = su; }
  return out;
};

/** Il percorso sta in una cartella nata dentro una prova (annotata nel registro, dentro %TEMP%)? */
export function inCartellaDiProva(percorso, { temp = tempProve() } = {}) {
  for (const d of catena(percorso)) {
    if (!dentro(d, temp) || norma(d) === norma(temp)) return false;
    if (fs.existsSync(join(registroProve(temp), chiaveProva(d)))) return true;
  }
  return false;
}

/**
 * La cartella con personaggi che contiene (o è) `percorso`, o null: la prima, salendo, riconosciuta dal contenuto.
 * null anche quando il percorso sta in una cartella nata dentro una prova (inCartellaDiProva).
 */
export function cartellaConPersonaggiDi(percorso, opz = {}) {
  if (inCartellaDiProva(percorso, opz)) return null;
  for (const d of catena(percorso)) if (eCartellaConPersonaggi(d)) return d;
  return null;
}

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
/** Le funzioni che tolgono soltanto (il segno delle cartelle di prova si può togliere, non creare). */
const TOGLIE = new Set(['rm', 'rmdir', 'unlink']);
const SCRITTURE = {
  writeFile: [0], appendFile: [0], mkdir: [0], rename: [0, 1], rm: [0], rmdir: [0], unlink: [0], truncate: [0],
  copyFile: [1], cp: [1], symlink: [1], link: [1], utimes: [0], chmod: [0], chown: [0], createWriteStream: [0], mkdtemp: [0],
};

export class ScritturaRifiutata extends Error {
  constructor(percorso, cartella) {
    super(`Scrittura rifiutata: ${percorso} sta nella cartella vera (${cartella.percorso}: ${cartella.perche}). Questa è una prova e non può scrivere lì: usa cartelle tue (--cartella=<dir> …).`);
    this.name = 'ScritturaRifiutata';
    this.code = 'MUTANT_CARTELLA_VERA';
  }
}

/** Lotto 161: la scrittura di una prova in una cartella con personaggi (riconosciuta dal contenuto), ovunque stia. */
export class ScritturaRifiutataPersonaggi extends Error {
  constructor(percorso, cartella) {
    super(`Scrittura rifiutata: ${percorso} sta in una cartella con personaggi (${cartella}: ci sono file di personaggi Mutant, riconosciuti dal contenuto). Questa è una prova e non può scrivere dove ci sono personaggi che non ha creato lei: lavora su una cartella tua (mkdtemp), o leggi soltanto.`);
    this.name = 'ScritturaRifiutata';
    this.code = 'MUTANT_CARTELLA_VERA';
  }
}

/** Lotto 161: il registro delle cartelle di prova lo scrive solo mkdtemp: scriverci a mano non è permesso a una prova. */
export class SegnoProvaRifiutato extends Error {
  constructor(percorso) {
    super(`Scrittura rifiutata: ${percorso} è nel registro delle cartelle di prova; lo scrive solo mkdtemp per una cartella nuova (o, fuori da una prova, tools/cartella-di-prova.mjs).`);
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
  const controlla = (p, crea = true, nome = '') => {
    if (typeof p !== 'string' && !(p instanceof URL) && !Buffer.isBuffer(p)) return;
    const testo = p instanceof URL ? (p.protocol === 'file:' ? decodeURIComponent(p.pathname.replace(/^\/([A-Za-z]:)/, '$1')) : null) : String(p);
    if (!testo) return;
    const r = cartellaRealeDi(testo, reali);
    if (r) throw new ScritturaRifiutata(testo, r);
    // lotto 161: ovunque stia, una cartella con personaggi che la prova non ha creato non si tocca
    if (crea && dentro(testo, registroProve())) throw new SegnoProvaRifiutato(testo); // togliere una voce si può: è solo più severo
    // mkdir di una cartella che c'è già non cambia niente sul disco (il server lo fa prima di ogni lettura): è una lettura
    if (/^mkdir(Sync)?$/.test(nome)) { try { if (fs.statSync(testo).isDirectory()) return; } catch { /* non c'è: è una scrittura */ } }
    const c = cartellaConPersonaggiDi(testo);
    if (c) throw new ScritturaRifiutataPersonaggi(testo, c);
  };
  const avvolgi = (oggetto, nome, indici, asincrona) => {
    const f = oggetto[nome];
    if (typeof f !== 'function') return;
    oggetto[nome] = function (...a) {
      try { if (attiva) for (const i of indici) controlla(a[i], !TOGLIE.has(nome.replace(/Sync$/, '')) && !(nome.startsWith('rename') && i === 0), nome); } catch (e) {
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
  // lotto 161: le cartelle che una prova crea con mkdtemp nascono annotate nel registro delle cartelle di prova (sono
  // sue: ci può mettere personaggi finti e riscriverli). Una guardia sola le annota, anche se ne sono installate più d'una.
  if (!fs.mkdtempSync[SEGNA]) {
    potaRegistro();
    const scriviSegno = (dir) => { try { registraCartellaDiProva(dir); } catch { /* non annotata: resta protetta come le altre */ } };
    const sync = fs.mkdtempSync;
    fs.mkdtempSync = function (...a) { const d = sync.apply(this, a); scriviSegno(typeof d === 'string' ? d : String(d)); return d; };
    fs.mkdtempSync[SEGNA] = true;
    const prom = fs.promises.mkdtemp;
    fs.promises.mkdtemp = async function (...a) { const d = await prom.apply(this, a); scriviSegno(String(d)); return d; };
    const cb = fs.mkdtemp;
    fs.mkdtemp = function (...a) {
      const f = a.at(-1);
      if (typeof f !== 'function') return cb.apply(this, a);
      return cb.apply(this, [...a.slice(0, -1), (err, d) => { if (!err) scriviSegno(String(d)); f(err, d); }]);
    };
  }
  syncBuiltinESMExports();
  return () => { attiva = false; };
}
