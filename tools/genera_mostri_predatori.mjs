// Blocco «Predatori e grandi erbivori» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti;
// niente valori inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - «Assalto» / «Impeto» (4 Q di Passo rettilineo + atterramento): una capacità per creatura con la Tempra e la
//    dimensione ammessa; le versioni con una formula propria (Corno in Impeto di Rinoceronte e Alce, Calpestare
//    di Elefante, Mammut, Alce) restano attacchi con la condizione nella nota.
//  - Masso dello Scimmione gigante (2 AzP, due mani, 20 Q): attacco a distanza con il costo nella nota; Pietra dello
//    Scimmione (6 Q, una mano): attacco a distanza.
//  - Tigre 2 × 1 Q: ingombro non ammesso → `spazio` vuoto e nota con A.167, taglia normale (non contiene 2 × 2 Q).
//  - Arrampicata e nuoto: capacità.
//
// Uso: node tools/genera_mostri_predatori.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Predatori e grandi erbivori';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const d = (nome, va, danno, gittata_q, extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura: 'Naturale', gittata_q, modalita: ['S'], ac: 1, ...extra });
const scuro = (q = 12) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa ostacoli, fumo o oscurità soprannaturale.` });
const BESTIA = { nome: 'Bestia selvaggia', effetto: 'Natura Comune, biologicamente vivente, con mente e PM personali (a 0 PM Svenuta); nessun incantesimo o potere magico innato. A 0 PV valgono Tempra, Ferite, Menomazioni e Morente (non morte o incoscienza automatica). Nessuna Parata naturale: artigli, corna, proboscide e pugni non sostituiscono un’arma o uno scudo. L’Opportunità è un solo attacco ravvicinato normale gratuito, entro i limiti offensivi della scheda; non include Assalto, Impeto, Calpestare, lanci o altre manovre. Nei quadrupedi Testa = capo e collo, Torace = corpo, Braccia = arti anteriori, Gambe = posteriori con la coda. Respira aria (COS Round di fiato). Una via di fuga, una distanza di sicurezza o il cibo possono risolvere la scena; la sua presenza non applica Terrorizzato ai personaggi. Non comprende linguaggi (salvo dove detto).' };
const assalto = (nome, tempra, max) => ({ nome, effetto: `Richiede almeno 4 Q di Passo rettilineo verso la vittima nella stessa Iniziativa (usa l’AzM ordinaria e l’AzP del colpo; si dichiara prima del tiro; non si combina con Carica, Corsa, Scatto o altre manovre offensive; bersaglio e percorso realmente raggiungibili). Con almeno 1 danno finale: Tempra ${tempra} a una creatura non maggiore di ${max}: fallimento → A Terra (solo con appoggio; chi nuota o vola senza appoggio segue il §5.2.5; nessuno spostamento, Stordito o presa; un bersaglio già A Terra non cade di nuovo). Le AzP successive si pagano normalmente, senza raddoppio del danno.` });

const CREATURE = [
  {
    id: 'pantera', nome: 'Pantera',
    caratteristiche: { FOR: 6, DES: 7, COS: 5, INT: 2, SAG: 6, CAR: 3 },
    pv: 18, pm: 5, ar: { totale: 0, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 9, riflessi: 11, volonta: 7, magia: 8 },
    attacchi: [r('Artigli', 10, '1d4+1', 1, { proprieta: ['Taglio'] }), r('Morso', 10, '1d6+1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 12 }, { nome: 'Furtività', va: 14 }, { nome: 'Percezione', va: 12 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      BESTIA,
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Artigli e un Morso per Round, 1 AzP ciascuno, Opportunità comprese. Due zampe non producono due applicazioni del danno. Può conservare un’Azione per una Difesa.' },
      assalto('Assalto', 'senza modificatore', '1 × 1 Q'),
      { nome: 'Fiuto e rami', effetto: 'Fiuto +2 (+2 a Percezione quando l’olfatto è determinante). Arrampicata fino a 8 Q con l’AzM al Passo su tronchi e appigli adatti (un ramo che non la regge non diventa percorribile con Atletica). Un agguato dall’alto conserva le normali condizioni di Sorpresa e Caduta. Il Morso dopo l’Assalto richiede ancora la seconda AzP e portata valida.' },
    ],
    note: 'Può rappresentare grandi felini simili di pari taglia e funzione. Vista e udito ordinari, senza Scurovisione. Condotta: preda isolata e via verso la vegetazione; sotto 4 PV o a Ferita Profonda si sottrae; può abbandonare la caccia davanti a un gruppo armato. Fonte: Panther, p. 333.',
  },
  {
    id: 'tigre', nome: 'Tigre',
    caratteristiche: { FOR: 8, DES: 7, COS: 6, INT: 2, SAG: 6, CAR: 4 },
    pv: 32, pm: 6, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 },
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 11, volonta: 8, magia: 9 },
    attacchi: [r('Artigli', 12, '1d6+2', 1, { proprieta: ['Taglio'] }), r('Morso', 12, '1d8+2', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Furtività', va: 14 }, { nome: 'Percezione', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      BESTIA, scuro(12),
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Artigli e un Morso per Round, 1 AzP ciascuno, Opportunità comprese. Il Morso non Immobilizza, trascina o soffoca automaticamente.' },
      assalto('Assalto', 'senza modificatore', '2 × 2 Q'),
      { nome: 'Fiuto', effetto: 'Fiuto +2. Acqua o un odore forte possono rendere inservibile una traccia olfattiva; il bonus non crea una pista assente. Può mordere anche una vittima ancora in piedi, pagando l’attacco ordinario.' },
    ],
    note: 'Spazio sulla mappa 2 × 1 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167). Condotta: caccia spesso da sola, può difendere territorio o piccoli; sotto 8 PV o a Ferita Profonda cerca copertura. Fonte: Tiger, p. 339.',
  },
  {
    id: 'tigre-denti-a-sciabola', nome: 'Tigre dai denti a sciabola',
    caratteristiche: { FOR: 9, DES: 6, COS: 7, INT: 2, SAG: 6, CAR: 4 },
    pv: 42, pm: 6, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Artigli', 13, '1d8+2', 1, { proprieta: ['Taglio'] }), r('Morso', 13, '1d10+2', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Furtività', va: 13 }, { nome: 'Percezione', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      BESTIA,
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Artigli e un Morso per Round, 1 AzP ciascuno, Opportunità comprese. Le zanne sono parte del Morso (la formula ne include la potenza): non danno due danni separati né Perforante, Sanguinamento o Ferite dirette.' },
      assalto('Assalto', '−2', '2 × 2 Q'),
      { nome: 'Sensi e corpo', effetto: 'Fiuto +2; vista e udito ordinari, senza Scurovisione. Una lesione della funzione delle fauci può impedire il Morso; gli Artigli restano se gli arti sono integri. L’Assalto non si somma alla Carica ordinaria.' },
    ],
    note: 'Condotta: cerca prede raggiungibili, può restare presso una carcassa senza attaccare chiunque avvisti; sotto 10 PV o a Ferita Seria si ritira; la difesa di piccoli o nutrimento può trattenerla (senza immunità a Terrorizzato). Fonte: Saber-Toothed Tiger, p. 336.',
  },
  {
    id: 'orso-polare', nome: 'Orso polare',
    caratteristiche: { FOR: 9, DES: 5, COS: 7, INT: 2, SAG: 6, CAR: 3 },
    pv: 42, pm: 6, ar: { totale: 2, magica: 0 }, difese: 9, iniziativa: -1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 9, volonta: 8, magia: 9 },
    attacchi: [r('Morso', 12, '1d8+2', 1, { proprieta: ['Perforazione'] }), r('Artigli', 13, '1d8+2', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      BESTIA,
      { nome: 'Sequenza', effetto: 'Al massimo un Morso e un attacco di Artigli per Round, 1 AzP ciascuno, Opportunità comprese. Una zampata non colpisce gratis tutti gli adiacenti; per Immobilizzare o Sbilanciare serve una manovra praticabile, con costi, opposizioni e penalità.' },
      { nome: 'Fiuto e gelo', effetto: 'Fiuto +2; vista e udito ordinari, senza Scurovisione. Adatto al clima freddo del proprio habitat, ma condizioni estreme annunciate dal Direttore possono richiedere le normali PS. Non dimezza il Ghiaccio e non ignora Congelato o Rallentato.' },
      { nome: 'Nuoto', effetto: 'Nuoto 6 / 12 / 18 Q effettivi (eccezione al costo ordinario 2; budget unico del §5.2.4 nei percorsi misti, costo 1 a terra e 2 in acqua, senza superare la distanza di ogni modalità). Respira aria: dopo COS Round senza respirare segue il §5.23; Immobilizzato in acqua non dà protezione respiratoria.' },
    ],
    note: 'Una variante cavernicola richiederebbe adattamenti dichiarati: non è inclusa. Condotta: fame, piccoli e possibilità di raggiungere la preda; sotto 10 PV o a Ferita Seria cerca una riva o una zona libera. Fonte: Polar Bear, p. 334.',
  },
  {
    id: 'rinoceronte', nome: 'Rinoceronte',
    caratteristiche: { FOR: 9, DES: 4, COS: 7, INT: 2, SAG: 5, CAR: 3 },
    pv: 40, pm: 5, ar: { totale: 3, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 8, volonta: 7, magia: 8 },
    attacchi: [
      r('Corno', 12, '2d6+2', 1, { proprieta: ['Perforazione'] }),
      r('Corno in Impeto', 12, '3d6+2', 1, { proprieta: ['Perforazione'], note: 'Dopo almeno 4 Q di Passo rettilineo, al posto del Corno ordinario; comprende un solo 1d6 da slancio. Almeno 1 danno finale: Tempra −2 a una creatura ≤ 2 × 2 Q, fallimento → A Terra. Non infligge un secondo colpo né attraversa la vittima; l’Opportunità usa solo il Corno ordinario.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 5 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      BESTIA,
      { nome: 'Limiti dell’Impeto', effetto: 'Un solo attacco di Corno per Round, ordinario oppure in Impeto; l’Opportunità rientra nel limite. Il danno in Impeto non riceve il ×2 della Carica: per usare la Carica ordinaria (§5.6) deve rinunciare all’intera capacità Impeto, atterramento compreso.' },
      { nome: 'Pelle e corno', effetto: 'L’AR è biologica complessiva; il corno non ha PI separati e non para (una Menomazione si valuta nella funzione della Testa). Il peso non permette di ignorare trincee, barriere o un pavimento che non lo regge.' },
    ],
    note: 'Vista, udito e olfatto ordinari. Condotta: può minacciare prima di attaccare e fermarsi quando gli intrusi cedono spazio; sotto 10 PV o a Ferita Seria si allontana (un piccolo da difendere può cambiarlo). Fonte: Rhinoceros, p. 336.',
  },
  {
    id: 'elefante', nome: 'Elefante',
    caratteristiche: { FOR: 10, DES: 4, COS: 8, INT: 3, SAG: 5, CAR: 4 },
    pv: 60, pm: 7, ar: { totale: 3, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 8, volonta: 9, magia: 9 },
    attacchi: [
      r('Zanne', 14, '2d6+3', 1, { proprieta: ['Perforazione'] }),
      r('Calpestare', 14, '2d8+3', 1, { proprieta: ['Contusione'], note: 'Solo contro una creatura A Terra non maggiore di 2 × 2 Q, con un appoggio che consenta il colpo; può colpire una vittima già caduta prima del suo turno. Non occupa automaticamente il suo Q e non è un attacco ad Area.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 4 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      BESTIA,
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Zanne e un Calpestare per Round, 1 AzP ciascuno. L’Opportunità usa solo le Zanne, entro il limite di un attacco con esse.' },
      assalto('Impeto', 'senza modificatore', '2 × 2 Q'),
      { nome: 'Proboscide e massa', effetto: 'La proboscide manipola oggetti compatibili con la sua anatomia: non dà un terzo attacco, una Parata o una presa automatica (le manovre usano Azioni e procedure ordinarie). Per lesionarla si considera la funzione della Testa. Veicoli e costruzioni richiedono un bersaglio strutturale raggiungibile e il proprio profilo di Integrità. Il danno delle Zanne resta 2d6+3, senza bonus da slancio né ×2 di Carica.' },
    ],
    note: 'Sensi ordinari; non comprende linguaggi nel profilo selvatico (può rispondere a segnali appresi se il rapporto di addestramento è stabilito nella scena). Montura e carico richiedono una configurazione propria, senza Azioni o portata trasferite al cavaliere. Condotta: protegge i piccoli e può aprirsi una via di fuga; sotto 15 PV o a Ferita Seria si ritira con il branco. Fonte: Elephant, p. 322.',
  },
  {
    id: 'mammut', nome: 'Mammut',
    caratteristiche: { FOR: 10, DES: 4, COS: 10, INT: 3, SAG: 5, CAR: 4 },
    pv: 84, pm: 8, ar: { totale: 4, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 15, riflessi: 8, volonta: 9, magia: 10 },
    attacchi: [
      r('Zanne', 15, '2d8+3', 2, { proprieta: ['Perforazione'] }),
      r('Calpestare', 15, '2d10+3', 1, { proprieta: ['Contusione'], note: 'Solo contro una vittima A Terra non maggiore di 2 × 2 Q entro 1 Q, in una posizione che permetta il colpo (la maggiore portata delle Zanne non estende quella del piede).' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 15 }, { nome: 'Atletica', va: 15 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 4 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      BESTIA,
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Zanne e un Calpestare per Round, 1 AzP ciascuno. L’Opportunità usa solo le Zanne, entro il limite di un attacco con esse.' },
      assalto('Impeto', '−2', '3 × 3 Q'),
      { nome: 'Pelliccia e appoggio', effetto: 'L’adattamento al clima freddo non dimezza i danni da Ghiaccio; la pelliccia è compresa nell’AR biologica (non è un’armatura rimovibile). Proboscide e zanne appartengono alla Testa. Un terreno cedevole o un ponte devono poter sostenere il corpo. Un corridoio stretto può impedirgli di raggiungere gli avversari; non colpisce attraverso le pareti. Dopo l’Impeto solo una vittima entro i limiti di Calpestare può subirlo (seconda AzP).' },
    ],
    note: 'Sensi ordinari; non comprende linguaggi. Condotta: difende il gruppo e reagisce a chi gli chiude il passaggio; sotto 21 PV o a Ferita Seria cerca spazio e branco. Fonte: Mammoth, p. 332.',
  },
  {
    id: 'alce-gigante', nome: 'Alce gigante',
    caratteristiche: { FOR: 9, DES: 7, COS: 7, INT: 4, SAG: 7, CAR: 5 },
    pv: 42, pm: 8, ar: { totale: 2, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 12, corsa: 24, scatto: 36 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 11, volonta: 10, magia: 10 },
    attacchi: [
      r('Corna', 12, '2d6+2', 2, { proprieta: ['Contusione'] }),
      r('Corna in Impeto', 12, '3d6+2', 2, { proprieta: ['Contusione'], note: 'Dopo almeno 4 Q di Passo rettilineo; comprende un solo 1d6 da slancio. Almeno 1 danno finale: Tempra senza modificatore a una creatura ≤ 2 × 2 Q, fallimento → A Terra. Non riceve anche la Carica ordinaria.' }),
      r('Zoccoli', 12, '2d8+2', 1, { proprieta: ['Contusione'], note: 'Solo contro una creatura A Terra non maggiore di 2 × 2 Q, con un appoggio che permetta il colpo; serve la seconda AzP e la portata di 1 Q.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      BESTIA,
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Corna, ordinario oppure in Impeto, e un attacco di Zoccoli per Round, 1 AzP ciascuno. L’Opportunità usa solo le Corna ordinarie, entro il limite di un attacco con esse. Le corna non impugnano armi né parano.' },
      { nome: 'Linguaggio e sensi', effetto: 'Parla il linguaggio degli Alci giganti e comprende altre due lingue assegnate alla comunità o all’origine (non le parla automaticamente). Vista e udito ordinari. Il Direttore può dare significati culturali alla sua comparsa, ma la scheda non manifesta divinità, non concede profezie e non rende una caccia maledetta.' },
    ],
    note: 'Erbivoro senziente. Condotta: può indicare una via sicura, negare un passaggio o proteggere altri animali; sotto 10 PV o a Ferita Profonda si disimpegna; la sua comprensione permette una trattativa compatibile con il linguaggio. Fonte: Giant Elk, p. 325.',
  },
  {
    id: 'scimmione', nome: 'Scimmione',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 3, SAG: 6, CAR: 4 },
    pv: 24, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Pugno', 11, '1d6+2', 1, { proprieta: ['Contusione'] }), d('Pietra', 10, '1d6+1', 6, { proprieta: ['Contusione'], note: 'Una mano; serve una pietra pronta (circa 1 kg).' })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      BESTIA,
      { nome: 'Sequenza', effetto: 'Fino a due Pugni per Round, 1 AzP ciascuno, oppure un solo lancio di Pietra con 1 AzP; nel Round di un lancio al massimo un Pugno. Le Opportunità usano solo il Pugno. Una mano occupata (presa, sostegno) non è disponibile per il Pugno di quella mano.' },
      { nome: 'Arrampicata', effetto: 'Fino a 6 Q per AzM al Passo con appigli e sostegno adeguati al peso; Atletica per difficoltà reali; niente aderenza a pareti lisce. La postura sulle nocche non cambia le funzioni per le Menomazioni.' },
      { nome: 'Pietre', effetto: 'Il lancio richiede una pietra pronta e una mano libera; raccogliere una pietra accessibile entro 1 Q costa 1 AzP (non è incorporabile nel tiro); estrarre un proiettile già trasportato segue il §5.1.1 (−4 VA per una sola estrazione incorporata). Il Direttore stabilisce prima della scena le pietre raggiungibili; roccia compatta o terreno senza pietre non sono una riserva. Ogni tiro richiede un nuovo proiettile; il danno non si replica sui bersagli adiacenti; nessuna Parata naturale.' },
    ],
    note: 'Non comprende linguaggi nel profilo selvatico; può apprendere segnali tramite un rapporto stabilito nella scena. Condotta: minaccia con richiami e posture prima dello scontro; sotto 6 PV o a Ferita Profonda raggiunge il gruppo o un riparo. Fonte: Ape, p. 317.',
  },
  {
    id: 'scimmione-gigante', nome: 'Scimmione gigante',
    caratteristiche: { FOR: 10, DES: 6, COS: 9, INT: 4, SAG: 6, CAR: 4 },
    pv: 80, pm: 8, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 10, volonta: 9, magia: 10 },
    attacchi: [
      r('Pugno', 15, '2d6+3', 2, { proprieta: ['Contusione'] }),
      d('Masso', 14, '3d6+3', 20, { proprieta: ['Contusione'], note: 'Costa 2 AzP; due mani e un masso pronto (fino a 20 kg). VA 14 entro 10 Q, 12 da 11 a 20 Q, prima degli altri modificatori. Il costo di 2 AzP resta anche entro 10 Q.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 15 }, { nome: 'Armi da lancio', va: 14 }, { nome: 'Atletica', va: 16 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      BESTIA,
      { nome: 'Sequenza', effetto: 'Fino a due Pugni per Round, 1 AzP ciascuno, oppure un solo Masso che costa 2 AzP. Nel Round in cui lancia non può fare Pugni, nemmeno come Opportunità; se ne ha già fatto uno, il Masso non è disponibile. Non afferra né schiaccia automaticamente chi colpisce.' },
      { nome: 'Massi', effetto: 'Un masso fino a 20 kg pronto e due mani disponibili: un singolo masso, AC 1, contro una sola vittima (nessuna Area d’impatto). Raccogliere un masso accessibile entro 1 Q costa 1 AzP e richiede le mani; le 2 AzP del Masso comprendono il gesto e il lancio, senza raccolta gratuita. Il Direttore stabilisce prima le pietre raggiungibili e una riserva non si aggiunge a posteriori. Il masso non torna in mano. Difese concretamente valide contro un proiettile materiale (non è un’esplosione); nessun Sbalzante, Sbilanciante o Perforante. Per colpire scafi, porte o strutture si dichiarano bersaglio, AR, PS Integrità e PI; il Masso non usa una creatura come proiettile.' },
      { nome: 'Appigli e corpo', effetto: 'Arrampicata fino a 8 Q per AzM al Passo su sostegni che lo reggano; non aderisce a soffitti né conserva due mani libere mentre è sospeso. Bipede: una Menomazione del braccio può rendere impossibile il Masso lasciando un Pugno con l’arto valido.' },
    ],
    note: 'Sensi ordinari. Non comprende linguaggi nel profilo selvatico ma riconosce segnali appresi e reagisce a offerte o minacce. Con soli Pugni infligge più danno nel Round; il Masso minaccia una posizione lontana consumando entrambe le AzP. Condotta: sotto 20 PV o a Ferita Seria si ritira verso un accesso protetto. Fonte: Giant Ape, p. 323.',
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
console.log(`${scritti} profili del blocco «Predatori e grandi erbivori» scritti in esempi/nemici/mostri/`);
