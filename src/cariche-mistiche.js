// Cariche Mistiche (revisione approvata da Davide il 02/11/2026, lotto 171). Funzioni pure.
//
// «Le riserve dedicate ai soli effetti di armi e oggetti si chiamano Cariche Mistiche (CM), con contatore CM attuali/CM
// massime: non alimentano Incantesimi e non sono prelevabili come PM personali. Il nome non cambia le cariche
// tecnologiche NEC, CEC, MEC o BEC.» Le Batterie Mistiche restano in PM.
//
// Tre cose diverse che al tavolo si confondono: i PM del personaggio, le CM di un oggetto, le cariche di un NEC. Qui
// solo l'unità e il costo di una riserva: chi mostra un valore lo scrive con la sua unità, chi spende scala soltanto la
// riserva dell'oggetto. I dati: contenitore.capacita_cm (data/equipaggiamento/artefatti.json), regole.json →
// chroma.cariche_mistiche.

/** Costo di un'attivazione o di un getto: { n, unita: 'CM' | 'PM' } (cm nei dati dal lotto 171, pm prima). */
export function costoRiserva(x) {
  if (Number.isInteger(x?.cm)) return { n: x.cm, unita: 'CM' };
  return { n: Number.isInteger(x?.pm) ? x.pm : 0, unita: 'PM' };
}

/** Un valore di riserva come si legge: interi così, frazioni con la virgola (A.228: 7,75 resta 7,75). */
export function numeroRiserva(n) {
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}

/** «4,2 / 6 CM» oppure «8 / 10 PM». */
export const testoRiserva = (n, capacita, unita = 'PM') => `${numeroRiserva(n)} / ${capacita} ${unita}`;

/** «1 CM», «2 PM». */
export const testoCosto = (c) => `${c.n} ${c.unita}`;

/** Il contenitore è in Cariche Mistiche? */
export const inCariche = (c) => c?.unita === 'CM';

/**
 * Quanti PM personali costa un gruppo di ricarica di questo contenitore (Magia sez. 6; revisione del 02/11/2026):
 * per le Batterie il rapporto (3:1 → 3 PM per PM), per le CM il rapporto × 2 (3:1 → 6 PM per CM). Un gruppo = 1 unità.
 */
export function pmPerGruppo(c, rapporto, dati) {
  const f = dati?.regole?.chroma?.cariche_mistiche?.ricarica?.fattore ?? 2;
  return inCariche(c) ? rapporto * f : rapporto;
}
