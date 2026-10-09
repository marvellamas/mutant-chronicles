// Artefatti consumabili (Manuale della Magia §27, Doc dell'08/10/2026): pergamene e altri supporti monouso con una
// versione definita di un Incantesimo. Funzioni pure; le regole e la tabella per Grado stanno in
// data/equipaggiamento/artefatti.json → consumabili, le schede nel catalogo (famiglia «Consumabili»).
// - §27.1: SnT 0, niente sintonizzazione; Cariche Esclusive sigillate, che non sono una riserva del PG (non entrano in
//   contenitori(): niente prelievo, niente Batteria, A.20 e A.112 restano come sono).
// - §27.1, §27.4: si usa con l'atto della scheda (1 AzP per le pergamene in combattimento, minuti oppure ore per le
//   altre) e se ne sottrae una solo al completamento: «Usa» toglie un esemplare dalla quantità dell'Inventario; un'
//   attivazione interrotta non consuma nulla. Con l'ultimo esemplare la voce sparisce.
// - §27.1: durata, Concentrazione e limiti sono quelli dell'Incantesimo infuso: un effetto a durata entra fra gli
//   «Incantesimi in corso» come un lancio (src/durate-incantesimi.js).
// - §27.2: creazione = supporto + reagenti del Grado; PM = 3 × Grado di lavoro + PM sigillati; Magistrale dimezza
//   (per eccesso) PM di lavoro e reagenti.
import { catalogo, risolvi, normalizzaEquipaggiamento } from './equipaggiamento.js';

const NUMERI_ROMANI = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** Regole del §27 (artefatti.json → consumabili), o null. */
export function regoleConsumabili(dati) {
  return dati?.equipaggiamento?.file?.artefatti?.consumabili ?? null;
}

/** Riga della tabella del §27.2 per un Grado («I»…«VI»), o null. */
export function rigaGrado(grado, dati) {
  return (regoleConsumabili(dati)?.gradi ?? []).find((g) => g.grado === grado) ?? null;
}

/** §24.2: Grado della versione di un Incantesimo dal suo livello (1–3 I … 18 VI), o null. */
export function gradoVersione(livello, dati) {
  return (regoleConsumabili(dati)?.gradi ?? []).find((g) => livello >= g.livelli[0] && livello <= g.livelli[1])?.grado ?? null;
}

/**
 * Costi di creazione di un Consumabile (§27.2), con il progetto già disponibile e senza manodopera esterna:
 * { grado, supporto, reagenti, creazione (cr dei materiali), vendita, reperibilita, pmLavoro, pmSigillati, pmTotali }.
 * Con `magistrale` PM di lavoro e reagenti si dimezzano per eccesso; supporto e PM sigillati restano interi.
 * `supporto`: costo di un supporto diverso dalla pergamena standard (§27.2: dipende dalla costruzione effettiva).
 */
export function costiCreazione({ grado, pmSigillati, magistrale = false, supporto = null }, dati) {
  const R = regoleConsumabili(dati);
  const g = rigaGrado(grado, dati);
  if (!R || !g || !Number.isInteger(pmSigillati)) return null;
  const n = NUMERI_ROMANI.indexOf(grado) + 1;
  const dimezza = (x, campo) => (magistrale && R.magistrale?.dimezza?.includes(campo) ? Math.ceil(x / 2) : x);
  const pmLavoro = dimezza(R.pm_lavoro_per_grado * n, 'pm_lavoro');
  const reagenti = dimezza(g.reagenti, 'reagenti');
  const costoSupporto = Number.isInteger(supporto) ? supporto : R.supporto.costo;
  return {
    grado, supporto: costoSupporto, reagenti, creazione: costoSupporto + reagenti,
    vendita: (costoSupporto + g.reagenti) * R.vendita_moltiplicatore, reperibilita: g.reperibilita,
    pmLavoro, pmSigillati, pmTotali: pmLavoro + pmSigillati, ore: R.supporto.ore,
  };
}

/** Dati di consumabile di una voce risolta (catalogo), o null. */
export const consumabileDi = (r) => r?.def?.artefatto?.consumabile ?? null;

/**
 * Attivazione in parole e in combattimento (§27.1: l'atto della scheda): { testo, inRound, motivo }.
 * Solo un'attivazione in AzP si compie in un Round; minuti e ore no («Fuori dal combattimento» se la scheda lo dice).
 */
export function attivazioneConsumabile(c) {
  const a = c?.attivazione ?? {};
  if (Number.isInteger(a.azp)) return { testo: a.testo ?? `${a.azp} AzP`, azp: a.azp, inRound: true, motivo: null };
  return { testo: a.testo ?? '—', azp: 0, inRound: false, motivo: a.fuori_combattimento ? 'si usa fuori dal combattimento' : `richiede ${a.testo ?? 'tempo'}: non si completa in un Round` };
}

/**
 * Consumabili del personaggio: { uid, nome, quantita, deposito, consumabile, attivazione, def }. I consumabili nel
 * deposito comune compaiono, ma non si usano (non sono con sé).
 */
export function consumabiliMistici(voci, dati) {
  const cat = catalogo(dati);
  return normalizzaEquipaggiamento(voci).map((v) => risolvi(v, cat)).filter((r) => consumabileDi(r))
    .map((r) => ({ uid: r.uid, nome: r.nome, quantita: r.voce.quantita ?? 1, deposito: r.deposito, consumabile: consumabileDi(r), attivazione: attivazioneConsumabile(consumabileDi(r)), def: r.def }));
}

/**
 * Perché non si può usare ora, o null: non è un consumabile, è nel deposito, oppure (in un Round, cioè in uno
 * scontro) l'attivazione non è in AzP.
 */
export function motivoNonUsabile(x, { inScontro = false } = {}) {
  if (!x) return 'nessun consumabile';
  if (x.deposito) return 'è nel deposito comune: va preso con sé';
  if (inScontro && !x.attivazione.inRound) return x.attivazione.motivo;
  return null;
}

/**
 * «Usa» completato (§27.1, §27.4): toglie un esemplare dalla voce `uid`; con l'ultimo la voce sparisce. Restituisce
 * { voci, rimasti, esaurito } oppure null se la voce non è un consumabile utilizzabile.
 */
export function usaConsumabile(voci, uid, dati, opz = {}) {
  const lista = normalizzaEquipaggiamento(voci);
  const x = consumabiliMistici(lista, dati).find((c) => c.uid === uid);
  if (!x || motivoNonUsabile(x, opz)) return null;
  const rimasti = x.quantita - 1;
  return {
    voci: rimasti > 0 ? lista.map((v) => (v.uid === uid ? { ...v, quantita: rimasti } : v)) : lista.filter((v) => v.uid !== uid),
    rimasti, esaurito: rimasti === 0,
  };
}

/** Incantesimo infuso di un consumabile, dai dati della Magia, o null. */
export function incantesimoDi(c, dati) {
  return (dati?.incantesimi?.incantesimi ?? []).find((i) => i.nome === c?.incantesimo) ?? null;
}
