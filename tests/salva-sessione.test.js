// Salvataggi (tools/salva-sessione.mjs; richieste di Marcello del 06/10 e dell'08/10/2026): zip delle cartelle del
// server mai sovrascritto, autosave solo con modifiche e con rotazione sicura, procedura unica dai tre punti («Salva
// sessione» e «Spegni Mutant» del server, salva-sessione.bat), destinazioni assenti o in errore mai bloccanti, zip
// «dati» senza le immagini delle mappe, notifica ntfy con allegato (verso un server finto, niente rete nei test).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, utimesSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  salvataggioCompleto, autosave, creaGestore, nomeArchivio, leggiConfig, pushGithub, leggiZip, cartelleDi, minutiAutosave,
  cartellaDrive, confNtfy, rigaEsito, dimensione, CARTELLE_DATI,
} from '../tools/salva-sessione.mjs';
import { creaServer, daQuestoPc } from '../server.mjs';

const radici = [];
after(() => radici.forEach((r) => rmSync(r, { recursive: true, force: true })));
const tmp = () => { const r = mkdtempSync(join(tmpdir(), 'mutant-salva-')); radici.push(r); return r; };
const testo = (z, n) => z[n]?.toString('utf8');
// un'immagine finta (non compressibile, come un JPG vero)
const IMMAGINE = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 7919) % 251));

const radiceDiProva = () => {
  const r = tmp();
  for (const [c, f, t] of [['personaggi', 'Lia_liv2_2026-10-06.json', '{"nome":"Lià"}'], ['veicoli', 'vei123.json', '{}'], ['scontri', 'scontro-1.json', '{}'], ['nemici', 'orco.json', '{}'], ['tavolo', 'sessione.json', '{"personaggi":[]}'], ['personaggi', 'LEGGIMI.txt', 'leggimi'], ['scene', 'cripta.json', '{"id":"cripta"}']]) {
    mkdirSync(join(r, c), { recursive: true });
    writeFileSync(join(r, c, f), t);
  }
  mkdirSync(join(r, 'mappe'));
  writeFileSync(join(r, 'mappe', 'cripta-abc123.jpg'), IMMAGINE);
  mkdirSync(join(r, 'src'));
  writeFileSync(join(r, 'src', 'app.js'), 'non va nello zip');
  return r;
};
const base = (r, extra = {}) => ({ cartelle: cartelleDi(r), salvataggi: join(r, 'salvataggi'), ...extra });

/** Server ntfy finto: registra le richieste; `risposte` = codici da dare in ordine (poi 200). */
async function ntfyFinto(risposte = []) {
  const ricevute = [];
  const s = createServer((req, res) => {
    const pezzi = [];
    req.on('data', (d) => pezzi.push(d));
    req.on('end', () => {
      const u = new URL(req.url, 'http://x');
      ricevute.push({ metodo: req.method, argomento: u.pathname.slice(1), q: Object.fromEntries(u.searchParams), corpo: Buffer.concat(pezzi) });
      res.statusCode = risposte.shift() ?? 200;
      res.end('{}');
    });
  });
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
  return { server: `http://127.0.0.1:${s.address().port}`, ricevute, chiudi: () => new Promise((ok) => s.close(ok)) };
}
// un server ntfy finto su questo PC (confNtfy accetta http solo per 127.0.0.1)
const confProva = (server) => ({ ntfy_argomento: 'mutant-prova-salvataggi', ntfy_server: server });

test('zip completo con data e ora, tutte le cartelle e nient’altro; immagini «stored»; contenuto integro', async () => {
  const r = radiceDiProva();
  const adesso = new Date(2026, 9, 6, 23, 5);
  const e = await salvataggioCompleto({ ...base(r), adesso, config: { ntfy: false } });
  assert.equal(e.ok, true);
  assert.equal(nomeArchivio(adesso), 'sessione_2026-10-06_2305.zip');
  assert.ok(e.archivio.endsWith(join('salvataggi', 'sessione_2026-10-06_2305.zip')));
  const buf = readFileSync(e.archivio);
  const z = leggiZip(buf);
  assert.deepEqual(Object.keys(z).sort(), ['mappe/cripta-abc123.jpg', 'nemici/orco.json', 'personaggi/LEGGIMI.txt', 'personaggi/Lia_liv2_2026-10-06.json', 'scene/cripta.json', 'scontri/scontro-1.json', 'tavolo/sessione.json', 'veicoli/vei123.json']);
  assert.equal(testo(z, 'personaggi/Lia_liv2_2026-10-06.json'), '{"nome":"Lià"}');
  assert.ok(z['mappe/cripta-abc123.jpg'].equals(IMMAGINE));
  // l'immagine è «stored» (metodo 0): già compressa, niente tempo perso a ricomprimerla
  const p = buf.indexOf(Buffer.from('mappe/cripta-abc123.jpg')) - 30;
  assert.equal(buf.readUInt16LE(p + 8), 0);
  // senza configurazione: Drive non impostato, ntfy spento, GitHub saltato; nessun errore
  assert.equal(e.drive.stato, 'spento');
  assert.equal(e.ntfy.stato, 'spento');
  assert.equal(e.github.stato, 'spento');
  assert.match(e.riga, /^Sessione salvata: zip \d+ KB \(dati \d+ KB\) · Drive non impostato · ntfy spento$/);
});

test('mai sovrascrivere: due salvataggi nello stesso minuto; copia su Drive («cartella_drive» e il vecchio «copia_in»)', async () => {
  const r = radiceDiProva();
  const drive = tmp();
  const adesso = new Date(2026, 9, 6, 23, 5);
  const a = await salvataggioCompleto({ ...base(r), adesso, config: { cartella_drive: drive, ntfy: false } });
  writeFileSync(join(r, 'personaggi', 'Lia_liv2_2026-10-06.json'), '{"nome":"Lia","pv":3}');
  const b = await salvataggioCompleto({ ...base(r), adesso, config: { copia_in: drive, ntfy: false } });
  assert.deepEqual(readdirSync(join(r, 'salvataggi')).sort(), ['sessione_2026-10-06_2305.zip', 'sessione_2026-10-06_2305_2.zip']);
  assert.deepEqual(readdirSync(drive).sort(), ['sessione_2026-10-06_2305.zip', 'sessione_2026-10-06_2305_2.zip']);
  assert.equal(testo(leggiZip(readFileSync(a.archivio)), 'personaggi/Lia_liv2_2026-10-06.json'), '{"nome":"Lià"}');
  assert.equal(testo(leggiZip(readFileSync(b.archivio)), 'personaggi/Lia_liv2_2026-10-06.json'), '{"nome":"Lia","pv":3}');
  assert.equal(b.drive.stato, 'ok');
  assert.match(b.riga, /Drive ✓/);
});

test('destinazioni assenti o in errore non bloccano: Drive inesistente, ntfy 500, ntfy irraggiungibile', async () => {
  const r = radiceDiProva();
  const finto = await ntfyFinto([500]);
  const e = await salvataggioCompleto({ ...base(r), config: { cartella_drive: join(r, 'non-esiste'), ...confProva(finto.server) } });
  assert.equal(e.ok, true);
  assert.ok(existsSync(e.archivio), 'lo zip locale c’è sempre');
  assert.equal(e.drive.stato, 'errore');
  assert.match(e.drive.messaggio, /non esiste .*Google Drive per desktop/);
  assert.equal(e.ntfy.stato, 'errore');
  assert.match(e.ntfy.messaggio, /risposto 500.*zip è comunque/);
  assert.match(e.riga, /Drive ✗ · ntfy ✗/);
  await finto.chiudi();
  // server chiuso: rete irraggiungibile, sempre senza eccezioni
  const f = await salvataggioCompleto({ ...base(r), config: confProva(finto.server), veloce: true });
  assert.equal(f.ok, true);
  assert.equal(f.ntfy.stato, 'errore');
  assert.match(f.ntfy.messaggio, /rete non raggiungibile|nessuna risposta/);
  // cartella dei salvataggi impossibile (è un file): lo dice, senza eccezioni
  writeFileSync(join(r, 'occupato'), 'x');
  const g = await salvataggioCompleto({ cartelle: cartelleDi(r), salvataggi: join(r, 'occupato'), config: { ntfy: false } });
  assert.equal(g.ok, false);
  assert.match(g.riga, /^Sessione NON salvata: lo zip in /);
});

test('ntfy: allegato lo zip «dati» senza le immagini delle mappe; titolo e testo con le lettere accentate', async () => {
  const r = radiceDiProva();
  const finto = await ntfyFinto();
  const adesso = new Date(2026, 9, 8, 23, 40);
  const e = await salvataggioCompleto({ ...base(r), adesso, pc: 'PC-DAVIDE', origine: 'Spegni Mutant', config: confProva(finto.server) });
  await finto.chiudi();
  assert.equal(e.ntfy.stato, 'ok');
  assert.equal(finto.ricevute.length, 1);
  const [q] = finto.ricevute;
  assert.equal(q.metodo, 'PUT');
  assert.equal(q.argomento, 'mutant-prova-salvataggi');
  assert.equal(q.q.filename, 'sessione_2026-10-08_2340_dati.zip');
  assert.equal(q.q.title, 'Mutant: sessione salvata');
  assert.match(q.q.message, /^PC-DAVIDE, 08\/10\/2026 23:40 \(Spegni Mutant\): zip .* Drive non impostato\. In allegato i dati/);
  const z = leggiZip(q.corpo);
  assert.ok(!Object.keys(z).some((n) => n.startsWith('mappe/')), 'niente immagini nello zip «dati»');
  assert.ok(Object.keys(z).every((n) => CARTELLE_DATI.includes(n.split('/')[0])));
  assert.ok(Object.keys(z).some((n) => n.startsWith('scene/')), 'le scene sì');
  assert.equal(testo(z, 'personaggi/Lia_liv2_2026-10-06.json'), '{"nome":"Lià"}');
  assert.ok(e.dimensioneDati < e.dimensione);
});

test('ntfy: oltre il limite niente allegato; allegato rifiutato dal servizio → notifica senza allegato', async () => {
  const r = radiceDiProva();
  const finto = await ntfyFinto([413]);
  const e = await salvataggioCompleto({ ...base(r), config: confProva(finto.server) });
  assert.equal(e.ntfy.stato, 'ok');
  assert.match(e.ntfy.messaggio, /senza allegato \(rifiutato/);
  assert.deepEqual(finto.ricevute.map((x) => x.metodo), ['PUT', 'POST']);
  assert.match(finto.ricevute[1].q.message, /Allegato non accettato \(413\)/);
  finto.ricevute.length = 0;
  const f = await salvataggioCompleto({ ...base(r), config: { ...confProva(finto.server), ntfy_allegato_max_mb: 0.0001 } });
  await finto.chiudi();
  assert.deepEqual(finto.ricevute.map((x) => x.metodo), ['POST']);
  assert.match(f.ntfy.messaggio, /senza allegato \(dati oltre il limite\)/);
});

test('autosave: scrive, poi niente se nulla è cambiato; con una modifica ruota (ultimo e precedente)', async () => {
  const r = radiceDiProva();
  const dove = join(r, 'autosave');
  const a = await autosave({ cartelle: cartelleDi(r), dove });
  assert.equal(a.scritto, true);
  assert.deepEqual(readdirSync(dove).sort(), ['autosave.json', 'autosave.zip']);
  const b = await autosave({ cartelle: cartelleDi(r), dove });
  assert.deepEqual(b, { scritto: false, motivo: 'invariato' });
  const pg = join(r, 'personaggi', 'Lia_liv2_2026-10-06.json');
  writeFileSync(pg, '{"nome":"Lia","pv":1}');
  utimesSync(pg, new Date(), new Date(Date.now() + 5000)); // data diversa anche su file system lenti
  const c = await autosave({ cartelle: cartelleDi(r), dove });
  assert.equal(c.scritto, true);
  assert.deepEqual(readdirSync(dove).sort(), ['autosave-precedente.zip', 'autosave.json', 'autosave.zip']);
  assert.equal(testo(leggiZip(readFileSync(join(dove, 'autosave.zip'))), 'personaggi/Lia_liv2_2026-10-06.json'), '{"nome":"Lia","pv":1}');
  assert.equal(testo(leggiZip(readFileSync(join(dove, 'autosave-precedente.zip'))), 'personaggi/Lia_liv2_2026-10-06.json'), '{"nome":"Lià"}');
  // un file nuovo conta come modifica; cartelle vuote: niente autosave
  writeFileSync(join(r, 'nemici', 'goblin.json'), '{}');
  assert.equal((await autosave({ cartelle: cartelleDi(r), dove })).scritto, true);
  const vuota = tmp();
  assert.deepEqual(await autosave({ cartelle: cartelleDi(vuota), dove: join(vuota, 'autosave') }), { scritto: false, motivo: 'vuoto' });
});

test('autosave interrotto: gli zip di prima restano buoni, nessun temporaneo lasciato', async () => {
  const r = radiceDiProva();
  const dove = join(r, 'autosave');
  await autosave({ cartelle: cartelleDi(r), dove });
  writeFileSync(join(r, 'nemici', 'goblin.json'), '{}');
  await autosave({ cartelle: cartelleDi(r), dove });
  const ultimoPrima = readFileSync(join(dove, 'autosave.zip'));
  const precedentePrima = readFileSync(join(dove, 'autosave-precedente.zip'));
  writeFileSync(join(r, 'nemici', 'troll.json'), '{}');
  // 1. si interrompe mentre scrive il temporaneo
  await assert.rejects(autosave({ cartelle: cartelleDi(r), dove, fs: { writeFile: async () => { throw new Error('disco pieno'); }, rename } }), /disco pieno/);
  assert.ok(readFileSync(join(dove, 'autosave.zip')).equals(ultimoPrima));
  assert.ok(readFileSync(join(dove, 'autosave-precedente.zip')).equals(precedentePrima));
  // 2. si interrompe dopo aver spostato l'ultimo in «precedente»: il precedente è l'ultimo buono
  let giri = 0;
  const renameRotto = async (da, a) => { if (++giri === 2) { const e = new Error('spento'); e.code = 'EIO'; throw e; } return rename(da, a); };
  await assert.rejects(autosave({ cartelle: cartelleDi(r), dove, fs: { writeFile, rename: renameRotto } }), /spento/);
  assert.ok(readFileSync(join(dove, 'autosave-precedente.zip')).equals(ultimoPrima));
  assert.ok(!readdirSync(dove).some((n) => n.includes('.tmp-')), 'nessun temporaneo');
  // il giro dopo si rimette in pari: l'impronta salvata è quella di prima, quindi scrive
  const ok = await autosave({ cartelle: cartelleDi(r), dove });
  assert.equal(ok.scritto, true);
  assert.ok(testo(leggiZip(readFileSync(join(dove, 'autosave.zip'))), 'nemici/troll.json') === '{}');
  assert.ok(readFileSync(join(dove, 'autosave-precedente.zip')).equals(ultimoPrima));
});

test('allo spegnimento: niente zip in più se non è cambiato nulla dall’ultimo salvataggio completo', async () => {
  const r = radiceDiProva();
  const log = [];
  const g = creaGestore({ ...base(r), autosave: join(r, 'autosave'), config: () => ({ ntfy: false }), log: (x) => log.push(x) });
  const a = await g.salva('Salva sessione');
  assert.equal(a.ok, true);
  const b = await g.salva('Spegni Mutant', { seCambiato: true });
  assert.equal(b.saltato, true);
  assert.match(b.riga, /Niente di nuovo/);
  assert.equal(readdirSync(join(r, 'salvataggi')).length, 1);
  writeFileSync(join(r, 'nemici', 'goblin.json'), '{}');
  const c = await g.salva('chiusura: finestra chiusa', { seCambiato: true, veloce: true });
  assert.equal(c.saltato, undefined);
  assert.equal(readdirSync(join(r, 'salvataggi')).length, 2);
  assert.match(g.ultimo().riga, /^Sessione salvata/);
  assert.ok(log.some((x) => /Sessione salvata/.test(x)));
  // due salvataggi chiesti insieme: in coda, due zip distinti
  const [d, f] = await Promise.all([g.salva('uno'), g.salva('due')]);
  assert.notEqual(d.archivio, f.archivio);
});

test('procedura unica dai tre punti: «Salva sessione» e «Spegni Mutant» del server, salva-sessione.bat', async () => {
  const r = radiceDiProva();
  const drive = tmp();
  writeFileSync(join(r, 'config-salvataggi.json'), JSON.stringify({ cartella_drive: drive, ntfy: false }));
  const c = cartelleDi(r);
  let spento = null;
  const gestore = creaGestore({ ...base(r), autosave: join(r, 'autosave'), config: () => leggiConfig(join(r, 'config-salvataggi.json')), log: () => {} });
  const server = creaServer({ radice: r, cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, salvataggi: { ...gestore, spegni: (e) => { spento = e; } } });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    // 1. «Salva sessione»
    const uno = await (await fetch(`${url}/api/salva-sessione`, { method: 'POST' })).json();
    assert.equal(uno.ok, true);
    assert.match(uno.riga, /^Sessione salvata: zip .* · Drive ✓ · ntfy spento$/);
    // stato per la pagina: da questo PC, nessun autosave ancora, l'ultimo salvataggio
    const info = await (await fetch(`${url}/api/salvataggi`)).json();
    assert.equal(info.locale, true);
    assert.equal(info.autosave, null);
    assert.equal(info.ultimo.riga, uno.riga);
    // 2. salva-sessione.bat (la riga di comando, con il server acceso)
    const cli = spawnSync(process.execPath, [fileURLToPath(new URL('../tools/salva-sessione.mjs', import.meta.url)), `--radice=${r}`], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr);
    assert.match(cli.stdout, /Sessione salvata: zip .* · Drive OK/); // nella finestra nera ✓ diventa OK
    // 3. «Spegni Mutant»: senza modifiche dall'ultimo salvataggio non fa un altro zip, poi spegne
    const tre = await (await fetch(`${url}/api/spegni`, { method: 'POST' })).json();
    assert.equal(tre.spento, true);
    assert.equal(tre.ok, true);
    await new Promise((ok) => setTimeout(ok, 50));
    assert.ok(spento, 'spegni chiamato dopo la risposta');
    assert.equal(readdirSync(join(r, 'salvataggi')).length, 2);
    assert.equal(readdirSync(drive).length, 2);
    // metodo sbagliato
    assert.equal((await fetch(`${url}/api/spegni`)).status, 405);
  } finally {
    await new Promise((ok) => server.close(ok));
  }
  // un server senza salvataggi (i test, le prove): 404, nessuno zip
  const s2 = creaServer({ radice: r, cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => s2.listen(0, '127.0.0.1', ok));
  try {
    assert.equal((await fetch(`http://127.0.0.1:${s2.address().port}/api/salva-sessione`, { method: 'POST' })).status, 404);
  } finally { await new Promise((ok) => s2.close(ok)); }
});

test('«Spegni Mutant» solo da questo PC: loopback e indirizzi delle schede di rete sì, un tablet no', () => {
  const schede = { 'Wi-Fi': [{ address: '192.168.1.20' }, { address: 'fe80::1' }] };
  assert.equal(daQuestoPc('127.0.0.1', schede), true);
  assert.equal(daQuestoPc('::ffff:127.0.0.1', schede), true);
  assert.equal(daQuestoPc('::1', schede), true);
  assert.equal(daQuestoPc('192.168.1.20', schede), true);
  assert.equal(daQuestoPc('::ffff:192.168.1.20', schede), true);
  assert.equal(daQuestoPc('192.168.1.35', schede), false);
  assert.equal(daQuestoPc(undefined, schede), false);
});

test('configurazione: minuti dell’autosave, cartella di Drive, argomento ntfy; righe e dimensioni', () => {
  assert.equal(minutiAutosave({}), 5);
  assert.equal(minutiAutosave({ autosave_minuti: 10 }), 10);
  assert.equal(minutiAutosave({ autosave_minuti: 0 }), 0);
  assert.equal(minutiAutosave({ autosave_minuti: 'tanti' }), 5);
  assert.equal(minutiAutosave({ autosave_minuti: 1000 }), 5);
  assert.equal(cartellaDrive({ cartella_drive: '  ' }), null);
  assert.equal(cartellaDrive({ copia_in: 'G:/Drive' }), 'G:/Drive');
  assert.equal(cartellaDrive({ cartella_drive: 'G:/Il mio Drive/Mutant', copia_in: 'X:/' }), 'G:/Il mio Drive/Mutant');
  const avvisi = { attivo: true, ntfy_argomento: 'mutant-bwx2nydllq122yww' };
  assert.deepEqual(confNtfy({}, avvisi), { argomento: 'mutant-bwx2nydllq122yww', server: 'https://ntfy.sh' });
  assert.equal(confNtfy({ ntfy: false }, avvisi), null);
  assert.equal(confNtfy({}, { attivo: false, ntfy_argomento: 'mutant-bwx2nydllq122yww' }), null);
  assert.equal(confNtfy({}, null), null);
  assert.equal(confNtfy({ ntfy_argomento: 'mutant-prova-salvataggi' }, null).argomento, 'mutant-prova-salvataggi');
  assert.equal(dimensione(500), '1 KB');
  assert.equal(dimensione(812 * 1024), '812 KB');
  assert.equal(dimensione(4.2 * 1024 * 1024), '4,2 MB');
  const e = { ok: true, dimensione: 812 * 1024, dimensioneDati: 812 * 1024, drive: { stato: 'ok' }, ntfy: { stato: 'ok' }, github: { stato: 'spento' } };
  assert.equal(rigaEsito(e), 'Sessione salvata: zip 812 KB · Drive ✓ · ntfy ✓');
  // l'esempio tracciato è un JSON valido con i valori di partenza
  const esempio = leggiConfig(fileURLToPath(new URL('../config-salvataggi.esempio.json', import.meta.url)));
  assert.equal(minutiAutosave(esempio), 5);
  assert.equal(cartellaDrive(esempio), null);
  assert.equal(esempio.ntfy, true);
});

test('GitHub: senza clone salta con un messaggio; configurazione non valida: errore leggibile', async () => {
  const r = radiceDiProva();
  const esito = await pushGithub(join(r, 'x.zip'), { cartella: tmp() });
  assert.equal(esito.fatto, false);
  assert.match(esito.messaggio, /non è un clone git/);
  assert.deepEqual(leggiConfig(join(r, 'manca.json')), {});
  writeFileSync(join(r, 'rotto.json'), '{ copia_in: ');
  assert.throws(() => leggiConfig(join(r, 'rotto.json')), /non è un JSON valido/);
});
