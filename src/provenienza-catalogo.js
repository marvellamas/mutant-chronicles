// Lotto 206 (16/11/2026) — **da quale edizione viene ogni campo di una voce del catalogo.**
//
// La regola è quella del lotto 204, e sta ancora in un punto solo (`unisciPerCampo` di
// `src/provenienza-bestiario.js`, chiamata col contenitore `_edizione`):
//
//   **una lettura incompleta non si scrive mai sopra un valore buono.**
//
// Perché serve anche qui, e perché qui il rischio è più grosso che nel Bestiario. Una creatura porta i suoi valori
// con sé: rigenerare il Bestiario non cambia un nemico già salvato, e il lotto 203 l'ha dimostrato. **Un'arma no.**
// Le voci dell'inventario di un personaggio rimandano al catalogo con `rif` e i valori si ricalcolano a ogni
// apertura della scheda (terzo principio: si salvano le scelte, non i valori), quindi cambiare `armi.json` cambia
// la scheda dei sette sotto i piedi dei giocatori. Perciò:
//
//  1. la provenienza sta **sul campo** della voce di catalogo, come nel Bestiario — `_edizione.campi`;
//  2. ogni differenza fra il dato e il manuale si classifica **prima** di scriverla, e quelle che si vedono in
//     combattimento (VA, danno, gittata, modalità, Specializzazione, carico) si contano a parte: sono quelle che
//     chiedono un cancello o un rinvio, e la decisione è del lotto, non del generatore.
//
// Nel file della voce: `_edizione = { campi: { danno: 'Armamenti 0.86', inc: 'Armamenti 0.74', … } }`.
// Il `versione_manuale` della voce resta l'edizione della voce nel suo complesso, come prima.
import { unisciPerCampo, provenienza } from './provenienza-bestiario.js';

const isOggetto = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

/** La chiave che porta la provenienza per campo in una voce del catalogo. */
export const CONTENITORE = '_edizione';

/**
 * I campi di cui si tiene la provenienza: quelli che si leggono su una scheda e che l'app usa al tavolo.
 * Non ci sono `id`, `nome`, `tipo`, `paragrafo` e i testi: l'identità di una voce non si rilegge dal manuale (è la
 * lezione del lotto 204, dove rigenerare cambiò un `id` e ruppe i rimandi).
 */
export const CAMPI = [
  'abilita', 'famiglia', 'catalogo', 'mani', 'danno', 'ac', 'modificatore_va',
  'portata_q', 'gittata_q', 'munizioni', 'inc', 'mov', 'modalita', 'for_richiesta', 'pi',
  'qualita', 'ps_int', 'reperibilita', 'costo',
];

/**
 * I campi che **non vengono da una tabella del manuale** e di cui quindi non si tiene una provenienza per voce.
 * Si dichiarano una volta, nel `_nota` del file, e si **confrontano** con il manuale per accorgersi di una
 * differenza — non si scrivono.
 *
 *  - `specializzazione`: il manuale la assegna per famiglia (§7.1: «dipende dalla famiglia e dalla modalità»), e
 *    per 41 modelli la nomina nella prosa. Per gli altri la deduciamo noi dalla famiglia, quindi non è un valore
 *    di un'edizione: è nostro. `specializzazioniDaProsa` serve a controllare che la nostra non contraddica la sua.
 *  - `manovre`: le Manovre compatibili stanno in una tabella sola del §7.1 e per famiglia, non per modello.
 *  - `proprieta`: nel catalogo è `{ nome, testo }` — il testo è la regola che «Attacca!» e la stampa leggono — e
 *    il manuale in tabella dà il solo nome. Scrivere i nomi butterebbe i testi.
 *
 * **Perché non su ogni voce:** un segno che è sempre acceso non dice niente. Se la provenienza di questi tre campi
 * stesse su ogni voce, tutte e 218 sarebbero «miste» e il ⚑ non si spegnerebbe mai — la lezione del 183 e del 204.
 */
export const CAMPI_NOSTRI = ['specializzazione', 'manovre', 'proprieta'];

/** I nomi che si leggono nella scheda e nel rapporto. */
export const NOMI_CAMPI = {
  abilita: 'Abilità', specializzazione: 'Specializzazione', famiglia: 'Famiglia', catalogo: 'Catalogo',
  danno_due_mani: 'Danno a due mani',
  mani: 'Mani', danno: 'Danno', ac: 'AC', modificatore_va: 'VA', portata_q: 'Portata', gittata_q: 'Gittata',
  munizioni: 'Capacità', inc: 'INC', mov: 'MOV', modalita: 'Modalità di fuoco', for_richiesta: 'FOR',
  pi: 'PI', qualita: 'Qualità', ps_int: 'PS Integrità', reperibilita: 'Reperibilità', costo: 'Costo',
  proprieta: 'Proprietà', manovre: 'Manovre',
};

/**
 * I campi che **si vedono in combattimento**: cambiarne uno cambia quello che un giocatore tira o segna al tavolo.
 * È l'elenco su cui si decide se serve un cancello (parte A del lotto 206), e per questo sta nei dati del modulo e
 * non dentro un conto: chi aggiunge un campo d'arma decide anche se è di questi.
 */
export const CAMPI_DI_COMBATTIMENTO = [
  'abilita', 'specializzazione', 'famiglia', 'mani', 'danno', 'ac', 'modificatore_va',
  'portata_q', 'gittata_q', 'munizioni', 'modalita', 'for_richiesta', 'inc', 'mov',
];

/** La mappa campo → edizione di una voce, come sta nel file. */
export const provenienzaVoce = (voce) => provenienza(voce, CONTENITORE);

/** L'edizione della voce nel suo complesso: il `versione_manuale` che la voce ha sempre avuto. */
export const edizioneVoce = (voce) => voce?.versione_manuale ?? null;

/** I campi che la voce ha davvero (per non promettere la provenienza di un valore che non c'è). */
export function campiPresenti(voce) {
  if (!isOggetto(voce)) return [];
  return CAMPI.filter((k) => {
    const v = voce[k];
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (isOggetto(v)) return Object.keys(v).length > 0;
    return true;
  });
}

/**
 * I campi che **non** vengono dall'edizione corrente: `[{ campo, nome, edizione }]`.
 * Un campo senza provenienza dichiarata non si conta come vecchio: è un caso diverso, che
 * `campiSenzaProvenienza` dice a parte — inventare una provenienza sarebbe peggio che non averla.
 */
export function campiNonCorrenti(voce, corrente) {
  const p = provenienzaVoce(voce);
  const presenti = new Set(campiPresenti(voce));
  return CAMPI
    .filter((k) => presenti.has(k) && p[k] && p[k] !== corrente)
    .map((k) => ({ campo: k, nome: NOMI_CAMPI[k] ?? k, edizione: p[k] }));
}

/** I campi presenti che non dichiarano da dove vengono. */
export function campiSenzaProvenienza(voce) {
  const p = provenienzaVoce(voce);
  return campiPresenti(voce).filter((k) => !p[k]);
}

/** Vero se la voce porta valori di due o più edizioni: è questo che nella scheda si deve dire. */
export const voceMista = (voce, corrente) => campiNonCorrenti(voce, corrente).length > 0;

/**
 * La riga che la scheda scrive quando una voce è mista, e **null** quando è tutta all'edizione corrente — come il
 * ⚑ del Bestiario (lotto 204) e il segno delle provvisorie (183), si spegne da sé quando la voce è a posto.
 */
export function rigaProvenienzaVoce(voce, corrente) {
  const vecchi = campiNonCorrenti(voce, corrente);
  if (!vecchi.length) return null;
  const perEdizione = new Map();
  for (const v of vecchi) perEdizione.set(v.edizione, [...(perEdizione.get(v.edizione) ?? []), v.nome]);
  const pezzi = [...perEdizione.entries()].map(([ed, nomi]) => `${nomi.join(', ')} da ${ed}`);
  return `Non tutti i valori vengono da ${corrente} — ${pezzi.join('; ')}.`;
}

/** La regola del 204 applicata a una voce del catalogo: lo stesso motore, con il contenitore delle voci. */
export function unisciVoce(vecchia, letta, opzioni = {}) {
  return unisciPerCampo(vecchia, letta, { ...opzioni, campi: opzioni.campi ?? CAMPI, contenitore: CONTENITORE });
}

/**
 * Il conto d'insieme sulle voci: quanti campi dall'edizione corrente, quanti ereditati, quanti senza provenienza,
 * e l'elenco delle voci miste. È quello che il validatore pretende che torni (parte D).
 */
export function quadroCatalogo(voci, corrente) {
  const q = { voci: 0, letti: 0, ereditati: 0, senzaProvenienza: 0, perEdizione: {}, perCampo: {}, miste: [] };
  for (const v of voci ?? []) {
    q.voci += 1;
    const p = provenienzaVoce(v);
    for (const k of campiPresenti(v)) {
      const ed = p[k];
      if (!ed) { q.senzaProvenienza += 1; continue; }
      q.perEdizione[ed] = (q.perEdizione[ed] ?? 0) + 1;
      if (ed === corrente) q.letti += 1;
      else { q.ereditati += 1; q.perCampo[k] = (q.perCampo[k] ?? 0) + 1; }
    }
    const vecchi = campiNonCorrenti(v, corrente);
    if (vecchi.length) q.miste.push({ nome: v.nome, id: v.id, campi: vecchi.map((x) => x.campo) });
  }
  return q;
}
