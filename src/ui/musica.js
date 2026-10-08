// «Musica di fondo» (richiesta di Marcello del 07/10/2026): scelta di un file della cartella musica/ del server
// (server.mjs → /api/musica), dalla preparazione dello scontro e dalla mappa. La musica suona sulla mappa
// (src/ui/mappa/audio.js), ripetuta di continuo, finché lo scontro è aperto.
import { h } from './dom.js';
import { apri } from './finestrella.js';

/** Elenco dei file di musica/ ([{ file, dimensione }]); errore se il server non risponde. */
export async function elencoMusica() {
  const r = await fetch('api/musica', { cache: 'no-store' });
  if (!r.ok) throw new Error(`elenco della musica non leggibile (${r.status})`);
  return r.json();
}

const mb = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`);

/**
 * Finestrella con i file disponibili, «Nessuna musica» e il file attuale evidenziato.
 * @returns Promise di { file: nome | null } oppure null se annullata
 */
export async function scegliMusica(attuale = null, formati = []) {
  let lista = [];
  let errore = null;
  try { lista = await elencoMusica(); } catch (e) { errore = e.message; }
  return apri('scegli-musica', 'Musica di fondo', (fine) => [
    h('p', { class: 'nota' }, `I file della cartella musica/ accanto ad avvia-server.bat (${formati.map((f) => f.toUpperCase()).join(', ')}): copiali lì e riapri questa finestra. Suona di continuo finché lo scontro è aperto.`),
    errore ? h('p', { class: 'motivo', role: 'alert' }, errore) : null,
    h('div', { class: 'scelta-pulsanti scelta-colonna' },
      h('button', { type: 'button', class: `btn scelta-btn${attuale ? '' : ' scelta'}`, 'aria-pressed': String(!attuale), onclick: () => fine({ file: null }) }, 'Nessuna musica'),
      lista.map((x) => h('button', { type: 'button', class: `btn scelta-btn${x.file === attuale ? ' scelta' : ''}`, 'aria-pressed': String(x.file === attuale), onclick: () => fine({ file: x.file }) },
        x.file, h('small', { class: 'nota' }, ` · ${mb(x.dimensione)}`))),
      !lista.length && !errore ? h('p', { class: 'nota' }, 'La cartella musica/ è vuota.') : null,
      attuale && !lista.some((x) => x.file === attuale) ? h('p', { class: 'motivo' }, `«${attuale}» non è più nella cartella musica/.`) : null),
    h('div', { class: 'riga-azioni finestrella-azioni' }, h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla')),
  ]);
}
