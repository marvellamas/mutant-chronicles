// Avvisi a Marcello con ntfy.sh (richiesta del 07/10/2026; tools/avvisi.mjs): configurazione assente, spenta o rovinata
// (nessun invio), messaggio composto (solo PC, versione, data e ora, esito), limite delle 6 ore per l'avvio e di un giorno
// per «Mappa aperta», invio con curl e timeout, file della cartella avvisi/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configurazione, messaggio, daMandare, avvisa, inviaNtfy, dataOra, INTERVALLO_AVVIO_MS } from '../tools/avvisi.mjs';

const T0 = new Date('2026-10-08T19:05:00Z');
const radice = (conf, versione = '32fef0e927') => {
  const r = mkdtempSync(join(tmpdir(), 'mutant-avvisi-'));
  writeFileSync(join(r, 'versione.json'), JSON.stringify({ versione, data: '2026-10-08 21:00' }));
  if (conf !== undefined) { mkdirSync(join(r, 'avvisi')); writeFileSync(join(r, 'avvisi', 'avvisi.json'), typeof conf === 'string' ? conf : JSON.stringify(conf)); }
  return r;
};
const finto = () => { const inviati = []; return { inviati, invia: async (c, t) => { inviati.push([c.argomento, t]); return true; } }; };

test('configurazione: assente, spenta, rovinata o con un argomento corto: nessun avviso', () => {
  assert.equal(configurazione(null), null);
  assert.equal(configurazione({ attivo: false, ntfy_argomento: 'mutant-abcdefghijklmnop' }), null);
  assert.equal(configurazione({ attivo: 'sì', ntfy_argomento: 'mutant-abcdefghijklmnop' }), null);
  assert.equal(configurazione({ attivo: true, ntfy_argomento: 'corto' }), null);
  assert.equal(configurazione({ attivo: true, ntfy_argomento: 'mutant-ABC/../x' }), null);
  assert.deepEqual(configurazione({ attivo: true, ntfy_argomento: 'mutant-abcdefghijklmnop' }), { argomento: 'mutant-abcdefghijklmnop', server: 'https://ntfy.sh' });
  // l'esempio tracciato è valido e acceso (aggiorna.bat lo copia in avvisi.json se manca)
  const esempio = JSON.parse(readFileSync(new URL('../avvisi/avvisi.esempio.json', import.meta.url), 'utf8'));
  assert.match(esempio.ntfy_argomento, /^mutant-[a-z0-9]{16}$/);
  assert.ok(configurazione(esempio));
});

test('messaggio: solo nome del PC, versione, data e ora, esito', () => {
  const o = { pc: 'PC-DAVIDE', versione: '32fef0e927', adesso: T0 };
  assert.equal(messaggio('aggiornato', o), `Mutant aggiornato da PC-DAVIDE alla versione 32fef0e927 (${dataOra(T0)})`);
  assert.equal(messaggio('non-aggiornato', { ...o, motivo: 'git pull non riuscito' }), `Aggiornamento NON riuscito da PC-DAVIDE: git pull non riuscito (${dataOra(T0)})`);
  assert.equal(messaggio('avvio', o), `Mutant avviato da PC-DAVIDE, versione 32fef0e927 (${dataOra(T0)})`);
  assert.equal(messaggio('mappa', { ...o, versione: null }), `Mappa aperta da PC-DAVIDE, versione sconosciuta (${dataOra(T0)})`);
  assert.match(dataOra(T0), /^\d{2}\/\d{2}\/2026 \d{2}:\d{2}$/);
  assert.throws(() => messaggio('altro', o));
});

test('limiti: avvio al massimo ogni 6 ore, «Mappa aperta» una volta al giorno, aggiornamenti sempre', () => {
  let r = daMandare('avvio', null, T0);
  assert.equal(r.manda, true);
  const dopo = (ms) => new Date(T0.getTime() + ms);
  assert.equal(daMandare('avvio', r.stato, dopo(INTERVALLO_AVVIO_MS - 60000)).manda, false);
  assert.equal(daMandare('avvio', r.stato, dopo(INTERVALLO_AVVIO_MS)).manda, true);
  r = daMandare('mappa', r.stato, T0);
  assert.equal(r.manda, true);
  assert.equal(daMandare('mappa', r.stato, dopo(3600000)).manda, false);
  assert.equal(daMandare('mappa', r.stato, dopo(24 * 3600000)).manda, true);
  assert.equal(daMandare('aggiornato', r.stato, T0).manda, true);
  assert.equal(daMandare('avvio', { avvio: 'rotto' }, T0).manda, true);
});

test('avvisa: senza file o spento nulla; acceso manda e ricorda; limite rispettato; invio fallito non ricordato', async () => {
  for (const conf of [undefined, { attivo: false, ntfy_argomento: 'mutant-abcdefghijklmnop' }, '{rotto']) {
    const f = finto();
    assert.deepEqual(await avvisa('avvio', { radice: radice(conf), adesso: T0, pc: 'PC', invia: f.invia }), { mandato: false, motivo: 'spento' });
    assert.equal(f.inviati.length, 0);
  }
  const r = radice({ attivo: true, ntfy_argomento: 'mutant-abcdefghijklmnop' });
  const f = finto();
  const e = await avvisa('avvio', { radice: r, adesso: T0, pc: 'PC-DAVIDE', invia: f.invia });
  assert.equal(e.mandato, true);
  assert.deepEqual(f.inviati, [['mutant-abcdefghijklmnop', `Mutant avviato da PC-DAVIDE, versione 32fef0e927 (${dataOra(T0)})`]]);
  assert.equal(JSON.parse(readFileSync(join(r, 'avvisi', 'stato.json'), 'utf8')).avvio, T0.toISOString());
  assert.deepEqual(await avvisa('avvio', { radice: r, adesso: new Date(T0.getTime() + 3600000), pc: 'PC', invia: f.invia }), { mandato: false, motivo: 'limite' });
  // l'aggiornamento parte sempre e non tocca lo stato
  assert.equal((await avvisa('aggiornato', { radice: r, adesso: T0, pc: 'PC', invia: f.invia })).mandato, true);
  assert.equal(f.inviati.length, 2);
  // senza rete: nessun errore, e al prossimo avvio si riprova
  const r2 = radice({ attivo: true, ntfy_argomento: 'mutant-abcdefghijklmnop' });
  const e2 = await avvisa('avvio', { radice: r2, adesso: T0, pc: 'PC', invia: async () => false });
  assert.equal(e2.motivo, 'errore');
  assert.ok(!existsSync(join(r2, 'avvisi', 'stato.json')));
  // un invio che lancia non esce mai da avvisa
  assert.equal((await avvisa('avvio', { radice: r2, adesso: T0, pc: 'PC', invia: async () => { throw new Error('rete'); } })).motivo, 'errore');
});

test('invio: curl in silenzio, con timeout di pochi secondi, al server e all’argomento; errore → false', async () => {
  let chiamata = null;
  let corpo = null;
  const esegui = (cmd, args, opz, fatto) => { chiamata = { cmd, args, opz }; setTimeout(() => fatto(null), 0); return { stdin: { end: (t) => { corpo = t; } } }; };
  assert.equal(await inviaNtfy({ argomento: 'mutant-abcdefghijklmnop' }, 'Ciao', { esegui }), true);
  assert.equal(chiamata.cmd, 'curl');
  assert.equal(chiamata.args.at(-1), 'https://ntfy.sh/mutant-abcdefghijklmnop');
  const m = chiamata.args.indexOf('-m');
  assert.ok(m >= 0 && Number(chiamata.args[m + 1]) <= 10, 'timeout');
  assert.ok(chiamata.opz.timeout <= 15000);
  assert.equal(corpo, 'Ciao');
  assert.equal(await inviaNtfy({ argomento: 'x' }, 'Ciao', { esegui: (c, a, o, fatto) => { setTimeout(() => fatto(new Error('no')), 0); return {}; } }), false);
  assert.equal(await inviaNtfy({ argomento: 'x' }, 'Ciao', { esegui: () => { throw new Error('curl assente'); } }), false);
});
