// Utility «Attacco a distanza» (src/attacco.js; Giocatore §5.2, §5.8, §5.10, §5.11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaAttaccoDistanza, vincoliDistanza, fasciaDistanza, azioniDistanza, attaccoBase } from '../src/attacco.js';
import { calcolaScheda } from '../src/calc.js';
import { inizializzaSessione } from '../src/sessione.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();

// arma di prova: fucile di precisione con mirino di Precisione (§5.11: «Con VA 18…»)
const PRECISIONE = { riduzione: 6, distanza_max_q: null, azp_minime: 2, nome: 'Mirino di precisione' };
const arma = (modifiche = {}) => ({
  uid: 'f', rif: 'armi_distanza:fucile-di-precisione', nome: 'Fucile', tipo: 'arma_distanza', abilita: 'Armi medie',
  va: 18, vaEffettivo: 18, scomposizione: [{ etichetta: 'VA Armi medie', valore: 18, fonte: 'regole' }],
  danno: { una_mano: '1d8+1', due_mani: null }, mani: 2, ac: 1, gittataQ: 1500, modalita: ['S', 'RB', 'RM', 'RL', 'TR'],
  mirino: null, accessori: [], ...modifiche,
});
const classeTalento = (classe, nome) => dati.classi.classi.find((c) => c.nome === classe).talenti_a_scelta.concat(dati.classi.classi.find((c) => c.nome === classe).talenti_fissi).find((t) => t.nome === nome);
const pg = ({ liberi = [], classe = [], colpi = 30, principali = 1 } = {}) => ({
  scheda: { talentiLiberi: liberi.map((id) => ({ id })), classi: [{ talenti: classe }], azioni: { principali } },
  sessione: { munizioni: { f: { colpi, riserve: 0 } } },
});
const attacca = (p, a, d) => calcolaAttaccoDistanza(p, a, d, dati);

test('§5.11, esempio: VA 18 a 800 Q con mirino di Precisione e Tiro a Lunga Distanza → 10; Mira Rapida e Tiro Mirato', () => {
  const a = arma({ mirino: PRECISIONE });
  const r = attacca(pg({ liberi: ['tiro-a-lunga-distanza'] }), a, { distanza: 800 });
  assert.equal(r.va_finale, 10);
  assert.equal(r.azioni_principali, 3);
  assert.equal(r.impossibile, null);
  // Mira Rapida: tre Azioni diventano due
  assert.equal(attacca(pg({ liberi: ['tiro-a-lunga-distanza', 'mira-rapida'] }), a, { distanza: 800 }).azioni_principali, 2);
  // con Tiro Mirato: +2 → 12, un'Azione in più: tre Azioni totali (con Mira Rapida)
  const m = attacca(pg({ liberi: ['tiro-a-lunga-distanza', 'mira-rapida'] }), a, { distanza: 800, mirato: true });
  assert.equal(m.va_finale, 12);
  assert.equal(m.azioni_principali, 3);
  // senza Mira Rapida il Tiro Mirato a 800 Q richiede quattro Azioni
  assert.equal(attacca(pg({ liberi: ['tiro-a-lunga-distanza'] }), a, { distanza: 800, mirato: true }).azioni_principali, 4);
});

test('scomposizione completa: ogni voce con fonte e paragrafo, la somma è il VA finale', () => {
  const r = attacca(pg({ liberi: ['tiro-a-lunga-distanza'] }), arma({ mirino: PRECISIONE }), {
    distanza: 800, movimento: 'passo', bersaglio: { movimento: 'corsa', copertura: 'leggera' },
  });
  assert.deepEqual(r.scomposizione.map((x) => [x.etichetta, x.valore, x.fonte, x.paragrafo]), [
    ['VA Armi medie', 18, 'regole', null],
    ['Bersaglio in corsa', -2, 'bersaglio', 'Giocatore §5.2'],
    ['Bersaglio in Copertura leggera', -2, 'copertura', 'Giocatore §5.8'],
    ['Distanza 800 Q', -16, 'distanza', 'Giocatore §5.11'],
    ['Mirino di precisione', 6, 'mirino', 'Giocatore §5.11'],
    ['Tiro a Lunga Distanza', 2, 'talento', 'Giocatore §5.11'],
  ]);
  assert.equal(r.va_finale, 6);
  assert.equal(r.azioni_movimento, 1);
});

test('mirino: non trasforma la penalità in bonus; oltre la sua distanza non riduce', () => {
  const reflex = { riduzione: 2, distanza_max_q: 80, azp_minime: 1, nome: 'Mirino Reflex' };
  assert.equal(attacca(pg(), arma({ mirino: reflex }), { distanza: 15 }).va_finale, 18); // −2 + 2
  assert.equal(attacca(pg(), arma({ mirino: reflex }), { distanza: 5 }).va_finale, 18); // nessuna penalità, nessun bonus
  const oltre = attacca(pg(), arma({ mirino: reflex }), { distanza: 100 });
  assert.equal(oltre.va_finale, 18 - 8);
  assert.ok(oltre.promemoria.some((p) => p.includes('oltre 80 Q')));
  // Ottico: almeno 2 Azioni anche a breve distanza
  const ottico = { riduzione: 4, distanza_max_q: 500, azp_minime: 2, nome: 'Mirino Ottico' };
  assert.equal(attacca(pg(), arma({ mirino: ottico }), { distanza: 30 }).azioni_principali, 2);
});

test('fasce di distanza e Azioni oltre la tabella (§5.11)', () => {
  assert.equal(fasciaDistanza(10, dati).va, 0);
  assert.equal(fasciaDistanza(11, dati).va, -2);
  assert.equal(fasciaDistanza(1500, dati).va, -18);
  assert.equal(fasciaDistanza(1501, dati).va, -20);
  assert.equal(fasciaDistanza(2001, dati).va, -22);
  assert.deepEqual([80, 81, 500, 501, 1500, 1600].map((q) => azioniDistanza(q, dati)), [1, 2, 2, 3, 4, 5]);
});

test('Raffica Breve: +2, con Raffica Breve Migliorata +4; munizioni e colpi a segno', () => {
  const r = attacca(pg(), arma(), { modalita: 'RB', distanza: 5 });
  assert.equal(r.va_finale, 20);
  assert.equal(r.munizioni, 3);
  assert.equal(r.colpi_a_segno, 1);
  const m = attacca(pg({ liberi: ['raffica-breve-migliorata'] }), arma(), { modalita: 'RB', distanza: 5 });
  assert.equal(m.va_finale, 22);
  assert.equal(m.scomposizione.at(-1).etichetta, 'Raffica Breve (Raffica Breve Migliorata)');
  // Ottimizzare Proiettili (Artigliere): la Raffica Lunga consuma 8 colpi, i colpi a segno restano 5
  const l = attacca(pg({ classe: [classeTalento('Artigliere', 'Ottimizzare Proiettili')] }), arma(), { modalita: 'RL', distanza: 5 });
  assert.deepEqual([l.munizioni, l.colpi_a_segno, l.va_finale], [8, 5, 12]);
});

test('Tiro Ravvicinato obbligatorio se il bersaglio ti impegna; impossibile con un’Arma pesante', () => {
  const pistola = arma({ abilita: 'Armi leggere', rif: 'armi_distanza:pistola-semiautomatica', mani: 1, danno: { una_mano: '1d6', due_mani: null } });
  const r = attacca(pg(), pistola, { distanza: 2, bersaglio: { tiImpegna: true } });
  assert.equal(r.va_finale, 16); // −2 con Armi leggere
  assert.equal(r.danno_per_colpo, '1d6+3');
  assert.ok(r.promemoria[0].includes('devi usare il Tiro Ravvicinato'));
  // Istintivo −2 di penalità, Migliorato +5 danni
  const t = attacca(pg({ liberi: ['tiro-ravvicinato-istintivo', 'tiro-ravvicinato-migliorato'] }), pistola, { distanza: 2, bersaglio: { tiImpegna: true } });
  assert.deepEqual([t.va_finale, t.danno_per_colpo], [18, '1d6+5']);
  const pesante = attacca(pg(), arma({ abilita: 'Armi pesanti' }), { distanza: 2, bersaglio: { tiImpegna: true } });
  assert.match(pesante.impossibile.motivo, /Tiro Ravvicinato non possibile: serve un’Arma leggera o media/);
});

test('Tiro a Bruciapelo: danno ×2, non si somma al +3 del Tiro Ravvicinato; bersaglio ignaro', () => {
  const pistola = arma({ abilita: 'Armi leggere', mani: 1, danno: { una_mano: '1d6', due_mani: null } });
  const r = attacca(pg(), pistola, { distanza: 1, bruciapelo: true, bersaglio: { ignaro: true } });
  assert.deepEqual([r.va_finale, r.danno_per_colpo, r.impossibile], [18, '(1d6) ×2', null]);
  const consapevole = attacca(pg(), pistola, { distanza: 1, bruciapelo: true });
  assert.match(consapevole.impossibile.motivo, /ignaro/);
  assert.equal(attacca(pg({ liberi: ['tiro-a-bruciapelo-migliorato'] }), pistola, { distanza: 1, bruciapelo: true }).impossibile, null);
  // impegnato dal bersaglio al Contatto: Tiro Ravvicinato obbligatorio (−2) e Bruciapelo ×2 senza il +3
  const entrambi = attacca(pg({ liberi: ['tiro-a-bruciapelo-migliorato'] }), pistola, { distanza: 1, bruciapelo: true, bersaglio: { tiImpegna: true } });
  assert.deepEqual([entrambi.va_finale, entrambi.danno_per_colpo, entrambi.impossibile], [16, '(1d6) ×2', null]);
  assert.ok(entrambi.promemoria.some((p) => p.startsWith('Il bonus al danno di Tiro Ravvicinato')));
});

test('Copertura Totale del bersaglio → impossibile; distanza oltre la gittata → impossibile', () => {
  assert.match(attacca(pg(), arma(), { distanza: 10, bersaglio: { copertura: 'totale' } }).impossibile.motivo, /Copertura Totale/);
  assert.match(attacca(pg(), arma({ gittataQ: 30 }), { distanza: 31 }).impossibile.motivo, /Oltre la gittata massima dell’arma \(30 Q\)/);
});

test('Tiro Mirato non ammesso con Raffica Media, né con Corsa o Scatto; il motivo è quello del manuale', () => {
  const v = vincoliDistanza(pg(), arma(), { modalita: 'RM', mirato: true }, dati);
  assert.match(v.mirato, /Tiro Mirato si usa solo con Tiro Singolo o Raffica Breve/);
  assert.match(attacca(pg(), arma(), { modalita: 'RM', mirato: true }).impossibile.motivo, /^Tiro Mirato non ammesso/);
  assert.match(vincoliDistanza(pg(), arma(), { movimento: 'corsa', mirato: true }, dati).mirato, /Corsa o Scatto/);
  // Tiro Mirato Migliorato: +4 VA e +4 danni
  const m = attacca(pg({ liberi: ['tiro-mirato-migliorato'] }), arma(), { mirato: true, distanza: 5 });
  assert.deepEqual([m.va_finale, m.danno_per_colpo, m.azioni_principali], [22, '1d8+5', 2]);
});

test('munizioni insufficienti → impossibile, con la modalità inferiore proposta', () => {
  const r = attacca(pg({ colpi: 4 }), arma(), { modalita: 'RL', distanza: 5 });
  assert.match(r.impossibile.motivo, /servono 10 munizioni, nel caricatore 4/);
  assert.deepEqual(r.impossibile.proposta, { modalita: 'RB', nome: 'Raffica Breve' });
  const v = vincoliDistanza(pg({ colpi: 4 }), arma(), {}, dati);
  assert.deepEqual([v.modalita.S, v.modalita.RB, v.modalita.RM === null], [null, null, false]);
});

test('bersaglio impegnato: −4 e seconda Prova a −4; Fuoco di Precisione −2/−2; Fuoco Controllato niente', () => {
  const r = attacca(pg(), arma(), { distanza: 5, bersaglio: { impegnato: true } });
  assert.equal(r.va_finale, 14);
  assert.deepEqual([r.seconda_prova.va, r.seconda_prova.modificatore], [14, -4]);
  const p = attacca(pg({ liberi: ['fuoco-di-precisione'] }), arma(), { distanza: 5, bersaglio: { impegnato: true } });
  assert.deepEqual([p.va_finale, p.seconda_prova.va], [16, 16]);
  const c = attacca(pg({ classe: [classeTalento('Agente', 'Fuoco Controllato')] }), arma(), { distanza: 5, bersaglio: { impegnato: true } });
  assert.deepEqual([c.va_finale, c.seconda_prova], [18, null]);
});

test('movimento: proprio ed evasivo (§5.2), Movimento Tattico; Copertura propria e Copertura Tattica (§5.8)', () => {
  const s = attacca(pg(), arma(), { distanza: 5, movimento: 'scatto' });
  assert.deepEqual([s.va_finale, s.azioni_movimento], [12, 1]);
  const ev = attacca(pg(), arma(), { distanza: 5, movimento: 'corsa', evasivo: true, bersaglio: { movimento: 'scatto', evasivo: true, evasivoMigliorato: true } });
  assert.equal(ev.va_finale, 18 - 2 - 8);
  assert.equal(ev.azioni_principali, 2); // il Movimento Evasivo consuma anche un'Azione Principale
  assert.equal(attacca(pg({ classe: [classeTalento('Incursore', 'Movimento Tattico')] }), arma(), { distanza: 5, movimento: 'scatto' }).va_finale, 14);
  const cop = attacca(pg({ liberi: ['copertura-tattica'] }), arma(), { distanza: 5, coperturaPropria: 'media' });
  assert.deepEqual([cop.va_finale, cop.azioni_movimento], [16, 1]);
  assert.match(vincoliDistanza(pg(), arma(), { movimento: 'corsa', coperturaPropria: 'leggera' }, dati).coperturaPropria, /Passo/);
});

test('Imbracciatura: −4 senza; muovendosi si perde; Postura d’Assedio da fermo +1 danno', () => {
  const mg = arma({ abilita: 'Armi pesanti', rif: 'armi_distanza:mitragliatore-leggero' });
  assert.equal(attacca(pg(), mg, { distanza: 5, imbracciata: false }).va_finale, 14);
  assert.equal(attacca(pg(), mg, { distanza: 5, imbracciata: true }).va_finale, 18);
  assert.equal(attacca(pg(), mg, { distanza: 5, imbracciata: true, movimento: 'passo' }).va_finale, 14);
  const lg = arma({ abilita: 'Armi medie', rif: 'armi_distanza:lanciagranate' });
  assert.equal(attacca(pg(), lg, { distanza: 5, imbracciata: false }).va_finale, 14);
  const postura = attacca(pg({ classe: [classeTalento('Artigliere', 'Postura d’Assedio')] }), mg, { distanza: 5, imbracciata: false });
  assert.deepEqual([postura.va_finale, postura.danno_per_colpo], [18, '1d8+2']);
});

test('Doppio Colpo e Tiro Rapido: applicazioni e tiri', () => {
  const doppietta = arma({ modalita: ['S', 'TR', 'DC'], ac: 2 });
  const dc = attacca(pg(), doppietta, { modalita: 'DC', distanza: 5 });
  assert.deepEqual([dc.va_finale, dc.munizioni, dc.applicazioni], [14, 2, 4]);
  const tr = attacca(pg({ liberi: ['tiro-rapido-migliorato'] }), arma(), { modalita: 'TR', distanza: 5 });
  assert.deepEqual([tr.va_finale, tr.tiri, tr.munizioni], [16, 2, 2]);
});

test('personaggio reale: parte dal VA per colpire effettivo della scheda (Specializzazione, condizioni)', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [{ uid: 'p', rif: 'armi_distanza:pistola-semiautomatica', stato: 'impugnata', quantita: 1, note: '' }] };
  const sessione = { ...inizializzaSessione({ pv: 10, pm: 5, puntiEroe: 10, ferite: 6, caricatori: { p: 15 } }), ferite: 2 };
  const scheda = calcolaScheda({ creazione, livelli: [], sessione }, dati);
  const p = scheda.equipaggiamento.armi[0];
  const r = calcolaAttaccoDistanza({ scheda, sessione }, p, { distanza: 15 }, dati);
  assert.equal(r.va_finale, p.vaEffettivo - 2);
  assert.ok(r.scomposizione.some((x) => x.fonte === 'ferite'));
  // DES 7 al 1° livello: +1 al danno delle Armi leggere (§5.13)
  assert.equal(r.danno_per_colpo, '1d6+1');
  assert.equal(attaccoBase(p).va_finale, p.vaEffettivo);
});

test('tooltip delle modalità e delle manovre: riga compatta e regola dai dati (§5.10)', async () => {
  const { descriviModalita, descriviManovraDistanza } = await import('../src/attacco.js');
  const { dati: d } = await (await import('./helpers.js')).datiReali();
  assert.equal(descriviModalita('RB', d).riga, '3 colpi · 1 a segno · +2 VA');
  assert.equal(descriviModalita('RM', d).riga, '5 colpi · 3 a segno · −2 VA');
  assert.equal(descriviModalita('FS', d).riga, '10 colpi · Area 3 × 3 Q · −4 VA');
  assert.equal(descriviModalita('DC', d).riga, '2 colpi · 4 applicazioni · −4 VA');
  const rb = descriviModalita('RB', d).info;
  assert.equal(rb.titolo, 'Raffica Breve');
  assert.deepEqual(rb.sezioni.map((s) => s.etichetta), ['Munizioni consumate', 'Colpi a segno', 'VA', 'Azioni', 'Manovre compatibili', 'Regola', 'Note']);
  assert.match(rb.sezioni.find((s) => s.etichetta === 'VA').testo, /Raffica Breve Migliorata: \+4/);
  // con il Talento: VA migliorato nella riga
  const T = [{ nome: 'Raffica Breve Migliorata', e: { modalita: { RB: { va: 4 } } } }];
  assert.equal(descriviModalita('RB', d, T).riga, '3 colpi · 1 a segno · +4 VA');
  assert.equal(descriviManovraDistanza('mirato', null, d).riga, '+2 VA · +2 danno · +1 AzP');
  assert.equal(descriviManovraDistanza('ravvicinato', { abilita: 'Armi medie' }, d).riga, '−4 VA · +3 danno');
  assert.equal(descriviManovraDistanza('bruciapelo', null, d).riga, 'danno ×2');
  assert.match(descriviManovraDistanza('mirato', null, d).info.sezioni.find((s) => s.etichetta === 'Non si combina con').testo, /Tiro Ravvicinato/);
});
