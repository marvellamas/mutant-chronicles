// Lotto 164 (02/11/2026): risposte di Davide del 02/11/2026.
//  - A.231: il progetto di Paradise parte dalla CyberArma originale di Park (frammento Viola, Corruzione 1) che Dimitri ha
//    già nell'inventario. Il Direttore la riconduce a quell'esemplare; «Consegna l'arma» aggiorna LA STESSA voce, con
//    provenienza e storico, senza creare una seconda CyberArma; il modulo esce dalla spada donatrice; il Viola estratto
//    resta un oggetto a parte; nomi «CyberArma Park» (storico) e «CyberArma Dimitri» (profilo attuale).
//  - A.235: famiglia e Specializzazione seguono la forma, una sola pertinente; la frusta non dà da sola Immobilizzare a
//    distanza; peso e Integrità per esemplare (Park: 0,5 kg, Non Comune, PS 12, 4 PI); costruzione solo per i Custodi, con
//    la procedura base del Custode con Maestro d'Arma.
// Il personaggio è una copia (fixture del 04/10) con la voce della CyberArma aggiunta come nel file vero del 26/10.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { conManifestazione } from '../src/manifestazione.js';
import { catalogo, risolvi } from '../src/equipaggiamento.js';
import { proteggiBlocchiMaster } from '../src/correzioni-master.js';
import { apriProgetto, scegliForma, registraTentativo, chiudiProgetto, consegnaArma, riconduciEsemplare, esemplariDi, modelliProgetto } from '../src/progetti.js';

const { dati } = await datiReali();
const FILE = new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url);
const Q = '2026-11-02T18:00:00.000Z';
const CYBER = 'emvozv1rs1re4'; // l'uid della voce nel file di Dimitri del 26/10
const SPADA = 'armi_corporative:spada-elettrificata-csa-404';
const SCHEGGIA = 'artefatti:scheggia-instabile-da-5-pm-chroma-verde';
const VIOLA = 'artefatti:chroma-viola-frammento';
const modello = () => modelliProgetto(dati).find((m) => m.id === 'paradise-dimitri');
const cyberarme = (eq) => esemplariDi(eq, modello());

/** Dimitri (copia), con la CyberArma «pronta» come nel file del 26/10 (aggiunta senza storico). */
function dimitri({ cyber = 1 } = {}) {
  const p = deserializzaPersonaggio(readFileSync(FILE, 'utf8'));
  const c = normalizza(p.creazione, dati).scelte;
  const extra = Array.from({ length: cyber }, (_, i) => ({ uid: i ? `${CYBER}${i}` : CYBER, rif: 'armi:cyberarma', stato: 'pronta', quantita: 1, note: '' }));
  return { creazione: { ...c, equipaggiamento: [...c.equipaggiamento, ...extra] }, livelli: p.livelli, sessione: p.sessione };
}
/** Il progetto fatto: forma scelta dal giocatore, tre giorni riusciti, chiuso dal Direttore. */
function progettoFatto(forma = 'lancia') {
  let r = apriProgetto([], 'paradise-dimitri', dati, { quando: Q });
  const id = r.progetto.id;
  r = scegliForma(r.lista, id, forma, dati, { quando: Q, da: 'giocatore' });
  for (const n of [1, 2, 3]) r = registraTentativo(r.lista, id, n, 'successo', { quando: Q });
  r = chiudiProgetto(r.lista, id, 'riuscito', { quando: Q });
  return { lista: r.lista, id };
}
function consegnato(d = dimitri(), opz = {}) {
  const ric = riconduciEsemplare(d.creazione, CYBER, dati, { quando: Q, master: true });
  assert.ok(!ric.errore, ric.errore);
  const { lista, id } = progettoFatto();
  const spada = ric.creazione.equipaggiamento.find((v) => v.rif === SPADA);
  const scheggia = ric.creazione.equipaggiamento.find((v) => v.rif === SCHEGGIA);
  const k = consegnaArma({ ...ric.creazione, progettiMaster: lista }, id, dati, { quando: Q, master: true, donatore: spada.uid, scheggia: scheggia.uid, uid: 'viola1', ...opz });
  return { k, spada, scheggia, prima: ric.creazione };
}

test('A.231: la voce che c’è si riconduce all’esemplare di Park (solo il Direttore), senza modifiche eseguite', () => {
  const d = dimitri();
  assert.ok(riconduciEsemplare(d.creazione, CYBER, dati, { quando: Q }).errore, 'non dal giocatore');
  const r = riconduciEsemplare(d.creazione, CYBER, dati, { quando: Q, master: true });
  const v = r.voce;
  assert.deepEqual([v.esemplare.nome, v.esemplare.focalizzatore, v.esemplare.corruzione], ['CyberArma Park', 'Viola', 'Corruzione 1']);
  assert.equal(v.modulatore_neurale, undefined, 'la presenza non certifica le modifiche');
  assert.equal(v.esemplare.storico.length, 1);
  assert.equal(cyberarme(r.creazione.equipaggiamento).length, 1);
  assert.equal(risolvi(v, catalogo(dati)).nome, 'CyberArma Park');
  assert.ok(riconduciEsemplare(r.creazione, CYBER, dati, { quando: Q, master: true }).errore, 'una volta sola');
  // il file conserva nome, focalizzatore e storico
  const riletto = normalizza(deserializzaPersonaggio(serializza(r.creazione, { livelli: d.livelli })).creazione, dati).scelte;
  assert.deepEqual(riletto.equipaggiamento.find((x) => x.uid === CYBER).esemplare, v.esemplare);
});

test('A.231: «Consegna l’arma» aggiorna LA STESSA CyberArma: mai due', () => {
  const { k, spada, scheggia, prima } = consegnato();
  assert.ok(!k.errore, k.errore);
  const eq = k.creazione.equipaggiamento;
  // IL PUNTO DA NON SBAGLIARE: dopo la consegna c'è una CyberArma sola, quella di prima
  assert.equal(cyberarme(eq).length, 1, `CyberArme nell’inventario: ${cyberarme(eq).map((v) => v.uid).join(', ')}`);
  assert.equal(cyberarme(eq)[0].uid, CYBER);
  assert.equal(eq.length, prima.equipaggiamento.length - 1 + 1, 'esce la scheggia, entra il Viola estratto, nient’altro');
  const v = eq.find((x) => x.uid === CYBER);
  assert.deepEqual([v.manifestazione, v.modulatore_neurale, v.esemplare.nome, v.esemplare.nome_originale, v.esemplare.focalizzatore], ['lancia', true, 'CyberArma Dimitri', 'CyberArma Park', 'Verde']);
  assert.equal(v.esemplare.provenienza, 'CyberArma originale di Park, recuperata', 'la provenienza resta');
  assert.equal(v.esemplare.corruzione, undefined, 'la Corruzione esce con il frammento Viola');
  assert.match(v.esemplare.storico[0].cosa, /focalizzatore Viola, Corruzione 1/, 'e resta nello storico del profilo originario');
  assert.equal(v.stato, 'pronta', 'lo stato della voce resta del giocatore');
  // storico: profilo Park, poi le modifiche confermate sotto «CyberArma Dimitri», con data ed esito
  assert.deepEqual(v.esemplare.storico.map((x) => x.nome), ['CyberArma Park', 'CyberArma Dimitri']);
  assert.equal(v.esemplare.storico[1].esito, 'Riuscito');
  assert.match(v.esemplare.storico[1].cosa, /focalizzatore Verde al posto del Viola.*modulo SIN.*Lancia/);
  // la spada donatrice perde il modulo; la scheggia è diventata il focalizzatore
  assert.equal(eq.find((x) => x.uid === spada.uid).sin_rimosso.quando, Q);
  assert.ok(!eq.some((x) => x.uid === scheggia.uid));
  // il Viola estratto: oggetto a parte, con Corruzione e contenimento
  const viola = eq.find((x) => x.rif === VIOLA);
  assert.equal(viola.uid, 'viola1');
  assert.match(viola.esemplare.nome, /Viola estratto dalla CyberArma Park/);
  assert.equal(viola.esemplare.corruzione, 'Corruzione 1');
  assert.match(viola.esemplare.contenimento, /Direttore/);
  // una seconda consegna non c'è
  assert.ok(consegnaArma(k.creazione, k.creazione.progettiMaster[0].id, dati, { quando: Q, master: true, uid: 'x' }).errore);
  // salvato e riletto: una CyberArma sola, lo storico c'è
  const riletto = normalizza(deserializzaPersonaggio(serializza(k.creazione, { livelli: [] })).creazione, dati).scelte;
  assert.equal(cyberarme(riletto.equipaggiamento).length, 1);
  assert.equal(riletto.equipaggiamento.find((x) => x.uid === CYBER).esemplare.storico.length, 2);
});

test('A.231: la scheda chiama l’arma «CyberArma Dimitri», con forma, SIN del modulatore e profilo del Tecnomante', () => {
  const { k, spada } = consegnato();
  const eq = k.creazione.equipaggiamento.map((x) => (x.uid === CYBER ? { ...x, stato: 'impugnata', sintonizzato: true } : x.uid === spada.uid ? { ...x, stato: 'impugnata' } : x));
  const s = calcolaScheda({ creazione: { ...k.creazione, equipaggiamento: eq }, livelli: dimitri().livelli }, dati);
  const ca = s.equipaggiamento.armi.find((a) => String(a.uid).split(':')[0] === CYBER);
  assert.equal(ca.nome, 'CyberArma Dimitri');
  assert.deepEqual([ca.mani, ca.portataQ], [2, 2]);
  assert.ok(ca.scomposizione.some((x) => /SIN 1 \(modulatore neurale/.test(x.etichetta)));
  assert.equal(s.equipaggiamento.armi.filter((a) => /CyberArma/.test(a.nome)).length, 1);
});

test('A.231: senza la voce o con due CyberArme la consegna si ferma e lo dice', () => {
  const { lista, id } = progettoFatto();
  const senza = dimitri({ cyber: 0 });
  const r0 = consegnaArma({ ...senza.creazione, progettiMaster: lista }, id, dati, { quando: Q, master: true, uid: 'x' });
  assert.match(r0.errore, /non c’è la CyberArma da modificare/);
  const due = dimitri({ cyber: 2 });
  const r2 = consegnaArma({ ...due.creazione, progettiMaster: lista }, id, dati, { quando: Q, master: true, uid: 'x' });
  assert.match(r2.errore, /ci sono 2 CyberArme: scegli/);
  // scelta esplicita: aggiorna quella, le CyberArme restano due (non tre)
  const r = consegnaArma({ ...due.creazione, progettiMaster: lista }, id, dati, { quando: Q, master: true, uid: 'x', esemplare: CYBER });
  assert.equal(cyberarme(r.creazione.equipaggiamento).length, 2);
});

test('A.231: da un tablet l’esemplare e lo storico non cambiano', () => {
  const { k } = consegnato();
  const disco = JSON.parse(serializza(k.creazione, { livelli: [] }));
  const tablet = JSON.parse(JSON.stringify(disco));
  const v = tablet.scelte.equipaggiamento.find((x) => x.uid === CYBER);
  v.esemplare.nome = 'CyberArma Rinominata';
  v.esemplare.storico = [];
  v.modulatore_neurale = false;
  v.stato = 'impugnata'; // questo è del giocatore
  const p = proteggiBlocchiMaster(tablet, disco);
  const w = p.file.scelte.equipaggiamento.find((x) => x.uid === CYBER);
  assert.deepEqual([w.esemplare.nome, w.esemplare.storico.length, w.modulatore_neurale, w.stato], ['CyberArma Dimitri', 2, true, 'impugnata']);
  // una seconda CyberArma copiata da un tablet non entra
  const t2 = JSON.parse(JSON.stringify(disco));
  t2.scelte.equipaggiamento.push({ ...JSON.parse(JSON.stringify(disco.scelte.equipaggiamento.find((x) => x.uid === CYBER))), uid: 'copia' });
  assert.equal(cyberarme(proteggiBlocchiMaster(t2, disco).file.scelte.equipaggiamento).length, 1);
});

test('A.235: famiglia e Specializzazione seguono la forma; la frusta non dà Immobilizzare a distanza; profilo fisso', () => {
  const def = dati.equipaggiamento.file.armi.oggetti.find((o) => o.id === 'cyberarma');
  const attese = { 'lama-lunga': ['Spade', 'specializzazione-spade'], ascia: ['Asce', 'specializzazione-asce'], lancia: ['Armi inastate', 'specializzazione-armi-inastate'], frusta: ['Armi flessibili', 'specializzazione-armi-flessibili'] };
  for (const [forma, [famiglia, spec]] of Object.entries(attese)) {
    const m = conManifestazione(def, { manifestazione: forma }, ['Tecnomante']);
    assert.deepEqual([m.famiglia, m.specializzazione, m.abilita, m.danno, m.for_richiesta, m.natura_danno], [famiglia, spec, 'Armi da mischia', def.danno, def.for_richiesta, def.natura_danno], forma);
  }
  const frusta = def.manifestazioni.elenco.find((f) => f.id === 'frusta');
  assert.match(frusta.nota, /non concede da sola Immobilizzare a distanza/);
  assert.ok(!/Immobilizzare con la Frusta/.test(JSON.stringify(def.manifestazioni)), 'il passaggio della A.166 è corretto');
  assert.match(def.manifestazioni._a235, /una sola Specializzazione pertinente/);
});

test('A.235: peso e Integrità per esemplare (Park); costruzione solo dei Custodi con la procedura base', () => {
  const def = dati.equipaggiamento.file.armi.oggetti.find((o) => o.id === 'cyberarma');
  assert.deepEqual([def.peso, def.qualita, def.ps_int, def.pi], [0.5, 'Non comune', 12, 4]);
  assert.match(def._nota_peso, /per esemplare.*Park.*non diventano obbligatori/);
  const c = def.costruzione;
  assert.match(c.chi, /Soltanto i Custodi.*superata l’autorizzazione alla costruzione della A\.158/);
  assert.deepEqual(c.procedura_base.passi.map((x) => [x.fase, x.prova.abilita, x.prova.modificatore, x.ore, x.cr, x.pm ?? 0]),
    [['Assemblaggio', 'Tecnologia', -4, 16, 1000, 0], ['Infusione', 'Rituali', 0, 1, 250, 3]]);
  assert.deepEqual([c.procedura_base.totale.ore, c.procedura_base.totale.cr, c.procedura_base.totale.pm], [17, 1250, 3]);
  assert.deepEqual([c.procedura_base.progetto.prova.abilita, c.procedura_base.progetto.ore, c.procedura_base.progetto.cr], ['Artefatti', 4, 100]);
  // il totale torna con i passi
  assert.equal(c.procedura_base.passi.reduce((s, x) => s + x.ore, 0), c.procedura_base.totale.ore);
  assert.equal(c.procedura_base.passi.reduce((s, x) => s + x.cr, 0), c.procedura_base.totale.cr);
});

test('A.231: il programma dei tre giorni degli appunti v1.2', () => {
  const m = modello();
  assert.deepEqual(m.giorni.map((g) => g.lavoro), [
    'Studio e progetto',
    'Preparazione della scheggia Verde, sostituzione del Viola e collaudo',
    'Recupero e integrazione del modulo SIN dalla spada Cybertronic, personalizzazione della forma e collaudo finale',
  ]);
  assert.equal(m.esemplare_di_partenza.nome, 'CyberArma Park');
  assert.equal(m.risultato.nome, 'CyberArma Dimitri');
});
