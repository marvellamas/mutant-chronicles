// Esito di una Prova con il d20 (Giocatore §1.6, §1.7; regole.json → prova e magistrale_naturale). Funzione
// pura: la usa il Tavolo del Master per il tiro per colpire dei nemici (pezzo 5), dal vivo o tirato dall'app.

/**
 * @param va Valore finale della Prova (dopo bonus e penalità)
 * @param d20 risultato naturale (1–20), oppure null se non si è ancora tirato
 * @param opzioni { abilita: Prova di Abilità (il 2 Magistrale con VA alto, §1.6), obbligatoria: tiro imposto (§1.7.1) }
 * @returns {{ esito: 'impossibile'|'automatico'|'da_tirare'|'magistrale'|'successo'|'fallimento'|'maldestro', riuscita: boolean|null, testo }}
 */
export function esitoProva(va, d20, dati, { abilita = true, obbligatoria = false } = {}) {
  const P = dati.regole.prova;
  const soglia2 = dati.regole.magistrale_naturale?.soglia_va ?? Infinity;
  if (va <= P.impossibile_fino_a) return { esito: 'impossibile', riuscita: false, testo: `VA ${va}: Prova impossibile nelle condizioni attuali, non si tira (§1.7).` };
  if (va >= P.successo_automatico_da && !obbligatoria) return { esito: 'automatico', riuscita: true, testo: `VA ${va}: successo automatico, senza tiro; non è un Successo Magistrale (§1.7).` };
  if (!Number.isInteger(d20)) return { esito: 'da_tirare', riuscita: null, testo: 'Tira 1d20: riesce con un risultato pari o inferiore al VA.' };
  if (d20 === P.naturale_magistrale) return { esito: 'magistrale', riuscita: true, testo: '1 naturale: Successo Magistrale (§1.6).' };
  if (d20 === P.naturale_maldestro) return { esito: 'maldestro', riuscita: false, testo: '20 naturale: Fallimento Maldestro (§1.6).' };
  if (d20 === 2 && abilita && va >= soglia2) return { esito: 'magistrale', riuscita: true, testo: `2 naturale con VA ${va} (almeno ${soglia2}): Successo Magistrale (§1.6).` };
  return d20 <= va
    ? { esito: 'successo', riuscita: true, testo: `${d20} su VA ${va}: successo.` }
    : { esito: 'fallimento', riuscita: false, testo: `${d20} su VA ${va}: fallimento.` };
}
