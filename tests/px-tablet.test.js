// F (25/10/2026, pannello PX): i PX li cambia solo il Direttore. Non basta nasconderli dall'interfaccia del
// giocatore: un tablet non deve poterli scrivere né dal salvataggio normale né dalla coda offline.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { operazioniDaDiff, unisciGiornale, eAccodabile, tipoCampo } from '../src/giornale.js';
import { aggiungiOperazioni } from '../src/rientro.js';
import { proteggiPuntiEsperienza, proteggiBlocchiMaster } from '../src/correzioni-master.js';

test('un cambio dei PX non genera nessuna operazione del giornale (la coda del tablet non li vede)', () => {
  const prima = { scelte: { puntiEsperienza: 100, nome: 'Aiko' }, sessione: { pvAttuali: 10 } };
  const dopo = { scelte: { puntiEsperienza: 9999, nome: 'Aiko' }, sessione: { pvAttuali: 8 } };
  const op = operazioniDaDiff(prima, dopo);
  assert.deepEqual(op.map((o) => o.percorso.join('.')), ['sessione.pvAttuali'], 'i PV sì, i PX no');
  // anche se spariscono del tutto
  assert.deepEqual(operazioniDaDiff(prima, { scelte: { nome: 'Aiko' }, sessione: { pvAttuali: 10 } }), []);
  assert.equal(eAccodabile(['scelte', 'puntiEsperienza']), false);
  assert.equal(eAccodabile('scelte.puntiEsperienza'), false);
  assert.equal(eAccodabile(['sessione', 'pvAttuali']), true);
  // il campo resta classificato (tests/giornale-campi): è un'assegnazione dichiarata, ma non accodabile
  assert.equal(tipoCampo(['scelte', 'puntiEsperienza'], 5), 'assegna');
});

test('un’operazione sui PX che arrivasse lo stesso (tablet col codice di prima) è scartata, non messa in attesa', () => {
  const px = { id: 'op-px', tipo: 'assegna', percorso: ['scelte', 'puntiEsperienza'], visto: 100, nuovo: 9999, quando: '2026-10-25T10:00:00Z' };
  const pv = { id: 'op-pv', tipo: 'somma', percorso: ['sessione', 'pvAttuali'], delta: -1, quando: '2026-10-25T10:00:01Z' };
  const r = aggiungiOperazioni(null, 'pg-1', [px, pv], { nome: 'Aiko' });
  assert.deepEqual(r.inAttesa, ['op-pv']);
  assert.equal(r.decise['op-px'], 'scartata', 'il tablet lo legge come «scartata» e svuota la coda');
  assert.deepEqual(r.rifiutate, ['op-px']);
  // e non rientra se la rimanda
  const di_nuovo = aggiungiOperazioni(r.rientro, 'pg-1', [px], { nome: 'Aiko' });
  assert.deepEqual(di_nuovo.inAttesa, ['op-pv']);
  // nemmeno con un'approvazione diretta: unisciGiornale la salta
  const u = unisciGiornale({ scelte: { puntiEsperienza: 100 }, sessione: { pvAttuali: 10 } }, [px, pv]);
  assert.equal(u.risultato.scelte.puntiEsperienza, 100);
  assert.equal(u.risultato.sessione.pvAttuali, 9);
});

test('proteggiPuntiEsperienza: il file che si scrive tiene i PX del disco', () => {
  const disco = { scelte: { puntiEsperienza: 520, nome: 'Aiko' } };
  const tablet = { scelte: { puntiEsperienza: 0, nome: 'Aiko Tenzan' } };
  const r = proteggiPuntiEsperienza(tablet, disco);
  assert.equal(r.ripristinato, true);
  assert.equal(r.file.scelte.puntiEsperienza, 520);
  assert.equal(r.file.scelte.nome, 'Aiko Tenzan', 'il resto lo scrive il giocatore');
  assert.equal(proteggiPuntiEsperienza({ scelte: { puntiEsperienza: 520 } }, disco).ripristinato, false);
  // file nuovo: nessun PX dal tablet
  assert.equal('puntiEsperienza' in proteggiPuntiEsperienza({ scelte: { puntiEsperienza: 5000 } }, null).file.scelte, false);
  // entra anche nella protezione generale dei blocchi del master
  assert.equal(proteggiBlocchiMaster(tablet, disco).file.scelte.puntiEsperienza, 520);
  assert.equal(proteggiBlocchiMaster(tablet, disco).ripristinato, true);
});

// --- dal server vero ---
const radice = mkdtempSync(join(tmpdir(), 'mutant-px-tablet-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srvMaster, baseMaster, srvTablet, baseTablet;
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  const crea = (eMaster) => creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster });
  srvMaster = crea(() => true); srvTablet = crea(() => false);
  await new Promise((ok) => srvMaster.listen(0, '127.0.0.1', ok));
  await new Promise((ok) => srvTablet.listen(0, '127.0.0.1', ok));
  baseMaster = `http://127.0.0.1:${srvMaster.address().port}`;
  baseTablet = `http://127.0.0.1:${srvTablet.address().port}`;
});
after(async () => {
  await new Promise((ok) => srvMaster.close(ok));
  await new Promise((ok) => srvTablet.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

test('dal server: un tablet non cambia i PX salvando; il Direttore sì; il giornale rifiuta i PX', async () => {
  const file = 'Prova-Px_liv1_2026-10-25.json';
  const url = (b) => `${b}/api/personaggi/${encodeURIComponent(file)}`;
  const base = JSON.parse(readFileSync(new URL('../esempi/Aiko-Tenzan_liv5_2026-10-02.json', import.meta.url), 'utf8'));
  const scrivi = (b, px, extra = {}) => fetch(url(b), { method: 'PUT', headers: extra, body: JSON.stringify({ ...base, scelte: { ...base.scelte, puntiEsperienza: px } }) });
  const letto = () => JSON.parse(readFileSync(join(c.personaggi, file), 'utf8'));

  assert.equal((await scrivi(baseMaster, 520)).status, 200);
  assert.equal(letto().scelte.puntiEsperienza, 520);
  // il tablet prova a darsi 9999 PX (salvataggio normale)
  const r = await scrivi(baseTablet, 9999, { 'X-Mutant-Da': 'giocatore' });
  assert.equal(r.status, 200);
  assert.equal(letto().scelte.puntiEsperienza, 520, 'i PX sono rimasti quelli del Direttore');
  assert.equal((await r.json()).masterRipristinato, true, 'il tablet lo sa e ricarica la scheda');
  // un tablet con dati vecchi non cancella i PX appena assegnati
  assert.equal((await scrivi(baseTablet, 100)).status, 200);
  assert.equal(letto().scelte.puntiEsperienza, 520);
  // il Direttore li cambia
  assert.equal((await scrivi(baseMaster, 700)).status, 200);
  assert.equal(letto().scelte.puntiEsperienza, 700);
  // il giornale: un'operazione sui PX non entra in attesa
  const g = await fetch(`${url(baseTablet)}/giornale`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operazioni: [{ id: 'x1', tipo: 'assegna', percorso: ['scelte', 'puntiEsperienza'], visto: 700, nuovo: 1, quando: '2026-10-25T10:00:00Z' }] }) });
  const gj = await g.json();
  assert.equal(g.status, 200, JSON.stringify(gj));
  assert.deepEqual(gj.inAttesa, []);
  assert.equal(gj.decise.x1, 'scartata');
  const att = await (await fetch(`${baseMaster}/api/rientro`)).json();
  assert.equal(att.personaggi.length, 0, 'niente in attesa per il Direttore');
});
