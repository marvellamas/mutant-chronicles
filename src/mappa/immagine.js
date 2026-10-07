// Immagini delle mappe (§4 della specifica, lotto 1): tipo e dimensioni lette dai primi byte del file, senza
// decodificarlo e senza dipendenze. Le usa il server per accettare solo JPG, PNG e WEBP veri e per controllare
// la copia ridotta; nel browser servono a mostrare le dimensioni prima del caricamento.

const ascii = (b, da, n) => String.fromCharCode(...b.subarray(da, da + n));
const be16 = (b, i) => (b[i] << 8) | b[i + 1];
const be32 = (b, i) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const le24 = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);

/** 'jpeg', 'png', 'webp' oppure null (tipi delle chiavi di data/mappa.json → immagini.tipi). */
export function tipoImmagine(b) {
  if (!(b instanceof Uint8Array) || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a) return 'png';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  return null;
}

/** { tipo, larghezza, altezza } dai primi byte; null se il tipo non è ammesso o l'intestazione non si legge. */
export function dimensioniImmagine(b) {
  const tipo = tipoImmagine(b);
  const esito = (larghezza, altezza) => (larghezza > 0 && altezza > 0 ? { tipo, larghezza, altezza } : null);
  if (tipo === 'png') return b.length >= 24 && ascii(b, 12, 4) === 'IHDR' ? esito(be32(b, 16), be32(b, 20)) : null;
  if (tipo === 'webp') {
    const blocco = ascii(b, 12, 4);
    if (blocco === 'VP8X' && b.length >= 30) return esito(1 + le24(b, 24), 1 + le24(b, 27));
    if (blocco === 'VP8L' && b.length >= 25 && b[20] === 0x2f) {
      return esito(1 + (((b[22] & 0x3f) << 8) | b[21]), 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)));
    }
    if (blocco === 'VP8 ' && b.length >= 30) return esito((b[26] | (b[27] << 8)) & 0x3fff, (b[28] | (b[29] << 8)) & 0x3fff);
    return null;
  }
  if (tipo === 'jpeg') {
    // si scorrono i segmenti fino al primo SOF (C0–CF, tranne C4 DHT, C8 riservato, CC DAC)
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return esito(be16(b, i + 7), be16(b, i + 5));
      i += 2 + be16(b, i + 2);
    }
    return null;
  }
  return null;
}
