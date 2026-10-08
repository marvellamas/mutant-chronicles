// «Salva sessione» e «Spegni Mutant» del Tavolo del Master (richiesta di Marcello dell'08/10/2026): la stessa
// procedura di salva-sessione.bat, eseguita dal server (server.mjs → POST /api/salva-sessione e /api/spegni,
// tools/salva-sessione.mjs): zip in salvataggi/, copia nella cartella di Google Drive, notifica ntfy a Marcello.
// L'esito si mostra in una riga («Sessione salvata: zip 812 KB · Drive ✓ · ntfy ✓»), con gli errori sotto: mai
// bloccanti, lo zip locale c'è sempre. «Spegni Mutant» funziona solo dal PC del server e chiede conferma.
import { h, svuota } from './dom.js';
import { avviso } from './avvisi.js';
import { chiedi } from './finestrella.js';

/** Le righe dell'esito: la riga riassuntiva e, sotto, i messaggi delle destinazioni non riuscite. */
export function righeEsito(e) {
  if (!e) return ['Nessuna risposta dal server.'];
  const errori = [e.drive, e.ntfy, e.github].filter((d) => d?.stato === 'errore').map((d) => d.messaggio);
  return [e.riga ?? (e.errore ? `Sessione NON salvata: ${e.errore}` : 'Esito sconosciuto.'), ...errori];
}

/** Tipo dell'avviso: verde se tutto è andato, rosso se lo zip manca o una destinazione impostata non è riuscita. */
export const tipoEsito = (e) => (!e?.ok ? 'errore' : [e.drive, e.ntfy, e.github].some((d) => d?.stato === 'errore') ? 'errore' : 'ok');

async function chiama(percorso) {
  const r = await fetch(percorso, { method: 'POST' });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(corpo.errore ?? `errore ${r.status}`);
  return corpo;
}

/** «Salva sessione»: si disabilita finché il server risponde, poi l'esito in un avviso. */
export function pulsanteSalvaSessione() {
  const b = h('button', {
    type: 'button', class: 'btn',
    title: 'Salvataggio completo: zip in salvataggi/ (mai sovrascritto), copia nella cartella di Google Drive e notifica a Marcello con i dati. Il server salva comunque da solo ogni 5 minuti in autosave/',
    onclick: async () => {
      b.disabled = true;
      b.textContent = 'Salvo…';
      try {
        const e = await chiama('api/salva-sessione');
        avviso(righeEsito(e), { tipo: tipoEsito(e), chiave: 'salva-sessione', durata: tipoEsito(e) === 'ok' ? 8000 : 15000 });
      } catch (err) {
        avviso(`Sessione NON salvata: ${err.message}. Si può usare salva-sessione.bat nella cartella di Mutant.`, { tipo: 'errore', chiave: 'salva-sessione' });
      } finally {
        b.disabled = false;
        b.textContent = 'Salva sessione';
      }
    },
  }, 'Salva sessione');
  return b;
}

/**
 * «Spegni Mutant»: conferma, salvataggio completo, esito; poi il server si spegne e la sua finestra si chiude.
 * La pagina resta con l'esito e «Mutant è spento».
 */
export function pulsanteSpegni() {
  const b = h('button', {
    type: 'button', class: 'btn pericolo',
    title: 'Fine serata: salva la sessione (zip, Google Drive, notifica a Marcello), poi spegne il server e chiude la sua finestra. Solo dal PC dove gira il server',
    onclick: async () => {
      const si = await chiedi({
        titolo: 'Spegnere Mutant?',
        testo: 'Prima salvo la sessione (zip, Google Drive, notifica a Marcello), poi spengo il server e chiudo la sua finestra nera. I tablet dei giocatori perdono il collegamento.',
        si: 'Salva e spegni', pericolo: true,
      });
      if (!si) return;
      b.disabled = true;
      b.textContent = 'Salvo e spengo…';
      let e;
      try {
        e = await chiama('api/spegni');
      } catch (err) {
        b.disabled = false;
        b.textContent = 'Spegni Mutant';
        avviso(`Mutant NON è stato spento: ${err.message}`, { tipo: 'errore', chiave: 'spegni' });
        return;
      }
      svuota(document.body, h('main', { class: 'pagina-spento' },
        h('h1', {}, 'Mutant è spento'),
        righeEsito(e).map((r, i) => h('p', { class: i ? 'nota' : '' }, r)),
        h('p', {}, 'La finestra nera del server si chiude da sola. Puoi chiudere questa scheda del browser.'),
        h('p', { class: 'nota' }, 'Per riaccendere: avvia-server.bat.')));
    },
  }, 'Spegni Mutant');
  return b;
}
