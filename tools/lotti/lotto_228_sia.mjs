// Lotto 228 (A.295, E&L 19/11/2026) — le dotazioni SIA dell'Alleanza del 504 PE entrano nel catalogo come voci DISTINTE dalle
// dotazioni storiche ASA dei PG (Armamenti 0.87 §7.11.7, §7.21.5, §7.23.3, §7.23.6, §7.26).
//
//   Divisa d'ordinanza SIA · Divisa operativa SIA · Soprabito SIA · Soprabito SIA riservato · SIA Recon
//
// Le quattro voci ASA dei PG (divisa di servizio, divisa operativa, soprabito di ordinanza, elmetto Recon) NON si toccano nei valori.
// La vecchia voce «Soprabito ASA riservato» corrisponde al Soprabito SIA riservato: **cambia l'etichetta, l'identificativo
// resta** (`rinforzi:soprabito-asa-riservato`), così nessun file di personaggio perde il riferimento. I PG che ancora puntano
// a quella voce vanno portati prima al Soprabito di ordinanza ASA con `node tools/dotazione-asa.mjs --scrivi` (A.295: «prima di
// correggere il nome nel catalogo»); finché non lo sono, la voce resta compatibile anche con le due divise ASA, per non far
// cambiare l'AR a chi non è ancora stato portato (`compatibilita_transitoria`). Il Soprabito di ordinanza ASA non acquisisce Discreta.
//
// Uso:  node tools/lotti/lotto_228_sia.mjs [--scrivi]     (senza --scrivi dice solo che cosa farebbe; idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['lotto_228_sia.mjs'], 'lotto_228_sia.mjs');
const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const scrivi = process.argv.includes('--scrivi');
const P = (f) => join(RADICE, 'data', 'equipaggiamento', `${f}.json`);
const leggi = (f) => JSON.parse(readFileSync(P(f), 'utf8'));
const ED = 'Armamenti 0.87';
const copia = (o) => structuredClone(o);
const sostituisciSigla = (t) => (typeof t === 'string' ? t.replaceAll('Soprabito ASA riservato', 'Soprabito SIA riservato').replaceAll('Soprabito ASA', 'Soprabito SIA') : t);

const arm = leggi('armature_corporative'), rin = leggi('rinforzi'), elm = leggi('elmetti');
const trova = (f, id) => f.oggetti.find((o) => o.id === id);
const fatto = [];

const DIVISE = [['divisa-d-ordinanza-asa', 'divisa-d-ordinanza-sia', 'Divisa d’ordinanza SIA', ['Divisa SIA d’ordinanza']],
  ['divisa-operativa-asa', 'divisa-operativa-sia', 'Divisa operativa SIA', ['Divisa Operativa SIA']]];
for (const [da, id, nome, alt] of DIVISE) {
  if (trova(arm, id)) continue;
  const o = copia(trova(arm, da));
  Object.assign(o, { id, nome, nomi_alternativi: alt, versione_manuale: ED, paragrafo: '§7.11.7',
    note_manuale: o.note_manuale.replaceAll('Soprabito ASA', 'Soprabito SIA'),
    nota_sigla: 'Dotazione dell’agenzia SIA dell’Alleanza (504 PE): voce distinta dalla dotazione storica ASA dei PG della Neverlost (§7.26), con cui condivide le regole di protezione.' });
  arm.oggetti.splice(arm.oggetti.findIndex((x) => x.id === da) + 1, 0, o); // accanto alla storica
  fatto.push(`armature_corporative:${id}`);
}
const SIA_DIVISE = ['armature_corporative:divisa-d-ordinanza-sia', 'armature_corporative:divisa-operativa-sia'];
const ASA_DIVISE = ['armature_corporative:divisa-d-ordinanza-asa', 'armature_corporative:divisa-operativa-asa'];

if (!trova(rin, 'soprabito-sia')) {
  const o = copia(trova(rin, 'soprabito-asa'));
  Object.assign(o, { id: 'soprabito-sia', nome: 'Soprabito SIA', nomi_alternativi: ['Soprabito SIA di base'], versione_manuale: ED, paragrafo: '§7.23.3',
    compatibile_con: [...SIA_DIVISE], abbinamento_ottimizzato: [...SIA_DIVISE],
    nota_sigla: 'Soprabito di base dell’Alleanza (504 PE): voce distinta dal Soprabito di ordinanza ASA dei PG (§7.26).' });
  rin.oggetti.splice(rin.oggetti.findIndex((x) => x.id === 'soprabito-asa') + 1, 0, o);
  fatto.push('rinforzi:soprabito-sia');
}
const ris = trova(rin, 'soprabito-asa-riservato');
if (ris.nome !== 'Soprabito SIA riservato') {
  ris.nomi_alternativi = [...new Set(['Soprabito ASA riservato', ...(ris.nomi_alternativi ?? [])])];
  ris.nome = 'Soprabito SIA riservato';
  ris.versione_manuale = ED;
  ris.note_manuale = sostituisciSigla(ris.note_manuale);
  for (const p of ris.proprieta ?? []) p.testo = sostituisciSigla(p.testo);
  ris.compatibile_con = [...SIA_DIVISE, ...ASA_DIVISE];
  ris.abbinamento_ottimizzato = [...SIA_DIVISE, ...ASA_DIVISE];
  ris.compatibilita_transitoria = 'A.295: la voce era «Soprabito ASA riservato» e i PG la montavano sulle divise ASA. Le divise ASA restano ammesse finché i file dei PG non sono passati al Soprabito di ordinanza ASA (tools/dotazione-asa.mjs); poi si tolgono.';
  fatto.push('rinforzi:soprabito-asa-riservato → «Soprabito SIA riservato»');
}

const asa = trova(elm, 'elmetto-asa-recon');
if (!trova(elm, 'elmetto-sia-recon')) {
  const o = copia(asa);
  Object.assign(o, { id: 'elmetto-sia-recon', nome: 'SIA Recon', nomi_alternativi: ['Elmetto SIA Recon', 'Elmetto Recon SIA'], versione_manuale: ED, paragrafo: '§7.21.5',
    note_manuale: 'Elmetto specialistico dell’Alleanza (504 PE; §7.21.5): Visione notturna; Sensori 1 a vista e udito; Filtro respiratorio 2; Allerta tattica 1. Non fornisce AR; sostituisce l’elmetto standard e si acquista per intero. È il modello SIA, distinto dall’Elmetto Recon ASA dei PG (§7.26).',
    nota_sigla: 'Voce distinta dall’Elmetto Recon ASA: l’esemplare ASA ha le proprie funzioni (A.294), il SIA Recon le sue.' });
  elm.oggetti.splice(elm.oggetti.findIndex((x) => x.id === 'elmetto-asa-recon') + 1, 0, o);
  fatto.push('elmetti:elmetto-sia-recon');
}
// A.294: le funzioni dell'Elmetto Recon ASA sono sue, con la regola del filtro e dello zaino
const NOTA_A294 = 'Dotazione storica dei PG della Neverlost (Armamenti 0.87 §7.26; A.294, E&L 19/11/2026). Indossato offre visione notturna, sensori (+1 VA alle Prove di Percezione basate su vista o udito) e allerta tattica (+1 Iniziativa); il filtro respiratorio concede +2 alle PS di Tempra contro veleni e agenti patogeni inalati soltanto con la maschera in uso. Nello zaino non concede alcun beneficio. Sono proprietà del modello storico ASA, distinte da quelle del SIA Recon del 504 PE; i bonus si applicano una sola volta.';
if (asa.note_manuale !== NOTA_A294) { asa.note_manuale = NOTA_A294; fatto.push('elmetti:elmetto-asa-recon (nota A.294)'); }

console.log(fatto.length ? `Cosa cambia:\n - ${fatto.join('\n - ')}` : 'Niente da fare: il catalogo è già a posto.');
if (scrivi && fatto.length) {
  for (const [f, v] of [['armature_corporative', arm], ['rinforzi', rin], ['elmetti', elm]]) writeFileSync(P(f), `${JSON.stringify(v, null, 2)}\n`);
  console.log('scritto.');
}
