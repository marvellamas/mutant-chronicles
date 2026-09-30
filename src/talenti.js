// Effetti tipizzati dei Talenti nei valori effettivi (docs/censimento-talenti.md, docs/effetti-oggetti.md).
// Funzioni pure. I dati stanno in effetti.valori delle voci dei Talenti (talenti_liberi.json,
// classi.json), nello schema degli effetti degli oggetti. Contano solo al tavolo: il totale da regole
// e la SS non cambiano. Diversamente dagli strumenti (Giocatore §1.4.1), i bonus dei Talenti si
// sommano fra loro e con quelli degli oggetti.

/** L'interruttore «Bonus dei Talenti» della sessione: acceso se manca (salvataggi precedenti). */
export const bonusTalentiAccesi = (sessione) => !(sessione && sessione.bonusTalenti === false);

/**
 * Effetti dei Talenti posseduti: [{ chiave, talento, ...effetto }]. «chiave» identifica l'acquisizione
 * (interruttore dei situazionali: sessione → talentiAccesi); «{parametro}» e «{annotazione}» diventano
 * la scelta del giocatore (Prova di Caratteristica Migliorata, Sport).
 * @param scheda risultato di calcolaScheda (talentiLiberi, classi[].talenti)
 */
export function effettiTalenti(scheda, dati) {
  const out = [];
  const perId = new Map((dati.talenti_liberi?.talenti ?? []).map((t) => [t.id, t]));
  (scheda?.talentiLiberi ?? []).forEach((t, i) => {
    const def = perId.get(t.id);
    for (const e of def?.effetti?.valori ?? []) out.push(sostituisci({ chiave: `libero:${t.id}:${i}`, talento: t.parametro ? `${t.nome} (${t.parametro})` : t.nome, ...e }, t));
  });
  const perClasse = new Map((dati.classi?.classi ?? []).map((c) => [c.nome, c]));
  for (const c of scheda?.classi ?? []) {
    const def = perClasse.get(c.nome);
    const tutti = [...(def?.talenti_fissi ?? []), ...(def?.talenti_a_scelta ?? [])];
    for (const t of c.talenti ?? []) {
      const d = tutti.find((x) => x.nome === t.nome);
      for (const e of d?.effetti?.valori ?? []) out.push({ chiave: `classe:${c.nome}:${t.nome}`, talento: t.nome, ...e });
    }
  }
  return out;
}

function sostituisci(e, t) {
  const x = { ...e };
  if (typeof x.uso === 'string') x.uso = x.uso.replace('{annotazione}', t.annotazione || 'la disciplina scelta');
  if (Array.isArray(x.caratteristiche)) x.caratteristiche = x.caratteristiche.map((c) => (c === '{parametro}' ? t.parametro : c)).filter(Boolean);
  return x;
}

/**
 * Talenti con effetti situazionali, uno per acquisizione, per gli interruttori della SD:
 * [{ chiave, talento, effetti: [...], condizione }].
 */
export function talentiSituazionali(effetti) {
  const perChiave = new Map();
  // i situazionali di lancio («incantesimi») sono interruttori del pannello «Lancia!», non della scheda
  for (const e of effetti.filter((x) => x.ambito === 'situazionale' && !x.incantesimi)) {
    const g = perChiave.get(e.chiave) ?? perChiave.set(e.chiave, { chiave: e.chiave, talento: e.talento, effetti: [], condizione: e.condizione }).get(e.chiave);
    g.effetti.push(e);
  }
  return [...perChiave.values()];
}
