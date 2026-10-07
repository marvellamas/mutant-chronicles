// Menu del clic destro sulla mappa (richiesta di Marcello del 07/10/2026): token, porta, template, punto vuoto.
// L'ordine dei gruppi e delle voci sta in data/mappa.json → menu (si cambia lì, senza toccare la logica); le voci le
// costruisce la pagina (src/ui/mappa/pagina.js), ciascuna con un id di VOCI_MENU. Qui la composizione, pura:
//   - riga rapida in cima (i pulsanti del movimento): si mostrano anche spenti, con il motivo nel suggerimento;
//   - gruppi con intestazione: solo le voci utilizzabili adesso (né assenti né spente), i gruppi vuoti non si mostrano;
//   - «Opzioni»: un sottomenu con le voci usate di rado, la distruttiva in fondo;
//   - niente voci ripetute (stessa `chiave`, o stesso testo), anche fra gruppi diversi.

/** Gli id delle voci che la pagina sa costruire, per contesto (il validatore controlla data/mappa.json → menu). */
export const VOCI_MENU = {
  token: ['passo', 'corsa', 'scatto', 'libero', 'annulla_movimento', 'nuovo_turno', 'attacca', 'porta_token', 'linea', 'area', 'zoc', 'template_qui', 'mini_scheda', 'scheda_completa', 'nascondi', 'luce_token', 'colore_bordo', 'togli_token'],
  porta: ['porta_token', 'apri_chiudi', 'blocca', 'ruota', 'segreta', 'togli_porta'],
  template: ['sposta_template', 'nascondi_template', 'togli_template'],
  mappa: ['template_qui', 'linea_qui'],
};
export const CONTESTI_MENU = Object.keys(VOCI_MENU);

const chiave = (v) => v.chiave ?? v.testo;
const elenco = (v) => (v === null || v === undefined ? [] : Array.isArray(v) ? v : [v]);

/**
 * Compone il menu di un contesto.
 * @param cfg data/mappa.json → menu[contesto]: { rapida?: [id], gruppi: [{ titolo, voci: [id] }], opzioni?: [id] }
 * @param fabbriche { id: () => voce | [voce] | null }; voce: { testo, azione, tasto?, titolo?, disabilitata?, scelta?,
 *   pericolo?, chiave? (per distinguere voci con lo stesso testo, per esempio di due template) }
 * @param o { titoloGruppo?: testo che sostituisce «{nome}» nei titoli dei gruppi }
 * @returns { rapida: [voce], gruppi: [{ titolo, voci }], opzioni: [voce] }
 */
export function componiMenu(cfg, fabbriche, o = {}) {
  const visti = new Set();
  const usa = (v) => {
    if (!v || v.disabilitata || visti.has(chiave(v))) return false;
    visti.add(chiave(v));
    return true;
  };
  const voci = (ids, tutte = false) => (ids ?? []).flatMap((id) => elenco(fabbriche[id]?.())).filter((v) => (tutte ? !!v : usa(v)));
  const rapida = voci(cfg.rapida, true);
  for (const v of rapida) visti.add(chiave(v));
  const gruppi = (cfg.gruppi ?? []).map((g) => ({ titolo: g.titolo.replace('{nome}', o.titoloGruppo ?? ''), voci: voci(g.voci) })).filter((g) => g.voci.length);
  // la voce distruttiva («pericolo») in fondo alle opzioni
  const opzioni = voci(cfg.opzioni).sort((a, b) => (!!a.pericolo) - (!!b.pericolo));
  return { rapida, gruppi, opzioni };
}

/** Più menu nello stesso punto (una porta e due template sotto il clic): gruppi in fila, opzioni insieme. */
export function unisciMenu(menu) {
  const visti = new Set();
  const una = (v) => (visti.has(chiave(v)) ? false : (visti.add(chiave(v)), true));
  return {
    rapida: menu.flatMap((m) => m.rapida).filter(una),
    gruppi: menu.flatMap((m) => m.gruppi).map((g) => ({ ...g, voci: g.voci.filter(una) })).filter((g) => g.voci.length),
    opzioni: menu.flatMap((m) => m.opzioni).filter(una).sort((a, b) => (!!a.pericolo) - (!!b.pericolo)),
  };
}

/**
 * Posizione del menu largo w × h aperto nel punto (x, y) di un riquadro L × A: a destra e sotto il punto; vicino al
 * bordo si apre verso sinistra o verso l'alto; mai fuori dal riquadro (margine m).
 */
export function posizioneMenu(x, y, w, h, L, A, m = 4) {
  let left = x + w + m > L ? x - w : x;
  let top = y + h + m > A ? y - h : y;
  left = Math.max(m, Math.min(left, L - w - m));
  top = Math.max(m, Math.min(top, A - h - m));
  return { left, top };
}

/** Errore della configurazione dei menu (data/mappa.json → menu), o null. */
export function erroreMenu(menu) {
  if (!menu || typeof menu !== 'object') return 'menu: oggetto atteso';
  if (!(Number.isInteger(menu.altezza_voce_px) && menu.altezza_voce_px >= 32)) return 'menu.altezza_voce_px: intero da 32 in su (voci per il dito)';
  for (const c of CONTESTI_MENU) {
    const m = menu[c];
    if (!m || !Array.isArray(m.gruppi)) return `menu.${c}.gruppi: elenco atteso`;
    const ids = [...(m.rapida ?? []), ...m.gruppi.flatMap((g) => g.voci ?? []), ...(m.opzioni ?? [])];
    for (const g of m.gruppi) if (typeof g.titolo !== 'string' || !g.titolo || !Array.isArray(g.voci)) return `menu.${c}.gruppi: { titolo, voci } attesi`;
    const ignota = ids.find((id) => !VOCI_MENU[c].includes(id));
    if (ignota) return `menu.${c}: voce «${ignota}» sconosciuta (conosciute: ${VOCI_MENU[c].join(', ')})`;
    const doppia = ids.find((id, i) => ids.indexOf(id) !== i);
    if (doppia) return `menu.${c}: voce «${doppia}» ripetuta`;
  }
  return null;
}
