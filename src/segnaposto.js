// Il grado di una proprietà, scritto col suo numero (lotto 254, rif. 07 del collaudo di Davide del 25/11/2026).
//
// Davide: «Nella spiegazione di Percezione sostituire +X con +1. È una discrepanza di testo, non un errore di calcolo
// dimostrato.» Aveva ragione due volte: il calcolo usa già `valore: 1` (A.294), e il testo era l'unico difetto.
//
// Ma la riga che ha visto era **la punta di una famiglia**: lo stesso «+X» stava in 61 posti su 45 voci del catalogo,
// perché la frase è la definizione generica della proprietà **copiata dal manuale**, dove X sta per il grado. A
// schermo, accanto a «Sensori 1 alla vista», il lettore leggeva «+X VA a Percezione» e doveva fare la sostituzione
// da sé. **Un «+X» a schermo è un dato mancante travestito da testo**, ed è la terza volta che la famiglia torna: nel
// 249 i rami vuoti delle finestrelle si leggevano come la parola «null» e «undefined + 5» stava nella tabella
// dell'Iniziativa, nel 251 un motivo stava nel solo `title`.
//
// **Perché qui e non nei dati.** I dati citano il manuale (`tools/verifica_frasi.mjs` lo controlla frase per frase:
// 1290 su 1290), e il manuale scrive «+X». Riscrivere le frasi nei dati avrebbe reso diciotto di quelle frasi
// introvabili nel manuale, cioè avrebbe spento un controllo per aggiustare un testo. Il numero, invece, **la voce lo
// ha già**: il `valore` dell'effetto o il grado scritto nel nome della proprietà. Quindi la sostituzione si fa dove
// il testo si mostra — principio 3: i dati tengono le scelte e le citazioni, la vista calcola.
//
// Due famiglie restano generiche, e il motivo è il punto:
//   · **il segno discorde** — otto armi hanno «Affidabilità ridotta −2» e portano la definizione di «Affidabile +X»:
//     sostituire scriverebbe un bonus che non hanno, e per loro c'è una frase riscritta (`RISCRITTE`);
//   · **X è il grado di un altro** — «La Contromisura è Ignifugo X» parla della protezione del bersaglio, non di
//     questa voce (Plasma, Fuoco, Elettricità, Incendiaria, Concussiva): lì X resta, ed è giusto.
//
// Funzioni pure, senza dipendenze.

/** Il grado scritto nel nome di una proprietà, col suo segno: «Difensiva +1» → 1, «Affidabilità ridotta −2» → −2. */
export function gradoDalNome(nome) {
  const m = /(-|−|\+)?(\d+)/.exec(String(nome ?? ''));
  if (!m) return null;
  return (m[1] === '-' || m[1] === '−' ? -1 : 1) * Number(m[2]);
}

/** La frase definisce un bonus (`+X`) mentre il grado di questa voce è una penalità: non è la sua frase. */
export const segnoDiscorde = (testo, n) => /\+\s*X\b/.test(String(testo)) && n < 0;

/**
 * Le frasi riscritte, perché il marcatore non si poteva sostituire: la frase dei dati era la definizione **di due
 * proprietà insieme** («Affidabile +X» e «Affidabilità ridotta −2»), e otto armi che hanno solo la seconda portavano
 * addosso la prima. Sostituire avrebbe scritto un bonus che non hanno; lasciare teneva un «+X» a schermo.
 */
export const RISCRITTE = [{
  nome: 'Affidabilità ridotta −2',
  da: /^Affidabile \+X\. Aggiunge X al tiro/,
  testo: 'Affidabilità ridotta −2. Sottrae 2 dal tiro di 1d20 + modificatore di Caratteristica sulla tabella delle Complicazioni ravvicinate, fino a un minimo di 1. L’attacco rimane fallito; queste proprietà non modificano il VA per colpire né la PS Integrità (§7.1.3).',
  perche: 'la frase dei dati definisce «Affidabile +X», che queste armi non hanno: con «+2» direbbe il contrario, e col marcatore resta un «+X» a schermo',
}];

/**
 * Sostituisce il marcatore del grado col numero. Tocca solo `+X`, `X.` e ` X ` isolati: mai una parola.
 * Con 1 sistema l'unico accordo che la sostituzione rompe, e si dichiara perché è uno solo: «Ignora X punti» diventa
 * «Ignora 1 punto» (censite tutte le parole che seguono il numero nelle frasi del catalogo: al, alla, sottrae,
 * lascia, interamente, aggiunge, punti).
 */
export const conIlNumero = (testo, n) => String(testo)
  .replace(/\+X\b/g, `+${n}`)
  .replace(/\bX\./g, `${n}.`)
  .replace(/(\s)X(\s)/g, `$1${n}$2`)
  .replace(/(^|\s)1 punti\b/g, '$11 punto');

/**
 * **Il testo di una proprietà come si legge**: col grado della voce al posto del marcatore, o com'è se il numero non
 * c'è o non è il suo. Chi mostra il testo di una proprietà passa da qui.
 */
export function testoProprieta(p) {
  const testo = typeof p?.testo === 'string' ? p.testo : null;
  if (testo === null || !/\bX\b/.test(testo)) return testo;
  const riscritta = RISCRITTE.find((r) => r.nome === p.nome && r.da.test(testo));
  if (riscritta) return riscritta.testo;
  const n = gradoDalNome(p.nome);
  if (n === null || segnoDiscorde(testo, n)) return testo;
  return conIlNumero(testo, Math.abs(n));
}

/** **La condizione di un effetto come si legge**: il numero è il suo `valore`, o il grado del nome della proprietà. */
export function condizioneEffetto(e, chiave = 'condizione') {
  const testo = typeof e?.[chiave] === 'string' ? e[chiave] : null;
  if (testo === null || !/\bX\b/.test(testo)) return testo;
  const n = Number.isFinite(e.valore) ? e.valore : gradoDalNome(e.proprieta);
  if (n === null || !Number.isFinite(n) || segnoDiscorde(testo, n)) return testo;
  return conIlNumero(testo, Math.abs(n));
}

/**
 * **Una nota del manuale come si legge**: la nota dichiara i gradi della voce e poi ne dà la definizione generica
 * («Assistenza muscolare 1, Colpo assistito 1 … Assistenza muscolare X concede +X VA …»). Il numero sta nella nota
 * stessa, qualche riga sopra: si prende da lì, per nome della proprietà. Dove la nota non dà un grado per quel nome,
 * la frase resta com'è.
 */
export function notaConIGradi(nota) {
  let out = typeof nota === 'string' ? nota : null;
  if (out === null || !/\bX\b/.test(out)) return out;
  const fuga = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const nome of new Set([...out.matchAll(/([A-ZÀ-Ù][\p{L}’' ]*?)\s+X\b/gu)].map((m) => m[1].trim()))) {
    const g = new RegExp(`${fuga(nome)}\\s+(\\d+)\\b`).exec(out);
    if (!g) continue;
    const n = g[1];
    out = out.replace(new RegExp(`(${fuga(nome)})\\s+X\\b`, 'g'), `$1 ${n}`);
    // la definizione continua nella stessa frase: «… concede +X VA», «… aggiunge X al danno»
    out = out.replace(new RegExp(`(${fuga(nome)} ${n}[^.]*?)\\+X\\b`, 'g'), `$1+${n}`);
    out = out.replace(new RegExp(`(${fuga(nome)} ${n} aggiunge )X\\b`, 'g'), `$1${n}`);
  }
  return out;
}
