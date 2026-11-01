// Sonda per tests/guardia-automatica.test.js: prova a CREARE un file e una cartella in ognuna delle cartelle vere dei dati
// e stampa, in JSON, che cosa è successo. Se una scrittura riesce, la toglie subito e lo dice («SCRITTA»).
// Non importa la guardia: sta al codice che scrive accenderla. Importa solo ciò che importa ogni strumento che cerca la
// cartella dei dati (tools/dati-pc.mjs), come fa qualunque programma di Mutant. La radice dell'app: MUTANT_SONDA_RADICE (o l'ultimo argomento).
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const radice = process.env.MUTANT_SONDA_RADICE ?? process.argv.at(-1);
const { cartellaDati } = await import(pathToFileURL(join(radice, 'tools', 'dati-pc.mjs')).href);
cartellaDati(radice); // ogni programma di Mutant lo fa prima di toccare i dati
const nomi = ['personaggi', 'px', 'tavolo', 'scontri', 'musica', 'galleria', 'nemici', 'veicoli', 'scene', 'mappe', 'salvataggi', 'autosave', 'backup-master'];
const esito = {};
for (const n of nomi) {
  const file = join(radice, n, '__sonda_guardia__.json');
  const dir = join(radice, n, '__sonda_guardia__');
  const prove = {
    scrittura: () => fs.writeFileSync(file, '{}'),
    appendi: () => fs.appendFileSync(file, 'x'),
    cartella: () => fs.mkdirSync(dir, { recursive: true }),
    promessa: async () => { await fs.promises.writeFile(file, '{}'); },
  };
  esito[n] = {};
  for (const [nome, prova] of Object.entries(prove)) {
    try {
      await prova();
      esito[n][nome] = 'SCRITTA';
    } catch (e) {
      esito[n][nome] = e.code === 'MUTANT_CARTELLA_VERA' && e.message.toLowerCase().includes(join(radice, n).toLowerCase()) ? 'rifiutata' : `errore ${e.code}`;
      if (e.code === 'MUTANT_CARTELLA_VERA') esito[n][`${nome}Messaggio`] = e.message;
    }
  }
  for (const p of [file, dir]) { try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* la guardia non lascia toccare: va bene */ } }
}
console.log(`SONDA ${JSON.stringify(esito)}`);
