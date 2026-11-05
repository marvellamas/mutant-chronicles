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

/**
 * A.228 (Davide, 02/11/2026): una riserva con la frazione si legge come cariche intere più il residuo, che resta per i
 * calcoli e la ricarica ma non paga un uso: 7,75 → { intere: 7, residuo: 0,75 }. Il residuo al centesimo **per difetto**
 * (6,6666 → 0,66): mostrare 0,67 farebbe credere a una frazione che non c'è.
 */
export function partiRiserva(n) {
  if (!Number.isFinite(n)) return null;
  const intere = Math.floor(n + 1e-9);
  const residuo = Math.floor((n - intere) * 100 + 1e-6) / 100;
  return { intere, residuo: residuo > 0 ? residuo : 0 };
}

const virgola = (x) => x.toLocaleString('it-IT', { maximumFractionDigits: 2 });

/**
 * Un valore di riserva come si legge (lotto 173, A.228): gli interi così («4»); con la frazione le unità intere e il
 * residuo, «4 e 0,2»: si vede subito che gli usi pieni sono 4 e che lo 0,2 avanza. Sotto l'unità solo il residuo («0,75»).
 */
export function numeroRiserva(n) {
  const p = partiRiserva(n);
  if (!p) return '—';
  if (!p.residuo) return String(p.intere);
  return p.intere ? `${p.intere} e ${virgola(p.residuo)}` : virgola(p.residuo);
}

/** Usi pieni che una riserva permette con questo costo (A.228: il residuo non ne paga uno). */
export const usiPieni = (n, costo) => (Number.isFinite(n) && costo > 0 ? Math.floor((n + 1e-9) / costo) : 0);

/** «4 e 0,2 / 6 CM» oppure «8 / 10 PM». */
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
