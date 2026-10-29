// L'Iniziativa delle creature non è mai negativa (Manuale dei Mostri 0.46 §4, ricognizione del 28/10/2026): «si tira 1d10 e si
// aggiunge il bonus positivo indicato; una Caratteristica bassa non produce un malus di base; INI 0 indica il solo d10».
// È un calcolo, non un dato: vale per ogni nemico, anche per quelli creati dopo e per i file salvati prima (nemici/ del
// master, bozze di scontro). Funzioni pure.

/** L'Iniziativa di una creatura: il valore indicato, ma mai sotto 0. */
export const iniziativaCreatura = (valore) => (Number.isFinite(Number(valore)) ? Math.max(0, Math.trunc(Number(valore))) : 0);

/** Il nemico con l'Iniziativa resa non negativa (una copia; lo stesso oggetto se non serve). */
export function conIniziativaCreatura(nemico) {
  if (!nemico || typeof nemico !== 'object' || !Number.isFinite(nemico.iniziativa) || nemico.iniziativa >= 0) return nemico;
  return { ...nemico, iniziativa: 0 };
}
