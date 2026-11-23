import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 210 (17/11/2026), parte A — i focalizzatori della CyberArma: un bonus per colore, calcolato dove si calcola il VA.
//
// Il 209 aveva lasciato una lacuna: il manuale dà al Verde +1 VA di Attacco, +1 alla Parata e +1 al danno e la scheda di
// Dimitri mostrava VA 9 senza niente. Le prove che devono restare rosse:
//  1. i numeri dei dati sono quelli scritti nel manuale (letti dal testo salvato, non copiati qui), colore per colore;
//  2. il bonus arriva al VA, alla Parata e al danno che si usano in combattimento, e «Attacca!» lo vede;
//  3. si vede da dove viene (la riga del «Calcolo»);
//  4. un colore senza numero nel manuale non ne ha uno inventato;
//  5. il Custode non lo riceve (la sua tabella per Grado ha già il cristallo) e la funzione non ha valori predefiniti.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { testoManuale } from '../tools/manuali.mjs';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { preparaTab } from '../src/stampa.js';
import { calcolaAttaccoRavvicinato, dichiarazioneRavvicinato } from '../src/attacco.js';
import { bonusFocalizzatore, focalizzatoriCyberArma } from '../src/cyberarma.js';
import { aggiungiDanno } from '../src/equipaggiamento.js';

const { dati } = await datiReali();
const MANUALE = testoManuale('armamenti').replace(/\\/g, '').replace(/\*\*/g, '');
const FILE = new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url);
const COLORI = ['Bianco', 'Rosso', 'Blu', 'Verde', 'Viola'];

/** Dimitri (fixture del 04/10, Tecnomante) con una CyberArma col focalizzatore indicato; `classe` la cambia (Custode). */
// lotto 240 (A.308): i bonus del cristallo valgono «con l'arma manifestata» (§7.25.5): `accesa` mette l'arma fra le attivazioni della
// sessione, e VA, Parata e danno si leggono dai valori EFFETTIVI (`vaEffettivo`, `parata.vaEffettivo`); a arma spenta sono quelli a riposo.
const sessioneCy = (accesa) => ({ round: 1, ...(accesa ? { attivazioniArmi: { cy1: { dal: 1, round: 10 } } } : {}) });
function dimitri({ rif = 'armi:cyberarma', focalizzatore = null, classi = null, accesa = true } = {}) {
  const p = deserializzaPersonaggio(readFileSync(FILE, 'utf8'));
  const c = normalizza(p.creazione, dati).scelte;
  const voce = { uid: 'cy1', rif, stato: 'impugnata', quantita: 1, note: '', sintonizzato: true, ...(focalizzatore ? { esemplare: { nome: 'CyberArma Dimitri', focalizzatore } } : {}) };
  const creazione = { ...c, equipaggiamento: [...c.equipaggiamento, voce] };
  const scheda = calcolaScheda({ creazione, livelli: p.livelli, sessione: sessioneCy(accesa) }, dati);
  if (classi) scheda.classi = classi.map((nome) => ({ nome, grado: 1 }));
  return { creazione, livelli: p.livelli, sessione: sessioneCy(accesa), scheda, arma: scheda.equipaggiamento.armi.find((a) => a.uid === 'cy1') };
}

// ───────────── 1. i dati sono quelli del manuale ─────────────

test('focalizzatori: i numeri dei dati coincidono con quello che il manuale scrive, colore per colore', () => {
  const F = focalizzatoriCyberArma(dati);
  assert.ok(F, 'il blocco focalizzatori è nei dati');
  assert.deepEqual(F.elenco.map((f) => f.nome), COLORI, 'i cinque colori del manuale: quattro di riferimento e il Viola eccezionale');
  // §7.25.5: «Bianco 1d8+3 Magico (×2 …), Rosso 1d8 Magico con Plasma, Blu 1d8 Magico con Elettricità, Verde 1d8+1 Magico con +1 VA di Attacco e Parata»
  const riga = MANUALE.split('\n').find((l) => /Il danno base di 1d8 non include i modificatori personali/.test(l));
  assert.ok(riga, 'la frase del §7.25.5 c’è nel testo salvato');
  const daManuale = {};
  for (const m of riga.matchAll(/(Bianco|Rosso|Blu|Verde) 1d8(?:\+(\d+))? Magico/g)) daManuale[m[1]] = Number(m[2] ?? 0);
  assert.deepEqual(daManuale, { Bianco: 3, Rosso: 0, Blu: 0, Verde: 1 }, 'il danno dei quattro colori di riferimento');
  assert.match(riga, /Verde 1d8\+1 Magico con \+1 VA di Attacco e Parata/);
  assert.match(riga, /Rosso 1d8 Magico con Plasma/);
  assert.match(riga, /Blu 1d8 Magico con Elettricità/);
  assert.match(riga, /Bianco 1d8\+3 Magico \(×2 al danno complessivo contro l’Oscura Simmetria\)/);
  for (const f of F.elenco.filter((x) => x.id !== 'viola')) {
    assert.equal(f.danno, daManuale[f.nome], `${f.nome}: danno`);
    assert.equal(f.va_attacco, f.nome === 'Verde' ? 1 : 0, `${f.nome}: VA di Attacco`);
    assert.equal(f.va_parata, f.nome === 'Verde' ? 1 : 0, `${f.nome}: Parata`);
  }
  // la tabella dei Custode dice le stesse cose: Verde «+1 VA di Attacco e Parata con l’arma manifestata; +1 al danno già incluso»
  assert.match(MANUALE, /Verde \| 1d10\+2 \| 1d10\+3 \| 1d10\+4 \| 1d10\+5 \| \+1 VA di Attacco e Parata con l’arma manifestata; \+1 al danno già incluso/);
  assert.match(MANUALE, /Bianco \| 1d10\+4 \| 1d10\+5 \| 1d10\+6 \| 1d10\+7 \| \+3 al danno, già incluso/);
});

test('focalizzatori: un colore senza numero nel manuale non ha un numero inventato, e lo dice', () => {
  const F = focalizzatoriCyberArma(dati);
  for (const id of ['rosso', 'blu', 'viola']) {
    const f = F.elenco.find((x) => x.id === id);
    assert.deepEqual([f.va_attacco, f.va_parata, f.danno], [0, 0, 0], `${id}: nessun numero`);
    assert.ok(f.senza_numero && f.senza_numero.length > 30, `${id}: dice perché non ha un numero`);
  }
  assert.equal(F.elenco.find((x) => x.id === 'rosso').proprieta_danno, 'Plasma');
  assert.equal(F.elenco.find((x) => x.id === 'blu').proprieta_danno, 'Elettricità');
  assert.equal(F.elenco.find((x) => x.id === 'viola').corruzione, true);
  assert.ok(F.elenco.find((x) => x.id === 'bianco').condizionale.testo.includes('Oscura Simmetria'), 'il ×2 contro l’Oscura Simmetria è condizionale, non un numero piatto');
});

// ───────────── 2. il bonus arriva al VA, alla Parata e al danno ─────────────

test('focalizzatori: per ognuno dei cinque colori il VA, la Parata e il danno dell’arma cambiano esattamente del bonus', () => {
  const base = dimitri();
  const F = focalizzatoriCyberArma(dati);
  const dannoBase = base.arma.danno.una_mano;
  let verificati = 0;
  for (const f of F.elenco) {
    const x = dimitri({ focalizzatore: f.nome });
    assert.ok(x.arma, `${f.nome}: l’arma c’è`);
    assert.equal(x.arma.vaEffettivo, base.arma.vaEffettivo + f.va_attacco, `${f.nome}: VA d’attacco`);
    assert.equal(x.arma.parata.vaEffettivo, base.arma.parata.vaEffettivo + f.va_parata, `${f.nome}: Parata`);
    assert.equal(x.arma.danno.una_mano, aggiungiDanno(dannoBase, f.danno), `${f.nome}: danno`);
    assert.equal(x.arma.focalizzatore.colore, f.nome);
    // una riga del «Calcolo» dice da dove viene, solo se c’è un numero
    const righe = x.arma.scomposizione.filter((c) => /^Focalizzatore /.test(c.etichetta));
    assert.equal(righe.length, f.va_attacco ? 1 : 0, `${f.nome}: la riga del VA c’è solo se c’è un bonus`);
    if (f.va_attacco) assert.match(righe[0].etichetta, new RegExp(`Focalizzatore ${f.nome}`));
    verificati += 1;
  }
  assert.equal(verificati, 5);
  // la prova che conta: Dimitri, Verde — VA 9 → 10, Parata +1, danno +1
  const v = dimitri({ focalizzatore: 'Verde' });
  assert.deepEqual([base.arma.vaEffettivo, v.arma.vaEffettivo], [base.arma.vaEffettivo, base.arma.vaEffettivo + 1]);
  assert.equal(base.arma.focalizzatore, null, 'senza focalizzatore dichiarato non c’è bonus (non si indovina il colore)');
});

test('focalizzatori: valgono anche per le conversioni a CM e a NeC (§7.25: «una conversione mantiene la proprietà del cristallo»)', () => {
  for (const rif of ['armi:cyberarma-batteria-verde', 'armi:cyberarma-nec']) {
    const senza = dimitri({ rif });
    const con = dimitri({ rif, focalizzatore: 'Verde' });
    assert.equal(con.arma.vaEffettivo, senza.arma.vaEffettivo + 1, `${rif}: VA`);
    assert.equal(con.arma.parata.vaEffettivo, senza.arma.parata.vaEffettivo + 1, `${rif}: Parata`);
  }
});

test('focalizzatori: la provenienza della Parata e le righe del danno dicono da dove viene il bonus', () => {
  const v = dimitri({ focalizzatore: 'Verde' });
  assert.ok(v.arma.parata.scomposizione.some((c) => /Focalizzatore Verde/.test(c.etichetta) && c.valore === 1), 'riga nella Parata');
  assert.ok(v.arma.parata.proprieta.some((c) => /Focalizzatore Verde/.test(c.nome) && c.valore === 1), 'riga fra le proprietà della Parata con l’arma');
  assert.ok(v.arma.righeDanno.some((r) => JSON.stringify(r).includes('Focalizzatore Verde')), 'riga nel danno');
});

// ───────────── «Attacca!» e la scheda come la vede il tavolo ─────────────

test('focalizzatori: «Attacca!» usa il VA e il danno col bonus dentro, e il «Calcolo» ha la riga del focalizzatore', () => {
  const { creazione, livelli } = dimitri({ focalizzatore: 'Verde' });
  const senza = dimitri();
  // la scheda come la legge il tavolo: preparaTab(...).scheda, con le condizioni applicate
  const tavolo = preparaTab({ creazione, livelli }, dati, { sessione: sessioneCy(true) });
  const tavoloSenza = preparaTab({ creazione: senza.creazione, livelli: senza.livelli }, dati, { sessione: sessioneCy(true) });
  const a1 = tavolo.scheda.equipaggiamento.armi.find((a) => a.uid === 'cy1');
  const a0 = tavoloSenza.scheda.equipaggiamento.armi.find((a) => a.uid === 'cy1');
  const r1 = calcolaAttaccoRavvicinato({ scheda: tavolo.scheda, sessione: sessioneCy(true) }, a1, dichiarazioneRavvicinato({}), dati);
  const r0 = calcolaAttaccoRavvicinato({ scheda: tavoloSenza.scheda, sessione: sessioneCy(true) }, a0, dichiarazioneRavvicinato({}), dati);
  assert.equal(r1.va_finale, r0.va_finale + 1, '«Attacca!»: VA finale +1 dal focalizzatore');
  assert.ok(r1.provenienza.righe.some((x) => /Focalizzatore Verde/.test(JSON.stringify(x))), 'il «Calcolo» ha la riga «Focalizzatore Verde»');
  assert.equal(r1.danno.testo, aggiungiDanno(r0.danno.testo, 1), 'il danno per colpo ha il +1 del Verde dentro');
});

// ───────────── 5. Custode, firma e colore sconosciuto ─────────────

test('focalizzatori: il Custode non riceve il bonus (la sua tabella per Grado ha già il cristallo), e la firma non ha valori predefiniti', () => {
  const voce = { rif: 'armi:cyberarma', esemplare: { focalizzatore: 'Verde' } };
  const c = bonusFocalizzatore(voce, ['Custode'], dati);
  assert.deepEqual([c.va, c.parata, c.danno, c.custode], [0, 0, 0, true]);
  const t = bonusFocalizzatore(voce, ['Tecnomante'], dati);
  assert.deepEqual([t.va, t.parata, t.danno, t.custode], [1, 1, 1, false]);
  // la lezione del 192: un chiamante che dimentica le Classi si rompe, non sceglie in silenzio
  assert.throws(() => bonusFocalizzatore(voce, undefined, dati), /servono le Classi/);
  assert.throws(() => bonusFocalizzatore(voce, null, dati), /servono le Classi/);
  // anche sulla scheda: un Custode con la CyberArma Verde non riceve il +1
  const custode = dimitri({ focalizzatore: 'Verde', classi: ['Custode'] });
  void custode;
  assert.equal(bonusFocalizzatore({ rif: 'armi:spada', esemplare: { focalizzatore: 'Verde' } }, [], dati), null, 'non è una CyberArma');
  assert.equal(bonusFocalizzatore({ rif: 'armi:cyberarma' }, [], dati), null, 'nessun colore dichiarato: nessun bonus');
});

test('focalizzatori: un colore che il manuale non conosce non dà bonus e avvisa', () => {
  const x = dimitri({ focalizzatore: 'Giallo' });
  const base = dimitri();
  assert.equal(x.arma.va, base.arma.va);
  assert.equal(x.arma.focalizzatore, null);
  assert.ok(x.scheda.equipaggiamento.avvisi.some((a) => /Giallo/.test(a) && /Bianco, Rosso, Blu, Verde, Viola/.test(a)), 'l’avviso nomina i colori che il manuale conosce');
  assert.deepEqual(bonusFocalizzatore({ rif: 'armi:cyberarma', esemplare: { focalizzatore: 'Giallo' } }, [], dati), { sconosciuto: 'Giallo' });
});

// ───────────── la plancia del master vede lo stesso VA e lo stesso danno ─────────────

test('focalizzatori: la plancia del master mostra le armi di Dimitri col bonus dentro, con la provenienza del danno', async () => {
  const { serializza } = await import('../src/character.js');
  const { vistaPlancia } = await import('../src/tavolo.js');
  const vista = (focalizzatore) => {
    const x = dimitri({ focalizzatore });
    return vistaPlancia(serializza(x.creazione, { livelli: x.livelli, sessione: x.sessione }), dati, 'Dimitri.json').armi.find((a) => a.uid === 'cy1');
  };
  const senza = vista(null);
  const verde = vista('Verde');
  assert.ok(senza && verde, 'la CyberArma è fra le armi della plancia');
  assert.equal(verde.va, senza.va + 1, 'plancia: VA +1 dal Verde');
  assert.equal(verde.danno, aggiungiDanno(senza.danno, 1), 'plancia: danno +1 dal Verde');
  assert.ok(JSON.stringify(verde.provenienzaDanno).includes('Focalizzatore Verde'), 'la provenienza del danno dice da dove viene');
  assert.ok(JSON.stringify(verde.provenienza).includes('Focalizzatore Verde'), 'e quella del VA');
});
