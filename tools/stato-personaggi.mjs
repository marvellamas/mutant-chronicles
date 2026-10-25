// Come stanno i personaggi (25/10/2026 sera, diagnosi sul fisso): un modulo solo per le voci 7, 8 e «Controlla lo
// stato» del menu di Mutant.bat. Quale file è l'attuale lo dice src/cartella.js → fileAttuale, la stessa funzione
// dell'app e del server: nessuno rifà il conto per conto suo.
//
// Due strade, stessa scelta:
//  - dalla cartella (elencoDaDisco): per la riga del menu, anche a Mutant spento;
//  - dal server (statoDalServer): GET /api/personaggi e poi GET del file attuale di ognuno, cioè quello che apre
//    l'app. È la strada del controllo finale dopo le voci 7 e 8: si scrive «fatto» solo se lì torna.
// Senza lettere accentate nei testi per la console (la console di Windows non è in UTF-8).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { NOME_FILE, fileAttuale, idStabileDiFile, chiaveDaFile } from '../src/cartella.js';

/** Una riga come quelle di GET /api/personaggi, dal contenuto di un file. */
export function rigaDi(file, testo, mtime) {
  let o = null;
  try { o = JSON.parse(testo); } catch { /* illeggibile: senza identificativo */ }
  return {
    file, mtime, pg: typeof o?.pg === 'string' ? o.pg : null,
    aggiornato: typeof o?.aggiornato_il === 'string' ? o.aggiornato_il : null,
    nome: typeof o?.scelte?.nome === 'string' && o.scelte.nome.trim() ? o.scelte.nome.trim() : chiaveDaFile(file),
    o,
  };
}

/** L'elenco dei personaggi di una cartella, letto dal disco (solo il primo livello, come il server). */
export function elencoDaDisco(cartella) {
  if (!existsSync(cartella)) return [];
  return readdirSync(cartella).filter((f) => NOME_FILE.test(f)).map((f) => {
    const dove = join(cartella, f);
    return rigaDi(f, readFileSync(dove, 'utf8'), statSync(dove).mtimeMs);
  });
}

/** Le righe raggruppate per personaggio: [{ id, file (l'attuale), files: [tutti, dal più attuale] }]. */
export function perPersonaggio(lista) {
  const gruppi = new Map();
  for (const f of lista ?? []) {
    const id = idStabileDiFile(f);
    if (!gruppi.has(id)) gruppi.set(id, []);
    gruppi.get(id).push(f);
  }
  return [...gruppi].map(([id, files]) => {
    const attuale = fileAttuale(files);
    return { id, attuale, files: [attuale, ...files.filter((x) => x !== attuale)] };
  }).sort((a, b) => String(a.attuale.nome ?? a.attuale.file).localeCompare(String(b.attuale.nome ?? b.attuale.file), 'it'));
}

/** Che cosa dice un personaggio dei suoi Talenti: «nuovi» (regimeTalenti = 2) o «vecchi», e quanti posti sono scelti. */
export function talentiDi(o) {
  const nuovi = o?.scelte?.regimeTalenti === 2;
  const livelli = Array.isArray(o?.livelli) ? o.livelli : [];
  const presi = livelli.filter((v) => v?.talentoLibero || v?.maestria || v?.specializzazione).length + (o?.scelte?.specializzazioneIniziale ? 1 : 0);
  // i PX del personaggio (A.161: li assegna il Direttore con «Modifica master», scelte.puntiEsperienza)
  const px = typeof o?.scelte?.puntiEsperienza === 'number' && Number.isFinite(o.scelte.puntiEsperienza) ? o.scelte.puntiEsperienza : null;
  return { nuovi, presi, vecchi: livelli.filter((v) => v?.talentoLibero).length, px, livello: 1 + livelli.length };
}

/** Ogni personaggio come lo vede l'app: dal server. null se il server non risponde. */
export async function statoDalServer(base) {
  let lista;
  try {
    const r = await fetch(`${base}/api/personaggi`, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    lista = await r.json();
  } catch { return null; }
  const out = [];
  for (const g of perPersonaggio(lista)) {
    let o = null;
    try {
      const r = await fetch(`${base}/api/personaggi/${encodeURIComponent(g.attuale.file)}`, { signal: AbortSignal.timeout(4000) });
      if (r.ok) o = JSON.parse(await r.text());
    } catch { /* lo dice la riga */ }
    out.push({ id: g.id, nome: o?.scelte?.nome?.trim() || g.attuale.nome || chiaveDaFile(g.attuale.file), file: g.attuale.file, files: g.files.length, letto: !!o, ...talentiDi(o) });
  }
  return out;
}

/** Ogni personaggio come sta nella cartella (stessa scelta del file attuale). */
export function statoDaDisco(cartella) {
  return perPersonaggio(elencoDaDisco(cartella)).map((g) => ({
    id: g.id, nome: g.attuale.nome, file: g.attuale.file, files: g.files.length, letto: !!g.attuale.o, ...talentiDi(g.attuale.o),
  }));
}

/**
 * Il controllo finale delle voci 7 e 8: tutti i personaggi, visti dal server, hanno i Talenti `attesi` («nuovi» o
 * «vecchi»)? { ok, totale, nuovi, nonTornano: [nomi], righe } — righe in parole, senza accenti.
 */
export function esitoControllo(stato, attesi) {
  const totale = stato.length;
  const nuovi = stato.filter((p) => p.nuovi).length;
  const nonTornano = stato.filter((p) => !p.letto || (attesi === 'nuovi' ? !p.nuovi : p.nuovi)).map((p) => p.nome);
  const ok = totale > 0 && nonTornano.length === 0;
  const righe = [`Controllato sul server: ${nuovi} personaggi su ${totale} con i Talenti nuovi.`];
  if (!ok) {
    righe.push(attesi === 'nuovi' ? 'Questi NON risultano passati ai Talenti nuovi:' : 'Questi risultano ancora con i Talenti nuovi:');
    for (const n of nonTornano) righe.push(`  - ${n}`);
  }
  return { ok, totale, nuovi, nonTornano, righe };
}
