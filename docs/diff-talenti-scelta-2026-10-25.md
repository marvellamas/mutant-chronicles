# Talenti v1.0 — la scelta si può fare (25/10/2026, sera)

Marcello ha provato la scelta dei Talenti: così non si riusciva a scegliere. Lunedì 26/10 i giocatori la usano al tavolo.
Tre difetti, tutti nel riquadro «Da scegliere». Lotti precedenti: `docs/diff-talenti-2026-10-25.md`,
`docs/diff-talenti-lotto2-2026-10-25.md`.

## A. Descrizioni leggibili

**Che cosa produceva `[object Object]`.** Il riquadro prendeva come riga la `sintesi` della voce e la scriveva come
testo. In 19 Talenti la sintesi è un oggetto `{ testo, rif, stato }` (le sintesi approvate del 05/10: Sempre Allerta,
Duro a Morire, Resistenza alla Corruzione, Duellante, Tiro Mirato Migliorato, Tiro a Lunga Distanza, Mira Rapida,
Schermidore, Arti Marziali, Parata Istintiva, Parata Migliorata, Controllo d’Emergenza, Inseguimento, Risorse Interiori,
Tecniche Interiori Supplementari, Incantesimi Estesi, Incantesimi Plurimi, Ritualista Minore, Ritualista Maggiore).

**Le righe appena accennate.** Senza sintesi, la riga era la prima frase del testo. Nei Talenti di magia la prima frase è
«Passivo.» o «Attivo.» (17 voci), nei Talenti cambiati del file del 7/10 è «Sostituisce …» o «Diventa una Maestria …», e
nelle Specializzazioni mancavano l’Abilità e, per le nove sottofamiglie di Potere, il nome della sottofamiglia.

**Da dove vengono ora** (`src/talenti-testi.js`, funzioni pure, sempre stringhe):

| | Riga breve | «Dettagli» |
|---|---|---|
| Talento con sintesi | il testo della sintesi | il testo completo della scheda |
| Talento senza sintesi | la prima frase che dice che cosa fa (si saltano tipo, «Requisito: …», «Acquisibile …», «Sostituisce …», «Riunisce …», «Diventa una …») | il testo completo della scheda |
| Specializzazione | bonus e Abilità + l’ambito («+2 VA ad Atletica: Prove di Corsa e Nuoto.»); per le sottofamiglie di Potere l’ambito con il nome della sottofamiglia | bonus, ambito e la regola del gruppo (§8.8, §8.8.1, §8.8.2) |

Il testo completo è quello del catalogo dell’app, cioè del manuale; per le voci nuove o cambiate (le 3 Maestrie accorpate,
i 4 Talenti cambiati, Sport) il catalogo ha già il testo del file del 7/10. **Nessuna voce senza testo.** Due righe brevi
sono scritte nel dato (`riga`, `tools/lotti/lotto_righe_talenti.mjs`), riassumendo frasi della loro scheda, perché la prima
frase utile non dice che cosa fanno: Arti Marziali Migliorate e Sport.

Accanto a ogni opzione: categoria, requisiti in parole («Requisiti: Ritualista Minore»), le scelte che apre («Poi: 2
Incantesimi da scegliere»). La stessa riga è nell’elenco dei Talenti della scheda e nella stampa (Talenti senza sintesi e
Specializzazioni), dove prima uscivano «Passivo.» e simili.

## B. I Talenti che aprono altre scelte

Il riquadro faceva scegliere il Talento, non quello che il Talento dà: con Incrementare Incantesimi la scheda diceva
«restano 2 incantesimi da scegliere» senza un modo per farlo.

**Talenti che aprono una scelta successiva:**

| Talento | Che cosa si sceglie | Dove |
|---|---|---|
| Usufruitore di Magia | 2 + Mod INT Incantesimi (minimo 1), fino al livello 3 | passo seguente del riquadro |
| Incrementare Incantesimi | 2 Incantesimi, entro il livello massimo | passo seguente del riquadro |
| Risorse Interiori | 2 + Mod SAG Tecniche Interiori (minimo 1) | passo seguente del riquadro |
| Tecniche Interiori Supplementari | 3 Tecniche Interiori | passo seguente del riquadro |
| Prova di Caratteristica Migliorata | la Caratteristica | insieme al Talento, prima di «Scegli» |
| Prova Salvezza Migliorata | la Prova Salvezza | insieme al Talento |
| Sport (Specializzazione) | la disciplina sportiva | insieme al Talento |
| Poliglotta | le due lingue (da annotare) | insieme al Talento |

Non aprono scelte: Potenziale Mistico Migliorato (alza il livello massimo, «non concede nuovi Incantesimi»), Ritualista
Minore e Maggiore (le procedure dei Rituali si apprendono una per una, «non fa conoscere automaticamente»). Anche un
aumento permanente di INT con Usufruitore di Magia apre incantesimi da scegliere (Magia sez. 1): li propone lo stesso passo.

**Come funziona** (`src/avanzamento.js` → `scelteSuccessive`, `applicaSceltaSuccessiva`, `adattaScelteSuccessive`):

- il conto è quello della validazione dei livelli (quote di Classe e liberi, livello massimo; dotazioni di Tecniche):
  a un livello in cui la quota sale, restano da scegliere quelli che mancano; si registrano nella voce di quel livello,
  come in «Sali di livello»;
- scelto il Talento, il riquadro va subito al passo «Incantesimi del 3° livello», con l’elenco già filtrato (solo quelli
  che il personaggio può prendere; gli altri sotto «non ammessi adesso», con il motivo); se si rimanda («Più tardi»), il
  passo resta nel riquadro, con il conto in testa («Da scegliere: …, 2 Incantesimi») e il suo «Scegli»;
- l’avviso «restano N incantesimi / Tecniche da scegliere» non c’è più nell’elenco degli errori: lo dice il riquadro, con
  il pulsante; «Sali di livello» aspetta finché resta qualcosa da scegliere;
- cambiando il Talento, gli Incantesimi e le Tecniche che dava e che le quote non ammettono più si tolgono, e lo si dice;
- le Tecniche e gli Incantesimi già conosciuti in un livello successivo (rimasti da un Talento tolto nel passaggio, A.184)
  contano e non si offrono di nuovo;
- restano le regole del lotto 2: il server ricontrolla (un tablet non scrive un incantesimo o una Tecnica non ammessi:
  403, `src/talenti-tablet.js`), il Direttore può forzare (riga nel registro), offline non si sceglie.

## C. Prova sulle copie (25/10, porte 3017 Direttore e 3018 tablet)

Copie dei sette PG di `tests/fixtures/talenti-vecchi/`, passaggio con `tools/migra-talenti.mjs` attraverso il server, poi
tutte le scelte di ognuno fino a «Talenti: tutti scelti»:

- **Dimitri dal tablet** (finestra di 820 px, «Sono…» Dimitri): Specializzazione in Informatica, Incantesimi Estesi, poi
  Incrementare Incantesimi → subito «Incantesimi del 3° livello», «ne restano 2», livello massimo 3; «Più tardi» → resta
  in testa con «Scegli»; Controllo Elementale e Muro Elementale → salvati sul server nella voce del 3° livello, visibili
  nella tab Poteri; poi gli altri posti, fino a «Talenti: tutti scelti», senza avvisi;
- **Oshi dal Direttore**: Risorse Interiori ripresa al 3° livello. Qui la prova ha trovato un difetto, corretto: le tre
  Tecniche rimaste al 5° livello non contavano, e il riquadro ne chiedeva altre tre («già conosciuta», «conosciute 5,
  ammesse 3»). Ora contano: niente da scegliere, nessun errore, «Sali al livello 7» libero;
- **Lucas** con Incrementare Incantesimi dal Direttore; Pablo, Michele, Duncan e Botha con il primo Talento ammesso a ogni
  posto;
- 2758 opzioni controllate nei sette PG: nessuna con `[object Object]`, «undefined», «NaN» o una riga vuota.

Unito in `main` e in `battlemap`.
