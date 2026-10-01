// Lotto 3 dell'aggiornamento del 01/10/2026: Manuale dell'Equipaggiamento 0.5, capitolo 7 «Dispositivi
// specialistici» (impianti cibernetici) e Umanità (Giocatore 0.45, §5.21). Ricognizione e ipotesi in
// docs/ricognizione-cibernetica.md; convenzioni in docs/equipaggiamento-lotti.md.
//   node tools/lotti/lotto_equipaggiamento_07.mjs            prova a vuoto
//   node tools/lotti/lotto_equipaggiamento_07.mjs --scrivi   scrive (idempotente)
// Scrive:
// - data/equipaggiamento/impianti.json: impianti (tipo «impianto», standard e CYBERTRONIC) e chip del Processore;
// - data/regole.json → umanita (§5.21) e → impianti (§7.1, §7.10), come testo dopo «nec»;
// - indice del catalogo, con «rif_sostituiti»: l'Interfaccia neurale degli Armamenti (corredi_dispositivi) è
//   lo stesso impianto del §7.3 e passa qui;
// - chiavi «beneficio» delle proprietà equivalenti degli esoscheletri (§7.1, «Cumulo»: «anche con elmetti
//   ed esoscheletri»).
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizza, testoManuali } from '../verifica_frasi.mjs';

const RADICE = new URL('../../', import.meta.url);
const scrivi = process.argv.includes('--scrivi');
const VERSIONE = 'Equipaggiamento 0.5';
const DOC = testoManuali();
const frase = (t) => { if (!DOC.includes(normalizza(t))) throw new Error(`frase non trovata nel Doc: ${t}`); return t; };
const frasi = (...t) => t.map(frase).join(' ');
const leggi = (p) => JSON.parse(readFileSync(new URL(p, RADICE), 'utf8'));
const salva = (p, j) => { if (scrivi) writeFileSync(new URL(p, RADICE), `${JSON.stringify(j, null, 2)}\n`); };

const QUAL = { NC: 'Non comune', RA: 'Rara', MR: 'Molto rara', CO: 'Comune' };
const PS = { 'Non comune': 12, Rara: 14, Comune: 10, 'Molto rara': 16 };

/**
 * Coppia standard / CYBERTRONIC di un impianto. `x`: { id, nome, famiglia, par, umn: [std, cyb], costo: [std, cyb],
 * rep, qualita, pi, installazione, note, effetti?, breve?, extra? }. CYBERTRONIC: catalogo «Cybertronic».
 */
function coppia(x) {
  const una = (std) => {
    const o = {
      id: std ? x.id : `${x.id}-cybertronic`, nome: std ? x.nome : `${x.nome} CYBERTRONIC`, tipo: 'impianto',
      catalogo: std ? 'Commerciale' : 'Cybertronic', famiglia: x.famiglia, nomi_alternativi: [],
      note_manuale: x.note, paragrafo: x.par, versione_manuale: VERSIONE,
      pi: x.pi, qualita: x.qualita, ps_int: PS[x.qualita],
    };
    if (x.rep) o.reperibilita = x.rep;
    const costo = x.costo[std ? 0 : 1];
    if (costo !== null) o.costo = costo;
    o.umn = x.umn[std ? 0 : 1];
    o.installazione_costo = x.installazione;
    Object.assign(o, x.extra ?? {});
    o.proprieta = [];
    if (x.breve) o.effetto_breve = x.breve;
    if (x.effetti?.length) o.effetti = x.effetti.map((e) => ({ ...e, condizione: frase(e.condizione), fonte: `Equipaggiamento ${x.par}` }));
    if (std && x.todoStd) o['TODO(Davide)'] = x.todoStd;
    return o;
  };
  return [una(true), una(false)];
}
const va = (abilita, valore, ambito, uso, condizione, extra = {}) => ({ abilita, valore, ambito, ...(uso ? { uso } : {}), condizione, ...extra });

const UMANITA_71 = frase('Umanità. Il costo UMN si applica all’installazione, secondo il Manuale del Giocatore, §5.21. I modelli CYBERTRONIC costano metà UMN degli equivalenti standard.');
const INSTALLAZIONE_71 = frase('Installazione. Richiede una struttura medica attrezzata. Una normale installazione acquistata come servizio non richiede prove aggiuntive o salvezze casuali di rigetto.');

// --- §7.3 Interfaccia neurale ---------------------------------------------------------------------------
const S = 'Interfaccia neurale';
const interfaccia = coppia({
  id: 'interfaccia-neurale', nome: 'Interfaccia neurale', famiglia: S, par: '§7.3', umn: [2, 1], costo: [null, 5000], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 2000,
  note: frasi('L’Interfaccia neurale collega il sistema nervoso ai dispositivi compatibili con SIN. Il beneficio dipende dalla scheda dell’equipaggiamento collegato: SIN 1 concede +1 VA e SIN 2 concede +2 VA soltanto alle Prove espressamente indicate. Un oggetto privo di SIN non riceve il bonus.',
    'Installazione: 2.000 cr. L’equivalente standard ha costo 2 UMN. L’interfaccia usa la bioenergia del corpo e non richiede NEC, ricariche o registrazione dell’autonomia.',
    'Gli innesti CYBERTRONIC si abbinano automaticamente all’equipaggiamento CYBERTRONIC. Un’interfaccia di altra marca richiede un minuto di configurazione e una Prova di Tecnologia: con successo l’abbinamento viene memorizzato; con fallimento rimane disponibile il funzionamento ordinario del dispositivo. Non si ripete la Prova a ogni utilizzo.',
    'Si applica un solo SIN pertinente per Prova, scegliendo il maggiore fino a +2.',
    'A 0 PI cessano collegamento neurale e relativi benefici.'),
  breve: 'Collega i dispositivi con SIN: +1 o +2 VA alle Prove indicate dalla loro scheda.',
  extra: { innesto: 'interfaccia_neurale' },
  todoStd: 'A.68: il §7.3 dà prezzo, REP e Integrità della sola Interfaccia CYBERTRONIC; dell’equivalente standard solo il costo di 2 UMN. Prezzo e profilo? Nel frattempo profilo della CYBERTRONIC (§7.1: «Salvo una scheda diversa, standard e CYBERTRONIC hanno gli stessi effetti, PI e PS Integrità») e nessun prezzo: non si compra.',
});

// --- §7.4 Impianti sensoriali ----------------------------------------------------------------------------
const SENS = 'Impianti sensoriali';
const sens = frasi('Ogni voce è un impianto completo: prezzo e UMN non si raddoppiano se coinvolge entrambi gli occhi o entrambe le orecchie. Gli impianti funzionano autonomamente, senza richiedere l’Interfaccia neurale.',
  'Attivare, disattivare o cambiare una modalità di visione richiede 1 AzP; mantenerla non richiede Azioni.',
  'Si effettua una sola Prova di Percezione: vista e udito potenziati insieme concedono +2, non +4. Sensori equivalenti dell’elmetto applicano soltanto il bonus maggiore; il SIN resta distinto.');
const sensoriali = [
  ...coppia({ id: 'potenziamento-visivo', nome: 'Potenziamento visivo', famiglia: SENS, par: '§7.4', umn: [2, 1], costo: [4000, 6000], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 1000,
    note: `${frase('+2 VA a Percezione tramite la vista per individuare movimenti, esaminare particolari e riconoscere dettagli visibili.')} ${sens}`,
    breve: '+2 VA a Percezione tramite la vista.',
    effetti: [va('Percezione', 2, 'situazionale', null, '+2 VA a Percezione tramite la vista per individuare movimenti, esaminare particolari e riconoscere dettagli visibili.', { beneficio: 'sensori_vista' })] }),
  ...coppia({ id: 'visione-notturna', nome: 'Visione notturna impiantata', famiglia: SENS, par: '§7.4', umn: [2, 1], costo: [5000, 7500], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 1000,
    note: `${frasi('Entro 80 Q elimina le penalità per scarsa illuminazione. Richiede luce ambientale residua.', 'La visione notturna non funziona nel buio completo; fumo, nebbia e ostacoli conservano i propri effetti.')} ${sens}`,
    breve: 'Entro 80 Q elimina le penalità per scarsa illuminazione.' }),
  ...coppia({ id: 'visione-termica', nome: 'Visione termica impiantata', famiglia: SENS, par: '§7.4', umn: [2, 1], costo: [8000, 12000], rep: 'MR', qualita: 'Non comune', pi: 4, installazione: 1000,
    note: `${frasi('Entro 40 Q osserva e prende di mira bersagli con sufficiente contrasto termico, anche nel buio naturale completo.', 'La termica ignora il −4 VA della Fumogena standard se distingue il bersaglio, ma non vede attraverso coperture solide e non identifica automaticamente persone o creature nascoste.')} ${sens}`,
    breve: 'Entro 40 Q osserva e prende di mira bersagli con contrasto termico, anche al buio.' }),
  ...coppia({ id: 'potenziamento-uditivo', nome: 'Potenziamento uditivo', famiglia: SENS, par: '§7.4', umn: [2, 1], costo: [4000, 6000], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 1000,
    note: `${frase('+2 VA a Percezione tramite l’udito per distinguere passi, voci e suoni effettivamente percepibili.')} ${sens}`,
    breve: '+2 VA a Percezione tramite l’udito.',
    effetti: [va('Percezione', 2, 'situazionale', null, '+2 VA a Percezione tramite l’udito per distinguere passi, voci e suoni effettivamente percepibili.', { beneficio: 'sensori_udito' })] }),
];

// --- §7.5 Protesi degli arti ------------------------------------------------------------------------------
const PROT = 'Protesi degli arti';
const protesi = frasi('La protesi elimina le limitazioni dovute all’assenza dell’arto sostituito; non cura altre Ferite o Menomazioni. I potenziamenti non aumentano FOR o DES, non soddisfano requisiti delle armi e non modificano automaticamente tiri per colpire, Difese, PV o AR.');
const BRACCIO = 'Come il sostitutivo; +2 VA a Forza o Atletica per sollevare, spingere, trascinare o sfondare usando il braccio; +1 danno agli attacchi ravvicinati effettuati con quell’arto.';
const GAMBE = 'Ripristinano le funzioni di entrambe le gambe; +1 Q al Movimento e +2 VA ad Atletica per saltare e mantenere l’equilibrio.';
const SOLLEVARE = 'sollevare, spingere, trascinare o sfondare';
const arti = [
  ...coppia({ id: 'braccio-sostitutivo', nome: 'Braccio sostitutivo', famiglia: PROT, par: '§7.5', umn: [2, 1], costo: [6000, 9000], rep: 'NC', qualita: 'Non comune', pi: 6, installazione: 2000,
    note: `${frase('Ripristina le funzioni di braccio e mano: impugnare, manipolare, attaccare e usare strumenti.')} ${protesi}`, breve: 'Ripristina le funzioni di braccio e mano.' }),
  ...coppia({ id: 'braccio-potenziato', nome: 'Braccio potenziato', famiglia: PROT, par: '§7.5', umn: [6, 3], costo: [10000, 15000], rep: 'RA', qualita: 'Rara', pi: 8, installazione: 2000,
    note: `${frase(BRACCIO)} ${protesi} ${frase('Il +1 danno del braccio vale per pugni, gomitate e armi da mischia impugnate con quell’arto, anche a due mani, una sola volta per colpo. Non aumenta il danno di armi da fuoco o da lancio. Due braccia potenziate mantengono +2 alla Prova pertinente e +1 danno al colpo: i benefici equivalenti non si sommano, anche con esoscheletri.')}`,
    breve: '+2 a FOR o Atletica per sollevare, spingere, trascinare o sfondare; +1 danno ravvicinato.',
    effetti: [
      { tipo: 'caratteristica', caratteristiche: ['FOR'], valore: 2, ambito: 'uso_specifico', uso: SOLLEVARE, condizione: BRACCIO, beneficio: 'assistenza_muscolare_for' },
      va('Atletica', 2, 'uso_specifico', SOLLEVARE, BRACCIO, { beneficio: 'assistenza_muscolare_atletica' }),
      // ipotesi H5 (docs/ricognizione-cibernetica.md): l'app non registra la mano, il +1 vale per gli attacchi ravvicinati
      { tipo: 'danno', attacchi: 'ravvicinati', valore: 1, ambito: 'generale', condizione: BRACCIO, beneficio: 'colpo_assistito' },
    ] }),
  ...coppia({ id: 'gamba-sostitutiva', nome: 'Gamba sostitutiva', famiglia: PROT, par: '§7.5', umn: [2, 1], costo: [6000, 9000], rep: 'NC', qualita: 'Non comune', pi: 8, installazione: 2000,
    note: `${frase('Ripristina le funzioni di gamba e piede: camminare, correre, saltare e sferrare calci.')} ${protesi}`, breve: 'Ripristina le funzioni di gamba e piede.' }),
  ...coppia({ id: 'gambe-potenziate-in-coppia', nome: 'Gambe potenziate in coppia', famiglia: PROT, par: '§7.5', umn: [10, 5], costo: [18000, 27000], rep: 'RA', qualita: 'Rara', pi: 10, installazione: 4000,
    note: `${frase(GAMBE)} ${frase('Installazione: 2.000 cr per arto; 4.000 cr per la coppia di gambe. Prezzo e UMN della coppia sono complessivi, mentre i PI si registrano per ciascuna gamba.')} PI: 10 per gamba; l’app ne tiene una riga per la coppia (ipotesi H6). ${protesi}`,
    breve: '+1 Q al Movimento; +2 VA ad Atletica per saltare e mantenere l’equilibrio.',
    effetti: [
      { tipo: 'movimento', valore: 1, ambito: 'generale', condizione: GAMBE },
      va('Atletica', 2, 'uso_specifico', 'saltare', GAMBE),
      va('Atletica', 2, 'uso_specifico', 'equilibrio', GAMBE),
    ] }),
];

// --- §7.6 Protezione e supporto organico ----------------------------------------------------------------
const ORG = 'Protezione e supporto organico';
const org = frasi('Tutti i modelli: REP Rara; installazione 2.000 cr per impianto. Benefici sempre attivi, senza consumo energetico da registrare.',
  'Bonus equivalenti alle Salvezze usano soltanto il maggiore: maschera, filtro respiratorio e filtro ematico concedono complessivamente +2 alla stessa PS contro un veleno inalato. A 0 PI cessa il beneficio.');
const tempra = (uso, condizione, beneficio) => ({ tipo: 'salvezza', salvezza: 'tempra', valore: 2, ambito: 'uso_specifico', uso, condizione, beneficio });
const organici = [
  ...coppia({ id: 'filtro-respiratorio-impiantato', nome: 'Filtro respiratorio impiantato', famiglia: ORG, par: '§7.6', umn: [2, 1], costo: [4000, 6000], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 2000,
    note: `${frasi('+2 alle PS Tempra contro veleni e agenti patogeni inalati; richiede aria con ossigeno sufficiente.', 'Il filtro respiratorio non fornisce ossigeno, respirazione subacquea o protezione nel vuoto.')} ${org}`,
    breve: '+2 alle PS Tempra contro veleni e agenti patogeni inalati.',
    effetti: [tempra('contro veleni e agenti patogeni inalati', '+2 alle PS Tempra contro veleni e agenti patogeni inalati; richiede aria con ossigeno sufficiente.', 'filtro_respiratorio')] }),
  ...coppia({ id: 'filtro-ematico', nome: 'Filtro ematico', famiglia: ORG, par: '§7.6', umn: [2, 1], costo: [5000, 7500], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 2000,
    note: `${frasi('+2 alle PS Tempra contro i veleni, indipendentemente dalla via d’ingresso nell’organismo.', 'Il filtro ematico non cura automaticamente un avvelenamento in corso e non protegge in generale da malattie o Corruzione.')} ${org}`,
    breve: '+2 alle PS Tempra contro i veleni.',
    effetti: [tempra('contro i veleni', '+2 alle PS Tempra contro i veleni, indipendentemente dalla via d’ingresso nell’organismo.', 'filtro_ematico')] }),
  ...coppia({ id: 'termoregolatore-interno', nome: 'Termoregolatore interno', famiglia: ORG, par: '§7.6', umn: [2, 1], costo: [6000, 9000], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 2000,
    note: `${frasi('+2 alle PS Tempra contro caldo e freddo ambientali.', 'Il termoregolatore non riduce danni di Fuoco o Gelo e non elimina il bisogno di acqua, riposo o protezione ambientale.')} ${org}`,
    breve: '+2 alle PS Tempra contro caldo e freddo ambientali.',
    effetti: [tempra('contro caldo e freddo ambientali', '+2 alle PS Tempra contro caldo e freddo ambientali.', 'termoregolazione')] }),
  ...coppia({ id: 'rinforzo-sottocutaneo', nome: 'Rinforzo sottocutaneo', famiglia: ORG, par: '§7.6', umn: [4, 2], costo: [10000, 15000], rep: 'RA', qualita: 'Rara', pi: 6, installazione: 2000,
    note: `${frasi('Una rete protettiva sotto la pelle concede +1 AR non magica, anche senza armatura indossata.', 'Il rinforzo sottocutaneo si somma all’AR di armatura, rinforzo indossato e scudo. Non occupa il posto del rinforzo dell’armatura e non ne cambia categoria, requisito FOR o penalità. Si beneficia di un solo rinforzo sottocutaneo; la sua AR protegge dai danni Naturali e Magici, non dagli Eterei.')} ${org}`,
    breve: '+1 AR non magica, anche senza armatura.',
    effetti: [{ tipo: 'ar', valore: 1, ambito: 'generale', condizione: 'Una rete protettiva sotto la pelle concede +1 AR non magica, anche senza armatura indossata.', beneficio: 'rinforzo_sottocutaneo' }] }),
];

// --- §7.7 Coordinamento neurale ---------------------------------------------------------------------------
const COORD = 'Coordinamento neurale';
const coord = frasi('Tutti i modelli: Qualità Non comune, PS Integrità 12, 4 PI, REP Rara. Installazione: 2.000 cr per impianto. Usano la bioenergia del corpo, senza consumo da registrare. Funzionano autonomamente, senza richiedere l’Interfaccia neurale; i benefici sono passivi e non richiedono Azioni di attivazione.',
  'Le assistenze tecnologiche equivalenti non si sommano. Coordinatore offensivo e Assistenza offensiva dell’elmetto concedono complessivamente +1, non +2. Lo stesso criterio vale per Iniziativa e Difese.');
const DIFESA = '+1 VA a Parata e Schivata; inoltre +1 alla PS Riflessi usata per Elusione.';
const coordinamento = [
  ...coppia({ id: 'acceleratore-dei-riflessi', nome: 'Acceleratore dei riflessi', famiglia: COORD, par: '§7.7', umn: [2, 1], costo: [4000, 6000], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 2000,
    note: `${frasi('+1 Iniziativa, applicato quando viene determinata.', 'L’Acceleratore dei riflessi non concede Azioni aggiuntive e non impedisce automaticamente la Sorpresa.')} ${coord}`,
    breve: '+1 Iniziativa.',
    effetti: [{ tipo: 'iniziativa', valore: 1, ambito: 'generale', condizione: '+1 Iniziativa, applicato quando viene determinata.', beneficio: 'allerta_tattica' }] }),
  ...coppia({ id: 'coordinatore-offensivo', nome: 'Coordinatore offensivo', famiglia: COORD, par: '§7.7', umn: [4, 2], costo: [8000, 12000], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 2000,
    note: `${frasi('+1 VA alle Prove per colpire ravvicinate e a distanza, compresi attacchi senz’armi e armi da lancio.', 'Il Coordinatore offensivo migliora il tiro per colpire, senza aumentare danni o numero di attacchi. Si applica anche all’eventuale Prova separata per colpire con un Incantesimo, ma non alla Prova di Potere per lanciarlo.')} ${coord}`,
    breve: '+1 VA alle Prove per colpire.',
    effetti: [{ tipo: 'attacco', attacchi: 'tutti', valore: 1, ambito: 'generale', condizione: '+1 VA alle Prove per colpire ravvicinate e a distanza, compresi attacchi senz’armi e armi da lancio.', beneficio: 'assistenza_offensiva' }] }),
  ...coppia({ id: 'coordinatore-difensivo', nome: 'Coordinatore difensivo', famiglia: COORD, par: '§7.7', umn: [4, 2], costo: [8000, 12000], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 2000,
    note: `${frasi(DIFESA, 'Il Coordinatore difensivo si applica alle Difese consentite al personaggio, mantenendone costi e requisiti. Su Elusione vale soltanto il +1 alla PS Riflessi, una volta sola; non modifica le altre PS Riflessi.')} ${coord}`,
    breve: '+1 VA a Parata e Schivata; +1 alla PS Riflessi per Elusione.',
    effetti: [
      va('Difese', 1, 'generale', null, DIFESA, { beneficio: 'assistenza_difensiva' }),
      { tipo: 'salvezza', salvezza: 'riflessi', valore: 1, ambito: 'uso_specifico', uso: 'Elusione', condizione: DIFESA, beneficio: 'assistenza_difensiva_elusione' },
    ] }),
];

// --- §7.8 Comunicazione e strumenti incorporati -----------------------------------------------------------
const COM = 'Comunicazione e strumenti incorporati';
const com = frase('Tutti i modelli: Qualità Non comune, PS Integrità 12, 4 PI, REP Non comune. Installazione: 1.000 cr per impianto. Nessun consumo energetico o autonomia da registrare.');
const comunicazione = [
  ...coppia({ id: 'comunicatore-impiantato', nome: 'Comunicatore impiantato', famiglia: COM, par: '§7.8', umn: [2, 1], costo: [4000, 6000], rep: 'NC', qualita: 'Non comune', pi: 4, installazione: 1000,
    note: `${frasi('Comunicazioni vocali entro 10 km, con ricevitore interno e microfono subvocale: si parla sottovoce senza impugnare dispositivi.', 'Comunicatore. Accendere, spegnere o cambiare canale richiede 1 AzP.')} ${com}`, breve: 'Comunicazioni vocali entro 10 km, senza impugnare dispositivi.' }),
  ...coppia({ id: 'registratore-audiovisivo-impiantato', nome: 'Registratore audiovisivo impiantato', famiglia: COM, par: '§7.8', umn: [2, 1], costo: [3000, 4500], rep: 'NC', qualita: 'Non comune', pi: 4, installazione: 1000,
    note: `${frasi('Registra immagini e suoni dal punto di vista del portatore; conserva file riproducibili o esportabili su un dispositivo compatibile.', 'Registratore. Avviare o interrompere una registrazione richiede 1 AzP.')} ${com}`, breve: 'Registra immagini e suoni dal punto di vista del portatore.' }),
  ...coppia({ id: 'microattrezzi-integrati', nome: 'Microattrezzi integrati', famiglia: COM, par: '§7.8', umn: [2, 1], costo: [3000, 4500], rep: 'NC', qualita: 'Non comune', pi: 4, installazione: 1000,
    note: `${frasi('Utensili retrattili nella mano o nell’avambraccio per piccoli interventi meccanici: strumenti Standard, modificatore 0.', 'Possono essere installati su un arto naturale; su una protesi sono un modulo aggiuntivo con propri UMN e PI.')} ${com}`, breve: 'Utensili retrattili: strumenti Standard, modificatore 0.' }),
];

// --- §7.9 Iniettori sanitari impiantati -------------------------------------------------------------------
const INI = 'Iniettori sanitari impiantati';
const ini = frasi('Installazione: 2.000 cr per impianto. Sono venduti senza cartucce. Il modello d’emergenza è completo: non si sommano prezzo e UMN del modello base. Non richiedono NEC o conteggio dell’autonomia; si registrano soltanto le cartucce.',
  'Resta una sola somministrazione rapida per destinatario e Round, condivisa con UMC, iniettori esterni e altri dispositivi sanitari (§6.2).');
const iniettori = [
  ...coppia({ id: 'iniettore-sanitario-impiantato', nome: 'Iniettore sanitario impiantato', famiglia: INI, par: '§7.9', umn: [2, 1], costo: [5000, 7500], rep: 'RA', qualita: 'Non comune', pi: 4, installazione: 2000,
    note: `${frase('Somministra al portatore una cartuccia scelta con 1 AzP, senza Prova e senza usare le mani. Richiede che il personaggio sia cosciente.')} ${ini}`, breve: 'Somministra una cartuccia con 1 AzP, senza mani; 5 cartucce.', extra: { cartucce: 5 } }),
  ...coppia({ id: 'iniettore-sanitario-d-emergenza', nome: 'Iniettore sanitario d’emergenza', famiglia: INI, par: '§7.9', umn: [4, 2], costo: [10000, 15000], rep: 'MR', qualita: 'Rara', pi: 6, installazione: 2000,
    note: `${frase('Comprende la funzione precedente e somministra automaticamente un’emostatica o una coagulante quando il portatore subisce Sanguinamento.')} ${ini}`, breve: 'Come l’iniettore impiantato; emostatica o coagulante automatica contro il Sanguinamento.', extra: { cartucce: 5 } }),
];

// --- §7.10 Processore neurale di Abilità e chip -----------------------------------------------------------
const PROC = 'Processore neurale di Abilità';
const proc = frasi('Un impianto cerebrale con un alloggiamento per chip intercambiabili. Un chip concede un bonus temporaneo al VA di una sola Abilità: non ne modifica il grado e non assegna Talenti, capacità, conoscenze segrete o autorizzazioni.',
  'Installazione: 2.000 cr. Il prezzo non comprende chip. Alimentazione tramite bioenergia, senza consumo da registrare. Inserire o cambiare chip non comporta ulteriori costi UMN.',
  'Il Processore consente una sola attivazione ogni 24 ore, conteggiate dal momento dell’attivazione precedente. Cambiare chip o interrompere anticipatamente l’effetto non azzera il conteggio. Trascorse le 24 ore torna utilizzabile, senza condizioni legate al riposo.',
  'A 0 PI il Processore interrompe l’effetto e non può attivare chip finché non viene riparato.');
const processore = coppia({ id: 'processore-neurale-di-abilita', nome: 'Processore neurale di Abilità', famiglia: PROC, par: '§7.10', umn: [4, 2], costo: [8000, 12000], rep: 'RA', qualita: 'Rara', pi: 4, installazione: 2000,
  note: proc, breve: 'Alloggia un chip: +2 o +4 VA a un’Abilità per 30 minuti, una volta ogni 24 ore.', extra: { innesto: 'processore' } });
const ABILITA_CHIP = ['Atletica', 'Furtività', 'Percezione', 'Pilotare', 'Cultura', 'Intrattenere', 'Medicina', 'Oratoria', 'Raggirare', 'Scienza', 'Sopravvivenza', 'Tecnologia'];
const chipNota = frasi('Un solo chip attivo alla volta. Attivarlo richiede 1 AzP e il bonus dura 30 minuti consecutivi. Sostituirlo con un ricambio accessibile richiede 1 AzP; rimuoverlo interrompe l’effetto e fa perdere la durata restante.',
  'È utilizzabile da tutti i personaggi, compresi quelli con Addestramento Combattente. Il bonus è escluso dalle Prove di combattimento, dagli Incantesimi, dalle Risorse Interiori e da qualsiasi applicazione magica, compresa la Sintonizzazione. Non si applica ad attacchi, Difese o Manovre di combattimento.',
  'I chip sono riutilizzabili e non si consumano.');
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
const chip = ABILITA_CHIP.flatMap((ab) => [['assistenza', 'Assistenza', 2, 1000, 'RA', '+2 VA all’Abilità indicata'], ['competenza-avanzata', 'Competenza avanzata', 4, 4000, 'MR', '+4 VA all’Abilità indicata']]
  .map(([id, nome, valore, costo, rep, cond]) => ({
    id: `chip-${id}-${slug(ab)}`, nome: `Chip ${nome}: ${ab}`, tipo: 'altro', catalogo: 'Commerciale', famiglia: 'Chip del Processore', nomi_alternativi: [],
    note_manuale: `${frase(cond)} (${ab}). ${chipNota}`, paragrafo: '§7.10', versione_manuale: VERSIONE, reperibilita: rep, costo,
    // ipotesi H7: effetto situazionale (acceso al tavolo per i 30 minuti), solo con un Processore installato
    richiede_innesto: 'processore', proprieta: [], effetto_breve: `+${valore} VA a ${ab} per 30 minuti, con il Processore neurale.`,
    effetti: [{ abilita: ab, valore, ambito: 'situazionale', condizione: frase(cond), beneficio: 'chip_processore', fonte: 'Equipaggiamento §7.10' }],
  })));

const oggetti = [...interfaccia, ...sensoriali, ...arti, ...organici, ...coordinamento, ...comunicazione, ...iniettori, ...processore, ...chip];
for (const o of oggetti) if (o.tipo === 'impianto') o.note_manuale = `${o.note_manuale} ${UMANITA_71} ${INSTALLAZIONE_71}`;
salva('data/equipaggiamento/impianti.json', {
  versione_manuale: VERSIONE,
  fonte: 'Manuale dell’Equipaggiamento 0.5, cap. 7 Dispositivi specialistici (Google Doc del 01/10/2026); Umanità: Manuale del Giocatore 0.45, §5.21',
  _nota: 'Generato da tools/lotti/lotto_equipaggiamento_07.mjs (docs/ricognizione-cibernetica.md). Tipo «impianto»: stati «installato» (effetti attivi, costo UMN registrato in scelte.umanita, src/umanita.js) e «zaino» (posseduto, non installato). Standard nel catalogo Commerciale, CYBERTRONIC nel catalogo Cybertronic (metà UMN, prezzo maggiore). «installazione_costo»: servizio da pagare a parte (§7.1). I chip (tipo «altro») contano solo con un Processore installato («richiede_innesto»). Effetti nello schema di docs/effetti-oggetti.md; «beneficio» per i benefici equivalenti che non si sommano (§7.1, «Cumulo»).',
  oggetti,
});

// --- indice: file nuovo e rif sostituiti -------------------------------------------------------------------
const indice = leggi('data/equipaggiamento/index.json');
indice.file = indice.file.filter((f) => f.id !== 'impianti');
indice.file.splice(indice.file.findIndex((f) => f.id === 'strumenti_professionali') + 1, 0,
  { id: 'impianti', file: 'impianti.json', descrizione: 'Impianti cibernetici e chip del Processore neurale (Equipaggiamento 0.5, cap. 7)' });
indice.rif_sostituiti = {
  ...(indice.rif_sostituiti ?? {}),
  // Armamenti §7.15.1 e Equipaggiamento §7.3: lo stesso impianto; in uso = installato
  'corredi_dispositivi:interfaccia-neurale-cybertronic': { rif: 'impianti:interfaccia-neurale-cybertronic', stati: { in_uso: 'installato', zaino: 'zaino' } },
  // lotto 2: celle del catalogo NEC (Equipaggiamento §5.4.4) al posto dei doppioni del lotto 1
  'accessori_armi:batteria-di-servizio': { rif: 'nec:verde-compatto' },
  'accessori_armi:nec-verde-standard-di-ricambio': { rif: 'nec:verde-standard' },
  'esplorazione:cartuccia-di-combustibile': { rif: 'nec:rosso-standard' },
  // Armamenti 0.58, §7.20.6: i serbatoi sono pacchi NEC
  'munizioni:serbatoio-vuoto-nemesis-214': { rif: 'munizioni:pacco-nec-nemesis-214' },
  'munizioni:serbatoio-vuoto-del-lanciafiamme-commerciale': { rif: 'munizioni:pacco-nec-lanciafiamme-commerciale' },
  'munizioni:serbatoio-vuoto-eruptor': { rif: 'munizioni:pacco-nec-eruptor' },
  'munizioni:serbatoio-vuoto-purifier': { rif: 'munizioni:pacco-nec-purifier' },
  'munizioni:serbatoio-vuoto-gehemmapuker': { rif: 'munizioni:pacco-nec-gehemmapuker' },
};
indice._nota_rif_sostituiti = 'Voci di catalogo uscite perché sostituite da un’altra scheda: al caricamento di un personaggio (src/character.js → normalizza) la voce passa al rif nuovo, con lo stato tradotto se indicato.';
salva('data/equipaggiamento/index.json', indice);

// l'Interfaccia degli Armamenti esce dai corredi (stesso impianto del §7.3)
const corredi = leggi('data/equipaggiamento/corredi_dispositivi.json');
corredi.oggetti = corredi.oggetti.filter((o) => o.id !== 'interfaccia-neurale-cybertronic');
salva('data/equipaggiamento/corredi_dispositivi.json', corredi);

// esoscheletri: proprietà equivalenti con le stesse chiavi di beneficio (§7.1, «Cumulo»)
const arm = leggi('data/equipaggiamento/armature_corporative.json');
let chiavi = 0;
for (const o of arm.oggetti) for (const e of o.effetti ?? []) {
  const p = String(e.proprieta ?? '');
  const k = p.startsWith('Assistenza muscolare') ? (e.tipo === 'caratteristica' ? 'assistenza_muscolare_for' : 'assistenza_muscolare_atletica')
    : p.startsWith('Colpo assistito') ? 'colpo_assistito' : p.startsWith('Termoregolazione') ? 'termoregolazione' : null;
  if (k && e.beneficio !== k) { e.beneficio = k; chiavi++; }
}
salva('data/equipaggiamento/armature_corporative.json', arm);

// --- regole.json → umanita, impianti (testo dopo «nec») ----------------------------------------------------
const FASCE = [[19, 20, 'Umano', 0, 0, 0], [16, 18, 'Potenziato', 0, -1, 0], [13, 15, 'Potenziato', -1, -2, -1], [10, 12, 'Cyborg', -2, -3, -2],
  [7, 9, 'Cyborg', -4, -4, -4], [4, 6, 'Transumano', -8, -5, -6], [1, 3, 'Transumano', -15, -7, -8], [0, 0, 'Macchina', -20, -10, -10]];
const umanita = {
  paragrafo: 'Giocatore §5.21 (0.45, 01/10/2026); Equipaggiamento §7.1',
  iniziale: 20, massimo: 20, minimo: 0,
  fasce: FASCE.map(([min, max, condizione, pm, ps, sint]) => ({ min, max, condizione, pm_massimi: pm, ps_magia_corruzione: ps, sintonizzazione: sint })),
  pm_minimo: 1, sintonizzazione_minimo: 0,
  zero: { risorse_interiori: false },
  frasi: [
    'Il valore va da 0 a 20; un essere umano non modificato parte normalmente da UMN 20.',
    'Si applica soltanto la fascia del valore attuale, senza sommare i modificatori delle fasce precedenti.',
    'La riduzione dovuta all’Umanità non può portare i PM Massimi sotto 1.',
    'La penalità alla Salvezza si applica esclusivamente alle PS di Magia contro la Corruzione.',
    'La riduzione indicata nella tabella si applica alla Capacità complessiva di Sintonizzazione, inclusi i bonus dei Talenti, fino a un minimo di 0.',
    'A UMN 0 il personaggio non può utilizzare Risorse Interiori, comprese le Tecniche che ne dipendono, salvo un’eccezione espressamente prevista.',
    'Il costo UMN si applica all’installazione, secondo il Manuale del Giocatore, §5.21.',
    'Spegnimento, rottura o rimozione di un chip non restituiscono Umanità. Il recupero di UMN richiede una procedura che ne specifichi condizioni e punti restituiti; le cure e le riparazioni ordinarie non la recuperano automaticamente.',
  ].map(frase),
  _nota: 'Umanità del personaggio (src/umanita.js): iniziale − costi UMN registrati all’installazione degli impianti (scelte.umanita.perdite: restano anche se l’impianto si toglie o si rompe, §7.1) + recuperi concessi dal Direttore (scelte.umanita.recuperi; nessuna procedura ancora descritta, A.70). Fasce del §5.21: modificatori ai PM Massimi (minimo 1, solo per chi ha PM), alla sola PS di Magia contro la Corruzione e alla Capacità di Sintonizzazione (minimo 0); a 0 niente Risorse Interiori. Ipotesi in docs/ricognizione-cibernetica.md (H1–H2, A.69–A.70).',
};
const impianti = {
  paragrafo: 'Equipaggiamento §7.1–7.10 (0.5, 01/10/2026)',
  stato_installato: 'installato',
  installazione: { struttura: 'struttura medica attrezzata', prova: false, frasi: [INSTALLAZIONE_71] },
  chip: { durata_minuti: 30, intervallo_ore: 24, attivi_massimo: 1, innesto: 'processore', abilita: ABILITA_CHIP },
  frasi: [
    'I benefici tecnologici equivalenti sulla stessa Prova o sullo stesso danno non si sommano: si applica il maggiore, anche con elmetti ed esoscheletri.',
    'Gli impianti di questo catalogo non richiedono NEC, ricariche o conteggio dell’autonomia.',
  ].map(frase),
  _nota: 'Impianti cibernetici (data/equipaggiamento/impianti.json): tipo «impianto», stato «installato» (effetti come un oggetto in uso) o «zaino» (posseduto). Installare e togliere sono cambi di stato fatti a mano (ipotesi H3, A.69); il costo d’installazione si paga a parte. Gli impianti installati non pesano nel carico (fanno parte del corpo). I chip contano solo con un Processore installato; un solo chip attivo: con più chip accesi l’app avvisa (ipotesi H7).',
};
const pr = new URL('data/regole.json', RADICE);
let testo = readFileSync(pr, 'utf8');
const eol = testo.includes('\r\n') ? '\r\n' : '\n';
testo = testo.replace(/\r\n/g, '\n');
for (const k of ['umanita', 'impianti']) testo = testo.replace(new RegExp(`\\n {2}"${k}": \\{\\n[\\s\\S]*?\\n {2}\\},(?=\\n)`), '');
const blocco = (k, v) => `  "${k}": ${JSON.stringify(v, null, 2).replace(/\n/g, '\n  ')},`;
const dopoNec = testo.indexOf('\n  },\n', testo.indexOf('\n  "nec": {')) + '\n  },'.length;
testo = `${testo.slice(0, dopoNec)}\n${blocco('umanita', umanita)}\n${blocco('impianti', impianti)}${testo.slice(dopoNec)}`;
// la tab Cibernetica non è più «in attesa del manuale»
const j = JSON.parse(testo);
if (j.tab_in_arrivo?.cibernetica) testo = testo.replace(/\n {4}"cibernetica": \{\n[\s\S]*?\n {4}\},(?=\n)/, '');
JSON.parse(testo);
if (scrivi) writeFileSync(pr, testo.replace(/\n/g, eol));

console.log(`Impianti: ${oggetti.filter((o) => o.tipo === 'impianto').length} (${oggetti.filter((o) => o.effetti && o.tipo === 'impianto').length} con effetti), chip: ${chip.length}; beneficio sugli esoscheletri: ${chiavi}; regole umanita e impianti${scrivi ? ': scritto' : ' (prova: --scrivi)'}`);
