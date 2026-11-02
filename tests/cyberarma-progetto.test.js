// CyberArma riscritta dagli Armamenti 0.74 §§7.25–7.25.4 e dalla scheda «CyberArma Opzioni per Dimitri» 1.0, e il progetto
// di Dimitri a Paradise seguito dal Direttore (src/progetti.js). Il test più importante: l'arma non entra nell'inventario
// senza l'atto esplicito del Direttore (consegnaArma con master), né da un tablet.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { conManifestazione } from '../src/manifestazione.js';
import { usoPerClasse, testoAttivazione } from '../src/attivazione-arma.js';
import { proteggiBlocchiMaster } from '../src/correzioni-master.js';
import {
  modelliProgetto, apriProgetto, scegliForma, registraTentativo, togliUltimoTentativo, chiudiProgetto, riapriProgetto,
  riepilogoProgetto, formaSceglibile, avvisiConsegna, consegnaArma, normalizzaProgetti,
} from '../src/progetti.js';
import { rapportoCyberArma } from '../tools/cyberarma-dimitri.mjs';

const { dati } = await datiReali();
const arma = (id) => dati.equipaggiamento.file.armi.oggetti.find((o) => o.id === id);
const blocco = (rif) => dati.equipaggiamento.file.artefatti.artefatti_catalogo.find((x) => x.rif === rif);
const FILE = new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url);
const Q = '2026-11-01T18:00:00.000Z';

/** Dimitri (copia del 04/10, Tecnomante 6° livello) come lo legge l'app. */
function dimitri() {
  const p = deserializzaPersonaggio(readFileSync(FILE, 'utf8'));
  return { creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli, sessione: p.sessione };
}
const ciber = (eq) => eq.filter((v) => String(v.rif ?? '').startsWith('armi:cyberarma'));

test('catalogo: originale, batteria Verde 10 PM e conversione a NeC dagli Armamenti 0.74', () => {
  const o = arma('cyberarma');
  assert.deepEqual([o.abilita, o.danno.una_mano, o.natura_danno, o.for_richiesta, o.mani, o.portata_q], ['Armi da mischia', '1d8', 'Magico', 3, 1, 1]);
  assert.equal(o.costo, null, 'nessun prezzo unico per gli originali');
  const [cu, te, al] = o.uso_per_classe.classi;
  assert.deepEqual([cu.classe, cu.pm, cu.round, cu.danno_extra, cu.sintonizzazione], ['Custode', 1, 15, 1, 1]);
  assert.deepEqual([te.classe, te.pm, te.round, te.sintonizzazione], ['Tecnomante', 2, 10, 2]);
  assert.equal(al.ammesso, false, 'le altre Classi solo con la conversione a NeC');
  assert.deepEqual(blocco('armi:cyberarma').sintonizzazione_per_classe, { Custode: 1, Tecnomante: 2 });
  // modifiche (§7.25, §7.25.2)
  const m = o.modifiche;
  assert.deepEqual([m.predisposizione_batteria.cr, m.batteria_verde_10_pm.cr, m.conversione_nec.cr, m.modulatore_neurale.cr, m.riconfigurazione.cr], [1000, 2000, 2000, 1500, 300]);
  assert.deepEqual([o.modulatore_neurale.sin, o.modulatore_neurale.classe], [1, 'Tecnomante']);
  // batteria interna Verde da 10 PM, SnT 2; niente più 5 cariche
  const b = arma('cyberarma-batteria-verde');
  assert.equal(b.munizioni, undefined);
  assert.deepEqual([blocco('armi:cyberarma-batteria-verde').contenitore.capacita_pm, blocco('armi:cyberarma-batteria-verde').contenitore.energia, blocco('armi:cyberarma-batteria-verde').sintonizzazione], [10, 'Verde', 2]);
  assert.equal(b.costo_modifica, 3000);
  // conversione a NeC: qualsiasi Classe, 1 carica, 10 Round, SnT 3
  const n = arma('cyberarma-nec');
  const u = usoPerClasse(n, ['Assaltatore']);
  assert.deepEqual([u.nec, u.round, u.sintonizzazione], [1, 10, 3]);
  assert.equal(testoAttivazione(n, { classi: [{ nome: 'Assaltatore' }] }, {}, 'x').costo, '1 carica NeC');
  assert.equal(blocco('armi:cyberarma-nec').sintonizzazione, 3);
});

test('manifestazioni: sei combinazioni di mani e portata; la forma cambia solo mani e portata', () => {
  const o = arma('cyberarma');
  const combo = o.manifestazioni.elenco.map((f) => `${f.mani}/${f.portata_q}`);
  for (const c of ['1/1', '2/1', '1/2', '2/2', '1/3', '2/3']) assert.ok(combo.includes(c), c);
  const picca = conManifestazione(o, { manifestazione: 'picca' }, ['Tecnomante']);
  assert.deepEqual([picca.mani, picca.portata_q, picca.danno.una_mano, picca.abilita, picca.for_richiesta], [2, 3, '1d8', 'Armi da mischia', 3]);
});

test('SnT secondo la Classe: Tecnomante 2, Custode 1', () => {
  const d = dimitri();
  d.creazione.equipaggiamento = [...d.creazione.equipaggiamento, { uid: 'ca', rif: 'armi:cyberarma', stato: 'trasportato', quantita: 1, note: '', sintonizzato: true }];
  const st = calcolaScheda(d, dati).equipaggiamento.sintonizzazione;
  assert.equal(st.artefatti.find((x) => x.uid === 'ca').costo, 2);
  const f = deserializzaPersonaggio(readFileSync(new URL('../esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json', import.meta.url), 'utf8'));
  const custode = { creazione: { ...normalizza(f.creazione, dati).scelte }, livelli: f.livelli };
  custode.creazione.equipaggiamento = [...(custode.creazione.equipaggiamento ?? []), { uid: 'ca', rif: 'armi:cyberarma', stato: 'trasportato', quantita: 1, note: '', sintonizzato: true }];
  assert.equal(calcolaScheda(custode, dati).equipaggiamento.sintonizzazione.artefatti.find((x) => x.uid === 'ca').costo, 1);
});

test('il modello del progetto di Dimitri: tre giorni, prove, ore, risorse, esiti del §24', () => {
  const m = modelliProgetto(dati).find((x) => x.id === 'paradise-dimitri');
  assert.equal(m.rif, 'armi:cyberarma');
  assert.deepEqual(m.giorni.map((g) => [g.n, g.ore, g.prova.abilita, g.prova.modificatore, g.risorse_cr]), [[1, 8, 'Artefatti', -2, 200], [2, 8, 'Tecnologia', -2, 100], [3, 8, 'Tecnologia', -2, 100]]);
  assert.deepEqual(m.budget, { ore: 24, cr: 400 });
  for (const t of ['progetto', 'lavorazione']) assert.deepEqual(Object.keys(m.esiti[t]).sort(), ['fallimento', 'magistrale', 'maldestro', 'successo']);
  assert.ok(m.forma.elenco.length === 6 && m.forma.chi === 'giocatore');
});

test('il Direttore apre il progetto, segna i giorni e un esito fallito; il giocatore sceglie la forma; niente entra nell’inventario', () => {
  const d = dimitri();
  const eq0 = JSON.stringify(d.creazione.equipaggiamento);
  let r = apriProgetto([], 'paradise-dimitri', dati, { quando: Q });
  const id = r.progetto.id;
  // la forma la sceglie il giocatore, prima della lavorazione
  assert.equal(formaSceglibile(r.progetto).si, true);
  assert.ok(scegliForma(r.lista, id, 'inesistente', dati, { quando: Q }).errore);
  r = scegliForma(r.lista, id, 'frusta', dati, { quando: Q, da: 'giocatore' });
  assert.deepEqual([r.progetto.forma.id, r.progetto.forma.da], ['frusta', 'giocatore']);
  // giorni: successo, poi fallimento e maldestro al secondo (le stime seguono il §24), poi successo
  r = registraTentativo(r.lista, id, 1, 'successo', { quando: Q });
  r = registraTentativo(r.lista, id, 2, 'fallimento', { quando: Q, nota: 'scheggia instabile' });
  assert.equal(formaSceglibile(r.progetto).si, false, 'cominciata la lavorazione la forma è fissata');
  assert.ok(scegliForma(r.lista, id, 'lancia', dati, { quando: Q }).errore);
  let s = riepilogoProgetto(r.progetto, dati);
  assert.deepEqual(s.giorni.map((g) => g.stato), ['riuscito', 'da ripetere', 'da fare']);
  r = registraTentativo(r.lista, id, 2, 'maldestro', { quando: Q });
  r = registraTentativo(r.lista, id, 2, 'successo', { quando: Q });
  s = riepilogoProgetto(r.progetto, dati);
  // giorno 1: 8 h, 200 cr; giorno 2: 8 + 4 (dopo il Fallimento) + 8 (dopo il Maldestro) h; 100 + 25 + 100 cr
  assert.deepEqual([s.ore, s.cr], [28, 425]);
  assert.ok(s.avvisi.some((a) => /superano il tempo disponibile/.test(a)) && s.avvisi.some((a) => /superano quelle previste/.test(a)));
  r = togliUltimoTentativo(r.lista, id, 2);
  assert.equal(r.progetto.giorni[1].tentativi.length, 2);
  // chiusura fallita registrata, con la nota
  r = chiudiProgetto(r.lista, id, 'fallito', { quando: Q, nota: 'tempo finito' });
  assert.deepEqual([r.progetto.chiuso.esito, r.progetto.chiuso.nota], ['fallito', 'tempo finito']);
  assert.ok(registraTentativo(r.lista, id, 3, 'successo', { quando: Q }).errore, 'chiuso: niente più tentativi');
  assert.ok(avvisiConsegna(r.progetto, dati).some((a) => /Fallito/.test(a)));
  r = riapriProgetto(r.lista, id);
  assert.equal(r.progetto.chiuso, null);
  // nessuna di queste azioni tocca l'inventario
  assert.equal(JSON.stringify(d.creazione.equipaggiamento), eq0);
});

test('L’ARMA NON ENTRA NELL’INVENTARIO SENZA L’ATTO DEL DIRETTORE', () => {
  const d = dimitri();
  const { lista, progetto } = apriProgetto([], 'paradise-dimitri', dati, { quando: Q });
  const c = { ...d.creazione, progettiMaster: lista };
  // senza master: niente
  for (const opz of [{}, { master: false }, { master: 'si' }]) {
    const r = consegnaArma(c, progetto.id, dati, { quando: Q, uid: 'x', ...opz });
    assert.ok(r.errore, JSON.stringify(opz));
    assert.equal(r.creazione, undefined);
  }
  assert.equal(ciber(c.equipaggiamento).length, 0);
  // il file salvato e riletto non porta armi consegnate
  const riletto = deserializzaPersonaggio(serializza(c, { livelli: d.livelli }));
  assert.equal(ciber(riletto.creazione.equipaggiamento).length, 0);
  // da un tablet: la voce consegnata non passa, nemmeno copiandola
  const disco = JSON.parse(serializza(c, { livelli: d.livelli }));
  const voce = { uid: 'finta', rif: 'armi:cyberarma', stato: 'impugnata', quantita: 1, note: '', manifestazione: 'frusta', consegna: { quando: Q, da: 'Direttore', progetto: progetto.id } };
  const tablet = JSON.parse(JSON.stringify(disco));
  tablet.scelte.equipaggiamento.push(voce);
  const p = proteggiBlocchiMaster(tablet, disco);
  assert.equal(p.ripristinato, true);
  assert.equal(ciber(p.file.scelte.equipaggiamento).length, 0);
});

test('consegna del Direttore: arma con forma, modulatore, chi e quando; spada senza SIN; scheggia uscita; SIN 1 del modulatore', () => {
  const d = dimitri();
  // A.231: il progetto lavora sulla CyberArma che c'è già (nel file vero dal 26/10): la consegna aggiorna quella voce
  d.creazione.equipaggiamento = [...d.creazione.equipaggiamento, { uid: 'ca1', rif: 'armi:cyberarma', stato: 'pronta', quantita: 1, note: '' }];
  const spada = d.creazione.equipaggiamento.find((v) => v.rif === 'armi_corporative:spada-elettrificata-csa-404');
  const schegge = d.creazione.equipaggiamento.filter((v) => v.rif === 'artefatti:scheggia-instabile-da-5-pm-chroma-verde');
  let r = apriProgetto([], 'paradise-dimitri', dati, { quando: Q });
  r = scegliForma(r.lista, r.progetto.id, 'lancia', dati, { quando: Q });
  const c = { ...d.creazione, progettiMaster: r.lista };
  const k = consegnaArma(c, r.progetto.id, dati, { quando: Q, master: true, donatore: spada.uid, scheggia: schegge[0].uid, provenienza: 'l’originale di Park (A.231)', uid: 'viola' });
  assert.ok(!k.errore, k.errore);
  assert.equal(ciber(k.creazione.equipaggiamento).length, 1, 'la stessa CyberArma, non una seconda');
  const v = k.creazione.equipaggiamento.find((x) => x.uid === 'ca1');
  assert.deepEqual([v.rif, v.manifestazione, v.modulatore_neurale, v.consegna.da, v.consegna.quando, v.consegna.progetto], ['armi:cyberarma', 'lancia', true, 'Direttore', Q, r.progetto.id]);
  assert.equal(v.esemplare.provenienza, 'l’originale di Park (A.231)');
  assert.equal(k.creazione.equipaggiamento.find((x) => x.uid === spada.uid).sin_rimosso.quando, Q);
  assert.equal(k.creazione.equipaggiamento.filter((x) => x.rif === 'artefatti:scheggia-instabile-da-5-pm-chroma-verde').length, schegge.length - 1);
  assert.deepEqual(k.creazione.progettiMaster[0].consegna.donatore.uid, spada.uid);
  assert.ok(consegnaArma(k.creazione, r.progetto.id, dati, { quando: Q, master: true, uid: 'ca2' }).errore, 'una sola consegna');
  // sulla scheda: CyberArma in mano con SIN 1 del modulatore, 2 mani e portata 2 Q (lancia); la spada senza SIN
  const eq = k.creazione.equipaggiamento.map((x) => (x.uid === 'ca1' ? { ...x, stato: 'impugnata', sintonizzato: true } : x.uid === spada.uid ? { ...x, stato: 'impugnata' } : x));
  const s = calcolaScheda({ ...d, creazione: { ...k.creazione, equipaggiamento: eq } }, dati);
  const ca = s.equipaggiamento.armi.find((a) => String(a.uid).split(':')[0] === 'ca1');
  assert.ok(ca.scomposizione.some((x) => /SIN 1 \(modulatore neurale/.test(x.etichetta) && x.valore === 1));
  assert.deepEqual([ca.mani, ca.portataQ], [2, 2]);
  const sp = s.equipaggiamento.armi.find((a) => String(a.uid).split(':')[0] === spada.uid);
  assert.ok(!sp.scomposizione.some((x) => /SIN/.test(x.etichetta)), 'la spada donatrice ha perso il SIN');
  // il file lo conserva: progetto, consegna e campi dell'esemplare
  const riletto = deserializzaPersonaggio(serializza(k.creazione, { livelli: d.livelli }));
  const rc = normalizza(riletto.creazione, dati).scelte;
  assert.equal(rc.progettiMaster[0].consegna.uid, 'ca1');
  assert.deepEqual(rc.equipaggiamento.find((x) => x.uid === 'ca1').consegna, { quando: Q, da: 'Direttore', progetto: r.progetto.id });
});

test('tablet: nei progetti cambia solo la forma, e solo finché è sceglibile; non crea progetti', () => {
  const d = dimitri();
  const { lista, progetto } = apriProgetto([], 'paradise-dimitri', dati, { quando: Q });
  const disco = JSON.parse(serializza({ ...d.creazione, progettiMaster: lista }, { livelli: d.livelli }));
  // forma dal tablet: passa
  const t1 = JSON.parse(JSON.stringify(disco));
  t1.progetti_master[0].forma = { id: 'frusta', quando: Q, da: 'giocatore' };
  assert.equal(proteggiBlocchiMaster(t1, disco).file.progetti_master[0].forma.id, 'frusta');
  // esiti o chiusura dal tablet: non passano
  const t2 = JSON.parse(JSON.stringify(disco));
  t2.progetti_master[0].giorni[0].tentativi.push({ esito: 'successo', quando: Q });
  t2.progetti_master[0].chiuso = { esito: 'riuscito', quando: Q };
  const p2 = proteggiBlocchiMaster(t2, disco).file.progetti_master[0];
  assert.deepEqual([p2.giorni[0].tentativi.length, p2.chiuso ?? null], [0, null]);
  // forma dopo l'inizio della lavorazione: non passa
  const lavorato = registraTentativo(lista, progetto.id, 1, 'successo', { quando: Q }).lista;
  const disco3 = JSON.parse(serializza({ ...d.creazione, progettiMaster: lavorato }, { livelli: d.livelli }));
  const t3 = JSON.parse(JSON.stringify(disco3));
  t3.progetti_master[0].forma = { id: 'picca', quando: Q };
  assert.equal(proteggiBlocchiMaster(t3, disco3).file.progetti_master[0].forma, null);
  // un tablet non apre progetti
  const senza = JSON.parse(serializza(d.creazione, { livelli: d.livelli }));
  const t4 = JSON.parse(JSON.stringify(senza));
  t4.progetti_master = normalizzaProgetti(lista);
  assert.equal(proteggiBlocchiMaster(t4, senza).file.progetti_master, undefined);
});

test('Dimitri (copia): rapporto in sola lettura, file invariato', () => {
  const prima = readFileSync(FILE, 'utf8');
  // senza la CyberArma (la copia del 04/10): l'avviso che il Direttore la deve aggiungere e ricondurre
  assert.ok(rapportoCyberArma(dimitri(), dati).avvisi.some((a) => /non c’è la CyberArma recuperata da Park/.test(a)));
  // con la voce come nel file del 26/10: la stessa voce, ricondotta e aggiornata (A.231)
  const d = dimitri();
  d.creazione.equipaggiamento = [...d.creazione.equipaggiamento, { uid: 'emvozv1rs1re4', rif: 'armi:cyberarma', stato: 'pronta', quantita: 1, note: '' }];
  const r = rapportoCyberArma(d, dati);
  assert.equal(readFileSync(FILE, 'utf8'), prima);
  assert.deepEqual(r.avvisi, []);
  const v = (cosa) => r.voci.find((x) => x.cosa.startsWith(cosa));
  assert.match(v('CyberArma nell’inventario').oggi, /non ancora ricondotta/);
  assert.match(v('CyberArma nell’inventario').dopo, /la stessa voce \(emvozv1rs1re4\).*nessuna seconda CyberArma/);
  assert.match(v('Frammento Viola').dopo, /oggetto a parte/);
  assert.match(v('Sintonizzazione').dopo, /^5 \/ 11/);
  assert.match(v('CyberArma consegnata').dopo, /SIN 1 del modulatore/);
  assert.match(v('Spada Cybertronic').dopo, /senza SIN/);
});
