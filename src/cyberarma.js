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

// ---------------------------------------------------------------------------
// A.265 (14/11/2026): la SnT della CyberArma — una potenza, quattro impieghi.
//
// «La sua potenza è Rara, corrispondente al Grado III e a una SnT base 3. La SnT effettiva scende a 2 per il
// Tecnomante, a 1 per un Custode e a 0 per il Custode che l'ha costruita e la usa come propria arma personale»
// (Armamenti 0.83 §7.25; Magia 1.17 §§24.1–24.2). La scala vale anche per le conversioni: «Capacità della riserva
// e modulatore SIN non cambiano questa scala».
//
// Al tavolo serve sapere **quale dei quattro si applica**, perché la differenza fra 3 e 0 è un terzo della
// capacità di Sintonizzazione di un personaggio al III Grado. Non è una cosa da far indovinare: nel progetto
// (`sntProgetto`) si legge il numero che si applica, con accanto l'intera scala e il perché.

/** Il blocco Artefatto di una voce del catalogo, per rif: sta in artefatti.json → artefatti_catalogo. */
export function bloccoArtefatto(rif, dati) {
  const voci = dati?.equipaggiamento?.file?.artefatti?.artefatti_catalogo ?? [];
  return lista(voci).find((x) => x?.rif === rif) ?? null;
}

/**
 * La SnT che si applica, fra le quattro della scala.
 * @param rif la voce del catalogo («armi:cyberarma» e le sue varianti)
 * @param chi { classe, costruttore } — `costruttore` vero solo per il Custode che l'ha costruita e la usa come propria
 * @returns {{ snt, chi, perche, base, scala }} oppure null se la voce non ha un blocco Artefatto
 */
export function sntCyberArma(rif, dati, { classe = null, costruttore = false } = {}) {
  const a = bloccoArtefatto(rif, dati);
  if (!a) return null;
  const perClasse = isOggetto(a.sintonizzazione_per_classe) ? a.sintonizzazione_per_classe : {};
  const c = isOggetto(a.sintonizzazione_costruttore) ? a.sintonizzazione_costruttore : null;
  const scala = [
    { chi: 'base', snt: a.sintonizzazione, nota: 'chiunque altro, secondo la potenza Rara' },
    ...Object.entries(perClasse).map(([k, n]) => ({ chi: k, snt: n, nota: `impiego del ${k}` })),
    ...(c ? [{ chi: `${c.classe} costruttore`, snt: c.snt, nota: c.condizione }] : []),
  ].sort((x, y) => x.snt - y.snt);
  if (c && costruttore && classe === c.classe) return { snt: c.snt, chi: `${c.classe} costruttore`, perche: c.condizione, base: a.sintonizzazione, scala };
  if (classe && Number.isInteger(perClasse[classe])) return { snt: perClasse[classe], chi: classe, perche: `impiego del ${classe}`, base: a.sintonizzazione, scala };
  return { snt: a.sintonizzazione, chi: 'base', perche: `SnT base della potenza ${a.potenza}`, base: a.sintonizzazione, scala };
}

/**
 * La SnT del progetto: quella dell'impiego per cui si sta lavorando l'arma. Il progetto dice la Classe
 * (`modello.classe`); «costruttore» no, perché un progetto di Paradise non costruisce un originale — lo figura
 * nella scala, con la sua condizione, così si vede che esiste e perché qui non si applica.
 */
export function sntProgetto(modello, dati, { costruttore = false } = {}) {
  const rif = modello?.rif ?? modello?.esemplare_di_partenza?.rif ?? null;
  if (!rif) return null;
  const s = sntCyberArma(rif, dati, { classe: modello?.classe ?? null, costruttore });
  if (!s) return null;
  const altre = s.scala.filter((x) => x.chi !== s.chi).map((x) => `${x.chi} ${x.snt}`).join(', ');
  return { ...s, testo: `SnT ${s.snt} — ${s.perche}${altre ? ` (nella scala: ${altre})` : ''}` };
}
