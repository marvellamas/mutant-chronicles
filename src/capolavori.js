// L'uso dei Capolavori (A.259, Davide 06/11/2026). Funzioni pure.
//
// «Ogni singolo Capolavoro concede un proprio uso una volta per sessione, non una volta per personaggio. Deve essere
// lo strumento principale di una prova pertinente e non offensiva. Nella stessa prova si può usare un solo Capolavoro
// e ripetere il tiro una sola volta, accettando il secondo risultato. Se l'oggetto viene trasferito, resta già usato
// fino alla sessione successiva.»
//
// **Dove sta il contatore, e perché.** Sulla **voce dell'oggetto** (`voce.capolavoro.usato`), non nella sessione del
// personaggio. È l'ultimo punto della risposta a deciderlo: se stesse sulla scheda, passando il Capolavoro a un
// compagno l'uso tornerebbe disponibile, e la regola dice il contrario. Nei dati il Talento lo dichiara con
// `usi: { frequenza: 'sessione', quantita: 1, per: 'capolavoro' }`: il «per» guarda l'oggetto, come Hacker guarda il
// sistema (lotto 175). Un Capolavoro trasferito porta con sé il suo segno, e «Nuova sessione» lo toglie.
//
// **Quello che l'app non giudica** (regole.json → capolavoro.al_tavolo): se la prova è pertinente, se l'oggetto ne è
// lo strumento principale, se è offensiva. Quello resta al tavolo: l'app lo scrive accanto al pulsante invece di
// decidere. Quello che l'app fa è contare l'uso, dire quando torna, impedire il secondo Capolavoro nella stessa
// prova, impedire il secondo tiro ripetuto e **tenere il secondo risultato anche se è peggiore del primo**.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const lista = (v) => (Array.isArray(v) ? v : []);

/** Il blocco `capolavoro` delle regole. */
export const regoleCapolavoro = (dati) => (isOggetto(dati?.regole?.capolavoro) ? dati.regole.capolavoro : isOggetto(dati?.capolavoro) ? dati.capolavoro : null);

/** Una voce dell'inventario è un Capolavoro? (`voce.capolavoro`, come l'armatura del Corazzaio della A.61) */
export const eCapolavoro = (voce) => isOggetto(voce?.capolavoro);

/** Il segno dell'uso sulla voce, o null: `{ quando, prova? }`. */
export const usoDi = (voce) => (isOggetto(voce?.capolavoro?.usato) ? voce.capolavoro.usato : null);

/** Il Capolavoro è già stato usato in questa sessione? */
export const giaUsato = (voce) => usoDi(voce) !== null;

/**
 * I Capolavori di un personaggio, con il loro stato.
 * @param equipaggiamento le voci delle scelte (creazione.equipaggiamento)
 * @param nomi (uid) → nome da mostrare, facoltativo (il nome risolto dal catalogo)
 * @returns [{ uid, nome, usato, quando, disponibile }]
 */
export function statoCapolavori(equipaggiamento, nomi = null) {
  return lista(equipaggiamento).filter(eCapolavoro).map((v) => {
    const u = usoDi(v);
    return {
      uid: v.uid,
      nome: (typeof nomi === 'function' ? nomi(v) : null) ?? v.nome ?? v.rif ?? v.uid,
      usato: u !== null,
      quando: u?.quando ?? null,
      disponibile: u === null,
    };
  });
}

/** I Capolavori ancora disponibili. */
export const capolavoriDisponibili = (equipaggiamento, nomi = null) => statoCapolavori(equipaggiamento, nomi).filter((x) => x.disponibile);

/**
 * Si può usare questo Capolavoro in questa prova? L'app controlla soltanto quello che sa: l'uso dell'oggetto, il
 * secondo Capolavoro nella stessa prova e il secondo tiro ripetuto. Pertinenza, strumento principale e offensività
 * restano al tavolo.
 * @param prova { capolavoro?: uid già usato in questa prova, ripetizioni?: quante volte si è già ripetuto }
 * @returns {{ si: true } | { si: false, motivo }}
 */
export function puoUsare(voce, prova, dati) {
  const T = regoleCapolavoro(dati)?.testi ?? {};
  const R = regoleCapolavoro(dati);
  if (!eCapolavoro(voce)) return { si: false, motivo: 'questo oggetto non è un Capolavoro' };
  if (giaUsato(voce)) return { si: false, motivo: T.gia_usato ?? 'già usato in questa sessione' };
  const p = isOggetto(prova) ? prova : {};
  if (p.capolavoro && p.capolavoro !== voce.uid) return { si: false, motivo: T.altro_in_prova ?? 'in questa prova è già stato usato un Capolavoro' };
  const fatte = Number.isInteger(p.ripetizioni) ? p.ripetizioni : 0;
  const massimo = Number.isInteger(R?.ripetizioni_per_prova) ? R.ripetizioni_per_prova : 1;
  if (fatte >= massimo) return { si: false, motivo: T.gia_ripetuto ?? 'il tiro è già stato ripetuto' };
  return { si: true, motivo: null };
}

/**
 * Registra l'uso di un Capolavoro: il segno va **sulla voce dell'oggetto**, così resta anche se l'oggetto cambia
 * padrone. Torna le voci nuove e lo stato della prova aggiornato; `{ errore }` se l'uso non è ammesso.
 * @returns {{ equipaggiamento, prova, voce } | { errore }}
 */
export function usaCapolavoro(equipaggiamento, uid, dati, { quando = null, prova = null } = {}) {
  const voce = lista(equipaggiamento).find((v) => v?.uid === uid);
  if (!voce) return { errore: 'oggetto non trovato nell’inventario' };
  const ok = puoUsare(voce, prova, dati);
  if (!ok.si) return { errore: ok.motivo };
  const nuova = { ...voce, capolavoro: { ...voce.capolavoro, usato: { ...(quando ? { quando } : {}) } } };
  const p = isOggetto(prova) ? prova : {};
  return {
    equipaggiamento: lista(equipaggiamento).map((v) => (v?.uid === uid ? nuova : v)),
    prova: { ...p, capolavoro: uid, ripetizioni: (Number.isInteger(p.ripetizioni) ? p.ripetizioni : 0) + 1 },
    voce: nuova,
  };
}

/**
 * L'esito della ripetizione: **vale sempre il secondo**, anche se è peggiore del primo. È l'errore facile da fare,
 * quindi qui non c'è nessun confronto fra i due: il primo resta soltanto da mostrare.
 * @returns {{ vale: 'secondo', primo, secondo, peggiore, testo }}
 */
export function esitoRipetizione(primo, secondo, dati) {
  const T = regoleCapolavoro(dati)?.testi ?? {};
  const n = (x) => (Number.isFinite(x?.naturale) ? x.naturale : Number.isFinite(x) ? x : null);
  const a = n(primo);
  const b = n(secondo);
  return {
    vale: 'secondo',
    primo,
    secondo,
    peggiore: a !== null && b !== null ? b < a : false,
    testo: T.secondo ?? 'Vale il secondo risultato, anche se è peggiore del primo.',
  };
}

/** «Nuova sessione»: i Capolavori tornano disponibili (A.233: gli usi per sessione si rinnovano a inizio partita). */
export function rinnovaCapolavori(equipaggiamento) {
  let cambiato = false;
  const out = lista(equipaggiamento).map((v) => {
    if (!eCapolavoro(v) || !giaUsato(v)) return v;
    cambiato = true;
    const { usato: _via, ...resto } = v.capolavoro;
    return { ...v, capolavoro: resto };
  });
  return cambiato ? out : lista(equipaggiamento);
}

/** Quanti Capolavori tornerebbero disponibili con «Nuova sessione» (per la conferma). */
export const daRinnovare = (equipaggiamento) => statoCapolavori(equipaggiamento).filter((x) => x.usato).length;

/** La riga da scrivere accanto al pulsante: quello che decide il tavolo, non l'app. */
export const testoAlTavolo = (dati) => regoleCapolavoro(dati)?.al_tavolo?.testo ?? 'Lo decide il tavolo: pertinenza, strumento principale e prova non offensiva.';

/**
 * «Torna alla prossima sessione»: il testo della frequenza «sessione» dei dati (regole.json → frequenze), lo stesso
 * che leggono gli altri usi per sessione del lotto 175. `breve` per il pulsante, dove la riga non deve allungarsi.
 */
export function quandoTorna(dati, { breve = false } = {}) {
  const f = dati?.regole?.frequenze?.sessione ?? dati?.frequenze?.sessione ?? null;
  return (breve ? f?.breve : f?.torna) ?? (breve ? 'nuova sessione' : 'torna alla prossima sessione');
}
