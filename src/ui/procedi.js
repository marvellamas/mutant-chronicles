// «Procedi comunque» (N2): un blocco per regola diventa un avviso. Se l'azione ha un motivo contrario, una finestrella
// lo dice e chiede; se si procede, l'azione si fa (con `forza`) e nello storico del personaggio resta la riga
// «procedi comunque: …» (src/storico.js), così il master lo vede. Senza motivo l'azione si fa subito.
import { chiedi } from './finestrella.js';
import { testoProcedi } from '../storico.js';

/**
 * @param registra (testo) => void: scrive la riga nello storico (ctx.azioni.storico, o la funzione dell'app)
 * @param opzioni { azione: nome breve dell'azione, motivo: testo della regola o null, fai: (forza: boolean) => any }
 * @returns true se l'azione è stata fatta
 */
export async function conAvviso(registra, { azione, motivo, fai }) {
  if (!motivo) { await fai(false); return true; }
  const ok = await chiedi({ titolo: `Avviso: ${azione}`, testo: `${String(motivo).replace(/\.\s*$/, '')}. L’app avvisa e non blocca: se il master è d’accordo puoi procedere; resta una riga nello storico del personaggio.`, si: 'Procedi comunque', no: 'Annulla' });
  if (!ok) return false;
  await fai(true);
  registra?.(testoProcedi(azione, motivo));
  return true;
}
