// Adeguamento straordinario delle Abilità (lotto 194, 13/11/2026), sul PC del Direttore: il passaggio dei
// personaggi al profilo 4/7/9/4 del Giocatore 0.62 (§8.3.1) e la redistribuzione dei Punti Abilità Liberi.
//
//   node tools/adegua-abilita.mjs                      rapporto, PG per PG; non tocca niente
//   node tools/adegua-abilita.mjs --applica            copia zip di personaggi\, poi la nota e il contrassegno
//   node tools/adegua-abilita.mjs --annulla NOME       riporta quel solo personaggio com'era
//   node tools/adegua-abilita.mjs --stato              a che punto è ciascuno (anche durante la serata)
//   opzioni: --cartella DIR (personaggi), --salvataggi DIR (dove va lo zip)
//
// **La nota di prima su tutti, prima di qualunque modifica.** È la lezione del 26 ottobre: ai Talenti la nota
// arrivò dopo e solo su alcuni, e al tavolo i giocatori non riuscivano a ritrovare i propri Talenti vecchi.
// `--applica` lavora in **due passate**: nella prima calcola la nota di tutti e sette e, se anche uno solo non la
// produce, **non scrive niente per nessuno**; solo nella seconda scrive. Così non esiste uno stato in cui qualcuno
// è stato toccato senza avere la sua nota.
//
// Quello che questo programma fa è il minimo: nota, contrassegno e punti azzerati. I 21 (o quanti sono) punti li
// assegna **il giocatore dal suo tablet**, nella scheda, una scelta alla volta; il Direttore guarda la plancia.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { creaZip } from './salva-sessione.mjs';
import { cartellaDati } from './dati-pc.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
export const PREFISSO = 'prima-dell-adeguamento-abilita_';
const due = (n) => String(n).padStart(2, '0');
export const nomeZip = (d) => `${PREFISSO}${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}${due(d.getSeconds())}.zip`;
const NOME_FILE = /^[\w.()' -]+\.json$/;

async function dati() {
  const { caricaDati } = await import(pathToFileURL(join(RADICE, 'src', 'rules.js')));
  const leggi = (nome) => readFileSync(join(RADICE, 'data', `${nome}.json`), 'utf8');
  return (await caricaDati(async (n) => leggi(n))).dati;
}

/** I file di personaggio della cartella: { file, json }. Uno per file, come sul disco. */
export function personaggi(cartella) {
  if (!existsSync(cartella)) return [];
  return readdirSync(cartella).filter((f) => f.endsWith('.json') && NOME_FILE.test(f)).map((f) => {
    try {
      const json = JSON.parse(readFileSync(join(cartella, f), 'utf8'));
      return json?.scelte ? { file: f, json } : null;
    } catch { return null; }
  }).filter(Boolean);
}

/**
 * Il rapporto: che cosa succederebbe a ciascuno. Non tocca niente.
 * @returns {{ piani, pronti, bloccati, giaFatti }}
 */
export async function rapporto({ cartella, d = null, quando = new Date() }) {
  const D = d ?? await dati();
  const { pianoAdeguamento } = await import(pathToFileURL(join(RADICE, 'src', 'adeguamento-abilita.js')));
  const piani = personaggi(cartella).map(({ file, json }) => ({ file, ...pianoAdeguamento(json, D, { quando }) }));
  return {
    piani,
    pronti: piani.filter((p) => p.nuovo),
    bloccati: piani.filter((p) => p.bloccato),
    giaFatti: piani.filter((p) => p.giaFatto),
  };
}

/** Le righe da stampare per il rapporto. */
export function righeRapporto({ piani }) {
  const out = [];
  for (const p of piani) {
    const stato = p.giaFatto ? 'già adeguato' : p.bloccato ? 'NON SI PARTE' : `pronto · monte ${p.monte?.monte} punti`;
    out.push(`${p.nome.padEnd(20)} liv ${String(p.livello).padEnd(2)} · ${stato}`);
    if (p.motivo) out.push(`    ${p.motivo}`);
    for (const c of p.casi) out.push(`    da guardare: ${c}`);
    if (p.nota) out.push(`    nota di prima: ${p.nota.abilita.length} Abilità, ${p.nota.eventi.length} eventi, ${p.nota.monteDiPrima} punti liberi di adesso`);
  }
  return out;
}

/** La copia zip della cartella dei personaggi, prima di toccare qualunque cosa. */
export function copiaZip({ cartella, salvataggi, quando = new Date() }) {
  mkdirSync(salvataggi, { recursive: true });
  const dentro = readdirSync(cartella).filter((f) => f.endsWith('.json')).map((f) => ({ nome: `personaggi/${f}`, dati: readFileSync(join(cartella, f)), mtime: quando }));
  const percorso = join(salvataggi, nomeZip(quando));
  writeFileSync(percorso, creaZip(dentro));
  return { percorso, quanti: dentro.length };
}

/**
 * Applica: **due passate**. Prima si calcola il piano di tutti; se anche uno solo è bloccato non si scrive niente
 * per nessuno. Poi si scrive.
 * @returns {{ fatto, zip, scritti, bloccati, motivo }}
 */
export async function applica({ cartella, salvataggi, d = null, quando = new Date() }) {
  const D = d ?? await dati();
  const r = await rapporto({ cartella, d: D, quando });
  if (r.bloccati.length) {
    return { fatto: false, zip: null, scritti: [], bloccati: r.bloccati, motivo: `${r.bloccati.length} personaggi non hanno la nota di prima: non tocco nessuno (è la regola del 26 ottobre).` };
  }
  if (!r.pronti.length) return { fatto: false, zip: null, scritti: [], bloccati: [], motivo: 'nessun personaggio da adeguare.' };
  const zip = copiaZip({ cartella, salvataggi, quando });
  const scritti = [];
  for (const p of r.pronti) {
    writeFileSync(join(cartella, p.file), `${JSON.stringify(p.nuovo, null, 2)}\n`);
    scritti.push({ nome: p.nome, file: p.file, monte: p.monte.monte });
  }
  return { fatto: true, zip, scritti, bloccati: [], motivo: null };
}

/** Annulla l'adeguamento di **un** personaggio, per nome o per file. Gli altri non si toccano. */
export async function annulla({ cartella, chi, d = null }) {
  const D = d ?? await dati();
  const { annullaAdeguamento } = await import(pathToFileURL(join(RADICE, 'src', 'adeguamento-abilita.js')));
  const cerca = String(chi ?? '').trim().toLowerCase();
  const voce = personaggi(cartella).find((x) => x.file.toLowerCase() === cerca || String(x.json.scelte?.nome ?? '').trim().toLowerCase() === cerca);
  if (!voce) return { ok: false, motivo: `non trovo «${chi}» nella cartella`, nome: null };
  const esito = annullaAdeguamento(voce.json);
  if (!esito.ok) return { ok: false, motivo: esito.motivo, nome: voce.json.scelte?.nome ?? voce.file };
  writeFileSync(join(cartella, voce.file), `${JSON.stringify(esito.file, null, 2)}\n`);
  return { ok: true, motivo: null, nome: voce.json.scelte?.nome ?? voce.file, file: voce.file };
}

/** A che punto è ciascuno: lo guarda il Direttore durante la serata. */
export async function stato({ cartella, d = null }) {
  const D = d ?? await dati();
  const { statoPerPlancia } = await import(pathToFileURL(join(RADICE, 'src', 'adeguamento-abilita.js')));
  return personaggi(cartella).map(({ file, json }) => ({ file, ...statoPerPlancia(json, D) }));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['adegua-abilita.mjs'], 'adegua-abilita.mjs');
  const valore = (nome) => { const i = argv.indexOf(`--${nome}`); return i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3) ?? null; };
  const base = cartellaDati(RADICE).cartella;
  const cartella = valore('cartella') ?? join(base, 'personaggi');
  const salvataggi = valore('salvataggi') ?? join(base, 'salvataggi');
  const D = await dati();

  if (argv.includes('--stato')) {
    for (const s of await stato({ cartella, d: D })) console.log(`${s.nome.padEnd(20)} ${s.testo}`);
    process.exit(0);
  }
  if (argv.includes('--annulla')) {
    const chi = valore('annulla');
    if (!chi) { console.error('Serve il nome del personaggio: --annulla "NOME"'); process.exit(2); }
    const e = await annulla({ cartella, chi, d: D });
    console.log(e.ok ? `${e.nome}: adeguamento annullato, il file è tornato com'era (${e.file}).` : `Non fatto: ${e.motivo}`);
    process.exit(e.ok ? 0 : 1);
  }
  const r = await rapporto({ cartella, d: D });
  for (const riga of righeRapporto(r)) console.log(riga);
  console.log(`\n${r.pronti.length} pronti, ${r.bloccati.length} bloccati, ${r.giaFatti.length} già adeguati.`);
  if (!argv.includes('--applica')) { console.log('\nNiente scritto. Con --applica si fa (prima una copia zip).'); process.exit(0); }
  const e = await applica({ cartella, salvataggi, d: D });
  if (!e.fatto) { console.error(`\nNon fatto: ${e.motivo}`); process.exit(1); }
  console.log(`\nCopia di sicurezza: ${e.zip.percorso} (${e.zip.quanti} file).`);
  for (const s of e.scritti) console.log(`  ${s.nome}: nota scritta, contrassegno messo, ${s.monte} punti da assegnare dal tablet.`);
}
