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
  out.push(...effettiSpecializzazioni(scheda, dati));
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

/**
 * Specializzazioni v1.0 con un bonus al VA (Giocatore §8.8): finora il motore leggeva gli effetti solo da
 * talenti_liberi.json e le Specializzazioni (specializzazioni.json → effetto) restavano elencate e basta.
 * Qui diventano usi specifici dell'Abilità (+N solo per l'uso descritto), come gli altri Talenti: le armi
 * (+1 VA e danno) le applica equipaggiamento.js sulla scheda dell'arma, le Specializzazioni di una
 * sottofamiglia di Incantesimi (−1 PM, +1 VA) le applica lancio.js.
 */
export function effettiSpecializzazioni(scheda, dati) {
  const out = [];
  // solo i Talenti nuovi: i personaggi salvati con i Talenti di prima restano identici (tests/talenti-vecchi-identici.test.js)
  if (scheda?.regimeTalenti !== 'nuovo') return out;
  const perId = new Map((dati.specializzazioni?.specializzazioni ?? []).map((s) => [s.id, s]));
  (scheda?.specializzazioni ?? []).forEach((t, i) => {
    const def = perId.get(t.id);
    const e = def?.effetto;
    if (!def || !e?.va || e.sottofamiglia || e.danno !== undefined || def.gruppo === 'armi') return;
    const nome = `Specializzazione in ${def.nome}${t.annotazione ? ` (${t.annotazione})` : ''}`;
    for (const abilita of def.abilita ?? []) {
      out.push({
        chiave: `specializzazione:${def.id}:${i}`, talento: nome, tipo: 'va', abilita, valore: e.va, ambito: 'uso_specifico',
        uso: nome, condizione: def.ambito, fonte: 'Giocatore §8.8',
      });
    }
  });
  return out;
}

/** Le Specializzazioni della scheda che valgono per questo Incantesimo (stessa sottofamiglia), se «Bonus dei Talenti» è acceso. */
export function specializzazioniDiLancio(scheda, incantesimo) {
  if (scheda?.bonusTalenti === false || scheda?.regimeTalenti !== 'nuovo') return [];
  return (scheda?.specializzazioni ?? []).filter((s) => s.effetto?.sottofamiglia && s.effetto.sottofamiglia === incantesimo?.specializzazione);
}

const TAGLIO_NOTA = 240;
/**
 * Che cosa del testo di un Talento l'app non applica da sola, da dire accanto al Talento: «da applicare al tavolo: …».
 * Il campo `tavolo` della voce lo scrive a mano (stringa vuota: tutto ciò che il testo dice è calcolato); senza il
 * campo, una voce senza effetti calcolati riporta il suo testo. Una voce non tace mai.
 */
export function notaDaApplicare(def) {
  if (!def) return null;
  if (typeof def.tavolo === 'string') return def.tavolo.trim() || null;
  if (def.effetti || def.effetto) return null;
  const t = String(def.sintesi?.testo ?? def.testo ?? def.ambito ?? '').trim();
  return t ? (t.length > TAGLIO_NOTA ? `${t.slice(0, TAGLIO_NOTA - 1)}…` : t) : null;
}
