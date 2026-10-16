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
//   sessione.morente = { dal: Round d'ingresso, turno?: posizione d'Iniziativa d'ingresso, iniziale: COS
//                         (null se la COS manca), tolti?: Round levati dalle nuove Ferite e dal «−1» }
// A.164 (16/10/2026): la stessa condizione vale per i nemici del Tavolo del Direttore, con due precisazioni
// che valgono anche per i PG: il primo decremento avviene **dopo un Round completo**, alla stessa posizione
// d'Iniziativa dell'ingresso (per questo si salva anche il turno); e se manca la COS l'app lo segnala e
// chiede al Direttore di inserirla — non la ricava da Tempra o PV, non la tratta come 0 e non dichiara
// morto nessuno. Inserendola a scontro in corso contano i Round già trascorsi dall'ingresso.
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
  if (isOggetto(morente) && (Number.isInteger(morente.iniziale) || morente.iniziale === null)) {
    const dal = Number.isInteger(morente.dal) && morente.dal >= 1 ? morente.dal : r;
    const tolti = Math.max(0, intero(morente.tolti, 0));
    // A.164: la COS arrivata dopo vale da adesso, ma i Round già trascorsi dall'ingresso contano lo stesso
    const iniziale = Number.isInteger(morente.iniziale) && morente.iniziale > 0 ? morente.iniziale
      : (Number.isInteger(m.cos) && m.cos > 0 ? m.cos : null);
    return { dal, ...(Number.isInteger(morente.turno) ? { turno: morente.turno } : {}), iniziale, ...(tolti ? { tolti } : {}) };
  }
  // ingresso: il contatore parte pieno (A.159 punto 3: le Ferite in eccesso dello stesso colpo non lo riducono).
  // A.164: senza COS il contatore si apre lo stesso, con il dato da completare.
  return { dal: r, iniziale: Number.isInteger(m.cos) && m.cos > 0 ? m.cos : null };
}

/**
 * A.159/A.164: contatore nuovo all'ingresso in Morente, con il Round e la posizione d'Iniziativa di allora.
 * `cos` null o mancante: il contatore si apre lo stesso e l'app chiede il dato (mai 0, mai morto).
 */
export function apriMorente({ round = 1, turno = null, cos = null } = {}) {
  return {
    dal: Number.isInteger(round) && round >= 1 ? round : 1,
    ...(Number.isInteger(turno) ? { turno } : {}),
    iniziale: Number.isInteger(cos) && cos > 0 ? cos : null,
  };
}

/** A.164: la COS inserita dal Direttore a scontro in corso; i Round già trascorsi restano contati. */
export function conCos(morente, cos) {
  if (!isOggetto(morente) || !Number.isInteger(cos) || cos <= 0) return morente ?? null;
  return { ...morente, iniziale: cos };
}

/**
 * Round interi trascorsi dall'ingresso in Morente (A.164): il primo si compie alla stessa posizione
 * d'Iniziativa dell'ingresso, quindi nel Round successivo conta solo da quella posizione in poi. Senza il
 * turno d'ingresso o senza quello attuale si conta il cambio di Round, come prima.
 */
export function roundTrascorsi(morente, round, turno = null) {
  const r = Number.isInteger(round) && round >= 1 ? round : 1;
  const dal = Number.isInteger(morente?.dal) ? morente.dal : r;
  const giri = Math.max(0, r - dal);
  if (!giri) return 0;
  const t0 = morente?.turno;
  if (!Number.isInteger(t0) || !Number.isInteger(turno)) return giri;
  return turno < t0 ? giri - 1 : giri;
}

/**
 * Round che restano a un contatore, visti dal Round `round` (e, se si sa, dalla posizione d'Iniziativa
 * `turno`). Mai sotto 0. null se non è Morente o se la COS manca ancora (A.164).
 */
export function roundRimasti(morente, round, turno = null) {
  if (!isOggetto(morente) || !Number.isInteger(morente.iniziale)) return null;
  return Math.max(0, morente.iniziale - roundTrascorsi(morente, round, turno) - Math.max(0, intero(morente.tolti, 0)));
}

/**
 * Stato da mostrare nella scheda e nella plancia.
 * @returns null se il personaggio non è Morente, altrimenti
 *   { nome, round, iniziale, morto, etichetta, avviso, promemoria, vie, paragrafo }
 */
export function statoMorente(sessione, dati, { turno = null, round = null } = {}) {
  const mo = isOggetto(sessione) ? sessione.morente : null;
  const R = regoleMorente(dati);
  if (!isOggetto(mo) || !R) return null;
  const r = Number.isInteger(round) ? round : sessione.round;
  const rimasti = roundRimasti(mo, r, turno);
  // A.164: senza COS non si conta nulla e non si dichiara morto nessuno: si chiede il dato
  const cosMancante = rimasti === null;
  const morto = rimasti === 0;
  const unita = R.contatore?.unita ?? 'Round';
  return {
    nome: R.nome,
    round: rimasti,
    iniziale: mo.iniziale ?? null,
    dal: mo.dal ?? null,
    turno: Number.isInteger(mo.turno) ? mo.turno : null,
    trascorsi: roundTrascorsi(mo, r, turno),
    cosMancante,
    morto,
    etichetta: cosMancante
      ? `${R.contatore?.etichetta ?? R.nome} — ${R.cos_mancante?.etichetta ?? 'COS da inserire'}`
      : `${R.contatore?.etichetta ?? R.nome} — ${rimasti} ${unita}`,
    avviso: cosMancante ? R.cos_mancante?.avviso ?? null : morto ? R.morto?.avviso ?? null : null,
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

/**
 * A.164: lo stato di Morente di un nemico dello scontro (il contatore sta nel partecipante). I Round che
 * restano si contano sul Round e sulla posizione d'Iniziativa dello scontro.
 */
export function statoMorenteNemico(p, scontro, dati) {
  if (!isOggetto(p?.morente)) return null;
  return statoMorente({ morente: p.morente, round: scontro?.round ?? 1 }, dati, { turno: Number.isInteger(scontro?.turno) ? scontro.turno : null });
}
