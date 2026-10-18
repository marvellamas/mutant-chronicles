// Blocco «Sciami e piccola fauna» del catalogo (cap. 8) del Manuale dei Mostri v0.23: dieci profili prestabiliti
// in esempi/nemici/mostri/ (quattro animali e sei Sciami), nel formato di data/formato_nemici.json (A.73).
// Valori trascritti; niente valori inventati. GS/PX informativo (A.161). Spazio dal campo `spazio` (A.126, A.167).
//
// Scelte del blocco (oltre a quelle dei blocchi precedenti):
//  - Sciame: un solo avversario, spazio 1 × 1 Q condivisibile (nota), portata 0 Q: il validatore ammette portate da 1 Q,
//    quindi `portata_q` vale 1 e la portata 0 Q condiviso è nella nota dell'attacco (A.171); i due profili di danno per fascia di PV sono due attacchi con la fascia nel nome, e quello
//    ridotto sostituisce l'altro (nota): non sono attacchi separati.
//  - «Corpo distribuito» (resistenza fisica dimezzata per eccesso, immunità collettive, niente recupero PV,
//    Menomazioni funzionali, dispersione): una capacità comune agli sciami; immunità ad A Terra, Immobilizzato,
//    Stordito e Terrorizzato negli Stati; fascinazione, paralisi e pietrificazione nella capacità (non sono Stati).
//  - Frenesia del sangue (Quipper e relativo Sciame): capacità con il VA già maggiorato nel testo.
//  - Corvo: Imitazione come capacità (1 AzP, Raggirare 8 contrapposto).
//  - Quipper: nessun moto a terra (passo 0, corsa e scatto non consentiti), Nuoto come capacità.
//  - Veleno ofidico dello Sciame di serpenti: capacità con Tempra senza modificatore; stessa tossina dei Serpenti.
//
// Uso: node tools/genera_mostri_sciami.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.23 (17/10/2026), cap. 8 «Catalogo delle creature» — Sciami e piccola fauna';
const NOTA_PORTATA = 'Portata 0 Q nel manuale (attacca solo nello spazio condiviso con la vittima): il formato ammette portate da 1 Q, quindi qui 1 Q con questa condizione (A.171).';
const r = (nome, va, danno, portata_q, extra = {}) => {
  const a = { nome, tipo: 'ravvicinato', va, danno, natura: 'Naturale', ac: 1, ...extra };
  if (portata_q) return { ...a, portata_q };
  return { ...a, portata_q: 1, note: [a.note, NOTA_PORTATA].filter(Boolean).join(' ') };
};
const scuro = (q) => ({ nome: 'Scurovisione', effetto: `Vede entro ${q} Q nel buio naturale, senza colori; non attraversa solidi, torbidità o fumo.` });
const VIVENTE = { nome: 'Natura e risorse', effetto: 'Natura Comune, vivente, senza incantesimi né poteri magici attivi. 1 AzP e 1 AzM per Round; un attacco costa 1 AzP e produce AC 1; al massimo un attacco per Round, Opportunità compresa. Nessuna Parata naturale. Schivata: 1 AzP, 1 AzM e spostamento realmente possibile. A 0 PV valgono Tempra, Ferite, Menomazioni e Morente (nessuna morte o incoscienza automatica); a 0 PM Svenuto. Nessuna immunità generica agli effetti spirituali. Respira aria (COS Round di fiato). Naturale e Magico incontrano tutta l’AR pertinente, Etereo solo quella magica.' };
const ANIMALE = (extra = '') => ({ nome: 'Animale singolo', effetto: `Segue integralmente PV, PM, Ferite, Menomazioni e cure biologiche. Non comprende linguaggi. Un animale incontrato non è automaticamente una minaccia: cibo, rifugio, rumori, uova e accessi al nido spiegano la condotta. Il gruppo ostile ha un profilo separato (Sciame). ${extra}`.trim() });
const CORPO_DISTRIBUITO = { nome: 'Corpo distribuito', effetto: 'Dimezza per eccesso i danni fisici da Taglio, Perforazione e Contusione di qualunque Natura, dopo Difesa o Salvezza e prima dell’AR, anche per una componente fisica ad Area (non per Fuoco, Gelo, Elettricità, veleno o danno psichico; un attacco misto separa le componenti, e la resistenza non si ripete per il numero di animali). Immune ad A Terra, Immobilizzato, Stordito e Terrorizzato e a fascinazione, paralisi e pietrificazione (i danni associati si risolvono); non è immune a Rallentato, Accecato, Assordato, Avvelenato, Incendiato, Sanguinamento, Svenuto né a ogni effetto mentale e spirituale. Conta come una sola creatura biologica per bersagli, Azioni ed effetti, con una sola riserva di PV e PM; non recupera PV né riceve PV temporanei (nemmeno da una cura) e spostarlo o disperderlo non ripristina le risorse. Un’Area risolve sullo Sciame un solo bersaglio, senza moltiplicare colpi o danni.' };
const CONDIVISO = { nome: 'Spazio condiviso', effetto: 'Occupa 1 × 1 Q e può condividere lo spazio di altre creature. Per attaccare deve condividere con la vittima almeno un Q e il relativo volume (un gruppo in quota non morde chi è al suolo); portata 0 Q, e anche un’Opportunità richiede che il bersaglio sia ancora nello spazio condiviso all’innesco. Entrare o restare nel Q non infligge danno automatico. Attraversa solo aperture percorribili da un suo componente, come un’unica pedina; non si divide in unità con nuove Azioni o risorse. Pareti, vetri e contenitori chiusi lo fermano; vestiti e armature non sono ignorati dai morsi e l’AR della vittima resta efficace.' };
const FERITE_SCIAME = { nome: 'Ferite e dispersione', effetto: 'A 0 PV si continua con Tempra e fasce delle Ferite del §4.2. Menomazioni: Testa = orientamento e sensi, Torace = coesione centrale, Braccia = componenti offensive, Gambe = locomozione (compresi Volo o Nuoto); si applicano alla funzione interessata. Svenuto arresta l’azione del gruppo; Morente mantiene il contatore di COS Round. La morte della scheda è la distruzione del gruppo come unità. La soglia di metà PV sostituisce solo il danno fisico con il profilo ridotto; la fuga usa Movimento, accessi e Opportunità ordinari (non teletrasporta i componenti). Rappresentare un superstite con la scheda individuale non ricrea lo Sciame né dà un secondo premio per la stessa minaccia.' };
const SENZA_TERRA = { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' };
const sciame = (id, nome, fonte, b) => ({ id, nome, spazio: '1 Q', azioni: { principali: 1, movimento: 1 }, ...b, note: `${b.note} Fonte: ${fonte}.` });
const IMM = ['a-terra', 'immobilizzato', 'stordito', 'terrorizzato'];
const NOTA_FASCE = 'I due profili di Morsi/Becchi sono le fasce di danno per PV: quello ridotto sostituisce l’altro e non è un attacco separato. Spazio 1 × 1 Q condivisibile con altre creature (portata 0 Q: attacca solo nello spazio condiviso; vedi A.171).';

const CREATURE = [
  {
    id: 'pipistrello', nome: 'Pipistrello',
    caratteristiche: { FOR: 1, DES: 7, COS: 4, INT: 2, SAG: 6, CAR: 3 },
    pv: 3, pm: 3, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 1, corsa: 2, scatto: 3, volo: 6 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 11, volonta: 7, magia: 7 },
    attacchi: [r('Morso', 6, '1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 6 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VIVENTE, ANIMALE(),
      { nome: 'Ecolocalizzazione', effetto: 'Entro 12 Q in aria comunicante usa Percezione 9 per distinguere corpi e ostacoli quando può emettere e ricevere gli echi. Assordato o un impedimento reale alla propagazione del suono la interrompono. Conserva la vista ordinaria; nessuna Scurovisione. Non distingue colori o scritte.' },
      { nome: 'Udito acuto', effetto: '+2 a Percezione quando l’udito è determinante, anche per una Prova di ecolocalizzazione che richieda di distinguere un suono (una sola volta; non riattiva il senso da Assordato). Il semplice rumore non lo stordisce automaticamente.' },
    ],
    note: 'Braccia = ali; Gambe = arti posteriori; lo spazio tattico non ne rappresenta la larghezza reale. Il Morso non trasmette automaticamente malattie né suzione di sangue. Non ha volo stazionario: decollo, dislivello e atterraggio consumano la stessa AzM. Condotta: cerca normalmente una fuga in volo; a Ferita Superficiale tende ad abbandonare lo scontro. Fonte: Bat, p. 318.',
  },
  {
    id: 'corvo', nome: 'Corvo',
    caratteristiche: { FOR: 1, DES: 6, COS: 4, INT: 2, SAG: 6, CAR: 4 },
    pv: 4, pm: 4, ar: { totale: 0, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 10 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 10, volonta: 8, magia: 8 },
    attacchi: [r('Becco', 8, '1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 8 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 10 }, { nome: 'Raggirare', va: 8 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VIVENTE, ANIMALE(),
      { nome: 'Imitazione', azioni: { principali: 1 }, effetto: 'Con 1 AzP ripete un breve suono semplice già udito. Se un ascoltatore cerca di riconoscere l’imitazione, si risolve Raggirare 8 del Corvo contrapposto alla sua Percezione, con le regole ordinarie; il successo dell’ascoltatore svela l’origine imitata. Non costruisce discorsi nuovi né comprende un linguaggio per il solo fatto di ripeterne un suono. Il richiamo non applica Stati né garantisce Sorpresa.' },
      { nome: 'Sensi e corpo', effetto: 'Vista e udito ordinari, senza Scurovisione innata. Braccia = ali; Gambe = arti posteriori. Nessun volo stazionario né Passaggio in volo: lasciare una portata nemica può provocare Opportunità. Può trasportare solo ciò che anatomia e carico consentono.' },
    ],
    note: 'Un Becco per Round, Opportunità compresa. Può cercare cibo, attirare l’attenzione o difendere il nido; un oggetto sottratto richiede comunque un’azione e un accesso praticabile. Condotta: a Ferita Superficiale tende a raggiungere un posatoio sicuro. Fonte: Raven, p. 335.',
  },
  {
    id: 'ratto', nome: 'Ratto',
    caratteristiche: { FOR: 1, DES: 5, COS: 4, INT: 2, SAG: 5, CAR: 3 },
    pv: 3, pm: 3, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 9, volonta: 7, magia: 7 },
    attacchi: [r('Morso', 6, '1', 1, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 6 }, { nome: 'Atletica', va: 8 }, { nome: 'Percezione', va: 8 }, { nome: 'Furtività', va: 12 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      VIVENTE, ANIMALE('Può fuggire davanti a una creatura più grande o mordere se bloccato; la sua presenza non dichiara un’infestazione.'),
      scuro(6),
      { nome: 'Olfatto e passaggi', effetto: '+2 a Percezione quando l’olfatto è determinante: un odore accessibile può rivelare una traccia, ma non localizza ogni creatura oltre pareti o in un ambiente saturo di altri odori (restano le Prove per seguire una pista). Può usare un varco adatto al suo corpo reale; una fessura chiusa non diventa percorribile perché occupa una pedina. Nessuna aderenza a pareti lisce.' },
    ],
    note: 'Un Morso per Round, Opportunità compresa; non inocula veleno o malattie automaticamente e non ha Tattiche di branco. Testa e Torace = capo e tronco; Braccia = zampe anteriori; Gambe = posteriori. Condotta: cerca un anfratto libero; a Ferita Superficiale tende alla fuga. Fonte: Rat, p. 335.',
  },
  {
    id: 'quipper', nome: 'Quipper',
    caratteristiche: { FOR: 1, DES: 7, COS: 4, INT: 1, SAG: 3, CAR: 2 },
    pv: 3, pm: 2, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: SENZA_TERRA, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 8, riflessi: 11, volonta: 6, magia: 6 },
    attacchi: [r('Morso', 9, '1', 1, { proprieta: ['Perforazione'], note: 'Solo in acqua.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 7 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      { ...VIVENTE, effetto: VIVENTE.effetto.replace('Respira aria (COS Round di fiato).', 'Respira soltanto acqua.') },
      ANIMALE('Usa questa scheda per un esemplare isolato e quella dello Sciame per il branco compatto ostile.'),
      { nome: 'Nuoto', effetto: 'Nuoto 8 / 16 / 24 Q effettivi (eccezione al costo ordinario 2 dell’acqua: nel solo Nuoto si percorrono le distanze scritte; percorsi misti: budget unico del §5.2.4). Nessun moto a terra: fuori dall’acqua non si sposta, segue la riserva di fiato di COS Round e il soffocamento, e non attacca oltre il mezzo che raggiunge.' },
      { nome: 'Frenesia del sangue', effetto: '+2 VA al Morso (VA 11) contro un organismo vivente con PV inferiori al massimo oppure con Sanguinamento attivo. Non si somma per più ferite, tracce o alleati e non aumenta il danno; il Morso non procura Sanguinamento automaticamente.' },
      scuro(12),
    ],
    note: 'Un Morso per Round, Opportunità compresa. Testa e Torace = capo e tronco; Braccia = pinne anteriori; Gambe = apparato propulsivo posteriore. Non comprende linguaggi. L’adattamento a un’acqua fredda non concede immunità al Gelo. Condotta: a Ferita Superficiale tende a sottrarsi nella vegetazione o nell’acqua più profonda, se raggiungibile. Fonte: Quipper, p. 335.',
  },
  sciame('sciame-di-pipistrelli', 'Sciame di pipistrelli', 'Swarm of Bats, p. 337', {
    caratteristiche: { FOR: 3, DES: 7, COS: 5, INT: 2, SAG: 6, CAR: 3 },
    pv: 24, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { ...SENZA_TERRA, volo: 6 },
    salvezze: { tempra: 9, riflessi: 11, volonta: 7, magia: 8 },
    attacchi: [r('Morsi (PV 13–24)', 10, '2d3', 0, { proprieta: ['Perforazione'] }), r('Morsi (PV 0–12)', 10, '1d3', 0, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: IMM,
    capacita: [
      VIVENTE, CORPO_DISTRIBUITO, CONDIVISO, FERITE_SCIAME,
      { nome: 'Echi e udito', effetto: 'Ecolocalizzazione entro 12 Q in aria comunicante, con Percezione 9; +2 quando l’udito è determinante, una sola volta. Assordato o un blocco reale dell’emissione o degli echi interrompono il senso. Restano vista ordinaria e limiti del Pipistrello; nessuna Scurovisione né percezione attraverso muri.' },
      { nome: 'Volo', effetto: 'In volo Corsa e Scatto richiedono Atletica −2 e −4. Può posarsi ma non ha andatura terrestre né volo stazionario; nessun Passaggio in volo. Svenuto o perdita della funzione alare possono causare Caduta.' },
    ],
    note: `${NOTA_FASCE} Il Direttore può legarlo a un nido disturbato, senza attribuirgli automaticamente Natura Oscura Simmetria. Attacca una sola vittima nello spazio condiviso; non trasmette malattie né suzione di sangue. Condotta: a 12 PV o meno, oppure a Ferita Profonda, tende a raggiungere il rifugio o disperdersi lungo una via libera.`,
  }),
  sciame('sciame-di-corvi', 'Sciame di corvi', 'Swarm of Ravens, p. 339', {
    caratteristiche: { FOR: 4, DES: 6, COS: 4, INT: 2, SAG: 6, CAR: 4 },
    pv: 24, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 2, corsa: 4, scatto: 6, volo: 10 },
    salvezze: { tempra: 8, riflessi: 10, volonta: 8, magia: 8 },
    attacchi: [r('Becchi (PV 13–24)', 10, '1d6+1', 0, { proprieta: ['Perforazione'] }), r('Becchi (PV 0–12)', 10, '1d3+1', 0, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: IMM,
    capacita: [
      VIVENTE, CORPO_DISTRIBUITO, CONDIVISO, FERITE_SCIAME,
      { nome: 'Sensi e richiami', effetto: 'Vista e udito ordinari, senza Scurovisione. Percezione 13 non assicura l’individuazione di una creatura nascosta. Non possiede l’Imitazione attiva del Corvo singolo: richiami simultanei non concedono tentativi gratuiti di Raggirare.' },
      { nome: 'Volo', effetto: 'In volo Corsa e Scatto richiedono Atletica −2 e −4. Nessun volo stazionario né Passaggio in volo. Svenuto o perdita della funzione alare possono causare Caduta. Un bersaglio dietro un vetro chiuso resta protetto dall’accesso dei corvi.' },
    ],
    note: `${NOTA_FASCE} Le ali possono nascondere parti della scena, ma la scheda non crea un’oscurità magica; il numero di becchi non concede colpi aggiuntivi, accecamento automatico o danni a tutte le creature attraversate. Condotta: può cercare un posatoio o ripiegare verso il nido; a 12 PV o meno oppure a Ferita Profonda tende alla dispersione.`,
  }),
  sciame('sciame-di-ratti', 'Sciame di ratti', 'Swarm of Rats, p. 339', {
    caratteristiche: { FOR: 4, DES: 5, COS: 5, INT: 2, SAG: 5, CAR: 3 },
    pv: 24, pm: 5, ar: { totale: 0, magica: 0 }, difese: 8, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18 },
    salvezze: { tempra: 9, riflessi: 9, volonta: 7, magia: 7 },
    attacchi: [r('Morsi (PV 13–24)', 9, '1d6+1', 0, { proprieta: ['Perforazione'] }), r('Morsi (PV 0–12)', 9, '1d3+1', 0, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 9 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: IMM,
    capacita: [
      VIVENTE, CORPO_DISTRIBUITO, CONDIVISO, FERITE_SCIAME, scuro(6),
      { nome: 'Olfatto', effetto: '+2 a Percezione quando l’olfatto è determinante. Il bonus non concede localizzazione oltre ogni ostacolo né una pista in assenza di indizi. Gli accessi devono consentire il passaggio reale di un ratto, non soltanto di un odore.' },
    ],
    note: `${NOTA_FASCE} Può costringere a cambiare strada senza che ogni ratto debba essere eliminato. Il contatto con più gambe nello stesso Q non moltiplica l’attacco. Non ha Tattiche di branco, Scavo né aderenza a pareti lisce; i morsi non inoculano malattie automaticamente. Condotta: può abbandonare una minaccia per un riparo o cibo più accessibile; a 12 PV o meno oppure a Ferita Profonda tende a disperdersi.`,
  }),
  sciame('sciame-di-insetti', 'Sciame di insetti', 'Swarm of Insects, p. 338', {
    caratteristiche: { FOR: 3, DES: 6, COS: 5, INT: 1, SAG: 3, CAR: 1 },
    pv: 24, pm: 4, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 4, corsa: 8, scatto: 12 },
    salvezze: { tempra: 9, riflessi: 10, volonta: 6, magia: 7 },
    attacchi: [r('Morsi (PV 13–24)', 10, '2d4', 0, { proprieta: ['Perforazione'] }), r('Morsi (PV 0–12)', 10, '1d4', 0, { proprieta: ['Perforazione'] })],
    abilita: [{ nome: 'Corpo a corpo', va: 10 }, { nome: 'Atletica', va: 9 }, { nome: 'Percezione', va: 7 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    immunita: IMM,
    capacita: [
      VIVENTE, CORPO_DISTRIBUITO, CONDIVISO, FERITE_SCIAME,
      { nome: 'Superfici e sensi', effetto: 'Arrampicata su appigli adatti, fino a 4 Q per AzM al Passo; nessuna aderenza automatica ai soffitti. Entro 2 Q usa Percezione 7 per avvertire corpi e vibrazioni sul supporto continuo condiviso. Non rileva in questo modo chi vola o è separato dal supporto, non attraversa pareti e non ha Scurovisione.' },
    ],
    note: `${NOTA_FASCE} Profilo generico distinto dalla Covata e dalle varianti volanti o velenose (le varianti di vespe, ragni, scarabei e centopiedi della fonte non sono in questa scheda). L’AR 1 si sottrae dopo la resistenza pertinente; il carapace non dà PI separati né Parata naturale. Non ha Volo, Scavo, veleno, telepatia o adattamento alle Terre del Fuoco. Condotta: può difendere un nido o seguire una fonte di nutrimento; a 12 PV o meno oppure a Ferita Profonda tende a ripararsi nelle crepe.`,
  }),
  sciame('sciame-di-quipper', 'Sciame di quipper', 'Swarm of Quippers, p. 338', {
    caratteristiche: { FOR: 6, DES: 7, COS: 5, INT: 1, SAG: 3, CAR: 2 },
    pv: 28, pm: 5, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: SENZA_TERRA,
    salvezze: { tempra: 9, riflessi: 11, volonta: 6, magia: 7 },
    attacchi: [r('Morsi (PV 15–28)', 11, '2d6', 0, { proprieta: ['Perforazione'], note: 'Solo in acqua.' }), r('Morsi (PV 0–14)', 11, '1d6', 0, { proprieta: ['Perforazione'], note: 'Solo in acqua.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Atletica', va: 11 }, { nome: 'Percezione', va: 8 }, { nome: 'Furtività', va: 9 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    immunita: IMM,
    capacita: [
      { ...VIVENTE, effetto: VIVENTE.effetto.replace('Respira aria (COS Round di fiato).', 'Respira soltanto acqua.') },
      CORPO_DISTRIBUITO, CONDIVISO, FERITE_SCIAME, scuro(12),
      { nome: 'Nuoto', effetto: 'Nuoto 8 / 16 / 24 Q effettivi (eccezione al costo ordinario 2 dell’acqua; percorsi misti: budget unico del §5.2.4). Nessuna andatura terrestre: fuori dall’acqua segue fiato e soffocamento. Deve condividere con la vittima un volume d’acqua raggiungibile; non morde attraverso uno scafo integro o oltre una sponda asciutta.' },
      { nome: 'Frenesia del sangue', effetto: '+2 VA ai Morsi contro un vivente sotto i PV massimi oppure con Sanguinamento attivo: VA 13 prima degli altri modificatori. Vale anche con il danno ridotto; non aumenta danni o numero di attacchi e non si somma per le vittime già ferite. Nessun Sanguinamento automatico.' },
    ],
    note: `${NOTA_FASCE} Passa al danno ridotto a 14 PV o meno. La densità del gruppo sostiene l’offensiva senza creare attacchi per ciascun pesce; il numero dei pesci non concede immunità al Gelo. Condotta: può interrompere l’inseguimento se manca il passaggio; a 14 PV o meno oppure a Ferita Profonda tende a raggiungere acqua libera.`,
  }),
  sciame('sciame-di-serpenti-velenosi', 'Sciame di serpenti velenosi', 'Swarm of Poisonous Snakes, p. 338', {
    caratteristiche: { FOR: 5, DES: 8, COS: 6, INT: 1, SAG: 5, CAR: 3 },
    pv: 36, pm: 6, ar: { totale: 0, magica: 0 }, difese: 12, iniziativa: 2,
    movimento: { passo: 6, corsa: 12, scatto: 18 },
    salvezze: { tempra: 10, riflessi: 12, volonta: 7, magia: 8 },
    attacchi: [r('Morsi (PV 19–36)', 12, '2d6', 0, { note: 'Poi veleno: vedi la capacità «Veleno ofidico II».' }), r('Morsi (PV 0–18)', 12, '1d6', 0, { note: 'Poi veleno: vedi la capacità «Veleno ofidico II».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 10 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    immunita: IMM,
    capacita: [
      VIVENTE, CORPO_DISTRIBUITO, CONDIVISO, FERITE_SCIAME,
      { nome: 'Veleno ofidico II', effetto: 'Dopo almeno 1 danno fisico finale a un vivente (risolti prima danno fisico, PV e Ferite): una sola inoculazione per attacco, naturale, Pericolosità II, Importante, Tempra senza modificatore; fallimento 1d6 Naturale interno (ignora AR) e Avvelenato (−2 ai VA fisici) per 5 Round; successo metà danno per eccesso e nessuna penalità. La tossina resta 1d6 anche sotto metà PV. Alla fine di ogni propria Iniziativa la vittima ripete gratis Tempra senza modificatore: successo termina la penalità; scadenza a fine Round R + 5; nessun danno periodico. Stessa tossina dei due Serpenti: nuove dosi, anche da un Serpente singolo o gigante, rinnovano solo la durata (nessuna nuova PS né altro danno tossico). Il Magistrale aumenta solo il fisico. Antidoto adeguato o Cura Avvelenamenti dal livello 2 la neutralizza; veleni diversi coesistono; a 0 PV nessuna stabilizzazione o paralisi automatica. Nessuna dose commerciale recuperabile.' },
      { nome: 'Sensi e nuoto', effetto: 'Percezione non visiva di prossimità entro 2 Q (Percezione 10), senza attraversare solidi né rivelare automaticamente chi è nascosto. Nessuna Scurovisione. Nuoto nativo 6 / 12 / 18 Q (già effettivo; percorsi misti: budget unico del §5.2.4). Respira aria anche quando nuota.' },
    ],
    note: `${NOTA_FASCE} A 18 PV o meno riduce soltanto il danno fisico a 1d6; i morsi restano AC 1 e non ignorano l’AR. Non ha Costrizione, prese automatiche né immunità generica al veleno. La conversione mantiene una sola inoculazione per attacco. Condotta: a 18 PV o meno oppure a Ferita Profonda tende a raggiungere fessure o acqua libera; non ha bisogno di un comandante telepatico per restare operativo.`,
  }),
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
console.log(`${scritti} profili del blocco «Sciami e piccola fauna» scritti in esempi/nemici/mostri/`);
