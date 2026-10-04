// Equipaggiamento iniziale (src/dotazioni.js, Giocatore §2.16, E&L A.5–A.5.29).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import {
  vociDotazione, applicaDotazione, contiDotazione, mancanzeDotazione, avvisiForza, specTiroCrediti,
  creditiIniziali, modelloAssegnato, opzioniEffettive, saldoIniziale, NOTA_CORPORATIVO, NOTA_ACQUISTO,
} from '../src/dotazioni.js';
import { tira } from '../src/tiri.js';
import { nuoveScelte, normalizza, serializza, deserializza } from '../src/character.js';
import { massimiSessione, allineaSessione, variaSessione } from '../src/sessione.js';
import { normalizzaEquipaggiamento, catalogo } from '../src/equipaggiamento.js';

const { dati } = await datiReali();
const tiro = (valore) => ({ valore, origine: 'manuale' });
const AGENTE = {
  opzioni: { arma_da_fuoco: 'armi_distanza:pistola-semiautomatica', arma_da_mischia: 'armi:coltello' },
  sotto: {}, crediti: tiro(7), acquisti: [],
};
const perNome = (voci, rif) => voci.filter((v) => v.rif === rif);

test('dotazione comune: gli 11 oggetti del §2.16.1 con le quantità, marcati come dotazione iniziale', () => {
  const voci = vociDotazione(AGENTE, 'Agente', 'Mishima', dati);
  const comune = voci.filter((v) => v.uid.startsWith('dot-comune-'));
  assert.equal(comune.length, 11);
  assert.ok(voci.every((v) => v.dotazione_iniziale === true));
  const borraccia = comune.find((v) => v.personalizzato.nome.startsWith('Borraccia'));
  assert.equal(borraccia.quantita, 2);
  assert.equal(comune.find((v) => v.personalizzato.nome === 'Razione da viaggio').quantita, 3);
});

test('un oggetto della Classe sostituisce quello comune (Comunicatore da squadra, Lampada frontale)', () => {
  const d = { opzioni: { arma_principale: 'armi_distanza:carabina' }, crediti: tiro(2) };
  const nomi = vociDotazione(d, 'Soldato', 'Freelance', dati).filter((v) => v.personalizzato).map((v) => v.personalizzato.nome);
  assert.ok(nomi.includes('Comunicatore da squadra'));
  assert.ok(!nomi.includes('Comunicatore personale'));
  const tecnico = vociDotazione({ opzioni: {} }, 'Tecnico', 'Freelance', dati).filter((v) => v.personalizzato).map((v) => v.personalizzato.nome);
  assert.ok(tecnico.includes('Lampada frontale') && !tecnico.includes('Torcia elettrica'));
});

test('scelta dell’arma → munizioni giuste: semiautomatica 45 colpi, revolver 18, fucile a pompa 18 cartucce', () => {
  const semi = vociDotazione(AGENTE, 'Agente', 'Freelance', dati);
  assert.equal(perNome(semi, 'munizioni:proiettili-da-pistola')[0].quantita, 45);
  assert.match(perNome(semi, 'munizioni:proiettili-da-pistola')[0].note, /3 caricatori compatibili da 15 colpi/);
  const rev = vociDotazione({ ...AGENTE, opzioni: { ...AGENTE.opzioni, arma_da_fuoco: 'armi_distanza:revolver' } }, 'Agente', 'Freelance', dati);
  assert.equal(perNome(rev, 'munizioni:proiettili-da-pistola')[0].quantita, 18);
  assert.equal(perNome(rev, 'armi_distanza:pistola-semiautomatica').length, 0);
  const pompa = vociDotazione({ opzioni: { arma_da_fuoco: 'armi_distanza:fucile-a-pompa' } }, 'Cacciatore', 'Freelance', dati);
  assert.equal(perNome(pompa, 'munizioni:cartucce-a-pallini')[0].quantita, 18);
  const art = vociDotazione({ opzioni: { arma_principale: 'armi_distanza:fucile-di-precisione' } }, 'Artigliere', 'Freelance', dati);
  assert.equal(perNome(art, 'munizioni:proiettili-da-fucile')[0].quantita, 15);
});

test('Artigliere: il mirino segue l’arma ed è montato, il bipiede c’è sempre', () => {
  const d = { opzioni: { arma_principale: 'armi_distanza:fucile-d-assalto' } };
  const eff = opzioniEffettive(d, 'Artigliere', dati);
  assert.equal(eff.find((e) => e.gruppo.id === 'mirino').opzione.id, 'accessori_armi:mirino-reflex');
  const voci = vociDotazione(d, 'Artigliere', 'Freelance', dati);
  const arma = perNome(voci, 'armi_distanza:fucile-d-assalto')[0];
  const reflex = perNome(voci, 'accessori_armi:mirino-reflex')[0];
  assert.equal(reflex.montato_su, arma.uid);
  assert.equal(reflex.stato, 'in_uso');
  assert.equal(perNome(voci, 'accessori_armi:bipiede').length, 1);
  const ottico = opzioniEffettive({ opzioni: { arma_principale: 'armi_distanza:fucile-di-precisione' } }, 'Artigliere', dati);
  assert.equal(ottico.find((e) => e.gruppo.id === 'mirino').opzione.id, 'accessori_armi:mirino-ottico');
});

test('FOR insufficiente: avviso (non blocco) per ogni oggetto che richiede più FOR', () => {
  const voci = vociDotazione({ opzioni: { arma_principale: 'armi_distanza:fucile-d-assalto' }, crediti: tiro(5) }, 'Artigliere', 'Freelance', dati);
  const avvisi = avvisiForza(voci, 4, dati);
  // con FOR 4 solo il fucile (FOR 5) è oltre: coltello FOR 2, armatura FOR 3
  assert.equal(avvisi.length, 1);
  assert.equal(avvisi[0].richiesta, 5);
  assert.match(avvisi[0].testo, /richiede FOR 5: il personaggio ha FOR 4/);
  assert.deepEqual(avvisiForza(voci, 5, dati), []);
  // l'avviso non impedisce la conferma
  assert.deepEqual(mancanzeDotazione({ opzioni: { arma_principale: 'armi_distanza:fucile-d-assalto' }, crediti: tiro(5) }, 'Artigliere', 'Freelance', dati), []);
});

test('crediti iniziali: 1000 + 2d6 × 100, sempre fra 1200 e 2200', () => {
  const spec = specTiroCrediti(dati);
  assert.equal(spec.formula, '2d6');
  assert.equal(creditiIniziali(tiro(2), dati), 1200);
  assert.equal(creditiIniziali(tiro(12), dati), 2200);
  assert.equal(creditiIniziali(null, dati), null);
  for (let i = 0; i < 200; i++) {
    const c = creditiIniziali(tira(spec).tiro, dati);
    assert.ok(c >= 1200 && c <= 2200 && c % 100 === 0, String(c));
  }
  // il tiro fuori intervallo si scarta alla normalizzazione
  const { scelte, avvisi } = normalizza({ ...nuoveScelte(), dotazione: { crediti: { valore: 13, origine: 'manuale' } } }, dati);
  assert.equal(scelte.dotazione.crediti, null);
  assert.ok(avvisi.some((a) => /Crediti iniziali/.test(a)));
});

test('scambio (§2.16.29): l’arma ceduta vale il 100 % del prezzo, si paga il conguaglio, l’arma esce', () => {
  // Pistola semiautomatica (1.300) ceduta per una Pistola pesante (2.100): 800 di conguaglio
  const d = { ...AGENTE, crediti: tiro(7), acquisti: [{ rif: 'armi_distanza:pistola-pesante', cede: ['arma_da_fuoco'] }] };
  const c = contiDotazione(d, 'Agente', 'Freelance', dati);
  assert.equal(c.iniziali, 1700);
  assert.equal(c.acquisti[0].valoreCeduto, 1300);
  assert.equal(c.acquisti[0].conguaglio, 800);
  assert.equal(c.saldo, 900);
  const voci = vociDotazione(d, 'Agente', 'Freelance', dati);
  assert.equal(perNome(voci, 'armi_distanza:pistola-semiautomatica').length, 0);
  assert.equal(perNome(voci, 'armi_distanza:pistola-pesante')[0].note, NOTA_ACQUISTO);
  // le munizioni restano: la Pistola pesante usa la stessa famiglia (pistola)
  assert.match(perNome(voci, 'munizioni:proiettili-da-pistola')[0].note, /^Per Pistola pesante \(al posto di Pistola semiautomatica, ceduto\): 45 colpi/);
  // senza cessione si paga il prezzo intero; saldo sotto zero → blocco
  const caro = { ...d, crediti: tiro(2), acquisti: [{ rif: 'armi_distanza:pistola-mitragliatrice-compatta', cede: [] }] };
  assert.equal(contiDotazione(caro, 'Agente', 'Freelance', dati).saldo, 1200 - 2600);
  assert.ok(mancanzeDotazione(caro, 'Agente', 'Freelance', dati).some((m) => /Crediti insufficienti/.test(m)));
  // lo stesso armamento non si cede due volte
  const doppio = { ...d, acquisti: [...d.acquisti, { rif: 'armi_distanza:revolver', cede: ['arma_da_fuoco'] }] };
  assert.ok(contiDotazione(doppio, 'Agente', 'Freelance', dati).errori.some((e) => /già ceduto/.test(e)));
});

test('rifare la dotazione sostituisce le voci, non le somma; gli altri oggetti restano', () => {
  const altro = { uid: 'e9', rif: 'armi:spada-lunga', stato: 'zaino', quantita: 1, note: 'mia' };
  const prima = applicaDotazione([altro], vociDotazione(AGENTE, 'Agente', 'Freelance', dati));
  const dopo = applicaDotazione(prima, vociDotazione({ ...AGENTE, opzioni: { ...AGENTE.opzioni, arma_da_fuoco: 'armi_distanza:revolver' } }, 'Agente', 'Freelance', dati));
  const again = applicaDotazione(dopo, vociDotazione({ ...AGENTE, opzioni: { ...AGENTE.opzioni, arma_da_fuoco: 'armi_distanza:revolver' } }, 'Agente', 'Freelance', dati));
  assert.deepEqual(again, dopo);
  assert.equal(dopo.filter((v) => v.uid === 'e9').length, 1);
  assert.equal(perNome(dopo, 'armi_distanza:pistola-semiautomatica').length, 0);
  assert.equal(perNome(dopo, 'armi_distanza:revolver').length, 1);
  assert.equal(dopo.filter((v) => v.personalizzato?.nome === 'Sacco a pelo').length, 1);
  // il marcatore sopravvive alla normalizzazione e al salvataggio
  assert.ok(normalizzaEquipaggiamento(dopo).filter((v) => v.dotazione_iniziale).length === dopo.length - 1);
  const s = normalizza({ ...nuoveScelte(), corporazione: 'Freelance', addestramento: 'Avventuriero', classe: 'Agente', equipaggiamento: dopo, dotazione: AGENTE }, dati).scelte;
  const riletta = normalizza(deserializza(serializza(s)), dati).scelte;
  assert.deepEqual(riletta.dotazione, s.dotazione);
  assert.equal(riletta.equipaggiamento.filter((v) => v.dotazione_iniziale).length, dopo.length - 1);
});

test('A.5.27: senza abbinamento il profilo commerciale con la nota; con l’abbinamento il modello corporativo', () => {
  const voci = vociDotazione(AGENTE, 'Agente', 'Mishima', dati);
  // E&L 16 (A.33): la pistola semiautomatica del Mishima è la Ronin 25 AP, senza nota
  assert.equal(perNome(voci, 'armi_distanza_corporative:ronin-25ap')[0].note, '');
  // un profilo senza abbinamento e fuori da «commerciali» ha ancora la nota
  const d0 = copia(dati);
  delete d0.dotazioni.corporativi.abbinamenti.Mishima['armi_distanza:pistola-semiautomatica'];
  assert.equal(perNome(vociDotazione(AGENTE, 'Agente', 'Mishima', d0), 'armi_distanza:pistola-semiautomatica')[0].note, NOTA_CORPORATIVO);
  // A.5.30: l'armatura ha l'abbinamento del §7.22 → modello corporativo, senza nota
  assert.equal(perNome(voci, 'armature_corporative:armatura-ashigaru')[0].note, '');
  // gli strumenti non armamenti restano commerciali, senza nota
  assert.ok(voci.filter((v) => v.rif?.startsWith('munizioni:')).every((v) => !v.note.includes('A.5.27')));
  const d2 = copia(dati);
  d2.dotazioni.corporativi.abbinamenti.Mishima = { 'armi_distanza:pistola-semiautomatica': { rif: 'armi_distanza_corporative:ronin-45ap' } };
  const m = modelloAssegnato('armi_distanza:pistola-semiautomatica', 'Mishima', d2);
  assert.deepEqual(m, { rif: 'armi_distanza_corporative:ronin-45ap', corporativo: true, nota: null });
  const conMishima = vociDotazione(AGENTE, 'Agente', 'Mishima', d2);
  assert.equal(perNome(conMishima, 'armi_distanza_corporative:ronin-45ap').length, 1);
  // §2.16.27: stesso totale di colpi, munizione ordinaria compatibile, caricatori da 15 del Ronin 45AP
  const mun = conMishima.find((v) => v.uid === 'dot-arma_da_fuoco-munizioni');
  assert.equal(mun.rif, 'munizioni:proiettili-da-pistola');
  assert.equal(mun.quantita, 45);
  // modello con capacità diversa: la ripartizione si adegua senza cambiare il totale
  d2.dotazioni.corporativi.abbinamenti.Mishima['armi_distanza:pistola-semiautomatica'] = { rif: 'armi_distanza_corporative:ronin-25ap' }; // capacità 10
  const r25 = vociDotazione(AGENTE, 'Agente', 'Mishima', d2).find((v) => v.uid === 'dot-arma_da_fuoco-munizioni');
  assert.equal(r25.quantita, 45);
  assert.match(r25.note, /45 colpi in 3 caricatori compatibili da 10 .*15 sciolti/);
  d2.dotazioni.corporativi.abbinamenti.Mishima['armi_distanza:pistola-semiautomatica'] = { rif: 'armi_distanza_corporative:ronin-45ap' };
  // il valore di cessione è quello del modello assegnato (1.200), non del commerciale (1.300)
  const c = contiDotazione({ ...AGENTE, acquisti: [{ rif: 'armi_distanza:pistola-pesante', cede: ['arma_da_fuoco'] }] }, 'Agente', 'Mishima', d2);
  assert.equal(c.acquisti[0].valoreCeduto, 1200);
});

test('Freelance: sempre il catalogo Commerciale, senza nota, anche con abbinamenti definiti', () => {
  const d2 = copia(dati);
  d2.dotazioni.corporativi.abbinamenti.Mishima = { 'armi_distanza:pistola-semiautomatica': { rif: 'armi_distanza_corporative:ronin-45ap' } };
  const voci = vociDotazione(AGENTE, 'Agente', 'Freelance', d2);
  const p = perNome(voci, 'armi_distanza:pistola-semiautomatica')[0];
  assert.ok(p);
  assert.equal(p.note, '');
  assert.ok(voci.every((v) => !v.note.includes('A.5.27')));
});

test('sotto-scelte: l’ambiente del corredo è richiesto ed entra nel nome, con l’effetto', () => {
  const d = { opzioni: { arma_da_fuoco: 'armi_distanza:carabina', arma_da_mischia: 'armi:pugnale' }, crediti: tiro(4) };
  assert.ok(mancanzeDotazione(d, 'Cacciatore', 'Freelance', dati).some((m) => /Corredo di sopravvivenza ambientale/.test(m)));
  const voci = vociDotazione({ ...d, sotto: { 'corredo-sopravvivenza-ambientale': 'Artico' } }, 'Cacciatore', 'Freelance', dati);
  const c = voci.find((v) => v.personalizzato?.nome.startsWith('Corredo di sopravvivenza'));
  assert.equal(c.personalizzato.nome, 'Corredo di sopravvivenza ambientale (Artico)');
  // l'effetto non si copia nella voce: si legge dai dati attraverso dotazione_id; l'oggetto parte «in uso»
  assert.equal(c.dotazione_id, 'corredo-sopravvivenza-ambientale');
  assert.equal(c.stato, 'in_uso');
  assert.equal(c.personalizzato.testo, undefined);
  assert.deepEqual(mancanzeDotazione({ ...d, sotto: { 'corredo-sopravvivenza-ambientale': 'Artico' } }, 'Cacciatore', 'Freelance', dati), []);
});

test('ogni Classe: con la prima opzione di ogni gruppo la dotazione si genera senza riferimenti rotti', () => {
  for (const nome of Object.keys(dati.dotazioni.classi)) {
    const opzioni = Object.fromEntries(dati.dotazioni.classi[nome].gruppi.map((g) => [g.id, g.opzioni[0].id]));
    const voci = vociDotazione({ opzioni, sotto: {}, crediti: tiro(7), acquisti: [] }, nome, 'Capitol', dati);
    assert.ok(voci.length > 11, nome);
    assert.deepEqual(normalizzaEquipaggiamento(voci), voci, nome);
  }
});

test('crediti di sessione: partono dal saldo iniziale, seguono la dotazione rifatta, le spese restano', () => {
  const base = { ...nuoveScelte(), corporazione: 'Freelance', addestramento: 'Avventuriero', classe: 'Agente', puntiCaratteristica: { FOR: 1 } };
  const scheda = { pv: 10, pm: 0 };
  const senza = massimiSessione(scheda, base, dati);
  assert.equal(senza.creditiIniziali, null);
  assert.equal(allineaSessione(null, senza).crediti, null);
  const conDot = { ...base, dotazione: AGENTE, equipaggiamento: vociDotazione(AGENTE, 'Agente', 'Freelance', dati) };
  assert.equal(saldoIniziale(conDot, dati), 1700);
  const m = massimiSessione(scheda, conDot, dati);
  let s = allineaSessione(null, m);
  assert.equal(s.crediti, 1700);
  s = variaSessione(s, 'crediti', -300, m); // spesa al tavolo
  assert.equal(s.crediti, 1400);
  const acq = { ...AGENTE, acquisti: [{ rif: 'armi_distanza:pistola-pesante', cede: ['arma_da_fuoco'] }] };
  const m2 = massimiSessione(scheda, { ...conDot, dotazione: acq }, dati);
  s = allineaSessione(s, m2);
  assert.equal(s.crediti, 600); // 1400 − 800 di conguaglio
  assert.equal(s.creditiIniziali, 900);
  assert.equal(variaSessione(s, 'crediti', -5000, m2).crediti, 0);
});

test('A.5.30 (§7.22): 48 abbinamenti di fucili, armature e scudi, più le 6 pistole di E&L 16; il Revolver resta commerciale', () => {
  const ab = dati.dotazioni.corporativi.abbinamenti;
  assert.deepEqual(Object.keys(ab), ['Bauhaus', 'Capitol', 'Cybertronic', 'Fratellanza', 'Imperiali', 'Mishima']);
  assert.equal(Object.values(ab).reduce((n, a) => n + Object.keys(a).length, 0), 54);
  assert.ok(Object.values(ab).every((a) => !a['armi_distanza:revolver']));
  const cat = catalogo(dati);
  const m = (corp, rif) => cat.perRif.get(modelloAssegnato(rif, corp, dati, cat).rif);
  assert.equal(m('Bauhaus', 'armi_distanza:carabina').nome, 'KR10');
  assert.equal(m('Capitol', 'armi_distanza:fucile-a-pompa').nome, 'M516S'); // modello già presente
  assert.equal(m('Imperiali', 'armature:armatura-civile-media').nome, 'Corazza territoriale dei Clan');
  assert.equal(m('Imperiali', 'armature:armatura-civile-media').catalogo, 'Imperial');
  assert.equal(m('Mishima', 'scudi:scudo-medio').nome, 'Scudo da campo Ashigaru');
  // §7.22.2: valori della tabella e Purificatrice 1 della Fratellanza
  const kr = m('Bauhaus', 'armi_distanza:carabina');
  assert.deepEqual([kr.danno.due_mani, kr.modificatore_va, kr.gittata_q, kr.munizioni.capacita, kr.inc, kr.reperibilita, kr.costo], ['1d6+1', 1, 60, 10, 7, 'CO', 2000]);
  assert.ok(m('Fratellanza', 'armi_distanza:fucile-d-assalto').proprieta.some((p) => p.nome === 'Purificatrice 1'));
  // §7.22.6: il totale dei colpi resta quello della Classe, ripartito entro la capacità reale (KR10 da 10)
  const sol = vociDotazione({ opzioni: { arma_principale: 'armi_distanza:carabina' } }, 'Soldato', 'Bauhaus', dati);
  assert.equal(sol.find((v) => v.uid === 'dot-arma_principale-1').rif, 'armi_distanza_corporative:kr10');
  const mun = sol.find((v) => v.uid === 'dot-arma_principale-munizioni');
  assert.equal(mun.quantita, 45);
  assert.match(mun.note, /3 caricatori compatibili da 10 .*15 sciolti/);
  // i fucili a pompa di base hanno serbatoio fisso: si ricaricano per inserimento (famiglia «Fucili a pompa»)
  assert.equal(m('Mishima', 'armi_distanza:fucile-a-pompa').famiglia, 'Fucili a pompa');
  // 41 profili nuovi con versione 0.52
  assert.equal(cat.oggetti.filter((o) => o.paragrafo?.startsWith('§7.22')).length, 41);
});

test('Giocatore 0.45 §2.16: la dotazione si riceve una sola volta, alla creazione; un’altra Classe non ne assegna', async () => {
  const { calcolaScheda } = await import('../src/calc.js');
  const { MISHIMA_AGENTE } = await import('./personaggi.js');
  assert.equal(dati.regole.dotazioni_iniziali.una_sola_volta, true);
  const equipaggiamento = applicaDotazione([], vociDotazione(AGENTE, 'Agente', 'Mishima', dati));
  const creazione = { ...MISHIMA_AGENTE, dotazione: AGENTE, equipaggiamento };
  // i primi livelli della multiclasse di tests/avanzamento.test.js: al 4° l'Agente prende il Soldato
  const livelli = [
    { livello: 2, caratteristiche: { FOR: 1, COS: 1 } },
    { livello: 3, talentoLibero: { id: 'sempre-allerta' } },
    { livello: 4, grado: { classe: 'Soldato' }, tiroPV: tiro(5), puntiAbilita: { 'Sopravvivenza': 5, 'Atletica': 2 } }, // 7 punti per Grado (A.90)
  ];
  const s1 = calcolaScheda({ versione: 2, creazione, livelli: [] }, dati);
  const s4 = calcolaScheda({ versione: 2, creazione, livelli }, dati);
  assert.deepEqual(s4.errori, []);
  assert.deepEqual(s4.classi.map((c) => c.nome), ['Agente', 'Soldato']);
  // stessa dotazione: nessuna voce del Soldato, le stesse armi e protezioni
  const nomi = (s) => [...(s.equipaggiamento?.armi ?? []), ...(s.equipaggiamento?.protezioni ?? [])].map((x) => x.nome).sort();
  assert.deepEqual(nomi(s4), nomi(s1));
  const chiave = (v) => v.rif ?? v.personalizzato?.nome;
  const soloSoldato = vociDotazione(AGENTE, 'Soldato', 'Mishima', dati).map(chiave).filter((k) => !equipaggiamento.some((e) => chiave(e) === k));
  assert.deepEqual(soloSoldato, ['Comunicatore da squadra']); // la voce del Soldato che l'Agente non ha non arriva
});

test('Magia 1.3 sez. 2: il Focus personale della dotazione è già sintonizzato, non occupa sintonizzazione né dà PM', async () => {
  const { calcolaScheda } = await import('../src/calc.js');
  const { ARCANISTA } = await import('./personaggi.js');
  const scelte = { opzioni: {}, sotto: {}, crediti: tiro(7), acquisti: [] };
  const voci = vociDotazione(scelte, 'Arcanista', 'Fratellanza', dati);
  const focus = voci.find((v) => v.dotazione_id === 'focus-personale');
  assert.ok(focus && !focus.rif && !dati.dotazioni.oggetti_dotazione['focus-personale'].effetti);
  const senza = calcolaScheda({ ...ARCANISTA, corporazione: 'Fratellanza' }, dati);
  const con = calcolaScheda({ ...ARCANISTA, corporazione: 'Fratellanza', dotazione: scelte, equipaggiamento: applicaDotazione([], voci) }, dati);
  assert.equal(con.pm, senza.pm);
  const usata = (s) => s.equipaggiamento?.sintonizzazione?.usata ?? 0;
  assert.equal(usata(con), 0);
  assert.ok(!(con.equipaggiamento?.sintonizzazione?.artefatti ?? []).some((a) => /focus/i.test(a.nome)));
});
