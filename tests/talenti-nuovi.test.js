// Talenti v1.0 (lotto 1 del 25/10/2026): tre categorie, posti per livello, Specializzazioni per Classe, prerequisiti
// in ordine di livello, Talenti accorpati. Fonte: «Nuova progressione di Talenti Specializzazioni e Maestrie» v1.0 del
// 7/10/2026 (docs/talenti-nuovi-v1.0.txt), che sui Talenti vale sul Manuale del Giocatore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { postiTalenti, controllaSceltaTalento, calcolaSchedaPersonaggio, prossimoLivello } from '../src/avanzamento.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { perOperazione } from '../src/ricarica.js';

const { dati } = await datiReali();
const T = (id) => dati.talenti_liberi.talenti.find((t) => t.id === id);

function leggiPg(file) {
  const p = deserializzaPersonaggio(readFileSync(new URL(file, import.meta.url), 'utf8'));
  return { creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli };
}
const dimitri = () => leggiPg('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json');

/** Dimitri (Tecnomante, 6° livello) nel regime nuovo, con le sei scelte. */
function dimitriNuovo(scelte = {}) {
  const p = dimitri();
  const livelli = p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; return x; });
  const s = {
    iniziale: { id: 'specializzazione-informatica' }, m2: { id: 'parata-istintiva' }, t3: { id: 'ritualista-minore' },
    s4: { id: 'specializzazione-cerimoniale' }, t5: { id: 'buona-costituzione' }, m6: { id: 'ritualista-maggiore' }, ...scelte,
  };
  if (s.m2) livelli[0].maestria = s.m2;
  if (s.t3) livelli[1].talentoLibero = s.t3;
  if (s.s4) livelli[2].specializzazione = s.s4;
  if (s.t5) livelli[3].talentoLibero = s.t5;
  if (s.m6) livelli[4].maestria = s.m6;
  return { creazione: { ...p.creazione, regimeTalenti: 2, specializzazioneIniziale: s.iniziale ?? null }, livelli };
}

test('catalogo: 39 Talenti Liberi, 72 Maestrie, 86 Specializzazioni, ogni Classe con il suo elenco', () => {
  const per = (c) => dati.talenti_liberi.talenti.filter((t) => t.categoria === c).length;
  assert.equal(per('talento_libero'), 39);
  assert.equal(per('maestria'), 72);
  assert.equal(dati.specializzazioni.specializzazioni.length, 86);
  assert.ok(dati.specializzazioni.specializzazioni.some((s) => s.id === 'specializzazione-sport'));
  for (const c of dati.classi.classi) assert.ok(dati.specializzazioni.per_classe[c.nome]?.length >= 10, `${c.nome}: elenco`);
  assert.equal(dati.specializzazioni.per_classe.Tecnomante.length, 25);
  assert.equal(dati.specializzazioni.per_classe.Amministrativo.length, 10);
  // le voci superate restano per i PG di prima, con la voce che le sostituisce
  assert.equal(T('raffica-breve-migliorata').sostituito_da, 'raffiche-migliorate');
  assert.equal(T('sport').sostituito_da, 'specializzazione-sport');
});

test('posti per categoria ai livelli 1, 2, 3, 4, 6, 10 e 20', () => {
  const attesi = { 1: [1, 0, 0], 2: [1, 1, 0], 3: [1, 1, 1], 4: [2, 1, 1], 6: [2, 2, 2], 10: [3, 3, 4], 20: [6, 5, 9] };
  const base = dimitriNuovo();
  for (const [n, [s, m, t]] of Object.entries(attesi)) {
    const livelli = Array.from({ length: Number(n) - 1 }, (_, i) => base.livelli[i] ?? { livello: i + 2 });
    const r = postiTalenti({ creazione: base.creazione, livelli }, dati, { opzioni: false });
    assert.deepEqual([r.categorie.specializzazione.spettanti, r.categorie.maestria.spettanti, r.categorie.talento_libero.spettanti], [s, m, t], `livello ${n}`);
  }
});

test('regime nuovo: le sei scelte di Dimitri riempiono i sei posti, la scheda ne applica gli effetti', () => {
  const p = dimitriNuovo();
  const r = postiTalenti(p, dati);
  assert.equal(r.regime, 'nuovo');
  assert.deepEqual(Object.values(r.categorie).map((c) => c.mancanti), [0, 0, 0]);
  assert.ok(r.posti.every((x) => x.valida), JSON.stringify(r.posti.filter((x) => !x.valida).map((x) => x.problemi)));
  assert.equal(r.prossimo, null);
  const s = calcolaSchedaPersonaggio(p, dati);
  assert.deepEqual(s.errori, []);
  assert.equal(s.regimeTalenti, 'nuovo');
  assert.deepEqual(s.talentiLiberi.map((t) => [t.nome, t.categoria, t.livello]),
    [['Parata Istintiva', 'maestria', 2], ['Ritualista Minore', 'talento_libero', 3], ['Buona Costituzione', 'talento_libero', 5], ['Ritualista Maggiore', 'maestria', 6]]);
  assert.deepEqual(s.specializzazioni.map((x) => [x.nome, x.livello, x.classe]), [['Informatica', 1, 'Tecnomante'], ['Cerimoniale', 4, 'Tecnomante']]);
  // effetto calcolato, non copiato: Buona Costituzione dà PV, toglierla li toglie
  const senza = calcolaSchedaPersonaggio(dimitriNuovo({ t5: { id: 'sempre-allerta' } }), dati);
  assert.ok(s.pv > senza.pv, `${s.pv} > ${senza.pv}`);
});

test('Specializzazione solo dall’elenco della Classe aumentata (più Potere con Usufruitore di Magia)', () => {
  const p = dimitriNuovo({ s4: { id: 'specializzazione-spade' } });
  const r = postiTalenti(p, dati);
  const posto = r.posti.find((x) => x.categoria === 'specializzazione' && x.livello === 4);
  assert.equal(posto.valida, false);
  assert.match(posto.problemi[0].problema, /non è nell’elenco del Tecnomante/);
  // il controllo unico, direttamente: Agente sì Pistole, no Spade; con Usufruitore anche le nove di Potere
  const stato = { regime: 'nuovo', talentiLiberi: [], classi: [], car: { FOR: 5 }, addestr: { nome: 'Avventuriero' } };
  const ok = (id, st = stato) => !controllaSceltaTalento(st, 'specializzazione', { id }, dati, { classe: 'Agente' }).some((e) => e.tipo === 'violazione');
  assert.equal(ok('specializzazione-pistole'), true);
  assert.equal(ok('specializzazione-spade'), false);
  assert.equal(ok('specializzazione-elementi'), false);
  assert.equal(ok('specializzazione-elementi', { ...stato, talentiLiberi: [{ id: 'usufruitore-di-magia' }] }), true);
  // una Specializzazione già posseduta non si riprende
  assert.equal(ok('specializzazione-pistole', { ...stato, talentiLiberi: [{ id: 'specializzazione-pistole' }] }), false);
  // le opzioni del posto sono tutte e sole quelle dell'elenco
  const iniziale = postiTalenti(dimitriNuovo({ iniziale: null }), dati).posti.find((x) => x.livello === 1);
  assert.deepEqual(new Set(iniziale.opzioni.filter((o) => o.ammesso).map((o) => o.id)), new Set(dati.specializzazioni.per_classe.Tecnomante));
});

test('un prerequisito blocca: Ritualista Maggiore senza il Minore, in ordine di livello', () => {
  // Maestria del 2° livello: il Minore del 3° non conta ancora
  const r = postiTalenti(dimitriNuovo({ m2: { id: 'ritualista-maggiore' }, m6: { id: 'parata-istintiva' } }), dati);
  const p2 = r.posti.find((x) => x.livello === 2);
  assert.equal(p2.valida, false);
  assert.match(p2.problemi[0].problema, /Ritualista Maggiore richiede Ritualista Minore/);
  // al 6° sì, perché il Minore è del 3°
  assert.equal(postiTalenti(dimitriNuovo(), dati).posti.find((x) => x.livello === 6).valida, true);
  // e la validazione dei livelli dice la stessa cosa (controllo unico)
  const s = calcolaSchedaPersonaggio(dimitriNuovo({ m2: { id: 'ritualista-maggiore' }, m6: { id: 'parata-istintiva' } }), dati);
  assert.ok(s.errori.some((e) => e.campo === 'livelli[0].maestria' && /richiede Ritualista Minore/.test(e.problema)));
});

test('ogni scelta nella sua categoria; le voci superate non si scelgono nel regime nuovo, quelle nuove non nel vecchio', () => {
  const s = calcolaSchedaPersonaggio(dimitriNuovo({ t5: { id: 'parata-migliorata' } }), dati);
  assert.ok(s.errori.some((e) => e.campo === 'livelli[3].talentoLibero' && /è una Maestria, non un Talento Libero/.test(e.problema)));
  const s2 = calcolaSchedaPersonaggio(dimitriNuovo({ m2: { id: 'raffica-breve-migliorata' } }), dati);
  assert.ok(s2.errori.some((e) => /Raffiche Migliorate ne prende il posto/.test(e.problema)));
  // regime vecchio: Raffiche Migliorate e la Specializzazione Sport non sono fra le opzioni del livello
  const vecchio = dimitri();
  vecchio.livelli = vecchio.livelli.slice(0, 1); // 2° livello: il prossimo è il 3°, con il Talento Libero
  const pl = prossimoLivello(vecchio, dati);
  assert.ok(!pl.talentiLiberi.some((t) => t.id === 'raffiche-migliorate' || t.id === 'specializzazione-sport'));
  assert.ok(pl.talentiLiberi.some((t) => t.id === 'raffica-breve-migliorata'), 'il regime vecchio resta quello di prima');
  assert.equal(pl.maestrie, undefined);
});

test('regime vecchio: postiTalenti dice i posti nuovi (vuoti) e i Talenti di oggi con la categoria nuova', () => {
  const r = postiTalenti(dimitri(), dati);
  assert.equal(r.regime, 'vecchio');
  assert.deepEqual(Object.values(r.categorie).map((c) => [c.spettanti, c.scelti]), [[2, 0], [2, 0], [2, 0]]);
  assert.deepEqual(r.vecchi.map((v) => [v.id, v.livello, v.categoria]), [['ritualista-minore', 3, 'talento_libero'], ['ritualista-maggiore', 5, 'maestria']]);
  assert.equal(r.prossimo.livello, 1);
  assert.equal(r.prossimo.categoria, 'specializzazione');
});

test('i tre accorpati con i valori giusti, Ricarica Esperta compresa (A.182 aperta: vale la decisione 139)', () => {
  assert.deepEqual(T('raffiche-migliorate').effetti.attacco_distanza.modalita, { RB: { va: 4 }, RM: { va: 0 }, RL: { va: -4 } });
  // come le tre di prima
  for (const [id, m, va] of [['raffica-breve-migliorata', 'RB', 4], ['raffica-media-migliorata', 'RM', 0], ['raffica-lunga-migliorata', 'RL', -4]]) assert.equal(T(id).effetti.attacco_distanza.modalita[m].va, va);
  assert.equal(T('preparazione-rapida').effetti.attacco_distanza.imbracciatura.gratuita, true);
  assert.deepEqual(T('maestria-tiro-ravvicinato-migliorato').effetti.attacco_distanza.ravvicinato, { riduzione: 2, danno: 5 });
  assert.equal(T('maestria-immobilizzare-migliorato').effetti.attacco_ravvicinato.manovra.immobilizzare.danno_normale, true);
  assert.equal(T('maestria-immobilizzare-migliorato').effetti.attacco_ravvicinato.promemoria, 'immobilizzare');
  assert.doesNotMatch(T('maestria-hacker').effetti.valori[0].condizione, /una volta per sessione/i);
  assert.deepEqual(T('maestria-arti-marziali-migliorate').prerequisiti, ['capacita:arti_marziali_migliorate']);
  // Ricarica Esperta: 4 cartucce per operazione a inserimento (A.135), come Ricarica Migliorata; senza Talento 2
  const info = { singolo: true };
  assert.equal(perOperazione(info, ['ricarica-esperta'], dati), 4);
  assert.equal(perOperazione(info, ['ricarica-migliorata'], dati), 4);
  assert.equal(perOperazione(info, [], dati), 2);
  assert.match(T('ricarica-esperta').testo, /A\.182/);
  assert.ok(dati.equipaggiamento.file.munizioni.ricarica.ricarica_rapida.talenti.includes('ricarica-esperta'));
  // Arti Marziali Migliorate: accesso anche dal Talento di Classe del Lottatore
  const stato = { regime: 'nuovo', talentiLiberi: [], classi: [{ nome: 'Lottatore', talenti: [{ nome: 'Addestramento al Combattimento Senz’Armi' }] }], car: {}, addestr: { nome: 'Combattente' } };
  assert.equal(controllaSceltaTalento(stato, 'maestria', { id: 'maestria-arti-marziali-migliorate' }, dati).filter((e) => e.tipo === 'violazione').length, 0);
  assert.equal(controllaSceltaTalento({ ...stato, classi: [] }, 'maestria', { id: 'maestria-arti-marziali-migliorate' }, dati).filter((e) => e.tipo === 'violazione').length, 1);
});

test('file del personaggio: regime e Specializzazione iniziale scritti solo se ci sono', () => {
  const vecchio = dimitri();
  assert.ok(!('regimeTalenti' in JSON.parse(serializza(vecchio.creazione, { livelli: vecchio.livelli })).scelte));
  const nuovo = dimitriNuovo();
  const scritto = JSON.parse(serializza(nuovo.creazione, { livelli: nuovo.livelli })).scelte;
  assert.equal(scritto.regimeTalenti, 2);
  assert.deepEqual(scritto.specializzazioneIniziale, { id: 'specializzazione-informatica' });
  assert.equal(normalizza({ ...nuovo.creazione, regimeTalenti: 3 }, dati).scelte.regimeTalenti, null);
});

test('validatore: categoria, prerequisiti esistenti, elenco per Classe; «da definire» è un avviso, non un errore', async () => {
  const { validaDati, avvisiDati } = await import('../src/validate.js');
  assert.deepEqual(validaDati(dati), []);
  const x = structuredClone(dati);
  const t = x.talenti_liberi.talenti;
  delete t.find((y) => y.id === 'pistolero').categoria;
  t.find((y) => y.id === 'ritualista-maggiore').prerequisiti = ['ritualista-minimo'];
  delete x.specializzazioni.per_classe.Agente;
  t.find((y) => y.id === 'ricarica-esperta').da_definire = ['quante munizioni per operazione (A.182)'];
  const e = validaDati(x).map((y) => `${y.chiave}: ${y.problema}`).join('\n');
  assert.match(e, /pistolero\)\.categoria: attesa una fra talento_libero, maestria, superato/i);
  assert.match(e, /"ritualista-minimo" non è un Talento/);
  assert.match(e, /per_classe\.Agente: la Classe non ha il suo elenco/);
  assert.doesNotMatch(e, /da definire/);
  assert.ok(avvisiDati(x).some((a) => /Ricarica Esperta\).*|da definire: quante munizioni/.test(`${a.chiave} ${a.problema}`)));
  assert.equal(avvisiDati(dati).filter((a) => /da definire:/.test(a.problema)).length, 0, 'oggi nessun valore da definire');
});

test('Sali di livello nel regime nuovo: solo le categorie che spettano a quel livello (lotto 2)', async () => {
  const { passiDelLivello, validaLivello } = await import('../src/avanzamento.js');
  const tronca = (n) => { const p = dimitriNuovo(); return { ...p, livelli: p.livelli.slice(0, n - 1) }; };
  // dal 3° al 4°: Grado e Specializzazione dall'elenco della Classe; niente Maestria né Talento Libero
  const al4 = passiDelLivello(tronca(3), {}, dati).passi.map((x) => x.id);
  assert.ok(al4.includes('grado') && al4.includes('specializzazione'));
  assert.ok(!al4.includes('maestria') && !al4.includes('talento'));
  assert.ok(al4.indexOf('specializzazione') === al4.indexOf('grado') + 1, 'subito dopo il Grado');
  const pl4 = prossimoLivello(tronca(3), dati);
  assert.deepEqual(new Set(pl4.specializzazioni.Tecnomante.filter((o) => o.ammesso).map((o) => o.id)), new Set(dati.specializzazioni.per_classe.Tecnomante.filter((id) => id !== 'specializzazione-informatica')));
  // dal 5° al 6°: Caratteristiche e Maestria
  const al6 = passiDelLivello(tronca(5), {}, dati).passi.map((x) => x.id);
  assert.deepEqual(al6.filter((x) => ['caratteristiche', 'maestria', 'talento', 'specializzazione'].includes(x)), ['caratteristiche', 'maestria']);
  assert.ok(prossimoLivello(tronca(5), dati).maestrie.some((o) => o.id === 'ritualista-maggiore' && o.ammesso));
  // la voce del livello con la Maestria scelta è valida; senza, è incompleta
  const voce6 = { ...dimitriNuovo().livelli[4] };
  assert.equal(validaLivello(tronca(5), voce6, dati).filter((e) => e.tipo !== 'eccesso').length, 0);
  delete voce6.maestria;
  assert.ok(validaLivello(tronca(5), voce6, dati).some((e) => e.campo === 'maestria' && e.tipo === 'incompleto'));
  // regime vecchio: i passi di sempre
  const vecchio = dimitri();
  assert.ok(!passiDelLivello({ ...vecchio, livelli: vecchio.livelli.slice(0, 2) }, {}, dati).passi.some((x) => x.id === 'specializzazione'));
});

test('creazione: la Specializzazione del 1° livello, subito dopo la Classe, solo nel regime nuovo (A.185)', async () => {
  const { installaDomFinto } = await import('./dom-finto.js');
  installaDomFinto();
  const { PASSI } = await import('../src/ui/passi.js');
  const i = PASSI.findIndex((p) => p.titolo === 'Specializzazione');
  assert.equal(PASSI[i - 1].titolo, 'Classe');
  const p = dimitriNuovo();
  assert.equal(PASSI[i].visibile({ scelte: p.creazione }), true);
  assert.equal(PASSI[i].visibile({ scelte: { ...p.creazione, regimeTalenti: null } }), false);
  assert.equal(PASSI[i].completo({ scelte: p.creazione, dati }), true);
  assert.equal(PASSI[i].completo({ scelte: { ...p.creazione, specializzazioneIniziale: null }, dati }), false);
  assert.equal(PASSI[i].completo({ scelte: { ...p.creazione, specializzazioneIniziale: { id: 'specializzazione-spade' } }, dati }), false);
});

test('stampa: con i Talenti v1.0 tre elenchi (Talenti Liberi, Maestrie, Specializzazioni); con quelli di prima come sempre', async () => {
  const { preparaStampa } = await import('../src/stampa.js');
  const cerca = (o, k) => { if (!o || typeof o !== 'object') return null; if (k in o && 'talentiClasse' in o) return o; for (const v of Object.values(o)) { const r = cerca(v, k); if (r) return r; } return null; };
  const d = cerca(preparaStampa(dimitriNuovo(), dati, { completo: true }), 'regimeTalenti');
  assert.equal(d.regimeTalenti, 'nuovo');
  assert.deepEqual(d.talentiLiberi.filter((t) => t.categoria === 'talento_libero').map((t) => t.nome), ['Ritualista Minore', 'Buona Costituzione']);
  assert.deepEqual(d.talentiLiberi.filter((t) => t.categoria === 'maestria').map((t) => t.nome), ['Parata Istintiva', 'Ritualista Maggiore']);
  assert.deepEqual(d.specializzazioni.map((x) => [x.nome, x.livello, x.classe]), [['Specializzazione in Informatica', 1, 'Tecnomante'], ['Specializzazione in Cerimoniale', 4, 'Tecnomante']]);
  assert.equal(cerca(preparaStampa(dimitri(), dati, { completo: true }), 'regimeTalenti').regimeTalenti, 'vecchio');
  // il foglio 2: due elenchi con il regime nuovo, l'elenco unico di sempre con quello vecchio
  const ui = readFileSync(new URL('../src/ui/stampa.js', import.meta.url), 'utf8');
  assert.ok(ui.includes("d.regimeTalenti === 'nuovo'") && ui.includes("[['Talenti Liberi', 'talento_libero'], ['Maestrie', 'maestria']]"));
});

test('una scelta forzata dal Direttore avvisa e non blocca la salita di livello («Procedi comunque»)', async () => {
  const { validaLivello } = await import('../src/avanzamento.js');
  const p = dimitriNuovo({ m2: { id: 'ritualista-maggiore' }, m6: { id: 'parata-istintiva' } }); // forzata al 2°
  const senza = validaLivello(p, {}, dati);
  assert.equal(senza.length, 1);
  assert.equal(senza[0].procedibile, true);
  assert.match(senza[0].problema, /forzata dal Direttore/);
  assert.ok(!validaLivello(p, {}, dati, { procedi: true }).some((e) => /forzata dal Direttore/.test(e.problema)));
});
