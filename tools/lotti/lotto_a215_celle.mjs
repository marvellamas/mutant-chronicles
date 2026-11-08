// Lotto 163 (02/11/2026): A.215, risposta di Davide del 30/10/2026 — celle, pacchi e caricatori che si tolgono, si
// riempiono e si rimettono. Scrive in data/equipaggiamento/munizioni.json → ricarica due blocchi di regole:
//  - «cambio_cella»: che cosa costa togliere e mettere una cella o un pacco (dal manuale, non inventato);
//  - «riempimento_caricatori»: il riempimento dei caricatori fuori dal combattimento, «con un'unica operazione».
// Il comportamento (cella come oggetto, trasformatore solo sulle celle tolte) è in src/ricarica.js e src/trasformatori.js.
// Uso: node tools/lotti/lotto_a215_celle.mjs [--scrivi]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bloccaRiscrittura } from './superato.mjs';

// Dal lotto 180 (08/11/2026) i costi delle operazioni, il tempo del riempimento e i PI delle celle li scrive
// tools/lotti/lotto_180_celle_caricatori.mjs (A.243, A.244, A.245, A.249, A.250): questo lotto li riporterebbe indietro.
bloccaRiscrittura('lotto_a215_celle');

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = join(R, 'data/equipaggiamento/munizioni.json');
const m = JSON.parse(fs.readFileSync(F, 'utf8'));

m.ricarica.cambio_cella = {
  _nota: 'A.215 (Davide, 30/10/2026): «La cella energetica può essere ricaricata soltanto dopo essere stata tolta dall’arma» e «Durante il combattimento rimangono i costi e i limiti di estrazione, riempimento e inserimento previsti dalle regole». Costi dal manuale: Armamenti 0.74 §7.20.5 («Sostituire una cella compatibile già pronta richiede 1 AzP, senza Prova, disponendo delle mani necessarie»; per le armi ravvicinate a cella §7.1.4: «Sostituire una cella pronta richiede 1 Azione Principale») e §7.20.6 per i pacchi dei lanciafiamme («Sostituire un pacco compatibile pronto richiede 1 AzP, entrambe le mani e nessuna Prova»). Il manuale non dà un costo separato per togliere soltanto la cella o per inserirla in un’arma vuota: l’app non ne inventa uno (A.243).',
  azione: '1 AzP, senza Prova, con le mani necessarie (Armamenti §7.20.5)',
  per_unita: {
    getti: { azione: '1 AzP, entrambe le mani, nessuna Prova (Armamenti §7.20.6)', nome: 'pacco' },
  },
  ricarica_fuori: 'Una cella tolta si ricarica con un trasformatore compatibile (tab Inventario, «Tampone»); una cella inserita no (A.215).',
};
m.ricarica.riempimento_caricatori = {
  _nota: 'A.215 (Davide, 30/10/2026): «Fuori dal combattimento, con tempo e condizioni adatti, l’app deve permettere di riempire il caricatore parzialmente usato con un’unica operazione di interfaccia, mostrando quanti colpi vengono trasferiti e l’eventuale tempo necessario. Il tempo di preparazione trascorre prima del nuovo scontro; non vengono addebitate Azioni al combattimento successivo.» Esempio Axis: un solo caricatore da 15 con 8 colpi e 30 sciolti → 15/15 e 23 sciolti. Il manuale non dice quanto tempo ci vuole per riempire un caricatore: l’app non lo inventa (A.244).',
  quando: 'fuori dal combattimento',
  tempo: null,
};

console.log('cambio_cella:', m.ricarica.cambio_cella.azione, '· pacchi:', m.ricarica.cambio_cella.per_unita.getti.azione);
if (process.argv.includes('--scrivi')) {
  fs.writeFileSync(F, `${JSON.stringify(m, null, 2)}\n`);
  console.log('scritto data/equipaggiamento/munizioni.json');
}
