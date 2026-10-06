// Round della scheda collegato allo scontro del Tavolo del Master (richiesta di Marcello del 03/10/2026).
// Funzioni pure, usate dalla scheda (src/ui/app.js) e dalla plancia (src/ui/tavolo.js); docs/tavolo-direttore.md.
//
// - Fuori da uno scontro la scheda usa il suo contatore (sessione.round, «Nuovo Round», src/tecniche.js).
// - Con il server e il PG in uno scontro aperto, il Round è quello dello scontro: lo fa avanzare solo la plancia.
//   La scheda non lo scrive a ogni Round: mostra una vista della sessione al Round dello scontro (`alRound`), che
//   diventa la sessione salvata solo quando il giocatore fa qualcosa (per esempio «Attiva»). Le durate sono numeri
//   di Round assoluti (dal, al), quindi la vista è idempotente: nessuna durata si conta due volte.
// - Quando lo scontro comincia, le durate già in corso si spostano sul Round dello scontro con i Round che restano
//   (`riallinea`, la plancia lo scrive nel file del PG); quando finisce, la sessione passa al Round finale dello
//   scontro (`alRound`): la scheda riprende il suo contatore da lì e le durate attive restano con i loro Round.
// - Le regole delle durate (dal Round R alla fine del Round R + N, il Round di attivazione non conta) stanno in
//   data/regole.json → durate_round (Giocatore §8.9.1, §5.18; Magia, «Scadenze e interruzione degli effetti»).
import { tecnicaDi, fineDurata } from './tecniche.js';

export { fineDurata };

const lista = (v) => (Array.isArray(v) ? v : []);
const round = (sessione) => (Number.isInteger(sessione?.round) && sessione.round >= 1 ? sessione.round : 1);


/** Round che restano a una durata che vale fino alla fine del Round `al`, visto dal Round `r` (compreso). */
export const roundRimasti = (al, r) => (al === null || al === undefined ? null : Math.max(0, al - r + 1));

const vale = (r) => (x) => x.al === null || x.al === undefined || x.al >= r;

/**
 * Il tempo passa fino al Round `r` (assoluto): la sessione è a quel Round e le Tecniche e gli incantesimi finiti
 * prima non sono più in corso. Idempotente; un Round precedente a quello della sessione non la cambia.
 */
export function alRound(sessione, r) {
  if (!sessione || !Number.isInteger(r) || r < round(sessione)) return sessione;
  const attive = lista(sessione.tecnicheAttive).filter(vale(r));
  const incantesimi = lista(sessione.incantesimiAttivi).filter(vale(r));
  // modificatori temporanei di Caratteristica in Round (src/temporanei.js): quelli a tempo hanno al = null
  const temporanei = lista(sessione.caratteristicheTemporanee).filter((x) => x.al === null || x.al === undefined || x.al >= r);
  if (r === sessione.round && attive.length === lista(sessione.tecnicheAttive).length && incantesimi.length === lista(sessione.incantesimiAttivi).length && temporanei.length === lista(sessione.caratteristicheTemporanee).length) return sessione;
  return { ...sessione, round: r, tecnicheAttive: attive, ...(Array.isArray(sessione.incantesimiAttivi) ? { incantesimiAttivi: incantesimi } : {}), ...(Array.isArray(sessione.caratteristicheTemporanee) ? { caratteristicheTemporanee: temporanei } : {}) };
}

/**
 * Cambio di contatore senza che passi tempo (inizio dello scontro): le durate in corso e l'ultima Tecnica si
 * spostano sul Round `r`, con gli stessi Round che restano. Idempotente: con la sessione già al Round `r` non cambia.
 */
export function riallinea(sessione, r) {
  if (!sessione || !Number.isInteger(r) || r < 1) return sessione;
  const d = r - round(sessione);
  if (!d) return sessione;
  const sposta = (x) => (x === null || x === undefined ? x : Math.max(1, x + d));
  const durata = (x) => ({ ...x, dal: sposta(x.dal), al: sposta(x.al) });
  return {
    ...sessione,
    round: r,
    tecnicheAttive: lista(sessione.tecnicheAttive).map(durata),
    ...(Array.isArray(sessione.incantesimiAttivi) ? { incantesimiAttivi: sessione.incantesimiAttivi.map(durata) } : {}),
    ...(Array.isArray(sessione.caratteristicheTemporanee) ? { caratteristicheTemporanee: sessione.caratteristicheTemporanee.map((x) => (x.al === null || x.al === undefined ? x : durata(x))) } : {}),
    ultimaTecnica: sessione.ultimaTecnica ? { ...sessione.ultimaTecnica, round: sposta(sessione.ultimaTecnica.round) } : null,
  };
}

/**
 * Fine di tutte le durate di Tecniche e incantesimi («Termina le durate» della plancia); l'ultima Tecnica resta per il
 * limite del Round.
 */
export function terminaDurate(sessione) {
  if (!lista(sessione?.tecnicheAttive).length && !lista(sessione?.incantesimiAttivi).length) return sessione;
  // lista vuota, non chiave tolta: src/tavolo.js → testoConSessione unisce ai valori del file; allineaSessione la toglie
  return { ...sessione, tecnicheAttive: [], ...(sessione.incantesimiAttivi ? { incantesimiAttivi: [] } : {}) };
}

/** Id del partecipante di un PG nello scontro (src/scontro.js → nuovoScontro). */
export const idPg = (chiave) => `pg:${chiave}`;

/**
 * Il PG è in questo scontro aperto? { id, nome, round, durate, periodici, effetti, partecipanti } oppure null.
 * durate: gli Stati del PG registrati nella plancia; periodici: gli Stati che gli togliono PV a ogni Round, con
 * il valore e la fonte (§5.15, §5.18), così la scheda mostra «Sanguinamento · 1 PV per Round»; effetti: gli
 * incantesimi lanciati dai nemici su di lui (scontro → effetti); partecipanti: gli altri, per i bersagli di un lancio.
 */
export function collegamentoScontro(scontro, chiave) {
  if (!scontro || scontro.stato !== 'aperto' || !chiave) return null;
  const id = idPg(chiave);
  if (!lista(scontro.partecipanti).some((p) => p.id === id)) return null;
  const durate = lista(scontro.durate).filter((d) => d.partecipante === id).map((d) => {
    const al = fineStato(d, scontro.round);
    return { stato: d.stato, nome: d.nome, al, rimasti: roundRimasti(al, scontro.round) };
  });
  const periodici = lista(scontro.periodici).filter((p) => p.bersaglio === id)
    .map((p) => ({ stato: p.stato, valore: p.valore ?? null, formula: p.formula ?? null, fonte: p.fonteNome ?? null, ultimo: p.ultimo ?? p.dal }));
  const effetti = effettiSu(scontro, id);
  const partecipanti = lista(scontro.partecipanti).filter((p) => p.id !== id).map((p) => ({ id: p.id, nome: p.nome, tipo: p.tipo }));
  return { id: scontro.id, nome: scontro.nome, round: scontro.round, durate, periodici, effetti, partecipanti };
}

/** Incantesimi lanciati nello scontro (dai nemici) che hanno per bersaglio il partecipante `id`, ancora in corso. */
export function effettiSu(scontro, id) {
  const r = scontro?.round ?? 1;
  return lista(scontro?.effetti).filter((e) => vale(r)(e) && lista(e.bersagli).some((b) => b.id === id))
    .map((e) => ({ uid: e.uid, nome: e.nome, da: e.daNome, al: e.al, rimasti: roundRimasti(e.al, r), testo: e.testo }));
}

/** Ultimo Round di una durata di uno Stato nello scontro (con `al`; i file di prima hanno solo `rimasti`). */
export const fineStato = (d, r) => (Number.isInteger(d?.al) ? d.al : r + (d?.rimasti ?? 1) - 1);

/** Tecniche e incantesimi che finiscono passando dal Round `da` al Round `a` (per l'avviso di scadenza): nomi. */
export function tecnicheScadute(sessione, da, a, dati) {
  const fra = (x) => x.al !== null && x.al !== undefined && x.al >= da && x.al < a;
  return [
    ...lista(sessione?.tecnicheAttive).filter(fra).map((x) => tecnicaDi(x.id, dati)?.nome ?? x.id),
    ...lista(sessione?.incantesimiAttivi).filter(fra).map((x) => x.nome),
    // modificatori temporanei di Caratteristica: «FOR +2 temporaneo» (alla scadenza la Caratteristica torna al valore base)
    ...lista(sessione?.caratteristicheTemporanee).filter(fra).map((x) => `${x.sigla} ${x.valore < 0 ? '−' : '+'}${Math.abs(x.valore)} temporaneo`),
  ];
}

/** Stati con una durata nello scontro che non c'è più al Round nuovo: nomi. */
export function statiScaduti(prima, dopo) {
  const restano = new Set(lista(dopo?.durate).map((d) => d.stato));
  // anche gli incantesimi dei nemici sul PG che non ci sono più (finiti o terminati dal master)
  const incantesimi = new Set(lista(dopo?.effetti).map((e) => e.uid));
  return [...lista(prima?.durate).filter((d) => !restano.has(d.stato)).map((d) => d.nome),
    ...lista(prima?.effetti).filter((e) => !incantesimi.has(e.uid)).map((e) => `${e.nome} (da ${e.da})`)];
}

/**
 * Durate di un PG per la sua carta nella plancia: Tecniche e incantesimi in corso, Stati con durata, incantesimi
 * dei nemici su di lui, con i Round che restano.
 * @param r Round di riferimento: quello dello scontro se il PG ci è, altrimenti quello della scheda
 * @returns [{ nome, tipo: 'tecnica'|'incantesimo'|'stato'|'subito', rimasti: numero o null (a tempo), al, bersagli? }]
 */
export function durateCarta(sessione, collegato, dati) {
  const r = collegato?.round ?? round(sessione);
  const tecniche = lista(sessione?.tecnicheAttive).filter(vale(r)).map((x) => {
    const t = tecnicaDi(x.id, dati);
    return { nome: t?.nome ?? x.id, tipo: 'tecnica', al: x.al, rimasti: roundRimasti(x.al, r), testo: x.al === null ? (t?.durata ?? 'a tempo') : null };
  });
  const incantesimi = lista(sessione?.incantesimiAttivi).filter(vale(r)).map((x) => ({
    nome: x.nome, tipo: 'incantesimo', al: x.al, rimasti: roundRimasti(x.al, r), testo: x.al === null ? x.testo : null, bersagli: lista(x.bersagli),
    concentrazione: !!x.concentrazione,
  }));
  const stati = lista(collegato?.durate).map((d) => ({ nome: d.nome, tipo: 'stato', al: d.al, rimasti: d.rimasti }));
  const subiti = lista(collegato?.effetti).map((e) => ({ nome: `${e.nome} (da ${e.da})`, tipo: 'subito', al: e.al, rimasti: e.rimasti, testo: e.al === null ? e.testo : null }));
  return [...tecniche, ...incantesimi, ...stati, ...subiti];
}

/** «Aura di Resistenza · 2 Round» per una riga di durata. */
export const testoDurata = (d) => `${d.nome} · ${d.rimasti === null ? d.testo ?? 'a tempo' : `${d.rimasti} Round`}`;
