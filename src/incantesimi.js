// Scelta degli incantesimi conosciuti al 1° livello (Addestramento Taumaturgo).
// Funzioni pure. Dove il manuale non è chiaro (TODO(Davide) in regole.json) si applica
// l'ipotesi più permissiva:
//  - la quota di Classe di una macrofamiglia copre qualunque sua specializzazione;
//  - gli incantesimi liberi (2 + Mod INT) possono essere di qualunque macrofamiglia;
//  - con 1 Grado sono ammessi tutti gli incantesimi con livello base ≤ 3 × Gradi (Magia, sezione 1).
import { calcolaScheda } from './calc.js';

export const IPOTESI_INCANTESIMI = [
  'La quota di Classe di una macrofamiglia si può spendere in una qualunque delle sue tre specializzazioni.',
  'Gli incantesimi liberi dell’Addestramento possono essere di qualunque macrofamiglia e specializzazione.',
  'Sono ammessi gli incantesimi con livello base non superiore al livello massimo (3 × Gradi taumaturgici).',
];

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
