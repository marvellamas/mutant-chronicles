import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 223 — A.284 e «Integrazione alla A.284» (E&L 18/11/2026), Armamenti 0.87 §7.26: la dotazione ASA dei PG.
//  1. i nomi del catalogo sono quelli del manuale 0.87 (e i vecchi restano come nomi alternativi, per la ricerca);
//  2. i sei PG con il «Soprabito ASA riservato» passano al Soprabito di ordinanza ASA **senza che cambi un solo valore**
//     (PV, AR, FOR, carico, Abilità, tavolo): cambia soltanto la descrizione dell'oggetto; conservano uid, stato, montaggio e Integrità;
//  3. lo strumento si rifiuta se un valore cambia (provato col mutante: AR del soprabito di ordinanza portata a 2);
//  4. l'elmetto non si tocca nelle funzioni: il +1 all'Iniziativa dell'Allerta tattica resta (A.294 aperta).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { testoManuale, versioneManuale } from '../tools/manuali.mjs';
import { catalogo } from '../src/equipaggiamento.js';
import { rapporto, migra, vociDaMigrare, DOTAZIONE_ASA, DA, A } from '../tools/dotazione-asa.mjs';
import { normalizza } from '../src/character.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const sette = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json').map((f) => JSON.parse(readFileSync(new URL(f, FIX), 'utf8')));
const personaggio = (o) => ({ creazione: normalizza(o.scelte, dati).scelte, livelli: o.livelli ?? [], sessione: o.sessione });

test('i quattro nomi della dotazione ASA sono quelli del manuale corrente, e nel catalogo restano le voci separate dalle SIA', () => {
  const man = testoManuale('armamenti');
  assert.ok(man.includes(`EDIZIONE ${versioneManuale('armamenti')}`), 'il manuale corrente è quello del registro (lotto 229: l’edizione non si scrive nel test)');
  for (const [rif, nome] of Object.entries(DOTAZIONE_ASA)) {
    assert.ok(man.includes(nome), `«${nome}» è nel manuale`);
    assert.equal(cat.perRif.get(rif)?.nome, nome, `${rif} si chiama «${nome}»`);
  }
  // le sigle non sono intercambiabili: il catalogo non ha nessuna voce SIA con un nome ASA, e il riservato (nel manuale: SIA) non è rinominato
  // A.295 (lotto 228): la sigla è decisa — nel manuale il «riservato» è SIA; l'identificativo resta (nessun file perde il riferimento)
  assert.equal(cat.perRif.get(DA)?.nome, 'Soprabito SIA riservato', 'il «riservato» è SIA (A.295); l’id non cambia');
  assert.ok(cat.perRif.get(DA).nomi_alternativi.includes('Soprabito ASA riservato'), 'il vecchio nome resta per la ricerca');
  assert.ok(cat.perRif.get('armature_corporative:divisa-d-ordinanza-asa').nomi_alternativi.includes('Divisa d’ordinanza ASA'));
});

test('i sette PG: nessun valore cambia con il Soprabito di ordinanza ASA al posto del «riservato»; uid, stato, montaggio e Integrità restano', () => {
  assert.equal(sette.length, 7);
  let migrati = 0;
  for (const o of sette) {
    const p = personaggio(o);
    const da = vociDaMigrare(p.creazione.equipaggiamento);
    const r = rapporto(p, dati);
    assert.deepEqual(r.diff, [], `${p.creazione.nome}: cambierebbero valori: ${r.diff.join(', ')}`);
    if (!da.length) continue;
    migrati++;
    const m = migra(p, dati, new Date('2026-11-18T12:00:00Z'));
    const dopo = m.creazione.equipaggiamento.find((v) => v.uid === da[0].uid);
    assert.equal(dopo.rif, A);
    assert.equal(dopo.stato, da[0].stato);
    assert.equal(dopo.montato_su, da[0].montato_su);
    assert.equal(m.sessione.integrita?.[da[0].uid], p.sessione.integrita?.[da[0].uid], 'Integrità corrente conservata');
    assert.equal(m.creazione.equipaggiamento.length, p.creazione.equipaggiamento.length, 'nessun oggetto duplicato né perso');
    // idempotente
    assert.ok(migra({ ...p, creazione: m.creazione, sessione: m.sessione }, dati).niente, 'la seconda volta non c’è più niente da fare');
  }
  assert.ok(migrati >= 6, `sei PG hanno il «riservato» (${migrati})`);
});

test('mutante: se il Soprabito di ordinanza desse AR 2 invece di 1, lo strumento lo vede e si rifiuta (un valore cambierebbe)', () => {
  const copia = structuredClone(dati);
  const voce = copia.equipaggiamento.file.rinforzi.oggetti.find((x) => x.id === 'soprabito-asa');
  voce.rinforzo.ar = 2;
  const p = personaggio(sette.find((o) => JSON.stringify(o).includes('soprabito-asa-riservato')));
  const r = rapporto(p, copia);
  assert.ok(r.diff.length > 0, 'con un valore diverso il rapporto lo segnala');
});

test('l’Elmetto Recon ASA conserva le sue funzioni (A.294, risolta nel lotto 228): +1 Iniziativa, sensori, filtro; non si copia né si toglie niente', () => {
  const e = cat.perRif.get('elmetti:elmetto-asa-recon');
  assert.deepEqual(e.proprieta.map((x) => x.nome), ['Visione notturna', 'Sensori 1 a vista e udito', 'Filtro respiratorio 2', 'Allerta tattica 1']);
});
