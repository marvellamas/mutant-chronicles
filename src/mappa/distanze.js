// Distanze nella scala della scena (A.225, risposta di Davide del 03/11/2026; lotto 172). Funzioni pure.
//
// «L'app conserva l'unità originale di ogni distanza e la converte nella scala della scena. Un Q Tattico equivale a 10 Q
// Base: da Q Base a Q Tattici si divide per 10, nel senso opposto si moltiplica per 10. Una misura già espressa nella scala
// della scena si usa direttamente, senza convertirla nuovamente. Esempio: un soffio di 12 × 1 Q Tattici diventa 120 × 10 Q
// Base. La conversione vale per movimento, portate e aree degli effetti. Si conservano le frazioni esatte, senza
// arrotondamenti che concedano distanza aggiuntiva. Gli ingombri convenzionali delle pedine seguono invece le dimensioni
// dichiarate per ciascuna scala.»
//
// Il rapporto non è scritto qui: viene dai metri per Q delle due scale (data/mappa.json → scale.elenco: 1,5 e 15 m).
// Ogni distanza ha la sua unità ('base' | 'tattica', gli id delle scale). Le regole per non sbagliare due volte:
//   - si converte in un punto solo, quando una distanza con la sua unità entra nella scena (inScala);
//   - una distanza che è già nella scala della scena (stessa unità) torna com'era, identica;
//   - un numero senza unità non si converte mai qui: chi lo passa deve dire in che unità è.
// Gli ingombri delle pedine non passano di qui (src/mappa/token.js: «spazio» in Q Base, «pedina_tattica» in Q Tattici).
import { scale, scalaDi } from './scala.js';

/** I metri di un Q nella scala `id` (dai dati). */
function metri(id, dati) {
  const s = scale(dati).find((x) => x.id === id);
  if (!s) throw new Error(`scala sconosciuta: ${id}`);
  return s.q_metri;
}

/**
 * Il valore `v` in unità `da` espresso nell'unità `a`, con la frazione esatta: 12 Q Tattici → 120 Q Base, 4 Q Base → 0,4 Q
 * Tattici. Si calcola come v × metri(da) / metri(a) e si toglie soltanto l'errore di macchina (al milionesimo, che non
 * concede distanza: 0,4000000000000001 → 0,4). Stessa unità: torna `v`, identico.
 */
export function converti(v, da, a, dati) {
  if (!Number.isFinite(v)) return v;
  if (da === a) return v;
  const x = (v * metri(da, dati)) / metri(a, dati);
  return Math.round(x * 1e6) / 1e6;
}

/** La distanza { valore, unita } nella scala della scena. */
export function inScala(d, scena, dati) {
  if (!d || !Number.isFinite(d.valore)) return null;
  return converti(d.valore, d.unita ?? 'base', scalaDi(scena, dati), dati);
}

/** Una distanza misurata sulla mappa (in Q della scena) espressa in Q Base, per le regole scritte in Q Base (gittate, «Attacca!»). */
export const inQBase = (q, scena, dati) => converti(q, scalaDi(scena, dati), 'base', dati);

/** Le misure di un template ({ raggio } | { lunghezza, larghezza }…) dall'unità `da` alla scala della scena. */
export function misureInScala(misure, da, scena, dati) {
  const a = scalaDi(scena, dati);
  return Object.fromEntries(Object.entries(misure ?? {}).map(([k, v]) => [k, converti(v, da, a, dati)]));
}

/**
 * Il movimento di un pezzo ({ passo, corsa, scatto } in unità `da`) nella scala della scena; null resta null (Corsa o
 * Scatto non consentiti). In Q Tattici un Passo di 4 Q Base vale 0,4 Q: la frazione resta, non diventa 1.
 */
export function movimentoInScala(m, da, scena, dati) {
  if (!m) return m;
  const a = scalaDi(scena, dati);
  const c = (v) => (v === null || v === undefined ? v : converti(v, da, a, dati));
  return { ...m, passo: c(m.passo), corsa: c(m.corsa), scatto: c(m.scatto), unita: a };
}

/** «12 Q Tattici», «120 Q Base», «0,4 Q Tattici» (nome della scala dai dati). */
export function testoDistanza(v, unita, dati) {
  const s = scale(dati).find((x) => x.id === unita);
  return `${String(v).replace('.', ',')} ${s?.nome ?? 'Q'}`;
}
