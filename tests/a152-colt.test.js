// A.152 (risposta di Davide del 09/10/2026): la Colt Hammershot usa proiettili da pistola; il catalogo era già
// corretto. Nella scheda sparisce la vecchia riga «tamburo completo in 1 AzP»: vale la A.135.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { catalogo } from '../src/equipaggiamento.js';
import { modoRicarica } from '../src/ricarica.js';

const { dati } = await datiReali();

test('la Colt Hammershot resta sui proiettili da pistola', () => {
  const cat = catalogo(dati);
  const colt = cat.perRif.get('armi_distanza_corporative:colt-hammershot');
  assert.ok(colt, 'la scheda c’è');
  assert.equal(colt.famiglia, 'Revolver');
  const m = dati.equipaggiamento.file.munizioni.munizioni_armi.find((x) => x.rif === 'armi_distanza_corporative:colt-hammershot');
  assert.equal(m?.famiglia, 'pistola', 'famiglia delle munizioni: pistola (§7.20.9)');
  // le munizioni compatibili sono i proiettili da pistola, non quelli pesanti
  const nomi = dati.equipaggiamento.file.munizioni.oggetti.filter((x) => x.famiglia_munizione === 'pistola' || /^proiettili-da-pistola/.test(x.id)).map((x) => x.id);
  assert.ok(nomi.includes('proiettili-da-pistola'));
});

test('niente più «tamburo pieno in 1 AzP»: vale la A.135', () => {
  const cat = catalogo(dati);
  const colt = cat.perRif.get('armi_distanza_corporative:colt-hammershot');
  assert.doesNotMatch(colt.note_manuale, /tamburo con munizioni pronte richiede 1 AzP/);
  assert.match(colt.note_manuale, /A\.135/);
  assert.match(colt.note_manuale, /2 cartucce per AzP/);
  // e il motore ricarica il revolver a inserimento singolo, come vuole la A.135
  assert.equal(modoRicarica(colt, dati).modo, 'inserimento');
  assert.equal(modoRicarica(colt, dati).carichino, 'tamburo', 'e accetta il carichino per tamburo');
  const r = dati.equipaggiamento.file.munizioni.ricarica;
  assert.deepEqual([r.inserimento_singolo.per_operazione, r.inserimento_singolo.migliorata.per_operazione, r.carichini.per_operazione], [2, 4, 6]);
});
