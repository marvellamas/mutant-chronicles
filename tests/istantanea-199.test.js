import '../tools/guardia-subito.mjs';
// Lotto 199 (15/11/2026): l'istantanea dopo la prima vera.
//
// **Il test che deve restare verde sempre:** un'istantanea porta **tutte** le cartelle previste. La prima istantanea
// vera (mutant-stato_2026-11-14_2004.zip) conteneva personaggi e veicoli e nient'altro, e per sapere se un nemico sul
// PC di Davide usava uno dei modelli generici rifatti dal lotto 197 non c'era modo di guardare. Una cartella aggiunta
// a CARTELLE e dimenticata in `vociIstantanea` è esattamente il difetto che non si vede: lo zip arriva, sembra
// completo, e la cosa che serviva non c'è. Qui si confronta la lista con quello che esce davvero dallo zip, cartella
// per cartella, senza elencarle a mano.
//
// **Il secondo:** l'indice dice quanti **personaggi**, non quanti file. In una cartella vera convivono cinque versioni
// per personaggio (37 file per sette PG, il 14/11): la riga di inizio sessione diceva «37 personaggi».
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  CARTELLE, faiIstantanea, leggiIstantanea, indiceIstantanea, vociIstantanea, quantiPersonaggi, rigaFreschezza,
} from '../tools/istantanea.mjs';
import { leggiZip } from '../tools/salva-sessione.mjs';

const pg = (nome, livello, px, { data = '2026-11-11', pgId = null, ferite = 0, regimeTalenti = 2, regimeAbilita = undefined } = {}) => ({
  nome: `${nome}_liv${livello}_${data}.json`,
  testo: `${JSON.stringify({
    formato: 'mutant-personaggio',
    versione: 8,
    ...(pgId ? { pg: pgId } : {}),
    scelte: { nome, classe: 'Invocatore', puntiEsperienza: px, regimeTalenti, ...(regimeAbilita ? { regimeAbilita } : {}) },
    livelli: Array.from({ length: livello - 1 }, () => ({})),
    sessione: { ferite },
    aggiornato_il: `${data}T19:52:00.000Z`,
  }, null, 2)}\n`,
});

/** Una cartella di dati come quella di Davide: ogni cartella di CARTELLE con qualcosa dentro. */
function conDati(personaggi) {
  const base = mkdtempSync(join(tmpdir(), 'mutant-199-'));
  const cloud = mkdtempSync(join(tmpdir(), 'mutant-199-cloud-'));
  for (const c of CARTELLE) mkdirSync(join(base, c), { recursive: true });
  for (const p of personaggi) writeFileSync(join(base, 'personaggi', p.nome), p.testo);
  writeFileSync(join(base, 'veicoli', 'veiprova1.json'), '{"formato":"mutant-veicolo","id":"veiprova1","mezzo":{"profilo":"asa-scout-mk4","nome":"FIAT LUX"}}');
  writeFileSync(join(base, 'px', 'px.json'), '{"partite":[]}');
  writeFileSync(join(base, 'nemici', 'lorath.json'), '{"nome":"Lorath","_bestiario":{"edizione":"Mostri 0.47"}}');
  writeFileSync(join(base, 'scontri', 'sco1.json'), '{"id":"sco1","stato":"aperto"}');
  writeFileSync(join(base, 'scene', 'sce1.json'), '{"id":"sce1","token":[]}');
  const cartelle = Object.fromEntries(CARTELLE.map((c) => [c, join(base, c)]));
  return { base, cloud, cartelle };
}

test('un’istantanea porta TUTTE le cartelle previste: nessuna aggiunta a CARTELLE e dimenticata nello zip', () => {
  const { base, cloud, cartelle } = conDati([pg('LUCAS', 7, 1022)]);
  const e = faiIstantanea({ cartelle, dove: cloud, dati: base });
  assert.equal(e.fatto, true, e.riga);
  const dentro = leggiZip(readFileSync(e.file));
  const nomi = Object.keys(dentro);
  for (const c of CARTELLE) {
    assert.ok(nomi.some((n) => n.startsWith(`${c}/`)), `nello zip manca la cartella ${c}/: una cartella in CARTELLE e non in vociIstantanea non si vede, lo zip sembra completo`);
  }
  // e al contrario: niente che non sia una cartella prevista o l'indice
  for (const n of nomi) {
    assert.ok(n === 'istantanea.json' || CARTELLE.some((c) => n.startsWith(`${c}/`)), `nello zip c’è ${n}, che non è né l’indice né una cartella prevista`);
  }
  // le cartelle che restano fuori apposta: immagini e copie
  for (const c of ['mappe', 'galleria', 'musica', 'salvataggi', 'autosave', 'backup-master', 'tavolo']) {
    assert.ok(!CARTELLE.includes(c), `${c} non va nell’istantanea: è un’immagine, una copia o la sessione, non lo stato dei personaggi`);
  }
  // l'indice conta ogni cartella
  const i = leggiIstantanea(e.file);
  for (const c of CARTELLE.filter((x) => x !== 'personaggi')) assert.equal(i.cartelle[c], 1, `l’indice non conta ${c}/`);
});

test('l’indice dice quanti personaggi, non quanti file (37 file per sette PG, il 14/11)', () => {
  const versioni = [
    pg('LUCAS', 6, 900, { data: '2026-10-26', pgId: 'pg-lucas' }),
    pg('LUCAS', 7, 1000, { data: '2026-11-02', pgId: 'pg-lucas' }),
    pg('LUCAS', 7, 1022, { data: '2026-11-11', pgId: 'pg-lucas' }),
    pg('PABLO ZAION', 7, 1012, { data: '2026-11-14', pgId: 'pg-pablo' }),
  ];
  const { base, cloud, cartelle } = conDati(versioni);
  const e = faiIstantanea({ cartelle, dove: cloud, dati: base });
  assert.equal(e.quanti, 2, 'i personaggi sono due, i file quattro');
  assert.match(e.riga, /2 personaggi/);
  const i = leggiIstantanea(e.file);
  assert.equal(i.personaggi.length, 4, 'tutte le versioni restano nell’elenco: una copia di prima serve a tornare indietro');
  assert.equal(i.quanti, 2);
  assert.match(rigaFreschezza(i, { adesso: new Date(2026, 10, 14, 23, 50) }).riga, /2 personaggi/);
  // quale file è l'attuale lo dice l'indice: chi legge non rifà la regola da sé
  const attuali = i.personaggi.filter((p) => p.attuale).map((p) => p.file);
  assert.deepEqual(attuali.sort(), ['LUCAS_liv7_2026-11-11.json', 'PABLO ZAION_liv7_2026-11-14.json']);
});

test('l’indice porta Classe, PX, regimi e Ferite: le cose per cui avevamo aperto i file a mano', () => {
  const { base, cloud, cartelle } = conDati([pg('LUCAS', 7, 1022, { ferite: 0, regimeTalenti: 2 })]);
  const e = faiIstantanea({ cartelle, dove: cloud, dati: base });
  const [v] = leggiIstantanea(e.file).personaggi;
  assert.equal(v.nome, 'LUCAS');
  assert.equal(v.classe, 'Invocatore');
  assert.equal(v.livello, 7);
  assert.equal(v.px, 1022, 'i PX stanno in scelte.puntiEsperienza: l’indice li leggeva da «px» e tornava sempre null');
  assert.equal(v.regime_talenti, 2);
  assert.equal(v.regime_abilita, null);
  assert.equal(v.ferite, 0);
  assert.equal(v.leggibile, true);
});

test('un file di personaggio illeggibile resta nell’elenco e lo dice', () => {
  const { base, cloud, cartelle } = conDati([pg('LUCAS', 7, 1022)]);
  writeFileSync(join(base, 'personaggi', 'ROTTO_liv7_2026-11-11.json'), '{ questo non è json');
  const i = leggiIstantanea(faiIstantanea({ cartelle, dove: cloud, dati: base }).file);
  const rotto = i.personaggi.find((p) => p.file.startsWith('ROTTO'));
  assert.ok(rotto, 'il file illeggibile non è nell’elenco: «non si apre» e «non c’è» sono cose diverse');
  assert.equal(rotto.leggibile, false);
  assert.equal(rotto.px, null);
});

test('quantiPersonaggi legge anche le istantanee della versione 1, che non distinguevano', () => {
  assert.equal(quantiPersonaggi({ versione: 2, quanti: 7, personaggi: new Array(37).fill({ file: 'x' }) }), 7);
  assert.equal(quantiPersonaggi({ personaggi: [{ file: 'a', attuale: true }, { file: 'b', attuale: false }] }), 1);
  // la versione 1: cinque file per personaggio, nessun segno dell'attuale — valgono i nomi distinti.
  // È l'istantanea del 14/11, l'unica che abbiamo: la riga diceva «37 personaggi» invece di sette.
  assert.equal(quantiPersonaggi({
    versione: 1,
    personaggi: [
      { file: 'LUCAS_liv6_2026-10-26.json', nome: 'LUCAS' },
      { file: 'LUCAS_liv7_2026-11-11.json', nome: 'LUCAS' },
      { file: 'PABLO-ZAION_liv7_2026-11-14.json', nome: 'PABLO ZAION' },
    ],
  }), 2);
  // senza nomi (tutti illeggibili) ripiega sui file: dire «1» sarebbe peggio che dire «non lo so»
  assert.equal(quantiPersonaggi({ versione: 1, personaggi: [{ file: 'a' }, { file: 'b' }] }), 2);
  assert.equal(quantiPersonaggi(null), 0);
});

test('vociIstantanea non ci mette più stato-mutant.txt, e leggiIstantanea lo legge ancora se c’è', () => {
  const { base, cartelle } = conDati([pg('LUCAS', 7, 1022)]);
  writeFileSync(join(base, 'stato-mutant.txt'), 'STATO DI MUTANT - prova');
  const i = indiceIstantanea({ cartelle, adesso: new Date(2026, 10, 15, 10, 0), pc: 'PC-DAVIDE' });
  const voci = vociIstantanea({ cartelle, indice: i, statoTxt: join(base, 'stato-mutant.txt') });
  assert.ok(!voci.some((v) => v.nome === 'stato-mutant.txt'), 'lo diceva due volte, e c’era solo se Davide apriva la voce C del menu');
  assert.equal(i.versione, 2);
});
