// Convertitore «PG → nemico» (src/nemico-da-pg.js) e bestiario umano proposto (esempi/nemici/umani/,
// tools/genera_nemici_umani.mjs): i numeri vengono dal motore, i file sono validi e in sincronia con il
// generatore, i tre gradi crescono in modo coerente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { nemicoDaPg } from '../src/nemico-da-pg.js';
import { vistaPlancia } from '../src/tavolo.js';
import { calcolaAttaccoRavvicinato, dichiarazioneRavvicinato } from '../src/attacco.js';
import { calcolaAttaccoNemico } from '../src/nemico-attacco.js';
import { aggiungiNemici, nuovoScontro } from '../src/scontro.js';
import { validaNemico, formattaErrore } from '../src/validate.js';
import { TIPI, GRADI, nemiciUmani } from '../tools/genera_nemici_umani.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const esempi = new URL('../esempi/', import.meta.url);
const TORVALD = 'Torvald-Krane_liv6_2026-10-02.json';

test('convertitore su Torvald: PV, AR, Difese, Iniziativa, VA e danno uguali a quelli della sua scheda', () => {
  const testo = readFileSync(new URL(TORVALD, esempi), 'utf8');
  const v = vistaPlancia(testo, dati, TORVALD);
  const { nemico, avvisi } = nemicoDaPg(testo, dati);
  assert.deepEqual(avvisi, []);
  assert.deepEqual(validaNemico(nemico, dati, 'torvald').map(formattaErrore), []);
  assert.deepEqual([nemico.pv, nemico.pm, nemico.ar.totale, nemico.ar.magica, nemico.difese, nemico.iniziativa],
    [v.pv.massimo, v.pm.massimo, v.ar.totale, v.ar.magica, v.difese.valore, v.iniziativa.valore]);
  assert.deepEqual(nemico.salvezze, Object.fromEntries(Object.entries(v.scheda.salvezze).map(([k, s]) => [k, s.effettivo ?? s.totale])));
  assert.deepEqual(nemico.caratteristiche.FOR, v.scheda.caratteristiche.FOR.valore);
  // l'arma in mano: VA e danno (con il bonus di FOR) come nella plancia e nella scheda digitale
  const spada = nemico.attacchi[0];
  assert.deepEqual([spada.nome, spada.va, spada.danno, spada.tipo, spada.portata_q, spada.rif], [v.armi[0].nome, v.armi[0].va, v.armi[0].danno, 'ravvicinato', 1, 'armi:spada-lunga']);
  // l'arma non in mano (la pistola), misurata in mano: c'è con i suoi numeri a distanza
  const pistola = nemico.attacchi.find((a) => a.tipo === 'distanza');
  assert.ok(pistola && pistola.gittata_q > 0 && pistola.modalita.length && Number.isInteger(pistola.va));
  assert.equal(nemico.stati.length, 0);
  assert.match(nemico.fonte, /^costruito come PG \(Bauhaus, Assaltatore 2, 6° livello\)$/);
  assert.match(nemico.note, /Talenti.*Parata Migliorata/);
});

test('convertitore e «Attacca!»: il nemico ha lo stesso VA finale del PG con la stessa dichiarazione', () => {
  const testo = readFileSync(new URL(TORVALD, esempi), 'utf8');
  const v = vistaPlancia(testo, dati, TORVALD);
  const arma = v.scheda.equipaggiamento.armi.find((a) => a.nome === 'Spada lunga');
  const pg = calcolaAttaccoRavvicinato({ scheda: v.scheda, sessione: v.sessione }, arma, dichiarazioneRavvicinato({}), dati);
  const { nemico } = nemicoDaPg(testo, dati);
  const s = aggiungiNemici(nuovoScontro({ id: 'scontro-conv', pg: [] }), nemico, 1);
  const n = calcolaAttaccoNemico(s.partecipanti[0], 0, {}, dati);
  assert.equal(n.risultato.va_finale, pg.va_finale);
  assert.equal(n.risultato.danno.formula, pg.danno.formula);
});

test('convertitore: il PG d’origine non cambia; un personaggio incompleto dà un errore', () => {
  const oggetto = JSON.parse(readFileSync(new URL('Rhea-Valdis_liv5_2026-10-02.json', esempi), 'utf8'));
  const copia = structuredClone(oggetto);
  const r = nemicoDaPg(oggetto, dati, { nome: 'Tiratrice — prova' });
  assert.deepEqual(oggetto, copia);
  assert.deepEqual([r.nemico.nome, r.nemico.id], ['Tiratrice — prova', 'tiratrice-prova']);
  assert.match(nemicoDaPg('{"non":"valido"}', dati).errore ?? '', /.+/);
  assert.match(nemicoDaPg(JSON.stringify({ ...oggetto, scelte: { ...oggetto.scelte, classe: null, addestramento: null } }), dati).errore ?? '', /non si calcola|non leggibile/);
});

const tutti = nemiciUmani(dati);

test('bestiario umano: 10 tipi × 3 gradi, tutti validi, senza problemi di costruzione, file in sincronia', () => {
  assert.equal(tutti.length, TIPI.length * GRADI.length);
  assert.equal(TIPI.length, 10);
  const cartella = new URL('nemici/umani/', esempi);
  const file = readdirSync(cartella).filter((f) => f.endsWith('.json')).sort();
  assert.deepEqual(file, tutti.map((x) => `${x.nemico.id}.json`).sort());
  for (const x of tutti) {
    assert.deepEqual(x.problemi, [], x.nemico?.id);
    assert.deepEqual(validaNemico(x.nemico, dati, x.nemico.id).map(formattaErrore), []);
    // il file del repo è quello che il generatore scrive oggi (rigenerare con node tools/genera_nemici_umani.mjs)
    assert.equal(readFileSync(new URL(`${x.nemico.id}.json`, cartella), 'utf8'), `${JSON.stringify(x.nemico, null, 2)}\n`, x.nemico.id);
    assert.equal(x.nemico.nome, `${x.tipo.tipo} — ${x.grado.nome}`);
    assert.match(x.nemico.fonte, /^costruito come PG \(/);
    assert.match(x.nemico.note, /^Proposta, da validare con Davide/);
    assert.ok(x.nemico.attacchi.length >= 1);
    assert.equal(x.pg.personaggio.livelli.length + 1, x.grado.livello);
  }
  // Eretico: solo la parte umana, nessun potere inventato, il promemoria per Davide
  for (const x of tutti.filter((y) => y.tipo.tipo === 'Eretico')) {
    assert.equal(x.nemico.incantesimi, undefined);
    assert.match(x.nemico.note, /TODO\(Davide\).*Oscura/);
  }
});

test('bestiario umano: i tre gradi crescono in modo coerente (PV, VA dell’arma principale, Difese)', () => {
  for (const t of TIPI) {
    const [r, v, e] = GRADI.map((g) => tutti.find((x) => x.tipo === t && x.grado === g).nemico);
    const va = (n) => n.attacchi[0].va;
    assert.ok(r.pv < v.pv && v.pv < e.pv, `${t.tipo}: PV ${r.pv}/${v.pv}/${e.pv}`);
    assert.ok(va(r) <= va(v) && va(v) <= va(e) && va(r) < va(e), `${t.tipo}: VA ${va(r)}/${va(v)}/${va(e)}`);
    assert.ok(r.difese <= v.difese && v.difese <= e.difese && r.difese < e.difese, `${t.tipo}: Difese ${r.difese}/${v.difese}/${e.difese}`);
    assert.ok(r.ar.totale <= e.ar.totale, `${t.tipo}: AR`);
  }
});
