# Lotto «Manuale dei Mostri 0.13» del 16 ottobre 2026 — regole operative, Covata, Lorath, catalogo

Dopo il controllo d'inizio sessione: il Manuale dei Mostri è passato da **0.9 a 0.13** (Doc
`11Uxmz9GM2vU2knngtIPk_80532ABlHC3xL8ZvAXX7rE`, modificato il 16/10 13:47), con **115 creature** (le 0.9 ne
avevano 75), le nove caste della Covata e il Lorath. Testo in `docs/manuali-txt/mostri.md`. Gli altri manuali
e «per-davide.md» invariati (solo i riassunti della sezione 1 aggiornati).

Principio di CLAUDE.md: questi sono **dati per il master**, nessuna automazione nuova al tavolo. Valori
trascritti dalle schede; niente valori inventati.

---

## 1. Regole operative — nessun cambiamento

Ricognizione completa in `docs/mostri-0.13-ricognizione-2026-10-16.md`. Le regole comuni (cap. 4) e le
«Regole operative del catalogo» (cap. 8) rimandano a regole già nell'app e coincidono con le risposte già
applicate: §4.2 Morente = A.159/A.164, §4.3 PM, §4.4 danno e Contromisure, §4.5 spazio = A.126/A.133, §4.6
Abilità non riportate = A.116, §8 (Azioni, Volo, Picchiata, Tiri a distanza, Capacità innate, Negare Potere,
Anatomia) tutte rimandi a Giocatore/Magia, §5.2 = A.160 (7 punti), §3.1 = A.164 (un dato assente non vale 0).
**Dove un ingombro del manuale contraddice una regola approvata non si è cambiato:** è la A.167.

## 2. GS e PX — campo informativo (A.161, «nel frattempo»)

Aggiunto il campo `gs_px` al formato dei nemici (`data/formato_nemici.json` → `{ gs, px, per_pg }`),
**informativo**. La mini-scheda lo mostra («GS Principiante · 10 PX per 4 PG», `src/ui/nemici.js`); l'app
**non calcola i PX** e **non unifica** la scala GS (Principiante…Leggenda) ai gradi del bestiario proposto
(Minore…Molto potente, 7 PG). Il calcolatore «PX della partita» resta la A.161, prossimo lotto.

## 3. Covata (nove caste) e Lorath — cap. 7

`tools/genera_mostri_covata.mjs` → `esempi/nemici/mostri/`: Rasente, Raccoglitore, Trasportatore, Saltatore,
Corazzato, Tagliente, Regina Comandante, Regina Incubatrice, Regina Madre, Lorath. Tratti comuni della Covata
(resistenza al Fuoco, Ignifugo 6 come Contromisura, disorientamento da freddo); il Lorath non è Covata.
Spazio, portata per attacco, capacità con i parametri (p. es. l'Onda psichica della Regina Comandante: 4 PM,
1 AzP, 1 volta per Round, PS Volontà). Ingombri non quadrati nelle note (A.167).

## 4. Catalogo, blocco «Bestie e predatori» — cap. 8 (10 di ~115)

`tools/genera_mostri_bestie.mjs` → `esempi/nemici/mostri/`: Lupo, Lupo feroce, Orso bruno, Cinghiale gigante,
Leone, Iena gigante, Ragno gigante, Scorpione gigante, Serpente costrittore gigante, Coccodrillo gigante.

- Movimento: il formato ha solo passo/corsa/scatto/volo (§2.14); le andature secondarie (arrampicata, nuoto)
  e la scurovisione restano nelle note o in una capacità, come le scrive il manuale.
- Spazio: quadrati (1 Q, 2 × 2 Q, 3 × 3 Q) nel campo `spazio`; 2 × 1 Q (Lupo feroce, Leone, Iena) e 3 × 2 Q
  (Coccodrillo) nelle note con il rimando ad A.167, taglia Grande.
- Attacchi che non infliggono danni (Getto di seta del Ragno: applica Immobilizzato) sono **capacità**, non
  attacchi, perché il campo `danno` del formato vuole i dadi.
- GS/PX informativo su ciascuna.

**Restano** gli altri blocchi del cap. 8 (circa 95 creature), da fare a blocchi nei prossimi lotti:
la prima parte senza nome (Aarakocra, Aboleth, Ankheg, Arpia, Basilisco, Bestia distorcente, Bulette,
Chimera, Cockatrice, Ettercap, Grick, Grifone, Ippogrifo, Manticora, Orsogufo), «Bande e grandi avversari»
(Goblin, Hobgoblin, Bugbear, Coboldo, Orco, Gnoll, Ogre, Ettin, Minotauro, Troll), «Non morti», «Costrutti e
creature elementali», «Giganti e abitanti delle montagne» e gli altri gruppi. I blocchi con equipaggiamento
(bande umanoidi) hanno scelte per scheda — AR con/senza scudo, Parata/Schivata separate, nomi d'Abilità
abbreviati da mappare — e vanno trascritti a mano come questi, senza automatismi.

## 5. Cosa trova di nuovo il master

- Nel bestiario e in «+ Aggiungi nemico» ci sono le nove caste della Covata, il Lorath e dieci bestie del
  catalogo, pronte da mettere in campo.
- Ogni scheda mostra il GS e i PX del manuale (informativi): servono per bilanciare, non li calcola l'app.
- Gli ingombri rettangolari del manuale sono annotati, ma la pedina sulla mappa resta quadrata finché Davide
  non decide (A.167).

## 6. Verifiche

`npm test` verde (1836), validatore verde, `node tools/verifica_frasi.mjs` verde (1277/1277). Nuovi test:
`tests/mostri-bestie.test.js` (Spazio/portata/GS-PX dai dati, Getto di seta come capacità) e, dal lotto
precedente, `tests/mostri-covata.test.js` e `tests/a161-gs-px.test.js`. Bestiario online rigenerato e
controllato (`tests/bestiario-pagina.test.js`).
