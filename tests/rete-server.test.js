// Il server del Tavolo del Master ascolta su tutte le interfacce: risponde anche su un indirizzo della rete
// locale (non 127.0.0.1), e /api/rete dà gli indirizzi per i giocatori. Cartelle temporanee, porta qualsiasi.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, networkInterfaces } from 'node:os';
import { creaServer } from '../server.mjs';
import { indirizziRete } from '../src/rete.js';

const cartelle = ['personaggi', 'tavolo', 'scontri', 'nemici'].map((n) => mkdtempSync(join(tmpdir(), `mutant-rete-${n}-`)));
let server;
let porta;
before(async () => {
  const [cartella, tavolo, scontri, nemici] = cartelle;
  server = creaServer({ cartella, tavolo, scontri, nemici });
  await new Promise((ok) => server.listen(0, '0.0.0.0', ok));
  porta = server.address().port;
});
after(() => { server.close(); for (const d of cartelle) rmSync(d, { recursive: true, force: true }); });

test('server: risponde su un indirizzo della rete locale e /api/rete elenca gli indirizzi per i giocatori', async (t) => {
  const r = await (await fetch(`http://127.0.0.1:${porta}/api/rete`)).json();
  assert.equal(r.porta, porta);
  assert.equal(r.soloLocale, false);
  assert.deepEqual(r.indirizzi.map((v) => v.url), indirizziRete(networkInterfaces(), porta).indirizzi.map((v) => v.url));
  const fuori = r.indirizzi[0];
  if (!fuori) { t.skip('questo computer non ha un indirizzo IPv4 di rete'); return; }
  assert.doesNotMatch(fuori.indirizzo, /^127\./);
  const v = await fetch(`${fuori.url}/versione.json`);
  assert.equal(v.status, 200);
  assert.equal(v.headers.get('x-mutant-server'), '1');
});
