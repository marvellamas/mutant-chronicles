// Non serve più caricarlo con `--import`: dal 01/11/2026 (lotto 150) la guardia sulle cartelle vere e il profilo di
// prova li accende da sé il codice (tools/guardia-automatica.mjs), qualunque sia il modo di lanciare i test
// (`npm test`, `node --test`, un file singolo, uno strumento avviato da un test). Resta per chi lo usa ancora.
import '../tools/guardia-subito.mjs';
