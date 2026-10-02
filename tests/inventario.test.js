// Tab Inventario (docs/layout-sd.md, pezzo 2): stato unico degli oggetti con il deposito comune, peso
// che cambia con lo stato, PI e Ripara degli oggetti dell'Inventario, sezioni per famiglia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { calcolaCarico, provenienzaCarico } from '../src/carico.js';
import { normalizza, serializza, deserializzaPersonaggio } from '../src/character.js';
import { STATO_DEPOSITO, statiInventario, risolvi, catalogo, consumabili } from '../src/equipaggiamento.js';
import { infoRicarica } from '../src/ricarica.js';
import { inizializzaSessione, massimiSessione, variaIntegrita, riparaOggetto } from '../src/sessione.js';
import { SEZIONI_INVENTARIO, sezioneInventario } from '../src/palette.js';
import { preparaStampa } from '../src/stampa.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const pers = (uid, peso, stato = null) => ({ uid, rif: null, personalizzato: { nome: uid, tipo: 'altro', peso }, stato, quantita: 1, note: '' });
const pg = (equipaggiamento) => ({ creazione: { ...MISHIMA_AGENTE, equipaggiamento }, livelli: [] });
const scheda = (equipaggiamento) => calcolaScheda(pg(equipaggiamento), dati);

const LISTA = [
  voce('spada', 'armi:spada-leggera', 'impugnata'),
  voce('arm', 'armature:armatura-civile-leggera', 'indossata'),
  voce('pistola', 'armi_distanza_corporative:belliger', 'pronta'),
  voce('colpi', 'munizioni:proiettili-da-pistola', null, { quantita: 30 }),
  pers('tenda', 12),
];

test('stato unico: il deposito comune è ammesso per ogni tipo, gli altri stati restano quelli del tipo', () => {
  const cat = catalogo(dati);
  const r = (v) => risolvi(v, cat);
  // arma: gli stati del tipo più il deposito; oggetto senza stati: «Con sé» (null) o deposito
  assert.deepEqual(statiInventario(r(LISTA[0])), ['impugnata', 'pronta', 'zaino', STATO_DEPOSITO]);
  assert.deepEqual(statiInventario(r(LISTA[4])), [null, STATO_DEPOSITO]);
  assert.deepEqual(statiInventario(r(LISTA[3])), [null, STATO_DEPOSITO]);
  // normalizza (caricamento, import) tiene il deposito su ogni tipo, senza avvisi
  const inDeposito = LISTA.map((v) => ({ ...v, stato: STATO_DEPOSITO }));
  const n = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: inDeposito }, dati);
  assert.deepEqual(n.scelte.equipaggiamento.map((v) => v.stato), LISTA.map(() => STATO_DEPOSITO));
  assert.deepEqual(n.avvisi, []);
  // uno stato estraneo al tipo si corregge come prima
  const sbagliato = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: [{ ...LISTA[1], stato: 'impugnata' }] }, dati);
  assert.equal(sbagliato.scelte.equipaggiamento[0].stato, 'zaino');
  assert.equal(sbagliato.avvisi.length, 1);
});

test('migrazione: un file salvato prima del deposito comune si apre con gli stati invariati; il deposito si salva e si rilegge', () => {
  const testo = readFileSync(new URL('collaudo/a_imperiale_assaltatore_l8.json', import.meta.url), 'utf8');
  const p = deserializzaPersonaggio(testo);
  const { scelte, avvisi } = normalizza(p.creazione, dati);
  assert.deepEqual(avvisi, []);
  assert.deepEqual(scelte.equipaggiamento.map((v) => v.stato), p.creazione.equipaggiamento.map((v) => v.stato));
  // formato invariato: il deposito è un valore in più dello stesso campo «stato»
  const conDeposito = { ...scelte, equipaggiamento: scelte.equipaggiamento.map((v, i) => (i === 0 ? { ...v, stato: STATO_DEPOSITO } : v)) };
  const riletto = deserializzaPersonaggio(serializza(conDeposito, { versioniDati: {}, livelli: p.livelli, sessione: p.sessione }));
  assert.equal(normalizza(riletto.creazione, dati).scelte.equipaggiamento[0].stato, STATO_DEPOSITO);
});

test('peso: gli oggetti nel deposito comune escono dal carico e compaiono fra gli esclusi della provenienza', () => {
  const addosso = scheda(LISTA);
  const c1 = calcolaCarico(addosso, {}, dati);
  const tenda = c1.righe.find((x) => x.nome === 'tenda');
  assert.equal(tenda.peso, 12);
  const lista2 = LISTA.map((v) => (v.uid === 'tenda' ? { ...v, stato: STATO_DEPOSITO } : v));
  const c2 = calcolaCarico(scheda(lista2), {}, dati);
  assert.equal(c2.peso, Math.round((c1.peso - 12) * 10) / 10);
  assert.deepEqual(c2.esclusi, [{ nome: 'tenda', quantita: 1, peso: 12 }]);
  assert.ok(!c2.righe.some((x) => x.nome === 'tenda'));
  // provenienza del tooltip: le righe che pesano, poi gli esclusi barrati
  const prov = provenienzaCarico(c2);
  assert.equal(prov.totale, `${String(c2.peso).replace('.', ',')} kg${c2.parziale ? ' noti' : ''}`);
  assert.deepEqual(prov.righe.at(-1), { fonte: 'tenda', valore: '12 kg', nota: 'deposito comune: fuori dal carico', escluso: true });
  // tornare «Con sé» rimette il peso
  assert.equal(calcolaCarico(scheda(lista2.map((v) => ({ ...v, stato: v.uid === 'tenda' ? null : v.stato }))), {}, dati).peso, c1.peso);
});

test('deposito comune: l’oggetto non dà effetti né è disponibile al tavolo (armatura, munizioni, applicazioni)', () => {
  const s1 = scheda(LISTA);
  assert.ok(s1.equipaggiamento.ar.totale > 0);
  const s2 = scheda(LISTA.map((v) => (v.uid === 'arm' ? { ...v, stato: STATO_DEPOSITO } : v)));
  assert.equal(s2.equipaggiamento.ar.totale, 0);
  // munizioni: fuori dalle scorte dell'arma e dalla ricarica
  assert.ok(infoRicarica(LISTA, dati).pistola.scorte.some((x) => x.uid === 'colpi'));
  const inDeposito = LISTA.map((v) => (v.uid === 'colpi' ? { ...v, stato: STATO_DEPOSITO } : v));
  assert.deepEqual(infoRicarica(inDeposito, dati).pistola.scorte, []);
  // applicazioni sanitarie: il kit nel deposito non si conta al tavolo
  const kit = [voce('kit', 'sanitario:kit-di-pronto-soccorso-standard', null)];
  assert.equal(consumabili(kit, dati).length, 1);
  assert.deepEqual(consumabili([{ ...kit[0], stato: STATO_DEPOSITO }], dati), []);
});

test('PI e Ripara dalla riga Inventario: la riga di Integrità ha l’uid della voce, anche nel deposito; − e + e la riparazione agiscono su quella', () => {
  const lista = LISTA.map((v) => (v.uid === 'arm' ? { ...v, stato: STATO_DEPOSITO } : v));
  const s = scheda(lista);
  // la riga dell'Inventario trova i suoi PI con lo stesso uid della voce
  const perVoce = new Map(s.equipaggiamento.integrita.map((x) => [x.uid, x]));
  assert.ok(perVoce.has('arm') && perVoce.has('spada'));
  const m = massimiSessione(s, pg(lista).creazione, dati);
  let sess = { ...inizializzaSessione(m), crediti: 500 };
  const max = perVoce.get('arm').piMax;
  sess = variaIntegrita(sess, 'arm', -2, m);
  assert.equal(sess.integrita.arm, max - 2);
  // «Ripara»: PI nuovi e materiali scalati dai crediti (A.46)
  sess = riparaOggetto(sess, 'arm', max, 30, m);
  assert.deepEqual([sess.integrita.arm, sess.crediti], [max, 470]);
});

test('sezioni dell’Inventario: ogni oggetto del catalogo ha una sezione; gli «altro» per capitolo del Manuale dell’Equipaggiamento', () => {
  const cat = catalogo(dati);
  for (const o of cat.perRif.values()) assert.ok(sezioneInventario({ tipo: o.tipo, def: o }), o.rif);
  const di = (rif) => sezioneInventario(risolvi(voce('x', rif, null), cat)).id;
  assert.equal(di('armi:spada-leggera'), 'armi');
  assert.equal(di('armi_distanza_corporative:belliger'), 'armi');
  assert.equal(di('armature:armatura-civile-leggera'), 'protezioni');
  assert.equal(di('munizioni:proiettili-da-pistola'), 'munizioni');
  const primoDi = (file) => `${file}:${dati.equipaggiamento.file[file].oggetti.find((o) => o.tipo === 'altro').id}`;
  assert.equal(di(primoDi('esplorazione')), 'esplorazione');
  assert.equal(di(primoDi('comunicazione')), 'comunicazione');
  assert.equal(di(primoDi('dotazioni_personali')), 'dotazioni_personali');
  assert.equal(sezioneInventario(risolvi(pers('tenda', 12), cat)).id, 'altro');
  // colori: quelli dei gruppi esistenti (contrasto già verificato in palette.js)
  for (const s of SEZIONI_INVENTARIO) assert.match(s.colore, /^cat-/);
});

test('SS: il foglio 3 stampa con lo stato unico; l’oggetto nel deposito è segnato come tale', () => {
  const lista = LISTA.map((v) => (v.uid === 'tenda' ? { ...v, stato: STATO_DEPOSITO } : v));
  const fogli = preparaStampa({ ...pg(lista) }, dati).fogli;
  const testo = JSON.stringify(fogli.find((f) => f.id === 'combattimento').dati);
  assert.match(testo, /tenda \(deposito comune\)/);
});

test('Inventario su due colonne (richiesta di Davide del 02/10): sezioni nell’ordine di Davide, a sinistra e a destra', async () => {
  const { SEZIONI_INVENTARIO } = await import('../src/palette.js');
  const lato = (c) => SEZIONI_INVENTARIO.filter((s) => s.colonna === c).map((s) => s.id);
  assert.deepEqual(lato('sinistra'), ['armi', 'protezioni', 'rinforzi', 'munizioni', 'nec', 'strumenti', 'comunicazione']);
  assert.deepEqual(lato('destra'), ['sanitario', 'artefatti', 'accessori', 'esplorazione', 'dotazioni_personali', 'impianti', 'altro']);
  // su telefono una colonna sola: l'ordine dei dati è prima tutta la sinistra, poi la destra
  assert.deepEqual(SEZIONI_INVENTARIO.map((s) => s.id), [...lato('sinistra'), ...lato('destra')]);
  // sottosezioni: Rinforzi sotto Armature, NEC sotto Munizioni
  assert.deepEqual(SEZIONI_INVENTARIO.filter((s) => s.sottosezioneDi).map((s) => [s.id, s.sottosezioneDi]), [['rinforzi', 'protezioni'], ['nec', 'munizioni']]);
});
