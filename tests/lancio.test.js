// Utility «Lancia un incantesimo» (src/lancio.js; Magia sez. 1–3, 5–7, 12.3; Giocatore §1.4, §1.7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaLancio, versioniLancio, contenitoriLancio } from '../src/lancio.js';
import { calcolaScheda } from '../src/calc.js';
import { datiReali } from './helpers.js';
import { ARCANISTA } from './personaggi.js';

const { dati } = await datiReali();
const inc = (nome) => dati.incantesimi.incantesimi.find((i) => i.nome === nome);
const talentoClasse = (classe, nome) => { const c = dati.classi.classi.find((x) => x.nome === classe); return [...c.talenti_fissi, ...c.talenti_a_scelta].find((t) => t.nome === nome); };

// scheda di prova: Potere 10, livello massimo 9, scala del Taumaturgo
const contenitore = (uid, colore, energiaNome, macro, pm = 5, extra = {}) => ({
  uid, nome: `Batteria ${colore}`, energia: colore, energiaNome, macrofamiglie: macro, capacita: 5, trasportato: true, sintonizzato: true, ...extra, _pm: pm,
});
const pg = ({ classe = [], liberi = [], scala = 'taumaturgo', max = 9, magia = {}, contenitori = [], pmAttuali = 20, potere = 10 } = {}) => ({
  scheda: {
    abilita: [
      { nome: 'Potere', effettivo: potere, scomposizione: [{ etichetta: 'Valore da regole', valore: potere, fonte: 'regole' }] },
      { nome: 'Armi da lancio', effettivo: 5 }, { nome: 'Corpo a corpo', effettivo: 4 },
    ],
    incantesimi: { livelloMassimo: max, scalaPotere: scala },
    magia: { focalizzazioneVa: 4, penalitaIngaggio: -2, tiroArmiDaLancio: 2, ...magia },
    equipaggiamento: { contenitori },
    talentiLiberi: liberi.map((id) => ({ id })),
    classi: [{ talenti: classe }],
  },
  sessione: { pmAttuali, chroma: Object.fromEntries(contenitori.map((c) => [c.uid, { pmAttuali: c._pm }])) },
});
const lancia = (p, nome, d) => calcolaLancio(p, inc(nome), d, dati);
const ARMONIZZAZIONE = talentoClasse('Arcanista', 'Armonizzazione Arcana');
const ARCHITETTO = talentoClasse('Arcanista', 'Architetto Arcano');

test('Irrobustire livello 3 con Arcanista: Armonizzazione Arcana → 2 PM; nessuna Prova', () => {
  const r = lancia(pg({ classe: [ARMONIZZAZIONE] }), 'Irrobustire', { versione: 3 });
  assert.equal(r.pm_costo, 2);
  assert.deepEqual(r.costo.map((c) => [c.etichetta, c.valore]), [['Versione di livello 3', 3], ['Armonizzazione Arcana', -1]]);
  assert.equal(r.prova_richiesta, false);
  assert.equal(r.impossibile, null);
  assert.deepEqual(r.fonte_pm, { personali: 2, contenitore: null });
  // livello 1: Armonizzazione non scende sotto 1 PM
  assert.equal(lancia(pg({ classe: [ARMONIZZAZIONE] }), 'Irrobustire', { versione: 1 }).pm_costo, 1);
});

test('livello 6 con Anticipazione: 12 PM, Potere −2; con Architetto Arcano 0 (sez. 12.3)', () => {
  const r = lancia(pg(), 'Irrobustire', { versione: 6, anticipazione: 0 });
  assert.equal(r.pm_costo, 12);
  assert.equal(r.prova_richiesta, true);
  assert.ok(r.motivi_prova.some((m) => m.startsWith('Anticipazione')));
  assert.deepEqual(r.provenienza.righe.slice(1).map((x) => [x.fonte, x.valore, x.paragrafo]), [['Livello 6, con Anticipazione (Taumaturgo)', -2, 'Magia sez. 12.3']]);
  assert.equal(r.va_potere_finale, 8);
  // provenienza (src/provenienza.js): VA Potere con il dettaglio, poi le voci del lancio; la somma è il VA
  assert.equal(r.provenienza.righe.filter((x) => !x.escluso).reduce((s, x) => s + x.valore, 0), r.va_potere_finale);
  assert.equal(r.provenienza.righe[0].fonte, 'VA Potere');
  const a = lancia(pg({ classe: [ARMONIZZAZIONE, ARCHITETTO] }), 'Irrobustire', { versione: 6, anticipazione: 0 });
  assert.equal(a.va_potere_finale, 10);
  assert.equal(a.pm_costo, 11); // raddoppio, poi Armonizzazione −1
  // Anticipazione Migliorata: niente categoria in più (livello 6: 0); Incantesimi Estesi sulla durata: niente raddoppio
  const m = lancia(pg({ liberi: ['anticipazione-migliorata', 'incantesimi-estesi'] }), 'Irrobustire', { versione: 6, anticipazione: 1 });
  assert.deepEqual([m.va_potere_finale, m.pm_costo, m.prova_richiesta], [10, 6, true]);
});

test('Usufruitore di Magia, livello 2: Prova richiesta, scala «altri utilizzatori»', () => {
  const r = lancia(pg({ scala: 'altri_utilizzatori', max: 3 }), 'Irrobustire', { versione: 2 });
  assert.equal(r.prova_richiesta, true);
  assert.match(r.motivi_prova[0], /senza l’Addestramento Taumaturgo/);
  assert.equal(r.va_potere_finale, 10);
  // oltre il livello massimo: impossibile
  assert.match(lancia(pg({ scala: 'altri_utilizzatori', max: 3 }), 'Irrobustire', { versione: 4 }).impossibile.motivo, /oltre il tuo livello massimo \(3\)/);
  // «altri utilizzatori» con Anticipazione al livello 4: −2 → −4
  assert.equal(lancia(pg({ scala: 'altri_utilizzatori', max: 6 }), 'Irrobustire', { versione: 4, anticipazione: 0 }).va_potere_finale, 6);
});

test('Ingaggio: −2 e Prova obbligatoria; con Lancio in Combattimento 0 ma la Prova resta', () => {
  const r = lancia(pg(), 'Irrobustire', { versione: 1, ingaggio: true });
  assert.deepEqual([r.prova_richiesta, r.va_potere_finale], [true, 8]);
  const l = lancia(pg({ magia: { penalitaIngaggio: 0 } }), 'Irrobustire', { versione: 1, ingaggio: true });
  assert.deepEqual([l.prova_richiesta, l.va_potere_finale], [true, 10]);
  assert.ok(l.promemoria.some((p) => p.startsWith('Lancio in Combattimento elimina')));
});

test('componenti mancanti: −2 ciascuna fino a −6, Prova obbligatoria; Escludere il Focus; voce obbligatoria', () => {
  const r = lancia(pg(), 'Irrobustire', { versione: 1, componentiMancanti: ['focus', 'gesto'] });
  assert.deepEqual([r.prova_richiesta, r.va_potere_finale], [true, 6]);
  assert.equal(r.provenienza.righe.at(-1).fonte, 'Componenti mancanti: Focus, Gesto');
  const tre = lancia(pg(), 'Irrobustire', { versione: 1, componentiMancanti: ['focus', 'gesto', 'invocazione'] });
  assert.equal(tre.va_potere_finale, 4); // −6, il massimo
  const esc = lancia(pg({ liberi: ['escludere-il-focus'] }), 'Irrobustire', { versione: 1, componentiMancanti: ['focus'] });
  assert.deepEqual([esc.prova_richiesta, esc.va_potere_finale], [false, 10]);
  assert.match(lancia(pg(), 'Comando', { versione: 1, componentiMancanti: ['invocazione'] }).impossibile.motivo, /vocale di questo incantesimo è obbligatoria/);
});

test('contenitore Rosso con un incantesimo Mentale: non ammesso; misto personali + contenitore', () => {
  const rosso = contenitore('r', 'Rosso', 'Fisica', ['Fisica']);
  const blu = contenitore('b', 'Blu', 'Mentale', ['Mentale'], 3);
  const p = pg({ contenitori: [rosso, blu], pmAttuali: 10 });
  const c = contenitoriLancio(p, inc('Dardo Psichico'));
  assert.match(c.find((x) => x.uid === 'r').motivo, /non compatibile con un incantesimo Mentale/);
  assert.equal(c.find((x) => x.uid === 'b').motivo, null);
  assert.match(lancia(p, 'Dardo Psichico', { versione: 3, fonte: 'contenitore', contenitore: 'r' }).impossibile.motivo, /non compatibile/);
  // misto: 3 PM dalla batteria Blu, 2 personali
  const m = lancia(p, 'Dardo Psichico', { versione: 5, fonte: 'misto', contenitore: 'b', quotaContenitore: 3 });
  assert.deepEqual(m.fonte_pm, { personali: 2, contenitore: { uid: 'b', nome: 'Batteria Blu', pm: 3 } });
  assert.equal(m.impossibile, null);
  // il contenitore non basta da solo
  assert.match(lancia(p, 'Dardo Psichico', { versione: 5, fonte: 'contenitore', contenitore: 'b' }).impossibile.motivo, /3 PM, ne servono 5/);
  // non sintonizzato
  const ns = pg({ contenitori: [contenitore('b', 'Blu', 'Mentale', ['Mentale'], 5, { sintonizzato: false })] });
  assert.match(lancia(ns, 'Dardo Psichico', { versione: 2, fonte: 'contenitore', contenitore: 'b' }).impossibile.motivo, /non sintonizzato/);
});

test('PM personali: insufficienti → impossibile; a 0 dopo il lancio → promemoria dello svenimento', () => {
  assert.match(lancia(pg({ pmAttuali: 2 }), 'Irrobustire', { versione: 3 }).impossibile.motivo, /PM personali insufficienti: 2, ne servono 3/);
  assert.ok(lancia(pg({ pmAttuali: 3 }), 'Irrobustire', { versione: 3 }).promemoria.some((p) => p.includes('sviene')));
});

test('cumulo della sez. 7: Benedizione +2 e Barriera +4 → solo +4; la penalità magica maggiore', () => {
  const r = lancia(pg(), 'Irrobustire', { versione: 4, effettiMagici: [{ nome: 'Benedizione', valore: 2 }, { nome: 'Barriera Mentale', valore: 4 }, { nome: 'Silenzio', valore: -3 }, { nome: 'Interferenza', valore: -4 }] });
  assert.deepEqual(r.cumulo.applicati.map((e) => e.nome), ['Barriera Mentale', 'Interferenza']);
  assert.equal(r.va_potere_finale, 10 + 4 - 4);
  assert.ok(r.promemoria.some((p) => p.startsWith('Cumulo (sez. 7): Benedizione +2, Silenzio -3 non si applica')));
});

test('esempio della sez. 7: Potere 14, livello 9, Silenzio −3, interferenza −4, Benedizione +2 → VA 10', () => {
  const r = lancia(pg({ potere: 14 }), 'Irrobustire', { versione: 9, effettiMagici: [{ nome: 'Silenzio', valore: -3 }, { nome: 'Interferenza', valore: -4 }, { nome: 'Benedizione', valore: 2 }] });
  assert.equal(r.va_potere_finale, 10);
});

test('Focalizzazione +4 solo se serve la Prova; circostanza; VA ≤ 0 impossibile (§1.7)', () => {
  assert.equal(lancia(pg(), 'Irrobustire', { versione: 4, focalizzazione: true, circostanza: -2 }).va_potere_finale, 12);
  const auto = lancia(pg(), 'Irrobustire', { versione: 1, focalizzazione: true });
  assert.equal(auto.prova_richiesta, false);
  assert.ok(auto.promemoria.includes('Se non serve Potere, non produce un vantaggio.'));
  assert.match(lancia(pg({ potere: 2 }), 'Irrobustire', { versione: 9, circostanza: -2 }).impossibile.motivo, /Giocatore §1\.7/);
});

test('tiro per colpire (Armi da lancio +2), contatto (Corpo a corpo +4) e Salvezza del bersaglio', () => {
  const e = lancia(pg(), 'Esplosione Elementale', { versione: 3 });
  assert.deepEqual(e.tiro_per_colpire, { abilita: 'Armi da lancio', va: 7, bonus: 2 });
  assert.deepEqual([lancia(pg({ magia: { tiroArmiDaLancio: 4 } }), 'Esplosione Elementale', { versione: 3 }).tiro_per_colpire.va], [9]);
  const c = lancia(pg(), 'Irrobustire', { versione: 1 });
  assert.deepEqual([c.contatto.abilita, c.contatto.va], ['Corpo a corpo', 8]);
  assert.equal(lancia(pg(), 'Irrobustire', { versione: 6 }).contatto, null); // gittata 3Q
  const d = lancia(pg({ liberi: ['incantesimi-inarrestabili'] }), 'Dardo Psichico', { versione: 1 });
  assert.deepEqual([d.salvezza_bersaglio.tipi, d.salvezza_bersaglio.talento.valore], [['Volontà'], -1]);
});

test('personaggio reale: Arcanista al 1° livello, Potere effettivo della scheda e versioni oltre il massimo', () => {
  const scheda = calcolaScheda({ creazione: ARCANISTA, livelli: [] }, dati);
  const p = { scheda, sessione: { pmAttuali: scheda.pm, chroma: {} } };
  const v = versioniLancio(inc('Irrobustire'), scheda);
  assert.deepEqual(v.filter((x) => !x.motivo).map((x) => x.livello), [1, 2, 3]);
  const r = calcolaLancio(p, inc('Irrobustire'), { versione: 3 }, dati);
  assert.equal(r.pm_costo, 2); // Armonizzazione Arcana dell'Arcanista
  assert.equal(r.va_potere_finale, scheda.abilita.find((a) => a.nome === 'Potere').effettivo);
});
