// Riparazione strutturale degli oggetti personali (Armamenti §7.2.1 del 28/09; risposta di Davide
// A.46): 1 ora per oggetto, Prova di Tecnologia; Successo +1 PI, Magistrale +2, Fallimento 0,
// Maldestro −1 (minimo 0, senza PS Integrità); strumenti improvvisati −2 VA; materiali 5% del
// prezzo di catalogo per PI effettivamente recuperato; mai oltre il massimo; Distrutti esclusi.
// Regole in regole.json → integrita.riparazione. Funzioni pure: nessun dado, l'esito lo sceglie il
// giocatore dopo il tiro al tavolo.

/** Regole della riparazione, o null se i dati non le prevedono. */
export function regoleRiparazione(dati) {
  return dati?.regole?.integrita?.riparazione ?? null;
}

/**
 * Esito di un intervento su un oggetto.
 * @param {{ piAttuali: number, piMax: number, costo: number|null }} oggetto
 * @param {string} esito id di regole.json → integrita.riparazione.esiti
 * @returns {{ piNuovi, recuperati, costoMateriali: number|null }}
 */
export function esitoRiparazione({ piAttuali, piMax, costo }, esito, r) {
  const e = r.esiti.find((x) => x.id === esito);
  if (!e) throw new RangeError(`esito di riparazione sconosciuto: ${esito}`);
  const piNuovi = Math.max(0, Math.min(piMax, piAttuali + e.pi));
  const recuperati = Math.max(0, piNuovi - piAttuali);
  // i materiali si pagano solo per i PI effettivamente recuperati (un Magistrale a 1 PI dal massimo ne paga 1)
  const costoMateriali = Number.isFinite(costo) ? Math.round((costo * r.materiali_percentuale) / 100) * recuperati : null;
  return { piNuovi, recuperati, costoMateriali };
}

/** VA della Prova di riparazione: Abilità della regola (valore al tavolo), con gli strumenti improvvisati. */
export function vaRiparazione(scheda, improvvisati, r) {
  const a = (scheda?.abilita ?? []).find((x) => x.nome === r.abilita);
  if (!a) return null;
  const base = a.effettivo ?? a.totale;
  return { base, improvvisati: improvvisati ? r.strumenti_improvvisati_va : 0, totale: base + (improvvisati ? r.strumenti_improvvisati_va : 0) };
}

/** L'oggetto si ripara con questa procedura? (tipo ammesso, non Distrutto) */
export function riparabile(oggetto, condizioneArma, r) {
  if (!r.tipi.includes(oggetto.tipo)) return { si: false, motivo: 'La riparazione strutturale riguarda armi, armature, scudi, elmetti e rinforzi (A.46).' };
  if (condizioneArma && r.esclusi.includes(condizioneArma)) return { si: false, motivo: 'Distrutta: non si ripara con la procedura ordinaria (A.46).' };
  return { si: true, motivo: null };
}
