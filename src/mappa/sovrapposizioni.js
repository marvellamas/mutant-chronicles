// Che cosa si disegna sopra la mappa: un interruttore per livello e per lato (segnalazione M1 di Davide dell'11/10/2026,
// dopo la prova con la mappa della chiesa). Prima c'era un solo interruttore, «Mostra / nascondi template», che
// nascondeva insieme template, muri, porte e terreno: nascondendo i muri sparivano anche i template.
//
// I livelli stanno in data/mappa.json → sovrapposizioni.livelli (id, nome, titolo e visibilità predefinita per lato):
// template (senza durata), templateDurata (con durata in Round), muri, porte, terreno, luci.
// Nella scena: scena.sovrapposizioni = { master: { template: true, … }, giocatori: { … } }, dove true = si vede.
//
// I livelli valgono **solo per il disegno**: muri, porte e terreno contano sempre per movimento, linea di tiro,
// Copertura e nebbia (src/mappa/area.js, src/mappa/visuale.js). Nascondere un muro non lo toglie.
//
// Scene salvate prima dell'11/10 (formato { nascoste, ancheDurata }): si leggono e si convertono da sé, senza
// riscrivere il file, con la stessa resa di prima:
//   nascoste: false            → tutto visibile
//   nascoste: true, ancheDurata: false → template permanenti, muri, porte e terreno nascosti; template a durata visibili
//   nascoste: true, ancheDurata: true  → come sopra, e anche i template a durata nascosti
// Funzioni pure.

export const LATI = ['master', 'giocatori'];

/** I livelli dai dati (data/mappa.json → sovrapposizioni.livelli). */
export const livelliDati = (dati) => dati?.mappa?.sovrapposizioni?.livelli ?? dati?.sovrapposizioni?.livelli ?? [];

/** Gli id dei livelli, nell'ordine dei dati. */
export const idLivelli = (dati) => livelliDati(dati).map((l) => l.id);

/** Il livello dai dati, o null. */
export const livelloDi = (id, dati) => livelliDati(dati).find((l) => l.id === id) ?? null;

/** La voce è nel formato di prima dell'11/10? ({ nascoste, ancheDurata }) */
export const formatoVecchio = (v) => !!v && typeof v === 'object' && typeof v.nascoste === 'boolean';

/** Il formato di prima tradotto nei livelli di oggi (stessa resa). */
export function daFormatoVecchio(v, dati) {
  const mostra = !v.nascoste;
  const base = {};
  for (const l of livelliDati(dati)) base[l.id] = true;
  return {
    ...base,
    template: mostra,
    // prima, con «nascoste» e senza «anche a durata», restavano visibili i soli template a durata
    templateDurata: mostra || !v.ancheDurata,
    muri: mostra,
    porte: mostra,
    terreno: mostra,
  };
}

/**
 * I livelli visibili di un lato: { template, templateDurata, muri, porte, terreno, luci } con true = si vede.
 * Campi assenti: il valore predefinito del livello nei dati. Formato di prima: convertito.
 * @param chi 'master' | 'giocatori'
 */
export function livelliDi(scena, chi, dati) {
  const v = scena?.sovrapposizioni?.[chi];
  if (formatoVecchio(v)) return daFormatoVecchio(v, dati);
  const out = {};
  for (const l of livelliDati(dati)) out[l.id] = typeof v?.[l.id] === 'boolean' ? v[l.id] : l[chi] !== false;
  return out;
}

/** Un livello si vede per quel lato? */
export const siVede = (scena, chi, id, dati) => livelliDi(scena, chi, dati)[id] === true;

/**
 * La scena con un livello acceso o spento (gli altri come stanno, il formato di prima convertito una volta per tutte).
 * @param valore true/false, oppure undefined per invertire quello che c'è
 */
export function conLivello(scena, chi, id, valore, dati) {
  if (!scena || !idLivelli(dati).includes(id)) return scena;
  const ora = livelliDi(scena, chi, dati);
  const nuovo = { ...ora, [id]: valore === undefined ? !ora[id] : !!valore };
  return { ...scena, sovrapposizioni: { ...(scena.sovrapposizioni ?? {}), [chi]: nuovo } };
}

/** Tutti i livelli di un lato accesi o spenti in un colpo («Mostra tutto», «Nascondi tutto»). */
export function conTuttiILivelli(scena, chi, valore, dati) {
  if (!scena) return scena;
  const nuovo = {};
  for (const id of idLivelli(dati)) nuovo[id] = !!valore;
  return { ...scena, sovrapposizioni: { ...(scena.sovrapposizioni ?? {}), [chi]: nuovo } };
}

/** Riassunto per il menu e gli avvisi: «muri, porte» (i livelli spenti), oppure null se si vede tutto. */
export function nascosti(scena, chi, dati) {
  const liv = livelliDi(scena, chi, dati);
  const spenti = livelliDati(dati).filter((l) => !liv[l.id]);
  return spenti.length ? spenti.map((l) => l.nome.toLowerCase()).join(', ') : null;
}

/**
 * Errore di forma di scena.sovrapposizioni (null se va bene): per ogni lato, o il formato di prima
 * ({ nascoste, ancheDurata }) o un oggetto con i soli id noti e valori booleani.
 */
export function erroreSovrapposizioni(s, dati) {
  if (s === undefined) return null;
  if (!s || typeof s !== 'object' || Array.isArray(s)) return 'sovrapposizioni: { master, giocatori } atteso';
  const noti = idLivelli(dati);
  for (const chi of Object.keys(s)) {
    if (!LATI.includes(chi)) return `sovrapposizioni.${chi}: lati ammessi ${LATI.join(', ')}`;
    const v = s[chi];
    if (v === undefined) continue;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return `sovrapposizioni.${chi}: oggetto atteso`;
    if (formatoVecchio(v)) {
      if (typeof v.ancheDurata !== 'boolean') return `sovrapposizioni.${chi}: { nascoste, ancheDurata } vero o falso`;
      continue;
    }
    for (const [k, x] of Object.entries(v)) {
      if (!noti.includes(k)) return `sovrapposizioni.${chi}.${k}: livelli ammessi ${noti.join(', ')}`;
      if (typeof x !== 'boolean') return `sovrapposizioni.${chi}.${k}: vero o falso`;
    }
  }
  return null;
}

/** Problema nei dati dei livelli (data/mappa.json → sovrapposizioni), o null. Lo usa src/validate.js. */
export function erroreDatiSovrapposizioni(S) {
  if (!S || !Array.isArray(S.livelli) || !S.livelli.length) return { chiave: 'sovrapposizioni.livelli', problema: 'elenco dei livelli mancante' };
  const attesi = ['template', 'templateDurata', 'muri', 'porte', 'terreno', 'luci'];
  const visti = new Set();
  for (const [i, l] of S.livelli.entries()) {
    const k = `sovrapposizioni.livelli[${i}]`;
    if (typeof l?.id !== 'string' || !l.id) return { chiave: `${k}.id`, problema: 'id mancante' };
    if (visti.has(l.id)) return { chiave: `${k}.id`, problema: `«${l.id}» ripetuto` };
    visti.add(l.id);
    if (typeof l.nome !== 'string' || !l.nome.trim()) return { chiave: `${k}.nome`, problema: 'nome per il menu mancante' };
    if (typeof l.titolo !== 'string' || !l.titolo.trim()) return { chiave: `${k}.titolo`, problema: 'titolo (suggerimento) mancante' };
    for (const chi of LATI) if (typeof l[chi] !== 'boolean') return { chiave: `${k}.${chi}`, problema: 'visibilità predefinita: vero o falso' };
  }
  for (const id of attesi) if (!visti.has(id)) return { chiave: 'sovrapposizioni.livelli', problema: `manca il livello «${id}»` };
  return null;
}

/**
 * 12/10/2026: colonna «Entrambi» di «Cosa si vede». Lo stato di un livello sui due schermi insieme: 'acceso' (si vede
 * sia dal master sia dai giocatori), 'spento' (da nessuno dei due), 'misto' (diversi: la casella mostra un trattino).
 */
export function statoEntrambi(scena, id, dati) {
  const m = siVede(scena, 'master', id, dati);
  const g = siVede(scena, 'giocatori', id, dati);
  return m === g ? (m ? 'acceso' : 'spento') : 'misto';
}

/**
 * Un clic su «Entrambi»: accende o spegne quel livello su tutti e due gli schermi insieme. Da acceso si spegne; da
 * spento o misto si accende su tutti e due. Con `valore` si impone lo stato.
 */
export function conLivelloEntrambi(scena, id, dati, valore = undefined) {
  if (!scena || !idLivelli(dati).includes(id)) return scena;
  const acceso = valore === undefined ? statoEntrambi(scena, id, dati) !== 'acceso' : !!valore;
  return conLivello(conLivello(scena, 'master', id, acceso, dati), 'giocatori', id, acceso, dati);
}
