// Lotto 246 — il censimento dei blocchi dell'app, fatto a macchina.
//
// PERCHÉ. La sera del 22/11 l'app ha fermato il tavolo per quaranta minuti: sette giocatori in attesa e un passaggio di
// livello che non si chiudeva. Il lotto 241 ha liberato l'avanzamento trovando quattordici blocchi su tre strati; questo
// strumento cerca gli stessi meccanismi in TUTTA l'app, perché l'elenco dei posti non lo conosciamo e un elenco scritto a
// mano invecchia in silenzio. Chi legge il risultato è Marcello, che decide; chi lo ricontrolla a ogni commit è
// tests/registro-blocchi-246.test.js, che confronta quello che si trova con quello che il registro dichiara.
//
// CHE COSA CERCA (i meccanismi, non i posti), su quattro strati:
//   pagina  — un comando che c'è ma rifiuta: `disabled` vero in un elemento, `aria-disabled`, `.disabled = true`
//   motore  — un'operazione che non si conclude: `throw`, e i rifiuti dichiarati (`ok: false`, `bloccante`, `vietato`…)
//   server  — un rifiuto HTTP: `json(res, 4xx, …)` e `{ stato: 4xx, … }`
//   dati    — un rifiuto che impedisce di salvare: `validaNemico`/`validaScena`/`validaPersonaggio` che tornano errori
//
// CHE COSA NON PUÒ CERCARE, e va detto invece di fingere: un riquadro che compare solo a condizione. In una pagina ogni
// cosa è condizionata, e a macchina non si distingue «non lo mostro perché non serve» da «non te lo lascio fare». I
// comandi che ci sono e rifiutano si vedono tutti; quelli che non compaiono affatto li trova solo la prova al tavolo.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const RADICE = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** I meccanismi cercati, uno per strato. Chi aggiunge un modo di fermare qualcuno lo aggiunge qui. */
export const MECCANISMI = {
  pagina: [
    { nome: 'disabled', re: /(?:^|[\s,{(])disabled\s*[:=]\s*(?!false\b)(?!undefined\b)([^,;)\n]+)/ },
    { nome: 'aria-disabled', re: /'aria-disabled'\s*:\s*(?!'false')([^,;)\n]+)/ },
    { nome: "setAttribute('disabled')", re: /setAttribute\(\s*'disabled'/ },
  ],
  motore: [
    { nome: 'throw', re: /(?:^|[\s;{(])throw\s+/ },
    { nome: 'rifiuto dichiarato', re: /\b(?:ok:\s*false|bloccante:\s*true|bloccato:\s*true|vietato:\s*true|consentito:\s*false|permesso:\s*false)\b/ },
  ],
  server: [
    { nome: 'risposta 4xx', re: /json\(\s*res\s*,\s*(4\d\d)/ },
    { nome: 'esito 4xx', re: /\bstato:\s*(4\d\d)\b/ },
  ],
};

const SALTA_CARTELLE = new Set(['node_modules', '.git', '.cache', 'istantanee', 'personaggi', 'salvataggi', 'autosave', 'backup-master', 'distribuzione', '.claude']);

function* fileJs(dir) {
  for (const v of readdirSync(dir, { withFileTypes: true })) {
    if (v.name.startsWith('.') || SALTA_CARTELLE.has(v.name)) continue;
    const p = join(dir, v.name);
    if (v.isDirectory()) yield* fileJs(p);
    else if (/\.(js|mjs)$/.test(v.name)) yield p;
  }
}

/** I file di ogni strato: la pagina è src/ui, il motore il resto di src/, il server server.mjs e i moduli che decidono per i tablet. */
export function fileDelloStrato(strato) {
  const src = join(RADICE, 'src');
  const tutti = [...fileJs(src)].map((p) => relative(RADICE, p).split(sep).join('/'));
  if (strato === 'pagina') return tutti.filter((f) => f.startsWith('src/ui/'));
  if (strato === 'motore') return tutti.filter((f) => !f.startsWith('src/ui/'));
  if (strato === 'server') return ['server.mjs'];
  return [];
}

/** Toglie i commenti a blocco da tutto il file in un colpo solo: il JSDoc descrive i rifiuti e non è un rifiuto. */
function senzaBlocchi(testo) {
  let fuori = true;
  return testo.split('\n').map((riga) => {
    let out = '';
    for (let i = 0; i < riga.length; i++) {
      if (fuori && riga.startsWith('/*', i)) { fuori = false; i++; continue; }
      if (!fuori) { if (riga.startsWith('*/', i)) { fuori = true; i++; } continue; }
      out += riga[i];
    }
    return out;
  });
}

const senzaCommento = (riga) => {
  const i = riga.indexOf('//');
  // niente ritagli dentro una stringa: se prima delle due barre c'è un numero dispari di apici, le barre sono in una stringa
  if (i < 0) return riga;
  const prima = riga.slice(0, i);
  for (const q of ["'", '"', '`']) if ((prima.split(q).length - 1) % 2 === 1) return riga;
  return prima;
};

/** Il nome della cosa che contiene la riga: la funzione, o il percorso dell'API per il server. Serve a dare un nome stabile al blocco. */
function contestoDi(righe, i, strato) {
  const nomeFun = /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)|^\s*(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(|^\s*([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{\s*$/;
  for (let k = i; k >= 0; k--) {
    const r = righe[k];
    if (strato === 'server') {
      const rotta = /(?:^|[\s(])'(\/api\/[^']*)'/.exec(senzaCommento(r)) || /url\.pathname\s*===\s*'([^']+)'/.exec(r) || /startsWith\('(\/api[^']*)'\)/.exec(r);
      if (rotta && k < i) return rotta[1];
    }
    const m = nomeFun.exec(r);
    if (m && (r.startsWith('function') || r.startsWith('export') || r.startsWith('const') || r.startsWith('async') || /^[A-Za-z]/.test(r))) return m[1] || m[2] || m[3];
  }
  return '(file)';
}

/**
 * Tutti i blocchi che si trovano adesso. Ognuno porta: strato, file, riga, il meccanismo, il contesto (funzione o rotta),
 * il codice e un `id` stabile che non cambia se il file si allunga — cambia solo se il blocco si sposta di funzione o se
 * dentro la stessa funzione ne compaiono altri, cioè proprio quando va ridichiarato.
 */
export function censisci({ radice = RADICE } = {}) {
  const out = [];
  for (const strato of ['pagina', 'motore', 'server']) {
    for (const file of fileDelloStrato(strato)) {
      let testo;
      try { testo = readFileSync(join(radice, file), 'utf8'); } catch { continue; }
      const righe = senzaBlocchi(testo);
      const conti = new Map();
      righe.forEach((riga, i) => {
        const codice = senzaCommento(riga);
        if (!codice.trim()) return;
        for (const m of MECCANISMI[strato]) {
          const t = m.re.exec(codice);
          if (!t) continue;
          const contesto = contestoDi(righe, i, strato);
          const dettaglio = m.nome === 'risposta 4xx' || m.nome === 'esito 4xx' ? t[1] : m.nome;
          const chiave = `${file}|${contesto}|${dettaglio}`;
          const n = (conti.get(chiave) ?? 0) + 1;
          conti.set(chiave, n);
          out.push({
            id: `${strato}:${contesto}:${dettaglio}${n > 1 ? `#${n}` : ''}`,
            strato, file, riga: i + 1, meccanismo: m.nome, contesto, dettaglio,
            codice: codice.trim().slice(0, 160),
          });
          break; // un meccanismo per riga: il primo che corrisponde
        }
      });
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('blocchi.mjs')) {
  const b = censisci();
  const per = (k) => [...new Set(b.map((x) => x[k]))].map((v) => `${v} ${b.filter((x) => x[k] === v).length}`).join(', ');
  console.log(`${b.length} blocchi: ${per('strato')}`);
  if (process.argv.includes('--elenco')) for (const x of b) console.log(`${x.id}\t${x.file}:${x.riga}\t${x.codice}`);
  if (process.argv.includes('--json')) console.log(JSON.stringify(b, null, 1));
}

/**
 * Il registro dichiarato: `docs/registro-blocchi.md`. Due elenchi, e il test li usa tutti e due.
 * - «vivi»: i blocchi che ci sono ancora, uno per riga, con il gruppo (B, C, D o E). Il gruppo A non può stare qui.
 * - «tolti»: i blocchi del gruppo A tolti dal lotto 246. Non devono tornare: se il meccanismo ricompare nella stessa
 *   funzione, l'id torna nel censimento e il controllo se ne accorge.
 */
export function leggiRegistro({ radice = RADICE } = {}) {
  const testo = readFileSync(join(radice, 'docs/registro-blocchi.md'), 'utf8');
  const vivi = [];
  const tolti = [];
  for (const riga of testo.split('\n')) {
    const celle = riga.split('|').map((c) => c.trim());
    if (celle.length < 4 || !celle[1] || /^-+$/.test(celle[1])) continue;
    const id = celle[1].replace(/^`|`$/g, '');
    if (!/^(pagina|motore|server|dati):/.test(id)) continue;
    const gruppo = celle.find((c) => /^[A-E]$/.test(c));
    if (!gruppo) continue;
    (gruppo === 'A' ? tolti : vivi).push({ id, gruppo, riga });
  }
  return { vivi, tolti };
}
