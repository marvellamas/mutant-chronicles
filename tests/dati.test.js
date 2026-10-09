import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validaDati, formattaErrore, trovaTodo, avvisiDati } from '../src/validate.js';
import { caricaDati } from '../src/rules.js';
import { competenzaDi, baseIniziale, limiteAbilita } from '../src/competenze.js';
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
  // chiusi dalle risposte del master (docs/risposte-master.md); il Capolavoro del Corazzaio (A.61) il 02/10
  assert.equal(todo.some((t) => t.percorso.startsWith('classi.json')), false);
  // tutte chiuse dalle risposte ai 19 quesiti (E&L del 29/09) e ai 6 quesiti del 03/10 (A.80, A.86); restano
  // le scelte sui Rituali (per-davide A.74); A.78 chiusa il 02/10 (decisione 71)
  assert.ok(todo.filter((t) => t.percorso.startsWith('regole.json')).every((t) => (/^regole\.json\.rituali/.test(t.percorso) && /A\.74/.test(t.testo)) || (/^regole\.json\.umanita\.riabilitazione/.test(t.percorso) && /A\.111/.test(t.testo)) || (/^regole\.json\.attacco_distanza\.a_terra/.test(t.percorso) && /A\.153/.test(t.testo)) || (/^regole\.json\.caratteristiche_temporanee/.test(t.percorso) && /A\.120/.test(t.testo)))); // A.110, A.116 e A.119 risolte il 09/10; A.153 (A Terra e Copertura) aperta
  // durate delle Tecniche Interiori: decise dal master il 26/09/2026 (A.4 del Doc E&L); effetti di Pelle di
  // Rinoceronte (A.81) e di Onda Interiore (A.82) decisi il 03/10/2026
  assert.equal(todo.some((t) => t.percorso.startsWith('tecniche_interiori.json')), false);
  // Individuare a Concentrazione (A.88) e Reperibilità Epica (A.83): decise il 03/10/2026
  assert.equal(todo.some((t) => /A\.8[38]/.test(t.testo ?? t.valore ?? '')), false);
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

test('validatore: le 25 Classi coprono le 24 Abilità una volta ciascuna, 2 S / 6 P / 12 G / 4 N (§2.3 del 29/09)', () => {
  const cc = dati.regole.competenze.categorie;
  assert.deepEqual(Object.fromEntries(Object.entries(cc).map(([k, v]) => [k, [v.numero, v.base]])), { S: [2, 7], P: [6, 6], G: [12, 5], N: [4, 3] });
  assert.equal(dati.regole.competenze.punti_base_totali, 122);
  assert.equal(dati.classi.classi.length, 25);
  const nomi = dati.abilita.abilita.map((a) => a.nome).sort();
  for (const c of dati.classi.classi) {
    const tutte = Object.values(c.competenze).flat();
    assert.deepEqual([...tutte].sort(), nomi, c.nome);
    for (const [k, v] of Object.entries(cc)) assert.equal(c.competenze[k].length, v.numero, `${c.nome} ${k}`);
    // le basi sommano 122 (2×7 + 6×6 + 12×5 + 4×3)
    assert.equal(Object.entries(c.competenze).reduce((t, [k, l]) => t + l.length * cc[k].base, 0), 122, c.nome);
  }
  // gli Addestramenti non hanno più i valori base
  for (const a of dati.addestramenti.addestramenti) assert.equal(a.valori_base, undefined, a.nome);
});

test('Incursore §3.7 (Giocatore del 03/10): Armi da guerra Professionale, Armi da mischia Generica', () => {
  const inc = dati.classi.classi.find((c) => c.nome === 'Incursore');
  assert.equal(competenzaDi(inc, 'Armi da guerra'), 'P');
  assert.equal(competenzaDi(inc, 'Armi da mischia'), 'G');
  assert.equal(baseIniziale(inc, 'Armi da guerra', dati.regole), 6);
  assert.equal(baseIniziale(inc, 'Armi da mischia', dati.regole), 5);
  // il limite del VA personale segue la categoria (§8.3): P più alto di G a ogni Grado
  const uno = [{ def: inc, grado: 1 }];
  assert.equal(limiteAbilita('Armi da guerra', uno, dati.regole).valore, 9);
  assert.equal(limiteAbilita('Armi da mischia', uno, dati.regole).valore, 7);
  // Armi da mischia resta una delle cinque Abilità di Classe (+1 per Grado) pur essendo Generica:
  // i +1 si registrano sempre, ma oltre il limite G restano inattivi (§8.3; src/competenze.js → puntiUtili)
  assert.ok(inc.abilita.includes('Armi da mischia'));
  assert.ok(!inc.abilita.includes('Armi da guerra'));
});

test('validatore: Classe con categoria di competenza sbagliata, Abilità ripetuta, mancante o inesistente', () => {
  // una G spostata fra le S: 3 S e 11 G
  const e = erroriDopo((d) => { const c = d.classi.classi[0].competenze; c.S.push(c.G.pop()); });
  const k = (x) => x.file === 'classi.json' && x.chiave.includes('Agente');
  assert.ok(e.some((x) => k(x) && x.chiave.endsWith('competenze.S') && /attese 2 Abilità, trovate 3/.test(x.problema)), JSON.stringify(e));
  assert.ok(e.some((x) => k(x) && x.chiave.endsWith('competenze.G') && /attese 12 Abilità, trovate 11/.test(x.problema)));
  // Abilità scritta male: inesistente e, di conseguenza, «Furtività» senza categoria
  const m = erroriDopo((d) => { const c = d.classi.classi[1].competenze; for (const l of Object.values(c)) { const i = l.indexOf('Furtività'); if (i >= 0) l[i] = 'Furtivita'; } });
  assert.ok(m.some((x) => /"Furtivita" non è un'Abilità esistente/.test(x.problema)));
  assert.ok(m.some((x) => /l'Abilità "Furtività" non ha una categoria di competenza/.test(x.problema)));
  // la stessa Abilità in due categorie
  const r = erroriDopo((d) => { const c = d.classi.classi[0].competenze; c.N[0] = c.S[0]; });
  assert.ok(r.some((x) => /è già fra le Specializzate: ogni Abilità sta in una sola categoria/.test(x.problema)), JSON.stringify(r));
  // categoria mancante; categoria sconosciuta
  assert.ok(erroriDopo((d) => { delete d.classi.classi[0].competenze.N; }).some((x) => /manca la categoria N \(Non competenti\)/.test(x.problema)));
  assert.ok(erroriDopo((d) => { d.classi.classi[0].competenze.X = []; }).some((x) => /categoria "X" non in regole\.json/.test(x.problema)));
});

test('validatore: regole delle competenze con basi o numeri che non tornano, valori base rimessi negli Addestramenti', () => {
  // base S 7 → 8: le basi sommano 124
  const e = erroriDopo((d) => { d.regole.competenze.categorie.S.base = 8; });
  assert.ok(e.some((x) => x.file === 'regole.json' && /le basi sommano 124, non 122/.test(x.problema)), JSON.stringify(e));
  // numero S 2 → 3: le categorie coprono 25 Abilità (e ogni Classe ne ha una di troppo da trovare)
  assert.ok(erroriDopo((d) => { d.regole.competenze.categorie.S.numero = 3; }).some((x) => /coprono 25 Abilità, le Abilità sono 24/.test(x.problema)));
  // i valori_base del vecchio schema non si rimettono (le basi vengono dalla prima Classe)
  assert.ok(erroriDopo((d) => { d.addestramenti.addestramenti[0].valori_base = { 'Furtività': 4 }; }).some((x) => x.file === 'addestramenti.json' && /valori_base/.test(x.chiave + x.problema)));
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

test('conteggi del cap. 8: 87 Talenti del §8.6 + 32 Talenti magici e mistici, 85 Specializzazioni (Armi a Sega, risposta A.9), 28 Tecniche', () => {
  const t = dati.talenti_liberi.talenti;
  assert.equal(t.filter((x) => x.sezione.startsWith('8.6')).length, 87);
  const magia = t.filter((x) => x.sezione === 'magia');
  // 14 schede approvate dal master il 26/09 + 18 nuove del Google Doc del 27/09 (Giocatore §8.6.8: «I 32 Talenti magici e mistici»)
  assert.equal(magia.length, 32);
  assert.ok(magia.some((x) => x.id === 'potere-mistico') && magia.some((x) => x.id === 'ritualista-maggiore'));
  assert.ok(magia.some((x) => x.id === 'contromagia-universale') && magia.some((x) => x.id === 'magia-occultata'));
  assert.ok(magia.every((x) => !x.provvisorio && Array.isArray(x.prerequisiti) && ['passivo', 'attivo'].includes(x.tipo)));
  assert.ok(t.every((x) => ['passivo', 'attivo'].includes(x.tipo)));
  assert.equal(dati.specializzazioni.specializzazioni.length, 85);
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
