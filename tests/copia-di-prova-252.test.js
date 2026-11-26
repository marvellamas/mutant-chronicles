import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// **Per provare il criterio serve una cartella che la prova non abbia creato.** Dentro una prova `mkdtemp` annota da sé
// la cartella nuova fra quelle di prova (lotto 161), quindi ogni cartella che il test crea è già scrivibile: si passa
// un'altra cartella temporanea come registro (`temp`), e allora la cartella del test non risulta «nata nella prova».
const ALTROVE = { temp: join(tmpdir(), 'mutant-temp-di-un-altro-252') };
import { cartellaConPersonaggiDi, copiaDiProvaDi, dichiaraCopiaDiProva, MARCATORE_COPIA, cartelleReali, cartellaRealeDi } from '../tools/protezione-reali.mjs';
import { statoDaRuolo, fasciaDaMostrare } from '../src/copia-di-lavoro.js';

// Lotto 252, parte C — **la copia scrivibile dei sette, senza spegnere la protezione.**
//
// Il collaudo di Davide, prova 04: «la protezione rifiuta di scrivere nella cartella che contiene schede copiate, non
// create dalla prova». Il criterio del lotto 161 proibiva proprio la prova che serve — provare una procedura sui sette
// veri, su una copia. Adesso una cartella può **dichiararsi** copia di prova con un file dentro, e dentro una cartella
// così si scrive. Quello che non cambia: le cartelle vere non si sbloccano con un file.
const fuori = () => mkdtempSync(join(tmpdir(), 'mutant-copia-252-'));
const conPg = (dir) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'TIZIO_liv1_2026-01-01.json'), JSON.stringify({ formato: 'mutant-personaggio', scelte: { nome: 'Tizio' } }));
  return dir;
};

test('una cartella con personaggi NON dichiarata resta protetta (il lotto 161 non si indebolisce)', () => {
  const dir = conPg(join(fuori(), 'sembra-vera'));
  assert.equal(cartellaConPersonaggiDi(join(dir, 'TIZIO_liv1_2026-01-01.json'), ALTROVE), dir,
    'senza dichiarazione, una cartella con personaggi è di sola lettura in una prova');
});

test('una copia DICHIARATA si può scrivere, e la dichiarazione dice da dove viene', () => {
  const base = fuori();
  const copia = join(base, 'COPIA-DI-PROVA_2026-11-26_0940');
  conPg(join(copia, 'personaggi'));
  const d = dichiaraCopiaDiProva(copia, { daDove: 'istantanee/stato_2026-11-21_2353/personaggi', chi: 'la prova' });
  assert.equal(d.formato, 'mutant-copia-di-prova');
  assert.ok(existsSync(join(copia, MARCATORE_COPIA)));
  assert.match(JSON.parse(readFileSync(join(copia, MARCATORE_COPIA), 'utf8')).avviso, /NON È LA CARTELLA VERA/);
  assert.equal(cartellaConPersonaggiDi(join(copia, 'personaggi', 'TIZIO_liv1_2026-01-01.json'), ALTROVE), null,
    'dentro una copia dichiarata si scrive: è il caso che serviva a Davide');
  const letta = copiaDiProvaDi(join(copia, 'personaggi'));
  assert.equal(letta.cartella, copia);
  assert.match(letta.da_dove, /istantanee/);
});

test('un marcatore illeggibile o di un altro formato non dichiara niente', () => {
  const copia = join(fuori(), 'finta');
  conPg(join(copia, 'personaggi'));
  writeFileSync(join(copia, MARCATORE_COPIA), '{ questo non è json');
  assert.equal(copiaDiProvaDi(join(copia, 'personaggi')), null);
  writeFileSync(join(copia, MARCATORE_COPIA), JSON.stringify({ formato: 'qualcos-altro' }));
  assert.equal(copiaDiProvaDi(join(copia, 'personaggi')), null);
  assert.ok(cartellaConPersonaggiDi(join(copia, 'personaggi', 'TIZIO_liv1_2026-01-01.json'), ALTROVE), 'resta protetta');
});

test('LE CARTELLE VERE NON SI SBLOCCANO CON UN FILE: quella guardia è un’altra e resta intera', () => {
  // `cartelleReali` non guarda il marcatore: un COPIA-DI-PROVA.json messo in personaggi/ non apre niente
  const reali = cartelleReali('F:/finta-radice', { profiloVero: false });
  const personaggi = reali.find((r) => r.nome === 'personaggi');
  assert.ok(personaggi, 'personaggi/ è fra le cartelle vere');
  assert.ok(cartellaRealeDi(join(personaggi.percorso, 'LUCAS_liv8_2026-11-26.json'), reali),
    'un file dentro una cartella vera resta riconosciuto come vero, marcatore o no');
});

test('LA FASCIA: sul PC del Direttore la copia di prova si vede comunque', () => {
  const copia = { creata: '2026-11-26T09:40:59.000Z', daDove: 'C:/istantanee/stato_2026-11-21_2353/personaggi' };
  // il ruolo «originale» spegne ogni fascia: è la cartella, non il PC, a dover parlare
  const s = statoDaRuolo({ ruolo: 'originale', nomePc: 'PC-DAVIDE' }, undefined, copia);
  const f = fasciaDaMostrare(s);
  assert.ok(f, 'con una copia di prova la fascia c’è anche sul PC del Direttore');
  assert.match(f.testo, /COPIA DI PROVA/);
  assert.match(f.testo, /non sono in questa cartella/);
  assert.match(f.nota, /copiata da/);
  // e senza copia niente cambia: sul PC del Direttore nessuna fascia
  assert.equal(fasciaDaMostrare(statoDaRuolo({ ruolo: 'originale' }, undefined, null)), null);
});
