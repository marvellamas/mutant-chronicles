// Parte D del terzo lotto «le code dell'originale» (21/10/2026): stesso difetto «min-width: auto» degli ultimi
// due lotti (la tabella delle Abilità, il 20/10; .riquadro-mano e .griglia-valori, il 21/10 mattina), su un
// elemento diverso: a 820–912 px la tabella delle Caratteristiche in «Modifica master» (.controllo-temporaneo)
// usciva dalla sua colonna di .griglia-due (Identità: Caratteristiche + Prove Salvezza).
//
// NB (onestà sui limiti): `node --test` non ha un motore di layout; qui si prova il contratto (il figlio diretto
// della griglia può restringersi). La misura vera dei rettangoli, su tutte le 8 tab alle 7 larghezze richieste
// in verticale e in orizzontale (112 combinazioni, rete di sicurezza del lotto «condizioni attive» rigirata), è
// stata fatta nel browser: pulita ovunque, è nel riepilogo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

function dichiarazioni(classe) {
  const fuori = [];
  const re = new RegExp(`([^{}]*\\.${classe}\\b[^{}]*)\\{([^}]*)\\}`, 'g');
  for (const m of CSS.matchAll(re)) fuori.push({ selettore: m[1].trim(), corpo: m[2] });
  return fuori;
}

test('.griglia-due: i figli diretti possono restringersi sotto il contenuto (min-width: 0)', () => {
  const blocchi = dichiarazioni('griglia-due');
  assert.ok(blocchi.some((b) => /min-width\s*:\s*0/.test(b.corpo)), '.griglia-due senza «min-width: 0» sui figli: la tabella delle Caratteristiche tornerebbe a sforare');
});

test('.griglia-due resta repeat(auto-fit, minmax(17rem, 1fr)): non si tocca la soglia, si restringe il figlio', () => {
  const principale = dichiarazioni('griglia-due').find((b) => /display\s*:\s*grid/.test(b.corpo));
  assert.ok(principale, 'manca la regola principale di .griglia-due');
  assert.match(principale.corpo, /grid-template-columns\s*:\s*repeat\(auto-fit,\s*minmax\(17rem,\s*1fr\)\)/);
});

test('.tabella-scorre continua ad avere lo scorrimento orizzontale proprio (non va tolto)', () => {
  const b = dichiarazioni('tabella-scorre')[0];
  assert.ok(b, 'manca .tabella-scorre');
  assert.match(b.corpo, /overflow-x\s*:\s*auto/);
});
