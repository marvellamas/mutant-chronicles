// Lotti storici: generano un file intero dalle fonti del momento (PDF 0.50, Doc 0.3…). I dati sono poi
// cambiati con i lotti successivi (Armamenti 0.54–0.58, Equipaggiamento 0.5: NEC, alimentazione, Katana
// Ryūjin, pacchi dei lanciafiamme…), quindi un rilancio con --scrivi li riporterebbe indietro.
// Senza --scrivi il lotto gira come prima (prova a vuoto, controllo); con --scrivi si ferma, salvo --forza.
// Dal 02/10/2026 anche lotto_armamenti_058, lotto_equipaggiamento_03, _05, _06 e _07 sono storici: le risposte
// di Davide (tools/lotti/lotto_risposte_equip_0210.mjs) e i lotti del cap. 10 (tools/lotti/lotto_artefatti_cap10.mjs)
// hanno aggiornato i loro dati (docs/equipaggiamento-lotti.md).
export function bloccaRiscrittura(nome) {
  if (!process.argv.includes('--scrivi') || process.argv.includes('--forza')) return;
  console.error(`${nome}: lotto storico, i dati che scrive sono stati aggiornati dai lotti successivi`);
  console.error('(Armamenti 0.58, Equipaggiamento 0.5). Un rilancio con --scrivi li riporterebbe indietro:');
  console.error('modifica i dati o i lotti in vigore (docs/equipaggiamento-lotti.md). Per forzare: --forza.');
  process.exit(1);
}
