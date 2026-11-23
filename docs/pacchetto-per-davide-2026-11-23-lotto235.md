# Pacchetto per il Doc «Per Davide» — 23/11/2026, lotto 235

Da applicare al Doc «per-davide.md» su Drive (lo incolla Cowork o Marcello; Claude Code non scrive nei Doc).
Vale la regola del lotto 233: **nel Doc solo ciò che Davide deve decidere, correggere, aspettare o fare.** La
contabilità per numero sta in `docs/registro-domande.md` e la tiene `tests/registro-domande-233.test.js`.

---

## 1. In coda alla sezione 1 (domande aperte) — due voci nuove

**A.307 — CyberArma, il profilo del cristallo Viola per il Tecnomante.**
Il «Riferimento rapido» del §7.25.5 degli Armamenti elenca il danno base dei quattro focalizzatori di riferimento —
Bianco 1d8+3, Rosso 1d8, Blu 1d8, Verde 1d8+1 — e non il Viola, che il §7.25 chiama «il Viola eccezionale». Nella
tabella per Grado dei Custodi il Viola ha 1d10+1, come il Rosso e il Blu, cioè senza bonus fisso del cristallo.
Nell'app abbiamo scritto che per il Tecnomante e per le conversioni a CM o NeC il Viola fa **1d8 Magico, senza
bonus numerico**, più la Corruzione del frammento. È una deduzione dalla tabella, non una riga che il manuale
scriva: la confermi, o il Viola ha un suo danno base nel Riferimento rapido?

**A.308 — la CyberArma di Dimitri: il focalizzatore Verde va dichiarato?**
Il §7.25.4 dice «È installato soltanto il focalizzatore Verde». Nel file di Dimitri (istantanea del 21/11) la voce
dell'arma non dichiara nessun focalizzatore, quindi oggi la scheda non gli dà i benefici del Verde: la CyberArma
risulta **VA 9, danno 1d8+1, Parata 8** (il +1 al danno è il bonus di DES 7 del §5.13, non il cristallo).
Dichiarando il Verde come dice il manuale diventa **VA 10, danno 1d8+2, Parata 9**. L'app non l'ha scritto da sé
perché sposta tre valori di un personaggio vero alla vigilia di una serata: lo dichiariamo? Nella scheda, in
Modifica master, la riga «Cristallo focalizzatore → Verde» lo fa in un tocco.

**Primo numero libero: A.309.**

---

## 2. Sezione 4 (correzioni ai manuali) — nessuna riga nuova

Nessuna nuova contraddizione fra i manuali trovata in questo lotto. Resta quella già scritta per i Veicoli
(A.302: il §10 scrive ancora «settore di 120°» mentre vale la A.280, 180° frontale).

---

## 3. Sezione 5 (manuali attesi) — due aggiornamenti

- **Manuale dei Veicoli**: su Drive il titolo è ora **v0.23** (21/11, 21:11 UTC, 67,3 MB). La **0.22 non si è
  vista**, come non si era vista la 0.20. Il testo non è ancora recepito nell'app, dichiarato in attesa:
  l'esportazione in Markdown è rifiutata da Drive per il peso del file, e il testo semplice perde le tabelle nella
  forma in cui l'app le legge. Resta quello che chiedevamo nella A.303 (un numero nuovo a ogni pubblicazione) e
  nella A.304 (quanti dei venti mezzi dei capitoli 16 e 17 servono davvero al tavolo); si aggiunge una richiesta
  pratica: **un'esportazione del Manuale dei Veicoli senza le immagini**, o un Doc per capitolo. Le immagini sono
  quasi tutto il peso.
- **Scheda «ASA Scout MK4 — scheda v0.6»**: modificata il 21/11 alle 21:11 **senza cambiare numero** (resta 0.6).
  Riscaricata e registrata. Le due differenze di contenuto sono l'altezza in trasporto (2,7 m) e i pesi del FIAT LUX
  (4.500 kg a vuoto, 1.500 kg di carico utile, 6.000 kg a pieno carico). **Nessun valore che l'app tiene cambia**:
  i due fatti nuovi non esistono fra i campi dei veicoli e entreranno col lotto dei Veicoli. Vale anche qui la
  A.303: se cambia il contenuto, conviene cambiare il numero.

---

## 4. Sezione 3 (lavori in corso) — una riga

**CyberArma: i cinque cristalli, fatti.** Gli effetti dei cinque focalizzatori del §7.25 e del §7.25.5 sono
nell'app: cinque profili per colore («CyberArma Bianca, Rossa, Blu, Verde, Viola»), che si cercano scrivendo
«CyberArma» e si scelgono dal catalogo. Il Bianco mostra il ×2 contro l'Oscura Simmetria sul **danno completo del
colpo**, `(1d8+4)×2`, con la frase che dice che il +3 è dentro il moltiplicatore. Il Verde dà +1 VA di Attacco,
+1 VA di Parata e +1 al danno, ciascuno una volta sola. Il Rosso e il Blu scrivono accanto all'arma la condizione
del §5.24 — PS Tempra, −2 VA o niente Azioni fuori dalla propria Iniziativa, 1+1d3 Round, solo se almeno 1 danno è
passato oltre l'Armatura e se la Contromisura è stata superata — **e l'app non la applica**: non tira la PS, non
mette la penalità, non conta i Round. Il Viola porta il posto per la Corruzione del singolo frammento, senza alcun
valore predefinito. Il cristallo si cambia dalla scheda in Modifica master, e aggiorna **lo stesso esemplare**:
nome, Integrità e storico restano, e non nasce una seconda arma.

Nessuna CyberArma è acquistabile dal catalogo: «Compra» è spento col motivo, come dice il §7.25 («ogni esemplare
rimane un pezzo unico… il valore indicativo non garantisce una vendita: il Direttore stabilisce compratore,
disponibilità e prezzo effettivo»). I 7.500 cr restano scritti come **valore**, non come prezzo.

---

## 5. Elenco delle regole che l'app non conta: **105 → 104**

Una riga **scende**, e nessuna sale. La riga «**Focalizzatori della CyberArma**» della sezione 4 passa da **4 a 3**:
diceva «Rosso, Blu e Viola non hanno un numero nel manuale; il ×2 del Bianco contro l'Oscura Simmetria è una
condizione», e il **×2 del Bianco adesso l'app lo conta** — la formula `(1d8+4)×2` si tira con un tocco come ogni
danno moltiplicato (A.199), col `+3` dentro il moltiplicatore.

Restano in elenco, ma ora sono **scritte accanto all'arma** invece di non comparire da nessuna parte:

1. la **Prova Salvezza di Tempra del Plasma** e il suo −2 VA per 1+1d3 Round;
2. la **Prova Salvezza di Tempra dell'Elettricità** e il «non spende Azioni fuori dalla propria Iniziativa» per
   1+1d3 Round;
3. la **Corruzione del frammento Viola**: il valore è del singolo frammento e lo scrivi tu.

Per tutte e tre vale la condizione del §5.24 che l'app non può verificare da sé — almeno 1 danno passato oltre
l'Armatura applicabile, e la Contromisura numerica (Dissipante, Isolante) superata dal danno residuo. La riga
«**Proprietà del danno Plasma ed Elettricità (§5.24)**» della stessa tabella resta a **2** e non cambia: l'app
continua a non applicarle, né per la CyberArma né per la Spada dei Tre Riflessi.
