# La nota «Talenti prima del passaggio» incompleta — diagnosi e correzione (27/10/2026)

Al tavolo del 26/10, sul PC di Davide, il passaggio ai Talenti nuovi (voce 7) aveva scritto in alcuni personaggi una nota
a metà, in altri una nota senza nemmeno un Talento. Servivano proprio quei Talenti per riscegliere.

## Che cosa ho potuto verificare

- Sui sette PG di `tests/fixtures/talenti-vecchi/`, sui tre file di `personaggi/` di questo PC e ripetendo la voce 7 due
  volte (passaggio, poi «già fatto») la nota usciva **completa**: due Talenti Liberi per personaggio. Quindi sui file di
  prova non si riproduce, e la causa esatta sui file di Davide **non è ricostruibile da qui** (non ho i suoi file né lo
  zip `prima-dei-talenti-nuovi_…`). Le due cose che seguono sono quelle che il codice faceva davvero e che si possono
  provare.

## Perché la nota poteva essere incompleta

1. **Un solo campo letto.** La nota usava l'elenco `vecchi` di `postiTalenti`, che è un risultato del calcolo del regime
   vecchio: guarda soltanto `livelli[].talentoLibero` e solo se è un oggetto. Lasciava fuori ogni altra strada in cui un
   file può avere un Talento: la stringa semplice dell'id, `maestria` e `specializzazione` dei livelli, la
   Specializzazione iniziale e i Talenti scritti nella creazione, e i Talenti di Classe. Un personaggio il cui file non
   avesse il Talento in quel campo (per esempio perché un passaggio o un ripristino precedente lo aveva già tolto) veniva
   scritto «nessuno». Ora la nota si legge dal **file** (`src/talenti-prima.js`), tutte le strade, anche un id che il
   catalogo non conosce più.
2. **Una riga di testo sola.** Il registro «Modifiche del master» è chiuso per i giocatori e annullabile dal master; la
   nota era un'unica etichetta lunga, senza l'elenco in forma di dati, quindi non si poteva mostrare altrove né rifare.

## Che cosa è cambiato

- **Nota completa**, livello per livello e con la categoria nuova di ciascun Talento:
  «3° livello: Tiro Mirato Migliorato — ora Maestria; 5° livello: … Talenti di Classe (restano): 4° livello: …».
  La riga porta anche l'elenco in forma di dati (`talentiPrima`, `talentiClassePrima`). Il passaggio (voce 7) la scrive già così.
- **Voce R del menu «Ricostruisci la nota dei Talenti di prima»** (`node tools/console.mjs talenti-nota`,
  `tools/migra-talenti.mjs` → `pianoNota`, `applicaNota`): legge gli zip `prima-dei-talenti-nuovi_…` di `salvataggi\`
  (per ogni personaggio la copia più recente in cui aveva ancora i Talenti di prima), mostra per ognuno la nota di adesso
  e quella nuova, chiede SI, fa una copia zip (`prima-della-nota-talenti_…`) e a ogni personaggio **aggiunge al registro la
  riga completa**, passando dal salvataggio normale del server. Dello zip legge soltanto; nel file attuale cambia solo
  `correzioni_master`: le scelte fatte al tavolo restano. La data nella riga è quella del passaggio. Rifatta una seconda
  volta non scrive niente.
- **Il giocatore la legge dal tablet**: nella tab **Abilità** della scheda, sotto Talenti Liberi e Specializzazioni, il
  riquadro «Talenti di prima del passaggio» (sola lettura, aperto), con «già ripreso» accanto a quelli che il
  personaggio ha di nuovo. Legge la riga più completa del registro (quella «ricostruita» prima delle altre).

Prove: `tests/talenti-prima.test.js` (tutte le strade; note sparite o a metà e scelta fatta dopo il passaggio, poi la
ricostruzione; il percorso di Davide su un Taumaturgo con Elementi e Manifestazione).
