import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 254, rif. 07 del collaudo di Davide del 25/11/2026 — «Nella spiegazione di Percezione sostituire +X con +1.»
//
// **Un «+X» a schermo è un dato mancante che si è travestito da testo**, e questa è la terza volta che la famiglia
// torna: nel 249 i rami vuoti delle finestrelle si leggevano come la parola «null», nel 249 «undefined + 5» e «NaN»
// stavano nella tabella dell'Iniziativa, nel 251 un motivo stava nel solo `title`. Chiudere la famiglia vale più
// della singola riga, e si chiude **guardando quello che si rende**, non i dati grezzi: in `regole.json` il §5.24
// cita «un bonus formulato come “+X danni dopo l'Armatura”», e lì la X è giusta perché parla della *forma* di un
// bonus. La differenza non si vede in una stringa: si vede in una stringa **di una voce che ha il suo numero**.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dati, contesto, resa, TAB } from './scheda-aiuti.js';
import { catalogo } from '../src/equipaggiamento.js';
import { contenutoTooltip } from '../src/descrizioni.js';
import { testoProprieta, condizioneEffetto, notaConIGradi, conIlNumero, gradoDalNome, segnoDiscorde, RISCRITTE } from '../src/segnaposto.js';

/** I segnaposto che non devono arrivare a schermo. `{…}` compreso: un modello non riempito si legge così. */
const SEGNAPOSTO = [
  [/\+\s*X\b/, '«+X»: il grado di una proprietà non sostituito'],
  [/\{[A-Za-z_][A-Za-z0-9_.]*\}/, 'un modello non riempito, «{nome}»'],
  [/\bundefined\b/, '«undefined»'],
  [/\bNaN\b/, '«NaN»'],
  [/%[A-Za-z]+%/, 'un segnaposto «%nome%»'],
];
const trova = (testo) => (typeof testo === 'string' ? SEGNAPOSTO.filter(([re]) => re.test(testo)).map(([, nome]) => nome) : []);

test('rif. 07: l’Elmetto Recon ASA si legge «+1», e il calcolo usa 1 (A.294)', () => {
  const e = catalogo(dati).perRif.get('elmetti:elmetto-asa-recon');
  const perc = e.effetti.find((x) => x.abilita === 'Percezione');
  assert.equal(perc.valore, 1, 'il calcolo usa 1: era già così, ed è il motivo per cui Davide l’ha chiamata «discrepanza di testo»');
  // il dato cita il manuale, che scrive «+X» (verifica_frasi lo controlla); la vista scrive il numero della voce
  assert.match(perc.condizione, /\+X VA a Percezione/, 'nel dato resta la citazione del manuale');
  assert.match(condizioneEffetto(perc), /\+1 VA a Percezione/, 'a schermo si legge «+1»');
  for (const p of e.proprieta ?? []) {
    const reso = testoProprieta(p);
    if (reso) assert.deepEqual(trova(reso), [], `proprietà «${p.nome}»: ${reso.slice(0, 70)}`);
  }
});

test('rif. 07: nessuna voce del catalogo mostra un «+X» al posto del suo numero', () => {
  const guasti = [];
  for (const o of catalogo(dati).oggetti) {
    for (const p of o.proprieta ?? []) for (const g of trova(testoProprieta(p))) guasti.push(`${o.rif} · proprietà «${p.nome}»: ${g}`);
    for (const e of o.effetti ?? []) for (const k of ['condizione', 'testo', 'nota']) for (const g of trova(condizioneEffetto(e, k))) guasti.push(`${o.rif} · effetto.${k}: ${g}`);
    for (const k of ['note_manuale', 'nota']) for (const g of trova(notaConIGradi(o[k]))) guasti.push(`${o.rif} · ${k}: ${g}`);
  }
  assert.deepEqual(guasti, [], `voci con un segnaposto a schermo:\n${guasti.slice(0, 10).join('\n')}`);
});

test('rif. 07: il «?» di ogni voce del catalogo non mostra segnaposto', () => {
  const guasti = [];
  for (const o of catalogo(dati).oggetti) {
    const t = contenutoTooltip('oggetto', o.rif, dati);
    if (!t) continue;
    const testi = [t.titolo, t.sottotitolo, ...(t.sezioni ?? []).flatMap((s) => [s.etichetta, s.testo]),
      ...(t.tabella?.colonne ?? []), ...(t.tabella?.righe ?? []).flatMap((r) => Object.values(r))];
    // solo le stringhe: un campo assente non è un segnaposto, e `String(undefined)` lo farebbe sembrare tale
    for (const x of testi.filter((v) => typeof v === 'string')) for (const g of trova(x)) guasti.push(`${o.rif}: ${g} — «${x.slice(0, 80)}»`);
  }
  assert.deepEqual(guasti, [], `schede con un segnaposto:\n${guasti.slice(0, 10).join('\n')}`);
});

test('rif. 07: le otto tab di un personaggio reso non contengono segnaposto', () => {
  const guasti = [];
  for (const file of ['Torvald-Krane_liv6_2026-10-02.json', 'Fratello-Anselmo-Viri_liv3_2026-10-02.json', 'Aiko-Tenzan_liv5_2026-10-02.json']) {
    for (const attiva of TAB) {
      const testo = resa(contesto(file, { attiva })).testo();
      for (const g of trova(testo)) {
        const brano = SEGNAPOSTO.find(([, n]) => n === g)[0].exec(testo);
        guasti.push(`${file} · ${attiva}: ${g} — «${testo.slice(Math.max(0, brano.index - 50), brano.index + 50)}»`);
      }
    }
  }
  assert.deepEqual(guasti, [], `tab con un segnaposto:\n${guasti.slice(0, 8).join('\n')}`);
});

test('rif. 07: quello che resta generico è solo «X è il grado di un altro», e si riconosce', () => {
  // le frasi in cui X è il grado del BERSAGLIO (la Contromisura) restano, ed è giusto: quel numero non è di questa
  // voce. Si riconoscono perché non hanno «+X» e perché il nome della proprietà non porta un grado.
  const restano = [];
  for (const o of catalogo(dati).oggetti) {
    for (const p of o.proprieta ?? []) {
      const reso = testoProprieta(p);
      if (typeof reso === 'string' && /\bX\b/.test(reso)) restano.push({ rif: o.rif, nome: p.nome, reso });
    }
  }
  assert.ok(restano.length > 0, 'le frasi generiche non spariscono');
  for (const r of restano) {
    assert.doesNotMatch(r.reso, /\+\s*X\b/, `${r.rif} · «${r.nome}»: un «+X» a schermo`);
    assert.equal(gradoDalNome(r.nome), null, `${r.rif} · «${r.nome}»: il nome porta un grado, quindi il numero c’era`);
  }
});

test('mutante: una sostituzione col segno sbagliato verrebbe vista, e il numero non si inventa', () => {
  // «Affidabilità ridotta −2» porta la definizione generica di «Affidabile +X»: sostituire direbbe il contrario
  assert.equal(gradoDalNome('Affidabilità ridotta −2'), -2);
  assert.equal(segnoDiscorde('Affidabile +X. Aggiunge X al tiro…', -2), true, 'il segno discorde si riconosce');
  assert.equal(segnoDiscorde('Concede +X alla Prova…', 1), false, 'un bonus con grado positivo si sostituisce');
  // la sostituzione tocca il marcatore e non le parole
  assert.equal(conIlNumero('Precisa X. Concede +X VA alle Prove', 1), 'Precisa 1. Concede +1 VA alle Prove');
  assert.equal(conIlNumero('Ignora X punti dell’AR', 1), 'Ignora 1 punto dell’AR', 'l’unico accordo che la sostituzione rompe è sistemato');
  assert.equal(conIlNumero('Ignora X punti dell’AR', 2), 'Ignora 2 punti dell’AR');
  assert.equal(conIlNumero('La Contromisura è Ignifugo X', 1), 'La Contromisura è Ignifugo X', 'un X in fine di frase non è un marcatore di grado');
});

test('la regola generale del manuale non si tocca: lì «+X» parla della forma di un bonus', () => {
  const r = JSON.parse(readFileSync(new URL('../data/regole.json', import.meta.url), 'utf8'));
  const testo = JSON.stringify(r);
  assert.match(testo, /Un bonus formulato come “\+X danni dopo l’Armatura”/, 'la citazione del §5.24 resta com’è');
});

test('rif. 07: l’Inventario con l’Elmetto Recon indossato non mostra «+X» (la via vera del guasto)', () => {
  // Il guasto che Davide ha visto stava **qui** e non nelle tre schede d'esempio, che non hanno l'elmetto: la riga
  // dell'Inventario mostra `effetti[].condizione` così come sta nel catalogo. Il test mette l'oggetto addosso a un PG
  // e guarda il testo reso, perché è l'unica via in cui il guasto compare.
  const con = (s) => { s.equipaggiamento = [...(s.equipaggiamento ?? []), { uid: 'prova-elmetto', rif: 'elmetti:elmetto-asa-recon', stato: 'indossata', quantita: 1, note: '' }]; return s; };
  for (const attiva of ['inventario', 'combattimento', 'abilita']) {
    const testo = resa(contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva, scelte: con })).testo();
    if (attiva === 'inventario') assert.match(testo, /Elmetto Recon ASA/, 'l’elmetto è nell’Inventario');
    for (const g of trova(testo)) {
      const brano = SEGNAPOSTO.find(([, n]) => n === g)[0].exec(testo);
      assert.fail(`tab ${attiva}: ${g} — «${testo.slice(Math.max(0, brano.index - 60), brano.index + 60)}»`);
    }
  }
});
