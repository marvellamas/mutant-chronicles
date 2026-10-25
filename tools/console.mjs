// Parti in Node della console di Mutant (Mutant.bat, richiesta di Marcello del 09/10/2026). Dal 25/10/2026 («un
// ingresso solo») Mutant.bat è l'unico programma da aprire: le voci del menu stanno in tools/menu.mjs, e qui ciò che in
// un .bat sarebbe fragile:
//   node tools/console.mjs menu           intestazione (versione in parole, server, ruolo del PC) e voci del menu
//   node tools/console.mjs controlla      voce 6: rapporto sui file dei personaggi, con SI mette via i vecchi
//   node tools/console.mjs talenti        voce 7: passaggio ai Talenti nuovi (rapporto, SI, tools/migra-talenti.mjs)
//   node tools/console.mjs talenti-ripristina   voce 8: torna a com'era prima del passaggio (SI)
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
import { elencoSalvataggi, rigaSalvataggio, quando, statoServer, spegniServer, ripristina, contenutoSalvataggio, avvisoCartellaVuota, postiSalvataggi, contenutoPerElenco } from './ripristina.mjs';
import { NOME_MARCATORE, statoInstallazione, avvisoSovrascrittura } from '../src/copia-di-lavoro.js';
import { leggiConfig, dimensione } from './salva-sessione.mjs';
import { statoImpostazioni, testoAvvisi, testoDrive, argomentoGruppo, salvaAvvisi, salvaDrive, posizioniDrive, notificaDiProva, erroriNuovi, FILE_REGISTRO } from './impostazioni.mjs';
import { hostname } from 'node:os';
import { spawnSync } from 'node:child_process';
import { righeMenu, ascii } from './menu.mjs';
import { leggiRuolo, scriviRuolo, testoRuolo, RUOLI } from './ruolo-pc.mjs';
import { statoDaRuolo } from '../src/copia-di-lavoro.js';
import { leggiVersione, leggiNovita, versioneInParole } from '../src/versione.js';
import { rapporto as rapportoTalenti, applica as applicaTalenti, ripristina as ripristinaTalenti, zipDelPassaggio, statoPassaggio, quandoDelloZip } from './migra-talenti.mjs';
import { rapporto as rapportoPulizia, testoRapporto as testoPulizia, sposta as spostaPulizia } from './pulizia-personaggi.mjs';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
const radice = arg('radice') ?? RADICE;
const porta = Number(arg('porta') ?? 3000);

/**
 * Versione installata in parole (25/10/2026, parte D), la stessa del piè di pagina dell'app: «Versione del 25/10 ·
 * Talenti nuovi (02d2cab396)». «sconosciuta» se versione.json non si legge.
 */
export function testoVersione(radiceApp = radice) {
  try {
    const v = leggiVersione(JSON.parse(readFileSync(join(radiceApp, 'versione.json'), 'utf8')));
    if (!v) return 'sconosciuta';
    let titolo = null;
    try { titolo = leggiNovita(JSON.parse(readFileSync(join(radiceApp, 'novita.json'), 'utf8'))); } catch { /* senza titolo */ }
    return `${versioneInParole(v, titolo)} (${v.versione})`;
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
/** Questa installazione è una copia di lavoro? (20/10/2026, src/copia-di-lavoro.js) */
function marcatoreQui(radice) {
  let m = statoInstallazione(null);
  for (const dove of [join(radice, NOME_MARCATORE), join(radice, 'personaggi', NOME_MARCATORE)]) {
    try { m = statoInstallazione(readFileSync(dove, 'utf8')); break; } catch { /* non c'è */ }
  }
  // 25/10: il ruolo scelto da Mutant.bat vale sopra il file (src/copia-di-lavoro.js → statoDaRuolo)
  try { return statoDaRuolo(leggiRuolo(radice), m); } catch { return m; }
}
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

/**
 * «Non trovo personaggi in questa cartella» (12/10/2026, docs/diagnosi-dati-spariti-2026-10-12.md): le righe
 * che la console mostra sopra il menu quando personaggi/ e' vuota ma dei salvataggi ci sono.
 * Niente lettere accentate: la console di Windows non e' in UTF-8.
 */
export function righeCartellaVuota(radiceApp = radice) {
  let a;
  try {
    const config = (() => { try { return leggiConfig(join(radiceApp, 'config-salvataggi.json')); } catch { return {}; } })();
    a = avvisoCartellaVuota({ cartella: join(radiceApp, 'personaggi'), ...postiSalvataggi(radiceApp, config) });
  } catch { return []; }
  if (!a.vuota) return [];
  const righe = ['', ' ==============================================================', ` ${perConsole(a.testo)}`];
  for (const s of a.salvataggi) righe.push(`   ${perConsole(rigaSalvataggio(s))}`);
  righe.push(a.salvataggi.length ? '  Per rimetterne uno: scegli 4 (Ripristina un salvataggio).'
    : '  Controlla di aver aperto la cartella giusta: il percorso qui sopra e\' quello in uso.');
  righe.push(' ==============================================================');
  return righe;
}

async function voceRipristina() {
  const rl = lettore();
  const chiedi = (d) => rl.chiedi(d);
  try {
    const config = (() => { try { return leggiConfig(join(radice, 'config-salvataggi.json')); } catch { return {}; } })();
    const posti = postiSalvataggi(radice, config);
    const salvataggi = posti.salvataggi;
    const elenco = elencoSalvataggi(posti);
    console.log('\n Ripristina un salvataggio\n');
    if (!elenco.length) {
      console.log(' Nessun salvataggio trovato. Cercati in:');
      for (const d of Object.values(posti).filter(Boolean)) console.log(`   ${d}`);
      return;
    }
    console.log(' Salvataggi, dal piu\' recente (data e ora, tipo, dove sta, dimensione, che cosa contiene):');
    elenco.forEach((s, i) => {
      console.log(`  ${String(i + 1).padStart(2)}. ${quando(s.mtime)}  ${s.nome}`);
      console.log(`      ${s.tipoTesto} · ${s.dove} · ${dimensione(s.dimensione)} · ${perConsole(contenutoPerElenco(s.percorso) ?? 'contenuto non leggibile')}`);
    });
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
    console.log(`\n ${scelto.nome} (${scelto.tipoTesto}, ${scelto.dove}) del ${quando(scelto.mtime)} contiene:`);
    for (const [c, f] of Object.entries(contenuto.perCartella)) console.log(`   ${c} (${f.length} file)`);
    if (contenuto.estranei.length) {
      // una copia fatta prima di un aggiornamento contiene anche musica, avvisi e la configurazione: si lasciano stare
      const fuori = [...new Set(contenuto.estranei.map((n) => n.split('/')[0]))].sort();
      console.log(`   dentro c'e' anche ${fuori.join(', ')}: non si tocca, il ripristino rimette solo le cartelle di gioco.`);
    }
    console.log('\n Queste cartelle di Mutant verranno sostituite. Prima faccio una copia di sicurezza di come sono');
    console.log(' adesso (salvataggi\\prima-del-ripristino_....zip), da cui si puo\' tornare indietro con questa stessa voce.');
    // 20/10: da dove arrivano i dati e che cosa sostituiscono. Se vengono da una copia di lavoro e qui è
    // l'installazione del Direttore (i personaggi veri), l'avviso è forte e la conferma si scrive per esteso.
    const qui = marcatoreQui(radice);
    const av = avvisoSovrascrittura({
      origine: contenuto.origine, destinazione: qui.copiaDiLavoro ? 'copia' : 'originale',
      che: `le cartelle di gioco di questa installazione (${Object.keys(contenuto.perCartella).join(', ')})`,
      daDove: `${scelto.nome}${contenuto.notaOrigine ? ` — ${contenuto.notaOrigine}` : ''}`,
    });
    console.log(`\n ${perConsole(av.titolo)}`);
    for (const r of av.righe) console.log(`   ${perConsole(r)}`);
    if (av.confermaScritta) {
      const scritto = (await chiedi(` Per procedere scrivi ${av.confermaScritta} (qualunque altra cosa annulla): `)).trim();
      if (scritto !== av.confermaScritta) { console.log(' Annullato: non ho toccato nulla.'); return; }
    } else if (!si(await chiedi(' Procedo? [S/N] '))) { console.log(' Annullato: non ho toccato nulla.'); return; }
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
// Voci che cambiano i personaggi (25/10/2026, «un ingresso solo»): prima il rapporto, poi SI scritto per esteso.
// Chiudendo la finestra, o rispondendo altro, non si fa niente.

const cartellePg = (r = radice) => ({ cartella: join(r, 'personaggi'), salvataggi: join(r, 'salvataggi') });
const confermaSi = async (rl, domanda) => (await rl.chiedi(domanda)).trim().toUpperCase() === 'SI';

/** Voce 6: controllo dei file dei personaggi (tools/pulizia-personaggi.mjs). */
export async function voceControlla({ radice: r = radice, rl: esterno = null } = {}) {
  const rl = esterno ?? lettore();
  try {
    const { cartella } = cartellePg(r);
    console.log('\n Controllo dei file dei personaggi: adesso leggo soltanto, non cambio niente.\n');
    const rap = await rapportoPulizia(cartella);
    console.log(ascii(testoPulizia(rap)));
    const daSpostare = rap.personaggi.filter((p) => !p.dubbio && p.altri.length).reduce((n, p) => n + p.altri.length, 0);
    if (!daSpostare) { console.log('\n Non c\'e\' niente da mettere via: un file per personaggio.'); return { fatti: [] }; }
    console.log(`\n Con SI metto ${daSpostare} file vecchi in personaggi\\storico (non cancello niente). I casi dubbi non si toccano.`);
    if (!await confermaSi(rl, ' Scrivi SI e premi Invio per metterli via (altrimenti Invio e basta): ')) { console.log(' Va bene: non ho toccato niente.'); return { fatti: [] }; }
    const fatti = await spostaPulizia(cartella, rap);
    console.log(` Fatto: ${fatti.length} file messi in personaggi\\storico.`);
    return { fatti };
  } finally { if (!esterno) rl.chiudi(); }
}

/** Voce 7: passaggio ai Talenti nuovi (tools/migra-talenti.mjs). */
export async function voceTalenti({ radice: r = radice, rl: esterno = null, porta: p = porta } = {}) {
  const rl = esterno ?? lettore();
  try {
    const dove = cartellePg(r);
    console.log('\n PASSAGGIO AI TALENTI NUOVI: adesso leggo soltanto, non cambio niente.\n');
    const rap = await rapportoTalenti({ cartella: dove.cartella });
    for (const riga of rap.righe) console.log(` ${ascii(riga)}`);
    if (!rap.daFare.length) { console.log(' Nessun personaggio da passare: il passaggio e\' gia\' fatto (o la cartella e\' vuota).'); return { fatto: false }; }
    console.log(' Se scrivi SI:');
    console.log('   1. faccio prima una copia zip di tutta la cartella personaggi (in salvataggi, con data e ora);');
    console.log('   2. a ogni personaggio tolgo i Talenti di oggi e li scrivo nel registro "Modifiche del master";');
    console.log('   3. poi ogni giocatore sceglie i Talenti nuovi dalla scheda, nel riquadro "Da scegliere".');
    console.log(' Se chiudi questa finestra adesso, non e\' stato fatto niente.');
    if (!await confermaSi(rl, ' Scrivi SI e premi Invio per fare il passaggio (altrimenti Invio e basta): ')) { console.log(' Va bene: non ho toccato niente.'); return { fatto: false }; }
    const e = await applicaTalenti({ ...dove, porta: p });
    console.log(`\n Copia di sicurezza fatta: ${e.copia.zip} (${e.copia.file} file).`);
    console.log(e.serverAcceso ? ' Scritto attraverso Mutant acceso: i tablet collegati vedono subito le schede nuove.' : ' Scritto con il salvataggio normale di Mutant (avviato solo per il passaggio).');
    console.log(` Passati ai Talenti nuovi: ${e.fatti.length ? ascii(e.fatti.join(', ')) : 'nessuno'}.`);
    for (const x of e.errori) console.log(` NON passato (resta com'era): ${ascii(x)}`);
    console.log(' Per tornare indietro: voce 8 del menu.');
    return { fatto: true, ...e };
  } finally { if (!esterno) rl.chiudi(); }
}

/** Voce 8: torna a com'era prima del passaggio (lo zip più recente del passaggio). */
export async function voceTalentiRipristina({ radice: r = radice, rl: esterno = null } = {}) {
  const rl = esterno ?? lettore();
  try {
    const dove = cartellePg(r);
    const zip = zipDelPassaggio(dove.salvataggi)[0];
    if (!zip) { console.log('\n Non trovo la copia di un passaggio ai Talenti nuovi: non c\'e\' niente da rimettere.'); return { fatto: false }; }
    const q = quandoDelloZip(zip);
    console.log(`\n Copia fatta prima del passaggio${q ? ` del ${q.toLocaleDateString('it-IT')} alle ${q.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : ''}:\n   ${zip}`);
    console.log(' Se scrivi SI rimetto i file dei personaggi com\'erano in quella copia (prima faccio una copia di come sono adesso).');
    console.log(' Le scelte dei Talenti fatte dopo il passaggio si perdono. Se chiudi questa finestra, non e\' stato fatto niente.');
    if (!await confermaSi(rl, ' Scrivi SI e premi Invio per tornare a com\'era prima (altrimenti Invio e basta): ')) { console.log(' Va bene: non ho toccato niente.'); return { fatto: false }; }
    const e = ripristinaTalenti({ ...dove, zip });
    console.log(` Fatto: rimessi ${e.rimessi} file. Com'era prima del ripristino e' in ${e.sicurezza}.`);
    console.log(' Se Mutant e\' acceso, le schede aperte si ricaricano da sole con i Talenti di prima.');
    return { fatto: true, ...e };
  } finally { if (!esterno) rl.chiudi(); }
}

/** Il collegamento «Mutant» sul desktop (era crea-collegamento.bat). */
export function creaCollegamento(radiceApp = radice) {
  const ps = "$q=$env:MUTANT_QUI; $d=if ($env:MUTANT_DESKTOP) { $env:MUTANT_DESKTOP } else { [Environment]::GetFolderPath('Desktop') }; $p=Join-Path $d 'Mutant.lnk'; if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force }; $s=(New-Object -ComObject WScript.Shell).CreateShortcut($p); $s.TargetPath=(Join-Path $q 'Mutant.bat'); $s.WorkingDirectory=$q.TrimEnd('\\'); $s.IconLocation=(Join-Path $q 'tools\\mutant.ico'); $s.Description='Mutant'; $s.Save(); Write-Host (' Fatto: collegamento Mutant in ' + $d)";
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { stdio: 'inherit', env: { ...process.env, MUTANT_QUI: radiceApp.endsWith('\\') ? radiceApp : `${radiceApp}\\` } });
  if (r.status !== 0) console.log(' Non sono riuscito a creare il collegamento. In alternativa: tasto destro su Mutant.bat, "Invia a", "Desktop (crea collegamento)".');
  return r.status === 0;
}

/**
 * Il ruolo di questo PC (25/10/2026, parte C): la domanda, una risposta per riga. Invio senza risposta non salva niente
 * (la domanda torna la volta dopo, e l'app intanto si comporta come prima).
 */
export async function voceRuolo({ radice: r = radice, rl: esterno = null } = {}) {
  const rl = esterno ?? lettore();
  try {
    const attuale = leggiRuolo(r);
    console.log('\n Che cosa e\' questo PC?');
    console.log(`   1. Il PC del Direttore: si gioca qui, e i personaggi di questa cartella sono quelli veri (${RUOLI.originale}).`);
    console.log('   2. Una copia di prova: serve a provare; i personaggi veri sono sul PC del Direttore.');
    console.log(`   Nome di questo PC (letto da Windows): ${ascii(attuale.nomePc)}`);
    if (attuale.ruolo) console.log(`   Adesso: ${ascii(testoRuolo(attuale))}`);
    const risposta = (await rl.chiedi(' Scrivi 1 o 2 e premi Invio (Invio e basta = decidi un\'altra volta): ')).trim();
    if (risposta !== '1' && risposta !== '2') { console.log(' Va bene: non ho cambiato niente.'); return attuale; }
    const nuovo = scriviRuolo(r, risposta === '1' ? 'originale' : 'prova');
    console.log(nuovo.ruolo === 'originale'
      ? ' Salvato: questo e\' il PC del Direttore. L\'app non mostra nessuna fascia.'
      : ` Salvato: copia di prova. L'app mostra in alto "Copia di prova su ${ascii(nuovo.nomePc)} - i personaggi veri sono sul PC del Direttore".`);
    console.log(' La scelta resta anche dopo gli aggiornamenti (e\' salvata nel profilo di Windows). Si cambia da Impostazioni.');
    return nuovo;
  } finally { if (!esterno) rl.chiudi(); }
}

/** Le righe del menu, con lo stato di adesso. */
export async function testoMenu(radiceApp = radice, portaServer = porta) {
  const s = await statoServer(portaServer);
  let ruolo = null;
  try { ruolo = testoRuolo(leggiRuolo(radiceApp)); } catch { /* profilo non leggibile */ }
  let talenti = null;
  try { talenti = statoPassaggio(cartellePg(radiceApp)); } catch { /* cartella non leggibile */ }
  return righeMenu({
    versione: testoVersione(radiceApp),
    server: s.acceso ? (s.mutant ? `ACCESO (http://localhost:${portaServer})` : `porta ${portaServer} occupata da un altro programma`) : 'spento',
    ruolo: ruolo ? `${ruolo} - nome del PC: ${hostname()}` : null,
    impostazioni: rigaImpostazioni(radiceApp),
    talenti,
  });
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
      console.log(`  4. Ruolo di questo PC: ${ascii(testoRuolo(leggiRuolo(radice)))}`);
      console.log('  5. Metti il collegamento "Mutant" sul desktop');
      console.log('  6. Torna al menu');
      const r = (await chiedi('\n Scegli un numero (Invio = torna al menu): ')).trim();
      if (r === '1') await voceAvvisi(chiedi);
      else if (r === '2') await voceDrive(chiedi);
      else if (r === '4') await voceRuolo({ rl });
      else if (r === '5') creaCollegamento();
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
  // 25/10/2026 (parte C): il ruolo del PC si chiede all'avvio finché non c'è una risposta; senza, l'app resta come prima
  let senzaRuolo = false;
  try { senzaRuolo = !leggiRuolo(radice).ruolo; } catch { /* profilo non leggibile: non si chiede */ }
  if (senzaRuolo) {
    console.log('\n ==============================================================');
    console.log('  Una domanda, una volta sola: su questo PC non so ancora che ruolo ha.');
    console.log(' ==============================================================');
    await voceRuolo({ rl });
  }
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
    for (const r of righeCartellaVuota()) console.log(r);
  } else if (comando === 'stato') {
    // codice d'uscita per il .bat: 0 acceso, 1 spento
    process.exitCode = (await statoServer(porta)).acceso ? 0 : 1;
  } else if (comando === 'ripristina') {
    await voceRipristina();
  } else if (comando === 'impostazioni') {
    await voceImpostazioni();
  } else if (comando === 'avvio') {
    await voceAvvio();
  } else if (comando === 'menu') {
    for (const r of await testoMenu()) console.log(r);
    for (const r of righeCartellaVuota()) console.log(r);
  } else if (comando === 'controlla') {
    await voceControlla();
  } else if (comando === 'talenti') {
    await voceTalenti();
  } else if (comando === 'talenti-ripristina') {
    await voceTalentiRipristina();
  } else if (comando === 'ruolo') {
    await voceRuolo();
  } else if (comando === 'collegamento') {
    creaCollegamento();
  } else {
    console.error('Comandi: menu, intestazione, stato, ripristina, impostazioni, avvio, controlla, talenti, talenti-ripristina, ruolo, collegamento');
    process.exitCode = 2;
  }
}
