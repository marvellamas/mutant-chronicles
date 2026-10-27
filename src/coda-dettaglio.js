// A.180 (Davide, 25/10/2026): ogni modifica in attesa di approvazione si legge con il valore precedente, il valore
// proposto e la dicitura «In attesa di approvazione». Funzioni pure: le usano la coda del tablet (src/ui/stato-tablet.js)
// e la schermata di rientro del Direttore (src/rientro.js → rigaOperazione).

export const DICITURA_ATTESA = 'In attesa di approvazione';

const segno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

const breve = (v) => {
  if (v === undefined || v === null || v === '') return '(vuoto)';
  if (typeof v === 'string') return v.length > 40 ? `${v.slice(0, 40)}…` : v;
  if (typeof v === 'object') return v.nome ?? v.testo ?? v.rif ?? JSON.stringify(v);
  return String(v);
};

/**
 * Valore precedente e valore proposto di un'operazione del giornale.
 *  - assegna / aggiorna: il valore visto dal tablet e quello nuovo;
 *  - somma: il valore prima e dopo se la voce li porta (`prima`, `dopo`), altrimenti la sola variazione;
 *  - insieme: l'elemento aggiunto (prima «assente») o tolto (prima «presente»).
 * @returns { precedente: string|null, proposto: string }
 */
export function dettaglioOperazione(op) {
  if (!op) return { precedente: null, proposto: '' };
  if (op.tipo === 'somma') {
    if (typeof op.prima === 'number' && typeof op.dopo === 'number') return { precedente: String(op.prima), proposto: String(op.dopo) };
    return { precedente: null, proposto: segno(op.delta ?? 0) };
  }
  if (op.tipo === 'insieme' && (op.azione === 'aggiungi' || op.azione === 'togli')) {
    return op.azione === 'aggiungi' ? { precedente: 'assente', proposto: 'aggiunto' } : { precedente: 'presente', proposto: 'tolto' };
  }
  return { precedente: breve(op.visto), proposto: breve(op.nuovo) };
}

/** La riga in una frase: «da 12 a 7» / «(+2)». */
export function fraseDettaglio(op) {
  const { precedente, proposto } = dettaglioOperazione(op);
  return precedente === null ? `variazione ${proposto}` : `prima: ${precedente} → proposto: ${proposto}`;
}
