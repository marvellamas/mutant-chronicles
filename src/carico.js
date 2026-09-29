// Capacità di carico: Giocatore §5.2.6 ed Equipaggiamento 0.1 §1.6 (stessa tabella). Funzioni
// pure. Soglie, penalità e Talenti che le modificano stanno in regole.json → carico.
//
// Peso trasportato = somma dei pesi delle voci dell'equipaggiamento (peso del catalogo, se c'è,
// oppure il campo «peso» dell'oggetto personalizzato, per unità × quantità) + il peso aggiuntivo
// della sessione (bottino, una creatura trasportata…). Gli oggetti senza peso non si contano e si
// elencano, così il giocatore sa che il totale è parziale.

const numero = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
const arrotonda = (v) => Math.round(v * 10) / 10;

/** Peso per unità di una voce risolta (risolvi() in equipaggiamento.js), in kg; null se non noto. */
export function pesoVoce(r) {
  if (r.fuoriCatalogo) return null;
  return numero(r.def?.peso) ?? numero(r.voce?.personalizzato?.peso);
}

/** Nomi dei Talenti di Classe del personaggio, dalla scheda. */
const talentiClasse = (scheda) => new Set((scheda.classi ?? []).flatMap((c) => (c.talenti ?? []).map((t) => t.nome)));

/**
 * Soglie in kg per il personaggio: { ordinario, massimo, spinta, fattore, talento }.
 * §5.2.6: si usa il valore di FOR, non il modificatore; Forza da Lavoro raddoppia tutte le soglie.
 */
export function soglieCarico(scheda, dati) {
  const c = dati.regole.carico;
  const valore = scheda.caratteristiche?.[c.caratteristica]?.valore ?? 0;
  const posseduti = talentiClasse(scheda);
  const m = (c.moltiplicatori ?? []).filter((x) => posseduti.has(x.talento));
  const fattore = m.reduce((f, x) => f * x.fattore, 1);
  const [ordinario, sovraccarico] = c.livelli;
  return {
    ordinario: valore * ordinario.fino_a_kg_per_punto * fattore,
    massimo: valore * sovraccarico.fino_a_kg_per_punto * fattore,
    spinta: valore * c.spinta_kg_per_punto * fattore,
    fattore,
    talento: m.map((x) => x.talento).join(', ') || null,
  };
}

/** Livello di carico (voce di regole.json → carico.livelli) per un peso e le soglie date. */
export function livelloCarico(peso, soglie, dati) {
  const [ordinario, sovraccarico, oltre] = dati.regole.carico.livelli;
  if (peso <= soglie.ordinario) return ordinario;
  if (peso <= soglie.massimo) return sovraccarico;
  return oltre;
}

/**
 * Carico del personaggio: { peso, pesoOggetti, pesoExtra, senzaPeso: [nomi], parziale, soglie, livello, passo }.
 * `passo` è il Passo con il −2 Q del Sovraccarico, prima delle altre penalità (esempio del §5.2.6); oltre il
 * massimo è 0 (E&L 5, A.31). `parziale`: qualche peso è «da definire» (E&L 4, A.30): il livello vale per il
 * peso noto e non esclude una penalità.
 */
export function calcolaCarico(scheda, sessione, dati) {
  const oggetti = scheda.equipaggiamento?.oggetti ?? [];
  let pesoOggetti = 0;
  const senzaPeso = [];
  for (const r of oggetti) {
    if (r.fuoriCatalogo) continue;
    const p = pesoVoce(r);
    if (p === null) senzaPeso.push(r.nome);
    else pesoOggetti += p * (r.voce?.quantita ?? 1);
  }
  const pesoExtra = numero(sessione?.caricoExtra) ?? 0;
  const peso = arrotonda(pesoOggetti + pesoExtra);
  const soglie = soglieCarico(scheda, dati);
  const livello = livelloCarico(peso, soglie, dati);
  const passoBase = scheda.movimento?.passo ?? null;
  const passo = passoBase === null ? null : livello.movimento_zero ? 0 : Math.max(0, passoBase + (livello.movimento_q ?? 0));
  return { peso, pesoOggetti: arrotonda(pesoOggetti), pesoExtra, senzaPeso, parziale: senzaPeso.length > 0, soglie, livello, passo };
}
