// Lotto 189: i dati tornano a citare l'edizione corrente dei manuali.
//
// Perché. Il lotto 188 ha scoperto che le etichette `versione_manuale` erano rimaste indietro di quattro, sei,
// ventiquattro versioni, e che i controlli «i dati citano il manuale» restavano verdi soltanto perché in
// `docs/manuali-txt/` viveva ancora la copia di allora. Un'etichetta vecchia non vuol dire contenuto vecchio: per
// ogni differenza fra il dato e il manuale corrente ci sono tre esiti, e questo generatore applica soltanto i
// primi due.
//
//   1. solo l'etichetta — il contenuto corrisponde già: si aggiorna `versione_manuale` e basta;
//   2. frase vecchia — il testo copiato dal manuale è cambiato senza che cambi la regola: si aggiorna la frase;
//   3. regola diversa — il manuale corrente cambia un calcolo, un numero, un limite o un comportamento: QUI NON SI
//      TOCCA NIENTE. Va elencata, spiegata, e se serve una decisione di Davide va aperta una domanda.
//
// La regola che tiene insieme il lotto: **nessun numero cambia in silenzio**. Se aggiornando una frase cambiasse
// anche un valore, quella non è una frase vecchia ma una regola diversa, e il posto giusto è l'elenco degli
// esiti 3 in `docs/diff-lotto189-2026-11-10.md`.
//
// Uso:  node tools/lotti/lotto_189_edizioni.mjs [--file=dotazioni] [--scrivi]
//       senza --scrivi dice soltanto cosa cambierebbe.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RADICE } from '../manuali.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['lotto_189_edizioni.mjs'], 'lotto_189_edizioni.mjs');
const a = {
  scrivi: process.argv.includes('--scrivi'),
  file: (process.argv.find((x) => x.startsWith('--file=')) ?? '').slice('--file='.length) || null,
};
const scrivi = a.scrivi;
/** `--file=dotazioni` è il file `dotazioni.json`, non anche `dotazioni_personali.json`. */
const pari = (f) => f.split('/').pop().replace(/\.json$/, '') === a.file;

const percorso = (f) => join(RADICE, f);
const leggi = (f) => readFileSync(percorso(f), 'utf8');

/**
 * Le sostituzioni di testo, per file. Ogni voce dice **da quale manuale** viene la frase nuova, così chi legge sa
 * dove controllarla. Sono tutte di esito 2: cambiano le parole del manuale, non la regola.
 */
const SOSTITUZIONI = {
  // Giocatore §2.16: la nomenclatura dei NEC Verdi è passata da «compatto / standard» a «1 / 3» (0.50 → 0.54).
  // Gli id del catalogo erano già `nec-verde-1` e `nec-verde-3` dal lotto 146 (A.189): cambiano solo le parole.
  // Le «100 ore» e le «40 ore» che la 0.50 citava per Lampada frontale e Scanner spariscono dalla 0.54 perché
  // quell'elettronica è ordinaria e non si conteggia (lotto 1 del 27–28/10): non erano un dato, e non lo sono.
  'data/dotazioni.json': [
    ['NEC Verdi compatti carichi', 'NEC Verdi 1 carichi'],
    ['NEC Verde compatto carico', 'NEC Verde 1 carico'],
    ['NEC Verde standard carico', 'NEC Verde 3 carico'],
    ['un NEC Verde compatto .', 'un NEC Verde 1.'],
    ['cavo e caricatore', 'cavo e alimentatore'],
    
    ['Il Corredo di analisi usa un Verde standard; il terminale palmare un Verde compatto.', 'Il Corredo di analisi usa un NEC Verde 3; il terminale palmare un NEC Verde 1.'],
    ['Il terminale palmare usa un Verde compatto.', 'Il terminale palmare usa un NEC Verde 1.'],
    ['include un Verde compatto da 100 ore', 'include un NEC Verde 1 carico'],
    ['Lo Scanner include un Verde standard da 40 ore. Cavi e alimentatori sono compresi.', 'Lo Scanner include un NEC Verde 3 carico. Cavi e alimentatori sono compresi. L’elettronica ordinaria non richiede conteggio energetico; la ricarica rientra nei normali rifornimenti (Manuale dell’Equipaggiamento, §5.4).'],
  ],
  // Magia §26.2 (1.7 → 1.11): le riserve dedicate agli effetti di armi e oggetti si chiamano Cariche Mistiche (CM)
  // e non si misurano più in PM. L'app lo fa già dal lotto 171 (`capacita_cm`, `unita: 'CM'`, `src/cariche-mistiche.js`):
  // qui resta soltanto il testo citato, che diceva ancora «si misurano in PM».
  'data/regole.json': [
    ['Sia Batterie sia Cariche si misurano in PM.', 'Le riserve dedicate agli effetti di armi e oggetti si chiamano Cariche Mistiche (CM): si registra una sola coppia CM attuali/CM massime e si spendono le CM indicate dalla singola proprietà.'],
    ['si registrano come Cariche e le relative proprietà come Esclusive', 'si registrano come Cariche Mistiche (CM) e le relative proprietà come Esclusive'],
    ['sia essa Batteria o Cariche.', 'sia essa Batteria o Cariche Mistiche.'],
    ['"nome": "Cariche",', '"nome": "Cariche Mistiche (CM)",'],
    ['"paragrafo": "Magia 1.3 §26.2, Armamenti 0.58 §7.5 (Google Doc del 02/10/2026)"', '"paragrafo": "Magia 1.11 §26.2, Armamenti 0.74 §7.5 (Google Doc del 09/11/2026)"'],
    ['Ogni riserva è Batteria o Cariche; ogni proprietà infusa', 'Ogni riserva è Batteria o Cariche Mistiche (CM); ogni proprietà infusa'],
    ['sono Batterie; le riserve integrate senza indicazione sono Cariche con proprietà Esclusive', 'sono Batterie; le riserve integrate senza indicazione sono Cariche Mistiche con proprietà Esclusive'],
  ],
  // Magia §25.4 (1.7 → 1.11): l'Artefatto con Rigenerazione consuma Cariche Mistiche, non PM, quindi
  // un'interruzione non consuma «risorse». Il motore lo fa già (lotto 173, `src/attivazioni-lunghe.js`).
  'data/incantesimi.json': [
    ['Un’interruzione precedente impedisce l’effetto senza consumare PM.', 'Un’interruzione precedente impedisce l’effetto senza consumare risorse.'],
  ],
};

/** Le etichette nuove: `versione_manuale` di ogni file che si allinea. */
const ETICHETTE = {
  'data/abilita.json': 'Giocatore 0.54 (Google Doc del 09/11/2026)',
  'data/addestramenti.json': 'Giocatore 0.54 (Google Doc del 09/11/2026)',
  'data/caratteristiche.json': 'Giocatore 0.54 (Google Doc del 09/11/2026)',
  'data/classi.json': 'Giocatore 0.54 (Google Doc del 09/11/2026)',
  'data/corporazioni.json': 'Giocatore 0.54 (Google Doc del 09/11/2026)',
  'data/dotazioni.json': 'Giocatore 0.54 (Google Doc del 09/11/2026)',
  'data/formato_nemici.json': 'Giocatore 0.54 (Google Doc del 09/11/2026); E&L del 02/10/2026, decisioni 5–9 (A.73)',
  'data/incantesimi.json': 'Magia 1.11 (Google Doc del 09/11/2026)',
  'data/mappa.json': 'Mappa di battaglia, specifica bozza 2 (Google Doc del 06/10/2026); Giocatore 0.54 §2.14, §5.1',
  'data/png_generici.json': 'Mostri 0.47 (Word del 10/11/2026); Direttore 0.46 §9.6',
  'data/regole.json': 'Giocatore 0.54; Magia 1.11; Equipaggiamento 0.30 (Google Doc del 09/11/2026); E&L del 06/10/2026',
  'data/talenti_liberi.json': 'Giocatore 0.54; Magia 1.11; Talenti v1.0 del 07/10/2026',
  'data/tecniche_interiori.json': 'Giocatore 0.54',
  'data/equipaggiamento/accessori_armi.json': 'Armamenti 0.74',
  'data/equipaggiamento/armature.json': 'Armamenti 0.74',
  'data/equipaggiamento/armature_corporative.json': 'Armamenti 0.74',
  'data/equipaggiamento/armi.json': 'Armamenti 0.74',
  'data/equipaggiamento/armi_corporative.json': 'Armamenti 0.74',
  'data/equipaggiamento/armi_distanza.json': 'Armamenti 0.74',
  'data/equipaggiamento/armi_distanza_corporative.json': 'Armamenti 0.74',
  'data/equipaggiamento/artefatti.json': 'Equipaggiamento 0.30',
  'data/equipaggiamento/comunicazione.json': 'Equipaggiamento 0.30',
  'data/equipaggiamento/corredi_dispositivi.json': 'Armamenti 0.74',
  'data/equipaggiamento/dotazioni_personali.json': 'Equipaggiamento 0.30',
  'data/equipaggiamento/elmetti.json': 'Armamenti 0.74',
  'data/equipaggiamento/esplorazione.json': 'Equipaggiamento 0.30',
  'data/equipaggiamento/impianti.json': 'Equipaggiamento 0.30',
  'data/equipaggiamento/index.json': 'Armamenti 0.74',
  'data/equipaggiamento/munizioni.json': 'Armamenti 0.74',
  'data/equipaggiamento/nec.json': 'Equipaggiamento 0.30',
  'data/equipaggiamento/rinforzi.json': 'Armamenti 0.74',
  'data/equipaggiamento/sanitario.json': 'Equipaggiamento 0.30',
  'data/equipaggiamento/scudi.json': 'Armamenti 0.74',
  'data/equipaggiamento/strumenti_professionali.json': 'Equipaggiamento 0.30',
  'data/equipaggiamento/unita_robotiche.json': 'Armamenti 0.74',
};

/**
 * Le voci **superate** di `talenti_liberi.json` citano apposta l'edizione in cui esistevano: Hacker e Sport sono
 * stati riorganizzati dalla 0.54 (Hacker è diventato una Maestria senza limite d'uso, Sport una Specializzazione)
 * e nei dati restano, marcate `categoria: "superato"` con il loro `sostituito_da`, perché i personaggi che le
 * possiedono le tengono. Il loro testo è la 0.50, e deve restare la 0.50: `fonte_edizione` lo dichiara, così il
 * controllo delle frasi sa dove cercarle invece di segnalarle come sparite dal manuale.
 */
const FONTE_EDIZIONE = { file: 'data/talenti_liberi.json', edizione: 'Giocatore 0.50' };

const cambi = [];
for (const [file, coppie] of Object.entries(SOSTITUZIONI)) {
  if (a.file && !pari(file)) continue;
  let t = leggi(file);
  for (const [da, verso] of coppie) {
    const n = t.split(da).length - 1;
    if (!n) { cambi.push(`  ⚠ ${file}: «${da.slice(0, 60)}…» non c'è più`); continue; }
    t = t.split(da).join(verso);
    cambi.push(`  ${file}: ${n} × «${da.slice(0, 55)}…»`);
  }
  if (scrivi) writeFileSync(percorso(file), t, 'utf8');
}

for (const [file, etichetta] of Object.entries(ETICHETTE)) {
  if (a.file && !pari(file)) continue;
  const t = leggi(file);
  const j = JSON.parse(t);
  if (j.versione_manuale === etichetta) continue;
  cambi.push(`  ${file}: versione_manuale «${j.versione_manuale}» → «${etichetta}»`);
  if (scrivi) {
    const vecchia = JSON.stringify(j.versione_manuale);
    const i = t.indexOf(vecchia);
    if (i < 0) throw new Error(`${file}: non trovo la vecchia versione_manuale da sostituire`);
    writeFileSync(percorso(file), t.slice(0, i) + JSON.stringify(etichetta) + t.slice(i + vecchia.length), 'utf8');
  }
}

if (!a.file || pari(FONTE_EDIZIONE.file)) {
  const j = JSON.parse(leggi(FONTE_EDIZIONE.file));
  const superate = j.talenti.filter((t) => t.categoria === 'superato');
  const senza = superate.filter((t) => !t.fonte_edizione);
  if (senza.length) {
    cambi.push(`  ${FONTE_EDIZIONE.file}: fonte_edizione «${FONTE_EDIZIONE.edizione}» su ${senza.length} voci superate (${senza.map((t) => t.id).join(', ')})`);
    if (scrivi) {
      for (const t of j.talenti) if (t.categoria === 'superato' && !t.fonte_edizione) t.fonte_edizione = FONTE_EDIZIONE.edizione;
      writeFileSync(percorso(FONTE_EDIZIONE.file), JSON.stringify(j, null, 2) + '\n', 'utf8');
    }
  }
}

console.log(cambi.join('\n') || '  niente da cambiare');
console.log(scrivi ? `\n${cambi.length} modifiche scritte.` : `\n${cambi.length} modifiche da scrivere (manca --scrivi).`);
