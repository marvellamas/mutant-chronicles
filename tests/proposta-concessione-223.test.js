import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 223 — A.286 (E&L 18/11/2026): la concessione del livello 8 si propone precompilata per ciascuno dei sette, con il nome del
// personaggio, il passaggio dal 7° all'8° e il motivo; il Direttore la conferma una per una. La proposta è un testo: non cambia PX,
// livello né Titolo (il Titolo Esperto segue il passaggio effettivo, non la concessione: Direttore §9.8.3, lotto 214).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { propostaConcessione } from '../src/livello-px.js';

test('la proposta nomina il personaggio e i due livelli, cita la A.286 e dice che i PX non cambiano', () => {
  const t = propostaConcessione({ nome: 'Dimitri Orlav', da: 7, a: 8 });
  assert.match(t, /Dimitri Orlav/);
  assert.match(t, /dal 7° all'8° livello/);
  assert.match(t, /A\.286/);
  assert.match(t, /PX non cambiano/);
  assert.ok(t.length <= 200, 'sta nel campo del motivo (200 caratteri)');
  assert.match(propostaConcessione({ nome: '  ', da: 7, a: 8 }), /il personaggio/, 'senza nome non scrive «undefined»');
});

test('la finestrella la propone ma non la conferma da sola: il pulsante parte attivo solo con il testo, e il Direttore può cambiarlo', () => {
  const ui = readFileSync(new URL('../src/ui/master.js', import.meta.url), 'utf8');
  assert.match(ui, /proposta: propostaConcessione\(\{ nome, da: livello, a: permesso\.prossimo \}\)/, 'la proposta va solo alla concessione del passaggio');
  assert.match(ui, /spento: !proposta\.trim\(\) && MOTIVO_VUOTO/, 'senza proposta il pulsante resta spento a campo vuoto, come prima');
  assert.match(ui, /fine\(campo\.value\.trim\(\)\)/, 'si conferma il testo del campo, non quello proposto: chi lo cambia lo cambia');
});
