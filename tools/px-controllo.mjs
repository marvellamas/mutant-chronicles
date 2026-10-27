// Controllo «PX → livello» (lotto 132, 27/10/2026): la tabella dei casi di Davide passata da ogni punto dell'app che
// collega PX e livello, e — se si indica un px.json (archivio delle partite del Tavolo) — quali partite già assegnate
// cambierebbero per il Titolo se il livello fosse sfalsato di uno. Legge soltanto.
//   node tools/px-controllo.mjs [percorso/px.json]
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { livelloDaPx, livelloPg, riepilogo, passaggiDiLivello, componentiGiocatore, titoloPerLivello, confrontoLivelloPx, partiteDiverseSeSfalsato, fasceDiversePerScarto } from '../src/px-partita.js';

const p = JSON.parse(readFileSync(fileURLToPath(new URL('../data/px_partita.json', import.meta.url)), 'utf8'));
export const CASI = [0, 49, 50, 519, 520, 600, 719, 720, 1049, 1050, 10340];

/** Per ogni caso: il livello atteso (dalle soglie approvate, A.170) e quello che dice ogni punto dell'app. */
export function tabellaControllo(dati = p, casi = CASI) {
  return casi.map((px) => {
    const atteso = dati.soglie_px.reduce((l, s, i) => (px >= s ? i + 1 : l), 1);
    const riep = riepilogo([], [{ id: 'a' }], { baseline: px, atto: 'VI' }, dati)[0];
    // passaggio: PX di prima = px, +1 PX assegnato (nessuna partita): il «da» è il livello di partenza
    const partita = { atto: 'VI', partecipanti: { a: { presente: true, partecipazione: 0, interpretazione: 0, contributo: 0, eccezionale: 1 } } };
    const pass = passaggiDiLivello(partita, { a: px }, dati);
    const comp = componentiGiocatore(partita, 'a', px, dati);
    return {
      px, atteso,
      livelloDaPx: livelloDaPx(px, dati), livelloPg: livelloPg(px, 'VI', dati), riepilogo: riep.livello, pannelloPx: pass.length ? pass[0].da : livelloDaPx(px, dati),
      titolo: comp.titolo, titoloAtteso: titoloPerLivello(atteso, dati).nome, scheda: confrontoLivelloPx(atteso, px, dati)?.livelloPx,
    };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log('PX      atteso  livelloDaPx  livelloPg  riepilogo  pannello  scheda  Titolo');
  for (const r of tabellaControllo()) {
    const ok = [r.livelloDaPx, r.livelloPg, r.riepilogo, r.pannelloPx, r.scheda].every((x) => x === r.atteso) && r.titolo === r.titoloAtteso;
    console.log(`${String(r.px).padEnd(7)} ${String(r.atteso).padEnd(7)} ${String(r.livelloDaPx).padEnd(12)} ${String(r.livelloPg).padEnd(10)} ${String(r.riepilogo).padEnd(10)} ${String(r.pannelloPx).padEnd(9)} ${String(r.scheda).padEnd(7)} ${r.titolo}${ok ? '' : '   <-- NON TORNA'}`);
  }
  console.log('\nFasce di PX in cui il Titolo cambierebbe se il livello fosse letto di UNO in più:');
  for (const f of fasceDiversePerScarto(1, p)) console.log(`  livello ${f.livello}: ${f.da}–${f.a ?? '…'} PX, ${f.titolo} diventerebbe ${f.titoloSfalsato}`);
  const percorso = process.argv[2];
  if (percorso && existsSync(percorso)) {
    const db = JSON.parse(readFileSync(percorso, 'utf8'));
    const diverse = partiteDiverseSeSfalsato(db.partite ?? [], 1, p);
    console.log(`\nPartite assegnate che risulterebbero diverse con il livello sfalsato di +1: ${diverse.length}`);
    for (const d of diverse) console.log(`  ${d.data ?? d.partita} ${d.pg}: PX prima ${d.pxPrima} (livello ${d.livello}, ${d.titolo} ×${d.fattore}) → ${d.titoloSfalsato} ×${d.fattoreSfalsato}, ${d.deltaPx > 0 ? '+' : ''}${d.deltaPx} PX`);
  } else console.log('\n(nessun px.json indicato: per le partite di Davide, node tools/px-controllo.mjs <px.json>)');
}
