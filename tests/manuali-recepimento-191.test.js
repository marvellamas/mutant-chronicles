import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 191 (12/11/2026): recepire sette manuali nuovi senza dire bugie.
//
// Due cose nuove, e un controllo per ciascuna.
//
// 1. **Le immagini fuori dal testo.** L'esportazione in Markdown di un Google Doc incolla le immagini dentro il
//    testo come definizioni in coda (`[image1]: <data:image/png;base64,…>`): sull'Armamenti 0.83 sono 762 KB su
//    1,2 MB. Lasciarle dentro vuol dire che `righeManuale` e `celleManuale` leggono base64 come se fosse testo, e
//    una ricerca può trovare una parola dentro la codifica di una figura. Si togliono contandole, e i richiami
//    `![][imageN]` restano dov'erano, così si vede il posto dell'immagine.
//
// 2. **La distanza fra manuale recepito e dati non ancora rigenerati, dichiarata.** Fra questo lotto e il lotto B i
//    dati citano l'edizione da cui vengono davvero, e certe frasi che il manuale nuovo ha riscritto non stanno più
//    nel corrente. `verifica_frasi` non le dà per buone in silenzio (era il difetto del 188) e non le dà per
//    sbagliate (sarebbe una bugia al contrario): le cerca nell'edizione **dichiarata** in `edizioni_in_attesa` e le
//    conta a parte. Quando il lotto che rigenera toglie l'eccezione, la rete si scioglie da sé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CARTELLA_TESTI, RADICE, registro, voci } from '../tools/manuali.mjs';
import { senzaImmagini } from '../tools/estrai-doc-markdown.mjs';
import { edizioniDichiarate, esitoFrasi } from '../tools/verifica_frasi.mjs';
import { quadroEdizioni } from '../tools/edizioni-dati.mjs';

// --- 1. le immagini -------------------------------------------------------------------------------------------

test('senzaImmagini toglie le definizioni, conta quante erano e lascia i richiami dov’erano', () => {
  const dentro = [
    '# Capitolo 7',
    'Una riga di testo.',
    '![][image1]',
    'Lanciafiamme Gehemmapuker: 5 NEC 10, 2.000 cr, 750 g.',
    '![][image2]',
    '',
    '[image1]: <data:image/png;base64,AAAABBBB>',
    '[image2]: <data:image/jpeg;base64,CCCCDDDD>',
  ].join('\n');
  const e = senzaImmagini(dentro);
  assert.equal(e.immagini, 2);
  assert.deepEqual(e.richiami, ['image1', 'image2']);
  assert.ok(!e.testo.includes('base64'), 'nel testo non deve restare base64');
  assert.ok(e.testo.includes('![][image1]'), 'il richiamo resta dove era: dice dove stava l’immagine');
  assert.ok(e.testo.includes('2.000 cr'), 'il testo accanto all’immagine non si tocca');
  assert.ok(e.byteImmagini > 0);
  // un manuale senza immagini non cambia di una virgola
  const pulito = '# Capitolo 1\n\nSolo testo.\n';
  assert.equal(senzaImmagini(pulito).immagini, 0);
  assert.equal(senzaImmagini(pulito).testo, pulito);
});

test('nei testi salvati non è rimasto base64 di immagini', () => {
  const dentro = [];
  for (const f of readdirSync(CARTELLA_TESTI)) {
    if (!f.endsWith('.md')) continue;
    const t = readFileSync(join(CARTELLA_TESTI, f), 'utf8');
    if (/data:image\/[a-z]+;base64/.test(t)) dentro.push(f);
  }
  assert.deepEqual(dentro, [], 'un manuale con le immagini incollate dentro fa leggere base64 come se fosse testo');
});

// --- 2. la distanza dichiarata --------------------------------------------------------------------------------

test('le edizioni che verifica_frasi può ancora leggere sono solo quelle dichiarate, e stanno in cartella', () => {
  const dich = edizioniDichiarate();
  assert.ok(dich.length > 0, 'dopo un recepimento qualche dato resta indietro: se non ne resta nessuno, togli questo controllo');
  const ecc = registro().edizioni_in_attesa ?? {};
  for (const e of dich) {
    assert.ok(ecc[e.file]?.[e.id]?.motivo, `${e.file}/${e.id}: l’edizione si legge solo se l’eccezione ha un motivo`);
    const v = voci().find((x) => x.id === e.id);
    const nome = v.testo.replace(/-\d+(\.\d+)+/, `-${e.versione}`);
    assert.ok(existsSync(join(CARTELLA_TESTI, nome)), `manca ${nome}: un’edizione dichiarata non si archivia`);
    assert.ok((registro().edizioni_citate ?? {})[nome], `${nome} è dichiarata dai dati ma non è in edizioni_citate`);
  }
});

test('una frase che il manuale nuovo ha riscritto si conta a parte, non si perde e non diventa rossa', () => {
  const { mancanti, nellEdizioneDichiarata } = esitoFrasi();
  assert.deepEqual(mancanti.map((x) => x.dove), [], 'una frase che nessun manuale dice, né corrente né dichiarato, è un errore vero');
  // se diventa zero il lotto che rigenera i dati ha fatto il suo lavoro: allora questo controllo si semplifica
  for (const x of nellEdizioneDichiarata) {
    assert.match(x.edizione_trovata, /^(Giocatore|Magia|Armamenti|Equipaggiamento|Veicoli|Mostri|Direttore) \d/);
  }
});

test('nessuna eccezione resta senza il lotto che la chiuderà, e nessun file in attesa è già allineato', () => {
  for (const [f, per] of Object.entries(registro().edizioni_in_attesa ?? {})) {
    for (const [id, e] of Object.entries(per)) {
      assert.ok(e.lotto, `edizioni_in_attesa[${f}][${id}]: manca il lotto che la chiuderà`);
      assert.ok(e.documento && existsSync(join(RADICE, e.documento)), `edizioni_in_attesa[${f}][${id}]: il documento di riferimento non c’è`);
    }
  }
  // un'eccezione su un file che è già allineato è un residuo: va togliata, non lasciata a coprire niente
  for (const r of quadroEdizioni()) {
    for (const m of r.manuali) {
      if (m.allineata && m.eccezione) assert.fail(`${r.file}/${m.id}: allineata al manuale corrente ma ancora in edizioni_in_attesa`);
    }
  }
});
