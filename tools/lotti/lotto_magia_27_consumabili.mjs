// Lotto «Magia §27» del 09/10/2026 (docs/diff-davide-2026-10-08.md, lotto 5): Artefatti consumabili del Manuale della
// Magia (Google Doc dell'08/10/2026 21:33, docs/manuali-txt/magia.md, §27):
//   - artefatti.json → «consumabili»: regole comuni (SnT 0, Cariche Esclusive sigillate, consumo al completamento,
//     supporto standard da 25 cr, PM = 3 × Grado + costo base, Magistrale) e la tabella dei costi per Grado I–VI con i
//     livelli della versione del §24.2;
//   - le sei pergamene del campionario (§27.3) come oggetti del catalogo, tipo «artefatto», famiglia «Consumabili»:
//     una scheda sola, che l'app mostra fra gli Artefatti e nell'Inventario (§27.4).
// Un dato che il manuale non dà resta vuoto con il TODO(Davide) (A.155: peso e dati fisici delle pergamene).
// Idempotente: rieseguito non cambia nulla.  node tools/lotti/lotto_magia_27_consumabili.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const F = fileURLToPath(new URL('../../data/equipaggiamento/artefatti.json', import.meta.url));
const j = JSON.parse(readFileSync(F, 'utf8'));
const V = 'Magia (Google Doc dell’08/10/2026, 21:33 UTC)';

j.sintonizzazione.tipologie.Consumabili = 'Artefatti consumabili monouso del Manuale della Magia, §27: SnT 0, Cariche Esclusive sigillate, si dissolvono dopo un solo utilizzo.';

j.consumabili = {
  versione_manuale: V,
  fonte: 'Magia §27 (Artefatti consumabili); livelli della versione e Grado dal §24.2',
  snt: 0,
  riserva: { tipo: 'cariche', alimentazione: 'esclusiva', sigillata: true },
  consumo: 'completamento',
  supporto: { nome: 'pergamena standard', costo: 25, costruzione: 'Semplice', ore: 4 },
  pm_lavoro_per_grado: 3,
  vendita_moltiplicatore: 2,
  magistrale: { dimezza: ['pm_lavoro', 'reagenti'], arrotondamento: 'eccesso' },
  gradi: [
    { grado: 'I', livelli: [1, 3], reagenti: 50, creazione: 75, vendita: 150, reperibilita: 'MR' },
    { grado: 'II', livelli: [4, 8], reagenti: 100, creazione: 125, vendita: 250, reperibilita: 'MR' },
    { grado: 'III', livelli: [9, 11], reagenti: 200, creazione: 225, vendita: 450, reperibilita: 'MR' },
    { grado: 'IV', livelli: [12, 14], reagenti: 400, creazione: 425, vendita: 850, reperibilita: 'LE' },
    { grado: 'V', livelli: [15, 17], reagenti: 800, creazione: 825, vendita: 1650, reperibilita: 'LE' },
    { grado: 'VI', livelli: [18, 18], reagenti: 1600, creazione: 1625, vendita: 3250, reperibilita: 'LE' },
  ],
  // Parte 2 (prompt 9): «Crea consumabile». Il §27.2 richiama le tre fasi del §24 con requisiti, penalità, tempi ed esiti
  // ordinari: progetto (Artefatti, §24.3), supporto (Tecnologia, §24.4), infusione (Rituali, §24.5–24.6); i reagenti e i PM
  // sono quelli del §27.2 (tabella «gradi» e pm_lavoro_per_grado). L'Officiante ha l'accesso di regole.json → rituali.
  supporti: [
    { id: 'pergamena', nome: 'Pergamena standard', costo: 25, complessita: 'Semplice' },
    { id: 'altro', nome: 'Altro supporto', costo: null, complessita: null, nota: 'Costo e complessità dipendono dalla costruzione effettiva (§27.2): li dà la ricetta o il preventivo di lavorazione (§24.4).' },
  ],
  creazione: {
    progetto: {
      abilita: 'Artefatti',
      gradi: [
        { grado: 'I', va: 0, ore: 4, risorse: 100 }, { grado: 'II', va: -2, ore: 8, risorse: 200 }, { grado: 'III', va: -4, ore: 16, risorse: 400 },
        { grado: 'IV', va: -6, ore: 32, risorse: 800 }, { grado: 'V', va: -8, ore: 64, risorse: 1600 }, { grado: 'VI', va: -10, ore: 128, risorse: 3200 },
      ],
      ore_al_giorno: 8,
      bonus_magistrale_tecnologia: 2,
      ritentare: { fallimento: { ore: 0.5, risorse: 1 }, maldestro: { ore: 1, risorse: 1 } },
      frase: 'Le risorse indicate vengono consumate anche se il progetto fallisce; non comprendono il supporto fisico, il Chroma o i reagenti d’infusione.',
      fonte: 'Magia §24.3',
    },
    costruzione: {
      abilita: 'Tecnologia',
      complessita: [
        { nome: 'Semplice', va: 0, ore: 4 }, { nome: 'Ordinaria', va: -2, ore: 8 },
        { nome: 'Complessa', va: -4, ore: 16 }, { nome: 'Molto complessa', va: -6, ore: 32 },
      ],
      bonus_magistrale_rituali: 2,
      ritentare: { fallimento: { ore: 0.5, materiali: 0.25 }, maldestro: { ore: 1, materiali: 1 } },
      fonte: 'Magia §24.4',
    },
    infusione: {
      abilita: 'Rituali',
      gradi: [
        { grado: 'I', va: 0, ore: 1 }, { grado: 'II', va: -2, ore: 2 }, { grado: 'III', va: -4, ore: 3 },
        { grado: 'IV', va: -6, ore: 4 }, { grado: 'V', va: -8, ore: 6 }, { grado: 'VI', va: -10, ore: 8 },
      ],
      esiti: {
        fallimento: { reagenti: true, pm: true, supporto: 'riutilizzabile' },
        maldestro: { reagenti: true, pm: true, supporto: 'perde 1 PI e va riparato prima di ritentare' },
        interrotta: { reagenti: true, pm: false, supporto: 'riutilizzabile' },
      },
      'TODO(Davide)': 'A.156: con un Fallimento o un Maldestro dell’infusione di un Consumabile i «PM consumati» del §24.5 sono tutti, compresi quelli che sarebbero stati sigillati, oppure solo i PM di lavoro (3 × Grado)? Intanto: tutti.',
      fonte: 'Magia §24.5, §24.6; §27.2',
    },
    'TODO(Davide)': 'A.157: le schede con «Rituale: non consentito» (Colpo Elementale, Cono Elementale e altre cinque) si possono infondere in un Consumabile? Intanto sì, con un avviso nel modulo.',
  },
  frasi: {
    snt: 'tutti i Consumabili qui descritti hanno SnT 0 e non richiedono sintonizzazione, anche se producono un effetto attivo.',
    cariche: 'Non si può estrarla, trasferirla, ricaricarla o sostituirla con PM personali o altre fonti.',
    utilizzatore: 'L’utilizzatore non deve conoscere l’Incantesimo né essere un Ritualista.',
    attivazione: 'L’attivazione è automatica e non richiede Prove di Potere o Rituali, salvo un’eccezione espressa dell’oggetto.',
    restano: 'Restano quelli dell’Incantesimo infuso il tempo di esecuzione, la gittata, i bersagli, la durata, la Concentrazione, le eventuali Prove per colpire, le Difese, le Salvezze, i cumuli e gli altri limiti.',
    interruzione: 'Se questa viene interrotta prima del completamento, non si produce l’effetto e l’oggetto resta disponibile.',
    consumo: 'Dopo il completamento l’oggetto è consumato anche se l’attacco manca o il bersaglio supera la Salvezza.',
    durata: 'Un effetto a durata prosegue dopo la dissoluzione del supporto; l’utilizzatore mantiene la Concentrazione quando richiesta.',
    supporto: 'La complessità e il costo di un supporto diverso dipendono dalla sua costruzione effettiva; non si presume che ogni altro oggetto costi 25 cr.',
    pm: 'I PM richiesti per creare il Consumabile sono 3 × Grado per il lavoro d’infusione, più l’intero costo base in PM della versione da sigillare.',
    magistrale: 'Con un Successo Magistrale si dimezzano, arrotondando per eccesso, i PM di lavoro e i reagenti; i PM sigillati dell’Incantesimo restano interi.',
    vendita: 'Vendita = doppio di tale costo: prezzo indicativo da playtest, distinto dal valore di rivendita e dalla possibilità concreta di trovare un’offerta.',
    inventario: 'Si registra la quantità posseduta e se ne sottrae una solo al completamento dell’attivazione.',
    campionario: 'I sei profili costituiscono un campionario di catalogo, non una nuova assegnazione automatica ai personaggi.',
  },
};

const COMUNE = 'Artefatto Mistico consumabile, monouso, con SnT 0 e Cariche Esclusive sigillate Verdi. I PM sono già inclusi nell’oggetto: l’utilizzatore non deve fornirli, conoscere l’Incantesimo o possedere Ritualista. L’attivazione è automatica, salvo eccezioni espresse; restano eventuali Prove per colpire, Difese e Salvezze. I costi di creazione presuppongono il progetto già disponibile.';
const TODO = 'A.155: il §27.3 non dà peso, Qualità, PS Integrità e PI delle pergamene. Intanto il peso resta vuoto (non pesa sul carico) e la pergamena non ha PI.';
const G = Object.fromEntries(j.consumabili.gradi.map((g) => [g.grado, g]));
const pergamena = (id, nome, incantesimo, livello, grado, attivazione, scheda, paragrafo, effetto) => ({
  id, nome, tipo: 'artefatto', catalogo: 'Commerciale', famiglia: 'Consumabili', nomi_alternativi: [],
  note_manuale: `${COMUNE} ${effetto}`, paragrafo: `Magia ${paragrafo}`, versione_manuale: V,
  costo: G[grado].vendita,
  artefatto: {
    tipologia: 'Consumabili', sintonizzazione: 0, sintonizzabile: false, proprieta_attive: true,
    consumabile: { grado, incantesimo, livello, pm_sigillati: livello, energia: 'Verde', attivazione, scheda, effetto },
  },
  proprieta: [], reperibilita: G[grado].reperibilita, peso: null, creazione_cr: G[grado].creazione, 'TODO(Davide)': TODO,
});
const AZP = { azp: 1, testo: '1 AzP' };
const nuovi = [
  pergamena('pergamena-di-cura-ferite-3', 'Pergamena di Cura Ferite 3', 'Cura Ferite', 3, 'I', AZP, '21.1', '§27.3.1',
    'A contatto, restituisce 1d4+2 PV a una creatura vivente consenziente, oppure incosciente soccorsa. Ogni 2 punti di guarigione possono invece ridurre il Sanguinamento di 1; i punti rimanenti restituiscono PV. Effetto istantaneo. Non cura Ferite o Menomazioni e conserva gli altri limiti di Cura Ferite. Riferimento: scheda 21.1.'),
  pergamena('pergamena-di-arma-mistica-3', 'Pergamena di Arma Mistica 3', 'Arma Mistica', 3, 'I', AZP, '22.1', '§27.3.2',
    'Incanta un’arma toccata per 5 RND, senza Concentrazione. I danni diventano Magici; conferisce +1 al VA degli attacchi e +1 al danno. Il bonus al VA non si applica alla Parata. Restano i limiti di cumulo della scheda; ripetere l’effetto non somma i bonus. Riferimento: scheda 22.1.'),
  pergamena('pergamena-di-armatura-mistica-3', 'Pergamena di Armatura Mistica 3', 'Armatura Mistica', 3, 'I', AZP, '22.2', '§27.3.3',
    'Incanta un’armatura fisica indossata e toccata per 5 RND, senza Concentrazione. Converte la sua AR in Magica e aggiunge +1 AR. Non ripara l’armatura. Sono esclusi scudi, pelle naturale e protezioni generate da Incantesimi; restano i normali limiti di cumulo. Riferimento: scheda 22.2.'),
  pergamena('pergamena-di-individuare-6', 'Pergamena di Individuare 6', 'Individuare', 6, 'II', AZP, '23.9', '§27.3.4',
    'Potere di Rilevazione 6. Permette la percezione delle emanazioni entro 10 Q (15 m), oppure l’analisi di un’area totale di 1 Q entro la stessa gittata. Una sola modalità alla volta. Si sceglie Concentrazione fino a 10 minuti oppure durata fissa di 5 RND. Percezione, analisi, cambi di modalità e occultamenti seguono la scheda. Riconosce l’impronta dell’Oscura Simmetria, ma non certifica la Corruzione personale di una creatura. Riferimento: scheda 23.9.'),
  pergamena('pergamena-di-esorcizzare-corruzione-6', 'Pergamena di Esorcizzare Corruzione 6', 'Esorcizzare Corruzione', 6, 'II',
    { minuti: 10, testo: '10 minuti', fuori_combattimento: true }, '21.5', '§27.3.5',
    'Fuori dal combattimento, richiede Concentrazione e contatto per tutta l’attivazione con una creatura vivente consenziente, oppure incosciente soccorsa. Riduce di uno Stato la Corruzione; lo Stato iniziale non può superare Corrotto. Un solo trattamento efficace ogni 24 ore per beneficiario, considerando insieme pergamene, altri Artefatti e lanci diretti. Non cura Oscuro, non rimuove automaticamente mutazioni permanenti e non espelle possessioni. Riferimento: scheda 21.5.'),
  pergamena('pergamena-di-rigenerazione-9', 'Pergamena di Rigenerazione 9', 'Rigenerazione', 9, 'III',
    { ore: 3, testo: '3 ore continuative' }, '21.10', '§27.3.6',
    'Mantenendo contatto e condizioni della versione per tre ore, avvia la riparazione di una Menomazione permanente in un beneficiario vivente consenziente, oppure incosciente soccorso, purché la parte anatomica sia ancora presente. Il processo si completa nei cinque giorni successivi, senza ulteriore contatto o Concentrazione. Una sola Rigenerazione attiva per beneficiario. Non ricrea un arto mancante a questo livello, non resuscita e non recupera automaticamente Umanità. Le nuove lesioni non entrano nel processo già avviato. Riferimento: scheda 21.10; 25.3–25.4.'),
];
const ids = new Set(nuovi.map((o) => o.id));
j.oggetti = [...j.oggetti.filter((o) => !ids.has(o.id)), ...nuovi];
writeFileSync(F, `${JSON.stringify(j, null, 2)}\n`);
console.log(`artefatti.json: consumabili e ${nuovi.length} pergamene`);
