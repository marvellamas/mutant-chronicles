// Ritratto del personaggio: immagine ridimensionata nel browser e salvata come data URL nelle
// scelte (scelte.ritratto), quindi anche nel file esportato. Qui le parti pure: dimensioni, peso,
// validità. Il ridimensionamento con canvas è in src/ui/ritratto.js.

/** Limiti del ritratto: lato lungo, qualità JPEG, peso massimo dopo il ridimensionamento. */
export const RITRATTO = { latoMassimo: 600, qualitaJpeg: 0.8, byteMassimi: 200 * 1024 };

/**
 * Dimensioni dopo il ridimensionamento: il lato lungo non supera `lato`, le proporzioni restano,
 * un'immagine più piccola non si ingrandisce. Interi ≥ 1.
 */
export function dimensioniRitratto(larghezza, altezza, lato = RITRATTO.latoMassimo) {
  if (!(larghezza > 0 && altezza > 0)) throw new Error('Dimensioni dell’immagine non valide.');
  const scala = Math.min(1, lato / Math.max(larghezza, altezza));
  return { larghezza: Math.max(1, Math.round(larghezza * scala)), altezza: Math.max(1, Math.round(altezza * scala)) };
}

const PREFISSO = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/;

/** Byte dell'immagine contenuta in un data URL base64 (0 se non è un data URL valido). */
export function byteDataUrl(dataUrl) {
  const m = typeof dataUrl === 'string' ? PREFISSO.exec(dataUrl) : null;
  if (!m) return 0;
  const b64 = m[2];
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
}

/** Un ritratto salvabile: data URL JPEG o PNG in base64, entro il peso massimo. */
export function ritrattoValido(v) {
  const n = byteDataUrl(v);
  return n > 0 && n <= RITRATTO.byteMassimi;
}

/** «84 KB» */
export const testoPeso = (byte) => (byte < 1024 ? `${byte} byte` : `${Math.round(byte / 1024)} KB`);
