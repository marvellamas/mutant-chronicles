// Attivazioni lunghe degli Artefatti (lotto 173, 05/11/2026): l'Anello con Rigenerazione 9 della configurazione approvata
// da Davide il 02/11/2026 (per-davide.md, sezione 7; Magia 1.11 §25.4). Funzioni pure.
//
// Magia §25.4: «La durata della celebrazione diventa il tempo di attivazione continua dell'oggetto: 3 ore per le versioni
// 9–10 […] Al completamento si consumano le risorse indicate dalla scheda e inizia il processo autonomo di rigenerazione.
// Un'interruzione precedente impedisce l'effetto senza consumare risorse.» E l'esempio dell'anello: riserva Verde dedicata
// da 5 CM, 5 CM per ogni utilizzo, il completamento richiede altri 5 giorni.
//
// L'app non ha un orologio: le tre ore le dice il tavolo. «Avvia» segna l'attivazione in corso (la riserva deve poter
// pagare l'uso intero, A.228), «3 ore compiute» consuma le CM e avvia la rigenerazione, «Interrotta» la chiude senza
// consumare né dare l'effetto. I dati: `attivazione_lunga` della voce del catalogo (artefatti.json).
import { allineaSessione, modificaSessione } from './sessione.js';

const arrotonda6 = (x) => Math.round(x * 1e6) / 1e6;

/** L'attivazione lunga di una voce del catalogo, o null. */
export const attivazioneLunga = (voce) => (voce?.attivazione_lunga && typeof voce.attivazione_lunga === 'object' ? voce.attivazione_lunga : null);

/** È in corso un'attivazione lunga su questo oggetto? */
export const inCorso = (sessione, uid) => Boolean(sessione?.attivazioniLunghe?.[uid]);

/**
 * «Avvia»: l'attivazione comincia; niente si consuma ancora. Serve la riserva piena dell'uso (5 CM per l'Anello): con
 * meno l'effetto non si potrebbe pagare al completamento (A.228: il residuo non paga un uso).
 * @returns {{ sessione, riga } | { errore }}
 */
export function avviaAttivazione(sessione, uid, att, m, { quando = null } = {}) {
  const s = allineaSessione(sessione, m);
  const c = s.chroma?.[uid];
  if (!att || !c) return { errore: 'l’oggetto non ha questa attivazione o la sua riserva' };
  if (inCorso(s, uid)) return { errore: `${att.nome}: attivazione già in corso` };
  if (c.pmAttuali + 1e-9 < att.cm) return { errore: `la riserva ha ${c.pmAttuali} CM, ne servono ${att.cm} al completamento` };
  const nuove = { ...(s.attivazioniLunghe ?? {}), [uid]: { id: att.id, ...(quando ? { avviata: quando } : {}) } };
  return { sessione: modificaSessione(s, { attivazioniLunghe: nuove }, m), riga: `${att.nome}: attivazione avviata (${att.ore} ore continue; le CM si consumano al completamento)` };
}

/**
 * «3 ore compiute»: si consumano le CM e parte la rigenerazione (i giorni successivi, senza altro contatto).
 * @returns {{ sessione, riga } | { errore }}
 */
export function completaAttivazione(sessione, uid, att, m) {
  const s = allineaSessione(sessione, m);
  if (!inCorso(s, uid)) return { errore: `${att?.nome ?? 'Attivazione'}: nessuna attivazione in corso` };
  const c = s.chroma?.[uid];
  if (!c || c.pmAttuali + 1e-9 < att.cm) return { errore: `la riserva ha ${c?.pmAttuali ?? 0} CM, ne servono ${att.cm}` };
  const { [uid]: _via, ...altre } = s.attivazioniLunghe;
  const chroma = { ...s.chroma, [uid]: { ...c, pmAttuali: Math.max(0, arrotonda6(c.pmAttuali - att.cm)) } };
  const dopo = att.giorni_dopo ? `; il completamento richiede altri ${att.giorni_dopo} giorni` : '';
  return { sessione: modificaSessione(s, { chroma, attivazioniLunghe: altre }, m), riga: `${att.nome}: ${att.ore} ore compiute, −${att.cm} CM, ${att.effetto_avviato ?? 'effetto avviato'}${dopo}` };
}

/** «Interrotta»: nessuna CM consumata, nessun effetto. */
export function interrompiAttivazione(sessione, uid, att, m) {
  const s = allineaSessione(sessione, m);
  if (!inCorso(s, uid)) return { errore: `${att?.nome ?? 'Attivazione'}: nessuna attivazione in corso` };
  const { [uid]: _via, ...altre } = s.attivazioniLunghe;
  return { sessione: modificaSessione(s, { attivazioniLunghe: altre }, m), riga: `${att.nome}: interrotta prima delle ${att.ore} ore, nessuna CM consumata e nessun effetto` };
}
