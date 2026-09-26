import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { condizioniAttive, formulaScomposizione } from '../src/condizioni.js';
import { inizializzaSessione } from '../src/sessione.js';
import { preparaStampa, preparaTab } from '../src/stampa.js';
import { nomeFileEsportazione, serializza, deserializzaPersonaggio } from '../src/character.js';
import { validaDati } from '../src/validate.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();

// Agente Mishima (FOR 6) con armatura civile pesante (FOR 7: Agilità −2, attacchi −2, FOR insufficiente
// −1, Armamenti §7.11.1) e Tonfa impugnato (Difensiva +2, §7.1.3)
const voce = (uid, rif, stato) => ({ uid, rif, stato, quantita: 1, note: '' });
const CREAZIONE = {
  ...MISHIMA_AGENTE,
  equipaggiamento: [voce('a', 'armature:armatura-civile-pesante', 'indossata'), voce('t', 'armi:tonfa', 'impugnata')],
};
const sessione = (modifica = {}) => ({ ...inizializzaSessione({ pv: 10, pm: 5, puntiEroe: 10, ferite: 6, caricatori: {} }), ...modifica });
const scheda = (s = null) => calcolaScheda({ creazione: CREAZIONE, livelli: [], ...(s ? { sessione: s } : {}) }, dati);
const abil = (sc, nome) => sc.abilita.find((a) => a.nome === nome);
const etichette = (voci) => voci.map((x, i) => `${i && x.valore > 0 ? '+' : ''}${x.valore} ${x.etichetta}`);

test('Ferita Importante + armatura + Difensiva: scomposizione con etichette e fonti', () => {
  const riposo = scheda();
  const s = scheda(sessione({ ferite: 2 }));

  // §5.14: Importante −2 a VA e Prove Salvezza; §7.11.1: Agilità e FOR insufficiente sull'Abilità
  const furt = abil(s, 'Furtività');
  assert.deepEqual(etichette(furt.scomposizione), [
    `${furt.totale} Valore da regole`, '-2 Agilità (Armatura civile pesante)', '-1 FOR insufficiente (Armatura civile pesante)', '-2 Ferita Importante',
  ]);
  assert.equal(furt.effettivo, furt.totale - 5);
  assert.deepEqual(furt.scomposizione.map((x) => x.fonte), ['regole', 'equipaggiamento', 'equipaggiamento', 'ferite']);

  // Parata con il Tonfa: Difese da regole, FOR insufficiente dell'armatura, Difensiva, Ferita
  const tonfa = s.equipaggiamento.armi.find((a) => a.nome === 'Tonfa');
  const difese = abil(s, 'Difese');
  assert.deepEqual(etichette(tonfa.parata.scomposizione), [
    `${difese.totale} VA Difese`, '-1 FOR insufficiente (Armatura civile pesante)', '+2 Difensiva (Tonfa)', '-2 Ferita Importante',
  ]);
  assert.equal(tonfa.parata.vaEffettivo, difese.totale - 1 + 2 - 2);
  assert.equal(tonfa.parata.va, difese.totale - 1 + 2); // a riposo, come in stampa

  // VA per colpire: l'armatura è già nell'arma, la Ferita si aggiunge
  assert.equal(tonfa.vaEffettivo, tonfa.va - 2);
  assert.ok(etichette(tonfa.scomposizione).includes('-2 Ferita Importante'));
  assert.equal(tonfa.vaDaRegole, abil(s, 'Armi da mischia').totale);

  // Salvezze: −2 dalla Ferita
  for (const [id, x] of Object.entries(s.salvezze)) {
    assert.equal(x.effettivo, x.totale - 2, id);
    assert.equal(x.totale, riposo.salvezze[id].totale, id);
  }

  // il totale da regole non cambia: l'avanzamento continua a usarlo
  for (const a of s.abilita) {
    assert.equal(a.totale, abil(riposo, a.nome).totale, a.nome);
    assert.equal(a.vaEquip, abil(riposo, a.nome).vaEquip, a.nome);
  }
  // senza sessione l'effettivo coincide con il valore a riposo (regole + equipaggiamento)
  for (const a of riposo.abilita) assert.equal(a.effettivo, a.vaEquip, a.nome);
});

test('formula della scomposizione in una riga', () => {
  assert.equal(formulaScomposizione('Furtività', [
    { etichetta: 'Valore da regole', valore: 11 }, { etichetta: 'Ferita Importante', valore: -2 }, { etichetta: 'Difensiva (Tonfa)', valore: 2 },
  ]), 'Furtività 11 = 11 (Valore da regole) − 2 (Ferita Importante) + 2 (Difensiva (Tonfa))');
});

test('Affaticamento e Stati: solo gli effetti numerici del §5.18, dove il manuale li dà', () => {
  const riposo = scheda();
  const delta = (s, nome) => abil(s, nome).effettivo - abil(riposo, nome).effettivo;
  const deltaSalv = (s) => s.salvezze.tempra.effettivo - riposo.salvezze.tempra.effettivo;

  // §5.19: Stanco −2 a tutte le Prove di Abilità e Salvezza
  const stanco = scheda(sessione({ affaticamento: dati.regole.affaticamento.stati.findIndex((x) => x.nome === 'Stanco') }));
  assert.equal(delta(stanco, 'Cultura'), -2);
  assert.equal(deltaSalv(stanco), -2);

  // §5.5 A Terra: −4 alle azioni ravvicinate e alle Difese; le armi a distanza no
  const aTerra = scheda(sessione({ statiAttivi: ['a-terra'] }));
  assert.equal(delta(aTerra, 'Difese'), -4);
  assert.equal(delta(aTerra, 'Armi da mischia'), -4);
  assert.equal(delta(aTerra, 'Armi leggere'), 0);
  assert.equal(deltaSalv(aTerra), 0);
  const tonfa = aTerra.equipaggiamento.armi[0];
  assert.equal(tonfa.vaEffettivo, tonfa.va - 4);
  assert.equal(tonfa.parata.vaEffettivo, tonfa.parata.va - 4);

  // Incendiato −2 VA (non le Salvezze); Terrorizzato −4 anche alle Salvezze (per-davide A.17)
  const incendiato = scheda(sessione({ statiAttivi: ['incendiato'] }));
  assert.equal(delta(incendiato, 'Cultura'), -2);
  assert.equal(deltaSalv(incendiato), 0);
  assert.equal(deltaSalv(scheda(sessione({ statiAttivi: ['terrorizzato'] }))), -4);

  // Rallentato: −2 alle Abilità fisiche (Difese comprese), non alle altre
  const rallentato = scheda(sessione({ statiAttivi: ['rallentato'] }));
  assert.equal(delta(rallentato, 'Atletica'), -2);
  assert.equal(delta(rallentato, 'Difese'), -2);
  assert.equal(delta(rallentato, 'Medicina'), 0);

  // Stati senza effetto numerico: restano promemoria
  assert.deepEqual(condizioniAttive(sessione({ statiAttivi: ['assordato', 'stordito', 'svenuto'] }), dati), []);
  // le condizioni si sommano
  const tutte = scheda(sessione({ ferite: 1, statiAttivi: ['a-terra', 'rallentato'] }));
  assert.equal(delta(tutte, 'Difese'), -1 - 4 - 2);
});

test('la stampa resta a riposo; le tab mostrano i valori effettivi', () => {
  const p = { creazione: CREAZIONE, livelli: [] };
  const s = sessione({ ferite: 2 });
  const riga = (st, nome) => st.fogli.find((f) => f.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === nome);
  const stampa = preparaStampa(p, dati);
  const tab = preparaTab(p, dati, { sessione: s });
  const tabRiga = tab.tab.find((t) => t.id === 'abilita').dati.categorie.flatMap((c) => c.abilita).find((a) => a.nome === 'Cultura');
  assert.equal(riga(stampa, 'Cultura').effettivo, riga(stampa, 'Cultura').va);
  assert.equal(tabRiga.effettivo, tabRiga.va - 2);
  assert.equal(tabRiga.va, riga(stampa, 'Cultura').va);
  const comb = tab.tab.find((t) => t.id === 'combattimento').dati;
  assert.equal(comb.difese.effettivo, comb.difese.va - 2);
  const salv = tab.tab.find((t) => t.id === 'identita').dati.salvezze;
  assert.ok(salv.every((x) => x.effettivo === x.totale - 2));
});

test('validatore: effetto di uno Stato con Abilità inesistente o campo sconosciuto', () => {
  const d = structuredClone(dati);
  d.regole.stati.elenco[0].effetto = { va_abilita: { Cucina: -2 }, bonus: 1, fonte: '§5.18' };
  const problemi = validaDati(d).map((e) => `${e.chiave}: ${e.problema}`);
  assert.ok(problemi.some((p) => /va_abilita\.Cucina/.test(p)), problemi.join('\n'));
  assert.ok(problemi.some((p) => /effetto\.bonus/.test(p)), problemi.join('\n'));
});

test('export: nome del file <nome>_liv<N>_<AAAA-MM-GG>.json; l’import non dipende dal nome', () => {
  const data = new Date(2026, 8, 26);
  assert.equal(nomeFileEsportazione('Sorella Ilaria Venn', 12, data), 'Sorella-Ilaria-Venn_liv12_2026-09-26.json');
  assert.equal(nomeFileEsportazione('  Dex  "Il Gatto" Moreau: v2/3?  ', 5, data), 'Dex-Il-Gatto-Moreau-v23_liv5_2026-09-26.json');
  assert.equal(nomeFileEsportazione('Ælfric d’Arcy', 1, data), 'Ælfric-d’Arcy_liv1_2026-09-26.json');
  assert.equal(nomeFileEsportazione('', 3, data), 'personaggio_liv3_2026-09-26.json');
  assert.equal(nomeFileEsportazione('***', 1, new Date(2027, 0, 5)), 'personaggio_liv1_2027-01-05.json');
  assert.equal(nomeFileEsportazione(undefined, undefined, data), 'personaggio_liv1_2026-09-26.json');
  // l'import legge il contenuto: il nome del file non entra
  const testo = serializza({ ...MISHIMA_AGENTE }, { livelli: [] });
  assert.equal(deserializzaPersonaggio(testo).creazione.nome, 'Kenji');
});
