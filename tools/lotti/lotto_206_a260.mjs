// Lotto 206 (16/11/2026), parte C — **A.260: la CyberArma convertita si alimenta a Round, non a colpi.**
//
// La storia, perché conta più della riga di codice. La **A.236** del 02/11 dava il consumo «per 10 Round»; la
// **A.251** del 06/11, più recente, lo dava «ogni 10 colpi», e l'app ha seguito quella. Gli **Armamenti 0.83**,
// pubblicati dopo entrambe, tornavano a dire 10 Round «indipendentemente dal numero di attacchi»: era la A.260,
// l'unico punto in cui pensavamo che l'app stesse facendo la cosa sbagliata, e l'abbiamo chiesto.
//
// **Davide ha risposto il 15/11/2026** e la risposta conferma il manuale:
//
//   «La CyberArma convertita è un'arma ravvicinata e non effettua Raffiche. L'attivazione consuma 1 CM intero
//   oppure 1 carica intera di NeC rosso e alimenta la manifestazione per 10 Round consecutivi, indipendentemente
//   da attacchi, colpi o Azioni. Trascorsi i 10 Round serve una nuova carica. Non si usano frazioni; il
//   precedente riferimento a «10 colpi» è superato. Gli altri costi restano invariati.»
//
// Quindi non è più «un manuale contro una risposta» (il caso della A.270): è una **risposta che supera una
// risposta**, e si applica la più recente. La A.260 passa fra le risolte e il TODO(Davide) esce dai dati.
//
//   node tools/lotti/lotto_206_a260.mjs            — che cosa cambierebbe
//   node tools/lotti/lotto_206_a260.mjs --scrivi   — applica
import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

const FILE = 'data/equipaggiamento/armi.json';

/** I Round che una carica alimenta, dalla risposta A.260. Non si scrive in nessun modulo: sta nei dati. */
export const ROUND_A260 = 10;

/**
 * Il piano: ogni posto in cui la regola dei colpi è scritta, e come diventa.
 * Si lavora sui blocchi per nome e non per posizione, così un file riordinato non manda fuori strada il lotto.
 */
export function piano(radice = '.') {
  const json = JSON.parse(readFileSync(`${radice}/${FILE}`, 'utf8'));
  const cambi = [];
  // i blocchi stanno sulle voci della CyberArma, non in un blocco di regole del file: si cercano per contenuto
  const voci = (json.oggetti ?? []).filter((o) => o.alimentazione_modifiche || o.uso_per_classe);
  if (!voci.length) throw new Error('nessuna voce con alimentazione_modifiche o uso_per_classe in armi.json');
  const cy = voci.find((o) => o.alimentazione_modifiche) ?? voci[0];

  for (const f of cy.alimentazione_modifiche?.famiglie ?? []) {
    if (!f.consumo) continue;
    if (f.consumo.ogni_colpi === undefined) continue;
    const quanto = f.consumo.cm ? `${f.consumo.cm} CM` : `${f.consumo.cariche} carica NeC ${f.consumo.colore}`;
    cambi.push({
      dove: `alimentazione_modifiche.${f.id}.consumo`,
      prima: f.consumo.testo,
      dopo: `${quanto} + ${f.consumo.azione} · ${ROUND_A260} Round`,
      applica: () => {
        delete f.consumo.ogni_colpi;
        f.consumo.round = ROUND_A260;
        f.consumo.testo = `${quanto} + ${f.consumo.azione} · ${ROUND_A260} Round`;
        f.consumo.indipendente_dagli_attacchi = true;
        f.testo = String(f.testo ?? '')
          .replace(/Consumo: [^.]+\./, `Consumo: ${quanto} + ${f.consumo.azione} per ${ROUND_A260} Round consecutivi, indipendentemente da attacchi, colpi o Azioni (A.260).`);
      },
    });
  }

  for (const voce of voci) for (const c of voce.uso_per_classe?.classi ?? []) {
    if (c.ogni_colpi === undefined) continue;
    cambi.push({
      dove: `${voce.id}.uso_per_classe.${c.classe}`,
      prima: `ogni_colpi ${c.ogni_colpi}${c.round ? `, round ${c.round}` : ''}`,
      dopo: c.ammesso === false ? `(solo il testo: questo impiego non è ammesso su un esemplare convertito)` : `round ${ROUND_A260}`,
      applica: () => {
        delete c.ogni_colpi;
        if (c.ammesso !== false) c.round = ROUND_A260;
        c.testo = String(c.testo ?? '')
          .replace(/,?\s*1 CM ogni 10 colpi,/, ' 1 CM per 10 Round,')
          .replace(/arma manifestata per 10 colpi/, 'arma manifestata per 10 Round')
          .replace(/\(A\.251: ([^)]*?)ogni 10 colpi;/, '(A.260: $1· 10 Round, indipendentemente da attacchi, colpi o Azioni;');
      },
    });
  }

  if (cy.alimentazione_modifiche?.['TODO(Davide)']) {
    cambi.push({
      dove: 'alimentazione_modifiche.TODO(Davide)',
      prima: cy.alimentazione_modifiche['TODO(Davide)'],
      dopo: '(tolto: A.260 risolta)',
      applica: () => {
        delete cy.alimentazione_modifiche['TODO(Davide)'];
        cy.alimentazione_modifiche._nota_a260 =
          'A.260 (Davide, 15/11/2026): l’attivazione di una conversione consuma 1 CM intero, oppure 1 carica intera di NeC Rosso, e alimenta la manifestazione per 10 Round consecutivi, indipendentemente da attacchi, colpi o Azioni; trascorsi i 10 Round serve una nuova carica. Non si usano frazioni. Il «ogni 10 colpi» della A.251 è superato. La CyberArma convertita è un’arma ravvicinata e non effettua Raffiche.';
      },
    });
  }

  if (!cy.ravvicinata_senza_raffiche) {
    cambi.push({
      dove: 'cyberarma.ravvicinata_senza_raffiche',
      prima: '(assente)',
      dopo: 'true',
      applica: () => {
        cy.ravvicinata_senza_raffiche = true;
        cy._nota_ravvicinata =
          'A.260 (15/11/2026): la CyberArma è un’arma ravvicinata e non effettua Raffiche, in nessuna configurazione. Oggi nessuna delle tre voci ha modalità di fuoco e «Attacca!» non le offrirebbe, ma la regola è scritta perché un domani non torni per sbaglio: tests/a260-cyberarma-round.test.js fallisce se una modalità di Raffica compare su una CyberArma.';
      },
    });
  }
  return { json, cambi, cy, voci };
}

export function applica(p, radice = '.') {
  for (const c of p.cambi) c.applica();
  writeFileSync(`${radice}/${FILE}`, JSON.stringify(p.json, null, 1) + '\n');
  return p.cambi.length;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['lotto_206_a260.mjs'], 'lotto_206_a260.mjs');
  const p = piano();
  console.log(`A.260: ${p.cambi.length} posti da cambiare.`);
  for (const c of p.cambi) console.log(`  ${c.dove}\n    da: ${String(c.prima).slice(0, 110)}\n    a:  ${String(c.dopo).slice(0, 110)}`);
  if (process.argv.includes('--scrivi')) console.log(`Scritti ${applica(p)} cambi in ${FILE}.`);
  else console.log('(niente scritto: --scrivi per applicare)');
}
