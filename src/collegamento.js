// Tavolo del Master, pezzo 6 (docs/tavolo-direttore.md): la scheda di un giocatore collegato al server
// (server.mjs, anche con --rete) si accorge da sola che il suo file in personaggi/ è cambiato, per esempio
// per un colpo applicato dalla plancia. Funzioni pure: che cosa è cambiato e che cosa fare.
//
// - La voce del browser ricorda l'ultima sincronizzazione con la cartella (`cartella: { file, mtime, salvato }`,
//   src/ui/storage.js → segnaCartella): file e revisione (data di modifica sul server) dell'ultima lettura o
//   scrittura, «aggiornato» della voce in quel momento e l'impronta del testo esportato (`impronta`).
// - La scheda ha una modifica da scrivere se il suo testo esportato non è più quello dell'impronta: si
//   confronta il contenuto, non le date, perché aprire la scheda risalva la voce anche senza cambiarla.
// - Il file del personaggio sul server è il più recente con il suo identificativo «pg» (src/cartella.js →
//   fileDelPg); per i file di prima senza identificativo, con il «Nome» dell'ultima sincronizzazione.
// - Se il file non è più quello ricordato, l'ha cambiato qualcun altro (il master). Se la scheda non ha
//   modifiche locali da scrivere, si ricarica da sola; altrimenti è un conflitto e il giocatore sceglie.
import { fileDelPg } from './cartella.js';

/**
 * Il file del personaggio sul server (il più recente con il suo identificativo), o null. Mai quello di un altro
 * PG con un nome simile: era il bug del 04/10/2026 («Lucas» al tavolo e «LUCAS» appena creato).
 */
export function fileRemoto(voce, lista) {
  return fileDelPg(voce, lista);
}

/** Impronta di un testo (FNV-1a a 32 bit, in esadecimale): basta a dire se il testo esportato è cambiato. */
export function impronta(testo) {
  let x = 0x811c9dc5;
  for (let i = 0; i < testo.length; i++) {
    x ^= testo.charCodeAt(i);
    x = Math.imul(x, 0x01000193) >>> 0;
  }
  return `${testo.length.toString(16)}-${x.toString(16)}`;
}

/**
 * Ha la scheda modifiche non ancora scritte nella cartella? Con l'impronta del testo esportato attuale si
 * confronta il contenuto; senza (sincronizzazioni di prima) la data della voce, come in src/cartella.js.
 * @param inAttesa forza «sì» (per esempio un conflitto già aperto)
 */
export function modificaLocale(voce, inAttesa = false, improntaLocale = null) {
  if (inAttesa) return true;
  const c = voce?.cartella;
  if (!c) return false;
  if (c.impronta && improntaLocale) return c.impronta !== improntaLocale;
  return (voce.aggiornato ?? null) !== (c.salvato ?? null);
}

/**
 * Che cosa fare a un giro di controllo.
 * @param voce voce del browser { scelte, aggiornato, cartella? }
 * @param lista elenco del server (GET /api/personaggi)
 * @param inAttesa forza la modifica locale (conflitto già aperto)
 * @param improntaLocale impronta del testo esportato attuale della scheda
 * @returns {{ azione: 'niente'|'ricarica'|'conflitto', remoto }}
 *   niente: il file è quello ricordato (o la scheda non è mai stata nella cartella, o non c'è più);
 *   ricarica: il file è cambiato e la scheda non ha modifiche da scrivere;
 *   conflitto: il file è cambiato e la scheda ha modifiche non ancora scritte.
 */
export function controllaRemoto(voce, lista, inAttesa = false, improntaLocale = null) {
  const remoto = fileRemoto(voce, lista);
  const c = voce?.cartella;
  if (!remoto || !c) return { azione: 'niente', remoto };
  if (remoto.file === c.file && remoto.mtime === c.mtime) return { azione: 'niente', remoto };
  return { azione: modificaLocale(voce, inAttesa, improntaLocale) ? 'conflitto' : 'ricarica', remoto };
}

/**
 * Revisione per scrivere il file `file` della scheda: la data ricordata se il file è quello dell'ultima
 * sincronizzazione (il server rifiuta con 409 se nel frattempo è cambiato). Per un file nuovo (nuovo giorno
 * o livello) la revisione non c'è: prima si controlla con controllaRemoto che il vecchio non sia cambiato.
 */
export function revisioneDaScrivere(voce, file) {
  const c = voce?.cartella;
  return c && c.file === file && c.mtime !== undefined && c.mtime !== null ? String(c.mtime) : null;
}

const NOMI = { pvAttuali: 'PV', pmAttuali: 'PM', puntiEroe: 'Punti Eroe', ferite: 'Ferite', affaticamento: 'Affaticamento', corruzione: 'Corruzione' };

/**
 * Differenze fra due sessioni, per l'avviso e il registro: «PV 32 → 30», «Stati: + Sanguinante», «munizioni».
 * @param nomeStato id → nome dello Stato (regole.json → stati.elenco)
 */
export function differenzeSessione(prima, dopo, nomeStato = (id) => id) {
  const a = prima ?? {};
  const b = dopo ?? {};
  const out = [];
  for (const [k, nome] of Object.entries(NOMI)) if ((a[k] ?? 0) !== (b[k] ?? 0)) out.push(`${nome} ${a[k] ?? 0} → ${b[k] ?? 0}`);
  const sa = new Set(a.statiAttivi ?? []);
  const sb = new Set(b.statiAttivi ?? []);
  const piu = [...sb].filter((x) => !sa.has(x)).map(nomeStato);
  const meno = [...sa].filter((x) => !sb.has(x)).map(nomeStato);
  if (piu.length || meno.length) out.push(`Stati: ${[...piu.map((x) => `+ ${x}`), ...meno.map((x) => `− ${x}`)].join(', ')}`);
  if (JSON.stringify(a.munizioni ?? {}) !== JSON.stringify(b.munizioni ?? {})) out.push('munizioni');
  const resto = Object.keys({ ...a, ...b }).filter((k) => !(k in NOMI) && !['statiAttivi', 'munizioni'].includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  if (resto.length) out.push(`altri valori di sessione (${resto.join(', ')})`);
  return out;
}

/** Riga del registro dello scontro per la scelta del giocatore in un conflitto. */
export function testoScelta(nome, scelta, differenze = []) {
  const d = differenze.length ? ` (${differenze.join('; ')})` : '';
  return scelta === 'aggiorna'
    ? `${nome}: il giocatore ha accettato l’aggiornamento del master nella sua scheda${d}.`
    : `${nome}: il giocatore ha tenuto la sua versione della scheda al posto di quella del master${d}.`;
}

const TITOLI = {
  collegato: 'La scheda è collegata al server di Mutant: se il master la aggiorna dalla plancia, si aggiorna da sola.',
  non_collegato: 'Il server di Mutant non risponde: la scheda resta salvata nel browser e si riallinea quando torna.',
};

/**
 * Indicatore in testa alla scheda: null senza il server di Mutant (l'app resta com'era), altrimenti
 * «collegato al tavolo» se l'ultimo controllo del proprio file è riuscito, «non collegato» se no.
 */
export function indicatoreCollegamento(server, ultimoControlloRiuscito = true) {
  if (!server) return null;
  const stato = ultimoControlloRiuscito ? 'collegato' : 'non_collegato';
  return { stato, testo: stato === 'collegato' ? 'collegato al tavolo' : 'non collegato', titolo: TITOLI[stato] };
}

/**
 * Indicatore del salvataggio sul PC del master (verifica del 06/10/2026): «Salvato sul PC del master alle 14:32»
 * quando il contenuto della scheda è quello del file in personaggi/ (stessa impronta), altrimenti «Modifiche non ancora
 * salvate…» (si salvano da sole appena il server risponde); senza nome il PG resta nel browser. null senza server.
 * @param cartella voce.cartella { file, mtime, impronta } dell'ultima scrittura o lettura
 */
export function statoSalvataggioMaster({ server, haNome, cartella, improntaLocale }, dati) {
  if (!server) return null;
  const T = dati.regole.interfaccia.salvataggio;
  if (!haNome) return { stato: 'senza_nome', testo: T.indicatore_senza_nome };
  if (cartella?.impronta && cartella.impronta === improntaLocale && Number.isFinite(cartella.mtime)) {
    const d = new Date(cartella.mtime);
    const ora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return { stato: 'salvato', testo: T.indicatore_salvato.replace('{ora}', ora), file: cartella.file };
  }
  return { stato: 'da_salvare', testo: T.indicatore_da_salvare };
}
