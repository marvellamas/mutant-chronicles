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

// A.200 (risposta di Davide del 30/10/2026): il minimo 0 vale per il BONUS BASE di Iniziativa, non per il totale. Ferite,
// condizioni e altri effetti continuano ad applicare le proprie penalità dopo il minimo, e il totale può essere negativo
// (il solo d10 con una Ferita Grave: −8 + d10). Restano valide le sequenze speciali (agire dopo l'evocatore).
import { descriviFerite } from './sessione.js';
import { condizioniAttive } from './condizioni.js';

/**
 * Le penalità (o i bonus) che si aggiungono alla base di Iniziativa di un nemico, dopo il minimo 0:
 * la penalità della Ferita attuale (Giocatore §5.14, regole.json → ferite) e gli Stati che hanno un effetto sull'Iniziativa.
 * @param p il partecipante dello scontro: { ferite, stati, intensita }
 * @returns {{ totale: number, voci: { etichetta: string, valore: number }[] }}
 */
export function modificatoreIniziativa(p, dati) {
  const voci = [];
  const ferita = descriviFerite(Number.isInteger(p?.ferite) ? p.ferite : 0, dati);
  if (ferita?.penalita) voci.push({ etichetta: ferita.come ? `Oltre Grave (malus di ${ferita.come})` : `Ferita ${ferita.nome}`, valore: ferita.penalita });
  const stati = condizioniAttive({ statiAttivi: Array.isArray(p?.stati) ? p.stati : [], intensitaStati: p?.intensita ?? {} }, dati);
  for (const c of stati) if (c.effetto?.iniziativa) voci.push({ etichetta: c.etichetta, valore: c.effetto.iniziativa });
  return { totale: voci.reduce((s, x) => s + x.valore, 0), voci };
}

/** La base di Iniziativa del nemico al momento del tiro: il valore di scheda (mai sotto 0) più le penalità attuali. */
export function baseIniziativaNemico(p, dati) {
  const minimo = iniziativaCreatura(p?.scheda?.iniziativa ?? p?.base ?? 0);
  const m = modificatoreIniziativa(p, dati);
  return { base: minimo + m.totale, minimo, modifica: m };
}
