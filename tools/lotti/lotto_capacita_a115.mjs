// Capacità dei nemici: A.115 (risposta approvata il 15/10/2026). «L'app deve mostrare la descrizione completa
// della capacità e gestire le Prove, i costi in Azioni, il consumo di risorse e i limiti d'uso espressamente
// previsti dal profilo»; «le capacità passive non richiedono Azioni soltanto quando sono dichiarate tali»;
// «non si assegnano costi, Prove o effetti aggiuntivi per analogia quando mancano i dati».
//
// Scrive data/formato_nemici.json: campi facoltativi della voce «capacita» (prova, azioni, risorsa, usi,
// passiva), che si aggiungono a nome, effetto, costo e limiti già presenti. Chi non li ha resta com'è: si
// mostra il solo testo, senza inventare nulla.
//
// Uso: node tools/lotti/lotto_capacita_a115.mjs [--controlla]
import { readFileSync, writeFileSync } from 'node:fs';

const CONTROLLA = process.argv.includes('--controlla');
const leggi = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const scrivi = (p, d) => writeFileSync(new URL(`../../${p}`, import.meta.url), `${JSON.stringify(d, null, 2)}\n`);

const CAMPI = {
  nome: { tipo: 'testo', obbligatorio: true },
  effetto: { tipo: 'testo', obbligatorio: true, descrizione: 'Descrizione completa della capacità, come la scrive il profilo (A.115): si mostra sempre per intero.' },
  costo: { tipo: 'testo', obbligatorio: false },
  limiti: { tipo: 'testo', obbligatorio: false },
  // A.115: i parametri della risoluzione, solo quando il profilo li dà
  passiva: { tipo: 'vero_falso', obbligatorio: false, descrizione: 'Vero solo se il profilo dichiara la capacità passiva (A.115): allora non richiede Azioni. Senza il campo non si presume nulla.' },
  prova: { tipo: 'testo', obbligatorio: false, descrizione: 'Prova richiesta dal profilo, come la scrive («PS di Volontà», «Prova di Atletica −2»). A.115: non si aggiunge una Prova per analogia.' },
  azioni: {
    tipo: 'oggetto',
    obbligatorio: false,
    descrizione: 'Costo in Azioni dichiarato dal profilo (A.115).',
    campi: {
      principali: { tipo: 'intero', min: 0, obbligatorio: false, descrizione: 'AzP.' },
      movimento: { tipo: 'intero', min: 0, obbligatorio: false, descrizione: 'AzM.' },
      testo: { tipo: 'testo', obbligatorio: false, descrizione: 'Momento d’impiego o formula non riducibile a numeri («come reazione», «1 AzP del conducente»).' },
    },
  },
  risorsa: { tipo: 'testo', obbligatorio: false, descrizione: 'Risorsa consumata dal profilo («2 PM», «una carica»): promemoria, l’app non la scala da sé.' },
  usi: {
    tipo: 'oggetto',
    obbligatorio: false,
    descrizione: 'Limite d’uso numerico dichiarato dal profilo (A.115): l’app tiene il contatore degli usi rimasti e avvisa a 0, senza bloccare.',
    campi: {
      quanti: { tipo: 'intero', min: 1, obbligatorio: true },
      per: { tipo: 'scelta', valori: ['Round', 'scontro', 'Scena', 'giorno'], obbligatorio: true },
      nota: { tipo: 'testo', obbligatorio: false, descrizione: 'Per chi o per che cosa vale il limite («per personaggio», «per attaccante»).' },
    },
  },
};

function applica() {
  const fn = leggi('data/formato_nemici.json');
  const attuale = fn.campi.capacita.voce.campi;
  if (CONTROLLA) {
    if (JSON.stringify(attuale) !== JSON.stringify(CAMPI)) { console.error('lotto capacità (A.115) da riapplicare'); process.exit(1); }
    console.log('lotto capacità (A.115): formato aggiornato');
    return;
  }
  fn.campi.capacita.voce.campi = CAMPI;
  fn.campi.capacita.descrizione = 'Talenti e capacità speciali (A.73) con la descrizione completa e, quando il profilo li dà, i parametri della risoluzione: Prova, costo in Azioni, risorsa consumata e limiti d’uso (A.115, risposta approvata il 15/10/2026). Dove i dati mancano resta il solo testo: non si assegnano costi o effetti per analogia.';
  scrivi('data/formato_nemici.json', fn);
  console.log('formato_nemici.json: capacità con prova, azioni, risorsa, usi e passiva (A.115).');
}

applica();
