// Galleria (N1, idea di Marcello del 13/10/2026): le immagini che il master mostra ai giocatori con un tocco, fuori
// dal combattimento (un luogo, un volto, un oggetto), senza usare la mappa.
//
// Qui solo funzioni pure: l'indice della cartella galleria/ (file reali + schede), i filtri della tab del master, la
// galleria dei giocatori (le sole immagini già mostrate) e le modifiche dell'indice. Le cartelle e la rete stanno in
// server.mjs, l'interfaccia in src/ui/galleria.js e src/ui/galleria-giocatori.js. Parametri in data/galleria.json.
//
// Un'immagine è un file della cartella; la sua scheda nell'indice porta nome, categoria, le copie (ridotta e
// miniatura) e quando è stata mostrata l'ultima volta. Le immagini messe a mano nella cartella compaiono lo stesso:
// l'indice si rifà sui file che ci sono davvero, e chi non ha scheda ne riceve una con il nome del file.

export const VERSIONE_GALLERIA = 1;
/** Nome di un file della galleria: come lo scrive il server (lettere, cifre, trattini) più l'estensione. */
export const FILE_GALLERIA = /^[a-z0-9][a-z0-9._-]{0,99}\.(jpe?g|png|webp|gif)$/i;
/** Copie generate dal browser del master: non sono voci della galleria, stanno accanto alla loro immagine. */
export const COPIA_GALLERIA = /-(ridotta|mini)\.(jpe?g|png|webp|gif)$/i;

const testo = (v, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const quando = (v) => (Number.isFinite(v) && v > 0 ? Math.round(v) : null);

/** Nome proposto per un file: il nome senza estensione, con gli spazi al posto di trattini e underscore. */
export function nomeDaFile(file) {
  const senza = String(file ?? '').replace(/\.[^.]+$/, '').replace(/-[0-9a-f]{12}$/i, '');
  const n = senza.replace(/[-_]+/g, ' ').trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : String(file ?? '');
}

/** Nome del file nella cartella: minuscole senza accenti, con l'impronta del contenuto (come le mappe). */
export function nomeFileGalleria(nome, impronta, estensione, variante = null) {
  const base = String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'immagine';
  return `${base}-${impronta}${variante ? `-${variante}` : ''}.${estensione}`;
}

/** Una scheda ripulita (quello che si scrive in galleria.json). */
export function voceGalleria(v, file) {
  return {
    file,
    nome: testo(v?.nome) || nomeDaFile(file),
    categoria: testo(v?.categoria, 40) || null,
    ridotta: typeof v?.ridotta === 'string' && FILE_GALLERIA.test(v.ridotta) ? v.ridotta : null,
    mini: typeof v?.mini === 'string' && FILE_GALLERIA.test(v.mini) ? v.mini : null,
    aggiunta: quando(v?.aggiunta) ?? null,
    mostrata: quando(v?.mostrata),
    // «Togli dalla galleria dei giocatori»: l'immagine resta al master, sparisce dall'elenco dei giocatori
    daiGiocatori: v?.daiGiocatori === false ? false : true,
  };
}

/**
 * L'indice della galleria: le schede salvate rifatte sui file che ci sono davvero.
 * @param file nomi dei file della cartella (comprese le copie «-ridotta» e «-mini»)
 * @param salvato il contenuto di galleria.json (o null)
 * @param adesso ms, per le immagini trovate adesso nella cartella
 * @returns { versione, immagini: [voce], mostrata } con le immagini dalla più recente
 */
export function indiceGalleria(file, salvato = null, adesso = Date.now()) {
  const presenti = (file ?? []).filter((f) => FILE_GALLERIA.test(f));
  const copie = new Set(presenti.filter((f) => COPIA_GALLERIA.test(f)));
  const immagini = presenti.filter((f) => !copie.has(f));
  const per = new Map((Array.isArray(salvato?.immagini) ? salvato.immagini : [])
    .filter((v) => typeof v?.file === 'string').map((v) => [v.file, v]));
  const voci = immagini.map((f) => {
    const v = voceGalleria(per.get(f) ?? {}, f);
    // le copie restano solo se il file c'è ancora; quelle messe a mano si ritrovano dal nome
    const base = f.replace(/\.[^.]+$/, '');
    const trova = (variante) => (v[variante] && copie.has(v[variante]) ? v[variante]
      : presenti.find((x) => copie.has(x) && x.startsWith(`${base}-${variante === 'mini' ? 'mini' : 'ridotta'}.`)) ?? null);
    return { ...v, ridotta: trova('ridotta'), mini: trova('mini'), aggiunta: v.aggiunta ?? adesso };
  });
  voci.sort((a, b) => (b.aggiunta ?? 0) - (a.aggiunta ?? 0) || a.nome.localeCompare(b.nome, 'it'));
  const mostrata = typeof salvato?.mostrata === 'string' && voci.some((v) => v.file === salvato.mostrata) ? salvato.mostrata : null;
  return { versione: VERSIONE_GALLERIA, immagini: voci, mostrata };
}

/** Le categorie di data/galleria.json più quelle già usate nelle immagini (il master può scriverne altre). */
export function categorieGalleria(indice, dati) {
  const note = (dati?.galleria?.categorie ?? []).map((c) => c.nome);
  const usate = (indice?.immagini ?? []).map((v) => v.categoria).filter(Boolean);
  return [...new Set([...note, ...usate])];
}

const senzaAccenti = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Le immagini della tab del master, filtrate per categoria e cercate per nome. */
export function vociPerMaster(indice, { categoria = null, cerca = '' } = {}) {
  const q = senzaAccenti(cerca).trim();
  return (indice?.immagini ?? [])
    .filter((v) => (!categoria || v.categoria === categoria))
    .filter((v) => (!q || senzaAccenti(v.nome).includes(q) || senzaAccenti(v.file).includes(q)));
}

/**
 * La galleria dei giocatori: le sole immagini già mostrate almeno una volta e non tolte dal master, dalla più
 * recente. Non c'è nulla di segreto: chi non è mai stato mostrato non compare.
 */
export function galleriaGiocatori(indice) {
  return (indice?.immagini ?? [])
    .filter((v) => v.mostrata && v.daiGiocatori !== false)
    .sort((a, b) => b.mostrata - a.mostrata)
    .map((v) => ({ file: v.file, nome: v.nome, categoria: v.categoria, ridotta: v.ridotta, mini: v.mini, mostrata: v.mostrata }));
}

/** Quello che si manda ai giocatori quando si mostra un'immagine (la copia ridotta, se c'è). */
export function immagineAiGiocatori(indice, file = indice?.mostrata) {
  const v = (indice?.immagini ?? []).find((x) => x.file === file);
  if (!v) return null;
  return { file: v.file, nome: v.nome, ridotta: v.ridotta, mini: v.mini, quando: v.mostrata ?? null };
}

/** «Mostra ai giocatori»: l'immagine diventa quella mostrata (sostituisce la precedente) ed entra nella loro galleria. */
export function conMostrata(indice, file, adesso = Date.now()) {
  if (!(indice?.immagini ?? []).some((v) => v.file === file)) return indice;
  return {
    ...indice,
    mostrata: file,
    immagini: indice.immagini.map((v) => (v.file === file ? { ...v, mostrata: adesso, daiGiocatori: true } : v)),
  };
}

/** «Nascondi a tutti»: l'immagine sparisce dagli schermi, ma resta nella galleria dei giocatori. */
export const senzaMostrata = (indice) => ({ ...indice, mostrata: null });

/** «Togli dalla galleria dei giocatori»: resta al master; se è quella mostrata, si nasconde. */
export function togliDaiGiocatori(indice, file) {
  const i = { ...indice, immagini: (indice?.immagini ?? []).map((v) => (v.file === file ? { ...v, daiGiocatori: false } : v)) };
  return i.mostrata === file ? senzaMostrata(i) : i;
}

/** Nome o categoria cambiati (e le copie appena caricate). */
export function conVoce(indice, file, modifica) {
  return {
    ...indice,
    immagini: (indice?.immagini ?? []).map((v) => (v.file === file ? voceGalleria({ ...v, ...modifica }, file) : v)),
  };
}

/** L'immagine eliminata dall'indice: restituisce anche i file da cancellare (originale e copie). */
export function senzaImmagine(indice, file) {
  const v = (indice?.immagini ?? []).find((x) => x.file === file);
  const i = { ...indice, immagini: (indice?.immagini ?? []).filter((x) => x.file !== file) };
  return { indice: i.mostrata === file ? senzaMostrata(i) : i, daCancellare: v ? [v.file, v.ridotta, v.mini].filter(Boolean) : [] };
}
