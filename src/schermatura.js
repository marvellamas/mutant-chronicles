// Contenitori del Silenzio: indicazione «Schermatura attiva / inattiva» (A.163, precisazione di Davide del
// 16/10/2026). Funzioni pure.
//
// La schermatura appartiene al contenitore e vale per **qualsiasi** contenuto: l'app non controlla che cosa
// c'è dentro (CyberArma, armatura, anello e amuleto sono esempi d'uso, non un elenco di oggetti ammessi).
// Dipende da tre condizioni, tutte necessarie, in data/regole.json → schermatura.condizioni:
//   - contenuto interamente riposto;
//   - contenitore chiuso;
//   - schermatura integra (il contenitore non è rotto).
// Le prime due le segna chi gioca con un tocco nella riga dell'oggetto (sessione.contenitori); la terza
// viene dai PI. Nessun calcolo automatico della Corruzione: l'app mostra l'indicazione e la regola, e la
// schermatura non elimina la Corruzione dell'oggetto né quella già accumulata dai personaggi.
//
// Nella sessione: sessione.contenitori = { <uid>: { chiuso?: true, riposto?: true } }, scritto solo per i
// contenitori che qualcuno ha toccato.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Le regole della schermatura dai dati, o null. */
export const regoleSchermatura = (dati) => (isOggetto(dati?.regole?.schermatura) ? dati.regole.schermatura : null);

/** La voce di catalogo scherma? (campo `schermatura` dell'oggetto) */
export const schermaQualcosa = (def) => isOggetto(def?.schermatura);

/** I contenitori schermanti fra gli oggetti risolti del personaggio. */
export function contenitoriSchermanti(oggetti) {
  return (oggetti ?? []).filter((o) => schermaQualcosa(o.def)).map((o) => ({ uid: o.uid, nome: o.nome, schermatura: o.def.schermatura }));
}

/** Lo stato salvato di un contenitore: { chiuso, riposto }, falsi se non lo ha toccato nessuno. */
export function statoContenitore(sessione, uid) {
  const x = isOggetto(sessione?.contenitori) ? sessione.contenitori[uid] : null;
  return { chiuso: isOggetto(x) && x.chiuso === true, riposto: isOggetto(x) && x.riposto === true };
}

/**
 * «Schermatura attiva / inattiva» di un contenitore.
 * @param stato { chiuso, riposto } della sessione
 * @param opz { rotto: il contenitore è a 0 PI? }
 * @returns { attiva, nome, etichetta, motivi: [testi], condizioni: [{ id, nome, ok }], nota }
 */
export function statoSchermatura(stato, { rotto = false } = {}, dati) {
  const S = regoleSchermatura(dati);
  const elenco = S?.condizioni ?? [];
  const valori = { riposto: !!stato?.riposto, chiuso: !!stato?.chiuso, integra: !rotto };
  const condizioni = elenco.map((c) => ({ id: c.id, nome: c.nome, ok: valori[c.id] === true, motivo: c.motivo }));
  const attiva = condizioni.length > 0 && condizioni.every((c) => c.ok);
  return {
    attiva,
    nome: S?.nome ?? 'Schermatura',
    etichetta: attiva ? S?.attiva ?? 'Schermatura attiva' : S?.inattiva ?? 'Schermatura inattiva',
    condizioni,
    motivi: condizioni.filter((c) => !c.ok).map((c) => c.motivo),
    nota: S?.non_elimina ?? null,
  };
}

/** Normalizza la mappa dei contenitori: solo uid noti e solo chi ha qualcosa di acceso. */
export function allineaContenitori(valore, uidNoti) {
  if (!isOggetto(valore)) return {};
  const out = {};
  for (const [uid, x] of Object.entries(valore)) {
    if (uidNoti && !uidNoti.includes(uid)) continue;
    const v = { ...(isOggetto(x) && x.chiuso === true ? { chiuso: true } : {}), ...(isOggetto(x) && x.riposto === true ? { riposto: true } : {}) };
    if (Object.keys(v).length) out[uid] = v;
  }
  return out;
}

/** Accende o spegne «chiuso» o «riposto» di un contenitore: torna la mappa nuova. */
export function commutaContenitore(valore, uid, campo) {
  const base = isOggetto(valore) ? valore : {};
  const ora = statoContenitore({ contenitori: base }, uid);
  const nuovo = { ...ora, [campo]: !ora[campo] };
  const v = { ...(nuovo.chiuso ? { chiuso: true } : {}), ...(nuovo.riposto ? { riposto: true } : {}) };
  if (!Object.keys(v).length) { const { [uid]: _via, ...resto } = base; return resto; }
  return { ...base, [uid]: v };
}
