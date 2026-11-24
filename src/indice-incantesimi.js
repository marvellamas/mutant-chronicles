// Lotto 245: l'indice degli incantesimi conosciuti (tab Poteri) è raggruppato per TIPO — la macrofamiglia dell'incantesimo
// (Fisica, Mentale, Spirituale), che è anche il colore del Chroma (regole.json → chroma.colori: Rosso = Fisica, Blu = Mentale,
// Verde = Spirituale) e della palette (--fisica, --mentale, --spirituale). Ordine dei gruppi deciso da Marcello: prima i rossi,
// poi i blu, poi i verdi; dentro ogni gruppo in ordine alfabetico. Un tipo che non è fra i tre (oggi non ce n'è: 30 + 30 + 30
// incantesimi) non ha una posizione inventata: va dopo i tre, in ordine alfabetico fra i tipi, e il gruppo lo dice.

/** L'ordine dei colori dei gruppi (richiesta di Marcello, 24/11/2026). I colori e le macrofamiglie che portano vengono dai dati. */
export const ORDINE_COLORI_INDICE = ['Rosso', 'Blu', 'Verde'];

const confronta = (a, b) => String(a).localeCompare(String(b), 'it', { sensitivity: 'base' });

/**
 * voci: [{ nome, macro }]; colori: regole.chroma.colori. Torna [{ macro, colore (o null), voci: [{ nome, macro }] }] nell'ordine
 * Rosso, Blu, Verde e poi gli altri tipi; ogni gruppo ordinato per nome. Un gruppo senza voci non c'è.
 */
export function gruppiIndiceIncantesimi(voci, colori = {}) {
  const macroDelColore = (c) => colori?.[c]?.macrofamiglie ?? [];
  const ordine = [];
  for (const colore of ORDINE_COLORI_INDICE) for (const macro of macroDelColore(colore)) if (!ordine.some((g) => g.macro === macro)) ordine.push({ macro, colore });
  const altri = [...new Set(voci.map((v) => v.macro))].filter((m) => !ordine.some((g) => g.macro === m)).sort(confronta);
  for (const macro of altri) ordine.push({ macro, colore: null });
  return ordine
    .map((g) => ({ ...g, voci: voci.filter((v) => v.macro === g.macro).sort((x, y) => confronta(x.nome, y.nome)) }))
    .filter((g) => g.voci.length > 0);
}
