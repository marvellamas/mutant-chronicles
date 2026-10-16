# Pacchetto per il Doc «per-davide.md» — 16 ottobre 2026

Cinque voci passano dalla sezione 3 («Risposte ricevute, in implementazione») alle **Risolte**: sono state
applicate nell'app il 16/10. La **A.161** resta in implementazione (è il prossimo lotto) e la **A.165** è una
rettifica editoriale già registrata da Davide.

Lo applica Cowork o Marcello, seguendo `docs/protocollo-davide.md` §5. Claude Code non scrive nei Google Doc.

- **Cinque voci da spostare dalla sezione 3 alle «Risolte»:** A.160, A.162, A.163, A.164, A.166.
- **Nessuna domanda nuova.**
- Restano aperte A.161 (risposta ricevuta, da applicare).

Dettaglio di che cosa è stato fatto: `docs/lotto-risposte-2026-10-16.md`.

---

```
*** DOC per-davide.md — voci A.160, A.162, A.163, A.164, A.166
*** AZIONE: spostale dalla sezione 3 alle «Risolte», sostituendo la riga con il testo qui sotto

--- TESTO ---
A.160 — Punti Abilità liberi degli avversari costruiti come PG. RISOLTA (risposta approvata il 16/10/2026, verificata nell’app lo stesso giorno). Gli avversari costruiti con le regole dei personaggi ricevono 7 punti Abilità liberi alla creazione e a ogni Grado, con i normali limiti di assegnazione: l’app faceva già così dappertutto, perché i punti vengono dai dati delle regole e passano per lo stesso motore dei personaggi, sia per il bestiario umano costruito come PG sia per la conversione «PG → nemico», che porta i valori della scheda senza ritararli. Il refuso del §5.2 del Manuale dei Mostri è corretto nella 0.4 e nelle versioni successive, e nella 0.9 letta il 16/10 il paragrafo dice 7.

A.162 — Proprietà Indistruttibile e Integrità degli oggetti. RISOLTA (risposta approvata il 16/10/2026, applicata nell’app lo stesso giorno). L’app ha ora tre stati espliciti: integrità ordinaria, con PS Integrità e PI come sempre; Indistruttibile, con la dicitura visibile nella scheda e il danneggiamento che non toglie PI e non rompe; Integrità da definire, per il dato mancante, che viene segnalato e non vale né come indistruttibilità né come oggetto rotto. Un PI assente non è più sufficiente a rappresentare nulla. Lo Scrigno del Primo Giuramento è nel catalogo con la proprietà attiva e con la regola, visibile, che il danneggiamento non consente di forzarne l’apertura; la proprietà non si estende ai Sigilli, al contenuto dello Scrigno né agli altri Artefatti, e nessun altro oggetto del catalogo la possiede. I tre Contenitori del Silenzio usano il terzo stato, perché il §10.13 lascia Qualità, PI, PS Integrità, costo e Reperibilità da definire.

A.163 — Schermatura dei Contenitori del Silenzio. RISOLTA (precisazione registrata il 16/10/2026, applicata nell’app lo stesso giorno). Custodia, Zaino e Cofanetto del Silenzio sono nel catalogo con la loro schermatura di Corruzione 1 e SnT 0. Nella riga dell’oggetto compare l’indicazione «Schermatura attiva» o «Schermatura inattiva», con due caselle da toccare — contenitore chiuso e contenuto interamente riposto — e il dettaglio delle condizioni. L’indicazione dipende soltanto dalle tre condizioni approvate, contenuto interamente riposto, contenitore chiuso e schermatura integra: l’app non controlla che cosa c’è dentro, perché la schermatura vale per qualunque contenuto, e CyberArma, armatura, anello e amuleto restano esempi d’uso. L’app non calcola la Corruzione e ricorda che la schermatura non elimina quella dell’oggetto né quella già accumulata dai personaggi.

A.164 — Morente, morte e stabilizzazione dei nemici. RISOLTA (risposta approvata il 16/10/2026, applicata nell’app lo stesso giorno). Anche i nemici del Tavolo del Direttore seguono Morente: superare Grave provoca Svenuto, mantiene la penalità −8 e avvia il contatore pari alla Costituzione intera effettiva all’ingresso, fissata per quell’episodio; il solo raggiungimento di 0 PV non porta a Morente. Il primo decremento avviene dopo un Round completo, alla stessa posizione d’Iniziativa dell’ingresso, e la stessa regola vale adesso anche per i personaggi; le Ferite eccedenti del colpo d’ingresso non abbreviano il contatore, mentre ogni nuova Ferita successiva toglie un Round e a zero l’app avvisa della morte senza bloccare nulla. «Stabilizza» riporta a Grave e disattiva il contatore, e un contatore spento a zero non uccide. Se manca la Costituzione l’app lo segnala e offre il campo per inserirla, senza ricavarla da Tempra o PV, senza trattarla come zero e senza dichiarare morto il nemico; inserita a scontro già in corso, contano i Round già trascorsi dall’ingresso. La mini-scheda del nemico nella plancia mostra lo stesso riquadro «Morente — N Round» dei personaggi, con il comando per togliere un Round e quello per stabilizzare. Restano le eccezioni esplicite delle schede e le cause che stabiliscono morte diretta o distruzione.

A.166 — Manifestazioni della CyberArma, Abilità e Specializzazioni. RISOLTA (risposta approvata il 16/10/2026, applicata nell’app lo stesso giorno). La CyberArma si utilizza sempre con Armi da mischia, qualunque forma manifesti; la manifestazione è registrata a parte e da essa dipendono famiglia, Specializzazione pertinente e Manovre compatibili: lama lunga o spada danno Spade, la frusta Armi flessibili, l’ascia Asce, la lancia Armi inastate, e per le altre forme vale la famiglia corrispondente del catalogo. Il Custode sceglie la manifestazione da un menu nella scheda dell’arma; il Tecnomante e gli altri utilizzatori ammessi vedono la forma prevista dal progetto, lama lunga nel modello base, e la si cambia soltanto come modifica del manufatto. La Specializzazione pertinente alla forma dà i normali +1 al VA e +1 al danno e non si cumula con quelle di altre forme. L’associazione provvisoria di ogni CyberArma alle Spade è stata sostituita.
```

---

## Nota per Marcello (non va nel Doc)

Il Manuale dei Mostri sul Drive è la **v0.9** del 16/10 (Davide cita la 0.4 e la 0.5): il §5.2 dice già 7
punti e il §4.2 applica Morente alle creature, quindi le due risposte sono allineate al manuale. Il catalogo
è passato da 15 a 75 creature: le 60 nuove, la scala GS/PX e le regole comuni dei blocchi nuovi restano da
recepire, con la A.161, nei prossimi lotti.
