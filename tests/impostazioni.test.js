// Impostazioni di Mutant su questo PC (09/10/2026): avvisi ntfy e cartella di Google Drive dalla console (tools/impostazioni.mjs,
// tools/console.mjs), registro degli invii non riusciti (avvisi/registro.txt), aggiorna.bat che non sovrascrive.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import {
  statoImpostazioni, salvaAvvisi, salvaDrive, posizioniDrive, notificaDiProva, erroriNuovi, righeRegistro, argomentoGruppo, testoAvvisi,
} from '../tools/impostazioni.mjs';
import { avvisa } from '../tools/avvisi.mjs';
import { salvataggioCompleto } from '../tools/salva-sessione.mjs';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const nuova = () => {
  const r = mkdtempSync(join(tmpdir(), 'mutant-imp-'));
  mkdirSync(join(r, 'avvisi'));
  copyFileSync(join(REPO, 'avvisi', 'avvisi.esempio.json'), join(r, 'avvisi', 'avvisi.esempio.json'));
  copyFileSync(join(REPO, 'config-salvataggi.esempio.json'), join(r, 'config-salvataggi.esempio.json'));
  writeFileSync(join(r, 'versione.json'), JSON.stringify({ versione: 'prova12345' }));
  return r;
};
const scriviAvvisi = (r, v) => writeFileSync(join(r, 'avvisi', 'avvisi.json'), JSON.stringify(v));
const T0 = new Date('2026-10-09T15:00:00Z');

// server ntfy finto su 127.0.0.1
let srv; let porta; const ricevuti = [];
before(async () => {
  srv = createServer((req, res) => { let b = ''; req.on('data', (d) => { b += d; }); req.on('end', () => { ricevuti.push({ url: req.url, corpo: b }); res.end('{}'); }); });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  porta = srv.address().port;
});
after(() => new Promise((ok) => srv.close(ok)));

test('installazione nuova: impostazioni mancanti, avvisi non impostati, nessun invio', async () => {
  const r = nuova();
  const s = statoImpostazioni(r);
  assert.equal(s.nuova, true);
  assert.deepEqual([s.avvisi.stato, s.drive.stato], ['mancante', 'mancante']);
  assert.deepEqual(s.mancanti, [join('avvisi', 'avvisi.json'), 'config-salvataggi.json']);
  assert.match(testoAvvisi(s.avvisi), /non impostati/);
  const p = await notificaDiProva(r, { fetchFn: () => { throw new Error('non deve partire'); } });
  assert.deepEqual([p.ok, /non impostati/.test(p.testo)], [false, true]);
  // avvisa: senza file nessun invio (e niente nel registro: non è un invio fallito)
  assert.deepEqual(await avvisa('avvio', { radice: r, invia: () => { throw new Error('no'); } }), { mandato: false, motivo: 'spento' });
  assert.deepEqual(righeRegistro(r), []);
  rmSync(r, { recursive: true, force: true });
});

test('avvisi spenti e argomento vuoto: la prova dice perché e non parte', async () => {
  const r = nuova();
  const nessuno = () => { throw new Error('non deve partire'); };
  scriviAvvisi(r, { attivo: false, ntfy_argomento: 'mutant-bwx2nydllq122yww' });
  assert.equal(statoImpostazioni(r).avvisi.stato, 'spento');
  assert.match((await notificaDiProva(r, { fetchFn: nessuno })).testo, /SPENTI/);
  scriviAvvisi(r, { attivo: true, ntfy_argomento: '' });
  assert.equal(statoImpostazioni(r).avvisi.stato, 'argomento_vuoto');
  assert.match((await notificaDiProva(r, { fetchFn: nessuno })).testo, /argomento ntfy è vuoto/);
  // la console non salva avvisi accesi senza argomento, né un argomento non valido
  assert.equal(salvaAvvisi(r, { attivo: true, argomento: '' }).ok, false);
  assert.match(salvaAvvisi(r, { attivo: true, argomento: 'Mutant!' }).errore, /non è un argomento valido/);
  rmSync(r, { recursive: true, force: true });
});

test('salvataggio degli avvisi: argomento del gruppo proposto, nome del PC, altre chiavi conservate', () => {
  const r = nuova();
  const gruppo = argomentoGruppo(r);
  assert.match(gruppo, /^mutant-/);
  scriviAvvisi(r, { attivo: false, ntfy_argomento: 'mutant-vecchio-argomento', server: `http://127.0.0.1:${porta}` });
  assert.deepEqual(salvaAvvisi(r, { attivo: true, argomento: gruppo, nomePc: 'PC di Davide' }), { ok: true });
  assert.deepEqual(JSON.parse(readFileSync(join(r, 'avvisi', 'avvisi.json'), 'utf8')), { attivo: true, ntfy_argomento: gruppo, server: `http://127.0.0.1:${porta}`, nome_pc: 'PC di Davide' });
  assert.equal(statoImpostazioni(r).avvisi.stato, 'acceso');
  rmSync(r, { recursive: true, force: true });
});

test('notifica di prova riuscita e fallita (server finto): esito chiaro, l’errore nel registro', async () => {
  const r = nuova();
  scriviAvvisi(r, { attivo: true, ntfy_argomento: 'mutant-prova-impostazioni', server: `http://127.0.0.1:${porta}`, nome_pc: 'PC di Davide' });
  ricevuti.length = 0;
  const ok = await notificaDiProva(r, { adesso: T0 });
  assert.equal(ok.ok, true);
  assert.match(ok.testo, /Notifica inviata all’argomento mutant-prova-impostazioni/);
  assert.equal(ricevuti[0].url, '/mutant-prova-impostazioni');
  assert.match(ricevuti[0].corpo, /^Prova degli avvisi di Mutant da PC di Davide/);
  // server che risponde con un errore, poi rete assente
  const no = await notificaDiProva(r, { fetchFn: async () => ({ ok: false, status: 429 }) });
  assert.deepEqual([no.ok, no.testo], [false, 'Notifica NON inviata: il servizio ntfy ha risposto 429.']);
  const rete = await notificaDiProva(r, { fetchFn: async () => { throw new TypeError('fetch failed'); } });
  assert.match(rete.testo, /rete non raggiungibile/);
  const reg = righeRegistro(r);
  assert.equal(reg.length, 2);
  assert.match(reg[0].testo, /prova · Prova degli avvisi di Mutant da PC di Davide.*il servizio ntfy ha risposto 429/);
  rmSync(r, { recursive: true, force: true });
});

test('avviso non partito: nel registro con il motivo; la console lo mostra una volta sola', async () => {
  const r = nuova();
  scriviAvvisi(r, { attivo: true, ntfy_argomento: 'mutant-prova-impostazioni', nome_pc: 'PC di Davide' });
  const e = await avvisa('avvio', { radice: r, adesso: T0, invia: async () => ({ ok: false, errore: 'rete non raggiungibile' }) });
  assert.deepEqual([e.mandato, e.motivo], [false, 'errore']);
  assert.match(e.testo, /^Mutant avviato da PC di Davide, versione prova12345/);
  const nuovi = erroriNuovi(r, { segna: true });
  assert.equal(nuovi.length, 1);
  assert.match(nuovi[0].testo, /avviso «avvio» · Mutant avviato da PC di Davide.* · rete non raggiungibile$/);
  assert.deepEqual(erroriNuovi(r), [], 'già mostrato');
  // un invio riuscito non scrive nel registro
  assert.equal((await avvisa('aggiornato', { radice: r, invia: async () => ({ ok: true }) })).mandato, true);
  assert.equal(righeRegistro(r).length, 1);
  rmSync(r, { recursive: true, force: true });
});

test('cartella Drive: inesistente rifiutata, creata se la cartella sopra esiste, posizioni tipiche', () => {
  const r = nuova();
  const drive = join(r, 'Il mio Drive');
  assert.match(salvaDrive(r, join(drive, 'Mutant salvataggi')).errore, /non esiste/);
  assert.match(salvaDrive(r, join(drive, 'Mutant salvataggi'), { crea: true }).errore, /non esiste nemmeno/);
  mkdirSync(drive);
  const c = salvaDrive(r, join(drive, 'Mutant salvataggi'), { crea: true });
  assert.deepEqual([c.ok, c.creata], [true, true]);
  const s = statoImpostazioni(r).drive;
  assert.deepEqual([s.stato, s.percorso], ['ok', join(drive, 'Mutant salvataggi').replace(/\\/g, '/')]);
  // config creata dall'esempio, con le altre chiavi
  assert.equal(JSON.parse(readFileSync(join(r, 'config-salvataggi.json'), 'utf8')).autosave_minuti, 5);
  // nessuna copia
  assert.equal(salvaDrive(r, '').ok, true);
  assert.equal(statoImpostazioni(r).drive.stato, 'vuota');
  // posizioni tipiche di Google Drive per desktop
  const viste = new Set(['G:\\Il mio Drive', 'C:\\Users\\Davide\\Google Drive\\My Drive']);
  assert.deepEqual(posizioniDrive({ esiste: (p) => viste.has(p), env: { USERPROFILE: 'C:\\Users\\Davide' } }), ['G:\\Il mio Drive', 'C:\\Users\\Davide\\Google Drive\\My Drive']);
  rmSync(r, { recursive: true, force: true });
});

test('backup su Drive non riuscito: nel registro', async () => {
  const r = nuova();
  const cartelle = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((c) => [c, join(r, c)]));
  mkdirSync(cartelle.personaggi);
  writeFileSync(join(cartelle.personaggi, 'pg.json'), '{}');
  const registrati = [];
  const e = await salvataggioCompleto({ cartelle, salvataggi: join(r, 'salvataggi'), config: { cartella_drive: join(r, 'manca'), ntfy: false }, registra: (x) => registrati.push(x) });
  assert.equal(e.drive.stato, 'errore');
  assert.equal(registrati.length, 1);
  assert.match(registrati[0].tipo, /backup su Drive/);
  rmSync(r, { recursive: true, force: true });
});

test('aggiorna.bat crea le impostazioni solo se mancano, non le sovrascrive mai', () => {
  const righe = readFileSync(join(REPO, 'aggiorna.bat'), 'utf8').split(/\r?\n/).filter((l) => /avvisi\.json"|config-salvataggi\.json"/.test(l) && /copy/i.test(l));
  assert.equal(righe.length, 2);
  for (const l of righe) assert.match(l, /^if not exist "(avvisi\\avvisi\.json|config-salvataggi\.json)" /, l);
  // nessun'altra scrittura su quei file
  const tutte = readFileSync(join(REPO, 'aggiorna.bat'), 'utf8').split(/\r?\n/).filter((l) => !/^rem /i.test(l) && /avvisi\.json|config-salvataggi\.json/.test(l));
  assert.equal(tutte.length, 2);
});

test('console: all’avvio di un’installazione nuova propone le impostazioni e le salva', async () => {
  const r = nuova();
  const out = await new Promise((ok) => {
    const p = spawn(process.execPath, [join(REPO, 'tools', 'console.mjs'), 'avvio', `--radice=${r}`]);
    let o = '';
    p.stdout.on('data', (d) => { o += d; });
    p.on('close', () => ok(o));
    p.stdin.end(['S', '1', 'S', '', 'PC di Davide', '4', ''].join('\n'));
  });
  assert.match(out, /le impostazioni di Mutant non ci sono ancora/);
  assert.match(out, /Salvato: avvisi ACCESI/);
  assert.deepEqual(JSON.parse(readFileSync(join(r, 'avvisi', 'avvisi.json'), 'utf8')), { attivo: true, ntfy_argomento: argomentoGruppo(r), nome_pc: 'PC di Davide' });
  assert.equal(existsSync(join(r, 'config-salvataggi.json')), false);
  rmSync(r, { recursive: true, force: true });
});
