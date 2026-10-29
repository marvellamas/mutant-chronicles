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
// - A.176 (risposta di Davide del 23/10/2026): ogni incantesimo aggiunto a mano è APPRESO (conta come conosciuto a ogni
//   effetto, fermi restando gli altri requisiti: prerequisiti, creazione di Consumabili, insegnamento) oppure SOLO
//   ANNOTATO (una pergamena trovata, un testo, un Artefatto: non è appreso, non concede accesso alla magia, né Abilità,
//   né PM, e non si lancia). Un appreso senza accesso alla magia resta annotato e non lanciabile. Una concessione
//   speciale del Direttore (campo `concessione`) dice espressamente come si lancia, con quale Abilità, con quali PM e
//   con quali limiti, e rende lanciabile l'incantesimo. Le righe salvate prima della distinzione non hanno `tipo`: sono
//   «da classificare» e restano com'erano (nessuno decide al posto del Direttore).
// - L'incantesimo aggiunto a mano non cambia i conteggi «conosciuti / quota»; sta nell'elenco della tab Poteri e della SS
//   con la sua etichetta.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Le origini ammesse e i loro nomi (regole.json → incantesimi_a_mano.origini). */
export const origini = (dati) => dati?.regole?.incantesimi_a_mano?.origini ?? [];
export const nomeOrigine = (id, dati) => origini(dati).find((o) => o.id === id)?.nome ?? id;

/** I tipi ammessi (regole.json → incantesimi_a_mano.tipi): appreso e annotato. «Da classificare» è l'assenza del tipo. */
export const tipi = (dati) => dati?.regole?.incantesimi_a_mano?.tipi ?? [];
const TIPI_VALIDI = ['appreso', 'annotato'];

/** 'appreso' | 'annotato' | 'da_classificare' (senza tipo: le righe salvate prima di A.176). */
export const tipoDi = (x) => (TIPI_VALIDI.includes(x?.tipo) ? x.tipo : 'da_classificare');

/** Conta come conosciuto a ogni effetto (A.176): solo l'appreso. Il «da classificare» non decide: non conta. */
export const contaComeConosciuto = (x) => tipoDi(x) === 'appreso';

/** «Appreso a mano», «Solo annotato», «Aggiunto, da classificare» (regole.json). */
export function etichettaTipo(x, dati) {
  const t = tipoDi(x);
  return t === 'da_classificare' ? dati?.regole?.incantesimi_a_mano?.da_classificare?.etichetta ?? 'Aggiunto, da classificare'
    : tipi(dati).find((y) => y.id === t)?.etichetta ?? t;
}

/** La frase che spiega che cosa significa il tipo (regole.json). */
export function fraseTipo(x, dati) {
  const t = tipoDi(x);
  return t === 'da_classificare' ? dati?.regole?.incantesimi_a_mano?.da_classificare?.frase ?? ''
    : tipi(dati).find((y) => y.id === t)?.frase ?? '';
}

/** Il segno corto dell'elenco: «(Appreso)», «(Annotato)», «(Aggiunto)» (da classificare). */
export const segnoTipo = (x) => ({ appreso: '(Appreso)', annotato: '(Annotato)', da_classificare: '(Aggiunto)' })[tipoDi(x)];

/**
 * Si può lanciare? (A.176) Annotato: no, salvo concessione speciale del Direttore. Appreso: con le normali regole
 * dell'accesso alla magia; senza accesso resta annotato e non lanciabile, salvo concessione. Da classificare: come
 * prima (il pulsante c'è, con gli avvisi di sempre) finché il Direttore non lo classifica.
 * @returns {{ lanciabile: boolean, motivo: string|null, concessione: string|null }}
 */
export function statoLancioAMano(x, { accesso = false } = {}) {
  const concessione = typeof x?.concessione === 'string' && x.concessione.trim() ? x.concessione.trim() : null;
  const t = tipoDi(x);
  if (concessione) return { lanciabile: true, motivo: null, concessione };
  if (t === 'annotato') return { lanciabile: false, concessione: null, motivo: 'È solo annotato: non è appreso e non concede accesso alla magia, Abilità o PM, quindi non si lancia. Lo può rendere lanciabile il Direttore, indicando come si lancia, con quale Abilità, con quali PM e con quali limiti (A.176).' };
  if (t === 'appreso' && !accesso) return { lanciabile: false, concessione: null, motivo: 'Il personaggio non ha accesso alla magia: l’incantesimo resta annotato e non lanciabile. L’aggiunta non concede accesso, Abilità o PM (A.176).' };
  return { lanciabile: true, motivo: null, concessione: null };
}

/**
 * I nomi degli incantesimi che il personaggio CONOSCE a ogni effetto (A.176): i conosciuti di Classe e dei livelli e gli
 * aggiunti a mano appresi. Gli annotati e quelli da classificare non ci sono. Da usare in ogni punto che chiede
 * «il personaggio conosce questo incantesimo?» (prerequisiti, creazione di Consumabili, insegnamento).
 * @param incantesimi la parte `scheda.incantesimi` ({ conosciuti, aMano })
 */
export function nomiConosciuti(incantesimi) {
  return new Set([...(incantesimi?.conosciuti ?? []), ...(incantesimi?.aMano ?? []).filter(contaComeConosciuto)].map((i) => i.nome ?? i));
}

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
      // A.176: senza tipo (o con un tipo sconosciuto) resta «da classificare»: non si decide al posto del Direttore
      ...(TIPI_VALIDI.includes(x.tipo) ? { tipo: x.tipo } : {}),
      ...(typeof x.concessione === 'string' && x.concessione.trim() ? { concessione: x.concessione.trim().slice(0, dati?.regole?.incantesimi_a_mano?.concessione_max ?? 300) } : {}),
    });
  }
  return out;
}

/** L'incantesimo del catalogo con questo identificativo (mai per nome: un nome parziale o la posizione sbagliano), o null. */
export const incantesimoPerId = (id, dati) => (typeof id === 'string' && id ? (dati?.incantesimi?.incantesimi ?? []).find((i) => i.id === id) ?? null : null);

const normaTesto = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/s+/g, ' ').trim();

/**
 * La ricerca nel catalogo (27/10/2026, lotto 131): le parole scritte devono comparire tutte nel nome (senza badare ad
 * accenti e maiuscole); prima il nome uguale, poi quelli che cominciano così, poi gli altri. Restituisce voci del
 * catalogo con il loro id: chi cerca sceglie una voce, non scrive un nome. Senza testo: nessuna (non si propone la prima).
 */
export function cercaIncantesimi(testo, dati, { max = 12 } = {}) {
  const q = normaTesto(testo);
  if (!q) return [];
  const parole = q.split(' ');
  const rango = (n) => (n === q ? 0 : n.startsWith(q) ? 1 : 2);
  return (dati?.incantesimi?.incantesimi ?? [])
    .map((i) => ({ i, n: normaTesto(i.nome) }))
    .filter(({ n }) => parole.every((p) => n.includes(p)))
    .sort((a, b) => rango(a.n) - rango(b.n) || a.n.localeCompare(b.n, 'it'))
    .slice(0, max)
    .map(({ i }) => i);
}

/**
 * Aggiunge un incantesimo del catalogo, scelto per IDENTIFICATIVO (non per nome). null se non esiste o c'è già fra
 * quelli aggiunti a mano.
 * @param extra { origine, tipo?, quando?, nota?, concessione? }
 */
export function aggiungiIncantesimoAMano(lista, id, extra, dati) {
  const inc = incantesimoPerId(id, dati);
  if (!inc) return null;
  const nome = inc.nome;
  const attuale = Array.isArray(lista) ? lista : [];
  if (attuale.some((x) => x.nome === nome)) return null;
  const [r] = normalizzaIncantesimiAMano([{ nome, origine: extra?.origine, quando: extra?.quando ?? oggi(), nota: extra?.nota, tipo: extra?.tipo, concessione: extra?.concessione }], dati);
  return r ? [...attuale, r] : null;
}

/**
 * Il Direttore classifica un incantesimo aggiunto a mano: appreso o solo annotato, con l'eventuale concessione speciale
 * (A.176). null se non c'è o il tipo non è valido. Senza `concessione` quella che c'è resta; con una stringa vuota si toglie.
 */
export function classificaIncantesimoAMano(lista, nome, tipo, { concessione } = {}, dati = null) {
  if (!TIPI_VALIDI.includes(tipo)) return null;
  const attuale = Array.isArray(lista) ? lista : [];
  if (!attuale.some((x) => x.nome === nome)) return null;
  return normalizzaIncantesimiAMano(attuale.map((x) => {
    if (x.nome !== nome) return x;
    const { concessione: vecchia, ...resto } = x;
    const nuova = concessione === undefined ? vecchia : concessione;
    return { ...resto, tipo, ...(nuova ? { concessione: nuova } : {}) };
  }), dati);
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
      // A.176: tipo, etichetta, frase che lo spiega e se si lancia (con il motivo se no)
      tipo: tipoDi(x), etichetta: etichettaTipo(x, dati), segno: segnoTipo(x), frase: fraseTipo(x, dati),
      ...(x.concessione ? { concessione: x.concessione } : {}),
      lancio: statoLancioAMano(x, { accesso }),
    }] : [];
  });
}

/** Riga per il registro del personaggio (storico) quando si aggiunge o si toglie, con la data. */
export const rigaRegistro = (azione, x, dati) => (azione === 'aggiunto'
  ? `Incantesimo ${x.nome}: ${nomeOrigine(x.origine, dati)} il ${dataLeggibile(x.quando)}, ${etichettaTipo(x, dati).toLowerCase()}${x.nota ? ` (${x.nota})` : ''}.`
  : azione === 'classificato'
    ? `Incantesimo ${x.nome}: classificato come ${etichettaTipo(x, dati).toLowerCase()}${x.concessione ? ` (concessione speciale: ${x.concessione})` : ''}.`
    : `Incantesimo ${x.nome}: tolto (era ${nomeOrigine(x.origine, dati).toLowerCase()} il ${dataLeggibile(x.quando)}).`);
