// Anticipazione in «Lancia!» (Magia sez. 12.3): valore anticipato dalla scala della scheda
// (src/anticipazione.js, tools/scale_anticipazione.mjs), Talenti visibili nel riquadro, Prova più
// difficile di una categoria. Caso osservato: Lucas (Invocatore II, Incantesimi Estesi e Plurimi) con
// Armatura di Forza al livello 6 e la Durata anticipata.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaLancio } from '../src/lancio.js';
import { valoreAnticipato, normValore } from '../src/anticipazione.js';
import { applicaScale } from '../tools/scale_anticipazione.mjs';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();
const p = deserializzaPersonaggio(readFileSync(new URL('collaudo/Lucas_liv6_2026-09-28 (2).json', import.meta.url), 'utf8'));
const scheda = calcolaScheda({ creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli }, dati);
const lucas = { scheda, sessione: { pmAttuali: 99 } };
const inc = (nome) => dati.incantesimi.incantesimi.find((i) => i.nome === nome);
const aspetto = (nome, a) => inc(nome).meccanica.anticipazione.aspetti.findIndex((x) => x.nome === a);

test('Lucas: Invocatore con Incantesimi Estesi e Plurimi, livello massimo almeno 6', () => {
  const ids = scheda.talentiLiberi.map((t) => t.id);
  assert.ok(ids.includes('incantesimi-estesi') && ids.includes('incantesimi-plurimi'));
  assert.ok(scheda.incantesimi.livelloMassimo >= 6);
});

test('Armatura di Forza 6, Durata anticipata con Incantesimi Estesi: 6 PM, «Durata: 5 minuti», Prova più difficile', () => {
  const senza = calcolaLancio(lucas, inc('Armatura di Forza'), { versione: 6 }, dati);
  const r = calcolaLancio(lucas, inc('Armatura di Forza'), { versione: 6, anticipazione: aspetto('Armatura di Forza', 'Durata') }, dati);
  assert.equal(r.pm_costo, 6);
  assert.deepEqual(r.anticipazione.valore.righe, [{ colonna: 'Durata', da: '20 RND', a: '5 minuti' }]);
  assert.equal(r.anticipazione.valore.daDefinire, null);
  // Prova obbligatoria e più difficile di una categoria: −2 al livello 6 (sez. 12.3), anche con il Talento
  assert.equal(r.prova_richiesta, true);
  assert.ok(r.motivi_prova.includes('Anticipazione: la Prova è sempre obbligatoria'));
  const pen = (x) => x.provenienza.righe.find((y) => /^Livello 6/.test(y.fonte));
  assert.equal(pen(r).valore, -2);
  assert.match(pen(r).fonte, /con Anticipazione/);
  assert.equal(r.va_potere_finale, senza.va_potere_finale - 2);
  // il riquadro dice cosa vale con questi Talenti, con la fonte
  assert.deepEqual(r.anticipazione.regole.map((x) => x.testo), [
    'Incantesimi Estesi: niente raddoppio PM (6 PM).',
    'Prova obbligatoria, Potere più difficile di una categoria (Anticipazione Migliorata la eliminerebbe).',
    'Non cumulabile con Calcolo Arcano sullo stesso lancio.',
  ]);
  assert.equal(r.anticipazione.regole[0].fonte, 'Talento Incantesimi Estesi');
  // gli aspetti sono solo quelli della scheda: Incantesimi Plurimi qui non si usa, e lo si dice
  assert.equal(r.anticipazione.consentiti, 'La scheda di questo incantesimo consente: AR +1, Durata.');
  assert.deepEqual(r.anticipazione.talentiNonUsabili, ['Incantesimi Plurimi: qui non si usa, la scheda non consente di anticipare il numero di Bersagli.']);
});

test('lo stesso lancio senza il Talento: 12 PM e il riquadro con PM ×2', () => {
  const s = copia(scheda);
  s.talentiLiberi = s.talentiLiberi.filter((t) => t.id !== 'incantesimi-estesi');
  const r = calcolaLancio({ scheda: s, sessione: { pmAttuali: 99 } }, inc('Armatura di Forza'), { versione: 6, anticipazione: aspetto('Armatura di Forza', 'Durata') }, dati);
  assert.equal(r.pm_costo, 12);
  assert.equal(r.anticipazione.regole[0].testo, 'PM ×2: 6 → 12 PM.');
  assert.equal(r.anticipazione.valore.righe[0].a, '5 minuti');
});

test('AR anticipata: +1 fino al massimo della scheda (8)', () => {
  const r = calcolaLancio(lucas, inc('Armatura di Forza'), { versione: 6, anticipazione: aspetto('Armatura di Forza', 'AR +1') }, dati);
  assert.deepEqual(r.anticipazione.valore.righe, [{ colonna: 'AR magica', da: '3', a: '4' }]);
  assert.equal(r.pm_costo, 12); // l'AR non è la Durata: Incantesimi Estesi non vale
  // Pelle Corazzata: la scheda lega all'AR il ricalcolo del Passo (promemoria) e ha il massimo 9
  const pelle = inc('Pelle Corazzata');
  const ar = pelle.meccanica.anticipazione.aspetti.find((x) => x.nome === 'AR +1');
  assert.ok(ar.conseguenze.some((c) => /Se aumenta l’AR si ricalcola la penalità al Passo/.test(c)));
  const ultima = pelle.versioni.at(-1);
  assert.deepEqual(valoreAnticipato(ar, ultima, pelle.versioni).righe[0], { colonna: 'AR', da: '8', a: '9' });
});

test('Bersagli anticipati con Incantesimi Plurimi: niente raddoppio e numero nuovo', () => {
  const nome = 'Indurre Sonno';
  const v = Number(inc(nome).versioni.find((r) => r.Bersagli === '1').Livello);
  const r = calcolaLancio(lucas, inc(nome), { versione: v, anticipazione: aspetto(nome, 'Bersagli') }, dati);
  assert.equal(r.pm_costo, v);
  assert.deepEqual(r.anticipazione.valore.righe, [{ colonna: 'Bersagli', da: '1', a: '2' }]);
  assert.equal(r.anticipazione.regole[0].testo, `Incantesimi Plurimi: niente raddoppio PM (${v} PM).`);
});

test('aspetto senza scala (dati futuri): «da definire», nessun numero, con il motivo', () => {
  // dopo la A.109 nessun aspetto dei dati è senza scala: il caso resta per le schede nuove
  const x = { nome: 'Prova', scala: null, scala_motivo: 'la scheda cita l’aspetto senza scrivere la scala' };
  const v = valoreAnticipato(x, inc('Sigillo').versioni[0], inc('Sigillo').versioni);
  assert.deepEqual(v.righe, []);
  assert.match(v.daDefinire, /senza scrivere la scala/);
});

test('A.72: scale approvate (Irrobustire, Telecinesi, Illusione, Natura, Resistenza Fisica, Efficienza)', () => {
  const nome = 'Irrobustire';
  const r = calcolaLancio(lucas, inc(nome), { versione: 3, anticipazione: aspetto(nome, 'Durata') }, dati);
  assert.deepEqual(r.anticipazione.valore.righe, [{ colonna: 'Durata', da: '20 RND', a: '5 minuti' }]);
  assert.equal(r.pm_costo, 3); // Incantesimi Estesi: nessun raddoppio per la Durata
  const val = (n, a, liv) => {
    const i = inc(n);
    return valoreAnticipato(i.meccanica.anticipazione.aspetti.find((x) => x.nome === a), i.versioni.find((v) => String(Object.values(v)[0]) === String(liv)), i.versioni);
  };
  assert.deepEqual(val('Irrobustire', 'PV temporanei', 18).righe[0], { colonna: 'PV temporanei ciascuno', da: '24', a: '28' });
  // Telecinesi: Concentrazione oppure durata fissa, una sola
  assert.deepEqual(val('Telecinesi', 'Durata', 6).righe.map((x) => [x.colonna, x.da, x.a]), [['Concentrazione', '1 ora', '2 ore'], ['Durata fissa', '5 minuti', '10 minuti']]);
  assert.deepEqual(val('Telecinesi', 'Durata', 18).righe.map((x) => x.a), ['24 ore', '4 ore']);
  // Illusione: dalla versione 9 la complessità è al massimo
  assert.equal(val('Illusione', 'Complessità', 3).righe[0].a, 'immagine complessa statica');
  assert.match(val('Illusione', 'Complessità', 12).righe[0].nota, /massimo/);
  assert.equal(val('Mente Disincarnata', 'Distanza dal corpo', 12).righe[0].a, '6 km');
  assert.equal(val('Cono Elementale', 'Natura del danno', 9).righe[0].a, 'Etereo');
  assert.match(val('Armatura Elementale', 'Natura del danno reattivo', 3).righe[0].nota, /Naturale → Magico → Etereo/);
  // una sola parte della colonna doppia
  assert.deepEqual(val('Resistenza Fisica', 'Bonus Tempra +1', 1).righe.map((x) => x.a), ['+2 / +3', '+1 / +4']);
  assert.equal(val('Efficienza', 'VA degli attacchi +1', 6).righe[0].a, '+2 / +2');
  assert.equal(val('Efficienza', 'Danno +1', 6).righe[0].a, '+1 / +3');
});

test('scale dei dati: generate dal testo e coerenti con lo strumento; normalizzazione dei valori', () => {
  assert.equal(normValore('20 RND'), normValore('20 rnd'));
  assert.equal(normValore('5 minuti'), normValore('5 min'));
  assert.equal(normValore('3Q'), normValore('3 Q'));
  assert.equal(normValore('−2'), normValore('-2'));
  // rigenerare le scale dai dati attuali non cambia nulla (lo strumento è stato rilanciato)
  const d = copia(dati.incantesimi);
  const r = applicaScale(d);
  assert.deepEqual(d, dati.incantesimi);
  assert.equal(r.aspetti, r.conScala + r.daDefinire.length);
});

// A.109 (risposta di Davide dell'08/10/2026, decisione 154): i 32 aspetti che restavano «da definire al tavolo»
const gradino = (nome, a, liv) => {
  const i = inc(nome);
  const v = i.versioni.find((r) => String(Object.values(r)[0]).trim() === String(liv));
  return valoreAnticipato(i.meccanica.anticipazione.aspetti[aspetto(nome, a)], v, i.versioni);
};
const daA = (nome, a, liv) => gradino(nome, a, liv).righe.map((r) => `${r.da}→${r.a}`).join(' | ');

test('A.109: nessun aspetto resta «da definire al tavolo»; i 32 hanno approvata «A.109» e niente TODO', () => {
  const a109 = [];
  for (const i of dati.incantesimi.incantesimi) for (const a of i.meccanica.anticipazione?.aspetti ?? []) {
    assert.ok(a.scala, `${i.nome} / ${a.nome}: senza scala`);
    assert.equal(a['TODO(Davide)'], undefined, `${i.nome} / ${a.nome}: TODO rimasto`);
    if (a.scala.approvata === 'A.109') a109.push(`${i.nome} / ${a.nome}`);
  }
  assert.equal(a109.length, 32);
});

test('A.109, elementi (Muro, Esplosione, Cono): +1 in «Elementi max», massimo 3', () => {
  for (const n of ['Muro Elementale', 'Esplosione Elementale', 'Cono Elementale']) {
    assert.equal(daA(n, 'Numero di elementi', 6), '1→2');
    assert.equal(daA(n, 'Numero di elementi', 9), '2→3');
    assert.equal(daA(n, 'Numero di elementi', 18), '3→3');
  }
});

test('A.109, scale senza colonna (Armatura e Devastazione: elementi e Mod. PS; Presenza: precisione): un passaggio dal valore attuale', () => {
  const r = gradino('Armatura Elementale', 'Numero di elementi', 9).righe[0];
  assert.equal(r.a, 'gradino successivo');
  assert.match(r.nota, /1 → 2 → 3.*massimo 3/);
  assert.match(gradino('Devastazione Elementale', 'Elemento +1', 12).righe[0].nota, /massimo 3/);
  assert.match(gradino('Devastazione Elementale', 'Mod. PS', 12).righe[0].nota, /−2 → −4 → −6.*massimo −6/);
  assert.match(gradino('Presenza', 'Precisione del numero', 3).righe[0].nota, /Approssimata → Generica → Precisa → Esatta/);
});

test('A.109, Mod. PS a scalini di −2 (Armatura per versione, Catene, Terrore a scelta)', () => {
  assert.deepEqual([3, 9, 15].map((l) => daA('Armatura Elementale', 'Mod. PS', l)), ['0→−2', '−2→−4', '−4→−6']);
  assert.deepEqual([3, 9, 18].map((l) => daA('Catene di Forza', 'Tempra per liberarsi e Riflessi per mantenere l’equilibrio', l)), ['0→−2', '−2→−4', '−4→−6']);
  assert.equal(daA('Terrore', 'PS della modalità −2', 15), '−6→−8 | −4→−6');
  assert.ok(gradino('Terrore', 'PS della modalità −2', 15).righe.every((r) => /una sola/.test(r.nota)));
});

test('A.109, gradini per versione (Piattaforma, Alterare Immagine, Presenza, Cura Spirituale, Nascondere Aura, Individuare)', () => {
  assert.deepEqual([3, 6, 12, 18].map((l) => daA('Piattaforma Levitante', 'Dimensioni', l)), ['1×1 Q→2×1 Q', '2×1 Q→2×2 Q', '2×2 Q→3×2 Q', '3×3 Q→4×3 Q']);
  const ai = 'Capacità volto generico → identità precisa → voce e postura → equipaggiamento';
  assert.deepEqual([1, 3, 6].map((l) => daA('Alterare Immagine', ai, l)), ['volto generico→identità precisa', 'identità precisa→voce e postura', 'voce e postura→equipaggiamento']);
  assert.equal(daA('Alterare Immagine', ai, 9), 'capacità massima→capacità massima');
  assert.equal(gradino('Presenza', 'Profondità delle informazioni', 9).righe[0].a, '+ Classe predominante');
  assert.match(gradino('Presenza', 'Profondità delle informazioni', 18).righe[0].nota, /già al massimo/);
  assert.match(gradino('Cura Spirituale', 'Gruppo di capacità', 3).righe[0].a, /Stordito, Svenuto e Paralizzato/);
  assert.match(gradino('Cura Spirituale', 'Gruppo di capacità', 6).righe[0].nota, /già massime/);
  assert.deepEqual([3, 18].map((l) => daA('Nascondere Aura', 'Potere di Occultamento', l)), ['3→6', '18→21']);
  assert.equal(daA('Individuare', 'Informazioni della soglia successiva', 10), 'soglia 9→soglia 12 in una sola categoria scelta');
  assert.match(gradino('Individuare', 'Informazioni della soglia successiva', 18).righe[0].nota, /già al massimo/);
});

test('A.109, capacità che si aggiungono (Marchio Psichico, Sigillo Avviso e Blocco, Luce Mistica, Premonizione scelta)', () => {
  assert.equal(daA('Marchio Psichico', 'Entrambe le modalità', 6), 'una modalità→Tracciamento e Combattimento insieme');
  assert.match(gradino('Marchio Psichico', 'Beneficiario: un alleato', 9).righe[0].a, /un alleato consenziente/);
  assert.equal(daA('Sigillo', 'Avviso e Blocco insieme', 3), 'Avviso o Blocco→Avviso e Blocco insieme');
  assert.match(gradino('Sigillo', 'Avviso e Blocco insieme', 6).righe[0].nota, /già ordinaria/);
  assert.equal(daA('Luce Mistica', 'Sorgente su un oggetto', 1), 'sorgente sul Taumaturgo→sorgente su un oggetto toccato al lancio');
  const pr = 'Possibilità di scegliere il risultato preferito già ai livelli 6 o 9';
  assert.equal(daA('Premonizione', pr, 9), 'il risultato del ritiro→a scelta fra i due risultati');
  assert.match(gradino('Premonizione', pr, 12).righe[0].nota, /già ordinaria/);
});

test('A.109, incrementi in colonna (Psicometria, Sesto Senso, Sigilli, Trappole, Interferenza, Utilizzi)', () => {
  assert.deepEqual([3, 18].map((l) => daA('Psicometria', 'Impressioni +1', l)), ['2→3', '10→11']);
  assert.equal(daA('Sesto Senso', 'Difesa automatica totale +1', 12), '2→3');
  assert.equal(daA('Sigillo', 'Sigilli +1', 15), '3→4');
  assert.equal(daA('Trappola Mistica', 'Trappole +1', 9), '2→3');
  assert.match(gradino('Trappola Mistica', 'Trappole +1', 9).righe[0].nota, /SAG/);
  assert.deepEqual([1, 15].map((l) => daA('Trappola Mistica', 'Interferenza −1', l)), ['−2→−3', '−4→−5']);
  assert.deepEqual([6, 18].map((l) => daA('Premonizione', 'Utilizzi +1', l)), ['3→4', '6→7']);
});

test('A.109, scale di valori (Cura Malattie e Avvelenamenti, Recupero Rapido, Scarica, Livello caricabile)', () => {
  for (const n of ['Cura Malattie', 'Cura Avvelenamenti']) {
    assert.equal(daA(n, 'Pericolosità', 1), 'I • Superficiale→II • Importante');
    assert.equal(daA(n, 'Pericolosità', 9), 'VI • Mortale→VI • Mortale');
  }
  assert.deepEqual([3, 12, 15].map((l) => daA('Recupero Rapido', 'Menomazioni trattate', l)), ['1→2', '3→Tutte temporanee', 'Tutte temporanee→Tutte temporanee']);
  assert.equal(daA('Trappola Mistica', 'Danno proprio', 6), '2d6+2→3d6+3');
  assert.match(gradino('Trappola Mistica', 'Livello massimo caricabile', 3).righe[0].nota, /non acquisiscono/);
  assert.equal(daA('Trappola Mistica', 'Livello massimo caricabile', 9), 'livello 6→livello 9');
});

test('A.109 in «Lancia!»: Lucas, Esplosione Elementale 6 con «Numero di elementi»: Prova obbligatoria, 1→2 elementi', () => {
  const m = inc('Esplosione Elementale');
  const r = calcolaLancio(lucas, m, { versione: 6, anticipazione: aspetto('Esplosione Elementale', 'Numero di elementi') }, dati);
  const senza = calcolaLancio(lucas, m, { versione: 6 }, dati);
  assert.equal(r.anticipazione.valore.daDefinire, null);
  assert.equal(r.anticipazione.valore.righe[0].a, '2');
  assert.equal(r.prova_richiesta, true);
  assert.ok(r.pm_costo >= senza.pm_costo);
});
