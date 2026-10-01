// Lotto 4 dell'aggiornamento del 01/10/2026, prima parte: Manuale dell'Equipaggiamento 0.5, cap. 6
// «Equipaggiamento sanitario» ampliato (§6.7 Naniti medici, §6.8 Postazioni medicochirurgiche), letto con
// le cure del Giocatore 0.45 (§5.16.2, §5.16.6). Convenzioni in docs/equipaggiamento-lotti.md.
//   node tools/lotti/lotto_equipaggiamento_06.mjs            prova a vuoto (con i controlli)
//   node tools/lotti/lotto_equipaggiamento_06.mjs --scrivi   scrive (idempotente)
// Scrive data/equipaggiamento/sanitario.json:
// - controlla che le schede già nel catalogo (§§6.1–6.6, dal §7.19 degli Armamenti e dalla 0.3) abbiano i
//   valori delle tabelle della 0.5; aggiorna le frasi cambiate (somministrazione rapida, §6.2) e il
//   campo tipizzato «cura» (PV, Sanguinamento, Round, stati di Ferita, durate, intervalli);
// - aggiunge i naniti medici (§6.7), le otto postazioni medicochirurgiche (§6.8: quattro modelli, fissi e
//   mobili), la cartuccia chirurgica e la ricarica nutritiva sanitaria (§6.8.7);
// - chiave «beneficio» comune ai bonus degli strumenti di chirurgia («Si applica un solo bonus degli
//   strumenti per Prova», §6.5; «Il +3 sostituisce gli altri bonus degli strumenti», §6.8.1).
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizza, testoManuali } from '../verifica_frasi.mjs';

const RADICE = new URL('../../', import.meta.url);
const scrivi = process.argv.includes('--scrivi');
const VERSIONE = 'Equipaggiamento 0.5';
const DOC = testoManuali();
const frase = (t) => { if (!DOC.includes(normalizza(t))) throw new Error(`frase non trovata nel Doc: ${t}`); return t; };
const frasi = (...t) => t.map(frase).join(' ');
const leggi = (p) => JSON.parse(readFileSync(new URL(p, RADICE), 'utf8'));
const percorso = 'data/equipaggiamento/sanitario.json';
const d = leggi(percorso);
const nec = leggi('data/equipaggiamento/nec.json');
const trova = (id) => d.oggetti.find((o) => o.id === id);
const problemi = [];

// --- §§6.1–6.6: le schede esistenti hanno i valori della 0.5 ------------------------------------------
const ATTESI = {
  'kit-di-pronto-soccorso-standard': { pi: 4, qualita: 'Comune', ps_int: 10, reperibilita: 'CO', costo: 1000, applicazioni: 5 },
  'kit-di-pronto-soccorso-professionale': { pi: 6, qualita: 'Non comune', ps_int: 12, reperibilita: 'RA', costo: 3000, applicazioni: 5 },
  'ricarica-kit-di-pronto-soccorso-standard': { costo: 150 },
  'ricarica-kit-di-pronto-soccorso-professionale': { costo: 300 },
  'cartuccia-emostatica': { reperibilita: 'NC', costo: 200 },
  'cartuccia-coagulante': { reperibilita: 'RA', costo: 600 },
  'cartuccia-curativa': { reperibilita: 'RA', costo: 500 },
  'umc-passiva': { capacita_cartucce: 5, pi: 4, qualita: 'Non comune', ps_int: 12, reperibilita: 'NC', costo: 4000 },
  'umc-attiva': { capacita_cartucce: 10, pi: 6, qualita: 'Rara', ps_int: 14, reperibilita: 'RA', costo: 9000 },
  'umc-automatica': { capacita_cartucce: 10, pi: 8, qualita: 'Molto rara', ps_int: 16, reperibilita: 'MR', costo: 18000 },
  'iniettore-sanitario-manuale': { capacita_cartucce: 1, pi: 2, qualita: 'Comune', ps_int: 10, reperibilita: 'NC', costo: 600 },
  'pistola-sanitaria': { capacita_cartucce: 5, pi: 4, qualita: 'Non comune', ps_int: 12, reperibilita: 'RA', costo: 3500 },
  'spray-rimarginante': { applicazioni: 5, pi: 2, qualita: 'Comune', ps_int: 10, reperibilita: 'NC', costo: 1200 },
  'contenitore-di-ricambio-spray-rimarginante': { costo: 1000 },
  'scanner-diagnostico-portatile': { pi: 4, qualita: 'Non comune', ps_int: 12, reperibilita: 'RA', costo: 5000 },
  'scanner-diagnostico-cybertronic': { pi: 4, qualita: 'Rara', ps_int: 14, reperibilita: 'RA', costo: 8000 },
  'kit-chirurgico-da-campo': { pi: 6, qualita: 'Non comune', ps_int: 12, reperibilita: 'RA', costo: 8000, applicazioni: 5 },
  'set-chirurgico-di-ricambio': { costo: 500 },
  'confezione-da-cinque-set-chirurgici': { costo: 2500 },
  'postazione-medica-da-campo': { pi: 12, qualita: 'Rara', ps_int: 14, reperibilita: 'MR', costo: 28000, applicazioni: 5 },
  'farmaco-terapeutico-specifico': { reperibilita: 'NC', costo: 100 },
  'antidoto-specifico': { reperibilita: 'RA', costo: 500 },
};
for (const [id, atteso] of Object.entries(ATTESI)) {
  const o = trova(id);
  if (!o) { problemi.push(`${id}: manca nel catalogo`); continue; }
  for (const [k, v] of Object.entries(atteso)) if (o[k] !== v) problemi.push(`${id}.${k}: ${JSON.stringify(o[k])} nel catalogo, ${JSON.stringify(v)} nella 0.5`);
}

// --- frasi cambiate nella 0.5 ------------------------------------------------------------------------
const RAPIDA_VECCHIA = 'Ogni destinatario può ricevere una sola somministrazione medica rapida per Round complessivamente da UMC, Iniettore sanitario, Pistola sanitaria e Spray rimarginante.';
const RAPIDA = frase('Ogni destinatario può ricevere una sola somministrazione medica rapida per Round complessivamente da UMC, Iniettore sanitario, Pistola sanitaria, Spray rimarginante, impianti e postazioni medicochirurgiche, comprese le monodosi del §6.6 e i naniti del §6.7.');
for (const o of d.oggetti) if (o.note_manuale?.includes(RAPIDA_VECCHIA)) o.note_manuale = o.note_manuale.replace(RAPIDA_VECCHIA, RAPIDA);
const CARTUCCE_POSTAZIONI = frase('Antidoti e farmaci terapeutici sono disponibili anche in cartucce compatibili con queste postazioni, allo stesso prezzo delle monodosi del §6.6.');
for (const id of ['farmaco-terapeutico-specifico', 'antidoto-specifico']) {
  const o = trova(id);
  if (!o.note_manuale.includes(CARTUCCE_POSTAZIONI)) o.note_manuale = `${o.note_manuale} ${CARTUCCE_POSTAZIONI} (§6.8.4)`;
  o.versione_manuale = VERSIONE;
}

// --- campo tipizzato «cura» (§6.2, §6.4, §6.7): i numeri delle cure, per tooltip e promemoria ---------
const cura = {
  'cartuccia-emostatica': { sanguinamento: 'sospende', round: 5, fonte: '§6.2' },
  'cartuccia-coagulante': { sanguinamento: 'arresta', fonte: '§6.2' },
  // «La Curativa e lo Spray rimarginante recuperano PV soltanto se il paziente non è in Sanguinamento attivo»
  'cartuccia-curativa': { pv: '1d6', senza_sanguinamento: true, fonte: '§6.2' },
  'spray-rimarginante': { pv: '1d3', azp: 1, prova: false, senza_sanguinamento: true, fonte: '§6.4' },
  'farmaco-terapeutico-specifico': { azp: 1, prova: false, fonte: '§6.6' },
  'antidoto-specifico': { azp: 1, prova: false, fonte: '§6.6' },
};
for (const [id, c] of Object.entries(cura)) trova(id).cura = c;
frase('Spendendo 1 AzP e una dose, senza Prova, recupera 1d3 PV fino al massimo.');
frase('La Curativa e lo Spray rimarginante recuperano PV soltanto se il paziente non è in Sanguinamento attivo: il recupero è possibile anche durante una sospensione valida del Sanguinamento.');

// --- bonus degli strumenti di chirurgia: uno solo per Prova -------------------------------------------
frase('Si applica un solo bonus degli strumenti per Prova, senza sommare postazione, scanner e kit.');
for (const id of ['kit-chirurgico-da-campo', 'postazione-medica-da-campo']) for (const e of trova(id).effetti ?? []) e.beneficio = 'strumenti_chirurgia';

// --- §6.7 Naniti medici ------------------------------------------------------------------------------
const NANITI_DURATE = [['Superficiale', 10, 'Guarita'], ['Importante', 20, 'Superficiale'], ['Profonda', 30, 'Importante'], ['Seria', 40, 'Profonda'], ['Grave', 50, 'Seria']];
const naniti = {
  id: 'naniti-medici', nome: 'Naniti medici', tipo: 'sanitario', catalogo: 'Commerciale', famiglia: 'Cartucce sanitarie', nomi_alternativi: ['Cartuccia di naniti medici'],
  note_manuale: frasi(
    'Una cartuccia di naniti medici riduce la Ferita di un solo stato al termine del trattamento. La durata dipende dalla gravità al momento della somministrazione; il tempo viene fissato allora. La dose non cura più stati in successione.',
    'Ogni paziente può ricevere una dose ogni 24 ore, conteggiate dalla precedente somministrazione. Il trattamento non consuma il tentativo medico ogni sette giorni ed è compatibile con Intervento Mirato, Terapia Intensiva e le procedure equivalenti delle postazioni, prima o dopo di esse.',
    'I naniti non recuperano PV, non arrestano il Sanguinamento e non curano Menomazioni o componenti meccanici. Una dose occupa un alloggiamento e si consuma alla somministrazione. È compatibile con UMC, iniettori, pistole sanitarie, iniettori impiantati e postazioni medicochirurgiche; segue le Azioni e le Prove del dispositivo usato e il limite di una somministrazione rapida per Round.'),
  paragrafo: '§6.7', versione_manuale: VERSIONE, reperibilita: 'MR', costo: 5000,
  effetto: 'Riduce la Ferita di un solo stato al termine del trattamento (10–50 minuti secondo lo stato)',
  cura: {
    ferita_stati: 1, durate: NANITI_DURATE.map(([stato, minuti, esito]) => ({ stato, minuti, esito })),
    intervallo_ore: 24, tentativo_settimanale: false, fonte: '§6.7; Giocatore §5.16.2',
  },
  tabelle: [{ titolo: 'Durata dei naniti (§6.7)', colonne: ['Stato iniziale', 'Durata', 'Esito'], righe: NANITI_DURATE.map(([s, m, e]) => [s, `${m} minuti`, e]) }],
  proprieta: [], effetto_breve: 'Una dose riduce la Ferita di uno stato in 10–50 minuti; una dose ogni 24 ore.',
};
frase('Prezzo: 5.000 cr per cartuccia monouso. Reperibilità Molto rara, REP MR.');

// --- §6.8 Postazioni medicochirurgiche ---------------------------------------------------------------
const PROC = [
  ['Trattamento mirato delle Ferite', '10 minuti', 'Riduce la Ferita di uno stato.'],
  ['Trattamento intensivo delle Ferite', '1 ora', 'Riduce la Ferita di due stati.'],
  ['Trattamento di Menomazione temporanea', 'Secondo la procedura', 'Applica gli esiti del Manuale del Giocatore, §5.16.5.'],
  ['Intervento su Menomazione permanente', 'Secondo la procedura', 'Diventa temporanea Seria; con Magistrale diventa temporanea Leggera.'],
];
for (const [, , e] of PROC) frase(e);
const MODELLI = [
  // id, nome, prova, Verdi (moduli), farmacologiche/nutritive, fissa, mobile, peso, qualità, PS, PI, REP
  ['semiautomatica', 'Semiautomatica', { tipo: 'operatore', bonus: 3 }, 1, 10, 60000, 75000, 250, 'Rara', 14, 16, 'RA'],
  ['automatica-standard', 'Automatica Standard', { tipo: 'ia', va: 12 }, 1, 10, 100000, 125000, 300, 'Rara', 14, 16, 'RA'],
  ['automatica-professionale', 'Automatica Professionale', { tipo: 'ia', va: 15 }, 2, 20, 180000, 225000, 350, 'Molto rara', 16, 20, 'MR'],
  ['automatica-specializzata', 'Automatica Specializzata', { tipo: 'ia', va: 18 }, 3, 30, 300000, 375000, 400, 'Molto rara', 16, 24, 'MR'],
];
// «Set di ricambio carico» e «Ricarica completa» del §6.8.7 = Modulo Rosso + Moduli Verdi del catalogo NEC
const SET = { 1: [1700, 150], 2: [2800, 250], 3: [3900, 350] };
const modulo = (id) => nec.oggetti.find((o) => o.id === id);
const [rosso, verde] = [modulo('modulo-rosso'), modulo('modulo-verde')];
if (rosso.costo !== 600 || verde.costo !== 1100 || rosso.ricarica_costo !== 50 || verde.ricarica_costo !== 100) problemi.push('Moduli Rosso/Verde: prezzi del catalogo NEC diversi dal §6.8.7 (600/1.100, ricarica 50/100)');
for (const [n, [set, ric]] of Object.entries(SET)) {
  if (rosso.costo + n * verde.costo !== set || rosso.ricarica_costo + n * verde.ricarica_costo !== ric) problemi.push(`set di ricambio con ${n} Verdi: ${set}/${ric} nel §6.8.7, ${rosso.costo + n * verde.costo}/${rosso.ricarica_costo + n * verde.ricarica_costo} dal catalogo NEC`);
}
const NOTE_POSTAZIONE = frasi(
  'Una postazione medicochirurgica è una mini sala operatoria per un paziente, in forma di lettino attrezzato o capsula. Comprende diagnostica, strumenti chirurgici, bracci assistiti, somministrazione di farmaci e supporto vitale.',
  'I programmi chirurgici costituiscono un’eccezione esplicita ai requisiti ordinari: permettono le procedure elencate anche se l’operatore della Semiautomatica non possiede l’Addestramento Medico o i Talenti corrispondenti.',
  'Mirato e intensivo condividono un tentativo ogni sette giorni per paziente con Intervento Mirato e Terapia Intensiva del Medico. Il tentativo conta anche se fallisce.',
  'Ogni postazione comprende un Modulo NEC Rosso carico, sufficiente per dieci operazioni, e cinque cartucce chirurgiche.',
  'Una singola procedura su una Ferita o una Menomazione è un’operazione: all’inizio consuma un ciclo energetico Rosso e una cartuccia chirurgica, anche se fallisce o viene interrotta.',
  'La degenza assistita vale come ricovero ospedaliero: una Ferita migliora di uno stato ogni tre giorni secondo le normali condizioni del Manuale del Giocatore, §5.16.',
  'La stasi mantiene un paziente vivente sospendendo Sanguinamento, normale progressione biologica di malattie e veleni e recupero naturale.',
  'Durante la degenza serve una ricarica nutritiva sanitaria per paziente e giorno',
  'Gli alloggiamenti farmacologici e nutritivi sono vuoti all’acquisto.',
  'A 0 PI le funzioni si arrestano; resta possibile l’apertura manuale d’emergenza.');
const postazioni = MODELLI.flatMap(([id, nome, prova, verdi, farm, fissa, mobile, peso, qualita, ps, pi, rep]) => [false, true].map((mob) => {
  const o = {
    id: `postazione-${id}-${mob ? 'mobile' : 'fissa'}`, nome: `Postazione medicochirurgica ${nome} ${mob ? 'mobile' : 'fissa'}`,
    tipo: 'sanitario', catalogo: 'Commerciale', famiglia: 'Postazioni medicochirurgiche', nomi_alternativi: [],
    note_manuale: `${NOTE_POSTAZIONE}${mob ? ` ${frase('La versione mobile costa il 25% in più e comprende telaio da trasporto, ancoraggi e componenti protetti; conserva le stesse funzioni mediche.')} ${frase('Dopo il trasporto occorrono dieci minuti di preparazione da parte di due persone, senza Prova ordinaria.')}` : ''}`,
    paragrafo: '§6.8', versione_manuale: VERSIONE,
    pi, qualita, ps_int: ps, reperibilita: rep, costo: mob ? mobile : fissa, peso,
    applicazioni: 5, nome_applicazioni: 'cartucce chirurgiche', ricarica: { applicazioni: 5, costo: 2500 },
    postazione: {
      modello: nome, mobile: mob, prova, riserva_verde_giorni: 10 * verdi,
      alloggiamenti: { chirurgiche: 5, farmacologiche: farm, nutritive: farm }, operazioni: 10,
    },
    cura: {
      procedure: PROC.map(([n, tempo, effetto]) => ({ nome: n, tempo, effetto })),
      tentativo_settimanale: true, degenza_giorni_per_stato: 3, fonte: '§6.8.2, §6.8.5; Giocatore §5.16.2, §5.16.6',
    },
    alimentazione: [
      { nec: 'nec:modulo-rosso', usi: 10, unita_usi: 'operazioni', lx_per_uso: rosso.nec.capacita_lx / 10, paragrafo: '§6.8.3' },
      { nec: 'nec:modulo-verde', moduli: verdi, usi: 10 * verdi, unita_usi: 'giorni di degenza o stasi', lx_per_uso: verde.nec.capacita_lx / 10, paragrafo: '§6.8.5' },
    ],
    proprieta: [],
    effetto_breve: prova.tipo === 'operatore'
      ? 'Medicina dell’operatore +3 strumenti per le procedure del programma; degenza come ricovero ospedaliero, stasi.'
      : `IA con VA ${prova.va} per le procedure del programma; degenza come ricovero ospedaliero, stasi.`,
  };
  if (prova.tipo === 'operatore') {
    // «Il +3 sostituisce gli altri bonus degli strumenti» (§6.8.1): stessa chiave del kit e della postazione da campo
    o.effetti = [{ abilita: 'Medicina', valore: 3, ambito: 'uso_specifico', uso: 'procedure della postazione', condizione: frase('Medicina dell’operatore +3 strumenti'), fonte: 'Equipaggiamento §6.8.1', beneficio: 'strumenti_chirurgia' }];
  }
  return o;
}));
for (const [, nome, prova] of MODELLI) frase(prova.tipo === 'ia' ? `${nome} | IA con VA ${prova.va}` : `${nome} | Medicina dell’operatore +3 strumenti`);

// --- §6.8.7 consumabili ------------------------------------------------------------------------------
const consumabili = [
  {
    id: 'cartuccia-chirurgica', nome: 'Cartuccia chirurgica', tipo: 'sanitario', catalogo: 'Commerciale', famiglia: 'Postazioni medicochirurgiche', nomi_alternativi: [],
    note_manuale: frasi('La cartuccia chirurgica comprende anestetici ordinari, disinfettanti, suture e materiali da medicazione. Farmaci specifici, cartucce Curative, naniti, protesi e componenti speciali sono separati.', 'Cartuccia chirurgica | 500 cr | Una operazione; confezione da cinque 2.500 cr.'),
    paragrafo: '§6.8.7', versione_manuale: VERSIONE, costo: 500, proprieta: [], effetto_breve: 'Una operazione di una postazione medicochirurgica.',
    'TODO(Davide)': 'A.71: la cartuccia chirurgica delle postazioni (§6.8.7, 500 cr) e il set chirurgico del Kit chirurgico e della Postazione medica da campo (§6.5, 500 cr) hanno lo stesso contenuto e lo stesso prezzo: sono lo stesso consumabile, intercambiabile? Nel frattempo due voci distinte.',
  },
  {
    id: 'confezione-da-cinque-cartucce-chirurgiche', nome: 'Confezione da cinque cartucce chirurgiche', tipo: 'sanitario', catalogo: 'Commerciale', famiglia: 'Postazioni medicochirurgiche', nomi_alternativi: [],
    note_manuale: 'Cinque cartucce chirurgiche per le postazioni medicochirurgiche (§6.8.7: «confezione da cinque 2.500 cr»).',
    paragrafo: '§6.8.7', versione_manuale: VERSIONE, costo: 2500, proprieta: [], effetto_breve: 'Cinque operazioni di una postazione medicochirurgica.',
  },
  {
    id: 'ricarica-nutritiva-sanitaria', nome: 'Ricarica nutritiva sanitaria', tipo: 'sanitario', catalogo: 'Commerciale', famiglia: 'Postazioni medicochirurgiche', nomi_alternativi: [],
    note_manuale: frasi('Durante la degenza serve una ricarica nutritiva sanitaria per paziente e giorno: comprende il nutrimento equivalente a una razione e due litri d’acqua. Chi può mangiare e bere può usare normali provviste. I nutrimenti non accelerano la guarigione.', 'Ricarica nutritiva sanitaria | 50 cr | Un paziente per un giorno di degenza; 2,5 kg; REP NC.'),
    paragrafo: '§6.8.7', versione_manuale: VERSIONE, reperibilita: 'NC', costo: 50, peso: 2.5, proprieta: [], effetto_breve: 'Un paziente per un giorno di degenza.',
  },
];

// inserimento idempotente, nell'ordine del manuale
const inserisci = (o, dopo) => {
  const i = d.oggetti.findIndex((x) => x.id === o.id);
  if (i >= 0) d.oggetti[i] = o;
  else d.oggetti.splice(d.oggetti.findIndex((x) => x.id === dopo) + 1, 0, o);
};
inserisci(naniti, 'antidoto-specifico');
let dopo = 'naniti-medici';
for (const o of [...postazioni, ...consumabili]) { inserisci(o, dopo); dopo = o.id; }

d.versione_manuale = VERSIONE;
d.fonte = 'Manuale degli Armamenti v0.50, §7.19 Equipaggiamento sanitario (pp. 109–113), lotto 11; Manuale dell’Equipaggiamento 0.5, cap. 6 (Google Doc del 01/10/2026): stesse schede e valori dei §§6.1–6.6, ricariche, ricambi, farmaci e antidoti, naniti medici (§6.7) e postazioni medicochirurgiche (§6.8)';
d._nota_cura = 'Campo «cura» (Equipaggiamento 0.5, cap. 6; Giocatore §5.16): i numeri delle cure per tooltip e promemoria, senza tiri automatici. pv: dado di PV recuperati; sanguinamento: «sospende» (per «round») o «arresta»; senza_sanguinamento: recupera PV solo senza Sanguinamento attivo; ferita_stati e durate (naniti); intervallo_ore; tentativo_settimanale (condiviso con Intervento Mirato e Terapia Intensiva); procedure e degenza_giorni_per_stato (postazioni); azp e prova (false = senza Prova).';

if (problemi.length) { console.error(`Discrepanze catalogo ↔ cap. 6:\n- ${problemi.join('\n- ')}`); process.exit(1); }
if (scrivi) writeFileSync(new URL(percorso, RADICE), `${JSON.stringify(d, null, 2)}\n`);
console.log(`Cap. 6: ${Object.keys(ATTESI).length} schede controllate, nessuna discrepanza; naniti, ${postazioni.length} postazioni, ${consumabili.length} consumabili${scrivi ? ': scritto' : ' (prova: --scrivi)'}`);
