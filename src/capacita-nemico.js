// Capacità dei nemici al tavolo (A.115, risposta approvata il 15/10/2026). Funzioni pure.
//
// «L'app deve mostrare la descrizione completa della capacità e gestire le Prove, i costi in Azioni, il
// consumo di risorse e i limiti d'uso espressamente previsti dal profilo»; «le capacità passive non
// richiedono Azioni soltanto quando sono dichiarate tali»; «non si assegnano costi, Prove o effetti
// aggiuntivi per analogia quando mancano i dati».
//
// Qui non si inventa niente: si legge quello che il profilo scrive (data/formato_nemici.json → capacita:
// effetto, costo, limiti, passiva, prova, azioni, risorsa, usi) e si tiene il contatore degli usi quando il
// profilo dà un numero. A 0 l'app avvisa e basta: il master decide (CLAUDE.md).
//
// Gli usi consumati stanno nel partecipante dello scontro: p.usiCapacita = { '<nome>': quanti }.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const testo = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Il costo in Azioni dichiarato dal profilo, come testo («1 AzP», «1 AzM e 1 AzP»); null se non c'è. */
export function testoAzioni(az) {
  if (!isOggetto(az)) return null;
  const parti = [];
  if (Number.isInteger(az.principali) && az.principali > 0) parti.push(`${az.principali} AzP`);
  if (Number.isInteger(az.movimento) && az.movimento > 0) parti.push(`${az.movimento} AzM`);
  if (testo(az.testo)) parti.push(az.testo);
  return parti.length ? parti.join(' · ') : null;
}

/** Il limite d'uso come testo: «2 per scontro», «1 per Round (per attaccante)». null se il profilo non lo dà. */
export function testoUsi(usi) {
  if (!isOggetto(usi) || !Number.isInteger(usi.quanti) || !testo(usi.per)) return null;
  return `${usi.quanti} per ${usi.per}${testo(usi.nota) ? ` (${usi.nota})` : ''}`;
}

/**
 * Una capacità pronta da mostrare: descrizione completa e i soli parametri che il profilo dà.
 * @param c voce di `capacita` del profilo
 * @param usati quante volte è già stata usata (contatore del partecipante)
 * @returns { nome, effetto, passiva, prova, azioni, risorsa, costo, limiti, usi, rimasti, esauriti, parametri }
 *   `parametri` è vuoto quando il profilo non dà nulla: allora si mostra il solo testo (A.115).
 */
export function vistaCapacita(c, usati = 0) {
  const usi = isOggetto(c?.usi) && Number.isInteger(c.usi.quanti) && testo(c.usi.per) ? { quanti: c.usi.quanti, per: c.usi.per, nota: testo(c.usi.nota) } : null;
  const spesi = Math.max(0, Number.isInteger(usati) ? usati : 0);
  const azioni = testoAzioni(c?.azioni);
  const parametri = [
    c?.passiva === true ? { etichetta: 'Passiva', valore: 'non richiede Azioni (dichiarata dal profilo)' } : null,
    azioni ? { etichetta: 'Azioni', valore: azioni } : null,
    testo(c?.prova) ? { etichetta: 'Prova', valore: c.prova } : null,
    testo(c?.risorsa) ? { etichetta: 'Risorsa', valore: c.risorsa } : null,
    testo(c?.costo) ? { etichetta: 'Costo', valore: c.costo } : null,
    usi ? { etichetta: 'Usi', valore: testoUsi(usi) } : null,
    testo(c?.limiti) ? { etichetta: 'Limiti', valore: c.limiti } : null,
  ].filter(Boolean);
  return {
    nome: c?.nome ?? '—',
    effetto: c?.effetto ?? '',
    passiva: c?.passiva === true,
    prova: testo(c?.prova),
    azioni,
    risorsa: testo(c?.risorsa),
    danno: testo(c?.danno),
    natura: testo(c?.natura),
    costo: testo(c?.costo),
    limiti: testo(c?.limiti),
    usi,
    usati: usi ? Math.min(spesi, usi.quanti) : spesi,
    rimasti: usi ? Math.max(0, usi.quanti - spesi) : null,
    esauriti: usi ? spesi >= usi.quanti : false,
    parametri,
  };
}

/** Le capacità di un profilo, con il contatore degli usi del partecipante. */
export function capacitaDi(scheda, usiCapacita = {}) {
  return (scheda?.capacita ?? []).map((c) => vistaCapacita(c, usiCapacita?.[c?.nome] ?? 0));
}

/** Avviso quando gli usi sono finiti: è un avviso, non un blocco (il master decide). */
export const avvisoUsi = (v, nome) => (v?.esauriti ? `${nome}: ${v.nome} ha finito gli usi (${testoUsi(v.usi)}). Si può usare lo stesso: decide il master.` : null);

/**
 * Contatore degli usi dopo «Usa» (+1) o «Annulla» (−1). Non blocca mai: oltre il limite il contatore
 * continua e l'avviso resta. Torna la mappa nuova, o quella di prima se non cambia.
 */
export function segnaUso(usiCapacita, nome, delta = 1) {
  const base = isOggetto(usiCapacita) ? usiCapacita : {};
  const ora = Math.max(0, (base[nome] ?? 0) + delta);
  if (ora === (base[nome] ?? 0)) return base;
  if (ora === 0) { const { [nome]: _via, ...resto } = base; return resto; }
  return { ...base, [nome]: ora };
}

/** Quali contatori si azzerano quando passa il Round (A.115: i limiti «per Round»). */
export function azzeraPerRound(scheda, usiCapacita) {
  const perRound = new Set((scheda?.capacita ?? []).filter((c) => c?.usi?.per === 'Round').map((c) => c.nome));
  if (!perRound.size || !isOggetto(usiCapacita)) return usiCapacita ?? {};
  const out = Object.fromEntries(Object.entries(usiCapacita).filter(([k]) => !perRound.has(k)));
  return Object.keys(out).length === Object.keys(usiCapacita).length ? usiCapacita : out;
}
