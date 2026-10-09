// Scale dell'Anticipazione (Magia sez. 12.3) dal testo delle schede: aggiunge a ogni aspetto di
// incantesimi.json → meccanica.anticipazione.aspetti il campo «scala» (src/anticipazione.js), oppure
// scala: null con «scala_motivo» quando la scheda non dà una scala leggibile, e a ogni aspetto le
// «conseguenze» che la scheda gli lega (frasi del paragrafo Anticipazione dopo l'elenco).
// Va rilanciato dopo tools/estrai_lancio.py, che riscrive «meccanica»; idempotente.
//   node tools/scale_anticipazione.mjs            prova a vuoto, con il riepilogo
//   node tools/scale_anticipazione.mjs --scrivi   scrive data/incantesimi.json
//   node tools/scale_anticipazione.mjs --elenco   elenca gli aspetti «da definire»
// Le scale approvate da Davide (A.72, e i 32 aspetti della A.109 dell'08/10, con «approvata»: «A.109») stanno in
// tools/anticipazione_approvate.json e prevalgono su quelle estratte; gli aspetti rimasti senza scala ricevono il
// TODO(Davide) A.109.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normValore, valoreAnticipato } from '../src/anticipazione.js';

const RADICE = new URL('../', import.meta.url);
const PERCORSO = new URL('data/incantesimi.json', RADICE);
const APPROVATE = JSON.parse(readFileSync(new URL('tools/anticipazione_approvate.json', RADICE), 'utf8'));
const TODO_A109 = 'A.109: gradino non scritto nella scheda né fra gli esempi approvati (A.72); intanto «da definire al tavolo».';

const TOGLI = new Set(['di', 'del', 'della', 'dei', 'delle', 'al', 'alla', 'ai', 'a', 'il', 'la', 'le', 'lo', 'gli', 'i', 'un', 'una', 'da', 'e', 'per', 'con', 'fino', 'successivo', 'successiva',
  'gradino', 'riga', 'valore', 'ulteriore', 'massimo', 'max', 'nella', 'nel', 'aumentato', 'aumentata', 'scelta', 'propria', 'colonna', 'dal', 'sola', 'due', 'delle', 'dell']);
const tokens = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/)
  .filter((t) => t && !TOGLI.has(t) && !/^\d+$/.test(t) && (t.length >= 2));
const SINONIMI = { ini: 'iniziativa', benef: 'beneficiari', conc: 'concentrazione', con: 'concentrazione', concentr: 'concentrazione', interfer: 'interferenza', rilevaz: 'rilevazione', percez: 'percezione', falsificaz: 'falsificazione', assorb: 'assorbimento' };
const tokensColonna = (c) => tokens(c).map((t) => SINONIMI[t] ?? t);
const affine = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4))));
const CATEGORIA_COLONNA = { durata: /durata|concentr/i, gittata: /gittata|portata|distanza/i, area: /raggio|area|dimension|lunghezza|spessore/i, bersagli: /bersagli|benef|destinatari|animali|partecipanti|dispositivi/i };

/** Colonne della scheda candidate per l'aspetto, con il punteggio di somiglianza del nome. */
function candidate(aspetto, colonne) {
  const at = [...new Set([...tokens(aspetto.nome), ...tokens(aspetto.etichetta)].map((t) => SINONIMI[t] ?? t))].filter((t) => !['anticipazione'].includes(t));
  const punteggio = (c) => at.filter((t) => tokensColonna(c).some((x) => affine(t, x))).length;
  let out = colonne.map((c) => ({ c, p: punteggio(c) })).filter((x) => x.p > 0);
  if (!out.length && CATEGORIA_COLONNA[aspetto.categoria]) out = colonne.filter((c) => CATEGORIA_COLONNA[aspetto.categoria].test(c)).map((c) => ({ c, p: 1 }));
  // «a Concentrazione» / «fissa»: la colonna giusta fra le durate
  const g = aspetto.gradino.toLowerCase();
  // entrambe le modalità nominate («oltre 8 ore Con…, oltre 1 ora fissa…»): restano tutte e due le colonne
  const entrambe = /\bcon\b|concentrazione/i.test(aspetto.gradino) && /fissa/i.test(aspetto.gradino);
  if (!entrambe && out.length > 1 && /concentrazione/.test(g + aspetto.nome.toLowerCase())) out = out.filter((x) => /con/i.test(x.c)) .length ? out.filter((x) => /con/i.test(x.c)) : out;
  if (!entrambe && out.length > 1 && /fissa/.test(g + aspetto.nome.toLowerCase())) out = out.filter((x) => /fiss/i.test(x.c)).length ? out.filter((x) => /fiss/i.test(x.c)) : out;
  const max = Math.max(0, ...out.map((x) => x.p));
  return out.filter((x) => x.p === max).map((x) => x.c);
}

const UNITA = /\s*(RND|round|minuti|minuto|min|ore|ora|giorni|giorno|mesi|mese|anni|anno|Q|kg|km|cm|m|PM)\s*$/;
/** Voci di una sequenza «5 → 10 → 20 RND → 5 minuti», con le unità riportate all'indietro. */
function vociSequenza(testo, aspetto) {
  let t = testo;
  const par = /\(([^()]*→[^()]*)\)/.exec(t);
  if (par) t = par[1];
  else if (t.includes(':') && t.indexOf(':') < t.indexOf('→')) t = t.slice(t.indexOf(':') + 1);
  // fine della sequenza: qualificatori dopo l'ultima voce («, senza superare…», «(massimo 8)», «, che resta il massimo»)
  t = t.replace(/\s*\((?:massimo|max)[^)]*\)\s*$/i, '');
  const pezzi = t.split('→').map((x) => x.trim());
  pezzi[pezzi.length - 1] = pezzi.at(-1).split(/,\s|\s\(|;\s/)[0].trim();
  // la prima voce perde l'etichetta («durata 5», «gittata Contatto», «Mod. PS 0»)
  const etichette = [...tokens(aspetto.nome), ...tokens(aspetto.etichetta), 'durata', 'gittata', 'bersagli', 'beneficiari', 'mod', 'ps', 'raggio', 'concentrazione', 'continuativa', 'massima', 'fissa', 'numero', 'modificatore'];
  let primo = pezzi[0];
  for (let giro = 0; giro < 8; giro++) {
    const m = /^(\S+)\s+(.+)$/.exec(primo);
    if (!m || /^[+−-]?\d/.test(m[1])) break;
    const tt = tokens(m[1]);
    if (!tt.length || tt.every((x) => etichette.some((e) => affine(x, e)))) primo = m[2];
    else break;
  }
  pezzi[0] = primo.replace(/^(da|a)\s+/, '');
  // unità: «5 → 10 → 20 RND» → 5 RND, 10 RND, 20 RND
  const out = [...pezzi];
  let unita = null;
  for (let i = out.length - 1; i >= 0; i--) {
    const u = UNITA.exec(out[i]);
    if (u && /\d/.test(out[i])) unita = u[1];
    else if (unita && /^[+−-]?\d+([.,]\d+)?$/.test(out[i])) out[i] = `${out[i]} ${unita}`;
  }
  return out.filter(Boolean).map(singolare);
}

/** Coppie «da A a B, da B a C» → [A, B, C]. */
function vociCoppie(testo) {
  const coppie = [...testo.matchAll(/da\s+([^,;]+?)\s+a\s+([^,;]+?)(?=,|;|$|\s+a\s+Potere)/g)].map((m) => [m[1].trim(), m[2].trim()]);
  if (!coppie.length) return null;
  // unità della coppia («da 5 a 10 RND» → 5 RND, 10 RND), poi la catena senza ripetizioni
  const conUnita = coppie.map(([a, b]) => {
    const u = UNITA.exec(b);
    return u && /^[+−-]?\d+$/.test(a) ? [`${a} ${u[1]}`, b] : [a, b];
  });
  const out = [conUnita[0][0]];
  for (const [a, b] of conUnita) { if (normValore(out.at(-1)) !== normValore(a)) out.push(a); out.push(b); }
  return out.map(singolare);
}

// «1 ore» → «1 ora» dopo il riporto delle unità
const SINGOLARI = { ore: 'ora', giorni: 'giorno', minuti: 'minuto', mesi: 'mese', anni: 'anno' };
const singolare = (x) => x.replace(/^1 (ore|giorni|minuti|mesi|anni)$/, (_, u) => `1 ${SINGOLARI[u]}`);

const numeroFirmato = (s) => Number(String(s).replace(/[−–]/g, '-').replace(/\s/g, ''));

/** Scala di un aspetto: { scala } oppure { scala: null, scala_motivo }. */
export function scalaAspetto(aspetto, versioni, precedente = null) {
  const colonne = Object.keys(versioni[0] ?? {}).filter((c) => !/^(Livello|PM|Livello e PM)$/.test(c));
  const g = aspetto.gradino;
  const nulla = (motivo) => ({ scala: null, scala_motivo: motivo });
  const cand = candidate(aspetto, colonne);
  // «con la stessa scala» (Arma Mistica, Individuare): la sequenza dell'aspetto precedente, nella propria colonna
  if (/stessa scala/.test(g) && precedente?.scala?.tipo === 'sequenza') {
    const c = cand.find((x) => x !== precedente.scala.colonna && versioni.some((r) => precedente.scala.valori.map(normValore).includes(normValore(r[x]))));
    return c ? { scala: { tipo: 'sequenza', colonna: c, valori: precedente.scala.valori } } : nulla('«stessa scala» dell’aspetto precedente, ma nessuna colonna corrisponde');
  }
  // 1. sequenza scritta: «5 RND → 10 RND → …» oppure «da A a B»
  const seq = g.includes('→') ? vociSequenza(g, aspetto) : /\bda\s+\S+.*\s+a\s+\S+/.test(g) ? vociCoppie(g) : null;
  if (seq && seq.length >= 2) {
    // la colonna: quella i cui valori delle versioni compaiono di più nella sequenza (a pari, il nome)
    // fra le colonne che il nome indica; senza nome, solo con prove forti (gran parte delle versioni e almeno
    // due valori diversi della scala), per non legare la scala alla colonna sbagliata
    const norme = seq.map(normValore);
    const conta = (c) => versioni.filter((r) => norme.includes(normValore(r[c]))).length;
    const distinti = (c) => new Set(versioni.map((r) => normValore(r[c])).filter((x) => norme.includes(x))).size;
    const ammesse = cand.length ? cand : colonne.filter((c) => conta(c) >= 0.6 * versioni.length && distinti(c) >= 2);
    const migliori = ammesse.map((c) => ({ c, n: conta(c), nome: cand.includes(c) })).filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || Number(b.nome) - Number(a.nome));
    const colonna = migliori.length && (migliori.length === 1 || migliori[0].n > migliori[1].n || migliori[0].nome !== migliori[1].nome) ? migliori[0].c : null;
    if (!colonna && seq.length !== 2) {
      return migliori.length ? nulla(`la scala vale per più colonne (${migliori.map((x) => x.c).join(', ')}): si sceglie al tavolo`) : nulla('i valori della tabella non compaiono nella scala della scheda');
    }
    return { scala: { tipo: 'sequenza', colonna, valori: seq } };
  }
  // 2. incremento: «+1 AR, fino a un massimo di 8», «ulteriore −1…, fino a −7», «aumentato di 3, massimo 21»
  const passoTesto = /^(?:ulteriore\s+)?([+−-]\s?\d+)/.exec(g)?.[1] ?? /(?:^|\s)([+−-]\d+)\b/.exec(g.split(/,|\(/)[0])?.[1]
    ?? (/aumentat[oa] di (\d+)/.exec(g)?.[1]) ?? (/peggiorat[oa] di (\d+)/.exec(g) ? `-${/peggiorat[oa] di (\d+)/.exec(g)[1]}` : null);
  if (passoTesto && !/successiv|riga/.test(g)) {
    let passo = numeroFirmato(passoTesto);
    const max = /(?:fino a(?: un massimo di)?|massimo(?: di)?|max)\s*([+−-]?\d+)/.exec(g)?.[1];
    // la colonna deve avere valori numerici (o dadi) nelle versioni
    const numeriche = cand.filter((c) => versioni.some((r) => /^[+−-]?\s*\d|\d+d\d+/.test(String(r[c] ?? '').trim())));
    if (numeriche.length !== 1) return nulla(numeriche.length ? `più colonne possibili (${numeriche.join(', ')})` : 'nessuna colonna numerica della tabella corrisponde all’aspetto');
    // una colonna con più valori («+1 / +3»: generale / mirata) non dice a quale parte va il gradino
    if (versioni.some((r) => String(r[numeriche[0]] ?? '').includes('/'))) return nulla(`la colonna ${numeriche[0]} ha più valori per versione: la parte da aumentare si sceglie al tavolo`);
    // «penalità aumentata di 1, massimo −5»: su valori negativi l'aumento è verso il massimo negativo
    if (passo > 0 && max !== undefined && numeroFirmato(max) < 0) passo = -passo;
    return { scala: { tipo: 'incremento', colonna: numeriche[0], passo, ...(max !== undefined ? { massimo: numeroFirmato(max) } : {}) } };
  }
  // 3. riga successiva della tabella: «alla riga successiva», «valore successivo», «gradino nella durata»
  if (/successiv|riga|gradino|voce/.test(g) || /oltre [^:]+:/.test(g)) {
    if (!cand.length) return nulla('nessuna colonna della tabella corrisponde all’aspetto');
    const oltre = [...g.matchAll(/oltre\s+([^:;,()]+?):\s*([^;,()]+)/g)].map((m) => ({ da: m[1].replace(/\s+(Con|fissa)$/i, '').trim(), a: m[2].trim() }));
    const ultima = /fino a\s+([^,;()]+?)\s+oltre\s+(?:l’ultima riga|la riga|il livello)/.exec(g)?.[1] ?? /con\s+(\S+)\s+come gradino aggiuntivo/.exec(g)?.[1];
    return { scala: { tipo: 'riga_successiva', colonne: cand, ...(oltre.length ? { oltre } : {}), ...(ultima ? { oltre_ultima: ultima.trim() } : {}) } };
  }
  return nulla('la scheda nomina l’aspetto senza scrivere la scala dei gradini');
}

/** Frasi del paragrafo Anticipazione dopo l'elenco degli aspetti (conseguenze, divieti). */
export function conseguenze(anticipazione) {
  // «Mod. PS» non chiude la frase
  const frasi = String(anticipazione.frase ?? '').replace(/Mod\. /g, 'Mod·').split(/(?<=\.)\s+/).map((f) => f.replace(/Mod·/g, 'Mod. '));
  const i = frasi.findIndex((f) => /^(Si sceglie|È consentita soltanto|È anticipabile soltanto)/.test(f));
  // gli esempi restano nel testo della scheda: qui solo regole
  return i >= 0 ? frasi.slice(i + 1).filter((f) => f.trim() && !/^Esempio/.test(f)) : [];
}

export function applicaScale(dati) {
  const riepilogo = { schede: 0, aspetti: 0, conScala: 0, daDefinire: [] };
  for (const inc of dati.incantesimi) {
    const a = inc.meccanica?.anticipazione;
    if (!a?.aspetti?.length) continue;
    riepilogo.schede++;
    const dopo = conseguenze(a);
    a.aspetti.forEach((x, j) => {
      riepilogo.aspetti++;
      delete x.scala; delete x.scala_motivo; delete x.conseguenze; delete x['TODO(Davide)'];
      const approvata = APPROVATE[inc.nome]?.[x.nome];
      if (approvata) { x.scala = { approvata: 'A.72', ...approvata }; riepilogo.approvate = (riepilogo.approvate ?? 0) + 1; }
      else Object.assign(x, scalaAspetto(x, inc.versioni ?? [], a.aspetti[j - 1]));
      // una conseguenza vale per l'aspetto che nomina (es. «Se aumenta l’AR si ricalcola la penalità al Passo»)
      const mie = dopo.filter((f) => tokens(x.nome).some((t) => t.length >= 2 && tokens(f).some((y) => affine(t, y))));
      if (mie.length) x.conseguenze = mie;
      // controllo: la scala dà un valore per almeno una versione
      if (x.scala) {
        const prova = (inc.versioni ?? []).map((r) => valoreAnticipato(x, r, inc.versioni)).filter((v) => !v.daDefinire);
        if (!prova.length) { x.scala_motivo = `i valori della tabella non compaiono nella scala (${x.scala.tipo})`; x.scala = null; }
      }
      if (x.scala) riepilogo.conScala++;
      else x['TODO(Davide)'] = TODO_A109;
      if (!x.scala) riepilogo.daDefinire.push(`${inc.scheda} ${inc.nome} — ${x.nome}: ${x.scala_motivo}`);
    });
  }
  return riepilogo;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const testo = readFileSync(PERCORSO, 'utf8');
  const dati = JSON.parse(testo);
  const r = applicaScale(dati);
  console.log(`${r.schede} schede, ${r.aspetti} aspetti: ${r.conScala} con la scala (${r.approvate ?? 0} approvate: A.72 e A.109), ${r.daDefinire.length} da definire al tavolo`);
  if (process.argv.includes('--elenco')) for (const x of r.daDefinire) console.log(`- ${x}`);
  if (process.argv.includes('--scrivi')) writeFileSync(PERCORSO, `${JSON.stringify(dati, null, 2)}\n`);
}
