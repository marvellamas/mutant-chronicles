// Lotto 229 — Armamenti 0.89 §7.28.1: il Mitragliatore Leggero Punisher dell'Alleanza entra nel catalogo come arma a sé (idempotente).
//  - NON è la pistola «Punisher» del catalogo (armi_distanza_corporative:punisher): nome e id distinti, nessuna fusione;
//  - i valori sono quelli della tabella del manuale (1d8+3 Naturale, VA +1, AC 1, FOR 6, 600 Q, 400 colpi, RM RL FS, PI 8, Non comune/12 PS, Rara, 25.000 cr);
//  - «Dotazione veicolare standard», cannoni e lanciamissili del §7.28.2 NON entrano: il manuale dice «Specifiche autonome di acquisto, massa,
//    Integrità e FOR restano da definire» (dichiarato in docs/diff-lotto229-2026-11-20.md);
//  - come le tre CyberArma del §7.25, la voce porta `versione_manuale` ma NON `_edizione.campi`: il §7.28.1 è una tabella «Dato | Valore»,
//    non una tabella d'arma, e il lettore (tools/importa-armi.mjs) non la legge — quindi per il lettore è «non trovata col suo nome»
//    e non si inventa una provenienza per campo che nessuno ha verificato. La verifica è tests/ingest-e-risposte-229.test.js, che rilegge la tabella.
//  - `da_definire` non c'è: la tabella dà tutti i campi; il peso (10 kg a vuoto) non è un campo del catalogo d'arma e resta nella nota.
// Uso: node tools/lotti/lotto_229_punisher.mjs [--scrivi]
import { readFileSync, writeFileSync } from 'node:fs';
const F = 'data/equipaggiamento/armi_distanza_corporative.json';
const E = 'Armamenti 0.89';
const voce = {
  id: 'mitragliatore-leggero-punisher', nome: 'Mitragliatore Leggero Punisher', tipo: 'arma_distanza', catalogo: 'Alleanza', famiglia: 'Armi pesanti',
  nomi_alternativi: [], note_manuale: 'Mitragliatore leggero standard dell’Alleanza, utilizzabile come arma trasportata oppure su supporti veicolari manuali e servocomandati. Dimensioni di trasporto 120 × 25 × 30 cm; massa a vuoto 10 kg, munizioni e contenitore esclusi; 800 colpi da fucile da 25 g pesano 20 kg. Il supporto concede Imbracciatura ma non Postura d’Assedio né il suo aumento di danno. Distinto dalla pistola Punisher.',
  paragrafo: '§7.28.1', versione_manuale: E, abilita: 'Armi pesanti', specializzazione: 'specializzazione-mitragliatori', mani: 2,
  danno: { una_mano: null, due_mani: '1d8+3' }, ac: 1, modificatore_va: 1, portata_q: null, gittata_q: 600,
  munizioni: { capacita: 400, unita: 'colpi', ricarica: null, consumo: null, riferimento: null },
  inc: 6, mov: -1, modalita: ['RM', 'RL', 'FS'], for_richiesta: 6, pi: 8, qualita: 'Non comune', ps_int: 12, reperibilita: 'RA', costo: 25000, proprieta: [],
};
const t = readFileSync(F, 'utf8');
if (t.includes('"id": "mitragliatore-leggero-punisher"')) { console.log('già presente: niente da fare'); process.exit(0); }
const ancora = '  {\n   "id": "improved-m89",';
if (!t.includes(ancora)) throw new Error('ancora non trovata');
const blocco = JSON.stringify(voce, null, 1).split('\n').map((l) => '  ' + l).join('\n') + ',\n';
if (process.argv.includes('--scrivi')) { writeFileSync(F, t.replace(ancora, blocco + ancora)); console.log('scritta'); } else console.log('a secco: --scrivi per scrivere\n' + blocco.slice(0, 300));
