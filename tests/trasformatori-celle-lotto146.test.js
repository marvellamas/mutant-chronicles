// Lotto 146 (30/10/2026): celle d'arma, pacchi e trasformatori sulle edizioni nuove (Equipaggiamento 0.22 §5.4, Armamenti 0.68
// §7.20.5–§7.20.6, registro Revisione NEC 2.7). Valori dal manuale; un valore che il manuale non dà resta «da definire».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { contesto, resa, clic } from './scheda-aiuti.js';
import { catalogo, riserveNec } from '../src/equipaggiamento.js';
import { massimiSessione, allineaSessione, ricaricaConTrasformatore } from '../src/sessione.js';
import { calcolaScheda } from '../src/calc.js';
import { elencoTrasformatori, statoTrasformatore, bersagliRicaricabili, fontiCec, pianoRicarica, testoDurata } from '../src/trasformatori.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (rif) => cat.perRif.get(rif);
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'zaino', quantita: 1, note: '', ...extra });

// --- A. celle, pacchi, lanciafiamme, IAS ------------------------------------------------------------------------------------------

test('A: celle d’arma e pacchi in cariche con peso, prezzi, REP e Integrità del §7.20.5; i lanciafiamme sono Rossi', () => {
  const celle = {
    'cella-ravvicinata-comune': [5, 200, 50, 0.1, 'CO'], 'cella-del-fucile-al-plasma-commerciale': [20, 800, 200, 0.3, 'RA'], 'cella-hellblazer': [30, 1200, 300, 0.45, 'RA'],
    'cella-kep-808': [10, 400, 100, 0.15, 'RA'], 'cella-intruder': [30, 1200, 300, 0.45, 'RA'],
  };
  for (const [id, [cariche, costo, ricarica, peso, rep]] of Object.entries(celle)) {
    const c = r(`munizioni:${id}`);
    assert.deepEqual([c.cella.capacita, c.costo, c.cella.ricarica_costo, c.peso, c.reperibilita, c.pi, c.qualita, c.ps_int], [cariche, costo, ricarica, peso, rep, 2, 'Comune', 10], id);
    assert.equal(c.cella.ricarica_costo, cariche * 10, `${id}: 10 cr per carica`);
  }
  // la cella ravvicinata è Rossa o Blu secondo l'effetto; le altre Rosse
  assert.deepEqual(r('munizioni:cella-ravvicinata-comune').accumulatore.colori, ['Rosso', 'Blu']);
  assert.deepEqual(r('munizioni:cella-hellblazer').accumulatore.colori, ['Rosso']);
  // i prezzi delle armi complete non cambiano (§7.20.5: «il prezzo dell'arma completa è invariato»)
  assert.equal(r('armi_distanza_corporative:hellblazer').costo, 9000);
  assert.equal(r('armi_distanza:fucile-al-plasma').costo, 12000);
  // lanciafiamme: pacchi NEC Rossi, un getto una carica
  for (const [id, [getti, costo, ricarica]] of Object.entries({ 'pacco-nec-nemesis-214': [5, 200, 50], 'pacco-nec-lanciafiamme-commerciale': [10, 400, 100], 'pacco-nec-eruptor': [10, 400, 100], 'pacco-nec-purifier': [15, 600, 150], 'pacco-nec-gehemmapuker': [50, 2100, 500] })) {
    const p = r(`munizioni:${id}`);
    assert.deepEqual([p.cella.capacita, p.cella.unita, p.costo, p.cella.ricarica_costo], [getti, 'getti', costo, ricarica], id);
    assert.deepEqual(p.accumulatore.colori, ['Rosso'], id);
    assert.match(p.nome, /NEC Rosso/);
  }
});

test('A: i valori che il manuale non dà restano «da definire» e sono elencati (peso e formato dei pacchi da 15 e 50 getti, raccordo degli IAS)', () => {
  for (const id of ['pacco-nec-purifier', 'pacco-nec-gehemmapuker']) {
    const p = r(`munizioni:${id}`);
    assert.equal(p.peso, undefined, id);
    assert.equal(p.da_definire.length, 2, id);
    assert.match(p.da_definire.join(' '), /raccordo dei pacchi da 15 e 50 getti/);
  }
  // quelli del manuale hanno il peso del NEC corrispondente
  assert.deepEqual(['pacco-nec-nemesis-214', 'pacco-nec-lanciafiamme-commerciale', 'pacco-nec-eruptor'].map((id) => r(`munizioni:${id}`).peso), [0.1, 0.15, 0.15]);
  for (const id of ['ias3100-generatore-blink', 'ias3200-imbracatura-antigravita', 'ias3300-mirrorshard', 'ias3400-disturbatore-metafisico', 'smorzatore-acustico-silent']) {
    const a = r(`corredi_dispositivi:${id}`).alimentazione;
    assert.equal(a.usi, 20, id);
    assert.match(a.descrizione, /10 cr per carica, 200 cr da vuota/);
    assert.match(a.descrizione, /venti ore con trasformatore portatile o tre ore e venti minuti con stazione industriale/);
    assert.equal(a.da_definire.length, 1, id);
  }
});

test('A: ricarica a 10 cr per carica — un IAS da vuoto 200 cr, 20 ore con il portatile, 3 ore e 20 con la stazione (A.191)', () => {
  const T = dati.regole.nec;
  assert.equal(T.tariffe_cr_per_carica.nec * 20, 200);
  assert.equal(testoDurata(20 * T.trasformatori.minuti_per_carica.portatile), '20 ore');
  assert.equal(testoDurata(20 * T.trasformatori.minuti_per_carica.industriale), '3 ore e 20 minuti');
  assert.equal(testoDurata(80), '1 ora e 20 minuti');
  // i 50 cr in un'ora della A.64 non ci sono più nei dati
  assert.ok(!JSON.stringify(r('corredi_dispositivi:ias3100-generatore-blink')).includes('50 cr in 1 ora'));
});

test('A: il Wächter (A.195, ora nel manuale): 12.000 cr, Rara, PS 14, 8 PI, tre cariche Blu; la conversione costa 6.000', () => {
  const w = r('scudi:scudo-punisher-wachter');
  assert.deepEqual([w.costo, w.costo_conversione, w.qualita, w.ps_int, w.pi, w.reperibilita], [12000, 6000, 'Rara', 14, 8, 'MR']);
  assert.deepEqual([w.alimentazione.nec, w.alimentazione.usi], ['nec:nec-blu-3', 3]);
  assert.match(w.note_manuale, /15 ScE/);
  assert.match(w.note_manuale, /30 ScE condivisi/);
  assert.equal(r('scudi:scudo-punisher').costo, 6000 > 0 ? r('scudi:scudo-punisher').costo : 0); // lo Scudo Punisher base non cambia
  const [x] = riserveNec([voce('w', 'scudi:scudo-punisher-wachter')], dati);
  assert.deepEqual([x.massimo, x.unita], [3, 'cariche Blu (barriera 1, cupola 3)']);
});

// --- B. i trasformatori ------------------------------------------------------------------------------------------------------------

test('B: i tre trasformatori del §5.4.7: prezzi, componenti, peso, Integrità, Qualità, PS e REP', () => {
  const t = {
    'trasformatore-portatile-monocromatico': [3000, 1800, 2, 4, 'Non comune', 12, 'NC', 1, 60],
    'trasformatore-portatile-multicromatico': [6000, 3600, 4, 6, 'Non comune', 12, 'RA', 3, 60],
    'stazione-industriale-multicromatica': [20000, 12000, 40, 12, 'Rara', 14, 'RA', 3, 10],
  };
  for (const [id, [costo, comp, kg, pi, q, ps, rep, colori, minuti]] of Object.entries(t)) {
    const o = r(`nec:${id}`);
    assert.deepEqual([o.costo, o.componenti_cr, o.peso, o.pi, o.qualita, o.ps_int, o.reperibilita, o.trasformatore.colori, o.trasformatore.minuti_per_carica, o.trasformatore.tampone], [costo, comp, kg, pi, q, ps, rep, colori, minuti, 100], id);
  }
  assert.equal(elencoTrasformatori([voce('t', 'nec:trasformatore-portatile-monocromatico')], dati).length, 1);
  assert.deepEqual(validaDati(dati), []);
});

test('B: esempio del manuale (§5.4.6): prelievo di una CEC Blu, 3 cariche al Wächter e 5 a un altro NEC → tampone 97 e poi 92, otto ore (80 minuti con la stazione)', () => {
  const t = elencoTrasformatori([voce('t', 'nec:trasformatore-portatile-monocromatico')], dati)[0];
  const fonte = { chiave: 'c#c', nome: 'CEC Blu', cariche: 10 };
  const prima = pianoRicarica({ t, stato: statoTrasformatore({}, 't'), bersaglio: { nome: 'NEC Blu 3', colori: ['Blu'], mancanti: 3 }, colore: 'Blu', fonte }, dati);
  assert.deepEqual([prima.ok, prima.preleva, prima.trasferite, prima.tamponeDopo, prima.durata], [true, true, 3, 97, '3 ore']);
  const seconda = pianoRicarica({ t, stato: { colore: 'Blu', tamponi: { Rosso: 0, Blu: 97, Verde: 0 } }, bersaglio: { nome: 'NEC Blu 5', colori: ['Blu'], mancanti: 5 }, colore: 'Blu', fonte }, dati);
  assert.deepEqual([seconda.ok, seconda.preleva, seconda.trasferite, seconda.tamponeDopo, seconda.durata], [true, false, 5, 92, '5 ore']);
  assert.equal(testoDurata(3 * 60 + 5 * 60), '8 ore');
  const stazione = elencoTrasformatori([voce('s', 'nec:stazione-industriale-multicromatica')], dati)[0];
  const industriale = pianoRicarica({ t: stazione, stato: statoTrasformatore({}, 's'), bersaglio: { nome: 'NEC', colori: ['Blu'], mancanti: 8 }, colore: 'Blu', fonte }, dati);
  assert.equal(industriale.durata, '1 ora e 20 minuti');
  // Wächter da vuoto: tre cariche, tampone 97, tre ore col portatile o mezz'ora con la stazione
  assert.equal(pianoRicarica({ t: stazione, stato: statoTrasformatore({}, 's'), bersaglio: { nome: 'W', colori: ['Blu'], mancanti: 3 }, colore: 'Blu', fonte }, dati).durata, '30 minuti');
});

test('B: il prelievo si fa solo a tampone vuoto; senza una CEC del colore non si ricarica; il colore del monocromatico è fisso; la vicinanza di una Matrice non basta', () => {
  const t = elencoTrasformatori([voce('t', 'nec:trasformatore-portatile-monocromatico')], dati)[0];
  const bersaglio = { nome: 'NEC Rosso 10', colori: ['Rosso'], mancanti: 10 };
  // tampone con 4 cariche e ne servono 10: non si può prelevare (non entra l'intera carica sorgente): trasferisce 4 e avvisa
  const parziale = pianoRicarica({ t, stato: { colore: 'Rosso', tamponi: { Rosso: 4, Blu: 0, Verde: 0 } }, bersaglio, colore: 'Rosso', fonte: { chiave: 'c', nome: 'CEC Rossa', cariche: 5 } }, dati);
  assert.deepEqual([parziale.ok, parziale.preleva, parziale.trasferite, parziale.tamponeDopo, parziale.mancantiDopo], [true, false, 4, 0, 6]);
  assert.match(parziale.avvisi.join(' '), /soltanto a tampone vuoto/);
  // tampone vuoto e nessuna CEC: errore chiaro
  const senza = pianoRicarica({ t, stato: statoTrasformatore({}, 't'), bersaglio, colore: 'Rosso', fonte: null }, dati);
  assert.equal(senza.ok, false);
  assert.match(senza.errore, /non c'è una carica CEC Rosso/);
  // colore fissato alla costruzione
  const fisso = pianoRicarica({ t, stato: { colore: 'Rosso', tamponi: { Rosso: 0, Blu: 0, Verde: 0 } }, bersaglio: { nome: 'NEC Blu', colori: ['Blu'], mancanti: 3 }, colore: 'Blu', fonte: { chiave: 'c', nome: 'CEC', cariche: 1 } }, dati);
  assert.match(fisso.errore, /colore fissato alla costruzione: Rosso/);
  // un NEC Blu non si ricarica con il colore Rosso
  assert.match(pianoRicarica({ t, stato: statoTrasformatore({}, 't'), bersaglio: { nome: 'NEC Blu 5', colori: ['Blu'], mancanti: 5 }, colore: 'Rosso', fonte: { chiave: 'c', nome: 'CEC', cariche: 1 } }, dati).errore, /non è compatibile/);
  // già carico
  assert.match(pianoRicarica({ t, stato: statoTrasformatore({}, 't'), bersaglio: { ...bersaglio, mancanti: 0 }, colore: 'Rosso', fonte: { chiave: 'c', nome: 'CEC', cariche: 1 } }, dati).errore, /già carica/);
  // la regola «niente travaso» resta scritta per tutto il resto (A.67, decisione 76), con la frase del §5.4.6
  assert.equal(dati.regole.nec.travaso.ammesso, false);
  assert.match(dati.regole.nec.trasformatori.senza_trasformatore, /Senza un trasformatore o una stazione industriale non si travasa/);
  assert.match(dati.regole.nec.trasformatori.senza_trasformatore, /sola vicinanza a una Matrice non bastano/);
});

test('B: la ricarica scrive la sessione: cariche al NEC, tampone, una carica in meno alla CEC; la cella dell’arma risale; «da convertire» non si ricarica', () => {
  const equipaggiamento = [voce('t', 'nec:trasformatore-portatile-monocromatico'), voce('c', 'nec:cec-blu'), voce('w', 'nec:nec-blu-3'), voce('k', 'armi_distanza_corporative:kep-808', { stato: 'impugnata' }), voce('s', 'munizioni:cella-kep-808')];
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  let s = allineaSessione({ nec: { 'w#c': 0 }, munizioni: { k: { colpi: 2 } } }, m);
  const voci = equipaggiamento;
  const attuali = () => ({ nec: s.nec, munizioni: s.munizioni });
  // che cosa si può ricaricare: il NEC Blu 3 scarico (mancano 3) e la cella del KEP 808 (10 colpi, ne ha 2); la CEC non si ricarica col trasformatore
  const bersagli = bersagliRicaricabili(voci, attuali(), m.ricarica, dati);
  assert.deepEqual(bersagli.map((b) => [b.id, b.mancanti]), [['w#c', 3], ['cella:k', 8]]);
  assert.deepEqual(bersagli[1].colori, ['Rosso']);
  const t = elencoTrasformatori(voci, dati)[0];
  const fonti = fontiCec(voci, s.nec, 'Blu', dati);
  assert.deepEqual(fonti, [{ chiave: 'c#c', nome: 'CEC Blu', cariche: 10 }]);
  const piano = pianoRicarica({ t, stato: statoTrasformatore(s.trasformatori, 't'), bersaglio: bersagli[0], colore: 'Blu', fonte: fonti[0] }, dati);
  s = ricaricaConTrasformatore(s, { uid: 't', colore: 'Blu', bersaglio: bersagli[0], piano }, m);
  assert.deepEqual([s.nec['w#c'], s.nec['c#c'], s.trasformatori.t.colore, s.trasformatori.t.tamponi.Blu], [3, 9, 'Blu', 97]);
  // la cella dell'arma: il colore Rosso, il tampone Blu è del colore sbagliato; si fissa il colore alla prima ricarica
  const rosso = pianoRicarica({ t, stato: statoTrasformatore(s.trasformatori, 't'), bersaglio: bersagli[1], colore: 'Rosso', fonte: null }, dati);
  assert.equal(rosso.ok, false);
  assert.match(rosso.errore, /colore fissato alla costruzione: Blu/);
  // un trasformatore multicromatico lavora un colore alla volta, con un tampone per colore
  const equip2 = [voce('t', 'nec:trasformatore-portatile-multicromatico'), voce('c', 'nec:cec-rosso'), voce('k', 'armi_distanza_corporative:kep-808', { stato: 'impugnata' }), voce('s', 'munizioni:cella-kep-808')];
  const cr2 = { ...MISHIMA_AGENTE, equipaggiamento: equip2 };
  const m2 = massimiSessione(calcolaScheda({ creazione: cr2, livelli: [] }, dati), cr2, dati);
  let s2 = allineaSessione({ munizioni: { k: { colpi: 2 } } }, m2);
  const t2 = elencoTrasformatori(equip2, dati)[0];
  const b2 = bersagliRicaricabili(equip2, { nec: s2.nec, munizioni: s2.munizioni }, m2.ricarica, dati)[0];
  const p2 = pianoRicarica({ t: t2, stato: statoTrasformatore(s2.trasformatori, 't'), bersaglio: b2, colore: 'Rosso', fonte: fontiCec(equip2, s2.nec, 'Rosso', dati)[0] }, dati);
  assert.deepEqual([p2.ok, p2.trasferite, p2.tamponeDopo, p2.durata], [true, 8, 92, '8 ore']);
  s2 = ricaricaConTrasformatore(s2, { uid: 't', colore: 'Rosso', bersaglio: b2, piano: p2 }, m2);
  assert.deepEqual([s2.munizioni.k.colpi, s2.nec['c#c'], s2.trasformatori.t.tamponi.Rosso, s2.trasformatori.t.colore], [10, 9, 92, null]);
  // un piano non riuscito non cambia niente
  assert.deepEqual(ricaricaConTrasformatore(s2, { uid: 't', colore: 'Rosso', bersaglio: b2, piano: { ok: false } }, m2), s2);
  // «da convertire»: senza numero nessun bersaglio
  const sCon = allineaSessione({ nec: { w: 7 } }, m);
  assert.deepEqual(bersagliRicaricabili(voci, { nec: sCon.nec, munizioni: sCon.munizioni }, m.ricarica, dati).filter((b) => b.tipo === 'nec'), [{ id: 'w#c', ...{} }].slice(1));
});

// --- D. nel browser finto: la riga del trasformatore e il pannello -----------------------------------------------------------------

test('D: Inventario — il trasformatore mostra il tampone e «Ricarica…»: scelgo colore e NEC scarico, vedo trasferite, tampone e tempo, e «Ricarica» chiama l’azione', () => {
  const ESEMPIO = 'Fratello-Anselmo-Viri_liv3_2026-10-02.json';
  const c = contesto(ESEMPIO, {
    attiva: 'inventario',
    scelte: (sc) => { sc.equipaggiamento = [...(sc.equipaggiamento ?? []), voce('xt', 'nec:trasformatore-portatile-monocromatico'), voce('xc', 'nec:cec-blu'), voce('xw', 'nec:nec-blu-3')]; return sc; },
    cambia: (ses) => { ses.nec['xw#c'] = 0; },
  });
  let r1 = resa(c);
  assert.match(r1.testo(), /Tampone/);
  assert.match(r1.testo(), /vuoto cariche NEC · ricarica una carica all’ora/);
  assert.match(r1.testo(), /Senza un trasformatore o una stazione industriale non si travasa/);
  const bottone = (testo) => r1.tutti.find((n) => n.tagName === 'BUTTON' && n.textContent.startsWith(testo));
  clic(bottone('Blu'));
  r1 = resa(c);
  clic(bottone('NEC Blu 3: mancano 3 cariche'));
  r1 = resa(c);
  const riepilogo = r1.classe('riepilogo-trasformatore')[0];
  assert.match(riepilogo.textContent, /Preleva 1 carica da CEC Blu \(10 → 9\): il tampone Blu sale a 100/);
  // (il DOM finto concatena prima i testi e poi gli elementi: si controllano i pezzi)
  for (const pezzo of [/Trasferisce 3 cariche/, /a NEC Blu 3; nel tampone restano 97/]) assert.match(riepilogo.textContent, pezzo);
  assert.match(riepilogo.textContent, /Tempo: 3 ore/);
  clic(bottone('Ricarica (3 ore)'));
  const [nome, az] = c.chiamate.filter(([n]) => n === 'trasformatore').at(-1);
  assert.equal(nome, 'trasformatore');
  assert.deepEqual([az.uid, az.colore, az.bersaglio.chiave, az.piano.trasferite, az.piano.tamponeDopo], ['xt', 'Blu', 'xw#c', 3, 97]);
});
