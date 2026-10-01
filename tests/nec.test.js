// Equipaggiamento 0.5, cap. 5: NEC (§5.4) e strumenti professionali (§§5.1–5.3, 5.5–5.8)
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

test('§5.4.4: catalogo NEC, quattro celle, sei pacchi; ricarica a 0,01 cr/Lx; regole in regole.json → nec', () => {
  const nec = cat.oggetti.filter((o) => o.file === 'nec' && o.nec);
  assert.deepEqual(nec.map((o) => [o.id, o.nec.colore, o.nec.capacita_lx, o.costo]), [
    ['verde-compatto', 'Verde', 100, 10], ['rosso-standard', 'Rosso', 500, 50], ['blu-standard', 'Blu', 250, 200], ['verde-standard', 'Verde', 1000, 100],
    ['modulo-rosso', 'Rosso', 5000, 600], ['modulo-blu', 'Blu', 2500, 2100], ['modulo-verde', 'Verde', 10000, 1100],
    ['banco-rosso', 'Rosso', 50000, 6000], ['banco-blu', 'Blu', 25000, 21000], ['banco-verde', 'Verde', 100000, 11000],
  ]);
  for (const o of nec) assert.equal(o.ricarica_costo, o.nec.capacita_lx * dati.regole.nec.tariffa_cr_per_lx, o.id);
  // la tabella dei tipi (§5.4.1) coincide con le celle standard del catalogo
  for (const c of ['Rosso', 'Blu', 'Verde']) {
    const s = nec.find((o) => o.nec.colore === c && o.nec.formato === 'standard');
    assert.deepEqual([s.nec.capacita_lx, s.nec.erogazione_lxh], [dati.regole.nec.colori[c].capacita_lx, dati.regole.nec.colori[c].erogazione_lxh]);
  }
  // il caricatore portatile del §5.4.6 è il Caricatore da campo degli Armamenti (stessa scheda)
  assert.ok(r('munizioni:caricatore-da-campo').nomi_alternativi.includes('Caricatore portatile'));
  assert.equal(r('munizioni:caricatore-da-campo').caricatore.trasferimento_lxh, 1000);
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
  for (const o of conAlimentazione) assert.ok(o.alimentazione.nec === null ? o.alimentazione.descrizione : r(o.alimentazione.nec)?.nec, o.rif);
  // la torcia della dotazione comune (Giocatore 0.45: NEC Verde compatto, 100 ore) e la scheda del §5.4.7
  const torcia = risolvi({ uid: 'dot-comune-5', rif: null, personalizzato: { nome: 'Torcia elettrica', tipo: 'altro' }, dotazione_id: 'torcia-elettrica', dotazione_iniziale: true, quantita: 1, note: '' }, cat);
  assert.deepEqual(torcia.def.alimentazione, { nec: 'nec:verde-compatto', consumo_lxh: 1, autonomia_ore: 100, paragrafo: '§2.3' });
  // le celle d'arma restano munizioni (colpi e cariche), con la stessa Blu del §5.4.4
  assert.deepEqual([r('munizioni:cella-ravvicinata-comune').cella.riserva_lx, r('munizioni:cella-ravvicinata-comune').costo], [r('nec:blu-standard').nec.capacita_lx, r('nec:blu-standard').costo]);
});

test('al tavolo la riserva di un NEC scende con − e +, con la provenienza; «Nuova sessione» non ricarica', () => {
  const equipaggiamento = [voce('t', 'dotazioni_personali:torcia-elettrica'), voce('k', 'comunicazione:kit-di-videosorveglianza'), voce('c', 'nec:modulo-verde'), voce('p', 'strumenti_professionali:postazione-di-lavoro-specializzata')];
  const riserve = riserveNec(equipaggiamento, dati);
  assert.deepEqual(riserve.map((x) => [x.chiave, x.massimo, x.unita]), [['t', 100, 'ore'], ['k#0', 50, 'ore'], ['k#1', 50, 'ore'], ['c', 10000, 'Lx']]);
  const t = riserve[0];
  assert.deepEqual(t.provenienza.righe[0], { fonte: 'NEC Verde compatto', valore: '100 ore', nota: '1 Lx/h (Equipaggiamento §2.3)' });
  assert.equal(riserve[1].nome, 'Kit di videosorveglianza (videocamera)');
  // la postazione non comprende il NEC (alimentazione esterna): nessuna riserva propria
  assert.ok(!riserve.some((x) => x.uid === 'p'));
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  let s = allineaSessione(null, m);
  assert.deepEqual(s.nec, { t: 100, 'k#0': 50, 'k#1': 50, c: 10000 }); // venduti carichi (§5.4.4)
  s = variaNec(s, 't', -5, m);
  s = variaNec(s, 'c', -1000, m);
  assert.deepEqual([s.nec.t, s.nec.c], [95, 9000]);
  assert.equal(variaNec(s, 't', 50, m).nec.t, 100); // mai oltre il massimo
  assert.equal(nuovaSessione(s, m).nec.t, 95); // la ricarica richiede caricatore e fonte (§5.4.6)
  // il fornello conta le preparazioni (§3.2: «si segnano le preparazioni oppure le ore»)
  assert.deepEqual(riserveNec([voce('f', 'esplorazione:corredo-da-cucina-da-campo')], dati).map((x) => [x.massimo, x.unita]), [[10, 'preparazioni']]);
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
  assert.deepEqual(r('strumenti_professionali:piede-di-porco').effetti[0], { tipo: 'caratteristica', caratteristiche: ['FOR'], valore: 2, ambito: 'uso_specifico', uso: 'fare leva', condizione: '+2 alle Prove di Forza per fare leva, con un punto di appoggio adatto.', fonte: 'Equipaggiamento §5.5' });
  // §5.8: Focus personale semplice, già sintonizzato alla creazione, senza bonus né PM
  const focus = r('strumenti_professionali:focus-personale-semplice');
  assert.deepEqual([focus.costo, focus.peso, focus.pi, focus.effetti], [50, 0.1, 2, undefined]);
  assert.equal(dati.dotazioni.oggetti_dotazione['focus-personale'].rif, 'strumenti_professionali:focus-personale-semplice');
});

test('acquisti e sezioni: NEC e strumenti si comprano come le altre famiglie; sezioni proprie nell’Inventario', () => {
  const ids = new Set(acquistabili('Mishima', dati).map((o) => o.rif));
  for (const rif of ['nec:verde-compatto', 'nec:banco-blu', 'nec:stazione-per-moduli', 'strumenti_professionali:piede-di-porco', 'strumenti_professionali:laboratorio-da-campo-specializzato']) assert.ok(ids.has(rif), rif);
  assert.equal(sezioneInventario(risolvi(voce('a', 'nec:modulo-rosso'), cat)).id, 'nec');
  assert.equal(sezioneInventario(risolvi(voce('b', 'strumenti_professionali:terminale-palmare'), cat)).id, 'strumenti');
});

test('SS: quadratini della riserva, una casella per unità fino a 50, altrimenti dieci decimi', () => {
  const [t] = riserveNec([voce('t', 'dotazioni_personali:torcia-elettrica')], dati);
  assert.deepEqual(quadratiniNec(t, 'Torcia elettrica'), { etichetta: 'NEC', caselle: 10, perCasella: 10, unita: 'ore', massimo: 100 });
  const [s] = riserveNec([voce('s', 'strumenti_professionali:corredo-da-scasso-standard')], dati);
  assert.deepEqual(quadratiniNec(s, 'Corredo da scasso Standard'), { etichetta: 'NEC', caselle: 40, perCasella: 1, unita: 'ore', massimo: 40 });
  const [m] = riserveNec([voce('m', 'nec:modulo-rosso')], dati);
  assert.deepEqual(quadratiniNec(m, 'Modulo Rosso'), { etichetta: 'Riserva', caselle: 10, perCasella: 500, unita: 'Lx', massimo: 5000 });
});
