// Condizioni di «Attacca!» arrivate dalla mappa (S22, deciso da Marcello e Davide): di base movimento, avversario, luce e
// Copertura si mettono a mano; arrivano compilati dalla mappa solo se lo scontro ha una scena con «Mappa semplice»
// spenta (src/mappa/semplice.js). Un valore arrivato dalla mappa si vede («dalla mappa») e si toglie con un tocco:
// torna al valore a mano di partenza. Le scelte salvate dell'attacco portano `dallaMappa: { campo: testo }`.
// Funzioni pure.

/** Campi che la mappa può compilare, con il valore a cui tornano quando si tolgono. */
export const CAMPI_MAPPA = ['distanza', 'copertura', 'impegnato', 'interposta', 'luce', 'movimento'];

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** I segni «dalla mappa» delle scelte: { campo: testo }, solo per i campi previsti. */
export function segniMappa(scelte) {
  const m = isOggetto(scelte?.dallaMappa) ? scelte.dallaMappa : {};
  return Object.fromEntries(CAMPI_MAPPA.filter((k) => typeof m[k] === 'string' && m[k]).map((k) => [k, m[k]]));
}

/** Voci da mostrare: [{ campo, testo }]. */
export const vociDallaMappa = (scelte) => Object.entries(segniMappa(scelte)).map(([campo, testo]) => ({ campo, testo }));

const conSegni = (scelte, segni) => {
  const { dallaMappa: _prima, ...resto } = scelte ?? {};
  return Object.keys(segni).length ? { ...resto, dallaMappa: segni } : resto;
};

/**
 * Le scelte con i valori della linea di tiro della mappa: distanza, Copertura, bersaglio protetto, creatura interposta,
 * luce della zona del bersaglio. `p`: { distanza, copertura, protetto, interposta, luceMappa }.
 */
export function conLineaDallaMappa(scelte, p) {
  const segni = { ...segniMappa(scelte) };
  const b = { ...(scelte?.bersaglio ?? {}) };
  const out = { ...(scelte ?? {}) };
  if (Number.isFinite(p?.distanza)) { out.distanza = p.distanza; b.distanza = p.distanza; segni.distanza = `distanza ${p.distanza} Q`; }
  if (typeof p?.copertura === 'string') { b.copertura = p.copertura; segni.copertura = `Copertura ${p.copertura}`; }
  if (p?.protetto) { b.impegnato = true; segni.impegnato = 'bersaglio protetto'; }
  if (p?.interposta) { b.interposta = true; segni.interposta = 'creatura interposta'; }
  if (p?.luceMappa) { out.luceMappa = p.luceMappa; segni.luce = `luce: ${p.luceMappa}`; }
  return conSegni({ ...out, bersaglio: b }, segni);
}

/** Le scelte con il movimento del Round letto dalla mappa (A.136): Corsa o Scatto. */
export function conMovimentoDallaMappa(scelte, fascia, nome = fascia) {
  return conSegni({ ...(scelte ?? {}), movimento: fascia, atletica: null, atleticaTiro: null }, { ...segniMappa(scelte), movimento: `movimento: ${nome}` });
}

/** «Togli» un valore arrivato dalla mappa: il campo torna al valore a mano di partenza e il segno sparisce. */
export function togliDallaMappa(scelte, campo) {
  const segni = { ...segniMappa(scelte) };
  if (!(campo in segni)) return scelte;
  delete segni[campo];
  const out = { ...scelte };
  const b = { ...(scelte.bersaglio ?? {}) };
  if (campo === 'distanza') { delete out.distanza; delete b.distanza; }
  if (campo === 'copertura') b.copertura = 'nessuna';
  if (campo === 'impegnato') b.impegnato = false;
  if (campo === 'interposta') b.interposta = false;
  if (campo === 'luce') delete out.luceMappa;
  if (campo === 'movimento') { out.movimento = 'fermo'; out.atletica = null; out.atleticaTiro = null; }
  return conSegni({ ...out, bersaglio: b }, segni);
}

/**
 * I segni dopo una modifica a mano: il campo che il giocatore ha cambiato non è più «dalla mappa».
 * `modifica`: l'oggetto passato a «imposta» del pannello ({ movimento }, { distanza }, { bersaglio: { copertura } }…).
 */
export function segniDopoModifica(scelte, modifica) {
  const segni = { ...segniMappa(scelte) };
  const b = modifica?.bersaglio ?? {};
  if (modifica && 'movimento' in modifica) delete segni.movimento;
  if (modifica && 'distanza' in modifica) delete segni.distanza;
  if ('distanza' in b) delete segni.distanza;
  if ('copertura' in b) delete segni.copertura;
  if ('impegnato' in b) delete segni.impegnato;
  if ('interposta' in b) delete segni.interposta;
  return segni;
}
