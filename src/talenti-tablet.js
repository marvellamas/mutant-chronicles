// Talenti v1.0 (lotto 2, 25/10/2026): che cosa può scrivere sui Talenti chi NON è il PC del Direttore (un tablet).
// Lo controlla il server su ogni salvataggio (server.mjs → PUT /api/personaggi/<file>), non l'interfaccia:
//  - un file che sul disco è già nei Talenti nuovi (regimeTalenti = 2) non torna ai Talenti di prima. È il tablet
//    rimasto con la copia di prima della migrazione: risposta 409, la scheda si ricarica dal PC del Direttore e non
//    rimette i Talenti tolti;
//  - il passaggio ai Talenti nuovi e la chiusura delle scelte («talentiChiusiFino») li fa solo il Direttore;
//  - un posto chiuso dal Direttore non si cambia; una scelta nuova o cambiata dev'essere fra quelle ammesse
//    (postiTalenti → controllaSceltaTalento, il controllo unico). Le forzature le fa solo il Direttore.
// Funzione pura: i due file come oggetti (l'export di src/character.js → serializza).
import { postiTalenti, erroriScelteSuccessive } from './avanzamento.js';

const regime = (o) => (o?.scelte?.regimeTalenti === 2 ? 2 : null);
const chiusi = (o) => (Number.isInteger(o?.scelte?.talentiChiusiFino) ? o.scelte.talentiChiusiFino : null);
const personaggio = (o) => ({ creazione: o?.scelte ?? {}, livelli: Array.isArray(o?.livelli) ? o.livelli : [] });

/**
 * @param nuovo il file che il tablet vuole scrivere @param disco quello che c'è (null se il file è nuovo)
 * @returns {{ ok: true } | { ok: false, stato: 403 | 409, errore: string }}
 */
export function controllaTalentiDaTablet(nuovo, disco, dati) {
  if (!disco) return { ok: true };
  if (regime(disco) === 2 && regime(nuovo) !== 2) {
    return { ok: false, stato: 409, errore: 'Questa scheda è di prima del passaggio ai Talenti nuovi: si ricarica la versione del Direttore.' };
  }
  if (regime(disco) !== 2) {
    if (regime(nuovo) === 2) return { ok: false, stato: 403, errore: 'Il passaggio ai Talenti nuovi lo fa il Direttore.' };
    return { ok: true };
  }
  if (chiusi(nuovo) !== chiusi(disco)) return { ok: false, stato: 403, errore: 'Chiudere o riaprire la scelta dei Talenti lo fa il Direttore.' };
  let prima;
  let dopo;
  try {
    prima = postiTalenti(personaggio(disco), dati, { opzioni: false });
    dopo = postiTalenti(personaggio(nuovo), dati, { opzioni: false });
  } catch {
    return { ok: true }; // un file che non si calcola: lo dice la scheda, non si blocca il salvataggio
  }
  const chiave = (x) => `${x.categoria}:${x.livello}`;
  const primaPer = new Map(prima.posti.map((x) => [chiave(x), x]));
  for (const x of dopo.posti) {
    const v = primaPer.get(chiave(x));
    const uguale = JSON.stringify(v?.scelta ?? null) === JSON.stringify(x.scelta ?? null);
    if (uguale) continue;
    if (v?.chiuso) return { ok: false, stato: 403, errore: `La scelta del ${x.livello}° livello l’ha chiusa il Direttore: la cambia solo lui.` };
    if (x.scelta && !x.valida) {
      const motivo = x.problemi.find((e) => e.tipo === 'violazione')?.problema ?? 'scelta non ammessa';
      return { ok: false, stato: 403, errore: `${motivo}. Una scelta non ammessa la può fare solo il Direttore.` };
    }
  }
  // 25/10 sera: le scelte aperte da un Talento (Incantesimi, Tecniche Interiori) cambiate da un tablet devono essere ammesse
  // dalle regole del loro livello (controllaIncantesimi, controllaTecniche); le forzature le fa solo il Direttore
  const campi = ['incantesimi', 'tecniche', 'scuolaMishima'];
  const livelliNuovi = Array.isArray(nuovo?.livelli) ? nuovo.livelli : [];
  const livelliDisco = Array.isArray(disco?.livelli) ? disco.livelli : [];
  const cambiati = livelliNuovi.flatMap((v, i) => campi.filter((c) => JSON.stringify(v?.[c] ?? null) !== JSON.stringify(livelliDisco[i]?.[c] ?? null)).map((c) => `livelli[${i}].${c}`));
  if (cambiati.length) {
    let errori = [];
    try { errori = erroriScelteSuccessive(personaggio(nuovo), dati); } catch { return { ok: true }; }
    const e = errori.find((x) => x.tipo === 'violazione' && cambiati.includes(x.campo));
    if (e) return { ok: false, stato: 403, errore: `${e.problema}. Una scelta non ammessa la può fare solo il Direttore.` };
  }
  return { ok: true };
}
