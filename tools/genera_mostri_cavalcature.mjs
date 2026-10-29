// Blocco «Cavalcature e animali da lavoro» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti;
// niente valori inventati. GS/PX informativo (A.161). Spazio dal campo `spazio` (A.126, A.167).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - soglie di carico (ordinario / massimo trasportabile / spinta e trascinamento) della tabella finale del blocco:
//    capacità «Carico» per creatura (con «Trasporto robusto» dove il manuale lo dà); sovraccarico e gestione
//    cavaliere/animale nella capacità comune «Animale da lavoro».
//  - Impeto con formula propria (Cornata in Impeto di Capra e Capra gigante, Corna in Impeto dell'Alce) e Zoccoli/Calpestare su
//    vittima A Terra: attacchi con la condizione nella nota (come nel blocco «Predatori e grandi erbivori»); Impeto
//    del Cavallo da guerra (senza danno proprio): capacità.
//  - Piede saldo (+2 circoscritto) e Atterrare del Mastino: capacità.
//  - Mastino con Sopravvivenza 9 fra le Abilità (esiste in catalogo).
//
// Uso: node tools/genera_mostri_cavalcature.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Cavalcature e animali da lavoro';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const ANIMALE = { nome: 'Animale da lavoro', effetto: 'Natura Comune, vivente, con mente e PM personali (a 0 PM Svenuto); nessun incantesimo o potere magico attivo. A 0 PV valgono Tempra, Ferite, Menomazioni e Morente (nessuna morte o incoscienza automatica); le cure biologiche seguono le procedure normali. Nessuna Parata naturale: denti, corna e zoccoli non sono scudi. Una sola Opportunità ordinaria gratuita per Round, con l’attacco normale della scheda (non Impeto né Calpestare). Respira aria (COS Round di fiato). Vista, udito e olfatto ordinari, nessuna Scurovisione innata. Non comprende linguaggi. Testa = capo, fauci e corna; Torace = tronco; Braccia = arti anteriori; Gambe = posteriori. Non garantisce addestramento, disponibilità a farsi cavalcare né adattamento alle Terre del Fuoco; i profili non includono bardature, selle, finimenti o carri. Cavaliere e animale restano distinti per Azioni, risorse, attacchi e bersagli: Impeto e danni dell’animale non si trasferiscono all’arma del cavaliere, e stare in sella non dà AR, Copertura o Difese condivise.' };
const IMPETO = (tempra, max) => `Richiede almeno 4 Q di Passo rettilineo verso la vittima nella stessa Iniziativa (usa l’AzM ordinaria e l’AzP del colpo; si dichiara prima del tiro; non si combina con Carica, Corsa, Scatto o altre manovre offensive). Il danno speciale sostituisce quello normale, senza il ×2 della Carica. Con almeno 1 danno finale: Tempra ${tempra} a una creatura non maggiore di ${max}; fallimento → A Terra. Il Magistrale non ne peggiora la Salvezza.`;
const PIEDE_SALDO = { nome: 'Piede saldo', effetto: '+2 alle PS di Tempra o Riflessi e alle Prove di FOR o DES espressamente richieste per evitare A Terra; si aggiunge alla Prova pertinente, non ai valori permanenti. Non introduce una Prova se l’effetto non la concede, non evita ogni spostamento forzato, non vale per le PS per Ferite e non dà aderenza a superfici lisce o immunità alle Cadute.' };
const carico = (o, m, s, robusto = false, extra = '') => ({ nome: robusto ? 'Trasporto robusto' : 'Carico', effetto: `Soglie ${o} kg ordinari, ${m} kg massimi trasportabili, ${s} kg di spinta o trascinamento (comprendono cavaliere, dotazione e attrezzatura dell’animale). ${robusto ? 'Soglie anatomiche raddoppiate (FOR × 20 / 40 / 80 kg): non aumentano FOR, attacchi, danni o numero di passeggeri; serve una sistemazione realmente utilizzabile per il carico.' : 'Soglie ordinarie del Giocatore (FOR × 10 / 20 / 40 kg).'} Sovraccarico oltre l’ordinario e fino al massimo: −2 VA alle Prove fisiche (non alle PS), solo Passo con −2 Q e peggioramento di Affaticamento per ogni ora completa di trasporto gravoso; oltre il massimo Movimento 0 finché il carico non è ridotto. La spinta vale su terreno piano e senza ostacoli (Giocatore §5.2.6); ruote, pendenze e tiro di più animali richiedono un mezzo definito. ${extra}`.trim() });

const CREATURE = [
  {
    id: 'cammello', nome: 'Cammello',
    caratteristiche: { FOR: 8, DES: 4, COS: 6, INT: 2, SAG: 4, CAR: 3 },
    pv: 24, pm: 5, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 8, volonta: 7, magia: 8 },
    attacchi: [r('Morso', 8, '1d4+1', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 5 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [ANIMALE, carico(160, 320, 640, true),
      { nome: 'Viaggio', effetto: 'Il profilo non assegna un consumo fisso di acqua né un’esenzione dall’Affaticamento: si valutano clima, sforzo e disponibilità con le regole comuni. L’adattamento a un ambiente arido non protegge da lava, Fuoco o gas delle Terre del Fuoco.' }],
    note: 'Un Morso per Round, Opportunità compresa; nessun attacco di sputo in questa scheda. Condotta: può fermarsi, arretrare o cercare il gruppo; sotto 6 PV o a Ferita Profonda tende a sottrarsi (se è carico, la fuga conserva gli impedimenti). Fonte: Camel, p. 320.',
  },
  {
    id: 'cavallo-da-tiro', nome: 'Cavallo da tiro',
    caratteristiche: { FOR: 9, DES: 5, COS: 6, INT: 2, SAG: 5, CAR: 4 },
    pv: 28, pm: 6, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 8, magia: 8 },
    attacchi: [r('Zoccoli', 10, '1d8+2', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 5 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [ANIMALE, carico(180, 360, 720, true, 'Tiro di un carro, pendenza, fondo e finimenti devono essere compatibili con il mezzo; la massa del carico non si traduce da sola in velocità o Azioni aggiuntive.'),
      { nome: 'Lavoro e difesa', effetto: 'Un solo attacco di Zoccoli per Round, Opportunità compresa. Non ha Impeto né Calpestare. Un imbrago che limita lo spostamento può impedire una Schivata, lasciando applicabili AR, PS e altre conseguenze ordinarie.' }],
    note: 'Il calcio è una reazione fisicamente raggiungibile, non un attacco contro ogni lato del corpo. Condotta: può seguire indicazioni note e fermarsi se il percorso è impraticabile; sotto 7 PV o a Ferita Profonda tende ad arretrare o cercare il conduttore. Fonte: Draft Horse, p. 321.',
  },
  {
    id: 'cavallo-da-sella', nome: 'Cavallo da sella',
    caratteristiche: { FOR: 8, DES: 6, COS: 5, INT: 2, SAG: 5, CAR: 4 },
    pv: 22, pm: 5, ar: { totale: 0, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 12, corsa: 24, scatto: 36 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 8, magia: 8 },
    attacchi: [r('Zoccoli', 9, '1d6+2', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [ANIMALE, carico(160, 320, 640, true, 'Cavaliere, sua dotazione, sella e bagagli entrano nello stesso peso.'),
      { nome: 'Andatura', effetto: 'Usa l’AzM dell’animale e le distanze riportate, ridotte da carico, terreno o lesioni. L’abitudine alla sella non gli concede Impeto, Calpestare, immunità a Terrorizzato o una Difesa gratuita. Un attacco di Zoccoli per Round, Opportunità compresa; la portata degli Zoccoli non diventa quella dell’arma del cavaliere.' }],
    note: 'La velocità non implica la capacità di affrontare volontariamente fiamme, spari o una carica. Condotta: cerca uno spazio aperto e una direzione conosciuta; sotto 5 PV o a Ferita Profonda tende alla fuga. Fonte: Riding Horse, p. 336.',
  },
  {
    id: 'cavallo-da-guerra', nome: 'Cavallo da guerra',
    caratteristiche: { FOR: 8, DES: 6, COS: 6, INT: 2, SAG: 6, CAR: 4 },
    pv: 28, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 12, corsa: 24, scatto: 36 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Zoccoli', 11, '1d8+2', 1, { proprieta: ['Contusione'] }), r('Calpestare', 11, '1d8+2', 1, { proprieta: ['Contusione'], note: 'Richiede una vittima già A Terra non maggiore di 1 × 1 Q e un appoggio che consenta il colpo; non entra automaticamente nello spazio della vittima.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [ANIMALE, carico(160, 320, 640, true),
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Zoccoli e un Calpestare per Round, ciascuno con 1 AzP. L’Opportunità usa soltanto Zoccoli e rientra nel relativo limite.' },
      { nome: 'Impeto', effetto: `${IMPETO('senza modificatore', '1 × 1 Q')} Non aumenta il danno degli Zoccoli. Un eventuale Calpestare costa la seconda AzP; se l’ha spesa per una Difesa non può recuperarla. Nessun attacco gratuito dell’originale.` }],
    note: 'Descrive l’animale senza armatura: la tabella di bardature della fonte non si trasferisce al sistema AR. Può eseguire segnali di combattimento già appresi; l’addestramento non lo rende immune a Paura, Terrorizzato o dolore. Condotta: sotto 7 PV o a Ferita Profonda tende a cercare riparo o il conduttore. Fonte: Warhorse, p. 340.',
  },
  {
    id: 'mulo', nome: 'Mulo',
    caratteristiche: { FOR: 6, DES: 5, COS: 6, INT: 2, SAG: 5, CAR: 3 },
    pv: 18, pm: 5, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 7, magia: 8 },
    attacchi: [r('Zoccoli', 8, '1d4+1', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [ANIMALE, carico(120, 240, 480, true, 'Nonostante lo spazio di 1 × 1 Q usa le soglie anatomiche raddoppiate; non concede il Talento Mulo da Soma del Giocatore (effetti distinti sulle Prove).'), PIEDE_SALDO],
    note: 'Cerca un appoggio stabile e può colpire con gli zoccoli quando qualcuno lo stringe senza via di fuga. Un attacco di Zoccoli per Round, Opportunità compresa. Condotta: può fermarsi davanti a un ostacolo concreto; sotto 4 PV o a Ferita Profonda tende a cercare un riparo. Fonte: Mule, p. 333.',
  },
  {
    id: 'pony', nome: 'Pony',
    caratteristiche: { FOR: 6, DES: 5, COS: 5, INT: 2, SAG: 5, CAR: 4 },
    pv: 16, pm: 5, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 9, volonta: 8, magia: 8 },
    attacchi: [r('Zoccoli', 9, '1d6+1', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [ANIMALE, carico(60, 120, 240, false, 'Il totale comprende il cavaliere e tutta la sua dotazione; lo spazio occupato non raddoppia le soglie né rende adatto un carico troppo alto o instabile.'),
      { nome: 'Limiti', effetto: 'Un attacco di Zoccoli per Round, Opportunità compresa. Non ha Trasporto robusto, Piede saldo, Impeto o Calpestare. Per un passaggio stretto si valuta il corpo reale con sella e carico: la pedina da 1 Q non elimina questi ingombri.' }],
    note: 'Utilizzabile da un cavaliere il cui peso e ingombro siano realmente compatibili; non è una versione ridotta del Cavallo da guerra. Condotta: può seguire il conduttore o fermarsi a un segnale noto; sotto 4 PV o a Ferita Profonda tende a cercare il gruppo o un’uscita. Fonte: Pony, p. 335.',
  },
  {
    id: 'mastino', nome: 'Mastino',
    caratteristiche: { FOR: 5, DES: 7, COS: 5, INT: 3, SAG: 6, CAR: 4 },
    pv: 12, pm: 5, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 11, volonta: 8, magia: 8 },
    attacchi: [r('Morso', 9, '1d6+1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }, { nome: 'Sopravvivenza', va: 9 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [ANIMALE, carico(50, 100, 200, false, 'Un impiego come cavalcatura richiede cavaliere piccolo, peso e anatomia compatibili e addestramento specifico.'),
      { nome: 'Atterrare', effetto: 'Un Morso con almeno 1 danno finale contro una creatura non maggiore di 1 × 1 Q impone Tempra senza modificatore: fallimento → A Terra. Il Morso non afferra automaticamente, non impedisce il movimento e non infligge un secondo danno. È un effetto del normale colpo penetrante e può verificarsi anche nell’Opportunità.' },
      { nome: 'Udito e olfatto', effetto: '+2 a Percezione quando udito oppure olfatto sono determinanti (una sola volta per Prova). Per seguire una traccia usa Sopravvivenza 9 con indizi accessibili; il bonus di Percezione non si trasferisce a quell’Abilità. Nessuna Scurovisione o individuazione oltre ogni ostacolo.' }],
    note: 'Cane robusto addestrabile a guardia, ricerca e accompagnamento: non riconosce automaticamente intenzioni o appartenenze. Un Morso per Round, Opportunità compresa; non trasmette malattie automaticamente. Può apprendere segnali. Condotta: sotto 3 PV o a Ferita Profonda tende a ritirarsi o tornare al conduttore. Fonte: Mastiff, p. 332.',
  },
  {
    id: 'capra', nome: 'Capra',
    caratteristiche: { FOR: 4, DES: 5, COS: 5, INT: 2, SAG: 5, CAR: 3 },
    pv: 8, pm: 4, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 9, volonta: 7, magia: 7 },
    attacchi: [r('Cornata', 8, '1d4+1', 1, { proprieta: ['Contusione'] }), r('Cornata in Impeto', 8, '2d4+1', 1, { proprieta: ['Contusione'], note: 'Dopo 4 Q di Passo rettilineo; sostituisce la Cornata normale: vedi la capacità «Impeto».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [ANIMALE, carico(40, 80, 160), PIEDE_SALDO,
      { nome: 'Impeto', effetto: `${IMPETO('senza modificatore', '1 × 1 Q')} Usa 2d4+1 al posto del danno normale (un solo 1d4 da slancio). Una Cornata per Round, normale oppure in Impeto; l’Opportunità usa soltanto quella normale. Nessuna arrampicata speciale né aderenza ai soffitti.` }],
    note: 'Un percorso roccioso resta una difficoltà concreta anche per un animale dal passo sicuro. Capacità di trasporto e disponibilità a portare una persona restano distinte. Condotta: può minacciare, allontanarsi o difendere i piccoli; sotto 2 PV o a Ferita Profonda tende a cercare un appoggio protetto o il branco. Fonte: Goat, p. 330.',
  },
  {
    id: 'capra-gigante', nome: 'Capra gigante',
    caratteristiche: { FOR: 8, DES: 5, COS: 6, INT: 2, SAG: 6, CAR: 3 },
    pv: 28, pm: 6, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 7, magia: 8 },
    attacchi: [r('Cornata', 10, '1d6+2', 1, { proprieta: ['Contusione'] }), r('Cornata in Impeto', 10, '2d6+2', 1, { proprieta: ['Contusione'], note: 'Dopo 4 Q di Passo rettilineo; sostituisce la Cornata normale: vedi la capacità «Impeto».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [ANIMALE, carico(160, 320, 640, true), PIEDE_SALDO,
      { nome: 'Impeto', effetto: `${IMPETO('senza modificatore', '1 × 1 Q')} Usa il danno completo 2d6+2 (un solo 1d6 aggiuntivo). Una Cornata per Round, normale oppure in Impeto, con la sola normale per l’Opportunità. Nessun Calpestare né attacco gratuito dopo la caduta.` }],
    note: 'La corazza è AR biologica senza PI separati; le corna non permettono Parata naturale e non aprono automaticamente una breccia nei muri. Il nome e la massa non aggiungono immunità ambientali né poteri della Covata. Condotta: la sua struttura non implica abitudine alla sella; sotto 7 PV o a Ferita Profonda tende a sottrarsi verso terreno favorevole. Fonte: Giant Goat, p. 326.',
  },
  {
    id: 'alce', nome: 'Alce',
    caratteristiche: { FOR: 8, DES: 5, COS: 5, INT: 2, SAG: 5, CAR: 3 },
    pv: 22, pm: 5, ar: { totale: 0, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 9, volonta: 7, magia: 8 },
    attacchi: [
      r('Corna', 10, '1d6+2', 1, { proprieta: ['Contusione'] }),
      r('Corna in Impeto', 10, '2d6+2', 1, { proprieta: ['Contusione'], note: 'Dopo 4 Q di Passo rettilineo; sostituisce il danno ordinario: vedi la capacità «Impeto».' }),
      r('Zoccoli', 10, '1d8+2', 1, { proprieta: ['Contusione'], note: 'Richiede una vittima già A Terra non maggiore di 1 × 1 Q e un appoggio che consenta il colpo; non colpisce dopo averla atterrata.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [ANIMALE, carico(160, 320, 640, true, 'È una capacità anatomica, non addestramento come cavalcatura.'),
      { nome: 'Impeto', effetto: `${IMPETO('senza modificatore', '1 × 1 Q')} Sostituisce il danno ordinario con 2d6+2 (un solo 1d6 da slancio). Nessun ×2 aggiuntivo da Carica.` },
      { nome: 'Un solo colpo', effetto: 'Sceglie Corna, Corna in Impeto oppure Zoccoli per l’unico attacco del Round. L’Opportunità usa solo Corna ordinarie e consuma il limite offensivo.' }],
    note: 'Distinto dall’Alce gigante già nel catalogo: non riceve le sue Azioni aggiuntive né la maggiore portata. Non ha Piede saldo speciale né sensi acuti. Condotta: sotto 5 PV o a Ferita Profonda tende a cercare il branco o spazio libero, salvo la necessità di proteggere piccoli vicini. Fonte: Elk, p. 322.',
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
console.log(`${scritti} profili del blocco «Cavalcature e animali da lavoro» scritti in esempi/nemici/mostri/`);
