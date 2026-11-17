import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 210 (17/11/2026), parte E — il controllo di inizio sessione dice quando su Drive c'è un'istantanea più recente di
// quella che abbiamo. Stesso principio dell'E&L del 209: la copia dei personaggi è la base di ogni affermazione sui sette, e il
// 15/11 alle 18:45 ne è arrivata una che per due giorni non abbiamo visto (trovata per caso).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { registro } from '../tools/manuali.mjs';
import { confrontaIstantanee, righeIstantaneaDrive, referto } from '../tools/ricognizione-manuali.mjs';

const reg = registro();
const Z1 = 'mutant-stato_2026-11-14_2004.zip';
const Z2 = 'mutant-stato_2026-11-15_1845.zip';
const file = (...nomi) => nomi.map((title, i) => ({ id: `z${i}`, title, modifiedTime: '2026-11-15T17:45:31.519Z' }));

/** Drive come lo darebbe la ricerca: i manuali del registro, tutti uguali, più le istantanee indicate. */
function drive(...istantanee) {
  return [
    ...[...reg.manuali, ...reg.schede, ...reg.scambio].map((v) => ({ id: v.drive, title: `${v.nome} ${v.versione ? `v${v.versione}` : ''}`.trim(), modifiedTime: v.modificato })),
    ...file(...istantanee),
  ];
}

test('confrontaIstantanee: una più recente su Drive si segnala, con il nome da portare', () => {
  const c = confrontaIstantanee(file(Z1, Z2), [Z1]);
  assert.equal(c.piuRecente, true);
  assert.deepEqual(c.daPortare, [Z2]);
  assert.equal(c.suDrive, Z2);
  assert.equal(c.locale, Z1);
});

test('confrontaIstantanee: se abbiamo già la più recente, o più recente di quelle su Drive, non dice niente', () => {
  assert.equal(confrontaIstantanee(file(Z1, Z2), [Z1, Z2]).piuRecente, false);
  assert.equal(confrontaIstantanee(file(Z1), [Z2]).piuRecente, false, 'la nostra è più recente: niente da portare');
  assert.equal(confrontaIstantanee(file(Z1, Z2), [Z2]).piuRecente, false, 'la vecchia su Drive che non abbiamo non conta: abbiamo già di meglio');
  assert.equal(confrontaIstantanee([], [Z1]).piuRecente, false);
  assert.deepEqual(righeIstantaneaDrive(confrontaIstantanee(file(Z2), [Z2])), []);
});

test('confrontaIstantanee: senza nessuna istantanea locale, qualunque su Drive è da portare; i file che non sono istantanee si ignorano', () => {
  const c = confrontaIstantanee([...file(Z2), { id: 'x', title: 'Manuale del Giocatore v0.64' }, { id: 'y', title: 'mutant-stato_non-una-data.zip' }, { id: 'w', title: 'EROI_LEGGENDE_Gestore_PX_Pacchetto_v1_3.zip' }], []);
  assert.equal(c.piuRecente, true);
  assert.deepEqual(c.daPortare, [Z2]);
  assert.equal(c.locale, null);
  assert.match(righeIstantaneaDrive(c)[0], /nessuna istantanea/);
});

test('la ricognizione porta il confronto nel referto, e un’istantanea da portare non chiude con «Tutto in ordine»', () => {
  const r = referto(drive(Z1, Z2), null, { istantaneeLocali: [Z1] });
  assert.equal(r.istantanea.piuRecente, true);
  assert.match(righeIstantaneaDrive(r.istantanea).join('\n'), /ISTANTANEA PIÙ RECENTE SU DRIVE — mutant-stato_2026-11-15_1845\.zip/);
  assert.match(righeIstantaneaDrive(r.istantanea).join('\n'), /sola lettura/);
  assert.equal(referto(drive(Z1, Z2), null, { istantaneeLocali: [Z1, Z2] }).istantanea.piuRecente, false);
});

test('dalla riga di comando: con un’istantanea nuova su Drive il controllo lo dice e esce con 3', () => {
  const cartella = mkdtempSync(join(tmpdir(), 'mutant-istantanea-210-'));
  const f = join(cartella, 'drive.json');
  // una data di un secolo da ora: più recente di qualunque cosa abbiamo, qualunque sia la cartella locale di questo PC
  writeFileSync(f, JSON.stringify({ files: drive('mutant-stato_2099-01-01_1200.zip') }));
  const r = spawnSync(process.execPath, ['tools/ricognizione-manuali.mjs', `--drive=${f}`], { cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 90000 });
  assert.equal(r.status, 3, r.stdout.slice(-500));
  assert.match(r.stdout, /ISTANTANEA PIÙ RECENTE SU DRIVE — mutant-stato_2099-01-01_1200\.zip/);
  assert.doesNotMatch(r.stdout, /Tutto in ordine/);
  // senza istantanee su Drive non c'è la riga
  writeFileSync(f, JSON.stringify({ files: drive() }));
  const q = spawnSync(process.execPath, ['tools/ricognizione-manuali.mjs', `--drive=${f}`], { cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 90000 });
  assert.doesNotMatch(q.stdout, /ISTANTANEA PIÙ RECENTE SU DRIVE/);
});
