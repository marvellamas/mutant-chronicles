// Parti in Node della console di Mutant (Mutant.bat, richiesta di Marcello del 09/10/2026). Il menu sta nel .bat;
// qui ciò che in un .bat sarebbe fragile:
//   node tools/console.mjs intestazione   versione installata e stato del server (acceso/spento)
//   node tools/console.mjs ripristina     voce 4: elenco dei salvataggi, scelta, server spento, copia di sicurezza,
//                                         ripristino (tools/ripristina.mjs)
//   node tools/console.mjs impostazioni   voce 6: schermata guidata (avvisi ntfy, cartella di Google Drive, notifica di
//                                         prova; tools/impostazioni.mjs), al posto dei JSON da modificare a mano
//   node tools/console.mjs avvio          all'apertura della console: installazione nuova (propone le impostazioni) e
//                                         invii non riusciti dall'ultima volta (avvisi/registro.txt)
//   --radice=<cartella dell'app> --porta=<porta del server> per le prove (di norma questa cartella e la 3000)
import { readFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { cartelleDi, perConsole } from './salva-sessione.mjs';
import { elencoSalvataggi, rigaSalvataggio, statoServer, spegniServer, ripristina, contenutoSalvataggio } from './ripristina.mjs';
import { statoImpostazioni, testoAvvisi, testoDrive, argomentoGruppo, salvaAvvisi, salvaDrive, posizioniDrive, notificaDiProva, erroriNuovi, FILE_REGISTRO } from './impostazioni.mjs';
import { hostname } from 'node:os';

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

// ---------------------------------------------------------------------------
// Impostazioni guidate (voce 6, 09/10/2026)

/** Riga breve per l'intestazione del menu: «Avvisi: accesi (PC di Davide) · Backup su Drive: G:/… ». */
export function rigaImpostazioni(radiceApp = radice) {
  const s = statoImpostazioni(radiceApp);
  const a = s.avvisi.stato === 'acceso' ? `accesi (${s.avvisi.nomePc ?? hostname()})` : s.avvisi.stato === 'spento' ? 'spenti' : 'NON IMPOSTATI';
  const d = s.drive.stato === 'ok' ? s.drive.percorso : s.drive.stato === 'inesistente' ? `${s.drive.percorso} NON TROVATA` : 'non impostati';
  return `Avvisi: ${a} · Backup su Drive: ${d}`;
}

async function voceAvvisi(chiedi) {
  const s = statoImpostazioni(radice).avvisi;
  const gruppo = argomentoGruppo(radice);
  console.log('\n Avvisi ntfy');
  console.log(' Quando accendi o aggiorni Mutant (e a ogni «Salva sessione») parte una notifica, per esempio');
  console.log(' «Mutant avviato da PC di Davide»: arriva sul telefono di chi ha l\'app ntfy iscritta all\'argomento.');
  console.log(' Su questo PC non serve installare nulla.\n');
  const r1 = (await chiedi(` Avvisi accesi? [S/N] (Invio = ${s.attivo || s.stato === 'mancante' ? 'S' : 'N'}): `)).trim();
  const attivo = r1 ? si(r1) : (s.attivo || s.stato === 'mancante');
  const proposto = s.argomento || gruppo;
  const r2 = (await chiedi(` Argomento ntfy (Invio = ${proposto || 'nessuno'}${proposto && proposto === gruppo ? ', quello del gruppo' : ''}): `)).trim();
  const argomento = r2 || proposto;
  const nome = s.nomePc ?? '';
  const r3 = (await chiedi(` Nome di questo PC nelle notifiche, per esempio «PC di Davide» (Invio = ${nome || `${hostname()}, il nome di Windows`}): `)).trim();
  const e = salvaAvvisi(radice, { attivo, argomento, nomePc: r3 || nome });
  console.log(e.ok ? ` Salvato: avvisi ${attivo ? 'ACCESI' : 'SPENTI'}. Prova con la voce 3.` : ` NON salvato: ${e.errore}.`);
}

async function voceDrive(chiedi) {
  const s = statoImpostazioni(radice).drive;
  console.log('\n Cartella di Google Drive per i backup');
  console.log(' Serve Google Drive per desktop installato e acceso su questo PC: ogni salvataggio della sessione');
  console.log(' viene copiato anche in questa cartella (e quindi sul tuo Drive). Vuota = i backup restano solo qui.\n');
  console.log(` Ora: ${testoDrive(s)}`);
  const trovate = posizioniDrive();
  const proposte = trovate.map((p) => `${p}\\Mutant salvataggi`);
  if (proposte.length) {
    console.log(' Google Drive trovato in:');
    proposte.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  } else console.log(' Non trovo Google Drive per desktop su questo PC: si scarica da https://www.google.com/drive/download/');
  const r = (await chiedi(` Percorso della cartella${proposte.length ? ', o il numero di una proposta' : ''} (Invio = ${s.percorso ? 'lascia com\'e\'' : proposte[0] ?? 'nessuna copia'}, - = nessuna copia): `)).trim();
  let percorso;
  if (!r) percorso = s.percorso ?? proposte[0] ?? '';
  else if (r === '-') percorso = '';
  else if (/^\d+$/.test(r) && proposte[Number(r) - 1]) percorso = proposte[Number(r) - 1];
  else percorso = r;
  let e = salvaDrive(radice, percorso);
  if (!e.ok && /non esiste$/.test(`${e.errore}`)) {
    if (si(await chiedi(` La cartella ${percorso} non esiste. La creo? [S/N] `))) e = salvaDrive(radice, percorso, { crea: true });
    else { console.log(' Non salvato: scegli una cartella che esiste.'); return; }
  }
  console.log(!e.ok ? ` NON salvato: ${e.errore}.` : e.percorso ? ` Salvato${e.creata ? ' (cartella creata)' : ''}: i backup andranno anche in ${e.percorso}.` : ' Salvato: nessuna copia su Drive.');
}

/** Voce 6: la schermata delle impostazioni, finché non si torna al menu. */
export async function voceImpostazioni(esterno = null) {
  const rl = esterno ?? lettore();
  const chiedi = (d) => rl.chiedi(d);
  try {
    for (;;) {
      const s = statoImpostazioni(radice);
      console.log('\n Impostazioni di Mutant su questo PC');
      console.log(' -----------------------------------');
      console.log(`  1. Avvisi ntfy: ${testoAvvisi(s.avvisi, radice)}`);
      console.log(`  2. Cartella Drive per i backup: ${testoDrive(s.drive)}`);
      console.log('  3. Manda una notifica di prova');
      console.log('  4. Torna al menu');
      const r = (await chiedi('\n Scegli un numero (Invio = torna al menu): ')).trim();
      if (r === '1') await voceAvvisi(chiedi);
      else if (r === '2') await voceDrive(chiedi);
      else if (r === '3') {
        console.log('\n Invio della notifica di prova...');
        const p = await notificaDiProva(radice);
        console.log(` ${p.ok ? 'OK: ' : 'ERRORE: '}${p.testo}`);
      } else return;
    }
  } finally {
    if (!esterno) rl.chiudi();
  }
}

/** All'apertura della console: installazione nuova e invii non riusciti dall'ultima volta. */
async function voceAvvio() {
  const rl = lettore();
  const s = statoImpostazioni(radice);
  const nuovi = erroriNuovi(radice, { segna: true });
  let detto = false;
  if (nuovi.length) {
    detto = true;
    console.log('\n ==============================================================');
    console.log(`  ATTENZIONE: ${nuovi.length === 1 ? 'un invio non e\' partito' : `${nuovi.length} invii non sono partiti`} dall'ultima volta.`);
    console.log(' ==============================================================');
    console.log(` L'ultimo: ${nuovi.at(-1).testo}`);
    console.log(` Tutti in ${FILE_REGISTRO}. Prova le impostazioni con la voce 6 («Manda una notifica di prova»).`);
  }
  if (s.nuova || s.avvisi.stato === 'mancante') {
    detto = true;
    console.log('\n Su questo PC le impostazioni di Mutant non ci sono ancora: gli avvisi ntfy non partono');
    console.log(' e i backup non vanno su Google Drive.');
    const r = await rl.chiedi(' Le imposto adesso? [S/N] ');
    if (si(r)) { await voceImpostazioni(rl); rl.chiudi(); return; }
    console.log(' Va bene: si impostano quando vuoi dalla voce 6 «Impostazioni».');
  }
  if (detto) await rl.chiedi('\n Invio per andare al menu... ');
  rl.chiudi();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const comando = process.argv[2];
  if (comando === 'intestazione') {
    const s = await statoServer(porta);
    console.log(` Versione installata: ${testoVersione()}`);
    console.log(` Server: ${s.acceso ? (s.mutant ? `ACCESO (http://localhost:${porta})` : `porta ${porta} occupata da un altro programma`) : 'spento'}`);
    console.log(` ${rigaImpostazioni()}`);
  } else if (comando === 'stato') {
    // codice d'uscita per il .bat: 0 acceso, 1 spento
    process.exitCode = (await statoServer(porta)).acceso ? 0 : 1;
  } else if (comando === 'ripristina') {
    await voceRipristina();
  } else if (comando === 'impostazioni') {
    await voceImpostazioni();
  } else if (comando === 'avvio') {
    await voceAvvio();
  } else {
    console.error('Comandi: intestazione, stato, ripristina, impostazioni, avvio');
    process.exitCode = 2;
  }
}
