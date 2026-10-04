// Messaggi del salvataggio nella cartella del server (src/cartella.js). Richiesta di Davide del
// 04/10/2026: con il server spento la scheda mostrava «Salvataggio nella cartella personaggi/ non
// riuscito: NetworkError when attempting to fetch resource.», che non dice cosa fare. Ora il messaggio
// è in parole semplici, il testo tecnico va nella console e l'app ritenta da sé finché il server torna.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erroreDiRete, messaggioSalvataggio, attesaRitentativo } from '../src/cartella.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const T = dati.regole.interfaccia.salvataggio;

/** Gli errori che i browser danno quando non c'è nessuno in ascolto sulla porta. */
const diRete = () => [
  Object.assign(new TypeError('NetworkError when attempting to fetch resource.'), { name: 'TypeError' }), // Firefox
  Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' }), // Chrome
  Object.assign(new TypeError('Load failed'), { name: 'TypeError' }), // Safari
  Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }), // richiesta interrotta
];

test('i testi stanno nei dati, non nel codice', () => {
  assert.equal(T.riuscito, 'Salvato nella cartella personaggi/');
  assert.equal(T.server_non_risponde, 'Il Tavolo del Master non risponde: controlla che la finestra di avvia-server.bat sia aperta, poi ricarica la pagina. Il personaggio è al sicuro nel browser.');
  assert.ok(T.non_riuscito.includes('{errore}'));
  assert.equal(attesaRitentativo(dati), 5000);
});

test('server spento: si riconosce l’errore di rete, in tutti i browser', () => {
  for (const e of diRete()) assert.equal(erroreDiRete(e), true, e.message);
});

test('server spento: messaggio comprensibile, testo tecnico a parte, e si ritenta', () => {
  for (const e of diRete()) {
    const m = messaggioSalvataggio({ errore: e }, dati);
    assert.equal(m.testo, T.server_non_risponde);
    assert.equal(m.tipo, 'attenzione');
    assert.equal(m.ritenta, true, 'col server spento conviene riprovare da soli');
    assert.equal(m.tecnico, e.message, 'il testo tecnico va nella console');
    assert.ok(!/NetworkError|Failed to fetch|Load failed/.test(m.testo), 'niente gergo nella pagina');
  }
});

test('il server risponde con un errore suo: messaggio con il motivo e nessun ritentativo', () => {
  const m = messaggioSalvataggio({ errore: Object.assign(new Error('errore 500'), { name: 'Error' }) }, dati);
  assert.match(m.testo, /non riuscito: errore 500/);
  assert.equal(m.ritenta, false, 'riprovare non risolve un errore del server');
  const n = messaggioSalvataggio({ errore: new Error('nome del file non valido') }, dati);
  assert.match(n.testo, /nome del file non valido/);
  assert.equal(n.ritenta, false);
});

test('conflitto di revisione: non è un problema di rete e lo gestisce il conflitto, non il messaggio', () => {
  const e = Object.assign(new Error('il file è cambiato'), { conflitto: true });
  assert.equal(erroreDiRete(e), false);
  assert.equal(messaggioSalvataggio({ errore: e }, dati).ritenta, false);
});

test('server tornato: «Salvato nella cartella personaggi/», senza testo tecnico', () => {
  const m = messaggioSalvataggio({ riuscito: true, ritentato: true }, dati);
  assert.equal(m.testo, 'Salvato nella cartella personaggi/');
  assert.equal(m.tipo, 'ok');
  assert.equal(m.tecnico, null);
  assert.equal(m.ritenta, false);
});

test('il ciclo del ritentativo: fallisce, riprova, riesce', () => {
  // la sequenza che segue la scheda (src/ui/app.js → programmaRitentativo / fineRitentativo)
  const passi = [];
  let aperto = false;
  const salva = () => {
    if (!aperto) throw Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' });
    return true;
  };
  for (let i = 0; i < 3; i++) {
    try {
      salva();
      passi.push(messaggioSalvataggio({ riuscito: true, ritentato: true }, dati).testo);
      break;
    } catch (e) {
      const m = messaggioSalvataggio({ errore: e }, dati);
      passi.push(m.testo);
      if (!m.ritenta) break;
      if (i === 1) aperto = true; // il master riapre avvia-server.bat
    }
  }
  assert.deepEqual(passi, [T.server_non_risponde, T.server_non_risponde, T.riuscito]);
});
