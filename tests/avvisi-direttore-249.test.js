import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 249 — IL DIRETTORE È SEMPRE INFORMATO: la seconda metà della regola.
//
// La regola di Marcello, intera:
//   1. nessuno viene fermato — niente blocchi al tavolo;
//   2. il Direttore è sempre informato — ogni irregolarità produce un avviso che lui riceve;
//   3. il master non dà vidimazioni: legge.
// Un blocco togliato senza avviso è informazione persa; un avviso che non lascia procedere è un blocco con un altro
// nome. Questo file tiene in piedi la seconda metà, come `registro-blocchi-246` tiene la prima.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nuovoDiario, normalizzaDiario, aggiungi, nuovaVoce, segnaLetti, daLeggere, conto, vista, rigaLeggibile, GRAVITA, MAX_VOCI } from '../src/avvisi-direttore.js';

const leggi = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const voce = (x = {}) => nuovaVoce({ chi: 'OSHI NAGATA', cosa: 'si è mosso fuori turno (toccava a Michele)', numeri: '4 Q, da D7 a H7', dove: 'registro dello scontro', da: 'dal tablet', gravita: 'media', ...x });

// --------------------------------------------------------------------------- 1. la voce dice chi, cosa, quando, i numeri
test('una voce dice CHI, COSA, QUANDO e I NUMERI — non «irregolarità rilevata»', () => {
  const r = rigaLeggibile(voce({ quando: '2026-11-25T21:42:00' }));
  assert.match(r, /^21:42 — OSHI NAGATA: si è mosso fuori turno \(toccava a Michele\) · 4 Q, da D7 a H7 · dal tablet$/);
  // e senza «cosa» non c'è voce: una riga che non dice niente è peggio di nessuna riga
  assert.equal(nuovaVoce({ chi: 'LUCAS', numeri: '3' }), null);
  assert.equal(nuovaVoce({ cosa: '   ' }), null);
});

test('la gravità ha tre livelli e il criterio è scritto, non lasciato al caso', () => {
  assert.deepEqual(Object.keys(GRAVITA), ['grossa', 'media', 'piccola']);
  for (const g of Object.values(GRAVITA)) assert.ok(g.criterio.length > 20, `${g.nome}: il criterio va scritto`);
  // il criterio è quello di Marcello: cambia un numero > non lo cambia
  assert.match(GRAVITA.grossa.criterio, /cambia un numero/);
  assert.match(GRAVITA.piccola.criterio, /non cambia nessun numero/);
  // una gravità che non esiste non fa saltare niente: si legge come «media»
  assert.equal(nuovaVoce({ cosa: 'x', gravita: 'catastrofica' }).gravita, 'media');
});

// --------------------------------------------------------------------------- 2. non si perde
test('le voci non si perdono: il diario si rilegge da un file e non butta niente di leggibile', () => {
  const d = aggiungi(aggiungi(nuovoDiario(), voce()), voce({ cosa: 'ha lanciato senza PM', gravita: 'grossa' }));
  const riletto = normalizzaDiario(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(riletto, d, 'quello che si scrive sul file è quello che si rilegge (sopravvive al riavvio)');
  assert.deepEqual(conto(d), { da_leggere: 2, grosse: 1 });
  // una voce senza id non è una voce; il resto resta
  const sporco = normalizzaDiario({ voci: [{ cosa: 'senza id' }, ...d.voci] });
  assert.equal(sporco.voci.length, 2);
});

test('oltre il massimo cadono le vecchie GIÀ LETTE: una non letta non si perde mai', () => {
  let d = nuovoDiario();
  for (let i = 0; i < MAX_VOCI + 20; i += 1) d = aggiungi(d, voce({ cosa: `cosa ${i}`, quando: `2026-11-25T10:${String(i % 60).padStart(2, '0')}:00` }));
  assert.equal(d.voci.length, MAX_VOCI + 20, 'non lette: ci sono tutte, anche oltre il massimo');
  d = segnaLetti(d, 'tutte');
  d = aggiungi(d, voce({ cosa: 'nuova' }));
  assert.equal(d.voci.length, MAX_VOCI);
  assert.equal(daLeggere(d).length, 1, 'la nuova è l’unica da leggere');
});

// --------------------------------------------------------------------------- 3. segnare letto non cancella niente
test('«Segna lette» non cancella: la voce resta, con l’ora in cui è stata letta', () => {
  const d = aggiungi(nuovoDiario(), voce());
  const dopo = segnaLetti(d, 'tutte', '2026-11-25T22:00:00.000Z');
  assert.equal(dopo.voci.length, 1, 'la voce resta');
  assert.equal(dopo.voci[0].letto, '2026-11-25T22:00:00.000Z');
  assert.equal(dopo.voci[0].cosa, d.voci[0].cosa, 'e dice ancora quello che diceva');
  assert.deepEqual(conto(dopo), { da_leggere: 0, grosse: 0 });
  // una seconda lettura non cambia l'ora della prima
  assert.equal(segnaLetti(dopo, 'tutte', '2026-11-25T23:00:00.000Z').voci[0].letto, '2026-11-25T22:00:00.000Z');
});

// --------------------------------------------------------------------------- 4. non blocca, e non è una vidimazione
test('IL DIARIO NON BLOCCA E NON VIDIMA: niente «Approva», niente «Respingi», nessun contatore da azzerare', () => {
  const motore = leggi('src/avvisi-direttore.js');
  const pannello = leggi('src/ui/avvisi-direttore.js');
  // non è la parola che conta, è il PULSANTE: nessun comando del pannello approva o respinge una voce
  for (const m of pannello.matchAll(/h\('button'[\s\S]{0,400}?\}, ([^)]*)\)/g)) {
    assert.doesNotMatch(m[1], /approv|resping|autorizz|conferm/i, `un pulsante che approva: ${m[1].slice(0, 60)} — il master legge, non vidima`);
  }
  // e non c'è nessuna funzione che pretenda la lettura prima di proseguire
  assert.doesNotMatch(motore, /bloccante|richiede_lettura|prima di proseguire/i);
  // il pannello dice che la traccia resta dov'è
  assert.match(pannello, /la traccia resta dov/i);
});

// --------------------------------------------------------------------------- 5. ogni «Procedi comunque» arriva
test('OGNI «Procedi comunque» ARRIVA AL DIRETTORE: conAvviso è il punto solo, e manda la voce', () => {
  const procedi = leggi('src/ui/procedi.js');
  assert.match(procedi, /import \{ mandaAvviso, chiAvvisa \} from '\.\.\/avvisi-invio\.js';/);
  assert.ok(procedi.split('\n').some((r) => r === '  await mandaAvviso({'), 'la voce parte da qui, dopo che l’azione è stata fatta, e non dentro una condizione');
  // la gravità si ricava da dove finisce la traccia: la riga nello storico vuol dire che il file è cambiato
  assert.match(procedi, /gravita: gravita \?\? \(registra \? 'grossa' : 'media'\)/);
  // e la finestrella lo dice a chi preme
  assert.match(procedi, /diario del Direttore/);
});

test('i «Procedi comunque» fuori da conAvviso mandano la voce da sé (erano i buchi del censimento)', () => {
  const casi = [
    ['src/ui/colpo.js', /Applica comunque/, 'il colpo applicato senza l’esito della Tempra'],
    ['src/ui/talenti-scelta.js', /Scegli comunque/, 'un Talento scelto fuori dalle regole dal tablet'],
    ['src/ui/mappa/pagina.js', /Decolla comunque/, 'il decollo di un mezzo che non dichiara il volo'],
  ];
  for (const [f, cosa, perche] of casi) {
    const s = leggi(f);
    assert.match(s, cosa, `${f}: manca il caso`);
    assert.match(s, /mandaAvviso\(\{/, `${f}: ${perche} deve arrivare al Direttore`);
  }
  // il movimento dal tablet lo scrive il SERVER: vale anche se il tablet si spegne subito dopo
  const srv = leggi('server.mjs');
  assert.match(srv, /scriviAvvisoDirettore\(cartelle\.tavolo/);
  assert.match(srv, /async function scriviAvvisoDirettore/);
  assert.match(srv, /tavolo, 'avvisi\.json'/, 'il file sta in tavolo/, che «Salva sessione» porta con sé e il riavvio non perde');
});

test('il tocco costa zero spazio in alto: sta nella riga del titolo che c’è già', () => {
  const tavolo = leggi('src/ui/tavolo.js');
  const riga = /h\('div', \{ class: 'riga-titolo' \}[\s\S]{0,900}?testataGruppi\(\)\)/.exec(tavolo)[0];
  assert.match(riga, /pulsanteAvvisi/, 'il tocco è dentro la riga del titolo, non in una riga nuova');
  // e non è un pannello sempre aperto
  assert.doesNotMatch(tavolo, /pannelloAvvisi\(\)\s*,\s*$/m);
  assert.match(leggi('src/ui/avvisi-direttore.js'), /niente pannello sempre/);
});

// --------------------------------------------------------------------------- 6. il registro dichiara il censimento
test('il registro dei blocchi dice dove finisce ogni avviso, e quante non arrivavano da nessuna parte', () => {
  const reg = leggi('docs/registro-blocchi.md');
  assert.match(reg, /dove finisce l'avviso oggi/, 'la colonna del censimento');
  assert.match(reg, /in nessun posto/, 'e dice quali non arrivavano');
  assert.match(reg, /## Dove finisce l'avviso \(censimento del lotto 249\)/);
  // ogni riga delle due tabelle del censimento ha la sua destinazione
  const righe = reg.split('\n');
  let dentro = null;
  let quante = 0;
  for (const r of righe) {
    if (r.startsWith('## Tolti dal lotto 246') || r.startsWith('## Liberati dal lotto 248')) { dentro = true; continue; }
    if (r.startsWith('## ')) { dentro = null; continue; }
    if (!dentro || !r.startsWith('|')) continue;
    const c = r.split('|').map((x) => x.trim());
    if (!c[1] || /^:?-/.test(c[1]) || c[1] === 'id') continue;
    assert.ok(c[c.length - 2]?.length > 3, `manca «dove finisce» per ${c[1]}`);
    quante += 1;
  }
  assert.equal(quante, 33, 'le 26 del 246 più le 7 del 248');
});

// --------------------------------------------------------------------------- 7. parte F: due avvisi che non dicevano niente
test('un valore che non c’è si legge «—», non «undefined» e non «NaN»', async () => {
  const { erroreRisposta } = await import('../src/ui/errore-risposta.js');
  // il motivo del server non si butta: «bestiario non leggibile (500)» non diceva niente a nessuno
  const conMotivo = await erroreRisposta({ status: 500, json: async () => ({ errore: 'Scrittura rifiutata: la cartella sta in una cartella con personaggi' }) }, 'bestiario');
  assert.match(conMotivo.message, /^bestiario: Scrittura rifiutata/);
  assert.equal(conMotivo.stato, 500);
  const senza = await erroreRisposta({ status: 503, json: async () => { throw new Error('niente JSON'); } }, 'elenco della musica');
  assert.equal(senza.message, 'elenco della musica non leggibile (503)');
  // e la tabella dell'Iniziativa non scrive più «undefined + 5» né «NaN»
  const s = readFileSync(new URL('../src/ui/scontro.js', import.meta.url), 'utf8');
  assert.match(s, /const numero = \(n\) => \(!Number\.isFinite/, 'numero() torna «—» per un valore che non è un numero');
  assert.match(s, /senzaBase\(p\) \? '—' : numero\(p\.base \+ p\.d10\.valore\)/, 'nessun totale inventato senza la base');
  assert.match(s, /Iniziativa della scheda non registrata/, 'e la riga dice che cosa manca');
  for (const f of ['src/ui/nemici.js', 'src/ui/musica.js', 'src/ui/scontro.js']) {
    assert.match(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), /erroreRisposta\(r, '/, `${f}: il motivo del server deve arrivare a chi legge`);
  }
});
