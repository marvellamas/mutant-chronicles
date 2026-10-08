// Riquadro «Collega i giocatori» della plancia (richiesta di Marcello del 03/10/2026): gli indirizzi a cui i
// telefoni e i PC della stessa rete Wi-Fi aprono Mutant, gli stessi della finestra del server (server.mjs →
// /api/rete, src/rete.js), con «Copia» e un codice QR per ciascuno, generato in locale (src/qr.js).
import { h } from './dom.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { svgQR } from '../qr.js';

/** Indirizzi dal server: { porta, soloLocale, indirizzi, altri, tuttiPerDubbio }, o null se non risponde. */
export async function leggiRete() {
  try {
    const r = await fetch('api/rete', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function copia(testo) {
  try {
    await navigator.clipboard.writeText(testo);
  } catch {
    // fuori da localhost il browser può negare gli appunti: copia alla vecchia maniera
    const t = h('textarea', { style: 'position:fixed;opacity:0' }, testo);
    document.body.append(t);
    t.select();
    const ok = document.execCommand?.('copy');
    t.remove();
    if (!ok) { avvisoErrore(`Non riesco a copiare: scrivi a mano ${testo}`); return; }
  }
  avviso(`Copiato: ${testo}`, { chiave: 'copia-indirizzo' });
}

const qr = (url) => {
  const el = h('span', { class: 'qr-collega' });
  el.innerHTML = svgQR(url, { pixel: 3 }); // SVG generato qui, dal solo indirizzo
  return el;
};

/**
 * @param rete risposta di /api/rete (null finché non arriva)
 * @param opzioni { aperto, onToggle }
 */
export function riquadroCollega(rete, { aperto, onToggle }) {
  if (!rete) return null;
  const { indirizzi = [], altri = [], tuttiPerDubbio, soloLocale, porta } = rete;
  // 08/10 (screenshot di Marcello): compatto, non più alto del riquadro «Scontro»: per ogni indirizzo il QR piccolo, l'URL
  // su una riga sola e «Copia»; una riga di spiegazione e l'aiuto in «Non si collegano?»
  return h('details', { class: 'riquadro collega-giocatori', open: aperto, ontoggle: (e) => onToggle(e.target.open) },
    h('summary', {}, h('strong', {}, 'Collega i giocatori')),
    soloLocale ? h('p', { class: 'riquadro attenzione' }, `Il server è acceso con --solo-locale: risponde solo a questo computer (http://localhost:${porta}). Riavvialo con avvia-server.bat per i giocatori.`)
      : !indirizzi.length ? h('p', { class: 'riquadro attenzione' }, 'Nessuna rete trovata: collega questo computer al Wi-Fi e riavvia avvia-server.bat.')
        : [
          h('p', { class: 'nota collega-spiega' }, 'Stessa rete Wi-Fi: aprite l’indirizzo o inquadrate il QR.'),
          h('ul', { class: 'collega-elenco' }, indirizzi.map((v) => h('li', { class: 'collega-voce' },
            qr(v.url),
            h('div', { class: 'collega-testo' },
              h('code', { class: 'collega-url', title: v.url }, v.url),
              h('span', { class: 'collega-azioni' },
                h('button', { type: 'button', class: 'btn btn-piccolo', 'aria-label': `Copia ${v.url}`, onclick: () => copia(v.url) }, 'Copia'),
                indirizzi.length > 1 || tuttiPerDubbio ? h('small', { class: 'nota' }, v.nome) : null))))),
          h('details', { class: 'collega-aiuto' }, h('summary', {}, 'Non si collegano?'),
            h('p', { class: 'nota' }, 'In Windows la rete Wi-Fi deve essere «privata», non «pubblica», e il firewall deve consentire Node.js (alla prima accensione Windows lo chiede: «reti private»).'),
            tuttiPerDubbio ? h('p', { class: 'nota' }, 'Non so quale sia la rete Wi-Fi: provate gli indirizzi uno alla volta.') : null,
            altri.length ? h('p', { class: 'nota' }, `Reti virtuali escluse: ${altri.map((v) => `${v.indirizzo} (${v.nome})`).join(', ')}.`) : null),
        ]);
}
