# Ricognizione: AR (Armatura) e PI (Punti Integrità)

Data: 27 settembre 2026. Fonti: i Google Doc correnti dei manuali, nel testo di `docs/manuali-txt/` (controllo del 27/09: manuali e risposte invariati). Sigle delle fonti: **G** Giocatore 0.43 + Doc, **A** Armamenti 0.52, **E** Equipaggiamento 0.1, **M** Magia 1.1 + Doc; il numero dopo i due punti è la riga del file di testo. `docs/risposte-master.md` non ha decisioni su AR o PI.

Per ogni punto: i passi del manuale citati, la regola che se ne ricava, che cosa è definito e che cosa manca. Quando il manuale non dice una cosa, c'è una riga **Ipotesi** con la scelta che l'app applica nel frattempo e la voce aperta in `docs/per-davide.md` (sezione 2, da A.43).

## 1. AR del personaggio: un valore solo, con una componente magica

> «Un’Armatura ordinaria AR 5 con +1 AR magica si scrive «AR totale 6, di cui 1 magica»: contro il danno Etereo assorbe soltanto 1.» (G:4518, §5.24)

> «I danni Naturali e Magici sono assorbiti da qualsiasi protezione pertinente. I danni Eterei sono assorbiti soltanto dalle protezioni magiche o dalla componente magica dell’Armatura.» (G:3989, §5.13)

> «AR totale comprende l’eventuale componente magica: AR 6, di cui 1 magica, assorbe 6 danni Naturali o Magici e 1 danno Etereo.» (A:2507, §7.11)

> «AC indica il numero di applicazioni di danno prodotte da un colpo a segno; non assegna locativi.» (G:3873, §5.10)

**Regola.** L'AR è un valore unico, «AR totale, di cui magica». Ne derivano due numeri da usare al tavolo:

- **AR** (totale): contro il danno Naturale e Magico;
- **AR contro Etereo** (la componente magica): contro il danno Etereo.

A questi si aggiunge un valore situazionale, l'**AR contro le esplosioni**, quando c'è Antiesplosione (§4). Non ci sono AR per zona del corpo né per arma da fuoco o ravvicinata. Unica eccezione: Pelle di Rinoceronte, una Tecnica Interiore, dà +1 AR soltanto contro gli attacchi ravvicinati (§6).

**Manca.** La Magia chiama AC l'«Area Colpita del corpo» e ricalcola il totale «per ciascuna AC» (M:27, M:722). Armatura Mistica protegge «soltanto le AC coperte dall’equipaggiamento» (M:4437). Nessun profilo di armatura dice quali AC copre.

**Ipotesi (A.43).** Un solo valore AR (totale, di cui magica), come dice il Giocatore §5.10. Niente AR per zona.

## 2. Da che cosa si somma l'AR

### Armatura e rinforzi

> «Si può montare un solo kit di Rinforzi compatibile. Non si sommano più kit e non si sovrappongono due armature complete. Il kit aumenta AR e requisito FOR dell’armatura; conserva PI e PS propri, registrati separatamente.» (A:2530, §7.11.2)

**Regola.** L'AR della scheda dell'armatura più il solo kit di rinforzo (già così nel motore, `src/equipaggiamento.js`). Con due armature indossate l'app dà già un avviso: non si sovrappongono. Nel conto dell'AR vale la maggiore.

### Elmetto: nessuna AR (confermato)

> «Gli elmetti non forniscono AR, neppure magica. Indossarli, sostituirli o toglierli non modifica il valore di AR dell’armatura.» (A:4728, §7.21.1)

### Scudo: si somma, uno solo

> «Gli scudi indossati concedono Armatura passiva: +1 per scudi piccoli o leggeri, +2 per scudi medi o grandi, +3 per scudi enormi.» (G:3987, §5.13)

> «La protezione passiva dello Scudo si aggiunge all’AR dell’armatura mentre è impugnato e utilizzabile. […] Due scudi non sommano la protezione: si utilizza soltanto il contributo maggiore.» (A:826, §7.4)

> «L’AR dello Scudo resta applicabile senza Parata, con Parata fallita o parando con un’altra arma, purché lo Scudo sia impugnato e utilizzabile.» (A:834, §7.4)

**Regola.** L'AR dello scudo imbracciato si aggiunge a quella dell'armatura. Fra più scudi vale il contributo maggiore. Lo scudo sulla schiena non dà AR: nell'app vale solo lo stato «Imbracciato».

### Protezioni che cambiano con una condizione

> «Dopo Sintonizzazione, 1 AzP e 1 PM della riserva attivano Scudo Magico per 5 Round: il contributo dello Scudo diventa AR +4, di cui 2 magica, […]» (A:1095, §7.4.10)

**Regola.** È un contributo situazionale: +2 AR, di cui +2 magica, con l'interruttore al tavolo, come gli altri effetti situazionali degli oggetti (`docs/effetti-oggetti.md`). Il tipo di effetto nuovo è `ar`.

### Incantesimi

> «Si sommano l’AR pertinente dell’equipaggiamento, il maggiore contributo applicabile fra Pelle Corazzata, Armatura di Forza e bonus di Armatura Mistica, un solo scudo e l’eventuale Armatura Elementale contro l’elemento protetto. […] Il totale si ricalcola per ciascuna AC e natura del danno.» (M:722, §7)

Il manuale è preciso anche sulle singole schede:

- Armatura di Forza dà AR magica «a tutte le AC» (M:2346).
- Scudo (incantesimo) dà AR Naturale e «non si somma a scudi fisici» (M:2320).
- Pelle Corazzata dà AR Naturale (M:2110).

Non danno AR Scudo Spirituale (M:4820), Benedizione (M:4896) e Barriera Mentale (M:2628). Barriera Mistica riduce il danno Etereo prima dell'AR, senza dare AR (M:4562). Campo di Forza dimezza il danno a distanza prima dell'AR (M:2509).

**Regola.** La regola di cumulo è completa, ma l'app non tiene gli incantesimi attivi al tavolo: né durata né bersaglio. Gli incantesimi quindi non entrano nell'AR calcolata. Il tooltip dell'AR ricorda la regola di cumulo della Magia sez. 7.

### Talenti e Tecniche Interiori

> «Quando indossa un’armatura o utilizza uno scudo Mistico o TecnoMistico, il Tecnomante ottiene +1 AR magica. […] Il beneficio è personale e si applica una sola volta, anche utilizzando contemporaneamente armatura e scudo.» (G:3305, §3.9.5, Corazza Potenziata)

> «Concede +1 AR di natura magica, efficace contro danni Naturali, Magici ed Eterei secondo le normali regole. Si aggiunge alle protezioni indossate; più applicazioni della stessa Tecnica non si sommano.» (G:5611, §8.9.2, Aura di Resistenza)

> «Concede +1 AR contro attacchi Ravvicinati Naturali o Magici […] La protezione non si applica ai danni Eterei.» (G:5665, §8.9.3, Pelle di Rinoceronte)

**Regola.** Corazza Potenziata è passiva: +1 AR totale e +1 magica, una volta sola. Aura di Resistenza e Pelle di Rinoceronte sono Tecniche attive per 3 Round: come gli incantesimi, l'app non ne tiene l'attivazione.

**Manca.** La formula della Magia non cita questi tre bonus: non si sa se si sommano ad Armatura di Forza e Pelle Corazzata o rientrano nel «maggiore contributo». Non si sa neppure come l'app riconosca uno scudo «Mistico o TecnoMistico»: il catalogo non ha questo attributo.

**Ipotesi (A.48).** Corazza Potenziata vale con un'armatura indossata. Lo scudo non si controlla: il catalogo non dice quali siano Mistici. Il bonus si somma all'AR dell'equipaggiamento. Tecniche e incantesimi restano fuori dal calcolo.

## 3. Come l'AR entra nel danno

> | 4 | Applicare le riduzioni previste da Difesa o Prova Salvezza, con gli arrotondamenti indicati. |
> | 5 | Sottrarre l’Armatura applicabile alla natura del danno. |
> | 6 | Se rimane almeno 1 danno, applicare i bonus condizionati al superamento dell’Armatura. |
> (G:3973, §5.13)

> «Il danno finale non può essere inferiore a 0. Nei colpi multipli la sequenza si applica separatamente a ogni colpo. […] Nessun Talento ignora genericamente l’Armatura: eventuali riduzioni vere appartengono a specifiche armi o munizioni perforanti.» (G:3985, §5.13)

> «Laser dimezza per difetto l’Armatura applicabile a ogni colpo, prima dell’assorbimento.» (G:4613, §5.24)

> «[Perforante X] Ignora X punti dell’AR non magica applicabile, compreso il contributo ordinario dello Scudo, fino a un minimo di 0 per questa componente. La componente magica rimane interamente applicabile.» (A:4618, §7.20.7)

**Regola.** L'AR si sottrae al danno di ogni colpo (ogni AC), dopo Difese e Salvezze, con minimo 0. Non c'è un massimo. La Qualità dell'armatura non la cambia: la Qualità dà solo la PS Integrità. Le eccezioni stanno nel manuale:

- **Laser:** dimezza l'AR; Riflettente annulla il dimezzamento.
- **Perforante X:** toglie X dalla parte non magica.
- **Danni che ignorano l'AR:**
  - Ferite dirette (G:4207), Sanguinamento (G:4059), cadute (G:4478), soffocamento (G:4493);
  - Dardo Psichico (M:2711);
  - Incendiato, «ignorando l’Armatura ordinaria» (G:4249).

Nell'app c'è «Attacca!», che calcola il colpo, non il danno al bersaglio. Nel risultato basta quindi il promemoria dell'ordine: «Il bersaglio sottrae la sua AR…».

**Manca.** Il manuale non dice:

- in che ordine si applicano Laser e Perforante sullo stesso colpo;
- se Perforante tocca l'AR Naturale degli incantesimi;
- se nell'Incendiato la componente magica riduce il danno.

**Ipotesi (A.50).** L'app non calcola il danno subito dal bersaglio, quindi non deve scegliere. «Attacca!» ricorda l'ordine del §5.13 e le proprietà dell'arma, come Laser e Perforante, che il giocatore applica al tavolo.

## 4. Contromisure e AR contro (Antiesplosione)

> «Una Contromisura numerica protegge dagli effetti aggiuntivi di una proprietà del danno […]. Dopo Difese e Armatura si confronta separatamente il danno residuo di ogni colpo con quel valore […]. La Contromisura numerica non riduce i PV persi. Deve appartenere a una protezione che abbia fornito almeno 1 punto di Armatura applicabile al colpo […]. Contromisure dello stesso tipo non si sommano e si usa la migliore» (G:4552–4556, §5.24)

> «[Antiesplosione 1] Aumenta di 1 l’AR fornita dall’armatura contro danni Naturali o Magici di esplosioni, comprese granate, razzi e cariche da demolizione. […] Fra Antiesplosione di scudo e armatura si usa soltanto il valore maggiore (§7.4.3).» (A:2608, §7.11.4)

**Regola.** I due tipi di effetto del lotto armature vanno letti in modo diverso:

- **`contromisura`** (Imbottita, Isolante, Ignifuga) **non è AR**: è una soglia sull'effetto aggiuntivo. Resta dov'è, fra le «Resistenze» della tab Combattimento. Per contare, la sua protezione deve dare almeno 1 AR.
- **`ar_contro`** (Antiesplosione) **è AR in più contro un tipo di danno**. Si legge insieme all'AR base e dà un valore a parte, «AR contro esplosioni» = AR totale + il maggiore fra gli `ar_contro` di scudo e armatura. Non vale contro l'Etereo.

Nel catalogo gli `ar_contro` stanno solo sulle armature. I due scudi con Antiesplosione (§7.4.3) l'hanno come proprietà testuale: si aggiungono come effetto `ar_contro` nello stesso lotto dati.

## 5. PI: quali oggetti, massimi e attuali

> «I Punti Integrità (PI) misurano la resistenza strutturale. La scheda indica i PI massimi; si annotano separatamente quelli attuali. La Qualità determina la PS, non una variazione percentuale dei PI. A 0 PI l’oggetto è Rotto e non può essere utilizzato finché non viene riparato.» (A:650, §7.2.1; lo stesso in E:114, §1.7)

> «Ogni elmetto ha 4 PI propri. […] Le modifiche condividono l’Integrità dell’elmetto: non richiedono PI da registrare separatamente […]. A 0 PI l’elmetto perde i propri vantaggi; l’AR dell’armatura non cambia.» (A:4794, §7.21.3)

> «Il mirino ha Integrità separata dall’arma e non ne aumenta i PI. A 0 PI perde il beneficio; un’arma ancora integra rimane utilizzabile secondo il proprio profilo.» (A:722, §7.3)

**Regola.**

- **Chi ha PI.** Armi ravvicinate e a distanza, armature, kit di rinforzo, scudi, elmetti, mirini e accessori, moduli e dispositivi. Ognuno ha i suoi, separati da quelli dell'oggetto su cui è montato. Le modifiche dell'elmetto condividono i PI dell'elmetto.
- **Massimi.** Vengono dalla scheda del catalogo (`pi`), con Struttura robusta già compresa. La Qualità **non** li determina: dà solo la PS Integrità (8–18, `regole.json → integrita.ps_per_qualita`). Quindi i PI non si derivano dalla Qualità: dove il catalogo non li scrive, l'oggetto non ha PI da tracciare.
- **Attuali.** Sono uno stato del personaggio, separato dai massimi: il manuale dice di annotarli a parte.

**Manca.** I PI degli oggetti comuni (Dotazione, corredi, strumenti) arriveranno con i capitoli 2–8 del Manuale dell'Equipaggiamento (E:152: «quando pertinenti»).

**Ipotesi (A.47).** Un oggetto senza `pi` nel catalogo non ha PI e non si traccia. Si tracciano solo gli oggetti unici: munizioni, sanitario e voci con quantità maggiore di 1 sono esclusi. Un oggetto personalizzato può avere `pi`.

## 6. Quando si perdono PI

> | Attacco intenzionale per rompere un oggetto | 1 PI ogni 5 danni residui o frazione, dopo le protezioni applicabili all’oggetto. |
> | Attacco Magistrale con un’arma che coinvolge l’oggetto | 1 PI aggiuntivo, da sommare alle altre perdite dello stesso colpo. |
> | Proprietà che causa deterioramento | […] Corrosivo causa 1 PI; Demolitrice 1 aggiunge 1 PI negli attacchi intenzionali per rompere. |
> | Danno Etereo subito dall’oggetto | 1 PI ogni 5 danni residui o frazione; protegge soltanto l’AR magica. […] |
> (A:667–670, §7.2.1)

> «Si effettua una sola PS per oggetto e per colpo, riunendo le cause presenti. Con successo si evitano le conseguenze strutturali e tutte le perdite di PI di quelle cause» (A:672, §7.2.1)

> «Se l’Armatura assorbe un attacco Magistrale, anche interamente, la protezione interessata effettua una PS Integrità: con fallimento perde 1 PI aggiuntivo» (A:682, §7.2.1)

**Regola.** Un colpo o una Parata ordinari non tolgono PI. Le cause sono le quattro della tabella. Si fa una PS Integrità sola per oggetto e per colpo (1d20 ≤ PS della Qualità).

Non esiste una Manovra «Spezzare». Disarmare fa cadere l'arma senza danneggiarla (G:3960).

Il giocatore tira la PS al tavolo e segna la perdita. L'app mostra la PS Integrità accanto ai PI e offre il −.

## 7. Soglie e conseguenze

> «Una perdita di PI non assegna automaticamente la condizione Danneggiata e la relativa penalità di −2 VA. Tale condizione si applica quando una regola la prevede.» (A:678, §7.2.1)

> «Una perdita di PI non impone automaticamente −2 VA. A 0 PI un oggetto ordinario è Rotto e non utilizzabile finché non viene riparato.» (E:114, §1.7)

**Regola.**

- **Nessuna soglia intermedia.** Il manuale lo esclude esplicitamente: a metà dei PI non c'è «Danneggiato». L'app quindi non mette l'etichetta a metà, contrariamente alla proposta di partenza, perché il manuale lo vieta.
- **A 0 PI l'oggetto è Rotto:** non si può usare finché non è riparato. In pratica:
  - l'arma resta in lista con l'etichetta «Rotta»;
  - l'elmetto perde i suoi vantaggi (effetti e modifiche), mentre l'AR dell'armatura non cambia;
  - il mirino o l'accessorio perde il beneficio.

Danneggiata, Inutilizzabile, Rotta e Distrutta delle armi (A:636, §7.2) vengono anche dai Fallimenti Maldestri (§5.17) e sono indipendenti dai PI. «Distrutta» non è uno stato dei PI: il manuale non la lega allo 0.

**Manca.** Non si sa se un'armatura o uno scudo Rotti continuino a dare AR. Il manuale lo dice solo per l'elmetto, e per gli altri oggetti c'è solo «non può essere utilizzato».

**Ipotesi (A.44).** Armatura e scudo Rotti non danno AR e non danno i loro effetti: «non utilizzabile». Le penalità dell'armatura indossata restano.

**Ipotesi (A.45).** Il kit di rinforzo a 0 PI perde il suo +AR. La categoria (Leggera portata a Media) resta quella calcolata con il kit, perché il kit è ancora montato.

**Ipotesi (A.49).** Le condizioni del §5.17 (Inutilizzabile, Rotta, Distrutta) non cambiano i PI, e i PI non danno quelle condizioni. L'app tiene solo i PI e l'etichetta «Rotto» a 0.

## 8. Riparazione

> «Le schede strutturali e le procedure generali di costruzione e riparazione degli altri oggetti, con tempi e costi, verranno integrate successivamente.» (A:692, §7.2.1)

> «La riparazione ordinaria di una struttura richiede 1 ora e Tecnologia: recupera 1 PI con successo o 2 con Magistrale.» (G:2577, §3.5.10, solo per i veicoli)

**Regola.** Per gli oggetti che non sono veicoli, la riparazione (tempo, costo, PI recuperati) è rimandata dal manuale. Si conoscono solo i bonus a Tecnologia:

- Manutenzione semplice, +1 (A:2586);
- Corredo di manutenzione da campo, +2 (A:3149);
- i Talenti dell'Artigiano e del Tecnico.

I rimedi temporanei (Riparazione d'Emergenza, Ingegneria d'Emergenza) non recuperano PI.

**Ipotesi (A.46).** Nessun pulsante «Ripara»: i PI si rimettono con il + al tavolo, dopo la riparazione decisa dal master.

## 9. Domande aperte (in `docs/per-davide.md`, sezione 2)

- A.43 — AR per zona (AC) o valore unico.
- A.44 — Armatura e scudo a 0 PI: danno ancora AR?
- A.45 — Kit di rinforzo a 0 PI.
- A.46 — Riparazione degli oggetti che non sono veicoli.
- A.47 — Oggetti senza PI nel catalogo.
- A.48 — Cumulo di Corazza Potenziata, Aura di Resistenza e Pelle di Rinoceronte.
- A.49 — Condizioni delle armi del §5.17 e PI.
- A.50 — Laser e Perforante sullo stesso colpo, Perforante sull'AR degli incantesimi, Incendiato e componente magica.

## 10. Cosa è stato implementato

(in fondo, a lavoro finito)
