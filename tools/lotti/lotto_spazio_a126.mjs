// Creature grandi: A.126 (campo Spazio), A.133 (portata attorno all'ingombro) e A.126–A.138 (origine dei
// coni). Risposte di Davide approvate e registrate il 15/10/2026.
//
// Scrive:
//   - data/formato_nemici.json: campo «spazio» del profilo (1 × 1, 2 × 2, 3 × 3 Q), preso dal profilo e non
//     dedotto dalla Taglia (A.126);
//   - data/mappa.json: tabella spazio → lato in Q, nota della portata (A.133) e dell'origine dei coni
//     (A.126–A.138); toglie i TODO(Davide) A.126 e A.133.
//
// Nessuna regressione: i nemici senza il campo restano come oggi (lato dalla Taglia, 1 Q se manca).
//
// Uso: node tools/lotti/lotto_spazio_a126.mjs [--controlla]
import { readFileSync, writeFileSync } from 'node:fs';

const CONTROLLA = process.argv.includes('--controlla');
const leggi = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const scrivi = (p, d) => writeFileSync(new URL(`../../${p}`, import.meta.url), `${JSON.stringify(d, null, 2)}\n`);

/** A.126: lo spazio occupato in Q, come lo scrive il profilo della creatura. */
const CAMPO_SPAZIO = {
  tipo: 'scelta',
  valori: ['1 Q', '2 × 2 Q', '3 × 3 Q'],
  obbligatorio: false,
  descrizione: 'Spazio occupato sulla mappa, in Q (A.126, risposta approvata il 15/10/2026): si usa l’ingombro indicato nel profilo e non si deduce dalla Taglia. Serve a rappresentare la pedina e a verificarne passaggio e posizionamento; resta distinto dalla portata degli attacchi (A.133). Se manca vale il lato dalla Taglia, come prima (1 Q di norma).',
};

/** Spazio → lato del token in Q. */
const SPAZIO_LATO = { '1 Q': 1, '2 × 2 Q': 2, '3 × 3 Q': 3 };

const NOTA_SPAZIO = 'A.126 (risposta approvata il 15/10/2026): il lato del token viene dal campo «spazio» del profilo (data/formato_nemici.json → spazio, tabella spazio_lato qui sotto), non dedotto dalla Taglia. Un nemico senza il campo tiene il lato della Taglia (ingombro_per_taglia), come prima; il master può sempre cambiarlo sul token.';

const NOTA_PORTATA = 'A.133 (risposta approvata il 15/10/2026): si usa la portata indicata nel profilo del singolo attacco, misurata attorno all’ingombro della creatura e non dal solo centro della pedina. Occupare 2 × 2 o 3 × 3 Q non porta la portata a 2 o 3 Q: se il profilo dice 1 Q, la portata resta 1 Q tutto attorno allo spazio occupato. Restano le normali condizioni per controllare una zona e per gli Attacchi di Opportunità (src/mappa/zoc.js); con «Mappa semplice» accesa non si calcola nulla, come per ogni automazione della mappa.';

const CONO_CREATURE = {
  fonte: 'A.126–A.138, risposta integrativa approvata il 15/10/2026',
  origine: 'perimetro',
  _origine: 'Il cono di una creatura che occupa più di un Q parte dal centro di un quadretto periferico, sul lato da cui è emesso l’effetto; per una creatura di 1 × 1 Q nulla cambia (parte dal centro del suo unico quadretto).',
  esclude_ingombro: true,
  _esclude_ingombro: 'Tutti i quadretti occupati dalla creatura sono esclusi dal suo cono, salvo eccezione espressa, e l’asse esce dall’ingombro senza attraversare altri quadretti occupati.',
  frasi_risposta: [
    'Origine coerente con l’attacco: un soffio parte dal lato della bocca, un’emissione da un’appendice ne rispetta la posizione. Se la scheda indica un punto specifico, prevale quello.',
    'Dimensioni invariate: lunghezza e ampiezza sono quelle dell’effetto, misurate dal punto d’origine scelto. La Taglia non le aumenta.',
    'Un quadretto è colpito quando almeno metà della sua superficie è coperta dal template; restano le normali regole di propagazione e ostacoli.',
    'Origine e direzione si fissano prima dei tiri e restano ferme per quell’uso dell’effetto.',
  ],
};

function applica() {
  const fn = leggi('data/formato_nemici.json');
  const m = leggi('data/mappa.json');
  const mancano = [];
  const confronta = (nome, attuale, atteso) => { if (JSON.stringify(attuale) !== JSON.stringify(atteso)) mancano.push(nome); };

  confronta('formato_nemici.campi.spazio', fn.campi.spazio, CAMPO_SPAZIO);
  confronta('mappa.token.spazio_lato', m.token.spazio_lato, SPAZIO_LATO);
  confronta('mappa.template.cono_creature', m.template.cono_creature, CONO_CREATURE);
  if (m.token['TODO(Davide)'] || m.zoc['TODO(Davide) creature grandi']) mancano.push('TODO(Davide) A.126/A.133');
  if (CONTROLLA) {
    if (mancano.length) { console.error(`lotto Spazio da riapplicare: ${mancano.join(', ')}`); process.exit(1); }
    console.log('lotto Spazio (A.126, A.133, A.126–A.138): dati aggiornati');
    return;
  }

  // A.126: il campo del profilo, subito dopo la Taglia
  const campi = {};
  for (const [k, v] of Object.entries(fn.campi)) {
    campi[k] = v;
    if (k === 'taglia') campi.spazio = CAMPO_SPAZIO;
  }
  fn.campi = campi;
  scrivi('data/formato_nemici.json', fn);

  delete m.token['TODO(Davide)'];
  m.token.spazio_lato = SPAZIO_LATO;
  m.token._nota_spazio = NOTA_SPAZIO;
  delete m.zoc['TODO(Davide) creature grandi'];
  m.zoc._nota_portata_creature = NOTA_PORTATA;
  m.template.cono_creature = CONO_CREATURE;
  scrivi('data/mappa.json', m);
  console.log('formato_nemici.json: campo «spazio»; mappa.json: tabella spazio → lato, portata (A.133) e origine dei coni (A.126–A.138).');
}

applica();
