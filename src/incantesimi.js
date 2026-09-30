// Scelta degli incantesimi conosciuti al 1° livello (Addestramento Taumaturgo). Funzioni pure.
// Regole confermate dal master (docs/risposte-master.md, decisioni 2–5):
//  - la quota di Classe di una macrofamiglia si spende in una qualunque delle sue specializzazioni;
//  - gli incantesimi liberi (2 + Mod INT, minimo 1) possono essere di qualunque macrofamiglia;
//  - sono ammessi gli incantesimi con livello base ≤ livello massimo della tabella per Gradi.
import { calcolaScheda, livelloMassimoIncantesimi } from './calc.js';
import { riga, provenienza } from './provenienza.js';

const ROMANI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const romano = (n) => ROMANI[n] ?? String(n);

/**
 * Gradi taumaturgici complessivi (Magia sez. 1): la somma dei Gradi delle Classi taumaturgiche
 * (Addestramento Taumaturgo, con quote di Incantesimi) e il livello massimo degli Incantesimi che ne
 * deriva, dalla tabella di regole.json → taumaturgo.livello_massimo_per_gradi (la stessa che dà il
 * livello massimo di «Lancia!»). Valore calcolato, per la tab Poteri; null senza Classi taumaturgiche.
 * @param scheda risultato di calcolaScheda (classi: [{ nome, grado }])
 * @returns {{ gradi, testo, classi: [{ nome, grado }], livelloMassimo, provenienza } | null}
 */
export function gradiTaumaturgici(scheda, dati) {
  const r = dati.regole;
  const classi = (scheda?.classi ?? []).filter((c) => {
    const def = dati.classi.classi.find((x) => x.nome === c.nome);
    return def?.addestramento === r.taumaturgo.addestramento && def.incantesimi && c.grado > 0;
  }).map((c) => ({ nome: c.nome, grado: c.grado }));
  if (!classi.length) return null;
  const gradi = classi.reduce((s, c) => s + c.grado, 0);
  const livelloMassimo = Math.min(r.avanzamento.livello_massimo_incantesimi, livelloMassimoIncantesimi(gradi, r));
  return {
    gradi,
    testo: `${romano(gradi)} · ${classi.map((c) => `${c.nome} ${romano(c.grado)}`).join(' + ')}`,
    classi,
    livelloMassimo,
    provenienza: provenienza([
      ...classi.map((c) => riga(`${c.nome}, Grado ${romano(c.grado)}`, c.grado, 'Classe taumaturgica')),
      riga('Livello massimo degli Incantesimi', `livello ${livelloMassimo}`, `Magia sez. 1; tabella dei Gradi taumaturgici (${r.taumaturgo.livello_massimo_per_gradi.map((x) => `${romano(x.gradi)} → ${x.livello}`).join(', ')}), docs/risposte-master.md, decisione 5`),
    ], gradi),
  };
}

/** Testo delle regole mostrato nel passo Incantesimi (i dati sono in regole.json). */
export function regoleIncantesimi(dati) {
  const t = dati.regole.taumaturgo;
  return [
    t.quote_classe,
    t.famiglie_incantesimi_liberi,
    `Incantesimi liberi: ${t.incantesimi_liberi.formula}, minimo ${t.incantesimi_liberi.minimo}.`,
    `Sono ammessi gli incantesimi con livello base fino al livello massimo: ${t.livello_massimo_per_gradi.map((r) => `${r.gradi} Grad${r.gradi === 1 ? 'o' : 'i'} → ${r.livello}`).join(', ')}.`,
  ].filter(Boolean);
}

/**
 * Stato della scelta degli incantesimi, oppure null se il personaggio non ha accesso alla magia
 * o mancano Corporazione, Addestramento o Classe per calcolarlo.
 */
export function statoIncantesimi(scelte, dati) {
  if (!scelte || scelte.addestramento !== dati.regole.taumaturgo.addestramento) return null;
  const scheda = calcolaScheda(scelte, dati);
  if (!scheda.incantesimi) return null;
  const { liberi, diClasse, livelloMassimo } = scheda.incantesimi;

  const catalogo = dati.incantesimi.incantesimi;
  const scelti = (scelte.incantesimi ?? []).map((n) => catalogo.find((i) => i.nome === n)).filter(Boolean);
  const perMacro = {};
  for (const { nome } of dati.incantesimi.macrofamiglie) {
    perMacro[nome] = { quota: diClasse[nome] ?? 0, scelti: scelti.filter((i) => i.macrofamiglia === nome).length };
  }
  // Ciò che eccede la quota di Classe di una macrofamiglia consuma gli incantesimi liberi.
  const liberiUsati = Object.values(perMacro).reduce((s, m) => s + Math.max(0, m.scelti - m.quota), 0);
  const quoteClasse = Object.values(perMacro).reduce((s, m) => s + m.quota, 0);
  const totale = quoteClasse + liberi;
  return {
    livelloMassimo,
    liberi,
    liberiUsati,
    perMacro,
    totale,
    scelti: scelti.length,
    completo: scelti.length === totale && liberiUsati <= liberi,
    eccesso: liberiUsati > liberi,
  };
}

/** Perché non si può aggiungere questo incantesimo (null se si può). */
export function motivoBloccoIncantesimo(incantesimo, stato, scelte) {
  if ((scelte.incantesimi ?? []).includes(incantesimo.nome)) return null;
  if (incantesimo.livello_base > stato.livelloMassimo) {
    return `Livello base ${incantesimo.livello_base}: con 1 Grado taumaturgico il massimo è ${stato.livelloMassimo}.`;
  }
  const m = stato.perMacro[incantesimo.macrofamiglia];
  if (m && m.scelti < m.quota) return null;
  if (stato.liberiUsati < stato.liberi) return null;
  return `Quota ${incantesimo.macrofamiglia} della Classe esaurita e nessun incantesimo libero rimasto.`;
}

/**
 * Pallini del livello base di un incantesimo, a gruppi di tre per leggerli a colpo d'occhio:
 * 1 → [1], 3 → [3], 6 → [3, 3], 9 → [3, 3, 3]; qualunque intero ≥ 1 (7 → [3, 3, 1]).
 * Magia sez. 1: il livello dichiarato coincide con il costo in PM, quindi il livello base è anche
 * il costo minimo del lancio. Il numero viene dai dati (livello_base).
 */
export function gruppiPallini(livelloBase, perGruppo = 3) {
  const n = Number.isInteger(livelloBase) && livelloBase > 0 ? livelloBase : 0;
  const gruppi = [];
  for (let resto = n; resto > 0; resto -= perGruppo) gruppi.push(Math.min(perGruppo, resto));
  return gruppi;
}

/** «Livello base N: costa almeno N PM» (Magia sez. 1). */
export const testoLivelloBase = (livelloBase) => `Livello base ${livelloBase}: costa almeno ${livelloBase} PM`;
