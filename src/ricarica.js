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

const regole = (dati) => dati?.equipaggiamento?.file?.munizioni?.ricarica ?? null;
const eVuoto = (o) => /vuot/i.test(o.id);
// una scorta è una munizione, oppure un NEC che fa da cella di un'arma (A.67: il Modulo Blu del Gehemmapuker)
const eScorta = (o) => o?.tipo === 'munizioni' || !!o?.cella || eGranata(o);

/**
 * Modo di ricarica di un'arma del catalogo.
 * @returns {{ modo: 'caricatore'|'inserimento'|'cella'|null, famiglia: string|null, vuoto: {rif, nome}|null }}
 */
export function modoRicarica(def, dati, cat = catalogo(dati)) {
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
    out[uid] = { ...info, capacita: def.munizioni?.capacita ?? null, scorte, ...(tipoC ? { carichini, colpiCarichino: r.carichini.colpi ?? 6 } : {}), ...(scorte.some((x) => x.granata) || (rifRiferimento && eGranata(cat.perRif.get(rifRiferimento))) ? { granate: true, rifRiferimento } : {}) };
  };
  // le granate da lancio non hanno caricatore: si lanciano dalla quantità della voce (src/sessione.js → consumaColpi)
  for (const a of risolte.filter((x) => x.tipo === 'arma_distanza' && x.def && !eGranata(x.def))) perArma(a.uid, a.def);
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
  if (colpi >= info.capacita) return { possibile: false, motivo: 'caricatore già pieno', avviso: null };
  if (info.modo === null) return { possibile: true, motivo: null, avviso: 'Compatibilità delle munizioni non nei dati: la ricarica non scala le riserve.' };
  if (info.modo === 'caricatore') {
    return (munizione?.riserve ?? 0) > 0 || (munizione?.parziali ?? []).some((n) => n > colpi)
      ? { possibile: true, motivo: null, avviso: null }
      : { possibile: false, motivo: 'nessun caricatore compatibile', avviso: null };
  }
  const tot = info.scorte.reduce((s, x) => s + disponibili(x, consumi), 0);
  if (!tot) return { possibile: false, motivo: info.modo === 'cella' ? 'nessuna cella compatibile' : 'nessuna munizione compatibile', avviso: null };
  return { possibile: true, motivo: null, avviso: null };
}

/**
 * Munizioni inserite da una operazione di ricarica a inserimento (A.135): 2, oppure quelle di Ricarica Migliorata (4)
 * se il personaggio la possiede. null per gli altri modi.
 */
export function perOperazione(info, idTalenti, dati) {
  if (!info?.singolo) return null;
  const ins = regole(dati)?.inserimento_singolo ?? {};
  const mig = ins.migliorata;
  return mig && (idTalenti ?? []).includes(mig.talento) ? mig.per_operazione : ins.per_operazione ?? 1;
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
export function eseguiRicarica(info0, munizione, consumi = {}) {
  const info = perTipo(info0, munizione, consumi);
  const m = { colpi: 0, riserve: 0, parziali: [], vuoti: 0, ...munizione, parziali: [...(munizione?.parziali ?? [])] };
  const stato = statoRicarica(info, m, consumi);
  if (!stato.possibile) return null;
  const c = { ...consumi };
  if (!info || info.modo === null) return { munizione: { ...m, colpi: info?.capacita ?? m.colpi }, consumi: c };
  if (info.modo === 'caricatore') {
    // il caricatore tolto resta: vuoto se era a 0 colpi, altrimenti parziale con i colpi rimasti
    const tolto = m.colpi;
    if (m.riserve > 0) { m.riserve -= 1; m.colpi = info.capacita; }
    else {
      const i = m.parziali.indexOf(Math.max(...m.parziali));
      m.colpi = m.parziali.splice(i, 1)[0];
    }
    if (tolto > 0) m.parziali.push(tolto); else m.vuoti += 1;
    m.parziali.sort((a, b) => b - a);
    return { munizione: m, consumi: c };
  }
  if (info.modo === 'cella') {
    const s = info.scorte.find((x) => disponibili(x, c) > 0);
    c[s.uid] = (c[s.uid] ?? 0) + 1;
    return { munizione: { ...m, colpi: info.capacita }, consumi: c };
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
