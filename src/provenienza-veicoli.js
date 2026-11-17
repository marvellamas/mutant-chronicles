// Da quale edizione del Manuale dei Veicoli viene ogni campo di un profilo del catalogo (lotto 213).
//
// Come per le schede degli incantesimi (211) e le armi (206): la provenienza sta **sul campo** (`_edizione.campi`), il segno nella scheda del
// mezzo dice a parole quali campi non sono dell'edizione corrente e **si spegne da sé** quando il profilo è tutto a posto. Funzioni pure.
// **Riguarda il profilo del catalogo, mai il record dell'esemplare** (PI attuali, munizioni, riserve): quelli sono del gruppo, non di un manuale.

export const NOMI_CAMPI = {
  mov_q: 'movimento', man: 'manovrabilità', pi: 'PI delle strutture', ar: 'AR', corazzato: 'Corazzato', qualita: 'Qualità',
  ps_integrita: 'PS Integrità', carico_kg: 'carico utile', prezzo_cr: 'prezzo', ricambi_cr_per_pi: 'costo dei ricambi per PI',
};

/** L'edizione che i dati dichiarano corrente (`veicoli.corpus.edizione`), o null. */
export const edizioneCorrenteVeicoli = (veicoli) => veicoli?.corpus?.edizione ?? null;

/** I campi del profilo che non sono dell'edizione corrente: `[{ campo, nome, edizione }]`. Un campo senza provenienza non conta come vecchio. */
export function campiIndietroProfilo(profilo, corrente) {
  const p = profilo?._edizione?.campi ?? {};
  return Object.entries(p).filter(([, ed]) => ed && corrente && ed !== corrente).map(([campo, edizione]) => ({ campo, nome: NOMI_CAMPI[campo] ?? campo, edizione }));
}

/** La riga che la scheda scrive quando un campo è di un'edizione precedente, o **null** quando il profilo è tutto alla corrente. */
export function rigaProvenienzaProfilo(profilo, corrente, motivo = null) {
  const indietro = campiIndietroProfilo(profilo, corrente);
  if (!indietro.length) return null;
  const perEdizione = new Map();
  for (const v of indietro) perEdizione.set(v.edizione, [...(perEdizione.get(v.edizione) ?? []), v.nome]);
  const pezzi = [...perEdizione.entries()].map(([ed, nomi]) => `${nomi.join(', ')} da ${ed}`);
  return `Non tutto il profilo viene dal Manuale dei Veicoli ${corrente} — ${pezzi.join('; ')}.${motivo ? ` ${motivo}` : ''}`;
}

/** Il motivo scritto accanto ai campi rimasti indietro di un profilo (`veicoli.corpus.motivi_indietro`), o null. */
export function motivoIndietroProfilo(veicoli, profilo) {
  const m = (veicoli?.corpus?.motivi_indietro ?? []).find((x) => x.profilo === profilo?.id);
  return m?.motivo ?? null;
}
