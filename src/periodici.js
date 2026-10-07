// Perdite periodiche di PV degli Stati al tavolo (Tavolo del Master; docs/tavolo-direttore.md).
// Funzioni pure sullo stato di uno scontro: la plancia (src/ui/tavolo.js) le applica da sé al momento
// giusto, scrivendo i PV nel file del PG con la revisione o nello scontro per i nemici.
//
// Regole (Giocatore 0.45; regole.json → stati.periodici e → stati.elenco[].periodico):
// - §5.15 Sanguinamento: «Alla prima applicazione il personaggio perde immediatamente X PV ignorando
//   Armatura, Parata e Schivata; le applicazioni successive avvengono all'Iniziativa di chi lo ha
//   procurato, al massimo una volta per Round.» «Questa perdita non porta i PV sotto 0 e, quando li
//   riduce a 0, non produce immediatamente una Ferita.» A 0 PV serve una PS di Tempra. Più Sanguinamenti
//   non si sommano: si usa il valore più alto. Finisce solo quando viene fermato.
// - §5.18 Stati: «La prima conseguenza si applica immediatamente; le ricorrenze seguono l'Iniziativa di
//   chi ha procurato l'effetto, al massimo una volta per Round.» Vale anche per Incendiato (1d4 da fuoco)
//   e Avvelenato (danno e frequenza dal veleno).
// - Magia, applicazioni periodiche: «una fonte priva di Iniziativa usa la fine del RND. Se la fonte esce
//   di scena, si conserva la sua Iniziativa.»
//
// Ogni perdita in corso sta nello scontro, in `periodici`: { id, bersaglio, nome, tipo, chiave?, stato,
// valore|formula, fonte, fonteNome, dal, ultimo }. `ultimo` è l'ultimo Round in cui è stata applicata:
// rende l'applicazione idempotente, così due «Avanti» in due finestre non la contano due volte.
import { ordineIniziativa } from './scontro.js';

const lista = (v) => (Array.isArray(v) ? v : []);
const ora = (adesso) => (adesso ?? new Date()).toISOString();
const conRiga = (s, testo, adesso) => ({ ...s, registro: [...s.registro, { ora: ora(adesso), round: s.round, testo }] });

/** Gli Stati di regole.json che hanno una perdita periodica (§5.15, §5.18). */
export function statiPeriodici(dati) {
  return (dati.regole.stati?.elenco ?? []).filter((s) => s.periodico);
}

/** Il blocco `periodico` di uno Stato, oppure null (gli altri Stati restano promemoria). */
export function periodicoDi(stato, dati) {
  return (dati.regole.stati?.elenco ?? []).find((s) => s.id === stato)?.periodico ?? null;
}

/** Nome di uno Stato. */
const nomeStato = (stato, dati) => (dati.regole.stati?.elenco ?? []).find((s) => s.id === stato)?.nome ?? stato;

/** §5.15: la perdita non porta i PV sotto 0. */
export const pvDopoPerdita = (pv, valore) => Math.max(0, (Number.isInteger(pv) ? pv : 0) - Math.max(0, Number(valore) || 0));

/** Le perdite periodiche in corso su un bersaglio. */
export function periodiciDi(s, bersaglio) {
  return lista(s?.periodici).filter((p) => p.bersaglio === bersaglio);
}

/**
 * Registra una perdita periodica, oppure aggiorna quella già in corso per lo stesso Stato e bersaglio
 * (§5.15: più Sanguinamenti non si sommano, si usa il valore più alto). La prima applicazione la fa
 * «Colpito» insieme al colpo, quindi `ultimo` parte dal Round corrente.
 * @param v { bersaglio, nome, tipo: 'pg'|'nemico'|'manuale', chiave? (PG), stato, valore? , formula?, fonte, fonteNome? }
 */
export function registraPeriodico(s, v, adesso, dati) {
  const per = periodicoDi(v.stato, dati);
  if (!per) throw new Error(`${nomeStato(v.stato, dati)} non ha una perdita periodica (regole.json → stati.elenco)`);
  const nome = nomeStato(v.stato, dati);
  // il valore: quello scritto, o la formula dei dati (Incendiato 1d4); Avvelenato lo prende dalla fonte
  const valore = Number.isInteger(v.valore) && v.valore > 0 ? v.valore : null;
  const formula = v.formula ?? (per.danno !== 'valore' && per.danno !== 'dalla_fonte' ? per.danno : null);
  if (valore === null && !formula) throw new Error(`${nome}: serve un valore o una formula del danno per Round (${per.paragrafo})`);
  const in_corso = lista(s.periodici).find((p) => p.bersaglio === v.bersaglio && p.stato === v.stato);
  if (in_corso) {
    // §5.15: non si sommano, si usa il valore più alto; un valore più basso non sostituisce quello in corso
    if (valore !== null && (in_corso.valore ?? 0) >= valore) return s;
    const periodici = lista(s.periodici).map((p) => (p === in_corso ? { ...p, valore, formula, fonte: v.fonte ?? null, fonteNome: v.fonteNome ?? null } : p));
    return conRiga({ ...s, periodici }, `${nome} di ${v.nome}: ${valore ?? formula} PV per Round (era ${in_corso.valore ?? in_corso.formula}: si usa il valore più alto, §5.15).`, adesso);
  }
  const p = {
    id: `${v.bersaglio}|${v.stato}`,
    bersaglio: v.bersaglio, nome: v.nome, tipo: v.tipo ?? 'pg', ...(v.chiave ? { chiave: v.chiave } : {}),
    stato: v.stato, valore, formula,
    fonte: v.fonte ?? null, fonteNome: v.fonteNome ?? null,
    dal: s.round, ultimo: s.round,
  };
  const da = p.fonte ? ` (fonte: ${p.fonteNome ?? p.fonte}, alla sua Iniziativa)` : ' (fonte senza Iniziativa: alla fine del Round)';
  return conRiga({ ...s, periodici: [...lista(s.periodici), p] }, `${nome} ${valore ?? formula} di ${v.nome}${da}: ${per.fine}.`, adesso);
}

/** Chiude le perdite periodiche di un bersaglio per gli Stati indicati (Stato fermato o scaduto). */
export function togliPeriodici(s, bersaglio, stati, adesso, dati) {
  const tolte = lista(s.periodici).filter((p) => p.bersaglio === bersaglio && stati.includes(p.stato));
  if (!tolte.length) return s;
  let t = { ...s, periodici: lista(s.periodici).filter((p) => !tolte.includes(p)) };
  for (const p of tolte) t = conRiga(t, `${nomeStato(p.stato, dati)} di ${p.nome}: fermato.`, adesso);
  return t;
}

/** Il partecipante di turno adesso, e se siamo all'ultimo turno del Round (fonti senza Iniziativa). */
function momento(s) {
  const { ordinati } = ordineIniziativa(s);
  if (!ordinati.length) return { diTurno: null, fineRound: false };
  const i = Math.min(s.turno, ordinati.length - 1);
  return { diTurno: ordinati[i]?.id ?? null, fineRound: i === ordinati.length - 1 };
}

/**
 * Le perdite periodiche dovute adesso: quelle la cui fonte è di turno (o, senza fonte con Iniziativa,
 * all'ultimo turno del Round) e che in questo Round non sono ancora state applicate (una volta per Round).
 * La fonte uscita di scena conserva la sua Iniziativa: la perdita segue l'ultimo turno del Round.
 * @returns [{ ...perdita, valore (null se la dà il dado), formula, pvPrima (nemici), aZeroPv, testoZero }]
 */
export function perditeDovute(s, dati) {
  if (!s || s.stato !== 'aperto') return [];
  const { diTurno, fineRound } = momento(s);
  const presenti = new Set(lista(s.partecipanti).map((p) => p.id));
  return lista(s.periodici).filter((p) => {
    if ((p.ultimo ?? p.dal) >= s.round) return false; // già applicata in questo Round (§5.18: una volta per Round)
    const conIniziativa = p.fonte && presenti.has(p.fonte);
    return conIniziativa ? p.fonte === diTurno : fineRound;
  }).map((p) => {
    const q = lista(s.partecipanti).find((x) => x.id === p.bersaglio);
    const per = periodicoDi(p.stato, dati);
    return {
      ...p,
      nomeStato: nomeStato(p.stato, dati),
      valore: p.valore ?? null,
      formula: p.valore ? null : p.formula,
      ...(q && q.tipo === 'nemico' ? { pvPrima: q.pv.attuali, pvMassimo: q.pv.massimo } : {}),
      aZeroPv: per?.a_zero_pv ?? null,
    };
  });
}

/** Riga dell'avviso e del registro: «Sanguinamento: Lucas perde 1 PV (PV 18 → 17)» (regole.json → stati.periodici.avviso). */
export function testoPerdita(perdita, { pvPrima, pvDopo }, dati) {
  return (dati.regole.stati.periodici.avviso ?? '{stato}: {nome} perde {valore} PV (PV {prima} → {dopo})')
    .replace('{stato}', perdita.nomeStato ?? nomeStato(perdita.stato, dati))
    .replace('{nome}', perdita.nome)
    .replace('{valore}', String(perdita.valore ?? 0))
    .replace('{prima}', String(pvPrima))
    .replace('{dopo}', String(pvDopo));
}

/**
 * Applica una perdita dovuta: segna il Round (una sola volta per Round, anche con due «Avanti» in due
 * finestre), scrive la riga nel registro e, per un nemico, gli scala i PV nello scontro. Per un PG i PV
 * stanno nel suo file: li scrive la plancia e passa qui `pv` per la riga.
 * @param pv { pvPrima, pvDopo } del PG (null per un nemico: si calcolano qui)
 */
export function applicaPerdita(s, perdita, pv, adesso, dati) {
  const in_corso = lista(s.periodici).find((p) => p.id === perdita.id);
  if (!in_corso) throw new Error(`${perdita.nomeStato ?? perdita.stato} di ${perdita.nome}: non è più in corso`);
  if ((in_corso.ultimo ?? in_corso.dal) >= s.round) throw new Error(`${perdita.nomeStato ?? perdita.stato} di ${perdita.nome}: già applicata nel Round ${s.round}`);
  const valore = Number.isInteger(perdita.valore) && perdita.valore > 0 ? perdita.valore : null;
  if (valore === null) throw new Error(`${perdita.nomeStato ?? perdita.stato} di ${perdita.nome}: serve il valore della perdita (${perdita.formula ?? 'nessuna formula'})`);
  const per = periodicoDi(perdita.stato, dati);
  const nemico = lista(s.partecipanti).find((x) => x.id === perdita.bersaglio && x.tipo === 'nemico');
  const prima = nemico ? nemico.pv.attuali : pv?.pvPrima ?? 0;
  const dopo = nemico ? pvDopoPerdita(prima, valore) : pv?.pvDopo ?? pvDopoPerdita(prima, valore);
  let t = {
    ...s,
    periodici: lista(s.periodici).map((p) => (p.id === in_corso.id ? { ...p, ultimo: s.round, valore } : p)),
    ...(nemico ? { partecipanti: s.partecipanti.map((x) => (x.id === nemico.id ? { ...x, pv: { ...x.pv, attuali: dopo } } : x)) } : {}),
  };
  // «Indietro» (07/10): la perdita applicata al turno dell'ultimo «Avanti» si annulla con lui (src/scontro.js → indietro)
  const voce = lista(s.indietro).at(-1);
  if (voce && voce.dopo?.round === s.round && voce.dopo?.turno === s.turno) {
    const perdita_ = { id: in_corso.id, bersaglio: perdita.bersaglio, tipo: nemico ? 'nemico' : 'pg', chiave: perdita.chiave ?? in_corso.chiave ?? null, nome: perdita.nome, ultimoPrima: in_corso.ultimo ?? null, pvPrima: prima, pvDopo: prima === 0 ? 0 : dopo };
    t = { ...t, indietro: [...s.indietro.slice(0, -1), { ...voce, perdite: [...voce.perdite, perdita_], righe: voce.righe + 1 }] };
  }
  // §5.15: già a 0 PV la perdita non toglie PV: serve la Prova Salvezza, che si fa al tavolo
  if (prima === 0) {
    return conRiga(t, `${perdita.nomeStato ?? nomeStato(perdita.stato, dati)} di ${perdita.nome}: è a 0 PV. ${per?.a_zero_pv?.testo ?? 'Serve una PS di Tempra.'}`, adesso);
  }
  const da = perdita.tiro ? ` [${perdita.formula ?? per?.danno}: ${perdita.tiro.valore}, ${perdita.tiro.origine === 'app' ? 'tirato dall’app' : 'dal vivo'}]` : '';
  return conRiga(t, `${testoPerdita({ ...perdita, valore }, { pvPrima: prima, pvDopo: dopo }, dati)}${da}.`, adesso);
}

/**
 * Confronto fra gli Stati attivi al tavolo e le perdite registrate: quali perdite mancano (uno Stato
 * periodico messo a mano dalla scheda o sulla carta del nemico) e quali vanno chiuse (Stato non più attivo).
 * @param bersagli [{ bersaglio, nome, tipo, chiave?, stati: [id degli Stati attivi] }]
 */
export function allineaPeriodici(s, bersagli, dati) {
  const periodici = new Set(statiPeriodici(dati).map((x) => x.id));
  const daRegistrare = [];
  const daChiudere = [];
  for (const b of bersagli) {
    const attivi = lista(b.stati).filter((x) => periodici.has(x));
    const in_corso = periodiciDi(s, b.bersaglio);
    for (const stato of attivi) {
      if (!in_corso.some((p) => p.stato === stato)) daRegistrare.push({ ...b, stato, nomeStato: nomeStato(stato, dati) });
    }
    for (const p of in_corso) {
      // una perdita appena registrata non si chiude nello stesso Round: la plancia potrebbe non avere
      // ancora riletto il file del PG in cui lo Stato è stato scritto (e le perdite valgono dal Round dopo)
      if (!attivi.includes(p.stato) && p.dal < s.round) daChiudere.push({ ...p, nomeStato: nomeStato(p.stato, dati) });
    }
  }
  return { daRegistrare, daChiudere };
}
