// Equipaggiamento 0.8, §10.10 e §10.11 (Magia 1.5, §28.1 e §28.4): l'Hachimaki della Disciplina Interiore e il Tomo dei
// Guardiani nel catalogo degli Artefatti. Nessun PG li possiede (ricerca del 19/10/2026 in personaggi/, tavolo/, scontri/,
// nemici/, veicoli/, scene/): sono oggetti del manuale, acquistabili/registrabili, senza toccare nessuna scheda.
//
// Hachimaki: Accessorio e Artefatto Mistico, Grado II, Non comune, SnT 1 (base 0 della proprietà passiva + 1 per il beneficio
// sui PM), nessuna riserva. Respiro Disciplinato: −1 PM al costo delle Tecniche Interiori personali mentre è indossato e
// sintonizzato; minimo 1 PM per un costo positivo; non si somma con altre fonti (vale la più favorevole). Il campo
// `sconto_tecniche` lo applica src/equipaggiamento.js → scontoTecniche, e src/tecniche.js → costoEffettivo lo mostra.
// Tomo dei Guardiani: Reliquia e Artefatto di campagna; peso, SnT, riserva e Integrità non sono definiti (come lo Scrigno:
// nessun blocco `artefatto`; il peso «da definire» rende il carico parziale, §1.6; l'Integrità segue il §1.7, A.162).
//
// Uso: node tools/lotti/lotto_hachimaki_tomo.mjs [--controlla]
import { readFileSync, writeFileSync } from 'node:fs';

const CONTROLLA = process.argv.includes('--controlla');
const F = new URL('../../data/equipaggiamento/artefatti.json', import.meta.url);
const dati = JSON.parse(readFileSync(F, 'utf8'));
const VERSIONE = 'Equipaggiamento 0.8 / Magia 1.5 (15/10/2026)';

const HACHIMAKI = {
  id: 'hachimaki-della-disciplina-interiore',
  nome: 'Hachimaki della Disciplina Interiore',
  tipo: 'artefatto',
  catalogo: 'Commerciale',
  famiglia: 'Artefatti',
  nomi_alternativi: ['Hachimaki Equip'],
  note_manuale: 'Fascia rossa della Mishima con il simbolo della corporazione al centro e kanji mistici neri; microframmenti di Chroma Verde nel ricamo, senza formare una riserva. Artefatto Mistico per chi utilizza Risorse Interiori. Respiro Disciplinato (passiva) riduce di 1 PM il costo delle Tecniche Interiori personali mentre la fascia è indossata e sintonizzata: una Tecnica con costo positivo non scende sotto 1 PM, una già gratuita resta gratuita. Non richiede Azioni, Prove o Concentrazione, non cambia il limite di una Tecnica per Round e non concede nuove Tecniche. Non riguarda Incantesimi, Rituali, ricariche o attivazioni di altri Artefatti. Più fasce o altre riduzioni dello stesso costo non si sommano: vale la più favorevole. Senza sintonizzazione non riduce i costi. Materiali di creazione 800 cr con il progetto disponibile; progetto nuovo 200 cr in più; progetto ordinario 1.000 cr (ricetta in Magia §28.1.1). Riparazione: base 200 cr, materiali ordinari 10 cr per PI recuperato.',
  paragrafo: 'Equipaggiamento §10.10; Magia §28.1',
  versione_manuale: VERSIONE,
  costo: 1500,
  indossabile: true,
  artefatto: { tipologia: 'Accessori', potenza: 'Non Comune', sintonizzazione: 1, sintonizzabile: true, proprieta_attive: false, snt_beneficio: true },
  sconto_tecniche: { pm: 1, minimo: 1, richiede_sintonizzazione: true, fonte: 'Equipaggiamento §10.10; Magia §28.1' },
  effetto_breve: '−1 PM al costo delle Tecniche Interiori (minimo 1 PM) se indossata e sintonizzata.',
  proprieta: [],
  reperibilita: 'MR',
  qualita: 'Non comune',
  ps_int: 12,
  pi: 2,
  peso: 0.05,
};

const TOMO = {
  id: 'tomo-dei-guardiani',
  nome: 'Tomo dei Guardiani',
  tipo: 'artefatto',
  catalogo: 'Artefatti di campagna',
  famiglia: 'Artefatti',
  nomi_alternativi: [],
  paragrafo: 'Equipaggiamento §10.11; Magia §28.4',
  versione_manuale: VERSIONE,
  peso: null,
  costo: null,
  integrita: 'da_definire',
  effetto_breve: 'Reliquia di campagna: non concede Incantesimi, bonus o riserve di PM. Le conoscenze che rivela seguono gli eventi della campagna.',
  proprieta: [],
  'TODO(Davide)': 'Dimensioni, peso, Integrità, SnT e profilo commerciale del Tomo non sono ancora fissati (Equipaggiamento §10.11, Magia §28.4): il peso resta «da definire» e il carico totale parziale (§1.6); per l’Integrità, se necessaria, vale il §1.7. Eventuali funzioni richiedono una scheda specifica.',
  _nota: 'Reliquia di Nathaniel legata al primo rituale e ai cinque Sigilli Spezzati; la descrizione delle visioni (copertina di metallo scuro incisa, albero e clessidra, pagine di lamine metalliche con scrittura runica) non attribuisce effetti meccanici. Il vincolo di apertura dello Scrigno del Primo Giuramento non si trasferisce al Tomo.',
};

let cambiato = false;
for (const nuovo of [HACHIMAKI, TOMO]) {
  const i = dati.oggetti.findIndex((o) => o.id === nuovo.id);
  if (i >= 0) { if (JSON.stringify(dati.oggetti[i]) !== JSON.stringify(nuovo)) { dati.oggetti[i] = nuovo; cambiato = true; } }
  else { dati.oggetti.push(nuovo); cambiato = true; }
}
if (CONTROLLA) { console.log(cambiato ? 'da scrivere' : 'già a posto'); process.exit(cambiato ? 1 : 0); }
if (cambiato) writeFileSync(F, `${JSON.stringify(dati, null, 2)}\n`);
console.log(cambiato ? 'scritto' : 'già a posto');
