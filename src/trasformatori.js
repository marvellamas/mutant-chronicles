// Trasformatori di ricarica (Equipaggiamento 0.22 §5.4.6–§5.4.7, Armamenti 0.68 §7.20.5; registro «Revisione NEC» 2.7).
// Funzioni pure. Il trasformatore personale è alimentato da una CEC dello stesso colore: preleva una carica CEC (10 UE) e
// conserva 100 cariche NEC nel tampone; il prelievo è consentito soltanto se nel tampone entra l'intera carica sorgente
// (cioè a tampone vuoto); trasferisce le cariche mancanti e conserva il resto, anche dopo lo scollegamento; non produce
// energia e non cambia colore. Il portatile ripristina una carica all'ora, la stazione industriale una ogni dieci minuti
// (velocità complessiva). Un caricatore generico, i PM personali e la sola vicinanza a una Matrice non bastano (A.67,
// decisione 76: senza un trasformatore o una stazione non si travasa fra NEC).
//
// Al tavolo (sessione → trasformatori): { [uid]: { colore: 'Rosso'|'Blu'|'Verde'|null, tamponi: { Rosso, Blu, Verde } } }.
// Il monocromatico ha un colore fissato alla costruzione (si fissa al primo uso) e un solo tampone; il multicromatico ha
// tre tamponi distinti, uno per colore, e lavora un colore alla volta.
import { catalogo, risolvi, riserveNec } from './equipaggiamento.js';

const COLORI = ['Rosso', 'Blu', 'Verde'];
const FORMATI_PERSONALI = /^(nec\d+|pacco\d+)$/;

/** I trasformatori dell'Inventario (voci con `trasformatore`, nec.json): [{ uid, nome, colori, tampone, minuti, impianto }]. */
export function elencoTrasformatori(voci, dati) {
  const cat = catalogo(dati);
  const out = [];
  for (const v of voci ?? []) {
    const r = risolvi(v, cat);
    if (r.fuoriCatalogo || !r.def?.trasformatore) continue;
    const t = r.def.trasformatore;
    out.push({ uid: r.uid, nome: r.nome, colori: t.colori, tampone: t.tampone, minuti: t.minuti_per_carica, impianto: t.impianto, deposito: !!r.deposito });
  }
  return out;
}

/** Lo stato di un trasformatore dalla sessione, completo: colore e un tampone per colore. */
export function statoTrasformatore(sessioneTrasformatori, uid) {
  const x = sessioneTrasformatori?.[uid] ?? {};
  return { colore: COLORI.includes(x.colore) ? x.colore : null, tamponi: Object.fromEntries(COLORI.map((c) => [c, Number.isInteger(x.tamponi?.[c]) && x.tamponi[c] >= 0 ? x.tamponi[c] : 0])) };
}

/** «8 ore», «1 ora e 20 minuti», «40 minuti». */
export function testoDurata(minuti) {
  const h = Math.floor(minuti / 60);
  const m = minuti % 60;
  const ore = h ? `${h} ${h === 1 ? 'ora' : 'ore'}` : '';
  const min = m ? `${m} ${m === 1 ? 'minuto' : 'minuti'}` : '';
  return [ore, min].filter(Boolean).join(' e ') || '0 minuti';
}

/**
 * Che cosa si può ricaricare con un trasformatore (§5.4.6, §5.4.7: «ricaricano NEC personali e non sostituiscono
 * stazioni per CEC, MEC o BEC»): i NEC e i pacchi dell'Inventario con le cariche mancanti, e la cella dell'arma a energia
 * (le cariche o i colpi che mancano al suo caricatore).
 * @param attuali { nec: { chiave → cariche attuali }, munizioni: { uid → { colpi } } } della sessione
 * @param ricarica massimi.ricarica: { uid arma → { modo, capacita, scorte } }
 * @returns {{ id, tipo: 'nec'|'cella', nome, colori: string[], mancanti: number, chiave?: string, uid?: string, unita: string }[]}
 */
export function bersagliRicaricabili(voci, attuali, ricarica, dati) {
  const cat = catalogo(dati);
  const out = [];
  for (const x of riserveNec(voci, dati)) {
    if (!FORMATI_PERSONALI.test(x.formato ?? '')) continue;
    const n = attuali?.nec?.[x.chiave];
    if (!Number.isInteger(n)) continue; // «da convertire»: nessun numero
    if (n >= x.massimo) continue;
    out.push({ id: x.chiave, tipo: 'nec', nome: x.nome, colori: [x.colore], mancanti: x.massimo - n, chiave: x.chiave, uid: x.uid, unita: 'cariche' });
  }
  const risolte = new Map((voci ?? []).map((v) => { const r = risolvi(v, cat); return [r.uid, r]; }));
  for (const [uid, info] of Object.entries(ricarica ?? {})) {
    if (info?.modo !== 'cella' || !Number.isInteger(info.capacita)) continue;
    const colpi = attuali?.munizioni?.[uid]?.colpi ?? 0;
    if (colpi >= info.capacita) continue;
    const arma = risolte.get(uid);
    const cella = (info.scorte ?? []).map((s) => risolte.get(s.uid)?.def).find((d) => d?.accumulatore);
    const colori = (cella?.accumulatore?.colori ?? []).filter((c) => COLORI.includes(c));
    out.push({ id: `cella:${uid}`, tipo: 'cella', nome: `Cella di ${arma?.nome ?? 'un’arma'}`, colori: colori.length ? colori : COLORI, mancanti: info.capacita - colpi, uid, unita: cella?.cella?.unita ?? 'colpi' });
  }
  return out;
}

/** Le CEC dell'Inventario del colore, con le cariche che hanno ora: [{ chiave, nome, cariche }]. */
export function fontiCec(voci, nec, colore, dati) {
  return riserveNec(voci, dati)
    .filter((x) => x.formato === 'cec' && x.colore === colore && Number.isInteger(nec?.[x.chiave]) && nec[x.chiave] > 0)
    .map((x) => ({ chiave: x.chiave, nome: x.nome, cariche: nec[x.chiave] }));
}

/**
 * Il piano di una ricarica: quanto si trasferisce, quanto resta nel tampone, quanto tempo ci vuole (§5.4.6).
 * @param t { colori, tampone, minuti, impianto } del trasformatore
 * @param stato statoTrasformatore() della sessione
 * @param bersaglio { mancanti, colori }
 * @param colore il colore scelto
 * @param fonte { chiave, nome, cariche } la CEC da cui prelevare (o null)
 * @returns {{ ok: boolean, errore?: string, preleva?: boolean, fonte?: object, trasferite?: number, tamponeInizio?: number,
 *   tamponeDopo?: number, mancantiDopo?: number, minuti?: number, durata?: string, avvisi: string[] }}
 */
export function pianoRicarica({ t, stato, bersaglio, colore, fonte }, dati) {
  const avvisi = [];
  const T = dati?.regole?.nec?.trasformatori ?? {};
  if (!COLORI.includes(colore)) return { ok: false, errore: 'scegli il colore da ricaricare', avvisi };
  if (!bersaglio) return { ok: false, errore: 'scegli che cosa ricaricare', avvisi };
  if (!bersaglio.colori.includes(colore)) return { ok: false, errore: `${bersaglio.nome} è ${bersaglio.colori.join(' o ')}: il colore ${colore} non è compatibile`, avvisi };
  if (t.colori === 1 && stato.colore && stato.colore !== colore) return { ok: false, errore: `il monocromatico ha il colore fissato alla costruzione: ${stato.colore}`, avvisi };
  const tampone = stato.tamponi[colore] ?? 0;
  const mancanti = bersaglio.mancanti;
  if (!(mancanti > 0)) return { ok: false, errore: 'è già carica', avvisi };
  let tamponeInizio = tampone;
  let preleva = false;
  if (tampone < mancanti) {
    // §5.4.6: il prelievo è consentito soltanto se nel tampone entra l'intera carica sorgente
    if (tampone === 0) {
      if (!fonte || !(fonte.cariche >= 1)) return { ok: false, errore: `il tampone è vuoto e non c'è una carica CEC ${colore} da cui prelevare (${T.regola ?? 'il prelievo richiede una CEC dello stesso colore'})`, avvisi };
      preleva = true;
      tamponeInizio = t.tampone;
    } else {
      avvisi.push(`Nel tampone ci sono ${tampone} cariche e ne servono ${mancanti}: il prelievo è consentito soltanto a tampone vuoto (la carica CEC ne porta ${t.tampone}), quindi si trasferiscono ${tampone} cariche e il resto resta da ricaricare.`);
    }
  }
  const trasferite = Math.min(mancanti, tamponeInizio);
  if (trasferite <= 0) return { ok: false, errore: 'nulla da trasferire', avvisi };
  const minuti = trasferite * t.minuti;
  return {
    ok: true, preleva, fonte: preleva ? fonte : null, trasferite, tamponeInizio, tamponeDopo: tamponeInizio - trasferite,
    mancantiDopo: mancanti - trasferite, minuti, durata: testoDurata(minuti), avvisi,
  };
}
