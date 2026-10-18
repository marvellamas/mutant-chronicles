// Blocco «Creature delle acque e popoli sommersi» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci
// profili prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori
// trascritti; niente valori inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - nuoto (non è nel movimento del formato) → capacità «Nuoto» con le terne del manuale; i pesci senza moto a
//    terra («Terra 0 Q») hanno passo 0 e Corsa/Scatto non consentiti.
//  - «Diplomazia» (Marinide) → Oratoria (il Giocatore dice «Oratoria per diplomazia e seduzione»; A.169).
//  - lance a una e a due mani, scagliate: tre voci distinte; la lancia scagliata è un attacco a distanza con
//    gittata 4 Q (in acqua 2 Q, nella nota dell'attacco). La Rete del Kuo-toa (cattura, senza danno), Stringere,
//    Inchiostro, Tentacoli velenosi → capacità.
//  - Kuo-toa: AR «1 biologica + 2 scudo = 3» → `ar.totale` 3 (con lo Scudo pronto); senza scudo 1, nella nota.
//  - Chuul: immune ai veleni e ad Avvelenato → `immunita: ['avvelenato']`.
//
// Uso: node tools/genera_mostri_acque.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Creature delle acque e popoli sommersi';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const d = (nome, va, danno, gittata_q, extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura: 'Naturale', gittata_q, modalita: ['S'], ac: 1, ...extra });
const scuro = (q = 12) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa ostacoli né oscurità soprannaturale.` });
const nuoto = (terna, extra = '') => ({ nome: 'Nuoto', effetto: `Nuoto ${terna} Q effettivi (eccezione espressa al costo ordinario 2 dell’acqua: nel solo Nuoto si percorrono le distanze indicate). Nei percorsi misti si segue il budget unico del §5.2.4, con costo 1 sulla terra e 2 in acqua, senza superare la distanza indicata per ogni modalità. Immobilizzato impedisce il Nuoto. ${extra}`.trim() });
const ACQUA = { nome: 'Vita acquatica', effetto: 'Natura Comune, biologicamente vivente, con mente e PM personali (a 0 PM Svenuto); a 0 PV valgono Tempra, Ferite, Menomazioni e Morente (non scatta morte, incoscienza o rilascio di una presa). Nessuna Parata naturale. Il fiato ordinario dura COS Round, poi §5.23. A Terra non si applica a chi nuota senza appoggio. Respirare acqua non dà resistenza a correnti, pressione o temperature estreme. I sensi alternativi valgono solo nel mezzo e nella distanza indicati, senza attraversare solidi né rivelare chi è nascosto.' };
const SQUALO = 'Respira soltanto acqua; fuori dall’acqua COS Round di fiato e §5.23. Percezione alternativa entro {q} Q nell’acqua comunicante, senza attraversare scafi o pareti né individuare automaticamente chi è nascosto o ogni perdita di sangue. Il Morso non afferra, trascina o inghiotte, non applica Sanguinamento e il limite è un Morso per Round, Opportunità compresa. Per danneggiare una barca serve una parte di scafo raggiungibile, con AR, PS Integrità e PI della struttura. Testa = fauci, Torace = corpo, Braccia = pinne anteriori, Gambe = posteriori e coda (una coda lesa compromette la propulsione); le pinne non impugnano armi né parano.';

const CREATURE = [
  {
    id: 'granchio-gigante', nome: 'Granchio gigante',
    caratteristiche: { FOR: 5, DES: 6, COS: 5, INT: 1, SAG: 4, CAR: 2 },
    pv: 18, pm: 4, ar: { totale: 3, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 6, magia: 7 },
    attacchi: [r('Chela', 9, '1d6+1', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      ACQUA, nuoto('6 / 12 / 18', 'Respira aria e acqua.'),
      { nome: 'Afferrare', effetto: 'Una Chela con almeno 1 danno finale contro una creatura ≤ 1 × 1 Q impone Riflessi senza modificatore: fallimento → Immobilizzato (mani non bloccate). Può trattenere due vittime, una per chela; la chela occupata non attacca altri. Limite: un solo attacco di Chela o Stringere per Round, Opportunità comprese.' },
      { nome: 'Stringere', effetto: '1 AzP, VA 9, sulla vittima già presa: Corpo a corpo 9 contrapposto a Corpo a corpo o Atletica (−4 di Immobilizzato); successo 1d6+1 Naturale da Contusione, pareggio o fallimento nessun danno. La stessa contrapposta, iniziata dalla vittima o da un soccorritore con 1 AzP, libera. Rilascio gratuito; incoscienza, morte o perdita della chela interrompono la presa. Fermo mentre trattiene: non trascina sott’acqua.', azioni: { principali: 1 } },
      { nome: 'Sensi', effetto: 'Percezione tattile di vibrazioni entro 6 Q nel mezzo fisico comunicante, senza attraversare pareti né distinguere colori e scritte.' },
    ],
    note: 'Testa = occhi e apparato boccale, Torace = carapace, Braccia = chele, Gambe = zampe. Non comprende linguaggi. Condotta: cibo o difesa di un rifugio; sotto 4 PV o a Ferita Profonda si ritira. Fonte: Giant Crab, p. 324.',
  },
  {
    id: 'polpo-gigante', nome: 'Polpo gigante', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 6, COS: 6, INT: 2, SAG: 5, CAR: 3 },
    pv: 38, pm: 5, ar: { totale: 1, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 2, corsa: 4, scatto: 6 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 11, riflessi: 10, volonta: 7, magia: 8 },
    attacchi: [r('Tentacoli', 12, '2d6+2', 3, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      ACQUA, nuoto('12 / 24 / 36'),
      { nome: 'Respiro', effetto: 'Respira soltanto acqua; fuori può trattenere il fiato per 1 ora, poi §5.23; un Round di respirazione in acqua ripristina la riserva. Scurovisione 12 Q, senza visione attraverso inchiostro o torbidità. Testa = occhi e bocca, Torace = mantello, Braccia e Gambe = gruppi anteriore e posteriore di tentacoli.' },
      { nome: 'Avvolgere e presa', effetto: 'Tentacoli con almeno 1 danno finale contro una creatura ≤ 2 × 2 Q impongono Riflessi senza modificatore: fallimento → Immobilizzato (mani non bloccate). Una sola vittima, e finché la conserva non attacca altri con i Tentacoli. Stringere: 1 AzP, VA 12, Corpo a corpo 12 contrapposto a Corpo a corpo o Atletica: successo 2d6+2 Naturale da Contusione, pareggio conserva la presa senza danno. Liberarsi o aiutare: 1 AzP con la stessa opposizione. Rilascio gratuito; incoscienza, morte o Menomazione prensile interrompono. Fermo mentre trattiene: non trascina in profondità. Le otto appendici non danno otto attacchi, PV o premi.', azioni: { principali: 1 } },
      { nome: 'Nube di inchiostro', effetto: '1 AzP, solo immerso, una volta ogni 24 ore (non si riempie cambiando incontro o con i PV; nessun PM; sostituisce l’attacco del Round): nube non magica di raggio 4 Q centrata sul proprio corpo, fissa (segue le correnti dichiarate), per 5 Round. Chi cerca di vedere attraverso è Accecato per quelle attività finché la linea visiva attraversa la nube (nessun Riflessi); la Scurovisione ordinaria non basta, sensi diversi dalla vista sì. Coinvolge anche il Polpo e i suoi alleati; nessun danno, nessuna Ritirata gratuita. Una corrente forte la disperde; Negare Potere non la dissolve.', azioni: { principali: 1 }, usi: { quanti: 1, per: 'giorno' } },
    ],
    note: 'Furtività 13 immerso, con copertura. Non comprende linguaggi. Condotta: sotto 9 PV o a Ferita Profonda rilascia la preda e fugge (l’Inchiostro usa la sua AzP). Fonte: Giant Octopus, p. 326.',
  },
  {
    id: 'squalo-delle-scogliere', nome: 'Squalo delle scogliere',
    caratteristiche: { FOR: 6, DES: 6, COS: 6, INT: 1, SAG: 5, CAR: 3 },
    pv: 24, pm: 4, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 10, volonta: 7, magia: 8 },
    attacchi: [r('Morso', 10, '1d8+1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      ACQUA, nuoto('8 / 16 / 24', 'Nessun moto a terra.'),
      { nome: 'Tattiche di branco', effetto: '+2 VA al Morso (VA 12) contro una vittima quando almeno un alleato cosciente e in grado di agire è entro 1 Q da lei e può minacciarla. Più alleati non aumentano il bonus; uno squalo nemico, Svenuto o oltre una barriera non basta. Non ha la Frenesia del sangue delle specie maggiori.' },
      { nome: 'Sensi, corpo e condotta', effetto: SQUALO.replace('{q}', '6') + ' Percezione 11.' },
    ],
    note: 'Un Sahuagin non è automaticamente suo alleato senza un rapporto o un comando stabiliti nella scena. Condotta: un branco cerca le prede più accessibili; sotto 6 PV o a Ferita Profonda si stacca. Non comprende linguaggi. Fonte: Reef Shark, p. 336.',
  },
  {
    id: 'squalo-cacciatore', nome: 'Squalo cacciatore', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 6, COS: 7, INT: 1, SAG: 5, CAR: 3 },
    pv: 40, pm: 5, ar: { totale: 2, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 7, magia: 8 },
    attacchi: [r('Morso', 12, '2d6+2', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      ACQUA, nuoto('8 / 16 / 24', 'Nessun moto a terra.'),
      { nome: 'Frenesia del sangue', effetto: '+2 VA al Morso (VA 14) contro una creatura biologicamente vivente con meno PV del proprio massimo o con Sanguinamento attivo. Non si moltiplica per danni, Ferite o alleati, non aumenta il danno; una Lesione senza deficit di PV né sangue attivo non basta. Non è un obbligo di attaccare, né un’immunità a Terrorizzato, né un bonus alle Difese; non localizza chi sanguina oltre i sensi disponibili.' },
      { nome: 'Sensi, corpo e condotta', effetto: SQUALO.replace('{q}', '6') + ' Percezione 12.' },
    ],
    note: 'Di norma caccia da solo. Non comprende linguaggi. Condotta: può interrompere la caccia per una preda più semplice, una barriera o un avversario troppo rischioso; sotto 10 PV o a Ferita Profonda si ritira verso acqua libera. La distanza in pianta non consente di attraversare una rete o uno scafo. Fonte: Hunter Shark, p. 330.',
  },
  {
    id: 'squalo-gigante', nome: 'Squalo gigante', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 5, COS: 9, INT: 1, SAG: 5, CAR: 4 },
    pv: 64, pm: 6, ar: { totale: 3, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' }, spazio: '3 × 3 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 14, riflessi: 9, volonta: 8, magia: 9 },
    attacchi: [r('Morso', 14, '2d8+3', 2, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 6 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      ACQUA, nuoto('10 / 20 / 30', 'Nessun moto a terra.'),
      { nome: 'Frenesia del sangue', effetto: 'Stessa condizione dello Squalo cacciatore: +2 VA al Morso (VA 16) contro un organismo vivente sotto i PV massimi o con Sanguinamento attivo. Non riceve anche Tattiche di branco. Nessun attacco gratuito quando ferisce o porta una vittima a 0 PV.' },
      { nome: 'Sensi, corpo e condotta', effetto: SQUALO.replace('{q}', '12') + ' Percezione 12. Il comportamento audace non è immunità alle influenze mentali. Non capovolge né inghiotte.' },
    ],
    note: 'Lungo circa nove metri. Condotta: sotto 16 PV o a Ferita Seria può allontanarsi; una profondità insufficiente o un accesso troppo stretto possono impedire l’inseguimento. Non comprende linguaggi. Fonte: Giant Shark, p. 328.',
  },
  {
    id: 'marinide', nome: 'Marinide',
    caratteristiche: { FOR: 5, DES: 6, COS: 5, INT: 5, SAG: 5, CAR: 6 },
    pv: 16, pm: 6, ar: { totale: 0, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 2, corsa: 4, scatto: 6 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 10, magia: 9 },
    attacchi: [
      r('Lancia a una mano', 9, '1d6+1', 2, { proprieta: ['Perforazione'] }),
      r('Lancia a due mani', 9, '1d6+3', 2, { proprieta: ['Perforazione'] }),
      d('Lancia scagliata', 8, '1d6+1', 4, { proprieta: ['Perforazione'], note: 'Massimo 4 Q in aria; 2 Q in acqua. Non torna in mano.' }),
    ],
    abilita: [{ nome: 'Armi da guerra', va: 9 }, { nome: 'Armi da lancio', va: 8 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 11 }, { nome: 'Oratoria', va: 10 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      ACQUA, nuoto('8 / 16 / 24', 'Respira aria e acqua. A terra 2/4/6 Q; fuori dall’acqua non è automaticamente A Terra.'),
      { nome: 'Difesa e mani', effetto: 'Può parare con la Lancia pronta (1 AzP, Difese 9; a distanza −8 VA). Una Parata spende l’unica AzP e non lascia AzP per attaccare; resta l’Opportunità ordinaria. Gettare la Lancia lo lascia senza arma finché non la recupera; estrazione e cambio d’impugnatura seguono il §5.1.1. Nessuna Parata con pinne o coda.' },
    ],
    note: 'Dotazione: una Lancia Comune, FOR 5, PI 6, PS Integrità 10 (compresa nei 11 PX); nessuna armatura o scudo. Danni con bonus personale 0; una o due mani secondo Versatile. Vista e udito ordinari. Comprende e parla due lingue della comunità. Oratoria 10 (nel manuale «Diplomazia 10»). Testa, Torace e Braccia umanoidi; Gambe = coda. Condotta: difensore ordinario, non rende ostile un popolo; sotto 4 PV o a Ferita Profonda cerca riparo o soccorso. Fonte: Merfolk, p. 218.',
  },
  {
    id: 'merrow', nome: 'Merrow', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 5, COS: 7, INT: 4, SAG: 5, CAR: 4 },
    pv: 40, pm: 6, ar: { totale: 2, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 2, corsa: 4, scatto: 6 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 9, volonta: 8, magia: 9 },
    attacchi: [
      r('Morso', 12, '1d8+2', 1, { proprieta: ['Perforazione'] }),
      r('Artigli', 12, '1d8+2', 1, { proprieta: ['Taglio'], note: 'Richiede una mano disponibile.' }),
      r('Arpione in mischia', 12, '1d6+3', 2, { proprieta: ['Perforazione'] }),
      d('Arpione scagliato', 11, '1d6+3', 4, { proprieta: ['Perforazione'], note: 'Massimo 4 Q in aria; 2 Q in acqua. Sagola lunga 4 Q.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Armi da guerra', va: 12 }, { nome: 'Armi da lancio', va: 11 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 11 }],
    gs_px: { gs: 'Esperto', px: 33, per_pg: 4 },
    capacita: [
      ACQUA, nuoto('8 / 16 / 24', 'Respira aria e acqua. A terra 2/4/6 Q. Scurovisione 12 Q.'),
      { nome: 'Sequenza', effetto: 'Al massimo un Morso e un attacco di Artigli oppure Arpione per Round, 1 AzP ciascuno; l’Opportunità usa un attacco ravvicinato entro tali limiti. Tirare la sagola richiede la propria AzP e non si somma gratis al colpo.' },
      { nome: 'Aggancio dell’arpione', effetto: 'Prima di un attacco con l’Arpione dichiara se cerca di agganciare (bersaglio ≤ 2 × 2 Q). Dopo almeno 1 danno finale, Riflessi senza modificatore: fallimento → agganciato (non Immobilizzato, nessun Sanguinamento). Un solo aggancio, una sola sagola (4 Q, percorso libero); l’arma resta al bersaglio finché non la recupera. Per allontanarsi oltre la lunghezza la vittima deve prima liberarsi o rompere il filo.' },
      { nome: 'Tirare', effetto: '1 AzP, al massimo una volta per Round, con una mano sulla sagola e appoggio o propulsione reali: Atletica 13 contrapposta a Corpo a corpo o Atletica della vittima; successo la avvicina fino a 2 Q lungo il filo, pareggio o fallimento no. Nessun danno aggiuntivo; non oltre FOR × 40 kg (360 kg) con l’equipaggiamento. Prima di un bordo o di immergere le vie respiratorie la vittima fa Riflessi senza modificatore: successo ferma il trascinamento all’ultimo spazio sicuro. Nessun passaggio attraverso scafi o varchi troppo stretti.', azioni: { principali: 1 }, usi: { quanti: 1, per: 'Round' } },
      { nome: 'Liberarsi dall’arpione', effetto: '1 AzP della vittima o di un alleato adiacente: Atletica senza modificatore con mani o strumenti adatti; successo libera. In alternativa si recide la sagola (AR 0, PI 2, PS Integrità 10, come oggetto). Il Merrow può lasciare il filo gratis alla propria Iniziativa; per superare la lunghezza la vittima può iniziare con 1 AzP la contrapposta del trascinamento: successo fa mollare il filo.' },
    ],
    note: 'Arpione Comune con sagola: FOR 5, una mano, portata 2 Q, PI 6, PS Integrità 10; per danni, Abilità e Parata usa il profilo della Lancia a una mano (+2 personale già incluso), senza Versatile; la sagola richiede l’altra mano. I 33 PX comprendono questa dotazione. Anatomia umanoide con la coda al posto delle Gambe. Comprende e parla due lingue della comunità. Le origini demoniache della fonte non sono assunte per Iris. Condotta: minaccia, tratta o si ritira; sotto 10 PV o a Ferita Profonda interrompe una caccia pericolosa. Fonte: Merrow, p. 219.',
  },
  {
    id: 'sahuagin', nome: 'Sahuagin',
    caratteristiche: { FOR: 6, DES: 5, COS: 6, INT: 6, SAG: 6, CAR: 4 },
    pv: 26, pm: 8, ar: { totale: 1, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 8, magia: 10 },
    attacchi: [
      r('Morso', 10, '1d4+1', 1, { proprieta: ['Perforazione'] }),
      r('Artigli', 10, '1d4+1', 1, { proprieta: ['Taglio'], note: 'Richiede una mano libera.' }),
      r('Lancia a una mano', 10, '1d6+2', 2, { proprieta: ['Perforazione'] }),
      r('Lancia a due mani', 10, '1d6+4', 2, { proprieta: ['Perforazione'] }),
      d('Lancia scagliata', 9, '1d6+2', 4, { proprieta: ['Perforazione'], note: 'Massimo 4 Q in aria; 2 Q in acqua. Lascia l’arma lontana finché non la recupera.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Armi da guerra', va: 10 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 13 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      ACQUA, nuoto('8 / 16 / 24', 'A terra 6/12/18 Q. Scurovisione 24 Q.'),
      { nome: 'Sequenza e frenesia', effetto: 'Al massimo un Morso e un attacco di Artigli oppure Lancia per Round, 1 AzP ciascuno; Opportunità entro tali limiti. Contro un organismo vivente sotto i PV massimi o con Sanguinamento attivo ha +2 VA agli attacchi ravvicinati (non al lancio né ai danni); come gli squali maggiori, senza localizzazione automatica. Può parare con la Lancia pronta (1 AzP; a distanza −8 VA).' },
      { nome: 'Respiro', effetto: 'Respira acqua e aria ma deve immergere completamente il corpo almeno una volta ogni 4 ore; trascorso il termine inizia il soffocamento dal punto successivo all’esaurimento del fiato nel §5.23, finché non è immerso. Un Round completamente immerso ripristina le 4 ore.' },
      { nome: 'Comando degli squali', effetto: 'Capacità mistica innata, senza Potere, Focus, Invocazione o Anticipazione: 1 AzP e 2 PM, uno squalo con mente visibile entro 24 Q: Volontà senza modificatore, fallimento → per 3 Round (Concentrazione) il Sahuagin impartisce istruzioni semplici di caccia e movimento, per via telepatica solo con quello squalo (nessuna lettura di pensieri o sensi condivisi). Non vale per umanoidi, Chuul o creature con una mente diversa da quella di uno squalo. Lo squalo conserva INI, AzP, AzM, PV e PM e non agisce subito; nessun suicidio evidente. Mantiene un solo comando alla volta. A fine di ogni propria Iniziativa lo squalo ripete gratis Volontà: successo termina; termina anche a scadenza, per perdita di Concentrazione, oltre 24 Q, congedo gratuito o Negare Potere (potenza 3). Chi supera la PS è immune a quel Sahuagin per 24 ore.', risorsa: '2 PM', azioni: { principali: 1 } },
    ],
    note: 'Dotazione: una Lancia Comune, FOR 5, PI 6, PS Integrità 10; nessuna armatura o scudo; le formule comprendono +1 personale. I 22 PX comprendono questa dotazione, senza squali o seguaci. Non è Barone, Sacerdotessa o Malenti. Parla la lingua della sua comunità. Condotta: sotto 6 PV o a Ferita Profonda cerca acqua, copertura o una trattativa. Fonte: Sahuagin, p. 263.',
  },
  {
    id: 'kuo-toa', nome: 'Kuo-toa',
    caratteristiche: { FOR: 5, DES: 5, COS: 5, INT: 5, SAG: 5, CAR: 4 },
    pv: 22, pm: 6, ar: { totale: 3, magica: 0 }, difese: 9, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 9, riflessi: 9, volonta: 8, magia: 9 },
    attacchi: [
      r('Morso', 9, '1d4+1', 1, { proprieta: ['Perforazione'] }),
      r('Lancia a una mano', 9, '1d6+1', 2, { proprieta: ['Perforazione'] }),
      r('Lancia a due mani', 9, '1d6+3', 2, { proprieta: ['Perforazione'] }),
      d('Lancia scagliata', 9, '1d6+1', 4, { proprieta: ['Perforazione'], note: 'Massimo 4 Q in aria; 2 Q in acqua.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Armi da guerra', va: 9 }, { nome: 'Armi da lancio', va: 9 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 12 }],
    gs_px: { gs: 'Inesperto', px: 22, per_pg: 4 },
    capacita: [
      ACQUA, nuoto('6 / 12 / 18', 'Respira aria e acqua; a terra 6/12/18 Q. Scurovisione 24 Q.'),
      { nome: 'Mani e attacchi', effetto: 'Al massimo due attacchi per Round, non più di un Morso, un attacco di Lancia e un lancio di Rete. Lancia a due mani e Rete richiedono entrambe le mani libere (non con lo Scudo impugnato). L’Opportunità è solo Morso o Lancia in mischia. Parata ravvicinata senza bonus; a distanza −4 VA con lo Scudo o −8 con la Lancia, 1 AzP.' },
      { nome: 'Rete', effetto: '1 AzP, VA 9, Armi da lancio, massimo 2 Q anche immersa, due mani; una sola Rete pronta; bersaglio ≤ 2 × 2 Q. Schivata consentita, la Parata non ferma la rete. Un successo non evitato applica Immobilizzato (nessun danno, mani non bloccate; l’AR non impedisce il legame; un Magistrale non aggiunge nulla). Aprire o rompere: 1 AzP, Atletica senza modificatore con mani o strumenti adatti (il −4 solo alla vittima); oppure si attacca la Rete come oggetto (AR 0, PI 2, PS Integrità 10). Il Kuo-toa non la controlla dopo il lancio.', azioni: { principali: 1 } },
      { nome: 'Scudo adesivo', effetto: 'Una volta per Round, dopo una propria Parata ravvicinata riuscita con lo Scudo contro un’arma materiale entro 1 Q, può spendere un’altra AzP per tentare di trattenerla: Atletica 10 contrapposta all’Atletica dell’attaccante; successo blocca l’arma contro lo Scudo. Non cattura proiettili, parti del corpo, lame incorporee o aree. L’arma bloccata non attacca; chi la tiene non si allontana oltre la portata ma non è Immobilizzato; staccarla: 1 AzP, Atletica senza modificatore (o lo stesso Kuo-toa, 1 AzP). A 0 PI lo Scudo perde AR e adesività; la secrezione va rinnovata prima di un nuovo incontro.', usi: { quanti: 1, per: 'Round' } },
      { nome: 'Pelle e percezione', effetto: '+2 VA alle sole Prove fisiche per liberarsi da una presa o legatura. Percezione 12 può avvertire creature invisibili o incorporee entro 6 Q senza attraversare solidi: se si muovono ne localizza il Q, se immobili solo presenza e direzione; non le rende visibili né colpibili. Non legge menti, non identifica poteri.' },
      { nome: 'Sole', effetto: 'In luce solare diretta −2 VA agli attacchi e alla Percezione visiva (non alle PS).' },
    ],
    note: 'AR 3 = 1 biologica + 2 dello Scudo Medio (senza Scudo 1). Dotazione Comune: Lancia e Scudo Medio (FOR 5, PI 6, PS Integrità 10 ciascuno) più una Rete (FOR 3, due mani, PI 2); le formule comprendono bonus personale 0; i 22 PX comprendono la dotazione. Parla una lingua della sua comunità. Condotta: sotto 5 PV o a Ferita Profonda può fuggire, cedere o cercare aiuto. Fonte: Kuo-toa, p. 199.',
  },
  {
    id: 'chuul', nome: 'Chuul', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 5, COS: 8, INT: 3, SAG: 6, CAR: 3 },
    pv: 56, pm: 8, ar: { totale: 4, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 9, volonta: 8, magia: 10 },
    attacchi: [r('Chela', 14, '1d8+2', 2, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    immunita: ['avvelenato'],
    capacita: [
      ACQUA, nuoto('6 / 12 / 18', 'Respira aria e acqua; a terra 6/12/18 Q.'), scuro(12),
      { nome: 'Sequenza e Afferrare', effetto: 'Fino a due attacchi di Chela o Stringere per Round, 1 AzP ciascuno; i Tentacoli velenosi costano 1 AzP e ne sostituiscono uno. L’Opportunità usa solo una Chela libera, entro il limite di due. Una Chela con almeno 1 danno finale contro una creatura ≤ 2 × 2 Q impone Riflessi senza modificatore: fallimento → Immobilizzato (mani non bloccate). Fino a due vittime, una per chela; la chela occupata non attacca altri. Non si sposta mentre trattiene qualcuno.' },
      { nome: 'Stringere', effetto: '1 AzP, VA 14, sulla vittima già presa: Corpo a corpo 14 contrapposto a Corpo a corpo o Atletica (−4 di Immobilizzato); successo 1d8+2 Naturale da Contusione, fallimento o pareggio nessun danno. Liberare: la vittima o un alleato adiacente inizia la stessa opposizione con 1 AzP. Rilascio gratuito; incoscienza, morte o perdita della chela interrompono la presa.', azioni: { principali: 1 } },
      { nome: 'Tentacoli velenosi (tossina paralizzante)', effetto: '1 AzP, su una vittima biologicamente vivente già trattenuta da una chela ed entro 1 Q dalla bocca (una protezione sigillata blocca l’inoculazione); nessun tiro per colpire né Difesa; consuma la dose anche se la vittima resiste. Tre dosi in ogni periodo di 24 ore. Tempra −2: successo evita del tutto; fallimento → Avvelenato e Paralizzato per 3 Round (in sostituzione del dimezzamento ordinario). A fine di ogni propria Iniziativa la vittima può ripetere gratis Tempra senza modificatore: successo termina entrambi. Paralizzato: cosciente, senza AzP, Movimento o Difese attive; conserva le PS (nessun −4); non cade Svenuta né perde PM; conta come incapace di reagire (per esempio Tiro a Bruciapelo). Nuove dosi non sommano Stati. Veleno naturale di Pericolosità IV, Seria: antidoto o Cura Avvelenamenti (liv. 5) lo terminano; Cura Spirituale no. Le dosi non sono veleni commerciabili.', risorsa: '1 dose', azioni: { principali: 1 }, usi: { quanti: 3, per: 'giorno' } },
      { nome: 'Percezione delle emanazioni', effetto: 'Senso biologico (nessun PM o Concentrazione): avverte emanazioni di incantesimi attivi e artefatti entro 24 Q, Rilevazione 6 per il confronto con gli occultamenti; solo presenza e direzione delle fonti non protette (non Q esatto, numero, nome, cariche, livello). Con 1 AzP esamina un solo Q visibile o noto entro 12 Q e ne localizza l’emanazione senza riconoscerla. Nascondere Aura, Alterare Aura e contenitori schermanti seguono le loro schede; una barriera solida lo impedisce. Negare Potere non elimina il senso.' },
    ],
    note: 'Immune ai danni da veleno e ad Avvelenato; non a malattie, Fuoco, Ghiaccio o influenze mentali. Testa = occhi, bocca e tentacoli velenosi; Torace = carapace; Braccia = chele; Gambe = zampe. Nessuna Parata con il guscio. Comprende una lingua scelta per la sua origine ma non parla; un eventuale legame con un Aboleth va stabilito nella scena. Condotta: sotto 14 PV o a Ferita Seria lascia le prede o si ritira. I 50 PX comprendono sensi, due chele e tossina. Fonte: Chuul, p. 40.',
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
console.log(`${scritti} profili del blocco «Creature delle acque e popoli sommersi» scritti in esempi/nemici/mostri/`);
