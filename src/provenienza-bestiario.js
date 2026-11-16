// Lotto 204 (16/11/2026) — **da quale edizione viene ogni campo di una scheda del Bestiario.**
//
// La regola che è emersa nel lotto 203 e che qui diventa codice:
//
//   **una lettura incompleta non si scrive mai sopra un valore buono.**
//   Un campo o si legge per intero, e allora si scrive con l'edizione da cui viene, oppure si dichiara non letto,
//   e allora si tiene quello di prima — con scritto da dove viene.
//
// Perché per campo e non per scheda: nel 203 il corpus è passato alla 0.69 nei soli PV, perché scrivere le altre
// letture avrebbe svuotato gli attacchi di 29 schede. Il risultato era giusto e invisibile: una scheda mezza 0.69 e
// mezza 0.47, e al tavolo nessuno poteva saperlo guardandola. La provenienza sta sul campo perché «mezzo e mezzo»
// sia un'informazione invece di una sorpresa.
//
// Nel file del nemico: `_bestiario.campi = { pv: '0.69', ar: '0.47', … }` — una voce per ogni campo che la scheda ha.
// `_bestiario.edizione` resta l'edizione della scheda nel suo complesso (quella da cui viene il grosso dei campi).

const isOggetto = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

/**
 * I campi di cui si tiene la provenienza: quelli che il Direttore legge su una scheda e che l'app usa al tavolo.
 * Non è l'elenco di tutto ciò che un file contiene: nome, fonte e testi non sono valori di gioco.
 */
export const CAMPI = ['pv', 'pm', 'caratteristiche', 'ar', 'difese', 'salvezze', 'iniziativa', 'azioni', 'movimento', 'spazio', 'abilita', 'attacchi', 'capacita', 'gs_px'];

/** I nomi che si leggono al tavolo, per la riga della mini-scheda e per il rapporto. */
export const NOMI_CAMPI = {
  pv: 'PV', pm: 'PM', caratteristiche: 'Caratteristiche', ar: 'AR', difese: 'Difese', salvezze: 'Salvezze',
  iniziativa: 'Iniziativa', azioni: 'Azioni', movimento: 'Movimento', spazio: 'Ingombro', abilita: 'Abilità',
  attacchi: 'Attacchi', capacita: 'Capacità', gs_px: 'GS e PX',
};

/** La mappa campo → edizione di una scheda, come sta nel file (vuota se la scheda non la dichiara). */
export function provenienza(nemico) {
  const c = nemico?._bestiario?.campi;
  return isOggetto(c) ? c : {};
}

/** L'edizione della scheda nel suo complesso, o null. */
export const edizioneScheda = (nemico) => nemico?._bestiario?.edizione ?? null;

/** I campi che la scheda ha davvero (per non promettere una provenienza di un valore che non c'è). */
export function campiPresenti(nemico) {
  if (!isOggetto(nemico)) return [];
  return CAMPI.filter((k) => {
    const v = nemico[k];
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (isOggetto(v)) return Object.keys(v).length > 0;
    return true;
  });
}

/**
 * I campi che **non** vengono dall'edizione corrente: `[{ campo, nome, edizione }]`, in ordine di CAMPI.
 * Un campo senza provenienza dichiarata non si conta come vecchio: si conta come **non dichiarato**, ed è un caso
 * diverso che `campiSenzaProvenienza` dice a parte. Inventare una provenienza sarebbe peggio che non averla.
 */
export function campiNonCorrenti(nemico, corrente) {
  const p = provenienza(nemico);
  const presenti = new Set(campiPresenti(nemico));
  return CAMPI
    .filter((k) => presenti.has(k) && p[k] && p[k] !== corrente)
    .map((k) => ({ campo: k, nome: NOMI_CAMPI[k] ?? k, edizione: p[k] }));
}

/** I campi presenti che non dichiarano da dove vengono. */
export function campiSenzaProvenienza(nemico) {
  const p = provenienza(nemico);
  return campiPresenti(nemico).filter((k) => !p[k]);
}

/** Vero se la scheda porta valori di due o più edizioni: è questa che al tavolo si deve dire. */
export const schedaMista = (nemico, corrente) => campiNonCorrenti(nemico, corrente).length > 0;

/**
 * La riga che la mini-scheda scrive quando una scheda è mista, e **null** quando è tutta all'edizione corrente —
 * come il segno delle creature provvisorie del lotto 183, che si spegne da sé quando la fonte cambia.
 * Dice quali campi non vengono dall'edizione corrente: senza i nomi dei campi sarebbe un allarme senza indirizzo.
 */
export function rigaProvenienza(nemico, corrente) {
  const vecchi = campiNonCorrenti(nemico, corrente);
  if (!vecchi.length) return null;
  const perEdizione = new Map();
  for (const v of vecchi) perEdizione.set(v.edizione, [...(perEdizione.get(v.edizione) ?? []), v.nome]);
  const pezzi = [...perEdizione.entries()].map(([ed, nomi]) => `${nomi.join(', ')} ${nomi.length === 1 ? 'viene' : 'vengono'} da ${ed}`);
  return `Non tutti i valori vengono da ${corrente}: ${pezzi.join('; ')}. Il manuale corrente non li dà in una forma leggibile, quindi restano quelli di prima.`;
}

/**
 * **La regola del lotto, in una funzione sola.** Dalla scheda di prima e da una lettura nuova produce la scheda da
 * scrivere e la provenienza di ogni campo.
 *
 * @param vecchia   la scheda che sta nel Bestiario (o null: creatura nuova)
 * @param letta     la scheda come l'ha letta l'importatore dal manuale corrente
 * @param opz.edizione      l'edizione corrente, da cui viene la lettura (es. '0.69')
 * @param opz.nonLetti      i campi che la lettura **non** ha letto per intero: `{ campo: motivo }`
 * @param opz.edizionePrima l'edizione da attribuire ai campi di `vecchia` che non dichiarano la propria
 * @param opz.campi         i campi su cui lavorare (per i test; di norma CAMPI)
 * @returns { json, campi, scritti, ereditati, nonLeggibili }
 */
export function unisciPerCampo(vecchia, letta, { edizione, nonLetti = {}, edizionePrima = null, campi = CAMPI } = {}) {
  if (!edizione) throw new Error('unisciPerCampo: serve l’edizione da cui viene la lettura');
  const prima = isOggetto(vecchia) ? vecchia : null;
  const provPrima = provenienza(prima);
  const json = { ...(prima ?? {}), ...Object.fromEntries(Object.entries(letta ?? {}).filter(([k]) => !campi.includes(k))) };
  const mappa = {};
  const scritti = []; const ereditati = []; const nonLeggibili = [];

  for (const k of campi) {
    const nuovo = letta?.[k];
    const vuoto = nuovo === undefined || nuovo === null
      || (Array.isArray(nuovo) && nuovo.length === 0)
      || (isOggetto(nuovo) && Object.keys(nuovo).length === 0);
    const incompleto = Object.prototype.hasOwnProperty.call(nonLetti, k);
    if (!incompleto && !vuoto) {
      json[k] = nuovo;
      mappa[k] = edizione;
      scritti.push(k);
      continue;
    }
    // non letto per intero: **non si scrive**. Si tiene quello di prima, con la sua provenienza.
    const avevo = prima?.[k];
    const aveva = avevo !== undefined && avevo !== null
      && !(Array.isArray(avevo) && avevo.length === 0)
      && !(isOggetto(avevo) && Object.keys(avevo).length === 0);
    if (aveva) {
      json[k] = avevo;
      const ed = provPrima[k] ?? edizionePrima;
      if (ed) mappa[k] = ed;
      ereditati.push({ campo: k, edizione: ed ?? null, motivo: nonLetti[k] ?? 'il manuale corrente non lo dà in una forma leggibile' });
    } else if (incompleto) {
      nonLeggibili.push({ campo: k, motivo: nonLetti[k] });
    }
  }
  const _bestiario = { ...(prima?._bestiario ?? {}), ...(letta?._bestiario ?? {}), campi: mappa };
  return { json: { ...json, _bestiario }, campi: mappa, scritti, ereditati, nonLeggibili };
}

/**
 * Il conto d'insieme su tutte le schede: quanti campi letti dall'edizione corrente, quanti ereditati da un'altra,
 * quanti presenti senza provenienza dichiarata, e l'elenco delle schede miste.
 */
export function quadroProvenienza(nemici, corrente) {
  const q = { schede: 0, letti: 0, ereditati: 0, senzaProvenienza: 0, perEdizione: {}, miste: [] };
  for (const n of nemici ?? []) {
    q.schede += 1;
    const p = provenienza(n);
    for (const k of campiPresenti(n)) {
      const ed = p[k];
      if (!ed) { q.senzaProvenienza += 1; continue; }
      q.perEdizione[ed] = (q.perEdizione[ed] ?? 0) + 1;
      if (ed === corrente) q.letti += 1; else q.ereditati += 1;
    }
    const vecchi = campiNonCorrenti(n, corrente);
    if (vecchi.length) q.miste.push({ nome: n.nome, id: n.id, campi: vecchi });
  }
  return q;
}
