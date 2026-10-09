// Impostazioni di Mutant su questo PC (richiesta di Marcello del 09/10/2026): avvisi ntfy e cartella di Google Drive per i
// backup, guidati dalla console (tools/console.mjs, voce 6) invece che modificando i JSON a mano; registro degli invii non
// riusciti (avvisi e backup) che la console segnala all'avvio.
//
// File (tutti fuori da git, per PC):
//   avvisi/avvisi.json        { attivo, ntfy_argomento, nome_pc? }       (tools/avvisi.mjs)
//   config-salvataggi.json    { …, cartella_drive, ntfy, … }             (tools/salva-sessione.mjs)
//   avvisi/registro.txt       una riga per invio non riuscito, la più recente in fondo
//   avvisi/stato.json         anche «registro_letto»: fin dove la console ha già mostrato il registro
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hostname } from 'node:os';
import { configurazione, inviaHttp, dataOra, ARGOMENTO, registraErrore, FILE_REGISTRO } from './avvisi.mjs';

export { registraErrore, FILE_REGISTRO };

export const FILE_AVVISI = join('avvisi', 'avvisi.json');
export const ESEMPIO_AVVISI = join('avvisi', 'avvisi.esempio.json');
export const FILE_CONFIG = 'config-salvataggi.json';
export const ESEMPIO_CONFIG = 'config-salvataggi.esempio.json';
const FILE_STATO = join('avvisi', 'stato.json');

const leggi = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
const scrivi = (f, v) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, `${JSON.stringify(v, null, 2)}\n`); };
const cartella = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };

/** L'argomento ntfy del gruppo (quello dell'esempio tracciato), proposto a chi configura. */
export function argomentoGruppo(radice) {
  return String(leggi(join(radice, ESEMPIO_AVVISI))?.ntfy_argomento ?? '');
}

/**
 * Stato delle impostazioni di questo PC.
 * avvisi.stato: 'mancante' (nessun file: avvisi spenti), 'spento', 'argomento_vuoto', 'argomento_non_valido', 'acceso'.
 * drive.stato: 'mancante' (nessun config-salvataggi.json), 'vuota', 'inesistente', 'ok'.
 */
export function statoImpostazioni(radice) {
  const fa = join(radice, FILE_AVVISI);
  const ga = existsSync(fa) ? leggi(fa) : null;
  const argomento = String(ga?.ntfy_argomento ?? '').trim();
  const avvisi = {
    file: existsSync(fa), attivo: ga?.attivo === true, argomento, nomePc: String(ga?.nome_pc ?? '').trim() || null,
    stato: !existsSync(fa) || !ga ? 'mancante' : ga.attivo !== true ? 'spento' : !argomento ? 'argomento_vuoto' : !configurazione(ga) ? 'argomento_non_valido' : 'acceso',
  };
  const fc = join(radice, FILE_CONFIG);
  const gc = existsSync(fc) ? leggi(fc) : null;
  const percorso = String(gc?.cartella_drive ?? gc?.copia_in ?? '').trim() || null;
  const drive = { file: existsSync(fc), percorso, esiste: !!percorso && cartella(percorso), stato: !existsSync(fc) ? 'mancante' : !percorso ? 'vuota' : cartella(percorso) ? 'ok' : 'inesistente' };
  return { avvisi, drive, mancanti: [FILE_AVVISI, FILE_CONFIG].filter((f) => !existsSync(join(radice, f))), nuova: !existsSync(fa) && !existsSync(fc) };
}

/** Testo di una riga per lo stato degli avvisi. */
export function testoAvvisi(a, radice = null) {
  const proposto = radice ? argomentoGruppo(radice) : '';
  switch (a.stato) {
    case 'mancante': return 'non impostati: nessun avviso parte da questo PC';
    case 'spento': return 'SPENTI';
    case 'argomento_vuoto': return 'accesi, ma senza argomento ntfy: non parte nulla';
    case 'argomento_non_valido': return `accesi, ma l'argomento «${a.argomento}» non e' valido: non parte nulla`;
    default: return `ACCESI · argomento ${a.argomento}${proposto && a.argomento === proposto ? ' (quello del gruppo)' : ''} · nome di questo PC: ${a.nomePc ?? `${hostname()} (nome di Windows)`}`;
  }
}

/** Testo di una riga per la cartella di Drive. */
export function testoDrive(d) {
  switch (d.stato) {
    case 'mancante': case 'vuota': return 'non impostata: i backup restano solo su questo PC (cartella salvataggi)';
    case 'inesistente': return `${d.percorso} — NON TROVATA (Google Drive per desktop e' acceso? il percorso e' giusto?)`;
    default: return `${d.percorso} (trovata)`;
  }
}

/** Crea un file dall'esempio, se manca, e lo restituisce (oggetto). */
function daEsempio(radice, file, esempio) {
  const p = join(radice, file);
  return leggi(p) ?? leggi(join(radice, esempio)) ?? {};
}

/**
 * Salva le impostazioni degli avvisi: { attivo, argomento, nomePc }. L'argomento deve essere valido per ntfy.sh (lettere
 * minuscole, cifre, - e _, almeno 12 caratteri) se gli avvisi sono accesi. Le altre chiavi del file restano.
 * @returns {{ ok: boolean, errore?: string }}
 */
export function salvaAvvisi(radice, { attivo, argomento, nomePc }) {
  const a = String(argomento ?? '').trim();
  if (attivo && !a) return { ok: false, errore: 'l’argomento ntfy è vuoto: senza argomento non parte nessun avviso' };
  if (a && !ARGOMENTO.test(a)) return { ok: false, errore: `«${a}» non è un argomento valido (lettere minuscole, cifre, - e _, da 12 a 64 caratteri)` };
  const v = daEsempio(radice, FILE_AVVISI, ESEMPIO_AVVISI);
  v.attivo = !!attivo;
  v.ntfy_argomento = a;
  const n = String(nomePc ?? '').trim().slice(0, 40);
  if (n) v.nome_pc = n; else delete v.nome_pc;
  scrivi(join(radice, FILE_AVVISI), v);
  return { ok: true };
}

/**
 * Salva la cartella di Google Drive dei backup (null o vuoto: nessuna copia). La cartella deve esistere; con `crea` si
 * crea l'ultima parte del percorso se la cartella sopra esiste (per esempio «Mutant salvataggi» dentro «Il mio Drive»).
 * @returns {{ ok: boolean, errore?: string, creata?: boolean, percorso?: string|null }}
 */
export function salvaDrive(radice, percorso, { crea = false } = {}) {
  const p = String(percorso ?? '').trim().replace(/^"(.*)"$/, '$1').replace(/[\\/]+$/, '');
  let creata = false;
  if (p) {
    if (!cartella(p)) {
      if (!crea) return { ok: false, errore: `la cartella ${p} non esiste` };
      if (!cartella(dirname(p))) return { ok: false, errore: `non esiste nemmeno ${dirname(p)}: Google Drive per desktop è installato e acceso?` };
      try { mkdirSync(p); creata = true; } catch (e) { return { ok: false, errore: `non riesco a creare ${p} (${e.message})` }; }
    }
  }
  const v = daEsempio(radice, FILE_CONFIG, ESEMPIO_CONFIG);
  v.cartella_drive = p ? p.replace(/\\/g, '/') : '';
  delete v.copia_in;
  scrivi(join(radice, FILE_CONFIG), v);
  return { ok: true, creata, percorso: p || null };
}

/**
 * Posizioni tipiche di Google Drive per desktop su questo PC: le unità con «Il mio Drive» o «My Drive» (G: di solito) e
 * le cartelle sotto il profilo dell'utente. Solo quelle che esistono.
 */
export function posizioniDrive({ esiste = cartella, env = process.env, lettere = 'DEFGHIJKLMNOPQRSTUVWXYZ' } = {}) {
  const out = [];
  for (const l of lettere) for (const n of ['Il mio Drive', 'My Drive']) out.push(`${l}:\\${n}`);
  const u = env.USERPROFILE;
  if (u) for (const n of ['Google Drive\\Il mio Drive', 'Google Drive\\My Drive', 'Google Drive', 'Il mio Drive', 'My Drive']) out.push(`${u}\\${n}`);
  return [...new Set(out)].filter((p) => esiste(p));
}

// ---------------------------------------------------------------------------
// Registro degli invii non riusciti

/** Le righe del registro, dalla più vecchia: [{ quando, testo }]. */
export function righeRegistro(radice) {
  try {
    return readFileSync(join(radice, FILE_REGISTRO), 'utf8').split('\n').filter(Boolean)
      .map((l) => { const i = l.indexOf(' '); return { quando: l.slice(0, i), testo: l.slice(i + 1) }; });
  } catch { return []; }
}

/** Gli errori registrati dopo l'ultima volta che la console li ha mostrati (e li segna come mostrati se `segna`). */
export function erroriNuovi(radice, { segna = false } = {}) {
  const fs = join(radice, FILE_STATO);
  const stato = leggi(fs) ?? {};
  const letto = Date.parse(stato.registro_letto ?? '') || 0;
  const nuovi = righeRegistro(radice).filter((r) => Date.parse(r.quando) > letto);
  if (segna && nuovi.length) scrivi(fs, { ...stato, registro_letto: nuovi.at(-1).quando });
  return nuovi;
}

// ---------------------------------------------------------------------------
// Notifica di prova

/**
 * «Manda una notifica di prova»: con gli avvisi accesi e un argomento valido manda «Prova degli avvisi di Mutant da …».
 * @returns {{ ok: boolean, testo: string }} il testo dice l'esito o il motivo (avvisi spenti, argomento vuoto, rete…)
 */
export async function notificaDiProva(radice, { adesso = new Date(), fetchFn = fetch, timeoutMs = 8000 } = {}) {
  const s = statoImpostazioni(radice).avvisi;
  if (s.stato === 'mancante') return { ok: false, testo: 'Avvisi non impostati: scegli prima «Avvisi» (voce 1).' };
  if (s.stato === 'spento') return { ok: false, testo: 'Gli avvisi sono SPENTI: accendili con la voce 1, poi riprova.' };
  if (s.stato === 'argomento_vuoto') return { ok: false, testo: 'L’argomento ntfy è vuoto: impostalo con la voce 1, poi riprova.' };
  if (s.stato === 'argomento_non_valido') return { ok: false, testo: `L’argomento «${s.argomento}» non è valido: correggilo con la voce 1.` };
  const conf = configurazione(leggi(join(radice, FILE_AVVISI)));
  const testo = `Prova degli avvisi di Mutant da ${conf.nomePc ?? hostname()} (${dataOra(adesso)}): se la leggi, gli avvisi arrivano.`;
  const r = await inviaHttp(conf, testo, { fetchFn, timeoutMs });
  if (r.ok) return { ok: true, testo: `Notifica inviata all’argomento ${conf.argomento}: deve arrivare a chi ha l’app ntfy iscritta a quell’argomento.` };
  registraErrore(radice, { tipo: 'prova', testo, errore: r.errore }, adesso);
  return { ok: false, testo: `Notifica NON inviata: ${r.errore}.` };
}
