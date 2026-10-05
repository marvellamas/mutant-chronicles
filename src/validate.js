// Validatore dei dati delle regole (data/*.json).
// Controlla gli invarianti dei manuali e restituisce errori leggibili: file, chiave, problema.
// Non lancia eccezioni: un file malformato produce errori, non un crash.
import { TIPI as TIPI_EQUIP, STATI } from './equipaggiamento.js';

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
  'talenti_liberi', 'specializzazioni', 'tecniche_interiori', 'dotazioni', 'formato_nemici', 'bestiario'];

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
  validaRegole(dati.regole, err, dati);
  if (dati.regole && dati.abilita) validaEffettiCondizioni(dati, err);
  validaCorporazioni(dati.corporazioni, sigle, nomiAbilita, idSalvezze, dati.caratteristiche, err);
  const nomiAddestramenti = validaAddestramenti(dati.addestramenti, nomiAbilita, idSalvezze, dati.regole, err);
  const macrofamiglie = validaIncantesimi(dati.incantesimi, dati.regole, err);
  validaClassi(dati.classi, nomiAddestramenti, nomiAbilita, macrofamiglie, dati.regole, err);
  validaAvanzamento(dati.regole, err);
  const idSpec = validaSpecializzazioni(dati.specializzazioni, nomiAbilita, err);
  validaTalentiLiberi(dati.talenti_liberi, idSpec, err, (dati.addestramenti?.addestramenti ?? []).map((a) => a.nome));
  validaTecniche(dati.tecniche_interiori, err);
  validaEquipaggiamento(dati.equipaggiamento, [...nomiAbilita], [...(idSpec ?? [])], err, Object.keys(dati.regole?.chroma?.colori ?? {}).filter((c) => !dati.regole.chroma.colori[c]?.esausto && dati.regole.chroma.colori[c]?.contenitore !== false), Object.keys(dati.regole?.corruzione ?? {}));
  if (dati.regole?.chroma !== undefined) validaChroma(dati, err);
  if (dati.equipaggiamento?.file) validaNec(dati, err);
  if (dati.equipaggiamento?.file) validaUmanita(dati, err);
  if (dati.regole) validaSchedaDigitale(dati, err);
  if (isOggetto(dati.dotazioni)) validaDotazioni(dati, err);
  if (dati.equipaggiamento?.file?.munizioni?.ricarica !== undefined) validaRicarica(dati, err);
  if (dati.regole?.attacco_distanza !== undefined) validaAttaccoDistanza(dati, err);
  if (dati.regole?.attacco_ravvicinato !== undefined) validaAttaccoRavvicinato(dati, err);
  if (dati.incantesimi?.incantesimi?.some((i) => i.meccanica)) validaMeccanicaIncantesimi(dati, err);
  if (isOggetto(dati.formato_nemici)) validaFormatoNemici(dati, err);
  if (isOggetto(dati.bestiario)) validaBestiario(dati, err);
  if (isOggetto(dati.veicoli)) validaVeicoli(dati, err);
  if (dati.incantesimi?.incantesimi?.length) validaDurateIncantesimi(dati, err);
  // durate in Round (Giocatore §8.9.1, §5.18): il Round di attivazione conta o no (src/tecniche.js → fineDurata)
  if (dati.regole?.durate_round !== undefined && typeof dati.regole.durate_round?.round_attivazione_conta !== 'boolean') err('regole', 'durate_round.round_attivazione_conta', 'vero o falso: il Round di attivazione conta nella durata?');

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

/**
 * Effetti strutturati di Ferite, Affaticamento e Stati (§5.14, §5.18, §5.19), usati per i valori
 * effettivi della modalità tavolo (src/condizioni.js): nomi di Abilità, categorie e gruppi esistenti,
 * valori interi.
 */
function validaEffettiCondizioni(dati, err) {
  const F = 'regole';
  const r = dati.regole;
  const nomi = new Set((dati.abilita.abilita ?? []).map((a) => a.nome));
  const categorie = new Set(dati.abilita.categorie ?? []);
  for (const k of ['ferite', 'affaticamento', 'corruzione']) {
    const a = r[k]?.si_applica_a;
    if (!Array.isArray(a) || !a.length || !a.every((x) => ['abilita', 'salvezze'].includes(x))) err(F, `${k}.si_applica_a`, 'lista di "abilita" e/o "salvezze" mancante');
  }
  // categorie di Prove (regole.json → categorie_prove): liste di Abilità (A.16, A.51)
  const gruppi = Object.keys(r.categorie_prove ?? {}).filter((k) => !k.startsWith('_') && k !== 'TODO(Davide)');
  for (const g of gruppi) {
    const l = r.categorie_prove[g];
    if (!Array.isArray(l) || !l.length) err(F, `categorie_prove.${g}`, 'lista di Abilità mancante');
    else l.forEach((n) => { if (!nomi.has(n)) err(F, `categorie_prove.${g}`, `"${n}" non è un'Abilità`); });
  }
  const salvezze = new Set((dati.caratteristiche?.salvezze ?? []).map((s) => s.id));
  // effetti degli Stati: schema degli effetti degli oggetti (docs/effetti-oggetti.md)
  const validaEffettiStato = (lista, P) => {
    if (!Array.isArray(lista)) { err(F, P, 'lista di effetti attesa'); return; }
    lista.forEach((e, j) => {
      const K = `${P}[${j}]`;
      if (!isOggetto(e)) { err(F, K, 'oggetto atteso'); return; }
      if (!['va', 'salvezza'].includes(e.tipo)) err(F, `${K}.tipo`, 'uno fra va, salvezza');
      if (e.tipo === 'va' && (e.abilita === undefined) === (e.prove === undefined)) err(F, K, 'serve «abilita» oppure «prove», non tutti e due');
      if (e.abilita !== undefined && !nomi.has(e.abilita)) err(F, `${K}.abilita`, `"${e.abilita}" non è un'Abilità`);
      if (e.prove !== undefined && e.prove !== 'tutte' && !gruppi.includes(e.prove)) err(F, `${K}.prove`, `categoria sconosciuta (regole.json → categorie_prove, o «tutte»)`);
      if (e.tipo === 'salvezza' && e.salvezza !== 'tutte' && !salvezze.has(e.salvezza)) err(F, `${K}.salvezza`, 'id di una Prova Salvezza o «tutte»');
      if (!isIntero(e.valore) || e.valore === 0) err(F, `${K}.valore`, 'intero diverso da 0 atteso');
      if (!['generale', 'uso_specifico'].includes(e.ambito)) err(F, `${K}.ambito`, 'uno fra generale, uso_specifico');
      if (e.ambito === 'uso_specifico' && !isTesto(e.uso)) err(F, `${K}.uso`, 'etichetta dell’uso mancante');
      if (e.tipo === 'salvezza' && e.ambito !== 'generale') err(F, `${K}.ambito`, 'le Salvezze degli Stati sono generali');
      if (!isTesto(e.condizione)) err(F, `${K}.condizione`, 'frase del manuale mancante');
      if (!isTesto(e.fonte)) err(F, `${K}.fonte`, 'paragrafo del manuale mancante');
    });
  };
  const validaEffetto = (e, P) => {
    if (!isOggetto(e)) { err(F, P, 'deve essere un oggetto'); return; }
    const noti = ['va', 'salvezze', 'va_categorie', 'va_abilita', 'va_gruppi', 'fonte'];
    for (const k of Object.keys(e)) if (!noti.includes(k)) err(F, `${P}.${k}`, `campo sconosciuto (ammessi: ${noti.join(', ')})`);
    for (const k of ['va', 'salvezze']) if (e[k] !== undefined && !isIntero(e[k])) err(F, `${P}.${k}`, 'numero intero atteso');
    const mappa = (k, validi, cosa) => {
      if (e[k] === undefined) return;
      if (!isOggetto(e[k])) { err(F, `${P}.${k}`, 'oggetto {nome: valore} atteso'); return; }
      for (const [n, v] of Object.entries(e[k])) {
        if (!validi.has(n)) err(F, `${P}.${k}.${n}`, `${cosa} inesistente`);
        if (!isIntero(v)) err(F, `${P}.${k}.${n}`, 'numero intero atteso');
      }
    };
    mappa('va_categorie', categorie, 'categoria di Abilità');
    mappa('va_abilita', nomi, 'Abilità');
    mappa('va_gruppi', new Set(gruppi), 'gruppo (serve regole.json → categorie_prove)');
    if (!isTesto(e.fonte)) err(F, `${P}.fonte`, 'paragrafo del manuale mancante');
  };
  (r.stati?.elenco ?? []).forEach((x, i) => {
    const P = `stati.elenco[${i}] (${x?.nome})`;
    if (x?.effetto !== undefined) err(F, `${P}.effetto`, 'sostituito da «effetti» (lista nello schema degli effetti)');
    if (x?.effetti !== undefined) validaEffettiStato(x.effetti, `${P}.effetti`);
    if (x?.limiti !== undefined) {
      const l = x.limiti;
      const chiavi = Object.keys(l ?? {}).filter((k) => !['manovre_vietate', 'solo_azioni_difensive', 'testo', 'fonte'].includes(k));
      if (!isOggetto(l) || chiavi.length) err(F, `${P}.limiti`, 'chiavi ammesse: manovre_vietate, solo_azioni_difensive, testo, fonte');
      else {
        const manovre = new Set([...Object.keys(r.attacco_distanza?.manovre ?? {}), ...Object.keys(r.attacco_ravvicinato?.manovre ?? {})]);
        for (const m of l.manovre_vietate ?? []) if (!manovre.has(m)) err(F, `${P}.limiti.manovre_vietate`, `"${m}" non è una manovra di attacco_distanza o attacco_ravvicinato`);
        if (!isTesto(l.testo) || !isTesto(l.fonte)) err(F, `${P}.limiti`, 'servono «testo» e «fonte»');
      }
    }
    // effetti su Movimento e Azioni (SD, tab Combattimento e Identità)
    if (x?.movimento !== undefined) {
      const m = x.movimento;
      const chiavi = Object.keys(m ?? {}).filter((k) => !['passo_q', 'solo_passo', 'nessuno', 'fonte'].includes(k));
      if (!isOggetto(m) || chiavi.length) err(F, `${P}.movimento`, `chiavi ammesse: passo_q, solo_passo, nessuno, fonte${chiavi.length ? ` (non: ${chiavi.join(', ')})` : ''}`);
      else {
        if (m.passo_q !== undefined && !(isIntero(m.passo_q) && m.passo_q >= 0)) err(F, `${P}.movimento.passo_q`, 'intero ≥ 0 atteso');
        if (!isTesto(m.fonte)) err(F, `${P}.movimento.fonte`, 'paragrafo del manuale mancante');
      }
    }
    if (x?.azioni !== undefined) {
      const a = x.azioni;
      const chiavi = Object.keys(a ?? {}).filter((k) => !['principali', 'movimento', 'fonte'].includes(k));
      if (!isOggetto(a) || chiavi.length) err(F, `${P}.azioni`, 'chiavi ammesse: principali, movimento, fonte');
      else {
        for (const k of ['principali', 'movimento']) if (a[k] !== undefined && !(isIntero(a[k]) && a[k] >= 0)) err(F, `${P}.azioni.${k}`, 'intero ≥ 0 atteso');
        if (!isTesto(a.fonte)) err(F, `${P}.azioni.fonte`, 'paragrafo del manuale mancante');
      }
    }
  });
  if (r.carico !== undefined) validaCarico(dati, validaEffetto, err);
  if (r.integrita !== undefined) validaIntegrita(dati, err);
  if (r.ar !== undefined) validaAR(dati, err);
}

/**
 * Blocco «carico» di regole.json (Giocatore §5.2.6, Equipaggiamento §1.6): Caratteristica esistente,
 * tre livelli (ordinario, sovraccarico, oltre il massimo) con soglie crescenti e l'ultimo senza
 * soglia, effetti nella forma delle condizioni, Talenti moltiplicatori esistenti.
 */
function validaCarico(dati, validaEffetto, err) {
  const F = 'regole';
  const c = dati.regole.carico;
  if (!isOggetto(c)) { err(F, 'carico', 'oggetto mancante'); return; }
  if (!isTesto(c.versione_manuale)) err(F, 'carico.versione_manuale', 'campo mancante o vuoto');
  if (!(dati.caratteristiche?.caratteristiche ?? []).some((x) => x.sigla === c.caratteristica)) err(F, 'carico.caratteristica', `"${c.caratteristica}" non è una Caratteristica`);
  const l = c.livelli;
  if (!Array.isArray(l) || l.length !== 3) { err(F, 'carico.livelli', 'servono tre livelli: ordinario, sovraccarico, oltre il massimo (§5.2.6)'); return; }
  l.forEach((x, i) => {
    const K = `carico.livelli[${i}]`;
    if (!isOggetto(x)) { err(F, K, 'oggetto atteso'); return; }
    for (const k of ['id', 'nome', 'promemoria']) if (!isTesto(x[k])) err(F, `${K}.${k}`, 'testo mancante');
    const ultimo = i === l.length - 1;
    if (ultimo ? x.fino_a_kg_per_punto !== null : !(isIntero(x.fino_a_kg_per_punto) && x.fino_a_kg_per_punto > (i ? l[i - 1].fino_a_kg_per_punto : 0))) {
      err(F, `${K}.fino_a_kg_per_punto`, ultimo ? 'l’ultimo livello non ha soglia (null)' : 'intero positivo, maggiore della soglia precedente');
    }
    if (x.effetto !== null && x.effetto !== undefined) validaEffetto(x.effetto, `carico.livelli[${i}] (${x.nome}).effetto`);
    if (x.movimento_q !== undefined && !(isIntero(x.movimento_q) && x.movimento_q <= 0)) err(F, `${K}.movimento_q`, 'intero ≤ 0 atteso');
  });
  if (l[0]?.effetto) err(F, 'carico.livelli[0].effetto', 'il carico ordinario non ha penalità (null)');
  if (!(isIntero(c.spinta_kg_per_punto) && c.spinta_kg_per_punto >= (l[1]?.fino_a_kg_per_punto ?? 0))) err(F, 'carico.spinta_kg_per_punto', 'intero non inferiore alla soglia massima');
  const talenti = new Set((dati.classi?.classi ?? []).flatMap((cl) => [...(cl.talenti_fissi ?? []), ...(cl.talenti_a_scelta ?? [])].map((t) => t.nome)));
  (Array.isArray(c.moltiplicatori) ? c.moltiplicatori : []).forEach((m, i) => {
    if (!talenti.has(m?.talento)) err(F, `carico.moltiplicatori[${i}].talento`, `"${m?.talento}" non è un Talento di Classe`);
    if (!(typeof m?.fattore === 'number' && m.fattore > 0)) err(F, `carico.moltiplicatori[${i}].fattore`, 'numero positivo atteso');
  });
  if (c.moltiplicatori !== undefined && !Array.isArray(c.moltiplicatori)) err(F, 'carico.moltiplicatori', 'lista attesa');
}

/**
 * Blocco «integrita» di regole.json (Equipaggiamento §1.7, Armamenti §7.2.1): PS Integrità per
 * Qualità costruttiva, interi crescenti; ogni oggetto del catalogo con «qualita» deve avere la
 * «ps_int» corrispondente.
 */
function validaIntegrita(dati, err) {
  const F = 'regole';
  const t = dati.regole.integrita;
  if (!isOggetto(t)) { err(F, 'integrita', 'oggetto mancante'); return; }
  if (!isTesto(t.versione_manuale)) err(F, 'integrita.versione_manuale', 'campo mancante o vuoto');
  const ps = t.ps_per_qualita;
  if (!isOggetto(ps) || !Object.keys(ps).length) { err(F, 'integrita.ps_per_qualita', 'tabella Qualità → PS Integrità mancante'); return; }
  const valori = Object.values(ps);
  if (!valori.every((v, i) => isIntero(v) && v > 0 && (i === 0 || v > valori[i - 1]))) err(F, 'integrita.ps_per_qualita', 'PS intere positive e crescenti con la Qualità');
  // sigle per la SS (foglio 4): una per Qualità, brevi e diverse fra loro
  const sigle = t.sigle_qualita;
  if (sigle !== undefined) {
    const mancanti = Object.keys(ps).filter((q) => !(typeof sigle?.[q] === 'string' && /^[A-Z]{1,3}$/.test(sigle[q])));
    if (mancanti.length) err(F, 'integrita.sigle_qualita', `sigla di 1–3 maiuscole mancante per: ${mancanti.join(', ')}`);
    if (new Set(Object.values(sigle ?? {})).size !== Object.keys(sigle ?? {}).length) err(F, 'integrita.sigle_qualita', 'sigle ripetute');
  }
  for (const [id, f] of Object.entries(dati.equipaggiamento?.file ?? {})) {
    (f.oggetti ?? []).forEach((o, i) => {
      if (o?.qualita === undefined || o.qualita === null) return;
      const K = `oggetti[${i}] (${o.nome})`;
      if (!(o.qualita in ps)) err(`equipaggiamento/${id}`, `${K}.qualita`, `"${o.qualita}" non è una Qualità di regole.json → integrita (${Object.keys(ps).join(', ')})`);
      else if (o.ps_int !== undefined && o.ps_int !== null && o.ps_int !== ps[o.qualita]) err(`equipaggiamento/${id}`, `${K}.ps_int`, `Qualità ${o.qualita} vuole PS Integrità ${ps[o.qualita]}, trovata ${o.ps_int} (§1.7)`);
      if (o.pi !== undefined && o.pi !== null && !(isIntero(o.pi) && o.pi > 0)) err(`equipaggiamento/${id}`, `${K}.pi`, 'PI massimi: intero positivo, o null per i moduli integrati (§7.2.1)');
    });
  }
  // PI tracciati e soglie (docs/ricognizione-ar-pi.md)
  if (t.tipi_tracciati !== undefined) {
    if (!Array.isArray(t.tipi_tracciati) || !t.tipi_tracciati.length) err(F, 'integrita.tipi_tracciati', 'lista di tipi di oggetto attesa');
    else for (const x of t.tipi_tracciati) if (!TIPI_EQUIP.includes(x)) err(F, 'integrita.tipi_tracciati', `"${x}" non è un tipo di oggetto (${TIPI_EQUIP.join(', ')})`);
  }
  if (t.soglie !== undefined) {
    if (!Array.isArray(t.soglie)) err(F, 'integrita.soglie', 'lista attesa');
    else t.soglie.forEach((s, i) => {
      if (!isIntero(s?.pi_fino_a) || s.pi_fino_a < 0) err(F, `integrita.soglie[${i}].pi_fino_a`, 'intero ≥ 0 atteso');
      if (!isTesto(s?.etichetta)) err(F, `integrita.soglie[${i}].etichetta`, 'etichetta mancante');
      if (!['inutilizzabile', 'nessuno'].includes(s?.effetto)) err(F, `integrita.soglie[${i}].effetto`, 'uno fra inutilizzabile, nessuno');
    });
  }
}

/**
 * Blocco «ar» di regole.json (docs/ricognizione-ar-pi.md; Giocatore §5.13, Armamenti §7.4, §7.11):
 * regole di cumulo, etichette, Talenti passivi che danno AR.
 */
function validaAR(dati, err) {
  const F = 'regole';
  const a = dati.regole.ar;
  if (!isOggetto(a)) { err(F, 'ar', 'oggetto atteso'); return; }
  if (!isTesto(a.paragrafo)) err(F, 'ar.paragrafo', 'paragrafo del manuale mancante');
  const REGOLE = ['massimo', 'somma', 'nessuna'];
  for (const k of ['armatura', 'scudo', 'elmetto', 'effetti', 'ar_contro']) {
    if (!REGOLE.includes(a.cumulo?.[k])) err(F, `ar.cumulo.${k}`, `uno fra ${REGOLE.join(', ')}`);
  }
  if (!isTesto(a.etichette?.totale) || !isTesto(a.etichette?.magica)) err(F, 'ar.etichette', 'servono «totale» e «magica»');
  const nomi = new Set((dati.classi?.classi ?? []).flatMap((c) => [...(c.talenti ?? []), ...(c.talenti_a_scelta ?? [])].map((t) => t.nome)));
  (Array.isArray(a.talenti) ? a.talenti : []).forEach((t, i) => {
    const K = `ar.talenti[${i}]`;
    if (!nomi.has(t?.talento)) err(F, `${K}.talento`, `"${t?.talento}" non è un Talento di Classe`);
    if (!isIntero(t?.totale) || !isIntero(t?.magica) || t.magica < 0 || t.magica > t.totale) err(F, K, 'totale e magica interi, 0 ≤ magica ≤ totale');
    if (!['armatura', 'protezione_artefatto', 'nessuno'].includes(t?.richiede)) err(F, `${K}.richiede`, 'uno fra armatura, protezione_artefatto, nessuno');
  });
  if (!isTesto(a.promemoria_danno)) err(F, 'ar.promemoria_danno', 'promemoria per «Attacca!» mancante');
  // A.48: Tecniche Interiori che danno AR, attivabili al tavolo
  const idTec = new Set((dati.tecniche_interiori?.tecniche ?? []).map((t) => t.id));
  (Array.isArray(a.tecniche) ? a.tecniche : []).forEach((t, i) => {
    const K = `ar.tecniche[${i}]`;
    if (idTec.size && !idTec.has(t?.tecnica)) err(F, `${K}.tecnica`, `"${t?.tecnica}" non è una Tecnica Interiore`);
    if (!isIntero(t?.totale) || !isIntero(t?.magica) || t.magica < 0 || t.magica > t.totale) err(F, K, 'totale e magica interi, 0 ≤ magica ≤ totale');
  });
  // A.50: ordine delle riduzioni per «Attacca!»
  const o = a.ordine_riduzioni;
  if (o !== undefined && !(isOggetto(o) && Array.isArray(o.passi) && o.passi.every(isTesto) && isTesto(o.esempio) && isTesto(o.incendiato) && Array.isArray(o.proprieta))) {
    err(F, 'ar.ordine_riduzioni', 'serve { passi: [testi], esempio, incendiato, proprieta: [nomi] }');
  }
}

function validaRegole(r, err, dati = {}) {
  // tab Cibernetica e Veicoli (docs/layout-sd.md, pezzo 5): testo e rimandi
  for (const [k, x] of Object.entries(r?.tab_in_arrivo ?? {}).filter(([k]) => !k.startsWith('_'))) {
    if (!isTesto(x?.testo)) err('regole', `tab_in_arrivo.${k}.testo`, 'testo mancante');
    if (x?.rimandi !== undefined && (!Array.isArray(x.rimandi) || !x.rimandi.every(isTesto))) err('regole', `tab_in_arrivo.${k}.rimandi`, 'elenco di testi');
  }
  // tab Poteri (docs/layout-sd.md, pezzo 4): testo per chi non ha poteri e sezioni in arrivo
  if (r?.poteri !== undefined) {
    if (!isTesto(r.poteri?.nessuno)) err('regole', 'poteri.nessuno', 'testo mancante (Manuale della Magia, sez. 1)');
    (Array.isArray(r.poteri?.in_arrivo) ? r.poteri.in_arrivo : []).forEach((x, i) => {
      if (!isTesto(x?.nome) || !isTesto(x?.nota)) err('regole', `poteri.in_arrivo[${i}]`, 'servono nome e nota');
    });
  }
  if (!isOggetto(r)) return;
  const F = 'regole';
  const interi = [
    'creazione.punti_caratteristica', 'creazione.massimo_caratteristica', 'creazione.punti_abilita_liberi',
    'creazione.va_minimo_per_punti_liberi', 'creazione.bonus_classe_per_grado',
    'salvezze.base', 'punti_eroe.dadi', 'punti_eroe.facce', 'punti_eroe.fisso', 'punti_eroe.minimo',
    'punti_eroe.massimo', 'punti_eroe.riserva_massima', 'movimento.passo', 'movimento.corsa', 'movimento.scatto',
    'competenze.punti_base_totali', 'taumaturgo.incantesimi_liberi.fisso', 'taumaturgo.incantesimi_liberi.minimo',
    'incantesimi.per_specializzazione',
  ];
  for (const percorso of interi) {
    const v = percorso.split('.').reduce((o, k) => o?.[k], r);
    if (!isIntero(v)) err(F, percorso, 'numero intero mancante');
  }
  // riparazione strutturale (Armamenti §7.2.1, A.46)
  const rip = r.integrita?.riparazione;
  if (rip !== undefined) {
    const ok = isOggetto(rip) && isTesto(rip.abilita) && Array.isArray(rip.esiti) && rip.esiti.length && rip.esiti.every((e) => isTesto(e?.id) && isTesto(e?.nome) && isIntero(e?.pi))
      && isIntero(rip.strumenti_improvvisati_va) && typeof rip.materiali_percentuale === 'number' && rip.materiali_percentuale >= 0 && Array.isArray(rip.tipi) && Array.isArray(rip.esclusi);
    if (!ok) err(F, 'integrita.riparazione', 'serve { abilita, esiti: [{ id, nome, pi }], strumenti_improvvisati_va, materiali_percentuale, tipi, esclusi }');
  }
  // bonus di Caratteristica al danno (Giocatore §5.13; E&L 12)
  const dc = r.danno_caratteristica;
  if (dc !== undefined) {
    const sigle = new Set((dati.caratteristiche?.caratteristiche ?? []).map((c) => c.sigla));
    const fascia = (x, k) => isOggetto(x) && isIntero(x.da) && (x.a === null || isIntero(x.a)) && isIntero(x[k]) && x[k] >= 0;
    if (!Array.isArray(dc.fasce) || !dc.fasce.length || !dc.fasce.every((x) => fascia(x, 'bonus'))) err(F, 'danno_caratteristica.fasce', 'serve [{ da, a (intero o null), bonus ≥ 0 }]');
    if (!Array.isArray(dc.tetto_per_livello) || !dc.tetto_per_livello.length || !dc.tetto_per_livello.every((x) => fascia(x, 'massimo'))) err(F, 'danno_caratteristica.tetto_per_livello', 'serve [{ da, a (intero o null), massimo ≥ 0 }]');
    for (const k of ['senz_armi', 'magia']) if (!sigle.has(dc[k])) err(F, `danno_caratteristica.${k}`, `Caratteristica «${dc[k]}» sconosciuta`);
    for (const [ab, c] of Object.entries(dc.caratteristica_per_abilita ?? {})) {
      if (!(dati.abilita?.abilita ?? []).some((a) => a.nome === ab)) err(F, `danno_caratteristica.caratteristica_per_abilita.${ab}`, 'Abilità sconosciuta');
      if (!sigle.has(c)) err(F, `danno_caratteristica.caratteristica_per_abilita.${ab}`, `Caratteristica «${c}» sconosciuta`);
    }
  }
  // condizioni delle armi al tavolo (Giocatore §5.17, A.49)
  if (r.condizioni_armi !== undefined) {
    const el = r.condizioni_armi?.elenco;
    if (!Array.isArray(el) || !el.length) err(F, 'condizioni_armi.elenco', 'elenco delle condizioni mancante');
    else el.forEach((c, i) => {
      if (!isTesto(c?.id) || !isTesto(c?.nome) || typeof c?.utilizzabile !== 'boolean' || !isIntero(c?.va) || c.va > 0) err(F, `condizioni_armi.elenco[${i}]`, 'serve { id, nome, utilizzabile: booleano, va: intero ≤ 0, testo }');
    });
  }
  // titolo dell'avviso «regole aggiornate» della SD (facoltativo; senza, «Regole aggiornate»)
  if (r.regole_aggiornate !== undefined && !(isOggetto(r.regole_aggiornate) && isTesto(r.regole_aggiornate.punti_abilita))) {
    err(F, 'regole_aggiornate.punti_abilita', 'testo dell’avviso mancante');
  }
  // avviso dei Punti Abilità Liberi in eccesso (E&L del 03/10/2026): «{n}» è il numero dei punti in più
  if (r.regole_aggiornate?.mancanti !== undefined && !(isTesto(r.regole_aggiornate.mancanti) && r.regole_aggiornate.mancanti.includes('{n}'))) {
    err(F, 'regole_aggiornate.mancanti', 'testo dell’avviso dei punti da assegnare mancante o senza «{n}» (il numero dei punti)');
  }
  if (r.regole_aggiornate?.eccesso !== undefined && !(isTesto(r.regole_aggiornate.eccesso) && r.regole_aggiornate.eccesso.includes('{n}'))) {
    err(F, 'regole_aggiornate.eccesso', 'testo dell’avviso dei punti in eccesso mancante o senza «{n}» (il numero dei punti in più)');
  }
  // calendario di gioco della scheda (src/calendario.js): fasce in ordine e le tre bandierine
  const cal = r.calendario;
  const listaIdNome = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => isOggetto(x) && isTesto(x.id) && isTesto(x.nome))
    && new Set(v.map((x) => x.id)).size === v.length;
  if (!isOggetto(cal)) err(F, 'calendario', 'blocco mancante: { fasce, bandierine, ricordare }');
  else {
    if (!listaIdNome(cal.fasce)) err(F, 'calendario.fasce', 'elenco non vuoto di { id, nome } con id diversi, nell’ordine della giornata');
    if (!listaIdNome(cal.bandierine) || cal.bandierine.map((b) => b.id).join() !== 'rosso,giallo,verde') {
      err(F, 'calendario.bandierine', 'servono rosso, giallo e verde, in quest’ordine, ognuna con il suo nome (i colori sono in css/palette.css)');
    }
    if (!isTesto(cal.ricordare?.sigla) || !isTesto(cal.ricordare?.nome)) err(F, 'calendario.ricordare', 'servono sigla e nome');
  }
  // §2.16.28: crediti iniziali = fisso + (dadi)d(facce) × moltiplicatore
  const cr = r.crediti_iniziali;
  if (!isOggetto(cr) || !['dadi', 'facce', 'moltiplicatore', 'fisso', 'minimo', 'massimo'].every((k) => isIntero(cr[k]))) {
    err(F, 'crediti_iniziali', 'servono dadi, facce, moltiplicatore, fisso, minimo e massimo interi (§2.16.28)');
  } else {
    if (cr.minimo !== cr.fisso + cr.dadi * cr.moltiplicatore) err(F, 'crediti_iniziali.minimo', `con ${cr.formula} il minimo è ${cr.fisso + cr.dadi * cr.moltiplicatore}`);
    if (cr.massimo !== cr.fisso + cr.dadi * cr.facce * cr.moltiplicatore) err(F, 'crediti_iniziali.massimo', `con ${cr.formula} il massimo è ${cr.fisso + cr.dadi * cr.facce * cr.moltiplicatore}`);
  }
  const pe = r.punti_eroe;
  if (isOggetto(pe) && isIntero(pe.dadi) && isIntero(pe.fisso)) {
    if (pe.minimo !== pe.dadi + pe.fisso) err(F, 'punti_eroe.minimo', `con ${pe.formula} il minimo è ${pe.dadi + pe.fisso}`);
    if (pe.massimo !== pe.dadi * pe.facce + pe.fisso) err(F, 'punti_eroe.massimo', `con ${pe.formula} il massimo è ${pe.dadi * pe.facce + pe.fisso}`);
  }
  if (!Array.isArray(r.salvezze?.avanzamento_per_livello)) err(F, 'salvezze.avanzamento_per_livello', 'tabella mancante');
  if (!Array.isArray(r.iniziativa?.caratteristiche)) err(F, 'iniziativa.caratteristiche', 'lista mancante');
  // §2.3, §8.3, §8.7 (Giocatore del 29/09): categorie di competenza con base, numero di Abilità e
  // formula del limite del VA personale; la somma delle basi è punti_base_totali (122)
  const cc = r.competenze?.categorie;
  if (!isOggetto(cc) || !Object.keys(cc).length) err(F, 'competenze.categorie', 'categorie di competenza mancanti (§2.3)');
  else {
    let totale = 0;
    for (const [id, c] of Object.entries(cc)) {
      const K = `competenze.categorie.${id}`;
      if (!isTesto(c?.nome) || !isIntero(c?.numero) || c.numero < 0 || !isIntero(c?.base)) { err(F, K, 'servono nome, numero di Abilità e base interi (§2.3)'); continue; }
      const L = c.limite;
      if (!isOggetto(L) || !['fisso', 'per_grado_totale', 'per_grado_categoria'].every((x) => isIntero(L[x]) && L[x] >= 0)) err(F, `${K}.limite`, 'serve { fisso, per_grado_totale, per_grado_categoria } interi ≥ 0 (§8.7)');
      totale += c.numero * c.base;
    }
    const n = Object.values(cc).reduce((s, c) => s + (isIntero(c?.numero) ? c.numero : 0), 0);
    if (dati.abilita?.abilita && n !== dati.abilita.abilita.length) err(F, 'competenze.categorie', `le categorie coprono ${n} Abilità, le Abilità sono ${dati.abilita.abilita.length}`);
    if (isIntero(r.competenze.punti_base_totali) && totale !== r.competenze.punti_base_totali) err(F, 'competenze.punti_base_totali', `le basi sommano ${totale}, non ${r.competenze.punti_base_totali} (§2.3)`);
  }
  for (const tab of ['incantesimi.schema_livello_base']) {
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
      // §5.15, §5.18: Stati con una perdita periodica di PV (src/periodici.js)
      if (x?.periodico !== undefined) {
        const P = `stati.elenco[${i}] (${x?.nome}).periodico`;
        const p = x.periodico;
        if (!isOggetto(p)) err(F, P, 'oggetto atteso');
        else {
          const d = p.danno;
          if (d !== 'valore' && d !== 'dalla_fonte' && !/^\d+d\d+([+-]\d+)?$/.test(String(d ?? ''))) err(F, `${P}.danno`, '«valore» (il valore X dello Stato), «dalla_fonte» o una formula di dadi («1d4»)');
          if (!Array.isArray(p.ignora) || !p.ignora.length) err(F, `${P}.ignora`, 'elenco di che cosa non riduce la perdita (armatura, parata, schivata, armatura_non_magica)');
          if (p.non_sotto_zero !== true) err(F, `${P}.non_sotto_zero`, 'true atteso: la perdita non porta i PV sotto 0 (§5.15)');
          if (typeof p.ferita_quando_azzera !== 'boolean') err(F, `${P}.ferita_quando_azzera`, 'booleano atteso (§5.15: arrivando a 0 PV non produce subito una Ferita)');
          if (!isTesto(p.a_zero_pv?.salvezza) || !isTesto(p.a_zero_pv?.testo)) err(F, `${P}.a_zero_pv`, 'servono «salvezza» e «testo»: a 0 PV la perdita richiede una Prova');
          if (!isTesto(p.fine)) err(F, `${P}.fine`, 'come finisce la perdita periodica');
          if (!isTesto(p.paragrafo)) err(F, `${P}.paragrafo`, 'paragrafo del manuale mancante');
          if (!Array.isArray(p.frasi) || !p.frasi.length) err(F, `${P}.frasi`, 'frasi del manuale mancanti');
        }
      }
    });
    // regole comuni delle perdite periodiche (§5.15, §5.18; Magia)
    const PR = r.stati?.periodici;
    if (!isOggetto(PR)) err(F, 'stati.periodici', 'regole comuni delle perdite periodiche mancanti (§5.18)');
    else {
      if (PR.quando !== 'iniziativa_fonte') err(F, 'stati.periodici.quando', '«iniziativa_fonte» atteso (§5.18: le ricorrenze seguono l’Iniziativa di chi ha procurato l’effetto)');
      if (PR.senza_fonte !== 'fine_round') err(F, 'stati.periodici.senza_fonte', '«fine_round» atteso (Magia: una fonte priva di Iniziativa usa la fine del RND)');
      if (PR.max_per_round !== 1) err(F, 'stati.periodici.max_per_round', '1 atteso (§5.18: al massimo una volta per Round)');
      if (!isTesto(PR.avviso) || !PR.avviso.includes('{valore}')) err(F, 'stati.periodici.avviso', 'testo dell’avviso con {stato}, {nome}, {valore}, {prima} e {dopo}');
      if (!Array.isArray(PR.frasi) || !PR.frasi.length) err(F, 'stati.periodici.frasi', 'frasi del manuale mancanti');
    }
  }
  // §1.6: moltiplicatori del danno con il Successo Magistrale (src/danno.js, usato anche da «Attacca!»)
  const MG = r.magistrale;
  if (!isIntero(MG?.raddoppio) || !isIntero(MG?.da_x2) || !isIntero(MG?.massimo)) err(F, 'magistrale', 'raddoppio, da_x2 e massimo interi attesi (§1.6)');
  else if (!(MG.raddoppio <= MG.da_x2 && MG.da_x2 <= MG.massimo)) err(F, 'magistrale', `raddoppio ≤ da_x2 ≤ massimo atteso (${MG.raddoppio}, ${MG.da_x2}, ${MG.massimo})`);
  if (MG?.solo_prima_applicazione !== true) err(F, 'magistrale.solo_prima_applicazione', 'true atteso (§1.6: solo la prima istanza di danno)');
  if (!Array.isArray(MG?.prima_di) || !MG.prima_di.includes('armatura')) err(F, 'magistrale.prima_di', '«difesa» e «armatura» attesi (§1.6: si applica prima della Parata e dell’Armatura)');
  if (!isTesto(MG?.promemoria)) err(F, 'magistrale.promemoria', 'promemoria per «Attacca!» mancante');
  // §5.19: Affaticamento, un unico Stato con la sua penalità
  const aft = r.affaticamento?.stati;
  if (!Array.isArray(aft) || !aft.length) err(F, 'affaticamento.stati', 'elenco {nome, penalita} mancante');
  else aft.forEach((x, i) => {
    if (!isTesto(x?.nome)) err(F, `affaticamento.stati[${i}].nome`, 'nome mancante');
    if (!isIntero(x?.penalita) || x.penalita > 0) err(F, `affaticamento.stati[${i}].penalita`, 'penalità intera ≤ 0 mancante');
  });
  // §5.20: Corruzione Oscura, un unico Stato con la sua penalità; l'ultimo (Oscuro) è irreversibile, senza penalità
  const cros = r.corruzione?.stati;
  if (!Array.isArray(cros) || !cros.length) err(F, 'corruzione.stati', 'elenco {nome, penalita} mancante (Giocatore §5.20)');
  else cros.forEach((x, i) => {
    if (!isTesto(x?.nome)) err(F, `corruzione.stati[${i}].nome`, 'nome mancante');
    if (x?.irreversibile === true ? x.penalita !== null : !isIntero(x?.penalita) || x.penalita > 0) {
      err(F, `corruzione.stati[${i}].penalita`, x?.irreversibile === true ? 'uno Stato irreversibile ha penalità null' : 'penalità intera ≤ 0 mancante');
    }
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
  const ids = new Set();
  listaNominata(F, c, 'corporazioni', err).forEach((x, i) => {
    const k = `corporazioni[${i}] (${x.nome})`;
    // id stabile per file e immagini (img/corporazioni/<id>-96.png, img/sfondi/<id>.jpg)
    if (!isTesto(x.id) || !/^[a-z0-9-]+$/.test(x.id)) err(F, `${k}.id`, 'id mancante (minuscole, cifre e trattini)');
    else if (ids.has(x.id)) err(F, `${k}.id`, `id "${x.id}" ripetuto`);
    else ids.add(x.id);
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
  const lista = listaNominata(F, a, 'addestramenti', err);
  lista.forEach((x, i) => {
    const k = `addestramenti[${i}] (${x.nome})`;
    // §2.2 del 29/09: le basi delle Abilità vengono dalla prima Classe (classi.json → competenze)
    if (x.valori_base !== undefined) err(F, `${k}.valori_base`, 'l’Addestramento non assegna più valori base alle Abilità: si ricavano dalla prima Classe (§2.3)');
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
  // §2.16: requisiti di FOR del manuale diversi dal catalogo, lasciati in sospeso con un TODO(Davide)
  for (const [classe, c] of Object.entries(dati?.dotazioni?.classi ?? {})) {
    (c?.gruppi ?? []).forEach((g, i) => (g?.opzioni ?? []).forEach((o, j) => {
      const todo = Object.keys(o ?? {}).find((k) => k.startsWith('TODO('));
      if (todo) avv('dotazioni', `classi.${classe}.gruppi[${i}].opzioni[${j}] (${o.nome})`, `${o[todo]}`);
    }));
  }
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
const EFFETTI_NOTI = new Set(['iniziativa', 'pv', 'pm', 'salvezza', 'movimento', 'tecniche', 'accessoMagia', 'incantesimi', 'livelloMax', 'livelloMaxIncantesimi', 'magia', 'meditazione', 'attacco_distanza', 'attacco_ravvicinato', 'lancio', 'valori']);
// effetti.magia: valori che sostituiscono la base di regole.json → lancio (numeri) o capacità (true)
const EFFETTI_MAGIA = { focalizzazione_va: 'numero', penalita_ingaggio: 'numero', penalita_contromagia: 'numero', tiro_armi_da_lancio: 'numero', contromagia: 'vero', contromagia_senza_conoscenza: 'vero', occultata: 'vero' };
const EFFETTI_MEDITAZIONE = { accesso: 'vero', pm_per_ora: 'numero', moltiplicatore_ore: 'numero' };

function validaTalentiLiberi(t, idSpec, err, addestramenti = []) {
  if (!isOggetto(t)) return;
  const F = 'talenti_liberi';
  const lista = Array.isArray(t.talenti) ? t.talenti : [];
  const ids = new Set();
  lista.forEach((x, i) => {
    if (!isTesto(x?.id) || !isTesto(x?.nome)) { err(F, `talenti[${i}]`, 'servono "id" e "nome"'); return; }
    if (ids.has(x.id) || idSpec.has(x.id)) err(F, `talenti[${i}] (${x.nome}).id`, `id "${x.id}" duplicato (anche fra le Specializzazioni)`);
    ids.add(x.id);
  });
  const condizioni = isOggetto(t.condizioni_prerequisiti) ? t.condizioni_prerequisiti : {};
  for (const [c, v] of Object.entries(condizioni)) {
    if (c.startsWith('_')) continue;
    if (!isOggetto(v) || !isTesto(v.descrizione)) err(F, `condizioni_prerequisiti.${c}`, 'serve { descrizione, addestramento?, talenti?, sempre? }');
    else if (v.sempre !== undefined && v.sempre !== true) err(F, `condizioni_prerequisiti.${c}.sempre`, 'deve valere true (o mancare)');
    else {
      if (v.addestramento !== undefined && !addestramenti.includes(v.addestramento)) err(F, `condizioni_prerequisiti.${c}.addestramento`, `"${v.addestramento}" non è un Addestramento`);
      for (const id of v.talenti ?? []) if (!ids.has(id)) err(F, `condizioni_prerequisiti.${c}.talenti`, `"${id}" non è un Talento`);
    }
  }
  // un prerequisito è un Talento o una Specializzazione, una condizione, «addestramento:<nome>»; «non:» lo nega
  const esiste = (p) => {
    const base = p.startsWith('non:') ? p.slice(4) : p;
    if (base.startsWith('addestramento:')) return addestramenti.includes(base.slice('addestramento:'.length));
    return ids.has(base) || idSpec.has(base) || (!base.startsWith('_') && base in condizioni);
  };
  const sezioni = isOggetto(t.sezioni) ? t.sezioni : {};
  lista.forEach((x, i) => {
    if (!isOggetto(x)) return;
    const k = `talenti[${i}] (${x.nome})`;
    if (!(x.sezione in sezioni)) err(F, `${k}.sezione`, `sezione "${x.sezione}" non descritta in "sezioni"`);
    if (!['passivo', 'attivo'].includes(x.tipo) && !isTodo(x.tipo)) err(F, `${k}.tipo`, 'deve essere "passivo", "attivo" o "TODO(Davide)"');
    if (!isTesto(x.testo)) err(F, `${k}.testo`, 'testo mancante');
    if (Array.isArray(x.prerequisiti)) {
      x.prerequisiti.forEach((p) => { if (!esiste(p)) err(F, `${k}.prerequisiti`, `"${p}" non è un Talento, una Specializzazione, una condizione di «condizioni_prerequisiti» o un Addestramento`); });
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
      else for (const e of Object.keys(x.effetti)) {
        if (!EFFETTI_NOTI.has(e)) err(F, `${k}.effetti.${e}`, 'effetto sconosciuto al motore di calcolo');
        const tabella = e === 'magia' ? EFFETTI_MAGIA : e === 'meditazione' ? EFFETTI_MEDITAZIONE : null;
        if (!tabella) continue;
        for (const [c, v] of Object.entries(isOggetto(x.effetti[e]) ? x.effetti[e] : {})) {
          if (!(c in tabella)) err(F, `${k}.effetti.${e}.${c}`, 'effetto sconosciuto al motore di calcolo');
          else if (tabella[c] === 'numero' ? !isIntero(v) : v !== true) err(F, `${k}.effetti.${e}.${c}`, tabella[c] === 'numero' ? 'numero intero atteso' : 'deve valere true');
        }
      }
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
    // «Attiva» (§8.9.1, src/tecniche.js): costo in PM fisso, oppure una tabella di costi a scelta
    const opzioni = Array.isArray(x.opzioni_costo) ? x.opzioni_costo : null;
    if (opzioni) {
      if (!opzioni.length) err(F, `${k}.opzioni_costo`, 'tabella dei costi vuota');
      opzioni.forEach((o, j) => { if (!isIntero(o?.pm) || o.pm < 0 || !isTesto(o?.effetto)) err(F, `${k}.opzioni_costo[${j}]`, 'servono "pm" intero ≥ 0 ed "effetto"'); });
    } else if (!isIntero(x.costo_pm) || x.costo_pm < 0) err(F, `${k}.costo_pm`, 'costo in PM intero ≥ 0 (o "opzioni_costo")');
    if (!['round', 'tempo', 'istantanea'].includes(x.durata_tipo)) err(F, `${k}.durata_tipo`, 'atteso "round", "tempo" o "istantanea"');
    if (x.durata_tipo === 'round' && (!isIntero(x.durata_round) || x.durata_round < 0)) err(F, `${k}.durata_round`, 'numero di Round intero ≥ 0 (la durata finisce alla fine del Round R + N)');
  });
  const a = t.attivazione;
  if (!isOggetto(a)) err(F, 'attivazione', 'regole dell’attivazione (§8.9.1) mancanti');
  else if (!isTesto(a.stato_a_zero_pm)) err(F, 'attivazione.stato_a_zero_pm', 'id dello Stato a 0 PM (Svenuto) mancante');
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
    // §2.3 e Capitolo 3 (Giocatore del 29/09): ogni Abilità in una sola categoria di competenza
    const cc = regole?.competenze?.categorie ?? {};
    const comp = isOggetto(x.competenze) ? x.competenze : null;
    if (!comp) err(F, `${k}.competenze`, 'categorie di competenza mancanti (§2.3)');
    else {
      const viste = new Map();
      for (const [cat, lista] of Object.entries(comp)) {
        if (!(cat in cc)) { err(F, `${k}.competenze.${cat}`, `categoria "${cat}" non in regole.json → competenze (${Object.keys(cc).join(', ')})`); continue; }
        if (!Array.isArray(lista)) { err(F, `${k}.competenze.${cat}`, 'serve un elenco di Abilità'); continue; }
        if (lista.length !== cc[cat].numero) err(F, `${k}.competenze.${cat}`, `${cc[cat].nome}: attese ${cc[cat].numero} Abilità, trovate ${lista.length} (§2.3)`);
        for (const n of lista) {
          if (!nomiAbilita.has(n)) err(F, `${k}.competenze.${cat}`, `"${n}" non è un'Abilità esistente`);
          else if (viste.has(n)) err(F, `${k}.competenze.${cat}`, `"${n}" è già fra le ${cc[viste.get(n)]?.nome ?? viste.get(n)}: ogni Abilità sta in una sola categoria`);
          else viste.set(n, cat);
        }
      }
      for (const cat of Object.keys(cc)) if (!(cat in comp)) err(F, `${k}.competenze`, `manca la categoria ${cat} (${cc[cat].nome})`);
      for (const n of nomiAbilita) if (!viste.has(n)) err(F, `${k}.competenze`, `l'Abilità "${n}" non ha una categoria di competenza`);
    }

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
// penalita (armature, §7.11.4): { annulla: [campi], riduce: { campo: n } }
const EFFETTI_PROPRIETA = ['parata_va', 'va', 'penalita'];
// §7.20.1 e §7.20.9: famiglie di munizioni
const FAMIGLIE_MUNIZIONI = ['pistola', 'fucile', 'pesanti', 'pallini', 'frecce', 'dardi_balestra_piccola', 'dardi_balestra_grande', 'nimrod', 'combustibile'];
const CAMPI_PENALITA = ['attacchi_distanza', 'attacchi_ravvicinati', 'agilita', 'movimento_q', 'lancio_potere'];

let nomiAbilitaPenalita = null; // per validaPenalita: le Abilità esistenti
/**
 * Blocco «chroma» di regole.json (Magia sez. 6; Armamenti §7.5.1; Giocatore §3.9.5): colori con
 * energia e macrofamiglie esistenti, rapporti di conversione, Talenti esistenti, Prova per gruppi,
 * Addestramento richiesto.
 */
function validaChroma(dati, err) {
  const F = 'regole';
  const c = dati.regole.chroma;
  if (!isOggetto(c)) { err(F, 'chroma', 'oggetto mancante'); return; }
  const macro = new Set((dati.incantesimi?.incantesimi ?? []).map((i) => i.macrofamiglia));
  if (!isOggetto(c.colori) || !Object.keys(c.colori).length) err(F, 'chroma.colori', 'elenco dei colori mancante');
  else {
    for (const [nome, x] of Object.entries(c.colori)) {
      const K = `chroma.colori.${nome}`;
      if (!isTesto(x?.energia)) err(F, `${K}.energia`, 'energia mancante');
      if (!Array.isArray(x?.macrofamiglie)) err(F, `${K}.macrofamiglie`, 'lista (anche vuota) delle macrofamiglie alimentate');
      else for (const m of x.macrofamiglie) if (macro.size && !macro.has(m)) err(F, `${K}.macrofamiglie`, `"${m}" non è una macrofamiglia degli incantesimi`);
    }
    if (!Object.values(c.colori).some((x) => x?.esausto === true)) err(F, 'chroma.colori', 'manca il colore del contenitore esausto ("esausto": true, Trasparente)');
  }
  const cv = c.conversione;
  if (!isOggetto(cv)) { err(F, 'chroma.conversione', 'oggetto mancante'); return; }
  if (!isIntero(cv.rapporto_ordinario) || cv.rapporto_ordinario < 1) err(F, 'chroma.conversione.rapporto_ordinario', 'intero ≥ 1 mancante');
  for (const [nome, v] of Object.entries(cv.rapporti_fissi ?? {})) {
    if (!c.colori?.[nome]) err(F, `chroma.conversione.rapporti_fissi.${nome}`, 'colore inesistente');
    if (!isIntero(v) || v < 1) err(F, `chroma.conversione.rapporti_fissi.${nome}`, 'intero ≥ 1 atteso');
  }
  const talenti = new Set([
    ...(dati.talenti_liberi?.talenti ?? []).map((t) => t.nome),
    ...(dati.classi?.classi ?? []).flatMap((cl) => [...(cl.talenti_fissi ?? []), ...(cl.talenti_a_scelta ?? [])].map((t) => t.nome)),
  ]);
  if (!Array.isArray(cv.talenti_riduzione)) err(F, 'chroma.conversione.talenti_riduzione', 'lista dei Talenti mancante');
  else for (const t of cv.talenti_riduzione) if (!talenti.has(t)) err(F, 'chroma.conversione.talenti_riduzione', `"${t}" non è un Talento (Liberi o di Classe)`);
  const r = cv.rapporto_per_talenti;
  if (!Array.isArray(r) || r.length !== (cv.talenti_riduzione?.length ?? 0) + 1 || !r.every((x) => isIntero(x) && x >= 1) || r[0] !== cv.rapporto_ordinario || r.some((x, i) => i && x > r[i - 1])) {
    err(F, 'chroma.conversione.rapporto_per_talenti', 'un rapporto per 0, 1, … Talenti: il primo è quello ordinario, poi non crescente, interi ≥ 1');
  }
  if (!(dati.addestramenti?.addestramenti ?? []).some((a) => a.nome === cv.addestramento_richiesto)) err(F, 'chroma.conversione.addestramento_richiesto', `"${cv.addestramento_richiesto}" non è un Addestramento`);
  const pg = cv.prova_gruppi;
  if (!isOggetto(pg) || !isIntero(pg.automatici) || pg.automatici < 1 || !isOggetto(pg.penalita) || !isIntero(pg.per_gruppo_oltre)) {
    err(F, 'chroma.conversione.prova_gruppi', 'serve { automatici ≥ 1, penalita: {gruppi: VA}, per_gruppo_oltre }');
  } else {
    for (const [k, v] of Object.entries(pg.penalita)) if (!/^\d+$/.test(k) || Number(k) <= pg.automatici || !isIntero(v) || v > 0) err(F, `chroma.conversione.prova_gruppi.penalita.${k}`, 'numero di gruppi oltre quelli automatici, penalità intera ≤ 0');
  }
  if (!isIntero(c.contenitori_per_lancio) || c.contenitori_per_lancio < 1) err(F, 'chroma.contenitori_per_lancio', 'intero ≥ 1 mancante');
  if (!['pieno', 'vuoto'].includes(c.contenitore_nuovo)) err(F, 'chroma.contenitore_nuovo', 'deve essere "pieno" o "vuoto"');
  // Magia §26.2: riserve Batteria/Cariche, alimentazione Esclusiva/Universale, una fonte esterna per pagamento
  const R = c.riserve;
  if (!isOggetto(R)) { err(F, 'chroma.riserve', 'manca { tipi, alimentazioni, integrata_predefinita, proprieta_predefinita, fonti_esterne_per_pagamento }'); return; }
  for (const k of ['batteria', 'cariche']) if (!isOggetto(R.tipi?.[k]) || typeof R.tipi[k].fonte_per_pg !== 'boolean') err(F, `chroma.riserve.tipi.${k}`, 'serve { nome, fonte_per_pg: vero o falso, testo }');
  for (const k of ['esclusiva', 'universale']) if (!isOggetto(R.alimentazioni?.[k]) || !Array.isArray(R.alimentazioni[k].fonti) || !R.alimentazioni[k].fonti.every((x) => ['interna', 'personali', 'esterna'].includes(x))) err(F, `chroma.riserve.alimentazioni.${k}`, 'serve { nome, fonti: ["interna" | "personali" | "esterna"], testo }');
  if (!R.tipi?.[R.integrata_predefinita]) err(F, 'chroma.riserve.integrata_predefinita', `"${R.integrata_predefinita}" non è un tipo di riserva`);
  if (!R.alimentazioni?.[R.proprieta_predefinita]) err(F, 'chroma.riserve.proprieta_predefinita', `"${R.proprieta_predefinita}" non è un'alimentazione`);
  if (!isIntero(R.fonti_esterne_per_pagamento) || R.fonti_esterne_per_pagamento < 1) err(F, 'chroma.riserve.fonti_esterne_per_pagamento', 'intero ≥ 1 mancante');
}

/**
 * Dati della scheda digitale in regole.json: soglie delle barre di PV e PM («interfaccia») e
 * modalità di fuoco del §5.10 («modalita_di_fuoco»), con una voce per ogni sigla usata nel
 * catalogo. Nel catalogo, «effetto_breve» è un testo non vuoto.
 */
function validaSchedaDigitale(dati, err) {
  const F = 'regole';
  const b = dati.regole.interfaccia?.barre_pv_pm;
  const frazione = (v) => typeof v === 'number' && v >= 0 && v <= 1;
  if (!isOggetto(b) || !frazione(b.verde_sopra) || !frazione(b.rosso_sotto) || b.rosso_sotto >= b.verde_sopra) {
    err(F, 'interfaccia.barre_pv_pm', 'servono verde_sopra e rosso_sotto fra 0 e 1, con rosso_sotto < verde_sopra');
  }
  const mf = dati.regole.modalita_di_fuoco;
  if (!isOggetto(mf)) { err(F, 'modalita_di_fuoco', 'blocco mancante (§5.10)'); return; }
  for (const [sigla, m] of Object.entries(mf)) {
    if (sigla.startsWith('_')) continue;
    const K = `modalita_di_fuoco.${sigla}`;
    if (!isOggetto(m)) { err(F, K, 'oggetto atteso'); continue; }
    if (!isTesto(m.nome)) err(F, `${K}.nome`, 'nome esteso mancante');
    if (!isTesto(m.regola)) err(F, `${K}.regola`, 'testo della regola mancante');
    if (!isTesto(m.paragrafo)) err(F, `${K}.paragrafo`, 'paragrafo del manuale mancante');
    if (!isTesto(m.colpi_a_segno)) err(F, `${K}.colpi_a_segno`, 'come si determinano i colpi a segno');
    for (const c of ['colpi_consumati', 'azioni_principali']) if (!isIntero(m[c]) || m[c] < 1) err(F, `${K}.${c}`, 'intero ≥ 1 atteso');
    if (!isIntero(m.modificatore_va)) err(F, `${K}.modificatore_va`, 'intero atteso');
  }
  for (const [id, f] of Object.entries(dati.equipaggiamento?.file ?? {})) {
    (f.oggetti ?? []).forEach((o, i) => {
      for (const sigla of o.modalita ?? []) if (!isOggetto(mf[sigla])) err(`equipaggiamento/${id}`, `oggetti[${i}] (${o.nome}).modalita`, `la sigla "${sigla}" non ha una voce in regole.json → modalita_di_fuoco`);
      if (o.effetto_breve !== undefined && !isTesto(o.effetto_breve)) err(`equipaggiamento/${id}`, `oggetti[${i}] (${o.nome}).effetto_breve`, 'testo non vuoto atteso');
      if (o.effetti !== undefined) validaEffettiOggetto(o.effetti, `equipaggiamento/${id}`, `oggetti[${i}] (${o.nome})`, new Set((dati.abilita?.abilita ?? []).map((a) => a.nome)), err, ctxEffetti(dati));
    });
  }
}

function validaEquipaggiamento(eq, nomiAbilita, idSpec, err, coloriChroma = [], fontiCorruzione = []) {
  nomiAbilitaPenalita = nomiAbilita;
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
  const moduli = []; // [file, chiave, riferimento] di «modulo_di» (§7.8), controllati alla fine
  const rimandiMunizioni = []; // [file, chiave, riferimento] di «munizioni_armi» (§7.20.9)
  const rimandiArtefatti = []; // [file, chiave, riferimento] di «artefatti_catalogo» (§7.5.1)
  const artefattiDaControllare = []; // [file, chiave, dati] di Artefatto: potenza e costo (§7.10)
  let potenzeArtefatti = null;
  let sntSoloPassive = null; // §7.10: SnT degli Artefatti con sole proprietà passive
  const rimandiArmi = []; // [file, chiave, riferimento] di «sin_armi» (§7.15.1): devono essere armi
  // [file, chiave, riferimento, tipi ammessi] di «compatibile_con»: armature per gli accessori
  // (moduli IAS §7.15.4, soprabiti §7.11.2), armi per munizioni, celle e serbatoi (§7.20)
  const rimandiCompatibili = [];
  const tipoDi = new Map(); // rif → { tipo, modulo }
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
    // §7.10: regole di sintonizzazione e Artefatti di altri file
    if (f.sintonizzazione !== undefined) {
      const s = f.sintonizzazione;
      const cap = s?.capacita_per_gradi;
      if (!Array.isArray(cap) || cap.length !== 6 || cap.some((x, i) => !isIntero(x) || (i && x < cap[i - 1]))) err(F, 'sintonizzazione.capacita_per_gradi', 'sei interi non decrescenti (Gradi I–VI)');
      if (!isOggetto(s?.talento) || !isTesto(s.talento.nome) || !isIntero(s.talento.bonus)) err(F, 'sintonizzazione.talento', 'serve { nome, bonus }');
      if (!isOggetto(s?.potenze) || Object.values(s.potenze).some((x) => !isIntero(x) || x < 1)) err(F, 'sintonizzazione.potenze', 'serve { potenza: costo intero ≥ 1 }');
      else potenzeArtefatti = s.potenze;
      // Armamenti §7.10 (01/10 sera): «Un Artefatto con sole proprietà passive ha SnT 0, qualunque sia la sua potenza.»
      if (!isOggetto(s?.solo_passive) || !isIntero(s.solo_passive.snt) || s.solo_passive.snt < 0 || !Array.isArray(s.solo_passive.frasi)) err(F, 'sintonizzazione.solo_passive', 'serve { snt: intero ≥ 0, frasi: [...] , fonte }');
      else sntSoloPassive = s.solo_passive.snt;
    }
    for (const [j, a] of (f.artefatti_catalogo ?? []).entries()) {
      artefattiDaControllare.push([F, `artefatti_catalogo[${j}]`, a]);
      if (!isTesto(a?.rif)) err(F, `artefatti_catalogo[${j}].rif`, 'riferimento "file:id" mancante');
      else rimandiArtefatti.push([F, `artefatti_catalogo[${j}].rif`, a.rif]);
    }
    // §7.20.9: famiglia di munizioni delle armi balistiche
    if (f.munizioni_armi !== undefined) {
      if (!Array.isArray(f.munizioni_armi)) err(F, 'munizioni_armi', 'deve essere un elenco');
      else f.munizioni_armi.forEach((x, j) => {
        if (!isTesto(x?.rif)) err(F, `munizioni_armi[${j}].rif`, 'riferimento "file:id" mancante');
        else rimandiMunizioni.push([F, `munizioni_armi[${j}].rif`, x.rif]);
        if (!FAMIGLIE_MUNIZIONI.includes(x?.famiglia)) err(F, `munizioni_armi[${j}].famiglia`, `famiglia fra ${FAMIGLIE_MUNIZIONI.join(', ')}`);
      });
    }
    // §7.15.1: tabella SIN delle armi
    if (f.sin_armi !== undefined) {
      if (!Array.isArray(f.sin_armi)) err(F, 'sin_armi', 'deve essere un elenco');
      else f.sin_armi.forEach((x, j) => {
        const k = `sin_armi[${j}]`;
        if (!isTesto(x?.rif)) err(F, `${k}.rif`, 'riferimento "file:id" mancante');
        else rimandiArmi.push([F, `${k}.rif`, x.rif]);
        if (![1, 2].includes(x?.valore)) err(F, `${k}.valore`, 'SIN 1 o SIN 2 (§7.15.1: il bonus arriva fino a +2)');
        if (!isTesto(x?.prova)) err(F, `${k}.prova`, 'testo mancante (Prova a cui si applica)');
      });
    }
    // §7.8: «Munizioni di riferimento dei lanciatori» (dati della munizione, non del lanciatore)
    const nomiMunizioni = [];
    if (f.munizioni_riferimento !== undefined) {
      if (!Array.isArray(f.munizioni_riferimento)) err(F, 'munizioni_riferimento', 'deve essere un elenco');
      else f.munizioni_riferimento.forEach((m, j) => {
        const k = `munizioni_riferimento[${j}]${isTesto(m?.nome) ? ` (${m.nome})` : ''}`;
        if (!isTesto(m?.nome)) { err(F, k, 'nome mancante'); return; }
        nomiMunizioni.push(m.nome);
        if (!DADI.test(String(m.danno))) err(F, `${k}.danno`, `"${m.danno}" non è una formula di dadi`);
        if (!((isIntero(m.ac) && m.ac >= 1) || (typeof m.ac === 'string' && DADI.test(m.ac)))) err(F, `${k}.ac`, 'intero ≥ 1 o formula di dadi');
        if (!(isIntero(m.rs_q) && m.rs_q >= 0)) err(F, `${k}.rs_q`, 'raggio di scoppio in Q: intero ≥ 0');
        if (!Array.isArray(m.proprieta) || m.proprieta.some((x) => !isTesto(x))) err(F, `${k}.proprieta`, 'elenco di proprietà (anche vuoto)');
      });
    }

    const ids = new Set();
    f.oggetti.forEach((o, i) => {
      const k = `oggetti[${i}]${isTesto(o?.id) ? ` (${o.id})` : ''}`;
      if (!isOggetto(o)) { err(F, k, 'non è un oggetto'); return; }
      if (!isTesto(o.id) || !/^[a-z0-9-]+$/.test(o.id)) err(F, `${k}.id`, 'id mancante (minuscole, cifre e trattini)');
      else if (ids.has(o.id)) err(F, `${k}.id`, `id "${o.id}" ripetuto`);
      else { ids.add(o.id); rif.add(`${fileId}:${o.id}`); tipoDi.set(`${fileId}:${o.id}`, { tipo: o.tipo, modulo: o.modulo_di !== undefined }); }
      if (o.stesso_oggetto !== undefined) rimandi.push([F, `${k}.stesso_oggetto`, o.stesso_oggetto]);
      // §7.8: il modulo integrato non si compra da solo; PI, Qualità e MOV sono dell'arma principale
      const modulo = o.modulo_di !== undefined;
      if (modulo) {
        moduli.push([F, `${k}.modulo_di`, o.modulo_di]);
        for (const c of ['pi', 'reperibilita', 'costo']) if (o[c] !== null) err(F, `${k}.${c}`, 'un modulo integrato ha PI, reperibilità e costo dell’arma principale: deve essere null');
        if (o.tipo !== 'arma_distanza') err(F, `${k}.tipo`, 'un modulo integrato è un’arma a distanza');
      }
      for (const c of ['nome', 'catalogo', 'famiglia', 'paragrafo', 'versione_manuale']) if (!isTesto(o[c])) err(F, `${k}.${c}`, 'testo mancante');
      if (!TIPI_EQUIP.includes(o.tipo)) err(F, `${k}.tipo`, `tipo "${o.tipo}" non ammesso (${TIPI_EQUIP.join(', ')})`);
      if (!Array.isArray(o.nomi_alternativi) || o.nomi_alternativi.some((n) => !isTesto(n))) err(F, `${k}.nomi_alternativi`, 'elenco di nomi (anche vuoto)');
      if (o.note_manuale !== undefined && typeof o.note_manuale !== 'string') err(F, `${k}.note_manuale`, 'deve essere testo');
      numeroOpz(F, `${k}.pi`, o.pi, 0, 999, err);
      numeroOpz(F, `${k}.ps_int`, o.ps_int, 1, 30, err);
      if (o.peso !== undefined && o.peso !== null && !(typeof o.peso === 'number' && Number.isFinite(o.peso) && o.peso >= 0)) err(F, `${k}.peso`, 'peso in kg per unità: numero ≥ 0 (§1.6, §1.10)');
      numeroOpz(F, `${k}.costo`, o.costo, 0, 1e9, err);
      if (o.for_richiesta !== undefined && o.for_richiesta !== null && !(isIntero(o.for_richiesta) && o.for_richiesta >= 1 && o.for_richiesta <= 10)) {
        err(F, `${k}.for_richiesta`, `deve essere un intero da 1 a 10, trovato ${JSON.stringify(o.for_richiesta)}`);
      }
      // tabelle del manuale riportate con l'oggetto (regole di volo, esiti, configurazioni)
      if (o.tabelle !== undefined) {
        if (!Array.isArray(o.tabelle)) err(F, `${k}.tabelle`, 'deve essere un elenco');
        else o.tabelle.forEach((t, j) => {
          const kk = `${k}.tabelle[${j}]`;
          if (!isTesto(t?.titolo) || !Array.isArray(t?.colonne) || !t.colonne.length || !Array.isArray(t?.righe)) err(F, kk, 'serve { titolo, colonne, righe }');
          else t.righe.forEach((r, n) => { if (!Array.isArray(r) || r.length !== t.colonne.length) err(F, `${kk}.righe[${n}]`, `servono ${t.colonne.length} celle`); });
        });
      }
      if (o.artefatto !== undefined) artefattiDaControllare.push([F, `${k}.artefatto`, o.artefatto]);
      // §7.20: munizioni, esplosivi, celle e serbatoi
      if (o.munizione !== undefined) {
        const m = o.munizione;
        if (!isOggetto(m) || !FAMIGLIE_MUNIZIONI.includes(m.famiglia)) err(F, `${k}.munizione.famiglia`, `famiglia fra ${FAMIGLIE_MUNIZIONI.join(', ')}`);
        else if (!(isOggetto(m.confezione) && isIntero(m.confezione.quantita) && m.confezione.quantita >= 1 && isIntero(m.confezione.costo))) err(F, `${k}.munizione.confezione`, 'serve { quantita ≥ 1, costo }');
      }
      if (o.esplosivo !== undefined) {
        const x = o.esplosivo;
        // §7.20.3: la Fumogena non fa danno (danno e AC null)
        const senzaDanno = isOggetto(x) && x.danno === null && x.ac === null;
        if (!isOggetto(x) || !(senzaDanno || (DADI.test(String(x.danno)) && (isIntero(x.ac) || DADI.test(String(x.ac))))) || !(isIntero(x.rs_q) && x.rs_q >= 0) || !Array.isArray(x.proprieta)) err(F, `${k}.esplosivo`, 'serve { danno, ac, rs_q, proprieta } (danno e ac null per una granata senza danno)');
        // una granata che è anche arma da lancio (§7.20.3): esplosivo e lanciatori compatibili insieme
        if (o.tipo === 'arma_distanza' && !Array.isArray(o.compatibile_con)) err(F, `${k}.compatibile_con`, 'una granata da lancio con «esplosivo» indica i lanciatori compatibili');
      }
      // §7.20.3: confezione di più unità (granate da cinque, senza sconto)
      if (o.confezione !== undefined && !(isOggetto(o.confezione) && isIntero(o.confezione.quantita) && o.confezione.quantita >= 2 && isIntero(o.confezione.costo) && o.confezione.costo >= 0)) err(F, `${k}.confezione`, 'serve { quantita ≥ 2, costo }');
      // §7.20.5–7.20.6 (Armamenti 0.58): NEC Blu con riserva in Lx; la ricarica costa 0,01 cr/Lx (anche 2,5 cr)
      if (o.cella !== undefined && !(isOggetto(o.cella) && isIntero(o.cella.capacita) && o.cella.capacita >= 1 && ['cariche', 'colpi', 'getti'].includes(o.cella.unita)
        && Number.isFinite(o.cella.ricarica_costo) && o.cella.ricarica_costo >= 0 && (o.cella.riserva_lx === undefined || (isIntero(o.cella.riserva_lx) && o.cella.riserva_lx >= 1)))) {
        err(F, `${k}.cella`, 'serve { capacita ≥ 1, unita: cariche|colpi|getti, ricarica_costo ≥ 0, riserva_lx? intero ≥ 1 }');
      }
      // §7.19: equipaggiamento sanitario
      if (o.nome_applicazioni !== undefined && !['applicazioni', 'dosi', 'set', 'cartucce chirurgiche'].includes(o.nome_applicazioni)) err(F, `${k}.nome_applicazioni`, 'applicazioni, dosi, set o cartucce chirurgiche');
      // Equipaggiamento 0.5, cap. 6: numeri delle cure (src/equipaggiamento.js → testoCura)
      if (o.cura !== undefined) validaCura(F, `${k}.cura`, o.cura, err);
      // §6.8: postazioni medicochirurgiche
      if (o.postazione !== undefined) {
        const p = o.postazione;
        const prova = p?.prova?.tipo === 'operatore' ? isIntero(p.prova.bonus) : p?.prova?.tipo === 'ia' ? isIntero(p.prova.va) && p.prova.va > 0 : false;
        if (!isOggetto(p) || !isTesto(p.modello) || typeof p.mobile !== 'boolean' || !prova) err(F, `${k}.postazione`, 'serve { modello, mobile, prova: { tipo: "operatore", bonus } | { tipo: "ia", va } }');
        else if (!(isIntero(p.riserva_verde_giorni) && p.riserva_verde_giorni > 0 && isIntero(p.operazioni) && p.operazioni > 0 && isOggetto(p.alloggiamenti)
          && ['chirurgiche', 'farmacologiche', 'nutritive'].every((x) => isIntero(p.alloggiamenti[x]) && p.alloggiamenti[x] >= 0))) err(F, `${k}.postazione`, 'servono riserva_verde_giorni, operazioni e alloggiamenti { chirurgiche, farmacologiche, nutritive } interi');
      }
      if (o.strumenti !== undefined && !(isOggetto(o.strumenti) && isIntero(o.strumenti.va) && isTesto(o.strumenti.prova))) err(F, `${k}.strumenti`, 'serve { va, prova }');
      if (o.esiti !== undefined && !(isOggetto(o.esiti) && isTesto(o.esiti.successo) && isTesto(o.esiti.magistrale))) err(F, `${k}.esiti`, 'serve { successo, magistrale }');
      if (o.capacita_cartucce !== undefined && !(isIntero(o.capacita_cartucce) && o.capacita_cartucce >= 1)) err(F, `${k}.capacita_cartucce`, 'intero ≥ 1');
      if (o.effetto !== undefined && !isTesto(o.effetto)) err(F, `${k}.effetto`, 'testo');
      if (o.uno_per_personaggio !== undefined && !isTesto(o.uno_per_personaggio)) err(F, `${k}.uno_per_personaggio`, 'testo (gruppo)');
      // §7.19: applicazioni dei kit sanitari e ricarica
      if (o.applicazioni !== undefined && !(isIntero(o.applicazioni) && o.applicazioni >= 1)) err(F, `${k}.applicazioni`, 'intero ≥ 1');
      if (o.ricarica !== undefined && !(isOggetto(o.ricarica) && isIntero(o.ricarica.applicazioni) && isIntero(o.ricarica.costo))) err(F, `${k}.ricarica`, 'serve { applicazioni, costo }');
      // §7.3: accessori montati
      if (o.si_monta_su !== undefined && (!Array.isArray(o.si_monta_su) || !o.si_monta_su.length || o.si_monta_su.some((x) => !['arma_distanza', 'arma_ravvicinata', 'armatura', 'elmetto', 'mirino'].includes(x)))) {
        err(F, `${k}.si_monta_su`, 'elenco fra arma_distanza, arma_ravvicinata, armatura, elmetto, mirino');
      }
      if (o.gruppo_esclusivo !== undefined && !isTesto(o.gruppo_esclusivo)) err(F, `${k}.gruppo_esclusivo`, 'testo');
      // §7.11.2: kit di rinforzo
      if (o.rinforzo !== undefined && !(isOggetto(o.rinforzo) && ['Leggero', 'Pesante'].includes(o.rinforzo.kit) && isIntero(o.rinforzo.ar) && o.rinforzo.ar >= 1 && isIntero(o.rinforzo.for) && o.rinforzo.for >= 0)) {
        err(F, `${k}.rinforzo`, 'serve { kit: "Leggero"|"Pesante", ar ≥ 1, for ≥ 0 }');
      }
      if (o.mirino !== undefined) {
        const m = o.mirino;
        if (!isOggetto(m) || !(isIntero(m.riduzione) && m.riduzione >= 1) || !isTesto(m.testo)) err(F, `${k}.mirino`, 'serve { riduzione ≥ 1, distanza_max_q, azp_minime, testo }');
        else {
          if (m.distanza_max_q !== null && !(isIntero(m.distanza_max_q) && m.distanza_max_q >= 1)) err(F, `${k}.mirino.distanza_max_q`, 'intero ≥ 1 oppure null (gittata dell’arma)');
          if (m.azp_minime !== null && !(isIntero(m.azp_minime) && m.azp_minime >= 1)) err(F, `${k}.mirino.azp_minime`, 'intero ≥ 1 oppure null');
        }
      }
      if (o.effetto_arma !== undefined && !(isOggetto(o.effetto_arma) && isIntero(o.effetto_arma.va ?? 0) && isIntero(o.effetto_arma.danno ?? 0))) err(F, `${k}.effetto_arma`, 'serve { va, danno } interi');
      if (o.bonus_condizionato !== undefined && !(isOggetto(o.bonus_condizionato) && isIntero(o.bonus_condizionato.va) && isTesto(o.bonus_condizionato.condizione))) err(F, `${k}.bonus_condizionato`, 'serve { va, condizione }');
      if (o.tipo === 'accessorio') numeroOpz(F, `${k}.portata_q`, o.portata_q, 1, 999, err);
      if (o.innesto !== undefined && !INNESTI.includes(o.innesto)) err(F, `${k}.innesto`, `innesto sconosciuto (ammessi: ${INNESTI.join(', ')})`);
      if (o.richiede_innesto !== undefined && !INNESTI.includes(o.richiede_innesto)) err(F, `${k}.richiede_innesto`, `innesto sconosciuto (ammessi: ${INNESTI.join(', ')})`);
      // Equipaggiamento §7.1: impianti cibernetici, costo UMN all'installazione e servizio d'installazione
      if (o.tipo === 'impianto' && !(isIntero(o.umn) && o.umn >= 0 && o.umn <= 20)) err(F, `${k}.umn`, 'costo UMN dell’impianto: intero da 0 a 20 (Giocatore §5.21)');
      if (o.tipo !== 'impianto' && o.umn !== undefined) err(F, `${k}.umn`, 'solo per il tipo "impianto"');
      if (o.installazione_costo !== undefined && !(o.tipo === 'impianto' && isIntero(o.installazione_costo) && o.installazione_costo >= 0)) err(F, `${k}.installazione_costo`, 'crediti interi ≥ 0, solo per il tipo "impianto"');
      if (o.cartucce !== undefined && !(isIntero(o.cartucce) && o.cartucce >= 1)) err(F, `${k}.cartucce`, 'intero ≥ 1');
      // impianti attivabili («attivabile», docs/censimento-impianti.md): cariche (iniettori, §7.9), chip del Processore (§7.10,
      // durata in regole.json → impianti.chip), promemoria dell'Azione (§7.4, §7.8); frasi del manuale
      if (o.attivabile !== undefined) {
        const a = o.attivabile;
        if (o.tipo !== 'impianto' || !isOggetto(a) || !ATTIVAZIONI_IMPIANTO.includes(a.tipo)) err(F, `${k}.attivabile`, `solo per gli impianti: tipo fra ${ATTIVAZIONI_IMPIANTO.join(', ')}`);
        else {
          if (!isTesto(a.azione)) err(F, `${k}.attivabile.azione`, 'Azione richiesta (es. "1 AzP")');
          if (!Array.isArray(a.frasi) || !a.frasi.length || !a.frasi.every(isTesto)) err(F, `${k}.attivabile.frasi`, 'frasi del manuale (tools/verifica_frasi.mjs)');
          if (a.tipo === 'cariche' && !(isIntero(o.cartucce) && o.cartucce >= 1)) err(F, `${k}.cartucce`, 'le cariche dell’attivazione: intero ≥ 1');
          if (a.tipo === 'chip' && o.innesto !== 'processore') err(F, `${k}.attivabile`, 'il tipo "chip" è del Processore neurale (innesto "processore")');
        }
      }
      if (o.compatibile_con !== undefined) {
        if (!Array.isArray(o.compatibile_con) || !o.compatibile_con.length) err(F, `${k}.compatibile_con`, 'elenco di riferimenti "file:id"');
        else o.compatibile_con.forEach((r, j) => rimandiCompatibili.push([F, `${k}.compatibile_con[${j}]`, r, o.tipo === 'munizioni' || o.cella || o.esplosivo ? ['arma_ravvicinata', 'arma_distanza'] : ['armatura']]));
      }
      // §7.23.10: Abbinamenti ottimizzati, fra le armature compatibili del rinforzo
      if (o.abbinamento_ottimizzato !== undefined) {
        if (!o.rinforzo || !Array.isArray(o.abbinamento_ottimizzato) || !o.abbinamento_ottimizzato.length) err(F, `${k}.abbinamento_ottimizzato`, 'elenco di armature, solo per i rinforzi');
        else o.abbinamento_ottimizzato.forEach((r, j) => {
          rimandiCompatibili.push([F, `${k}.abbinamento_ottimizzato[${j}]`, r, ['armatura']]);
          if (o.compatibile_con && !o.compatibile_con.includes(r)) err(F, `${k}.abbinamento_ottimizzato[${j}]`, `"${r}" non è fra le armature compatibili del rinforzo`);
        });
      }
      if (o.reperibilita !== undefined && !(modulo && o.reperibilita === null) && !rep.includes(o.reperibilita)) err(F, `${k}.reperibilita`, `sigla "${o.reperibilita}" non in index.json (${rep.join(', ')})`);
      if (o.proprieta !== undefined) {
        if (!Array.isArray(o.proprieta)) err(F, `${k}.proprieta`, 'deve essere un elenco');
        else o.proprieta.forEach((p, j) => {
          if (!isTesto(p?.nome) || !isTesto(p?.testo)) err(F, `${k}.proprieta[${j}]`, 'servono nome e testo');
          if (p?.effetto !== undefined) {
            if (!isOggetto(p.effetto)) err(F, `${k}.proprieta[${j}].effetto`, 'deve essere un oggetto');
            else for (const [e, v] of Object.entries(p.effetto)) {
              if (!EFFETTI_PROPRIETA.includes(e)) err(F, `${k}.proprieta[${j}].effetto.${e}`, `effetto sconosciuto (ammessi: ${EFFETTI_PROPRIETA.join(', ')})`);
              else if (e === 'penalita') {
                const ok = isOggetto(v) && (v.annulla ?? []).every((c) => CAMPI_PENALITA.includes(c))
                  && Object.entries(v.riduce ?? {}).every(([c, x]) => CAMPI_PENALITA.includes(c) && isIntero(x) && x > 0);
                if (!ok) err(F, `${k}.proprieta[${j}].effetto.penalita`, `serve { annulla: [campi], riduce: { campo: intero > 0 } } con campi fra ${CAMPI_PENALITA.join(', ')}`);
              } else if (!isIntero(v)) err(F, `${k}.proprieta[${j}].effetto.${e}`, 'deve essere un numero intero');
            }
          }
        });
      }
      // risposta A.21: fonte di Corruzione passiva (regole.json → corruzione)
      if (o.corruzione_passiva !== undefined && !fontiCorruzione.includes(o.corruzione_passiva)) err(F, `${k}.corruzione_passiva`, `"${o.corruzione_passiva}" non è in regole.json → corruzione`);
      if (o.tipo === 'arma_ravvicinata' || o.tipo === 'arma_distanza') {
        if (!nomiAbilita.includes(o.abilita)) err(F, `${k}.abilita`, `Abilità "${o.abilita}" inesistente in abilita.json`);
        if (o.specializzazione !== undefined && o.specializzazione !== null && !idSpec.includes(o.specializzazione)) err(F, `${k}.specializzazione`, `Specializzazione "${o.specializzazione}" inesistente`);
        // risposta A.12: la Specializzazione dà solo il +1 VA (Danno calibrato)
        if (o.specializzazione_danno !== undefined && o.specializzazione_danno !== false) err(F, `${k}.specializzazione_danno`, 'ammesso solo false (la Specializzazione non dà il +1 danno)');
        // 0: arma da polso che non impegna la mano (Howler, §7.14.6)
        if (![0, 1, 2, '1/2'].includes(o.mani)) err(F, `${k}.mani`, 'deve essere 0 (da polso), 1, 2 oppure "1/2"');
        if (o.danno_da_munizione === true) {
          // §7.7: «Munizione» nella colonna Danno: il danno viene dalla munizione caricata
          if (o.danno !== null) err(F, `${k}.danno`, 'con "danno_da_munizione": true il danno deve essere null');
        } else if (o.nessun_danno === true) {
          // §7.14.7: la Granata fumogena non infligge danni
          if (o.danno !== null) err(F, `${k}.danno`, 'con "nessun_danno": true il danno deve essere null');
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
            if (nomiMunizioni.length && o.danno_da_munizione === true && !nomiMunizioni.includes(o.munizioni.riferimento)) {
              err(F, `${k}.munizioni.riferimento`, `"${o.munizioni.riferimento}" non è fra le munizioni_riferimento del file (${nomiMunizioni.join(', ')})`);
            }
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
        // §7.14.6: arma che protegge anche come Scudo (Rainy Dayer aperta)
        if (o.scudo_integrato !== undefined) {
          const s = o.scudo_integrato;
          if (!isOggetto(s) || !isTesto(s.condizione)) err(F, `${k}.scudo_integrato`, 'serve { condizione, ar, parata }');
          else {
            if (!(isOggetto(s.ar) && isIntero(s.ar.totale) && isIntero(s.ar.magica ?? 0))) err(F, `${k}.scudo_integrato.ar`, 'serve { totale, magica }');
            if (!(isOggetto(s.parata) && isIntero(s.parata.ravvicinata) && isIntero(s.parata.distanza))) err(F, `${k}.scudo_integrato.parata`, 'serve { ravvicinata, distanza } con modificatori interi');
          }
        }
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
      if (o.tipo === 'armatura') {
        // §7.11.2: kit di rinforzo compatibili
        if (o.rinforzi_ammessi !== undefined && (!Array.isArray(o.rinforzi_ammessi) || o.rinforzi_ammessi.some((r) => !['Leggero', 'Pesante'].includes(r)))) {
          err(F, `${k}.rinforzi_ammessi`, 'elenco di kit: "Leggero", "Pesante" (anche vuoto)');
        }
        // §7.14.2, §7.16.3: profilo a sistema spento delle armature servoassistite
        if (o.profili_alternativi !== undefined) {
          if (!Array.isArray(o.profili_alternativi)) err(F, `${k}.profili_alternativi`, 'deve essere un elenco');
          else o.profili_alternativi.forEach((a, j) => {
            const kk = `${k}.profili_alternativi[${j}]`;
            if (!isTesto(a?.condizione)) err(F, `${kk}.condizione`, 'testo mancante');
            if (a?.for_richiesta !== undefined && !(isIntero(a.for_richiesta) && a.for_richiesta >= 1 && a.for_richiesta <= 10)) err(F, `${kk}.for_richiesta`, 'intero da 1 a 10');
            if (a?.penalita !== undefined) validaPenalita(F, `${kk}.penalita`, a.penalita, err);
            if (a?.for_richiesta === undefined && a?.penalita === undefined && a?.ar === undefined) err(F, kk, 'un profilo alternativo cambia FOR, penalità o AR');
          });
        }
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
            // stato alternativo al tavolo (lama estratta delle Guardie Sacre, risposta A.10)
            if (a.stato !== undefined) {
              const st = a.stato;
              if (!isOggetto(st) || !isTesto(st.id) || !isTesto(st.nome) || !isTesto(st.nome_opposto) || !isTesto(st.costo)) err(F, `${k}.attacco.stato`, 'serve { id, nome, nome_opposto, danno, costo }');
              else if (!DADI.test(String(st.danno))) err(F, `${k}.attacco.stato.danno`, `"${st.danno}" non è una formula di dadi`);
            }
          }
        }
      }
    });
  }
  for (const [F, k, r] of rimandi) if (!rif.has(r)) err(F, k, `"${r}" non è un oggetto del catalogo (formato "file:id")`);
  for (const [F, k, r] of rimandiArmi) {
    const t = tipoDi.get(r);
    if (!t) err(F, k, `"${r}" non è un oggetto del catalogo (formato "file:id")`);
    else if (!['arma_ravvicinata', 'arma_distanza'].includes(t.tipo)) err(F, k, `"${r}" non è un'arma`);
  }
  for (const [F, k, r, tipi] of rimandiCompatibili) {
    const t = tipoDi.get(r);
    if (!t) err(F, k, `"${r}" non è un oggetto del catalogo (formato "file:id")`);
    else if (!tipi.includes(t.tipo)) err(F, k, `"${r}" non è ${tipi.includes('armatura') ? 'un\'armatura' : 'un\'arma'}`);
  }
  for (const [F, k, r] of rimandiArtefatti) if (!rif.has(r)) err(F, k, `"${r}" non è un oggetto del catalogo (formato "file:id")`);
  for (const [F, k, a] of artefattiDaControllare) {
    // Magia §26.5: Scheggia instabile, senza Grado né potenza, SnT 0, non sintonizzabile, con un contenitore
    if (isOggetto(a) && a.scheggia === true) {
      if (a.sintonizzazione !== 0 || a.sintonizzabile !== false || a.potenza !== undefined) err(F, k, 'una Scheggia instabile ha SnT 0, non è sintonizzabile e non ha potenza (Magia §26.5)');
      if (!isOggetto(a.contenitore) || !coloriChroma.includes(a.contenitore.energia) || !isIntero(a.contenitore.capacita_pm) || a.contenitore.integrato) err(F, `${k}.contenitore`, 'serve { energia, capacita_pm }, non integrato');
      continue;
    }
    if (!isOggetto(a) || !isTesto(a.tipologia) || !isTesto(a.potenza) || !isIntero(a.sintonizzazione)) { err(F, k, 'serve { tipologia, potenza, sintonizzazione, sintonizzabile, contenitore? }'); continue; }
    // Magia §24.2: proprietà infuse di un Artefatto del catalogo (Pietra della Vigilanza): incantesimo e livello
    if (a.infusi !== undefined && !(Array.isArray(a.infusi) && a.infusi.every((x) => isOggetto(x) && isTesto(x.incantesimo) && isIntero(x.livello)))) err(F, `${k}.infusi`, 'serve [{ incantesimo, livello }]');
    // §7.10: con almeno una proprietà attiva SnT della potenza e sintonizzazione; con sole passive SnT 0, senza
    if (typeof a.proprieta_attive !== 'boolean') err(F, `${k}.proprieta_attive`, 'true o false: con sole proprietà passive la SnT è 0 (§7.10)');
    if (a.proprieta_attive === false) {
      if (a.sintonizzabile !== false) err(F, `${k}.sintonizzabile`, 'con sole proprietà passive deve valere false (§7.10)');
      if (sntSoloPassive !== null && a.sintonizzazione !== sntSoloPassive) err(F, `${k}.sintonizzazione`, `con sole proprietà passive la SnT è ${sntSoloPassive} (§7.10), trovato ${a.sintonizzazione}`);
      if (a.contenitore !== undefined) err(F, `${k}.contenitore`, 'una riserva serve a proprietà attive: con sole passive non c’è (Magia §24.2)');
      continue;
    }
    if (a.sintonizzabile !== true) err(F, `${k}.sintonizzabile`, 'deve valere true: le proprietà attive richiedono sintonizzazione (§7.10)');
    if (a.riserva !== undefined) err(F, `${k}.riserva`, 'campo sostituito da "contenitore": { energia, capacita_pm, integrato? }');
    if (potenzeArtefatti && potenzeArtefatti[a.potenza] !== a.sintonizzazione) err(F, `${k}.sintonizzazione`, `potenza ${a.potenza}: il costo di sintonizzazione è ${potenzeArtefatti[a.potenza] ?? 'sconosciuto'} (§7.10), trovato ${a.sintonizzazione}`);
    // Magia sez. 6: contenitore di Chroma (colore di regole.json → chroma.colori, non l'esausto)
    if (a.contenitore !== undefined) {
      const c = a.contenitore;
      if (!isOggetto(c)) err(F, `${k}.contenitore`, 'serve { energia, capacita_pm, integrato? }');
      else {
        if (coloriChroma.length && !coloriChroma.includes(c.energia)) err(F, `${k}.contenitore.energia`, `"${c.energia}" non è un colore del Chroma (${coloriChroma.join(', ')})`);
        if (!isIntero(c.capacita_pm) || c.capacita_pm < 1) err(F, `${k}.contenitore.capacita_pm`, 'intero ≥ 1 atteso');
        if (c.integrato !== undefined && typeof c.integrato !== 'boolean') err(F, `${k}.contenitore.integrato`, 'vero o falso');
        // Magia §26.2: tipo di riserva e alimentazione delle proprietà (solo per le riserve integrate)
        if (c.riserva !== undefined && !['batteria', 'cariche'].includes(c.riserva)) err(F, `${k}.contenitore.riserva`, '"batteria" o "cariche"');
        if (c.alimentazione !== undefined && !['esclusiva', 'universale'].includes(c.alimentazione)) err(F, `${k}.contenitore.alimentazione`, '"esclusiva" o "universale"');
        if ((c.riserva !== undefined || c.alimentazione !== undefined) && c.integrato !== true) err(F, `${k}.contenitore`, 'riserva e alimentazione si indicano per le riserve integrate in un Artefatto');
        // Magia §26.4: Batteria Matrice (Matrice d'origine sulla voce, ricarica automatica)
        if (c.matrice !== undefined && c.matrice !== true) err(F, `${k}.contenitore.matrice`, 'solo true');
        for (const x of Object.keys(c)) if (!['energia', 'capacita_pm', 'integrato', 'riserva', 'alimentazione', 'matrice'].includes(x)) err(F, `${k}.contenitore.${x}`, 'campo sconosciuto');
      }
    }
  }
  for (const [F, k, r] of rimandiMunizioni) {
    const t = tipoDi.get(r);
    if (!t) err(F, k, `"${r}" non è un oggetto del catalogo (formato "file:id")`);
    else if (!['arma_ravvicinata', 'arma_distanza'].includes(t.tipo)) err(F, k, `"${r}" non è un'arma`);
  }
  for (const [F, k, r] of moduli) {
    const t = tipoDi.get(r);
    if (!t) err(F, k, `"${r}" non è un oggetto del catalogo (formato "file:id")`);
    else if (!['arma_ravvicinata', 'arma_distanza'].includes(t.tipo) || t.modulo) err(F, k, `"${r}" non è un'arma principale: un modulo si integra in un'arma che non è a sua volta un modulo`);
  }
}

function validaPenalita(F, k, p, err) {
  if (!isOggetto(p)) { err(F, k, 'deve essere un oggetto di penalità'); return; }
  for (const [c, v] of Object.entries(p)) {
    // penalità a singole Abilità (Furtività −2 dell'APE, §7.13.6)
    if (c === 'abilita') {
      if (!isOggetto(v) || Object.values(v).some((x) => !isIntero(x) || x > 0)) err(F, `${k}.abilita`, 'serve { Abilità: intero ≤ 0 }');
      else for (const a of Object.keys(v)) if (nomiAbilitaPenalita && !nomiAbilitaPenalita.includes(a)) err(F, `${k}.abilita.${a}`, `Abilità "${a}" inesistente`);
      continue;
    }
    if (!CAMPI_PENALITA.includes(c)) err(F, `${k}.${c}`, `penalità sconosciuta (ammesse: ${CAMPI_PENALITA.join(', ')})`);
    else if (!isIntero(v) || v > 0) err(F, `${k}.${c}`, 'deve essere un intero ≤ 0');
  }
}

function numeroOpz(F, k, v, min, max, err) {
  if (v === undefined || v === null) return;
  if (typeof v !== 'number' || !Number.isFinite(v)) err(F, k, `deve essere un numero, trovato ${JSON.stringify(v)}`);
  else if (v < min || v > max) err(F, k, `fuori intervallo (${min}–${max}): ${v}`);
}

// ---------------------------------------------------------------------------
// Nuclei Energetici Cromatici (Equipaggiamento 0.5, §5.4): catalogo (nec.json), caricatori e campo
// «alimentazione» degli oggetti; regole in regole.json → nec

const COLORI_NEC = ['Rosso', 'Blu', 'Verde'];
const FORMATI_NEC = ['compatto', 'standard', 'modulo', 'banco'];

function validaNec(dati, err) {
  const R = dati.regole?.nec;
  const FR = 'regole';
  const conAlimentazione = Object.values(dati.equipaggiamento.file).some((f) => (f?.oggetti ?? []).some((o) => o?.alimentazione !== undefined || o?.nec !== undefined));
  if (!isOggetto(R)) {
    if (conAlimentazione) err(FR, 'nec', 'regole dei NEC mancanti (Equipaggiamento §5.4): servono a ricarica e consumi');
    return;
  }
  if (!(Number.isFinite(R.tariffa_cr_per_lx) && R.tariffa_cr_per_lx > 0)) err(FR, 'nec.tariffa_cr_per_lx', 'serve la tariffa di ricarica in cr per Lx (§5.4.6)');
  for (const c of COLORI_NEC) {
    const x = R.colori?.[c];
    if (!(isOggetto(x) && isIntero(x.capacita_lx) && x.capacita_lx > 0 && isIntero(x.erogazione_lxh) && x.erogazione_lxh > 0)) err(FR, `nec.colori.${c}`, 'servono capacita_lx ed erogazione_lxh interi positivi (§5.4.1)');
  }
  for (const [u, passi] of Object.entries(R.passi_tavolo ?? {})) {
    if (!(Array.isArray(passi) && passi.length && passi.every((p) => isIntero(p) && p > 0))) err(FR, `nec.passi_tavolo.${u}`, 'elenco di passi interi positivi');
  }
  // catalogo
  const nec = new Map();
  for (const [fileId, f] of Object.entries(dati.equipaggiamento.file)) {
    for (const o of f?.oggetti ?? []) {
      if (o?.nec === undefined) continue;
      const F = `equipaggiamento/${fileId}`;
      const k = `oggetti (${o.id}).nec`;
      const n = o.nec;
      if (!(isOggetto(n) && COLORI_NEC.includes(n.colore) && FORMATI_NEC.includes(n.formato) && isIntero(n.celle) && n.celle >= 1
        && isIntero(n.capacita_lx) && n.capacita_lx > 0 && isIntero(n.erogazione_lxh) && n.erogazione_lxh > 0)) {
        err(F, k, `serve { colore: ${COLORI_NEC.join('|')}, formato: ${FORMATI_NEC.join('|')}, celle ≥ 1, capacita_lx, erogazione_lxh } (§5.4.4)`);
        continue;
      }
      // §5.4.6: «La tariffa ordinaria è 0,01 cr per Lx ripristinato»
      const attesa = Math.round(n.capacita_lx * R.tariffa_cr_per_lx * 100) / 100;
      if (o.ricarica_costo !== attesa) err(F, `oggetti (${o.id}).ricarica_costo`, `con ${n.capacita_lx} Lx a ${R.tariffa_cr_per_lx} cr/Lx la ricarica completa costa ${attesa} cr, trovato ${JSON.stringify(o.ricarica_costo)}`);
      nec.set(`${fileId}:${o.id}`, o);
    }
  }
  for (const [fileId, f] of Object.entries(dati.equipaggiamento.file)) {
    for (const o of f?.oggetti ?? []) {
      const F = `equipaggiamento/${fileId}`;
      if (o?.caricatore !== undefined && !(isOggetto(o.caricatore) && isTesto(o.caricatore.formato) && isIntero(o.caricatore.trasferimento_lxh) && o.caricatore.trasferimento_lxh > 0)) {
        err(F, `oggetti (${o.id}).caricatore`, 'serve { formato, trasferimento_lxh } (§5.4.6)');
      }
      if (o?.alimentazione === undefined) continue;
      // un oggetto o, con più NEC (postazioni medicochirurgiche: Rosso e Verdi, §6.8.3), un elenco
      const elenco = Array.isArray(o.alimentazione) ? o.alimentazione : [o.alimentazione];
      if (!elenco.length) err(F, `oggetti (${o.id}).alimentazione`, 'elenco vuoto');
      elenco.forEach((a, j) => {
      const k = `oggetti (${o.id}).alimentazione${Array.isArray(o.alimentazione) ? `[${j}]` : ''}`;
      if (!isOggetto(a)) { err(F, k, 'non è un oggetto'); return; }
      if (a.moduli !== undefined && !(isIntero(a.moduli) && a.moduli >= 1)) err(F, `${k}.moduli`, 'intero ≥ 1 (numero di Moduli compresi)');
      if (a.nec !== null && !nec.has(a.nec)) err(F, `${k}.nec`, `"${a.nec}" non è un NEC del catalogo (nec.json); per un NEC dedicato: nec null e «descrizione»`);
      if (a.nec === null && !isTesto(a.descrizione)) err(F, `${k}.descrizione`, 'un NEC dedicato (nec: null) richiede la descrizione');
      // §5.4.2: «La scheda riporta ore oppure cariche»
      const conOre = a.autonomia_ore !== undefined;
      const conUsi = a.usi !== undefined;
      if (!conOre && !conUsi) err(F, k, 'serve autonomia_ore oppure usi (§5.4.2)');
      if (conOre && !(isIntero(a.autonomia_ore) && a.autonomia_ore > 0)) err(F, `${k}.autonomia_ore`, 'intero positivo');
      if (conUsi && !(isIntero(a.usi) && a.usi > 0 && isTesto(a.unita_usi) && isIntero(a.lx_per_uso) && a.lx_per_uso > 0)) err(F, k, 'con «usi» servono usi, unita_usi e lx_per_uso');
      if (a.consumo_lxh !== undefined && !(isIntero(a.consumo_lxh) && a.consumo_lxh > 0)) err(F, `${k}.consumo_lxh`, 'intero positivo');
      if (a.componenti !== undefined && !(Array.isArray(a.componenti) && a.componenti.length >= 2 && a.componenti.every(isTesto))) err(F, `${k}.componenti`, 'almeno due nomi di componente');
      if (a.esterna !== undefined && a.esterna !== true) err(F, `${k}.esterna`, 'solo true (il NEC non è compreso)');
      if (!isTesto(a.paragrafo)) err(F, `${k}.paragrafo`, 'paragrafo del manuale mancante');
      // il NEC del catalogo deve bastare: «l’autonomia in ore è la carica residua divisa per il consumo» (§5.4.2)
      const n = nec.get(a.nec)?.nec;
      if (n && conOre && isIntero(a.consumo_lxh) && n.capacita_lx / a.consumo_lxh < a.autonomia_ore) err(F, k, `${a.autonomia_ore} ore a ${a.consumo_lxh} Lx/h superano i ${n.capacita_lx} Lx di ${a.nec}`);
      if (n && isIntero(a.consumo_lxh) && n.erogazione_lxh < a.consumo_lxh && a.esterna !== true) err(F, k, `${a.nec} eroga ${n.erogazione_lxh} Lx/h, meno dei ${a.consumo_lxh} richiesti (§5.4.2)`);
      // usi contati: la carica dei Moduli compresi deve bastare
      if (n && conUsi && isIntero(a.lx_per_uso) && a.usi * a.lx_per_uso > n.capacita_lx * (a.moduli ?? 1)) err(F, k, `${a.usi} ${a.unita_usi} da ${a.lx_per_uso} Lx superano la carica di ${a.moduli ?? 1} × ${a.nec}`);
      });
    }
  }
}

// Equipaggiamento 0.5, cap. 6 e Giocatore §5.16: campo «cura» degli oggetti sanitari
const DADO_CURA = /^\d+d\d+$/;
function validaCura(F, k, c, err) {
  if (!isOggetto(c)) return err(F, k, 'oggetto atteso');
  if (!isTesto(c.fonte)) err(F, `${k}.fonte`, 'paragrafo del manuale mancante');
  if (c.pv !== undefined && !DADO_CURA.test(String(c.pv))) err(F, `${k}.pv`, 'dado dei PV recuperati (es. "1d6")');
  if (c.sanguinamento !== undefined && !['sospende', 'arresta'].includes(c.sanguinamento)) err(F, `${k}.sanguinamento`, '"sospende" o "arresta"');
  if (c.sanguinamento === 'sospende' && !(isIntero(c.round) && c.round > 0)) err(F, `${k}.round`, 'la sospensione dura un numero di Round');
  if (c.ferita_stati !== undefined && !(isIntero(c.ferita_stati) && c.ferita_stati > 0)) err(F, `${k}.ferita_stati`, 'intero positivo');
  if (c.durate !== undefined && !(Array.isArray(c.durate) && c.durate.every((x) => isTesto(x?.stato) && isIntero(x.minuti) && x.minuti > 0 && isTesto(x.esito)))) err(F, `${k}.durate`, 'elenco di { stato, minuti, esito }');
  if (c.intervallo_ore !== undefined && !(isIntero(c.intervallo_ore) && c.intervallo_ore > 0)) err(F, `${k}.intervallo_ore`, 'intero positivo');
  if (c.procedure !== undefined && !(Array.isArray(c.procedure) && c.procedure.every((x) => isTesto(x?.nome) && isTesto(x.tempo) && isTesto(x.effetto)))) err(F, `${k}.procedure`, 'elenco di { nome, tempo, effetto }');
  if (c.degenza_giorni_per_stato !== undefined && !(isIntero(c.degenza_giorni_per_stato) && c.degenza_giorni_per_stato > 0)) err(F, `${k}.degenza_giorni_per_stato`, 'intero positivo');
  if (c.azp !== undefined && !(isIntero(c.azp) && c.azp > 0)) err(F, `${k}.azp`, 'intero positivo');
  if (c.prova !== undefined && c.prova !== false && !isTesto(c.prova)) err(F, `${k}.prova`, 'false (senza Prova) oppure la Prova');
  for (const b of ['senza_sanguinamento', 'tentativo_settimanale']) if (c[b] !== undefined && typeof c[b] !== 'boolean') err(F, `${k}.${b}`, 'true o false');
}

// ---------------------------------------------------------------------------
// Equipaggiamento iniziale (data/dotazioni.json, Giocatore §2.16, E&L A.5–A.5.29)

// Giocatore §5.21 e Equipaggiamento §7.1: Umanità, fasce e impianti; rif_sostituiti dell'indice
function validaUmanita(dati, err) {
  const FR = 'regole';
  const conImpianti = Object.values(dati.equipaggiamento.file).some((f) => (f?.oggetti ?? []).some((o) => o?.tipo === 'impianto'));
  const U = dati.regole?.umanita;
  if (!isOggetto(U)) {
    if (conImpianti) err(FR, 'umanita', 'regole dell’Umanità mancanti (Giocatore §5.21): servono agli impianti');
  } else {
    if (!(isIntero(U.minimo) && isIntero(U.massimo) && U.minimo < U.massimo)) err(FR, 'umanita.minimo', 'minimo e massimo interi, minimo < massimo');
    if (!(isIntero(U.iniziale) && U.iniziale >= U.minimo && U.iniziale <= U.massimo)) err(FR, 'umanita.iniziale', 'intero fra minimo e massimo');
    if (!isIntero(U.pm_minimo) || !isIntero(U.sintonizzazione_minimo)) err(FR, 'umanita.pm_minimo', 'pm_minimo e sintonizzazione_minimo interi');
    const fasce = Array.isArray(U.fasce) ? U.fasce : [];
    if (!fasce.length) err(FR, 'umanita.fasce', 'elenco delle fasce del §5.21 mancante');
    const coperti = new Map();
    fasce.forEach((f, i) => {
      const k = `umanita.fasce[${i}]`;
      if (!(isOggetto(f) && isIntero(f.min) && isIntero(f.max) && f.min <= f.max && isTesto(f.condizione))) return err(FR, k, 'serve { min ≤ max, condizione }');
      for (const c of ['pm_massimi', 'ps_magia_corruzione', 'sintonizzazione']) if (!(isIntero(f[c]) && f[c] <= 0)) err(FR, `${k}.${c}`, 'modificatore intero ≤ 0');
      for (let v = f.min; v <= f.max; v++) {
        if (coperti.has(v)) err(FR, k, `UMN ${v} è già nella fascia ${coperti.get(v)}`);
        coperti.set(v, i);
      }
    });
    if (fasce.length && isIntero(U.minimo) && isIntero(U.massimo)) {
      const mancanti = [];
      for (let v = U.minimo; v <= U.massimo; v++) if (!coperti.has(v)) mancanti.push(v);
      if (mancanti.length) err(FR, 'umanita.fasce', `valori di UMN senza fascia: ${mancanti.join(', ')}`);
    }
  }
  const I = dati.regole?.impianti;
  if (conImpianti && !isOggetto(I)) err(FR, 'impianti', 'regole degli impianti mancanti (Equipaggiamento §7.1)');
  else if (isOggetto(I)) {
    if (I.stato_installato !== 'installato') err(FR, 'impianti.stato_installato', '"installato" atteso');
    const c = I.chip;
    if (!(isOggetto(c) && isIntero(c.attivi_massimo) && c.attivi_massimo >= 1 && INNESTI.includes(c.innesto))) err(FR, 'impianti.chip', `serve { attivi_massimo ≥ 1, innesto fra ${INNESTI.join(', ')} }`);
  }
  // rif sostituiti: la voce nuova deve esistere, la vecchia non più
  const FI = 'equipaggiamento/index';
  const sost = dati.equipaggiamento.indice?.rif_sostituiti;
  if (sost === undefined) return;
  if (!isOggetto(sost)) return err(FI, 'rif_sostituiti', 'oggetto { "file:id vecchio": { rif, stati? } } atteso');
  const trova = (r) => {
    const [f, id] = String(r).split(':');
    return (dati.equipaggiamento.file[f]?.oggetti ?? []).find((o) => o.id === id);
  };
  for (const [vecchio, v] of Object.entries(sost)) {
    const k = `rif_sostituiti["${vecchio}"]`;
    if (trova(vecchio)) err(FI, k, `"${vecchio}" è ancora nel catalogo`);
    const nuovo = isOggetto(v) ? trova(v.rif) : null;
    if (!nuovo) { err(FI, `${k}.rif`, `"${v?.rif}" non è nel catalogo`); continue; }
    for (const [da, a] of Object.entries(v.stati ?? {})) {
      if (!(STATI[nuovo.tipo] ?? []).includes(a)) err(FI, `${k}.stati.${da}`, `"${a}" non è uno stato del tipo "${nuovo.tipo}"`);
    }
  }
}

function validaDotazioni(dati, err) {
  const F = 'dotazioni';
  const d = dati.dotazioni;
  const cat = new Map();
  for (const [id, f] of Object.entries(dati.equipaggiamento?.file ?? {})) for (const o of f?.oggetti ?? []) cat.set(`${id}:${o.id}`, o);
  const registro = isOggetto(d.oggetti_dotazione) ? d.oggetti_dotazione : {};
  const sotto = isOggetto(d.sotto_scelte) ? d.sotto_scelte : {};
  const nomiAbilita = new Set((dati.abilita?.abilita ?? []).map((a) => a?.nome));
  if (!isOggetto(d.oggetti_dotazione)) err(F, 'oggetti_dotazione', 'registro degli oggetti non a catalogo mancante');
  for (const [id, o] of Object.entries(registro)) {
    const K = `oggetti_dotazione.${id}`;
    if (!isTesto(o?.nome)) err(F, `${K}.nome`, 'nome mancante');
    if (o?.sostituisce !== undefined && !(o.sostituisce in registro)) err(F, `${K}.sostituisce`, `"${o.sostituisce}" non è un oggetto di dotazione`);
    if (o?.sotto !== undefined && !isOggetto(sotto[o.sotto])) err(F, `${K}.sotto`, `"${o.sotto}" non è in sotto_scelte`);
    if (o?.effetti !== undefined) validaEffettiOggetto(o.effetti, F, K, nomiAbilita, err, ctxEffetti(dati));
    // scheda di catalogo collegata (Equipaggiamento 0.3): deve esistere; peso ed effetti vengono da lì
    if (o?.rif !== undefined && !cat.has(o.rif)) err(F, `${K}.rif`, `"${o.rif}" non esiste nel catalogo (data/equipaggiamento/)`);
    // A.65: una scheda per ogni valore della sotto-scelta (corredo agricolo, strumento musicale)
    if (o?.rif_per_sotto !== undefined) {
      const valori = sotto[o.sotto]?.valori ?? [];
      if (!isOggetto(o.rif_per_sotto) || o.rif !== undefined) err(F, `${K}.rif_per_sotto`, 'oggetto { valore della sotto-scelta: rif }, senza «rif»');
      else for (const [v, r] of Object.entries(o.rif_per_sotto)) {
        if (!valori.includes(v)) err(F, `${K}.rif_per_sotto.${v}`, `"${v}" non è un valore di sotto_scelte.${o.sotto}`);
        if (!cat.has(r)) err(F, `${K}.rif_per_sotto.${v}`, `"${r}" non esiste nel catalogo`);
      }
    }
    if (o?.rif !== undefined && (o.effetti !== undefined || o.peso !== undefined)) err(F, K, 'con «rif» peso ed effetti vengono dalla scheda di catalogo: niente «peso» o «effetti» qui');
    for (const k of ['peso', 'costo']) if (o?.[k] !== undefined && !(typeof o[k] === 'number' && o[k] >= 0)) err(F, `${K}.${k}`, 'numero ≥ 0 atteso (senza il campo: «da definire»)');
  }
  for (const [i, rif] of (d.corporativi?.commerciali ?? []).entries()) if (!cat.has(rif)) err(F, `corporativi.commerciali[${i}]`, `"${rif}" non esiste nel catalogo`);
  // un oggetto: { rif } del catalogo oppure { dotazione } del registro
  const controllaOggetto = (x, K) => {
    if (!isOggetto(x)) return err(F, K, 'oggetto atteso');
    if (x.quantita !== undefined && (!isIntero(x.quantita) || x.quantita < 1)) err(F, `${K}.quantita`, 'intero ≥ 1 atteso');
    if (x.rif !== undefined) {
      if (!cat.has(x.rif)) err(F, `${K}.rif`, `"${x.rif}" non esiste nel catalogo (data/equipaggiamento/)`);
    } else if (!(x.dotazione in registro)) err(F, `${K}.dotazione`, `"${x.dotazione}" non è in oggetti_dotazione`);
  };
  if (!Array.isArray(d.comune?.oggetti) || !d.comune.oggetti.length) err(F, 'comune.oggetti', 'dotazione comune mancante (§2.16.1)');
  else d.comune.oggetti.forEach((x, i) => controllaOggetto(x, `comune.oggetti[${i}]`));

  const classi = isOggetto(d.classi) ? d.classi : {};
  for (const c of dati.classi?.classi ?? []) {
    if (isTesto(c?.nome) && !isOggetto(classi[c.nome])) err(F, `classi.${c.nome}`, `la Classe ${c.nome} non ha una dotazione iniziale (§2.16)`);
  }
  const nomiClassi = new Set((dati.classi?.classi ?? []).map((c) => c?.nome));
  for (const [nome, c] of Object.entries(classi)) {
    const K = `classi.${nome}`;
    if (!nomiClassi.has(nome)) err(F, K, `"${nome}" non è una Classe di classi.json`);
    if (!Array.isArray(c?.gruppi) || !c.gruppi.length) { err(F, `${K}.gruppi`, 'nessun gruppo di scelta'); continue; }
    const ids = new Set();
    c.gruppi.forEach((g, i) => {
      const KG = `${K}.gruppi[${i}]`;
      if (!isTesto(g?.id) || ids.has(g.id)) err(F, `${KG}.id`, 'id mancante o ripetuto');
      ids.add(g?.id);
      if (!isTesto(g?.testo)) err(F, `${KG}.testo`, 'testo del manuale mancante');
      if (!Array.isArray(g?.opzioni) || !g.opzioni.length) return err(F, `${KG}.opzioni`, 'nessuna opzione');
      const idOp = new Set();
      g.opzioni.forEach((o, j) => {
        const KO = `${KG}.opzioni[${j}] (${o?.nome})`;
        if (!isTesto(o?.id) || idOp.has(o.id)) err(F, `${KO}.id`, 'id mancante o ripetuto nel gruppo');
        idOp.add(o?.id);
        if (!Array.isArray(o?.oggetti) || !o.oggetti.length) return err(F, `${KO}.oggetti`, 'nessun oggetto');
        o.oggetti.forEach((x, k) => controllaOggetto(x, `${KO}.oggetti[${k}]`));
        // §2.16: il requisito di FOR scritto nel manuale deve coincidere con il catalogo;
        // una discrepanza si accetta solo con un TODO(Davide) nell'opzione
        if (o.for_dichiarata !== undefined) {
          const r = cat.get(o.oggetti[0].rif)?.for_richiesta;
          const todo = Object.keys(o).some((k) => k.startsWith('TODO('));
          if (!isIntero(o.for_dichiarata)) err(F, `${KO}.for_dichiarata`, 'intero atteso');
          else if (r !== o.for_dichiarata && !todo) err(F, `${KO}.for_dichiarata`, `il §2.16 dichiara FOR ${o.for_dichiarata}, il catalogo FOR ${r ?? '—'}: correggere o aggiungere un "TODO(Davide)"`);
        }
        if (o.munizioni !== undefined) {
          const m = o.munizioni;
          if (!cat.has(m?.rif)) err(F, `${KO}.munizioni.rif`, `"${m?.rif}" non esiste nel catalogo`);
          else if (!cat.get(m.rif).munizione) err(F, `${KO}.munizioni.rif`, `"${m.rif}" non è una munizione`);
          if (!isIntero(m?.colpi) || m.colpi < 1) err(F, `${KO}.munizioni.colpi`, 'intero ≥ 1 atteso');
        }
        if (o.segue !== undefined) {
          const altro = c.gruppi.find((x) => x?.id === o.segue?.gruppo);
          if (!altro) err(F, `${KO}.segue.gruppo`, `nessun gruppo "${o.segue?.gruppo}" nella Classe`);
          else if (!altro.opzioni?.some((x) => x?.id === o.segue.opzione)) err(F, `${KO}.segue.opzione`, `nessuna opzione "${o.segue.opzione}" nel gruppo ${altro.id}`);
        }
      });
    });
  }
  // catalogo di ogni Corporazione: serve agli abbinamenti (§2.16.27) e agli acquisti (§2.16.29)
  const cataloghi = new Set([...cat.values()].map((o) => o.catalogo));
  for (const c of dati.corporazioni?.corporazioni ?? []) {
    const nome = d.cataloghi_corporazioni?.[c?.nome];
    if (!cataloghi.has(nome)) err(F, `cataloghi_corporazioni.${c?.nome}`, `manca il catalogo della Corporazione (trovato ${JSON.stringify(nome)}; cataloghi: ${[...cataloghi].join(', ')})`);
  }
  if (!isOggetto(d.corporativi?.abbinamenti)) err(F, 'corporativi.abbinamenti', 'oggetto { Corporazione: { rif commerciale: { rif } } } atteso (§2.16.27)');
  else {
    const nomiCorp = new Set((dati.corporazioni?.corporazioni ?? []).map((c) => c?.nome));
    for (const [corp, ab] of Object.entries(d.corporativi.abbinamenti)) {
      if (!nomiCorp.has(corp)) err(F, `corporativi.abbinamenti.${corp}`, `"${corp}" non è una Corporazione`);
      for (const [com, x] of Object.entries(ab ?? {})) {
        if (!cat.has(com)) err(F, `corporativi.abbinamenti.${corp}.${com}`, 'il profilo commerciale non esiste nel catalogo');
        if (!cat.has(x?.rif)) err(F, `corporativi.abbinamenti.${corp}.${com}.rif`, `"${x?.rif}" non esiste nel catalogo`);
        if (x?.munizioni !== undefined && !cat.has(x.munizioni)) err(F, `corporativi.abbinamenti.${corp}.${com}.munizioni`, `"${x.munizioni}" non esiste nel catalogo`);
      }
    }
  }
  const v = d.scambio?.valutazione_cessione;
  if (typeof v !== 'number' || v < 0 || v > 1) err(F, 'scambio.valutazione_cessione', 'frazione del prezzo fra 0 e 1 attesa (§2.16.29)');
}

// Effetti degli oggetti (docs/effetti-oggetti.md): catalogo e oggetti di dotazione. Tipi: va
// (Abilità), attacco, danno, iniziativa, salvezza, caratteristica, contromisura, ar_contro, ar, movimento
// (Q in più al Movimento: gambe potenziate, Equipaggiamento §7.5).
// Equipaggiamento §7.3, §7.10: innesti che altri oggetti richiedono (SIN, chip)
const INNESTI = ['interfaccia_neurale', 'processore'];
const AMBITI_EFFETTO = ['generale', 'situazionale', 'uso_specifico'];
const TIPI_EFFETTO = {
  va: null, attacco: null, danno: null, iniziativa: 'generale', salvezza: 'uso_specifico',
  caratteristica: 'uso_specifico', contromisura: 'generale', ar_contro: 'generale', ar: null, movimento: 'generale',
};
// «senz_armi»: solo i pugni («Senz'armi» in «Attacca!»); «contatto_incantesimi»: Prove per colpire in corpo a
// corpo richieste dagli Incantesimi (Guanti da Combattimento Mistico, Armamenti §7.24)
// impianti attivabili (impianti.json → attivabile, src/impianti.js)
const ATTIVAZIONI_IMPIANTO = ['cariche', 'chip', 'promemoria'];
const ATTACCHI_EFFETTO = ['tutti', 'ravvicinati', 'distanza', 'senz_armi', 'contatto_incantesimi'];
// Talenti (docs/censimento-talenti.md): in più il tipo «parata», le Salvezze anche generali o
// situazionali (Scudo Spirituale), «resistenza», il danno per le armi Artefatto e la scelta del
// giocatore («{parametro}», «{annotazione}»)
const TIPI_EFFETTO_TALENTO = {
  ...TIPI_EFFETTO, attacco: 'generale', salvezza: null, parata: 'generale', danno: null, dado_danno: null, cura: null, massimizza: null,
  // riduzione della penalità al VA di uno Stato (Combattere alla Cieca, Sangue Freddo); riduzione della
  // penalità MOV di armatura e scudo (Assalto Armato)
  riduzione_stato: null, movimento_armatura: 'generale',
};
// Talenti di lancio (src/lancio.js): a quali Incantesimi valgono
const INCANTESIMI_EFFETTO = ['offensivi', 'area', 'cura', 'cura_ferite_contatto', 'danno_o_cura'];
function validaEffettiOggetto(effetti, F, K, nomiAbilita, err, ctx = {}) {
  const lista = ctx.chiave ?? `${K}.effetti`;
  if (!Array.isArray(effetti)) return err(F, lista, 'lista attesa');
  const TIPI = ctx.talento ? TIPI_EFFETTO_TALENTO : TIPI_EFFETTO;
  effetti.forEach((e, j) => {
    const KE = `${lista}[${j}]`;
    if (!isOggetto(e)) return err(F, KE, 'oggetto atteso');
    const tipo = e.tipo ?? 'va';
    if (!(tipo in TIPI)) err(F, `${KE}.tipo`, `uno fra ${Object.keys(TIPI).join(', ')}`);
    if (tipo === 'va' && !nomiAbilita.has(e.abilita)) err(F, `${KE}.abilita`, `"${e.abilita}" non è un'Abilità di abilita.json`);
    if (tipo !== 'va' && e.abilita !== undefined) err(F, `${KE}.abilita`, 'solo per il tipo "va"');
    if (TIPI[tipo] && e.ambito !== TIPI[tipo]) err(F, `${KE}.ambito`, `il tipo "${tipo}" ha ambito "${TIPI[tipo]}"`);
    if ((tipo === 'attacco' || tipo === 'danno') && e.incantesimi === undefined && !ATTACCHI_EFFETTO.includes(e.attacchi)) err(F, `${KE}.attacchi`, `uno fra ${ATTACCHI_EFFETTO.join(', ')}`);
    // il danno e l'attacco degli oggetti: generali, o situazionali con la casella in «Attacca!» (Braccio potenziato, §7.5)
    if ((tipo === 'danno' || tipo === 'attacco') && e.incantesimi === undefined && e.ambito === 'uso_specifico') err(F, `${KE}.ambito`, 'danno e attacco: generale o situazionale (casella in «Attacca!»)');
    if (ctx.talento && tipo === 'danno' && e.incantesimi === undefined && e.ambito !== 'generale') err(F, `${KE}.ambito`, 'il danno dei Talenti è generale');
    if (e.se !== undefined && !(['situazionale', 'uso_specifico'].includes(e.ambito) && isTesto(e.se) && e.se.length <= 40)) err(F, `${KE}.se`, 'forma breve della condizione (al più 40 caratteri), per gli effetti situazionali o d’uso specifico');
    // effetto legato a una Manovra ravvicinata dell'arma stessa (Martello Spaccateste, «Stordire +1», Armamenti §7.1.9)
    if (e.manovra !== undefined && !(tipo === 'attacco' && e.ambito === 'situazionale' && (ctx.manovre ?? new Set()).has(e.manovra))) err(F, `${KE}.manovra`, 'id di una Manovra di regole.json → attacco_ravvicinato.manovre, per un attacco situazionale');
    // effetto che vale solo con un innesto installato (SIN dei dispositivi con l'Interfaccia neurale, Equipaggiamento §7.3)
    if (e.richiede_innesto !== undefined && !INNESTI.includes(e.richiede_innesto)) err(F, `${KE}.richiede_innesto`, `innesto sconosciuto (ammessi: ${INNESTI.join(', ')})`);
    // effetti per «Lancia!»: incantesimi, valore per Grado di una Classe, nota del manuale
    if (['dado_danno', 'cura', 'massimizza'].includes(tipo) && e.incantesimi === undefined) err(F, `${KE}.incantesimi`, 'a quali Incantesimi vale: ' + INCANTESIMI_EFFETTO.join(', '));
    if (e.incantesimi !== undefined && !(ctx.talento && INCANTESIMI_EFFETTO.includes(e.incantesimi))) err(F, `${KE}.incantesimi`, `uno fra ${INCANTESIMI_EFFETTO.join(', ')} (solo Talenti)`);
    if (e.incantesimi !== undefined && e.ambito === 'generale') err(F, `${KE}.ambito`, 'gli effetti di lancio sono uso_specifico (sempre) o situazionale (interruttore in «Lancia!»)');
    if (e.valore_per_grado !== undefined) {
      const ok = isOggetto(e.valore_per_grado) && Object.keys(e.valore_per_grado).length && Object.entries(e.valore_per_grado).every(([k, x]) => /^[1-6]$/.test(k) && isIntero(x) && x !== 0);
      if (!ok) err(F, `${KE}.valore_per_grado`, 'oggetto { Grado minimo (1–6): valore intero }');
      if (!(ctx.classi ?? new Set()).has(e.grado_di)) err(F, `${KE}.grado_di`, `"${e.grado_di}" non è una Classe`);
    }
    if (e.nota !== undefined && !isTesto(e.nota)) err(F, `${KE}.nota`, 'frase del manuale attesa');
    if (tipo === 'salvezza' && e.salvezza !== null && !(ctx.salvezze ?? new Set()).has(e.salvezza)) err(F, `${KE}.salvezza`, 'id di una Prova Salvezza, oppure null («la PS già prevista»)');
    if (tipo === 'salvezza' && e.ambito !== 'uso_specifico' && e.salvezza === null) err(F, `${KE}.salvezza`, 'una Salvezza generale o situazionale deve dire quale Prova Salvezza');
    if (e.resistenza !== undefined && !(ctx.talento && tipo === 'salvezza' && e.resistenza === true)) err(F, `${KE}.resistenza`, 'solo true, per le Resistenze specifiche dei Talenti (tipo "salvezza")');
    if (e.armi !== undefined && !(ctx.talento && tipo === 'danno' && e.armi === 'artefatto')) err(F, `${KE}.armi`, 'solo "artefatto", per il danno dei Talenti');
    if (tipo === 'riduzione_stato' && !(ctx.stati ?? new Set()).has(e.stato)) err(F, `${KE}.stato`, `"${e.stato}" non è uno Stato di regole.json → stati.elenco`);
    if (tipo === 'riduzione_stato' && e.prove !== undefined && !(ctx.gruppiProve ?? new Set()).has(e.prove)) err(F, `${KE}.prove`, `"${e.prove}" non è un gruppo di regole.json → categorie_prove`);
    if (tipo === 'riduzione_stato' && e.ambito === 'uso_specifico') err(F, `${KE}.ambito`, 'la riduzione di uno Stato è generale o situazionale');
    if (['riduzione_stato', 'movimento_armatura'].includes(tipo) && !(e.valore > 0)) err(F, `${KE}.valore`, 'la riduzione è un intero positivo');
    if (tipo === 'parata' && (e.con !== 'scudo' || !['distanza', 'ravvicinata'].includes(e.contro))) err(F, KE, 'parata: con "scudo", contro "distanza" o "ravvicinata"');
    const sigla = (c) => (ctx.sigle ?? new Set()).has(c) || (ctx.talento && c === '{parametro}');
    if (tipo === 'caratteristica' && (!Array.isArray(e.caratteristiche) || !e.caratteristiche.length || e.caratteristiche.some((c) => !sigla(c)))) err(F, `${KE}.caratteristiche`, 'sigle di Caratteristiche attese');
    if (tipo === 'contromisura' && (!isTesto(e.effetto) || !(e.valore > 0))) err(F, KE, 'contromisura: effetto aggiuntivo (§5.24) e soglia positiva');
    if (tipo === 'ar_contro' && !isTesto(e.contro)) err(F, `${KE}.contro`, 'tipo di danno mancante');
    if (tipo === 'ar' && e.ambito === 'uso_specifico') err(F, `${KE}.ambito`, 'l’AR è generale o situazionale');
    if (tipo === 'ar' && e.magica !== undefined && !(isIntero(e.magica) && e.magica >= 0 && e.magica <= Math.abs(e.valore))) err(F, `${KE}.magica`, 'componente magica: intero fra 0 e il valore');
    if (tipo !== 'ar' && e.magica !== undefined) err(F, `${KE}.magica`, 'solo per il tipo "ar"');
    if (e.beneficio !== undefined && !isTesto(e.beneficio)) err(F, `${KE}.beneficio`, 'chiave di testo attesa');
    if (e.proprieta !== undefined && !isTesto(e.proprieta)) err(F, `${KE}.proprieta`, 'nome della proprietà atteso');
    if (!isIntero(e.valore) || e.valore === 0) err(F, `${KE}.valore`, 'intero diverso da 0 atteso');
    if (!AMBITI_EFFETTO.includes(e.ambito)) err(F, `${KE}.ambito`, `uno fra ${AMBITI_EFFETTO.join(', ')}`);
    if (e.ambito === 'uso_specifico' && !isTesto(e.uso)) err(F, `${KE}.uso`, 'l’uso specifico ha bisogno di un’etichetta breve (es. "tracce")');
    if (e.ambito !== 'uso_specifico' && e.uso !== undefined) err(F, `${KE}.uso`, 'solo per ambito "uso_specifico"');
    if (!isTesto(e.condizione)) err(F, `${KE}.condizione`, 'frase del manuale mancante (tools/verifica_frasi.mjs)');
  });
}

const ctxEffetti = (dati) => ({
  classi: new Set((dati.classi?.classi ?? []).map((c) => c.nome)),
  salvezze: new Set((dati.caratteristiche?.salvezze ?? []).map((s) => s.id)),
  sigle: new Set((dati.caratteristiche?.caratteristiche ?? []).map((c) => c.sigla)),
  stati: new Set((dati.regole?.stati?.elenco ?? []).map((s) => s.id)),
  gruppiProve: new Set(Object.keys(dati.regole?.categorie_prove ?? {}).filter((k) => !k.startsWith('_'))),
  manovre: new Set(Object.keys(dati.regole?.attacco_ravvicinato?.manovre ?? {})),
});

// Ricarica delle armi a distanza (munizioni.json → ricarica, src/ricarica.js; Armamenti §7.20.2)
function validaRicarica(dati, err) {
  const F = 'equipaggiamento/munizioni';
  const r = dati.equipaggiamento.file.munizioni.ricarica;
  if (!isOggetto(r)) return err(F, 'ricarica', 'oggetto atteso');
  const tutti = Object.entries(dati.equipaggiamento.file).flatMap(([id, f]) => (f.oggetti ?? []).map((o) => ({ ...o, rif: `${id}:${o.id}` })));
  const rif = new Set(tutti.map((o) => o.rif));
  const famiglie = new Set(tutti.map((o) => o.famiglia));
  const ins = r.inserimento_singolo ?? {};
  for (const f of ins.famiglie ?? []) if (!famiglie.has(f)) err(F, 'ricarica.inserimento_singolo.famiglie', `"${f}" non è una famiglia del catalogo`);
  for (const a of ins.armi ?? []) if (!rif.has(a)) err(F, 'ricarica.inserimento_singolo.armi', `"${a}" non esiste nel catalogo`);
  for (const a of ins.caricatore_amovibile ?? []) if (!rif.has(a)) err(F, 'ricarica.inserimento_singolo.caricatore_amovibile', `"${a}" non esiste nel catalogo`);
  if (ins.per_operazione !== undefined && !(isIntero(ins.per_operazione) && ins.per_operazione >= 1)) err(F, 'ricarica.inserimento_singolo.per_operazione', 'intero ≥ 1 atteso');
  if (ins.migliorata !== undefined && !(isOggetto(ins.migliorata) && isIntero(ins.migliorata.per_operazione) && (dati.talenti_liberi?.talenti ?? []).some((t) => t.id === ins.migliorata.talento))) err(F, 'ricarica.inserimento_singolo.migliorata', 'serve { talento (id di talenti_liberi.json), per_operazione }');
  for (const f of r.tamburo?.famiglie ?? []) if (!famiglie.has(f)) err(F, 'ricarica.tamburo.famiglie', `"${f}" non è una famiglia del catalogo`);
  for (const a of r.tamburo?.armi ?? []) if (!rif.has(a)) err(F, 'ricarica.tamburo.armi', `"${a}" non esiste nel catalogo`);
  for (const f of r.famiglie_celle ?? []) if (!famiglie.has(f)) err(F, 'ricarica.famiglie_celle', `"${f}" non è una famiglia del catalogo`);
  for (const [abilita, x] of Object.entries(r.caricatori_vuoti ?? {})) if (!rif.has(x)) err(F, `ricarica.caricatori_vuoti.${abilita}`, `"${x}" non esiste nel catalogo`);
}

// Attacco a distanza (regole.json → attacco_distanza, src/attacco.js; Giocatore §5.2, §5.8, §5.10, §5.11)
const EFFETTI_ATTACCO = ['modalita', 'mirato', 'impegnato', 'ravvicinato', 'bruciapelo', 'distanza', 'azioni_distanza', 'copertura_propria',
  'movimento_proprio', 'imbracciatura', 'promemoria', 'mira_selettiva', 'analisi_rapida', 'postura_assedio', 'silenzioso',
  'primo_attacco', 'mirato_dopo_armatura', 'preparazione', 'nascosto'];
function validaAttaccoDistanza(dati, err) {
  const F = 'regole';
  const a = dati.regole.attacco_distanza;
  if (!isOggetto(a)) return err(F, 'attacco_distanza', 'oggetto atteso');
  const sigle = Object.keys(dati.regole.modalita_di_fuoco ?? {}).filter((k) => !k.startsWith('_'));
  const crescenti = (lista, k) => (lista ?? []).every((x, i, l) => isIntero(x?.[k]) && (!i || x[k] > l[i - 1][k]));
  if (!crescenti(a.distanza?.fasce, 'fino_a')) err(F, 'attacco_distanza.distanza.fasce', 'fasce con «fino_a» crescente attese (§5.11)');
  if (!crescenti(a.distanza?.azioni, 'fino_a')) err(F, 'attacco_distanza.distanza.azioni', 'fasce con «fino_a» crescente attese (§5.11)');
  for (const k of Object.keys(a.modalita?.manovre_ammesse ?? {})) if (!sigle.includes(k)) err(F, `attacco_distanza.modalita.manovre_ammesse.${k}`, `"${k}" non è in modalita_di_fuoco`);
  for (const k of a.modalita?.ordine_inferiore ?? []) if (!sigle.includes(k)) err(F, 'attacco_distanza.modalita.ordine_inferiore', `"${k}" non è in modalita_di_fuoco`);
  for (const [id, m] of Object.entries(a.manovre ?? {})) {
    for (const x of m.incompatibili ?? []) if (!a.manovre[x]) err(F, `attacco_distanza.manovre.${id}.incompatibili`, `"${x}" non è una manovra`);
  }
  const rif = new Set(Object.entries(dati.equipaggiamento?.file ?? {}).flatMap(([id, f]) => (f.oggetti ?? []).map((o) => `${id}:${o.id}`)));
  for (const r of a.imbracciatura?.armi ?? []) if (!rif.has(r)) err(F, 'attacco_distanza.imbracciatura.armi', `"${r}" non esiste nel catalogo`);
  // effetti.valori dei Talenti (Liberi e di Classe): lo schema degli effetti degli oggetti (docs/censimento-talenti.md)
  const nomiAbilitaT = new Set((dati.abilita?.abilita ?? []).map((x) => x.nome));
  const talentiValori = [
    ...(dati.talenti_liberi?.talenti ?? []).map((t) => ({ t, F: 'talenti_liberi' })),
    ...(dati.classi?.classi ?? []).flatMap((c) => [...(c.talenti_fissi ?? []), ...(c.talenti_a_scelta ?? [])].map((t) => ({ t, F: 'classi', classe: c.nome }))),
  ].filter(({ t }) => t.effetti?.valori !== undefined);
  for (const { t, F: file, classe } of talentiValori) {
    const K = classe ? `${classe}.${t.nome}` : t.nome;
    validaEffettiOggetto(t.effetti.valori, file, K, nomiAbilitaT, err, { ...ctxEffetti(dati), talento: true, chiave: `${K}.effetti.valori` });
  }
  // effetti.attacco_distanza dei Talenti (Liberi e di Classe)
  const talenti = [
    ...(dati.talenti_liberi?.talenti ?? []).map((t) => [`talenti_liberi`, t.id, t]),
    ...(dati.classi?.classi ?? []).flatMap((c) => [...(c.talenti_fissi ?? []), ...(c.talenti_a_scelta ?? [])].map((t) => [`classi`, `${c.nome}: ${t.nome}`, t])),
  ];
  for (const [file, nome, t] of talenti) {
    const e = t.effetti?.attacco_distanza;
    if (e === undefined) continue;
    for (const k of Object.keys(e)) if (!EFFETTI_ATTACCO.includes(k)) err(file, `${nome}.effetti.attacco_distanza.${k}`, `effetto sconosciuto (ammessi: ${EFFETTI_ATTACCO.join(', ')})`);
    for (const s2 of Object.keys(e.modalita ?? {})) if (!sigle.includes(s2)) err(file, `${nome}.effetti.attacco_distanza.modalita.${s2}`, `"${s2}" non è in modalita_di_fuoco`);
  }
}

// Campi del lancio degli incantesimi (incantesimi.json → meccanica, tools/estrai_lancio.py) ed
// Attacco ravvicinato (regole.json → attacco_ravvicinato, src/attacco.js; Giocatore §1.6, §5.3–5.7, §5.12, §5.13)
const EFFETTI_RAVVICINATO = ['manovra', 'due_armi', 'mano_non_dominante', 'senz_armi', 'carica', 'imboscata', 'alleato_adiacente', 'ignaro',
  'primo_attacco', 'raffica_di_colpi', 'punto_debole', 'promemoria', 'dopo_attacco_senz_armi', 'controllo', 'padronanza_disciplina', 'combattimento_multiplo'];
const EFFETTI_MANOVRA = ['va', 'danno', 'riduzione', 'dopo_armatura', 'danno_normale'];
const PROMEMORIA_RAVVICINATO = ['sempre', 'senz_armi', 'immobilizzare', 'opportunita'];
const COMBINAZIONI_DUE_ARMI = ['ravvicinate', 'mista', 'leggere_distanza'];
function validaAttaccoRavvicinato(dati, err) {
  const F = 'regole';
  const a = dati.regole.attacco_ravvicinato;
  if (!isOggetto(a)) return err(F, 'attacco_ravvicinato', 'oggetto atteso');
  const manovre = isOggetto(a.manovre) ? a.manovre : {};
  if (!manovre.normale) err(F, 'attacco_ravvicinato.manovre.normale', 'serve l’Attacco normale (§5.12)');
  for (const [id, m] of Object.entries(manovre)) {
    const P = `attacco_ravvicinato.manovre.${id}`;
    if (!isTesto(m?.nome) || !isTesto(m?.paragrafo)) err(F, P, 'nome e paragrafo attesi');
    if (!['generale', 'arma'].includes(m?.compatibilita)) err(F, `${P}.compatibilita`, 'uno fra generale, arma (Armamenti §7.1.7)');
    if (m?.compatibilita === 'arma' && !isTesto(m.nome_catalogo)) err(F, `${P}.nome_catalogo`, 'nome della Manovra nel campo «manovre» del catalogo');
    if (!isIntero(m?.azioni_principali) || m.azioni_principali < 1) err(F, `${P}.azioni_principali`, 'intero ≥ 1 atteso');
    if (m?.va_per_bersagli !== undefined) {
      if (!isOggetto(m.va_per_bersagli) || !Object.values(m.va_per_bersagli).every(isIntero)) err(F, `${P}.va_per_bersagli`, '{ numero di bersagli: VA } atteso');
    } else if (!isIntero(m?.va)) err(F, `${P}.va`, 'modificatore intero atteso');
    if (m?.danno !== null && !isIntero(m?.danno)) err(F, `${P}.danno`, 'bonus intero, oppure null se la Manovra non infligge danno');
    if (!['per_colpire', 'contrapposta'].includes(m?.prova?.tipo)) err(F, `${P}.prova.tipo`, 'per_colpire o contrapposta');
    if (!Array.isArray(m?.frasi) || !m.frasi.length) err(F, `${P}.frasi`, 'frasi del manuale mancanti');
  }
  const C = a.carica;
  if (!isOggetto(C) || !Array.isArray(C.fasce) || !C.fasce.every((f, k) => isIntero(f.da) && (isIntero(f.a) || (f.a === null && k === C.fasce.length - 1)) && isIntero(f.va) && isIntero(f.avversari))) err(F, 'attacco_ravvicinato.carica.fasce', 'fasce { da, a, va, avversari } attese (§5.6); «a»: null solo nell’ultima (fino alla Corsa, A.40)');
  if (!isIntero(a.due_armi?.va) || !isIntero(a.due_armi?.attacchi)) err(F, 'attacco_ravvicinato.due_armi', 'va e attacchi interi attesi (§5.7)');
  if (!isTesto(a.senz_armi?.abilita)) err(F, 'attacco_ravvicinato.senz_armi.abilita', 'Abilità degli attacchi senz’armi mancante');
  // effetti.attacco_ravvicinato dei Talenti (Liberi e di Classe)
  const talenti = [
    ...(dati.talenti_liberi?.talenti ?? []).map((t) => ['talenti_liberi', t.id, t]),
    ...(dati.classi?.classi ?? []).flatMap((c) => [...(c.talenti_fissi ?? []), ...(c.talenti_a_scelta ?? [])].map((t) => ['classi', `${c.nome}: ${t.nome}`, t])),
  ];
  // Talenti con un parametro scelto dal giocatore (Disciplina del Lottatore, §3.5.5): ogni opzione ha i suoi effetti
  const conOpzioni = [];
  for (const [file, nome, t] of talenti) {
    conOpzioni.push([file, nome, t]);
    if (t.parametro === undefined || t.parametro === null || typeof t.parametro === 'string') continue;
    const Q = t.parametro;
    const P = `${nome}.parametro`;
    if (!isOggetto(Q) || !isTesto(Q.chiave) || !isTesto(Q.nome) || !Array.isArray(Q.opzioni) || !Q.opzioni.length) { err(file, P, '{ chiave, nome, opzioni: [{ id, nome, effetti }] } atteso'); continue; }
    const ids = Q.opzioni.map((o) => o?.id);
    if (new Set(ids).size !== ids.length || !Q.opzioni.every((o) => isTesto(o?.id) && isTesto(o?.nome) && isOggetto(o?.effetti))) err(file, `${P}.opzioni`, 'ogni opzione con id (diversi), nome ed effetti');
    for (const o of Q.opzioni) conOpzioni.push([file, `${nome} (${o?.nome})`, { effetti: o?.effetti }]);
    for (const o of Q.opzioni) {
      for (const [k, x] of Object.entries(o?.effetti?.attacco_ravvicinato ?? {})) {
        const tab = x?.danno_per_grado ?? x?.va_per_grado;
        if (tab !== undefined && (!isOggetto(tab) || !Object.keys(tab).every((g) => /^[1-6]$/.test(g)) || !('1' in tab))) err(file, `${P}.${o.id}.${k}`, 'tabella per Grado { "1": …, "3": …, "5": … } attesa');
      }
    }
  }
  for (const [file, nome, t] of conOpzioni) {
    const e = t.effetti?.attacco_ravvicinato;
    if (e === undefined) continue;
    const P = `${nome}.effetti.attacco_ravvicinato`;
    for (const k of Object.keys(e)) if (!EFFETTI_RAVVICINATO.includes(k)) err(file, `${P}.${k}`, `effetto sconosciuto (ammessi: ${EFFETTI_RAVVICINATO.join(', ')})`);
    for (const [id, x] of Object.entries(e.manovra ?? {})) {
      if (!manovre[id]) err(file, `${P}.manovra.${id}`, `"${id}" non è una Manovra di attacco_ravvicinato`);
      for (const k of Object.keys(x ?? {})) if (!EFFETTI_MANOVRA.includes(k)) err(file, `${P}.manovra.${id}.${k}`, `ammessi: ${EFFETTI_MANOVRA.join(', ')}`);
    }
    if (e.due_armi !== undefined && !COMBINAZIONI_DUE_ARMI.includes(e.due_armi.combinazione)) err(file, `${P}.due_armi.combinazione`, `una fra ${COMBINAZIONI_DUE_ARMI.join(', ')}`);
    if (e.promemoria !== undefined && !PROMEMORIA_RAVVICINATO.includes(e.promemoria)) err(file, `${P}.promemoria`, `uno fra ${PROMEMORIA_RAVVICINATO.join(', ')}`);
  }
}

// effetti.lancio dei Talenti (src/lancio.js; Magia sez. 1–3, 12.3)
const CONCENTRAZIONE = ['no', 'obbligatoria', 'a_scelta', 'durante_il_lancio'];
const COMPONENTI = ['focus', 'gesto', 'invocazione'];
const CATEGORIE_ASPETTO = ['area', 'durata', 'gittata', 'bersagli', 'valori', 'altro'];
const EFFETTI_LANCIO = ['pm', 'pm_minimo', 'pm_una_volta_per_scena', 'riduzione_penalita_livello', 'divinazione_va', 'anticipazione_senza_difficolta',
  'anticipazione_senza_raddoppio', 'escludi_componente', 'salvezza_bersaglio', 'promemoria'];
function validaMeccanicaIncantesimi(dati, err) {
  // Magia sez. 2: numeri di Focalizzazione, Ingaggio, componenti mancanti e Contatto (usati da motore e pannello)
  const L = dati.regole?.lancio;
  for (const k of ['focalizzazione.va', 'focalizzazione.azioni_principali_prima', 'ingaggio.va', 'componenti.penalita', 'componenti.massimo', 'contatto.va', 'circostanze.minimo', 'circostanze.massimo', 'circostanze.passo']) {
    if (!isIntero(k.split('.').reduce((o, x) => o?.[x], L))) err('regole', `lancio.${k}`, 'numero intero atteso');
  }
  const F = 'incantesimi';
  dati.incantesimi.incantesimi.forEach((i, k) => {
    const m = i.meccanica;
    const K = `incantesimi[${k}] (${i.nome}).meccanica`;
    if (!isOggetto(m)) return err(F, K, 'campi del lancio mancanti (tools/estrai_lancio.py)');
    // E&L 18: un incantesimo solo rituale con procedura non definita non ha ancora questi campi
    const todo = Object.keys(m).some((x) => x.startsWith('TODO(')) || m.procedura_rituale?.stato === 'non_definita';
    // Magia sez. 25: Rituale definito (Rigenerazione); «L’Anticipazione ordinaria non si applica» (§25.3)
    const rituale = m.procedura_rituale?.stato === 'definita';
    if (rituale) {
      const P = m.procedura_rituale;
      const livelli = new Set((i.versioni ?? []).map((r) => Number(r.Livello)));
      if (!Array.isArray(P.versioni) || !P.versioni.length) err(F, `${K}.procedura_rituale.versioni`, 'tabella del Rituale mancante');
      else P.versioni.forEach((x, j) => {
        const KV = `${K}.procedura_rituale.versioni[${j}]`;
        if (!['livello', 'grado', 'va', 'ore', 'pm', 'reagenti'].every((c) => isIntero(x?.[c])) || !isTesto(x?.rigenerazione)) err(F, KV, 'servono livello, grado, va, ore, pm, reagenti interi e rigenerazione');
        else {
          if (!livelli.has(x.livello)) err(F, `${KV}.livello`, `${x.livello} non è una versione della scheda`);
          if (x.grado < 1 || x.grado > 6) err(F, `${KV}.grado`, 'Grado da 1 a 6');
          if (isIntero(P.reagenti_per_grado) && x.reagenti !== P.reagenti_per_grado * x.grado) err(F, `${KV}.reagenti`, `${P.reagenti_per_grado} per Grado: atteso ${P.reagenti_per_grado * x.grado}`);
        }
      });
      if (!isOggetto(dati.regole?.rituali)) err('regole', 'rituali', 'regole dei Rituali mancanti (Magia §24.6), richieste da un Rituale definito');
    }
    if (!isOggetto(m.azioni) || (!isIntero(m.azioni.azioni_principali) && !isTesto(m.azioni.tempo))) err(F, `${K}.azioni`, '{ azioni_principali } oppure { tempo } atteso');
    if (!Array.isArray(m.componenti) || m.componenti.some((c) => !COMPONENTI.includes(c))) err(F, `${K}.componenti`, `lista fra ${COMPONENTI.join(', ')}`);
    if (m.concentrazione !== null && !CONCENTRAZIONE.includes(m.concentrazione)) err(F, `${K}.concentrazione`, `uno fra ${CONCENTRAZIONE.join(', ')}`);
    if (m.concentrazione === null && !todo) err(F, `${K}.concentrazione`, 'mancante: serve un TODO(Davide)');
    if (!Array.isArray(m.pm_utilizzabili) || !m.pm_utilizzabili.length) err(F, `${K}.pm_utilizzabili`, 'lista mancante');
    const a = m.anticipazione;
    if (a !== null && a !== undefined) {
      if (!isTesto(a.frase)) err(F, `${K}.anticipazione.frase`, 'paragrafo del manuale mancante');
      (a.aspetti ?? []).forEach((x, j) => {
        if (!isTesto(x?.etichetta) || !isTesto(x?.gradino)) err(F, `${K}.anticipazione.aspetti[${j}]`, 'etichetta e gradino attesi');
        if (x?.nome !== undefined && !isTesto(x.nome)) err(F, `${K}.anticipazione.aspetti[${j}].nome`, 'nome breve: testo non vuoto');
        if (!CATEGORIE_ASPETTO.includes(x?.categoria)) err(F, `${K}.anticipazione.aspetti[${j}].categoria`, `una fra ${CATEGORIE_ASPETTO.join(', ')}`);
        // scala del gradino (src/anticipazione.js, tools/scale_anticipazione.mjs): strutturata oppure null con il motivo
        const KA = `${K}.anticipazione.aspetti[${j}]`;
        // con la tabella marcata TODO non si controllano le colonne
        const colonne = Array.isArray(i.versioni) ? new Set(Object.keys(i.versioni[0] ?? {})) : null;
        const s = x?.scala;
        if (s === undefined) err(F, `${KA}.scala`, 'mancante: rilanciare tools/scale_anticipazione.mjs --scrivi');
        else if (s === null) { if (!isTesto(x.scala_motivo)) err(F, `${KA}.scala_motivo`, 'senza scala serve il motivo («da definire al tavolo»)'); }
        else if (s.tipo === 'sequenza') {
          if (!(Array.isArray(s.valori) && s.valori.length >= 2 && s.valori.every(isTesto))) err(F, `${KA}.scala.valori`, 'almeno due voci');
          if (colonne && s.colonna !== null && !colonne.has(s.colonna)) err(F, `${KA}.scala.colonna`, `"${s.colonna}" non è una colonna della tabella`);
        } else if (s.tipo === 'incremento') {
          if (colonne && !colonne.has(s.colonna)) err(F, `${KA}.scala.colonna`, `"${s.colonna}" non è una colonna della tabella`);
          if (!(isIntero(s.passo) && s.passo !== 0)) err(F, `${KA}.scala.passo`, 'intero diverso da 0');
          if (s.massimo !== undefined && !isIntero(s.massimo)) err(F, `${KA}.scala.massimo`, 'intero');
        } else if (s.tipo === 'riga_successiva') {
          if (!(Array.isArray(s.colonne) && s.colonne.length && s.colonne.every((c) => !colonne || colonne.has(c)))) err(F, `${KA}.scala.colonne`, 'colonne della tabella');
        } else err(F, `${KA}.scala.tipo`, 'sequenza, incremento o riga_successiva');
        if (x?.conseguenze !== undefined && !(Array.isArray(x.conseguenze) && x.conseguenze.every(isTesto))) err(F, `${KA}.conseguenze`, 'frasi della scheda');
      });
    } else if (!todo && !rituale) err(F, `${K}.anticipazione`, 'mancante: serve un TODO(Davide)');
  });
  const talenti = [
    ...(dati.talenti_liberi?.talenti ?? []).map((t) => ['talenti_liberi', t.id, t]),
    ...(dati.classi?.classi ?? []).flatMap((c) => [...(c.talenti_fissi ?? []), ...(c.talenti_a_scelta ?? [])].map((t) => ['classi', `${c.nome}: ${t.nome}`, t])),
  ];
  for (const [file, nome, t] of talenti) {
    const e = t.effetti?.lancio;
    if (e === undefined) continue;
    for (const x of Object.keys(e)) if (!EFFETTI_LANCIO.includes(x)) err(file, `${nome}.effetti.lancio.${x}`, `effetto sconosciuto (ammessi: ${EFFETTI_LANCIO.join(', ')})`);
    if (e.escludi_componente !== undefined && !COMPONENTI.includes(e.escludi_componente)) err(file, `${nome}.effetti.lancio.escludi_componente`, `una fra ${COMPONENTI.join(', ')}`);
    if (e.anticipazione_senza_raddoppio !== undefined && !CATEGORIE_ASPETTO.includes(e.anticipazione_senza_raddoppio)) err(file, `${nome}.effetti.lancio.anticipazione_senza_raddoppio`, `una fra ${CATEGORIE_ASPETTO.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// Formato dei nemici del Tavolo del Master (data/formato_nemici.json, per-davide A.73): il file descrive
// i campi, validaNemico controlla un file nemico. Il Giocatore 0.45 non ha un capitolo dei nemici.

const TIPI_CAMPO_NEMICO = ['costante', 'testo', 'intero', 'dadi', 'scelta', 'lista', 'oggetto', 'mappa'];

/** Valori ammessi per «valori_da» e «chiavi_da» del formato, presi dagli altri dati. */
export function sorgentiNemico(dati) {
  return {
    caratteristiche: (dati?.caratteristiche?.caratteristiche ?? []).map((c) => c?.sigla),
    salvezze: (dati?.caratteristiche?.salvezze ?? []).map((s) => s?.id),
    stati: (dati?.regole?.stati?.elenco ?? []).map((s) => s?.id),
    modalita_di_fuoco: Object.keys(dati?.regole?.modalita_di_fuoco ?? {}).filter((k) => !k.startsWith('_')),
    nature_danno: dati?.formato_nemici?.nature_danno ?? [],
    // A.73 (E&L del 02/10): Contromisure (questo formato) e Abilità rilevanti (abilita.json)
    contromisure: dati?.formato_nemici?.contromisure ?? [],
    abilita: (dati?.abilita?.abilita ?? []).map((a) => a?.nome),
  };
}

/** Controlla la descrizione di un campo del formato (all'avvio, con gli altri dati). */
function validaSchemaNemico(F, k, s, sorgenti, err) {
  if (!isOggetto(s)) { err(F, k, 'descrizione del campo mancante'); return; }
  if (!TIPI_CAMPO_NEMICO.includes(s.tipo)) { err(F, `${k}.tipo`, `uno fra ${TIPI_CAMPO_NEMICO.join(', ')}`); return; }
  if (s.obbligatorio !== undefined && typeof s.obbligatorio !== 'boolean') err(F, `${k}.obbligatorio`, 'true o false');
  for (const c of ['min', 'max']) if (s[c] !== undefined && !isIntero(s[c])) err(F, `${k}.${c}`, 'intero');
  if (s.modello !== undefined) { try { new RegExp(s.modello); } catch { err(F, `${k}.modello`, 'espressione regolare non valida'); } }
  for (const c of ['valori_da', 'chiavi_da']) if (s[c] !== undefined && !(s[c] in sorgenti)) err(F, `${k}.${c}`, `uno fra ${Object.keys(sorgenti).join(', ')}`);
  if (s.tipo === 'scelta' && !(Array.isArray(s.valori) && s.valori.length) && s.valori_da === undefined) err(F, k, 'una scelta vuole «valori» o «valori_da»');
  if (s.oppure !== undefined && !(s.tipo === 'intero' && Array.isArray(s.oppure) && s.oppure.every(isTesto))) err(F, `${k}.oppure`, 'solo per un intero: elenco di valori testuali');
  if (s.tipo === 'lista') validaSchemaNemico(F, `${k}.voce`, s.voce, sorgenti, err);
  if (s.completo_se !== undefined && !(s.tipo === 'lista' && Array.isArray(s.completo_se) && s.completo_se.every((c) => c in (s.voce?.campi ?? {})))) err(F, `${k}.completo_se`, 'campi della voce della lista');
  if (s.tipo === 'mappa') {
    if (s.chiavi_da === undefined) err(F, `${k}.chiavi_da`, 'mancante');
    validaSchemaNemico(F, `${k}.valore`, s.valore, sorgenti, err);
  }
  if (s.tipo === 'oggetto') {
    if (!isOggetto(s.campi)) { err(F, `${k}.campi`, 'mancante'); return; }
    for (const [n, c] of Object.entries(s.campi)) {
      validaSchemaNemico(F, `${k}.campi.${n}`, c, sorgenti, err);
      if (c?.non_oltre !== undefined && s.campi[c.non_oltre]?.tipo !== 'intero') err(F, `${k}.campi.${n}.non_oltre`, 'deve nominare un campo intero fratello');
      for (const cond of ['richiesto_se', 'ammesso_se']) {
        for (const f of Object.keys(c?.[cond] ?? {})) if (!(f in s.campi)) err(F, `${k}.campi.${n}.${cond}`, `«${f}» non è un campo fratello`);
      }
    }
  }
}

function validaFormatoNemici(dati, err) {
  const f = dati.formato_nemici;
  const F = 'formato_nemici';
  if (!isTesto(f.formato)) err(F, 'formato', 'manca il nome del formato dei file nemico');
  if (!isIntero(f.versione)) err(F, 'versione', 'intero');
  if (!(Array.isArray(f.nature_danno) && f.nature_danno.length && f.nature_danno.every(isTesto))) err(F, 'nature_danno', 'elenco delle nature del danno (§5.24)');
  if (!(Array.isArray(f.contromisure) && f.contromisure.length && f.contromisure.every(isTesto))) err(F, 'contromisure', 'elenco delle Contromisure (§5.24)');
  // A.73, decisioni 6 e 7: stato del nemico al tavolo e parità d'Iniziativa
  const T = f.tavolo;
  const sigle = (dati.caratteristiche?.caratteristiche ?? []).map((c) => c?.sigla);
  if (!isOggetto(T) || !Array.isArray(T.tiene) || !T.tiene.every(isTesto) || typeof T.affaticamento !== 'boolean') err(F, 'tavolo', 'serve { tiene: [...], affaticamento: vero o falso, parita_iniziativa, spareggio }');
  else {
    if (!(Array.isArray(T.parita_iniziativa) && T.parita_iniziativa.every((x) => sigle.includes(x)))) err(F, 'tavolo.parita_iniziativa', 'sigle di Caratteristiche');
    if (!(typeof T.spareggio === 'string' && DADI.test(T.spareggio))) err(F, 'tavolo.spareggio', 'dado dello spareggio, es. «1d10»');
  }
  if (!isOggetto(f.campi)) { err(F, 'campi', 'mancante'); return; }
  validaSchemaNemico(F, '(nemico)', { tipo: 'oggetto', campi: f.campi }, sorgentiNemico(dati), err);
  for (const c of ['formato', 'id', 'nome']) if (f.campi[c]?.obbligatorio !== true) err(F, `campi.${c}`, 'campo obbligatorio per riconoscere il file');
}

/**
 * Valida un file nemico (nemici/<id>.json) col formato di data/formato_nemici.json.
 * @param nemico contenuto del file
 * @param dati dati validati dell'app
 * @param file nome da mostrare negli errori
 * @returns {{file: string, chiave: string, problema: string}[]} lista vuota se il nemico è valido
 */
export function validaNemico(nemico, dati, file = 'nemico') {
  const errori = [];
  const err = (chiave, problema) => errori.push({ file, chiave, problema });
  const formato = dati?.formato_nemici;
  if (!isOggetto(formato?.campi)) { err('', 'formato dei nemici non caricato (data/formato_nemici.json)'); return errori; }
  const sorgenti = sorgentiNemico(dati);
  const elenco = (v) => (v.length > 8 ? `${v.slice(0, 8).join(', ')}…` : v.join(', '));
  const controlla = (k, s, v, fratelli = {}) => {
    switch (s.tipo) {
      case 'costante':
        if (v !== s.valore) err(k, `deve valere ${JSON.stringify(s.valore)}`);
        return;
      case 'testo':
        if (!isTesto(v)) err(k, 'testo non vuoto');
        else if (s.modello && !new RegExp(s.modello).test(v)) err(k, `«${v}» non segue il modello ${s.modello}`);
        return;
      case 'intero':
        // «oppure»: valori testuali ammessi al posto del numero (movimento «non_consentito», A.73)
        if ((s.oppure ?? []).includes(v)) return;
        if (!isIntero(v)) { err(k, (s.oppure ?? []).length ? `numero intero oppure ${s.oppure.map((x) => `«${x}»`).join(', ')}` : 'numero intero'); return; }
        if (s.min !== undefined && v < s.min) err(k, `almeno ${s.min}`);
        if (s.max !== undefined && v > s.max) err(k, `al massimo ${s.max}`);
        if (s.non_oltre !== undefined && isIntero(fratelli[s.non_oltre]) && v > fratelli[s.non_oltre]) err(k, `non oltre ${s.non_oltre} (${fratelli[s.non_oltre]})`);
        return;
      case 'dadi':
        if (!(typeof v === 'string' && DADI.test(v.replace(/\s+/g, '')))) err(k, `dadi come «1d8+2», non ${JSON.stringify(v)}`);
        return;
      case 'scelta': {
        const ammessi = s.valori ?? sorgenti[s.valori_da] ?? [];
        if (!ammessi.includes(v)) err(k, `${JSON.stringify(v)} non ammesso (uno fra ${elenco(ammessi)})`);
        return;
      }
      case 'lista':
        if (!Array.isArray(v)) { err(k, 'elenco'); return; }
        if (s.min !== undefined && v.length < s.min) err(k, `almeno ${s.min} voci`);
        v.forEach((x, i) => controlla(`${k}[${i}]`, s.voce, x));
        return;
      case 'mappa': {
        if (!isOggetto(v)) { err(k, 'oggetto'); return; }
        const chiavi = sorgenti[s.chiavi_da] ?? [];
        for (const c of Object.keys(v)) if (!chiavi.includes(c)) err(`${k}.${c}`, `chiave non ammessa (una fra ${elenco(chiavi)})`);
        if (s.tutte) for (const c of chiavi) if (v[c] === undefined) err(`${k}.${c}`, 'mancante');
        for (const [c, x] of Object.entries(v)) if (chiavi.includes(c)) controlla(`${k}.${c}`, s.valore, x);
        return;
      }
      case 'oggetto': {
        if (!isOggetto(v)) { err(k || '(nemico)', 'oggetto'); return; }
        const pre = k ? `${k}.` : '';
        const vale = (cond) => Object.entries(cond ?? {}).every(([f, x]) => v[f] === x);
        for (const [n, c] of Object.entries(s.campi)) {
          const presente = v[n] !== undefined && v[n] !== null;
          if (!presente) {
            if (c.obbligatorio || (c.richiesto_se && vale(c.richiesto_se))) err(`${pre}${n}`, 'mancante');
            continue;
          }
          if (c.ammesso_se && !vale(c.ammesso_se)) { err(`${pre}${n}`, `ammesso solo con ${Object.entries(c.ammesso_se).map(([f, x]) => `${f} «${x}»`).join(', ')}`); continue; }
          controlla(`${pre}${n}`, c, v[n], v);
        }
        for (const n of Object.keys(v)) if (!(n in s.campi) && !n.startsWith('_')) err(`${pre}${n}`, 'campo sconosciuto al formato');
        return;
      }
      default:
        err(k, `tipo di campo sconosciuto: ${s.tipo}`);
    }
  };
  controlla('', { tipo: 'oggetto', campi: formato.campi }, nemico);
  return errori;
}

// Bestiario proposto (data/bestiario.json, docs/bestiario/bestiario.md; «Crea nemico» e «Prepara scontro» del
// Tavolo del Master). Controlli: gradi e scala (§2.1–2.5), basi per grado (cap. 3), moduli (cap. 4) con Stati,
// Abilità e armi del catalogo esistenti, creature pronte (cap. 5) e tabelle casuali (cap. 6: ogni faccia del
// dado una volta sola, in ordine; gli id dei risultati sono quelli dei dati).
function validaBestiario(dati, err) {
  const b = dati.bestiario;
  const F = 'bestiario';
  const S = sorgentiNemico(dati);
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  if (!isTesto(b.versione_manuale)) err(F, 'versione_manuale', 'manca (es. «Bestiario, proposta»)');
  if (!Array.isArray(b.gradi) || !b.gradi.length) { err(F, 'gradi', 'elenco dei gradi (§2.1)'); return; }
  const gradi = b.gradi.map((g) => g?.id);
  b.gradi.forEach((g, i) => {
    const k = `gradi[${i}]`;
    if (!isTesto(g?.id) || !isTesto(g?.nome)) err(F, k, 'id e nome');
    for (const c of ['pv', 'va', 'difese', 'ar', 'azp', 'iniziativa', 'passo']) if (!isIntero(g?.[c])) err(F, `${k}.${c}`, 'intero');
    if (!(typeof g?.danno === 'string' && DADI.test(g.danno))) err(F, `${k}.danno`, 'dadi come «2d6+2»');
    if (!num(g?.round_resistenza)) err(F, `${k}.round_resistenza`, 'numero');
    if (!/^\d+–\d+$/.test(g?.livelli ?? '')) err(F, `${k}.livelli`, 'intervallo «a–b»');
    if (!isIntero(g?.boss?.pv) || !isIntero(g?.boss?.azp)) err(F, `${k}.boss`, 'PV e AzP del Boss (§2.5.1)');
    for (const c of ['facile', 'normale', 'duro']) if (!(num(g?.equilibrato?.[c]) && g.equilibrato[c] > 0)) err(F, `${k}.equilibrato.${c}`, 'numero positivo (A.3)');
  });
  (b.equilibrato?.gruppi_misti ?? []).forEach((r, i) => {
    if (!isIntero(r?.livello)) err(F, `equilibrato.gruppi_misti[${i}].livello`, 'intero');
    for (const g of gradi) if (!(num(r?.[g]) && r[g] > 0)) err(F, `equilibrato.gruppi_misti[${i}].${g}`, 'numero positivo (§2.3)');
  });
  if (!(b.equilibrato?.gruppi_misti ?? []).length) err(F, 'equilibrato.gruppi_misti', 'tabella dei gruppi misti (§2.3)');
  if (!Array.isArray(b.equilibrato?.soglie) || b.equilibrato.soglie.at(-1)?.fino_a !== null) err(F, 'equilibrato.soglie', 'soglie in ordine, l’ultima con fino_a null');
  if (!num(b.costo_massimo)) err(F, 'costo_massimo', 'numero (§2.4: +2)');
  if (!num(b.boss?.riduzione_pv_per_ar) || !isIntero(b.boss?.azp_in_piu)) err(F, 'boss', 'riduzione_pv_per_ar e azp_in_piu (§2.5.1)');
  // basi
  const basi = Object.keys(b.basi ?? {});
  if (!basi.length) err(F, 'basi', 'mancanti (cap. 3)');
  for (const [id, base] of Object.entries(b.basi ?? {})) {
    const k = `basi.${id}`;
    if (!isTesto(base?.nome)) err(F, `${k}.nome`, 'testo');
    if (!num(base?.pv_molt_boss)) err(F, `${k}.pv_molt_boss`, 'moltiplicatore dei PV del Boss (§3.1)');
    for (const s of base?.immunita ?? []) if (!S.stati.includes(s)) err(F, `${k}.immunita`, `Stato sconosciuto: ${s}`);
    for (const g of gradi) {
      const c = base?.per_grado?.[g];
      const kg = `${k}.per_grado.${g}`;
      if (!isOggetto(c)) { err(F, kg, 'colonna del grado mancante'); continue; }
      if (base.umano) {
        for (const x of ['pv_molt', 'azp', 'bonus_danno']) if (!num(c[x])) err(F, `${kg}.${x}`, 'numero (§3.2)');
        continue;
      }
      for (const s of S.caratteristiche) if (!isIntero(c.caratteristiche?.[s])) err(F, `${kg}.caratteristiche.${s}`, 'intero');
      for (const s of S.salvezze) if (!isIntero(c.salvezze?.[s])) err(F, `${kg}.salvezze.${s}`, 'intero');
      for (const x of ['pv', 'ar', 'difese', 'iniziativa', 'passo', 'azp']) if (!isIntero(c[x])) err(F, `${kg}.${x}`, 'intero');
      if (!(c.attacchi ?? []).length) err(F, `${kg}.attacchi`, 'almeno un attacco');
      (c.attacchi ?? []).forEach((a, i) => {
        if (!isIntero(a?.va)) err(F, `${kg}.attacchi[${i}].va`, 'intero');
        if (!(typeof a?.danno === 'string' && DADI.test(a.danno))) err(F, `${kg}.attacchi[${i}].danno`, `dadi, non ${JSON.stringify(a?.danno)}`);
        if (!S.nature_danno.includes(a?.natura)) err(F, `${kg}.attacchi[${i}].natura`, `una fra ${S.nature_danno.join(', ')}`);
      });
      for (const a of c.abilita ?? []) if (!S.abilita.includes(a?.nome) || !isIntero(a?.va)) err(F, `${kg}.abilita`, `Abilità sconosciuta o VA non intero: ${a?.nome}`);
    }
    if (base?.umano && !(Array.isArray(base.tipi) && base.tipi.length && base.tipi.every(isTesto))) err(F, `${k}.tipi`, 'tipi del bestiario umano');
  }
  // moduli
  const M = b.moduli ?? {};
  const mut = (M.mutazioni ?? []).map((m) => m?.id);
  (M.mutazioni ?? []).forEach((m, i) => {
    const k = `moduli.mutazioni[${i}]`;
    if (!isTesto(m?.id) || !isTesto(m?.nome) || !num(m?.costo)) err(F, k, 'id, nome e costo');
    for (const x of m?.basi ?? []) if (!basi.includes(x)) err(F, `${k}.basi`, `base sconosciuta: ${x}`);
  });
  const livelli = (M.corrotto?.livelli ?? []).map((l) => l?.id);
  (M.corrotto?.livelli ?? []).forEach((l, i) => {
    const k = `moduli.corrotto.livelli[${i}]`;
    if (!num(l?.costo) || !isIntero(l?.manifestazioni?.minori) || !isIntero(l?.manifestazioni?.maggiori)) err(F, k, 'costo e numero di Manifestazioni');
    for (const s of l?.effetti?.immunita ?? []) if (!S.stati.includes(s)) err(F, `${k}.effetti.immunita`, `Stato sconosciuto: ${s}`);
    if (l?.effetti?.attacchi_naturali && !S.nature_danno.includes(l.effetti.attacchi_naturali)) err(F, `${k}.effetti.attacchi_naturali`, 'natura del danno');
  });
  const minori = (M.corrotto?.manifestazioni_minori ?? []).map((x) => x?.id);
  const maggiori = (M.corrotto?.manifestazioni_maggiori ?? []).map((x) => x?.id);
  for (const x of [...(M.corrotto?.manifestazioni_minori ?? []), ...(M.corrotto?.manifestazioni_maggiori ?? [])]) {
    for (const s of x?.effetti?.immunita ?? []) if (!S.stati.includes(s)) err(F, `moduli.corrotto.${x.id}`, `Stato sconosciuto: ${s}`);
  }
  const E = M.equipaggiamento;
  const rif = new Set();
  for (const [fid, f] of Object.entries(dati.equipaggiamento?.file ?? {})) for (const o of f?.oggetti ?? []) rif.add(`${fid}:${o.id}`);
  for (const g of gradi) {
    const e = E?.per_grado?.[g];
    if (!isOggetto(e) || !isIntero(e.ar)) { err(F, `moduli.equipaggiamento.per_grado.${g}`, 'protezione, AR e armi (§4.4)'); continue; }
    if (rif.size) for (const r of e.armi ?? []) if (!rif.has(r)) err(F, `moduli.equipaggiamento.per_grado.${g}.armi`, `arma non nel catalogo: ${r}`);
  }
  const fasce = (E?.fasce ?? []).map((f) => f?.id);
  // capacità che in «Attacca!» valgono come Talenti (src/nemico-attacco.js): Talenti esistenti
  for (const [nome, ids] of Object.entries(b.capacita_come_talenti ?? {})) {
    if (!Array.isArray(ids)) { err(F, `capacita_come_talenti.${nome}`, 'elenco di id di Talenti'); continue; }
    for (const id of ids) if (!(dati.talenti_liberi?.talenti ?? []).some((t) => t.id === id)) err(F, `capacita_come_talenti.${nome}`, `Talento sconosciuto: ${id}`);
  }
  // creature pronte
  (b.creature ?? []).forEach((c, i) => {
    const k = `creature[${i}]`;
    if (!isTesto(c?.id) || !isTesto(c?.nome) || !isTesto(c?.descrizione)) err(F, k, 'id, nome e descrizione');
    if (!basi.includes(c?.base)) err(F, `${k}.base`, `base sconosciuta: ${c?.base}`);
    for (const g of [...(c?.gradi ?? []), ...(c?.boss ? [c.boss.grado] : [])]) if (!gradi.includes(g)) err(F, `${k}.gradi`, `grado sconosciuto: ${g}`);
    for (const m of [c?.moduli, c?.boss?.moduli, ...Object.values(c?.moduli_per_grado ?? {})].filter(Boolean)) {
      for (const x of m.mutazioni ?? []) if (!mut.includes(x)) err(F, `${k}.moduli`, `Mutazione sconosciuta: ${x}`);
      if (m.corrotto) {
        if (!livelli.includes(m.corrotto.livello)) err(F, `${k}.moduli.corrotto`, `livello sconosciuto: ${m.corrotto.livello}`);
        for (const x of m.corrotto.minori ?? []) if (!minori.includes(x)) err(F, `${k}.moduli.corrotto`, `Manifestazione minore sconosciuta: ${x}`);
        for (const x of m.corrotto.maggiori ?? []) if (!maggiori.includes(x)) err(F, `${k}.moduli.corrotto`, `Manifestazione maggiore sconosciuta: ${x}`);
      }
    }
  });
  // tabelle casuali
  const idAmmessi = {
    base: basi, mutazione: mut, corruzione: livelli, manifestazione_minore: minori, manifestazione_maggiore: maggiori, equipaggiamento: fasce,
  };
  for (const [nome, t] of Object.entries(b.tabelle ?? {})) {
    const k = `tabelle.${nome}`;
    const facce = Number(/^d(\d+)$/.exec(t?.dado ?? '')?.[1]);
    if (!facce) { err(F, `${k}.dado`, 'dado come «d20»'); continue; }
    let atteso = 1;
    for (const [i, r] of (t.righe ?? []).entries()) {
      if (r?.da !== atteso || !(r.a >= r.da)) err(F, `${k}.righe[${i}]`, `intervallo che parte da ${atteso}`);
      atteso = (r?.a ?? atteso) + 1;
      if (idAmmessi[nome] && !idAmmessi[nome].includes(r?.id)) err(F, `${k}.righe[${i}].id`, `«${r?.id}» non è nei dati`);
    }
    if (atteso !== facce + 1) err(F, k, `le righe non coprono le ${facce} facce del ${t.dado}`);
  }
}

// Durata degli incantesimi (incantesimi.json → meccanica.durata, tools/durate_incantesimi.mjs; «Lancia!» registra le
// durate in Round come le Tecniche, src/durate-incantesimi.js): tipo noto, colonne presenti in ogni versione, valori
// riconosciuti («N RND», «N minuti», «N ore», «Istantanea», «—»).
const TIPI_DURATA_INCANTESIMO = ['durata', 'istantanea', 'procedura', 'condizione'];
const VALORE_DURATA = /^(\d+ (RND|min|minuti|minuto|ora|ore|giorno|giorni|anno|anni)|Istantanea|Istantanea con risposta|—)$/;
function validaDurateIncantesimi(dati, err) {
  const F = 'incantesimi';
  (dati.incantesimi?.incantesimi ?? []).forEach((inc, i) => {
    const d = inc?.meccanica?.durata;
    const k = `incantesimi[${i}] (${inc?.nome}).meccanica.durata`;
    if (!isOggetto(d)) { err(F, k, 'manca la durata (tools/durate_incantesimi.mjs)'); return; }
    if (!TIPI_DURATA_INCANTESIMO.includes(d.tipo)) { err(F, `${k}.tipo`, `uno fra ${TIPI_DURATA_INCANTESIMO.join(', ')}`); return; }
    const colonne = [d.colonna, d.concentrazione, ...(d.modalita ?? []).map((m) => m?.colonna)].filter(Boolean);
    if (d.tipo === 'durata' && !colonne.length) err(F, k, 'una durata senza colonna');
    (d.modalita ?? []).forEach((m, j) => { if (!isTesto(m?.id) || !isTesto(m?.nome) || !isTesto(m?.colonna)) err(F, `${k}.modalita[${j}]`, 'id, nome e colonna'); });
    for (const v of inc.versioni ?? []) for (const c of colonne) {
      if (!(c in v)) err(F, k, `colonna «${c}» assente in una versione`);
      else if (!VALORE_DURATA.test(String(v[c]).trim())) err(F, k, `«${c}» = «${v[c]}»: valore non riconosciuto`);
    }
  });
}

// Veicoli (veicoli.json, Manuale dei Veicoli 0.2): regole dei cap. 1–7 e profili dei mezzi. La PS Integrità per
// Qualità non si duplica qui: ogni profilo deve riportare quella della sua Qualità in regole.json → integrita.
function validaVeicoli(dati, err) {
  const F = 'veicoli';
  const v = dati.veicoli;
  const S = ['corpo', 'propulsione', 'motore'];
  // §1.2: Pilotare su INT, nessuna Prova per la guida ordinaria
  if (v.pilotare?.abilita !== 'Pilotare') err(F, 'pilotare.abilita', '«Pilotare» atteso (§1.2)');
  if (!(dati.abilita?.abilita ?? []).some((a) => a.nome === 'Pilotare' && a.caratteristica === v.pilotare?.caratteristica)) {
    err(F, 'pilotare.caratteristica', `l’Abilità Pilotare di abilita.json non usa ${v.pilotare?.caratteristica} (§1.2: INT)`);
  }
  // §1.4: MAN da −2 a +2, una fascia per valore
  const man = v.manovrabilita;
  if (!Array.isArray(man?.fasce) || man.fasce.length !== 5) err(F, 'manovrabilita.fasce', 'cinque fasce da +2 a −2 attese (§1.4)');
  else {
    const valori = man.fasce.map((f) => f.man);
    if (valori.join() !== '2,1,0,-1,-2') err(F, 'manovrabilita.fasce', `valori da +2 a −2 attesi, trovati ${valori.join(', ')}`);
    for (const [i, f] of man.fasce.entries()) if (!isTesto(f.nome)) err(F, `manovrabilita.fasce[${i}].nome`, 'nome mancante');
  }
  // §2.1 e §3.1: quattro andature, moltiplicatore e penalità a Pilotare e agli attacchi
  const A = v.andature?.elenco;
  if (!Array.isArray(A) || A.length !== 4) err(F, 'andature.elenco', 'quattro andature attese: Fermo, Controllata, Veloce, Massima (§2.1)');
  else {
    if (A.map((x) => x.id).join() !== 'fermo,controllata,veloce,massima') err(F, 'andature.elenco', 'ordine atteso: fermo, controllata, veloce, massima');
    for (const [i, x] of A.entries()) {
      const k = `andature.elenco[${i}] (${x?.nome})`;
      if (!isIntero(x?.moltiplicatore) || x.moltiplicatore !== i) err(F, `${k}.moltiplicatore`, `${i} atteso (MOV ×${i})`);
      for (const c of ['pilotare', 'attacco_da_bordo', 'attacco_contro']) {
        if (!isIntero(x?.[c]) || x[c] > 0) err(F, `${k}.${c}`, 'modificatore intero ≤ 0 atteso (§2.1, §3.1)');
      }
    }
  }
  // §2.4: manovre complesse, con la penalità propria e l'andatura di riferimento
  const RIF = ['mantenuta', 'iniziale', 'da_raggiungere'];
  for (const [i, m] of (v.manovre?.elenco ?? []).entries()) {
    const k = `manovre.elenco[${i}] (${m?.nome})`;
    if (!isTesto(m?.id) || !isTesto(m?.nome)) err(F, k, 'id e nome mancanti');
    if (!isIntero(m?.va) || m.va > 0) err(F, `${k}.va`, 'penalità intera ≤ 0 attesa');
    if (!RIF.includes(m?.andatura_di_riferimento)) err(F, `${k}.andatura_di_riferimento`, `uno fra ${RIF.join(', ')} (§2.4)`);
    if (!isTesto(m?.effetto)) err(F, `${k}.effetto`, 'effetto del successo mancante');
  }
  if (!Array.isArray(v.manovre?.esiti) || v.manovre.esiti.length !== 4) err(F, 'manovre.esiti', 'quattro esiti attesi (§2.5)');
  // §4.1 e §4.4: tre strutture e i loro stati, con le soglie di 1/3 e 2/3
  const st = v.strutture;
  if ((st?.elenco ?? []).map((x) => x.id).join() !== S.join()) err(F, 'strutture.elenco', `le tre strutture del §4.1: ${S.join(', ')}`);
  const stati = st?.stati ?? [];
  if (stati.length !== 5) err(F, 'strutture.stati', 'cinque stati attesi: integro, operativo, colpito, danneggiato, rotto (§4.4)');
  for (const [i, s] of stati.entries()) {
    const k = `strutture.stati[${i}] (${s?.nome})`;
    if (!isOggetto(s?.penalita)) { err(F, `${k}.penalita`, 'penalità per struttura attese'); continue; }
    for (const x of S) {
      const p = s.penalita[x];
      if (p !== null && (!isIntero(p) || p > 0)) err(F, `${k}.penalita.${x}`, 'intero ≤ 0, oppure null se la struttura è fuori uso');
    }
  }
  if (st?.solo_penalita_peggiore !== true) err(F, 'strutture.solo_penalita_peggiore', 'true atteso (§4.4: si applica soltanto la peggiore)');
  if ((st?.elenco ?? []).find((x) => x.id === 'propulsione')?.va_a_zero !== -8) err(F, 'strutture.elenco', 'Propulsione a 0 PI: −8 VA, eccezione del §4.4');
  // §4.2: localizzazione con 1d20, righe contigue che coprono le 20 facce
  const L = v.localizzazione;
  if (L?.dado !== '1d20') err(F, 'localizzazione.dado', '«1d20» atteso (§4.2)');
  let atteso = 20;
  for (const [i, r] of (L?.righe ?? []).entries()) {
    const k = `localizzazione.righe[${i}]`;
    if (r?.a !== atteso || !(r.da <= r.a)) err(F, k, `intervallo che finisce a ${atteso} (le righe scendono da 20 a 1)`);
    atteso = (r?.da ?? atteso) - 1;
    if (![...S, 'occupanti'].includes(r?.bersaglio)) err(F, `${k}.bersaglio`, `uno fra ${[...S, 'occupanti'].join(', ')}`);
    if (!isIntero(r?.accurata_va) || r.accurata_va > 0) err(F, `${k}.accurata_va`, 'penalità intera ≤ 0 per la selezione accurata');
  }
  if (atteso !== 0) err(F, 'localizzazione.righe', 'le righe non coprono le 20 facce del d20');
  if (!S.includes(L?.occupanti_non_esposti)) err(F, 'localizzazione.occupanti_non_esposti', 'struttura colpita quando nessun occupante è esposto (§4.2: Motore)');
  // §4.3: conversione del danno in PI, PS e Corazzato
  const D = v.danno;
  if (!isIntero(D?.danni_per_pi) || D.danni_per_pi < 1) err(F, 'danno.danni_per_pi', 'intero ≥ 1 atteso (§4.3: 1 PI ogni 5 danni o frazione)');
  if (D?.ps_per_colpo_e_struttura !== 1) err(F, 'danno.ps_per_colpo_e_struttura', '1 atteso (§4.3: una sola PS per struttura e per colpo)');
  if (D?.ps_riuscita !== 'dimezza_per_eccesso') err(F, 'danno.ps_riuscita', '«dimezza_per_eccesso» atteso (§4.3)');
  if (D?.ps_minimo_pi !== 1) err(F, 'danno.ps_minimo_pi', '1 atteso (§4.3: minimo 1 se esiste una perdita potenziale)');
  if (D?.corazzato_dopo_ps !== true) err(F, 'danno.corazzato_dopo_ps', 'true atteso (§4.3: Corazzato riduce dopo la PS)');
  if (JSON.stringify(D?.ar_per_natura) !== JSON.stringify(dati.regole?.danno_applicato?.ar_per_natura)) {
    err(F, 'danno.ar_per_natura', 'deve coincidere con regole.json → danno_applicato.ar_per_natura (§4.3: stessa regola dei personaggi)');
  }
  // l'esempio del manuale è un test dei dati: 5 PI potenziali e Corazzato 2 → 1 con PS riuscita, 3 con PS fallita
  const E = D?.esempio;
  if (E) {
    const riuscita = Math.max(0, Math.ceil(E.pi_potenziali / 2) - E.corazzato);
    const fallita = Math.max(0, E.pi_potenziali - E.corazzato);
    if (riuscita !== E.ps_riuscita_pi) err(F, 'danno.esempio.ps_riuscita_pi', `${riuscita} atteso dalla procedura del §4.3`);
    if (fallita !== E.ps_fallita_pi) err(F, 'danno.esempio.ps_fallita_pi', `${fallita} atteso dalla procedura del §4.3`);
  }
  // §5.1 e §5.4: collisioni e caduta, un dado ogni N Q
  const C = v.collisioni;
  if (!isIntero(C?.q_per_dado) || C.q_per_dado < 1) err(F, 'collisioni.q_per_dado', 'intero ≥ 1 atteso (§5.1: 1d6 ogni 10 Q o frazione)');
  if (!S.includes(C?.struttura_predefinita)) err(F, 'collisioni.struttura_predefinita', 'struttura colpita di norma (§5.1: Corpo principale)');
  const FORMULE = ['andatura_in_movimento', 'somma', 'differenza', 'maggiore'];
  for (const [i, r] of (C?.riferimento ?? []).entries()) {
    if (!FORMULE.includes(r?.formula)) err(F, `collisioni.riferimento[${i}].formula`, `una fra ${FORMULE.join(', ')} (§5.1)`);
  }
  if (!isIntero(C?.caduta?.q_per_dado) || C.caduta.q_per_dado < 1) err(F, 'collisioni.caduta.q_per_dado', 'intero ≥ 1 atteso (§5.4: 1d6 ogni 2 Q completi)');
  if (C?.caduta?.ar_riduce !== false) err(F, 'collisioni.caduta.ar_riduce', 'false atteso (§5.4: l’AR non riduce il danno da caduta)');
  if (C?.occupanti?.armatura_personale_riduce !== false) err(F, 'collisioni.occupanti.armatura_personale_riduce', 'false atteso (§5.2)');
  if (C?.occupanti?.salvezza !== 'Tempra' || C?.occupanti?.espulsione_salvezza !== 'Riflessi') {
    err(F, 'collisioni.occupanti', 'Tempra riduce il danno, Riflessi decide l’espulsione (§5.2, §5.3)');
  }
  const O = C?.occupanti?.esempio;
  if (O) {
    const dopoCintura = Math.ceil(O.danno / 2);
    if (dopoCintura !== O.dopo_cintura) err(F, 'collisioni.occupanti.esempio.dopo_cintura', `${dopoCintura} atteso (cintura: dimezza per eccesso)`);
    if (Math.ceil(dopoCintura / 2) !== O.dopo_tempra) err(F, 'collisioni.occupanti.esempio.dopo_tempra', `${Math.ceil(dopoCintura / 2)} atteso (Tempra: dimezza per eccesso)`);
  }
  // §6.3: lo Speronamento è un attacco, quindi senza MAN e senza penalità propria
  if (v.speronamento?.man !== false) err(F, 'speronamento.man', 'false atteso (§1.4, §6.3: MAN non modifica questo attacco)');
  if (v.speronamento?.penalita_propria !== 0) err(F, 'speronamento.penalita_propria', '0 atteso (§6.3: nessuna penalità fissa propria)');
  if (v.speronamento?.moltiplicatore_magistrale !== dati.regole?.magistrale?.raddoppio) {
    err(F, 'speronamento.moltiplicatore_magistrale', 'deve coincidere con regole.json → magistrale.raddoppio (§1.6)');
  }
  // §7.1: riparazione, un'ora e una Prova di Tecnologia; gli esiti vanno da +2 a −1 PI
  const RIP = v.riparazione;
  if (RIP?.abilita !== 'Tecnologia') err(F, 'riparazione.abilita', '«Tecnologia» atteso (§7.1)');
  if (RIP?.minuti !== 60) err(F, 'riparazione.minuti', '60 atteso (§7.1: 1 ora)');
  if ((RIP?.esiti ?? []).map((x) => x.pi).join() !== '2,1,0,-1') err(F, 'riparazione.esiti', 'PI attesi: Magistrale 2, Successo 1, Fallimento 0, Maldestro −1 (§7.1)');
  // §7.4: Sovraccarico Tecnico, 1 PI speso e almeno 2 nella riserva
  const SO = v.sovraccarico_tecnico;
  if (SO?.pi_spesi !== 1 || SO?.pi_minimi_richiesti !== 2) err(F, 'sovraccarico_tecnico', '1 PI speso e almeno 2 PI nella riserva (§7.4)');
  for (const [i, r] of (SO?.riserve ?? []).entries()) {
    if (![...S, 'oggetto'].includes(r?.struttura)) err(F, `sovraccarico_tecnico.riserve[${i}].struttura`, `una fra ${[...S, 'oggetto'].join(', ')}`);
  }
  const SP = v.spinta_al_limite?.prova_alla_scadenza;
  if (!S.includes(SP?.struttura) || SP?.fallimento_pi !== 1 || SP?.maldestro_pi !== 2) {
    err(F, 'spinta_al_limite.prova_alla_scadenza', 'Motore, 1 PI col fallimento e 2 col Maldestro (§7.4)');
  }
  // profili dei mezzi (§9, §10)
  const qualita = dati.regole?.integrita?.ps_per_qualita ?? {};
  const ids = new Set();
  (v.profili ?? []).forEach((p, i) => {
    const k = `profili[${i}] (${p?.nome})`;
    if (!isTesto(p?.id) || !isTesto(p?.nome)) err(F, k, 'id e nome mancanti');
    else if (ids.has(p.id)) err(F, `${k}.id`, `id «${p.id}» ripetuto`);
    else ids.add(p.id);
    if (!isIntero(p?.mov_q) || p.mov_q < 1) err(F, `${k}.mov_q`, 'MOV intero ≥ 1 atteso');
    if (!isIntero(p?.man) || p.man < -2 || p.man > 2) err(F, `${k}.man`, 'MAN intero fra −2 e +2');
    // la PS Integrità viene dalla Qualità (regole.json → integrita): nel profilo si ricopia, e deve coincidere
    const ps = qualita[p?.qualita];
    if (ps === undefined) err(F, `${k}.qualita`, `«${p?.qualita}» non è una Qualità di regole.json → integrita.ps_per_qualita`);
    else if (p.ps_integrita !== ps) err(F, `${k}.ps_integrita`, `${ps} atteso per la Qualità ${p.qualita} (regole.json → integrita.ps_per_qualita)`);
    if (!isIntero(p?.ar?.totale) || p.ar.totale < 0) err(F, `${k}.ar.totale`, 'AR intera ≥ 0 attesa');
    if (!isIntero(p?.ar?.magica) || p.ar.magica < 0 || p.ar.magica > p?.ar?.totale) err(F, `${k}.ar.magica`, 'componente magica fra 0 e l’AR totale');
    if (!isIntero(p?.corazzato) || p.corazzato < 0) err(F, `${k}.corazzato`, 'Corazzato intero ≥ 0 atteso');
    for (const s of S) {
      if (!isIntero(p?.pi?.[s]) || p.pi[s] < 1) err(F, `${k}.pi.${s}`, 'PI massimi interi ≥ 1 attesi (§4.1)');
    }
    if (p?.equipaggio && p.equipaggio.posti !== (p.equipaggio.conducente ?? 0) + (p.equipaggio.passeggeri ?? 0)) {
      err(F, `${k}.equipaggio.posti`, `${(p.equipaggio.conducente ?? 0) + (p.equipaggio.passeggeri ?? 0)} atteso (conducente + passeggeri)`);
    }
    // armi di bordo: l'Abilità esiste e il profilo dice chi le usa
    (p?.armi ?? []).forEach((a, j) => {
      const ka = `${k}.armi[${j}] (${a?.nome})`;
      if (!isTesto(a?.nome)) err(F, ka, 'nome mancante');
      if (!(dati.abilita?.abilita ?? []).some((x) => x.nome === a?.abilita)) err(F, `${ka}.abilita`, `«${a?.abilita}» non è un'Abilità esistente (§3.1)`);
      if (!isTesto(a?.operatore)) err(F, `${ka}.operatore`, 'chi usa l’arma (§3.1: operatore, postazione, arco di tiro)');
      if (!isTesto(a?.danno)) err(F, `${ka}.danno`, 'danno mancante');
    });
    // rinforzi di una struttura (Copriruote di Petra): struttura esistente e numeri coerenti
    (p?.rinforzi ?? []).forEach((r, j) => {
      const kr = `${k}.rinforzi[${j}] (${r?.nome})`;
      if (!S.includes(r?.struttura)) err(F, `${kr}.struttura`, `una fra ${S.join(', ')}`);
      if (!isIntero(r?.pi_per_pezzo) || r.pi_per_pezzo < 1) err(F, `${kr}.pi_per_pezzo`, 'PI per pezzo interi ≥ 1');
      if ((r?.installati ?? 0) + (r?.ricambi ?? 0) !== r?.complessivi) err(F, `${kr}.complessivi`, 'installati + ricambi devono fare i complessivi');
      if (r?.protezione_iniziale_pi !== (r?.installati ?? 0) * (r?.pi_per_pezzo ?? 0)) {
        err(F, `${kr}.protezione_iniziale_pi`, `${(r?.installati ?? 0) * (r?.pi_per_pezzo ?? 0)} atteso (installati × PI per pezzo)`);
      }
      if (r?.pi_nelle_scorte !== (r?.ricambi ?? 0) * (r?.pi_per_pezzo ?? 0)) {
        err(F, `${kr}.pi_nelle_scorte`, `${(r?.ricambi ?? 0) * (r?.pi_per_pezzo ?? 0)} atteso (ricambi × PI per pezzo)`);
      }
      if (r?.aumenta_pi_massimi !== false) err(F, `${kr}.aumenta_pi_massimi`, 'false atteso: i rinforzi non aumentano i PI massimi della struttura');
    });
  });
  if (!ids.has('autovettura-civile') || !ids.has('asa-scout-mk4')) err(F, 'profili', 'i due profili del manuale: autovettura-civile (§9) e asa-scout-mk4 (§10)');
}
