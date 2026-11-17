// Da quale edizione della Magia viene ogni campo di una scheda d'incantesimo (lotto 211).
//
// Stessa idea delle armi (`src/provenienza-catalogo.js`, lotto 206) e dei mostri (`src/provenienza-bestiario.js`, 204):
// la provenienza sta **sul campo**, in `_edizione.campi` della scheda, e il segno nella scheda dice a parole quali campi non
// sono dell'edizione corrente — e **si spegne da sé** quando la scheda è tutta a posto. Funzioni pure, nessuna scrittura.
//
// «Edizione corrente» è quella che i dati dichiarano in `incantesimi.corpus.edizione`: un numero scritto qui dentro sarebbe
// un posto in più in cui restare indietro in silenzio (nona regola dei manuali, lotto 191).

/** I campi di una scheda che il lettore (`tools/importa-incantesimi.mjs`) sa rileggere dal manuale. */
export const CAMPI_LETTI = ['nome', 'intestazione', 'macrofamiglia', 'specializzazione', 'lancio', 'descrizione', 'versioni', 'regole', 'altre_tabelle'];

/** Come si chiamano i campi quando li si dice a un giocatore. */
export const NOMI_CAMPI = {
  nome: 'nome', intestazione: 'intestazione', macrofamiglia: 'macrofamiglia', specializzazione: 'specializzazione',
  lancio: 'regole di lancio', descrizione: 'descrizione', versioni: 'tabella dei livelli', regole: 'regole della scheda', altre_tabelle: 'tabelle di dettaglio',
};

/** L'edizione che i dati dichiarano corrente (`incantesimi.corpus.edizione`), o null se non la dichiarano. */
export const edizioneCorrenteIncantesimi = (incantesimi) => incantesimi?.corpus?.edizione ?? null;

/** I campi della scheda che non sono dell'edizione corrente: `[{ campo, nome, edizione }]`. Un campo senza provenienza non conta come vecchio. */
export function campiIndietroScheda(scheda, corrente) {
  const p = scheda?._edizione?.campi ?? {};
  return CAMPI_LETTI.filter((c) => p[c] && corrente && p[c] !== corrente).map((c) => ({ campo: c, nome: NOMI_CAMPI[c] ?? c, edizione: p[c] }));
}

/**
 * La riga che la scheda scrive quando un campo è di un'edizione precedente, o **null** quando la scheda è tutta alla corrente.
 * Il motivo (`corpus.motivi_indietro`) lo aggiunge a parte chi ha i dati interi.
 */
export function rigaProvenienzaIncantesimo(scheda, corrente, motivo = null) {
  const indietro = campiIndietroScheda(scheda, corrente);
  if (!indietro.length) return null;
  const perEdizione = new Map();
  for (const v of indietro) perEdizione.set(v.edizione, [...(perEdizione.get(v.edizione) ?? []), v.nome]);
  const pezzi = [...perEdizione.entries()].map(([ed, nomi]) => `${nomi.join(', ')} da ${ed}`);
  return `Non tutta la scheda viene dalla Magia ${corrente} — ${pezzi.join('; ')}.${motivo ? ` ${motivo}` : ''}`;
}

/** Il motivo scritto accanto a una scheda rimasta indietro (`incantesimi.corpus.motivi_indietro`), o null. */
export function motivoIndietro(incantesimi, scheda) {
  const m = incantesimi?.corpus?.motivi_indietro?.find((x) => x.scheda === scheda?.scheda);
  const primo = m?.campi?.[0];
  return typeof primo === 'object' ? primo.motivo ?? null : null;
}
