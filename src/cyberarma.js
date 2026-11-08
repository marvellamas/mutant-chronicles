// Come si alimenta la CyberArma (A.251, Davide 06/11/2026; Armamenti 0.74 §§7.25–7.25.4). Funzioni pure.
//
// Due famiglie di modifiche che non si comportano allo stesso modo:
//  - **cristallo sostituito** e **SIN inserita**: l'arma continua a potersi alimentare con i PM personali e
//    conserva le proprietà da Custode; le due cose coesistono con quell'alimentazione;
//  - **riserva interna di CM** e **conversione a NeC**: impediscono l'uso dei PM personali e fanno perdere le
//    proprietà da Custode. Sono conversioni energetiche alternative: non si cumulano fra loro.
// Consumi: configurazione CM 1 CM + 1 AzP ogni 10 colpi; conversione NeC rossa 1 carica + 1 AzP ogni 10 colpi.
//
// È una scelta che non si torna indietro facilmente, e chi la fa dal tablet non ha il manuale davanti: nel
// progetto (src/progetti.js, lotto 157) la scelta dice in chiaro che cosa si perde, prima di confermare, e le due
// conversioni le autorizza soltanto il Direttore (`alimentazioneDaTablet`).
//
// Tutti i dati stanno in data/equipaggiamento/armi.json → voce `cyberarma` → `alimentazione_modifiche`
// (tools/lotti/lotto_181_cyberarma_prezzi.mjs): nessun numero qui dentro.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const lista = (v) => (Array.isArray(v) ? v : []);

/** Il blocco `alimentazione_modifiche` della CyberArma, dai dati. null se non c'è. */
export function regoleAlimentazione(dati) {
  const voci = dati?.equipaggiamento?.file?.armi?.oggetti ?? dati?.equipaggiamento?.oggetti ?? [];
  const v = lista(voci).find((x) => isOggetto(x.alimentazione_modifiche));
  return v ? v.alimentazione_modifiche : null;
}

/** Le famiglie di modifica previste: [{ id, nome, conversione, pm_personali, proprieta_custode, consumo?, testo }]. */
export const famiglieAlimentazione = (dati) => lista(regoleAlimentazione(dati)?.famiglie);

/** Una famiglia per id, oppure null. */
export const famigliaAlimentazione = (id, dati) => famiglieAlimentazione(dati).find((f) => f.id === id) ?? null;

/** Le conversioni energetiche (riserva di CM, NeC): quelle che fanno perdere PM personali e proprietà da Custode. */
export const conversioniAlimentazione = (dati) => famiglieAlimentazione(dati).filter((f) => f.conversione === true);

/**
 * Che cosa si perde scegliendo una famiglia, da dire prima di confermare.
 * @returns {{ famiglia, conversione, perde: string[], testo, consumo }} — `perde` vuoto per cristallo e SIN.
 */
export function perditeAlimentazione(id, dati) {
  const f = famigliaAlimentazione(id, dati);
  if (!f) return null;
  const R = regoleAlimentazione(dati);
  const perde = f.conversione === true ? lista(R?.perdite) : [];
  return {
    famiglia: f.id,
    nome: f.nome,
    conversione: f.conversione === true,
    perde,
    consumo: isOggetto(f.consumo) ? f.consumo : null,
    // «Si perdono l’alimentazione con i PM personali e le proprietà da Custode (A.251).»
    testo: perde.length ? `Si perdono ${perde.join(' e ')} (A.251).` : 'L’arma continua a potersi alimentare con i PM personali e conserva le proprietà da Custode (A.251).',
  };
}

/**
 * Come si alimenta un esemplare con le modifiche indicate.
 * @param modifiche id di famiglia, o elenco di id
 * @returns {{ pmPersonali, proprietaCustode, conversione, perde, consumo, errori }}
 *   `errori` non è vuoto quando due conversioni stanno insieme: non sono cumulabili (A.251).
 */
export function alimentazioneCyberArma(modifiche, dati) {
  const ids = (Array.isArray(modifiche) ? modifiche : [modifiche]).filter((x) => typeof x === 'string' && x);
  const R = regoleAlimentazione(dati);
  const scelte = ids.map((id) => famigliaAlimentazione(id, dati)).filter(Boolean);
  const conv = scelte.filter((f) => f.conversione === true);
  const errori = [];
  const nonCumulabili = lista(R?.non_cumulabili);
  if (conv.filter((f) => nonCumulabili.includes(f.id)).length > 1) {
    errori.push(`${conv.map((f) => f.nome).join(' e ')}: sono conversioni energetiche alternative e non si cumulano (A.251).`);
  }
  for (const id of ids) if (!famigliaAlimentazione(id, dati)) errori.push(`modifica «${id}» non prevista dalla CyberArma (A.251).`);
  const prima = conv[0] ?? null;
  return {
    pmPersonali: prima ? false : R?.pm_personali_predefiniti !== false,
    proprietaCustode: prima ? false : true,
    conversione: prima?.id ?? null,
    perde: prima ? lista(R?.perdite) : [],
    consumo: isOggetto(prima?.consumo) ? prima.consumo : null,
    errori,
  };
}

/**
 * Il consumo di una conversione, come si legge: «1 CM + 1 AzP ogni 10 colpi». null per cristallo e SIN.
 */
export function consumoAlimentazione(id, dati) {
  const c = famigliaAlimentazione(id, dati)?.consumo;
  if (!isOggetto(c)) return null;
  const quanto = Number.isFinite(c.cm) ? `${c.cm} CM` : Number.isFinite(c.cariche) ? `${c.cariche} caric${c.cariche === 1 ? 'a' : 'he'}${c.colore ? ` NeC ${c.colore}` : ''}` : null;
  return { ...c, quanto, testo: c.testo ?? [quanto, c.azione].filter(Boolean).join(' + ') + (c.ogni_colpi ? ` ogni ${c.ogni_colpi} colpi` : '') };
}

/**
 * Le opzioni da mostrare nel progetto: ognuna con che cosa fa, che cosa si perde, se è compresa nei tre giorni e
 * se la può scegliere soltanto il Direttore (A.251: una conversione non la decide un tablet).
 * @param modello il modello del progetto (con `alimentazione`)
 */
export function opzioniAlimentazione(modello, dati, { master = false } = {}) {
  const A = modello?.alimentazione;
  if (!isOggetto(A)) return [];
  const comprese = lista(A.comprese);
  const soloDirettore = lista(A.solo_direttore);
  return lista(A.elenco).map((id) => {
    const f = famigliaAlimentazione(id, dati);
    const p = perditeAlimentazione(id, dati);
    const riservata = soloDirettore.includes(id);
    return {
      id,
      nome: f?.nome ?? id,
      conversione: f?.conversione === true,
      testo: f?.testo ?? '',
      perde: p?.perde ?? [],
      perdite: p?.testo ?? '',
      consumo: consumoAlimentazione(id, dati),
      compresa: comprese.includes(id),
      soloDirettore: riservata,
      sceglibile: !riservata || master,
      motivo: riservata && !master ? 'è una conversione energetica: la autorizza il Direttore (A.251)' : !comprese.includes(id) ? 'sviluppo successivo, non compreso nei giorni di questo progetto' : null,
    };
  });
}

/** L'alimentazione si può ancora scegliere? Come la forma: prima della lavorazione, progetto aperto. */
export function alimentazioneSceglibile(p) {
  if (!isOggetto(p)) return { si: false, motivo: 'progetto sconosciuto' };
  if (p.consegna) return { si: false, motivo: 'l’arma è già stata consegnata' };
  if (p.chiuso) return { si: false, motivo: 'il progetto è chiuso' };
  if (lista(p.giorni).some((g) => lista(g.tentativi).length)) return { si: false, motivo: 'la lavorazione è cominciata: l’alimentazione è fissata (per cambiarla serve un nuovo intervento sul dispositivo)' };
  return { si: true };
}

/**
 * Dai tablet si scrive soltanto un'alimentazione non riservata al Direttore e ancora sceglibile: una conversione
 * (riserva di CM, NeC) la decide il Direttore, perché fa perdere PM personali e proprietà da Custode (A.251).
 * Torna i progetti del disco con le sole alimentazioni ammesse.
 */
export function alimentazioneDaTablet(nuovi, disco, dati) {
  const d = lista(disco);
  return d.map((p) => {
    const t = lista(nuovi).find((x) => x?.id === p?.id);
    if (!t || !isOggetto(t.alimentazione) || JSON.stringify(t.alimentazione) === JSON.stringify(p.alimentazione ?? null)) return p;
    const modello = p.modello;
    const id = t.alimentazione.id;
    const soloDirettore = lista(famiglieAlimentazione(dati).filter((f) => f.conversione === true).map((f) => f.id));
    if (soloDirettore.includes(id)) return p;
    if (!alimentazioneSceglibile(p).si) return p;
    if (!famigliaAlimentazione(id, dati)) return p;
    return { ...p, modello, alimentazione: { id, quando: typeof t.alimentazione.quando === 'string' ? t.alimentazione.quando : '', da: 'giocatore' } };
  });
}
