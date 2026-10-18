// Blocco «Creature alate e piccoli predatori» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti;
// niente valori inventati. GS/PX informativo (A.161). Spazio dal campo `spazio` (A.126, A.167).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - volo: `movimento.volo` = Passo di volo (la terna 16 / 32 / 48 del manuale è Passo / Corsa / Scatto); Corsa e
//    Scatto in volo con Atletica −2 e −4 sono nella capacità «Ali e volo» comune a tutte le creature alate.
//  - veleni minori (Vespa, Centopiedi, i due Serpenti, Ragno lupo): l'attacco porta «poi veleno» nella nota e la
//    tossina è una capacità «Veleno …» con Tempra senza modificatore, danno interno, durata e regole della pagina comune.
//  - ecolocalizzazione, percezione di prossimità e luce biologica: capacità.
//  - arrampicata e nuoto: capacità (Centopiedi, Ragno lupo; Serpenti).
//
// Uso: node tools/genera_mostri_alate.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Creature alate e piccoli predatori';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const scuro = (q) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa solidi, torbidità o fumo.` });
const VIVENTE = { nome: 'Natura e risorse', effetto: 'Natura Comune, organismo vivente con mente e PM personali (a 0 PM Svenuto); nessun incantesimo appreso o potere magico innato. A 0 PV valgono Tempra, Ferite, Menomazioni e Morente, senza morte o incoscienza automatica; le cure biologiche si applicano. Nessuna Parata naturale. Una sola Opportunità ordinaria gratuita per Round, su un’occasione concreta e nei limiti offensivi della voce. Respira aria (COS Round di fiato). Le capacità non garantiscono Sorpresa o ostilità al primo avvistamento.' };
const ALI = { nome: 'Ali e volo', effetto: 'In volo Corsa e Scatto richiedono Atletica rispettivamente a −2 e −4 (esiti e altre penalità: Giocatore §5.2). Una sola AzM comprende decollo, dislivello, tragitto e atterraggio; nei percorsi misti vale il budget unico del §5.2.4. Nessun volo stazionario in questa conversione (salvo la Vespa); servono spazio per le ali e una traiettoria libera. Svenuto o perdita della funzione alare possono causare Caduta; l’effetto A Terra da solo non abbatte chi vola senza appoggio (§5.2.5). Trasportare qualcuno richiede presa reale, Azioni e capacità di carico. Braccia = ali; Gambe = arti posteriori; una Menomazione dell’ala si applica al Volo.' };
const VELENO_COMUNE = 'Origine naturale, Pericolosità II, Importante, Tempra senza modificatore. Si inocula solo dopo almeno 1 danno fisico finale a un vivente (non attraversa una protezione che ha assorbito l’intero danno fisico); prima si risolvono attacco, Difesa, AR, PV e Ferite, poi la tossina. Non costa PM o AzP oltre all’attacco. Fallimento: danno tossico immediato (ignora l’AR) e −2 ai VA delle azioni fisiche per la durata indicata; successo: metà per eccesso del solo danno tossico e nessuna penalità. A fine di ogni propria Iniziativa la vittima ripete gratis Tempra senza modificatore: successo termina la penalità; il danno non si ripete. Scadenza a fine Round R + N. Se la stessa tossina è già attiva, una nuova inoculazione rinnova solo la durata (nessuna PS iniziale né altro danno tossico); tossine diverse coesistono. Il Magistrale raddoppia solo il danno fisico. Un antidoto adeguato o Cura Avvelenamenti dal livello 2 la neutralizza; Cura Spirituale no. A 0 PV non dà paralisi, Svenuto o stabilizzazione. Nessuna dose commerciale recuperabile dal cadavere.';
const veleno = (nome, danno, round, extra = '') => ({ nome, effetto: `${extra}Danno tossico ${danno} Naturale interno; fallimento: Avvelenato (−2 ai VA fisici) per ${round} Round. ${VELENO_COMUNE}` });
const corpoStrisc = (testa) => `Testa = ${testa}; Torace = corpo; Braccia e Gambe = gruppi di zampe (o porzioni) anteriori e posteriori che sostengono la locomozione.`;

const CREATURE = [
  {
    id: 'aquila-gigante', nome: 'Aquila gigante',
    caratteristiche: { FOR: 8, DES: 7, COS: 6, INT: 4, SAG: 7, CAR: 5 },
    pv: 28, pm: 8, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 16 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 11, volonta: 10, magia: 10 },
    attacchi: [r('Becco', 12, '1d6+2', 1, { proprieta: ['Perforazione'] }), r('Artigli', 12, '1d8+2', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      VIVENTE, ALI,
      { nome: 'Sequenza', effetto: 'Al massimo una Beccata e un attacco di Artigli per Round, 1 AzP ciascuno, Opportunità comprese. I due artigli non producono due applicazioni di danno nello stesso colpo. Può conservare un’Azione per Difesa invece di completare la sequenza.' },
      { nome: 'Vista e parola', effetto: 'Vista acuta +2 (+2 a Percezione quando la vista è determinante); nessuna Scurovisione innata. Parla il linguaggio delle Aquile giganti e comprende altre due lingue assegnate alla comunità o all’origine (comprenderle non le dà la capacità di pronunciarle). Può valutare una richiesta, senza obbligo di aiutare o attaccare.' },
      { nome: 'Volo e artigli', effetto: 'Non ha Passaggio in volo: lasciare una portata nemica può provocare Opportunità. Un attacco riuscito di Artigli non solleva o trasporta la vittima: occorrono manovra prensile praticabile e i normali limiti di carico; le Azioni impegnate nella presa non restano disponibili per attacchi incompatibili.' },
    ],
    note: 'Difende piccoli e posatoi, può indicare una direzione o chiedere agli intrusi di allontanarsi. Condotta: sotto 7 PV o a Ferita Profonda tende a cercare quota e un riparo; un accesso troppo stretto può impedirle di raggiungere la preda. Fonte: Giant Eagle, p. 324.',
  },
  {
    id: 'gufo-gigante', nome: 'Gufo gigante',
    caratteristiche: { FOR: 6, DES: 7, COS: 6, INT: 4, SAG: 7, CAR: 5 },
    pv: 22, pm: 8, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 1, corsa: 2, scatto: 3, volo: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 11, volonta: 10, magia: 10 },
    attacchi: [r('Artigli', 11, '1d8+1', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 14 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      VIVENTE, ALI, scuro(24),
      { nome: 'Passaggio in volo', effetto: 'Non provoca Opportunità quando abbandona la portata di un nemico con il proprio Volo. L’eccezione riguarda solo quell’uscita in volo: non rende gratuiti attacchi, tragitti a terra o altre attività rischiose. Può dividere il Passo prima e dopo l’attacco entro la distanza complessiva disponibile, senza una seconda AzM. Senza spazio per le ali non attraversa il solido.' },
      { nome: 'Sensi e linguaggi', effetto: '+2 a Percezione quando vista o udito sono determinanti (una sola volta per Prova). Furtività 14 richiede la possibilità reale di occultarsi: non è invisibile né perfettamente silenzioso; la vista notturna non rivela automaticamente chi è nascosto. Parla il linguaggio dei Gufi giganti e comprende altre tre lingue della sua comunità (senza poterle necessariamente parlare). Può fare da sentinella o negoziare un passaggio; nessun potere silvano o vincolo con esseri fatati per il solo nome.' },
    ],
    note: 'Un solo attacco di Artigli per Round, Opportunità compresa; non afferra automaticamente la preda. Condotta: sotto 5 PV o a Ferita Profonda tende a raggiungere un posatoio protetto. Fonte: Giant Owl, p. 327.',
  },
  {
    id: 'avvoltoio-gigante', nome: 'Avvoltoio gigante',
    caratteristiche: { FOR: 7, DES: 5, COS: 6, INT: 3, SAG: 6, CAR: 4 },
    pv: 28, pm: 6, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: -1,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 8, magia: 9 },
    attacchi: [r('Becco', 11, '1d6+2', 1, { proprieta: ['Perforazione'] }), r('Artigli', 11, '1d8+1', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      VIVENTE, ALI,
      { nome: 'Sequenza', effetto: 'Al massimo una Beccata e un attacco di Artigli per Round, 1 AzP ciascuno; le Opportunità rientrano nei limiti. La preda ferita non concede un attacco aggiuntivo e il Becco non dà Sanguinamento come proprietà automatica.' },
      { nome: 'Branco', effetto: '+2 VA agli attacchi ravvicinati contro una vittima quando un alleato cosciente e capace di agire è entro 1 Q da lei e può realmente minacciarla (il VA diventa 13, prima degli altri modificatori). Più alleati non aumentano il bonus. Non ottiene anche la Frenesia del sangue degli squali.' },
      { nome: 'Vista e fiuto', effetto: '+2 a Percezione quando vista o olfatto sono determinanti (una sola volta per Prova); nessuna Scurovisione innata. Può seguire tracce accessibili ma non localizza ogni morente a distanza illimitata. Comprende una lingua assegnata alla sua origine, senza parlarla. Non ha Passaggio in volo: le normali Opportunità continuano a valere.' },
    ],
    note: 'Può seguire un gruppo e aspettare un’occasione, o abbandonarlo per una carcassa più accessibile. Condotta: sotto 7 PV o a Ferita Profonda tende a riprendere quota. Fonte: Giant Vulture, p. 329.',
  },
  {
    id: 'pipistrello-gigante', nome: 'Pipistrello gigante',
    caratteristiche: { FOR: 7, DES: 7, COS: 5, INT: 1, SAG: 6, CAR: 3 },
    pv: 18, pm: 5, ar: { totale: 0, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 11, volonta: 7, magia: 8 },
    attacchi: [r('Morso', 10, '1d6+1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VIVENTE, ALI,
      { nome: 'Ecolocalizzazione', effetto: 'Entro 12 Q in aria comunicante usa Percezione 11 per distinguere corpi e ostacoli senza vista, quando può emettere e ricevere gli echi. Assordato o un impedimento reale all’emissione o alla propagazione del suono la interrompono. Conserva la vista ordinaria (nessuna Scurovisione). Non attraversa muri o scafi, non legge scritte e non scopre automaticamente un essere nascosto; il Direttore verifica il mezzo reale. Il buio da solo non impone Accecato contro una posizione che questo senso percepisce validamente.' },
      { nome: 'Volo e morso', effetto: 'Un solo Morso per Round, Opportunità compresa. Non ha Passaggio in volo e non trasmette automaticamente malattie né risucchia sangue. Non rimane sospeso gratuitamente senza avanzare. Una Menomazione delle ali membranose può compromettere il Volo.' },
    ],
    note: 'Non comprende linguaggi. Un rumore ordinario non lo stordisce automaticamente. Condotta: può disimpegnarsi se il rifugio resta accessibile o se trova una preda meno rischiosa; sotto 4 PV o a Ferita Profonda tende a tornare al riparo. Fonte: Giant Bat, p. 323.',
  },
  {
    id: 'vespa-gigante', nome: 'Vespa gigante',
    caratteristiche: { FOR: 5, DES: 6, COS: 5, INT: 1, SAG: 5, CAR: 2 },
    pv: 18, pm: 4, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 10 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 6, magia: 8 },
    attacchi: [r('Pungiglione', 10, '1d6+1', 1, { note: 'Poi veleno: vedi la capacità «Veleno di vespa II».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      VIVENTE, ALI,
      veleno('Veleno di vespa II', '1d6', 5),
      { nome: 'Ali vibranti', effetto: 'Può restare sospesa in aria usando le ali funzionali, senza un movimento minimo: eccezione anatomica al volo non stazionario delle altre creature del blocco (non è sostegno magico). Perdita di coscienza, blocco del battito o Menomazione che impedisca il Volo possono farla cadere. Non ha Passaggio in volo.' },
      { nome: 'Corpo', effetto: 'Un Pungiglione per Round, Opportunità compresa. Testa comprende antenne e mandibole; Torace il corpo e l’apparato alare; Braccia le zampe anteriori e Gambe quelle posteriori con la funzione del pungiglione; la localizzazione individua la parte effettivamente lesa. Nessuna resistenza innata al Fuoco o al calore delle Terre del Fuoco.' },
    ],
    note: 'Le sue colonie non coincidono con la Covata. Sensi ordinari, senza Scurovisione; non comprende linguaggi. Condotta: può difendere il nido e interrompere l’inseguimento quando la minaccia si allontana; sotto 4 PV o a Ferita Profonda tende a ritirarsi. Fonte: Giant Wasp, p. 329.',
  },
  {
    id: 'scarabeo-di-fuoco-gigante', nome: 'Scarabeo di fuoco gigante',
    caratteristiche: { FOR: 3, DES: 5, COS: 4, INT: 1, SAG: 3, CAR: 2 },
    pv: 8, pm: 3, ar: { totale: 2, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 9, volonta: 6, magia: 7 },
    attacchi: [r('Morso', 7, '1d4', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 7 }, { nome: 'Atletica', va: 7 }, { nome: 'Percezione', va: 8 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VIVENTE,
      { nome: 'Luce biologica', effetto: 'Le ghiandole emettono luce piena entro 2 Q e debole per altri 2 Q. Emissione continua, senza Azioni né PM, non magica; un contenitore realmente opaco la scherma. Può rivelarne la presenza: Furtività non nasconde automaticamente una sorgente luminosa esposta.' },
      { nome: 'Ghiandole estratte', effetto: 'Dopo la morte effettiva (non per i soli 0 PV) la coppia può continuare a illuminare per 1d6 giorni (un solo tiro per entrambe). Estrarla da un cadavere accessibile richiede un minuto e strumenti adatti. La coppia integra mantiene la stessa emissione; dividerla non moltiplica le sorgenti. Scaduto il tempo non si ricarica con PM.' },
      { nome: 'Sensi e corpo', effetto: 'Percezione non visiva di prossimità entro 6 Q (Percezione 8), senza attraversare solidi; non identifica automaticamente creature nascoste. Testa = mandibole e sensori, Torace = carapace con le ghiandole, Braccia e Gambe = gruppi anteriori e posteriori di zampe. Non ha Volo nonostante il nome.' },
    ],
    note: 'Il nome si riferisce al bagliore, non a un attacco incendiario: non emette Fuoco o calore dannoso e non ha resistenza speciale a Fuoco o Ghiaccio. Un Morso per Round, Opportunità compresa; non comprende linguaggi. Condotta: sotto 2 PV o a Ferita Profonda tende a cercare un anfratto; può essere una fonte di luce o un incontro ambientale senza combattimento obbligatorio. Fonte: Giant Fire Beetle, p. 325.',
  },
  {
    id: 'centopiedi-gigante', nome: 'Centopiedi gigante',
    caratteristiche: { FOR: 3, DES: 6, COS: 5, INT: 1, SAG: 3, CAR: 2 },
    pv: 10, pm: 3, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 6, magia: 7 },
    attacchi: [r('Morso', 9, '1d4+1', 1, { note: 'Poi veleno: vedi la capacità «Veleno di miriapode II».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 8 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VIVENTE,
      veleno('Veleno di miriapode II', '1d4', 5, 'Tossina distinta da quella della Vespa. '),
      { nome: 'Superfici e sensi', effetto: 'Arrampicata fino a 6 Q per AzM al Passo su appigli adatti; non aderisce automaticamente a superfici lisce o soffitti. Entro 6 Q su un supporto continuo usa Percezione 8 per avvertire vibrazioni, senza attraversare pareti o percepire chi è sospeso in aria; non sostituisce una pista assente con un’individuazione automatica.' },
      { nome: 'Corpo segmentato', effetto: `Un solo Morso per Round, Opportunità compresa. ${corpoStrisc('apparato boccale e antenne')} Segmenti e numerose zampe non hanno PV separati, attacchi simultanei o premi distinti.` },
    ],
    note: 'Non comprende linguaggi. Condotta: può attaccare una creatura che ostacola il rifugio e poi sottrarsi negli anfratti accessibili; sotto 2 PV o a Ferita Profonda tende a nascondersi. Fonte: Giant Centipede, p. 323.',
  },
  {
    id: 'serpente-velenoso', nome: 'Serpente velenoso',
    caratteristiche: { FOR: 1, DES: 7, COS: 4, INT: 1, SAG: 5, CAR: 2 },
    pv: 8, pm: 3, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 11, volonta: 6, magia: 7 },
    attacchi: [r('Morso', 10, '1', 1, { note: 'Poi veleno: vedi la capacità «Veleno ofidico II».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VIVENTE,
      veleno('Veleno ofidico II', '1d4', 5, 'Stessa tossina del Serpente velenoso gigante. '),
      { nome: 'Sensi e acqua', effetto: 'Percezione non visiva di prossimità entro 2 Q (Percezione 10), senza attraversare solidi; non legge immagini o intenzioni. Nessuna Scurovisione innata. Nuoto nativo 6 / 12 / 18 Q (già effettivo; percorsi misti: budget unico e costi del Giocatore §5.2.4). Respira aria e non ignora il soffocamento.' },
      { nome: 'Corpo e morso', effetto: `Un Morso per Round, Opportunità compresa. ${corpoStrisc('capo e fauci')} Nessun arto prensile, attacco di Costrizione o capacità di inghiottire un personaggio.` },
    ],
    note: 'Non comprende linguaggi. Spazio tattico 1 × 1 Q: non rappresenta le sue dimensioni reali e non lo trasforma in uno sciame. Condotta: preferisce una via di fuga a un avversario troppo grande; il morso può essere una difesa del rifugio; sotto 2 PV o a Ferita Profonda tende a sottrarsi. Fonte: Poisonous Snake, p. 334.',
  },
  {
    id: 'serpente-velenoso-gigante', nome: 'Serpente velenoso gigante',
    caratteristiche: { FOR: 5, DES: 8, COS: 6, INT: 1, SAG: 5, CAR: 2 },
    pv: 20, pm: 4, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 12, volonta: 6, magia: 8 },
    attacchi: [r('Morso', 11, '1d4+1', 2, { note: 'Poi veleno: vedi la capacità «Veleno ofidico II». Colpisce entro 2 Q solo lungo un percorso libero per il capo.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      VIVENTE,
      veleno('Veleno ofidico II', '1d6', 5, 'Stessa tossina del Serpente velenoso: una dose gigante non somma altro danno mentre è già attiva. '),
      { nome: 'Portata', effetto: 'Un solo Morso per Round, Opportunità compresa. Non attraversa pareti o protezioni. Il Morso non crea una presa e non usa il profilo del Serpente costrittore gigante. La dose maggiore è già espressa in 1d6, senza moltiplicatore aggiuntivo.' },
      { nome: 'Sensi e respiro', effetto: 'Percezione non visiva di prossimità entro 2 Q (Percezione 11), senza Scurovisione né individuazione automatica di un essere nascosto. Nuoto nativo 6 / 12 / 18 Q (già effettivo; percorsi misti e respirazione come la specie minore). Nessuna respirazione acquatica, resistenza al Fuoco o immunità generica ai veleni.' },
    ],
    note: 'Non comprende linguaggi. Localizzazioni funzionali come nel Serpente velenoso, senza arti prensili. Condotta: può evitare un confronto se gli viene lasciato un passaggio; sotto 5 PV o a Ferita Profonda tende a cercare riparo o acqua libera. Fonte: Giant Poisonous Snake, p. 327.',
  },
  {
    id: 'ragno-lupo-gigante', nome: 'Ragno lupo gigante',
    caratteristiche: { FOR: 5, DES: 7, COS: 6, INT: 2, SAG: 6, CAR: 2 },
    pv: 14, pm: 4, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 11, volonta: 6, magia: 8 },
    attacchi: [r('Morso', 10, '1d4+1', 1, { note: 'Poi veleno: vedi la capacità «Veleno aracnide naturale II».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 14 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VIVENTE, scuro(12),
      veleno('Veleno aracnide naturale II', '1d4', 10, 'Lo stesso veleno aracnide di Ettercap e Ragno gigante. '),
      { nome: 'Superfici e seta', effetto: 'Può muoversi fino a 8 Q per AzM al Passo su pareti e soffitti aderenti senza Atletica ordinaria; superfici friabili o scivolose richiedono la valutazione pertinente. Attraversa normali ragnatele senza il loro costo aggiuntivo di terreno. Non ha Getto di seta né reti predisposte da cattura.' },
      { nome: 'Sensi di vibrazione', effetto: 'Entro 2 Q avverte una creatura in movimento attraverso un supporto continuo condiviso (Percezione 11); non chi vola, è isolato dal supporto o rimane immobile. Toccando una rete continua localizza entro 6 Q chi la muove, senza ricavarne identità o intenzioni; fili interrotti fermano il segnale. Nessuno di questi sensi attraversa pareti.' },
    ],
    note: `Un Morso per Round, Opportunità compresa. Non comprende linguaggi. ${corpoStrisc('fauci e sensori')} Condotta: sotto 3 PV o a Ferita Profonda tende a raggiungere una fessura. Fonte: Giant Wolf Spider, p. 330.`,
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
console.log(`${scritti} profili del blocco «Creature alate e piccoli predatori» scritti in esempi/nemici/mostri/`);
