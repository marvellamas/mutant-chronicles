// Lotto 140 (A.188, Davide 28/10): ogni aggiunta, rimozione o sostituzione di un incantesimo va nello storico con data, ora e
// provenienza, da qualunque strada arrivi (tab Poteri, «Da scegliere», aggiunti a mano, Modifica master, creazione, Sali di
// livello, annulla livello, correzione di un livello, Talento tolto). Il confronto è uno solo, in src/incantesimi-regole.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { incantesimiDiClasse, confrontaIncantesimi, testoVariazioneIncantesimi, nomiNelloStorico, rigaIncantesimi } from '../src/incantesimi-regole.js';
import { rigaStorico, allineaStorico } from '../src/storico.js';
import { annullaUltimoLivello } from '../src/avanzamento.js';

const anselmo = JSON.parse(readFileSync(new URL('../esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json', import.meta.url), 'utf8'));
const pers = { creazione: anselmo.scelte, livelli: anselmo.livelli.map((v, i, tutti) => (i === tutti.length - 1 ? { ...v, incantesimi: ['Dardo Psichico', 'Terrore'] } : v)) };

test('gli incantesimi di Classe sono quelli della creazione e delle voci dei livelli, senza ripetizioni', () => {
  assert.deepEqual(incantesimiDiClasse({ creazione: { incantesimi: ['A', 'B'] }, livelli: [{ incantesimi: ['B', 'C'] }, {}, { incantesimi: ['D'] }] }), ['A', 'B', 'C', 'D']);
  assert.deepEqual(incantesimiDiClasse(null), []);
});

test('il confronto dice che cosa è stato aggiunto e tolto', () => {
  const a = { creazione: { incantesimi: ['A', 'B'] }, livelli: [{ incantesimi: ['C'] }] };
  const b = { creazione: { incantesimi: ['A'] }, livelli: [{ incantesimi: ['C', 'D', 'E'] }] };
  assert.deepEqual(confrontaIncantesimi(a, b), { aggiunti: ['D', 'E'], tolti: ['B'] });
  assert.deepEqual(confrontaIncantesimi(a, a), { aggiunti: [], tolti: [] });
});

test('il testo dello storico: singolare e plurale, la causa fra parentesi, i nomi già scritti si escludono', () => {
  assert.equal(testoVariazioneIncantesimi({ aggiunti: ['D', 'E'], tolti: ['B'] }, '4° livello'), 'Aggiunti D, E; Tolto B (4° livello)');
  assert.equal(testoVariazioneIncantesimi({ aggiunti: ['D'], tolti: [] }), 'Aggiunto D');
  assert.equal(testoVariazioneIncantesimi({ aggiunti: [], tolti: [] }, 'x'), null);
  assert.equal(testoVariazioneIncantesimi({ aggiunti: ['D'], tolti: ['B'] }, 'x', ['D', 'B']), null);
  assert.equal(testoVariazioneIncantesimi({ aggiunti: ['D'], tolti: ['B'] }, 'x', ['D']), 'Tolto B (x)');
  assert.deepEqual(nomiNelloStorico([{ testo: 'Tolto Terrore (PC, 28/10 21:40)' }, 'Sostituito A con B'], ['Terrore', 'B', 'Z']), ['Terrore', 'B']);
});

test('annullare l’ultimo livello toglie gli incantesimi di quel livello: la riga li nomina, con data, ora e provenienza', () => {
  const dopo = annullaUltimoLivello(pers);
  const v = confrontaIncantesimi(pers, { creazione: pers.creazione, livelli: dopo.livelli });
  assert.ok(v.tolti.length > 0, 'l’ultimo livello aveva degli incantesimi');
  const adesso = new Date(2026, 9, 29, 12, 5);
  const testo = testoVariazioneIncantesimi(v, 'annullato il 3° livello');
  const s = rigaStorico({}, rigaIncantesimi(testo, 'tablet', adesso), adesso);
  assert.match(allineaStorico(s.storico)[0].testo, /^Tolt(o|i) .+ \(annullato il 3° livello\) \(tablet, 29\/10 12:05\)$/);
});

test('ogni strada che cambia gli incantesimi scrive nello storico (verifica sul sorgente della scheda)', () => {
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  const fn = (nome) => { const i = app.indexOf(nome); assert.ok(i >= 0, nome); return app.slice(i, i + 2600); };
  assert.match(fn('function annullaLivello'), /storicoVariazione/);
  assert.match(fn('const primaCorrezione'), /storicoVariazione/);
  assert.match(fn('const primaSalita'), /storicoVariazione/);
  assert.match(fn('const primaSvuota'), /storicoVariazione/);
  assert.match(fn('function aggiorna(modifica'), /storicoVariazione/);
  assert.match(fn('function registraModificheMaster'), /storicoVariazione/);
  assert.match(fn('const primaApertura'), /storicoVariazione/);
  assert.match(fn('togliIncantesimoScelto:'), /storicoIncantesimi\(`Tolto/);
  assert.match(fn('sostituisciIncantesimoLivello:'), /storicoIncantesimi\(`Sostituito/);
  assert.match(fn('incantesimiAMano: (lista, riga'), /rigaIncantesimi\(riga/);
  assert.match(fn('scegliSuccessiva:'), /storicoIncantesimi\(`Aggiunto/);
});

// --- Testata (lotto 140): «in alto il minimo spazio possibile» ---
test('testata: il salvataggio è un ✓ o una parola, il testo intero sta nel suggerimento; il Round è «Round N» senza «dallo scontro»', async () => {
  const { contesto, resa, dati } = await import('./scheda-aiuti.js');
  const { statoSalvataggioMaster } = await import('../src/collegamento.js');
  const ok = statoSalvataggioMaster({ server: true, haNome: true, cartella: { impronta: 'x', mtime: new Date(2026, 9, 29, 21, 7).getTime(), file: 'a.json' }, improntaLocale: 'x' }, dati);
  assert.deepEqual([ok.stato, ok.breve, ok.testo], ['salvato', '✓', 'Salvato sul PC del master alle 21:07']);
  assert.equal(statoSalvataggioMaster({ server: true, haNome: true, cartella: null, improntaLocale: 'x' }, dati).breve, '⚠ Non salvato');
  assert.equal(statoSalvataggioMaster({ server: true, haNome: false }, dati).breve, '✎ Senza nome');
  const c = contesto('Fratello-Anselmo-Viri_liv3_2026-10-02.json');
  c.salvataggioMaster = ok;
  c.roundScontro = { nome: 'Imboscata', round: 3 };
  const r = resa(c);
  const salv = r.radice.tutti().find((n) => n.className?.startsWith('indicatore-salvataggio'));
  assert.equal(salv.textContent, '✓');
  assert.equal(salv.getAttribute('aria-label'), 'Salvato sul PC del master alle 21:07');
  assert.match(salv.getAttribute('title'), /Salvato sul PC del master alle 21:07 · File: personaggi\/a\.json/);
  const round = r.radice.tutti().find((n) => n.className?.includes('round-scontro-testa'));
  assert.equal(round.textContent, 'Round 3');
  assert.match(round.getAttribute('title'), /dallo scontro «Imboscata»/);
});
