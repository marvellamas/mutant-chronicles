// Modificatori temporanei di Caratteristica (richiesta del primo playtest, 05/10/2026): un bonus o malus dato dal
// master a una Caratteristica, per una durata. Si ripercuote a cascata su ciò che ne deriva (src/avanzamento.js →
// schedaARiposo con la sessione: Abilità, Difese, Prove Salvezza, Iniziativa, bonus al danno, carico), mai sui valori
// a riposo né sulla stampa; i PV e PM massimi solo se regole.json → caratteristiche_temporanee.massimi_pv_pm.
// sessione.caratteristicheTemporanee: [{ sigla, valore, numero, unita, dal, al }], una riga per Caratteristica;
// unita da regole.json (round, minuti, ore, giorni). Con i Round: dal = Round in cui si è impostato, al = ultimo
// Round in cui vale (dal + numero − 1), e scade con il contatore della scheda o dello scontro come le Tecniche
// (src/tecniche.js → nuovoRound, src/round-scontro.js); minuti, ore e giorni sono promemoria (al = null). Pure.

import { caratteristicaDanno } from './calc.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const regoleTemporanei = (dati) => dati?.regole?.caratteristiche_temporanee ?? null;

const fineRound = (dal, numero) => dal + numero - 1;

/** Righe ripulite: Caratteristiche esistenti, valore entro i limiti (0 = nessun modificatore), durata valida. */
export function normalizzaTemporanei(lista, R, sigle = null) {
  if (!Array.isArray(lista) || !R) return [];
  const unita = new Set(R.unita.map((u) => u.id));
  const visti = new Set();
  return lista.filter(isOggetto).flatMap((x) => {
    if (typeof x.sigla !== 'string' || visti.has(x.sigla) || (sigle && !sigle.includes(x.sigla))) return [];
    const valore = Number.isInteger(x.valore) ? Math.max(R.minimo, Math.min(R.massimo, x.valore)) : 0;
    if (!valore) return [];
    visti.add(x.sigla);
    const u = unita.has(x.unita) ? x.unita : R.unita[0].id;
    const numero = Number.isInteger(x.numero) && x.numero >= 1 ? x.numero : 1;
    const dal = Number.isInteger(x.dal) && x.dal >= 1 ? x.dal : 1;
    const perRound = R.unita.find((y) => y.id === u)?.round === true;
    return [{ sigla: x.sigla, valore, numero, unita: u, dal, al: perRound ? fineRound(dal, numero) : null }];
  });
}

const roundDi = (sessione) => (Number.isInteger(sessione?.round) && sessione.round >= 1 ? sessione.round : 1);

/** − / + accanto alla Caratteristica: nuova riga (durata predefinita dei dati) o valore cambiato; 0 la toglie. */
export function variaTemporaneo(sessione, sigla, delta, R) {
  const lista = normalizzaTemporanei(sessione?.caratteristicheTemporanee, R);
  const x = lista.find((y) => y.sigla === sigla);
  if (!x) {
    const d = R.durata_predefinita ?? { numero: 1, unita: R.unita[0].id };
    return normalizzaTemporanei([...lista, { sigla, valore: delta, numero: d.numero, unita: d.unita, dal: roundDi(sessione) }], R);
  }
  return normalizzaTemporanei(lista.map((y) => (y.sigla === sigla ? { ...y, valore: y.valore + delta } : y)), R);
}

/** Durata: numero (− / +) e unità (tendina); con i Round la fine si ricalcola dal Round d'inizio. */
export function durataTemporaneo(sessione, sigla, { numero, unita }, R) {
  return normalizzaTemporanei(normalizzaTemporanei(sessione?.caratteristicheTemporanee, R)
    .map((y) => (y.sigla === sigla ? { ...y, ...(numero !== undefined ? { numero } : {}), ...(unita !== undefined ? { unita } : {}) } : y)), R);
}

export const togliTemporaneo = (sessione, sigla, R) => normalizzaTemporanei(sessione?.caratteristicheTemporanee, R).filter((y) => y.sigla !== sigla);

/** Righe ancora valide al Round `r` (quelle a tempo restano finché non si tolgono). */
export const valideAlRound = (lista, r) => (Array.isArray(lista) ? lista : []).filter((x) => x.al === null || x.al === undefined || x.al >= r);

/** Modificatori attivi per sigla: { FOR: +2 } (solo le righe valide al Round della sessione). */
export function modificatoriAttivi(sessione, dati) {
  const R = regoleTemporanei(dati);
  const out = {};
  for (const x of valideAlRound(normalizzaTemporanei(sessione?.caratteristicheTemporanee, R), roundDi(sessione))) out[x.sigla] = x.valore;
  return out;
}

const segnato = (v) => (v < 0 ? `−${-v}` : `+${v}`);
/** «FOR +2 (fino al Round 5)» o «DES −1 (2 ore)»: testo di una riga (plancia, stampa, avvisi). */
export function testoTemporaneo(x, R) {
  const u = R.unita.find((y) => y.id === x.unita);
  const durata = u?.round ? `fino al Round ${x.al}` : `${x.numero} ${x.numero === 1 ? u?.singolare ?? u?.nome : u?.nome}`;
  return `${x.sigla} ${segnato(x.valore)} (${durata})`;
}

/** Testi dei modificatori attivi della sessione. */
export function testiTemporanei(sessione, dati) {
  const R = regoleTemporanei(dati);
  if (!R) return [];
  return valideAlRound(normalizzaTemporanei(sessione?.caratteristicheTemporanee, R), roundDi(sessione)).map((x) => testoTemporaneo(x, R));
}

/**
 * Che cosa deriva da una Caratteristica, dai dati (abilita.json, caratteristiche.json → salvezze, regole.json →
 * iniziativa, danno_caratteristica, carico, PV/PM): righe di testo per il tooltip e per la documentazione.
 */
export function derivatiDi(sigla, dati) {
  const r = dati.regole;
  const out = [];
  const abil = (dati.abilita?.abilita ?? []).filter((a) => a.caratteristica === sigla).map((a) => a.nome);
  if (abil.length) out.push(`Abilità: ${abil.join(', ')}`);
  const ps = (dati.caratteristiche?.salvezze ?? []).filter((s) => s.caratteristica === sigla).map((s) => s.nome);
  if (ps.length) out.push(`Prova Salvezza: ${ps.join(', ')}`);
  if ((r.iniziativa?.caratteristiche ?? []).includes(sigla)) out.push('Iniziativa');
  // §5.13: la Caratteristica del bonus al danno è quella dell'Abilità d'attacco, salvo le eccezioni dei dati
  const D = r.danno_caratteristica ?? {};
  const attacco = (dati.abilita?.abilita ?? []).filter((a) => ['Ravvicinato', 'Distanza'].includes(a.categoria) && a.nome !== 'Difese')
    .filter((a) => caratteristicaDanno(a.nome, dati) === sigla).map((a) => a.nome);
  const danno = [...attacco, D.senz_armi === sigla ? 'senz’armi' : null, D.magia === sigla ? 'Incantesimi' : null].filter(Boolean);
  if (danno.length) out.push(`Bonus al danno: ${danno.join(', ')}`);
  if (r.carico?.caratteristica === sigla) out.push('Carico trasportabile');
  const T = regoleTemporanei(dati);
  if (T?.massimi_pv_pm && sigla === 'COS') out.push('PV massimi');
  if (T?.massimi_pv_pm && sigla === 'SAG') out.push('PM massimi');
  return out;
}
