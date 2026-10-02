// Personaggi nella cartella del progetto (branch tavolo-direttore, pezzo 0a; server.mjs). Funzioni pure:
// quale file della cartella è «lo stesso» personaggio del browser, e chi vince fra le due copie.
//
// - I file hanno il nome dell'export («Nome_livN_AAAA-MM-GG.json», src/character.js) e il suo contenuto
//   byte per byte: la cartella è una raccolta di export. Un nuovo giorno o un nuovo livello creano un
//   file nuovo; quelli vecchi restano (il server non cancella).
// - Lo stesso personaggio = lo stesso «Nome» del file. Per ogni nome conta il file modificato più di
//   recente.
// - Conflitti: vince il più recente, con un avviso; niente unioni. La voce del browser ricorda l'ultima
//   sincronizzazione (`cartella: { file, mtime, salvato }`): se è cambiata solo una delle due copie vince
//   quella; se sono cambiate entrambe vince la più recente.
import { nomeFileEsportazione } from './character.js';

const SUFFISSO = /_liv(\d+)_(\d{4}-\d{2}-\d{2})\.json$/;
/** Nome di un file personaggio: lo stesso dell'export, «Nome_livN_AAAA-MM-GG.json» (src/character.js). */
// maiuscole, accenti e apostrofi restano; niente separatori di cartella né caratteri vietati da Windows
export const NOME_FILE = /^(?![.-])[^\\/:*?"<>|\s\u0000-\u001f\u007f]{1,120}_liv\d{1,2}_\d{4}-\d{2}-\d{2}\.json$/u;
/** Nome del personaggio nel nome del file: «Lucas_liv6_2026-09-28.json» → «Lucas». */
export const chiaveDaFile = (file) => String(file).replace(SUFFISSO, '');
/** Chiave di un personaggio del browser: il «Nome» del file che l'export gli darebbe. */
export const chiavePersonaggio = (nome) => chiaveDaFile(nomeFileEsportazione(nome, 1, new Date(2000, 0, 1)));

/** Per ogni personaggio della cartella il file più recente: Map chiave → voce dell'elenco del server. */
export function ultimiPerPersonaggio(lista) {
  const out = new Map();
  for (const f of lista ?? []) {
    const k = chiaveDaFile(f.file);
    if (!out.has(k) || f.mtime > out.get(k).mtime) out.set(k, f);
  }
  return out;
}

const TOLLERANZA_MS = 2000; // orologi e scritture ravvicinate: due secondi non fanno un conflitto

/**
 * Che cosa fare con un personaggio presente nel browser e nella cartella.
 * @param locale voce del browser { aggiornato (ISO), cartella?: { file, mtime, salvato } }
 * @param remoto voce del server { file, mtime }
 * @returns {{ azione: 'niente'|'scrivi'|'leggi', conflitto: boolean }}
 */
export function confronta(locale, remoto) {
  const agg = Date.parse(locale?.aggiornato ?? '') || 0;
  const ultima = locale?.cartella ?? null;
  const cambiatoRemoto = !ultima || remoto.file !== ultima.file || remoto.mtime > ultima.mtime + TOLLERANZA_MS;
  const cambiatoLocale = !ultima || agg > (Date.parse(ultima.salvato ?? '') || 0) + TOLLERANZA_MS;
  if (cambiatoRemoto && cambiatoLocale) return { azione: remoto.mtime > agg + TOLLERANZA_MS ? 'leggi' : agg > remoto.mtime + TOLLERANZA_MS ? 'scrivi' : 'niente', conflitto: !!ultima };
  if (cambiatoRemoto) return { azione: 'leggi', conflitto: false };
  if (cambiatoLocale) return { azione: 'scrivi', conflitto: false };
  return { azione: 'niente', conflitto: false };
}

/**
 * Elenco della pagina iniziale: i personaggi del browser e quelli solo nella cartella, con l'origine.
 * @param locali voci del browser (src/ui/storage.js → elenco), più recenti prima
 * @param remoti elenco del server, o null senza server
 * @returns {{ voce, origine: 'browser'|'cartella'|'entrambi', remoto }[]}
 */
export function elencoUnito(locali, remoti) {
  if (!remoti) return locali.map((voce) => ({ voce, origine: 'browser', remoto: null }));
  const ultimi = ultimiPerPersonaggio(remoti);
  const usati = new Set();
  const out = locali.map((voce) => {
    const k = chiavePersonaggio(voce.scelte?.nome);
    // due personaggi del browser con lo stesso nome: la cartella vale per il più recente
    const remoto = !usati.has(k) ? ultimi.get(k) ?? null : null;
    if (remoto) usati.add(k);
    return { voce, origine: remoto ? 'entrambi' : 'browser', remoto };
  });
  for (const [k, remoto] of ultimi) if (!usati.has(k)) out.push({ voce: null, origine: 'cartella', remoto });
  return out;
}
