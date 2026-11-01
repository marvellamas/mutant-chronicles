// Progetti seguiti dal Direttore (01/11/2026, lotto 157): la CyberArma di Dimitri a Paradise, Armamenti 0.74 §7.25.4 e
// scheda «CyberArma Opzioni per Dimitri» 1.0. Funzioni pure.
//
// Il modello del progetto sta nel catalogo (`progetti` sulla voce dell'arma: giorni, prove, ore, risorse, esiti del
// Manuale della Magia §24, forme ammesse). Lo stato di un progetto di un personaggio sta nel suo file, fra i blocchi
// del Direttore (`progetti_master`, in memoria `scelte.progettiMaster`), accanto al registro «Modifiche del master»:
//   { id, modello, rif, nome, aperto: { quando, da }, forma: null | { id, quando, da },
//     giorni: [{ n, tentativi: [{ esito, quando, nota }] }], chiuso: null | { esito, quando, nota },
//     consegna: null | { quando, da, uid, scheggia?, donatore? } }
//
// Chi fa che cosa (A.231 aperta, principio «l'ultima parola è del master»):
//  - il Direttore apre il progetto, segna gli esiti dei giorni (anche Fallimento e Maldestro), lo chiude (riuscito,
//    parziale, fallito) e **consegna** l'arma: è l'unico modo in cui l'arma entra nell'inventario, con chi e quando;
//  - il giocatore sceglie la forma, prima della lavorazione (come per i Talenti); un tablet non può fare altro qui
//    (src/correzioni-master.js → proteggiBlocchiMaster con formaDaTablet e vociConsegnaDaTablet).
// L'app avvisa, non blocca, quando il Direttore procede (forma non scelta, progetto non riuscito, budget superato).

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const testo = (v) => (typeof v === 'string' ? v.trim() : '');

export const ESITI_TENTATIVO = ['magistrale', 'successo', 'fallimento', 'maldestro'];
export const NOMI_ESITO = { magistrale: 'Successo Magistrale', successo: 'Successo', fallimento: 'Fallimento', maldestro: 'Fallimento Maldestro' };
export const ESITI_FINALI = ['riuscito', 'parziale', 'fallito'];
export const NOMI_FINALE = { riuscito: 'Riuscito', parziale: 'Riuscito in parte', fallito: 'Fallito' };
const riuscito = (e) => e === 'magistrale' || e === 'successo';

/** I modelli di progetto del catalogo: [{ ...modello, rif }] (voci con `progetti`). */
export function modelliProgetto(dati) {
  const out = [];
  for (const [file, f] of Object.entries(dati?.equipaggiamento?.file ?? {})) {
    for (const o of f?.oggetti ?? []) for (const p of o.progetti ?? []) out.push({ ...p, rif: `${file}:${o.id}`, arma: o });
  }
  return out;
}

/** Il modello di un progetto aperto, o null se il catalogo non lo ha più. */
export const modelloDi = (p, dati) => modelliProgetto(dati).find((m) => m.id === p?.modello) ?? null;

/** Le forme proponibili del progetto, dall'elenco delle manifestazioni dell'arma: [{ id, nome, mani, portata_q, … }]. */
export function formeDi(m) {
  const elenco = m?.arma?.manifestazioni?.elenco ?? [];
  const ammesse = new Set(m?.forma?.elenco ?? elenco.map((f) => f.id));
  return elenco.filter((f) => ammesse.has(f.id));
}

/** Normalizza l'elenco salvato (file del personaggio): solo progetti ben formati. */
export function normalizzaProgetti(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((p) => isOggetto(p) && testo(p.id) && testo(p.modello)).map((p) => ({
    id: p.id, modello: p.modello, rif: testo(p.rif) || null, nome: testo(p.nome) || p.modello,
    aperto: isOggetto(p.aperto) ? { quando: testo(p.aperto.quando), da: testo(p.aperto.da) || 'Direttore' } : { quando: '', da: 'Direttore' },
    forma: isOggetto(p.forma) && testo(p.forma.id) ? { id: p.forma.id, quando: testo(p.forma.quando), da: testo(p.forma.da) || 'giocatore' } : null,
    giorni: (Array.isArray(p.giorni) ? p.giorni : []).filter((g) => Number.isInteger(g?.n)).map((g) => ({
      n: g.n, tentativi: (Array.isArray(g.tentativi) ? g.tentativi : []).filter((t) => ESITI_TENTATIVO.includes(t?.esito)).map((t) => ({ esito: t.esito, quando: testo(t.quando), ...(testo(t.nota) ? { nota: testo(t.nota) } : {}) })),
    })),
    chiuso: isOggetto(p.chiuso) && ESITI_FINALI.includes(p.chiuso.esito) ? { esito: p.chiuso.esito, quando: testo(p.chiuso.quando), ...(testo(p.chiuso.nota) ? { nota: testo(p.chiuso.nota) } : {}) } : null,
    consegna: isOggetto(p.consegna) && testo(p.consegna.quando) && testo(p.consegna.uid) ? { ...p.consegna } : null,
  }));
}

/** Il Direttore apre un progetto dal modello. Nessun oggetto entra nell'inventario. */
export function apriProgetto(lista, modelloId, dati, { quando, da = 'Direttore' } = {}) {
  const m = modelliProgetto(dati).find((x) => x.id === modelloId);
  if (!m) return { errore: `modello di progetto «${modelloId}» non nel catalogo` };
  const n = (lista ?? []).filter((p) => p.modello === modelloId).length + 1;
  const p = { id: `${modelloId}-${n}`, modello: m.id, rif: m.rif, nome: m.nome, aperto: { quando, da }, forma: null, giorni: m.giorni.map((g) => ({ n: g.n, tentativi: [] })), chiuso: null, consegna: null };
  return { lista: [...(lista ?? []), p], progetto: p };
}

const cambia = (lista, id, f) => {
  const p = (lista ?? []).find((x) => x.id === id);
  if (!p) return { errore: 'progetto non trovato' };
  const r = f(p);
  if (r.errore) return r;
  return { lista: lista.map((x) => (x.id === id ? r.progetto : x)), progetto: r.progetto };
};

/** La forma si può ancora scegliere? Prima della lavorazione: nessun esito segnato, progetto aperto. */
export function formaSceglibile(p) {
  if (!p || p.chiuso || p.consegna) return { si: false, motivo: 'il progetto è chiuso' };
  if (p.giorni.some((g) => g.tentativi.length)) return { si: false, motivo: 'la lavorazione è cominciata: la forma è fissata (per cambiarla serve un nuovo intervento sul dispositivo)' };
  return { si: true, motivo: null };
}

/** Il giocatore (o il Direttore) sceglie la forma, prima della lavorazione. */
export function scegliForma(lista, id, formaId, dati, { quando, da = 'giocatore' } = {}) {
  return cambia(lista, id, (p) => {
    const ok = formaSceglibile(p);
    if (!ok.si) return { errore: ok.motivo };
    if (!formeDi(modelloDi(p, dati)).some((f) => f.id === formaId)) return { errore: `forma «${formaId}» non prevista dal progetto` };
    return { progetto: { ...p, forma: { id: formaId, quando, da } } };
  });
}

/** Il Direttore segna l'esito di un tentativo del giorno n (anche Fallimento e Fallimento Maldestro). */
export function registraTentativo(lista, id, n, esito, { quando, nota = '' } = {}) {
  return cambia(lista, id, (p) => {
    if (p.chiuso) return { errore: 'il progetto è chiuso' };
    if (!ESITI_TENTATIVO.includes(esito)) return { errore: `esito «${esito}» non previsto` };
    const g = p.giorni.find((x) => x.n === n);
    if (!g) return { errore: `giorno ${n} non previsto` };
    const t = { esito, quando, ...(testo(nota) ? { nota: testo(nota) } : {}) };
    return { progetto: { ...p, giorni: p.giorni.map((x) => (x.n === n ? { ...x, tentativi: [...x.tentativi, t] } : x)) } };
  });
}

/** Il Direttore toglie l'ultimo tentativo segnato di un giorno (errore di battitura). */
export function togliUltimoTentativo(lista, id, n) {
  return cambia(lista, id, (p) => {
    if (p.chiuso) return { errore: 'il progetto è chiuso' };
    return { progetto: { ...p, giorni: p.giorni.map((x) => (x.n === n ? { ...x, tentativi: x.tentativi.slice(0, -1) } : x)) } };
  });
}

/** Il Direttore chiude il progetto: riuscito, riuscito in parte o fallito, con una nota. Non consegna niente. */
export function chiudiProgetto(lista, id, esito, { quando, nota = '' } = {}) {
  return cambia(lista, id, (p) => {
    if (!ESITI_FINALI.includes(esito)) return { errore: `esito finale «${esito}» non previsto` };
    if (p.consegna) return { errore: 'l’arma è già stata consegnata' };
    return { progetto: { ...p, chiuso: { esito, quando, ...(testo(nota) ? { nota: testo(nota) } : {}) } } };
  });
}

/** Il Direttore riapre un progetto chiuso e non consegnato (per correggere). */
export function riapriProgetto(lista, id) {
  return cambia(lista, id, (p) => (p.consegna ? { errore: 'l’arma è già stata consegnata' } : { progetto: { ...p, chiuso: null } }));
}

/**
 * Stato del progetto per la scheda: i giorni con lavoro, prova, risorse ed esiti; ore e risorse stimate secondo il §24
 * (dopo un Fallimento metà del tempo; dopo un Maldestro il tempo intero; le risorse come scritto nel modello).
 */
export function riepilogoProgetto(p, dati) {
  const m = modelloDi(p, dati);
  if (!m) return null;
  let ore = 0;
  let cr = 0;
  const giorni = m.giorni.map((gm) => {
    const g = p.giorni.find((x) => x.n === gm.n) ?? { tentativi: [] };
    let precedente = null;
    for (const t of g.tentativi) {
      const intero = precedente === null || precedente === 'maldestro';
      ore += intero ? gm.ore : gm.ore / 2;
      // §24.3 progetto: tutte le risorse a ogni tentativo; §24.4 lavorazione: dopo un Fallimento il 25% dei materiali
      cr += precedente === 'fallimento' && gm.esiti === 'lavorazione' ? gm.risorse_cr / 4 : gm.risorse_cr;
      precedente = t.esito;
    }
    const ultimo = g.tentativi.at(-1)?.esito ?? null;
    const stato = ultimo === null ? 'da fare' : riuscito(ultimo) ? 'riuscito' : 'da ripetere';
    return { ...gm, tentativi: g.tentativi, stato, testoEsiti: m.esiti?.[gm.esiti] ?? {} };
  });
  const tuttiRiusciti = giorni.every((g) => g.stato === 'riuscito');
  const avvisi = [];
  if (ore > (m.budget?.ore ?? Infinity)) avvisi.push(`le ore stimate (${ore}) superano il tempo disponibile (${m.budget.ore}): i nuovi tentativi devono rientrare nel tempo e nelle risorse`);
  if (cr > (m.budget?.cr ?? Infinity)) avvisi.push(`le risorse stimate (${cr} cr) superano quelle previste (${m.budget.cr} cr)`);
  return { modello: m, forme: formeDi(m), forma: formeDi(m).find((f) => f.id === p.forma?.id) ?? null, giorni, ore, cr, tuttiRiusciti, avvisi };
}

/**
 * Motivi per cui consegnare l'arma va confermato (avvisi, non blocchi): forma non scelta, giorni non riusciti, progetto
 * non chiuso come riuscito. [] se è tutto in ordine.
 */
export function avvisiConsegna(p, dati) {
  const r = riepilogoProgetto(p, dati);
  const out = [];
  if (!p.forma) out.push('la forma non è stata scelta: si consegna con la forma del progetto base');
  if (r && !r.tuttiRiusciti) out.push('non tutti i giorni hanno un esito riuscito');
  if (!p.chiuso) out.push('il progetto non è chiuso');
  else if (p.chiuso.esito !== 'riuscito') out.push(`il progetto è chiuso come «${NOMI_FINALE[p.chiuso.esito]}»`);
  return out;
}

/**
 * **L'unico modo in cui l'arma del progetto entra nell'inventario**: un atto esplicito del Direttore. Senza `master: true`
 * non fa niente. Aggiunge la voce dell'esemplare (forma scelta, modulatore neurale, focalizzatore, provenienza scritta
 * dal Direttore, `consegna` con chi e quando), toglie il SIN alla spada donatrice (§7.25.4) e, se indicata, toglie la
 * scheggia diventata componente. Scrive la consegna nel progetto.
 * @param creazione le scelte del personaggio @param opz { quando, master, donatore?, scheggia?, provenienza?, uid }
 * @returns {{ creazione, voce } | { errore }}
 */
export function consegnaArma(creazione, id, dati, { quando, master = false, donatore = null, scheggia = null, provenienza = '', uid } = {}) {
  if (master !== true) return { errore: 'solo il Direttore consegna l’arma del progetto' };
  const lista = creazione.progettiMaster ?? [];
  const p = lista.find((x) => x.id === id);
  if (!p) return { errore: 'progetto non trovato' };
  if (p.consegna) return { errore: 'l’arma è già stata consegnata' };
  const m = modelloDi(p, dati);
  if (!m) return { errore: 'modello di progetto non nel catalogo' };
  const forma = p.forma?.id ?? m.arma?.manifestazioni?.progetto ?? null;
  const voce = {
    uid, rif: m.risultato?.rif ?? m.rif, stato: 'trasportato', quantita: 1, note: '',
    ...(forma ? { manifestazione: forma } : {}),
    ...(m.risultato?.voce?.modulatore_neurale ? { modulatore_neurale: true } : {}),
    esemplare: {
      progetto: m.nome,
      ...(m.risultato?.voce?.focalizzatore ? { focalizzatore: m.risultato.voce.focalizzatore } : {}),
      ...(m.risultato?.voce?.configurazione ? { configurazione: m.risultato.voce.configurazione } : {}),
      ...(testo(provenienza) ? { provenienza: testo(provenienza) } : {}),
    },
    consegna: { quando, da: 'Direttore', progetto: p.id },
  };
  const eq = (creazione.equipaggiamento ?? [])
    .filter((v) => !(scheggia && v.uid === scheggia))
    .map((v) => (donatore && v.uid === donatore ? { ...v, sin_rimosso: { quando, progetto: p.id } } : v));
  const nomeDi = (u) => (creazione.equipaggiamento ?? []).find((v) => v.uid === u)?.rif ?? null;
  const consegna = { quando, da: 'Direttore', uid, ...(scheggia ? { scheggia: { uid: scheggia, rif: nomeDi(scheggia) } } : {}), ...(donatore ? { donatore: { uid: donatore, rif: nomeDi(donatore) } } : {}) };
  return {
    voce,
    creazione: { ...creazione, equipaggiamento: [...eq, voce], progettiMaster: lista.map((x) => (x.id === id ? { ...x, consegna } : x)) },
  };
}

// ---------------------------------------------------------------------------
// Tablet: che cosa può scrivere chi non è sul PC del Direttore

/**
 * Nei progetti un tablet può cambiare solo la forma, e solo quando è ancora sceglibile sul disco. Torna i progetti del
 * disco con le forme ammesse del tablet. (Liste nel formato del file: `progetti_master`.)
 */
export function formaDaTablet(nuovi, disco) {
  const daTablet = new Map((Array.isArray(nuovi) ? nuovi : []).map((p) => [p?.id, p]));
  return (Array.isArray(disco) ? disco : []).map((p) => {
    const t = daTablet.get(p.id);
    if (!t || !isOggetto(t.forma) || JSON.stringify(t.forma) === JSON.stringify(p.forma ?? null)) return p;
    return formaSceglibile(normalizzaProgetti([p])[0]).si ? { ...p, forma: { id: t.forma.id, quando: testo(t.forma.quando), da: 'giocatore' } } : p;
  });
}

/**
 * Le voci consegnate dal Direttore (`consegna`) che un tablet aggiunge o cambia rispetto al disco: non passano. Così l'arma
 * del progetto non entra nell'inventario da un tablet, nemmeno copiando la voce. Torna l'equipaggiamento ripulito.
 */
export function vociConsegnaDaTablet(nuovoEq, discoEq) {
  const suDisco = new Map((Array.isArray(discoEq) ? discoEq : []).filter((v) => isOggetto(v?.consegna)).map((v) => [v.uid, v]));
  return (Array.isArray(nuovoEq) ? nuovoEq : []).filter((v) => !isOggetto(v?.consegna) || JSON.stringify(suDisco.get(v.uid)?.consegna) === JSON.stringify(v.consegna));
}
