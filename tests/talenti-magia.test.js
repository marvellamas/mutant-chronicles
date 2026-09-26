import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, ARCANISTA, LIVELLI_AGENTE } from './personaggi.js';

// Schede dei Talenti di magia approvate dal master il 26/09/2026 (docs/risposte-master.md)
const { dati } = await datiReali();
// contano le violazioni di regola; «incompleto» (per esempio incantesimi ancora da scegliere) no
const problemi = (errori) => errori.filter((e) => e.tipo !== 'incompleto').map((e) => e.problema);
const violazioni = (s) => problemi(s.errori);
const LIBERI = [3, 5, 7, 9, 11, 13, 15, 17, 19];

/** Agente Mishima (Avventuriero) con i Talenti Liberi indicati, in ordine, ai livelli 3, 5, 7… */
function agente(talenti, fino = 20) {
  const livelli = LIVELLI_AGENTE.filter((v) => v.livello <= fino).map((v) => {
    const k = LIBERI.indexOf(v.livello);
    if (k < 0) return v;
    return k < talenti.length ? { livello: v.livello, talentoLibero: { id: talenti[k] } } : v;
  });
  return { versione: 2, creazione: MISHIMA_AGENTE, livelli };
}
/** Arcanista (Addestramento Taumaturgo) al 3° livello con il Talento indicato. */
const arcanista = (talento) => ({ versione: 2, creazione: ARCANISTA, livelli: [{ livello: 2, caratteristiche: { FOR: 1, DES: 1 } }, ...(talento ? [{ livello: 3, talentoLibero: { id: talento } }] : [])] });
const arcanista2 = arcanista(null);
const agente2 = { versione: 2, creazione: MISHIMA_AGENTE, livelli: LIVELLI_AGENTE.slice(0, 1) };
const provaTalento = (p, id) => problemi(validaLivello(p, { talentoLibero: { id } }, dati));

test('dati: i due personaggi di prova sono validi', () => {
  assert.deepEqual(violazioni(calcolaScheda(arcanista2, dati)), []);
  assert.deepEqual(violazioni(calcolaScheda(agente2, dati)), []);
});

test('prerequisito «capacità personale di lanciare Incantesimi» = Addestramento Taumaturgo oppure Usufruitore di Magia', () => {
  // Agente (Avventuriero) senza Usufruitore: non ha la capacità
  assert.ok(provaTalento(agente2, 'incrementare-incantesimi').includes('Incrementare Incantesimi richiede la capacità personale di lanciare Incantesimi'));
  assert.ok(provaTalento(agente2, 'contromagia').includes('Contromagia richiede la capacità personale di lanciare Incantesimi'));
  // con Usufruitore al 3° livello, al 5° va bene
  const conUsufruitore = agente(['usufruitore-di-magia'], 4);
  assert.deepEqual(violazioni(calcolaScheda(conUsufruitore, dati)), []);
  assert.deepEqual(provaTalento(conUsufruitore, 'incrementare-incantesimi'), []);
  assert.deepEqual(provaTalento(conUsufruitore, 'lancio-in-combattimento'), []);
  // Arcanista: l'Addestramento Taumaturgo basta (anche per Incrementare, A.2.3)
  assert.deepEqual(provaTalento(arcanista2, 'incrementare-incantesimi'), []);
  assert.deepEqual(provaTalento(arcanista2, 'magia-occultata'), []);
});

test('Usufruitore di Magia: incompatibile con l’Addestramento Taumaturgo e con Risorse Interiori', () => {
  assert.ok(provaTalento(arcanista2, 'usufruitore-di-magia').includes('Usufruitore di Magia è incompatibile con l’Addestramento Taumaturgo'));
  assert.deepEqual(provaTalento(agente2, 'usufruitore-di-magia'), []);
  // Potenziale Mistico Migliorato: solo per gli Usufruitori, non per i Taumaturghi (A.2.2)
  assert.ok(provaTalento(arcanista2, 'potenziale-mistico-migliorato').includes('Potenziale Mistico Migliorato richiede Usufruitore di Magia'));
});

test('Conversione Migliorata richiede l’Addestramento Taumaturgo; Meditazione: Recupero Meditativo solo a chi non ce l’ha', () => {
  assert.ok(provaTalento(agente2, 'conversione-migliorata').includes('Conversione Migliorata richiede l’Addestramento Taumaturgo'));
  assert.deepEqual(provaTalento(arcanista2, 'conversione-migliorata'), []);
  // la Meditazione di base ce l'ha solo l'Addestramento Taumaturgo (Magia sez. 6; nessuna Classe la concede)
  assert.ok(provaTalento(arcanista2, 'recupero-meditativo').includes('Recupero Meditativo è incompatibile con la capacità di Meditazione'));
  assert.deepEqual(provaTalento(agente2, 'recupero-meditativo'), []);
  assert.ok(provaTalento(agente2, 'meditazione-migliorata').includes('Meditazione Migliorata richiede la capacità di Meditazione'));
  assert.deepEqual(provaTalento(arcanista2, 'meditazione-estesa'), []);
  assert.deepEqual(provaTalento(agente(['recupero-meditativo'], 4), 'meditazione-migliorata'), []);
  // Contromagia Migliorata e Universale richiedono Contromagia
  assert.ok(provaTalento(arcanista2, 'contromagia-universale').includes('Contromagia Universale richiede Contromagia'));
});

test('Potenziale Mistico Migliorato: +3 al livello massimo di Usufruitore, fino a 18, al massimo cinque volte', () => {
  const potenziali = (n) => ['usufruitore-di-magia', ...Array(n).fill('potenziale-mistico-migliorato')];
  const livelloMax = (n) => calcolaScheda(agente(potenziali(n), 3 + 2 * n), dati).incantesimi.livelloMassimo;
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(livelloMax), [3, 6, 9, 12, 15, 18]);
  const cinque = agente(potenziali(5), 14);
  assert.deepEqual(violazioni(calcolaScheda(cinque, dati)), []);
  assert.ok(provaTalento(cinque, 'potenziale-mistico-migliorato').includes('Potenziale Mistico Migliorato: al massimo 5 acquisizioni'));
});

test('Incrementare Incantesimi: +2 Incantesimi per acquisizione, anche per i Taumaturghi', () => {
  const liberi = (p) => calcolaScheda(p, dati).incantesimi.quote.liberi;
  assert.equal(liberi(arcanista('incrementare-incantesimi')) - liberi(arcanista2), 2);
  // Usufruitore: 2 + Mod INT (minimo 1), poi +2 e +2
  const u = liberi(agente(['usufruitore-di-magia'], 4));
  assert.equal(liberi(agente(['usufruitore-di-magia', 'incrementare-incantesimi', 'incrementare-incantesimi'], 8)), u + 4);
});

test('modificatori di lancio: Focalizzazione +6, Ingaggio 0, Armi da lancio +4, Contromagia', () => {
  const base = calcolaScheda(arcanista2, dati).magia;
  // valori base del Manuale della Magia, sez. 2 e 3 (regole.json → lancio)
  assert.deepEqual([base.focalizzazioneVa, base.penalitaIngaggio, base.tiroArmiDaLancio, base.contromagia, base.magiaOccultata], [4, -2, 2, null, false]);
  const m = (talento) => calcolaScheda(arcanista(talento), dati).magia;
  assert.equal(m('focalizzazione-migliorata').focalizzazioneVa, 6);
  assert.equal(m('lancio-in-combattimento').penalitaIngaggio, 0);
  assert.equal(m('incantesimi-da-lancio').tiroArmiDaLancio, 4);
  assert.deepEqual(m('contromagia').contromagia, { penalita: -2, serveConoscenza: true });
  assert.equal(m('magia-occultata').magiaOccultata, true);
  // Contromagia Migliorata toglie il −2, Contromagia Universale il requisito di conoscere l'Incantesimo
  const cm = (secondo) => calcolaScheda(agente(['usufruitore-di-magia', 'contromagia', secondo], 8), dati);
  assert.deepEqual(violazioni(cm('contromagia-migliorata')), []);
  assert.deepEqual(cm('contromagia-migliorata').magia.contromagia, { penalita: 0, serveConoscenza: true });
  assert.deepEqual(cm('contromagia-universale').magia.contromagia, { penalita: -2, serveConoscenza: false });
});

test('Meditazione: 3 + Mod SAG PM/ora (min 3), 2 + Mod SAG + Mod COS ore (min 1); Migliorata +2, Estesa ×2', () => {
  const s = calcolaScheda(arcanista2, dati);
  const sag = s.caratteristiche.SAG.mod;
  const cos = s.caratteristiche.COS.mod;
  const attesi = { pmPerOra: Math.max(3, 3 + sag), orePerGiorno: Math.max(1, 2 + sag + cos) };
  assert.deepEqual(s.magia.meditazione, attesi);
  assert.deepEqual(calcolaScheda(arcanista('meditazione-migliorata'), dati).magia.meditazione, { ...attesi, pmPerOra: attesi.pmPerOra + 2 });
  assert.deepEqual(calcolaScheda(arcanista('meditazione-estesa'), dati).magia.meditazione, { ...attesi, orePerGiorno: attesi.orePerGiorno * 2 });
  // senza capacità di Meditazione: nessun valore; con Recupero Meditativo sì, con i minimi
  assert.equal(calcolaScheda(agente2, dati).magia.meditazione, null);
  const a = calcolaScheda(agente(['recupero-meditativo', 'meditazione-migliorata', 'meditazione-estesa'], 8), dati);
  assert.deepEqual(violazioni(a), []);
  const sagA = a.caratteristiche.SAG.mod;
  const cosA = a.caratteristiche.COS.mod;
  assert.deepEqual(a.magia.meditazione, { pmPerOra: Math.max(3, 3 + sagA) + 2, orePerGiorno: Math.max(1, 2 + sagA + cosA) * 2 });
});

test('Conversione Migliorata nel blocco chroma: 3:1 → 2:1, 1:1 con Ricarica Efficiente, Bianco sempre 2:1', () => {
  const cv = dati.regole.chroma.conversione;
  assert.deepEqual(cv.talenti_riduzione, ['Ricarica Efficiente', 'Conversione Migliorata']);
  assert.deepEqual(cv.rapporto_per_talenti, [3, 2, 1]);
  assert.deepEqual(cv.rapporti_fissi, { Bianco: 2 });
});

test('tipo dei tre Talenti Liberi prima senza tipo: passivo (A.3)', () => {
  const t = (id) => dati.talenti_liberi.talenti.find((x) => x.id === id);
  assert.deepEqual(['attivazione-tempestiva', 'risorse-interiori', 'tecniche-interiori-supplementari'].map((id) => t(id).tipo), ['passivo', 'passivo', 'passivo']);
  assert.equal(t('contromagia').tipo, 'attivo');
});
