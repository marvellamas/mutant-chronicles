import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 235 (23/11/2026) — i cinque cristalli focalizzatori della CyberArma.
//
// I sei controlli che il lotto chiede per nome, ciascuno scritto perché **fallisca** se un giorno qualcuno rimette
// la cosa sbagliata. Non congelano numeri che il manuale può cambiare: i valori si rileggono da `data/` e dal
// manuale corrente (registro), e quello che è fisso è il **comportamento** — che il ×2 comprenda il +3, che un
// bonus non si sommi due volte, che l'app non tiri la PS, che un cambio di cristallo non duplichi l'esemplare.
//
// Fonte dei valori: Armamenti 0.90 §7.25 e §7.25.5, Giocatore 0.65 §5.24 (riletti nel lotto).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { leggiDannoMoltiplicato } from '../src/danno.js';
import {
  cristalliCyberArma, cambiaCristallo, coloreCristallo,
  dannoCondizionaleCristallo, valoreDannoCondizionale, condizioneSulBersaglio, bonusFocalizzatore,
} from '../src/cyberarma.js';

const { dati } = await datiReali();
const cristalli = cristalliCyberArma(dati);
const di = (id) => { const c = cristalli.find((x) => x.id === id); assert.ok(c, `manca il cristallo «${id}»`); return c; };
const voci = dati.equipaggiamento.file.armi.oggetti;
const voce = (id) => { const v = voci.find((x) => x.id === id); assert.ok(v, `manca la voce «${id}»`); return v; };

test('i cinque cristalli sono cinque, si cercano e si scelgono, e «CyberArma» non è uno di loro', () => {
  assert.equal(cristalli.length, 5);
  assert.deepEqual(cristalli.map((c) => c.nome), ['Bianco', 'Rosso', 'Blu', 'Verde', 'Viola']);
  // ognuno ha la sua voce di catalogo, e la voce dichiara il colore da sé (focalizzatore_fisso)
  for (const c of cristalli) {
    assert.ok(c.voce, `${c.nome}: manca la voce di catalogo`);
    const v = voce(c.voce.slice('armi:'.length));
    assert.equal(v.focalizzatore_fisso, c.id);
    assert.match(v.nome, /^CyberArma /, 'il nome si cerca scrivendo «CyberArma»');
    assert.equal(v.famiglia_cyberarma, 'CyberArma');
    // §7.25: «La famiglia e la Specializzazione pertinente dipendono dalla manifestazione: lama → Spade»
    assert.notEqual(v.famiglia, 'CyberArma', 'la famiglia d’arma è quella della manifestazione, non «CyberArma»');
  }
  // nessuno dei cinque si chiama «CyberArma» e basta
  assert.equal(cristalli.filter((c) => voce(c.voce.slice(5)).nome === 'CyberArma').length, 0);
});

test('«CyberArma» non è una sesta voce acquistabile: resta il nome della famiglia', () => {
  for (const id of ['cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec']) {
    const v = voce(id);
    assert.equal(v.non_in_vendita, true, `${id}: «CyberArma» e le sue conversioni non si comprano (§7.25: pezzo unico, il valore indicativo non garantisce una vendita)`);
    assert.equal(v.famiglia_cyberarma, 'CyberArma');
  }
  // il mutante: se qualcuno rimettesse «CyberArma» fra le voci che si comprano, questo controllo diventa rosso
  assert.equal(voci.filter((v) => (v.id ?? '').startsWith('cyberarma') && v.non_in_vendita !== true).length, 0);
  // e il valore resta scritto come valore, non come zero (lotto 219: «mai 0 dove il manuale non dà un prezzo»)
  assert.equal(voce('cyberarma').costo, 7500);
  assert.equal(voce('cyberarma-nec').costo, null);
});

test('il ×2 del Bianco comprende il +3: (danno+3)×2, mai danno×2+3', () => {
  const b = di('bianco');
  assert.equal(b.danno, 3, '§7.25: +3 al danno, già incluso');
  assert.equal(b.condizionale.moltiplicatore_danno, 2);
  assert.match(b.condizionale.contro, /Oscura Simmetria/);
  // la formula si scrive sul danno **completo**, nella forma della A.199
  const d = dannoCondizionaleCristallo('1d8+4', b.condizionale);
  assert.equal(d.formula, '(1d8+4)×2');
  // e chi la legge moltiplica il totale, non il dado: è lo stesso lettore della A.199
  const letto = leggiDannoMoltiplicato(d.formula);
  assert.equal(letto.formula, '1d8+4');
  assert.equal(letto.moltiplicatore, 2);
  // i numeri in chiaro: dado 5, +1 di DES, +3 del cristallo → (5+1+3)×2 = 18. Il modo sbagliato darebbe 5+1+3×2 = 12.
  const v = valoreDannoCondizionale(5, 1 + 3, 2);
  assert.equal(v.base, 9);
  assert.equal(v.totale, 18);
  assert.notEqual(v.totale, 5 + 1 + 3 * 2, 'il ×2 non si applica al solo +3');
  assert.notEqual(v.totale, 5 * 2 + 1 + 3, 'e non al solo dado');
});

test('i tre bonus del Verde si contano una volta sola: VA, Parata e danno', () => {
  const g = di('verde');
  assert.deepEqual({ va: g.va, parata: g.parata, danno: g.danno }, { va: 1, parata: 1, danno: 1 });
  // su una scheda vera: la CyberArma Verde dà +1 e +1 e +1, e non +2
  const base = JSON.parse(readFileSync(new URL('../esempi/' + esempioNonCustode(), import.meta.url), 'utf8'));
  const { scheda, armaVerde, armaBase } = schedeCol(base);
  const dva = armaVerde.va - armaBase.va;
  const dparata = armaVerde.parata.va - armaBase.parata.va;
  assert.equal(dva, 1, `VA: ${armaBase.va} → ${armaVerde.va}`);
  assert.equal(dparata, 1, `Parata: ${armaBase.parata.va} → ${armaVerde.parata.va}`);
  assert.equal(fisso(armaVerde.danno.una_mano) - fisso(armaBase.danno.una_mano), 1, `danno: ${armaBase.danno.una_mano} → ${armaVerde.danno.una_mano}`);
  // e una volta sola anche nelle righe: una riga del focalizzatore nel danno, una nella Parata
  assert.equal((armaVerde.righeDanno ?? []).filter((r) => /Focalizzatore/.test(r.fonte)).length, 1);
  assert.equal((armaVerde.parata.componenti ?? []).filter((c) => /Focalizzatore/.test(c.nome)).length, 1);
  // la Parata tiene il focalizzatore in due posti con due scopi: `componenti`, che e la somma, e `proprieta`, che e
  // la provenienza mostrata nelle Difese. Il controllo che conta e che la somma torni: se il bonus finisse due volte
  // dentro `componenti`, qui il totale non corrisponderebbe piu alla somma delle sue righe.
  assert.equal(armaVerde.parata.va, (armaVerde.parata.componenti ?? []).reduce((t, c) => t + (c.valore ?? 0), 0));
  assert.equal(armaVerde.va, (armaVerde.componenti ?? []).reduce((t, c) => t + (c.valore ?? 0), 0));
  assert.equal((armaVerde.componenti ?? []).filter((c) => /Focalizzatore/.test(c.nome)).length, 1);
  assert.ok(scheda);
});

test('Plasma ed Elettricità si scrivono e non si applicano: l’app non tira la PS di Tempra', () => {
  for (const [id, proprieta, contromisura, fallimento] of [['rosso', 'Plasma', 'Dissipante X', '−2 VA'], ['blu', 'Elettricità', 'Isolante X', 'non spende Azioni fuori dalla propria Iniziativa']]) {
    const c = di(id);
    const e = c.effettoSulBersaglio;
    assert.ok(e, `${proprieta}: l’effetto sul bersaglio è dichiarato`);
    assert.equal(e.proprieta, proprieta);
    assert.equal(e.prova, 'PS Tempra');
    assert.equal(e.se_fallisce, fallimento);
    assert.equal(e.durata, '1+1d3 Round');
    assert.equal(e.contromisura, contromisura);
    assert.equal(e.la_applica, 'il Direttore');
    // le due condizioni del §5.24, che l'app non può verificare da sé
    assert.equal(e.condizioni.length, 2);
    assert.match(e.condizioni.join(' '), /oltre l’Armatura/);
    assert.match(e.condizioni.join(' '), /Contromisura/);
    // nessun numero inventato: il cristallo non dà bonus al VA né al danno
    assert.deepEqual({ va: c.va, parata: c.parata, danno: c.danno }, { va: 0, parata: 0, danno: 0 }, `${proprieta}: «Nessun dado aggiuntivo» (§7.25)`);
    const r = condizioneSulBersaglio(e);
    assert.match(r.riga, /PS Tempra/);
    assert.match(r.appNonCalcola, /non tira la PS Tempra/);
  }
  // il controllo che deve restare verde sempre: **in nessun posto del codice l'app tira la PS di Tempra del
  // Plasma o dell'Elettricità, applica il −2 VA o blocca le Azioni**. Si cerca nel codice, non nei dati: un
  // giorno qualcuno potrebbe «completare» l'effetto, e quel giorno questo test deve diventare rosso.
  const codice = ['src/cyberarma.js', 'src/equipaggiamento.js', 'src/ui/tab.js']
    .map((f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n');
  for (const vietato of [/tira[A-Za-z]*\s*\(\s*['"`]?PS Tempra/i, /salvezza[A-Za-z]*\(\s*['"`]tempra/i, /bloccaAzioni/i, /applicaPlasma/i, /applicaElettricita/i]) {
    assert.equal(vietato.test(codice), false, `l’app non deve applicare da sé l’effetto del cristallo: ${vietato}`);
  }
});

test('il cambio di cristallo aggiorna lo stesso esemplare: non ne crea un secondo e non azzera lo storico', () => {
  const voceIniziale = {
    uid: 'u1', rif: 'armi:cyberarma', stato: 'impugnata', quantita: 1, sintonizzato: true,
    nome: 'CyberArma Dimitri',
    esemplare: { nome: 'CyberArma Dimitri', focalizzatore: 'Verde', storico: [{ quando: '2026-11-02', esito: 'riconduzione' }] },
  };
  const esito = cambiaCristallo(voceIniziale, 'bianco', dati, { quando: '2026-11-23T20:00:00Z', da: 'Modifica master', motivo: 'prova' });
  assert.ok(!esito.errore, esito.errore);
  const v = esito.voce;
  // un solo esemplare: lo stesso uid, lo stesso nome, la stessa Integrità (i PI stanno in sessione per uid)
  assert.equal(v.uid, voceIniziale.uid);
  assert.equal(v.nome, voceIniziale.nome);
  assert.equal(v.esemplare.nome, 'CyberArma Dimitri');
  assert.equal(v.quantita, 1);
  // lo storico si allunga, non si riscrive
  assert.equal(v.esemplare.storico.length, 2);
  assert.deepEqual(v.esemplare.storico[0], voceIniziale.esemplare.storico[0]);
  assert.equal(v.esemplare.storico[1].prima, 'Verde');
  assert.equal(v.esemplare.storico[1].dopo, 'Bianco');
  // il profilo cambia (è il modello), il record no (è l'arma): la distinzione del lotto 185 e della A.295
  assert.equal(v.rif, 'armi:cyberarma-bianca');
  assert.equal(coloreCristallo(v, dati), 'Bianco');
  // e la voce di partenza non è stata toccata: niente seconda arma, niente arma mutata sotto i piedi
  assert.equal(voceIniziale.rif, 'armi:cyberarma');
  assert.equal(voceIniziale.esemplare.storico.length, 1);
  // la Corruzione era del frammento Viola: togliendolo non resta addosso all'arma (§7.25.4)
  const conViola = { ...voceIniziale, esemplare: { ...voceIniziale.esemplare, focalizzatore: 'Viola', corruzione: 1 } };
  assert.equal(cambiaCristallo(conViola, 'verde', dati).voce.esemplare.corruzione, undefined);
  assert.equal(cambiaCristallo({ ...conViola, esemplare: { ...conViola.esemplare, focalizzatore: 'Bianco' } }, 'viola', dati).voce.esemplare.corruzione, 1);
  // non decide niente da sé: un colore che non esiste è un errore, e lo stesso colore non è un cambio
  assert.match(cambiaCristallo(voceIniziale, 'arancione', dati).errore, /non è fra quelli del manuale/);
  assert.match(cambiaCristallo(voceIniziale, 'verde', dati).errore, /già Verde/);
  assert.match(cambiaCristallo({ uid: 'x', rif: 'armi:colt-hammershot' }, 'verde', dati).errore, /Non è una CyberArma/);
});

test('il cristallo Viola non ha una Corruzione predefinita: il valore è del frammento', () => {
  const v = di('viola');
  assert.equal(v.eccezionale, true, '§7.25: «il Viola eccezionale»');
  assert.ok(v.corruzione, 'la Corruzione è dichiarata');
  assert.equal(v.corruzione.senza_predefinito, true);
  assert.match(v.corruzione.testo, /indicare il valore del frammento/i);
  assert.equal(v.corruzione.dove, 'esemplare.corruzione');
  // nessun numero: né nel cristallo, né nella voce di catalogo
  assert.equal(v.corruzione.valore, undefined);
  assert.equal(v.corruzione.predefinito, undefined);
  const cat = voce('cyberarma-viola');
  assert.equal(cat.corruzione, undefined);
  assert.equal(cat.esemplare, undefined);
  // «eccezionale» è una parola sul cristallo: non è una Qualità, non è una rarità, non è una Reperibilità e non
  // cambia il prezzo (le cinque voci hanno gli stessi Qualità, Reperibilità e valore della voce madre)
  const madre = voce('cyberarma');
  for (const k of ['qualita', 'reperibilita', 'costo']) assert.equal(cat[k], madre[k], `il Viola non cambia ${k}`);
  assert.notEqual(cat.qualita, 'Eccezionale');
  assert.notEqual(cat.reperibilita, 'Eccezionale');
});

test('la CyberArma di Dimitri non si muove: il lotto non cambia nessuno dei suoi numeri', () => {
  // l'istantanea è in sola lettura e può non esserci su un altro PC: senza, il controllo salta e lo dice
  const file = 'F:/REPOS/mutant/istantanee/stato_2026-11-21_2353/personaggi/Dimitri-Orlav_liv7_2026-11-21.json';
  let testo = null;
  try { testo = readFileSync(file, 'utf8'); } catch { /* niente istantanea su questo PC */ }
  if (testo === null) return; // vedi la riga «da provare» del lotto: senza l'istantanea non si misura
  const p = deserializzaPersonaggio(testo);
  const creazione = normalizza(p.creazione, dati).scelte;
  const s = calcolaScheda({ creazione, livelli: p.livelli, sessione: p.sessione }, dati);
  const a = (s.equipaggiamento?.armi ?? []).find((x) => (x.rif ?? '').startsWith('armi:cyberarma'));
  assert.ok(a, 'Dimitri ha una CyberArma nell’istantanea del 21/11');
  // i numeri misurati prima del lotto, sull'istantanea del 21/11/2026: VA 9, danno 1d8+1, Parata 8.
  // Non è un valore del manuale che possa cambiare: è lo stato di un file in sola lettura a una data.
  assert.equal(a.va, 9);
  assert.equal(a.danno.una_mano, '1d8+1');
  assert.equal(a.parata.va, 8);
  // e il perché: la sua voce è «armi:cyberarma» e non dichiara un focalizzatore, quindi nessun bonus di colore.
  // Il §7.25.4 dice che il Verde è installato: dichiararlo porterebbe a VA 10, danno 1d8+2, Parata 9, cioè
  // sposterebbe tre valori di un personaggio vero. Non lo fa questo lotto: lo decide il tavolo (A.307).
  assert.equal(a.rif, 'armi:cyberarma');
  assert.equal(a.focalizzatore, null);
  const voceSua = (p.creazione.equipaggiamento ?? []).find((v) => (v.rif ?? '').startsWith('armi:cyberarma'));
  assert.equal(bonusFocalizzatore(voceSua, ['Tecnomante'], dati), null);
});

// ─── aiuti ────────────────────────────────────────────────────────────────────────────────────────────────────

function fisso(formula) {
  const m = /([+−-])\s*(\d+)\s*$/.exec(String(formula ?? ''));
  return m ? (m[1] === '+' ? 1 : -1) * Number(m[2]) : 0;
}

/** Un PG d'esempio qualunque che non sia un Custode: il Custode non riceve il bonus del cristallo, perche la
 * sua tabella per Grado ce l'ha gia dentro (§7.25). Si cerca fra i file, non si scrive un nome a mano.
 */
function esempioNonCustode() {
  const nomi = readdirSync(new URL('../esempi/', import.meta.url)).filter((f) => f.endsWith('.json'));
  const scelto = nomi.find((f) => !/custode|predicatore/i.test(f));
  assert.ok(scelto, 'serve un PG d’esempio che non sia un Custode');
  return scelto;
}

/** La stessa scheda con una CyberArma senza cristallo e con la CyberArma Verde: la differenza è il cristallo. */
function schedeCol(base) {
  const conArma = (rif) => {
    const copia = JSON.parse(JSON.stringify(base));
    const scelte = copia.scelte ?? copia;
    scelte.equipaggiamento = [...(scelte.equipaggiamento ?? []), { uid: 'prova-cyber', rif, stato: 'impugnata', quantita: 1, sintonizzato: true }];
    const creazione = normalizza(scelte, dati).scelte;
    const s = calcolaScheda({ creazione, livelli: copia.livelli ?? [], sessione: copia.sessione ?? {} }, dati);
    const a = (s.equipaggiamento?.armi ?? []).find((x) => x.uid === 'prova-cyber');
    assert.ok(a, `l’arma ${rif} non è nella scheda`);
    return { s, a };
  };
  const b = conArma('armi:cyberarma');
  const v = conArma('armi:cyberarma-verde');
  return { scheda: b.s, armaBase: b.a, armaVerde: v.a };
}
