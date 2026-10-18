// Blocco «Popoli delle terre selvagge» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti; niente
// valori inventati. GS/PX informativo (A.161; PX non tondi 11/22/33 riportati così). Spazio ai soli valori quadrati
// (A.126); la Taglia non si deduce dall'ingombro (A.167, 18/10).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - Difese = Parata (Orog), Schivata / Elusione nelle note; AR «con scudo» nel campo, senza nelle note (Bullywug,
//    Lucertoloide). Lancia «una / due mani» come due attacchi (Bullywug); armi della dotazione con gittata e modalità S.
//  - Nuoto nativo, Salto del Bullywug, apnea di 15 minuti (150 Round): capacità. Imitazione del Kenku, Agguato,
//    Carica del Centauro: capacità. Repertori (Sciamano lucertoloide, Thonot): ogni incantesimo e la Caduta protetta
//    come capacità con `azioni`, `risorsa` in PM, come per la Driade e l'Occhio di Gruumsh.
//  - Sciamano lucertoloide: una scheda sola con la forma di Coccodrillo come capacità (un solo corpo, stesse risorse).
//  - immunità negli Stati solo per ciò che è uno Stato dell'app (Avvelenato per Quaggoth e Thonot, Terrorizzato per il Re).
//
// Uso: node tools/genera_mostri_selvagge.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Popoli delle terre selvagge';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const d = (nome, va, danno, gittata_q, extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura: 'Naturale', gittata_q, modalita: ['S'], ac: 1, ...extra });
const scuro = (q = 12) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa solidi, torbidità o fumo.` });
const CORPO = { nome: 'Corpo e Azioni', effetto: 'Natura Comune, mente e PM personali; respira, mangia, beve e riposa; cure biologiche, malattie e Stati applicabili salvo protezioni esplicite. A 0 PV non Svenuto né morto automaticamente: un ulteriore danno finale positivo a 0 PV richiede Tempra e le Ferite del §4.2 (l’eccedenza del colpo che esaurisce i PV non genera da sola Ferite); a 0 PM personali Svenuto dopo la risoluzione completa dell’azione; cambiare forma, entrare in Furia o ricevere PV temporanei non cura Ferite, Menomazioni o Morente. INI modifica 1d10; AzP e unica AzM valgono per l’intero Round; ogni attacco normale costa 1 AzP, produce AC 1 e usa il danno già completo della tabella (non aggiungere FOR o DES). I tetti offensivi comprendono Opportunità e attacchi ordinati; una sola Opportunità ordinaria per Round con un’arma ravvicinata pronta o un attacco naturale ammesso (niente Carica, incantesimo, trasformazione o Manovra offensiva gratuita). Parata: 1 AzP, arma o scudo idonei, successo dimezza per eccesso prima dell’AR, Magistrale annulla; nessuna Parata naturale; armi ravvicinate −8 VA per parare a distanza, Scudo piccolo −4 con ulteriore −2 contro Raffica. Schivata: 1 AzP, 1 AzM, consapevolezza e spazio. Naturale e Magico incontrano l’AR pertinente, Etereo solo quella magica; nessuna AR magica. Dotazione: oggetti Comuni, PS Integrità 10; recuperare un’arma non trasferisce i bonus personali; incoccare è compreso nell’attacco con Arco pronto (ogni tiro consuma una freccia); estrarre, riporre o recuperare un oggetto costa 1 AzP (abbandonarlo è gratuito); le mani occupate restano occupate durante Difese e lanci. Taglia e numero di arti non concedono danni, PI, portata o Azioni maggiori.' };
const NUOTO = (terra) => ({ nome: 'Nuoto nativo', effetto: `Nel solo Nuoto percorre le distanze effettive indicate (${terra}), come eccezione al costo 2 dell’acqua; Corsa e Scatto mantengono Prove, modificatori ed esiti del Giocatore §5.2. Nei percorsi misti vale il budget unico del §5.2.4 (costo 1 a terra e 2 in acqua, senza superare il limite per ciascuna modalità); entrare in acqua, immergersi e riemergere non rinnovano l’AzM.` });
const APNEA = { nome: 'Apnea', effetto: 'Respira aria e può trattenere il fiato per 15 minuti (150 Round) al posto della normale riserva pari a COS. Esaurita, seguono PS, coscienza e danni del §5.23; un Round respirando normalmente ripristina il fiato. Acqua irrespirabile o contaminata resta un pericolo.' };

const CREATURE = [
  {
    id: 'bullywug', nome: 'Bullywug',
    caratteristiche: { FOR: 5, DES: 5, COS: 5, INT: 4, SAG: 5, CAR: 4 },
    pv: 14, pm: 5, ar: { totale: 2, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 9, volonta: 8, magia: 9 },
    attacchi: [r('Lancia a una mano', 9, '1d6+1', 2, { proprieta: ['Perforazione'] }), r('Lancia a due mani', 9, '1d6+3', 2, { proprieta: ['Perforazione'], note: 'Richiede di liberarsi dello Scudo (AR scende a 1).' }), r('Morso', 8, '1d4+1', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Armi da guerra', va: 9 }, { nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 10 }, { nome: 'Furtività', va: 10 }, { nome: 'Percezione', va: 9 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      CORPO, NUOTO('8 / 16 / 24 Q'),
      { nome: 'Dotazione', effetto: 'Lancia FOR 5 PI 6; Armatura leggera AR 1 FOR 3 PI 6; Scudo piccolo AR +1 FOR 3 PI 4. Inizia con Lancia a una mano e Scudo pronti. La Lancia non è un Giavellotto e non ha un profilo scagliato. Un solo attacco per Round, Opportunità e attacco ordinato compresi; Morso e Lancia non si risolvono insieme con l’unica AzP. I 11 PX comprendono la dotazione.' },
      { nome: 'Salto', effetto: 'Come parte della propria AzM al Passo può compiere un salto da fermo lungo fino a 4 Q oppure alto fino a 2 Q, senza rincorsa e senza Prova in condizioni ordinarie. Il percorso reale consuma il budget disponibile (salita e discesa comprese). Occorre un arrivo libero, praticabile e sostenuto; ostacoli eccezionali, terreno precario o carico richiedono le normali valutazioni. Non è Volo né una Schivata gratuita.' },
      { nome: 'Palude e parola', effetto: 'Respira aria e acqua. In palude +2 a Furtività quando pelle, vegetazione e fango aiutano a occultarlo. Parla Bullywug e può comunicare concetti semplici a rane e rospi che lo sentano (non li comanda magicamente, non condivide sensi, non raggiunge distanze illimitate). Vista ordinaria, senza Scurovisione innata né attacchi velenosi.' },
    ],
    note: 'AR 2 con Scudo piccolo, 1 senza. Abitante delle paludi: alterna sponde, acqua e salti brevi; titoli, consuetudini e rapporti con gli estranei dipendono dalla comunità. Condotta: può chiedere un tributo, indicare una via o allontanare intrusi; non riceve una cavalcatura gratis; sotto 4 PV o a Ferita Profonda cerca acqua e riparo. Fonte: Bullywug, p. 35.',
  },
  {
    id: 'centauro', nome: 'Centauro',
    caratteristiche: { FOR: 8, DES: 6, COS: 7, INT: 5, SAG: 6, CAR: 6 },
    pv: 40, pm: 8, ar: { totale: 0, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 10, corsa: 20, scatto: 30 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 11, volonta: 10, magia: 10 },
    attacchi: [r('Picca', 12, '1d6+3', 3, { proprieta: ['Perforazione'] }), r('Zoccoli', 12, '1d8+2', 1, { proprieta: ['Contusione'], note: 'Non concedono Parata né un terzo attacco per gli arti posteriori.' }), d('Arco da guerra', 11, '1d6+1', 100, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da guerra', va: 12 }, { nome: 'Armi da lancio', va: 11 }, { nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 12 }, { nome: 'Sopravvivenza', va: 13 }, { nome: 'Oratoria', va: 10 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      CORPO,
      { nome: 'Dotazione e sequenza', effetto: 'Picca a due mani FOR 6 PI 6; Arco da guerra a due mani FOR 5 PI 6 con 20 frecce; nessuna armatura o scudo. Inizia con la Picca pronta. Per Round: al massimo una Picca e uno Zoccoli, oppure due tiri d’Arco, Opportunità e attacco ordinato compresi; non combina due frecce e altri due colpi. I 33 PX comprendono la dotazione.' },
      { nome: 'Carica', azioni: { principali: 1, movimento: 1 }, effetto: 'Almeno 3 Q rettilinei su percorso praticabile, entro il budget di Corsa di 20 Q. Un singolo attacco con Picca, fermandosi alla portata valida: −2 VA tra 3 e 6 Q, −4 da 7 Q; danno ×2, oppure ×3 complessivo con Magistrale. Non aggiunge altri dadi o Zoccoli gratuiti; le altre Azioni rimaste seguono i limiti della sequenza.' },
      { nome: 'Corpo e passeggeri', effetto: 'Testa e Braccia umanoidi, Torace comprendente entrambe le masse corporee, Gambe agli arti equini. Un passeggero richiede consenso, appoggio e carico compatibili, senza condividere Azioni né rinnovare il Movimento del Centauro. Scale e passaggi stretti devono essere concretamente percorribili. Parla Elfico e Silvano; nessuna Scurovisione innata.' },
    ],
    note: 'Viaggiatore dal corpo equino e tronco umanoide che sa usare armi e leggere le piste; la mobilità non lo rende una cavalcatura disponibile a chiunque. Condotta: sotto 10 PV o a Ferita Profonda cerca spazio per ripiegare. Fonte: Centaur, p. 38.',
  },
  {
    id: 'kenku', nome: 'Kenku',
    caratteristiche: { FOR: 5, DES: 7, COS: 5, INT: 6, SAG: 5, CAR: 5 },
    pv: 16, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 2,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 11, volonta: 9, magia: 9 },
    attacchi: [r('Spada leggera', 10, '1d6+2', 1, { proprieta: ['Taglio'] }), d('Arco da guerra', 10, '1d6+1', 100, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da mischia', va: 10 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Furtività', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Raggirare', va: 12 }, { nome: 'Intrattenere', va: 11 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      CORPO,
      { nome: 'Dotazione', effetto: 'Spada leggera FOR 3 PI 5; Arco da guerra a due mani FOR 5 PI 6 con 20 frecce; nessuna armatura o scudo. Inizia con la Spada pronta. Un solo attacco per Round, Opportunità e attacco ordinato compresi. Passare all’Arco richiede di liberare entrambe le mani e prepararlo con le Azioni ordinarie; il becco non concede un attacco aggiuntivo. I 11 PX comprendono la dotazione.' },
      { nome: 'Agguato', usi: { quanti: 1, per: 'scontro' }, limiti: 'Nel primo Round cui partecipa; si consuma anche mancando.', effetto: '+2 al VA di un proprio attacco contro una vittima che non lo aveva individuato prima del tiro; si dichiara prima. Vincere l’Iniziativa non dimostra da solo il requisito. Non aggiunge danni e non si applica a tutti i bersagli del Round.' },
      { nome: 'Imitazione', prova: 'Raggirare 12 contro Percezione dell’ascoltatore', effetto: 'Riproduce una voce, un rumore o un breve insieme di suoni ascoltato adeguatamente, con il volume e i limiti fisici della propria voce; non impara ricordi, lingue, password o informazioni non udite; usa frammenti conosciuti e codici, senza creare liberamente una nuova frase con la voce di una persona; nessuna registrazione tecnologica né rumori da un’altra posizione. Quando tenta di far credere che il suono provenga dalla fonte imitata, Raggirare 12 si oppone a Percezione (Prove opposte; ambiente, familiarità con la voce e indizi possono modificare); non occorre tirare senza una posta o se l’origine è evidente; il successo rende credibile il suono, non obbliga a obbedire. Un richiamo breve compatibile con le normali comunicazioni non costa AzP; preparare un falso dialogo, una distrazione o una Manovra sociale usa tempi e costi appropriati. Si ode solo dove il suono arriva (Assordato, isolamento acustico e rumore lo impediscono). Chi lo vede non scambia il suo corpo per la voce imitata (serve un travestimento per l’identità visiva); un fallimento non giustifica ritiri ripetuti senza un nuovo indizio. Copiare una grafia richiede un campione e strumenti adatti; falsificare un documento resta una Prova di Raggirare; non sostituisce chiavi o autorizzazioni; non è Comando, fascinazione o magia.' },
    ],
    note: 'Comprende Comune e Auran. Non ha Volo o Scurovisione innati; Braccia = arti manipolatori, privi di ali funzionali. Può lavorare come messaggero, esploratore o imitatore senza essere vincolato alla vita criminale della fonte. Condotta: sotto 4 PV o a Ferita Profonda cerca copertura, una via di fuga o una trattativa. Fonte: Kenku, p. 194.',
  },
  {
    id: 'satiro', nome: 'Satiro',
    caratteristiche: { FOR: 5, DES: 7, COS: 5, INT: 6, SAG: 5, CAR: 7 },
    pv: 26, pm: 10, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 11, volonta: 11, magia: 10 },
    attacchi: [r('Corna', 9, '1d6+1', 1, { proprieta: ['Contusione'], note: 'Non concedono Parata, atterramento o Carica gratuiti.' }), r('Spada leggera', 10, '1d6+2', 1, { proprieta: ['Taglio'] }), d('Arco da guerra', 10, '1d6+1', 100, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da mischia', va: 10 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 12 }, { nome: 'Intrattenere', va: 14 }, { nome: 'Oratoria', va: 12 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      CORPO,
      { nome: 'Dotazione', effetto: 'Spada leggera FOR 3 PI 5; Arco da guerra a due mani FOR 5 PI 6 con 20 frecce; Armatura leggera AR 1 FOR 3 PI 6. Un flauto ordinario non magico accompagna l’esemplare. Inizia con la Spada pronta. Un solo attacco per Round, Opportunità e attacco ordinato compresi. I 22 PX comprendono la dotazione.' },
      { nome: 'Resistenza mistica', passiva: true, effetto: '+2 alla PS effettivamente richiesta da un incantesimo o da una capacità espressamente magica, senza creare una PS dove non esiste. Vale anche se il danno dell’incantesimo è Naturale; non concede AR, immunità o riduzione del danno; non si applica a un normale veleno o colpo d’arma. Con altri bonus magici alla stessa Prova si usa il maggiore pertinente.' },
      { nome: 'Musica e lingue', effetto: 'Il flauto ordinario usa Intrattenere e non impone Sonno, Terrorizzato o fascinazione; la variante dei Flauti magici della fonte non è compresa. Parla Comune, Elfico e Silvano; nessuna Scurovisione innata. Gambe = arti caprini.' },
    ],
    note: 'Abitante silvano legato a musica e incontri sociali; la propensione alla festa non elimina responsabilità o capacità di scelta. Condotta: sotto 7 PV o a Ferita Profonda può allontanarsi o trattare. Fonte: Satyr, p. 267.',
  },
  {
    id: 'lucertoloide', nome: 'Lucertoloide',
    caratteristiche: { FOR: 6, DES: 5, COS: 6, INT: 4, SAG: 5, CAR: 4 },
    pv: 24, pm: 6, ar: { totale: 3, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 8, magia: 9 },
    attacchi: [r('Randello', 10, '1d6+1', 1, { proprieta: ['Contusione'] }), r('Morso', 10, '1d6+1', 1, { proprieta: ['Perforazione'], note: 'Non concede Parata naturale, non trasmette automaticamente malattie e non afferra la preda.' }), r('Giavellotto a mano', 10, '1d6+1', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 9, '1d6', 18, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da mischia', va: 10 }, { nome: 'Armi da guerra', va: 10 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 11 }, { nome: 'Sopravvivenza', va: 12 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      CORPO, NUOTO('6 / 12 / 18 Q'), APNEA,
      { nome: 'Dotazione e sequenza', effetto: 'Randello FOR 3 PI 5; due Giavellotti della sentinella FOR 3 PI 4; Scudo piccolo AR +1 FOR 3 PI 4; nessuna armatura indossata. Inizia con Randello e Scudo pronti. Per Round può compiere un Morso e un attacco con Randello oppure Giavellotto, Opportunità e colpo ordinato compresi; non ripete due volte la stessa sequenza. Ogni Giavellotto va preparato e consumato dal lancio. I 22 PX comprendono la dotazione.' },
      { nome: 'Scaglie e Scudo', passiva: true, effetto: 'L’AR biologica 2 resta anche perdendo lo Scudo. Lo Scudo è ordinario: spuntoni ornamentali non danno un attacco aggiuntivo, un’arma con danno autonomo o un bonus alla Parata. La coda partecipa all’equilibrio e al Nuoto, senza attacco di Coda.' },
    ],
    note: 'AR 3 con Scudo piccolo, 2 biologica senza. Parla Draconico; nessuna Scurovisione innata. Abitante di rive e paludi, attrezzato per pattugliare e difendere una comunità; può riconoscere accordi e confini senza un obbligo di trattare gli estranei come cibo. Condotta: sotto 6 PV o a Ferita Profonda cerca la sponda, un riparo o l’aiuto dei compagni. Fonte: Lizardfolk, p. 204.',
  },
  {
    id: 'sciamano-lucertoloide', nome: 'Sciamano lucertoloide',
    caratteristiche: { FOR: 6, DES: 5, COS: 6, INT: 5, SAG: 7, CAR: 5 },
    pv: 28, pm: 16, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 10, magia: 11 },
    attacchi: [r('Morso umanoide', 11, '1d6+1', 1, { proprieta: ['Perforazione'] }), r('Artigli umanoidi', 11, '1d4+1', 1, { proprieta: ['Taglio'], note: 'Richiedono una mano libera; nessuna Parata naturale.' }), r('Morso di Coccodrillo', 11, '1d8+2', 1, { proprieta: ['Perforazione'], note: 'Solo nella forma di Coccodrillo: vedi «Forma di Coccodrillo».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 11 }, { nome: 'Sopravvivenza', va: 13 }, { nome: 'Occultismo', va: 11 }, { nome: 'Potere', va: 12 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      CORPO, NUOTO('6 / 12 / 18 Q in forma umanoide'), APNEA,
      { nome: 'Dotazione', effetto: 'Focus personale semplice Comune già sintonizzato, senza bonus o PM (Equipaggiamento §5.8); nessuna arma, armatura o scudo. In forma umanoide ha mani libere per Gesti e contatti. Al massimo un Morso e un Artigli per Round, Opportunità e colpo ordinato compresi. I 33 PX comprendono la dotazione.' },
      { nome: 'Repertorio', effetto: 'Accesso solo a Colpo Elementale di Fuoco 3, Catene di Forza 3 e Controllo Elementale dell’Acqua 3, modalità ordinaria. Un solo lancio di repertorio per Round, pagato con una delle proprie AzP. Usa la colonna degli altri utilizzatori autorizzati: Potere 12 sempre necessario. Nessun Addestramento Taumaturgo, Contromagia, Anticipazione o Convertire Potere. Ogni incantesimo costa 1 AzP e 3 PM, pagati prima di Potere 12; Focus, Gesto e Invocazione ordinari (ogni componente mancante −2, fino a −6); Ingaggio −2 quando pertinente; Corsa o Scatto nella stessa Iniziativa impediscono il lancio; fallimento consuma AzP e PM; Magistrale e Maldestro seguono la Magia. In forma di Coccodrillo non può lanciare. Per gli effetti mantenuti: senza Concentrazione Operativa non usa AzP mentre concentra e il Passo è al massimo 6 Q; dopo la prima fonte di danno del Round, Volontà per mantenerla; incoscienza la termina; Negare Potere (potenza 3) rimuove gli effetti attivi (non il danno istantaneo già risolto). Uno Stato di durata N applicato nel Round R termina a fine R + N; Incendiato infligge subito 1d4 e poi all’Iniziativa della fonte (una volta per Round), −2 alle Abilità e non alle PS, ignora l’AR non magica generica; più applicazioni non sommano lo Stato.' },
      { nome: 'Colpo Elementale di Fuoco 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'Potere 12', effetto: 'Magia §13.1: una creatura o altro bersaglio valido visibile entro 6 Q, percorso libero; colpo automatico da 1d6+2 Naturale da Fuoco, AC 1. Dopo il lancio riuscito non occorre tiro per colpire: Parata o Schivata ordinarie sono ammesse, Elusione no. Si applica l’AR pertinente. Dopo Fuoco residuo oltre protezioni e Ignifugo, Riflessi senza modificatore evita Incendiato per 1+1d3 Round; la PS non riduce il danno iniziale.' },
      { nome: 'Catene di Forza 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'Potere 12; PS di Tempra del bersaglio', effetto: 'Magia §17.6: una creatura visibile entro 6 Q, Tempra senza modificatore evita. Fallimento: Rallentato per 3 Round, senza Concentrazione; nessun danno, tiro per colpire o Difesa attiva. Passo 3 Q, niente Corsa o Scatto, −2 alle Prove fisiche e alle Difese, arti ancora utilizzabili. Liberarsi costa 1 AzP e una nuova Tempra senza modificatore. La prima volta per Round che subisce almeno 1 danno finale, Riflessi senza modificatore evita A Terra se poggia su un appoggio. Negare Potere può rimuovere il vincolo (potenza 3).' },
      { nome: 'Controllo Elementale dell’Acqua 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'Potere 12', effetto: 'Magia §13.2, sola manipolazione ordinaria: sfera fissa di raggio 1 Q, centro visibile entro 10 Q, al massimo 1 kg d’acqua o umidità disponibile. Un comportamento semplice dichiarato dura 5 minuti senza Concentrazione; per modificarlo attivamente occorre Concentrazione ordinaria, fino a 10 minuti. Non crea acqua, flora, danno, ghiaccio imprigionante o una nube automaticamente oscurante. Eco Elementale non è preparato.' },
      { nome: 'Forma di Coccodrillo', azioni: { principali: 1 }, risorsa: '3 PM', limiti: 'Alla propria Iniziativa, soltanto su sé stesso; durata 10 Round senza Concentrazione. Ritorno volontario 1 AzP; scadenza, Svenuto o morte fanno tornare alla forma umanoide senza altro costo.', effetto: 'Assume un Coccodrillo di spazio 2 × 2 Q (abilità del profilo, non Trasformazione Totale né un effetto condivisibile; Negare Potere la termina, potenza 3). Un solo corpo: Caratteristiche, Abilità, Difese, PS, INI, PV e PM restano quelli della scheda; conserva PV attuali, PM spesi, Ferite, Menomazioni e Stati; AR biologica sempre 1; non acquista i PV o gli attacchi del Coccodrillo gigante e non recupera il fiato (una sola riserva per entrambe le forme). Gambe e Braccia diventano i gruppi posteriori e anteriori di zampe. Movimento: terra 4 / 8 / 12 Q, Nuoto nativo 6 / 12 / 18 Q; 2 AzP e 1 AzM, ma al massimo un Morso di Coccodrillo per Round, Opportunità e colpo ordinato compresi; nessun Artigli, Coda, arma, lancio del repertorio o Parata naturale; nessuna resistenza al Fuoco o al Gelo né ulteriori immunità. Presa delle mascelle: dopo almeno 1 danno finale di Morso a una creatura fino a 1 × 1 Q, Riflessi senza modificatore; fallimento Immobilizzato (mani non specificamente bloccate); una sola preda, e finché la tiene non morde altre vittime; la vittima o un alleato presso le mascelle spende 1 AzP e contrappone Corpo a corpo o Atletica a Corpo a corpo 11 (il prigioniero con −4 fisico): successo libera, pareggio conserva; nessuno Stringere o danno periodico. Rilascio volontario gratuito alla propria Iniziativa; ritorno umanoide, incoscienza o perdita delle mascelle sciolgono la presa; trascinare la preda consente solo il Passo con distanze dimezzate, senza attraversare solidi; la vittima non perde il fiato per il solo aggancio (se immersa usa la propria riserva e il §5.23). Gli oggetti non si trasformano: deve liberarsi prima di indumenti o vincoli incompatibili; il Focus lasciato a terra non torna in mano. Una presa, un’ancora esterna o uno spazio insufficiente impediscono di iniziare la trasformazione, che non strappa catene né cura lesioni.' },
    ],
    note: 'Parla Draconico; nessuna Scurovisione innata. Custode di riti e conoscenze della comunità: il repertorio è convertito in tre incantesimi di Simply RPG. Condotta: sotto 7 PV o a Ferita Profonda cerca riparo o la via d’acqua; la forma animale non rende innocuo l’aspetto, non cura e non crea una seconda riserva. Fonte: Lizardfolk Shaman, p. 205.',
  },
  {
    id: 're-o-regina-lucertoloide', nome: 'Re o Regina lucertoloide',
    caratteristiche: { FOR: 8, DES: 6, COS: 7, INT: 6, SAG: 5, CAR: 7 },
    pv: 56, pm: 10, ar: { totale: 3, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 11, magia: 10 },
    immunita: ['terrorizzato'],
    attacchi: [r('Tridente', 13, '1d8+3', 2, { proprieta: ['Perforazione'], note: 'Con «Impalare» (2 PM, prima del tiro) +2 al danno del colpo: 1d8+5.' }), r('Morso', 12, '1d6+2', 1, { proprieta: ['Perforazione'], note: 'Non causa Corruzione.' }), r('Artiglio', 12, '1d4+2', 1, { proprieta: ['Taglio'], note: 'Richiede una mano libera.' })],
    abilita: [{ nome: 'Armi da guerra', va: 13 }, { nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 12 }, { nome: 'Sopravvivenza', va: 12 }, { nome: 'Oratoria', va: 13 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      CORPO, NUOTO('6 / 12 / 18 Q'), APNEA, scuro(12),
      { nome: 'Dotazione e sequenza', effetto: 'Tridente a una mano FOR 4 PI 6; nessuna armatura o scudo. Inizia con Tridente e mano secondaria libera. Per Round: due attacchi di Tridente, oppure un Morso e un Artiglio o Tridente, Opportunità e attacco ordinato compresi. Il Tridente non ha impugnatura Versatile né profilo scagliato. I 55 PX comprendono la dotazione.' },
      { nome: 'Impalare', risorsa: '2 PM', limiti: 'Una volta per Round, prima del tiro di un normale attacco di Tridente (anche su Opportunità se non già attivato nel Round e se il limite offensivo lo consente); i PM sono spesi anche se manca; non si aggiunge a una Manovra offensiva come Carica o Colpo Mirato.', effetto: 'Potenziamento intrinseco dello stesso colpo (nessuna AzP aggiuntiva): +2 al danno del singolo colpo prima di moltiplicatori, Difesa e AR, nella stessa AC (Tridente da 1d8+3 a 1d8+5; resta Naturale da Perforazione; un Magistrale segue il moltiplicatore ordinario, senza seconda applicazione del bonus). Solo se il colpo produce almeno 1 danno finale dopo le protezioni riceve 3 PV temporanei per 3 Round (nessun beneficio se manca, è annullato o assorbito interamente): effetto sul campione, non un drenaggio; non guarisce PV ordinari né riduce Ferite, Menomazioni o Morente. I nuovi PV temporanei possono sostituire, mai aggiungersi, a una riserva già presente (il campione può conservare la precedente, e allora non riceve la nuova); Impalare e Irrobustire non si sommano. Difese, resistenze e AR si applicano prima; il residuo consuma i temporanei e poi i PV ordinari; Dardo Psichico li ignora. A 0 PM dopo la completa risoluzione del colpo diventa Svenuto. Il beneficio è istantaneo e intrinseco: Negare Potere non lo annulla retroattivamente; non è trasferibile al Tridente né una regola che ogni sovrano acquisisce per titolo.' },
    ],
    note: 'Immune a Terrorizzato, senza immunità generale al controllo mentale. Parla Abissale e Draconico. Capo combattente dalla forte presenza, distinto dallo Sciamano: il titolo non conferisce autorità automatica sui Lucertoloidi, non impone una fedeltà soprannaturale e non dà Natura Oscura Simmetria né CROS per l’origine demoniaca della fonte. Condotta: sotto 14 PV o a Ferita Profonda può ritirarsi, chiedere aiuto o trattare. Fonte: Lizard King/Queen, p. 205.',
  },
  {
    id: 'quaggoth', nome: 'Quaggoth',
    caratteristiche: { FOR: 8, DES: 5, COS: 7, INT: 3, SAG: 6, CAR: 3 },
    pv: 38, pm: 7, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 9, volonta: 8, magia: 9 },
    immunita: ['avvelenato'],
    attacchi: [r('Artiglio', 12, '1d6+2', 1, { proprieta: ['Taglio'], note: 'Con Furia ferita (PV ≤ 9): VA 14 e danno 1d6+4.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 9 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      CORPO, scuro(24),
      { nome: 'Furia ferita', passiva: true, effetto: 'Finché cosciente e con PV ordinari non superiori a 9, +2 al VA degli Artigli e +2 al loro danno (VA 14, 1d6+4). Si verifica prima di ogni attacco e cessa appena i PV superano la soglia. Le penalità di Ferite e Stati continuano, così come Tempra a 0 PV. Non dà AzP, immunità, PV o bonus ai lanci e alle PS.' },
      { nome: 'Corpo e sensi', effetto: 'Immune a danni da veleno e ad Avvelenato, senza immunità ad acido, malattie, soffocamento o Corruzione. Arrampicata 6 Q al Passo: si arrampica su pareti con appigli senza Atletica ordinaria (superfici scivolose o precarie richiedono Prove; non aderisce a soffitti lisci e non attraversa roccia). Parla Sottocomune. Al massimo due Artigli per Round, Opportunità e colpo ordinato compresi; richiedono arti anteriori liberi e non concedono Parata naturale. Dotazione: nessuna.' },
    ],
    note: 'Abitante delle caverne dal corpo robusto e dagli artigli sviluppati; origine e rapporti con altri popoli si definiscono nell’avventura, senza imporre le inimicizie della fonte. Condotta: a Ferita Seria o se la consegna lo permette può ritirarsi; la Furia non lo obbliga a inseguire fino alla morte. Fonte: Quaggoth, p. 256.',
  },
  {
    id: 'quaggoth-thonot', nome: 'Quaggoth Thonot',
    caratteristiche: { FOR: 8, DES: 5, COS: 7, INT: 3, SAG: 6, CAR: 4 },
    pv: 40, pm: 18, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 10, magia: 11 },
    immunita: ['avvelenato'],
    attacchi: [r('Artiglio', 13, '1d6+2', 1, { proprieta: ['Taglio'], note: 'Con Furia ferita (PV ≤ 10): VA 15 e danno 1d6+4.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 9 }, { nome: 'Sopravvivenza', va: 12 }, { nome: 'Potere', va: 11 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      CORPO, scuro(24),
      { nome: 'Fisiologia', effetto: 'Conserva immunità a veleno e Avvelenato (non alle malattie), Scurovisione 24 Q, Sottocomune e arrampicata 6 Q al Passo del Quaggoth. Al massimo due Artigli per Round, Opportunità e colpo ordinato compresi; nessuna Parata naturale. Furia ferita con PV ordinari fino a 10: +2 VA e +2 danni solo agli Artigli (VA 15 e 1d6+4 prima di altre penalità); non migliora Potere, PS o altri danni. Dotazione: nessuna; psionico non significa privo di mente né immune a Dardo Psichico.' },
      { nome: 'Repertorio', effetto: 'Telecinesi 1, Cura Ferite 3, Irrobustire 3, Colpo Elementale di Fuoco 3 e Illusione 3. Un solo lancio del repertorio per Round. Manifestazioni innate senza Focus, Gesti o Invocazione (nessuna penalità per componenti assenti), ma sempre Potere 11 e PM; nessun uso illimitato né ricarica giornaliera della fonte. Nessun Addestramento Taumaturgo, Anticipazione, Contromagia o Convertire Potere. Ogni lancio costa 1 AzP e i PM del livello, prima di Potere 11 (colonna degli altri utilizzatori autorizzati); Ingaggio −2 e altre interferenze restano pertinenti; Corsa o Scatto nella stessa Iniziativa impediscono il lancio; fallimento consuma AzP e PM; Magistrale e Maldestro seguono la Magia; a 0 PM Svenuto dopo la completa risoluzione.' },
      { nome: 'Telecinesi 1', azioni: { principali: 1 }, risorsa: '1 PM', prova: 'Potere 11', effetto: 'Magia §17.1: un oggetto visibile fino a 0,5 kg entro 6 Q, percorso libero. Durata fissa 10 Round oppure Concentrazione ordinaria fino a 10 minuti. Movimento dell’oggetto fino a 6 Q per Round, sempre visibile e in gittata (altrimenti cessa il sostegno). La prima manipolazione semplice è inclusa nel lancio; a durata fissa le successive costano 1 AzP; in Concentrazione una manipolazione non offensiva per propria Iniziativa è compresa, ma senza AzP e con Passo al massimo 6 Q. Non bersaglia creature né le trasporta tramite un oggetto; un possessore che trattiene l’oggetto effettua Tempra senza modificatore per non perderlo; oggetti fissati vanno prima liberati. Solo a durata fissa può scagliare l’oggetto: Armi da lancio 9 con il normale +2 (VA 11 prima degli altri modificatori), 1d4 Naturale, AC 1, normali Difese e AR; il primo colpo può rientrare nel lancio, i successivi costano 1 AzP; l’oggetto non ritorna e il suo danno è sostituito da quello del potere. Negare Potere (potenza 1) lo rimuove.' },
      { nome: 'Cura Ferite 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'Potere 11', effetto: 'Magia §21.1: Contatto con un vivente consenziente o un incosciente soccorso; recupera 1d4+2 PV fino al massimo ordinario. Ogni 2 punti di cura possono invece ridurre Sanguinamento di 1, anche parzialmente. Non cura Ferite, Menomazioni, malattie, veleno o Morente, non resuscita e non ripara un corpo puramente meccanico.' },
      { nome: 'Irrobustire 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'Potere 11', effetto: 'Magia §16.1: Contatto con un consenziente, sé stesso incluso, 6 PV temporanei per 20 Round, senza Concentrazione. Difese e AR precedono la riserva; non cura PV ordinari o Ferite. Più Irrobustire si sostituiscono, non si sommano. Nessun aumento di FOR, taglia, portata o danno. Dardo Psichico ignora i PV temporanei. Negare Potere (potenza 3) lo rimuove.' },
      { nome: 'Colpo Elementale di Fuoco 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'Potere 11', effetto: 'Gittata 6 Q, colpo automatico 1d6+2 Naturale da Fuoco, AC 1; Parata o Schivata ordinarie ammesse, Elusione no; AR pertinente; dopo Fuoco residuo oltre protezioni e Ignifugo, Riflessi senza modificatore evita Incendiato per 1+1d3 Round. Non può scegliere altri elementi.' },
      { nome: 'Illusione 3', azioni: { principali: 1 }, risorsa: '3 PM', prova: 'Potere 11', effetto: 'Magia §19.4: centro fisso visibile entro 6 Q, scena entro raggio 2 Q anche in verticale, durata 5 minuti senza Concentrazione. Immagine statica semplice (come una cassa o una parete), con eventuali suoni e odori semplici; non una copia animata del Thonot. Non crea materia, luce reale, attacchi, AR o bonus automatici alle Difese. Cambiare la scena nei limiti del livello costa 1 AzP, con centro visibile in gittata. Nessuna PS per la sola osservazione: esaminare deliberatamente costa 1 AzP e concede Magia senza modificatore; un indizio concreto o un’interazione fisica concede la PS immediata senza AzP; successo riconosce l’inganno per quel lancio, fallimento richiede un nuovo indizio per riprovare; Barriera Mentale dà il proprio bonus; sensori e osservazione su schermo rilevano la realtà. Negare Potere (potenza 3) la rimuove.' },
      { nome: 'Caduta protetta', azioni: { principali: 1 }, risorsa: '2 PM', limiti: 'Al massimo una volta per Round, anche fuori dalla propria Iniziativa; consuma il medesimo budget di AzP dei lanci del repertorio.', effetto: 'Capacità innata distinta (nessun Potere né componente; non un lancio del repertorio): quando sé stesso o un’altra creatura consenziente visibile entro 6 Q inizia a cadere, da dichiarare prima del danno. Un solo beneficiario per attivazione scende verticalmente di 6 Q subito e poi all’inizio delle proprie Iniziative (al massimo una discesa per Round); se raggiunge prima un appoggio praticabile atterra senza danni da quella caduta. Dura fino all’atterraggio o a fine del terzo Round successivo all’attivazione. Non concede Volo, risalita, spostamento orizzontale, immunità ad attacchi o superfici letali; se termina a mezz’aria la Caduta riprende dalla quota attuale. Senza coscienza o risorse non può attivarla e non annulla una caduta già risolta. Cambiare quota non interrompe Incendiato, prese o Stati personali; l’incoscienza del Thonot dopo l’attivazione non la cancella; Negare Potere (potenza 3) può rimuovere il rallentamento; riattivarla sostituisce, non somma; non trasporta creature appese al beneficiario.' },
    ],
    note: 'Raro esemplare capace di manipolazioni e manifestazioni psioniche, spesso custode di conoscenze della comunità; il potere non si trasferisce consumandone il corpo. Condotta: può sostenere i compagni o usare coperture e inganni; a Ferita Seria o se la comunità è al sicuro può ripiegare. Fonte: Quaggoth Thonot, p. 256.',
  },
  {
    id: 'orog', nome: 'Orog',
    caratteristiche: { FOR: 8, DES: 5, COS: 8, INT: 6, SAG: 5, CAR: 6 },
    pv: 42, pm: 8, ar: { totale: 5, magica: 0 }, difese: 12, iniziativa: 0,
    movimento: { passo: 4, corsa: 10, scatto: 16 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 10, magia: 10 },
    attacchi: [r('Ascia bipenne', 12, '2d6+3', 1, { proprieta: ['Taglio'] }), r('Giavellotto a mano', 12, '1d6+2', 1, { proprieta: ['Perforazione'] }), d('Giavellotto lanciato', 10, '1d6+1', 24, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Armi da guerra', va: 12 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Atletica', va: 11 }, { nome: 'Furtività', va: 7 }, { nome: 'Percezione', va: 11 }, { nome: 'Sopravvivenza', va: 12 }, { nome: 'Oratoria', va: 12 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      CORPO, scuro(12),
      { nome: 'Dotazione', effetto: 'Ascia bipenne a due mani FOR 6 PI 6; due Giavellotti della sentinella FOR 3 PI 4; Armatura pesante AR 5 FOR 7 PI 10. Inizia con la Bipenne pronta, senza Scudo. Al massimo due attacchi per Round, di cui non più di un lancio di Giavellotto, Opportunità e attacco ordinato compresi. Estrarre il Giavellotto e cambiare arma richiedono le Azioni ordinarie. I 55 PX comprendono la dotazione. I VA pronti comprendono la Pesante (−2 ai VA di attacco, Schivata e Prove fisiche ostacolate, −2 Q a ciascuna andatura; Parata, Percezione e PS non ricevono questi malus; a 0 PI perde AR ma mantiene le penalità).' },
      { nome: 'Avanzata aggressiva', limiti: 'Una volta per Round.', effetto: 'Può usare la propria AzM come Passo di 6 Q anziché 4 verso un nemico visibile. Il percorso non può allontanarlo da quel nemico e deve terminare più vicino. Nessuna AzM aggiuntiva o aumento a Corsa, Scatto, Carica e Schivata; Opportunità normali. Non ha Furia di Gruumsh, Urlo di guerra o Frenesia gnoll.' },
    ],
    note: 'Parata 12 (valore delle Difese), Schivata / Elusione 8. Rimossa la Pesante recupera +2 ai VA fisici penalizzati e Movimento 6 / 12 / 18 Q (Passo aggressivo 8 Q); Parata, Percezione e PS restano invariate. Parla Comune e Orchesco. Variante dell’Orco, combattente robusto e disciplinato che valuta terreno e ritirata; non acquisisce i poteri del Capoguerra o dell’Occhio di Gruumsh. Condotta: sotto 11 PV o a Ferita Profonda può arretrare per salvare il reparto o trattare. Fonte: Orog, p. 247.',
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
console.log(`${scritti} profili del blocco «Popoli delle terre selvagge» scritti in esempi/nemici/mostri/`);
