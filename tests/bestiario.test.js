// Il Bestiario proposto come dati (data/bestiario.json, dal lotto tools/lotti/lotto_bestiario_dati.mjs): i dati
// dicono gli stessi numeri del documento (docs/bestiario/bestiario.md), letti qui in modo indipendente dal lotto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { validaDati } from '../src/validate.js';

const { dati, errori } = await datiReali();
const md = readFileSync(new URL('../docs/bestiario/bestiario.md', import.meta.url), 'utf8').split(/\r?\n/);
const B = dati.bestiario;
const GRADI = ['Minore', 'Semplice', 'Medio', 'Potente', 'Molto potente'];
const pulisci = (s) => s.replace(/\*\*/g, '').trim();
const celle = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map(pulisci);
const numero = (s) => Number(String(s).replace(',', '.'));

/** Righe della prima tabella dopo il titolo che contiene `titolo`, come mappa prima colonna → celle. */
function tabella(titolo, n = 0) {
  let i = md.findIndex((r) => /^#+\s/.test(r) && pulisci(r).includes(titolo));
  assert.ok(i >= 0, titolo);
  const out = [];
  for (; out.length <= n && i < md.length; i++) {
    if (md[i].startsWith('|') && /^\|\s*:?-{3,}/.test(md[i + 1] ?? '')) {
      const righe = [];
      let j = i + 2;
      for (; md[j]?.startsWith('|'); j++) righe.push(celle(md[j]));
      out.push({ testa: celle(md[i]), righe });
      i = j;
    }
  }
  return out[n];
}
const perRiga = (t) => new Map(t.righe.map((r) => [r[0], r.slice(1)]));

test('data/bestiario.json è valido e porta la fonte e il TODO(Davide)', () => {
  assert.deepEqual(errori, []);
  assert.match(B.versione_manuale, /Bestiario, proposta/);
  assert.match(B['TODO(Davide)'], /Davide/);
  // il validatore si accorge di un errore
  const rotto = copia(dati);
  rotto.bestiario.tabelle.mutazione.righe[1].da = 4;
  rotto.bestiario.basi.aracnoide.per_grado.medio.attacchi[0].danno = '2d6+x';
  const e = validaDati(rotto).filter((x) => x.file.startsWith('bestiario')).map((x) => x.chiave);
  assert.ok(e.includes('tabelle.mutazione.righe[1]'), e);
  assert.ok(e.includes('basi.aracnoide.per_grado.medio.attacchi[0].danno'), e);
});

test('scala dei gradi: PV, VA, Difese, AR, danno e AzP come il §2.1; Boss come il §2.5.1', () => {
  const t = perRiga(tabella('2.1 I sei gradi'));
  const boss = perRiga(tabella('2.5.1 Valori del Boss', 1));
  B.gradi.forEach((g, i) => {
    const r = t.get(GRADI[i]);
    assert.deepEqual([g.pv, g.va, g.difese, g.ar, g.danno, g.azp, g.round_resistenza], [numero(r[2]), numero(r[3]), numero(r[4]), numero(r[5]), r[7], numero(r[8]), numero(r[9])], GRADI[i]);
    assert.deepEqual([g.boss.pv, g.boss.azp], [numero(boss.get(GRADI[i])[0]), numero(boss.get(GRADI[i])[1])]);
  });
});

test('basi per grado (cap. 3): PV, VA dell’attacco, Difese, AR e danno come il documento', () => {
  for (const [id, titolo, attacco] of [['insettoide', '3.3 Insettoide', 'Mandibole'], ['aracnoide', '3.4 Aracnoide', 'Morso'], ['umanoide-mostruoso', '3.5 Umanoide mostruoso', 'Artigli']]) {
    const t = perRiga(tabella(titolo));
    B.gradi.forEach((g, i) => {
      const c = B.basi[id].per_grado[g.id];
      assert.deepEqual(
        [c.pv, c.attacchi[0].va, c.difese, c.ar, c.attacchi[0].danno, c.azp],
        [numero(t.get('PV')[i]), numero(t.get(`VA ${attacco}`)[i]), numero(t.get('VA Difese')[i]), numero(t.get('AR')[i]), t.get(attacco)[i], numero(t.get('AzP')[i])],
        `${id} ${g.nome}`,
      );
    });
  }
  // umani (§3.2): moltiplicatore, AzP e bonus al danno
  const u = tabella('3.2 Umano');
  B.gradi.forEach((g, i) => {
    const r = u.righe[i];
    const q = B.basi.umano.per_grado[g.id];
    assert.deepEqual([q.pv_molt, q.azp, q.bonus_danno], [numero(r[3]), numero(r[4]), numero(r[5])], g.nome);
  });
});

test('tabelle casuali (cap. 6): stessi intervalli e stessi id del documento', () => {
  for (const [chiave, titolo] of [['base', '6.2 Base'], ['grado_scontro', '6.3.2 Scontro'], ['mutazione', '6.4.3 Mutazione'], ['corruzione', '6.5.1 Livello di Corruzione'], ['manifestazione_maggiore', '6.5.3 Manifestazione maggiore']]) {
    const t = tabella(titolo);
    assert.deepEqual(B.tabelle[chiave].righe.map((r) => [r.da === r.a ? String(r.da) : `${r.da}–${r.a}`, r.id]), t.righe.map((r) => [r[0], r[2]]), titolo);
  }
});

