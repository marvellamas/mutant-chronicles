// Difetto del tablet del 19/10/2026, punto 3: il campo delle note del Calendario è a più righe, cresce con il testo e
// conserva il testo lungo (con gli a capo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { righeCampo, aggiungiNota, modificaNota, attivaCalendario } from '../src/calendario.js';
import { validaDati } from '../src/validate.js';
import { contesto, resa, dati } from './scheda-aiuti.js';

const cfg = dati.regole.calendario.campo_note;
const LUNGO = `${'Una riga molto lunga di appunti della sessione. '.repeat(12)}\n\nSecondo capoverso: la Madre non va affrontata di notte.\nTerza riga.`;

test('dati: il campo ha almeno quattro righe e il validatore lo controlla', () => {
  assert.ok(cfg.righe_minime >= 4 && cfg.colonne_stimate >= 10);
  assert.deepEqual(validaDati(dati), []);
  const rotti = structuredClone(dati);
  rotti.regole.calendario.campo_note = { righe_minime: 1, colonne_stimate: 36 };
  assert.ok(validaDati(rotti).some((e) => /calendario\.campo_note/.test(e.chiave)));
});

test('righe del campo: minimo di quattro, poi quelle che servono al testo (a capo e righe lunghe comprese)', () => {
  assert.equal(righeCampo('', cfg), 4);
  assert.equal(righeCampo('una riga', cfg), 4);
  assert.equal(righeCampo('a\nb\nc\nd\ne', cfg), 5);
  assert.equal(righeCampo('x'.repeat(cfg.colonne_stimate * 6), cfg), 6);
  assert.ok(righeCampo(LUNGO, cfg) > 10);
  // senza dati si usa il minimo di quattro
  assert.equal(righeCampo('x', undefined), 4);
});

test('il testo lungo con gli a capo si conserva intero nella nota, salvandola e rileggendola', () => {
  const c0 = attivaCalendario(null, { inizio: '2026-10-19', fascia: dati.regole.calendario.fasce[0].id }, dati);
  const c1 = aggiungiNota(c0, { data: '2026-10-19', fascia: dati.regole.calendario.fasce[0].id, testo: LUNGO }, { id: 'n1', creato: '2026-10-19T10:00:00Z' }, dati);
  assert.equal(c1.note[0].testo, LUNGO.trim());
  const c2 = modificaNota(c1, 'n1', { testo: `${LUNGO}\nAggiunta.` }, dati);
  assert.equal(c2.note[0].testo, `${LUNGO}\nAggiunta.`);
});

test('il campo della scheda è una textarea di almeno quattro righe, con il testo già scritto e Ctrl+Invio per salvare', async () => {
  const sorgente = readFileSync(new URL('../src/ui/calendario.js', import.meta.url), 'utf8');
  assert.match(sorgente, /h\('textarea', \{\s*class: 'cal-testo cal-area', rows: righeCampo\(valore, ctx\.dati\.regole\.calendario\.campo_note\)/);
  assert.doesNotMatch(sorgente, /type: 'text', class: 'cal-testo'/, 'nessun campo a riga sola rimasto');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /textarea\.cal-testo \{ min-height: calc\(4 \* 1\.4em/);
  assert.match(css, /\.cal-testo-riga \{ white-space: pre-wrap; \}/);
  // resa vera della tab Calendario (DOM finto): la nota nuova ha una textarea con almeno quattro righe
  const ctx = contesto('Aiko-Tenzan_liv5_2026-10-02.json', { attiva: 'calendario', scelte: (s) => s });
  ctx.calendario = attivaCalendario(null, { inizio: '2026-10-19', fascia: dati.regole.calendario.fasce[0].id }, dati);
  ctx.tab.tab.push({ id: 'calendario', titolo: 'Calendario' });
  ctx.ui = { calendario: { vista: 'giorno', data: '2026-10-19', bozze: {}, filtro: { colori: [], ricordare: false, testo: '' } } };
  let r;
  try { r = resa(ctx); } catch (e) { r = null; assert.fail(`la tab Calendario non si rende: ${e.message}`); }
  const aree = r.radice.tutti().filter((n) => n.tagName === 'TEXTAREA');
  assert.ok(aree.length >= 1, 'una textarea per ogni fascia');
  for (const a of aree) assert.ok(Number(a.getAttribute('rows')) >= 4, 'almeno quattro righe');
  assert.equal(r.radice.tutti().filter((n) => n.tagName === 'INPUT' && n.className?.includes('cal-testo')).length, 0);
});
