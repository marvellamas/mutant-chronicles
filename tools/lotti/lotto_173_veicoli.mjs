// Lotto 173 (05/11/2026): le risposte di Davide sui veicoli (per-davide.md, sezione 7, 02/11 e 03/11/2026).
//
// Che cosa scrive in data/veicoli.json:
//  - A.226 — lo Scout MK4 standard della scheda 0.6: prezzo di catalogo 126.510 cr (telaio 90.000, M606 19.000,
//    accumulatori pieni 4.000, bombole 3.000, munizioni e contenitori 2.800, corredo 7.710), riparazioni per PI Corpo 300,
//    Propulsione 100, Motore 300 cr, munizioni della M606 400 caricate e 400 di riserva, corredo della scheda 0.6. La
//    dotazione di prima (A.101: 800 colpi di riserva, kit trauma, pistola sanitaria, naniti, ricambi Rosso e Verde) resta
//    come `dotazione_precedente`: l'esemplare che l'ha ottenuta la conserva (src/veicoli.js → valoreEDotazione).
//    Il valore stimato del FIAT LUX non è nei dati: è un campo dell'esemplare, vuoto finché lo decide il Direttore.
//  - A.227 — la capacità di prima dei ricambi (Banco Rosso 50.000 Lx → MEC Rosso; Modulo Verde 10.000 Lx → CEC Verde),
//    per convertirli per frazione una volta sola.
//  - A.239 — la Neverlost non parte dalla dotazione delle munizioni: le conferma il Direttore (munizioni_nota).
//  - A.240 — la Neverlost è un esemplare unico (esemplare_unico, nota_esemplare): niente prezzo di catalogo, niente
//    seconda nave dal suo profilo (src/veicoli.js → profiliCreabili).
// e in data/equipaggiamento/artefatti.json:
//  - l'Anello con Rigenerazione 9 (configurazione del 02/11/2026, Magia §25.4): riserva Verde da 5 CM, 5 CM per uso,
//    3 ore di attivazione continua, poi 5 giorni (attivazione_lunga, src/attivazioni-lunghe.js). Non assegnato a nessuno.
//
// Uso: node tools/lotti/lotto_173_veicoli.mjs [--scrivi]   (senza --scrivi dice soltanto cosa cambierebbe)
// Rilanciabile: rifà gli stessi valori.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => JSON.parse(fs.readFileSync(join(R, f), 'utf8'));
const SCRIVI = process.argv.includes('--scrivi');
const scrivi = (f, x) => { if (SCRIVI) fs.writeFileSync(join(R, f), `${JSON.stringify(x, null, 2)}\n`); };
const cambi = [];
const imposta = (o, k, v, etichetta) => {
  if (JSON.stringify(o[k]) !== JSON.stringify(v)) cambi.push(`${etichetta}.${k}`);
  o[k] = v;
};

const veicoli = leggi('data/veicoli.json');
const scout = veicoli.profili.find((p) => p.id === 'asa-scout-mk4');

// --- A.226: lo standard della scheda 0.6 come riferimento di catalogo
const DOTAZIONE_A101 = 'Corredo di manutenzione da campo dello Scout (2.000 cr); Kit trauma professionale (3.000 cr, 5 applicazioni, +2 a Medicina per gli impieghi pertinenti, rifornimento di 5 a 300 cr); Pistola sanitaria (3.500 cr) con 10 cartucce di naniti medici (5.000 cr ciascuna): 5 nella pistola e 5 di riserva, una dose riduce di uno lo Stato di Ferita, al massimo una ogni 24 ore per paziente; cric (400 cr), 2 ruote complete di ricambio (2.400), cavo da traino (200), 2 estintori (400), comunicatore ponte di bordo (3.500), lanterna elettrica con NEC (200), pala pieghevole (100), 2 teli mimetici (500), set di cavi e adattatori di ricarica (300), 6 copriruote Petra (900), 8 razioni da viaggio (160), 2 taniche da 20 litri piene (160); munizioni della M606; due bombole supplementari; ricambi Rosso e Verde.';
const prima = scout.dotazione_precedente?.testo ?? (scout.dotazione === DOTAZIONE_A101 ? scout.dotazione : DOTAZIONE_A101);
imposta(scout, 'prezzo_cr', 126510, 'scout');
imposta(scout, 'valore_voci', [
  { voce: 'Telaio e sistemi fissi (comunicatore ponte, navigatore, sensori, impianto di supporto vitale)', cr: 90000 },
  { voce: 'Mitragliatore leggero Capitol M606', cr: 19000 },
  { voce: 'Accumulatori installati pieni (MEC Rosso 3.000, CEC Verde 1.000)', cr: 4000 },
  { voce: 'Tre bombole veicolari piene da 8 ore', cr: 3000 },
  { voce: 'Munizioni e contenitori: 400 colpi caricati e 400 di riserva, due contenitori per nastro', cr: 2800 },
  { voce: 'Corredo (attrezzi, cric, ruote, cavo, estintori, pronto soccorso, razioni, acqua, lanterna, pala, teli, cavi)', cr: 7710 },
], 'scout');
imposta(scout, 'nota_valore', 'Prezzo di catalogo della configurazione standard (Scout 0.6, A.226). Un esemplare usato può valere meno (il FIAT LUX è antico, con ricambi difficili): il suo valore stimato è un campo dell’esemplare e lo decide il Direttore.', 'scout');
imposta(scout, 'decisione', 'A.226 (Davide, 02/11 e 03/11/2026): lo standard della scheda 0.6 è il riferimento anche per lo Scout dei PG (FIAT LUX): prezzo di catalogo 126.510 cr, riparazioni Corpo 300, Propulsione 100, Motore 300 cr per PI. Restano registrati munizioni, scorte e corredo già ottenuti (i 400 colpi in più non si tolgono); le dotazioni extra si valutano a parte; si conservano danni, consumi e spese storiche. Prima: A.101 (E&L del 05/10/2026).', 'scout');
imposta(scout, 'ricambi_cr_per_pi', { corpo: 300, propulsione: 100, motore: 300 }, 'scout');
imposta(scout.armi[0], 'munizioni_iniziali', { caricate: 400, riserva: 400 }, 'scout.armi[0]');
imposta(scout, 'kit_riparazione', {
  nome: 'Attrezzi professionali per veicoli', tecnologia: 2, prezzo_cr: 2000,
  testo: '+2 al VA di Tecnologia per manutenzione e riparazioni veicolari compatibili; riutilizzabili. Materiali e ricambi si pagano a parte (Scout 0.6).',
}, 'scout');
imposta(scout, 'dotazione', 'Attrezzi professionali per veicoli (1 corredo, 2.000 cr); cric per Scout (500); 2 ruote complete di ricambio (2.000); cavo di traino con attacchi (200); 2 estintori ricaricabili da 5 dosi (800); kit di pronto soccorso standard da 5 applicazioni (1.000); 8 razioni da viaggio (160); 2 taniche d’acqua piene da 20 L (200); comunicatore ponte (compreso nel telaio); lanterna elettrica (200); pala pieghevole (50); 2 teli mimetici personali (500); 1 set di cavi e adattatori compatibili (100); 3 bombole veicolari piene da 8 ore (3.000, fuori dai 7.710 del corredo). Nessuna scorta energetica oltre agli accumulatori installati (vale per i mezzi nuovi: A.227).', 'scout');
imposta(scout, 'dotazione_precedente', {
  regola: 'A.101',
  testo: prima,
  nota: 'Dotazione ottenuta con la A.101 (05/10/2026): resta all’esemplare che l’ha avuta — munizioni (400 caricate e 800 di riserva), scorte, corredo e ricambi; le voci in più rispetto allo standard della scheda 0.6 si valutano a parte (A.226).',
}, 'scout');

// --- A.227: capacità di prima dei ricambi, per la frazione
imposta(scout, 'energia_precedente', {
  ...scout.energia_precedente,
  nota: 'Riserve salvate in Lx (modello del 05/10/2026): si conserva la frazione residua rispetto alla capacità di prima (A.193). I ricambi di prima diventano accumulatori di ricambio del modello nuovo con la loro frazione: il Banco Rosso della trazione (50.000 Lx) un MEC Rosso, il Modulo Verde (10.000 Lx) una CEC Verde (A.227).',
  ricambio_rosso_lx: 50000,
  ricambio_verde_lx: 10000,
}, 'scout');

// --- A.239 e A.240: la Neverlost
const nl = veicoli.profili.find((p) => p.id === 'neverlost');
imposta(nl, 'esemplare_unico', true, 'neverlost');
imposta(nl, 'nota_esemplare', 'Modello fuori produzione con molte modifiche personalizzate: il profilo è quello della nave della campagna, non un modello standard né un riferimento commerciale per altre navi. Prezzo e fascia commerciale della configurazione attuale restano da definire; i prezzi dei componenti non fanno il valore della nave (A.240).', 'neverlost');
imposta(nl, 'prezzo_cr', null, 'neverlost');
imposta(nl, 'reperibilita', null, 'neverlost');
imposta(nl, 'munizioni_nota', 'Dotazione standard: 600 proiettili per ciascun mitragliatore e 6 missili (munizioni_iniziali). Per la nave della campagna le quantità rimaste le conferma il Direttore; gli aggiornamenti del profilo conservano quelle registrate e, se il dato manca, restano «da verificare dal Direttore» (A.239).', 'neverlost');
const DEC_NL = ' A.239 (02/11/2026): munizioni registrate dal Direttore, standard solo come riferimento. A.240 (03/11/2026): esemplare unico, non a listino.';
if (!String(nl.decisione).includes('A.240')) imposta(nl, 'decisione', `${nl.decisione}${DEC_NL}`, 'neverlost');

scrivi('data/veicoli.json', veicoli);

// --- Anello con Rigenerazione 9 (configurazione approvata da Davide il 02/11/2026; Magia 1.11 §25.4)
// «non assegna automaticamente un anello ai personaggi»: è una voce del catalogo, non un oggetto consegnato.
const artefatti = leggi('data/equipaggiamento/artefatti.json');
const ANELLO = {
  id: 'anello-di-rigenerazione-9',
  nome: 'Anello con Rigenerazione 9',
  tipo: 'artefatto',
  catalogo: 'Artefatti di campagna',
  famiglia: 'Artefatti',
  nomi_alternativi: ['Anello di Rigenerazione'],
  note_manuale: 'Anello con la sola Rigenerazione 9 Esclusiva (Magia §25.4): Grado III, SnT 3. Riserva Verde dedicata da 5 Cariche Mistiche (CM); ogni Rigenerazione 9 consuma 5 CM, quindi un utilizzo a riserva piena. Dopo 3 ore di attivazione continua, con contatto e condizioni della versione, consuma le 5 CM e avvia la riparazione di una Menomazione permanente con parte ancora presente; il completamento richiede altri 5 giorni. Un’interruzione prima delle 3 ore impedisce l’effetto senza consumare cariche. Ricarica della riserva vuota: 30 PM personali con conversione 3:1, 20 con 2:1, 10 con 1:1 (CM mancanti × 2 × conversione). Il personaggio sintonizzato non deve essere un Ritualista; i 9 PM del rituale eseguito direttamente restano invariati. È la configurazione dell’oggetto: non assegna un anello a nessun personaggio. Prezzo non indicato.',
  paragrafo: 'Magia §25.4; configurazione approvata da Davide il 02/11/2026 (per-davide.md, sezione 7)',
  versione_manuale: 'Magia 1.11 (02/11/2026 17:47)',
  indossabile: true,
  artefatto: {
    tipologia: 'Accessori', potenza: 'Rara', sintonizzazione: 3, sintonizzabile: true, proprieta_attive: true, grado: 'III',
    contenitore: { energia: 'Verde', integrato: true, riserva: 'cariche', alimentazione: 'esclusiva', capacita_cm: 5 },
    infusi: [{ incantesimo: 'Rigenerazione', livello: 9 }],
  },
  attivazione_lunga: {
    id: 'rigenerazione-9', nome: 'Rigenerazione 9', cm: 5, ore: 3, continua: true, giorni_dopo: 5,
    effetto_avviato: 'avviata la riparazione di una Menomazione permanente con parte ancora presente',
    condizione: 'Contatto e condizioni della versione per tutte e 3 le ore; beneficiario vivente consenziente, o incosciente soccorso. Una sola Rigenerazione attiva per beneficiario. Nessuna Prova di Potere né Rituale, nessun Successo Magistrale o Fallimento Maldestro (Magia §25.4).',
    fonte: 'Magia 1.11 §25.4; configurazione approvata da Davide il 02/11/2026',
  },
  proprieta: [],
};
const i = artefatti.oggetti.findIndex((o) => o.id === ANELLO.id);
if (i < 0 || JSON.stringify(artefatti.oggetti[i]) !== JSON.stringify(ANELLO)) cambi.push('artefatti.anello-di-rigenerazione-9');
if (i < 0) artefatti.oggetti.push(ANELLO); else artefatti.oggetti[i] = ANELLO;
scrivi('data/equipaggiamento/artefatti.json', artefatti);
console.log(cambi.length ? `${SCRIVI ? 'Scritto' : 'Cambierebbe'}: ${cambi.join(', ')}` : 'Niente da cambiare.');
