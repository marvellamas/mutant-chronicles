// A.162 (risposta di Davide approvata il 16/10/2026): proprietà esplicita «Indistruttibile» e tre stati
// dell'Integrità di un oggetto.
//
// «Un valore PI assente non è sufficiente a rappresentarla e non deve essere interpretato come
// indistruttibilità o come oggetto già rotto»:
//   - integrità ordinaria: PS Integrità e PI come sempre;
//   - Indistruttibile: dicitura esplicita nella scheda; il danneggiamento non toglie PI e non rompe;
//   - Integrità da definire: il dato manca, si segnala e si completa quando serve.
// La proprietà vale per lo Scrigno del Primo Giuramento (Equipaggiamento §10.12, Magia §28.2), con la
// regola che il danneggiamento non consente di forzarne l'apertura. Non si estende da sola ad altri
// oggetti: solo quando la loro scheda lo prevede.
//
// Scrive data/regole.json → integrita.stati e aggiunge lo Scrigno a data/equipaggiamento/artefatti.json.
//
// Uso: node tools/lotti/lotto_integrita_a162.mjs [--controlla]
import { readFileSync, writeFileSync } from 'node:fs';

const CONTROLLA = process.argv.includes('--controlla');
const leggi = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const scrivi = (p, d) => writeFileSync(new URL(`../../${p}`, import.meta.url), `${JSON.stringify(d, null, 2)}\n`);

/** I tre stati dell'Integrità di un oggetto (A.162). L'assenza del campo vale «ordinaria». */
const STATI = {
  fonte: 'A.162, risposta approvata il 16/10/2026; Equipaggiamento §§1.7 e 10.12, Magia §28.2',
  predefinito: 'ordinaria',
  elenco: [
    {
      id: 'ordinaria',
      nome: 'Integrità ordinaria',
      testo: 'Si applica la gestione normale di PS Integrità e PI.',
      pi: true,
    },
    {
      id: 'indistruttibile',
      nome: 'Indistruttibile',
      etichetta: 'Indistruttibile',
      testo: 'Il danneggiamento non provoca perdita di PI o rottura.',
      pi: false,
    },
    {
      id: 'da_definire',
      nome: 'Integrità da definire',
      etichetta: 'Integrità da definire',
      testo: 'Il dato manca e va completato quando serve. Non vale come indistruttibile e non vale come oggetto rotto.',
      pi: false,
      avviso: true,
    },
  ],
  _nota: 'Campo «integrita» della voce di catalogo (o della voce personalizzata): uno dei tre id. Senza campo vale «ordinaria», come tutti gli oggetti di sempre. Un PI assente non significa indistruttibile: senza PI e senza campo l’oggetto semplicemente non si traccia (src/protezione.js → oggettiConPi).',
  _nota_estensione: 'A.162: la proprietà è riutilizzabile per altri oggetti soltanto quando la loro scheda la prevede. Non si estende ai Sigilli, al contenuto dello Scrigno, né a un oggetto per il fatto di essere un Artefatto o una reliquia.',
};

/** Scrigno del Primo Giuramento (Equipaggiamento §10.12, Magia §28.2): primo oggetto Indistruttibile. */
const SCRIGNO = {
  id: 'scrigno-del-primo-giuramento',
  nome: 'Scrigno del Primo Giuramento',
  tipo: 'artefatto',
  catalogo: 'Artefatti di campagna',
  famiglia: 'Artefatti',
  nomi_alternativi: [],
  paragrafo: 'Equipaggiamento §10.12; Magia §28.2',
  versione_manuale: 'Equipaggiamento 0.8 / Magia 1.5 (15/10/2026); A.162 del 16/10/2026',
  peso: null,
  costo: null,
  integrita: 'indistruttibile',
  _nota_integrita: 'A.162: proprietà Indistruttibile attiva. Il danneggiamento non toglie PI e non rompe lo Scrigno, e **non consente di forzarne l’apertura**: le autorizzazioni di apertura seguono la sua scheda. La proprietà non si estende ai Sigilli né al contenuto.',
  effetto_breve: 'Scrigno indistruttibile: il danneggiamento non lo apre. Le autorizzazioni di apertura seguono la sua scheda.',
  proprieta: [],
  _nota: 'Artefatto di campagna del Manuale della Magia §28.2. Peso, prezzo e Reperibilità non sono indicati dai manuali: restano da completare. La schermatura dei Contenitori del Silenzio è un’altra cosa (A.163, §10.13).',
};

function applica() {
  const r = leggi('data/regole.json');
  const art = leggi('data/equipaggiamento/artefatti.json');
  const mancano = [];
  if (JSON.stringify(r.integrita.stati) !== JSON.stringify(STATI)) mancano.push('regole.integrita.stati');
  const i = art.oggetti.findIndex((o) => o.id === SCRIGNO.id);
  if (i < 0 || JSON.stringify(art.oggetti[i]) !== JSON.stringify(SCRIGNO)) mancano.push('artefatti:scrigno-del-primo-giuramento');
  if (CONTROLLA) {
    if (mancano.length) { console.error(`lotto Indistruttibile da riapplicare: ${mancano.join(', ')}`); process.exit(1); }
    console.log('lotto Indistruttibile (A.162): dati aggiornati');
    return;
  }
  r.integrita.stati = STATI;
  scrivi('data/regole.json', r);
  if (i >= 0) art.oggetti[i] = SCRIGNO; else art.oggetti.push(SCRIGNO);
  scrivi('data/equipaggiamento/artefatti.json', art);
  console.log('regole.json: tre stati dell’Integrità; artefatti.json: Scrigno del Primo Giuramento (Indistruttibile).');
}

applica();
