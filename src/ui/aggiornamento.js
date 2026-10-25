// Avviso di aggiornamento (docs/cache.md). Modulo a sé, caricato da index.html prima di app.js: se
// per qualunque motivo i moduli dell'app non partono, la barra compare lo stesso.
// - All'avvio legge versione.json senza cache e scrive la versione nel piè di pagina.
// - Alla ripresa della finestra e ogni INTERVALLO_CONTROLLO_MS lo rilegge: se la versione del server
//   è diversa da quella caricata (meta «mutant-versione»), mostra in alto «Nuova versione
//   disponibile» con «Ricarica», che apre la stessa pagina con ?v=<versione nuova>.
// - Con il server di Mutant: se il server è stato acceso con una versione più vecchia di quella dei file
//   (aggiornamento senza riavvio), barra rossa «Riavvia avvia-server.bat» (src/versione.js → serverDaRiavviare).
// Non tocca il localStorage: i personaggi restano dove sono.
import { leggiVersione, serveAggiornamento, urlRicarica, testoVersione, INTERVALLO_CONTROLLO_MS, serverDaRiavviare, versioneInParole, leggiNovita } from '../versione.js';

const caricata = document.querySelector('meta[name="mutant-versione"]')?.content || null;
let mostrata = null;

async function versioneServer() {
  try {
    const r = await fetch('versione.json', { cache: 'no-store' });
    if (!r.ok) return null;
    const v = leggiVersione(await r.json());
    // versione con cui è stato acceso il server di Mutant (solo con server.mjs)
    const avvio = r.headers.get('X-Mutant-Versione-Server');
    // un server di Mutant che non dice la sua versione è di prima del 06/10: va riavviato anche lui
    if (v && serverDaRiavviare(avvio, v.versione, r.headers.get('X-Mutant-Server') === '1')) barraServer();
    return v;
  } catch {
    return null; // senza rete o senza file: nessun avviso
  }
}

function barra(v) {
  if (mostrata === v.versione) return;
  mostrata = v.versione;
  document.getElementById('barra-aggiornamento')?.remove();
  const el = document.createElement('div');
  el.id = 'barra-aggiornamento';
  el.className = 'barra-aggiornamento';
  el.setAttribute('role', 'status');
  const testo = document.createElement('span');
  // 13/10: la frase dice anche che cosa fare se «Ricarica» non bastasse (una pagina rimasta in cache)
  testo.textContent = `È disponibile la versione nuova${v.data ? ` (${v.data})` : ''}: ricarica. I personaggi salvati restano; se qualcosa non cambia, Ctrl+F5.`;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn primario';
  b.textContent = 'Ricarica';
  b.addEventListener('click', () => { location.href = urlRicarica(location.href, v.versione); });
  el.append(testo, ' ', b);
  document.body.prepend(el);
}

/** Il server di Mutant gira ancora con il codice di prima dell'aggiornamento: va riavviato. */
function barraServer() {
  if (document.getElementById('barra-server-vecchio')) return;
  const el = document.createElement('div');
  el.id = 'barra-server-vecchio';
  el.className = 'barra-aggiornamento barra-server-vecchio';
  el.setAttribute('role', 'alert');
  // 13/10 (segnalazione di Marcello: «Modifica master» non si vedeva): si dice anche che le novità del Tavolo non
  // funzionano finché il server non riparte, perché l'app nuova parla con il server vecchio
  el.textContent = 'Il server di Mutant è acceso da prima dell’ultimo aggiornamento dell’app e usa ancora il codice vecchio: '
    + '«Modifica master» e i bonus di circostanza non compaiono, e alcuni salvataggi (mappa, scontri, schede) potrebbero '
    + 'essere rifiutati. Chiudi la finestra di avvia-server.bat, riaprila e ricarica questa pagina (Ctrl+F5).';
  document.body.prepend(el);
}

async function controlla() {
  const v = await versioneServer();
  if (v && serveAggiornamento(caricata, v.versione)) barra(v);
  return v;
}

const piede = document.getElementById('versione-app');
/** Il titolo della versione (novita.json, scritto a mano): «Talenti nuovi». */
async function titoloVersione() {
  try {
    const r = await fetch('novita.json', { cache: 'no-store' });
    return r.ok ? leggiNovita(await r.json()) : null;
  } catch { return null; }
}
Promise.all([controlla(), titoloVersione()]).then(([v, titolo]) => {
  if (!piede) return;
  // 25/10/2026 («un ingresso solo», parte D): la versione in parole, la stessa del menu di Mutant.bat. La data e il
  // titolo valgono solo se il server ha la versione caricata; altrimenti l'impronta (la barra dice di ricaricare)
  const uguale = !caricata || v?.versione === caricata;
  piede.textContent = uguale && v ? versioneInParole(v, titolo) : testoVersione(caricata ? { versione: caricata, data: null } : v);
  piede.title = `Impronta della versione: ${caricata ?? v?.versione ?? 'sconosciuta'}`;
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') controlla(); });
setInterval(controlla, INTERVALLO_CONTROLLO_MS);
