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
  assert.deepEqual([k.attivazione.danno_extra, k.attivazione.natura, k.munizioni.capacita, k.munizioni.unita], ['1d6', 'Naturale', 5, 'cariche']); // A.62 (E&L del 02/10): natura Naturale, proprietà Plasma
  assert.equal(k.attivazione.anche, 'la proprietà Plasma');
  assert.ok(k.proprieta.some((p) => p.nome === 'Precisa 1'));
  assert.ok(r('munizioni:cella-ravvicinata-comune').compatibile_con.includes('armi_corporative:katana-ryujin'));
  // come la Lancia Duskdealer: la cella si cambia dalla carica dell'arma ravvicinata, non dalla ricarica a distanza
  assert.equal(modoRicarica(k, dati, cat).modo, modoRicarica(r('armi_corporative:lancia-duskdealer'), dati, cat).modo);
});

test('§7.20.5 (0.68): celle in cariche, senza Lx; carica e ricarica ai prezzi dei NEC (10 cr per carica)', () => {
  const celle = { 'cella-ravvicinata-comune': [5, 200, 50], 'cella-del-fucile-al-plasma-commerciale': [20, 800, 200], 'cella-hellblazer': [30, 1200, 300], 'cella-kep-808': [10, 400, 100], 'cella-intruder': [30, 1200, 300] };
  for (const [id, [cariche, costo, ricarica]] of Object.entries(celle)) {
    const c = r(`munizioni:${id}`);
    assert.deepEqual([c.cella.capacita, c.costo, c.cella.ricarica_costo], [cariche, costo, ricarica], id);
    assert.equal(c.cella.ricarica_costo, c.cella.capacita * 10, id); // «10 cr per carica NEC»
    assert.equal(c.cella.riserva_lx, undefined, id);
  }
});

test('§7.20.6 (0.68): i lanciafiamme usano pacchi NEC Rossi (una carica a getto), si ricaricano cambiando il pacco; niente combustibile', () => {
  const pacchi = cat.oggetti.filter((o) => o.file === 'munizioni' && o.id.startsWith('pacco-nec-'));
  assert.equal(pacchi.length, 5); // con il pacco da 50 cariche del Gehemmapuker (A.190: non è più il Modulo Blu)
  assert.deepEqual([r('munizioni:pacco-nec-gehemmapuker').cella.capacita, r('munizioni:pacco-nec-gehemmapuker').compatibile_con], [50, ['armi_distanza_corporative:gehemmapuker']]);
  const prezzi = { 'pacco-nec-nemesis-214': [5, 200, 50], 'pacco-nec-lanciafiamme-commerciale': [10, 400, 100], 'pacco-nec-eruptor': [10, 400, 100], 'pacco-nec-purifier': [15, 600, 150], 'pacco-nec-gehemmapuker': [50, 2100, 500] };
  for (const p of pacchi) assert.deepEqual([p.cella.capacita, p.costo, p.cella.ricarica_costo], prezzi[p.id], p.id);
  for (const p of pacchi) assert.equal(p.cella.riserva_lx, undefined, p.id);
  assert.ok(!cat.oggetti.some((o) => o.file === 'munizioni' && /combustibile/i.test(o.id))); // la cartuccia da campeggio (esplorazione) resta
  for (const arma of ['armi_distanza:lanciafiamme', 'armi_distanza_corporative:gehemmapuker']) assert.equal(modoRicarica(r(arma), dati, cat).modo, 'cella', arma);
  assert.ok(r('armi_distanza_corporative:gehemmapuker').note_manuale.includes('Pacco NEC Rosso separato (§7.20.6).'));
});

test('§7.3.4: accessori a NEC Verdi; i ricambi carichi (NEC Verde 1 a 40 cr, NEC Verde 3 a 120) sono le celle del catalogo NEC', () => {
  assert.deepEqual([r('nec:verde-compatto').costo, r('nec:verde-standard').costo], [40, 120]);
  assert.ok(!r('accessori_armi:batteria-di-servizio') && !r('accessori_armi:nec-verde-standard-di-ricambio')); // niente doppioni
  // Armamenti 0.65, §7.3.4: elettronica ordinaria, nessun conteggio (prima 2 Lx/h, 50 ore)
  assert.deepEqual(r('accessori_armi:torcia-tattica').alimentazione, { nec: 'nec:verde-compatto', ordinaria: true, paragrafo: '§5.4.3' });
  for (const id of ['torcia-tattica', 'modulo-di-visione-termica']) assert.ok(r(`accessori_armi:${id}`).note_manuale.includes('Gli accessori elettronici ordinari usano NEC Verdi e non richiedono conteggi di ore, cariche o consumi giornalieri.'), id);
  assert.ok(!/batteria di servizio/.test(r('rinforzi:piastre-reattive-cs-r20').note_manuale));
});
