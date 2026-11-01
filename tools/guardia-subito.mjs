// Importato come prima riga da ogni test, da server.mjs e da tests/profilo-di-prova.mjs: accende la guardia
// (tools/guardia-automatica.mjs) appena il modulo si carica, prima di qualunque altro import.
import { attivaGuardiaAutomatica } from './guardia-automatica.mjs';

attivaGuardiaAutomatica();
