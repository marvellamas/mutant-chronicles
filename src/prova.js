// Esito di una Prova con il d20 (Giocatore §1.6, §1.7; regole.json → prova e magistrale_naturale). Funzione
// pura: la usa il Tavolo del Master per il tiro per colpire dei nemici (pezzo 5), dal vivo o tirato dall'app.
// A.78 (E&L del 02/10, decisione 3): attacchi e Difese attive si tirano anche con VA finale 20 o più
// (regole.json → prova.tiro_sempre); naturali Magistrali: 1, il 2 con VA finale almeno 21 nelle Prove di
// Abilità (§1.6), e con Successo Magistrale Migliorato 1–2 sotto il 21 e 1–3 da VA 21 (prova.magistrale_migliorato).

/**
 * Naturale più alto che è un Successo Magistrale con questo VA finale (1, 2 o 3), se la Prova riesce.
 * @param opzioni { abilita: Prova di Abilità (§1.6), magistraleMigliorato: il personaggio ha il Talento }
 */
export function limiteMagistrale(va, dati, { abilita = true, magistraleMigliorato = false } = {}) {
  const soglia2 = dati.regole.magistrale_naturale?.soglia_va ?? Infinity;
  let limite = dati.regole.prova.naturale_magistrale;
  if (abilita && va >= soglia2) limite = Math.max(limite, 2);
  if (magistraleMigliorato) {
    for (const x of dati.regole.prova.magistrale_migliorato?.naturali ?? []) if (va >= x.va_da) limite = Math.max(limite, x.fino_a);
  }
  return limite;
}

/** La Prova si tira anche con VA finale 20 o più? Le Prove obbligatorie (§1.7.1), gli attacchi e le Difese (A.78). */
export const tiroObbligatorio = (tipo, dati) => (dati.regole.prova.tiro_sempre?.tipi ?? []).includes(tipo);

/**
 * @param va Valore finale della Prova (dopo bonus e penalità)
 * @param d20 risultato naturale (1–20), oppure null se non si è ancora tirato
 * @param opzioni { abilita: Prova di Abilità (il 2 Magistrale con VA alto, §1.6), obbligatoria: tiro imposto (§1.7.1),
 *   tipo: 'attacco' | 'difesa' (si tirano sempre, A.78), magistraleMigliorato: Successo Magistrale Migliorato (§8.6.1) }
 * @returns {{ esito: 'impossibile'|'automatico'|'da_tirare'|'magistrale'|'successo'|'fallimento'|'maldestro', riuscita: boolean|null, testo }}
 */
export function esitoProva(va, d20, dati, { abilita = true, obbligatoria = false, tipo = null, magistraleMigliorato = false } = {}) {
  const P = dati.regole.prova;
  const tira = obbligatoria || tiroObbligatorio(tipo, dati);
  if (va <= P.impossibile_fino_a) return { esito: 'impossibile', riuscita: false, testo: `VA ${va}: Prova impossibile nelle condizioni attuali, non si tira (§1.7).` };
  if (va >= P.successo_automatico_da && !tira) return { esito: 'automatico', riuscita: true, testo: `VA ${va}: successo automatico, senza tiro; non è un Successo Magistrale (§1.7).` };
  if (!Number.isInteger(d20)) return { esito: 'da_tirare', riuscita: null, testo: 'Tira 1d20: riesce con un risultato pari o inferiore al VA.' };
  if (d20 === P.naturale_magistrale) return { esito: 'magistrale', riuscita: true, testo: '1 naturale: Successo Magistrale (§1.6).' };
  if (d20 === P.naturale_maldestro) return { esito: 'maldestro', riuscita: false, testo: '20 naturale: Fallimento Maldestro (§1.6).' };
  const limite = limiteMagistrale(va, dati, { abilita, magistraleMigliorato });
  if (d20 <= limite && d20 <= va) {
    const perche = magistraleMigliorato && d20 > (abilita && va >= (dati.regole.magistrale_naturale?.soglia_va ?? Infinity) ? 2 : 1)
      ? 'Successo Magistrale Migliorato (§8.6.1, A.78)' : `VA ${va}, almeno ${dati.regole.magistrale_naturale?.soglia_va} (§1.6)`;
    return { esito: 'magistrale', riuscita: true, testo: `${d20} naturale: Successo Magistrale (${perche}).` };
  }
  return d20 <= va
    ? { esito: 'successo', riuscita: true, testo: `${d20} su VA ${va}: successo.` }
    : { esito: 'fallimento', riuscita: false, testo: `${d20} su VA ${va}: fallimento.` };
}
