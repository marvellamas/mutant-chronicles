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
//
// Pezzo 3: i nemici. Un tipo del bestiario (nemici/<id>.json, formato di data/formato_nemici.json) entra
// nello scontro in una o più copie con etichette automatiche («Legionario 1», «Legionario 2»…). Ogni copia
// ha una fotografia del tipo, i propri PV attuali, Ferite, Menomazioni, PM e Stati (A.73, decisioni 7–8);
// l'Iniziativa è quella del tipo più il dado, con le stesse regole di parità (DES e INT dalle Caratteristiche
// del tipo; se una manca, spareggio con 1d10: A.73, decisione 6).
import { specTiro, motivoFuoriIntervallo } from './tiri.js';
import { fineDurata } from './tecniche.js';

/** Ultimo Round di una durata registrata (`al`); i file di prima hanno solo i Round rimasti. */
const fineDi = (d, round) => (Number.isInteger(d.al) ? d.al : round + (d.rimasti ?? 1) - 1);

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
export function aggiungiPartecipante(s, { nome, base, lato = 'avversario', des = null, int = null, attacco = null }, adesso) {
  if (!String(nome ?? '').trim() || !Number.isInteger(base)) throw new Error('servono un nome e un’Iniziativa intera');
  const id = `man:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  // pezzo 5: un attacco scritto a mano (stessi campi di un attacco del formato dei nemici), facoltativo
  const att = attaccoManuale(attacco);
  const p = { id, tipo: 'manuale', provvisorio: true, nome: String(nome).trim(), lato: lato === 'alleato' ? 'alleato' : 'avversario', base, des: Number.isInteger(des) ? des : null, int: Number.isInteger(int) ? int : null, d10: null, spareggio: null, ...(att ? { attacco: att } : {}) };
  return conRiga({ ...s, partecipanti: [...s.partecipanti, p] }, `Aggiunto ${p.nome} (provvisorio, ${p.lato}, Iniziativa ${base}${att ? `; ${att.nome} VA ${att.va}, ${att.danno} ${att.natura}` : ''}).`, adesso);
}

/**
 * Aggiunge `quante` copie di un tipo di nemico (file del bestiario, già validato), con etichette
 * numerate dopo tutte quelle già usate per quel tipo nello scontro (anche se tolte: nel registro
 * un'etichetta indica sempre lo stesso nemico), PV pieni e gli Stati con cui il tipo entra in scena.
 */
export function aggiungiNemici(s, nemico, quante = 1, { lato = 'avversario' } = {}, adesso) {
  if (!nemico?.id || !nemico?.nome) throw new Error('tipo di nemico non valido');
  if (!Number.isInteger(quante) || quante < 1 || quante > 30) throw new Error('quante copie: da 1 a 30');
  const gia = s.partecipanti.filter((p) => p.tipo === 'nemico' && p.nemico === nemico.id).map((p) => p.numero);
  const primo = Math.max(0, ...gia, s.numerazione?.[nemico.id] ?? 0) + 1;
  const scheda = structuredClone(nemico);
  const nuovi = Array.from({ length: quante }, (_, i) => {
    const numero = primo + i;
    return {
      id: `nem:${nemico.id}:${numero}`, tipo: 'nemico', nemico: nemico.id, numero, nome: `${nemico.nome} ${numero}`,
      lato: lato === 'alleato' ? 'alleato' : 'avversario', base: nemico.iniziativa,
      des: nemico.caratteristiche?.DES ?? null, int: nemico.caratteristiche?.INT ?? null, d10: null, spareggio: null,
      // A.73, decisione 7: PV attuali e massimi, Stato di Ferita e Menomazioni come i PG; PM per «Lancia!» (decisione 8)
      pv: { attuali: nemico.pv, massimo: nemico.pv }, ferite: 0, menomazioni: [], stati: [...(nemico.stati ?? [])], scheda,
      ...(Number.isInteger(nemico.pm) ? { pm: { attuali: nemico.pm, massimo: nemico.pm } } : {}),
    };
  });
  const etichette = nuovi.length > 1 ? `${nuovi[0].nome} … ${nuovi.at(-1).nome}` : nuovi[0].nome;
  return conRiga({ ...s, partecipanti: [...s.partecipanti, ...nuovi], numerazione: { ...s.numerazione, [nemico.id]: primo + quante - 1 } },
    `Entra${quante > 1 ? 'no' : ''} ${etichette} (${nemico.nome}, ${quante > 1 ? `${quante} copie, ` : ''}${nuovi[0].lato}, Iniziativa ${nemico.iniziativa}, PV ${nemico.pv}).`, adesso);
}

/**
 * PV attuali di un nemico, con la carta ridotta della plancia (richiesta di Marcello dopo la prima prova): quando
 * arriva a 0 PV la carta si riduce a una riga e va in fondo; riaperta resta aperta finché è a 0; sopra 0 torna
 * al suo posto, aperta. L'ordine dei turni non cambia (lo decide il master).
 */
function conPv(p, attuali) {
  const ridotta = attuali === 0 ? (p.pv.attuali > 0 ? true : !!p.ridotta) : false;
  const { ridotta: _, ...resto } = p;
  return { ...resto, pv: { ...p.pv, attuali }, ...(ridotta ? { ridotta: true } : {}) };
}

/** Carta di un nemico a 0 PV ridotta a una riga o riaperta (si salva con lo scontro, senza riga di registro). */
export function riduciNemico(s, id, ridotta) {
  const p = s.partecipanti.find((x) => x.id === id);
  if (p?.tipo !== 'nemico' || p.pv.attuali > 0 || !!p.ridotta === !!ridotta) return s;
  return { ...s, partecipanti: s.partecipanti.map((x) => { if (x.id !== id) return x; const { ridotta: _, ...resto } = x; return ridotta ? { ...resto, ridotta: true } : resto; }) };
}

/**
 * PV di un nemico: −/+ a mano (il danno applicato è il pezzo 4). Fra 0 e il massimo. Più clic di fila
 * sullo stesso nemico nello stesso Round fanno una sola riga di registro («PV 22 → 17»).
 */
export function variaPvNemico(s, id, delta, adesso) {
  const p = s.partecipanti.find((x) => x.id === id);
  if (p?.tipo !== 'nemico') throw new Error('partecipante non trovato fra i nemici');
  const attuali = Math.max(0, Math.min(p.pv.massimo, p.pv.attuali + delta));
  if (attuali === p.pv.attuali) return s;
  const t = { ...s, partecipanti: s.partecipanti.map((x) => (x.id === id ? conPv(x, attuali) : x)) };
  const ultima = s.registro.at(-1);
  const daPrima = ultima?.pv?.id === id && ultima.round === s.round ? ultima.pv.da : p.pv.attuali;
  const diff = attuali - daPrima;
  const riga = { ora: ora(adesso), round: s.round, pv: { id, da: daPrima },
    testo: `${p.nome}: PV ${daPrima} → ${attuali} (${diff > 0 ? '+' : '−'}${Math.abs(diff)})${attuali === 0 ? ', a 0 PV' : ''}.` };
  if (diff === 0) return { ...t, registro: ultima?.pv?.id === id && ultima.round === s.round ? s.registro.slice(0, -1) : s.registro };
  return { ...t, registro: ultima?.pv?.id === id && ultima.round === s.round ? [...s.registro.slice(0, -1), riga] : [...s.registro, riga] };
}

/** PM di un nemico: −/+ a mano, fra 0 e il massimo (A.73, decisione 8). Una riga di registro. */
export function variaPmNemico(s, id, delta, adesso) {
  const p = s.partecipanti.find((x) => x.id === id);
  if (p?.tipo !== 'nemico' || !p.pm) throw new Error('nemico senza PM');
  const attuali = Math.max(0, Math.min(p.pm.massimo, p.pm.attuali + delta));
  if (attuali === p.pm.attuali) return s;
  const t = { ...s, partecipanti: s.partecipanti.map((x) => (x.id === id ? { ...x, pm: { ...x.pm, attuali } } : x)) };
  return { ...t, registro: [...t.registro, { ora: ora(adesso), round: t.round, pm: { id }, testo: `${p.nome}: PM ${p.pm.attuali} → ${attuali}.` }] };
}

/** Seguito di A.84: il Direttore conferma il regime di lancio di un incantesimo del nemico (proposta della carta). */
export function confermaRegimeNemico(s, id, indice, regime, adesso) {
  const p = s.partecipanti.find((x) => x.id === id);
  const voce = p?.scheda?.incantesimi?.[indice];
  if (p?.tipo !== 'nemico' || !voce) throw new Error('incantesimo del nemico non trovato');
  const incantesimi = p.scheda.incantesimi.map((x, k) => (k === indice ? { ...x, regime } : x));
  const t = { ...s, partecipanti: s.partecipanti.map((x) => (x.id === id ? { ...x, scheda: { ...x.scheda, incantesimi } } : x)) };
  return conRiga(t, `${p.nome}: regime di lancio di ${voce.nome} confermato (${regime}).`, adesso);
}

/**
 * «Lancia!» di un nemico (A.73, decisione 8; src/nemico-lancio.js): i PM si scalano dalla sua riserva nello
 * scontro, con una riga di registro. Errore se i PM non bastano.
 * @param l { id, incantesimo, livello, pm, testo? }
 */
export function registraLancioNemico(s, l, adesso, dati = null) {
  const p = s.partecipanti.find((x) => x.id === l.id);
  if (p?.tipo !== 'nemico' || !p.pm) throw new Error('nemico senza PM');
  if (!Number.isInteger(l.pm) || l.pm < 0) throw new Error('costo in PM non valido');
  if (l.pm > p.pm.attuali) throw new Error(`${p.nome}: ${p.pm.attuali} PM, ne servono ${l.pm}`);
  const attuali = p.pm.attuali - l.pm;
  let t = { ...s, partecipanti: s.partecipanti.map((x) => (x.id === l.id ? { ...x, pm: { ...x.pm, attuali } } : x)) };
  // durata dell'incantesimo (src/durate-incantesimi.js): fra gli effetti dello scontro, dal Round del lancio alla fine
  // del Round R + N (regole.json → durate_round); a tempo o fino a una condizione: promemoria senza Round
  const d = l.durata?.durata;
  let durata = '';
  if (d && ['round', 'tempo', 'condizione'].includes(d.tipo)) {
    const al = d.tipo === 'round' ? fineDurata(s.round, d.round, dati) : null;
    const bersagli = (l.durata.bersagli ?? []).map((b) => ({ ...(b.id ? { id: b.id } : {}), nome: b.nome }));
    const uid = `eff:${l.id}:${s.registro.length}`;
    t = { ...t, effetti: [...(s.effetti ?? []), { uid, nome: l.incantesimo, livello: l.livello, da: l.id, daNome: p.nome, dal: s.round, al, testo: d.testo, concentrazione: !!d.concentrazione, bersagli }] };
    durata = `; dura ${d.tipo === 'round' ? `fino alla fine del Round ${al}` : d.testo}${bersagli.length ? `, su ${bersagli.map((b) => b.nome).join(', ')}` : ''}`;
  }
  return conRiga(t, `${p.nome} lancia ${l.incantesimo} (livello ${l.livello}): PM ${p.pm.attuali} → ${attuali}${l.testo ? `; ${l.testo}` : ''}${durata}${attuali === 0 ? '; a 0 PM: sviene finché non recupera almeno 1 PM (Magia sez. 6)' : ''}.`, adesso);
}

/**
 * Stato di un nemico acceso o spento (regole.json → stati.elenco). Le immunità del tipo lo impediscono;
 * spegnendolo si toglie anche la sua durata.
 */
export function cambiaStatoNemico(s, id, stato, attivo, adesso) {
  const p = s.partecipanti.find((x) => x.id === id);
  if (p?.tipo !== 'nemico') throw new Error('partecipante non trovato fra i nemici');
  if (attivo && (p.scheda?.immunita ?? []).includes(stato.id)) throw new Error(`${p.nome} è immune a ${stato.nome}`);
  if (attivo === p.stati.includes(stato.id)) return s;
  const stati = attivo ? [...p.stati, stato.id] : p.stati.filter((x) => x !== stato.id);
  const t = {
    ...s,
    partecipanti: s.partecipanti.map((x) => (x.id === id ? { ...x, stati } : x)),
    durate: attivo ? s.durate : s.durate.filter((d) => !(d.partecipante === id && d.stato === stato.id)),
  };
  return conRiga(t, `${p.nome}: ${stato.nome} ${attivo ? 'attivo' : 'tolto'}.`, adesso);
}

/** Toglie un partecipante scritto a mano o un nemico (i PG escono togliendoli dal tavolo). */
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
// A.73, decisione 6: DES, poi INT; se manca una Caratteristica necessaria al confronto, si va allo spareggio
// (il confronto si ferma lì: un valore mancante non vale 0 e non si salta alla Caratteristica successiva)
function confrontoCar(a, b, car) {
  for (const k of car) {
    if ((a[k] ?? null) === null || (b[k] ?? null) === null) return 0;
    if (a[k] !== b[k]) return b[k] - a[k];
  }
  return 0;
}
const parimerito = (a, b, car) => totale(a) === totale(b) && confrontoCar(a, b, car) === 0;

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
    // Destrezza, poi Intelligenza; con una mancante, direttamente allo spareggio (A.73)
    const c = confrontoCar(a, b, car);
    if (c) return c;
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
export function registraDurata(s, partecipante, stato, tiro, adesso, dati = null) {
  const spec = durataStato(stato);
  if (!spec) throw new Error(`${stato.nome}: durata non in Round (${stato.durata}), solo promemoria`);
  const motivo = motivoFuoriIntervallo(tiro?.valore, spec);
  if (motivo) throw new Error(motivo);
  const p = s.partecipanti.find((x) => x.id === partecipante);
  // Giocatore §5.18: il Round di applicazione non conta, lo Stato finisce alla fine del Round R + N (regole.json → durate_round)
  const al = fineDurata(s.round, tiro.valore, dati);
  const durate = [...s.durate.filter((d) => !(d.partecipante === partecipante && d.stato === stato.id)), { partecipante, stato: stato.id, nome: stato.nome, al, rimasti: al - s.round + 1 }];
  return conRiga({ ...s, durate }, `${stato.nome} di ${p?.nome ?? partecipante}: ${tiro.valore} Round (${spec.formula}, ${tiro.origine === 'app' ? 'tirato dall’app' : 'dal vivo'}), fino alla fine del Round ${al}.`, adesso);
}

/**
 * «Avanti»: il turno passa al successivo; dopo l'ultimo comincia un nuovo Round e finiscono le durate degli Stati
 * il cui ultimo Round (`al`) è passato. Lo Stato di un nemico si toglie qui; quello di un PG lo toglie la plancia dal
 * suo file (src/ui/tavolo.js), che segue lo scontro (src/round-scontro.js).
 * Con `indietroMax` (data/mappa.json → iniziativa.indietro_max) registra in `s.indietro` quello che serve a «Indietro»
 * (ritocchi del 07/10): turno e Round di prima, durate ed effetti finiti, Stati tolti ai nemici, righe del registro.
 */
export function avanti(s, adesso, { indietroMax = 0 } = {}) {
  if (s.stato !== 'aperto') return s;
  const { ordinati } = ordineIniziativa(s);
  if (!ordinati.length) return s;
  const prima = { round: s.round, turno: s.turno, diTurno: ordinati[Math.min(s.turno, ordinati.length - 1)]?.id ?? null };
  const conVoce = (t, extra = {}) => (indietroMax > 0
    ? { ...t, indietro: [...(s.indietro ?? []), { quando: ora(adesso), prima, dopo: { round: t.round, turno: t.turno }, righeInizio: s.registro.length, righe: t.registro.length, durateFinite: [], effettiFiniti: [], statiTolti: [], perdite: [], ...extra }].slice(-indietroMax) }
    : t);
  if (s.turno + 1 < ordinati.length) {
    const t = { ...s, turno: s.turno + 1 };
    return conVoce(conRiga(t, `Tocca a ${ordinati[t.turno].nome}.`, adesso));
  }
  let t = { ...s, round: s.round + 1, turno: 0 };
  const conFine = s.durate.map((d) => { const al = fineDi(d, s.round); return { ...d, al, rimasti: al - t.round + 1 }; });
  const finite = conFine.filter((d) => d.al < t.round);
  t.durate = conFine.filter((d) => d.al >= t.round);
  t = conRiga(t, `Round ${t.round}. Tocca a ${ordinati[0].nome}.`, adesso);
  // incantesimi lanciati dai nemici: finiscono alla fine del Round R + N
  const effettiFiniti = (s.effetti ?? []).filter((e) => e.al !== null && e.al !== undefined && e.al < t.round);
  if (effettiFiniti.length) {
    t = { ...t, effetti: s.effetti.filter((e) => !effettiFiniti.includes(e)) };
    for (const e of effettiFiniti) t = conRiga(t, `${e.nome} di ${e.daNome} è finito.`, adesso);
  }
  const statiTolti = [];
  for (const d of finite) {
    const p = s.partecipanti.find((x) => x.id === d.partecipante);
    if (p?.tipo === 'nemico') {
      // lo Stato di un nemico sta nello scontro: finisce da sé
      if (p.stati.includes(d.stato)) statiTolti.push({ partecipante: p.id, stato: d.stato });
      t = { ...t, partecipanti: t.partecipanti.map((x) => (x.id === p.id ? { ...x, stati: x.stati.filter((y) => y !== d.stato) } : x)) };
      t = conRiga(t, `${d.nome} di ${p.nome} è finito.`, adesso);
    } else t = conRiga(t, `${d.nome} di ${p?.nome ?? d.partecipante} è finito.`, adesso);
  }
  return conVoce(t, { durateFinite: finite, effettiFiniti, statiTolti });
}

/**
 * Quello che farebbe «Indietro» (ritocchi del 07/10), senza cambiare nulla: null se non c'è un «Avanti» da annullare.
 * `altre`: righe del registro scritte dopo quell'«Avanti» che non sono sue (PV, «Colpito», Stati…): restano.
 * `perditePg`: perdite periodiche dei PG applicate a quel turno, i cui PV stanno nei file (li rimette la plancia).
 */
export function anteprimaIndietro(s) {
  const v = (s?.indietro ?? []).at(-1);
  if (!v || s.stato !== 'aperto') return null;
  const { ordinati } = ordineIniziativa(s);
  const chi = ordinati.find((p) => p.id === v.prima.diTurno) ?? ordinati[Math.min(v.prima.turno, ordinati.length - 1)] ?? null;
  return {
    voce: v, round: v.prima.round, cambiaRound: v.prima.round !== s.round, diTurno: chi,
    altre: Math.max(0, s.registro.length - v.righe),
    perditePg: v.perdite.filter((x) => x.tipo === 'pg'),
    passi: s.indietro.length,
  };
}

const conRigheProprie = (pila, v) => (pila.length && Number.isInteger(v.righeInizio)
  ? [...pila.slice(0, -1), { ...pila.at(-1), righe: pila.at(-1).righe + (v.righe - v.righeInizio) + 1 }]
  : pila);

/**
 * «Indietro» (ritocchi del 07/10): annulla l'ultimo «Avanti». Tornano turno e Round, le durate finite (con i Round
 * che restano di nuovo contati dal Round di prima), gli effetti degli incantesimi finiti, gli Stati tolti ai nemici e
 * le perdite periodiche applicate a quel turno (PV dei nemici, se non sono cambiati nel frattempo; Round dell'ultima
 * applicazione). Le altre modifiche fatte dopo (PV, «Colpito», Stati, movimenti) restano. Una riga nel registro.
 */
export function indietro(s, adesso) {
  const a = anteprimaIndietro(s);
  if (!a) return s;
  const v = a.voce;
  const { ordinati } = ordineIniziativa(s);
  const turno = a.diTurno ? ordinati.indexOf(a.diTurno) : 0;
  const round = v.prima.round;
  const chiave = (d) => `${d.partecipante}|${d.stato}`;
  const presenti = new Set(s.durate.map(chiave));
  const durate = [...s.durate, ...v.durateFinite.filter((d) => !presenti.has(chiave(d)))].map((d) => ({ ...d, rimasti: d.al - round + 1 }));
  const uid = new Set((s.effetti ?? []).map((e) => e.uid));
  const effetti = [...(s.effetti ?? []), ...v.effettiFiniti.filter((e) => !uid.has(e.uid))];
  const nonRimessi = [];
  let partecipanti = s.partecipanti.map((p) => {
    const da = v.statiTolti.filter((x) => x.partecipante === p.id && !p.stati.includes(x.stato)).map((x) => x.stato);
    return da.length ? { ...p, stati: [...p.stati, ...da] } : p;
  });
  let periodici = s.periodici;
  for (const pe of v.perdite) {
    if (periodici) periodici = periodici.map((x) => (x.id === pe.id ? { ...x, ultimo: pe.ultimoPrima } : x));
    if (pe.tipo !== 'nemico') continue;
    const n = partecipanti.find((x) => x.id === pe.bersaglio);
    if (n && n.pv.attuali === pe.pvDopo) partecipanti = partecipanti.map((x) => (x === n ? { ...x, pv: { ...x.pv, attuali: pe.pvPrima } } : x));
    else if (n) nonRimessi.push(`${pe.nome} (PV cambiati dopo)`);
  }
  const t = {
    // le righe di questo «Avanti» e quella di «Indietro» non sono «altre modifiche» per l'«Avanti» precedente
    ...s, round, turno: Math.max(0, turno), durate, partecipanti, indietro: conRigheProprie(s.indietro.slice(0, -1), v),
    ...(s.effetti ? { effetti } : v.effettiFiniti.length ? { effetti } : {}),
    ...(periodici ? { periodici } : {}),
  };
  const parti = [`Indietro: torna il turno di ${a.diTurno?.nome ?? '—'}${a.cambiaRound ? `, Round ${round}` : ''}.`];
  if (v.durateFinite.length || v.effettiFiniti.length) parti.push(`Tornano in corso: ${[...v.durateFinite.map((d) => d.nome), ...v.effettiFiniti.map((e) => e.nome)].join(', ')}.`);
  if (v.perdite.length) parti.push(`Perdite periodiche annullate: ${v.perdite.map((p) => p.nome).join(', ')}.`);
  if (nonRimessi.length) parti.push(`PV non rimessi: ${nonRimessi.join(', ')}.`);
  if (a.altre) parti.push(`Restano le modifiche fatte dopo l’«Avanti» (${a.altre} righe del registro).`);
  return conRiga(t, parti.join(' '), adesso);
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
  // «Indietro» (07/10): storico degli «Avanti», facoltativo
  if (s.indietro !== undefined && !(Array.isArray(s.indietro) && s.indietro.every((v) => v && v.prima && Number.isInteger(v.prima.round) && Number.isInteger(v.righe) && Array.isArray(v.durateFinite) && Array.isArray(v.statiTolti) && Array.isArray(v.perdite)))) return 'storico di «Indietro» non valido';
  const nemicoRotto = s.partecipanti.find((p) => p?.tipo === 'nemico'
    && !(Number.isInteger(p.pv?.attuali) && Number.isInteger(p.pv?.massimo) && Array.isArray(p.stati) && p.scheda && typeof p.scheda === 'object'));
  if (nemicoRotto) return `nemico ${nemicoRotto.nome ?? nemicoRotto.id}: PV, Stati o scheda mancanti`;
  // perdite periodiche degli Stati (§5.15, §5.18; src/periodici.js): presenti solo dal 04/10/2026
  if (s.periodici !== undefined) {
    if (!Array.isArray(s.periodici)) return 'periodici non valido';
    const rotta = s.periodici.find((p) => !(p && typeof p.bersaglio === 'string' && typeof p.stato === 'string'
      && (Number.isInteger(p.valore) || typeof p.formula === 'string')
      && Number.isInteger(p.dal) && Number.isInteger(p.ultimo)));
    if (rotta) return `perdita periodica di ${rotta?.nome ?? rotta?.bersaglio ?? '?'}: bersaglio, Stato, valore o Round mancanti`;
  }
  return null;
}

/**
 * Colpo applicato dalla plancia (pezzo 4, src/danno.js → applicaColpo): riga di registro e pila dei colpi per
 * «Annulla ultimo colpo». Per un nemico i valori stanno nello scontro e si aggiornano qui; per un PG nel suo
 * file (la plancia lo riscrive), qui resta la traccia con i valori di prima per annullare.
 * @param colpo { bersaglio: id del partecipante o «pg:<chiave>», nome, tipo: 'pg'|'nemico', file?, testo,
 *   prima: { pv, ferite, menomazioni?, stati }, dopo: { pv, ferite, menomazioni?, stati } }
 */
export function registraColpo(s, colpo, adesso) {
  let t = { ...s, colpi: [...(s.colpi ?? []), { ...colpo, ora: ora(adesso), round: s.round }].slice(-30) };
  if (colpo.tipo === 'nemico') {
    t = { ...t, partecipanti: t.partecipanti.map((p) => (p.id === colpo.bersaglio ? statoNemico(p, colpo.dopo) : p)) };
  }
  return conRiga(t, colpo.testo, adesso);
}

/** Valori di un nemico dopo (o prima di) un colpo: PV, Ferite, Menomazioni e Stati (A.73, decisione 7). */
function statoNemico(p, v) {
  return {
    ...conPv(p, v.pv), stati: v.stati ?? p.stati,
    ...(Number.isInteger(v.ferite) ? { ferite: v.ferite } : {}),
    ...(Array.isArray(v.menomazioni) ? { menomazioni: v.menomazioni } : {}),
  };
}

/** Toglie l'ultimo colpo: per un nemico rimette PV, Ferite, Menomazioni e Stati di prima; restituisce anche il colpo, per il file del PG. */
export function annullaUltimoColpo(s, adesso) {
  const colpo = (s.colpi ?? []).at(-1);
  if (!colpo) throw new Error('nessun colpo da annullare');
  let t = { ...s, colpi: s.colpi.slice(0, -1) };
  if (colpo.tipo === 'nemico') {
    t = { ...t, partecipanti: t.partecipanti.map((p) => (p.id === colpo.bersaglio ? statoNemico(p, colpo.prima) : p)) };
  }
  return { scontro: conRiga(t, `Annullato l’ultimo colpo a ${colpo.nome}: PV ${colpo.dopo.pv} → ${colpo.prima.pv}${colpo.prima.ferite !== undefined && colpo.prima.ferite !== colpo.dopo.ferite ? `, Ferite ${colpo.dopo.ferite} → ${colpo.prima.ferite}` : ''}.`, adesso), colpo };
}

/**
 * Attacco scritto a mano per un partecipante provvisorio (pezzo 5): nome, ravvicinato o a distanza, VA, danno
 * («1d6+2»), natura; portata o gittata predefinite (1 Q, 10 Q). null se mancano i dati essenziali.
 */
export function attaccoManuale(a) {
  if (!a || !String(a.nome ?? '').trim() || !Number.isInteger(a.va) || !/^\d+d\d+([+-]\d+)?$/.test(String(a.danno ?? '').replace(/\s+/g, ''))) return null;
  const distanza = a.tipo === 'distanza';
  return {
    nome: String(a.nome).trim(), tipo: distanza ? 'distanza' : 'ravvicinato', va: a.va, danno: String(a.danno).replace(/\s+/g, ''),
    natura: ['Naturale', 'Magico', 'Etereo'].includes(a.natura) ? a.natura : 'Naturale',
    ...(distanza ? { gittata_q: Number.isInteger(a.gittata_q) ? a.gittata_q : 10, modalita: ['S'] } : { portata_q: Number.isInteger(a.portata_q) ? a.portata_q : 1 }),
  };
}

/**
 * Attacco di un partecipante (pezzo 5, «Attacca!» dei nemici): una riga di registro con chi attacca, chi,
 * con che cosa, il VA, i tiri e l'esito. Va prima della riga del colpo (pezzo 4) se colpisce.
 * @param a { attaccante, bersaglio, arma, va, tiri: [{ valore, origine, esito }], esito }
 */
export function registraAttacco(s, a, adesso) {
  const ESITI = { magistrale: 'Successo Magistrale, colpito', successo: 'colpito', fallimento: 'mancato', maldestro: 'Fallimento Maldestro', automatico: 'colpito (successo automatico, §1.7)', impossibile: 'impossibile' };
  // con più tiri (raffiche, Manovre con più attacchi) l'esito di ciascuno; i tiri non necessari (successo automatico) non si scrivono
  const fatti = (a.tiri ?? []).filter((t) => Number.isInteger(t.valore));
  const tiri = fatti.map((t) => `${t.valore}${t.origine === 'app' ? ' (app)' : ' (dal vivo)'}${fatti.length > 1 ? ` ${ESITI[t.esito] ?? t.esito}` : ''}`).join(', ');
  return conRiga(s, `${a.attaccante} attacca ${a.bersaglio} con ${a.arma}: VA ${a.va}${tiri ? `, tiro ${tiri}` : ''} → ${ESITI[a.esito] ?? a.esito}.`, adesso);
}

/**
 * Attacco di Opportunità segnalato dalla mappa (07/10/2026, Giocatore §5.3): una riga nel registro, con chi può
 * attaccare e chi; nessun tiro. La riga porta { opportunita: { da, contro, movimento? } } per sapere se l'avversario
 * l'ha già avuto in questo Round (una sola volta per Round) e per ritirarla se il movimento si annulla.
 * Se nello scontro letto ora l'avversario l'ha già avuto (un'altra finestra, una scrittura in coda), nessuna riga.
 */
export function rigaOpportunita(s, { da, nomeDa, contro, nomeContro, movimento = null }, adesso) {
  if (opportunitaNelRound(s, da)) return s;
  const t = conRiga(s, `Mappa: ${nomeContro} è uscito dalla ZoC di ${nomeDa}: Attacco di Opportunità di ${nomeDa} nei suoi confronti.`, adesso);
  t.registro[t.registro.length - 1].opportunita = { da, contro, ...(movimento ? { movimento } : {}) };
  return t;
}

/** L'avversario `da` ha già avuto un Attacco di Opportunità segnalato in questo Round? */
export const opportunitaNelRound = (s, da) => (s?.registro ?? []).some((r) => r.round === s.round && r.opportunita?.da === da);

/** «Annulla ultimo movimento» o Ctrl+Z sulla mappa: via le righe degli Attacchi di Opportunità di quel movimento. */
export function senzaOpportunitaDelMovimento(s, movimento) {
  const registro = (s.registro ?? []).filter((r) => r.opportunita?.movimento !== movimento);
  return registro.length === (s.registro ?? []).length ? s : { ...s, registro };
}

/**
 * Movimento «Libero» della mappa di battaglia (primo test di Marcello, 06/10/2026): il master sposta un token dove vuole,
 * fuori dall'area e dal conteggio del movimento; nel registro resta una riga.
 */
/** Template tolti dalla mappa in un colpo (ritocchi del 07/10): una riga nel registro. */
export function rigaTemplateTolti(s, { quanti, temporanei = true }, adesso) {
  return conRiga(s, `Mappa: tolti ${quanti} template${temporanei ? (quanti === 1 ? ' temporaneo' : ' temporanei') : ''}.`, adesso);
}

/** Porta aperta o chiusa da un token sulla mappa (A.125: 1 AzP, senza Prova): una riga nel registro. */
export function rigaPorta(s, { nome, azione, azp = 1 }, adesso) {
  return conRiga(s, `Mappa: ${nome} ${azione === 'apri' ? 'apre' : 'chiude'} una porta (${azp} AzP).`, adesso);
}

export function rigaMovimentoLibero(s, nome, da, a, adesso) {
  return conRiga(s, `Mappa: ${nome} spostato liberamente da (${da.join(', ')}) a (${a.join(', ')}); non conta nel movimento.`, adesso);
}

/**
 * Righe del registro aggiunte (o riscritte: i clic ripetuti su − e + dei PV) fra due stati dello stesso scontro;
 * per uno scontro nuovo, tutte. Le usa la plancia per le conferme delle azioni (src/ui/avvisi.js).
 * @returns {{ testo, chiave: 'pv:<id>' | 'pm:<id>' | null }[]} (chiave: righe dei clic su − e +, un avviso per nemico)
 */
export function righeNuove(prima, dopo) {
  if (!dopo?.registro) return [];
  const vecchie = prima?.id === dopo.id ? prima.registro ?? [] : [];
  let k = 0;
  while (k < vecchie.length && k < dopo.registro.length && vecchie[k].ora === dopo.registro[k].ora && vecchie[k].testo === dopo.registro[k].testo) k++;
  return dopo.registro.slice(k).map((r) => ({ testo: r.testo, chiave: r.pv ? `pv:${r.pv.id}` : r.pm ? `pm:${r.pm.id}` : null }));
}

export function registraRiga(s, testo, adesso) {
  if (!String(testo ?? '').trim()) throw new Error('riga di registro vuota');
  return conRiga(s, String(testo).trim(), adesso);
}

/**
 * Immagine del token di un tipo di nemico (A.131, decisione di Marcello del 06/10/2026: non è una regola) su tutte le
 * sue copie nello scontro: { file, ridotta } in mappe/, oppure null per tornare alle iniziali. Nessuna riga di registro.
 */
export function conImmagineNemico(s, tipo, immagine) {
  const partecipanti = s.partecipanti.map((p) => {
    if (p.tipo !== 'nemico' || p.nemico !== tipo) return p;
    const { immagine: _, ...scheda } = p.scheda ?? {};
    return { ...p, scheda: immagine ? { ...scheda, immagine } : scheda };
  });
  return { ...s, partecipanti };
}
