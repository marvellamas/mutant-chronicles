// Armi che si attivano per un tot di Round (CyberArma, Armamenti §7.25; A.158 del 13/10/2026). Funzioni pure.
//
// Il costo e la durata dipendono dalla Classe di chi la impugna e stanno nei dati, in `uso_per_classe` della
// voce di catalogo: Custode 1 PM per 15 Round e +1 al danno, Tecnomante 2 PM per 10 Round, le altre Classi
// soltanto con la batteria e a −2 al VA. L'app non obbliga a nulla: propone il costo giusto, segna i Round
// che restano e lascia che il tavolo decida (CLAUDE.md).
//
// Come per Morente (src/morente.js) l'attivazione si salva come riferimento temporale:
//   sessione.attivazioniArmi = { <uid>: { dal: Round, round: durata } }
// I Round che restano si ricavano dal Round corrente, così la vista al Round dello scontro resta idempotente.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const roundDi = (s) => (Number.isInteger(s?.round) && s.round >= 1 ? s.round : 1);

/**
 * La riga di `uso_per_classe` che vale per questo personaggio: la prima Classe che compare nei dati,
 * altrimenti la riga predefinita («altre»). null se la voce non ha il blocco.
 * @param def voce di catalogo
 * @param classi nomi delle Classi del personaggio
 */
export function usoPerClasse(def, classi = []) {
  const U = def?.uso_per_classe;
  if (!isOggetto(U) || !Array.isArray(U.classi)) return null;
  const miei = new Set((classi ?? []).filter(Boolean));
  const propria = U.classi.find((x) => miei.has(x.classe));
  return propria ?? U.classi.find((x) => x.classe === (U.predefinito ?? 'altre')) ?? null;
}

/** Nomi delle Classi di una scheda calcolata (scheda.classi: [{ nome, grado }]). */
export const classiDi = (scheda) => (scheda?.classi ?? []).map((c) => c.nome ?? c).filter(Boolean);

/** Le armi del personaggio che si attivano (quelle con `uso_per_classe` nella voce di catalogo). */
export function armiAttivabili(scheda) {
  return (scheda?.equipaggiamento?.armi ?? []).filter((a) => a.def?.uso_per_classe);
}

/**
 * Stato dell'attivazione di un'arma: { attiva, rimasti, dal, round } oppure null.
 * Scaduta (rimasti 0) vale come non attiva.
 */
export function statoAttivazioneArma(sessione, uid) {
  const x = isOggetto(sessione?.attivazioniArmi) ? sessione.attivazioniArmi[uid] : null;
  if (!isOggetto(x) || !Number.isInteger(x.round) || x.round < 1) return null;
  const dal = Number.isInteger(x.dal) && x.dal >= 1 ? x.dal : 1;
  // la durata va dal Round dell'attivazione alla fine del Round dal + round − 1 (durate_round, §8.9.1)
  const rimasti = Math.max(0, dal + x.round - roundDi(sessione));
  return { attiva: rimasti > 0, rimasti, dal, round: x.round };
}

/** Normalizza la mappa delle attivazioni: solo uid noti e durate intere; le scadute spariscono. */
export function allineaAttivazioniArmi(valore, uidNoti, round) {
  if (!isOggetto(valore)) return {};
  const r = Number.isInteger(round) && round >= 1 ? round : 1;
  const out = {};
  for (const [uid, x] of Object.entries(valore)) {
    if (uidNoti && !uidNoti.includes(uid)) continue;
    if (!isOggetto(x) || !Number.isInteger(x.round) || x.round < 1) continue;
    const dal = Number.isInteger(x.dal) && x.dal >= 1 ? x.dal : 1;
    if (dal + x.round - r <= 0) continue; // finita
    out[uid] = { dal, round: x.round };
  }
  return out;
}

/** Attivazione (o rinnovo): la durata riparte dal Round corrente. */
export function attivaArma(sessione, uid, round) {
  const r = Number.isInteger(round) && round >= 1 ? round : 1;
  return { ...(isOggetto(sessione?.attivazioniArmi) ? sessione.attivazioniArmi : {}), [uid]: { dal: roundDi(sessione), round: r } };
}

/** «Termina»: l'arma non è più attiva. */
export function terminaArma(sessione, uid) {
  const { [uid]: _via, ...resto } = isOggetto(sessione?.attivazioniArmi) ? sessione.attivazioniArmi : {};
  return resto;
}

/**
 * Riga da mostrare nella scheda e in «Attacca!»: costo, durata e Round che restano, con il motivo quando
 * la configurazione non è utilizzabile da questa Classe. null se l'arma non si attiva.
 */
export function testoAttivazione(def, scheda, sessione, uid) {
  const uso = usoPerClasse(def, classiDi(scheda));
  if (!uso) return null;
  const stato = statoAttivazioneArma(sessione, uid);
  const costo = uso.cariche ? `${uso.cariche} caric${uso.cariche === 1 ? 'a' : 'he'}` : uso.pm ? `${uso.pm} PM` : null;
  return {
    classe: uso.classe,
    ammessa: uso.ammesso !== false && !!uso.round,
    costo,
    pm: uso.pm ?? null,
    cariche: uso.cariche ?? null,
    round: uso.round ?? null,
    va: uso.va ?? 0,
    dannoExtra: uso.danno_extra ?? 0,
    testo: uso.testo ?? null,
    attiva: !!stato?.attiva,
    rimasti: stato?.rimasti ?? 0,
    // «1 PM · 15 Round» oppure «attiva · 7 Round»
    sintesi: stato?.attiva ? `attiva · ${stato.rimasti} Round` : costo && uso.round ? `${costo} · ${uso.round} Round` : null,
  };
}
