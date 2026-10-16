// Blocco «Bande e grandi avversari» del catalogo (cap. 8) del Manuale dei Mostri v0.16: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti
// dalle schede; niente valori inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126).
//
// Scelte ricorrenti sugli umanoidi con equipaggiamento (criterio delle bestie, da correggere una volta sola):
//  - AR «X con scudo, Y senza»: `ar.totale` = valore CON scudo (il profilo inizia con lo scudo pronto); il
//    valore senza scudo è nelle note.
//  - Difese «Parata N • Schivata/Elusione M»: `difese` = N (Parata, la difesa attiva con scudo); M nelle note.
//  - Nomi d'Abilità abbreviati del manuale → nomi del catalogo: Mischia→Armi da mischia, Lancio→Armi da
//    lancio, Guerra→Armi da guerra; le qualificazioni («per intimidire», «per congegni semplici», «olfatto»)
//    restano nelle note.
//  - Armi a distanza «massimo N Q» → attacco di tipo distanza con gittata_q N e modalità (S; S+TR per l'Arco
//    da guerra). Armi in mischia e giavellotti lanciati = due attacchi distinti.
//  - Armi a due impugnature (lancia 1d6+2 / 1d6+4): si registra il profilo iniziale (una mano, con scudo); il
//    profilo a due mani è nelle note.
//  - «Tutti gli attacchi sono Naturali, AC 1» (Regole del blocco): natura Naturale, ac 1 per ogni attacco.
//
// Uso: node tools/genera_mostri_bande.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.16 (16/10/2026), cap. 8 «Catalogo delle creature» — Bande e grandi avversari';
const SCUROVISIONE = { nome: 'Scurovisione', effetto: 'Vede entro 12 Q anche nell’oscurità naturale; al buio non distingue i colori, non vede attraverso ostacoli, fumo o oscurità magica e non individua da sé chi è nascosto. Oltre i 12 Q valgono luce e vista ordinarie.' };

const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const d = (nome, va, danno, gittata_q, modalita = ['S'], extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura: 'Naturale', gittata_q, modalita, ac: 1, ...extra });

const CREATURE = [
  {
    id: 'goblin', nome: 'Goblin',
    caratteristiche: { FOR: 3, DES: 7, COS: 4, INT: 5, SAG: 4, CAR: 4 },
    pv: 14, pm: 5, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 2,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 11, volonta: 8, magia: 8 },
    attacchi: [r('Spada leggera', 10, '1d6+2', 1), d('Balestra piccola', 10, '1d4+2', 30, ['S'])],
    abilita: [{ nome: 'Armi da mischia', va: 10 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Furtività', va: 13 }, { nome: 'Percezione', va: 9 }, { nome: 'Atletica', va: 9 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      { nome: 'Sgusciare', effetto: 'Una volta per Round, durante il proprio Passo, evita l’Attacco di Opportunità di un solo nemico visibile quando ne lascia la portata, dichiarandolo prima di muoversi. Gli altri nemici mantengono l’Attacco di Opportunità. Nessun movimento o Azione in più; non con Corsa, Scatto o Carica.', usi: { quanti: 1, per: 'Round' } },
      { nome: 'Nascondersi', effetto: 'Se termina quel Passo dove può occultarsi, effettua Furtività senza un’ulteriore AzP (serve comunque la Prova e la visibilità). Non sparisce mentre è osservato in campo aperto.' },
      SCUROVISIONE,
    ],
    note: 'AR 1 senza scudo (inizia con spada e scudo pronti). Balestra piccola FOR 3, PI 4, solo Colpo Singolo, ricarica 1 AzM e mano libera. Comportamento: tiro protetto e cambio di posizione; sotto 4 PV o da solo fugge o si arrende.',
  },
  {
    id: 'hobgoblin', nome: 'Hobgoblin',
    caratteristiche: { FOR: 6, DES: 5, COS: 6, INT: 5, SAG: 5, CAR: 5 },
    pv: 22, pm: 6, ar: { totale: 5, magica: 0 }, difese: 11, iniziativa: 0,
    movimento: { passo: 5, corsa: 11, scatto: 17 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 10, magia: 9 },
    attacchi: [r('Spada lunga', 11, '1d8+2', 1), d('Arco da guerra', 10, '1d6+1', 100, ['S', 'TR'])],
    abilita: [{ nome: 'Armi da guerra', va: 11 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Atletica', va: 10 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      { nome: 'Attacco coordinato', effetto: 'Una volta per Round, un colpo a segno infligge +2 danni (prima di moltiplicatori, Difese e AR) se un alleato cosciente è entro 1 Q dal bersaglio e lo minaccia in mischia. Una sola applicazione, anche con Tiro Rapido; non cresce col numero di alleati.', usi: { quanti: 1, per: 'Round' } },
      SCUROVISIONE,
    ],
    note: 'Difesa: Parata 11; Schivata/Elusione 10. AR 5 con scudo medio, 3 senza; con l’arco si ripongono spada e scudo e l’AR scende a 3. La media applica già −1 agli attacchi e alle Prove fisiche ostacolate (Schivata compresa) e −1 Q al movimento (senza media: VA +1 e movimento 6/12/18). Comportamento: tiene un fronte; sotto 6 PV o a Ferita Profonda ritirata ordinata.',
  },
  {
    id: 'bugbear', nome: 'Bugbear',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 4, SAG: 5, CAR: 4 },
    pv: 30, pm: 6, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 11, riflessi: 10, volonta: 9, magia: 9 },
    attacchi: [r('Mazza ferrata', 12, '1d6+4', 1), r('Giavellotto a mano', 11, '1d6+3', 1), d('Giavellotto scagliato', 10, '1d6+1', 21, ['S'])],
    abilita: [{ nome: 'Armi da mischia', va: 12 }, { nome: 'Armi da guerra', va: 11 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Furtività', va: 13 }, { nome: 'Percezione', va: 10 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      { nome: 'Forza brutale', effetto: 'I danni ravvicinati includono un +2 innato, oltre al bonus ordinario di Caratteristica (già compreso nei danni scritti). Non appartiene all’arma recuperata, non si aggiunge al lancio né ai danni periodici.' },
      { nome: 'Colpo d’imboscata', effetto: 'Una volta per incontro, nel primo Round in cui partecipa, +2 danni a un colpo ravvicinato contro un bersaglio che non lo aveva individuato. Si dichiara prima del tiro (si consuma anche se manca); precede moltiplicatori, Difese e AR. Vincere l’Iniziativa da solo non basta.', usi: { quanti: 1, per: 'scontro' } },
      SCUROVISIONE,
    ],
    note: 'AR 1 senza scudo (inizia con mazza e scudo piccolo). Due giavellotti FOR 3, PI 4. Comportamento: cerca sorpresa e via di fuga; sotto 8 PV o a Ferita Profonda valuta la ritirata.',
  },
  {
    id: 'coboldo', nome: 'Coboldo',
    caratteristiche: { FOR: 3, DES: 6, COS: 4, INT: 5, SAG: 4, CAR: 4 },
    pv: 12, pm: 5, ar: { totale: 0, magica: 0 }, difese: 9, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 10, volonta: 8, magia: 8 },
    attacchi: [r('Pugnale a mano', 9, '1d4+2', 1), d('Pugnale scagliato', 9, '1d4+2', 9, ['S'])],
    abilita: [{ nome: 'Armi da mischia', va: 9 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Furtività', va: 11 }, { nome: 'Percezione', va: 9 }, { nome: 'Tecnologia', va: 10 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      { nome: 'Tattica di gruppo', effetto: '+2 VA agli attacchi contro un bersaglio minacciato in mischia da almeno un alleato cosciente entro 1 Q. Una volta sola, qualunque sia il numero di alleati; non dà un secondo bonus di circostanza.' },
      { nome: 'Sensibilità al sole', effetto: 'Sotto luce solare diretta (il coboldo o il bersaglio osservato): −2 VA agli attacchi e a Percezione basata sulla vista. Le due condizioni non si sommano; torce e luci artificiali non la attivano; nessun danno o Stato.' },
      SCUROVISIONE,
    ],
    note: 'Tecnologia 10 per congegni semplici. Nessuna armatura o scudo. Tre pugnali FOR 2, PI 4; Tiro Rapido richiede due pugnali pronti. Trappole e cunicoli vanno descritti prima dell’incontro. Comportamento: isolato o sotto 3 PV cerca riparo o si arrende.',
  },
  {
    id: 'orco', nome: 'Orco',
    caratteristiche: { FOR: 7, DES: 5, COS: 7, INT: 4, SAG: 5, CAR: 5 },
    pv: 24, pm: 6, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 11, riflessi: 9, volonta: 9, magia: 9 },
    attacchi: [r('Ascia bipenne', 11, '2d6+2', 1), r('Giavellotto a mano', 11, '1d6+1', 1), d('Giavellotto scagliato', 10, '1d6', 21, ['S'])],
    abilita: [{ nome: 'Armi da guerra', va: 11 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Oratoria', va: 11 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      { nome: 'Avanzata aggressiva', effetto: 'Una volta per Round, quando spende l’AzM per un Passo verso un nemico visibile, il budget è 8 Q invece di 6; deve terminare più vicino a quel nemico e non allontanarsene. Nessuna seconda AzM; Corsa, Scatto, Schivata e Carica restano ordinarie. Ostacoli e Attacchi di Opportunità valgono.', usi: { quanti: 1, per: 'Round' } },
      { nome: 'Carica', effetto: 'Carica comune con l’ascia (Giocatore §5.6): 1 AzP e 1 AzM, almeno 3 Q rettilinei entro 12 Q, VA −2 per 3–6 Q o −4 da 7 Q, danno ×2 per un solo attacco. Avanzata aggressiva non ne aumenta la distanza.' },
      SCUROVISIONE,
    ],
    note: 'Oratoria 11 per intimidire. Ascia bipenne a due mani FOR 6; inizia con l’ascia pronta, nessuno scudo. Comportamento: cerca un bersaglio raggiungibile; se molto ferito o sotto 6 PV può ripiegare.',
  },
  {
    id: 'gnoll', nome: 'Gnoll',
    caratteristiche: { FOR: 6, DES: 5, COS: 6, INT: 4, SAG: 5, CAR: 4 },
    pv: 24, pm: 6, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 8, magia: 9 },
    attacchi: [r('Lancia', 11, '1d6+2', 2), r('Morso', 10, '1d4+1', 1), d('Arco da guerra', 10, '1d6+1', 100, ['S', 'TR'])],
    abilita: [{ nome: 'Armi da guerra', va: 11 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Corpo a corpo', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Sopravvivenza', va: 11 }, { nome: 'Atletica', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      { nome: 'Frenesia', effetto: 'Una volta per Round, se un attacco ravvicinato alla propria Iniziativa rende un nemico Svenuto, Morente o Morto, ottiene subito una sola AzP vincolata a un Morso contro un altro nemico a portata, nella stessa Iniziativa; poi scade (non diventa Difesa). Può prima spendere l’AzM ordinaria. Il Morso non riattiva Frenesia. Il solo passaggio a 0 PV, la resa o la fuga non bastano.', usi: { quanti: 1, per: 'Round' } },
      SCUROVISIONE,
    ],
    note: 'AR 1 senza scudo (inizia con lancia a una mano e scudo piccolo). Lancia a due mani: danno 1d6+4, riposto lo scudo (AR 1). L’arco richiede riporre lo scudo. La lancia non è un giavellotto. Comportamento: isolamento e inseguimento; se la preda è troppo costosa o sotto 6 PV si ritira verso il gruppo.',
  },
  {
    id: 'ogre', nome: 'Ogre', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 4, COS: 8, INT: 3, SAG: 4, CAR: 3 },
    pv: 46, pm: 6, ar: { totale: 1, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 13, riflessi: 7, volonta: 8, magia: 9 },
    attacchi: [r('Maglio a due mani', 12, '2d6+2', 1), r('Giavellotto a mano', 12, '1d6+2', 1), d('Giavellotto scagliato', 9, '1d6', 27, ['S'])],
    abilita: [{ nome: 'Armi da guerra', va: 12 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 9 }, { nome: 'Oratoria', va: 12 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      { nome: 'Forza e ingombro', effetto: 'Solleva, trascina, forza o rompe oggetti con le regole comuni e gli strumenti adatti; non sfonda da sé porte o muri e non ignora l’Integrità. Lo spazio 2 × 2 Q deve poter attraversare il percorso; i passaggi stretti lo limitano. Non ottiene attacchi multipli per la taglia.' },
      SCUROVISIONE,
    ],
    note: 'Oratoria 12 per intimidire. Maglio = Martello a due mani FOR 6; inizia col maglio pronto, nessuno scudo. Con una sola AzP sceglie fra attaccare e Difendersi. Comportamento: colpisce il nemico più vicino; sotto 12 PV o a Ferita Profonda cerca l’uscita.',
  },
  {
    id: 'ettin', nome: 'Ettin', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 4, COS: 8, INT: 4, SAG: 5, CAR: 4 },
    pv: 60, pm: 8, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 8, volonta: 10, magia: 10 },
    attacchi: [r('Ascia leggera', 12, '1d6+3', 1), r('Mazza ferrata', 12, '1d6+3', 1)],
    abilita: [{ nome: 'Armi da mischia', va: 12 }, { nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 11 }, { nome: 'Oratoria', va: 13 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      { nome: 'Braccia poderose', effetto: 'I due danni includono +2 innato oltre al bonus ordinario (già compreso). È ambidestro: niente −4 per il singolo attacco con la mano secondaria. Al massimo due attacchi offensivi nelle proprie AzP per Round; la manovra con due armi li consuma entrambi col normale −4 VA. L’Attacco di Opportunità ordinario resta distinto (uno per Round).' },
      { nome: 'Due vedette', effetto: 'Con entrambe le teste coscienti: +2 a Percezione e +2 a Volontà contro Paura e tentativi di influenzare la mente, con una sola Prova. Perdere la funzionalità di una testa toglie questi bonus.' },
      { nome: 'Un solo organismo', effetto: 'Uno Stato globale, Svenuto per PM 0 e Morente valgono per tutto il corpo; la seconda testa non li annulla. Una Menomazione alla Testa colpisce un capo preciso, senza un secondo tiro gratuito.' },
      SCUROVISIONE,
    ],
    note: 'AR 2 biologica. Oratoria 13 per intimidire. Ascia leggera e mazza ferrata entrambe pronte; nessuna armatura o scudo; para con entrambe senza sommarne i benefici. Comportamento: difende un rifugio o un accordo; sotto 15 PV o a Ferita Seria può abbandonare.',
  },
  {
    id: 'minotauro', nome: 'Minotauro', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 5, COS: 8, INT: 4, SAG: 7, CAR: 4 },
    pv: 54, pm: 8, ar: { totale: 2, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 9, volonta: 11, magia: 10 },
    attacchi: [r('Ascia bipenne', 13, '2d6+3', 1), r('Corna', 13, '1d8+2', 1)],
    abilita: [{ nome: 'Armi da guerra', va: 13 }, { nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 13 }, { nome: 'Sopravvivenza', va: 12 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      { nome: 'Carica cornuta', effetto: 'Carica ordinaria con le Corna: 1 AzP e 1 AzM, almeno 3 Q rettilinei entro 16 Q, VA −2 per 3–6 Q o −4 da 7 Q, danno ×2. Se infligge almeno 1 danno finale a una massa non superiore, il bersaglio effettua FOR o DES a scelta: fallimento → A Terra (senza spostarlo, senza doppio colpo). L’eventuale secondo attacco non ha i benefici della Carica.' },
      { nome: 'Assalto temerario', effetto: 'A inizio Iniziativa, senza costo: +2 VA agli attacchi ravvicinati e −2 VA alle Difese fino all’Iniziativa successiva. Si somma alle penalità della Carica, non elimina costi o requisiti, non si cumula, non tocca le Salvezze.' },
      { nome: 'Memoria dei percorsi', effetto: 'Ricorda gli itinerari percorsi senza Prova; non conosce passaggi mai visitati, cambiamenti, trappole o illusioni non riconosciute, e non vede attraverso i muri.' },
      SCUROVISIONE,
    ],
    note: 'AR 2 biologica. Ascia bipenne a due mani FOR 6, pronta; niente armatura o scudo; para con l’ascia, non con le corna. Comportamento: cerca un percorso di carica; sotto 14 PV o a Ferita Seria ripiega in zona conosciuta.',
  },
  {
    id: 'troll', nome: 'Troll', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 6, COS: 10, INT: 4, SAG: 5, CAR: 3 },
    pv: 60, pm: 8, ar: { totale: 3, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 3, movimento: 1 }, salvezze: { tempra: 15, riflessi: 10, volonta: 9, magia: 10 },
    attacchi: [r('Artiglio', 14, '1d8+2', 1), r('Morso', 14, '1d6+2', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 10 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza offensiva', effetto: 'Nelle proprie AzP al massimo due Artigli e un Morso per Round, pagati separatamente. Le AzP spese per Difese o altro riducono gli attacchi. L’Attacco di Opportunità ordinario resta distinto e non ripete la sequenza.' },
      { nome: 'Rigenerazione', effetto: 'A inizio della propria Iniziativa, prima di agire, recupera 5 PV senza Azioni o PM, fino al massimo. Funziona anche a 0 PV e durante Svenuto, se è vivo e non Morente. Non elimina Ferite, Stati o Menomazioni, non stabilizza Morente, non riattiva un morto. A Morente il recupero è sospeso fino alla stabilizzazione.' },
      { nome: 'Arrestare il recupero', effetto: 'Se subisce almeno 1 danno finale da Fuoco o da un attacco Corrosivo (anche il danno periodico di Incendiato), si annota un blocco: alla successiva Iniziativa salta il recupero e il blocco si cancella. Più colpi prima di quell’Iniziativa non accumulano recuperi persi. Un colpo del tutto assorbito non basta.' },
      { nome: 'Ricrescita lenta', effetto: 'Fuori scontro, vivo e non Morente, ricostruisce un braccio o una gamba dopo un’ora ininterrotta di riposo (un’ora per arto); l’interruzione fa ripartire il tempo. Toglie solo la Menomazione di quell’arto. Non ricrea un capo distrutto né restituisce la vita; le parti staccate sono inerti.' },
      { nome: 'Olfatto', effetto: 'Percezione 12 per odori percepibili (già compresa); non è vista cieca, non dà la posizione esatta e non ignora ostacoli solidi o penalità alla Prova per colpire.' },
      SCUROVISIONE,
    ],
    note: 'AR 3 biologica. Nessun equipaggiamento: artigli, pelle e rigenerazione sono biologici; nessuna Parata naturale. Contromisure: Fuoco e Corrosivo bloccano il recupero; separarlo dalle prede. Comportamento: mantiene il contatto con una preda isolata; sotto 15 PV o dopo ripetuti blocchi cerca riparo.',
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
console.log(`${scritti} profili del blocco «Bande e grandi avversari» scritti in esempi/nemici/mostri/`);
