// Personaggi nella cartella del progetto (branch tavolo-direttore, pezzo 0a; server.mjs). Funzioni pure:
// quale file della cartella è «lo stesso» personaggio del browser, e chi vince fra le due copie.
//
// - I file hanno il nome dell'export («Nome_livN_AAAA-MM-GG.json», src/character.js) e il suo contenuto
//   byte per byte: la cartella è una raccolta di export. Un nuovo giorno o un nuovo livello creano un
//   file nuovo; quelli vecchi restano (il server non cancella).
// - Identità (bug del 04/10/2026, «Lucas» e «LUCAS»): ogni PG ha un identificativo «pg» creato alla nascita e
//   scritto nel file (src/character.js → nuovoPg). La scheda e la pagina iniziale riconoscono il PG da quello
//   (fileDelPg), non dal nome del file. I file di prima senza «pg» si riconoscono come prima, dal «Nome».
// - Il «Nome» del file resta leggibile ed è unico per PG: se un altro PG ha già un file con lo stesso nome,
//   anche solo a meno di maiuscole, accenti o spazi (Windows non distingue «Lucas» da «LUCAS»), il PG nuovo
//   prende un suffisso («LUCAS-2», nomeFileLibero). La plancia può quindi continuare a usare il «Nome».
// - Per ogni nome conta il file modificato più di recente.
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

/**
 * Forma di confronto di un «Nome» di file: senza maiuscole, accenti, spazi, trattini e trattini bassi. Due nomi
 * uguali in questa forma sono «lo stesso nome» per chi legge (e per Windows, a meno di maiuscole).
 */
export const formaNome = (nome) => String(nome ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s_-]+/g, '');

/** Il file più recente di un elenco (o null). */
const piuRecente = (lista) => lista.reduce((m, f) => (!m || f.mtime > m.mtime ? f : m), null);

/**
 * Il file del personaggio di una voce del browser (il più recente), riconosciuto dall'identificativo:
 * 1. i file con lo stesso «pg» della voce;
 * 2. altrimenti i file di prima (senza «pg») con il «Nome» del file dell'ultima sincronizzazione;
 * 3. una voce di prima (senza «pg») mai sincronizzata: i file di prima con il «Nome» del suo nome, come prima.
 * Un PG nuovo (con «pg», mai scritto) non prende mai il file di un altro.
 * @param voce { pg?, scelte: { nome }, cartella?: { file } }
 * @param lista elenco del server [{ file, mtime, pg? }]
 */
export function fileDelPg(voce, lista) {
  const tutti = lista ?? [];
  if (voce?.pg) {
    const miei = tutti.filter((f) => f.pg === voce.pg);
    if (miei.length) return piuRecente(miei);
  }
  const vecchi = (stem) => tutti.filter((f) => !f.pg && chiaveDaFile(f.file) === stem);
  if (voce?.cartella?.file) return piuRecente(vecchi(chiaveDaFile(voce.cartella.file)));
  if (!voce?.pg) return piuRecente(vecchi(chiavePersonaggio(voce?.scelte?.nome)));
  return null;
}

/**
 * «Nome» del file per scrivere un personaggio nella cartella: quello del suo nome, se nessun altro PG ha un file
 * con lo stesso nome (a meno di maiuscole, accenti e spazi: formaNome); altrimenti con un suffisso «-2», «-3»…
 * Il PG tiene il nome che ha già (anche con il suffisso) finché il suo nome non cambia.
 * @param voce { pg?, scelte: { nome }, cartella?: { file } }
 * @param lista elenco del server [{ file, mtime, pg? }]
 */
export function nomeFileLibero(voce, lista) {
  const base = chiavePersonaggio(voce?.scelte?.nome);
  const tutti = lista ?? [];
  const stemVecchio = voce?.cartella?.file ? chiaveDaFile(voce.cartella.file) : null;
  const mio = (f) => (voce?.pg && f.pg === voce.pg) || (!f.pg && stemVecchio !== null && chiaveDaFile(f.file) === stemVecchio);
  const miei = tutti.filter(mio).sort((a, b) => b.mtime - a.mtime).map((f) => chiaveDaFile(f.file));
  const radice = (x) => x.replace(/-\d+$/, '');
  const proprio = miei.find((x) => formaNome(x) === formaNome(base) || formaNome(radice(x)) === formaNome(base));
  if (proprio) return proprio;
  const presi = new Set(tutti.filter((f) => !mio(f)).map((f) => formaNome(chiaveDaFile(f.file))));
  let nome = base;
  for (let n = 2; presi.has(formaNome(nome)); n++) nome = `${base}-${n}`;
  return nome;
}

/**
 * Nomi della cartella che si confondono (Tavolo del Master): «Nome» diversi uguali a meno di maiuscole,
 * accenti o spazi («Lucas» e «LUCAS»), o lo stesso «Nome» con due identificativi diversi. Su Windows i primi
 * possono finire nello stesso file. [{ nomi: [«Nome»…], motivo }]
 */
export function nomiCheSiConfondono(lista) {
  const perForma = new Map();
  for (const f of lista ?? []) {
    const stem = chiaveDaFile(f.file);
    const k = formaNome(stem);
    if (!perForma.has(k)) perForma.set(k, { nomi: new Set(), pg: new Set() });
    perForma.get(k).nomi.add(stem);
    if (f.pg) perForma.get(k).pg.add(f.pg);
  }
  const out = [];
  for (const g of perForma.values()) {
    if (g.nomi.size > 1) out.push({ nomi: [...g.nomi].sort(), motivo: 'nomi uguali a meno di maiuscole, accenti o spazi' });
    else if (g.pg.size > 1) out.push({ nomi: [...g.nomi], motivo: 'stesso nome per personaggi diversi' });
  }
  return out;
}

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
  // gruppo di un file: il suo identificativo, oppure il «Nome» per i file di prima
  const gruppo = (f) => (f.pg ? `pg:${f.pg}` : `nome:${chiaveDaFile(f.file)}`);
  const ultimi = new Map();
  for (const f of remoti) if (!ultimi.has(gruppo(f)) || f.mtime > ultimi.get(gruppo(f)).mtime) ultimi.set(gruppo(f), f);
  const usati = new Set();
  const out = locali.map((voce) => {
    const f = fileDelPg(voce, remoti);
    const k = f ? gruppo(f) : null;
    // due voci del browser dello stesso personaggio: la cartella vale per la più recente
    const remoto = k && !usati.has(k) ? ultimi.get(k) : null;
    if (remoto) usati.add(k);
    return { voce, origine: remoto ? 'entrambi' : 'browser', remoto };
  });
  for (const [k, remoto] of ultimi) if (!usati.has(k)) out.push({ voce: null, origine: 'cartella', remoto });
  return out;
}

// ---------------------------------------------------------------------------
// Messaggi del salvataggio nella cartella (richiesta di Davide del 04/10/2026). Davanti a
// «NetworkError when attempting to fetch resource» non si capisce che va riaperta la finestra del
// server: il messaggio lo dice in parole semplici e l'app ritenta da sé. Testi e tempi in
// regole.json → interfaccia.salvataggio; il testo tecnico resta nella console del browser.

/**
 * L'errore dice che il server non risponde? Sono gli errori di `fetch` quando non c'è nessuno in
 * ascolto o la richiesta è stata interrotta: il browser li presenta come TypeError con messaggi
 * diversi («NetworkError when attempting to fetch resource» su Firefox, «Failed to fetch» su Chrome,
 * «Load failed» su Safari). Un errore del server (file non valido, permessi) non è di rete: ha un
 * messaggio nostro e ritentare non lo risolve.
 */
export function erroreDiRete(e) {
  if (!e) return false;
  if (e.conflitto) return false; // 409: il server ha risposto, è un conflitto di revisione
  if (e.name === 'AbortError' || e.name === 'TimeoutError') return true;
  if (e.name !== 'TypeError' && e.name !== 'Error') return false;
  const m = String(e.message ?? '');
  // «errore 500» e simili vengono dal server, che quindi risponde
  if (/^errore \d{3}$/.test(m)) return false;
  return /networkerror|failed to fetch|load failed|network request failed|fetch failed|connessione/i.test(m) || e.name === 'TypeError';
}

/**
 * Messaggio da mostrare dopo un tentativo di salvataggio nella cartella.
 * @param esito { errore } fallito, oppure { riuscito: true, ritentato: boolean }
 * @returns {{ tipo: 'ok'|'attenzione', testo, tecnico: string|null, ritenta: boolean }}
 *   `tecnico` va nella console, non nella pagina; `ritenta` dice se conviene riprovare da soli.
 */
export function messaggioSalvataggio(esito, dati) {
  const T = dati.regole.interfaccia.salvataggio;
  if (esito?.riuscito) return { tipo: 'ok', testo: T.riuscito, tecnico: null, ritenta: false };
  const e = esito?.errore;
  if (erroreDiRete(e)) return { tipo: 'attenzione', testo: T.server_non_risponde, tecnico: String(e?.message ?? e), ritenta: true };
  return { tipo: 'attenzione', testo: T.non_riuscito.replace('{errore}', e?.message ?? String(e)), tecnico: String(e?.stack ?? e?.message ?? e), ritenta: false };
}

/** Millisecondi fra un tentativo di salvataggio e il successivo (regole.json → interfaccia.salvataggio). */
export function attesaRitentativo(dati) {
  const s = dati.regole.interfaccia.salvataggio.ritenta_ogni_s;
  return Math.max(1, Number(s) || 5) * 1000;
}
