# Pacchetto per il Doc «Per Davide» — 23/11/2026, lotto 238

> Da applicare al Google Doc «per-davide.md» (Cowork o Marcello). Claude Code non scrive nei Doc.
> **Primo numero libero: A.312.**

---

## In testa alla sezione 1 — le sei che aspettano te

Nessuna è nuova: sono quelle dei lotti 236, 237 e 238, messe insieme perché sono tutto quello che ferma del
lavoro. Le prime due fermano dei mezzi interi, le altre quattro fermano un numero ciascuna.

### A.304 — Quali dei ventuno mezzi terrestri servono al tavolo?

Il Manuale dei Veicoli 0.23 ha **ventuno mezzi terrestri** (undici nel capitolo 16, dieci nel capitolo 17) più i
**due Pursuit T4 del capitolo 18**. Il testo è salvato e si legge per intero: 41 tabelle su 41, zero valori «da
definire». Modellarli tutti è un lotto grosso, e ventuno mezzi che il gruppo non userà sono lavoro buttato.

**Dicci quali servono** — anche solo tre o quattro nomi — e li facciamo con tutti i loro campi. Gli altri restano
nel manuale, leggibili, pronti per quando serviranno.

### A.307 — Peso, Qualità, PI e Reperibilità dei due moduli Warden TC

I due moduli del §28.6 della Magia (Individuare 6 e Esorcizzare Corruzione 12) hanno prezzo, Grado, rarità, SnT e
riserva, ma non **peso, Qualità, PS Integrità, PI e Reperibilità**. Non li inventiamo: nei dati sono dichiarati «da
definire» e la scheda lo scrive.

### A.308 — La CyberArma di Dimitri ha un focalizzatore Verde installato?

Il §7.25.4 degli Armamenti dice che la CyberArma del Custode ha un focalizzatore installato, e la scheda di Dimitri
non lo dichiara. Dichiararlo di nostra iniziativa gli cambierebbe tre numeri:

| | oggi | col Verde dichiarato |
| :-- | :-- | :-- |
| VA per colpire | 9 | **10** |
| danno | 1d8+1 | **1d8+2** |
| Parata con quell'arma | 8 | **9** |

Non lo tocchiamo: un valore di un PG vero non si muove senza che lo dica tu.

### A.309 — Il recupero dello scudo di un mezzo, fra due scontri

Il §16 dice che lo scudo recupera «dopo tre rnd consecutivi senza essere colpito, fino al massimo». Il Round
esiste dentro uno scontro: **fuori da uno scontro l'app non rimette ScE da sé** (e se vuoi il recupero fra due
scontri, gli ScE li scrivi tu nella scheda — un campo, due tocchi).

**La domanda:** c'è un recupero anche fuori dal combattimento — a riposo, all'approdo, con una riparazione — e con
quale tempo? Finché non lo dici, l'app non lo fa.

### A.310 — Due elmetti Recon, o un elmetto con due sigle?

Nel catalogo ci sono **due voci** di elmetto Recon con lo stesso prezzo, le stesse quattro proprietà, gli stessi
effetti e la stessa alimentazione. La domanda è se sono due oggetti o lo stesso visto da due parti.

**Le due frasi a confronto:**

| dove | che cosa dice |
| :-- | :-- |
| **A.294** (tua risposta del 19/11) | «Le funzioni che il catalogo già dava all'Elmetto Recon ASA coincidono con la risposta. Contano solo da indossato, una volta sola.» |
| **Veicoli 0.23 §18.2** (dotazione di squadra del Pursuit T4) | «5 Elmetti SIA Recon — 37.500 cr» (7.500 cr l'uno) |

**I due record affiancati:**

| | `elmetto-asa-recon` | `elmetto-sia-recon` |
| :-- | :-- | :-- |
| nome | Elmetto Recon ASA | SIA Recon |
| costo | 7.500 cr | 7.500 cr |
| AR · PI · Qualità · PS · Reperibilità | 0 · 4 · Non comune · 12 · RA | 0 · 4 · Non comune · 12 · RA |
| proprietà | Visione notturna · Sensori 1 a vista e udito · Filtro respiratorio 2 · Allerta tattica 1 | **le stesse quattro, parola per parola** |
| effetti calcolati | Percezione +1 situazionale · Tempra +2 uso specifico · Iniziativa +1 | **gli stessi tre** |
| alimentazione | NEC Verde 3, ordinaria | NEC Verde 3, ordinaria |
| paragrafo | §7.21.5 (nota: «proprietà del modello storico ASA, distinte da quelle del SIA Recon del 504 PE», §7.26) | §7.21.5 (nota: «è il modello SIA, distinto dall'Elmetto Recon ASA dei PG», §7.26) |

**Da dove viene il secondo, e questo l'abbiamo fatto noi.** `elmetto-sia-recon` **non è stato letto dal manuale**:
l'ha creato il **nostro lotto 228** (commit `ec9febc1`, 20/11/2026) applicando la tua A.295 — «ASA e SIA sono due
sigle distinte» — e l'ha creato **copiando la voce ASA** e cambiandole id, nome e note
(`tools/lotti/lotto_228_sia.mjs`: `const o = copia(asa); Object.assign(o, { id: 'elmetto-sia-recon', … })`).
Ecco perché prezzo, proprietà, effetti e alimentazione coincidono fino alla virgola: non è una conferma che siano
lo stesso oggetto, è la traccia della nostra copia. Il manuale, per il modello SIA, non ci ha mai dato un suo
profilo.

**Quindi la domanda, precisa:** il SIA Recon ha **valori propri** (prezzo, proprietà, bonus) che dobbiamo leggere
da qualche parte, o è lo stesso elmetto che l'ASA e il SIA chiamano con la loro sigla, e la voce va **una sola**?
Nel secondo caso togliamo la copia e lasciamo i nomi alternativi. Non decidiamo noi: una voce in più e una in meno
cambiano quello che un PG ha addosso.

### A.311 — L'arco di tiro del Mitragliatore Leggero Punisher dello Scout T4

Il lotto 237 ha creato il profilo `asa-scout-t4` (Scout di serie, Punisher, 132.510 cr) accanto al FIAT LUX dei PG
(M606, **arco frontale di 180°** per la A.280). Per il Punisher del T4 **il manuale non dà un arco**, e non lo
copiamo da quello del M606: sono due armi diverse su due montaggi diversi. Nei dati non c'è un arco, e la scheda
lo dice.

---

## Sezione 3 — lavori in corso, da aggiungere una riga

- **Il trasporto a bordo di una nave (lotto 238).** L'app sa dire se un mezzo entra nella stiva della Neverlost, e
  quando non entra dice **quale misura sfora e quale è il limite** — «larghezza 6 m, l'apertura del portellone è
  4,5 m» — non «non ci sta». È un avviso: decide il Direttore. Dove il manuale non dà una misura, l'esito è «non
  si sa» e non si deduce niente dalla massa, dai posti o dalla taglia. Il FIAT LUX entra, coi numeri della scheda
  ASA Scout MK4 0.6 (6 × 2,6 × 2,7 m, 6.000 kg a pieno carico) contro l'apertura e la rampa del §11 (4,5 × 3,5 m,
  10 t).
- **Il recupero dello scudo (lotto 238).** C'era dal lotto 158; adesso si conta **solo dentro uno scontro aperto**
  e non supera mai il massimo del profilo. Fuori da uno scontro il pulsante è spento col motivo, e gli ScE si
  scrivono a mano. Vedi **A.309**.

---

## Sezione 4 — correzioni ai manuali, nessuna riga nuova

Resta quella del lotto 229: **Veicoli §16, l'arco del M606 del FIAT LUX è scritto 120°** mentre la tua **A.280**
dice «180° frontale». Vale la risposta; il manuale non è stato corretto (era la A.302).

---

## Il numero delle regole che l'app non conta

**104**, come nel lotto 237: questo lotto non ne ha aggiunta né togliata nessuna. Le tre cose che restano fuori dal
modello del trasporto sono dichiarate e contate lì:

- la **lunghezza con cannone rivolto in avanti** (serve a un carro con la torretta in avanti che deve passare in un
  varco misurato: un portellone, un ponte, una galleria; modellarla vuol dire un orientamento della torretta
  separato dallo scafo e la geometria delle sagome da rifare);
- la **profondità della stiva**, che il manuale non dà: la lunghezza di un mezzo non si confronta con niente e la
  giudica il Direttore;
- il **passaggio libero consigliato**, che è una condizione e non un confronto.

---

## Domande nuove in questo lotto

**Nessuna.** Primo numero libero: **A.312**.
