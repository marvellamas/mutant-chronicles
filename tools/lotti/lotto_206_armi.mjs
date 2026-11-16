// Lotto 206 (16/11/2026) — **le armi del catalogo passano al Manuale degli Armamenti corrente.**
//
// Il catalogo delle armi era dichiarato Armamenti 0.74 e, dal lotto 195, tre voci su duecentodiciotto venivano
// dalla 0.83. Questo generatore confronta ogni voce col manuale corrente, campo per campo, e scrive solo quello
// che ha letto per intero (`unisciVoce` → `unisciPerCampo`, la regola del 204).
//
// **Perché qui il rischio è diverso dal Bestiario.** Un nemico salvato porta i suoi valori con sé; un'arma no:
// la voce dell'inventario rimanda al catalogo con `rif` e i valori si ricalcolano a ogni apertura della scheda.
// Cambiare `armi.json` cambia la scheda dei sette. Perciò il generatore **classifica prima di scrivere** e conta a
// parte le differenze che si vedono in combattimento (`CAMPI_DI_COMBATTIMENTO`): sono quelle su cui si decide se
// serve un cancello, e la decisione è del lotto, non del generatore.
//
//   node tools/lotti/lotto_206_armi.mjs                 — il piano: che cosa cambierebbe, voce per voce
//   node tools/lotti/lotto_206_armi.mjs --sette         — che cosa cambia per le armi dei sette (sola lettura)
//   node tools/lotti/lotto_206_armi.mjs --scrivi        — applica
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';
import { testoManuale } from '../manuali.mjs';
import { profiliArmi, chiaveNome, edizioneArmamenti, profiloDi, ramiPerVoce, specializzazioniDaProsa, titoloCombacia, titoliSezione } from '../importa-armi.mjs';
import { unisciVoce, CAMPI, CAMPI_DI_COMBATTIMENTO, CAMPI_NOSTRI, NOMI_CAMPI, voceMista, quadroCatalogo } from '../../src/provenienza-catalogo.js';

/** I file del catalogo che contengono armi: sono le «duecento voci» di cui parla il lotto. */
export const FILE_ARMI = [
  'data/equipaggiamento/armi.json',
  'data/equipaggiamento/armi_corporative.json',
  'data/equipaggiamento/armi_distanza.json',
  'data/equipaggiamento/armi_distanza_corporative.json',
];

/** L'edizione da cui vengono i dati di prima: la si legge dal file, non da un numero scritto qui. */
export const edizionePrimaDi = (json) => json?.versione_manuale ?? null;

/** I campi che la lettura dalla struttura **conferma** senza sovrascrivere. */
export const CONFERMA_SOLO = ['famiglia', 'catalogo'];

const uguale = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Due valori sono **lo stesso dato scritto in un'altra forma**, non una differenza. Due casi, trovati dal
 * confronto e non previsti:
 *
 *  - **Le Modalità di fuoco sono un insieme, non una sequenza.** La Bolter 13 ha «S RB TR» nel suo blocco e
 *    «S TR RB» nella tabella dei prezzi: l'ordine non vuol dire niente e riscriverlo non cambierebbe un tiro, ma
 *    comparirebbe come differenza in due voci e farebbe sembrare cambiato qualcosa che non è cambiato.
 *  - **Il nome di un catalogo corporativo ha due forme nel manuale**: «Catalogo Imperial» (§7.14) e «Imperiali»
 *    nella colonna Catalogo del §7.22 — che è anche il nome che la corporazione ha in `data/corporazioni.json`.
 *    Scrivere la seconda su **4 voci su 25** spaccherebbe in due il gruppo Imperial dell'Inventario: un gruppo che
 *    si divide è una regressione visibile, e non è un dato nuovo. Si tiene la forma che il catalogo usa già, e si
 *    conta a parte (`forme`). Rinominare tutte e 25 le voci è una decisione, non una lettura: non è di questo lotto.
 */
export function stessaFormaAltroNome(campo, prima, dopo) {
  if (campo === 'famiglia') return false;
  if (campo === 'modalita' && Array.isArray(prima) && Array.isArray(dopo)) {
    return prima.length === dopo.length && [...prima].sort().join() === [...dopo].sort().join();
  }
  if (campo === 'catalogo' && typeof prima === 'string' && typeof dopo === 'string') {
    const a = prima.toLowerCase();
    const b = dopo.toLowerCase();
    return a !== b && (a.startsWith(b) || b.startsWith(a));
  }
  return false;
}

/** Le voci d'arma del catalogo: `[{ file, json, oggetto }]`. */
export function vociDArma(radice = '.') {
  const fuori = [];
  for (const f of FILE_ARMI) {
    const json = JSON.parse(readFileSync(`${radice}/${f}`, 'utf8'));
    for (const o of json.oggetti ?? []) fuori.push({ file: f, json, oggetto: o });
  }
  return fuori;
}

/**
 * Tutti i nomi che il catalogo ha, in **tutti** i suoi file.
 * Serve per dire «questo modello nel catalogo non c'è»: l'Howler sta in `corredi_dispositivi.json` e lo Scudo
 * delle Guardie Sacre in `scudi.json`, e cercarli nei soli quattro file delle armi li darebbe per mancanti.
 */
export function nomiDelCatalogo(radice = '.') {
  const dir = `${radice}/data/equipaggiamento`;
  const nomi = new Set();
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const json = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    for (const o of json.oggetti ?? []) {
      for (const n of [o.nome, ...(o.nomi_alternativi ?? [])]) if (n) nomi.add(chiaveNome(n));
    }
  }
  return nomi;
}

/**
 * Il profilo del manuale che corrisponde a una voce: si cerca per nome e per `nomi_alternativi`.
 * **Non per `id`**: l'id è nostro, il manuale non lo conosce.
 */
export function appaia(voce, profili) {
  const rami = ramiPerVoce(voce);
  for (const n of [voce.nome, ...(voce.nomi_alternativi ?? [])]) {
    const p = profiloDi(profili, n, rami);
    if (p) return p;
  }
  return null;
}

/**
 * I modelli del manuale che **potrebbero** essere questa voce, quando il nome esatto non c'è.
 *
 * **Si propongono, non si scelgono.** Fra la 0.50 — da cui vengono queste voci — e il manuale corrente i nomi
 * sono cambiati: «Enforcer» è «Colt Enforcer», «Ironfist 15» è «Bolter 15 Ironfist», «Jemson 45» è «Colt Jamson
 * 45» (con la A di Jamson). Appaiarle da sé per somiglianza scriverebbe i valori di un modello **su un altro**,
 * con la provenienza dell'edizione corrente addosso, e al tavolo nessuno vedrebbe che è sbagliato: è la stessa
 * ragione per cui il lotto 201 non ricollega un veicolo nemmeno quando il candidato è uno solo. Il rimando lo
 * decide una persona, e finché non lo decide la voce resta dichiarata.
 */
export function candidati(voce, profili) {
  const k = chiaveNome(voce.nome);
  if (!k) return [];
  const parole = k.split(' ').filter((p) => p.length > 2);
  const fuori = new Map();
  for (const p of profili.values()) {
    const m = chiaveNome(p.nome);
    if (m === k) continue;
    const contiene = m.includes(k) || k.includes(m);
    const quasi = parole.length > 0 && parole.every((x) => m.includes(x));
    if (contiene || quasi) fuori.set(p.nome, p.ramo);
  }
  return [...fuori.keys()];
}

/**
 * Il confronto fra una voce e il manuale: `{ id, nome, file, trovata, differenze, combattimento, ereditati, … }`.
 * `differenze` sono i campi che il manuale dà diversi; `combattimento` quelle fra loro che si vedono al tavolo.
 */
export function confronta(voce, profilo, { edizione, edizionePrima, specializzazioni = null }) {
  const esito = {
    id: voce.id, nome: voce.nome, trovata: !!profilo, differenze: [], combattimento: [], nostri: [],
    nonLetti: profilo?.nonLetti ?? {}, riserve: profilo?.riserve ?? {},
  };
  if (!profilo) return esito;
  // **I campi nostri si confrontano e non si scrivono** (`CAMPI_NOSTRI`): servono ad accorgersi di una differenza.
  // La Specializzazione dà +1 VA e +1 danno, quindi una famiglia che si sposta si vede al tavolo subito: se il
  // manuale la nomina e non è la nostra, è una differenza da dichiarare, non da applicare di nascosto.
  const sp = specializzazioni?.get(chiaveNome(voce.nome));
  if (sp && sp.id !== voce.specializzazione) {
    esito.nostri.push({ campo: 'specializzazione', nome: NOMI_CAMPI.specializzazione, prima: voce.specializzazione ?? null, dopo: sp.id, riga: sp.riga });
  }
  const nomiNostri = (voce.proprieta ?? []).map((x) => (typeof x === 'object' ? x.nome : x)).filter(Boolean);
  const nomiLetti = Array.isArray(profilo.letti.proprieta) ? profilo.letti.proprieta : null;
  if (nomiLetti && [...nomiNostri].sort().join('|') !== [...nomiLetti].sort().join('|')) {
    esito.nostri.push({ campo: 'proprieta', nome: NOMI_CAMPI.proprieta, prima: nomiNostri, dopo: nomiLetti });
  }
  const letta = {};
  for (const k of CAMPI) {
    if (profilo.letti[k] === undefined) continue;
    // la capacità è un sottocampo: si cambia solo quella, perché unità, ricarica e consumo non stanno in tabella
    if (k === 'munizioni') {
      const prima = voce.munizioni ?? null;
      const cap = profilo.letti.munizioni?.capacita;
      if (cap === undefined) continue;
      letta.munizioni = { ...(prima ?? {}), capacita: cap };
      continue;
    }
    letta[k] = profilo.letti[k];
  }
  // **Famiglia e catalogo: si verificano sui titoli, non si estraggono da essi.** Il manuale li scrive una volta
  // sola, come intestazione delle tabelle, e quale dei due sia un titolo non si legge dal titolo: nel §7.8
  // «Alleanza › Armi leggere» il sottotitolo è la famiglia, nel §7.1.9 «Cataloghi delle Corporazioni › Bauhaus»
  // è la corporazione. Il vocabolario ce l'ha il catalogo, quindi si chiede al manuale una conferma del valore
  // che la voce dichiara già: se sta fra i titoli, il campo è confermato dall'edizione corrente; se no, resta
  // quello di prima col motivo. Sbagliarli sposterebbe la voce di gruppo nell'Inventario e, attraverso la
  // famiglia, la Specializzazione, cioè il +1 VA e il +1 danno.
  const nonLetti = { ...profilo.nonLetti };
  for (const k of CONFERMA_SOLO) {
    // dove il manuale **ha la colonna** (il §7.22 ha «Catalogo») la lettura è una lettura come le altre e la
    // regola normale vale; la conferma dai titoli serve solo dove la colonna non c'è
    if (letta[k] !== undefined) continue;
    // «Imperial» del catalogo e «Imperiali» del titolo sono lo stesso nome in due forme (vedi
    // `stessaFormaAltroNome`): il titolo conferma, e rinominare le 25 voci non è di questo lotto
    const combacia = titoloCombacia(profilo.sezioni, voce[k])
      || titoliSezione(profilo.sezioni).some((t) => stessaFormaAltroNome(k, voce[k], t));
    if (combacia) letta[k] = voce[k];
    else {
      delete letta[k];
      nonLetti[k] = `il manuale non lo scrive in tabella e fra i titoli di sezione («${(profilo.sezioni[0] ?? '').split(' › ').slice(-2).join(' › ')}») non compare «${voce[k] ?? '—'}»`;
    }
  }
  // la stessa forma scritta in un altro modo non è un dato nuovo: si tiene quella del catalogo e si conta a parte
  esito.forme = [];
  for (const k of CAMPI) {
    if (letta[k] === undefined) continue;
    if (!stessaFormaAltroNome(k, voce[k], letta[k])) continue;
    esito.forme.push({ campo: k, nome: NOMI_CAMPI[k] ?? k, prima: voce[k], dopo: letta[k] });
    letta[k] = voce[k];
  }
  const u = unisciVoce(voce, letta, { edizione, edizionePrima, nonLetti });
  for (const k of CAMPI) {
    if (letta[k] === undefined) continue;
    if (Object.prototype.hasOwnProperty.call(profilo.nonLetti, k)) continue;
    if (uguale(voce[k], letta[k])) continue;
    const d = { campo: k, nome: NOMI_CAMPI[k] ?? k, prima: voce[k] ?? null, dopo: letta[k] };
    esito.differenze.push(d);
    if (CAMPI_DI_COMBATTIMENTO.includes(k)) esito.combattimento.push(d);
  }
  esito.json = u.json;
  esito.scritti = u.scritti;
  esito.ereditati = u.ereditati;
  return esito;
}

/** Il piano per tutte le voci d'arma. */
export function piano(radice = '.') {
  const regole = JSON.parse(readFileSync(`${radice}/data/regole.json`, 'utf8'));
  const testo = testoManuale('armamenti');
  const profili = profiliArmi(testo, { modalitaRegole: regole.modalita_di_fuoco });
  const sp = JSON.parse(readFileSync(`${radice}/data/specializzazioni.json`, 'utf8'));
  const specializzazioni = specializzazioniDaProsa(testo, new Map((sp.specializzazioni ?? []).map((x) => [x.nome, x.id])));
  const edizione = edizioneArmamenti();
  const voci = vociDArma(radice);
  const esiti = [];
  for (const v of voci) {
    const p = appaia(v.oggetto, profili);
    const e = confronta(v.oggetto, p, { edizione, edizionePrima: edizionePrimaDi(v.json), specializzazioni });
    esiti.push({ ...e, file: v.file, candidati: p ? [] : candidati(v.oggetto, profili) });
  }
  // i modelli del manuale che nel catalogo non ci sono: voci nuove da valutare, non da scrivere di nascosto.
  // Si contano solo quelli che hanno un profilo d'arma (danno o modalità): nelle tabelle d'arma entrano anche
  // armature, scudi ed elmetti, che hanno Qualità e Costo ma non sono armi e non sono di questo lotto.
  const appaiati = new Set();
  for (const v of voci) {
    const p = appaia(v.oggetto, profili);
    if (p) appaiati.add(`${chiaveNome(p.nome)}|${p.ramo}`);
  }
  const giaNelCatalogo = nomiDelCatalogo(radice);
  const conSpecializzazione = specializzazioni.size;
  const nuovi = [...profili.entries()]
    .filter(([k, p]) => !appaiati.has(k) && !giaNelCatalogo.has(chiaveNome(p.nome))
      && (p.letti.danno !== undefined || p.letti.modalita !== undefined))
    .map(([, p]) => p);
  return { edizione, esiti, nuovi, profili, specializzazioni, conSpecializzazione };
}

/** Il quadro in numeri: nuove, cambiate, invariate, non trovate, e le differenze di combattimento. */
export function quadro(p) {
  const q = {
    voci: p.esiti.length, invariate: 0, cambiate: 0, nonTrovate: 0, nuoveNelManuale: p.nuovi.length,
    differenze: 0, diCombattimento: 0, perCampo: {}, conRiserve: 0, conNonLetti: 0,
  };
  for (const e of p.esiti) {
    if (!e.trovata) { q.nonTrovate += 1; continue; }
    if (Object.keys(e.riserve ?? {}).length) q.conRiserve += 1;
    if (Object.keys(e.nonLetti ?? {}).length) q.conNonLetti += 1;
    if (e.nostri?.length) q.conNostri = (q.conNostri ?? 0) + 1;
    if (!e.differenze.length) { q.invariate += 1; continue; }
    q.cambiate += 1;
    q.differenze += e.differenze.length;
    q.diCombattimento += e.combattimento.length;
    for (const d of e.differenze) q.perCampo[d.campo] = (q.perCampo[d.campo] ?? 0) + 1;
  }
  return q;
}

const breve = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object' && !Array.isArray(v)) {
    if ('una_mano' in v) return `${v.una_mano ?? '—'} / ${v.due_mani ?? '—'}`;
    if ('capacita' in v) return String(v.capacita);
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'object' ? x.nome ?? JSON.stringify(x) : x)).join(' ');
  return String(v);
};

/** Le righe del rapporto. */
export function righe(p) {
  const q = quadro(p);
  const out = [
    `${p.edizione}: ${q.voci} voci d'arma nel catalogo.`,
    `  invariate ${q.invariate} · cambiate ${q.cambiate} · non trovate nel manuale ${q.nonTrovate} · modelli del manuale non nel catalogo ${q.nuoveNelManuale}`,
    `  differenze ${q.differenze}, di cui ${q.diCombattimento} su campi che si vedono in combattimento`,
  ];
  if (Object.keys(q.perCampo).length) {
    out.push(`  per campo: ${Object.entries(q.perCampo).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${NOMI_CAMPI[k] ?? k} ${n}`).join(' · ')}`);
  }
  for (const e of p.esiti.filter((x) => x.differenze.length)) {
    out.push(`  ${e.nome} (${e.id}):`);
    for (const d of e.differenze) {
      const segno = CAMPI_DI_COMBATTIMENTO.includes(d.campo) ? '⚔' : ' ';
      out.push(`    ${segno} ${d.nome}: ${breve(d.prima)} → ${breve(d.dopo)}`);
    }
  }
  const perCampoEred = {};
  for (const e of p.esiti) for (const x of e.ereditati ?? []) perCampoEred[x.campo] = (perCampoEred[x.campo] ?? 0) + 1;
  if (Object.keys(perCampoEred).length) {
    out.push(`  campi che restano all'edizione di prima: ${Object.entries(perCampoEred).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${NOMI_CAMPI[k] ?? k} ${n}`).join(' · ')}`);
    const visti = new Set();
    for (const e of p.esiti) {
      for (const x of e.ereditati ?? []) {
        if (visti.has(x.campo)) continue;
        visti.add(x.campo);
        out.push(`    ${NOMI_CAMPI[x.campo] ?? x.campo}: ${x.motivo} (p. es. ${e.nome})`);
      }
    }
  }
  out.push(`  Specializzazioni nominate nella prosa del manuale: ${p.conSpecializzazione} modelli; differenze dalle nostre: ${p.esiti.filter((e) => e.nostri?.some((n) => n.campo === 'specializzazione')).length}`);
  for (const e of p.esiti.filter((x) => x.nostri?.length)) {
    for (const n of e.nostri) out.push(`  ~ ${e.nome}: ${n.nome} ${breve(n.prima)} → ${breve(n.dopo)} (si dichiara, non si scrive)`);
  }
  if (q.nonTrovate) {
    out.push('  non trovate nel manuale col loro nome (il rimando lo decide una persona, non il generatore):');
    for (const e of p.esiti.filter((x) => !x.trovata)) {
      out.push(`    ${e.nome} (${e.id}) — ${e.candidati?.length ? `nel manuale c'è «${e.candidati.join('», «')}»` : 'nessun modello somigliante nel manuale'}`);
    }
  }
  if (p.nuovi.length) {
    out.push(`  modelli del manuale che nel catalogo non ci sono: ${p.nuovi.map((x) => x.nome).join(', ')}`);
  }
  return out;
}

/** Scrive il piano nei file del catalogo. Senza `--scrivi` non si chiama. */
export function applica(p, radice = '.') {
  const perFile = new Map();
  for (const e of p.esiti) {
    if (!e.json) continue;
    if (!perFile.has(e.file)) perFile.set(e.file, new Map());
    perFile.get(e.file).set(e.id, e.json);
  }
  let voci = 0;
  let aggiornate = 0;
  for (const [f, mappa] of perFile) {
    const json = JSON.parse(readFileSync(`${radice}/${f}`, 'utf8'));
    json.oggetti = (json.oggetti ?? []).map((o) => {
      const nuovo = mappa.get(o.id);
      if (!nuovo) return o;
      voci += 1;
      // l'identità non si rilegge dal manuale (lezione del 204: un `id` cambiato rompe i rimandi)
      const v = { ...nuovo, id: o.id, nome: o.nome, tipo: o.tipo, paragrafo: o.paragrafo, nomi_alternativi: o.nomi_alternativi };
      // l'etichetta della voce passa all'edizione corrente **solo** se tutti i suoi campi vengono da lì:
      // altrimenti direbbe 0.86 su una voce che tiene valori della 0.50, ed è la bugia che il lotto 189 ha
      // scoperto su tutti e 40 i file di `data/`
      if (!voceMista(v, p.edizione)) { v.versione_manuale = p.edizione; aggiornate += 1; }
      return v;
    });
    json.versione_manuale = p.edizione;
    writeFileSync(`${radice}/${f}`, JSON.stringify(json, null, 1) + '\n');
  }
  scriviConto(p, radice);
  return { file: perFile.size, voci, aggiornate };
}

/**
 * **Il conto, nei dati, perché il validatore lo pretenda.** Come `corpus` di `formato_nemici.json` per il
 * Bestiario (342 = 310 + 32, poi 493): un numero dichiarato che deve tornare coi file è l'unica difesa contro un
 * invariante verde su zero voci, che nel Bestiario ci ha ingannato tre volte.
 */
export function scriviConto(p, radice = '.') {
  const F = `${radice}/data/equipaggiamento/index.json`;
  const json = JSON.parse(readFileSync(F, 'utf8'));
  const voci = vociDArma(radice).map((v) => v.oggetto);
  const q = quadroCatalogo(voci, p.edizione);
  const motivi = {};
  for (const e of p.esiti) {
    for (const x of e.ereditati ?? []) if (!motivi[x.campo]) motivi[x.campo] = x.motivo;
  }
  // il conto deve tornare: voci = dalla_edizione + miste + non_nel_manuale. Una voce che nel manuale non si trova
  // col suo nome non ha provenienza per campo, quindi **non** si conta fra quelle «dall'edizione»: altrimenti il
  // numero direbbe che nove voci sono a posto proprio perché nessuno è riuscito a confrontarle.
  const nonNelManuale = p.esiti.filter((e) => !e.trovata).length;
  json.catalogo_armi = {
    edizione: p.edizione,
    file: FILE_ARMI.map((f) => f.split('/').pop()),
    voci: q.voci,
    dalla_edizione: q.voci - q.miste.length - nonNelManuale,
    miste: q.miste.length,
    non_nel_manuale: nonNelManuale,
    campi: { letti: q.letti, ereditati: q.ereditati, senza_provenienza: q.senzaProvenienza, per_campo: q.perCampo },
    motivi,
    _nota: 'Lotto 206: ogni voce d’arma porta in `_edizione.campi` l’edizione da cui viene ciascun suo campo (`src/provenienza-catalogo.js`). «miste» sono le voci che tengono almeno un campo di un’edizione precedente e lo dicono nella scheda; «non_nel_manuale» le voci che col loro nome non si trovano nel manuale corrente, e il cui rimando lo decide una persona. Specializzazione, Manovre e i testi delle proprietà non vengono dalle tabelle del manuale e non portano una provenienza per voce (`CAMPI_NOSTRI`): si confrontano col manuale e si dichiarano. Il validatore pretende che i conti tornino coi file.',
  };
  writeFileSync(F, JSON.stringify(json, null, 1) + '\n');
  return json.catalogo_armi;
}

/**
 * **La parte più importante del lotto: che cosa cambia per i sette.**
 *
 * Una creatura porta i suoi valori con sé; un'arma no. Prima di scrivere una riga di catalogo si guarda, in sola
 * lettura, quali armi hanno davvero i personaggi e quali dei loro campi il manuale dà diversi. Si legge
 * l'**istantanea** (lo stato vero del 14/11, non la copia locale di `personaggi/`, che può essere di settimane
 * prima) e il file attuale di ciascuno lo scegli `personaggiDellaCartella` (lotto 200): con cinque versioni per
 * personaggio, guardare il primo file col nome giusto vuol dire guardare ottobre.
 *
 * @param cartella  la cartella dei personaggi dell'istantanea (si legge, non si scrive)
 */
export async function perISette(cartella, radice = '.') {
  const { personaggiDellaCartella } = await import('../personaggi-cartella.mjs');
  const p = piano(radice);
  const perId = new Map(p.esiti.map((e) => [e.id, e]));
  const elenco = await personaggiDellaCartella(cartella);
  const righeFuori = [];
  const armi = new Map();
  for (const x of elenco) {
    const j = JSON.parse(readFileSync(`${cartella}/${x.file}`, 'utf8'));
    for (const v of j.scelte?.equipaggiamento ?? []) {
      const id = String(v.rif ?? '').split(':').pop();
      if (!id || !perId.has(id)) continue;
      if (!armi.has(id)) armi.set(id, new Set());
      armi.get(id).add(x.nome ?? x.file);
    }
    righeFuori.push({ nome: x.nome, file: x.file });
  }
  const esiti = [...armi.entries()].map(([id, chi]) => ({ ...perId.get(id), chi: [...chi] }));
  return { personaggi: righeFuori, armi: esiti.sort((a, b) => a.nome.localeCompare(b.nome)) };
}

/** Le righe del rapporto «che cosa cambia per i sette». */
export function righeSette(s) {
  const out = [`Armi dei ${s.personaggi.length} personaggi dell'istantanea: ${s.armi.length} voci di catalogo distinte.`];
  for (const a of s.armi) {
    const diff = a.differenze?.length
      ? a.differenze.map((d) => `${d.nome} ${breve(d.prima)} → ${breve(d.dopo)}`).join(' · ')
      : (a.trovata ? 'nessun campo cambia' : 'non trovata nel manuale col suo nome: nessun campo cambia');
    const segno = a.combattimento?.length ? '⚔ ' : '  ';
    out.push(`  ${segno}${a.nome} — ${diff}`);
    out.push(`      ${a.chi.join(', ')}`);
  }
  const tocche = s.armi.filter((a) => a.combattimento?.length);
  out.push(tocche.length
    ? `Cambiano in combattimento ${tocche.length} armi su ${s.armi.length}: ${tocche.map((a) => a.nome).join(', ')}.`
    : 'Nessuna delle armi dei sette cambia in un campo che si vede in combattimento.');
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['lotto_206_armi.mjs'], 'lotto_206_armi.mjs');
  const sette = process.argv.find((a) => a.startsWith('--sette'));
  if (sette) {
    const c = sette.includes('=') ? sette.split('=')[1] : 'F:/REPOS/mutant/istantanee/stato_2026-11-14_2004/personaggi';
    for (const r of righeSette(await perISette(c))) console.log(r);
    process.exit(0);
  }
  const p = piano();
  const unaVoce = process.argv.find((a) => a.startsWith('--voce='));
  if (unaVoce) {
    const id = unaVoce.slice('--voce='.length);
    console.log(JSON.stringify(p.esiti.find((e) => e.id === id) ?? null, null, 1));
  } else {
    for (const r of righe(p)) console.log(r);
    if (process.argv.includes('--scrivi')) {
      const a = applica(p);
      console.log(`Scritte ${a.voci} voci in ${a.file} file; ${a.aggiornate} portano l'etichetta dell'edizione corrente.`);
    } else {
      console.log('(niente scritto: --scrivi per applicare)');
    }
  }
}
