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
  for (const [id, titolo, attacco] of [['insettoide', '3.3 Insettoide', 'Mandibole'], ['aracnoide', '3.4 Aracnoide', 'Morso'], ['umanoide-mostruoso', '3.5 Umanoide mostruoso', 'Artigli'],
    ['quadrupede', '3.6 Quadrupede', 'Morso'], ['alato', '3.7 Alato', 'Artigli'], ['strisciante', '3.8 Strisciante', 'Morso'], ['gigante', '3.9 Gigante', 'Schianto']]) {
    const t = perRiga(tabella(titolo));
    B.gradi.forEach((g, i) => {
      const c = B.basi[id].per_grado[g.id];
      assert.deepEqual(
        [c.pv, c.attacchi[0].va, c.difese, c.ar, c.attacchi[0].danno, c.azp],
        [numero(t.get('PV')[i]), numero(t.get(`VA ${attacco}`)[i]), numero(t.get('VA Difese')[i]), numero(t.get('AR')[i]), t.get(attacco)[i], numero(t.get('AzP')[i])],
        `${id} ${g.nome}`,
      );
      // basi del §3.6–3.9: Passo in volo e taglia (§3.1.1)
      assert.equal(c.volo ?? null, t.has('Passo in volo Q') ? numero(t.get('Passo in volo Q')[i]) : null, `${id} ${g.nome}: volo`);
      assert.equal(c.taglia ?? null, t.has('Taglia') ? t.get('Taglia')[i].toLowerCase() : null, `${id} ${g.nome}: taglia`);
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


test('basi nuove (§3.6–3.9): profili validi nel formato A.73 a ogni grado, con volo e taglia', async () => {
  const { profiloNemico } = await import('../src/crea-nemico.js');
  const { validaNemico } = await import('../src/validate.js');
  for (const base of ['quadrupede', 'alato', 'strisciante', 'gigante']) {
    for (const g of B.gradi) {
      const r = profiloNemico({ base, grado: g.id, mutazioni: [] }, dati);
      assert.deepEqual([r.errori, validaNemico(r.nemico, dati, base)], [[], []], `${base} ${g.nome}`);
    }
  }
  const alato = profiloNemico({ base: 'alato', grado: 'medio', mutazioni: [] }, dati).nemico;
  assert.deepEqual([alato.movimento.passo, alato.movimento.volo, alato.taglia], [3, 8, undefined]);
  const gigante = profiloNemico({ base: 'gigante', grado: 'potente', mutazioni: [] }, dati).nemico;
  assert.deepEqual([gigante.taglia, gigante.pv, gigante.attacchi[0].portata_q], ['grande', 225, 2]);
  assert.match(gigante.capacita.find((c) => c.nome === 'Spazio').effetto, /3 × 3 Q/);
  // le Ali membranose danno il Passo in volo anche a un Quadrupede
  assert.equal(profiloNemico({ base: 'quadrupede', grado: 'medio', mutazioni: ['ali-membranose'] }, dati).nemico.movimento.volo, 6);
});
