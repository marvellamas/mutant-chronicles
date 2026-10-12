// «Non trovo personaggi in questa cartella» (12/10/2026, docs/diagnosi-dati-spariti-2026-10-12.md):
// all'avvio, con personaggi/ vuota e dei salvataggi disponibili, lo dicono la finestra nera, la console e il
// Tavolo, con il percorso della cartella in uso ben visibile.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { avvisoCartellaVuota, elencoSalvataggi, postiSalvataggi, rigaSalvataggio, TIPI } from '../tools/ripristina.mjs';
import { righeCartellaVuota } from '../tools/console.mjs';
import { testoCartellaVuota, quando, leggiAvvioVuoto } from '../src/ui/cartella-vuota.js';
import { creaServer } from '../server.mjs';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const radici = [];
after(() => radici.forEach((r) => rmSync(r, { recursive: true, force: true })));
const tmp = () => { const r = mkdtempSync(join(tmpdir(), 'mutant-vuota-')); radici.push(r); return r; };

/** Un'installazione con i salvataggi nei quattro posti e la cartella dei personaggi vuota. */
function conSalvataggi(r, { personaggi = 0 } = {}) {
  for (const c of ['personaggi', 'salvataggi', 'autosave', 'backup-prima-aggiornamento', 'drive']) mkdirSync(join(r, c), { recursive: true });
  writeFileSync(join(r, 'personaggi', 'LEGGIMI.txt'), 'leggimi');
  for (let i = 0; i < personaggi; i++) writeFileSync(join(r, 'personaggi', `pg${i}.json`), '{}');
  writeFileSync(join(r, 'salvataggi', 'sessione_2026-10-11_2140.zip'), 'a');
  writeFileSync(join(r, 'salvataggi', 'prima-del-ripristino_2026-10-11_2200.zip'), 'b');
  writeFileSync(join(r, 'backup-prima-aggiornamento', 'locali_2026-10-12_09-30-00.zip'), 'c');
  writeFileSync(join(r, 'autosave', 'autosave.zip'), 'd');
  writeFileSync(join(r, 'drive', 'sessione_2026-10-05_2300.zip'), 'e');
  writeFileSync(join(r, 'config-salvataggi.json'), JSON.stringify({ cartella_drive: join(r, 'drive') }));
  return r;
}

test('l’elenco guarda in quattro posti, non più soltanto in salvataggi/ e autosave/', () => {
  const r = conSalvataggi(tmp());
  const e = elencoSalvataggi(postiSalvataggi(r, { cartella_drive: join(r, 'drive') }));
  assert.equal(e.length, 5, 'cinque salvataggi in quattro posti');
  const per = (t) => e.filter((x) => x.tipo === t).length;
  assert.equal(per('sessione'), 2);
  assert.equal(per('prima-del-ripristino'), 1);
  assert.equal(per('prima-aggiornamento'), 1, 'le copie fatte prima di un aggiornamento');
  assert.equal(per('autosave'), 1);
  // ogni voce dice che cos'è e dove sta
  for (const x of e) {
    assert.ok(TIPI[x.tipo], x.tipo);
    assert.equal(x.tipoTesto, TIPI[x.tipo]);
    assert.ok(x.dove, `manca «dove» per ${x.nome}`);
    assert.match(x.etichetta, new RegExp(`^${x.nome.replace(/[.]/g, '\\.')} — `));
  }
  assert.ok(e.some((x) => x.dove === 'Google Drive'));
  assert.ok(e.some((x) => x.dove === 'copie prima degli aggiornamenti'));
  assert.match(rigaSalvataggio(e[0]), /^\d\d\/\d\d\/\d{4} \d\d:\d\d {2}/);
});

test('senza cartella di Drive impostata non si cerca su Drive, e non è un errore', () => {
  const r = conSalvataggi(tmp());
  const e = elencoSalvataggi(postiSalvataggi(r, {}));
  assert.equal(e.length, 4);
  assert.ok(!e.some((x) => x.dove === 'Google Drive'));
});

test('cartella dei personaggi vuota: l’avviso dice il percorso e i salvataggi', () => {
  const r = conSalvataggi(tmp());
  const a = avvisoCartellaVuota({ cartella: join(r, 'personaggi'), ...postiSalvataggi(r, { cartella_drive: join(r, 'drive') }) });
  assert.equal(a.vuota, true);
  assert.equal(a.percorso, join(r, 'personaggi'));
  assert.match(a.testo, /^Non trovo personaggi in questa cartella: /);
  assert.ok(a.testo.includes(join(r, 'personaggi')), 'il percorso in uso dev’essere nel testo');
  assert.match(a.testo, /Ci sono salvataggi del \d\d\/\d\d\/\d{4} \d\d:\d\d: vuoi ripristinarne uno\?/);
  assert.ok(a.salvataggi.length > 0 && a.salvataggi.length <= 5);
});

test('con dei personaggi non si dice niente', () => {
  const r = conSalvataggi(tmp(), { personaggi: 2 });
  const a = avvisoCartellaVuota({ cartella: join(r, 'personaggi'), ...postiSalvataggi(r, {}) });
  assert.equal(a.vuota, false);
  assert.equal(a.testo, '');
  assert.equal(a.quanti, 2);
});

test('vuota e senza salvataggi: lo dice lo stesso, con il percorso', () => {
  const r = tmp();
  mkdirSync(join(r, 'personaggi'), { recursive: true });
  const a = avvisoCartellaVuota({ cartella: join(r, 'personaggi'), ...postiSalvataggi(r, {}) });
  assert.equal(a.vuota, true);
  assert.match(a.testo, /Non ci sono nemmeno salvataggi/);
  assert.deepEqual(a.salvataggi, []);
});

test('console: le righe sopra il menu, senza accenti', () => {
  const r = conSalvataggi(tmp());
  const righe = righeCartellaVuota(r);
  assert.ok(righe.length >= 4);
  assert.ok(righe.some((x) => x.includes('Non trovo personaggi in questa cartella')));
  assert.ok(righe.some((x) => x.includes(join(r, 'personaggi'))));
  assert.ok(righe.some((x) => x.includes('scegli 4')));
  for (const x of righe) assert.doesNotMatch(x, /[àèéìòù]/, x);
  // con i personaggi al loro posto: niente
  assert.deepEqual(righeCartellaVuota(conSalvataggi(tmp(), { personaggi: 1 })), []);
});

test('plancia: la fascia dice titolo, percorso, salvataggi e che cosa fare', () => {
  const a = {
    vuota: true,
    percorso: 'C:\\Mutant\\personaggi',
    salvataggi: [{ nome: 'sessione_2026-10-11_2140.zip', tipoTesto: 'sessione', dove: 'Google Drive', mtime: new Date(2026, 9, 11, 21, 40).toISOString() }],
  };
  const t = testoCartellaVuota(a);
  assert.equal(t.titolo, 'Non trovo personaggi in questa cartella');
  assert.equal(t.percorso, 'C:\\Mutant\\personaggi');
  assert.deepEqual(t.righe, ['11/10/2026 21:40 · sessione_2026-10-11_2140.zip · sessione · Google Drive']);
  assert.match(t.cosaFare, /non sono persi/);
  assert.match(t.cosaFare, /Ripristina un salvataggio/);
  // senza salvataggi il consiglio cambia: prima di rifare tutto, controlla la cartella
  assert.match(testoCartellaVuota({ vuota: true, percorso: 'X', salvataggi: [] }).cosaFare, /cartella giusta/);
  assert.equal(quando('non una data'), '');
});

test('/api/avvio: il server dice al Tavolo se la cartella è vuota, e non lo dice quando non lo è', async () => {
  const r = conSalvataggi(tmp());
  const apri = async (opzioni) => {
    const s = creaServer({ cartella: join(r, 'personaggi'), tavolo: join(r, 'tavolo'), scontri: join(r, 'scontri'), nemici: join(r, 'nemici'), veicoli: join(r, 'veicoli'), soloLocale: true, ...opzioni });
    await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
    return { s, porta: s.address().port };
  };
  // senza la funzione (server di prova): mai un avviso
  const a = await apri({});
  const senza = await (await fetch(`http://127.0.0.1:${a.porta}/api/avvio`)).json();
  a.s.close();
  assert.equal(senza.vuota, false);

  // con la funzione dell'avvio vero
  const avvio = () => avvisoCartellaVuota({ cartella: join(r, 'personaggi'), ...postiSalvataggi(r, { cartella_drive: join(r, 'drive') }) });
  const b = await apri({ avvio });
  const con = await (await fetch(`http://127.0.0.1:${b.porta}/api/avvio`)).json();
  // la pagina lo legge con leggiAvvioVuoto, che restituisce null quando non c'è niente da dire
  const letto = await leggiAvvioVuoto((u) => fetch(`http://127.0.0.1:${b.porta}${u}`));
  b.s.close();
  assert.equal(con.vuota, true);
  assert.ok(con.percorso.endsWith('personaggi'));
  assert.ok(con.salvataggi.length > 0);
  assert.equal(typeof con.salvataggi[0].mtime, 'string', 'le date viaggiano come testo');
  assert.equal(letto.vuota, true);
  assert.equal(await leggiAvvioVuoto(async () => ({ ok: false })), null);
  assert.equal(await leggiAvvioVuoto(async () => { throw new Error('senza server'); }), null);
});

test('la fascia e lo stile ci sono, e il Tavolo la disegna', async () => {
  const { readFileSync } = await import('node:fs');
  const tavolo = readFileSync(join(REPO, 'src', 'ui', 'tavolo.js'), 'utf8');
  assert.match(tavolo, /fasciaCartellaVuota\(stato\.avvioVuoto\)/);
  assert.match(tavolo, /leggiAvvioVuoto\(\)/);
  assert.match(readFileSync(join(REPO, 'css', 'style.css'), 'utf8'), /\.fascia-cartella-vuota/);
  // la finestra nera del server lo dice all'avvio
  assert.match(readFileSync(join(REPO, 'server.mjs'), 'utf8'), /avvisoPersonaggiVuoti\(\)/);
});
