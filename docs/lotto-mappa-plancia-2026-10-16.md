# Lotto «mappa e plancia» del 16 ottobre 2026 — A.113, A.115, A.126, A.133, A.145, A.146, A.147 e A.126–A.138

Secondo lotto dopo la ricognizione del 15/10 (`docs/diff-davide-2026-10-15.md`, lotti proposti 2, 3 e 6).
Sette risposte di Davide applicate, tutte nei dati. Nessuna automazione nuova che obblighi a passaggi
(CLAUDE.md: «l'app aiuta il tavolo e non lo rallenta»).

Fonti: sezione 7 del Doc «per-davide.md», blocchi del 15/10/2026.

---

## 0. Rinumerazione

La domanda aperta il 15/10 sera sulla famiglia della CyberArma era numerata **A.165**, ma nel Doc di Davide
quel numero è già usato (A.109, «sospesa», nell'E&L). È diventata **A.166**, nel registro, nei pacchetti, nel
lotto e nel `TODO(Davide)` del catalogo. Le prossime domande partono da **A.167**.

---

## A. Veicoli

### A.147 — otto orientamenti a 45°

| Risposta | Nell'app |
|---|---|
| «Consentire almeno gli otto orientamenti a intervalli di 45°, anche in diagonale» | ← → girano il veicolo di **45°** (prima 10°); con Maiusc il **passo fine** (10°), che resta per quando il master vuole un orientamento libero |
| «Il controllo del posizionamento e del passaggio deve considerare l'ingombro nel suo orientamento effettivo» | già così: i quadretti occupati sono quelli coperti per almeno metà dal rettangolo ruotato (`src/mappa/forma.js`), e la rotazione non passa se finiscono su un muro o su un altro token |
| «Nessun costo automatico del tipo 1 Q ogni 45°» | girare non consuma Q (`manovre_rotazione.costo_in_q: 0`) |
| Sterzata stretta (+1 AzP, Pilotare −2), Inversione rapida (+1 AzP, −4), rotazione sul posto | **promemoria** nella scheda del veicolo e nella carta della plancia: tabella da leggere, nessun calcolo |

Dati: `data/mappa.json` → `token.rotazione_veicoli` (`passo_gradi: 45`, `passo_fine_gradi: 10`) e
`data/veicoli.json` → `manovre_rotazione`.

### A.113 — permessi, sincronizzazione, denominazioni

- i permessi sono nei dati (`veicoli.json` → `personaggio.permessi`): il Direttore modifica **tutti** i
  veicoli della campagna, compresi quelli personali dei PG, e la proprietà resta al personaggio;
- **senza server** il veicolo condiviso non sparisce più dalla tab: si consulta **in sola lettura**
  nell'ultima copia ricevuta, con la data, la revisione, il proprietario e il conducente di allora. La copia
  viaggia nel file del PG accanto al riferimento (`copia` del riferimento), e si aggiorna da sola ogni volta
  che la scheda legge o scrive il registro;
- le tre denominazioni (**Corpo principale**, Propulsione, Motore) erano già quelle giuste: verificate dai
  test, «Carrozzeria» non compare.

### A.145 — tabella delle azioni

Tutte le righe approvate (generali, auto e moto, moto, imbarcazioni, remi, vela, velivoli, astronavi) in
`veicoli.json` → `azioni.tabella`, consultabili nella scheda del veicolo e nella carta della plancia. I costi
sono **testo da leggere**: nessun campo numerico da sommare, nessun conteggio delle Azioni.

### A.146 — Attacchi di Opportunità

La regola è registrata (`veicoli.json` → `opportunita`) e compare come riga della tabella del punto
precedente. **Nessun avviso automatico**: troppe condizioni dipendono dal tavolo (bersaglio esposto,
Copertura, arma pronta del conducente). Il veicolo non ha una zona di controllo propria.

---

## B. Creature grandi

### A.126 — campo Spazio

Nuovo campo `spazio` del profilo dei nemici (`1 Q`, `2 × 2 Q`, `3 × 3 Q`), **preso dal profilo e non dedotto
dalla Taglia**: la pedina sulla mappa usa quello (`data/mappa.json` → `token.spazio_lato`). Un nemico senza il
campo tiene il lato della Taglia, come prima: nessuna regressione. «Crea nemico» lo scrive nel profilo invece
che fra le capacità; la mini-scheda lo mostra accanto a «Vola» e «Taglia Grande»; il master può sempre
cambiarlo sul token.

### A.133 — portata attorno all'ingombro

Era **già così**: `distanzaIngombri` misura fra i due ingombri e `celleZoc` costruisce la fascia attorno al
rettangolo, non dal centro. Il lotto lo mette nero su bianco nei dati (`mappa.json` → `zoc`) e lo blocca con i
test: una creatura 3 × 3 con portata 1 Q raggiunge chi le sta attorno e non chi è a 2 Q dal bordo; 2 × 2 e
3 × 3 non danno portata 2 o 3. Zone di controllo e Attacchi di Opportunità restano spenti con **«Mappa
semplice»** accesa, come ogni altro calcolo della mappa.

### A.126–A.138 — origine dei coni

Il cono di una creatura che occupa più di un Q parte dal centro di un **quadretto periferico** sul lato
dell'emissione (`origineConoCreatura`): di base quello verso cui il cono è rivolto, e il master lo sposta con
un tocco, muovendo il puntatore lungo il lato. I quadretti occupati dalla creatura restano **fuori** dal suo
cono (campo `escludi` del template, salvato con la scena). Per le creature di 1 × 1 Q non cambia niente.

---

## C. Capacità dei nemici (A.115)

Il formato delle capacità accoglie, **solo quando il profilo li dà**, `prova`, `azioni`, `risorsa`, `usi`
(quanti, per Round / scontro / Scena / giorno) e `passiva`. La mini-scheda mostra la descrizione completa e
quei parametri come etichette; dove i dati mancano resta il solo testo, senza costi o effetti per analogia.

Con un limite d'uso numerico compare il contatore **«N su M»** con «Usa» e «↩» per annullare: a 0 l'app
avvisa («ha finito gli usi… decide il master») e **lascia usare lo stesso**. I limiti «per Round» si azzerano
quando passa il Round. Le passive non richiedono Azioni solo se il profilo lo dichiara.

---

## Il veicolo di Pablo Zaion (non toccato)

Pablo ha l'**ASA Scout MK4**, record `veimuu14mqa0` del registro (revisione 16, del gruppo, con Pablo
conducente). Il suo file non è stato modificato. Che cosa cambia per lui quando aprirà la scheda:

- la prima volta che la tab Veicoli legge il registro, nel suo file verrà aggiunta l'**ultima copia** del
  record accanto al riferimento (`copia`): è la fotografia che gli serve per consultare il mezzo quando il
  server è spento. Il formato del file resta 8;
- con il server non cambia nulla di quello che vede: scheda unica, PI, andature, «Colpito» e «Ripara» come
  prima; in più trova le due tabelle da consultare (manovre di A.147 e azioni di A.145);
- senza il server, dove prima leggeva soltanto «si vede con il server acceso», adesso vede la scheda del
  mezzo in **sola lettura**, con la data della copia;
- sulla mappa il suo mezzo si gira di 45° per volta invece che di 10°: gli orientamenti di prima restano
  validi e il passo fine è sempre disponibile con Maiusc.

---

## Che cosa resta fuori

- il conteggio automatico delle Azioni dei veicoli e gli avvisi automatici degli Attacchi di Opportunità dei
  mezzi (A.145 e A.146 lo escludono: sono promemoria);
- la riscrittura dei profili del bestiario con il campo `spazio` (le creature pronte lo prendono già da
  «Crea nemico»; i nemici prestabiliti si aggiornano quando si toccano);
- i manuali nuovi del 15/10 (Mostri 0.3, Magia 1.5, Equipaggiamento 0.8) e le domande A.160–A.164, A.166.
