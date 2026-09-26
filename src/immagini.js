// Immagini dell'app: stemmi delle Corporazioni e icone delle pagine della scheda. I file li genera
// tools/genera_immagini.py dagli originali (img/originali/, non tracciati) e li elenca in
// img/immagini.json: l'app chiede solo i file elencati lì, così un'immagine mancante non produce
// richieste fallite ma il ripiego (testo o emoji). Funzioni pure.

/** Varianti prodotte dallo script: 96 px (icone), 512 px (stampa), 512 px in grigio (filigrana). */
export const VARIANTI_IMMAGINE = ['96', '512', '512-grigio'];

/**
 * Percorso di un'immagine: { src (PNG, sempre), webp (se più leggero, altrimenti null) } oppure
 * null se il manifesto non la elenca (id sconosciuto, Corporazione senza immagine come Freelance,
 * variante inesistente, manifesto mancante).
 * @param manifesto contenuto di img/immagini.json (o null)
 * @param gruppo 'corporazioni' | 'pagine'
 */
export function percorsoImmagine(manifesto, gruppo, id, variante = '96') {
  const voce = manifesto?.[gruppo]?.[id]?.[variante];
  if (!voce || typeof voce.png !== 'string') return null;
  return { src: voce.png, webp: typeof voce.webp === 'string' ? voce.webp : null };
}

/** id di una Corporazione dal nome (data/corporazioni.json), o null. */
export function idCorporazione(dati, nome) {
  return dati?.corporazioni?.corporazioni?.find((c) => c.nome === nome)?.id ?? null;
}

/** Stemma di una Corporazione dal nome: percorsoImmagine con il ripiego null. */
export function stemmaCorporazione(manifesto, dati, nome, variante = '96') {
  const id = idCorporazione(dati, nome);
  return id ? percorsoImmagine(manifesto, 'corporazioni', id, variante) : null;
}
