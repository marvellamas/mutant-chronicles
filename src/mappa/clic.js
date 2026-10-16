// Che cosa fa un clic sulla mappa (src/ui/mappa/pagina.js → premi). Funzioni pure.
//
// Bug del 16/10/2026 (Marcello, in sessione): con uno scontro aperto e il turno di un PG, la pedina scelta
// mostrava l'area verde e il percorso, ma al clic sul quadretto d'arrivo non si spostava. Regressione del
// 12/10 («editor unico degli oggetti», con lo strumento «Seleziona» sempre acceso): un clic su un quadretto
// vuoto diventava sempre il riquadro di selezione dell'editor, che al rilascio svuotava la selezione e si
// fermava lì, senza arrivare al movimento. Il trascinamento funzionava perché parte dal token.
//
// La regola, scritta una volta sola e qui:
//   - una pedina scelta (PG, nemico o veicolo: non un token libero) ha la precedenza. Finché è scelta, il
//     clic sulla mappa è suo: va dove si clicca, con le regole del movimento (dovunque con «Mappa semplice»
//     o tenendo Maiusc);
//   - per prendere un muro, una porta, un'area di terreno, un template o un token libero mentre una pedina
//     è scelta si tiene **Alt**, oppure prima si lascia la pedina (riclic sulla pedina, o Esc);
//   - senza pedine scelte tutto resta come il 12/10: clic sull'oggetto per prenderlo, clic nel vuoto per
//     deselezionare, trascinamento nel vuoto per il riquadro di selezione;
//   - un clic su un'altra pedina la prende, come è sempre stato.
// Il trascinamento della pedina non passa di qui: parte dal token e continua a funzionare come prima.

/** Il token scelto può muoversi con il clic? (i token liberi si spostano con l'editor, senza regole) */
export const pedinaCheMuove = (token) => (token && token.rif?.tipo !== 'segnaposto' ? token : null);

const segnaposto = (t) => t?.rif?.tipo === 'segnaposto';

/**
 * @param stato {
 *   strumentoEditor: 'seleziona' | 'muro' | 'porta' | 'terreno' | 'token-libero' | 'gomma',
 *   pedinaScelta: la pedina scelta (già passata da pedinaCheMuove) o null,
 *   tokenSotto: il token sotto il puntatore o null,
 *   oggettoSotto: l'oggetto dell'editor sotto il puntatore o null,
 *   alt: Alt premuto (prende l'oggetto anche con una pedina scelta),
 * }
 * @returns 'token' (prende o lascia la pedina sotto il puntatore) | 'oggetto' (prende l'oggetto dell'editor)
 *   | 'riquadro' (riquadro di selezione dell'editor) | 'mappa' (il clic della mappa: muove la pedina scelta,
 *   apre una porta, deseleziona)
 */
export function azioneDelClic({ strumentoEditor = 'seleziona', pedinaScelta = null, tokenSotto = null, oggettoSotto = null, alt = false } = {}) {
  // una pedina vera sotto il puntatore: la si prende o la si lascia, come è sempre stato
  if (tokenSotto && !segnaposto(tokenSotto)) return 'token';
  // la pedina scelta ha la precedenza: il clic è suo, salvo Alt (che prende l'oggetto sotto)
  if (pedinaCheMuove(pedinaScelta) && !alt) return 'mappa';
  // con un altro strumento dell'editor acceso i token liberi restano token, il resto è della mappa
  if (strumentoEditor !== 'seleziona') return segnaposto(tokenSotto) ? 'token' : 'mappa';
  if (oggettoSotto || segnaposto(tokenSotto)) return 'oggetto';
  return 'riquadro';
}
