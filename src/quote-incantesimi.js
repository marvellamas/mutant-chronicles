// Il conto degli incantesimi, in un posto solo (27/10/2026, lotto 131: «tutti in grigio con un motivo che non era
// vero»). Prima c'erano tre copie del conto (creazione, Sali di livello, «Da scegliere») e ognuna bloccava a modo suo.
//
// Quota = quote di Classe per macrofamiglia + incantesimi liberi (Addestramento Taumaturgo e Talenti: Usufruitore di
// Magia, Incrementare Incantesimi). Imparati = gli incantesimi scelti alla creazione e ai livelli. NON occupano posti
// gli incantesimi che arrivano da un oggetto (artefatti, pergamene) né quelli aggiunti a mano.
// Le quote e il livello massimo sono UN AVVISO, mai un blocco (lotto 130, «il Direttore si fida dei giocatori»).
// Funzione pura, nessuna dipendenza.

/**
 * L'avviso per un incantesimo che il personaggio non ha ancora, o null se rientra in quote e livello massimo.
 * @param i incantesimo del catalogo (macrofamiglia, livello_base)
 * @param c { livelloMassimo, accesso?, perMacro: { macro: { quota, scelti } }, liberi, liberiUsati }
 */
export function avvisoIncantesimo(i, c) {
  if (c.accesso === false) return 'il personaggio non ha accesso alla magia';
  if (i.livello_base > c.livelloMassimo) return `livello base ${i.livello_base} oltre il livello massimo ${c.livelloMassimo}`;
  const m = c.perMacro?.[i.macrofamiglia];
  if (m && m.scelti < m.quota) return null;
  if (c.liberiUsati < c.liberi) return null;
  return `oltre la quota: ${i.macrofamiglia} e incantesimi liberi già tutti presi`;
}

/** Il conto di una scheda (scheda.incantesimi): quota, imparati e residuo, per macrofamiglia e in tutto. */
export function contoDaScheda(inc) {
  const perMacro = {};
  for (const [m, quota] of Object.entries(inc?.quote?.perMacro ?? {})) {
    perMacro[m] = { quota, scelti: (inc.conosciuti ?? []).filter((x) => x.macrofamiglia === m).length };
  }
  const totale = inc?.quote?.totale ?? 0;
  const imparati = (inc?.conosciuti ?? []).length;
  return {
    livelloMassimo: inc?.livelloMassimo ?? 0, accesso: !!inc?.scalaPotere, perMacro,
    liberi: inc?.quote?.liberi ?? 0, liberiUsati: inc?.quote?.liberiUsati ?? 0, totale, imparati, residuo: totale - imparati,
  };
}
