// Codice QR in locale (src/qr.js) e indirizzi per i giocatori (src/rete.js), con interfacce di rete finte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoRS, bitFormato, codeword, matriceQR, svgQR } from '../src/qr.js';
import { indirizziRete, testoAvvio, eVirtuale } from '../src/rete.js';

test('Reed–Solomon: l’esempio classico «HELLO WORLD» 1-M (16 codeword di dati → 10 di correzione)', () => {
  const dati = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(restoRS(dati, 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

test('informazioni di formato: valori dello standard', () => {
  assert.equal(bitFormato(0, 0), 0b101010000010010); // M, maschera 0
  assert.equal(bitFormato(0, 1), 0b111011111000100); // L, maschera 0
  assert.equal(bitFormato(0, 3), 0b011010101011111); // Q, maschera 0
  assert.equal(bitFormato(0, 2), 0b001011010001001); // H, maschera 0
});

// decodifica di controllo: formato, maschera, lettura a zig-zag, blocchi, Reed–Solomon, testo
const ECC = [0, 10, 16, 26, 18, 24, 16];
const BLOCCHI = [0, 1, 1, 1, 2, 2, 4];
const MASCHERE = [
  (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];
function decodifica(m) {
  const n = m.length;
  const v = (n - 17) / 4;
  // formato, prima copia: (8,0..5), (8,7), (8,8), (7,8), (5..0,8)
  const pos = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
  const bits = pos.reduce((a, [x, y], i) => a | ((m[y][x] ? 1 : 0) << i), 0);
  const maschera = [0, 1, 2, 3, 4, 5, 6, 7].find((k) => bitFormato(k) === bits);
  assert.notEqual(maschera, undefined, 'formato non riconosciuto');
  // seconda copia uguale
  const pos2 = [...Array.from({ length: 8 }, (_, i) => [n - 1 - i, 8]), ...Array.from({ length: 7 }, (_, i) => [8, n - 7 + i])];
  assert.equal(pos2.reduce((a, [x, y], i) => a | ((m[y][x] ? 1 : 0) << i), 0), bits, 'seconda copia del formato');
  assert.equal(m[n - 8][8], true, 'modulo scuro');
  // moduli fissi
  const fisso = Array.from({ length: n }, () => new Array(n).fill(false));
  const segna = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < n && y < n) fisso[y][x] = true; };
  segna(0, 0, 9, 9); segna(n - 8, 0, 8, 9); segna(0, n - 8, 9, 8); segna(6, 0, 1, n); segna(0, 6, n, 1);
  const al = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]][v];
  for (const ax of al) for (const ay of al) if (!fisso[ay][ax]) segna(ax - 2, ay - 2, 5, 5);
  const letti = [];
  for (let d = n - 1; d >= 1; d -= 2) {
    if (d === 6) d = 5;
    for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) {
      const x = d - j; const y = ((d + 1) & 2) === 0 ? n - 1 - k : k;
      if (!fisso[y][x]) letti.push(m[y][x] !== MASCHERE[maschera](x, y) ? 1 : 0);
    }
  }
  const cw = [];
  for (let i = 0; i + 8 <= letti.length; i += 8) cw.push(letti.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  const nb = BLOCCHI[v];
  const totDati = cw.length - ECC[v] * nb;
  const lung = totDati / nb;
  const blocchi = Array.from({ length: nb }, () => []);
  for (let i = 0; i < lung; i++) for (let b = 0; b < nb; b++) blocchi[b].push(cw[i * nb + b]);
  const ecc = Array.from({ length: nb }, () => []);
  for (let i = 0; i < ECC[v]; i++) for (let b = 0; b < nb; b++) ecc[b].push(cw[totDati + i * nb + b]);
  blocchi.forEach((b, i) => assert.deepEqual(restoRS(b, ECC[v]), ecc[i], `Reed–Solomon del blocco ${i + 1}`));
  const dati = blocchi.flat();
  const bitDati = dati.flatMap((b) => Array.from({ length: 8 }, (_, i) => (b >>> (7 - i)) & 1));
  const leggi = (da, k) => bitDati.slice(da, da + k).reduce((a, b) => (a << 1) | b, 0);
  assert.equal(leggi(0, 4), 0b0100, 'modalità byte');
  const lunghezza = leggi(4, 8);
  const byte = Array.from({ length: lunghezza }, (_, i) => leggi(12 + i * 8, 8));
  return { testo: new TextDecoder().decode(new Uint8Array(byte)), versione: v, maschera };
}

test('codice QR: si rilegge uguale, con la versione giusta, per indirizzi di lunghezze diverse', () => {
  for (const [testo, versione] of [['http://192.168.1.23:3000', 2], ['http://10.0.0.5:3000', 2], ['http://192.168.178.100:3000/#/scheda', 3], ['A', 1], ['x'.repeat(60), 4], ['x'.repeat(70), 5], ['é'.repeat(50), 6]]) {
    const q = matriceQR(testo);
    assert.equal(q.versione, versione, testo);
    assert.equal(q.moduli.length, versione * 4 + 17);
    const r = decodifica(q.moduli);
    assert.deepEqual([r.testo, r.versione, r.maschera], [testo, versione, q.maschera], testo);
  }
  assert.throws(() => codeword('x'.repeat(200)), /troppo lungo/);
  const svg = svgQR('http://192.168.1.23:3000');
  assert.match(svg, /^<svg [^>]*viewBox="0 0 33 33"[^>]*aria-label="Codice QR: http:\/\/192\.168\.1\.23:3000"/);
});

// interfacce di rete finte, nel formato di os.networkInterfaces()
const ip = (address, extra = {}) => ({ address, family: 'IPv4', internal: false, ...extra });
test('indirizzi per i giocatori: IPv4 della rete locale, virtuali esclusi, nel dubbio tutti con il nome', () => {
  const casa = {
    'Loopback Pseudo-Interface 1': [ip('127.0.0.1', { internal: true })],
    'Wi-Fi': [ip('192.168.1.23'), { address: 'fe80::1', family: 'IPv6', internal: false }],
    'vEthernet (WSL)': [ip('172.24.80.1')],
    'VirtualBox Host-Only Network': [ip('192.168.56.1')],
    'Ethernet 2': [ip('169.254.10.4')],
    'Tailscale': [ip('100.101.1.2', { family: 4 })],
  };
  const r = indirizziRete(casa, 3000);
  assert.deepEqual(r.indirizzi.map((v) => [v.nome, v.url]), [['Wi-Fi', 'http://192.168.1.23:3000']]);
  assert.deepEqual(r.altri.map((v) => v.nome), ['vEthernet (WSL)', 'VirtualBox Host-Only Network', 'Tailscale']);
  assert.equal(r.tuttiPerDubbio, false);
  // due reti vere: entrambe, con il nome
  const due = indirizziRete({ 'Wi-Fi': [ip('192.168.1.23')], Ethernet: [ip('10.0.0.7')] }, 3017);
  assert.deepEqual(due.indirizzi.map((v) => v.url), ['http://192.168.1.23:3017', 'http://10.0.0.7:3017']);
  // solo interfacce dal nome sospetto: nel dubbio tutte
  const dubbio = indirizziRete({ 'vEthernet (Default Switch)': [ip('172.20.0.1')], 'OpenVPN TAP': [ip('10.8.0.2')] }, 3000);
  assert.deepEqual([dubbio.indirizzi.length, dubbio.tuttiPerDubbio], [2, true]);
  assert.deepEqual(indirizziRete({}, 3000).indirizzi, []);
  assert.equal(eVirtuale('Wi-Fi'), false);
  assert.equal(eVirtuale('VMware Network Adapter VMnet8'), true);
});

test('finestra del server: la frase per i giocatori, il firewall, cosa fare se non si collegano', () => {
  const t = testoAvvio(indirizziRete({ 'Wi-Fi': [ip('192.168.1.23')], 'vEthernet (WSL)': [ip('172.24.80.1')] }, 3000), 3000);
  assert.match(t, /Giocatori: aprite http:\/\/192\.168\.1\.23:3000 dalla stessa rete Wi-Fi\n/);
  assert.match(t, /Reti virtuali escluse: 172\.24\.80\.1 \(vEthernet \(WSL\)\)/);
  assert.match(t, /consenti l'accesso alle «reti private»/);
  assert.match(t, /deve essere «privata», non «pubblica»/);
  const dubbio = testoAvvio(indirizziRete({ 'vEthernet (A)': [ip('172.20.0.1')], 'TAP-x': [ip('10.8.0.2')] }, 3000), 3000);
  assert.match(dubbio, /aprite http:\/\/172\.20\.0\.1:3000 dalla stessa rete Wi-Fi {3}\(vEthernet \(A\)\)/);
  assert.match(testoAvvio(indirizziRete({}, 3000), 3000), /Nessuna rete trovata/);
});
