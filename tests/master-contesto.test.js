// «Modifica master»: chi è il PC del master (13/10/2026, segnalazione urgente di Marcello: i pulsanti non si vedevano).
// Il server riconosce il PC del master dall'indirizzo di chi chiede, come «Spegni Mutant»; l'app lo dice sempre, invece
// di nascondere i pulsanti in silenzio.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { creaServer, daQuestoPc } from '../server.mjs';
import { statoContestoMaster, RIGA_CARTA_NON_MASTER } from '../src/correzioni-master.js';

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

// ---------------------------------------------------------------------------
// La riga di stato nel Tavolo: mai pulsanti spariti in silenzio

test('riga di stato: «Questo PC è il master», oppure il motivo e che cosa fare', () => {
  const m = statoContestoMaster({ server: true, daQuestoPc: true, pingMaster: true });
  assert.deepEqual([m.master, m.stato, m.testo, m.motivo], [true, 'master', 'Questo PC è il master', null]);
  // un altro dispositivo (tablet, o il PC sbagliato)
  const t = statoContestoMaster({ server: true, daQuestoPc: false, pingMaster: false });
  assert.equal(t.master, false);
  assert.equal(t.stato, 'altro_dispositivo');
  assert.match(t.testo, /^Questo dispositivo non è il PC del master: Modifica master e bonus di circostanza si usano dal PC dove gira Mutant$/);
  assert.match(t.motivo, /non riconosce questo dispositivo/);
  assert.match(t.cosaFare, /PC dove gira Mutant/);
  // server acceso prima dell'aggiornamento: non sa ancora dirlo
  const v = statoContestoMaster({ server: true, daQuestoPc: false, pingMaster: undefined });
  assert.equal(v.stato, 'server_vecchio');
  assert.match(v.motivo, /acceso da prima dell’aggiornamento/);
  assert.match(v.cosaFare, /avvia-server\.bat/);
  assert.match(v.cosaFare, /Ctrl\+F5/);
  // versione senza server
  const s = statoContestoMaster({ server: false });
  assert.equal(s.stato, 'senza_server');
  assert.match(s.motivo, /senza server/);
  assert.match(s.cosaFare, /avvia-server\.bat/);
  // ogni caso che non è master ha sempre motivo e rimedio
  for (const x of [t, v, s]) assert.ok(x.motivo && x.cosaFare, x.stato);
});

test('riga di stato: nel Tavolo c’è sempre; senza master, nella carta del PG il testo al posto dei pulsanti', () => {
  const tavolo = readFileSync(new URL('../src/ui/tavolo.js', import.meta.url), 'utf8');
  assert.match(tavolo, /ctx\.inMappa \? null : rigaStatoMaster\(\)/);
  assert.match(tavolo, /🛠 Questo PC è il master/);
  assert.match(tavolo, /ctx\.master !== true \? h\('p', \{ class: 'plancia-master nota non-master'[^}]*\}, RIGA_CARTA_NON_MASTER\)/);
  assert.equal(RIGA_CARTA_NON_MASTER, 'Modifica master: dal PC del master');
  // app.js passa lo stato al Tavolo, con quello che ha risposto il ping
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /stato\.statoMaster = statoContestoMaster\(\{ server: stato\.cartella, daQuestoPc: stato\.master, pingMaster: pingMasterQui\(\)/);
  assert.match(app, /statoMaster: stato\.statoMaster/);
  // il client distingue «il server non lo dice» da «ha detto no»
  const cartella = readFileSync(new URL('../src/ui/cartella.js', import.meta.url), 'utf8');
  assert.match(cartella, /pingMaster = disponibile \? j\.master : undefined;/);
  assert.match(cartella, /export const pingMasterQui = \(\) => pingMaster;/);
});
