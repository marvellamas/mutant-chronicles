// Ricarica delle armi a distanza nella modalità tavolo (Giocatore §5.1.1; Armamenti §7.20.2).
// Funzioni pure. Regole e compatibilità dai dati: munizioni.json → ricarica, munizioni_armi
// (famiglia di munizioni di ogni arma, §7.20.9) e «compatibile_con» delle munizioni speciali.
//
// Modi:
// - caricatore: si sostituisce un caricatore pieno di riserva (sessione → munizioni[uid].riserve)
//   oppure, se non ce ne sono, il parziale più carico; quello tolto resta come parziale o vuoto;
// - inserimento: una operazione inserisce 1 munizione sciolta compatibile, 3 con Ricarica Migliorata
//   (doppiette, fucili a pompa, archi e balestre: E&L 19, A.37; Giocatore §8.6.4);
// - tamburo: una operazione riempie il tamburo con munizioni pronte (revolver: E&L 19);
// - (anche «inserimento» senza elenco: razzi, dardi chimici, combustibile compatibili fino alla capacità);
// - cella: una cella piena compatibile sostituisce quella esaurita;
// - null: nessun dato di compatibilità, la ricarica resta libera (con un avviso).
// Le munizioni sciolte consumate si contano nella sessione (sessione → scorte: { uid voce: consumate }):
// la quantità della voce resta la scelta del giocatore.
import { catalogo, risolvi, tabellaMunizioniArmi } from './equipaggiamento.js';

const regole = (dati) => dati?.equipaggiamento?.file?.munizioni?.ricarica ?? null;
const eVuoto = (o) => /vuot/i.test(o.id);
// una scorta è una munizione, oppure un NEC che fa da cella di un'arma (A.67: il Modulo Blu del Gehemmapuker)
const eScorta = (o) => o?.tipo === 'munizioni' || !!o?.cella;

/**
 * Modo di ricarica di un'arma del catalogo.
 * @returns {{ modo: 'caricatore'|'inserimento'|'cella'|null, famiglia: string|null, vuoto: {rif, nome}|null }}
 */
export function modoRicarica(def, dati, cat = catalogo(dati)) {
  if (!def || def.tipo !== 'arma_distanza') return { modo: null, famiglia: null, vuoto: null };
  const r = regole(dati) ?? {};
  const famiglia = tabellaMunizioniArmi(dati).get(def.rif) ?? null;
  const ins = r.inserimento_singolo ?? {};
  const tamburo = r.tamburo ?? {};
  const compatibili = cat.oggetti.filter((o) => eScorta(o) && !eVuoto(o) && o.compatibile_con?.includes(def.rif));
  const amovibile = (ins.caricatore_amovibile ?? []).includes(def.rif);
  if ((tamburo.armi ?? []).includes(def.rif) || (tamburo.famiglie ?? []).includes(def.famiglia)) return { modo: 'tamburo', famiglia, vuoto: null };
  if (!amovibile && ((ins.armi ?? []).includes(def.rif) || (ins.famiglie ?? []).includes(def.famiglia))) return { modo: 'inserimento', famiglia, vuoto: null, singolo: true };
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
  for (const a of risolte.filter((x) => x.tipo === 'arma_distanza' && x.def)) {
    const info = modoRicarica(a.def, dati, cat);
    const compatibile = (m) => (info.famiglia && m.def.munizione?.famiglia === info.famiglia) || m.def.compatibile_con?.includes(a.def.rif);
    const scorte = munizioni.filter(compatibile)
      .filter((m) => info.modo !== 'cella' || (r.famiglie_celle ?? []).includes(m.def.famiglia) || (m.def.cella && m.def.tipo !== 'munizioni'))
      // prima le munizioni ordinarie, poi le speciali (l'ordine d'inserimento lo sceglie il giocatore al tavolo)
      .sort((x, y) => Number(x.def.famiglia !== 'Munizioni ordinarie') - Number(y.def.famiglia !== 'Munizioni ordinarie'))
      .map((m) => ({ uid: m.uid, nome: m.nome, quantita: m.voce.quantita }));
    out[a.uid] = { ...info, capacita: a.def.munizioni?.capacita ?? null, scorte };
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
export function statoRicarica(info, munizione, consumi = {}) {
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
 * Munizioni inserite da una operazione di ricarica a inserimento singolo (E&L 19; Giocatore §8.6.4):
 * 1, oppure quelle di Ricarica Migliorata se il personaggio la possiede. null per gli altri modi.
 */
export function perOperazione(info, idTalenti, dati) {
  if (!info?.singolo) return null;
  const ins = regole(dati)?.inserimento_singolo ?? {};
  const mig = ins.migliorata;
  return mig && (idTalenti ?? []).includes(mig.talento) ? mig.per_operazione : ins.per_operazione ?? 1;
}

/**
 * Esegue la ricarica sui valori di sessione di un'arma.
 * @param info voce di infoRicarica(); con `perOperazione` (inserimento singolo) il limite di munizioni
 * @returns {{ munizione: {colpi, riserve, parziali, vuoti}, consumi: {uid: n}, inserite?: number } | null} null se non si può
 */
export function eseguiRicarica(info, munizione, consumi = {}) {
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
  // inserimento (e tamburo): munizioni sciolte fino alla capacità, dalla prima scorta disponibile;
  // l'inserimento singolo si ferma a 1 munizione per operazione (3 con Ricarica Migliorata)
  let manca = Math.min(info.capacita - m.colpi, info.singolo ? info.perOperazione ?? 1 : Infinity);
  for (const s of info.scorte) {
    const n = Math.min(manca, disponibili(s, c));
    if (!n) continue;
    c[s.uid] = (c[s.uid] ?? 0) + n;
    m.colpi += n;
    manca -= n;
    if (!manca) break;
  }
  return { munizione: m, consumi: c, inserite: m.colpi - (munizione?.colpi ?? 0) };
}
