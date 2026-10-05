// Modello delle scelte del giocatore: stato iniziale, invalidazione a valle, anteprima dei
// valori derivati, serializzazione. Tutto ciò che è calcolato si ricava da calc.js: qui non
// si conservano mai valori derivati.
import {
  validaScelte, modOrdinario, modSalvezza, salvezza, puntiVita, puntiMagiaCreazione, iniziativa,
  bonusAvanzamentoSalvezze,
} from './calc.js';
import { statoIncantesimi } from './incantesimi.js';
import { specTiro, migraTiro, motivoFuoriIntervallo } from './tiri.js';
import { normalizzaEquipaggiamento, catalogo, risolvi, STATI, NOMI_TIPI, infoArtefattoVoce, migraVociDotazione } from './equipaggiamento.js';
import { ritrattoValido } from './ritratto.js';
import { normalizzaDotazione } from './dotazioni.js';
import { registraInstallazioni } from './umanita.js';
import { normalizzaVeicoli } from './veicoli.js';

// Personaggio a livelli { creazione, livelli } (cap. 8): modello e funzioni in avanzamento.js.
export {
  migraPersonaggio, livelloAttuale, prossimoLivello, applicaLivello, annullaUltimoLivello, VERSIONE_PERSONAGGIO,
} from './avanzamento.js';

export const FORMATO_FILE = 'mutant-personaggio';
// 2: i tiri di dado sono { valore, origine } (src/tiri.js); i file della versione 1 si migrano.
// 3: il file può contenere i livelli successivi al 1° ("livelli"); senza, è un personaggio al 1°.
// 4: anagrafica nella creazione e blocco "sessione" (valori attuali della modalità tavolo).
// 5: "equipaggiamento" è un elenco di voci (catalogo o personalizzate), non più un testo libero.
// 6: blocco facoltativo "calendario" (src/calendario.js); senza, il calendario non è attivo.
// 7: PI attuali degli oggetti nella sessione ("sessione.integrita", Armamenti §7.2.1); nei file
//    fino al 6 manca, e allineaSessione (src/sessione.js) mette ogni oggetto ai PI massimi.
// 8: blocco facoltativo "umanita" nelle scelte (src/umanita.js: perdite registrate all'installazione
//    degli impianti e recuperi concessi dal Direttore, Giocatore §5.21). Senza, nessuna perdita: al
//    caricamento si registrano gli impianti già installati (l'Interfaccia neurale «in uso» di prima).
export const VERSIONE_FORMATO = 8;

/**
 * Anagrafica del passo «Background e anagrafica»: tutti campi facoltativi e descrittivi, senza
 * regole. Classe, livello e Corporazione non sono qui: si calcolano. I Punti Esperienza sono
 * un numero libero (il manuale non prevede PX; il master li usa a modo suo).
 */
export const CAMPI_ANAGRAFICA = [
  { campo: 'soprannome', etichetta: 'Soprannome' },
  { campo: 'eta', etichetta: 'Età' },
  { campo: 'cittaNascita', etichetta: 'Città di nascita' },
  { campo: 'altezza', etichetta: 'Altezza' },
  { campo: 'peso', etichetta: 'Peso' },
  { campo: 'occhi', etichetta: 'Occhi' },
  { campo: 'capelli', etichetta: 'Capelli' },
  { campo: 'manoDominante', etichetta: 'Mano dominante', scelte: ['destra', 'sinistra', 'ambidestro'] },
  { campo: 'segniDistintivi', etichetta: 'Segni distintivi' },
];
export const MANI_DOMINANTI = ['destra', 'sinistra', 'ambidestro'];
const LUNGHEZZA_ANAGRAFICA = 120;

/** Scelte di un personaggio nuovo. È l'unico stato che si salva. */
export function nuoveScelte() {
  return {
    nome: '',
    concetto: '',
    soprannome: '',
    eta: '',
    cittaNascita: '',
    altezza: '',
    peso: '',
    occhi: '',
    capelli: '',
    manoDominante: '', // '' | 'destra' | 'sinistra' | 'ambidestro'
    segniDistintivi: '',
    puntiEsperienza: null, // numero libero o null
    corporazione: null,
    puntiCaratteristica: {},
    addestramento: null,
    classe: null,
    puntiAbilitaLiberi: {},
    incantesimi: [],
    puntiEroe: null, // { valore, origine: 'app' | 'manuale' }
    equipaggiamento: [], // voci { uid, rif, personalizzato?, stato, quantita, montato_su?, note } (src/equipaggiamento.js)
    dotazione: null, // §2.16: scelte dell'equipaggiamento iniziale e tiro dei crediti (src/dotazioni.js)
    ritratto: null, // data URL JPEG o PNG, ridimensionato nel browser (src/ritratto.js)
    // parametri dei Talenti di Classe del 1° livello: { nome del Talento: id dell'opzione } (Disciplina del Lottatore, §3.5.5)
    parametriTalenti: {},
    // Giocatore §5.21: { perdite: [{ uid, rif, nome, umn }], recuperi: [{ punti, nota }] } (src/umanita.js)
    umanita: null,
    // Veicoli posseduti (lotto 3 dei Veicoli; A.91 provvisoria: nel file del PG che li possiede, veicoli.json →
    // personaggio): [{ uid, profilo | scheda, nome, gruppo, conducente, andatura, pi, rinforzi, nec, avarie }]
    // (src/veicoli.js). Nel file solo se non vuoto: i personaggi senza veicoli restano identici.
    veicoli: [],
  };
}

// Le chiavi non elencate qui vengono scartate da normalizza(): così i personaggi salvati con
// tiroDadoPM alla creazione (prima della decisione 6 del master) perdono il tiro e i PM si
// ricalcolano con il dado massimizzato.
const CAMPI = Object.keys(nuoveScelte());
const trova = (lista, nome) => lista.find((x) => x.nome === nome);
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const somma = (obj) => Object.values(obj ?? {}).reduce((s, v) => s + v, 0);

/** Tiro dei Punti Eroe iniziali (§2.15), dalla formula in regole.json. */
export function specTiroPuntiEroe(dati) {
  const { dadi, facce, fisso } = dati.regole.punti_eroe;
  return specTiro({ dadi, facce, fisso });
}

/** Migra un tiro al formato { valore, origine } e lo scarta, con avviso, se non è ammesso. */
function normalizzaTiro(v, spec, etichetta, avvisi) {
  let t;
  try {
    t = migraTiro(v);
  } catch {
    avvisi.push(`${etichetta}: valore ${JSON.stringify(v)} non interpretabile, da rideterminare.`);
    return null;
  }
  if (!t) return null;
  const motivo = motivoFuoriIntervallo(t.valore, spec);
  if (motivo) {
    avvisi.push(`${etichetta}: ${motivo} Da rideterminare.`);
    return null;
  }
  return t;
}

export function eTaumaturgo(scelte, dati) {
  return scelte?.addestramento === dati.regole.taumaturgo.addestramento;
}

/**
 * Magia sez. 6 e §7.10: ogni contenitore di Chroma si sintonizza e si ricarica da solo, quindi è una
 * voce con quantità 1. Una voce salvata con quantità N diventa N voci: la prima conserva uid, note
 * e sintonizzazione (così il budget del §7.10 non cambia); le altre hanno uid «<uid>-2», «<uid>-3»…
 * e partono non sintonizzate. I contenitori integrati (Bordone Templare…) seguono l'oggetto.
 */
function dividiContenitori(voci, dati, avvisi) {
  const cat = catalogo(dati);
  const usati = new Set(voci.map((v) => v.uid));
  const out = [];
  for (const v of voci) {
    const r = risolvi(v, cat);
    const c = r.fuoriCatalogo ? null : infoArtefattoVoce(r, dati)?.contenitore;
    if (!c || c.integrato || v.quantita <= 1) { out.push(v); continue; }
    out.push({ ...v, quantita: 1 });
    for (let k = 2; k <= v.quantita; k++) {
      let uid = `${v.uid}-${k}`;
      while (usati.has(uid)) uid = `${uid}x`;
      usati.add(uid);
      const copia = { ...v, uid, quantita: 1, note: '' };
      delete copia.sintonizzato;
      out.push(copia);
    }
    avvisi.push(`${r.nome} ×${v.quantita}: diviso in ${v.quantita} voci, una per contenitore (ognuno si sintonizza e si ricarica da solo, Magia sez. 6). Resta sintonizzato solo il primo.`);
  }
  return out;
}

/** Applica una modifica parziale e riporta a coerenza ciò che sta a valle. */
export function applicaModifica(scelte, modifica, dati) {
  return normalizza({ ...scelte, ...modifica }, dati);
}

/**
 * Rende coerenti le scelte con i dati e fra loro. Ciò che non è più ammesso a valle di una
 * modifica viene azzerato o ridotto, e ogni intervento produce un avviso leggibile.
 * Serve anche all'import e al caricamento: se Davide cambia una tabella, le scelte che non
 * tornano più vengono segnalate invece di produrre una scheda sbagliata.
 * @returns {{scelte: object, avvisi: string[]}}
 */
export function normalizza(scelteIn, dati) {
  const s = { ...nuoveScelte(), ...structuredClone(isOggetto(scelteIn) ? scelteIn : {}) };
  for (const k of Object.keys(s)) if (!CAMPI.includes(k)) delete s[k];
  const avvisi = [];
  const r = dati.regole;

  for (const k of ['nome', 'concetto']) if (typeof s[k] !== 'string') s[k] = '';
  // Equipaggiamento: il vecchio campo di testo diventa un oggetto personalizzato «altro» con il
  // testo nelle note; gli stati non ammessi per il tipo tornano «nello zaino».
  s.equipaggiamento = normalizzaEquipaggiamento(s.equipaggiamento);
  // risposta A.21: il Chroma Viola non è più un contenitore inerte; il contenitore personalizzato
  // Viola salvato prima diventa l'oggetto del catalogo «Chroma Viola (frammento)», senza PM
  const coloriNo = Object.entries(r.chroma?.colori ?? {}).filter(([, x]) => x.contenitore === false && x.corruzione_passiva);
  s.equipaggiamento = s.equipaggiamento.map((v) => {
    const c = coloriNo.find(([nome]) => v.personalizzato?.energia === nome);
    const rif = c ? r.corruzione?.[c[1].corruzione_passiva]?.oggetto : null;
    if (!rif) return v;
    avvisi.push(`«${v.personalizzato.nome}»: il Chroma ${c[0]} non è più un contenitore di PM ma una fonte di Corruzione passiva (risposta di Davide A.21). Ora è «Chroma Viola (frammento)», senza PM.`);
    return { uid: v.uid, rif, stato: null, quantita: v.quantita, note: [v.note, v.personalizzato.nome !== 'Chroma Viola (frammento)' ? `era «${v.personalizzato.nome}»` : ''].filter(Boolean).join(' · ') };
  });
  // voci di catalogo sostituite da un'altra scheda (index.json → rif_sostituiti): l'Interfaccia neurale
  // degli Armamenti è l'impianto del §7.3 (in uso → installato), i doppioni dei NEC sono il catalogo NEC
  const sostituiti = dati.equipaggiamento?.indice?.rif_sostituiti ?? {};
  for (const v of s.equipaggiamento) {
    const x = v.rif ? sostituiti[v.rif] : null;
    if (!x) continue;
    v.rif = x.rif;
    if (x.stati && v.stato in x.stati) v.stato = x.stati[v.stato];
    // una confezione diventa le sue unità (A.71: cinque set chirurgici → cinque Cartucce chirurgiche)
    if (Number.isInteger(x.quantita_per) && x.quantita_per > 1) v.quantita = (Number.isInteger(v.quantita) ? v.quantita : 1) * x.quantita_per;
  }
  const cat = catalogo(dati);
  // A.34: oggetti di dotazione come voci della loro scheda di catalogo (PS Integrità e PI dalla scheda)
  s.equipaggiamento = migraVociDotazione(s.equipaggiamento, cat);
  for (const v of s.equipaggiamento) {
    const r = risolvi(v, cat);
    if (r.fuoriCatalogo) continue; // resta com'è: «non più in catalogo», senza effetti
    if (r.deposito) continue; // il deposito comune vale per ogni tipo (docs/layout-sd.md)
    const stati = r.stati; // del tipo, oppure In uso / Nello zaino per gli oggetti con effetti
    // gli Artefatti salvati prima degli stati (batterie) erano con il personaggio: «trasportato»
    if (r.tipo === 'artefatto' && v.stato === null && stati.includes('trasportato')) { v.stato = 'trasportato'; continue; }
    // oggetti senza stati propri che hanno effetti sui VA (corredi, kit…): erano con il personaggio
    if (v.stato === null && !(STATI[r.tipo] ?? []).length && stati.includes('in_uso')) { v.stato = 'in_uso'; continue; }
    if (stati.length ? !stati.includes(v.stato) : v.stato !== null) {
      if (v.stato !== null) avvisi.push(`${r.nome}: stato «${v.stato}» non valido per ${NOMI_TIPI[r.tipo]}, rimesso ${stati.length ? 'nello zaino' : 'senza stato'}.`);
      v.stato = stati.length ? stati.at(-1) : null;
    }
  }
  s.equipaggiamento = dividiContenitori(s.equipaggiamento, dati, avvisi);
  // Equipaggiamento §7.1: il costo UMN si registra all'installazione e non si restituisce
  s.umanita = registraInstallazioni(s.umanita, s.equipaggiamento, dati, avvisi);
  s.veicoli = dati.veicoli ? normalizzaVeicoli(s.veicoli, dati, avvisi) : (Array.isArray(s.veicoli) ? s.veicoli : []);
  // Anagrafica: facoltativa; i personaggi salvati prima l'hanno vuota.
  for (const { campo } of CAMPI_ANAGRAFICA) {
    if (typeof s[campo] !== 'string') s[campo] = '';
    else if (s[campo].length > LUNGHEZZA_ANAGRAFICA) s[campo] = s[campo].slice(0, LUNGHEZZA_ANAGRAFICA);
  }
  if (s.manoDominante && !MANI_DOMINANTI.includes(s.manoDominante)) {
    avvisi.push(`Mano dominante "${s.manoDominante}" non riconosciuta: campo svuotato.`);
    s.manoDominante = '';
  }
  if (s.puntiEsperienza !== null && !(typeof s.puntiEsperienza === 'number' && Number.isFinite(s.puntiEsperienza))) {
    if (s.puntiEsperienza !== undefined && s.puntiEsperienza !== '') avvisi.push(`Punti esperienza ${JSON.stringify(s.puntiEsperienza)} non numerici: campo svuotato.`);
    s.puntiEsperienza = null;
  }
  // Ritratto: solo un'immagine JPEG o PNG entro il peso massimo; altrimenti si toglie
  if (s.ritratto !== null && !ritrattoValido(s.ritratto)) {
    avvisi.push('Ritratto non valido o troppo pesante: rimosso (caricalo di nuovo dal passo Background).');
    s.ritratto = null;
  }
  for (const k of ['puntiCaratteristica', 'puntiAbilitaLiberi', 'parametriTalenti']) if (!isOggetto(s[k])) s[k] = {};
  for (const [k, v] of Object.entries(s.parametriTalenti)) if (typeof v !== 'string' || !v) delete s.parametriTalenti[k];
  if (!Array.isArray(s.incantesimi)) s.incantesimi = [];

  // Riferimenti ai dati
  const riferimenti = [
    ['corporazione', dati.corporazioni.corporazioni, 'La Corporazione'],
    ['addestramento', dati.addestramenti.addestramenti, 'L’Addestramento'],
    ['classe', dati.classi.classi, 'La Classe'],
  ];
  for (const [campo, lista, etichetta] of riferimenti) {
    if (s[campo] === undefined || s[campo] === '') s[campo] = null;
    if (s[campo] !== null && !trova(lista, s[campo])) {
      avvisi.push(`${etichetta} "${s[campo]}" non esiste nei dati attuali: scelta azzerata.`);
      s[campo] = null;
    }
  }
  const corp = trova(dati.corporazioni.corporazioni, s.corporazione);
  const addestr = trova(dati.addestramenti.addestramenti, s.addestramento);
  let classe = trova(dati.classi.classi, s.classe);

  // §2.2 e §2.12: la prima Classe appartiene all'Addestramento.
  if (classe && classe.addestramento !== s.addestramento) {
    avvisi.push(s.addestramento
      ? `La Classe ${classe.nome} appartiene all’Addestramento ${classe.addestramento}: con ${s.addestramento} va scelta di nuovo.`
      : `La Classe ${classe.nome} è stata azzerata perché manca l’Addestramento.`);
    s.classe = null;
    classe = undefined;
  }

  // §2.1: Punti Caratteristica
  const sigle = dati.caratteristiche.caratteristiche.map((c) => c.sigla);
  const massimo = r.creazione.massimo_caratteristica;
  for (const [k, v] of Object.entries(s.puntiCaratteristica)) {
    if (!sigle.includes(k) || !Number.isInteger(v) || v <= 0) {
      if (v !== 0) avvisi.push(`Punti Caratteristica "${k}": valore ${JSON.stringify(v)} non ammesso, rimosso.`);
      delete s.puntiCaratteristica[k];
      continue;
    }
    if (corp && corp.caratteristiche[k] + v > massimo) {
      const nuovo = Math.max(0, massimo - corp.caratteristiche[k]);
      avvisi.push(`${k}: con ${corp.nome} parte da ${corp.caratteristiche[k]}; i punti assegnati scendono da ${v} a ${nuovo} per non superare ${massimo}.`);
      if (nuovo > 0) s.puntiCaratteristica[k] = nuovo;
      else delete s.puntiCaratteristica[k];
    }
  }
  if (somma(s.puntiCaratteristica) > r.creazione.punti_caratteristica) {
    avvisi.push(`I Punti Caratteristica assegnati superano ${r.creazione.punti_caratteristica}: sono stati azzerati.`);
    s.puntiCaratteristica = {};
  }

  // §2.13: Punti Abilità Liberi
  const nomiAbilita = dati.abilita.abilita.map((a) => a.nome);
  for (const [k, v] of Object.entries(s.puntiAbilitaLiberi)) {
    if (!nomiAbilita.includes(k) || !Number.isInteger(v) || v <= 0) {
      if (v !== 0) avvisi.push(`Punti Abilità "${k}": valore ${JSON.stringify(v)} non ammesso, rimosso.`);
      delete s.puntiAbilitaLiberi[k];
    }
  }
  // Punti oltre il totale delle regole correnti: non si tolgono, la scheda li segnala come eccesso
  // (le regole possono cambiare: Giocatore, Doc del 27/09/2026; per-davide A.52)
  if (corp && addestr && classe) {
    // Toglie un punto alla volta dove validaScelte segnala una violazione (VA < 1 prima dei punti). I
    // punti che non aumentano il VA personale (limiti del 29/09, §2.13) non si tolgono da soli: restano
    // nelle scelte, il wizard li segnala sulla riga e la scheda li fa riassegnare (per-davide A.57).
    const ridotti = new Map();
    for (let giro = 0; giro < 50; giro++) {
      const v = validaScelte(s, dati).find((e) => e.tipo === 'violazione' && e.campo.startsWith('puntiAbilitaLiberi.') && !e.inattivi);
      if (!v) break;
      const nome = v.campo.slice('puntiAbilitaLiberi.'.length);
      if (!ridotti.has(nome)) ridotti.set(nome, { prima: s.puntiAbilitaLiberi[nome], motivo: v.problema });
      if (s.puntiAbilitaLiberi[nome] > 1) s.puntiAbilitaLiberi[nome] -= 1;
      else delete s.puntiAbilitaLiberi[nome];
    }
    for (const [nome, { prima, motivo }] of ridotti) {
      avvisi.push(`${nome}: punti liberi ridotti da ${prima} a ${s.puntiAbilitaLiberi[nome] ?? 0} (${motivo}).`);
    }
  }

  // Incantesimi: solo con l'Addestramento Taumaturgo (§2.10).
  if (!eTaumaturgo(s, dati)) {
    if (s.incantesimi.length) avvisi.push(`Gli incantesimi scelti (${s.incantesimi.length}) sono stati rimossi: servono l’Addestramento ${r.taumaturgo.addestramento}.`);
    s.incantesimi = [];
  } else {
    const catalogo = dati.incantesimi.incantesimi;
    const visti = new Set();
    s.incantesimi = s.incantesimi.filter((n) => {
      if (visti.has(n)) return false;
      visti.add(n);
      if (!trova(catalogo, n)) { avvisi.push(`L’incantesimo "${n}" non esiste nei dati attuali: rimosso.`); return false; }
      return true;
    });
    const stato = statoIncantesimi(s, dati);
    if (stato) {
      const troppoAlti = s.incantesimi.filter((n) => trova(catalogo, n).livello_base > stato.livelloMassimo);
      for (const n of troppoAlti) avvisi.push(`${n}: livello base oltre il massimo ${stato.livelloMassimo}, rimosso.`);
      s.incantesimi = s.incantesimi.filter((n) => !troppoAlti.includes(n));
      // Se le quote non bastano più (cambio di Classe o di INT) si tolgono gli ultimi aggiunti in eccesso.
      const rimossi = [];
      for (let st = statoIncantesimi(s, dati); st && (st.eccesso || st.scelti > st.totale); st = statoIncantesimi(s, dati)) {
        const i = s.incantesimi.findLastIndex((n) => {
          const m = st.perMacro[trova(catalogo, n).macrofamiglia];
          return m.scelti > m.quota;
        });
        rimossi.push(...s.incantesimi.splice(i === -1 ? s.incantesimi.length - 1 : i, 1));
      }
      if (rimossi.length) avvisi.push(`Quote incantesimi superate: rimossi ${rimossi.join(', ')}.`);
    }
  }

  // §2.15: Punti Eroe
  const specPE = specTiroPuntiEroe(dati);
  s.puntiEroe = normalizzaTiro(s.puntiEroe, specPE, `Punti Eroe (${specPE.formula})`, avvisi);

  // §2.16: equipaggiamento iniziale (le voci stanno in `equipaggiamento`, qui solo le scelte)
  s.dotazione = normalizzaDotazione(s.dotazione, s.classe, dati, normalizzaTiro, avvisi);

  return { scelte: s, avvisi };
}

/**
 * Valori derivati disponibili anche con scelte parziali (per il riepilogo durante il wizard):
 * Caratteristiche con la sola Corporazione, Salvezze con Corporazione e Addestramento,
 * PV/PM con Corporazione e Classe. Usa solo le funzioni di calc.js.
 */
export function anteprima(scelte, dati) {
  const r = dati.regole;
  const corp = trova(dati.corporazioni.corporazioni, scelte.corporazione);
  const addestr = trova(dati.addestramenti.addestramenti, scelte.addestramento);
  const classe = trova(dati.classi.classi, scelte.classe);
  const out = {
    caratteristiche: null, salvezze: null, pv: null, pm: null, iniziativa: null,
    puntiCaratteristicaRimasti: r.creazione.punti_caratteristica - somma(scelte.puntiCaratteristica),
    puntiAbilitaRimasti: r.creazione.punti_abilita_liberi - somma(scelte.puntiAbilitaLiberi),
    incantesimi: statoIncantesimi(scelte, dati),
  };
  if (!corp) return out;
  const { modificatore_ordinario: tabOrd, modificatore_salvezza: tabSal } = dati.caratteristiche;
  out.caratteristiche = {};
  for (const { sigla, nome } of dati.caratteristiche.caratteristiche) {
    const valore = corp.caratteristiche[sigla] + (scelte.puntiCaratteristica?.[sigla] ?? 0);
    const leggibile = valore >= dati.caratteristiche.valore_minimo && valore <= dati.caratteristiche.valore_massimo;
    out.caratteristiche[sigla] = {
      nome, valore,
      mod: leggibile ? modOrdinario(valore, tabOrd) : null,
      modSalvezza: leggibile ? modSalvezza(valore, tabSal) : null,
    };
  }
  const car = out.caratteristiche;
  const mods = r.iniziativa.caratteristiche.map((s) => car[s].mod);
  if (mods.every(Number.isInteger)) out.iniziativa = iniziativa(...mods);
  if (addestr) {
    out.salvezze = {};
    const avanz = bonusAvanzamentoSalvezze(1, r);
    for (const { id, nome, caratteristica } of dati.caratteristiche.salvezze) {
      const m = car[caratteristica].modSalvezza;
      out.salvezze[id] = {
        nome,
        totale: m === null ? null : salvezza({
          base8: r.salvezze.base, modSpecifico: m, addestramento: addestr.salvezze[id],
          corporazione: corp.salvezze[id], avanzamento: avanz,
        }),
      };
    }
  }
  if (classe) {
    out.pv = puntiVita(car.COS.valore, classe, { dadoMassimizzato: r.creazione.dado_pv_massimizzato });
    out.pm = puntiMagiaCreazione(car.SAG.valore, classe, r);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Serializzazione: il file contiene solo le scelte (creazione e livelli), mai valori calcolati.

/**
 * Nome del file esportato: «<nome>_liv<N>_<AAAA-MM-GG>.json», così la cartella dei backup racconta
 * la storia da sola. Dal nome si tolgono i caratteri non ammessi nei file (Windows compreso) e gli
 * spazi diventano trattini; maiuscole e accenti restano. Nome vuoto: «personaggio». L'import non
 * dipende dal nome del file.
 */
export function nomeFileEsportazione(nome, livello, data = new Date()) {
  return `${nomeFilePulito(nome)}_liv${Number.isInteger(livello) && livello > 0 ? livello : 1}_${giornoFile(data)}.json`;
}

/** Nome del file del solo calendario: calendario_<nome>_<data>.json, con lo stesso ripulimento. */
export function nomeFileCalendario(nome, data = new Date()) {
  return `calendario_${nomeFilePulito(nome)}_${giornoFile(data)}.json`;
}

/** Nome del personaggio adatto a un nome di file (vuoto: «personaggio»). */
function nomeFilePulito(nome) {
  const pulito = String(nome ?? '')
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  return pulito || 'personaggio';
}

function giornoFile(data) {
  const due = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())}`;
}

/**
 * Identificativo del personaggio, creato alla nascita e scritto nel file («pg»): non dipende dal nome. La
 * cartella del server e la scheda riconoscono un PG da questo, non dal nome del file (due PG «Lucas» e «LUCAS»
 * sono due personaggi anche se su Windows i loro file si chiamerebbero allo stesso modo). Casuale, 96 bit:
 * crypto.getRandomValues c'è anche fuori dai contesti sicuri (un giocatore collegato via IP in http).
 */
export function nuovoPg() {
  const b = new Uint8Array(12);
  globalThis.crypto.getRandomValues(b);
  return `pg-${[...b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
/** Un identificativo di personaggio valido (quello di nuovoPg, o simile): stringa breve senza spazi. */
export const isPg = (v) => typeof v === 'string' && /^[\w-]{6,64}$/.test(v);

export function serializza(scelte, { versioniDati, livelli, sessione, calendario, pg = null } = {}) {
  const pulite = {};
  for (const k of CAMPI) pulite[k] = scelte?.[k] ?? nuoveScelte()[k];
  // senza ritratto e senza dotazione iniziale i campi non si scrivono: i file di prima restano
  // identici byte per byte
  if (pulite.ritratto === null) delete pulite.ritratto;
  if (pulite.dotazione === null) delete pulite.dotazione;
  if (pulite.umanita === null) delete pulite.umanita;
  if (!Array.isArray(pulite.veicoli) || !pulite.veicoli.length) delete pulite.veicoli;
  if (!Object.keys(pulite.parametriTalenti ?? {}).length) delete pulite.parametriTalenti;
  const file = { formato: FORMATO_FILE, versione: VERSIONE_FORMATO };
  // identificativo del personaggio (nuovoPg): scritto solo se c'è, così i file di prima restano identici
  if (isPg(pg)) file.pg = pg;
  // in ordine alfabetico: l'ordine di caricamento dei file dati varia, il file esportato no
  if (versioniDati) file.versioni_dati = Object.fromEntries(Object.entries(versioniDati).sort(([a], [b]) => a.localeCompare(b)));
  file.scelte = pulite;
  if (Array.isArray(livelli) && livelli.length) file.livelli = livelli;
  if (isOggetto(sessione)) file.sessione = sessione;
  if (isOggetto(calendario)) file.calendario = calendario;
  return JSON.stringify(file, null, 2);
}

/**
 * Legge un file esportato con i livelli: { creazione, livelli, sessione, calendario }. I file senza
 * livelli (formati 1 e 2, o personaggi al 1° livello) danno livelli: []; senza sessione, sessione: null
 * (va inizializzata con allineaSessione); senza calendario (formati 1–5), calendario: null, cioè non
 * attivo (va passato a normalizzaCalendario). La creazione va poi normalizzata.
 */
export function deserializzaPersonaggio(testo) {
  const creazione = deserializza(testo);
  const obj = JSON.parse(testo);
  const livelli = obj?.formato === FORMATO_FILE && obj.livelli !== undefined ? obj.livelli : [];
  if (!Array.isArray(livelli) || !livelli.every(isOggetto)) throw new Error('I livelli del personaggio nel file non sono validi.');
  const sessione = obj?.formato === FORMATO_FILE && isOggetto(obj.sessione) ? obj.sessione : null;
  const calendario = obj?.formato === FORMATO_FILE && isOggetto(obj.calendario) ? obj.calendario : null;
  const pg = obj?.formato === FORMATO_FILE && isPg(obj.pg) ? obj.pg : null;
  return { creazione, livelli, sessione, calendario, pg };
}

/**
 * Legge un file esportato. Lancia un Error con messaggio leggibile se il file non è valido.
 * Restituisce le scelte grezze: vanno poi passate a normalizza() con i dati correnti.
 */
export function deserializza(testo) {
  let obj;
  try {
    obj = JSON.parse(testo);
  } catch {
    throw new Error('Il file non è un JSON valido.');
  }
  if (!isOggetto(obj)) throw new Error('Il file non contiene un personaggio.');
  if (obj.formato !== undefined && obj.formato !== FORMATO_FILE) {
    throw new Error(`Formato "${obj.formato}" sconosciuto: atteso "${FORMATO_FILE}".`);
  }
  if (Number.isInteger(obj.versione) && obj.versione > VERSIONE_FORMATO) {
    throw new Error(`Il file è stato creato con una versione più recente dell’app (formato ${obj.versione}).`);
  }
  const scelte = obj.formato === FORMATO_FILE ? obj.scelte : obj;
  if (!isOggetto(scelte) || !CAMPI.some((k) => k in scelte)) throw new Error('Il file non contiene le scelte di un personaggio.');
  const out = {};
  for (const k of CAMPI) if (k in scelte) out[k] = scelte[k];
  return { ...nuoveScelte(), ...out };
}
