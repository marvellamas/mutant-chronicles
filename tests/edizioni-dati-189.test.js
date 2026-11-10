// Lotto 189: ogni file di `data/` dichiara l'edizione corrente del suo manuale.
//
// Perché questo controllo esiste. Il principio 4 di CLAUDE.md dice che ogni file dati riporta `versione_manuale`.
// Il lotto 188 ha scoperto che quelle etichette erano rimaste indietro di quattro, sei, ventiquattro versioni —
// `dotazioni.json` diceva Giocatore 0.45 contro la 0.54, `incantesimi.json` Magia 1.3 contro la 1.11 — e che i
// controlli «i dati citano il manuale» restavano verdi soltanto perché in `docs/manuali-txt/` viveva ancora la
// copia di allora. Nessuno poteva più distinguere «l'etichetta è vecchia» da «il contenuto è vecchio»: è la stessa
// cecità che il 9/11 ha fatto descrivere un Lorath con il Getto acido.
//
// Un'etichetta vecchia non vuol dire contenuto vecchio, e questo controllo non lo pretende: pretende che la
// distanza sia **dichiarata**. Un file che resta indietro perché il manuale nuovo cambia una regola ancora da
// decidere va in `tools/manuali.json` → `edizioni_in_attesa`, con il motivo e il numero della domanda. Senza
// quella riga, rosso.
//
// Non tocca la rete: legge il registro e i file del repo.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RADICE, registro, voci, CARTELLA_TESTI } from '../tools/manuali.mjs';
import { quadroEdizioni, edizioniArretrate, manualiCitati, fileDati, eccezioni, NOMI } from '../tools/edizioni-dati.mjs';

test('ogni file di data/ dichiara l’edizione corrente del suo manuale, o un’eccezione col suo motivo', () => {
  const fuori = edizioniArretrate();
  const righe = fuori.map((x) => `${x.file}: dice ${x.manuale} ${x.citate.join('/')}, la corrente è ${x.corrente}`);
  assert.deepEqual(righe, [], `queste dichiarazioni sono arretrate.\nSe il contenuto corrisponde già, aggiorna versione_manuale.\nSe il manuale nuovo cambia una regola, dichiara l’eccezione in tools/manuali.json → edizioni_in_attesa con il motivo e la domanda.\n${righe.join('\n')}`);
});

test('le eccezioni dichiarate hanno un motivo e riguardano un file e un manuale veri', () => {
  const file = new Set(fileDati());
  const id = new Set(voci().map((v) => v.id));
  for (const [f, perManuale] of Object.entries(eccezioni())) {
    assert.ok(file.has(f), `edizioni_in_attesa: «${f}» non è un file di data/`);
    for (const [m, e] of Object.entries(perManuale)) {
      assert.ok(id.has(m), `edizioni_in_attesa[${f}]: «${m}» non è un manuale del registro`);
      // un'eccezione senza motivo non è un'eccezione: è un file dimenticato
      assert.ok(e?.motivo, `edizioni_in_attesa[${f}][${m}]: manca il motivo`);
    }
  }
});

test('ogni file di data/ ha una versione_manuale, e si capisce quale manuale cita', () => {
  const senzaManuale = [];
  for (const r of quadroEdizioni()) {
    assert.ok(r.dichiarata, `${r.file}: manca versione_manuale`);
    if (!r.manuali.length) senzaManuale.push(r.file);
  }
  // i file che non citano un manuale del registro sono pochi e si sanno: bestiario, galleria, PX
  assert.deepEqual(senzaManuale.sort(), ['data/bestiario.json', 'data/galleria.json', 'data/px_partita.json']);
});

test('il lettore di versione_manuale non confonde un paragrafo con un’edizione', () => {
  assert.deepEqual(manualiCitati('Giocatore 0.54 (Google Doc del 09/11/2026)'), { giocatore: ['0.54'] });
  assert.deepEqual(manualiCitati('Veicoli 0.2 (…), scheda ASA Scout MK4 0.2; … Veicoli 0.10'), { veicoli: ['0.2', '0.10'] });
  assert.deepEqual(manualiCitati('Manuale del Direttore §9.3 (riferimento funzionale)'), {}); // §9.3 è un paragrafo
  assert.deepEqual(manualiCitati('Giocatore 0.54; Magia 1.11; Equipaggiamento 0.30'), { giocatore: ['0.54'], magia: ['1.11'], equipaggiamento: ['0.30'] });
  assert.deepEqual(manualiCitati(null), {});
  for (const id of Object.values(NOMI)) assert.ok(voci().some((v) => v.id === id), `«${id}» non è nel registro`);
});

test('le edizioni superate che restano in cartella sono quelle che qualcuno cita ancora', () => {
  const citate = registro().edizioni_citate ?? {};
  for (const [nome, chi] of Object.entries(citate)) {
    assert.ok(existsSync(join(CARTELLA_TESTI, nome)), `edizioni_citate: «${nome}» non c’è più in docs/manuali-txt/`);
    assert.ok(chi, `edizioni_citate[${nome}]: manca chi la cita`);
  }
  // la 0.50 del Giocatore è citata dalle voci superate dei Talenti: se spariscono, si può archiviare
  const t = JSON.parse(readFileSync(join(RADICE, 'data', 'talenti_liberi.json'), 'utf8'));
  const superate = t.talenti.filter((x) => x.categoria === 'superato');
  assert.ok(superate.length > 0, 'nessuna voce superata: aggiorna edizioni_citate');
  for (const x of superate) assert.ok(x.fonte_edizione, `${x.id}: una voce superata deve dire da quale edizione viene il suo testo (fonte_edizione)`);
  assert.deepEqual([...new Set(superate.map((x) => x.fonte_edizione))], ['Giocatore 0.50']);
  assert.ok(citate['giocatore-0.50.md'], 'la 0.50 è citata dai dati ma non è in edizioni_citate');
});
