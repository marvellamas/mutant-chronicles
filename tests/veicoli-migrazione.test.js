// Migrazione dei veicoli nel registro anche senza aprire la tab Veicoli (difetto del collaudo del 05/10/2026, A.91):
// all'avvio del server, quando la plancia legge o cambia chi è al tavolo, quando si legge il file di un PG.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { normalizza, serializza, nomeFileEsportazione } from '../src/character.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const radici = [];
after(() => radici.forEach((r) => rmSync(r, { recursive: true, force: true })));
const cartelle = () => {
  const r = mkdtempSync(join(tmpdir(), 'mutant-migrazione-'));
  radici.push(r);
  const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli'].map((k) => [k, join(r, k)]));
  Object.values(c).forEach((d) => mkdirSync(d, { recursive: true }));
  return c;
};
// lo Scout di Pablo come è salvato nel file (lotto 3: NEC di prima, veicolo del gruppo)
const scoutLocale = { uid: 'veimuu14mqa0', profilo: 'asa-scout-mk4', nome: 'ASA Scout MK4', gruppo: true, conducente: false, andatura: 'fermo',
  pi: { corpo: 60, propulsione: 36, motore: 24 }, rinforzi: { copriruote: { montati: [3, 3, 3, 3], ricambi: [3, 3] } }, nec: { lx: 100000 } };
const scriviPg = (dir, nome, veicoli) => {
  const { scelte } = normalizza({ ...copia(MISHIMA_AGENTE), nome }, dati);
  const testo = JSON.parse(serializza(scelte, { pg: `pg-${nome.toLowerCase().replace(/\W/g, '')}` }));
  testo.scelte.veicoli = veicoli; // com'è nel file, senza normalizzare
  const file = nomeFileEsportazione(nome, 1, new Date(2026, 9, 4));
  writeFileSync(join(dir, file), JSON.stringify(testo, null, 2));
  return file;
};
const avvia = async (c) => {
  const s = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli });
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
  return { s, base: `http://127.0.0.1:${s.address().port}`, esito: await s.migrazione };
};
const veicoliNelFile = (c, file) => JSON.parse(readFileSync(join(c.personaggi, file), 'utf8')).scelte.veicoli;

test('avvio del server: record creato e riferimento nel file; nessun doppione al secondo avvio', async () => {
  const c = cartelle();
  const file = scriviPg(c.personaggi, 'Pablo Zaion', [scoutLocale]);
  const a = await avvia(c);
  a.s.close();
  assert.deepEqual(a.esito.record, ['veimuu14mqa0']);
  assert.deepEqual(readdirSync(c.veicoli), ['veimuu14mqa0.json']);
  const rec = JSON.parse(readFileSync(join(c.veicoli, 'veimuu14mqa0.json'), 'utf8'));
  assert.equal(rec.revisione, 1);
  assert.deepEqual(rec.proprietario, { tipo: 'gruppo' });
  assert.deepEqual(rec.mezzo.pi, scoutLocale.pi);
  assert.equal(rec.mezzo.energia.rosso.reduce((x, y) => x + y, 0), 100000); // NEC di prima normalizzato
  assert.deepEqual(veicoliNelFile(c, file), [{ uid: 'veimuu14mqa0', rif: 'veimuu14mqa0', nome: 'ASA Scout MK4' }]);
  const b = await avvia(c);
  b.s.close();
  assert.deepEqual(b.esito.record, []);
  assert.deepEqual(readdirSync(c.veicoli), ['veimuu14mqa0.json']);
  assert.equal(JSON.parse(readFileSync(join(c.veicoli, 'veimuu14mqa0.json'), 'utf8')).revisione, 1);
});

test('plancia: il veicolo di un PG al tavolo è nel registro senza che nessuno apra la scheda', async () => {
  const c = cartelle();
  const a = await avvia(c);
  try {
    // il file arriva dopo l'avvio (copiato a mano o salvato da un'altra app)
    const file = scriviPg(c.personaggi, 'Pablo Zaion', [scoutLocale]);
    await fetch(`${a.base}/api/tavolo`, { method: 'PUT', body: JSON.stringify({ personaggi: ['Pablo-Zaion'] }), headers: { 'Content-Type': 'application/json' } });
    const lista = await (await fetch(`${a.base}/api/veicoli`)).json();
    assert.deepEqual(lista.map((x) => x.id), ['veimuu14mqa0']);
    assert.ok(veicoliNelFile(c, file)[0].rif);
  } finally { a.s.close(); }
});

test('lo stesso veicolo del gruppo in due file: avviso, nessuna unione; la scheda aperta riceve il 409', async () => {
  const c = cartelle();
  const a = await avvia(c);
  try {
    const pablo = scriviPg(c.personaggi, 'Pablo Zaion', [scoutLocale]);
    const altro = scriviPg(c.personaggi, 'Lia', [{ ...scoutLocale, uid: 'veialtro01' }]);
    // la scheda di Pablo è aperta: conosce il file com'era prima della migrazione
    const mtimeVecchio = String(statSync(join(c.personaggi, pablo)).mtimeMs);
    const tavolo = (personaggi) => fetch(`${a.base}/api/tavolo`, { method: 'PUT', body: JSON.stringify({ personaggi }), headers: { 'Content-Type': 'application/json' } });
    await tavolo(['Pablo-Zaion']);
    await tavolo(['Pablo-Zaion', 'Lia']);
    assert.deepEqual(readdirSync(c.veicoli), ['veimuu14mqa0.json']);
    // per Lia è un doppione del gruppo (stesso profilo): resta locale, niente unione
    const v = veicoliNelFile(c, altro);
    assert.deepEqual([v.length, v[0].uid, v[0].rif], [1, 'veialtro01', undefined]);
    // la scheda aperta salva con la revisione di prima: 409, rilegge (il server non le passa sopra)
    const r = await fetch(`${a.base}/api/personaggi/${pablo}`, { method: 'PUT', body: readFileSync(join(c.personaggi, pablo)), headers: { 'X-Mutant-Mtime': mtimeVecchio } });
    assert.equal(r.status, 409);
  } finally { a.s.close(); }
});
