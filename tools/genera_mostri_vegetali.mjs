// Blocco «Vegetali e custodi delle foreste» del catalogo (cap. 8) del Manuale dei Mostri v0.18: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti;
// niente valori inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - nomi d'Abilità del manuale non nel catalogo: «Mischia» → Armi da mischia; «Diplomazia» → Oratoria (il
//    Giocatore dice «Oratoria per diplomazia e seduzione»); «Tiro naturale» NON si mappa (non c'è un equivalente
//    scritto): il valore sta nella nota e il VA dell'attacco a distanza è già nella tabella (domanda A.169).
//  - tipo di danno fisico («Taglio», «Perforazione», «Contundente») → `proprieta` dell'attacco; l'elemento di
//    un attacco Magico dell'Unicorno resta natura Magico.
//  - attacchi senza tiro per colpire o con portata non in Q (Afferrare, Inglobare, Comprimere, Rovi viventi,
//    Fascino silvano, Animare alberi, Tocco risanante) → capacità. Il Corno in carica dell'Unicorno resta un
//    attacco (VA 14, portata 1 Q) con la condizione di movimento nella nota.
//  - «Randello incantato» della Driade: attacco con la condizione «solo con Ramo incantato attivo» nella nota.
//  - Aghi dell'Avvizzito spinoso e Roccia del Treant: attacchi a distanza (S) con gittata massima; le scariche e
//    il masso nelle capacità.
//
// Uso: node tools/genera_mostri_vegetali.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.18 (16/10/2026), cap. 8 «Catalogo delle creature» — Vegetali e custodi delle foreste';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const d = (nome, va, danno, gittata_q, extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura: 'Naturale', gittata_q, modalita: ['S'], ac: 1, ...extra });
const scuro = (q = 12) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa ostacoli né oscurità soprannaturale.` });
const FUOCO_X2 = 'Subisce danno ×2 da Fuoco di qualunque Natura, prima di Difesa e AR; con un Magistrale il moltiplicatore complessivo diventa ×3. Le fiamme non lo rendono automaticamente Incendiato.';
const VEGETALE = { nome: 'Corpo vegetale', effetto: 'Natura Comune, biologicamente vivente, con una mente e PM personali (a 0 PM Svenuto): INT bassa, corpo vegetale o assenza di parola non danno immunità mentali. Respira attraverso i tessuti (nessuna gola da strangolare, ma non è immune alla mancanza d’aria). Nessuna Parata naturale, salvo la Driade con il randello. A 0 PV valgono Tempra, Ferite, Menomazioni e Morente. Testa = regione sensoriale, Torace = tronco, Braccia = rami anteriori, Gambe = radici o appendici locomotrici.' };
const PERCEZIONE_12 = { nome: 'Percezione diffusa', effetto: 'Localizza entro 12 Q senza occhi e udito; non legge colori o scritte, non soddisfa gli sguardi e non attraversa ostacoli solidi. Immune ad Accecato e Assordato; non agli effetti mentali. Resta il confronto Percezione–Furtività.' };
const ROVI = (emittente) => ({ nome: 'Rovi viventi', effetto: `Capacità mistica innata: 1 AzP e 3 PM, durata 5 Round, senza Concentrazione né Potere, Focus o Invocazione. ${emittente} Raggio 3 Q; serve terreno naturale con radici o vegetazione viva. Le piante restano legate al suolo: la zona è terreno difficile per chi si muove a terra (non i vegetali; non applica Rallentato; il volo sopra le piante o percorsi liberi la evitano). All’attivazione l’emittente sceglie fino a tre creature percepite a terra nella zona (anche alleati): Riflessi senza modificatore, fallimento → Immobilizzato (mani non bloccate); chi entra dopo non fa una nuova PS. Sciogliere la presa: 1 AzP e Atletica senza modificatore (col −4 di Immobilizzato), anche da un alleato adiacente. Recidere: i legami di una vittima sono un bersaglio materiale con AR 0 e 6 PV, senza Difese; a 0 PV liberano la vittima (niente Ferite o Morente; nessun PX separato). Una sola area per emittente. Negare Potere: potenza 3. Termina alla scadenza, a congedo gratuito o alla perdita di coscienza dell’emittente.`, risorsa: '3 PM', azioni: { principali: 1 } });

const CREATURE = [
  {
    id: 'arbusto-risvegliato', nome: 'Arbusto risvegliato',
    caratteristiche: { FOR: 2, DES: 4, COS: 5, INT: 5, SAG: 5, CAR: 3 },
    pv: 12, pm: 6, ar: { totale: 0, magica: 0 }, difese: 7, iniziativa: -1,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 8, volonta: 8, magia: 8 },
    attacchi: [r('Rami graffianti', 7, '1d4', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 7 }, { nome: 'Atletica', va: 5 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VEGETALE,
      { nome: 'Legno e fuoco', effetto: `Dimezza i danni fisici Naturali da Perforazione (non proiettili Magici o Eterei). ${FUOCO_X2}` },
      { nome: 'Coscienza', effetto: 'Conosce una lingua assegnata alla sua origine e può parlare. Il risveglio è una trasformazione permanente: Negare Potere non lo toglie. Non dipende dal creatore per le proprie Azioni.' },
    ],
    note: 'Furtività 14 immobile fra vegetazione compatibile. Vista e udito ordinari, senza scurovisione. Condotta: nascondigli, richiami o trattative; sotto 3 PV o a Ferita Profonda cerca riparo. Fonte: Awakened Shrub, p. 317.',
  },
  {
    id: 'albero-risvegliato', nome: 'Albero risvegliato',
    caratteristiche: { FOR: 9, DES: 3, COS: 7, INT: 5, SAG: 5, CAR: 3 },
    pv: 40, pm: 8, ar: { totale: 3, magica: 0 }, difese: 6, iniziativa: -2,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '3 × 3 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 6, volonta: 9, magia: 9 },
    attacchi: [r('Schianto di ramo', 12, '2d6+2', 2, { proprieta: ['Contundente'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      VEGETALE,
      { nome: 'Struttura', effetto: `Dimezza i danni fisici Naturali da Contusione e Perforazione, non Taglio. ${FUOCO_X2} La corteccia è AR biologica, non equipaggiamento: nessun PI separato dal corpo.` },
      { nome: 'Vita autonoma', effetto: 'Conosce una lingua legata al risveglio e può parlare. Non è un incantesimo mantenuto: Negare Potere non gli toglie la coscienza. Non ha Animare alberi, lanci di roccia o capacità da assedio. La chioma deve entrare nel passaggio.' },
    ],
    note: 'Altezza circa 6 Q. Furtività 13 immobile fra alberi compatibili. Vista e udito ordinari. Distinto dagli alberi mossi da un Treant. Condotta: blocca un accesso, avverte gli altri abitanti; sotto 10 PV o a Ferita Seria cerca riparo; con una sola AzP la Schivata impedisce lo Schianto di quel Round. Fonte: Awakened Tree, p. 317.',
  },
  {
    id: 'avvizzito-ramoso', nome: 'Avvizzito ramoso',
    caratteristiche: { FOR: 3, DES: 6, COS: 6, INT: 2, SAG: 4, CAR: 2 },
    pv: 12, pm: 4, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 9, volonta: 7, magia: 8 },
    attacchi: [r('Artigli di ramo', 9, '1d4+1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 7 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    immunita: ['accecato', 'assordato'],
    capacita: [
      VEGETALE, PERCEZIONE_12,
      { nome: 'Legno secco', effetto: `${FUOCO_X2} Non ha le resistenze da Contusione o Perforazione dell’Albero risvegliato; il Ghiaccio non gli applica il disorientamento speciale della Covata.` },
    ],
    note: 'Furtività 14 immobile fra cespugli secchi o detriti compatibili. Capisce istruzioni semplici in una lingua assegnata all’infestazione ma non parla. Non è nella Covata né ha Natura Oscura Simmetria. Un gruppo richiede esemplari distinti con proprie Azioni. Condotta: attacca da un nascondiglio; sotto 3 PV o a Ferita Profonda cerca copertura. Fonte: Twig Blight, pp. 31–32.',
  },
  {
    id: 'avvizzito-spinoso', nome: 'Avvizzito spinoso',
    caratteristiche: { FOR: 6, DES: 6, COS: 6, INT: 2, SAG: 4, CAR: 2 },
    pv: 16, pm: 4, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 7, magia: 8 },
    attacchi: [r('Artigli', 9, '1d6', 1, { proprieta: ['Perforazione'] }), d('Aghi', 10, '1d6+1', 12, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 8 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    immunita: ['accecato', 'assordato'],
    capacita: [
      VEGETALE, PERCEZIONE_12,
      { nome: 'Lancio degli aghi', effetto: 'Un singolo tiro, AC 1, senza raffiche, fino a 12 Q con fasce di distanza, coperture, ingaggio e Difese del Giocatore. Sei scariche per incontro, consumate anche da un tiro fallito; servono almeno 24 ore di crescita per ripristinarle (nessuna Azione di ricarica). Gli Artigli restano disponibili.' },
      { nome: 'Polline di allarme', effetto: '1 AzP: segnale che raggiunge altri Avvizziti spinosi entro 24 Q attraverso aria comunicante (pareti sigillate lo bloccano; vento e ostacoli possono limitarlo). Comunica pericolo e direzione approssimativa, non identità o mappe. Non danneggia, non infetta, non dà Azioni ai destinatari.', azioni: { principali: 1 } },
    ],
    note: 'Il VA 10 è quello degli Aghi, già in tabella: «Tiro naturale» non è un’Abilità (A.169, 18/10), non dà Armi da lancio né altre competenze. Le spine sono parti del corpo, non proiettili recuperabili. Non ha la vulnerabilità al Fuoco del ramoso né le resistenze fisiche degli alberi. Capisce istruzioni semplici ma non parla. Condotta: cerca coperture e un tiro libero; sotto 4 PV o a Ferita Profonda arretra nella vegetazione fitta. Fonte: Needle Blight, pp. 31–32.',
  },
  {
    id: 'avvizzito-rampicante', nome: 'Avvizzito rampicante',
    caratteristiche: { FOR: 7, DES: 4, COS: 7, INT: 3, SAG: 5, CAR: 2 },
    pv: 26, pm: 9, ar: { totale: 1, magica: 0 }, difese: 7, iniziativa: -1,
    movimento: { passo: 2, corsa: 4, scatto: 6 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 11, riflessi: 7, volonta: 8, magia: 9 },
    attacchi: [r('Sferzata di liana', 11, '1d6+1', 2)],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: ['accecato', 'assordato'],
    capacita: [
      VEGETALE, PERCEZIONE_12,
      { nome: 'Presa delle liane', effetto: 'Dopo almeno 1 danno finale della Sferzata contro una creatura di spazio ≤ 2 × 2 Q, Riflessi senza modificatore: fallimento → Immobilizzato (mani non bloccate). Una sola vittima; non trascina e non si muove mantenendo la presa. La Sferzata di Opportunità non applica l’aggancio.' },
      { nome: 'Stringere', effetto: '1 AzP, su una vittima già presa: Corpo a corpo 11 contrapposto a Corpo a corpo o Atletica; con successo 1d6+1 Naturale con AR ordinaria, fallimento o pareggio nessun danno. Liberarsi: la vittima o un alleato adiacente spende 1 AzP con lo stesso confronto (−4 di Immobilizzato alla vittima; il pareggio conserva la presa). Rilascio gratuito; perdita di coscienza o funzione prensile la terminano (0 PV no).', azioni: { principali: 1 } },
      ROVI('Centra l’area su di sé.'),
    ],
    note: 'Furtività 14 immobile fra liane compatibili. Parla una lingua assegnata alla comunità. Con una sola AzP sceglie fra terreno, attacco, stretta o Difesa. Può contrattare; sotto 6 PV o a Ferita Profonda cerca riparo. Fonte: Vine Blight, pp. 31–32.',
  },
  {
    id: 'driade', nome: 'Driade',
    caratteristiche: { FOR: 5, DES: 6, COS: 5, INT: 7, SAG: 7, CAR: 8 },
    pv: 24, pm: 14, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 12, magia: 13 },
    attacchi: [
      r('Randello', 9, '1d6+1', 1, { proprieta: ['Contundente'] }),
      r('Randello incantato', 11, '1d8+2', 1, { natura: 'Magico', proprieta: ['Contundente'], note: 'Solo con Ramo incantato attivo (potere attivo): sostituisce il profilo del randello, non si somma.' }),
    ],
    abilita: [{ nome: 'Armi da mischia', va: 9 }, { nome: 'Atletica', va: 8 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 12 }, { nome: 'Oratoria', va: 13 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      { nome: 'Corpo e sensi', effetto: 'Natura Comune, vivente, con mente e PM. Scurovisione 12 Q. Contro incantesimi e capacità mistiche +2 alle PS pertinenti (Magia 13 lo comprende già; Tempra, Riflessi e Volontà lo aggiungono solo contro tali fonti); non migliora Difese né dimezza danni. Localizzazioni umanoidi. Può parare con il randello (1 AzP): l’AzP spesa non resta per un potere o un attacco.' },
      { nome: 'Linguaggi', effetto: 'Parla il linguaggio silvano assegnato all’ambientazione e una lingua di contatto. Comunica intenzioni semplici con animali e piante viventi vicini; un albero ordinario non diventa una mente umana né un servitore obbligato.' },
      { nome: 'Poteri innati', effetto: 'Le capacità seguenti costano 1 AzP e i PM indicati (salvo dove detto), senza Potere, Focus o Invocazione; non sono incantesimi appresi né ammettono Anticipazione. Con PM insufficienti non si attivano; spendere l’ultimo PM causa Svenuto. Si mantiene una sola Concentrazione: iniziare Fascino mentre è attivo il Velo (o viceversa) termina il primo.' },
      { nome: 'Fascino silvano', effetto: '1 AzP e 3 PM: un umanoide o una bestia con mente, visibile entro 6 Q e capace di vedere la Driade. Volontà −2: fallimento → la considera una conoscente fidata per 5 Round (Concentrazione, una vittima alla volta). Cambia la disposizione, non comanda Azioni né impone suicidio o di attaccare i compagni; non legge pensieri. Termina se la Driade o i suoi alleati compiono un atto dannoso contro la vittima, a scadenza, perdita di Concentrazione, congedo gratuito o Negare Potere (potenza 3); chi supera la PS o è liberato è immune 24 ore.', risorsa: '3 PM', azioni: { principali: 1 } },
      ROVI('Scelge un punto visibile entro 6 Q.'),
      { nome: 'Passaggio arboreo', effetto: 'Una volta per Round, 1 AzM intera e 2 PM: entra in un albero vivo adiacente ed esce accanto a un secondo albero vivo entro 12 Q dal primo (tronco di almeno mezzo Q di diametro e altezza di almeno 4 Q; l’albero d’uscita e il punto libero adiacente visibili alla partenza). Trasferimento istantaneo, senza Opportunità per il tragitto; porta solo la dotazione entro il carico ordinario, non altre creature né una vittima trattenuta; non attraversa interdizioni al teletrasporto; senza i requisiti non è dichiarabile.', risorsa: '2 PM', usi: { quanti: 1, per: 'Round' } },
      { nome: 'Corteccia', effetto: '3 PM, solo su di sé, 20 Round senza Concentrazione: AR 3 Naturale e movimento 5/10/15 Q. Come Pelle Corazzata 3 per cumuli (non si somma a un altro contributo di Pelle Corazzata o Armatura di Forza); non protegge dal danno Etereo. Negare Potere: potenza 3. La perdita di coscienza non la termina.', risorsa: '3 PM', azioni: { principali: 1 } },
      { nome: 'Ramo incantato', effetto: '2 PM, un randello di legno impugnato, 5 Round senza Concentrazione: negli attacchi della Driade quel randello usa VA 11 e 1d8+2 Magico (valori completi, non si sommano al profilo ordinario). Non dà Azioni. Negare Potere: potenza 3.', risorsa: '2 PM', azioni: { principali: 1 } },
      { nome: 'Velo del sottobosco', effetto: '3 PM, fino a tre creature consenzienti visibili entro 4 Q (lei compresa), 5 Round con Concentrazione: +2 a Furtività e nessuna orma ordinaria nei terreni naturali. Non invisibili, silenziose o prive di odore. Chi esce oltre 4 Q perde l’effetto. I Veli non si sommano; Negare Potere (potenza 3) lo toglie a un beneficiario alla volta.', risorsa: '3 PM', azioni: { principali: 1 } },
      { nome: 'Frutti del bosco', effetto: '2 PM, a contatto con un vegetale vivo fruttifero: maturano tre piccoli frutti, una volta ogni 24 ore, efficaci 24 ore. Mangiarne uno: 1 AzP, 1 PV biologico e una porzione di cibo (un recupero per individuo ogni 24 ore). Non cura Ferite, non arresta Sanguinamento, non stabilizza Morente.', risorsa: '2 PM', usi: { quanti: 1, per: 'giorno' } },
    ],
    note: 'AR 0; con Corteccia 3 Naturale e movimento 5/10/15 Q. Randello di legno Comune, una mano, FOR 3, PS Integrità 10, PI 5, già pronto (1d6 base +1 da DES già compreso); nessuna armatura o scudo. Oratoria 13 (nel manuale «Diplomazia 13»: l’Oratoria è la Abilità «per diplomazia e seduzione» del Giocatore). L’albero legato va definito nella scena: danni a quell’albero sono un motivo narrativo, non trasferiscono danni o Ferite alla Driade. Condotta: allontana chi danneggia il bosco, negozia o usa i passaggi arborei; sotto 6 PV o a Ferita Profonda cerca riparo. Fonte: Dryad, p. 121.',
  },
  {
    id: 'cumulo-strisciante', nome: 'Cumulo strisciante',
    caratteristiche: { FOR: 9, DES: 4, COS: 8, INT: 3, SAG: 5, CAR: 3 },
    pv: 60, pm: 8, ar: { totale: 3, magica: 0 }, difese: 7, iniziativa: -1,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 7, volonta: 8, magia: 10 },
    attacchi: [r('Schianto', 13, '1d8+2', 1, { proprieta: ['Contundente'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    immunita: ['accecato', 'assordato'],
    capacita: [
      { nome: 'Sensi e metabolismo', effetto: 'Terra e nuoto 4/8/12 Q. Percezione diffusa 12 Q; immune ad Accecato, Assordato e all’accumulo di AFT. Ha una mente istintiva e non è immune agli effetti mentali. Non dorme (entra in quiescenza); respira e si nutre. Torace = nucleo e massa centrale.' },
      { nome: 'Resistenze e assorbimento', effetto: 'Dimezza Fuoco e Ghiaccio di qualunque Natura; immune al Fulmine. Per ogni danno da Fulmine che lo raggiunge si calcola il residuo dopo Difesa e AR (ignorando solo l’immunità) e recupera tanti PV, fino a 4 PV per Round da tutte le fonti elettriche; non oltre il massimo, non cura Ferite o Menomazioni, non stabilizza Morente.' },
      { nome: 'Afferrare', effetto: '1 AzP, VA 13: Corpo a corpo 13 contrapposto a Corpo a corpo o Atletica di una creatura ≤ 1 × 1 Q; successo → Immobilizzato (mani non bloccate), il pareggio iniziale non afferra; nessun danno. Mantiene una sola vittima senza Azioni, ma non si sposta finché non è inglobata o rilasciata. Due Schianti non danno una terza AzP né un inglobamento gratuito.', azioni: { principali: 1 } },
      { nome: 'Inglobare', effetto: '1 AzP sull’unica vittima già presa: la trasferisce dentro la massa senza altro tiro né danni; è Accecata verso l’esterno e Immobilizzata (−4 fisico, mani non bloccate). Segue gli spostamenti del Cumulo, che ora può muoversi; occupa la capacità prensile (non afferra altre creature). Se le vie respiratorie sono ostruite, soffocamento del §5.23 (riserva pari a COS; un apparato autonomo lo impedisce).', azioni: { principali: 1 } },
      { nome: 'Comprimere', effetto: '1 AzP, una volta per Round, sul prigioniero interno: Tempra senza modificatore, fallimento 1d8+2 Naturale da Contusione, successo metà per eccesso, prima dell’AR; niente tiro per colpire né Difese. Gli Schianti non possono essere diretti contro il prigioniero. Nessun altro danno automatico.', azioni: { principali: 1 }, usi: { quanti: 1, per: 'Round' } },
      { nome: 'Liberazione', effetto: 'La vittima (presa o inglobata) spende 1 AzP: Corpo a corpo o Atletica contro Corpo a corpo 13 (−4 di Immobilizzato); un alleato adiacente può farlo col proprio VA (senza il malus se libero). Successo libera in uno spazio adiacente capace di accoglierla; il pareggio mantiene la presa. Il prigioniero attacca dall’interno con −4; la massa dà copertura totale. Rilascio gratuito; perdita di coscienza, morte o Menomazione del contenimento la liberano (0 PV no). All’uscita cessano cecità e ostruzione; il fiato torna dopo un Round di respiro normale.' },
    ],
    note: 'AR 3 biologica. Furtività 14 fra detriti vegetali compatibili. Condotta: attende fra detriti, poi Schianti o la sequenza Afferrare–Inglobare; sotto 15 PV o a Ferita Seria tenta di ritirarsi. Fonte: Shambling Mound, p. 270.',
  },
  {
    id: 'treant', nome: 'Treant',
    caratteristiche: { FOR: 10, DES: 4, COS: 10, INT: 6, SAG: 8, CAR: 6 },
    pv: 76, pm: 16, ar: { totale: 4, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 15, riflessi: 7, volonta: 12, magia: 12 },
    attacchi: [r('Schianto', 15, '2d6+3', 2, { proprieta: ['Contundente'] }), d('Roccia', 13, '3d6+3', 36, { proprieta: ['Contundente'], note: 'Una per Round. Richiede un masso libero di circa 30 kg già impugnato (raccoglierlo costa 1 AzP).' })],
    abilita: [{ nome: 'Corpo a corpo', va: 15 }, { nome: 'Atletica', va: 16 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Leggenda', px: 100, per_pg: 4 },
    capacita: [
      VEGETALE,
      { nome: 'Legno antico', effetto: 'Dimezza i danni fisici Naturali da Contusione e Perforazione, non Taglio. Fuoco di qualunque Natura ×2 prima di Difesa e AR (×3 complessivo se anche Magistrale). Il tronco è un corpo biologico, non una struttura con PI.' },
      { nome: 'Rocce e assedio', effetto: 'Con Schianto o Roccia, contro oggetti e strutture inerti infligge danno ×2, risolvendo PS Integrità e PI (Armamenti §7.2.1); non raddoppia contro costrutti o creature per la sola grandezza; un Magistrale con assedio dà ×3, non ×4.' },
      { nome: 'Animare alberi', effetto: 'Una volta ogni 24 ore, 1 AzP e 6 PM, senza Prova di Potere: anima uno o due alberi ordinari viventi, visibili entro 12 Q, ciascuno in grado di occupare 3 × 3 Q (non bersaglia Treant, Alberi risvegliati, oggetti morti o creature con coscienza). Profilo temporaneo: i valori dell’Albero risvegliato con INT 1, CAR 1, PM —, Volontà — e nessun linguaggio (immune a danni psichici, controllo mentale e Terrorizzato); PV 40, AR 3; solo Schianto di ramo, movimento e Difese. Non agisce nel Round dell’attivazione; poi 1 AzP e 1 AzM per Round, con lo stesso risultato di INI, dopo il Treant, che dà gratuitamente un ordine semplice alla propria Iniziativa. Dura 10 Round senza Concentrazione; torna inerte a scadenza, se il Treant perde coscienza o muore, oltre 24 Q da lui o per congedo gratuito. Negare Potere: potenza 6, un albero alla volta. I due alberi sono già compresi nei 100 PX.', risorsa: '6 PM', azioni: { principali: 1 }, usi: { quanti: 1, per: 'giorno' } },
    ],
    note: 'Altezza circa 7 Q. Il VA 13 è quello della Roccia, già in tabella: «Tiro naturale» non è un’Abilità (A.169, 18/10), non dà Armi da lancio né altre competenze. Furtività 14 immobile fra alberi compatibili. Parla il linguaggio del bosco e una lingua di contatto. Condotta: ferma incendi e abbattimenti, distingue gli intrusi dalle minacce reali, può avvertire o trattare prima di attaccare; sotto 19 PV o a Ferita Seria ripiega. Fonte: Treant, p. 289.',
  },
  {
    id: 'pegaso', nome: 'Pegaso',
    caratteristiche: { FOR: 9, DES: 7, COS: 7, INT: 5, SAG: 7, CAR: 6 },
    pv: 38, pm: 8, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 12, corsa: 24, scatto: 36, volo: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 12, volonta: 11, magia: 10 },
    attacchi: [r('Zoccoli', 12, '1d8+2', 1, { proprieta: ['Contundente'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 14 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Sensi e parola', effetto: 'Vista e udito ordinari, senza scurovisione. Comprende due lingue assegnate all’ambiente ma non parla con voce umanoide (gesti o una capacità di comunicazione adatta). Intelligenza e volontà personali. Braccia = zampe anteriori, Gambe = posteriori; le ali sono appendici delle Braccia.' },
      { nome: 'Volo', effetto: 'Ali reali: servono spazio e un percorso per la loro apertura. Non resta sospeso come un organismo fluttuante. Danni alle ali, perdita di coscienza o impedimenti possono causare la normale caduta. Volo e terra condividono il budget dei tragitti misti; salire in quota non dà AzM extra né attacchi in picchiata gratuiti.' },
      { nome: 'Cavaliere', effetto: 'Può accettare un cavaliere di spazio 1 × 1 Q con equipaggiamento entro il carico ordinario (movimento del profilo non sovraccarico). Pegaso e cavaliere mantengono Azioni, Difese e bersagli distinti. Una sella o bardatura aggiunta cambia la dotazione.' },
    ],
    note: 'Può diventare un alleato o un trasportatore consenziente. Condotta: cerca una via aerea libera, protegge un compagno scelto, può rifiutare un ordine suicida; sotto 9 PV o a Ferita Profonda si allontana. Fonte: Pegasus, p. 250.',
  },
  {
    id: 'unicorno', nome: 'Unicorno',
    caratteristiche: { FOR: 9, DES: 7, COS: 7, INT: 6, SAG: 8, CAR: 8 },
    pv: 50, pm: 20, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 11, volonta: 13, magia: 14 },
    attacchi: [
      r('Zoccoli', 14, '1d8+2', 1, { natura: 'Magico', proprieta: ['Contundente'] }),
      r('Corno', 14, '1d8+2', 1, { natura: 'Magico', proprieta: ['Perforazione'] }),
      r('Corno in carica', 14, '2d6+2', 1, { natura: 'Magico', proprieta: ['Perforazione'], note: 'Almeno 4 Q di movimento effettivo rettilineo verso la vittima nella stessa Iniziativa, poi 1 AzP; un uso per Round. Se infligge almeno 1 danno finale a una creatura ≤ 2 × 2 Q: Tempra senza modificatore, fallimento A Terra. Non applica Sbalzante né un secondo attacco gratuito.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    immunita: ['avvelenato'],
    capacita: [
      { nome: 'Protezione innata', effetto: 'Immune ai danni da veleno, ad Avvelenato, a Paralizzato e alle influenze di fascinazione che impongono fiducia o attrazione; non a ogni effetto mentale. Contro incantesimi e capacità mistiche +2 alle PS (Magia 14 lo comprende già; non migliora Difese o AR).' },
      { nome: 'Sensi e comunicazione', effetto: 'Scurovisione 12 Q. Parla il linguaggio silvano e una lingua di contatto; può rivolgere parole mentali a un interlocutore percepito entro 12 Q che comprenda una lingua (non legge pensieri; una protezione contro la telepatia lo impedisce). Localizzazioni equine, senza ali; il corno appartiene alla Testa.' },
      { nome: 'Sequenza', effetto: 'Al massimo due attacchi per Round, uno di Zoccoli e uno di Corno; poteri e Difese usano le stesse due AzP.' },
      { nome: 'Capacità innate', effetto: 'Senza Potere, Focus o Invocazione, senza Anticipazione; costi e Azioni obbligatori; l’ultimo PM causa Svenuto. Non apprende gli altri incantesimi della fonte.' },
      ROVI('Scelge un punto visibile entro 6 Q.'),
      { nome: 'Tocco risanante', effetto: '1 AzP e 6 PM, a contatto del corno, su un vivente consenziente o incosciente soccorso (anche su di sé), al massimo tre volte ogni 24 ore: ripristina 1d4+5 PV, oppure destina ogni 2 punti a ridurre Sanguinamento di 1, il resto ai PV. Segue i limiti di Cura Ferite 6, senza Talenti aggiuntivi; non oltre i massimi, non cura Ferite o Menomazioni, non stabilizza Morente.', risorsa: '6 PM', azioni: { principali: 1 }, usi: { quanti: 3, per: 'giorno' } },
      { nome: 'Purificazione', effetto: '6 PM e 10 minuti fuori dal combattimento, Concentrazione e contatto continuo del corno con un vivente consenziente o incosciente soccorso: rimuove una sola malattia naturale o un solo veleno naturale attivo, di Pericolosità non superiore a III, Profonda (la malattia va prima identificata con Medicina o informazioni attendibili; per un veleno non identificato sceglie il più pericoloso compatibile). Toglie la causa e gli Stati che mantiene; non restituisce PV, non cura Ferite, non cancella AFT, non concede immunità. L’interruzione impedisce la cura senza restituire PM.', risorsa: '6 PM' },
      { nome: 'Scudo luminoso', effetto: '1 AzP e 3 PM, su di sé o su un consenziente visibile entro 12 Q, per 2 Round senza Concentrazione: +2 alle Prove di Difese. Non dà Difese gratuite né AR; gli Scudi non si sommano. Negare Potere: potenza 3.', risorsa: '3 PM', azioni: { principali: 1 } },
      { nome: 'Passaggio del guardiano', effetto: 'Una volta ogni 24 ore, 1 AzP e 9 PM: teletrasporta sé e fino a tre altre creature consenzienti percepite entro 1 Q verso un luogo da lui visitato e conosciuto, entro 1.000 Q, con un’area d’arrivo libera e sostenuta per tutti (altrimenti fallisce e consuma AzP, PM e uso). Ogni partecipante porta la dotazione entro il proprio carico. Non trascina nemici o creature che rifiutano; non recide da sé legami materiali o mistici. Si usa alla propria Iniziativa, non come reazione. Istantaneo: Negare Potere non riporta indietro; interdizioni al teletrasporto lo bloccano (confronto con potenza 9). Non crea portali. È una capacità innata, non il Teletrasporto di livello 6.', risorsa: '9 PM', azioni: { principali: 1 }, usi: { quanti: 1, per: 'giorno' } },
    ],
    note: 'Il profilo da 70 PX comprende due AzP, attacchi Magici, cure limitate, Rovi e il Passaggio del guardiano; non ha Azioni Leggendarie né effetti regionali. Condotta: avverte, protegge, può usare Rovi per fermare un inseguitore; sotto 12 PV o a Ferita Profonda mette in salvo sé e gli alleati. Fonte: Unicorn, pp. 293–294.',
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
console.log(`${scritti} profili del blocco «Vegetali e custodi delle foreste» scritti in esempi/nemici/mostri/`);
