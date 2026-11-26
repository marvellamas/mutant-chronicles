import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 255, parte A — **gli Scudi: protezione, penalità e Assalto Armato** (revisione approvata da Davide il
// 24/11/2026 nell'E&L, recepita nel Giocatore 0.69 §§2.16.8, 2.16.27, 3.5.4 e 5.9 e negli Armamenti 0.92 §§7.4,
// 7.11.1 e 7.22.4).
//
// Le due cose che si sbagliano, e che questo file tiene chiuse:
//
//   1. **la penalità al MOV si sottrae una volta sola al budget della modalità scelta** — Passo, Corsa o Scatto —
//      non una volta per modalità sommandosi, e non tre volte in un totale. Un errore qui si vede al tavolo come un
//      Movimento sbagliato di 1 o 2 Q a ogni turno;
//   2. **il −1 VA della categoria Enorme non entra nelle Prove di Difese**, Schivate e Parate comprese. Nei dati non
//      esiste nemmeno la chiave «difese» fra le penalità (il validatore non la ammette) e `penalitaScudo` di
//      src/equipaggiamento.js non la tocca: due guardie, perché è la cosa che il testo dice tre volte.
//
// I numeri non sono scritti qui: le categorie si leggono dal manuale con il lettore (tools/importa-scudi.mjs), così
// un cambio di Davide compare come differenza invece di restare in un elenco nostro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dati, contesto, resa } from './scheda-aiuti.js';
import { catalogo } from '../src/equipaggiamento.js';
import { valoriTavolo } from '../src/condizioni.js';
import { sezione74, categorieDalManuale } from '../tools/importa-scudi.mjs';
import { testoManuale, versioneManuale } from '../tools/manuali.mjs';

const cat = catalogo(dati);
const scudo = (id) => cat.perRif.get(`scudi:${id}`);
/** Le categorie come le scrive il manuale corrente: nome → { ar, va, mov }. */
const categorie = () => {
  const l = categorieDalManuale(sezione74(testoManuale('armamenti')));
  assert.equal(l.length, 3, 'il §7.4 dà tre categorie di Scudo');
  return new Map(l.map((c) => [c.nome, c]));
};

test('parte A: le tre categorie dei dati sono quelle del manuale corrente (AR, VA, MOV)', () => {
  const c = categorie();
  const attesi = [
    ['Piccolo o leggero', 'scudo-piccolo'],
    ['Medio o grande', 'scudo-medio'],
    ['Enorme', 'scudo-enorme'],
  ];
  for (const [nome, id] of attesi) {
    const m = c.get(nome);
    const o = scudo(id);
    assert.equal(o.ar.totale, m.ar, `${id}: AR`);
    assert.equal(o.mov ?? 0, m.mov, `${id}: MOV`);
    assert.equal(o.penalita?.agilita ?? 0, m.va ?? 0, `${id}: penalità al VA`);
    assert.equal(o.penalita?.attacchi_ravvicinati ?? 0, m.va ?? 0, `${id}: penalità agli attacchi ravvicinati`);
    assert.equal(o.penalita?.attacchi_distanza ?? 0, m.va ?? 0, `${id}: penalità agli attacchi a distanza`);
  }
  // e ogni scudo del catalogo segue la sua categoria: nessuno resta all'edizione di prima in silenzio
  const perTaglia = { Piccolo: 'Piccolo o leggero', Medio: 'Medio o grande', Enorme: 'Enorme' };
  for (const o of cat.oggetti.filter((x) => x.tipo === 'scudo')) {
    const nome = perTaglia[String(o.taglia).split(',')[0].trim()];
    assert.ok(nome, `${o.rif}: taglia «${o.taglia}» fuori dalle tre categorie`);
    assert.equal(o.mov ?? 0, categorie().get(nome).mov, `${o.rif}: MOV della categoria ${nome}`);
  }
});

test('parte A: nessuno scudo dichiara una penalità alle Difese (il validatore non ammette la chiave)', () => {
  for (const o of cat.oggetti.filter((x) => x.tipo === 'scudo')) {
    assert.equal(o.penalita?.difese, undefined, `${o.rif}: una penalità alle Difese non esiste (§7.4: il −1 VA dell’Enorme non si applica alle Prove di Difese)`);
  }
  // e il motore non la applica: la funzione che applica le penalità dello Scudo non nomina le Difese se non per dire
  // che non le tocca
  const src = readFileSync(new URL('../src/equipaggiamento.js', import.meta.url), 'utf8');
  const corpo = src.slice(src.indexOf('const penalitaScudo ='), src.indexOf('for (const o of oggetti.filter((x) => x.attivo && (x.tipo ==='));
  assert.ok(corpo.length > 100, 'penalitaScudo si trova nel file');
  assert.doesNotMatch(corpo, /aggiungi\(difeseAbilita/, 'penalitaScudo non deve aggiungere niente alle Difese');
});

test('parte A: la penalità al MOV si sottrae UNA volta al budget di ogni modalità, non due', () => {
  const base = {
    movimento: { passo: 6, corsa: 12, scatto: 18, unita: 'Q' },
    azioni: { principali: 1, movimento: 1 },
    equipaggiamento: { movimentoQ: -1, movimentoQProtezioni: -1, movimentoQScudo: -1 },
  };
  const v = valoriTavolo(base, { statiAttivi: [] }, dati);
  assert.deepEqual([v.movimento.passo.effettivo, v.movimento.corsa.effettivo, v.movimento.scatto.effettivo], [5, 11, 17]);
  for (const modo of ['passo', 'corsa', 'scatto']) {
    const quante = v.movimento[modo].scomposizione.filter((x) => /MOV/.test(x.etichetta)).length;
    assert.equal(quante, 1, `${modo}: la penalità al MOV compare ${quante} volte nella scomposizione`);
  }
  // e l'etichetta dice da dove viene: con il solo scudo è «Scudo (MOV)», non «Armatura»
  assert.match(v.movimento.passo.scomposizione.find((x) => /MOV/.test(x.etichetta)).etichetta, /^Scudo \(MOV\)$/);
  const misto = valoriTavolo({ ...base, equipaggiamento: { movimentoQ: -3, movimentoQProtezioni: -3, movimentoQScudo: -2 } }, { statiAttivi: [] }, dati);
  assert.match(misto.movimento.passo.scomposizione.find((x) => /MOV/.test(x.etichetta)).etichetta, /^Armatura e scudo \(MOV\)$/);
});

test('parte A: Assalto Armato riduce di 2 Q, fino a 0, la penalità complessiva — i tre esempi del manuale', () => {
  // gli esempi del Giocatore 0.69 §3.5.4 sono il metro: armatura media + scudo medio −2 → 0; media + enorme −3 → −1;
  // pesante + enorme −4 → −2. Si costruiscono dai valori dei dati, non da numeri scritti qui.
  const armatura = (c) => dati.equipaggiamento.file.armature.categorie[c].movimento_q;
  const esempi = [
    ['Media', 'scudo-medio', 0],
    ['Media', 'scudo-enorme', -1],
    ['Pesante', 'scudo-enorme', -2],
  ];
  for (const [categoria, id, atteso] of esempi) {
    const mov = armatura(categoria) + (scudo(id).mov ?? 0);
    const scheda = {
      movimento: { passo: 6, corsa: 12, scatto: 18, unita: 'Q' },
      azioni: { principali: 1, movimento: 1 },
      equipaggiamento: { movimentoQ: mov, movimentoQProtezioni: mov, movimentoQScudo: scudo(id).mov ?? 0 },
      classi: [{ nome: 'Assaltatore', talenti: [{ nome: 'Assalto Armato' }] }],
    };
    const v = valoriTavolo(scheda, { statiAttivi: [] }, dati);
    assert.equal(v.movimento.passo.effettivo, 6 + atteso, `armatura ${categoria} + ${id}: penalità ${mov} → ${atteso}`);
    // e non tocca il VA
    assert.equal(v.movimento.scatto.effettivo, 18 + atteso, `armatura ${categoria} + ${id}: anche lo Scatto`);
  }
  // senza il Talento la penalità resta intera
  const senza = valoriTavolo({
    movimento: { passo: 6, corsa: 12, scatto: 18, unita: 'Q' }, azioni: { principali: 1, movimento: 1 },
    equipaggiamento: { movimentoQ: -3, movimentoQProtezioni: -3, movimentoQScudo: -2 },
  }, { statiAttivi: [] }, dati);
  assert.equal(senza.movimento.passo.effettivo, 3);
});

test('parte A: con lo Scudo enorme in mano il VA delle Difese non scende, Atletica e gli attacchi sì', () => {
  const conScudo = (id) => (s) => {
    s.equipaggiamento = [...(s.equipaggiamento ?? []).filter((v) => !/^scudi:/.test(v.rif ?? '')),
      { uid: 'prova-scudo', rif: `scudi:${id}`, stato: 'imbracciato', quantita: 1, note: '' }];
    return s;
  };
  const va = (ctx, nome) => (ctx.tab.scheda.tavolo?.abilita ?? ctx.tab.scheda.abilita).find((a) => a.nome === nome);
  const senza = contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva: 'abilita' });
  const con = contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva: 'abilita', scelte: conScudo('scudo-enorme') });
  const d0 = va(senza, 'Difese'); const d1 = va(con, 'Difese');
  assert.equal(d1.effettivo ?? d1.va, d0.effettivo ?? d0.va, 'le Prove di Difese non prendono il −1 VA dell’Enorme');
  const a0 = va(senza, 'Atletica'); const a1 = va(con, 'Atletica');
  assert.equal((a1.effettivo ?? a1.va) - (a0.effettivo ?? a0.va), scudo('scudo-enorme').penalita.agilita, 'Atletica è una Prova di Agilità e scende');
  // la riga che dice che le Difese sono state guardate
  const testo = resa(con).testo();
  assert.match(testo, /Difese/, 'la tab Abilità nomina le Difese');
});

test('parte A: lo stato dello Scudo conta — le penalità valgono mentre è impugnato', () => {
  const inZaino = (s) => {
    s.equipaggiamento = [...(s.equipaggiamento ?? []).filter((v) => !/^scudi:/.test(v.rif ?? '')),
      { uid: 'prova-scudo', rif: 'scudi:scudo-medio', stato: 'zaino', quantita: 1, note: '' }];
    return s;
  };
  const inMano = (s) => {
    s.equipaggiamento = [...(s.equipaggiamento ?? []).filter((v) => !/^scudi:/.test(v.rif ?? '')),
      { uid: 'prova-scudo', rif: 'scudi:scudo-medio', stato: 'imbracciato', quantita: 1, note: '' }];
    return s;
  };
  const passo = (f) => contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva: 'combattimento', scelte: f }).tab.scheda.tavolo.movimento.passo.effettivo;
  assert.equal(passo(inZaino) - passo(inMano), 1, 'nello zaino lo Scudo non toglie Q al Movimento');
});

test('parte A: il file degli scudi dichiara l’edizione corrente e la provenienza per campo', () => {
  const f = JSON.parse(readFileSync(new URL('../data/equipaggiamento/scudi.json', import.meta.url), 'utf8'));
  assert.equal(f.versione_manuale, `Armamenti ${versioneManuale('armamenti')}`);
  const conMov = f.oggetti.filter((o) => o._edizione?.campi?.mov);
  assert.equal(conMov.length, f.oggetti.length, 'ogni scudo dichiara da quale edizione viene il suo MOV');
});
