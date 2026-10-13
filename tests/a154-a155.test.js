// A.154 e A.155 (risposte di Davide del 10/10/2026): peso della cartuccia del decontaminante e profilo fisico
// delle pergamene. Valori nei dati; nel carico contano come gli altri oggetti, per esemplare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { catalogo, risolvi } from '../src/equipaggiamento.js';
import { calcolaCarico } from '../src/carico.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, inizializzaSessione } from '../src/sessione.js';
import { oggettiConPi, oggettiRotti } from '../src/protezione.js';
import { consumabiliMistici, motivoNonUsabile, usaConsumabile } from '../src/consumabili-mistici.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const PERGAMENA = 'artefatti:pergamena-di-cura-ferite-3';

/** Il carico di un PG con le voci date. */
function carico(equipaggiamento) {
  const pg = { ...MISHIMA_AGENTE, equipaggiamento };
  const scheda = calcolaScheda({ creazione: pg, livelli: [] }, dati);
  return calcolaCarico(scheda, inizializzaSessione(massimiSessione(scheda, pg, dati)), dati);
}

test('A.154: la cartuccia del decontaminante pesa 0,5 kg e conta nel carico', () => {
  const c = cat.perRif.get('esplorazione:cartuccia-di-decontaminante');
  assert.equal(c.peso, 0.5);
  assert.equal(c['TODO(Davide)'], undefined);
  assert.match(c['_nota_a154'], /A\.154/);
  const k = carico([{ uid: 'c1', rif: 'esplorazione:cartuccia-di-decontaminante', stato: 'zaino', quantita: 2, note: '' }]);
  assert.equal(k.righe.find((r) => /[Cc]artuccia/.test(r.nome)).peso, 1, 'due cartucce: 1 kg');
  assert.ok(!k.senzaPeso.some((n) => /[Cc]artuccia/.test(n)), 'niente più «peso da definire»');
});

test('A.154: il peso non scende con le dosi usate', () => {
  // l'app non ricalcola il peso dalle applicazioni: resta quello del catalogo finché la voce è nell'inventario
  const voce = { uid: 'c1', rif: 'esplorazione:cartuccia-di-decontaminante', stato: 'zaino', quantita: 1, note: '', applicazioni: 1 };
  assert.equal(carico([voce]).peso, 0.5);
  assert.equal(carico([{ ...voce, applicazioni: 5 }]).peso, 0.5);
});

test('A.155: la pergamena pesa 0,1 kg per esemplare e ha 1 PI', () => {
  const p = cat.perRif.get(PERGAMENA);
  assert.deepEqual([p.peso, p.qualita, p.ps_int, p.pi], [0.1, 'Comune', 10, 1]);
  const k = carico([{ uid: 'p1', rif: PERGAMENA, stato: 'zaino', quantita: 3, note: '' }]);
  assert.equal(k.righe.find((r) => /Pergamena/.test(r.nome)).peso, 0.3, 'tre pergamene: 0,3 kg');
  const o = risolvi({ uid: 'p1', rif: PERGAMENA, stato: 'zaino', quantita: 1, note: '' }, cat);
  const pi = oggettiConPi([o], dati).find((x) => x.uid === 'p1');
  assert.deepEqual([pi.piMax, pi.ps], [1, 10], 'Integrità per esemplare');
});

test('A.155: a 0 PI la pergamena non si attiva, ma l’app avvisa senza bloccare', () => {
  const voci = [{ uid: 'p1', rif: PERGAMENA, stato: 'zaino', quantita: 2, note: '' }];
  const x = consumabiliMistici(voci, dati).find((c) => c.uid === 'p1');
  assert.equal(motivoNonUsabile(x, {}), null, 'integra si usa');
  const rotti = oggettiRotti({ integrita: { p1: 0 } }, dati);
  assert.ok(rotti.has('p1'), 'a 0 PI è Rotta');
  assert.match(motivoNonUsabile(x, { rotti }), /0 PI.*A\.155/, 'il motivo lo dice');
  // «Usa» non parte da solo, ma con «Procedi comunque» del master sì (N2)
  assert.equal(usaConsumabile(voci, 'p1', dati, { rotti }), null);
  assert.equal(usaConsumabile(voci, 'p1', dati, { rotti, forza: true }).rimasti, 1);
});

test('A.155: vale per tutti i Gradi e anche per le pergamene create', async () => {
  for (const id of ['pergamena-di-cura-ferite-3', 'pergamena-di-individuare-6', 'pergamena-di-rigenerazione-9']) {
    const o = cat.perRif.get(`artefatti:${id}`);
    assert.deepEqual([o.peso, o.qualita, o.ps_int, o.pi], [0.1, 'Comune', 10, 1], id);
  }
  // il profilo sta anche nel supporto «Pergamena standard», da cui lo prende «Crea consumabile»
  const S = dati.equipaggiamento.file.artefatti.consumabili.supporti.find((x) => x.id === 'pergamena');
  assert.deepEqual([S.peso, S.qualita, S.ps_int, S.pi], [0.1, 'Comune', 10, 1]);
  assert.match(S.nota, /A.155/);
  const sorgente = (await import('node:fs')).readFileSync(new URL('../src/consumabili-mistici.js', import.meta.url), 'utf8');
  assert.ok(sorgente.includes("const fisico = Object.fromEntries(['peso', 'qualita', 'ps_int', 'pi']"));
  assert.ok(sorgente.includes("tipo: 'artefatto', ...fisico,"), 'la pergamena creata nasce con peso e PI');
});
