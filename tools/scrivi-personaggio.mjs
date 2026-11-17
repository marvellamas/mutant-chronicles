// **L'unico modo in cui uno strumento riscrive il file di un personaggio** (lotto 210, 17/11/2026).
//
// **Perché esiste.** Ogni file di un personaggio porta, oltre alle scelte, i suoi metadati di salvataggio: `versione_salvataggio`
// (un contatore che sale di 1 a ogni scrittura), `aggiornato_il` e `aggiornato_da` (`src/storico-personaggi.js`). Li scrive
// l'app a ogni salvataggio (il server li mette con `conMetadati`) e li legge il confronto fra versioni: un tablet che salva dice
// «sono partito dalla versione N», e il server rifiuta se il file è già alla N+1.
//
// Gli strumenti che riscrivevano un file «a mano» avevano due difetti, **della stessa classe e di gravità diversa**:
//   - **lo perdevano**: `riserve-intere.mjs --scrivi` passava da `serializza`, che non porta i metadati: il file usciva senza
//     `versione_salvataggio`, `aggiornato_il` e `aggiornato_da`;
//   - **non lo facevano salire**: `adegua-abilita.mjs` (adeguamento e annulla), `migra-parata.mjs` e `riferimenti-rotti.mjs`
//     tenevano i metadati vecchi (copiano il JSON), quindi cambiavano il contenuto lasciando la stessa versione e la stessa
//     ora: per il server e per i tablet il file «non era cambiato», e un salvataggio di un tablet partito dalla versione
//     vecchia ci passava sopra senza il conflitto che avrebbe dovuto dare. È il guasto peggiore, perché non si vede.
// (`migra-talenti.mjs` passa dal PUT del server, che i metadati li mette da sé; `pulizia-personaggi` e `ripristina` spostano e
// rimettono file interi, senza cambiarne il contenuto.)
//
// **Da qui in avanti chi riscrive il file di un personaggio chiama `scriviPersonaggio`**, e `tests/strumenti-metadati-210.test.js`
// fallisce se uno strumento scrive un personaggio senza passarne. Come `tools/personaggi-cartella.mjs` per la scelta del file
// attuale (lotto 200), ma sull'altra metà del lavoro: quale file, e che cosa ci si scrive dentro.
//
// **La firma non ha valori predefiniti** (la lezione del 192): `chi` e `quando` sono obbligatori. Chi lo dimentica si ferma; non
// scrive «giocatore» o «adesso» in silenzio.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { conMetadati, AUTORI } from '../src/storico-personaggi.js';

/**
 * Riscrive `percorso` con `nuovo`, mettendo i metadati di salvataggio come l'app: versione del file che c'è già sul disco + 1
 * (1 se non c'è), `aggiornato_il` = `quando`, `aggiornato_da` = `chi`. Il resto di `nuovo` non si tocca.
 * @param percorso il file del personaggio
 * @param nuovo l'oggetto da scrivere (con o senza metadati: quelli vecchi si sostituiscono)
 * @param opz { chi: 'master' | 'giocatore' | 'px', quando: Date } — entrambi obbligatori
 * @returns l'oggetto scritto
 */
export function scriviPersonaggio(percorso, nuovo, opz) {
  const { chi, quando } = opz ?? {};
  if (!AUTORI.includes(chi)) throw new TypeError(`scriviPersonaggio: «chi» deve essere uno fra ${AUTORI.join(', ')} (uno strumento lanciato dal PC del Direttore scrive «master»)`);
  if (!(quando instanceof Date) || Number.isNaN(quando.getTime())) throw new TypeError('scriviPersonaggio: «quando» deve essere una data (new Date())');
  if (nuovo?.formato !== 'mutant-personaggio') throw new TypeError('scriviPersonaggio: non è un file di personaggio (formato «mutant-personaggio» atteso)');
  const esistente = existsSync(percorso) ? JSON.parse(readFileSync(percorso, 'utf8')) : null;
  const fuori = conMetadati(nuovo, esistente, { chi, quando });
  writeFileSync(percorso, `${JSON.stringify(fuori, null, 2)}\n`);
  return fuori;
}
