// Modalità tavolo (docs/roadmap-equipaggiamento-e-scheda.md, §3): i valori attuali della
// sessione di gioco. Stanno in un blocco `sessione` separato da creazione e livelli e NON si
// ricalcolano: quando un massimo cambia (nuovo livello, tabella modificata) il valore attuale
// viene solo limitato al nuovo massimo, mai riazzerato. Funzioni pure.
//
// sessione = { pvAttuali, pmAttuali, puntiEroe, distintivi, statiAttivi: [id], ferite,
//              affaticamento, munizioni: { uid: { colpi, riserve, parziali, vuoti } }, scorte: { uid: consumate },
//              chroma: { uid: { pmAttuali, iniziale? } } (iniziale: PM impostati per un contenitore trovato, E&L 2),
//              caricoExtra, crediti, creditiIniziali, condizioniOggetti: [uid], attacchi: { uid: scelte },
//              lanci: { incantesimo: scelte }, integrita: { uid: piAttuali }, nec: { chiave: attuale },
//              round, ultimaTecnica, tecnicheAttive, note }
// round, ultimaTecnica, tecnicheAttive: Tecniche Interiori al tavolo (Giocatore §8.9.1, src/tecniche.js):
// contatore dei Round della sessione («Nuovo Round»), l'ultima attivazione { id, round } per il limite
// di una per Round, gli effetti attivi [{ id, dal, al }] con la loro durata (al = ultimo Round, null =
// finché non si termina). «Nuova sessione» li riporta al Round 1, senza Tecniche attive.
// nec: riserva attuale dei NEC (Equipaggiamento 0.5, §5.4; src/equipaggiamento.js → riserveNec): Lx di celle e
// pacchi, ore o usi degli apparecchi che li comprendono; i nuovi partono carichi («I prezzi … comprendono la
// prima carica», §5.4.4); «Nuova sessione» non li ricarica (serve caricatore e fonte, §5.4.6).
// integrita: PI attuali degli oggetti con PI (Armamenti §7.2.1: «si annotano separatamente quelli
// attuali»), entro 0 e i massimi del catalogo; gli oggetti nuovi partono integri (formato 7).
// lanci: le ultime scelte del pannello «Lancia!» per ogni incantesimo (src/ui/lancio.js).
// attacchi: le ultime scelte del pannello «Attacca!» per ogni arma (src/ui/attacco.js), per il
// prossimo tiro con le stesse scelte (anche l'Imbracciatura).
// munizioni: per ogni arma a distanza della lista, i colpi nel caricatore (limitati alla sua
// capacità, dal catalogo), le riserve (caricatori pieni di scorta), i caricatori parziali tolti
// (colpi rimasti) e quelli vuoti. scorte: munizioni sciolte e celle dell'inventario consumate
// ricaricando (la quantità della voce resta la scelta del giocatore). Ricarica: src/ricarica.js.
// chroma: PM attuali di ogni contenitore di Chroma (Magia sez. 6), limitati alla sua capacità. Non
// si ricaricano con «Ricarica» né con «Nuova sessione»: solo convertendo PM (Magia sez. 6, §7.5.1).
// ferite: 0 = nessuna, 1…5 = gli Stati di Ferita di regole.json (§5.14), 6 = oltre Grave.
// affaticamento: indice in regole.json → affaticamento.stati (§5.19), 0 = Riposato.
// corruzione: indice in regole.json → corruzione.stati (§5.20), 0 = Umano; «Nuova sessione» non lo azzera.
// caricoExtra: kg trasportati oltre all'equipaggiamento (bottino, una creatura trasportata con il
// suo equipaggiamento: §5.2.6), sommati al peso degli oggetti per il carico (src/carico.js).
// condizioniOggetti: oggetti con effetti situazionali la cui condizione è accesa al tavolo (corredo
// di sopravvivenza nell'ambiente scelto, abiti eleganti in un ambiente formale…): i loro effetti
// entrano nei VA effettivi (src/condizioni.js, docs/effetti-oggetti.md).
// crediti: crediti attuali (§2.16.28), null finché la dotazione iniziale non è nell'inventario.
// creditiIniziali: l'ultimo saldo iniziale visto; se il saldo cambia (dotazione rifatta, tabella
// modificata) i crediti attuali si spostano della stessa differenza, così le spese restano.
import { normalizzaCircostanze } from './circostanze.js';
import { valoreTiro } from './tiri.js';
import { SENZ_ARMI } from './attacco.js';
import { saldoIniziale } from './dotazioni.js';
import { infoRicarica, eseguiRicarica, perOperazione } from './ricarica.js';
import { caricatori, contenitori, normalizzaEquipaggiamento, catalogo, risolvi, riserveNec, granateDaLancio } from './equipaggiamento.js';
import { oggettiConPi } from './protezione.js';
import { attivaTecnica, nuovoRound, terminaTecnica, allineaTecnicheAttive, tecnicaDi } from './tecniche.js';
import { allineaIncantesimiAttivi } from './durate-incantesimi.js';
import { allineaImpianti } from './impianti.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const limita = (v, min, max) => Math.min(max, Math.max(min, v));
const intero = (v, predefinito) => (Number.isInteger(v) ? v : predefinito);
/** kg ≥ 0 con un decimale; altro → 0. */
const chili = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : 0);

/**
 * Massimi e limiti della sessione per il personaggio attuale.
 * @param scheda risultato di calcolaScheda({ creazione, livelli })
 */
export function massimiSessione(scheda, creazione, dati) {
  const pe = dati.regole.punti_eroe;
  return {
    pv: scheda.pv ?? 0,
    pm: scheda.pm ?? 0,
    puntiEroe: pe.riserva_massima, // §1.8.3, §2.15: il massimo posseduto è sempre 10
    puntiEroeIniziali: valoreTiro(creazione?.puntiEroe) ?? 0,
    distintiviPerPuntoEroe: pe.distintivi_per_punto_eroe,
    ferite: dati.regole.ferite.stati.length + 1, // l'ultimo gradino è «oltre Grave»
    affaticamento: dati.regole.affaticamento.stati.length - 1,
    corruzione: (dati.regole.corruzione?.stati?.length ?? 1) - 1,
    stati: dati.regole.stati.elenco.map((s) => s.id),
    // bonus e malus di circostanza (src/circostanze.js): limiti e categorie dai dati
    circostanza: dati.regole.circostanza ?? null,
    // uid di tutti gli oggetti della lista: le scelte di «Attacca!» si conservano per ogni arma (anche ravvicinata)
    oggetti: normalizzaEquipaggiamento(creazione?.equipaggiamento).map((v) => v.uid),
    // capacità del caricatore di ogni arma a distanza della lista (uid → numero o null)
    caricatori: caricatori(normalizzaEquipaggiamento(creazione?.equipaggiamento), dati),
    // modo di ricarica e scorte compatibili di ogni arma a distanza (Giocatore §5.1.1, Armamenti §7.20.2)
    // inserimento singolo: 1 munizione per operazione, 3 con Ricarica Migliorata (E&L 19)
    ricarica: dati.equipaggiamento ? Object.fromEntries(Object.entries(infoRicarica(normalizzaEquipaggiamento(creazione?.equipaggiamento), dati))
      .map(([uid, x]) => [uid, x.singolo ? { ...x, perOperazione: perOperazione(x, (scheda?.talentiLiberi ?? []).map((t) => t.id), dati) } : x])) : {},
    // granate da lancio della lista (uid → quantità): un lancio a mano consuma una granata (Armamenti §7.20.3)
    granate: dati.equipaggiamento ? granateDaLancio(normalizzaEquipaggiamento(creazione?.equipaggiamento), dati) : {},
    // capacità di ogni contenitore di Chroma (uid → PM)
    contenitori: Object.fromEntries(contenitori(normalizzaEquipaggiamento(creazione?.equipaggiamento), dati).map((c) => [c.uid, c.capacita])),
    // E&L 2 (A.19): acquistato pieno (regole.json → chroma); trovato con i PM impostati nella voce
    contenitoreNuovo: dati.regole.chroma?.contenitore_nuovo ?? 'pieno',
    contenitoriIniziali: Object.fromEntries(contenitori(normalizzaEquipaggiamento(creazione?.equipaggiamento), dati).filter((c) => c.pmIniziali !== null).map((c) => [c.uid, c.pmIniziali])),
    // oggetti con effetti situazionali: solo questi possono avere la condizione accesa
    oggettiSituazionali: oggettiSituazionali(creazione, dati, scheda),
    // §2.16.28–29: crediti iniziali meno i conguagli, o null senza dotazione iniziale
    creditiIniziali: dati.dotazioni ? saldoIniziale(creazione, dati) : null,
    // condizioni delle armi al tavolo (Giocatore §5.17, A.49): id ammessi
    condizioniArmi: (dati.regole.condizioni_armi?.elenco ?? []).map((c) => c.id),
    // PI massimi degli oggetti con PI (uid → PI), Armamenti §7.2.1
    integrita: dati.equipaggiamento && dati.regole.integrita ? piMassimi(creazione, dati) : null,
    // Tecniche Interiori apprese (id): solo queste possono essere attive (src/tecniche.js)
    tecniche: (scheda?.tecniche ?? []).map((t) => t.id),
    // riserve dei NEC (chiave → massimo in Lx, ore o usi), Equipaggiamento §5.4
    nec: dati.equipaggiamento && dati.regole.nec ? Object.fromEntries(riserveNec(normalizzaEquipaggiamento(creazione?.equipaggiamento), dati).map((x) => [x.chiave, x.massimo])) : null,
  };
}

/** PI massimi degli oggetti della lista che hanno PI (src/protezione.js). */
function piMassimi(creazione, dati) {
  const cat = catalogo(dati);
  const oggetti = normalizzaEquipaggiamento(creazione?.equipaggiamento).map((v) => risolvi(v, cat));
  return Object.fromEntries(oggettiConPi(oggetti, dati).filter((x) => !x.gruppo).map((x) => [x.uid, x.piMax]));
}

/** PI attuali: gli oggetti nuovi partono integri, i valori restano entro 0 e i massimi. */
function allineaIntegrita(v, m) {
  const src = isOggetto(v) ? v : {};
  if (!m.integrita) return Object.fromEntries(Object.entries(src).filter(([, n]) => Number.isInteger(n) && n >= 0));
  return Object.fromEntries(Object.entries(m.integrita).map(([uid, max]) => [uid, limita(intero(src[uid], max), 0, max)]));
}

/** Riserve dei NEC: i nuovi partono carichi, i valori restano entro 0 e il massimo, quelli tolti spariscono. */
function allineaNec(v, m) {
  const src = isOggetto(v) ? v : {};
  if (!m.nec) return Object.fromEntries(Object.entries(src).filter(([, n]) => Number.isInteger(n) && n >= 0));
  return Object.fromEntries(Object.entries(m.nec).map(([k, max]) => [k, limita(intero(src[k], max), 0, max)]));
}

/** Riserva di un NEC al tavolo: +/− manuali (ore, usi o Lx), entro 0 e il massimo (§5.4.2). */
export function variaNec(sessione, chiave, delta, m) {
  const s = allineaSessione(sessione, m);
  if (!(chiave in s.nec)) return s;
  return modificaSessione(s, { nec: { ...s.nec, [chiave]: s.nec[chiave] + delta } }, m);
}

/** PI attuali di un oggetto: +/− al tavolo, entro 0 e i massimi (la riparazione la decide il master, A.46). */
export function variaIntegrita(sessione, uid, delta, m) {
  const s = allineaSessione(sessione, m);
  if (!(uid in s.integrita)) return s;
  return modificaSessione(s, { integrita: { ...s.integrita, [uid]: s.integrita[uid] + delta } }, m);
}

/**
 * Uid degli oggetti della lista con almeno un effetto situazionale, e chiavi «uid:stato» degli
 * stati al tavolo degli attacchi (lama estratta dello Scudo delle Guardie Sacre, risposta A.10).
 */
function oggettiSituazionali(creazione, dati, scheda = null) {
  if (!dati.equipaggiamento) return null;
  // Aura di Resistenza e Pelle di Rinoceronte non sono più interruttori: le accende «Attiva» con la
  // durata (sessione.tecnicheAttive); le vecchie chiavi «tecnica:<id>» fra le condizioni cadono qui
  const cat = catalogo(dati);
  const risolti = normalizzaEquipaggiamento(creazione?.equipaggiamento).map((v) => risolvi(v, cat));
  return [
    ...risolti.filter((r) => r.effetti.some((e) => e.ambito === 'situazionale')).map((r) => r.uid),
    ...risolti.filter((r) => r.def?.attacco?.stato).map((r) => `${r.uid}:${r.def.attacco.stato.id}`),
    // attivazione di un Artefatto con durata (Guanti da Combattimento Mistico, Armamenti §7.24): «Attiva» la accende
    ...risolti.filter((r) => r.def?.attivazione_artefatto).map((r) => `attivazione:${r.uid}`),
  ];
}

/** Condizioni accese degli oggetti: uid esistenti, senza doppioni. */
function allineaCondizioniOggetti(v, m) {
  const lista = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  return [...new Set(m.oggettiSituazionali ? lista.filter((x) => m.oggettiSituazionali.includes(x)) : lista)];
}

/**
 * Riparazione strutturale (A.46, src/riparazione.js): PI nuovi dell'oggetto e materiali sottratti ai
 * crediti attuali, se il personaggio li ha (senza scendere sotto 0).
 */
export function riparaOggetto(sessione, uid, piNuovi, costoMateriali, m) {
  const s = allineaSessione(sessione, m);
  if (!(uid in s.integrita)) return s;
  const modifica = { integrita: { ...s.integrita, [uid]: piNuovi } };
  if (Number.isInteger(s.crediti) && Number.isFinite(costoMateriali) && costoMateriali > 0) modifica.crediti = Math.max(0, s.crediti - costoMateriali);
  return modificaSessione(s, modifica, m);
}

/** Condizione di un'arma al tavolo (Giocatore §5.17, A.49); «integra» la toglie. */
export function impostaCondizioneArma(sessione, uid, id, m) {
  const s = allineaSessione(sessione, m);
  const c = { ...s.condizioniArmi };
  if (!id || id === 'integra') delete c[uid]; else c[uid] = id;
  return modificaSessione(s, { condizioniArmi: c }, m);
}

/** Accende o spegne la condizione di un oggetto con effetti situazionali. */
export function commutaCondizioneOggetto(sessione, uid, m) {
  const s = allineaSessione(sessione, m);
  const lista = s.condizioniOggetti.includes(uid) ? s.condizioniOggetti.filter((x) => x !== uid) : [...s.condizioniOggetti, uid];
  return modificaSessione(s, { condizioniOggetti: lista }, m);
}

/** Accende o spegne un Talento situazionale (chiave dell'acquisizione, src/talenti.js). */
export function commutaTalento(sessione, chiave, m) {
  const s = allineaSessione(sessione, m);
  const lista = s.talentiAccesi.includes(chiave) ? s.talentiAccesi.filter((x) => x !== chiave) : [...s.talentiAccesi, chiave];
  return modificaSessione(s, { talentiAccesi: lista }, m);
}

/** Interruttore «Bonus dei Talenti» (docs/censimento-talenti.md): acceso ↔ spento. */
export function commutaBonusTalenti(sessione, m) {
  const s = allineaSessione(sessione, m);
  return modificaSessione(s, { bonusTalenti: !s.bonusTalenti }, m);
}

/** Crediti attuali allineati al saldo iniziale (vedi l'intestazione). */
function allineaCrediti(sessione, m) {
  const saldo = Number.isInteger(m.creditiIniziali) ? m.creditiIniziali : null;
  const visto = Number.isInteger(sessione?.creditiIniziali) ? sessione.creditiIniziali : null;
  let crediti = Number.isInteger(sessione?.crediti) ? Math.max(0, sessione.crediti) : null;
  if (saldo !== null && saldo !== visto) crediti = Math.max(0, (crediti ?? visto ?? 0) + saldo - (visto ?? 0));
  return { crediti, creditiIniziali: saldo ?? visto };
}

/**
 * PM attuali dei contenitori di Chroma: i nuovi partono pieni (acquistati) o con i PM impostati nella
 * voce (trovati, E&L 2), i
 * valori non superano la capacità, i contenitori tolti dalla lista spariscono. Le riserve integrate
 * salvate prima come «munizioni» di un'arma (Bordone Templare…) conservano il loro valore.
 */
function allineaChroma(sorgente, munizioniPrecedenti, m) {
  const src = isOggetto(sorgente) ? sorgente : {};
  if (!m.contenitori) return Object.fromEntries(Object.entries(src).filter(([, v]) => isOggetto(v) && Number.isInteger(v.pmAttuali)));
  const vecchie = isOggetto(munizioniPrecedenti) ? munizioniPrecedenti : {};
  const out = {};
  for (const [uid, capacita] of Object.entries(m.contenitori)) {
    // E&L 2: se il giocatore cambia i PM «trovato» della voce, il valore di sessione riparte da lì
    const iniziale = m.contenitoriIniziali?.[uid] ?? null;
    const valido = isOggetto(src[uid]) && Number.isInteger(src[uid].pmAttuali) && (src[uid].iniziale ?? null) === iniziale;
    const salvato = valido ? src[uid].pmAttuali
      : iniziale ?? voceMunizioni(vecchie[uid])?.colpi ?? (m.contenitoreNuovo === 'vuoto' ? 0 : capacita);
    out[uid] = { pmAttuali: limita(salvato, 0, capacita), ...(iniziale !== null ? { iniziale } : {}) };
  }
  return out;
}

/** Munizioni di un'arma: { colpi, riserve, parziali?, vuoti? }; i vecchi valori numerici sono i colpi. */
function voceMunizioni(v) {
  if (Number.isInteger(v) && v >= 0) return { colpi: v, riserve: 0 };
  if (!isOggetto(v)) return null;
  const out = { colpi: Number.isInteger(v.colpi) && v.colpi >= 0 ? v.colpi : 0, riserve: Number.isInteger(v.riserve) && v.riserve >= 0 ? v.riserve : 0 };
  // caricatori tolti ricaricando: parziali (colpi rimasti) e vuoti; si scrivono solo se ci sono
  const parziali = Array.isArray(v.parziali) ? v.parziali.filter((n) => Number.isInteger(n) && n > 0) : [];
  if (parziali.length) out.parziali = parziali;
  if (Number.isInteger(v.vuoti) && v.vuoti > 0) out.vuoti = v.vuoti;
  // §7.20.3: granata caricata in un lanciagranate (uid della voce)
  if (typeof v.tipo === 'string' && v.tipo) out.tipo = v.tipo;
  return out;
}

/** Munizioni sciolte consumate: solo le voci ancora compatibili con un'arma, entro la loro quantità. */
function allineaScorte(v, m) {
  const src = isOggetto(v) ? v : {};
  if (!m.ricarica) return Object.fromEntries(Object.entries(src).filter(([, n]) => Number.isInteger(n) && n > 0));
  const quantita = new Map([...Object.values(m.ricarica).flatMap((x) => x.scorte.map((s) => [s.uid, s.quantita])), ...Object.entries(m.granate ?? {})]);
  const out = {};
  for (const [uid, n] of Object.entries(src)) if (quantita.has(uid) && Number.isInteger(n) && n > 0) out[uid] = Math.min(n, quantita.get(uid));
  return out;
}

/**
 * Munizioni allineate alle armi a distanza della lista: le armi nuove partono dal caricatore
 * pieno, i colpi non superano la capacità, le armi tolte dalla lista spariscono.
 */
function allineaMunizioni(sorgente, m) {
  const src = isOggetto(sorgente) ? sorgente : {};
  const out = {};
  if (!m.caricatori) {
    for (const [k, v] of Object.entries(src)) { const x = voceMunizioni(v); if (x) out[k] = x; }
    return out;
  }
  for (const [uid, capacita] of Object.entries(m.caricatori)) {
    const x = voceMunizioni(src[uid]) ?? { colpi: capacita ?? 0, riserve: 0 };
    if (capacita !== null) {
      x.colpi = Math.min(x.colpi, capacita);
      if (x.parziali) x.parziali = x.parziali.map((n) => Math.min(n, capacita));
    }
    out[uid] = x;
  }
  return out;
}

/** Sessione nuova: PV e PM ai massimi, Punti Eroe iniziali (§2.15), il resto a zero. */
export function inizializzaSessione(m) {
  return {
    pvAttuali: m.pv,
    pmAttuali: m.pm,
    puntiEroe: limita(m.puntiEroeIniziali, 0, m.puntiEroe),
    distintivi: 0,
    statiAttivi: [],
    ferite: 0,
    affaticamento: 0,
    corruzione: 0,
    munizioni: allineaMunizioni({}, m),
    scorte: {},
    chroma: allineaChroma({}, {}, m),
    caricoExtra: 0,
    ...allineaCrediti({}, m),
    condizioniOggetti: [],
    // Talenti (docs/censimento-talenti.md): interruttore globale e situazionali accesi
    bonusTalenti: true,
    talentiAccesi: [],
    attacchi: {},
    lanci: {},
    integrita: allineaIntegrita({}, m),
    nec: allineaNec({}, m),
    condizioniArmi: {},
    round: 1,
    ultimaTecnica: null,
    tecnicheAttive: [],
    note: '',
  };
}

/**
 * Porta una sessione salvata (o assente) a una forma valida per i massimi attuali: se manca la
 * inizializza; altrimenti limita i valori ai massimi senza riazzerarli.
 */
export function allineaSessione(sessione, m) {
  if (!isOggetto(sessione)) return inizializzaSessione(m);
  const munizioni = allineaMunizioni(sessione.munizioni, m);
  return {
    pvAttuali: limita(intero(sessione.pvAttuali, m.pv), 0, m.pv),
    pmAttuali: limita(intero(sessione.pmAttuali, m.pm), 0, m.pm),
    puntiEroe: limita(intero(sessione.puntiEroe, m.puntiEroeIniziali), 0, m.puntiEroe),
    distintivi: Math.max(0, intero(sessione.distintivi, 0)),
    statiAttivi: Array.isArray(sessione.statiAttivi) ? [...new Set(sessione.statiAttivi.filter((id) => m.stati.includes(id)))] : [],
    ferite: limita(intero(sessione.ferite, 0), 0, m.ferite),
    affaticamento: limita(intero(sessione.affaticamento, 0), 0, m.affaticamento),
    corruzione: limita(intero(sessione.corruzione, 0), 0, m.corruzione ?? 0),
    munizioni,
    scorte: allineaScorte(sessione.scorte, m),
    chroma: allineaChroma(sessione.chroma, sessione.munizioni, m),
    caricoExtra: chili(sessione.caricoExtra),
    ...allineaCrediti(sessione, m),
    condizioniOggetti: allineaCondizioniOggetti(sessione.condizioniOggetti, m),
    bonusTalenti: sessione.bonusTalenti !== false,
    talentiAccesi: Array.isArray(sessione.talentiAccesi) ? [...new Set(sessione.talentiAccesi.filter((x) => typeof x === 'string'))] : [],
    attacchi: Object.fromEntries(Object.entries(isOggetto(sessione.attacchi) ? sessione.attacchi : {})
      .filter(([uid, v]) => isOggetto(v) && (!m.caricatori || uid in m.caricatori || uid === SENZ_ARMI || (m.oggetti ?? []).includes(uid)))),
    lanci: Object.fromEntries(Object.entries(isOggetto(sessione.lanci) ? sessione.lanci : {}).filter(([, v]) => isOggetto(v))),
    integrita: allineaIntegrita(sessione.integrita, m),
    nec: allineaNec(sessione.nec, m),
    // condizione di ogni arma (uid → id; «integra» non si salva)
    condizioniArmi: Object.fromEntries(Object.entries(isOggetto(sessione.condizioniArmi) ? sessione.condizioniArmi : {})
      .filter(([uid, id]) => id !== 'integra' && (m.condizioniArmi ?? []).includes(id) && (!m.oggetti || m.oggetti.includes(uid)))),
    // Tecniche Interiori (§8.9.1, src/tecniche.js)
    round: Number.isInteger(sessione.round) && sessione.round >= 1 ? sessione.round : 1,
    ultimaTecnica: isOggetto(sessione.ultimaTecnica) && typeof sessione.ultimaTecnica.id === 'string' && Number.isInteger(sessione.ultimaTecnica.round)
      ? { id: sessione.ultimaTecnica.id, round: sessione.ultimaTecnica.round } : null,
    tecnicheAttive: allineaTecnicheAttive(sessione.tecnicheAttive, m.tecniche ?? null),
    // incantesimi lanciati con una durata (src/durate-incantesimi.js): la chiave c'è solo se ce ne sono, così le
    // sessioni di sempre restano identiche
    ...(() => { const inc = allineaIncantesimiAttivi(sessione.incantesimiAttivi); return inc.length ? { incantesimiAttivi: inc } : {}; })(),
    // impianti attivabili (src/impianti.js): cartucce degli iniettori e Processore; la chiave c'è solo se serve
    ...(() => { const imp = allineaImpianti(sessione.impianti, m.oggetti ?? null); return imp ? { impianti: imp } : {}; })(),
    // A.106: luce della scena (regole.json → illuminazione) e visione che copre il bersaglio; solo se servono
    ...(typeof sessione.luce === 'string' && sessione.luce && sessione.luce !== 'sufficiente' ? { luce: sessione.luce } : {}),
    ...(sessione.luceVisione === true ? { luceVisione: true } : {}),
    // circostanze del Direttore (src/circostanze.js): la chiave c'è solo se ce ne sono
    ...(() => { const c = normalizzaCircostanze(sessione.circostanze, m.circostanza); return c.length ? { circostanze: c } : {}; })(),
    note: typeof sessione.note === 'string' ? sessione.note : '',
  };
}

/**
 * Sessione dopo un cambio di livello (conferma o annullamento): PV e PM attuali cambiano della stessa
 * quantità dei massimi, così un personaggio illeso resta illeso e i danni già subiti restano.
 * Giocatore §8.1.2 (E&L A.6): «l’aumento dei PV massimi si aggiunge anche ai PV attuali e l’aumento
 * dei PM massimi si aggiunge anche ai PM attuali»; annullando un livello, l'inverso.
 */
export function sessioneDopoLivello(sessione, prima, dopo) {
  if (!isOggetto(sessione)) return inizializzaSessione(dopo);
  const s = allineaSessione(sessione, prima);
  return allineaSessione({ ...s, pvAttuali: s.pvAttuali + (dopo.pv - prima.pv), pmAttuali: s.pmAttuali + ((dopo.pm ?? 0) - (prima.pm ?? 0)) }, dopo);
}

/** Applica una modifica (campi parziali) e riporta tutto entro i limiti. */
export function modificaSessione(sessione, modifica, m) {
  return allineaSessione({ ...allineaSessione(sessione, m), ...modifica }, m);
}

/** Aggiunge `delta` a un valore numerico della sessione, entro i limiti. */
export function variaSessione(sessione, campo, delta, m) {
  const s = allineaSessione(sessione, m);
  return modificaSessione(s, { [campo]: s[campo] + delta }, m);
}

/** Varia i colpi o le riserve di un'arma a distanza, entro 0 e la capacità del caricatore. */
export function variaMunizioni(sessione, uid, campo, delta, m) {
  const s = allineaSessione(sessione, m);
  const x = s.munizioni[uid] ?? { colpi: 0, riserve: 0 };
  return modificaSessione(s, { munizioni: { ...s.munizioni, [uid]: { ...x, [campo]: Math.max(0, x[campo] + delta) } } }, m);
}

/**
 * Colpi sparati da «Attacca!»: dal caricatore dell'arma; per una granata da lancio (Armamenti §7.20.3) dalla
 * quantità della voce, come le munizioni sciolte (sessione → scorte), entro la quantità.
 */
export function consumaColpi(sessione, uid, n, m) {
  const s = allineaSessione(sessione, m);
  if (m.granate?.[uid] !== undefined && m.caricatori?.[uid] === undefined) {
    const usate = Math.min(m.granate[uid], (s.scorte[uid] ?? 0) + n);
    return modificaSessione(s, { scorte: { ...s.scorte, [uid]: usate } }, m);
  }
  return variaMunizioni(s, uid, 'colpi', -n, m);
}

/**
 * Granate della carica di partenza che tornano nell'Inventario cambiando tipo (§7.20.3): il lanciatore le ha
 * dall'acquisto, sono la sua munizione di riferimento (§7.8) e non vengono da una voce. { rif, quantita } o null.
 * Le aggiunge alle scelte src/equipaggiamento.js → restituisciGranate.
 */
export function granateDiPartenza(sessione, uid, voceUid, m) {
  const s = allineaSessione(sessione, m);
  const info = m.ricarica?.[uid];
  const x = s.munizioni[uid];
  if (!info?.granate || !info.rifRiferimento || !x || x.tipo || x.colpi <= 0 || x.tipo === voceUid) return null;
  return { rif: info.rifRiferimento, quantita: x.colpi };
}

/**
 * Granata da caricare in un lanciagranate (§7.20.3; un tipo alla volta). Cambiare tipo scarica il lanciatore:
 * le granate dentro tornano alla loro voce dell'Inventario; quelle della carica di partenza tornano come munizione
 * di riferimento (granateDiPartenza, nelle scelte). Poi «Ricarica» inserisce il tipo scelto.
 */
export function scegliGranata(sessione, uid, voceUid, m) {
  const s = allineaSessione(sessione, m);
  const info = m.ricarica?.[uid];
  if (!info?.granate || !info.scorte.some((x) => x.uid === voceUid)) return s;
  const x = s.munizioni[uid] ?? { colpi: 0, riserve: 0 };
  if (x.tipo === voceUid) return s;
  const scorte = { ...s.scorte };
  if (x.colpi > 0 && x.tipo) scorte[x.tipo] = Math.max(0, (scorte[x.tipo] ?? 0) - x.colpi);
  return modificaSessione(s, { munizioni: { ...s.munizioni, [uid]: { ...x, colpi: 0, tipo: voceUid } }, scorte }, m);
}

/** PM di un contenitore di Chroma: solo +/− manuali, entro 0 e la capacità (Magia sez. 6). */
export function variaChroma(sessione, uid, delta, m) {
  const s = allineaSessione(sessione, m);
  if (!s.chroma[uid]) return s;
  return modificaSessione(s, { chroma: { ...s.chroma, [uid]: { ...s.chroma[uid], pmAttuali: s.chroma[uid].pmAttuali + delta } } }, m);
}

/**
 * «Ricarica» (Giocatore §5.1.1, Armamenti §7.20.2). Armi a distanza con dati di ricarica: dalle
 * riserve della sessione o dalle scorte dell'inventario (src/ricarica.js); senza riserve non
 * cambia nulla. Altre armi e armi senza dati di compatibilità: il caricatore torna alla capacità.
 * Le riserve di Chroma non sono caricatori e non si toccano: si ricaricano solo convertendo PM
 * (Magia sez. 6, §7.5.1).
 */
export function ricaricaArma(sessione, uid, m) {
  const s = allineaSessione(sessione, m);
  const capacita = m.caricatori?.[uid];
  if (capacita === null || capacita === undefined) return s;
  const info = m.ricarica?.[uid];
  if (info) {
    const r = eseguiRicarica(info, s.munizioni[uid], s.scorte);
    return r ? modificaSessione(s, { munizioni: { ...s.munizioni, [uid]: r.munizione }, scorte: r.consumi }, m) : s;
  }
  return modificaSessione(s, { munizioni: { ...s.munizioni, [uid]: { ...(s.munizioni[uid] ?? { riserve: 0 }), colpi: capacita } } }, m);
}

/**
 * «Lancia!»: spende i PM di un lancio (Magia sez. 6), personali e/o da un solo contenitore, in una
 * sola modifica di sessione (così «Annulla» la copre tutta). null se i PM non bastano.
 */
export function spendiPmLancio(sessione, { personali = 0, contenitore = null }, m) {
  const s = allineaSessione(sessione, m);
  if (personali > s.pmAttuali) return null;
  const chroma = { ...s.chroma };
  if (contenitore) {
    const c = chroma[contenitore.uid];
    if (!c || contenitore.pm > c.pmAttuali) return null;
    chroma[contenitore.uid] = { ...c, pmAttuali: c.pmAttuali - contenitore.pm };
  }
  return modificaSessione(s, { pmAttuali: s.pmAttuali - personali, chroma }, m);
}

/** Attiva o disattiva uno Stato. */
export function commutaStato(sessione, id, m) {
  const s = allineaSessione(sessione, m);
  const attivi = s.statiAttivi.includes(id) ? s.statiAttivi.filter((x) => x !== id) : [...s.statiAttivi, id];
  return modificaSessione(s, { statiAttivi: attivi }, m);
}

/**
 * «Nuova sessione / riposo completo»: PV e PM ai massimi, Stati, Ferite e Affaticamento a zero.
 * Restano note, Punti Eroe, Distintivi, munizioni, peso aggiuntivo, PI degli oggetti e lo Stato di
 * Corruzione (§5.20.2: si recupera solo con la purificazione).
 */
/**
 * Ricarica automatica di una Batteria Matrice (Magia §26.4; regole.json → chroma.matrice): `ore` passate entro
 * il raggio della Matrice d'origine (`presso: 'origine'`, 2 PM/ora) o di un'altra Matrice dello stesso colore
 * (`'stesso_colore'`, 1 PM/ora); senza Prove, PM personali o sintonizzazione, fino alla capacità.
 * La applica il pulsante «Ricarica dalla Matrice» (tab Artefatti): «Nuova sessione» non riempie i contenitori.
 */
export function ricaricaMatrice(sessione, uid, ore, presso, dati, m) {
  const s = allineaSessione(sessione, m);
  const M = dati.regole.chroma?.matrice;
  const velocita = presso === 'origine' ? M?.pm_ora_origine : presso === 'stesso_colore' ? M?.pm_ora_stesso_colore : 0;
  if (!s.chroma[uid] || !Number.isInteger(ore) || ore <= 0 || !velocita) return s;
  const max = m.contenitori?.[uid] ?? s.chroma[uid].pmAttuali;
  const pm = Math.min(max, s.chroma[uid].pmAttuali + ore * velocita);
  return modificaSessione(s, { chroma: { ...s.chroma, [uid]: { ...s.chroma[uid], pmAttuali: pm } } }, m);
}

/**
 * Attivazione di un Artefatto con durata (Guanti da Combattimento Mistico, Armamenti §7.24): i PM dalla riserva
 * interna (proprietà Esclusiva) e la condizione «attivazione:<uid>» accesa, in una modifica sola. null se la
 * riserva non basta. Si termina spegnendo la condizione.
 */
export function attivaArtefatto(sessione, uid, pm, m) {
  const s = allineaSessione(sessione, m);
  const c = s.chroma[uid];
  if (!c || c.pmAttuali < pm) return null;
  const chiave = `attivazione:${uid}`;
  return modificaSessione(s, { chroma: { ...s.chroma, [uid]: { ...c, pmAttuali: c.pmAttuali - pm } }, condizioniOggetti: [...new Set([...s.condizioniOggetti, chiave])] }, m);
}

export function nuovaSessione(sessione, m) {
  // «Nuova sessione»: anche gli incantesimi in corso finiscono
  const { incantesimiAttivi: _inc, ...resto } = allineaSessione(sessione, m);
  return { ...resto, pvAttuali: m.pv, pmAttuali: m.pm, statiAttivi: [], ferite: 0, affaticamento: 0, round: 1, ultimaTecnica: null, tecnicheAttive: [] };
}

/**
 * «Attiva» una Tecnica Interiore (Giocatore §8.9.1, src/tecniche.js): PM personali scalati, limite di
 * una per Round, effetto attivo con la durata, Svenuto se la riserva resta a 0. null se non si può.
 */
export function attivaTecnicaSessione(sessione, scheda, id, dati, opz, m) {
  const t = tecnicaDi(id, dati);
  if (!t) return null;
  const nuova = attivaTecnica(scheda, allineaSessione(sessione, m), t, dati, opz);
  return nuova ? allineaSessione(nuova, m) : null;
}

/** «Nuovo Round»: avanza il contatore e fa scadere le Tecniche finite (§8.9.1). */
export function nuovoRoundSessione(sessione, m) {
  return allineaSessione(nuovoRound(allineaSessione(sessione, m)), m);
}

/** Termina a mano una Tecnica attiva (durate in minuti, ore, fino all'interruzione). */
export function terminaTecnicaSessione(sessione, id, m) {
  return allineaSessione(terminaTecnica(allineaSessione(sessione, m), id), m);
}

/** §1.8.3: 5 Distintivi diventano 1 Punto Eroe, senza superare la riserva massima. null se non si può. */
export function convertiDistintivi(sessione, m) {
  const s = allineaSessione(sessione, m);
  if (s.distintivi < m.distintiviPerPuntoEroe || s.puntiEroe >= m.puntiEroe) return null;
  return { ...s, distintivi: s.distintivi - m.distintiviPerPuntoEroe, puntiEroe: s.puntiEroe + 1 };
}

/** Descrizione del gradino di Ferita `n` (0 = nessuna). */
export function descriviFerite(n, dati) {
  const f = dati.regole.ferite;
  if (!n) return { nome: 'Nessuna Ferita', penalita: 0 };
  if (n <= f.stati.length) return { ...f.stati[n - 1] };
  return { nome: `Oltre Grave: ${f.oltre}`, penalita: null };
}

/**
 * Promemoria delle penalità di sessione. Le regole del cap. 5 sono situazionali: queste
 * penalità NON modificano i VA calcolati, si mostrano accanto ai valori.
 */
export function penalitaSessione(sessione, dati) {
  const ferite = descriviFerite(sessione.ferite, dati);
  const aft = dati.regole.affaticamento.stati[sessione.affaticamento] ?? dati.regole.affaticamento.stati[0];
  const stati = dati.regole.stati.elenco.filter((s) => sessione.statiAttivi.includes(s.id));
  const crosStati = dati.regole.corruzione?.stati ?? [{ nome: 'Umano', penalita: 0 }];
  const corruzione = crosStati[sessione.corruzione ?? 0] ?? crosStati[0];
  // §5.14: le Ferite penalizzano VA e Prove Salvezza; §5.19 e §5.20: Affaticamento e Corruzione tutte le Prove
  const totale = (ferite.penalita ?? 0) + aft.penalita + (corruzione.penalita ?? 0);
  return { ferite, affaticamento: aft, corruzione, stati, totale };
}
