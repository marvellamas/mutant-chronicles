import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validaDati, formattaErrore, trovaTodo, avvisiDati } from '../src/validate.js';
import { caricaDati } from '../src/rules.js';
import { datiReali, leggiDaDisco, copia } from './helpers.js';

const { dati, errori } = await datiReali();

test('i dati reali passano validaDati senza errori', () => {
  assert.deepEqual(errori.map(formattaErrore), []);
});

test('ogni file dati riporta versione_manuale', () => {
  for (const [file, contenuto] of Object.entries(dati)) {
    assert.ok(contenuto.versione_manuale, `${file}.json senza versione_manuale`);
  }
});

test('conteggi attesi: 6 Caratteristiche, 24 Abilità, 7 Corporazioni, 5 Addestramenti, 25 Classi, 90 incantesimi', () => {
  assert.equal(dati.caratteristiche.caratteristiche.length, 6);
  assert.equal(dati.abilita.abilita.length, 24);
  assert.equal(dati.corporazioni.corporazioni.length, 7);
  assert.equal(dati.addestramenti.addestramenti.length, 5);
  assert.equal(dati.classi.classi.length, 25);
  assert.equal(dati.incantesimi.incantesimi.length, 90);
  for (const a of dati.addestramenti.addestramenti) {
    assert.equal(dati.classi.classi.filter((c) => c.addestramento === a.nome).length, 5, a.nome);
  }
});

test('i TODO(Davide) sono elencabili', () => {
  const todo = trovaTodo(dati);
  // descrizioni delle Caratteristiche: date dal master il 26/09/2026
  assert.equal(todo.some((t) => t.percorso.startsWith('caratteristiche.json')), false);
  // Talenti di magia e tipo di tre Talenti Liberi: decisi dal master il 26/09/2026
  assert.equal(todo.some((t) => t.percorso.startsWith('talenti_liberi.json')), false);
  // chiusi dalle risposte del master (docs/risposte-master.md)
  assert.equal(todo.some((t) => t.percorso.startsWith('classi.json')), false);
  // in regole.json restano solo le domande sugli effetti degli Stati (§5.18, per-davide A.16–A.17),
  // sul contenitore nuovo (Chroma, A.19), sul carico (pesi e oltre il massimo, A.30–A.31) e sull'Anticipazione
  // senza Addestramento (A.39) e sul corpo a corpo (A.22–A.29)
  assert.deepEqual([...new Set(todo.filter((t) => t.percorso.startsWith('regole.json')).map((t) => t.percorso.split('.TODO')[0]))].sort(), [
    'regole.json.attacco_ravvicinato.circostanze', 'regole.json.attacco_ravvicinato.copertura', 'regole.json.attacco_ravvicinato.magistrale',
    'regole.json.attacco_ravvicinato.mano_non_dominante', 'regole.json.attacco_ravvicinato.manovre.disarmare', 'regole.json.attacco_ravvicinato.manovre.incalzare',
    'regole.json.attacco_ravvicinato.manovre.sbilanciare', 'regole.json.attacco_ravvicinato.manovre.spazzata', 'regole.json.attacco_ravvicinato.senz_armi',
    'regole.json.carico', 'regole.json.chroma', 'regole.json.lancio.anticipazione', 'regole.json.stati',
  ]);
  // durate delle Tecniche Interiori: decise dal master il 26/09/2026 (A.4 del Doc E&L)
  assert.equal(todo.some((t) => t.percorso.startsWith('tecniche_interiori.json')), false);
});

test('risposte del master: Specializzazioni dei Talenti dell’Esploratore', () => {
  const e = dati.classi.classi.find((c) => c.nome === 'Esploratore');
  assert.deepEqual(Object.fromEntries(e.talenti_a_scelta.map((t) => [t.nome, t.specializzazione])), {
    'Segni di Passaggio': 'Terrestre', 'Adattamento Estremo': 'Terrestre',
    'Mappa Mentale': 'Spaziale', 'Rotta Alternativa': 'Spaziale', 'Avanguardia': 'Comune',
  });
});

// --- il validatore trova gli errori e dice dove -------------------------------------------

function erroriDopo(modifica) {
  const d = copia(dati);
  modifica(d);
  return validaDati(d);
}

test('validatore: Addestramento con somma o distribuzione sbagliata', () => {
  const e = erroriDopo((d) => { d.addestramenti.addestramenti[0].valori_base['Furtività'] = 3; });
  assert.ok(e.some((x) => x.file === 'addestramenti.json' && x.chiave.includes('Avventuriero') && /somma è 47/.test(x.problema)));
  assert.ok(e.some((x) => /distribuzione/.test(x.problema)));
});

test('validatore: Addestramento con Abilità mancante o inesistente', () => {
  const e = erroriDopo((d) => {
    const vb = d.addestramenti.addestramenti[1].valori_base;
    vb['Furtivita'] = vb['Furtività'];
    delete vb['Furtività'];
  });
  assert.ok(e.some((x) => /"Furtivita" non è un'Abilità/.test(x.problema)));
  assert.ok(e.some((x) => /manca l'Abilità "Furtività"/.test(x.problema)));
});

test('validatore: Corporazione con Caratteristica fuori scala, Abilità inesistente, Salvezza non 0/1', () => {
  const e = erroriDopo((d) => {
    const c = d.corporazioni.corporazioni[0];
    c.caratteristiche.FOR = 11;
    c.abilita_bonus[0] = 'Cucina';
    c.salvezze.tempra = 2;
  });
  assert.ok(e.some((x) => x.chiave.endsWith('caratteristiche.FOR')));
  assert.ok(e.some((x) => /"Cucina"/.test(x.problema)));
  assert.ok(e.some((x) => x.chiave.endsWith('salvezze.tempra')));
});

test('validatore: Classe con Addestramento inesistente, Abilità ripetute, Talenti mancanti', () => {
  const e = erroriDopo((d) => {
    const c = d.classi.classi[0];
    c.addestramento = 'Pirata';
    c.abilita[1] = c.abilita[0];
    c.talenti_a_scelta.pop();
    c.talenti_fissi[2].grado = 6;
  });
  const k = (x) => x.file === 'classi.json' && x.chiave.includes('Agente');
  assert.ok(e.some((x) => k(x) && /"Pirata"/.test(x.problema)));
  assert.ok(e.some((x) => k(x) && /ripetute/.test(x.problema)));
  assert.ok(e.some((x) => k(x) && /5 Talenti a scelta, trovati 4/.test(x.problema)));
  assert.ok(e.some((x) => k(x) && /Gradi 1, 3, 5/.test(x.problema)));
});

test('validatore: Abilità con Caratteristica inesistente', () => {
  const e = erroriDopo((d) => { d.abilita.abilita[0].caratteristica = 'FORZA'; });
  assert.ok(e.some((x) => x.file === 'abilita.json' && /"FORZA"/.test(x.problema)));
});

test('validatore: incantesimi non distribuiti 4/3/2/1 per specializzazione', () => {
  const e = erroriDopo((d) => { d.incantesimi.incantesimi[0].livello_base = 3; });
  assert.ok(e.some((x) => x.chiave === 'Fisica / Elementi' && /livello base 1, trovati 3/.test(x.problema)));
});

test('caricaDati: un JSON rotto produce un errore leggibile, non un crash', async () => {
  const leggi = (nome) => (nome === 'abilita' ? Promise.resolve('{ "versione_manuale": ') : leggiDaDisco(nome));
  const { errori: e } = await caricaDati(leggi);
  assert.ok(e.some((x) => x.file === 'abilita.json' && /JSON non valido/.test(x.problema)));
});

test('validaDati non lancia eccezioni su dati vuoti o assurdi', () => {
  assert.doesNotThrow(() => validaDati({}));
  assert.doesNotThrow(() => validaDati(null));
  assert.doesNotThrow(() => validaDati({ classi: { versione_manuale: 'x', classi: [null, 3, {}] } }));
});

// --- cap. 8: Talenti Liberi, Specializzazioni, Tecniche Interiori, avanzamento ---------------

test('conteggi del cap. 8: 87 Talenti del §8.6 + 32 Talenti magici e mistici, 84 Specializzazioni, 28 Tecniche', () => {
  const t = dati.talenti_liberi.talenti;
  assert.equal(t.filter((x) => x.sezione.startsWith('8.6')).length, 87);
  const magia = t.filter((x) => x.sezione === 'magia');
  // 14 schede approvate dal master il 26/09 + 18 nuove del Google Doc del 27/09 (Giocatore §8.6.8: «I 32 Talenti magici e mistici»)
  assert.equal(magia.length, 32);
  assert.ok(magia.some((x) => x.id === 'potere-mistico') && magia.some((x) => x.id === 'ritualista-maggiore'));
  assert.ok(magia.some((x) => x.id === 'contromagia-universale') && magia.some((x) => x.id === 'magia-occultata'));
  assert.ok(magia.every((x) => !x.provvisorio && Array.isArray(x.prerequisiti) && ['passivo', 'attivo'].includes(x.tipo)));
  assert.ok(t.every((x) => ['passivo', 'attivo'].includes(x.tipo)));
  assert.equal(dati.specializzazioni.specializzazioni.length, 84);
  assert.equal(dati.tecniche_interiori.tecniche.length, 28);
  assert.equal(dati.regole.avanzamento.eventi.length, 20);
});

test('Talenti con effetti sulla scheda', () => {
  const eff = Object.fromEntries(dati.talenti_liberi.talenti.filter((x) => x.effetti).map((x) => [x.id, x.effetti]));
  assert.deepEqual(eff['iniziativa-migliorata'], { iniziativa: 3 });
  assert.deepEqual(eff['buona-costituzione'], { pv: 5 });
  assert.deepEqual(eff['prova-salvezza-migliorata'], { salvezza: 1 });
  assert.equal(eff['usufruitore-di-magia'].accessoMagia, true);
  assert.equal(eff['usufruitore-di-magia'].livelloMax, 3);
  assert.deepEqual(eff['incrementare-incantesimi'], { incantesimi: 2 });
  assert.deepEqual(eff['potenziale-mistico-migliorato'], { livelloMaxIncantesimi: 3 });
  const ri = dati.talenti_liberi.talenti.find((x) => x.id === 'risorse-interiori');
  assert.deepEqual(ri.incompatibile_con, ['addestramento:taumaturgo', 'classi:taumaturgiche', 'talenti:accesso_magia']);
});

test('validatore: prerequisito inesistente, id duplicato, molteplicità incoerente', () => {
  const e = erroriDopo((d) => {
    const t = d.talenti_liberi.talenti;
    t.find((x) => x.id === 'parata-multipla').prerequisiti = ['parata-istintivaa'];
    t.find((x) => x.id === 'ambidestro').id = 'sempre-allerta';
    t.find((x) => x.id === 'prova-salvezza-migliorata').parametro = null;
  });
  assert.ok(e.some((x) => x.file === 'talenti_liberi.json' && /"parata-istintivaa" non è un Talento/.test(x.problema)));
  assert.ok(e.some((x) => /id "sempre-allerta" duplicato/.test(x.problema)));
  assert.ok(e.some((x) => x.chiave.includes('Prova Salvezza Migliorata') && /parametro/.test(x.chiave)));
});

test('validatore: tabella degli eventi con un buco e fasce che non coprono i 20 livelli', () => {
  const e = erroriDopo((d) => {
    d.regole.avanzamento.eventi = d.regole.avanzamento.eventi.filter((x) => x.livello !== 7);
    d.regole.avanzamento.massimo_caratteristica.pop();
    d.regole.avanzamento.eventi.find((x) => x.livello === 11).eventi = ['talento_libero'];
  });
  assert.ok(e.some((x) => x.file === 'regole.json' && /il livello 7 deve comparire una volta, compare 0/.test(x.problema)));
  assert.ok(e.some((x) => x.chiave === 'avanzamento.massimo_caratteristica' && /arrivare al livello 20/.test(x.problema)));
  assert.ok(e.some((x) => /al livello 11 gli eventi danno Salvezze \+1, la tabella/.test(x.problema)));
});

test('validatore: Specializzazione con Abilità inesistente, Tecnica senza costo', () => {
  const e = erroriDopo((d) => {
    d.specializzazioni.specializzazioni[30].abilita = ['Cucina'];
    d.tecniche_interiori.tecniche[0].costo = '';
  });
  assert.ok(e.some((x) => x.file === 'specializzazioni.json' && /"Cucina"/.test(x.problema)));
  assert.ok(e.some((x) => x.file === 'tecniche_interiori.json' && x.chiave.endsWith('.costo')));
});

test('avvisi (non bloccanti): nessun Talento provvisorio o di tipo da definire, nessuna durata di Tecnica da definire', () => {
  const t = avvisiDati(dati);
  assert.equal(t.filter((x) => /provvisorio/.test(x.problema)).length, 0);
  assert.equal(t.filter((x) => x.file === 'talenti_liberi.json').length, 0);
  // durate di Vipera dal Cappuccio, Presa dell'Anima e Contraccolpo Interiore: master, 26/09/2026 (A.4)
  assert.equal(t.filter((x) => x.file === 'tecniche_interiori.json').length, 0);
  const durata = (id) => dati.tecniche_interiori.tecniche.find((x) => x.id === id).durata;
  assert.equal(durata('contraccolpo-interiore'), 'istantanea (un singolo attacco reattivo)');
  assert.match(durata('vipera-dal-cappuccio'), /^istantanea \(un singolo attacco\)/);
  assert.match(durata('presa-dell-anima'), /^una singola Prova per il bonus di \+3 VA/);
});

test('Stati (§5.18): i promemoria sono marcati come riassunti, il validatore lo pretende', () => {
  assert.ok(dati.regole.stati.elenco.every((s) => s.riassunto === true));
  const d = copia(dati);
  delete d.regole.stati.elenco[0].riassunto;
  assert.ok(validaDati(d).some((e) => e.chiave === 'stati.elenco[0].riassunto'));
});
