// Scelta degli incantesimi conosciuti al 1° livello (Addestramento Taumaturgo). Funzioni pure.
// Regole confermate dal master (docs/risposte-master.md, decisioni 2–5):
//  - la quota di Classe di una macrofamiglia si spende in una qualunque delle sue specializzazioni;
//  - gli incantesimi liberi (2 + Mod INT, minimo 1) possono essere di qualunque macrofamiglia;
//  - sono ammessi gli incantesimi con livello base ≤ livello massimo della tabella per Gradi.
import { calcolaScheda } from './calc.js';

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
