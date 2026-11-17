// Lotto 212 (17/11/2026) — **l'Equipaggiamento 0.42 nei dati: i pesi e i costi che il manuale ha e i dati no, e le etichette dove tutto torna.**
//
// Il confronto 0.30 → 0.42 sono 363 righe; la 0.41 → 0.42 è una sola, il §10.14 nuovo (Collana di papiro dei Mutanti: lotto lunare, non qui).
// Il lettore (tools/importa-equipaggiamento.mjs) provato sulla 0.30, da cui i dati vengono, trova 2 scarti — entrambi **dati rimasti indietro**
// già rispetto alla 0.30 (non difetti del lettore) — e sulla 0.42 un terzo, vero: il Corredo da assalto verticale passa da 4 a 5 kg.
// Esito per ciascuno: **numero del manuale** (nessuna regola da decidere: un peso, un costo). Nel testo (non in tabella) il Corredo di
// sopravvivenza ambientale passa anch'esso a 5 kg (§3.4).
//
//   node tools/lotti/lotto_212_equipaggiamento.mjs            — che cosa scriverebbe
//   node tools/lotti/lotto_212_equipaggiamento.mjs --scrivi   — applica (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

const ED = 'Equipaggiamento 0.42';
export const CORREZIONI = [
  { file: 'esplorazione', id: 'corredo-da-assalto-verticale', campo: 'peso', da: 4, a: 5, dove: '§3.3 (tabella «Oggetto | Beneficio | Peso | Costo»)' },
  { file: 'esplorazione', id: 'corredo-di-sopravvivenza-ambientale', campo: 'peso', da: 4, a: 5, dove: '§3.4 (testo: «Peso 5 kg, costo 1.500»)' },
  { file: 'esplorazione', id: 'corredo-da-cucina-da-campo', campo: 'costo', da: 150, a: 500, dove: '§3.x (tabella; 500 già nella 0.30: il dato era rimasto indietro)' },
  { file: 'comunicazione', id: 'comunicatore-personale', campo: 'peso', da: 0.1, a: 0.2, dove: '§4 (tabella «Dispositivo | Portata | Peso | REP | Costo»; 0,2 kg già nella 0.30)' },
];
/** I file che passano all'etichetta 0.42: nessun'altra riga della 0.30→0.42 li tocca (verificato sul diff). */
export const FILE_ALLINEATI = ['comunicazione', 'dotazioni_personali', 'esplorazione', 'impianti', 'sanitario', 'strumenti_professionali'];

export function piano(radice = '.') {
  const out = []; const file = {};
  for (const f of FILE_ALLINEATI) file[f] = JSON.parse(readFileSync(`${radice}/data/equipaggiamento/${f}.json`, 'utf8'));
  for (const c of CORREZIONI) {
    const o = file[c.file].oggetti.find((x) => x.id === c.id);
    if (!o) throw new Error(`${c.file}: ${c.id} non trovato`);
    if (o[c.campo] === c.a) continue;
    if (o[c.campo] !== c.da) throw new Error(`${c.id}.${c.campo} vale ${o[c.campo]}, né ${c.da} né ${c.a}: non lo tocco`);
    o[c.campo] = c.a; o.versione_manuale = `${ED} (${c.dove.split(' ')[0]})`;
    out.push(`${c.id}.${c.campo}: ${c.da} → ${c.a}`);
  }
  for (const f of FILE_ALLINEATI) file[f].versione_manuale = ED;
  return { file, cambi: out };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_212_equipaggiamento.mjs'], 'lotto_212_equipaggiamento.mjs');
  const p = piano();
  for (const c of p.cambi) console.log('  ' + c);
  if (argv.includes('--scrivi')) {
    for (const f of FILE_ALLINEATI) {
      const percorso = `data/equipaggiamento/${f}.json`; const nuovo = `${JSON.stringify(p.file[f], null, 2)}\n`;
      if (nuovo !== readFileSync(percorso, 'utf8')) { writeFileSync(percorso, nuovo); console.log(`scritto ${percorso}`); }
    }
  } else console.log('(prova: niente scritto; --scrivi per applicare)');
}
