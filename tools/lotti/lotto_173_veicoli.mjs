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

scrivi('data/veicoli.json', veicoli);
console.log(cambi.length ? `${SCRIVI ? 'Scritto' : 'Cambierebbe'}: ${cambi.join(', ')}` : 'Niente da cambiare.');
