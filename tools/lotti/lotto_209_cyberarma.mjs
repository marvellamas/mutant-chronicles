// Lotto 209 (17/11/2026), parte B — **A.271: la voce `cyberarma-batteria-verde` non offre più i PM personali.**
//
// Che cosa c'era di sbagliato. La **A.236** del 02/11 diceva che la CyberArma con la riserva interna di CM lascia
// «disponibile l'alternativa dei PM personali»; la **A.251** del 06/11, più recente, dice l'opposto: la riserva
// interna (e la conversione a NeC) è l'**unica** alimentazione, i PM personali si perdono e con loro le proprietà da
// Custode. La voce `cyberarma-batteria-verde` ha tenuto le due cose: la riga del Tecnomante dichiarava `cm: 1` **e**
// `pm: 2`, e la scheda offriva accanto ad «Attiva» il pulsante «con i PM personali» (`alternativaPm`). Una riserva
// interna e i PM personali insieme sono quello che il manuale esclude (Armamenti 0.86 §7.25: «Dopo l'installazione
// non è più possibile alimentare la CyberArma con PM personali»).
//
// Perché si vede ora. La risposta alla A.271 (E&L, raccordo dell'11 novembre) dice che la CyberArma di Dimitri ha
// un focalizzatore Verde e **nessuna** SIN, riserva di CM o NeC; nel suo file è questa voce, con 5 CM. La voce
// sbagliata si corregge con `tools/correggi-cyberarma-dimitri.mjs`; questo lotto toglie dal catalogo l'incoerenza che
// permetteva di non accorgersene (un'arma «con riserva» che si accende comunque coi PM).
//
//   node tools/lotti/lotto_209_cyberarma.mjs            — che cosa cambierebbe
//   node tools/lotti/lotto_209_cyberarma.mjs --scrivi   — applica
//
// Nessun numero cambia per la riserva (1 CM + 1 AzP per 10 Round, A.260): si toglie soltanto l'alternativa che il
// manuale esclude. Il generatore è idempotente: rilanciato non trova più niente.
import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

const FILE = 'data/equipaggiamento/armi.json';
const VOCI_CONVERSIONE = ['cyberarma-batteria-verde', 'cyberarma-nec'];
const NOTA = 'A.271 (Davide, E&L 11/11/2026, Armamenti 0.86 §7.25): una conversione energetica (riserva interna di CM, NeC) è l’unica alimentazione e i PM personali si perdono (A.251). Questa riga non offre più l’alternativa dei PM personali che la A.236 aveva lasciato.';

/** Il piano: per ogni voce di conversione, le righe `uso_per_classe` che dichiarano insieme riserva e `pm`. */
export function piano(radice = '.') {
  const json = JSON.parse(readFileSync(`${radice}/${FILE}`, 'utf8'));
  const cambi = [];
  for (const id of VOCI_CONVERSIONE) {
    const v = (json.oggetti ?? []).find((o) => o.id === id);
    if (!v) throw new Error(`voce «${id}» non trovata in armi.json`);
    for (const riga of v.uso_per_classe?.classi ?? []) {
      const conRiserva = Number.isFinite(riga.cm) || Number.isFinite(riga.nec) || Number.isFinite(riga.cariche);
      if (conRiserva && Number.isFinite(riga.pm)) cambi.push({ voce: id, classe: riga.classe, prima: { pm: riga.pm, cm: riga.cm ?? null, nec: riga.nec ?? null }, riga });
    }
  }
  return { json, cambi };
}

/** Applica il piano: `pm` a null e il testo senza l'alternativa. Torna la lista dei cambi fatti. */
export function applica(json, cambi) {
  for (const c of cambi) {
    c.riga.pm = null;
    c.riga.testo = String(c.riga.testo ?? '')
      .replace(/ oppure 2 PM personali/g, '')
      .replace(/1 AzP e 1 CM della riserva interna, oppure \d+ PM personali/g, '1 AzP e 1 CM della riserva interna')
      .replace(/ \(revisione «Cariche Mistiche», A\.236\)/g, ' (A.236, A.251)');
    c.riga._a271 = NOTA;
  }
  return cambi.map(({ voce, classe, prima }) => ({ voce, classe, prima }));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_209_cyberarma.mjs'], 'lotto_209_cyberarma.mjs');
  const { json, cambi } = piano();
  if (!cambi.length) { console.log('Niente da cambiare: nessuna riga con riserva interna e PM personali insieme.'); process.exit(0); }
  for (const c of cambi) console.log(`${c.voce} · ${c.classe}: pm ${c.prima.pm} e ${c.prima.cm !== null ? `${c.prima.cm} CM` : `NeC ${c.prima.nec}`} insieme → solo la riserva`);
  if (!argv.includes('--scrivi')) { console.log('\n(dry-run: --scrivi per applicare)'); process.exit(0); }
  applica(json, cambi);
  writeFileSync(FILE, `${JSON.stringify(json, null, 1)}\n`);
  console.log(`\nScritto ${FILE}.`);
}
