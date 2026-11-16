import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 207 (16/11/2026) — **la serata dell'adeguamento, pronta per davvero.**
//
// Le regole che questo test difende, e perché ciascuna costa caro se si rompe:
//
//  1. **A.267: la discesa è accettata e la procedura parte** (risposta del 15/11). Fino al 194 si fermava, ed era
//     la cosa giusta senza una risposta. Ora parte, non compensa, non conserva niente di nascosto, e la discesa
//     resta scritta nel file: un VA che scende senza spiegazione, al tavolo, è una discussione.
//  2. **Annullare riporta il file byte per byte, sul disco e non nell'oggetto.** Il test del 194 confrontava
//     `JSON.stringify` del file in memoria: provava che la funzione pura torna indietro, non che il file sulla
//     cartella torna indietro. Qui si passa dal disco, su una cartella **come quella di Davide** (cinque versioni
//     per personaggio), perché è l'unico attrezzo di sicurezza della serata.
//  3. **La nota di prima su tutti, o non si parte per nessuno.** La doppia passata del 194 vale ancora dopo le
//     modifiche di questo lotto: non si dà per fatta perché era fatta due settimane fa.
//  4. **A.272: le strade si dicono, non si presumono.** La destinazione approvata è il livello del terzo Grado con
//     21 punti; i PX e la soglia si leggono dai dati, e la frase dice che adeguare al livello di adesso con meno
//     punti non è la strada approvata.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  pianoAdeguamento, annullaAdeguamento, stradeDelLivello, livelloDestinazione, cambiDelProfilo,
  notaPerScheda, statoAssegnazione, assegna, confermaAssegnazione, MARCA,
} from '../src/adeguamento-abilita.js';
import { PROFILO_NUOVO } from '../src/competenze.js';
import { applica, annulla, rapporto, righeRapporto } from '../tools/adegua-abilita.mjs';
import { cartellaComeDavide, improntaCartella, differenze } from './cartella-come-davide.mjs';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();
const RADICE = new URL('../', import.meta.url);
const leggi = (f) => JSON.parse(readFileSync(new URL(f, RADICE), 'utf8'));

/** Il Custode d'esempio: il solo personaggio del repo che col profilo nuovo **perde** VA. */
const custode = () => leggi('esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json');

test('A.267 (15/11/2026): la procedura parte anche quando un’Abilità scende', () => {
  const p = pianoAdeguamento(custode(), dati);
  assert.equal(p.bloccato, false, 'non si ferma più: la risposta c’è');
  assert.ok(p.nuovo, 'e produce il file nuovo');
  assert.ok(p.scendono.length >= 1, 'le Abilità che scendono si contano');
  // il Custode approvato nel blocco E&L dell'11/11 ha Artefatti G e Intrattenere N: la discesa è quella decisa
  const nomi = p.scendono.map((x) => x.nome);
  assert.ok(nomi.includes('Artefatti') && nomi.includes('Intrattenere'), `scendono: ${nomi.join(', ')}`);
  for (const x of p.scendono) assert.ok(x.vaDopo < x.vaPrima, `${x.nome}: ${x.vaPrima} → ${x.vaDopo}`);
});

test('A.267: la discesa si dice nel piano e resta scritta nel file', () => {
  const p = pianoAdeguamento(custode(), dati);
  // detta: nel piano, con il numero della risposta e la parola che conta
  const caso = p.casi.find((c) => /A\.267/.test(c));
  assert.ok(caso, 'il piano lo dice');
  assert.match(caso, /accettata/);
  assert.match(caso, /non si conserva il valore di prima e non si compensa/);
  assert.match(caso, /Modifica master/, 'e dice dov’è l’eccezione del Direttore: un atto a parte');
  // scritta: nella riga del registro, coi due numeri, perché fra sei mesi nessuno si ricordi il perché
  const riga = p.nuovo.correzioni_master.at(-1);
  assert.equal(riga[MARCA], true);
  assert.ok(Array.isArray(riga.scendonoA267));
  assert.equal(riga.scendonoA267.length, p.scendono.length);
  for (const x of riga.scendonoA267) assert.ok(x.nome && Number.isInteger(x.vaPrima) && x.vaDopo < x.vaPrima);
});

test('A.267: nessuna compensazione automatica e nessun valore di prima conservato', () => {
  // **il controllo che deve restare verde sempre.** La risposta è esplicita: «non si conserva automaticamente il
  // valore precedente e non si assegna una compensazione automatica». Se un domani qualcuno aggiungesse un punto
  // di cortesia o un'eccezione silenziosa, al tavolo nessuno saprebbe da dove viene quel numero.
  const p = pianoAdeguamento(custode(), dati);
  assert.deepEqual(p.nuovo.scelte.puntiAbilitaLiberi, {}, 'i punti liberi sono azzerati come per tutti');
  assert.equal(p.nuovo.scelte.regimeAbilita, PROFILO_NUOVO);
  const riga = p.nuovo.correzioni_master.at(-1);
  assert.equal(riga.monte, p.monte.monte, 'il monte è quello del §8.3.1, non uno gonfiato per compensare');
  // e nessuna eccezione sulle Abilità che scendono: `oltreLimite` della A.247 non viene toccato
  for (const a of p.nuovo.livelli ?? []) assert.equal(a.oltreLimite, undefined);
  assert.equal(p.nuovo.scelte.oltreLimite, undefined);
});

test('la discesa si legge nel pannello del giocatore, sulla sua riga', () => {
  const p = pianoAdeguamento(custode(), dati);
  const s = statoAssegnazione(p.nuovo, null, dati);
  assert.ok(s, 'l’adeguamento è aperto');
  const giu = s.abilita.filter((a) => a.prima && a.base < a.prima.base);
  assert.ok(giu.length >= 1, 'il pannello sa quali Abilità hanno perso base');
  for (const a of giu) {
    assert.ok(a.cambiaCategoria, `${a.nome}: la riga dice che la categoria è cambiata`);
    assert.ok(a.prima.va > a.dopo.va, `${a.nome}: e che il VA era più alto`);
  }
});

test('A.272: le strade per il livello approvato si dicono, e i numeri vengono dai dati', () => {
  const dest = livelloDestinazione(dati);
  assert.equal(dest, 8, 'il terzo Grado è il livello 8');
  const soglia = dati.px_partita.soglie_px[dest - 1];
  assert.equal(soglia, 1050);
  // un personaggio al livello 7 con meno PX della soglia: due strade, e nessuna presunta
  const sette = { ...custode(), livelli: Array.from({ length: 6 }, () => ({})) , scelte: { ...custode().scelte, puntiEsperienza: 1022 } };
  const s = stradeDelLivello(sette, dati);
  assert.equal(s.destinazione, 8);
  assert.equal(s.bastano, false);
  assert.equal(s.mancano, 28);
  assert.equal(s.monteDestinazione, 21);
  assert.ok(s.strade.some((x) => /serata di PX/.test(x)));
  assert.ok(s.strade.some((x) => /A\.187/.test(x)), 'la concessione del Direttore è una strada dichiarata');
  assert.match(s.frase, /non è la strada approvata/, 'e adeguare adesso con meno punti non lo è');
  // chi ha i PX non si sente proporre la concessione
  const conPx = { ...sette, scelte: { ...sette.scelte, puntiEsperienza: 1200 } };
  const t = stradeDelLivello(conPx, dati);
  assert.equal(t.bastano, true);
  assert.ok(!t.strade.some((x) => /A\.187/.test(x)));
});

test('il conto del solo profilo si misura a punti liberi azzerati da entrambi i lati', () => {
  // confrontare il VA di prima (coi suoi punti) con quello di dopo (senza, perché si ridistribuiscono) direbbe
  // che scendono quasi tutte: è falso, e al tavolo spaventerebbe per niente
  const c = cambiDelProfilo(custode(), dati);
  assert.equal(c.abilita.length, 24);
  assert.ok(c.cambiano.length >= 1);
  assert.equal(c.scendono.length, 2, 'il Custode perde Artefatti e Intrattenere');
  assert.ok(c.salgono.length >= c.cambiano.length - c.scendono.length);
  for (const x of c.abilita) assert.ok(Number.isInteger(x.vaPrima) && Number.isInteger(x.vaDopo));
});

test('IL CONTROLLO DELLA SERATA: annullare riporta il file byte per byte, sul disco', async () => {
  // **passa dal disco, non dall'oggetto.** Il 194 confrontava `JSON.stringify` del file in memoria: provava che
  // la funzione torna indietro, non che il file sulla cartella torna indietro. E la cartella è come quella di
  // Davide — cinque versioni per personaggio — perché con un file ciascuno il difetto del lotto 200 era invisibile.
  const { cartella, salvataggi, voci, quantiFile } = cartellaComeDavide({ quanti: 3, versioni: 5 });
  assert.equal(quantiFile, 15);
  const prima = improntaCartella(cartella);
  await applica({ cartella, salvataggi, d: dati });
  const dopo = improntaCartella(cartella);
  const cambiati = differenze(prima, dopo);
  assert.equal(cambiati.length, 3, `solo i tre file attuali cambiano: ${cambiati.map((x) => x.file).join(', ')}`);
  for (const v of voci) assert.ok(cambiati.some((x) => x.file === v.attuale.nome), `${v.nome}: cambia il file attuale`);

  // annullato uno, il suo file torna **identico byte per byte** e gli altri non si muovono
  const chi = voci[1];
  await annulla({ cartella, chi: chi.nome, d: dati });
  const finale = improntaCartella(cartella);
  assert.ok(finale[chi.attuale.nome].equals(prima[chi.attuale.nome]), `${chi.nome}: il file è tornato identico`);
  const restanti = differenze(prima, finale).map((x) => x.file);
  assert.equal(restanti.length, 2, `restano adeguati solo gli altri due: ${restanti.join(', ')}`);
  assert.ok(!restanti.includes(chi.attuale.nome));
});

test('IL CONTROLLO DELLA SERATA: la nota di prima su tutti, o non si scrive per nessuno', async () => {
  // la doppia passata del 194, ricontrollata dopo le modifiche di questo lotto. Un personaggio che non si calcola
  // (`scelte` rotte) blocca la scrittura **di tutti**: la lezione del 26 ottobre, quando ai Talenti la nota arrivò
  // dopo e solo su alcuni, e al tavolo i giocatori non ritrovarono i propri Talenti vecchi.
  const { cartella, salvataggi, voci } = cartellaComeDavide({ quanti: 3, versioni: 2 });
  const rotto = join(cartella, voci[2].attuale.nome);
  const j = JSON.parse(readFileSync(rotto, 'utf8'));
  writeFileSync(rotto, `${JSON.stringify({ ...j, scelte: { ...j.scelte, classe: 'Classe che non esiste' } }, null, 2)}\n`);
  const prima = improntaCartella(cartella);
  const esito = await applica({ cartella, salvataggi, d: dati });
  const dopo = improntaCartella(cartella);
  assert.deepEqual(differenze(prima, dopo), [], 'nessun file toccato: se uno è bloccato non si parte per nessuno');
  // e lo dice, invece di tacere: il programma non lancia, risponde — e la risposta porta chi è bloccato e il perché
  assert.equal(esito.fatto, false);
  assert.equal(esito.zip, null, 'e nemmeno la copia zip si fa: non c’è niente da cui tornare indietro');
  assert.deepEqual(esito.scritti, []);
  assert.equal(esito.bloccati.length, 1);
  assert.equal(esito.bloccati[0].nome, voci[2].nome);
  assert.match(esito.motivo, /non tocco nessuno/);
  assert.match(esito.motivo, /26 ottobre/, 'con il perché: è la lezione della migrazione dei Talenti');
});

test('il rapporto dice, per ciascuno, se parte, quanti punti e quante Abilità cambiano', async () => {
  const { cartella } = cartellaComeDavide({ quanti: 2, versioni: 2 });
  const r = await rapporto({ cartella, d: dati });
  const righe = righeRapporto(r).join('\n');
  assert.match(righe, /profilo nuovo: \d+ Abilità cambiano categoria · \d+ salgono di VA · \d+ scendono/);
  assert.match(righe, /La destinazione approvata è il livello 8 con 21 punti/);
  for (const p of r.piani) {
    assert.ok(p.cambi, 'ogni piano porta il conto del profilo');
    assert.equal(p.cambi.abilita.length, 24);
    assert.ok(p.px, 'e le strade del livello');
  }
});

test('LA PLANCIA LO DICE: la riga dell’adeguamento arriva al Direttore, passando da vistaPlancia', async () => {
  // **il difetto che questa prova ha trovato.** `statoPerPlancia` era usato e non importato in `src/tavolo.js` dal
  // lotto 194, e il `catch` nudo della riga che lo chiama trasformava il ReferenceError in `adeguamento: null`: la
  // riga non è mai comparsa, e il Direttore avrebbe visto tutti e sette come se avessero finito. Il test passa da
  // `vistaPlancia`, cioè dalla via vera — chiamare il motore da solo non avrebbe scoperto niente.
  const { vistaPlancia } = await import('../src/tavolo.js');
  const { serializza } = await import('../src/character.js');
  const scrivi = (o) => serializza(o.scelte, { livelli: o.livelli, sessione: o.sessione ?? null });
  // uno con l'adeguamento aperto
  const p = pianoAdeguamento(custode(), dati);
  const file = { ...p.nuovo };
  const testo = JSON.stringify({ ...JSON.parse(scrivi(file)), correzioni_master: file.correzioni_master });
  const v = vistaPlancia(testo, dati, 'x.json');
  assert.ok(v.adeguamento, 'la carta porta lo stato dell’adeguamento');
  assert.equal(v.adeguamento.stato, 'in corso');
  assert.match(v.adeguamento.testo, /0\/\d+ punti/);
  assert.equal(v.adeguamento.monte, p.monte.monte);
  // e uno che non è stato toccato: «non ancora adeguato», non «adeguato»
  const w = vistaPlancia(scrivi(leggi('esempi/Nadia-Ferro_liv4_2026-10-02.json')), dati, 'y.json');
  assert.ok(w.adeguamento);
  assert.equal(w.adeguamento.stato, 'da fare');
  assert.equal(w.adeguamento.finito, false, 'chi non è stato toccato non deve risultare finito');
});

test('un personaggio non adeguato resta identico: chi non è stato toccato non vede niente', () => {
  const nadia = leggi('esempi/Nadia-Ferro_liv4_2026-10-02.json');
  assert.equal(nadia.scelte.regimeAbilita, undefined, 'nessun esempio del repo è adeguato');
  assert.equal(statoAssegnazione(nadia, null, dati), null, 'nessun pannello');
  assert.equal(notaPerScheda(nadia.correzioni_master), null, 'nessuna nota');
});

test('un adeguamento intero: i punti si assegnano, si torna indietro di un passo, si conferma', () => {
  const p = pianoAdeguamento(custode(), dati);
  let file = p.nuovo;
  let bozza = {};
  const s0 = statoAssegnazione(file, bozza, dati);
  assert.equal(s0.rimasti, s0.monte);
  // si assegna fino a esaurire i punti, una cosa alla volta, sempre dove è legale
  let giri = 0;
  while (statoAssegnazione(file, bozza, dati).rimasti > 0 && giri < 200) {
    const s = statoAssegnazione(file, bozza, dati);
    const dove = s.abilita.find((a) => !a.motivoPiu);
    assert.ok(dove, 'c’è sempre un posto dove un punto aumenta il VA');
    bozza = assegna(file, bozza, dove.nome, 1, dati);
    giri += 1;
  }
  const pieno = statoAssegnazione(file, bozza, dati);
  assert.equal(pieno.rimasti, 0);
  assert.equal(pieno.finito, true);
  // un passo indietro: il punto torna disponibile
  const unaConPunti = pieno.abilita.find((a) => a.punti > 0);
  bozza = assegna(file, bozza, unaConPunti.nome, -1, dati);
  assert.equal(statoAssegnazione(file, bozza, dati).rimasti, 1);
  assert.equal(confermaAssegnazione(file, bozza, dati).ok, false, 'con un punto in sospeso non si conferma');
  // rimesso, la conferma passa e l'adeguamento si chiude
  bozza = assegna(file, bozza, unaConPunti.nome, 1, dati);
  const c = confermaAssegnazione(file, bozza, dati);
  assert.equal(c.ok, true);
  assert.equal(statoAssegnazione(c.file, null, dati), null, 'il pannello sparisce');
  assert.ok(notaPerScheda(c.file.correzioni_master), 'la nota di prima resta');
  // e si torna indietro anche dopo la conferma
  const indietro = annullaAdeguamento(c.file, dati);
  assert.equal(indietro.file.scelte.regimeAbilita, undefined);
  assert.deepEqual(indietro.file.scelte.puntiAbilitaLiberi, custode().scelte.puntiAbilitaLiberi ?? {});
});
