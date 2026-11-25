// Il tocco e il pannello del diario del Direttore (lotto 249). Un tocco e un contatore: **niente pannello sempre
// aperto**, perché lo spazio in alto recuperato dal 221 e dal 244 non si rimette dentro (il pulsante sta nella riga
// del titolo che c'è già: 0 px in più).
//
// Quello che questo pannello NON è, e non deve diventare:
//   - non blocca niente: nessuna voce chiede una risposta perché il gioco prosegua, e il contatore non è un debito
//     da azzerare — si può chiudere con tutto da leggere;
//   - non è una vidimazione: non c'è «Approva» e non c'è «Respingi». Il Direttore legge; se vuole intervenire usa
//     gli strumenti che ha già (Modifica master, «Annulla ultimo colpo», il registro dello scontro).
// Se a qualcuno viene naturale aggiungere un pulsante che approva o annulla una voce: è la regola tradita, e va
// chiesto a Marcello prima di farlo.
import { h } from './dom.js';
import { GRAVITA } from '../avvisi-direttore.js';
import { leggiAvvisi, segnaAvvisiLetti, contoAvvisi, alCambioAvvisi } from '../avvisi-invio.js';

const svuotaIn = (el, ...figli) => { el.replaceChildren(...figli.flat().filter(Boolean)); };

/**
 * Il pulsante nella riga del titolo della plancia: «🔔 3» con quante cose nuove ci sono da vedere.
 * @param apri () => void: apre il pannello
 */
export function pulsanteAvvisi(apri) {
  const b = h('button', {
    type: 'button', class: 'btn btn-piccolo btn-avvisi', title: 'Quello che è successo di irregolare al tavolo: chi, cosa, quando e i numeri. Il Direttore legge, non approva.',
    onclick: apri,
  });
  const scrivi = (c) => {
    const n = c.da_leggere ?? 0;
    b.textContent = n ? `🔔 ${n}` : '🔔';
    b.classList.toggle('con-grosse', (c.grosse ?? 0) > 0);
    b.classList.toggle('niente-da-leggere', !n);
    b.setAttribute('aria-label', n ? `Diario del Direttore: ${n} ${n === 1 ? 'voce' : 'voci'} da leggere${c.grosse ? `, di cui ${c.grosse} grosse` : ''}` : 'Diario del Direttore: niente di nuovo');
  };
  scrivi(contoAvvisi());
  alCambioAvvisi(scrivi);
  // all'apertura della plancia il conto arriva dal server (e poi a ogni voce nuova e a ogni aggiornamento)
  leggiAvvisi().then((v) => v && scrivi(v));
  return b;
}

/** Il pannello: le voci, le più recenti per prime, con la gravità che si vede. */
export function pannelloAvvisi() {
  const finestra = h('dialog', { class: 'finestrella finestrella-avvisi', 'aria-label': 'Diario del Direttore' });
  const corpo = h('div', { class: 'avvisi-corpo' });
  const chiudi = () => { finestra.close(); finestra.remove(); };
  let dati = null;

  const disegna = () => {
    const voci = dati?.voci ?? [];
    const daLeggere = voci.filter((v) => !v.letto);
    svuotaIn(corpo,
      h('header', { class: 'avvisi-testa' },
        h('h2', {}, 'Diario del Direttore'),
        h('button', { type: 'button', class: 'btn', onclick: chiudi }, 'Chiudi')),
      h('p', { class: 'nota' },
        dati === null ? 'Il diario sta sul server (tavolo/avvisi.json): senza il server non c’è.'
          : !voci.length ? 'Niente: nessuna irregolarità da quando è cominciata la sessione.'
            : `${daLeggere.length} da leggere su ${voci.length}. Qui si legge che cosa è successo; la traccia resta dov’è già — lo storico del personaggio, il registro dello scontro, le «Modifiche del master». Nessuna voce va approvata.`),
      voci.length ? h('ul', { class: 'avvisi-elenco' }, voci.map((v) => h('li', {
        class: `avviso-voce gravita-${v.gravita}${v.letto ? ' letta' : ''}`,
      },
      h('span', { class: 'avviso-segno', title: `${GRAVITA[v.gravita]?.nome ?? v.gravita}: ${GRAVITA[v.gravita]?.criterio ?? ''}` }, GRAVITA[v.gravita]?.segno ?? '◐'),
      h('span', { class: 'avviso-riga' }, v.riga),
      v.dove ? h('small', { class: 'nota avviso-dove' }, ` la traccia è in ${v.dove}`) : null))) : null,
      daLeggere.length ? h('div', { class: 'riga-azioni' },
        h('button', {
          type: 'button', class: 'btn', title: 'Le voci restano scritte, con l’ora in cui le hai lette: non si cancella niente, né qui né nello storico',
          onclick: async () => { const v = await segnaAvvisiLetti('tutte'); if (v) { dati = v; disegna(); } },
        }, `Segna lette (${daLeggere.length})`)) : null);
  };

  disegna();
  finestra.append(corpo);
  finestra.addEventListener('cancel', (e) => { e.preventDefault(); chiudi(); });
  document.body.append(finestra);
  finestra.showModal();
  leggiAvvisi().then((v) => { dati = v; disegna(); });
  return finestra;
}
