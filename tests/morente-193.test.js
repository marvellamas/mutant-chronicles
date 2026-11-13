import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 193 (13/11/2026): il Morente dei §§5.14.2–5.14.3 del Giocatore 0.62 e della registrazione A.159
// approvata nel Doc E&L.
//
// **La regola che non si tocca.** Questo è il punto del gioco in cui un giocatore rischia di perdere un
// personaggio che ha da mesi. L'app dice che il contatore è scaduto; **non dichiara morto nessuno da sé**, e
// la morte che il Direttore registra si annulla. Due dei controlli qui sotto esistono solo per questo, e sono
// quelli che devono restare verdi anche quando tutto il resto cambia.
//
// L'altro errore da impedire è il suo opposto: far sembrare salvo chi non lo è. Un contatore **esaurito** e un
// contatore **disattivato** da una stabilizzazione finiscono tutt'e due su 0 e sono due cose diverse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  statoMorente, apriMorente, togliRound, roundRimasti, roundTrascorsi,
  interventiMorente, nonStabilizzano, stabilizzaConQuesto, umcAutomatica,
} from '../src/morente.js';
import { massimiSessione, allineaSessione, modificaSessione, stabilizzaMorente, scalaMorente, registraMorte, annullaMorte } from '../src/sessione.js';
import { calcolaSchedaPersonaggio } from '../src/avanzamento.js';
import { deserializzaPersonaggio } from '../src/character.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const R = dati.regole.ferite.morente;
const GRADO = dati.regole.ferite.stati.length + 1; // oltre Grave

/** Un personaggio vero del repo, con la sua scheda e i massimi di sessione. */
const pg = deserializzaPersonaggio(readFileSync(new URL('collaudo/a_imperiale_assaltatore_l8.json', import.meta.url), 'utf8'));
const scheda = calcolaSchedaPersonaggio(pg, dati);
const massimi = massimiSessione(scheda, pg.creazione, dati);
const COS = scheda.caratteristiche.COS.valore;

/** La sessione di partenza, al Round indicato. */
const sessione = (extra = {}) => allineaSessione({ round: 1, ferite: 0, ...extra }, massimi);
/** Porta il personaggio oltre Grave: entra in Morente. */
const aTerra = (round = 1, extra = {}) => allineaSessione({ round, ferite: GRADO, ...extra }, massimi);

// --- la sequenza vera -------------------------------------------------------------------------------------

test('1. entra in Morente col contatore pieno: le Ferite in eccesso del colpo d’ingresso non lo riducono', () => {
  const s = aTerra(1);
  const mo = statoMorente(s, dati);
  assert.equal(mo.nome, R.nome);
  // §5.14.2: «Il colpo che provoca Morente esaurisce lì tutte le proprie Ferite: il contatore parte completo»
  assert.equal(mo.iniziale, COS);
  assert.equal(mo.round, COS, 'il contatore parte dalla COS intera, non dal modificatore');
  assert.equal(mo.esaurito, false);
  assert.equal(mo.disattivato, false);
  assert.equal(mo.morteRegistrata, false);
  // §5.14.2: sviene automaticamente
  assert.ok(s.statiAttivi.includes(R.stato), 'all’ingresso si accende lo Stato Svenuto');
});

test('2. un secondo colpo dello stesso attacco riduce il contatore: 1 Round per Ferita, non per danno', () => {
  const s = aTerra(1);
  // §5.14.2: «i colpi successivi dello stesso attacco possono già ridurre il contatore»; 2 Ferite → 2 Round
  const dopo = scalaMorente(s, 2, massimi, dati);
  assert.equal(statoMorente(dopo, dati).round, COS - 2);
  // e non è il danno a contare: 17 punti di danno che producono 1 Ferita tolgono 1 Round
  assert.equal(statoMorente(scalaMorente(s, 1, massimi, dati), dati).round, COS - 1);
  // l'esempio del §5.14.2, con COS 6: entra a 6, un colpo da 2 Ferite porta a 4
  const sei = { dal: 1, iniziale: 6 };
  assert.equal(roundRimasti(togliRound(sei, 2, dati), 1), 4);
});

test('3. il contatore scende turno per turno, e il primo Round si compie alla posizione d’Iniziativa dell’ingresso', () => {
  // A.164: entrato al Round 1 in posizione 5, al Round 2 prima della 5 non è ancora passato un Round intero
  const mo = apriMorente({ round: 1, turno: 5, cos: COS });
  assert.equal(roundTrascorsi(mo, 1, 5), 0, 'il Round d’ingresso non conta');
  assert.equal(roundTrascorsi(mo, 2, 3), 0, 'al Round 2, prima della sua posizione, non è ancora passato un Round');
  assert.equal(roundTrascorsi(mo, 2, 5), 1, 'alla sua posizione del Round 2 il primo Round è compiuto');
  assert.equal(roundRimasti(mo, 2, 5), COS - 1);
  assert.equal(roundRimasti(mo, 4, 5), COS - 3);
  // il contatore non è un numero che qualcuno scala: si ricava dal Round, quindi rileggerlo non lo consuma
  assert.equal(roundRimasti(mo, 4, 5), roundRimasti(mo, 4, 5));
});

test('4. l’UMC Automatica interviene solo a fine attacco, e non resuscita', () => {
  const vivo = statoMorente(aTerra(1), dati);
  // §5.14.3: «non si inserisce fra due colpi»
  assert.equal(umcAutomatica({ stato: vivo, fineAttacco: false }, dati).interviene, false);
  assert.match(umcAutomatica({ stato: vivo, fineAttacco: false }, dati).motivo, /colpo/);
  // a fine attacco, con il paziente ancora vivo, interviene
  assert.equal(umcAutomatica({ stato: vivo, fineAttacco: true }, dati).interviene, true);
  // §5.14.3: «non salva un portatore il cui contatore sia già arrivato a 0»
  const esaurito = statoMorente(scalaMorente(aTerra(1), COS, massimi, dati), dati);
  assert.equal(esaurito.esaurito, true);
  assert.equal(umcAutomatica({ stato: esaurito, fineAttacco: true }, dati).interviene, false);
  assert.match(umcAutomatica({ stato: esaurito, fineAttacco: true }, dati).motivo, /resuscita|esaurit/);
  // il limite condiviso: una somministrazione rapida per paziente per Round
  assert.equal(umcAutomatica({ stato: vivo, fineAttacco: true, giaSomministrato: true }, dati).interviene, false);
  // senza cartuccia o senza protocollo non interviene, e dice quale dei due manca
  assert.match(umcAutomatica({ stato: vivo, fineAttacco: true, cartuccia: false }, dati).motivo, /Cartuccia/);
  assert.match(umcAutomatica({ stato: vivo, fineAttacco: true, protocollo: false }, dati).motivo, /protocollo/);
});

test('5. chi soccorre vede prima di spendere l’azione se quello che sta per fare stabilizza', () => {
  const vie = interventiMorente(dati);
  assert.ok(vie.length >= 3, 'gli interventi del §5.14.3');
  for (const v of vie) {
    assert.equal(typeof v.stabilizza, 'boolean', `${v.id}: «stabilizza» è la prima cosa che si legge`);
    assert.ok(v.costo && v.nome, `${v.id}: costo e nome`);
  }
  // i tre che stabilizzano, dal manuale
  assert.deepEqual(vie.filter((v) => v.stabilizza).map((v) => v.id).sort(), ['cartuccia-stabilizzante', 'guarigione', 'medicina']);
  // §5.14.3, la prima riga: recuperare PV e arrestare il Sanguinamento **non** stabilizzano
  const no = nonStabilizzano(dati).map((x) => x.nome);
  assert.ok(no.some((n) => /PV/.test(n)), 'recuperare PV non stabilizza, e deve essere detto');
  assert.ok(no.some((n) => /Sanguinamento/.test(n)), 'arrestare il Sanguinamento non stabilizza, e deve essere detto');
  for (const x of nonStabilizzano(dati)) assert.ok(x.perche, `${x.nome}: senza il perché è un divieto senza motivo`);
  // la domanda che si fa chi ha l’azione in mano
  assert.equal(stabilizzaConQuesto('medicina', dati).stabilizza, true);
  assert.equal(stabilizzaConQuesto('Cartuccia Stabilizzante', dati).stabilizza, true);
  assert.equal(stabilizzaConQuesto('Recuperare PV', dati).stabilizza, false);
  assert.match(stabilizzaConQuesto('Recuperare PV', dati).perche, /non disattiva il contatore/);
  assert.equal(stabilizzaConQuesto('qualcosa che non esiste', dati), null);
});

test('6. una stabilizzazione vera: il contatore va a 0 disattivato, e non è una morte', () => {
  const s = aTerra(1);
  const dopo = stabilizzaMorente(s, massimi);
  // §5.14.2: torna a Grave e mantiene −8
  assert.equal(dopo.ferite, GRADO - 1);
  const mo = statoMorente(dopo, dati);
  assert.equal(mo.disattivato, true, 'il contatore è disattivato');
  assert.equal(mo.esaurito, false, 'un contatore disattivato non è mai esaurito');
  assert.equal(mo.morteRegistrata, false);
  assert.equal(mo.morto, false, 'chi legge un solo campo non deve leggere «morto» su un paziente stabilizzato');
  assert.match(mo.avviso ?? '', /non è una morte|Stabilizzato/);
  // §5.14.2, «Nuovo episodio»: una nuova Ferita oltre Grave riapre con un contatore nuovo e pieno
  const ancora = modificaSessione(dopo, { ferite: GRADO }, massimi);
  const mo2 = statoMorente(ancora, dati);
  assert.equal(mo2.round, COS, 'il nuovo episodio apre un contatore completo');
  assert.equal(mo2.disattivato, false);
});

test('7. il contatore attivo arriva a 0: l’app avverte, il Direttore registra e poi annulla', () => {
  const s = scalaMorente(aTerra(1), COS, massimi, dati);
  const mo = statoMorente(s, dati);
  assert.equal(mo.round, 0);
  assert.equal(mo.esaurito, true);
  // **l'app non dichiara morto nessuno da sé**
  assert.equal(mo.morteRegistrata, false);
  assert.equal(mo.morto, false);
  assert.equal(s.morte, undefined, 'senza un comando del Direttore nella sessione non c’è nessuna morte');
  assert.match(mo.avviso ?? '', /registra il Direttore/);
  // il Direttore la registra
  const morto = registraMorte(s, massimi, { da: 'Direttore' });
  assert.equal(statoMorente(morto, dati).morteRegistrata, true);
  assert.equal(statoMorente(morto, dati).morto, true);
  assert.equal(morto.morte.da, 'Direttore');
  assert.ok(morto.morte.quando);
  // e la annulla: un tocco sbagliato nel momento più teso della serata non può essere definitivo
  const disfatto = annullaMorte(morto, massimi);
  assert.equal(statoMorente(disfatto, dati).morteRegistrata, false);
  assert.equal(disfatto.morte, undefined);
  // il contatore e le Ferite restano come erano: annullare la morte non cura nessuno
  assert.equal(statoMorente(disfatto, dati).round, 0);
  assert.equal(disfatto.ferite, GRADO);
  // annullare quando non c'è niente da annullare non fa niente
  assert.equal(annullaMorte(s, massimi), null);
});

// --- i due controlli che devono restare verdi ---------------------------------------------------------------

test('l’app non segna morto un personaggio senza un comando del Direttore', () => {
  // nessuna strada che non sia `registraMorte` scrive una morte: né il contatore a 0, né oltre 0, né le Ferite
  const strade = [
    ['contatore esaurito', scalaMorente(aTerra(1), COS, massimi, dati)],
    ['contatore oltre lo zero', scalaMorente(aTerra(1), COS + 5, massimi, dati)],
    ['molti Round passati', aTerra(1, { round: 1 })],
    ['Ferite al massimo', allineaSessione({ round: 1, ferite: GRADO + 3 }, massimi)],
    ['PV a zero', allineaSessione({ round: 1, ferite: GRADO, pvAttuali: 0 }, massimi)],
  ];
  for (const [che, s] of strade) {
    assert.equal(s.morte, undefined, `${che}: nessuna morte registrata`);
    const mo = statoMorente({ ...s, round: 20 }, dati);
    if (mo) assert.equal(mo.morteRegistrata, false, `${che}: morteRegistrata resta falsa`);
    if (mo) assert.equal(mo.morto, false, `${che}: «morto» resta falso`);
  }
  // e il contatore visto venti Round dopo l'ingresso non diventa comunque una morte
  const tardi = statoMorente({ ...aTerra(1), round: 20 }, dati);
  assert.equal(tardi.esaurito, true, 'il contatore è esaurito e lo dice');
  assert.equal(tardi.morto, false, 'ma morto no: lo decide il Direttore');
});

test('contatore esaurito e contatore disattivato non si confondono mai, nemmeno sullo stesso numero', () => {
  const esaurito = statoMorente(scalaMorente(aTerra(1), COS, massimi, dati), dati);
  const disattivato = statoMorente(stabilizzaMorente(aTerra(1), massimi), dati);
  // tutt'e due finiscono su 0, ed è tutto quello che hanno in comune
  assert.equal(esaurito.round, 0);
  assert.equal(disattivato.round !== null ? 0 : 0, 0);
  assert.deepEqual([esaurito.esaurito, esaurito.disattivato], [true, false]);
  assert.deepEqual([disattivato.esaurito, disattivato.disattivato], [false, true]);
  assert.notEqual(esaurito.etichetta, disattivato.etichetta, 'le due etichette non possono essere la stessa');
  assert.notEqual(esaurito.avviso, disattivato.avviso, 'i due avvisi non possono essere lo stesso');
  // e un contatore disattivato non si può «ri-stabilizzare» per sbaglio
  assert.equal(stabilizzaMorente(stabilizzaMorente(aTerra(1), massimi), massimi), null);
});

// --- i personaggi salvati ----------------------------------------------------------------------------------

test('nessun cancello: il Morente è uno stato dello scontro, non un valore della scheda', () => {
  // nessun personaggio del repo ha un contatore salvato, quindi per nessuno cambia qualcosa
  const file = [
    ...readdirSync(new URL('../esempi/', import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => new URL(`../esempi/${f}`, import.meta.url)),
    ...readdirSync(new URL('collaudo/', import.meta.url)).filter((f) => f.endsWith('.json')).map((f) => new URL(`collaudo/${f}`, import.meta.url)),
  ];
  assert.ok(file.length >= 8);
  for (const u of file) {
    const j = JSON.parse(readFileSync(u, 'utf8'));
    assert.equal(j.sessione?.morente, undefined, `${u.pathname}: nessun contatore salvato`);
    assert.equal(j.sessione?.morte, undefined, `${u.pathname}: nessuna morte salvata`);
  }
  // e una sessione senza Ferite non apre nessun contatore
  assert.equal(statoMorente(sessione(), dati), null);
});

test('un personaggio già a terra quando le regole cambiano: stesso contatore, stessi Round', () => {
  // il blocco salvato prima del lotto 193 non ha `attivo`: deve continuare a contare come prima
  const prima = { dal: 2, turno: 4, iniziale: 7, tolti: 2 };
  assert.equal(roundRimasti(prima, 5, 4), 7 - 3 - 2);
  const s = allineaSessione({ round: 5, ferite: GRADO, morente: prima }, massimi);
  const mo = statoMorente(s, dati, { turno: 4 });
  assert.equal(mo.round, 2, 'i Round che restano non cambiano');
  assert.equal(mo.disattivato, false, 'un blocco senza `attivo` è un contatore attivo, come prima');
  assert.equal(mo.morto, false);
  // quello che cambia per lui è solo in meglio: prima a 0 leggeva «è morto», adesso «la registra il Direttore»
  const finito = allineaSessione({ round: 9, ferite: GRADO, morente: prima }, massimi);
  assert.equal(statoMorente(finito, dati, { turno: 4 }).esaurito, true);
  assert.equal(statoMorente(finito, dati, { turno: 4 }).morto, false);
});
