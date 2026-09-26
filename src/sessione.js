// Modalità tavolo (docs/roadmap-equipaggiamento-e-scheda.md, §3): i valori attuali della
// sessione di gioco. Stanno in un blocco `sessione` separato da creazione e livelli e NON si
// ricalcolano: quando un massimo cambia (nuovo livello, tabella modificata) il valore attuale
// viene solo limitato al nuovo massimo, mai riazzerato. Funzioni pure.
//
// sessione = { pvAttuali, pmAttuali, puntiEroe, distintivi, statiAttivi: [id], ferite,
//              affaticamento, munizioni: { uid: { colpi, riserve } }, note }
// munizioni: per ogni arma a distanza della lista, i colpi nel caricatore (limitati alla sua
// capacità, dal catalogo) e le riserve (caricatori di scorta: quantità libera).
// ferite: 0 = nessuna, 1…5 = gli Stati di Ferita di regole.json (§5.14), 6 = oltre Grave.
// affaticamento: indice in regole.json → affaticamento.stati (§5.19), 0 = Riposato.
import { valoreTiro } from './tiri.js';
import { caricatori, normalizzaEquipaggiamento } from './equipaggiamento.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const limita = (v, min, max) => Math.min(max, Math.max(min, v));
const intero = (v, predefinito) => (Number.isInteger(v) ? v : predefinito);

/**
 * Massimi e limiti della sessione per il personaggio attuale.
 * @param scheda risultato di calcolaScheda({ creazione, livelli })
 */
export function massimiSessione(scheda, creazione, dati) {
  const pe = dati.regole.punti_eroe;
  return {
    pv: scheda.pv ?? 0,
    pm: scheda.pm ?? 0,
    puntiEroe: pe.riserva_massima, // §1.8.3, §2.15: il massimo posseduto è sempre 10
    puntiEroeIniziali: valoreTiro(creazione?.puntiEroe) ?? 0,
    distintiviPerPuntoEroe: pe.distintivi_per_punto_eroe,
    ferite: dati.regole.ferite.stati.length + 1, // l'ultimo gradino è «oltre Grave»
    affaticamento: dati.regole.affaticamento.stati.length - 1,
    stati: dati.regole.stati.elenco.map((s) => s.id),
    // capacità del caricatore di ogni arma a distanza della lista (uid → numero o null)
    caricatori: caricatori(normalizzaEquipaggiamento(creazione?.equipaggiamento), dati),
  };
}

/** Munizioni di un'arma: { colpi, riserve }; i vecchi valori numerici sono i colpi. */
function voceMunizioni(v) {
  if (Number.isInteger(v) && v >= 0) return { colpi: v, riserve: 0 };
  if (!isOggetto(v)) return null;
  return { colpi: Number.isInteger(v.colpi) && v.colpi >= 0 ? v.colpi : 0, riserve: Number.isInteger(v.riserve) && v.riserve >= 0 ? v.riserve : 0 };
}

/**
 * Munizioni allineate alle armi a distanza della lista: le armi nuove partono dal caricatore
 * pieno, i colpi non superano la capacità, le armi tolte dalla lista spariscono.
 */
function allineaMunizioni(sorgente, m) {
  const src = isOggetto(sorgente) ? sorgente : {};
  const out = {};
  if (!m.caricatori) {
    for (const [k, v] of Object.entries(src)) { const x = voceMunizioni(v); if (x) out[k] = x; }
    return out;
  }
  for (const [uid, capacita] of Object.entries(m.caricatori)) {
    const x = voceMunizioni(src[uid]) ?? { colpi: capacita ?? 0, riserve: 0 };
    if (capacita !== null) x.colpi = Math.min(x.colpi, capacita);
    out[uid] = x;
  }
  return out;
}

/** Sessione nuova: PV e PM ai massimi, Punti Eroe iniziali (§2.15), il resto a zero. */
export function inizializzaSessione(m) {
  return {
    pvAttuali: m.pv,
    pmAttuali: m.pm,
    puntiEroe: limita(m.puntiEroeIniziali, 0, m.puntiEroe),
    distintivi: 0,
    statiAttivi: [],
    ferite: 0,
    affaticamento: 0,
    munizioni: allineaMunizioni({}, m),
    note: '',
  };
}

/**
 * Porta una sessione salvata (o assente) a una forma valida per i massimi attuali: se manca la
 * inizializza; altrimenti limita i valori ai massimi senza riazzerarli.
 */
export function allineaSessione(sessione, m) {
  if (!isOggetto(sessione)) return inizializzaSessione(m);
  const munizioni = allineaMunizioni(sessione.munizioni, m);
  return {
    pvAttuali: limita(intero(sessione.pvAttuali, m.pv), 0, m.pv),
    pmAttuali: limita(intero(sessione.pmAttuali, m.pm), 0, m.pm),
    puntiEroe: limita(intero(sessione.puntiEroe, m.puntiEroeIniziali), 0, m.puntiEroe),
    distintivi: Math.max(0, intero(sessione.distintivi, 0)),
    statiAttivi: Array.isArray(sessione.statiAttivi) ? [...new Set(sessione.statiAttivi.filter((id) => m.stati.includes(id)))] : [],
    ferite: limita(intero(sessione.ferite, 0), 0, m.ferite),
    affaticamento: limita(intero(sessione.affaticamento, 0), 0, m.affaticamento),
    munizioni,
    note: typeof sessione.note === 'string' ? sessione.note : '',
  };
}

/** Applica una modifica (campi parziali) e riporta tutto entro i limiti. */
export function modificaSessione(sessione, modifica, m) {
  return allineaSessione({ ...allineaSessione(sessione, m), ...modifica }, m);
}

/** Aggiunge `delta` a un valore numerico della sessione, entro i limiti. */
export function variaSessione(sessione, campo, delta, m) {
  const s = allineaSessione(sessione, m);
  return modificaSessione(s, { [campo]: s[campo] + delta }, m);
}

/** Varia i colpi o le riserve di un'arma a distanza, entro 0 e la capacità del caricatore. */
export function variaMunizioni(sessione, uid, campo, delta, m) {
  const s = allineaSessione(sessione, m);
  const x = s.munizioni[uid] ?? { colpi: 0, riserve: 0 };
  return modificaSessione(s, { munizioni: { ...s.munizioni, [uid]: { ...x, [campo]: Math.max(0, x[campo] + delta) } } }, m);
}

/** «Ricarica»: il caricatore torna alla capacità. Le riserve restano come sono (quantità libera). */
export function ricaricaArma(sessione, uid, m) {
  const s = allineaSessione(sessione, m);
  const capacita = m.caricatori?.[uid];
  if (capacita === null || capacita === undefined) return s;
  return modificaSessione(s, { munizioni: { ...s.munizioni, [uid]: { ...(s.munizioni[uid] ?? { riserve: 0 }), colpi: capacita } } }, m);
}

/** Attiva o disattiva uno Stato. */
export function commutaStato(sessione, id, m) {
  const s = allineaSessione(sessione, m);
  const attivi = s.statiAttivi.includes(id) ? s.statiAttivi.filter((x) => x !== id) : [...s.statiAttivi, id];
  return modificaSessione(s, { statiAttivi: attivi }, m);
}

/**
 * «Nuova sessione / riposo completo»: PV e PM ai massimi, Stati, Ferite e Affaticamento a zero.
 * Restano note, Punti Eroe, Distintivi e munizioni.
 */
export function nuovaSessione(sessione, m) {
  return { ...allineaSessione(sessione, m), pvAttuali: m.pv, pmAttuali: m.pm, statiAttivi: [], ferite: 0, affaticamento: 0 };
}

/** §1.8.3: 5 Distintivi diventano 1 Punto Eroe, senza superare la riserva massima. null se non si può. */
export function convertiDistintivi(sessione, m) {
  const s = allineaSessione(sessione, m);
  if (s.distintivi < m.distintiviPerPuntoEroe || s.puntiEroe >= m.puntiEroe) return null;
  return { ...s, distintivi: s.distintivi - m.distintiviPerPuntoEroe, puntiEroe: s.puntiEroe + 1 };
}

/** Descrizione del gradino di Ferita `n` (0 = nessuna). */
export function descriviFerite(n, dati) {
  const f = dati.regole.ferite;
  if (!n) return { nome: 'Nessuna Ferita', penalita: 0 };
  if (n <= f.stati.length) return { ...f.stati[n - 1] };
  return { nome: `Oltre Grave: ${f.oltre}`, penalita: null };
}

/**
 * Promemoria delle penalità di sessione. Le regole del cap. 5 sono situazionali: queste
 * penalità NON modificano i VA calcolati, si mostrano accanto ai valori.
 */
export function penalitaSessione(sessione, dati) {
  const ferite = descriviFerite(sessione.ferite, dati);
  const aft = dati.regole.affaticamento.stati[sessione.affaticamento] ?? dati.regole.affaticamento.stati[0];
  const stati = dati.regole.stati.elenco.filter((s) => sessione.statiAttivi.includes(s.id));
  // §5.14: le Ferite penalizzano VA e Prove Salvezza; §5.19: l'Affaticamento tutte le Prove
  const totale = (ferite.penalita ?? 0) + aft.penalita;
  return { ferite, affaticamento: aft, stati, totale };
}
