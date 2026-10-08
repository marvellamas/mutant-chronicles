// Token in volo (fase 2, lotto 6 bis; richiesta di Marcello dell'08/10/2026). Regole in data/mappa.json → volo:
//   - Giocatore §5.2.3: il volo lo concede una capacità, un Incantesimo o un Artefatto; Passo 6, Corsa 12, Scatto 18 Q
//     salvo la fonte (i nemici: movimento.volo del profilo, data/formato_nemici.json); uscire dalla portata di un
//     avversario, anche salendo, può provocare Attacchi di Opportunità;
//   - Giocatore §5.2.5: in volo senza appoggio Stordito permette soltanto il Passo (gli Stati con effetto sul movimento
//     valgono come a terra: regole.json → stati.elenco[].movimento);
//   - Mostri §4.5: «Essere in volo non impone un nuovo −2 universale a chi attacca».
// Sulla mappa: icona sopra il token e ombra sotto; percorso sopra terreno difficile e token (senza fermarsi su un
// altro token), muri e porte chiuse restano ostacoli; linea di tiro senza token in mezzo né Copertura Leggera o Media
// (A.148); visibile ai giocatori con una linea di vista senza muri anche sotto la nebbia (A.150); ZoC con la quota
// (A.149). Nel token della scena: volo: true, quota?: intero in Q (etichetta). Funzioni pure.

/** Il token è in volo? */
export const inVolo = (t) => t?.volo === true;

/** Quota del token in volo in Q (0 se a terra o senza quota). */
export const quotaDi = (t) => (inVolo(t) && Number.isInteger(t.quota) ? t.quota : 0);

/** Il pezzo sa volare? Un nemico con movimento.volo nel profilo (src/mappa/partecipanti.js → pezzo.voloQ). */
const voloDel = (pezzo) => pezzo?.voloQ ?? pezzo?.scheda?.movimento?.volo ?? null;
export const sapeVolare = (pezzo) => Number.isInteger(voloDel(pezzo)) && voloDel(pezzo) > 0;

/**
 * Passo, Corsa e Scatto in volo: del profilo del nemico (movimento.volo, Corsa e Scatto con i moltiplicatori del
 * formato), altrimenti quelli del Giocatore §5.2.3 (data/mappa.json → volo.movimento_predefinito); poi gli Stati con
 * effetto sul movimento (Stordito: soltanto Passo, §5.2.5).
 */
export function movimentoInVolo(pezzo, dati) {
  const molt = dati?.formato_nemici?.campi?.movimento?.moltiplicatori ?? { corsa: 2, scatto: 3 };
  const v = voloDel(pezzo);
  const r = Number.isInteger(v) && v > 0 ? { passo: v, corsa: v * molt.corsa, scatto: v * molt.scatto } : { ...dati.mappa.volo.movimento_predefinito };
  const elenco = dati?.regole?.stati?.elenco ?? [];
  for (const s of pezzo?.stati ?? []) {
    const e = elenco.find((x) => x.id === (s.id ?? s))?.movimento;
    if (!e) continue;
    if (e.nessuno) { r.passo = 0; r.corsa = null; r.scatto = null; }
    if (e.solo_passo) { r.corsa = null; r.scatto = null; }
    if (Number.isInteger(e.passo_q)) r.passo = Math.min(r.passo, e.passo_q);
  }
  // a 0 PV niente movimento, come a terra
  if (pezzo?.aZero) return { passo: 0, corsa: null, scatto: null };
  return r;
}

/** Regole dell'area di movimento per un token in volo (data/mappa.json → movimento con volo.movimento sopra). */
export function regoleMovimento(t, dati) {
  if (!inVolo(t)) return dati.mappa.movimento;
  const { _nota, ...volo } = dati.mappa.volo.movimento;
  return { ...dati.mappa.movimento, ...volo };
}

/** Il token messo o tolto dal volo, con la quota (null: nessuna etichetta). */
export function conVolo(t, attivo, quota = null) {
  const { volo: _v, quota: _q, ...resto } = t;
  if (!attivo) return resto;
  return { ...resto, volo: true, ...(Number.isInteger(quota) && quota > 0 ? { quota } : {}) };
}

/** Errore di forma del volo di un token (null se va bene): solo creature, quota intera entro il massimo. */
export function erroreVolo(t, D) {
  if (t.volo === undefined && t.quota === undefined) return null;
  if (t.volo !== true) return 'volo: true, oppure assente';
  if (t.rif?.tipo === 'veicolo') return 'volo: non per i veicoli';
  if (t.quota !== undefined && !(Number.isInteger(t.quota) && t.quota >= 1 && t.quota <= (D?.volo?.quota_massima ?? 99))) return `quota: intero da 1 a ${D?.volo?.quota_massima ?? 99} (Q)`;
  return null;
}
