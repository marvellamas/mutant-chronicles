// Equipaggiamento 0.5, cap. 5: NEC (§5.4, dal 28/10/2026 nell'edizione 0.13: UE ed elettronica ordinaria senza conteggi,
// tools/lotti/lotto_nec_ue.mjs) e strumenti professionali (§§5.1–5.3, 5.5–5.8)
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

test('§5.4.4 (Equipaggiamento 0.13): Moduli 10 UE e Banchi 100 UE; ricambi Verdi senza conteggio; lotto 2 ancora in Lx', () => {
  const nec = cat.oggetti.filter((o) => o.file === 'nec' && o.nec);
  assert.deepEqual(nec.map((o) => [o.id, o.nec.colore, o.nec.capacita_ue ?? o.nec.uso ?? (o.nec.capacita_lx ? 'lotto 2' : null), o.costo]), [
    ['verde-compatto', 'Verde', 'elettronica_ordinaria', 10], ['rosso-standard', 'Rosso', 'utensili', 50], ['blu-standard', 'Blu', 'lotto 2', 200], ['verde-standard', 'Verde', 'elettronica_ordinaria', 100],
    ['modulo-rosso', 'Rosso', 10, 600], ['modulo-blu', 'Blu', 'lotto 2', 2100], ['modulo-verde', 'Verde', 10, 600],
    ['banco-rosso', 'Rosso', 100, 6000], ['banco-blu', 'Blu', 100, 6000], ['banco-verde', 'Verde', 100, 6000],
  ]);
  // §5.4.4: «L’energia sfusa costa 10 cr per UE»: ricarica completa del Modulo 100 cr, del Banco 1.000 cr
  for (const o of nec.filter((x) => Number.isInteger(x.nec.capacita_ue))) assert.equal(o.ricarica_costo, o.nec.capacita_ue * dati.regole.nec.tariffa_cr_per_ue, o.id);
  // il Rosso standard degli utensili: capacità in UE non indicata dal manuale, da definire
  assert.equal(r('nec:rosso-standard').nec.capacita_ue, null);
  // §5.4.1: sigle dei colori
  assert.deepEqual(Object.values(dati.regole.nec.colori).map((c) => c.sigla), ['UER', 'UEB', 'UEV']);
  // il lotto 2 (A.189–A.191) resta com'era: il caricatore da campo e la Blu standard in Lx
  assert.ok(r('munizioni:caricatore-da-campo').nomi_alternativi.includes('Caricatore portatile'));
  assert.equal(r('munizioni:caricatore-da-campo').caricatore.trasferimento_lxh, 1000);
  assert.ok(dati.regole.nec.lotto_2.nec.includes('blu-standard'));
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
  // Equipaggiamento 0.13, §5.4.3: elettronica ordinaria, nessun contatore
  assert.deepEqual(torcia.def.alimentazione, { nec: 'nec:verde-compatto', ordinaria: true, paragrafo: '§5.4.3' });
  // le celle d'arma restano munizioni (colpi e cariche), con la stessa Blu del §5.4.4
  assert.deepEqual([r('munizioni:cella-ravvicinata-comune').cella.riserva_lx, r('munizioni:cella-ravvicinata-comune').costo], [r('nec:blu-standard').nec.capacita_lx, r('nec:blu-standard').costo]);
});

test('al tavolo: elettronica ordinaria senza contatore; le UE di un Modulo e le ore della tuta scendono con − e +; «Nuova sessione» non ricarica', () => {
  const equipaggiamento = [voce('t', 'dotazioni_personali:torcia-elettrica'), voce('k', 'comunicazione:kit-di-videosorveglianza'), voce('c', 'nec:modulo-verde'), voce('p', 'strumenti_professionali:postazione-di-lavoro-specializzata'), voce('e', 'esplorazione:tuta-extraveicolare')];
  const riserve = riserveNec(equipaggiamento, dati);
  // torcia e videosorveglianza: nessun contatore (§5.4.3); la postazione: alimentazione esterna
  assert.deepEqual(riserve.map((x) => [x.chiave, x.massimo, x.unita]), [['c#ue', 10, 'UEV'], ['e', 40, 'ore']]);
  assert.equal(riserve[0].chiaveLx, 'c');
  assert.deepEqual(riserve[1].provenienza.righe[0], { fonte: 'NEC Verde standard', valore: '40 ore', nota: 'contatore della scheda (Equipaggiamento §5.4.8)' });
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  let s = allineaSessione(null, m);
  assert.deepEqual(s.nec, { 'c#ue': 10, e: 40 }); // venduti carichi (§5.4.4)
  s = variaNec(s, 'e', -5, m);
  s = variaNec(s, 'c#ue', -1, m);
  assert.deepEqual([s.nec.e, s.nec['c#ue']], [35, 9]);
  assert.equal(variaNec(s, 'e', 50, m).nec.e, 40); // mai oltre il massimo
  assert.equal(variaNec(s, 't', -1, m).nec.t, undefined); // la torcia non ha contatore
  assert.equal(nuovaSessione(s, m).nec.e, 35);
  // il fornello conta le preparazioni (§3.2: «Si segnano soltanto le preparazioni rimaste»)
  assert.deepEqual(riserveNec([voce('f', 'esplorazione:corredo-da-cucina-da-campo')], dati).map((x) => [x.massimo, x.unita]), [[10, 'preparazioni']]);
});

test('C (A.193): una riserva salvata in Lx non si perde dal file; un Modulo ora in UE è «da convertire», senza numero', () => {
  const equipaggiamento = [voce('t', 'dotazioni_personali:torcia-elettrica'), voce('c', 'nec:modulo-verde')];
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  // il file com'era: torcia a 87 ore, Modulo Verde a 6.000 Lx
  const s = allineaSessione({ nec: { t: 87, c: 6000 } }, m);
  assert.equal(s.nec.t, 87, 'la torcia non ha più contatore, ma il valore resta nel file');
  assert.equal(s.nec.c, 6000, 'i Lx restano nel file');
  assert.equal(s.nec['c#ue'], undefined, 'nessun numero inventato in UE');
  assert.equal(variaNec(s, 'c#ue', -1, m).nec['c#ue'], undefined);
  // un Modulo comprato dopo il passaggio parte carico in UE
  assert.equal(allineaSessione({ nec: {} }, m).nec['c#ue'], 10);
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

test('SS: quadratini della riserva, una casella per unità fino a 50, altrimenti dieci decimi; niente quadratini per l’elettronica ordinaria', () => {
  assert.deepEqual(riserveNec([voce('t', 'dotazioni_personali:torcia-elettrica')], dati), []);
  assert.deepEqual(riserveNec([voce('s', 'strumenti_professionali:corredo-da-scasso-standard')], dati), []);
  const [e] = riserveNec([voce('e', 'esplorazione:tuta-extraveicolare')], dati);
  assert.deepEqual(quadratiniNec(e, 'Tuta da lavoro extraveicolare'), { etichetta: 'NEC', caselle: 40, perCasella: 1, unita: 'ore', massimo: 40 });
  const [m] = riserveNec([voce('m', 'nec:banco-rosso')], dati);
  assert.deepEqual(quadratiniNec(m, 'Banco Rosso'), { etichetta: 'Riserva', caselle: 10, perCasella: 10, unita: 'UER', massimo: 100 });
});
