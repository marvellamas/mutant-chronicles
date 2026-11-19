// Lotto 227 — A.288 (Davide, 19/11/2026): gli attacchi per forma dei licantropi e i bersagli dell'Ammantato.
//
// Scrive nelle schede di esempi/nemici/mostri/ le configurazioni a n forme con gli attacchi di ciascuna (tabella unica:
// CONFIGURAZIONI_A273 di tools/importa-mostri.mjs, che è anche quello che l'importatore scrive), i limiti per Round e le note
// dell'Ammantato. Idempotente: senza --scrivi dice che cosa cambierebbe. Non tocca nessun altro campo (la regola del lotto 204:
// una lettura incompleta non si scrive mai sopra un valore buono) e non inventa nessuna forma: i valori vengono dal manuale.
//   node tools/lotti/lotto_227_forme.mjs [--scrivi]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CONFIGURAZIONI_A273, LIMITI_A288, NOTE_ATTACCHI_A288 } from '../importa-mostri.mjs';

const DIR = fileURLToPath(new URL('../../esempi/nemici/mostri/', import.meta.url));
const scrivi = process.argv.includes('--scrivi');
let cambiate = 0;

for (const id of Object.keys(CONFIGURAZIONI_A273)) {
  const file = `${DIR}${id}.json`;
  const testo = readFileSync(file, 'utf8');
  const s = JSON.parse(testo);
  const conf = CONFIGURAZIONI_A273[id].map(([cid, nome, spazio, movimento, nota, attacchi]) => ({ id: cid, nome, spazio, ...(movimento ? { movimento } : {}), ...(nota ? { nota } : {}), ...(attacchi ? { attacchi } : {}) }));
  // ogni nome di attacco dichiarato per una forma deve esistere nella scheda: altrimenti ci si ferma, non si scrive niente
  for (const c of conf) for (const a of c.attacchi ?? []) if (!s.attacchi.some((x) => x.nome === a)) throw new Error(`${id}: la forma «${c.id}» nomina l'attacco «${a}», che la scheda non ha`);
  s.configurazioni = conf;
  if (LIMITI_A288[id]) s.limiti_attacco = LIMITI_A288[id];
  for (const [nomeAtt, nota] of Object.entries(NOTE_ATTACCHI_A288[id] ?? {})) {
    const a = s.attacchi.find((x) => x.nome === nomeAtt);
    if (!a) throw new Error(`${id}: attacco «${nomeAtt}» non trovato`);
    a.note = nota;
  }
  const nuovo = `${JSON.stringify(s, null, 2)}\n`;
  if (nuovo === testo) { console.log(`${id}: già a posto`); continue; }
  cambiate += 1;
  console.log(`${id}: ${conf.map((c) => c.id).join(' / ')}${LIMITI_A288[id] ? ' · limite per Round' : ''}${NOTE_ATTACCHI_A288[id] ? ' · note dell\'attacco' : ''}`);
  if (scrivi) writeFileSync(file, nuovo);
}
console.log(scrivi ? `\nScritte ${cambiate} schede.` : `\n${cambiate} schede cambierebbero (nessun file toccato; --scrivi per scrivere).`);
