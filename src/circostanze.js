// Bonus e malus di circostanza (richiesta del primo playtest, 05/10/2026; Giocatore §1.4: il Direttore assegna un
// modificatore di circostanza). Il master dice «+2 a distanza» o «−1 a tutto» e il giocatore lo segna nella scheda:
// righe { id, valore, categorie, nota? } in sessione.circostanze, valore da regole.json → circostanza (−10…+10),
// categorie da regole.json → circostanza.categorie (a quali Prove si applica). Entrano nei valori effettivi come
// condizione «Circostanza ±N» (src/condizioni.js), quindi in VA mostrati, «Attacca!», «Lancia!», Prove Salvezza e
// Iniziativa, con la provenienza; i valori a riposo e la stampa non cambiano. Funzioni pure.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const TUTTO = 'tutto';

/** Regole della circostanza (limiti e categorie), o null se mancano nei dati. */
export const regoleCircostanza = (dati) => dati?.regole?.circostanza ?? null;
const idCategorie = (R) => (R?.categorie ?? []).map((c) => c.id);

/** Righe ripulite: valore intero entro i limiti, categorie ammesse e senza doppioni, nota breve. */
export function normalizzaCircostanze(lista, R) {
  if (!Array.isArray(lista) || !R) return [];
  const ammesse = new Set(idCategorie(R));
  const usati = new Set();
  return lista.filter(isOggetto).map((x, i) => {
    let id = typeof x.id === 'string' && x.id ? x.id : `c${i + 1}`;
    while (usati.has(id)) id = `${id}x`;
    usati.add(id);
    const v = Number.isInteger(x.valore) ? Math.max(R.minimo, Math.min(R.massimo, x.valore)) : 0;
    const categorie = [...new Set((Array.isArray(x.categorie) ? x.categorie : []).filter((c) => ammesse.has(c)))];
    const nota = typeof x.nota === 'string' ? x.nota.slice(0, 120) : '';
    return { id, valore: v, categorie, ...(nota ? { nota } : {}) };
  });
}

/** Nuova riga a 0, senza categorie: le categorie si spuntano tutte al primo valore diverso da 0. */
export function aggiungiCircostanza(lista, R) {
  const l = normalizzaCircostanze(lista, R);
  let n = l.length + 1;
  while (l.some((x) => x.id === `c${n}`)) n++;
  return [...l, { id: `c${n}`, valore: 0, categorie: [] }];
}

/** Valore della riga (− / +): passando da 0 a un valore diverso da 0 senza categorie, si spuntano tutte. */
export function variaCircostanza(lista, id, delta, R) {
  return normalizzaCircostanze(lista, R).map((x) => {
    if (x.id !== id) return x;
    const valore = Math.max(R.minimo, Math.min(R.massimo, x.valore + delta));
    const categorie = x.valore === 0 && valore !== 0 && !x.categorie.length ? idCategorie(R) : x.categorie;
    return { ...x, valore, categorie };
  });
}

/** Casella di una categoria; «tutto» spunta tutte (o le toglie tutte se erano già tutte spuntate). */
export function commutaCategoria(lista, id, categoria, R) {
  const tutte = idCategorie(R);
  return normalizzaCircostanze(lista, R).map((x) => {
    if (x.id !== id) return x;
    if (categoria === TUTTO) return { ...x, categorie: x.categorie.length === tutte.length ? [] : tutte };
    const categorie = x.categorie.includes(categoria) ? x.categorie.filter((c) => c !== categoria) : [...x.categorie, categoria];
    return { ...x, categorie: tutte.filter((c) => categorie.includes(c)) };
  });
}

export const notaCircostanza = (lista, id, nota, R) => normalizzaCircostanze(lista, R).map((x) => (x.id === id ? { ...x, nota } : x));
export const togliCircostanza = (lista, id, R) => normalizzaCircostanze(lista, R).filter((x) => x.id !== id);
/** Tutte le categorie spuntate? (casella «Tutto») */
export const tutteSpuntate = (riga, R) => idCategorie(R).every((c) => riga.categorie.includes(c));

/** «Circostanza +2» (con la nota tra parentesi), l'etichetta della provenienza. */
export function etichettaCircostanza(riga) {
  const v = riga.valore < 0 ? `−${-riga.valore}` : `+${riga.valore}`;
  return `Circostanza ${v}${riga.nota ? ` (${riga.nota})` : ''}`;
}

/**
 * Effetto di condizione di una riga (forma di src/condizioni.js): va_abilita per le Abilità delle categorie
 * (una volta sola per Abilità), salvezze e iniziativa per «Derivate». null se la riga non ha effetto.
 */
export function effettoCircostanza(riga, dati) {
  const R = regoleCircostanza(dati);
  if (!R || !riga.valore || !riga.categorie.length) return null;
  const elencate = new Set(R.categorie.flatMap((c) => c.abilita ?? []));
  const tutteAbilita = (dati.abilita?.abilita ?? []).map((a) => a.nome);
  const abilita = new Set();
  const e = {};
  for (const c of R.categorie.filter((x) => riga.categorie.includes(x.id))) {
    for (const a of c.abilita ?? []) abilita.add(a);
    if (c.altre_abilita) for (const a of tutteAbilita.filter((n) => !elencate.has(n))) abilita.add(a);
    if (c.salvezze) e.salvezze = riga.valore;
    if (c.iniziativa) e.iniziativa = riga.valore;
  }
  if (abilita.size) e.va_abilita = Object.fromEntries([...abilita].map((a) => [a, riga.valore]));
  return Object.keys(e).length ? e : null;
}

/** Condizioni attive delle circostanze: [{ etichetta, fonte: 'circostanza', effetto }]. */
export function condizioniCircostanza(sessione, dati) {
  const R = regoleCircostanza(dati);
  return normalizzaCircostanze(sessione?.circostanze, R)
    .map((x) => ({ x, effetto: effettoCircostanza(x, dati) }))
    .filter(({ effetto }) => effetto)
    .map(({ x, effetto }) => ({ etichetta: etichettaCircostanza(x), fonte: 'circostanza', effetto, testo: testoRiga(x, R) }));
}

/** «+2 a Distanza, Poteri» o «−1 a tutto»: il testo di una riga nelle Condizioni attive. */
function testoRiga(x, R) {
  const v = x.valore < 0 ? `−${-x.valore}` : `+${x.valore}`;
  return tutteSpuntate(x, R) ? `${v} a tutto` : `${v} a ${R.categorie.filter((c) => x.categorie.includes(c.id)).map((c) => c.nome).join(', ')}`;
}

/** Testo breve delle circostanze attive (plancia, stampa): «+2 Distanza; −1 a tutto». */
export function testoCircostanze(sessione, dati) {
  const R = regoleCircostanza(dati);
  if (!R) return [];
  return normalizzaCircostanze(sessione?.circostanze, R).filter((x) => x.valore && x.categorie.length).map((x) => {
    const v = x.valore < 0 ? `−${-x.valore}` : `+${x.valore}`;
    const dove = tutteSpuntate(x, R) ? 'a tutto' : R.categorie.filter((c) => x.categorie.includes(c.id)).map((c) => c.nome).join(', ');
    return `Circostanza ${v} ${dove}${x.nota ? ` (${x.nota})` : ''}`;
  });
}
