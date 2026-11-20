import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 228 — A.295 (E&L 19/11/2026): le dotazioni SIA nel catalogo, distinte dalle storiche ASA dei PG.
//  1. cinque voci SIA con i nomi degli Armamenti 0.87, distinte dalle quattro ASA (che non cambiano nei valori);
//  2. «Soprabito ASA riservato» = Soprabito SIA riservato: cambia l'etichetta, l'identificativo resta;
//  3. il Soprabito di ordinanza ASA non acquisisce Discreta;
//  4. i PG ancora sulla vecchia voce passano al Soprabito di ordinanza ASA conservando PI attuali e collegamento alla divisa;
//     chi ha già il soprabito corretto non si tocca; nessun valore di combattimento cambia, e lo strumento si rifiuta se cambierebbe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { catalogo } from '../src/equipaggiamento.js';
import { rapporto, migra, vociDaMigrare, DA, A } from '../tools/dotazione-asa.mjs';
import { normalizza } from '../src/character.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const sette = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json').map((f) => JSON.parse(readFileSync(new URL(f, FIX), 'utf8')));
const personaggio = (o) => ({ creazione: normalizza(structuredClone(o.scelte), dati).scelte, livelli: o.livelli ?? [], sessione: o.sessione });
const props = (rif) => (cat.perRif.get(rif).proprieta ?? []).map((x) => x.nome);

const SIA = {
  'armature_corporative:divisa-d-ordinanza-sia': 'Divisa d’ordinanza SIA',
  'armature_corporative:divisa-operativa-sia': 'Divisa operativa SIA',
  'rinforzi:soprabito-sia': 'Soprabito SIA',
  [DA]: 'Soprabito SIA riservato',
  'elmetti:elmetto-sia-recon': 'SIA Recon',
};

test('le cinque voci SIA ci sono, coi nomi del manuale 0.87, e non sono le ASA', () => {
  const man = readFileSync(new URL('../docs/manuali-txt/armamenti-0.87.md', import.meta.url), 'utf8');
  for (const [rif, nome] of Object.entries(SIA)) {
    assert.equal(cat.perRif.get(rif)?.nome, nome, rif);
    assert.ok(man.includes(nome), `«${nome}» è nel manuale 0.87`);
    assert.equal(cat.perRif.get(rif).catalogo, 'Alleanza');
  }
  for (const rif of ['armature_corporative:divisa-d-ordinanza-asa', 'armature_corporative:divisa-operativa-asa', A, 'elmetti:elmetto-asa-recon']) {
    assert.ok(!(rif in SIA), `${rif} resta ASA`);
    assert.match(cat.perRif.get(rif).nome, /ASA/);
  }
});

test('i valori ASA dei PG non cambiano: sono quelli del §7.26 (AR 2/3, FOR 3/4, PI 6/8, soprabito +1/+1 PI 6)', () => {
  const d1 = cat.perRif.get('armature_corporative:divisa-d-ordinanza-asa'), d2 = cat.perRif.get('armature_corporative:divisa-operativa-asa');
  assert.deepEqual([d1.ar.totale, d1.for_richiesta, d1.pi, d1.ps_int], [2, 3, 6, 12]);
  assert.deepEqual([d2.ar.totale, d2.for_richiesta, d2.pi, d2.ps_int], [3, 4, 8, 12]);
  const s = cat.perRif.get(A);
  assert.deepEqual([s.rinforzo.ar, s.rinforzo.for, s.pi, s.ps_int, s.qualita], [1, 1, 6, 10, 'Comune']);
  // le SIA hanno gli stessi numeri di protezione (corrispondenza dichiarata dal manuale) e i prezzi SIA
  assert.equal(cat.perRif.get('armature_corporative:divisa-d-ordinanza-sia').costo, 4000);
  assert.equal(cat.perRif.get('armature_corporative:divisa-operativa-sia').costo, 7000);
  assert.equal(cat.perRif.get('elmetti:elmetto-sia-recon').costo, 7500);
});

test('DISCRETA: il Soprabito di ordinanza ASA e il Soprabito SIA di base non la hanno; il «riservato» SIA sì', () => {
  assert.ok(!props(A).includes('Discreta'), 'il soprabito dei PG non ha Discreta (§7.26)');
  assert.ok(!props('rinforzi:soprabito-sia').includes('Discreta'));
  assert.ok(props(DA).includes('Discreta'));
  assert.ok(!cat.perRif.get(DA).proprieta.some((p) => /ASA/.test(p.testo)), 'il testo di Discreta parla del Soprabito SIA riservato');
});

test('«Soprabito ASA riservato»: stesso identificativo, nome SIA, il vecchio nome resta per la ricerca', () => {
  assert.equal(DA, 'rinforzi:soprabito-asa-riservato');
  assert.equal(cat.perRif.get(DA).nome, 'Soprabito SIA riservato');
  assert.ok(cat.perRif.get(DA).nomi_alternativi.includes('Soprabito ASA riservato'));
});

test('MIGRAZIONE: sei PG sul riservato → soprabito di ordinanza; PI, stato e collegamento alla divisa conservati; Lucas intatto; nessun valore cambia', () => {
  let migrati = 0;
  for (const o of sette) {
    const p = personaggio(o);
    const da = vociDaMigrare(p.creazione.equipaggiamento);
    const nome = p.creazione.nome;
    if (!da.length) { assert.ok(migra(p, dati).niente, `${nome}: ha già il soprabito corretto, non si tocca`); continue; }
    migrati++;
    const r = rapporto(p, dati);
    assert.deepEqual(r.diff, [], `${nome}: cambierebbero valori: ${r.diff.join(', ')}`);
    const m = migra(p, dati, new Date('2026-11-19T12:00:00Z'));
    const dopo = m.creazione.equipaggiamento.find((v) => v.uid === da[0].uid);
    assert.equal(dopo.rif, A);
    assert.equal(dopo.montato_su, da[0].montato_su, 'collegamento alla divisa');
    assert.equal(dopo.stato, da[0].stato);
    assert.equal(m.sessione.integrita?.[da[0].uid], p.sessione.integrita?.[da[0].uid], 'PI attuali');
    assert.equal(m.creazione.equipaggiamento.length, p.creazione.equipaggiamento.length, 'nessun doppione');
    // il «riservato» SIA non resta in nessun file migrato, quindi nessun PG ha Discreta dal soprabito
    assert.ok(!m.creazione.equipaggiamento.some((v) => v.rif === DA));
  }
  assert.equal(migrati, 6);
});

test('mutante: se il soprabito di ordinanza desse Discreta o più AR, lo strumento si rifiuta (un valore cambierebbe)', () => {
  const copia = structuredClone(dati);
  copia.equipaggiamento.file.rinforzi.oggetti.find((x) => x.id === 'soprabito-asa').rinforzo.ar = 2;
  const p = personaggio(sette.find((o) => JSON.stringify(o).includes('soprabito-asa-riservato')));
  assert.ok(rapporto(p, copia).diff.length > 0);
});
