// A.163 (precisazione di Davide registrata il 16/10/2026): i Contenitori del Silenzio schermano
// **qualsiasi** contenuto, non solo gli oggetti di Park. «L'indicazione Schermatura attiva/inattiva deve
// dipendere dalle condizioni del contenitore e dal contenimento completo, senza controllare l'appartenenza
// a un elenco riservato.»
//
// Tre condizioni, tutte necessarie: contenuto interamente riposto, contenitore chiuso, schermatura integra.
// La schermatura contiene emanazioni e potere corruttivo; **non elimina** la Corruzione dell'oggetto né
// quella già accumulata dai personaggi. L'app mostra l'indicazione e la regola: nessun calcolo automatico
// della Corruzione (CLAUDE.md: avvisa, non blocca).
//
// Scrive regole.json → schermatura e i tre contenitori in data/equipaggiamento/dotazioni_personali.json
// (Equipaggiamento §10.13; Magia §28.3; Armamenti §7.25.1 per la Custodia).
//
// Uso: node tools/lotti/lotto_schermatura_a163.mjs [--controlla]
import { readFileSync, writeFileSync } from 'node:fs';

const CONTROLLA = process.argv.includes('--controlla');
const leggi = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const scrivi = (p, d) => writeFileSync(new URL(`../../${p}`, import.meta.url), `${JSON.stringify(d, null, 2)}\n`);

const SCHERMATURA = {
  fonte: 'A.163, precisazione approvata il 16/10/2026; Equipaggiamento §10.13, Magia §28.3',
  nome: 'Schermatura',
  attiva: 'Schermatura attiva',
  inattiva: 'Schermatura inattiva',
  // le tre condizioni, tutte necessarie; nessuna riguarda che cosa c'è dentro
  condizioni: [
    { id: 'riposto', nome: 'Contenuto interamente riposto', motivo: 'il contenuto non è interamente riposto' },
    { id: 'chiuso', nome: 'Contenitore chiuso', motivo: 'il contenitore è aperto' },
    { id: 'integra', nome: 'Schermatura integra', motivo: 'la schermatura è compromessa (contenitore rotto)' },
  ],
  qualsiasi_contenuto: true,
  _qualsiasi_contenuto: 'A.163: la proprietà appartiene al contenitore e vale per qualunque contenuto interamente riposto. CyberArma, armatura, anello e amuleto sono esempi d’uso, non un elenco di oggetti ammessi: origine, proprietario o tipologia non sono requisiti. L’app non controlla che cosa c’è dentro.',
  non_elimina: 'La schermatura contiene le emanazioni e il potere corruttivo del contenuto: non elimina la Corruzione dell’oggetto né quella già accumulata dai personaggi.',
  nessun_calcolo: 'L’app mostra l’indicazione e la regola; non calcola la Corruzione e non cambia valori. Lo stato «chiuso» e «contenuto riposto» si cambiano con un tocco nella riga dell’oggetto.',
  capienza: 'Dimensioni e capienza restano quelle del contenitore: niente spazio extradimensionale, niente alleggerimento. Il peso del contenuto si somma a quello del contenitore.',
};

/** Parte comune dei tre Contenitori del Silenzio (§10.13). */
const comune = {
  tipo: 'altro',
  catalogo: 'Artefatti di campagna',
  famiglia: 'Contenitori e trasporto',
  nomi_alternativi: [],
  versione_manuale: 'Equipaggiamento 0.8 / Magia 1.5 (15/10/2026); A.163 del 16/10/2026',
  costo: null,
  // §10.13: «Qualità, PI, PS Integrità, costo e REP dei tre manufatti restano da definire»
  integrita: 'da_definire',
  proprieta: [],
  schermatura: {
    corruzione: 1,
    snt: 0,
    fonte: 'Equipaggiamento §10.13; Magia §28.3; A.163',
    testo: 'Chiuso e integro, con il contenuto interamente riposto, scherma le emanazioni e il potere corruttivo di qualunque contenuto (Corruzione 1). Aprirlo o comprometterne la chiusura la fa cessare; richiuderlo integro la ripristina senza Prove né PM.',
  },
};

const CONTENITORI = [
  {
    ...comune,
    id: 'custodia-del-silenzio',
    nome: 'Custodia del Silenzio',
    paragrafo: 'Armamenti §7.25.1; Equipaggiamento §10.13.1; Magia §28.3',
    peso: 0.3,
    effetto_breve: 'Cilindro di cuoio, 30 × 6 cm: chiuso e integro scherma qualunque contenuto interamente riposto (Corruzione 1). SnT 0, nessun costo in PM.',
    _nota: 'Cuoio semplice marrone scuro, cilindro lungo 30 cm e di 6 cm di diametro, con cappuccio a linguetta e passante per la cintura; imbottitura per impugnatura e condensatore (l’alloggiamento è pensato per la CyberArma disattivata, ma la schermatura vale per qualsiasi contenuto: A.163). Non è indistruttibile: cuoio e legno seguono le normali regole di Integrità. Qualità, PI, PS Integrità, costo e Reperibilità restano da definire (§10.13).',
  },
  {
    ...comune,
    id: 'zaino-del-silenzio',
    nome: 'Zaino del Silenzio',
    paragrafo: 'Equipaggiamento §10.13.2; Magia §28.3',
    peso: 2,
    effetto_breve: 'Zaino di cuoio, 60 × 40 × 25 cm: chiuso e integro scherma qualunque contenuto interamente riposto (Corruzione 1).',
    _nota: 'Cuoio marrone scuro, due spallacci regolabili e maniglia superiore, apertura a cordoncino con patta e due fibbie; fodera imbottita e cinghie interne (l’alloggiamento è pensato per un’armatura ripiegata, ma la schermatura vale per qualsiasi contenuto che entri interamente e permetta la chiusura completa: A.163). Qualità, PI, PS Integrità, costo e Reperibilità restano da definire (§10.13).',
  },
  {
    ...comune,
    id: 'cofanetto-del-silenzio',
    nome: 'Cofanetto del Silenzio',
    paragrafo: 'Equipaggiamento §10.13.3; Magia §28.3',
    peso: 0.4,
    effetto_breve: 'Cofanetto di legno, 20 × 14 × 8 cm, due alloggiamenti: chiuso e integro scherma qualunque contenuto interamente riposto (Corruzione 1 ciascuno).',
    _nota: 'Legno scuro opaco con coperchio incernierato e fermaglio metallico, rivestimento interno in cuoio con due alloggiamenti imbottiti (pensati per anello e amuleto, ma la schermatura vale per qualsiasi contenuto: A.163); scherma contemporaneamente entrambi gli alloggiamenti. Qualità, PI, PS Integrità, costo e Reperibilità restano da definire (§10.13).',
  },
];

function applica() {
  const r = leggi('data/regole.json');
  const dot = leggi('data/equipaggiamento/dotazioni_personali.json');
  const mancano = [];
  if (JSON.stringify(r.schermatura) !== JSON.stringify(SCHERMATURA)) mancano.push('regole.schermatura');
  for (const c of CONTENITORI) {
    const i = dot.oggetti.findIndex((o) => o.id === c.id);
    if (i < 0 || JSON.stringify(dot.oggetti[i]) !== JSON.stringify(c)) mancano.push(`dotazioni_personali:${c.id}`);
  }
  if (CONTROLLA) {
    if (mancano.length) { console.error(`lotto schermatura da riapplicare: ${mancano.join(', ')}`); process.exit(1); }
    console.log('lotto schermatura (A.163): dati aggiornati');
    return;
  }
  r.schermatura = SCHERMATURA;
  scrivi('data/regole.json', r);
  for (const c of CONTENITORI) {
    const i = dot.oggetti.findIndex((o) => o.id === c.id);
    if (i >= 0) dot.oggetti[i] = c; else dot.oggetti.push(c);
  }
  scrivi('data/equipaggiamento/dotazioni_personali.json', dot);
  console.log(`regole.json: schermatura; dotazioni_personali.json: ${CONTENITORI.length} Contenitori del Silenzio.`);
}

applica();
