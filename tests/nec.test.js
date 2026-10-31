// Equipaggiamento 0.5, cap. 5: NEC (§5.4, dal 30/10/2026 nell'edizione 0.22: accumulatori NEC, CEC, MEC e BEC in cariche,
// tools/lotti/lotto_nec_cariche.mjs) e strumenti professionali (§§5.1–5.3, 5.5–5.8)
// (tools/lotti/lotto_equipaggiamento_05.mjs, tools/lotti/lotto_equipaggiamento_03.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { catalogo, riserveNec, risolvi } from '../src/equipaggiamento.js';
import { massimiSessione, allineaSessione, variaNec, nuovaSessione } from '../src/sessione.js';
import { calcolaScheda } from '../src/calc.js';
import { acquistabili } from '../src/dotazioni.js';
import { quadratiniNec } from '../src/stampa.js';
import { sezioneInventario } from '../src/palette.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (rif) => cat.perRif.get(rif);
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'zaino', quantita: 1, note: '', ...extra });

test('§5.4.4 (Equipaggiamento 0.22): NEC 1/3/5/10, pacchi da 20 e 30, CEC, MEC e BEC in cariche, per Rosso, Blu e Verde', () => {
  const nec = cat.oggetti.filter((o) => o.file === 'nec' && o.nec);
  assert.equal(nec.length, 27);
  // pesi, prezzi (vuoto / carico / ricarica), Integrità e REP della tabella del §5.4.4 e del §5.4.5
  const tabella = {
    nec1: [0.1, 30, 40, 10, 'CO', 2, 'Comune', 10], nec3: [0.1, 90, 120, 30, 'CO', 2, 'Comune', 10], nec5: [0.1, 150, 200, 50, 'CO', 2, 'Comune', 10], nec10: [0.15, 300, 400, 100, 'CO', 2, 'Comune', 10],
    pacco20: [0.3, 600, 800, 200, 'CO', 2, 'Comune', 10], pacco30: [0.45, 900, 1200, 300, 'CO', 2, 'Comune', 10],
    cec: [5, 900, 1000, 100, 'CO', 6, 'Comune', 10], mec: [100, 2700, 3000, 300, 'NC', 12, 'Non comune', 12], bec: [500, 4500, 5000, 500, 'RA', 20, 'Rara', 14],
  };
  for (const o of nec) {
    assert.deepEqual([o.peso, o.costo_vuoto, o.costo, o.ricarica_costo, o.reperibilita, o.pi, o.qualita, o.ps_int], tabella[o.nec.formato], o.id);
  }
  assert.deepEqual(nec.map((o) => o.nec.colore).filter((c, i, a) => a.indexOf(c) === i), ['Rosso', 'Blu', 'Verde']);
  // la tariffa per carica: NEC e CEC 10 cr, MEC 30, BEC 50 (§5.4.4); le cariche: 1/3/5/10, 20, 30, e 10 per CEC, MEC e BEC
  const T = dati.regole.nec.tariffe_cr_per_carica;
  for (const o of nec) {
    const classe = ['cec', 'mec', 'bec'].includes(o.nec.formato) ? o.nec.formato : 'nec';
    assert.equal(o.ricarica_costo, o.nec.capacita_cariche * T[classe], o.id);
  }
  assert.deepEqual(nec.filter((o) => o.nec.colore === 'Rosso').map((o) => o.nec.capacita_cariche), [1, 3, 5, 10, 20, 30, 10, 10, 10]);
  // i quattro id di prima sono NEC Verde 1, NEC Verde 3, NEC Rosso 5 e NEC Blu 5 (le schede salvate li citano)
  assert.deepEqual(['verde-compatto', 'verde-standard', 'rosso-standard', 'blu-standard'].map((id) => r(`nec:${id}`).nome), ['NEC Verde 1', 'NEC Verde 3', 'NEC Rosso 5', 'NEC Blu 5']);
  // §5.4.1: sigle dei colori
  assert.deepEqual(Object.values(dati.regole.nec.colori).map((c) => c.sigla), ['UER', 'UEB', 'UEV']);
  // §5.4.2: «1 UE ripristina 10 cariche NEC»; un NEC da 1/3/5/10 cariche contiene 0,1/0,3/0,5/1 UE
  assert.deepEqual(dati.regole.nec.formati.nec.ue, [0.1, 0.3, 0.5, 1]);
  assert.deepEqual([dati.regole.nec.formati.cec.ue_per_carica, dati.regole.nec.formati.mec.ue_per_carica, dati.regole.nec.formati.bec.ue_per_carica], [10, 100, 1000]);
});

test('raccordo con il lotto 1: niente doppioni, gli apparecchi puntano al catalogo NEC', () => {
  // la vecchia Batteria di servizio, il ricambio standard e la Cartuccia di combustibile sono le celle del catalogo
  for (const rif of ['accessori_armi:batteria-di-servizio', 'accessori_armi:nec-verde-standard-di-ricambio', 'esplorazione:cartuccia-di-combustibile']) assert.equal(r(rif), undefined, rif);
  assert.ok(r('nec:rosso-standard').nomi_alternativi.includes('Cartuccia di combustibile'));
  // un solo oggetto per ciascun NEC: nessun «nec» fuori da nec.json
  assert.ok(cat.oggetti.filter((o) => o.nec).every((o) => o.file === 'nec'));
  // ogni alimentazione punta a un NEC del catalogo, o è un NEC dedicato descritto
  const conAlimentazione = cat.oggetti.filter((o) => o.alimentazione);
  assert.ok(conAlimentazione.length >= 30);
  // un'alimentazione, o più (postazioni medicochirurgiche: Rosso e Verdi, Equipaggiamento §6.8)
  for (const o of conAlimentazione) for (const a of [o.alimentazione].flat()) assert.ok(a.nec === null ? a.descrizione : r(a.nec)?.nec, o.rif);
  // la torcia della dotazione comune (Giocatore 0.45: NEC Verde compatto, 100 ore) e la scheda del §5.4.7
  const torcia = risolvi({ uid: 'dot-comune-5', rif: null, personalizzato: { nome: 'Torcia elettrica', tipo: 'altro' }, dotazione_id: 'torcia-elettrica', dotazione_iniziale: true, quantita: 1, note: '' }, cat);
  // Equipaggiamento 0.22, §5.4.3: elettronica ordinaria, nessun contatore
  assert.deepEqual(torcia.def.alimentazione, { nec: 'nec:verde-compatto', ordinaria: true, paragrafo: '§5.4.3' });
  // le celle d'arma restano munizioni (colpi e cariche): la ravvicinata comune è un NEC da 5 cariche, 200 cr, ricarica 50
  const cella = r('munizioni:cella-ravvicinata-comune');
  assert.deepEqual([cella.cella.capacita, cella.costo, r('nec:rosso-standard').nec.capacita_cariche, r('nec:rosso-standard').costo], [5, 200, 5, 200]);
  // i vecchi Moduli e Banchi rimandano alla CEC (la riserva salvata resta «da convertire»), le stazioni al trasformatore
  const sost = dati.equipaggiamento.indice.rif_sostituiti;
  assert.equal(sost['nec:modulo-rosso'].rif, 'nec:cec-rosso');
  assert.equal(sost['nec:banco-verde'].rif, 'nec:cec-verde');
  assert.equal(sost['munizioni:caricatore-da-campo'].rif, 'nec:trasformatore-portatile-monocromatico');
});

test('al tavolo: elettronica ordinaria senza contatore; le cariche di una CEC e della tuta scendono con − e +; «Nuova sessione» non ricarica', () => {
  const equipaggiamento = [voce('t', 'dotazioni_personali:torcia-elettrica'), voce('k', 'comunicazione:kit-di-videosorveglianza'), voce('c', 'nec:cec-verde'), voce('p', 'strumenti_professionali:postazione-di-lavoro-specializzata'), voce('e', 'esplorazione:tuta-extraveicolare')];
  const riserve = riserveNec(equipaggiamento, dati);
  // torcia e videosorveglianza: nessun contatore (§5.4.3); la postazione: alimentazione esterna (conta la CEC)
  assert.deepEqual(riserve.map((x) => [x.chiave, x.massimo, x.unita]), [['c#c', 10, 'cariche'], ['e#c', 10, 'cariche (impieghi da 4 ore)']]);
  assert.deepEqual(riserve[0].chiaviPrima, ['c', 'c#ue']);
  assert.deepEqual(riserve[1].provenienza.righe[0], { fonte: 'NEC Verde 10', valore: '10 cariche (impieghi da 4 ore)', nota: 'contatore della scheda (Equipaggiamento §5.4.8)' });
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  let s = allineaSessione(null, m);
  assert.deepEqual(s.nec, { 'c#c': 10, 'e#c': 10 }); // venduti carichi (§5.4.4)
  s = variaNec(s, 'e#c', -3, m);
  s = variaNec(s, 'c#c', -1, m);
  assert.deepEqual([s.nec['e#c'], s.nec['c#c']], [7, 9]);
  assert.equal(variaNec(s, 'e#c', 50, m).nec['e#c'], 10); // mai oltre il massimo
  assert.equal(variaNec(s, 't', -1, m).nec.t, undefined); // la torcia non ha contatore
  assert.equal(nuovaSessione(s, m).nec['e#c'], 7);
  // il fornello conta le cariche (§3.2: «si annotano solo le cariche rimaste»)
  assert.deepEqual(riserveNec([voce('f', 'esplorazione:corredo-da-cucina-da-campo')], dati).map((x) => [x.massimo, x.unita]), [[10, 'cariche (preparazioni)']]);
});

test('C (A.193): una riserva salvata in Lx, in UE o in ore non si perde dal file; è «da convertire», senza numero', () => {
  const equipaggiamento = [voce('t', 'dotazioni_personali:torcia-elettrica'), voce('c', 'nec:cec-verde'), voce('e', 'esplorazione:tuta-extraveicolare')];
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  // il file com'era: torcia a 87 ore, Modulo Verde a 6.000 Lx (poi 7 UEV), tuta a 31 ore
  const s = allineaSessione({ nec: { t: 87, c: 6000, 'c#ue': 7, e: 31 } }, m);
  assert.equal(s.nec.t, 87, 'la torcia non ha più contatore, ma il valore resta nel file');
  assert.deepEqual([s.nec.c, s.nec['c#ue'], s.nec.e], [6000, 7, 31], 'Lx, UE e ore restano nel file');
  assert.equal(s.nec['c#c'], undefined, 'un CEC senza la voce di prima non ha una capacità certa: resta da convertire');
  assert.equal(s.nec['c#c'], undefined, 'nessun numero inventato in cariche');
  // la tuta aveva 31 ore su 40 (A.193): 31/40 di 10 cariche = 7,75, segnate 7 per difetto; il valore di prima resta nel file
  assert.equal(s.nec['e#c'], 7, 'la tuta in ore passa alle cariche per frazione');
  assert.equal(s.nec.e, 31);
  assert.equal(s.necConvertite['e#c'].esatto, 7.75, 'il resto resta nel registro');
  assert.equal(variaNec(s, 'c#c', -1, m).nec['c#c'], undefined);
  // un oggetto comprato dopo il passaggio parte carico in cariche
  const nuovo = allineaSessione({ nec: {} }, m);
  assert.deepEqual([nuovo.nec['c#c'], nuovo.nec['e#c']], [10, 10]);
});

test('strumenti professionali: uno strumento con effetto su una Prova (uso specifico accanto all’Abilità)', () => {
  const pro = r('strumenti_professionali:corredo-da-scasso-professionale');
  assert.deepEqual(pro.effetti.map((e) => [e.abilita, e.valore, e.ambito, e.uso]), [['Furtività', 2, 'uso_specifico', 'serrature meccaniche'], ['Tecnologia', 2, 'uso_specifico', 'serrature e allarmi']]);
  const s = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('s', 'strumenti_professionali:corredo-da-scasso-professionale', { stato: 'in_uso' })] }, livelli: [] }, dati);
  const f = s.abilita.find((a) => a.nome === 'Furtività');
  assert.equal(f.usiSpecifici.find((u) => u.uso === 'serrature meccaniche').valore - f.effettivo, 2);
  const senza = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati).abilita.find((a) => a.nome === 'Furtività');
  assert.equal(f.effettivo, senza.effettivo); // il VA generale non cambia
  // il piede di porco: +2 alle Prove di Forza per fare leva (tipo «caratteristica», uso specifico)
  assert.deepEqual(r('strumenti_professionali:piede-di-porco').effetti[0], { tipo: 'caratteristica', caratteristiche: ['FOR'], valore: 2, ambito: 'uso_specifico', uso: 'fare leva', condizione: '+2 alle Prove di Forza per fare leva, con un punto di appoggio adatto.', fonte: 'Equipaggiamento §5.5' })
  // §5.8: Focus personale semplice, già sintonizzato alla creazione, senza bonus né PM
  const focus = r('strumenti_professionali:focus-personale-semplice');
  assert.deepEqual([focus.costo, focus.peso, focus.pi, focus.effetti], [50, 0.1, 2, undefined]);
  assert.equal(dati.dotazioni.oggetti_dotazione['focus-personale'].rif, 'strumenti_professionali:focus-personale-semplice');
});

test('acquisti e sezioni: NEC, CEC e trasformatori si comprano come le altre famiglie; sezioni proprie nell’Inventario', () => {
  const ids = new Set(acquistabili('Mishima', dati).map((o) => o.rif));
  for (const rif of ['nec:verde-compatto', 'nec:bec-blu', 'nec:trasformatore-portatile-monocromatico', 'nec:stazione-industriale-multicromatica', 'strumenti_professionali:piede-di-porco', 'strumenti_professionali:laboratorio-da-campo-specializzato']) assert.ok(ids.has(rif), rif);
  assert.equal(sezioneInventario(risolvi(voce('a', 'nec:cec-rosso'), cat)).id, 'nec');
  assert.equal(sezioneInventario(risolvi(voce('t', 'nec:trasformatore-portatile-monocromatico'), cat)).id, 'nec');
  assert.equal(sezioneInventario(risolvi(voce('b', 'strumenti_professionali:terminale-palmare'), cat)).id, 'strumenti');
});

test('SS: quadratini della riserva, una casella per unità fino a 50, altrimenti dieci decimi; niente quadratini per l’elettronica ordinaria', () => {
  assert.deepEqual(riserveNec([voce('t', 'dotazioni_personali:torcia-elettrica')], dati), []);
  assert.deepEqual(riserveNec([voce('s', 'strumenti_professionali:corredo-da-scasso-standard')], dati), []);
  const [e] = riserveNec([voce('e', 'esplorazione:tuta-extraveicolare')], dati);
  assert.deepEqual(quadratiniNec(e, 'Tuta da lavoro extraveicolare'), { etichetta: 'Cariche', caselle: 10, perCasella: 1, unita: 'cariche (impieghi da 4 ore)', massimo: 10 });
  const [m] = riserveNec([voce('m', 'nec:pacco-30-rosso')], dati);
  assert.deepEqual(quadratiniNec(m, m.nome), { etichetta: 'Cariche', caselle: 30, perCasella: 1, unita: 'cariche', massimo: 30 });
});
