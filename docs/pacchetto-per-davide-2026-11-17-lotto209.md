# Pacchetto per il Doc «per-davide.md» — 17/11/2026, lotto 209

Da applicare al Google Doc da Cowork o da Marcello. Claude Code non scrive nei Doc di Davide.
Il Doc su Drive è quello del lotto 208 (modificato il 16/11 alle 17:45 UTC); **nessuna risposta nuova di Davide** in
sezione 7.

---

## 1. Sezione 1 — invariata

La scelta della strada per il livello 8 è ancora l'unica cosa che decide la serata di lunedì. Nessuna domanda nuova la
tocca. (Non si cambia niente in sezione 1.)

## 2. Sezione 2 — nessuna domanda nuova

Il primo numero libero resta **A.280**. Le sette aperte (A.273–A.279) sono invariate. Nessuna risposta di Davide le ha
toccate.

## 3. Sezione 6 — da spostare fra le «Risolte», e togliere dalla sezione 3

- **A.271 — Che CyberArma ha Dimitri** (la risposta era nel tuo E&L, blocco «Raccordo Armamenti e Veicoli — 11
  novembre 2026», non in una risposta numerata; app aggiornata il 17/11/2026). *In parole semplici:* hai scritto che
  la CyberArma di Dimitri **ha un focalizzatore Verde e non ha SIN, riserva di CM o NeC**. Nel suo file c'era la voce
  *«CyberArma con Batteria Verde»* con **5 CM**: il modello sbagliato, che l'arma non ha. **Che cosa abbiamo corretto:**
  - il **catalogo**: la CyberArma con la riserva interna non offre più «oppure 2 PM personali» (era la regola del 2/11,
    superata dalla tua A.251 del 6/11: la riserva è l'unica alimentazione);
  - la **consegna del progetto di Paradise** si ferma, con il motivo scritto, se lascerebbe insieme una riserva interna e i
    PM personali; e il progetto dice **prima** di confermare quale configurazione sta applicando e che cosa si perde;
  - un **comando che sistema il file di Dimitri** (`node tools/correggi-cyberarma-dimitri.mjs`, lo lanci tu dal PC del
    Direttore): sola lettura finché non gli dici `--scrivi`; poi la voce diventa l'**originale** («CyberArma Dimitri»,
    focalizzatore Verde, PM personali), la riserva da 5 CM che non esiste sparisce, e resta una riga nello storico. Si
    può rilanciare senza danni. **Non tocca** le due schegge Verdi (una potrebbe essere quella già integrata) né crea il
    frammento Viola (dove sia lo decidi tu).
  *Autonomia, con la tua A.260* (10 Round per attivazione): con i PM personali 2 PM → **10 attivazioni = 100 Round**
  (Dimitri ha 21 PM, che servono anche agli Incantesimi); con i 5 CM che la voce sbagliata prometteva sarebbero stati 50.
  *Una scelta nostra da confermare:* il comando scrive il nome «CyberArma Dimitri» (il §7.25 la chiama già così), perché
  senza nome il pulsante «Riconduci a CyberArma Park» rimetterebbe Viola e Corruzione 1 su un'arma che ha già il Verde.
  Se preferisci deciderlo tu, si toglie una riga.

## 4. Sezione 3 — lavori che restano, da aggiungere

- **Il bonus del focalizzatore Verde non è ancora nei calcoli.** Il §7.25.4 dà all'arma di Dimitri «1d8+1 Magico, +1 VA di
  Attacco e +1 VA di Parata»: la scheda mostra oggi VA 9 e il `+1` al danno che viene dal personaggio, non dal Verde. È un
  lavoro a parte; *nel frattempo* il +1 all'attacco, alla Parata e al danno si aggiunge a mano.
- **Il testo del progetto «Paradise» descrive il piano di prima** («preparare la scheggia Verde… al posto del frammento
  Viola»), mentre l'arma ha già il Verde. Non cambia i numeri; *nel frattempo* la consegna non estrae nessun Viola.
- **Veicoli 0.19: la motocicletta e il furgone sono nell'app** (capitoli 12 e 13, numeri dalle tabelle; si aggiungono a
  un PG, si usano in una tratta). **Non ci sono** le astronavi dei capitoli 14 e 15 (Nave mineraria, Rimorchiatore, Navi
  passeggeri Lusso e Sonno): sono un lavoro a parte. **E non è applicato il testo nuovo dei capitoli 10 e 11**: lo
  Scout commerciale si chiama «SIA Scout MK4» e il FIAT LUX «Scout MK4 ASA dei PG»; la postazione della M606 ha un
  settore di rotazione di **120°** (nell'app è 360°) e il suo schermo concede Copertura senza AR — la tua stessa
  indicazione dell'11 novembre; la Neverlost non cambia (solo un paragrafo introduttivo che conferma «esemplare unico»).
  *Nel frattempo* l'app tiene i 360° e il nome ASA.

## 5. Sezione 4 — da correggere nei manuali

- **L'officina della moto e del furgone non ha una tariffa oraria.** Per l'autovettura il manuale dice 100 cr per ora
  (§9.6); per la Motocicletta (§12.6) e il Furgone (§13.5) dice solo che «la manodopera si aggiunge al costo dei
  materiali». Nell'app il campo manca e non viene inventato.

## 6. Sezione 5 — Manuali che l'app aspetta, da aggiornare

- **Veicoli — in cartella 0.10, su Drive 0.19; quattro schede, non due.** Il documento ha «Tab 1» (cap. 1–10),
  «Neverlost» (cap. 11–13 e le tavole), «Astronavi commerciali» (cap. 14) e «Navi passeggeri» (cap. 15); chi legge solo
  la prima ha un manuale incompleto — l'avevamo fatto noi. Ora le abbiamo lette tutte e quattro.

## 7. Sezione 8 — Prove da fare

Aggiungere, dopo la prova 2 (lo Scout di Pablo e di Lucas):

> ### La CyberArma di Dimitri
>
> **Prima**, su una copia o dopo **Mutant.bat → 3 «Salva sessione»**: apri un terminale nella cartella di Mutant e scrivi
> `node tools/correggi-cyberarma-dimitri.mjs`. Deve dire «Dimitri Orlav — file attuale: …», che la voce è
> `armi:cyberarma-batteria-verde` e diventerebbe `armi:cyberarma`, l'autonomia (**10 attivazioni = 100 Round**) e, in
> fondo, «nessun file toccato». Se ti torna, rilancialo con `--scrivi` in fondo: scrive «Copia di prima: … .prima-a271».
> Poi apri la scheda di Dimitri → tab **Artefatti**: l'arma deve chiamarsi **CyberArma Dimitri**, con «2 PM · 10 Round» e
> senza il pulsante «con i PM personali». Rilanciare il comando deve dire «niente da correggere».
>
> **Poi**, in «Modifica master», tab Artefatti → Progetti → apri il progetto Paradise: prima del pulsante «Consegna
> l'arma» deve esserci il riquadro **«Configurazione che applica questa consegna»** (oggi / dopo la consegna / che cosa
> si perde). Se scegli come alimentazione «Riserva interna di CM» o «Conversione a NeC», il riquadro dice che si
> perdono i PM personali e le proprietà da Custode.

E dopo la prova dei Veicoli (la 19 della lista di prima):

> ### La motocicletta e il furgone
>
> Tab **Veicoli** → «Aggiungi veicolo»: ci sono **Motocicletta civile** (MOV 50, MAN +2) e **Furgone civile** (MOV 30,
> MAN −1). Aggiungili, scrivi una tratta di 120 km e premi «Chiudi la giornata»: la moto deve scalare **2 cariche**
> (100 km a carica), il furgone **3** (50 km a carica), una volta sola.

---

## 8. Che cosa il controllo di inizio sessione ha trovato (non per Davide: per Marcello)

Il Doc «per-davide.md» risultava cambiato il 16/11 alle 17:45: era il pacchetto del lotto 208. Su Drive c'è anche
`mutant-stato_2026-11-15_1845.zip`, che in `istantanee/` non c'è.
