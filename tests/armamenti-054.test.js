// Armamenti 0.54: KEP 808 e Colt Hammershot (tools/lotti/lotto_armamenti_054.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogo } from '../src/equipaggiamento.js';
import { modoRicarica } from '../src/ricarica.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (rif) => cat.perRif.get(rif);

test('KEP 808: pistola al plasma, Armi al Plasma, AC 1d3, +1 VA già nella scheda, cella specifica da 10', () => {
  const k = r('armi_distanza_corporative:kep-808');
  assert.equal(k.specializzazione, 'specializzazione-armi-al-plasma');
  assert.deepEqual([k.abilita, k.danno.una_mano, k.ac, k.modificatore_va, k.gittata_q, k.for_richiesta, k.costo], ['Armi leggere', '1d6+1', '1d3', 1, 20, 6, 12500]);
  assert.ok(k.proprieta.some((p) => p.nome === 'Plasma'));
  assert.equal(modoRicarica(k, dati, cat).modo, 'cella');
  // Armamenti 0.58 §7.20.5: NEC Blu da 250 Lx, carica 200 cr, ricarica 2,5 cr
  assert.deepEqual(r('munizioni:cella-kep-808').cella, { capacita: 10, unita: 'colpi', ricarica_costo: 2.5, riserva_lx: 250 });
});

test('Colt Hammershot: revolver pesante, Pistole, tamburo da 6 riempito in una operazione (E&L 19)', () => {
  const c = r('armi_distanza_corporative:colt-hammershot');
  assert.equal(c.specializzazione, 'specializzazione-pistole');
  assert.deepEqual([c.famiglia, c.danno.una_mano, c.modificatore_va, c.munizioni.capacita, c.for_richiesta, c.inc, c.qualita, c.costo], ['Revolver', '1d6+3', -1, 6, 7, 5, 'Rara', 3500]);
  assert.deepEqual([modoRicarica(c, dati, cat).modo, modoRicarica(c, dati, cat).famiglia], ['tamburo', 'pistola']); // §7.20.9
});
