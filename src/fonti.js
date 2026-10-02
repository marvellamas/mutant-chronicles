// Fonti dei PM per un pagamento (Magia 1.3 §26.2, Armamenti 0.58 §7.5; regole.json → chroma.riserve).
// Funzioni pure.
// - Ogni riserva è Batteria (alimenta l'Artefatto ed è una fonte per gli Incantesimi compatibili del
//   personaggio) o Cariche (alimenta soltanto il proprio Artefatto). Le riserve a sé sono Batterie; le
//   integrate senza indicazione sono Cariche, come le schede anteriori alla distinzione (A.18).
// - Ogni proprietà infusa è Esclusiva (solo la riserva interna) o Universale (riserva interna, PM
//   personali o un'altra fonte esterna compatibile).
// - In un singolo lancio o attivazione si usa al massimo una riserva esterna, eventualmente integrata con
//   PM personali; la riserva dell'Artefatto è esterna rispetto al personaggio.
// Le Tecniche Interiori non passano di qui: si pagano solo con i PM personali (Giocatore §8.9.1).

const regole = (dati) => dati?.regole?.chroma?.riserve ?? null;

/** Tipo di riserva di un contenitore ({ integrato, riserva? }): 'batteria' o 'cariche'. */
export function tipoRiserva(c, dati) {
  if (!c) return null;
  if (!c.integrato) return 'batteria';
  return c.riserva ?? regole(dati)?.integrata_predefinita ?? 'cariche';
}

/** Alimentazione delle proprietà di un Artefatto con riserva integrata: 'esclusiva' o 'universale'. */
export function alimentazione(c, dati) {
  if (!c?.integrato) return null;
  return c.alimentazione ?? regole(dati)?.proprieta_predefinita ?? 'esclusiva';
}

/** La riserva paga anche gli Incantesimi personali? (Batteria sì, Cariche no) */
export function fontePerPg(c, dati) {
  const t = tipoRiserva(c, dati);
  return !!t && (regole(dati)?.tipi?.[t]?.fonte_per_pg ?? t === 'batteria');
}

/** Nome leggibile: «Batteria», «Cariche», «Esclusiva», «Universale». */
export const nomeRiserva = (t, dati) => regole(dati)?.tipi?.[t]?.nome ?? t;
export const nomeAlimentazione = (a, dati) => regole(dati)?.alimentazioni?.[a]?.nome ?? a;

/**
 * Controllo di un pagamento: { costo, personali, esterne: [{ uid, nome, pm }] }. Errori se le fonti esterne
 * superano il limite (una per pagamento), se la somma non coincide con il costo o se una quota è negativa.
 * Con `soloInterna` (proprietà Esclusiva) l'unica fonte ammessa è la riserva interna dell'oggetto (`interna`).
 * @returns {{ ok: boolean, errori: string[] }}
 */
export function validaPagamento({ costo, personali = 0, esterne = [], interna = null, soloInterna = false }, dati) {
  const R = regole(dati);
  const max = R?.fonti_esterne_per_pagamento ?? 1;
  const usate = esterne.filter((x) => x && x.pm > 0);
  const errori = [];
  if (usate.length > max) errori.push(`una sola fonte esterna per lancio o attivazione, eventualmente con PM personali (Magia §26.2): qui ${usate.map((x) => x.nome ?? x.uid).join(' e ')}`);
  if (personali < 0 || usate.some((x) => x.pm < 0)) errori.push('quote negative');
  const totale = personali + usate.reduce((s, x) => s + x.pm, 0);
  if (totale !== costo) errori.push(`le quote fanno ${totale} PM, il costo è ${costo}`);
  if (soloInterna && (personali > 0 || usate.some((x) => x.uid !== interna))) errori.push('proprietà Esclusiva: si paga soltanto con la riserva interna dell’Artefatto (Magia §26.2)');
  return { ok: !errori.length, errori };
}
