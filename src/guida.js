// Guida della mappa per Davide (docs/battlemap/guida-davide.md) dentro l'app: un markdown minimo diventa blocchi da
// disegnare (titoli, paragrafi, elenchi numerati e puntati, grassetto e codice in linea). Niente HTML dal testo: chi
// disegna (src/ui/guida.js) crea gli elementi uno per uno. Funzioni pure.

/** Pezzi in linea: [{ testo, grassetto?, codice? }] da «**…**» e «`…`». */
export function inLinea(testo) {
  const r = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let ultimo = 0;
  for (let m; (m = re.exec(testo));) {
    if (m.index > ultimo) r.push({ testo: testo.slice(ultimo, m.index) });
    r.push(m[1] !== undefined ? { testo: m[1], grassetto: true } : { testo: m[2], codice: true });
    ultimo = re.lastIndex;
  }
  if (ultimo < testo.length) r.push({ testo: testo.slice(ultimo) });
  return r;
}

/**
 * Blocchi del testo: { tipo: 'titolo', livello, pezzi } | { tipo: 'paragrafo', pezzi } |
 * { tipo: 'numerato' | 'puntato', voci: [pezzi], inizio? (numero della prima voce) }. Una riga che non apre un blocco continua la voce o il paragrafo.
 */
export function blocchiMarkdown(md) {
  const blocchi = [];
  let aperto = null;
  const chiudi = () => { aperto = null; };
  for (const riga of String(md).replace(/\r/g, '').split('\n')) {
    const t = riga.trim();
    if (!t) { chiudi(); continue; }
    const titolo = /^(#{1,4})\s+(.*)$/.exec(t);
    if (titolo) { chiudi(); blocchi.push({ tipo: 'titolo', livello: titolo[1].length, pezzi: inLinea(titolo[2]) }); continue; }
    const num = /^(\d+)\.\s+(.*)$/.exec(t);
    const punto = /^[-*]\s+(.*)$/.exec(t);
    if (num || punto) {
      const tipo = num ? 'numerato' : 'puntato';
      if (aperto?.tipo !== tipo) { aperto = { tipo, voci: [], ...(num ? { inizio: Number(num[1]) } : {}) }; blocchi.push(aperto); }
      aperto.voci.push(inLinea(num ? num[2] : punto[1]));
      continue;
    }
    if (aperto?.tipo === 'numerato' || aperto?.tipo === 'puntato') { aperto.voci.at(-1).push(...inLinea(` ${t}`)); continue; }
    if (aperto?.tipo === 'paragrafo') { aperto.pezzi.push(...inLinea(` ${t}`)); continue; }
    aperto = { tipo: 'paragrafo', pezzi: inLinea(t) };
    blocchi.push(aperto);
  }
  return blocchi;
}
