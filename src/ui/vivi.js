// Valori «vivi» della scheda (20/10/2026, dal tablet vero): quando cambia un valore (PM o PV del personaggio, PM di un
// cristallo) la scheda NON si ridisegna: si aggiornano soltanto i nodi che lo mostrano, e il resto della pagina resta
// com'è — stessi elementi, stessa posizione, stesso fuoco. Il ridisegno completo (src/ui/app.js → renderScheda) resta per
// ciò che cambia la struttura (una riga che compare o sparisce, un'altra tab, una scelta): è l'eccezione dichiarata.
//
// Come funziona, in un punto solo:
// - chi costruisce un elemento che mostra un valore lo «registra» con una chiave (`pvAttuali`, `pmAttuali`,
//   `chroma:<uid>`, `annullabile`) e una funzione che lo rilegge dallo stato attuale;
// - chi cambia il dato chiama `aggiornaVivi([chiavi])`: parte solo quella funzione dei nodi interessati;
// - il registro si azzera a ogni ridisegno completo, perché i nodi sono nuovi.
// Per i testi che dipendono dal valore ma non sono un numero (un avviso «la riserva ha 1 PM, ne servono 3») c'è la
// `regioneViva`: una piccola zona che si ricostruisce da sola solo se il suo contenuto è davvero cambiato.
import { h } from './dom.js';

const registro = new Map(); // chiave → Set di funzioni di aggiornamento

/** Azzera il registro: si chiama prima di costruire la scheda da capo. */
export const azzeraVivi = () => registro.clear();

/** Registra la funzione che rilegge e riscrive un nodo quando cambia `chiave` (o ciascuna delle chiavi). */
export function registraVivo(chiavi, aggiorna) {
  for (const k of [chiavi].flat().filter(Boolean)) {
    if (!registro.has(k)) registro.set(k, new Set());
    registro.get(k).add(aggiorna);
  }
}

/** Aggiorna i nodi che dipendono dalle chiavi (una funzione che fallisce non ferma le altre). Restituisce quante ne sono partite. */
export function aggiornaVivi(chiavi) {
  let n = 0;
  const gia = new Set();
  for (const k of [chiavi].flat().filter(Boolean)) {
    for (const f of registro.get(k) ?? []) {
      if (gia.has(f)) continue;
      gia.add(f);
      try { f(); n++; } catch (e) { console.error(e); }
    }
  }
  return n;
}

/** Quante funzioni sono registrate (per i test). */
export const quantiVivi = (chiave) => registro.get(chiave)?.size ?? 0;

// firma di un nodo: l'HTML se c'è, altrimenti il testo (DOM finto dei test)
const firma = (el) => el.innerHTML ?? el.textContent ?? '';

/**
 * Zona che si ricostruisce da sola quando cambiano `chiavi`, ma solo se il suo contenuto è davvero diverso: se è uguale
 * non si tocca niente (nessun riflusso, nessun nodo sostituito). Non va messa attorno a un controllo che può avere il
 * fuoco. `costruisci` rilegge lo stato attuale ogni volta.
 */
export function regioneViva(chiavi, costruisci, { tag = 'div', classe = 'regione-viva' } = {}) {
  const el = h(tag, { class: classe }, costruisci());
  registraVivo(chiavi, () => {
    const nuovo = h(tag, {}, costruisci());
    if (firma(nuovo) === firma(el)) return;
    el.replaceChildren(...Array.from(nuovo.childNodes ?? nuovo.children ?? []));
  });
  return el;
}

/** Come regioneViva, ma se all'inizio non c'è niente da mostrare restituisce null (come la funzione che avvolge). */
export function regioneVivaSe(chiavi, costruisci, opzioni = {}) {
  if (costruisci() === null) return null;
  return regioneViva(chiavi, costruisci, opzioni);
}
