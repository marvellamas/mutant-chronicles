// Blocco «Creature del sottosuolo» del catalogo (cap. 8) del Manuale dei Mostri v0.18: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti;
// niente valori inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - attacchi senza danno ai PV o con portata non rappresentabile (Oscuramento del Mantoscuro, Caduta
//    perforante del Perforatore — portata verticale da 2 a 6 Q —, Filamento e Trascinare del Roper, Antenne
//    del Rugginofago, Sguardo perturbante dell'Umber Hulk, Suzione della Stirge) → capacità, con il VA scritto
//    nel testo.
//  - Furtività con valori condizionati (Perforatore, Roper, Umber Hulk, Troglodita, Grimlock): nel campo il
//    valore senza condizione; quello condizionato nelle note.
//  - Vermeiena 1 × 2 Q: ingombro non quadrato → `spazio` vuoto e nota con A.167 (come il Corazzato della Covata).
//  - scavo, aderenza e arrampicata non sono nel movimento del formato (passo/corsa/scatto/volo): capacità.
//
// Uso: node tools/genera_mostri_sottosuolo.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.18 (16/10/2026), cap. 8 «Catalogo delle creature» — Creature del sottosuolo';
const scuro = (q = 12) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa ostacoli né oscurità soprannaturale. Un bersaglio nascosto richiede il normale confronto di Percezione e Furtività.` });
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });

const CREATURE = [
  {
    id: 'mantoscuro', nome: 'Mantoscuro',
    caratteristiche: { FOR: 6, DES: 7, COS: 5, INT: 2, SAG: 6, CAR: 3 },
    pv: 22, pm: 8, ar: { totale: 1, magica: 0 }, difese: 12, iniziativa: 1,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 6 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 12, volonta: 8, magia: 9 },
    attacchi: [r('Avvolgimento', 11, '1d6+1', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Aspetto roccioso', effetto: 'Immobile su un soffitto adatto ottiene +3 a Furtività (VA 15). Ecolocalizzazione 12 Q; se non funziona non ha una vista alternativa utile al combattimento. Ali e mantello sono le Braccia, le appendici di appiglio le Gambe.' },
      { nome: 'Avvolgimento al capo', effetto: 'Dopo almeno 1 danno finale a una creatura di spazio ≤ 1 × 1 Q con capo accessibile, Riflessi senza modificatore: fallimento → si fissa al capo (nessuna AzP, non applica Immobilizzato). La vittima è Accecata finché il capo è coperto e, se respira da vie ostruite, inizia il soffocamento del §5.23. Con 1 AzP stringe: Corpo a corpo 11 contrapposto, 1d6+1 Naturale con AR ordinaria. Liberazione: 1 AzP della vittima o di un alleato adiacente, Corpo a corpo o Atletica contro Corpo a corpo 11 (il pareggio conserva la presa). Una sola vittima; agganciato non Schiva né attacca altri.' },
      { nome: 'Oscuramento', effetto: '1 AzP e 2 PM: sfera buia di raggio 3 Q centrata su di sé e mobile con lui, per 5 Round, senza Concentrazione. Blocca la vista (anche scurovisione); torce e fari non la dissipano; Luce Mistica illumina la sola porzione della propria aura. Nessun danno. Negare Potere: potenza 3. Se spende l’AzP per Oscuramento non attacca in quell’Iniziativa.', risorsa: '2 PM', azioni: { principali: 1 } },
    ],
    note: 'Volo 6/12/18 Q; a terra 2/4/6 Q. Comportamento: sceglie una preda isolata; si ritira sotto 6 PV o a Ferita Profonda.',
  },
  {
    id: 'perforatore', nome: 'Perforatore',
    caratteristiche: { FOR: 5, DES: 5, COS: 7, INT: 1, SAG: 4, CAR: 2 },
    pv: 18, pm: 4, ar: { totale: 3, magica: 0 }, difese: 8, iniziativa: -3,
    movimento: { passo: 1, corsa: 2, scatto: 3 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 12, riflessi: 8, volonta: 7, magia: 8 },
    attacchi: [],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      { nome: 'Caduta perforante', effetto: '1 AzP: si lascia cadere da 2–6 Q verticali sulla preda sotto di sé, con traiettoria libera, VA 10. Danno 1d6 Naturale ogni 2 Q di dislivello, massimo 3d6 (nessun bonus di FOR); Parata e Schivata normali, AR ordinaria. Prima del tiro indica un Q libero adiacente alla vittima su cui scivolerà; senza spazio d’arrivo non usa la manovra. Con attacco riuscito non subisce danni dalla caduta; se il tiro per colpire fallisce subisce metà per eccesso dei normali danni da caduta, ignorando la propria AR. Il movimento verticale non costa AzM. Cadute involontarie o oltre 6 Q seguono il §5.22 senza questa protezione.', azioni: { principali: 1 } },
      { nome: 'Sensi e appigli', effetto: 'Scurovisione 12 Q; l’udito integra Percezione senza vista cieca. Aderisce a pareti e soffitti. Il mimetismo richiede un supporto roccioso e immobilità. Braccia e Gambe sono le porzioni anteriore e posteriore del corpo aderente.' },
    ],
    note: 'Stadio giovanile del Roper (nessuna trasformazione in combattimento). Furtività 14 immobile sulla roccia. Terra e aderenza 1/2/3 Q. A terra non ha un attacco offensivo efficace né Attacco di Opportunità; non ripete la caduta senza tornare in posizione. Comportamento: sotto 5 PV o a Ferita Profonda cerca una fessura. Nessun attacco in elenco: la Caduta perforante è fra le capacità, perché la sua portata è verticale (da 2 a 6 Q) e non rappresentabile come portata in Q.',
  },
  {
    id: 'roper', nome: 'Roper',
    caratteristiche: { FOR: 9, DES: 4, COS: 8, INT: 4, SAG: 8, CAR: 3 },
    pv: 55, pm: 8, ar: { totale: 4, magica: 0 }, difese: 9, iniziativa: -1,
    movimento: { passo: 2, corsa: 4, scatto: 6 }, spazio: '2 × 2 Q',
    azioni: { principali: 3, movimento: 1 }, salvezze: { tempra: 14, riflessi: 8, volonta: 11, magia: 11 },
    attacchi: [r('Morso', 14, '2d6+2', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 14 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza', effetto: 'Al massimo due nuovi agganci e un Morso per Round, 1 AzP ciascuno; Trascinare, rigenerare un filamento o difendersi usano le stesse tre AzP. L’Attacco di Opportunità usa solo il Morso, entro 1 Q.' },
      { nome: 'Filamento (aggancio)', effetto: '1 AzP, portata 10 Q, VA 14: con un filamento libero e un bersaglio percepito di spazio ≤ 2 × 2 Q con percorso libero, contrappone Corpo a corpo 14 a Corpo a corpo o Atletica della vittima (sostituisce tiro per colpire e Difesa; il pareggio non afferra). Il successo applica Immobilizzato (movimento 0, −4 alle azioni fisiche, mani libere). Sei filamenti: fino a sei vittime, uno per vittima; mantenere non costa Azioni, ma per muoversi deve rilasciare. Pareti e barriere solide impediscono l’aggancio.', azioni: { principali: 1 } },
      { nome: 'Trascinare', effetto: '1 AzP su una vittima già afferrata: Corpo a corpo 14 contrapposto. Con successo la sposta fino a 4 Q verso di sé, fermandola prima del proprio spazio (movimento forzato, niente Attacchi di Opportunità); fallimento o pareggio la lasciano ferma e conservano la presa. Prima di un pericolo immediato la vittima fa Riflessi senza modificatore.', azioni: { principali: 1 } },
      { nome: 'Liberazione e recisione', effetto: 'La vittima (o un alleato adiacente) spende 1 AzP: Corpo a corpo o Atletica contro Corpo a corpo 14. Un filamento esteso è un bersaglio distinto: AR 2, 8 PV propri, nessuna Difesa attiva; a 0 PV si recide e libera la vittima (niente Ferite o Morente, danni non trasferiti al corpo). Una volta per Round, 1 AzP sostituisce un filamento reciso con uno integro da 8 PV.' },
      scuro(12),
    ],
    note: 'Furtività 15 immobile sulla roccia (aderenza a pareti e soffitti, 2/4/6 Q). Comportamento: attende il gruppo, poi una preda alla volta per il Morso; sotto 14 PV o a Ferita Seria rilascia i prigionieri.',
  },
  {
    id: 'rugginofago', nome: 'Rugginofago',
    caratteristiche: { FOR: 6, DES: 6, COS: 6, INT: 2, SAG: 6, CAR: 3 },
    pv: 24, pm: 5, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 11, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Morso', 10, '1d6+1', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Antenne (ruggine)', effetto: '1 AzP, VA 11 contro un oggetto compatibile (solo ferro e acciaio non magici) esposto e individuato, portata 1 Q; nessun Colpo Mirato. Se portato o indossato, il possessore usa le proprie Difese. Un successo non difeso impone all’oggetto una PS Integrità (dalla Qualità): fallimento → −1 PI; con Magistrale −1 PI aggiuntivo (una sola PS). Schivata riuscita evita il contatto; Parata Magistrale lo devia; con Parata normale il contatto riguarda solo l’arma o lo scudo usato. Anticorrosivo X ≥ 1 protegge. Contro un oggetto immobile e accessibile non serve il tiro, ma 1 AzP e la PS. Non è un Attacco di Opportunità. Non danneggia i PV del portatore.', azioni: { principali: 1 } },
      { nome: 'Odore del ferro', effetto: 'Individua ferro e acciaio esposti entro 6 Q con Percezione 14; contenitori ermetici e barriere adeguate lo impediscono. Scurovisione 12 Q.' },
      { nome: 'Carapace reattivo', effetto: 'Un’arma o proiettile di ferro o acciaio non magici che lo colpisce direttamente fa dopo il colpo una PS Integrità: fallimento −1 PI (anche se l’AR ha assorbito tutto, non se una Difesa ha evitato il contatto). Una sola applicazione per arma e attacco; un’arma naturale non arrugginisce.' },
    ],
    note: 'Percezione 14 per l’odore del ferro. La ruggine non corrode carne, legno, pietra, altri metalli o oggetti mistici. Comportamento: preferisce le Antenne al Morso; smette di inseguire chi abbandona una fonte di ferro; sotto 6 PV o a Ferita Profonda fugge.',
  },
  {
    id: 'umber-hulk', nome: 'Umber Hulk',
    caratteristiche: { FOR: 10, DES: 6, COS: 8, INT: 5, SAG: 5, CAR: 5 },
    pv: 58, pm: 12, ar: { totale: 4, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 3, movimento: 1 }, salvezze: { tempra: 14, riflessi: 10, volonta: 10, magia: 12 },
    attacchi: [r('Artiglio', 14, '1d8+3', 1), r('Mandibole', 14, '1d10+3', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 15 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza', effetto: 'Al massimo due Artigli e un attacco di Mandibole per Round, 1 AzP ciascuno; Sguardo o Difese usano le stesse tre AzP. Attacco di Opportunità con Artiglio, uno per Round.' },
      { nome: 'Sguardo perturbante', effetto: '1 AzP e 3 PM, una volta per Round, contro una creatura dotata di mente entro 6 Q che si veda reciprocamente, con linea d’effetto libera. Nessun tiro per colpire; Volontà con −2 evita (senza Azioni, niente Parata o Schivata). Fallimento: Disorientato, −2 VA a tutte le Prove di Abilità per 1+1d3 Round; non tocca Caratteristiche, Salvezze, danni, movimento o Azioni e il giocatore sceglie cosa fare. Nuove applicazioni tengono la scadenza più lontana; Barriera Mentale dà il suo bonus alla PS. Cura Spirituale (liv. 1) lo rimuove; Negare Potere: potenza 6. Coprirsi gli occhi rende Accecati.', risorsa: '3 PM', azioni: { principali: 1 }, usi: { quanti: 1, per: 'Round' } },
      { nome: 'Scavo', effetto: 'Attraversa terra a 4 Q e roccia ordinaria compatta a 2 Q per AzM, solo al Passo; non perfora metallo, strutture rinforzate o barriere magiche. Lascia un cunicolo di circa 1 Q × 2 Q. Nessun crollo ad area come attacco.' },
      { nome: 'Sensi', effetto: 'Scurovisione 24 Q e percezione delle vibrazioni 12 Q sul medesimo terreno continuo: localizza creature in movimento, non chi vola o è isolato dal terreno; non soddisfa i requisiti dello Sguardo.' },
    ],
    note: 'Furtività 9 sotto terra, 7 all’aperto. Comportamento: emerge vicino alla preda senza farsi accerchiare; parla e può trattare; sotto 15 PV o a Ferita Seria si ritira in un tunnel.',
  },
  {
    id: 'orrore-uncinato', nome: 'Orrore uncinato',
    caratteristiche: { FOR: 9, DES: 5, COS: 7, INT: 3, SAG: 6, CAR: 4 },
    pv: 38, pm: 6, ar: { totale: 3, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 9, volonta: 9, magia: 9 },
    attacchi: [r('Uncino', 13, '1d8+2', 2)],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 8 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Due uncini', effetto: 'Ogni attacco costa 1 AzP; ne compie due se non conserva Azioni per difendersi. La portata (2 Q) si misura dal bordo del corpo. Non applica Immobilizzato, trascinamento o Disarmare. Un Attacco di Opportunità ordinario, senza secondo colpo gratuito.' },
      { nome: 'Sensi', effetto: 'Ecolocalizzazione 12 Q e scurovisione 2 Q. Se Assordato perde ecolocalizzazione e bonus d’ascolto (Percezione 14 con l’udito), conservando la vista utilizzabile. Il linguaggio di colpi e raschi non è telepatia.' },
      { nome: 'Arrampicata', effetto: 'Gli uncini danno la velocità indicata (6/12/18 Q) su roccia con appigli, non aderenza a soffitti lisci; servono arti utilizzabili e un percorso che lo regga.' },
    ],
    note: 'Percezione 14 con l’udito. Comportamento: difende il gruppo e le uova, richiama i compagni, cerca un accesso laterale o rialzato; sotto 10 PV o a Ferita Profonda si ritira arrampicandosi.',
  },
  {
    id: 'grimlock', nome: 'Grimlock',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 5, SAG: 4, CAR: 3 },
    pv: 16, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 10, volonta: 8, magia: 8 },
    attacchi: [r('Mazza ferrata', 11, '1d6+2', 1)],
    abilita: [{ nome: 'Armi da mischia', va: 11 }, { nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      { nome: 'Percezione senza occhi', effetto: 'Entro 6 Q localizza con udito e olfatto abbastanza da combattere senza penalità di buio o mancanza di vista. Assordato: solo olfatto entro 2 Q; senza olfatto non localizza. Ostacoli e bersagli nascosti richiedono le normali Prove; oltre la portata non ha vista alternativa. Non legge, non distingue i colori né soddisfa requisiti di visione reciproca: immune agli accecamenti sugli occhi e agli sguardi che richiedono di essere visti, non a ogni effetto mentale.' },
    ],
    note: 'Furtività 13 fra le rocce. Mazza ferrata Comune FOR 4, PI 5, una mano, già pronta; nessuna armatura o scudo; può parare con la mazza. Linguaggio delle profondità, può negoziare. Comportamento: sotto 4 PV o a Ferita Profonda cerca una via nota.',
  },
  {
    id: 'troglodita', nome: 'Troglodita',
    caratteristiche: { FOR: 6, DES: 5, COS: 7, INT: 3, SAG: 5, CAR: 3 },
    pv: 20, pm: 5, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 9, volonta: 8, magia: 8 },
    attacchi: [r('Artiglio', 10, '1d4+1', 1), r('Morso', 10, '1d4+1', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza', effetto: 'Fino a due attacchi naturali per Round (1 AzP ciascuno), al massimo uno è Morso. Può conservare Azioni per Schivare. Attacco di Opportunità con Artiglio o Morso.' },
      { nome: 'Fetore', effetto: 'Passivo, senza AzP o PM. Una creatura biologica che respira aria entro 1 Q da un Troglodita cosciente fa Tempra senza modificatore alla prima esposizione e a inizio di ogni propria Iniziativa ancora esposta (una sola Prova per Round per tutti i Trogloditi). Successo: evita e immunità al fetore di tutti i Trogloditi per un’ora. Fallimento: Avvelenato fino all’inizio della propria Iniziativa successiva, −2 VA alle Prove fisiche (Difese comprese), senza danno periodico. Veleno naturale di Pericolosità I; Cura Avvelenamenti (liv. 1) o un antidoto lo termina senza dare l’immunità. Pareti, separazione ermetica o un sistema respiratorio autonomo lo evitano; più Trogloditi non moltiplicano il −2.' },
      { nome: 'Sole', effetto: 'Scurovisione 12 Q. In luce solare diretta −2 VA agli attacchi e alla Percezione visiva (non a Salvezze o Difese); luce artificiale e Luce Mistica non contano.' },
    ],
    note: 'Furtività 13 mimetizzato (immobile, fondale naturale adatto; muoversi la riporta a 10). AR 1 biologica; nessuna dotazione. Comportamento: difende cibo, rifugio o compagni, può trattare; sotto 5 PV o a Ferita Profonda cerca riparo.',
  },
  {
    id: 'stirge', nome: 'Stirge',
    caratteristiche: { FOR: 2, DES: 8, COS: 5, INT: 1, SAG: 4, CAR: 2 },
    pv: 6, pm: 4, ar: { totale: 0, magica: 0 }, difese: 12, iniziativa: 2,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 8 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 12, volonta: 7, magia: 8 },
    attacchi: [r('Puntura', 10, '1d4', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 7 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      { nome: 'Aggancio', effetto: 'Se la Puntura causa almeno 1 danno finale a una creatura con sangue nutriente e pelle raggiungibile, si aggancia (non su costrutti, corpi senza sangue o attraverso un involucro ermetico integro). Non applica Immobilizzato né occupa le mani. Agganciata segue la vittima senza AzM, non attacca altri, non Schiva ed è un bersaglio distinto attaccabile. Staccarla: 1 AzP della vittima o di un alleato adiacente con una mano libera, automatico, senza danno. Al massimo tre fissate a una creatura 1 × 1 Q, sei a una 2 × 2 Q o più.' },
      { nome: 'Suzione', effetto: 'Dalla propria Iniziativa successiva all’aggancio, 1 AzP: sottrae 2 PV ordinari alla stessa vittima, ignorando AR e PV temporanei (nessun tiro, Parata o Schivata). Se la vittima è già a 0 PV si applicano Tempra e Ferite da danno 1–5. Sazietà: raggiunti 6 PV sottratti, o dopo tre Suzioni, si stacca gratuitamente e si allontana. Non applica Sanguinamento, né veleni o malattie.', azioni: { principali: 1 } },
      scuro(12),
    ],
    note: 'Corpo molto piccolo (nessun malus a chi la attacca). Volo 8/16/24 Q; a terra 2/4/6 Q. Più esemplari non usano la scheda Sciame. Comportamento: cerca una preda accessibile; sotto 2 PV o a Ferita Profonda cerca riparo.',
  },
  {
    id: 'vermeiena', nome: 'Vermeiena',
    caratteristiche: { FOR: 7, DES: 6, COS: 8, INT: 1, SAG: 6, CAR: 3 },
    pv: 34, pm: 6, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 },
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Tentacoli', 13, '1d4+1', 2, { note: 'Veleno: vedi la capacità «Veleno».' }), r('Morso', 12, '1d8+1', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Tentacoli e un Morso per Round, 1 AzP ciascuno. Il Morso non ignora le Difese di una vittima intossicata. L’Attacco di Opportunità usa solo il Morso.' },
      { nome: 'Veleno', effetto: 'Dopo almeno 1 danno finale dei Tentacoli a un organismo vivente, Tempra senza modificatore: fallimento → Avvelenato e Immobilizzato (movimento 0, −4 alle azioni fisiche, mani libere) per 1+1d3 Round, senza danni periodici. La vittima ripete Tempra a fine di ogni propria Iniziativa (senza Azioni): il successo termina. Nuove esposizioni tengono la scadenza più lontana, senza cumulo. Veleno naturale di Pericolosità II; Cura Avvelenamenti (liv. 2) o un antidoto lo eliminano. Un’AR che azzera il danno impedisce l’inoculazione. Non è una presa: per trascinare deve prima Immobilizzare con la manovra ordinaria.' },
      { nome: 'Sensi e aderenza', effetto: 'Scurovisione 12 Q; olfatto 14 (sangue e cadaveri lo attirano). Aderisce a pareti e soffitti solidi (6/12/18 Q); non è immune a cadute o al cedimento del supporto. Braccia sono i tentacoli del capo.' },
    ],
    note: 'Spazio sulla mappa 1 × 2 Q (dal manuale): pedine quadrate nell’app, ingombro non rappresentabile (A.167). Percezione 14 con l’olfatto. Comportamento: preferisce un cadavere a una preda che può ferirlo; sotto 9 PV o a Ferita Profonda si ritira.',
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
console.log(`${scritti} profili del blocco «Creature del sottosuolo» scritti in esempi/nemici/mostri/`);
