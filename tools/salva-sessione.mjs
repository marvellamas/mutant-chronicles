// Copia di fine sessione per il master (salva-sessione.bat; richiesta di Marcello del 06/10/2026).
// Crea salvataggi/sessione_AAAA-MM-GG_hhmm.zip con le cartelle dei dati di gioco del server (personaggi/, veicoli/,
// scontri/, nemici/, tavolo/, scene/ e mappe/ della mappa di battaglia). Poi, solo se configurato in
// config-salvataggi.json (non tracciato, modello in config-salvataggi.esempio.json):
//   - "copia_in": una cartella in cui copiare anche l'archivio (per esempio quella di Google Drive sul PC);
//   - "github": { "cartella", "ramo"? }: un clone di un repository GitHub PRIVATO separato, solo per i salvataggi
//     (non quello dell'app): l'archivio si copia lì, si fa commit e push. Senza git, senza clone o senza credenziali
//     si salta con un messaggio, senza errori.
// Non cancella e non sovrascrive mai: se il nome c'è già (due copie nello stesso minuto) si aggiunge «_2», «_3»…
// Lo zip è scritto qui, senza dipendenze (zlib di Node, deflate): si apre con Esplora file e con qualunque programma.
//   node tools/salva-sessione.mjs [--radice=<cartella dell'app>] [--config=<file>]
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync, constants } from 'node:fs';
import { join, relative, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, crc32 } from 'node:zlib';
import { spawnSync } from 'node:child_process';

export const CARTELLE = ['personaggi', 'veicoli', 'scontri', 'nemici', 'tavolo', 'scene', 'mappe'];
const RADICE = fileURLToPath(new URL('..', import.meta.url));

const due = (n) => String(n).padStart(2, '0');
/** sessione_AAAA-MM-GG_hhmm.zip */
export const nomeArchivio = (d) => `sessione_${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}.zip`;

/** Un nome libero nella cartella: mai sopra un file che c'è già. */
export function nomeLibero(cartella, nome) {
  if (!existsSync(join(cartella, nome))) return nome;
  const base = nome.replace(/\.zip$/, '');
  for (let k = 2; ; k++) if (!existsSync(join(cartella, `${base}_${k}.zip`))) return `${base}_${k}.zip`;
}

/** File di una cartella, ricorsivamente: [{ percorso nel zip, file }]. Cartella assente: nessun file. */
function fileDi(radice, cartella) {
  const dove = join(radice, cartella);
  if (!existsSync(dove)) return [];
  const out = [];
  const giro = (d) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      const s = statSync(p);
      if (s.isDirectory()) giro(p);
      else if (s.isFile() && !/\.tmp-\d+$/.test(n)) out.push({ nome: relative(radice, p).split(sep).join('/'), file: p, mtime: s.mtime });
    }
  };
  giro(dove);
  return out;
}

// data e ora DOS dei file nello zip
const dataDos = (d) => ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
const oraDos = (d) => (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);

/** Zip (deflate) di file [{ nome, dati: Buffer, mtime }]. Nomi in UTF-8 (bit 11). */
export function creaZip(voci) {
  const locali = [];
  const centrali = [];
  let posizione = 0;
  for (const v of voci) {
    const nome = Buffer.from(v.nome, 'utf8');
    const compressi = deflateRawSync(v.dati);
    const crc = crc32(v.dati) >>> 0;
    const testa = Buffer.alloc(30);
    testa.writeUInt32LE(0x04034b50, 0); testa.writeUInt16LE(20, 4); testa.writeUInt16LE(0x0800, 6); testa.writeUInt16LE(8, 8);
    testa.writeUInt16LE(oraDos(v.mtime), 10); testa.writeUInt16LE(dataDos(v.mtime), 12); testa.writeUInt32LE(crc, 14);
    testa.writeUInt32LE(compressi.length, 18); testa.writeUInt32LE(v.dati.length, 22); testa.writeUInt16LE(nome.length, 26); testa.writeUInt16LE(0, 28);
    locali.push(testa, nome, compressi);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(oraDos(v.mtime), 12); c.writeUInt16LE(dataDos(v.mtime), 14); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(compressi.length, 20); c.writeUInt32LE(v.dati.length, 24); c.writeUInt16LE(nome.length, 28);
    c.writeUInt32LE(posizione, 42);
    centrali.push(c, nome);
    posizione += testa.length + nome.length + compressi.length;
  }
  const centrale = Buffer.concat(centrali);
  const fine = Buffer.alloc(22);
  fine.writeUInt32LE(0x06054b50, 0); fine.writeUInt16LE(voci.length, 8); fine.writeUInt16LE(voci.length, 10);
  fine.writeUInt32LE(centrale.length, 12); fine.writeUInt32LE(posizione, 16);
  return Buffer.concat([...locali, centrale, fine]);
}

/** Configurazione facoltativa: {} se il file non c'è; errore leggibile se non è JSON. */
export function leggiConfig(percorso) {
  if (!existsSync(percorso)) return {};
  try { return JSON.parse(readFileSync(percorso, 'utf8')); } catch (e) { throw new Error(`${basename(percorso)} non è un JSON valido (${e.message}): correggilo o cancellalo.`); }
}

const git = (cartella, args) => spawnSync('git', args, { cwd: cartella, encoding: 'utf8', windowsHide: true, timeout: 120000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });

/** Copia nel clone del repository privato, commit e push. { fatto, messaggio }: mai un'eccezione. */
export function pushGithub(archivio, G) {
  if (!G?.cartella) return { fatto: false, messaggio: 'Copia su GitHub non configurata: saltata.' };
  if (!existsSync(join(G.cartella, '.git'))) return { fatto: false, messaggio: `GitHub: ${G.cartella} non è un clone git del repository dei salvataggi: saltata.` };
  if (git(G.cartella, ['--version']).status !== 0) return { fatto: false, messaggio: 'GitHub: git non è installato su questo PC: saltata.' };
  // mai il repository dell'app: il clone deve avere un remoto diverso da quello di Mutant
  const remotoApp = git(RADICE, ['remote', 'get-url', 'origin']).stdout?.trim();
  const remoto = git(G.cartella, ['remote', 'get-url', 'origin']).stdout?.trim();
  if (remotoApp && remoto === remotoApp) return { fatto: false, messaggio: 'GitHub: la cartella configurata è un clone dell’app, non del repository dei salvataggi: saltata.' };
  const nome = nomeLibero(G.cartella, basename(archivio));
  copyFileSync(archivio, join(G.cartella, nome), constants.COPYFILE_EXCL);
  const passi = [['add', '--', nome], ['commit', '-m', `Salvataggio ${nome}`], ['push', ...(G.ramo ? ['origin', `HEAD:${G.ramo}`] : [])]];
  for (const p of passi) {
    const r = git(G.cartella, p);
    if (r.status !== 0) {
      const motivo = (r.stderr || r.stdout || r.error?.message || '').trim().split('\n').slice(-2).join(' ');
      return { fatto: false, messaggio: `GitHub: «git ${p[0]}» non riuscito (${motivo || 'senza messaggio'}). L'archivio resta nella cartella dei salvataggi e nel clone; si riprova alla prossima copia con un push a mano.` };
    }
  }
  return { fatto: true, messaggio: `GitHub: archivio ${nome} inviato al repository dei salvataggi.` };
}

/**
 * La copia di fine sessione. { archivio, file, copie: [], github: { fatto, messaggio }, messaggi: [] }.
 * @param radice cartella dell'app (dove stanno personaggi/ e le altre); salvataggi/ dentro, se non indicata
 */
export function salvaSessione({ radice = RADICE, salvataggi = join(radice, 'salvataggi'), config = {}, adesso = new Date() } = {}) {
  const messaggi = [];
  const voci = CARTELLE.flatMap((c) => fileDi(radice, c)).map((f) => ({ nome: f.nome, dati: readFileSync(f.file), mtime: f.mtime }));
  mkdirSync(salvataggi, { recursive: true });
  const nome = nomeLibero(salvataggi, nomeArchivio(adesso));
  const archivio = join(salvataggi, nome);
  writeFileSync(archivio, creaZip(voci), { flag: 'wx' }); // «wx»: mai sopra un file esistente
  const perCartella = CARTELLE.map((c) => `${c}/ ${voci.filter((v) => v.nome.startsWith(`${c}/`)).length}`).join(', ');
  messaggi.push(`Archivio creato: ${archivio} (${voci.length} file: ${perCartella}).`);
  const copie = [];
  if (config.copia_in) {
    try {
      if (!existsSync(config.copia_in)) throw new Error(`la cartella ${config.copia_in} non esiste`);
      const n = nomeLibero(config.copia_in, nome);
      copyFileSync(archivio, join(config.copia_in, n), constants.COPYFILE_EXCL);
      copie.push(join(config.copia_in, n));
      messaggi.push(`Copia anche in ${join(config.copia_in, n)}.`);
    } catch (e) {
      messaggi.push(`Copia nella cartella aggiuntiva non riuscita: ${e.message}. L'archivio è comunque in ${salvataggi}.`);
    }
  } else messaggi.push('Cartella aggiuntiva (per esempio Google Drive) non configurata: saltata.');
  let github;
  try { github = pushGithub(archivio, config.github); } catch (e) { github = { fatto: false, messaggio: `GitHub: ${e.message}. Saltata.` }; }
  messaggi.push(github.messaggio);
  return { archivio, file: voci.length, copie, github, messaggi };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
  const radice = arg('radice') ?? RADICE;
  try {
    const config = leggiConfig(arg('config') ?? join(radice, 'config-salvataggi.json'));
    const r = salvaSessione({ radice, config });
    for (const m of r.messaggi) console.log(` ${m}`);
  } catch (e) {
    console.error(` Copia di fine sessione non riuscita: ${e.message}`);
    process.exitCode = 1;
  }
}
