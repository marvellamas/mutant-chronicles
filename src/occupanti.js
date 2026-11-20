// A.296 (Davide, 19/11/2026): gli occupanti di una cavalcatura — funzioni pure, fuori dalla mappa e dalla plancia.
//
//  - la capienza la dice la scheda della creatura (`posti`), mai la taglia: senza `posti` è «da definire»;
//  - il conducente è compreso nel numero dei posti; ogni occupante usa un posto;
//  - il movimento dipende dal numero degli occupanti (Turk: 1–2 → Passo 6 · Corsa 12 · Scatto 18; 3 → Passo 4 · Corsa 8 · niente Scatto);
//  - un occupante oltre il totale non sale; chi scende libera il posto e non segue più la pedina;
//  - anche i PNG fuori dallo scontro salgono e scendono, senza entrare nell'Iniziativa: qui un occupante è solo un riferimento
//    `{ id, tipo, conducente? }`, e salire o scendere non scrive mai niente sull'Iniziativa, sulle Azioni o sullo scontro.
//
// Il collegamento con la pedina della mappa (posizione, «Sali»/«Scendi» nel menu del token) è un pezzo a parte: la plancia non si tocca prima
// del tavolo. Principio del progetto: avvisa, non blocca — tranne il quarto occupante del Turk, che la risposta dice espressamente che non sale.

/** @returns {{ nota: 'scheda'|'da_definire', totale: number|null, conducenteCompreso: boolean }} */
export function capienzaDi(scheda) {
  const p = scheda?.posti;
  if (!p || !Number.isInteger(p.totale)) return { nota: 'da_definire', totale: null, conducenteCompreso: true };
  return { nota: 'scheda', totale: p.totale, conducenteCompreso: p.conducente_compreso !== false };
}

/** Il movimento della scheda per `n` occupanti: la fascia che lo contiene, o quello base se la scheda non dichiara fasce. */
export function movimentoConOccupanti(scheda, n) {
  const fasce = scheda?.posti?.fasce;
  const base = scheda?.movimento ?? null;
  if (!Array.isArray(fasce) || !fasce.length) return { movimento: base, fascia: null };
  const k = Math.max(1, n | 0);
  const f = fasce.find((x) => k >= x.occupanti_da && k <= x.occupanti_a);
  return { movimento: f ? f.movimento : base, fascia: f ?? null };
}

const nuovoMezzo = (m) => ({ occupanti: [], ...(m ?? {}) });
const occupantiDi = (m) => (Array.isArray(m?.occupanti) ? m.occupanti : []);

/** Chi sale: `{ id, tipo: 'pg'|'png'|'nemico', conducente?: boolean }`. Restituisce un mezzo nuovo; l'originale non si tocca. */
export function sali(mezzo, occupante, scheda) {
  const m = nuovoMezzo(mezzo);
  const lista = occupantiDi(m);
  const cap = capienzaDi(scheda);
  if (!occupante?.id) return { ok: false, motivo: 'manca chi sale', mezzo: m };
  if (lista.some((o) => o.id === occupante.id)) return { ok: false, motivo: 'è già a bordo', mezzo: m };
  if (cap.totale !== null && lista.length >= cap.totale) {
    return { ok: false, motivo: `il mezzo ha ${cap.totale} posti${cap.conducenteCompreso ? ', conducente compreso' : ''}: nessun altro può salire`, mezzo: m };
  }
  const conducente = !!occupante.conducente && !lista.some((o) => o.conducente);
  const nuovo = { id: occupante.id, tipo: occupante.tipo ?? 'pg', ...(conducente ? { conducente: true } : {}) };
  const out = { ...m, occupanti: [...lista, nuovo] };
  return { ok: true, mezzo: out, avviso: cap.nota === 'da_definire' ? 'capienza da definire: la scheda non dice i posti (A.296); decide il Direttore' : null,
    movimento: movimentoConOccupanti(scheda, out.occupanti.length).movimento };
}

/** Chi scende libera il posto e non segue più la pedina; se era il conducente, il mezzo resta senza conducente. */
export function scendi(mezzo, id, scheda) {
  const m = nuovoMezzo(mezzo);
  const lista = occupantiDi(m);
  if (!lista.some((o) => o.id === id)) return { ok: false, motivo: 'non è a bordo', mezzo: m };
  const out = { ...m, occupanti: lista.filter((o) => o.id !== id) };
  return { ok: true, mezzo: out, movimento: movimentoConOccupanti(scheda, out.occupanti.length || 1).movimento };
}

/** Dove sono gli occupanti quando la pedina sta in `posizione`: tutti con lei, tranne chi è sceso (non è più nella lista). */
export function posizioniOccupanti(mezzo, posizione) {
  return Object.fromEntries(occupantiDi(mezzo).map((o) => [o.id, posizione]));
}

export const postiLiberi = (mezzo, scheda) => { const c = capienzaDi(scheda); return c.totale === null ? null : Math.max(0, c.totale - occupantiDi(mezzo).length); };
