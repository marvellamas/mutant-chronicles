# Pacchetto per il Doc «per-davide.md» — 16/11/2026, lotto 205

Da applicare al Google Doc da Cowork o da Marcello. Claude Code non scrive nei Doc di Davide.

---

## 1. Riga di registro, in coda alla sezione 7 — **lo stato finale del Bestiario**

> **Il Bestiario è chiuso sul Manuale dei Mostri 0.69 (16/11/2026).** Oggi contiene **493 schede**: **255
> complete**, cioè con ogni valore letto dall'edizione corrente; **206 miste**, che tengono ancora qualche campo
> dell'edizione precedente e **lo dicono**, nominando quali; **32 provvisorie**, che il manuale non contiene e che
> restano col loro segno (A.258). Da qui in avanti i numeri che leggi sul tuo manuale e quelli che l'app usa al
> tavolo sono gli stessi: dove non lo sono, la scheda lo scrive.

---

## 2. Perché 206 schede restano miste

Non è un dato perso: è un dato che l'app non sa ancora andare a prendere dove il manuale l'ha messo, e lo
dichiara invece di nasconderlo. Tre ragioni, tutte nostre:

1. **Capacità (158 schede).** La 0.69 ha spostato i tratti comuni nelle pagine di regole di ogni blocco, e l'app
   ora le aggancia tutte — ma alcune di quelle pagine stanno **dopo** le creature del blocco invece che prima
   («usa la resistenza fisica della pagina finale»), e l'app guarda indietro. È il primo lavoro del prossimo lotto
   sul Bestiario.
2. **Abilità (68 schede).** Quelle scritte con una condizione («Furtività 14 solo nelle Terre del Fuoco»): la
   scheda del nemico tiene un numero secco, e la condizione resta nel testo.
3. **Note (55 schede).** Sono le annotazioni che i lotti precedenti avevano aggiunto e che il manuale non scrive
   in quella forma: l'AR con e senza scudo, le Difese alternative, il GS informativo. L'app le tiene apposta.

---

## 3. Gli attacchi che al tavolo non si possono tirare

Di tutte le righe «Attacco» del manuale, **174 non entrano nell'elenco degli attacchi** di una scheda. La
maggioranza è giusta così:

- **127 non sono attacchi**: si risolvono con una Salvezza o una Prova (il Canto dell'Arpia, il Getto acido
  dell'Ankheg, lo Sguardo del Beholder) oppure sono prese che non infliggono danno. Stanno fra le capacità, dove
  si leggono, ed è il posto giusto.
- **43 aspettano una tua risposta**: sono le due domande qui sotto.
- **4 sono casi singoli** in cui il manuale non dà il dato in una forma che la scheda possa tenere.

---

## 4. Domande nuove

### A.276 — Un attacco con due danni in sequenza

Diciannove attacchi della 0.69 hanno **due danni in una cella sola**, uno dopo l'altro:

> Diavolo del ghiaccio — Morso: VA 15, danno «AC 2: 2d6+3 Naturale, poi 2d6 Magico, Gelo»
> Balor — Spada elettrica: «AC 2: 1d8+7 Magico, Taglio, poi 3d6 Magico, Fulmine»
> Mimic — Morso: «AC 2: 1d8+1 Naturale, poi 1d4 Naturale da acido»

La scheda del nemico tiene **un** danno e **una** Natura, quindi l'app non li scrive affatto: quegli attacchi
restano fra le capacità, dove si leggono ma non si tirano. Sommarli in una formula sola sarebbe sbagliato, perché
le due parti hanno Nature diverse e una resistenza al Gelo riguarda solo la seconda.

**La domanda:** come vuoi che l'app li tratti al tavolo?

1. **Due attacchi distinti** con lo stesso VA (uno per fase), così si tirano entrambi e ciascuno incontra l'AR
   giusta. È la soluzione che ci sembra più fedele.
2. **Un attacco solo** con la prima fase, e la seconda scritta accanto come promemoria per il Direttore.
3. Un'altra cosa che hai in mente.

### A.277 — La «pagina finale» di un blocco

Alcune schede rimandano a regole che stanno in una pagina **dopo** le creature del blocco: «usa resistenza
fisica, immunità collettive e localizzazioni funzionali **della pagina finale**» (Sciami). È una domanda di
forma, non di regole: ti è comodo tenerle lì, o preferiresti che ogni blocco avesse **tutte** le sue regole prima
delle creature, come fa la maggior parte dei blocchi? Per l'app la seconda sarebbe più semplice da leggere, ma il
manuale è tuo e il modo in cui lo sfogli al tavolo conta più del nostro lettore: se resta com'è, lo adattiamo noi.

---

## 5. Restano aperte

- **A.273** — le creature a due forme (licantropi, Ammantato): configurazioni come la A.203?
- **A.274** — gli attacchi col danno scritto senza la Natura: «Naturale» per impostazione? Sono 24 attacchi che
  tornerebbero tirabili subito.
- **A.275** — la Taglia si deduce dall'ingombro?
- **Il JSON dei PNG** (`SIMPLY_RPG_PNG_Abilita_v0.67.json`) dichiara lo sha256 del Manuale dei Mostri **0.67**,
  mentre il manuale è alla **0.69**: finché le due fonti non sono della stessa edizione, i venticinque modelli PNG
  restano alla 0.67. Serve il JSON rigenerato dall'edizione corrente.

Il primo numero libero diventa **A.278**.

---

## 6. Voci da spostare fra le «Risolte»

Nessuna.
