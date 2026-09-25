import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  preparaStampa, tronca, primaFrase, versioniAccessibili, vociEquipaggiamento, intestazioneBreve, LIMITI_STAMPA,
  preparaTab, spezzaMagia, contaIncantesimi, rinumera,
} from '../src/stampa.js';
import { CAMPI_ANAGRAFICA } from '../src/character.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, ARCANISTA, tiro } from './personaggi.js';

const { dati } = await datiReali();
const foglio = (st, id) => st.fogli.find((f) => f.id === id);

test('tronca e primaFrase: taglio sulle parole con «…»', () => {
  assert.equal(tronca('breve', 20), 'breve');
  assert.equal(tronca('una frase abbastanza lunga da tagliare', 20), 'una frase…');
  assert.equal(tronca('una frase abbastanza lunga da tagliare', 22), 'una frase abbastanza…');
  assert.ok(tronca('x'.repeat(50), 10).length <= 10);
  assert.equal(primaFrase('Prima frase. Seconda frase.'), 'Prima frase.');
  assert.equal(primaFrase('Senza punto finale'), 'Senza punto finale');
  assert.ok(primaFrase(`${'parola '.repeat(80)}fine.`).endsWith('…'));
  assert.ok(primaFrase(`${'parola '.repeat(80)}fine.`).length <= LIMITI_STAMPA.frase);
});

test('versioniAccessibili: solo le righe dal livello base al livello massimo', () => {
  const i = dati.incantesimi.incantesimi.find((x) => x.nome === 'Colpo Elementale');
  assert.deepEqual(versioniAccessibili(i, 3).map((r) => r.Livello), ['1', '2', '3']);
  assert.equal(versioniAccessibili(i, 0).length, 0);
  const alto = dati.incantesimi.incantesimi.find((x) => x.livello_base > 3);
  assert.equal(versioniAccessibili(alto, 3).length, 0);
  assert.ok(versioniAccessibili(alto, 18).every((r) => Number(Object.values(r)[0]) >= alto.livello_base));
});

test('intestazioneBreve: toglie Scheda, Macrofamiglia e Specializzazione, già date dal foglio', () => {
  assert.equal(intestazioneBreve('Scheda 13.1 • Macrofamiglia Fisica • Specializzazione Elementi • Rituale: non consentito'), 'Rituale: non consentito');
  assert.equal(intestazioneBreve(''), '');
});

test('vociEquipaggiamento: una voce per riga o per «;», senza trattini', () => {
  assert.deepEqual(vociEquipaggiamento('- Pistola\n• Coltello; corda\n\n'), ['Pistola', 'Coltello', 'corda']);
  assert.deepEqual(vociEquipaggiamento(''), []);
});

test('senza accesso alla magia: tre fogli, numerati «di 3», con il piede', () => {
  const st = preparaStampa(MISHIMA_AGENTE, dati, { versioniDati: 'Giocatore 0.43' });
  assert.equal(st.completa, true);
  assert.deepEqual(st.fogli.map((f) => f.id), ['identita', 'abilita', 'combattimento']);
  assert.deepEqual(st.fogli.map((f) => `${f.numero}/${f.totale}`), ['1/3', '2/3', '3/3']);
  assert.deepEqual(st.piede, { nome: MISHIMA_AGENTE.nome.trim(), livello: 1, versioni: 'Giocatore 0.43' });

  const id = foglio(st, 'identita').dati;
  assert.equal(id.pv, 16); // esempio del manuale (§2.14)
  assert.equal(id.pm, 9);
  assert.deepEqual(id.salvezze.map((s) => s.totale), [10, 11, 9, 10]);
  assert.equal(id.classi[0].grado, 'I');
  assert.equal(id.puntiEroe.massimo, dati.regole.punti_eroe.riserva_massima);

  const ab = foglio(st, 'abilita').dati;
  assert.equal(ab.categorie.flatMap((c) => c.abilita).length, 24);
  assert.equal(ab.categorie.flatMap((c) => c.abilita).find((a) => a.nome === 'Furtività').va, 9);
  assert.ok(ab.talentiClasse.length >= 1 && ab.talentiClasse.every((t) => t.frase.length <= LIMITI_STAMPA.frase));

  const co = foglio(st, 'combattimento').dati;
  assert.equal(co.armi.righe.length, 0);
  assert.equal(co.armi.righeVuote, 6);
  assert.deepEqual(co.armi.colonne, ['Arma', 'Abilità', 'VA', 'Danno', 'Gittata', 'Munizioni', 'Note']);
  assert.equal(co.stati.length, 11); // §5.18: «Gli Stati sono undici»
  assert.deepEqual(co.ferite.stati.map((f) => f.penalita), [-1, -2, -4, -6, -8]); // §5.14
  assert.equal(co.difese.va, calcolaVA(st, 'Difese'));
});

function calcolaVA(st, nome) {
  return foglio(st, 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === nome).va;
}

test('Background lungo troncato con «…»; il testo corto resta intero', () => {
  const lungo = preparaStampa({ ...MISHIMA_AGENTE, concetto: 'parola '.repeat(400) }, dati);
  const id = foglio(lungo, 'identita').dati;
  assert.ok(id.background.endsWith('…'));
  assert.ok(id.background.length <= LIMITI_STAMPA.background);
  assert.equal(id.backgroundTroncato, true);
  const corto = foglio(preparaStampa(MISHIMA_AGENTE, dati), 'identita').dati;
  assert.equal(corto.backgroundTroncato, false);
});

test('Taumaturgo: quattro fogli, incantesimi per macrofamiglia con le sole righe fino al livello massimo', () => {
  const st = preparaStampa(ARCANISTA, dati);
  assert.deepEqual(st.fogli.map((f) => `${f.numero}/${f.totale}`), ['1/4', '2/4', '3/4', '4/4']);
  const m = foglio(st, 'magia').dati;
  assert.equal(m.pm, 16);
  assert.equal(m.livelloMassimo, 3); // tabella del master: I Grado → 3
  assert.equal(m.scalaPotere, 'Taumaturgo');
  assert.equal(m.scala.length, dati.regole.taumaturgo.scala_potere.length);
  const incantesimi = m.macrofamiglie.flatMap((x) => x.specializzazioni.flatMap((s) => s.incantesimi));
  assert.equal(incantesimi.length, ARCANISTA.incantesimi.length);
  for (const i of incantesimi) {
    assert.ok(i.righe.length >= 1);
    assert.ok(i.righe.every((r) => Number(r[0]) >= i.livelloBase && Number(r[0]) <= 3));
    assert.ok(!/Macrofamiglia/.test(i.intestazione));
  }
  // al Grado II il livello massimo sale a 8 e le righe con lui
  const grado2 = {
    creazione: ARCANISTA,
    livelli: [
      { livello: 2, caratteristiche: { COS: 1, DES: 1 } },
      { livello: 3, talentoLibero: { id: 'sempre-allerta' } },
      { livello: 4, grado: { classe: 'Arcanista' }, tiroPV: tiro(2), tiroPM: tiro(3), talentoClasse: dati.classi.classi.find((c) => c.nome === 'Arcanista').talenti_a_scelta[0].nome },
    ],
  };
  const m2 = foglio(preparaStampa(grado2, dati), 'magia').dati;
  assert.equal(m2.livelloMassimo, 8);
  const colpo = m2.macrofamiglie.flatMap((x) => x.specializzazioni.flatMap((s) => s.incantesimi)).find((i) => i.nome === 'Colpo Elementale');
  if (colpo) assert.equal(colpo.righe.length, 8);
});

test('creazione non calcolabile: nessun foglio', () => {
  const st = preparaStampa({ nome: 'Vuoto' }, dati);
  assert.equal(st.fogli.length, 0);
  assert.equal(st.completa, false);
});

// --- anagrafica, tab della scheda digitale, foglio Magia su più pagine ---------------------

test('anagrafica nel foglio 1: i campi vuoti restano vuoti (riga da compilare), PX numerici o null', () => {
  const vuota = foglio(preparaStampa(MISHIMA_AGENTE, dati), 'identita').dati;
  assert.deepEqual(vuota.anagrafica.map((x) => x.campo), CAMPI_ANAGRAFICA.map((c) => c.campo));
  assert.ok(vuota.anagrafica.every((x) => x.valore === ''));
  assert.equal(vuota.puntiEsperienza, null);
  const piena = foglio(preparaStampa({ ...MISHIMA_AGENTE, soprannome: 'Ombra', manoDominante: 'sinistra', puntiEsperienza: 1200 }, dati), 'identita').dati;
  assert.equal(piena.anagrafica.find((x) => x.campo === 'soprannome').valore, 'Ombra');
  assert.equal(piena.anagrafica.find((x) => x.campo === 'manoDominante').valore, 'sinistra');
  assert.equal(piena.puntiEsperienza, 1200);
});

test('preparaTab: stesse sezioni della stampa senza troncamenti, con Progressione e §2.17 in Identità', () => {
  const lungo = { creazione: { ...MISHIMA_AGENTE, concetto: 'parola '.repeat(400).trim() }, livelli: [] };
  const t = preparaTab(lungo, dati);
  assert.deepEqual(t.tab.map((x) => x.titolo), ['Identità', 'Abilità', 'Combattimento']);
  const id = t.tab[0].dati;
  assert.equal(id.background, 'parola '.repeat(400).trim()); // intero
  assert.equal(id.backgroundTroncato, false);
  assert.deepEqual(id.progressione.map((r) => r.livello), [1]);
  assert.ok(id.checklist.length >= 9);
  // i Talenti hanno il testo completo, non la prima frase
  const classe = dati.classi.classi.find((c) => c.nome === 'Agente');
  assert.equal(t.tab[1].dati.talentiClasse[0].frase, classe.talenti_fissi[0].testo.trim());
  // la tab Magia c'è solo con accesso agli incantesimi
  assert.deepEqual(preparaTab(ARCANISTA, dati).tab.map((x) => x.id), ['identita', 'abilita', 'combattimento', 'magia']);
  // i fogli di stampa invece troncano
  const st = preparaStampa(lungo, dati);
  assert.ok(foglio(st, 'identita').dati.background.endsWith('…'));
});

test('spezzaMagia: pagine con i tagli indicati, intestazioni dei gruppi ripetute con «continua»', () => {
  const magia = foglio(preparaStampa(ARCANISTA, dati), 'magia').dati;
  const totale = contaIncantesimi(magia.macrofamiglie);
  assert.equal(totale, ARCANISTA.incantesimi.length);
  const nomi = (pagina) => pagina.macrofamiglie.flatMap((m) => m.specializzazioni.flatMap((s) => s.incantesimi.map((i) => i.nome)));
  const tutti = nomi(magia);

  // un'unica pagina senza tagli: tutto come prima
  const una = spezzaMagia(magia, []);
  assert.equal(una.length, 1);
  assert.deepEqual(nomi(una[0]), tutti);
  assert.equal(una[0].prima, true);

  // due pagine: 4 incantesimi nella prima, il resto nella seconda, nell'ordine
  const due = spezzaMagia(magia, [4]);
  assert.equal(due.length, 2);
  assert.deepEqual(nomi(due[0]), tutti.slice(0, 4));
  assert.deepEqual(nomi(due[1]), tutti.slice(4));
  assert.equal(due[0].prima, true);
  assert.equal(due[1].continuazione, true);
  // il gruppo spezzato fra le due pagine si ripete, marcato «continua»
  const ultimoM = due[0].macrofamiglie.at(-1);
  const ultimaSp = ultimoM.specializzazioni.at(-1);
  const primoM2 = due[1].macrofamiglie[0];
  assert.equal(primoM2.nome, ultimoM.nome);
  assert.equal(primoM2.continua, true);
  assert.equal(primoM2.specializzazioni[0].nome, ultimaSp.nome);
  assert.equal(primoM2.specializzazioni[0].continua, true);
  assert.equal(due[0].macrofamiglie[0].continua, false);

  // tre pagine; tagli oltre il totale non creano pagine vuote
  const tre = spezzaMagia(magia, [5, 5]);
  assert.equal(tre.length, 3);
  assert.equal(tre.flatMap(nomi).length, totale);
  assert.equal(spezzaMagia(magia, [totale, 3]).length, 1);
  // le pagine conservano i dati dell'intestazione del foglio (PM, scala)
  assert.equal(tre[2].pm, magia.pm);
});

test('rinumera: «foglio N di M» dopo aver aggiunto pagine Magia', () => {
  const st = preparaStampa(ARCANISTA, dati);
  const magia = foglio(st, 'magia');
  const pagine = spezzaMagia(magia.dati, [6]).map((d) => ({ ...magia, dati: d }));
  const fogli = rinumera([...st.fogli.filter((f) => f.id !== 'magia'), ...pagine]);
  assert.deepEqual(fogli.map((f) => `${f.numero} di ${f.totale}`), ['1 di 5', '2 di 5', '3 di 5', '4 di 5', '5 di 5']);
});
