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
// A.231 (Davide, 02/11/2026): il progetto parte dalla CyberArma originale di Park già nell'inventario. Il Direttore la
// riconduce a quell'esemplare (riconduciEsemplare: «CyberArma Park», frammento Viola, Corruzione 1; la sua presenza non
// certifica che le modifiche siano fatte) e «Consegna l'arma» aggiorna LA STESSA voce, con provenienza e storico: mai una
// seconda CyberArma. Il profilo diventa «CyberArma Dimitri»; il Viola estratto entra come oggetto a parte.
//
// Chi fa che cosa (principio «l'ultima parola è del master»):
//  - il Direttore apre il progetto, segna gli esiti dei giorni (anche Fallimento e Maldestro), lo chiude (riuscito,
//    parziale, fallito) e **consegna** l'arma: è l'unico modo in cui l'arma entra nell'inventario, con chi e quando;
//  - il giocatore sceglie la forma, prima della lavorazione (come per i Talenti); un tablet non può fare altro qui
//    (src/correzioni-master.js → proteggiBlocchiMaster con formaDaTablet e vociConsegnaDaTablet).
// L'app avvisa, non blocca, quando il Direttore procede (forma non scelta, progetto non riuscito, budget superato).

import { famigliaAlimentazione, opzioniAlimentazione, perditeAlimentazione, alimentazioneSceglibile } from './cyberarma.js';

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
    // A.251: l'alimentazione scelta (cristallo, SIN, riserva di CM, conversione a NeC)
    alimentazione: isOggetto(p.alimentazione) && testo(p.alimentazione.id) ? { id: p.alimentazione.id, quando: testo(p.alimentazione.quando), da: testo(p.alimentazione.da) || 'giocatore' } : null,
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
  const p = { id: `${modelloId}-${n}`, modello: m.id, rif: m.rif, nome: m.nome, aperto: { quando, da }, forma: null, alimentazione: null, giorni: m.giorni.map((g) => ({ n: g.n, tentativi: [] })), chiuso: null, consegna: null };
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

/**
 * Il giocatore (o il Direttore) scegle l'alimentazione, prima della lavorazione (A.251, Davide 06/11/2026).
 * Le due conversioni energetiche (riserva interna di CM, conversione a NeC) le autorizza soltanto il Direttore:
 * fanno perdere l'alimentazione con i PM personali e le proprietà da Custode, e la scelta non si torna indietro
 * facilmente. Chi sceglie deve aver letto che cosa si perde: lo dice `perditeAlimentazione`.
 */
export function scegliAlimentazione(lista, id, famigliaId, dati, { quando, da = 'giocatore', master = false } = {}) {
  return cambia(lista, id, (p) => {
    const ok = alimentazioneSceglibile(p);
    if (!ok.si) return { errore: ok.motivo };
    const opz = opzioniAlimentazione(modelloDi(p, dati), dati, { master }).find((o) => o.id === famigliaId);
    if (!opz) return { errore: `alimentazione «${famigliaId}» non prevista dal progetto` };
    if (!opz.sceglibile) return { errore: `${opz.nome}: ${opz.motivo}` };
    return { progetto: { ...p, alimentazione: { id: famigliaId, quando, da } } };
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
  // A.251: le alimentazioni proponibili e quella scelta, con che cosa si perde
  const alimentazioni = opzioniAlimentazione(m, dati, { master: true });
  const alimentazione = alimentazioni.find((o) => o.id === p.alimentazione?.id) ?? null;
  return { modello: m, forme: formeDi(m), forma: formeDi(m).find((f) => f.id === p.forma?.id) ?? null, alimentazioni, alimentazione, giorni, ore, cr, tuttiRiusciti, avvisi };
}

/**
 * Motivi per cui consegnare l'arma va confermato (avvisi, non blocchi): forma non scelta, giorni non riusciti, progetto
 * non chiuso come riuscito. [] se è tutto in ordine.
 */
export function avvisiConsegna(p, dati) {
  const r = riepilogoProgetto(p, dati);
  const out = [];
  if (!p.forma) out.push('la forma non è stata scelta: si consegna con la forma del progetto base');
  // A.251: con una conversione energetica l'arma consegnata non si alimenta più con i PM personali
  const al = p.alimentazione?.id ? perditeAlimentazione(p.alimentazione.id, dati) : null;
  if (al?.conversione) out.push(`alimentazione «${al.nome}»: l’arma consegnata perde ${al.perde.join(' e ')} (A.251)`);
  if (r && !r.tuttiRiusciti) out.push('non tutti i giorni hanno un esito riuscito');
  if (!p.chiuso) out.push('il progetto non è chiuso');
  else if (p.chiuso.esito !== 'riuscito') out.push(`il progetto è chiuso come «${NOMI_FINALE[p.chiuso.esito]}»`);
  return out;
}

/** Le voci dell'inventario della stessa famiglia dell'arma del modello (armi:cyberarma e le sue varianti). */
export function esemplariDi(equipaggiamento, m) {
  const base = m?.esemplare_di_partenza?.rif ?? m?.rif;
  if (!base) return [];
  return (equipaggiamento ?? []).filter((v) => typeof v?.rif === 'string' && (v.rif === base || v.rif.startsWith(`${base}-`)));
}

/** Lo storico di un esemplare (`esemplare.storico`), sempre una lista. */
export const storicoDi = (voce) => (Array.isArray(voce?.esemplare?.storico) ? voce.esemplare.storico : []);

/**
 * A.231: «La voce già presente nell'inventario va verificata e ricondotta a questo esemplare recuperato. La sua presenza
 * non certifica che le modifiche siano già state eseguite.» Solo il Direttore: la voce diventa l'esemplare di partenza del
 * modello (nome, provenienza, focalizzatore, Corruzione), con la prima riga dello storico. Nessuna modifica dell'arma.
 * @returns {{ creazione, voce } | { errore }}
 */
export function riconduciEsemplare(creazione, uid, dati, { quando, master = false, modello = 'paradise-dimitri' } = {}) {
  if (master !== true) return { errore: 'solo il Direttore riconduce l’arma all’esemplare recuperato' };
  const m = modelliProgetto(dati).find((x) => x.id === modello);
  const e = m?.esemplare_di_partenza;
  if (!e) return { errore: 'il modello non ha un esemplare di partenza' };
  const v = (creazione.equipaggiamento ?? []).find((x) => x.uid === uid);
  if (!v || !esemplariDi([v], m).length) return { errore: 'voce non trovata fra le CyberArme dell’inventario' };
  if (testo(v.esemplare?.nome)) return { errore: `è già ricondotta: ${v.esemplare.nome}` };
  const esemplare = {
    ...(isOggetto(v.esemplare) ? v.esemplare : {}),
    nome: e.nome, provenienza: e.provenienza, focalizzatore: e.focalizzatore, corruzione: e.corruzione, ricondotta: quando,
    storico: [...storicoDi(v), { quando, nome: e.nome, cosa: `voce ricondotta all’esemplare recuperato: profilo originale (focalizzatore ${e.focalizzatore}, ${e.corruzione}), nessuna modifica eseguita (A.231)`, da: 'Direttore' }],
  };
  const voce = { ...v, esemplare };
  return { voce, creazione: { ...creazione, equipaggiamento: creazione.equipaggiamento.map((x) => (x.uid === uid ? voce : x)) } };
}

/**
 * **L'unico modo in cui l'arma del progetto diventa disponibile**: un atto esplicito del Direttore. Senza `master: true`
 * non fa niente. Toglie il SIN alla spada donatrice (§7.25.4), toglie la scheggia diventata componente e scrive la
 * consegna nel progetto.
 *  - Modello che lavora su un esemplare esistente (`risultato.aggiorna_esemplare`, A.231): aggiorna LA STESSA voce (forma,
 *    modulatore, focalizzatore, nome attuale, storico; provenienza conservata) e non ne crea un'altra. Quale voce:
 *    `esemplare` (uid) o l'unica CyberArma dell'inventario; con nessuna o con più d'una si ferma e lo dice. Il frammento
 *    Viola estratto entra come oggetto a parte (con l'uid `uid`).
 *  - Altrimenti aggiunge la voce dell'esemplare (forma scelta, modulatore neurale, focalizzatore, provenienza, consegna).
 * @param creazione le scelte del personaggio @param opz { quando, master, donatore?, scheggia?, provenienza?, uid, esemplare? }
 * @returns {{ creazione, voce } | { errore }}
 */
export function consegnaArma(creazione, id, dati, { quando, master = false, donatore = null, scheggia = null, provenienza = '', uid, esemplare = null } = {}) {
  if (master !== true) return { errore: 'solo il Direttore consegna l’arma del progetto' };
  const lista = creazione.progettiMaster ?? [];
  const p = lista.find((x) => x.id === id);
  if (!p) return { errore: 'progetto non trovato' };
  if (p.consegna) return { errore: 'l’arma è già stata consegnata' };
  const m = modelloDi(p, dati);
  if (!m) return { errore: 'modello di progetto non nel catalogo' };
  const forma = p.forma?.id ?? m.arma?.manifestazioni?.progetto ?? null;
  // A.251: l'alimentazione scelta decide quale profilo si consegna. Con una conversione energetica (riserva interna
  // di CM, conversione a NeC) la voce è quella della conversione: senza, l'arma consegnata sarebbe sbagliata.
  const al = alimentazioneConsegnata(p, dati);
  if (m.risultato?.aggiorna_esemplare) return aggiornaEsemplare(creazione, lista, p, m, forma, { quando, donatore, scheggia, provenienza, uid, esemplare, al });
  const voce = {
    uid, rif: al?.rif ?? m.risultato?.rif ?? m.rif, stato: 'trasportato', quantita: 1, note: '',
    ...(forma ? { manifestazione: forma } : {}),
    ...(m.risultato?.voce?.modulatore_neurale ? { modulatore_neurale: true } : {}),
    esemplare: {
      progetto: m.nome,
      ...(m.risultato?.voce?.focalizzatore ? { focalizzatore: m.risultato.voce.focalizzatore } : {}),
      ...(al?.configurazione ? { configurazione: al.configurazione, alimentazione: al.alimentazione } : m.risultato?.voce?.configurazione ? { configurazione: m.risultato.voce.configurazione } : {}),
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

/**
 * A.251: che cosa si consegna secondo l'alimentazione scelta. Con una conversione energetica il profilo è quello
 * della conversione (`voce` della famiglia nei dati) e l'esemplare porta scritto che non si alimenta più con i PM
 * personali e ha perso le proprietà da Custode. Senza scelta, o con cristallo e SIN, resta il profilo del progetto.
 * @returns {{ rif, configurazione, alimentazione } | null}
 */
export function alimentazioneConsegnata(p, dati) {
  const f = p?.alimentazione?.id ? famigliaAlimentazione(p.alimentazione.id, dati) : null;
  if (!f) return null;
  return {
    rif: f.conversione === true ? f.voce ?? null : null,
    configurazione: f.nome,
    alimentazione: { id: f.id, pm_personali: f.pm_personali !== false, proprieta_custode: f.proprieta_custode !== false, ...(f.conversione === true ? { conversione: true } : {}) },
  };
}

/** A.231: la consegna sull'esemplare che c'è già. Vedi consegnaArma. */
function aggiornaEsemplare(creazione, lista, p, m, forma, { quando, donatore, scheggia, provenienza, uid, esemplare, al = null }) {
  const voci = creazione.equipaggiamento ?? [];
  const fam = esemplariDi(voci, m);
  const nome = m.esemplare_di_partenza?.nome ?? 'l’esemplare di partenza';
  let bersaglio = esemplare ? fam.find((v) => v.uid === esemplare) : null;
  if (esemplare && !bersaglio) return { errore: 'la voce scelta non è una CyberArma dell’inventario' };
  if (!bersaglio) {
    if (fam.length > 1) return { errore: `nell’inventario ci sono ${fam.length} CyberArme: scegli quale è ${nome} (A.231: si aggiorna lo stesso esemplare, mai una seconda arma)` };
    if (!fam.length) return { errore: `nell’inventario non c’è la CyberArma da modificare: ${nome} va aggiunta e ricondotta prima della consegna (A.231: il progetto lavora sull’esemplare recuperato)` };
    [bersaglio] = fam;
  }
  const e0 = isOggetto(bersaglio.esemplare) ? bersaglio.esemplare : {};
  const partenza = m.esemplare_di_partenza ?? {};
  const nomePrima = testo(e0.nome) || partenza.nome || null;
  const focPrima = testo(e0.focalizzatore) || partenza.focalizzatore || null;
  const r = m.risultato ?? {};
  const nomeDopo = r.nome ?? nomePrima;
  const formaNome = (m.arma?.manifestazioni?.elenco ?? []).find((f) => f.id === forma)?.nome ?? forma;
  const storico = [...storicoDi(bersaglio)];
  // l'esemplare non ancora ricondotto: la riga del profilo originario c'è comunque, perché la provenienza resti ricostruibile
  if (!storico.length && nomePrima) storico.push({ quando, nome: nomePrima, cosa: `profilo originale dell’esemplare, prima delle modifiche${focPrima ? ` (focalizzatore ${focPrima}${testo(e0.corruzione) || partenza.corruzione ? `, ${testo(e0.corruzione) || partenza.corruzione}` : ''})` : ''}`, da: 'Direttore' });
  const interventi = [
    r.voce?.focalizzatore ? `focalizzatore ${r.voce.focalizzatore}${focPrima && focPrima !== r.voce.focalizzatore ? ` al posto del ${focPrima}` : ''}` : null,
    r.voce?.modulatore_neurale ? 'modulo SIN integrato (modulatore neurale)' : null,
    formaNome ? `forma ${formaNome}` : null,
    // A.251: l'alimentazione, con la perdita quando è una conversione
    al ? `alimentazione ${al.configurazione}${al.alimentazione.conversione ? ' (niente PM personali, niente proprietà da Custode)' : ''}` : null,
  ].filter(Boolean).join(', ');
  storico.push({ quando, nome: nomeDopo, esito: p.chiuso?.esito ? NOMI_FINALE[p.chiuso.esito] : 'progetto non chiuso', cosa: `«${m.nome}»: ${interventi}`, da: 'Direttore', progetto: p.id });
  const prov = testo(provenienza) || testo(e0.provenienza) || partenza.provenienza || '';
  const voce = {
    ...bersaglio,
    ...(al?.rif ? { rif: al.rif } : {}),
    ...(forma ? { manifestazione: forma } : {}),
    ...(r.voce?.modulatore_neurale ? { modulatore_neurale: true } : {}),
    esemplare: {
      ...e0,
      nome: nomeDopo,
      ...(nomePrima && nomePrima !== nomeDopo ? { nome_originale: nomePrima } : {}),
      progetto: m.nome,
      ...(r.voce?.focalizzatore ? { focalizzatore: r.voce.focalizzatore } : {}),
      ...(al?.configurazione ? { configurazione: al.configurazione, alimentazione: al.alimentazione } : r.voce?.configurazione ? { configurazione: r.voce.configurazione } : {}),
      ...(prov ? { provenienza: prov } : {}),
      storico,
    },
    consegna: { quando, da: 'Direttore', progetto: p.id },
  };
  // il frammento Viola estratto: un oggetto a parte, con le sue conseguenze (A.231)
  const viola = m.componenti?.find((c) => c.id === 'viola');
  const corruzione = testo(e0.corruzione) || partenza.corruzione || '';
  const estratto = viola && focPrima === 'Viola' && r.voce?.focalizzatore && r.voce.focalizzatore !== 'Viola' ? {
    uid, rif: viola.rif, stato: null, quantita: 1, note: '', // il frammento non ha stati propri (statoIniziale)
    esemplare: { nome: `Frammento Viola estratto dalla ${nomePrima ?? 'CyberArma'}`, provenienza: `estratto durante «${m.nome}»`, ...(corruzione ? { corruzione } : {}), contenimento: 'conseguenze e contenimento da decidere con il Direttore (A.231)' },
    consegna: { quando, da: 'Direttore', progetto: p.id },
  } : null;
  // la Corruzione era del frammento Viola: esce con lui (resta scritta nello storico, riga del profilo originario)
  if (estratto) delete voce.esemplare.corruzione;
  const eq = voci
    .filter((v) => !(scheggia && v.uid === scheggia))
    .map((v) => (v.uid === bersaglio.uid ? voce : donatore && v.uid === donatore ? { ...v, sin_rimosso: { quando, progetto: p.id } } : v));
  const nomeDi = (u) => voci.find((v) => v.uid === u)?.rif ?? null;
  const consegna = {
    quando, da: 'Direttore', uid: bersaglio.uid, aggiornato: true,
    ...(estratto ? { estratto: { uid: estratto.uid, rif: estratto.rif } } : {}),
    ...(scheggia ? { scheggia: { uid: scheggia, rif: nomeDi(scheggia) } } : {}),
    ...(donatore ? { donatore: { uid: donatore, rif: nomeDi(donatore) } } : {}),
  };
  return {
    voce,
    creazione: { ...creazione, equipaggiamento: [...eq, ...(estratto ? [estratto] : [])], progettiMaster: lista.map((x) => (x.id === p.id ? { ...x, consegna } : x)) },
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
 * del progetto non entra nell'inventario da un tablet, nemmeno copiando la voce. A.231: anche l'esemplare di una voce
 * ricondotta o consegnata (nome, provenienza, storico) e il modulatore li scrive solo il Direttore: se il tablet li cambia,
 * tornano quelli del disco. Torna l'equipaggiamento ripulito.
 */
export function vociConsegnaDaTablet(nuovoEq, discoEq) {
  const disco = new Map((Array.isArray(discoEq) ? discoEq : []).map((v) => [v?.uid, v]));
  const delDirettore = (v) => isOggetto(v?.consegna) || storicoDi(v).length > 0;
  const out = [];
  for (const v of Array.isArray(nuovoEq) ? nuovoEq : []) {
    const d = disco.get(v?.uid);
    if (d && delDirettore(d)) {
      // la voce del Direttore resta com'è nei suoi campi; il resto (stato, mano, sintonizzazione…) è del giocatore
      const x = { ...v };
      for (const k of ['esemplare', 'consegna', 'modulatore_neurale', 'manifestazione']) { if (d[k] === undefined) delete x[k]; else x[k] = d[k]; }
      out.push(x);
    } else if (!delDirettore(v)) out.push(v);
    // una voce nuova (o cambiata dal tablet) con la consegna o lo storico del Direttore non passa
  }
  return out;
}
