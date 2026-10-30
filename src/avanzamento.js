// Avanzamento di livello (Manuale del Giocatore, cap. 8).
// Il personaggio è una storia di eventi: { versione: 2, creazione: {scelte}, livelli: [ {livello, …} ] }.
// La scheda si ottiene rigiocando creazione e livelli dall'inizio, con i limiti di ciascun livello:
// se Davide cambia una tabella, la scheda si ricalcola da sola. Funzioni pure.
//
// Forma di una voce di livello (solo le chiavi degli eventi di quel livello, §8.1):
//   caratteristiche: { DES: 1, FOR: 1 }                    livelli con "caratteristiche:+N"
//   talentoLibero:  { id: 'prova-salvezza-migliorata', parametro: 'tempra' }   "talento_libero"
//   grado: { classe: 'Agente' }, tiroPV: {valore, origine}, tiroPM: {valore, origine} | assente,
//   talentoClasse: 'Reazione Operativa' (Gradi II, IV, VI), puntiAbilita: { Furtività: 2 }   "grado_classe"
//   incantesimi: [nomi], tecniche: [id]                    quando una quota cresce
// Talenti v1.0 (07/10/2026), solo per i personaggi con scelte.regimeTalenti = 2 (regole.json → progressione_talenti):
//   maestria: { id, parametro?, annotazione? }             livelli 2, 6, 10, 14, 18
//   specializzazione: { id, annotazione? }                 livelli con il Grado (4, 8, …); al 1° in scelte.specializzazioneIniziale
//   talentoLibero vale solo per i Talenti Liberi (le Specializzazioni non sono più Talenti Liberi)
import { risolviIncantesimiAMano } from './incantesimi-a-mano.js';
import { applicaCorrezioni, sessioneConCircostanzeMaster } from './correzioni-master.js';
import { modificatoriAttivi } from './temporanei.js';
import {
  calcolaScheda, modOrdinario, modSalvezza, valoreAbilita, salvezza, iniziativa as sommaIniziativa,
  puntiMagiaCreazione, incantesimiLiberi, livelloMassimoIncantesimi,
} from './calc.js';
import { specTiro, valoreTiro, motivoFuoriIntervallo } from './tiri.js';
import { calcolaEquipaggiamento, normalizzaEquipaggiamento } from './equipaggiamento.js';
import { conOrdinale, delNome } from './lingua.js';
import { saldoIniziale, contiDotazione, crediti } from './dotazioni.js';
import { applicaCondizioni } from './condizioni.js';
import { notaDaApplicare } from './talenti.js';
import { umanita, pmConUmanita } from './umanita.js';
import { erroriParametriTalenti } from './calc.js';
import { avvisoIncantesimo } from './quote-incantesimi.js';
import { competenzaDi, baseIniziale, limiteAbilita, vaPersonale, puntiUtili } from './competenze.js';

/**
 * Il Talento a scelta di una Classe dal nome salvato nel file. Un Talento rinominato dal manuale conserva i nomi di prima
 * (nomi_precedenti): le scelte già fatte si riconducono al nuovo senza toccare il file del PG (A.206, 30/10/2026:
 * «Parata a Mani Nude» → «Parata a Mani Nude Migliorata»).
 */
export function talentoAScelta(def, nome) {
  if (!nome) return undefined;
  return def.talenti_a_scelta.find((x) => x.nome === nome) ?? def.talenti_a_scelta.find((x) => (x.nomi_precedenti ?? []).includes(nome));
}

export const VERSIONE_PERSONAGGIO = 2;

const trova = (lista, nome) => lista.find((x) => x.nome === nome);
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const eTodo = (v) => typeof v === 'string' && v.startsWith('TODO(');
const somma = (obj) => Object.values(obj ?? {}).reduce((s, v) => s + v, 0);
const GRADI_ROMANI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/** id dei Talenti dal nome: «Risorse Interiori» → "risorse-interiori" (come nei dati). */
export function idDaNome(nome) {
  return String(nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Modello

/**
 * Porta un personaggio al formato attuale. Un personaggio v1 (le sole scelte della creazione)
 * diventa { versione: 2, creazione: scelte, livelli: [] }.
 */
export function migraPersonaggio(obj) {
  if (isOggetto(obj) && isOggetto(obj.creazione)) {
    return { versione: VERSIONE_PERSONAGGIO, creazione: obj.creazione, livelli: Array.isArray(obj.livelli) ? obj.livelli : [] };
  }
  return { versione: VERSIONE_PERSONAGGIO, creazione: isOggetto(obj) ? obj : {}, livelli: [] };
}

/** Livello attuale: 1 + livelli acquisiti dopo la creazione. */
export function livelloAttuale(personaggio) {
  return 1 + migraPersonaggio(personaggio).livelli.length;
}

/** Aggiunge il livello successivo con le scelte date (la validazione è in validaLivello). */
export function applicaLivello(personaggio, scelte) {
  const p = migraPersonaggio(personaggio);
  return { ...p, livelli: [...p.livelli, { livello: 1 + p.livelli.length + 1, ...structuredClone(scelte ?? {}) }] };
}

/** Toglie l'ultimo livello: è l'unica modifica ammessa ai livelli passati (ricognizione, §8). */
export function annullaUltimoLivello(personaggio) {
  const p = migraPersonaggio(personaggio);
  return { ...p, livelli: p.livelli.slice(0, -1) };
}

// ---------------------------------------------------------------------------
// Regole per livello (regole.json → avanzamento)

function fascia(tabella, livello, campo) {
  const f = tabella.find((x) => livello >= x.da && livello <= x.a);
  if (!f) throw new RangeError(`Nessun valore per il livello ${livello}`);
  return f[campo];
}

export function eventiLivello(livello, dati) {
  return dati.regole.avanzamento.eventi.find((e) => e.livello === livello)?.eventi ?? [];
}

/** Somma degli eventi "<tipo>:+N" fino al livello indicato compreso. */
function cumulato(tipo, livello, dati) {
  let n = 0;
  for (const e of dati.regole.avanzamento.eventi) {
    if (e.livello > livello) continue;
    for (const x of e.eventi) {
      const m = new RegExp(`^${tipo}:\\+(\\d+)$`).exec(x);
      if (m) n += Number(m[1]);
    }
  }
  return n;
}

function puntiEvento(tipo, livello, dati) {
  for (const x of eventiLivello(livello, dati)) {
    const m = new RegExp(`^${tipo}:\\+?(\\d+)$`).exec(x);
    if (m) return Number(m[1]);
  }
  return 0;
}

const massimoCaratteristica = (livello, dati) => fascia(dati.regole.avanzamento.massimo_caratteristica, livello, 'massimo');

// §2.3, §8.3, §8.7 (Giocatore del 29/09): base dalla prima Classe, limite del VA personale dalle Classi
// possedute (src/competenze.js). Il grezzo comprende tutti i +1 di Classe e i soli punti liberi utili.
const classiDef = (stato, dati) => stato.classi.map((c) => ({ def: trova(dati.classi.classi, c.nome), grado: c.grado }));
const primaClasseDef = (stato, dati) => trova(dati.classi.classi, stato.classi[0].nome);
const limiteDi = (stato, nomeAbilita, dati) => limiteAbilita(nomeAbilita, classiDef(stato, dati), dati.regole);

// ---------------------------------------------------------------------------
// Stato accumulato durante il ricalcolo

const eTaumaturgica = (classe, dati) => classe?.addestramento === dati.regole.taumaturgo.addestramento;

/** Scelta del parametro di un Talento di Classe (Disciplina, §3.5.5): { sceltaParametro: id } o nulla. */
function sceltaParametro(talento, parametri) {
  const v = isOggetto(parametri) ? parametri[talento?.nome] : undefined;
  return isOggetto(talento?.parametro) && talento.parametro.opzioni.some((o) => o.id === v) ? { sceltaParametro: v } : {};
}

/** Valore di una tabella per Grado { "1": …, "3": …, "5": … }: la riga del Grado minimo raggiunto. */
function perGrado(tabella, grado) {
  const k = Object.keys(tabella).map(Number).filter((g) => g <= grado).sort((a, b) => b - a)[0];
  return k === undefined ? null : tabella[String(k)];
}

/** Sostituisce «x_per_grado» con «x» al Grado dato, a ogni profondità. */
function risolviPerGrado(v, grado) {
  if (Array.isArray(v)) return v.map((x) => risolviPerGrado(x, grado));
  if (!isOggetto(v)) return v;
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (k.endsWith('_per_grado') && isOggetto(x)) out[k.slice(0, -'_per_grado'.length)] = perGrado(x, grado);
    else out[k] = risolviPerGrado(x, grado);
  }
  return out;
}

/** Unione profonda di due oggetti di effetti (la seconda aggiunge o sostituisce). */
function unisciEffetti(a, b) {
  const out = { ...(a ?? {}) };
  for (const [k, x] of Object.entries(b ?? {})) out[k] = isOggetto(x) && isOggetto(out[k]) ? unisciEffetti(out[k], x) : x;
  return out;
}

/**
 * Talento di Classe pronto per il calcolo: con il parametro scelto (Disciplina del Lottatore,
 * §3.5.5) gli effetti dell'opzione si uniscono a quelli del Talento e le tabelle per Grado si
 * leggono al Grado attuale nella Classe.
 */
export function risolviTalentoClasse(t, grado) {
  const Q = isOggetto(t.parametro) ? t.parametro : null;
  const o = Q ? Q.opzioni.find((x) => x.id === t.sceltaParametro) : null;
  const effetti = risolviPerGrado(unisciEffetti(t.effetti, o?.effetti), grado);
  return { ...t, effetti, ...(Q ? { parametroNome: o?.nome ?? null, parametroEtichetta: Q.nome } : {}) };
}

function talentoLiberoDef(id, dati) {
  const t = dati.talenti_liberi.talenti.find((x) => x.id === id);
  if (t) return { ...t, specializzazione: false };
  const s = dati.specializzazioni.specializzazioni.find((x) => x.id === id);
  return s ? { ...s, specializzazione: true, categoria: 'specializzazione', molteplicita: 'una', parametro: null, prerequisiti: [] } : null;
}

// ---------------------------------------------------------------------------
// Talenti v1.0 (07/10/2026): tre categorie con acquisizioni separate. «Nuova progressione di Talenti
// Specializzazioni e Maestrie» (docs/talenti-nuovi-v1.0.txt), che sui Talenti vale sul Manuale del Giocatore.
// Un personaggio è del regime nuovo solo con scelte.regimeTalenti = 2: quelli salvati prima restano con i Talenti
// vecchi (un solo evento «talento_libero» ai livelli dispari, Specializzazioni comprese) e si calcolano come prima.

export const CATEGORIE_TALENTI = ['specializzazione', 'maestria', 'talento_libero'];
const CAMPO_CATEGORIA = { talento_libero: 'talentoLibero', maestria: 'maestria', specializzazione: 'specializzazione' };
const NOME_CATEGORIA = { talento_libero: 'Talento Libero', maestria: 'Maestria', specializzazione: 'Specializzazione' };

/** Il personaggio usa le tre categorie dei Talenti v1.0? */
export const regimeTalentiNuovo = (creazione) => creazione?.regimeTalenti === 2;

/** Categoria di una voce: «specializzazione», «maestria», «talento_libero» o «superato». */
const categoriaDi = (def) => (def?.specializzazione ? 'specializzazione' : def?.categoria ?? 'talento_libero');

/** La voce si può scegliere nel regime dato? Regime vecchio: le voci di prima (non quelle solo nuove); nuovo: non le superate. */
const sceglibile = (def, nuovo) => !!def && (nuovo ? def.categoria !== 'superato' : !def.solo_regime_nuovo);

/** Livelli della categoria fino a `livello` compreso (regole.json → avanzamento.progressione_talenti). */
function livelliCategoria(categoria, livello, dati) {
  return (dati.regole.avanzamento.progressione_talenti?.[categoria] ?? []).filter((n) => n <= livello);
}

/**
 * Specializzazioni che si possono scegliere al Grado della Classe `classe` (p. 2 e 7–9 del file): l'elenco della
 * Classe appena aumentata, più i gruppi aperti da un Talento posseduto (Usufruitore di Magia → Potere; Ritualista
 * Minore o Maggiore → Rituali).
 */
function specializzazioniAmmesse(stato, classe, dati) {
  const S = dati.specializzazioni;
  const ammesse = new Set(S.per_classe?.[classe] ?? []);
  for (const a of S.accessi_da_talenti ?? []) if ((a.talenti ?? []).some((id) => possiede(stato, id))) for (const id of S.gruppi?.[a.gruppo] ?? []) ammesse.add(id);
  return ammesse;
}

/**
 * Il controllo unico di una scelta di Talento, per tutte e tre le categorie: lo usano la validazione dei livelli,
 * la creazione e postiTalenti (la scelta guidata del lotto 2). Errori nel formato di controllaTalentoLibero, con
 * il campo della categoria.
 * @param stato lo stato del personaggio PRIMA della scelta (prerequisiti in ordine di livello)
 * @param classe per le Specializzazioni: la Classe appena aumentata (al 1° livello la Classe iniziale)
 */
export function controllaSceltaTalento(stato, categoria, scelta, dati, { classe = null } = {}) {
  const campo = CAMPO_CATEGORIA[categoria] ?? 'talentoLibero';
  const errori = [];
  const err = (problema, tipo = 'violazione') => errori.push({ campo, problema, tipo });
  const nuovo = stato.regime === 'nuovo';
  if (!isOggetto(scelta) || !scelta.id) { err(`scegli ${categoria === 'maestria' ? 'una Maestria' : categoria === 'specializzazione' ? 'una Specializzazione' : 'un Talento Libero'}`, 'incompleto'); return errori; }
  const def = talentoLiberoDef(scelta.id, dati);
  if (def && !sceglibile(def, nuovo)) {
    err(def.categoria === 'superato'
      ? `${def.nome} non c’è più con i Talenti nuovi: ${talentoLiberoDef(def.sostituito_da, dati)?.nome ?? def.sostituito_da} ne prende il posto`
      : `${def.nome} è dei Talenti nuovi: questo personaggio usa ancora quelli di prima`);
    return errori;
  }
  if (nuovo && def) {
    const cat = categoriaDi(def);
    if (cat !== categoria) { err(`${def.nome} è ${cat === 'maestria' ? 'una Maestria' : cat === 'specializzazione' ? 'una Specializzazione' : 'un Talento Libero'}, non ${categoria === 'maestria' ? 'una Maestria' : categoria === 'specializzazione' ? 'una Specializzazione' : 'un Talento Libero'}`); return errori; }
    if (categoria === 'specializzazione' && !specializzazioniAmmesse(stato, classe, dati).has(def.id)) {
      err(`Specializzazione in ${def.nome} non è nell’elenco ${classe ? delNome(classe) : 'della Classe'} (Talenti v1.0: si sceglie dalla Classe appena aumentata)`);
    }
  }
  // molteplicità, parametro, annotazione, prerequisiti, Risorse Interiori: le regole di sempre
  errori.push(...controllaTalentoLibero(stato, scelta, dati).map((e) => ({ ...e, campo })));
  return errori;
}

/**
 * Le voci di una categoria con l'esito del controllo nello stato dato: [{ id, nome, categoria, ammesso, motivo,
 * parametri }]. Contano solo le violazioni: l'annotazione mancante (Sport) si completa dopo la scelta.
 */
function opzioniCategoria(stato, categoria, dati, { classe = null } = {}) {
  const nuovo = stato.regime === 'nuovo';
  const candidati = [
    ...dati.talenti_liberi.talenti.map((t) => ({ ...t, specializzazione: false })),
    ...dati.specializzazioni.specializzazioni.map((s) => ({ ...s, specializzazione: true, parametro: null })),
  ].filter((t) => sceglibile(t, nuovo) && (!nuovo || categoriaDi(t) === categoria));
  const valori = { caratteristica: Object.keys(stato.car), salvezza: dati.caratteristiche.salvezze.map((s) => s.id) };
  const violazioni = (scelta) => controllaSceltaTalento(stato, categoria, scelta, dati, { classe }).filter((e) => e.tipo === 'violazione');
  return candidati.map((t) => {
    const parametri = t.parametro ? valori[t.parametro].filter((p) => !violazioni({ id: t.id, parametro: p }).length) : null;
    const errori = t.parametro ? (parametri.length ? [] : violazioni({ id: t.id, parametro: valori[t.parametro][0] })) : violazioni({ id: t.id });
    return {
      id: t.id, nome: t.specializzazione ? `Specializzazione in ${t.nome}` : t.nome, categoria: categoriaDi(t), specializzazione: t.specializzazione,
      provvisorio: !!t.provvisorio, ammesso: !errori.length, motivo: errori[0]?.problema ?? null, parametri,
    };
  });
}

/** Stato dopo la creazione (1° livello), dalle scelte v1 già validate da calc.js. */
function statoCreazione(creazione, dati) {
  const s1 = calcolaScheda(creazione, dati);
  const errori = s1.errori.map((e) => ({ ...e, livello: 1, campo: `creazione.${e.campo}` }));
  if (!s1.caratteristiche) return { stato: null, errori };
  const corp = trova(dati.corporazioni.corporazioni, creazione.corporazione);
  const addestr = trova(dati.addestramenti.addestramenti, creazione.addestramento);
  const classe = trova(dati.classi.classi, creazione.classe);
  const car = Object.fromEntries(Object.entries(s1.caratteristiche).map(([k, c]) => [k, c.valore]));
  // i punti liberi inattivi (§2.13: non aumentano il VA personale) non entrano nel grezzo
  const abil = Object.fromEntries(s1.abilita.map((a) => [a.nome, { daClasse: a.daClasse, liberi: a.liberi }]));
  const inattivi = s1.abilita.filter((a) => a.inattivi > 0).map((a) => ({ livello: 1, abilita: a.nome, punti: a.inattivi }));
  const { fisso, dado } = classe.pv_per_grado;
  const pvCreazione = fisso + (dati.regole.creazione.dado_pv_massimizzato ? dado : 0);
  // anche il dado dei PM è massimizzato alla creazione (decisione 6 del master)
  const pmCreazione = puntiMagiaCreazione(0, classe, dati.regole);
  return {
    errori,
    stato: {
      livello: 1, corp, addestr, car, abil,
      classi: [{ nome: classe.nome, grado: 1, talenti: [{ grado: 1, ...classe.talenti_fissi[0], scelto: false, ...sceltaParametro(classe.talenti_fissi[0], creazione.parametriTalenti) }] }],
      contributiPV: [{ livello: 1, classe: classe.nome, valore: pvCreazione }],
      contributiPM: [{ livello: 1, classe: classe.nome, valore: pmCreazione }],
      talentiLiberi: [],
      // Talenti v1.0: 'nuovo' con scelte.regimeTalenti = 2, altrimenti i Talenti di prima
      regime: regimeTalentiNuovo(creazione) ? 'nuovo' : 'vecchio',
      dotazioniTecniche: [],
      tecniche: [],
      incantesimi: [...(creazione.incantesimi ?? [])],
      // punti liberi salvati che non aumentano il VA personale: { livello, abilita, punti } (da riassegnare)
      inattivi,
      scuola: null, // { nome, livello }: iniziazione dichiarata con la spunta (§8.9.3)
    },
  };
}

const modDi = (stato, sigla, dati) => modOrdinario(stato.car[sigla], dati.caratteristiche.modificatore_ordinario);
const nomiTalentiClasse = (stato) => stato.classi.flatMap((c) => c.talenti.map((t) => t.nome));

/** Il personaggio possiede il Talento (Libero, Specializzazione o di Classe con lo stesso nome)? */
function possiede(stato, id) {
  return stato.talentiLiberi.some((t) => t.id === id) || nomiTalentiClasse(stato).some((n) => idDaNome(n) === id);
}

/** Definizioni dei Talenti posseduti, compresi i Talenti di Classe che hanno una scheda di Talento Libero. */
function talentiConEffetti(stato, dati) {
  const out = stato.talentiLiberi.map((t) => ({ ...talentoLiberoDef(t.id, dati), parametro: t.parametro, livello: t.livello }));
  for (const n of nomiTalentiClasse(stato)) {
    const def = talentoLiberoDef(idDaNome(n), dati);
    if (def && !out.some((t) => t.id === def.id)) out.push({ ...def, parametro: null, daClasse: true });
  }
  return out;
}

const haAccessoMagiaDaTalenti = (stato, dati) => talentiConEffetti(stato, dati).some((t) => t.effetti?.accessoMagia);

/**
 * Un prerequisito di Talento: id di un Talento posseduto, «addestramento:<nome>», oppure una
 * condizione di talenti_liberi.json → condizioni_prerequisiti (per esempio la capacità personale
 * di lanciare Incantesimi: Addestramento Taumaturgo oppure Usufruitore di Magia; master, 26/09/2026).
 */
function soddisfaPrerequisito(stato, p, dati) {
  if (p.startsWith('addestramento:')) return stato.addestr.nome === p.slice('addestramento:'.length);
  const c = dati.talenti_liberi.condizioni_prerequisiti?.[p];
  // «sempre»: condizione che ogni personaggio soddisfa (la riserva personale di PM, Magia sez. 1)
  // Talenti v1.0: «talenti_di_classe», un Talento di Classe che dà accesso (Arti Marziali Migliorate: Addestramento al
  // Combattimento Senz’Armi del Lottatore, che consente l’accesso e non assegna il dado di danno di Arti Marziali)
  if (c) return c.sempre === true || (c.addestramento && stato.addestr.nome === c.addestramento) || (c.talenti ?? []).some((id) => possiede(stato, id))
    || (c.talenti_di_classe ?? []).some((n) => nomiTalentiClasse(stato).includes(n));
  return possiede(stato, p);
}

function descriviPrerequisito(p, dati) {
  if (p.startsWith('addestramento:')) return `l’Addestramento ${p.slice('addestramento:'.length)}`;
  return dati.talenti_liberi.condizioni_prerequisiti?.[p]?.descrizione ?? talentoLiberoDef(p, dati)?.nome ?? p;
}
const possiedeRisorseInteriori = (stato) => possiede(stato, 'risorse-interiori');

/** Motivi per cui Risorse Interiori è incompatibile con quanto già posseduto (§8.6.10). */
function conflittiRisorseInteriori(stato, dati) {
  const def = talentoLiberoDef('risorse-interiori', dati);
  const out = [];
  for (const regola of def?.incompatibile_con ?? []) {
    const [tipo, valore] = regola.split(':');
    if (tipo === 'addestramento' && idDaNome(stato.addestr.nome) === valore) out.push(`l’Addestramento ${stato.addestr.nome}`);
    if (tipo === 'classi' && valore === 'taumaturgiche') {
      for (const c of stato.classi) if (eTaumaturgica(trova(dati.classi.classi, c.nome), dati)) out.push(`la Classe taumaturgica ${c.nome}`);
    }
    if (tipo === 'talenti' && valore === 'accesso_magia') {
      for (const t of talentiConEffetti(stato, dati)) if (t.effetti?.accessoMagia) out.push(`il Talento ${t.nome}`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Incantesimi e Tecniche Interiori

/** Quote di incantesimi conosciuti nello stato (ipotesi permissive dei TODO in regole.json). */
function quoteIncantesimi(stato, dati) {
  const r = dati.regole;
  const perMacro = Object.fromEntries(dati.incantesimi.macrofamiglie.map((m) => [m.nome, 0]));
  let gradiTaum = 0;
  for (const c of stato.classi) {
    const def = trova(dati.classi.classi, c.nome);
    if (!eTaumaturgica(def, dati) || !def.incantesimi) continue;
    gradiTaum += c.grado;
    for (const m of Object.keys(perMacro)) {
      perMacro[m] += (def.incantesimi.primo_grado[m] ?? 0) + (c.grado - 1) * (def.incantesimi.ogni_grado_successivo[m] ?? 0);
    }
  }
  const intMod = modDi(stato, r.taumaturgo.incantesimi_liberi.caratteristica, dati);
  // §2.10 e Magia sez. 1: 2 + Mod INT una sola volta, solo con l'Addestramento Taumaturgo
  const conAddestramento = stato.addestr.nome === r.taumaturgo.addestramento;
  let liberi = conAddestramento ? incantesimiLiberi(intMod, r.taumaturgo.incantesimi_liberi) : 0;
  let livelloTalenti = 0;
  let potenziale = 0;
  let accessoTalenti = false;
  for (const t of talentiConEffetti(stato, dati)) {
    const e = t.effetti ?? {};
    if (typeof e.incantesimi === 'number') liberi += e.incantesimi;
    else if (isOggetto(e.incantesimi)) liberi += incantesimiLiberi(modDi(stato, e.incantesimi.caratteristica, dati), e.incantesimi);
    if (e.accessoMagia) { accessoTalenti = true; livelloTalenti = Math.max(livelloTalenti, e.livelloMax ?? 0); }
    if (e.livelloMaxIncantesimi) potenziale += e.livelloMaxIncantesimi;
  }
  const tetto = r.avanzamento.livello_massimo_incantesimi;
  const daGradi = Math.min(tetto, livelloMassimoIncantesimi(gradiTaum, r));
  // Potenziale Mistico Migliorato vale solo per il limite di Usufruitore di Magia, non per i
  // Taumaturghi (master, 26/09/2026, A.2.2): il tetto è quello di regole.json (18)
  const daTalenti = accessoTalenti ? Math.min(tetto, livelloTalenti + potenziale) : 0;
  const totale = somma(perMacro) + liberi;
  return {
    perMacro, liberi, totale, gradiTaumaturgici: gradiTaum, livelloMassimo: Math.max(daGradi, daTalenti),
    accesso: conAddestramento || gradiTaum > 0 || accessoTalenti,
    scalaPotere: conAddestramento ? 'taumaturgo' : (gradiTaum > 0 || accessoTalenti) ? 'altri_utilizzatori' : null,
  };
}

function statoQuote(stato, dati) {
  const q = quoteIncantesimi(stato, dati);
  const catalogo = dati.incantesimi.incantesimi;
  const noti = stato.incantesimi.map((n) => trova(catalogo, n)).filter(Boolean);
  let liberiUsati = 0;
  for (const [m, quota] of Object.entries(q.perMacro)) {
    liberiUsati += Math.max(0, noti.filter((i) => i.macrofamiglia === m).length - quota);
  }
  return { ...q, noti, liberiUsati };
}

/**
 * A.184: nei Talenti nuovi, le Tecniche e gli incantesimi oltre le quote che il personaggio ha adesso (perché il
 * Talento da cui dipendevano non è stato ripreso) sono «storico»: restano leggibili, senza effetti. Si tengono attivi,
 * nell'ordine in cui sono stati scelti, quelli che le quote coprono; la Tecnica di una fonte indipendente (Tecniche del
 * Lottatore con la Classe, della Scuola Mishima a cui si è iniziati) resta sempre attiva.
 * @returns null (Talenti di prima: niente cambia) oppure { tecniche: { attive, storico }, incantesimi: { attivi, storico } }
 */
function scelteInStorico(stato, dati) {
  if (stato.regime !== 'nuovo') return null;
  const catalogoTec = dati.tecniche_interiori.tecniche;
  const indipendente = (x) => {
    const g = catalogoTec.find((t) => t.id === x.id)?.gruppo ?? '';
    return (g === 'lottatore' && stato.classi.some((c) => c.nome === 'Lottatore')) || (g.startsWith('scuola:') && stato.scuola?.nome === g.slice(7));
  };
  let posti = tecnicheAmmesse(stato);
  const tecAttive = [];
  const tecStorico = [];
  for (const x of stato.tecniche) {
    if (indipendente(x) || posti > 0) { tecAttive.push(x); if (!indipendente(x)) posti -= 1; } else tecStorico.push(x);
  }
  const q = statoQuote(stato, dati);
  const perMacro = { ...q.perMacro };
  let liberi = q.liberi;
  const incAttivi = [];
  const incStorico = [];
  for (const nome of stato.incantesimi) {
    const i = trova(dati.incantesimi.incantesimi, nome);
    if (!i || !q.accesso) { incStorico.push(nome); continue; }
    if ((perMacro[i.macrofamiglia] ?? 0) > 0) { perMacro[i.macrofamiglia] -= 1; incAttivi.push(nome); } else if (liberi > 0) { liberi -= 1; incAttivi.push(nome); } else incStorico.push(nome);
  }
  return { tecniche: { attive: tecAttive, storico: tecStorico }, incantesimi: { attivi: incAttivi, storico: incStorico } };
}

/** Tecniche Interiori che il personaggio può conoscere: dotazioni fissate all'acquisizione. */
const tecnicheAmmesse = (stato) => stato.dotazioniTecniche.reduce((s, d) => s + d.numero, 0);

// ---------------------------------------------------------------------------
// Applicazione di una voce allo stato (senza validare)

function applicaVoce(prima, voce, dati) {
  const stato = structuredClone(prima);
  const n = prima.livello + 1;
  stato.livello = n;
  const v = isOggetto(voce) ? voce : {};

  // §8.2: Punti Caratteristica
  for (const [s, p] of Object.entries(isOggetto(v.caratteristiche) ? v.caratteristiche : {})) {
    if (s in stato.car && Number.isInteger(p) && p > 0) stato.car[s] += p;
  }

  // §8.7 e §3.1: Grado di Classe; prima i punti fissi, entro il limite di Avanzamento (§8.3)
  const def = trova(dati.classi.classi, v.grado?.classe);
  if (def && eventiLivello(n, dati).includes('grado_classe')) {
    let c = stato.classi.find((x) => x.nome === def.nome);
    if (!c) { c = { nome: def.nome, grado: 0, talenti: [] }; stato.classi.push(c); }
    c.grado += 1;
    const av = dati.regole.avanzamento;
    const iFisso = av.gradi_talento_fisso.indexOf(c.grado);
    if (iFisso >= 0 && def.talenti_fissi[iFisso]) c.talenti.push({ grado: c.grado, ...def.talenti_fissi[iFisso], scelto: false, ...sceltaParametro(def.talenti_fissi[iFisso], v.parametriTalenti) });
    else if (av.gradi_talento_a_scelta.includes(c.grado)) {
      const t = talentoAScelta(def, v.talentoClasse);
      if (t) c.talenti.push({ grado: c.grado, ...t, scelto: true });
    }
    // §3.1 e §8.3 (29/09): il +1 di Classe si registra sempre, anche oltre il limite: la parte
    // eccedente diventa efficace quando il limite sale
    const bonus = dati.regole.creazione.bonus_classe_per_grado;
    for (const a of def.abilita) stato.abil[a].daClasse += bonus;
    stato.contributiPV.push({ livello: n, classe: def.nome, valore: def.pv_per_grado.fisso + (valoreTiro(v.tiroPV) ?? 0) });
    const tiroPM = valoreTiro(v.tiroPM);
    stato.contributiPM.push({
      livello: n, classe: def.nome,
      valore: def.pm_per_grado.dado === 0 ? def.pm_per_grado.fisso : (tiroPM === null ? null : def.pm_per_grado.fisso + tiroPM),
    });
    // Talenti di Classe che coincidono con Talenti Liberi con effetti sulle Tecniche (Lottatore, §3.5.5)
    const nuovo = c.talenti.at(-1);
    if (nuovo?.grado === c.grado) aggiungiDotazione(stato, idDaNome(nuovo.nome), n, 'classe', dati);
  }

  // §8.6: Talento Libero
  if (isOggetto(v.talentoLibero) && talentoLiberoDef(v.talentoLibero.id, dati)) {
    stato.talentiLiberi.push({
      id: v.talentoLibero.id, parametro: v.talentoLibero.parametro ?? null, livello: n,
      ...(typeof v.talentoLibero.annotazione === 'string' && v.talentoLibero.annotazione.trim() ? { annotazione: v.talentoLibero.annotazione.trim() } : {}),
    });
    aggiungiDotazione(stato, v.talentoLibero.id, n, 'libero', dati);
  }
  // Talenti v1.0: Maestria e Specializzazione del livello (solo regime nuovo; la validazione è in controllaVoce)
  if (stato.regime === 'nuovo') {
    if (isOggetto(v.maestria) && talentoLiberoDef(v.maestria.id, dati)) aggiungiTalento(stato, 'maestria', v.maestria, n, null, dati, true);
    if (isOggetto(v.specializzazione) && talentoLiberoDef(v.specializzazione.id, dati)) aggiungiTalento(stato, 'specializzazione', v.specializzazione, n, v.grado?.classe ?? null, dati, true);
  }

  // §8.3: Punti Abilità Liberi, dopo Caratteristiche e Grado del livello; entrano solo quelli che
  // aumentano il VA personale, gli altri restano inattivi (da riassegnare, non accantonati)
  for (const [a, p] of Object.entries(isOggetto(v.puntiAbilita) ? v.puntiAbilita : {})) {
    if (!(a in stato.abil) || !Number.isInteger(p) || p <= 0) continue;
    const x = stato.abil[a];
    const { utili, inattivi } = puntiUtili(grezzoDi(stato, a, x.daClasse + x.liberi, dati), limiteDi(stato, a, dati).valore, p);
    x.liberi += utili;
    if (inattivi) stato.inattivi.push({ livello: n, abilita: a, punti: inattivi });
  }

  if (typeof v.scuolaMishima === 'string' && v.scuolaMishima && !stato.scuola) stato.scuola = { nome: v.scuolaMishima, livello: n };
  for (const i of Array.isArray(v.incantesimi) ? v.incantesimi : []) if (!stato.incantesimi.includes(i)) stato.incantesimi.push(i);
  for (const t of Array.isArray(v.tecniche) ? v.tecniche : []) if (!stato.tecniche.some((x) => x.id === t)) stato.tecniche.push({ id: t, livello: n });
  return stato;
}

/** Un Talento delle categorie nuove nello stato (sul posto se `sulPosto`, altrimenti in una copia). */
function aggiungiTalento(stato, categoria, scelta, livello, classe, dati, sulPosto = false) {
  const s = sulPosto ? stato : { ...stato, talentiLiberi: [...stato.talentiLiberi], dotazioniTecniche: [...stato.dotazioniTecniche] };
  s.talentiLiberi.push({
    id: scelta.id, parametro: scelta.parametro ?? null, livello, categoria, ...(classe ? { classe } : {}),
    ...(typeof scelta.annotazione === 'string' && scelta.annotazione.trim() ? { annotazione: scelta.annotazione.trim() } : {}),
  });
  aggiungiDotazione(s, scelta.id, livello, categoria, dati);
  return s;
}

/** Risorse Interiori: 2 + Mod SAG (min 1) fissato all'acquisizione; Supplementari: +3 (§8.6.10). */
function aggiungiDotazione(stato, id, livello, fonte, dati) {
  const def = talentoLiberoDef(id, dati);
  const t = def?.effetti?.tecniche;
  if (t === undefined) return;
  const numero = typeof t === 'number' ? t : Math.max(t.minimo ?? 0, t.fisso + modDi(stato, t.caratteristica, dati));
  stato.dotazioniTecniche.push({ id, livello, fonte, numero });
}

// ---------------------------------------------------------------------------
// Validazione di una voce

function requisitiClasse(talento) {
  const m = /^Requisito: ([^.]+)\./.exec(talento.testo ?? '');
  return m ? m[1].split(/, | oppure /).map((x) => x.trim()) : [];
}

/** Errori di un Talento Libero (o Specializzazione) che si vuole acquisire nello stato dato. */
export function controllaTalentoLibero(stato, scelta, dati) {
  const errori = [];
  const err = (problema, tipo = 'violazione') => errori.push({ campo: 'talentoLibero', problema, tipo });
  if (!isOggetto(scelta) || !scelta.id) { err('scegli un Talento Libero', 'incompleto'); return errori; }
  const def = talentoLiberoDef(scelta.id, dati);
  if (!def) { err(`"${scelta.id}" non è un Talento Libero né una Specializzazione`); return errori; }
  // Talenti v1.0: le voci nuove non sono per i personaggi con i Talenti di prima
  if (stato.regime !== 'nuovo' && def.solo_regime_nuovo) { err(`${def.nome} è dei Talenti nuovi: questo personaggio usa ancora quelli di prima`); return errori; }
  const nome = def.specializzazione ? `Specializzazione in ${def.nome}` : def.nome;
  const presi = stato.talentiLiberi.filter((t) => t.id === def.id);
  const parametro = scelta.parametro ?? null;

  // §8.6: molteplicità e parametro
  if (def.parametro === 'caratteristica') {
    if (!parametro) err(`${nome}: scegli la Caratteristica`, 'incompleto');
    else if (!(parametro in stato.car)) err(`${nome}: "${parametro}" non è una Caratteristica`);
    else if (presi.some((t) => t.parametro === parametro)) err(`${nome} è già stato preso per ${parametro}: si acquisisce una volta per ciascuna Caratteristica`);
  } else if (def.parametro === 'salvezza') {
    const ids = dati.caratteristiche.salvezze.map((s) => s.id);
    if (!parametro) err(`${nome}: scegli la Salvezza`, 'incompleto');
    else if (!ids.includes(parametro)) err(`${nome}: "${parametro}" non è una Salvezza (${ids.join(', ')})`);
    else if (presi.filter((t) => t.parametro === parametro).length >= 2) err(`${nome} su ${parametro}: al massimo due acquisizioni per ciascuna Salvezza (§8.6.2)`);
  } else if (parametro !== null) {
    err(`${nome} non richiede un parametro`);
  }
  if (def.molteplicita === 'una' && possiede(stato, def.id)) err(`${nome} è già posseduto: si acquisisce una sola volta`);
  // Sport, Poliglotta: la scelta (disciplina, lingue) si annota come testo
  if (def.annotazione && !(typeof scelta.annotazione === 'string' && scelta.annotazione.trim())) err(`${nome}: indica ${def.annotazione}`, 'incompleto');
  if (def.molteplicita === 'limitata' && presi.length >= def.max_acquisizioni) err(`${nome}: al massimo ${def.max_acquisizioni} acquisizioni`);

  // prerequisiti: Talenti, Addestramento, capacità; «non:» esprime un'incompatibilità
  if (Array.isArray(def.prerequisiti)) {
    for (const p of def.prerequisiti) {
      const negato = p.startsWith('non:');
      const base = negato ? p.slice(4) : p;
      const ok = soddisfaPrerequisito(stato, base, dati);
      if (negato && ok) err(`${nome} è incompatibile con ${descriviPrerequisito(base, dati)}`);
      if (!negato && !ok) err(`${nome} richiede ${descriviPrerequisito(base, dati)}`);
    }
  }

  // §8.6.10: incompatibilità fra Risorse Interiori e magia, in entrambe le direzioni
  if (def.id === 'risorse-interiori') {
    for (const c of conflittiRisorseInteriori(stato, dati)) err(`Risorse Interiori è incompatibile con ${c} (§8.6.10)`);
  }
  return errori;
}

/**
 * Errori delle scelte del livello successivo: regola violata o scelta incompleta, nello
 * stesso formato di validaScelte.
 */
function controllaVoce(prima, voce, dati) {
  const errori = [];
  const err = (campo, problema, tipo = 'violazione') => errori.push({ campo, problema, tipo });
  const n = prima.livello + 1;
  const av = dati.regole.avanzamento;
  if (n > av.livello_massimo) { err('livello', `il livello massimo è ${av.livello_massimo}`); return errori; }
  const v = isOggetto(voce) ? voce : {};
  if (v.livello !== undefined && v.livello !== n) err('livello', `questa voce è per il livello ${n}, non ${v.livello}`);
  const eventi = eventiLivello(n, dati);
  const kCar = puntiEvento('caratteristiche', n, dati);
  const kAbil = puntiEvento('punti_abilita', n, dati);
  const conGrado = eventi.includes('grado_classe');
  const conTalento = eventi.includes('talento_libero');

  const ammesse = new Set(['livello', 'incantesimi', 'tecniche', 'scuolaMishima']);
  if (kCar) ammesse.add('caratteristiche');
  if (conTalento) ammesse.add('talentoLibero');
  // Talenti v1.0 (regime nuovo): Maestria e Specializzazione nei livelli della progressione
  const nuovo = prima.regime === 'nuovo';
  const conMaestria = nuovo && livelliCategoria('maestria', n, dati).includes(n);
  const conSpecializzazione = nuovo && conGrado && livelliCategoria('specializzazione', n, dati).includes(n);
  if (conMaestria) ammesse.add('maestria');
  if (conSpecializzazione) ammesse.add('specializzazione');
  if (conGrado) for (const k of ['grado', 'tiroPV', 'tiroPM', 'talentoClasse', 'parametriTalenti']) ammesse.add(k);
  if (kAbil) ammesse.add('puntiAbilita');
  for (const k of Object.keys(v)) if (!ammesse.has(k)) err(k, `${conOrdinale('al', n)} livello non si sceglie «${k}» (eventi: ${eventi.join(', ') || 'nessuno'})`);

  // §8.2: Punti Caratteristica e massimo per livello
  if (kCar) {
    const pc = isOggetto(v.caratteristiche) ? v.caratteristiche : {};
    const max = massimoCaratteristica(n, dati);
    for (const [s, p] of Object.entries(pc)) {
      if (!(s in prima.car)) err(`caratteristiche.${s}`, `"${s}" non è una Caratteristica`);
      else if (!Number.isInteger(p) || p < 0) err(`caratteristiche.${s}`, 'i punti devono essere interi ≥ 0');
      else if (prima.car[s] + p > max) err(`caratteristiche.${s}`, `${s} arriverebbe a ${prima.car[s] + p}: ${conOrdinale('al', n)} livello il massimo è ${max} (§8.2)`);
    }
    const spesi = somma(pc);
    if (spesi > kCar) err('caratteristiche', `assegnati ${spesi} Punti Caratteristica, ${conOrdinale('al', n)} livello se ne ricevono ${kCar}`);
    if (spesi < kCar) err('caratteristiche', `assegnati ${spesi} Punti Caratteristica su ${kCar}`, 'incompleto');
  }
  // lo stato con le nuove Caratteristiche serve per VA, dotazioni e quote
  const conCar = applicaVoce(prima, { caratteristiche: v.caratteristiche }, dati);
  conCar.livello = prima.livello;

  // §8.7, §3.1–3.3: Grado di Classe
  if (conGrado) {
    const def = trova(dati.classi.classi, v.grado?.classe);
    if (!v.grado?.classe) err('grado', 'scegli la Classe di cui acquisire un Grado', 'incompleto');
    else if (!def) err('grado', `Classe "${v.grado.classe}" inesistente`);
    if (def) {
      const posseduta = prima.classi.find((c) => c.nome === def.nome);
      const nuovoGrado = (posseduta?.grado ?? 0) + 1;
      if (posseduta && posseduta.grado >= av.grado_massimo) err('grado', `${def.nome} è già al Grado ${GRADI_ROMANI[av.grado_massimo]}`);
      if (!posseduta && prima.classi.length >= av.classi_massime) {
        err('grado', `si possono possedere al massimo ${av.classi_massime} Classi (${prima.classi.map((c) => c.nome).join(', ')}): ${def.nome} sarebbe la ${prima.classi.length + 1}ª (§3.1)`);
      }
      if (eTaumaturgica(def, dati) && possiedeRisorseInteriori(prima)) err('grado', `${def.nome} è una Classe taumaturgica: incompatibile con Risorse Interiori (§8.6.10)`);
      // §3.3: dopo la creazione i dadi si tirano
      for (const [campo, profilo, nome] of [['tiroPV', def.pv_per_grado, 'PV'], ['tiroPM', def.pm_per_grado, 'PM']]) {
        if (profilo.dado === 0) {
          if (v[campo] !== undefined && v[campo] !== null) err(campo, `${def.nome} non ha un dado per i ${nome}`);
          continue;
        }
        const spec = specTiro({ facce: profilo.dado });
        if (v[campo] === undefined || v[campo] === null) err(campo, `manca il tiro di ${spec.formula} per i ${nome} di ${def.nome}`, 'incompleto');
        else {
          const motivo = motivoFuoriIntervallo(valoreTiro(v[campo]), spec);
          if (motivo) err(campo, `tiro dei ${nome}: ${motivo}`);
        }
      }
      // §3.5.5: il Talento fisso di questo Grado può chiedere un parametro (Disciplina); i parametri
      // di Talenti presi prima non si cambiano
      const iF = av.gradi_talento_fisso.indexOf(nuovoGrado);
      for (const e of erroriParametriTalenti(iF >= 0 && def.talenti_fissi[iF] ? [def.talenti_fissi[iF]] : [], v.parametriTalenti)) err(e.campo, e.problema, e.tipo);
      // §3.2: Talento a scelta ai Gradi II, IV, VI, ciascuno una volta
      if (av.gradi_talento_a_scelta.includes(nuovoGrado)) {
        const t = talentoAScelta(def, v.talentoClasse);
        if (!v.talentoClasse) err('talentoClasse', `al Grado ${GRADI_ROMANI[nuovoGrado]} di ${def.nome} si sceglie un Talento fra ${def.talenti_a_scelta.map((x) => x.nome).join(', ')}`, 'incompleto');
        else if (!t) err('talentoClasse', `"${v.talentoClasse}" non è fra i Talenti a scelta di ${def.nome}`);
        else {
          if (posseduta?.talenti.some((x) => x.nome === t.nome)) err('talentoClasse', `${t.nome} è già stato scelto`);
          const req = requisitiClasse(t);
          if (req.length && !req.some((r) => possiede(prima, idDaNome(r)))) err('talentoClasse', `${t.nome} richiede ${req.join(' oppure ')}`);
          const idT = idDaNome(t.nome);
          if (idT === 'risorse-interiori') {
            if (possiedeRisorseInteriori(prima)) err('talentoClasse', 'Risorse Interiori è già posseduto: non si riceve una seconda dotazione (§8.6.10)');
            for (const c of conflittiRisorseInteriori(prima, dati)) err('talentoClasse', `Risorse Interiori è incompatibile con ${c} (§8.6.10)`);
          }
        }
      } else if (v.talentoClasse !== undefined) {
        err('talentoClasse', `al Grado ${GRADI_ROMANI[nuovoGrado]} il Talento di Classe è fisso`);
      }
    }
  }

  // §8.6: Talento Libero (Talenti v1.0, regime nuovo: le tre categorie, con il controllo unico)
  if (conTalento) errori.push(...(nuovo ? controllaSceltaTalento(conCar, 'talento_libero', v.talentoLibero, dati) : controllaTalentoLibero(conCar, v.talentoLibero, dati)));
  if (conMaestria) errori.push(...controllaSceltaTalento(conCar, 'maestria', v.maestria, dati));
  if (conSpecializzazione) errori.push(...controllaSceltaTalento(conCar, 'specializzazione', v.specializzazione, dati, { classe: v.grado?.classe ?? null }));

  // §8.3 e §2.13: Punti Abilità Liberi dopo i punti fissi della Classe
  const conGradoApplicato = applicaVoce(prima, { caratteristiche: v.caratteristiche, grado: v.grado, talentoClasse: v.talentoClasse, tiroPV: v.tiroPV, tiroPM: v.tiroPM }, dati);
  if (kAbil) {
    const pa = isOggetto(v.puntiAbilita) ? v.puntiAbilita : {};
    const minimo = dati.regole.creazione.va_minimo_per_punti_liberi;
    for (const [a, p] of Object.entries(pa)) {
      const x = conGradoApplicato.abil[a];
      if (!x) { err(`puntiAbilita.${a}`, `"${a}" non è un'Abilità`); continue; }
      if (!Number.isInteger(p) || p < 0) { err(`puntiAbilita.${a}`, 'i punti devono essere interi ≥ 0'); continue; }
      if (p === 0) continue;
      const va = grezzoDi(conGradoApplicato, a, x.daClasse + x.liberi, dati);
      const lim = limiteDi(conGradoApplicato, a, dati);
      const { inattivi } = puntiUtili(va, lim.valore, p);
      if (inattivi) {
        errori.push({
          campo: `puntiAbilita.${a}`, tipo: 'violazione', inattivi,
          problema: `${inattivi === 1 ? '1 punto non aumenta' : `${inattivi} punti non aumentano`} il VA personale: VA ${Math.min(va, lim.valore)}, limite ${lim.valore} (${dati.regole.competenze.categorie[lim.categoria].nome}, §8.3)`,
        });
      }
      if (va < minimo) err(`puntiAbilita.${a}`, `VA ${va} prima dei punti liberi: serve almeno ${minimo} (§2.13)`);
    }
    const spesi = somma(pa);
    if (spesi > kAbil) err('puntiAbilita', `${spesi - kAbil} punti in eccesso rispetto alle regole correnti (${conOrdinale('al', n)} livello se ne ricevono ${kAbil})`, 'eccesso');
    if (spesi < kAbil) err('puntiAbilita', `assegnati ${spesi} Punti Abilità Liberi su ${kAbil}`, 'incompleto');
  }

  // stato completo del nuovo livello, per quote e tetti
  const dopo = applicaVoce(prima, v, dati);
  errori.push(...controllaIncantesimi(prima, dopo, v, dati));
  errori.push(...controllaTecniche(prima, dopo, v, dati));

  // §1.2.3, §8.6.2: tetto 18 per strutturale + Prova Salvezza Migliorata
  if (v.talentoLibero?.id === 'prova-salvezza-migliorata' && v.talentoLibero.parametro) {
    const s = salvezzeDi(dopo, dati)[v.talentoLibero.parametro];
    if (s && s.strutturale + s.talenti > av.tetto_salvezza) {
      err('talentoLibero', `${s.nome} arriverebbe a ${s.strutturale + s.talenti}: strutturale + Prova Salvezza Migliorata non può superare ${av.tetto_salvezza} (§1.2.3)`);
    }
  }
  return errori;
}

/** §1.2.1: VA grezzo personale di un'Abilità nello stato, con l'Avanzamento dato. */
function grezzoDi(stato, nomeAbilita, avanzamento, dati) {
  const a = trova(dati.abilita.abilita, nomeAbilita);
  return valoreAbilita({
    mod: modDi(stato, a.caratteristica, dati),
    base: baseIniziale(primaClasseDef(stato, dati), nomeAbilita, dati.regole),
    corporazione: stato.corp.abilita_bonus.includes(nomeAbilita) ? 1 : 0,
    avanzamento,
  });
}

function controllaIncantesimi(prima, dopo, v, dati) {
  const errori = [];
  const err = (problema, tipo = 'violazione') => errori.push({ campo: 'incantesimi', problema, tipo });
  const nuovi = Array.isArray(v.incantesimi) ? v.incantesimi : [];
  if (v.incantesimi !== undefined && !Array.isArray(v.incantesimi)) err('deve essere una lista di nomi');
  const q = statoQuote(dopo, dati);
  const visti = new Set();
  for (const nome of nuovi) {
    const i = trova(dati.incantesimi.incantesimi, nome);
    if (!i) { err(`"${nome}" non è un incantesimo`); continue; }
    if (prima.incantesimi.includes(nome) || visti.has(nome)) err(`${nome} è già conosciuto`);
    visti.add(nome);
    if (i.livello_base > q.livelloMassimo) err(`${nome}: livello base ${i.livello_base} oltre il livello massimo ${q.livelloMassimo} (tabella dei Gradi taumaturgici)`);
  }
  if (nuovi.length && !q.accesso) err('il personaggio non ha accesso alla magia');
  if (q.liberiUsati > q.liberi || q.noti.length > q.totale) {
    err(`incantesimi conosciuti ${q.noti.length}, quote ${q.totale} (di Classe per macrofamiglia + ${q.liberi} liberi)`);
  } else if (q.noti.length < q.totale && (nuovi.length || q.totale > statoQuote(prima, dati).totale)) {
    err(`restano ${q.totale - q.noti.length} incantesimi da scegliere`, 'incompleto');
  }
  return errori;
}

function controllaTecniche(prima, dopo, v, dati) {
  const errori = [];
  const err = (problema, tipo = 'violazione') => errori.push({ campo: 'tecniche', problema, tipo });
  const nuove = Array.isArray(v.tecniche) ? v.tecniche : [];
  const catalogo = dati.tecniche_interiori.tecniche;
  const visti = new Set();
  for (const id of nuove) {
    const t = catalogo.find((x) => x.id === id);
    if (!t) { err(`"${id}" non è una Tecnica Interiore`); continue; }
    if (prima.tecniche.some((x) => x.id === id) || visti.has(id)) err(`${t.nome} è già conosciuta`);
    visti.add(id);
    // §8.9.4: Tecniche del Lottatore; §8.9.3: Scuole Mishima
    if (t.gruppo === 'lottatore' && !dopo.classi.some((c) => c.nome === 'Lottatore')) err(`${t.nome} è una Tecnica del Lottatore`);
    if (t.gruppo.startsWith('scuola:') && dopo.corp.nome !== 'Mishima') err(`${t.nome} appartiene a una Scuola Mishima: serve la Corporazione Mishima (§8.9.3)`);
    else if (t.gruppo.startsWith('scuola:') && dopo.scuola?.nome !== t.gruppo.slice(7)) {
      err(`${t.nome} è della Scuola ${t.gruppo.slice(7)}: serve l’iniziazione a quella Scuola (§8.9.3)`);
    }
  }
  if (v.scuolaMishima !== undefined) {
    const scuoleNote = new Set(catalogo.filter((t) => t.gruppo.startsWith('scuola:')).map((t) => t.gruppo.slice(7)));
    if (!scuoleNote.has(v.scuolaMishima)) err(`"${v.scuolaMishima}" non è una Scuola Mishima (${[...scuoleNote].join(', ')})`);
    else if (dopo.corp.nome !== 'Mishima') err('le Scuole Mishima richiedono la Corporazione Mishima (§8.9.3)');
    else if (prima.scuola && prima.scuola.nome !== v.scuolaMishima) err(`il personaggio è già iniziato alla Scuola ${prima.scuola.nome}: si appartiene a una sola Scuola (§8.9.3)`);
  }
  const scuole = new Set(dopo.tecniche.map((x) => catalogo.find((t) => t.id === x.id)?.gruppo).filter((g) => g?.startsWith('scuola:')));
  if (scuole.size > 1) err(`si può appartenere a una sola Scuola Mishima, trovate: ${[...scuole].map((s) => s.slice(7)).join(', ')} (§8.9.3)`);
  const ammesse = tecnicheAmmesse(dopo);
  if (dopo.tecniche.length > ammesse) err(`Tecniche conosciute ${dopo.tecniche.length}, ammesse ${ammesse} (§8.6.10)`);
  else if (dopo.tecniche.length < ammesse && ammesse > tecnicheAmmesse(prima)) err(`restano ${ammesse - dopo.tecniche.length} Tecniche Interiori da scegliere`, 'incompleto');
  return errori;
}

// ---------------------------------------------------------------------------
// Ricalcolo e scheda

/** Rigioca creazione e livelli. Restituisce lo stato finale e tutti gli errori, livello per livello. */
function ricalcola(personaggio, dati, finoA = Infinity) {
  const p = migraPersonaggio(personaggio);
  const { stato: iniziale, errori } = statoCreazione(p.creazione, dati);
  if (!iniziale) return { stato: null, errori, completamenti: [], eccessi: [] };
  let stato = iniziale;
  // Talenti v1.0: la Specializzazione del Grado iniziale, dall'elenco della Classe iniziale (p. 2 del file)
  if (stato.regime === 'nuovo' && livelliCategoria('specializzazione', 1, dati).includes(1)) {
    const scelta = p.creazione.specializzazioneIniziale;
    const classe = stato.classi[0]?.nome ?? null;
    errori.push(...controllaSceltaTalento(stato, 'specializzazione', scelta, dati, { classe })
      .map((e) => ({ ...e, livello: 1, campo: 'creazione.specializzazioneIniziale' })));
    if (isOggetto(scelta) && talentoLiberoDef(scelta.id, dati)) stato = aggiungiTalento(stato, 'specializzazione', scelta, 1, classe, dati);
  }
  p.livelli.slice(0, finoA).forEach((voce, i) => {
    const e = controllaVoce(stato, voce, dati);
    errori.push(...e.map((x) => ({ ...x, livello: stato.livello + 1, campo: `livelli[${i}].${x.campo}` })));
    stato = applicaVoce(stato, voce, dati);
  });
  return { stato, ...separaPuntiLiberi(p, errori, finoA, dati, stato) };
}

// ---------------------------------------------------------------------------
// Punti Abilità Liberi e regole aggiornate (Giocatore, Doc del 27/09/2026: 10 punti invece di 5;
// per-davide A.52). Un evento già registrato (creazione o livello) con meno punti liberi di quelli
// previsti dalle regole correnti non è un errore ma un completamento da fare, uno alla volta dal più
// vecchio: i punti si aggiungono all'evento a cui appartengono. I punti in più non si tolgono: si
// segnalano come eccesso.

const nomeEvento = (livello) => (livello === 1 ? 'creazione' : `${livello}° livello`);

/** Eventi di punti liberi del personaggio: creazione (livello 1) e livelli con «punti_abilita:N». */
function eventiPuntiLiberi(p, finoA, dati) {
  // punti liberi dell'evento per Abilità: nei file sono sempre separati dai +1 di Classe e dalle basi
  // (creazione.puntiAbilitaLiberi, livelli[i].puntiAbilita), quindi la provenienza non va ricostruita
  const perAbilita = (o) => Object.fromEntries(Object.entries(isOggetto(o) ? o : {}).filter(([, v]) => Number.isInteger(v) && v > 0));
  const validi = (o) => Object.values(perAbilita(o)).reduce((s, v) => s + v, 0);
  const out = [{ livello: 1, campo: 'creazione.puntiAbilitaLiberi', previsti: dati.regole.creazione.punti_abilita_liberi, assegnati: validi(p.creazione.puntiAbilitaLiberi), punti: perAbilita(p.creazione.puntiAbilitaLiberi) }];
  p.livelli.slice(0, finoA).forEach((v, i) => {
    const previsti = puntiEvento('punti_abilita', i + 2, dati);
    if (previsti) out.push({ livello: i + 2, campo: `livelli[${i}].puntiAbilita`, previsti, assegnati: validi(v.puntiAbilita), punti: perAbilita(v.puntiAbilita) });
  });
  return out;
}

// Regole del 29/09 (Giocatore §2.13, §8.3; per-davide A.57): i punti liberi già salvati che con i
// limiti del VA personale non aumentano più il VA sono inattivi. Non si tolgono dal personaggio: l'evento
// che li contiene diventa un completamento da fare, con quei punti da riassegnare («inattivi»).
function separaPuntiLiberi(p, errori, finoA, dati, stato = null) {
  const completamenti = [];
  const eccessi = [];
  const togli = new Set();
  const inattiviDi = (livello) => Object.fromEntries((stato?.inattivi ?? []).filter((x) => x.livello === livello).map((x) => [x.abilita, x.punti]));
  // la creazione ancora in corso (altre scelte mancanti) resta un normale «incompleto» del wizard
  const creazioneAperta = errori.some((e) => e.livello === 1 && e.campo !== 'creazione.puntiAbilitaLiberi' && !e.inattivi);
  for (const ev of eventiPuntiLiberi(p, finoA, dati)) {
    const { livello, previsti, assegnati } = ev;
    const aperta = livello === 1 && creazioneAperta;
    const inattivi = aperta ? {} : inattiviDi(livello);
    const nInattivi = somma(inattivi);
    const attivi = assegnati - nInattivi;
    if (attivi < previsti && !aperta) {
      completamenti.push({ livello, evento: nomeEvento(livello), previsti, assegnati, attivi, mancanti: previsti - attivi, inattivi, riassegna: nInattivi > 0 });
      togli.add(`${ev.campo}|incompleto`);
    }
    // i punti inattivi di un evento chiuso non sono errori: si riassegnano (o, oltre i previsti, sono eccesso)
    for (const a of Object.keys(inattivi)) togli.add(`${ev.campo}.${a}|inattivi`);
    if (assegnati > previsti) eccessi.push({ livello, evento: nomeEvento(livello), previsti, assegnati, eccesso: assegnati - previsti, abilita: ev.punti });
    togli.add(`${ev.campo}|eccesso`);
  }
  return { errori: errori.filter((e) => !togli.has(`${e.campo}|${e.inattivi ? 'inattivi' : e.tipo}`)), completamenti, eccessi };
}

/** Punti Abilità Liberi da completare (regole aggiornate), dal più vecchio; [] se nessuno. */
export function puntiDaCompletare(personaggio, dati) {
  return ricalcola(personaggio, dati).completamenti;
}

/**
 * Aggiunge i punti all'evento a cui appartengono (livello 1 = creazione): non crea eventi nuovi.
 * `togli`: punti inattivi dell'evento da riassegnare (regole del 29/09), che escono dall'evento.
 */
export function applicaCompletamento(personaggio, livello, punti, togli = {}) {
  const p = migraPersonaggio(personaggio);
  const unisci = (prima) => {
    const out = { ...(isOggetto(prima) ? prima : {}) };
    for (const [k, v] of Object.entries(togli ?? {})) {
      if (!Number.isInteger(v) || v <= 0 || !Number.isInteger(out[k])) continue;
      out[k] -= v;
      if (out[k] <= 0) delete out[k];
    }
    for (const [k, v] of Object.entries(punti ?? {})) if (Number.isInteger(v) && v > 0) out[k] = (out[k] ?? 0) + v;
    return out;
  };
  if (livello === 1) return { ...p, creazione: { ...p.creazione, puntiAbilitaLiberi: unisci(p.creazione.puntiAbilitaLiberi) } };
  return { ...p, livelli: p.livelli.map((v, j) => (j === livello - 2 ? { ...v, puntiAbilita: unisci(v.puntiAbilita) } : v)) };
}

/**
 * Valida i punti da aggiungere al primo evento da completare. Oltre ai limiti di quell'evento
 * (ogni punto aumenta il VA personale, §8.3; VA ≥ 1, §2.13) i punti non devono rendere irregolari i
 * livelli successivi né renderne inattivi i punti liberi.
 * @returns {{campo, problema, tipo: 'violazione'|'incompleto'}[]}
 */
export function validaCompletamento(personaggio, livello, punti, dati) {
  const errori = [];
  const err = (campo, problema, tipo = 'violazione') => errori.push({ campo, problema, tipo });
  const prima = ricalcola(personaggio, dati);
  const ev = prima.completamenti[0];
  if (!ev) return [{ campo: 'puntiAbilita', problema: 'nessun Punto Abilità Libero da completare', tipo: 'violazione' }];
  if (ev.livello !== livello) return [{ campo: 'puntiAbilita', problema: `si completa un evento alla volta, dal più vecchio: prima ${ev.evento === 'creazione' ? 'la creazione' : `il ${ev.evento}`}`, tipo: 'violazione' }];
  const pa = isOggetto(punti) ? punti : {};
  for (const [a, x] of Object.entries(pa)) {
    if (!trova(dati.abilita.abilita, a)) err(`puntiAbilita.${a}`, `"${a}" non è un'Abilità`);
    else if (!Number.isInteger(x) || x < 0) err(`puntiAbilita.${a}`, 'i punti devono essere interi ≥ 0');
  }
  if (errori.length) return errori;
  const spesi = somma(pa);
  if (spesi > ev.mancanti) err('puntiAbilita', `assegnati ${spesi} punti, ne mancano ${ev.mancanti}`);
  const nuovo = applicaCompletamento(personaggio, livello, pa, ev.inattivi);
  const dopo = ricalcola(nuovo, dati);
  // stato all'evento (i livelli partono dal 2°): per il limite di allora nei messaggi
  const statoEvento = ricalcola(nuovo, dati, livello - 1).stato;
  const chiave = (e) => `${e.campo}|${e.problema}`;
  const giaPrima = new Set(prima.errori.map(chiave));
  for (const e of dopo.errori.filter((x) => x.tipo === 'violazione' && !giaPrima.has(chiave(x)))) {
    const m = /\.(?:puntiAbilitaLiberi|puntiAbilita)\.(.+)$/.exec(e.campo);
    err(m ? `puntiAbilita.${m[1]}` : 'puntiAbilita', e.livello === livello ? e.problema : `${conOrdinale('al', e.livello)} livello: ${e.problema}`);
  }
  // §8.3: i punti nuovi devono aumentare il VA personale; e non devono rendere inattivi punti dei
  // livelli successivi (li si dovrebbe riassegnare di nuovo)
  const contaInattivi = (st) => {
    const m = new Map();
    for (const x of st?.inattivi ?? []) m.set(`${x.livello}|${x.abilita}`, (m.get(`${x.livello}|${x.abilita}`) ?? 0) + x.punti);
    return m;
  };
  const primaI = contaInattivi(prima.stato);
  for (const [k, n] of contaInattivi(dopo.stato)) {
    const [l, a] = k.split('|');
    const lv = Number(l);
    if (lv === livello) {
      const L = limiteDi(statoEvento, a, dati);
      err(`puntiAbilita.${a}`, `${n === 1 ? '1 punto non aumenta' : `${n} punti non aumentano`} il VA personale di ${a}: già al limite ${L.valore} (${dati.regole.competenze.categorie[L.categoria]?.nome ?? L.categoria}, §8.3)`);
    }
    else if (lv > livello && n > (primaI.get(k) ?? 0)) err(`puntiAbilita.${a}`, `renderebbe inattivi ${n - (primaI.get(k) ?? 0)} punti di ${a} ${conOrdinale('del', lv)} livello (§8.3)`);
  }
  if (spesi < ev.mancanti) err('puntiAbilita', `assegnati ${spesi} punti su ${ev.mancanti}`, 'incompleto');
  return errori;
}

/**
 * Dati del pannello di completamento per il primo evento da completare, con la bozza dei punti.
 * @returns {null|{livello, evento, previsti, assegnati, mancanti, rimasti, limite, errori, abilita: object[]}}
 */
export function statoCompletamento(personaggio, bozza, dati) {
  const p = migraPersonaggio(personaggio);
  const ev = ricalcola(p, dati).completamenti[0];
  if (!ev) return null;
  // Abilità a quell'evento, prima dei punti della bozza (dopo i +1 di Classe dell'evento)
  // stato all'evento: con i punti attivi dell'evento (senza quelli inattivi da riassegnare)
  const stato = ev.livello === 1 ? statoCreazione(p.creazione, dati).stato : ricalcola(p, dati, ev.livello - 1).stato;
  const pa = isOggetto(bozza) ? bozza : {};
  const rimasti = ev.mancanti - somma(pa);
  const prima = primaClasseDef(stato, dati);
  const abilita = dati.abilita.abilita.map(({ nome, categoria, caratteristica }) => {
    const x = stato.abil[nome];
    const avanzamento = x.daClasse + x.liberi;
    const punti = pa[nome] ?? 0;
    const lim = limiteDi(stato, nome, dati);
    const grezzo = grezzoDi(stato, nome, avanzamento, dati);
    const motivoPiu = rimasti <= 0 ? 'Nessun Punto Abilità da assegnare rimasto.'
      : validaCompletamento(p, ev.livello, { ...pa, [nome]: punti + 1 }, dati).find((e) => e.tipo === 'violazione')?.problema ?? null;
    return {
      nome, categoria, caratteristica, mod: modDi(stato, caratteristica, dati), base: baseIniziale(prima, nome, dati.regole),
      competenza: competenzaDi(prima, nome), limite: lim.valore, limiteCategoria: lim.categoria, limiteDa: lim.classi, grezzo,
      corporazione: stato.corp.abilita_bonus.includes(nome) ? 1 : 0, avanzamento, daClasse: x.daClasse,
      totale: vaPersonale(grezzo, lim.valore), punti, motivoPiu, inattivi: ev.inattivi?.[nome] ?? 0,
    };
  });
  return { ...ev, rimasti, errori: validaCompletamento(p, ev.livello, pa, dati), abilita };
}

/** Perché non si sale di livello finché ci sono punti da completare o da riassegnare (regole aggiornate). */
export function motivoCompletamento(completamenti) {
  const n = completamenti.reduce((s, c) => s + c.mancanti, 0);
  const dove = completamenti.map((c) => `${c.mancanti} ${c.livello === 1 ? 'della creazione' : `${conOrdinale('del', c.livello)} livello`}`).join(', ');
  const verbo = completamenti.some((c) => c.riassegna) ? 'assegna o riassegna' : 'assegna';
  return `Regole aggiornate: prima di salire di livello ${verbo} ${n} Punti Abilità (${dove}) con «Assegna» in cima alla scheda.`;
}

/**
 * Perché non si sale di livello con punti in eccesso (A.108, E&L del 05/10/2026): vanno tolti prima, dalle assegnazioni
 * che sceglie il giocatore; i punti tolti non si riassegnano.
 */
export function motivoEccesso(eccessi) {
  const lista = (eccessi ?? []).filter((e) => e.eccesso > 0);
  const n = lista.reduce((s, e) => s + e.eccesso, 0);
  const dove = lista.map((e) => `${e.eccesso} ${e.livello === 1 ? 'della creazione' : conOrdinale('del', e.livello) + ' livello'}`).join(', ');
  return `Punti Abilità in eccesso (A.108): prima di salire di livello togli ${n} ${n === 1 ? 'punto' : 'punti'} (${dove}) con «Togli» in cima alla scheda, scegliendo tu da quali Abilità.`;
}

// ---------------------------------------------------------------------------
// Punti Abilità Liberi in eccesso (7 a ogni Grado, compreso il primo: Giocatore del 03/10/2026 sera, confermato
// da Davide il 04/10, A.90; prima 10, poi 5). Un evento già registrato con più punti liberi di quelli previsti dalle regole
// correnti resta valido e la scheda utilizzabile, ma il giocatore deve togliere i punti in più: un evento
// alla volta, dal più vecchio, scegliendo da quali Abilità dei punti liberi di quell'evento.

/**
 * Avviso dei punti in eccesso, con il testo di regole.json → regole_aggiornate.eccesso ({n} = punti in più).
 * @returns {null|{ totale, testo, eventi: { livello, evento, previsti, assegnati, eccesso, abilita, testo }[] }}
 */
export function avvisoPuntiEccesso(eccessi, dati) {
  const lista = (eccessi ?? []).filter((e) => e.eccesso > 0);
  if (!lista.length) return null;
  const totale = lista.reduce((s, e) => s + e.eccesso, 0);
  const modello = dati.regole.regole_aggiornate?.eccesso ?? 'Hai {n} Punti Abilità Liberi in più del consentito: togline {n}';
  const elencoAbilita = (o) => Object.entries(o ?? {}).map(([n, v]) => `${n} ${v}`).join(', ');
  return {
    totale,
    testo: modello.replaceAll('{n}', String(totale)),
    eventi: lista.map((e) => ({
      ...e,
      testo: `${e.livello === 1 ? 'Creazione' : `${e.livello}° livello`}: ${e.assegnati} punti liberi su ${e.previsti} consentiti, ${e.eccesso} da togliere`
        + (Object.keys(e.abilita ?? {}).length ? ` (punti liberi a ${elencoAbilita(e.abilita)})` : ''),
    })),
  };
}

/** Toglie i punti all'evento a cui appartengono (livello 1 = creazione). */
export function applicaRimozione(personaggio, livello, togli) {
  return applicaCompletamento(personaggio, livello, {}, togli);
}

/**
 * Valida i punti da togliere al primo evento in eccesso: solo punti liberi di quell'evento, esattamente
 * l'eccesso; togliendoli i livelli successivi non devono diventare irregolari (VA ≥ 1 prima dei punti
 * liberi, §2.13; punti che non aumentano il VA, §8.3).
 * @returns {{campo, problema, tipo: 'violazione'|'incompleto'}[]}
 */
export function validaRimozione(personaggio, livello, togli, dati) {
  const errori = [];
  const err = (campo, problema, tipo = 'violazione') => errori.push({ campo, problema, tipo });
  const prima = ricalcola(personaggio, dati);
  if (!prima.eccessi.length) return [{ campo: 'puntiAbilita', problema: 'nessun Punto Abilità Libero in eccesso', tipo: 'violazione' }];
  // A.108: l'evento (e le assegnazioni) li sceglie il giocatore, in qualunque ordine
  const ev = prima.eccessi.find((e) => e.livello === livello);
  if (!ev) return [{ campo: 'puntiAbilita', problema: `${livello === 1 ? 'la creazione' : `il ${nomeEvento(livello)}`} non ha punti in eccesso`, tipo: 'violazione' }];
  const t = isOggetto(togli) ? togli : {};
  for (const [a, x] of Object.entries(t)) {
    if (!Number.isInteger(x) || x < 0) err(`puntiAbilita.${a}`, 'i punti devono essere interi ≥ 0');
    else if (x > (ev.abilita[a] ?? 0)) err(`puntiAbilita.${a}`, `${a} ha ${ev.abilita[a] ?? 0} punti liberi ${ev.livello === 1 ? 'della creazione' : `${conOrdinale('del', ev.livello)} livello`}`);
  }
  if (errori.length) return errori;
  const n = somma(t);
  if (n > ev.eccesso) err('puntiAbilita', `tolti ${n} punti, ne bastano ${ev.eccesso}`);
  const dopo = ricalcola(applicaRimozione(personaggio, livello, t), dati);
  const chiave = (e) => `${e.campo}|${e.problema}`;
  const giaPrima = new Set(prima.errori.map(chiave));
  for (const e of dopo.errori.filter((x) => x.tipo === 'violazione' && !giaPrima.has(chiave(x)))) {
    err('puntiAbilita', e.livello && e.livello !== livello ? `${conOrdinale('al', e.livello)} livello: ${e.problema}` : e.problema);
  }
  if (n < ev.eccesso) err('puntiAbilita', `tolti ${n} punti su ${ev.eccesso}`, 'incompleto');
  return errori;
}

/**
 * Dati del pannello «Togli» per il primo evento in eccesso, con la bozza dei punti da togliere.
 * @returns {null|{ livello, evento, previsti, assegnati, eccesso, rimasti, errori, abilita: { nome, punti, togli, motivoPiu }[] }}
 */
export function statoRimozione(personaggio, bozza, dati, livello = null) {
  const p = migraPersonaggio(personaggio);
  const tutti = ricalcola(p, dati).eccessi;
  // A.108: l'evento da cui togliere lo sceglie il giocatore (di norma il primo)
  const ev = tutti.find((e) => e.livello === livello) ?? tutti[0];
  if (!ev) return null;
  const t = isOggetto(bozza) ? bozza : {};
  const rimasti = ev.eccesso - somma(t);
  // punti di questo evento che già non aumentano il VA (§8.3): togliendoli il VA della scheda non cambia (solo un'indicazione:
  // la scelta resta al giocatore, A.108)
  const inattivi = Object.fromEntries((ricalcola(p, dati).stato?.inattivi ?? []).filter((x) => x.livello === ev.livello).map((x) => [x.abilita, x.punti]));
  const abilita = Object.entries(ev.abilita).map(([nome, punti]) => {
    const togli = t[nome] ?? 0;
    const motivoPiu = rimasti <= 0 ? 'Hai già scelto tutti i punti da togliere.' : togli >= punti ? 'Nessun altro punto libero di questo evento.'
      : validaRimozione(p, ev.livello, { ...t, [nome]: togli + 1 }, dati).find((e) => e.tipo === 'violazione')?.problema ?? null;
    return { nome, punti, togli, motivoPiu, inattivi: inattivi[nome] ?? 0 };
  });
  return { ...ev, rimasti, errori: validaRimozione(p, ev.livello, t, dati), abilita, eventi: tutti.map((e) => ({ livello: e.livello, evento: e.evento, eccesso: e.eccesso })) };
}

// ---------------------------------------------------------------------------
// Correzione di un livello passato (A.107, E&L del 05/10/2026): la voce del livello si sostituisce e i livelli
// successivi si ricalcolano in ordine. I punti liberi successivi che nella cronologia corretta non aumentano più il VA
// al momento della loro assegnazione diventano inattivi e si riassegnano nello stesso evento («Assegna», con i limiti di
// allora: statoCompletamento); le altre assegnazioni restano. Finché mancano, la salita di livello è bloccata
// (validaLivello). Un punto legittimo non si restituisce per un aumento automatico successivo (+1 di Classe,
// Caratteristica): applicaVoce valuta ogni punto quando viene assegnato.

/** Il personaggio fino al livello prima di `livello` (2…): la base della procedura di correzione. */
export function personaggioPrimaDi(personaggio, livello) {
  const p = migraPersonaggio(personaggio);
  return { ...p, livelli: p.livelli.slice(0, Math.max(0, livello - 2)) };
}

/** A.107: sostituisce la voce del livello `livello` (2…); i livelli successivi restano com'erano e si ricalcolano. */
export function applicaCorrezione(personaggio, livello, voce) {
  const p = migraPersonaggio(personaggio);
  return { ...p, livelli: p.livelli.map((v, j) => (j === livello - 2 ? { ...voce, livello } : v)) };
}

/** Punti inattivi per evento e Abilità: «livello|Abilità» → punti. */
const mappaInattivi = (stato) => {
  const m = new Map();
  for (const x of stato?.inattivi ?? []) m.set(`${x.livello}|${x.abilita}`, (m.get(`${x.livello}|${x.abilita}`) ?? 0) + x.punti);
  return m;
};

/**
 * A.107: conseguenze della correzione sui livelli successivi, per evento: i punti liberi che diventano da riassegnare
 * (abilita) e quelli già da riassegnare che tornano validi (tornano).
 * @returns {{ livello, evento, abilita: { [nome]: punti }, tornano: { [nome]: punti } }[]}
 */
export function conseguenzeCorrezione(personaggio, livello, voce, dati) {
  const prima = mappaInattivi(ricalcola(personaggio, dati).stato);
  const dopo = mappaInattivi(ricalcola(applicaCorrezione(personaggio, livello, voce), dati).stato);
  const out = new Map();
  const evento = (lv) => out.get(lv) ?? out.set(lv, { livello: lv, evento: nomeEvento(lv), abilita: {}, tornano: {} }).get(lv);
  for (const k of new Set([...prima.keys(), ...dopo.keys()])) {
    const [l, a] = k.split('|');
    const lv = Number(l);
    const diff = (dopo.get(k) ?? 0) - (prima.get(k) ?? 0);
    if (lv <= livello || !diff) continue;
    // diff > 0: da riassegnare; diff < 0: punti già da riassegnare che con la correzione tornano validi
    if (diff > 0) evento(lv).abilita[a] = diff;
    else evento(lv).tornano[a] = -diff;
  }
  return [...out.values()].sort((x, y) => x.livello - y.livello);
}

/**
 * A.107: errori della correzione del livello `livello` con la voce nuova. Valgono le regole di quel livello (le stesse
 * di «Sali di livello», con i 7 Punti Abilità della A.108: niente eccesso); i livelli successivi non devono diventare
 * irregolari, salvo i punti liberi da riassegnare (conseguenzeCorrezione), che non sono errori.
 * @returns {{campo, problema, tipo: 'violazione'|'incompleto'}[]}
 */
export function validaCorrezione(personaggio, livello, voce, dati, { procedi = false } = {}) {
  const p = migraPersonaggio(personaggio);
  if (!Number.isInteger(livello) || livello < 2 || livello > p.livelli.length + 1) return [{ campo: 'livello', problema: `non c'è un ${livello}° livello da correggere`, tipo: 'violazione' }];
  const base = ricalcola(p, dati, livello - 2);
  if (!base.stato) return [{ campo: 'creazione', problema: 'la creazione non si può calcolare: correggila prima', tipo: 'violazione' }];
  const v = isOggetto(voce) ? { ...voce, livello } : { livello };
  const errori = controllaVoce(base.stato, v, dati).map((e) => (e.tipo === 'eccesso' ? { ...e, tipo: 'violazione' } : e));
  const chiave = (e) => `${e.campo}|${e.problema}`;
  const primaErr = new Set(ricalcola(p, dati).errori.filter((e) => e.livello > livello).map(chiave));
  for (const e of ricalcola(applicaCorrezione(p, livello, v), dati).errori) {
    if (e.livello <= livello || e.tipo !== 'violazione' || primaErr.has(chiave(e))) continue;
    // N2: un livello dopo che diventerebbe irregolare è un avviso: con `procedi` la correzione si fa lo stesso
    if (!procedi) errori.push({ campo: 'livelli', problema: `il ${nomeEvento(e.livello)} diventerebbe irregolare: ${e.problema}`, tipo: 'violazione', procedibile: true });
  }
  return errori;
}

/**
 * Valida le scelte del prossimo livello del personaggio.
 * @returns {{campo, problema, tipo: 'violazione'|'incompleto'}[]}
 */
export function validaLivello(personaggio, scelte, dati, { procedi = false } = {}) {
  const { stato, errori } = ricalcola(personaggio, dati);
  if (!stato) return [{ campo: 'creazione', problema: 'la creazione non si può calcolare: correggila prima di salire di livello', tipo: 'violazione' }];
  const { completamenti, eccessi } = ricalcola(personaggio, dati);
  // A.108 (E&L del 05/10/2026): i punti in eccesso bloccano la salita finché la scheda non è riconciliata
  // N2 (l'app avvisa, non blocca): con `procedi` il master ha deciso di salire lo stesso («Procedi comunque», riga nello storico)
  if (eccessi.length && !procedi) return [{ campo: 'livelli', problema: motivoEccesso(eccessi), tipo: 'violazione', procedibile: true }];
  if (completamenti.length && !procedi) return [{ campo: 'livelli', problema: motivoCompletamento(completamenti), tipo: 'violazione', procedibile: true }];
  // Talenti v1.0: una scelta non ammessa c'è solo se l'ha forzata il Direttore; avvisa con «Procedi comunque», non blocca
  // A.188 (28/10): un incantesimo fuori da quote, famiglie o livello massimo c'è solo se l'ha forzato il Direttore (o è di prima
  // della regola): avvisa con «Procedi comunque», non blocca la salita
  const sceltaTalento = (e) => (stato.regime === 'nuovo' && /(^|\.)(talentoLibero|maestria|specializzazione|specializzazioneIniziale)$/.test(e.campo ?? '')) || /(^|\.)incantesimi$/.test(e.campo ?? '');
  const forzate = errori.filter((e) => e.tipo === 'violazione' && sceltaTalento(e));
  const bloccanti = errori.filter((e) => e.tipo === 'violazione' && !sceltaTalento(e));
  if (forzate.length && !bloccanti.length && !procedi) return [{ campo: 'livelli', problema: `una scelta dei Talenti o degli incantesimi non è ammessa dalle regole (forzata dal Direttore: ${forzate[0].problema})`, tipo: 'violazione', procedibile: true }];
  if (bloccanti.length) {
    return [{ campo: 'livelli', problema: `i livelli già acquisiti contengono errori (${bloccanti[0].problema}): annulla l’ultimo livello e correggilo`, tipo: 'violazione' }];
  }
  return controllaVoce(stato, scelte, dati);
}

/**
 * Cosa succede al prossimo livello e quali scelte sono ammesse. null se il personaggio è al
 * livello massimo o la creazione non si può calcolare.
 */
export function prossimoLivello(personaggio, dati) {
  const { stato } = ricalcola(personaggio, dati);
  if (!stato) return null;
  const n = stato.livello + 1;
  const av = dati.regole.avanzamento;
  if (n > av.livello_massimo) return null;
  const eventi = eventiLivello(n, dati);
  const out = {
    livello: n,
    eventi,
    puntiCaratteristica: puntiEvento('caratteristiche', n, dati),
    puntiAbilita: puntiEvento('punti_abilita', n, dati),
    massimoCaratteristica: massimoCaratteristica(n, dati),
    caratteristiche: Object.fromEntries(Object.entries(stato.car).map(([s, v]) => [s, { valore: v, massimo: massimoCaratteristica(n, dati) }])),
    // limite del VA personale prima del Grado di questo livello (§8.7: la Classe scelta lo può alzare)
    abilita: Object.entries(stato.abil).map(([nome, x]) => ({ nome, avanzamento: x.daClasse + x.liberi, limite: limiteDi(stato, nome, dati).valore })),
    classi: [],
    talentiLiberi: [],
    incantesimi: statoQuote(stato, dati),
    tecnicheAmmesse: tecnicheAmmesse(stato),
  };
  if (eventi.includes('grado_classe')) {
    for (const def of dati.classi.classi) {
      const posseduta = stato.classi.find((c) => c.nome === def.nome);
      const prossimo = (posseduta?.grado ?? 0) + 1;
      let motivo = null;
      if (posseduta && posseduta.grado >= av.grado_massimo) motivo = `già al Grado ${GRADI_ROMANI[av.grado_massimo]}`;
      else if (!posseduta && stato.classi.length >= av.classi_massime) motivo = `già ${av.classi_massime} Classi`;
      else if (eTaumaturgica(def, dati) && possiedeRisorseInteriori(stato)) motivo = 'incompatibile con Risorse Interiori (§8.6.10)';
      out.classi.push({
        nome: def.nome, addestramento: def.addestramento, gradoAttuale: posseduta?.grado ?? 0, prossimoGrado: prossimo,
        ammessa: !motivo, motivo,
        talentoFisso: av.gradi_talento_fisso.includes(prossimo) ? def.talenti_fissi[av.gradi_talento_fisso.indexOf(prossimo)]?.nome ?? null : null,
        talentiAScelta: av.gradi_talento_a_scelta.includes(prossimo)
          ? def.talenti_a_scelta.filter((t) => !posseduta?.talenti.some((x) => x.nome === t.nome)).map((t) => t.nome) : [],
        tiroPV: def.pv_per_grado.dado ? specTiro({ facce: def.pv_per_grado.dado }) : null,
        tiroPM: def.pm_per_grado.dado ? specTiro({ facce: def.pm_per_grado.dado }) : null,
      });
    }
  }
  // §8.6 e Talenti v1.0: le opzioni vengono dal controllo unico (controllaSceltaTalento). Regime vecchio: Talenti
  // Liberi e Specializzazioni insieme, come prima; regime nuovo: le tre categorie, ciascuna nel suo livello.
  if (eventi.includes('talento_libero')) out.talentiLiberi = opzioniCategoria(stato, 'talento_libero', dati);
  if (stato.regime === 'nuovo') {
    out.regimeTalenti = 'nuovo';
    if (livelliCategoria('maestria', n, dati).includes(n)) out.maestrie = opzioniCategoria(stato, 'maestria', dati);
    // la Specializzazione dipende dalla Classe aumentata: un elenco per ciascuna Classe ammessa
    if (eventi.includes('grado_classe') && livelliCategoria('specializzazione', n, dati).includes(n)) {
      out.specializzazioni = Object.fromEntries(out.classi.filter((c) => c.ammessa).map((c) => [c.nome, opzioniCategoria(stato, 'specializzazione', dati, { classe: c.nome })]));
    }
  }
  return out;
}

/**
 * Talenti v1.0 — i posti dei Talenti di un personaggio: quanti gliene spettano per categoria al suo livello, quali
 * sono già scelti e, per ogni posto, le scelte valide con i prerequisiti in ordine di livello (lo stato è quello
 * subito prima del posto: contano le scelte dei livelli precedenti, non quelle dei successivi).
 * È l'unico punto in cui si fa questo conto: lo usa la scelta guidata (lotto 2) e la migrazione dei PG.
 *
 * Regime vecchio (PG salvati prima dei Talenti v1.0): i posti sono quelli del regime nuovo, tutti vuoti, e i
 * Talenti di oggi stanno in `vecchi` con la categoria nuova suggerita (la migrazione li toglie e li riscrive);
 * le opzioni si calcolano come se il personaggio fosse già nel regime nuovo, senza quei Talenti.
 * @returns {{ regime, livello, categorie: { [cat]: { nome, spettanti, scelti, mancanti } }, posti: [{ categoria,
 *   livello, classe, scelta, valida, problemi, opzioni }], prossimo, vecchi }}
 */
export function postiTalenti(personaggio, dati, { opzioni = true } = {}) {
  const p = migraPersonaggio(personaggio);
  const livello = 1 + p.livelli.length;
  const nuovo = regimeTalentiNuovo(p.creazione);
  // il personaggio come sarebbe nel regime nuovo: nel vecchio, senza i Talenti Liberi di prima (stanno in «vecchi»)
  const base = nuovo ? p : {
    ...p,
    creazione: { ...p.creazione, regimeTalenti: 2, specializzazioneIniziale: null },
    livelli: p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; delete x.maestria; delete x.specializzazione; return x; }),
  };
  const sceltaDi = (cat, n) => (n === 1 ? (cat === 'specializzazione' ? base.creazione.specializzazioneIniziale : null) : base.livelli[n - 2]?.[CAMPO_CATEGORIA[cat]]) ?? null;
  const classeDi = (cat, n) => (cat !== 'specializzazione' ? null : n === 1 ? base.creazione.classe ?? null : base.livelli[n - 2]?.grado?.classe ?? null);
  // lo stato subito prima del posto (livello n, categoria cat): eventi fino a n − 1, poi le Caratteristiche di n
  const senzaDaQui = (n) => ({
    ...base,
    creazione: n === 1 ? { ...base.creazione, specializzazioneIniziale: null } : base.creazione,
    livelli: base.livelli.slice(0, Math.max(0, n - 2)),
  });
  const statoPrima = (n) => {
    const { stato } = ricalcola(senzaDaQui(n), dati);
    if (!stato || n === 1) return stato;
    const conCar = applicaVoce(stato, { caratteristiche: base.livelli[n - 2]?.caratteristiche }, dati);
    conCar.livello = stato.livello;
    return conCar;
  };
  const posti = [];
  for (const cat of CATEGORIE_TALENTI) {
    for (const n of livelliCategoria(cat, livello, dati)) {
      const scelta = sceltaDi(cat, n);
      const classe = classeDi(cat, n);
      const prima = (opzioni || scelta) ? statoPrima(n) : null;
      const problemi = prima ? controllaSceltaTalento(prima, cat, scelta, dati, { classe }).filter((e) => e.tipo !== 'incompleto' || scelta) : [];
      posti.push({
        categoria: cat, livello: n, classe, scelta: scelta ?? null,
        // chiuso dal Direttore: il giocatore non lo cambia più (lo cambia solo «Modifica master»)
        chiuso: Number.isInteger(p.creazione?.talentiChiusiFino) && n <= p.creazione.talentiChiusiFino,
        valida: !!scelta && !problemi.some((e) => e.tipo === 'violazione'), problemi: scelta ? problemi : [],
        opzioni: opzioni && !scelta && prima ? opzioniCategoria(prima, cat, dati, { classe }) : null,
      });
    }
  }
  posti.sort((a, b) => a.livello - b.livello || CATEGORIE_TALENTI.indexOf(a.categoria) - CATEGORIE_TALENTI.indexOf(b.categoria));
  const categorie = Object.fromEntries(CATEGORIE_TALENTI.map((cat) => {
    const miei = posti.filter((x) => x.categoria === cat);
    const scelti = miei.filter((x) => x.scelta).length;
    return [cat, { nome: NOME_CATEGORIA[cat], spettanti: miei.length, scelti, mancanti: miei.length - scelti }];
  }));
  // regime vecchio: i Talenti di oggi, con la categoria che hanno nei Talenti v1.0 (o la voce che li sostituisce)
  const vecchi = nuovo ? [] : p.livelli.flatMap((v, i) => (isOggetto(v.talentoLibero) ? [{ livello: i + 2, ...v.talentoLibero }] : [])).map((t) => {
    const def = talentoLiberoDef(t.id, dati);
    const dopo = def?.categoria === 'superato' ? talentoLiberoDef(def.sostituito_da, dati) : def;
    return { ...t, nome: def?.nome ?? t.id, categoria: categoriaDi(dopo), sostituitoDa: def?.categoria === 'superato' ? def.sostituito_da : null };
  });
  return { regime: nuovo ? 'nuovo' : 'vecchio', livello, categorie, posti, prossimo: posti.find((x) => !x.scelta) ?? null, vecchi };
}

/**
 * Talenti v1.0: il personaggio con la scelta `scelta` nel posto `posto` ({ categoria, livello }), oppure con il posto
 * svuotato se `scelta` è null (per cambiarla). Non controlla niente: il controllo è controllaSceltaTalento (via
 * postiTalenti), e la scheda lo rifà a ogni calcolo. Pura.
 */
export function applicaSceltaTalento(personaggio, posto, scelta) {
  const p = migraPersonaggio(personaggio);
  const pulita = isOggetto(scelta) && scelta.id ? {
    id: scelta.id,
    ...(scelta.parametro ? { parametro: scelta.parametro } : {}),
    ...(typeof scelta.annotazione === 'string' && scelta.annotazione.trim() ? { annotazione: scelta.annotazione.trim() } : {}),
  } : null;
  if (posto.livello === 1) {
    if (posto.categoria !== 'specializzazione') throw new Error('al 1° livello c’è solo la Specializzazione');
    return { ...p, creazione: { ...p.creazione, specializzazioneIniziale: pulita } };
  }
  const i = posto.livello - 2;
  if (!p.livelli[i]) throw new Error(`il personaggio non ha il ${posto.livello}° livello`);
  const campo = CAMPO_CATEGORIA[posto.categoria];
  const voce = { ...p.livelli[i] };
  if (pulita) voce[campo] = pulita; else delete voce[campo];
  return { ...p, livelli: p.livelli.map((v, k) => (k === i ? voce : v)) };
}

// ---------------------------------------------------------------------------
// Talenti v1.0 (25/10/2026, sera): le scelte che un Talento apre dopo averlo preso. Oggi sono gli Incantesimi (Usufruitore di
// Magia, Incrementare Incantesimi; Magia sez. 1) e le Tecniche Interiori (Risorse Interiori, Tecniche Interiori
// Supplementari; §8.6.10). Il conto è quello della validazione dei livelli (controllaIncantesimi, controllaTecniche):
// a un livello in cui la quota sale restano da scegliere quelli che mancano. Si registrano nella voce di quel livello
// (livelli[i].incantesimi, livelli[i].tecniche), come in «Sali di livello». La Caratteristica, la Salvezza e la nota
// (Sport, Poliglotta) si chiedono invece insieme al Talento, prima di sceglierlo.

/** Gli stati del personaggio livello per livello: [dopo la creazione, dopo il 2°, …]. */
function statiPerLivello(p, dati) {
  const { stato: iniziale } = ricalcola(p, dati, 0);
  if (!iniziale) return null;
  const stati = [iniziale];
  for (const v of p.livelli) stati.push(applicaVoce(stati.at(-1), v, dati));
  return stati;
}

/** Perché la quota è salita a questo livello: i Talenti presi qui che la danno, o il Grado, o l'Intelligenza. */
function fontiAumento(prima, dopo, n, tipo, dati) {
  const talenti = dopo.talentiLiberi.filter((t) => t.livello === n && talentoLiberoDef(t.id, dati)?.effetti?.[tipo] !== undefined)
    .map((t) => talentoLiberoDef(t.id, dati).nome);
  if (talenti.length) return talenti;
  const classe = dopo.classi.find((c) => (prima.classi.find((x) => x.nome === c.nome)?.grado ?? 0) < c.grado);
  if (classe) return [`${classe.nome}, Grado ${GRADI_ROMANI[classe.grado] ?? classe.grado}`];
  return [tipo === 'incantesimi' ? 'Intelligenza più alta' : 'Saggezza più alta'];
}

/**
 * Le opzioni di un incantesimo da scegliere: livello massimo, già conosciuti, quote di Classe e liberi.
 * `notiAltrove`: conosciuti in qualunque livello (anche successivo), che non si offrono di nuovo.
 */
function opzioniIncantesimi(dopo, dati, notiAltrove = []) {
  const q = statoQuote(dopo, dati);
  const noti = new Set([...dopo.incantesimi, ...notiAltrove]);
  const perMacro = Object.fromEntries(Object.keys(q.perMacro).map((m) => [m, { quota: q.perMacro[m] ?? 0, scelti: q.noti.filter((i) => i.macrofamiglia === m).length }]));
  const conto = { livelloMassimo: q.livelloMassimo, accesso: q.accesso, perMacro, liberi: q.liberi, liberiUsati: q.liberiUsati };
  // A.188 (28/10): quote, famiglie accessibili e livello massimo valgono di nuovo per il giocatore (in grigio, con il motivo);
  // il Direttore può forzare con conferma e registrazione. Il conto è quello di src/quote-incantesimi.js
  return dati.incantesimi.incantesimi.filter((i) => !noti.has(i.nome)).map((i) => ({
    id: i.nome, nome: i.nome, gruppo: `${i.macrofamiglia} · ${i.specializzazione}`, livelloBase: i.livello_base, ...(() => { const motivo = avvisoIncantesimo(i, conto); return { ammesso: !motivo, motivo }; })(),
  }));
}

/** Le opzioni di una Tecnica Interiore da scegliere (§8.9.2–8.9.4). */
function opzioniTecniche(dopo, dati, notiAltrove = []) {
  const noti = new Set([...dopo.tecniche.map((t) => t.id), ...notiAltrove]);
  return dati.tecniche_interiori.tecniche.filter((t) => !noti.has(t.id)).map((t) => {
    const scuola = t.gruppo.startsWith('scuola:') ? t.gruppo.slice(7) : null;
    const motivo = t.gruppo === 'lottatore' && !dopo.classi.some((c) => c.nome === 'Lottatore') ? 'è una Tecnica del Lottatore (§8.9.4)'
      : scuola && dopo.corp.nome !== 'Mishima' ? `appartiene alla Scuola Mishima ${scuola}: serve la Corporazione Mishima (§8.9.3)`
        : scuola && dopo.scuola?.nome !== scuola ? `serve l’iniziazione alla Scuola ${scuola}, da concordare con il Direttore (§8.9.3)` : null;
    return { id: t.id, nome: t.nome, gruppo: scuola ? `Scuola ${scuola}` : t.gruppo === 'lottatore' ? 'Lottatore' : 'generica', ammesso: !motivo, motivo };
  });
}

/**
 * Le scelte aperte da un Talento (o da un aumento di quota) e non ancora fatte, livello per livello.
 * @returns {[{ tipo: 'incantesimi'|'tecniche', livello, quanti, fonti: string[], livelloMassimo?, opzioni }]}
 */
export function scelteSuccessive(personaggio, dati, { opzioni = true } = {}) {
  const p = migraPersonaggio(personaggio);
  if (!p.livelli.length) return [];
  let stati;
  try { stati = statiPerLivello(p, dati); } catch { return []; }
  if (!stati) return [];
  const out = [];
  let incPrima = 0;
  let tecPrima = 0;
  // la scheda finita: quelli già conosciuti in un livello successivo (per esempio le Tecniche rimaste da un Talento tolto
  // nel passaggio, A.184) contano, e non si offrono di nuovo; non si chiede mai più di quanto manca alla fine
  const finale = stati.at(-1);
  const qF = statoQuote(finale, dati);
  const mancaIncFinale = qF.totale - qF.noti.length;
  const mancaTecFinale = tecnicheAmmesse(finale) - finale.tecniche.length;
  const incFinali = finale.incantesimi;
  const tecFinali = finale.tecniche.map((t) => t.id);
  p.livelli.forEach((_, i) => {
    const prima = stati[i];
    const dopo = stati[i + 1];
    const n = i + 2;
    const qP = statoQuote(prima, dati);
    const qD = statoQuote(dopo, dati);
    const mancaInc = Math.min(qD.totale - qD.noti.length, mancaIncFinale) - incPrima;
    if (qD.totale > qP.totale && mancaInc > 0) {
      const quanti = Math.min(mancaInc, qD.totale - qP.totale);
      out.push({ tipo: 'incantesimi', livello: n, quanti, fonti: fontiAumento(prima, dopo, n, 'incantesimi', dati), livelloMassimo: qD.livelloMassimo, opzioni: opzioni ? opzioniIncantesimi(dopo, dati, incFinali) : null });
      incPrima += quanti;
    }
    const ammP = tecnicheAmmesse(prima);
    const ammD = tecnicheAmmesse(dopo);
    const mancaTec = Math.min(ammD - dopo.tecniche.length, mancaTecFinale) - tecPrima;
    if (ammD > ammP && mancaTec > 0) {
      const quanti = Math.min(mancaTec, ammD - ammP);
      out.push({ tipo: 'tecniche', livello: n, quanti, fonti: fontiAumento(prima, dopo, n, 'tecniche', dati), opzioni: opzioni ? opzioniTecniche(dopo, dati, tecFinali) : null });
      tecPrima += quanti;
    }
  });
  return out;
}

/** Il personaggio con l'incantesimo (nome) o la Tecnica (id) aggiunti alla voce del livello. Pura, senza controlli. */
export function applicaSceltaSuccessiva(personaggio, { tipo, livello }, id) {
  if (tipo !== 'incantesimi' && tipo !== 'tecniche') throw new Error(`scelta successiva sconosciuta: ${tipo}`);
  const p = migraPersonaggio(personaggio);
  const i = livello - 2;
  if (!p.livelli[i]) throw new Error(`il personaggio non ha il ${livello}° livello`);
  const voce = { ...p.livelli[i] };
  const lista = Array.isArray(voce[tipo]) ? voce[tipo] : [];
  if (!lista.includes(id)) voce[tipo] = [...lista, id];
  return { ...p, livelli: p.livelli.map((v, k) => (k === i ? voce : v)) };
}

/**
 * Dopo aver tolto o cambiato un Talento del livello: gli Incantesimi e le Tecniche scelti in quel livello che le quote
 * non ammettono più si tolgono, dagli ultimi scelti. Restituisce { personaggio, tolti: [nomi] }. Pura.
 */
export function adattaScelteSuccessive(personaggio, livello, dati) {
  let p = migraPersonaggio(personaggio);
  const i = livello - 2;
  if (!p.livelli[i]) return { personaggio: p, tolti: [] };
  const tolti = [];
  let stati;
  try { stati = statiPerLivello(p, dati); } catch { return { personaggio: p, tolti }; }
  if (!stati) return { personaggio: p, tolti };
  const voce = { ...p.livelli[i] };
  const inc = [...(Array.isArray(voce.incantesimi) ? voce.incantesimi : [])];
  const tec = [...(Array.isArray(voce.tecniche) ? voce.tecniche : [])];
  const prima = stati[i];
  const oltre = () => {
    const d = applicaVoce(prima, { ...voce, incantesimi: inc, tecniche: tec }, dati);
    const q = statoQuote(d, dati);
    return { inc: q.noti.length > q.totale || q.liberiUsati > q.liberi, tec: d.tecniche.length > tecnicheAmmesse(d) };
  };
  for (let o = oltre(); o.inc && inc.length; o = oltre()) tolti.push(inc.pop());
  for (let o = oltre(); o.tec && tec.length; o = oltre()) {
    const id = tec.pop();
    tolti.push(dati.tecniche_interiori.tecniche.find((t) => t.id === id)?.nome ?? id);
  }
  if (!tolti.length) return { personaggio: p, tolti };
  if (inc.length) voce.incantesimi = inc; else delete voce.incantesimi;
  if (tec.length) voce.tecniche = tec; else delete voce.tecniche;
  p = { ...p, livelli: p.livelli.map((v, k) => (k === i ? voce : v)) };
  return { personaggio: p, tolti };
}

/** Gli errori che le regole danno sulle scelte successive (Incantesimi, Tecniche) di ogni livello: per il server. */
export function erroriScelteSuccessive(personaggio, dati) {
  return ricalcola(personaggio, dati).errori.filter((e) => /^livelli\[\d+\]\.(incantesimi|tecniche|scuolaMishima)$/.test(e.campo ?? ''));
}

/** Le scelte dei Talenti di un personaggio, posto per posto ({ «categoria:livello»: scelta }): per confrontare due versioni. */
export function sceltePerPosto(personaggio, dati) {
  return Object.fromEntries(postiTalenti(personaggio, dati, { opzioni: false }).posti.map((x) => [`${x.categoria}:${x.livello}`, x.scelta ? JSON.stringify(x.scelta) : null]));
}

function salvezzeDi(stato, dati) {
  const r = dati.regole;
  const avanz = cumulato('salvezze', stato.livello, dati);
  const talenti = talentiConEffetti(stato, dati);
  const out = {};
  for (const { id, nome, caratteristica } of dati.caratteristiche.salvezze) {
    const componenti = {
      base8: r.salvezze.base,
      modSpecifico: modSalvezza(stato.car[caratteristica], dati.caratteristiche.modificatore_salvezza),
      addestramento: stato.addestr.salvezze[id],
      corporazione: stato.corp.salvezze[id],
      avanzamento: avanz,
    };
    const strutturale = salvezza(componenti);
    const bonusTalenti = talenti.filter((t) => t.effetti?.salvezza && t.parametro === id).reduce((s, t) => s + t.effetti.salvezza, 0);
    const tetto = r.avanzamento.tetto_salvezza;
    out[id] = {
      nome, caratteristica, ...componenti, strutturale, talenti: bonusTalenti,
      totale: Math.min(tetto, strutturale + bonusTalenti), tetto, limitato: strutturale + bonusTalenti > tetto,
    };
  }
  return out;
}

/**
 * Valori di lancio e di Meditazione del personaggio (Magia sez. 2, 3, 6; schede dei Talenti di
 * magia approvate dal master il 26/09/2026). Base in regole.json → lancio e meditazione; i
 * Talenti la modificano con effetti.magia e effetti.meditazione.
 */
function magiaDelPersonaggio(stato, caratteristiche, dati) {
  // i Talenti sostituiscono i valori base (effetti.magia.focalizzazione_va, penalita_ingaggio…)
  const L = dati.regole.lancio;
  const base = { ...L, focalizzazione_va: L.focalizzazione.va, penalita_ingaggio: L.ingaggio.va };
  const talenti = talentiConEffetti(stato, dati);
  const m = (k) => talenti.map((t) => t.effetti?.magia?.[k]).filter((v) => v !== undefined);
  const sostituisci = (k) => (m(k).length ? m(k).at(-1) : base[k]);
  const contromagia = m('contromagia').includes(true);
  const med = dati.regole.meditazione;
  let meditazione = null;
  if (soddisfaPrerequisito(stato, 'capacita:meditazione', dati)) {
    const formula = (f) => Math.max(f.minimo, f.fisso + f.caratteristiche.reduce((s, c) => s + caratteristiche[c].mod, 0));
    const pmExtra = talenti.reduce((s, t) => s + (t.effetti?.meditazione?.pm_per_ora ?? 0), 0);
    const molt = talenti.reduce((s, t) => s * (t.effetti?.meditazione?.moltiplicatore_ore ?? 1), 1);
    meditazione = { pmPerOra: formula(med.pm_per_ora) + pmExtra, orePerGiorno: formula(med.ore_al_giorno) * molt };
  }
  return {
    focalizzazioneVa: sostituisci('focalizzazione_va'),
    penalitaIngaggio: sostituisci('penalita_ingaggio'),
    tiroArmiDaLancio: base.tiro_armi_da_lancio + m('tiro_armi_da_lancio').reduce((s, v) => s + v, 0),
    contromagia: contromagia ? { penalita: sostituisci('penalita_contromagia'), serveConoscenza: !m('contromagia_senza_conoscenza').includes(true) } : null,
    magiaOccultata: m('occultata').includes(true),
    meditazione,
  };
}

/**
 * Scheda completa del personaggio al livello attuale (chiamata da calcolaScheda in calc.js).
 * Con `personaggio.sessione` i valori effettivi includono Ferite, Affaticamento e Stati attivi
 * (src/condizioni.js); senza, coincidono con quelli a riposo (regole + equipaggiamento).
 */
export function calcolaSchedaPersonaggio(personaggio, dati) {
  const scheda = schedaARiposo(personaggio, dati);
  // S11: i bonus di circostanza mandati dal master valgono al tavolo come quelli del giocatore («dal master»)
  const creazione = migraPersonaggio(personaggio).creazione;
  const sessione = sessioneConCircostanzeMaster(personaggio?.sessione ?? null, creazione?.circostanzeMaster, { scontroAperto: personaggio?.scontroAperto });
  return scheda.abilita ? applicaCondizioni(scheda, sessione, dati) : scheda;
}

function schedaARiposo(personaggio, dati) {
  const { stato: statoPieno, errori: erroriGrezzi, completamenti, eccessi } = ricalcola(personaggio, dati);
  if (!statoPieno) return { livello: 1, errori: erroriGrezzi, completamenti, eccessi, completa: false };
  // A.184 (Davide, 25/10/2026): le scelte che dipendevano da un Talento non ripreso escono dagli effetti attivi e restano
  // leggibili come storico; ripreso il Talento, tornano attive entro le quote. Solo nei Talenti nuovi.
  const storico = scelteInStorico(statoPieno, dati);
  const stato = storico ? { ...statoPieno, tecniche: storico.tecniche.attive, incantesimi: storico.incantesimi.attivi } : statoPieno;
  const errori = storico ? erroriGrezzi.filter((e) => !(/(^|.)(tecniche|incantesimi)$/.test(e.campo) && /^(Tecniche conosciute|incantesimi conosciuti)/.test(e.problema))) : erroriGrezzi;
  // modificatori temporanei di Caratteristica al tavolo (src/temporanei.js): la Caratteristica cambia prima di tutto
  // ciò che ne deriva (Abilità, Difese, Prove Salvezza, Iniziativa, danno, carico); i PV e PM massimi restano quelli
  // della Caratteristica base salvo regole.json → caratteristiche_temporanee.massimi_pv_pm (false: A.120, E&L del 06/10/2026)
  // «Modifica master» (src/correzioni-master.js): le correzioni del DdG si applicano dopo il calcolo da regole di ogni
  // valore. Una Caratteristica corretta cambia, come quella scelta, tutto ciò che ne deriva (anche PV e PM massimi).
  const cm = migraPersonaggio(personaggio).creazione?.correzioniMaster ?? [];
  const corretto = (valore, chiave, limiti) => applicaCorrezioni(valore, cm, chiave, limiti);
  const carMaster = {};
  for (const s of Object.keys(stato.car)) {
    const c = corretto(stato.car[s], `car:${s}`, { minimo: dati.caratteristiche.valore_minimo ?? 1, massimo: dati.caratteristiche.valore_massimo ?? Infinity });
    if (c.righe.length) { carMaster[s] = c; stato.car[s] = c.valore; }
  }
  const carBase = { ...stato.car };
  const temporanei = modificatoriAttivi(personaggio?.sessione, dati);
  for (const [s, v] of Object.entries(temporanei)) if (s in stato.car) stato.car[s] = Math.min(dati.caratteristiche.valore_massimo ?? Infinity, Math.max(dati.caratteristiche.valore_minimo ?? 1, stato.car[s] + v));
  const carMassimi = dati.regole.caratteristiche_temporanee?.massimi_pv_pm ? stato.car : carBase;
  const r = dati.regole;
  const n = stato.livello;
  const talenti = talentiConEffetti(stato, dati);
  const effetto = (k) => talenti.reduce((s, t) => s + (typeof t.effetti?.[k] === 'number' ? t.effetti[k] : 0), 0);
  const { modificatore_ordinario: tabOrd, modificatore_salvezza: tabSal } = dati.caratteristiche;

  const caratteristiche = {};
  for (const { sigla, nome } of dati.caratteristiche.caratteristiche) {
    const valore = stato.car[sigla];
    caratteristiche[sigla] = { nome, valore, mod: modOrdinario(valore, tabOrd), modSalvezza: modSalvezza(valore, tabSal), massimo: massimoCaratteristica(n, dati),
      ...(temporanei[sigla] ? { base: carBase[sigla], temporaneo: valore - carBase[sigla] } : {}),
      ...(carMaster[sigla] ? { calcolato: carMaster[sigla].calcolato, correzioniMaster: carMaster[sigla].righe } : {}) };
  }
  // §1.2.1, §2.3, §8.7 (29/09): base dalla prima Classe, limite dalle Classi possedute; `totale` è il VA
  // personale (grezzo limitato); equipaggiamento e condizioni si sommano dopo
  const prima = primaClasseDef(stato, dati);
  const abilita = dati.abilita.abilita.map(({ nome, categoria, caratteristica }) => {
    const x = stato.abil[nome];
    const avanzamento = x.daClasse + x.liberi;
    const componenti = { mod: caratteristiche[caratteristica].mod, base: baseIniziale(prima, nome, dati.regole), corporazione: stato.corp.abilita_bonus.includes(nome) ? 1 : 0, avanzamento };
    const lim = limiteDi(stato, nome, dati);
    const grezzo = valoreAbilita(componenti);
    const cmAbilita = corretto(vaPersonale(grezzo, lim.valore), `abilita:${nome}`);
    return {
      nome, categoria, caratteristica, ...componenti, daClasse: x.daClasse, liberi: x.liberi,
      ...(caratteristiche[caratteristica].temporaneo !== undefined ? { caratteristicaTemporanea: { sigla: caratteristica, valore: caratteristiche[caratteristica].valore, base: caratteristiche[caratteristica].base } } : {}),
      competenza: competenzaDi(prima, nome), competenzaDa: prima.nome, limite: lim.valore, limiteCategoria: lim.categoria, limiteDa: lim.classi,
      grezzo, totale: cmAbilita.valore,
      ...(cmAbilita.righe.length ? { calcolato: cmAbilita.calcolato, correzioniMaster: cmAbilita.righe } : {}),
    };
  });

  // Equipaggiamento (roadmap §1.4): solo gli oggetti attivi. Il VA dell'Abilità con il componente
  // «Equip» è `vaEquip`; `totale` resta quello delle regole di creazione e avanzamento.
  const specPossedute = stato.talentiLiberi.filter((t) => talentoLiberoDef(t.id, dati).specializzazione).map((t) => ({ id: t.id }));
  // Giocatore §5.21: Umanità dalle perdite registrate all'installazione degli impianti (src/umanita.js)
  const creazione = migraPersonaggio(personaggio).creazione;
  const umn = umanita(creazione, dati);
  const equipaggiamento = calcolaEquipaggiamento({
    // §5.13: il livello limita il bonus di Caratteristica al danno
    livello: n, caratteristiche, abilita, specializzazioni: specPossedute,
    // §7.10: capacità di sintonizzazione per Gradi complessivi e Talenti di Classe
    gradiComplessivi: stato.classi.reduce((s, c) => s + c.grado, 0),
    // A.166: le Classi servono a sapere chi sceglie la manifestazione della CyberArma (il Custode)
    classi: stato.classi.map((c) => c.nome),
    talenti: stato.classi.flatMap((c) => c.talenti.map((t) => t.nome)),
    umanita: umn,
    correzioniMaster: cm,
  },
    normalizzaEquipaggiamento(creazione.equipaggiamento), dati);
  const abilitaEquip = abilita.map((a) => {
    const equip = equipaggiamento.equipAbilita[a.nome] ?? 0;
    return { ...a, equip, vaEquip: a.totale + equip, componentiEquip: equipaggiamento.componentiEquip[a.nome] ?? [] };
  });

  const pmMancanti = stato.contributiPM.some((c) => c.valore === null);
  const movimento = { passo: r.movimento.passo, corsa: r.movimento.corsa, scatto: r.movimento.scatto, unita: r.movimento.unita };
  // §2.14: Iniziativa = Mod DES + Mod INT, più i Talenti con effetti.iniziativa (Iniziativa Migliorata, Talenti di Classe)
  // Talenti di Classe con il parametro scelto e le tabelle per Grado risolte (Disciplina, §3.5.5)
  const talentiClasse = new Map(stato.classi.map((c) => [c.nome, c.talenti.map((t) => risolviTalentoClasse(t, c.grado))]));
  const talentiClasseIniziativa = [...talentiClasse.values()].flat().filter((t) => typeof t.effetti?.iniziativa === 'number' && !talenti.some((x) => x.nome === t.nome));
  const vociIniziativa = [
    ...r.iniziativa.caratteristiche.map((s) => ({ etichetta: `Mod ${s}`, valore: caratteristiche[s].mod })),
    ...[...talenti, ...talentiClasseIniziativa].filter((t) => typeof t.effetti?.iniziativa === 'number').map((t) => ({ etichetta: t.parametroNome ? `${t.nome} (${t.parametroNome})` : t.nome, valore: t.effetti.iniziativa })),
  ];
  for (const t of talenti) for (const [k, v] of Object.entries(t.effetti?.movimento ?? {})) movimento[k] += v;
  // correzioni del master su Iniziativa e Movimento
  const cmIniziativa = corretto(sommaIniziativa(...vociIniziativa.map((v) => v.valore)), 'iniziativa');
  for (const x of cmIniziativa.righe) vociIniziativa.push({ etichetta: `${x.fonte}${x.nota ? ` (${x.nota})` : ''}`, valore: x.valore, master: true });
  const cmMovimento = {};
  for (const k of ['passo', 'corsa', 'scatto']) {
    const c = corretto(movimento[k], `movimento:${k}`, { minimo: 0 });
    if (c.righe.length) { cmMovimento[k] = { calcolato: c.calcolato, righe: c.righe }; movimento[k] = c.valore; }
  }
  if (Object.keys(cmMovimento).length) movimento.correzioniMaster = cmMovimento;

  const q = statoQuote(stato, dati);
  const catalogoTec = dati.tecniche_interiori.tecniche;
  const annotazioni = [];
  if (q.scalaPotere === 'altri_utilizzatori' && q.gradiTaumaturgici > 0) {
    annotazioni.push('Classi taumaturgiche senza Addestramento Taumaturgo: nessun incantesimo libero dell’Addestramento e Prove di Potere con la scala «altri utilizzatori» (Magia, sezione 1).');
  }
  const scuole = new Set(stato.tecniche.map((x) => catalogoTec.find((t) => t.id === x.id)?.gruppo).filter((g) => g?.startsWith('scuola:')));
  if (stato.scuola) annotazioni.push(`Iniziato alla Scuola ${stato.scuola.nome} (dichiarato ${conOrdinale('al', stato.scuola.livello)} livello): iniziazione e giuramento all’Overlord si verificano con il master (§8.9.3).`);
  for (const s of scuole) if (s.slice(7) !== stato.scuola?.nome) annotazioni.push(`Tecniche della Scuola ${s.slice(7)} senza iniziazione dichiarata (§8.9.3).`);
  // §5.21: a UMN 0 niente Risorse Interiori, comprese le Tecniche che ne dipendono
  if (umn && !umn.risorseInteriori) annotazioni.push(`Umanità ${umn.valore} (${umn.condizione}): il personaggio non può utilizzare Risorse Interiori, comprese le Tecniche che ne dipendono (Giocatore §5.21).`);
  const provvisori = talenti.filter((t) => t.provvisorio);
  if (provvisori.length) annotazioni.push(`Talenti provvisori, con prerequisiti da definire: ${provvisori.map((t) => t.nome).join(', ')}.`);

  const primaClasse = stato.classi[0];
  // Magia sez. 1, Potere Mistico: +5 PM Massimi per acquisizione (effetti.pm), fino a +15; poi la fascia
  // di Umanità (§5.21), non sotto 1
  const pmRegole = pmMancanti ? null : carMassimi.SAG + stato.contributiPM.reduce((s, c) => s + c.valore, 0) + effetto('pm');
  const pmUmn = pmConUmanita(pmRegole, umn);
  // correzioni del master su PV e PM massimi e sulle Prove Salvezza (dopo tetti e Umanità: il master ha l'ultima parola)
  const cmPv = corretto(carMassimi.COS + stato.contributiPV.reduce((s, c) => s + c.valore, 0) + effetto('pv'), 'pv', { minimo: 1 });
  const cmPm = corretto(pmUmn.pm, 'pm', { minimo: 0 });
  const salvezze = salvezzeDi(stato, dati);
  for (const [id, x] of Object.entries(salvezze)) {
    const c = corretto(x.totale, `salvezza:${id}`);
    if (c.righe.length) Object.assign(x, { calcolato: c.calcolato, totale: c.valore, correzioniMaster: c.righe });
  }
  return {
    livello: n,
    corporazione: stato.corp.nome,
    addestramento: stato.addestr.nome,
    classe: primaClasse.nome,
    grado: primaClasse.grado,
    classi: stato.classi.map((c) => {
      const def = trova(dati.classi.classi, c.nome);
      return { nome: c.nome, addestramento: def.addestramento, grado: c.grado, taumaturgica: eTaumaturgica(def, dati), talenti: talentiClasse.get(c.nome) };
    }),
    caratteristiche,
    abilita: abilitaEquip,
    equipaggiamento,
    salvezze,
    pv: cmPv.valore,
    // valori da regole e righe «Correzione del master» dei massimi, per il «Calcolo» e la finestrella del master
    ...(cmPv.righe.length || cmPm.righe.length ? { correzioniMaster: { ...(cmPv.righe.length ? { pv: { calcolato: cmPv.calcolato, righe: cmPv.righe } } : {}), ...(cmPm.righe.length ? { pm: { calcolato: cmPm.calcolato, righe: cmPm.righe } } : {}) } } : {}),
    // modificatori temporanei di Caratteristica attivi: { sigla: valore } (plancia, scheda)
    ...(Object.keys(temporanei).length ? { caratteristicheTemporanee: temporanei } : {}),
    pm: cmPm.valore,
    // riduzione dei PM Massimi per l'Umanità (≤ 0), già compresa in `pm`
    pmUmanita: pmUmn.riduzione,
    umanita: umn,
    iniziativa: sommaIniziativa(...vociIniziativa.map((v) => v.valore)),
    // §2.14 più i Talenti con un bonus fisso all'Iniziativa (Liberi e di Classe): la scomposizione della SD
    vociIniziativa,
    movimento,
    azioni: { movimento: r.azioni_primo_livello.movimento, principali: r.azioni_primo_livello.principali + cumulato('azione_principale', n, dati) },
    vantaggio: stato.addestr.vantaggio,
    talenti: stato.classi.flatMap((c) => talentiClasse.get(c.nome).map((t) => ({ ...t, classe: c.nome }))),
    // Talenti v1.0: "nuovo" (tre categorie) o "vecchio" (i Talenti di prima)
    regimeTalenti: stato.regime,
    talentiLiberi: stato.talentiLiberi.filter((t) => !talentoLiberoDef(t.id, dati).specializzazione).map((t) => {
      const d = talentoLiberoDef(t.id, dati);
      return { id: t.id, nome: d.nome, categoria: categoriaDi(d), parametro: t.parametro, annotazione: t.annotazione ?? null, livello: t.livello, provvisorio: !!d.provvisorio, testo: d.testo, sintesi: d.sintesi ?? null, tavolo: notaDaApplicare(d), usi: d.usi ?? null };
    }),
    specializzazioni: stato.talentiLiberi.filter((t) => talentoLiberoDef(t.id, dati).specializzazione).map((t) => {
      const d = talentoLiberoDef(t.id, dati);
      return { id: t.id, nome: d.nome, abilita: d.abilita, effetto: d.effetto, tavolo: notaDaApplicare(d), livello: t.livello, usi: d.usi ?? null, ...(t.classe ? { classe: t.classe } : {}), ...(t.annotazione ? { annotazione: t.annotazione } : {}) };
    }),
    tecniche: stato.tecniche.map((x) => ({ ...catalogoTec.find((t) => t.id === x.id), livello: x.livello })),
    tecnicheAmmesse: tecnicheAmmesse(stato),
    // A.184: scelte legate a un Talento non ripreso, senza effetti attivi (solo lettura)
    ...(storico && (storico.tecniche.storico.length || storico.incantesimi.storico.length) ? { storico: { tecniche: storico.tecniche.storico.map((x) => ({ ...catalogoTec.find((t) => t.id === x.id), livello: x.livello })), incantesimi: storico.incantesimi.storico } } : {}),
    incantesimi: {
      conosciuti: q.noti,
      // 20/10: aggiunti a mano (src/incantesimi-a-mano.js): non entrano nei conosciuti né nelle quote
      aMano: risolviIncantesimiAMano(personaggio.creazione?.incantesimiAMano, { livelloMassimo: q.livelloMassimo, accesso: q.accesso }, dati),
      livelloMassimo: q.livelloMassimo,
      quote: { perMacro: q.perMacro, liberi: q.liberi, totale: q.totale, liberiUsati: q.liberiUsati },
      scalaPotere: q.scalaPotere,
    },
    scuolaMishima: stato.scuola,
    magia: magiaDelPersonaggio(stato, caratteristiche, dati),
    progressione: progressione(personaggio, dati),
    annotazioni,
    errori,
    // regole aggiornate: punti liberi da completare (bloccano solo l'avanzamento) e in eccesso (avviso)
    completamenti,
    eccessi,
    // punti liberi in eccesso (7 per Grado dal 04/10/2026, A.90): avviso col testo, la scheda resta utilizzabile
    avvisoPunti: avvisoPuntiEccesso(eccessi, dati),
    completa: errori.length === 0,
  };
}

// ---------------------------------------------------------------------------
// Passi dell'interfaccia "Sali di livello" e descrizione dei livelli (funzioni pure)

/**
 * Passi dell'interfaccia per il prossimo livello, generati dagli eventi di regole.json
 * (avanzamento.eventi). Gli eventi automatici (Salvezze, Azioni Principali) diventano righe
 * informative, non passi. Tecniche Interiori e incantesimi compaiono quando le scelte già
 * fatte nella voce (Talento, Grado, Caratteristiche) ne aumentano il numero.
 * @returns {{livello, eventi, passi: {id, titolo, rif, punti?}[], informazioni: string[]}|null}
 */
export function passiDelLivello(personaggio, voce, dati) {
  const { stato: prima } = ricalcola(personaggio, dati);
  if (!prima) return null;
  const n = prima.livello + 1;
  if (n > dati.regole.avanzamento.livello_massimo) return null;
  const eventi = eventiLivello(n, dati);
  const v = isOggetto(voce) ? voce : {};
  const passi = [];
  const informazioni = [];
  let puntiAbilita = 0;
  // Talenti v1.0 (regime nuovo): la Maestria dopo le Caratteristiche, la Specializzazione dopo il Grado
  const nuovo = prima.regime === 'nuovo';
  const conMaestria = nuovo && livelliCategoria('maestria', n, dati).includes(n);
  const conSpecializzazione = nuovo && livelliCategoria('specializzazione', n, dati).includes(n);
  for (const e of eventi) {
    let m;
    if ((m = /^caratteristiche:\+(\d+)$/.exec(e))) {
      passi.push({ id: 'caratteristiche', titolo: 'Caratteristiche', rif: '§8.2', punti: Number(m[1]) });
      if (conMaestria) passi.push({ id: 'maestria', titolo: 'Maestria', rif: 'Talenti v1.0' });
    } else if (e === 'talento_libero') passi.push({ id: 'talento', titolo: 'Talento Libero', rif: nuovo ? 'Talenti v1.0' : '§8.6, §8.8' });
    else if (e === 'grado_classe') {
      passi.push({ id: 'grado', titolo: 'Grado di Classe', rif: '§8.7, cap. 3' });
      if (conSpecializzazione) passi.push({ id: 'specializzazione', titolo: 'Specializzazione', rif: 'Talenti v1.0' });
    }
    else if ((m = /^punti_abilita:(\d+)$/.exec(e))) puntiAbilita = Number(m[1]);
    else if ((m = /^salvezze:\+(\d+)$/.exec(e))) informazioni.push(`+${m[1]} a tutte le Prove Salvezza (§8.1.1)`);
    else if ((m = /^azione_principale:\+(\d+)$/.exec(e))) {
      const totale = dati.regole.azioni_primo_livello.principali + cumulato('azione_principale', n, dati);
      informazioni.push(`Azioni Principali per Round: ${totale} (§8.5)`);
    }
  }
  if (conMaestria && !passi.some((x) => x.id === 'maestria')) passi.splice(0, 0, { id: 'maestria', titolo: 'Maestria', rif: 'Talenti v1.0' });
  const dopo = applicaVoce(prima, v, dati);
  if (tecnicheAmmesse(dopo) > tecnicheAmmesse(prima) || (Array.isArray(v.tecniche) && v.tecniche.length)) {
    passi.push({ id: 'tecniche', titolo: 'Tecniche Interiori', rif: '§8.9' });
  }
  if (quoteIncantesimi(dopo, dati).totale > quoteIncantesimi(prima, dati).totale || (Array.isArray(v.incantesimi) && v.incantesimi.length)) {
    passi.push({ id: 'incantesimi', titolo: 'Incantesimi', rif: 'Magia, sezione 1' });
  }
  if (puntiAbilita) passi.push({ id: 'abilita', titolo: 'Punti Abilità', rif: '§8.3', punti: puntiAbilita });
  passi.push({ id: 'riepilogo', titolo: 'Riepilogo', rif: '§8.1' });
  return { livello: n, eventi, passi, informazioni };
}

const tiroTesto = (t, spec) => {
  const n = valoreTiro(t);
  if (n === null) return 'da tirare';
  return `${spec.formula} = ${n}${t?.origine === 'manuale' ? ' (tirato dal vivo)' : ''}`;
};

/**
 * Descrizione leggibile delle scelte di un livello, per la Progressione della scheda e per il
 * riepilogo prima della conferma. `gradi` sono i Gradi delle Classi prima di questo livello.
 */
export function descriviVoce(voce, dati, gradi = {}) {
  const v = isOggetto(voce) ? voce : {};
  const righe = [];
  const nomeSalvezza = (id) => dati.caratteristiche.salvezze.find((s) => s.id === id)?.nome ?? id;
  const pc = Object.entries(isOggetto(v.caratteristiche) ? v.caratteristiche : {}).filter(([, p]) => p > 0);
  if (pc.length) righe.push(`Caratteristiche: ${pc.map(([s, p]) => `${s} +${p}`).join(', ')}`);
  if (isOggetto(v.talentoLibero) && v.talentoLibero.id) {
    const d = talentoLiberoDef(v.talentoLibero.id, dati);
    const nome = d ? (d.specializzazione ? `Specializzazione in ${d.nome}` : d.nome) : v.talentoLibero.id;
    const dettagli = [
      v.talentoLibero.parametro ? (d?.parametro === 'salvezza' ? nomeSalvezza(v.talentoLibero.parametro) : v.talentoLibero.parametro) : null,
      v.talentoLibero.annotazione || null,
    ].filter(Boolean);
    righe.push(`Talento Libero: ${nome}${dettagli.length ? ` (${dettagli.join(', ')})` : ''}${d?.provvisorio ? ' — provvisorio' : ''}`);
  }
  const def = trova(dati.classi.classi, v.grado?.classe);
  if (def) {
    const grado = (gradi[def.nome] ?? 0) + 1;
    const av = dati.regole.avanzamento;
    const iFisso = av.gradi_talento_fisso.indexOf(grado);
    const talento = iFisso >= 0 ? `Talento fisso ${def.talenti_fissi[iFisso]?.nome}` : v.talentoClasse ? `Talento a scelta ${v.talentoClasse}` : 'Talento a scelta da scegliere';
    const tiri = [`PV ${tiroTesto(v.tiroPV, specTiro({ facce: def.pv_per_grado.dado }))}`];
    if (def.pm_per_grado.dado) tiri.push(`PM ${tiroTesto(v.tiroPM, specTiro({ facce: def.pm_per_grado.dado }))}`);
    righe.push(`Grado: ${def.nome} ${GRADI_ROMANI[grado] ?? grado}${grado === 1 ? ' (nuova Classe)' : ''} — ${talento}; ${tiri.join(', ')}`);
  }
  const pa = Object.entries(isOggetto(v.puntiAbilita) ? v.puntiAbilita : {}).filter(([, p]) => p > 0);
  if (pa.length) righe.push(`Punti Abilità: ${pa.map(([a, p]) => `${a} +${p}`).join(', ')}`);
  if (v.scuolaMishima) righe.push(`Iniziato alla Scuola ${v.scuolaMishima}`);
  if (Array.isArray(v.tecniche) && v.tecniche.length) {
    righe.push(`Tecniche Interiori: ${v.tecniche.map((id) => dati.tecniche_interiori.tecniche.find((t) => t.id === id)?.nome ?? id).join(', ')}`);
  }
  if (Array.isArray(v.incantesimi) && v.incantesimi.length) righe.push(`Incantesimi: ${v.incantesimi.join(', ')}`);
  return righe;
}

/** Una riga per livello, dal 1° (creazione) all'attuale: cosa è stato scelto. */
export function progressione(personaggio, dati) {
  const p = migraPersonaggio(personaggio);
  const c = p.creazione;
  const out = [{
    livello: 1,
    righe: [`Creazione: ${[c.corporazione, c.addestramento, c.classe ? `${c.classe} I` : null].filter(Boolean).join(' · ')}`],
  }];
  // §2.16.28–29: crediti iniziali, conguagli e saldo, se la dotazione iniziale è nell'inventario
  if (dati.dotazioni && saldoIniziale(c, dati) !== null) {
    const k = contiDotazione(c.dotazione, c.classe, c.corporazione, dati);
    out[0].righe.push(`Crediti iniziali ${crediti(k.iniziali)} (2d6 = ${valoreTiro(c.dotazione.crediti)})${k.speso + k.restituito ? `, conguagli ${crediti(k.speso + k.restituito)}` : ''}${k.restituito ? `, eccedenze restituite ${crediti(k.restituito)} (A.35)` : ''}: saldo iniziale ${crediti(k.saldo)}`);
  }
  const gradi = c.classe ? { [c.classe]: 1 } : {};
  p.livelli.forEach((voce, i) => {
    const n = i + 2;
    const righe = descriviVoce(voce, dati, gradi);
    for (const e of eventiLivello(n, dati)) {
      const m = /^salvezze:\+(\d+)$/.exec(e);
      if (m) righe.push(`Prove Salvezza +${m[1]}`);
      if (/^azione_principale:/.test(e)) righe.push('Seconda Azione Principale');
    }
    const cl = voce?.grado?.classe;
    if (cl) gradi[cl] = (gradi[cl] ?? 0) + 1;
    out.push({ livello: n, righe });
  });
  return out;
}
