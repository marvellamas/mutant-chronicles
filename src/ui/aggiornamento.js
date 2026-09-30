// Avviso di aggiornamento (docs/cache.md). Modulo a sé, caricato da index.html prima di app.js: se
// per qualunque motivo i moduli dell'app non partono, la barra compare lo stesso.
// - All'avvio legge versione.json senza cache e scrive la versione nel piè di pagina.
// - Alla ripresa della finestra e ogni INTERVALLO_CONTROLLO_MS lo rilegge: se la versione del server
//   è diversa da quella caricata (meta «mutant-versione»), mostra in alto «Nuova versione
//   disponibile» con «Ricarica», che apre la stessa pagina con ?v=<versione nuova>.
// Non tocca il localStorage: i personaggi restano dove sono.
import { leggiVersione, serveAggiornamento, urlRicarica, testoVersione, INTERVALLO_CONTROLLO_MS } from '../versione.js';

const caricata = document.querySelector('meta[name="mutant-versione"]')?.content || null;
let mostrata = null;

async function versioneServer() {
  try {
    const r = await fetch('versione.json', { cache: 'no-store' });
    return r.ok ? leggiVersione(await r.json()) : null;
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
  testo.textContent = `Nuova versione disponibile${v.data ? ` (${v.data})` : ''}. I personaggi salvati restano.`;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn primario';
  b.textContent = 'Ricarica';
  b.addEventListener('click', () => { location.href = urlRicarica(location.href, v.versione); });
  el.append(testo, ' ', b);
  document.body.prepend(el);
}

async function controlla() {
  const v = await versioneServer();
  if (v && serveAggiornamento(caricata, v.versione)) barra(v);
  return v;
}

const piede = document.getElementById('versione-app');
controlla().then((v) => {
  // nel piè di pagina la versione caricata; la data solo se è quella del server
  if (piede) piede.textContent = testoVersione(caricata ? { versione: caricata, data: v?.versione === caricata ? v.data : null } : v);
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') controlla(); });
setInterval(controlla, INTERVALLO_CONTROLLO_MS);
