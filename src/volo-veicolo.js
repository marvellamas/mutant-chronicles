// I mezzi che volano: a terra, decollo, stazionamento, volo (A.253, Davide 06/11/2026). Funzioni pure.
//
// «A terra la Neverlost non rulla e ha movimento 0. Il decollo verticale è una manovra complessa: 1 AzM + 1 AzP del
// pilota; normalmente non richiede prova, salvo spazio ristretto, attacco in corso o danni. Nel round di decollo sale
// in stazionamento senza spostamento orizzontale; dal round successivo usa i movimenti della scala tattica 8/16/24,
// senza convertirli in 80/160/240 sulla mappa terrestre: si passa alla scala tattica o si esce dalla mappa.
// L'atterraggio è una manovra complessa e conclude il movimento.»
//
// Il punto da non sbagliare è l'ultimo: **i movimenti in volo non si convertono**. La conversione della A.225 (una
// distanza conserva la sua unità e si converte nella scala della scena, lotto 172) e quella del lotto 149 valgono per
// tutto il resto, non qui: una nave in volo su una mappa in Q Base non ha un numero di quadretti, ha due strade.
// `movimentoInScena` lo dice; chi disegna il movimento non deve inventare un numero.
//
// Lo stato sta nel record del mezzo: `mezzo.volo = { stato: 'a_terra'|'stazionamento'|'in_volo', dal_round? }`.
// Le regole stanno in data/veicoli.json → `volo` (tools/lotti/lotto_182_mappa.mjs): nessun numero qui dentro.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const lista = (v) => (Array.isArray(v) ? v : []);

/** Il blocco `volo` dei dati dei veicoli. */
export const regoleVolo = (dati) => (isOggetto(dati?.veicoli?.volo) ? dati.veicoli.volo : null);

/** Il profilo è di un mezzo che vola? */
export const vola = (profilo) => profilo?.vola === true;

/** Gli stati previsti: [{ id, nome, mov_q, nota }]. */
export const statiVolo = (dati) => lista(regoleVolo(dati)?.stati);

/**
 * Lo stato di volo del mezzo: quello scritto nel record, o quello iniziale dei dati («a terra»).
 * A.253: lo stazionamento dura **il Round del decollo**; dal Round successivo il mezzo è in volo. Con `round` lo
 * stato si legge già così, senza che nessuno debba segnarlo a mano al tavolo.
 */
export function statoVolo(mezzo, dati, { round = null } = {}) {
  const R = regoleVolo(dati);
  const id = isOggetto(mezzo?.volo) && typeof mezzo.volo.stato === 'string' ? mezzo.volo.stato : null;
  const dal = dalRound(mezzo);
  const effettivo = id === 'stazionamento' && Number.isInteger(round) && Number.isInteger(dal) && round > dal ? 'in_volo' : id;
  const trovato = statiVolo(dati).find((s) => s.id === effettivo);
  return trovato ?? statiVolo(dati).find((s) => s.id === (R?.iniziale ?? 'a_terra')) ?? null;
}

/** Il Round da cui dura lo stato attuale, o null. */
export const dalRound = (mezzo) => (isOggetto(mezzo?.volo) && Number.isInteger(mezzo.volo.dal_round) ? mezzo.volo.dal_round : null);

/**
 * Il movimento del mezzo in questo stato, nella sua unità: `{ q, unita, motivo }`.
 *  - a terra e in stazionamento: **0 Q**, con il motivo (non rulla; sale senza spostamento orizzontale);
 *  - in volo: i Q dell'andatura, nell'unità della sua scala di combattimento.
 * Per un mezzo che non vola non cambia niente: torna null e vale il movimento di sempre (src/veicoli.js).
 */
export function movimentoVolo(profilo, mezzo, dati, { andatura = null, round = null } = {}) {
  if (!vola(profilo)) return null;
  const s = statoVolo(mezzo, dati, { round });
  if (!s) return null;
  if (Number.isInteger(s.mov_q)) return { q: s.mov_q, unita: profilo.volo_andature?.unita ?? profilo.scala_combattimento ?? 'base', stato: s.id, motivo: s.nota ?? null };
  const a = andatura ?? mezzo?.andatura ?? 'controllata';
  const per = profilo.volo_andature?.per_andatura ?? {};
  const q = Number.isFinite(per[a]) ? per[a] : null;
  return { q, unita: profilo.volo_andature?.unita ?? profilo.scala_combattimento ?? 'base', stato: s.id, andatura: a, motivo: s.nota ?? null };
}

/**
 * Il movimento del mezzo in una scena, con la regola che conta: **in volo i movimenti non si convertono**.
 * @returns {{ convertibile: true, q, unita }} quando la scena è già nella scala di combattimento del mezzo (o il mezzo
 *   è a terra, dove il movimento è 0 in qualunque scala);
 *   {{ convertibile: false, titolo, testo, valori, da, a, strade }} quando le scale sono diverse: nessun numero di
 *   quadretti, le due strade.
 */
export function movimentoInScena(profilo, mezzo, scalaScena, dati, { round = null } = {}) {
  const m = movimentoVolo(profilo, mezzo, dati, { round });
  if (!m) return null;
  // a terra e in stazionamento il movimento è 0: nessuna conversione da fare, in nessuna scala
  if (m.q === 0) return { convertibile: true, q: 0, unita: scalaScena, stato: m.stato, motivo: m.motivo };
  if (m.unita === scalaScena) return { convertibile: true, q: m.q, unita: scalaScena, stato: m.stato, andatura: m.andatura };
  const S = regoleVolo(dati)?.senza_conversione ?? {};
  const per = profilo.volo_andature?.per_andatura ?? {};
  return {
    convertibile: false,
    stato: m.stato,
    da: m.unita,
    a: scalaScena,
    // i valori restano nella loro unità: non si convertono e non si mostra un numero di quadretti della scena
    valori: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v])),
    titolo: S.titolo ?? 'I movimenti in volo non si convertono',
    testo: S.testo ?? 'In volo la nave usa i movimenti della sua scala di combattimento, che su questa mappa non si convertono (A.253).',
    strade: lista(S.strade),
  };
}

/**
 * Il decollo verticale: manovra complessa, 1 AzM + 1 AzP del pilota, normalmente senza prova. `casi` sono i casi
 * dichiarati dal Direttore fra quelli dei dati (spazio ristretto, attacco in corso, danni): con almeno uno la prova
 * serve. Nel Round del decollo la nave sale in stazionamento, senza spostamento orizzontale.
 * @returns {{ mezzo, azioni, prova, testo }} oppure { errore }
 */
export function decolla(mezzo, profilo, dati, { round = null, casi = [] } = {}) {
  if (!vola(profilo)) return { errore: 'questo mezzo non vola' };
  const R = regoleVolo(dati);
  const D = R?.decollo;
  if (!D) return { errore: 'le regole del decollo non sono nei dati' };
  const s = statoVolo(mezzo, dati);
  if (s?.id !== 'a_terra') return { errore: `${profilo.nome ?? 'il mezzo'} non è a terra: è ${(s?.nome ?? '—').toLowerCase()}` };
  const ammessi = lista(D.prova_nei_casi).map((c) => c.id);
  const dichiarati = lista(casi).filter((c) => ammessi.includes(c));
  const nomi = lista(D.prova_nei_casi).filter((c) => dichiarati.includes(c.id)).map((c) => c.nome);
  return {
    mezzo: { ...mezzo, volo: { stato: D.porta_a ?? 'stazionamento', ...(Number.isInteger(round) ? { dal_round: round } : {}) } },
    azioni: { ...(D.azioni ?? {}), testo: D.testo_azioni ?? null },
    prova: dichiarati.length ? { serve: true, casi: dichiarati, nomi } : { serve: false, casi: [], nomi: [] },
    testo: `${D.nome ?? 'Decollo'}: ${D.testo_azioni ?? ''}. ${dichiarati.length ? `Serve una prova: ${nomi.join(', ')}.` : 'Nessuna prova.'} Nel Round del decollo ${D.nel_round ?? 'sale in stazionamento'}.`.replace(/\s+/g, ' ').trim(),
  };
}

/** Dal Round successivo al decollo la nave è in volo (lo stazionamento dura il Round del decollo). */
export function finisciStazionamento(mezzo, profilo, dati, { round = null } = {}) {
  if (!vola(profilo)) return { errore: 'questo mezzo non vola' };
  if (statoVolo(mezzo, dati)?.id !== 'stazionamento') return { errore: 'il mezzo non è in stazionamento' };
  return { mezzo: { ...mezzo, volo: { stato: 'in_volo', ...(Number.isInteger(round) ? { dal_round: round } : {}) } } };
}

/**
 * L'atterraggio: manovra complessa che **conclude il movimento** del Round.
 * @returns {{ mezzo, concludeMovimento, testo }} oppure { errore }
 */
export function atterra(mezzo, profilo, dati, { round = null } = {}) {
  if (!vola(profilo)) return { errore: 'questo mezzo non vola' };
  const A = regoleVolo(dati)?.atterraggio;
  if (!A) return { errore: 'le regole dell’atterraggio non sono nei dati' };
  const s = statoVolo(mezzo, dati);
  if (s?.id === 'a_terra') return { errore: `${profilo.nome ?? 'il mezzo'} è già a terra` };
  return {
    mezzo: { ...mezzo, volo: { stato: A.porta_a ?? 'a_terra', ...(Number.isInteger(round) ? { dal_round: round } : {}) } },
    concludeMovimento: A.conclude_movimento === true,
    testo: A.testo ?? 'L’atterraggio è una manovra complessa e conclude il movimento del Round.',
  };
}

/** La riga da scrivere nella scheda e sulla mappa: «A terra · movimento 0 Q» o «In volo · 8 Q Tattici (Controllata)». */
export function testoVolo(profilo, mezzo, dati, { round = null } = {}) {
  const m = movimentoVolo(profilo, mezzo, dati, { round });
  if (!m) return null;
  const s = statoVolo(mezzo, dati, { round });
  const unita = dati?.mappa?.scale?.elenco?.find((x) => x.id === m.unita)?.nome ?? 'Q';
  return m.q === 0 ? `${s?.nome ?? '—'} · movimento 0 Q` : `${s?.nome ?? '—'} · ${m.q} ${unita}${m.andatura ? ` (${m.andatura})` : ''}`;
}
