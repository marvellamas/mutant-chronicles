Fai questo lavoro, senza chiedere conferma. Siamo su `main` (verifica con `git status -sb`, dopo il merge di `layout-sd`). Due parti: prima un censimento dei Talenti (scrivi il documento e riferisci), poi l'implementazione. Fermati a fare una domanda solo se qualcosa blocca davvero, e in quel caso una domanda sola, precisa.

## 0. Prima di tutto

- Controllo manuali di inizio sessione (procedura in `docs/manuali-drive.md`); se qualcosa è cambiato, riferisci e applica prima.
- Rileggi `docs/effetti-oggetti.md` (schema `{tipo, abilita, valore, ambito: generale|situazionale|uso_specifico, uso?, condizione?}`) e `docs/proprieta-armature.md` (il censimento fatto per le armature: stesso metodo qui).

## 1. Censimento dei Talenti

Obiettivo: oggi i Talenti (di Classe, generali, di magia, di Corporazione: tutti quelli in `data/`) sono testo. Vanno trasformati in `effetti` tipizzati dove il testo dà un numero, così entrano nei valori effettivi (VA delle Abilità, VA per colpire, danno, Difese, Salvezze, AR, PM, valori di lancio) e nelle utility «Attacca!» e «Lancia!».

- Fai l'elenco di tutti i Talenti in catalogo con, per ciascuno: fonte (manuale e paragrafo), testo dell'effetto, e la classificazione: **numerico generale** (vale sempre), **numerico situazionale** (il giocatore lo accende al tavolo: condizione da scrivere in `condizione`), **numerico uso_specifico** (vale per un tipo di Prova o di arma: `uso`), **testuale** (nessun numero: resta promemoria), **rimandato** (il manuale non definisce il valore o è ambiguo: `TODO(Davide)`).
- Attenzione a non duplicare ciò che il motore fa già: i Talenti che oggi hanno già un effetto codificato (per esempio Parata/Schivata Istintiva nelle Difese, quelli letti da «Attacca!» e «Lancia!», Conversione Migliorata / Recupero Meditativo nei rapporti Chroma, Tecnomante +2 in sintonizzazione) vanno elencati con la nota «già gestito in <file>» e, dove possibile, portati nello stesso schema `effetti` senza cambiare il risultato (test di non regressione sul valore).
- Scrivi il risultato in `docs/censimento-talenti.md` con i conteggi per categoria. Se serve un `tipo` nuovo nello schema (per esempio `danno`, `pm`, `valore_lancio`, `azioni`), aggiungilo prima in `docs/effetti-oggetti.md` e nel validator, poi nei dati. Riferisci il documento prima della parte 2; la parte 2 si fa comunque.

## 2. Implementazione

**Dati**: `effetti` sulle voci dei Talenti nei JSON esistenti (stesso file, stesso ordine, nessun campo tolto). I rimandati: `TODO(Davide)` nella voce e un'unica voce nuova nel pacchetto per il Doc (sezione 2, numerazione dopo A.60) con la lista e la riga *Nel frattempo*. `verifica_frasi` sulle voci toccate: zero frasi non trovate.

**Motore**: i Talenti del personaggio entrano nei valori effettivi tramite `src/provenienza.js` con `fonte` = nome del Talento, come oggi per oggetti e condizioni; i generali sempre, i situazionali solo se accesi, gli uso_specifico come valore secondario accanto all'Abilità. «Attacca!» e «Lancia!» li leggono dallo stesso punto. Il `totale` da regole resta separato (serve all'avanzamento), come già per l'equipaggiamento.

**Interruttore globale «Bonus dei Talenti»**: uno stato del personaggio (parte del salvataggio, default acceso, non nell'export se preferisci tenerlo come preferenza locale: scegli e motiva), mostrato in testa alle tab Combattimento e Poteri con lo stesso componente dei toggle situazionali. Spento: i valori effettivi non contano nessun effetto dei Talenti e la provenienza li elenca barrati o con la nota «(Talenti spenti)», così si vede cosa manca. Le utility seguono l'interruttore.

**SD**: i toggle situazionali per Talento in modalità tavolo, nella colonna Condizioni della tab Abilità (già esistente dal pezzo 1) o accanto al Talento nella tab dove si usa, seguendo `docs/layout-sd.md`. Il tooltip di provenienza mostra ogni Talento come riga separata («Mira Selettiva +2»).

**SS**: nessuna modifica (la scheda stampata è a riposo, come già per le condizioni).

**Test**: un Talento generale che entra nel VA; uno situazionale acceso/spento; uno uso_specifico come valore secondario; l'interruttore globale che azzera tutto; non regressione sui Talenti già gestiti (stesso risultato di prima su `tests/collaudo/`); migrazione dei salvataggi (campo nuovo con default).

## 3. Chiusura

`docs/backlog.md` (aggiungi e spunta «Bonus dei Talenti nei valori»), `docs/effetti-oggetti.md` se lo schema è cambiato, `CLAUDE.md` se è cambiata la struttura, `docs/censimento-talenti.md` con in fondo «cosa è stato implementato». Commit separati: censimento; dati; motore + test; SD. Push di `main`.

Riepilogo finale in questa forma, senza altro: Talenti censiti e conteggi per categoria; `tipo` nuovi nello schema; Talenti già gestiti e portati nello schema (o lasciati come sono, e perché); dove sta l'interruttore e cosa fa; pacchetto per il Doc; esito validator, `verifica_frasi` e test.
