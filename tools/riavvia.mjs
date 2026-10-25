// Riavvio del server dopo un aggiornamento (13/10/2026, richiesta di Marcello: il prompt 76 è nato perché il server
// era rimasto acceso con il codice vecchio dopo aggiorna.bat; lo stesso sarebbe capitato a Davide).
// Lo chiamano aggiorna.bat, la voce «Aggiorna» della console (Mutant.bat) e l'aggiornamento da zip, alla fine:
//
//   node tools/riavvia.mjs [--porta=3000] [--radice=<cartella>] [--avvia=avvia-server.bat] [--senza-avvio]
//
// Che cosa fa, in ordine:
//   1. guarda se il server di Mutant è acceso (GET /api/ping, come la console);
//   2. confronta la versione con cui il server è stato acceso (ping) con quella dei file aggiornati (versione.json):
//      se sono uguali l'aggiornamento non ha cambiato niente e il server resta acceso com'è;
//   3. altrimenti lo ferma in modo pulito (POST /api/spegni: salva la sessione come «Spegni Mutant», manda la copia e
//      chiude la finestra nera) e lo riavvia come era stato avviato (avvia-server.bat, che riapre anche il browser);
//   4. se il riavvio non riesce lo dice in chiaro e scrive una riga in avvisi/registro.txt.
// Con il server spento non fa nulla e lo dice. Non tocca mai i dati: li salva il server, come a fine serata.
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statoServer, spegniServer } from './ripristina.mjs';
import { registraErrore } from './avvisi.mjs';

const RADICE = fileURLToPath(new URL('..', import.meta.url));

/** La versione dei file aggiornati (versione.json), o null se non si legge. */
export function versioneDeiFile(radice = RADICE) {
  try { return JSON.parse(readFileSync(join(radice, 'versione.json'), 'utf8')).versione ?? null; } catch { return null; }
}

/**
 * Stato del server prima del riavvio: acceso, e con quale versione è stato acceso (GET /api/ping → `versione`, che
 * c'è dal 06/10; un server più vecchio non la dice e si riavvia comunque).
 * @returns {{ acceso, mutant, versione: string|null }}
 */
export async function statoPrimaDelRiavvio(porta, { fetchFn = fetch, timeoutMs = 1500 } = {}) {
  try {
    const r = await fetchFn(`http://127.0.0.1:${porta}/api/ping`, { signal: AbortSignal.timeout(timeoutMs) });
    const j = await r.json().catch(() => ({}));
    const mutant = j?.app === 'mutant';
    return { acceso: true, mutant, versione: mutant && typeof j.versione === 'string' ? j.versione : null };
  } catch {
    return { acceso: false, mutant: false, versione: null };
  }
}

/**
 * Serve riavviare? Funzione pura, il cuore della decisione.
 * @param stato { acceso, mutant, versione } del server @param versioneFile versione.json dopo l'aggiornamento
 * @returns {{ riavvia, stato: 'spento'|'gia_aggiornato'|'da_riavviare'|'altro_programma', testo }}
 *   spento: il server non era acceso, si lascia spento;
 *   gia_aggiornato: acceso con la stessa versione dei file: l'aggiornamento non ha cambiato niente, non si riavvia;
 *   da_riavviare: acceso con una versione diversa (o sconosciuta: server di prima del 06/10);
 *   altro_programma: sulla porta risponde qualcos'altro, non Mutant: non si tocca.
 */
export function serveRiavvio(stato, versioneFile) {
  if (!stato?.acceso) {
    return { riavvia: false, stato: 'spento', testo: 'Aggiornato. Mutant non era acceso: avvialo con la voce 1 del menu di Mutant.bat.' };
  }
  if (!stato.mutant) {
    return { riavvia: false, stato: 'altro_programma', testo: 'Aggiornato. Sulla porta risponde un altro programma, non Mutant: non ho toccato nulla.' };
  }
  if (versioneFile && stato.versione && stato.versione === versioneFile) {
    return { riavvia: false, stato: 'gia_aggiornato', testo: 'Era gia’ aggiornato: Mutant resta acceso, non lo riavvio.' };
  }
  return { riavvia: true, stato: 'da_riavviare', testo: 'Mutant e’ acceso con il codice di prima: lo spengo (salvando) e lo riaccendo.' };
}

/** Il messaggio quando il riavvio non riesce: sempre con che cosa fare. */
export const testoRiavvioNonRiuscito = (motivo) => 'Aggiornato, ma non sono riuscito a riavviare Mutant'
  + `${motivo ? ` (${String(motivo).replace(/\s+/g, ' ').slice(0, 120)})` : ''}.`
  + ' Chiudi la finestra nera di Mutant e riaprilo (Mutant.bat, voce 1).';

/** Attende che il server risponda di nuovo, al massimo `attesaMs`. @returns lo stato, o null se non risponde. */
export async function attendiAcceso(porta, { attesaMs = 40000, passoMs = 500, fetchFn = fetch, adesso = () => Date.now(), dormi = (ms) => new Promise((ok) => setTimeout(ok, ms)) } = {}) {
  const fine = adesso() + attesaMs;
  while (adesso() < fine) {
    const s = await statoPrimaDelRiavvio(porta, { fetchFn });
    if (s.acceso && s.mutant) return s;
    await dormi(passoMs);
  }
  return null;
}

/**
 * Riaccende il server nella stessa finestra nera di sempre: `start "" avvia-server.bat` (che riapre anche il browser).
 * I percorsi si passano a cmd con le barre rovesciate di Windows (`resolve`): con le barre normali `start /d` non trova
 * la cartella e la finestra si chiude senza dire niente.
 */
export function avviaServer(radice, { comando = 'avvia-server.bat', porta = null, spawnFn = spawn } = {}) {
  const env = { ...process.env, ...(porta ? { PORTA: String(porta) } : {}) };
  const dove = resolve(radice);
  // su Windows la finestra nuova la apre «start»; il titolo vuoto è il primo argomento di start
  const p = spawnFn(process.env.ComSpec || 'cmd.exe', ['/c', 'start', '', '/d', dove, resolve(dove, comando)], { cwd: dove, env, detached: true, stdio: 'ignore' });
  p.unref?.();
  return p;
}

/**
 * Tutto il lavoro: decide, spegne, riaccende, attende. Scrive le righe sulla console e, se il riavvio non riesce, una
 * riga in avvisi/registro.txt. Non lancia mai: restituisce l'esito.
 * @returns {{ stato, riavviato, testo, motivo? }}
 */
export async function riavviaDopoAggiornamento({ radice = RADICE, porta = 3000, comando = 'avvia-server.bat', senzaAvvio = false, scrivi = console.log, ...opz } = {}) {
  const versioneFile = versioneDeiFile(radice);
  const prima = await statoPrimaDelRiavvio(porta, opz);
  const d = serveRiavvio(prima, versioneFile);
  if (!d.riavvia) { scrivi(` ${d.testo}`); return { ...d, riavviato: false }; }
  scrivi(` ${d.testo}`);
  const spento = await spegniServer(porta, opz);
  if (!spento.spento) {
    const testo = testoRiavvioNonRiuscito(`non si è spento: ${spento.motivo}`);
    scrivi(` ${testo}`);
    registraErrore(radice, { tipo: 'riavvio', testo: 'spegnimento dopo l’aggiornamento', errore: spento.motivo });
    return { ...d, riavviato: false, testo, motivo: spento.motivo };
  }
  scrivi(' Mutant si e’ spento e la sessione e’ salvata. Lo riaccendo...');
  if (senzaAvvio) return { ...d, riavviato: false, testo: 'Mutant e’ spento (riavvio non richiesto).' };
  if (!existsSync(join(radice, comando))) {
    const testo = testoRiavvioNonRiuscito(`manca ${comando}`);
    scrivi(` ${testo}`);
    registraErrore(radice, { tipo: 'riavvio', testo: 'riavvio dopo l’aggiornamento', errore: `manca ${comando}` });
    return { ...d, riavviato: false, testo, motivo: `manca ${comando}` };
  }
  try { avviaServer(radice, { comando, porta, ...opz }); } catch (e) {
    const testo = testoRiavvioNonRiuscito(e.message);
    scrivi(` ${testo}`);
    registraErrore(radice, { tipo: 'riavvio', testo: 'riavvio dopo l’aggiornamento', errore: e.message });
    return { ...d, riavviato: false, testo, motivo: e.message };
  }
  const dopo = await attendiAcceso(porta, opz);
  if (!dopo) {
    const testo = testoRiavvioNonRiuscito('non ha risposto in tempo');
    scrivi(` ${testo}`);
    registraErrore(radice, { tipo: 'riavvio', testo: 'riavvio dopo l’aggiornamento', errore: 'il server non ha risposto in tempo' });
    return { ...d, riavviato: false, testo, motivo: 'il server non ha risposto in tempo' };
  }
  const testo = 'Mutant e’ di nuovo acceso con la versione nuova: la pagina si apre da sola.'
    + ' Le pagine gia’ aperte (anche i tablet) mostrano la barra "E’ disponibile la versione nuova: ricarica".';
  scrivi(` ${testo}`);
  return { ...d, riavviato: true, testo, versione: dopo.versione };
}

const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
const eseguito = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (eseguito) {
  const radice = arg('radice') || RADICE;
  // la porta la dicono l'argomento o l'ambiente (Mutant.bat → MUTANT_PORTA, avvia-server.bat → PORTA); di norma 3000
  const porta = Number(arg('porta') || process.env.MUTANT_PORTA || process.env.PORTA || 3000);
  await riavviaDopoAggiornamento({ radice, porta, comando: arg('avvia') || 'avvia-server.bat', senzaAvvio: process.argv.includes('--senza-avvio') });
}
