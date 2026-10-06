// Avvio con la porta occupata (richiesta di Marcello del 06/10/2026): un Mutant già acceso si riconosce dal ping e si
// può fermare; un altro programma si dice per quello che è. Le prove usano una porta libera presa a caso, mai la 3000,
// e fermano solo i server avviati qui (dal pid che il loro ping dichiara).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chiOccupa, testoDomanda, risposteSi, pidDaNetstat } from '../src/porta-occupata.js';

test('testoDomanda: versione e ora di avvio; un server di prima senza versione', () => {
  const avviato = new Date(2026, 9, 6, 12, 50, 40).toISOString();
  assert.equal(testoDomanda({ versione: 'a1b2c3', avviato }), "C'è già un Mutant acceso (versione a1b2c3, avviato alle 12:50). Lo fermo e riparto? [S/N] ");
  assert.equal(testoDomanda({ versione: null, avviato: null }), "C'è già un Mutant acceso (versione di prima, non dichiarata). Lo fermo e riparto? [S/N] ");
});

test('risposteSi: S, sì, y; tutto il resto è no', () => {
  for (const r of ['S', 's', ' si ', 'Sì', 'y', 'YES']) assert.equal(risposteSi(r), true, r);
  for (const r of ['', 'N', 'no', 'sicuro', null]) assert.equal(risposteSi(r), false, String(r));
});

test('pidDaNetstat: solo la riga in ascolto sulla porta giusta, anche IPv6 e in italiano', () => {
  const testo = [
    'Connessioni attive',
    '  Proto  Indirizzo locale       Indirizzo esterno      Stato           PID',
    '  TCP    0.0.0.0:30001          0.0.0.0:0              LISTENING       111',
    '  TCP    127.0.0.1:3000         127.0.0.1:52000        ESTABLISHED     222',
    '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       3432',
  ].join('\r\n');
  assert.equal(pidDaNetstat(testo, 3000), 3432);
  assert.equal(pidDaNetstat('  TCP    [::]:3017              [::]:0                 ASCOLTO         77', 3017), 77);
  assert.equal(pidDaNetstat(testo, 3017), null);
});

// --- prove con processi veri, su una porta libera ---
const radice = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'mutant-porta-'));
const figli = [];
after(() => { for (const f of figli) try { f.kill(); } catch { /* già spento */ } rmSync(temp, { recursive: true, force: true }); });

const portaLibera = () => new Promise((ok) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
/** Avvia `node server.mjs` su cartelle temporanee; stdin non è un terminale (come un avvio senza finestra). */
function avvia(porta, ...altri) {
  const cartelle = ['cartella', 'tavolo', 'scontri', 'nemici', 'veicoli'].map((k) => `--${k}=${join(temp, k)}`);
  const f = spawn(process.execPath, ['server.mjs', `--porta=${porta}`, '--solo-locale', ...cartelle, ...altri], { cwd: radice, stdio: ['pipe', 'pipe', 'pipe'] });
  figli.push(f);
  let out = '';
  f.stdout.on('data', (d) => { out += d; });
  f.stderr.on('data', (d) => { out += d; });
  const fine = new Promise((ok) => f.on('exit', (codice) => ok(codice)));
  return { f, testo: () => out, fine };
}
const attendi = async (cond, ms = 8000) => { const t = Date.now() + ms; while (Date.now() < t) { if (await cond()) return true; await new Promise((ok) => setTimeout(ok, 100)); } return false; };

test('un Mutant già acceso: il ping lo dice; senza finestra non si ferma; con --sostituisci si ferma e si riparte', { timeout: 30000 }, async () => {
  const porta = await portaLibera();
  assert.notEqual(porta, 3000);
  const primo = avvia(porta);
  assert.ok(await attendi(async () => (await chiOccupa(porta)).tipo === 'mutant'), primo.testo());
  const chi = await chiOccupa(porta);
  assert.equal(chi.pid, primo.f.pid);
  assert.match(chi.avviato, /^\d{4}-\d\d-\d\dT/);
  assert.ok(chi.versione);
  // senza un terminale per rispondere: si fa la domanda come avviso e si esce, il primo resta acceso
  const secondo = avvia(porta);
  assert.equal(await secondo.fine, 1);
  assert.match(secondo.testo(), /C'è già un Mutant acceso \(versione .+, avviato alle \d\d:\d\d\)\./);
  assert.equal((await chiOccupa(porta)).pid, primo.f.pid);
  // --sostituisci: il primo si ferma, il terzo prende la porta
  const terzo = avvia(porta, '--sostituisci');
  assert.ok(await attendi(async () => (await chiOccupa(porta)).pid === terzo.f.pid), terzo.testo());
  await primo.fine;
  assert.match(terzo.testo(), /Fermato\. Riparto/);
});

test('la porta occupata da un altro programma: lo si dice e non si tocca', { timeout: 20000 }, async () => {
  const altro = createServer((req, res) => { res.writeHead(404); res.end('niente'); });
  await new Promise((ok) => altro.listen(0, '127.0.0.1', ok));
  const porta = altro.address().port;
  try {
    assert.equal((await chiOccupa(porta)).tipo, 'altro');
    const tentativo = avvia(porta, '--sostituisci');
    assert.equal(await tentativo.fine, 1);
    assert.match(tentativo.testo(), /La porta \d+ è occupata da un altro programma/);
    assert.equal(altro.listening, true);
  } finally { altro.close(); }
});

test('una porta libera: nessuno', async () => {
  assert.deepEqual(await chiOccupa(await portaLibera()), { tipo: 'nessuno' });
});
