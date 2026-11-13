import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 192 (13/11/2026): il profilo delle Abilità 4/7/9/4 del Giocatore 0.62, e il cancello che lo tiene fermo.
//
// **Perché il cancello.** Una scheda conserva le scelte del giocatore e **ricalcola** i valori: cambiare la
// categoria di competenza di un'Abilità cambia il VA di un personaggio già salvato. Il 0.62 sposta 5–10 Abilità
// per personaggio e alza i limiti di P, G e N: senza protezione, stasera sette giocatori aprono la scheda e
// trovano numeri diversi senza che nessuno l'abbia deciso. Quindi un personaggio usa il profilo nuovo **solo se lo
// dichiara** (`scelte.regimeAbilita = 2`), come `regimeTalenti = 2` del 26/10. Il contrassegno lo mette la
// migrazione del lotto C, al tavolo, insieme al giocatore.
//
// La prova che conta è che **niente si muove**. Non la facciamo con numeri congelati (un numero congelato si
// aggiorna per far tornare verde il test, e il cancello cade in silenzio): per ogni personaggio del repo senza
// contrassegno si **ricalcola per conto proprio** categoria, base e limite dal profilo di prima, e si pretende che
// la scheda dica esattamente quelli. Se un giorno il cancello perde, questi ricalcoli non coincidono più.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { calcolaSchedaPersonaggio } from '../src/avanzamento.js';
import { deserializzaPersonaggio, nuoveScelte } from '../src/character.js';
import { profiloCompetenze, listeCompetenza, competenzaDi, limiteAbilita, regimeAbilitaNuovo, PROFILO_NUOVO } from '../src/competenze.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const R = dati.regole;
const PN = profiloCompetenze(R, { regimeAbilita: PROFILO_NUOVO });
const PV = profiloCompetenze(R, {});
const classe = (nome) => dati.classi.classi.find((c) => c.nome === nome);

/** Tutti i personaggi del repo: gli esempi e i file di collaudo. Nessuno di questi ha il contrassegno. */
function personaggiDelRepo() {
  const out = [];
  for (const [cartella, url] of [['esempi', new URL('../esempi/', import.meta.url)], ['collaudo', new URL('collaudo/', import.meta.url)]]) {
    for (const f of readdirSync(url).filter((x) => x.endsWith('.json'))) {
      const testo = readFileSync(new URL(f, url), 'utf8');
      const j = JSON.parse(testo);
      if (!j?.scelte) continue;
      out.push({ dove: `${cartella}/${f}`, p: deserializzaPersonaggio(testo), scelte: j.scelte });
    }
  }
  return out;
}

// --- il profilo nei dati ---------------------------------------------------------------------------------------

test('Giocatore 0.62 §2.3 e §8.3: 4/7/9/4, 127 punti base, limiti distanziati di 2', () => {
  assert.deepEqual(Object.entries(PN.categorie).map(([k, c]) => [k, c.numero, c.base]), [['S', 4, 7], ['P', 7, 6], ['G', 9, 5], ['N', 4, 3]]);
  assert.equal(PN.punti_base_totali, 127);
  assert.equal(Object.values(PN.categorie).reduce((s, c) => s + c.numero * c.base, 0), 127);
  // §8.3: la tabella dei limiti, e le quattro categorie distanziate di 2 a ogni Grado
  const tab = { S: [12, 14, 16, 18, 20, 22], P: [10, 12, 14, 16, 18, 20], G: [8, 10, 12, 14, 16, 18], N: [6, 8, 10, 12, 14, 16] };
  for (const [cat, righe] of Object.entries(tab)) {
    righe.forEach((atteso, i) => {
      const L = PN.categorie[cat].limite;
      assert.equal(L.fisso + L.per_grado_totale * (i + 1) + L.per_grado_categoria * (i + 1), atteso, `${cat} al Grado ${i + 1}`);
    });
  }
  for (let g = 1; g <= 6; g += 1) {
    const v = ['S', 'P', 'G', 'N'].map((k) => tab[k][g - 1]);
    assert.deepEqual(v.slice(1).map((x, i) => v[i] - x), [2, 2, 2], `al Grado ${g} le categorie distano 2`);
  }
  // tutti e 25 i profili hanno le misure nuove, e ciascuno copre le 24 Abilità una volta
  const nomi = dati.abilita.abilita.map((a) => a.nome).sort();
  assert.equal(dati.classi.classi.length, 25);
  for (const c of dati.classi.classi) {
    assert.deepEqual(Object.values(listeCompetenza(c, PN)).flat().sort(), nomi, c.nome);
    for (const [k, v] of Object.entries(PN.categorie)) assert.equal(listeCompetenza(c, PN)[k].length, v.numero, `${c.nome} ${k}`);
  }
});

// --- il cancello -----------------------------------------------------------------------------------------------

test('il cancello: senza contrassegno vale il profilo di prima, con il contrassegno quello nuovo', () => {
  assert.equal(profiloCompetenze(R, null).chiave, 'precedente');
  assert.equal(profiloCompetenze(R, {}).chiave, 'precedente');
  assert.equal(profiloCompetenze(R, { regimeAbilita: 1 }).chiave, 'precedente');
  assert.equal(profiloCompetenze(R, { regimeAbilita: '2' }).chiave, 'precedente', 'il contrassegno è il numero 2, non la stringa');
  assert.equal(profiloCompetenze(R, { regimeAbilita: 2 }).chiave, 'nuovo');
  assert.equal(regimeAbilitaNuovo({ regimeAbilita: 2 }), true);
  assert.equal(regimeAbilitaNuovo({}), false);
  // un personaggio creato da zero nasce col profilo nuovo: per lui non c'è niente da migrare
  assert.equal(nuoveScelte().regimeAbilita, null, 'nuoveScelte non lo mette: lo mette src/ui/app.js alla creazione');
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /nuoveScelte\(\), regimeTalenti: 2, regimeAbilita: 2/);
  // i due profili sono davvero diversi: se un giorno coincidessero, il cancello non starebbe più proteggendo niente
  assert.notDeepEqual(Object.values(PN.categorie).map((c) => c.numero), Object.values(PV.categorie).map((c) => c.numero));
  assert.notEqual(PN.punti_base_totali, PV.punti_base_totali);
});

test('nessun personaggio del repo ha il contrassegno: in questo lotto non lo riceve nessuno', () => {
  const con = personaggiDelRepo().filter((x) => regimeAbilitaNuovo(x.scelte)).map((x) => x.dove);
  assert.deepEqual(con, [], 'il contrassegno lo mette la migrazione del lotto C, al tavolo, non un lotto sui dati');
});

test('zero differenze: un personaggio senza contrassegno ha categoria, base e limite del profilo di prima', () => {
  const pgs = personaggiDelRepo();
  assert.ok(pgs.length >= 8, `personaggi del repo controllati: ${pgs.length}`);
  for (const { dove, p } of pgs) {
    const s = calcolaSchedaPersonaggio(p, dati);
    assert.equal(s.profiloAbilita?.chiave, 'precedente', dove);
    assert.equal(s.profiloAbilita.punti_base_totali, 122, dove);
    assert.equal(s.regimeAbilita, 'vecchio', dove);
    const prima = classe(p.creazione.classe);
    const classi = (s.classi ?? []).map((c) => ({ def: classe(c.nome), grado: c.grado }));
    let diversi = 0;
    for (const a of s.abilita) {
      // ricalcolo indipendente, dal profilo di prima e dai dati: categoria, base e limite
      const cat = competenzaDi(prima, a.nome, PV);
      assert.equal(a.competenza, cat, `${dove}: ${a.nome} categoria`);
      assert.equal(a.base, PV.categorie[cat].base, `${dove}: ${a.nome} base`);
      assert.equal(a.limite, limiteAbilita(a.nome, classi, PV).valore, `${dove}: ${a.nome} limite`);
      // il VA personale resta il minore fra grezzo e limite (salvo le eccezioni della A.247)
      if (!a.oltreLimite) assert.equal(a.totale, Math.min(a.grezzo, a.limite), `${dove}: ${a.nome} VA`);
      if (competenzaDi(prima, a.nome, PN) !== cat) diversi += 1;
    }
    // la controprova: col profilo nuovo quel personaggio avrebbe Abilità in categorie diverse. Se fossero zero,
    // questo controllo non starebbe dimostrando niente.
    assert.ok(diversi > 0, `${dove}: col profilo nuovo nessuna Abilità cambierebbe categoria`);
  }
});

test('con il contrassegno i valori seguono il profilo nuovo; dove un VA scende, è la A.267', () => {
  for (const { dove, p } of personaggiDelRepo()) {
    const senza = calcolaSchedaPersonaggio(p, dati);
    const con = calcolaSchedaPersonaggio({ ...p, creazione: { ...p.creazione, regimeAbilita: 2 } }, dati);
    assert.equal(con.profiloAbilita.chiave, 'nuovo', dove);
    assert.equal(con.profiloAbilita.punti_base_totali, 127, dove);
    assert.equal(con.regimeAbilita, 'nuovo', dove);
    const prima = classe(p.creazione.classe);
    let saliti = 0;
    con.abilita.forEach((a, i) => {
      assert.equal(a.competenza, competenzaDi(prima, a.nome, PN), `${dove}: ${a.nome} categoria col profilo nuovo`);
      if (a.totale > senza.abilita[i].totale) saliti += 1;
      // A.267 (aperta): un'Abilità che passa a una categoria più bassa perde base e il VA scende. Succede, e deve
      // restare visibile: un VA che scende può solo essere il frutto di una categoria più bassa, mai di un limite.
      if (a.totale < senza.abilita[i].totale) {
        const base = PN.categorie[competenzaDi(prima, a.nome, PN)].base;
        assert.ok(base < senza.abilita[i].base, `${dove}: ${a.nome} scende senza che la base scenda (${senza.abilita[i].base} → ${base})`);
      }
    });
    assert.ok(saliti > 0, `${dove}: con il profilo nuovo nessun VA sale`);
  }
});

test('un personaggio creato da zero: 127 punti base, profilo 4/7/9/4, limiti distanziati di 2', () => {
  // le basi di tutte e 24 le Abilità, come le vedrebbe un personaggio nato oggi con la prima Classe Agente
  const agente = classe('Agente');
  const basi = dati.abilita.abilita.map(({ nome }) => PN.categorie[competenzaDi(agente, nome, PN)].base);
  assert.equal(basi.reduce((a, b) => a + b, 0), 127);
  assert.equal(basi.length, 24);
  const uno = [{ def: agente, grado: 1 }];
  assert.deepEqual(['Percezione', 'Cultura', 'Armi da lancio', 'Armi pesanti'].map((n) => limiteAbilita(n, uno, PN).valore), [12, 10, 8, 6]);
});

// --- il validatore ---------------------------------------------------------------------------------------------

test('il validatore non può validare zero profili e dirlo verde (il difetto del 189)', async () => {
  const { validaDati } = await import('../src/validate.js');
  const { copia } = await import('./helpers.js');
  // una Classe senza il profilo di prima: il conto lo dice, e dice quante ne ha guardate
  const senzaPrec = copia(dati);
  delete senzaPrec.classi.classi[7].competenze_precedenti;
  const e1 = validaDati(senzaPrec);
  assert.ok(e1.some((x) => /profili di prima controllati 24 su 25 Classi/.test(x.problema)), JSON.stringify(e1.slice(0, 3)));
  // il profilo nuovo di una Classe che non c'è: idem, e il conto lo dice
  const rotto = copia(dati);
  delete rotto.classi.classi[2].competenze;
  const e2 = validaDati(rotto);
  assert.ok(e2.some((x) => /profili di competenza controllati 24 su 25 Classi/.test(x.problema)), JSON.stringify(e2.slice(0, 3)));
  // nessuna Classe: il controllo non ha guardato niente, e non deve per questo dire verde
  const vuoto = copia(dati);
  vuoto.classi.classi = [];
  assert.ok(validaDati(vuoto).length > 0, 'con zero Classi il validatore deve protestare, non passare');
  // e i dati veri passano
  assert.deepEqual(validaDati(dati), []);
});
