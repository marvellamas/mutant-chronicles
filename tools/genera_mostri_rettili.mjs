// Blocco «Grandi rettili e predatori mostruosi» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci
// profili prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori
// trascritti; niente valori inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - tipo di danno fisico (Taglio, Perforazione, Contundente) → `proprieta` dell'attacco; il manuale precisa che
//    Perforazione non equivale alla proprietà Perforante X.
//  - attacchi senza tiro per colpire o su una vittima già presa (Stringere, Stringere le fauci, Soffio elettrico,
//    Soffio di vapore) → capacità. Calpestare (vittima A Terra) e Coda del Drago tartaruga (2 AzP) restano attacchi,
//    con la condizione nella nota; Costrizione del Behir è un attacco.
//  - Idra: cinque teste iniziali (Stato iniziale della scheda, nelle capacità) e Opportunità speciali nel campo
//    `azioni.eccezioni`.
//  - Drago tartaruga 4 × 4 Q: ingombro non ammesso → `spazio` vuoto e nota con A.167; Taglia Grande (contiene 2 × 2).
//
// Uso: node tools/genera_mostri_rettili.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Grandi rettili e predatori mostruosi';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const scuro = (q = 12) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa ostacoli né oscurità soprannaturale.` });
const RETTILE = { nome: 'Corpo e anatomia', effetto: 'Natura Comune, biologicamente vivente, con una mente e PM personali (a 0 PM Svenuto); bassa INT, grande massa e parentela draconica non danno immunità mentali o alla Corruzione. A 0 PV valgono Tempra, Ferite, Menomazioni e Morente. Nei quadrupedi Testa = capo e collo, Torace = corpo, Braccia = arti anteriori, Gambe = arti posteriori (la coda è un’appendice locomotrice delle Gambe). Nessuna Parata naturale; per una Menomazione si identifica la funzione coinvolta.' };
const VOLO = 'Ali reali: servono spazio e non resta sospeso come una creatura fluttuante; impedimenti o perdita di coscienza possono causare caduta.';

const CREATURE = [
  {
    id: 'allosauro', nome: 'Allosauro',
    caratteristiche: { FOR: 9, DES: 6, COS: 7, INT: 1, SAG: 6, CAR: 3 },
    pv: 36, pm: 5, ar: { totale: 2, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 12, corsa: 24, scatto: 36 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 8, magia: 8 },
    attacchi: [r('Morso', 12, '1d8+2', 1, { proprieta: ['Perforazione'] }), r('Artigli', 12, '1d6+2', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      RETTILE,
      { nome: 'Sequenza', effetto: 'Fino a due attacchi per Round, al massimo un Morso e un attacco di Artigli. Un’Azione conservata per Schivare non resta per completare la sequenza. Nessun attacco ad Area né danni automatici per chi è sotto il corpo.' },
      { nome: 'Assalto', effetto: 'Dopo almeno 6 Q di movimento rettilineo verso la vittima nella stessa Iniziativa, Artigli che infliggono almeno 1 danno finale impongono Tempra senza modificatore a una creatura ≤ 2 × 2 Q: fallimento → A Terra. Il Morso successivo usa la seconda AzP (non è gratuito). Nessun danno oltre alle formule.' },
    ],
    note: 'Vista e udito ordinari, senza scurovisione. Non comprende linguaggi. Condotta: preda isolata e spazio per lo slancio; sotto 9 PV o a Ferita Profonda abbandona una caccia rischiosa. Fonte: Allosaurus, p. 79.',
  },
  {
    id: 'anchilosauro', nome: 'Anchilosauro',
    caratteristiche: { FOR: 9, DES: 5, COS: 7, INT: 1, SAG: 6, CAR: 3 },
    pv: 46, pm: 5, ar: { totale: 4, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '3 × 3 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 8, volonta: 8, magia: 8 },
    attacchi: [r('Coda a mazza', 12, '2d6+2', 2, { proprieta: ['Contundente'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 5 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      RETTILE,
      { nome: 'Impatto', effetto: 'Dopo almeno 1 danno finale della Coda contro una creatura ≤ 2 × 2 Q, Tempra senza modificatore: fallimento → A Terra. Non spinge il bersaglio né applica Stordito. Un attacco risolve una sola vittima, senza spazzare tutta la portata.' },
      { nome: 'Corazza', effetto: 'L’AR è biologica e complessiva (nessuna piastra con PI separati). Non consente di parare con il dorso e non dà immunità a proiettili, Fuoco, Ghiaccio o effetti mentali.' },
    ],
    note: 'Vista e udito ordinari. Una coda non utilizzabile impedisce l’attacco. Non comprende linguaggi. Condotta: difende il proprio spazio e i piccoli; non è un predatore e può smettere quando gli aggressori si allontanano; sotto 11 PV o a Ferita Seria raggiunge il gruppo o una zona protetta. Fonte: Ankylosaurus, p. 79.',
  },
  {
    id: 'plesiosauro', nome: 'Plesiosauro',
    caratteristiche: { FOR: 9, DES: 7, COS: 7, INT: 1, SAG: 6, CAR: 3 },
    pv: 40, pm: 5, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 11, volonta: 8, magia: 8 },
    attacchi: [r('Morso', 12, '2d6+2', 2, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      RETTILE,
      { nome: 'Nuoto', effetto: 'Nuoto 8 / 16 / 24 Q; a terra 4/8/12 Q. Respira aria.' },
      { nome: 'Fiato prolungato', effetto: 'Può trattenere il respiro fino a 1 ora (eccezione alla riserva di COS Round; non è respirare sott’acqua). Consumata l’ora valgono il §5.23. Un Round completo di respirazione normale ripristina la riserva.' },
      { nome: 'Collo e bersagli', effetto: 'La portata (2 Q) consente di mordere una creatura in superficie o lungo una riva accessibile, non di attraversare pareti o barriere. Il Morso non afferra, trascina o inghiotte. Un bersaglio che non riesce a raggiungere concretamente resta fuori.' },
    ],
    note: 'Vista e udito ordinari, senza percezione attraverso l’acqua torbida. Furtività 13 in acqua, con una possibilità reale di occultarsi. Braccia = pinne anteriori, Gambe = posteriori (coda come appendice). Condotta: cerca nutrimento e può attaccare da un nascondiglio immerso; sotto 10 PV o a Ferita Profonda si allontana verso acque libere. Fonte: Plesiosaurus, p. 80.',
  },
  {
    id: 'pteranodonte', nome: 'Pteranodonte',
    caratteristiche: { FOR: 6, DES: 7, COS: 5, INT: 1, SAG: 4, CAR: 3 },
    pv: 16, pm: 4, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 11, volonta: 7, magia: 8 },
    attacchi: [r('Becco', 9, '1d6+1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      RETTILE,
      { nome: 'Passaggio in volo', effetto: `Non provoca Attacchi di Opportunità per il solo allontanamento dalla portata di un avversario mentre vola; le altre occasioni seguono le regole ordinarie. Non attraversa corpi né scioglie prese. Per colpire e poi allontanarsi nella stessa Iniziativa serve il movimento necessario (budget ordinario); non ripristina l’AzM, non moltiplica gli attacchi, la picchiata non aggiunge danni. ${VOLO}` },
    ],
    note: 'Vista e udito ordinari. Braccia = ali; Gambe = arti posteriori; un’ala menomata può impedire il volo. Non ha una presa per sollevare una creatura colpita. Non comprende linguaggi. Condotta: piccoli animali e cibo esposto; evita un gruppo che reagisce; sotto 4 PV o a Ferita Profonda prende distanza. Fonte: Pteranodon, p. 80.',
  },
  {
    id: 'triceratopo', nome: 'Triceratopo',
    caratteristiche: { FOR: 10, DES: 4, COS: 8, INT: 1, SAG: 5, CAR: 3 },
    pv: 58, pm: 6, ar: { totale: 3, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 7, volonta: 8, magia: 9 },
    attacchi: [
      r('Corna', 14, '2d6+3', 1, { proprieta: ['Perforazione'] }),
      r('Calpestare', 14, '1d8+3', 1, { proprieta: ['Contundente'], note: 'Solo contro una vittima già A Terra, di spazio ≤ 2 × 2 Q e in una posizione raggiungibile dalle zampe. Non entra automaticamente nello spazio del bersaglio.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 5 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      RETTILE,
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Corna e uno di Calpestare per Round, ciascuno con 1 AzP.' },
      { nome: 'Carica', effetto: 'Dopo almeno 4 Q rettilinei verso la vittima nella stessa Iniziativa, Corna che infliggono almeno 1 danno finale impongono Tempra senza modificatore a una creatura ≤ 2 × 2 Q: fallimento → A Terra. Il Calpestare successivo costa la seconda AzP e conserva tiro per colpire, Difesa e AR normali. Nessun bonus di danno oltre alla formula.' },
    ],
    note: 'Vista e udito ordinari. Corna e collare sono parti della Testa, senza Parata naturale né PI separati. Non comprende linguaggi. Un branco richiede esemplari distinti. Condotta: protegge il branco o reagisce a una minaccia vicina; sotto 14 PV o a Ferita Seria cerca protezione. Fonte: Triceratops, p. 80.',
  },
  {
    id: 'tirannosauro', nome: 'Tirannosauro',
    caratteristiche: { FOR: 10, DES: 5, COS: 9, INT: 1, SAG: 6, CAR: 4 },
    pv: 80, pm: 7, ar: { totale: 3, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 8, volonta: 9, magia: 10 },
    attacchi: [
      r('Morso', 15, '2d8+3', 2, { note: 'Possibile presa: vedi «Aggancio».' }),
      r('Coda', 15, '2d6+3', 2, { proprieta: ['Contundente'] }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 15 }, { nome: 'Atletica', va: 15 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 5 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      RETTILE,
      { nome: 'Sequenza', effetto: 'Fino a due attacchi per Round: un Morso oppure Stringere le fauci, e un attacco di Coda; se usa entrambi devono riguardare bersagli diversi. L’Attacco di Opportunità rispetta gli stessi limiti. Nessun attacco di Artigli efficace.' },
      { nome: 'Aggancio', effetto: 'Dopo almeno 1 danno finale del Morso contro una creatura ≤ 1 × 1 Q, Riflessi senza modificatore: successo evita la presa; fallimento → Immobilizzato (mani non bloccate). Una sola vittima, e non morde altri finché la presa dura. Un Morso di Opportunità non attiva l’aggancio.' },
      { nome: 'Stringere le fauci', effetto: '1 AzP, solo sulla vittima già afferrata, VA 15: Corpo a corpo 15 contrapposto a Corpo a corpo o Atletica della vittima (−4 di Immobilizzato); successo infligge 2d8+3 Naturale con AR ordinaria, fallimento o pareggio nessun danno. La contrapposta sostituisce tiro per colpire e Difesa. È l’unico attacco delle fauci del Round.', azioni: { principali: 1 } },
      { nome: 'Liberarsi e spostamento', effetto: 'La vittima spende 1 AzP: Corpo a corpo o Atletica contro Corpo a corpo 15 (pareggio conserva la presa); un alleato entro portata delle fauci può farlo col proprio VA, con un attrezzo per fare leva. Una vittima di massa (dotazione compresa) non oltre 250 kg viene portata a velocità dimezzate (per difetto) con l’AzM ordinaria, entro la portata delle fauci. Prima di un bordo o pericolo immediato la vittima fa Riflessi senza modificatore: successo ferma il Tirannosauro all’ultimo spazio sicuro se vuole conservare la presa. Non Schiva conservando la presa. Rilascio gratuito; perdita di coscienza, morte o Menomazione mandibolare interrompono l’aggancio (0 PV no). Dopo il rilascio la vittima è nel più vicino spazio libero e sostenuto adiacente; nessun danno automatico.' },
    ],
    note: 'Vista e udito ordinari. Braccia = piccoli arti anteriori, Gambe = posteriori e coda, Testa = fauci. Non inghiotte e non trasferisce sulla vittima gli attacchi diretti contro di lui. Non comprende linguaggi. Condotta: nutrimento; può abbandonare avversari difficili; sotto 20 PV o a Ferita Seria si ritira. Fonte: Tyrannosaurus Rex, p. 80.',
  },
  {
    id: 'viverna', nome: 'Viverna',
    caratteristiche: { FOR: 9, DES: 5, COS: 7, INT: 3, SAG: 6, CAR: 3 },
    pv: 56, pm: 8, ar: { totale: 3, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12, volo: 16 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 9, volonta: 9, magia: 10 },
    attacchi: [
      r('Morso', 13, '1d8+2', 2, { proprieta: ['Perforazione'] }),
      r('Pungiglione', 13, '1d6+2', 2, { note: 'Poi veleno (una dose dichiarata prima del tiro): vedi la capacità «Veleno».' }),
      r('Artigli', 13, '1d8+2', 1, { proprieta: ['Taglio'], note: 'Solo in volo.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      RETTILE, scuro(12),
      { nome: 'Sequenza e volo', effetto: `Fino a due attacchi per Round, al massimo un Morso e un Pungiglione; in volo può sostituire uno dei due con Artigli. L’Opportunità ordinaria usa Morso o Artigli, senza puntura velenosa gratuita. ${VOLO} Il volo non dà una presa o un trasporto automatico con gli Artigli. Testa = collo, Braccia = ali, Gambe = zampe posteriori e coda.` },
      { nome: 'Veleno', effetto: 'Tre dosi in ogni periodo di 24 ore, dichiarate prima di un Pungiglione: si consuma solo se almeno 1 danno finale raggiunge un organismo biologico (anche se immune al veleno); una dose non usata resta; un nuovo incontro non ripristina. Senza dose il Pungiglione fa solo il danno fisico. Inoculazione: Tempra −2; fallimento 2d6 Naturale interno (ignora AR) e Avvelenato con −2 ai VA delle azioni fisiche per 2 Round; successo metà per eccesso e nessuna penalità. Si risolvono prima il danno fisico (PV, Ferite), poi il veleno; un Magistrale raddoppia solo il fisico. Un solo danno immediato per dose, nessun danno periodico; nuove dosi non sommano il −2 (resta la scadenza più lontana). Veleno naturale di Pericolosità IV, Seria: antidoto o Cura Avvelenamenti (liv. 5) lo neutralizzano; Cura Spirituale no. Nessuna dose commerciale dal cadavere; le dosi consumate non sono bottino.', risorsa: '1 dose', usi: { quanti: 3, per: 'giorno' } },
    ],
    note: 'Non comprende linguaggi nel profilo base e non ha un soffio. Condotta: insegue una preda accessibile cercando spazio per la coda; sotto 14 PV o a Ferita Profonda si allontana in volo. Fonte: Wyvern, p. 303.',
  },
  {
    id: 'idra', nome: 'Idra',
    caratteristiche: { FOR: 10, DES: 6, COS: 10, INT: 1, SAG: 5, CAR: 4 },
    pv: 76, pm: 9, ar: { totale: 3, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '3 × 3 Q',
    azioni: { principali: 3, movimento: 1, eccezioni: 'Opportunità speciali delle teste (vedi la capacità «Opportunità delle teste»)' }, salvezze: { tempra: 15, riflessi: 9, volonta: 9, magia: 11 },
    attacchi: [r('Morso', 14, '1d8+2', 2, { proprieta: ['Perforazione'], note: 'Una testa funzionale per ogni Morso.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 14 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      RETTILE,
      { nome: 'Morsi e Opportunità delle teste', effetto: 'Con le AzP al massimo tre Morsi per Round e non più del numero di teste funzionali, 1 AzP ciascuno. Eccezione espressa: con almeno tre teste funzionali può fare fino a due Attacchi di Opportunità ordinari per Round, su due occasioni distinte (con una o due teste, uno solo), aggiuntivi rispetto ai tre Morsi; ogni testa morde al massimo una volta per Round (si annotano le teste usate). Niente Parata naturale, azioni simultanee fuori Iniziativa o attacchi attraverso ostacoli.' },
      { nome: 'Un solo organismo', effetto: 'Inizia con cinque teste (numerate da 1 a 5), fino a sette contemporanee; condividono PV, PM, Ferite, Azioni e Stati dell’Idra. Una localizzazione Testa riguarda una testa funzionale determinata a caso fra quelle coinvolte e raggiungibili. Sette teste non significano sette AzP.' },
      { nome: 'Soglia di lesione', effetto: 'Quando accumula almeno 16 danni finali nello stesso Round, una testa funzionale è distrutta o recisa e lascia un collo aperto (si verifica dopo aver risolto l’intero attacco; al massimo una testa per Round per questo innesco; conta il danno positivo anche a 0 PV, non i PM). Una lesione anatomica ordinaria può rendere non funzionale una testa anche senza la soglia. Una testa solo Accecata o Assordata non genera nuove teste.' },
      { nome: 'Menti collegate', effetto: 'Con almeno due teste funzionali +2 alle PS richieste direttamente per evitare Accecato, Assordato, Terrorizzato, Stordito, fascinazione o uno svenimento imposto da un effetto (non alla determinazione delle Ferite; non evita Svenuto da PM 0, Morente o conseguenze senza PS).' },
      { nome: 'Ultima testa', effetto: 'Se nessuna testa rimane funzionale per distruzione anatomica, l’Idra è Svenuta ed entra in Morente (contatore COS 10, penalità −8; primo decremento dopo un Round completo): eccezione anatomica distinta da 0 PV. La ricrescita non opera senza almeno una testa; recuperare PV non ricostruisce una testa. La stabilizzazione non restituisce la funzione; Rigenerazione sì.' },
      { nome: 'Ricrescita e cauterizzazione', effetto: 'A fine di ogni propria Iniziativa, se cosciente e con almeno una testa funzionale, verifica i colli aperti. Se ha subito almeno 1 danno finale da Fuoco dall’ultima verifica, tutti i colli aperti sono cauterizzati e non ricrescono con questa capacità. Altrimenti ogni collo aperto genera fino a due nuove teste (massimo sette), senza Azioni o PM; ogni testa ricresciuta cura 2 PV al corpo, fino a 4 PV per Round. Non riduce Ferite, non stabilizza, non guarisce Menomazioni di altro tipo. Le nuove teste agiscono dal Round dopo la ricrescita (limiti di tre Morsi e due Opportunità). Una fiamma senza danno finale non cauterizza; non è vulnerabile al Fuoco né Incendiata; la ricrescita non è un effetto di Negare Potere. I 70 PX comprendono cinque teste, ricrescita fino a sette e le Opportunità.' },
      { nome: 'Sensi e fiato', effetto: 'Scurovisione 12 Q. Nel sonno almeno una testa resta vigile (Percezione 14). Può trattenere il fiato per 1 ora, poi §5.23. Terra e nuoto 6/12/18 Q.' },
    ],
    note: 'Un grande rettile acquatico a cinque teste iniziali. Condotta: nutrimento presso rive e paludi; sotto 19 PV o a Ferita Seria tenta di ritirarsi. Verifica al tavolo: registrare teste attive, colli cauterizzati, PV recuperati e Opportunità effettive. Fonte: Hydra, p. 190.',
  },
  {
    id: 'behir', nome: 'Behir',
    caratteristiche: { FOR: 10, DES: 8, COS: 9, INT: 4, SAG: 7, CAR: 6 },
    pv: 88, pm: 12, ar: { totale: 4, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 12, volonta: 10, magia: 12 },
    attacchi: [
      r('Morso', 16, '2d6+3', 2, { proprieta: ['Perforazione'] }),
      r('Costrizione', 16, '1d8+3', 1, { note: 'Poi possibile presa: vedi «Spire».' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 16 }, { nome: 'Atletica', va: 15 }, { nome: 'Percezione', va: 14 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Leggenda', px: 100, per_pg: 4 },
    capacita: [
      RETTILE, scuro(18),
      { nome: 'Sensi e protezione', effetto: 'Immune ai danni da Fulmine di qualunque Natura (non li assorbe per recuperare PV; nessun’altra resistenza elementale). Comprende e parla una lingua assegnata alla sua origine. Arrampicata 8 / 16 / 24 Q su pareti con appigli, non aderenza a soffitti lisci. Testa = fauci, Torace = massa e stomaco, Braccia = zampe anteriori, Gambe = posteriori e coda.' },
      { nome: 'Sequenza', effetto: 'Al massimo un Morso e, in aggiunta, una Costrizione oppure Stringere per Round, 1 AzP ciascuno. Il Soffio costa entrambe le AzP e sostituisce quella sequenza. L’Opportunità ordinaria usa solo il Morso. Il Morso per inghiottire usa la stessa AzP.' },
      { nome: 'Spire', effetto: 'Dopo almeno 1 danno finale di Costrizione contro una creatura ≤ 2 × 2 Q, Riflessi senza modificatore: fallimento → Immobilizzato (mani non bloccate). Una sola vittima esterna; mantenerla è gratuito, ma non si sposta finché la trattiene (può muoversi se è stata inghiottita). Sciogliere: la vittima o un alleato adiacente spende 1 AzP, Corpo a corpo o Atletica contro Corpo a corpo 16 (−4 a chi è Immobilizzato; il pareggio conserva). Rilascio gratuito; perdita di coscienza, morte o Menomazione della costrizione la liberano (0 PV no).' },
      { nome: 'Stringere', effetto: '1 AzP, VA 16, sulla vittima già presa: Corpo a corpo 16 contrapposto a Corpo a corpo o Atletica; successo 1d8+3 Naturale da Contusione con AR ordinaria, fallimento o pareggio nessun danno. Sostituisce la Costrizione del Round.', azioni: { principali: 1 } },
      { nome: 'Soffio elettrico', effetto: '2 AzP, nessun PM: linea lunga 4 Q e larga 1 Q dalle fauci su un percorso libero. Ogni creatura risolve Elusione con Riflessi senza modificatore: successo dimezza per eccesso 4d6 Naturale da Fulmine prima dell’AR, fallimento (o Elusione impossibile) danno completo. Nessun tiro per colpire né altra Difesa. Dopo l’uso nel Round R non può soffiare prima di R + 3 (non si azzera con 0 PV, cure o cambio di obiettivo). Non aggiunge Stordito o Paralizzato; non colpisce la vittima nel proprio stomaco.', azioni: { principali: 2 } },
      { nome: 'Inghiottire', effetto: 'Solo con un Morso contro la propria vittima già afferrata nelle spire, di spazio ≤ 1 × 1 Q: dopo almeno 1 danno finale la vittima è inghiottita e la presa esterna termina; non può trattenere o inghiottire altri finché ha quella nello stomaco. Dentro è Immobilizzata e Accecata verso l’esterno (mani non bloccate), segue il Behir, e se non ha respirazione autonoma inizia il soffocamento del §5.23. La massa dà copertura totale; la vittima attacca dall’interno con −4 e il Behir non può Schivare quel colpo. Digestione: 1 AzP, una volta per Round, 1d6+2 Naturale da acido (AR ordinaria; niente Corrosivo). Uscire: 1 AzP, Corpo a corpo o Atletica contro Atletica 15 (−4 di Immobilizzato): successo la espelle nel più vicino spazio libero adiacente alle fauci; un alleato presso le fauci può aiutarla con un attrezzo. Rigurgito: con almeno 10 danni finali dall’interno nello stesso Round, a fine dell’Iniziativa della vittima il Behir fa Tempra senza modificatore: fallimento la espelle A Terra entro 2 Q dalle fauci (una verifica per Round). Rilascio volontario: 1 AzP. Perdita di coscienza o morte fanno cessare la compressione.' },
    ],
    note: 'Cerca prede isolate e accessi difficili, ma può comunicare o valutare un’offerta; non eredita inimicizie cosmologiche della fonte. Condotta: sotto 22 PV o a Ferita Seria tenta di ritirarsi. Fonte: Behir, p. 25.',
  },
  {
    id: 'drago-tartaruga', nome: 'Drago tartaruga', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 5, COS: 10, INT: 5, SAG: 6, CAR: 6 },
    pv: 110, pm: 16, ar: { totale: 6, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12 },
    azioni: { principali: 3, movimento: 1 }, salvezze: { tempra: 16, riflessi: 9, volonta: 12, magia: 13 },
    attacchi: [
      r('Morso', 17, '2d8+3', 3, { proprieta: ['Perforazione'] }),
      r('Artiglio', 17, '1d8+3', 2, { proprieta: ['Taglio'] }),
      r('Coda', 17, '2d8+3', 3, { note: 'Costa 2 AzP e sostituisce i due Artigli (può accompagnare il Morso). Possibile spinta: vedi «Coda».' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 17 }, { nome: 'Atletica', va: 17 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 4 }],
    gs_px: { gs: 'Leggenda', px: 100, per_pg: 4 },
    capacita: [
      RETTILE, scuro(24),
      { nome: 'Metabolismo e corazza', effetto: 'Respira aria e acqua. Nuoto 8 / 16 / 24 Q. Dimezza i danni da Fuoco di qualunque Natura prima dell’AR (non è immune a ogni calore; non vale per Ghiaccio, Fulmine o acido). Il carapace è AR biologica complessiva, senza PI separati e senza Parata naturale. Torace comprende il carapace.' },
      { nome: 'Sequenza', effetto: 'Un Morso e fino a due Artigli per Round, 1 AzP ciascuno. La Coda costa 2 AzP e sostituisce i due Artigli (può accompagnare il Morso). Il Soffio costa 2 AzP, lascia disponibile solo un eventuale Morso e non si combina con Artigli o Coda. L’Opportunità ordinaria usa il Morso.' },
      { nome: 'Coda', effetto: 'Un unico attacco, AC 1. Dopo almeno 1 danno finale contro una creatura ≤ 2 × 2 Q, Tempra −2: fallimento → spinta fino a 2 Q direttamente lontano dal corpo e A Terra; successo evita entrambi. Il percorso si ferma davanti ai solidi, senza danno d’impatto automatico.' },
      { nome: 'Soffio di vapore', effetto: '2 AzP, nessun PM: cono lungo 12 Q dalle fauci su percorsi liberi (aria o acqua, non attraverso pareti o scafi integri). Ogni creatura risolve Elusione con Riflessi −2: successo dimezza per eccesso 5d6 Naturale da Fuoco prima di resistenze e AR, fallimento (o Elusione impossibile) danno completo. Nessun tiro per colpire, Parata o Schivata, né Magistrale. L’immersione non dà riduzioni speciali. Niente nube persistente, Accecato o Incendiato automatico. Dopo un soffio nel Round R il successivo non prima di R + 3.', azioni: { principali: 2 } },
      { nome: 'Imbarcazioni', effetto: 'Artigli, Morso e Coda possono colpire una parte di scafo raggiungibile, con profilo, protezioni, PS Integrità e PI della struttura (i PV della creatura non si convertono in PI di una nave). La Coda non sposta né capovolge un veicolo senza una procedura del mezzo; in assenza di un profilo lo definisce il Direttore.' },
    ],
    note: 'Spazio sulla mappa 4 × 4 Q (dal manuale): ingombro non ammesso dal campo (1 Q, 2 × 2, 3 × 3), pedine quadrate nell’app (A.167). Furtività 10 immerso e immobile su un fondale adatto. Parla due lingue assegnate all’ambiente. Può intimidire, chiedere un’offerta o scacciare una nave; un accordo risolve l’incontro. Condotta: sotto 27 PV o a Ferita Seria cerca profondità o un accordo. Fonte: Dragon Turtle, p. 119.',
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
console.log(`${scritti} profili del blocco «Grandi rettili e predatori mostruosi» scritti in esempi/nemici/mostri/`);
