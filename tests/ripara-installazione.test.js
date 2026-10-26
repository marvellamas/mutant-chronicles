// Mutant si accorge di essere la copia sbagliata e si rimette a posto (27/10/2026, lotto 128): il caso di Davide,
// riprodotto esattamente — un'installazione vera con personaggi e PX, il pacchetto zippato e quello estratto sul
// desktop, la copia vuota creata dentro il pacchetto estratto, il collegamento che punta alla copia vuota, e una
// copia dei personaggi in una cartella che fa da cloud. Solo su Windows (PowerShell, robocopy, il collegamento
// .lnk); altrove i test con quelle parti si saltano.
//
// Ogni prova lavora dentro una propria cartella "casa" finta (home), passata esplicitamente a cerca-personaggi.mjs:
// senza, la ricerca guarderebbe anche la cartella TEMP vera del PC (dove mkdtempSync crea le cartelle di prova di
// TUTTI i test, anche quelli già finiti) e troverebbe installazioni di altre prove, non solo quella di questo test.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { controllaSeSbagliata, segnaCartellaVuota, eseguiRinominePendenti, aggiornaCodiceAltra } from '../tools/ripara-installazione.mjs';
import { proponiRiparazione, creaCollegamento } from '../tools/console.mjs';
import { percorsoImpostazione, leggiImpostazione, cartellaDati, quantiPersonaggi } from '../tools/dati-pc.mjs';

const windows = process.platform === 'win32';
const opz = { skip: windows ? false : 'solo su Windows (PowerShell, robocopy, collegamento)' };
const REPO = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const fixture = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json');
const scrivi = (p, t) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, t); };
const percorsoPendenti = () => join(process.env.MUTANT_CONFIG_DIR, 'riparazioni-pendenti.json');

/** Una cartella "PC" isolata, con una "home" vuota propria: la ricerca (home) non esce mai da qui. */
function pc() {
  const r = mkdtempSync(join(tmpdir(), 'mutant-ripara-'));
  const home = join(r, 'utente');
  mkdirSync(home, { recursive: true });
  return { r, home, opzRicerca: { home } };
}

/** L'installazione vera di Davide: Mutant.bat/server.mjs, i 7 personaggi con i PX, px.json, e versione.json. */
function installazioneBuona(dentro, nome = 'mutant') {
  const d = join(dentro, nome);
  for (const f of fixture) {
    const o = JSON.parse(readFileSync(new URL(f, FIX), 'utf8'));
    scrivi(join(d, 'personaggi', f), JSON.stringify({ ...o, scelte: { ...o.scelte, puntiEsperienza: 300 + f.length }, aggiornato_il: new Date(Date.now() - 36 * 3600 * 1000).toISOString() }));
  }
  scrivi(join(d, 'px', 'px.json'), JSON.stringify({ archivio: [{ data: '2026-10-25', px: 330 }] }));
  scrivi(join(d, 'Mutant.bat'), '@echo off\r\n');
  scrivi(join(d, 'server.mjs'), '// vecchio\r\n');
  scrivi(join(d, 'versione.json'), '{"impronta":"vecchia"}');
  return d;
}
/** La copia vuota creata dentro il pacchetto "distribuzione" estratto sul desktop, con il codice più recente. */
function copiaVuotaConPacchetto(dentro, nome = 'mutant') {
  const d = join(dentro, nome);
  for (const c of ['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'musica', 'galleria', 'px', 'autosave', 'salvataggi']) scrivi(join(d, c, 'LEGGIMI.txt'), 'leggimi');
  scrivi(join(d, 'server.mjs'), '// nuovo\r\n');
  scrivi(join(d, 'Mutant.bat'), '@echo off\r\n');
  scrivi(join(d, 'versione.json'), '{"impronta":"nuova"}');
  // il controllo_zip di aggiorna-da-zip.ps1 (quello che si usa per aggiornare un'altra installazione dal codice di
  // questa): index.html, server.mjs, versione.json, package.json, src, data, tools/file-locali.json, lo script stesso
  scrivi(join(d, 'index.html'), '<html>nuova</html>');
  scrivi(join(d, 'package.json'), '{"name":"mutant"}');
  scrivi(join(d, 'src', 'app.js'), '// nuovo');
  scrivi(join(d, 'data', 'regole.json'), '{}');
  scrivi(join(d, 'tools', 'file-locali.json'), readFileSync(join(REPO, 'tools', 'file-locali.json'), 'utf8'));
  scrivi(join(d, 'distribuzione', 'aggiorna-da-zip.ps1'), readFileSync(join(REPO, 'distribuzione', 'aggiorna-da-zip.ps1'), 'utf8'));
  return d;
}
/** Una cartella "cloud": solo i file dei personaggi, senza Mutant.bat né server.mjs. */
function copiaCloud(dentro, nome = 'cloud') {
  const d = join(dentro, nome);
  for (const f of fixture.slice(0, 2)) {
    const o = JSON.parse(readFileSync(new URL(f, FIX), 'utf8'));
    scrivi(join(d, 'personaggi', f), JSON.stringify({ ...o, scelte: { ...o.scelte, puntiEsperienza: 10 } }));
  }
  return d;
}

beforeEach(() => { rmSync(percorsoImpostazione(), { force: true }); rmSync(percorsoPendenti(), { force: true }); });

test('il caso di Davide: un\'installazione vuota si accorge dell\'altra, vera, con i personaggi e i PX', () => {
  const { home, opzRicerca } = pc();
  const buona = installazioneBuona(join(home, 'OneDrive', 'Desktop', 'distribuzione'));
  const vuota = copiaVuotaConPacchetto(join(home, 'Desktop', 'distribuzione'));
  copiaCloud(join(home, 'Dati precedenti')); // una terza copia, solo cloud: non deve essere proposta al posto dell'installazione vera
  const c = controllaSeSbagliata(vuota, opzRicerca);
  assert.equal(c.tipo, 'installazione');
  assert.equal(c.cartella, buona);
  assert.equal(c.quanti, fixture.length);
});

test('senza un\'altra installazione, ma con una copia sul cloud: si propone di copiarla dentro, non di usarla da lì', () => {
  const { home, opzRicerca } = pc();
  const vuota = copiaVuotaConPacchetto(join(home, 'Desktop', 'distribuzione')); // questa è l'unica "installazione" sul PC (0 personaggi)
  const cloud = copiaCloud(join(home, 'Dati precedenti'));
  const c = controllaSeSbagliata(vuota, opzRicerca);
  assert.equal(c.tipo, 'copia');
  assert.equal(c.cartella, cloud);
  assert.equal(c.quanti, 2);
});

test('senza nessun\'altra copia con personaggi: niente da riparare', () => {
  const { home, opzRicerca } = pc();
  const vuota = copiaVuotaConPacchetto(join(home, 'Desktop', 'distribuzione'));
  assert.equal(controllaSeSbagliata(vuota, opzRicerca), null);
});

test('con i personaggi già al loro posto: niente da riparare (anche se un\'altra installazione esiste)', () => {
  const { home, opzRicerca } = pc();
  installazioneBuona(join(home, 'Desktop'));
  const altraBuona = installazioneBuona(join(home, 'OneDrive', 'Desktop'), 'altra');
  assert.equal(controllaSeSbagliata(altraBuona, opzRicerca), null);
});

test('proponiRiparazione, tipo "installazione": con SI usa quella buona, aggiorna il suo codice, rifà il collegamento, segna la copia vuota', opz, async () => {
  const { r, home, opzRicerca } = pc();
  const buona = installazioneBuona(join(home, 'OneDrive', 'Desktop', 'distribuzione'));
  const vuota = copiaVuotaConPacchetto(join(home, 'Desktop', 'distribuzione'));
  const desktopDiProva = join(r, 'desktop-di-prova');
  mkdirSync(desktopDiProva, { recursive: true });
  const risposte = (a) => { const coda = [...a]; return { chiedi: async () => coda.shift() ?? '', chiudi: () => {} }; };
  // il collegamento vero (creaCollegamento) scrive sul desktop di Windows: nella prova si manda su uno finto
  // (MUTANT_DESKTOP, previsto apposta in tools/console.mjs), mai su quello reale di chi sta eseguendo i test
  const faiCollegamentoDiProva = (cartella) => {
    process.env.MUTANT_DESKTOP = desktopDiProva;
    try { return creaCollegamento(cartella); } finally { delete process.env.MUTANT_DESKTOP; }
  };
  const log = console.log; console.log = () => {};
  let e;
  try {
    e = await proponiRiparazione({ radice: vuota, rl: risposte(['SI']), faiCollegamento: faiCollegamentoDiProva, ...opzRicerca });
  } finally { console.log = log; }
  assert.equal(e.fatto, true);
  assert.equal(e.riavviare, true);
  assert.equal(e.scelta, buona);
  // dati.json punta alla installazione buona
  assert.equal(leggiImpostazione().cartella, buona);
  assert.equal(cartellaDati(vuota).cartella, buona);
  // il collegamento sul desktop di prova punta a quella buona
  const lnk = join(desktopDiProva, 'Mutant.lnk');
  assert.ok(existsSync(lnk));
  const r2 = spawnSync('powershell', ['-NoProfile', '-Command', `(New-Object -ComObject WScript.Shell).CreateShortcut('${lnk}').TargetPath`], { encoding: 'utf8' });
  const bersaglio = r2.stdout.trim();
  // Windows può dare il nome breve (BEASTM~1) della cartella del profilo in un punto e il nome lungo nell'altro,
  // stessa cartella fisica: si confronta solo la parte dopo il profilo, che quella non la cambia nessuno dei due
  assert.match(bersaglio.toLowerCase(), /\\distribuzione\\mutant\\mutant\.bat$/);
  assert.ok(existsSync(bersaglio));
  // il codice della buona è stato messo al passo (versione nuova), senza toccare i suoi personaggi
  assert.equal(JSON.parse(readFileSync(join(buona, 'versione.json'), 'utf8')).impronta, 'nuova');
  assert.equal(quantiPersonaggi(buona), fixture.length);
  // la copia vuota è segnata per la rinomina, ma non ancora rinominata (è ancora quella da cui si è partiti)
  assert.ok(JSON.parse(readFileSync(percorsoPendenti(), 'utf8')).cartelle.includes(vuota));
  assert.ok(existsSync(vuota));
});

test('eseguiRinominePendenti: non rinomina mai se stessi; rinomina la copia vuota quando si parte da un\'altra', () => {
  const { home } = pc();
  const vuota = copiaVuotaConPacchetto(join(home, 'Desktop', 'distribuzione'));
  const buona = installazioneBuona(join(home, 'OneDrive', 'Desktop', 'distribuzione'));
  segnaCartellaVuota(vuota);
  // partendo di nuovo dalla copia vuota: non si tocca (sarebbe la propria cartella di lavoro)
  assert.deepEqual(eseguiRinominePendenti(vuota), []);
  assert.ok(existsSync(vuota));
  // partendo dalla buona: adesso è sicuro, si rinomina
  const fatte = eseguiRinominePendenti(buona);
  assert.equal(fatte.length, 1);
  assert.equal(fatte[0].a, `${vuota}-NON-USARE`);
  assert.ok(!existsSync(vuota));
  assert.ok(existsSync(`${vuota}-NON-USARE`));
  // l'elenco in sospeso è vuoto adesso
  assert.deepEqual(JSON.parse(readFileSync(percorsoPendenti(), 'utf8')).cartelle, []);
});

test('eseguiRinominePendenti: non rinomina una cartella segnata che nel frattempo ha di nuovo dei personaggi', () => {
  const { home } = pc();
  const vuota = copiaVuotaConPacchetto(join(home, 'Desktop', 'distribuzione'));
  const buona = installazioneBuona(join(home, 'OneDrive', 'Desktop', 'distribuzione'));
  segnaCartellaVuota(vuota);
  // qualcuno ha rimesso dei personaggi proprio dentro la cartella vuota, prima della rinomina
  const o = JSON.parse(readFileSync(new URL(fixture[0], FIX), 'utf8'));
  scrivi(join(vuota, 'personaggi', fixture[0]), JSON.stringify(o));
  assert.deepEqual(eseguiRinominePendenti(buona), []);
  assert.ok(existsSync(vuota));
});

test('proponiRiparazione, tipo "copia": con SI copia i file dentro, senza spostare o cancellare l\'originale', async () => {
  const { home, opzRicerca } = pc();
  const vuota = copiaVuotaConPacchetto(join(home, 'Desktop', 'distribuzione'));
  const cloud = copiaCloud(join(home, 'Dati precedenti'));
  const risposte = (a) => { const coda = [...a]; return { chiedi: async () => coda.shift() ?? '', chiudi: () => {} }; };
  const log = console.log; console.log = () => {};
  let e;
  try { e = await proponiRiparazione({ radice: vuota, rl: risposte(['SI']), ...opzRicerca }); } finally { console.log = log; }
  assert.equal(e.fatto, true);
  assert.equal(e.riavviare, false);
  assert.equal(e.copiati, 2);
  assert.equal(quantiPersonaggi(vuota), 2);
  assert.equal(quantiPersonaggi(cloud), 2, 'l\'originale sul cloud non si tocca');
  assert.equal(leggiImpostazione(), null, 'resta questa installazione: niente da cambiare in dati.json');
});

test('senza SI non si cambia niente, e si richiede alla prossima apertura', async () => {
  const { home, opzRicerca } = pc();
  const buona = installazioneBuona(join(home, 'OneDrive', 'Desktop', 'distribuzione'));
  const vuota = copiaVuotaConPacchetto(join(home, 'Desktop', 'distribuzione'));
  const risposte = (a) => { const coda = [...a]; return { chiedi: async () => coda.shift() ?? '', chiudi: () => {} }; };
  const log = console.log; console.log = () => {};
  let e;
  try { e = await proponiRiparazione({ radice: vuota, rl: risposte(['']), ...opzRicerca }); } finally { console.log = log; }
  assert.equal(e.fatto, false);
  assert.equal(leggiImpostazione(), null);
  assert.ok(existsSync(vuota));
  // alla prossima apertura, la stessa domanda
  const c = controllaSeSbagliata(vuota, opzRicerca);
  assert.equal(c.cartella, buona);
});

test('aggiornaCodiceAltra: aggiorna i file dell\'app di un\'altra installazione senza toccare i suoi dati, e non la tocca se è già alla stessa versione', opz, () => {
  const { r } = pc();
  const sorgente = copiaVuotaConPacchetto(join(r, 'sorgente'));
  const destinazione = installazioneBuona(join(r, 'destinazione'));
  const prima = quantiPersonaggi(destinazione);
  const e = aggiornaCodiceAltra({ sorgente, destinazione });
  assert.equal(e.ok, true);
  assert.equal(e.fatto, true);
  assert.equal(JSON.parse(readFileSync(join(destinazione, 'versione.json'), 'utf8')).impronta, 'nuova');
  assert.equal(quantiPersonaggi(destinazione), prima);
  // già alla stessa versione: non fa niente la seconda volta
  const e2 = aggiornaCodiceAltra({ sorgente, destinazione });
  assert.equal(e2.fatto, false);
});
