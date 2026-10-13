// Carichini rapidi (A.135, decisione 139; munizioni.json → ricarica.carichini, src/ricarica.js, src/sessione.js):
// Ricarica per Tamburo e per Serbatoio, 6 colpi; un carichino preparato trasferisce fino a 6 colpi in 1 AzP entro gli
// spazi liberi dell'arma, il resto rimane nel carichino; si prepara dalle munizioni sciolte compatibili. Catalogo con i
// dati della A.151 (peso, Qualità, PS Integrità, PI, Reperibilità; approvata il 09/10/2026) e validatore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, inizializzaSessione, variaMunizioni, allineaSessione, caricaDaCarichino, preparaCarichino, ricaricaArma } from '../src/sessione.js';
import { carichiniDi, usaCarichino, riempiCarichino } from '../src/ricarica.js';
import { catalogo } from '../src/equipaggiamento.js';
import { validaDati } from '../src/validate.js';
import { readFileSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { armiStampa } from '../src/stampa.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato = null, quantita = 1) => ({ uid, rif, stato, quantita, note: '' });
const prepara = (voci) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: voci };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  return { m, s: inizializzaSessione(m) };
};

test('catalogo: i due carichini, 6 colpi, 100 e 150 cr a vuoto, con peso, Qualità, PI e Reperibilità della A.151', () => {
  const cat = catalogo(dati);
  const t = cat.perRif.get('accessori_armi:ricarica-per-tamburo');
  const s = cat.perRif.get('accessori_armi:ricarica-per-serbatoio');
  assert.deepEqual([t.nome, t.costo, t.carichino], ['Ricarica per Tamburo', 100, { tipo: 'tamburo', colpi: 6 }]);
  assert.deepEqual([s.nome, s.costo, s.carichino], ['Ricarica per Serbatoio', 150, { tipo: 'serbatoio', colpi: 6 }]);
  // A.151 (approvata il 09/10/2026): i dati che la A.135 lasciava vuoti
  assert.equal(t.peso, 0.1, 'Ricarica per Tamburo: 0,1 kg a vuoto');
  assert.equal(s.peso, 0.2, 'Ricarica per Serbatoio: 0,2 kg a vuoto');
  for (const c of [t, s]) {
    assert.deepEqual([c.qualita, c.ps_int, c.pi, c.reperibilita], ['Comune', 10, 2, 'CO']);
    assert.equal(c['TODO(Davide)'], undefined, 'la domanda è risolta');
  }
  const R = dati.equipaggiamento.file.munizioni.ricarica;
  assert.deepEqual([R.carichini.colpi, R.carichini.per_operazione, R.inserimento_singolo.per_operazione, R.inserimento_singolo.migliorata.per_operazione], [6, 6, 2, 4]);
  assert.equal(R.tamburo, undefined, 'niente più tamburo pieno in 1 AzP');
  assert.match(R.ricarica_rapida.promemoria, /una sola operazione di ricarica gratuita per Round/);
  // validatore: un tipo senza l'oggetto giusto è un errore leggibile
  const d = copia(dati);
  d.equipaggiamento.file.munizioni.ricarica.carichini.tipi.tamburo.rif = 'accessori_armi:mirino-reflex';
  assert.ok(validaDati(d).some((e) => e.chiave === 'ricarica.carichini.tipi.tamburo.rif'));
  assert.deepEqual(validaDati(dati), []);
});

test('il tipo di carichino segue l’arma: tamburo per i revolver, serbatoio per pompa e pallini a serbatoio interno; niente per doppiette e caricatori', () => {
  const { m } = prepara([
    voce('r', 'armi_distanza:revolver'), voce('f', 'armi_distanza:fucile-a-pompa'), voce('h', 'armi_distanza_corporative:hd14m'),
    voce('d', 'armi_distanza:doppietta'), voce('g', 'armi_distanza_corporative:sa-sg2001'),
    voce('ct', 'accessori_armi:ricarica-per-tamburo', null, 2), voce('cs', 'accessori_armi:ricarica-per-serbatoio'),
  ]);
  assert.equal(m.ricarica.r.carichino, 'tamburo');
  assert.deepEqual(m.ricarica.r.carichini.map((c) => [c.uid, c.quantita]), [['ct', 2]]);
  assert.equal(m.ricarica.f.carichino, 'serbatoio');
  assert.equal(m.ricarica.h.carichino, 'serbatoio');
  assert.equal(m.ricarica.d.carichino, null, 'la doppietta ha le canne, non un serbatoio');
  assert.equal(m.ricarica.g.modo, 'caricatore');
  assert.deepEqual(m.carichini, { ct: 2, cs: 1 });
});

test('prepara e usa: 6 colpi in 1 AzP entro gli spazi liberi; il resto rimane nel carichino', () => {
  let { m, s } = prepara([voce('r', 'armi_distanza:revolver', 'impugnata'), voce('p', 'munizioni:proiettili-da-pistola', null, 20), voce('ct', 'accessori_armi:ricarica-per-tamburo', null, 2)]);
  // carichini nuovi: vuoti (si comprano a vuoto)
  assert.deepEqual(carichiniDi(s.carichini, 'ct', 2), [0, 0]);
  assert.equal(usaCarichino(m.ricarica.r, { colpi: 0 }, s.carichini), null, 'carichini vuoti: niente da trasferire');
  assert.deepEqual(caricaDaCarichino(s, 'r', m).munizioni, allineaSessione(s, m).munizioni, 'la sessione non cambia');
  // prepara: riempie un carichino alla volta dalle munizioni sciolte compatibili, che si contano come consumate
  s = preparaCarichino(s, 'r', m);
  s = preparaCarichino(s, 'r', m);
  assert.deepEqual(s.carichini.ct, [6, 6]);
  assert.deepEqual(s.scorte, { p: 12 });
  // revolver con 4 colpi: 2 spazi liberi, il carichino ne trasferisce 2 e ne tiene 4
  s = variaMunizioni(s, 'r', 'colpi', -2, m);
  s = caricaDaCarichino(s, 'r', m);
  assert.equal(s.munizioni.r.colpi, 6);
  assert.deepEqual(s.carichini.ct, [4, 6]);
  // revolver vuoto: il carichino più pieno, 6 colpi in una volta (l'esempio di Davide: 1 AzP con il carichino)
  s = variaMunizioni(s, 'r', 'colpi', -6, m);
  s = caricaDaCarichino(s, 'r', m);
  assert.equal(s.munizioni.r.colpi, 6);
  assert.deepEqual(s.carichini.ct, [4, 0]);
  // arma piena: non si usa
  assert.equal(usaCarichino(m.ricarica.r, s.munizioni.r, s.carichini), null);
  // i colpi dei carichini restano nel salvataggio; tutti vuoti non si scrivono
  assert.deepEqual(allineaSessione({ ...s, carichini: { ct: [0, 0] } }, m).carichini, undefined);
  // la ricarica a mano resta di 2 cartucce
  s = variaMunizioni(s, 'r', 'colpi', -6, m);
  s = ricaricaArma(s, 'r', m);
  assert.equal(s.munizioni.r.colpi, 2);
});

test('prepara con poche munizioni: il carichino si riempie in parte; senza munizioni non si prepara', () => {
  const { m, s } = prepara([voce('f', 'armi_distanza:fucile-a-pompa'), voce('c', 'munizioni:cartucce-a-pallini', null, 4), voce('cs', 'accessori_armi:ricarica-per-serbatoio')]);
  const r = riempiCarichino(m.ricarica.f, s.carichini ?? {}, s.scorte);
  assert.deepEqual([r.inseriti, r.carichini.cs, r.consumi.c], [4, [4], 4]);
  assert.equal(riempiCarichino(m.ricarica.f, r.carichini, r.consumi), null, 'munizioni finite');
});

test('SS: il revolver a una fila di colpi e una fila per ogni carichino; senza carichini come prima', () => {
  const righe = (voci) => { const creazione = { ...MISHIMA_AGENTE, equipaggiamento: voci }; return armiStampa(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati); };
  const con = righe([voce('r', 'armi_distanza:revolver', 'impugnata'), voce('ct', 'accessori_armi:ricarica-per-tamburo', null, 2)]).find((x) => x.nome === 'Revolver');
  assert.deepEqual(con.colpi, { modo: 'inserimento', capacita: 6, file: 1, carichini: { n: 2, colpi: 6 } });
  const senza = righe([voce('f', 'armi_distanza:fucile-a-pompa', 'impugnata')]).find((x) => x.nome === 'Fucile a pompa');
  assert.deepEqual(senza.colpi, { modo: 'inserimento', capacita: 6, file: 1 });
});

// --- A.151 (approvata il 09/10/2026, ripristinata nel Doc il 10/10) ---------------------------------------------

test('A.151: il carichino pesa nel carico, e le cartucce si contano una volta sola', async () => {
  const { calcolaCarico } = await import('../src/carico.js');
  const { calcolaScheda } = await import('../src/calc.js');
  const { massimiSessione, inizializzaSessione } = await import('../src/sessione.js');
  const { MISHIMA_AGENTE } = await import('./personaggi.js');
  const equipaggiamento = [
    { uid: 'e1', rif: 'accessori_armi:ricarica-per-tamburo', stato: 'pronta', quantita: 2, note: '' },
    { uid: 'e2', rif: 'munizioni:proiettili-da-pistola', stato: 'pronta', quantita: 12, note: '' },
  ];
  const pg = { ...MISHIMA_AGENTE, equipaggiamento };
  const scheda = calcolaScheda({ creazione: pg, livelli: [] }, dati);
  const m = massimiSessione(scheda, pg, dati);
  const c = calcolaCarico(scheda, inizializzaSessione(m), dati);
  const riga = c.righe.find((r) => /Ricarica per Tamburo/.test(r.nome));
  assert.ok(riga, 'il carichino pesa (prima non aveva peso)');
  assert.equal(riga.peso, 0.2, 'due carichini da 0,1 kg');
  // le cartucce stanno nella loro voce (una riga sola del carico): il carichino non le conta una seconda volta
  const righeMunizioni = c.righe.filter((r) => /proiettil/i.test(r.nome)).length + c.senzaPeso.filter((n) => /proiettil/i.test(n)).length;
  assert.equal(righeMunizioni, 1, 'ogni cartuccia si conta una volta sola');
  assert.equal(riga.quantita, 2, 'il carichino conta per quanti ne hai');
  assert.ok(!c.senzaPeso.includes('Ricarica per Tamburo'), 'niente più «peso da definire»');
});

test('A.151: a 0 PI il carichino è Rotto; l’app avvisa senza bloccare', async () => {
  const { oggettiConPi, oggettiRotti } = await import('../src/protezione.js');

  const { risolvi, catalogo: cat2 } = await import('../src/equipaggiamento.js');
  const c = cat2(dati);
  const voce = { uid: 'e1', rif: 'accessori_armi:ricarica-per-tamburo', stato: 'pronta', quantita: 1, note: '' };
  const o = risolvi(voce, c);
  const pi = oggettiConPi([o], dati).find((x) => x.uid === 'e1');
  assert.ok(pi, 'il carichino ha i PI (tipo tracciato)');
  assert.deepEqual([pi.piMax, pi.qualita, pi.ps], [2, 'Comune', 10]);
  assert.ok(oggettiRotti({ integrita: { e1: 0 } }, dati).has('e1'), 'a 0 PI è Rotto');
  assert.ok(!oggettiRotti({ integrita: { e1: 1 } }, dati).has('e1'));
  const t = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.match(t, /Rotto, inutilizzabile finché non lo ripari \(A\.151\)/);
  assert.match(t, /azione: `usare \$\{info\.carichini\[0\]\.nome\}`, motivo: motivoRotto/, 'avviso con «Procedi comunque», non un blocco');
});
