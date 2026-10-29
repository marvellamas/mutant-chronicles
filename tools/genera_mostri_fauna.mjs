// Blocco «Fauna delle terre aperte» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci animali prestabiliti in
// esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti; niente valori inventati.
// GS/PX informativo (A.161). Tutti 1 × 1 Q (A.126); nessuna Taglia (A.167, 18/10). Ultimo blocco del catalogo (215 creature).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - Branco (Babbuino, Iena, Avvoltoio, Sciacallo): capacità passiva con il VA già calcolato nel testo, non nel campo.
//  - Fiuto, Vista acuta e Udito e fiuto: capacità con il +2 a Percezione e il VA risultante nel testo.
//  - Carica del Cinghiale (Giocatore §5.6) e Abbattimento: capacità; Tenacia: una volta per scena (`usi`).
//  - arrampicata, scavo e volo come capacità; Tasso e Falco: la pedina 1 × 1 Q non è la larghezza reale (nota).
//
// Uso: node tools/genera_mostri_fauna.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Fauna delle terre aperte';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const VITA = { nome: 'Animale', effetto: 'Vivente, respira aria, ha mente e PM personali (senza incantesimi o spese di PM); veleni, malattie, cure, alimentazione e riposo seguono le regole ordinarie. Nessuna dotazione; colore della pelliccia, penne e zanne non danno protezioni diverse dall’AR indicata. A 0 PV non Svenuto né morto automaticamente: un nuovo danno finale positivo a 0 PV richiede Tempra e le normali Ferite (l’eccedenza del colpo che esaurisce i PV non genera da sola una Ferita); a 0 PM personali Svenuto dopo la risoluzione completa dell’azione; la volontà di fuggire non annulla impedimenti, Ferite o Morente. INI si somma a 1d10; AzP e unica AzM valgono per il Round; ogni attacco costa 1 AzP, produce AC 1 e usa il danno completo della tabella; i limiti offensivi comprendono Opportunità e attacchi ordinati; l’unica Opportunità ordinaria per Round usa un attacco normale (niente Carica o effetti che richiedono movimento). Nessuna Parata naturale; Schivata 1 AzP e 1 AzM (anche in volo) con consapevolezza e spazio; chi ha una sola AzP e la spende per difendersi non può poi attaccare nello stesso Round. Naturale e Magico incontrano l’AR pertinente, Etereo solo quella magica; nessuna AR magica né immunità elementali. Un senso acuto dà +2 a Percezione quando il senso dichiarato è determinante (una sola volta per Prova). Non comprende linguaggi (salvo singoli segnali appresi con l’addestramento); gestirlo richiede Sopravvivenza quando c’è incertezza; cibo o una Prova riuscita non danno controllo mentale, domestichezza immediata o un comando suicida. Morso e contatto non trasmettono automaticamente malattie. Testa e Torace = capo e tronco; nei quadrupedi Braccia = arti anteriori, Gambe = posteriori (nei rapaci Braccia = ali). Si attraversa solo un varco compatibile con il corpo reale; le soglie di carico seguono FOR e Giocatore §5.2.6 con anatomia e presa concreta. Andature con costi, Prove ed esiti del Giocatore §§5.2.1–5.2.4 (Corsa Atletica 0, Scatto −2; in volo −2 e −4; penalità personali alle altre Azioni −2 in Corsa e −6 in Scatto); percorsi misti con un’unica AzM e un unico budget.' };
const BRANCO = (nome, va, base, extra = '') => ({ nome: 'Branco', passiva: true, effetto: `Il ${nome} usa VA ${va} anziché ${base} se un alleato cosciente e capace di attaccare minaccia la vittima da entro 1 Q (più alleati non aumentano il bonus; nessun beneficio a Difese, danni o PS; un compagno Stordito o completamente bloccato non basta). ${extra}`.trim() });
const VOLO = { nome: 'Ali e quota', effetto: 'Ali reali: decollo, salita, discesa e atterraggio consumano movimento; serve spazio per batterle; nessuna sospensione immobile né Passaggio in volo. Uscire volontariamente da una portata nemica (anche salendo) può provocare Opportunità. Se perde il sostegno (per esempio Svenuto) si applica Caduta; A Terra da solo non abbatte un volatore senza appoggio (§5.2.5). Può afferrare un oggetto o una piccola preda solo con anatomia, peso e accesso compatibili, con manovra e Azioni necessarie; colpire con gli Artigli non basta per sollevare qualcuno.' };
const ARRAMPICATA = (extra = '') => ({ nome: 'Arrampicata', effetto: `Con la propria AzM percorre fino a 6 Q al Passo su appigli adatti, senza Prova in condizioni ordinarie; superfici precarie o altre difficoltà concrete richiedono la Prova pertinente. Non aderisce a soffitti o pareti lisce e non ottiene un secondo budget passando da terra a un tronco. ${extra}`.trim() });

const CREATURE = [
  {
    id: 'babbuino', nome: 'Babbuino',
    caratteristiche: { FOR: 3, DES: 7, COS: 5, INT: 2, SAG: 6, CAR: 3 },
    pv: 6, pm: 4, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 11, volonta: 7, magia: 7 },
    attacchi: [r('Morso', 8, '1d4', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 10 }, { nome: 'Sopravvivenza', va: 9 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VITA, BRANCO('Morso', 10, 8, 'Un solo Morso per Round, Opportunità e attacco ordinato compresi. Grida, gesti e denti esposti non impongono Terrorizzato né danno un attacco aggiuntivo.'),
      ARRAMPICATA('Superfici precarie possono richiedere Atletica 11.'),
      { nome: 'Prensione', effetto: 'Può afferrare cibo o un oggetto accessibile e trasportabile con le Azioni ordinarie; gli arti anteriori mantengono la funzione prensile. Nessuna Abilità d’arma, comprensione di dispositivi complessi o attivazione automatica di un Artefatto. Manipolare con un arto occupato può impedire un appiglio necessario.' },
    ],
    note: 'Primate sociale vigile che cerca cibo in gruppo e sorveglia gli accessi. Non ha Scurovisione innata. Condotta: tende a difendere gruppo e piccoli cercando rumore, distanza e una via sui rami; sotto 2 PV o a Ferita Importante tende a disimpegnarsi; un branco non diventa uno Sciame. Fonte: Baboon, p. 318.',
  },
  {
    id: 'tasso', nome: 'Tasso',
    caratteristiche: { FOR: 2, DES: 5, COS: 6, INT: 2, SAG: 6, CAR: 3 },
    pv: 6, pm: 3, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 7, magia: 7 },
    attacchi: [r('Morso', 7, '1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 7 }, { nome: 'Atletica', va: 8 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 11 }, { nome: 'Sopravvivenza', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VITA,
      { nome: 'Scavare', azioni: { movimento: 1 }, effetto: 'Spende la propria AzM per avanzare fino a 1 Q al Passo in terra sufficientemente tenera, lasciando un cunicolo adatto al proprio corpo; non corre né scatta scavando. Radici fitte, terreno instabile o altri ostacoli superabili richiedono una Prova pertinente; roccia, calcestruzzo e metallo restano impraticabili. Lo scavo non danneggia muri o fondamenta e non nasconde automaticamente il Tasso. Entrare in un cunicolo aperto richiede che il corpo vi passi (una persona non può seguirlo perché le pedine occupano 1 Q); il terreno frapposto impedisce vista e attacchi non praticabili.' },
      { nome: 'Sensi', effetto: 'Scurovisione 6 Q e +2 a Percezione quando l’olfatto è determinante (VA 12 prima degli altri modificatori). Non riceve Senso Tellurico e non localizza ogni creatura che cammina sopra la tana.' },
    ],
    note: 'La pedina tattica 1 × 1 Q non rappresenta la larghezza reale. Un solo Morso per Round, Opportunità compresa (le zampe da scavo non sono un secondo attacco). Non applica Branco, veleno o Tenacia del Cinghiale. Condotta: cerca copertura o la tana; sotto 2 PV o a Ferita Importante tende a fuggire. Fonte: Badger, p. 318.',
  },
  {
    id: 'orso-nero', nome: 'Orso nero',
    caratteristiche: { FOR: 6, DES: 5, COS: 6, INT: 2, SAG: 6, CAR: 3 },
    pv: 24, pm: 5, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 8, magia: 8 },
    attacchi: [r('Artigli', 11, '1d6+2', 1, { proprieta: ['Taglio'] }), r('Morso', 10, '1d6+1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Sopravvivenza', va: 11 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      VITA,
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Artigli e un Morso per Round, ciascuno con 1 AzP; Opportunità e attacchi ordinati rientrano in questi limiti. Può conservare una AzP per difendersi. Le due zampe non generano due applicazioni di danno e non può sostituire il Morso con un secondo attacco di Artigli. Morso e Artigli non impongono una presa automatica.' },
      { nome: 'Fiuto', effetto: '+2 a Percezione quando l’olfatto è determinante (VA 13 prima degli altri modificatori). Nessuna Scurovisione innata. Il cibo nascosto può lasciare un odore, ma un contenitore chiuso non diventa individuabile o apribile automaticamente.' },
      ARRAMPICATA('Sollevarsi sulle zampe posteriori non cambia spazio, riserve o localizzazioni.'),
    ],
    note: 'Orso di taglia media, più piccolo del Bruno già nel catalogo. Pelliccia e massa non aggiungono resistenze al freddo, alle armi da fuoco o agli Stati. Condotta: può difendere piccoli o cibo e cercare distanza quando gli viene lasciata una via libera; sotto 6 PV o a Ferita Profonda tende a ritirarsi. Fonte: Black Bear, p. 318.',
  },
  {
    id: 'cinghiale', nome: 'Cinghiale',
    caratteristiche: { FOR: 5, DES: 5, COS: 6, INT: 2, SAG: 4, CAR: 3 },
    pv: 18, pm: 4, ar: { totale: 1, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 8, magia: 7 },
    attacchi: [r('Zanne', 10, '1d6+1', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 9 }, { nome: 'Sopravvivenza', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      VITA,
      { nome: 'Carica delle zanne', azioni: { principali: 1, movimento: 1 }, effetto: 'Carica ordinaria del Giocatore §5.6: almeno 3 Q rettilinei effettivi, fino alla Corsa. Danno normale ×2, oppure ×3 con un Magistrale, senza i dadi da slancio della fonte. Prova di movimento se occorre Corsa; penalità della Carica: personali −2 VA con 3–6 Q, −4 da 7 Q; per colpirlo rispettivamente −4 e −6 VA, fino all’Iniziativa successiva. Un attacco di Zanne per Round, normale oppure in Carica, Opportunità comprese; nessun movimento o secondo attacco gratuito.' },
      { nome: 'Abbattimento', prova: 'PS di Tempra senza modificatore', effetto: 'Se le Zanne in Carica infliggono almeno 1 danno finale a una creatura con spazio fino a 1 × 1 Q: Tempra senza modificatore; fallimento o Maldestro applica A Terra. Occorre un appoggio; non sposta la vittima; chi è già A Terra non ripete la PS. Un colpo da fermo o un’Opportunità non lo attivano.' },
      { nome: 'Tenacia', usi: { quanti: 1, per: 'Scena' }, effetto: 'Prima di effettuare Tempra per nuove Ferite mentre è già a 0 PV, può ottenere +2 a quella PS se il danno è Naturale e non deriva da un Successo Magistrale. L’uso si consuma qualunque sia l’esito; non evita la Ferita minima, non recupera PV e non annulla Morente; una pausa nello stesso scontro non lo ripristina.' },
    ],
    note: 'Ungulato robusto che può caricare per allontanare una minaccia o aprire una via di uscita; usa le stesse procedure di Carica e Ferite del Cinghiale gigante, con valori inferiori. Nessuna Scurovisione o capacità sensoriale speciale. Condotta: sotto 5 PV o a Ferita Profonda cerca di allontanarsi; può caricare verso un varco. Fonte: Boar, p. 319.',
  },
  {
    id: 'cervo', nome: 'Cervo',
    caratteristiche: { FOR: 4, DES: 8, COS: 5, INT: 2, SAG: 7, CAR: 3 },
    pv: 8, pm: 4, ar: { totale: 0, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 12, volonta: 7, magia: 8 },
    attacchi: [r('Morso', 7, '1d4', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 7 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VITA,
      { nome: 'Attacco e fuga', effetto: 'Un solo Morso per Round, Opportunità compresa; palchi, zoccoli e slancio non aggiungono un attacco, una Carica speciale o un abbattimento (una variante con capacità differenti richiede una scheda esplicita). Può usare le andature ordinarie e, se conserva AzP e AzM, Ritirata o Movimento Evasivo; Corsa e Scatto richiedono le normali Prove (il VA di Atletica non concede una fuga riuscita automatica). Serve un percorso realmente praticabile per il corpo; non attraversa recinzioni o ostacoli senza superarli.' },
      { nome: 'Sensi', effetto: 'Vista e udito ordinari, senza Scurovisione o bonus sensoriale innato. Riconoscere una minaccia nascosta richiede Percezione contro Furtività quando pertinente.' },
    ],
    note: 'Ungulato rapido pronto a prendere distanza da una minaccia; il profilo mantiene il Morso dell’originale. La rapidità non lo rende una cavalcatura utilizzabile. Condotta: tende a fuggire quando la minaccia si avvicina e a mantenere un passaggio verso il gruppo; sotto 2 PV o a Ferita Importante evita di prolungare il contatto. Fonte: Deer, p. 321.',
  },
  {
    id: 'aquila', nome: 'Aquila',
    caratteristiche: { FOR: 3, DES: 7, COS: 5, INT: 2, SAG: 7, CAR: 3 },
    pv: 6, pm: 4, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 11, volonta: 7, magia: 8 },
    attacchi: [r('Artigli', 10, '1d4+1', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 10 }, { nome: 'Sopravvivenza', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VITA, VOLO,
      { nome: 'Vista acuta', effetto: '+2 a Percezione quando la vista è determinante (VA 14 prima degli altri modificatori). Nessuna Scurovisione innata. Osservare da quota non consente di vedere oltre coperture opache né di leggere dettagli troppo lontani.' },
      { nome: 'Artigli', effetto: 'Un solo attacco di Artigli per Round, Opportunità e attacco ordinato compresi; nessuna Beccata, danno da picchiata o presa automatica. Decollare e allontanarsi dopo il colpo usa solo il movimento ancora disponibile, con le normali Opportunità; le ali non sono una Parata naturale. Non può attaccare con un mezzo impegnato a trattenere un carico incompatibile.' },
    ],
    note: 'Rapace che caccia prede compatibili con le proprie dimensioni e difende nido o posatoio; a differenza dell’Aquila gigante non parla né comprende linguaggi. Condotta: evita di atterrare tra avversari troppo numerosi; sotto 2 PV o a Ferita Importante cerca un posatoio sicuro se le ali funzionano; un eventuale addestramento consente solo i segnali e i compiti appresi. Fonte: Eagle, p. 322.',
  },
  {
    id: 'falco', nome: 'Falco',
    caratteristiche: { FOR: 2, DES: 8, COS: 4, INT: 2, SAG: 7, CAR: 3 },
    pv: 3, pm: 3, ar: { totale: 0, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 7, riflessi: 12, volonta: 7, magia: 8 },
    attacchi: [r('Artigli', 9, '1', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 12 }, { nome: 'Sopravvivenza', va: 9 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VITA, VOLO,
      { nome: 'Vista acuta', effetto: '+2 a Percezione quando la vista è determinante (VA 14 prima degli altri modificatori). Nessuna Scurovisione innata o vista attraverso ostacoli; luce e accessibilità del dettaglio restano pertinenti.' },
      { nome: 'Attacco e segnali', effetto: 'Un attacco di Artigli per Round, Opportunità compresa. La piccola taglia non concede Colpo Mirato agli occhi, Accecato o un attacco contro un organo esposto (le manovre mantengono costi e penalità). Nessun Branco, Passaggio in volo o danno da picchiata. Un Falco addestrato risponde a richiami e svolge compiti compatibili con l’addestramento, senza comprendere una conversazione né riferire a parole ciò che ha visto; non condivide i sensi con un padrone né fornisce una visuale a distanza.' },
    ],
    note: 'La pedina tattica 1 × 1 Q non rappresenta la larghezza reale; gli oggetti trasportabili devono essere compatibili con artigli, becco e carico. Piccolo rapace distinto dal Falco sanguinario della fonte. Condotta: preferisce quota e posatoi e tende ad abbandonare il contatto quando ferito, già da Ferita Superficiale, se ha percorso e funzione alare utilizzabili. Fonte: Hawk, p. 330.',
  },
  {
    id: 'iena', nome: 'Iena',
    caratteristiche: { FOR: 4, DES: 6, COS: 5, INT: 2, SAG: 6, CAR: 3 },
    pv: 10, pm: 4, ar: { totale: 0, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 7, magia: 7 },
    attacchi: [r('Morso', 9, '1d6', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VITA, BRANCO('Morso', 11, 9, 'Il beneficio non aumenta i danni e non si moltiplica con il numero dei compagni. Un solo Morso per Round, Opportunità e attacco ordinato compresi.'),
      { nome: 'Caccia e richiami', effetto: 'Andature e Prove di Atletica ordinarie. Il Morso non impone automaticamente A Terra, Sanguinamento o una presa; rendere una preda Svenuta o Morente non concede un altro attacco o Movimento (appartiene alla Iena gigante, di cui non ha la Frenesia della caccia). Percezione 11 senza senso acuto o Scurovisione innata. Il riso e gli altri richiami possono avvertire compagni in grado di udirli, ma non comunicano informazioni precise illimitate né impongono Terrorizzato.' },
    ],
    note: 'Predatore opportunista che cerca cibo in gruppo e approfitta di una vittima isolata. Condotta: può cacciare, contendersi una carcassa o seguire un gruppo a distanza; sotto 3 PV, a Ferita Importante o se isolata tende a interrompere il contatto; la presenza di Gnoll non la rende un loro servitore. Fonte: Hyena, p. 331.',
  },
  {
    id: 'avvoltoio', nome: 'Avvoltoio',
    caratteristiche: { FOR: 3, DES: 5, COS: 6, INT: 2, SAG: 6, CAR: 2 },
    pv: 8, pm: 3, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 10 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 6, magia: 7 },
    attacchi: [r('Becco', 8, '1d4', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 7 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VITA, VOLO,
      { nome: 'Vista e fiuto', effetto: '+2 a Percezione quando vista oppure olfatto sono determinanti (VA 13 prima degli altri modificatori; una sola volta anche se entrambi aiutano). Nessuna Scurovisione innata. Non percepisce tutti i morenti a distanza illimitata né vede attraverso il terreno.' },
      BRANCO('Becco', 10, 8, 'Un solo attacco di Becco per Round, Opportunità compresa; gli Artigli non sono un secondo mezzo offensivo previsto da questa scheda.'),
      { nome: 'Alimentazione', effetto: 'Alimentarsi di carcasse non gli dà immunità generale a veleni, malattie o Corruzione; nessun Morso infetto nel profilo. Distinto dall’Avvoltoio gigante (altri attacchi e comprensione linguistica).' },
    ],
    note: 'Necrofago alato che cerca carcasse e reagisce se intrappolato o minacciato. Condotta: può attendere una carcassa accessibile o lasciare il posto a una minaccia più grande; sotto 2 PV o a Ferita Importante cerca quota e un posatoio sicuro. Fonte: Vulture, p. 339.',
  },
  {
    id: 'sciacallo', nome: 'Sciacallo',
    caratteristiche: { FOR: 3, DES: 7, COS: 5, INT: 2, SAG: 6, CAR: 3 },
    pv: 6, pm: 4, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 11, volonta: 7, magia: 7 },
    attacchi: [r('Morso', 8, '1d4', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 11 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VITA, BRANCO('Morso', 10, 8, 'Un solo Morso per Round, Opportunità e attacco ordinato compresi. Il Morso non impone automaticamente A Terra, veleno, malattie o una presa.'),
      { nome: 'Udito e fiuto', effetto: '+2 a Percezione quando udito oppure olfatto sono determinanti (VA 13 prima degli altri modificatori; i due sensi non si sommano). Nessuna Scurovisione innata, ecolocalizzazione o localizzazione precisa attraverso ostacoli.' },
      { nome: 'Piste e accessi', effetto: 'Può seguire indizi accessibili con Sopravvivenza 11 quando occorre una Prova. Un odore non apre una chiusura e una fessura deve essere adatta al corpo reale. Nessun movimento speciale di scavo o arrampicata.' },
    ],
    note: 'Piccolo canide che cerca piccole prede e resti alimentari ai margini di un territorio frequentato. Distinto dallo Sciacallo mannaro: nessuna trasformazione o influenza soprannaturale. Condotta: evita il confronto diretto con avversari grandi e vigili; sotto 2 PV, a Ferita Importante o dopo la dispersione del gruppo tende a ritirarsi. Fonte: Jackal, p. 331.',
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
console.log(`${scritti} profili del blocco «Fauna delle terre aperte» scritti in esempi/nemici/mostri/`);
