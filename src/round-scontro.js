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

/**
 * Il tempo passa fino al Round `r` (assoluto): la sessione è a quel Round e le Tecniche finite prima non sono più
 * in corso. Idempotente; un Round precedente a quello della sessione non la cambia.
 */
export function alRound(sessione, r) {
  if (!sessione || !Number.isInteger(r) || r < round(sessione)) return sessione;
  const attive = lista(sessione.tecnicheAttive).filter((x) => x.al === null || x.al >= r);
  if (r === sessione.round && attive.length === lista(sessione.tecnicheAttive).length) return sessione;
  return { ...sessione, round: r, tecnicheAttive: attive };
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
  return {
    ...sessione,
    round: r,
    tecnicheAttive: lista(sessione.tecnicheAttive).map((x) => ({ ...x, dal: sposta(x.dal), al: sposta(x.al) })),
    ultimaTecnica: sessione.ultimaTecnica ? { ...sessione.ultimaTecnica, round: sposta(sessione.ultimaTecnica.round) } : null,
  };
}

/** Fine di tutte le durate delle Tecniche («Termina le durate» della plancia); l'ultima Tecnica resta per il limite del Round. */
export const terminaDurate = (sessione) => (lista(sessione?.tecnicheAttive).length ? { ...sessione, tecnicheAttive: [] } : sessione);

/** Id del partecipante di un PG nello scontro (src/scontro.js → nuovoScontro). */
export const idPg = (chiave) => `pg:${chiave}`;

/**
 * Il PG è in questo scontro aperto? { id, nome, round, durate: [{ stato, nome, al, rimasti }] } oppure null.
 * Le durate sono quelle degli Stati del PG registrate nella plancia.
 */
export function collegamentoScontro(scontro, chiave) {
  if (!scontro || scontro.stato !== 'aperto' || !chiave) return null;
  const id = idPg(chiave);
  if (!lista(scontro.partecipanti).some((p) => p.id === id)) return null;
  const durate = lista(scontro.durate).filter((d) => d.partecipante === id).map((d) => {
    const al = fineStato(d, scontro.round);
    return { stato: d.stato, nome: d.nome, al, rimasti: roundRimasti(al, scontro.round) };
  });
  return { id: scontro.id, nome: scontro.nome, round: scontro.round, durate };
}

/** Ultimo Round di una durata di uno Stato nello scontro (con `al`; i file di prima hanno solo `rimasti`). */
export const fineStato = (d, r) => (Number.isInteger(d?.al) ? d.al : r + (d?.rimasti ?? 1) - 1);

/** Tecniche che finiscono passando dal Round `da` al Round `a` (per l'avviso di scadenza): nomi. */
export function tecnicheScadute(sessione, da, a, dati) {
  return lista(sessione?.tecnicheAttive).filter((x) => x.al !== null && x.al >= da && x.al < a).map((x) => tecnicaDi(x.id, dati)?.nome ?? x.id);
}

/** Stati con una durata nello scontro che non c'è più al Round nuovo: nomi. */
export function statiScaduti(prima, dopo) {
  const restano = new Set(lista(dopo?.durate).map((d) => d.stato));
  return lista(prima?.durate).filter((d) => !restano.has(d.stato)).map((d) => d.nome);
}

/**
 * Durate di un PG per la sua carta nella plancia: Tecniche in corso e Stati con durata, con i Round che restano.
 * @param r Round di riferimento: quello dello scontro se il PG ci è, altrimenti quello della scheda
 * @returns [{ nome, tipo: 'tecnica'|'stato', rimasti: numero o null (a tempo), al }]
 */
export function durateCarta(sessione, collegato, dati) {
  const r = collegato?.round ?? round(sessione);
  const tecniche = lista(sessione?.tecnicheAttive).filter((x) => x.al === null || x.al >= r).map((x) => {
    const t = tecnicaDi(x.id, dati);
    return { nome: t?.nome ?? x.id, tipo: 'tecnica', al: x.al, rimasti: roundRimasti(x.al, r), testo: x.al === null ? (t?.durata ?? 'a tempo') : null };
  });
  const stati = lista(collegato?.durate).map((d) => ({ nome: d.nome, tipo: 'stato', al: d.al, rimasti: d.rimasti }));
  return [...tecniche, ...stati];
}

/** «Aura di Resistenza · 2 Round» per una riga di durata. */
export const testoDurata = (d) => `${d.nome} · ${d.rimasti === null ? d.testo ?? 'a tempo' : `${d.rimasti} Round`}`;
