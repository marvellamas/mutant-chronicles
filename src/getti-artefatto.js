// Getto di fuoco e Doppio getto dei Guanti da Combattimento Mistico (scheda «Guanti mistici di Lucas» 1.0 del 31/10/2026;
// Armamenti 0.74 §7.24; Magia 1.11 §26.6.2). Proprietà attive Esclusive di un Artefatto, non incantesimi del catalogo
// (A.175): si pagano solo con la riserva interna, dal lotto 171 in Cariche Mistiche (Getto 3 CM, Doppio getto 6 CM, revisione
// del 02/11/2026); l'attivazione è automatica e non richiede Concentrazione; il Doppio getto aggiunge una Prova di Potere
// con −2 VA e consuma le 6 CM anche se fallisce. A.234: la Prova è Potere −2 con le penalità e i modificatori generali
// pertinenti, senza i benefici del lancio degli Incantesimi (Specializzazione Elementi, Potere Mistico): per questo la
// Prova parte dal VA dell'Abilità Potere della scheda e non dal calcolo di «Lancia!» (src/lancio.js).
// I numeri stanno nel catalogo (data/equipaggiamento/artefatti.json → getti_artefatto); qui solo il piano dell'uso.
// L'app avvisa, non blocca (principio del tavolo): ogni motivo è un avviso con «Procedi comunque».

import { costoRiserva, numeroRiserva } from './cariche-mistiche.js';

const base = (uid) => String(uid ?? '').split('#')[0];

/**
 * Mani occupate da armi e scudi in mano: un'arma a due mani vale 2, le altre 1, ogni scudo imbracciato 1 (i profili
 * d'attacco dello stesso oggetto contano una volta). I Guanti indossati occupano 0 mani.
 */
export function maniOccupate(scheda) {
  const armi = (scheda?.equipaggiamento?.armi ?? []).filter((a) => !a.senzArmi && !a.moduloDi);
  const visti = new Map();
  for (const a of armi) {
    const k = base(a.uid);
    visti.set(k, Math.max(visti.get(k) ?? 0, a.daScudo ? 1 : a.mani === 2 ? 2 : 1));
  }
  return Math.min(2, [...visti.values()].reduce((s, n) => s + n, 0));
}

/**
 * Piano di un getto prima di usarlo.
 * @param g la modalità del catalogo (getti_artefatto[i])
 * @param stato { pm: valore nella riserva interna (CM o PM, come la voce), sintonizzato, indossato, deposito }
 * @returns {{ costo: { n, unita }, motivi: string[], prova: { nome, va, scomposizione } | null, danni: string[], testo }}
 */
export function pianoGetto(g, scheda, stato = {}) {
  const motivi = [];
  if (stato.deposito) motivi.push('nel deposito comune');
  if (!stato.sintonizzato) motivi.push('non sintonizzato');
  if (!stato.indossato) motivi.push('non indossati');
  const libere = 2 - maniOccupate(scheda);
  if (libere < (g.mani_libere ?? 0)) motivi.push(`servono ${g.mani_libere === 2 ? 'entrambe le mani libere' : 'una mano libera'}, ne hai ${libere}`);
  const costo = costoRiserva(g);
  if ((stato.pm ?? 0) < costo.n) motivi.push(`la riserva ha ${numeroRiserva(stato.pm ?? 0)} ${costo.unita}, ne servono ${costo.n}`);
  let prova = null;
  if (g.prova_potere) {
    const a = (scheda?.abilita ?? []).find((x) => x.nome === g.prova_potere.abilita);
    const valore = a ? (a.effettivo ?? a.totale) : null;
    prova = valore === null ? null : {
      nome: `${g.nome}: Prova di ${g.prova_potere.abilita}`,
      va: valore + g.prova_potere.modificatore,
      scomposizione: [`${g.prova_potere.abilita} ${valore}`, `${g.nome} ${g.prova_potere.modificatore < 0 ? '−' : '+'}${Math.abs(g.prova_potere.modificatore)}`],
    };
  }
  const n = g.getti ?? 1;
  const area = g.area ? `linea ${g.area.lunghezza_q} × ${g.area.larghezza_q} Q` : '';
  const testo = `${n === 2 ? 'Due getti' : 'Un getto'}: ${area}; ${g.danno} danni (${[g.natura, ...(g.proprieta_danno ?? [])].filter(Boolean).join(', ')})${n === 2 ? ' ciascuno (un tiro di danno per getto)' : ''}.`;
  return { costo, motivi, prova, danni: Array.from({ length: n }, () => g.danno), testo };
}
