// Lettore delle 90 schede d'incantesimo del Manuale della Magia (lotto 211, 17/11/2026).
//
// Perché esiste. Le schede dei dati (`data/incantesimi.json`) erano state estratte dal PDF una volta sola, e dopo di
// allora il manuale è passato dalla 1.1 alla 1.19 senza che nessuno potesse dire *quali* schede fossero cambiate:
// il confronto con il manuale era a occhio. Qui c'è il lettore, con le lezioni dei lotti 204, 205 e 206:
//
//  - le etichette delle tabelle si **censiscono**, non si indovinano (`etichetteDelleTabelle`): una colonna rinominata
//    compare nel referto invece di far cadere in silenzio delle voci;
//  - una lettura parziale non si scrive mai sopra un valore buono (`unisciScheda`): una scheda con meno versioni di
//    prima, o con una riga che ha perso una colonna, è parziale — non vuota — e il valore di prima resta, dichiarato;
//  - la provenienza è per campo (`_edizione.campi`), e il segno nella scheda si spegne da sé quando tutti i campi sono
//    all'edizione corrente (`campiIndietro`);
//  - **la rete**: il lettore si prova prima sull'edizione da cui i dati vengono (la 1.11): ogni differenza che trova
//    lì è un difetto del lettore e non del manuale (`tests/incantesimi-lettore-211.test.js`). Solo dopo si legge la
//    corrente.
//
// Non scrive niente da solo: `node tools/importa-incantesimi.mjs` stampa il confronto; la scrittura dei dati è il
// generatore di lotto `tools/lotti/lotto_211_magia.mjs`.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { testoManuale, registro } from './manuali.mjs';
import { CAMPI_LETTI } from '../src/provenienza-incantesimi.js';

/** Il testo senza il Markdown: grassetti, escape di Google Docs, titoli. Non tocca lo spazio. */
export function pulisci(s) {
  return String(s ?? '')
    .replace(/\*\*/g, '')
    .replace(/\\([\\`*_{}\[\]()#+\-.!=<>|~$])/g, '$1')
    .replace(/ /g, ' ')
    .trim();
}

/** Per confrontare: niente spazi, niente differenze di virgolette. Il valore resta quello del dato. */
export function chiave(s) {
  return pulisci(s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[−–—]/g, '-').replace(/\s+/g, '');
}

const RIGA_SCHEDA = /^Scheda (\d+)\.(\d+)\s*•\s*(.*)$/;

/**
 * Due tabelle di fila senza una riga vuota in mezzo sono un solo blocco di righe «|»: la nuova comincia dove la riga
 * seguente è un separatore («| :---: |»). Senza questo la seconda tabella finiva dentro la prima come righe di dati
 * (lo ha trovato la prova sulla 1.11, la base da cui i dati vengono).
 */
const SEPARATORE = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
/** Una riga di tabella con **tutte** le celle piene in grassetto: è un'intestazione (una riga di dati ha il grassetto solo su una parola). */
function tuttaInGrassetto(riga) {
  const celle = riga.trim().replace(/^[|]/, '').replace(/[|]$/, '').split('|').map((c) => c.trim()).filter(Boolean);
  return celle.length > 0 && celle.every((c) => c.startsWith('**') && c.endsWith('**') && c.indexOf('**', 2) === c.length - 2);
}

export function dividiTabelle(righe) {
  const inizi = [0];
  for (let i = 1; i < righe.length; i++) {
    if (SEPARATORE.test(righe[i].trim())) continue;
    const seguitaDaSeparatore = i + 1 < righe.length && SEPARATORE.test(righe[i + 1].trim());
    // la seconda tabella di una scheda ha spesso l'intestazione in grassetto e **nessun separatore** (13.5, 20.8, 21.4):
    // una riga col primo campo in grassetto, dopo righe di dati, apre una tabella nuova
    const intestazioneInGrassetto = tuttaInGrassetto(righe[i]) && !tuttaInGrassetto(righe[i - 1]);
    if (seguitaDaSeparatore || intestazioneInGrassetto) inizi.push(i);
  }
  return inizi.map((da, k) => righe.slice(da, inizi[k + 1] ?? righe.length));
}

/** Le righe di una tabella Markdown → { colonne, righe: [{colonna: cella}] }. */
function leggiTabella(righe) {
  const celle = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => pulisci(c));
  const colonne = celle(righe[0]);
  const vuote = new Set(colonne.map((c, i) => (c === '' ? i : -1)).filter((i) => i >= 0));
  const corpo = righe.slice(righe[1] && SEPARATORE.test(righe[1].trim()) ? 2 : 1).filter((r) => r.trim().startsWith('|')).map(celle);
  const tenute = colonne.filter((_, i) => !vuote.has(i));
  return { colonne: tenute, righe: corpo.map((c) => Object.fromEntries(colonne.map((k, i) => [k, c[i] ?? '']).filter((_, i) => !vuote.has(i)))) };
}

/**
 * Le schede del testo: [{ nome, scheda, intestazione, macrofamiglia, specializzazione, lancio, descrizione,
 * tabelle: [{colonne, righe}], regole }]. Una scheda comincia dalla riga «**Nome**» che precede «Scheda N.M • …» e finisce
 * alla scheda successiva o al titolo di sezione (`# `); i `###` stanno dentro la scheda.
 */
export function leggiSchedeMagia(testo) {
  const righe = String(testo).split(/\r?\n/);
  const inizi = [];
  for (let i = 0; i < righe.length; i++) {
    if (!RIGA_SCHEDA.test(righe[i].trim())) continue;
    // il nome è la riga non vuota che precede
    let j = i - 1;
    while (j >= 0 && !righe[j].trim()) j--;
    inizi.push({ riga: i, nome: pulisci(righe[j]), inizioNome: j });
  }
  const schede = [];
  for (let k = 0; k < inizi.length; k++) {
    const { riga, nome } = inizi[k];
    let fine = k + 1 < inizi.length ? inizi[k + 1].inizioNome : righe.length;
    for (let r = riga + 1; r < fine; r++) if (/^#{1,2}\s/.test(righe[r])) { fine = r; break; }
    const blocco = righe.slice(riga + 1, fine);
    const m = RIGA_SCHEDA.exec(righe[riga].trim());
    const intestazione = pulisci(righe[riga]);
    const mf = /Macrofamiglia\s+([^•]+?)\s*•/.exec(intestazione)?.[1]?.trim() ?? null;
    const sp = /Specializzazione\s+([^•]+?)\s*•/.exec(intestazione)?.[1]?.trim() ?? null;

    // lancio: la riga «**Lancio:** …»
    // (la Rigenerazione, 21.10, la scrive «Lancio diretto: …» senza grassetto)
    const iLancio = blocco.findIndex((l) => /^(\*\*)?Lancio\b/.test(l.trim()));
    const lancio = iLancio >= 0 ? pulisci(blocco[iLancio]) : null;
    // la prima tabella
    const iTab = blocco.findIndex((l) => l.trim().startsWith('|'));
    const tabelle = [];
    let fineTab = iTab;
    let r = iTab;
    while (r >= 0 && r < blocco.length) {
      if (blocco[r].trim().startsWith('|')) {
        let e = r;
        while (e < blocco.length && blocco[e].trim().startsWith('|')) e++;
        for (const pezzo of dividiTabelle(blocco.slice(r, e))) tabelle.push(leggiTabella(pezzo));
        if (tabelle.length >= 1 && fineTab === iTab) fineTab = e;
        r = e;
      } else r++;
    }
    const descr = (iLancio >= 0 ? blocco.slice(iLancio + 1, iTab >= 0 ? iTab : blocco.length) : [])
      .map((l) => pulisci(l)).filter(Boolean);
    const dopo = (iTab >= 0 ? blocco.slice(fineTab) : [])
      .filter((l) => !l.trim().startsWith('|'))
      .map((l) => pulisci(l.replace(/^#{1,6}\s*/, ''))).filter(Boolean);
    schede.push({
      nome, scheda: `${m[1]}.${m[2]}`, intestazione, macrofamiglia: mf, specializzazione: sp,
      lancio, descrizione: descr.join('\n'), tabelle, regole: dopo.join('\n'),
    });
  }
  return schede;
}

/** Le etichette (intestazioni di colonna) di tutte le tabelle, con quante volte compaiono: il censimento del lotto 204. */
export function etichetteDelleTabelle(schede) {
  const c = {};
  for (const s of schede) for (const t of s.tabelle) for (const k of t.colonne) c[k] = (c[k] ?? 0) + 1;
  return c;
}

/** Il campo di un dato d'incantesimo come lo leggeremmo: la tabella principale e le altre. */
const VERSIONI_DATO = (i) => i.versioni ?? [];

/** Una riga di tabella dei dati e una letta: stessa se tutte le celle coincidono a meno di spazi e virgolette. */
function righeUguali(a, b) {
  const ka = Object.keys(a); const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => k in b && chiave(a[k]) === chiave(b[k]));
}

/**
 * Confronto di una scheda letta con quella dei dati, campo per campo. Esiti per campo: 'uguale', 'cambiato',
 * 'parziale' (la lettura ha meno di quello che c'è: NON si scrive). Torna { campi: {campo: {esito, ...}}, eventi }.
 */
export function confrontaScheda(letta, dato) {
  const campi = {};
  const cmp = (campo, a, b) => { campi[campo] = { esito: chiave(a) === chiave(b) ? 'uguale' : 'cambiato', letto: a, dato: b }; };
  cmp('nome', letta.nome, dato.nome);
  cmp('intestazione', letta.intestazione, dato.intestazione);
  cmp('macrofamiglia', letta.macrofamiglia, dato.macrofamiglia);
  cmp('specializzazione', letta.specializzazione, dato.specializzazione);
  // il lancio nei dati non porta il grassetto; «Lancio:» sì
  cmp('lancio', letta.lancio, dato.lancio);
  cmp('descrizione', letta.descrizione, dato.descrizione);
  cmp('regole', letta.regole, dato.regole);

  // la tabella principale: una riga per livello
  const tl = letta.tabelle[0]?.righe ?? [];
  const td = VERSIONI_DATO(dato);
  if (!tl.length && td.length) campi.versioni = { esito: 'parziale', motivo: 'tabella principale non letta', letto: 0, dato: td.length };
  else if (tl.length < td.length) campi.versioni = { esito: 'parziale', motivo: `${tl.length} righe lette su ${td.length}`, letto: tl.length, dato: td.length };
  else {
    const secondaPerLivello = new Map((letta.tabelle[1]?.righe ?? []).map((r) => [chiave(r.Livello ?? ''), r]));
    // i dati uniscono a volte due tabelle con lo stesso «Livello» in una sola riga larga (20.8): la riga è uguale se le celle
    // che ha in più coincidono con quelle della seconda tabella dello stesso livello
    const riga = (r, d) => righeUguali(r, d) || (() => {
      const s = secondaPerLivello.get(chiave(r.Livello ?? ''));
      if (!s) return false;
      const unita = { ...r };
      for (const [k, v] of Object.entries(s)) if (k in d && !(k in r)) unita[k] = v;
      return righeUguali(unita, d);
    })();
    const uguali = tl.length === td.length && tl.every((r, i) => riga(r, td[i]));
    campi.versioni = { esito: uguali ? 'uguale' : 'cambiato', letto: tl.length, dato: td.length };
    if (!uguali) campi.versioni.righe = tl.map((r, i) => (td[i] && riga(r, td[i]) ? null : { riga: i, letta: r, dato: td[i] ?? null })).filter(Boolean);
  }
  // le altre tabelle
  const altreL = letta.tabelle.slice(1);
  const altreD = (dato.altre_tabelle ?? []);
  if (altreL.length < altreD.length) campi.altre_tabelle = { esito: 'parziale', motivo: `${altreL.length} tabelle lette su ${altreD.length}` };
  else {
    const uguali = altreL.length === altreD.length && altreL.every((t, i) => {
      const rd = altreD[i].righe ?? [];
      return t.righe.length === rd.length && t.righe.every((r, j) => righeUguali(r, rd[j]));
    });
    campi.altre_tabelle = { esito: uguali ? 'uguale' : 'cambiato' };
  }
  return campi;
}

/** I campi che un confronto dichiara cambiati / parziali. */
export const campiConEsito = (campi, esito) => Object.entries(campi).filter(([, v]) => v.esito === esito).map(([k]) => k);

/**
 * Il quadro: appaia le schede lette ai dati **per numero di scheda** (e verifica il nome: se il numero e il nome
 * non combaciano non si appaia, si dichiara), e conta uguali / cambiate / nuove / sparite.
 */
export function quadro(schede, dati) {
  const perNumero = new Map(dati.incantesimi.map((i) => [i.scheda, i]));
  const viste = new Set();
  const voci = [];
  for (const s of schede) {
    const d = perNumero.get(s.scheda);
    viste.add(s.scheda);
    if (!d) { voci.push({ scheda: s.scheda, nome: s.nome, stato: 'nuova' }); continue; }
    if (chiave(d.nome) !== chiave(s.nome)) { voci.push({ scheda: s.scheda, nome: s.nome, nomeDato: d.nome, stato: 'nome_diverso' }); continue; }
    const campi = confrontaScheda(s, d);
    const cambiati = campiConEsito(campi, 'cambiato');
    const parziali = campiConEsito(campi, 'parziale');
    voci.push({ scheda: s.scheda, nome: s.nome, stato: parziali.length ? 'parziale' : cambiati.length ? 'cambiata' : 'invariata', cambiati, parziali, campi });
  }
  const sparite = dati.incantesimi.filter((i) => !viste.has(i.scheda)).map((i) => ({ scheda: i.scheda, nome: i.nome, stato: 'sparita' }));
  const conta = (st) => [...voci, ...sparite].filter((v) => v.stato === st).length;
  return {
    voci: [...voci, ...sparite],
    conto: { schede: schede.length, invariate: conta('invariata'), cambiate: conta('cambiata'), parziali: conta('parziale'), nuove: conta('nuova'), sparite: conta('sparita'), nome_diverso: conta('nome_diverso') },
  };
}

/** Le colonne che dicono quanto costa lanciare: è il valore con cui il giocatore spende i PM. */
export const COLONNE_COSTO = /^(PM|Livello e PM|PM base)$/;

/**
 * **I costi in PM di ogni versione, letti dal manuale e confrontati con quelli scritti nei dati** (lotto 211): una lista
 * di scostamenti, vuota se tutti i costi coincidono. È il controllo che deve fallire se una scheda dichiara un costo che il
 * manuale corrente non dichiara — e non ammette «parziale»: una tabella con meno righe di quelle dei dati è uno scostamento.
 */
export function differenzePm(schede, dati) {
  const perNumero = new Map(dati.incantesimi.map((i) => [i.scheda, i]));
  const out = [];
  for (const s of schede) {
    const d = perNumero.get(s.scheda);
    if (!d) { out.push({ scheda: s.scheda, nome: s.nome, problema: 'scheda assente dai dati' }); continue; }
    const tl = s.tabelle[0]?.righe ?? [];
    if (tl.length !== (d.versioni ?? []).length) { out.push({ scheda: s.scheda, nome: s.nome, problema: `${tl.length} righe nel manuale, ${(d.versioni ?? []).length} nei dati` }); continue; }
    tl.forEach((riga, i) => {
      // le colonne di costo di **tutte e due** le parti: un costo scritto nei dati che il manuale non ha è uno scostamento come gli altri
      const colonne = new Set([...Object.keys(riga), ...Object.keys(d.versioni[i] ?? {})].filter((c) => COLONNE_COSTO.test(c)));
      for (const col of colonne) {
        const val = riga[col]; const dato = d.versioni[i]?.[col];
        if (chiave(val) !== chiave(dato)) out.push({ scheda: s.scheda, nome: s.nome, riga: i, colonna: col, manuale: val ?? null, dato: dato ?? null });
      }
    });
  }
  return out;
}

/**
 * La regola del 204 come **proprietà verificabile**: dopo un'unione, ogni campo per cui la lettura era parziale deve essere
 * identico a prima. Torna i campi che la violano (vuoto = rispettata). Serve al test, che la prova anche su un'unione
 * sbagliata apposta (il mutante): un controllo che non sa fallire non prova niente.
 */
export function sovrascrittaParziale(prima, dopo, letta) {
  const campi = confrontaScheda(letta, prima);
  return campiConEsito(campi, 'parziale').filter((c) => JSON.stringify(prima[c === 'altre_tabelle' ? 'altre_tabelle' : c]) !== JSON.stringify(dopo[c === 'altre_tabelle' ? 'altre_tabelle' : c]));
}

// ——— la scrittura (usata dal generatore di lotto) ———

/** I campi di una scheda dei dati che il lettore sa leggere e quindi sa aggiornare. */
export { CAMPI_LETTI };

/**
 * L'unione per campo, con la regola del lotto 204: **una lettura parziale non si scrive mai sopra un valore buono**.
 * Torna { scheda, scritti: [campo], tenuti: [{campo, motivo}] }. I campi non riletti (meccanica, id, pagina, livello_base)
 * non si toccano mai: li decidono altri strumenti.
 */
export function unisciScheda(dato, letta, edizione) {
  const campi = confrontaScheda(letta, dato);
  const nuova = structuredClone(dato);
  const scritti = []; const tenuti = [];
  for (const campo of CAMPI_LETTI) {
    const c = campi[campo];
    if (!c) continue;
    if (c.esito === 'uguale') continue;
    if (c.esito === 'parziale') { tenuti.push({ campo, motivo: c.motivo }); continue; }
    // cambiato: si scrive il valore letto
    if (campo === 'versioni') nuova.versioni = letta.tabelle[0].righe;
    else if (campo === 'altre_tabelle') nuova.altre_tabelle = letta.tabelle.slice(1).map((t) => ({ righe: t.righe }));
    else nuova[campo] = letta[campo];
    scritti.push(campo);
  }
  // la provenienza per campo
  const prima = dato._edizione?.campi ?? {};
  const nuovaProv = { ...prima };
  for (const campo of CAMPI_LETTI) {
    if (tenuti.some((t) => t.campo === campo)) continue; // resta com'era
    if (campi[campo]?.esito === 'uguale' || scritti.includes(campo)) nuovaProv[campo] = edizione;
  }
  nuova._edizione = { corrente: edizione, campi: nuovaProv };
  return { scheda: nuova, scritti, tenuti };
}

/** I campi di una scheda che non sono all'edizione corrente: il segno nella scheda si spegne quando è vuoto. */
export function campiIndietro(scheda, edizioneCorrente) {
  const camp = scheda._edizione?.campi ?? {};
  return CAMPI_LETTI.filter((c) => camp[c] !== edizioneCorrente);
}

// ——— riga di comando ———
const ESEGUITO_DIRETTAMENTE = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (ESEGUITO_DIRETTAMENTE) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  const id = arg('testo') ?? 'magia';
  const testo = arg('file') ? readFileSync(arg('file'), 'utf8') : testoManuale(id);
  const dati = JSON.parse(readFileSync(new URL('../data/incantesimi.json', import.meta.url), 'utf8'));
  const schede = leggiSchedeMagia(testo);
  const q = quadro(schede, dati);
  console.log(`Schede lette: ${schede.length} (registro: Magia ${registro().manuali.find((m) => m.id === 'magia').versione})`);
  console.log(JSON.stringify(q.conto));
  for (const v of q.voci.filter((x) => x.stato !== 'invariata')) console.log(`  ${v.scheda} ${v.nome}: ${v.stato}${v.cambiati?.length ? ` — cambiati: ${v.cambiati.join(', ')}` : ''}${v.parziali?.length ? ` — PARZIALI: ${v.parziali.join(', ')}` : ''}`);
  console.log('Etichette delle tabelle:', Object.keys(etichetteDelleTabelle(schede)).length);
}
