// Lotto 209 (17/11/2026), parte C — **la motocicletta civile e il furgone civile dal Manuale dei Veicoli 0.19.**
//
// Perché. Il raccordo dell'11 novembre dell'E&L dice di acquisire **entrambe le schede** del documento dei Veicoli: «una
// lettura limitata alla prima scheda restituisce un manuale incompleto». Il documento ha in realtà quattro schede
// (Tab 1: cap. 1–10; «Neverlost»: cap. 11, 12, 13 e le tavole; «Astronavi commerciali»: cap. 14; «Navi passeggeri»:
// cap. 15) e nel catalogo dell'app c'erano soltanto i tre mezzi dei capitoli 9, 10 e 11. Questo lotto aggiunge i due
// mezzi civili dei capitoli 12 e 13 — gli unici che stanno nella stessa struttura dell'autovettura (tre strutture di PI,
// una CEC Rossa, andature, ricambi) e che si possono usare in una tratta senza altro lavoro.
//
// **Che cosa NON fa.** Non recepisce il manuale: il testo corrente resta `veicoli-0.10.md` e i capitoli 1–11 sono
// identici (verificato riga per riga, 0.10 contro 0.19: cambiano soltanto copertina e indice). Non tocca la Neverlost né
// lo Scout né l'autovettura. Non importa i capitoli 14 e 15 (Nave mineraria, Rimorchiatore, Navi passeggeri Lusso e
// Sonno): sono astronavi con Traiettoria, equipaggi e tariffe, un modello che l'app non ha e che vuole un lotto suo.
//
// **Dove sta la provenienza.** I due profili dichiarano `fonte_edizione: "Veicoli 0.19"` (la 0.10 non li ha) e il
// registro cita `veicoli-0.19.md` in `edizioni_citate`: il file del catalogo resta alla 0.10 per il resto.
//
// **Quello che il manuale non dà e che qui non si inventa.** La tariffa oraria dell'officina: per l'autovettura il
// manuale dice 100 cr per ora (§9.6), per la moto e il furgone dice soltanto che «la manodopera si aggiunge al costo
// dei materiali». Il campo `officina_cr_per_ora` manca e `da_definire` lo dice; l'app non scrive una nota di
// manodopera per questi mezzi (src/veicoli.js stampa la tariffa solo se c'è).
//
//   node tools/lotti/lotto_209_veicoli_civili.mjs            — che cosa aggiungerebbe
//   node tools/lotti/lotto_209_veicoli_civili.mjs --scrivi   — applica (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

const FILE = 'data/veicoli.json';
const FONTE = 'Veicoli 0.19';
const NOTA_BASE = 'Veicoli 0.19: 1 CEC Rossa, 10 cariche; i km delle tratte brevi si sommano e alla chiusura del viaggio o della giornata si sottrae una carica ogni N km o frazione, arrotondando una sola volta. Consumo chilometrico uguale nelle tre andature su strada ordinaria. Ricaricare ripristina energia, non ripara; riparare non ricarica.';

const cec = (kmPerCarica, sezione) => ({
  nec: '1 CEC Rossa', tipo: 'cec', colore: 'rosso', cariche: 10, km_per_carica: kmPerCarica, autonomia_km: 10 * kmPerCarica,
  peso_kg: 5, prezzo_cr: 1000, prezzo_vuota_cr: 900,
  ricarica_cr: 100, ricarica_ore: 1, ricarica_cr_per_carica: 10, ricarica_minuti_per_carica: 6, sostituzione_minuti: 1,
  ricambi_iniziali: [],
  nota: `${NOTA_BASE.replace('ogni N km', `ogni ${kmPerCarica} km`)} (§${sezione}.5)`,
});

/** I due profili, dai capitoli 12 e 13 del Manuale dei Veicoli 0.19. Ogni numero è quello della tabella del manuale. */
export const PROFILI = [
  {
    id: 'motocicletta-civile', nome: 'Motocicletta civile', paragrafo: '§12', fonte_edizione: FONTE, tipo: 'terrestre',
    descrizione: 'Motocicletta stradale a due ruote per un conducente e un passeggero. Il profilo privilegia agilità e ingombro ridotto; entrambi gli occupanti sono esposti e utilizzano le proprie protezioni personali. L’allestimento è tecnologico.',
    equipaggio: { conducente: 1, passeggeri: 1, posti: 2, minimo: 1 },
    dimensioni: { lunghezza_m: 2.4, larghezza_m: 0.9, ingombro_q: '2 × 1' },
    massa_kg: 250, carico_kg: 200, mov_q: 50, man: 2, qualita: 'Comune', ps_integrita: 10,
    ar: { totale: 1, magica: 0 }, corazzato: 0,
    pi: { corpo: 8, propulsione: 6, motore: 6 },
    ricambi_cr_per_pi: { corpo: 100, propulsione: 50, motore: 150 },
    alimentazione: cec(100, 12),
    prezzo_cr: 8000, reperibilita: 'Comune',
    decisione_reperibilita: 'Veicoli 0.19 §12: REP Comune; prezzo completo 8.000 cr con la prima CEC Rossa piena inclusa.',
    armi: [], proprieta: [],
    dotazione: 'Sella biposto, pedane, fari, indicatori, retrovisori, strumentazione, cavalletto, agganci per bagagli e prima CEC Rossa piena. Caschi, abbigliamento protettivo, borse e attrezzi si acquistano separatamente; i bagagli rientrano nel carico utile di 200 kg.',
    ambiente: 'Motocicletta stradale a due ruote. Non concede Copertura automatica e non trasferisce l’AR 1 agli occupanti: chi è colpito personalmente usa le proprie protezioni, PV e Salvezze (§12.3).',
    note_manuale: 'Recuperare tutte le strutture da 0 costa 2.000 cr di materiali: Corpo 800, Propulsione 300, Motore 900 (§12.6). Una CEC di ricambio pesa 5 kg e costa 1.000 cr.',
    da_definire: ['officina_cr_per_ora'],
    senza_energia_precedente: true,
  },
  {
    id: 'furgone-civile', nome: 'Furgone civile', paragrafo: '§13', fonte_edizione: FONTE, tipo: 'terrestre',
    descrizione: 'Veicolo civile per il trasporto di merci, ricambi e attrezzature, con cabina chiusa a tre posti e vano merci separato. Il modello standard è destinato alle strade e alle piste carrabili compatte.',
    equipaggio: { conducente: 1, passeggeri: 2, posti: 3, minimo: 1 },
    dimensioni: { lunghezza_m: 6, larghezza_m: 2, altezza_m: 2.6, ingombro_q: '4 × 2' },
    massa_kg: 2500, carico_kg: 1500, volume_utile_m3: 10, mov_q: 30, man: -1, qualita: 'Comune', ps_integrita: 10,
    ar: { totale: 1, magica: 0 }, corazzato: 0,
    pi: { corpo: 20, propulsione: 12, motore: 12 },
    ricambi_cr_per_pi: { corpo: 250, propulsione: 100, motore: 250 },
    alimentazione: cec(50, 13),
    prezzo_cr: 35000, reperibilita: 'Comune',
    decisione_reperibilita: 'Veicoli 0.19 §13: REP Comune; prezzo completo 35.000 cr con la prima CEC Rossa piena inclusa.',
    armi: [], proprieta: [],
    dotazione: 'Cabina chiusa a tre posti, vano merci con portelloni posteriori, accesso laterale e punti di fissaggio, alloggiamento per la CEC Rossa. Trasportare persone nel vano merci richiede un allestimento dedicato (§13.3).',
    ambiente: 'Strade e piste carrabili compatte. Persone, merci e attrezzature condividono il carico utile di 1.500 kg e il volume del vano merci è di 10 m³: il carico deve rispettare entrambi i limiti (§13.3). La Copertura degli occupanti dipende dalla posizione e dalla struttura interposta; l’AR 1 non si trasferisce agli occupanti.',
    note_manuale: 'Recuperare tutti i PI delle tre strutture da 0 costa 9.200 cr di materiali: Corpo 5.000, Propulsione 1.200, Motore 3.000 (§13.5). Una CEC di ricambio pesa 5 kg, costa 1.000 cr e occupa carico.',
    da_definire: ['officina_cr_per_ora'],
    senza_energia_precedente: true,
  },
];

export function piano(radice = '.') {
  const json = JSON.parse(readFileSync(`${radice}/${FILE}`, 'utf8'));
  const presenti = new Set((json.profili ?? []).map((p) => p.id));
  return { json, daAggiungere: PROFILI.filter((p) => !presenti.has(p.id)) };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_209_veicoli_civili.mjs'], 'lotto_209_veicoli_civili.mjs');
  const { json, daAggiungere } = piano();
  if (!daAggiungere.length) { console.log('Niente da aggiungere: la motocicletta e il furgone ci sono già.'); process.exit(0); }
  for (const p of daAggiungere) console.log(`+ ${p.nome} (${p.paragrafo}): MOV ${p.mov_q}, MAN ${p.man >= 0 ? '+' : ''}${p.man}, PI ${p.pi.corpo}/${p.pi.propulsione}/${p.pi.motore}, ${p.prezzo_cr} cr`);
  if (!argv.includes('--scrivi')) { console.log('\n(dry-run: --scrivi per applicare)'); process.exit(0); }
  json.profili = [...json.profili, ...daAggiungere];
  writeFileSync(FILE, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`\nScritto ${FILE}.`);
}
