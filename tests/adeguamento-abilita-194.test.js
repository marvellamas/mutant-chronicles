import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 194 (13/11/2026): l'adeguamento straordinario delle Abilità (Giocatore 0.62 §8.3.1 e blocco approvato
// nel Doc E&L dell'11/11), la procedura che al tavolo porta i sette al profilo 4/7/9/4.
//
// **Due controlli esistono per due errori che abbiamo già pagato, e devono restare verdi sempre.**
//
//   1. *La procedura non parte su un personaggio senza la nota di prima.* Il 26 ottobre, ai Talenti, la nota di
//      quello che un personaggio aveva è arrivata dopo e solo su alcuni: al tavolo i giocatori non riuscivano a
//      ritrovare i propri Talenti vecchi, e non c'è stato modo di rimediare.
//   2. *Annullare riporta il file byte per byte.* Al tavolo qualcuno sbaglierà, e con sette persone che aspettano
//      non si rifà la serata.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  notaDiPrima, pianoAdeguamento, annullaAdeguamento, monteAdeguamento, adeguamentoAperto,
  statoAssegnazione, assegna, confermaAssegnazione, notaPerScheda, statoPerPlancia, puntiDellEvento, MARCA,
} from '../src/adeguamento-abilita.js';
import { calcolaSchedaPersonaggio } from '../src/avanzamento.js';
import { PROFILO_NUOVO } from '../src/competenze.js';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();

/** I personaggi del repo: gli esempi e i file di collaudo. Nessuno è adeguato. */
function personaggiDelRepo() {
  const out = [];
  for (const [dove, url] of [['esempi', new URL('../esempi/', import.meta.url)], ['collaudo', new URL('collaudo/', import.meta.url)]]) {
    for (const f of readdirSync(url).filter((x) => x.endsWith('.json'))) {
      const j = JSON.parse(readFileSync(new URL(f, url), 'utf8'));
      if (j?.scelte) out.push({ dove: `${dove}/${f}`, file: j });
    }
  }
  return out;
}
const tutti = personaggiDelRepo();
const uno = tutti.find((x) => x.dove.includes('a_imperiale_assaltatore')) ?? tutti[0];

// --- la nota di prima -------------------------------------------------------------------------------------

test('la nota di prima fotografa tutte e 24 le Abilità, con i punti evento per evento', () => {
  for (const { dove, file } of tutti) {
    const nota = notaDiPrima(file, dati);
    assert.equal(nota.abilita.length, dati.abilita.abilita.length, `${dove}: tutte le Abilità, non solo quelle che cambiano`);
    for (const a of nota.abilita) {
      for (const k of ['nome', 'competenza', 'base', 'mod', 'corporazione', 'daClasse', 'liberi', 'grezzo', 'limite', 'va']) {
        assert.ok(a[k] !== undefined, `${dove}: ${a.nome} senza ${k}`);
      }
    }
    // i punti liberi, evento per evento: è quello che il giocatore deve poter ritrovare
    assert.ok(nota.eventi.length >= 1, `${dove}: nessun evento con punti`);
    for (const e of nota.eventi) assert.ok(Number.isInteger(e.previsti) && e.evento, `${dove}: evento incompleto`);
    assert.ok(nota.livello >= 1 && nota.profilo, dove);
  }
});

test('la nota si legge dalla scheda, cioè dal tablet, e resta dopo la conferma', () => {
  const p = pianoAdeguamento(copia(uno.file), dati);
  const nota = notaPerScheda(p.nuovo.correzioni_master);
  assert.ok(nota, 'la nota è nel registro del master, che ogni giocatore legge');
  assert.equal(nota.abilita.length, dati.abilita.abilita.length);
  assert.ok(nota.testo.includes('Abilità prima dell’adeguamento') || nota.testo.includes("Abilità prima dell'adeguamento"));
  assert.ok(nota.eventi.length >= 1);
  // dopo la conferma resta: è la rete per chi al tavolo non ritrova i suoi numeri
  const ap = adeguamentoAperto(p.nuovo, dati);
  let bozza = puntiDellEvento(p.nuovo, ap.livello);
  while (statoAssegnazione(p.nuovo, bozza, dati).rimasti > 0) {
    const a = statoAssegnazione(p.nuovo, bozza, dati).abilita.find((x) => !x.motivoPiu);
    if (!a) break;
    bozza = assegna(p.nuovo, bozza, a.nome, 1, dati);
  }
  const ok = confermaAssegnazione(p.nuovo, bozza, dati);
  assert.ok(ok.ok, ok.motivo);
  assert.ok(notaPerScheda(ok.file.correzioni_master), 'la nota resta anche dopo la conferma');
});

test('la procedura non parte su un personaggio senza la nota di prima', () => {
  // un file che non si calcola: niente nota, niente adeguamento, e il motivo è scritto
  const rotto = copia(uno.file);
  rotto.scelte.classe = 'Classe che non esiste';
  const p = pianoAdeguamento(rotto, dati);
  assert.equal(p.bloccato, true, 'senza la nota di prima non si parte');
  assert.equal(p.nuovo, null, 'e non si scrive niente');
  assert.match(p.motivo, /nota di prima/);
  // e `notaDiPrima` si rifiuta di inventarla
  assert.throws(() => notaDiPrima(rotto, dati), /non si calcola/);
});

// --- si torna indietro ------------------------------------------------------------------------------------

test('annullare riporta il file byte per byte, contrassegno compreso', () => {
  for (const { dove, file } of tutti) {
    const partenza = JSON.stringify(file, null, 2);
    const p = pianoAdeguamento(copia(file), dati);
    if (!p.nuovo) continue;
    // prima della conferma
    const a = annullaAdeguamento(p.nuovo);
    assert.ok(a.ok, `${dove}: ${a.motivo}`);
    assert.equal(JSON.stringify(a.file, null, 2), partenza, `${dove}: il file non è tornato identico`);
    // e anche dopo averci assegnato dei punti e confermato
    const ap = adeguamentoAperto(p.nuovo, dati);
    let bozza = puntiDellEvento(p.nuovo, ap.livello);
    while (statoAssegnazione(p.nuovo, bozza, dati).rimasti > 0) {
      const x = statoAssegnazione(p.nuovo, bozza, dati).abilita.find((y) => !y.motivoPiu);
      if (!x) break;
      bozza = assegna(p.nuovo, bozza, x.nome, 1, dati);
    }
    const ok = confermaAssegnazione(p.nuovo, bozza, dati);
    if (!ok.ok) continue;
    const b = annullaAdeguamento(ok.file);
    assert.ok(b.ok, `${dove}: ${b.motivo}`);
    assert.equal(JSON.stringify(b.file, null, 2), partenza, `${dove}: dopo la conferma il file non è tornato identico`);
  }
});

test('annullare un personaggio non tocca gli altri', () => {
  const pronti = tutti.map((x) => pianoAdeguamento(copia(x.file), dati)).filter((p) => p.nuovo);
  assert.ok(pronti.length >= 2, 'servono due personaggi adeguabili');
  const a = pronti[0].nuovo;
  const b = pronti[1].nuovo;
  const primaB = JSON.stringify(b, null, 2);
  annullaAdeguamento(a);
  assert.equal(JSON.stringify(b, null, 2), primaB, 'annullare è per personaggio, non per cartella');
  assert.equal(b.scelte.regimeAbilita, PROFILO_NUOVO, 'l’altro resta adeguato');
});

// --- il monte e il profilo --------------------------------------------------------------------------------

test('il monte è 7 punti per Grado (§8.3.1), e il caso del livello 8 è dichiarato', () => {
  const perGrado = dati.regole.creazione.punti_abilita_liberi;
  assert.equal(perGrado, 7);
  for (const { dove, file } of tutti) {
    const m = monteAdeguamento(file, dati);
    assert.equal(m.monte, perGrado * m.gradi, `${dove}: il monte non è 7 per Grado`);
    assert.equal(m.atteso8, 21, 'al livello 8, con tre Gradi, fa i 21 del blocco approvato');
    // il monte non è scritto nel codice: se il personaggio non è al livello 8, la procedura lo dice
    const p = pianoAdeguamento(copia(file), dati);
    // un personaggio bloccato dalla A.267 non arriva ai casi: si ferma prima, ed è giusto così
    if (m.differenza !== 0 && !p.bloccato) assert.ok(p.casi.some((c) => /livello 8/.test(c)), `${dove}: la differenza dal blocco approvato va detta`);
  }
});

test('l’adeguamento mette il contrassegno del lotto 192 e azzera i punti liberi', () => {
  const p = pianoAdeguamento(copia(uno.file), dati);
  assert.equal(p.nuovo.scelte.regimeAbilita, PROFILO_NUOVO, 'è qui che il cancello del 192 si apre');
  // tutti i punti liberi azzerati, e il monte sull'ultimo evento (§8.3.1: stato e limiti attuali)
  const ap = adeguamentoAperto(p.nuovo, dati);
  assert.equal(ap.assegnati, 0);
  assert.equal(ap.monte, monteAdeguamento(uno.file, dati).monte);
  assert.equal(ap.livello, p.nota.eventi.at(-1).livello, 'i punti si assegnano sull’ultimo evento');
  for (const e of p.nota.eventi) {
    const punti = puntiDellEvento(p.nuovo, e.livello);
    assert.deepEqual(punti, {}, `${e.evento}: i punti liberi di prima vanno azzerati`);
  }
  // un personaggio già adeguato non si riadegua
  assert.equal(pianoAdeguamento(p.nuovo, dati).giaFatto, true);
  assert.equal(pianoAdeguamento(p.nuovo, dati).nuovo, null);
});

// --- quello che vede il giocatore ---------------------------------------------------------------------------

test('il giocatore vede com’era e come diventa, e quanto gli resta', () => {
  const p = pianoAdeguamento(copia(uno.file), dati);
  const s = statoAssegnazione(p.nuovo, null, dati);
  assert.equal(s.assegnati, 0);
  assert.equal(s.rimasti, s.monte);
  assert.equal(s.finito, false);
  assert.equal(s.abilita.length, dati.abilita.abilita.length);
  for (const a of s.abilita) {
    assert.ok(a.prima, `${a.nome}: senza il «prima» il giocatore non ritrova i suoi numeri`);
    assert.ok(Number.isInteger(a.dopo.va), `${a.nome}: senza il «dopo» non sa che cosa cambia`);
    assert.ok(Number.isInteger(a.massimo));
  }
  assert.ok(s.abilita.some((a) => a.cambiaCategoria), 'col profilo nuovo qualche categoria cambia, e si vede');
});

test('si torna indietro su una scelta senza ricominciare da capo', () => {
  const p = pianoAdeguamento(copia(uno.file), dati);
  const nome = statoAssegnazione(p.nuovo, null, dati).abilita.find((a) => !a.motivoPiu).nome;
  let b = assegna(p.nuovo, {}, nome, 1, dati);
  b = assegna(p.nuovo, b, nome, 1, dati);
  assert.equal(statoAssegnazione(p.nuovo, b, dati).assegnati, 2);
  b = assegna(p.nuovo, b, nome, -1, dati);
  assert.equal(statoAssegnazione(p.nuovo, b, dati).assegnati, 1, 'un passo indietro, non da capo');
  // non si va sotto zero e non si supera il monte
  let z = {};
  for (let i = 0; i < 3; i += 1) z = assegna(p.nuovo, z, nome, -1, dati);
  assert.deepEqual(z, {});
});

test('a punti finiti la scheda lo dice, e prima la conferma non si può', () => {
  const p = pianoAdeguamento(copia(uno.file), dati);
  const ap = adeguamentoAperto(p.nuovo, dati);
  let bozza = puntiDellEvento(p.nuovo, ap.livello);
  assert.equal(confermaAssegnazione(p.nuovo, bozza, dati).ok, false, 'con punti ancora da assegnare non si conferma');
  assert.match(confermaAssegnazione(p.nuovo, bozza, dati).motivo, /residui 0/);
  while (statoAssegnazione(p.nuovo, bozza, dati).rimasti > 0) {
    const a = statoAssegnazione(p.nuovo, bozza, dati).abilita.find((x) => !x.motivoPiu);
    if (!a) break;
    bozza = assegna(p.nuovo, bozza, a.nome, 1, dati);
  }
  const s = statoAssegnazione(p.nuovo, bozza, dati);
  assert.equal(s.rimasti, 0);
  assert.equal(s.finito, true, 'a punti finiti lo dice, non lo lascia indovinare');
  const ok = confermaAssegnazione(p.nuovo, bozza, dati);
  assert.ok(ok.ok);
  // i punti sono nel file, e l'adeguamento è chiuso: riaprire non li raddoppia (§8.3.1)
  assert.equal(adeguamentoAperto(ok.file, dati), null);
  assert.equal(Object.values(puntiDellEvento(ok.file, s.livello)).reduce((x, y) => x + y, 0), s.monte);
  const dopo = calcolaSchedaPersonaggio({ creazione: ok.file.scelte, livelli: ok.file.livelli }, dati);
  assert.equal(dopo.profiloAbilita.chiave, 'nuovo');
});

// --- quello che vede il Direttore ---------------------------------------------------------------------------

test('la plancia dice a che punto è ciascuno', () => {
  const prima = statoPerPlancia(uno.file, dati);
  assert.equal(prima.stato, 'da fare');
  const p = pianoAdeguamento(copia(uno.file), dati);
  assert.equal(statoPerPlancia(p.nuovo, dati).stato, 'in corso');
  assert.match(statoPerPlancia(p.nuovo, dati).testo, /ne restano/);
  const ap = adeguamentoAperto(p.nuovo, dati);
  let bozza = puntiDellEvento(p.nuovo, ap.livello);
  while (statoAssegnazione(p.nuovo, bozza, dati).rimasti > 0) {
    const a = statoAssegnazione(p.nuovo, bozza, dati).abilita.find((x) => !x.motivoPiu);
    if (!a) break;
    bozza = assegna(p.nuovo, bozza, a.nome, 1, dati);
  }
  const ok = confermaAssegnazione(p.nuovo, bozza, dati);
  assert.equal(statoPerPlancia(ok.file, dati).stato, 'adeguato');
});

// --- quello che l'app non decide ----------------------------------------------------------------------------

test('A.267: se un’Abilità scende di categoria la procedura si ferma e lo dice, invece di scegliere', () => {
  // nessuno dei personaggi del repo la subisce (lotto 192), e il controllo lo pretende
  for (const { dove, file } of tutti) {
    const p = pianoAdeguamento(copia(file), dati);
    if (p.scendono.length) assert.equal(p.bloccato, true, `${dove}: con una base che scende non si procede`);
  }
  // costruito apposta: una Classe in cui un'Abilità passa da Specializzata a Non competente
  const d = copia(dati);
  const c = d.classi.classi[0];
  const giu = c.competenze.S[0];
  c.competenze = { ...c.competenze, S: [...c.competenze.S.filter((x) => x !== giu), c.competenze.N[0]], N: [...c.competenze.N.filter((x) => x !== c.competenze.N[0]), giu] };
  const pg = copia(tutti.find((x) => (x.file.scelte.classe ?? x.file.scelte.classi?.[0]?.nome) === c.nome)?.file ?? null);
  if (!pg) return; // nessun personaggio di quella Classe fra quelli del repo
  const p = pianoAdeguamento(pg, d);
  assert.equal(p.bloccato, true, 'la A.267 è aperta: non si inventa un comportamento');
  assert.ok(p.scendono.length >= 1);
  assert.match(p.motivo, /A\.267/);
  assert.equal(p.nuovo, null, 'e non si scrive niente');
  assert.ok(p.nota, 'la nota di prima però c’è: serve comunque');
});

test('un personaggio non ancora adeguato resta identico a come è oggi', () => {
  // durante la serata i sette non saranno migrati tutti insieme: chi non è stato toccato non vede niente
  for (const { dove, file } of tutti) {
    assert.equal(file.scelte.regimeAbilita, undefined, `${dove}: nessun file del repo è adeguato`);
    assert.equal(adeguamentoAperto(file, dati), null, `${dove}: nessun adeguamento aperto`);
    assert.equal(statoAssegnazione(file, null, dati), null, `${dove}: nessun pannello`);
    assert.equal(notaPerScheda(file.correzioni_master), null, `${dove}: nessuna nota`);
    const s = calcolaSchedaPersonaggio({ creazione: file.scelte, livelli: file.livelli }, dati);
    assert.equal(s.profiloAbilita.chiave, 'precedente', `${dove}: resta al profilo di prima`);
  }
});

test('la riga della nota è marcata, e il server la riconosce come modifica del master', () => {
  const p = pianoAdeguamento(copia(uno.file), dati);
  const riga = p.nuovo.correzioni_master.at(-1);
  assert.equal(riga[MARCA], true);
  assert.equal(riga.tipo, 'scelta');
  assert.equal(riga.chiave, 'abilita');
  assert.ok(riga.primaDelAdeguamento, 'senza questo non si torna indietro');
  assert.ok(Number.isInteger(riga.monte) && Number.isInteger(riga.eventoAssegnazione));
});
