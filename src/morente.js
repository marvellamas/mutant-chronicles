// Morente (Giocatore §5.14; A.159, risposta di Davide approvata il 14/10/2026). Funzioni pure.
//
// Superato Grave il personaggio non muore subito: entra in Morente, mantiene la penalità di Grave (−8),
// sviene e apre un contatore di Round pari alla COS intera. Il contatore cala di 1 per ogni Round passato
// e di 1 per ogni nuova Ferita; a 0 decide il master. Una cura che stabilizza riporta a Grave e lo spegne.
//
// Tutti i numeri stanno in data/regole.json → ferite.morente (nome, Stato acceso all'ingresso,
// Caratteristica del contatore, quanto cala, avviso a 0, vie di stabilizzazione).
//
// Forma leggera decisa con Marcello (CLAUDE.md: «l'app aiuta il tavolo e non lo rallenta»): il contatore si
// vede e si scala da sé col Round, «−1» e «Stabilizza» sono due tocchi, le vie approvate sono un promemoria
// di solo testo. Nessuna Prova automatica, nessuna procedura guidata, nessun blocco: a 0 è un avviso.
//
// Il contatore si salva come riferimento temporale, non come numero che qualcuno decrementa:
//   sessione.morente = { dal: Round d'ingresso, iniziale: COS, tolti?: Round levati dalle nuove Ferite e dal «−1» }
// I Round che restano si ricavano dal Round corrente (`roundRimasti`). Così la vista della sessione al Round
// dello scontro (src/round-scontro.js → alRound) resta idempotente e nessun Round si conta due volte.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const intero = (v, predefinito) => (Number.isInteger(v) ? v : predefinito);

/** Il blocco `ferite.morente` dei dati, o null se le regole non lo prevedono. */
export function regoleMorente(dati) {
  return isOggetto(dati?.regole?.ferite?.morente) ? dati.regole.ferite.morente : null;
}

/** Gradino di Ferita «oltre Grave» (1 = Superficiale): è quello che fa entrare in Morente. */
export function gradoMorente(dati) {
  return (dati?.regole?.ferite?.stati?.length ?? 0) + 1;
}

/**
 * Contatore iniziale: il valore intero effettivo della Caratteristica indicata dai dati (COS), non il
 * modificatore (A.159, punto 2). null se la scheda non ce l'ha: in quel caso il contatore non si apre.
 */
export function contatoreIniziale(scheda, dati) {
  const m = regoleMorente(dati);
  const sigla = m?.contatore?.caratteristica;
  if (!sigla) return null;
  const c = scheda?.caratteristiche?.[sigla];
  const v = isOggetto(c) ? c.valore : c;
  return Number.isInteger(v) && v > 0 ? v : null;
}

/**
 * Normalizza il blocco `morente` della sessione per le Ferite attuali.
 * @param morente blocco salvato (o niente)
 * @param ferite gradino di Ferita attuale
 * @param round Round corrente della sessione
 * @param m massimi di sessione: { ferite (gradino di Morente), cos, morente (le regole) }
 * @returns { dal, iniziale, tolti? } oppure null (non Morente, o regole/COS mancanti)
 */
export function allineaMorente(morente, ferite, round, m) {
  if (!m?.morente || ferite < m.ferite) return null; // sotto il gradino: non è Morente, il contatore si spegne
  const r = Number.isInteger(round) && round >= 1 ? round : 1;
  if (isOggetto(morente) && Number.isInteger(morente.iniziale) && morente.iniziale > 0) {
    const dal = Number.isInteger(morente.dal) && morente.dal >= 1 ? morente.dal : r;
    const tolti = Math.max(0, intero(morente.tolti, 0));
    return { dal, iniziale: morente.iniziale, ...(tolti ? { tolti } : {}) };
  }
  // ingresso: il contatore parte pieno (A.159 punto 3: le Ferite in eccesso dello stesso colpo non lo riducono)
  return Number.isInteger(m.cos) && m.cos > 0 ? { dal: r, iniziale: m.cos } : null;
}

/** Round che restano a un contatore, visti dal Round `round` (mai sotto 0). null se non è Morente. */
export function roundRimasti(morente, round) {
  if (!isOggetto(morente) || !Number.isInteger(morente.iniziale)) return null;
  const r = Number.isInteger(round) && round >= 1 ? round : 1;
  const passati = Math.max(0, r - (Number.isInteger(morente.dal) ? morente.dal : r));
  return Math.max(0, morente.iniziale - passati - Math.max(0, intero(morente.tolti, 0)));
}

/**
 * Stato da mostrare nella scheda e nella plancia.
 * @returns null se il personaggio non è Morente, altrimenti
 *   { nome, round, iniziale, morto, etichetta, avviso, promemoria, vie, paragrafo }
 */
export function statoMorente(sessione, dati) {
  const mo = isOggetto(sessione) ? sessione.morente : null;
  const R = regoleMorente(dati);
  if (!isOggetto(mo) || !R) return null;
  const round = roundRimasti(mo, sessione.round);
  const morto = round === 0;
  const unita = R.contatore?.unita ?? 'Round';
  return {
    nome: R.nome,
    round,
    iniziale: mo.iniziale,
    dal: mo.dal ?? null,
    morto,
    etichetta: `${R.contatore?.etichetta ?? R.nome} — ${round} ${unita}`,
    avviso: morto ? R.morto?.avviso ?? null : null,
    promemoria: R.promemoria_contatore ?? null,
    vie: Array.isArray(R.vie) ? R.vie : [],
    paragrafo: R.paragrafo ?? null,
  };
}

/**
 * Round da togliere al contatore per `n` nuove Ferite subite mentre si è già Morente (A.159, punto 3:
 * 1 Round per Ferita, non per punto di danno). Blocco aggiornato, oppure quello di prima se non cambia.
 */
export function togliRound(morente, n, dati) {
  const R = regoleMorente(dati);
  if (!isOggetto(morente) || !R || !Number.isInteger(n) || n < 1) return morente ?? null;
  const per = Number.isInteger(R.contatore?.per_ferita) ? R.contatore.per_ferita : 1;
  const tolti = Math.max(0, intero(morente.tolti, 0)) + n * per;
  return { ...morente, tolti };
}

/** Testo per il registro dello scontro e per il promemoria quando si entra in Morente. */
export function testoIngresso(nome, morente, dati) {
  const R = regoleMorente(dati);
  if (!isOggetto(morente) || !R) return null;
  return `${nome}: oltre Grave → ${R.nome}, ${morente.iniziale} ${R.contatore?.unita ?? 'Round'} per stabilizzarlo (${R.paragrafo ?? '§5.14'}).`;
}
