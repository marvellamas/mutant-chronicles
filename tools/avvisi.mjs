// Avvisi a Marcello con ntfy.sh (richiesta di Marcello del 07/10/2026): quando Davide aggiorna o avvia Mutant arriva
// sul telefono di Marcello una notifica con il nome del PC e la versione dell'app, per sapere se sta provando l'ultima.
// Niente dati personali: solo nome del PC, versione (impronta di versione.json), data e ora, esito. Nessun contenuto di
// PG, scene o scontri.
//
// Configurazione: avvisi/avvisi.json (fuori da git; esempio tracciato in avvisi/avvisi.esempio.json, spiegazione in
// avvisi/LEGGIMI.txt): { "attivo": true, "ntfy_argomento": "mutant-…", "nome_pc": "PC di Davide" }; si imposta dalla
// console (Mutant.bat, voce 6: tools/impostazioni.mjs). Senza file, con "attivo": false o con un argomento non valido
// non parte nulla. Limiti: l'avvio al massimo una volta ogni 6 ore per PC, «Mappa aperta» una volta al giorno (stato in
// avvisi/stato.json, fuori da git). Invio HTTP (fetch di Node, 09/10/2026: prima curl), timeout di pochi secondi; senza
// rete non si blocca nulla, ma l'invio non riuscito va in avvisi/registro.txt con il motivo, e la console lo mostra.
//
// Uso:
//   node tools/avvisi.mjs aggiornato               dopo un aggiornamento riuscito (aggiorna.bat)
//   node tools/avvisi.mjs non-aggiornato <motivo>  aggiornamento fallito (aggiorna.bat)
//   node tools/avvisi.mjs avvio                    avvio del server (server.mjs lo chiama da sé)
//   node tools/avvisi.mjs prova <argomento>        invio di prova a un argomento qualunque, senza configurazione
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hostname } from 'node:os';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CARTELLA_AVVISI = 'avvisi';
/** Registro degli invii non riusciti (avvisi e backup), letto dalla console all'avvio. */
export const FILE_REGISTRO = join('avvisi', 'registro.txt');
const RIGHE_REGISTRO = 200;
/** Intervallo minimo fra due avvisi di avvio (6 ore). */
export const INTERVALLO_AVVIO_MS = 6 * 60 * 60 * 1000;
const SERVER_NTFY = 'https://ntfy.sh';
const TIMEOUT_S = 5;
// argomento lungo e casuale: lettere minuscole, cifre, trattini e trattini bassi (regole di ntfy.sh)
export const ARGOMENTO = /^[a-z0-9_-]{12,64}$/;

const leggiJson = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

/**
 * Configurazione valida e attiva ({ argomento, server, nomePc }) oppure null (assente, spenta o rovinata: nessun avviso).
 * «server»: https, oppure http://127.0.0.1:porta (un server ntfy finto, nelle prove).
 */
export function configurazione(grezza) {
  if (!grezza || typeof grezza !== 'object' || grezza.attivo !== true) return null;
  const argomento = String(grezza.ntfy_argomento ?? '').trim();
  if (!ARGOMENTO.test(argomento)) return null;
  const server = typeof grezza.server === 'string' && (/^https:\/\/[\w.-]+$/.test(grezza.server) || /^http:\/\/127\.0\.0\.1:\d+$/.test(grezza.server)) ? grezza.server : SERVER_NTFY;
  const nomePc = String(grezza.nome_pc ?? '').trim().slice(0, 40) || null;
  return { argomento, server, nomePc };
}

/** Data e ora leggibili, «08/10/2026 21:05». */
export const dataOra = (d) => `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;

/** Testo della notifica per un evento ('aggiornato', 'non-aggiornato', 'avvio', 'mappa'). */
export function messaggio(evento, { pc, versione, adesso, motivo = '' }) {
  const v = versione || 'sconosciuta';
  switch (evento) {
    case 'aggiornato': return `Mutant aggiornato da ${pc} alla versione ${v} (${dataOra(adesso)})`;
    case 'non-aggiornato': return `Aggiornamento NON riuscito da ${pc}: ${String(motivo || 'motivo sconosciuto').slice(0, 120)} (${dataOra(adesso)})`;
    case 'avvio': return `Mutant avviato da ${pc}, versione ${v} (${dataOra(adesso)})`;
    case 'mappa': return `Mappa aperta da ${pc}, versione ${v} (${dataOra(adesso)})`;
    default: throw new Error(`evento sconosciuto: ${evento}`);
  }
}

const giorno = (d) => d.toISOString().slice(0, 10);

/**
 * Va mandato? L'aggiornamento (riuscito o no) sempre; l'avvio se l'ultimo è di almeno 6 ore fa; «Mappa aperta» una
 * volta al giorno. Restituisce anche lo stato da salvare se si manda.
 */
export function daMandare(evento, stato, adesso) {
  const s = stato && typeof stato === 'object' ? stato : {};
  if (evento === 'avvio') {
    const ultimo = Date.parse(s.avvio ?? '');
    if (Number.isFinite(ultimo) && adesso.getTime() - ultimo < INTERVALLO_AVVIO_MS) return { manda: false, stato: s };
    return { manda: true, stato: { ...s, avvio: adesso.toISOString() } };
  }
  if (evento === 'mappa') {
    if (s.mappa === giorno(adesso)) return { manda: false, stato: s };
    return { manda: true, stato: { ...s, mappa: giorno(adesso) } };
  }
  return { manda: true, stato: s };
}

/** Invio con curl, in silenzio: true se curl dice che è andato. */
export function inviaNtfy({ argomento, server = SERVER_NTFY }, testo, { esegui = execFile } = {}) {
  return new Promise((ok) => {
    try {
      esegui('curl', ['-s', '-f', '-m', String(TIMEOUT_S), '-H', 'Title: Mutant', '-H', 'Tags: game_die', '--data-binary', '@-', `${server}/${argomento}`],
        { timeout: (TIMEOUT_S + 2) * 1000, windowsHide: true }, (err) => ok(!err))
        ?.stdin?.end(testo, 'utf8');
    } catch { ok(false); }
  });
}

/**
 * Invio HTTP a ntfy (fetch di Node): { ok, codice?, errore? } con il motivo leggibile, mai un'eccezione.
 */
export async function inviaHttp({ argomento, server = SERVER_NTFY }, testo, { fetchFn = fetch, timeoutMs = TIMEOUT_S * 1000, titolo = 'Mutant', tags = 'game_die' } = {}) {
  try {
    const r = await fetchFn(`${server}/${argomento}`, { method: 'POST', body: testo, headers: { Title: titolo, Tags: tags }, signal: AbortSignal.timeout(timeoutMs) });
    return r.ok ? { ok: true, codice: r.status } : { ok: false, codice: r.status, errore: `il servizio ntfy ha risposto ${r.status}` };
  } catch (e) {
    return { ok: false, errore: e?.name === 'TimeoutError' ? `nessuna risposta da ntfy in ${Math.round(timeoutMs / 1000)} s` : 'rete non raggiungibile (internet assente o ntfy.sh bloccato)' };
  }
}

/** Aggiunge una riga al registro: «2026-10-09T… 09/10/2026 21:05 · avviso · Mutant avviato da PC di Davide · motivo». */
export function registraErrore(radice, { tipo, testo = '', errore }, adesso = new Date()) {
  try {
    const f = join(radice, FILE_REGISTRO);
    mkdirSync(dirname(f), { recursive: true });
    const riga = [dataOra(adesso), tipo, String(testo).replace(/\s+/g, ' ').slice(0, 160), String(errore ?? 'errore sconosciuto').replace(/\s+/g, ' ')].filter(Boolean).join(' · ');
    appendFileSync(f, `${adesso.toISOString()} ${riga}\n`);
    // il registro resta corto: le ultime righe
    const righe = readFileSync(f, 'utf8').split('\n').filter(Boolean);
    if (righe.length > RIGHE_REGISTRO) writeFileSync(f, `${righe.slice(-RIGHE_REGISTRO).join('\n')}\n`);
  } catch { /* il registro non deve mai bloccare */ }
}

/**
 * Avviso per un evento, con configurazione e stato della cartella avvisi/ di `radice`. Non lancia mai: restituisce
 * { mandato, motivo } (motivo: 'spento', 'limite', 'errore'). L'invio non riuscito va nel registro (avvisi/registro.txt).
 */
export async function avvisa(evento, { radice = RADICE, adesso = new Date(), motivo = '', pc = hostname(), invia = inviaHttp } = {}) {
  try {
    const cartella = join(radice, CARTELLA_AVVISI);
    const conf = configurazione(leggiJson(join(cartella, 'avvisi.json')));
    if (!conf) return { mandato: false, motivo: 'spento' };
    const fileStato = join(cartella, 'stato.json');
    const { manda, stato } = daMandare(evento, leggiJson(fileStato), adesso);
    if (!manda) return { mandato: false, motivo: 'limite' };
    const versione = leggiJson(join(radice, 'versione.json'))?.versione ?? null;
    const testo = messaggio(evento, { pc: conf.nomePc ?? pc, versione, adesso, motivo });
    const r = await invia(conf, testo);
    const ok = r === true || r?.ok === true;
    if (!ok) registraErrore(radice, { tipo: `avviso «${evento}»`, testo, errore: r?.errore ?? 'invio non riuscito' }, adesso);
    // lo stato si scrive solo se l'invio è riuscito: senza rete si riprova al prossimo avvio
    if (ok && (evento === 'avvio' || evento === 'mappa')) { mkdirSync(cartella, { recursive: true }); writeFileSync(fileStato, `${JSON.stringify(stato, null, 2)}\n`); }
    return ok ? { mandato: true, testo } : { mandato: false, motivo: 'errore', testo };
  } catch {
    return { mandato: false, motivo: 'errore' };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [evento, extra = ''] = process.argv.slice(2);
  if (evento === 'prova') {
    const r = await inviaHttp({ argomento: extra }, messaggio('avvio', { pc: hostname(), versione: leggiJson(join(RADICE, 'versione.json'))?.versione, adesso: new Date() }).replace('Mutant avviato', 'Prova degli avvisi di Mutant'));
    console.log(r.ok ? `Inviato a ${extra}.` : `Invio non riuscito: ${r.errore}.`);
  } else if (['aggiornato', 'non-aggiornato', 'avvio', 'mappa'].includes(evento)) {
    await avvisa(evento, { motivo: extra });
  }
  // nessun messaggio e codice 0 in ogni caso: gli avvisi non devono mai disturbare chi aggiorna o avvia
  process.exit(0);
}
