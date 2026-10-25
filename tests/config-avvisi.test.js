// La configurazione degli avvisi ntfy sta fuori dalla cartella dell'app (25/10/2026, segnalazione di Davide del
// 24/10: «ogni volta che aggiorno devo reimpostare gli avvisi»; tools/config-avvisi.mjs).
//
// La prova che conta: un aggiornamento simulato che CANCELLA o SOSTITUISCE tutta la cartella dell'app — il caso
// peggiore, quello che nessuna lista di «cartelle locali da non toccare» può garantire — e la configurazione
// resta com'era, perché non stava lì.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  cartellaProfilo, percorsoProfilo, leggiConfigAvvisi, scriviConfigAvvisi, assicuraConfigAvvisi, FILE_LEGACY,
} from '../tools/config-avvisi.mjs';
import { avvisa } from '../tools/avvisi.mjs';
import { statoImpostazioni, salvaAvvisi } from '../tools/impostazioni.mjs';

const T0 = new Date('2026-10-25T09:00:00Z');
const CONF = { attivo: true, ntfy_argomento: 'mutant-bwx2nydllq122yww', nome_pc: 'PC di Davide' };

/** Un PC di prova: una cartella dell'app (con l'esempio tracciato) e un profilo suo, mai quello vero. */
function pc() {
  const base = mkdtempSync(join(tmpdir(), 'mutant-cfg-'));
  const app = join(base, 'mutant');
  mkdirSync(join(app, 'avvisi'), { recursive: true });
  writeFileSync(join(app, 'avvisi', 'avvisi.esempio.json'), JSON.stringify({ attivo: true, ntfy_argomento: 'mutant-bwx2nydllq122yww' }));
  writeFileSync(join(app, 'versione.json'), JSON.stringify({ versione: 'prova' }));
  const profilo = join(base, 'profilo');
  process.env.MUTANT_CONFIG_DIR = profilo;
  return { base, app, profilo };
}
const tira = (x) => rmSync(x.base, { recursive: true, force: true });

test('dove sta: il profilo dell\'utente, mai dentro la cartella dell\'app', () => {
  assert.equal(cartellaProfilo({ env: { MUTANT_CONFIG_DIR: 'X:/qui' } }), 'X:/qui');
  assert.equal(cartellaProfilo({ env: { APPDATA: 'C:\\Users\\Davide\\AppData\\Roaming' }, piattaforma: 'win32' }), join('C:\\Users\\Davide\\AppData\\Roaming', 'Mutant'));
  assert.equal(cartellaProfilo({ env: {}, casa: '/home/davide', piattaforma: 'linux' }), join('/home/davide', '.config', 'mutant'));
  assert.equal(cartellaProfilo({ env: { XDG_CONFIG_HOME: '/cfg' }, casa: '/home/davide', piattaforma: 'linux' }), join('/cfg', 'mutant'));
  // e non dentro l'app: qualunque radice, il percorso non ne fa parte
  const x = pc();
  assert.ok(!percorsoProfilo().startsWith(x.app), 'il file della configurazione non è nella cartella dell\'app');
  tira(x);
});

test('migrazione silenziosa: chi ha già il vecchio avvisi/avvisi.json non deve rifare niente', () => {
  const x = pc();
  writeFileSync(join(x.app, FILE_LEGACY), JSON.stringify(CONF));
  assert.equal(existsSync(percorsoProfilo()), false, 'il profilo è vuoto');
  const r = leggiConfigAvvisi(x.app);
  assert.deepEqual(r.conf, CONF);
  assert.equal(r.origine, 'migrata');
  assert.deepEqual(JSON.parse(readFileSync(percorsoProfilo(), 'utf8')), CONF, 'copiata nel profilo');
  assert.equal(leggiConfigAvvisi(x.app).origine, 'profilo', 'alla lettura dopo è il profilo la fonte');
  tira(x);
});

test('un aggiornamento che cancella TUTTA la cartella dell\'app non porta via la configurazione', () => {
  const x = pc();
  scriviConfigAvvisi(x.app, CONF);
  // l'aggiornamento: git pull che ripulisce, zip che sostituisce, cartella rifatta a mano… la cartella sparisce
  rmSync(x.app, { recursive: true, force: true });
  mkdirSync(join(x.app, 'avvisi'), { recursive: true });
  writeFileSync(join(x.app, 'avvisi', 'avvisi.esempio.json'), JSON.stringify({ attivo: true, ntfy_argomento: 'mutant-bwx2nydllq122yww' }));
  assert.equal(existsSync(join(x.app, FILE_LEGACY)), false, 'il vecchio file è sparito con la cartella');
  const r = leggiConfigAvvisi(x.app);
  assert.deepEqual(r.conf, CONF, 'la configurazione è quella di prima, con il nome del PC');
  assert.equal(r.origine, 'profilo');
  tira(x);
});

test('dopo l\'aggiornamento «Impostazioni» mostra ancora gli avvisi com\'erano, senza chiedere niente', () => {
  const x = pc();
  salvaAvvisi(x.app, { attivo: true, argomento: CONF.ntfy_argomento, nomePc: 'PC di Davide' });
  rmSync(x.app, { recursive: true, force: true });
  mkdirSync(join(x.app, 'avvisi'), { recursive: true });
  const s = statoImpostazioni(x.app).avvisi;
  assert.equal(s.stato, 'acceso');
  assert.equal(s.nomePc, 'PC di Davide');
  assert.equal(s.argomento, CONF.ntfy_argomento);
  assert.equal(statoImpostazioni(x.app).nuova, false, 'non è una installazione nuova: niente procedura guidata');
  tira(x);
});

test('dopo l\'aggiornamento l\'avviso parte lo stesso, col nome del PC di Davide', async () => {
  const x = pc();
  scriviConfigAvvisi(x.app, CONF);
  rmSync(x.app, { recursive: true, force: true });
  mkdirSync(x.app, { recursive: true });
  writeFileSync(join(x.app, 'versione.json'), JSON.stringify({ versione: 'nuova123' }));
  const inviati = [];
  const r = await avvisa('aggiornato', { radice: x.app, adesso: T0, invia: async (c, t) => { inviati.push([c.argomento, t]); return true; } });
  assert.equal(r.mandato, true);
  assert.equal(inviati[0][0], CONF.ntfy_argomento);
  assert.match(inviati[0][1], /PC di Davide/);
  tira(x);
});

test('aggiorna.bat: assicura la configurazione — dal profilo, dal vecchio file, o dall\'esempio la prima volta', () => {
  const x = pc();
  // la prima volta in assoluto: dall'esempio del gruppo
  assert.equal(assicuraConfigAvvisi(x.app), 'creata');
  assert.equal(leggiConfigAvvisi(x.app).conf.ntfy_argomento, 'mutant-bwx2nydllq122yww');
  // già nel profilo: non si tocca (nemmeno se l'esempio dice altro)
  scriviConfigAvvisi(x.app, CONF);
  writeFileSync(join(x.app, 'avvisi', 'avvisi.esempio.json'), JSON.stringify({ attivo: false, ntfy_argomento: 'mutant-altro-argomento-123' }));
  assert.equal(assicuraConfigAvvisi(x.app), 'profilo');
  assert.deepEqual(leggiConfigAvvisi(x.app).conf, CONF, 'non sovrascritta dall\'esempio');
  tira(x);
});

test('se il profilo e il vecchio file differiscono vale il profilo (la fonte)', () => {
  const x = pc();
  scriviConfigAvvisi(x.app, CONF);
  writeFileSync(join(x.app, FILE_LEGACY), JSON.stringify({ attivo: false, ntfy_argomento: 'mutant-vecchissimo-0000' }));
  assert.deepEqual(leggiConfigAvvisi(x.app).conf, CONF);
  tira(x);
});

test('senza niente (né profilo né vecchio file) gli avvisi sono spenti, non rotti', () => {
  const x = pc();
  assert.equal(leggiConfigAvvisi(x.app), null);
  assert.equal(statoImpostazioni(x.app).avvisi.stato, 'mancante');
  tira(x);
});

test('un profilo rovinato non blocca niente: si ricade sul vecchio file', () => {
  const x = pc();
  mkdirSync(x.profilo, { recursive: true });
  writeFileSync(percorsoProfilo(), '{rotto');
  writeFileSync(join(x.app, FILE_LEGACY), JSON.stringify(CONF));
  const r = leggiConfigAvvisi(x.app);
  assert.deepEqual(r.conf, CONF);
  tira(x);
});

test('il salvataggio scrive il profilo e tiene una copia nel vecchio file per chi usa strumenti di prima', () => {
  const x = pc();
  salvaAvvisi(x.app, { attivo: true, argomento: CONF.ntfy_argomento, nomePc: 'PC di Davide' });
  assert.deepEqual(JSON.parse(readFileSync(percorsoProfilo(), 'utf8')), CONF);
  assert.deepEqual(JSON.parse(readFileSync(join(x.app, FILE_LEGACY), 'utf8')), CONF);
  tira(x);
});
