// Storico del personaggio (N2, deciso da Marcello e Davide: l'app avvisa, non blocca; l'ultima parola è del master).
// Quando una regola sconsiglia un'azione, l'app la dice e offre «Procedi comunque»: se si procede, resta qui una riga
// «procedi comunque: …», che il master vede nella scheda (Identità → Storico) e nella plancia. Sta nella sessione del
// personaggio (sessione.storico: [{ quando, testo }]), si salva con il file e non entra in nessun calcolo.
// Funzioni pure.

/** Righe tenute: le più vecchie escono. */
export const STORICO_MAX = 100;

const lista = (v) => (Array.isArray(v) ? v : []);

/** Lo storico in forma valida: solo righe { quando: ISO, testo }, le ultime STORICO_MAX. */
export function allineaStorico(v) {
  return lista(v).filter((x) => x && typeof x.testo === 'string' && x.testo.trim() && typeof x.quando === 'string')
    .map((x) => ({ quando: x.quando, testo: x.testo.slice(0, 400) })).slice(-STORICO_MAX);
}

/** La sessione con una riga in più nello storico. */
export function rigaStorico(sessione, testo, adesso = new Date()) {
  const t = String(testo ?? '').trim();
  if (!t) return sessione;
  return { ...(sessione ?? {}), storico: [...allineaStorico(sessione?.storico), { quando: adesso.toISOString(), testo: t.slice(0, 400) }].slice(-STORICO_MAX) };
}

/** «procedi comunque: Sali al 7° livello (Punti Abilità in eccesso…)». */
export const testoProcedi = (azione, motivo = null) => `procedi comunque: ${azione}${motivo ? ` (${String(motivo).replace(/\.\s*$/, '')})` : ''}`;

/** Le righe «procedi comunque» dello storico, dalla più recente. */
export const procediComunque = (sessione) => allineaStorico(sessione?.storico).filter((x) => x.testo.startsWith('procedi comunque')).reverse();
