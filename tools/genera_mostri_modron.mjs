// Blocco «Costrutti e Modron» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci profili prestabiliti in
// esempi/nemici/mostri/ (cinque guardiani animati e cinque Modron), nel formato di data/formato_nemici.json
// (A.73). Valori trascritti; niente valori inventati. GS/PX informativo (A.161, valori non tondi 11/22/33 compresi).
// Spazio dal campo `spazio` (A.126, A.167); la Taglia non si deduce dall'ingombro (A.167, 18/10).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - AR «con scudo» nel campo (Orrore in elmo 6), senza scudo nelle note; Guardiano: AR magica 0 a riposo, la carica
//    preparata di Armatura di Forza 3 è una capacità con la sua procedura.
//  - PM — e Volontà — (Golem di argilla, Guardiano): `pm` assente e `senza_salvezza: ['volonta']`.
//  - immunità negli Stati solo per ciò che è uno Stato dell'app (Avvelenato, Sanguinamento, Terrorizzato, Stordito,
//    Accecato, Assordato); Sonno, soffocamento, Paralizzato, Affaticamento, fascinazione e pietrificazione nella
//    capacità «Corpo animato». I Modron sono viventi: nessuna immunità.
//  - armi della dotazione come attacchi (Pugnale/Spada/Giavellotto/Arco); Giavellotto lanciato e Arco: `gittata_q` e
//    modalità S. Sguardo terribile, Gas paralizzante, Accelerazione, Furia, Colpo maledetto, trasferimento: capacità
//    con `azioni`, `risorsa` e `usi` dove il manuale dà un limite numerico.
//
// Uso: node tools/genera_mostri_modron.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Costrutti e Modron';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const d = (nome, va, danno, gittata_q, extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura: 'Naturale', gittata_q, modalita: ['S'], ac: 1, ...extra });
const scuro = { nome: 'Scurovisione', effetto: 'Vede entro 12 Q nel buio naturale, senza colori; non attraversa solidi, torbidità o fumo.' };
const AZIONI = 'INI modifica 1d10; AzP e unica AzM valgono per tutto il Round. Ogni attacco costa 1 AzP e produce AC 1. Una sola Opportunità per Round, con un attacco ravvicinato normale nei limiti della voce (non attiva Sguardi, gas, Accelerazione, cariche o poteri di comando). Più arti non concedono attacchi gratuiti. Nessuna Parata naturale: la Parata richiede 1 AzP e un’arma o scudo idonei (successo dimezza per eccesso prima dell’AR, Magistrale annulla; Spada, Pugnale e Giavellotto −8 VA per parare a distanza, Scudo medio −4 con ulteriore −2 contro Raffica; Pugni e Arco non parano). Schivata: 1 AzP, 1 AzM, consapevolezza e spazio. Naturale e Magico incontrano tutta l’AR pertinente, Etereo solo quella magica. Uno Stato di durata N applicato nel Round R termina a fine Round R + N; nuove applicazioni non sommano la stessa penalità e conservano la scadenza più lontana.';
const GUARDIANO = (mente) => ({ nome: 'Corpo animato', effetto: `Natura Comune, nessun incantesimo appreso. ${mente} Non richiede aria, cibo, acqua o sonno. Immune a soffocamento, Sonno, Sanguinamento, Avvelenato, veleni e malattie biologici. Cure biologiche, Medicina, riposo biologico e normali riparazioni tecnologiche non lo ripristinano; assorbimenti e rigenerazione dichiarati recuperano solo PV (non curano Ferite o Menomazioni e non stabilizzano Morente). A 0 PV valgono Tempra, Ferite, Menomazioni e Morente (§4.2): non diventa un oggetto inerte per il solo esaurimento dei PV; a 0 PM personali Svenuto dopo la risoluzione completa dell’azione (PM — non significa 0 PM). Dardo Spirituale lo può colpire (eccezione esplicita): danno Etereo ai PV e sottrae soltanto PM personali esistenti. Negare Potere non cancella il corpo né i suoi attacchi intrinseci; Contromagia non interrompe capacità innate; Individuare o Identificare Potere non concedono il comando. Testa, Torace, Braccia e Gambe sono le parti omonime; le piastre integrate usano PV e Ferite (gli oggetti impugnati mantengono i propri PI). ${AZIONI}` });
const RESISTENZA = { nome: 'Resistenza fisica', effetto: 'Dimezza per eccesso il danno Naturale da Contusione, Taglio e Perforazione prima dell’AR. Non vale contro Fuoco, Gelo, acido, Elettricità, danni Magici o Eterei. Nessuna proprietà adamantina importata.' };
const SENZA_MENTE = 'Esegue istruzioni senza mente autonoma: PM — e Volontà —; lettura mentale, Dardo Psichico, paura e controllo che richieda una mente non trovano un bersaglio valido.';
const CON_MENTE = 'Ha mente e PM personali; può essere bersaglio di Dardo Psichico, salvo protezione specifica.';
const FURIA = (soglia, calma) => ({ nome: 'Furia', effetto: `All’inizio della propria Iniziativa, con ${soglia} PV o meno e se può agire, tira 1d6: con 6 entra in Furia. Non costa PM o Azioni. Finché dura dà precedenza all’attacco contro la creatura percepita più vicina, senza distinguere alleati (in parità sceglie il percorso più breve e poi casualmente); se nessuna è raggiungibile attacca un oggetto accessibile, preferendo uno più piccolo di sé. Conserva Azioni, costi, sensi e impedimenti ordinari. ${calma} Svenuto sospende le Azioni senza cancellare le altre condizioni.` });
const MODRON = { nome: 'Modron', effetto: 'Costrutto biomeccanico vivente di Natura Comune: respira aria, si nutre, richiede acqua e riposo compatibile; ha mente e PM personali. Nessuna delle immunità fisiologiche dei guardiani animati: può subire veleni, malattie, Sanguinamento, Sonno, Affaticamento e Stati se la fonte è compatibile. Le cure biologiche recuperano i PV (eccezione esplicita) ma non ricostruiscono parti perdute né riparano componenti meccaniche. Mente assiomatica: un controllo mentale non può costringerlo ad agire contro la propria funzione o un ordine valido già ricevuto (quella parte non viene eseguita); nessuna immunità a danni psichici, lettura della mente, paura, illusioni, perdita di PM o influenza sociale. Parla Modron e comprende comandi operativi solo di esemplari del proprio grado o di quello immediatamente superiore o inferiore (Monodrone: un compito semplice, messaggio fino a 48 parole; Duodrone: due consegne semplici senza nuove Azioni; Tridrone coordina pattuglie, Quadrone il tiro, Pentadrone valuta situazioni nuove); nessuna telepatia di comando a distanza illimitata. Solo alla distruzione effettiva il corpo si disgrega (armi e oggetti restano con l’Integrità residua); a 0 PV o PM non scompare. Testa = gruppo sensoriale, Torace = nucleo, Braccia = arti manipolatori, Gambe = arti locomotori (per Monodrone e Quadrone il Torace comprende il cingolo alare). ' + AZIONI };
const VISIONE = { nome: 'Visione ordinatrice', effetto: 'Entro 12 Q vede forme e movimenti nel buio completo (Accecato: il senso delle forme resta utilizzabile, senza dettagli puramente visivi). Contro Mimetismo usa Potere di Rilevazione 6: superiore supera, inferiore fallisce, parità richiede una PS Magia dell’osservatore per coppia di effetti (si riprova solo dopo un nuovo lancio o una variazione reale della protezione); non dissolve Mimetismo né rivela la posizione agli alleati. Restano Percezione contro Furtività, ostacoli solidi e fumo opaco. Le illusioni puramente visive concedono +2 alle Prove di riconoscimento già previste. Velo Psichico mantiene la propria PS ordinaria; non vede attraverso pareti, non legge testi al buio né pensieri, non identifica aure o trasformazioni. Capacità innata continua, non un incantesimo da mantenere.' };
const VOLO_MODRON = { nome: 'Volo', effetto: 'Ali funzionali e spazio necessari: può sostenersi battendo le ali senza percorso minimo, non levitare senza di esse. Corsa e Scatto in volo richiedono Atletica −2 e −4; quota, decollo e atterraggio rientrano nell’unica AzM. Svenuto o perdita delle ali possono causare Caduta.' };
const GIAV = 'Giavellotto Comune della sentinella: FOR 3, PI 4, PS Integrità 10.';

const CREATURE = [
  {
    id: 'spaventapasseri', nome: 'Spaventapasseri',
    caratteristiche: { FOR: 5, DES: 6, COS: 5, INT: 6, SAG: 5, CAR: 7 },
    pv: 32, pm: 9, ar: { totale: 0, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 11, magia: 10 },
    immunita: ['avvelenato', 'sanguinamento', 'terrorizzato'],
    attacchi: [r('Artigli', 10, '1d6+1', 1, { proprieta: ['Taglio'], note: 'Con almeno 1 danno finale, una vittima dotata di mente effettua Volontà senza modificatore: fallimento Terrorizzato per 1 Round (nessuna seconda PS iniziale; Barriera Mentale dà il proprio bonus; un’AR che annulla il colpo evita anche questa applicazione).' })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      GUARDIANO(CON_MENTE), RESISTENZA, scuro,
      { nome: 'Sguardo terribile', azioni: { principali: 1 }, risorsa: '2 PM', limiti: 'Al massimo una volta per Round.', prova: 'PS di Volontà', effetto: 'Una creatura dotata di mente entro 6 Q: lo Spaventapasseri deve vederla ed essa deve vedere direttamente il suo volto (pareti opache, volto coperto o impossibilità di vedere impediscono l’effetto; registrazioni e immagini non lo trasmettono). Nessun tiro per colpire; non ammesse Parata, Schivata o Elusione. Volontà senza modificatore evita; fallimento Paralizzato per 1 Round, come blocco da paura (non si applica anche Terrorizzato). Immunità a paura o Terrorizzato, oppure a Paralizzato, impedisce il blocco; Barriera Mentale aggiunge il proprio bonus senza immunità automatica. Paralisi: la vittima resta cosciente ma senza AzP o Movimento e senza Difese attive; conserva PS e opposizioni passive; nessun Magistrale automatico. Termina a scadenza, con Cura Spirituale 6 o Negare Potere potenza 3 (danni e uscita dalla gittata non bastano). Dopo una PS riuscita o la fine del blocco la vittima è immune allo Sguardo di quello Spaventapasseri per 24 ore (non alla paura degli Artigli). I Terrorizzato degli Artigli seguono il Giocatore (scomparsa evidente della fonte, Oratoria di un compagno adiacente con 1 AzP, cure compatibili). Non è una Possessione.' },
      { nome: 'Aspetto e protezioni', effetto: 'Immobile e appoggiato come uno spaventapasseri plausibile ottiene +4 a Furtività per celare la natura animata, fino a un movimento osservato (nessuna Sorpresa automatica). Vulnerabile al Fuoco ×2 di ogni Natura (con Magistrale ×3 complessivo, non ×4). Immune ad Affaticamento, Terrorizzato, fascinazione e Paralizzato. Comprende la lingua del creatore senza parlarla. Segue la consegna, ma può ripararsi dal fuoco o preservare il luogo; la morte del creatore non lo distrugge.' },
    ],
    note: 'Sentinella di legno, stoffa e paglia animata da uno spirito (impulsi e reazioni, senza i ricordi di una vita precedente). Al massimo due Artigli per Round, Opportunità compresa. Fonte: Scarecrow, p. 268.',
  },
  {
    id: 'orrore-in-elmo', nome: 'Orrore in elmo',
    caratteristiche: { FOR: 8, DES: 6, COS: 7, INT: 6, SAG: 6, CAR: 5 },
    pv: 46, pm: 10, ar: { totale: 6, magica: 0 }, difese: 12, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 6 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 10, volonta: 9, magia: 11 },
    immunita: ['avvelenato', 'sanguinamento', 'accecato', 'assordato', 'terrorizzato', 'stordito'],
    attacchi: [r('Spada lunga', 12, '1d8+3', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Armi da guerra', va: 12 }, { nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      GUARDIANO(CON_MENTE), RESISTENZA,
      { nome: 'Dotazione', effetto: 'Spada lunga Comune, una mano, FOR 4, PI 5, PS Integrità 10 (base 1d8+1 e +2 personale; non Versatile). Scudo medio Comune, FOR 5, PI 6, PS Integrità 10, AR passiva +2 già compresa. Inizia con entrambi pronti; le piastre sono corpo intrinseco AR 4. Al massimo due attacchi per Round, Opportunità compresa. Le Parate usano Difese 12 e i modificatori comuni. I 55 PX comprendono la dotazione.' },
      { nome: 'Tre sigilli', passiva: true, effetto: 'Immune ai soli incantesimi Respingere, Dardo Spirituale e Maledizione, a ogni versione: ne evita danni, perdita di PM e altre conseguenze (prevale su «Nucleo spirituale»). Non è immune a tutti i danni Magici o Eterei, ad altre maledizioni o a capacità con effetti simili. Innati e fissi.' },
      { nome: 'Sensi e protezioni', effetto: 'Percezione artificiale entro 12 Q di forme e movimenti anche al buio, attraverso un percorso senza solidi, con acquisizione di bersagli solo in quel raggio. Non usa occhi o udito: immune ad Accecato e Assordato. Immune anche a Terrorizzato, fascinazione, Paralizzato, pietrificazione, Stordito e Avvelenato. Contro incantesimi e poteri mistici +2 alle sole PS già previste (non nei VA, non migliora Difese, AR o la determinazione delle Ferite).' },
      { nome: 'Volo e consegna', effetto: 'Volo innato senza ali, con sosta in quota finché cosciente; Corsa e Scatto richiedono Atletica −2 e −4; decollo, quota e atterraggio rientrano nell’unica AzM. Svenuto perde sostentamento e può cadere. Comprende il creatore senza parlare; può ritirarsi tatticamente per conservare la posizione da proteggere.' },
    ],
    note: 'AR 6 con Scudo medio, 4 senza (piastre intrinseche AR 4 + AR passiva +2 dello Scudo). Sentinella intelligente che ragiona sull’intento della consegna: non è la semplice Armatura animata. Fonte: Helmed Horror, p. 183.',
  },
  {
    id: 'golem-di-carne', nome: 'Golem di carne',
    caratteristiche: { FOR: 9, DES: 4, COS: 8, INT: 3, SAG: 5, CAR: 3 },
    pv: 60, pm: 8, ar: { totale: 2, magica: 0 }, difese: 7, iniziativa: -2,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 8, volonta: 7, magia: 11 },
    immunita: ['avvelenato', 'sanguinamento', 'terrorizzato'],
    attacchi: [r('Schianto', 13, '2d6+2', 1, { proprieta: ['Contusione'], natura: 'Magico', note: 'Il danno è Magico, non Etereo, e incontra l’AR ordinaria.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      { ...GUARDIANO(CON_MENTE + ' È tessuto morto, ma non un non morto né un organismo vivo curabile come un umano.') }, RESISTENZA, scuro,
      { nome: 'Assorbimento elettrico', passiva: true, effetto: 'Immune ai danni da Elettricità, compreso Fulmine, e ai loro effetti secondari, di qualunque Natura. Per una fonte che produrrebbe danno si calcola il residuo dopo Difese, riduzioni e AR, ignorando solo questo assorbimento: invece di subirlo recupera altrettanti PV, fino a 4 PV complessivi per Round da tutte le fonti (il resto è annullato; contatti innocui non curano). Non ripristina PM o cariche; non supera il massimo effettivo dei PV; opera a 0 PV finché il Golem non è Morente; non cura Ferite, Menomazioni, Stati o Morente. Elettricità e danni fisici di un colpo misto si separano.' },
      { nome: 'Avversione al fuoco', passiva: true, effetto: 'Dopo almeno 1 danno finale da Fuoco subisce −2 VA alle Prove di Abilità fino alla fine della propria Iniziativa successiva. Non penalizza le PS, non toglie Azioni e non è Terrorizzato. Nuovi danni rinnovano la scadenza; non si somma al −2 di Incendiato (vale il maggiore). Il Fuoco mantiene le proprie conseguenze.' },
      FURIA(24, 'Calmare: il creatore riconosciuto, udibile entro 12 Q, usa 1 AzP e Oratoria senza modificatore: successo termina la Furia, senza curare. La Furia termina anche se il Golem recupera tutti i propri PV effettivi (Ferite e Menomazioni restano); se resta a 24 PV o meno può ricadervi con un nuovo 6.'),
      { nome: 'Forma, magia e servizio', effetto: 'Non può essere trasformato in un altro materiale o anatomia da un potere di mutazione (restano vincoli, spinte, A Terra, Rallentato, Incendiato o perdite di funzione da Menomazione). Contro incantesimi e poteri mistici +2 alle sole PS già previste, non nei VA; non migliora le PS delle Ferite perché il danno era Magico. Non è immune a Dardo Psichico né a ogni altro effetto mentale. Immune ad Affaticamento, fascinazione, Paralizzato e pietrificazione. Comprende le lingue del creatore senza parlare; esegue una consegna semplice e valuta un ostacolo concreto; può essere richiamato dal creatore, non persuaso da chiunque.' },
    ],
    note: 'Guardiano assemblato con ragionamento elementare e movimenti rigidi. Al massimo due Schianti per Round, Opportunità compresa. Fonte: Flesh Golem, pp. 167 e 169.',
  },
  {
    id: 'golem-di-argilla', nome: 'Golem di argilla', senzaSalvezza: ['volonta'],
    caratteristiche: { FOR: 10, DES: 4, COS: 9, INT: 1, SAG: 4, CAR: 1 },
    pv: 84, ar: { totale: 4, magica: 0 }, difese: 7, iniziativa: -2,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 8, magia: 12 },
    immunita: ['avvelenato', 'sanguinamento'],
    attacchi: [r('Schianto maledetto', 14, '2d8+3', 1, { proprieta: ['Contusione'], natura: 'Magico', note: 'Nessun danno Etereo automatico. Dopo almeno 1 danno finale: vedi «Colpo maledetto».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 8 }, { nome: 'Furtività', va: 5 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      GUARDIANO(SENZA_MENTE), RESISTENZA, scuro,
      { nome: 'Magia e assorbimento', passiva: true, effetto: 'Contro incantesimi e poteri mistici +2 alle sole PS già previste, non nei VA; non modifica la determinazione delle Ferite. Immune ad acido e a Corrosivo prodotto da quell’acido: il residuo che infliggerebbe danno recupera PV con la procedura del Golem di carne, ma con massimo 6 PV complessivi per Round. Non ripara oggetti impugnati, non sana Ferite e non stabilizza Morente. Immune ad Affaticamento, Paralizzato e pietrificazione; non può essere trasformato da un potere di mutazione (conserva Ferite, Menomazioni e vincoli materiali).' },
      { nome: 'Colpo maledetto', prova: 'Tempra −2', effetto: 'Dopo almeno 1 danno finale di Schianto, una vittima con PV massimi ordinari effettua Tempra −2: successo evita; fallimento riduce di 2 il massimo dei PV. Ulteriori fallimenti possono portare la riduzione complessiva a 6 (sommando anche Golem diversi), senza abbassare il massimo sotto 1. Nessuna seconda Difesa o PS iniziale; capacità innata, non il lancio di Maledizione. I PV attuali eccedenti il nuovo massimo si perdono senza un secondo danno né Tempra per Ferite; il tetto vale anche per rigenerazione e cure; non riduce PV temporanei, PM, COS, VA o contatore di Morente e non uccide automaticamente. Dura un’ora dall’ultima applicazione fallita, anche dopo la distruzione del Golem. Negare Potere rimuove l’intera riduzione dal bersaglio (potenza 9; non serve Rompere Vincolo); scadenza o rimozione restituiscono il massimo, non i PV mancanti; le cure dei PV e Cura Spirituale non rimuovono la causa.' },
      { nome: 'Accelerazione', azioni: { principali: 1 }, limiti: 'Usata nel Round R, non si riattiva prima della propria Iniziativa in R + 3.', effetto: 'Senza PM: +2 VA a Difese e Riflessi fino a fine del Round successivo. Non somma il bonus con un’altra propria Accelerazione e non concede AzP, AzM, Schianti, Opportunità o ricariche aggiuntive; prende una delle due AzP ordinarie.' },
      FURIA(36, 'Non esegue ordini finché dura; il creatore non la termina con una parola d’arresto né con Oratoria: termina solo tornando al massimo effettivo dei PV o alla distruzione (l’incoscienza ne impedisce comunque le azioni). L’assorbimento può recuperare PV fino al massimo effettivo, senza eliminare le Ferite.'),
      { nome: 'Sensi e consegna', effetto: 'Comprende gli ordini del creatore senza parlare. L’assenza di mente impedisce gli effetti che ne richiedono una.' },
    ],
    note: 'Pesante corpo di argilla animata che presidia un luogo; l’eventuale origine religiosa non gli dà Natura Oscura Simmetria. PM — e Volontà —: nessun dato (un dato assente non vale 0). Al massimo due Schianti per Round, Opportunità compresa. Fonte: Clay Golem, pp. 167–168.',
  },
  {
    id: 'guardiano-protettore', nome: 'Guardiano protettore', senzaSalvezza: ['volonta'],
    caratteristiche: { FOR: 9, DES: 4, COS: 8, INT: 1, SAG: 5, CAR: 1 },
    pv: 78, ar: { totale: 4, magica: 0 }, difese: 8, iniziativa: -2,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 8, magia: 11 },
    immunita: ['avvelenato', 'sanguinamento'],
    attacchi: [r('Pugni', 13, '2d6+2', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 5 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      GUARDIANO(SENZA_MENTE + ' Non ha la riduzione fisica comune.'), scuro,
      { nome: 'Rigenerazione', passiva: true, effetto: 'All’inizio della propria Iniziativa recupera 3 PV senza Azioni, soltanto se ha almeno 1 PV e non è Morente. Non sana Ferite, Menomazioni o Stati. A 0 PV non rigenera; un recupero compatibile sopra 0 permette i recuperi successivi. L’incapacità del portatore non lo distrugge.' },
      { nome: 'Protezione ravvicinata', azioni: { principali: 1 }, limiti: 'Una volta per Round.', effetto: 'Prima della Prova per colpire contro il portatore entro 1 Q, per assisterne la Difesa: deve essere cosciente, percepire il colpo e poter interferire fisicamente dalla propria posizione. +2 VA alla sola Difesa attiva che il portatore paga contro quel colpo; non concede una Difesa gratuita, non aumenta l’AR e non protegge da Aree o attacchi psichici diretti. Nessun movimento gratuito.' },
      { nome: 'Chiave di comando', effetto: 'Un unico amuleto è collegato al Guardiano: chi lo indossa impartisce comandi brevi e lo richiama mentalmente entro 1 km, nello stesso piano (il Guardiano conosce direzione e distanza della chiave, senza vedere il percorso; il richiamo non teletrasporta né fa attraversare ostacoli). Non richiede Sintonizzazione. Amuleto non indossato: nessun trasferimento o nuovo comando, continua l’ultimo ordine praticabile. Amuleto distrutto o legame reciso: Guardiano inerte (senza Azioni o Difese attive), non guarito o distrutto. Indossare una chiave valida richiede 1 AzP e trasferisce l’autorità senza rinnovare Azioni, PV o carica. La chiave: PI 4, PS Integrità 14, qualità Rara, oggetto posseduto con le regole normali. Rompere Vincolo la può recidere (potenza 9); Negare Potere non cancella la funzione passiva. Sostituire la chiave richiede una procedura costruttiva distinta. Comprende comandi del portatore in qualunque lingua; non parla.' },
      { nome: 'Trasferimento del danno', passiva: true, effetto: 'Se operativo ed entro 12 Q dal portatore della chiave indossata, riceve metà per eccesso del danno ai PV di ogni AC, dopo Difese, Salvezze, riduzioni e AR del portatore ma prima di sottrarlo alla sua riserva; il portatore subisce il resto, usando prima eventuali PV temporanei. Il Guardiano perde la quota senza un secondo giro di AR, resistenze, Salvezze o Difese. Non occorre linea visiva; una barriera che recide legami mistici può impedirlo. Ciascuno applica la propria quota a PV temporanei, PV e, se era già a 0 PV, Tempra e Ferite; l’eccedenza non si trasferisce in Ferite. Non si trasferiscono Stati, veleno, Corruzione, perdita di PM, PV sacrificati o danni che richiedono una mente come Dardo Psichico. La perdita di coscienza del Guardiano lo interrompe per gli eventi successivi. Una quota trasferita non si trasferisce ancora (nessuna catena fra Guardiani). Il portatore Svenuto riceve comunque protezione. L’amuleto non è un secondo avversario con PX propri.' },
      { nome: 'Carica preparata', azioni: { principali: 1 }, risorsa: '1 carica di Armatura di Forza 3', effetto: 'Una carica di Armatura di Forza 3 è già preparata all’inizio dell’impiego (se non consumata nella continuità della scena); i 3 PM sono stati pagati da chi l’ha caricata, non sono PM del Guardiano e non si ripristinano cambiando scena. Attivazione: 1 AzP del Guardiano, su ordine valido o a una condizione fissata al caricamento, su sé stesso o sul portatore consenziente che possa toccare; la carica si consuma e applica +2 AR Magica per 10 Round senza Concentrazione (Magia §17.3), senza Prova Potere, Focus o componenti, non interrompibile con Contromagia. Sul Guardiano porta l’AR complessiva a 6, di cui 2 magica; vale contro Naturale, Magico ed Etereo; non concede Difese, Salvezze o Azioni. Con Pelle Corazzata o un’altra Armatura di Forza vale il maggiore, senza sommare. Caricare di nuovo: chi indossa la chiave, conosce Armatura di Forza 3 e tocca il Guardiano la lancia normalmente (1 AzP, componenti, 3 PM e Potere): se riesce l’effetto è immagazzinato e sostituisce la carica precedente; non immagazzina Anticipazioni, benefici di Talenti o altre versioni. Negare Potere (potenza 3) cancella la carica o un effetto attivato, senza restituire PM.' },
    ],
    note: 'PM — e Volontà —: nessun dato (un dato assente non vale 0); AR magica 0 a riposo. Sentinella pesante che segue il portatore della chiave mistica. Al massimo due Pugni per Round, Opportunità compresa. Fonte: Shield Guardian, p. 271.',
  },
  {
    id: 'monodrone', nome: 'Monodrone',
    caratteristiche: { FOR: 5, DES: 6, COS: 5, INT: 2, SAG: 5, CAR: 3 },
    pv: 8, pm: 5, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 6 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 7, magia: 8 },
    attacchi: [r('Pugnale', 9, '1d4+1', 1, { proprieta: ['Perforazione'] }), r('Giavellotto a mano', 8, '1d6', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 9, '1d6+1', 15, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da guerra', va: 8 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Armi da mischia', va: 9 }, { nome: 'Atletica', va: 8 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      MODRON, VISIONE, VOLO_MODRON,
      { nome: 'Dotazione', effetto: `Un Pugnale Comune, FOR 2, PI 4, PS Integrità 10; due Giavellotti Comuni della sentinella (FOR 3, PI 4, PS Integrità 10). Inizia con un Giavellotto pronto e gli altri oggetti riposti. Un solo attacco per Round, Opportunità compresa (con un’arma ravvicinata pronta). Estrarre o recuperare un’arma richiede 1 AzP. I 11 PX comprendono la dotazione.` },
    ],
    note: 'Modron di primo grado: piccolo corpo sferico con arti e ali, per consegne elementari e messaggi brevi. Sotto 2 PV o a Ferita Profonda cerca il superiore o un riparo se il compito lo consente. Fonte: Monodrone, p. 224.',
  },
  {
    id: 'duodrone', nome: 'Duodrone',
    caratteristiche: { FOR: 5, DES: 6, COS: 5, INT: 4, SAG: 5, CAR: 4 },
    pv: 16, pm: 6, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Pugno', 9, '1d4', 1, { proprieta: ['Contusione'], note: 'Richiede una mano libera; non permette Parata.' }), r('Giavellotto a mano', 9, '1d6', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 9, '1d6+1', 15, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Armi da guerra', va: 9 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      MODRON, VISIONE,
      { nome: 'Armi e mani', effetto: `Tre Giavellotti Comuni della sentinella (FOR 3, PI 4, PS Integrità 10): due già pronti nelle mani, uno riposto. Può lasciarne uno gratuitamente per liberare una mano, ma raccoglierlo o estrarre quello riposto costa 1 AzP. Ogni lancio consuma un esemplare; nessuna riserva si ricarica. Al massimo due attacchi di Pugno o Giavellotto per Round complessivi, Opportunità compresa. I 22 PX comprendono la dotazione.` },
    ],
    note: 'Modron di secondo grado: corpo squadrato che coordina consegne semplici; le due funzioni gestite non sono due azioni simultanee gratuite. Sotto 4 PV o a Ferita Profonda può ripiegare per riferire e preservare la consegna, senza immunità a paura o dolore. Fonte: Duodrone, p. 225.',
  },
  {
    id: 'tridrone', nome: 'Tridrone',
    caratteristiche: { FOR: 6, DES: 6, COS: 5, INT: 5, SAG: 5, CAR: 5 },
    pv: 22, pm: 7, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 9, magia: 10 },
    attacchi: [r('Pugno', 10, '1d4+1', 1, { proprieta: ['Contusione'] }), r('Giavellotto a mano', 10, '1d6+1', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 10, '1d6+1', 18, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Armi da guerra', va: 10 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      MODRON, VISIONE,
      { nome: 'Dotazione e sequenza', effetto: 'Tre Giavellotti Comuni della sentinella (FOR 3, PI 4, PS Integrità 10): due pronti e uno riposto; una terza mano resta libera. Al massimo due attacchi complessivi per Round, Opportunità compresa. Lanciare richiede il proprio esemplare; estrarre o recuperare costa 1 AzP. L’arto libero può usare oggetti o un Pugno, entro il budget. I 22 PX comprendono la dotazione.' },
    ],
    note: 'Modron di terzo grado: corpo a piramide rovesciata con tre braccia; coordina Duodroni e riceve da Quadroni. Si annota l’arto interessato da una Menomazione. Nessun bonus collettivo al tiro dalla sola presenza del coordinatore. Condotta: sotto 5 PV o a Ferita Profonda tende a riferire o riunire la pattuglia. Fonte: Tridrone, p. 225.',
  },
  {
    id: 'quadrone', nome: 'Quadrone',
    caratteristiche: { FOR: 6, DES: 7, COS: 6, INT: 6, SAG: 6, CAR: 6 },
    pv: 28, pm: 9, ar: { totale: 2, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 6 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 11, volonta: 10, magia: 10 },
    attacchi: [r('Pugno', 10, '1d4+1', 1, { proprieta: ['Contusione'] }), d('Arco da guerra', 12, '1d6+2', 100, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Armi da lancio', va: 12 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      MODRON, VISIONE, VOLO_MODRON,
      { nome: 'Dotazione e tiro', effetto: 'Arco da guerra Comune, Armi da lancio, due mani, FOR 5, PI 6, PS Integrità 10, MOV 0; venti frecce ordinarie (base 1d6+1 e +1 personale già compresi; incoccare è compreso nell’attacco; frecce e recuperi seguono gli Armamenti). L’Arco non para; le altre due braccia possono tenere oggetti compatibili o usare Pugno, pagando le Azioni. Al massimo due attacchi o due frecce complessive per Round, Opportunità compresa (solo Pugno). Nessun tiro simultaneo di quattro frecce; l’eventuale Tiro Rapido mantiene tutti i propri costi e requisiti entro quel limite. Non ha un bonus di Tiro Mirato già attivo né il Talento di sparare automaticamente in volo. I 33 PX comprendono la dotazione.' },
    ],
    note: 'Modron di quarto grado: piattaforma biomeccanica con quattro braccia e ali; il numero di braccia non genera una Raffica. Vedere una forma non permette alla freccia di attraversare un ostacolo. Condotta: sceglie linee di tiro praticabili e riferisce ai Pentadroni; sotto 7 PV o a Ferita Profonda può ripararsi e conservare le informazioni. Fonte: Quadrone, p. 226.',
  },
  {
    id: 'pentadrone', nome: 'Pentadrone',
    caratteristiche: { FOR: 7, DES: 7, COS: 6, INT: 6, SAG: 7, CAR: 7 },
    pv: 38, pm: 10, ar: { totale: 2, magica: 0 }, difese: 12, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 11, volonta: 11, magia: 11 },
    attacchi: [r('Braccio', 12, '1d6+2', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 14 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      MODRON, VISIONE,
      { nome: 'Gas paralizzante', azioni: { principali: 1 }, usi: { quanti: 3, per: 'giorno' }, limiti: 'Usato nel Round R, non riutilizzabile prima della propria Iniziativa in R + 3. Le tre dosi non si recuperano cambiando scena, riposando brevemente o sostituendo il superiore.', prova: 'PS di Tempra', effetto: 'Senza PM: cono di gas lungo 6 Q dalla bocca, in un mezzo aeriforme compatibile e lungo percorsi liberi; colpisce tutte le creature nell’Area, alleati compresi, escludendo la fonte; i solidi bloccano la propagazione. Consuma la dose anche contro bersagli immuni. Una vittima biologicamente vivente (Modron compresi) deve poter inalare il gas: un sistema chiuso che escluda l’aria contaminata impedisce l’esposizione, un filtro adatto segue la propria scheda. Tempra senza modificatore evita; fallimento Avvelenato e Paralizzato per 3 Round. Nessun danno ai PV, tiro per colpire, Parata, Schivata o Elusione; le Coperture pertinenti modificano la PS. A fine di ogni propria Iniziativa la vittima ripete gratis Tempra senza modificatore: successo termina veleno e paralisi. In questa tossina lo Stato Avvelenato indica solo la sostanza e non aggiunge altri malus. Nuove dosi non sommano Stati e conservano la scadenza più lontana. Immunità a veleni o Avvelenato impedisce tutto; immunità a Paralizzato impedisce il blocco ma non la sostanza. Paralisi cosciente: senza AzP o Movimento né Difese attive. Veleno naturale di Pericolosità IV, Seria: antidoto appropriato o Cura Avvelenamenti di livello almeno 5 rimuove la causa e la paralisi; Cura Spirituale da sola no. Un costrutto privo di fisiologia biologica non è un bersaglio valido. Esposizione istantanea: nessuna nube persistente, nessuna nuova dose entrando più tardi nei Q; il vento o un ostacolo possono escludere la vittima. Raccolta del gas in armi: serve un profilo di sostanza distinto.' },
      { nome: 'Sequenza e corpo', effetto: 'Al massimo due attacchi di Braccio per Round, Opportunità compresa. I cinque arti non concedono Parata naturale o altre Azioni; una Menomazione si applica alla funzione colpita, senza essere cancellata dagli arti rimasti. Il Gas costa 1 AzP e sostituisce un’attività ordinaria: non è un attacco gratuito dopo i colpi. Non è immune al proprio veleno solo perché lo produce.' },
    ],
    note: 'Modron di quinto grado: organismo biomeccanico a cinque braccia che sorveglia compiti complessi. Adatta un ordine a una situazione nuova senza conoscere intenzioni o mappe non percepite; coordina Quadroni e propri pari. Condotta: sotto 9 PV o a Ferita Seria cerca una posizione utile a conservare la consegna. Fonte: Pentadrone, p. 226.',
  },
];

function profilo(c) {
  return {
    formato: 'mutant-nemico', versione: 1, id: c.id, nome: c.nome, fonte: FONTE,
    caratteristiche: c.caratteristiche,
    pv: c.pv, ...(Number.isInteger(c.pm) ? { pm: c.pm } : {}),
    ar: c.ar, difese: c.difese, iniziativa: c.iniziativa,
    movimento: c.movimento,
    ...(c.taglia ? { taglia: c.taglia } : {}),
    ...(c.spazio ? { spazio: c.spazio } : {}),
    ...(c.gs_px ? { gs_px: c.gs_px } : {}),
    salvezze: c.salvezze,
    ...(c.senzaSalvezza ? { senza_salvezza: c.senzaSalvezza } : {}),
    azioni: c.azioni,
    attacchi: c.attacchi,
    abilita: c.abilita,
    capacita: c.capacita,
    ...(c.immunita ? { immunita: c.immunita } : {}),
    note: c.note,
  };
}

const base = new URL('../esempi/nemici/mostri/', import.meta.url);
let scritti = 0;
for (const c of CREATURE) {
  await writeFile(new URL(`${c.id}.json`, base), `${JSON.stringify(profilo(c), null, 2)}\n`);
  scritti += 1;
}
console.log(`${scritti} profili del blocco «Costrutti e Modron» scritti in esempi/nemici/mostri/`);
