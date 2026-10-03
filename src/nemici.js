// Tavolo del Master, pezzo 3 (docs/tavolo-direttore.md): bestiario della campagna. Funzioni pure sui file
// di nemici/ (un tipo per file) e sulla bozza dell'editor della plancia. Il formato dei campi è in
// data/formato_nemici.json (per-davide A.73); la validazione è src/validate.js → validaNemico.
import { validaNemico, formattaErrore } from './validate.js';

/**
 * Voci del bestiario dall'elenco del server (GET /api/nemici): ogni file validato. Un file non valido
 * resta nell'elenco con gli errori (la plancia lo segnala) e non si può mettere in uno scontro.
 * @param lista [{ file, mtime, nemico } | { file, mtime, errore }]
 * @returns {{ file, id, nome, nemico, errori: string[] }[]} ordinate per nome
 */
export function vociBestiario(lista, dati) {
  return (lista ?? []).map((x) => {
    if (x.errore) return { file: x.file, id: null, nome: x.file, nemico: null, errori: [x.errore] };
    const errori = validaNemico(x.nemico, dati, `nemici/${x.file}`).map(formattaErrore);
    if (x.nemico?.id && `${x.nemico.id}.json` !== x.file) errori.push(`nemici/${x.file} › id: «${x.nemico.id}» non corrisponde al nome del file`);
    return { file: x.file, id: x.nemico?.id ?? null, nome: typeof x.nemico?.nome === 'string' ? x.nemico.nome : x.file, nemico: errori.length ? null : x.nemico, errori };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

/** Identificativo (e nome del file) proposto dal nome: «Legionario Non Morto» → «legionario-non-morto». */
export function idDaNome(nome) {
  return String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/** Valore vuoto di un campo del formato, per la bozza di un tipo nuovo. */
function vuoto(s) {
  if (s.tipo === 'costante') return s.valore;
  if (s.tipo === 'oggetto') return Object.fromEntries(Object.entries(s.campi).filter(([, c]) => c.obbligatorio).map(([k, c]) => [k, vuoto(c)]).filter(([, v]) => v !== undefined));
  if (s.tipo === 'lista') return [];
  if (s.tipo === 'mappa') return {};
  return undefined;
}

/** Bozza di un tipo nuovo: le costanti del formato e i contenitori dei campi obbligatori. */
export function nemicoVuoto(dati) {
  return vuoto({ tipo: 'oggetto', campi: dati.formato_nemici.campi });
}

/** Voce vuota di una lista del formato (per esempio un attacco). */
export function voceVuota(schemaLista) {
  return vuoto(schemaLista.voce) ?? '';
}

/**
 * Bozza pronta da validare e salvare: senza i campi vuoti facoltativi e senza quelli non ammessi dalle
 * condizioni del formato (per esempio la gittata di un attacco ravvicinato).
 */
export function pulisciNemico(bozza, dati) {
  const pulisci = (s, v) => {
    if (s.tipo === 'oggetto') {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
      const vale = (cond) => Object.entries(cond ?? {}).every(([f, x]) => v[f] === x);
      const out = {};
      // nell'ordine dei campi del formato, così i file in nemici/ si leggono tutti allo stesso modo
      const chiavi = [...Object.keys(s.campi).filter((k) => k in v), ...Object.keys(v).filter((k) => !(k in s.campi))];
      for (const [k, x] of chiavi.map((k) => [k, v[k]])) {
        const c = s.campi[k];
        if (!c) { out[k] = x; continue; }
        if (c.ammesso_se && !vale(c.ammesso_se)) continue;
        const p = pulisci(c, x);
        const vuotoFacoltativo = !c.obbligatorio && (p === undefined || p === '' || (Array.isArray(p) && !p.length)
          || (p && typeof p === 'object' && !Array.isArray(p) && !Object.keys(p).length));
        if (p !== undefined && !vuotoFacoltativo) out[k] = p;
      }
      return out;
    }
    if (s.tipo === 'lista') return Array.isArray(v) ? v.map((x) => pulisci(s.voce, x)).filter((x) => x !== undefined && x !== '') : v;
    if (s.tipo === 'mappa') return v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== '')) : v;
    if (typeof v === 'string') return v.trim() === '' ? undefined : v.trim();
    return v;
  };
  return pulisci({ tipo: 'oggetto', campi: dati.formato_nemici.campi }, bozza);
}

/**
 * Movimento di un nemico al tavolo (A.73, decisione 9): Passo obbligatorio; Corsa e Scatto mancanti si
 * calcolano dal Passo (data/formato_nemici.json → movimento.moltiplicatori), i valori espliciti prevalgono;
 * «non_consentito» resta tale (il nemico non ha quella modalità), senza calcolo.
 * @returns {{ passo, corsa, scatto }} numeri in Q oppure null (non consentito), con `calcolati` per i derivati
 */
export function movimentoNemico(n, dati) {
  const M = dati.formato_nemici.campi.movimento.moltiplicatori;
  const mov = n?.movimento ?? {};
  const calcolati = [];
  const valore = (k) => {
    if (mov[k] === 'non_consentito') return null;
    if (Number.isInteger(mov[k])) return mov[k];
    calcolati.push(k);
    return mov.passo * M[k];
  };
  return { passo: mov.passo, corsa: valore('corsa'), scatto: valore('scatto'), calcolati };
}

/** «Passo 6 Q · Corsa 12 Q* · Scatto non consentito» per la carta del nemico (* calcolato dal Passo). */
export function testoMovimento(n, dati) {
  const m = movimentoNemico(n, dati);
  const v = (nome, k, nonConsentito) => (m[k] === null ? `${nome} ${nonConsentito}` : `${nome} ${m[k]} Q${m.calcolati.includes(k) ? '*' : ''}`);
  const terra = [v('Passo', 'passo'), v('Corsa', 'corsa', 'non consentita'), v('Scatto', 'scatto', 'non consentito')].join(' · ') + (m.calcolati.length ? ' (* dal Passo)' : '');
  // Bestiario §3.1.1: volo con Corsa e Scatto il doppio e il triplo del Passo in volo (Giocatore §5.2.3)
  const volo = n?.movimento?.volo;
  const M = dati.formato_nemici.campi.movimento.moltiplicatori;
  return volo ? `${terra} · Volo ${volo} Q (Corsa ${volo * M.corsa} Q, Scatto ${volo * M.scatto} Q)` : terra;
}
