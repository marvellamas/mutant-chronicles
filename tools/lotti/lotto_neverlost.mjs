// La Neverlost (A.196, risposta di Davide del 30/10/2026): profilo nel catalogo dei veicoli e pedina della mappa. Fonti:
// Manuale dei Veicoli 0.10, capitolo «Neverlost scheda del veicolo» (Doc del 30/10/2026, 17:38; il capitolo è uguale a
// quello della 0.9 del 29/10) e la «Neverlost scheda tecnica» 1.6 di Davide (Parte I · Sistemi tecnologici, Word del
// 29/10/2026, 17:23). Dove i due testi differiscono vale la scheda (docs/diff-neverlost-2026-11-01.md, «Le due versioni»);
// la parte tecnomistica (circuito Bianco, postazioni sintonizzate, funzioni) c'è solo nel manuale.
// Scrive data/veicoli.json (profilo «neverlost») e img/Tokens/Neverlost-mappa.png (pedina vista dall'alto, muso in basso).
//
// Uso: node tools/lotti/lotto_neverlost.mjs [--scrivi]   (senza --scrivi dice soltanto cosa cambierebbe)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONTE = 'Manuale dei Veicoli 0.10, «Neverlost scheda del veicolo»; Neverlost scheda tecnica 1.6 (29/10/2026)';

const armaNavale = (n) => ({
  nome: `Mitragliatore navale ${n}`,
  abilita: 'Armi pesanti',
  operatore: 'postazione Armamenti (torretta indipendente)',
  postazione: 'Armamenti',
  arco_di_tiro: '360°, salvo ostacoli',
  danno: '1d10×10+20',
  natura: 'Naturale',
  gittata_q: 24,
  gittata_efficace_q: 12,
  gittata_testo: '12 / 24 Q Tattici',
  ac: 1,
  capacita: 600,
  consumo: '20 proiettili per raffica (30 raffiche)',
  sparo_colpi: 20,
  munizioni_iniziali: { caricate: 600, riserva: 0 },
});

const profilo = {
  id: 'neverlost',
  nome: 'Neverlost',
  paragrafo: 'Veicoli 0.10, «Neverlost scheda del veicolo»; scheda tecnica 1.6',
  fonte: FONTE,
  tipo: 'aerospaziale',
  descrizione: 'Trasporto tattico ASA tecnomistico di categoria media, molto modificato, per missioni autonome di ricognizione, ricerca, trasporto e recupero. Atmosfera e spazio; decollo verticale e volo stazionario.',
  decisione: 'A.196 (risposta di Davide del 30/10/2026): la Neverlost entra nella scheda dei veicoli e nella plancia, col profilo aggiornato del Manuale dei Veicoli. Combattimento in Q Tattici, ingombro convenzionale 3 × 2, planimetria interna distinta; le capacità massime non riempiono automaticamente le riserve effettive; viaggio in Traiettoria in giorni.',
  equipaggio: { conducente: 1, passeggeri: 9, posti: 10, minimo: 1, consigliati: 3, missione: 7, testo: 'Minimo 1 pilota; consigliati 3 operatori; missione ordinaria 7 persone. 10 occupanti totali; 10 cuccette, in 2 cabine singole e 4 doppie.' },
  postazioni: [
    { id: 'pilotaggio', nome: 'Pilotaggio', testo: 'Condurre richiede 1 AzM; una manovra complessa volontaria anche 1 AzP. La nave si muove all’Iniziativa del pilota.' },
    { id: 'armamenti', nome: 'Armamenti', testo: 'Sceglie l’arma per ogni attacco: un attacco con la propria AzP, due dal 12° livello se non spende quelle Azioni per altro. Ogni arma ha AC 1 per Round, condivisa fra tutti gli operatori.' },
    { id: 'difese_sensori', nome: 'Difese e Sensori', testo: 'Scudo energetico e sensori: rilevamento generale fino a 10.000 km, tracciamento di combattimento fino a 96 Q Tattici (1.440 m).' },
  ],
  // tre misure distinte (come i draghi della A.204): il corpo vero, la pedina di combattimento, la planimetria interna
  dimensioni: { lunghezza_m: 51, larghezza_m: 30, nota: 'Dimensioni indicative: perimetro esterno di riferimento. Non sono la pedina di combattimento e non cambiano con la scala.' },
  pedina_tattica: '3 × 2',
  scala_combattimento: 'tattica',
  planimetria: 'L’interno è una planimetria a parte, in Q Base: una scena propria. L’ingombro convenzionale 3 × 2 non modifica le dimensioni interne né la planimetria.',
  mappa: { immagine: 'img/Tokens/Neverlost-mappa.png', muso_immagine: 's' },
  carico_kg: 50000,
  carico_nota: '50 t, comprese persone, Scout e materiali mobili. Il peso degli impianti standard è già compreso nel mezzo.',
  mov_q: 8,
  mov_unita: 'Q Tattici',
  mov_testo: 'MOV di combattimento in Q Tattici: 8 / 16 / 24 per Round (Controllata, Rapida, Massima). Fuori dal regime tattico il MOV atmosferico di riferimento è 400 / 800 / 1.200 Q Base per Round. Velocità di viaggio e MOV di combattimento sono regimi distinti: all’inizio dello scontro si usa il MOV tattico, senza convertirlo.',
  velocita_kmh: { atmosferico: { controllata: 360, veloce: 720, massima: 1080 }, spaziale_locale: { controllata: 30000, veloce: 60000, massima: 90000 } },
  man: -1,
  man_testo: 'MAN tecnologica −1 (scheda 1.6): modifica le Prove di Pilotare pertinenti, non gli attacchi. Con Assetto armonico (postazione Pilotaggio, pilota sintonizzato) +1, totale 0.',
  qualita: 'Rara',
  ps_integrita: 14,
  ar: { totale: 8, magica: 0 },
  corazzato: 2,
  pi: { corpo: 300, propulsione: 180, motore: 120 },
  prezzo_cr: null,
  reperibilita: null,
  armi: [
    armaNavale(1),
    armaNavale(2),
    { nome: 'Cannone energetico', abilita: 'Armi pesanti', operatore: 'postazione Armamenti', postazione: 'Armamenti', arco_di_tiro: 'arco frontale 90°', danno: '3d10×10', natura: 'Naturale', gittata_q: 48, gittata_efficace_q: 24, gittata_testo: '24 / 48 Q Tattici', ac: 1, consumo: '1 carica Rossa per colpo, anche se manca il bersaglio', energia_per_colpo: { rosso: 1 } },
    { nome: 'Lanciamissili antinave', abilita: 'Armi pesanti', operatore: 'postazione Armamenti', postazione: 'Armamenti', arco_di_tiro: 'arco frontale 180°', danno: '5d10×10', natura: 'Naturale', gittata_q: 72, gittata_efficace_q: 36, gittata_testo: '36 / 72 Q Tattici', ac: 1, capacita: 6, consumo: '1 missile', sparo_colpi: 1, munizioni_iniziali: { caricate: 6, riserva: 0 }, nota: 'Serve un bersaglio rilevato e tracciato, senza un’azione aggiuntiva di aggancio; si risolve nel turno del lancio, senza pedina missile né area di esplosione automatica.' },
  ],
  regole_armi: [
    'Ogni attacco costa 1 AzP e richiede Armi pesanti. Una raffica completa richiede un solo tiro per colpire e un solo tiro di danno.',
    'Entro la gittata efficace nessuna penalità di distanza; oltre, fino alla massima, −4; oltre la massima non si spara. Si misura dal bordo più vicino al bordo più vicino.',
    'Le penalità della propria andatura sono 0 / −2 / −4 e si sommano alla distanza e agli altri modificatori.',
  ],
  manovre_speciali: [
    { nome: 'Assetto d’attacco', costo: '1 AzP; Pilotare', successo: '+2 a un attacco della nave prima del successivo turno del pilota' },
    { nome: 'Assetto evasivo', costo: '1 AzP; Pilotare', successo: '−2 agli attacchi contro la nave fino al successivo turno del pilota; −2 anche ai propri attacchi durante l’effetto' },
    { nome: 'Distacco da un aggancio esterno', costo: '1 AzP; Pilotare −2 contrapposto', successo: 'Interrompe l’aggancio; pareggio o fallimento lo conservano' },
  ],
  manovre_testo: 'Una sola manovra speciale per Round. MAN, andatura e danni modificano la Prova. Le Azioni si spendono anche col fallimento; l’energia delle manovre speciali è compresa nella propulsione. Impulso evasivo (postazione Pilotaggio) concede +2 alle Prove di evasione e distacco.',
  // Riserve: in cariche, mai riempite da sole (A.196)
  energia_neverlost: {
    riempimento_iniziale: false,
    testo: 'Le capacità massime non riempiono le riserve effettive: i valori attuali si registrano secondo lo stato della campagna e cambiano solo con i consumi o con una ricarica esplicita a un approdo (A.196).',
    rosso: { nome: '10 BEC Rossi', cariche: 100, minuti_per_carica: { controllata: 60, veloce: 30, massima: 12 }, stazionario_ore_per_carica: 1, ricarica_cr_per_carica: 50, testo: '1 carica Rossa: 1 ora Controllata, 30 min Rapida o 12 min Massima (autonomie 100 / 50 / 20 ore). Stazionario: 1 carica per ora. Atterrata o attraccata a motori spenti: nessun consumo. I voli brevi della giornata si sommano e si arrotondano per eccesso una sola volta.' },
    blu: { nome: '1 BEC Blu', cariche: 10, ricarica_cr_per_carica: 50, testo: 'Ingresso e uscita dalla Traiettoria: 1 carica Blu per operazione. Scudo energetico: 1 carica Blu per ora.' },
    verde: { nome: '3 MEC Verdi', cariche: 30, per_giorno: 1, ricarica_cr_per_carica: 30, testo: 'Supporto vitale fino a 10 occupanti: 1 carica Verde per giorno di funzionamento, anche in sosta (30 giorni con la riserva piena). All’approdo alimentato i servizi usano la rete esterna, senza consumo dalle batterie.' },
    traiettoria: { entrata_blu: 1, uscita_blu: 1, minuti_operazione: 5, per_giorno: { rosso: 1, verde: 1 }, testo: 'Il viaggio in Traiettoria si misura soltanto in giorni: niente km/h, niente distanze. Entrare e uscire: 5 minuti e 1 carica Blu ciascuno. Ogni giorno di viaggio: 1 carica Rossa e 1 Verde. Per combattere, cambiare sostanzialmente rotta o avvicinarsi a un approdo si esce dalla Traiettoria.' },
    ricarica: { ore: 8, testo: 'Ricarica completa in 8 ore soltanto presso un approdo capace di servire insieme 10 BEC Rossi, 1 BEC Blu e 3 MEC Verdi; con meno postazioni si procede per gruppi. Si pagano solo le cariche ripristinate: 50 cr Rossa o Blu, 30 cr Verde (pieno 6.400 cr).' },
    successione: 'Le riserve si usano in successione per colore, senza consumare una carica da ogni accumulatore insieme.',
    separazione: 'UE e PM restano risorse distinte: non esiste conversione automatica fra cariche e PM del circuito Bianco.',
  },
  scudo: {
    sce_max: 200,
    attivazione: { azione: '1 AzP', blu: 1, ore: 1 },
    recupero: { round_senza_colpi: 3, sce_per_round: 20 },
    assorbe: ['Naturale'],
    ampliamento: 'Ampliamento mistico dello scudo',
    testo: 'Attivazione: 1 AzP e 1 carica Blu per un’ora (mantenimento e rigenerazione compresi); ogni ora in più un’altra carica Blu. Assorbe 1 danno Naturale per ScE, prima dell’AR; l’eccedenza prosegue. Un colpo assorbito del tutto non applica i PI aggiuntivi del Magistrale. Spegnere e riaccendere non ripristina gli ScE. Dopo tre Round senza essere colpita recupera 20 ScE per Round, fino a 200; un colpo interrompe il recupero.',
    nota_magico: 'Manuale dei Veicoli: lo scudo ordinario non assorbe danni Magici o Eterei; occorre Ampliamento mistico dello scudo (postazione Difese e Sensori).',
  },
  // circuito tecnomistico: separato dalle riserve, non si ricarica con loro (Veicoli 0.10, «Circuito tecnomistico»)
  circuito_bianco: {
    pm: 120,
    schegge: 6,
    pm_per_scheggia: 20,
    riempimento_iniziale: false,
    testo: 'Sei schegge bianche di Cristallo Matrice integrate nello scafo, 20 PM ciascuna: un circuito comune da 120 PM. I PM non si rigenerano da soli durante il viaggio; la ricarica richiede una fonte e una procedura compatibili con il Chroma Bianco (trasferimenti dai PM personali 2:1). Nessuna conversione con le cariche Rosse, Blu e Verdi.',
    sintonizzazione: 'Le tre postazioni richiedono sintonizzazioni distinte, SnT 1 per persona ciascuna; un minuto di contatto e la Prova Artefatti. Le funzioni tecnologiche ordinarie non richiedono sintonia.',
    passive_generali: [
      { nome: 'Gravità armonica', testo: 'Gravità interna e compensazione delle normali sollecitazioni del volo; nessuna immunità a incidenti o collisioni.' },
      { nome: 'Occultamento dell’impronta mistica', testo: 'La nave non è identificata come veicolo tecnomistico dai normali rilevamenti mistici.' },
      { nome: 'Protezione degli occupanti', testo: '+2 alle PS Magia e Volontà di chi è all’interno.' },
    ],
    funzioni: [
      { id: 'assetto-armonico', postazione: 'pilotaggio', nome: 'Assetto armonico', pm: 0, passiva: true, testo: '+1 MAN al pilota sintonizzato (passiva).' },
      { id: 'impulso-evasivo', postazione: 'pilotaggio', nome: 'Impulso evasivo', pm: 4, azione: '1 AzP', durata: '5 Round', testo: '+2 a Pilotare per evasione e distacco.' },
      { id: 'pilotaggio-intuitivo', postazione: 'pilotaggio', nome: 'Pilotaggio intuitivo', pm: 4, azione: '1 AzP', durata: '10 minuti', testo: 'Controllo senza lettura degli strumenti; non rivela ostacoli o rotte sconosciute.' },
      { id: 'mira-armonica', postazione: 'armamenti', nome: 'Mira dell’operatore sintonizzato', pm: 0, passiva: true, testo: '+1 ai tiri per colpire dell’operatore (passiva).' },
      { id: 'ampliamento-mistico', postazione: 'armamenti', nome: 'Ampliamento mistico', pm: 4, azione: '1 AzP', durata: '5 Round', testo: 'Un’arma infligge danno Magico e +1d6, dopo ogni moltiplicatore.' },
      { id: 'occultamento-totale', postazione: 'difese_sensori', nome: 'Occultamento Totale', pm: 40, azione: '1 AzP', durata: '2 ore', testo: 'Nasconde nave ed equipaggiamento esterno alla vista e ai rilevamenti tecnologici; sparare o emettere Impulso Energetico lo termina.' },
      { id: 'ampliamento-scudo', postazione: 'difese_sensori', nome: 'Ampliamento mistico dello scudo', pm: 6, azione: '1 AzP', durata: '10 Round', testo: 'Lo scudo attivo assorbe anche danni Magici ed Eterei, consumando ScE; non accende uno scudo spento.' },
      { id: 'impulso-energetico', postazione: 'difese_sensori', nome: 'Impulso Energetico', pm: 8, azione: '1 AzP o automatico', durata: 'istantaneo', testo: 'Emissione radiale di 3 Q Base dallo scafo: 4d6 Magico, Elettricità; PS Tempra dimezza; una emissione per Round; funziona anche a 0 cariche Rosse con almeno 8 PM.' },
    ],
  },
  sostentamento: { cr_persona_giorno: 50, riferimento_giornate_persona: 210, testo: 'Sostentamento ordinario: 50 cr per persona al giorno (viveri, acqua, ossigeno, filtri, consumabili), una riserva unica di giornate-persona; riferimento 210 (30 giorni per 7 persone). Separato dall’energia Verde del supporto vitale.' },
  sensori: 'Rilevamento generale nello spazio aperto fino a 10.000 km; tracciamento preciso di combattimento fino a 96 Q Tattici (1.440 m).',
  proprieta: [
    { nome: 'Assistenza automatica', testo: 'Mantiene una rotta sicura o il volo stazionario; non combatte, non esegue manovre complesse e non prende decisioni tattiche.' },
    { nome: 'Fuori uso', testo: 'Un mezzo fuori uso non esplode o si decomprime automaticamente; nello spazio la perdita di propulsione non cancella l’inerzia.' },
  ],
};

const f = JSON.parse(fs.readFileSync(join(R, 'data/veicoli.json'), 'utf8'));
const i = f.profili.findIndex((p) => p.id === 'neverlost');
console.log(i >= 0 ? 'profilo «neverlost» aggiornato' : 'profilo «neverlost» nuovo');
if (i >= 0) f.profili[i] = profilo; else f.profili.push(profilo);

// pedina vista dall'alto (200 × 300, muso in basso): scafo grigio-azzurro, ali, cabina; un PNG senza dipendenze
function png(w, h, pixel) {
  const righe = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    righe[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) righe.set(pixel(x, y), y * (w * 4 + 1) + 1 + x * 4);
  }
  const crc = (b) => { let c = ~0; for (const v of b) { c ^= v; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const blocco = (tipo, dati) => { const t = Buffer.from(tipo); const l = Buffer.alloc(4); l.writeUInt32BE(dati.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, dati]))); return Buffer.concat([l, t, dati, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), blocco('IHDR', ihdr), blocco('IDAT', zlib.deflateSync(righe)), blocco('IEND', Buffer.alloc(0))]);
}
const W = 200; const H = 300;
const immagine = png(W, H, (x, y) => {
  const cx = x - W / 2;
  const fusoliera = Math.abs(cx) < 34 - Math.max(0, (y - 230) * 0.45) && y > 20 && y < 290;
  const ali = y > 70 && y < 170 && Math.abs(cx) < 95 - (y - 70) * 0.3;
  const cabina = Math.abs(cx) < 16 && y > 230 && y < 275;
  const motori = (Math.abs(cx - 52) < 9 || Math.abs(cx + 52) < 9) && y > 25 && y < 75;
  if (cabina) return [120, 200, 230, 255];
  if (motori) return [230, 120, 60, 255];
  if (fusoliera) return [150, 165, 180, 255];
  if (ali) return [110, 125, 140, 255];
  return [0, 0, 0, 0];
});

if (process.argv.includes('--scrivi')) {
  fs.writeFileSync(join(R, 'data/veicoli.json'), `${JSON.stringify(f, null, 2)}\n`);
  fs.writeFileSync(join(R, 'img/Tokens/Neverlost-mappa.png'), immagine);
  console.log('scritti data/veicoli.json e img/Tokens/Neverlost-mappa.png');
}
