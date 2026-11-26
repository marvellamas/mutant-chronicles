// Lotto 240 (23/11/2026) — A.308: il focalizzatore Verde è installato sulla CyberArma di Dimitri.
//
// Il §7.25.4 degli Armamenti dice «È installato soltanto il focalizzatore Verde» e Davide lo ha confermato (A.308, riferito da
// Marcello il 23/11/2026: ancora non scritto nell'E&L né nel Doc). Nel file di Dimitri la voce è `armi:cyberarma` senza
// `esemplare`: nessun colore dichiarato, quindi nessun bonus. Il Verde si dichiara **nei dati**, per l'esemplare, e **non si scrive
// nel suo file**: il valore resta calcolato (principio 3 di CLAUDE.md) e arriva a Dimitri quando aggiorna l'app.
//
// La dichiarazione è per `uid` della voce (13 caratteri casuali, unici nel registro dei personaggi): vale per quell'arma e per
// nessun'altra. Se un giorno il Direttore cambia il cristallo («Modifica master» → «Cambia cristallo»), il colore scritto
// nell'esemplare vince sulla dichiarazione dei dati (`coloreCristallo`: esemplare, poi dati, poi profilo di catalogo).
//
//   node tools/lotti/lotto_240_verde_dimitri.mjs            dice che cosa farebbe
//   node tools/lotti/lotto_240_verde_dimitri.mjs --scrivi   scrive data/equipaggiamento/armi.json (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// lotto 255: l’edizione non si scrive qui (nona regola). La 0.92 ha fatto invecchiare un «0.90» scritto a mano,
// e il controllo di idempotenza del lotto 240 è diventato rosso: giusto così, ed è il motivo per cui si chiede al registro.
import { versioneManuale } from '../manuali.mjs';

const FILE = fileURLToPath(new URL('../../data/equipaggiamento/armi.json', import.meta.url));

export const DICHIARATI = [
  {
    uid: 'emwqzcjim4d0k',
    colore: 'Verde',
    di: 'la CyberArma di Dimitri Orlav (voce `armi:cyberarma`, impugnata e sintonizzata nell’istantanea del 21/11/2026, 23:53)',
    perche: `Armamenti ${versioneManuale('armamenti')} §7.25.4, «Stato delle modifiche»: «È installato soltanto il focalizzatore Verde» (Dimitri ha sostituito il frammento Viola dell’esemplare di Park con la propria scheggia Verde stabilizzata). Confermato da Davide il 23/11/2026 (A.308), riferito da Marcello.`,
    risposta: 'A.308',
  },
];

const NOTA = 'Lotto 240: gli esemplari di cui il manuale dice quale cristallo hanno installato e il cui file non lo dichiara. Un esemplare dichiarato non è un secondo oggetto e non cambia Integrità, nome o storico: è un colore calcolato, non scritto nel file del personaggio. I tre bonus (VA di Attacco, Parata, danno) valgono **solo con l’arma manifestata** (§7.25.5: «+1 VA di Attacco e Parata con l’arma manifestata; +1 al danno già incluso») e si contano una volta sola: il +1 al danno del Verde e il bonus di Destrezza del §5.13 sono due contributi distinti. Se l’esemplare dichiara un colore suo (Modifica master), vince quello.';

export function applica(json) {
  const voce = (json.oggetti ?? []).find((x) => x.id === 'cyberarma');
  if (!voce?.focalizzatori) throw new Error('la voce cyberarma con i focalizzatori non c’è: lotto 235 non applicato?');
  const F = voce.focalizzatori;
  const prima = JSON.stringify(F);
  const nuovo = {};
  for (const [k, v] of Object.entries(F)) {
    if (k === 'dichiarati' || k === '_lotto_240') continue;
    nuovo[k] = v;
    if (k === 'si_applica_a') { nuovo.dichiarati = DICHIARATI; nuovo._lotto_240 = NOTA; }
  }
  if (!nuovo.dichiarati) { nuovo.dichiarati = DICHIARATI; nuovo._lotto_240 = NOTA; }
  voce.focalizzatori = nuovo;
  return JSON.stringify(nuovo) !== prima;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const j = JSON.parse(readFileSync(FILE, 'utf8'));
  const cambia = applica(j);
  console.log(cambia ? 'da scrivere: focalizzatori.dichiarati = [uid emwqzcjim4d0k → Verde]' : 'niente da fare: già dichiarato');
  if (process.argv.includes('--scrivi') && cambia) { writeFileSync(FILE, JSON.stringify(j, null, 1) + '\n'); console.log('scritto', FILE); }
}
