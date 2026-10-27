// Usi limitati di Talenti, Specializzazioni/Maestrie e del vantaggio dell'Addestramento (27/10/2026, lotto 129,
// dal tavolo di lunedì 26/10): alcuni si possono usare solo un certo numero di volte per scontro, per sessione o
// al giorno. Il catalogo lo dice con un campo `usi: { ambito, quantita }` (mai nel codice: un Talento nuovo con
// un "usi" compare da solo nella tab Combattimento, src/ui/tab.js → riquadroUsiTalenti).
//
// sessione.usiTalenti = { chiave: { usati, scontro? } }. «scontro» (solo ambito "scontro") è l'id dello scontro in
// cui si è usato per l'ultima volta: si azzera DA SOLO quando lo scontro cambia (lo stesso trucco di
// src/attacco-sintesi.js → sceltePerScontro, applicato qui ai contatori invece che alle scelte di «Attacca!»),
// senza bisogno di scrivere niente all'inizio di un nuovo scontro. Per "sessione" e "giorno" non c'è nessun
// azzeramento automatico (né una sessione di gioco né un giorno di calendario hanno un confine certo da sé):
// solo a mano, con lo stesso pulsante «Azzera» di ogni voce.
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Le voci con un `usi` definito che questo personaggio possiede davvero: Talenti Liberi, Specializzazioni/
 * Maestrie (già filtrate per il PG in `scheda.talentiLiberi`/`scheda.specializzazioni`, src/avanzamento.js) e,
 * se l'Addestramento ne ha uno, il suo vantaggio (chiave fissa «vantaggio»: un personaggio ne ha solo uno).
 * @returns [{ chiave, nome, ambito, quantita }]
 */
export function vociConUso(scheda) {
  const out = [];
  for (const t of [...(scheda?.talentiLiberi ?? []), ...(scheda?.specializzazioni ?? [])]) {
    if (isOggetto(t?.usi)) out.push({ chiave: t.id, nome: t.nome, ambito: t.usi.ambito, quantita: t.usi.quantita });
  }
  if (isOggetto(scheda?.vantaggio?.usi)) out.push({ chiave: 'vantaggio', nome: scheda.vantaggio.nome, ambito: scheda.vantaggio.usi.ambito, quantita: scheda.vantaggio.usi.quantita });
  return out;
}

/** Pulisce `sessione.usiTalenti` (interi ≥ 0, mai sopra una quantità ragionevole): per allineaSessione. */
export function allineaUsiTalenti(v) {
  if (!isOggetto(v)) return {};
  const out = {};
  for (const [chiave, x] of Object.entries(v)) {
    if (typeof chiave !== 'string' || !isOggetto(x) || !Number.isInteger(x.usati) || x.usati < 0) continue;
    out[chiave] = { usati: x.usati, ...(typeof x.scontro === 'string' ? { scontro: x.scontro } : {}) };
  }
  return out;
}

/**
 * Quanti ne ha già usati questa voce ADESSO: per l'ambito "scontro", 0 se lo scontro registrato non è più
 * quello corrente (si è azzerato da solo cambiando scontro), anche se la sessione salvata dice un numero diverso.
 */
export function usatiDi(sessione, voce, scontroId) {
  const x = sessione?.usiTalenti?.[voce.chiave];
  if (!x) return 0;
  if (voce.ambito === 'scontro' && (x.scontro ?? null) !== (scontroId ?? null)) return 0;
  return x.usati;
}

/** Le voci di questo personaggio con un «usi», pronte per la riga della tab Combattimento. */
export function statoUsiTalenti(scheda, sessione, scontroId) {
  return vociConUso(scheda).map((v) => ({ ...v, usati: usatiDi(sessione, v, scontroId) }));
}

/** Registra un uso in più della voce `chiave` (fino alla sua quantità): un tocco sul contatore, come le munizioni. */
export function usaUnaVolta(sessione, voce, scontroId, m) {
  const gia = usatiDi(sessione, voce, scontroId);
  if (gia >= voce.quantita) return sessione;
  const x = { usati: gia + 1, ...(voce.ambito === 'scontro' ? { scontro: scontroId ?? null } : {}) };
  return { ...sessione, usiTalenti: { ...(isOggetto(sessione.usiTalenti) ? sessione.usiTalenti : {}), [voce.chiave]: x } };
}

/** Azzera a mano la voce `chiave» (il pulsante «Azzera» di ogni riga): torna come se non fosse mai stata usata. */
export function azzeraUso(sessione, chiave) {
  if (!sessione?.usiTalenti?.[chiave]) return sessione;
  const { [chiave]: _via, ...resto } = sessione.usiTalenti;
  return { ...sessione, usiTalenti: resto };
}
