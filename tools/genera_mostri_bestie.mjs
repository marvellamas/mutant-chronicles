// Blocco «Bestie e predatori» del catalogo (cap. 8) del Manuale dei Mostri v0.13: dieci profili prestabiliti
// in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73), utilizzabili da «+ Aggiungi
// nemico» e dalla plancia come gli altri prestabiliti.
//
// Valori trascritti dalle schede del manuale; niente valori inventati. Movimento: il formato ha solo
// passo/corsa/scatto/volo (§2.14), quindi le andature secondarie (arrampicata, nuoto) e la scurovisione
// restano nelle note o in una capacità, com'è scritto nel manuale. Spazio sulla mappa (A.126): le bestie con
// ingombro non quadrato (Lupo feroce, Leone, Iena 2 × 1 Q; Coccodrillo 3 × 2 Q) non entrano nel campo
// `spazio` (ammessi 1 Q, 2 × 2 Q, 3 × 3 Q): campo vuoto e ingombro del manuale nelle note, rimando ad A.167.
// Gli attacchi che non infliggono danni (Getto di seta del Ragno: applica Immobilizzato) sono capacità, non
// attacchi, perché il campo `danno` del formato vuole i dadi.
//
// Uso: node tools/genera_mostri_bestie.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.13 (16/10/2026), cap. 8 «Catalogo delle creature» — Bestie e predatori';

// Ciascuna bestia: valori già pronti dalla scheda del manuale.
const CREATURE = [
  {
    id: 'lupo', nome: 'Lupo',
    caratteristiche: { FOR: 4, DES: 6, COS: 5, INT: 2, SAG: 6, CAR: 2 },
    pv: 14, pm: 4, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 8, riflessi: 10, volonta: 7, magia: 7 },
    attacchi: [{ nome: 'Morso', tipo: 'ravvicinato', va: 10, danno: '1d6+1', natura: 'Naturale', portata_q: 1, ac: 1 }],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Furtività', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      { nome: 'Branco e sensi', effetto: 'Applica il +2 di Branco alle condizioni comuni. +2 a Percezione quando udito oppure olfatto sono determinanti, senza sommare i due sensi. Segue tracce con Sopravvivenza se esistono indizi accessibili; il fiuto non dà la posizione esatta oltre gli ostacoli. Non vede attraverso le pareti.' },
      { nome: 'Abbattere la preda', effetto: 'Una volta per Round, se un Morso infligge almeno 1 danno finale a una creatura con spazio non superiore a 1 × 1 Q, le impone Tempra con +2; fallimento o Maldestro applica A Terra. Non sposta la vittima, non aggiunge una presa, richiede un appoggio (chi vola o nuota senza appoggio non cade) e non agisce su chi è già A Terra. Non ignora armature né attiva Sanguinamento.', usi: { quanti: 1, per: 'Round' } },
    ],
    note: 'Può Schivare ed Elusione; nessuna Parata naturale. Condotta: cerca isolamento e vie di fuga, tende a ritirarsi sotto 4 PV, a Ferita Profonda o dopo la dispersione del branco.',
  },
  {
    id: 'lupo-feroce', nome: 'Lupo feroce',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 2, SAG: 6, CAR: 3 },
    pv: 26, pm: 6, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 10, corsa: 20, scatto: 30 },
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 10, riflessi: 11, volonta: 8, magia: 8 },
    attacchi: [{ nome: 'Morso', tipo: 'ravvicinato', va: 12, danno: '1d8+2', natura: 'Naturale', portata_q: 1, ac: 1 }],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Furtività', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Sopravvivenza', va: 12 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Branco e sensi', effetto: 'Applica Branco, con +2 VA condizionale. +2 a Percezione quando udito oppure olfatto sono determinanti, senza raddoppiare il bonus. Non possiede scurovisione o percezione magica.' },
      { nome: 'Abbattere la preda', effetto: 'Una volta per Round, un Morso che infligge almeno 1 danno finale può imporre Tempra senza modificatore proprio a una preda non superiore a 2 × 2 Q. Fallimento o Maldestro applica A Terra. Restano i limiti di appoggio, l’assenza di spostamento e le regole per rialzarsi del Lupo.', usi: { quanti: 1, per: 'Round' } },
    ],
    note: 'Una sola AzP obbliga a scegliere fra Morso e Difesa. Spazio sulla mappa 2 × 1 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167). Condotta: insegue una preda separata, evita un fronte compatto, cerca riparo sotto 7 PV o a Ferita Profonda. Non è una cavalcatura addestrata.',
  },
  {
    id: 'orso-bruno', nome: 'Orso bruno', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 4, COS: 7, INT: 2, SAG: 6, CAR: 3 },
    pv: 34, pm: 6, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 },
    salvezze: { tempra: 11, riflessi: 8, volonta: 8, magia: 8 },
    attacchi: [
      { nome: 'Artigli', tipo: 'ravvicinato', va: 12, danno: '1d8+2', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Morso', tipo: 'ravvicinato', va: 11, danno: '1d8+2', natura: 'Naturale', portata_q: 1, ac: 1 },
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza', effetto: 'Con le due AzP un attacco di Artigli e un Morso, al massimo uno di ciascuno per Round; ogni attacco si risolve a parte, con la propria Difesa e AR. Può conservare Azioni per Schivata. Gli Artigli non infliggono due colpi per l’uso di due zampe.' },
      { nome: 'Fiuto e arrampicata', effetto: '+2 a Percezione quando l’olfatto è determinante. Si arrampica fino a 4 Q per AzM su tronchi e superfici con appigli adatti al suo peso, con Atletica se la difficoltà lo richiede; non aderisce a soffitti o pareti lisce.' },
      { nome: 'Forza e anatomia', effetto: 'Gli arti anteriori sono Braccia anche da sollevato: esegue manovre fisicamente praticabili pagandone costi e penalità. Il Morso non crea una presa automatica e la zampata non atterra automaticamente. Pelliccia e massa non danno immunità al freddo o ai proiettili.' },
    ],
    note: 'Condotta: difende piccoli, spazio e cibo; sotto 9 PV o a Ferita Seria interrompe lo scontro se ha via libera, più ostinato a difesa dei piccoli. Non combatte fino alla morte per una regola automatica.',
  },
  {
    id: 'cinghiale-gigante', nome: 'Cinghiale gigante', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 4, COS: 8, INT: 2, SAG: 4, CAR: 2 },
    pv: 38, pm: 6, ar: { totale: 2, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 12, riflessi: 8, volonta: 9, magia: 8 },
    attacchi: [{ nome: 'Zanne', tipo: 'ravvicinato', va: 12, danno: '1d8+2', natura: 'Naturale', portata_q: 1, ac: 1 }],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 9 }, { nome: 'Sopravvivenza', va: 10 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Carica delle zanne', effetto: 'Usa la Carica del Giocatore §5.6 (1 AzM e 1 AzP, percorso rettilineo minimo 3 Q, fino alla Corsa, penalità e danno ×2). Se infligge almeno 1 danno finale a una creatura non superiore a 2 × 2 Q, questa effettua Tempra senza modificatore proprio; fallimento o Maldestro applica A Terra. Non con un attacco da fermo, non aggiunge i dadi da carica dell’originale, nessuna Carica Migliorata né secondo attacco. L’abbattimento richiede un appoggio, non sposta la vittima e non agisce su chi è già A Terra.' },
      { nome: 'Tenacia', effetto: 'Una volta per scena, prima di una PS Tempra per nuove Ferite mentre è già a 0 PV, ottiene +2 a quella PS se il danno è Naturale e non da Successo Magistrale. L’uso si consuma comunque. Non evita la Ferita minima, non recupera PV e non interrompe Morente. Una pausa nello stesso scontro non lo ripristina.', usi: { quanti: 1, per: 'Scena' } },
    ],
    note: 'Condotta: reagisce a una minaccia vicina o sfonda verso la fuga; sotto 10 PV o a Ferita Seria cerca una via di uscita. Non si scaglia contro muri invalicabili per la propria tenacia.',
  },
  {
    id: 'leone', nome: 'Leone',
    caratteristiche: { FOR: 7, DES: 7, COS: 6, INT: 2, SAG: 6, CAR: 3 },
    pv: 28, pm: 6, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 10, corsa: 20, scatto: 30 },
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 10, riflessi: 11, volonta: 9, magia: 9 },
    attacchi: [
      { nome: 'Artigli', tipo: 'ravvicinato', va: 12, danno: '1d6+2', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Morso', tipo: 'ravvicinato', va: 12, danno: '1d8+1', natura: 'Naturale', portata_q: 1, ac: 1 },
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Furtività', va: 13 }, { nome: 'Percezione', va: 11 }, { nome: 'Sopravvivenza', va: 12 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Branco e fiuto', effetto: 'Applica Branco e +2 a Percezione quando l’olfatto è determinante. Il terreno può permettere Furtività, ma non diventa invisibile nell’erba e non sorprende chi lo ha già individuato.' },
      { nome: 'Balzo predatorio', effetto: 'Una volta per Round, dopo almeno 4 Q di Passo rettilineo verso una preda non superiore a 2 × 2 Q, attacca con Artigli (AzP; danno non raddoppiato). Se infligge almeno 1 danno finale, la preda effettua Tempra senza modificatore: fallimento o Maldestro applica A Terra, e se cade proprio per questo il Leone ottiene subito una sola AzP vincolata a un Morso contro di lei. Una preda già A Terra non concede il Morso. Il percorso usa l’AzM. Non si combina con Carica, Corsa, Scatto o altre manovre. Senza appoggio niente A Terra né Morso aggiuntivo.', usi: { quanti: 1, per: 'Round' } },
      { nome: 'Salto', effetto: 'Con almeno 2 Q di rincorsa salta fino a 5 Q in orizzontale senza Prova in condizioni ordinarie, contando rincorsa e salto nel movimento; serve un atterraggio adatto. Ostacoli o circostanze difficili richiedono Atletica.' },
    ],
    note: 'Spazio sulla mappa 2 × 1 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167). Condotta: sotto 7 PV o a Ferita Profonda cerca riparo e sostegno, salvo minaccia immediata ai piccoli.',
  },
  {
    id: 'iena-gigante', nome: 'Iena gigante',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 2, SAG: 6, CAR: 2 },
    pv: 30, pm: 6, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 10, corsa: 20, scatto: 30 },
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 10, riflessi: 10, volonta: 8, magia: 8 },
    attacchi: [{ nome: 'Morso', tipo: 'ravvicinato', va: 11, danno: '1d8+2', natura: 'Naturale', portata_q: 1, ac: 1 }],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Sopravvivenza', va: 12 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Frenesia della caccia', effetto: 'Una volta per Round, se il proprio Morso alla propria Iniziativa rende un nemico Svenuto, Morente o Morto, ottiene subito una sola AzP vincolata a un Morso contro un altro nemico raggiungibile. Il solo passaggio a 0 PV non basta. Il Morso aggiuntivo non attiva una seconda Frenesia e non colpisce di nuovo la stessa vittima. Prima può usare il movimento ordinario rimasto; non riceve un’altra AzM, non interrompe Corsa o Scatto, non ignora gli Attacchi di Opportunità. L’AzP aggiuntiva scade a fine Iniziativa se inutilizzata.', usi: { quanti: 1, per: 'Round' } },
      { nome: 'Difese e gruppo', effetto: 'Non applica il bonus di Branco: il vantaggio del gruppo nasce da posizioni e numero. La propria AzP ordinaria resta necessaria per Schivare. Denti e mascelle non sono una Parata naturale e non infliggono Corrosivo o Sanguinamento automatici. Il riso e i richiami sono comunicazione, non un attacco che impone Terrorizzato.' },
    ],
    note: 'Spazio sulla mappa 2 × 1 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167). Condotta: segue una preda indebolita, contende carcasse; sotto 8 PV, a Ferita Profonda o separata dal gruppo interrompe l’inseguimento.',
  },
  {
    id: 'ragno-gigante', nome: 'Ragno gigante', taglia: 'grande',
    caratteristiche: { FOR: 6, DES: 7, COS: 5, INT: 1, SAG: 5, CAR: 1 },
    pv: 22, pm: 6, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 9, riflessi: 11, volonta: 8, magia: 9 },
    attacchi: [{ nome: 'Morso', tipo: 'ravvicinato', va: 11, danno: '1d6+1', natura: 'Naturale', portata_q: 1, ac: 1 }],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Armi da lancio', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Furtività', va: 13 }, { nome: 'Percezione', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Sensi e superfici', effetto: 'Scurovisione 12 Q. Entro 2 Q localizza una creatura in movimento tramite le vibrazioni del supporto continuo condiviso; non percepisce così chi vola, resta immobile o è isolato dal supporto, e non vede attraverso le pareti. Si muove su pareti e soffitti aderenti senza Atletica ordinaria (superfici scivolose o friabili richiedono Prova). Arrampicata 6 Q al Passo.' },
      { nome: 'Getto di seta', effetto: '1 AzP, nessun PM, Prova Armi da lancio 11 contro una creatura visibile non superiore a 2 × 2 Q entro 12 Q (da 11 Q: −2 per la distanza). Il bersaglio può Schivare con le Azioni richieste; la Parata non ferma il getto. Nessun danno, ignora l’AR: se riesce e non è evitato applica Immobilizzato (braccia e gambe legate). Dopo l’uso servono tre Round senza Getto (usato nel Round 1, torna nel Round 5). Le reti persistono finché rimosse. Nuove reti sulla stessa vittima non aggiungono penalità.', azioni: { principali: 1 } },
      { nome: 'Veleno aracnide naturale II', effetto: 'Il Morso che infligge almeno 1 danno finale a un vivente impone Tempra senza modificatore. Successo: dimezza per eccesso 1d4 danni da veleno, nessuna penalità. Fallimento o Maldestro: 1d4 danni (ignora AR, immediato, non si ripete) e Avvelenato con −2 alle Prove fisiche per 10 Round. A fine di ogni propria Iniziativa la vittima ripete Tempra: un successo termina la penalità. Cura Avvelenamenti (liv. 2) o un antidoto la rimuovono. Stesso veleno dell’Ettercap: nuove esposizioni rinnovano solo i 10 Round.' },
      { nome: 'Liberazione dalla seta', effetto: 'La vittima spende 1 AzP per Atletica con il −4 di Immobilizzato (consentita anche con gli arti legati); un successo la libera. Un alleato adiacente con una lama idonea spende 1 AzP per tagliare la rete senza tiro né danno al prigioniero. Un attacco da Fuoco che infligge almeno 1 danno alla tela la distrugge (la tela non ha AR né Difese), ma non spegne fiamme sul corpo. Negare Potere non dissolve questa materia biologica.' },
    ],
    note: 'Con una sola AzP sceglie fra Morso, Getto e Difesa. Condotta: preferisce catturare e attendere; sotto 6 PV o a Ferita Profonda abbandona la preda e si ritira lungo la rete.',
  },
  {
    id: 'scorpione-gigante', nome: 'Scorpione gigante', taglia: 'grande',
    caratteristiche: { FOR: 7, DES: 5, COS: 7, INT: 1, SAG: 5, CAR: 1 },
    pv: 42, pm: 8, ar: { totale: 4, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 },
    salvezze: { tempra: 12, riflessi: 9, volonta: 8, magia: 10 },
    attacchi: [
      { nome: 'Chela', tipo: 'ravvicinato', va: 12, danno: '1d6+1', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Pungiglione', tipo: 'ravvicinato', va: 12, danno: '1d6+1', natura: 'Naturale', portata_q: 1, ac: 1 },
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza', effetto: 'Due AzP, non i tre attacchi simultanei dell’originale: una volta con ciascuna chela libera, oppure una chela e il Pungiglione. Massimo un Pungiglione per Round. Difese e altre attività consumano le stesse Azioni.' },
      { nome: 'Presa con le chele', effetto: 'Al posto del danno di una Chela: Presa naturale con Corpo a corpo 12 contro una preda non superiore a 1 × 1 Q. Ogni chela trattiene una sola vittima e, mentre occupata, non attacca altri. La presa blocca le gambe; mani e braccia restano con il −4 di Immobilizzato. Nessun danno iniziale. Con 1 AzP e una nuova opposizione stringe per 1d6+1 Naturale (AR normale); il fallimento non scioglie la presa.' },
      { nome: 'Veleno del pungiglione (Pericolosità III, Profonda)', effetto: 'Se il Pungiglione infligge almeno 1 danno finale a un vivente, applica il veleno: Tempra con −2. Tre applicazioni di 1d4 danni (una immediata e una all’Iniziativa dello Scorpione nei due Round successivi), ciascuna ignora AR e non concede Difese. Un successo iniziale dimezza per eccesso ognuna; non si ripete Tempra. Avvelenato termina dopo l’ultima applicazione. Nuove esposizioni rinnovano solo le due applicazioni future; più Scorpioni non sommano il veleno (una sola sequenza). Cura Avvelenamenti (liv. 3) o un antidoto terminano il veleno e le applicazioni dovute.' },
      { nome: 'Percezione per vibrazioni', effetto: 'Il carapace non rende immune ai veleni. Percepisce tramite vibrazioni le creature in movimento entro 6 Q sul medesimo supporto continuo: sostituisce la vista per localizzarle, senza attraversare muri né riconoscere chi resta immobile.' },
      { nome: 'Trascinare una preda', effetto: 'Trattenere non dà spostamenti gratuiti. Per trascinare una vittima riluttante spende 1 AzP e l’AzM intera, vince una nuova opposizione della Presa, poi muove al massimo 2 Q al Passo. Una sola vittima alla volta; deve liberare l’altra chela e avere spazio per entrambi. Il fallimento consuma le Azioni senza spostare. Prima di un pericolo letale la vittima effettua la normale PS Riflessi.' },
    ],
    note: 'Condotta: cerca contatto e trattiene una preda minacciando gli altri con la coda; sotto 11 PV o a Ferita Seria cerca un riparo.',
  },
  {
    id: 'serpente-costrittore-gigante', nome: 'Serpente costrittore gigante', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 5, COS: 8, INT: 1, SAG: 5, CAR: 2 },
    pv: 48, pm: 8, ar: { totale: 2, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 },
    salvezze: { tempra: 12, riflessi: 9, volonta: 9, magia: 10 },
    attacchi: [
      { nome: 'Morso', tipo: 'ravvicinato', va: 13, danno: '1d8+3', natura: 'Naturale', portata_q: 2, ac: 1 },
      { nome: 'Costrizione', tipo: 'ravvicinato', va: 13, danno: '1d8+3', natura: 'Naturale', portata_q: 1, ac: 1, note: 'Applica anche la presa: vedi la capacità «Costrizione».' },
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      { nome: 'Costrizione', effetto: '1 AzP e una Prova contrapposta di Presa naturale contro una preda non superiore a 2 × 2 Q. Se riesce applica Immobilizzato e infligge una volta 1d8+3 Naturale (AR normale). Le spire bloccano tronco e arti inferiori; braccia e mani restano con il −4 fisico. Trattiene una sola preda; non è un Morso seguito da presa gratuita.' },
      { nome: 'Compressione successiva', effetto: 'Mantenere la presa non causa danno. Con 1 AzP una nuova opposizione di Corpo a corpo 13 contro Corpo a corpo o Atletica della vittima: successo 1d8+3 Naturale, fallimento nessun danno senza perdere la presa. Danno di Costrizione una sola volta per Round (compresa la presa iniziale) e al massimo un Morso per Round.' },
      { nome: 'Mobilità e sensi', effetto: 'Percepisce per vibrazioni una creatura in movimento entro 2 Q sul medesimo supporto continuo; non vede attraverso le pareti. Nuoto 6 / 12 / 18 Q, ma respira aria (riserva di fiato su COS, §5.23); nessuna immunità al soffocamento. Non può usare Corsa, Scatto o Carica mantenendo la Costrizione; per trascinare la vittima spende 1 AzP e l’AzM intera e vince una nuova opposizione (fino a 2 Q al Passo, a terra o a nuoto), senza infliggere anche il danno di Costrizione.' },
    ],
    note: 'Morso con portata 2 Q. Liberazione con le regole comuni delle Prese naturali; colpirlo non libera, salvo Svenuto/Morente o perdita funzionale delle spire. Condotta: attende presso vegetazione o passaggi stretti; sotto 12 PV o a Ferita Seria può rilasciare e fuggire.',
  },
  {
    id: 'coccodrillo-gigante', nome: 'Coccodrillo gigante', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 4, COS: 8, INT: 2, SAG: 5, CAR: 2 },
    pv: 62, pm: 8, ar: { totale: 4, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 },
    azioni: { principali: 2, movimento: 1 },
    salvezze: { tempra: 13, riflessi: 8, volonta: 10, magia: 10 },
    attacchi: [
      { nome: 'Morso', tipo: 'ravvicinato', va: 14, danno: '2d6+2', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Coda', tipo: 'ravvicinato', va: 13, danno: '1d8+2', natura: 'Naturale', portata_q: 2, ac: 1 },
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza', effetto: 'Nelle AzP al massimo un’azione di mascelle e un attacco di Coda per Round. Una presa o stretta occupa l’azione di mascelle. Il bersaglio della Coda deve essere diverso dalla preda trattenuta. Le due AzP possono servire anche per Difese.' },
      { nome: 'Presa delle mascelle', effetto: 'Al posto del Morso: Presa naturale, Corpo a corpo 14 contro Corpo a corpo o Atletica, su una preda non superiore a 2 × 2 Q. Se riesce applica Immobilizzato e infligge 1d10+2 Naturale (AR normale). Trattiene una sola preda (corpo e gambe bloccati, mani con il −4 fisico); non può mordere un altro bersaglio mentre tiene. Una stretta successiva: 1 AzP e nuova opposizione, successo 1d10+2 Naturale, fallimento nessun danno e conserva la presa.' },
      { nome: 'Spazzata di coda', effetto: 'La Coda che infligge almeno 1 danno finale a una creatura non superiore a 2 × 2 Q impone Tempra senza modificatore; fallimento o Maldestro applica A Terra. Richiede un appoggio, senza spostamento o effetto su chi è già A Terra.' },
      { nome: 'Anfibio', effetto: 'Nuoto 10 / 20 / 30 Q. Apnea 30 minuti (sostituisce i Round pari a COS, senza respirazione acquatica); esaurita, PS, perdita di coscienza e danni del §5.23, un Round d’aria la ripristina. +2 a Furtività nell’acqua con riparo (Furtività 13). Per trascinare una preda riluttante mentre tiene (niente Corsa/Scatto/Carica): 1 AzP e l’AzM intera, nuova opposizione, poi fino a 2 Q a terra o 4 Q a nuoto; percorso misto con budget 4 (1 Q a terra = 2, 1 Q a nuoto = 1). Prima di un pericolo letale la vittima effettua la normale PS Riflessi.' },
    ],
    note: 'Spazio sulla mappa 3 × 2 Q (dal manuale): pedine quadrate nell’app (A.167). Condotta: sfrutta occultamento e sponde senza sorpresa automatica; sotto 16 PV o a Ferita Seria rilascia la preda e cerca acqua profonda.',
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
    azioni: c.azioni,
    attacchi: c.attacchi,
    abilita: c.abilita,
    capacita: c.capacita,
    note: c.note,
  };
}

const base = new URL('../esempi/nemici/mostri/', import.meta.url);
let scritti = 0;
for (const c of CREATURE) {
  await writeFile(new URL(`${c.id}.json`, base), `${JSON.stringify(profilo(c), null, 2)}\n`);
  scritti += 1;
}
console.log(`${scritti} profili del blocco «Bestie e predatori» scritti in esempi/nemici/mostri/`);
