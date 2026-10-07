// Barra dell'Iniziativa in cima alla mappa (lotto 6 di docs/battlemap/piano.md; §11 della specifica): una scala graduata
// con i mini-token (ritratto o iniziali, colore del lato) messi sul loro valore d'Iniziativa, chi è di turno in evidenza
// e il Round. A parità di valore i mini-token si impilano nell'ordine della plancia (src/scontro.js → ordineIniziativa:
// DES, INT, scelta degli alleati, spareggio). I token nascosti li vede solo il master; la vista giocatori riceve la
// barra già filtrata dal server (src/mappa/vista.js). Funzioni pure.
import { ordineIniziativa, diTurno } from '../scontro.js';
import { chiaveRif, iniziali } from './token.js';

/**
 * Barra dello scontro aperto, per il master.
 * @param scontro lo scontro (null o non aperto: nessuna barra)
 * @param pezzi pezzi della scena (src/mappa/partecipanti.js): ritratto, lato, iniziali, PV
 * @param scena la scena: token e loro «nascosto»
 * @returns null oppure { round, diTurno: id | null, minimo, massimo, pile, voci: [{ id, chiave, nome, iniziali, lato,
 *   ritratto, pv, valore, ordine, pila, diTurno, token, nascosto }] }
 */
export function barraIniziativa({ scontro, pezzi = [], scena = null, bordoDi = () => null }) {
  if (!scontro || scontro.stato !== 'aperto') return null;
  const { ordinati } = ordineIniziativa(scontro);
  const turno = diTurno(scontro)?.id ?? null;
  const perChiave = new Map(pezzi.map((p) => [p.chiave, p]));
  const tokenDi = new Map((scena?.token ?? []).map((t) => [chiaveRif(t.rif), t]));
  const voci = ordinati.map((p, ordine) => {
    const chiave = chiaveRif({ tipo: 'partecipante', id: p.id });
    const pz = perChiave.get(chiave) ?? null;
    const t = tokenDi.get(chiave) ?? null;
    return {
      id: p.id, chiave, nome: pz?.nome ?? p.nome, iniziali: pz?.iniziali ?? iniziali(p.nome), lato: pz?.lato ?? p.lato ?? null,
      ritratto: pz?.ritratto ?? null, pv: pz?.pv ?? null, valore: p.base + p.d10.valore, ordine, bordo: pz ? bordoDi(pz) : null,
      pila: 0, diTurno: p.id === turno, token: t?.id ?? null, nascosto: !!t?.nascosto,
    };
  });
  return conPile({ round: scontro.round, diTurno: turno, voci });
}

/** Pile dei pari merito (nell'ordine delle voci), minimo, massimo e altezza della pila più alta. */
function conPile(barra) {
  const conta = new Map();
  const voci = barra.voci.map((v) => { const pila = conta.get(v.valore) ?? 0; conta.set(v.valore, pila + 1); return { ...v, pila }; });
  const valori = voci.map((v) => v.valore);
  return {
    ...barra, voci,
    minimo: valori.length ? Math.min(...valori) : 0,
    massimo: valori.length ? Math.max(...valori) : 0,
    pile: Math.max(1, ...conta.values()),
  };
}

/**
 * La barra per i giocatori: restano i partecipanti il cui token si vede (`visibili`: chiavi dei token rimasti nella
 * vista filtrata) e i PG, anche sotto la nebbia o senza token in mappa; via i token nascosti dal master e gli altri
 * sotto la nebbia. Niente PV, niente id dei token; il ritratto è l'indirizzo per i giocatori (`immagineDi(chiave)`).
 * Chi è di turno resta solo se è nella barra.
 */
export function barraPerGiocatori(barra, visibili, immagineDi = () => null, pvDi = () => null) {
  if (!barra) return null;
  const voci = barra.voci
    .filter((v) => visibili.has(v.chiave) || (v.id.startsWith('pg:') && !v.nascosto))
    .map((v) => {
      // 07/10: la quota dei PV (da 0 a 1) solo dove la vista giocatori la mostra (PG sempre, nemici a scelta del master)
      const q = pvDi(v.chiave);
      return { chiave: v.chiave, nome: v.nome, iniziali: v.iniziali, lato: v.lato, ritratto: immagineDi(v.chiave), valore: v.valore, ordine: v.ordine, diTurno: v.diTurno, bordo: v.bordo ?? null, pv: q === null || q === undefined ? null : { attuali: q, massimo: 1 } };
    });
  const turno = voci.some((v) => v.diTurno) ? barra.diTurno : null;
  return conPile({ round: barra.round, diTurno: turno, voci });
}

/**
 * Posizione di un valore sulla scala, da 0 (a sinistra: il valore più alto, primo a muovere) a 1 (il più basso).
 * Con un solo valore, al centro.
 */
export const posizioneSullaScala = (barra, valore) => (barra.massimo === barra.minimo ? 0.5 : (barra.massimo - valore) / (barra.massimo - barra.minimo));

/**
 * Quanta linea è colorata (ritocchi del 06/10): dal punteggio più alto fino a chi è di turno, da 0 a 1; al primo turno
 * del Round del più alto 0 (si riparte). Senza nessuno di turno nella barra (vista giocatori con chi è di turno
 * nascosto) 0. Con un solo punteggio non c'è linea da colorare: 0.
 */
export function avanzamentoTurno(barra) {
  const turno = barra.voci.find((v) => v.diTurno);
  return turno && barra.massimo !== barra.minimo ? posizioneSullaScala(barra, turno.valore) : 0;
}

/** Tacche della scala: ogni valore fino a 30 punti di ampiezza, poi ogni 5 (sempre gli estremi). */
export function tacche(barra) {
  const passo = barra.massimo - barra.minimo > 30 ? 5 : 1;
  const r = [];
  for (let v = barra.massimo; v >= barra.minimo; v--) if (v === barra.massimo || v === barra.minimo || v % passo === 0) r.push(v);
  return r;
}
