// Lotto 180 (08/11/2026): le cinque risposte di Davide del 06/11 su celle e caricatori — A.243, A.249, A.250,
// A.244 e A.245. Scrive in data/equipaggiamento/munizioni.json → ricarica:
//  - «costi_operazioni»: estrarre, inserire e sostituire, uguali per celle e caricatori (A.243 e A.249);
//  - «caricatore_pronto»: con almeno un colpo è pronto, anche se non pieno (A.250);
//  - «riempimento_caricatori.tempo» e «.condizioni»: 1 minuto ogni 50 colpi, caricatori estratti, munizioni
//    davvero disponibili (A.244);
//  - «integrita_celle»: 2 PI per ogni cella, separata dalla pila, a 0 PI distrutta (A.245).
// Il comportamento è in src/ricarica.js; il lotto 163 (lotto_a215_celle.mjs) non riscrive più questi blocchi.
// Uso: node tools/lotti/lotto_180_celle_caricatori.mjs [--scrivi]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = join(R, 'data/equipaggiamento/munizioni.json');
const m = JSON.parse(fs.readFileSync(F, 'utf8'));

// A.243 e A.249 (Davide, 06/11/2026): le stesse tre operazioni, con gli stessi costi, per le celle e per i caricatori.
// Il terzo non è la somma dei primi due: la sostituzione diretta resta un'unica operazione da 1 AzP complessivo.
m.ricarica.costi_operazioni = {
  _nota: 'A.243 (celle) e A.249 (caricatori), risposte di Davide del 06/11/2026: «Estrarre soltanto la cella costa 1 AzP; inserire una cella pronta in un’arma vuota costa 1 AzP; la sostituzione diretta di una cella con un’altra resta un’unica operazione da 1 AzP complessivo. La cella estratta conserva esattamente la carica residua.» Per i caricatori la A.249 dice le stesse parole, con i colpi residui al posto della carica. Superano il «l’app non inventa un costo» del lotto 163 e del 03/11. La sostituzione resta quella del manuale (Armamenti 0.74 §7.20.2 per i caricatori, §7.20.5 per le celle, §7.20.6 per i pacchi): il costo non si somma.',
  estrazione: {
    azione: '1 AzP',
    testo: 'Estrarre soltanto costa 1 AzP; quello che esce conserva esattamente la carica o i colpi residui.',
  },
  inserimento: {
    azione: '1 AzP',
    testo: 'Inserirne uno pronto in un’arma vuota costa 1 AzP.',
  },
  sostituzione: {
    azione: '1 AzP',
    non_somma: true,
    testo: 'La sostituzione diretta — fuori il vecchio, dentro il nuovo — è un’unica operazione da 1 AzP complessivo, non due.',
  },
};

// la nota del lotto 163 diceva «il manuale non dà un costo separato … l’app non ne inventa uno (A.243)»: non è più vero
m.ricarica.cambio_cella._nota = m.ricarica.cambio_cella._nota
  .replace(/Il manuale non dà un costo separato per togliere soltanto la cella o per inserirla in un’arma vuota: l’app non ne inventa uno \(A\.243\)\./,
    'Togliere soltanto la cella e inserirla in un’arma vuota costano 1 AzP ciascuno, e la sostituzione diretta resta un’unica operazione da 1 AzP complessivo (A.243, risposta del 06/11/2026: vedi «costi_operazioni»).');

// A.250 (Davide, 06/11/2026): un parziale è pronto; un vuoto no.
m.ricarica.caricatore_pronto = {
  _nota: 'A.250 (Davide, 06/11/2026): «Un caricatore compatibile, accessibile e con almeno un colpo è considerato pronto anche se non è pieno. Ha lo stesso costo d’azione e beneficia normalmente di Ricarica Rapida o Ricarica Esperta; il numero esatto di colpi residui deve essere conservato.» Vale anche per le celle: una cella con almeno una carica è pronta.',
  colpi_minimo: 1,
  testo: 'Con almeno un colpo è pronto, anche se non pieno: stesso costo d’azione e stesso beneficio di Ricarica Rapida o Esperta. Un caricatore vuoto non è pronto.',
};

// A.250: il promemoria della Ricarica Rapida dice che un parziale vale come un pieno
m.ricarica.ricarica_rapida.promemoria = m.ricarica.ricarica_rapida.promemoria
  .replace(/ Un caricatore o una cella con almeno un colpo.*$/, '')
  .replace(/$/, ' Un caricatore o una cella con almeno un colpo vale come pieno, anche se parziale (A.250).');

m.ricarica.riempimento_caricatori = {
  ...m.ricarica.riempimento_caricatori,
  _nota: `${m.ricarica.riempimento_caricatori?._nota ?? ''} A.244 risolta il 06/11/2026: «Fuori dal combattimento, riempire i caricatori richiede 1 minuto ogni 50 colpi trasferiti, o frazione, calcolato sul totale dell’operazione. I caricatori devono essere estratti e le munizioni devono essere realmente disponibili.»`.trim(),
  quando: 'fuori dal combattimento',
  tempo: {
    minuti: 1,
    ogni_colpi: 50,
    arrotonda: 'per eccesso',
    su: 'il totale dell’operazione',
    testo: '1 minuto ogni 50 colpi trasferiti, o frazione, sul totale dell’operazione',
  },
  condizioni: {
    caricatore_estratto: {
      richiesta: true,
      motivo: 'il caricatore va estratto prima di riempirlo (A.244): togli il caricatore dall’arma',
    },
    munizioni_disponibili: {
      richiesta: true,
      motivo: 'non ci sono abbastanza munizioni sciolte compatibili nell’inventario (A.244)',
    },
  },
};

// A.245 (Davide, 06/11/2026): i PI sono della singola cella, non della voce dell'Inventario.
m.ricarica.integrita_celle = {
  _nota: 'A.245 (Davide, 06/11/2026): «Ogni singola cella possiede 2 PI. Una cella danneggiata deve essere separata dalla pila. A 0 PI è distrutta e inutilizzabile, normalmente non riparabile: l’evento va registrato e la cella va rimossa dalle scorte utilizzabili.» «Normalmente» non vuol dire mai: il Direttore può decidere altrimenti, ma l’app non lo propone come cosa ordinaria.',
  pi_max: 2,
  separa_dalla_pila: 'Una cella danneggiata esce dalla pila delle celle intere e si segue da sola, con i suoi PI.',
  a_zero: 'distrutta e inutilizzabile, normalmente non riparabile',
  registra: 'La distruzione di una cella va scritta nello storico del personaggio.',
};

console.log('costi:', m.ricarica.costi_operazioni.estrazione.azione, '/', m.ricarica.costi_operazioni.inserimento.azione, '/', m.ricarica.costi_operazioni.sostituzione.azione, '(non si somma)');
console.log('pronto da:', m.ricarica.caricatore_pronto.colpi_minimo, 'colpo · tempo:', m.ricarica.riempimento_caricatori.tempo.testo);
console.log('PI per cella:', m.ricarica.integrita_celle.pi_max);
if (process.argv.includes('--scrivi')) {
  fs.writeFileSync(F, `${JSON.stringify(m, null, 2)}\n`);
  console.log('scritto data/equipaggiamento/munizioni.json');
}
