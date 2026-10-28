// A.187 (Davide, 28/10/2026): si sale di livello solo con i PX assegnati dal Direttore (soglie cumulative A.170, limite
// dell'Atto), il blocco vale anche sul server, il Direttore può concedere un passaggio anticipato con motivo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { permessoSalita, livelloConsentito, sfasamento, concessioniLivello, controllaLivelloDaTablet, scelteDelLivello } from '../src/livello-px.js';
import { aggiungiCorrezione, nuovaCorrezione, annullaCorrezione } from '../src/correzioni-master.js';
import { livelloDaPx } from '../src/px-partita.js';

const p = JSON.parse(readFileSync(new URL('../data/px_partita.json', import.meta.url), 'utf8'));
const concessione = (livello, motivo = 'recupero di una partita') => nuovaCorrezione({ chiave: 'livello', etichetta: `Passaggio al livello ${livello}`, tipo: 'concessione', motivo, livello });

test('600 PX al livello 6: non si sale al 7 (servono 720)', () => {
  const r = permessoSalita({ livello: 6, px: 600, atto: 'III' }, p);
  assert.equal(r.ok, false);
  assert.equal(r.richiesti, 720);
  assert.equal(r.mancanti, 120);
  assert.match(r.motivo, /720 PX/);
  assert.equal(permessoSalita({ livello: 6, px: 720, atto: 'III' }, p).ok, true);
  assert.equal(livelloDaPx(600, p), 6, 'il conto resta quello unico (lotto 132)');
});

test('senza PX assegnati (null, vuoto) non si sale', () => {
  assert.equal(permessoSalita({ livello: 1, px: null, atto: 'I' }, p).ok, false);
  assert.equal(permessoSalita({ livello: 1, px: undefined, atto: 'I' }, p).mancanti, 50);
  assert.equal(permessoSalita({ livello: 1, px: 50, atto: 'I' }, p).ok, true);
});

test('il limite dell’Atto vale anche con i PX sufficienti', () => {
  const r = permessoSalita({ livello: 8, px: 5000, atto: 'I' }, p);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /Atto I arriva al livello 8/);
  assert.equal(permessoSalita({ livello: 8, px: 5000, atto: 'II' }, p).ok, true);
});

test('la concessione del Direttore abilita il passaggio senza toccare i PX; annullata, non vale più', () => {
  const c = aggiungiCorrezione([], concessione(7));
  assert.equal(permessoSalita({ livello: 6, px: 600, atto: 'III', correzioni: c }, p).ok, true);
  assert.equal(permessoSalita({ livello: 7, px: 600, atto: 'III', correzioni: c }, p).ok, false, 'una concessione vale per un livello solo');
  assert.equal(livelloConsentito(600, 'III', c, p), 7);
  assert.deepEqual(concessioniLivello(c).map((x) => x.motivo), ['recupero di una partita']);
  const annullata = annullaCorrezione(c, c[0].id);
  assert.equal(permessoSalita({ livello: 6, px: 600, atto: 'III', correzioni: annullata }, p).ok, false);
});

test('un livello più dei PX: lo sfasamento si vede, «Tieni come concessione» lo chiude', () => {
  let s = sfasamento({ livello: 7, px: 600, atto: 'III' }, p);
  assert.equal(s.oltre, 1);
  assert.equal(s.livelloPx, 6);
  s = sfasamento({ livello: 7, px: 600, atto: 'III', correzioni: aggiungiCorrezione([], concessione(7)) }, p);
  assert.equal(s.oltre, 0);
  assert.equal(sfasamento({ livello: 7, px: null, atto: 'III' }, p), null, 'senza PX non si confronta niente');
});

test('le scelte di un livello si raccontano in parole (per «Annulla l’ultimo livello»)', () => {
  assert.deepEqual(scelteDelLivello({ livello: 5, talentoLibero: { id: 'tecniche-interiori-supplementari' }, tecniche: ['vista-felina', 'salto-della-rana'] }),
    ['Talento Libero: tecniche-interiori-supplementari', 'Tecniche Interiori: vista-felina, salto-della-rana']);
  assert.deepEqual(scelteDelLivello({ livello: 3 }), []);
});

test('controllaLivelloDaTablet: sale solo fino al livello dei PX del disco; scendere è sempre ammesso', () => {
  const liv = (n, px, extra = {}) => ({ scelte: { puntiEsperienza: px }, livelli: Array.from({ length: n - 1 }, (_, i) => ({ livello: i + 2 })), ...extra });
  const ctx = { atto: 'III', p };
  assert.equal(controllaLivelloDaTablet(liv(7, 600), liv(6, 600), ctx).ok, false);
  assert.equal(controllaLivelloDaTablet(liv(7, 99999), liv(6, 600), ctx).ok, false, 'i PX scritti dal tablet non contano: valgono quelli del disco');
  assert.equal(controllaLivelloDaTablet(liv(7, 600), liv(6, 720), ctx).ok, true);
  assert.equal(controllaLivelloDaTablet(liv(6, 600), liv(6, 600), ctx).ok, true, 'stesso livello: niente da controllare');
  assert.equal(controllaLivelloDaTablet(liv(5, 600), liv(6, 600), ctx).ok, true, 'annullare un livello è ammesso');
  const conc = { ...liv(6, 600), correzioni_master: aggiungiCorrezione([], concessione(7)) };
  assert.equal(controllaLivelloDaTablet(liv(7, 600), conc, ctx).ok, true, 'concessione scritta dal Direttore sul disco');
  assert.equal(controllaLivelloDaTablet({ ...liv(7, 600), correzioni_master: aggiungiCorrezione([], concessione(7)) }, liv(6, 600), ctx).ok, false, 'la concessione scritta dal tablet non vale');
  assert.equal(controllaLivelloDaTablet(liv(9, 5000), liv(8, 5000), { atto: 'I', p }).ok, false, 'oltre il limite dell’Atto');
  assert.equal(controllaLivelloDaTablet(liv(1, 0), null, ctx).ok, true, 'file nuovo al livello 1');
  assert.equal(controllaLivelloDaTablet(liv(6, 0), null, ctx).ok, true, 'un PG portato da fuori entra com’è: lo segnala la scheda');
});

// --- dal server vero ---
const radice = mkdtempSync(join(tmpdir(), 'mutant-a187-'));
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

const aiko = JSON.parse(readFileSync(new URL('../esempi/Aiko-Tenzan_liv5_2026-10-02.json', import.meta.url), 'utf8'));
const livelliDi = (n) => Array.from({ length: n - 1 }, (_, i) => aiko.livelli[i] ?? { livello: i + 2 });
const fileDi = (n, px, extra = {}) => ({ ...aiko, scelte: { ...aiko.scelte, puntiEsperienza: px }, livelli: livelliDi(n), ...extra });

test('dal server: il tablet non registra un livello senza PX; il Direttore sì; la concessione lo sblocca', async () => {
  const file = 'Prova-A187_liv5_2026-10-28.json';
  const url = (b) => `${b}/api/personaggi/${encodeURIComponent(file)}`;
  const scrivi = (b, o, extra = {}) => fetch(url(b), { method: 'PUT', headers: extra, body: JSON.stringify(o) });
  const letto = () => JSON.parse(readFileSync(join(c.personaggi, file), 'utf8'));
  const tablet = { 'X-Mutant-Da': 'giocatore' };

  // il Direttore parte da un PG al 5° con 340 PX (soglia del livello 5)
  assert.equal((await scrivi(baseMaster, fileDi(5, 340))).status, 200);
  // il tablet prova il 6° (servono 520): rifiutato, il file non cambia
  const r = await scrivi(baseTablet, fileDi(6, 9999), tablet);
  assert.equal(r.status, 403);
  const j = await r.json();
  assert.match(j.errore, /livello 6 non è ancora raggiunto/);
  assert.equal(j.livelloPx, true);
  assert.equal(letto().livelli.length, 4);
  // lo stesso senza le intestazioni del tablet-giocatore (client senza intestazione)
  assert.equal((await scrivi(baseTablet, fileDi(6, 340))).status, 403);
  // stesso livello e livello più basso passano
  assert.equal((await scrivi(baseTablet, fileDi(5, 340), tablet)).status, 200);
  assert.equal((await scrivi(baseTablet, fileDi(4, 340), tablet)).status, 200);
  assert.equal(letto().livelli.length, 3);
  // il Direttore (PC del server) può scrivere il livello in più: è la sua concessione o il suo lavoro
  assert.equal((await scrivi(baseMaster, fileDi(6, 340))).status, 200);
  assert.equal(letto().livelli.length, 5);
  // con 520 PX assegnati dal Direttore il tablet sale
  assert.equal((await scrivi(baseMaster, fileDi(5, 520))).status, 200);
  assert.equal((await scrivi(baseTablet, fileDi(6, 520), tablet)).status, 200);
  assert.equal(letto().livelli.length, 5);
  // e il 7° (720) no
  assert.equal((await scrivi(baseTablet, fileDi(7, 520), tablet)).status, 403);
  // concessione del Direttore per il 7°: il tablet sale, i PX restano 520
  const conc = aggiungiCorrezione([], concessione(7));
  assert.equal((await scrivi(baseMaster, fileDi(6, 520, { correzioni_master: conc }))).status, 200);
  assert.equal((await scrivi(baseTablet, fileDi(7, 520), tablet)).status, 200);
  assert.equal(letto().scelte.puntiEsperienza, 520);
  assert.equal(letto().livelli.length, 6);
  assert.equal(letto().correzioni_master.length, 1, 'la concessione del Direttore resta nel file');
});

test('dal server: l’Atto corrente viene dai PX del Direttore; il ping lo dice ai tablet', async () => {
  const file = 'Prova-A187b_liv8_2026-10-28.json';
  const url = (b) => `${b}/api/personaggi/${encodeURIComponent(file)}`;
  const scrivi = (b, o) => fetch(url(b), { method: 'PUT', headers: { 'X-Mutant-Da': 'giocatore' }, body: JSON.stringify(o) });
  assert.equal((await fetch(url(baseMaster), { method: 'PUT', body: JSON.stringify(fileDi(8, 9000)) })).status, 200);
  assert.equal((await (await fetch(`${baseTablet}/api/ping`)).json()).atto, 'I', 'senza px.json, l’Atto di partenza');
  assert.equal((await scrivi(baseTablet, fileDi(9, 9000))).status, 403, 'Atto I: massimo livello 8');
  writeFileSync(join(c.px, 'px.json'), JSON.stringify({ impostazioni: { baseline: 520, atto: 'II' }, partite: [], giocatori: [] }));
  assert.equal((await (await fetch(`${baseTablet}/api/ping`)).json()).atto, 'II');
  assert.equal((await scrivi(baseTablet, fileDi(9, 9000))).status, 200, 'Atto II: arriva al 12');
});
