// Mappa di battaglia, lotto 3 (docs/battlemap/piano.md): lettura periodica delle fonti dei token, come fa la plancia.
//   - lo scontro o la bozza collegati alla scena (scontri/), e l'elenco di scontri aperti e bozze per il collegamento;
//   - le schede dei PG presenti (personaggi/: ultimo file di ogni PG, riletto solo se cambia), calcolate come nella
//     plancia (src/tavolo.js → vistaPlancia, al Round dello scontro);
//   - il registro dei veicoli (veicoli/);
//   - chi è al tavolo, per una bozza che non sceglie i PG.
// Niente di tutto questo si scrive nella scena.
import { elencoCartella, leggiCartella } from '../cartella.js';
import { ultimiPerPersonaggio } from '../../cartella.js';
import { vistaPlancia } from '../../tavolo.js';
import { elencoVeicoli } from '../veicoli-registro.js';
import { STATO_BOZZA } from '../../preparazione.js';
import { stessaChiave } from '../../veicoli-registro.js';

async function json(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw Object.assign(new Error(`${url}: ${r.status}`), { stato: r.status });
  return r.json();
}

/**
 * Lettore delle fonti con la cache delle schede dei PG. `leggi(collegamento)` restituisce
 * { scontro, bozza, mancante, candidati: { aperti, bozze }, viste: Map(chiave → vista), veicoli, alTavolo, errori: [] }.
 * `mancante`: lo scontro o la bozza collegati non ci sono più (scontro chiuso e archiviato, bozza iniziata).
 */
export function creaFonti(dati) {
  const cache = new Map(); // file → { mtime, round, vista }
  return async function leggi(collegamento) {
    const esito = { scontro: null, bozza: null, mancante: null, candidati: { aperti: [], bozze: [] }, viste: new Map(), record: new Map(), veicoli: [], alTavolo: [], errori: [] };
    try {
      const lista = await json('api/scontri');
      esito.candidati.aperti = lista.filter((s) => s.stato === 'aperto');
      esito.candidati.bozze = lista.filter((s) => s.stato === STATO_BOZZA);
    } catch (e) { esito.errori.push(`scontri: ${e.message}`); }
    const id = collegamento?.scontro ?? collegamento?.bozza ?? null;
    if (id) {
      try {
        const s = await json(`api/scontri/${encodeURIComponent(id)}`);
        if (collegamento.scontro && s.stato === 'aperto') esito.scontro = s;
        else if (collegamento.bozza && s.stato === STATO_BOZZA) esito.bozza = s;
        else esito.mancante = collegamento.scontro ? 'scontro' : 'bozza';
      } catch (e) {
        if (e.stato === 404) esito.mancante = collegamento.scontro ? 'scontro' : 'bozza';
        else esito.errori.push(`scontro collegato: ${e.message}`);
      }
    }
    if (esito.bozza && !esito.bozza.pg?.length) {
      try { esito.alTavolo = (await json('api/tavolo')).personaggi ?? []; } catch (e) { esito.errori.push(`tavolo: ${e.message}`); }
    }
    const chiavi = esito.scontro ? esito.scontro.partecipanti.filter((p) => p.tipo === 'pg').map((p) => p.chiave)
      : esito.bozza ? (esito.bozza.pg?.length ? esito.bozza.pg : esito.alTavolo) : [];
    if (chiavi.length) {
      const elenco = await elencoCartella();
      if (!elenco) esito.errori.push('personaggi: cartella non leggibile');
      const ultimi = ultimiPerPersonaggio(elenco ?? []);
      const round = esito.scontro?.round ?? null;
      for (const chiave of chiavi) {
        const voce = [...ultimi].find(([k]) => stessaChiave(k, chiave))?.[1];
        if (!voce) continue;
        esito.record.set(chiave, voce); // lotto 7: «Apri scheda completa» dal clic destro o con Ctrl+clic
        const c = cache.get(voce.file);
        if (c && c.mtime === voce.mtime && c.round === round) { esito.viste.set(chiave, c.vista); continue; }
        try {
          const vista = vistaPlancia(await leggiCartella(voce.file), dati, voce.file, round);
          cache.set(voce.file, { mtime: voce.mtime, round, vista });
          esito.viste.set(chiave, vista);
        } catch (e) { esito.errori.push(`${voce.file}: ${e.message}`); }
      }
    }
    try { esito.veicoli = await elencoVeicoli(); } catch (e) { esito.errori.push(e.message); }
    return esito;
  };
}
