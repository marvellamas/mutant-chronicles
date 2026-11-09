// Lotto 185, parte B (09/11/2026): nella tab Veicoli si leggeva ancora «ASA Scout MK4».
//
// Per la A.226 (risposte di Davide del 02 e 03/11) l'esemplare dei PG si chiama FIAT LUX e lo Scout MK4 è il modello
// di riferimento. Nel registro il record nasceva con `nome` copiato dal profilo (src/veicoli.js → nuovoVeicolo:
// `nome: mezzo.nome || profilo.nome`), quindi il titolo della scheda era il nome del modello e il nome vero non si
// vedeva da nessuna parte. tools/fiat-lux.mjs (lotto 173) lo segnalava soltanto: «Nome: da impostare a FIAT LUX».
//
// Qui il nome dell'esemplare diventa un dato del profilo, non una stringa nel codice: `nome_esemplare` dice come si
// chiama l'esemplare di quel profilo e per quale risposta. Il **modello non cambia**: resta `nome` del profilo, e la
// scheda lo scrive accanto come riferimento (src/veicoli.js → nomiVeicolo).
//
//   node tools/lotti/lotto_185_nome_esemplare.mjs [--scrivi]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(RADICE, 'data', 'veicoli.json');

export const NOMI_ESEMPLARE = {
  'asa-scout-mk4': {
    nome: 'FIAT LUX',
    solo_gruppo: true,
    rif: 'A.226',
    nota: 'L’esemplare dei PG si chiama FIAT LUX (A.226, risposte del 02 e 03/11/2026); «ASA Scout MK4» è il modello di riferimento. Il nome è dell’esemplare: il modello nei dati non cambia.',
  },
};

export function applica(dati) {
  const cambi = [];
  for (const [id, nome] of Object.entries(NOMI_ESEMPLARE)) {
    const p = dati.profili.find((x) => x.id === id);
    if (!p) { cambi.push(`profilo «${id}» non trovato: niente da scrivere`); continue; }
    if (JSON.stringify(p.nome_esemplare) === JSON.stringify(nome)) { cambi.push(`${p.nome}: già a posto`); continue; }
    p.nome_esemplare = nome;
    cambi.push(`${p.nome}: nome dell’esemplare «${nome.nome}» (${nome.rif}${nome.solo_gruppo ? ', solo se è del gruppo' : ''})`);
  }
  return cambi;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const scrivi = process.argv.includes('--scrivi');
  const dati = JSON.parse(readFileSync(FILE, 'utf8'));
  const cambi = applica(dati);
  console.log(cambi.map((c) => `- ${c}`).join('\n'));
  if (scrivi) { writeFileSync(FILE, `${JSON.stringify(dati, null, 2)}\n`); console.log('\ndata/veicoli.json scritto.'); } else console.log('\n(prova: con --scrivi scrive data/veicoli.json)');
}
