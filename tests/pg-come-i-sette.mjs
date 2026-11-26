// Lotto 255, parte E — **un PG di prova che porta quello che portano i sette.**
//
// Nel lotto 254 il «+X» dell'Elmetto Recon ASA è sopravvissuto con il test verde perché i tre PG d'esempio non hanno
// l'elmetto: il controllo passava **sull'assenza**. È una classe intera, non un caso: un difetto su un oggetto che
// solo i sette portano non lo vede nessun nostro test, e si vede al tavolo.
//
// Qui non si fanno sette copie dei sette (non servono, e sarebbero i loro dati in git): si aggiunge **a un PG di
// prova** una voce per ciascuna categoria che manca, scelta **dal catalogo** e non scritta a mano, così quando un
// `rif` cambia il fixture non invecchia in silenzio — se la categoria non esiste più, `aggiungiCoseDeiSette` lo dice.
//
// L'elenco di che cosa portano i sette è una fotografia con la sua data in `tests/fixtures/cose-dei-sette.json`,
// rifatta da `node tools/cose-dei-sette.mjs --scrivi` quando arriva un'istantanea nuova.
import { catalogo } from '../src/equipaggiamento.js';

/** La prima voce del catalogo che soddisfa `ok`, o null. Si cerca nel catalogo: niente rif scritti a mano. */
const prima = (dati, ok) => catalogo(dati).oggetti.find(ok) ?? null;

/**
 * Le categorie da coprire, e come si coprono. Ogni voce dice **che cosa cerca nel catalogo**: così il fixture segue i
 * dati. `manca` spiega perché una categoria non si può coprire, quando capita.
 */
export const COPERTURE = [
  {
    categoria: 'elmetto: elmetto-asa-recon',
    voce: (d) => prima(d, (o) => o.rif === 'elmetti:elmetto-asa-recon'),
    stato: 'indossata',
    perche: 'è l’oggetto su cui il lotto 254 ha nascosto un «+X»: tutti e sette lo portano',
  },
  { categoria: 'famiglia del catalogo: elmetti', voce: (d) => prima(d, (o) => o.tipo === 'elmetto'), stato: 'indossata' },
  { categoria: 'famiglia del catalogo: rinforzi', voce: (d) => prima(d, (o) => o.tipo === 'rinforzo' && o.indossabile_da_solo), stato: 'indossata' },
  { categoria: 'famiglia del catalogo: armi_distanza', voce: (d) => prima(d, (o) => /^armi_distanza:/.test(o.rif) && o.mani === 1), stato: 'impugnata' },
  { categoria: 'scudo', voce: (d) => prima(d, (o) => o.tipo === 'scudo' && /enorme/.test(o.rif)), stato: 'imbracciato' },
  { categoria: 'scudo imbracciato', voce: () => null, perche: 'la copre lo scudo qui sopra, che è imbracciato' },
  { categoria: 'CyberArma', voce: (d) => prima(d, (o) => /^armi:cyberarma/.test(o.rif) && !o.non_elencata), stato: 'impugnata' },
  { categoria: 'Guanti da Combattimento Mistico', voce: (d) => prima(d, (o) => /guanti/.test(o.rif) && o.tipo === 'artefatto'), stato: 'indossata' },
  { categoria: 'dotazione ASA o SIA', voce: (d) => prima(d, (o) => /asa|sia/i.test(o.rif) && o.tipo !== 'elmetto'), stato: 'indossata' },
  { categoria: 'impianto cibernetico', voce: (d) => prima(d, (o) => o.tipo === 'impianto'), stato: 'installato' },
  { categoria: 'manufatto lunare', voce: (d) => prima(d, (o) => /^manufatti_lunari:/.test(o.rif)), stato: 'zaino' },
];

/** Le cose che non sono oggetti: bandiere e blocchi delle scelte. */
export const FLAG = [
  ['Talenti nuovi (regimeTalenti 2)', (s) => { s.regimeTalenti = 2; }],
  ['correzioni del Direttore', (s) => {
    s.correzioniMaster = [{
      id: 'prova-255', quando: '2026-11-26T10:00:00Z', chiave: 'car:Destrezza', etichetta: 'Destrezza',
      tipo: 'aggiungi', numero: 1, motivo: 'PG di prova del lotto 255: una correzione del Direttore come quelle dei sette', stato: 'attiva',
    }];
  }],
  ['veicolo nel file del PG', (s, d) => {
    const p = (d.veicoli?.profili ?? [])[0];
    if (!p) return;
    s.veicoli = [{ uid: 'veiprova255', profilo: p.id, nome: p.nome_esemplare ?? p.nome, gruppo: false }];
  }],
  ['Umanità con impianti registrati', (s) => { s.umanita = { installazioni: [{ id: 'prova', quando: '2026-11-26', umn: 1 }] }; }],
];

/**
 * Aggiunge alle scelte di un PG di prova una voce per ciascuna categoria dell'elenco, e torna quello che ha fatto.
 * @returns {{ scelte, aggiunte: string[], manca: {categoria, perche}[] }}
 */
export function aggiungiCoseDeiSette(scelte, dati) {
  const eq = [...(scelte.equipaggiamento ?? [])];
  const aggiunte = [];
  const manca = [];
  let n = 0;
  for (const c of COPERTURE) {
    const def = c.voce(dati);
    if (!def) { if (!c.perche) manca.push({ categoria: c.categoria, perche: 'nessuna voce del catalogo la soddisfa' }); continue; }
    if (eq.some((v) => v.rif === def.rif)) { aggiunte.push(`${c.categoria} (già presente)`); continue; }
    n += 1;
    eq.push({ uid: `prova255-${n}`, rif: def.rif, stato: c.stato ?? null, quantita: 1, note: '' });
    aggiunte.push(`${c.categoria} → ${def.rif}`);
  }
  const s = { ...scelte, equipaggiamento: eq };
  for (const [nome, applica] of FLAG) { applica(s, dati); aggiunte.push(nome); }
  return { scelte: s, aggiunte, manca };
}
