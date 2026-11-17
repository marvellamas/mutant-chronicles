// Lotto 211 (17/11/2026) — **le 90 schede d'incantesimo passano alla Magia 1.19, campo per campo, e dichiarano da dove vengono.**
//
// Il confronto (docs/diff-lotto211-2026-11-17.md) dice che dalla 1.11, da cui i dati vengono, alla 1.19 corrente **nessuna
// tabella delle 90 schede cambia** — costi in PM, gittate, bersagli, durate sono identici, riga per riga — e che le schede che
// cambiano sono dieci, **di solo testo**: sei per le regole del Morente (§6, «Morente e stabilizzazione», che la 1.17 ha portato
// nelle schede) e quattro che erano già indietro rispetto alla 1.11 stessa (un paragrafo mancante, un titolo, un paragrafo
// riscritto, una frase troncata). Esito per ciascuna: **frase vecchia** (si aggiorna la frase; nessun valore cambia). Nessuna
// «regola diversa»: dove il testo nuovo dice qualcosa che l'app calcola (Colpo Elementale: la PS vale solo per gli effetti
// secondari; Armatura Mistica: bonus all'AR complessiva) i dati lo facevano già (`meccanica.salvezza`, `ar.incantesimi`), e il
// testo era rimasto indietro.
//
// Regola del 204, nel codice (`unisciScheda`): **una lettura parziale non si scrive mai sopra un valore buono**. Qui nessuna
// scheda è parziale; il controllo c'è lo stesso, ed è provato in rosso da `tests/incantesimi-lettore-211.test.js`.
//
//   node tools/lotti/lotto_211_magia.mjs            — che cosa scriverebbe
//   node tools/lotti/lotto_211_magia.mjs --scrivi   — applica (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';
import { testoManuale, versioneManuale } from '../manuali.mjs';
import { leggiSchedeMagia, unisciScheda, quadro, CAMPI_LETTI } from '../importa-incantesimi.mjs';

const FILE = 'data/incantesimi.json';

/** I campi che questo lettore non rilegge: li decidono altri strumenti (id e pagina del manuale; meccanica da estrai_lancio, durate, scale). */
export const CAMPI_NOSTRI = ['id', 'pagina', 'livello_base', 'meccanica'];

export const MOTIVO_NOSTRI = 'Non vengono dal testo della scheda: l’identificativo e la pagina li assegniamo noi, il livello base sta nell’indice (§11) e `meccanica` è derivata da `tools/estrai_lancio.py`, `tools/durate_incantesimi.mjs` e `tools/scale_anticipazione.mjs`. Il lettore non li tocca.';

export function piano(radice = '.', testo = testoManuale('magia'), edizione = versioneManuale('magia')) {
  const dati = JSON.parse(readFileSync(`${radice}/${FILE}`, 'utf8'));
  const schede = leggiSchedeMagia(testo);
  const q = quadro(schede, dati);
  const perScheda = new Map(schede.map((s) => [s.scheda, s]));
  const nuovi = structuredClone(dati);
  const aggiornate = []; const tenute = [];
  nuovi.incantesimi = dati.incantesimi.map((d) => {
    const letta = perScheda.get(d.scheda);
    if (!letta) return d; // non c'è nel manuale: resta com'è e si dichiara (non dovrebbe succedere: il validatore pretende 90)
    const r = unisciScheda(d, letta, edizione);
    if (r.scritti.length) aggiornate.push({ scheda: d.scheda, nome: d.nome, campi: r.scritti, esito: 'frase vecchia' });
    if (r.tenuti.length) tenute.push({ scheda: d.scheda, nome: d.nome, campi: r.tenuti });
    return r.scheda;
  });
  // il conto che il validatore pretende (come col 342 = 310 + 32, col 493 e col 218)
  const indietro = nuovi.incantesimi.reduce((n, i) => n + CAMPI_LETTI.filter((c) => i._edizione?.campi?.[c] !== edizione).length, 0);
  nuovi.versione_manuale = `Magia ${edizione} (Google Doc del 13/11/2026, 12:38 UTC)`;
  nuovi.corpus = {
    edizione,
    schede: nuovi.incantesimi.length,
    campi_letti: CAMPI_LETTI,
    campi_nostri: CAMPI_NOSTRI,
    motivo_campi_nostri: MOTIVO_NOSTRI,
    // la storia del primo confronto: dopo aver scritto, un secondo giro troverebbe 90 invariate e la riscriverebbe (non idempotente)
    confronto_lotto_211: dati.corpus?.confronto_lotto_211 ?? {
      base: 'Magia 1.11 (l’edizione da cui i dati venivano)',
      invariate: q.conto.invariate, cambiate: q.conto.cambiate, nuove: q.conto.nuove, sparite: q.conto.sparite,
      aggiornate: aggiornate.map((a) => `${a.scheda} ${a.nome}: ${a.campi.join(', ')}`),
    },
    campi_indietro: indietro,
    motivi_indietro: tenute.map((t) => ({ scheda: t.scheda, nome: t.nome, campi: t.campi })),
  };
  return { dati, nuovi, q, aggiornate, tenute, indietro };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_211_magia.mjs'], 'lotto_211_magia.mjs');
  const p = piano();
  console.log(`Magia ${versioneManuale('magia')}: ${JSON.stringify(p.q.conto)}`);
  for (const a of p.aggiornate) console.log(`  ${a.scheda} ${a.nome}: ${a.campi.join(', ')} → ${a.esito}`);
  for (const t of p.tenute) console.log(`  TENUTA ${t.scheda} ${t.nome}: ${t.campi.map((c) => `${c.campo} (${c.motivo})`).join('; ')}`);
  console.log(`campi indietro: ${p.indietro}`);
  if (argv.includes('--scrivi')) {
    const nuovo = `${JSON.stringify(p.nuovi, null, 2)}\n`;
    const vecchio = readFileSync(FILE, 'utf8');
    if (nuovo === vecchio) console.log('già scritto: niente da fare');
    else { writeFileSync(FILE, nuovo); console.log(`scritto ${FILE}`); }
  } else console.log('(prova: niente scritto; --scrivi per applicare)');
}
