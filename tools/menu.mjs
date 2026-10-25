// Il menu di Mutant.bat (25/10/2026, «un ingresso solo»): Mutant.bat è l'unico programma da aprire, e ogni funzione è
// una voce di questo elenco. Il .bat stampa le righe di righeMenu() e poi esegue la voce scelta (le etichette :<id>
// del .bat hanno gli stessi id di VOCI: tests/menu.test.js lo controlla). Qui niente che tocchi i file: solo testi.
//
// Le righe sono senza lettere accentate (la console di Windows non è in UTF-8): ascii() converte i testi che vengono
// da fuori (nomi dei personaggi, versione), le frasi fisse sono già scritte così.

/** Le voci del menu, nell'ordine e con il tasto. `cambiaPersonaggi`: la voce chiede SI prima di toccare i personaggi. */
export const VOCI = [
  { tasto: '1', id: 'avvia', etichetta: 'Avvia Mutant', descrizione: 'accende Mutant nella sua finestra nera e apre il browser' },
  { tasto: '2', id: 'aggiorna', etichetta: 'Aggiorna Mutant', descrizione: 'scarica la versione nuova: prima fa la copia di sicurezza dei dati, alla fine dice che cosa e\' cambiato' },
  { tasto: '3', id: 'salva', etichetta: 'Salva la sessione', descrizione: 'mette in un file zip personaggi, tavolo, scontri, mappe... (cartella salvataggi, e Drive se impostato)' },
  { tasto: '4', id: 'ripristina', etichetta: 'Ripristina un salvataggio', descrizione: 'rimette i dati da uno zip dei salvataggi; prima ne fa una copia e chiede conferma', cambiaPersonaggi: true },
  { tasto: '5', id: 'cartella', etichetta: 'Apri la cartella dei salvataggi', descrizione: 'apre una finestra di Esplora risorse sulla cartella salvataggi (solo se la scegli tu)' },
  { tasto: '6', id: 'controlla', etichetta: 'Controlla i file dei personaggi', descrizione: 'rapporto sui file dei personaggi; con SI mette i file vecchi in personaggi\\storico', cambiaPersonaggi: true },
  { tasto: '7', id: 'talenti', etichetta: 'Passa ai Talenti nuovi', descrizione: 'toglie a ogni personaggio i Talenti di oggi (copia zip prima, chiede SI); poi si scelgono dalla scheda', cambiaPersonaggi: true, stato: 'talenti' },
  { tasto: '8', id: 'talenti-ripristina', etichetta: 'Torna a com\'era prima dei Talenti nuovi', descrizione: 'rimette i personaggi dalla copia fatta al passaggio (chiede SI)', cambiaPersonaggi: true },
  { tasto: '9', id: 'impostazioni', etichetta: 'Impostazioni', descrizione: 'ruolo di questo PC, avvisi ntfy, cartella Drive, collegamento sul desktop' },
  { tasto: '0', id: 'esci', etichetta: 'Esci', descrizione: 'chiude questa finestra (se Mutant e\' acceso resta acceso)' },
];

/** I tasti per «choice /c», nell'ordine delle voci (il primo tasto = errorlevel 1). */
export const TASTI = VOCI.map((v) => v.tasto).join('');

/** Testo per la console di Windows: senza accenti, apostrofi e virgolette tipografiche. */
export function ascii(t) {
  return String(t ?? '')
    .replace(/[àá]/g, 'a\'').replace(/[èé]/g, 'e\'').replace(/[ìí]/g, 'i\'').replace(/[òó]/g, 'o\'').replace(/[ùú]/g, 'u\'')
    .replace(/[ÀÁ]/g, 'A\'').replace(/[ÈÉ]/g, 'E\'').replace(/[ÌÍ]/g, 'I\'').replace(/[ÒÓ]/g, 'O\'').replace(/[ÙÚ]/g, 'U\'')
    .replace(/[’‘]/g, '\'').replace(/[«»“”]/g, '"').replace(/[—–]/g, '-').replace(/·/g, '-').replace(/…/g, '...')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '');
}

const due = (n) => String(n).padStart(2, '0');

/** «fatto il 26/10 alle 21:10 (7 personaggi)», «non ancora fatto», …: lo stato del passaggio ai Talenti nuovi. */
export function testoStatoTalenti(s) {
  if (!s) return 'stato non leggibile';
  if (s.passati > 0) {
    const q = s.quando ? ` il ${due(s.quando.getDate())}/${due(s.quando.getMonth() + 1)} alle ${due(s.quando.getHours())}:${due(s.quando.getMinutes())}` : '';
    return `fatto${q} (${s.passati} ${s.passati === 1 ? 'personaggio' : 'personaggi'} su ${s.totale})`;
  }
  if (s.totale === 0) return 'non ancora fatto (nessun personaggio nella cartella)';
  return s.copie > 0 ? 'non ancora fatto (c\'e\' una copia di un passaggio annullato)' : 'non ancora fatto';
}

/**
 * Le righe del menu, intestazione compresa.
 * @param stato { versione, server, ruolo, impostazioni, talenti, cartella } testi già pronti (talenti: l'oggetto di
 *   statoPassaggio), tutti facoltativi
 */
export function righeMenu(stato = {}) {
  const r = [];
  r.push(' ==========================================================');
  r.push('   MUTANT - il programma di Mutant (tutto da questo menu)');
  r.push(' ==========================================================');
  if (stato.versione) r.push(` Versione: ${ascii(stato.versione)}`);
  if (stato.server) r.push(` Server: ${ascii(stato.server)}`);
  if (stato.ruolo) r.push(` Questo PC: ${ascii(stato.ruolo)}`);
  if (stato.impostazioni) r.push(` ${ascii(stato.impostazioni)}`);
  if (stato.cartella) r.push(` Cartella: ${stato.cartella}`);
  r.push('');
  for (const v of VOCI) {
    const extra = v.stato === 'talenti' && stato.talenti ? `   [Talenti nuovi: ${ascii(testoStatoTalenti(stato.talenti))}]` : '';
    r.push(`   ${v.tasto}. ${v.etichetta}${extra}`);
    r.push(`        ${v.descrizione}`);
  }
  r.push('');
  return r;
}
