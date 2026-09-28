// Collaudo: tre personaggi di riferimento costruiti dall'interfaccia (wizard, «Sali di livello»,
// lista dell'equipaggiamento) ed esportati con «Esporta JSON» in tests/collaudo/. I valori attesi
// sono ricalcolati a mano dal Manuale del Giocatore v0.43 e dal Manuale degli Armamenti v0.50: il
// commento accanto a ogni valore riporta il calcolo e il paragrafo. Basi degli Addestramenti e 10 Punti
// Abilità Liberi per assegnazione dal Doc del Giocatore del 27/09/2026: i JSON hanno i 5 punti in più
// per assegnazione aggiunti a mano, e i PDF di riferimento sono precedenti a questo cambio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, sessioneDopoLivello } from '../src/sessione.js';
import { conOrdinale } from '../src/lingua.js';
import { preparaStampa } from '../src/stampa.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const leggi = (f) => {
  const p = deserializzaPersonaggio(readFileSync(new URL(`collaudo/${f}`, import.meta.url), 'utf8'));
  return { ...p, creazione: normalizza(p.creazione, dati).scelte };
};
const scheda = (p, modifica = (x) => x) => calcolaScheda({ creazione: modifica(p.creazione), livelli: p.livelli }, dati);
const car = (s) => Object.fromEntries(Object.entries(s.caratteristiche).map(([k, v]) => [k, v.valore]));
const salv = (s) => Object.fromEntries(Object.entries(s.salvezze).map(([k, v]) => [k, v.totale]));
const va = (s, nome) => s.abilita.find((a) => a.nome === nome);

test('collaudo a: Imperiali Combattente Assaltatore, 8° livello', () => {
  const p = leggi('a_imperiale_assaltatore_l8.json');
  const s = scheda(p);
  assert.equal(s.livello, 8);
  assert.deepEqual(s.errori, []);
  // §2.9 Imperiali 6/6/5/4/5/5; §2.1 +1 FOR, +1 COS, +2 DES, +1 SAG; §8.2 livello 2 FOR+1 COS+1, livello 6 DES+1 SAG+1
  assert.deepEqual(car(s), { FOR: 8, COS: 8, DES: 8, INT: 4, SAG: 7, CAR: 5 });
  // §1.2.3: 8 + Mod Salvezza (8 → +2, 7 → +1, 5 → 0) + Combattente (+1 Tempra, +1 Riflessi, §2.11)
  // + Imperiali (+1 Tempra, +1 Volontà) + Avanzamento +1 (livelli 3–10). Volontà usa CAR (master, 26/09/2026):
  // 8 + 0 (CAR 5) + 1 + 1 = 10; con INT 4 era 9
  assert.deepEqual(salv(s), { tempra: 13, riflessi: 12, volonta: 10, magia: 10 });
  // §3.3: PV = COS 8 + Assaltatore I 13 (5 + 1d8 massimizzato) + II (5 + 5) + III (5 + 6) + Buona Costituzione 5 (§8.6.1)
  assert.equal(s.pv, 47);
  // §3.3: PM = SAG 7 + 1 per Grado × 3
  assert.equal(s.pm, 10);
  // Iniziativa = Mod DES +3 + Mod INT −1 (regole.json, Giocatore §5.1) + Iniziativa Migliorata +3 (§8.6.1)
  assert.equal(s.iniziativa, 5);
  // §1.2.1 VA = Mod + base Combattente + Corporazione + Avanzamento (limite 5 all'8° livello, §8.3)
  assert.equal(va(s, 'Armi da guerra').totale, 13); // 3 + 4 + 1 + (1 + 2 + 1 + 1)
  assert.equal(va(s, 'Difese').totale, 12); // 3 + 4 + 0 + (1 + 2 + 1 + 1)
  assert.equal(va(s, 'Armi leggere').totale, 12); // 3 + 4 + 0 + (1 + 1 + 2 + 1)
  assert.equal(va(s, 'Armi da mischia').totale, 12); // 3 + 4 + 0 + (1 + 1 + 2 + 1)
  assert.equal(va(s, 'Atletica').totale, 13); // 3 + 4 + 1 + 5
  assert.equal(va(s, 'Atletica').vaEquip, 12); // armatura Media: Agilità −1 (Armamenti §7.11.1)
  assert.equal(va(s, 'Sopravvivenza').totale, 8); // 2 + 3 + 1 + 2
  assert.equal(va(s, 'Furtività').vaEquip, 6); // 3 + 3 + 0 + 1, poi −1 di Agilità
  // Spadone Claymore a due mani: Armi da guerra 13 + Specializzazione in Spade +1 (§8.8.1);
  // Highland Clan Warriors: Articolazione d'assalto porta a 0 la penalità ravvicinata (Armamenti §7.14.2)
  const [claymore] = s.equipaggiamento.armi;
  assert.equal(claymore.nome, 'Spadone Claymore');
  assert.equal(claymore.va, 14);
  assert.equal(claymore.danno.due_mani, '2d6+3'); // 2d6+2 (§7.1.9) + 1 della Specializzazione
  assert.deepEqual([claymore.parata.va, claymore.parata.distanza], [12, 4]); // Difese 12; a distanza −8 (Giocatore §5.9)
  const [armatura] = s.equipaggiamento.protezioni;
  assert.deepEqual([armatura.ar.totale, armatura.categoria, armatura.penalita.attacchi_distanza, armatura.penalita.movimento_q], [3, 'Media', -1, -1]);
  assert.equal(s.equipaggiamento.lancioPotere, -3);
  // incantesimi: nessuno (non Taumaturgo)
  assert.equal(s.incantesimi.conosciuti.length, 0);

  // seconda configurazione: Scudo d'assalto dei Clan imbracciato e Belliger impugnata
  const b = scheda(p, (c) => ({ ...c, equipaggiamento: c.equipaggiamento.map((v) => ({ ...v, stato: /spadone/.test(v.rif) ? 'pronta' : /belliger/.test(v.rif) ? 'impugnata' : /scudo/.test(v.rif) ? 'imbracciato' : v.stato })) }));
  const [belliger] = b.equipaggiamento.armi;
  assert.equal(belliger.va, 10); // Armi leggere 12 − 1 (profilo, §7.8) − 1 (armatura Media a distanza)
  assert.equal(belliger.danno.una_mano, '1d6+1');
  assert.deepEqual(belliger.scorte, [{ uid: p.creazione.equipaggiamento.find((v) => /proiettili/.test(v.rif)).uid, nome: 'Proiettili da pistola', quantita: 30 }]);
  const scudo = b.equipaggiamento.protezioni.find((x) => x.tipo === 'scudo');
  assert.deepEqual([scudo.ar.totale, scudo.parata.ravvicinata, scudo.parata.distanza], [1, 13, 8]); // Difese 12 + 1 / 12 − 4 (§7.4.8)
  assert.deepEqual(b.equipaggiamento.avvisi, []);
});

test('collaudo b: Fratellanza Taumaturgo Arcanista, 12° livello, Mistico II', () => {
  const s = scheda(leggi('b_fratellanza_arcanista_l12.json'));
  assert.equal(s.livello, 12);
  assert.deepEqual(s.errori, []);
  assert.deepEqual(s.classi.map((c) => [c.nome, c.grado]), [['Arcanista', 2], ['Mistico', 2]]);
  // §2.9 Fratellanza 5/5/4/5/6/6; +2 INT, +1 SAG, +1 COS, +1 DES; livelli 2 e 6 INT+1 SAG+1; livello 10 SAG+1 COS+1
  assert.deepEqual(car(s), { FOR: 5, COS: 7, DES: 5, INT: 9, SAG: 10, CAR: 6 });
  // §1.2.3: Taumaturgo +1 Volontà +1 Magia; Fratellanza +1 Volontà +1 Magia; Avanzamento +2 (livelli 11–18)
  // Volontà usa CAR (master, 26/09/2026): CAR 6 → +1 al posto di INT 9 → +2
  assert.deepEqual(salv(s), { tempra: 11, riflessi: 10, volonta: 13, magia: 15 }); // 8+1+2, 8+0+2, 8+1+1+2+1, 8+3+1+2+1
  // §3.3: COS 7 + Arcanista I 5 (1 + 1d4 max) + Mistico I 6 (3 + 3) + Mistico II 5 (3 + 2) + Arcanista II 5 (1 + 4) + Buona Costituzione 5
  assert.equal(s.pv, 33);
  // SAG 10 + Arcanista I 9 (5 + 4) + Mistico I 6 (4 + 2) + Mistico II 7 (4 + 3) + Arcanista II 9 (5 + 4)
  assert.equal(s.pm, 41);
  assert.equal(s.iniziativa, 7); // Mod DES 0 + Mod INT +4 + Iniziativa Migliorata +3
  assert.equal(s.azioni.principali, 2); // §8.1: +1 Azione Principale al 12° livello
  assert.equal(va(s, 'Potere').totale, 15); // 5 + 4 + 0 + 6 (limite 6 al 12° livello)
  assert.equal(va(s, 'Occultismo').totale, 15); // 4 + 4 + 1 (Fratellanza) + 6
  assert.equal(va(s, 'Percezione').totale, 16); // 5 + 4 + 1 + 6
  assert.equal(va(s, 'Medicina').totale, 14); // 5 + 3 + 0 + (Mistico I 1 + 2 + Mistico II 1 + 2)
  assert.equal(va(s, 'Cultura').totale, 8); // 1 + 4 + 1 + 2
  assert.equal(va(s, 'Artefatti').totale, 15); // 5 + 4 + 0 + 6
  // Bordone Templare: Armi da guerra 2 (base Taumaturgo 2, FOR 5) − 1 (Armatura del Mistico, Media, Armamenti §7.17.4)
  const [bordone] = s.equipaggiamento.armi;
  assert.deepEqual([bordone.va, bordone.danno.due_mani, bordone.attivazione.danno_extra], [1, '1d8+1', '1d6']);
  const [armatura] = s.equipaggiamento.protezioni;
  assert.deepEqual(armatura.ar, { totale: 4, magica: 1 }); // §7.17.2
  assert.equal(s.equipaggiamento.lancioPotere, 0); // Media −3, Assetto mistico 3 (§7.17.4)
  // §7.10: 4 Gradi complessivi → capacità 7; Bordone 2 + batteria Chroma Bianco 2
  assert.deepEqual([s.equipaggiamento.sintonizzazione.capacita, s.equipaggiamento.sintonizzazione.usata], [7, 4]);
  // Magia §1 e §3.8: Arcanista I–II 5+5+5, Mistico I–II 0+3+7, 2 + Mod INT 4 = 6 liberi → 31; livello massimo 14 (4 Gradi, decisione 5 del master)
  assert.equal(s.incantesimi.conosciuti.length, 31);
  assert.deepEqual(s.incantesimi.quote, { perMacro: { Fisica: 5, Mentale: 8, Spirituale: 12 }, liberi: 6, totale: 31, liberiUsati: 6 });
  assert.equal(s.incantesimi.livelloMassimo, 14);
});

test('collaudo c: Freelance Lavoratore Tecnico, 5° livello, Risorse Interiori, accessori e oggetti personalizzati', () => {
  const p = leggi('c_freelance_tecnico_l5.json');
  const s = scheda(p);
  assert.equal(s.livello, 5);
  assert.deepEqual(s.errori, []);
  // §2.9 Freelance 5/6/5/5/5/6; +2 INT, +2 DES, +1 SAG; livello 2 INT+1 DES+1
  assert.deepEqual(car(s), { FOR: 5, COS: 6, DES: 8, INT: 8, SAG: 6, CAR: 6 });
  // Lavoratore +1 Tempra +1 Volontà; Freelance +1 Tempra +1 Riflessi; Avanzamento +1
  // Volontà usa CAR (master, 26/09/2026): 8 + 1 (CAR 6) + 1 + 1 = 11; con INT 8 era 12
  assert.deepEqual(salv(s), { tempra: 12, riflessi: 12, volonta: 11, magia: 10 });
  assert.equal(s.pv, 22); // COS 6 + Tecnico I 9 (3 + 1d6 massimizzato) + II 7 (3 + 4)
  assert.equal(s.pm, 10); // SAG 6 + 2 + 2
  assert.equal(s.iniziativa, 6); // Mod DES +3 + Mod INT +3
  // §2.6 valori base del Lavoratore: Tecnologia 4, Pilotare 4, Armi leggere 4, Scienza 3, Armi da mischia 4, Furtività 3
  assert.equal(va(s, 'Tecnologia').totale, 11); // 3 + 4 + 0 + (1 + 2 + 1)
  assert.equal(va(s, 'Pilotare').totale, 11); // 3 + 4 + 1 + (1 + 1 + 1)
  assert.equal(va(s, 'Armi leggere').totale, 11); // 3 + 4 + 1 + (2 + 1)
  assert.equal(va(s, 'Scienza').totale, 10); // 3 + 3 + 0 + (1 + 1 + 1 + 1)
  assert.equal(va(s, 'Percezione').totale, 8); // 1 + 4 + 0 + (1 + 1 + 1)
  assert.equal(va(s, 'Furtività').totale, 7); // 3 + 3 + 0 + 1
  // Pistola semiautomatica: Armi leggere 11 + Specializzazione in Pistole +1 − Smorzatore 1 (Armamenti §7.3.1)
  const [pistola, chiave] = s.equipaggiamento.armi;
  assert.deepEqual([pistola.va, pistola.danno.una_mano, pistola.mirino.riduzione], [11, '1d6+1', 2]);
  assert.deepEqual(pistola.scorte.map((x) => [x.nome, x.quantita]), [['Proiettili da pistola', 30]]); // §7.20.1: proiettili da pistola
  // oggetto personalizzato: Armi da mischia 7 (3 + 4), danno scritto dal giocatore
  assert.deepEqual([chiave.nome, chiave.va, chiave.danno.una_mano], ['Chiave idraulica pesante', 7, '1d6']);
  // Armatura civile leggera + Rinforzo Leggero: AR 2, FOR 4, resta Leggera (Armamenti §7.11.2)
  const [armatura] = s.equipaggiamento.protezioni;
  assert.deepEqual([armatura.ar.totale, armatura.forRichiesta, armatura.categoria], [2, 4, 'Leggera']);
  assert.deepEqual(s.equipaggiamento.avvisi, []);
  // §8.9: Risorse Interiori, 2 + Mod SAG (+1) = 3 Tecniche
  assert.equal(s.tecniche.length, 3);
  assert.equal(s.incantesimi.conosciuti.length, 0);
});

test('stampa dei tre personaggi: il foglio Magia solo per chi conosce incantesimi', () => {
  const fogli = (f) => { const p = leggi(f); return preparaStampa({ creazione: p.creazione, livelli: p.livelli }, dati).fogli.map((x) => x.id); };
  assert.deepEqual(fogli('a_imperiale_assaltatore_l8.json'), ['identita', 'abilita', 'combattimento']);
  assert.deepEqual(fogli('b_fratellanza_arcanista_l12.json'), ['identita', 'abilita', 'combattimento', 'magia']);
  assert.deepEqual(fogli('c_freelance_tecnico_l5.json'), ['identita', 'abilita', 'combattimento']);
});

test('sessione dopo un cambio di livello: PV e PM attuali seguono i massimi (§8.1.2, Buona Costituzione §8.6.1)', () => {
  const prima = { pv: 31, pm: 9, puntiEroe: 10, puntiEroeIniziali: 5, stati: [], ferite: 6, affaticamento: 6, caricatori: {} };
  const dopo = { ...prima, pv: 36 };
  const illeso = { pvAttuali: 31, pmAttuali: 9, puntiEroe: 5, distintivi: 0, statiAttivi: [], ferite: 0, affaticamento: 0, munizioni: {}, note: '' };
  assert.equal(sessioneDopoLivello(illeso, prima, dopo).pvAttuali, 36); // «aumentano di 5 anche i PV attuali»
  assert.equal(sessioneDopoLivello({ ...illeso, pvAttuali: 20 }, prima, dopo).pvAttuali, 25); // i danni subiti restano
  assert.equal(sessioneDopoLivello({ ...illeso, pvAttuali: 36 }, dopo, prima).pvAttuali, 31); // annullare il livello
  assert.equal(sessioneDopoLivello({ ...illeso, pvAttuali: 2 }, dopo, prima).pvAttuali, 0); // mai sotto 0
  // §8.1.2 (E&L A.6), gli esempi del manuale: 40/47 + 6 PV → 46/53; 12/20 + 4 PM → 16/24
  const es = sessioneDopoLivello({ ...illeso, pvAttuali: 40, pmAttuali: 12 }, { ...prima, pv: 47, pm: 20 }, { ...prima, pv: 53, pm: 24 });
  assert.deepEqual([es.pvAttuali, es.pmAttuali], [46, 16]);
  // i file di collaudo, esportati dopo «Nuova sessione», hanno PV e PM ai massimi
  for (const f of ['a_imperiale_assaltatore_l8.json', 'b_fratellanza_arcanista_l12.json', 'c_freelance_tecnico_l5.json']) {
    const p = leggi(f);
    const m = massimiSessione(calcolaScheda({ creazione: p.creazione, livelli: p.livelli }, dati), p.creazione, dati);
    assert.deepEqual([p.sessione.pvAttuali, p.sessione.pmAttuali], [m.pv, m.pm], f);
  }
});

test('lingua: «all’8°», «dell’11°», «l’8°», ma «al 5°»', () => {
  assert.equal(conOrdinale('al', 8), 'all’8°');
  assert.equal(conOrdinale('Al', 11), 'All’11°');
  assert.equal(conOrdinale('del', 11), 'dell’11°');
  assert.equal(conOrdinale('il', 8), 'l’8°');
  assert.equal(conOrdinale('al', 5), 'al 5°');
  assert.equal(conOrdinale('del', 18), 'del 18°');
});

test('file di collaudo: rileggere ed esportare di nuovo dà lo stesso testo, byte per byte', async () => {
  const { serializza } = await import('../src/character.js');
  for (const f of ['a_imperiale_assaltatore_l8.json', 'b_fratellanza_arcanista_l12.json', 'c_freelance_tecnico_l5.json']) {
    const testo = readFileSync(new URL(`collaudo/${f}`, import.meta.url), 'utf8');
    const file = JSON.parse(testo);
    const p = leggi(f);
    // versioni dei dati in ordine qualsiasi: il file esportato non cambia
    const mescolate = Object.fromEntries(Object.entries(file.versioni_dati).reverse());
    assert.equal(serializza(p.creazione, { versioniDati: mescolate, livelli: p.livelli, sessione: p.sessione }), testo, f);
  }
});
