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
  { tipo: 'elmetto', titolo: 'Elmetti', colore: 'cat-elmetti' },
  { tipo: 'accessorio', titolo: 'Accessori', colore: 'cat-accessori' },
  { tipo: 'munizioni', titolo: 'Munizioni', colore: 'cat-munizioni' },
  { tipo: 'sanitario', titolo: 'Sanitario', colore: 'cat-sanitario' },
  { tipo: 'artefatto', titolo: 'Artefatti e Chroma', colore: 'cat-artefatti' },
  { tipo: 'altro', titolo: 'Altro', colore: 'cat-altro' },
];

/**
 * Sezioni della tab Inventario (docs/layout-sd.md, pezzo 2), nell'ordine del piano; stessi colori
 * dei gruppi qui sopra. Un oggetto va nella prima sezione con il suo tipo e, se la sezione li
 * elenca, con il catalogo del riferimento (prefisso di «rif»: gli «altro» dei capitoli del Manuale
 * dell'Equipaggiamento). «Strumenti professionali» e «Razioni» arriveranno con i loro capitoli.
 */
export const SEZIONI_INVENTARIO = [
  { id: 'armi', titolo: 'Armi', colore: 'cat-ravvicinate', tipi: ['arma_ravvicinata', 'arma_distanza'] },
  { id: 'accessori', titolo: 'Accessori (armi, armature, elmetti)', colore: 'cat-accessori', tipi: ['accessorio'] },
  { id: 'protezioni', titolo: 'Armature, scudi ed elmetti', colore: 'cat-armature', tipi: ['armatura', 'scudo', 'elmetto'] },
  { id: 'munizioni', titolo: 'Munizioni e caricatori', colore: 'cat-munizioni', tipi: ['munizioni'] },
  // Equipaggiamento 0.5, §5.4: energia tecnologica in Lx, distinta dalle riserve mistiche in PM (§5.4.10)
  { id: 'nec', titolo: 'NEC e stazioni di ricarica', colore: 'cat-munizioni', tipi: ['altro'], cataloghi: ['nec'] },
  { id: 'dotazioni_personali', titolo: 'Dotazioni personali', colore: 'cat-altro', tipi: ['altro'], cataloghi: ['dotazioni_personali'] },
  { id: 'esplorazione', titolo: 'Esplorazione e sopravvivenza', colore: 'cat-altro', tipi: ['altro'], cataloghi: ['esplorazione'] },
  { id: 'comunicazione', titolo: 'Comunicazione e rilevamento', colore: 'cat-altro', tipi: ['altro'], cataloghi: ['comunicazione'] },
  { id: 'strumenti', titolo: 'Strumenti professionali', colore: 'cat-altro', tipi: ['altro'], cataloghi: ['strumenti_professionali'] },
  { id: 'sanitario', titolo: 'Sanitario', colore: 'cat-sanitario', tipi: ['sanitario'] },
  { id: 'artefatti', titolo: 'Artefatti, cristalli e contenitori di Chroma', colore: 'cat-artefatti', tipi: ['artefatto'] },
  { id: 'altro', titolo: 'Altro equipaggiamento', colore: 'cat-altro', tipi: ['altro'] },
];

/** Sezione dell'Inventario di una voce risolta (risolvi() in src/equipaggiamento.js). */
export function sezioneInventario(r) {
  const tipo = SEZIONI_INVENTARIO.some((s) => s.tipi.includes(r.tipo)) ? r.tipo : 'altro';
  const cat = r.def?.rif ? String(r.def.rif).split(':')[0] : null;
  return SEZIONI_INVENTARIO.find((s) => s.tipi.includes(tipo) && (!s.cataloghi || s.cataloghi.includes(cat)));
}

/** Colori riservati: non si usano per le categorie né per altro. */
export const COLORI_RISERVATI = ['pv', 'pm', 'pe', 'fisica', 'mentale', 'spirituale'];

/** Bandierine del calendario (regole.json → calendario.bandierine): variabile CSS di ogni colore. */
export const COLORI_EVENTO = ['evento-rosso', 'evento-giallo', 'evento-verde'];

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
    ['tenue', `${c}-tenue`, 4.5], // note e livello base (--tenue) sulla tinta
  ]),
  ...GRUPPI_EQUIPAGGIAMENTO.map((g) => ['cat-testo', g.colore, 4.5]),
  // bandierine del calendario: pallini e bordi delle note (elementi grafici)
  ...COLORI_EVENTO.map((c) => [c, 'superficie', 3]),
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
