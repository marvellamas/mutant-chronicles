// Riga di stato del tablet (21/10/2026, lotto «il tablet è una vista, non un proprietario», parte D; estesa lo
// stesso giorno, quarto lotto, «si può modificare offline, e al rientro Davide approva»): sempre visibile, in
// cima a ogni pagina del tablet (src/ui/stato-tablet.js la monta, come la fascia «Copia di lavoro»). Dice se il
// tablet è collegato al server e a quale personaggio, da quanto è offline e quante modifiche sono in coda.
// Offline NON spegne più i comandi (era una misura temporanea, dal 21/10 pomeriggio): le operazioni si
// accodano (src/ui/coda-offline.js) e si sommano al rientro (src/giornale.js). L'unico altro motivo di sola
// lettura resta guardare un personaggio diverso dal proprio, sempre — online o offline.
//
// Funzioni pure: il testo e l'orologio stanno qui; il DOM, il `fetch` e la coda stanno in src/ui/dispositivo.js,
// src/ui/coda-offline.js e src/ui/stato-tablet.js. Le frasi sono in regole.json → interfaccia.dispositivo.

const PAD = (n) => String(n).padStart(2, '0');

/** «14:32». */
export function oraBreve(quando) {
  const d = new Date(quando);
  return `${PAD(d.getHours())}:${PAD(d.getMinutes())}`;
}

/** «pochi secondi», «un minuto», «3 minuti», «un'ora», «2 ore»: un tempo trascorso, in parole. */
export function tempoTrascorso(msPassati) {
  const s = Math.max(0, Math.round(msPassati / 1000));
  if (s < 60) return 'pochi secondi';
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? 'un minuto' : `${m} minuti`;
  const h = Math.round(m / 60);
  return h === 1 ? 'un’ora' : `${h} ore`;
}

/** «1 modifica» / «4 modifiche»: l'unico punto dove l'italiano decide il plurale del testo di regole.json. */
const testoModifiche = (n) => `${n} modific${n === 1 ? 'a' : 'he'}`;

/**
 * La riga di stato, da mostrare su ogni pagina del tablet.
 * @param pg { pgId, pgNome } | null: l'abbinamento di questo dispositivo (src/dispositivi.js), null se non ha scelto
 * @param collegamento { ok, ultimoOk, adesso? }: `ok` è l'esito dell'ultimo controllo del server; `ultimoOk` il
 *   momento dell'ultimo controllo riuscito (per «offline da…»); `adesso` per i test, altrimenti `Date.now()`.
 * @param inCoda quante operazioni sono in coda per questo personaggio (src/ui/coda-offline.js → inCoda); 0 se
 *   non lo sai (non cambia il testo, solo quale dei due modelli di frase «offline» si usa)
 * @returns { stato: 'collegato'|'senza_pg'|'offline', testo, modificabile } — `modificabile` NON dipende più
 *   dall'essere offline: è sempre true qui (il gate per un personaggio non proprio è un'altra cosa, fuori da
 *   questa funzione: src/ui/stato-tablet.js → puoModificare)
 */
export function rigaStatoTablet({ pg = null, collegamento, inCoda = 0 }, dati) {
  const T = dati.regole.interfaccia.dispositivo;
  const adesso = collegamento.adesso ?? Date.now();
  if (!collegamento.ok) {
    const da = tempoTrascorso(adesso - (collegamento.ultimoOk ?? adesso));
    const testo = inCoda > 0
      ? T.testo_offline_coda.replace('{tempo}', da).replace('{modifiche}', testoModifiche(inCoda))
      : T.testo_offline_coda_vuota.replace('{tempo}', da);
    return { stato: 'offline', testo, modificabile: true };
  }
  if (!pg) return { stato: 'senza_pg', testo: T.testo_senza_pg, modificabile: true };
  return { stato: 'collegato', testo: T.testo_collegato.replace('{nome}', pg.pgNome ?? 'il tuo personaggio').replace('{ora}', oraBreve(adesso)), modificabile: true };
}

/** Il motivo da mettere nel titolo di un comando spento: guardare un personaggio che non è il proprio. */
export const motivoSolaLettura = (dati) => dati.regole.interfaccia.dispositivo.motivo_sola_lettura;

// Chi può avere scritto, nel messaggio del conflitto: il file del PG è scrivibile solo dal suo stesso tablet
// (parte C) e dal Direttore, quindi un conflitto «giocatore» è quasi sempre lo stesso giocatore da un altro
// dispositivo, non un estraneo.
const CHI = { master: 'il Direttore', giocatore: 'un altro tuo dispositivo', px: 'il calcolo dei PX' };

/**
 * Il messaggio del conflitto di versione (parte E): «"Aiko" è stata modificata da il Direttore un minuto fa.
 * Ricarica e riprova.» Non sovrascrive, non fonde, non inventa: il giocatore sceglie se ricaricare.
 */
export function messaggioConflittoVersione({ nome, chi, quando }, dati, adesso = Date.now()) {
  const T = dati.regole.interfaccia.dispositivo;
  return T.conflitto_versione
    .replace('{nome}', nome?.trim() || 'Il personaggio')
    .replace('{chi}', CHI[chi] ?? 'qualcun altro')
    .replace('{quando}', tempoTrascorso(adesso - new Date(quando).getTime()));
}
