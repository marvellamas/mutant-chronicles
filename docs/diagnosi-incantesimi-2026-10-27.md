# La scelta degli incantesimi non era affidabile (27/10/2026, lotto 131)

Tre segnalazioni di Marcello e del tavolo: A) si aggiunge l'incantesimo sbagliato, B) «Aggiunto a mano» fa sparire la
selezione, C) le quote sbagliate (Dimitri al 7° livello con Incrementare Incantesimi: tutti in grigio).

## La meccanica ricostruita (com'era e com'è)

Un incantesimo conosciuto sta in uno di questi posti. Il catalogo (`data/incantesimi.json`, 90 voci) li chiama per
**nome** nei file dei personaggi; dal lotto 131 ha anche un **`id`** (slug stabile, validato unico), che è l'unica cosa
con cui l'interfaccia riconosce un incantesimo.

| Dove si aggiunge | Dove è scritto | Conta nelle quote? |
|---|---|---|
| Creazione, passo Incantesimi (`src/ui/passi.js`) | `scelte.incantesimi` | sì |
| Sali di livello, passo Incantesimi (`src/ui/sali.js`) | `livelli[i].incantesimi` | sì |
| Riquadro «Da scegliere» dopo un Talento (Incrementare Incantesimi, Usufruitore di Magia; `src/ui/talenti-scelta.js`, `scelteSuccessive`) | `livelli[i].incantesimi` | sì |
| Tab Poteri, «Aggiungi un incantesimo a mano» (`src/incantesimi-a-mano.js`) | `scelte.incantesimiAMano` | **no** |
| Artefatti e pergamene (`src/incantesimi-artefatti.js`) | derivati dall'Inventario, niente di salvato | **no** |

Le quote (`quoteIncantesimi` in `src/avanzamento.js`) sono: per macrofamiglia, la quota delle Classi taumaturgiche;
più i «liberi» (2 + Mod INT con l'Addestramento Taumaturgo, più quelli dei Talenti: Usufruitore di Magia 2 + Mod INT,
Incrementare Incantesimi +2 per acquisizione). Gli imparati sono quelli di `scelte.incantesimi` e dei `livelli`.

## Le cause

- **B (e A).** Il campo «nome dell'incantesimo» ridisegnava tutta la scheda alla perdita del fuoco (`onchange` →
  `ridisegna()`): il clic su «Aggiungi» cadeva sul pulsante appena sostituito e andava perso. Senza ricerca il campo
  restava vuoto e «Aggiungi» funzionava. Nessuna selezione veniva davvero tenuta: si scriveva un testo. Con A è la stessa
  causa: Marcello non ha aggiunto niente (il clic si è perso, senza nessun messaggio) e nell'elenco c'era soltanto
  Esorcizzare Corruzione, quella della Pietra della Vigilanza, nello stesso gruppo «Esorcismo».
- **C.** Il conto delle quote esisteva in tre copie (creazione `src/incantesimi.js`, Sali di livello `src/ui/sali.js`,
  «Da scegliere» `opzioniIncantesimi`), ciascuna con il suo blocco: opzioni in grigio con «quota … esaurita», incantesimi
  oltre il livello massimo nascosti. Sali e creazione ricalcolavano per conto proprio. Il «grigio» era un blocco, e lo era
  anche per il tablet (`controllaTalentiDaTablet` rifiutava con 403 le scelte oltre quota).

## Catalogo: cosa ho trovato

Nomi e identificativi: nessun duplicato, nessun incantesimo presente due volte. Gruppi dal nome simile (stessa prima
parola): Armatura (3), Scudo (2), Barriera (3), Dardo (2), Alterare (2), Cura (4), Esorcizzare (3). Un nome è
**prefisso di un altro**: «Scudo» / «Scudo Spirituale» (chi cerca per testo parziale rischia di scambiarli). Il catalogo
non aveva identificativi: aggiunti (`esorcizzare-oscurita`, `scudo-spirituale`, …) e validati (unici, minuscoli,
nomi che non si confondono togliendo accenti e maiuscole).

## Cosa cambia

- **Un solo conto:** `src/quote-incantesimi.js` (`contoDaScheda`, `avvisoIncantesimo`), usato da Sali di livello, da
  «Da scegliere» e dal passo della creazione. Quota = Classe + liberi dei Talenti; imparati = scelti ai livelli e alla
  creazione; artefatti e aggiunti a mano non occupano posti.
- **Quote e livello massimo sono un avviso, mai un blocco** (per giocatore e Direttore): nessun grigio, nessun
  incantesimo nascosto; gli errori `controllaIncantesimi` per livello, quota e accesso hanno tipo `avviso`; il server non
  rifiuta più quelle scritture dal tablet, anche con i posti chiusi dal Direttore.
- **Aggiunta a mano:** si cerca (senza ridisegnare), si tocca l'incantesimo (identificato dal suo `id`), si legge «Hai
  scelto: …», il pulsante dice cosa farà («Aggiungi Esorcizzare Oscurità»); dopo la conferma «Aggiunto: …». Senza scelta
  non si aggiunge mai la prima voce.
- **D:** gli incantesimi presi con un Talento stanno nell'elenco di Poteri con l'origine («Da Incrementare Incantesimi al
  3° livello»), «Togli» (con conferma) e «Sostituisci» (scrive nella voce di quel livello).
