# Manuali del 29/09/2026 sera: differenze e stato

Controllo di inizio sessione del 30/09.
- **Cambiati:** Manuale del Giocatore (29/09 23:45 UTC) e Manuale degli Armamenti 0.55 (29/09 20:12 UTC).
- **Invariati:** Magia (13:26, testo identico a quello salvato), Equipaggiamento, E&L e per-davide.

Testo salvato in `docs/manuali-txt/`. Stato: ✔ recepito · ○ già così · ▢ da applicare.

## Manuale degli Armamenti 0.55

| Paragrafo | Tipo | Contenuto | Stato |
|---|---|---|---|
| §7.23.10 Abbinamenti ottimizzati | regola nuova | Una coppia armatura + rinforzo elencata conserva la categoria originaria anche ad AR 3 o più. Le coppie sono: Soprabito ASA (base e riservato) con le due divise ASA; Soprabito blu BLEU con l’armatura BLEU; nove rinforzi dedicati da 1.500 (Étoiles, Kommando, Airborne, Panther, Ghost, Pathfinder, IES, Ombre, Mortificator). | ✔ `rinforzi.json` → `abbinamento_ottimizzato`, 9 voci nuove; `src/equipaggiamento.js`; validatore |
| §7.23.11 Mantello Venusiano | catalogo | Rinforzo Leggero dedicato alla Ranger Venusiana, 2.500, Mimetica ambientale 2 (si usa il maggiore con quella dell’armatura) | ✔ voce nuova con l’effetto `mimetismo` |
| §7.11.2, §7.11.5–7.17 (schede delle armature citate) | testo | Rimandi al §7.23.10 nelle schede | ○ (la regola sta nei dati del rinforzo) |

## Manuale del Giocatore (29/09 23:45)

| Paragrafo / tema | Tipo | Contenuto | Stato |
|---|---|---|---|
| §2.2 tabella, §2.17 | regola | Mishima: +1 ad **Armi da guerra** (non più Armi da mischia) | ✔ `corporazioni.json` |
| §1.6, §1.7, §8.3 | regola nuova | Con VA finale almeno 21 anche il 2 naturale è Magistrale, nelle Prove di Abilità | ✔ `regole.json` → `magistrale_naturale`, promemoria in «Attacca!» e «Lancia!» |
| §8.6.1 Successo Magistrale Migliorato | testo | Coordinato con la soglia 21 | ○ |
| §1.2, §2.2–2.8, §2.13, §2.17, §3.x (profili delle 25 Classi), §4.1, §8.1, §8.3, §8.7 | **regola, riforma** | **Categorie di competenza.** Ogni Classe classifica le 24 Abilità: 2 Specializzate (base 7), 6 Professionali (6), 12 Generiche (5), 4 Non competenti (3); 122 punti base. Le basi vengono dalla **prima Classe**, non più dall’Addestramento (che resta per vantaggio, Salvezze e Classi ammesse). VA personale = min(somma grezza, limite): limiti per Grado S 12–22, P 9–19, G 7–17, N 5–15; nel multiclasse S 10 + G + gS, P 7 + G + gP, G 5 + 2G, N 3 + 2G, vale il più alto. Il vecchio tetto di Avanzamento (3 fino al 3° livello…) sparisce. I punti liberi si spendono solo dove alzano il VA personale; i punti automatici oltre il limite restano «inattivi» e tornano efficaci quando il limite sale. Nuovo esempio del §2.13 (Mishima Agente: Percezione 2, Tecnologia 2, Cultura 2, Raggirare 4). | ▢ **grande**, vedi sotto |

### La riforma delle categorie di competenza (▢)

Non applicata in questa sessione. Dimensione del lavoro:
- **dati:** profilo S/P/G/N di 25 Classi da estrarre dal Capitolo 3; basi e limiti in `regole.json`; le basi di `addestramenti.json` escono dal calcolo;
- **motore:** somma grezza, limite, VA personale; validazione dei punti liberi alla creazione e ai livelli; limiti del multiclasse;
- **personaggi esistenti:** i punti già spesi oltre il nuovo limite, come nell’avviso «Regole aggiornate» di A.52;
- **interfaccia:** wizard (Addestramento, Classe, punti liberi), Sali di livello, provenienza dei VA;
- **test e collaudo:** quasi tutti i VA cambiano; il personaggio di prova del §2.13 va rifatto sul nuovo esempio.

Da fare in una sessione dedicata, con la sua ricognizione.
