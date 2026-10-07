// Lotto «Armamenti 0.54» (Doc del 28/09, 16:59): KEP 808 (Alleanza, Armi leggere) e Colt
// Hammershot (Capitol, Revolver) nel catalogo delle armi a distanza corporative, più la cella
// KEP 808 (§7.20.5). Stesso schema del lotto 5; valori dalle tabelle del Doc, testo in
// docs/manuali-txt/armamenti.md.
//   node tools/lotti/lotto_armamenti_054.mjs            prova a vuoto
//   node tools/lotti/lotto_armamenti_054.mjs --scrivi   scrive i JSON (idempotente)
//
// Convenzioni:
// - Specializzazione dal testo (§7.7 aggiornato: «Hellblazer e KEP 808 … utilizzano soltanto la
//   Specializzazione Armi al Plasma»; Hammershot: «Specializzazione: Pistole»).
// - Ricarica (E&L 19, risposte-master 61): la Hammershot è un Revolver, quindi «tamburo» per famiglia
//   (munizioni.json → ricarica.tamburo): una operazione (1 AzP) riempie il tamburo. Il KEP 808 usa
//   la sua cella specifica (modo «cella»).
// - Il +1 VA del KEP 808 «è già incluso nella scheda»: modificatore_va 1 come nella tabella.
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizza, testoManuali } from '../verifica_frasi.mjs';
import { bloccaRiscrittura } from './superato.mjs';
// superato il 07/10/2026 dall'Armamenti 0.59 (tools/lotti/lotto_armamenti_059.mjs: FOR del KEP 808 e della Colt
// Hammershot a 5): un rilancio con --scrivi riporterebbe i requisiti della 0.54.
bloccaRiscrittura('lotto_armamenti_054');

const RADICE = new URL('../../', import.meta.url);
const scrivi = process.argv.includes('--scrivi');
const VERSIONE = 'Armamenti 0.54';
const leggi = (f) => JSON.parse(readFileSync(new URL(`data/equipaggiamento/${f}.json`, RADICE), 'utf8'));
const salva = (f, d) => writeFileSync(new URL(`data/equipaggiamento/${f}.json`, RADICE), `${JSON.stringify(d, null, 2)}\n`);
const DOC = testoManuali();
const frase = (t) => { if (!DOC.includes(normalizza(t))) throw new Error(`frase non trovata nel Doc: ${t}`); return t; };

const armi = leggi('armi_distanza_corporative');
const plasma = armi.oggetti.find((o) => o.id === 'hellblazer').proprieta.find((p) => p.nome === 'Plasma');

const KEP = {
  id: 'kep-808', nome: 'KEP 808', tipo: 'arma_distanza', catalogo: 'Alleanza', famiglia: 'Armi leggere', nomi_alternativi: [],
  note_manuale: frase('KEP 808. Pistola al plasma. Specializzazione: Armi al Plasma. Proprietà: Plasma. Il +1 VA è già incluso nella scheda. Include una cella specifica da 10 colpi (§7.20.5). Ogni colpo a segno tira AC 1d3 e risolve separatamente danno e Armatura per ciascuna applicazione; consuma una sola carica. L’effetto aggiuntivo Plasma segue il §5.24 del Manuale del Giocatore. Non possiede un raggio di esplosione.'),
  paragrafo: '§7.8', versione_manuale: VERSIONE,
  abilita: 'Armi leggere', specializzazione: 'specializzazione-armi-al-plasma', mani: 1,
  danno: { una_mano: '1d6+1', due_mani: null }, ac: '1d3', modificatore_va: 1, portata_q: null, gittata_q: 20,
  munizioni: { capacita: 10, unita: 'colpi', ricarica: null, consumo: null, riferimento: null },
  inc: 6, mov: 0, modalita: ['S', 'TR'], for_richiesta: 6, pi: 4, qualita: 'Non comune', ps_int: 12, reperibilita: 'RA', costo: 12500,
  proprieta: [plasma],
};
const HAMMER = {
  id: 'colt-hammershot', nome: 'Colt Hammershot', tipo: 'arma_distanza', catalogo: 'Capitol', famiglia: 'Revolver', nomi_alternativi: [],
  note_manuale: frase('Colt Hammershot. Revolver pesante. Specializzazione: Pistole. Usa proiettili da pistola (§7.20.9) e un tamburo fisso da sei colpi. Ricaricare il tamburo con munizioni pronte richiede 1 AzP e la mano libera. Il prezzo comprende il tamburo, mentre le munizioni si acquistano separatamente. Non possiede proprietà aggiuntive.'),
  paragrafo: '§7.8', versione_manuale: VERSIONE,
  abilita: 'Armi leggere', specializzazione: 'specializzazione-pistole', mani: 1,
  danno: { una_mano: '1d6+3', due_mani: null }, ac: 1, modificatore_va: -1, portata_q: null, gittata_q: 10,
  munizioni: { capacita: 6, unita: 'colpi', ricarica: null, consumo: null, riferimento: null },
  inc: 5, mov: 0, modalita: ['S', 'TR'], for_richiesta: 7, pi: 4, qualita: 'Rara', ps_int: 14, reperibilita: 'RA', costo: 3500,
  proprieta: [],
};

/** Inserisce (o sostituisce) dopo l'oggetto indicato, così l'ordine resta quello del Doc. */
function inserisci(lista, voce, dopo) {
  const i = lista.findIndex((o) => o.id === voce.id);
  if (i >= 0) { lista[i] = voce; return 'aggiornato'; }
  lista.splice(lista.findIndex((o) => o.id === dopo) + 1, 0, voce);
  return 'inserito';
}
console.log('KEP 808', inserisci(armi.oggetti, KEP, 'hellblazer'));
console.log('Colt Hammershot', inserisci(armi.oggetti, HAMMER, 'jemson-45'));

const mun = leggi('munizioni');
const hb = mun.oggetti.find((o) => o.id === 'cella-hellblazer');
const CELLA = {
  ...hb, id: 'cella-kep-808', nome: 'Cella KEP 808', versione_manuale: VERSIONE, costo: 300,
  cella: { capacita: 10, unita: 'colpi', ricarica_costo: 60 }, compatibile_con: ['armi_distanza_corporative:kep-808'],
};
console.log('Cella KEP 808', inserisci(mun.oggetti, CELLA, 'cella-hellblazer'));
// §7.20.9: la Colt Hammershot usa proiettili da pistola (catalogo Capitol, dopo il Jemson 45)
const HAMMER_MUN = { rif: 'armi_distanza_corporative:colt-hammershot', famiglia: 'pistola' };
if (!mun.munizioni_armi.some((x) => x.rif === HAMMER_MUN.rif)) {
  mun.munizioni_armi.splice(mun.munizioni_armi.findIndex((x) => x.rif === 'armi_distanza_corporative:jemson-45') + 1, 0, HAMMER_MUN);
  console.log('Colt Hammershot: proiettili da pistola');
}

if (scrivi) { salva('armi_distanza_corporative', armi); salva('munizioni', mun); console.log('scritto'); }
