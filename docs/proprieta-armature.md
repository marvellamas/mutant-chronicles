# Proprietà delle armature corporative: censimento e traduzione in effetti

27 settembre 2026. Lotto «proprietà delle armature corporative». Fonte: Manuale degli Armamenti v0.52 (Google Doc), §7.11.4 (proprietà comuni) e §7.11–§7.17, §7.22.5; testo in `docs/manuali-txt/armamenti.md`. Dati: `data/equipaggiamento/armature_corporative.json` → `effetti`, scritti da `tools/lotti/lotto_proprieta_armature.py`; schema in `docs/effetti-oggetti.md`.

**Armature corporative in catalogo: 91** (83 dei lotti 6–7 e 8 modelli di base del §7.22), tutte con almeno una proprietà; 88 ricevono effetti tipizzati. Il prompt parlava di 51 armature: il catalogo ne ha 91, e il lotto le copre tutte.

**Proprietà distinte: 38** — numeriche 26, testuali 4, già gestite altrove 8, rimandate 0.

- **Numerica**: diventa un effetto nello schema, con l'ambito del manuale.
- **Testuale**: nessun numero applicabile dalla scheda; resta come **promemoria** nella riga della protezione (SD, tab Combattimento).
- **Già gestita**: il numero è già nei dati del modello (penalità effettive in `penalita`, PI della tabella); non si duplica e non compare nei promemoria. Elenco in `armature.json` → `proprieta_gestite`.
- **Rimandata**: nessuna. Il manuale definisce il valore di tutte le proprietà numeriche, quindi non serve una voce A.44 in `docs/per-davide.md`.

## Censimento

| Proprietà | Varianti | Armature | Classe | Effetto | Testo (dai dati del catalogo) |
|---|---|---:|---|---|---|
| Imbottita | Imbottita 1, Imbottita 2, Imbottita 3 | 52 | numerica | contromisura Concussivo · generale | Contromisura del §5.24 contro Concussivo: il valore è una soglia contro l’effetto aggiuntivo pertinente dopo l’Armatura, non un’ulteriore riduzione de… |
| Struttura robusta | Struttura robusta | 22 | già gestita | — | Aggiunge 2 PI massimi alla costruzione. I PI di Struttura robusta sono già inclusi nei valori tabellari dei modelli che possiedono questa proprietà e … |
| Articolazione d’assalto | Articolazione d’assalto | 18 | già gestita | — | Riduce di 1 la penalità dell’armatura agli attacchi ravvicinati: una Media passa da −1 a 0 e una Pesante da −2 a −1. Non modifica gli attacchi a dista… |
| Filtro respiratorio | Filtro respiratorio 2 | 13 | numerica | salvezza tempra · uso_specifico («contro veleni e agenti patogeni inalati») | Concede +2 alla PS Tempra contro veleni e agenti patogeni inalati mentre la maschera è indossata. Richiede aria respirabile; non costituisce una riser… |
| Mimetismo | Mimetismo 1, Mimetismo 2 | 13 | numerica | va Furtività · situazionale | Concede +2 VA alla Prova unica di Furtività per nascondersi o muoversi senza essere individuati, quando esistono condizioni concrete per farlo. Il bon… |
| Protezione occulta | Protezione occulta 1, Protezione occulta 2 | 13 | numerica | salvezza magia · uso_specifico («contro Oscura Simmetria, Corruzione e Paura») | Concede +1 alle PS Magia effettivamente richieste contro Oscura Simmetria, Corruzione e Paura. Si applica una sola volta anche quando un effetto rient… |
| Isolante | Isolante 1, Isolante 2 | 11 | numerica | contromisura Elettricità · generale | Contromisura del §5.24 contro Elettricità: il valore è una soglia contro l’effetto aggiuntivo pertinente dopo l’Armatura, non un’ulteriore riduzione d… |
| Ignifuga | Ignifuga 2, Ignifuga 3 | 9 | numerica | contromisura Fuoco · generale | Contromisura del §5.24 contro Fuoco: il valore è una soglia contro l’effetto aggiuntivo pertinente dopo l’Armatura, non un’ulteriore riduzione dei dan… |
| Antiesplosione | Antiesplosione 1 | 9 | numerica | ar_contro esplosioni · generale | Aumenta di 1 l’AR fornita dall’armatura contro danni Naturali o Magici di esplosioni, comprese granate, razzi e cariche da demolizione. Si applica a c… |
| SIN | SIN 1, SIN 2 | 9 | numerica | va Difese · uso_specifico («Schivata») | SIN 1: +1 VA a Difese per Schivare. |
| Assetto mistico | Assetto mistico 1, Assetto mistico 2, Assetto mistico 3, Assetto mistico 5 | 9 | già gestita | — | Riduce di 2 la penalità della propria armatura alle Prove di Potere per lanciare Incantesimi, fino a 0. Non concede un bonus positivo e non riduce pen… |
| Stabile | Stabile 1, Stabile 2 | 8 | numerica | caratteristica FOR/DES · uso_specifico («contro Sbilanciante») | Concede +2 alla Prova di Caratteristica FOR o DES richiesta contro Sbilanciante. Non è una Prova Salvezza e non si estende automaticamente ad altri te… |
| Assetto da incursione | Assetto da incursione | 8 | già gestita | — | Elimina soltanto la penalità MOV propria dell’armatura. Non elimina le penalità agli attacchi, ad Agilità, al lancio o quelle degli altri oggetti tras… |
| Discreta | Discreta | 7 | testuale | — | La protezione è integrata nell’abito o nella divisa e non risulta evidente a una semplice osservazione casuale. Un esame ravvicinato o una perquisizio… |
| Mimetica ambientale | Mimetica ambientale 1, Mimetica ambientale 2 | 6 | numerica | va Furtività · situazionale | Concede +1 VA alla Prova unica di Furtività nell’ambiente per il quale la mimetica è predisposta, quando esistono condizioni concrete per nascondersi.… |
| Assetto da pattuglia | Assetto da pattuglia | 5 | già gestita | — | Elimina soltanto la penalità MOV propria dell’armatura. Non elimina le penalità agli attacchi, ad Agilità, al lancio o quelle degli altri oggetti tras… |
| Assistenza muscolare | Assistenza muscolare 1, Assistenza muscolare 2 | 4 | numerica | va Atletica · uso_specifico («sollevare, spingere, trascinare o sfondare»); caratteristica FOR · uso_specifico («sollevare, spingere, trascinare o sfondare») | Concede +1 VA alle Prove di Forza o Atletica per sollevare, spingere, trascinare o sfondare con il telaio. Non aumenta la Caratteristica, non soddisfa… |
| Colpo assistito | Colpo assistito 1, Colpo assistito 2 | 4 | numerica | danno ravvicinati · generale | Aggiunge 1 al danno ordinario degli attacchi ravvicinati, una sola volta per applicazione di danno. Richiede alimentazione (§7.14.2, §7.16.3). |
| Termoregolazione | Termoregolazione 2 | 4 | numerica | salvezza tempra · uso_specifico («contro caldo e freddo ambientali») | Concede +2 alle PS Tempra contro caldo e freddo ambientali; non aumenta l’AR contro attacchi termici. Richiede alimentazione (§7.14.2, §7.16.3). |
| Articolazione di tiro | Articolazione di tiro | 4 | già gestita | — | Riduce di 1 la penalità propria dell’armatura agli attacchi a distanza: il −2 della Pesante diventa −1. Restano le altre penalità della categoria e qu… |
| Manutenzione semplice | Manutenzione semplice | 3 | numerica | va Tecnologia · uso_specifico («riparare l’armatura») | Concede +1 VA alle Prove di Tecnologia per riparare quell’armatura. Restano necessari strumenti e materiali adatti; la proprietà non abbrevia automati… |
| Imbracatura tecnica | Imbracatura tecnica 1 | 3 | numerica | va Atletica · uso_specifico («arrampicarsi o calarsi con corde») | Concede +1 VA ad Atletica per arrampicarsi o calarsi usando corde e ancoraggi adeguati; tali strumenti si acquistano separatamente. Non aumenta automa… |
| Interfaccia da equipaggio | Interfaccia da equipaggio 1 | 2 | numerica | va Pilotare · uso_specifico («mezzi terrestri corazzati») | Concede +1 VA alle Prove di Pilotare di mezzi terrestri corazzati quando la protezione è collegata a comandi compatibili e alimentati. Non concede bon… |
| Protezione acustica | Protezione acustica 2 | 2 | numerica | salvezza PS prevista · uso_specifico («contro effetti sonori o rumori dannosi») | Concede +2 alla Prova Salvezza espressamente richiesta contro un effetto sonoro o un rumore dannoso. Non è un bonus generale contro esplosioni (§7.11.… |
| Imbracatura da sella | Imbracatura da sella 1 | 2 | numerica | va Pilotare · uso_specifico («controllo della motocicletta») | Concede +1 VA alle Prove di Pilotare già richieste per mantenere il controllo della motocicletta dopo un urto o evitare di essere disarcionati, mentre… |
| Articolazione da ricognizione | Articolazione da ricognizione | 2 | già gestita | — | Elimina il −1 VA di Agilità della Media, comprese Schivata e Prove fisiche ostacolate. Non elimina il −1 agli attacchi né le penalità di lancio (§7.11… |
| Protezione climatica | Protezione climatica 2 | 2 | numerica | salvezza tempra · uso_specifico («contro il caldo ambientale») | La protezione climatica concede +2 alla PS Tempra contro gli effetti del caldo ambientale. Non riduce i danni da Fuoco e non sostituisce acqua, riposo… |
| Manutenzione agevolata | Manutenzione agevolata | 2 | numerica | va Tecnologia · uso_specifico («riparare l’armatura») | Manutenzione agevolata: +1 VA alle Prove di Tecnologia per riparare questa armatura, disponendo degli strumenti e dei ricambi necessari. Non ripristin… |
| Imbracatura da artigliere | Imbracatura da artigliere | 1 | testuale | — | Con una sola arma pesante compatibile agganciata, elimina il −1 VA dell’armatura all’attacco a distanza effettuato con quell’arma e riduce di 1 Q la p… |
| Articolazione da tiro | Articolazione da tiro | 1 | già gestita | — | Riduce di 1 la penalità propria dell’armatura agli attacchi a distanza: il −2 della Pesante diventa −1. Restano le altre penalità della categoria e qu… |
| Imbracatura da lancio | Imbracatura da lancio 2 | 1 | numerica | va Pilotare · uso_specifico («paracadute») | Concede +2 VA alle Prove di Pilotare richieste per controllare discesa e atterraggio con un paracadute compatibile. Il paracadute si acquista separata… |
| Articolazione da arrampicata | Articolazione da arrampicata 2 | 1 | numerica | va Atletica · uso_specifico («arrampicarsi») | Articolazione da arrampicata 2 concede +2 VA ad Atletica per arrampicarsi usando appigli reali o attrezzatura adatta. Non aumenta automaticamente la d… |
| Assetto anfibio | Assetto anfibio | 1 | testuale | — | Assetto anfibio elimina soltanto le penalità proprie dell’armatura al MOV e alle Prove di Atletica per nuotare. |
| Tenuta subacquea | Tenuta subacquea | 1 | testuale | — | Tenuta subacquea consente immersioni fino a 30 metri con elmetto chiuso e riserva d’aria integrata da due ore, compresa nel prezzo. |
| Interfaccia aeronautica | Interfaccia aeronautica 1 | 1 | numerica | va Pilotare · uso_specifico («conduzione di aeromobili») | Concede +1 VA a Pilotare per la conduzione di un aeromobile quando è collegata a comandi compatibili e alimentati; non migliora l’uso delle armi (§7.1… |
| Passo sicuro | Passo sicuro 1 | 1 | numerica | va Atletica · uso_specifico («equilibrio su terreni instabili») | Passo sicuro 1 concede +1 VA ad Atletica per mantenere l’equilibrio o attraversare terreni instabili o scivolosi, soltanto quando la Prova è già richi… |
| Sigilli d’interdizione | Sigilli d’interdizione 2 | 1 | numerica | salvezza magia · uso_specifico («contro l’Oscura Simmetria») | Sigilli d’interdizione 2: +2 alle PS Magia effettivamente richieste contro l’Oscura Simmetria. |
| Interfaccia di pilotaggio | Interfaccia di pilotaggio 1 | 1 | numerica | va Pilotare · uso_specifico («conduzione di aeromobili») | Interfaccia di pilotaggio 1: +1 VA a Pilotare aeromobili compatibili mentre è collegata a comandi funzionanti e alimentati. |

## Scelte

- **Contromisure** (Imbottita, Isolante, Ignifuga): tipo `contromisura`, soglia contro l'effetto aggiuntivo del §5.24 dopo l'Armatura. Stanno fra le «Resistenze» della sezione Protezioni, non fra le Abilità.
- **Antiesplosione**: tipo `ar_contro` (+1 AR contro le esplosioni), anche questo fra le Resistenze.
- **Protezioni alle Prove Salvezza** (Filtro respiratorio, Protezione occulta, Sigilli d'interdizione, Termoregolazione, Protezione climatica, Protezione acustica): tipo `salvezza`, uso specifico; nella tab Identità sotto le Prove Salvezza. Protezione acustica non nomina la PS: «PS già prevista».
- **Mimetismo e Mimetica ambientale**: `va` a Furtività, situazionale (valgono «quando esistono condizioni concrete»), come l'IAS3300 Mirrorshard. L'interruttore è quello già esistente in modalità tavolo.
- **SIN** dell'armatura: +X a Difese solo per Schivare (uso specifico «Schivata»).
- **Stabile** e **Assistenza muscolare**: tipo `caratteristica` (Prove di FOR o DES), uso specifico; Assistenza muscolare anche +X ad Atletica per lo stesso uso. «Più proprietà Stabile applicabili […] non si sommano»: `beneficio` stabile.
- **Colpo assistito**: tipo `danno` sugli attacchi ravvicinati, bonus ordinario (§5.13): entra nel danno delle armi ravvicinate e di «Senz'armi», quindi in «Attacca!».
- **Manutenzione**, **Imbracature**, **Interfacce**, **Passo sicuro**, **Articolazione da arrampicata**: `va` d'uso specifico sull'Abilità nominata. Le interfacce di pilotaggio dell'armatura e dell'elmetto non si sommano (`beneficio` interfaccia_pilotaggio).
- **Alimentazione**: diverse proprietà dei servoassistiti «richiedono alimentazione». La scheda non tiene lo stato della batteria: gli effetti valgono con l'armatura indossata, e il promemoria del §7.14.2 resta nel testo del modello.
- **«Attacca!»**: legge gli effetti che toccano VA per colpire e danno (Assistenza offensiva dell'elmetto, Colpo assistito). Nessuna proprietà delle armature modifica le Difese del bersaglio, quindi l'utility non aggiunge nulla lì.
