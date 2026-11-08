// Ricarica delle armi a distanza nella modalità tavolo (Giocatore §5.1.1; Armamenti §7.20.2).
// Funzioni pure. Regole e compatibilità dai dati: munizioni.json → ricarica, munizioni_armi
// (famiglia di munizioni di ogni arma, §7.20.9) e «compatibile_con» delle munizioni speciali.
//
// Modi:
// - caricatore: si sostituisce un caricatore pieno di riserva (sessione → munizioni[uid].riserve)
//   oppure, se non ce ne sono, il parziale più carico; quello tolto resta come parziale o vuoto;
// - inserimento: armi caricate direttamente, con tamburo o serbatoio interno (revolver, doppiette, fucili a pompa e a
//   pallini a serbatoio interno, archi e balestre): una operazione (1 AzP) inserisce fino a 2 cartucce, fino a 4 con
//   Ricarica Migliorata, entro la capacità (A.135, decisione 139: supera il tamburo pieno in 1 AzP e le 3 cartucce);
// - carichini (A.135): Ricarica per Tamburo e per Serbatoio, 6 colpi; un carichino preparato trasferisce fino a 6 colpi
//   in 1 AzP entro gli spazi liberi, i colpi non trasferiti restano nel carichino; si prepara dalle munizioni sciolte
//   compatibili (sessione → carichini: { uid voce: [colpi di ogni carichino] });
// - (anche «inserimento» senza elenco: razzi, dardi chimici, combustibile compatibili fino alla capacità);
// - cella: una cella piena compatibile sostituisce quella esaurita;
// - null: nessun dato di compatibilità, la ricarica resta libera (con un avviso).
// Le munizioni sciolte consumate si contano nella sessione (sessione → scorte: { uid voce: consumate }):
// la quantità della voce resta la scelta del giocatore.
// Granate (Armamenti §7.20.3): una granata con «esplosivo» e «compatibile_con» è una scorta dei lanciagranate
// compatibili anche quando è la scheda di un'arma da lancio: la stessa voce si lancia a mano o si carica.
// I moduli integrati (§7.8) hanno un'alimentazione distinta: la loro ricarica ha un uid proprio («uid:modulo»).
// Un lanciagranate tiene un tipo di granata alla volta (munizioni[uid].tipo: uid della voce caricata).
import { catalogo, risolvi, tabellaMunizioniArmi, moduliDi, eGranata } from './equipaggiamento.js';

// accetta i dati interi o direttamente il blocco munizioni.json → ricarica (massimiSessione → regoleRicarica)
const regole = (dati) => (dati && (dati.riempimento_caricatori || dati.costi_operazioni || dati.cambio_cella) ? dati : dati?.equipaggiamento?.file?.munizioni?.ricarica ?? null);
const eVuoto = (o) => /vuot/i.test(o.id);
// una scorta è una munizione, oppure un NEC che fa da cella di un'arma (A.67: il Modulo Blu del Gehemmapuker)
const eScorta = (o) => o?.tipo === 'munizioni' || !!o?.cella || eGranata(o);

/**
 * Modo di ricarica di un'arma del catalogo.
 * @returns {{ modo: 'caricatore'|'inserimento'|'cella'|null, famiglia: string|null, vuoto: {rif, nome}|null }}
 */
export function modoRicarica(def, dati, cat = catalogo(dati)) {
  // le armi ravvicinate con cariche a cella (Armamenti §7.1.4, §7.20.5: «celle energetiche sostituibili come normali
  // caricatori») si ricaricano come quelle a distanza a cella; le altre ravvicinate non hanno ricarica
  if (def?.tipo === 'arma_ravvicinata' && def.munizioni?.capacita) {
    const r0 = regole(dati) ?? {};
    const celle = cat.oggetti.filter((o) => eScorta(o) && !eVuoto(o) && o.compatibile_con?.includes(def.rif) && ((r0.famiglie_celle ?? []).includes(o.famiglia) || o.cella));
    return celle.length ? { modo: 'cella', famiglia: null, vuoto: null } : { modo: null, famiglia: null, vuoto: null };
  }
  if (!def || def.tipo !== 'arma_distanza') return { modo: null, famiglia: null, vuoto: null };
  const r = regole(dati) ?? {};
  const famiglia = tabellaMunizioniArmi(dati).get(def.rif) ?? null;
  const ins = r.inserimento_singolo ?? {};
  const compatibili = cat.oggetti.filter((o) => eScorta(o) && !eVuoto(o) && o.compatibile_con?.includes(def.rif));
  const amovibile = (ins.caricatore_amovibile ?? []).includes(def.rif);
  if (!amovibile && ((ins.armi ?? []).includes(def.rif) || (ins.famiglie ?? []).includes(def.famiglia))) return { modo: 'inserimento', famiglia, vuoto: null, singolo: true, carichino: tipoCarichino(def, r) };
  if (famiglia) {
    // caricatore vuoto: il contenitore dedicato dell'arma (Nimrod), altrimenti quello della categoria
    const dedicato = cat.oggetti.find((o) => eVuoto(o) && o.compatibile_con?.includes(def.rif));
    const rifVuoto = dedicato?.rif ?? r.caricatori_vuoti?.[def.abilita] ?? null;
    const vuoto = rifVuoto && cat.perRif.get(rifVuoto) ? { rif: rifVuoto, nome: cat.perRif.get(rifVuoto).nome } : null;
    return { modo: 'caricatore', famiglia, vuoto };
  }
  if (compatibili.some((o) => (r.famiglie_celle ?? []).includes(o.famiglia) || (o.cella && o.tipo !== 'munizioni'))) return { modo: 'cella', famiglia: null, vuoto: null };
  if (compatibili.length) return { modo: 'inserimento', famiglia: null, vuoto: null };
  return { modo: null, famiglia: null, vuoto: null };
}

/** A.135: tipo di carichino di un'arma a inserimento («tamburo», «serbatoio») o null (munizioni.json → ricarica.carichini). */
function tipoCarichino(def, r) {
  for (const [t, x] of Object.entries(r.carichini?.tipi ?? {})) if ((x.armi ?? []).includes(def.rif) || (x.famiglie ?? []).includes(def.famiglia)) return t;
  return null;
}

/**
 * Per ogni arma a distanza della lista: modo, capacità e scorte compatibili dell'inventario
 * (munizioni sciolte o celle, con la quantità della voce). Serve ai massimi della sessione.
 * @returns {{ [uid]: { modo, capacita, famiglia, vuoto, scorte: [{uid, nome, quantita}] } }}
 */
export function infoRicarica(voci, dati) {
  const cat = catalogo(dati);
  const r = regole(dati) ?? {};
  const risolte = (voci ?? []).map((v) => risolvi(v, cat));
  // le munizioni nel deposito comune non sono a disposizione (docs/layout-sd.md, «Inventario»)
  const munizioni = risolte.filter((x) => eScorta(x.def) && x.def && !eVuoto(x.def) && !x.deposito);
  const out = {};
  const perArma = (uid, def) => {
    const info = modoRicarica(def, dati, cat);
    const compatibile = (m) => (info.famiglia && m.def.munizione?.famiglia === info.famiglia) || m.def.compatibile_con?.includes(def.rif);
    // §7.8: la munizione di riferimento del lanciatore per prima (la granata standard), poi le altre
    const riferimento = (m) => [m.def.nome, ...(m.def.nomi_alternativi ?? [])].includes(def.munizioni?.riferimento);
    const scorte = munizioni.filter(compatibile)
      .filter((m) => info.modo !== 'cella' || (r.famiglie_celle ?? []).includes(m.def.famiglia) || (m.def.cella && m.def.tipo !== 'munizioni'))
      // prima le munizioni ordinarie, poi le speciali (l'ordine d'inserimento lo sceglie il giocatore al tavolo)
      .sort((x, y) => Number(x.def.famiglia !== 'Munizioni ordinarie') - Number(y.def.famiglia !== 'Munizioni ordinarie') || Number(!riferimento(x)) - Number(!riferimento(y)))
      .map((m) => ({ uid: m.uid, nome: m.nome, quantita: m.voce.quantita, rif: m.def.rif, ...(eGranata(m.def) || m.def.esplosivo ? { granata: true } : {}), ...(riferimento(m) ? { riferimento: true } : {}) }));
    // §7.8: la munizione di riferimento nel catalogo (le granate caricate in partenza sono quella munizione)
    const rifRiferimento = def.munizioni?.riferimento ? cat.oggetti.find((o) => eScorta(o) && [o.nome, ...(o.nomi_alternativi ?? [])].includes(def.munizioni.riferimento))?.rif ?? null : null;
    // A.135: i carichini del tipo dell'arma (non quelli del deposito comune)
    const tipoC = info.carichino ? r.carichini?.tipi?.[info.carichino] : null;
    const carichini = tipoC ? risolte.filter((x) => x.def?.rif === tipoC.rif && !x.deposito).map((x) => ({ uid: x.uid, nome: x.nome, quantita: x.voce.quantita ?? 1 })) : [];
    // A.215: la cella o il pacco compatibile (nome e unità: «getti» per i pacchi dei lanciafiamme, §7.20.6)
    const cellaDef = info.modo === 'cella' ? cat.oggetti.find((o) => o.cella && !eVuoto(o) && o.compatibile_con?.includes(def.rif)) : null;
    out[uid] = { ...info, capacita: def.munizioni?.capacita ?? null, scorte, ...(cellaDef ? { cella: { rif: cellaDef.rif, nome: cellaDef.nome, unita: cellaDef.cella.unita ?? 'colpi' } } : {}), ...(tipoC ? { carichini, colpiCarichino: r.carichini.colpi ?? 6 } : {}), ...(scorte.some((x) => x.granata) || (rifRiferimento && eGranata(cat.perRif.get(rifRiferimento))) ? { granate: true, rifRiferimento } : {}) };
  };
  // le granate da lancio non hanno caricatore: si lanciano dalla quantità della voce (src/sessione.js → consumaColpi)
  for (const a of risolte.filter((x) => x.tipo === 'arma_distanza' && x.def && !eGranata(x.def))) perArma(a.uid, a.def);
  // A.215: le armi ravvicinate a cella (spade elettrificate, tirapugni concussivo…) con le loro celle compatibili
  for (const a of risolte.filter((x) => x.tipo === 'arma_ravvicinata' && x.def?.munizioni?.capacita && modoRicarica(x.def, dati, cat).modo === 'cella')) perArma(a.uid, a.def);
  // §7.8: i moduli integrati hanno la propria alimentazione, distinta da quella dell'arma principale
  for (const a of risolte.filter((x) => (x.tipo === 'arma_distanza' || x.tipo === 'arma_ravvicinata') && x.def)) {
    for (const m of moduliDi(a.def, cat)) if (m.tipo === 'arma_distanza') perArma(`${a.uid}:${m.id}`, m);
  }
  return out;
}

/** Munizioni sciolte ancora disponibili di una scorta, dopo i consumi della sessione. */
export const disponibili = (scorta, consumi = {}) => Math.max(0, scorta.quantita - (consumi[scorta.uid] ?? 0));

/**
 * Si può ricaricare? { possibile, motivo, avviso }: il motivo spiega il pulsante disabilitato;
 * l'avviso segnala i dati mancanti (ricarica libera, nessun blocco).
 * @param munizione { colpi, riserve, parziali, vuoti } della sessione
 */
export function statoRicarica(info0, munizione, consumi = {}) {
  const info = perTipo(info0, munizione, consumi);
  const colpi = munizione?.colpi ?? 0;
  if (!info) return { possibile: true, motivo: null, avviso: null };
  if (info.capacita === null) return { possibile: false, motivo: 'nessun caricatore nella scheda dell’arma', avviso: null };
  if (colpi >= info.capacita) return { possibile: false, motivo: info.modo === 'cella' ? 'già carica' : 'caricatore già pieno', avviso: null };
  if (info.modo === null) return { possibile: true, motivo: null, avviso: 'Compatibilità delle munizioni non nei dati: la ricarica non scala le riserve.' };
  if (info.modo === 'caricatore') {
    // 03/11: senza caricatore nell'arma basta un caricatore di scorta con almeno un colpo
    if (!caricatoreInserito(munizione)) return caricatoriDiScorta(munizione, info.capacita).some((n) => n > 0)
      ? { possibile: true, motivo: null, avviso: null } : { possibile: false, motivo: 'nessun caricatore di scorta con colpi', avviso: null };
    return (munizione?.riserve ?? 0) > 0 || (munizione?.parziali ?? []).some((n) => n > colpi)
      ? { possibile: true, motivo: null, avviso: null }
      : caricatoriDiScorta(munizione, info.capacita).length
        // 03/11: un caricatore di scorta meno carico si mette lo stesso, ma lo sceglie il giocatore («Cambia con questo»)
        ? { possibile: false, motivo: 'i caricatori di scorta non hanno più colpi di quello inserito: per metterne uno, sceglilo in «Cambia con questo»', avviso: null }
        : { possibile: false, motivo: 'nessun caricatore compatibile', avviso: null };
  }
  if (info.modo === 'cella') {
    // A.215: si cambia con la cella più carica fra quelle tolte e le piene di scorta; una cella vuota non serve
    return migliorCella(info, munizione, consumi)
      ? { possibile: true, motivo: null, avviso: null }
      : { possibile: false, motivo: 'nessuna cella carica compatibile (le celle tolte si ricaricano con un trasformatore)', avviso: null };
  }
  const tot = info.scorte.reduce((s, x) => s + disponibili(x, consumi), 0);
  if (!tot) return { possibile: false, motivo: 'nessuna munizione compatibile', avviso: null };
  return { possibile: true, motivo: null, avviso: null };
}

// ── Costi delle operazioni (A.243 per le celle, A.249 per i caricatori; Davide, 06/11/2026) ──
// Tre gesti distinti, con lo stesso costo, e il terzo NON è la somma dei primi due:
//   estrazione    togliere soltanto                       1 AzP
//   inserimento   metterne uno pronto in un'arma vuota    1 AzP
//   sostituzione  fuori il vecchio, dentro il nuovo       1 AzP complessivo (una sola operazione)
// Quello che esce conserva esattamente la carica o i colpi residui.

/** Le tre operazioni che hanno un costo d'azione (A.243, A.249). */
export const OPERAZIONI = ['estrazione', 'inserimento', 'sostituzione'];

/**
 * Il costo d'azione di un'operazione su una cella, un pacco o un caricatore (A.243, A.249).
 * La sostituzione del manuale (Armamenti §7.20.2, §7.20.5, §7.20.6) vale per il modo e l'unità dell'arma; estrazione e
 * inserimento hanno il costo della risposta. Nessuna somma: `sostituzione` non è estrazione + inserimento.
 * @param info voce di infoRicarica() (per il modo e l'unità del pacco), o null
 * @returns {{ operazione, azione, azioni: number, testo }} `azioni` = Azioni Principali, 1 per tutte e tre
 */
export function costoOperazione(dati, operazione, info = null) {
  const r = regole(dati) ?? {};
  const C = r.costi_operazioni ?? {};
  const voce = C[operazione] ?? null;
  if (operazione === 'sostituzione') {
    // il costo del manuale per quell'arma: i pacchi dei lanciafiamme vogliono entrambe le mani (§7.20.6)
    const cc = r.cambio_cella ?? {};
    const dalManuale = info?.modo === 'cella' ? cc.per_unita?.[info?.cella?.unita]?.azione ?? cc.azione : null;
    return { operazione, azione: dalManuale ?? voce?.azione ?? '1 AzP', azioni: 1, testo: voce?.testo ?? '' };
  }
  return { operazione, azione: voce?.azione ?? '1 AzP', azioni: 1, testo: voce?.testo ?? '' };
}

/**
 * A.250 (Davide, 06/11/2026): «Un caricatore compatibile, accessibile e con almeno un colpo è considerato pronto anche se
 * non è pieno. Ha lo stesso costo d'azione e beneficia normalmente di Ricarica Rapida o Ricarica Esperta.» Vale anche per
 * una cella: con almeno una carica è pronta. Un caricatore (o una cella) vuoto non è pronto.
 */
export function eProntoColpi(colpi, dati = null) {
  const minimo = regole(dati)?.caricatore_pronto?.colpi_minimo ?? 1;
  return Number.isFinite(colpi) && colpi >= minimo;
}

/**
 * A.244 (Davide, 06/11/2026): «riempire i caricatori richiede 1 minuto ogni 50 colpi trasferiti, o frazione, calcolato
 * sul totale dell'operazione». Sul totale: 120 colpi in un'operazione sono 3 minuti, non tre operazioni da 1.
 */
export function minutiRiempimento(trasferiti, dati = null) {
  const t = regole(dati)?.riempimento_caricatori?.tempo ?? null;
  const n = Math.max(0, Math.floor(Number(trasferiti) || 0));
  if (!t || !n) return 0;
  const ogni = Number(t.ogni_colpi) > 0 ? Number(t.ogni_colpi) : 50;
  return Math.ceil(n / ogni) * (Number(t.minuti) || 1);
}

/** «3 minuti» / «1 minuto». */
export const testoMinuti = (n) => (n === 1 ? '1 minuto' : `${n} minuti`);

// ── Celle e pacchi (A.215, risposta di Davide del 30/10/2026) ──
// «La cella energetica può essere ricaricata soltanto dopo essere stata tolta dall'arma.» «La cella tolta conserva
// analogamente le cariche residue e può essere ricaricata con un trasformatore compatibile.» «Le scorte devono conservare
// formato, compatibilità e quantità residua, distinguendo caricatori o celle pieni, parzialmente pieni e vuoti. Quelli
// identici possono essere raggruppati. Restano i profili specifici dei pacchi composti.»
// Una cella è una cosa che si sposta. Per ogni arma a cella (sessione → munizioni[uid]):
//   colpi: le cariche della cella inserita; senzaCella: true se nell'arma non c'è nessuna cella;
//   celle: le cariche di ognuna delle celle tolte da quell'arma e tenute (piene, parziali o vuote: una vuota non è
//   «consumata», resta e si ricarica);
// le celle piene mai usate restano la quantità della voce nell'Inventario, meno quelle già inserite (sessione → scorte).
// Così una cella non si crea e non si perde: inserita + tolte + piene di scorta restano lo stesso numero.

// A.245 (Davide, 06/11/2026): «Ogni singola cella possiede 2 PI. Una cella danneggiata deve essere separata dalla pila.
// A 0 PI è distrutta e inutilizzabile, normalmente non riparabile: l'evento va registrato e la cella va rimossa dalle
// scorte utilizzabili.» Nel file una cella tolta è il numero delle sue cariche finché è intera (com'era prima del lotto
// 180) e diventa `{ c: cariche, pi }` appena è danneggiata: così si segue da sola e non torna nella pila. I PI della
// cella inserita stanno in `munizione.piCella`, scritto solo se è danneggiata.

/** PI massimi di una cella (dati; 2 per la A.245). */
export const piMassimiCella = (dati) => regole(dati)?.integrita_celle?.pi_max ?? 2;

const unaCella = (x, piMax) => (typeof x === 'number'
  ? { cariche: x, pi: piMax }
  : { cariche: Number.isInteger(x?.c) ? x.c : 0, pi: Number.isInteger(x?.pi) ? x.pi : piMax });

/**
 * Le celle tolte con le loro cariche e i loro PI: [{ cariche, pi, rotta }] (rotta = 0 PI, distrutta e inutilizzabile).
 * L'ordine è quello del file: l'indice di una cella non cambia finché non la si toglie dall'elenco.
 */
export function celleDettaglio(munizione, capacita = Infinity, piMax = 2) {
  return (Array.isArray(munizione?.celle) ? munizione.celle : [])
    .map((x) => unaCella(x, piMax))
    .filter((x) => Number.isInteger(x.cariche) && x.cariche >= 0)
    .map((x) => ({ cariche: Math.min(x.cariche, capacita), pi: Math.max(0, Math.min(x.pi, piMax)), rotta: x.pi <= 0 }));
}

/** Rimette l'elenco nella forma del file: un numero se la cella è intera, { c, pi } se è danneggiata. */
export const scriviCelle = (lista, piMax) => lista.map((x) => (x.pi >= piMax ? x.cariche : { c: x.cariche, pi: Math.max(0, x.pi) }));

/** I PI della cella inserita nell'arma (piMax se il file non dice altro). */
export const piCellaInserita = (munizione, piMax) => (Number.isInteger(munizione?.piCella) ? Math.max(0, Math.min(munizione.piCella, piMax)) : piMax);

/** Le celle tolte di un'arma, con le loro cariche (entro la capacità). */
export const celleTolte = (munizione, capacita = Infinity) => celleDettaglio(munizione, capacita, 2).map((x) => x.cariche);

/** C'è una cella nell'arma? (le armi salvate prima di A.215 l'hanno sempre). */
export const cellaInserita = (munizione) => !munizione?.senzaCella;

/**
 * La cella più carica da mettere nell'arma: fra le tolte (prima, a parità di cariche: non si tocca una scorta nuova) e
 * le piene di scorta dell'Inventario. null se non ce n'è una con almeno una carica.
 * @returns {{ da: 'tolta', indice, cariche } | { da: 'scorta', uid, cariche } | null}
 */
export function migliorCella(info, munizione, consumi = {}, piMax = 2) {
  const cap = info?.capacita ?? 0;
  // A.245: una cella a 0 PI è distrutta e non entra nell'arma; A.250: con almeno una carica è pronta
  const tolte = celleDettaglio(munizione, cap, piMax).map((x, indice) => ({ da: 'tolta', indice, cariche: x.cariche, rotta: x.rotta }))
    .filter((x) => !x.rotta && x.cariche > 0);
  const scorta = (info?.scorte ?? []).find((s) => disponibili(s, consumi) > 0);
  const candidati = [...tolte, ...(scorta ? [{ da: 'scorta', uid: scorta.uid, cariche: cap }] : [])];
  if (!candidati.length) return null;
  return candidati.reduce((best, x) => (x.cariche > best.cariche ? x : best));
}

/**
 * «Togli la cella» (A.215): la cella inserita esce con le cariche che ha — e con i suoi PI (A.245) — e resta fra le
 * tolte. Costa 1 AzP (A.243: estrazione). null se nell'arma non ce n'è una.
 */
export function togliCella(munizione, piMax = 2) {
  if (!cellaInserita(munizione)) return null;
  const m = { ...munizione };
  const lista = [...celleDettaglio(munizione, Infinity, piMax), { cariche: m.colpi ?? 0, pi: piCellaInserita(m, piMax), rotta: piCellaInserita(m, piMax) <= 0 }];
  m.celle = scriviCelle(lista, piMax);
  m.colpi = 0;
  m.senzaCella = true;
  delete m.piCella;
  return m;
}

/**
 * «Inserisci una cella» (A.215) in un'arma senza cella: una tolta (`{ da: 'tolta', indice }`) o una piena di scorta
 * (`{ da: 'scorta', uid }`); senza scelta, la più carica. null se non si può.
 * @returns {{ munizione, consumi } | null}
 */
export function inserisciCella(info, munizione, consumi = {}, scelta = null, piMax = 2) {
  if (cellaInserita(munizione)) return null;
  const s = scelta ?? migliorCella(info, munizione, consumi, piMax);
  if (!s) return null;
  const cap = info?.capacita ?? 0;
  const tolte = celleDettaglio(munizione, cap, piMax);
  const m = { ...munizione };
  const c = { ...consumi };
  let resta = tolte;
  if (s.da === 'tolta') {
    if (!(s.indice >= 0 && s.indice < tolte.length)) return null;
    const x = tolte[s.indice];
    if (x.rotta) return null; // A.245: una cella distrutta non si inserisce
    m.colpi = x.cariche;
    if (x.pi < piMax) m.piCella = x.pi; else delete m.piCella;
    resta = tolte.filter((_, i) => i !== s.indice);
  } else {
    const scorta = (info?.scorte ?? []).find((x) => x.uid === s.uid);
    if (!scorta || disponibili(scorta, c) <= 0) return null;
    c[scorta.uid] = (c[scorta.uid] ?? 0) + 1;
    m.colpi = cap;
    delete m.piCella;
  }
  m.celle = scriviCelle(resta, piMax);
  delete m.senzaCella;
  if (!m.celle.length) delete m.celle;
  return { munizione: m, consumi: c };
}

/**
 * A.245: i PI di una cella cambiano («quale» = 'inserita' oppure l'indice fra le tolte). A 0 PI la cella è distrutta e
 * inutilizzabile: resta scritta — non si cancella in silenzio — ma esce dalle scorte utilizzabili (`rotta`), e l'evento
 * va registrato. «Normalmente non riparabile»: l'app non propone la riparazione, non la vieta al Direttore.
 * @returns {{ munizione, cella: { cariche, pi, rotta }, distrutta: boolean } | null}
 */
export function variaPiCella(munizione, quale, delta, piMax = 2) {
  const d = Math.trunc(Number(delta) || 0);
  if (!d) return null;
  const m = { ...munizione };
  if (quale === 'inserita') {
    if (!cellaInserita(munizione)) return null;
    const prima = piCellaInserita(munizione, piMax);
    const pi = Math.max(0, Math.min(piMax, prima + d));
    if (pi === prima) return null;
    if (pi < piMax) m.piCella = pi; else delete m.piCella;
    return { munizione: m, cella: { cariche: m.colpi ?? 0, pi, rotta: pi <= 0 }, distrutta: pi <= 0 && prima > 0 };
  }
  const lista = celleDettaglio(munizione, Infinity, piMax);
  const i = Number(quale);
  if (!Number.isInteger(i) || !(i >= 0 && i < lista.length)) return null;
  const prima = lista[i].pi;
  const pi = Math.max(0, Math.min(piMax, prima + d));
  if (pi === prima) return null;
  lista[i] = { ...lista[i], pi, rotta: pi <= 0 };
  m.celle = scriviCelle(lista, piMax);
  return { munizione: m, cella: lista[i], distrutta: pi <= 0 && prima > 0 };
}

/**
 * A.245: una cella della pila (le piene di scorta dell'Inventario) che si danneggia va **separata dalla pila**: esce
 * dalla quantità e si segue da sola, con le sue cariche e i suoi PI.
 * @returns {{ munizione, consumi, cella } | null}
 */
export function separaCellaDiScorta(info, munizione, consumi = {}, uid = null, danno = 1, piMax = 2) {
  const scorta = (info?.scorte ?? []).find((x) => (uid ? x.uid === uid : disponibili(x, consumi) > 0));
  if (!scorta || disponibili(scorta, consumi) <= 0) return null;
  const cap = info?.capacita ?? 0;
  const pi = Math.max(0, Math.min(piMax, piMax - Math.max(1, Math.trunc(Number(danno) || 1))));
  const c = { ...consumi, [scorta.uid]: (consumi[scorta.uid] ?? 0) + 1 };
  const lista = [...celleDettaglio(munizione, cap, piMax), { cariche: cap, pi, rotta: pi <= 0 }];
  return { munizione: { ...munizione, celle: scriviCelle(lista, piMax) }, consumi: c, cella: lista[lista.length - 1] };
}

/**
 * A.244 (Davide, 06/11/2026): le due condizioni del riempimento, da controllare tutte e due — «I caricatori devono essere
 * estratti e le munizioni devono essere realmente disponibili». Il caricatore inserito nell'arma non si riempie: prima si
 * toglie. Il motivo si dice, e non si trasferisce niente.
 * @returns {string|null} il motivo del rifiuto, null se si può riempire
 */
export function motivoRiempimento(info, munizione, consumi = {}, { quale = null } = {}) {
  const cond = regole(info?.dati ?? null)?.riempimento_caricatori?.condizioni ?? null;
  const estratto = cond?.caricatore_estratto?.motivo ?? 'il caricatore va estratto prima di riempirlo (A.244)';
  const munizioniOk = cond?.munizioni_disponibili?.motivo ?? 'non ci sono munizioni sciolte compatibili disponibili (A.244)';
  if (quale === 'inserito') return estratto;
  const sciolte = (info?.scorte ?? []).reduce((s, x) => s + disponibili(x, consumi), 0);
  if (sciolte <= 0) return munizioniOk;
  return null;
}

/**
 * Riempimento dei caricatori fuori dal combattimento (A.215): «con un'unica operazione di interfaccia» si riempiono i
 * caricatori **estratti** parziali o vuoti, con le munizioni sciolte compatibili davvero disponibili, dal più carico.
 * Un caricatore riempito torna fra i pieni di riserva.
 * Esempio di Davide (Axis): un solo caricatore da 15 con 8 colpi e 30 sciolti → 15/15, 23 sciolti, sempre un caricatore.
 * A.244 (06/11/2026): il caricatore inserito nell'arma non si riempie (va estratto); il tempo è 1 minuto ogni 50 colpi
 * trasferiti, o frazione, **sul totale dell'operazione** (`minuti`).
 * @returns {{ munizione, consumi, trasferiti: number, minuti: number } | null} null se non c'è niente da riempire
 */
export function riempiCaricatori(info, munizione, consumi = {}, dati = null) {
  if (info?.modo !== 'caricatore' || !Number.isInteger(info.capacita)) return null;
  const cap = info.capacita;
  const c = { ...consumi };
  const m = { colpi: 0, riserve: 0, ...munizione, parziali: [...(munizione?.parziali ?? [])].sort((a, b) => b - a), vuoti: munizione?.vuoti ?? 0 };
  let trasferiti = 0;
  const preleva = (quanti) => {
    let presi = 0;
    for (const s of info.scorte ?? []) {
      const n = Math.min(quanti - presi, disponibili(s, c));
      if (n > 0) { c[s.uid] = (c[s.uid] ?? 0) + n; presi += n; }
      if (presi === quanti) break;
    }
    trasferiti += presi;
    return presi;
  };
  // A.244: il caricatore inserito non si riempie — va estratto prima
  const parziali = [];
  for (const n of m.parziali) {
    const x = n + preleva(cap - n);
    if (x >= cap) m.riserve += 1; else parziali.push(x);
  }
  let vuoti = 0;
  for (let i = 0; i < m.vuoti; i++) {
    const x = preleva(cap);
    if (x >= cap) m.riserve += 1; else if (x > 0) parziali.push(x); else vuoti += 1;
  }
  if (!trasferiti) return null;
  m.parziali = parziali.sort((a, b) => b - a);
  m.vuoti = vuoti;
  if (!m.parziali.length) delete m.parziali;
  if (!m.vuoti) delete m.vuoti;
  return { munizione: m, consumi: c, trasferiti, minuti: minutiRiempimento(trasferiti, dati) };
}

// ── Caricatori che si tolgono e si rimettono (richiesta di Marcello del 03/11/2026, dal tavolo) ──
// Lo stesso modello delle celle della A.215: «un caricatore non è pieno o vuoto, ha i colpi che ha». Per ogni arma a
// caricatore (sessione → munizioni[uid]): colpi = i colpi del caricatore inserito; senzaCaricatore: true se nell'arma non
// c'è nessun caricatore; i caricatori di scorta stanno raggruppati come «identici» (A.215: «Quelli identici possono essere
// raggruppati»): riserve = quanti pieni, parziali = i colpi di ognuno dei parziali, vuoti = quanti a 0. Le munizioni
// sciolte restano la quantità della voce meno quelle già messe nei caricatori (sessione → scorte).
// Nessuna operazione crea o perde un colpo: inserito + scorta + sciolte disponibili restano lo stesso numero (totaleColpi).

/** C'è un caricatore nell'arma? (le armi salvate prima del 03/11 l'hanno sempre). */
export const caricatoreInserito = (munizione) => !munizione?.senzaCaricatore;

/** I colpi di ognuno dei caricatori di scorta, dal più carico: i pieni, i parziali, i vuoti. */
export function caricatoriDiScorta(munizione, capacita) {
  const cap = Number.isInteger(capacita) ? capacita : 0;
  const pieni = Number.isInteger(munizione?.riserve) && munizione.riserve > 0 ? munizione.riserve : 0;
  const parziali = (Array.isArray(munizione?.parziali) ? munizione.parziali : []).filter((n) => Number.isInteger(n) && n > 0).map((n) => Math.min(n, cap));
  const vuoti = Number.isInteger(munizione?.vuoti) && munizione.vuoti > 0 ? munizione.vuoti : 0;
  return [...Array(pieni).fill(cap), ...parziali, ...Array(vuoti).fill(0)].sort((a, b) => b - a);
}

/** Rimette i caricatori di scorta (elenco dei colpi) nella forma della sessione: pieni, parziali, vuoti. */
function conScorta(munizione, elenco, cap) {
  const m = { ...munizione };
  m.riserve = elenco.filter((n) => n >= cap).length;
  const parziali = elenco.filter((n) => n > 0 && n < cap).sort((a, b) => b - a);
  const vuoti = elenco.filter((n) => n <= 0).length;
  if (parziali.length) m.parziali = parziali; else delete m.parziali;
  if (vuoti) m.vuoti = vuoti; else delete m.vuoti;
  return m;
}

/** Totale dei colpi di un'arma: caricatore inserito, caricatori di scorta e munizioni sciolte compatibili disponibili. */
export function totaleColpi(info, munizione, consumi = {}) {
  const cap = info?.capacita ?? 0;
  const inserito = caricatoreInserito(munizione) ? (munizione?.colpi ?? 0) : 0;
  return inserito + caricatoriDiScorta(munizione, cap).reduce((s, n) => s + n, 0) + (info?.scorte ?? []).reduce((s, x) => s + disponibili(x, consumi), 0);
}

/**
 * «Togli il caricatore» (A.249, Davide 06/11/2026): costa 1 AzP e il caricatore esce **con i colpi che ha**, fra quelli
 * di scorta. null se nell'arma non ce n'è uno.
 */
export function togliCaricatore(info, munizione) {
  if (info?.modo !== 'caricatore' || !caricatoreInserito(munizione)) return null;
  const cap = info.capacita;
  const m = conScorta(munizione, [...caricatoriDiScorta(munizione, cap), Math.min(munizione?.colpi ?? 0, cap)], cap);
  m.colpi = 0;
  m.senzaCaricatore = true;
  return m;
}

/** Toglie dalla scorta il caricatore con `colpi` colpi (senza scelta il più carico): [colpi, scorta rimasta] o null. */
function prendiDallaScorta(munizione, cap, colpi) {
  const scorta = caricatoriDiScorta(munizione, cap);
  // A.250: senza una scelta entra il più carico fra quelli PRONTI (almeno un colpo); un vuoto non è pronto
  const i = colpi === null || colpi === undefined ? scorta.findIndex((n) => eProntoColpi(n)) : scorta.indexOf(Math.min(colpi, cap));
  if (i < 0 || !scorta.length) return null;
  const [entra] = scorta.splice(i, 1);
  return [entra, scorta];
}

/**
 * «Inserisci» in un'arma senza caricatore: quello di scorta con `colpi` colpi (i caricatori uguali sono raggruppati, basta
 * il numero), senza scelta il più carico. null se non c'è.
 */
export function inserisciCaricatore(info, munizione, colpi = null) {
  if (info?.modo !== 'caricatore' || caricatoreInserito(munizione)) return null;
  const p = prendiDallaScorta(munizione, info.capacita, colpi);
  if (!p) return null;
  const m = conScorta(munizione, p[1], info.capacita);
  m.colpi = p[0];
  delete m.senzaCaricatore;
  return m;
}

/**
 * Cambio di caricatore (1 AzP, Armamenti 0.74 §7.20.2: «Sostituire un caricatore amovibile o una cella già pronti costa
 * 1 AzP»): entra quello di scorta scelto (anche parziale), senza scelta il più carico; quello tolto resta con i suoi colpi.
 * A.250 (06/11/2026): un parziale con almeno un colpo è pronto come un pieno — stesso costo e stesso beneficio di Ricarica
 * Rapida o Esperta. A.249: la sostituzione diretta resta UNA operazione da 1 AzP complessivo, non estrazione + inserimento.
 */
export function cambiaCaricatore(info, munizione, colpi = null) {
  if (info?.modo !== 'caricatore') return null;
  if (!caricatoreInserito(munizione)) return inserisciCaricatore(info, munizione, colpi);
  const cap = info.capacita;
  const p = prendiDallaScorta(munizione, cap, colpi);
  if (!p) return null;
  const m = conScorta(munizione, [...p[1], Math.min(munizione?.colpi ?? 0, cap)], cap);
  m.colpi = p[0];
  return m;
}

/**
 * Riempire UN caricatore, anche in parte, con le munizioni sciolte compatibili, fuori dal combattimento (A.215; il tempo il
 * manuale non lo dice, A.244): `quale` = 'inserito' oppure i colpi del caricatore di scorta da riempire; `quanti` = quanti
 * proiettili metterci (senza, fino a riempirlo). Esempio: 7 proiettili nel caricatore da 30 a 15 → 22/30.
 * @returns {{ munizione, consumi, trasferiti, prima, dopo } | null}
 */
export function riempiCaricatore(info, munizione, consumi = {}, { quale = 'inserito', quanti = null } = {}, dati = null) {
  if (info?.modo !== 'caricatore' || !Number.isInteger(info.capacita)) return null;
  const cap = info.capacita;
  const sciolte = (info.scorte ?? []).reduce((s, x) => s + disponibili(x, consumi), 0);
  let m = { colpi: 0, riserve: 0, ...munizione };
  let prima;
  let scorta = null;
  let i = -1;
  // A.244: si riempiono solo i caricatori estratti, e solo con munizioni davvero disponibili
  if (quale === 'inserito') return null;
  if (sciolte <= 0) return null;
  {
    scorta = caricatoriDiScorta(m, cap);
    i = scorta.indexOf(Math.min(Number(quale), cap));
    if (i < 0) return null;
    prima = scorta[i];
  }
  const voluti = quanti === null || quanti === undefined ? cap - prima : Math.max(0, Math.floor(Number(quanti) || 0));
  const n = Math.min(voluti, cap - prima, sciolte);
  if (n <= 0) return null;
  const c = { ...consumi };
  let resta = n;
  for (const s of info.scorte ?? []) {
    const x = Math.min(resta, disponibili(s, c));
    if (x > 0) { c[s.uid] = (c[s.uid] ?? 0) + x; resta -= x; }
    if (!resta) break;
  }
  const dopo = prima + n;
  if (quale === 'inserito') m.colpi = dopo;
  else { scorta[i] = dopo; m = conScorta(m, scorta, cap); }
  return { munizione: m, consumi: c, trasferiti: n, prima, dopo };
}

/**
 * Munizioni inserite da una operazione di ricarica a inserimento (A.135): 2, oppure quelle di Ricarica Migliorata (4)
 * se il personaggio la possiede. null per gli altri modi.
 */
export function perOperazione(info, idTalenti, dati) {
  if (!info?.singolo) return null;
  const ins = regole(dati)?.inserimento_singolo ?? {};
  const mig = ins.migliorata;
  // Ricarica Migliorata (regime vecchio) o Ricarica Esperta (Talenti v1.0): A.182 risolta il 25/10/2026: vale la decisione 139
  return mig && (mig.talenti ?? []).some((id) => (idTalenti ?? []).includes(id)) ? mig.per_operazione : ins.per_operazione ?? 1;
}

/**
 * Lanciagranate (§7.20.3): con una granata già scelta (munizione.tipo) si ricarica solo da quel tipo; senza,
 * dal primo tipo disponibile (la munizione di riferimento per prima).
 */
export function perTipo(info, munizione, consumi = {}) {
  if (!info?.granate) return info;
  const tipo = munizione?.tipo;
  if (tipo && info.scorte.some((x) => x.uid === tipo)) return { ...info, scorte: info.scorte.filter((x) => x.uid === tipo) };
  // ancora carico con la munizione di riferimento (la carica di partenza): si aggiunge solo quella
  const pronte = info.scorte.filter((x) => disponibili(x, consumi) > 0 && (!(munizione?.colpi > 0) || x.riferimento));
  return { ...info, scorte: pronte.slice(0, 1) };
}

/**
 * Esegue la ricarica sui valori di sessione di un'arma.
 * @param info voce di infoRicarica(); con `perOperazione` (inserimento singolo) il limite di munizioni
 * @returns {{ munizione: {colpi, riserve, parziali, vuoti}, consumi: {uid: n}, inserite?: number } | null} null se non si può
 */
export function eseguiRicarica(info0, munizione, consumi = {}, scelta = null) {
  const info = perTipo(info0, munizione, consumi);
  const m = { colpi: 0, riserve: 0, parziali: [], vuoti: 0, ...munizione, parziali: [...(munizione?.parziali ?? [])] };
  // con un caricatore scelto dal giocatore (anche meno carico di quello inserito) decide la sua scelta
  const stato = scelta !== null && info?.modo === 'caricatore' ? { possibile: true } : statoRicarica(info, m, consumi);
  if (!stato.possibile) return null;
  const c = { ...consumi };
  if (!info || info.modo === null) return { munizione: { ...m, colpi: info?.capacita ?? m.colpi }, consumi: c };
  if (info.modo === 'caricatore') {
    // il caricatore tolto resta con i suoi colpi (pieno, parziale o vuoto); entra quello scelto (03/11: anche un
    // parziale), senza scelta il più carico
    const r = cambiaCaricatore(info, munizione, scelta);
    return r ? { munizione: r, consumi: c } : null;
  }
  if (info.modo === 'cella') {
    // A.215: il cambio toglie la cella inserita (resta fra le tolte con le cariche che ha, anche vuota: non si consuma) e
    // mette la più carica fra le tolte e le piene di scorta
    const scelta = migliorCella(info, munizione, consumi);
    const tolta = cellaInserita(munizione) ? togliCella({ ...munizione, colpi: m.colpi }) : { ...munizione };
    const r = inserisciCella(info, tolta, consumi, scelta?.da === 'tolta' ? { ...scelta } : scelta);
    if (!r) return null;
    const pulita = { ...r.munizione };
    for (const k of ['parziali', 'vuoti']) if (!pulita[k] || (Array.isArray(pulita[k]) && !pulita[k].length)) delete pulita[k];
    return { munizione: pulita, consumi: r.consumi };
  }
  // inserimento: munizioni sciolte fino alla capacità, dalla prima scorta disponibile; le armi caricate direttamente si
  // fermano a 2 munizioni per operazione (4 con Ricarica Migliorata, A.135)
  let manca = Math.min(info.capacita - m.colpi, info.singolo ? info.perOperazione ?? 1 : Infinity);
  for (const s of info.scorte) {
    const n = Math.min(manca, disponibili(s, c));
    if (!n) continue;
    c[s.uid] = (c[s.uid] ?? 0) + n;
    m.colpi += n;
    manca -= n;
    // §7.20.3: un lanciagranate tiene un tipo di granata alla volta (quello inserito)
    if (info.granate) { m.tipo = s.uid; break; }
    if (!manca) break;
  }
  return { munizione: m, consumi: c, inserite: m.colpi - (munizione?.colpi ?? 0) };
}

// ── Carichini (A.135, decisione 139) ──

/** Colpi di ogni carichino di una voce (sessione → carichini[uid]), lunghi quanto la quantità; i nuovi sono vuoti. */
export function carichiniDi(carichini, uid, quantita, colpi = 6) {
  const src = Array.isArray(carichini?.[uid]) ? carichini[uid] : [];
  return Array.from({ length: Math.max(0, quantita) }, (_, i) => Math.max(0, Math.min(colpi, Number.isInteger(src[i]) ? src[i] : 0)));
}

/** Carichini della sessione allineati alle voci della lista: { uid: quantità } (le voci tolte spariscono; tutti vuoti non si scrivono). */
export function allineaCarichini(carichini, quantita, colpi = 6) {
  const out = {};
  for (const [uid, q] of Object.entries(quantita ?? {})) {
    const c = carichiniDi(carichini, uid, q, colpi);
    if (c.some((n) => n > 0)) out[uid] = c;
  }
  return out;
}

/**
 * Usa un carichino preparato (A.135): trasferisce fino a 6 colpi in 1 AzP, entro gli spazi liberi dell'arma; i colpi non
 * trasferiti restano nel carichino. Si usa il carichino più pieno fra quelli dell'arma. Le munizioni sono già state
 * contate quando il carichino è stato preparato. null se non si può (arma piena, nessun carichino pieno).
 * @returns {{ munizione, carichini, trasferiti, voce }}
 */
export function usaCarichino(info, munizione, carichini = {}) {
  if (!info?.carichini?.length || info.capacita === null) return null;
  const m = { colpi: 0, riserve: 0, ...munizione };
  const spazi = info.capacita - m.colpi;
  if (spazi <= 0) return null;
  let migliore = null;
  for (const c of info.carichini) {
    const stato = carichiniDi(carichini, c.uid, c.quantita, info.colpiCarichino);
    stato.forEach((n, i) => { if (n > 0 && (!migliore || n > migliore.n)) migliore = { uid: c.uid, i, n, stato }; });
  }
  if (!migliore) return null;
  const trasferiti = Math.min(spazi, migliore.n, info.colpiCarichino);
  const stato = [...migliore.stato];
  stato[migliore.i] -= trasferiti;
  return { munizione: { ...m, colpi: m.colpi + trasferiti }, carichini: { ...carichini, [migliore.uid]: stato }, trasferiti, voce: migliore.uid };
}

/**
 * Prepara un carichino (A.135: fuori dal combattimento, 1 minuto ogni 50 colpi o frazione): riempie il primo carichino
 * non pieno della voce `uid` (o di tutte) con le munizioni sciolte compatibili dell'arma, contandole come consumate.
 * null se non c'è un carichino da riempire o mancano munizioni.
 * @returns {{ carichini, consumi, inseriti, voce }}
 */
export function riempiCarichino(info, carichini = {}, consumi = {}, uid = null) {
  if (!info?.carichini?.length) return null;
  const voci = info.carichini.filter((c) => !uid || c.uid === uid);
  for (const c of voci) {
    const stato = carichiniDi(carichini, c.uid, c.quantita, info.colpiCarichino);
    const i = stato.findIndex((n) => n < info.colpiCarichino);
    if (i < 0) continue;
    const cons = { ...consumi };
    let manca = info.colpiCarichino - stato[i];
    for (const s of info.scorte ?? []) {
      const n = Math.min(manca, disponibili(s, cons));
      if (!n) continue;
      cons[s.uid] = (cons[s.uid] ?? 0) + n;
      manca -= n;
      if (!manca) break;
    }
    const inseriti = info.colpiCarichino - stato[i] - manca;
    if (!inseriti) return null;
    const nuovo = [...stato];
    nuovo[i] += inseriti;
    return { carichini: { ...carichini, [c.uid]: nuovo }, consumi: cons, inseriti, voce: c.uid };
  }
  return null;
}
