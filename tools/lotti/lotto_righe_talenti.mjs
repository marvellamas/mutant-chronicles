// Talenti v1.0 (25/10/2026, sera): la riga breve («che cosa fa») delle due voci per cui la prima frase utile del testo non lo
// dice. Il resto delle righe si ricava dal testo stesso (src/talenti-testi.js → rigaBreve). Ogni riga qui sotto riassume
// frasi del testo della voce (file dei Talenti del 7/10), senza aggiungere regole.
//   node tools/lotti/lotto_righe_talenti.mjs            mostra che cosa cambierebbe
//   node tools/lotti/lotto_righe_talenti.mjs --scrivi   scrive i dati
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RIGHE = {
  'data/talenti_liberi.json': {
    'arti-marziali-migliorate': '+1 VA agli attacchi senz’armi e alle Prove di Difese contro attacchi Ravvicinati mentre combatte senz’armi; da solo non permette di parare a mani nude.',
  },
  'data/specializzazioni.json': {
    'specializzazione-sport': '+3 VA ad Atletica in una sola disciplina sportiva scelta all’acquisizione, anche fuori dalle competizioni; non vale per attacchi, Difese o Prove Salvezza.',
  },
};

const scrivi = process.argv.includes('--scrivi');
for (const [file, righe] of Object.entries(RIGHE)) {
  const p = fileURLToPath(new URL(`../../${file}`, import.meta.url));
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const elenco = j.talenti ?? j.specializzazioni;
  for (const [id, riga] of Object.entries(righe)) {
    const v = elenco.find((x) => x.id === id);
    if (!v) throw new Error(`${file}: manca ${id}`);
    console.log(`${file} → ${id}: ${v.riga === riga ? 'già a posto' : `riga = «${riga}»`}`);
    v.riga = riga;
  }
  if (scrivi) writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}
if (!scrivi) console.log('(nessun file scritto: aggiungi --scrivi)');
