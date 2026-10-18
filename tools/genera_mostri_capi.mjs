// Blocco «Capi e varianti dei popoli guerrieri» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti; niente
// valori inventati. GS/PX informativo (A.161; GS «Elite» e PX non tondi 11/22/33/77 riportati così). Spazio ai soli
// valori quadrati (A.126); la Taglia non si deduce dall'ingombro (A.167, 18/10).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - Difese = Parata (valore dato dal manuale), Schivata / Elusione nelle note; AR «con Scudo» nel campo, senza nelle note.
//  - armi della dotazione come attacchi (Giavellotto a mano e lanciato con gittata e modalità S); la Lancia «una / due
//    mani» di Capoguerra e Occhio sono due attacchi (una mano, due mani). Il bonus personale (Forza brutale, Furia) è già
//    nel danno: nessuna capacità che lo aggiunga di nuovo.
//  - Disciplina hobgoblin, Attacco coordinato, Frenesia gnoll, Urlo di guerra, Agguato, Protezione opportunista, Sgusciare,
//    Avanzata aggressiva e Urto di Scudo: capacità con `azioni`, `risorsa` e `usi` dove il manuale dà un limite numerico.
//  - Occhio di Gruumsh: repertorio chiuso (Benedizione 3, Comando 3, Dardo Spirituale 3) come capacità, come per la Driade.
//  - Tossina della Zanna: capacità separata dal Morso (evento a parte); Tecnologia del Coboldo «per trappole semplici» e
//    il lancio «con Media» dell'Occhio nelle note.
//
// Uso: node tools/genera_mostri_capi.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Capi e varianti dei popoli guerrieri';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const d = (nome, va, danno, gittata_q, extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura: 'Naturale', gittata_q, modalita: ['S'], ac: 1, ...extra });
const scuro = { nome: 'Scurovisione', effetto: 'Vede entro 12 Q nel buio naturale, senza colori; non attraversa solidi, torbidità o fumo.' };
const CORPO = { nome: 'Corpo e Azioni', effetto: 'Natura Comune, con mente e PM personali; respira, mangia, beve e dorme; cure biologiche e normali Stati applicabili. Non appartiene alla Covata. A 0 PV si continua col §4.2 (non Svenuto né morto automaticamente; un ulteriore danno finale positivo a 0 PV richiede Tempra e la procedura delle Ferite; l’eccedenza del colpo che esaurisce i PV non genera da sola Ferite); a 0 PM personali Svenuto dopo la risoluzione completa dell’azione. INI modifica 1d10; AzP e unica AzM sono il budget dell’intero Round; ogni attacco costa 1 AzP e produce AC 1; i danni in tabella comprendono i bonus fissi personali (non sommare ancora FOR, DES, Forza brutale o Furia). Più armi, ali o arti non concedono altre Azioni. Una sola Opportunità ordinaria per Round, prima dell’uscita dalla portata, con un’arma ravvicinata pronta (o morso/artiglio consentito); comandi, Urlo e magia non sono Opportunità; con un tetto agli attacchi, Opportunità e attacco ordinato lo consumano. Parata: 1 AzP, arma o scudo idonei, successo dimezza per eccesso prima dell’AR, Magistrale annulla; nessuna Parata naturale; armi ravvicinate −8 VA per parare a distanza, Scudo piccolo o medio −4 con ulteriore −2 contro Raffica. Schivata: 1 AzP, 1 AzM, consapevolezza e spazio. Naturale e Magico incontrano l’AR pertinente, Etereo solo quella magica. Estrarre, riporre o recuperare un oggetto costa 1 AzP (abbandonarlo è gratuito). Armatura Media: −1 ai VA degli attacchi, alla Schivata e alle Prove fisiche ostacolate e −1 Q al budget scelto; Pesante −2 VA e −2 Q (Parata, Percezione e PS non ricevono questi malus; i valori pronti li comprendono già; a 0 PI la protezione perde AR ma mantiene le penalità).' };
const CATENA = { nome: 'Catena di comando', effetto: 'Un ordine ordinario non costringe un alleato a obbedire: richiede comprensione e un rapporto di comando o accordo effettivi; non è telepatia né controllo mentale. Le capacità funzionano solo sui beneficiari indicati; un alleato non ottiene conoscenze che il capo non possiede né può colpire un bersaglio fuori portata o non localizzato.' };
const DISCIPLINA = { nome: 'Disciplina hobgoblin', azioni: { principali: 1 }, usi: { quanti: 1, per: 'scontro' }, limiti: 'Alla propria Iniziativa; dura fino alla fine del terzo Round successivo all’attivazione, salvo interruzione. Consuma una delle AzP del comandante.', effetto: 'A ogni singolo evento, fino a quattro alleati consenzienti entro 6 Q, visibili al comandante e capaci di udire e comprendere le sue istruzioni, ricevono +1 al VA dei tiri per colpire e delle PS; il comandante è escluso. Non migliora Difese, Potere, danni, AR, Movimento o Azioni. Fra più Discipline vale solo +1; come bonus di comando non si somma a Benedizione, Efficienza o altri bonus magici alla stessa Prova (si usa il maggiore). Uscire dai requisiti sospende il beneficio per quell’evento; rientrare non prolunga la durata. Il comandante deve poter parlare ed essere cosciente e operativo: Svenuto, Stordito, Paralizzato o impossibilità di comunicare interrompono l’attivazione. Negare Potere non rimuove un ordine non magico.' };
const COORDINATO = { nome: 'Attacco coordinato', passiva: true, effetto: 'Una volta per Round +3 danni a un singolo colpo d’arma riuscito se un proprio alleato cosciente, capace di attaccare, minaccia in mischia la vittima da entro 1 Q. Si aggiunge prima di moltiplicatori, Difese e AR, alla stessa AC (anche su Opportunità o colpo ordinato, se non già usato nel Round). Il +3 non è incluso nei danni in tabella. Numero di alleati, più AC e ulteriori colpi non moltiplicano il beneficio; nessuno spende Azioni per concederlo.' };
const FRENESIA = { nome: 'Frenesia gnoll', passiva: true, limiti: 'Una volta per Round; il Morso di Frenesia non può attivare un’altra Frenesia.', effetto: 'Se un proprio attacco ravvicinato alla propria Iniziativa rende un nemico Svenuto, Morente o morto, ottiene subito 1 AzP aggiuntiva utilizzabile soltanto per un Morso contro un altro nemico in portata. Può prima spendere la propria AzM del Round, se ancora disponibile; nessuna AzM aggiuntiva. 0 PV senza tali esiti, resa o fuga non bastano.' };
const FUORI_INIZIATIVA = 'Ordini fuori Iniziativa: incitare la Frenesia permette un singolo attacco immediato pagato dal destinatario con 1 AzP ancora disponibile del Round (non è una nuova Iniziativa, non concede Movimento e non attiva Frenesia); lo stesso destinatario riceve al massimo un attacco ordinato per Round da qualsiasi numero di capi, conserva la propria Opportunità se il tetto del profilo lo consente e non può spendere un’AzP di Frenesia non ancora ottenuta.';

const CREATURE = [
  {
    id: 'capo-goblin', nome: 'Capo goblin',
    caratteristiche: { FOR: 4, DES: 7, COS: 5, INT: 6, SAG: 5, CAR: 6 },
    pv: 26, pm: 8, ar: { totale: 2, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 9, riflessi: 11, volonta: 10, magia: 9 },
    attacchi: [r('Spada leggera', 11, '1d6+2', 1, { proprieta: ['Taglio'] }), r('Giavellotto a mano', 10, '1d6', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 11, '1d6+1', 12, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da mischia', va: 11 }, { nome: 'Armi da guerra', va: 10 }, { nome: 'Armi da lancio', va: 11 }, { nome: 'Furtività', va: 13 }, { nome: 'Percezione', va: 10 }, { nome: 'Oratoria', va: 11 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      CORPO, CATENA, scuro,
      { nome: 'Dotazione', effetto: 'Spada leggera FOR 3 PI 5; due Giavellotti della sentinella FOR 3 PI 4; Armatura leggera AR 1 FOR 3 PI 6; Scudo piccolo AR +1 FOR 3 PI 4. Tutto Comune, PS Integrità 10. Inizia con Spada e Scudo pronti. Al massimo due attacchi per Round, Opportunità e colpo ordinato compresi; il secondo tiro per colpire del Round ha −2 VA, qualunque sia la sua origine. I 22 PX comprendono la dotazione.' },
      { nome: 'Sgusciare', limiti: 'Una volta per Round, prima di iniziare il proprio Passo.', effetto: 'Sceglie un nemico visibile: il movimento non provoca la sua Opportunità (può provocare quelle degli altri). Corsa, Scatto e Carica non ricevono il beneficio. Se termina quel Passo in condizioni adatte può effettuare Furtività per nascondersi senza un’ulteriore AzP; non diventa invisibile. Conserva lo Sgusciare del Goblin senza Movimento aggiuntivo.' },
      { nome: 'Protezione opportunista', azioni: { principali: 1 }, limiti: 'Una volta per Round, solo se ha ancora una AzP disponibile.', effetto: 'Prima del tiro per colpire di un attacco diretto solo contro il Capo, può farsi sostituire da un altro Goblin consenziente entro 1 Q. Deve percepire l’attacco; entrambi coscienti, mobili e in condizioni di reagire; il sostituto deve avere spazio per occupare la posizione e non può essere trattenuto, Immobilizzato o incapace di muoversi. I due scambiano la posizione (unico Movimento concesso, non consuma l’AzM del sostituto; non supera barriere né occupa un Q impraticabile; nessuna Opportunità per questa sola sostituzione). Il sostituto diventa il bersaglio solo se nella posizione del Capo è ancora valido per lo stesso attacco; si ricalcolano i modificatori e si tira; fa le proprie Difese senza ereditare quelle del Capo; il danno si applica a lui. Non si usa dopo aver conosciuto tiro, danni o Salvezza; non devia Aree, Raffiche, attacchi a più bersagli o effetti senza tiro per colpire; non assorbe un colpo già risolto né trasferisce Stati. Se mancano i requisiti non si spende l’AzP. Il sostituto non spende AzP; il consenso non nasce dalla sola intimidazione o dalla stessa specie e può venir meno se la banda abbandona il capo.' },
    ],
    note: 'AR 2 con Scudo piccolo, 1 senza. Parla Comune e Goblin. Guida con agguati, minacce e vie di fuga; preferisce farsi proteggere dai seguaci. Condotta: sotto 7 PV, a Ferita Profonda o senza seguaci cerca una via di fuga o offre informazioni. Fonte: Goblin Boss, p. 166.',
  },
  {
    id: 'capitano-hobgoblin', nome: 'Capitano hobgoblin',
    caratteristiche: { FOR: 7, DES: 6, COS: 7, INT: 6, SAG: 5, CAR: 7 },
    pv: 44, pm: 10, ar: { totale: 3, magica: 0 }, difese: 12, iniziativa: 1,
    movimento: { passo: 5, corsa: 11, scatto: 17 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 10, volonta: 11, magia: 10 },
    attacchi: [r('Spadone', 12, '2d6+2', 1, { proprieta: ['Taglio'] }), r('Giavellotto a mano', 12, '1d6+1', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 10, '1d6', 21, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da guerra', va: 12 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Atletica', va: 11 }, { nome: 'Furtività', va: 9 }, { nome: 'Percezione', va: 11 }, { nome: 'Oratoria', va: 12 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      CORPO, CATENA, scuro, DISCIPLINA, COORDINATO,
      { nome: 'Dotazione', effetto: 'Spadone a due mani FOR 6 PI 6; due Giavellotti della sentinella FOR 3 PI 4; Armatura media AR 3 FOR 5 PI 8. Tutto Comune, PS Integrità 10. Inizia con lo Spadone pronto, senza Scudo. Un lancio richiede di liberare una mano e preparare il Giavellotto (la mano libera non rende pronto quello riposto). Al massimo due attacchi per Round, Opportunità e colpo ordinato compresi. Attivare la Disciplina consuma una delle sue due AzP. I 55 PX comprendono la dotazione.' },
    ],
    note: 'Parata 12 (valore delle Difese); Schivata / Elusione 10. I VA pronti includono la Media: rimuovendola si recuperano +1 ai VA fisici penalizzati e Movimento 6 / 12 / 18 Q; Parata e PS restano invariate. Parla Comune e Goblin. Coordina una pattuglia e apre un varco con lo Spadone. Condotta: sotto 11 PV o a Ferita Profonda cerca una ritirata ordinata; resa o trattativa restano possibili. Fonte: Hobgoblin Captain, p. 186.',
  },
  {
    id: 'signore-della-guerra-hobgoblin', nome: 'Signore della guerra hobgoblin',
    caratteristiche: { FOR: 8, DES: 6, COS: 8, INT: 7, SAG: 6, CAR: 8 },
    pv: 68, pm: 12, ar: { totale: 7, magica: 0 }, difese: 14, iniziativa: 1,
    movimento: { passo: 4, corsa: 10, scatto: 16 }, spazio: '1 Q',
    azioni: { principali: 3, movimento: 1 }, salvezze: { tempra: 13, riflessi: 11, volonta: 13, magia: 11 },
    attacchi: [r('Spada lunga', 13, '1d8+3', 1, { proprieta: ['Taglio'] }), r('Giavellotto a mano', 13, '1d6+2', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 11, '1d6+1', 24, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da guerra', va: 13 }, { nome: 'Armi da lancio', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Furtività', va: 8 }, { nome: 'Percezione', va: 12 }, { nome: 'Oratoria', va: 14 }],
    gs_px: { gs: 'Elite', px: 77, per_pg: 4 },
    capacita: [
      CORPO, CATENA, scuro, DISCIPLINA, COORDINATO,
      { nome: 'Dotazione', effetto: 'Spada lunga FOR 4 PI 5; due Giavellotti della sentinella FOR 3 PI 4; Armatura pesante AR 5 FOR 7 PI 10; Scudo medio AR +2 FOR 5 PI 6. Tutto Comune, PS Integrità 10. Inizia con Spada e Scudo pronti. Al massimo tre attacchi per Round complessivi, dei quali non più di due lanci, Opportunità e attacco ordinato compresi; serve un Giavellotto distinto e pronto per ogni lancio. La Parata usa il VA 14 e costa ogni volta 1 AzP (non si importa la Reazione gratuita della fonte). Attivare la Disciplina lascia due AzP. I 77 PX comprendono la dotazione.' },
      { nome: 'Urto di Scudo', azioni: { principali: 1 }, prova: 'Armi da guerra 13 −2 (VA 11) contro Atletica o Schivata del bersaglio', effetto: 'Variante di atterramento senza danno (Sbilanciare Migliorato −2; la penalità della Pesante è già nel 13): un nemico adiacente entro 1 Q, di taglia non maggiore del comandante; occorrono lo Scudo medio impugnato e integro, terreno che consenta il contatto e la possibilità di spinta. Il bersaglio si oppone con Atletica oppure Difese per Schivare, a propria scelta: opposizione difensiva della capacità, senza costo di AzP o AzM e senza ulteriore Schivata o Parata (Immobilizzato e altre penalità fisiche si applicano; non si usano le PS). Se vince il comandante il bersaglio è A Terra nel proprio spazio: nessun danno ai PV o ai PI, spostamento, AC da localizzare o Magistrale automatico; un bersaglio già A Terra non subisce un effetto aggiuntivo. Consuma uno dei tre impieghi offensivi del Round, non è Opportunità né attacco ordinato; non atterra automaticamente un Ogre, un volatore fuori portata o una creatura senza assetto compatibile; non si applicano Attacco coordinato, bonus al danno o Furia. Possedere uno Scudo non concede questa variante in generale.' },
    ],
    note: 'AR 7 con Scudo medio, 5 senza; Parata 14 (valore delle Difese), Schivata / Elusione 9. I VA pronti includono la Pesante: rimuovendola recupera +2 ai VA fisici penalizzati e Movimento 6 / 12 / 18 Q, perdendo AR 5 (lo Scudo resta distinto). Parla Comune e Goblin. Veterano in armatura completa: guida il reparto, sfrutta i fianchi scoperti e alterna colpi e Parate. Condotta: sotto 17 PV o a Ferita Profonda cerca copertura, rinforzi o condizioni di resa; non combatte fino alla morte. Fonte: Hobgoblin Warlord, p. 187.',
  },
  {
    id: 'capobanda-bugbear', nome: 'Capobanda bugbear',
    caratteristiche: { FOR: 8, DES: 6, COS: 7, INT: 6, SAG: 6, CAR: 6 },
    pv: 50, pm: 9, ar: { totale: 4, magica: 0 }, difese: 12, iniziativa: 1,
    movimento: { passo: 5, corsa: 11, scatto: 17 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 10, magia: 10 },
    attacchi: [r('Mazza ferrata', 13, '1d6+5', 1, { proprieta: ['Contusione'] }), r('Giavellotto a mano', 12, '1d6+4', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 10, '1d6+1', 24, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da mischia', va: 13 }, { nome: 'Armi da guerra', va: 12 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Furtività', va: 13 }, { nome: 'Percezione', va: 11 }, { nome: 'Sopravvivenza', va: 12 }, { nome: 'Oratoria', va: 12 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      CORPO, CATENA, scuro,
      { nome: 'Dotazione e forza', effetto: 'Mazza ferrata FOR 4 PI 5; due Giavellotti della sentinella FOR 3 PI 4; Armatura media AR 3 FOR 5 PI 8; Scudo piccolo AR +1 FOR 3 PI 4. Tutto Comune, PS Integrità 10. Inizia con Mazza e Scudo. Forza brutale: +2 ai danni personali delle armi ravvicinate, già inclusi (non si trasferisce a oggetti raccolti, lanci o danni periodici). Al massimo due attacchi per Round, Opportunità e colpo ordinato compresi. I 55 PX comprendono la dotazione.' },
      { nome: 'Agguato', usi: { quanti: 1, per: 'scontro' }, limiti: 'Nel primo Round cui partecipa; si consuma anche mancando.', effetto: 'Dichiara prima del tiro +2 danni a un proprio attacco ravvicinato contro una vittima che non lo aveva individuato prima dell’attacco. Stessa AC, prima di moltiplicatori, Difese e AR. Vincere l’Iniziativa o sfruttare una Distrazione non dimostra da solo un agguato.' },
      { nome: 'Tenacia', passiva: true, effetto: '+2 alla sola PS pertinente contro fascinazione, Terrorizzato, Paralizzato, Avvelenato, Stordito e Sonno, senza immunità o PS aggiuntive quando non previste. La robustezza mentale non lo rende immune agli incantesimi.' },
    ],
    note: 'AR 4 con Scudo piccolo, 3 senza; Parata 12 (valore delle Difese), Schivata / Elusione 10. La Media è già conteggiata: rimossa recupera +1 ai VA fisici penalizzati e Movimento 6 / 12 / 18 Q. Parla Comune e Goblin. Capo fisicamente potente, abile nel colpire da un riparo e nel radunare seguaci intimiditi. Condotta: sotto 13 PV o a Ferita Profonda può abbandonare la banda. Fonte: Bugbear Chief, p. 33.',
  },
  {
    id: 'coboldo-alato', nome: 'Coboldo alato',
    caratteristiche: { FOR: 3, DES: 6, COS: 4, INT: 5, SAG: 4, CAR: 4 },
    pv: 12, pm: 5, ar: { totale: 0, magica: 0 }, difese: 9, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 6 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 10, volonta: 8, magia: 8 },
    attacchi: [r('Pugnale a mano', 9, '1d4+2', 1, { proprieta: ['Perforazione'] }), d('Pugnale lanciato', 9, '1d4+2', 9, { proprieta: ['Perforazione'] }), d('Pietra lasciata cadere', 9, '1d4+1', 6, { proprieta: ['Contusione'], note: 'Bersaglio visibile direttamente sotto la verticale, senza ostacoli; non è un’Area.' })],
    abilita: [{ nome: 'Armi da mischia', va: 9 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Furtività', va: 11 }, { nome: 'Percezione', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Tecnologia', va: 10 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      CORPO, scuro,
      { nome: 'Dotazione e attacchi', effetto: 'Tre Pugnali Comuni FOR 2 PI 4, PS Integrità 10, e tre pietre; una pietra già pronta in una mano, un Pugnale nell’altra. La pietra è una munizione improvvisata di questo profilo, non un’arma recuperabile con proprietà speciali. Ogni lancio o caduta consuma un oggetto pronto; prepararne un altro costa 1 AzP. Al massimo un attacco per Round, Opportunità e colpo ordinato compresi; l’Opportunità usa solo il Pugnale impugnato. I 11 PX comprendono la dotazione.' },
      { nome: 'Branco e sole', passiva: true, effetto: '+2 al VA del tiro per colpire se un alleato cosciente e capace di attaccare minaccia la vittima in mischia da entro 1 Q (nessun secondo vantaggio numerico per la stessa circostanza). −2 ai tiri per colpire e a Percezione basata sulla vista se il Coboldo oppure il bersaglio è sotto sole diretto (una sola penalità anche se entrambi lo sono; luce diffusa o artificiale non basta).' },
      { nome: 'Volo', effetto: 'Ali e spazio funzionali necessari; può sostenersi battendole senza percorso minimo. Corsa e Scatto in volo richiedono Atletica −2 e −4; quota, decollo e atterraggio usano l’unica AzM; perdita del sostegno o incoscienza possono farlo cadere.' },
    ],
    note: 'Tecnologia 10 vale solo per trappole semplici. Variante alata del Coboldo che passa sopra gli ostacoli e lascia cadere pietre; vulnerabilità al sole e tattiche di branco restano. Parla Comune e Draconico. Condotta: sotto 3 PV o isolato cerca un riparo o fugge. Fonte: Winged Kobold, p. 195.',
  },
  {
    id: 'capobranco-gnoll', nome: 'Capobranco gnoll',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 5, SAG: 5, CAR: 5 },
    pv: 40, pm: 9, ar: { totale: 3, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 5, corsa: 11, scatto: 17 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1, eccezioni: 'più l’eventuale AzP aggiuntiva della Frenesia gnoll, utilizzabile solo per un Morso' }, salvezze: { tempra: 11, riflessi: 10, volonta: 9, magia: 9 },
    attacchi: [r('Arma inastata pesante', 12, '1d8+2', 2, { proprieta: ['Taglio'] }), r('Morso', 11, '1d4+2', 1, { proprieta: ['Perforazione'], note: 'Naturale: non concede Parata naturale a chi lo usa; nessuna Salvezza o infezione aggiuntiva.' }), d('Arco da guerra', 11, '1d6+1', 100, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da guerra', va: 12 }, { nome: 'Armi da lancio', va: 11 }, { nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Sopravvivenza', va: 12 }, { nome: 'Oratoria', va: 11 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      CORPO, CATENA, scuro, FRENESIA,
      { nome: 'Dotazione', effetto: 'Arma inastata pesante a due mani FOR 6 PI 6; Arco da guerra a due mani FOR 5 PI 6 con 20 frecce; Armatura media AR 3 FOR 5 PI 8. Tutto Comune, PS Integrità 10. Inizia con l’arma inastata, senza Scudo. Incoccare è compreso nell’attacco con arco pronto; il cambio d’arma segue le AzP ordinarie. Al massimo due attacchi normali per Round, Opportunità e colpo ordinato compresi, più l’unico Morso eventualmente ottenuto da Frenesia. I 33 PX comprendono la dotazione.' },
      { nome: 'Incitare la Frenesia', azioni: { principali: 1 }, risorsa: '2 PM', limiti: 'Una volta per Round, alla propria Iniziativa.', effetto: `Un altro alleato con la capacità Frenesia gnoll, visibile entro 6 Q e capace di udire e comprendere il richiamo, può effettuare subito un singolo attacco ravvicinato pagando 1 propria AzP ancora disponibile. Non concede un’AzP, un nuovo Morso gratuito o un attacco con l’arco. ${FUORI_INIZIATIVA}` },
    ],
    note: 'Parata 11 (valore delle Difese), Schivata / Elusione 10. La Media è già inclusa: rimossa recupera +1 ai VA fisici penalizzati e Movimento 6 / 12 / 18 Q. Parla Comune e Gnoll. Coordina il branco con richiami e assalti ravvicinati. Condotta: sotto 10 PV o a Ferita Profonda cerca di riunire i superstiti e ripiegare. Fonte: Gnoll Pack Lord, p. 163.',
  },
  {
    id: 'zanna-di-yeenoghu', nome: 'Zanna di Yeenoghu',
    caratteristiche: { FOR: 8, DES: 6, COS: 7, INT: 5, SAG: 5, CAR: 6 },
    pv: 54, pm: 10, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 3, movimento: 1, eccezioni: 'più l’eventuale AzP aggiuntiva della Frenesia gnoll, utilizzabile solo per un Morso' }, salvezze: { tempra: 12, riflessi: 11, volonta: 11, magia: 10 },
    attacchi: [r('Artiglio', 13, '1d8+2', 1, { proprieta: ['Taglio'], note: 'Parte del corpo: non concede Parata.' }), r('Morso', 13, '1d6+2', 1, { proprieta: ['Perforazione'], note: 'Più tossina se applicabile: vedi «Tossina». Parte del corpo: non concede Parata.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Sopravvivenza', va: 12 }, { nome: 'Furtività', va: 10 }, { nome: 'Oratoria', va: 12 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      CORPO, CATENA, scuro, FRENESIA,
      { nome: 'Attacchi e dotazione', effetto: 'Armatura leggera Comune AR 1 FOR 3 PI 6, PS Integrità 10; nessuna arma impugnata. Al massimo tre attacchi normali per Round, dei quali non più di due Artigli e un Morso, Opportunità e colpo ordinato compresi. Il Morso di Frenesia può aggiungersi ed è l’unica eccezione al limite di un Morso; non genera un’altra Frenesia. I 55 PX comprendono la dotazione.' },
      { nome: 'Tossina', prova: 'PS di Tempra senza modificatore', limiti: 'Una sola volta per Round, sul primo Morso che infligge almeno 1 danno fisico finale a una vittima biologicamente vulnerabile.', effetto: 'Tempra senza modificatore: fallimento 1d6 Naturale da veleno immediato, senza ulteriore tiro per colpire; successo evita. Non incontra di nuovo l’AR ordinaria della ferita (si applicano protezioni specifiche contro veleno). È un evento separato dal morso, non moltiplicato dal suo Magistrale e capace di richiedere Tempra per Ferite se raggiunge una vittima a 0 PV. L’uso si consuma quando il primo Morso produce la PS, anche se la vittima la supera; un bersaglio immune o privo di fisiologia compatibile non riceve la tossina e non consuma l’uso. Il Morso di Frenesia la inietta solo se non già applicata nel Round. Veleno naturale di Pericolosità II, Importante; l’immunità al veleno o ad Avvelenato la evita. Nessuno Stato Avvelenato persistente, dosi periodiche o danni retroattivi; Cura Avvelenamenti non restituisce PV né annulla Ferite. Se il danno fisico del Morso è interamente assorbito non c’è esposizione.' },
      { nome: 'Influenza spirituale', passiva: true, effetto: 'La possessione demoniaca all’origine del campione è conservata come influenza su una creatura vivente: nessun secondo avversario annidato, riserva esterna o trasferimento alla morte; nessuna Natura Oscura Simmetria, CROS, immunità o danno Etereo. Conserva mente e PM: Dardo Psichico, Dardo Spirituale e influenze mentali la raggiungono secondo le proprie schede; la fedeltà al culto non è un’immunità. Nessun contagio: morso, sangue, vicinanza o uccisione non trasferiscono la condizione né aumentano CROS; altri campioni, un demone autonomo o un esorcismo richiedono un effetto o un’avventura definiti separatamente. Negare Potere non cancella artigli, Frenesia o addestramento.' },
    ],
    note: 'Nessuna immunità biologica o mentale. Parla Gnoll e Abissale. Variante dal morso tossico e dagli artigli sviluppati: la scheda ne definisce solo il corpo combattente. Condotta: sotto 14 PV o a Ferita Profonda può ripiegare verso il branco oppure obbedire a una consegna fanatica fissata dal Direttore; nessun bonus o PX per il solo appellativo demoniaco. Fonte: Gnoll Fang of Yeenoghu, pp. 162–163.',
  },
  {
    id: 'capoguerra-orco', nome: 'Capoguerra orco',
    caratteristiche: { FOR: 8, DES: 5, COS: 8, INT: 6, SAG: 5, CAR: 8 },
    pv: 56, pm: 11, ar: { totale: 3, magica: 0 }, difese: 12, iniziativa: 0,
    movimento: { passo: 5, corsa: 11, scatto: 17 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 10, volonta: 12, magia: 10 },
    attacchi: [r('Ascia bipenne', 13, '2d6+5', 1, { proprieta: ['Taglio'] }), r('Lancia a una mano', 13, '1d6+5', 2, { proprieta: ['Perforazione'] }), r('Lancia a due mani', 13, '1d6+7', 2, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da guerra', va: 13 }, { nome: 'Armi da lancio', va: 11 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Oratoria', va: 14 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      CORPO, CATENA, scuro,
      { nome: 'Dotazione e Furia', effetto: 'Ascia bipenne a due mani FOR 6 PI 6; Lancia FOR 5 PI 6; Armatura media AR 3 FOR 5 PI 8. Tutto Comune, PS Integrità 10. Inizia con la Bipenne pronta, senza Scudo. Furia: +2 al danno personale delle armi del profilo, già inclusi (non dà Natura Magica, non si trasferisce all’arma, non modifica danni periodici). La Lancia non ha un profilo di lancio e non si usa come Giavellotto. Al massimo due attacchi per Round, Opportunità e colpo ordinato compresi. I 55 PX comprendono la dotazione.' },
      { nome: 'Avanzata aggressiva', limiti: 'Una volta per Round.', effetto: 'Può usare la propria AzM come Passo verso un nemico visibile con budget 7 Q anziché 5. Il percorso non può allontanarlo dal nemico e deve terminare più vicino. Nessun’altra AzM né aumento a Corsa, Scatto, Schivata o Carica; Opportunità normali. Rimuovendo la Media il Passo aggressivo arriva a 8 Q.' },
      { nome: 'Urlo di guerra', azioni: { principali: 1 }, risorsa: '2 PM', usi: { quanti: 1, per: 'scontro' }, limiti: 'Alla propria Iniziativa; la scena deve essere conclusa prima di recuperare l’uso (allontanarsi per un Round o cambiare bersaglio non basta); i PM spesi non tornano con l’uso.', effetto: 'Sceglie fino a quattro altri alleati consenzienti visibili entro 6 Q che possano udire e comprendere il richiamo (il Capoguerra non è un beneficiario). L’effetto inizia dopo l’attivazione e termina all’inizio della successiva Iniziativa del Capoguerra (se non può avvenire, allo stesso conteggio d’Iniziativa del Round successivo). +2 al VA dei tiri per colpire dei beneficiari: nessun bonus a Difese, Potere, PS, danni o Azioni; nessun attacco immediato, movimento fuori turno o opportunità aggiuntive; non esegue il colpo gratuito della fonte. Fra Urli vale il maggiore; per la stessa Prova non si somma a Disciplina hobgoblin, Benedizione, Efficienza o altri bonus magici (vale il maggiore); le Tattiche di branco non si contano due volte come stesso vantaggio numerico. Dopo il richiamo non occorre restare in gittata; la perdita di coscienza del Capoguerra non cancella l’impeto. Non è controllo mentale: la paura impone ancora i propri divieti. Negare Potere non lo rimuove. Il favore attribuito a Gruumsh è rappresentato da Furia e Urlo, senza altri effetti spirituali.' },
    ],
    note: 'Parata 12 (valore delle Difese), Schivata / Elusione 9. I VA includono già −1 da Media; rimossa si recupera +1 ai VA fisici penalizzati e Passo / Corsa / Scatto tornano 6 / 12 / 18 Q. Parla Comune e Orchesco. Veterano che concentra un assalto con un richiamo; non rappresenta automaticamente tutti gli Orchi; nessuna Frenesia gnoll. Condotta: sotto 14 PV o a Ferita Profonda può cercare una posizione protetta, trattare o ritirarsi. Fonte: Orc War Chief, p. 246.',
  },
  {
    id: 'occhio-di-gruumsh', nome: 'Occhio di Gruumsh',
    caratteristiche: { FOR: 7, DES: 5, COS: 7, INT: 5, SAG: 7, CAR: 6 },
    pv: 36, pm: 18, ar: { totale: 5, magica: 0 }, difese: 11, iniziativa: 0,
    movimento: { passo: 5, corsa: 11, scatto: 17 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 11, riflessi: 9, volonta: 11, magia: 11 },
    attacchi: [r('Lancia a una mano', 11, '1d6+4', 2, { proprieta: ['Perforazione'] }), r('Lancia a due mani', 11, '1d6+6', 2, { proprieta: ['Perforazione'], note: 'Richiede di riporre o abbandonare lo Scudo (AR scende a 3).' })],
    abilita: [{ nome: 'Armi da guerra', va: 11 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Oratoria', va: 12 }, { nome: 'Occultismo', va: 11 }, { nome: 'Potere', va: 12 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      CORPO, CATENA, scuro,
      { nome: 'Dotazione e Furia', effetto: 'Lancia FOR 5 PI 6; Armatura media AR 3 FOR 5 PI 8; Scudo medio AR +2 FOR 5 PI 6. Tutto Comune, PS Integrità 10. Focus personale semplice già sintonizzato, senza PM o bonus (Equipaggiamento §5.8). Inizia con Lancia a una mano e Scudo. La Lancia non è un Giavellotto. Un solo attacco d’arma per Round, Opportunità e colpo ordinato compresi; il lancio di un incantesimo usa l’AzP e non aggiunge un attacco d’arma. Furia: +2 ai danni personali della Lancia, già inclusi, senza Natura Magica. I 33 PX comprendono la dotazione.' },
      { nome: 'Avanzata aggressiva', limiti: 'Una volta per Round.', effetto: 'Proprio Passo 7 Q con Media verso un nemico visibile, senza allontanarsi lungo il percorso e terminando più vicino. Nessuna AzM aggiuntiva o aumento delle altre andature. Opportunità normali. Rimossa la Media il Passo aggressivo arriva a 8 Q.' },
      { nome: 'Repertorio e lancio', effetto: 'Utilizzatore autorizzato con repertorio chiuso: soltanto Benedizione 3, Comando 3 e Dardo Spirituale 3, nelle versioni qui indicate; nessun Addestramento Taumaturgo, Contromagia, Anticipazione, Meditazione o Convertire Potere; nessun altro livello, rituale o presagio, né una creatura armata evocata. Ogni lancio richiede 1 AzP e 3 PM, pagati prima della Prova. Potere base 12, con −3 da Armatura media: VA di lancio 9 anche al livello 3; Ingaggio −2 quando pertinente (7); mancanza di Focus, Gesti o Invocazione dà ciascuna il normale −2 (fino a −6); per Comando la voce è obbligatoria. Fallimento consuma AzP e PM; Magistrale e Maldestro seguono la Magia. Nessuna esclusione delle Componenti: deve liberare una mano per i Gesti (abbandonare la Lancia è gratuito, riprenderla costa 1 AzP; per la Lancia a due mani deve riporre lo Scudo, perdendone l’AR); il Focus semplice non è una batteria e può omettere i Gesti accettando la penalità dove consentito. Gli effetti istantanei non restano disponibili per una dissoluzione successiva.' },
      { nome: 'Benedizione 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'VA di lancio 9 (Potere 12 −3 Media)', effetto: 'Magia §23.3: fino a due beneficiari consenzienti visibili entro 6 Q, sé stesso compreso (se due, concatenati entro 2 Q al lancio). +1 alle Prove di Abilità, Caratteristica e alle quattro PS per 10 Round, senza Concentrazione né PS iniziale; nessun bonus a danni, AR, PV, PM, Azioni o Movimento. Uscire dalla gittata non lo elimina. Si usa il maggiore bonus magico pertinente e non si somma a Disciplina o Urlo sulla stessa Prova. Durata 10 applicata nel Round R: termina a fine Round R + 10; incoscienza o morte dell’Occhio non la cancellano; Negare Potere la rimuove da un beneficiario (potenza 3).' },
      { nome: 'Comando 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'PS di Volontà del bersaglio', effetto: 'Magia §19.2: un bersaglio visibile entro 6 Q, capace di udire e comprendere un singolo ordine di massimo tre parole; Volontà senza modificatore evita (Barriera Mentale migliora la PS). Nessun tiro per colpire, AR, Parata, Schivata o Elusione. Fallita la PS, tenta l’ordine nel primo proprio turno successivo entro al massimo 1 AzP e l’AzM disponibili, senza ottenerne altre; l’effetto scade alla fine di quel turno. Non impone autolesionismo diretto, tradimento di principi morali profondi o lealtà, uso di incantesimi o spesa di PM e PE. «Fermo» impedisce il Movimento volontario ma conserva AzP e Difese; «Cadi» costa al bersaglio 1 AzP per andare A Terra e impedisce di rialzarsi in quel turno. Il tentativo soddisfa l’ordine anche se fallisce. Un comando palesemente impossibile al lancio consuma PM senza effetto; un’impossibilità sopravvenuta applica la perdita del turno, senza Stordito. Un solo Comando attivo per vittima (un nuovo lancio con PS fallita sostituisce il precedente); i danni non lo terminano; Negare Potere 3 lo rimuove prima dell’esecuzione. Nessuna preparazione gratuita con Oratoria.' },
      { nome: 'Dardo Spirituale 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'PS di Magia del bersaglio', effetto: 'Magia §23.5: una creatura vivente o entità spirituale ammessa, visibile entro 6 Q. Infligge 1d4 danni Eterei ai PV e sottrae 1 PM personale; Magia senza modificatore dimezza separatamente per eccesso il danno (il singolo PM è comunque perso salvo protezioni specifiche). Nessun tiro per colpire o Difesa attiva. Una AC per i PV: l’AR magica assorbe, quella ordinaria no. La perdita di PM è distinta, non ridotta dall’AR e non ricevuta dall’Occhio. Non colpisce oggetti, dispositivi, Ectoplasma o costrutti puramente meccanici salvo eccezioni del Bestiario; PM — non è 0 PM. Scudo Spirituale modifica la PS e la perdita di PM; Barriera Mentale non protegge. A 0 PM personali l’incoscienza si verifica dopo la risoluzione completa dell’azione.' },
    ],
    note: 'AR 5 con Scudo medio, 3 senza; Parata 11 (valore delle Difese), Schivata / Elusione 9. Rimossa la Media recupera +1 ai VA fisici penalizzati, lancio Potere 12 e Movimento 6 / 12 / 18 Q. Il valore di Percezione rappresenta già il profilo con un occhio: nessuna penalità generica permanente; titolo e menomazione rituale non concedono immunità. Parla Comune e Orchesco. Ministro di un culto guerriero. Condotta: sotto 9 PV o a Ferita Profonda cerca protezione o si arrende secondo il culto e la situazione. Fonte: Orc Eye of Gruumsh, p. 247.',
  },
  {
    id: 'mezzogre', nome: 'Mezzogre (Ogrillon)',
    caratteristiche: { FOR: 8, DES: 5, COS: 7, INT: 4, SAG: 4, CAR: 5 },
    pv: 36, pm: 6, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 9, volonta: 9, magia: 9 },
    attacchi: [r('Ascia leggera', 11, '1d6+3', 1, { proprieta: ['Taglio'] }), r('Giavellotto a mano', 11, '1d6+2', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 9, '1d6', 24, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da mischia', va: 11 }, { nome: 'Armi da guerra', va: 11 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 9 }, { nome: 'Oratoria', va: 10 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      CORPO, scuro,
      { nome: 'Dotazione', effetto: 'L’ascia da battaglia della fonte è convertita in Ascia leggera del catalogo, una mano, FOR 4, PI 5, senza impugnatura Versatile. Due Giavellotti della sentinella FOR 3 PI 4; Armatura leggera della propria misura AR 1 FOR 3 PI 6. Tutto Comune, PS Integrità 10. Inizia con l’Ascia pronta e mano secondaria libera, senza Scudo. Preparare ogni Giavellotto costa 1 AzP. Al massimo un attacco per Round, Opportunità e attacco ordinato compresi. Il danno personale dell’Ascia è già completo; altri utilizzatori recuperano l’oggetto Comune senza il bonus personale. Nessuna Forza brutale del Bugbear né Furia dell’Orco. I 33 PX comprendono la dotazione.' },
      { nome: 'Taglia e forza', passiva: true, effetto: 'Lo spazio 2 × 2 Q non concede più danni, Azioni, PI, qualità o portata; la portata si misura dal bordo dello spazio secondo il Giocatore. Barriere, oggetti, carico e passaggi stretti seguono le regole ordinarie: la grande forza non sfonda automaticamente muri e porte.' },
    ],
    note: 'Parla Comune e Gigante. Umanoide di discendenza ogre, meno massiccio di un Ogre: può lavorare come guardia, guida o mercenario, la discendenza non decide le sue scelte. Condotta: sotto 9 PV o a Ferita Profonda cerca una via di fuga o tratta. Fonte: Half-Ogre, p. 238.',
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
console.log(`${scritti} profili del blocco «Capi e varianti dei popoli guerrieri» scritti in esempi/nemici/mostri/`);
