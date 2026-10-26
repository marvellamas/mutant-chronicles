// I Talenti che un personaggio aveva prima del passaggio ai Talenti v1.0, letti dal suo file e non dal calcolo della
// scheda (27/10/2026, docs/diagnosi-nota-talenti-2026-10-27.md). La nota del registro «Modifiche del master» nasceva
// dall'elenco `vecchi` di postiTalenti, che guarda soltanto `livelli[].talentoLibero` del regime vecchio; qui si
// raccolgono tutte le strade in cui un file ha un Talento (livelli, creazione, Specializzazioni e Maestrie, id che il
// catalogo non conosce più) e si dice, per ognuno, il livello e la categoria nuova. Funzioni pure.

const NOMI_CATEGORIA = { talento_libero: 'Talento Libero', maestria: 'Maestria', specializzazione: 'Specializzazione' };
const isOggetto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

/** Un Talento scritto in un file: { id, parametro?, annotazione? }, anche se il file ha solo la stringa dell'id. */
const comeScelta = (x) => (typeof x === 'string' && x.trim() ? { id: x.trim() } : isOggetto(x) && typeof x.id === 'string' && x.id ? x : null);

function definizione(id, dati) {
  const t = dati.talenti_liberi?.talenti?.find((x) => x.id === id);
  if (t) return { ...t, specializzazione: false };
  const s = dati.specializzazioni?.specializzazioni?.find((x) => x.id === id);
  return s ? { ...s, specializzazione: true, categoria: 'specializzazione' } : null;
}

/** La categoria nuova di una voce (la voce che la sostituisce, se è un Talento «superato»). */
function categoriaNuova(def, dati) {
  if (!def) return { categoria: null, sostituitoDa: null };
  if (def.categoria === 'superato') {
    const dopo = definizione(def.sostituito_da, dati);
    return { categoria: dopo ? (dopo.specializzazione ? 'specializzazione' : dopo.categoria ?? 'talento_libero') : null, sostituitoDa: dopo?.nome ?? def.sostituito_da ?? null };
  }
  return { categoria: def.specializzazione ? 'specializzazione' : def.categoria ?? 'talento_libero', sostituitoDa: null };
}

/**
 * Tutti i Talenti del file di un personaggio, livello per livello.
 * @param o il file (formato 8): { scelte, livelli }
 * @returns {{ liberi: [{ livello, id, nome, parametro?, annotazione?, categoria, nuovoNome? }], classe: [{ livello, nome }] }}
 */
export function talentiDiPrima(o, dati) {
  const scelte = isOggetto(o?.scelte) ? o.scelte : {};
  const livelli = Array.isArray(o?.livelli) ? o.livelli : [];
  const liberi = [];
  const classe = [];
  const aggiungi = (livello, x) => {
    const s = comeScelta(x);
    if (!s) return;
    const def = definizione(s.id, dati);
    const { categoria, sostituitoDa } = categoriaNuova(def, dati);
    liberi.push({
      livello, id: s.id, nome: def?.nome ?? s.id, ...(s.parametro ? { parametro: String(s.parametro) } : {}),
      ...(s.annotazione ? { annotazione: String(s.annotazione) } : {}), categoria, ...(sostituitoDa ? { nuovoNome: sostituitoDa } : {}),
    });
  };
  // 1° livello: Specializzazione iniziale, o un Talento scritto nella creazione
  aggiungi(1, scelte.specializzazioneIniziale);
  aggiungi(1, scelte.talentoLibero);
  for (const x of Array.isArray(scelte.talentiLiberi) ? scelte.talentiLiberi : []) aggiungi(1, x);
  livelli.forEach((v, i) => {
    const livello = Number.isInteger(v?.livello) ? v.livello : i + 2;
    aggiungi(livello, v?.talentoLibero);
    aggiungi(livello, v?.maestria);
    aggiungi(livello, v?.specializzazione);
    if (typeof v?.talentoClasse === 'string' && v.talentoClasse.trim()) classe.push({ livello, nome: v.talentoClasse.trim() });
  });
  liberi.sort((a, b) => a.livello - b.livello);
  return { liberi, classe };
}

/** Una riga di testo: «Tiro Mirato Migliorato (Maestria)», con parametro e annotazione. */
export function testoTalentoDiPrima(t) {
  const dettagli = [t.parametro, t.annotazione].filter(Boolean).join(', ');
  const cat = t.categoria ? NOMI_CATEGORIA[t.categoria] : 'categoria da stabilire';
  return `${t.nome}${dettagli ? ` (${dettagli})` : ''} — ora ${t.nuovoNome ? `${t.nuovoNome}, ` : ''}${cat}`;
}

/** La nota completa, in una riga di registro: livello per livello, con la categoria nuova. */
export function testoNota({ liberi, classe }, data) {
  const parti = liberi.length
    ? liberi.map((t) => `${t.livello}° livello: ${testoTalentoDiPrima(t)}`).join('; ')
    : 'nessuno';
  const dallaClasse = classe.length ? ` Talenti di Classe (restano): ${classe.map((c) => `${c.livello}° livello: ${c.nome}`).join('; ')}.` : '';
  return `Talenti prima del passaggio ai Talenti v1.0 (${data}): ${parti}.${dallaClasse}`;
}

/** I Talenti nell'elenco strutturato scritto nella riga del registro (`talentiPrima`), per la scheda. */
export const elencoPerRiga = ({ liberi, classe }) => ({
  talentiPrima: liberi,
  ...(classe.length ? { talentiClassePrima: classe } : {}),
});

/**
 * Le righe del registro che portano i Talenti di prima, la più completa e recente per prima.
 * Una riga ha `talentiPrima` (elenco strutturato); quelle vecchie hanno solo l'etichetta con il testo.
 */
export function righeTalentiDiPrima(correzioni) {
  const righe = (Array.isArray(correzioni) ? correzioni : []).filter((x) => isOggetto(x) && x.migrazioneTalenti === true);
  return righe.sort((a, b) => Number(!!b.ricostruita) - Number(!!a.ricostruita) || String(b.quando).localeCompare(String(a.quando)));
}

/**
 * Per la scheda del giocatore: i Talenti di prima, con il posto nuovo che hanno trovato (preso o ancora da riscegliere).
 * @returns {{ liberi, classe, ricostruita, testo }|null}
 */
export function talentiDiPrimaPerScheda(correzioni) {
  const r = righeTalentiDiPrima(correzioni)[0];
  if (!r) return null;
  return { liberi: Array.isArray(r.talentiPrima) ? r.talentiPrima : null, classe: Array.isArray(r.talentiClassePrima) ? r.talentiClassePrima : [], ricostruita: !!r.ricostruita, testo: r.etichetta ?? '' };
}

