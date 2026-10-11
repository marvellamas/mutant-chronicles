# Controllo dei manuali dell'11 ottobre 2026 — solo ricognizione

Quattro Doc cambiati dal controllo del 9 ottobre. **Nessun dato applicato:** la sessione dell'11/10 lavora
sulla mappa (muri, porte, template, nemici prestabiliti). Le date viste del registro **non** sono aggiornate
per Giocatore e Armamenti; i testi nuovi sono in `docs/manuali-txt/`, l'E&L in
`docs/risposte-master-2026-09-26.md` e `docs/per-davide.md` sono stati riscaricati.

| Doc | Modificato (UTC) | Edizione | Che cosa cambia |
|---|---|---|---|
| Manuale del Giocatore | 2026-10-10 10:48:18 | **0.47** (prima 0.46) | §5.7 ricarica, §5.8 Scudo Punisher, §5.10 Carabina nell'alloggiamento, §5.11 mirini, §8.8 Ricarica Migliorata |
| Manuale degli Armamenti | 2026-10-10 10:52:37 | **0.60** (prima 0.59) | §7.3 Mirino laser (scheda nuova), §7.3.4 consumo, §7.4 scudi, §7.4.1 Alloggiamento Punisher, §7.1.6 FOR intera |
| E&L – Risposte approvate | 2026-10-09 22:40:53 | — | A.151, A.152 e il blocco A.153–A.157 del 10/10 |
| per-davide.md | 2026-10-09 22:41:02 | — | pacchetto del 09/10 applicato da Cowork; nessuna risposta nuova oltre a quelle dell'E&L |

## 1. Manuale del Giocatore 0.47

- **Regola — Mirino laser (§5.11).** La riga «Un mirino non può trasformare la penalità in un bonus positivo»
  diventa: «Reflex, Ottico e Di precisione riducono soltanto la penalità di distanza… Il **Mirino laser
  concede invece +1 VA per colpire entro 20 Q**, se il tiratore distingue il punto sul bersaglio, senza
  preparazione aggiuntiva. Per ogni attacco si applica un solo mirino.» È il primo mirino con un bonus
  positivo: tocca `src/attacco.js` e gli effetti degli accessori.
- **Regola — Scudo Punisher (§5.8, §5.10).** Con Carabina o Pistola Punisher nell'alloggiamento lo Scudo
  concede **Copertura Leggera** al portatore contro il tiro diretto (−2 VA a chi lo attacca), non cumulabile
  con altre Coperture; sparare attraverso l'alloggiamento **non** applica il −2 VA per attaccare dalla
  propria Copertura né i costi per esporsi e rientrare. La Carabina è **Imbracciata** finché è
  nell'alloggiamento e si usa a una mano **confrontando il requisito con la FOR intera** (non dimezzata).
- **Regola — Ricarica (§5.7).** Il testo recepisce la A.135: 2 cartucce per AzP, 4 con Ricarica Migliorata,
  6 con carichino preparato; sostituzione di caricatore o cella 1 AzP; preparare caricatori da munizioni
  sciolte un minuto ogni 50 colpi. **Già applicato** nell'app (decisione 139).
- **Regola — Ricarica Migliorata (§8.8).** Il Talento passa da «fino a tre munizioni» a **4 cartucce** per
  operazione, non aumenta i 6 colpi del carichino, e un tamburo da sei richiede due operazioni (4 + 2).
  Nell'app il Talento è già a 4 (decisione 139): **da verificare** che il testo coincida.

## 2. Manuale degli Armamenti 0.60

- **Dato nuovo — Mirino laser (§7.3).** 500 cr, Reperibilità NC, Qualità Comune, PS Integrità 10, PI 3;
  +1 VA entro 20 Q; montaggio o rimozione 1 AzP con due mani; accensione o spegnimento 1 AzP; NEC Verde
  compatto da 100 Lx, 1 Lx/h, 100 ore, ricarica 1 cr, ricambio carico 10 cr REP CO; non si somma ad altri
  mirini né all'assistenza tecnologica equivalente di elmetti e impianti (§7.21.1: si usa il maggiore), ma
  **si somma** al +1 VA della Pistola Punisher nell'alloggiamento (+2 VA complessivi entro 20 Q).
- **Dato nuovo — Alloggiamento Punisher (§7.4.1).** Alloggiamento integrato dello Scudo per una Carabina
  **oppure** una Pistola Punisher alla volta; agganciare o sganciare 1 AzP senza Prova; Pistola +1 VA;
  Copertura Leggera direzionale; AR passiva +2 e Parate restano.
- **Testo — §7.1.6 e §7.4.** Eccezione della FOR intera per la Carabina nell'alloggiamento; «salvo una
  configurazione espressamente prevista dalla scheda» per la mano occupata.

## 3. E&L: risposte nuove (A.151–A.157)

| Voce | Risposta | Stato nell'app |
|---|---|---|
| **A.151** | Carichini: Tamburo 6 colpi, 100 cr, 0,1 kg; Serbatoio 6 colpi, 150 cr, 0,2 kg; entrambi Comune, PS 10, PI 2, REP CO; il peso delle cartucce si somma a quello a vuoto | **dati da applicare** (erano «da definire») |
| **A.152** | Colt Hammershot: proiettili **da pistola** (l'associazione del catalogo è corretta); la scheda del manuale va aggiornata alla A.135; nel file di Michele i 6 «proiettili pesanti» diventano «proiettili da pistola» | catalogo già giusto; **file del PG da correggere** (lo fa Marcello) |
| **A.153** | A Terra e Copertura a distanza **si sommano**: −2 / −4 / −6 | conferma il comportamento dell'app |
| **A.154** | Cartuccia del decontaminante: **0,5 kg** piena, peso fisso | **dato da applicare** |
| **A.155** | Pergamene standard: 0,1 kg, Comune, PS 10, PI 1, per tutti i Gradi | **da verificare** (applicato il 09/10 come ipotesi) |
| **A.156** | Infusione fallita: si perdono **tutti** i PM impegnati (3 × Grado + PM da sigillare) e i reagenti | conferma il comportamento dell'app |
| **A.157** | «Rituale: non consentito» vieta solo il lancio rituale: l'infusione in Consumabili e Artefatti **è permessa** | **avviso da sostituire** in «Crea consumabile» |

## 4. per-davide.md

Il pacchetto del 09/10 è stato applicato da Cowork: sezioni riordinate, **sezione 1 vuota** («Nessuna, al
momento»), A.147–A.157 sistemate, sezione 3 con A.111, A.122, A.124, A.127 e A.128 in implementazione.
Nella sezione 7 non c'è nulla oltre al blocco «Aggiornamento cumulativo» già registrato il 09/10.

## 5. Lotto proposto (sessione dedicata)

1. **Mirino laser** (Giocatore §5.11 + Armamenti §7.3): voce nel catalogo accessori con NEC e Integrità,
   effetto +1 VA entro 20 Q in «Attacca!», limite di un solo mirino per attacco e del massimo con
   l'assistenza tecnologica equivalente (§7.21.1). ~1 sessione.
2. **Scudo Punisher e Alloggiamento** (Giocatore §5.8, §5.10 + Armamenti §7.4.1): configurazione sulla voce
   dello Scudo, Copertura Leggera direzionale, Carabina Imbracciata con FOR intera, Pistola +1 VA cumulabile
   col Mirino laser, nessun −2 per sparare dalla propria Copertura. ~1 sessione e ½.
3. **Risposte A.151, A.152, A.154, A.157**: dati dei carichini, peso della cartuccia del decontaminante,
   avviso dell'infusione; verifica di A.155 e del testo di Ricarica Migliorata. ~½ sessione.
4. **Registro**: date viste di Giocatore e Armamenti aggiornate quando i lotti 1–3 sono applicati.
