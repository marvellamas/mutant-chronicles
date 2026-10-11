// «Modifica master»: chi è il PC del master (13/10/2026, segnalazione urgente di Marcello: i pulsanti non si vedevano).
// Il server riconosce il PC del master dall'indirizzo di chi chiede, come «Spegni Mutant»; l'app lo dice sempre, invece
// di nascondere i pulsanti in silenzio.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { creaServer, daQuestoPc } from '../server.mjs';

const RETE = { Ethernet: [{ address: '192.168.1.57', family: 'IPv4', internal: false }, { address: 'fe80::dbbc:6fc2:3e8c:ef71', family: 'IPv6', internal: false }], Loopback: [{ address: '127.0.0.1', family: 'IPv4', internal: true }] };

test('è il PC del master: localhost, 127.0.0.1, ::1 e gli indirizzi di rete di questo computer', () => {
  for (const a of ['127.0.0.1', '127.0.0.53', '::1', '0:0:0:0:0:0:0:1', '::ffff:127.0.0.1', '[::1]']) assert.equal(daQuestoPc(a, RETE), true, a);
  // il master che apre Mutant con l'indirizzo di rete del suo PC (http://192.168.x.x:3000)
  assert.equal(daQuestoPc('192.168.1.57', RETE), true);
  assert.equal(daQuestoPc('::ffff:192.168.1.57', RETE), true, 'IPv4 dentro IPv6');
  // IPv6 locale, con e senza la zona (Windows scrive fe80::…%Ethernet) e con le maiuscole
  assert.equal(daQuestoPc('fe80::dbbc:6fc2:3e8c:ef71', RETE), true);
  assert.equal(daQuestoPc('fe80::dbbc:6fc2:3e8c:ef71%Ethernet', RETE), true);
  assert.equal(daQuestoPc('FE80::DBBC:6FC2:3E8C:EF71', RETE), true);
});

test('non è il PC del master: un altro dispositivo della rete, o nessun indirizzo', () => {
  for (const a of ['192.168.1.99', '10.0.0.4', '::ffff:192.168.1.99', 'fe80::1111:2222:3333:4444', '', null, undefined]) assert.equal(daQuestoPc(a, RETE), false, String(a));
});

let server;
let porta;
const cartella = mkdtempSync(join(tmpdir(), 'mutant-master-contesto-'));
before(async () => {
  server = creaServer({ cartella });
  await new Promise((ok) => server.listen(0, '0.0.0.0', ok));
  porta = server.address().port;
});
after(() => { server.close(); rmSync(cartella, { recursive: true, force: true }); });

test('/api/ping dice «master» sia da localhost sia dall’indirizzo di rete dello stesso PC', async () => {
  const ping = async (host) => (await (await fetch(`http://${host.includes(':') ? `[${host}]` : host}:${porta}/api/ping`)).json());
  for (const host of ['localhost', '127.0.0.1']) assert.equal((await ping(host)).master, true, host);
  // l'indirizzo di rete di questo computer, se c'è (sui runner senza rete il caso resta scoperto)
  const mio = Object.values(networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  if (mio) assert.equal((await ping(mio)).master, true, mio);
  // un altro dispositivo: il server lo tratta da tablet (qui si prova la funzione, non si può fingere l'indirizzo)
  assert.equal(daQuestoPc('192.168.1.99', RETE), false);
});
