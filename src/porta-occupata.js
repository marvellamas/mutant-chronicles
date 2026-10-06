// Avvio del server di Mutant con la porta già occupata (richiesta di Marcello del 06/10/2026: chiusa la finestra di
// avvia-server.bat, un vecchio processo Node era rimasto in ascolto sulla 3000 e il nuovo avvio si fermava).
// Chi c'è sulla porta: un Mutant (lo dice la sua risposta a /api/ping), qualcos'altro, o nessuno. Un Mutant si può
// fermare: dal pid che il ping dichiara o, per i server di prima che non lo dichiarano, dal pid che netstat (Windows)
// o lsof (altri sistemi) dà per quella porta in ascolto. Solo per il server (Node): niente DOM.
import { execFile } from 'node:child_process';

/**
 * Chi occupa la porta: { tipo: 'mutant', versione, avviato, pid } (versione, avviato e pid null se il server è di
 * prima e non li dice), { tipo: 'altro', descrizione } oppure { tipo: 'nessuno' }.
 */
export async function chiOccupa(porta, { host = '127.0.0.1', attesaMs = 2000 } = {}) {
  let r;
  try {
    r = await fetch(`http://${host}:${porta}/api/ping`, { signal: AbortSignal.timeout(attesaMs) });
  } catch (e) {
    const codice = e?.cause?.code ?? e?.code;
    if (codice === 'ECONNREFUSED') return { tipo: 'nessuno' };
    return { tipo: 'altro', descrizione: `un programma che non risponde come Mutant (${codice ?? e.message})` };
  }
  let corpo = null;
  try { corpo = await r.json(); } catch { /* non JSON */ }
  if (corpo?.app === 'mutant') return { tipo: 'mutant', versione: corpo.versione ?? null, avviato: corpo.avviato ?? null, pid: Number.isInteger(corpo.pid) ? corpo.pid : null };
  return { tipo: 'altro', descrizione: `un altro programma (risponde «${r.status} ${r.statusText}» e non è Mutant)` };
}

/** «hh:mm» di un'ora ISO, oppure null. */
const orario = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : null;
};

/** La domanda per un Mutant già acceso: «C'è già un Mutant acceso (versione …, avviato alle …). Lo fermo e riparto? [S/N] ». */
export function testoDomanda(info) {
  const dettagli = [info.versione ? `versione ${info.versione}` : 'versione di prima, non dichiarata', orario(info.avviato) ? `avviato alle ${orario(info.avviato)}` : null].filter(Boolean).join(', ');
  return `C'è già un Mutant acceso (${dettagli}). Lo fermo e riparto? [S/N] `;
}

/** Risposta sì? «S», «s», «si», «sì», «y». */
export const risposteSi = (testo) => /^\s*(s|si|sì|y|yes)\s*$/i.test(String(testo ?? ''));

/**
 * Pid del processo in ascolto sulla porta dal testo di `netstat -ano -p tcp` (Windows):
 *   TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       3432
 * Anche con l'indirizzo IPv6 ([::]:3000). null se non c'è.
 */
export function pidDaNetstat(testo, porta) {
  for (const riga of String(testo).split(/\r?\n/)) {
    const c = riga.trim().split(/\s+/);
    if (c.length < 5 || c[0].toUpperCase() !== 'TCP') continue;
    if (!c[1].endsWith(`:${porta}`) || !/^(LISTENING|ASCOLTO|ABH.REN)$/i.test(c[3])) continue;
    const pid = Number(c[4]);
    if (Number.isInteger(pid) && pid > 0) return pid;
  }
  return null;
}

const esegui = (cmd, args) => new Promise((ok) => execFile(cmd, args, { windowsHide: true }, (e, out) => ok(e ? '' : String(out))));

/** Pid del processo in ascolto sulla porta, dal sistema operativo; null se non si trova. */
export async function pidInAscolto(porta) {
  if (process.platform === 'win32') return pidDaNetstat(await esegui('netstat', ['-ano', '-p', 'tcp']), porta);
  const out = await esegui('lsof', ['-ti', `tcp:${porta}`, '-sTCP:LISTEN']);
  const pid = Number(out.trim().split(/\s+/)[0]);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

/**
 * Ferma il Mutant sulla porta e aspetta che la porta si liberi. Restituisce { fermato: true } oppure
 * { fermato: false, motivo }. Mai sul processo che chiama (il nuovo server).
 */
export async function fermaMutant(porta, info, { attesaMs = 8000, host = '127.0.0.1' } = {}) {
  const pid = info.pid ?? await pidInAscolto(porta);
  if (!pid) return { fermato: false, motivo: 'non trovo il processo da fermare' };
  if (pid === process.pid) return { fermato: false, motivo: 'è questo stesso processo' };
  try { process.kill(pid); } catch (e) { return { fermato: false, motivo: `il sistema non lo lascia fermare (${e.code ?? e.message})` }; }
  const fine = Date.now() + attesaMs;
  while (Date.now() < fine) {
    if ((await chiOccupa(porta, { host, attesaMs: 800 })).tipo === 'nessuno') return { fermato: true, pid };
    await new Promise((ok) => setTimeout(ok, 250));
  }
  return { fermato: false, motivo: 'la porta è ancora occupata dopo qualche secondo' };
}

/**
 * Il server si spegne da solo quando la finestra che l'ha avviato si chiude (cmd.exe di avvia-server.bat): ogni pochi
 * secondi si controlla che il processo padre esista ancora. `esci` è la funzione che chiude il server.
 */
export function sorvegliaFinestra(esci, { ppid = process.ppid, ogniMs = 3000 } = {}) {
  if (!ppid || ppid <= 1) return null;
  const t = setInterval(() => {
    try { process.kill(ppid, 0); } catch (e) { if (e.code === 'ESRCH') esci('finestra chiusa'); }
  }, ogniMs);
  t.unref();
  return t;
}
