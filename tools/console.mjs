// Parti in Node della console di Mutant (Mutant.bat, richiesta di Marcello del 09/10/2026). Il menu sta nel .bat;
// qui ciò che in un .bat sarebbe fragile:
//   node tools/console.mjs intestazione   versione installata e stato del server (acceso/spento)
//   node tools/console.mjs ripristina     voce 4: elenco dei salvataggi, scelta, server spento, copia di sicurezza,
//                                         ripristino (tools/ripristina.mjs)
//   node tools/console.mjs impostazioni   voce 6: crea config-salvataggi.json e avvisi/avvisi.json dagli esempi se mancano
//   --radice=<cartella dell'app> --porta=<porta del server> per le prove (di norma questa cartella e la 3000)
import { readFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { cartelleDi, perConsole } from './salva-sessione.mjs';
import { elencoSalvataggi, rigaSalvataggio, statoServer, spegniServer, ripristina, contenutoSalvataggio } from './ripristina.mjs';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
const radice = arg('radice') ?? RADICE;
const porta = Number(arg('porta') ?? 3000);

/** Versione installata (versione.json): «76c6097817 del 2026-10-08 13:49», o «sconosciuta». */
export function testoVersione(radiceApp = radice) {
  try {
    const v = JSON.parse(readFileSync(join(radiceApp, 'versione.json'), 'utf8'));
    return v.data ? `${v.versione} del ${v.data}` : String(v.versione);
  } catch { return 'sconosciuta'; }
}

/** I file di configurazione da creare dagli esempi: [{ file, esempio }]. */
export const FILE_IMPOSTAZIONI = [
  { file: 'config-salvataggi.json', esempio: 'config-salvataggi.esempio.json' },
  { file: join('avvisi', 'avvisi.json'), esempio: join('avvisi', 'avvisi.esempio.json') },
];

/** Crea dagli esempi i file che mancano (mai sopra uno esistente): [{ file, creato }]. */
export function preparaImpostazioni(radiceApp = radice) {
  return FILE_IMPOSTAZIONI.map(({ file, esempio }) => {
    const p = join(radiceApp, file);
    if (existsSync(p)) return { file, creato: false };
    if (!existsSync(join(radiceApp, esempio))) return { file, creato: false, manca: true };
    copyFileSync(join(radiceApp, esempio), p);
    return { file, creato: true };
  });
}

/**
 * Domande nella finestra nera, una riga per risposta. Le righe arrivate prima della domanda restano in coda (anche
 * con l'input da un file o da una pipe, come nelle prove); a fine input ogni risposta è vuota, cioè «annulla».
 */
function lettore() {
  const rl = createInterface({ input: process.stdin });
  const coda = [];
  const attese = [];
  let finito = false;
  rl.on('line', (l) => (attese.length ? attese.shift()(l) : coda.push(l)));
  rl.on('close', () => { finito = true; while (attese.length) attese.shift()(''); });
  return {
    chiedi(domanda) {
      process.stdout.write(domanda);
      if (coda.length) { const r = coda.shift(); process.stdout.write(`${r}\n`); return Promise.resolve(r); }
      if (finito) { process.stdout.write('\n'); return Promise.resolve(''); }
      return new Promise((ok) => attese.push(ok));
    },
    chiudi: () => rl.close(),
  };
}

const si = (r) => /^\s*(s|si|sì|y|yes)\s*$/i.test(r ?? '');

async function voceRipristina() {
  const rl = lettore();
  const chiedi = (d) => rl.chiedi(d);
  try {
    const salvataggi = join(radice, 'salvataggi');
    const elenco = elencoSalvataggi({ salvataggi, autosave: join(radice, 'autosave') });
    console.log('\n Ripristina un salvataggio\n');
    if (!elenco.length) { console.log(' Nessun salvataggio trovato in salvataggi\\ o in autosave\\.'); return; }
    console.log(' Salvataggi, dal piu\' recente:');
    elenco.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}. ${rigaSalvataggio(s)}`));
    const r = (await chiedi('\n Numero del salvataggio da rimettere (Invio per tornare al menu): ')).trim();
    const scelto = elenco[Number(r) - 1];
    if (!r || !scelto) { console.log(r ? ' Numero non valido: niente da fare.' : ' Annullato.'); return; }
    // il server deve essere spento
    if ((await statoServer(porta)).acceso) {
      console.log('\n Mutant e\' acceso: per ripristinare va spento (i tablet aperti riscriverebbero i dati vecchi).');
      if (!si(await chiedi(' Lo spengo con «Spegni Mutant»? Salva la sessione e chiude la sua finestra. [S/N] '))) { console.log(' Va bene: niente ripristino.'); return; }
      const s = await spegniServer(porta);
      if (!s.spento) { console.log(` Non sono riuscito a spegnerlo: ${s.motivo}. Chiudi la finestra del server e riprova.`); return; }
      if (s.esito?.riga) console.log(` ${perConsole(s.esito.riga)}`);
      console.log(' Mutant e\' spento.');
    }
    // cosa c'è nello zip, prima di chiedere conferma
    let contenuto;
    try { contenuto = contenutoSalvataggio(readFileSync(scelto.percorso)); } catch (e) { console.log(` Questo salvataggio non si puo' usare: ${e.message}.`); return; }
    console.log(`\n ${scelto.etichetta} contiene:`);
    for (const [c, f] of Object.entries(contenuto.perCartella)) console.log(`   ${c} (${f.length} file)`);
    console.log('\n Queste cartelle di Mutant verranno sostituite. Prima faccio una copia di sicurezza di come sono');
    console.log(' adesso (salvataggi\\prima-del-ripristino_....zip), da cui si puo\' tornare indietro con questa stessa voce.');
    if (!si(await chiedi(' Procedo? [S/N] '))) { console.log(' Annullato: non ho toccato nulla.'); return; }
    const e = await ripristina({ zip: scelto.percorso, cartelle: cartelleDi(radice), salvataggi, serverAcceso: async () => (await statoServer(porta)).acceso });
    if (e.copiaSicurezza) console.log(`\n Copia di sicurezza: ${e.copiaSicurezza}`);
    for (const x of e.rimesse ?? []) console.log(` Rimessa la cartella ${x.cartella} (${x.file} file).`);
    if (e.lasciate?.length) console.log(` Lasciate come sono (non erano nel salvataggio): ${e.lasciate.join(', ')}.`);
    console.log(e.ok ? '\n Ripristino fatto. Riaccendi Mutant con la voce 1; se una scheda sul tablet chiede «Aggiorna» o «Tieni la mia», premi «Aggiorna».' : `\n Ripristino NON riuscito: ${e.motivo}`);
  } finally {
    rl.chiudi();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const comando = process.argv[2];
  if (comando === 'intestazione') {
    const s = await statoServer(porta);
    console.log(` Versione installata: ${testoVersione()}`);
    console.log(` Server: ${s.acceso ? (s.mutant ? `ACCESO (http://localhost:${porta})` : `porta ${porta} occupata da un altro programma`) : 'spento'}`);
  } else if (comando === 'stato') {
    // codice d'uscita per il .bat: 0 acceso, 1 spento
    process.exitCode = (await statoServer(porta)).acceso ? 0 : 1;
  } else if (comando === 'ripristina') {
    await voceRipristina();
  } else if (comando === 'impostazioni') {
    for (const r of preparaImpostazioni()) if (r.creato) console.log(` Creato ${r.file} dall'esempio.`);
  } else {
    console.error('Comandi: intestazione, stato, ripristina, impostazioni');
    process.exitCode = 2;
  }
}
