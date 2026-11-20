import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 228 — A.298 (E&L 19/11/2026): la data dell'ultimo contatto di una Pietra di Luna e l'avviso «Verifica il vincolo».
//  - sette giorni di calendario dalla data dell'ultimo contatto (10 → l'avviso compare il 17);
//  - un nuovo contatto fa ripartire il conto; senza data o a calendario spento resta il promemoria; nessuna data presunta;
//  - IL CONTROLLO CHE CONTA: l'avviso non modifica la pietra (la svuota solo la conferma del Direttore).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { inizializzaSessione, allineaSessione, nuovaSessione } from '../src/sessione.js';
import { statoVincolo, registraContatto, toglieContatto, confermaScadenzaVincolo, TESTO_VERIFICA, GIORNI_VINCOLO } from '../src/pietre-di-luna.js';
import { avanzaGiorno, impostaOggi } from '../src/calendario.js';

const { dati } = await datiReali();
const voce = (extra = {}) => ({ uid: 'p1', rif: 'manufatti_lunari:pietra-di-luna-10-pm', stato: 'trasportato', quantita: 1, note: '', sintonizzato: true, pietra: { colore: 'Verde' }, ...extra });
const fascia0 = dati.regole.calendario.fasce[0].id;
const calOggi = (data, attivo = true) => ({ attivo, inizio: data, oggi: { data, fascia: fascia0 }, note: [] });

test('sette giorni di calendario: ultimo contatto il 10, l’avviso compare il 17 (non il 16)', () => {
  const v = voce({ pietra: { colore: 'Verde', ultimoContatto: '2026-03-10' } });
  assert.equal(GIORNI_VINCOLO, 7);
  assert.equal(statoVincolo(v, calOggi('2026-03-16')).stato, 'in_corso');
  assert.equal(statoVincolo(v, calOggi('2026-03-16')).avviso, null);
  const s17 = statoVincolo(v, calOggi('2026-03-17'));
  assert.equal(s17.stato, 'verifica');
  assert.equal(s17.avviso, 'Verifica il vincolo');
  assert.equal(TESTO_VERIFICA, 'Verifica il vincolo');
  assert.equal(s17.scadeIl, '2026-03-17');
  assert.equal(statoVincolo(v, calOggi('2026-03-30')).stato, 'verifica', 'e resta finché il Direttore non decide');
});

test('si contano i giorni del CALENDARIO: le sessioni non c’entrano', () => {
  const v = voce({ pietra: { colore: 'Verde', ultimoContatto: '2026-03-10' } });
  const massimi = { pv: 10, pm: 5, puntiEroe: 3 };
  let s = inizializzaSessione({ ...massimi, ferite: 6, caricatori: {} });
  for (let i = 0; i < 30; i++) s = nuovaSessione(allineaSessione(s, massimi), massimi);
  assert.equal(statoVincolo(v, calOggi('2026-03-12')).stato, 'in_corso', 'trenta «Nuova sessione» non spostano il calendario');
  let c = calOggi('2026-03-10');
  for (let i = 0; i < 6; i++) c = avanzaGiorno(c, dati);
  assert.equal(statoVincolo(v, c).stato, 'in_corso');
  c = avanzaGiorno(c, dati);
  assert.equal(statoVincolo(v, c).stato, 'verifica');
  assert.ok(impostaOggi(c, '2026-03-11', fascia0, dati), 'il calendario si può anche riportare indietro');
});

test('un nuovo contatto fa ripartire il conto dalla sua data', () => {
  const v = voce({ pietra: { colore: 'Verde', ultimoContatto: '2026-03-10' } });
  const c17 = calOggi('2026-03-17');
  assert.equal(statoVincolo(v, c17).stato, 'verifica');
  const r = registraContatto(v, '2026-03-15');
  assert.ok(r.ok);
  assert.equal(r.voce.pietra.ultimoContatto, '2026-03-15');
  assert.equal(r.voce.pietra.colore, 'Verde', 'il colore non cambia');
  assert.equal(statoVincolo(r.voce, c17).stato, 'in_corso');
  assert.equal(statoVincolo(r.voce, calOggi('2026-03-22')).stato, 'verifica');
});

test('senza data o a calendario spento: nessun avviso, resta il promemoria manuale (A.291)', () => {
  assert.equal(statoVincolo(voce(), calOggi('2027-01-01')).stato, 'senza_data');
  assert.equal(statoVincolo(voce(), calOggi('2027-01-01')).avviso, null);
  const v = voce({ pietra: { colore: 'Verde', ultimoContatto: '2026-03-10' } });
  for (const c of [calOggi('2027-01-01', false), null, undefined, { attivo: true }]) {
    const s = statoVincolo(v, c);
    assert.equal(s.stato, 'calendario_spento');
    assert.equal(s.avviso, null, 'senza un calendario attivo non si avvisa');
  }
  assert.equal(statoVincolo(voce({ pietra: undefined }), calOggi('2027-01-01')).stato, 'neutra');
});

test('nessuna data presunta: una pietra già in gioco non ne riceve, e il file la conserva solo se valida', () => {
  const senza = normalizzaEquipaggiamento([voce()], dati)[0];
  assert.equal(senza.pietra.ultimoContatto, undefined, 'la normalizzazione non inventa una data');
  assert.equal(senza.pietra.colore, 'Verde');
  const con = normalizzaEquipaggiamento([voce({ pietra: { colore: 'Verde', ultimoContatto: '2026-03-10' } })], dati)[0];
  assert.equal(con.pietra.ultimoContatto, '2026-03-10', 'la data valida sopravvive al salvataggio');
  for (const brutta of ['', 'domani', '2026-13-40', 17, null]) {
    assert.equal(normalizzaEquipaggiamento([voce({ pietra: { colore: 'Verde', ultimoContatto: brutta } })], dati)[0].pietra.ultimoContatto, undefined, `«${brutta}» si scarta`);
  }
  assert.equal(registraContatto(voce(), 'ieri').ok, false);
  assert.equal(registraContatto(voce({ pietra: undefined }), '2026-03-10').ok, false, 'una pietra neutra non ha un vincolo da contare');
  assert.equal(toglieContatto(con).pietra.ultimoContatto, undefined);
});

test('IL CONTROLLO CHE CONTA: l’avviso non modifica la pietra — né il colore, né la sintonizzazione, né la riserva — e nessun giorno che passa la svuota', () => {
  const eq = [voce({ pietra: { colore: 'Verde', ultimoContatto: '2026-03-10' } })];
  const sessione = { ...inizializzaSessione({ pv: 16, pm: 9, puntiEroe: 10, ferite: 6, caricatori: {} }), chroma: { p1: { pmAttuali: 9 } } };
  const prima = JSON.stringify({ eq, sessione });
  let c = calOggi('2026-03-10');
  for (let i = 0; i < 60; i++) { c = avanzaGiorno(c, dati); statoVincolo(eq[0], c); }
  assert.equal(statoVincolo(eq[0], c).stato, 'verifica', 'dopo 60 giorni l’avviso c’è');
  assert.equal(JSON.stringify({ eq, sessione }), prima, 'ma niente è cambiato: né la voce né la sessione');
  assert.equal(normalizzaEquipaggiamento(eq, dati)[0].pietra.colore, 'Verde');
  assert.equal(sessione.chroma.p1.pmAttuali, 9);
  // si svuota solo con la conferma del Direttore
  assert.equal(confermaScadenzaVincolo(eq, sessione, 'p1', {}).ok, false);
  const ok = confermaScadenzaVincolo(eq, sessione, 'p1', { dalDirettore: true });
  assert.equal(ok.ok, true);
  assert.equal(ok.voci[0].pietra, undefined, 'torna neutra: con la data, che non vale più');
  assert.equal(statoVincolo(ok.voci[0], c).stato, 'neutra');
});

test('l’unico punto del codice che chiama la conferma della scadenza è l’azione del Direttore: né l’avviso né il calendario la chiamano', () => {
  for (const f of ['src/pietre-di-luna.js', 'src/calendario.js', 'src/sessione.js', 'src/ui/calendario.js', 'src/ui/tab.js']) {
    const t = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    const chiamate = [...t.matchAll(/confermaScadenzaVincolo\(/g)].length;
    // nel modulo che la definisce c'è solo la definizione, mai una chiamata (le sue occorrenze sono `function confermaScadenzaVincolo(`)
    const soloDefinizione = f === 'src/pietre-di-luna.js' ? [...t.matchAll(/function confermaScadenzaVincolo\(/g)].length : 0;
    assert.equal(chiamate - soloDefinizione, 0, `${f}: nessuna chiamata a confermaScadenzaVincolo`);
  }
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.equal([...app.matchAll(/confermaScadenzaVincolo\(/g)].length, 1, 'in app.js una sola chiamata, dentro scadenzaPietra, con dalDirettore: true');
  assert.match(app, /confermaScadenzaVincolo\(stato\.scelte\.equipaggiamento, stato\.sessione, uid, \{ dalDirettore: true \}\)/);
});

test('mutante: un avviso a 6 giorni invece di 7 sarebbe visto — il 16 non è ancora «verifica»', () => {
  const v = voce({ pietra: { colore: 'Verde', ultimoContatto: '2026-03-10' } });
  assert.notEqual(statoVincolo(v, calOggi('2026-03-16')).stato, 'verifica');
});
