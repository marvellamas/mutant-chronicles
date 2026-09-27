import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colore, riempimento, condizioniAttiveAbilita } from '../src/interfaccia.js';
import { calcolaScheda } from '../src/calc.js';
import { inizializzaSessione } from '../src/sessione.js';
import { validaDati } from '../src/validate.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const soglie = dati.regole.interfaccia.barre_pv_pm;
const problemi = (modifica) => { const d = structuredClone(dati); modifica(d); return validaDati(d).map((e) => `${e.file} ${e.chiave}: ${e.problema}`).join('\n'); };

test('barre PV/PM: soglie in regole.json, verde sopra il 75%, rosso sotto il 25%, giallo fra i due', () => {
  assert.deepEqual(soglie, { verde_sopra: 0.75, rosso_sotto: 0.25 });
  assert.equal(colore(16, 16, soglie), 'verde');
  assert.equal(colore(13, 16, soglie), 'verde'); // 81%
  assert.equal(colore(12, 16, soglie), 'giallo'); // 75% esatto: non «sopra»
  assert.equal(colore(4, 16, soglie), 'giallo'); // 25% esatto: non «sotto»
  assert.equal(colore(3, 16, soglie), 'rosso');
  assert.equal(colore(0, 16, soglie), 'rosso');
  assert.equal(colore(5, 0, soglie), null); // nessun massimo: nessuna barra colorata
  assert.equal(colore(undefined, 10, soglie), null);
  // le soglie vengono dai dati: cambiandole cambia il colore
  assert.equal(colore(12, 16, { verde_sopra: 0.5, rosso_sotto: 0.1 }), 'verde');
  assert.deepEqual([riempimento(8, 16), riempimento(20, 16), riempimento(-1, 16), riempimento(3, 0)], [50, 100, 0, 0]);
});

test('validatore: soglie delle barre', () => {
  assert.match(problemi((d) => { d.regole.interfaccia.barre_pv_pm = { verde_sopra: 0.2, rosso_sotto: 0.5 }; }), /interfaccia\.barre_pv_pm/);
  assert.match(problemi((d) => { delete d.regole.interfaccia; }), /interfaccia\.barre_pv_pm/);
});

test('modalità di fuoco: ogni sigla del catalogo ha la sua voce del §5.10; il validatore lo controlla', () => {
  const mf = dati.regole.modalita_di_fuoco;
  const usate = new Set(Object.values(dati.equipaggiamento.file).flatMap((f) => (f.oggetti ?? []).flatMap((o) => o.modalita ?? [])));
  assert.ok(usate.size >= 7);
  for (const s of usate) assert.ok(mf[s], `manca ${s}`);
  assert.deepEqual([mf.RB.colpi_consumati, mf.RB.modificatore_va, mf.RM.modificatore_va, mf.RL.colpi_consumati], [3, 2, -2, 10]);
  assert.deepEqual([mf.TM.azioni_principali, mf.FS.modificatore_va, mf.DC.colpi_consumati], [2, -4, 2]);
  assert.equal(mf.S.nome, 'Tiro Singolo');
  assert.ok(Object.values(mf).filter((x) => typeof x === 'object').every((x) => x.paragrafo === '§5.10'));
  assert.deepEqual(validaDati(dati), []);
  // una sigla del catalogo senza voce
  assert.match(problemi((d) => { delete d.regole.modalita_di_fuoco.DC; }), /la sigla "DC" non ha una voce in regole\.json → modalita_di_fuoco/);
  // voce incompleta
  assert.match(problemi((d) => { d.regole.modalita_di_fuoco.RB.colpi_consumati = 0; }), /modalita_di_fuoco\.RB\.colpi_consumati/);
  assert.match(problemi((d) => { delete d.regole.modalita_di_fuoco.TR.regola; }), /modalita_di_fuoco\.TR\.regola/);
});

test('effetto_breve: frasi del manuale su sanitario, accessori e munizioni; il validatore rifiuta i vuoti', () => {
  const trova = (file, id) => dati.equipaggiamento.file[file].oggetti.find((o) => o.id === id);
  assert.equal(trova('sanitario', 'cartuccia-curativa').effetto_breve, 'Recupera 1d6 PV, fino ai PV massimi');
  assert.equal(trova('accessori_armi', 'bipiede').effetto_breve, 'Concede +1 VA per colpire finché il personaggio mantiene posizione e appoggio.');
  assert.match(trova('munizioni', 'razzo-standard').effetto_breve, /^Danno 1d10\+1, AC 1d3, RS 2 Q/);
  // oggetti senza effetto: nessuna riga
  assert.equal(trova('munizioni', 'proiettili-da-pistola').effetto_breve, undefined);
  assert.match(problemi((d) => { d.equipaggiamento.file.sanitario.oggetti[0].effetto_breve = ' '; }), /effetto_breve: testo non vuoto/);
});

// Agente Mishima (FOR 6) con armatura civile pesante (FOR 7, Agilità −2, attacchi −2, §7.11.1)
const voce = (uid, rif, stato) => ({ uid, rif, stato, quantita: 1, note: '' });
const scheda = (equipaggiamento, sessione = null) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento }, livelli: [], ...(sessione ? { sessione } : {}) }, dati);
const sessione = (modifica) => ({ ...inizializzaSessione({ pv: 10, pm: 5, puntiEroe: 10, ferite: 6, caricatori: {} }), ...modifica });

test('«Condizioni attive»: vuoto senza condizioni né equipaggiamento che tocca le Abilità', () => {
  assert.deepEqual(condizioniAttiveAbilita(scheda([]), dati), []);
  assert.deepEqual(condizioniAttiveAbilita(scheda([], sessione({})), dati), []);
  // un'armatura Leggera senza penalità alle Abilità: resta solo il lancio −1, come uso specifico
  const leggera = condizioniAttiveAbilita(scheda([voce('a', 'armature:armatura-civile-leggera', 'indossata')]), dati);
  assert.deepEqual(leggera.map((c) => [c.fonte, c.testo, c.uso, c.vedi]), [['uso', '−1 a Potere', 'lancio', 'Magia']]);
  // uno zaino con un'armatura non indossata non conta
  assert.deepEqual(condizioniAttiveAbilita(scheda([voce('a', 'armature:armatura-civile-pesante', 'zaino')]), dati), []);
});

test('«Condizioni attive»: prima la sessione, poi l’equipaggiamento, con effetto e verso', () => {
  const s = scheda([voce('a', 'armature:armatura-civile-pesante', 'indossata')], sessione({ ferite: 2, statiAttivi: ['a-terra', 'assordato'] }));
  const c = condizioniAttiveAbilita(s, dati);
  assert.deepEqual(c.map((x) => [x.fonte, x.nome]), [
    ['sessione', 'Ferita Importante'], ['sessione', 'A Terra'], ['equipaggiamento', 'Armatura civile pesante'], ['uso', 'Armatura civile pesante'],
  ]); // Assordato non ha effetto numerico: resta promemoria
  assert.equal(c[0].testo, '−2 a tutte le Abilità e Salvezze');
  assert.equal(c[1].testo, '−4 alle Prove fisiche ravvicinate (Armi da guerra, Armi da mischia, Corpo a corpo e Difese)');
  assert.equal(c[2].testo, '−2 ad attacchi, Atletica e Furtività; −1 per FOR insufficiente ad Atletica, Furtività, Difese e attacchi');
  // il lancio con Potere è un uso specifico: riga a parte, il VA di Potere non cambia
  assert.deepEqual([c[3].testo, c[3].uso], ['−5 a Potere', 'lancio']);
  assert.ok(c.every((x) => x.verso === 'malus'));
  // Affaticamento: nome con la sua scala
  const stanco = condizioniAttiveAbilita(scheda([], sessione({ affaticamento: dati.regole.affaticamento.stati.findIndex((x) => x.nome === 'Stanco') })), dati);
  assert.deepEqual(stanco.map((x) => `${x.nome}: ${x.testo}`), ['Stanco (Affaticamento): −2 a tutte le Abilità e Salvezze']);
});
