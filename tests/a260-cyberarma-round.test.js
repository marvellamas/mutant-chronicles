import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 206 (16/11/2026) — **A.260: la CyberArma convertita si alimenta a Round, non a colpi.**
//
// La catena, perché è il caso che si ripeterà: la **A.236** del 02/11 diceva «10 Round», la **A.251** del 06/11
// diceva «ogni 10 colpi» e l'app ha seguito quella perché più recente, gli **Armamenti 0.83** — pubblicati dopo
// entrambe — tornavano a dire 10 Round «indipendentemente dal numero di attacchi». Era la A.260, l'unico punto in
// cui pensavamo che l'app stesse facendo la cosa sbagliata, e il 15/11 Davide ha risposto confermando il manuale.
// Quindi non è «un manuale contro una risposta» (la A.270): è una risposta che supera una risposta, e vale la più
// recente — con la differenza scritta nel pacchetto, perché una regola che cambia senza il suo perché, fra sei
// mesi, qualcuno la rimette come stava.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { consumoAlimentazione } from '../src/cyberarma.js';
import { testoAttivazione, usoPerClasse } from '../src/attivazione-arma.js';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const armi = JSON.parse(readFileSync(join(RADICE, 'data/equipaggiamento/armi.json'), 'utf8'));
const voce = (id) => armi.oggetti.find((o) => o.id === id);
const dati = { equipaggiamento: { file: { armi } } };
// `testoAttivazione` prende la **voce di catalogo**, non l'arma della scheda
const arma = (id) => voce(id);

test('il consumo di una conversione si conta in Round, e il campo dei colpi non esiste più', () => {
  for (const id of ['riserva_cm', 'nec']) {
    const c = consumoAlimentazione(id, dati);
    assert.equal(c.round, 10, `${id}: 10 Round`);
    assert.equal(c.ogni_colpi, undefined, `${id}: il conteggio a colpi è superato`);
    assert.equal(c.indipendente_dagli_attacchi, true, `${id}: indipendentemente da attacchi, colpi o Azioni`);
    assert.match(c.testo, /10 Round/);
    assert.ok(!/colpi/i.test(c.testo), `${id}: «${c.testo}» parla ancora di colpi`);
  }
});

test('nei dati non resta un solo «ogni 10 colpi» della CyberArma, né il TODO della A.260', () => {
  // **il controllo che deve restare verde sempre**: se qualcuno rimette il conteggio a colpi, al tavolo una
  // CyberArma durerebbe la metà o il doppio senza che nessuno veda da dove viene la differenza
  const senzaNota = (o) => { const x = { ...o }; if (x.alimentazione_modifiche) x.alimentazione_modifiche = { ...x.alimentazione_modifiche, _nota_a260: '' }; return x; };
  // la nota della A.260 **nomina** il «ogni 10 colpi» per dire che è superato, ed è l'unico posto in cui deve
  // restare scritto: una regola che cambia senza il suo perché, fra sei mesi, qualcuno la rimette come stava
  const testo = JSON.stringify(armi.oggetti.filter((o) => /cyberarma/.test(o.id)).map(senzaNota));
  assert.ok(!/ogni_colpi/.test(testo), 'nessun ogni_colpi sulle voci della CyberArma');
  assert.ok(!/ogni 10 colpi/.test(testo), 'e nessun testo che lo dica a parole, fuori dalla nota della A.260');
  const cy = armi.oggetti.find((o) => o.alimentazione_modifiche);
  assert.equal(cy.alimentazione_modifiche['TODO(Davide)'], undefined, 'la A.260 è risolta: il TODO esce');
  assert.match(cy.alimentazione_modifiche._nota_a260, /A\.260/);
  assert.match(cy.alimentazione_modifiche._nota_a260, /10 Round/);
});

test('la sintesi nella scheda dice i Round', () => {
  const scheda = { classi: [{ nome: 'Tecnomante', grado: 3 }] };
  const t = testoAttivazione(arma('cyberarma-batteria-verde'), scheda, {}, 'u1');
  assert.equal(t.sintesi, '1 CM · 10 Round');
  assert.equal(t.round, 10);
  assert.equal(t.indipendenteDagliAttacchi, true);
  assert.equal('ogniColpi' in t, false);
  const n = testoAttivazione(arma('cyberarma-nec'), { classi: [{ nome: 'Agente', grado: 3 }] }, {}, 'u1');
  assert.equal(n.sintesi, '1 carica NEC · 10 Round');
});

test('la CyberArma è un’arma ravvicinata e non effettua Raffiche, in nessuna configurazione', () => {
  // A.260 lo dice per esteso. Oggi nessuna delle tre voci ha modalità di fuoco, quindi «Attacca!» non le
  // offrirebbe: la regola è scritta perché un domani non torni per sbaglio.
  const cy = armi.oggetti.find((o) => o.alimentazione_modifiche);
  assert.equal(cy.ravvicinata_senza_raffiche, true);
  assert.match(cy._nota_ravvicinata, /ravvicinata/);
  for (const id of ['cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec']) {
    const o = voce(id);
    assert.equal(o.tipo, 'arma_ravvicinata', `${id}: ravvicinata`);
    const mod = o.modalita ?? [];
    for (const m of mod) assert.ok(!/^R[BML]$/.test(m), `${id}: la modalità «${m}» è una Raffica`);
  }
});

test('gli altri costi restano invariati: «Gli altri costi restano invariati» (A.260)', () => {
  const b = { ...voce('cyberarma-batteria-verde'), rif: 'armi:cyberarma-batteria-verde' };
  const t = usoPerClasse(b, ['Tecnomante']);
  assert.deepEqual([t.cm, t.pm, t.va, t.sintonizzazione], [1, 2, 0, 2], '1 CM o 2 PM personali, SnT 2');
  // su un esemplare convertito l'impiego del Custode resta non disponibile (A.251, non toccata dalla A.260)
  assert.equal(usoPerClasse(b, ['Custode']).ammesso, false);
});
