// Argomenti della riga di comando: un flag che non esiste ferma il programma, non si scarta in silenzio (lotto 145).
// Nel lotto 144 una prova ha aperto la cartella vera dei personaggi perché il flag era «--personaggi=» invece di
// «--cartella=»: il server lo ignorò e usò la cartella di sempre.
//   const ammessi = ['porta', 'cartella'];
//   fermaSeSconosciuti(process.argv.slice(2), ammessi, 'server.mjs');
// Valgono le due forme: `--nome=valore` e `--nome` (con il valore dopo uno spazio, o nessun valore).
// Gli argomenti che non cominciano per «--» (comandi, percorsi) non si controllano.

/** Le sole voci come `--personaggi` che il programma non conosce: [{ arg, nome, suggerimento }]. */
export function argomentiSconosciuti(argv, ammessi, sinonimi = {}) {
  const conosciuti = new Set(ammessi);
  const fuori = [];
  for (const a of argv) {
    if (typeof a !== 'string' || !a.startsWith('--') || a === '--') continue;
    const nome = a.slice(2).split('=')[0];
    if (conosciuti.has(nome)) continue;
    fuori.push({ arg: a, nome, suggerimento: suggerisci(nome, ammessi, sinonimi) });
  }
  return fuori;
}

const SINONIMI = { personaggi: 'cartella', 'cartella-personaggi': 'cartella', pg: 'cartella', dati: 'cartella', port: 'porta', local: 'solo-locale', locale: 'solo-locale' };

function distanza(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Il flag più vicino fra quelli che esistono (un nome di uso comune, o poche lettere di differenza), o null. */
export function suggerisci(nome, ammessi, sinonimi = {}) {
  const alias = { ...SINONIMI, ...sinonimi }[nome];
  if (alias && ammessi.includes(alias)) return alias;
  let migliore = null;
  for (const c of ammessi) {
    const d = distanza(nome, c);
    if (d <= Math.max(2, Math.floor(c.length / 4)) && (!migliore || d < migliore.d)) migliore = { c, d };
  }
  return migliore?.c ?? null;
}

/** Il messaggio per chi ha scritto un flag sbagliato (una riga per flag). */
export function messaggioSconosciuti(fuori, ammessi, programma = '') {
  return [
    ...fuori.map((x) => `${programma ? `${programma}: ` : ''}non conosco «--${x.nome}»${x.suggerimento ? `: forse intendevi «--${x.suggerimento}»?` : '.'}`),
    `Gli argomenti ammessi: ${ammessi.map((x) => `--${x}`).join(' ')}.`,
    'Il programma non parte: un argomento sbagliato, ignorato, può far lavorare su dati che non erano quelli voluti.',
  ].join('\n');
}

/** Ferma il programma (codice 2) se c'è un flag sconosciuto. `esci` e `scrivi` si sostituiscono nelle prove. */
export function fermaSeSconosciuti(argv, ammessi, programma = '', { esci = (c) => process.exit(c), scrivi = (t) => console.error(t), sinonimi = {} } = {}) {
  const fuori = argomentiSconosciuti(argv, ammessi, sinonimi);
  if (!fuori.length) return false;
  scrivi(messaggioSconosciuti(fuori, ammessi, programma));
  esci(2);
  return true;
}

/** Gli argomenti che ogni programma conosce: l'unico elenco, anche per le prove. */
export const ARGOMENTI = {
  'server.mjs': ['porta', 'solo-locale', 'rete', 'senza-avvisi', 'sostituisci', 'dati-reali', 'cartella', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'musica', 'galleria', 'px', 'salvataggi', 'autosave', 'config-salvataggi'],
  'salva-sessione.mjs': ['radice', 'config'],
  'migra-talenti.mjs': ['applica', 'ripristina', 'stato', 'cartella', 'porta', 'salvataggi', 'su'],
  'pulizia-personaggi.mjs': ['cartella', 'sposta', 'su'],
  'dati-locali.mjs': ['radice'],
  'esito-aggiornamento.mjs': ['radice'],
  'riavvia.mjs': ['avvia', 'porta', 'radice', 'senza-avvio'],
  'aggiorna-avviatori.mjs': ['prova', 'radice', 'salta', 'fuori'],
  'console.mjs': ['porta', 'radice'],
};
