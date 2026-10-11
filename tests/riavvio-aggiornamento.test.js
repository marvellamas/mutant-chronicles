// Dopo l'aggiornamento il server riparte da solo (13/10/2026): il prompt 76 è nato perché il server era rimasto acceso
// con il codice vecchio dopo aggiorna.bat. La decisione («serve riavviare?») è una funzione pura; la prova vera, con un
// server di prova acceso e spento, è nel riepilogo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveRiavvio, statoPrimaDelRiavvio, versioneDeiFile, testoRiavvioNonRiuscito, attendiAcceso, riavviaDopoAggiornamento } from '../tools/riavvia.mjs';

const VERSIONE = 'aaaa111122';

test('serve riavviare? solo con il server acceso di Mutant e una versione diversa da quella dei file', () => {
  // acceso con il codice di prima: si riavvia
  const da = serveRiavvio({ acceso: true, mutant: true, versione: 'vecchia' }, VERSIONE);
  assert.equal(da.riavvia, true);
  assert.equal(da.stato, 'da_riavviare');
  assert.match(da.testo, /spengo \(salvando\) e lo riaccendo/);
  // server di prima del 06/10, che non dice la sua versione: nel dubbio si riavvia
  assert.equal(serveRiavvio({ acceso: true, mutant: true, versione: null }, VERSIONE).riavvia, true);
  // niente è cambiato: non si riavvia
  const uguale = serveRiavvio({ acceso: true, mutant: true, versione: VERSIONE }, VERSIONE);
  assert.equal(uguale.riavvia, false);
  assert.equal(uguale.stato, 'gia_aggiornato');
  assert.match(uguale.testo, /resta acceso, non lo riavvio/);
  // spento: si lascia spento e lo si dice
  const spento = serveRiavvio({ acceso: false, mutant: false, versione: null }, VERSIONE);
  assert.equal(spento.riavvia, false);
  assert.equal(spento.stato, 'spento');
  assert.match(spento.testo, /avvialo con la voce 1/);
  // sulla porta risponde un altro programma: non si tocca
  const altro = serveRiavvio({ acceso: true, mutant: false, versione: null }, VERSIONE);
  assert.deepEqual([altro.riavvia, altro.stato], [false, 'altro_programma']);
  // senza versione.json leggibile non si indovina: si riavvia (meglio riavviare che restare col codice vecchio)
  assert.equal(serveRiavvio({ acceso: true, mutant: true, versione: VERSIONE }, null).riavvia, true);
});

test('stato del server prima del riavvio: acceso, di Mutant, e con quale versione è partito', async () => {
  const ping = (corpo) => async () => ({ json: async () => corpo });
  assert.deepEqual(await statoPrimaDelRiavvio(3000, { fetchFn: ping({ ok: true, app: 'mutant', versione: VERSIONE }) }), { acceso: true, mutant: true, versione: VERSIONE });
  assert.deepEqual(await statoPrimaDelRiavvio(3000, { fetchFn: ping({ ok: true, app: 'mutant' }) }), { acceso: true, mutant: true, versione: null }, 'server di prima del 06/10');
  assert.deepEqual(await statoPrimaDelRiavvio(3000, { fetchFn: ping({ altro: true }) }), { acceso: true, mutant: false, versione: null });
  assert.deepEqual(await statoPrimaDelRiavvio(3000, { fetchFn: async () => { throw new Error('ECONNREFUSED'); } }), { acceso: false, mutant: false, versione: null });
});

test('versione dei file: quella di versione.json dopo l’aggiornamento', () => {
  const d = mkdtempSync(join(tmpdir(), 'mutant-riavvio-'));
  writeFileSync(join(d, 'versione.json'), JSON.stringify({ versione: VERSIONE, data: '2026-10-13 10:00' }));
  assert.equal(versioneDeiFile(d), VERSIONE);
  writeFileSync(join(d, 'versione.json'), 'non json');
  assert.equal(versioneDeiFile(d), null);
  rmSync(d, { recursive: true, force: true });
  // quella vera del repo
  assert.equal(versioneDeiFile(new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), JSON.parse(readFileSync(new URL('../versione.json', import.meta.url), 'utf8')).versione);
});

test('riavvio non riuscito: messaggio con che cosa fare e riga in avvisi/registro.txt', async () => {
  assert.match(testoRiavvioNonRiuscito('non si è spento'), /Chiudi la finestra nera di Mutant e riaprilo/);
  assert.match(testoRiavvioNonRiuscito(null), /^Aggiornato, ma non sono riuscito a riavviare Mutant\./);
  // il server non si spegne: niente avvio, messaggio e registro
  const d = mkdtempSync(join(tmpdir(), 'mutant-riavvio-'));
  mkdirSync(join(d, 'avvisi'), { recursive: true });
  writeFileSync(join(d, 'versione.json'), JSON.stringify({ versione: VERSIONE }));
  const righe = [];
  let avviato = false;
  const esito = await riavviaDopoAggiornamento({
    radice: d, porta: 3999, scrivi: (t) => righe.push(t),
    fetchFn: async (url) => (String(url).includes('/api/spegni') ? { ok: false, status: 403, json: async () => ({ errore: 'solo dal PC del server' }) } : { json: async () => ({ ok: true, app: 'mutant', versione: 'vecchia' }) }),
    spawnFn: () => { avviato = true; return { unref() {} }; },
  });
  assert.equal(esito.riavviato, false);
  assert.equal(avviato, false, 'non si riaccende se non si è spento');
  assert.match(esito.testo, /Chiudi la finestra nera/);
  const registro = readFileSync(join(d, 'avvisi', 'registro.txt'), 'utf8');
  assert.match(registro, /riavvio/);
  assert.match(registro, /solo dal PC del server/);
  rmSync(d, { recursive: true, force: true });
});

test('riavvio riuscito: spegne, riaccende con avvia-server.bat e aspetta che risponda', async () => {
  const d = mkdtempSync(join(tmpdir(), 'mutant-riavvio-'));
  writeFileSync(join(d, 'versione.json'), JSON.stringify({ versione: VERSIONE }));
  writeFileSync(join(d, 'avvia-server.bat'), '@echo off\n');
  const righe = [];
  let acceso = true;
  let versione = 'vecchia';
  let comando = null;
  const esito = await riavviaDopoAggiornamento({
    radice: d, porta: 3999, scrivi: (t) => righe.push(t), passoMs: 1, attesaMs: 1000,
    fetchFn: async (url) => {
      if (String(url).includes('/api/spegni')) { acceso = false; return { ok: true, json: async () => ({ spento: true }) }; }
      if (!acceso) throw new Error('ECONNREFUSED');
      return { json: async () => ({ ok: true, app: 'mutant', versione }) };
    },
    spawnFn: (cmd, args) => { comando = args; acceso = true; versione = VERSIONE; return { unref() {} }; },
  });
  assert.equal(esito.riavviato, true);
  assert.equal(esito.versione, VERSIONE, 'il server risponde con la versione nuova');
  assert.ok(comando.some((x) => String(x).endsWith('avvia-server.bat')), 'riaperto come sempre, nella sua finestra');
  assert.ok(comando.includes('start'), 'in una finestra nuova, come il doppio clic');
  assert.match(esito.testo, /la pagina si apre da sola/);
  assert.match(esito.testo, /È disponibile la versione nuova: ricarica|E’ disponibile la versione nuova: ricarica/u);
  // manca avvia-server.bat: lo dice invece di fallire in silenzio
  rmSync(join(d, 'avvia-server.bat'));
  acceso = true; versione = 'vecchia';
  const senza = await riavviaDopoAggiornamento({
    radice: d, porta: 3999, scrivi: () => {}, passoMs: 1, attesaMs: 50,
    fetchFn: async (url) => { if (String(url).includes('/api/spegni')) { acceso = false; return { ok: true, json: async () => ({}) }; } if (!acceso) throw new Error('giù'); return { json: async () => ({ ok: true, app: 'mutant', versione }) }; },
    spawnFn: () => { throw new Error('non chiamato'); },
  });
  assert.equal(senza.riavviato, false);
  assert.match(senza.motivo, /manca avvia-server\.bat/);
  rmSync(d, { recursive: true, force: true });
});

test('niente è cambiato: nessuno spegnimento, nessun riavvio, il server resta acceso', async () => {
  const d = mkdtempSync(join(tmpdir(), 'mutant-riavvio-'));
  writeFileSync(join(d, 'versione.json'), JSON.stringify({ versione: VERSIONE }));
  let spegnimenti = 0;
  let avvii = 0;
  const esito = await riavviaDopoAggiornamento({
    radice: d, porta: 3999, scrivi: () => {},
    fetchFn: async (url) => { if (String(url).includes('/api/spegni')) { spegnimenti += 1; return { ok: true, json: async () => ({}) }; } return { json: async () => ({ ok: true, app: 'mutant', versione: VERSIONE }) }; },
    spawnFn: () => { avvii += 1; return { unref() {} }; },
  });
  assert.deepEqual([esito.stato, esito.riavviato, spegnimenti, avvii], ['gia_aggiornato', false, 0, 0]);
  rmSync(d, { recursive: true, force: true });
});

test('server spento: non si accende da solo, e si dice come avviarlo', async () => {
  const d = mkdtempSync(join(tmpdir(), 'mutant-riavvio-'));
  writeFileSync(join(d, 'versione.json'), JSON.stringify({ versione: VERSIONE }));
  let avvii = 0;
  const righe = [];
  const esito = await riavviaDopoAggiornamento({
    radice: d, porta: 3999, scrivi: (t) => righe.push(t),
    fetchFn: async () => { throw new Error('ECONNREFUSED'); },
    spawnFn: () => { avvii += 1; return { unref() {} }; },
  });
  assert.deepEqual([esito.stato, esito.riavviato, avvii], ['spento', false, 0]);
  assert.match(righe.join(' '), /avvialo con la voce 1/);
  rmSync(d, { recursive: true, force: true });
});

test('attendiAcceso: aspetta finché il server risponde, poi si ferma', async () => {
  let giri = 0;
  const s = await attendiAcceso(3999, {
    attesaMs: 1000, passoMs: 1, dormi: async () => {},
    fetchFn: async () => { giri += 1; if (giri < 3) throw new Error('giù'); return { json: async () => ({ ok: true, app: 'mutant', versione: VERSIONE }) }; },
  });
  assert.equal(s.versione, VERSIONE);
  assert.equal(giri, 3);
  // se non risponde mai, dopo l'attesa si arrende
  let t = 0;
  assert.equal(await attendiAcceso(3999, { attesaMs: 100, passoMs: 10, adesso: () => (t += 30), dormi: async () => {}, fetchFn: async () => { throw new Error('giù'); } }), null);
});

// ---------------------------------------------------------------------------
// I .bat chiamano lo strumento

test('aggiorna.bat, la console e l’aggiornamento da zip riavviano il server alla fine', () => {
  const agg = readFileSync(new URL('../aggiorna.bat', import.meta.url), 'latin1');
  assert.match(agg, /node tools\\riavvia\.mjs/, 'aggiorna.bat riavvia');
  // la chiamata sta dopo il pull (il file si aggiorna mentre gira: sopra il pull non si tocca)
  assert.ok(agg.indexOf('git pull') < agg.indexOf('node tools\\riavvia.mjs'));
  // il vecchio messaggio «chiudi la finestra nera e riaccendila» non c'è più
  assert.doesNotMatch(agg, /se il server era gia' acceso, chiudi la sua finestra nera/);
  const zip = readFileSync(new URL('../distribuzione/1_scarica_o_aggiorna_app.bat', import.meta.url), 'latin1');
  assert.match(zip, /riavvia\.mjs/, 'anche l’aggiornamento da zip');
});
