// Si sale di livello solo con i PX (A.187, Davide 28/10/2026): il passaggio al livello successivo si abilita quando i PX
// assegnati dal Direttore raggiungono la soglia cumulativa di quel livello (A.170, `px_partita.json` → soglie_px),
// dentro il limite dell'Atto. Un totale soltanto suggerito o non assegnato non conta. Il Direttore può concedere un
// passaggio anticipato (riga «concessione» nel registro del master: motivo obbligatorio, i PX non cambiano).
// Funzioni pure; il solo conto "PX → livello" resta `livelloDaPx` (src/px-partita.js).
import { livelloDaPx, limiteAtto, livelloPg, confrontoLivelloPx } from './px-partita.js';
import { normalizzaCorrezioni } from './correzioni-master.js';

export const TIPO_CONCESSIONE = 'concessione';
export const CHIAVE_CONCESSIONE = 'livello';

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

/** Le concessioni attive di passaggio di livello: { id, livello, motivo, quando }. */
export function concessioniLivello(correzioni) {
  return normalizzaCorrezioni(correzioni)
    .filter((x) => x.tipo === TIPO_CONCESSIONE && x.chiave === CHIAVE_CONCESSIONE && x.stato === 'attiva' && Number.isFinite(x.livello))
    .map((x) => ({ id: x.id, livello: x.livello, motivo: x.motivo, quando: x.quando }));
}

/** Il livello più alto consentito: quello dei PX (nell'Atto) o, se maggiore, quello di una concessione attiva. */
export function livelloConsentito(px, atto, correzioni, p) {
  return Math.max(livelloPg(num(px), atto, p), ...concessioniLivello(correzioni).map((c) => c.livello));
}

/**
 * Il giocatore può salire dal livello attuale?
 * @returns { ok, motivo, richiesti, mancanti, prossimo, limiteAtto, concessione } — `motivo` in parole per chi legge la scheda
 */
export function permessoSalita({ livello, px, atto, correzioni = [] }, p) {
  const prossimo = num(livello) + 1;
  const conc = concessioniLivello(correzioni).some((c) => c.livello >= prossimo);
  const tetto = limiteAtto(atto, p);
  const richiesti = p.soglie_px[prossimo - 1] ?? null;
  const base = { prossimo, richiesti, limiteAtto: tetto, concessione: conc };
  if (richiesti === null && !conc) return { ...base, ok: false, mancanti: 0, motivo: `Il livello ${prossimo} non è nella tabella dei PX.` };
  if (conc) return { ...base, ok: true, mancanti: 0, motivo: null };
  if (prossimo > tetto) return { ...base, ok: false, mancanti: 0, motivo: `L'Atto ${atto} arriva al livello ${tetto}: per il livello ${prossimo} serve l'Atto successivo.` };
  const mancanti = Math.max(0, richiesti - num(px));
  if (mancanti > 0) return { ...base, ok: false, mancanti, motivo: `Per il livello ${prossimo} servono ${richiesti} PX assegnati dal Direttore: ne mancano ${mancanti}.` };
  return { ...base, ok: true, mancanti: 0, motivo: null };
}

/** Il livello di una scheda e il suo conto rispetto ai PX e alle concessioni (per la nota del Direttore). */
export function sfasamento({ livello, px, atto, correzioni = [] }, p) {
  const c = confrontoLivelloPx(livello, px, p);
  if (!c) return null;
  const consentito = livelloConsentito(px, atto, correzioni, p);
  return { ...c, consentito, oltre: Math.max(0, num(livello) - consentito) };
}

/**
 * Controllo del server su un file di personaggio che arriva da un tablet: il livello (1 + livelli registrati) non può
 * superare quello consentito se sale rispetto al file che c'è su disco. Calare è sempre ammesso. Un file nuovo (nessun
 * file di quel PG sul disco) entra com'è: è un personaggio portato da fuori («Aggiungi PG al tavolo»), senza PX perché
 * quelli li assegna il Direttore; se ha un livello più dei PX la scheda lo segnala e il Direttore sceglie (A.187).
 * @param nuovo, disco: file dei personaggi (formato 8: { scelte, livelli })
 * @returns { ok } oppure { ok:false, stato:403, errore }
 */
export function controllaLivelloDaTablet(nuovo, disco, { atto, p }) {
  const liv = (f) => 1 + (Array.isArray(f?.livelli) ? f.livelli.length : 0);
  if (!disco) return { ok: true };
  const nuovoLiv = liv(nuovo);
  if (nuovoLiv <= liv(disco)) return { ok: true };
  // i PX e le concessioni valgono quelli su disco: un tablet non può alzarli (proteggiPuntiEsperienza, proteggiBlocchiMaster)
  const px = num(disco?.scelte?.puntiEsperienza);
  const consentito = livelloConsentito(px, atto, disco?.correzioni_master ?? [], p);
  if (nuovoLiv <= consentito) return { ok: true };
  return { ok: false, stato: 403, errore: `Il livello ${nuovoLiv} non è ancora raggiunto: con ${px} PX assegnati il livello consentito è ${consentito}. Decide il Direttore.` };
}

const ETICHETTE_VOCE = { classe: 'Classe', talento: 'Talento', talentoLibero: 'Talento Libero', maestria: 'Maestria', specializzazione: 'Specializzazione', incantesimi: 'Incantesimi', tecniche: 'Tecniche Interiori',
  abilita: 'Punti Abilità', punti: 'Punti Abilità', caratteristica: 'Caratteristica', scuolaMishima: 'Scuola Mishima', parametriTalenti: 'Parametri dei Talenti' };

const testoValore = (v) => {
  if (v === null || v === undefined || v === '') return '';
  if (Array.isArray(v)) return v.map(testoValore).filter(Boolean).join(', ');
  if (typeof v === 'object') return v.nome ?? v.id ?? Object.entries(v).map(([k, x]) => `${k} ${testoValore(x)}`).join(', ');
  return String(v);
};

/**
 * Le scelte registrate in un livello, in parole, per far vedere al Direttore che cosa si perde annullandolo (A.187).
 * @returns elenco di «Etichetta: valore» (vuoto se il livello non porta scelte oltre al numero)
 */
export function scelteDelLivello(voce) {
  return Object.entries(voce ?? {}).filter(([k]) => k !== 'livello')
    .map(([k, v]) => [ETICHETTE_VOCE[k] ?? k, testoValore(v)]).filter(([, t]) => t).map(([e, t]) => `${e}: ${t}`);
}
