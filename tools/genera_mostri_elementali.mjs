// Blocco «Mephit e creature elementali» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci profili
// prestabiliti in esempi/nemici/mostri/ (sei Mephit, Serpente di fuoco, Salamandra, Galeb Duhr, Xorn), nel formato
// di data/formato_nemici.json (A.73). Valori trascritti; niente valori inventati. GS/PX informativo (A.161).
// Spazio ai soli valori quadrati (A.126).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - danno misto (Artigli gelidi: Taglio + Gelo, ecc.): la prima componente è `danno` con la sua proprietà e la
//    seconda sta nella nota dell'attacco («Aggiunge …», una Difesa, una AC), come per Azer e Yeti.
//  - Soffi, poteri innati e Metallo caldo/Sonno/Nebbia/Luci/Sfocatura: capacità con `azioni`, `risorsa` (PM) e,
//    per «un uso ogni 24 ore», `usi` per giorno; la cadenza R + 3 dei Soffi è nel testo (non c'è un tiro).
//  - dissoluzione dei Mephit: una capacità per creatura (una sola volta, alla distruzione effettiva).
//  - Stato di immunità solo per ciò che è uno Stato dell'app (Avvelenato, Sanguinamento, Incendiato); Sonno,
//    soffocamento, Paralizzato, Affaticamento, pietrificazione e il Gelo restano nelle capacità.
//  - Stringere della Salamandra (contrapposta, presa) e Animare massi del Galeb Duhr: capacità; Schianto in Impeto
//    (formula propria) e Lancia/Coda della Salamandra: attacchi. Il masso animato è una scheda derivata nel testo.
//
// Uso: node tools/genera_mostri_elementali.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Mephit e creature elementali';
const r = (nome, va, danno, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', portata_q, ac: 1, ...extra });
const scuro = { nome: 'Scurovisione', effetto: 'Vede entro 12 Q nel buio naturale, senza colori; non attraversa solidi, torbidità o fumo.' };
const CORPO = { nome: 'Corpo elementale', effetto: 'Natura Comune, con una mente e la riserva personale di PM indicata, ma non biologicamente vivente: non richiede aria, cibo, acqua o sonno (salvo il nutrimento minerale dello Xorn). Immune a soffocamento, Sonno, Sanguinamento, veleni e malattie biologici; non è immune a tutti gli effetti mentali o spirituali. Cure biologiche, Medicina, riposo biologico e normali riparazioni tecnologiche non lo ripristinano: serve un effetto espressamente compatibile. A 0 PV non scompare: Tempra, Ferite, Menomazioni e Morente seguono il §4.2 (le Ferite descrivono perdita di integrità o coesione; la distruzione avviene alla fine del contatore di Morente o con una fonte che distrugga espressamente il corpo). A 0 PM Svenuto al termine della risoluzione completa dell’azione. Nessuna Parata naturale; Schivata: 1 AzP, 1 AzM e spazio. Una sola Opportunità ordinaria gratuita per Round (un attacco ravvicinato normale), che non attiva Soffi, Stringere, Impeto, poteri o animazioni. Danni misti: una sola Difesa per le due componenti; per ciascuna si calcolano moltiplicatori, riduzione della Difesa, resistenze e AR pertinente, e i residui si sommano per una sola applicazione a PV e Ferite. Il residuo di Fuoco o Gelo, superata la Contromisura, può imporre la PS ordinaria contro Incendiato o Rallentato. Vulnerabilità ×2: vale per la componente indicata di qualunque Natura, prima di Difesa e AR (con Magistrale ×3 complessivo), e non si estende alle altre componenti del colpo.' };
const POTERI = 'Capacità innata (nessun incantesimo appreso): paga Azioni e PM dichiarati, senza Focus, componenti o Potere; non è un lancio interrompibile con Contromagia. Negare Potere rimuove soltanto gli effetti per i quali è indicata una potenza di confronto (Magia §23.6); non cancella il corpo autonomo. Un uso ogni 24 ore si conta dall’attivazione.';
const soffio = (nome, pm, effetto) => ({ nome, azioni: { principali: 1 }, risorsa: `${pm} PM`, limiti: 'Cadenza comune: pronto a inizio scontro; dopo un uso nel Round R di nuovo dalla propria Iniziativa del Round R + 3, pagando di nuovo i PM (nessun tiro di Ricarica).', effetto: `${effetto} Serve una bocca libera e un mezzo compatibile; senza tiro per colpire, Parata o Schivata (solo la PS o l’Elusione indicata); non è un’Opportunità. I coni sono lunghi 3 Q dalla bocca lungo percorsi liberi, colpiscono anche gli alleati (non la fonte) e i solidi li bloccano; le Coperture pertinenti modificano la Salvezza. ${POTERI}` });
const innata = (nome, pm, effetto, azioni = { principali: 1 }) => ({ nome, azioni, risorsa: `${pm} PM`, usi: { quanti: 1, per: 'giorno' }, effetto: `${effetto} ${POTERI}` });
const diss = (esito) => ({ nome: 'Dissoluzione', passiva: true, effetto: `Alla distruzione effettiva del corpo (non a 0 PV, a 0 PM o all’ingresso in Morente; un congedo o il termine di un’evocazione non equivalgono a distruzione), una sola volta: raggio 1 Q dal bordo del corpo, tutte le altre creature possono essere coinvolte, i solidi fermano la propagazione. Non costa Azioni, non è attivabile a volontà e non è un attacco con Magistrale. ${esito}` });
const VOLO_MEPHIT = { nome: 'Volo', effetto: 'Ali funzionali, nessun volo stazionario: Torace comprende il cingolo alare, Testa capo e bocca, Braccia e Gambe gli arti corrispondenti. In volo Corsa e Scatto richiedono Atletica −2 e −4; percorsi misti secondo §5.2 e budget unico, senza rinnovare l’AzM. Svenuto o perdita delle ali possono causare Caduta.' };
const DUR = 'Uno Stato di durata N applicato nel Round R termina a fine Round R + N, salvo recupero anticipato.';
const IMM_MEPHIT = ['avvelenato', 'sanguinamento'];
const mephit = (id, nome, fonte, b) => ({
  id, nome, spazio: '1 Q', azioni: { principali: 1, movimento: 1 }, immunita: IMM_MEPHIT, ...b,
  capacita: [CORPO, VOLO_MEPHIT, ...b.capacita],
  note: `${b.note} Non appartiene alla Covata; la variante di evocazione di altri Mephit non è compresa e la specie non è un’opzione di Evoca Elementale. Un Artiglio per Round, Opportunità compresa. Fonte: ${fonte}.`,
});

const CREATURE = [
  mephit('mephit-della-polvere', 'Mephit della polvere', 'Dust Mephit, p. 215', {
    caratteristiche: { FOR: 3, DES: 7, COS: 5, INT: 5, SAG: 5, CAR: 5 },
    pv: 18, pm: 9, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 6 },
    salvezze: { tempra: 9, riflessi: 11, volonta: 9, magia: 9 },
    attacchi: [r('Artigli', 9, '1d4+1', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      scuro,
      soffio('Soffio accecante', 2, 'Cono 3 Q: ogni creatura coinvolta effettua Riflessi senza modificatore; successo evita, fallimento Accecato per 5 Round. Nessun danno né confronto con AR. A fine di ogni propria Iniziativa la vittima ripete gratis Riflessi senza modificatore: successo termina lo Stato. I sensi alternativi mantengono i propri limiti.'),
      innata('Sonno innato', 3, 'Un vivente visibile capace di dormire entro 6 Q effettua Volontà senza modificatore (+4 se già in combattimento o in pericolo concreto e immediato). Fallimento: sonno per 5 Round con gli effetti e le condizioni di Indurre Sonno 3 (Magia §18.6): i danni non svegliano; due turni consecutivi di scuotimento con 1 AzP ciascuno, Cura Spirituale 6 o Negare Potere 3 risvegliano. Barriera Mentale dà il proprio bonus, senza immunità.'),
      diss(`Polvere: Tempra senza modificatore contro Accecato per 5 Round, con nuova Tempra gratuita a fine propria Iniziativa. ${DUR}`),
    ],
    note: 'Vulnerabile al Fuoco ×2. Parla Auran e Terran. Non impone Sorpresa soltanto perché il bersaglio è stato accecato. Condotta: sotto 4 PV o a Ferita Profonda cerca copertura e fuga.',
  }),
  mephit('mephit-del-ghiaccio', 'Mephit del ghiaccio', 'Ice Mephit, p. 215', {
    caratteristiche: { FOR: 3, DES: 6, COS: 5, INT: 5, SAG: 5, CAR: 6 },
    pv: 22, pm: 10, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 6 },
    salvezze: { tempra: 9, riflessi: 10, volonta: 10, magia: 9 },
    attacchi: [r('Artigli gelidi', 9, '1d4+1', 1, { proprieta: ['Taglio'], note: 'Aggiunge 1d4 Gelo Naturale (una Difesa, una AC): le componenti restano distinte per AR e Stati.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      scuro,
      soffio('Soffio gelido', 3, 'Cono 3 Q: 2d4 Gelo Naturale; Elusione Riflessi senza modificatore dimezza per eccesso. Dopo il residuo di Gelo si risolve la Tempra ordinaria contro Rallentato, se dovuta. Non concede una presa o un congelamento permanente.'),
      innata('Nebbia innata', 3, 'Crea una nube immobile di raggio 2 Q centrata in un punto visibile entro 6 Q, per 5 Round senza Concentrazione. Nubi di fumo e nebbia sono opache: nessuna linea visiva attraverso la nube (senza assegnare Accecato persistente a chi ne esce; Scurovisione non l’attraversa); ostacola anche il Mephit; un vento forte continuo per un Round la disperde. Una nuova nube termina la precedente. Congedo gratuito alla propria Iniziativa; la morte non la cancella. Negare Potere ammesso, potenza 3.'),
      { nome: 'Furtività tra il ghiaccio', effetto: 'Immobile con appoggio tra ghiaccio plausibile ottiene +4 a Furtività per apparire una scheggia, fino a un movimento osservato.' },
      diss(`Ghiaccio: 1d8 Taglio Naturale; Elusione Riflessi senza modificatore dimezza.`),
    ],
    note: 'Immune al Gelo (danni e conseguenze); vulnerabile a Fuoco e Contusione ×2, ciascuno per la propria componente. Parla Aquan e Auran. Condotta: sotto 5 PV o a Ferita Profonda cerca riparo.',
  }),
  mephit('mephit-del-magma', 'Mephit del magma', 'Magma Mephit, p. 216', {
    caratteristiche: { FOR: 4, DES: 6, COS: 6, INT: 4, SAG: 5, CAR: 5 },
    pv: 22, pm: 10, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 6 },
    salvezze: { tempra: 10, riflessi: 10, volonta: 9, magia: 9 },
    immunita: [...IMM_MEPHIT, 'incendiato'],
    attacchi: [r('Artigli ardenti', 9, '1d4+1', 1, { proprieta: ['Taglio'], note: 'Aggiunge 1d4 Fuoco Naturale (una Difesa, una AC): le componenti restano distinte per AR e Stati. Il corpo non infligge un secondo danno per la semplice vicinanza.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      scuro,
      soffio('Soffio di fuoco', 3, 'Cono 3 Q: 2d6 Fuoco Naturale; Elusione Riflessi senza modificatore dimezza. Il residuo oltre Ignifugo può imporre Riflessi ordinario contro Incendiato.'),
      innata('Metallo caldo', 3, 'Un singolo oggetto metallico non magico indossato o impugnato, visibile entro 6 Q e con linea d’effetto libera (non impianti nascosti nel corpo, un intero veicolo o tutti gli oggetti di un personaggio). Nessun tiro per colpire o Potere. Il calore dura a Concentrazione per un massimo di 5 Round (la Concentrazione segue integralmente la Magia, senza Concentrazione Operativa) mantenendo l’oggetto entro 6 Q e la linea d’effetto. Il portatore a contatto subisce subito 1d4 Fuoco Magico interno, e la stessa applicazione ricorre all’Iniziativa del Mephit, al massimo una volta per Round; ignora l’AR non magica generica (AR magica e protezioni specifiche dal Fuoco restano pertinenti); riscaldamento senza fiamma, non applica Incendiato. Nessun Magistrale, Parata, Schivata o Elusione. Prima di ciascuna applicazione chi lo impugna può lasciarlo cadere gratuitamente ed evitare quel danno, se l’oggetto non è vincolato e il contatto cessa (togliere una protezione indossata richiede tempi e Azioni ordinari); riafferrarlo caldo lo espone alla stessa fonte, una applicazione per creatura e per Round. Non applica Corrosivo, non sottrae PI, non detona munizioni né distrugge il metallo; non resta proprietà commerciabile. Può interromperlo gratuitamente alla propria Iniziativa; Negare Potere ammesso, potenza 6; finito l’effetto non guarisce PV o Ferite.'),
      { nome: 'Furtività nel magma', effetto: 'Immobile con appoggio in un accumulo di magma plausibile ottiene +4 a Furtività per celare la propria natura, fino a un movimento osservato.' },
      diss(`Magma: 2d6 Fuoco Naturale; Elusione Riflessi senza modificatore dimezza.`),
    ],
    note: 'Immune al Fuoco e Incendiato; vulnerabile al Gelo ×2. Parla Ignan e Terran. Distinto dal calore passivo di Azer, Serpente di fuoco e Salamandra. Condotta: sotto 5 PV o a Ferita Profonda cerca calore e fuga.',
  }),
  mephit('mephit-del-fango', 'Mephit del fango', 'Mud Mephit, p. 216', {
    caratteristiche: { FOR: 4, DES: 6, COS: 6, INT: 5, SAG: 5, CAR: 4 },
    pv: 26, pm: 8, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12, volo: 4 },
    salvezze: { tempra: 10, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Pugni', 9, '1d6+1', 1, { proprieta: ['Contusione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      scuro,
      { nome: 'Nuoto', effetto: 'Nuoto nativo 4 / 8 / 12 Q effettivi (percorsi misti secondo §5.2 e budget unico, senza rinnovare l’AzM).' },
      soffio('Soffio di fango', 2, 'Una sola creatura non maggiore di 1 × 1 Q entro 1 Q (non è un cono e non ignora un ostacolo solido): Riflessi senza modificatore evita; fallimento Immobilizzato per 5 Round, senza danni e senza bloccare specificamente le mani. Liberazione: a fine di ogni propria Iniziativa la vittima ripete gratis Riflessi senza modificatore (successo termina Immobilizzato); oppure 1 AzP per Atletica senza modificatore con il −4 fisico dello Stato (successo rompe il vincolo); un alleato adiacente può tentare Atletica con 1 AzP. Il fango è materia: Negare Potere non lo scioglie.'),
      { nome: 'Furtività nel fango', effetto: 'Immobile con appoggio in fango plausibile ottiene +4 a Furtività per sembrare una massa inerte, fino a un movimento osservato.' },
      diss('Fango: Riflessi senza modificatore per le creature non maggiori di 1 × 1 Q; fallimento Immobilizzato per 1 Round, con le stesse liberazioni del Soffio di fango.'),
    ],
    note: 'Parla Aquan e Terran. Non è immune a Gelo o Fuoco. Un Pugno per Round, Opportunità compresa (il profilo ha Pugni, non Artigli). Condotta: sotto 6 PV o a Ferita Profonda cerca una via umida di fuga.',
  }),
  mephit('mephit-del-fumo', 'Mephit del fumo', 'Smoke Mephit, p. 217', {
    caratteristiche: { FOR: 3, DES: 7, COS: 6, INT: 5, SAG: 5, CAR: 5 },
    pv: 18, pm: 8, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 6 },
    salvezze: { tempra: 10, riflessi: 11, volonta: 9, magia: 9 },
    immunita: [...IMM_MEPHIT, 'incendiato'],
    attacchi: [r('Artigli', 9, '1d4+1', 1, { proprieta: ['Taglio'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      scuro,
      soffio('Soffio di cenere', 2, 'Cono 3 Q: Riflessi senza modificatore evita; fallimento Accecato per 1 Round, senza danni. Tempi e sensi come per ogni Accecato. Non infligge Fuoco soltanto perché contiene cenere calda.'),
      innata('Luci danzanti innate', 2, 'Fino a quattro punti luminosi in spazi visibili entro 6 Q. Ogni punto illumina 1 Q più 1 Q di penombra per 10 Round, senza Concentrazione. Con 1 AzP sposta i punti lungo percorsi liberi, mantenendoli entro 6 Q da sé; non attraversano solidi. Non sono corpi, fiamme o immagini di creature e non infliggono danno. Congedo gratuito; Negare Potere ammesso, potenza 3 per l’insieme.'),
      diss('Fumo: lascia una nube fisica di raggio 1 Q per 10 Round (opaca: nessuna linea visiva attraverso la nube; Scurovisione non l’attraversa; un vento forte continuo per un Round la disperde), non rimovibile con Negare Potere.'),
    ],
    note: 'Immune a Fuoco e Incendiato. Parla Auran e Ignan. Il corpo rimane materiale e colpibile: non diventa incorporeo e non passa attraverso muri. Condotta: sotto 4 PV o a Ferita Profonda cerca copertura.',
  }),
  mephit('mephit-del-vapore', 'Mephit del vapore', 'Steam Mephit, p. 217', {
    caratteristiche: { FOR: 3, DES: 5, COS: 5, INT: 6, SAG: 5, CAR: 6 },
    pv: 20, pm: 9, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18, volo: 6 },
    salvezze: { tempra: 9, riflessi: 9, volonta: 10, magia: 9 },
    immunita: [...IMM_MEPHIT, 'incendiato'],
    attacchi: [r('Artigli caldi', 8, '1d4', 1, { proprieta: ['Taglio'], note: 'Aggiunge 1d4 Fuoco Naturale (una Difesa, una AC): le componenti restano distinte per AR e Stati.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      scuro,
      soffio('Soffio di vapore', 2, 'Cono 3 Q: 1d8 Fuoco Naturale; Elusione Riflessi senza modificatore dimezza. L’eventuale residuo di Fuoco segue Ignifugo e Incendiato ordinari. L’acqua calda non è un veleno né un effetto Corrosivo.'),
      innata('Sfocatura innata', 3, 'Per 5 Round senza Concentrazione gli attacchi diretti contro di lui subiscono −2 VA quando dipendono dalla vista. Non modifica attacchi ad Area, PS, danni automatici o attacchi basati interamente su un senso alternativo valido; non dà AR o una Difesa gratuita. Negare Potere ammesso, potenza 6; la perdita di coscienza la termina.'),
      diss('Vapore: Riflessi senza modificatore; il successo evita interamente il danno, il fallimento infligge 1d8 Fuoco Naturale (eccezione alla normale Elusione per dimezzare).'),
    ],
    note: 'Immune a Fuoco e Incendiato. Parla Aquan e Ignan. Può rendere incerta la propria sagoma senza diventare invisibile; le scie ordinarie non infliggono danno passivo. Condotta: sotto 5 PV o a Ferita Profonda cerca riparo.',
  }),
  {
    id: 'serpente-di-fuoco', nome: 'Serpente di fuoco',
    caratteristiche: { FOR: 6, DES: 7, COS: 6, INT: 4, SAG: 5, CAR: 4 },
    pv: 24, pm: 6, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 10, riflessi: 11, volonta: 8, magia: 9 },
    immunita: ['incendiato'],
    attacchi: [
      r('Morso', 10, '1d4+1', 1, { proprieta: ['Perforazione'], note: 'Aggiunge 1d4 Fuoco Naturale (una Difesa, una AC): le componenti restano distinte per AR e Stati.' }),
      r('Coda', 10, '1d4+1', 1, { proprieta: ['Contusione'], note: 'Aggiunge 1d4 Fuoco Naturale (una Difesa, una AC): le componenti restano distinte per AR e Stati. La Coda non afferra.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      CORPO, scuro,
      { nome: 'Sequenza', effetto: 'Al massimo un Morso e una Coda per Round, ciascuno con 1 AzP; le Opportunità rientrano nei limiti. Il Morso non inocula veleno. Il calore corporeo non si aggiunge ai suoi attacchi: le componenti di Fuoco sono già complete.' },
      { nome: 'Protezioni', effetto: 'Immune a Fuoco e Incendiato, vulnerabile al Gelo ×2. Dimezza il danno Naturale da Contusione, Taglio e Perforazione prima dell’AR; non il danno Magico, Etereo o elementale.' },
      { nome: 'Calore diretto', passiva: true, effetto: 'Infligge 1d4 Fuoco Naturale a chi lo tocca o afferra direttamente, oppure lo colpisce con il proprio corpo entro 1 Q. Massimo una applicazione per creatura e per Round, al primo contatto o all’Iniziativa della fonte se il contatto prosegue. Nessuna Difesa attiva; AR e protezioni pertinenti restano. Il residuo oltre Ignifugo può applicare Incendiato con Riflessi ordinario. Nessun danno per semplice vicinanza; un’arma o uno scudo non trasmettono il calore al portatore; non è un’aura adiacente.' },
    ],
    note: 'Forma giovane da cui può maturare una Salamandra, ma non si trasforma durante lo scontro e non ha dissoluzione esplosiva. Comprende Ignan senza parlarlo. Testa = fauci, Torace = tronco, Braccia e Gambe = porzioni anteriori e posteriori locomotorie (Coda = funzione posteriore). Condotta: sotto 6 PV o a Ferita Profonda cerca una via calda di fuga. Fonte: Fire Snake, p. 265.',
  },
  {
    id: 'salamandra', nome: 'Salamandra',
    caratteristiche: { FOR: 8, DES: 7, COS: 7, INT: 6, SAG: 5, CAR: 6 },
    pv: 52, pm: 10, ar: { totale: 3, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 11, volonta: 10, magia: 11 },
    immunita: ['incendiato'],
    attacchi: [
      r('Lancia due mani', 13, '1d6+5', 2, { proprieta: ['Perforazione'], note: 'Aggiunge 1d4 Fuoco Naturale (una Difesa, una AC): le componenti restano distinte per AR e Stati. Con una mano il fisico diventa 1d6+3 complessivo. Non è compreso un profilo a lancio.' }),
      r('Coda', 13, '1d8+2', 2, { proprieta: ['Contusione'], note: 'Aggiunge 1d6 Fuoco Naturale (una Difesa, una AC). Con almeno 1 danno finale contro una creatura non maggiore di 1 × 1 Q: vedi «Afferrare e Stringere».' }),
    ],
    abilita: [{ nome: 'Armi da guerra', va: 13 }, { nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 10 }, { nome: 'Tecnologia', va: 12 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      CORPO, scuro,
      { nome: 'Sequenza', effetto: 'Al massimo una Lancia e una Coda oppure Stringere per Round, ciascuno con 1 AzP; le Opportunità usano Lancia o Coda normali nei rispettivi limiti. Non colpisce automaticamente chi è trattenuto e non assegna altre Azioni per la lunghezza del corpo.' },
      { nome: 'Dotazione', effetto: 'Lancia Comune commerciale, FOR 5, PI 6, PS Integrità 10, Armi da guerra, due mani, portata 2 Q e Versatile. Il danno comprende 1d6+3 base a due mani e +2 personale. Inizia pronta; nessuna armatura o scudo. Può parare con la Lancia pronta pagando 1 AzP (a distanza applica il −8 dell’arma): una Parata normale dimezza per eccesso prima dell’AR, una Magistrale annulla. I 55 PX includono questa dotazione.' },
      { nome: 'Afferrare e Stringere', effetto: 'Afferrare: Coda con almeno 1 danno finale contro una creatura non maggiore di 1 × 1 Q impone Riflessi −2; fallimento Immobilizzato, con le mani utilizzabili salvo impedimenti indipendenti. Una sola vittima; la Coda impegnata non attacca altri; il vincolo permane fino a liberazione o rilascio, senza danno per la sola permanenza; la Salamandra resta ferma mentre mantiene la presa e non trascina la vittima. Stringere: 1 AzP, occupa il limite della Coda; Corpo a corpo 13 contrapposto a Corpo a corpo o Atletica della vittima (con il −4 fisico di Immobilizzato): successo infligge 1d8+2 Contusione e 1d6 Fuoco Naturali; pareggio o fallimento nessun danno; AR e resistenze alle componenti, senza una seconda Parata o Schivata; non è un’Opportunità. Liberarsi: la vittima usa 1 AzP e la stessa contrapposta (successo libera, pareggio o fallimento conserva); un alleato adiacente può tentare con 1 AzP e strumenti adatti. Rilascio volontario gratuito alla propria Iniziativa; Svenuto, distruzione o perdita della funzione della coda interrompono la presa.', azioni: { principali: 1 } },
      { nome: 'Protezioni e calore', effetto: 'Immune a Fuoco e Incendiato; vulnerabile al Gelo ×2. Dimezza il Naturale da Contusione, Taglio e Perforazione prima dell’AR. Calore diretto: 1d6 Fuoco Naturale a chi la tocca o afferra direttamente, o la colpisce col proprio corpo entro 1 Q, massimo una applicazione per creatura e per Round (la vittima trattenuta riceve il Fuoco tramite Coda o Stringere pagati, senza un’altra applicazione passiva); nessuna Difesa attiva, AR e protezioni pertinenti restano; il residuo oltre Ignifugo può applicare Incendiato con Riflessi ordinario; un’arma o uno scudo non trasmettono il calore. Arma calda: 1d4 Fuoco Naturale a una Lancia metallica impugnata (già incluso nei profili); se la lascia o la perde il danno aggiuntivo termina; nessun Corrosivo o perdita di PI. Corpo, armi e calore innati non sono cancellati da Negare Potere.' },
    ],
    note: 'Essere serpentiforme con arti superiori: può essere un artigiano o difendere una fucina. Parla Ignan. Testa, Torace e Braccia sono le parti omonime; Gambe = la coda locomotrice e prensile. Tecnologia 12 vale solo per metallurgia con mezzi appropriati. Condotta: sotto 13 PV o a Ferita Seria può cercare riparo o negoziare. Fonte: Salamander, pp. 265–266.',
  },
  {
    id: 'galeb-duhr', nome: 'Galeb Duhr',
    caratteristiche: { FOR: 10, DES: 6, COS: 9, INT: 6, SAG: 6, CAR: 6 },
    pv: 58, pm: 12, ar: { totale: 4, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 3, corsa: 6, scatto: 9 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 10, volonta: 11, magia: 12 },
    immunita: ['avvelenato'],
    attacchi: [
      r('Schianto', 13, '2d6+3', 1, { proprieta: ['Contusione'] }),
      r('Schianto in Impeto', 13, '3d6+3', 1, { proprieta: ['Contusione'], note: 'Dopo almeno 4 Q rettilinei rotolati verso la vittima; sostituisce lo Schianto normale: vedi «Rotolamento». Un solo 1d6 aggiuntivo già compreso, senza ×2 della Carica.' }),
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      CORPO, scuro,
      { nome: 'Rotolamento', effetto: 'Con l’AzM percorre fino a 6 Q al Passo, oppure 12 Q lungo una discesa continua realmente praticabile; conta tutto il percorso e non usa Corsa o Scatto mentre rotola. Dopo almeno 4 Q rettilinei verso la vittima può usare Schianto in Impeto: almeno 1 danno finale impone Tempra −2 a una vittima non maggiore di 2 × 2 Q; fallimento → A Terra. Un solo Schianto per Round, normale o in Impeto; l’Opportunità usa solo quello normale.' },
      { nome: 'Corpo e sensi', effetto: 'Dimezza il Naturale da Contusione, Taglio e Perforazione prima dell’AR; immune ad Affaticamento, Avvelenato, Paralizzato e pietrificazione. Vibrazioni entro 12 Q sul terreno continuo condiviso, non contro chi vola o è isolato dal supporto. Immobile con appoggio tra rocce plausibili ottiene +4 a Furtività per sembrare un masso, fino a un movimento osservato.' },
      { nome: 'Animare massi', azioni: { principali: 2 }, risorsa: '6 PM', usi: { quanti: 1, per: 'giorno' }, limiti: 'Concentrazione per un massimo di 10 Round; le sue normali Azioni restano consentite durante il mantenimento (conserva PS di Volontà e interruzioni della Concentrazione; nessun Talento Concentrazione Operativa).', effetto: 'Anima fino a due massi non magici e non lavorati, ciascuno con ingombro compatibile con 1 × 1 Q, visibili entro 12 Q lungo una linea d’effetto libera (non parte di un muro portante o di un corpo). Ogni masso usa la scheda completa del Galeb Duhr con queste sostituzioni: PM —, INT 1, CAR 1, Volontà 6, Percezione 8, Furtività 5, 1 AzP e 1 AzM per Round, GS Esperto e 30 PX per quattro PG; conserva PV 58, COS 9, AR 4, altri VA, Schianto, Impeto, movimento, resistenze e immunità; non ha Animare massi, linguaggi o mente autonoma ed è immune a paura, fascinazione e controllo che richieda una mente. I massi agiscono subito dopo il Galeb Duhr; un ordine semplice comune alla propria Iniziativa è gratuito entro 12 Q (oltre, il compito precedente continua); un solo Schianto per masso e per Round, Opportunità compresa; sono pedine separate con risorse proprie. A 0 PV seguono Tempra, Ferite e Morente (senza PM; Dardo Spirituale applica la quota ai PV, Dardo Psichico non trova una mente). Perdita di Concentrazione, scadenza, congedo gratuito o incoscienza del Galeb Duhr li fanno tornare inerti (le pietre non scompaiono: la riattivazione conserva PV, Ferite e Menomazioni; un masso distrutto non torna integro). Negare Potere termina un masso alla volta, potenza di confronto 9. Ogni masso coinvolto vale 30 PX unitari per quattro PG, distinti dai 50 del Galeb Duhr.' },
    ],
    note: 'Elementale di pietra simile a un masso con arti tozzi, può custodire un luogo per lunghi periodi e comunicare con chi vi entra. Parla Terran e può trattare informazioni sul luogo. Testa = parte sensoriale, Torace = nucleo, Braccia = arti superiori, Gambe = locomotori. Condotta: sotto 14 PV o a Ferita Seria tende a proteggere l’accesso o cercare riparo; non perde automaticamente la Concentrazione a 0 PV. Fonte: Galeb Duhr, p. 139.',
  },
  {
    id: 'xorn', nome: 'Xorn',
    caratteristiche: { FOR: 8, DES: 5, COS: 10, INT: 6, SAG: 5, CAR: 6 },
    pv: 50, pm: 10, ar: { totale: 4, magica: 0 }, difese: 10, iniziativa: -1,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 9, volonta: 10, magia: 11 },
    attacchi: [r('Artigli', 13, '1d6+2', 1, { proprieta: ['Taglio'] }), r('Morso', 13, '2d6+2', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 12 }, { nome: 'Percezione', va: 14 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      CORPO, scuro,
      { nome: 'Sequenza', effetto: 'Al massimo un attacco di Artigli e un Morso per Round, ciascuno con 1 AzP; le Opportunità rientrano nei rispettivi limiti. Le tre braccia non concedono tre attacchi simultanei né Parata naturale. Il Morso non inghiotte una persona né distrugge automaticamente monete o equipaggiamento indossato.' },
      { nome: 'Corpo e sensi', effetto: 'Dimezza il danno Naturale da Taglio e Perforazione prima dell’AR, non la Contusione né le componenti Magiche, Eteree ed elementali. Vibrazioni entro 12 Q sul terreno continuo condiviso, senza individuare chi vola o è isolato. Tra rocce dove possa realmente celarsi ottiene +2 a Furtività (non diventa invisibile).' },
      { nome: 'Passaggio minerale', azioni: { movimento: 1 }, effetto: 'Con l’AzM al Passo attraversa fino a 4 Q di terra o pietra naturali, non magiche e non lavorate, in qualsiasi direzione realmente percorribile dal corpo; conta anche il dislivello. Il tratto nel solido non consente Corsa o Scatto e nei percorsi misti non rinnova il Movimento. Non sposta il materiale, non lascia un cunicolo e non porta una vittima o un passeggero. Murature lavorate, metallo, materiali artificiali, pietra magica e barriere che impediscono il passaggio della materia lo bloccano; non apre brecce. Può restare nel materiale compatibile senza soffocare, ma non vede attraverso la pietra. Artigli e Morso richiedono bocca o arti esposti e un percorso libero verso la vittima: non attacca da un rifugio solido senza esporsi. Entrare nel terreno è Movimento ordinario (non teletrasporto né Ritirata): un’uscita dalla portata nemica può provocare Opportunità prima che il percorso sia protetto dal solido.' },
      { nome: 'Senso dei tesori', passiva: true, effetto: 'Entro 12 Q localizza metalli preziosi e gemme, anche attraverso terra e roccia naturali comunicanti. È un senso minerale innato, non normale vista né Individuare Magia: non identifica valore esatto, proprietà magiche, proprietario o intenzioni e non localizza creature prive di tali materiali. Metallo schermante continuo, pietra lavorata o barriera magica interrompono la rilevazione attraverso quell’ostacolo. Percepire una gemma dentro una borsa non la trasferisce nella sua bocca né rivela gli altri contenuti; mangiare, sottrarre o danneggiare un oggetto richiede un’azione e una situazione praticabile (un’arma o protezione mantiene le normali regole di Integrità).' },
    ],
    note: 'Essere pesante con tre braccia, tre occhi e una grande bocca superiore: cerca metalli preziosi e gemme per nutrirsi e può offrire informazioni in cambio di una parte del tesoro (contratta anziché iniziare un combattimento). Parla Terran. Testa = bocca e occhi, Torace = nucleo, Braccia = gruppo di arti superiori, Gambe = appendici locomotorie. Condotta: sotto 12 PV o a Ferita Seria tende alla trattativa o alla ritirata nel terreno; non consuma automaticamente gli oggetti per la semplice vicinanza. Fonte: Xorn, p. 304.',
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
console.log(`${scritti} profili del blocco «Mephit e creature elementali» scritti in esempi/nemici/mostri/`);
