import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 201: lo strumento che ricollega, e la riga del controllo di inizio sessione.
//
// Lo strumento è quello che lancia Davide: in sola lettura dice che cosa c'è da ricollegare, con `--scrivi`
// applica. **Scrive solo dove il candidato è uno solo** — con due candidati lascia e lo dice, perché scegliere è
// del Direttore — **solo sul file attuale** di ciascuno (lotto 200) e **non si ripete**: rilanciato non trova più
// niente. Una riga nello storico dice che cosa ha fatto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rapporto, applica, recordDelRegistro } from '../tools/riferimenti-rotti.mjs';
import { cartellaComeDavide, improntaCartella, differenze } from './cartella-come-davide.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

const FIAT_LUX = {
  formato: 'mutant-veicolo', versione: 1, id: 'veimvozx57q0', revisione: 21, aggiornato: '2026-11-14T19:00:36.994Z',
  proprietario: { tipo: 'gruppo' }, conducente: { chiave: 'PABLO-ZAION', nome: 'PABLO ZAION' }, mitragliere: null,
  mezzo: { uid: 'veimvozx57q0', profilo: 'asa-scout-mk4', nome: 'FIAT LUX', andatura: 'fermo', pi: { corpo: 60, propulsione: 36, motore: 24 }, rinforzi: {}, munizioni: [], avarie: '' },
  movimento: null,
};
const ROTTO = { uid: 'veimuu14mqa0', rif: 'veimuu14mqa0', nome: 'ASA Scout MK4' };

/**
 * Una cartella come quella di Davide (cinque versioni per personaggio), col riferimento rotto messo **in tutte** le
 * versioni di due personaggi: così si vede che si scrive solo nell'attuale.
 */
function conRiferimentiRotti({ record = [FIAT_LUX], chi = 2 } = {}) {
  const c = cartellaComeDavide();
  const veicoli = join(c.base, 'veicoli');
  mkdirSync(veicoli, { recursive: true });
  for (const r of record) writeFileSync(join(veicoli, `${r.id}.json`), `${JSON.stringify(r, null, 2)}\n`);
  const rotti = c.voci.slice(0, chi);
  for (const v of rotti) {
    for (const f of v.file) {
      const o = JSON.parse(readFileSync(f.percorso, 'utf8'));
      o.scelte = { ...o.scelte, veicoli: [{ ...ROTTO }] };
      writeFileSync(f.percorso, `${JSON.stringify(o, null, 2)}\n`);
    }
  }
  return { ...c, veicoli, rotti };
}

test('recordDelRegistro legge i record e ignora quello che non è un veicolo', () => {
  const dove = mkdtempSync(join(tmpdir(), 'mutant-reg-201-'));
  writeFileSync(join(dove, 'veimvozx57q0.json'), JSON.stringify(FIAT_LUX));
  writeFileSync(join(dove, 'LEGGIMI.txt'), 'non è un json');
  writeFileSync(join(dove, 'rovinato.json'), '{ questo non è json');
  writeFileSync(join(dove, 'altro.json'), JSON.stringify({ formato: 'qualcos-altro' }));
  assert.deepEqual(recordDelRegistro(dove).map((r) => r.id), ['veimvozx57q0']);
  assert.deepEqual(recordDelRegistro(join(dove, 'non-esiste')), [], 'una cartella che non c’è non fa saltare niente');
});

test('in sola lettura dice che cosa c’è da ricollegare e non scrive un byte', async () => {
  const c = conRiferimentiRotti();
  const prima = improntaCartella(c.cartella);
  const r = await rapporto({ personaggi: c.cartella, veicoli: c.veicoli, d: dati });
  assert.equal(r.quadro.quanti, 2, 'due personaggi con il riferimento rotto');
  assert.equal(r.quadro.sistemabili, 2);
  assert.deepEqual(differenze(prima, improntaCartella(c.cartella)), [], 'il rapporto ha scritto qualcosa');
  // si guarda il file attuale di ciascuno, non le cinque versioni
  assert.deepEqual(r.quadro.righe.map((x) => x.file).sort(), c.rotti.map((v) => v.attuale.nome).sort());
  assert.match(r.suCosa, /7 personaggi/);
});

test('--scrivi ricollega, tocca SOLO il file attuale, e rilanciato non trova più niente', async () => {
  const c = conRiferimentiRotti();
  const prima = improntaCartella(c.cartella);
  const e = await applica({ personaggi: c.cartella, veicoli: c.veicoli, d: dati, quando: new Date('2026-11-15T12:00:00.000Z') });
  assert.equal(e.scritti.length, 2);
  assert.deepEqual(e.lasciati, []);

  // toccati solo i due file attuali
  const toccati = differenze(prima, improntaCartella(c.cartella)).map((x) => x.file).sort();
  assert.deepEqual(toccati, c.rotti.map((v) => v.attuale.nome).sort(), 'ha toccato una versione vecchia');

  for (const v of c.rotti) {
    const o = JSON.parse(readFileSync(join(c.cartella, v.attuale.nome), 'utf8'));
    assert.deepEqual(o.scelte.veicoli.map((x) => x.rif), ['veimvozx57q0']);
    assert.equal(o.scelte.veicoli[0].nome, 'FIAT LUX');
    assert.equal(o.scelte.veicoli[0].ricollegato.da, 'veimuu14mqa0', 'la voce deve dire da dove viene');
    // la riga nello storico
    const ultima = (o.sessione?.storico ?? []).slice(-1)[0];
    assert.ok(ultima, `${v.nome}: nessuna riga nello storico`);
    assert.match(ultima.testo, /Veicolo ricollegato/);
    assert.match(ultima.testo, /veimuu14mqa0/);
    // la versione precedente non è stata toccata: il riferimento rotto è ancora là, com'era
    const vecchia = JSON.parse(readFileSync(v.file[0].percorso, 'utf8'));
    assert.deepEqual(vecchia.scelte.veicoli.map((x) => x.rif), ['veimuu14mqa0']);
  }

  // rilanciato: niente da fare, e niente scritto
  const dopo = improntaCartella(c.cartella);
  const r2 = await rapporto({ personaggi: c.cartella, veicoli: c.veicoli, d: dati });
  assert.equal(r2.quadro.quanti, 0, 'rilanciato trova ancora qualcosa: non è idempotente');
  const e2 = await applica({ personaggi: c.cartella, veicoli: c.veicoli, d: dati });
  assert.equal(e2.scritti.length, 0);
  assert.deepEqual(differenze(dopo, improntaCartella(c.cartella)), [], 'il secondo giro ha riscritto i file');
});

test('con due candidati lo strumento lascia stare e lo dice: sceglie il Direttore dalla scheda', async () => {
  const secondo = { ...FIAT_LUX, id: 'veimw0000001', mezzo: { ...FIAT_LUX.mezzo, uid: 'veimw0000001', nome: 'ASA Scout MK4 (secondo)' } };
  const c = conRiferimentiRotti({ record: [FIAT_LUX, secondo] });
  const prima = improntaCartella(c.cartella);
  const r = await rapporto({ personaggi: c.cartella, veicoli: c.veicoli, d: dati });
  assert.equal(r.quadro.inAttesa, 2);
  assert.equal(r.quadro.sistemabili, 0);
  const e = await applica({ personaggi: c.cartella, veicoli: c.veicoli, d: dati });
  assert.equal(e.scritti.length, 0, 'ha scelto al posto del Direttore');
  assert.equal(e.lasciati.length, 2);
  assert.deepEqual(differenze(prima, improntaCartella(c.cartella)), [], 'con due candidati non si scrive niente');
});

test('senza nessun candidato non si scrive, e il motivo è un altro', async () => {
  const soloNeverlost = { ...FIAT_LUX, id: 'veimvzoj07y0', mezzo: { ...FIAT_LUX.mezzo, uid: 'veimvzoj07y0', profilo: 'neverlost', nome: 'Neverlost' } };
  const c = conRiferimentiRotti({ record: [soloNeverlost] });
  const prima = improntaCartella(c.cartella);
  const e = await applica({ personaggi: c.cartella, veicoli: c.veicoli, d: dati });
  assert.equal(e.scritti.length, 0);
  assert.equal(e.senzaCandidati.length, 2);
  assert.deepEqual(differenze(prima, improntaCartella(c.cartella)), []);
});

test('la riga del controllo di inizio sessione esiste e non fa saltare niente', async () => {
  const { righeRiferimentiRotti } = await import('../tools/ricognizione-manuali.mjs');
  const righe = await righeRiferimentiRotti();
  assert.ok(Array.isArray(righe), 'deve tornare delle righe, anche quando non c’è niente da dire');
  // lotto 202: nello stesso posto ci sono anche i token appesi delle scene
  for (const r of righe) assert.match(r, /Riferimenti rotti|Token appesi|non si leggono|non si contano/);
});
