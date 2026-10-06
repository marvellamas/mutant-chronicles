// Token della mappa di battaglia (§7 della specifica, lotto 1). Il token non ricopia i dati del partecipante:
// nome, ritratto, PV, Stati e movimento si leggono dallo scontro (o dal registro dei veicoli) a ogni disegno.
// Nel file della scena restano il riferimento, la posizione (q: il Q in alto a sinistra dell'ingombro),
// il lato dell'ingombro in Q e il «nascosto» del master.

/**
 * Lato del token in Q dalla Taglia (data/mappa.json → token.ingombro_per_taglia; data/formato_nemici.json → taglia).
 * Taglia sconosciuta o assente: 1 Q. TODO(Davide) A.126: il 3 × 3 «se indicato» non ha ancora un campo.
 */
export function ingombroDaTaglia(taglia, dati) {
  const tabella = dati?.mappa?.token?.ingombro_per_taglia ?? {};
  return tabella[taglia] ?? 1;
}

/** Q occupati dal token: [[x, y], …]. */
export function celleToken(t) {
  const lato = t?.ingombro ?? 1;
  const [x0, y0] = t.q;
  const r = [];
  for (let y = y0; y < y0 + lato; y++) for (let x = x0; x < x0 + lato; x++) r.push([x, y]);
  return r;
}

/** Il token sta tutto dentro la griglia? */
export function tokenDentro(t, colonne, righe) {
  const lato = t?.ingombro ?? 1;
  const [x, y] = t?.q ?? [];
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + lato <= colonne && y + lato <= righe;
}

/**
 * Coppie di token che occupano almeno un Q in comune: [[idA, idB], …]. Non è un errore del file (il master può
 * ammucchiare i token mentre prepara la scena): serve all'interfaccia per avvisare. Se e quando due token possano
 * stare nello stesso Q è A.127 (data/mappa.json → movimento.fermarsi_su_alleato).
 */
export function sovrapposti(token) {
  const dove = new Map();
  const coppie = [];
  for (const t of token ?? []) {
    const visti = new Set();
    for (const [x, y] of celleToken(t)) {
      const k = `${x},${y}`;
      for (const altro of dove.get(k) ?? []) {
        if (!visti.has(altro)) { visti.add(altro); coppie.push([altro, t.id]); }
      }
      dove.set(k, [...(dove.get(k) ?? []), t.id]);
    }
  }
  return coppie;
}

/**
 * Token della scena senza il partecipante nello scontro collegato (tolto dalla plancia): [id, …]. Non si tolgono da
 * soli; l'interfaccia li mostra in grigio finché il master non decide.
 */
export function tokenSenzaPartecipante(scena, scontro) {
  const ids = new Set((scontro?.partecipanti ?? []).map((p) => p.id));
  return (scena?.token ?? []).filter((t) => t.rif?.tipo === 'partecipante' && !ids.has(t.rif.id)).map((t) => t.id);
}

/** Partecipanti dello scontro che non hanno ancora un token sulla mappa: [partecipante, …]. */
export function partecipantiSenzaToken(scena, scontro) {
  const sulla = new Set((scena?.token ?? []).filter((t) => t.rif?.tipo === 'partecipante').map((t) => t.rif.id));
  return (scontro?.partecipanti ?? []).filter((p) => !sulla.has(p.id));
}
