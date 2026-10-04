// Salvataggio dei personaggi in localStorage. Ogni voce contiene le scelte (creazione e
// livelli), i valori di sessione della modalità tavolo e il passo raggiunto.
// Tutte le letture/scritture sono protette: in navigazione privata o con lo
// storage bloccato l'app funziona lo stesso, senza salvare.

const CHIAVE = 'mutant.personaggi.v1';

function leggiTutti() {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

// Motivo dell'ultimo salvataggio fallito: 'quota' (spazio del browser esaurito, per esempio con
// molti ritratti) oppure 'bloccato' (navigazione privata, storage disattivato). null se è riuscito.
let ultimoErrore = null;

/** Perché l'ultimo salvataggio non è riuscito: 'quota', 'bloccato' o null. */
export const erroreSalvataggio = () => ultimoErrore;

const eQuota = (e) => e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e?.code === 22 || e?.code === 1014;

function scriviTutti(tutti) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(tutti));
    ultimoErrore = null;
    return true;
  } catch (e) {
    // il salvataggio precedente resta intatto: si perde solo l'ultima modifica, e lo si dice
    ultimoErrore = eQuota(e) ? 'quota' : 'bloccato';
    return false;
  }
}

/** Oltre questa soglia di caratteri la scheda avvisa che lo spazio del browser sta finendo (circa 5 milioni per sito). */
export const SOGLIA_AVVISO_SPAZIO = 4_000_000;

/** true quando i personaggi salvati si avvicinano al limite del browser (ritratti, note del calendario). */
export const spazioQuasiEsaurito = () => spazioOccupato() > SOGLIA_AVVISO_SPAZIO;

/** Caratteri occupati dai personaggi salvati (localStorage conta caratteri, circa 5 milioni per sito). */
export function spazioOccupato() {
  try {
    return (localStorage.getItem(CHIAVE) ?? '').length;
  } catch {
    return 0;
  }
}

export function elenco() {
  return Object.values(leggiTutti())
    .filter((p) => p && typeof p.id === 'string')
    .sort((a, b) => (b.aggiornato ?? '').localeCompare(a.aggiornato ?? ''));
}

export function carica(id) {
  return leggiTutti()[id] ?? null;
}

/**
 * Salva le scelte della creazione e i livelli successivi (cap. 8). Le voci salvate prima
 * dell'avanzamento non hanno "livelli": si leggono come personaggi al 1° livello.
 * @returns {boolean} false se il salvataggio non è riuscito
 */
export function salva({ id, scelte, livelli = [], sessione = null, calendario = null, stampa = null, passo, pg = null }) {
  const tutti = leggiTutti();
  // `pg`: identificativo del personaggio (src/character.js → nuovoPg), si conserva come la cartella
  const idPg = pg ?? tutti[id]?.pg ?? null;
  // stampa: preferenze di stampa (src/stampa.js → normalizzaOpzioniStampa), non regole
  // `cartella`: ultima sincronizzazione con la cartella dei personaggi (src/cartella.js), si conserva
  const cartella = tutti[id]?.cartella;
  tutti[id] = { id, scelte, livelli, sessione, ...(calendario ? { calendario } : {}), ...(stampa ? { stampa } : {}), passo, aggiornato: new Date().toISOString(), ...(cartella ? { cartella } : {}), ...(idPg ? { pg: idPg } : {}) };
  return scriviTutti(tutti);
}

/**
 * Registra l'ultima sincronizzazione con la cartella dei personaggi ({ file, mtime, salvato }: file e
 * data del server, «aggiornato» della voce in quel momento), senza toccare «aggiornato».
 */
export function segnaCartella(id, cartella) {
  const tutti = leggiTutti();
  if (!tutti[id]) return false;
  tutti[id] = { ...tutti[id], cartella };
  return scriviTutti(tutti);
}

/** Dà alla voce l'identificativo del personaggio (src/character.js → nuovoPg), senza toccare «aggiornato». */
export function segnaPg(id, pg) {
  const tutti = leggiTutti();
  if (!tutti[id]) return false;
  tutti[id] = { ...tutti[id], pg };
  return scriviTutti(tutti);
}

export function elimina(id) {
  const tutti = leggiTutti();
  delete tutti[id];
  return scriviTutti(tutti);
}

export function nuovoId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Impostazioni dell'interfaccia (per browser, non per personaggio)

const CHIAVE_IMPOSTAZIONI = 'mutant.impostazioni.v1';
// sfondo: 'nessuno' o l'id di uno sfondo di Corporazione (src/ui/sfondi.js); ritrattoIntestazione:
// il ritratto sfumato dietro l'intestazione della SD
// filigranaCorporazione: lo stemma in grigio nell'angolo della tab Identità (predefinito sì)
const IMPOSTAZIONI_PREDEFINITE = { posizioneTab: 'alto', larghezzaScheda: 'piena', sfondo: 'nessuno', ritrattoIntestazione: false, filigranaCorporazione: true };
const POSIZIONI = ['automatica', 'sinistra', 'basso', 'alto'];
const LARGHEZZE = ['compatta', 'piena'];

export function leggiImpostazioni() {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE_IMPOSTAZIONI) ?? '{}');
    const out = { ...IMPOSTAZIONI_PREDEFINITE, ...(v && typeof v === 'object' ? v : {}) };
    // docs/layout-sd.md: la riga in alto diventa la predefinita; chi aveva salvato «automatica» (la
    // vecchia predefinita) passa una volta in alto, poi la scelta resta libera
    if (out.layoutTab !== 2) {
      if (out.posizioneTab === 'automatica') out.posizioneTab = 'alto';
      out.layoutTab = 2;
    }
    if (!POSIZIONI.includes(out.posizioneTab)) out.posizioneTab = IMPOSTAZIONI_PREDEFINITE.posizioneTab;
    if (!LARGHEZZE.includes(out.larghezzaScheda)) out.larghezzaScheda = IMPOSTAZIONI_PREDEFINITE.larghezzaScheda;
    if (typeof out.sfondo !== 'string' || !/^[a-z0-9-]+$/.test(out.sfondo)) out.sfondo = IMPOSTAZIONI_PREDEFINITE.sfondo;
    out.ritrattoIntestazione = out.ritrattoIntestazione === true;
    out.filigranaCorporazione = out.filigranaCorporazione !== false;
    return out;
  } catch {
    return { ...IMPOSTAZIONI_PREDEFINITE };
  }
}

export function salvaImpostazioni(impostazioni) {
  try {
    localStorage.setItem(CHIAVE_IMPOSTAZIONI, JSON.stringify(impostazioni));
    return true;
  } catch {
    return false;
  }
}
