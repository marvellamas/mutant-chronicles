// Creature provvisorie (A.258, Davide 06/11/2026). Funzioni pure.
//
// «Gli Eretici generici presenti nei dati precedenti non sono creature canoniche del nostro bestiario. Come
// chiarimento provvisorio dei soli dati attualmente visibili nell'app, finché non saranno sostituiti, gli Eretici
// Minori mantengono Toccato e i Boss mantengono Consacrato, mentre i profili ordinari Semplici o Medi non ricevono
// doni automatici. Questa indicazione non approva né canonizza quei profili: gli Eretici e tutte le altre creature
// nemiche inserite in precedenza da Marcello devono essere superati dalle creature create da noi per il Manuale.
// Gli Eretici come creature dell'Oscura Simmetria devono ancora essere completati.»
//
// Come si riconosce una creatura provvisoria: **dalla sua fonte**, non da un elenco scritto a mano. Le creature che
// vengono da un manuale di Davide portano una fonte che comincia con «dal Manuale dei Mostri»; tutte le altre sono
// state inserite prima da Marcello e sono a scadenza. Regola e testi stanno in data/formato_nemici.json →
// `provvisorie`: così resta vera anche quando arrivano creature nuove, senza toccare il codice.
//
// **Niente si cancella e niente si disattiva**: finché non arrivano le creature nuove quelle servono al tavolo. Il
// segno è un'indicazione discreta, non un allarme (CLAUDE.md: in alto nella scheda il minimo spazio possibile).

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const lista = (v) => (Array.isArray(v) ? v : []);
const testo = (v) => (typeof v === 'string' ? v.trim() : '');

/** Il blocco `provvisorie` del formato dei nemici. */
export const regoleProvvisorie = (dati) => (isOggetto(dati?.formato_nemici?.provvisorie) ? dati.formato_nemici.provvisorie : isOggetto(dati?.provvisorie) ? dati.provvisorie : null);

/**
 * Una fonte è canonica? Comincia con uno dei prefissi dichiarati nei dati («dal Manuale dei Mostri»).
 * Senza fonte: non canonica — una creatura che non dice da dove viene non viene da un manuale.
 */
export function fonteCanonica(fonte, dati) {
  const prefissi = lista(regoleProvvisorie(dati)?.fonti_canoniche);
  const f = testo(fonte);
  if (!f || !prefissi.length) return false;
  return prefissi.some((p) => f.toLowerCase().startsWith(String(p).toLowerCase()));
}

/** La creatura è provvisoria? (profilo di un nemico, voce del Bestiario o riga della pagina online) */
export const eProvvisoria = (creatura, dati) => !fonteCanonica(creatura?.fonte, dati);

/**
 * Il segno da mostrare accanto a una creatura provvisoria, o null se è canonica.
 * @returns {{ sigla, titolo, testo }}
 */
export function segnoProvvisoria(creatura, dati) {
  if (!eProvvisoria(creatura, dati)) return null;
  const P = regoleProvvisorie(dati);
  return {
    sigla: P?.sigla ?? 'provvisoria',
    titolo: P?.titolo ?? 'Creatura provvisoria: non è canonica del bestiario e verrà sostituita (A.258).',
    testo: P?.testo ?? 'Provvisoria (A.258): verrà sostituita.',
  };
}

/**
 * La famiglia di una fonte: i numeri diventano «N», così «costruito come PG (Capitol, Soldato 1, 2° livello)» e il
 * suo veterano finiscono nella stessa riga del censimento invece di fare trentatré righe da uno.
 */
export const famigliaFonte = (fonte) => testo(fonte).replace(/\d+/g, 'N') || '(senza fonte)';

/**
 * Il censimento: quali creature vengono dai manuali di Davide e quali erano state inserite prima.
 * @param creature [{ id?, nome, fonte }]
 * @returns {{ canoniche, provvisorie, totale, perFonte }} — `perFonte`: quante per ogni fonte, provvisorie prima
 */
export function censimento(creature, dati) {
  const canoniche = [];
  const provvisorie = [];
  const perFonte = new Map();
  for (const c of lista(creature)) {
    const f = testo(c?.fonte) || '(senza fonte)';
    const dove = fonteCanonica(c?.fonte, dati) ? canoniche : provvisorie;
    dove.push(c);
    const k = `${dove === canoniche ? 'canonica' : 'provvisoria'}\u0000${famigliaFonte(f)}`;
    perFonte.set(k, (perFonte.get(k) ?? 0) + 1);
  }
  return {
    canoniche,
    provvisorie,
    totale: canoniche.length + provvisorie.length,
    perFonte: [...perFonte.entries()]
      .map(([k, n]) => { const [tipo, fonte] = k.split('\u0000'); return { tipo, fonte, quante: n }; })
      .sort((a, b) => (a.tipo === b.tipo ? b.quante - a.quante : a.tipo === 'provvisoria' ? -1 : 1)),
  };
}

/** La nota sugli Eretici, da scrivere dove si vedono i loro profili (A.258). */
export const notaEretici = (dati) => regoleProvvisorie(dati)?.eretici ?? null;
