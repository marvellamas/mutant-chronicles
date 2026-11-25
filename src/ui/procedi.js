// «Procedi comunque» (N2): un blocco per regola diventa un avviso. Se l'azione ha un motivo contrario, una finestrella
// lo dice e chiede; se si procede, l'azione si fa (con `forza`) e nello storico del personaggio resta la riga
// «procedi comunque: …» (src/storico.js), così il master lo vede.
//
// Lotto 249, la seconda metà della regola: la riga nello storico sta **dentro il file di quel personaggio**, e per
// leggerla il Direttore deve aprire la sua scheda. Quindi di qui parte anche una voce per il **diario del Direttore**
// (src/avvisi-direttore.js), che è il posto solo dove lui legge che cosa è successo. Passa tutto da `conAvviso`: chi
// aggiunge un «Procedi comunque» non deve ricordarsi di avvisare anche il Direttore.
//
// La gravità si ricava da qui, e il criterio è quello di Marcello («quello che cambia un numero è più grosso»): se
// l'azione scrive una riga nello storico del personaggio, ha cambiato il suo file — e quelle sono le **grosse**;
// senza storico cambia lo stato del tavolo e non il file — quelle sono **medie**. Chi sa meglio lo dichiara.
import { chiedi } from './finestrella.js';
import { testoProcedi } from '../storico.js';
import { mandaAvviso, chiAvvisa } from '../avvisi-invio.js';

/**
 * @param registra (testo) => void: scrive la riga nello storico (ctx.azioni.storico, o la funzione dell'app)
 * @param opzioni { azione: nome breve dell'azione, motivo: testo della regola o null, fai: (forza: boolean) => any,
 *   chi?: il personaggio a cui è successo, numeri?: i numeri che servono a capirlo, gravita?: 'grossa'|'media'|'piccola' }
 * @returns true se l'azione è stata fatta
 */
export async function conAvviso(registra, { azione, motivo, fai, chi = null, numeri = null, gravita = null }) {
  if (!motivo) { await fai(false); return true; }
  const ok = await chiedi({ titolo: `Avviso: ${azione}`, testo: `${String(motivo).replace(/\.\s*$/, '')}. L’app avvisa e non blocca: se il master è d’accordo puoi procedere; resta una riga nello storico del personaggio e una nel diario del Direttore.`, si: 'Procedi comunque', no: 'Annulla' });
  if (!ok) return false;
  await fai(true);
  registra?.(testoProcedi(azione, motivo));
  // al Direttore, sempre: è l'unico punto in cui questo non si può dimenticare
  const quale = chi ?? chiAvvisa();
  await mandaAvviso({
    chi: quale,
    cosa: `${azione} con «Procedi comunque»`,
    numeri,
    motivo: String(motivo).replace(/\.\s*$/, ''),
    dove: registra ? (quale ? `storico di ${quale}` : 'storico del personaggio') : null,
    gravita: gravita ?? (registra ? 'grossa' : 'media'),
  });
  return true;
}
