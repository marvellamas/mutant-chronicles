// Copia di fine sessione (tools/salva-sessione.mjs, salva-sessione.bat): archivio zip delle cartelle del server,
// mai sovrascritto; copia aggiuntiva e GitHub solo se configurati, senza errori se mancano.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync, crc32 } from 'node:zlib';
import { salvaSessione, nomeArchivio, leggiConfig, pushGithub } from '../tools/salva-sessione.mjs';

const radici = [];
after(() => radici.forEach((r) => rmSync(r, { recursive: true, force: true })));
const tmp = () => { const r = mkdtempSync(join(tmpdir(), 'mutant-salva-')); radici.push(r); return r; };

/** Lettore zip minimo per il test: { nome: testo } dalla directory centrale, con il controllo del CRC. */
function leggiZip(buf) {
  const fine = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const n = buf.readUInt16LE(fine + 10);
  let p = buf.readUInt32LE(fine + 16);
  const out = {};
  for (let i = 0; i < n; i++) {
    const crc = buf.readUInt32LE(p + 16);
    const comp = buf.readUInt32LE(p + 20);
    const lNome = buf.readUInt16LE(p + 28);
    const nome = buf.toString('utf8', p + 46, p + 46 + lNome);
    const loc = buf.readUInt32LE(p + 42);
    const inizio = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28);
    const dati = inflateRawSync(buf.subarray(inizio, inizio + comp));
    assert.equal(crc32(dati) >>> 0, crc, `CRC di ${nome}`);
    out[nome] = dati.toString('utf8');
    p += 46 + lNome + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return out;
}

const radiceDiProva = () => {
  const r = tmp();
  for (const [c, f, t] of [['personaggi', 'Lia_liv2_2026-10-06.json', '{"nome":"Lià"}'], ['veicoli', 'vei123.json', '{}'], ['scontri', 'scontro-1.json', '{}'], ['nemici', 'orco.json', '{}'], ['tavolo', 'sessione.json', '{"personaggi":[]}'], ['personaggi', 'LEGGIMI.txt', 'leggimi']]) {
    mkdirSync(join(r, c), { recursive: true });
    writeFileSync(join(r, c, f), t);
  }
  mkdirSync(join(r, 'src'));
  writeFileSync(join(r, 'src', 'app.js'), 'non va nello zip');
  return r;
};

test('archivio con data e ora, le cinque cartelle e nient’altro; contenuto integro', () => {
  const r = radiceDiProva();
  const adesso = new Date(2026, 9, 6, 23, 5);
  const esito = salvaSessione({ radice: r, adesso });
  assert.equal(nomeArchivio(adesso), 'sessione_2026-10-06_2305.zip');
  assert.ok(esito.archivio.endsWith(join('salvataggi', 'sessione_2026-10-06_2305.zip')));
  const z = leggiZip(readFileSync(esito.archivio));
  assert.deepEqual(Object.keys(z).sort(), ['nemici/orco.json', 'personaggi/LEGGIMI.txt', 'personaggi/Lia_liv2_2026-10-06.json', 'scontri/scontro-1.json', 'tavolo/sessione.json', 'veicoli/vei123.json']);
  assert.equal(z['personaggi/Lia_liv2_2026-10-06.json'], '{"nome":"Lià"}');
  // senza configurazione: niente copia aggiuntiva, niente GitHub, nessun errore
  assert.deepEqual(esito.copie, []);
  assert.equal(esito.github.fatto, false);
  assert.match(esito.messaggi.join(' '), /non configurata: saltata/);
});

test('mai sovrascrivere: due copie nello stesso minuto; la copia aggiuntiva va nella cartella configurata', () => {
  const r = radiceDiProva();
  const drive = tmp();
  const adesso = new Date(2026, 9, 6, 23, 5);
  const a = salvaSessione({ radice: r, adesso, config: { copia_in: drive } });
  writeFileSync(join(r, 'personaggi', 'Lia_liv2_2026-10-06.json'), '{"nome":"Lia","pv":3}');
  const b = salvaSessione({ radice: r, adesso, config: { copia_in: drive } });
  assert.deepEqual(readdirSync(join(r, 'salvataggi')).sort(), ['sessione_2026-10-06_2305.zip', 'sessione_2026-10-06_2305_2.zip']);
  assert.deepEqual(readdirSync(drive).sort(), ['sessione_2026-10-06_2305.zip', 'sessione_2026-10-06_2305_2.zip']);
  assert.equal(leggiZip(readFileSync(a.archivio))['personaggi/Lia_liv2_2026-10-06.json'], '{"nome":"Lià"}');
  assert.equal(leggiZip(readFileSync(b.archivio))['personaggi/Lia_liv2_2026-10-06.json'], '{"nome":"Lia","pv":3}');
  // cartella aggiuntiva che non esiste: messaggio, l'archivio c'è comunque
  const c = salvaSessione({ radice: r, adesso: new Date(2026, 9, 6, 23, 6), config: { copia_in: join(drive, 'non-esiste') } });
  assert.match(c.messaggi.join(' '), /non riuscita: la cartella .* non esiste/);
});

test('GitHub: senza clone salta con un messaggio; configurazione non valida: errore leggibile', () => {
  const r = radiceDiProva();
  const esito = pushGithub(join(r, 'x.zip'), { cartella: tmp() });
  assert.equal(esito.fatto, false);
  assert.match(esito.messaggio, /non è un clone git/);
  assert.deepEqual(leggiConfig(join(r, 'manca.json')), {});
  writeFileSync(join(r, 'rotto.json'), '{ copia_in: ');
  assert.throws(() => leggiConfig(join(r, 'rotto.json')), /non è un JSON valido/);
});
