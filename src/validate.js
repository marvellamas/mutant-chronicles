// Validatore dei dati delle regole (data/*.json).
// Controlla gli invarianti dei manuali e restituisce errori leggibili: file, chiave, problema.
// Non lancia eccezioni: un file malformato produce errori, non un crash.

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

/** Formatta un errore come riga leggibile. */
export function formattaErrore(e) {
  return `${e.file}${e.chiave ? ' › ' + e.chiave : ''}: ${e.problema}`;
}

/**
 * Valida l'insieme dei dati delle regole.
 * @param {object} dati { caratteristiche, abilita, corporazioni, addestramenti, classi, incantesimi, regole }
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

  for (const file of ['caratteristiche', 'abilita', 'corporazioni', 'addestramenti', 'classi', 'incantesimi', 'regole']) {
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
  lista.forEach((x, i) => { if (!isTesto(x.sigla) || !isTesto(x.nome)) err(F, `caratteristiche[${i}]`, 'servono "sigla" e "nome"'); });
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
    'addestramento.punti_totali', 'taumaturgo.incantesimi_liberi.fisso', 'taumaturgo.livello_massimo_per_grado_taumaturgico',
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
