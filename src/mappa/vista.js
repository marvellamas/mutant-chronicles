// Vista giocatori (§3 della specifica, lotto 1): il server manda ai dispositivi dei giocatori una copia della scena
// già filtrata, così le informazioni nascoste non arrivano proprio. Funzione pura, condivisa da server e test.
//
// Si tolgono:
//   - i token nascosti dal master e quelli con tutti i Q sotto la nebbia (basta un Q scoperto per vederlo);
//   - i template nascosti e quelli con l'origine sotto la nebbia;
//   - muri e terreno difficile sotto la nebbia (la forma delle stanze non ancora viste);
//   - l'immagine originale (resta la copia ridotta, se c'è), il registro dei movimenti, la pila dell'annulla,
//     la bozza collegata e le date.
// La nebbia arriva intera: i giocatori la vedono piena (§5). Limite: i pixel dell'immagine di fondo arrivano
// comunque al dispositivo (A.130, docs/battlemap/piano.md §3).
import { daBase64, inBase64, cella, senza } from './celle.js';
import { celleToken } from './token.js';

export function vistaGiocatori(s) {
  const { colonne, righe } = s.griglia;
  const nebbia = daBase64(s.nebbia.coperti);
  const coperto = (x, y) => cella(nebbia, colonne, righe, x, y);
  const visibile = (t) => celleToken(t).some(([x, y]) => !coperto(x, y));
  const mappa = s.mappa
    ? { file: s.mappa.ridotta ?? s.mappa.file, larghezza: s.mappa.larghezza, altezza: s.mappa.altezza }
    : null;
  return {
    formato: s.formato,
    versione: s.versione,
    vista: 'giocatori',
    id: s.id,
    nome: s.nome,
    revisione: s.revisione,
    mappa,
    griglia: { ...s.griglia },
    muri: inBase64(senza(daBase64(s.muri), nebbia)),
    terreno: inBase64(senza(daBase64(s.terreno), nebbia)),
    nebbia: { coperti: s.nebbia.coperti },
    token: s.token.filter((t) => !t.nascosto && visibile(t)).map(({ nascosto, ...t }) => t),
    template: s.template.filter((t) => !t.nascosto && !coperto(t.origine[0], t.origine[1])).map(({ nascosto, ...t }) => t),
    collegamento: { scontro: s.collegamento?.scontro ?? null },
  };
}
