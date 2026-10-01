// Armamenti 0.58: Katana Ryūjin, celle NEC Blu, pacchi NEC dei lanciafiamme, NEC degli accessori
// (tools/lotti/lotto_armamenti_058.mjs, docs/diff-manuali-2026-10-01.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogo } from '../src/equipaggiamento.js';
import { modoRicarica } from '../src/ricarica.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (rif) => cat.perRif.get(rif);

test('Katana Ryūjin (§7.1.9): profilo della Katana, +1d6 Plasma a cella da 5, RA, 4.000; cella ravvicinata comune', () => {
  const k = r('armi_corporative:katana-ryujin'), base = r('armi_corporative:katana');
  assert.deepEqual([k.catalogo, k.famiglia, k.abilita, k.specializzazione, k.danno.una_mano, k.portata_q, k.for_richiesta, k.pi, k.ps_int, k.qualita],
    [base.catalogo, base.famiglia, base.abilita, base.specializzazione, '1d8+1', 1, 4, 5, 12, 'Non comune']);
  assert.deepEqual([k.reperibilita, k.costo, k.manovre], ['RA', 4000, ['Affondo', 'Spazzata']]);
  assert.deepEqual([k.attivazione.danno_extra, k.attivazione.natura, k.munizioni.capacita, k.munizioni.unita], ['1d6', 'Plasma', 5, 'cariche']);
  assert.ok(k.proprieta.some((p) => p.nome === 'Precisa 1'));
  assert.ok(r('munizioni:cella-ravvicinata-comune').compatibile_con.includes('armi_corporative:katana-ryujin'));
  // come la Lancia Duskdealer: la cella si cambia dalla carica dell'arma ravvicinata, non dalla ricarica a distanza
  assert.equal(modoRicarica(k, dati, cat).modo, modoRicarica(r('armi_corporative:lancia-duskdealer'), dati, cat).modo);
});

test('§7.20.5: celle NEC Blu con riserva in Lx; carica e ricarica ai prezzi della 0.58 (0,01 cr/Lx)', () => {
  const celle = { 'cella-ravvicinata-comune': [250, 200, 2.5], 'cella-del-fucile-al-plasma-commerciale': [500, 400, 5], 'cella-hellblazer': [750, 600, 7.5], 'cella-kep-808': [250, 200, 2.5], 'cella-intruder': [750, 600, 7.5] };
  for (const [id, [lx, costo, ricarica]] of Object.entries(celle)) {
    const c = r(`munizioni:${id}`);
    assert.deepEqual([c.cella.riserva_lx, c.costo, c.cella.ricarica_costo], [lx, costo, ricarica], id);
    assert.equal(c.cella.ricarica_costo, c.cella.riserva_lx * 0.01, id); // «La ricarica costa 0,01 cr/Lx»
  }
});

test('§7.20.6: i lanciafiamme usano pacchi NEC Blu (50 Lx a getto), si ricaricano cambiando il pacco; niente combustibile', () => {
  const pacchi = cat.oggetti.filter((o) => o.file === 'munizioni' && o.id.startsWith('pacco-nec-'));
  assert.equal(pacchi.length, 5);
  for (const p of pacchi) assert.equal(p.cella.riserva_lx, p.cella.capacita * 50, p.id);
  assert.ok(!cat.oggetti.some((o) => o.file === 'munizioni' && /combustibile/i.test(o.id))); // la cartuccia da campeggio (esplorazione) resta
  for (const arma of ['armi_distanza:lanciafiamme', 'armi_distanza_corporative:gehemmapuker']) assert.equal(modoRicarica(r(arma), dati, cat).modo, 'cella', arma);
  assert.ok(r('armi_distanza_corporative:gehemmapuker').note_manuale.includes('Pacco NEC Blu separato (§7.20.6).'));
});

test('§7.3.4: accessori a NEC Verdi; i ricambi carichi costano 10 (compatto) e 100 (standard)', () => {
  assert.deepEqual([r('accessori_armi:batteria-di-servizio').nome, r('accessori_armi:batteria-di-servizio').costo], ['NEC Verde compatto di ricambio', 10]);
  assert.equal(r('accessori_armi:nec-verde-standard-di-ricambio').costo, 100);
  assert.ok(r('accessori_armi:torcia-tattica').note_manuale.includes('Verde compatto 100 Lx, 2 Lx/h, 50 ore'));
  assert.ok(r('accessori_armi:modulo-di-visione-termica').note_manuale.includes('Verde standard 1.000 Lx, 10 Lx/h, 100 ore'));
  assert.ok(!/batteria di servizio/.test(r('rinforzi:piastre-reattive-cs-r20').note_manuale));
});
