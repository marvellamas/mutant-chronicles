// Palette della scheda digitale (css/palette.css, docs/palette.md): quali colori significano che
// cosa. Funzioni pure, usate dalla UI per le classi CSS e dai test per controllare i contrasti.

/** Macrofamiglia degli incantesimi → nome del colore (--fisica, --mentale, --spirituale). */
export const COLORI_MACROFAMIGLIE = { Fisica: 'fisica', Mentale: 'mentale', Spirituale: 'spirituale' };

/** Classe CSS di un incantesimo per la sua macrofamiglia ('' se sconosciuta). */
export const classeMacrofamiglia = (macrofamiglia) => (COLORI_MACROFAMIGLIE[macrofamiglia] ? `macro-${COLORI_MACROFAMIGLIE[macrofamiglia]}` : '');

/**
 * Gruppi dell'equipaggiamento nella tab Combattimento, nell'ordine di visualizzazione: tipo di
 * oggetto (TIPI in src/equipaggiamento.js) → titolo e colore dell'etichetta (--cat-*).
 */
export const GRUPPI_EQUIPAGGIAMENTO = [
  { tipo: 'arma_ravvicinata', titolo: 'Armi ravvicinate', colore: 'cat-ravvicinate' },
  { tipo: 'arma_distanza', titolo: 'Armi a distanza', colore: 'cat-distanza' },
  { tipo: 'scudo', titolo: 'Scudi', colore: 'cat-scudi' },
  { tipo: 'armatura', titolo: 'Armature', colore: 'cat-armature' },
  { tipo: 'accessorio', titolo: 'Accessori', colore: 'cat-accessori' },
  { tipo: 'munizioni', titolo: 'Munizioni', colore: 'cat-munizioni' },
  { tipo: 'sanitario', titolo: 'Sanitario', colore: 'cat-sanitario' },
  { tipo: 'artefatto', titolo: 'Artefatti e Chroma', colore: 'cat-artefatti' },
  { tipo: 'altro', titolo: 'Altro', colore: 'cat-altro' },
];

/** Colori riservati: non si usano per le categorie né per altro. */
export const COLORI_RISERVATI = ['pv', 'pm', 'pe', 'fisica', 'mentale', 'spirituale'];

/**
 * Coppie da controllare: [primo piano, sfondo, contrasto minimo]. Testo ≥ 4.5:1 (WCAG AA);
 * bordi e barre ≥ 3:1 (elementi grafici). «testo» e «superficie» vengono da css/style.css.
 */
export const COPPIE_CONTRASTO = [
  ...['pv', 'pm', 'pe'].flatMap((c) => [
    [c, 'superficie', 4.5], // titolo del riquadro e bordo
    [c, `${c}-tenue`, 4.5],
    ['testo', `${c}-tenue`, 4.5],
  ]),
  ...['fisica', 'mentale', 'spirituale'].flatMap((c) => [
    [c, 'superficie', 3], // barra laterale
    [c, `${c}-tenue`, 3],
    [`${c}-testo`, `${c}-tenue`, 4.5], // etichetta con il nome della macrofamiglia
    [`${c}-testo`, 'superficie', 4.5],
    ['testo', `${c}-tenue`, 4.5], // il testo dell'incantesimo resta pieno
  ]),
  ...GRUPPI_EQUIPAGGIAMENTO.map((g) => ['cat-testo', g.colore, 4.5]),
];

// ---------------------------------------------------------------------------
// Contrasto (WCAG 2.x)

function luminanza(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`colore non valido: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapporto di contrasto fra due colori #rrggbb. */
export function contrasto(a, b) {
  const [x, y] = [luminanza(a), luminanza(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Variabili CSS dichiarate in un foglio: { chiaro: {nome: valore}, scuro: {…} }. Il tema scuro è il
 * blocco dentro @media (prefers-color-scheme: dark).
 */
export function variabiliCss(testo) {
  const senzaCommenti = testo.replace(/\/\*[\s\S]*?\*\//g, '');
  const i = senzaCommenti.indexOf('@media (prefers-color-scheme: dark)');
  const leggi = (parte) => Object.fromEntries([...parte.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
  if (i < 0) return { chiaro: leggi(senzaCommenti), scuro: {} };
  // il blocco scuro finisce alla graffa che chiude la @media
  let livello = 0;
  let fine = senzaCommenti.length;
  for (let k = senzaCommenti.indexOf('{', i); k < senzaCommenti.length; k++) {
    if (senzaCommenti[k] === '{') livello++;
    if (senzaCommenti[k] === '}' && --livello === 0) { fine = k; break; }
  }
  return { chiaro: leggi(senzaCommenti.slice(0, i) + senzaCommenti.slice(fine)), scuro: leggi(senzaCommenti.slice(i, fine)) };
}
