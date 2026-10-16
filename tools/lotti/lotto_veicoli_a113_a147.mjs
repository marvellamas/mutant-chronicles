// Veicoli: A.113 (permessi e denominazioni), A.145 (tabella delle azioni), A.146 (Attacchi di Opportunità) e
// A.147 (curve, rotazioni e posizionamento a 45°). Risposte di Davide approvate e registrate il 15/10/2026,
// in coda alla sezione 7 del Doc «per-davide.md».
//
// Scrive data/veicoli.json (blocchi `personaggio.permessi`, `azioni.tabella`, `opportunita`, `manovre_rotazione`)
// e data/mappa.json (passo della rotazione a 45°, nota della A.147). Toglie i TODO(Davide) A.113, A.145,
// A.146 e A.147.
//
// Principio di CLAUDE.md: nessuna automazione nuova. La tabella delle azioni è un promemoria da consultare,
// non un conteggio; gli Attacchi di Opportunità dei mezzi restano una riga da leggere, senza avvisi
// automatici; la rotazione non costa Q.
//
// Uso: node tools/lotti/lotto_veicoli_a113_a147.mjs [--controlla]
import { readFileSync, writeFileSync } from 'node:fs';

const CONTROLLA = process.argv.includes('--controlla');
const leggi = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const scrivi = (p, d) => writeFileSync(new URL(`../../${p}`, import.meta.url), `${JSON.stringify(d, null, 2)}\n`);

/** A.113: chi può cambiare che cosa nel registro dei veicoli, e che cosa succede senza server. */
const PERMESSI = {
  fonte: 'A.113, risposta approvata il 15/10/2026',
  direttore: 'tutti',
  _direttore: 'Il Direttore modifica tutti i veicoli della campagna, compresi quelli personali dei PG: danni, riparazioni, consumi, dotazioni e caratteristiche.',
  proprieta_resta_al_pg: true,
  giocatore: 'propri',
  _giocatore: 'Il giocatore continua a vedere e cambiare i veicoli che gli appartengono o che conduce; la proprietà del mezzo resta assegnata al personaggio anche quando lo modifica il Direttore.',
  senza_server: 'sola_lettura',
  _senza_server: 'Senza collegamento al server il veicolo condiviso resta in sola lettura e si consulta l’ultima copia disponibile. Per registrare modifiche occorre ristabilire il collegamento, così non nascono versioni discordanti fra i giocatori.',
  avviso_sola_lettura: 'Veicolo condiviso in sola lettura: senza il server di Mutant vedi l’ultima copia. Riattiva il collegamento per cambiarlo (A.113).',
  denominazioni: ['Corpo principale', 'Propulsione', 'Motore'],
  _denominazioni: 'Le tre denominazioni ufficiali sono Corpo principale, Propulsione e Motore. «Carrozzeria» non sostituisce il nome generale Corpo principale.',
};

/** A.145: tabella delle operazioni approvata, da consultare. Nessun conteggio automatico delle Azioni. */
const TABELLA = {
  fonte: 'A.145, risposta approvata il 15/10/2026',
  titolo: 'Azioni sui veicoli',
  nota: 'Promemoria da consultare: l’app non conta le Azioni al posto del tavolo. Le righe generali valgono per le categorie pertinenti; quelle specifiche le completano senza duplicare il costo della stessa operazione.',
  premesse: [
    'Il veicolo si muove all’Iniziativa del conducente. Gli altri occupanti agiscono alle proprie Iniziative; essere trasportati non consuma la loro AzM.',
    'Un cambio di conducente non concede al mezzo un secondo movimento né ripristina il movimento già fatto nello stesso Round.',
    'La guida ordinaria non richiede Prove: si tira quando esiste una difficoltà concreta. Una Prova di controllo imposta dalle condizioni è compresa nell’AzM; una manovra complessa volontaria costa anche 1 AzP.',
    'I costi valgono per chi esegue l’operazione e richiedono accesso ai comandi, mani disponibili e compatibilità con la mansione.',
  ],
  categorie: ['Generale', 'Auto e moto', 'Moto', 'Imbarcazioni', 'Imbarcazioni a motore', 'Remi', 'Vela', 'Velivoli atmosferici', 'Astronavi'],
  righe: [
    { categoria: 'Generale', operazione: 'Salire o scendere', costo: '1 AzP per operazione; accesso aperto e praticabile, mezzo fermo o in condizioni adatte.' },
    { categoria: 'Generale', operazione: 'Aprire o chiudere porta, portello o tettuccio', costo: '1 AzP per operazione. Blocchi e procedure particolari si risolvono separatamente.' },
    { categoria: 'Generale', operazione: 'Prendere posto ai comandi', costo: '1 AzP; eventuale imbracatura complessa richiede una propria AzP.' },
    { categoria: 'Generale', operazione: 'Avviare il mezzo già predisposto', costo: '1 AzP; restano i tempi tecnici previsti.' },
    { categoria: 'Generale', operazione: 'Condurre e muovere il mezzo', costo: '1 AzM per Round.' },
    { categoria: 'Generale', operazione: 'Manovra complessa volontaria', costo: '+1 AzP oltre all’AzM; Prova e modificatori pertinenti.' },
    { categoria: 'Generale', operazione: 'Muoversi verso il mezzo o al suo interno', costo: 'Normale movimento in Q; separato dall’operazione di accesso.' },
    { categoria: 'Generale', operazione: 'Cintura ordinaria / imbracatura complessa', costo: 'Cintura ordinaria compresa nel prendere o lasciare il posto. Imbracatura complessa: 1 AzP per allacciare o slacciare.' },
    { categoria: 'Generale', operazione: 'Uscire dalla portata di un nemico', costo: 'Può provocare un Attacco di Opportunità contro il mezzo o un occupante esposto: una sola occasione per nemico (A.146).' },
    { categoria: 'Auto e moto', operazione: 'Freno di stazionamento e cavalletto', costo: 'Compresi nell’AzM di partenza o parcheggio, nelle condizioni ordinarie.' },
    { categoria: 'Auto e moto', operazione: 'Portiere', costo: '1 AzP per aprire o chiudere ciascuna portiera; nessuna chiusura automatica.' },
    { categoria: 'Moto', operazione: 'Montare o smontare; mantenere l’equilibrio', costo: 'Salita o discesa: 1 AzP. Equilibrio ordinario senza Prova; difficoltà concrete seguono le regole generali.' },
    { categoria: 'Imbarcazioni', operazione: 'Imbarcarsi o sbarcare', costo: '1 AzP; raggiungere l’accesso o percorrere il ponte richiede il movimento effettivo.' },
    { categoria: 'Imbarcazioni', operazione: 'Gestire un ormeggio semplice', costo: '1 AzP per punto di ormeggio.' },
    { categoria: 'Imbarcazioni', operazione: 'Ancora meccanizzata', costo: '1 AzP per il comando; completamento secondo i tempi della scheda.' },
    { categoria: 'Imbarcazioni', operazione: 'Ancora manuale', costo: 'Durata, lavoro e addetti secondo la scheda.' },
    { categoria: 'Imbarcazioni', operazione: 'Accostarsi o allontanarsi', costo: 'Compreso nell’AzM di conduzione; eventuali ormeggi sono operazioni separate.' },
    { categoria: 'Imbarcazioni a motore', operazione: 'Comandi, avvio e conduzione', costo: 'Costi generali: 1 AzP per prendere i comandi, 1 AzP per avviare il motore pronto, 1 AzM per guidare.' },
    { categoria: 'Remi', operazione: 'Preparare i remi e prendere posto', costo: '1 AzP.' },
    { categoria: 'Remi', operazione: 'Vogare', costo: '1 AzM per Round per ciascun vogatore necessario. Governare una piccola barca mentre si rema è compreso nella stessa AzM.' },
    { categoria: 'Vela', operazione: 'Issare o ammainare le vele', costo: 'Durata e numero di addetti secondo la scheda; ciascun addetto impiega 1 AzP per Round di lavoro.' },
    { categoria: 'Vela', operazione: 'Governare a vela', costo: '1 AzM per Round del timoniere; regolazioni ordinarie dalla propria postazione comprese.' },
    { categoria: 'Vela', operazione: 'Regolazioni che richiedono altri membri', costo: '1 AzP per addetto quando necessario; restano procedure ed equipaggio previsti.' },
    { categoria: 'Velivoli atmosferici', operazione: 'Preparazione al volo', costo: 'Durata e addetti secondo la scheda; ciascun addetto impiega 1 AzP per Round di preparazione.' },
    { categoria: 'Velivoli atmosferici', operazione: 'Rullare, volare, decollare o atterrare', costo: '1 AzM per Round per la durata dell’operazione; eventuale manovra complessa richiede anche 1 AzP.' },
    { categoria: 'Velivoli atmosferici', operazione: 'Mantenere lo stazionario', costo: '1 AzM per Round, soltanto per un mezzo che lo consente.' },
    { categoria: 'Velivoli atmosferici', operazione: 'Accesso, portello, comandi e avvio', costo: 'Costi generali: 1 AzP per ciascuna operazione pertinente. Avvio da mezzo predisposto; imbracatura complessa separata.' },
    { categoria: 'Astronavi', operazione: 'Attivare una camera di compensazione', costo: '1 AzP per il comando; il ciclo richiede il tempo tecnico della scheda e non è necessariamente completato nell’azione.' },
    { categoria: 'Astronavi', operazione: 'Preparare la nave alla partenza', costo: 'Durata e addetti secondo la scheda; ciascun addetto impiega 1 AzP per Round di preparazione.' },
    { categoria: 'Astronavi', operazione: 'Avviare i sistemi già predisposti', costo: '1 AzP; eventuali tempi tecnici rimangono necessari.' },
    { categoria: 'Astronavi', operazione: 'Pilotare attivamente', costo: '1 AzM per Round; comprende il normale controllo della rotta e della velocità.' },
    { categoria: 'Astronavi', operazione: 'Decollare, atterrare o attraccare', costo: '1 AzM per Round per tutta la durata della manovra. Requisiti e tempi secondo il mezzo; complessa solo quando le condizioni lo giustificano.' },
    { categoria: 'Astronavi', operazione: 'Azionare un comando semplice di bordo', costo: '1 AzP dalla postazione appropriata; le operazioni articolate seguono la propria procedura.' },
    { categoria: 'Astronavi', operazione: 'Navigazione automatica e ripresa del controllo', costo: 'Un sistema attivo che mantiene la rotta non richiede l’AzM del pilota ogni Round. Riprendere il controllo manuale: 1 AzP, poi i normali costi di pilotaggio.' },
  ],
};

/** A.146: Attacchi di Opportunità e veicoli. Promemoria, nessun avviso automatico sulla mappa. */
const OPPORTUNITA = {
  fonte: 'A.146, risposta approvata il 15/10/2026 (sostituisce il provvisorio «no in entrambi i casi»)',
  provoca: true,
  zona_di_controllo_del_mezzo: false,
  avviso_automatico: false,
  _avviso_automatico: 'La mappa non propone l’Attacco di Opportunità quando un mezzo esce da una ZoC: troppe condizioni dipendono dal tavolo (bersaglio esposto, Copertura, arma pronta del conducente). Resta la riga nella tabella delle azioni, che il master legge quando serve.',
  // Testo della risposta di Davide, non dei manuali (che non sono ancora aggiornati): chiave distinta da «frasi»,
  // che tools/verifica_frasi.mjs cerca in docs/manuali-txt/.
  frasi_risposta: [
    'Un veicolo che esce dalla portata di un nemico può provocare un Attacco di Opportunità, se il nemico può davvero raggiungerlo in mischia.',
    'Si sceglie come bersaglio il veicolo oppure un occupante esposto e raggiungibile: un occupante protetto dall’abitacolo non si colpisce attraverso la carrozzeria. Valgono le normali regole di Copertura.',
    'Contro il mezzo si applicano le regole dei danni ai veicoli e le relative protezioni. L’attacco non arresta automaticamente il movimento.',
    'Per ciascun nemico il medesimo passaggio del mezzo è una sola occasione: un bersaglio valido, veicolo oppure occupante esposto. Non si moltiplicano gli attacchi per il numero degli occupanti.',
    'Il veicolo non ha una propria zona di controllo. Un occupante che combatte verso l’esterno controlla soltanto la zona raggiungibile dalla sua posizione con la portata della sua arma, non l’intero perimetro del mezzo; pareti e vetri chiusi impediscono gli attacchi.',
    'Chi guida deve avere arma pronta, libertà di movimento e la possibilità materiale di attaccare senza abbandonare i comandi: la sola presenza a bordo non basta.',
    'Il mezzo che passa accanto a un nemico fermo non concede Attacchi di Opportunità agli occupanti: spostare la propria zona di controllo non equivale a un disimpegno dell’avversario.',
  ],
};

/** A.147: curve, sterzate, inversioni e rotazione. Promemoria nella scheda del veicolo; nessun costo in Q. */
const ROTAZIONE = {
  fonte: 'A.147, risposta approvata il 15/10/2026',
  costo_in_q: 0,
  _costo_in_q: 'Nessun costo automatico del tipo «1 Q ogni 45°». Si contano i Q effettivamente percorsi; la classificazione della manovra la fa il Direttore.',
  orientamenti_gradi: [0, 45, 90, 135, 180, 225, 270, 315],
  _orientamenti: 'L’app deve consentire almeno gli otto orientamenti a 45°, anche in diagonale, e mantenerli: il controllo del posizionamento e del passaggio considera l’ingombro nell’orientamento effettivo, senza forzare il ritorno a un orientamento ortogonale.',
  manovre: [
    { nome: 'Curva ordinaria', costo: 'compresa nell’AzM di conduzione', prova: null, nota: 'Si contano i Q percorsi lungo la curva, senza supplemento per la rotazione.' },
    { nome: 'Sterzata stretta', costo: 'AzM di conduzione + 1 AzP', prova: 'Pilotare −2', nota: 'Oltre a MAN e agli altri modificatori pertinenti. Non aggiunge un costo fisso in Q.' },
    { nome: 'Inversione rapida', costo: 'AzM di conduzione + 1 AzP', prova: 'Pilotare −4', nota: 'Il mezzo e lo spazio disponibile devono permetterla.' },
    { nome: 'Inversione ordinaria', costo: 'normale conduzione', prova: null, nota: 'Percorso ampio o manovre lente: si pagano tutti i Q percorsi e le AzM dei Round necessari. Non diventa automaticamente un’Inversione rapida.' },
    { nome: 'Rotazione sul posto', costo: 'compresa nell’AzM di conduzione', prova: null, nota: 'Solo se il mezzo ne è capace; non consuma Q di traslazione. Restano tempi e capacità della scheda.' },
  ],
  // Testo della risposta di Davide, non dei manuali (che non sono ancora aggiornati): chiave distinta da «frasi»,
  // che tools/verifica_frasi.mjs cerca in docs/manuali-txt/.
  frasi_risposta: [
    'Non esiste una soglia angolare universale che trasformi una curva ordinaria in manovra complessa: contano andatura, spazio, traiettoria e caratteristiche del mezzo.',
    'L’orientamento segue la manovra effettuata: non si ruota liberamente il mezzo prima o dopo lo spostamento per ottenere una direzione non raggiunta. L’intero ingombro deve poter passare anche durante la curva.',
    'Spezzare una sterzata in più piccole rotazioni non ne cambia il costo: si valuta la manovra nel suo insieme. Per le astronavi, ruotare lo scafo non cambia da solo la traiettoria.',
    'La disponibilità del comando di rotazione non autorizza una manovra altrimenti impossibile.',
  ],
};

function applica() {
  const v = leggi('data/veicoli.json');
  const m = leggi('data/mappa.json');
  const mancano = [];
  const confronta = (nome, attuale, atteso) => { if (JSON.stringify(attuale) !== JSON.stringify(atteso)) mancano.push(nome); };

  confronta('personaggio.permessi', v.personaggio.permessi, PERMESSI);
  confronta('azioni.tabella', v.azioni.tabella, TABELLA);
  confronta('opportunita', v.opportunita, OPPORTUNITA);
  confronta('manovre_rotazione', v.manovre_rotazione, ROTAZIONE);
  const RV = m.token.rotazione_veicoli;
  if (RV.passo_gradi !== 45 || RV.passo_fine_gradi !== 10 || RV['TODO(Davide)']) mancano.push('mappa.token.rotazione_veicoli');
  if (CONTROLLA) {
    if (mancano.length) { console.error(`lotto veicoli da riapplicare: ${mancano.join(', ')}`); process.exit(1); }
    console.log('lotto veicoli (A.113, A.145, A.146, A.147): dati aggiornati');
    return;
  }

  // A.113: permessi e denominazioni; il TODO sparisce
  delete v.personaggio['TODO(Davide)'];
  v.personaggio.permessi = PERMESSI;
  // A.145: la tabella da consultare; il TODO sparisce
  delete v.azioni['TODO(Davide)'];
  delete v.azioni['TODO(Davide) opportunita'];
  v.azioni.tabella = TABELLA;
  // A.146 e A.147: blocchi nuovi
  v.opportunita = OPPORTUNITA;
  v.manovre_rotazione = ROTAZIONE;
  scrivi('data/veicoli.json', v);

  // A.147: sulla mappa il passo di base diventa 45°, il passo fine (Maiusc) resta 10°
  delete RV['TODO(Davide)'];
  RV._nota = 'A.147 (risposta approvata il 15/10/2026): ← → girano il veicolo di passo_gradi (45°, gli otto orientamenti della risposta), Maiusc+← → di passo_fine_gradi per un orientamento libero scelto dal master. Con angoli non retti i quadretti occupati sono quelli coperti per almeno metà dal rettangolo ruotato (src/mappa/forma.js), e il controllo del passaggio usa l’ingombro nell’orientamento effettivo. Girare non consuma Q (data/veicoli.json → manovre_rotazione): Sterzata stretta e Inversione rapida restano promemoria della scheda.';
  RV.passo_gradi = 45;
  RV.passo_fine_gradi = 10;
  delete RV.passo_rapido_gradi;
  scrivi('data/mappa.json', m);
  console.log('veicoli.json: permessi, tabella delle azioni, Attacchi di Opportunità e manovre; mappa.json: rotazione a 45°.');
}

applica();
