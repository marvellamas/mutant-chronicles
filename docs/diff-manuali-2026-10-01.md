# Manuali del 01/10/2026: differenze e stato

Controllo del 1° ottobre 2026.
- **Cambiati:**
  - Manuale del Giocatore 0.43 → **0.45** (01/10 08:22 UTC);
  - Manuale della Magia 1.1 → **1.3** (08:22);
  - Manuale degli Armamenti 0.55 → **0.58** (10:17);
  - Manuale dell'Equipaggiamento 0.3 → **0.5** (08:32);
  - E&L (07:25).
- **Invariato:** per-davide.md (30/09 12:05): nessuna risposta nuova di Davide.

Testo salvato in `docs/manuali-txt/` (E&L in `docs/risposte-master-2026-09-26.md`, ora con la sezione «Risposte ai 19 quesiti dell'app»). Stato: ✔ recepito · ○ già così · ▢ da applicare (lotti successivi).

**Lotto 1** (questo): le parti piccole e complete di Giocatore, Magia e Armamenti. L'Equipaggiamento 0.5 è dei lotti 2–4 (`docs/backlog.md`), salvo le autonomie NEC delle sole schede collegate alle dotazioni.

## Manuale del Giocatore 0.45

| Paragrafo / tema | Tipo | Contenuto | Stato |
|---|---|---|---|
| §2.16 (introduzione) | regola nuova | «Le dotazioni si ricevono una sola volta, alla creazione: acquisire successivamente un’altra Classe non assegna nuovo equipaggiamento.» Oggetti integri, NEC carichi compresi, ricambi solo nelle quantità indicate. | ✔ `regole.json` → `dotazioni_iniziali` (con la frase, controllata da `tools/verifica_frasi.mjs`); l'app già così: test in `tests/dotazioni.test.js` (Agente che prende il Soldato al 4°: nessuna voce nuova) |
| §2.16.1–2.16.26 (dotazioni comune e delle Classi) | testo | Le «batterie cariche da 24 ore» diventano **NEC Verdi** con autonomie diverse. Compatto da 100 ore per torcia, comunicatore personale e lampada frontale; compatto da 50 ore per registratore, rilevatore, videosorveglianza e terminali palmari; standard da 200 ore per comunicatore da squadra e lanterna; standard da 1.000 Lx (25 Lx/h, 40 ore) per corredi da scasso, elettronici, di manutenzione e scanner. Rimandi all'Equipaggiamento §5.4. | ✔ `dotazioni.json` (testi di comune e Classi, `versione_manuale` Giocatore 0.45). Schede collegate (`rif`): torcia, lampada, lanterna, comunicatori, registratore, rilevatore, videosorveglianza, binocolo, monocolo con l'alimentazione NEC del testo 0.5 (§2.3, §4.1–4.3) |
| §2.16.27 | testo | «Si usa soltanto una corrispondenza corporativa espressamente indicata nei manuali; dove manca, si mantiene il modello commerciale.» | ✔ `dotazioni.json` → `corporativi.testo` (l'app già così) |
| §2.16.29 | testo | Medico e Paramedico tengono le loro dotazioni; naniti e postazioni medicochirurgiche non sono dotazioni gratuite. | ✔ `dotazioni.json` → `scambio.testo` |
| §2.16 (Classi magiche) | testo | Il Focus iniziale è semplice e già sintonizzato; non aggiunge bonus o PM; profili completi dei Corredi e del Focus nell'Equipaggiamento §5.8. | ✔ testo; ○ il Focus non ha mai occupato sintonizzazione (vedi Magia) |
| §2.0, tabella | testo | Passo 8 «Equipaggiamento iniziale» senza «integrazione successiva». | ○ (nessun dato) |
| Tecnomante (cap. 3), Abilità Artefatti (cap. 4), §5.21 | refuso | «Manuale degli Equipaggiamenti, §7.10» → «degli Armamenti, §7.10». | ✔ `abilita.json` (Artefatti), `classi.json` (Tecnomante: due testi) |
| §5.15–5.16 (cure), §5.21 (UMN), Processore neurale | testo / regola | Naniti medici, postazioni medicochirurgiche, costi UMN di protesi e innesti, Processore neurale di Abilità: tutti con rimando all'Equipaggiamento cap. 6–7. | ▢ lotti 3 (cap. 7) e successivi; l'Umanità non è tracciata (backlog 13) |

Restano nel testo 0.45 due «Il binocolo non richiede batterie» (§2.16, Esploratore e Agente) accanto a «non richiede NEC»: errata nel pacchetto per il Doc.

## Manuale della Magia 1.3

| Paragrafo | Tipo | Contenuto | Stato |
|---|---|---|---|
| Sez. 2, Focus | regola | Il Focus personale semplice assegnato alla creazione è già sintonizzato e non aggiunge bonus o PM. Profilo nell'Equipaggiamento §5.8. | ○ voce di dotazione senza effetti, fuori dalla sintonizzazione (che conta solo gli Artefatti); ✔ nota in `dotazioni.json` → `oggetti_dotazione.focus-personale.nota`; test in `tests/dotazioni.test.js` |
| Sez. 6, Chroma | testo | Il Rosso alimenta «riserve mistiche Rosse» (non più «celle energetiche»). I **NEC** Rossi, Blu e Verdi sono la fonte tecnologica: Lx, ricaricabili, senza Sintonizzazione. Nessuna conversione Lx–PM. | ✔ `regole.json` → `chroma._nota_nec` (promemoria, nessun motore) |
| Sez. 8 | testo | I chip del Processore neurale non migliorano Incantesimi, Risorse Interiori, Sintonizzazione o magia. | ▢ con il cap. 7 dell'Equipaggiamento (il Processore oggi non c'è) |
| Identificare Potere (scheda) | refuso | «Manuale dell’Equipaggiamento, §7.10» → «degli Armamenti». | ✔ `incantesimi.json` (`versione_manuale` Magia 1.3) |

## Manuale degli Armamenti 0.58

| Paragrafo | Tipo | Contenuto | Stato |
|---|---|---|---|
| §7.1.9 (Mishima) | catalogo | **Katana Ryūjin**: Guerra, 1 mano, 1d8+1, portata 1, FOR 4, PI 5, Non comune, PS INT 12, RA, 4.000. Precisa 1; Affondo, Spazzata. Attivazione: +1d6 Plasma, 5 cariche a cella. A cella scarica, profilo della Katana. I cataloghi passano a 40 armi ravvicinate. | ✔ `armi_corporative.json` (`tools/lotti/lotto_armamenti_058.mjs`); cella ravvicinata compatibile; ▢ A.62 (natura del danno attivato) |
| §7.3.4 | regola / catalogo | La «batteria di servizio» degli accessori diventa NEC Verde. Torcia tattica: compatto da 100 Lx, 2 Lx/h, 50 ore. Moduli di visione: standard da 1.000 Lx, 10 Lx/h, 100 ore. Elmetto elettronico: 25 Lx/h, 40 ore. Ricarica in un'ora a 0,01 cr/Lx; ricambio 10 (compatto) o 100 (standard). | ✔ accessori; la vecchia «Batteria di servizio» (stesso id) è il NEC Verde compatto di ricambio, più il NEC Verde standard di ricambio (100) |
| §7.5.1, §7.10 | testo | Celle NEC in Lx, senza Sintonizzazione, nessuna conversione Lx–PM; «batterie mistiche» Rosse, Blu e Verdi. | ✔ `artefatti.json` (frasi) |
| §7.12–7.19 (IAS, interfaccia neurale, UMC, scanner, postazione, robot) | testo | NEC Blu IAS da 20 cariche (consumo in Lx da dimensionare); Interfaccia neurale Cybertronic 1 UMN (standard 2), senza NEC; UMC alimentata da NEC Verde; postazione medica con Modulo Rosso esterno (1.000 Lx/h); Cuirassier con NEC Rosso dedicato. | ✔ frasi (`tools/lotti/aggiorna_frasi.mjs`); ▢ A.64 (IAS in Lx) |
| §7.11.6, §7.15, §7.16, §7.18 (esoscheletri) | — | Le schede scrivono ancora «batteria carica / dedicata». | ▢ A.63 |
| §7.20.2 | testo | Caricatori: «pacchi NEC dei lanciafiamme» al posto dei serbatoi di combustibile. | ✔ |
| §7.20.5 | regola / catalogo | Celle d'arma = **NEC Blu** con riserva in Lx. Ravvicinata 250 Lx, carica 200, ricarica 2,5 (prima 40). Plasma commerciale 500 Lx, 400, 5 (prima 80). Hellblazer 750 Lx, 600 (prima 450), 7,5 (prima 90). KEP 808 250 Lx, 200 (prima 300), 2,5 (prima 60). Intruder 750 Lx, 600, 7,5 (prima 120). Caricatore da campo: 0,5 kg, fino a 1.000 Lx/h. | ✔ `munizioni.json` (`cella.riserva_lx`, prezzi); validatore: `ricarica_costo` può non essere intero |
| §7.20.6 | regola / catalogo | **Pacchi NEC dei lanciafiamme**: niente combustibile liquido; 50 Lx a getto. Nemesis 214 5 getti, 250 Lx, 200 / 2,5; commerciale ed Eruptor 10, 500, 400 / 5; Purifier 15, 750, 600 / 7,5; Gehemmapuker 50, 2.500, 2.100 / 25. Si cambia il pacco (1 AzP, due mani). | ✔ i serbatoi diventano «Pacco NEC Blu …» (id `pacco-nec-*`; i vecchi id «serbatoio-vuoto-*» escono dal catalogo); «Combustibile per lanciafiamme» esce dal catalogo. La ricarica al tavolo passa da sola al modo «cella». Schede delle armi con «pacco NEC Blu separato». |
| §7.21.3 | testo | Elmetti elettronici: NEC Verde standard, 25 Lx/h, 40 ore, ricarica 10 cr. | ○ (il testo dell'alimentazione non è nei dati degli elmetti) |
| §7.22 | testo | «Alla creazione si usa soltanto una corrispondenza corporativa espressamente indicata…» | ○ (stessa regola del Giocatore §2.16.27) |
| §7.23.8 CS-R20 | testo | NEC Verde standard dedicato: 1.000 Lx, 25 Lx/h, 40 ore; ricarica 10 cr, ricambio 100 (prima 24 ore e 10). | ✔ `rinforzi.json` |
| Indice, numeri di pagina | cosmetica | — | — |

Voci salvate con gli id usciti dal catalogo («Combustibile per lanciafiamme», «Serbatoio vuoto …»): restano in lista come «non più nel catalogo», senza effetti. Nessun personaggio di collaudo né di `PG_SCHEDE/` le ha.

## Manuale dell'Equipaggiamento 0.5

Testo salvato. Cambia molto:
- cap. 2–4 con l'alimentazione NEC;
- cap. 5 «Strumenti professionali», con il §5.4 «Nuclei Energetici Cromatici» (catalogo, ricarica, consumi) e il §5.8 (Focus, corredi culturali e rituali);
- cap. 6 ampliato (naniti, postazioni medicochirurgiche §6.8);
- cap. 7 «Dispositivi specialistici» (cibernetica: interfaccia neurale, impianti, protesi, Processore neurale);
- cap. 8 «Cataloghi e dotazioni iniziali».

▢ Lotti 2–4 (`docs/backlog.md`). In questo lotto, solo l'alimentazione NEC delle schede collegate alle dotazioni (vedi Giocatore).

## E&L (01/10 07:25)

- **A.1–A.6:** identiche alla copia salvata (un solo refuso di battitura nel Doc, «piccol i»).
- **«Risposte ai 19 quesiti dell'app»:** salvate per la prima volta. Le 19 risposte sono state confrontate parola per parola con le decisioni 44–61 di `docs/risposte-master.md` e con i dati: coincidono tutte, nessuna è cambiata.
  - Restano aperti, come prima, i punti 4 e 5 di A.39 (fuori dalle 19 risposte).
  - La 15 cita ancora «Manuale dell’Equipaggiamento v0.3» per Binocolo e Registratore; i valori sono gli stessi della 0.5.

## Controllo dei personaggi

`calcolaScheda` e i dati della stampa per i quattro personaggi di collaudo e i sette di `PG_SCHEDE/`, prima e dopo il lotto:
- nessun valore numerico cambiato (VA, PV, PM, Salvezze, AR, danni, prezzi degli oggetti posseduti);
- cambiano solo i testi delle schede, cioè le note dell'alimentazione NEC e i rimandi al §7.10, e la loro `versione_manuale`.
