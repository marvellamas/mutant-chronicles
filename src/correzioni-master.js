// «Modifica master» (12/10/2026, richiesta di Davide e Marcello): il Direttore di Gioco può cambiare qualsiasi valore
// di un PG, con registro e annulla. Principio: l'app aiuta il master e non lo blocca; ogni intervento resta tracciato e
// si può annullare.
//
// La scheda ricalcola i valori dalle scelte: scrivere sopra un numero non basterebbe (sparirebbe al ricalcolo). Le
// correzioni stanno quindi in un elenco a parte (nel file: `correzioni_master`; in memoria: scelte.correzioniMaster) e
// il motore le applica dopo il calcolo da regole del valore toccato (src/avanzamento.js → schedaARiposo, src/umanita.js,
// src/protezione.js): sopravvivono a ricalcoli, salite di livello e correzioni dei livelli passati (A.107), e ciò che
// deriva dal valore corretto (armi, Parata, valori al tavolo) lo segue. Nel «Calcolo» del valore compare la riga
// «Correzione del master +10 (motivo)».
//
// Una riga del registro: { id, quando, chiave, etichetta, tipo, numero?, motivo, stato: 'attiva' | 'annullata',
//   annullataIl?, prima?, dopo?, campo?, uid?, voce?, copia? }
//   tipo 'aggiungi'  → valore calcolato + numero (anche negativo)
//   tipo 'imposta'   → il valore diventa numero, qualunque sia il calcolo
//   tipo 'diretta'   → valore già «a mano» (Crediti, Punti Eroe, Ferite, quantità…) cambiato dal master: prima → dopo
//   tipo 'scelta'    → scelte del personaggio cambiate (creazione o un livello): `copia` è il file salvato prima
//   tipo 'gratis'    → oggetto dato dal DdG in «Compra», senza scalare i crediti
//   tipo 'circostanza' → bonus o malus di circostanza mandato dal Tavolo
// Tutte funzioni pure: l'interfaccia è in src/ui/master.js, src/ui/tab.js e src/ui/tavolo.js.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const segno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export const TIPI_CALCOLO = ['aggiungi', 'imposta'];
export const TIPI = [...TIPI_CALCOLO, 'diretta', 'scelta', 'gratis', 'circostanza'];
export const FONTE = 'Correzione del master';

/** L'elenco pulito: solo righe ben formate, nell'ordine in cui sono state fatte. */
export function normalizzaCorrezioni(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((x) => isOggetto(x) && typeof x.id === 'string' && typeof x.chiave === 'string' && TIPI.includes(x.tipo))
    .map((x) => ({ ...x, stato: x.stato === 'annullata' ? 'annullata' : 'attiva', motivo: typeof x.motivo === 'string' ? x.motivo.slice(0, 200) : '' }));
}

/** Le correzioni di calcolo attive su un valore (chiave: «pv», «car:FOR», «abilita:Atletica»…), in ordine. */
export function correzioniDi(lista, chiave) {
  return normalizzaCorrezioni(lista).filter((x) => x.chiave === chiave && x.stato === 'attiva' && TIPI_CALCOLO.includes(x.tipo) && Number.isFinite(x.numero));
}

/**
 * Applica le correzioni attive a un valore calcolato.
 * @param calcolato valore da regole (null: non calcolabile, resta null)
 * @param opz { minimo, massimo }: limiti del valore (per esempio la tabella delle Caratteristiche)
 * @returns {{ calcolato, valore, delta, righe: [{ fonte, valore, nota }] }} righe per la provenienza: una per correzione,
 *   con il contributo effettivo («Imposta a 12» su un 10 vale +2)
 */
export function applicaCorrezioni(calcolato, lista, chiave, { minimo = -Infinity, massimo = Infinity } = {}) {
  const sue = correzioniDi(lista, chiave);
  if (calcolato === null || calcolato === undefined || !sue.length) return { calcolato, valore: calcolato, delta: 0, righe: [] };
  let v = calcolato;
  const righe = [];
  for (const x of sue) {
    const dopo = Math.min(massimo, Math.max(minimo, x.tipo === 'imposta' ? x.numero : v + x.numero));
    const nota = [x.tipo === 'imposta' ? `impostato a ${x.numero}` : null, x.motivo || null].filter(Boolean).join(': ') || 'senza motivo';
    righe.push({ fonte: FONTE, valore: dopo - v, nota, categoria: 'master' });
    v = dopo;
  }
  return { calcolato, valore: v, delta: v - calcolato, righe };
}

let contatore = 0;
/** Identificativo di una riga: data e un progressivo (unico anche nello stesso millisecondo). */
export const nuovoId = (adesso = new Date()) => `cm-${adesso.getTime().toString(36)}-${(contatore++).toString(36)}`;

/** Una riga nuova del registro. */
export function nuovaCorrezione({ chiave, etichetta, tipo, numero = null, motivo = '', ...altro }, adesso = new Date()) {
  if (!TIPI.includes(tipo)) throw new Error(`Tipo di modifica sconosciuto: ${tipo}`);
  if (TIPI_CALCOLO.includes(tipo) && !Number.isFinite(numero)) throw new Error('Serve un numero.');
  return { id: nuovoId(adesso), quando: adesso.toISOString(), chiave, etichetta: etichetta ?? chiave, tipo, ...(Number.isFinite(numero) ? { numero } : {}), motivo: String(motivo ?? '').trim().slice(0, 200), stato: 'attiva', ...altro };
}

/** Aggiunge una riga in coda. */
export const aggiungiCorrezione = (lista, riga) => [...normalizzaCorrezioni(lista), riga];

/**
 * Annulla una riga: non la cancella, la segna «annullata il …» e il motore smette di contarla.
 * @returns la lista nuova (la stessa se la riga non c'è o è già annullata)
 */
export function annullaCorrezione(lista, id, adesso = new Date()) {
  return normalizzaCorrezioni(lista).map((x) => (x.id === id && x.stato === 'attiva' ? { ...x, stato: 'annullata', annullataIl: adesso.toISOString() } : x));
}

/** Le righe attive fatte dopo quella indicata: se ce ne sono, annullare chiede conferma («Procedi comunque»). */
export function successive(lista, id) {
  const l = normalizzaCorrezioni(lista);
  const i = l.findIndex((x) => x.id === id);
  return i < 0 ? [] : l.slice(i + 1).filter((x) => x.stato === 'attiva');
}

/**
 * Avviso prima di annullare: per una modifica di scelta, o diretta, con altre modifiche fatte dopo. null se si può
 * annullare senza conferma. Le correzioni di calcolo sono indipendenti: si annullano sempre senza avviso.
 */
export function avvisoAnnulla(lista, id) {
  const x = normalizzaCorrezioni(lista).find((y) => y.id === id);
  if (!x || x.stato !== 'attiva' || TIPI_CALCOLO.includes(x.tipo)) return null;
  const dopo = successive(lista, id).filter((y) => (x.tipo === 'scelta' ? true : y.chiave === x.chiave));
  if (!dopo.length) return null;
  return `Dopo questa modifica ce ne sono altre ${dopo.length === 1 ? '(una)' : `(${dopo.length})`}: ${dopo.slice(0, 3).map((y) => y.etichetta).join('; ')}${dopo.length > 3 ? '…' : ''}. ${x.tipo === 'scelta' ? 'Annullando si rimettono le scelte di prima: le modifiche fatte dopo alle scelte si perdono.' : 'Annullando si rimette il valore di prima.'}`;
}

/** «Punti Vita massimi: +10» / «Forza: impostata a 12» / «Crediti: 120 → 620»: che cosa dice la riga. */
export function testoCorrezione(x) {
  if (x.tipo === 'aggiungi') return `${x.etichetta}: ${segno(x.numero)}`;
  if (x.tipo === 'imposta') return `${x.etichetta}: impostato a ${x.numero}`;
  if (x.tipo === 'diretta') return `${x.etichetta}: ${x.prima ?? '—'} → ${x.dopo ?? '—'}`;
  return x.etichetta;
}

/** Una riga del registro per la tab Identità: { id, quando, cosa, motivo, annullata, annullataIl }. */
export function rigaRegistro(x) {
  return { id: x.id, quando: x.quando, cosa: testoCorrezione(x), motivo: x.motivo || null, tipo: x.tipo, annullata: x.stato === 'annullata', annullataIl: x.annullataIl ?? null };
}

/** Il registro da mostrare: la più recente in cima. */
export const registro = (lista) => normalizzaCorrezioni(lista).map(rigaRegistro).reverse();

// ---------------------------------------------------------------------------
// Valori già «a mano» (sessione, quantità): il master li cambia direttamente, la modifica entra nel registro

const CAMPI_SESSIONE = {
  pvAttuali: 'Punti Vita attuali', pmAttuali: 'Punti Magia attuali', puntiEroe: 'Punti Eroe', distintivi: 'Distintivi', crediti: 'Crediti',
  ferite: 'Ferite', affaticamento: 'Affaticamento', corruzione: 'Corruzione',
};

/**
 * Che cosa è cambiato fra due sessioni, per il registro: i valori numerici «a mano» e gli Stati.
 * @param nomi { ferite: (n) => nome, affaticamento, corruzione, stato: (id) => nome }: per scrivere «Nessuna → Superficiale»
 * @returns [{ chiave, campo, etichetta, prima, dopo, valorePrima, valoreDopo }]
 */
export function differenzeDirette(prima, dopo, nomi = {}) {
  const out = [];
  if (!isOggetto(prima) || !isOggetto(dopo)) return out;
  for (const [campo, etichetta] of Object.entries(CAMPI_SESSIONE)) {
    const a = prima[campo] ?? null;
    const b = dopo[campo] ?? null;
    if (a === b) continue;
    const testo = (v) => (v === null ? '—' : nomi[campo] ? nomi[campo](v) : String(v));
    out.push({ chiave: `sessione:${campo}`, campo, etichetta, prima: testo(a), dopo: testo(b), valorePrima: a, valoreDopo: b });
  }
  const sa = [...(prima.statiAttivi ?? [])].sort();
  const sb = [...(dopo.statiAttivi ?? [])].sort();
  if (JSON.stringify(sa) !== JSON.stringify(sb)) {
    const nome = nomi.stato ?? ((id) => id);
    out.push({ chiave: 'sessione:statiAttivi', campo: 'statiAttivi', etichetta: 'Stati', prima: sa.map(nome).join(', ') || 'nessuno', dopo: sb.map(nome).join(', ') || 'nessuno', valorePrima: sa, valoreDopo: sb });
  }
  return out;
}

/** Differenze nell'equipaggiamento: quantità cambiate, oggetti aggiunti o tolti. `nomeDi(voce)` dà il nome dell'oggetto. */
export function differenzeOggetti(prima, dopo, nomeDi = (v) => v?.personalizzato?.nome ?? v?.rif ?? 'oggetto') {
  const a = new Map((prima ?? []).map((v) => [v.uid, v]));
  const b = new Map((dopo ?? []).map((v) => [v.uid, v]));
  const out = [];
  for (const [uid, v] of b) {
    const w = a.get(uid);
    if (!w) out.push({ chiave: `oggetto:${uid}`, uid, etichetta: `${nomeDi(v)}: aggiunto all’Inventario`, prima: 'assente', dopo: `×${v.quantita ?? 1}`, azione: 'aggiunto', voce: v });
    else if ((w.quantita ?? 1) !== (v.quantita ?? 1)) out.push({ chiave: `oggetto:${uid}:quantita`, uid, etichetta: `${nomeDi(v)}: quantità`, prima: String(w.quantita ?? 1), dopo: String(v.quantita ?? 1), azione: 'quantita', valorePrima: w.quantita ?? 1, valoreDopo: v.quantita ?? 1 });
  }
  for (const [uid, w] of a) if (!b.has(uid)) out.push({ chiave: `oggetto:${uid}`, uid, etichetta: `${nomeDi(w)}: tolto dall’Inventario`, prima: `×${w.quantita ?? 1}`, dopo: 'assente', azione: 'tolto', voce: w });
  return out;
}

/**
 * Registra una modifica diretta. Più tocchi di fila sullo stesso valore (entro `finestraMs`) restano una riga sola:
 * il «prima» del primo tocco, il «dopo» dell'ultimo; se si torna al valore di partenza la riga sparisce.
 */
export function registraDiretta(lista, d, { motivo = '', adesso = new Date(), finestraMs = 60000 } = {}) {
  const l = normalizzaCorrezioni(lista);
  const ultima = l.at(-1);
  if (ultima && ultima.tipo === 'diretta' && ultima.stato === 'attiva' && ultima.chiave === d.chiave && !d.azione && !ultima.azione
    && adesso.getTime() - new Date(ultima.quando).getTime() <= finestraMs) {
    if (JSON.stringify(ultima.valorePrima) === JSON.stringify(d.valoreDopo)) return l.slice(0, -1);
    return [...l.slice(0, -1), { ...ultima, dopo: d.dopo, valoreDopo: d.valoreDopo, quando: adesso.toISOString() }];
  }
  return [...l, nuovaCorrezione({ ...d, tipo: 'diretta', motivo }, adesso)];
}

/**
 * Annullare una modifica diretta: che cosa rimettere. { sessione?: { campo, valore }, oggetto?: { uid, azione, … } }.
 * `attuale` è il valore di adesso: se non è più quello lasciato dal master, `cambiato` è true (serve la conferma).
 */
export function ripristinoDiretta(x, { sessione = null, equipaggiamento = [] } = {}) {
  if (x.tipo !== 'diretta') return null;
  if (x.campo) {
    const attuale = x.campo === 'statiAttivi' ? [...(sessione?.statiAttivi ?? [])].sort() : sessione?.[x.campo] ?? null;
    return { sessione: { campo: x.campo, valore: x.valorePrima }, cambiato: JSON.stringify(attuale) !== JSON.stringify(x.valoreDopo) };
  }
  if (x.uid) {
    const v = equipaggiamento.find((y) => y.uid === x.uid) ?? null;
    if (x.azione === 'quantita') return { oggetto: { uid: x.uid, azione: 'quantita', quantita: x.valorePrima }, cambiato: !v || (v.quantita ?? 1) !== x.valoreDopo };
    if (x.azione === 'aggiunto') return { oggetto: { uid: x.uid, azione: 'togli' }, cambiato: !v };
    if (x.azione === 'tolto') return { oggetto: { uid: x.uid, azione: 'rimetti', voce: x.voce }, cambiato: !!v };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Scelte del personaggio (creazione e livelli): descrizione leggibile della modifica

const NOMI_CAMPI = {
  nome: 'nome', corporazione: 'Corporazione', addestramento: 'Addestramento', classe: 'Classe', caratteristiche: 'Caratteristiche', avanzamento: 'Abilità',
  talentoLibero: 'Talento Libero', incantesimi: 'Incantesimi', equipaggiamento: 'equipaggiamento', dotazione: 'dotazione iniziale', umanita: 'Umanità',
  concetto: 'Background', ritratto: 'ritratto', puntiEroe: 'Punti Eroe iniziali', parametriTalenti: 'parametri dei Talenti', veicoli: 'veicoli',
};
const SOLO_MASTER = ['correzioniMaster', 'circostanzeMaster'];

/**
 * «Livello 2: Talento X → Talento Y» / «Creazione: Caratteristiche, Abilità»: che cosa è cambiato nelle scelte.
 * @param descriviVoce (voce, livello) => string[]: le righe leggibili di un livello (src/avanzamento.js → descriviVoce)
 * @returns string | null (null: nessuna differenza)
 */
export function descriviScelte(prima, dopo, descriviVoce = (v) => [JSON.stringify(v)]) {
  const parti = [];
  const ca = prima?.creazione ?? {};
  const cb = dopo?.creazione ?? {};
  const campi = [...new Set([...Object.keys(ca), ...Object.keys(cb)])].filter((k) => !SOLO_MASTER.includes(k) && JSON.stringify(ca[k] ?? null) !== JSON.stringify(cb[k] ?? null));
  if (campi.length) parti.push(`Creazione: ${campi.map((k) => NOMI_CAMPI[k] ?? k).join(', ')}`);
  const la = prima?.livelli ?? [];
  const lb = dopo?.livelli ?? [];
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (JSON.stringify(la[i] ?? null) === JSON.stringify(lb[i] ?? null)) continue;
    const n = i + 2;
    if (!lb[i]) { parti.push(`Livello ${n}: tolto`); continue; }
    if (!la[i]) { parti.push(`Livello ${n}: aggiunto`); continue; }
    const ra = descriviVoce(la[i], n);
    const rb = descriviVoce(lb[i], n);
    const via = ra.filter((x) => !rb.includes(x));
    const nuove = rb.filter((x) => !ra.includes(x));
    parti.push(`Livello ${n}: ${via.join('; ') || '—'} → ${nuove.join('; ') || '—'}`);
  }
  return parti.length ? parti.join(' · ') : null;
}

/** Le scelte senza i blocchi del master: ciò che una copia salvata rimette («Annulla» di una modifica di scelta). */
export function soloScelte(personaggio) {
  const c = { ...(personaggio?.creazione ?? {}) };
  for (const k of SOLO_MASTER) delete c[k];
  return { creazione: c, livelli: personaggio?.livelli ?? [] };
}

/** Rimette le scelte di una copia, tenendo il registro e i bonus del master di adesso. */
export function ripristinaScelte(attuale, copia) {
  const tieni = Object.fromEntries(SOLO_MASTER.filter((k) => attuale?.creazione?.[k] !== undefined).map((k) => [k, attuale.creazione[k]]));
  return { creazione: { ...soloScelte(copia).creazione, ...tieni }, livelli: copia?.livelli ?? [] };
}

// ---------------------------------------------------------------------------
// Chi è il master, il tasto MUTANT

/**
 * Contesto master: la pagina è aperta sul PC dove gira il server di Mutant (lo dice il server, che guarda l'indirizzo
 * da cui arriva la richiesta: server.mjs → daQuestoPc, lo stesso controllo di «Spegni Mutant»). I tablet dei giocatori,
 * che arrivano dalla rete, non lo sono mai; senza server (l'app aperta da file o da GitHub Pages) non c'è master.
 */
export const contestoMaster = ({ server = false, daQuestoPc = false } = {}) => !!server && !!daQuestoPc;

/** La scheda è in «Modalità master»? Solo in contesto master e solo se il Tavolo l'ha aperta con «Modifica master». */
export const modalitaMaster = ({ server = false, daQuestoPc = false, aperta = null, id = null } = {}) => contestoMaster({ server, daQuestoPc }) && !!id && aperta === id;

/**
 * Il tasto MUTANT (S1) porta all'elenco dei personaggi e al Tavolo: con il server si vede solo in contesto master, sui
 * tablet dei giocatori no. Senza server resta, com'è sempre stato (ognuno ha i suoi personaggi nel browser).
 */
export const mostraMarchio = ({ server = false, daQuestoPc = false } = {}) => !server || !!daQuestoPc;

// ---------------------------------------------------------------------------
// Bonus di circostanza mandati dal master (S11)

/** L'elenco pulito dei bonus del master: [{ id, valore, categorie, nota, scontro: id | null, quando }]. */
export function normalizzaCircostanzeMaster(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter((x) => isOggetto(x) && typeof x.id === 'string' && Number.isInteger(x.valore) && x.valore !== 0 && Array.isArray(x.categorie))
    .map((x) => ({ id: x.id, valore: x.valore, categorie: x.categorie.filter((c) => typeof c === 'string'), nota: typeof x.nota === 'string' ? x.nota.slice(0, 120) : '', scontro: typeof x.scontro === 'string' && x.scontro ? x.scontro : null, quando: x.quando ?? null }));
}

/** Un bonus nuovo del master. `scontro`: l'id dello scontro se vale «solo per questo scontro», altrimenti null. */
export function nuovaCircostanzaMaster({ valore, categorie, nota = '', scontro = null }, adesso = new Date()) {
  return { id: `m-${nuovoId(adesso).slice(3)}`, valore, categorie: [...categorie], nota: String(nota ?? '').trim().slice(0, 120), scontro: scontro || null, quando: adesso.toISOString() };
}

/**
 * I bonus del master che valgono adesso. Quelli «solo per questo scontro» cadono quando lo scontro finisce: se si sa
 * qual è lo scontro aperto del PG (`scontroAperto`: id, oppure null se non ce n'è), contano solo quelli del suo scontro;
 * se non si sa (undefined: scheda senza server) restano finché il Tavolo non li toglie.
 */
export function circostanzeMasterAttive(lista, { scontroAperto } = {}) {
  return normalizzaCircostanzeMaster(lista).filter((x) => !x.scontro || scontroAperto === undefined || x.scontro === scontroAperto);
}

/** Toglie i bonus «solo per questo scontro» di uno scontro finito. @returns { lista, tolti } */
export function scadutiAFineScontro(lista, idScontro) {
  const l = normalizzaCircostanzeMaster(lista);
  const restano = l.filter((x) => x.scontro !== idScontro);
  return { lista: restano, tolti: l.length - restano.length };
}

/**
 * La sessione con i bonus del master in coda a quelli del giocatore, per il calcolo dei valori al tavolo: stessa forma
 * delle circostanze (src/circostanze.js), segnati `daMaster` e con la nota «dal master». La sessione salvata non cambia.
 */
export function sessioneConCircostanzeMaster(sessione, lista, opz = {}) {
  const attive = circostanzeMasterAttive(lista, opz);
  if (!attive.length || !isOggetto(sessione)) return sessione;
  return { ...sessione, circostanze: [...(Array.isArray(sessione.circostanze) ? sessione.circostanze : []),
    ...attive.map((x) => ({ id: x.id, valore: x.valore, categorie: x.categorie, nota: x.nota ? `dal master: ${x.nota}` : 'dal master', daMaster: true }))] };
}

// ---------------------------------------------------------------------------
// File del PG e tablet aperti: i blocchi del master non si perdono

export const CHIAVI_FILE = ['correzioni_master', 'circostanze_master'];

/** I blocchi del master di un file esportato (oggetto già letto): { correzioni_master?, circostanze_master? }. */
export function blocchiMaster(file) {
  return Object.fromEntries(CHIAVI_FILE.filter((k) => Array.isArray(file?.[k]) && file[k].length).map((k) => [k, file[k]]));
}

/** I blocchi del master di due file sono diversi? (il master è intervenuto dopo l'ultima lettura del tablet) */
export const masterDiverso = (a, b) => JSON.stringify(blocchiMaster(a)) !== JSON.stringify(blocchiMaster(b));

/**
 * Un salvataggio che non arriva dal PC del master non può cambiare i blocchi del master: nel file che si scrive restano
 * quelli che ci sono già sul disco (un tablet con dati vecchi non li sovrascrive né li cancella).
 * @param nuovo file che il tablet vuole scrivere (oggetto) @param disco file che c'è già (oggetto o null)
 * @returns {{ file, ripristinato: boolean }}
 */
export function proteggiBlocchiMaster(nuovo, disco) {
  const ripristinato = masterDiverso(nuovo, disco ?? {});
  if (!ripristinato) return { file: nuovo, ripristinato: false };
  const file = { ...nuovo };
  for (const k of CHIAVI_FILE) delete file[k];
  return { file: { ...file, ...blocchiMaster(disco ?? {}) }, ripristinato: true };
}

/**
 * Il testo del file di un PG con i blocchi del master cambiati da `fn({ correzioni, circostanze })`, che restituisce i
 * due elenchi nuovi; il resto del file non si tocca. null se non cambia nulla. Lo usa la plancia del Tavolo.
 */
export function testoConBlocchiMaster(testo, fn) {
  const o = JSON.parse(testo);
  const prima = { correzioni: normalizzaCorrezioni(o.correzioni_master), circostanze: normalizzaCircostanzeMaster(o.circostanze_master) };
  const dopo = fn(structuredClone(prima));
  if (!dopo || JSON.stringify(dopo) === JSON.stringify(prima)) return null;
  delete o.correzioni_master;
  delete o.circostanze_master;
  if (dopo.correzioni?.length) o.correzioni_master = dopo.correzioni;
  if (dopo.circostanze?.length) o.circostanze_master = dopo.circostanze;
  return JSON.stringify(o, null, 2);
}

/** Manda un bonus di circostanza a un PG (S11): il bonus fra quelli del master e la riga nel registro. */
export function conCircostanzaMandata(blocchi, { valore, categorie, nota, scontro = null }, adesso = new Date()) {
  const c = nuovaCircostanzaMaster({ valore, categorie, nota, scontro }, adesso);
  const riga = nuovaCorrezione({ chiave: 'circostanza', etichetta: `Bonus di circostanza ${segno(valore)}${nota ? ` (${nota})` : ''}${scontro ? ', solo per lo scontro' : ''}`, tipo: 'circostanza', circostanza: c.id }, adesso);
  return { correzioni: [...blocchi.correzioni, riga], circostanze: [...blocchi.circostanze, c] };
}

/** Toglie un bonus del master (lo toglie il master, o la fine dello scontro): la riga del registro resta, annullata. */
export function senzaCircostanza(blocchi, idCircostanza, adesso = new Date()) {
  return {
    correzioni: blocchi.correzioni.map((x) => (x.tipo === 'circostanza' && x.circostanza === idCircostanza && x.stato === 'attiva' ? { ...x, stato: 'annullata', annullataIl: adesso.toISOString() } : x)),
    circostanze: blocchi.circostanze.filter((x) => x.id !== idCircostanza),
  };
}

/** A «Fine scontro»: via i bonus «solo per questo scontro» (le loro righe restano nel registro, annullate). */
export function senzaCircostanzeDelloScontro(blocchi, idScontro, adesso = new Date()) {
  let b = blocchi;
  for (const x of blocchi.circostanze.filter((y) => y.scontro === idScontro)) b = senzaCircostanza(b, x.id, adesso);
  return b;
}

/**
 * Stato del contesto master, da scrivere sempre nella testata del Tavolo (13/10/2026: prima i pulsanti sparivano in
 * silenzio e Marcello non capiva perché). Dice se questo è il PC del master e, se non lo è, perché.
 * @param opz { server: c'è il server di Mutant; daQuestoPc: il server dice che la pagina è sul suo PC;
 *   pingMaster: che cosa ha risposto /api/ping nel campo «master» (undefined: server acceso prima del 13/10);
 *   serverVecchio: il server gira con il codice di prima dell'aggiornamento (src/versione.js → serverDaRiavviare) }
 * @returns {{ master, stato, testo, motivo, cosaFare }}
 *   stato: 'master' | 'senza_server' | 'server_vecchio' | 'altro_dispositivo'
 */
export function statoContestoMaster({ server = false, daQuestoPc = false, pingMaster = undefined, serverVecchio = false } = {}) {
  if (!server) {
    return { master: false, stato: 'senza_server', testo: NON_MASTER,
      motivo: 'questa è la versione senza server (avvia.bat, GitHub Pages o un server statico): non c’è il Tavolo del Master.',
      cosaFare: 'Apri Mutant con avvia-server.bat sul PC del master (o con Mutant.bat → «Avvia»).' };
  }
  if (daQuestoPc) return { master: true, stato: 'master', testo: 'Questo PC è il master', motivo: null, cosaFare: null };
  if (pingMaster === undefined) {
    return { master: false, stato: 'server_vecchio', testo: NON_MASTER,
      motivo: 'il server di Mutant è acceso da prima dell’aggiornamento e non sa ancora riconoscere il PC del master.',
      cosaFare: 'Chiudi la finestra di avvia-server.bat, riaprila e ricarica questa pagina (Ctrl+F5).' };
  }
  return { master: false, stato: 'altro_dispositivo', testo: NON_MASTER,
    motivo: 'il server non riconosce questo dispositivo come il PC dove gira Mutant (indirizzo diverso dal suo).',
    cosaFare: 'Usa il PC dove gira Mutant: lì va bene sia http://localhost:3000 sia l’indirizzo di rete di quel PC.' };
}

const NON_MASTER = 'Questo dispositivo non è il PC del master: Modifica master e bonus di circostanza si usano dal PC dove gira Mutant';

/** Il testo al posto dei due pulsanti nella carta del PG, quando non si è master. */
export const RIGA_CARTA_NON_MASTER = 'Modifica master: dal PC del master';
