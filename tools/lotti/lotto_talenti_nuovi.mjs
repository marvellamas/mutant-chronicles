// Talenti nuovi, lotto 1 (25/10/2026): categorie, Talenti accorpati e cambiati, Specializzazioni per Classe.
// Fonte: «Nuova progressione di Talenti Specializzazioni e Maestrie», v1.0 del 7/10/2026 (PDF in docs/Talenti-nuovi/,
// testo in docs/talenti-nuovi-v1.0.txt), che sui Talenti vale sul Manuale del Giocatore (docs/manuali-drive.md,
// «Regola di precedenza»). Ricognizione: docs/talenti-nuovi-ricognizione-2026-10-25.md.
//
// Che cosa fa (idempotente):
//  - data/talenti_liberi.json: «categoria» a ogni voce (talento_libero | maestria | superato), «sostituito_da» sulle
//    voci superate, sette voci nuove (tre Maestrie accorpate e le nuove versioni di quattro Talenti cambiati), la
//    condizione di prerequisito di Arti Marziali Migliorate;
//  - data/specializzazioni.json: «categoria», Sport, gli elenchi per Classe, i gruppi e gli accessi da Talento;
//  - data/regole.json: progressione delle tre categorie, nomi dei Talenti delle Raffiche;
//  - data/equipaggiamento/munizioni.json: Ricarica Esperta accanto a Ricarica Rapida e Ricarica Migliorata.
// Le voci di oggi NON cambiano id né effetti: i personaggi salvati con i Talenti di prima (regime «vecchio») si
// calcolano come prima. Le voci nuove hanno «solo_regime_nuovo»: non si offrono ai personaggi del regime vecchio.
//
// Uso: node tools/lotti/lotto_talenti_nuovi.mjs           (controlla, non scrive)
//      node tools/lotti/lotto_talenti_nuovi.mjs --scrivi
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../', import.meta.url);
const leggi = (p) => JSON.parse(readFileSync(new URL(p, R), 'utf8'));
const scrivi = (p, o) => writeFileSync(new URL(p, R), `${JSON.stringify(o, null, 2)}\n`);
const SCRIVI = process.argv.includes('--scrivi');
const FONTE = 'Talenti, Specializzazioni e Maestrie v1.0 (07/10/2026)';
const SEZ = 'tn';

const TL = ['buona-costituzione', 'struttura-robusta', 'duro-a-morire', 'guarigione-migliorata', 'ambidestro', 'mulo-da-soma', 'mezzofondista', 'scattante', 'movimento-fluido', 'autosufficiente', 'iniziativa-migliorata', 'sempre-allerta', 'sonno-leggero', 'visione-perfetta', 'mani-abili', 'diligente', 'lettura-veloce', 'poliglotta', 'controllo-del-fallimento', 'successo-magistrale-migliorato', 'prova-di-caratteristica-migliorata', 'prova-salvezza-migliorata', 'resistenza-ai-veleni', 'resistenza-alle-malattie', 'resistenza-all-affaticamento', 'resistenza-alla-paura', 'resistenza-al-controllo-mentale', 'resistenza-alla-corruzione', 'arti-marziali', 'risorse-interiori', 'tecniche-interiori-supplementari', 'potere-mistico', 'recupero-mistico', 'recupero-meditativo', 'usufruitore-di-magia', 'potenziale-mistico-migliorato', 'incrementare-incantesimi', 'contromagia', 'ritualista-minore'];
// Maestrie di oggi che restano uguali (gli id che non cambiano)
const MA_UGUALI = ['attivazione-tempestiva', 'carica-migliorata', 'imboscata-migliorata', 'incalzare-migliorato', 'movimento-evasivo-migliorato', 'ritirata-migliorata', 'pistolero', 'duellante', 'schermidore', 'difesa-con-due-armi', 'fuoco-di-soppressione-migliorato', 'tiro-a-bruciapelo-migliorato', 'tiro-rapido-migliorato', 'tiro-mirato-migliorato', 'tiro-a-lunga-distanza', 'mira-rapida', 'fuoco-di-precisione', 'tiratore-imboscato', 'affondo-migliorato', 'apertura-tattica', 'colpo-di-opportunita-istintivo', 'colpo-mirato-migliorato', 'combattere-alla-cieca', 'disarmare-migliorato', 'sbilanciare-migliorato', 'spazzata-migliorata', 'stordire-migliorato', 'copertura-migliorata', 'copertura-tattica', 'parata-a-distanza', 'parata-istintiva', 'parata-migliorata', 'parata-multipla', 'schivata-istintiva', 'schivata-migliorata', 'schivata-multipla', 'ingegneria-d-emergenza', 'commerciante-esperto', 'controllo-d-emergenza', 'inseguimento', 'pilotaggio-acrobatico', 'meditazione-migliorata', 'meditazione-estesa', 'lancio-in-combattimento', 'focalizzazione-migliorata', 'concentrazione-migliorata', 'concentrazione-operativa', 'escludere-la-componente-somatica', 'escludere-l-invocazione', 'escludere-il-focus', 'contromagia-migliorata', 'contromagia-universale', 'conversione-migliorata', 'incantesimi-ampliati', 'incantesimi-estesi', 'incantesimi-proiettati', 'incantesimi-plurimi', 'incantesimi-intensificati', 'anticipazione-migliorata', 'incantesimi-da-lancio', 'incantesimi-inarrestabili', 'incantesimi-massimizzati', 'magia-occultata', 'manifestazioni-occultate', 'ritualista-maggiore'];
// voci di oggi superate dal file: accorpate, cambiate (la versione nuova è una voce a sé) o spostate
const SUPERATI = {
  'estrazione-rapida': 'preparazione-rapida', 'cambio-rapido': 'preparazione-rapida', 'imbracciatura-rapida': 'preparazione-rapida',
  'ricarica-rapida': 'ricarica-esperta', 'ricarica-migliorata': 'ricarica-esperta',
  'raffica-breve-migliorata': 'raffiche-migliorate', 'raffica-media-migliorata': 'raffiche-migliorate', 'raffica-lunga-migliorata': 'raffiche-migliorate',
  'tiro-ravvicinato-istintivo': 'maestria-tiro-ravvicinato-migliorato', 'tiro-ravvicinato-migliorato': 'maestria-tiro-ravvicinato-migliorato',
  'immobilizzare-istintivo': 'maestria-immobilizzare-migliorato', 'immobilizzare-migliorato': 'maestria-immobilizzare-migliorato',
  hacker: 'maestria-hacker', 'arti-marziali-migliorate': 'maestria-arti-marziali-migliorate',
  sport: 'specializzazione-sport',
};

const t = leggi('data/talenti_liberi.json');
const per = new Map(t.talenti.map((x) => [x.id, x]));
const vecchio = (id) => { const x = per.get(id); if (!x) throw new Error(`Talento ${id} non trovato`); return x; };

const NUOVI = [
  {
    id: 'preparazione-rapida', nome: 'Preparazione Rapida', categoria: 'maestria', sezione: SEZ, tipo: 'passivo', prerequisiti: [], molteplicita: 'una', parametro: null,
    testo: 'Sostituisce Estrazione Rapida, Cambio Rapido e Imbracciatura Rapida. Una volta per Round, durante la propria Iniziativa, permette di scegliere una sola operazione gratuita: estrarre un’arma accessibile; riporre l’arma utilizzata ed estrarne un’altra accessibile; imbracciare l’arma.\nL’utilizzo è condiviso fra le tre opzioni. L’operazione non impone la penalità per incorporarla nell’attacco; restano accessibilità, mani e impugnatura richieste. L’Imbracciatura può essere persa normalmente e non concede il danno aggiuntivo di Postura d’Assedio.',
    // come Imbracciatura Rapida: l'imbracciatura gratuita in «Attacca!» (l'uso per Round è condiviso con estrarre e cambiare arma)
    effetti: structuredClone(vecchio('imbracciatura-rapida').effetti),
  },
  {
    id: 'ricarica-esperta', nome: 'Ricarica Esperta', categoria: 'maestria', sezione: SEZ, tipo: 'passivo', prerequisiti: [], molteplicita: 'una', parametro: null,
    testo: 'Sostituisce Ricarica Rapida e Ricarica Migliorata. Una volta per Round, durante la propria Iniziativa, permette una singola operazione di ricarica gratuita che normalmente richiede 1 AzM oppure 1 AzP.\nQuando l’arma si ricarica inserendo singole munizioni, ogni operazione può inserirne fino a tre, entro la capienza: vale anche per quella gratuita. Se l’operazione è incorporata nell’attacco restano il -4 VA e il limite di una sola operazione incorporata. Servono munizioni e mani disponibili. Non riduce procedure che richiedono più Azioni per una singola munizione e non modifica conversioni di PM o ricariche mistiche. Preparazione Rapida e Ricarica Esperta hanno utilizzi distinti.\nNell’app (25/10/2026): finché Davide non risponde alla A.182 vale la decisione approvata A.135 (decisione 139): con questo Talento un’operazione a inserimento singolo inserisce fino a 4 cartucce, come con Ricarica Migliorata (senza, 2), non «fino a tre».',
    nota_app: 'A.182 aperta: il file dice «fino a tre» munizioni per operazione, la decisione 139 (A.135) dice 4 cartucce per AzP con Ricarica Migliorata. Si tiene la decisione approvata (data/equipaggiamento/munizioni.json → ricarica).',
  },
  {
    id: 'raffiche-migliorate', nome: 'Raffiche Migliorate', categoria: 'maestria', sezione: SEZ, tipo: 'passivo', prerequisiti: [], molteplicita: 'una', parametro: null,
    testo: 'Sostituisce Raffica Breve, Media e Lunga Migliorata. Migliora di 2 VA la modalità impiegata: Raffica Breve +4 VA, Media 0, Lunga -4 VA. Restano l’Azione Principale, le munizioni e i colpi della modalità. L’arma deve possederla. Il beneficio vale anche con manovre compatibili e con la prova usata dall’Artigliere per Raffica Estesa; Fuoco di Soppressione Migliorato rimane separato.',
    effetti: { attacco_distanza: { modalita: { RB: { va: 4 }, RM: { va: 0 }, RL: { va: -4 } } } },
  },
  {
    id: 'maestria-tiro-ravvicinato-migliorato', nome: 'Tiro Ravvicinato Migliorato', categoria: 'maestria', sezione: SEZ, tipo: 'passivo', prerequisiti: [], molteplicita: 'una', parametro: null,
    testo: 'Riunisce Tiro Ravvicinato Istintivo e Migliorato. Riduce di 2 la penalità alla prova: Armi leggere da -2 a 0 VA, Armi medie da -4 a -2 VA. Porta inoltre il bonus al danno da +3 a +5, prima dell’Armatura. Restano bersaglio entro 3 Q, arma leggera o media, Tiro Singolo o Raffica Breve e costi ordinari. Il bonus al danno non si somma al moltiplicatore di Tiro a Bruciapelo.',
    effetti: { attacco_distanza: { ravvicinato: { ...vecchio('tiro-ravvicinato-istintivo').effetti.attacco_distanza.ravvicinato, ...vecchio('tiro-ravvicinato-migliorato').effetti.attacco_distanza.ravvicinato } } },
  },
  {
    id: 'maestria-immobilizzare-migliorato', nome: 'Immobilizzare Migliorato', categoria: 'maestria', sezione: SEZ, tipo: 'passivo', prerequisiti: [], molteplicita: 'una', parametro: null,
    testo: 'Riunisce Immobilizzare Istintivo e Migliorato. Una presa iniziale senz’armi riuscita infligge anche il normale danno senz’armi, con l’AR pertinente. Il danno si applica una volta e non si ripete mantenendo la presa. Le prove del bersaglio per liberarsi dalla propria Immobilizzazione subiscono -2 VA. Restano opposizione, Azioni e requisiti della manovra o dell’arma compatibile.',
    effetti: { attacco_ravvicinato: { ...vecchio('immobilizzare-istintivo').effetti.attacco_ravvicinato, ...vecchio('immobilizzare-migliorato').effetti.attacco_ravvicinato } },
  },
  {
    id: 'maestria-hacker', nome: 'Hacker', categoria: 'maestria', sezione: SEZ, tipo: 'passivo', prerequisiti: [], molteplicita: 'una', parametro: null,
    testo: 'Diventa una Maestria passiva, acquisibile una sola volta, senza prerequisiti aggiuntivi. Concede sempre +2 VA alle prove di Tecnologia per intrusione informatica o sorveglianza elettronica. Il precedente limite di un utilizzo per sessione per ciascun sistema viene eliminato.\nQuando pertinente, si somma a Specializzazione in Informatica per +4 complessivo. Restano prove, strumenti, accessi e condizioni dell’attività; il bonus non garantisce il successo e non autorizza automaticamente nuovi tentativi.',
    effetti: { valori: [{ abilita: 'Tecnologia', valore: 2, ambito: 'uso_specifico', uso: 'intrusione informatica e sorveglianza elettronica', condizione: 'Concede sempre +2 VA alle prove di Tecnologia per intrusione informatica o sorveglianza elettronica.', fonte: FONTE, fonte_frase: 'talenti_nuovi' }] },
  },
  {
    id: 'maestria-arti-marziali-migliorate', nome: 'Arti Marziali Migliorate', categoria: 'maestria', sezione: SEZ, tipo: 'passivo', prerequisiti: ['capacita:arti_marziali_migliorate'], molteplicita: 'una', parametro: null,
    testo: 'Diventa una Maestria con requisito Arti Marziali oppure Addestramento al Combattimento Senz’Armi del Lottatore. Il requisito alternativo consente l’accesso e non assegna anche il dado di danno di Arti Marziali.\nRimane il +1 VA agli attacchi senz’armi e alle prove di Difese contro attacchi ravvicinati mentre si combatte senz’armi. La Maestria non concede da sola la possibilità di parare a mani nude.',
    effetti: {
      attacco_ravvicinato: structuredClone(vecchio('arti-marziali-migliorate').effetti.attacco_ravvicinato),
      valori: [{ ...vecchio('arti-marziali-migliorate').effetti.valori[0], condizione: 'Rimane il +1 VA agli attacchi senz’armi e alle prove di Difese contro attacchi ravvicinati mentre si combatte senz’armi.', fonte: FONTE, fonte_frase: 'talenti_nuovi' }],
    },
  },
];

// 1. talenti_liberi.json
const nuoviId = new Set(NUOVI.map((x) => x.id));
const conCategoria = t.talenti.filter((x) => !nuoviId.has(x.id)).map((x) => {
  const { categoria: _c, sostituito_da: _s, ...resto } = x;
  let categoria;
  if (SUPERATI[x.id]) categoria = 'superato';
  else if (TL.includes(x.id)) categoria = 'talento_libero';
  else if (MA_UGUALI.includes(x.id)) categoria = 'maestria';
  else throw new Error(`Talento senza categoria: ${x.id} (${x.nome})`);
  return { ...resto, categoria, ...(SUPERATI[x.id] ? { sostituito_da: SUPERATI[x.id] } : {}) };
});
for (const n of NUOVI) conCategoria.push({ ...n, solo_regime_nuovo: true, fonte_regole: 'talenti_nuovi' });
const conteggio = (c) => conCategoria.filter((x) => x.categoria === c).length;
const attesi = { talento_libero: 39, maestria: 72, superato: 15 };
for (const [c, n] of Object.entries(attesi)) if (conteggio(c) !== n) throw new Error(`${c}: ${conteggio(c)} invece di ${n}`);
t.talenti = conCategoria;
t.attesi = { ...Object.fromEntries(Object.entries(t.attesi).filter(([k]) => k !== SEZ)), [SEZ]: NUOVI.length };
t.attesi_categorie = { _nota: `Voci per categoria, controllate dal validatore (${FONTE}): 39 Talenti Liberi e 72 Maestrie; «superato» sono le voci di prima che il file accorpa, cambia o sposta, tenute per i personaggi salvati con i Talenti vecchi.`, ...attesi };
t.sezioni[SEZ] = {
  titolo: `Talenti riscritti (${FONTE})`,
  note: ['Voci nuove del file del 7/10/2026: le tre Maestrie che riuniscono più capacità e le nuove versioni di Tiro Ravvicinato Migliorato, Immobilizzare Migliorato, Hacker e Arti Marziali Migliorate. Le voci di prima restano con «categoria: superato» e «sostituito_da» per i personaggi salvati con i Talenti vecchi.'],
};
t.categorie = {
  _nota: `${FONTE}: tre categorie con acquisizioni separate (progressione in regole.json → avanzamento.progressione_talenti). «superato»: voce di prima, valida solo per i personaggi del regime vecchio.`,
  talento_libero: 'Talento Libero', maestria: 'Maestria', specializzazione: 'Specializzazione', superato: 'Superato',
};
t.condizioni_prerequisiti['capacita:arti_marziali_migliorate'] = {
  descrizione: 'Arti Marziali oppure Addestramento al Combattimento Senz’Armi del Lottatore',
  talenti: ['arti-marziali'],
  talenti_di_classe: ['Addestramento al Combattimento Senz’Armi'],
  fonte: `${FONTE}, Arti Marziali Migliorate: «Il requisito alternativo consente l’accesso e non assegna anche il dado di danno di Arti Marziali».`,
};
if (!t.versione_manuale.includes('Talenti v1.0')) t.versione_manuale = `${t.versione_manuale}; Talenti v1.0 del 07/10/2026`;

// 2. specializzazioni.json
const s = leggi('data/specializzazioni.json');
const idSpec = (nome) => {
  const x = s.specializzazioni.find((y) => y.nome.replace(/[’']/g, "'") === nome.replace(/[’']/g, "'"));
  if (!x && nome === 'Sport') return 'specializzazione-sport';
  if (!x) throw new Error(`Specializzazione sconosciuta: ${nome}`);
  return x.id;
};
const SPORT = {
  id: 'specializzazione-sport', nome: 'Sport', gruppo: 'operative_sociali_professionali', abilita: ['Atletica'],
  ambito: 'Passa fra le Specializzazioni e mantiene +3 VA a una sola disciplina sportiva scelta all’acquisizione. Il bonus vale per le prove di Atletica pertinenti anche fuori dalle competizioni, senza applicarsi ad attacchi, Difese o Prove Salvezza. Rimane acquisibile una sola volta. Se si applicano altre Specializzazioni, si usa il bonus migliore senza cumularle.',
  effetto: { va: 3 }, annotazione: 'disciplina sportiva scelta all’acquisizione', solo_regime_nuovo: true, fonte_regole: 'talenti_nuovi',
};
s.specializzazioni = s.specializzazioni.filter((x) => x.id !== SPORT.id).map((x) => ({ ...x, categoria: 'specializzazione' }));
s.specializzazioni.push({ ...SPORT, categoria: 'specializzazione' });
const GRUPPI = {
  ambienti: ['Ambienti Artici', 'Ambienti Forestali', 'Ambienti Desertici', 'Ambienti Urbani', 'Pianure', 'Sottosuolo', 'Ambienti Apocalittici'],
  veicoli: ['Veicoli Terrestri', 'Veicoli Marini', 'Veicoli Aerei', 'Veicoli Spaziali'],
  potere: ['Elementi', 'Cambiamento', 'Manifestazione', 'Psionica', 'Influenza', 'Sintonia', 'Esorcismo', 'Trascendenza', 'Incantamento'],
  occultismo: ['Alchimia', 'Misticismo', 'Oscura Simmetria'],
  artefatti: ['Armature Mistiche', 'Armi Mistiche', 'Batterie Mistiche', 'Accessori Mistici'],
  rituali: ['Cerimoniale', 'Controllo Rituale'],
  ravvicinate: ['Coltelli e Pugnali', 'Spade', 'Asce', 'Martelli', 'Mazze e Bastoni', 'Armi Inastate', 'Armi Flessibili', 'Armi da Pugno', 'Scudi', 'Armi a Sega'],
};
const RIMANDI = { 'tutti gli Ambienti': 'ambienti', 'tutti i Veicoli': 'veicoli', 'tutte le Specializzazioni di Occultismo': 'occultismo', 'tutte le Specializzazioni di Artefatti': 'artefatti', 'entrambe le Specializzazioni di Rituali': 'rituali', 'tutte le categorie Ravvicinate': 'ravvicinate' };
// gli elenchi come li scrive il file (pp. 7–9), una voce o un gruppo per elemento
const ELENCHI = {
  Agente: 'Pistole; Sicurezza; Spionaggio; Ricercare; Manipolazione; Falsificare; Informazione e Media; Relazioni Sociali; Oratoria; Informatica; Amministrazione; Gioco d’Azzardo',
  Cacciatore: 'Carabine; Fucili di Precisione; Fucili a Pallini e Doppiette; Archi e Balestre; Coltelli e Pugnali; Seguire Tracce; Ricercare; Sicurezza; tutti gli Ambienti; Resistenza; Erboristeria; Misticismo; Oscura Simmetria',
  Esploratore: 'tutti gli Ambienti; tutti i Veicoli; Acrobatiche; Resistenza; Sport; Ricercare; Seguire Tracce; Erboristeria; Astronavigazione; Strumentazione',
  Lestofante: 'Coltelli e Pugnali; Spade; Pistole; Manipolazione; Sicurezza; Spionaggio; Falsificare; Gioco d’Azzardo; Commercio; Relazioni Sociali; Acrobatiche; Ambienti Urbani; Informatica',
  Paramedico: 'Medicina Clinica; Chirurgia; Erboristeria; Strumentazione; Laboratorio; Cibernetica; Ricercare; Acrobatiche; Resistenza; Veicoli Terrestri; Veicoli Aerei; Ambienti Apocalittici',
  Artigliere: 'Pistole; Carabine; Fucili d’Assalto; Fucili di Precisione; Fucili a Pallini e Doppiette; Mitragliatori; Lanciagranate; Lanciarazzi; Armi al Plasma; Lanciafiamme; Armamenti e Protezioni; Strumentazione; Ricercare; Tattiche Militari',
  Assaltatore: 'tutte le categorie Ravvicinate; Pistole; Acrobatiche; Resistenza; Sport; Tattiche Militari',
  Incursore: 'Coltelli e Pugnali; Spade; Asce; Armi Inastate; Pistole; Armi da Lancio; Archi e Balestre; Granate; Sicurezza; Spionaggio; Acrobatiche; Manipolazione; Artificiere; Informatica; Ricercare',
  Lottatore: 'Armi da Pugno; Coltelli e Pugnali; Mazze e Bastoni; Scudi; Acrobatiche; Resistenza; Sport; Manipolazione; Ricercare; Medicina Clinica; Misticismo',
  Soldato: 'Pistole; Carabine; Fucili d’Assalto; Fucili di Precisione; Fucili a Pallini e Doppiette; Mitragliatori; Granate; Tattiche Militari; Resistenza; Oratoria; Armamenti e Protezioni; Strumentazione; Costruzioni; tutti gli Ambienti',
  Agricoltore: 'Attività Domestiche; Erboristeria; Veterinaria; Materie Scientifiche; Laboratorio; Veicoli Terrestri; Veicoli Marini; Meccatronica; Ambienti Forestali; Pianure; Artigianato; Commercio; Resistenza',
  Artigiano: 'Artigianato; Armamenti e Protezioni; Meccatronica; Costruzioni; Artificiere; Falsificare; Commercio; Arti e Spettacolo; Materie Scientifiche; Ricercare; Strumentazione',
  Operaio: 'Costruzioni; Meccatronica; Artigianato; Artificiere; Strumentazione; Veicoli Terrestri; Resistenza; Sport; Sicurezza; Ricercare; Armamenti e Protezioni',
  Pilota: 'tutti i Veicoli; Astronavigazione; Strumentazione; Meccatronica; Armamenti e Protezioni; Pistole; Ricercare; Acrobatiche; Informatica; Tattiche Militari',
  Tecnico: 'Meccatronica; Informatica; Strumentazione; Artificiere; Cibernetica; Laboratorio; Materie Scientifiche; Armamenti e Protezioni; Costruzioni; Sicurezza; Falsificare; Veicoli Terrestri; Veicoli Aerei; Veicoli Spaziali',
  Accademico: 'Materie Scientifiche; Studi Umanistici; Laboratorio; Astronavigazione; Arti e Spettacolo; Informazione e Media; Amministrazione; Tattiche Militari; Misticismo; Alchimia; Oscura Simmetria; Ricercare; Informatica',
  Amministrativo: 'Amministrazione; Commercio; Relazioni Sociali; Oratoria; Informazione e Media; Falsificare; Gioco d’Azzardo; Ricercare; Informatica; Studi Umanistici',
  Artista: 'Arti e Spettacolo; Oratoria; Informazione e Media; Relazioni Sociali; Manipolazione; Acrobatiche; Sport; Falsificare; Gioco d’Azzardo; Studi Umanistici; Informatica',
  Medico: 'Medicina Clinica; Chirurgia; Veterinaria; Cibernetica; Laboratorio; Erboristeria; Materie Scientifiche; Strumentazione; Ricercare; Alchimia',
  Predicatore: 'Oratoria; Relazioni Sociali; Studi Umanistici; Misticismo; Oscura Simmetria; Cerimoniale; Controllo Rituale; Accessori Mistici; Ricercare; Medicina Clinica',
  // p. 9: le cinque Classi taumaturgiche hanno sempre le nove di Potere, «oltre alle opzioni seguenti»
  Arcanista: 'tutte le Specializzazioni di Potere; tutte le Specializzazioni di Occultismo; tutte le Specializzazioni di Artefatti; entrambe le Specializzazioni di Rituali; Ricercare; Studi Umanistici',
  Custode: 'tutte le Specializzazioni di Potere; Coltelli e Pugnali; Spade; Asce; Martelli; Mazze e Bastoni; Armi Inastate; Armi Flessibili; Scudi; Armature Mistiche; Armi Mistiche; Acrobatiche; Resistenza; Ricercare; Misticismo; Oscura Simmetria',
  Invocatore: 'tutte le Specializzazioni di Potere; tutte le Specializzazioni di Occultismo; Armi da Lancio; Archi e Balestre; Armi Mistiche; Batterie Mistiche; Accessori Mistici; Ricercare; Oratoria',
  Mistico: 'tutte le Specializzazioni di Potere; Medicina Clinica; Chirurgia; Erboristeria; Laboratorio; Ricercare; Misticismo; Oscura Simmetria; Alchimia; Cerimoniale; Controllo Rituale; Accessori Mistici; Batterie Mistiche',
  Tecnomante: 'tutte le Specializzazioni di Potere; tutte le Specializzazioni di Artefatti; entrambe le Specializzazioni di Rituali; Meccatronica; Informatica; Cibernetica; Strumentazione; Laboratorio; Artificiere; Armamenti e Protezioni; Costruzioni; Materie Scientifiche; Pistole',
};
RIMANDI['tutte le Specializzazioni di Potere'] = 'potere';
const classi = leggi('data/classi.json').classi.map((c) => c.nome);
const perClasse = {};
for (const c of classi) {
  if (!ELENCHI[c]) throw new Error(`Classe senza elenco nel file: ${c}`);
  const voci = ELENCHI[c].split(';').map((x) => x.trim()).flatMap((x) => (RIMANDI[x] ? GRUPPI[RIMANDI[x]] : [x]));
  perClasse[c] = [...new Set(voci.map(idSpec))];
}
s.per_classe = { _nota: `${FONTE}, pp. 7–9: a ogni Grado si sceglie una Specializzazione non ancora posseduta dall’elenco della Classe appena aumentata. Gruppi già espansi (vedi «gruppi»).`, ...perClasse };
s.gruppi = { _nota: `${FONTE}, p. 9: i nomi dei gruppi abbreviano gli elenchi; con una scelta si acquisisce sempre una singola voce del gruppo.`, ...Object.fromEntries(Object.entries(GRUPPI).map(([k, v]) => [k, v.map(idSpec)])) };
s.accessi_da_talenti = [
  { _nota: `${FONTE}, p. 2: «Le nove Specializzazioni di Potere, anche se assenti dall’elenco della Classe aumentata».`, talenti: ['usufruitore-di-magia'], gruppo: 'potere' },
  { _nota: `${FONTE}, p. 2: «Cerimoniale e Controllo Rituale, anche se assenti dall’elenco della Classe aumentata».`, talenti: ['ritualista-minore', 'ritualista-maggiore'], gruppo: 'rituali' },
];
s.attesi = { _nota: `${FONTE}: «Catalogo complessivo: 86 Specializzazioni».`, specializzazioni: 86 };
if (s.specializzazioni.length !== 86) throw new Error(`Specializzazioni: ${s.specializzazioni.length}`);
const usate = new Set(Object.values(perClasse).flat());
const fuori = s.specializzazioni.filter((x) => !usate.has(x.id)).map((x) => x.nome);
if (fuori.length) throw new Error(`Specializzazioni in nessun elenco: ${fuori.join(', ')}`);
if (!s.versione_manuale.includes('Talenti v1.0')) s.versione_manuale = `${s.versione_manuale}; Talenti v1.0 del 07/10/2026`;

// 3. regole.json
const r = leggi('data/regole.json');
r.avanzamento.progressione_talenti = {
  _nota: `${FONTE}, p. 1: «Si ottiene una scelta a ogni livello, per un totale di 20». Vale per i personaggi del regime nuovo (scelte.regimeTalenti = 2); quelli salvati prima restano con l’evento «talento_libero» dei livelli dispari, Specializzazioni comprese, finché non si migrano.`,
  talento_libero: [3, 5, 7, 9, 11, 13, 15, 17, 19],
  maestria: [2, 6, 10, 14, 18],
  specializzazione: [1, 4, 8, 12, 16, 20],
};
for (const m of ['RB', 'RM', 'RL']) {
  const M = r.modalita_di_fuoco[m].migliorata;
  if (!M.talento_regime_vecchio) M.talento_regime_vecchio = M.talento;
  M.talento = 'Raffiche Migliorate';
}

// 4. munizioni.json
const mu = leggi('data/equipaggiamento/munizioni.json');
const ins = mu.ricarica.inserimento_singolo.migliorata;
ins.talenti = [...new Set([...(ins.talenti ?? [ins.talento]), 'ricarica-esperta'])];
delete ins.talento;
ins._nota_talenti = 'Ricarica Migliorata (personaggi del regime vecchio) e Ricarica Esperta (Talenti v1.0): A.182 aperta, vale la decisione 139 (4 cartucce), non il «fino a tre» del file.';
const rr = mu.ricarica.ricarica_rapida;
rr.talenti = [...new Set([...(rr.talenti ?? [rr.talento]), 'ricarica-esperta'])];
delete rr.talento;

console.log(`Talenti: ${conteggio('talento_libero')} Talenti Liberi, ${conteggio('maestria')} Maestrie, ${conteggio('superato')} superati; Specializzazioni: ${s.specializzazioni.length}; Classi con elenco: ${Object.keys(perClasse).length}`);
for (const [c, l] of Object.entries(perClasse)) console.log(`  ${c}: ${l.length}`);
if (SCRIVI) {
  scrivi('data/talenti_liberi.json', t);
  scrivi('data/specializzazioni.json', s);
  scrivi('data/regole.json', r);
  scrivi('data/equipaggiamento/munizioni.json', mu);
  console.log('Scritto.');
} else console.log('(nessuna scrittura: --scrivi per applicare)');
