import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validaDati, formattaErrore, trovaTodo } from '../src/validate.js';
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
  assert.ok(todo.some((t) => t.percorso.startsWith('classi.json')), 'atteso il TODO sulle Specializzazioni dell\'Esploratore');
  assert.ok(todo.some((t) => t.percorso.startsWith('regole.json')));
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
