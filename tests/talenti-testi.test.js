// Talenti v1.0 (25/10/2026, sera): i testi leggibili del catalogo (src/talenti-testi.js). Ogni voce che si può scegliere —
// 39 Talenti Liberi, 72 Maestrie, 86 Specializzazioni — ha una riga breve e un testo completo che sono stringhe, non
// vuote, senza «[object», «undefined» o «NaN» (il 25/10 il riquadro scriveva «[object Object]» per le sintesi).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { rigaBreve, testoCompleto, schedaTalento, infoTalento, scelteAperte, testoPrerequisiti, testiIncantesimo, testiTecnica, primaFraseUtile } from '../src/talenti-testi.js';
import { schedaDelManuale, INTESTAZIONI_7_10 } from '../tools/lotti/lotto_testi_completi_talenti.mjs';

const { dati } = await datiReali();
const SPORCO = /\[object|undefined|NaN/;
const sceglibili = [
  ...dati.talenti_liberi.talenti.filter((t) => t.categoria !== 'superato'),
  ...dati.specializzazioni.specializzazioni,
];

test('il catalogo che si sceglie: 39 Talenti Liberi, 72 Maestrie, 86 Specializzazioni', () => {
  const per = (c) => sceglibili.filter((v) => v.categoria === c).length;
  assert.deepEqual([per('talento_libero'), per('maestria'), per('specializzazione')], [39, 72, 86]);
});

test('ogni voce: riga breve e testo completo sono stringhe pulite e non vuote', () => {
  for (const v of sceglibili) {
    const riga = rigaBreve(v.id, dati);
    const testo = testoCompleto(v.id, dati);
    assert.equal(typeof riga, 'string', v.nome);
    assert.equal(typeof testo, 'string', v.nome);
    assert.ok(riga.trim().length >= 15, `${v.nome}: riga troppo corta «${riga}»`);
    assert.ok(testo.trim().length >= riga.length / 2, `${v.nome}: testo completo vuoto`);
    assert.doesNotMatch(riga, SPORCO, v.nome);
    assert.doesNotMatch(testo, SPORCO, v.nome);
    // la riga dice che cosa fa: non il tipo o i requisiti da soli
    assert.doesNotMatch(riga, /^(Passivo|Attivo)\.$|^Requisit|^Acquisibile|^Sostituisce|^Riunisce/, v.nome);
    const info = infoTalento(v.id, dati);
    assert.ok(info.categoria, `${v.nome}: categoria`);
    for (const x of [...info.prerequisiti, ...info.apre]) assert.doesNotMatch(x, SPORCO, v.nome);
  }
});

test('le righe che il 25/10 erano «[object Object]» o «Passivo.»', () => {
  assert.match(rigaBreve('duellante', dati), /^Arma ravvicinata a una mano più Arma leggera a distanza/);
  assert.match(rigaBreve('risorse-interiori', dati), /Tecniche Interiori/);
  assert.match(rigaBreve('incantesimi-estesi', dati), /Durata/);
  assert.equal(rigaBreve('escludere-il-focus', dati), 'Può lanciare i propri Incantesimi senza il Focus personale.');
  assert.equal(rigaBreve('specializzazione-elementi', dati), '+1 VA alle Prove di Potere per gli Incantesimi della sottofamiglia Elementi e −1 PM al loro costo, minimo 1.');
  assert.match(rigaBreve('specializzazione-sport', dati), /^\+3 VA ad Atletica in una sola disciplina sportiva/);
  assert.match(rigaBreve('arti-marziali-migliorate', dati), /^\+1 VA agli attacchi senz’armi/);
  // il testo completo di una Specializzazione dice anche la regola del suo gruppo
  assert.match(testoCompleto('specializzazione-pistole', dati), /Armi: \+1 VA e \+1 danno nell’impiego delle armi della categoria/);
});

test('25/10 notte: il testo completo c’è per ogni voce e non è il riassunto (eccezioni: tre schede di una frase sola)', () => {
  // nel manuale queste tre schede sono una frase sola: il testo completo le dice con la loro intestazione
  const UNA_FRASE = ['Iniziativa Migliorata', 'Resistenza alle Malattie', 'Resistenza alla Paura'];
  const n = (s) => s.replace(/\s+/g, ' ').trim();
  const uguali = [];
  for (const v of sceglibili) {
    const s = schedaTalento(v.id, dati);
    const riga = rigaBreve(v.id, dati);
    assert.ok(s.intestazione.length > 10, `${v.nome}: manca l’intestazione (tipo, requisiti, acquisizioni)`);
    assert.ok(s.paragrafi.length >= 1 && s.paragrafi.every((p) => typeof p === 'string' && p.trim() && !SPORCO.test(p)), v.nome);
    assert.notEqual(n(testoCompleto(v.id, dati)), n(riga), `${v.nome}: il testo completo è il riassunto`);
    if (n(s.paragrafi.join(' ')) === n(riga)) uguali.push(v.nome);
  }
  assert.deepEqual(uguali, UNA_FRASE);
});

test('25/10 notte: ogni Talento con la sua scheda nel manuale ha il testo del manuale, parola per parola', () => {
  const nuovi7_10 = new Set([...Object.keys(INTESTAZIONI_7_10), ...dati.talenti_liberi.talenti.filter((t) => t.fonte_regole === 'talenti_nuovi').map((t) => t.id)]);
  let confrontati = 0;
  for (const t of dati.talenti_liberi.talenti.filter((x) => x.categoria !== 'superato' && !nuovi7_10.has(x.id))) {
    const s = schedaDelManuale(t.nome);
    assert.ok(s, `${t.nome}: non trovo la scheda nel manuale`);
    assert.equal(t.testo, s.corpo, `${t.nome}: testo diverso dal manuale`);
    assert.equal(t.intestazione, s.intestazione, `${t.nome}: intestazione diversa dal manuale`);
    confrontati++;
  }
  assert.ok(confrontati >= 100, `confrontati ${confrontati}`);
  // Successo Magistrale Migliorato era la versione di prima del manuale
  assert.match(dati.talenti_liberi.talenti.find((t) => t.id === 'successo-magistrale-migliorato').testo, /anche sotto VA finale 21/);
  // le voci del 7/10: il testo è quello del file, con la sua intestazione
  const hacker = dati.talenti_liberi.talenti.find((t) => t.id === 'maestria-hacker');
  assert.match(hacker.testo, /Il precedente limite di un utilizzo per sessione per ciascun sistema viene eliminato/);
  assert.equal(hacker.intestazione, 'Maestria passiva, acquisibile una sola volta, senza prerequisiti aggiuntivi.');
});

test('prerequisiti e scelte aperte in parole', () => {
  const t = (id) => dati.talenti_liberi.talenti.find((x) => x.id === id);
  assert.deepEqual(testoPrerequisiti(t('ritualista-maggiore'), dati), ['Ritualista Minore']);
  assert.deepEqual(testoPrerequisiti(t('incrementare-incantesimi'), dati), ['la capacità personale di lanciare Incantesimi']);
  assert.deepEqual(scelteAperte(t('incrementare-incantesimi')), ['2 Incantesimi da scegliere']);
  assert.deepEqual(scelteAperte(t('usufruitore-di-magia')), ['2 + Mod INT Incantesimi da scegliere']);
  assert.deepEqual(scelteAperte(t('tecniche-interiori-supplementari')), ['3 Tecniche Interiori da scegliere']);
  assert.match(scelteAperte(t('risorse-interiori'))[0], /^2 \+ Mod SAG \(minimo 1\) Tecniche Interiori da scegliere$/);
  assert.deepEqual(scelteAperte(t('prova-salvezza-migliorata')), ['una Prova Salvezza da scegliere']);
});

test('incantesimi e Tecniche da scegliere: riga e testo puliti per tutti', () => {
  for (const i of dati.incantesimi.incantesimi) {
    const x = testiIncantesimo(i.nome, dati);
    assert.ok(x.riga.length > 10 && !SPORCO.test(x.riga + x.testo), i.nome);
  }
  for (const t of dati.tecniche_interiori.tecniche) {
    const x = testiTecnica(t.id, dati);
    assert.ok(x.riga.length > 10 && !SPORCO.test(x.riga + x.testo), t.nome);
  }
  assert.equal(primaFraseUtile('Passivo. Requisito: qualcosa. Fa una cosa precisa.'), 'Fa una cosa precisa.');
});
