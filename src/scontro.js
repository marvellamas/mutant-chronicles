// Tavolo del Master, pezzo 2 (docs/tavolo-direttore.md): scontro, Iniziativa, Round e turni. Funzioni
// pure sullo stato di uno scontro (un file in scontri/, server.mjs); ogni modifica restituisce un nuovo
// stato con una riga nel registro. Nessun calcolo delle schede: l'Iniziativa dei PG viene da
// calcolaScheda (src/tavolo.js → vistaPlancia), qui si somma il dado e si ordina.
//
// Regole (Giocatore 0.45):
// - §2.14: Iniziativa = Mod DES + Mod INT; «in combattimento si aggiunge 1d10» (regole.json → iniziativa).
// - §5.1, «Parità di Iniziativa»: «A parità di valore agisce prima chi possiede Destrezza più alta; se
//   anche questa è uguale, prevale Intelligenza più alta. Se la parità persiste, gli alleati scelgono il
//   proprio ordine relativo; fra avversari si tira 1d10 e agisce prima chi ottiene il risultato
//   maggiore. Le ulteriori parità si ritirano soltanto fra i contendenti ancora alla pari. Lo spareggio
//   stabilisce l’ordine e non modifica il Valore di Iniziativa.»
// - Stati (regole.json → stati.elenco[].durata): «1+1d3 Round» e simili; la durata si tira quando lo
//   Stato comincia e scala a fine Round; senza un numero di Round («fino a quando…») solo promemoria.
import { specTiro, motivoFuoriIntervallo } from './tiri.js';

export const FORMATO_SCONTRO = 'mutant-scontro';
export const VERSIONE_SCONTRO = 1;

/** Dado dell'Iniziativa in combattimento dai dati («1d10» → spec di src/tiri.js). */
export function dadoIniziativa(dati) {
  const m = /^(\d+)d(\d+)$/.exec(String(dati.regole.iniziativa?.dado_in_combattimento ?? ''));
  if (!m) throw new Error('regole.json → iniziativa.dado_in_combattimento mancante o non valido');
  return specTiro({ dadi: Number(m[1]), facce: Number(m[2]) });
}

/** Durata di uno Stato in Round dai dati («1+1d3 Round» → spec), oppure null («fino a quando…»). */
export function durataStato(stato) {
  const m = /^(\d+)\s*\+\s*(\d+)d(\d+)\s+Round/.exec(String(stato?.durata ?? ''));
  if (m) return specTiro({ dadi: Number(m[2]), facce: Number(m[3]), fisso: Number(m[1]) });
  const n = /^(\d+)\s+Round/.exec(String(stato?.durata ?? ''));
  return n ? specTiro({ dadi: 0, facce: 1, fisso: Number(n[1]) }) : null;
}

const ora = (adesso) => (adesso ?? new Date()).toISOString();
const conRiga = (s, testo, adesso) => ({ ...s, registro: [...s.registro, { ora: ora(adesso), round: s.round, testo }] });

/**
 * Nuovo scontro con i PG al tavolo. `pg`: [{ chiave, nome, iniziativa, des, int }] (iniziativa effettiva
 * da calcolaScheda, DES e INT per la parità).
 */
export function nuovoScontro({ id, nome, pg = [], adesso = new Date() }) {
  const s = {
    formato: FORMATO_SCONTRO, versione: VERSIONE_SCONTRO, id, nome: nome || `Scontro del ${adesso.toLocaleDateString('it-IT')}`,
    creato: ora(adesso), revisione: 0, stato: 'aperto', round: 1, turno: 0,
    partecipanti: pg.map((p) => ({ id: `pg:${p.chiave}`, tipo: 'pg', chiave: p.chiave, nome: p.nome, lato: 'alleato', base: p.iniziativa, des: p.des ?? null, int: p.int ?? null, d10: null, spareggio: null })),
    ordineAlleati: [], durate: [], registro: [],
  };
  return conRiga(s, `Scontro aperto con ${pg.length ? pg.map((p) => p.nome).join(', ') : 'nessun PG'}.`, adesso);
}

/** Partecipante scritto a mano (i nemici arrivano con il pezzo 3): provvisorio. */
export function aggiungiPartecipante(s, { nome, base, lato = 'avversario', des = null, int = null }, adesso) {
  if (!String(nome ?? '').trim() || !Number.isInteger(base)) throw new Error('servono un nome e un’Iniziativa intera');
  const id = `man:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const p = { id, tipo: 'manuale', provvisorio: true, nome: String(nome).trim(), lato: lato === 'alleato' ? 'alleato' : 'avversario', base, des: Number.isInteger(des) ? des : null, int: Number.isInteger(int) ? int : null, d10: null, spareggio: null };
  return conRiga({ ...s, partecipanti: [...s.partecipanti, p] }, `Aggiunto ${p.nome} (provvisorio, ${p.lato}, Iniziativa ${base}).`, adesso);
}

/** Toglie un partecipante (solo quelli scritti a mano: i PG escono togliendoli dal tavolo). */
export function togliPartecipante(s, id, adesso) {
  const p = s.partecipanti.find((x) => x.id === id);
  if (!p) return s;
  const prima = ordineIniziativa(s).ordinati.findIndex((x) => x.id === id);
  const t = { ...s, partecipanti: s.partecipanti.filter((x) => x.id !== id), ordineAlleati: s.ordineAlleati.filter((x) => x !== id), durate: s.durate.filter((d) => d.partecipante !== id) };
  // chi era di turno resta di turno
  if (prima >= 0 && prima < s.turno) t.turno = Math.max(0, s.turno - 1);
  return conRiga(t, `Tolto ${p.nome}.`, adesso);
}

/**
 * Registra il tiro d'Iniziativa (o lo spareggio) di un partecipante: { valore, origine: 'app'|'manuale' }.
 * @param campo 'd10' oppure 'spareggio'
 */
export function registraTiro(s, id, campo, tiro, dati, adesso) {
  const spec = dadoIniziativa(dati);
  const motivo = motivoFuoriIntervallo(tiro?.valore, spec);
  if (motivo) throw new Error(motivo);
  const p = s.partecipanti.find((x) => x.id === id);
  if (!p) throw new Error('partecipante non trovato');
  const t = { ...s, partecipanti: s.partecipanti.map((x) => (x.id === id ? { ...x, [campo]: { valore: tiro.valore, origine: tiro.origine } } : x)) };
  const testo = campo === 'd10'
    ? `Iniziativa di ${p.nome}: ${p.base} + ${spec.formula} ${tiro.valore} (${tiro.origine === 'app' ? 'tirato dall’app' : 'dal vivo'}) = ${p.base + tiro.valore}.`
    : `Spareggio di ${p.nome}: ${spec.formula} ${tiro.valore} (${tiro.origine === 'app' ? 'tirato dall’app' : 'dal vivo'}).`;
  return conRiga(t, testo, adesso);
}

const totale = (p) => (p.d10 ? p.base + p.d10.valore : null);
const parimerito = (a, b, car) => totale(a) === totale(b) && car.every((k) => (a[k] ?? null) === (b[k] ?? null) || a[k] === null || b[k] === null);

/**
 * Ordine d'Iniziativa (§5.1). Chi non ha ancora tirato resta in fondo, «da tirare».
 * @returns {{ ordinati: object[], daTirare: object[], spareggi: string[][], scelteAlleati: string[][] }}
 *   `spareggi`: gruppi alla pari che comprendono un avversario e senza spareggio completo;
 *   `scelteAlleati`: gruppi di soli alleati alla pari (ordine scelto da loro: s.ordineAlleati)
 */
export function ordineIniziativa(s) {
  const car = ['des', 'int'];
  const conTiro = s.partecipanti.filter((p) => p.d10);
  const pos = (id) => { const i = s.ordineAlleati.indexOf(id); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  const confronta = (a, b) => {
    if (totale(a) !== totale(b)) return totale(b) - totale(a);
    // Destrezza, poi Intelligenza, se note per entrambi
    for (const k of car) if (a[k] !== null && b[k] !== null && a[k] !== b[k]) return b[k] - a[k];
    // alleati fra loro: l'ordine che scelgono; altrimenti lo spareggio con il dado
    if (a.lato === 'alleato' && b.lato === 'alleato') return pos(a.id) - pos(b.id) || a.id.localeCompare(b.id);
    if (a.spareggio && b.spareggio && a.spareggio.valore !== b.spareggio.valore) return b.spareggio.valore - a.spareggio.valore;
    return a.id.localeCompare(b.id);
  };
  const ordinati = [...conTiro].sort(confronta);
  // gruppi ancora alla pari dopo DES e INT
  const gruppi = [];
  for (const p of ordinati) {
    const g = gruppi.find((x) => parimerito(x[0], p, car));
    if (g) g.push(p); else gruppi.push([p]);
  }
  const pari = gruppi.filter((g) => g.length > 1);
  const spareggi = pari.filter((g) => g.some((p) => p.lato === 'avversario'))
    .filter((g) => { const v = g.map((p) => p.spareggio?.valore ?? null); return v.includes(null) || new Set(v).size < v.length; })
    .map((g) => g.map((p) => p.id));
  const scelteAlleati = pari.filter((g) => g.every((p) => p.lato === 'alleato')).map((g) => g.map((p) => p.id));
  return { ordinati, daTirare: s.partecipanti.filter((p) => !p.d10), spareggi, scelteAlleati };
}

/** Sposta un alleato prima (-1) o dopo (+1) nel proprio gruppo alla pari (§5.1: «gli alleati scelgono»). */
export function spostaAlleato(s, id, verso, adesso) {
  const { scelteAlleati } = ordineIniziativa(s);
  const g = scelteAlleati.find((x) => x.includes(id));
  if (!g) return s;
  const ord = ordineIniziativa(s).ordinati.filter((p) => g.includes(p.id)).map((p) => p.id);
  const i = ord.indexOf(id);
  const j = i + verso;
  if (j < 0 || j >= ord.length) return s;
  [ord[i], ord[j]] = [ord[j], ord[i]];
  const resto = s.ordineAlleati.filter((x) => !g.includes(x));
  const p = s.partecipanti.find((x) => x.id === id);
  return conRiga({ ...s, ordineAlleati: [...resto, ...ord] }, `Ordine fra alleati alla pari: ${p.nome} ${verso < 0 ? 'prima' : 'dopo'}.`, adesso);
}

/** Chi agisce ora (o null se nessuno ha tirato). */
export function diTurno(s) {
  const { ordinati } = ordineIniziativa(s);
  return ordinati.length ? ordinati[Math.min(s.turno, ordinati.length - 1)] : null;
}

/**
 * Durata di uno Stato di un partecipante, in Round (tirata o scritta): scala a fine Round.
 * @param stato voce di regole.json → stati.elenco
 */
export function registraDurata(s, partecipante, stato, tiro, adesso) {
  const spec = durataStato(stato);
  if (!spec) throw new Error(`${stato.nome}: durata non in Round (${stato.durata}), solo promemoria`);
  const motivo = motivoFuoriIntervallo(tiro?.valore, spec);
  if (motivo) throw new Error(motivo);
  const p = s.partecipanti.find((x) => x.id === partecipante);
  const durate = [...s.durate.filter((d) => !(d.partecipante === partecipante && d.stato === stato.id)), { partecipante, stato: stato.id, nome: stato.nome, rimasti: tiro.valore }];
  return conRiga({ ...s, durate }, `${stato.nome} di ${p?.nome ?? partecipante}: ${tiro.valore} Round (${spec.formula}, ${tiro.origine === 'app' ? 'tirato dall’app' : 'dal vivo'}).`, adesso);
}

/**
 * «Avanti»: il turno passa al successivo; dopo l'ultimo comincia un nuovo Round e le durate scalano di
 * 1 (a 0 lo Stato è finito: promemoria per toglierlo dalla scheda).
 */
export function avanti(s, adesso) {
  if (s.stato !== 'aperto') return s;
  const { ordinati } = ordineIniziativa(s);
  if (!ordinati.length) return s;
  if (s.turno + 1 < ordinati.length) {
    const t = { ...s, turno: s.turno + 1 };
    return conRiga(t, `Tocca a ${ordinati[t.turno].nome}.`, adesso);
  }
  let t = { ...s, round: s.round + 1, turno: 0 };
  const scalate = s.durate.map((d) => ({ ...d, rimasti: d.rimasti - 1 }));
  const finite = scalate.filter((d) => d.rimasti <= 0);
  t.durate = scalate.filter((d) => d.rimasti > 0);
  t = conRiga(t, `Round ${t.round}. Tocca a ${ordinati[0].nome}.`, adesso);
  for (const d of finite) {
    const p = s.partecipanti.find((x) => x.id === d.partecipante);
    t = conRiga(t, `${d.nome} di ${p?.nome ?? d.partecipante} è finito: toglilo dalla scheda.`, adesso);
  }
  return t;
}

/** Fine scontro: lo stato diventa «chiuso» (il server lo sposta in scontri/archivio/, senza cancellarlo). */
export function chiudi(s, adesso) {
  if (s.stato !== 'aperto') return s;
  return conRiga({ ...s, stato: 'chiuso', chiuso: ora(adesso) }, `Scontro chiuso al Round ${s.round}.`, adesso);
}

/** Controllo minimo di un file di scontro (server e plancia). */
export function validaScontro(s) {
  if (s?.formato !== FORMATO_SCONTRO) return 'non è uno scontro di Mutant';
  if (!/^[a-z0-9-]{1,60}$/.test(String(s.id ?? ''))) return 'id non valido';
  if (!Number.isInteger(s.revisione) || s.revisione < 0) return 'revisione non valida';
  if (!['aperto', 'chiuso'].includes(s.stato)) return 'stato non valido';
  if (!Array.isArray(s.partecipanti) || !Array.isArray(s.registro) || !Array.isArray(s.durate) || !Array.isArray(s.ordineAlleati)) return 'struttura incompleta';
  if (!Number.isInteger(s.round) || s.round < 1 || !Number.isInteger(s.turno) || s.turno < 0) return 'Round o turno non validi';
  return null;
}
