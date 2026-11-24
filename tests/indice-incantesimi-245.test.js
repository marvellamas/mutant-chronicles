import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 245 — l'indice degli incantesimi conosciuti è raggruppato per TIPO (la macrofamiglia: Fisica = Rosso, Mentale = Blu,
// Spirituale = Verde) e dentro ogni gruppo in ordine alfabetico; i gruppi vanno prima i rossi, poi i blu, poi i verdi. Questo file
// fallisce se l'ordine dei gruppi cambia, se un gruppo non è in ordine alfabetico, se un tipo fuori dai tre prende un posto
// inventato invece di andare in fondo, o se il gruppo non si riconosce più (il pallino del suo colore davanti al nome).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { contesto, resa, dati } from './scheda-aiuti.js';
import { gruppiIndiceIncantesimi, ORDINE_COLORI_INDICE } from '../src/indice-incantesimi.js';

const COLORI = dati.regole.chroma.colori;
const LUCAS_2111 = '../istantanee/stato_2026-11-21_2353/personaggi/LUCAS_liv7_2026-11-21.json';
const SALTA = !existsSync(new URL(LUCAS_2111, import.meta.url)) && 'istantanea del 21/11 non presente su questo PC';
const LUCAS_FIXTURE = '../tests/fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json';
const ordinati = (a) => [...a].sort((x, y) => x.localeCompare(y, 'it', { sensitivity: 'base' }));

const voce = (nome, macro) => ({ nome, macro });
const MISTE = [voce('Telepatia', 'Mentale'), voce('Guarigione', 'Spirituale'), voce('Colpo Elementale', 'Fisica'), voce('Armatura di Forza', 'Fisica'),
  voce('Psicometria', 'Mentale'), voce('Cura Ferite', 'Spirituale'), voce('Telecinesi', 'Fisica')];

test('IL MAPPAGGIO: Rosso = Fisica, Blu = Mentale, Verde = Spirituale, letto dai dati (e l’ordine dei colori è quello chiesto)', () => {
  assert.deepEqual(ORDINE_COLORI_INDICE, ['Rosso', 'Blu', 'Verde']);
  assert.deepEqual(COLORI.Rosso.macrofamiglie, ['Fisica']);
  assert.deepEqual(COLORI.Blu.macrofamiglie, ['Mentale']);
  assert.deepEqual(COLORI.Verde.macrofamiglie, ['Spirituale']);
  // e nel catalogo non c’è un altro tipo oltre ai tre (se un giorno ce ne fosse uno, deve andare in fondo: prova qui sotto)
  const tipi = [...new Set(dati.incantesimi.incantesimi.map((i) => i.macrofamiglia))].sort();
  assert.deepEqual(tipi, ['Fisica', 'Mentale', 'Spirituale']);
});

test('L’ORDINE DEI GRUPPI: prima i rossi, poi i blu, poi i verdi; dentro ogni gruppo in ordine alfabetico', () => {
  const g = gruppiIndiceIncantesimi(MISTE, COLORI);
  assert.deepEqual(g.map((x) => x.macro), ['Fisica', 'Mentale', 'Spirituale']);
  assert.deepEqual(g.map((x) => x.colore), ['Rosso', 'Blu', 'Verde']);
  for (const x of g) assert.deepEqual(x.voci.map((v) => v.nome), ordinati(x.voci.map((v) => v.nome)), `${x.macro}: in ordine alfabetico`);
  assert.deepEqual(g[0].voci.map((v) => v.nome), ['Armatura di Forza', 'Colpo Elementale', 'Telecinesi']);
});

test('UN TIPO FUORI DAI TRE NON PRENDE UN POSTO INVENTATO: va dopo i verdi, e gli altri fra loro in ordine alfabetico', () => {
  const con = [...MISTE, voce('Zeta', 'Temporale'), voce('Alfa', 'Arcana'), voce('Beta', 'Temporale')];
  const g = gruppiIndiceIncantesimi(con, COLORI);
  assert.deepEqual(g.map((x) => x.macro), ['Fisica', 'Mentale', 'Spirituale', 'Arcana', 'Temporale']);
  assert.deepEqual(g.slice(3).map((x) => x.colore), [null, null], 'senza colore dichiarato: nessuna posizione né colore inventati');
  assert.deepEqual(g[4].voci.map((v) => v.nome), ['Beta', 'Zeta']);
});

test('UN GRUPPO SENZA VOCI NON C’È (niente intestazioni vuote), e l’ordine non dipende dall’ordine d’ingresso', () => {
  const soloVerdi = gruppiIndiceIncantesimi([voce('Cura Ferite', 'Spirituale')], COLORI);
  assert.deepEqual(soloVerdi.map((x) => x.macro), ['Spirituale']);
  const a = gruppiIndiceIncantesimi(MISTE, COLORI);
  const b = gruppiIndiceIncantesimi([...MISTE].reverse(), COLORI);
  assert.deepEqual(a, b);
});

function gruppiNellaScheda(file) {
  const r = resa(contesto(file, { attiva: 'poteri' }));
  const sez = r.classe('indice-incantesimi')[0];
  const li = sez.tutti().filter((x) => x.tagName === 'LI');
  return { r, sez, li };
}

function controllaIndice(file) {
  const { sez, li } = gruppiNellaScheda(file);
  const tipi = li.map((x) => x.getAttribute('data-tipo'));
  // i gruppi sono contigui e nell’ordine Fisica → Mentale → Spirituale
  const visti = [...new Set(tipi)];
  assert.deepEqual(tipi, tipi.slice().sort((a, b) => visti.indexOf(a) - visti.indexOf(b)), 'un gruppo non si spezza');
  assert.deepEqual(visti, ['Fisica', 'Mentale', 'Spirituale'].filter((t) => visti.includes(t)), 'prima i rossi, poi i blu, poi i verdi');
  for (const t of visti) {
    const nomi = li.filter((x) => x.getAttribute('data-tipo') === t).map((x) => x.querySelectorAll('.nome-indice')[0].textContent);
    assert.deepEqual(nomi, ordinati(nomi), `${t}: in ordine alfabetico`);
  }
  // il gruppo si riconosce: ogni voce ha il suo pallino (colore del tipo, dalla classe macro-*), e la prima di ogni gruppo l’attacco di gruppo
  for (const x of li) {
    assert.equal(x.querySelectorAll('.pallino-tipo').length, 1, 'ogni voce ha il pallino del suo tipo');
    assert.match(x.className, /macro-(fisica|mentale|spirituale)/);
  }
  // ogni gruppo è un blocco a sé (non si spezza fra due colonne) con il suo tipo a parole per chi non vede i colori
  const blocchi = sez.tutti().filter((x) => x.tagName === 'UL' && /gruppo-indice/.test(x.className));
  assert.deepEqual(blocchi.map((x) => x.getAttribute('data-tipo')), visti, 'un blocco per tipo, nell’ordine');
  for (const b of blocchi) assert.match(b.getAttribute('aria-label'), new RegExp(`${b.getAttribute('data-tipo')}$`), 'il gruppo dice il suo tipo a parole');
  return { visti, n: li.length };
}

test('NELLA SCHEDA (Lucas, copia di ottobre del repo): tre gruppi nell’ordine giusto, alfabetici, riconoscibili', () => {
  const { visti, n } = controllaIndice(LUCAS_FIXTURE);
  assert.ok(n >= 10, `${n} voci`);
  assert.equal(visti.length, 3, 'Lucas ha incantesimi di tutti e tre i tipi');
});

test('NELLA SCHEDA (Lucas del 21/11, la copia buona): 8 rossi, 4 blu, 5 verdi, in quest’ordine', { skip: SALTA }, () => {
  const { li } = gruppiNellaScheda(LUCAS_2111);
  const { visti } = controllaIndice(LUCAS_2111);
  assert.deepEqual(visti, ['Fisica', 'Mentale', 'Spirituale']);
  const conto = (t) => li.filter((x) => x.getAttribute('data-tipo') === t).length;
  assert.deepEqual([conto('Fisica'), conto('Mentale'), conto('Spirituale')], [8, 4, 5]);
});

test('IL CODICE NON TORNA ALL’ORDINE ALFABETICO UNICO: l’indice passa dai gruppi, e il pallino non allunga la voce', () => {
  const tab = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  const indice = /function indiceIncantesimi[\s\S]*?\n\}\n/.exec(tab)[0];
  assert.match(indice, /gruppiIndiceIncantesimi\(/, 'l’indice è costruito dai gruppi');
  assert.doesNotMatch(indice, /\.sort\(/, 'nessun ordinamento alfabetico unico sopra i gruppi');
});
