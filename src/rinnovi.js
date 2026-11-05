// Lotto 175 (A.233): che cosa rinnoverebbero «Nuova scena» e «Nuovo capitolo» del Direttore. Funzione pura per la
// conferma della plancia: legge i file dei PG al tavolo (gli stessi che la plancia ha già) e conta gli usi consumati di
// quella frequenza che tornerebbero disponibili. Non scrive niente: il comando cambia solo il numero sul server
// (src/momento.js), e i file dei PG — con i loro PM, munizioni e riserve — restano come sono.
import { deserializzaPersonaggio, normalizza } from './character.js';
import { calcolaScheda } from './calc.js';
import { daRinnovare } from './usi-talenti.js';

/**
 * @param testi [{ file, testo }] dei PG al tavolo
 * @param frequenza 'scena' | 'capitolo'
 * @param momento { scena, capitolo } attuali del server
 * @returns {{ personaggi: [{ nome, voci: [{ nome, usati }] }], totale }} solo i PG con qualcosa da rinnovare
 */
export function riepilogoRinnovo(testi, frequenza, momento, dati) {
  const personaggi = [];
  for (const { testo } of testi ?? []) {
    try {
      const p = deserializzaPersonaggio(testo);
      const scelte = normalizza(p.creazione, dati).scelte;
      const scheda = calcolaScheda({ creazione: scelte, livelli: p.livelli }, dati);
      const voci = daRinnovare(scheda, p.sessione ?? {}, frequenza, { scena: momento?.scena ?? null, capitolo: momento?.capitolo ?? null });
      if (voci.length) personaggi.push({ nome: String(scelte.nome ?? '').trim() || '—', voci: voci.map((v) => ({ nome: v.nome, usati: v.usati })) });
    } catch { /* un file che non si legge non conta: la plancia lo segnala già a parte */ }
  }
  return { personaggi, totale: personaggi.reduce((t, p) => t + p.voci.reduce((u, v) => u + v.usati, 0), 0) };
}

/** Il testo della conferma: che cosa torna disponibile, che cosa no, e che si può annullare. */
export function testoConferma(frequenza, momento, riepilogo, regole) {
  const nome = frequenza === 'scena' ? 'scena' : 'capitolo';
  const prossimo = (momento?.[frequenza] ?? 1) + 1;
  const altra = frequenza === 'scena' ? 'per capitolo' : 'per scena';
  const usi = riepilogo.totale === 1 ? '1 uso' : `${riepilogo.totale} usi`;
  const chi = riepilogo.personaggi.map((p) => `${p.nome} (${p.voci.map((v) => v.nome).join(', ')})`).join('; ');
  return [
    `Comincia ${frequenza === 'scena' ? 'la scena' : 'il capitolo'} ${prossimo}.`,
    riepilogo.totale ? `${riepilogo.totale === 1 ? 'Torna disponibile' : 'Tornano disponibili'} ${usi} ${regole?.frequenze?.[frequenza]?.nome ?? `per ${nome}`}: ${chi}.` : `Nessun uso ${regole?.frequenze?.[frequenza]?.nome ?? `per ${nome}`} da rinnovare ai personaggi al tavolo.`,
    `Gli usi ${altra}, per combattimento e per sessione restano come sono. PM, munizioni e altre riserve non cambiano.`,
    'Si può annullare subito dopo, dalla plancia.',
  ].join(' ');
}
