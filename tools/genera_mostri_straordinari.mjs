// Blocco «Predatori straordinari» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci profili prestabiliti in
// esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti; niente valori inventati.
// GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126); ingombro non ammesso (Worg 2 × 1 Q, Roc 6 × 6 Q) nelle
// note con A.167 (approvata il 18/10, in implementazione); la Taglia non si deduce dall'ingombro.
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - Soffi (Lupo invernale, Segugio infernale): capacità con 2 AzP, cadenza R + 3 e PS di Elusione; non attacchi.
//  - danno misto (Morso ardente: Perforazione + Fuoco): la prima componente in `danno`, la seconda nella nota, una AC.
//  - Digestione, presa, inghiottimento, malattia, veleno di fase, Balzo e Passaggio di fase: capacità.
//  - immunità negli Stati solo per Incendiato (Segugio, Remorhaz); il Gelo e le altre immunità elementali nelle capacità.
//
// Uso: node tools/genera_mostri_straordinari.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Predatori straordinari';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const scuro = (q = 12) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa solidi, torbidità o fumo.` });
const VIVENTE = { nome: 'Corpo vivente', effetto: 'Natura Comune, mente e PM personali; respira, mangia, beve e riposa; veleni, malattie e cure biologiche possono interessarlo salvo immunità esplicite. Non appartiene alla Covata né ne applica il disorientamento da freddo. A 0 PV non è automaticamente morto o Svenuto: §4.2 (un nuovo danno finale positivo a 0 PV richiede Tempra e le normali Ferite; l’eccedenza del colpo che esaurisce i PV non genera da sola Ferite). A 0 PM personali Svenuto dopo la risoluzione completa dell’azione. INI modifica 1d10; AzP e unica AzM valgono per tutto il Round; ogni attacco normale costa 1 AzP e produce AC 1; il danno in tabella è già completo (non aggiungere FOR o DES). Una sola Opportunità ordinaria per Round (Morso, Becco, Corna o Artigli ammessi: non Soffi, teletrasporto, inghiottimento o Manovre offensive); i limiti offensivi comprendono Opportunità e attacchi ordinati. Nessuna Parata naturale; Schivata: 1 AzP e 1 AzM, consapevolezza, spazio e una funzione locomotoria. Naturale e Magico incontrano l’AR pertinente, Etereo solo quella magica; nessuna AR magica. Un senso acuto dà +2 a Percezione quando è determinante, una sola volta per Prova. Corsa e Scatto in volo richiedono Atletica −2 e −4; ali, quota e spazio necessari, nessun volo stazionario; perdita del sostegno o incoscienza possono causare Caduta. Testa = bocca e sensori, Torace = corpo, Braccia e Gambe = gruppi di arti (per Peryton e Roc le Braccia sono le ali). Stato di durata N applicato nel Round R: termina a fine R + N. Dotazione: nessuna.' };
const BRANCO = { nome: 'Branco', passiva: true, effetto: '+2 ai tiri per colpire se un alleato cosciente e capace di attaccare minaccia la vittima in mischia da entro 1 Q (nessun secondo vantaggio numerico per la stessa circostanza). Non modifica Soffi o PS.' };
const soffio = (nome, elemento, stato, tipoPs) => ({ nome, azioni: { principali: 2 }, prova: 'Elusione: Riflessi senza modificatore', limiti: 'Dopo l’uso nel Round R non si può soffiare prima di R + 3; nessun costo in PM e nessuna ricarica casuale (cambiare bersaglio, recuperare PV, curarsi o entrare in un nuovo tratto della scena non azzerano l’intervallo). Sostituisce entrambe le AzP, senza Morso aggiuntivo.', effetto: `3d6 ${elemento} Naturale. Cono lungo 3 Q dalle fauci (larghezza 1, 2 e 3 Q a distanza 1, 2 e 3 Q, centrato sulla direzione scelta) lungo un percorso libero; pareti e solidi fermano le parti schermate; colpisce tutte le creature nell’Area, alleati compresi. Nessun tiro per colpire; non si applica Branco. Per ogni vittima Riflessi senza modificatore per Eludere (se concretamente possibile): successo dimezza per eccesso il danno prima dell’AR, fallimento o impossibilità lo lascia intero; non consuma AzP o AzM; le Coperture pertinenti modificano la PS; nessuna Parata, Schivata o altro tiro contro lo stesso soffio; una sola AC per vittima. Dopo almeno 1 danno elementale residuo oltre Difesa, AR e Contromisura pertinente: ${tipoPs} contro ${stato} (PS di Stato distinta da Elusione): successo evita, fallimento lo applica per 1+1d3 Round; Ignifugo e Termico non riducono i PV persi ma possono impedire lo Stato (Giocatore §5.24).` });

const CREATURE = [
  {
    id: 'worg', nome: 'Worg',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 5, SAG: 5, CAR: 4 },
    pv: 28, pm: 7, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 10, corsa: 20, scatto: 30 },
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 11, volonta: 9, magia: 9 },
    attacchi: [r('Morso', 12, '1d8+2', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 12 }, { nome: 'Sopravvivenza', va: 12 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      VIVENTE, scuro(12),
      { nome: 'Abbattere la preda', prova: 'PS di Tempra senza modificatore', limiti: 'Una volta per Round.', effetto: 'Dopo almeno 1 danno finale di Morso a una creatura su un appoggio e di spazio non superiore a 2 × 2 Q: Tempra senza modificatore; fallimento A Terra nel proprio spazio; successo mantiene l’appoggio. Nessuna presa, spinta o seconda AC. Una vittima già A Terra non ripete la PS. Non atterra chi vola o nuota senza appoggio.' },
      { nome: 'Sensi e parola', effetto: 'Udito e olfatto acuti +2 a Percezione, senza sommarli. Parla Goblin e Worg. Non ha Branco, telepatia o controllo sui Goblin. Un solo Morso per Round, Opportunità e attacco ordinato compresi.' },
    ],
    note: 'Spazio sulla mappa 2 × 1 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167). Canide senziente che può collaborare con Goblin e Hobgoblin ma non è un animale obbediente per definizione. Cavalcatura solo con accordo, addestramento, attrezzatura e carico compatibili; il suo Movimento non diventa quello del cavaliere e non dà Azioni condivise. Condotta: sotto 7 PV o a Ferita Profonda cerca una via di fuga oppure tratta. Fonte: Worg, p. 341.',
  },
  {
    id: 'lupo-invernale', nome: 'Lupo invernale',
    caratteristiche: { FOR: 8, DES: 6, COS: 7, INT: 5, SAG: 6, CAR: 5 },
    pv: 50, pm: 9, ar: { totale: 2, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 11, volonta: 10, magia: 10 },
    attacchi: [r('Morso', 13, '1d8+3', 1, { proprieta: ['Perforazione'], note: 'Non aggiunge danno da Gelo.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 13 }, { nome: 'Sopravvivenza', va: 13 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      VIVENTE, BRANCO,
      soffio('Soffio gelido', 'Gelo', 'Rallentato', 'Tempra senza modificatore'),
      { nome: 'Morso e abbattimento', effetto: 'Al massimo un Morso per Round, Opportunità e colpo ordinato compresi. Dopo almeno 1 danno finale può abbattere una vittima su appoggio fino a 2 × 2 Q: Tempra senza modificatore evita A Terra, come per il Worg.' },
      { nome: 'Gelo e neve', passiva: true, effetto: 'Immune a danni e conseguenze del Gelo di qualunque Natura; non è vulnerabile automaticamente al Fuoco. Udito e olfatto acuti +2. Sulla neve +2 a Furtività quando il manto bianco aiuta realmente a nascondersi (nessuna invisibilità né cancellazione delle impronte). Nessuna Scurovisione innata. Non guadagna altri Soffi restando al freddo e non assorbe il Gelo per curarsi.' },
    ],
    note: 'Parla Comune, Gigante e il linguaggio dei Lupi invernali. Segue tracce sulla neve; può servire come guardiano per accordo o addestramento. Condotta: sotto 13 PV o a Ferita Profonda può proteggere il branco ripiegando. Fonte: Winter Wolf, pp. 340–341.',
  },
  {
    id: 'segugio-infernale', nome: 'Segugio infernale',
    caratteristiche: { FOR: 8, DES: 5, COS: 7, INT: 4, SAG: 6, CAR: 4 },
    pv: 44, pm: 9, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 10, volonta: 9, magia: 10 },
    immunita: ['incendiato'],
    attacchi: [r('Morso ardente', 13, '1d8+2', 1, { proprieta: ['Perforazione'], note: 'Aggiunge 1d4 Fuoco Naturale (una AC, componenti miste): Difesa e protezioni a ciascuna componente, residui aggregati per una sola applicazione a PV e Ferite; solo il residuo di Fuoco può innescare Incendiato. Il Fuoco del Morso è intrinseco, non un incantesimo né una seconda applicazione fisica.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 10 }, { nome: 'Sopravvivenza', va: 12 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      VIVENTE, scuro(12), BRANCO,
      soffio('Soffio di Fuoco', 'Fuoco', 'Incendiato', 'Riflessi senza modificatore'),
      { nome: 'Immunità e sensi', passiva: true, effetto: 'Immune al Fuoco di qualunque Natura e a Incendiato; non assorbe fiamme per recuperare PV. Non è immune al Gelo, ai danni psichici o ai veleni compatibili. Udito e olfatto acuti +2. Comprende Infernale senza parlarlo (capire una lingua non equivale ad accettare ordini). Il nome non assegna Natura Oscura Simmetria, CROS, Corruzione o un legame con un Apostolo. Al massimo un Morso per Round, Opportunità e attacco ordinato compresi. Alla morte effettiva il corpo si consuma in fumo e braci senza esplosione, Area dannosa o nuovo Stato; a 0 PV o PM non scompare; non libera un secondo avversario.' },
    ],
    note: 'Canide intelligente dalle fauci incandescenti. Condotta: sotto 11 PV o a Ferita Profonda può ripiegare o cambiare preda. Fonte: Hell Hound, p. 182.',
  },
  {
    id: 'cane-della-morte', nome: 'Cane della morte',
    caratteristiche: { FOR: 6, DES: 6, COS: 6, INT: 2, SAG: 6, CAR: 3 },
    pv: 32, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Morso', 11, '1d6+2', 1, { proprieta: ['Perforazione'], note: 'Con almeno 1 danno fisico finale a un vivente vulnerabile: vedi «Saliva infetta».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 11 }, { nome: 'Sopravvivenza', va: 10 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      VIVENTE, scuro(24),
      { nome: 'Due teste', passiva: true, effetto: 'Al massimo due Morsi per Round, uno per testa operativa, Opportunità e attacco ordinato compresi; nessuna AzP aggiuntiva né due riserve di PV. Finché entrambe funzionano, +2 a Percezione e alle PS contro Accecato, Assordato, fascinazione, Terrorizzato, Stordito e Svenuto, solo quando l’effetto prevede quella PS (nessuna Salvezza contro 0 PM, Morente o esiti senza PS). Per Testa si considera quella coinvolta: una Menomazione della funzione di una testa non colpisce l’altra, ma Ferite, coscienza e Morente restano dell’unico corpo.' },
      { nome: 'Saliva infetta', prova: 'PS di Tempra senza modificatore', effetto: 'Malattia biologica naturale di Pericolosità IV, Seria; non infligge danni tossici immediati né modifica i PV massimi. Dopo almeno 1 danno fisico finale da Morso, Tempra senza modificatore evita; al massimo una PS di esposizione per bersaglio e Round, anche contro più Cani (superarla non dà immunità); chi è già infetto non aggiunge dosi o decorsi paralleli; l’immunità alle malattie biologiche (non quella ai veleni) impedisce l’infezione. Esordio dopo un’ora: febbre e infiammazione, −2 alle Prove fisiche (attacchi e Difese compresi), nessuna penalità alle PS; non è lo Stato Avvelenato. Decorso: ogni 24 ore dall’esposizione Tempra senza modificatore; fallimento 1d6 Naturale interni ai PV (ignora l’AR) e si azzera la sequenza di guarigione; successo senza danno e si registra una riuscita: due successi consecutivi eliminano la malattia. Il danno giornaliero usa PV e Ferite ordinari (se già a 0 PV, anche la Tempra per Ferite); la morte segue Morente. Cura Malattie dal livello 5 (10 minuti) la rimuove con la penalità, non danni e Ferite; Medicina può riconoscerla e impostare una terapia; Cura Avvelenamenti e antidoti non la curano. Contagio solo tramite saliva inoculata; nessun contagio per vicinanza, sangue o cura; la guarigione non dà immunità.' },
    ],
    note: 'Canide bicefalo; il nome non conferisce attacchi di morte istantanea. Non comprende linguaggi. Condotta: sotto 8 PV o a Ferita Profonda tende a ritirarsi. Fonte: Death Dog, p. 321.',
  },
  {
    id: 'cane-intermittente', nome: 'Cane intermittente',
    caratteristiche: { FOR: 5, DES: 7, COS: 5, INT: 6, SAG: 6, CAR: 5 },
    pv: 20, pm: 10, ar: { totale: 0, magica: 0 }, difese: 12, iniziativa: 2,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 9, riflessi: 12, volonta: 10, magia: 10 },
    attacchi: [r('Morso', 10, '1d6+1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 13 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      VIVENTE,
      { nome: 'Balzo intermittente', azioni: { principali: 1 }, risorsa: '2 PM', limiti: 'Alla propria Iniziativa, al massimo una volta per Round. Non comprende un Morso gratuito: con due AzP può combinare un Morso e un Balzo oppure conservare Azioni per Difese.', effetto: 'Sceglie uno spazio libero visibile entro 8 Q, capace di contenerne il corpo e con appoggio sicuro. Capacità innata (nessuna Prova Potere, Focus o componente), non un lancio interrompibile con Contromagia. Scompare dall’origine e riappare alla destinazione senza percorrere i Q intermedi; non provoca Opportunità per il solo abbandono della portata durante il salto; non attraversa fisicamente muri o creature; ostacoli opachi impediscono la scelta di uno spazio non visibile (una vetrata trasparente può permetterla). Viaggiano solo il Cane e oggetti non viventi indossati o fissati al corpo, entro il suo carico ordinario: non porta una seconda creatura, un cavaliere o un nemico che lo trattiene. È impedito da un’ancora fisica non trasportabile, catene fissate, una presa o Immobilizzato; non è una fuga automatica da un vincolo. Non è una Reazione, una Schivata gratuita né annulla un attacco già dichiarato. Gli Stati personali lo seguono (Incendiato non si spegne). L’AzM non viene spesa né rinnovata. A 0 PM dopo la completa risoluzione compare alla destinazione e diventa Svenuto. La traslazione è istantanea: Negare Potere non la annulla dopo l’arrivo; barriere che vietano espressamente la traslazione prevalgono; non rimuove una Prigione Dimensionale. Non insegna Teletrasporto.' },
      { nome: 'Sensi e parola', effetto: 'Udito e olfatto acuti +2, nessuna Scurovisione innata. Parla il linguaggio dei Cani intermittenti e comprende Silvano senza pronunciarlo; può comunicare, cooperare o rifiutare. La rivalità con le Bestie distorcenti è uno spunto di comportamento, non un obbligo cosmologico. Un solo Morso per Round, Opportunità e attacco ordinato compresi. Non è invisibile fra i Balzi, non vede attraverso i muri e non resta in una dimensione separata.' },
    ],
    note: 'Cacciatore che scompare da un punto e riappare in un altro visibile; il corpo resta vivente e materiale. Condotta: sotto 5 PV o a Ferita Profonda cerca un punto visibile riparato. Fonte: Blink Dog, p. 318.',
  },
  {
    id: 'ragno-di-fase', nome: 'Ragno di fase',
    caratteristiche: { FOR: 6, DES: 7, COS: 6, INT: 4, SAG: 5, CAR: 3 },
    pv: 30, pm: 12, ar: { totale: 1, magica: 0 }, difese: 12, iniziativa: 2,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 12, volonta: 8, magia: 10 },
    attacchi: [r('Morso', 12, '1d8+2', 1, { proprieta: ['Perforazione'], note: 'Poi veleno: vedi «Veleno di fase naturale III». Solo corporeo.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 14 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      VIVENTE, scuro(12),
      { nome: 'Veleno di fase naturale III', prova: 'PS di Tempra senza modificatore', effetto: 'Distinto dal veleno aracnide II. Dopo almeno 1 danno fisico finale a un vivente vulnerabile: Tempra senza modificatore; successo dimezza per eccesso 2d4 Naturale interni e impedisce la penalità; fallimento lascia il danno intero e applica Avvelenato con −2 alle Prove fisiche per 10 Round. Il danno tossico ignora l’AR ordinaria e non riceve il Magistrale del Morso; si applicano protezioni specifiche; nessuna paralisi o stabilizzazione a 0 PV. Finché la tossina è attiva, nuove esposizioni rinnovano solo i 10 Round (nessuna nuova PS iniziale, danno tossico o malus cumulato). A fine di ogni propria Iniziativa una Tempra senza modificatore riuscita termina la tossina. Antidoto appropriato o Cura Avvelenamenti dal livello 3 la rimuovono (restano i danni); l’immunità al veleno o ad Avvelenato la impedisce.' },
      { nome: 'Passaggio di fase', azioni: { principali: 1 }, risorsa: '2 PM', limiti: 'Alla propria Iniziativa, al massimo una volta per Round, solo se corporeo e non Immobilizzato, preso o ancorato fisicamente all’esterno.', effetto: 'Diventa incorporeo fino all’inizio della propria Iniziativa successiva (il ritorno è automatico, senza Azioni o PM; può anticiparlo alla propria Iniziativa con 1 AzP). L’attivazione non comprende Movimento, attacco o occultamento. Nessun Potere, componenti o Concentrazione. Rimane visibile come sagoma tenue nella posizione reale e localizzabile con i sensi pertinenti; Furtività richiede ripari effettivi. I danni Naturali lo attraversano senza effetto; Magici ed Eterei possono colpirlo (Magico incontra AR 1, Etereo AR magica 0). Durante la fase non morde, non afferra, non manipola oggetti solidi né trasporta creature; mente, spirito, PM e Natura non cambiano. Con l’AzM al Passo percorre fino a 6 Q complessivi anche attraverso corpi e pareti spesse non più di 1 Q: il solido resta opaco e deve conoscere da un’osservazione attendibile il punto libero d’uscita; termina ogni AzM in uno spazio libero e sostenuto; nessun Volo o Corsa di fase. Uscire da una portata provoca Opportunità, ma un colpo Naturale non può danneggiarlo mentre è incorporeo. Svenuto, morte o 0 PM dopo l’azione terminano la fase nello spazio già valido. Negare Potere può terminare la fase (potenza 3) senza cancellare l’abilità; Contromagia non la interrompe; barriere che vietano spostamenti incorporei prevalgono; non scioglie Immobilizzato, prese o catene.' },
      { nome: 'Superfici', effetto: 'Arrampicata 6 Q al Passo: su pareti e soffitti aderenti si muove al Passo senza Atletica ordinaria (superfici friabili o scivolose richiedono valutazione). Attraversa normali ragnatele senza il costo aggiuntivo, ma non ha Getto di seta o reti da cattura. Un solo Morso per Round, Opportunità e colpo ordinato compresi, soltanto corporeo. Nessun linguaggio.' },
    ],
    note: 'Grande ragno che alterna corpo solido e fase incorporea; si sposta durante la fase (non ha il Balzo del Cane intermittente). Condotta: sotto 8 PV o a Ferita Profonda cerca una fessura. Fonte: Phase Spider, p. 334.',
  },
  {
    id: 'remorhaz-giovane', nome: 'Remorhaz giovane',
    caratteristiche: { FOR: 9, DES: 6, COS: 8, INT: 2, SAG: 5, CAR: 3 },
    pv: 62, pm: 8, ar: { totale: 3, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 13, riflessi: 10, volonta: 8, magia: 10 },
    immunita: ['incendiato'],
    attacchi: [r('Morso ardente', 14, '1d10+3', 1, { proprieta: ['Perforazione'], note: 'Aggiunge 1d4 Fuoco Naturale (una AC, componenti miste): solo il residuo di Fuoco può innescare Incendiato. Nessuna presa automatica né inghiottimento.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      VIVENTE, scuro(12),
      { nome: 'Corpo incandescente', passiva: true, effetto: 'Una creatura che tocca direttamente il corpo, vi mantiene una presa o lo colpisce con un attacco ravvicinato da entro 1 Q riceve 1d6 Fuoco Naturale: contatto termico distinto, senza tiro per colpire né Difesa attiva (AR pertinente e protezioni specifiche si applicano; il residuo di Fuoco verifica anche Incendiato). Al massimo una applicazione per creatura e Round, condivisa per il medesimo Remorhaz, dopo il contatto o l’attacco (mantenendo il contatto, all’Iniziativa del Remorhaz nei Round successivi). Non è un’aura per chi gli sta accanto; essere morsi nelle fauci non la innesca (il Fuoco del Morso è già nel suo danno). Un’arma da oltre 1 Q, un arco, proiettili e incantesimi a distanza non provocano il danno. Svenuto non spegne il calore; dopo la morte effettiva cessa a fine del Round successivo; nessuna esplosione né danno ai PI. Immune a Fuoco, Incendiato e Gelo di qualunque Natura, senza guarigione per assorbimento.' },
      { nome: 'Vibrazioni', passiva: true, effetto: 'Percezione delle vibrazioni entro 12 Q per localizzare corpi in movimento sul medesimo supporto continuo. Non legge identità, pensieri o scritte, non scopre Furtività e non raggiunge chi vola, rimane immobile o è isolato dal supporto; un muro non diventa trasparente e non si attacca attraverso il solido. Non dà Scurovisione aggiuntiva.' },
      { nome: 'Scavo', azioni: { movimento: 1 }, effetto: 'L’unica AzM può essere un Passo di scavo fino a 4 Q in neve, suolo o ghiaccio non strutturale; non attraversa roccia, muri o scafi integri. Nessuna Corsa o Scatto sotterranei né secondo Movimento. Un corpo di 2 × 2 Q richiede una sezione realmente praticabile; non si presume una galleria sicura per gli inseguitori. Il calore può produrre vapore e segni nel ghiaccio, senza Area oscurante o crollo automatici. L’immunità elementale non dà aria respirabile né immunità al soffocamento.' },
    ],
    note: 'Predatore artico segmentato che attende sotto neve e ghiaccio; non ha ancora la capacità d’inghiottire dell’adulto. Un solo Morso per Round, Opportunità e attacco ordinato compresi; nessuna Parata naturale; non comprende linguaggi. Condotta: sotto 16 PV o a Ferita Seria cerca terreno scavabile e riparo. Fonte: Young Remorhaz, p. 258.',
  },
  {
    id: 'remorhaz', nome: 'Remorhaz',
    caratteristiche: { FOR: 10, DES: 6, COS: 10, INT: 2, SAG: 5, CAR: 3 },
    pv: 102, pm: 10, ar: { totale: 4, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 15, riflessi: 11, volonta: 9, magia: 11 },
    immunita: ['incendiato'],
    attacchi: [r('Morso ardente', 16, '2d8+3', 2, { proprieta: ['Perforazione'], note: 'Aggiunge 1d6 Fuoco Naturale (una AC, componenti miste): solo il residuo di Fuoco può innescare Incendiato. La presa si innesca dopo il danno: vedi «Presa delle fauci».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 16 }, { nome: 'Atletica', va: 16 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Leggenda', px: 100, per_pg: 4 },
    capacita: [
      VIVENTE, scuro(12),
      { nome: 'Corpo incandescente', passiva: true, effetto: 'Una creatura che tocca direttamente il corpo, vi mantiene una presa o lo colpisce con un attacco ravvicinato da entro 1 Q riceve 1d6+2 Fuoco Naturale: contatto termico distinto, senza tiro per colpire né Difesa attiva (AR e protezioni specifiche si applicano; il residuo di Fuoco verifica anche Incendiato). Al massimo una applicazione per creatura e Round, condivisa per il medesimo Remorhaz (mantenendo il contatto, all’Iniziativa del Remorhaz nei Round successivi); non è un’aura; essere morsi o trattenuti nelle fauci non la innesca. Un’arma da oltre 1 Q, un arco, proiettili e incantesimi a distanza non la provocano. Svenuto non spegne il calore; dopo la morte effettiva cessa a fine del Round successivo; nessuna esplosione. Immune a Fuoco, Incendiato e Gelo di qualunque Natura. Le pinne presso il capo non concedono Volo.' },
      { nome: 'Vibrazioni e scavo', effetto: 'Percezione delle vibrazioni entro 12 Q sul medesimo supporto continuo (nessuna identità, pensiero o scritta; non scopre Furtività; non raggiunge chi vola, è immobile o isolato; non attraverso un muro). L’unica AzM può essere un Passo di scavo fino a 4 Q in neve, suolo o ghiaccio non strutturale, senza Corsa o Scatto sotterranei né roccia, muri o scafi integri; un corpo di 3 × 3 Q richiede una sezione realmente praticabile. Il calore può produrre vapore e segni nel ghiaccio, senza Area oscurante o crollo automatici; l’immunità elementale non dà aria respirabile.' },
      { nome: 'Presa delle fauci', prova: 'PS di Riflessi senza modificatore', effetto: 'Dopo almeno 1 danno finale da Morso a una creatura di spazio non superiore a 2 × 2 Q: Riflessi senza modificatore; successo evita; fallimento Immobilizzato nelle fauci (mani e braccia non specificamente bloccate). Una sola vittima esterna; Morso e aggancio sono la stessa AC (nessun danno o AzP gratuita per stringere). Mantenere non costa Azioni nei Round successivi ma occupa le fauci: non può mordere altri bersagli; la vittima subisce −4 alle Prove fisiche (non alle PS), può attaccare il corpo a portata con strumenti praticabili. Liberarsi: la vittima o un alleato presso le fauci spende 1 AzP e contrappone Corpo a corpo o Atletica a Corpo a corpo 16 del Remorhaz (il prigioniero con −4 fisico, l’alleato non Immobilizzato no); successo termina la presa, pareggio la mantiene; serve poter raggiungere e fare leva. Non scava né trascina la preda attraverso solidi; su terreno libero può usare solo il Passo e solo se la vittima può seguirlo, senza danni da trascinamento. Perdita di coscienza, morte o Menomazione della funzione delle fauci sciolgono la presa (0 PV da soli no). Può lasciare la preda gratuitamente alla propria Iniziativa in uno spazio libero e sostenuto adiacente alle fauci.' },
      { nome: 'Inghiottire', azioni: { principali: 1 }, prova: 'Morso ordinario contro la vittima già nelle fauci', effetto: 'Solo una vittima già nelle fauci fino a 1 × 1 Q: Morso ordinario (tiro, Difese praticabili e AR normali; il danno non si applica due volte; lo stesso limite di un Morso per Round). Dopo almeno 1 danno finale la vittima è inghiottita e termina la presa esterna; una sola vittima fra presa esterna e stomaco. All’interno: Immobilizzato (mani non specificamente bloccate), Accecato verso l’esterno, copertura totale; segue il corpo; inizia il soffocamento del §5.23 se priva di respirazione autonoma adeguata; può attaccare il corpo dall’interno con strumenti utilizzabili e −4 fisico (il Remorhaz non Schiva tali attacchi mantenendo l’inghiottimento). Uscita: 1 AzP della vittima, Corpo a corpo o Atletica contro Atletica 16 con −4 di Immobilizzato: successo la espelle nel più vicino spazio libero adiacente alle fauci, pareggio resta dentro; un alleato presso le fauci con strumenti adatti usa la stessa opposizione senza il malus. Rigurgito: almeno 12 danni finali dall’interno nello stesso Round impongono al Remorhaz Tempra senza modificatore a fine dell’Iniziativa della vittima (una volta per Round); fallimento: espulsione A Terra entro 2 Q dalle fauci. Perdita di coscienza o morte cessano la compressione (uscire costa 1 AzM intera della vittima o 1 AzP di un alleato con strumenti adatti, senza opposizione). Dopo il soccorso terminano Immobilizzato, cecità e ostruzione; un Round di respirazione ripristina il fiato; Svenuto per soffocamento si risolve in 1d3 Round. Rilascio volontario dallo stomaco: 1 AzP alla propria Iniziativa.' },
      { nome: 'Digestione', azioni: { principali: 1 }, limiti: 'Al massimo una volta per Round; solo contro la vittima inghiottita; non è un’Opportunità né è gratuita a inizio turno.', effetto: '2d6 Naturale da acido, con AR ordinaria pertinente; nessun tiro per colpire o Difesa attiva; non danneggia automaticamente i PI e non ha Corrosivo. All’interno il calore di contatto è sostituito dalla Digestione (nessuna seconda applicazione passiva). Il Soffio di un’altra creatura non raggiunge automaticamente l’interno.' },
    ],
    note: 'Grande predatore artico che emerge dal ghiaccio. Un solo Morso per Round, Opportunità e colpo ordinato compresi; con una vittima esterna nelle fauci non morde altre creature. Nessun linguaggio né Parata naturale. Testa comprende le fauci, Torace il corpo e lo stomaco. Condotta: sotto 26 PV o a Ferita Seria tende a ritirarsi. Fonte: Remorhaz, p. 258.',
  },
  {
    id: 'peryton', nome: 'Peryton',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 5, SAG: 6, CAR: 5 },
    pv: 32, pm: 8, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 4, corsa: 8, scatto: 12, volo: 12 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 11, volonta: 10, magia: 10 },
    attacchi: [r('Corna', 12, '1d8+2', 1, { proprieta: ['Perforazione'] }), r('Artigli', 12, '1d8+2', 1, { proprieta: ['Taglio'], note: 'Gli Artigli riusciti non afferrano automaticamente la vittima.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 10 }, { nome: 'Sopravvivenza', va: 12 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      VIVENTE,
      { nome: 'Resistenza e sensi', passiva: true, effetto: 'Dimezza per eccesso i danni Naturali da Contusione, Perforazione e Taglio prima dell’AR; non vale contro Magico, Etereo, Fuoco, Gelo o acido. Vista e olfatto acuti +2, senza sommarli; nessuna Scurovisione innata. Comprende Comune ed Elfico senza parlarli. L’ombra umanoide è visibile quando la luce la produce: non è una creatura, un’illusione controllabile o un potere di paura.' },
      { nome: 'Passaggio in volo', passiva: true, effetto: 'Al massimo un attacco di Corna e uno di Artigli per Round, Opportunità e attacco ordinato compresi. Uscire dalla portata di un nemico usando il proprio Volo non provoca Opportunità; non concede altre AzM, non scioglie prese e non permette di attraversare il solido. Per attaccare e allontanarsi divide il Passo entro il budget complessivo.' },
      { nome: 'Picchiata', azioni: { principali: 1, movimento: 1 }, effetto: 'Carica in volo: traiettoria rettilinea praticabile di almeno 3 Q, con discesa verticale di almeno 6 Q per la Picchiata. Un solo attacco di Corna: −2 VA fino a 6 Q, −4 da 7 Q; danno ×2 (×3 complessivo con Magistrale). Nessun ulteriore dado da picchiata né secondo colpo nella Carica.' },
    ],
    note: 'Rapace con capo e corna da cervo; caccia dalle alture e può tornare su una preda abbandonata. Condotta: sotto 8 PV o a Ferita Profonda può disimpegnarsi per tornare a cacciare. Fonte: Peryton, p. 251.',
  },
  {
    id: 'roc', nome: 'Roc',
    caratteristiche: { FOR: 10, DES: 5, COS: 10, INT: 2, SAG: 6, CAR: 4 },
    pv: 128, pm: 12, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12, volo: 24 },
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 15, riflessi: 12, volonta: 10, magia: 12 },
    attacchi: [r('Becco', 16, '2d8+3', 2, { proprieta: ['Perforazione'] }), r('Artigli', 16, '2d6+3', 1, { proprieta: ['Taglio'], note: 'Possono innescare una presa solo dopo il danno: vedi «Presa e trasporto».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 16 }, { nome: 'Atletica', va: 17 }, { nome: 'Percezione', va: 14 }, { nome: 'Sopravvivenza', va: 13 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Leggenda', px: 100, per_pg: 4 },
    capacita: [
      VIVENTE,
      { nome: 'Volo e ingombro', effetto: 'Vista acuta +2, nessuna Scurovisione innata; nessun linguaggio. Apertura alare indicativa circa 40 Q: spazio del corpo e margine per battere le ali sono distinti. Non può raggiungere una vittima sotto un tetto o fra strutture che impediscano fisicamente il passaggio; non sfonda automaticamente costruzioni. Al massimo una Beccata e un attacco di Artigli per Round, Opportunità e attacco ordinato compresi; le due zampe non producono due AC nel medesimo attacco; un bersaglio colpito non viene sollevato o scagliato automaticamente.' },
      { nome: 'Presa e trasporto', prova: 'PS di Riflessi senza modificatore', effetto: 'Aggancio: dopo almeno 1 danno finale di Artigli a una creatura fino a 3 × 3 Q, Riflessi senza modificatore evita; fallimento Immobilizzato (mani non specificamente bloccate), trattenuta da una o entrambe le zampe. Una sola vittima esterna; finché la tiene non usa Artigli contro altri bersagli; mantenerla non costa Azioni né altri danni; può Beccarla con un normale attacco a portata. Liberarsi: la vittima o un alleato a contatto con gli artigli spende 1 AzP e contrappone Corpo a corpo o Atletica a Corpo a corpo 16 del Roc (il prigioniero con −4 fisico): successo termina la presa, pareggio la conserva; un attrezzo deve essere adatto; un attacco riuscito non spezza la presa. Capacità specifica: può sollevare una sola preda fino a 3 × 3 Q e non oltre 1.000 kg complessivi (oggetti indossati inclusi); con preda sollevata il Volo è limitato al Passo di 12 Q, senza Corsa o Scatto (decollo e quota rientrano nell’unica AzM). Non trascina la preda attraverso solidi, Q occupati o passaggi troppo stretti; la vittima segue il Roc e agisce nei limiti della presa. Liberarsi in quota termina Immobilizzato ma non dà Volo né un atterraggio sicuro (valgono le regole di Caduta). Rilascio: gratuito alla propria Iniziativa, senza tiro o lancio offensivo aggiuntivo; senza appoggio la vittima cade verticalmente. Svenuto, morte o Menomazione che impedisca la presa la sciolgono (0 PV da soli no); interrompere il Volo può far precipitare entrambi. Un passeggero consenziente, un’imbracatura o un carico esterno richiedono attrezzatura, accordo e condizioni proprie. La capacità non vale per altre grandi aquile o creature di FOR 10.' },
    ],
    note: 'Spazio sulla mappa 6 × 6 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167, approvata il 18/10, in implementazione). Uccello enorme, il cui nido domina pareti e vette isolate; predilige prede grandi o lente e può ignorare chi trova riparo sotto una copertura adatta. Condotta: sotto 32 PV o a Ferita Seria può abbandonare una preda e cercare un posatoio; difende nido e piccoli, ma non riceve un’ira senza limiti, una Carica gratuita o danni maggiori per la sola taglia; non è una cavalcatura addestrata per definizione. Eventuali resti e tesori nel nido appartengono alla scena. Fonte: Roc, p. 260.',
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
console.log(`${scritti} profili del blocco «Predatori straordinari» scritti in esempi/nemici/mostri/`);
