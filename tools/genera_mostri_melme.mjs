// Blocco «Melme funghi e imitatori» del catalogo (cap. 8) del Manuale dei Mostri v0.18: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti;
// niente valori inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - «PM —» → nessun campo `pm`; «Volontà —» (melme e funghi senza mente) → la Salvezza manca in `salvezze` ed è
//    elencata in `senza_salvezza` (campo nuovo del formato, Mostri 0.18): un dato assente non vale 0.
//  - immunità espresse della scheda → Stati del formato (`immunita`: accecato, assordato, a-terra, terrorizzato,
//    avvelenato); le altre (psichici, controllo mentale, AFT, Paralizzato, Acido, Fulmine, Taglio…) nelle capacità.
//  - l'acido è il mezzo del danno e Corrosivo una proprietà ulteriore, presente solo dove dichiarata: `proprieta`
//    ["Corrosivo"] solo per Melma grigia e Budino nero; l'acido senza Corrosivo è nella nota dell'attacco.
//  - attacchi senza tiro per colpire (Inglobare, Digerire, Stridio, Rottura del sacco, Spore) → capacità; il
//    Frammento (dopo la Scissione) resta un attacco, con la condizione nella nota.
//  - Mimic: il Morso ha AC 2 (1d8+1 fisico e poi 1d4 acido): `danno` il primo, `ac` 2, il secondo in nota.
//  - Fungo stridente: immobile (passo 0, Corsa e Scatto non consentiti), AzM inutilizzabile, GS «—» e 0 PX.
//
// Uso: node tools/genera_mostri_melme.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.18 (16/10/2026), cap. 8 «Catalogo delle creature» — Melme funghi e imitatori';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const NON_DORME = 'Non dorme e scambia i gas attraverso il corpo: l’ostruzione di una bocca inesistente non la soffoca. Non è immune a ogni veleno, malattia o ambiente privo di condizioni vitali.';
const SENZA_MENTE = { nome: 'Senza mente', effetto: 'PM — e Volontà —: nessuna mente strutturata. Immune a danni psichici, controllo mentale e Terrorizzato (proprietà della scheda). ' + NON_DORME };
const PERCEZIONE_DIFFUSA = (q) => ({ nome: 'Percezione diffusa', effetto: `Localizza entro ${q} Q senza occhi o udito; non legge, non distingue i colori e non soddisfa gli sguardi; le barriere solide la interrompono. Non individua da sola chi è nascosto (resta il confronto Percezione–Furtività).` });
const MELMA = { nome: 'Melma', effetto: 'Percezione diffusa 12 Q, immune ad Accecato, Assordato, A Terra e all’accumulo di AFT (resta soggetta a Rallentato, Immobilizzato e Stordito). Cerca nutrimento da stimoli locali: nessuna tattica, alleanza o vendetta. Localizzazioni: Testa = regione sensoriale anteriore, Torace = massa centrale, Braccia = pseudopodi, Gambe = base locomotrice; una lesione sensoriale può impedire di localizzare, una della base il movimento. Cambiare forma o dividersi non guarisce Ferite, Menomazioni o Stati; le capacità biologiche non si cancellano con Negare Potere.' };
const CORPO_AMORFO = { nome: 'Corpo amorfo', effetto: 'Attraversa aperture larghe almeno 3 cm con 1 AzM intera, un percorso continuo non oltre il proprio Passo e spazio libero all’uscita; durante l’attraversamento non attacca. Non attraversa creature, solidi o serrature sigillate; lascia gli oggetti rigidi inglobati che non entrano nell’apertura.' };
const CORROSIONE = { nome: 'Corrosione', effetto: 'Corrosivo (§5.24) dopo almeno 1 danno finale ai PV: una protezione compatibile che ha fornito almeno 1 AR fa la PS Integrità (dalla Qualità); fallimento −1 PI, al massimo una volta per protezione e attacco (con il deterioramento di un Magistrale si somma 1 PI potenziale con la stessa PS). Anticorrosivo X impedisce l’effetto se il danno finale non supera X. Un’arma o munizione compatibile che colpisce davvero il corpo fa una PS Integrità (fallimento −1 PI), anche se l’AR assorbe tutto; Anticorrosivo ≥ 1 sullo strumento lo impedisce; un colpo fallito o una Schivata riuscita no. A 0 PI l’oggetto è Rotto (peso e ingombro restano); i PI perduti richiedono riparazione. Legno, pietra, vetro e oggetti mistici non sono coinvolti.' };
const SCISSIONE = (px, frammento) => ({ nome: 'Scissione', effetto: `Innesco: un effetto di Fulmine, oppure un colpo fisico Naturale da Taglio con danno positivo prima delle immunità che raggiunga il corpo (un attacco fallito o annullato da una Difesa non basta); si risolve prima l’intero attacco, poi la Scissione. Servono almeno 12 PV attuali, il corpo originale in grado di agire e due spazi liberi 1 × 1 Q adiacenti fra loro (nell’impronta o subito accanto). Una sola divisione per esemplare nell’incontro; i frammenti non si dividono né si riuniscono. Ciascun frammento ha metà dei PV attuali e metà dei PV massimi (per difetto), le stesse Ferite, Menomazioni e Stati; occupa 1 × 1 Q, mantiene i valori del corpo originale e usa il danno «Frammento» (${frammento}). I frammenti condividono le AzP, l’AzM e l’eventuale Attacco di Opportunità ancora disponibili nel Round della divisione; dal Round dopo ognuno ha 1 AzP e 1 AzM, alla stessa Iniziativa. Un solo esemplare ai fini dei PX (${px} PX, già comprensivi della possibile divisione).` });
const SOLE_MICONIDI = { nome: 'Sensibilità solare', effetto: 'Sotto luce solare diretta −2 a tutti i VA di Abilità e Salvezza; termina quando sono schermati (Luce Mistica e luce artificiale non contano). Ogni 10 minuti continuativi di esposizione Tempra 0 con il −2: fallimento 1 AFT; dal sessantesimo minuto ogni verifica infligge anche 1d6 Naturale interno che ignora AR. Un minuto di ombra interrompe il conteggio; PV, Ferite e AFT subiti restano.' };
const ALLARME = { nome: 'Spore di allarme', effetto: 'Dopo almeno 1 danno ai PV, un Miconide cosciente emette automaticamente un segnale biologico (al massimo una volta per Round): gli altri Miconidi entro 48 Q raggiungibili attraverso aria comunicante avvertono il pericolo e la direzione approssimativa. Pareti sigillate lo bloccano; non dà mappe, identità o un turno gratuito.' };
const RAPPORTO = { nome: 'Spore di rapporto', effetto: 'Diffonde spore nel raggio della scheda lungo percorsi liberi: possono aderire volontariamente creature biologiche con una mente (non costrutti, non morti, elementali). Per 1 ora i partecipanti entro 6 Q l’uno dall’altro si scambiano pensieri intenzionalmente formulati senza lingua comune; nessun obbligo di obbedienza, nessuna lettura di pensieri non condivisi. Ogni partecipante può cessare gratis alla propria Iniziativa. Nessun PM; Negare Potere non dissolve la secrezione.' };

const CREATURE = [
  {
    id: 'melma-grigia', nome: 'Melma grigia', senzaSalvezza: ['volonta'],
    caratteristiche: { FOR: 6, DES: 3, COS: 7, INT: 1, SAG: 4, CAR: 1 },
    pv: 24, ar: { totale: 1, magica: 0 }, difese: 6, iniziativa: -3,
    movimento: { passo: 2, corsa: 4, scatto: 6 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 6, magia: 9 },
    attacchi: [r('Pseudopodo', 10, '1d6+2', 1, { proprieta: ['Corrosivo'], note: 'Danno da acido.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 8 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: ['accecato', 'assordato', 'a-terra', 'terrorizzato'],
    capacita: [
      SENZA_MENTE, MELMA, CORPO_AMORFO,
      { nome: 'Resistenze', effetto: 'Dimezza i danni da Acido, Fuoco e Ghiaccio, di qualunque Natura, prima dell’AR pertinente. Non ha Scissione e non è immune al Taglio o al Fulmine.' },
      { nome: 'Pietra bagnata', effetto: 'Furtività 14 immobile su roccia umida, fango o liquido scuro; movimento, contatto o un esame riuscito la rivelano. Scala le pareti con asperità (non i soffitti lisci); terra e arrampicata 2/4/6 Q.' },
      CORROSIONE,
    ],
    note: 'AR 1 biologica. Il Corrosivo interessa solo protezioni non magiche di metallo compatibile (la Melma grigia: solo metallo). Condotta: va verso la fonte di nutrimento percepita più vicina; un’offerta di materiale commestibile può intercettarla. Fonte: Gray Ooze, p. 243.',
  },
  {
    id: 'gelatina-ocra', nome: 'Gelatina ocra', taglia: 'grande', senzaSalvezza: ['volonta'],
    caratteristiche: { FOR: 7, DES: 3, COS: 6, INT: 2, SAG: 4, CAR: 1 },
    pv: 36, ar: { totale: 1, magica: 0 }, difese: 6, iniziativa: -3,
    movimento: { passo: 2, corsa: 4, scatto: 6 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 11, riflessi: 6, magia: 9 },
    attacchi: [
      r('Pseudopodo', 11, '1d8+1', 1, { note: 'Danno da acido (non Corrosivo).' }),
      r('Frammento', 11, '1d6+1', 1, { note: 'Solo dopo la Scissione. Danno da acido (non Corrosivo).' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    immunita: ['accecato', 'assordato', 'a-terra', 'terrorizzato'],
    capacita: [
      SENZA_MENTE, MELMA, CORPO_AMORFO,
      { nome: 'Aderenza', effetto: 'Aderisce a pareti e soffitti solidi ordinari senza Prova, a 2/4/6 Q; supporti fragili o ghiaccio possono richiedere Atletica; cade se il sostegno cede.' },
      { nome: 'Resistenze', effetto: 'Dimezza i danni da Acido di qualunque Natura. Immune al Fulmine di qualunque Natura e ai danni fisici Naturali da Taglio (Taglio Magico o Etereo può ferirla e non attiva Scissione). Non è immune al Ghiaccio.' },
      { nome: 'Digestione selettiva', effetto: 'Il danno del Pseudopodo incontra normalmente l’AR. Non ha Corrosivo e non danneggia l’Integrità dell’equipaggiamento. I suoi enzimi non consumano legno, metallo o ossa: contro un bersaglio interamente composto da questi materiali non infligge danni.' },
      SCISSIONE(30, '1d6+1'),
    ],
    note: 'AR 1 biologica. Condotta: segue stimoli di nutrimento fino a pareti e soffitti; i frammenti non collaborano intenzionalmente fra loro. Fonte: Ochre Jelly, p. 243.',
  },
  {
    id: 'budino-nero', nome: 'Budino nero', taglia: 'grande', senzaSalvezza: ['volonta'],
    caratteristiche: { FOR: 8, DES: 3, COS: 8, INT: 1, SAG: 4, CAR: 1 },
    pv: 52, ar: { totale: 2, magica: 0 }, difese: 6, iniziativa: -3,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 13, riflessi: 6, magia: 10 },
    attacchi: [
      r('Pseudopodo', 12, '2d6+1', 1, { proprieta: ['Corrosivo'], note: 'Danno da acido.' }),
      r('Frammento', 12, '1d8+1', 1, { proprieta: ['Corrosivo'], note: 'Solo dopo la Scissione. Danno da acido.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    immunita: ['accecato', 'assordato', 'a-terra', 'terrorizzato'],
    capacita: [
      SENZA_MENTE, MELMA, CORPO_AMORFO,
      { nome: 'Aderenza', effetto: 'Aderisce a pareti e soffitti solidi ordinari senza Prova, a 4/8/12 Q; supporti fragili o ghiaccio possono richiedere Atletica; cade se il sostegno cede.' },
      { nome: 'Immunità', effetto: 'Immune ad Acido, Ghiaccio e Fulmine di qualunque Natura e ai danni fisici Naturali da Taglio (Taglio Magico o Etereo può ferirlo e non attiva Scissione). Fuoco non è fra le sue immunità.' },
      { nome: 'Contatto biologico', effetto: 'Una creatura che tocca la superficie con tessuti vivi esposti subisce 1d4 Naturale da acido (AR ordinaria), al massimo una volta per Round per creatura. Non costa Azioni, non si attiva tramite un’arma, una protezione integra o un attrezzo; non ha Corrosivo.' },
      { nome: 'Corrosione dei materiali', effetto: 'Il Pseudopodo ha Corrosivo contro protezioni non magiche di metallo o materiale organico compatibile (legno, cuoio); pietra, vetro e oggetti mistici non subiscono l’usura. Procedura nella capacità «Corrosione».' },
      CORROSIONE,
      SCISSIONE(50, '1d8+1'),
    ],
    note: 'AR 2 biologica. Condotta: segue il nutrimento percepito, supera dislivelli aderendo e filtra nelle aperture accessibili. Fonte: Black Pudding, p. 241.',
  },
  {
    id: 'cubo-gelatinoso', nome: 'Cubo gelatinoso', taglia: 'grande', senzaSalvezza: ['volonta'],
    caratteristiche: { FOR: 7, DES: 2, COS: 9, INT: 1, SAG: 4, CAR: 1 },
    pv: 44, ar: { totale: 1, magica: 0 }, difese: 5, iniziativa: -4,
    movimento: { passo: 3, corsa: 6, scatto: 9 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 14, riflessi: 5, magia: 9 },
    attacchi: [r('Pseudopodo', 11, '1d8+1', 1, { note: 'Danno da acido (non Corrosivo).' })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    immunita: ['accecato', 'assordato', 'a-terra', 'terrorizzato'],
    capacita: [
      SENZA_MENTE, MELMA,
      { nome: 'Trasparenza', effetto: 'Furtività 14 immobile, in ambiente adatto e senza oggetti visibili sospesi nel corpo; un esame riuscito la rivela, ma entrarvi inconsapevolmente non annulla la Salvezza contro Inglobare. Altezza 2 Q. Chi entra nel corpo attiva la PS e le conseguenze di Inglobare senza che il Cubo spenda Azioni; con successo resta fuori, interrompendo il movimento.' },
      { nome: 'Metabolismo e ingombro', effetto: 'L’acido digerisce tessuti biologici, non legno, metallo o ossa; non ha Corrosivo e non riduce l’Integrità dell’equipaggiamento. Il Pseudopodo non danneggia un bersaglio di soli materiali indigeribili. Non scala e non attraversa fessure: serve un passaggio per il suo volume; si deforma solo per seguire una curva ordinaria.' },
      { nome: 'Inglobare', effetto: '1 AzP e 1 AzM: avanza fino a 3 Q lungo un percorso libero, entrando negli spazi delle creature incontrate. Ognuna fa Riflessi senza modificatore (una volta per Round contro quel Cubo): successo, si sposta gratis nel più vicino Q libero adiacente (se non esiste, il Cubo si ferma prima); fallimento, è inglobata. La PS sostituisce tiro per colpire, Parata e Schivata. Capienza: fino a quattro creature 1 × 1 Q o una 2 × 2 Q (non combinabili); non ingloba creature maggiori o altre melme. Ogni nuovo prigioniero è Immobilizzato (mani non bloccate) e, se biologico, subisce 1d6 Naturale da acido con AR ordinaria; segue il Cubo. Con vie respiratorie sommerse inizia il soffocamento del §5.23.', azioni: { principali: 1, movimento: 1 } },
      { nome: 'Digerire', effetto: '1 AzP: 1d6 Naturale da acido a ciascun prigioniero biologico (AR ordinaria), senza tiro per colpire né Salvezza. Una creatura subisce il danno di Inglobare o Digerire al massimo una volta per Round per Cubo; i prigionieri non biologici sono trattenuti ma non subiscono danno. Nessun danno digestivo gratuito a fine Round.', azioni: { principali: 1 } },
      { nome: 'Uscire e aiutare', effetto: 'Un prigioniero spende 1 AzP: Corpo a corpo o Atletica contro Atletica 12 del Cubo (−4 di Immobilizzato). Un alleato adiacente può usare la stessa procedura con il proprio VA (senza il malus se libero); il successo estrae la vittima nel più vicino spazio libero (senza spazio non si completa). Un soccorritore che immerge tessuti vivi esposti subisce 1d4 acido (una volta per Round); un attrezzo lo evita. Il prigioniero attacca dall’interno con −4; la massa dà copertura totale verso l’esterno. Perdita di coscienza, morte o Menomazione del contenimento liberano i prigionieri (0 PV da soli no). All’uscita cessa l’ostruzione; la riserva di fiato torna dopo un Round di respiro normale.' },
    ],
    note: 'AR 1 biologica. Condotta: avanza verso la fonte di nutrimento percepita; Inglobare, Digerire, Pseudopodo e Difesa competono per la sua unica AzP. Fonte: Gelatinous Cube, p. 242.',
  },
  {
    id: 'fungo-stridente', nome: 'Fungo stridente', senzaSalvezza: ['volonta'],
    caratteristiche: { FOR: 1, DES: 1, COS: 5, INT: 1, SAG: 2, CAR: 1 },
    pv: 12, ar: { totale: 0, magica: 0 }, difese: 1, iniziativa: -4,
    movimento: { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 0, eccezioni: 'AzM inutilizzabile' }, salvezze: { tempra: 9, riflessi: 1, magia: 8 },
    attacchi: [],
    abilita: [{ nome: 'Percezione', va: 8 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: '—', px: 0, per_pg: 4 },
    immunita: ['accecato', 'assordato', 'terrorizzato'],
    capacita: [
      SENZA_MENTE, PERCEZIONE_DIFFUSA(6),
      { nome: 'Stridio (allarme)', effetto: 'Quando percepisce una creatura entro 6 Q oppure il proprio corpo è illuminato intensamente, inizia a stridere senza spendere Azioni; udibile fino a 60 Q in condizioni libere (porte, terreno e rumore lo attenuano). Dopo l’ultimo stimolo continua per 1d4 proprie Iniziative; nuovi stimoli fanno ripartire il conteggio. Termina se perde coscienza, muore o subisce una Menomazione che lo impedisce (0 PV no); una barriera contro il suono ne impedisce la propagazione. Non infligge danni né Assordato.' },
    ],
    note: 'Non attacca, non fa Opportunità e non può Schivare; 0 PX come esemplare da combattimento (le sentinelle o i predatori richiamati sono incontri distinti). Furtività 13 fra funghi simili. Testa = cappello, Torace = gambo, Braccia = lamelle, Gambe = base radicata. Fonte: Shrieker, pp. 137–138.',
  },
  {
    id: 'fungo-violetto', nome: 'Fungo violetto', senzaSalvezza: ['volonta'],
    caratteristiche: { FOR: 2, DES: 1, COS: 5, INT: 1, SAG: 2, CAR: 1 },
    pv: 18, ar: { totale: 0, magica: 0 }, difese: 2, iniziativa: -4,
    movimento: { passo: 1, corsa: 2, scatto: 3 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 9, riflessi: 2, magia: 8 },
    attacchi: [r('Tocco degradante', 9, '1d6', 2, { note: 'Degradazione biologica: colpisce solo organismi biologici, AR normale; non è Etereo e non applica veleno, malattia o Corrosivo.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 4 }, { nome: 'Percezione', va: 8 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: ['accecato', 'assordato', 'terrorizzato'],
    capacita: [
      SENZA_MENTE, PERCEZIONE_DIFFUSA(6),
      { nome: 'Due tocchi', effetto: 'Al massimo due Tocchi degradanti per Round, ciascuno con 1 AzP; un’Opportunità ordinaria usa il Tocco entro 2 Q con lo stesso limite. Nessuna Parata naturale; Schiva solo con movimento concretamente disponibile.' },
      { nome: 'Crescita', effetto: 'Un cadavere biologico a contatto col fungo può nutrire un nuovo esemplare in 2d6 giorni, in ambiente adatto; nulla nasce da una creatura ancora viva, a 0 PV o Morente. Reagisce al movimento e non distingue amici, nemici o soccorritori.' },
    ],
    note: 'Furtività 13 fra funghi. Testa = cappello, Torace = gambo, Braccia = filamenti, Gambe = base locomotrice. Fonte: Violet Fungus, p. 138.',
  },
  {
    id: 'spora-gassosa', nome: 'Spora gassosa', taglia: 'grande', senzaSalvezza: ['volonta'],
    caratteristiche: { FOR: 3, DES: 1, COS: 2, INT: 1, SAG: 1, CAR: 1 },
    pv: 4, ar: { totale: 0, magica: 0 }, difese: 2, iniziativa: -4,
    movimento: { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito', volo: 2 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 6, riflessi: 2, magia: 8 },
    attacchi: [r('Tocco infettivo', 6, '1', 1, { note: 'Poi Tempra senza modificatore: vedi «Tocco infettivo».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 6 }, { nome: 'Percezione', va: 7 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: ['accecato', 'assordato', 'a-terra', 'avvelenato', 'terrorizzato'],
    capacita: [
      SENZA_MENTE, PERCEZIONE_DIFFUSA(6),
      { nome: 'Corpo fluttuante', effetto: 'Volo fluttuante 2 / 4 / 6 Q (nessun movimento a terra), senza ali, finché il sacco è integro. Immune anche a Paralizzato e ai danni da veleno. Non ha raggi oculari né i poteri dello spettatore che imita. Testa = regione sensoriale, Torace = sacco, Braccia = escrescenze, Gambe = base di galleggiamento.' },
      { nome: 'Tocco infettivo', effetto: 'Dopo almeno 1 danno finale contro una creatura biologica suscettibile, Tempra senza modificatore: fallimento → Micosi sporale. Nessun danno da veleno aggiunto; una barriera che impedisce il danno impedisce l’inoculazione.' },
      { nome: 'Sacco fragile e rottura', effetto: 'Il primo colpo che porta i PV a 0 (o un colpo quando è già a 0 PV e ancora integra) rompe l’involucro e libera la nube una sola volta: perde il volo e non può più attaccare, ma non muore né sviene; cade e prosegue con Ferite e Morente. La nube raggiunge subito le creature entro 4 Q con un percorso libero nell’aria (pareti e chiusure ermetiche la bloccano), una sola esposizione per vittima: chi respira fa Tempra −2 (nessuna Difesa attiva); fallimento 1d6 Naturale da tossina inalata (ignora l’AR) e Micosi sporale; successo metà danno per eccesso e nessuna infezione. Apparati autonomi, filtri adatti o fiato già trattenuto proteggono; costrutti, non morti e non biologici non contraggono la micosi. Recuperare PV non richiude il sacco (servono cure e almeno sette giorni).' },
      { nome: 'Micosi sporale', effetto: 'Malattia naturale, Pericolosità V, Grave, incubazione di 1 ora. Poi, a ogni ora, Tempra −2: fallimento 1d6 Naturale interno (ignora AR) e 1 AFT; successo evita entrambi. Due successi consecutivi eliminano l’infezione; un fallimento azzera il conteggio. Termina con Cura Malattie di livello almeno 6 (10 minuti fuori dal combattimento). Nuove esposizioni non duplicano il decorso. Cura Avvelenamenti non la elimina; guarire non restituisce PV né cancella l’AFT. Se un ospite muore infetto e il cadavere non è bonificato, dopo sette giorni può produrre 2d4 nuove Spore gassose.' },
    ],
    note: 'Spora gassosa: PV 4, Tempra 6. Condotta: galleggia verso gli stimoli vicini; non si fa esplodere volontariamente. Fonte: Gas Spore, pp. 137–138.',
  },
  {
    id: 'miconide-germoglio', nome: 'Miconide germoglio',
    caratteristiche: { FOR: 4, DES: 5, COS: 5, INT: 4, SAG: 6, CAR: 3 },
    pv: 12, pm: 6, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 9, volonta: 9, magia: 8 },
    attacchi: [r('Pugno', 8, '1d4', 1, { note: 'Spore irritanti: vedi la capacità.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 7 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      { nome: 'Sensi e mente', effetto: 'Scurovisione 24 Q. Ha una mente e può subire effetti mentali compatibili (non eredita le immunità dei funghi senza mente). Localizzazioni del corpo umanoide (il cappello fa parte della Testa). Nessuna Parata naturale.' },
      { ...RAPPORTO, effetto: RAPPORTO.effetto + ' Raggio 2 Q, 1 AzP; tre volte in ogni periodo di 24 ore.', azioni: { principali: 1 }, usi: { quanti: 3, per: 'giorno' } },
      ALLARME,
      { nome: 'Spore irritanti', effetto: 'Dopo almeno 1 danno finale del Pugno contro un organismo biologico, Tempra senza modificatore: fallimento → Avvelenato, −2 ai VA delle azioni fisiche per 1 Round, senza danni periodici. Veleno naturale di Pericolosità I: antidoto adeguato o Cura Avvelenamenti (liv. 1) lo interrompono. Più applicazioni tengono la scadenza più lontana, senza sommare il malus.' },
      SOLE_MICONIDI,
    ],
    note: 'Condotta: evita il sole e gli estranei aggressivi, cerca un adulto o propone un contatto tramite spore; sotto 3 PV o a Ferita Profonda si ritira. I PX descrivono un eventuale scontro, non richiedono di aggredire una comunità pacifica. Fonte: Myconid Sprout, p. 230.',
  },
  {
    id: 'miconide-adulto', nome: 'Miconide adulto',
    caratteristiche: { FOR: 5, DES: 5, COS: 6, INT: 5, SAG: 7, CAR: 4 },
    pv: 24, pm: 8, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 11, riflessi: 9, volonta: 11, magia: 9 },
    attacchi: [r('Pugno', 10, '1d6', 1, { note: 'Spore irritanti: Tempra senza modificatore, fallimento Avvelenato e −2 fisico per 1 Round (Pericolosità I). Non incorpora gratis le Spore pacificanti.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Sensi e mente', effetto: 'Scurovisione 24 Q; ha una mente, come il germoglio. Nessuna Parata naturale. Con una sola AzP sceglie fra Pugno, spore o Difesa, senza concatenarli.' },
      { ...RAPPORTO, effetto: RAPPORTO.effetto + ' Raggio 4 Q, 1 AzP ogni volta, senza limite giornaliero.', azioni: { principali: 1 } },
      { nome: 'Spore pacificanti', effetto: 'Tre volte in ogni periodo di 24 ore, al massimo una per Round: 1 AzP contro un organismo biologico visibile entro 1 Q che respiri la nube. Tempra senza modificatore: fallimento → Stordito per 1 Round; a fine di ogni propria Iniziativa il bersaglio ripete Tempra e un successo termina lo Stato. La Salvezza sostituisce attacco e Difesa; pareti, apparati autonomi o filtri adatti impediscono l’esposizione. Veleno naturale di Pericolosità II: antidoto adeguato o Cura Avvelenamenti (liv. 2) lo eliminano; immunità ai veleni o a Stordito lo impedisce. Le applicazioni non si sommano.', azioni: { principali: 1 }, usi: { quanti: 3, per: 'giorno' } },
      ALLARME,
      SOLE_MICONIDI,
    ],
    note: 'Cerca dialogo e protezione del circolo; si ritira sotto 6 PV o a Ferita Profonda. Fonte: Myconid Adult, p. 232.',
  },
  {
    id: 'mimic', nome: 'Mimic',
    caratteristiche: { FOR: 8, DES: 6, COS: 7, INT: 3, SAG: 6, CAR: 4 },
    pv: 38, pm: 6, ar: { totale: 2, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 3, corsa: 6, scatto: 9 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 9, volonta: 9, magia: 10 },
    attacchi: [
      r('Pseudopodo', 12, '1d8+1', 1, { note: 'Adesione in forma oggetto: vedi la capacità «Adesione».' }),
      r('Morso', 12, '1d8+1', 1, { ac: 2, note: 'AC 2: prima 1d8+1 Naturale, poi 1d4 Naturale da acido (senza Corrosivo). Una sola Difesa; l’esito e l’AR si applicano a ciascun danno, risolvendo PV e Ferite prima del successivo; un Magistrale raddoppia solo il primo. +2 al VA (14) contro la vittima che trattiene.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    immunita: ['a-terra'],
    capacita: [
      { nome: 'Corpo e sensi', effetto: 'Scurovisione 12 Q; immune ad Acido di qualunque Natura e ad A Terra. Ha una mente e non è immune agli effetti mentali. Testa = bocca e sensi, Torace = massa centrale, Braccia = pseudopodi, Gambe = base locomotrice; mutare forma non guarisce le Menomazioni.' },
      { nome: 'Imitazione', effetto: '1 AzP: assume forma amorfa oppure l’aspetto di un oggetto solido che rientra nel suo volume di 1 × 1 Q. Trasformazione biologica senza PM: statistiche immutate e nessuna funzione meccanica dell’oggetto imitato (non diventa un’arma mistica o una serratura funzionante). Furtività 14 solo in forma oggetto, immobile, in una collocazione plausibile; un esame riuscito, il contatto o il movimento lo scoprono. Può attaccare anche in forma oggetto, rivelandosi.', azioni: { principali: 1 } },
      { nome: 'Adesione', effetto: 'Solo in forma oggetto, su una creatura di spazio ≤ 2 × 2 Q o su un oggetto esposto. Un contatto diretto col corpo, anche se l’AR assorbe il danno del Pseudopodo, impone Riflessi senza modificatore: fallimento → presa (non costa un’altra AzP; un attacco fallito, una Schivata o una Parata magica che annulla il contatto non la attivano). Un’arma o attrezzo interposto può aderire senza immobilizzare chi lo impugna (lo si lascia con le regole del rilascio); una Parata fisica espone solo lo strumento parante, con la stessa PS per ritirarlo. Una sola creatura alla volta: Immobilizzata (movimento 0, −4 fisico); la mano che ha toccato è inutilizzabile finché resta attaccata, l’altra no (l’adesione tramite armatura non blocca le mani). Mantenerla è gratuito, ma il Mimic non può muoversi o Schivare senza rilasciarla. Liberarsi: 1 AzP, Corpo a corpo o Atletica contro Corpo a corpo 12 (−4 di Immobilizzato); un alleato adiacente può fare altrettanto (senza malus se libero); il pareggio conserva il contatto. Rilascio gratuito alla propria Iniziativa; forma amorfa, perdita di coscienza, morte o Menomazione ne interrompono le prese (0 PV no).' },
    ],
    note: 'Non ha automaticamente un linguaggio parlato; un esemplare che comprende un’offerta può scambiare il passaggio con nutrimento. Un Mimic che imita una porta non sostituisce un’intera parete. Condotta: immobilizza una preda e la morde; sotto 9 PV o a Ferita Profonda può rilasciarla e fuggire. Fonte: Mimic, p. 220.',
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
console.log(`${scritti} profili del blocco «Melme funghi e imitatori» scritti in esempi/nemici/mostri/`);
