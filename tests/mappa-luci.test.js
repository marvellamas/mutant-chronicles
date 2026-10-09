// Luci della mappa, versione semplice (fase 2, lotto 4; decisione di Marcello del 07/10/2026; src/mappa/luce.js):
// luce della scena, zone a pennello, luci portate dai token, raggio di scoperta della nebbia automatica per categoria,
// penalità proposta in «Attacca!», vista giocatori.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { luceQ, luceDi, luceIngombro, testoLuceBersaglio, categorieLuce, ambienteDi, raggiScoperta, trattoLuce, rettangoloLuce, conVoceLuce, cambiaAmbiente } from '../src/mappa/luce.js';
import { visuale, ostacoliVista } from '../src/mappa/visuale.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { annullaUltima } from '../src/mappa/annulla.js';
import { inBase64, nuovaMaschera, rettangolo, daBase64, cella } from '../src/mappa/celle.js';
import { validaDati } from '../src/validate.js';
import { readFileSync } from 'node:fs';
import { attaccanteDa, armaDaAttacco, attacchiDi, conLuceNemico } from '../src/nemico-attacco.js';
import { calcolaAttaccoRavvicinato } from '../src/attacco.js';
import { nuovoScontro, aggiungiNemici } from '../src/scontro.js';

const { dati } = await datiReali();
const LU = dati.mappa.luci;
const C = 40, R = 12;
const scena = (o = {}) => ({ ...nuovaScena({ id: 'l', nome: 'L', colonne: C, righe: R, nebbia: 'scoperta', dati }), revisione: 0, ...o });
const tok = (id, q, o = {}) => ({ id, q, ingombro: 1, nascosto: false, rif: { tipo: 'partecipante', id }, ...o });
const cat = (s, q) => luceDi(s, q, dati);

test('dati: le categorie di A.106 con nomi e penalità della regola; raggi di scoperta; sorgenti dal catalogo', () => {
  assert.deepEqual(categorieLuce(dati).map((c) => [c.id, c.riga]), [['sufficiente', 'nessuna penalità'], ['penombra', '−2 VA'], ['scarsa', '−4 VA'], ['buio', 'come Accecato']]);
  // A.142 (decisione 146): piena luce senza limite, Penombra 10, Luce scarsa 5, Buio 0
  assert.deepEqual(LU.raggio_scoperta_q, { sufficiente: null, penombra: 10, scarsa: 5, buio: 0 });
  assert.equal(dati.mappa.visuale.raggio_q, null);
  assert.deepEqual(LU.sorgenti.map((x) => x.raggio_q), [2, 6, 6, 10]);
  assert.match(LU['TODO(Davide) visione'], /^A\.143/);
  const d = copia(dati);
  d.mappa.luci.categorie = ['sufficiente', 'tenebra'];
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'luci.categorie'));
});

test('luce della scena e zone a pennello: una zona per Q, «Gomma» le toglie; Ctrl+Z; scene di prima senza luce', () => {
  let s = scena();
  assert.equal(validaScena(s, dati), null, 'scena senza luce: compatibile');
  assert.equal(ambienteDi(s, dati), 'sufficiente');
  assert.equal(cat(s, [5, 5]), 'sufficiente');
  s = cambiaAmbiente(s, 'buio', dati);
  assert.deepEqual(s.luce, { ambiente: 'buio' });
  assert.equal(cat(s, [5, 5]), 'buio');
  // una stanza in Luce (lampade accese) e un corridoio in Penombra
  const prima = s.luce;
  s = conVoceLuce(rettangoloLuce(s, [2, 2], [5, 5], 'sufficiente', dati), prima, dati);
  s = trattoLuce(s, [10, 3], [14, 3], 1, 'penombra', dati);
  assert.deepEqual([cat(s, [3, 3]), cat(s, [12, 3]), cat(s, [20, 3])], ['sufficiente', 'penombra', 'buio']);
  // dipingere Penombra sopra la stanza toglie la Luce su quei Q
  s = trattoLuce(s, [5, 5], [5, 5], 1, 'penombra', dati);
  assert.equal(cat(s, [5, 5]), 'penombra');
  assert.ok(!cella(daBase64(s.luce.zone.sufficiente), C, R, 5, 5));
  // gomma: torna la luce della scena
  s = trattoLuce(s, [12, 3], [12, 3], 1, 'gomma', dati);
  assert.equal(cat(s, [12, 3]), 'buio');
  assert.equal(validaScena(s, dati), null);
  // Ctrl+Z della voce «luce»: com'era prima del rettangolo
  assert.deepEqual(annullaUltima(s).scena.luce, { ambiente: 'buio' });
  // formato
  assert.match(validaScena({ ...s, luce: { ambiente: 'nebbioso' } }, dati), /^luce\.ambiente/);
  assert.match(validaScena({ ...s, luce: { ambiente: 'buio', zone: { buio: 'xx' } } }, dati), /^luce\.zone\.buio/);
  // tornare a Luce senza zone: il campo sparisce
  assert.equal(cambiaAmbiente(scena({ luce: { ambiente: 'penombra' } }), 'sufficiente', dati).luce, undefined);
});

test('luce portata da un token: Luce entro il raggio, segue il token; i muri non la fermano', () => {
  let s = scena({ luce: { ambiente: 'buio' } });
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 8, 0, 8, R - 1, true));
  s.token = [tok('pg:a', [6, 5], { luce: 3 })];
  assert.equal(validaScena(s, dati), null);
  assert.deepEqual([cat(s, [6, 5]), cat(s, [9, 8]), cat(s, [9, 9]), cat(s, [10, 5])], ['sufficiente', 'sufficiente', 'buio', 'buio']);
  assert.equal(cat(s, [9, 5]), 'sufficiente', 'oltre il muro: nessun calcolo d’ombra');
  // il token si muove: la luce lo segue
  s = { ...s, token: [{ ...s.token[0], q: [20, 5] }] };
  assert.deepEqual([cat(s, [6, 5]), cat(s, [22, 7])], ['buio', 'sufficiente']);
  assert.match(validaScena({ ...s, token: [{ ...s.token[0], luce: 0 }] }, dati), /luce: raggio/);
  assert.match(validaScena({ ...s, token: [{ ...s.token[0], luce: LU.raggio_max_q + 1 }] }, dati), /luce: raggio/);
});

test('nebbia automatica (A.142): il raggio dipende dalla luce del Q visto (Luce senza limite, Penombra 10, Luce scarsa 5, Buio 0)', () => {
  const vede = (ambiente, pg = tok('pg:a', [1, 5]), extra = {}) => {
    const s = scena({ luce: { ambiente }, token: [pg], ...extra });
    const v = visuale(s, s.token, ostacoliVista(s, dati.mappa.porte), dati.mappa.visuale, null, dati.mappa);
    // il Q più lontano visto sulla riga del PG
    let max = 0;
    for (let x = 0; x < C; x++) if (v[5 * C + x]) max = Math.max(max, Math.abs(x - pg.q[0]));
    return max;
  };
  // la griglia è larga 40: in piena luce si vede fino al bordo (38 Q dalla colonna 1); al buio solo la propria pedina
  assert.deepEqual(['sufficiente', 'penombra', 'scarsa', 'buio'].map((a) => vede(a)), [38, 10, 5, 0]);
  // un limite fisso nei dati resta possibile (visuale.raggio_q)
  assert.equal(vede('sufficiente', tok('pg:a', [1, 5]), {}), 38);
  // al buio con una torcia di 6 Q: si vede fin dove arriva la luce, non oltre
  assert.equal(vede('buio', tok('pg:a', [1, 5], { luce: 6 })), 6);
  // il raggio è quello del Q visto: una stanza illuminata lontano si vede dal buio
  const stanza = { luce: { ambiente: 'buio', zone: { sufficiente: inBase64(rettangolo(nuovaMaschera(C, R), C, R, 20, 4, 22, 6, true)) } } };
  const s = scena({ ...stanza, token: [tok('pg:a', [1, 5])] });
  const v = visuale(s, s.token, ostacoliVista(s, dati.mappa.porte), dati.mappa.visuale, null, dati.mappa);
  assert.deepEqual([v[5 * C + 21], v[5 * C + 10], v[5 * C + 2], v[5 * C + 1]], [1, 0, 0, 1], 'la stanza sì, il corridoio buio no (nemmeno il Q accanto), la propria pedina sì');
  // raggi per Q
  const r = raggiScoperta(s, dati);
  assert.deepEqual([r.raggio(21, 5), r.raggio(10, 5), r.massimo], [Infinity, 0, Infinity]);
});

test('«Attacca!» dalla mappa: la luce della zona del bersaglio, con la riga, e la sua penalità nel calcolo', () => {
  const s = scena({ luce: { ambiente: 'sufficiente', zone: { penombra: inBase64(rettangolo(nuovaMaschera(C, R), C, R, 10, 0, 12, 4, true)) } } });
  assert.equal(luceIngombro(s, tok('b', [11, 2]), dati), 'penombra');
  assert.equal(luceIngombro(s, tok('b', [12, 4], { ingombro: 2 }), dati), 'penombra', 'il bersaglio grande: la luce peggiore fra i suoi Q');
  assert.equal(testoLuceBersaglio('penombra', dati), 'Penombra −2 VA (zona del bersaglio)');
  assert.equal(testoLuceBersaglio('sufficiente', dati), null);
  // la penalità è quella della regola (A.106), che il motore applica con la luce nella sessione dell'attacco
  assert.equal(dati.regole.illuminazione.livelli.find((x) => x.id === 'penombra').effetti[0].valore, -2);
  // l'attacco di un nemico: la luce proposta entra nel VA, con la sua riga; il buio come Accecato (−8, niente Mirato)
  const leg = JSON.parse(readFileSync(new URL('../esempi/nemici/legionario-oscuro.json', import.meta.url), 'utf8'));
  const p = aggiungiNemici(nuovoScontro({ id: 'x', pg: [] }), leg, 1, {}).partecipanti[0];
  const i = attacchiDi(p).findIndex((a) => a.tipo !== 'distanza');
  const base = { arma: armaDaAttacco(attacchiDi(p)[i], 'u', dati), chi: attaccanteDa(p, dati) };
  const va = (luce, o) => { const x = conLuceNemico(base.arma, base.chi, luce, dati, o); return calcolaAttaccoRavvicinato(x.chi, x.arma, {}, dati).va_finale; };
  const v0 = va('sufficiente');
  assert.deepEqual([va('penombra') - v0, va('scarsa') - v0, va('buio') - v0, va('penombra', { visione: true }) - v0, va('buio', { visione: true }) - v0], [-2, -4, -8, 0, -8]);
  assert.match(conLuceNemico(base.arma, base.chi, 'penombra', dati).arma.scomposizione.at(-1).etichetta, /Luce: Penombra/);
  assert.deepEqual(conLuceNemico(base.arma, base.chi, 'buio', dati).chi.sessione.statiAttivi, ['accecato']);
});

test('vista giocatori: zone scure solo fuori dalla nebbia; i token restano (il buio non li nasconde)', () => {
  let s = scena({ luce: { ambiente: 'buio' }, token: [tok('pg:a', [3, 3], { luce: 2 }), tok('nem:x:1', [20, 5])] });
  // nebbia sulla metà destra
  s = { ...s, nebbia: { ...s.nebbia, coperti: inBase64(rettangolo(nuovaMaschera(C, R), C, R, 25, 0, C - 1, R - 1, true)) } };
  const v = vistaGiocatori(s, null, dati.mappa.template, dati.mappa);
  assert.deepEqual(Object.keys(v.luce), ['buio']);
  const buio = daBase64(v.luce.buio);
  assert.ok(cella(buio, C, R, 15, 5), 'buio fuori dalla nebbia');
  assert.ok(!cella(buio, C, R, 30, 5), 'sotto la nebbia nulla');
  assert.ok(!cella(buio, C, R, 3, 3), 'attorno alla torcia: Luce');
  assert.deepEqual(v.token.map((t) => t.id).sort(), ['nem:x:1', 'pg:a'], 'il nemico al buio si vede (la nebbia decide)');
  // scena tutta in Luce: niente campo
  assert.equal(vistaGiocatori(scena(), null, dati.mappa.template, dati.mappa).luce, undefined);
  assert.equal(luceQ(scena(), dati).every((x) => x === 0), true);
});
