// Lotti storici: generano un file intero dalle fonti del momento (PDF 0.50, Doc 0.3…). I dati sono poi
// cambiati con i lotti successivi (Armamenti 0.54–0.58, Equipaggiamento 0.5: NEC, alimentazione, Katana
// Ryūjin, pacchi dei lanciafiamme…), quindi un rilancio con --scrivi li riporterebbe indietro.
// Senza --scrivi il lotto gira come prima (prova a vuoto, controllo); con --scrivi si ferma, salvo --forza.
// Lotti in vigore: tools/lotti/lotto_armamenti_058.mjs, lotto_equipaggiamento_03.mjs, lotto_equipaggiamento_05.mjs
// (docs/equipaggiamento-lotti.md).
export function bloccaRiscrittura(nome) {
  if (!process.argv.includes('--scrivi') || process.argv.includes('--forza')) return;
  console.error(`${nome}: lotto storico, i dati che scrive sono stati aggiornati dai lotti successivi`);
  console.error('(Armamenti 0.58, Equipaggiamento 0.5). Un rilancio con --scrivi li riporterebbe indietro:');
  console.error('modifica i dati o i lotti in vigore (docs/equipaggiamento-lotti.md). Per forzare: --forza.');
  process.exit(1);
}
