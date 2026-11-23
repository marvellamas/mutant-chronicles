// Come si alimenta la CyberArma (A.251, Davide 06/11/2026; Armamenti 0.74 §§7.25–7.25.4). Funzioni pure.
//
// Due famiglie di modifiche che non si comportano allo stesso modo:
//  - **cristallo sostituito** e **SIN inserita**: l'arma continua a potersi alimentare con i PM personali e
//    conserva le proprietà da Custode; le due cose coesistono con quell'alimentazione;
//  - **riserva interna di CM** e **conversione a NeC**: impediscono l'uso dei PM personali e fanno perdere le
//    proprietà da Custode. Sono conversioni energetiche alternative: non si cumulano fra loro.
// Consumi (A.260 del 15/11/2026): configurazione CM 1 CM + 1 AzP per 10 Round; conversione NeC rossa 1 carica
// + 1 AzP per 10 Round. Si contano i Round, non i colpi: «indipendentemente da attacchi, colpi o Azioni».
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
 * Il consumo di una conversione, come si legge: «1 CM + 1 AzP · 10 Round». null per cristallo e SIN.
 * A.260 (15/11/2026): si conta in **Round**, non in colpi — una carica alimenta la manifestazione per i Round
 * dichiarati, indipendentemente da attacchi, colpi o Azioni.
 */
export function consumoAlimentazione(id, dati) {
  const c = famigliaAlimentazione(id, dati)?.consumo;
  if (!isOggetto(c)) return null;
  const quanto = Number.isFinite(c.cm) ? `${c.cm} CM` : Number.isFinite(c.cariche) ? `${c.cariche} caric${c.cariche === 1 ? 'a' : 'he'}${c.colore ? ` NeC ${c.colore}` : ''}` : null;
  return { ...c, quanto, testo: c.testo ?? [quanto, c.azione].filter(Boolean).join(' + ') + (c.round ? ` · ${c.round} Round` : '') };
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

// ---------------------------------------------------------------------------
// Lotto 209 (A.271): «riserva interna e PM personali insieme» non deve poter esistere.
//
// Il 16/11/2026 la risposta alla A.271 ha detto che la CyberArma di Dimitri ha un focalizzatore Verde e **nessuna**
// SIN, riserva di CM o conversione a NeC (E&L, raccordo dell'11 novembre; Armamenti 0.86 §7.25.4). Nel suo file è
// `armi:cyberarma-batteria-verde` con 5 CM — il modello sbagliato — e quella voce offriva anche «attiva con 2 PM
// personali» (A.236, la regola di prima). La A.251 del 06/11 dice il contrario: una riserva interna o un NeC sono
// l'**unica** alimentazione, e i PM personali si perdono. Le due cose insieme sono un'incoerenza del dato, non una
// scelta del Direttore: qui la si riconosce, e la consegna di un progetto si ferma invece di scriverla.

/** La conversione (riserva di CM, NeC) la cui voce di catalogo è `rif`, o null per l'originale e per ogni altra voce. */
export const conversioneDellaVoce = (rif, dati) => conversioniAlimentazione(dati).find((f) => f.voce === rif) ?? null;

/**
 * Come si alimenta una voce dell'inventario, **dalla voce stessa**: una voce di conversione non spende PM personali
 * qualunque cosa dica l'esemplare. @returns {{ conversione: string|null, pmPersonali: boolean, proprietaCustode: boolean }}
 */
export function alimentazioneDellaVoce(voce, dati) {
  const conv = conversioneDellaVoce(voce?.rif, dati);
  const d = isOggetto(voce?.esemplare?.alimentazione) ? voce.esemplare.alimentazione : null;
  if (conv) return { conversione: conv.id, pmPersonali: false, proprietaCustode: false };
  return { conversione: d?.conversione ? d.id ?? null : null, pmPersonali: d ? d.pm_personali !== false : true, proprietaCustode: d ? d.proprieta_custode !== false : true };
}

/** Le incoerenze di una voce già scritta: riserva interna e PM personali dichiarati insieme, o due conversioni. [] se coerente. */
export function incoerenzeAlimentazione(voce, dati) {
  const conv = conversioneDellaVoce(voce?.rif, dati);
  const d = isOggetto(voce?.esemplare?.alimentazione) ? voce.esemplare.alimentazione : null;
  const out = [];
  if (conv && d && d.conversione !== true && d.pm_personali !== false) {
    out.push(`la voce è «${conv.nome}» (riserva dedicata) ma l'esemplare dichiara l'alimentazione con i PM personali: una riserva interna o un NeC sono l'unica alimentazione (A.251)`);
  }
  if (conv && d?.conversione === true && d.id && d.id !== conv.id) {
    out.push(`la voce è «${conv.nome}» ma l'esemplare dichiara «${famigliaAlimentazione(d.id, dati)?.nome ?? d.id}»: le conversioni energetiche non si cumulano (A.251)`);
  }
  return out;
}

/**
 * Che cosa succederebbe consegnando un progetto con l'alimentazione scelta (`alimentazioneId`, null = nessuna scelta)
 * all'esemplare `bersaglio`. @returns {{ errori: string[], installata, scelta }} — `errori` non vuoto = la consegna si ferma.
 */
export function controllaConsegna(bersaglio, alimentazioneId, dati) {
  const installata = conversioneDellaVoce(bersaglio?.rif, dati);
  const scelta = alimentazioneId ? famigliaAlimentazione(alimentazioneId, dati) : null;
  const errori = [];
  if (installata && scelta && scelta.conversione !== true) {
    errori.push(`l'esemplare ha già «${installata.nome}»: con «${scelta.nome}» resterebbero insieme la riserva interna e l'alimentazione con i PM personali, e la A.251 dice che le due cose non stanno insieme (una riserva interna o un NeC sono l'unica alimentazione). Se la voce è quella sbagliata, si corregge prima (node tools/correggi-cyberarma-dimitri.mjs, A.271)`);
  }
  if (installata && scelta && scelta.conversione === true && scelta.id !== installata.id) {
    errori.push(`l'esemplare ha già «${installata.nome}»: aggiungere «${scelta.nome}» sarebbe una seconda conversione, e le conversioni energetiche non si cumulano (A.251)`);
  }
  return { errori, installata, scelta };
}

/** Come si legge un'alimentazione, in una riga: «PM personali (2 PM · 10 Round)», «riserva interna di CM», «NeC Rosso». */
export function descriviAlimentazione(a) {
  if (a?.conversione) return `${famigliaNomePerId(a.conversione)} — niente PM personali, niente proprietà da Custode`;
  return 'PM personali — proprietà da Custode conservate';
}
const NOMI_CONVERSIONE = { riserva_cm: 'riserva interna di CM', nec: 'conversione a NeC' };
const famigliaNomePerId = (id) => NOMI_CONVERSIONE[id] ?? id;

// ---------------------------------------------------------------------------
// Lotto 210: i focalizzatori — un bonus per colore, calcolato dove si calcola il VA.
//
// Il 209 ha lasciato una lacuna: il manuale dà al Verde +1 VA di Attacco, +1 alla Parata e +1 al danno e la scheda di
// Dimitri non li mostrava (VA 9 senza niente). I colori sono cinque e stanno tutti nei dati (`focalizzatori` della voce
// `cyberarma`, `tools/lotti/lotto_210_focalizzatori.mjs`): un valore scritto a mano nella voce invecchia, uno calcolato no.

/** Il blocco `focalizzatori` dei dati, o null. */
export function focalizzatoriCyberArma(dati) {
  const voci = dati?.equipaggiamento?.file?.armi?.oggetti ?? dati?.equipaggiamento?.oggetti ?? [];
  return lista(voci).find((x) => isOggetto(x.focalizzatori))?.focalizzatori ?? null;
}

const idColore = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * Il bonus del focalizzatore di una CyberArma dell'inventario.
 *
 * **La firma non ha valori predefiniti, di proposito** (la lezione del 192): `classi` è obbligatorio e se manca si ferma con
 * un errore. Il Custode non riceve il bonus qui, perché la sua tabella per Grado ha già il cristallo dentro e sommarlo lo
 * conterebbe due volte; un chiamante che dimenticasse le Classi darebbe a un Custode il bonus due volte, in silenzio.
 *
 * @param voce la voce dell'inventario (`rif`, `esemplare.focalizzatore`)
 * @param classi i nomi delle Classi del personaggio
 * @returns {null | { colore, id, va, parata, danno, custode, senzaNumero, condizionale, paragrafo } | { sconosciuto }}
 *   null: nessun focalizzatore dichiarato (o non è una CyberArma); `sconosciuto`: colore che i dati non conoscono.
 */
export function bonusFocalizzatore(voce, classi, dati) {
  if (!Array.isArray(classi)) throw new TypeError('bonusFocalizzatore: servono le Classi del personaggio (un array): il Custode non riceve il bonus qui');
  if (typeof voce?.rif !== 'string' || !voce.rif.startsWith('armi:cyberarma')) return null;
  // lotto 235: il colore lo dichiara l'esemplare oppure il profilo di catalogo (le cinque voci per colore).
  // L'esemplare vince: è il record, il profilo è il modello.
  const colore = coloreCristallo(voce, dati);
  if (!colore) return null;
  const F = focalizzatoriCyberArma(dati);
  if (!F) return { sconosciuto: colore };
  const f = lista(F.elenco).find((x) => x.id === idColore(colore));
  if (!f) return { sconosciuto: colore };
  const custode = F.si_applica_a === 'non_custode' && classi.includes('Custode');
  return {
    colore: f.nome, id: f.id, custode,
    va: custode ? 0 : f.va_attacco ?? 0, parata: custode ? 0 : f.va_parata ?? 0, danno: custode ? 0 : f.danno ?? 0,
    senzaNumero: f.senza_numero ?? null, condizionale: f.condizionale ?? null, proprietaDanno: f.proprieta_danno ?? null, paragrafo: f.paragrafo ?? null,
    // lotto 235: l'effetto sul bersaglio (Plasma, Elettricità) e la Corruzione del frammento Viola, dichiarati e non applicati
    effettoSulBersaglio: f.effetto_sul_bersaglio ?? null, corruzioneDalFrammento: f.corruzione_dal_frammento ?? null, eccezionale: f.eccezionale === true,
  };
}

// ─── Lotto 235 (23/11/2026): i cinque cristalli, i loro effetti e il cambio di cristallo ───────────────────────
//
// Fonte: Armamenti 0.90 §7.25 e §7.25.5, Giocatore 0.65 §5.24. Niente numeri qui dentro: stanno nel blocco
// `focalizzatori` della voce `cyberarma` (tools/lotti/lotto_235_cristalli.mjs).
//
// Tre cose che l'app **non** fa, e che sono scritte perché nessuno le aggiunga per sbaglio: non tira la PS Tempra
// del Plasma o dell'Elettricità, non applica il −2 VA né il blocco delle Azioni, non conta i 1+1d3 Round. Il §5.24
// mette due condizioni («almeno 1 danno oltre l'Armatura applicabile», «superata la Contromisura numerica») che
// l'app non può verificare da sé perché dipendono dal bersaglio e dal colpo: le scrive, e decide il Direttore.

/** L'elenco dei cinque cristalli, dai dati: quello che si cerca e che si sceglie. «CyberArma» non è un colore. */
export const cristalliCyberArma = (dati) => lista(focalizzatoriCyberArma(dati)?.elenco).map((f) => ({
  id: f.id, nome: f.nome, voce: f.voce ?? null, dannoBase: f.danno_base_tecnomante ?? null,
  va: f.va_attacco ?? 0, parata: f.va_parata ?? 0, danno: f.danno ?? 0,
  condizionale: f.condizionale ?? null, effettoSulBersaglio: f.effetto_sul_bersaglio ?? null,
  corruzione: f.corruzione_dal_frammento ?? null, eccezionale: f.eccezionale === true,
  perGradoCustode: f.per_grado_custode ?? null, paragrafo: f.paragrafo ?? null,
}));

/** La voce di catalogo di un `rif` «armi:…», o null. */
function voceArmi(rif, dati) {
  if (typeof rif !== 'string' || !rif.startsWith('armi:')) return null;
  const id = rif.slice('armi:'.length);
  const voci = dati?.equipaggiamento?.file?.armi?.oggetti ?? dati?.equipaggiamento?.oggetti ?? [];
  return lista(voci).find((x) => x.id === id) ?? null;
}

/**
 * Il colore del cristallo di una voce dell'inventario: quello dichiarato dall'esemplare, altrimenti quello del
 * profilo di catalogo (le cinque voci per colore del lotto 235). L'esemplare vince sempre, perché è il record e il
 * profilo è il modello: la CyberArma di Dimitri è «armi:cyberarma» e il suo colore sta nel suo esemplare.
 */
export function coloreCristallo(voce, dati) {
  return voce?.esemplare?.focalizzatore ?? voceArmi(voce?.rif, dati)?.focalizzatore_fisso ?? null;
}

/**
 * Il danno contro l'Oscura Simmetria del cristallo Bianco, scritto nella forma della A.199 — «(1d8+4)×2».
 *
 * Il ×2 del §7.25 è «al danno complessivo del colpo, incluso il +3»: si moltiplica il **totale**, non il solo dado,
 * quindi `(danno+3)×2` e mai `danno×2+3`. Scriverlo in quella forma vuol dire che il moltiplicatore lo applica
 * `leggiDannoMoltiplicato` di src/danno.js, che per la A.199 tira i dadi e moltiplica il totale: un posto solo.
 *
 * @param formula il danno completo già calcolato dalla scheda, bonus compresi (es. «1d8+4»)
 * @param condizionale il blocco `condizionale` del cristallo
 */
export function dannoCondizionaleCristallo(formula, condizionale) {
  const m = condizionale?.moltiplicatore_danno;
  if (!Number.isFinite(m) || m <= 1) return null;
  const f = String(formula ?? '').replace(/\s+/g, '');
  if (!f || f === '—') return null;
  return { formula: `(${f})×${m}`, moltiplicatore: m, contro: condizionale.contro ?? null, testo: condizionale.testo ?? null };
}

/** Il valore di un danno moltiplicato, coi numeri in chiaro: serve a dire «(5+1+3)×2 = 18» e non «5+1+3×2». */
export function valoreDannoCondizionale(dado, fisso, moltiplicatore) {
  const tot = Number(dado ?? 0) + Number(fisso ?? 0);
  return { base: tot, totale: tot * Number(moltiplicatore ?? 1) };
}

/** La condizione del Plasma o dell'Elettricità, da scrivere accanto all'effetto senza applicarla. */
export function condizioneSulBersaglio(effetto) {
  if (!isOggetto(effetto)) return null;
  const se = lista(effetto.condizioni);
  return {
    proprieta: effetto.proprieta ?? null,
    riga: `${effetto.proprieta} (${effetto.paragrafo}): ${effetto.prova}, con fallimento ${effetto.se_fallisce}, ${effetto.durata}.`,
    // la stessa riga senza il nome della proprietà davanti: la scheda il nome lo scrive già in grassetto
    dettaglio: `${effetto.paragrafo}: ${effetto.prova}, con fallimento ${effetto.se_fallisce}, ${effetto.durata}.`,
    quando: se.length ? `Solo se ${se.join(' e se ')}.` : null,
    laApplica: effetto.la_applica ?? null,
    appNonCalcola: effetto.app_non_calcola ?? null,
  };
}

/**
 * Cambia il cristallo focalizzatore di un esemplare: **lo stesso esemplare**, non un secondo.
 *
 * La distinzione che conta (quella della A.295 e del lotto 185): il `rif` è il **profilo** — il modello del
 * catalogo, che dice danno base, proprietà e colore — mentre `uid`, `nome`, l'Integrità e lo `storico` sono il
 * **record**, cioè l'arma che il personaggio ha in mano. Cambiare cristallo cambia il profilo e non tocca il
 * record: la voce resta una, con il suo uid (quindi i suoi PI in `sessione.integrita`), il suo nome e la sua storia,
 * a cui si aggiunge una riga. Lo stesso principio per cui il lotto 164 aggiorna l'esemplare della CyberArma invece
 * di crearne un secondo (`risultato.aggiorna_esemplare`).
 *
 * Non decide niente da sé: un colore che i dati non conoscono è un errore, non un'ipotesi.
 *
 * @returns {{ voce, riga } | { errore }}
 */
export function cambiaCristallo(voce, colore, dati, { quando = null, da = null, motivo = null } = {}) {
  if (typeof voce?.rif !== 'string' || !voce.rif.startsWith('armi:cyberarma')) return { errore: 'Non è una CyberArma: il cristallo focalizzatore si cambia solo su una CyberArma (§7.25).' };
  const id = idColore(colore);
  const c = cristalliCyberArma(dati).find((x) => x.id === id);
  if (!c) return { errore: `Il cristallo «${colore}» non è fra quelli del manuale (${cristalliCyberArma(dati).map((x) => x.nome).join(', ')}).` };
  const prima = coloreCristallo(voce, dati);
  if (prima && idColore(prima) === id) return { errore: `Il cristallo è già ${c.nome}: non c’è niente da cambiare.` };
  const riga = {
    quando, da, motivo,
    cosa: 'cambio del cristallo focalizzatore',
    prima: prima ?? null,
    dopo: c.nome,
    paragrafo: '§7.25, §7.25.3',
  };
  const nuova = {
    ...voce,
    // il profilo passa alla voce del colore quando ce n'è una; il record non si tocca
    rif: c.voce ?? voce.rif,
    esemplare: { ...(voce.esemplare ?? {}), focalizzatore: c.nome, storico: [...lista(voce.esemplare?.storico), riga] },
  };
  // la Corruzione è del frammento Viola che si è tolto: non resta addosso all'arma (§7.25.4)
  if (id !== 'viola' && nuova.esemplare.corruzione !== undefined) delete nuova.esemplare.corruzione;
  return { voce: nuova, riga };
}
