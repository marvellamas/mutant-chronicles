// Posizione iniziale della scena (richiesta di Marcello del 07/10/2026): il master prepara la scena e la salva, poi la
// ripristina (scontro da rigiocare, errore, scena preparata prima della sessione). Funzioni pure.
//
// Si salvano: posizione, ingombro e «nascosto» di ogni token, le porte (stato e segreta), i template, la nebbia. Non si
// salvano muri e terreno (la struttura della scena: restano quelli attuali), né quello che sta nello scontro (PV, Stati,
// Round, registro: lo scontro è separato). Un solo salvataggio per scena (scena.iniziale), sovrascrivibile.
// Ripristinando: i token tornano dov'erano; quelli il cui partecipante non è più nello scontro si ignorano (con
// avviso); quelli nuovi, che nella posizione iniziale non c'erano, restano dove sono; i Q usati e le AzP del Round si
// azzerano (movimenti e azioni); i template a durata ripartono dal Round attuale. Ctrl+Z lo annulla (voce «ripristino»).
import { chiaveRif } from './token.js';
import { fineRound } from './template.js';

/** La posizione iniziale della scena, ora. */
export function salvaIniziale(scena, adesso = new Date()) {
  return {
    ...scena,
    iniziale: {
      quando: adesso.toISOString(),
      token: scena.token.map((t) => ({ id: t.id, rif: t.rif, q: [...t.q], ingombro: t.ingombro, nascosto: !!t.nascosto, ...(t.nome ? { nome: t.nome } : {}) })),
      porte: (scena.porte ?? []).map((p) => ({ ...p, q: [...p.q] })),
      template: scena.template.map((t) => ({ ...t, origine: [...t.origine] })),
      nebbia: scena.nebbia.coperti,
    },
  };
}

/** Quello che il ripristino cambia (e Ctrl+Z rimette). */
const PARTI = ['token', 'porte', 'template', 'nebbia', 'movimenti', 'azioni'];
const istantanea = (s) => Object.fromEntries(PARTI.map((k) => [k, s[k]]));

/**
 * Ripristina la posizione iniziale.
 * @param o { chiaviPresenti: Set delle chiavi dei pezzi ancora nello scontro (null: lettura incompleta, si tengono
 *   tutti), scontro: id dello scontro aperto o null, round, annullaMax }
 * @returns { scena, ignorati: [token della posizione iniziale senza partecipante], nuovi: [token rimasti dov'erano] }
 *   oppure null se la scena non ha una posizione iniziale
 */
export function ripristinaIniziale(scena, { chiaviPresenti = null, scontro = null, round = null, annullaMax = 50 } = {}, adesso = new Date()) {
  const ini = scena.iniziale;
  if (!ini) return null;
  const presente = (t) => !chiaviPresenti || t.rif?.tipo === 'segnaposto' || chiaviPresenti.has(chiaveRif(t.rif));
  const ignorati = ini.token.filter((t) => !presente(t));
  const salvati = ini.token.filter(presente);
  const idSalvati = new Set(salvati.map((t) => t.id));
  const chiaviSalvate = new Set(salvati.map((t) => chiaveRif(t.rif)));
  // i token attuali che non erano nella posizione iniziale (né per id né per partecipante) restano
  const nuovi = scena.token.filter((t) => !idSalvati.has(t.id) && !chiaviSalvate.has(chiaveRif(t.rif)));
  const attuali = new Map(scena.token.map((t) => [t.id, t]));
  const token = [
    ...salvati.map((t) => ({ ...(attuali.get(t.id) ?? {}), ...t, q: [...t.q] })),
    ...nuovi,
  ];
  const template = ini.template.map((t) => (t.durata === null || t.durata === undefined ? t : { ...t, scontro, fine_round: fineRound(t.durata, round) }));
  const prima = istantanea(scena);
  const nuova = {
    ...scena, token, porte: ini.porte.map((p) => ({ ...p, q: [...p.q] })), template, nebbia: { ...scena.nebbia, coperti: ini.nebbia },
    movimenti: [], azioni: [],
  };
  return { scena: { ...nuova, annulla: [...scena.annulla, { tipo: 'ripristino', prima, quando: adesso.toISOString() }].slice(-annullaMax) }, ignorati, nuovi };
}

/** Ctrl+Z del ripristino: tutto com'era prima. */
export const annullaRipristino = (scena, voce) => ({ ...scena, ...voce.prima });

/** Errore di forma della posizione iniziale (null se va bene). */
export function erroreIniziale(ini, mascheraValida) {
  if (typeof ini !== 'object' || !ini) return 'oggetto atteso';
  if (typeof ini.quando !== 'string') return 'quando: data';
  if (!Array.isArray(ini.token) || !ini.token.every((t) => t && typeof t.id === 'string' && Array.isArray(t.q) && t.q.length === 2)) return 'token: { id, q } attesi';
  if (!Array.isArray(ini.porte) || !Array.isArray(ini.template)) return 'porte e template: elenchi';
  if (!mascheraValida(ini.nebbia)) return 'nebbia: maschera della griglia';
  return null;
}
