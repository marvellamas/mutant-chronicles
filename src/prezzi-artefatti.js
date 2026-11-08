// Il prezzo di vendita degli Artefatti (A.256, Davide 06/11/2026). Funzioni pure.
//
// «Il prezzo di vendita si calcola come costo completo di costruzione × 3 × coefficiente di rarità. Coefficienti:
// Comune 1; Non comune 1,5; Raro 2; Molto raro 3; Leggendario 5; Unico o reliquia senza prezzo di catalogo. Il
// risultato si arrotonda per eccesso ai 50 cr successivi.»
//
// Rarità e reperibilità restano separate: disporre del denaro non garantisce che l'oggetto sia disponibile. Per
// questo `prezzoArtefatto` porta sempre la Reperibilità accanto al prezzo, e la scheda la scrive: l'app non deve
// far sembrare comprabile ciò che non è reperibile.
//
// La rarità di un Artefatto è la sua **potenza** (`artefatto.potenza`: Equipaggiamento §10.1, «il Grado determina la
// potenza magica»), non la Qualità fisica né la Reperibilità. Un pezzo unico o una reliquia (`unico: true`) non ha
// prezzo di catalogo. Tutti i numeri stanno in data/regole.json → `prezzi_artefatti`.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const intero = (v) => (Number.isFinite(v) ? v : null);

/** Il blocco `prezzi_artefatti` dei dati. */
export const regolePrezzi = (dati) => (isOggetto(dati?.regole?.prezzi_artefatti) ? dati.regole.prezzi_artefatti : isOggetto(dati?.prezzi_artefatti) ? dati.prezzi_artefatti : null);

/** La rarità di una voce: la potenza dell'Artefatto, oppure «Unico o reliquia» per un pezzo unico. */
export function raritaArtefatto(voce, dati) {
  const R = regolePrezzi(dati);
  if (voce?.unico === true) return R?.senza_prezzo ?? 'Unico o reliquia';
  const p = voce?.artefatto?.potenza ?? voce?.potenza ?? null;
  return typeof p === 'string' && p ? p : null;
}

/**
 * Il coefficiente di rarità. null quando la rarità non è nella tabella (per esempio l'«Epica», che la A.256 non
 * dà: A.262) oppure è «Unico o reliquia», che non ha prezzo di catalogo.
 */
export function coefficienteRarita(rarita, dati) {
  const R = regolePrezzi(dati);
  if (!R || typeof rarita !== 'string') return null;
  const c = R.coefficienti?.[rarita];
  return Number.isFinite(c) ? c : null;
}

/** Arrotondamento della A.256: per eccesso ai 50 cr successivi (il passo sta nei dati). */
export function arrotondaPrezzo(cr, dati) {
  const a = regolePrezzi(dati)?.arrotondamento;
  const passo = Number.isFinite(a?.ai_cr) && a.ai_cr > 0 ? a.ai_cr : 50;
  if (!Number.isFinite(cr)) return null;
  return (a?.modo === 'difetto' ? Math.floor(cr / passo) : Math.ceil(cr / passo)) * passo;
}

/**
 * Il prezzo di vendita dalla formula: costo di costruzione × 3 × coefficiente, arrotondato ai 50 cr.
 * @returns {{ cr, grezzo, coefficiente, moltiplicatore, conto }} oppure null con il motivo.
 */
export function prezzoDiVendita(costruzioneCr, rarita, dati, { numero = (n) => String(n) } = {}) {
  const R = regolePrezzi(dati);
  if (!R) return { cr: null, motivo: 'le regole del prezzo di vendita non sono nei dati' };
  if (rarita === R.senza_prezzo) return { cr: null, motivo: 'esemplare unico o reliquia: senza prezzo di catalogo (A.256)' };
  const costo = intero(costruzioneCr);
  if (costo === null || costo < 0) return { cr: null, motivo: 'il costo completo di costruzione non è noto' };
  const coef = coefficienteRarita(rarita, dati);
  if (coef === null) return { cr: null, motivo: rarita ? `la A.256 non dà il coefficiente della rarità «${rarita}» (A.262)` : 'la rarità non è indicata' };
  const molt = Number.isFinite(R.moltiplicatore) ? R.moltiplicatore : 3;
  const grezzo = costo * molt * coef;
  const cr = arrotondaPrezzo(grezzo, dati);
  return {
    cr,
    grezzo,
    coefficiente: coef,
    moltiplicatore: molt,
    // «1.500 × 3 × 3 = 13.500 cr» (arrotondato per eccesso ai 50)
    conto: `${numero(costo)} × ${molt} × ${String(coef).replace('.', ',')} = ${numero(grezzo)}${cr !== grezzo ? ` → ${numero(cr)} (arrotondato per eccesso ai ${regolePrezzi(dati)?.arrotondamento?.ai_cr ?? 50} cr)` : ''} cr`,
  };
}

/**
 * Il prezzo di una voce del catalogo, come la scheda lo mostra:
 *  - `catalogo`: il prezzo dichiarato dal manuale, quando c'è (resta quello: A.261 aperta);
 *  - `vendita`: il prezzo calcolato con la A.256, quando il costo di costruzione e la rarità lo consentono;
 *  - `cr`: il prezzo da usare — quello dichiarato se c'è, altrimenti quello calcolato;
 *  - `reperibilita` e `nota`: rarità e reperibilità restano separate (A.256).
 */
export function prezzoArtefatto(voce, dati, { numero = (n) => String(n) } = {}) {
  const rarita = raritaArtefatto(voce, dati);
  const dichiarato = intero(voce?.costo);
  const v = prezzoDiVendita(voce?.creazione_cr, rarita, dati, { numero });
  const unico = voce?.unico === true;
  return {
    rarita,
    unico,
    catalogo: dichiarato,
    costruzione: intero(voce?.creazione_cr),
    vendita: v.cr ?? null,
    conto: v.conto ?? null,
    coefficiente: v.coefficiente ?? null,
    motivo: v.cr === null ? v.motivo : null,
    cr: dichiarato ?? v.cr ?? null,
    fonte: dichiarato !== null ? 'catalogo' : v.cr !== null ? 'A.256' : null,
    reperibilita: typeof voce?.reperibilita === 'string' ? voce.reperibilita : null,
    nota: regolePrezzi(dati)?.reperibilita_separata ?? null,
  };
}

/** La riga da scrivere nella scheda: «13.500 cr (A.256: 1.500 × 3 × 3)», o il motivo per cui non c'è un prezzo. */
export function testoPrezzoArtefatto(voce, dati, { numero = (n) => String(n) } = {}) {
  const p = prezzoArtefatto(voce, dati, { numero });
  if (p.cr === null) return { testo: p.motivo ?? 'prezzo non disponibile', prezzo: p };
  const parti = [`${numero(p.cr)} cr`];
  if (p.fonte === 'A.256') parti.push(`A.256: ${p.conto}`);
  else if (p.vendita !== null && p.vendita !== p.catalogo) parti.push(`prezzo di vendita calcolato ${numero(p.vendita)} cr (A.256: ${p.conto})`);
  if (p.reperibilita) parti.push(`REP ${p.reperibilita}`);
  return { testo: parti.join(' · '), prezzo: p };
}
