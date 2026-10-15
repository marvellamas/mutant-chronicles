# Che cosa ha cambiato Davide dal 13 ottobre — ricognizione del 15 ottobre 2026

**Solo ricognizione: nessun dato applicato, nessun codice cambiato.** Qui ci sono i testi scaricati, il confronto
con l'ultima versione vista, che cosa comporterebbe ogni novità nell'app, quanto costa e in quali lotti conviene
dividerla. Le decisioni restano a Marcello.

## 1. I Doc controllati (tutti e undici quelli del registro)

| Doc | Ultima vista | Adesso | Esito |
|---|---|---|---|
| Manuale del Giocatore | 12/10 12:33 | **12/10 12:33** | invariato (0.48) |
| Manuale della Magia | 12/10 12:33 | **15/10 06:48** | **1.5**: nuova sez. 28 |
| Manuale degli Armamenti | 12/10 12:34 | **15/10 06:53** | **0.62**: nuovo §7.25.1 |
| Manuale dell'Equipaggiamento | 12/10 12:33 | **15/10 06:48** | **0.8**: cap. 10 ampliato (§§10.8–10.13) |
| E&L – Risposte approvate | 09/10 22:40 | **14/10 12:25** | riscritto, con A.158 e A.159 per esteso |
| per-davide.md | 13/10 06:29 | **15/10 13:25** | sezione 7 con dieci risposte nuove |
| **Manuale dei Mostri** | 03/10 15:02 (0.1) | **15/10 14:00** | **0.3**: non è un Doc nuovo, è lo stesso ID già nel registro, cresciuto da 3 profili a 9 caste + 15 creature |
| Manuale dei Veicoli | 02/10 | 02/10 | invariato |
| ASA Scout MK4 | 02/10 | 02/10 | invariato |
| Talenti magici e mistici | 27/09 | 27/09 | invariato |
| Modifiche Layout APP | 29/09 | 29/09 | invariato |
| Prontuario Combattimento (PDF) | 26/09 | 26/09 | invariato |

Testi salvati: `docs/manuali-txt/magia.md`, `armamenti.md`, `equipaggiamento.md`, `mostri.md`;
`docs/per-davide.md` e `docs/risposte-master-2026-09-26.md` (E&L).

**Nota sul Manuale dei Mostri.** È il Doc che l'app conosce già (`11Uxmz9GM…`), registrato il 04/10 e finora
«nessun dato applicato». Non è un manuale nuovo: è la stessa opera passata da 0.1 a 0.3. Il nostro bestiario
proposto (`data/bestiario.json`, `docs/bestiario/`) resta una proposta nostra, distinta da questo catalogo.

**Nota sul confronto.** L'export di Google ha cambiato formattazione (grassetti nelle tabelle, escape doppi): a
prima vista i manuali sembrano cambiati per intero. Il confronto è stato fatto ignorando la formattazione, così
restano solo le differenze di sostanza (Armamenti: 4 righe; Magia: 41; Equipaggiamento: 82; Mostri: 629).

## 2. Le novità, una per una

Legenda: **grandezza** = quanto lavoro nell'app (piccolo ≈ mezza giornata, medio ≈ 1–2 prompt, grande ≈ 3 o più);
**automazione** = se aggiunge passaggi obbligati al tavolo (principio di `CLAUDE.md`: l'app aiuta, non rallenta).

### A.159 — Ferite, Morente e stabilizzazione (approvata il 14/10)

Oltre Grave non si muore più subito: si entra in **Morente**, con −8, Svenuto automatico e un **contatore di Round
pari alla COS intera**, che cala di 1 per Round e di 1 per ogni nuova Ferita; a 0 si muore. Una cura che stabilizza
riporta a Grave e spegne il contatore; arrivano una procedura medica nuova («Stabilizzazione d'emergenza», 2 Round
e Prova di Medicina −2), una modalità d'emergenza di Guarigione (3 PM, 1 AzP), la **Cartuccia Stabilizzante**
(2.000 cr, MR) e regole per l'UMC Automatica (interviene dopo l'intero attacco).

- **Nell'app:** `regole.json` → `ferite` (gradino Morente, contatore), sessione del PG (Round residui), colonna
  Ferite della SD, «Colpito» della plancia, Stati (Svenuto implicato), catalogo sanitario (cartuccia, UMC),
  Magia (Guarigione d'emergenza), Talenti medici (Soccorso Immediato, Stabilizzazione, Triage Estremo).
- **Grandezza:** **grande** (è la risposta più pesante delle dieci).
- **PG reali:** tutti e sette, ma solo nei valori di sessione: nessun file da correggere.
- **Automazione:** **sì, parecchia.** Il contatore va fatto scorrere a ogni Round e aggiornare a ogni Ferita.
  *Versione leggera consigliata:* un riquadro «Morente — N Round» con − e +, il tasto «Stabilizza» e nient'altro
  di automatico; il Round lo fa già avanzare la plancia. Il resto (cure, cartuccia, UMC) come promemoria.
- **Attenzione:** **supera la decisione di Marcello del 13/10** (oltre Grave = malus di Grave, morte come avviso),
  applicata ieri in `ferite.oltre_penalita_come`. La penalità −8 resta giusta; cambia tutto il resto.

### A.158 — CyberArma: risposta completa (approvata il 13/10)

Arrivano tutti i parametri che mancavano: Grado I, SnT 1, Non Comune, PS Integrità 12, 4 PI, 0,5 kg, Reperibilità
Epica e **nessun prezzo di catalogo**. Custode (1 PM, 15 Round), Tecnomante (2 PM, 10 Round, 1d8 Magico), **altre
Classi** solo con la batteria e a **−2 VA**. Configurazione con **Batteria Verde da 5 cariche** (Grado II, SnT 2,
0,7 kg): si vedono le cariche, non i PM, e non si prelevano per altro. Costruzione e modifica con costi e Prove.

- **Nell'app:** due voci nuove in `artefatti.json` (originale e modificata), riserva «a cariche» già prevista
  (`regole.json` → `chroma.riserve`), −2 VA per le altre Classi in «Attacca!», costi di costruzione.
- **Grandezza:** **media**.
- **PG reali:** **Dimitri Orlav** (Tecnomante: può costruirla e modificarla). Nessun file da correggere oggi.
- **Automazione:** no. È una scheda di catalogo con un'attivazione, come i Guanti.
- **Attenzione:** il §7.25 degli Armamenti **non è ancora aggiornato** (dice ancora «soltanto Custodi e
  Tecnomanti» e «parametri da completare»). Vale la risposta (`docs/risposte-master.md`).

### Manuale degli Armamenti 0.62 — §7.25.1 Inventario e custodia

La CyberArma è **una sola voce** di inventario, visibile fra le Armi e fra gli Artefatti senza duplicare peso,
Integrità, riserva e SnT. Compare la **Custodia del Silenzio** (0,3 kg, SnT 0) che, chiusa, scherma le emanazioni.

- **Nell'app:** niente di nuovo sul modello (la regola «una sola istanza» è quella già applicata per i Guanti il
  13/10); la custodia è un oggetto del catalogo.
- **Grandezza:** piccolo (va col lotto della CyberArma).
- **PG reali:** nessuno. **Automazione:** no.

### Equipaggiamento 0.8 e Magia 1.5 — Artefatti e contenitori di campagna

Capitolo 10 dell'Equipaggiamento e sezione 28 della Magia, che si rimandano a vicenda:

- **§10.8 Pergamene** — le sei schede del campionario con i dati fisici (gli stessi già applicati con la A.155) e
  la creazione. *Nell'app: già fatto; da controllare solo i costi dei reagenti (un quinto dell'infusione).*
- **§10.9 CyberArma** — registrazione come voce unica (vedi sopra).
- **§10.10 / §28.1 Hachimaki della Disciplina Interiore** — fascia Mishima, Grado II, SnT 1, **−1 PM al costo
  delle Tecniche Interiori** (mai sotto 1 PM, non cumulabile), 1.500 cr, con ricetta di creazione completa.
  *Nell'app: una voce di catalogo con un effetto nuovo su `src/tecniche.js` (costo delle Tecniche). **Medio**;
  tocca chi usa Risorse Interiori. Nessuna automazione.*
- **§10.11 Tomo dei Guardiani** — reliquia di campagna **senza dati** (peso, PI, SnT «da definire»).
  *Nell'app: si può mettere come oggetto senza peso, che rende il carico «parziale», com'è già previsto. Piccolo.*
- **§10.12 / §28.2 Scrigno del Primo Giuramento** — contenitore a cinque vani, SnT 0, **indistruttibile**, apribile
  dai sette PG e da Nathaniel; ogni vano chiuso scherma il suo sigillo. Pesa 11 kg con il Sigillo di Demnogonis.
  *Nell'app: oggetto di catalogo; «indistruttibile» è un caso nuovo per i PI (oggi ogni oggetto tracciato ha PI).
  Medio-piccolo.*
- **§10.13 / §28.3 Contenitori del Silenzio** — Custodia (0,3 kg), Zaino (2 kg), Cofanetto (0,4 kg): chiusi
  schermano la Corruzione 1 del contenuto. *Nell'app: tre voci di catalogo e un effetto «schermato finché è
  chiuso e riposto» che oggi non esiste (la Corruzione degli oggetti non è modellata). **Medio**, e introduce uno
  stato dell'oggetto (chiuso/aperto) da ricordare al tavolo: valutare se tenerlo come promemoria.*

### A.115 — Capacità specifiche dei nemici (15/10)

L'app deve mostrare la **descrizione completa** della capacità e gestire Prove, Azioni, risorse e limiti d'uso
quando il profilo li dà; niente costi per analogia se mancano.

- **Nell'app:** mini-scheda del nemico nella plancia (oggi le capacità sono testo) e `formato_nemici.json`.
- **Grandezza:** media. **PG reali:** nessuno. **Automazione:** poca, se restano pulsanti facoltativi.

### A.126 — Ingombro delle creature e campo Spazio (15/10)

Serve un campo **Spazio** in Q (1×1, 2×2, 3×3) nel profilo del nemico; 3×3 non si deduce dalla Taglia.

- **Nell'app:** `formato_nemici.json` (oggi c'è `taglia`, non `spazio`), bestiario, token sulla mappa (l'ingombro
  esiste già per i token: va collegato al profilo).
- **Grandezza:** media. **PG reali:** nessuno. **Automazione:** no (anzi, toglie un passaggio al master).

### A.133 — Portata delle creature grandi (15/10)

La portata è quella del **singolo attacco**, misurata **attorno all'ingombro**: 2×2 non vuol dire portata 2.

- **Nell'app:** zone di controllo e Attacchi di Opportunità (`src/mappa/zoc.js`), «Attacca!» dei nemici.
- **Grandezza:** media (va insieme alla A.126). **PG reali:** nessuno. **Automazione:** no.

### A.126–A.138 — Origine dei coni delle creature grandi (15/10)

Il cono parte **dal centro di un quadretto periferico** sul lato dell'emissione, mai da uno interno; l'asse esce
dall'ingombro; origine e direzione si scelgono prima di tirare. L'app deve far **scegliere il quadretto**.

- **Nell'app:** `data/mappa.json` → `template.cono_vertice` (oggi «centro»), `src/mappa/template.js`, piazzamento.
- **Grandezza:** media. **PG reali:** nessuno. **Automazione:** un passaggio in più solo per le creature grandi.

### A.113 — Veicoli: permessi, sincronizzazione, nomi (15/10)

Il Direttore modifica tutti i veicoli, anche quelli dei PG; senza server il veicolo condiviso è **in sola lettura**;
i nomi ufficiali sono **Corpo principale, Propulsione, Motore**.

- **Nell'app:** i tre nomi ci sono già giusti (`veicoli.json`); da sistemare i permessi provvisori e il
  comportamento senza server (oggi si modifica la copia locale con un avviso).
- **Grandezza:** piccola. **PG reali:** **Pablo Zaion** (1 veicolo). **Automazione:** no (toglie un dubbio).

### A.145 — Azioni sui veicoli (15/10)

Tabella completa: salire/scendere 1 AzP, prendere i comandi 1 AzP, avviare 1 AzP, condurre 1 AzM, manovra
complessa +1 AzP, più le righe per moto, imbarcazioni, remi, vele, velivoli e astronavi.

- **Nell'app:** `veicoli.json` → costi delle azioni; promemoria nella tab Veicoli e sulla mappa (salire/scendere).
- **Grandezza:** media (i dati sono tanti, la logica è poca). **PG reali:** Pablo Zaion.
- **Automazione:** **attenzione.** Se l'app pretende di scalare le Azioni a ogni operazione diventa un
  contabile. *Versione leggera consigliata:* tabella consultabile e promemoria accanto a «Sali»/«Scendi».

### A.146 — Veicoli e Attacchi di Opportunità (15/10)

Un veicolo che esce dalla portata **può** provocare un AdO; bersaglio il mezzo **o** un occupante esposto; **una
sola occasione per nemico**; l'attacco non ferma il movimento.

- **Nell'app:** `src/mappa/zoc.js` (oggi i veicoli non provocano e non controllano zone).
- **Grandezza:** media. **PG reali:** Pablo Zaion. **Automazione:** **sì**: l'avviso di AdO comparirebbe anche
  per i mezzi. Da tenere come avviso, mai come blocco.

### A.147 — Curve, rotazioni e posizionamento a 45° (15/10)

Curva ordinaria compresa nell'AzM; Sterzata stretta +1 AzP e Pilotare −2; Inversione rapida +1 AzP e −4; rotazione
sul posto solo se il mezzo può. **Nessun costo automatico per i gradi.** L'app deve permettere gli **otto
orientamenti a 45°**, anche in diagonale, con l'ingombro vero.

- **Nell'app:** oggi i veicoli ruotano a passi di **10°** (`mappa.json` → `veicoli.passo_gradi`), quindi i 45°
  esatti **non si ottengono**: va aggiunto il passo a 45°. Il resto sono promemoria.
- **Grandezza:** piccola per i 45°, media con i promemoria delle manovre. **PG reali:** Pablo Zaion.
- **Automazione:** no, anzi: Davide chiede espressamente che l'app **non** conteggi costi per i gradi.

### Manuale dei Mostri 0.3 — Covata e catalogo

Nove caste della Covata (Rasente, Raccoglitore, Trasportatore, Saltatore, Corazzato, Tagliente, Regina
Comandante, Regina Incubatrice, Regina Madre), il Lorath e **quindici creature** (Aarakocra, Aboleth, Ankheg,
Arpia, Basilisco, Bestia distorcente, Bulette, Chimera, Cockatrice, Ettercap, Grick, Grifone, Ippogrifo,
Manticora, Orsogufo) con statistiche complete, **Spazio in Q**, portata per attacco, e **GS e PX per 4 PG**
(Principiante 10–11, Inesperto 20, Esperto 30–33, Veterano 50, Eroe 70, Leggenda 100). Più le «Regole operative
del catalogo»: volo alato, movimento misto, picchiata, tiri a distanza, capacità innate, Negare Potere, anatomia.

- **Nell'app:** sono **25 profili pronti** da mettere in `nemici/` come il bestiario umano; il formato li regge
  quasi tutto, salvo Spazio (A.126), portata per attacco (A.133) e PX (campo nuovo). Il nostro bestiario proposto
  resta separato.
- **Grandezza:** **grande** se si importano tutti; media per le sole regole operative.
- **PG reali:** nessuno. **Automazione:** no (sono dati).
- **Attenzione:** il §5.2 dice ancora «**5 punti Abilità liberi a ogni Grado**», mentre la regola approvata
  (A.90, decisione 92) è **7**. Errata da segnalare: vedi A.160.

## 3. Lotti proposti (un prompt ciascuno, nell'ordine)

1. **Morente e stabilizzazione, versione leggera (A.159).** Gradino Morente con contatore in Round nella colonna
   Ferite, «Stabilizza», Svenuto implicato, morte a 0; cure e cartuccia come promemoria e voci di catalogo.
   *Perché per primo:* cambia una regola che al tavolo capita spesso, e supera la decisione provvisoria di ieri.
2. **Veicoli: i 45° e i promemoria delle manovre (A.147, A.113).** Passo di rotazione a 45°, nomi confermati,
   sola lettura senza server, promemoria di Sterzata stretta e Inversione rapida. *Piccolo e subito utile.*
3. **Creature grandi sulla mappa (A.126, A.133, A.126–A.138).** Campo Spazio nel profilo, portata attorno
   all'ingombro, scelta del quadretto d'origine del cono. *Tre risposte che si tengono per mano.*
4. **CyberArma e Custodia (A.158, Armamenti §7.25.1).** Le due configurazioni, le cariche, il −2 delle altre
   Classi, i costi di costruzione. *Tocca Dimitri.*
5. **Artefatti di campagna (Equipaggiamento §§10.10–10.13, Magia sez. 28).** Hachimaki, Scrigno, Contenitori del
   Silenzio, Tomo. *Dopo la CyberArma, perché condividono la registrazione a voce unica.*
6. **Capacità dei nemici (A.115) e Azioni sui veicoli (A.145).** Descrizione completa e parametri nelle
   mini-schede; tabella delle operazioni come promemoria.
7. **Manuale dei Mostri 0.3: regole operative + caste della Covata.** Le dieci schede della Covata e del Lorath.
8. **Manuale dei Mostri 0.3: le quindici creature del catalogo.** Import in `nemici/`, con i PX.

**Resta fuori per ora**, e perché:

- **A.146 (AdO dei veicoli):** aggiunge avvisi automatici durante il movimento dei mezzi, cioè proprio il tipo di
  automazione che rallenta. Da fare solo se Marcello lo vuole, e come avviso.
- **I costi in Azioni della A.145 applicati davvero** (scalare AzP a chi sale, avvia, allaccia…): tabella sì,
  conteggio no.
- **Riscrittura del bestiario proposto** (`data/bestiario.json`) sulla scala GS/PX dei Mostri 0.3: prima serve
  sapere se Davide vuole che le due scale coincidano (A.161).
- **Equipaggiamento §10.8 (pergamene):** già applicato con la A.155; resta solo da controllare i costi dei
  reagenti, che entrano nel lotto 5 se servono.

## 4. Domande nuove (dopo A.159)

- **A.160 — Punti Abilità liberi nel Manuale dei Mostri.** Il §5.2 della 0.3 dice «5 punti Abilità liberi a ogni
  Grado»; la regola approvata (A.90, decisione 92) è **7**. È un refuso del manuale o una regola diversa per gli
  avversari umani? *Nel frattempo:* l'app continua con 7 per tutti.
- **A.161 — GS e PX dei Mostri 0.3 e il bestiario dell'app.** Le schede danno GS (Principiante…Leggenda) e PX per
  4 PG; il bestiario proposto dell'app usa i cinque gradi Minore…Molto potente tarati su 7 PG (A.97). Le due
  scale vanno unificate (e con quale delle due), oppure restano separate? Servono anche i PX per le creature
  create con «Crea nemico»? *Nel frattempo:* le due scale restano distinte e i PX non si calcolano.
- **A.162 — Oggetti indistruttibili.** Lo Scrigno del Primo Giuramento «non perde PI». Nell'app ogni oggetto
  tracciato ha PI e PS Integrità: si registra con PI nulli e una nota, oppure serve un valore «indistruttibile»
  anche per altri oggetti futuri? *Nel frattempo:* nessun PI e una nota nella scheda.
- **A.163 — Schermatura dei Contenitori del Silenzio.** La schermatura vale «quando il contenuto è interamente
  riposto e il contenitore è chiuso e integro»: l'app deve tenere uno stato «chiuso/aperto» per contenitore, con
  l'effetto sulla Corruzione, o basta un promemoria nella scheda dell'oggetto? La Corruzione degli oggetti oggi
  non è modellata. *Nel frattempo:* promemoria, nessuno stato.
- **A.164 — Morente e i nemici.** La A.159 parla dei personaggi. Vale anche per i nemici della plancia (che oggi
  hanno Ferite e Menomazioni) o per loro resta la morte a Grave superato? *Nel frattempo:* per i nemici nessun
  contatore, come oggi.

## 5. Che cosa resta valido di ieri

La A.159 **supera** la decisione di Marcello del 13/10 («oltre Grave vale come Grave»): la penalità −8 resta,
ma oltre Grave diventa Morente con il contatore. Fino al lotto 1, l'app continua a fare quello che fa oggi
(−8 e avviso); la riga di `docs/risposte-master.md` va aggiornata quando si applica.
