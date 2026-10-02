// Tecniche Interiori al tavolo: «Attiva» nella tab Poteri (Giocatore §8.9, §8.9.1; regole dei dati in
// tecniche_interiori.json → attivazione, costi e durate nelle schede). Funzioni pure.
//
// Regole comuni (§8.9.1), applicate qui e non nell'interfaccia:
// - il costo si paga solo con i PM personali (le batterie e le riserve di Chroma non pagano);
// - una sola attivazione per Round, reazioni comprese: il Round è il contatore della sessione
//   (`sessione.round`, avanzato a mano con «Nuovo Round»);
// - le durate in Round vanno dal Round R di attivazione alla fine del Round R + N; quelle in minuti,
//   ore o «fino all'interruzione» restano attive finché il giocatore non le termina; le istantanee
//   non restano attive (contano solo per il limite di una per Round);
// - se la riserva resta a 0 PM dopo l'azione, Svenuto (`attivazione.stato_a_zero_pm`) fino al
//   recupero di almeno 1 PM; con PM insufficienti la Tecnica non si attiva;
// - a Umanità 0 niente Tecniche dipendenti da Risorse Interiori (Giocatore §5.21);
// - nessuna Prova di Potere, salvo le eccezioni (Silenzio Mentale: promemoria, la PS è al tavolo).
// Sessione: round (≥ 1), ultimaTecnica { id, round } | null, tecnicheAttive [{ id, dal, al }]
// (al = ultimo Round in cui vale; null = finché non la si termina). «Annulla» è quello della
// sessione (l'ultima modifica): l'attivazione è una modifica sola.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const ARTICOLI_SCUOLE = { Sole: 'del Sole', Luna: 'della Luna', Terra: 'della Terra' };

/** Gruppo di una Tecnica (§8.9.2–8.9.4): titolo della sezione ed etichetta breve. */
export function gruppoTecnica(gruppo) {
  if (gruppo === 'generica') return { titolo: 'Tecniche generiche (§8.9.2)', etichetta: 'Generica' };
  if (gruppo === 'lottatore') return { titolo: 'Tecniche del Lottatore (§8.9.4)', etichetta: 'Lottatore' };
  const s = String(gruppo).replace(/^scuola:/, '');
  const nome = `Scuola ${ARTICOLI_SCUOLE[s] ?? s}`;
  return { titolo: `${nome} (§8.9.3)`, etichetta: nome };
}

/** Ordine dei gruppi come nel manuale: generiche, Scuole, Lottatore. */
export const ordineGruppo = (g) => (g === 'generica' ? 0 : g === 'lottatore' ? 2 : 1);

/** Il personaggio ha accesso alle Tecniche (Risorse Interiori, come Talento Libero o di Classe). */
export const haRisorseInteriori = (scheda) => (scheda?.tecnicheAmmesse ?? 0) > 0 || (scheda?.tecniche?.length ?? 0) > 0;

/** Scheda di una Tecnica del catalogo. */
export const tecnicaDi = (id, dati) => dati.tecniche_interiori?.tecniche?.find((t) => t.id === id) ?? null;

/** Costo in PM: fisso, oppure quello dell'opzione scelta (Imposizione della Mano Curativa). */
export function costoTecnica(t, opzione = 0) {
  if (Array.isArray(t?.opzioni_costo)) return t.opzioni_costo[opzione]?.pm ?? t.opzioni_costo[0]?.pm ?? 0;
  return Number.isInteger(t?.costo_pm) ? t.costo_pm : 0;
}

/** Round attuale della sessione (≥ 1). */
export const roundAttuale = (sessione) => (Number.isInteger(sessione?.round) && sessione.round >= 1 ? sessione.round : 1);

/** Ultimo Round in cui vale una Tecnica attivata nel Round `dal` (null: finché non la si termina). */
export function fineTecnica(t, dal) {
  if (t.durata_tipo === 'round') return dal + (t.durata_round ?? 0);
  return null;
}

/** Testo della durata di una Tecnica attiva: «fino alla fine del Round 5» o la durata della scheda. */
export function testoFine(t, attiva) {
  return attiva.al === null ? `${t.durata} (si termina a mano)` : `fino alla fine del Round ${attiva.al}`;
}

/**
 * Si può attivare la Tecnica ora? { possibile, motivo, costo, pm, pmDopo, svenimento, conferma,
 * potere, avvisi }. `motivo` blocca; `conferma` chiede una conferma esplicita (la riserva resta a 0).
 * @param scheda calcolaScheda con la sessione (tecniche, umanita, pm)
 * @param opz { opzione: indice di opzioni_costo, silenzioMentale: il personaggio è sotto Silenzio Mentale }
 */
export function statoAttivazione(scheda, sessione, t, dati, { opzione = 0, silenzioMentale = false } = {}) {
  const A = dati.tecniche_interiori?.attivazione ?? {};
  const costo = costoTecnica(t, opzione);
  const pm = Number.isInteger(sessione?.pmAttuali) ? sessione.pmAttuali : (scheda?.pm ?? 0);
  const round = roundAttuale(sessione);
  const pmDopo = pm - costo;
  const avvisi = [];
  let motivo = null;
  if (!(scheda?.tecniche ?? []).some((x) => x.id === t.id)) motivo = 'Tecnica non appresa';
  // Giocatore §5.21, §8.9.1: a Umanità 0 niente Risorse Interiori
  else if (scheda?.umanita && scheda.umanita.risorseInteriori === false) motivo = `Umanità ${scheda.umanita.valore}: le Tecniche dipendenti da Risorse Interiori non sono utilizzabili (§8.9.1, §5.21)`;
  else if (A.una_per_round !== false && sessione?.ultimaTecnica?.round === round) {
    const prima = tecnicaDi(sessione.ultimaTecnica.id, dati)?.nome ?? sessione.ultimaTecnica.id;
    motivo = `già attivata una Tecnica in questo Round (${prima}): una sola per Round, reazioni comprese (§8.9.1). «Nuovo Round» per la prossima`;
  } else if (pmDopo < 0) motivo = `PM personali insufficienti: servono ${costo}, ne hai ${pm}. Si usano solo i PM personali, non le batterie né le riserve di Chroma (§8.9.1)`;
  const svenimento = !motivo && costo > 0 && pmDopo === 0;
  if (svenimento) avvisi.push('La riserva resterà a 0 PM: dopo l’azione il personaggio è Svenuto fino al recupero di almeno 1 PM (§8.9.1).');
  const potere = silenzioMentale && A.silenzio_mentale
    ? `Sotto Silenzio Mentale: ${A.silenzio_mentale.testo} (${A.silenzio_mentale.fonte}). La PS si risolve al tavolo.`
    : 'Nessuna Prova di Potere (§8.9.1).';
  return { possibile: !motivo, motivo, costo, pm, pmDopo, round, svenimento, conferma: svenimento, potere, avvisi };
}

/**
 * Sessione dopo l'attivazione: PM personali scalati, Tecnica registrata per il limite del Round,
 * effetto attivo con la sua durata, Svenuto se la riserva resta a 0. null se non si può attivare.
 * La sessione va poi riportata nei limiti dal chiamante (modificaSessione in src/sessione.js).
 */
export function attivaTecnica(scheda, sessione, t, dati, opz = {}) {
  const st = statoAttivazione(scheda, sessione, t, dati, opz);
  if (!st.possibile) return null;
  const round = st.round;
  const attive = (Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : []).filter((x) => x.id !== t.id);
  // più applicazioni della stessa Tecnica non si sommano: la nuova sostituisce quella in corso
  if (t.durata_tipo !== 'istantanea') attive.push({ id: t.id, dal: round, al: fineTecnica(t, round) });
  const stato = dati.tecniche_interiori?.attivazione?.stato_a_zero_pm;
  const stati = Array.isArray(sessione?.statiAttivi) ? sessione.statiAttivi : [];
  return {
    ...sessione,
    pmAttuali: st.pmDopo,
    ultimaTecnica: { id: t.id, round },
    tecnicheAttive: attive,
    ...(st.svenimento && stato && !stati.includes(stato) ? { statiAttivi: [...stati, stato] } : {}),
  };
}

/** «Nuovo Round»: il contatore avanza e le Tecniche finite nel Round appena chiuso scadono. */
export function nuovoRound(sessione) {
  const round = roundAttuale(sessione) + 1;
  const attive = Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : [];
  return { ...sessione, round, tecnicheAttive: attive.filter((x) => x.al === null || x.al >= round) };
}

/** Tecniche che scadono passando al Round successivo (per l'avviso del pulsante). */
export function inScadenza(sessione) {
  const r = roundAttuale(sessione);
  return (Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : []).filter((x) => x.al !== null && x.al < r + 1);
}

/** Termina a mano una Tecnica attiva (durate in minuti, ore, fino all'interruzione). */
export function terminaTecnica(sessione, id) {
  const attive = Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : [];
  return { ...sessione, tecnicheAttive: attive.filter((x) => x.id !== id) };
}

/** Tecniche attive ripulite: Tecniche apprese, Round coerenti, una per id. */
export function allineaTecnicheAttive(v, idAmmessi = null) {
  const visti = new Set();
  return (Array.isArray(v) ? v : []).filter((x) => isOggetto(x) && typeof x.id === 'string' && Number.isInteger(x.dal) && x.dal >= 1
    && (x.al === null || (Number.isInteger(x.al) && x.al >= x.dal)) && (!idAmmessi || idAmmessi.includes(x.id)) && !visti.has(x.id) && visti.add(x.id))
    .map((x) => ({ id: x.id, dal: x.dal, al: x.al }));
}

/** Chiavi «tecnica:<id>» delle Tecniche attive, per gli effetti al tavolo (AR di Aura e Pelle, A.48). */
export const chiaviTecnicheAttive = (sessione) => (Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : []).map((x) => `tecnica:${x.id}`);
