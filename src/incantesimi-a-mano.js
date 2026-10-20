// Incantesimi liberi, aggiunti e tolti a mano (richiesta del 20/10/2026, dal tavolo del 19/10): «questo incantesimo
// l'ho imparato» fuori dall'avanzamento normale — un maestro, un ritrovamento, una concessione del Direttore.
// Funzioni pure. Principio di CLAUDE.md: l'app propone e mostra, non obbliga; il Direttore ha l'ultima parola.
//
// - Stanno in `scelte.incantesimiAMano` (nel file solo se non vuoto): [{ nome, origine, quando, nota? }], con
//   origine «a_mano» (aggiunto a mano) o «direttore» (concesso dal Direttore) e la data (AAAA-MM-GG).
// - Non entrano nelle quote di Classe né negli incantesimi liberi dell'avanzamento (src/avanzamento.js → statoQuote non
//   li conosce) e l'avanzamento non li tocca: le scelte della creazione e gli eventi dei livelli sono un'altra cosa.
// - Un incantesimo di livello base superiore al livello massimo del personaggio (Magia sez. 1) si può aggiungere lo
//   stesso: è un avviso, non un blocco.
// - L'incantesimo aggiunto a mano si lancia come un conosciuto («Lancia!» della tab Poteri); non cambia i conteggi
//   «conosciuti / quota» né il foglio di stampa (src/stampa.js non lo elenca).

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Le origini ammesse e i loro nomi (regole.json → incantesimi_a_mano.origini). */
export const origini = (dati) => dati?.regole?.incantesimi_a_mano?.origini ?? [];
export const nomeOrigine = (id, dati) => origini(dati).find((o) => o.id === id)?.nome ?? id;

const oggi = () => new Date().toISOString().slice(0, 10);

/** «20 ottobre 2026» da AAAA-MM-GG. */
export function dataLeggibile(iso) {
  if (!DATA.test(String(iso ?? ''))) return 'data sconosciuta';
  const [a, m, g] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g)).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Lista ripulita (file, import, caricamento): righe valide, una per incantesimo; gli incantesimi che non sono più nel
 * catalogo si tolgono con un avviso. Senza dati dell'incantesimo la lista si conserva com'è (caricamento parziale).
 */
export function normalizzaIncantesimiAMano(lista, dati, avvisi = []) {
  if (!Array.isArray(lista)) return [];
  const ammesse = new Set(origini(dati).map((o) => o.id));
  const catalogo = dati?.incantesimi?.incantesimi ?? null;
  const viste = new Set();
  const out = [];
  for (const x of lista) {
    if (!isOggetto(x) || typeof x.nome !== 'string' || !x.nome || viste.has(x.nome)) continue;
    if (catalogo && !catalogo.some((i) => i.nome === x.nome)) { avvisi.push(`Incantesimo aggiunto a mano «${x.nome}» non più nel catalogo: rimosso.`); continue; }
    viste.add(x.nome);
    out.push({
      nome: x.nome,
      origine: ammesse.size ? (ammesse.has(x.origine) ? x.origine : 'a_mano') : x.origine ?? 'a_mano',
      quando: DATA.test(String(x.quando ?? '')) ? x.quando : oggi(),
      ...(typeof x.nota === 'string' && x.nota.trim() ? { nota: x.nota.trim().slice(0, 160) } : {}),
    });
  }
  return out;
}

/**
 * Aggiunge un incantesimo del catalogo, scelto per nome. null se non esiste o c'è già fra quelli aggiunti a mano.
 * @param extra { origine, quando?, nota? }
 */
export function aggiungiIncantesimoAMano(lista, nome, extra, dati) {
  if (!(dati?.incantesimi?.incantesimi ?? []).some((i) => i.nome === nome)) return null;
  const attuale = Array.isArray(lista) ? lista : [];
  if (attuale.some((x) => x.nome === nome)) return null;
  const [r] = normalizzaIncantesimiAMano([{ nome, origine: extra?.origine, quando: extra?.quando ?? oggi(), nota: extra?.nota }], dati);
  return r ? [...attuale, r] : null;
}

/** Toglie un incantesimo aggiunto a mano (null se non c'è). */
export function togliIncantesimoAMano(lista, nome) {
  const attuale = Array.isArray(lista) ? lista : [];
  return attuale.some((x) => x.nome === nome) ? attuale.filter((x) => x.nome !== nome) : null;
}

/**
 * Avviso se il livello base dell'incantesimo supera il livello massimo che il personaggio potrebbe conoscere (Magia sez. 1,
 * tabella dei Gradi taumaturgici); senza accesso alla magia, il livello massimo è 0. null se rientra. Non blocca.
 */
export function avvisoLivelloAMano(incantesimo, { livelloMassimo = 0, accesso = false } = {}) {
  if (!incantesimo) return null;
  if (incantesimo.livello_base > livelloMassimo) {
    return accesso
      ? `Livello base ${incantesimo.livello_base}: oltre il livello massimo che il personaggio potrebbe conoscere (${livelloMassimo}, Magia sez. 1). Il Direttore decide.`
      : `Livello base ${incantesimo.livello_base}: il personaggio non ha accesso alla magia (livello massimo ${livelloMassimo}). Il Direttore decide.`;
  }
  return null;
}

/**
 * Gli incantesimi aggiunti a mano con i dati del catalogo e l'avviso di livello:
 * [{ nome, origine, nomeOrigine, quando, nota?, macrofamiglia, specializzazione, livello_base, scheda, avviso }].
 */
export function risolviIncantesimiAMano(lista, { livelloMassimo = 0, accesso = false } = {}, dati) {
  const catalogo = dati?.incantesimi?.incantesimi ?? [];
  return (Array.isArray(lista) ? lista : []).flatMap((x) => {
    const i = catalogo.find((c) => c.nome === x.nome);
    return i ? [{
      nome: x.nome, origine: x.origine, nomeOrigine: nomeOrigine(x.origine, dati), quando: x.quando, ...(x.nota ? { nota: x.nota } : {}),
      macrofamiglia: i.macrofamiglia, specializzazione: i.specializzazione, livello_base: i.livello_base, scheda: i.scheda,
      avviso: avvisoLivelloAMano(i, { livelloMassimo, accesso }),
    }] : [];
  });
}

/** Riga per il registro del personaggio (storico) quando si aggiunge o si toglie, con la data. */
export const rigaRegistro = (azione, x, dati) => (azione === 'aggiunto'
  ? `Incantesimo ${x.nome}: ${nomeOrigine(x.origine, dati)} il ${dataLeggibile(x.quando)}${x.nota ? ` (${x.nota})` : ''}.`
  : `Incantesimo ${x.nome}: tolto (era ${nomeOrigine(x.origine, dati).toLowerCase()} il ${dataLeggibile(x.quando)}).`);
