// «Prima parte» del catalogo (cap. 8) del Manuale dei Mostri v0.18: le quindici schede che aprono il capitolo,
// prima dei blocchi tematici (Aarakocra, Aboleth, Ankheg, Arpia, Basilisco, Bestia distorcente, Bulette, Chimera,
// Cockatrice, Ettercap, Grick, Grifone, Ippogrifo, Manticora, Orsogufo). Profili prestabiliti in
// esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti; niente valori
// inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126).
//
// Scelte di questo blocco (oltre a quelle dei blocchi precedenti):
//  - le schede di questa parte hanno la colonna «Costo» (1 AzP, AC 1) e sono già nel formato dei nemici.
//  - attacchi senza tiro per colpire o senza danno ai PV (Canto dell'Arpia, Sguardo pietrificante, Getto di
//    seta, Soffio di fuoco, Getto acido, Balzo dirompente, Cockatrice: la pietrificazione sta nella capacità).
//  - Furtività con valori condizionati: nel campo il valore senza condizione; il condizionato nelle note.
//  - Percezione «12, oppure 15 con la vista»: nel campo 12, l'altro nelle note.
//  - AR condizionale (Grick: 1, ma 4 contro colpi fisici Naturali; Ankheg: 3, ma 1 se A Terra): nel campo il
//    primo valore della scheda; la condizione è una capacità.
//  - ingombri non quadrati (Aboleth 2 × 3 Q, Basilisco 2 × 1 Q, Grick 1 × 2 Q): `spazio` vuoto e nota con
//    A.167. Taglia Grande solo se il manuale la dice (Aboleth: massa pari a un veicolo) o l'ingombro contiene 2 × 2 Q.
//  - nuoto, scavo, arrampicata e aderenza: capacità o nota (non sono nel movimento del formato).
//  - modulo facoltativo «tana» dell'Aboleth: capacità distinte, marcate «(modulo tana)»; GS/PX del profilo base
//    (Eroe, 70 PX); la variante con modulo attivo (Leggenda, 100 PX) è nella nota.
//
// Uso: node tools/genera_mostri_prima_parte.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.18 (16/10/2026), cap. 8 «Catalogo delle creature» — prime quindici schede';
const scuro = (q = 12) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa ostacoli né individua da sola chi è nascosto.` });
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const d = (nome, va, danno, gittata_q, modalita = ['S'], extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura: 'Naturale', gittata_q, modalita, ac: 1, ...extra });
const VOLO_ALATO = { nome: 'Volo alato', effetto: 'Richiede entrambe le ali utilizzabili e spazio per distenderle. Si mantiene in quota battendo le ali senza percorso minimo né AzM aggiuntiva; decollo e atterraggio sono compresi nell’AzM. Non è levitazione: perdita di coscienza e impedimenti alle ali seguono Volo e Stati del §5.2.5. Nessuna penalità universale per colpirlo perché vola. Una Menomazione permanente al Torace impedisce il volo.' };
const PICCHIATA = { nome: 'Picchiata', effetto: 'È la Carica ordinaria in volo (§5.6): 1 AzP e 1 AzM, almeno 3 Q sufficientemente rettilinei entro la Corsa, VA −2 per 3–6 Q o −4 da 7 Q, danno ×2 per un solo attacco. Nessuna uscita gratuita dalla portata dopo la Carica.' };

const CREATURE = [
  {
    id: 'aarakocra', nome: 'Aarakocra',
    caratteristiche: { FOR: 5, DES: 7, COS: 5, INT: 5, SAG: 6, CAR: 5 },
    pv: 18, pm: 6, ar: { totale: 0, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 4, corsa: 8, scatto: 12, volo: 10 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 12, volonta: 9, magia: 10 },
    attacchi: [r('Artigli', 11, '1d4+1', 1), r('Giavellotto a mano', 10, '1d6', 1), d('Giavellotto scagliato', 11, '1d6+1', 15)],
    abilita: [{ nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 10 }, { nome: 'Sopravvivenza', va: 11 }, { nome: 'Rituali', va: 10 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      VOLO_ALATO, PICCHIATA,
      { nome: 'Difendersi', effetto: 'Può parare con il giavellotto integro (1 AzP); gli artigli non danno Parata naturale. Spendere l’AzM per Schivare esaurisce il movimento del Round, senza un secondo spostamento in volo.' },
      { nome: 'Danza dei cinque venti', effetto: 'Capacità collettiva: cinque Aarakocra coscienti, tutti capaci di volare, entro 6 Q dal capofila (scelto prima) e con almeno 3 PM ciascuno. Per tre Round consecutivi ciascuno spende 1 AzP e 1 AzM alla propria Iniziativa, resta in volo entro 6 Q dal capofila e mantiene Concentrazione; la danza è il solo movimento consentito. Ognuno paga 3 PM all’inizio del primo Round; se uno interrompe, perde Concentrazione o non paga, l’intera danza fallisce e i PM non tornano. Dopo l’azione del quinto nel terzo Round il capofila effettua Rituali 10: un successo evoca un Elementale Minore puro dell’Aria entro 10 Q, per 5 minuti (scheda del Manuale della Magia §14, Evoca Elementale 12 del §13.8: ordini entro 20 Q, iniziativa subito dopo il capofila). Una volta ogni 24 ore per partecipante; nessun viaggio planare.', risorsa: '3 PM', usi: { quanti: 1, per: 'giorno' } },
    ],
    note: 'Vista e udito ordinari, nessuna scurovisione. Dotazione: due giavellotti, uno pronto. Il «Giavellotto della sentinella» (una mano, FOR 3, 1d6 Naturale, portata 1 Q, gittata FOR × 3 Q, AC 1, PI 4, PS Integrità 10; Armi da guerra in Ravvicinato e Armi da lancio a distanza; niente Tiro Rapido, Raffiche o bonus di Parata) è una proposta del manuale e non modifica il catalogo degli Armamenti. Linguaggio auran nell’ambientazione originale. Nome originale: Aarakocra, p. 12. Comportamento: avvista, avverte e prende quota; se perde il volo o subisce Ferita Profonda cerca riparo.',
  },
  {
    id: 'aboleth', nome: 'Aboleth', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 4, COS: 8, INT: 9, SAG: 8, CAR: 8 },
    pv: 70, pm: 24, ar: { totale: 4, magica: 0 }, difese: 9, iniziativa: 3,
    movimento: { passo: 2, corsa: 4, scatto: 6 },
    azioni: { principali: 3, movimento: 1 }, salvezze: { tempra: 14, riflessi: 9, volonta: 14, magia: 13 },
    attacchi: [r('Tentacolo', 14, '1d8+3', 2), r('Coda', 13, '1d10+3', 2)],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 14 }, { nome: 'Scienza', va: 15 }, { nome: 'Cultura', va: 14 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      { nome: 'Azioni distribuite', effetto: 'Può spendere una sola delle proprie AzP per Tentacolo, Coda o Percezione alla fine dell’Iniziativa di un avversario, al massimo due volte per Round e dopo avversari diversi. Sono comprese nelle tre AzP totali (non azioni leggendarie); nessun movimento o manovra offensiva fuori Iniziativa. Occorre essere coscienti, non Sorpresi e liberi da impedimenti.' },
      { nome: 'Parata naturale', effetto: 'Un gruppo di tentacoli integro permette Parata naturale solo in Ravvicinato, a Difese 9 e costo 1 AzP.' },
      { nome: 'Nuotatore nato', effetto: 'Nuoto 8 / 16 / 24 Q effettivi: ogni Q a nuoto costa 1. Respira sia aria sia acqua. Scurovisione 24 Q (solo vista nell’oscurità, senza attraversare ostacoli).' },
      { nome: 'Telepatia', effetto: 'Comunica con una mente consenziente entro 24 Q che comprenda almeno un linguaggio, senza AzP o PM per brevi messaggi nel proprio turno. Non individua menti o bersagli nascosti e non supera protezioni che bloccano il collegamento mentale.' },
      { nome: 'Muco respiratorio', effetto: 'Passivo subacqueo. Il contatto diretto con la sua pelle impone Tempra senza modificatore (una volta per vittima e Round; non basta toccarlo con un’arma o attraverso una protezione chiusa). Fallimento: la vittima respira solo acqua per 1d4 ore; all’asciutto valgono riserva di fiato e soffocamento del §5.23. Malattia naturale di Pericolosità V, Grave: Cura Malattie 6 la termina. Nuove applicazioni tengono la scadenza più lontana.' },
      { nome: 'Infezione dei tentacoli', effetto: 'Se un Tentacolo causa almeno 1 danno dopo le protezioni a un vivente, Tempra senza modificatore: fallimento → latenza di 10 Round, poi una seconda Tempra (successo elimina, fallimento avvia i sintomi). Con i sintomi pelle e tessuti vanno tenuti bagnati: i PV si recuperano solo immersi; ogni 10 minuti consecutivi senza essere immerso né bagnato, 1d4 danni Naturali diretti (ignorano AR). Bagnare la pelle: 1 AzP, riavvia l’intervallo senza curare. Malattia di Pericolosità V, Grave: Cura Malattie 6 la elimina; altrimenti Tempra ogni 24 ore dall’inizio dei sintomi (successo conclude). Nessun aggravamento automatico.' },
      { nome: 'Sondare desideri', effetto: 'Una volta per scena e per mente, quando una creatura visibile comunica con lui per telepatia, tenta di coglierne il desiderio dominante, senza AzP o PM: Volontà senza modificatore; fallimento rivela solo quel desiderio, non memorie complete.', usi: { quanti: 1, per: 'Scena' } },
      { nome: 'Assoggettare', effetto: '1 AzP e 6 PM, massimo tre tentativi ogni 24 ore: un bersaglio con mente, percepito e visibile entro 6 Q fa Volontà −2. Fallimento: obbedisce agli ordini mentali per 10 Round con le proprie Azioni (nessuna extra). Controlla fino a tre vittime. Un ordine breve comune è gratuito una volta per Iniziativa; ordini diversi costano 1 AzP in più; gli ordini entro 24 Q (fuori portata resta l’ultimo). Ordini suicidi terminano il controllo. La vittima ripete Volontà senza penalità a fine di ogni propria Iniziativa e dopo ogni danno subito; termina anche a scadenza, se l’Aboleth perde i sensi, muore o rilascia. Barriera Mentale dà il bonus alla PS; non è una Possessione. Negare Potere: potenza 9.', risorsa: '6 PM', azioni: { principali: 1 }, usi: { quanti: 3, per: 'giorno' } },
      { nome: 'Drenaggio psichico', effetto: '2 AzP e 3 PM su un bersaglio ancora assoggettato, visibile entro 6 Q; nessun tiro per colpire. Volontà senza modificatore: successo dimezza per eccesso 1d6+2 danni psichici e termina Assoggettare; fallimento subisce tutto e resta controllato. Ignora AR e PV temporanei, nessuna Ferita; a 0 PV Volontà come Dardo Psichico (fallimento Svenuto 1+1d4 Round). Barriera Mentale blocca. Recupera PV pari a quelli sottratti, entro il massimo; non PM. Il +2 ai suoi danni psichici è già compreso.', risorsa: '3 PM', azioni: { principali: 2 } },
      { nome: 'Promessa illusoria (modulo tana)', effetto: 'Opzione facoltativa per un Aboleth in tana preparata (non per l’esemplare errante). 1 AzP e 4 PM, fino a tre menti visibili entro 12 Q: Volontà senza modificatore; chi fallisce percepisce una ricompensa o un ambiente falso e ha −2 alle Prove di Percezione pertinenti. Concentrazione, massimo 10 Round; un’interazione fisica contraddittoria permette una nuova Volontà (una per Round); chi resiste è immune 24 ore. Negare Potere: potenza 6. Al massimo una delle prime tre opzioni del modulo per Round.', risorsa: '4 PM', azioni: { principali: 1 } },
      { nome: 'Marea predatoria (modulo tana)', effetto: '1 AzP e 2 PM, superficie d’acqua visibile della tana entro 18 Q: fino a tre creature a terra entro 4 Q dalla riva con percorso libero verso l’acqua fanno Riflessi senza modificatore; chi fallisce è trascinato fino a 4 Q verso la pozza e cade A Terra (nessun danno; movimento forzato senza Attacchi di Opportunità). Non in due Round consecutivi.', risorsa: '2 PM', azioni: { principali: 1 } },
      { nome: 'Rabbia nelle acque (modulo tana)', effetto: '1 AzP e 3 PM, fino a tre menti visibili immerse nell’acqua della tana entro 18 Q: Volontà senza modificatore; fallimento 1d6+2 danni psichici come il Drenaggio, senza recupero di PV. Barriera Mentale blocca. Non in due Round consecutivi.', risorsa: '3 PM', azioni: { principali: 1 } },
      { nome: 'Proiezione remota (modulo tana)', effetto: '1 AzP e 3 PM: immagine illusoria propria entro 1,6 km in un luogo già visto o visto da una vittima assoggettata, a Concentrazione, massimo 10 minuti; percepisce, parla e comunica entro 24 Q ma non attacca né usa altre capacità. Il contatto fisico la dissolve. Negare Potere: potenza 6. Una sola attiva.', risorsa: '3 PM', azioni: { principali: 1 } },
      { nome: 'Segni del territorio (modulo tana)', effetto: 'Entro 1,6 km dalla tana il Direttore può collocare superfici scivolose e fangose (Terreno Difficile sulla mappa) e fonti contaminate imbevibili; svaniscono in 3d10 giorni dopo la morte dell’Aboleth. Non sono attacchi ogni Round.' },
    ],
    note: 'Spazio sulla mappa 2 × 3 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167). Massa paragonabile a quella di un veicolo ai fini del limite di Sbalzante (taglia Grande). GS e PX con modulo tana attivo (solo quando incide davvero sull’incontro): Leggenda, 100 PX. Braccia = gruppi di tentacoli laterali; Gambe = porzioni locomotorie. Natura Comune (la malvagità dell’originale non dà Oscura Simmetria). Fonte: pp. 13–14. Comportamento: tratta e inganna prima di combattere; a 20 PV o Ferita Profonda cerca una via sommersa.',
  },
  {
    id: 'ankheg', nome: 'Ankheg', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 5, COS: 7, INT: 1, SAG: 6, CAR: 3 },
    pv: 32, pm: 6, ar: { totale: 3, magica: 0 }, difese: 9, iniziativa: -4,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Morso', 12, '1d8+2', 1, { proprieta: ['Corrosivo'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Scavo', effetto: 'Scavo 2 Q al Passo, senza Corsa o Scatto sotterranei. Attraversa terra e sabbia, non roccia, metallo o muratura; lascia un cunicolo stretto e instabile. Non colpisce attraverso il terreno: deve emergere e avere portata e linea d’attacco.' },
      { nome: 'Sensi', effetto: 'Scurovisione 12 Q. Percezione delle vibrazioni entro 12 Q sul medesimo terreno continuo: localizza creature in movimento anche senza vederle; non chi vola o è sospeso; pavimenti isolati o interruzioni la spezzano.' },
      { nome: 'Presa mandibolare', effetto: 'In alternativa al Morso: Immobilizzare, 1 AzP, Corpo a corpo 12 contrapposto a Corpo a corpo o Atletica (nessun danno nel tentativo), contro una creatura fino al proprio ingombro. Con successo Immobilizzato e mandibole impegnate. Liberarsi: 1 AzP e Prova contrapposta (i pareggi favoriscono chi trattiene). Per stringere: 1 AzP e nuova contrapposta; con successo il danno del Morso con AR normale e Corrosivo (nessun secondo tiro o Difesa). Finché trattiene non morde altri né usa il Getto acido; rilascio gratuito nella propria Iniziativa.', azioni: { principali: 1 } },
      { nome: 'Getto acido', effetto: '1 AzP, solo con le mandibole libere: linea di 6 × 1 Q dal bordo del suo spazio (non comprende il suo corpo), libera da ostacoli solidi; colpisce tutte le creature della linea, alleati compresi, senza tiro per colpire. Ciascuna fa Riflessi: successo dimezza per eccesso 2d6+1 Naturale Corrosivo prima dell’AR, fallimento tutto. È l’unica difesa (niente Elusione, Parata o Schivata). Dopo l’uso tre Round interi senza ripeterlo (usato nel Round 1, torna nel Round 5). Non spende PM.', azioni: { principali: 1 } },
      { nome: 'Corrosivo', effetto: 'Segue il §5.24: dopo danno e Contromisure si risolve l’Integrità della protezione; il fallimento causa la perdita prevista di PI. Nessun danno periodico, Avvelenato o sottrazione diretta all’AR. Il carapace biologico non è un oggetto con PI. Il Morso ha una sola applicazione di danno.' },
      scuro(12),
    ],
    note: 'AR 3 naturale; da A Terra scende a 1 finché non si rialza. Furtività 10 sotto terra, 7 in superficie. Indipendente dalla Covata. Fonte: p. 21. Comportamento: individua una creatura isolata, emerge vicino e la trascina verso il cunicolo; a 8 PV o Ferita Profonda cerca di interrarsi.',
  },
  {
    id: 'arpia', nome: 'Arpia',
    caratteristiche: { FOR: 6, DES: 6, COS: 5, INT: 4, SAG: 5, CAR: 7 },
    pv: 24, pm: 10, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12, volo: 8 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 11, volonta: 10, magia: 10 },
    attacchi: [r('Artigli', 11, '1d6+1', 1), r('Randello', 10, '1d4+1', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Armi da mischia', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }, { nome: 'Intrattenere', va: 12 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      VOLO_ALATO,
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Artigli e uno di Randello nel Round, ognuno con una propria AzP. Iniziare o mantenere il Canto occupa una delle due AzP. L’Attacco di Opportunità ordinario resta distinto.' },
      { nome: 'Canto di richiamo', effetto: 'Capacità innata mentale: inizio 1 AzP e 2 PM; mantenimento a ogni Iniziativa successiva 1 AzP e 1 PM; voce udibile e Concentrazione, massimo 10 Round; interrompibile gratis. Colpisce umanoidi e giganti con una mente che odono il canto entro 24 Q (non serve una lingua comune né vedere l’Arpia); ogni nuovo ascoltatore fa subito Volontà senza modificatore (successo → immune a questa Arpia per 24 ore). Fallimento: Richiamo — alla propria Iniziativa usa l’AzM al Passo per avvicinarsi lungo il percorso più diretto, fermandosi a 1 Q; non può attaccare né scegliere altre attività, può difendersi e compiere le sole azioni necessarie al percorso. Davanti a un pericolo evidente (precipizio, lava) nuova Volontà con +2. A fine della propria Iniziativa e dopo ogni danno subito: nuova Volontà senza modificatore (successo termina e dà l’immunità). Il movimento imposto non provoca Attacchi di Opportunità. Il Richiamo termina se la vittima non può più udire, esce da 24 Q o il canto finisce. Barriera Mentale aggiunge il bonus. Negare Potere sulla vittima: potenza 4 (immune 24 ore).', risorsa: '2 PM', azioni: { principali: 1 } },
    ],
    note: 'Randello d’osso: Comune, una mano, Armi da mischia, FOR 3, 1d4 Naturale (il danno della scheda include già +1), PI 3, PS Integrità 10; può parare, disarmabile e danneggiabile. Vista e udito ordinari. Comprende e parla una lingua locale. Fonte: Harpy, p. 181. Comportamento: cerca una posizione sopraelevata e una via di fuga; a Ferita Profonda o senza il vantaggio della quota fugge.',
  },
  {
    id: 'basilisco', nome: 'Basilisco',
    caratteristiche: { FOR: 7, DES: 4, COS: 7, INT: 1, SAG: 4, CAR: 3 },
    pv: 32, pm: 8, ar: { totale: 3, magica: 0 }, difese: 8, iniziativa: -5,
    movimento: { passo: 4, corsa: 8, scatto: 12 },
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 8, volonta: 8, magia: 10 },
    attacchi: [r('Morso', 12, '1d8+2', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 9 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      { nome: 'Veleno del morso', effetto: 'Se almeno 1 danno del Morso supera l’AR, un bersaglio vivente subisce veleno naturale di Pericolosità II, Importante: Tempra senza modificatore, successo dimezza per eccesso 1d4+1 danni, fallimento li subisce tutti. Una sola perdita immediata che ignora AR; nessuno Stato o danno periodico. Conseguenza separata del colpo, non una seconda AC.' },
      { nome: 'Sguardo pietrificante', effetto: '1 AzP e 2 PM, un bersaglio vivente entro 6 Q; devono vedersi direttamente negli occhi (non vale con immagini o registrazioni; vale il riflesso nello specchio). Nessuna Prova per colpire né Parata, Schivata o Elusione. Primo contatto: Tempra senza modificatore, fallimento → Immobilizzato ma cosciente. Alla fine della successiva Iniziativa della vittima una sola nuova Tempra: successo termina Immobilizzato, fallimento completa la pietrificazione (non serve mantenere il contatto visivo). Pietrificato: statua inerte, senza Azioni, percezione o Difesa attiva; Concentrazione e Focalizzazione terminano; non è morto, non respira né si nutre. Le due fasi sono un unico effetto persistente di potenza 6 (Negare Potere ammesso, anche dopo la trasformazione). Non ripristina PV, PM, Ferite o parti perdute; la statua mantiene l’AR della vittima; i danni agiscono su PV e Ferite con le Salvezze passive; Ferite oltre Grave seguono Morente (il contatore non si sospende). Le cure biologiche non agiscono; Sanguinamento e affezioni sono sospesi. Nessuna ulteriore applicazione su un bersaglio già in trasformazione. Non è un veleno né una malattia.', risorsa: '2 PM', azioni: { principali: 1 } },
      { nome: 'Contromisure', effetto: 'Distogliere gli occhi: chi conosce il pericolo e non è Sorpreso può evitare il contatto visivo prima di essere bersagliato, senza AzP (non vede il Basilisco e ne subisce le conseguenze sensoriali). Specchio: un riflesso nitido entro 6 Q può essere scambiato per un rivale; se usa lo Sguardo su di esso risolve su di sé entrambe le Tempra. Presentare lo specchio: 1 AzP.' },
      scuro(12),
    ],
    note: 'Spazio sulla mappa 2 × 1 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167). AR 3 naturale. Non è immune al proprio sguardo riflesso. Nessuna Parata naturale. Otto zampe (Braccia = gruppo anteriore, Gambe = posteriore). Nome originale: Basilisk, p. 24. Comportamento: preferisce incontrare lo sguardo di un intruso e attendere che rallenti; a Ferita Seria cerca riparo.',
  },
  {
    id: 'bestia-distorcente', nome: 'Bestia distorcente', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 7, COS: 7, INT: 3, SAG: 6, CAR: 4 },
    pv: 38, pm: 8, ar: { totale: 1, magica: 0 }, difese: 12, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 13, volonta: 9, magia: 10 },
    attacchi: [r('Tentacolo', 13, '1d8+2', 2)],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Tentacoli', effetto: 'Al massimo due attacchi ordinari con Tentacolo per Round, ciascuno con la propria AzP; con un solo tentacolo utilizzabile, uno. Nessuna Parata naturale.' },
      { nome: 'Distorsione luminosa', effetto: 'Passiva, senza AzP o PM. Finché è cosciente e libera di muoversi, gli attacchi che mirano al suo corpo usando la vista subiscono −2 VA. Il corpo occupa i Q reali: l’immagine non dà Copertura né cambia la portata. Non vale contro aree, effetti senza Prova per colpire o chi la localizza con un senso non visivo preciso. Un attacco che raggiunge il corpo senza essere annullato da Schivata, Parata Magistrale o altra Difesa completa la interrompe subito (anche se l’AR azzera il danno); si riattiva alla fine della successiva Iniziativa della bestia. Sospesa se Svenuta, Stordita, Immobilizzata o incapace di spostarsi. Negare Potere: soppressione per 3 Round, potenza 4.' },
      { nome: 'Agilità contro le aree', effetto: 'Passiva. Quando un effetto fisicamente evitabile concede Riflessi per dimezzare il danno, subisce 0 con successo e metà per eccesso con fallimento, poi si sottrae l’AR. Serve poter percepire l’effetto e avere spazio per schivare; non vale se Svenuta, Stordita, Immobilizzata o ignara. Non cambia Tempra, Volontà, Magia, veleni già nel corpo o danni inevitabili.' },
      scuro(12),
    ],
    note: 'Felino a sei zampe con due tentacoli dorsali (Braccia = tentacoli; Gambe = i due gruppi locomotori da tre zampe). Non incorporea. Nome originale: Displacer Beast, p. 81. Comportamento: attacca un bersaglio isolato usando portata e terreno; dopo un colpo subito cerca Copertura; a Ferita Seria abbandona la caccia ordinaria.',
  },
  {
    id: 'bulette', nome: 'Bulette', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 5, COS: 9, INT: 2, SAG: 5, CAR: 2 },
    pv: 52, pm: 6, ar: { totale: 4, magica: 0 }, difese: 9, iniziativa: -3,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 9, volonta: 8, magia: 9 },
    attacchi: [r('Morso', 13, '1d10+3', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      { nome: 'Limite offensivo', effetto: 'Al massimo un Morso oppure un Balzo dirompente nel Round; la seconda AzP resta per Difese o altre attività. Escluso il singolo Attacco di Opportunità ordinario.' },
      { nome: 'Scavo', effetto: 'Scavo 4 Q al Passo: attraversa terra, sabbia e detriti cedevoli, non roccia compatta, cemento o metallo; niente Corsa o Scatto sotto terra. Deve emergere per attaccare; il tunnel non è automaticamente stabile.' },
      { nome: 'Vibrazioni', effetto: 'Localizza creature in movimento sul medesimo terreno continuo entro 12 Q; non chi vola o è sospeso, nessun dettaglio visivo; interruzioni del terreno possono bloccare il senso. Non consente attacchi attraverso ostacoli.' },
      { nome: 'Balzo da fermo', effetto: 'Con un’AzM salta fino a 6 Q in orizzontale e supera un dislivello fino a 3 Q anche senza rincorsa, con traiettoria libera e spazio d’arrivo per tutto il suo ingombro; senza Atletica entro questi limiti. Sostituisce quel movimento; può provocare Attacchi di Opportunità per uscita volontaria dalla portata.' },
      { nome: 'Balzo dirompente', effetto: '1 AzP e 1 AzM, nessun PM: un salto di almeno 3 Q orizzontali; sceglie prima fino a tre creature di ingombro ≤ 2 × 2 Q che si troveranno entro 1 Q dal punto d’atterraggio (2 × 2 Q liberi). Riflessi del bersaglio: successo dimezza per eccesso 2d6+3 Naturale prima dell’AR e non cade; fallimento subisce 2d6+3 ridotti dall’AR e cade A Terra anche se l’AR azzera il danno. Una sola applicazione per bersaglio, senza Parata, Schivata o Elusione; niente moltiplicatore della Carica né Morso gratuito. Creature di massa pari a un veicolo non sono bersagli ammessi.', azioni: { principali: 1, movimento: 1 } },
      scuro(12),
    ],
    note: 'Furtività 9 sotto terra, 6 in superficie. Nessuna Parata naturale; non è immune a Terrorizzato. Nome originale: Bulette, p. 34. Comportamento: punta alla preda raggiungibile; a Ferita Seria può ritirarsi sottoterra. Dopo il salto non ha l’AzM per una Schivata nello stesso Round.',
  },
  {
    id: 'chimera', nome: 'Chimera', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 5, COS: 8, INT: 2, SAG: 7, CAR: 5 },
    pv: 60, pm: 8, ar: { totale: 3, magica: 0 }, difese: 9, iniziativa: -3,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 3, movimento: 1 }, salvezze: { tempra: 13, riflessi: 9, volonta: 10, magia: 10 },
    attacchi: [r('Morso', 13, '1d8+3', 1), r('Corna', 12, '1d8+3', 1), r('Artigli', 13, '1d6+3', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 14 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      VOLO_ALATO,
      { nome: 'Tre opzioni ordinarie', effetto: 'Nel Round al massimo un Morso, un attacco di Corna e uno di Artigli, ognuno con una delle tre AzP; può rinunciare a uno o più attacchi per difendersi. Le tre teste non danno Reazioni o Azioni fuori Iniziativa. L’Attacco di Opportunità usa solo un’arma naturale ravvicinata.' },
      { nome: 'Soffio di fuoco', effetto: 'Secrezione biologica, nessun PM, 1 AzP. Sostituisce nel Round il Morso o le Corna (dichiarando quale), non è un quarto attacco. Cono lungo 3 Q dalla testa draconica, con percorso libero (Copertura Totale e ostacoli lo fermano); colpisce tutte le creature comprese, alleati compresi, una sola volta. Riflessi senza modificatore: successo dimezza per eccesso 2d6+3 Naturale Fuoco prima dell’AR, fallimento tutto. Nessuna Prova per colpire. Non applica Incendiato (può incendiare materiali infiammabili). Dopo l’uso tre Round successivi senza Soffio (usato nel Round 1, torna nel Round 5); non si accelera con AzP o PM.', azioni: { principali: 1 } },
      { nome: 'Tre teste', effetto: 'Una Menomazione funzionale alla Testa colpisce la testa determinata con 1d3 (1 leone, 2 capra, 3 drago): la testa inutilizzabile impedisce rispettivamente Morso, Corna o Soffio. Ferite e gravità restano della creatura intera. Usa la sola Percezione della scheda e non è immune alla Sorpresa; la perdita di una testa non riduce il budget di AzP.' },
      scuro(12),
    ],
    note: 'Comprende una lingua dell’ambientazione ma non la parla. Nessuna resistenza al fuoco. Braccia = zampe anteriori; Gambe = posteriori. Nome originale: Chimera, p. 39. Comportamento: apre con il Soffio su bersagli raccolti; a Ferita Grave o con le ali compromesse difende una posizione o negozia.',
  },
  {
    id: 'cockatrice', nome: 'Cockatrice',
    caratteristiche: { FOR: 3, DES: 6, COS: 5, INT: 1, SAG: 6, CAR: 2 },
    pv: 14, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: -3,
    movimento: { passo: 4, corsa: 8, scatto: 12, volo: 8 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 11, volonta: 8, magia: 10 },
    attacchi: [r('Beccata', 10, '1d4', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Pietrificazione temporanea', effetto: 'Si avvia solo se la Beccata infligge almeno 1 danno dopo le protezioni a un organismo vivente (proprietà innata del contatto lesivo; nessuna AzP o PM). Prima resistenza: Tempra con +2; fallimento → Immobilizzato ma cosciente. Alla fine della successiva Iniziativa della vittima seconda Tempra con +2: successo termina, fallimento → statua per 24 ore dal completamento. Nuove beccate non accelerano né impongono altri tiri. Statua: inerte, senza percezione né Difese attive, Concentrazione e Focalizzazione terminano; mantiene l’AR; i danni agiscono normalmente (la vittima può morire); Sanguinamento e affezioni sospesi; il contatore di Morente continua (nessuna stabilizzazione). Dopo 24 ore torna in carne conservando danni, Ferite e Menomazioni; la morte della Cockatrice non la termina. Effetto magico persistente di potenza 4 (Negare Potere ammesso, anche dopo la trasformazione completa). Non è un veleno né una malattia; evitare il contatto visivo non protegge, Armatura e Difese che impediscono il danno residuo sì.' },
      VOLO_ALATO,
      scuro(12),
    ],
    note: 'Piccola bestia alata (Braccia = ali, Gambe = zampe); un’ala inutilizzabile impedisce il volo; nessun modificatore speciale a chi la attacca. Non comprende ordini complessi. Differisce dal Basilisco: qui servono una ferita e due Tempra con +2, e l’effetto termina dopo 24 ore. Nome originale: Cockatrice, p. 42. Comportamento: sibila e becca la minaccia più vicina; a Ferita Profonda si ritira verso un riparo.',
  },
  {
    id: 'ettercap', nome: 'Ettercap',
    caratteristiche: { FOR: 6, DES: 7, COS: 6, INT: 3, SAG: 6, CAR: 3 },
    pv: 28, pm: 6, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 12, volonta: 9, magia: 9 },
    attacchi: [r('Morso', 12, '1d6+1', 1), r('Artigli', 12, '1d6+2', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Armi da lancio', va: 12 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 12 }, { nome: 'Sopravvivenza', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza', effetto: 'Al massimo un Morso e un attacco di Artigli per Round. Il Getto di seta usa una delle due AzP e rispetta il proprio recupero. Nessuna Parata naturale.' },
      { nome: 'Veleno naturale II', effetto: 'Se il Morso infligge almeno 1 danno dopo l’AR, Tempra senza modificatore a un vivente: successo dimezza per eccesso 1d4 danni da veleno e nessuna penalità; fallimento 1d4 danni (immediati, ignorano AR, non si ripetono) e Avvelenato con −2 alle Prove fisiche per 10 Round. A fine di ogni propria Iniziativa nuova Tempra: il successo termina la penalità. Una nuova esposizione rinnova solo i 10 Round (niente PS iniziale, danno o cumulo). Cura Avvelenamenti 2 o un antidoto lo terminano; Medicina da sola no.' },
      { nome: 'Arrampicata e percezione della rete', effetto: 'Pareti e soffitti aderenti senza Atletica nelle condizioni ordinarie, fino a 6 Q al Passo per AzM; niente Corsa o Scatto in arrampicata. Toccando una propria ragnatela continua localizza entro 12 Q chi la sollecita; non vede attraverso i filamenti né chi resta immobile. Ignora gli impedimenti delle normali ragnatele.' },
      { nome: 'Getto di seta', effetto: '1 AzP, nessun PM, Armi da lancio 12 contro un bersaglio visibile ≤ 2 × 2 Q, gittata massima 12 Q (da 11 Q −2). Non causa danno, ignora l’AR. Il bersaglio può Schivare; la Parata non ferma il getto. Colpo riuscito e non evitato: Immobilizzato (gambe e braccia legate, −4 alle Prove fisiche). Dopo l’uso tre Round successivi senza Getto (usato nel Round 1, torna nel Round 5). Le reti persistono finché rimosse. Liberazione: la vittima spende 1 AzP per Atletica (con il −4, consentita anche con gli arti legati); un alleato adiacente con una lama idonea spende 1 AzP e taglia senza tiro né danno; un attacco da Fuoco che infligge almeno 1 danno alla tela la distrugge (le aree coinvolgono anche il prigioniero). Materia biologica: Negare Potere non la dissolve.', azioni: { principali: 1 } },
      { nome: 'Reti predisposte', effetto: 'Un minuto di lavoro occupa un Q di passaggio con filamenti visibili: Terreno Difficile (Immobilizzato richiede l’attacco o una trappola definita a parte). L’Ettercap le attraversa senza penalità.' },
      scuro(12),
    ],
    note: 'Getto di seta: VA 12, massimo 12 Q (non è nell’elenco attacchi perché non infligge danni). Braccia = arti superiori di presa. Nome originale: Ettercap, p. 131. Comportamento: cerca vie verticali e ostacoli; a Ferita Profonda può abbandonare la preda e allontanarsi sulla rete. Il manuale esclude l’Ettercap con garrota.',
  },
  {
    id: 'grick', nome: 'Grick',
    caratteristiche: { FOR: 6, DES: 6, COS: 5, INT: 2, SAG: 6, CAR: 2 },
    pv: 24, pm: 5, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: -2,
    movimento: { passo: 6, corsa: 12, scatto: 18 },
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Tentacoli', 12, '1d8+1', 1), r('Becco', 11, '1d6+1', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Tentacoli e Becco', effetto: 'Un solo attacco di Tentacoli per Round. Se infligge almeno 1 danno dopo l’AR, può spendere la seconda AzP per un Becco contro la stessa vittima nella stessa Iniziativa (non gratuito, non contro un’altra vittima). L’Attacco di Opportunità usa solo i Tentacoli.' },
      { nome: 'Cute elastica', effetto: 'Contro danni Naturali da taglio, perforazione o impatto fisico (compresi proiettili e armi naturali) usa AR totale 4 al posto di 1. Contro Fuoco, acido, altri danni non coperti e qualsiasi danno Magico usa AR 1; contro Etereo AR 0. Non si sommano 4 e 1.' },
      { nome: 'Arrampicata', effetto: 'Arrampicata 4 Q al Passo su superfici con appigli, non su ogni soffitto liscio.' },
      scuro(12),
    ],
    note: 'Spazio sulla mappa 1 × 2 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167). Furtività 13 immobile fra rocce in ambiente adatto (non è invisibilità). Il profilo è il Grick comune, non l’Alfa. Braccia = tentacoli; Testa = becco e capo. Nessuna Parata naturale. Nome originale: Grick, p. 173. Comportamento: preda vicina; a Ferita Profonda si ritrae in una fessura.',
  },
  {
    id: 'grifone', nome: 'Grifone', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 7, COS: 7, INT: 2, SAG: 6, CAR: 3 },
    pv: 36, pm: 6, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 16 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 12, volonta: 8, magia: 9 },
    attacchi: [r('Becco', 12, '1d6+2', 1), r('Artigli', 13, '1d8+2', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      VOLO_ALATO, PICCHIATA,
      { nome: 'Sequenza offensiva', effetto: 'Al massimo un Becco e un attacco di Artigli per Round, ognuno con una propria AzP. La Picchiata usa la Carica su un solo attacco. Non afferra né trasporta automaticamente una preda colpita. Nessuna Parata naturale; Schivare consuma l’unica AzM. Movimento misto: si sommano le frazioni distanza percorsa / consentita (es. 3 dei 6 Q a terra lasciano 8 dei 16 Q in volo).' },
      scuro(12),
    ],
    note: 'Percezione 12, oppure 15 con la vista (la vista acuta non rivela invisibili o nascosti). Un Grifone selvatico non è una cavalcatura pronta all’uso. Nome originale: Griffon, p. 174. Comportamento: cerca un bersaglio esposto e attacca dall’alto; a Ferita Seria può interrompere la caccia; difende più a lungo il nido.',
  },
  {
    id: 'ippogrifo', nome: 'Ippogrifo', taglia: 'grande',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 2, SAG: 6, CAR: 3 },
    pv: 24, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: -2,
    movimento: { passo: 8, corsa: 16, scatto: 24, volo: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 11, volonta: 8, magia: 9 },
    attacchi: [r('Becco', 11, '1d6+2', 1), r('Artigli', 11, '1d6+2', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      VOLO_ALATO,
      { nome: 'Attacchi e movimento', effetto: 'Al massimo un Becco e un attacco di Artigli per Round, ciascuno con un’AzP. Può usare la Carica, anche in Picchiata, migliorando un solo attacco. La velocità non concede una ritirata gratuita dopo il colpo. Nessuna Parata naturale.' },
    ],
    note: 'Percezione 12, oppure 15 con la vista (senza scurovisione né immunità). Addestrabile ma non per questo mansueto o disponibile al trasporto. Nome originale: Hippogriff, p. 184. Comportamento: prima minaccia o tenta di allontanare l’intruso, se può sceglie la fuga; a Ferita Profonda abbandona lo scontro senza motivazioni territoriali; vicino ai piccoli continua a proteggere il nido.',
  },
  {
    id: 'manticora', nome: 'Manticora', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 7, COS: 7, INT: 4, SAG: 6, CAR: 4 },
    pv: 40, pm: 8, ar: { totale: 2, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 10 }, spazio: '2 × 2 Q',
    azioni: { principali: 3, movimento: 1 }, salvezze: { tempra: 12, riflessi: 12, volonta: 9, magia: 10 },
    attacchi: [r('Morso', 12, '1d6+2', 1), r('Artigli', 12, '1d6+2', 1), d('Spina caudale', 12, '1d6+2', 40, ['S'], { note: 'VA 12 a 1–10 Q, 10 a 11–20 Q, 8 a 21–40 Q; oltre 40 Q non colpisce. Riserva di 24 spine.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Armi da lancio', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      VOLO_ALATO,
      { nome: 'Sequenza', effetto: 'Nel Round al massimo un Morso, due attacchi di Artigli e tre Spine entro il budget di tre AzP; si possono combinare ma i massimi non si sommano in sei attacchi. Ogni colpo costa una propria AzP. L’Attacco di Opportunità usa Morso o Artigli (non una salva di Spine) ed è escluso dai limiti. Nessuna Parata naturale.' },
      { nome: 'Spine caudali', effetto: 'Riserva massima 24 spine; ogni tiro ne consuma una (anche se manca o è evitato). Il costo di 1 AzP comprende il rilascio; non sono Tiro Rapido né Raffica: ogni tiro ha il proprio VA, bersaglio, Difesa e danno. VA prima degli altri modificatori: 12 a 1–10 Q, 10 a 11–20 Q, 8 a 21–40 Q, oltre 40 Q non può colpire. Si applicano Copertura e Difese a distanza. Nessun veleno né Sanguinamento o Immobilizzato automatici. Ricrescita: 3 spine per ogni ora completa di riposo con nutrimento adeguato, fino a 24; nessun ripristino automatico a fine scontro. Se la coda è resa inutilizzabile, niente Spine.' },
      scuro(12),
    ],
    note: 'Comprende e parla una lingua dell’ambientazione; può trattare (un tributo può risolvere l’incontro). Nome originale: Manticore, p. 213. Comportamento: cerca quota e Copertura; a Ferita Seria, con poche spine o davanti a una preda troppo costosa può ritirarsi o chiedere un tributo.',
  },
  {
    id: 'orsogufo', nome: 'Orsogufo', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 6, COS: 8, INT: 2, SAG: 6, CAR: 3 },
    pv: 42, pm: 6, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: -2,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 10, volonta: 8, magia: 10 },
    attacchi: [r('Becco', 13, '1d6+3', 1), r('Artigli', 13, '1d8+3', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 14 }, { nome: 'Furtività', va: 8 }, { nome: 'Percezione', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza offensiva', effetto: 'Al massimo un attacco con Becco e uno con Artigli per Round, ciascuno con la propria AzP; può riservarne una per difendersi. L’Attacco di Opportunità ordinario è escluso dal limite e non diventa una coppia di attacchi.' },
      { nome: 'Difese', effetto: 'Nessuna Parata naturale. Schivare consuma 1 AzP e 1 AzM; dopo Corsa o Carica non ha una seconda AzM. Con la Carica esegue solo il colpo ammesso; l’eventuale seconda AzP non ha il moltiplicatore.' },
      scuro(12),
    ],
    note: 'Percezione 11, oppure 14 se dipende da vista o olfatto. Non vola. L’origine fantastica non lo rende una creatura dell’Oscura Simmetria. Braccia = zampe anteriori; una zampa inutilizzabile limita attacchi e appoggi. Nome originale: Owlbear, p. 249. Comportamento: concentra gli attacchi sulla preda raggiungibile; se caccia per nutrirsi trascina via una preda inerme; a Ferita Seria può abbandonare; resiste più a lungo se protegge i piccoli.',
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
console.log(`${scritti} profili della prima parte del catalogo scritti in esempi/nemici/mostri/`);
