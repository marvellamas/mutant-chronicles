// Scena della mappa di battaglia (lotto 1 di docs/battlemap/piano.md; §2 e §4 della specifica): un file per scena
// in scene/<id>.json sul server, con la revisione come gli scontri. Funzioni pure, usate da app, server e test.
//
// { formato: "mutant-scena", versione: 1, id, nome, revisione, creato, aggiornato,
//   mappa: { file, ridotta, larghezza, altezza } | null,     immagini in mappe/ (pixel dell'originale)
//   griglia: { q_px, scosto_x, scosto_y, colore, opacita, bloccata, colonne, righe },
//   muri, terreno: maschere di Q in base64 (src/mappa/celle.js),
//   nebbia: { iniziale: "coperta" | "scoperta", coperti: maschera },
//   token: [{ id, rif: { tipo: "partecipante" | "veicolo" | "segnaposto", id }, q: [x, y], ingombro, nascosto, nome? }],
//   template: [{ id, forma, origine: [x, y], misure: { … in Q }, direzione?, colore?, fine_round?, fonte?, nascosto }],
//   collegamento: { scontro: id | null, bozza: id | null },
//   movimenti: [ … ], annulla: [ … ] }                         movimenti del Round e azioni del master (lotto 5)
import { nuovaMaschera, inBase64, mascheraValida } from './celle.js';
import { tokenDentro } from './token.js';

export const ID_SCENA = /^[a-z0-9-]{1,60}$/;
/** Nome dei file in mappe/: lo sceglie il server (nome ridotto + impronta del contenuto). */
export const FILE_MAPPA = /^[a-z0-9-]{1,100}\.(jpg|png|webp)$/;
const ID_RIF = /^[A-Za-z0-9:_.-]{1,120}$/;

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isIntero = (v) => Number.isInteger(v);
const isTesto = (v) => typeof v === 'string' && v.length > 0;
const isQ = (q) => Array.isArray(q) && q.length === 2 && q.every(isIntero);

/**
 * Colonne e righe della griglia sull'immagine (§4): quanti Q, anche parziali, entrano nei pixel dell'originale
 * dopo lo scostamento del primo quadretto.
 */
export function dimensioniGriglia(mappa, griglia) {
  const q = griglia.q_px;
  return {
    colonne: Math.max(1, Math.ceil((mappa.larghezza - (griglia.scosto_x ?? 0)) / q)),
    righe: Math.max(1, Math.ceil((mappa.altezza - (griglia.scosto_y ?? 0)) / q)),
  };
}

/**
 * Scena nuova, con revisione 0 (il server la porta a 1 al primo salvataggio). Senza immagine, griglia vuota di
 * colonne × righe (predefinite in data/mappa.json → scena); con l'immagine si calcolano dalla griglia. Nebbia
 * iniziale dai dati (§5: coperta).
 */
export function nuovaScena({ id, nome, mappa = null, griglia = {}, colonne, righe, nebbia, dati, adesso = new Date() }) {
  const D = dati.mappa;
  const g = { ...D.griglia.predefinita, ...griglia };
  const dim = mappa ? dimensioniGriglia(mappa, g) : { colonne: colonne ?? D.scena.colonne_predefinite, righe: righe ?? D.scena.righe_predefinite };
  const iniziale = nebbia ?? D.scena.nebbia_iniziale;
  const vuota = () => inBase64(nuovaMaschera(dim.colonne, dim.righe));
  return {
    formato: D.scena.formato,
    versione: D.scena.versione,
    id,
    nome,
    revisione: 0,
    creato: adesso.toISOString(),
    mappa: mappa ? { file: mappa.file, ridotta: mappa.ridotta ?? null, larghezza: mappa.larghezza, altezza: mappa.altezza } : null,
    griglia: { ...g, colonne: dim.colonne, righe: dim.righe },
    muri: vuota(),
    terreno: vuota(),
    nebbia: { iniziale, coperti: inBase64(nuovaMaschera(dim.colonne, dim.righe, iniziale === 'coperta')) },
    token: [],
    template: [],
    collegamento: { scontro: null, bozza: null },
    movimenti: [],
    annulla: [],
  };
}

/** Voce dell'elenco delle scene (GET /api/scene). */
export function riassuntoScena(s, mtime = null) {
  return {
    id: s.id, nome: s.nome, revisione: s.revisione,
    mappa: s.mappa?.file ?? null,
    colonne: s.griglia?.colonne, righe: s.griglia?.righe,
    token: s.token?.length ?? 0,
    collegamento: s.collegamento ?? null,
    ...(mtime !== null ? { mtime } : {}),
  };
}

/**
 * Controlla una scena prima di salvarla. Restituisce il primo problema (testo che dice cosa e dove) o null.
 * I limiti vengono da data/mappa.json.
 */
export function validaScena(s, dati) {
  const D = dati?.mappa;
  if (!D) return 'dati della mappa mancanti (data/mappa.json)';
  if (!isOggetto(s)) return 'la scena non è un oggetto';
  if (s.formato !== D.scena.formato) return `formato: «${D.scena.formato}» atteso`;
  if (s.versione !== D.scena.versione) return `versione: ${D.scena.versione} attesa`;
  if (!isTesto(s.id) || !ID_SCENA.test(s.id)) return 'id: lettere minuscole, cifre e trattini (al massimo 60)';
  if (!isTesto(s.nome) || s.nome.length > 120) return 'nome: testo da 1 a 120 caratteri';
  if (!isIntero(s.revisione) || s.revisione < 0) return 'revisione: intero da 0 in su';

  // immagine (§4)
  if (s.mappa !== null && s.mappa !== undefined) {
    const m = s.mappa;
    if (!isOggetto(m)) return 'mappa: oggetto o null';
    if (!FILE_MAPPA.test(String(m.file))) return 'mappa.file: nome di un file di mappe/ atteso';
    if (m.ridotta !== null && m.ridotta !== undefined && !FILE_MAPPA.test(String(m.ridotta))) return 'mappa.ridotta: nome di un file di mappe/ o null';
    if (!isIntero(m.larghezza) || m.larghezza < 1 || !isIntero(m.altezza) || m.altezza < 1) return 'mappa: larghezza e altezza in pixel attese';
  }

  // griglia (§4)
  const g = s.griglia;
  if (!isOggetto(g)) return 'griglia mancante';
  if (typeof g.q_px !== 'number' || g.q_px < D.griglia.q_px_min || g.q_px > D.griglia.q_px_max) return `griglia.q_px: da ${D.griglia.q_px_min} a ${D.griglia.q_px_max} pixel per Q`;
  if (typeof g.scosto_x !== 'number' || typeof g.scosto_y !== 'number') return 'griglia: scosto_x e scosto_y numerici attesi';
  if (typeof g.opacita !== 'number' || g.opacita < 0 || g.opacita > 1) return 'griglia.opacita: da 0 a 1';
  if (!/^#[0-9a-fA-F]{6}$/.test(String(g.colore))) return 'griglia.colore: #rrggbb atteso';
  if (typeof g.bloccata !== 'boolean') return 'griglia.bloccata: vero o falso';
  const { colonne, righe } = g;
  if (!isIntero(colonne) || colonne < 1 || colonne > D.scena.colonne_max) return `griglia.colonne: da 1 a ${D.scena.colonne_max}`;
  if (!isIntero(righe) || righe < 1 || righe > D.scena.righe_max) return `griglia.righe: da 1 a ${D.scena.righe_max}`;

  // maschere (§5, §6)
  if (!mascheraValida(s.muri, colonne, righe)) return 'muri: maschera di Q della dimensione della griglia attesa';
  if (!mascheraValida(s.terreno, colonne, righe)) return 'terreno: maschera di Q della dimensione della griglia attesa';
  if (!isOggetto(s.nebbia) || !D.scena.nebbie_iniziali.includes(s.nebbia.iniziale)) return `nebbia.iniziale: ${D.scena.nebbie_iniziali.join(' o ')}`;
  if (!mascheraValida(s.nebbia.coperti, colonne, righe)) return 'nebbia.coperti: maschera di Q della dimensione della griglia attesa';

  // token (§7)
  if (!Array.isArray(s.token) || s.token.length > D.scena.token_max) return `token: elenco di al massimo ${D.scena.token_max}`;
  const idToken = new Set();
  const rifPartecipanti = new Set();
  for (const [i, t] of s.token.entries()) {
    const k = `token[${i}]`;
    if (!isOggetto(t) || !isTesto(t.id) || !ID_RIF.test(t.id)) return `${k}.id mancante o non valido`;
    if (idToken.has(t.id)) return `${k}: id «${t.id}» ripetuto`;
    idToken.add(t.id);
    if (!isOggetto(t.rif) || !D.token.riferimenti.includes(t.rif.tipo)) return `${k}.rif.tipo: ${D.token.riferimenti.join(', ')}`;
    if (t.rif.tipo !== 'segnaposto' && (!isTesto(t.rif.id) || !ID_RIF.test(t.rif.id))) return `${k}.rif.id mancante`;
    if (t.rif.tipo === 'segnaposto' && (!isTesto(t.nome) || t.nome.length > 60)) return `${k}.nome: il segnaposto ha un nome (al massimo 60 caratteri)`;
    if (t.rif.tipo === 'partecipante') {
      if (rifPartecipanti.has(t.rif.id)) return `${k}: il partecipante «${t.rif.id}» ha già un token`;
      rifPartecipanti.add(t.rif.id);
    }
    const rettangolo = Array.isArray(t.ingombro);
    if (rettangolo && (t.rif.tipo !== 'veicolo' || t.ingombro.length !== 2 || !t.ingombro.every((n) => isIntero(n) && n >= 1 && n <= D.token.veicolo_ingombro_max))) {
      return `${k}.ingombro: [colonne, righe] solo per i veicoli, da 1 a ${D.token.veicolo_ingombro_max} Q`;
    }
    if (!rettangolo && !D.token.ingombri_ammessi.includes(t.ingombro)) return `${k}.ingombro: ${D.token.ingombri_ammessi.join(', ')} Q per lato`;
    if (!isQ(t.q) || !tokenDentro(t, colonne, righe)) return `${k}.q: il token deve stare tutto dentro la griglia`;
    if (typeof t.nascosto !== 'boolean') return `${k}.nascosto: vero o falso`;
  }

  // template (§10, fase 2: qui solo la forma del dato)
  if (!Array.isArray(s.template) || s.template.length > D.scena.template_max) return `template: elenco di al massimo ${D.scena.template_max}`;
  const idTemplate = new Set();
  for (const [i, t] of s.template.entries()) {
    const k = `template[${i}]`;
    if (!isOggetto(t) || !isTesto(t.id) || !ID_RIF.test(t.id) || idTemplate.has(t.id)) return `${k}.id mancante o ripetuto`;
    idTemplate.add(t.id);
    if (!D.template.forme.includes(t.forma)) return `${k}.forma: ${D.template.forme.join(', ')}`;
    if (!isQ(t.origine) || t.origine[0] < 0 || t.origine[1] < 0 || t.origine[0] >= colonne || t.origine[1] >= righe) return `${k}.origine: un Q della griglia`;
    if (!isOggetto(t.misure) || !Object.values(t.misure).every((v) => typeof v === 'number' && v > 0)) return `${k}.misure: misure in Q positive`;
    if (t.fine_round !== undefined && t.fine_round !== null && !isIntero(t.fine_round)) return `${k}.fine_round: intero o null`;
    if (typeof t.nascosto !== 'boolean') return `${k}.nascosto: vero o falso`;
  }

  // collegamento allo scontro o alla bozza di «Prepara scontro» (§4)
  const c = s.collegamento;
  if (!isOggetto(c)) return 'collegamento: { scontro, bozza } atteso';
  for (const campo of ['scontro', 'bozza']) {
    if (c[campo] !== null && c[campo] !== undefined && !(isTesto(c[campo]) && ID_SCENA.test(c[campo]))) return `collegamento.${campo}: id di scontro o null`;
  }

  if (s.archiviata !== undefined && typeof s.archiviata !== 'boolean') return 'archiviata: vero o falso';
  if (!Array.isArray(s.movimenti) || s.movimenti.length > D.scena.movimenti_max) return `movimenti: elenco di al massimo ${D.scena.movimenti_max}`;
  if (!Array.isArray(s.annulla) || s.annulla.length > D.scena.annulla_max) return `annulla: elenco di al massimo ${D.scena.annulla_max}`;
  return null;
}

/** Nome della scena ridotto a id: minuscole senza accenti, cifre e trattini. */
const ridotto = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'scena';
const due = (n) => String(n).padStart(2, '0');

/** Id di una scena nuova dal nome e dall'ora: «cripta-20261006-201500» (id e nome del file in scene/). */
export function idScena(nome, d = new Date()) {
  return `${ridotto(nome)}-${d.getFullYear()}${due(d.getMonth() + 1)}${due(d.getDate())}-${due(d.getHours())}${due(d.getMinutes())}${due(d.getSeconds())}`;
}

/**
 * Copia di una scena con un altro id e un altro nome («Duplica» della plancia): stessa immagine, stessa griglia,
 * stesse maschere e token; revisione 0, senza registro dei movimenti né annulla, non archiviata.
 */
export function duplicaScena(s, { id, nome, adesso = new Date() }) {
  const { aggiornato, archiviata, ...resto } = structuredClone(s);
  return { ...resto, id, nome, revisione: 0, creato: adesso.toISOString(), movimenti: [], annulla: [] };
}
