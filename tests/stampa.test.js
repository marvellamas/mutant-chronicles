import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  preparaStampa, tronca, primaFrase, versioniAccessibili, vociEquipaggiamento, elencoZaino, intestazioneBreve, LIMITI_STAMPA,
  preparaTab, spezzaMagia, contaIncantesimi, numeraPagine, testoPiede, ordinaFogli, iconaFoglio,
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
  // collaudo, Risorse Interiori: la frase di rimando non basta a dire cosa fa il Talento
  assert.equal(primaFrase('Si applicano le incompatibilità descritte in questa sezione. Il personaggio apprende 2 + Mod SAG Tecniche Interiori.'),
    'Il personaggio apprende 2 + Mod SAG Tecniche Interiori.');
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

test('elencoZaino: solo il vecchio testo libero si spezza; un oggetto personalizzato con «;» tiene il nome', () => {
  const voce = (nome, note) => ({ nome, tipo: 'altro', personalizzato: true, voce: { quantita: 1, stato: null, note } });
  assert.deepEqual(elencoZaino([voce('Equipaggiamento (testo precedente)', 'Pistola\nCorda; torcia')]), ['Pistola', 'Corda', 'torcia']);
  // collaudo, Dex Moreau: prima si stampavano le due note senza «Multiattrezzo di famiglia»
  assert.deepEqual(elencoZaino([voce('Multiattrezzo di famiglia', 'regalo del padre; conta come attrezzi da lavoro')]),
    ['Multiattrezzo di famiglia — regalo del padre; conta come attrezzi da lavoro']);
});

test('senza accesso alla magia: quattro fogli (con l’Inventario), numerati 1–4, con il piede', () => {
  const st = preparaStampa(MISHIMA_AGENTE, dati, { versioniDati: 'Giocatore 0.43' });
  assert.equal(st.completa, true);
  assert.deepEqual(st.fogli.map((f) => f.id), ['identita', 'abilita', 'combattimento', 'inventario']);
  // numero fisso del foglio (docs/layout-ss.md, §5.2): «pagina P di T» la scrive la vista, dopo le continuazioni
  assert.deepEqual(st.fogli.map((f) => f.numero), [1, 2, 3, 4]);
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

test('Taumaturgo: cinque fogli (Poteri dopo l’Inventario), incantesimi per macrofamiglia con le sole righe fino al livello massimo', () => {
  const st = preparaStampa(ARCANISTA, dati);
  assert.deepEqual(st.fogli.map((f) => f.numero), [1, 2, 3, 4, 5]);
  const m = foglio(st, 'poteri').dati;
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
  const m2 = foglio(preparaStampa(grado2, dati), 'poteri').dati;
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
  assert.deepEqual(preparaTab(ARCANISTA, dati).tab.map((x) => x.id), ['identita', 'abilita', 'combattimento', 'poteri']);
  // i fogli di stampa invece troncano
  const st = preparaStampa(lungo, dati);
  assert.ok(foglio(st, 'identita').dati.background.endsWith('…'));
});

test('spezzaMagia: pagine con i tagli indicati, intestazioni dei gruppi ripetute con «continua»', () => {
  const magia = foglio(preparaStampa(ARCANISTA, dati), 'poteri').dati;
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

test('numerazione: «foglio N» fisso e «pagina P di T» reale, anche con le pagine del foglio Poteri', () => {
  const st = preparaStampa(ARCANISTA, dati);
  // ordine dei fogli (docs/layout-ss.md, §5.1): prima i sempre presenti; numero fisso per foglio
  // Inventario è il foglio 4 fisso; Poteri scala al 5 (docs/layout-ss.md, pezzo 1)
  assert.deepEqual(st.fogli.map((f) => [f.id, f.numero]), [['identita', 1], ['abilita', 2], ['combattimento', 3], ['inventario', 4], ['poteri', 5]]);
  const pagine = [{ id: 'identita' }, { id: 'abilita' }, { id: 'combattimento' }, { id: 'combattimento', seguito: true }, { id: 'inventario' }, { id: 'poteri' }, { id: 'poteri', seguito: true }];
  const n = numeraPagine(pagine, st.fogli);
  assert.deepEqual(n.map((x) => [x.foglio, x.seguito, x.pagina, x.totale]),
    [[1, false, 1, 7], [2, false, 2, 7], [3, false, 3, 7], [3, true, 4, 7], [4, false, 5, 7], [5, false, 6, 7], [5, true, 7, 7]]);
  assert.equal(testoPiede({ nome: 'Ada', livello: 12, versioni: 'Giocatore 0.43' }, n[3]), 'Ada · 12° livello · foglio 3 (segue) · pagina 4 di 7 · Dati: Giocatore 0.43');
  // stampando solo alcuni fogli il numero del foglio resta quello fisso; le pagine sono quelle stampate
  const solo = numeraPagine([{ id: 'poteri' }], st.fogli);
  assert.deepEqual([solo[0].foglio, solo[0].pagina, solo[0].totale], [5, 1, 1]);
  // senza magia niente foglio Poteri; Cibernetica e Veicoli non si stampano finché i tab sono in attesa
  assert.deepEqual(ordinaFogli([{ id: 'veicoli' }, { id: 'abilita' }, { id: 'cibernetica' }, { id: 'identita' }], dati).map((f) => [f.id, f.numero]), [['identita', 1], ['abilita', 2]]);
  assert.equal(iconaFoglio('poteri'), 'magia');
  assert.equal(iconaFoglio('combattimento'), 'combattimento');
});

test('opzioni di stampa: predefinita «Solo elenco», valori sconosciuti ripuliti, scelta dei fogli pronta', async () => {
  const { normalizzaOpzioniStampa, fogliDaStampare, OPZIONI_STAMPA_PREDEFINITE } = await import('../src/stampa.js');
  assert.deepEqual(normalizzaOpzioniStampa(undefined), { fogli: null, magia: 'elenco' });
  assert.equal(OPZIONI_STAMPA_PREDEFINITE.magia, 'elenco');
  assert.deepEqual(normalizzaOpzioniStampa({ magia: 'completo' }), { fogli: null, magia: 'completo' });
  // un vecchio «magia» fra i fogli scelti si legge «poteri» (§5.3); la preferenza della scelta resta «magia»
  assert.deepEqual(normalizzaOpzioniStampa({ magia: 'tutto', fogli: ['magia', 'x', 'identita'] }), { fogli: ['identita', 'poteri'], magia: 'elenco' });
  const fogli = [{ id: 'identita' }, { id: 'abilita' }, { id: 'combattimento' }, { id: 'poteri' }];
  assert.equal(fogliDaStampare(fogli, null).length, 4);
  assert.deepEqual(fogliDaStampare(fogli, { fogli: ['combattimento'] }).map((f) => f.id), ['combattimento']);
});

test('quadratini (docs/layout-ss.md, §3): righe da 10, blocchi da 5 righe, grigi oltre il massimo', async () => {
  const { schemaQuadratini } = await import('../src/stampa.js');
  const conta = (s) => s.blocchi.flatMap((b) => b.righe.flatMap((r) => r.caselle));
  // massimo 17 (PV di Lucas): un blocco di 5 righe, 17 nere e 33 grigie; cumulato 10, 20… 50
  const pv = schemaQuadratini(17);
  assert.equal(pv.blocchi.length, 1);
  assert.equal(pv.blocchi[0].righe.length, 5);
  assert.deepEqual([conta(pv).filter(Boolean).length, conta(pv).filter((x) => !x).length], [17, 33]);
  assert.deepEqual(pv.blocchi[0].righe.map((r) => r.cumulato), [10, 20, 30, 40, 50]);
  assert.ok(pv.blocchi[0].righe.every((r) => r.caselle.length === 10));
  // massimo 2, compatto (colpi di un caricatore da 2): una riga, 2 nere e 8 grigie
  const due = schemaQuadratini(2, { compatto: true });
  assert.equal(due.blocchi.length, 1);
  assert.equal(due.blocchi[0].righe.length, 1);
  assert.deepEqual([conta(due).filter(Boolean).length, conta(due).filter((x) => !x).length], [2, 8]);
  // compatto: la prima riga intera che contiene il massimo (PI 6 → una riga; 30 colpi → tre righe)
  assert.equal(schemaQuadratini(6, { compatto: true }).blocchi[0].righe.length, 1);
  assert.equal(schemaQuadratini(30, { compatto: true }).blocchi[0].righe.length, 3);
  // oltre 50: un secondo blocco; blocco in più facoltativo, tutto grigio, dopo quelli necessari
  const cento = schemaQuadratini(73);
  assert.deepEqual(cento.blocchi.map((b) => b.righe.length), [5, 5]);
  assert.equal(conta(cento).filter(Boolean).length, 73);
  const inPiu = schemaQuadratini(17, { bloccoInPiu: true });
  assert.deepEqual(inPiu.blocchi.map((b) => b.facoltativo), [false, true]);
  assert.ok(inPiu.blocchi[1].righe.every((r) => r.caselle.every((x) => !x)));
  assert.equal(inPiu.blocchi[1].righe[0].cumulato, 60);
  // senza massimo: una riga grigia (nessuna casella disponibile)
  assert.deepEqual(conta(schemaQuadratini(0, { compatto: true })).filter(Boolean).length, 0);
});

test('foglio Inventario (docs/layout-ss.md, pezzo 1): sezioni della tab, stato prestampato, sezioni vuote non stampate', async () => {
  const { inventarioStampa, statoInventarioStampa, STATI_INVENTARIO_STAMPA } = await import('../src/stampa.js');
  const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [
    voce('p', 'armi:pugnale', 'pronta'),
    voce('d', 'armi:pugnale', 'deposito'),
    voce('a', 'armature_corporative:divisa-d-ordinanza-asa', 'indossata'),
    voce('t', 'dotazioni_personali:torcia-elettrica', null, { quantita: 2 }),
  ] };
  const st = preparaStampa({ creazione, livelli: [] }, dati);
  const inv = foglio(st, 'inventario');
  assert.equal(inv.numero, 4);
  // solo le sezioni con oggetti, nell'ordine della tab
  assert.deepEqual(inv.dati.sezioni.map((s) => s.id), ['armi', 'protezioni', 'dotazioni_personali']);
  const riga = (uid) => inv.dati.sezioni.flatMap((s) => s.righe).find((r) => r.uid === uid);
  // stato prestampato: il deposito comune ha la sua casella; «pronta» e senza stato sono «con sé»
  assert.equal(riga('d').stato, 'deposito');
  assert.deepEqual(['p', 'a', 't'].map((u) => riga(u).stato), ['conse', 'inuso', 'conse']);
  assert.deepEqual(STATI_INVENTARIO_STAMPA.map((x) => x.id), ['conse', 'inuso', 'zaino', 'deposito']);
  assert.equal(statoInventarioStampa('zaino'), 'zaino');
  // costo, Qualità, PI e PS Integrità; quantità nel nome
  assert.equal(riga('t').nome, 'Torcia elettrica ×2');
  assert.equal(riga('a').costo, '4.000 cr');
  assert.ok(riga('a').piMax > 0 && riga('a').ps > 0);
  assert.ok(riga('p').condizioni.includes('Integra')); // condizione dell'arma (A.49), solo per le armi
  assert.equal(riga('t').condizioni, null);
  // un personaggio senza oggetti: il foglio c'è, senza sezioni
  const vuoto = foglio(preparaStampa(MISHIMA_AGENTE, dati), 'inventario');
  assert.deepEqual([vuoto.numero, vuoto.dati.sezioni.length], [4, 0]);
  // la SD ha il suo tab Inventario: il foglio di stampa non diventa un tab
  assert.ok(!preparaTab({ creazione, livelli: [] }, dati).tab.some((t) => t.id === 'inventario'));
});

test('foglio Abilità (docs/layout-ss.md, pezzo 2): Specializzazioni e Tecniche Interiori nei dati del foglio 2', async () => {
  const { readFileSync } = await import('node:fs');
  const { deserializzaPersonaggio } = await import('../src/character.js');
  const p = deserializzaPersonaggio(readFileSync(new URL('collaudo/c_freelance_tecnico_l5.json', import.meta.url), 'utf8'));
  const ab = foglio(preparaStampa({ creazione: p.creazione, livelli: p.livelli }, dati), 'abilita').dati;
  // c (Tecnico 5°, Risorse Interiori): tre Tecniche e una Specializzazione nel foglio 2
  assert.deepEqual([ab.tecniche.length, ab.tecnicheAmmesse, ab.specializzazioni.length], [3, 3, 1]);
  assert.deepEqual(ab.tecniche.map((x) => Object.keys(x).filter((k) => ['nome', 'costo', 'azione'].includes(k)).length), [3, 3, 3]);
  // senza Tecniche né Specializzazioni la colonna destra ha solo Talenti e Annotazioni (riquadri vuoti non stampati)
  const m = foglio(preparaStampa(MISHIMA_AGENTE, dati), 'abilita').dati;
  assert.deepEqual([m.tecniche.length, m.tecnicheAmmesse, m.specializzazioni.length], [0, 0, 0]);
});

