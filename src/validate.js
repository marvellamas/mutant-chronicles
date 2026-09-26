// Validatore dei dati delle regole (data/*.json).
// Controlla gli invarianti dei manuali e restituisce errori leggibili: file, chiave, problema.
// Non lancia eccezioni: un file malformato produce errori, non un crash.
import { TIPI as TIPI_EQUIP } from './equipaggiamento.js';

// Invarianti strutturali dei manuali. I valori numerici "di gioco" stanno in regole.json;
// qui restano solo le forme fisse descritte dai paragrafi citati.
const NUM_CARATTERISTICHE = 6; // §2.1
const ABILITA_CORPORAZIONE = 4; // §2.9: +1 a quattro Abilità
const SPECIALIZZAZIONI_CLASSE = 2; // §3.1
const ABILITA_CLASSE = 5; // §3.1
const GRADI_TALENTI_FISSI = [1, 3, 5]; // §3.2
const TALENTI_A_SCELTA = 5; // §3.2
const SPECIALIZZAZIONE_COMUNE = 'Comune'; // §3.2: due opzioni per Specializzazione, una Comune

const isIntero = (v) => Number.isInteger(v);
const isTesto = (v) => typeof v === 'string' && v.trim() !== '';
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isTodo = (v) => typeof v === 'string' && v.startsWith('TODO(');

const FILE_VALIDATI = ['caratteristiche', 'abilita', 'corporazioni', 'addestramenti', 'classi', 'incantesimi', 'regole',
  'talenti_liberi', 'specializzazioni', 'tecniche_interiori'];

/** Formatta un errore come riga leggibile. */
export function formattaErrore(e) {
  return `${e.file}${e.chiave ? ' › ' + e.chiave : ''}: ${e.problema}`;
}

/**
 * Valida l'insieme dei dati delle regole.
 * @param {object} dati { caratteristiche, abilita, corporazioni, addestramenti, classi, incantesimi, regole,
 *   talenti_liberi, specializzazioni, tecniche_interiori }
 *   ciascuno col contenuto del rispettivo file JSON.
 * @returns {{file: string, chiave: string, problema: string}[]} lista vuota se tutto torna.
 */
export function validaDati(dati) {
  const errori = [];
  const err = (file, chiave, problema) => errori.push({ file: `${file}.json`, chiave, problema });

  if (!isOggetto(dati)) {
    err('(dati)', '', 'nessun dato caricato');
    return errori;
  }

  for (const file of FILE_VALIDATI) {
    if (!isOggetto(dati[file])) err(file, '', 'file mancante o non è un oggetto JSON');
    else if (!isTesto(dati[file].versione_manuale)) err(file, 'versione_manuale', 'campo mancante o vuoto');
  }

  const sigle = validaCaratteristiche(dati.caratteristiche, err);
  const nomiAbilita = validaAbilita(dati.abilita, sigle, err);
  const idSalvezze = (dati.caratteristiche?.salvezze ?? []).map((s) => s?.id);
  validaRegole(dati.regole, err);
  validaCorporazioni(dati.corporazioni, sigle, nomiAbilita, idSalvezze, dati.caratteristiche, err);
  const nomiAddestramenti = validaAddestramenti(dati.addestramenti, nomiAbilita, idSalvezze, dati.regole, err);
  const macrofamiglie = validaIncantesimi(dati.incantesimi, dati.regole, err);
  validaClassi(dati.classi, nomiAddestramenti, nomiAbilita, macrofamiglie, dati.regole, err);
  validaAvanzamento(dati.regole, err);
  const idSpec = validaSpecializzazioni(dati.specializzazioni, nomiAbilita, err);
  validaTalentiLiberi(dati.talenti_liberi, idSpec, err);
  validaTecniche(dati.tecniche_interiori, err);
  validaEquipaggiamento(dati.equipaggiamento, [...nomiAbilita], [...(idSpec ?? [])], err);

  return errori;
}

/** Elenca i punti marcati TODO(Davide) nei dati, per mostrarli nell'app. */
export function trovaTodo(dati) {
  const trovati = [];
  const visita = (v, percorso) => {
    if (typeof v === 'string' && v.includes('TODO(')) trovati.push({ percorso, testo: v });
    else if (Array.isArray(v)) v.forEach((x, i) => visita(x, `${percorso}[${i}]`));
    else if (isOggetto(v)) {
      for (const [k, x] of Object.entries(v)) {
        if (k.startsWith('TODO(')) {
          // una chiave TODO(...) con una lista di domande: una voce per domanda
          const domande = Array.isArray(x) ? x : [x];
          domande.forEach((d, i) => trovati.push({ percorso: `${percorso}.${k}${Array.isArray(x) ? `[${i}]` : ''}`, testo: String(d) }));
          continue;
        }
        visita(x, `${percorso}.${k}`);
      }
    }
  };
  for (const [file, contenuto] of Object.entries(dati ?? {})) visita(contenuto, `${file}.json`);
  return trovati;
}

// ---------------------------------------------------------------------------

function listaNominata(file, contenuto, campo, err) {
  const lista = contenuto?.[campo];
  if (!Array.isArray(lista)) {
    if (isOggetto(contenuto)) err(file, campo, 'deve essere una lista');
    return [];
  }
  const visti = new Set();
  lista.forEach((x, i) => {
    if (!isOggetto(x) || !isTesto(x.nome ?? x.sigla)) {
      err(file, `${campo}[${i}]`, 'voce senza nome');
      return;
    }
    const n = x.nome ?? x.sigla;
    if (visti.has(n)) err(file, `${campo}[${i}]`, `nome "${n}" duplicato`);
    visti.add(n);
  });
  return lista.filter(isOggetto);
}

function validaCaratteristiche(c, err) {
  if (!isOggetto(c)) return new Set();
  const F = 'caratteristiche';
  const lista = listaNominata(F, c, 'caratteristiche', err);
  if (lista.length !== NUM_CARATTERISTICHE) err(F, 'caratteristiche', `attese ${NUM_CARATTERISTICHE} Caratteristiche, trovate ${lista.length}`);
  lista.forEach((x, i) => {
    if (!isTesto(x.sigla) || !isTesto(x.nome)) err(F, `caratteristiche[${i}]`, 'servono "sigla" e "nome"');
    // la descrizione può valere "TODO(Davide)": in quel caso è un avviso (avvisiDati), non un errore
    if (!isTesto(x.descrizione)) err(F, `caratteristiche[${i}] (${x.sigla}).descrizione`, 'descrizione mancante o vuota (usa "TODO(Davide)" se non è ancora disponibile)');
  });
  const sigle = new Set(lista.map((x) => x.sigla));

  const { valore_minimo: min, valore_massimo: max } = c;
  if (!isIntero(min) || !isIntero(max) || min > max) {
    err(F, 'valore_minimo/valore_massimo', 'devono essere interi con minimo ≤ massimo');
  } else {
    for (const tab of ['modificatore_ordinario', 'modificatore_salvezza']) {
      if (!isOggetto(c[tab])) { err(F, tab, 'tabella mancante'); continue; }
      for (let v = min; v <= max; v++) {
        if (!isIntero(c[tab][String(v)])) err(F, `${tab}.${v}`, `manca il modificatore intero per il valore ${v}`);
      }
    }
  }
  const salvezze = Array.isArray(c.salvezze) ? c.salvezze : [];
  if (salvezze.length === 0) err(F, 'salvezze', 'lista delle Salvezze mancante');
  salvezze.forEach((s, i) => {
    if (!isTesto(s?.id) || !isTesto(s?.nome)) err(F, `salvezze[${i}]`, 'servono "id" e "nome"');
    if (!sigle.has(s?.caratteristica)) err(F, `salvezze[${i}].caratteristica`, `"${s?.caratteristica}" non è una Caratteristica`);
  });
  return sigle;
}

function validaAbilita(a, sigle, err) {
  if (!isOggetto(a)) return new Set();
  const F = 'abilita';
  const categorie = new Set(Array.isArray(a.categorie) ? a.categorie : []);
  if (categorie.size === 0) err(F, 'categorie', 'lista delle categorie mancante');
  const lista = listaNominata(F, a, 'abilita', err);
  lista.forEach((x, i) => {
    const k = `abilita[${i}] (${x.nome})`;
    if (!sigle.has(x.caratteristica)) err(F, `${k}.caratteristica`, `"${x.caratteristica}" non è una Caratteristica esistente`);
    if (!categorie.has(x.categoria)) err(F, `${k}.categoria`, `"${x.categoria}" non è fra le categorie`);
    // §4.4: ogni Abilità ha una descrizione estesa (mostrata nei tooltip)
    if (!isTesto(x.descrizione)) err(F, `${k}.descrizione`, 'descrizione mancante o vuota (§4.4)');
  });
  return new Set(lista.map((x) => x.nome));
}

function validaRegole(r, err) {
  if (!isOggetto(r)) return;
  const F = 'regole';
  const interi = [
    'creazione.punti_caratteristica', 'creazione.massimo_caratteristica', 'creazione.punti_abilita_liberi',
    'creazione.avanzamento_massimo_iniziale', 'creazione.va_minimo_per_punti_liberi', 'creazione.bonus_classe_per_grado',
    'salvezze.base', 'punti_eroe.dadi', 'punti_eroe.facce', 'punti_eroe.fisso', 'punti_eroe.minimo',
    'punti_eroe.massimo', 'punti_eroe.riserva_massima', 'movimento.passo', 'movimento.corsa', 'movimento.scatto',
    'addestramento.punti_totali', 'taumaturgo.incantesimi_liberi.fisso', 'taumaturgo.incantesimi_liberi.minimo',
    'incantesimi.per_specializzazione',
  ];
  for (const percorso of interi) {
    const v = percorso.split('.').reduce((o, k) => o?.[k], r);
    if (!isIntero(v)) err(F, percorso, 'numero intero mancante');
  }
  const pe = r.punti_eroe;
  if (isOggetto(pe) && isIntero(pe.dadi) && isIntero(pe.fisso)) {
    if (pe.minimo !== pe.dadi + pe.fisso) err(F, 'punti_eroe.minimo', `con ${pe.formula} il minimo è ${pe.dadi + pe.fisso}`);
    if (pe.massimo !== pe.dadi * pe.facce + pe.fisso) err(F, 'punti_eroe.massimo', `con ${pe.formula} il massimo è ${pe.dadi * pe.facce + pe.fisso}`);
  }
  if (!Array.isArray(r.salvezze?.avanzamento_per_livello)) err(F, 'salvezze.avanzamento_per_livello', 'tabella mancante');
  if (!Array.isArray(r.iniziativa?.caratteristiche)) err(F, 'iniziativa.caratteristiche', 'lista mancante');
  for (const tab of ['addestramento.schema', 'incantesimi.schema_livello_base']) {
    const v = tab.split('.').reduce((o, k) => o?.[k], r);
    if (!isOggetto(v) || !Object.values(v).every(isIntero)) err(F, tab, 'tabella {valore: quantità} mancante o non numerica');
  }
  if (typeof r.creazione?.dado_pm_massimizzato !== 'boolean') err(F, 'creazione.dado_pm_massimizzato', 'vero o falso mancante');
  // §5.14 e §5.18: Stati di Ferita e Stati, stampati sul foglio Combattimento
  const fer = r.ferite?.stati;
  if (!Array.isArray(fer) || !fer.length) err(F, 'ferite.stati', 'elenco {nome, penalita} mancante');
  else fer.forEach((x, i) => {
    if (!isTesto(x?.nome)) err(F, `ferite.stati[${i}].nome`, 'nome mancante');
    if (!isIntero(x?.penalita) || x.penalita > 0) err(F, `ferite.stati[${i}].penalita`, 'penalità intera ≤ 0 mancante');
  });
  const st = r.stati?.elenco;
  if (!Array.isArray(st) || !st.length) err(F, 'stati.elenco', 'elenco {nome, durata} mancante');
  else {
    const ids = new Set();
    st.forEach((x, i) => {
      if (!isTesto(x?.nome)) err(F, `stati.elenco[${i}].nome`, 'nome mancante');
      if (!isTesto(x?.id)) err(F, `stati.elenco[${i}].id`, 'id mancante (serve a salvare gli Stati attivi della sessione)');
      else if (ids.has(x.id)) err(F, `stati.elenco[${i}].id`, `id "${x.id}" ripetuto`);
      else ids.add(x.id);
      // i promemoria sono riassunti nostri, non testo del manuale: va dichiarato
      if (x?.promemoria !== undefined && x.riassunto !== true) err(F, `stati.elenco[${i}].riassunto`, 'il promemoria è un riassunto: serve "riassunto": true');
    });
  }
  // §5.19: Affaticamento, un unico Stato con la sua penalità
  const aft = r.affaticamento?.stati;
  if (!Array.isArray(aft) || !aft.length) err(F, 'affaticamento.stati', 'elenco {nome, penalita} mancante');
  else aft.forEach((x, i) => {
    if (!isTesto(x?.nome)) err(F, `affaticamento.stati[${i}].nome`, 'nome mancante');
    if (!isIntero(x?.penalita) || x.penalita > 0) err(F, `affaticamento.stati[${i}].penalita`, 'penalità intera ≤ 0 mancante');
  });
  if (!isIntero(r.difese?.parata_distanza_arma) || r.difese.parata_distanza_arma > 0) err(F, 'difese.parata_distanza_arma', 'penalità intera ≤ 0 mancante (Giocatore §5.9)');
  if (!isIntero(r.punti_eroe?.distintivi_per_punto_eroe) || r.punti_eroe.distintivi_per_punto_eroe < 1) {
    err(F, 'punti_eroe.distintivi_per_punto_eroe', 'numero intero ≥ 1 mancante (§1.8.3)');
  }
  // Livello massimo degli incantesimi per Gradi taumaturgici (tabella del master): Gradi da 1,
  // senza buchi, livelli non decrescenti
  const t = r.taumaturgo?.livello_massimo_per_gradi;
  if (!Array.isArray(t) || !t.length) err(F, 'taumaturgo.livello_massimo_per_gradi', 'tabella {gradi, livello} mancante');
  else {
    t.forEach((x, i) => {
      if (x?.gradi !== i + 1) err(F, `taumaturgo.livello_massimo_per_gradi[${i}]`, `atteso gradi ${i + 1}, trovato ${JSON.stringify(x?.gradi)}`);
      if (!isIntero(x?.livello) || x.livello < 1) err(F, `taumaturgo.livello_massimo_per_gradi[${i}]`, 'livello intero ≥ 1 mancante');
      else if (i && isIntero(t[i - 1]?.livello) && x.livello < t[i - 1].livello) err(F, `taumaturgo.livello_massimo_per_gradi[${i}]`, 'il livello non può scendere al crescere dei Gradi');
    });
    const gm = r.avanzamento?.grado_massimo;
    if (isIntero(gm) && t.length < gm) err(F, 'taumaturgo.livello_massimo_per_gradi', `servono le righe fino a ${gm} Gradi`);
  }
}

function validaSalvezzeBonus(F, chiave, salvezze, idSalvezze, err) {
  if (!isOggetto(salvezze)) { err(F, chiave, 'bonus alle Salvezze mancanti'); return; }
  for (const id of idSalvezze) {
    if (![0, 1].includes(salvezze[id])) err(F, `${chiave}.${id}`, `deve valere 0 o 1, trovato ${JSON.stringify(salvezze[id])}`);
  }
  for (const id of Object.keys(salvezze)) {
    if (!idSalvezze.includes(id)) err(F, `${chiave}.${id}`, `"${id}" non è una Salvezza`);
  }
}

function validaCorporazioni(c, sigle, nomiAbilita, idSalvezze, car, err) {
  if (!isOggetto(c)) return;
  const F = 'corporazioni';
  const min = car?.valore_minimo, max = car?.valore_massimo;
  listaNominata(F, c, 'corporazioni', err).forEach((x, i) => {
    const k = `corporazioni[${i}] (${x.nome})`;
    const valori = isOggetto(x.caratteristiche) ? x.caratteristiche : {};
    if (!isOggetto(x.caratteristiche)) err(F, `${k}.caratteristiche`, 'valori mancanti');
    for (const s of sigle) {
      const v = valori[s];
      if (!isIntero(v) || v < min || v > max) err(F, `${k}.caratteristiche.${s}`, `deve essere un intero fra ${min} e ${max}, trovato ${JSON.stringify(v)}`);
    }
    for (const s of Object.keys(valori)) if (!sigle.has(s)) err(F, `${k}.caratteristiche.${s}`, `"${s}" non è una Caratteristica`);

    const ab = Array.isArray(x.abilita_bonus) ? x.abilita_bonus : [];
    if (ab.length !== ABILITA_CORPORAZIONE) err(F, `${k}.abilita_bonus`, `attese ${ABILITA_CORPORAZIONE} Abilità, trovate ${ab.length}`);
    if (new Set(ab).size !== ab.length) err(F, `${k}.abilita_bonus`, 'Abilità ripetute');
    ab.forEach((n) => { if (!nomiAbilita.has(n)) err(F, `${k}.abilita_bonus`, `"${n}" non è un'Abilità esistente`); });
    validaSalvezzeBonus(F, `${k}.salvezze`, x.salvezze, idSalvezze, err);
  });
}

function validaAddestramenti(a, nomiAbilita, idSalvezze, regole, err) {
  if (!isOggetto(a)) return new Set();
  const F = 'addestramenti';
  const schema = regole?.addestramento?.schema ?? {};
  const totale = regole?.addestramento?.punti_totali;
  const lista = listaNominata(F, a, 'addestramenti', err);
  lista.forEach((x, i) => {
    const k = `addestramenti[${i}] (${x.nome})`;
    const vb = isOggetto(x.valori_base) ? x.valori_base : {};
    const chiavi = Object.keys(vb);
    if (chiavi.length !== nomiAbilita.size) err(F, `${k}.valori_base`, `attese ${nomiAbilita.size} Abilità, trovate ${chiavi.length}`);
    for (const n of chiavi) if (!nomiAbilita.has(n)) err(F, `${k}.valori_base.${n}`, `"${n}" non è un'Abilità esistente`);
    for (const n of nomiAbilita) if (!(n in vb)) err(F, `${k}.valori_base`, `manca l'Abilità "${n}"`);

    const valori = Object.values(vb);
    if (!valori.every(isIntero)) {
      err(F, `${k}.valori_base`, 'tutti i valori devono essere interi');
    } else {
      const somma = valori.reduce((s, v) => s + v, 0);
      if (somma !== totale) err(F, `${k}.valori_base`, `la somma è ${somma}, deve essere ${totale} (§2.3)`);
      const conteggio = {};
      for (const v of valori) conteggio[v] = (conteggio[v] ?? 0) + 1;
      const atteso = Object.entries(schema).map(([v, n]) => `${n}×${v}`).join(', ');
      const ok = Object.keys({ ...schema, ...conteggio }).every((v) => (schema[v] ?? 0) === (conteggio[v] ?? 0));
      if (!ok) {
        const trovato = Object.entries(conteggio).sort((p, q) => q[0] - p[0]).map(([v, n]) => `${n}×${v}`).join(', ');
        err(F, `${k}.valori_base`, `distribuzione ${trovato}, attesa ${atteso} (§2.3)`);
      }
    }
    if (!isTesto(x.vantaggio?.nome) || !isTesto(x.vantaggio?.testo)) err(F, `${k}.vantaggio`, 'servono "nome" e "testo" (§2.10)');
    validaSalvezzeBonus(F, `${k}.salvezze`, x.salvezze, idSalvezze, err);
  });
  return new Set(lista.map((x) => x.nome));
}

function validaIncantesimi(inc, regole, err) {
  const macro = new Map();
  if (!isOggetto(inc)) return macro;
  const F = 'incantesimi';
  for (const [i, m] of (Array.isArray(inc.macrofamiglie) ? inc.macrofamiglie : []).entries()) {
    if (!isTesto(m?.nome) || !Array.isArray(m.specializzazioni)) { err(F, `macrofamiglie[${i}]`, 'servono "nome" e "specializzazioni"'); continue; }
    macro.set(m.nome, new Set(m.specializzazioni));
  }
  if (macro.size === 0) err(F, 'macrofamiglie', 'lista mancante');

  const lista = listaNominata(F, inc, 'incantesimi', err);
  const perSpec = new Map();
  const schede = new Set();
  lista.forEach((x, i) => {
    const k = `incantesimi[${i}] (${x.nome})`;
    if (!macro.has(x.macrofamiglia)) { err(F, `${k}.macrofamiglia`, `"${x.macrofamiglia}" non è una macrofamiglia`); return; }
    if (!macro.get(x.macrofamiglia).has(x.specializzazione)) {
      err(F, `${k}.specializzazione`, `"${x.specializzazione}" non appartiene alla macrofamiglia ${x.macrofamiglia}`);
      return;
    }
    if (!isIntero(x.livello_base)) err(F, `${k}.livello_base`, 'deve essere un intero');
    validaSchedaIncantesimo(F, k, x, err);
    if (schede.has(x.scheda)) err(F, `${k}.scheda`, `scheda ${x.scheda} duplicata`);
    schede.add(x.scheda);
    const chiave = `${x.macrofamiglia} / ${x.specializzazione}`;
    if (!perSpec.has(chiave)) perSpec.set(chiave, []);
    perSpec.get(chiave).push(x.livello_base);
  });

  const quanti = regole?.incantesimi?.per_specializzazione;
  const schema = regole?.incantesimi?.schema_livello_base ?? {};
  const totaleSpec = [...macro.values()].reduce((s, sp) => s + sp.size, 0);
  if (isIntero(quanti) && lista.length !== quanti * totaleSpec) {
    err(F, 'incantesimi', `attesi ${quanti * totaleSpec} incantesimi (${quanti} × ${totaleSpec} specializzazioni), trovati ${lista.length}`);
  }
  for (const [m, specs] of macro) {
    for (const s of specs) {
      const livelli = perSpec.get(`${m} / ${s}`) ?? [];
      if (isIntero(quanti) && livelli.length !== quanti) err(F, `${m} / ${s}`, `attesi ${quanti} incantesimi, trovati ${livelli.length}`);
      for (const [lv, n] of Object.entries(schema)) {
        const trovati = livelli.filter((l) => l === Number(lv)).length;
        if (trovati !== n) err(F, `${m} / ${s}`, `attesi ${n} incantesimi di livello base ${lv}, trovati ${trovati}`);
      }
      const estranei = livelli.filter((l) => !(String(l) in schema));
      if (estranei.length) err(F, `${m} / ${s}`, `livelli base non previsti: ${estranei.join(', ')}`);
    }
  }
  return macro;
}

/**
 * Scheda di un incantesimo (Magia, sezioni 13 e 16–23). La descrizione è obbligatoria;
 * gli altri campi possono valere "TODO(Davide)" se l'estrazione non è certa.
 */
function validaSchedaIncantesimo(F, k, x, err) {
  if (!isTesto(x.descrizione)) err(F, `${k}.descrizione`, 'descrizione mancante o vuota');
  for (const campo of ['intestazione', 'lancio']) {
    if (x[campo] !== undefined && !isTesto(x[campo])) err(F, `${k}.${campo}`, 'deve essere un testo non vuoto');
  }
  if (x.versioni === undefined || isTodo(x.versioni)) return;
  if (!Array.isArray(x.versioni) || x.versioni.length === 0 || !x.versioni.every(isOggetto)) {
    err(F, `${k}.versioni`, 'deve essere una lista di righe {intestazione: valore} oppure "TODO(Davide)"');
    return;
  }
  const colonne = Object.keys(x.versioni[0]);
  if (!/^Livello/.test(colonne[0] ?? '')) err(F, `${k}.versioni`, `la prima colonna deve essere il Livello, trovato "${colonne[0]}"`);
  x.versioni.forEach((r, j) => {
    if (Object.keys(r).join('|') !== colonne.join('|')) err(F, `${k}.versioni[${j}]`, 'colonne diverse dalla prima riga');
  });
  if (isIntero(x.livello_base) && !x.versioni.some((r) => String(Object.values(r)[0]).trim() === String(x.livello_base))) {
    err(F, `${k}.versioni`, `manca la riga del livello base ${x.livello_base}`);
  }
}

/**
 * Avvisi non bloccanti: valori marcati TODO in campi descrittivi. L'app parte lo stesso,
 * ma li segnala (per esempio le descrizioni delle Caratteristiche, che il manuale non ha).
 */
export function avvisiDati(dati) {
  const avvisi = [];
  const avv = (file, chiave, problema) => avvisi.push({ file: `${file}.json`, chiave, problema });
  (dati?.caratteristiche?.caratteristiche ?? []).forEach((c, i) => {
    if (isTodo(c?.descrizione)) avv('caratteristiche', `caratteristiche[${i}] (${c.sigla}).descrizione`, 'descrizione da completare (TODO)');
  });
  (dati?.incantesimi?.incantesimi ?? []).forEach((x, i) => {
    for (const campo of ['intestazione', 'lancio', 'descrizione', 'versioni', 'regole']) {
      if (isTodo(x?.[campo])) avv('incantesimi', `incantesimi[${i}] (${x.nome}).${campo}`, 'da completare (TODO)');
    }
  });
  (dati?.talenti_liberi?.talenti ?? []).forEach((x, i) => {
    if (x?.provvisorio) avv('talenti_liberi', `talenti[${i}] (${x.nome})`, 'Talento provvisorio: ricavato dalle citazioni del Manuale della Magia, prerequisiti da definire (TODO)');
    else if (isTodo(x?.tipo)) avv('talenti_liberi', `talenti[${i}] (${x.nome}).tipo`, 'passivo o attivo da definire (TODO)');
  });
  (dati?.tecniche_interiori?.tecniche ?? []).forEach((x, i) => {
    for (const c of ['costo', 'azione', 'bersaglio', 'durata']) if (isTodo(x?.[c])) avv('tecniche_interiori', `tecniche[${i}] (${x.nome}).${c}`, 'non indicato nella scheda (TODO)');
  });
  return avvisi;
}

// ---------------------------------------------------------------------------
// Avanzamento (cap. 8)

const EVENTO = /^(creazione|talento_libero|grado_classe|(caratteristiche|salvezze|azione_principale):\+\d+|punti_abilita:\d+)$/;

/** Fasce {da, a, <campo>} che coprono 1..max senza buchi né sovrapposizioni. */
function validaFasce(F, chiave, fasce, campo, max, err) {
  if (!Array.isArray(fasce) || !fasce.length) { err(F, chiave, 'tabella mancante'); return; }
  let atteso = 1;
  fasce.forEach((f, i) => {
    if (!isIntero(f?.da) || !isIntero(f?.a) || !isIntero(f?.[campo]) || f.da > f.a) {
      err(F, `${chiave}[${i}]`, `servono da, a e ${campo} interi con da ≤ a`);
      return;
    }
    if (f.da !== atteso) err(F, `${chiave}[${i}]`, `la fascia dovrebbe iniziare dal livello ${atteso}, inizia da ${f.da}`);
    atteso = f.a + 1;
  });
  if (atteso !== max + 1) err(F, chiave, `le fasce devono arrivare al livello ${max}, arrivano al ${atteso - 1}`);
}

function validaAvanzamento(r, err) {
  if (!isOggetto(r)) return;
  const F = 'regole';
  const av = r.avanzamento;
  if (!isOggetto(av)) { err(F, 'avanzamento', 'blocco mancante (cap. 8)'); return; }
  const max = av.livello_massimo;
  if (!isIntero(max) || max < 1) { err(F, 'avanzamento.livello_massimo', 'intero ≥ 1 mancante'); return; }
  const eventi = Array.isArray(av.eventi) ? av.eventi : [];
  // §8.1: una voce per ogni livello, senza buchi
  for (let l = 1; l <= max; l++) {
    const voce = eventi.filter((e) => e?.livello === l);
    if (voce.length !== 1) { err(F, 'avanzamento.eventi', `il livello ${l} deve comparire una volta, compare ${voce.length} volte`); continue; }
    if (!Array.isArray(voce[0].eventi)) { err(F, `avanzamento.eventi (livello ${l})`, 'serve una lista di eventi'); continue; }
    for (const e of voce[0].eventi) if (!EVENTO.test(e)) err(F, `avanzamento.eventi (livello ${l})`, `evento "${e}" sconosciuto`);
  }
  if (!eventi.find((e) => e?.livello === 1)?.eventi?.includes('creazione')) err(F, 'avanzamento.eventi', 'il livello 1 deve essere la creazione');
  for (const e of eventi) if (!isIntero(e?.livello) || e.livello < 1 || e.livello > max) err(F, 'avanzamento.eventi', `livello ${JSON.stringify(e?.livello)} fuori da 1–${max}`);
  validaFasce(F, 'avanzamento.massimo_caratteristica', av.massimo_caratteristica, 'massimo', max, err);
  validaFasce(F, 'avanzamento.avanzamento_massimo_abilita', av.avanzamento_massimo_abilita, 'massimo', max, err);
  validaFasce(F, 'salvezze.avanzamento_per_livello', r.salvezze?.avanzamento_per_livello, 'bonus', max, err);
  // coerenza fra gli eventi "salvezze:+N" e la tabella del §1.2.3
  let cumulato = 0;
  for (let l = 1; l <= max; l++) {
    for (const e of eventi.find((x) => x?.livello === l)?.eventi ?? []) {
      const m = /^salvezze:\+(\d+)$/.exec(e);
      if (m) cumulato += Number(m[1]);
    }
    const tab = (r.salvezze?.avanzamento_per_livello ?? []).find((f) => l >= f.da && l <= f.a)?.bonus;
    if (isIntero(tab) && tab !== cumulato) {
      err(F, 'avanzamento.eventi', `al livello ${l} gli eventi danno Salvezze +${cumulato}, la tabella salvezze.avanzamento_per_livello +${tab}`);
      break;
    }
  }
  for (const k of ['classi_massime', 'grado_massimo', 'livello_massimo_incantesimi', 'tetto_salvezza']) {
    if (!isIntero(av[k]) || av[k] < 1) err(F, `avanzamento.${k}`, 'intero ≥ 1 mancante');
  }
  for (const k of ['gradi_talento_fisso', 'gradi_talento_a_scelta']) {
    if (!Array.isArray(av[k]) || !av[k].every(isIntero)) err(F, `avanzamento.${k}`, 'lista di Gradi mancante');
  }
}

function validaSpecializzazioni(s, nomiAbilita, err) {
  const ids = new Set();
  if (!isOggetto(s)) return ids;
  const F = 'specializzazioni';
  const lista = Array.isArray(s.specializzazioni) ? s.specializzazioni : [];
  if (!lista.length) err(F, 'specializzazioni', 'lista mancante');
  lista.forEach((x, i) => {
    const k = `specializzazioni[${i}] (${x?.nome})`;
    if (!isTesto(x?.id) || !isTesto(x?.nome)) { err(F, `specializzazioni[${i}]`, 'servono "id" e "nome"'); return; }
    if (ids.has(x.id)) err(F, `${k}.id`, `id "${x.id}" duplicato`);
    ids.add(x.id);
    if (!['armi', 'mistiche', 'operative_sociali_professionali'].includes(x.gruppo)) err(F, `${k}.gruppo`, `gruppo "${x.gruppo}" sconosciuto`);
    if (!Array.isArray(x.abilita)) err(F, `${k}.abilita`, 'deve essere una lista');
    else x.abilita.forEach((a) => { if (!nomiAbilita.has(a)) err(F, `${k}.abilita`, `"${a}" non è un'Abilità esistente`); });
    if (x.gruppo !== 'armi' && !(x.abilita?.length)) err(F, `${k}.abilita`, 'serve almeno un’Abilità interessata');
    if (!isTesto(x.ambito)) err(F, `${k}.ambito`, 'ambito mancante');
    if (!isOggetto(x.effetto)) err(F, `${k}.effetto`, 'effetto mancante');
  });
  return ids;
}

const MOLTEPLICITA = { una: null, per_caratteristica: 'caratteristica', per_salvezza_max2: 'salvezza', illimitata: null, limitata: null };
const EFFETTI_NOTI = new Set(['iniziativa', 'pv', 'salvezza', 'movimento', 'tecniche', 'accessoMagia', 'incantesimi', 'livelloMax', 'livelloMaxIncantesimi']);

function validaTalentiLiberi(t, idSpec, err) {
  if (!isOggetto(t)) return;
  const F = 'talenti_liberi';
  const lista = Array.isArray(t.talenti) ? t.talenti : [];
  const ids = new Set();
  lista.forEach((x, i) => {
    if (!isTesto(x?.id) || !isTesto(x?.nome)) { err(F, `talenti[${i}]`, 'servono "id" e "nome"'); return; }
    if (ids.has(x.id) || idSpec.has(x.id)) err(F, `talenti[${i}] (${x.nome}).id`, `id "${x.id}" duplicato (anche fra le Specializzazioni)`);
    ids.add(x.id);
  });
  const esiste = (id) => ids.has(id) || idSpec.has(id);
  const sezioni = isOggetto(t.sezioni) ? t.sezioni : {};
  lista.forEach((x, i) => {
    if (!isOggetto(x)) return;
    const k = `talenti[${i}] (${x.nome})`;
    if (!(x.sezione in sezioni)) err(F, `${k}.sezione`, `sezione "${x.sezione}" non descritta in "sezioni"`);
    if (!['passivo', 'attivo'].includes(x.tipo) && !isTodo(x.tipo)) err(F, `${k}.tipo`, 'deve essere "passivo", "attivo" o "TODO(Davide)"');
    if (!isTesto(x.testo)) err(F, `${k}.testo`, 'testo mancante');
    if (Array.isArray(x.prerequisiti)) {
      x.prerequisiti.forEach((p) => { if (!esiste(p)) err(F, `${k}.prerequisiti`, `"${p}" non è l'id di un Talento o di una Specializzazione`); });
    } else if (!(isTodo(x.prerequisiti) && x.provvisorio === true)) {
      err(F, `${k}.prerequisiti`, 'lista di id (vuota se nessun prerequisito); "TODO(Davide)" solo per i Talenti provvisori');
    }
    if (!(x.molteplicita in MOLTEPLICITA)) err(F, `${k}.molteplicita`, `"${x.molteplicita}" sconosciuta`);
    else if ((MOLTEPLICITA[x.molteplicita] ?? null) !== (x.parametro ?? null)) {
      err(F, `${k}.parametro`, `con molteplicità "${x.molteplicita}" il parametro deve essere ${JSON.stringify(MOLTEPLICITA[x.molteplicita])}`);
    }
    if (x.molteplicita === 'limitata' && (!isIntero(x.max_acquisizioni) || x.max_acquisizioni < 2)) err(F, `${k}.max_acquisizioni`, 'intero ≥ 2 richiesto con molteplicità "limitata"');
    if (x.effetti !== undefined) {
      if (!isOggetto(x.effetti)) err(F, `${k}.effetti`, 'deve essere un oggetto');
      else for (const e of Object.keys(x.effetti)) if (!EFFETTI_NOTI.has(e)) err(F, `${k}.effetti.${e}`, 'effetto sconosciuto al motore di calcolo');
    }
    for (const inc of x.incompatibile_con ?? []) {
      if (!/^(addestramento|classi|talenti):.+$/.test(inc)) err(F, `${k}.incompatibile_con`, `"${inc}": atteso "addestramento:…", "classi:…" o "talenti:…"`);
    }
  });
  for (const [sez, n] of Object.entries(t.attesi ?? {})) {
    if (sez.startsWith('_')) continue;
    const trovati = lista.filter((x) => x?.sezione === sez || x?.sezione?.startsWith(`${sez}.`)).length;
    if (trovati !== n) err(F, 'talenti', `attesi ${n} Talenti nel §${sez} (campo "attesi"), trovati ${trovati}`);
  }
}

function validaTecniche(t, err) {
  if (!isOggetto(t)) return;
  const F = 'tecniche_interiori';
  if (!Array.isArray(t.regole_comuni) || !t.regole_comuni.length) err(F, 'regole_comuni', 'regole comuni del §8.9.1 mancanti');
  const ids = new Set();
  (Array.isArray(t.tecniche) ? t.tecniche : []).forEach((x, i) => {
    const k = `tecniche[${i}] (${x?.nome})`;
    if (!isTesto(x?.id) || !isTesto(x?.nome)) { err(F, `tecniche[${i}]`, 'servono "id" e "nome"'); return; }
    if (ids.has(x.id)) err(F, `${k}.id`, `id "${x.id}" duplicato`);
    ids.add(x.id);
    if (!/^(generica|lottatore|scuola:.+)$/.test(x.gruppo ?? '')) err(F, `${k}.gruppo`, 'atteso "generica", "lottatore" o "scuola:<nome>"');
    for (const c of ['costo', 'azione', 'bersaglio', 'durata', 'testo']) if (!isTesto(x[c])) err(F, `${k}.${c}`, 'campo mancante o vuoto');
  });
}

function validaDadi(F, chiave, v, err) {
  if (!isOggetto(v) || !isIntero(v.fisso) || !isIntero(v.dado) || v.fisso < 0 || v.dado < 0) {
    err(F, chiave, 'serve {fisso, dado} con interi ≥ 0 (dado 0 = nessun dado)');
  }
}

function validaClassi(c, nomiAddestramenti, nomiAbilita, macrofamiglie, regole, err) {
  if (!isOggetto(c)) return;
  const F = 'classi';
  const taumaturgo = regole?.taumaturgo?.addestramento;
  listaNominata(F, c, 'classi', err).forEach((x, i) => {
    const k = `classi[${i}] (${x.nome})`;
    if (!nomiAddestramenti.has(x.addestramento)) err(F, `${k}.addestramento`, `"${x.addestramento}" non è un Addestramento esistente`);

    const spec = Array.isArray(x.specializzazioni) ? x.specializzazioni : [];
    if (spec.length !== SPECIALIZZAZIONI_CLASSE || !spec.every(isTesto)) err(F, `${k}.specializzazioni`, `attese ${SPECIALIZZAZIONI_CLASSE} Specializzazioni`);

    const ab = Array.isArray(x.abilita) ? x.abilita : [];
    if (ab.length !== ABILITA_CLASSE) err(F, `${k}.abilita`, `attese ${ABILITA_CLASSE} Abilità di Classe, trovate ${ab.length}`);
    if (new Set(ab).size !== ab.length) err(F, `${k}.abilita`, 'Abilità ripetute');
    ab.forEach((n) => { if (!nomiAbilita.has(n)) err(F, `${k}.abilita`, `"${n}" non è un'Abilità esistente`); });

    validaDadi(F, `${k}.pv_per_grado`, x.pv_per_grado, err);
    validaDadi(F, `${k}.pm_per_grado`, x.pm_per_grado, err);

    const fissi = Array.isArray(x.talenti_fissi) ? x.talenti_fissi : [];
    const gradi = fissi.map((t) => t?.grado);
    if (fissi.length !== GRADI_TALENTI_FISSI.length || GRADI_TALENTI_FISSI.some((g, j) => gradi[j] !== g)) {
      err(F, `${k}.talenti_fissi`, `attesi ${GRADI_TALENTI_FISSI.length} Talenti fissi ai Gradi ${GRADI_TALENTI_FISSI.join(', ')} (§3.2)`);
    }
    const scelta = Array.isArray(x.talenti_a_scelta) ? x.talenti_a_scelta : [];
    if (scelta.length !== TALENTI_A_SCELTA) err(F, `${k}.talenti_a_scelta`, `attesi ${TALENTI_A_SCELTA} Talenti a scelta, trovati ${scelta.length} (§3.2)`);
    [...fissi.map((t, j) => [t, `talenti_fissi[${j}]`]), ...scelta.map((t, j) => [t, `talenti_a_scelta[${j}]`])].forEach(([t, kt]) => {
      if (!isTesto(t?.nome) || !isTesto(t?.testo)) err(F, `${k}.${kt}`, 'servono "nome" e "testo"');
    });
    scelta.forEach((t, j) => {
      const s = t?.specializzazione;
      if (!isTodo(s) && s !== SPECIALIZZAZIONE_COMUNE && !spec.includes(s)) {
        err(F, `${k}.talenti_a_scelta[${j}].specializzazione`, `"${s}" non è una Specializzazione della Classe né "${SPECIALIZZAZIONE_COMUNE}"`);
      }
    });

    const quote = x.incantesimi;
    if (x.addestramento === taumaturgo && !isOggetto(quote)) err(F, `${k}.incantesimi`, 'le Classi taumaturgiche devono indicare le quote incantesimi (§3.8)');
    if (isOggetto(quote)) {
      for (const fase of ['primo_grado', 'ogni_grado_successivo']) {
        if (!isOggetto(quote[fase])) { err(F, `${k}.incantesimi.${fase}`, 'quote mancanti'); continue; }
        for (const [m, n] of Object.entries(quote[fase])) {
          if (!macrofamiglie.has(m)) err(F, `${k}.incantesimi.${fase}.${m}`, `"${m}" non è una macrofamiglia`);
          if (!isIntero(n) || n < 0) err(F, `${k}.incantesimi.${fase}.${m}`, 'deve essere un intero ≥ 0');
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Equipaggiamento (data/equipaggiamento/, Manuale degli Armamenti)

// formule di danno: «1d6+1», «2», anche somme di dadi come «1d6+1d4» (lama delle Guardie Sacre)
const DADI = /^(\d+d\d+(\+\d+d\d+)*([+-]\d+)?|\d+)$/;
// effetti strutturati delle proprietà: parata_va (Difensiva X, §7.1.3), va (Precisa X, §7.1.3: VA per colpire)
const EFFETTI_PROPRIETA = ['parata_va', 'va'];
const CAMPI_PENALITA = ['attacchi_distanza', 'attacchi_ravvicinati', 'agilita', 'movimento_q', 'lancio_potere'];

function validaEquipaggiamento(eq, nomiAbilita, idSpec, err) {
  const FI = 'equipaggiamento/index';
  if (!isOggetto(eq) || !isOggetto(eq.indice)) {
    err(FI, '', 'indice del catalogo mancante o non è un oggetto JSON');
    return;
  }
  const ind = eq.indice;
  if (!isTesto(ind.versione_manuale)) err(FI, 'versione_manuale', 'campo mancante o vuoto');
  const rep = isOggetto(ind.reperibilita) ? Object.keys(ind.reperibilita) : [];
  if (!rep.length) err(FI, 'reperibilita', 'tabella delle sigle di reperibilità mancante (§7.1.8)');
  if (!Array.isArray(ind.file) || !ind.file.length) {
    err(FI, 'file', 'elenco dei file mancante');
    return;
  }
  const idFile = new Set();
  ind.file.forEach((v, i) => {
    if (!isTesto(v?.id) || !/^[a-z_]+$/.test(v.id)) err(FI, `file[${i}].id`, 'id mancante (solo lettere minuscole e _)');
    else if (idFile.has(v.id)) err(FI, `file[${i}].id`, `id "${v.id}" ripetuto`);
    else idFile.add(v.id);
    if (!isTesto(v?.file) || !v.file.endsWith('.json')) err(FI, `file[${i}].file`, 'nome del file .json mancante');
  });

  const rif = new Set();
  const rimandi = []; // [file, chiave, riferimento] di «stesso_oggetto», controllati alla fine
  for (const { id: fileId, file: nomeFile } of ind.file) {
    if (!isTesto(nomeFile) || !nomeFile.endsWith('.json')) continue;
    const F = `equipaggiamento/${nomeFile.slice(0, -5)}`;
    const f = eq.file?.[fileId];
    if (!isOggetto(f)) { err(F, '', 'file mancante o non è un oggetto JSON'); continue; }
    if (!isTesto(f.versione_manuale)) err(F, 'versione_manuale', 'campo mancante o vuoto');
    if (!Array.isArray(f.oggetti)) { err(F, 'oggetti', 'elenco mancante'); continue; }
    if (f.categorie !== undefined) {
      if (!isOggetto(f.categorie)) err(F, 'categorie', 'deve essere un oggetto { categoria: penalità }');
      else for (const [c, p] of Object.entries(f.categorie)) validaPenalita(F, `categorie.${c}`, p, err);
    }
    for (const k of ['abilita_agilita']) {
      if (f[k] !== undefined && (!Array.isArray(f[k]) || f[k].some((a) => !nomiAbilita.includes(a)))) err(F, k, 'elenco di Abilità esistenti');
    }
    if (f.abilita_difese !== undefined && !nomiAbilita.includes(f.abilita_difese)) err(F, 'abilita_difese', `Abilità "${f.abilita_difese}" inesistente`);

    const ids = new Set();
    f.oggetti.forEach((o, i) => {
      const k = `oggetti[${i}]${isTesto(o?.id) ? ` (${o.id})` : ''}`;
      if (!isOggetto(o)) { err(F, k, 'non è un oggetto'); return; }
      if (!isTesto(o.id) || !/^[a-z0-9-]+$/.test(o.id)) err(F, `${k}.id`, 'id mancante (minuscole, cifre e trattini)');
      else if (ids.has(o.id)) err(F, `${k}.id`, `id "${o.id}" ripetuto`);
      else { ids.add(o.id); rif.add(`${fileId}:${o.id}`); }
      if (o.stesso_oggetto !== undefined) rimandi.push([F, `${k}.stesso_oggetto`, o.stesso_oggetto]);
      for (const c of ['nome', 'catalogo', 'famiglia', 'paragrafo', 'versione_manuale']) if (!isTesto(o[c])) err(F, `${k}.${c}`, 'testo mancante');
      if (!TIPI_EQUIP.includes(o.tipo)) err(F, `${k}.tipo`, `tipo "${o.tipo}" non ammesso (${TIPI_EQUIP.join(', ')})`);
      if (!Array.isArray(o.nomi_alternativi) || o.nomi_alternativi.some((n) => !isTesto(n))) err(F, `${k}.nomi_alternativi`, 'elenco di nomi (anche vuoto)');
      if (o.note_manuale !== undefined && typeof o.note_manuale !== 'string') err(F, `${k}.note_manuale`, 'deve essere testo');
      numeroOpz(F, `${k}.pi`, o.pi, 0, 999, err);
      numeroOpz(F, `${k}.ps_int`, o.ps_int, 1, 30, err);
      numeroOpz(F, `${k}.costo`, o.costo, 0, 1e9, err);
      if (o.for_richiesta !== undefined && o.for_richiesta !== null && !(isIntero(o.for_richiesta) && o.for_richiesta >= 1 && o.for_richiesta <= 10)) {
        err(F, `${k}.for_richiesta`, `deve essere un intero da 1 a 10, trovato ${JSON.stringify(o.for_richiesta)}`);
      }
      if (o.reperibilita !== undefined && !rep.includes(o.reperibilita)) err(F, `${k}.reperibilita`, `sigla "${o.reperibilita}" non in index.json (${rep.join(', ')})`);
      if (o.proprieta !== undefined) {
        if (!Array.isArray(o.proprieta)) err(F, `${k}.proprieta`, 'deve essere un elenco');
        else o.proprieta.forEach((p, j) => {
          if (!isTesto(p?.nome) || !isTesto(p?.testo)) err(F, `${k}.proprieta[${j}]`, 'servono nome e testo');
          if (p?.effetto !== undefined) {
            if (!isOggetto(p.effetto)) err(F, `${k}.proprieta[${j}].effetto`, 'deve essere un oggetto');
            else for (const [e, v] of Object.entries(p.effetto)) {
              if (!EFFETTI_PROPRIETA.includes(e)) err(F, `${k}.proprieta[${j}].effetto.${e}`, `effetto sconosciuto (ammessi: ${EFFETTI_PROPRIETA.join(', ')})`);
              else if (!isIntero(v)) err(F, `${k}.proprieta[${j}].effetto.${e}`, 'deve essere un numero intero');
            }
          }
        });
      }
      if (o.tipo === 'arma_ravvicinata' || o.tipo === 'arma_distanza') {
        if (!nomiAbilita.includes(o.abilita)) err(F, `${k}.abilita`, `Abilità "${o.abilita}" inesistente in abilita.json`);
        if (o.specializzazione !== undefined && o.specializzazione !== null && !idSpec.includes(o.specializzazione)) err(F, `${k}.specializzazione`, `Specializzazione "${o.specializzazione}" inesistente`);
        if (![1, 2, '1/2'].includes(o.mani)) err(F, `${k}.mani`, 'deve essere 1, 2 oppure "1/2"');
        if (o.danno_da_munizione === true) {
          // §7.7: «Munizione» nella colonna Danno: il danno viene dalla munizione caricata
          if (o.danno !== null) err(F, `${k}.danno`, 'con "danno_da_munizione": true il danno deve essere null');
        } else if (!isOggetto(o.danno)) err(F, `${k}.danno`, 'serve { una_mano, due_mani } (oppure "danno_da_munizione": true)');
        else {
          for (const m of ['una_mano', 'due_mani']) if (o.danno[m] !== null && o.danno[m] !== undefined && !DADI.test(o.danno[m])) err(F, `${k}.danno.${m}`, `"${o.danno[m]}" non è una formula di dadi (es. 1d6+1, 2)`);
          if (!o.danno.una_mano && !o.danno.due_mani) err(F, `${k}.danno`, 'manca il danno');
          if (o.mani === 1 && !o.danno.una_mano) err(F, `${k}.danno.una_mano`, 'arma a una mano senza danno a una mano');
          if (o.mani === 2 && !o.danno.due_mani) err(F, `${k}.danno.due_mani`, 'arma a due mani senza danno a due mani');
          if (o.mani === '1/2' && !(o.danno.una_mano && o.danno.due_mani)) err(F, `${k}.danno`, 'arma Versatile: servono entrambi i danni');
        }
        numeroOpz(F, `${k}.portata_q`, o.portata_q, 1, 99, err);
        numeroOpz(F, `${k}.gittata_q`, o.gittata_q, 1, 9999, err);
        numeroOpz(F, `${k}.inc`, o.inc, 1, 10, err);
        if (o.modificatore_va !== undefined && !isIntero(o.modificatore_va)) err(F, `${k}.modificatore_va`, 'deve essere un intero');
        if (o.ac !== undefined && !((isIntero(o.ac) && o.ac >= 1) || (typeof o.ac === 'string' && (DADI.test(o.ac) || o.ac === 'munizione')))) {
          err(F, `${k}.ac`, `applicazioni di danno: intero ≥ 1, formula di dadi o "munizione", trovato ${JSON.stringify(o.ac)}`);
        }
        if (o.gittata_per_for !== undefined && !(isIntero(o.gittata_per_for) && o.gittata_per_for >= 1)) err(F, `${k}.gittata_per_for`, 'moltiplicatore intero ≥ 1 della FOR');
        if (o.tipo === 'arma_distanza' && !o.gittata_q && !o.gittata_per_for) err(F, `${k}.gittata_q`, 'arma a distanza senza gittata (gittata_q o gittata_per_for)');
        if (o.mov !== undefined && !(isIntero(o.mov) && o.mov <= 0)) err(F, `${k}.mov`, 'penalità MOV: intero ≤ 0');
        if (o.munizioni !== undefined) {
          if (!isOggetto(o.munizioni)) err(F, `${k}.munizioni`, 'serve { capacita, ricarica, consumo, riferimento }');
          else {
            if (o.munizioni.unita !== undefined && !['colpi', 'cariche', 'PM'].includes(o.munizioni.unita)) err(F, `${k}.munizioni.unita`, 'colpi, cariche o PM');
            if (o.munizioni.capacita !== null && !(isIntero(o.munizioni.capacita) && o.munizioni.capacita >= 1)) err(F, `${k}.munizioni.capacita`, 'intero ≥ 1 oppure null');
            for (const c of ['ricarica', 'consumo', 'riferimento']) if (o.munizioni[c] !== null && o.munizioni[c] !== undefined && !isTesto(o.munizioni[c])) err(F, `${k}.munizioni.${c}`, 'testo oppure null');
          }
        }
        if (o.attivazione !== undefined) {
          const at = o.attivazione;
          if (!isOggetto(at) || !isTesto(at.testo)) err(F, `${k}.attivazione`, 'serve { testo, danno_extra?, natura?, sintonizzazione? }');
          else {
            if (at.danno_extra !== undefined && !DADI.test(at.danno_extra)) err(F, `${k}.attivazione.danno_extra`, `"${at.danno_extra}" non è una formula di dadi`);
            if (at.sintonizzazione !== undefined && !(isIntero(at.sintonizzazione) && at.sintonizzazione >= 1)) err(F, `${k}.attivazione.sintonizzazione`, 'intero ≥ 1');
          }
        }
        if (o.manovre !== undefined && (!Array.isArray(o.manovre) || !o.manovre.length || o.manovre.some((m) => !isTesto(m)))) err(F, `${k}.manovre`, 'elenco delle Manovre compatibili');
        if (o.natura_danno !== undefined && !['Naturale', 'Magico', 'Etereo'].includes(o.natura_danno)) err(F, `${k}.natura_danno`, 'Naturale, Magico o Etereo');
        if (o.modalita !== undefined) {
          const legenda = isOggetto(f.modalita) ? Object.keys(f.modalita) : [];
          if (!Array.isArray(o.modalita) || !o.modalita.length) err(F, `${k}.modalita`, 'elenco delle modalità di fuoco');
          else for (const m of o.modalita) if (!legenda.includes(m)) err(F, `${k}.modalita`, `modalità "${m}" non nella legenda «modalita» del file`);
        }
      }
      if (o.tipo === 'armatura' || o.tipo === 'scudo') {
        if (!isOggetto(o.ar) || !isIntero(o.ar.totale) || o.ar.totale < 0) err(F, `${k}.ar`, 'serve { totale, magica } con numeri interi');
        else if (!isIntero(o.ar.magica ?? 0) || (o.ar.magica ?? 0) > o.ar.totale) err(F, `${k}.ar.magica`, 'intero non superiore al totale');
        if (o.tipo === 'armatura' && !(isOggetto(f.categorie) && o.categoria in f.categorie) && o.penalita === undefined) {
          err(F, `${k}.categoria`, `categoria "${o.categoria}" senza penalità in «categorie» e senza «penalita» proprie`);
        }
        if (o.penalita !== undefined) validaPenalita(F, `${k}.penalita`, o.penalita, err);
      }
      if (o.tipo === 'scudo') {
        const parata = (v, chiave) => {
          if (!isOggetto(v) || !isIntero(v.ravvicinata) || !isIntero(v.distanza)) err(F, chiave, 'serve { ravvicinata, distanza } con modificatori interi (§7.4.11)');
        };
        parata(o.parata, `${k}.parata`);
        if (o.mov !== undefined && !(isIntero(o.mov) && o.mov <= 0)) err(F, `${k}.mov`, 'penalità MOV: intero ≤ 0');
        if (o.profili_alternativi !== undefined) {
          if (!Array.isArray(o.profili_alternativi)) err(F, `${k}.profili_alternativi`, 'deve essere un elenco');
          else o.profili_alternativi.forEach((a, j) => {
            const kk = `${k}.profili_alternativi[${j}]`;
            if (!isTesto(a?.condizione)) err(F, `${kk}.condizione`, 'testo mancante');
            if (a?.parata !== undefined) parata(a.parata, `${kk}.parata`);
            if (a?.ar !== undefined && !(isOggetto(a.ar) && isIntero(a.ar.totale) && isIntero(a.ar.magica ?? 0))) err(F, `${kk}.ar`, 'serve { totale, magica }');
            if (a?.parata === undefined && a?.ar === undefined) err(F, kk, 'un profilo alternativo cambia la Parata o l’AR');
          });
        }
        if (o.attacco !== undefined) {
          const a = o.attacco;
          if (!isOggetto(a)) err(F, `${k}.attacco`, 'serve { abilita, mani, danno, portata_q }');
          else {
            if (!nomiAbilita.includes(a.abilita)) err(F, `${k}.attacco.abilita`, `Abilità "${a.abilita}" inesistente`);
            if (!DADI.test(String(a.danno))) err(F, `${k}.attacco.danno`, `"${a.danno}" non è una formula di dadi`);
            if (![1, 2].includes(a.mani)) err(F, `${k}.attacco.mani`, 'deve essere 1 o 2');
            numeroOpz(F, `${k}.attacco.portata_q`, a.portata_q, 1, 99, err);
          }
        }
      }
    });
  }
  for (const [F, k, r] of rimandi) if (!rif.has(r)) err(F, k, `"${r}" non è un oggetto del catalogo (formato "file:id")`);
}

function validaPenalita(F, k, p, err) {
  if (!isOggetto(p)) { err(F, k, 'deve essere un oggetto di penalità'); return; }
  for (const [c, v] of Object.entries(p)) {
    if (!CAMPI_PENALITA.includes(c)) err(F, `${k}.${c}`, `penalità sconosciuta (ammesse: ${CAMPI_PENALITA.join(', ')})`);
    else if (!isIntero(v) || v > 0) err(F, `${k}.${c}`, 'deve essere un intero ≤ 0');
  }
}

function numeroOpz(F, k, v, min, max, err) {
  if (v === undefined || v === null) return;
  if (typeof v !== 'number' || !Number.isFinite(v)) err(F, k, `deve essere un numero, trovato ${JSON.stringify(v)}`);
  else if (v < min || v > max) err(F, k, `fuori intervallo (${min}–${max}): ${v}`);
}
