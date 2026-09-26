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
import {
  calcolaScheda, modOrdinario, modSalvezza, valoreAbilita, salvezza, iniziativa as sommaIniziativa,
  puntiMagiaCreazione, incantesimiLiberi, livelloMassimoIncantesimi,
} from './calc.js';
import { specTiro, valoreTiro, motivoFuoriIntervallo } from './tiri.js';
import { calcolaEquipaggiamento, normalizzaEquipaggiamento } from './equipaggiamento.js';

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
const limiteAvanzamento = (livello, dati) => fascia(dati.regole.avanzamento.avanzamento_massimo_abilita, livello, 'massimo');

// ---------------------------------------------------------------------------
// Stato accumulato durante il ricalcolo

const eTaumaturgica = (classe, dati) => classe?.addestramento === dati.regole.taumaturgo.addestramento;

function talentoLiberoDef(id, dati) {
  const t = dati.talenti_liberi.talenti.find((x) => x.id === id);
  if (t) return { ...t, specializzazione: false };
  const s = dati.specializzazioni.specializzazioni.find((x) => x.id === id);
  return s ? { ...s, specializzazione: true, molteplicita: 'una', parametro: null, prerequisiti: [] } : null;
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
  const abil = Object.fromEntries(s1.abilita.map((a) => [a.nome, { daClasse: a.daClasse, liberi: a.liberi }]));
  const { fisso, dado } = classe.pv_per_grado;
  const pvCreazione = fisso + (dati.regole.creazione.dado_pv_massimizzato ? dado : 0);
  // anche il dado dei PM è massimizzato alla creazione (decisione 6 del master)
  const pmCreazione = puntiMagiaCreazione(0, classe, dati.regole);
  return {
    errori,
    stato: {
      livello: 1, corp, addestr, car, abil,
      classi: [{ nome: classe.nome, grado: 1, talenti: [{ grado: 1, ...classe.talenti_fissi[0], scelto: false }] }],
      contributiPV: [{ livello: 1, classe: classe.nome, valore: pvCreazione }],
      contributiPM: [{ livello: 1, classe: classe.nome, valore: pmCreazione }],
      talentiLiberi: [],
      dotazioniTecniche: [],
      tecniche: [],
      incantesimi: [...(creazione.incantesimi ?? [])],
      persi: [],
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
  // TODO(Davide): Potenziale Mistico Migliorato è applicato soltanto al limite di Usufruitore di Magia
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
    if (iFisso >= 0 && def.talenti_fissi[iFisso]) c.talenti.push({ grado: c.grado, ...def.talenti_fissi[iFisso], scelto: false });
    else if (av.gradi_talento_a_scelta.includes(c.grado)) {
      const t = def.talenti_a_scelta.find((x) => x.nome === v.talentoClasse);
      if (t) c.talenti.push({ grado: c.grado, ...t, scelto: true });
    }
    const limite = limiteAvanzamento(n, dati);
    const bonus = dati.regole.creazione.bonus_classe_per_grado;
    for (const a of def.abilita) {
      const x = stato.abil[a];
      if (x.daClasse + x.liberi + bonus <= limite) x.daClasse += bonus;
      else stato.persi.push({ livello: n, classe: def.nome, abilita: a, limite });
    }
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

  // §8.3: Punti Abilità Liberi
  for (const [a, p] of Object.entries(isOggetto(v.puntiAbilita) ? v.puntiAbilita : {})) {
    if (a in stato.abil && Number.isInteger(p) && p > 0) stato.abil[a].liberi += p;
  }

  if (typeof v.scuolaMishima === 'string' && v.scuolaMishima && !stato.scuola) stato.scuola = { nome: v.scuolaMishima, livello: n };
  for (const i of Array.isArray(v.incantesimi) ? v.incantesimi : []) if (!stato.incantesimi.includes(i)) stato.incantesimi.push(i);
  for (const t of Array.isArray(v.tecniche) ? v.tecniche : []) if (!stato.tecniche.some((x) => x.id === t)) stato.tecniche.push({ id: t, livello: n });
  return stato;
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

  // prerequisiti (i Talenti provvisori hanno prerequisiti ancora da definire)
  if (Array.isArray(def.prerequisiti)) {
    for (const p of def.prerequisiti) {
      if (!possiede(stato, p)) err(`${nome} richiede ${talentoLiberoDef(p, dati)?.nome ?? p}`);
    }
  }

  // §8.6.10: incompatibilità fra Risorse Interiori e magia, in entrambe le direzioni
  if (def.id === 'risorse-interiori') {
    for (const c of conflittiRisorseInteriori(stato, dati)) err(`Risorse Interiori è incompatibile con ${c} (§8.6.10)`);
  }
  if (def.effetti?.accessoMagia && possiedeRisorseInteriori(stato)) err(`${nome} concede il lancio di Incantesimi: incompatibile con Risorse Interiori (§8.6.10)`);
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
  if (conGrado) for (const k of ['grado', 'tiroPV', 'tiroPM', 'talentoClasse']) ammesse.add(k);
  if (kAbil) ammesse.add('puntiAbilita');
  for (const k of Object.keys(v)) if (!ammesse.has(k)) err(k, `al ${n}° livello non si sceglie «${k}» (eventi: ${eventi.join(', ') || 'nessuno'})`);

  // §8.2: Punti Caratteristica e massimo per livello
  if (kCar) {
    const pc = isOggetto(v.caratteristiche) ? v.caratteristiche : {};
    const max = massimoCaratteristica(n, dati);
    for (const [s, p] of Object.entries(pc)) {
      if (!(s in prima.car)) err(`caratteristiche.${s}`, `"${s}" non è una Caratteristica`);
      else if (!Number.isInteger(p) || p < 0) err(`caratteristiche.${s}`, 'i punti devono essere interi ≥ 0');
      else if (prima.car[s] + p > max) err(`caratteristiche.${s}`, `${s} arriverebbe a ${prima.car[s] + p}: al ${n}° livello il massimo è ${max} (§8.2)`);
    }
    const spesi = somma(pc);
    if (spesi > kCar) err('caratteristiche', `assegnati ${spesi} Punti Caratteristica, al ${n}° livello se ne ricevono ${kCar}`);
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
      // §3.2: Talento a scelta ai Gradi II, IV, VI, ciascuno una volta
      if (av.gradi_talento_a_scelta.includes(nuovoGrado)) {
        const t = def.talenti_a_scelta.find((x) => x.nome === v.talentoClasse);
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

  // §8.6: Talento Libero
  if (conTalento) errori.push(...controllaTalentoLibero(conCar, v.talentoLibero, dati));

  // §8.3 e §2.13: Punti Abilità Liberi dopo i punti fissi della Classe
  const conGradoApplicato = applicaVoce(prima, { caratteristiche: v.caratteristiche, grado: v.grado, talentoClasse: v.talentoClasse, tiroPV: v.tiroPV, tiroPM: v.tiroPM }, dati);
  if (kAbil) {
    const pa = isOggetto(v.puntiAbilita) ? v.puntiAbilita : {};
    const limite = limiteAvanzamento(n, dati);
    const minimo = dati.regole.creazione.va_minimo_per_punti_liberi;
    for (const [a, p] of Object.entries(pa)) {
      const x = conGradoApplicato.abil[a];
      if (!x) { err(`puntiAbilita.${a}`, `"${a}" non è un'Abilità`); continue; }
      if (!Number.isInteger(p) || p < 0) { err(`puntiAbilita.${a}`, 'i punti devono essere interi ≥ 0'); continue; }
      if (p === 0) continue;
      const avanz = x.daClasse + x.liberi;
      if (avanz + p > limite) err(`puntiAbilita.${a}`, `Avanzamento ${avanz + p}: al ${n}° livello il massimo è ${limite} (§8.3)`);
      const va = vaDi(conGradoApplicato, a, avanz, dati);
      if (va < minimo) err(`puntiAbilita.${a}`, `VA ${va} prima dei punti liberi: serve almeno ${minimo} (§2.13)`);
    }
    const spesi = somma(pa);
    if (spesi > kAbil) err('puntiAbilita', `assegnati ${spesi} Punti Abilità Liberi, al ${n}° livello se ne ricevono ${kAbil}`);
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

function vaDi(stato, nomeAbilita, avanzamento, dati) {
  const a = trova(dati.abilita.abilita, nomeAbilita);
  return valoreAbilita({
    mod: modDi(stato, a.caratteristica, dati),
    base: stato.addestr.valori_base[nomeAbilita],
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
  if (!iniziale) return { stato: null, errori };
  let stato = iniziale;
  p.livelli.slice(0, finoA).forEach((voce, i) => {
    const e = controllaVoce(stato, voce, dati);
    errori.push(...e.map((x) => ({ ...x, livello: stato.livello + 1, campo: `livelli[${i}].${x.campo}` })));
    stato = applicaVoce(stato, voce, dati);
  });
  return { stato, errori };
}

/**
 * Valida le scelte del prossimo livello del personaggio.
 * @returns {{campo, problema, tipo: 'violazione'|'incompleto'}[]}
 */
export function validaLivello(personaggio, scelte, dati) {
  const { stato, errori } = ricalcola(personaggio, dati);
  if (!stato) return [{ campo: 'creazione', problema: 'la creazione non si può calcolare: correggila prima di salire di livello', tipo: 'violazione' }];
  const bloccanti = errori.filter((e) => e.tipo === 'violazione');
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
    avanzamentoMassimo: limiteAvanzamento(n, dati),
    caratteristiche: Object.fromEntries(Object.entries(stato.car).map(([s, v]) => [s, { valore: v, massimo: massimoCaratteristica(n, dati) }])),
    abilita: Object.entries(stato.abil).map(([nome, x]) => ({ nome, avanzamento: x.daClasse + x.liberi, limite: limiteAvanzamento(n, dati) })),
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
  if (eventi.includes('talento_libero')) {
    const candidati = [
      ...dati.talenti_liberi.talenti.map((t) => ({ ...t, specializzazione: false })),
      ...dati.specializzazioni.specializzazioni.map((s) => ({ ...s, specializzazione: true, parametro: null })),
    ];
    const valori = { caratteristica: Object.keys(stato.car), salvezza: dati.caratteristiche.salvezze.map((s) => s.id) };
    // Contano solo le violazioni: l'annotazione mancante (es. Sport) si completa dopo la scelta.
    const violazioni = (scelta) => controllaTalentoLibero(stato, scelta, dati).filter((e) => e.tipo === 'violazione');
    for (const t of candidati) {
      const parametri = t.parametro ? valori[t.parametro].filter((p) => !violazioni({ id: t.id, parametro: p }).length) : null;
      const errori = t.parametro ? (parametri.length ? [] : violazioni({ id: t.id, parametro: valori[t.parametro][0] }))
        : violazioni({ id: t.id });
      out.talentiLiberi.push({
        id: t.id, nome: t.specializzazione ? `Specializzazione in ${t.nome}` : t.nome, specializzazione: t.specializzazione,
        provvisorio: !!t.provvisorio, ammesso: !errori.length, motivo: errori[0]?.problema ?? null, parametri,
      });
    }
  }
  return out;
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

/** Scheda completa del personaggio al livello attuale (chiamata da calcolaScheda in calc.js). */
export function calcolaSchedaPersonaggio(personaggio, dati) {
  const { stato, errori } = ricalcola(personaggio, dati);
  if (!stato) return { livello: 1, errori, completa: false };
  const r = dati.regole;
  const n = stato.livello;
  const talenti = talentiConEffetti(stato, dati);
  const effetto = (k) => talenti.reduce((s, t) => s + (typeof t.effetti?.[k] === 'number' ? t.effetti[k] : 0), 0);
  const { modificatore_ordinario: tabOrd, modificatore_salvezza: tabSal } = dati.caratteristiche;

  const caratteristiche = {};
  for (const { sigla, nome } of dati.caratteristiche.caratteristiche) {
    const valore = stato.car[sigla];
    caratteristiche[sigla] = { nome, valore, mod: modOrdinario(valore, tabOrd), modSalvezza: modSalvezza(valore, tabSal), massimo: massimoCaratteristica(n, dati) };
  }
  const limite = limiteAvanzamento(n, dati);
  const abilita = dati.abilita.abilita.map(({ nome, categoria, caratteristica }) => {
    const x = stato.abil[nome];
    const avanzamento = x.daClasse + x.liberi;
    const componenti = { mod: caratteristiche[caratteristica].mod, base: stato.addestr.valori_base[nome], corporazione: stato.corp.abilita_bonus.includes(nome) ? 1 : 0, avanzamento };
    return { nome, categoria, caratteristica, ...componenti, daClasse: x.daClasse, liberi: x.liberi, limite, totale: valoreAbilita(componenti) };
  });

  // Equipaggiamento (roadmap §1.4): solo gli oggetti attivi. Il VA dell'Abilità con il componente
  // «Equip» è `vaEquip`; `totale` resta quello delle regole di creazione e avanzamento.
  const specPossedute = stato.talentiLiberi.filter((t) => talentoLiberoDef(t.id, dati).specializzazione).map((t) => ({ id: t.id }));
  const equipaggiamento = calcolaEquipaggiamento({ caratteristiche, abilita, specializzazioni: specPossedute },
    normalizzaEquipaggiamento(migraPersonaggio(personaggio).creazione.equipaggiamento), dati);
  const abilitaEquip = abilita.map((a) => {
    const equip = equipaggiamento.equipAbilita[a.nome] ?? 0;
    return { ...a, equip, vaEquip: a.totale + equip };
  });

  const pmMancanti = stato.contributiPM.some((c) => c.valore === null);
  const movimento = { passo: r.movimento.passo, corsa: r.movimento.corsa, scatto: r.movimento.scatto, unita: r.movimento.unita };
  for (const t of talenti) for (const [k, v] of Object.entries(t.effetti?.movimento ?? {})) movimento[k] += v;

  const q = statoQuote(stato, dati);
  const catalogoTec = dati.tecniche_interiori.tecniche;
  const annotazioni = [];
  if (q.scalaPotere === 'altri_utilizzatori' && q.gradiTaumaturgici > 0) {
    annotazioni.push('Classi taumaturgiche senza Addestramento Taumaturgo: nessun incantesimo libero dell’Addestramento e Prove di Potere con la scala «altri utilizzatori» (Magia, sezione 1).');
  }
  const scuole = new Set(stato.tecniche.map((x) => catalogoTec.find((t) => t.id === x.id)?.gruppo).filter((g) => g?.startsWith('scuola:')));
  if (stato.scuola) annotazioni.push(`Iniziato alla Scuola ${stato.scuola.nome} (dichiarato al ${stato.scuola.livello}° livello): iniziazione e giuramento all’Overlord si verificano con il master (§8.9.3).`);
  for (const s of scuole) if (s.slice(7) !== stato.scuola?.nome) annotazioni.push(`Tecniche della Scuola ${s.slice(7)} senza iniziazione dichiarata (§8.9.3).`);
  for (const x of stato.persi) annotazioni.push(`${x.livello}° livello: il +1 di ${x.classe} a ${x.abilita} non si applica perché l’Avanzamento è già al limite ${x.limite} (§8.3).`);
  const provvisori = talenti.filter((t) => t.provvisorio);
  if (provvisori.length) annotazioni.push(`Talenti provvisori, con prerequisiti da definire: ${provvisori.map((t) => t.nome).join(', ')}.`);

  const primaClasse = stato.classi[0];
  return {
    livello: n,
    corporazione: stato.corp.nome,
    addestramento: stato.addestr.nome,
    classe: primaClasse.nome,
    grado: primaClasse.grado,
    classi: stato.classi.map((c) => {
      const def = trova(dati.classi.classi, c.nome);
      return { nome: c.nome, addestramento: def.addestramento, grado: c.grado, taumaturgica: eTaumaturgica(def, dati), talenti: c.talenti };
    }),
    caratteristiche,
    abilita: abilitaEquip,
    equipaggiamento,
    salvezze: salvezzeDi(stato, dati),
    pv: stato.car.COS + stato.contributiPV.reduce((s, c) => s + c.valore, 0) + effetto('pv'),
    pm: pmMancanti ? null : stato.car.SAG + stato.contributiPM.reduce((s, c) => s + c.valore, 0),
    iniziativa: sommaIniziativa(...r.iniziativa.caratteristiche.map((s) => caratteristiche[s].mod)) + effetto('iniziativa'),
    movimento,
    azioni: { movimento: r.azioni_primo_livello.movimento, principali: r.azioni_primo_livello.principali + cumulato('azione_principale', n, dati) },
    vantaggio: stato.addestr.vantaggio,
    talenti: stato.classi.flatMap((c) => c.talenti.map((t) => ({ ...t, classe: c.nome }))),
    talentiLiberi: stato.talentiLiberi.filter((t) => !talentoLiberoDef(t.id, dati).specializzazione).map((t) => {
      const d = talentoLiberoDef(t.id, dati);
      return { id: t.id, nome: d.nome, parametro: t.parametro, annotazione: t.annotazione ?? null, livello: t.livello, provvisorio: !!d.provvisorio, testo: d.testo };
    }),
    specializzazioni: stato.talentiLiberi.filter((t) => talentoLiberoDef(t.id, dati).specializzazione).map((t) => {
      const d = talentoLiberoDef(t.id, dati);
      return { id: t.id, nome: d.nome, abilita: d.abilita, effetto: d.effetto, livello: t.livello };
    }),
    tecniche: stato.tecniche.map((x) => ({ ...catalogoTec.find((t) => t.id === x.id), livello: x.livello })),
    tecnicheAmmesse: tecnicheAmmesse(stato),
    incantesimi: {
      conosciuti: q.noti,
      livelloMassimo: q.livelloMassimo,
      quote: { perMacro: q.perMacro, liberi: q.liberi, totale: q.totale, liberiUsati: q.liberiUsati },
      scalaPotere: q.scalaPotere,
    },
    scuolaMishima: stato.scuola,
    progressione: progressione(personaggio, dati),
    annotazioni,
    errori,
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
  for (const e of eventi) {
    let m;
    if ((m = /^caratteristiche:\+(\d+)$/.exec(e))) passi.push({ id: 'caratteristiche', titolo: 'Caratteristiche', rif: '§8.2', punti: Number(m[1]) });
    else if (e === 'talento_libero') passi.push({ id: 'talento', titolo: 'Talento Libero', rif: '§8.6, §8.8' });
    else if (e === 'grado_classe') passi.push({ id: 'grado', titolo: 'Grado di Classe', rif: '§8.7, cap. 3' });
    else if ((m = /^punti_abilita:(\d+)$/.exec(e))) puntiAbilita = Number(m[1]);
    else if ((m = /^salvezze:\+(\d+)$/.exec(e))) informazioni.push(`+${m[1]} a tutte le Prove Salvezza (§8.1.1)`);
    else if ((m = /^azione_principale:\+(\d+)$/.exec(e))) {
      const totale = dati.regole.azioni_primo_livello.principali + cumulato('azione_principale', n, dati);
      informazioni.push(`Azioni Principali per Round: ${totale} (§8.5)`);
    }
  }
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
