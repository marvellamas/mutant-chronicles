import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 231 (20/11/2026) — Armamenti 0.90 §7.28.2–7.28.3: l'artiglieria dei mezzi dell'Alleanza.
//  Il manuale ne definisce i profili di combattimento ma dice che le specifiche d'acquisto, massa, Integrità e FOR "restano da definire", e i mezzi che
//  li montano (Veicoli 0.22 cap. 16–17) non sono leggibili: nessuna voce nel catalogo delle armi. Le voci già sistemate (Punisher, ASA/SIA) restano intatte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { testoManuale, versioneManuale } from '../tools/manuali.mjs';
import { catalogo } from '../src/equipaggiamento.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const arm = testoManuale('armamenti');
const SISTEMI = ['Cannone automatico leggero', 'Cannone balistico leggero', 'Cannone balistico medio', 'Cannone balistico pesante', 'Lanciamissili anticarro', 'Obice veicolare', 'Due batterie lanciamissili indipendenti', 'Autocannoni binati', 'Sistema missili contraerei'];

test('Armamenti 0.90 §7.28: il manuale definisce i profili di combattimento dei dieci sistemi, ma le specifiche d’acquisto «restano da definire»', () => {
  assert.ok(arm.includes(`EDIZIONE ${versioneManuale('armamenti')}`));
  for (const s of SISTEMI) assert.ok(arm.includes(s), `«${s}» è nel §7.28`);
  assert.match(arm, /Specifiche autonome di acquisto, massa, Integrità e FOR restano da definire/);
  assert.match(arm, /7\.28\.3 Artiglieria e sistemi contraerei di supporto/);
  assert.match(arm, /Registro delle modifiche dalla versione 0\.89 alla 0\.90/);
});

test('l’artiglieria non entra nel catalogo delle armi: nessuna voce con quel nome (non si deducono peso, FOR, PS dal Punisher o dalle torrette)', () => {
  const nomi = cat.oggetti.map((o) => `${o.nome} ${(o.nomi_alternativi ?? []).join(' ')}`.toLowerCase());
  for (const s of SISTEMI) assert.ok(!nomi.some((n) => n.includes(s.toLowerCase())), `«${s}» non è nel catalogo`);
  for (const w of ['obice', 'thunder tc', 'storm t8', 'sentinel tc']) assert.ok(!nomi.some((n) => n.includes(w)), w);
});

test('il Mitragliatore Leggero Punisher e la pistola Punisher sono due voci; le quattro voci ASA e le cinque SIA sono ancora separate', () => {
  const armiDC = dati.equipaggiamento.file.armi_distanza_corporative.oggetti;
  assert.notEqual(armiDC.find((o) => o.id === 'mitragliatore-leggero-punisher').id, armiDC.find((o) => o.id === 'punisher').id);
  assert.equal(armiDC.find((o) => o.id === 'punisher').famiglia === armiDC.find((o) => o.id === 'mitragliatore-leggero-punisher').famiglia, false);
  const nomi = cat.oggetti.map((o) => o.nome);
  for (const asa of ['Divisa di servizio ASA', 'Divisa Operativa ASA', 'Soprabito di ordinanza ASA', 'Elmetto Recon ASA']) assert.ok(nomi.includes(asa), asa);
  const sia = nomi.filter((n) => /\bSIA\b/.test(n));
  assert.ok(sia.length >= 5, `voci SIA: ${sia.length}`);
  assert.ok(sia.every((n) => !/\bASA\b/.test(n)), 'nessuna voce porta insieme le due sigle');
  assert.equal(cat.perRif.get('rinforzi:soprabito-asa-riservato')?.nome, 'Soprabito SIA riservato');
});

test('le armi del catalogo portano l’edizione corrente (Armamenti 0.90) dove prima portavano la 0.89, e nessuna differenza di valore', () => {
  const armi = ['armi', 'armi_corporative', 'armi_distanza', 'armi_distanza_corporative'].flatMap((f) => dati.equipaggiamento.file[f].oggetti);
  assert.equal(armi.length, 222, 'le voci d’arma sono 222: nessuna entra e nessuna esce con la 0.90');
  assert.equal(new Set(armi.map((o) => o.id)).size, 220, 'sono 220 id (Pugnale e Ascia leggera hanno due profili)');
  const man = versioneManuale('armamenti');
  for (const f of ['armi', 'armi_corporative', 'armi_distanza', 'armi_distanza_corporative']) assert.equal(dati.equipaggiamento.file[f].versione_manuale, `Armamenti ${man}`, f);
});
