// Lotto 3 della ricognizione del 01/11/2026 (docs/diff-talenti-054-2026-11-01.md, docs/diff-cyberarma-2026-11-01.md):
// la CyberArma riscritta. Fonti: Armamenti 0.74 §§7.25–7.25.4 (31/10/2026, 22:19) e la scheda «CyberArma Opzioni per
// Dimitri» 1.0 di Davide (Doc del 31/10/2026, 22:24). Scrive data/equipaggiamento/armi.json (voci della CyberArma) e
// data/equipaggiamento/artefatti.json (artefatti_catalogo).
//
// Che cosa cambia rispetto alla A.158/A.166 (13 e 16/10):
//  - originale: SnT secondo l'impiego (Custode 1, Tecnomante 2: `sintonizzazione_per_classe`); le altre Classi non lo
//    usano (serve la conversione a NeC); costruzione riservata ai Custodi (§7.25: «Soltanto i Custodi costruiscono le
//    CyberArmi originali»); prezzo non fissato per gli originali; prezzi indicativi delle modifiche;
//  - manifestazioni: le sei combinazioni di mani e portata della scheda (§7.25.2), tenute insieme a famiglia,
//    Specializzazione e Manovre della A.166 (A.235: confermare che valgono ancora);
//  - batteria interna: Verde da 10 PM (cinque attivazioni da 2 PM), SnT 2, 3.000 cr con la predisposizione; solo
//    Custode e Tecnomante;
//  - conversione a NeC (nuova): SnT 3, qualsiasi Classe con i requisiti, 1 carica di NeC Rosso per 10 Round, 2.000 cr;
//  - modulatore neurale: SIN 1 al Tecnomante con interfaccia collegata (sulla voce dell'esemplare, `modulatore_neurale`);
//  - il progetto di Dimitri a Paradise (§7.25.4) come modello `progetti` sulla voce dell'originale: lo usa
//    src/progetti.js. Il progetto non consegna niente da solo: l'arma entra solo con «Consegna» del Direttore.
//
// Uso: node tools/lotti/lotto_cyberarma_074.mjs [--scrivi]   (senza --scrivi dice soltanto cosa cambierebbe)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => JSON.parse(fs.readFileSync(join(R, f), 'utf8'));
const FONTE = 'Armamenti 0.74 §§7.25–7.25.4 (31/10/2026); scheda «CyberArma Opzioni per Dimitri» 1.0 (31/10/2026)';
const VERSIONE = 'Armamenti 0.74 / scheda CyberArma per Dimitri 1.0 (31/10/2026)';

const armi = leggi('data/equipaggiamento/armi.json');
const art = leggi('data/equipaggiamento/artefatti.json');
const trovaArma = (id) => armi.oggetti.find((o) => o.id === id);
const orig = trovaArma('cyberarma');
const batt = trovaArma('cyberarma-batteria-verde');
if (!orig || !batt) throw new Error('voci della CyberArma non trovate in armi.json');

// --- manifestazioni: le sei combinazioni della scheda (mani e portata), con famiglia e Specializzazione della A.166
const FORME = [
  { id: 'lama-lunga', nome: 'Lama (una mano, 1 Q)', esempio: 'Lama, ascia o altra forma ravvicinata a una mano', mani: 1, portata_q: 1, famiglia: 'Spade', specializzazione: 'specializzazione-spade', manovre: ['Affondo', 'Spazzata'] },
  { id: 'ascia-bipenne', nome: 'Ascia bipenne (due mani, 1 Q)', esempio: 'Ascia bipenne o altra forma ravvicinata a due mani', mani: 2, portata_q: 1, famiglia: 'Asce', specializzazione: 'specializzazione-asce', manovre: ['Spazzata'], due_mani_impugnatura: true },
  { id: 'punta', nome: 'Punta (una mano, 2 Q)', esempio: 'Punta o lancia con impugnatura a una mano', mani: 1, portata_q: 2, famiglia: 'Armi inastate', specializzazione: 'specializzazione-armi-inastate', manovre: ['Affondo'] },
  { id: 'lancia', nome: 'Lancia (due mani, 2 Q)', esempio: 'Lancia o altra forma allungata a due mani', mani: 2, portata_q: 2, famiglia: 'Armi inastate', specializzazione: 'specializzazione-armi-inastate', manovre: ['Affondo'], due_mani_impugnatura: true },
  { id: 'frusta', nome: 'Frusta (una mano, 3 Q)', esempio: 'Frusta o altra manifestazione flessibile', mani: 1, portata_q: 3, famiglia: 'Armi flessibili', specializzazione: 'specializzazione-armi-flessibili', manovre: ['generali'], nota: 'Si usa la procedura di Immobilizzare con la Frusta (§7.1.5); la presa senza danno non acquista il bonus al danno della Specializzazione.' },
  { id: 'picca', nome: 'Picca (due mani, 3 Q)', esempio: 'Picca o altra manifestazione lunga a due mani', mani: 2, portata_q: 3, famiglia: 'Armi inastate', specializzazione: 'specializzazione-armi-inastate', manovre: ['Affondo'], due_mani_impugnatura: true },
  // A.166: «Ascia» (una mano) resta per chi l'aveva già; il Custode manifesta qualsiasi forma ravvicinata
  { id: 'ascia', nome: 'Ascia (una mano, 1 Q)', esempio: 'Ascia a una mano', mani: 1, portata_q: 1, famiglia: 'Asce', specializzazione: 'specializzazione-asce', manovre: ['Spazzata'] },
];
const manifestazioni = {
  ...orig.manifestazioni,
  fonte: 'Armamenti 0.74 §7.25, §7.25.2; scheda per Dimitri 1.0; A.166 del 16/10/2026 per famiglia, Specializzazione e Manovre',
  _forma: 'La forma cambia esclusivamente mani occupate e portata: danno, Abilità, requisito FOR, durata e costi restano quelli della CyberArma; non si copiano le proprietà delle armi commerciali (Armamenti 0.74 §7.25). Le opzioni a due mani richiedono un’impugnatura esistente compatibile. La forma resta fissa: per cambiarla serve un nuovo intervento sul dispositivo (riconfigurazione, §7.25.2).',
  _a235: 'A.235 (aperta): famiglia, Specializzazione e Manovre per forma vengono dalla A.166; gli Armamenti 0.74 dicono che la forma cambia soltanto mani e portata. Finché Davide non conferma, l’app le tiene.',
  elenco: FORME,
};

const USO = {
  fonte: 'Armamenti 0.74 §7.25 (impieghi) e A.158 (Custode)',
  predefinito: 'altre',
  classi: [
    { classe: 'Custode', pm: 1, round: 15, danno_extra: 1, va: 0, sintonizzazione: 1, testo: 'Custode (SnT 1): evoca l’Arma Astrale per 1 PM e 15 Round, includendo l’evocazione nell’Azione del primo attacco, +1 al danno (Maestro d’Arma). Danno base e altri benefici seguono il Grado e i Talenti del Custode (Giocatore §3.9.2).' },
    { classe: 'Tecnomante', pm: 2, round: 10, danno_extra: 0, va: 0, sintonizzazione: 2, testo: 'Tecnomante (SnT 2): 1 AzP e 2 PM personali, lama stabile per 10 Round, senza Concentrazione; 1d8 Magico più i modificatori pertinenti. Attivazione automatica dopo la Sintonizzazione; restano le normali Prove per attaccare.' },
    { classe: 'altre', pm: null, cariche: null, round: null, danno_extra: 0, va: 0, ammesso: false, testo: 'Altre Classi: l’originale non si usa senza la conversione a NeC (Armamenti 0.74 §7.25).' },
  ],
};

const modifiche = {
  fonte: 'Armamenti 0.74 §7.25 e §7.25.2: prezzi indicativi su un originale esistente; si aggiungono al valore dell’arma originale',
  predisposizione_batteria: { cr: 1000 },
  batteria_verde_10_pm: { cr: 2000, nota: 'con la predisposizione 3.000 cr' },
  conversione_nec: { cr: 2000, nota: 'NeC escluso' },
  modulatore_neurale: { cr: 1500, ore: 8, prova: { abilita: 'Tecnologia', modificatore: -2 }, nota: 'servizio completo con progetto disponibile; interfaccia e batteria escluse' },
  riconfigurazione: { cr: 300, ore: 8, prova: { abilita: 'Tecnologia', modificatore: -2 }, nota: 'nuova forma sullo stesso modulatore; il nuovo profilo sostituisce il precedente' },
  totali: 'PM personali: SnT 2; con modulatore 1.500 cr, SnT 2. Batteria interna Verde: 3.000 cr, SnT 2; con modulatore 4.500 cr. Conversione a NeC Rosso: 2.000 cr, NeC escluso, SnT 3; con modulatore 3.500 cr.',
};

// --- il progetto di Dimitri a Paradise (§7.25.4; scheda 1.0, «Programma di lavoro»)
const ESITI_PROGETTO = {
  magistrale: 'Successo Magistrale: progetto magistrale, +2 VA per sempre alle Prove di Tecnologia per realizzarlo (Magia §24.3).',
  successo: 'Successo: progetto ordinario (Magia §24.3).',
  fallimento: 'Fallimento: nuovo tentativo con metà del tempo base e tutte le risorse di progettazione (Magia §24.3).',
  maldestro: 'Fallimento Maldestro: nuovo tentativo con il tempo base intero e tutte le risorse (Magia §24.3).',
};
const ESITI_LAVORAZIONE = {
  magistrale: 'Successo Magistrale: lavorazione riuscita; +2 VA alla Prova di Rituali d’infusione di quell’esemplare, se ce n’è una (Magia §24.4).',
  successo: 'Successo: lavorazione riuscita (Magia §24.4).',
  fallimento: 'Fallimento: nuovo tentativo con metà del tempo base e materiali aggiuntivi pari al 25% del costo di lavorazione (Magia §24.4).',
  maldestro: 'Fallimento Maldestro: nuovo tentativo con tempo intero e costo intero dei materiali; supporto e componenti restano recuperabili (Magia §24.4).',
};
const progetti = [{
  id: 'paradise-dimitri',
  nome: 'CyberArma: lavori a Paradise (Dimitri)',
  fonte: 'Armamenti 0.74 §7.25.4; scheda «CyberArma Opzioni per Dimitri» 1.0',
  classe: 'Tecnomante',
  giorni_disponibili: 3,
  budget: { ore: 24, cr: 400 },
  descrizione: 'Preparare la scheggia Verde instabile già posseduta come focalizzatore e recuperare, adattare e installare il modulo neurale della spada Cybertronic. Configurazione a PM personali: 1 AzP e 2 PM per 10 Round, SnT 2, SIN 1 al tiro per colpire con il modulo collegato. Niente Batteria interna, conversione a NeC o altre modifiche.',
  forma: { chi: 'giocatore', quando: 'prima della lavorazione', elenco: FORME.filter((f) => f.id !== 'ascia').map((f) => f.id) },
  componenti: [
    { id: 'scheggia', nome: 'Scheggia instabile Verde (già posseduta)', rif: 'artefatti:scheggia-instabile-da-5-pm-chroma-verde', nota: 'Si lavora scarica; gli eventuali PM si possono usare prima. Con successo diventa un componente integrato: colore Verde, nessuna riserva di PM, nessuna SnT in più. Un semplice fallimento non la distrugge.' },
    { id: 'modulo', nome: 'Modulo neurale della spada Cybertronic', rif: 'armi_corporative:spada-elettrificata-csa-404', nota: 'Dopo il recupero la spada perde il proprio SIN; con il circuito elettrico intatto conserva danno ordinario e scariche. Il modulo non trasferisce Elettricità alla CyberArma.' },
  ],
  giorni: [
    { n: 1, ore: 8, lavoro: 'Studio e progetto della configurazione scelta', prova: { abilita: 'Artefatti', modificatore: -2 }, risorse_cr: 200, esiti: 'progetto' },
    { n: 2, ore: 8, lavoro: 'Preparazione e stabilizzazione della scheggia Verde', prova: { abilita: 'Tecnologia', modificatore: -2 }, risorse_cr: 100, esiti: 'lavorazione' },
    { n: 3, ore: 8, lavoro: 'Recupero del modulo, adattamento, installazione e collaudo', prova: { abilita: 'Tecnologia', modificatore: -2 }, risorse_cr: 100, esiti: 'lavorazione' },
  ],
  esiti: { progetto: ESITI_PROGETTO, lavorazione: ESITI_LAVORAZIONE },
  regole: [
    'Gli eventuali nuovi tentativi devono rientrare nel tempo e nelle risorse disponibili; un semplice fallimento non distrugge automaticamente la scheggia.',
    'Le risorse indicate sono materiali e consumabili. I componenti già posseduti e il lavoro svolto personalmente non vengono acquistati di nuovo; la tariffa del servizio completo non si somma automaticamente.',
    'Il programma non registra come già eseguiti gli interventi e non assegna una manifestazione a Dimitri.',
    'Il profilo del Custode di Park rimane distinto: danni e Talenti personali di Park non passano all’utilizzatore.',
  ],
  risultato: { rif: 'armi:cyberarma', voce: { modulatore_neurale: true, focalizzatore: 'Verde', configurazione: 'PM personali' } },
}];

const dopoOrig = {
  ...orig,
  versione_manuale: VERSIONE,
  paragrafo: '§§7.25–7.25.4',
  effetto_breve: 'Artefatto TecnoMistico dei Custodi, pezzo unico: Custode SnT 1, Tecnomante SnT 2 con i PM personali. 1d8 Magico per Tecnomante e conversioni; la forma cambia solo mani e portata.',
  _nota_peso: 'Armamenti 0.74 §7.25: peso, dimensioni e Integrità del supporto si registrano per esemplare. 0,5 kg, Qualità Non comune, PS Integrità 12 e 4 PI sono i valori della A.158 (13/10) e restano finché l’esemplare non ne ha di propri (A.235).',
  _nota_costo: 'Armamenti 0.74 §7.25: non è fissato un prezzo unico per gli originali; il valore dipende da fattura, unicità, proprietà e provenienza. Nell’app il prezzo risulta non disponibile, non zero.',
  manifestazioni,
  uso_per_classe: USO,
  modulatore_neurale: { sin: 1, classe: 'Tecnomante', richiede: 'interfaccia_neurale', fonte: 'Armamenti 0.74 §7.25.2', testo: 'SIN 1: +1 VA alle Prove per colpire con la CyberArma, comprese le Manovre che richiedono quel tiro, soltanto al Tecnomante con interfaccia neurale compatibile, funzionante e collegata. Non aggiunge bonus a Parate, danni o altre Prove; un solo SIN per Prova (§7.15.1).' },
  modifiche,
  costruzione: {
    fonte: 'Armamenti 0.74 §7.25 («Costruzione e valore»)',
    chi: 'Soltanto i Custodi costruiscono le CyberArmi originali (Maestro d’Arma al III Grado). Il Tecnomante può alimentare un originale esistente con i PM personali e intervenire su un esemplare esistente (batteria, modulatore, conversione a NeC); non costruisce nuovi originali.',
    nota: 'I passi e i costi della costruzione di un originale non sono nella 0.74 (quelli della A.158 prevedevano anche il Tecnomante con Architetto TecnoMistico: A.235).',
  },
  progetti,
};
delete dopoOrig._nota_a158;

const dopoBatt = {
  ...batt,
  versione_manuale: VERSIONE,
  paragrafo: '§7.25 («Batteria interna opzionale»), §7.25.2',
  effetto_breve: 'Originale con batteria mistica interna Verde da 10 PM (cinque attivazioni da 2 PM), SnT 2 complessiva: Custode e Tecnomante, oltre ai PM personali.',
  _nota_costo: dopoOrig._nota_costo,
  manifestazioni,
  uso_per_classe: {
    fonte: 'Armamenti 0.74 §7.25',
    predefinito: 'altre',
    classi: [
      { ...USO.classi[0], testo: `${USO.classi[0].testo} Può pagare anche con 2 PM della batteria interna (si scalano nella riserva dell’arma).` },
      { ...USO.classi[1], testo: `${USO.classi[1].testo} Può pagare anche con 2 PM della batteria interna (si scalano nella riserva dell’arma).` },
      USO.classi[2],
    ],
  },
  modulatore_neurale: dopoOrig.modulatore_neurale,
  _nota_batteria: 'Armamenti 0.74 §7.25: batteria mistica interna Verde da 10 PM; a piena capacità cinque attivazioni complete da 2 PM. La SnT 2 comprende manufatto e batteria. Si applicano le normali regole delle Batterie Mistiche. Prezzo indicativo: predisposizione 1.000 cr + batteria 2.000 cr = 3.000 cr su un originale esistente.',
  costo_modifica: 3000,
};
delete dopoBatt.munizioni;
delete dopoBatt.costruzione;
delete dopoBatt._nota_a158;

const nec = {
  ...dopoOrig,
  id: 'cyberarma-nec',
  nome: 'CyberArma convertita a NeC',
  nomi_alternativi: [],
  effetto_breve: 'Originale con la conversione a NeC Rosso: qualsiasi Classe, rispettando competenze e requisiti; 1 carica per 10 Round, SnT 3 complessiva.',
  paragrafo: '§7.25 («Conversione a NeC»), §7.25.2',
  uso_per_classe: {
    fonte: 'Armamenti 0.74 §7.25 («Conversione a NeC»)',
    predefinito: 'altre',
    classi: [{ classe: 'altre', pm: null, cariche: null, nec: 1, round: 10, danno_extra: 0, va: 0, sintonizzazione: 3, testo: 'Qualsiasi Classe (SnT 3), rispettando competenze e requisiti dell’esemplare: 1 AzP e 1 carica di un NeC Rosso compatibile, arma manifestata per 10 Round, senza PM personali né Concentrazione. Il consumo è per attivazione, non per attacco; il circuito alimenta solo questa CyberArma. La carica si scala nella riga del NeC (Inventario).' }],
  },
  _nota_nec: 'Armamenti 0.74 §7.25: il NeC «della capacità prevista dalla scheda» non è indicato; un NeC da 10 cariche consente dieci attivazioni. Le conversioni non danno il +1 danno di Maestro d’Arma né i benefici del Custode. Prezzo indicativo della conversione: 2.000 cr, NeC escluso.',
  costo_modifica: 2000,
};
delete nec.progetti;
delete nec.costruzione;
delete nec.modifiche;

const iO = armi.oggetti.indexOf(orig);
armi.oggetti[iO] = dopoOrig;
armi.oggetti[armi.oggetti.indexOf(batt)] = dopoBatt;
const iN = armi.oggetti.findIndex((o) => o.id === 'cyberarma-nec');
if (iN >= 0) armi.oggetti[iN] = nec; else armi.oggetti.splice(armi.oggetti.indexOf(dopoBatt) + 1, 0, nec);

// --- artefatti_catalogo: SnT secondo l'impiego
const blocchi = [
  { rif: 'armi:cyberarma', tipologia: 'Armi', potenza: 'Comune', sintonizzazione: 2, sintonizzazione_per_classe: { Custode: 1, Tecnomante: 2 }, sintonizzabile: true, proprieta_attive: true, snt_per_impiego: true, _nota: 'Armamenti 0.74 §7.25: SnT 1 per il Custode, 2 per il Tecnomante (le SnT sono regole specifiche dei diversi impieghi e non determinano danno o Grado).' },
  { rif: 'armi:cyberarma-batteria-verde', tipologia: 'Armi', potenza: 'Non Comune', sintonizzazione: 2, sintonizzabile: true, proprieta_attive: true, snt_per_impiego: true, contenitore: { energia: 'Verde', capacita_pm: 10, integrato: true, riserva: 'batteria', alimentazione: 'esclusiva' }, _nota: 'Armamenti 0.74 §7.25: la SnT 2 comprende l’intero manufatto e la batteria integrata, senza un secondo costo.' },
  { rif: 'armi:cyberarma-nec', tipologia: 'Armi', potenza: 'Non Comune', sintonizzazione: 3, sintonizzabile: true, proprieta_attive: true, snt_per_impiego: true, _nota: 'Armamenti 0.74 §7.25: conversione a NeC, SnT 3 complessiva.' },
];
for (const b of blocchi) {
  const i = art.artefatti_catalogo.findIndex((x) => x.rif === b.rif);
  if (i >= 0) art.artefatti_catalogo[i] = b; else art.artefatti_catalogo.push(b);
}

console.log('CyberArma: originale, batteria Verde 10 PM, conversione a NeC; 7 forme; progetto di Dimitri (3 giorni, 24 ore, 400 cr).');
if (process.argv.includes('--scrivi')) {
  fs.writeFileSync(join(R, 'data/equipaggiamento/armi.json'), `${JSON.stringify(armi, null, 2)}\n`);
  fs.writeFileSync(join(R, 'data/equipaggiamento/artefatti.json'), `${JSON.stringify(art, null, 2)}\n`);
  console.log('scritti armi.json e artefatti.json');
}
