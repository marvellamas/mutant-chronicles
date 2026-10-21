// Riga di stato del tablet (21/10/2026, lotto «il tablet è una vista, non un proprietario», parte D): sempre
// visibile, in cima a ogni pagina del tablet (src/ui/stato-tablet.js la monta, come la fascia «Copia di
// lavoro»). Dice se il tablet è collegato al server e a quale personaggio, o da quanto è offline. Finché il
// terzo lotto (offline con giornale delle operazioni e schermata di rientro) non c'è, offline si legge e non si
// scrive: i comandi che modificano sono spenti, con il motivo scritto (vedi `motivoOffline`).
//
// Funzioni pure: il testo e l'orologio stanno qui; il DOM e il `fetch` stanno in src/ui/dispositivo.js e
// src/ui/stato-tablet.js. Le frasi sono in regole.json → interfaccia.dispositivo, come già per il salvataggio.

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

/**
 * La riga di stato, da mostrare su ogni pagina del tablet.
 * @param pg { pgId, pgNome } | null: l'abbinamento di questo dispositivo (src/dispositivi.js), null se non ha scelto
 * @param collegamento { ok, ultimoOk, adesso? }: `ok` è l'esito dell'ultimo controllo del server; `ultimoOk` il
 *   momento dell'ultimo controllo riuscito (per «offline da…»); `adesso` per i test, altrimenti `Date.now()`.
 * @returns { stato: 'collegato'|'senza_pg'|'offline', testo, modificabile }
 */
export function rigaStatoTablet({ pg = null, collegamento }, dati) {
  const T = dati.regole.interfaccia.dispositivo;
  const adesso = collegamento.adesso ?? Date.now();
  if (!collegamento.ok) {
    const da = tempoTrascorso(adesso - (collegamento.ultimoOk ?? adesso));
    return { stato: 'offline', testo: T.testo_offline.replace('{tempo}', da), modificabile: false };
  }
  if (!pg) return { stato: 'senza_pg', testo: T.testo_senza_pg, modificabile: true };
  return { stato: 'collegato', testo: T.testo_collegato.replace('{nome}', pg.pgNome ?? 'il tuo personaggio').replace('{ora}', oraBreve(adesso)), modificabile: true };
}

/** Il motivo, da mettere nel titolo dei comandi spenti mentre si è offline. */
export const motivoOffline = (dati) => dati.regole.interfaccia.dispositivo.motivo_offline;

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
