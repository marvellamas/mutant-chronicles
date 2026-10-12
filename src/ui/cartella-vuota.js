// «Non trovo personaggi in questa cartella» (12/10/2026, docs/diagnosi-dati-spariti-2026-10-12.md).
// Dopo un aggiornamento sbagliato le cartelle di Davide erano vuote e nessuno glielo diceva: lo si vede solo
// aprendo il Tavolo e non trovando nessuno. Adesso lo dicono la finestra nera del server (server.mjs) e la
// plancia, con il percorso della cartella in uso ben visibile e i salvataggi da cui si può ripartire.
import { h } from './dom.js';

/** Lo stato dell'avvio dal server (server.mjs → /api/avvio). Senza server, o in errore, nessun avviso. */
export async function leggiAvvioVuoto(fetchFn = fetch) {
  try {
    const r = await fetchFn('/api/avvio');
    if (!r.ok) return null;
    const a = await r.json();
    return a?.vuota ? a : null;
  } catch { return null; }
}

/** «09/10/2026 21:40». Le date arrivano dal server come testo ISO. */
export function quando(x) {
  const d = x instanceof Date ? x : new Date(x);
  if (Number.isNaN(d.getTime())) return '';
  const due = (n) => String(n).padStart(2, '0');
  return `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} ${due(d.getHours())}:${due(d.getMinutes())}`;
}

/**
 * Il testo dell'avviso, senza DOM: funzione pura, così si prova.
 * @returns {{ titolo, percorso, righe: string[], cosaFare }}
 */
export function testoCartellaVuota(a) {
  const righe = (a?.salvataggi ?? []).map((s) => `${quando(s.mtime)} · ${s.nome} · ${s.tipoTesto ?? ''} · ${s.dove ?? ''}`.replace(/ · $/, ''));
  return {
    titolo: 'Non trovo personaggi in questa cartella',
    percorso: a?.percorso ?? '',
    righe,
    cosaFare: righe.length
      ? 'Se i personaggi dovevano esserci, non sono persi: si rimettono da un salvataggio. Chiudi la finestra nera di Mutant, apri Mutant.bat e scegli «4. Ripristina un salvataggio».'
      : 'Non ci sono nemmeno salvataggi in questa cartella. Prima di rifare i personaggi, controlla di aver aperto la cartella giusta: il percorso qui sopra è quello in uso.',
  };
}

/** La fascia da mettere in cima alla plancia. `null` se non c'è niente da dire. */
export function fasciaCartellaVuota(a) {
  if (!a?.vuota) return null;
  const t = testoCartellaVuota(a);
  return h('div', { class: 'fascia-cartella-vuota', role: 'status' },
    h('p', { class: 'fascia-titolo' }, t.titolo),
    h('p', { class: 'fascia-percorso' }, 'Cartella in uso: ', h('code', {}, t.percorso)),
    t.righe.length
      ? h('details', { class: 'fascia-salvataggi', open: true },
        h('summary', {}, `Salvataggi da cui ripartire (${t.righe.length})`),
        h('ul', {}, t.righe.map((r) => h('li', {}, r))))
      : null,
    h('p', { class: 'fascia-cosa-fare' }, t.cosaFare));
}
