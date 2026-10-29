// Blocco «Costrutti e creature elementali» del catalogo (cap. 8) del Manuale dei Mostri v0.16: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti;
// niente valori inventati. GS/PX informativo (A.161). Spazio dal campo `spazio` (A.126, A.167).
//
// Scelte del blocco:
//  - attacchi ad area o senza tiro per colpire (VA «—»: Esplosione finale, Fiammata, Terremoto) → capacità,
//    perché il campo `va` degli attacchi è obbligatorio.
//  - elemento del danno nella proprietà dell'attacco: «Acqua Magico» → natura Magico, proprieta ["Acqua"];
//    «Fuoco Naturale» → natura Naturale, proprieta ["Fuoco"].
//  - «AR X, di cui Y magica» → ar.totale X, ar.magica Y.
//  - immunità → Stati del formato (`immunita`); le altre (Fuoco, Fulmine, Sonno, Paralizzato, Disorientato,
//    Affaticamento, pietrificazione) restano nelle note, come chiede il formato.
//  - Elementali evocati: «INI dopo l'evocatore» non è un numero → `iniziativa: 0` con la nota (agiscono dopo
//    l'evocatore); scompaiono a 0 PV (nota). Spazio 2×2 Q, taglia Grande.
//  - presenze/oggetti in volo con «nessun movimento terrestre» → passo 0, Corsa/Scatto non consentiti, `volo`.
//  - ingombri non quadrati (Tappeto 2×1 Q) → campo `spazio` (A.167 del 18/10); la Taglia non si deduce dall'ingombro.
//
// Uso: node tools/genera_mostri_costrutti.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.16 (16/10/2026), cap. 8 «Catalogo delle creature» — Costrutti e creature elementali';
const SCUROVISIONE = { nome: 'Scurovisione', effetto: 'Vede entro 12 Q anche nell’oscurità naturale; non distingue i colori al buio, non vede attraverso gli ostacoli e non individua da sé chi è nascosto.' };
const NON_BIOLOGICO = { nome: 'Corpo non biologico', effetto: 'Non è un organismo vivente: non respira, non mangia, non beve, non dorme. Immune a veleni e malattie biologiche, soffocamento e Sanguinamento. Le cure biologiche, Medicina e il riposo non lo riparano; servono effetti espressamente compatibili. Corrosivo, urti e gli altri danni restano applicabili.' };

const r = (nome, va, danno, natura, portata_q, proprieta, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura, portata_q, ac: 1, ...(proprieta ? { proprieta } : {}), ...extra });
const dist = (nome, va, danno, natura, gittata_q, modalita, proprieta, extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura, gittata_q, modalita, ac: 1, ...(proprieta ? { proprieta } : {}), ...extra });

const CREATURE = [
  {
    id: 'armatura-animata', nome: 'Armatura animata',
    caratteristiche: { FOR: 6, DES: 4, COS: 7, INT: 1, SAG: 3, CAR: 1 },
    pv: 24, ar: { totale: 4, magica: 0 }, difese: 8, iniziativa: 0,
    movimento: { passo: 5, corsa: 10, scatto: 15 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 7, volonta: 7, magia: 9 },
    attacchi: [r('Schianto', 11, '1d6+1', 'Naturale', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 8 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: ['sanguinamento', 'stordito'],
    capacita: [
      { nome: 'Automa senza mente', effetto: 'Esegue ordini semplici fissati alla creazione; nessuna mente da leggere, persuadere, spaventare o possedere (Dardo Psichico non trova bersaglio). Immune anche a Sonno, Affaticamento, Paralizzato e Disorientato; il Ghiaccio può ancora renderla Rallentata o Congelata.' },
      { nome: 'Due colpi distinti', effetto: 'Può usare entrambe le AzP per Schianto, con tiri e Difese separati; nessun attacco doppio gratuito. Le stesse Azioni valgono per altre attività.' },
      { nome: 'Parata con gli avambracci', effetto: 'Parata naturale contro colpi ravvicinati fisici con un avambraccio utilizzabile (Difese 8, 1 AzP). Non para proiettili, aree o tocchi Eterei; le piastre non sono uno scudo e non aggiungono AR.' },
      { nome: 'Sopprimere l’animazione', effetto: 'Negare Potere può bersagliare l’animazione (eccezione, potenza 3): superiore sopprime, pari richiede la PS Volontà del negatore, inferiore no. L’oggetto resta inerte fino alla fine del terzo Round dopo il lancio.' },
      SCUROVISIONE, NON_BIOLOGICO,
    ],
    note: 'PM —: nessuna riserva. AR 4 intrinseca (non armatura indossata, nessuna penalità). Percepisce forme e movimenti entro 12 Q senza occhi (Accecato e Assordato non lo impediscono). Immobile sembra un’armatura: +4 Furtività. Comportamento: blocca un passaggio o insegue nel perimetro assegnato; non fugge per paura.',
  },
  {
    id: 'spada-volante', nome: 'Spada volante',
    caratteristiche: { FOR: 4, DES: 7, COS: 5, INT: 1, SAG: 3, CAR: 1 },
    pv: 14, ar: { totale: 3, magica: 0 }, difese: 12, iniziativa: 2,
    movimento: { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito', volo: 10 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 12, volonta: 7, magia: 9 },
    attacchi: [r('Fendente', 11, '1d8+2', 'Naturale', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    immunita: ['sanguinamento', 'stordito'],
    capacita: [
      { nome: 'Automa senza mente', effetto: 'Esegue ordini semplici; nessuna mente da leggere o influenzare. Immune a Sonno, Affaticamento, Paralizzato e Disorientato; il Ghiaccio può renderla Rallentata o Congelata.' },
      { nome: 'Sostentamento', effetto: 'Si muove in ogni direzione e resta sospesa senza percorso minimo o costo. Immobilizzato blocca il movimento senza spegnere la levitazione; Svenuto da Morente, distruzione o soppressione la fanno cadere. Non trasporta creature.' },
      { nome: 'Parata con la lama', effetto: '1 AzP per Parata contro un colpo ravvicinato fisico (Difese 12); non para a distanza o il tocco Etereo. La sua unica AzP spesa in Difesa impedisce il proprio attacco quel Round.' },
      { nome: 'Sopprimere l’animazione', effetto: 'Negare Potere sull’animazione (potenza 3), come l’Armatura animata; inerte fino alla fine del terzo Round successivo.' },
      SCUROVISIONE, NON_BIOLOGICO,
    ],
    note: 'PM —: nessuna riserva. Il corpo è l’arma; i danni seguono PV e Ferite, senza PI. Non dà proprietà o sintonizzazioni di un’arma magica ai PG. Immobile e appoggiata sembra un oggetto (+4 Furtività). Comportamento: percorso di guardia o bersaglio assegnato; una barriera chiusa ne ferma l’inseguimento.',
  },
  {
    id: 'tappeto-soffocante', nome: 'Tappeto soffocante',
    spazio: '2 × 1 Q',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 1, SAG: 3, CAR: 1 },
    pv: 28, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 2, corsa: 4, scatto: 6 },
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 7, magia: 9 },
    attacchi: [r('Stringere', 12, '1d6+2', 'Naturale', 1, undefined, { note: 'Solo sulla vittima già avvolta; opposizione, non una Difesa. Avvolgere è la capacità omonima.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 8 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    immunita: ['sanguinamento', 'stordito'],
    capacita: [
      { nome: 'Automa senza mente', effetto: 'Esegue ordini semplici; nessuna mente da influenzare. Immune a Sonno, Affaticamento, Paralizzato e Disorientato; il Ghiaccio può renderlo Rallentato o Congelato.' },
      { nome: 'Avvolgere', effetto: '1 AzP contro una creatura con spazio massimo 1 × 1 Q a portata: Corpo a corpo 12 contro Corpo a corpo o Atletica (Prova contrapposta, senza Parata o Schivata). Il successo applica Immobilizzato (braccia e gambe avvolte), Accecato e impedisce la respirazione (§5.23, fiato per COS Round). Una vittima alla volta; la presa non costa Azioni per mantenersi, e finché trattiene non si muove né attacca altri.' },
      { nome: 'Colpire mentre avvolge', effetto: 'Un singolo attacco fisico contro il Tappeto avvolto: metà per eccesso del danno al Tappeto, metà per difetto alla vittima (ognuno con la propria AR); solo la quota di danno fisico si trasferisce, non Stati o altre componenti. Liberarsi: 1 AzP e Corpo a corpo o Atletica contro Corpo a corpo 12 (col −4 di Immobilizzato), consentito anche con gli arti avvolti; un alleato adiacente può srotolarlo con la stessa opposizione, senza danno.' },
      { nome: 'Sopprimere l’animazione', effetto: 'Negare Potere sull’animazione (potenza 4); inerte fino alla fine del terzo Round successivo.' },
      SCUROVISIONE, NON_BIOLOGICO,
    ],
 note: 'PM —: nessuna riserva. Immobile sembra un tappeto (+4 Furtività). Comportamento: protegge un’area o un accesso; interrompere l’animazione apre una finestra per salvare la vittima.',
  },
  {
    id: 'gargoyle', nome: 'Gargoyle',
    caratteristiche: { FOR: 7, DES: 5, COS: 7, INT: 3, SAG: 5, CAR: 3 },
    pv: 34, pm: 8, ar: { totale: 3, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 12 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 9, volonta: 9, magia: 10 },
    attacchi: [r('Artigli', 12, '1d6+2', 'Naturale', 1), r('Morso', 12, '1d6+2', 'Naturale', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    immunita: ['sanguinamento'],
    capacita: [
      { nome: 'Sequenza', effetto: 'Nelle proprie AzP al massimo un attacco di Artigli e un Morso per Round. Nessuna Parata naturale; Schivata e altro consumano le stesse Azioni.' },
      { nome: 'Corpo di pietra', effetto: 'Dimezza per eccesso il danno Naturale da urti, tagli e perforazioni dopo le Difese e prima dell’AR 3. Magico, Etereo ed elementale pieni. Immune ad Affaticamento e alla pietrificazione; Ghiaccio, paura e controllo mentale restano applicabili.' },
      { nome: 'Statua in attesa', effetto: 'Immobile in una posa plausibile: +4 Furtività per non essere riconosciuto come creatura, fino a un movimento osservato. Scurovisione 12 Q.' },
      { nome: 'Ali e anatomia', effetto: 'Vola con ali funzionali (12 / 24 / 36 Q); una Menomazione permanente al Torace compromette il cingolo alare e impedisce il volo. Ha una mente: non usa le immunità degli Oggetti animati. Negare Potere non cancella il corpo o il volo innato.' },
      SCUROVISIONE, NON_BIOLOGICO,
    ],
    note: 'Creatura elementale di pietra con mente. Comportamento: difende appostamenti e accessi, sceglie prede isolate, può trattare; sotto 9 PV o a Ferita Seria cerca una posizione protetta.',
  },
  {
    id: 'azer', nome: 'Azer',
    caratteristiche: { FOR: 7, DES: 5, COS: 7, INT: 6, SAG: 6, CAR: 5 },
    pv: 32, pm: 8, ar: { totale: 5, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 10, magia: 11 },
    attacchi: [r('Martello caldo', 12, '1d8+2', 'Naturale', 1, undefined, { note: 'Aggiunge 1d4 Fuoco Naturale (stesso attacco e stessa AC): vedi «Arma riscaldata». Solo il residuo di Fuoco oltre Ignifugo può imporre Incendiato.' }), r('Pugno', 10, '1d4+1', 'Naturale', 1)],
    abilita: [{ nome: 'Armi da guerra', va: 12 }, { nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Tecnologia', va: 13 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    immunita: ['sanguinamento', 'incendiato'],
    capacita: [
      { nome: 'Arma riscaldata', effetto: 'Il martello impugnato dall’Azer aggiunge 1d4 Fuoco Naturale al colpo (un solo attacco, una sola AC, una sola Difesa). Resistenze e AR si applicano separatamente al fisico e al Fuoco, poi si sommano i residui. Solo il residuo di Fuoco oltre Ignifugo può imporre Riflessi senza modificatore contro Incendiato. Un martello lasciato o raccolto da altri perde subito il Fuoco; il Pugno non lo riceve.' },
      { nome: 'Contatto diretto', effetto: 'Chi tocca il suo corpo o mantiene una presa diretta subisce 1d4 Fuoco Naturale, senza Difesa attiva (AR e protezioni pertinenti), al massimo una volta per creatura e Round. Colpirlo con un’arma o parare con uno scudo non è contatto diretto. Il residuo oltre Ignifugo può imporre Incendiato con Riflessi ordinario.' },
      { nome: 'Calore e protezioni', effetto: 'Immune a Fuoco e Incendiato. Non dimezza genericamente il Naturale, non è immune al Ghiaccio. Capelli e barba incandescenti illuminano 2 Q (penombra per altri 2). Ha mente, emozioni e volontà.' },
      SCUROVISIONE, NON_BIOLOGICO,
    ],
    note: 'AR 5 (3 intrinseca + 2 scudo medio); senza scudo scende a 3. Tecnologia 13 per metallurgia. Martello da guerra e scudo medio Comuni, entrambi pronti; può parare con l’uno o l’altro. Comportamento: difende la fucina o un lavoro; non necessariamente ostile, trattare può evitare lo scontro.',
  },
  {
    id: 'magmin', nome: 'Magmin',
    caratteristiche: { FOR: 3, DES: 7, COS: 5, INT: 4, SAG: 5, CAR: 4 },
    pv: 14, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 11, volonta: 8, magia: 9 },
    attacchi: [r('Tocco ardente', 11, '1d6+2', 'Naturale', 1, ['Fuoco'])],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: ['sanguinamento', 'incendiato'],
    capacita: [
      { nome: 'Guscio e fiamma', effetto: 'Immune a Fuoco e Incendiato. Dimezza per eccesso il danno Naturale da urti, tagli e perforazioni dopo le Difese e prima dell’AR 2; le altre componenti no. Immune ad Affaticamento e Sonno. Ha una mente (non eredita le immunità mentali degli automi). Nessuna Parata naturale.' },
      { nome: 'Tocco e luce', effetto: 'Il Tocco ardente ammette le Difese; il residuo oltre Ignifugo può imporre Riflessi ordinario contro Incendiato. Con 1 AzP accende o spegne le fiamme (acceso illumina 2 Q più 2 di penombra) o incendia combustibile incustodito a contatto. Scurovisione 12 Q.' },
      { nome: 'Esplosione finale', effetto: 'Una sola volta, quando è distrutto (fine del contatore di Morente, non a 0 PV): tutte le altre creature entro 2 Q, alleati compresi, 1 AC, un solo 1d6+2 Fuoco Naturale; i solidi bloccano. Elusione su Riflessi con +2 dimezza prima dell’AR; dopo residuo e Ignifugo, una distinta PS Riflessi con +2 evita Incendiato. Non costa Azioni e non è volontaria.' },
      NON_BIOLOGICO,
    ],
    note: 'PM —: nessuna riserva. Creatura elementale di magma con mente. Comportamento: cerca calore e combustibile; sotto 4 PV o a Ferita Profonda cerca calore o fuga. Acqua e sabbia spengono gli incendi ma non lo distruggono.',
  },
  {
    id: 'elementale-acqua-maggiore', nome: 'Elementale dell’Acqua Maggiore',
    caratteristiche: { FOR: 9, DES: 8, COS: 10, INT: 5, SAG: 5, CAR: 5 },
    pv: 32, ar: { totale: 4, magica: 4 }, difese: 14, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 16, riflessi: 14, volonta: 10, magia: 12 },
    attacchi: [r('Schiaffo', 15, '2d6+4', 'Magico', 1, ['Acqua']), dist('Dardo d’acqua', 14, '2d6+2', 'Magico', 12, ['S'], ['Acqua'])],
    abilita: [{ nome: 'Corpo a corpo', va: 15 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    immunita: ['a-terra', 'ammalato', 'avvelenato', 'sanguinamento', 'stordito'],
    capacita: [
      { nome: 'Sbalzante', effetto: 'Entrambi gli attacchi applicano Sbalzante 1 dopo il danno residuo e la Contromisura, senza PS contro lo spostamento, allontanando dall’elementale. Un ostacolo ferma nell’ultimo Q libero senza danno da collisione; la PS Riflessi prima di un pericolo letale resta dovuta.' },
      { nome: 'Avvolgere le vie respiratorie', effetto: '1 AzP contro una creatura a contatto con spazio ≤ 2 × 2 Q: Corpo a corpo 15 contro Corpo a corpo o Atletica (opposizione, senza seconda Difesa). Il successo applica Immobilizzato e impedisce la respirazione anche fuori dall’acqua (§5.23), senza Schiaffo né Sbalzante. Mantenere costa 1 AzP per Round; l’elementale resta fermo. Liberarsi: 1 AzP e nuova opposizione (i pareggi favoriscono l’elementale).' },
      { nome: 'Protezioni', effetto: 'Immune ad Acqua e Fuoco (effetti secondari compresi). Ghiaccio infligge danno normale e può dare Rallentato o Congelato. Dimezza il danno Naturale dopo le Difese e prima dell’AR 4 (tutta magica). Nuota 12 / 24 / 36 Q.' },
      NON_BIOLOGICO,
    ],
    note: 'PM —: nessuna riserva. Il VA 14 è quello del Dardo d’acqua, già in tabella: «Attacco a distanza» non è un’Abilità (A.169, 18/10), non dà Armi da lancio né altre competenze. Profilo evocato (Magia §14.1): «INI dopo l’evocatore» (qui 0; sulla plancia agisce dopo chi lo evoca). Scompare a 0 PV, a fine durata, al congedo o alla perdita di coscienza dell’evocatore. Spazio 2 × 2 Q (Sbalzante non lo sposta).',
  },
  {
    id: 'elementale-aria-maggiore', nome: 'Elementale dell’Aria Maggiore',
    caratteristiche: { FOR: 8, DES: 10, COS: 9, INT: 5, SAG: 5, CAR: 5 },
    pv: 28, ar: { totale: 3, magica: 3 }, difese: 16, iniziativa: 0,
    movimento: { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito', volo: 12 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 16, volonta: 10, magia: 12 },
    attacchi: [r('Folata', 15, '2d6+3', 'Magico', 1, ['Aria']), dist('Dardo d’aria', 16, '2d6+2', 'Magico', 12, ['S'], ['Aria'])],
    abilita: [{ nome: 'Corpo a corpo', va: 15 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    immunita: ['a-terra', 'ammalato', 'avvelenato', 'sanguinamento', 'stordito'],
    capacita: [
      { nome: 'Abbattimento', effetto: 'Entrambi gli attacchi colpiscono un solo bersaglio: dopo danno residuo e Contromisura, Riflessi con −4; il fallimento applica A Terra (chi è già A Terra non subisce effetto aggiuntivo). Niente lancio casuale, danno da collisione o turbine ad area.' },
      { nome: 'Sostentamento', effetto: 'Vola in ogni direzione (12 / 24 / 36 Q) e resta sospeso senza AzP. Movimento 0 impedisce lo spostamento senza fargli perdere quota. Non attraversa muri o creature e non vede attraverso gli ostacoli.' },
      { nome: 'Protezioni', effetto: 'Immune ad Aria e Fulmine (effetti secondari compresi). Nessuna vulnerabilità ×2. Dimezza il danno Naturale dopo le Difese e prima dell’AR 3 (tutta magica).' },
      NON_BIOLOGICO,
    ],
    note: 'PM —: nessuna riserva. Il VA 16 è quello del Dardo d’aria, già in tabella: «Attacco a distanza» non è un’Abilità (A.169, 18/10), non dà Armi da lancio né altre competenze. Profilo evocato (Magia §14.2): «INI dopo l’evocatore» (qui 0; sulla plancia agisce dopo chi lo evoca). Scompare a 0 PV, a fine durata o al congedo. Spazio 2 × 2 Q. È immune ad A Terra (lo subisce il bersaglio, non l’elementale).',
  },
  {
    id: 'elementale-fuoco-maggiore', nome: 'Elementale del Fuoco Maggiore',
    caratteristiche: { FOR: 9, DES: 9, COS: 9, INT: 5, SAG: 5, CAR: 5 },
    pv: 28, ar: { totale: 3, magica: 3 }, difese: 14, iniziativa: 0,
    movimento: { passo: 5, corsa: 10, scatto: 15 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 15, volonta: 10, magia: 12 },
    attacchi: [r('Tocco Ustionante', 16, '2d6+5', 'Magico', 1, ['Fuoco'])],
    abilita: [{ nome: 'Corpo a corpo', va: 16 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    immunita: ['a-terra', 'ammalato', 'avvelenato', 'sanguinamento', 'stordito', 'incendiato'],
    capacita: [
      { nome: 'Tocco', effetto: 'Corpo a corpo 16 con le normali Difese; dopo residuo e Ignifugo impone Riflessi con −4 contro Incendiato. Non colpisce una creatura per il solo contatto dei Q.' },
      { nome: 'Fiammata', effetto: '1 AzP, linea lunga 5 Q e larga 1 Q dal bordo del corpo in una direzione dichiarata. Nessun tiro per colpire, 1 AC per bersaglio, un solo 2d6+2 Fuoco Magico per tutta l’area; coinvolge gli alleati, fermata dai solidi. Elusione su Riflessi con −4 dimezza prima dell’AR; dopo residuo e Ignifugo, una distinta PS Riflessi con −4 evita Incendiato.' },
      { nome: 'Protezioni e luce', effetto: 'Immune a Fuoco e Incendiato. Per il Maggiore, Acqua e Ghiaccio infliggono danno normale (non raddoppiano, nessuno spegnimento automatico). Dimezza il danno Naturale dopo le Difese e prima dell’AR 3 (tutta magica). Illumina 2 Q; con 1 AzP incendia combustibile incustodito a contatto. Non vola né attraversa pareti.' },
      NON_BIOLOGICO,
    ],
    note: 'PM —: nessuna riserva. Profilo evocato (Magia §14.3): «INI dopo l’evocatore» (qui 0; sulla plancia agisce dopo chi lo evoca). Scompare a 0 PV, a fine durata o al congedo. Spazio 2 × 2 Q.',
  },
  {
    id: 'elementale-terra-maggiore', nome: 'Elementale della Terra Maggiore',
    caratteristiche: { FOR: 10, DES: 7, COS: 10, INT: 5, SAG: 5, CAR: 5 },
    pv: 40, ar: { totale: 5, magica: 5 }, difese: 13, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 17, riflessi: 12, volonta: 10, magia: 12 },
    attacchi: [r('Pugno di Pietra', 16, '2d6+6', 'Magico', 1, ['Terra'])],
    abilita: [{ nome: 'Corpo a corpo', va: 16 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    immunita: ['a-terra', 'ammalato', 'avvelenato', 'sanguinamento', 'stordito'],
    capacita: [
      { nome: 'Pugno di Pietra', effetto: 'Corpo a corpo 16 con le Difese ordinarie; dopo danno residuo e Contromisura applica Sanguinamento 1 (perdita di PV a inizio turno della vittima; cumulo e conseguenze comuni). Non aggiunge Sbalzante o caduta automatici.' },
      { nome: 'Terremoto', effetto: '1 AzP, una volta per Round, appoggiato a terra: entro 3 Q tutte le altre creature appoggiate sulla stessa superficie continua e livello (alleati compresi); non colpisce chi vola senza appoggio. Nessun tiro per colpire, 1 AC, un solo 1d10 Terra Magico. Elusione su Riflessi con −4 dimezza prima dell’AR; dopo residuo e Contromisura, una distinta PS Riflessi con −4 evita A Terra (che qui sostituisce Sanguinamento).' },
      { nome: 'Protezioni e forza', effetto: 'Immune a Terra (effetti secondari compresi). Dimezza Fuoco, Fulmine e danno Naturale (un solo dimezzamento per componente). AR 5 tutta magica. Sposta rocce e carichi secondo FOR 10; le Prove di FOR valgono 15. Niente scavo, attraversamento della roccia o percezione delle vibrazioni.' },
      { nome: 'Prova di Forza', effetto: 'Prova di Forza: 15. È una Prova di Caratteristica, non Atletica né un’altra Abilità (Giocatore §1.2.2): con FOR 10 il modificatore è +5 e il valore è già 10 + 5 = 15, quindi il modificatore non va aggiunto una seconda volta. Si mostra separata dalle Abilità.', passiva: true },
      NON_BIOLOGICO,
    ],
    note: 'PM —: nessuna riserva. «Prove di FOR 15» è la Prova di Forza, non un’Abilità (A.169, 18/10): vedi la capacità «Prova di Forza». Profilo evocato (Magia §14.4): «INI dopo l’evocatore» (qui 0; sulla plancia agisce dopo chi lo evoca). Scompare a 0 PV, a fine durata o al congedo. Spazio 2 × 2 Q.',
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
    immunita: c.immunita,
    note: c.note,
  };
}

const base = new URL('../esempi/nemici/mostri/', import.meta.url);
let scritti = 0;
for (const c of CREATURE) {
  await writeFile(new URL(`${c.id}.json`, base), `${JSON.stringify(profilo(c), null, 2)}\n`);
  scritti += 1;
}
console.log(`${scritti} profili del blocco «Costrutti e creature elementali» scritti in esempi/nemici/mostri/`);
