// Quanto vale un veicolo (A.257, Davide 06/11/2026). Funzioni pure.
//
// «Il prezzo di catalogo dello Scout standard resta 126.510 cr. Il valore corrente della FIAT LUX comprende base,
// equipaggiamento installato o assegnato, dotazione portatile a bordo, munizioni e consumabili residui,
// accumulatori di ricambio e loro stato o carica. Vanno mostrati separatamente modello base, dotazione extra e
// valore totale dell'esemplare. Kit trauma, pistola medica, cartucce di naniti, 400 colpi aggiuntivi e ricambi
// rossi o verdi restano inventario del gruppo, ma concorrono al totale finché sono a bordo o assegnati; il valore
// cambia quando vengono consumati, rimossi o trasferiti.»
//
// Tre righe, non un numero solo, e non un numero scritto una volta: è un conto che **segue l'inventario**. Le voci
// in più rispetto allo standard stanno nei dati (data/veicoli.json → profilo → `dotazione_precedente.voci`, con
// quantità e prezzo unitario) e le quantità attuali nel record del mezzo (`dotazione_esemplare.voci`), accanto a
// munizioni, rinforzi e riserve, da cui alcune voci si leggono direttamente:
//  - `dalle_munizioni`: i colpi oltre quelli dello standard (la scheda del modello li comprende già nel prezzo);
//  - `dal_rinforzo`: i pezzi del rinforzo ancora esistenti (un copriruota distrutto esce dal conto);
//  - `accumulatore`: un ricambio vale il prezzo pieno meno le cariche mancanti alla tariffa di ricarica (A.264).
//
// Supera la parte della A.226 in cui il valore stimato restava vuoto perché non c'era modo di calcolarlo: il valore
// stimato del Direttore resta e prende il posto del modello base (un esemplare antico può valere meno).

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const lista = (v) => (Array.isArray(v) ? v : []);
const intero = (v, d = 0) => (Number.isInteger(v) ? v : d);

/** Il blocco `valore` dei dati dei veicoli. */
export const regoleValore = (dati) => (isOggetto(dati?.veicoli?.valore) ? dati.veicoli.valore : null);

/** Le voci della dotazione extra previste dal profilo: quelle in più rispetto allo standard. */
export const vociDotazioneExtra = (profilo) => lista(profilo?.dotazione_precedente?.voci);

/**
 * Le quantità attuali: quelle scritte nel record (`dotazione_esemplare.voci`), altrimenti quelle del profilo.
 * Una voce messa a 0 resta scritta: «consumata, rimossa o trasferita» non vuol dire sparita dal conto, vuol dire
 * che non concorre più al totale.
 */
export function quantitaDotazione(mezzo, profilo) {
  const salvate = isOggetto(mezzo?.dotazione_esemplare) ? mezzo.dotazione_esemplare.voci : null;
  const q = {};
  for (const v of vociDotazioneExtra(profilo)) q[v.id] = intero(v.quantita, 0);
  if (isOggetto(salvate)) for (const [id, n] of Object.entries(salvate)) if (Number.isInteger(n) && n >= 0) q[id] = n;
  return q;
}

/** I pezzi di un rinforzo ancora esistenti (montati + ricambi): un pezzo distrutto non c'è più. */
const pezziRinforzo = (mezzo, id) => {
  const r = mezzo?.rinforzi?.[id];
  if (!isOggetto(r)) return null;
  return [...lista(r.montati), ...lista(r.ricambi)].filter((pi) => Number.isFinite(pi) && pi > 0).length;
};

/** I colpi oltre quelli dello standard del modello (la scheda li comprende già nel prezzo di catalogo). */
const colpiOltreStandard = (mezzo, voce) => {
  const i = intero(voce?.dalle_munizioni?.arma, 0);
  const m = lista(mezzo?.munizioni)[i];
  if (!isOggetto(m)) return null;
  const standard = intero(voce.dalle_munizioni.standard, 0);
  return Math.max(0, intero(m.riserva, 0) - standard);
};

/** Un accumulatore di ricambio: quanti ce ne sono e quante cariche hanno (A.257: «e loro stato o carica»). */
const ricambiAccumulatore = (mezzo, voce) => {
  const r = mezzo?.energia?.[voce?.accumulatore?.riserva];
  if (!Array.isArray(r)) return null;
  const cap = intero(voce.accumulatore.cariche, 0);
  return { quantita: r.length, cariche: r.map((n) => Math.max(0, Math.min(cap, Number.isFinite(n) ? Math.floor(n) : 0))), capacita: cap };
};

/**
 * Le righe della dotazione extra: una per voce, con la quantità di adesso e il suo valore.
 * @returns [{ id, nome, quantita, crUnitario, cr, nota, da, cariche?, mancanti?, calo? }]
 */
export function righeDotazioneExtra(mezzo, profilo, dati) {
  const q = quantitaDotazione(mezzo, profilo);
  const tariffaPiena = regoleValore(dati)?.accumulatori?.valore ?? null;
  return vociDotazioneExtra(profilo).map((v) => {
    const unit = intero(v.cr_unitario, 0);
    let quantita = q[v.id] ?? 0;
    let da = 'dotazione';
    let extra = {};
    if (isOggetto(v.dalle_munizioni)) {
      const n = colpiOltreStandard(mezzo, v);
      if (n !== null) { quantita = n; da = 'munizioni'; }
    } else if (typeof v.dal_rinforzo === 'string') {
      const n = pezziRinforzo(mezzo, v.dal_rinforzo);
      if (n !== null) { quantita = n; da = 'rinforzo'; }
    } else if (isOggetto(v.accumulatore)) {
      const r = ricambiAccumulatore(mezzo, v);
      if (r) {
        quantita = r.quantita;
        da = 'accumulatore';
        // A.264: un ricambio vale il prezzo pieno meno quanto costa riportarlo a piena carica
        const tariffa = intero(v.accumulatore.ricarica_cr_per_carica, 0);
        const mancanti = r.cariche.reduce((s, c) => s + Math.max(0, r.capacita - c), 0);
        extra = { cariche: r.cariche, capacita: r.capacita, mancanti, calo: Math.min(unit * quantita, mancanti * tariffa), tariffa, regola: tariffaPiena };
      }
    }
    const pieno = unit * quantita;
    return {
      id: v.id,
      nome: v.nome,
      quantita,
      crUnitario: unit,
      cr: Math.max(0, pieno - (extra.calo ?? 0)),
      consumabile: v.consumabile === true,
      nota: v.nota ?? null,
      da,
      ...extra,
    };
  });
}

/**
 * Il valore dell'esemplare in tre righe (A.257): modello base, dotazione extra, totale.
 * @returns {{ base: { cr, da, nome, nota }, extra: { cr, righe }, totale: { cr }, esemplareUnico, mancante }}
 *   `base.da` dice da dove viene: «valore stimato dal Direttore» (A.226) o «prezzo di catalogo del modello».
 *   `mancante` è vero quando non c'è un modello base da cui partire (esemplare unico senza valore stimato, A.240).
 */
export function valoreEsemplare(mezzo, profilo, dati) {
  const stimato = Number.isInteger(mezzo?.valore_stimato_cr) && mezzo.valore_stimato_cr >= 0 ? mezzo.valore_stimato_cr : null;
  const unico = profilo?.esemplare_unico === true;
  const catalogo = !unico && Number.isInteger(profilo?.prezzo_cr) ? profilo.prezzo_cr : null;
  const righe = righeDotazioneExtra(mezzo, profilo, dati);
  const extra = righe.reduce((s, r) => s + r.cr, 0);
  const baseCr = stimato ?? catalogo;
  const R = regoleValore(dati);
  const nomi = Object.fromEntries(lista(R?.righe).map((r) => [r.id, r.nome]));
  return {
    base: {
      cr: baseCr,
      da: stimato !== null ? 'valore stimato dal Direttore (A.226)' : catalogo !== null ? 'prezzo di catalogo del modello standard' : null,
      nome: nomi.base ?? 'Modello base',
      nota: baseCr === null ? (unico ? R?.esemplare_unico ?? 'esemplare unico: senza prezzo di catalogo' : 'il modello non ha un prezzo di catalogo: lo stima il Direttore') : null,
    },
    extra: { cr: extra, righe, nome: nomi.extra ?? 'Dotazione extra' },
    totale: { cr: baseCr === null ? null : baseCr + extra, nome: nomi.totale ?? 'Valore totale dell’esemplare' },
    esemplareUnico: unico,
    mancante: baseCr === null,
  };
}

/**
 * Cambia la quantità di una voce della dotazione extra: consumata, rimossa o trasferita (A.257). Non tocca le voci
 * che si leggono da munizioni, rinforzi o riserve: quelle cambiano dove stanno. Torna il mezzo nuovo.
 */
export function cambiaDotazioneExtra(mezzo, profilo, id, quantita) {
  const v = vociDotazioneExtra(profilo).find((x) => x.id === id);
  if (!v) return { errore: `voce «${id}» non prevista dalla dotazione di questo esemplare` };
  if (isOggetto(v.dalle_munizioni) || typeof v.dal_rinforzo === 'string' || isOggetto(v.accumulatore)) {
    return { errore: `«${v.nome}» si conta da ${isOggetto(v.dalle_munizioni) ? 'le munizioni' : typeof v.dal_rinforzo === 'string' ? 'i pezzi del rinforzo' : 'le riserve del mezzo'}: si cambia lì` };
  }
  const n = Math.max(0, intero(quantita, 0));
  const q = { ...(isOggetto(mezzo?.dotazione_esemplare?.voci) ? mezzo.dotazione_esemplare.voci : {}) };
  const partenza = quantitaDotazione(mezzo, profilo);
  for (const x of vociDotazioneExtra(profilo)) if (!(x.id in q) && !isOggetto(x.dalle_munizioni) && typeof x.dal_rinforzo !== 'string' && !isOggetto(x.accumulatore)) q[x.id] = partenza[x.id] ?? 0;
  q[id] = n;
  return { mezzo: { ...mezzo, dotazione_esemplare: { ...(isOggetto(mezzo?.dotazione_esemplare) ? mezzo.dotazione_esemplare : {}), voci: q } }, voce: v, quantita: n };
}
