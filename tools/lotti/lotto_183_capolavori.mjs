// Lotto 183 (08/11/2026): le ultime due risposte di Davide — A.259 (uso dei Capolavori) e A.258 (gli Eretici e il
// vecchio catalogo dei nemici sono provvisori). Con questo lotto non resta più niente di suo da applicare.
// Scrive:
//  - data/classi.json → Artigiano, Talento «Capolavoro»: l'«usi» con il «per» che guarda l'oggetto
//    (`per: 'capolavoro'`), come Hacker ha `per: 'sistema'` (lotto 175); il Capolavoro esce dai «Da applicare al
//    tavolo» della A.233, perché adesso il suo limite è un numero e l'app lo conta;
//  - data/regole.json → «capolavoro»: la regola per intero (un uso per oggetto, uno solo per prova, il tiro si
//    ripete una volta sola e vale il secondo risultato anche se è peggiore, l'oggetto trasferito resta usato) e
//    quello che l'app **non** giudica, che scrive accanto al pulsante invece di decidere;
//  - data/formato_nemici.json → «provvisorie»: come si riconosce una creatura provvisoria e che cosa scrive l'app
//    (A.258: le creature inserite prima da Marcello vanno superate da quelle create per il Manuale).
// Il comportamento è in src/capolavori.js e src/provvisorie.js.
// Uso: node tools/lotti/lotto_183_capolavori.mjs [--scrivi]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => JSON.parse(fs.readFileSync(join(R, f), 'utf8'));
const F_CLA = 'data/classi.json';
const F_REG = 'data/regole.json';
const F_NEM = 'data/formato_nemici.json';

const classi = leggi(F_CLA);
const reg = leggi(F_REG);
const nem = leggi(F_NEM);

// ───────────────────────── A. A.259: i Capolavori ─────────────────────────
// «Ogni singolo Capolavoro concede un proprio uso una volta per sessione, non una volta per personaggio. Deve essere
// lo strumento principale di una prova pertinente e non offensiva. Nella stessa prova si può usare un solo Capolavoro
// e ripetere il tiro una sola volta, accettando il secondo risultato. Se l'oggetto viene trasferito, resta già usato
// fino alla sessione successiva.» (Davide, 06/11/2026)
const talentoCapolavoro = (() => {
  for (const c of classi.classi) for (const t of [...(c.talenti_fissi ?? []), ...(c.talenti_a_scelta ?? [])]) if (t.nome === 'Capolavoro') return { classe: c.nome, t };
  return null;
})();
if (!talentoCapolavoro) { console.error('Talento «Capolavoro» non trovato in classi.json'); process.exit(1); }

// Il «per» guarda l'oggetto: un uso per ciascun Capolavoro, non uno per personaggio (come Hacker con `per: 'sistema'`).
// Lo stato però NON sta nella sessione del personaggio: sta sulla voce dell'oggetto (`voce.capolavoro.usato`), perché
// un Capolavoro trasferito resta già usato fino alla sessione successiva (src/capolavori.js).
talentoCapolavoro.t.usi = { frequenza: 'sessione', quantita: 1, per: 'capolavoro' };
talentoCapolavoro.t._nota_usi = 'A.259 (Davide, 06/11/2026): «Ogni singolo Capolavoro concede un proprio uso una volta per sessione, non una volta per personaggio.» Il «per» guarda l’oggetto: il contatore sta sulla voce dell’oggetto (voce.capolavoro.usato), non nella sessione del personaggio, perché un Capolavoro trasferito resta già usato fino alla sessione successiva. Prima della A.259 il Capolavoro era fra i «Da applicare al tavolo» della A.233, perché il limite non si riduceva a un numero: adesso si riduce.';

reg.capolavoro = {
  versione_manuale: 'Giocatore 0.54 (Artigiano, Talento di Grado V)',
  fonte: 'A.259 (Davide, 06/11/2026); classi.json → Artigiano → Capolavoro',
  _nota: 'Il contatore sta sull’oggetto, non sul personaggio: è il punto che decide tutto il resto. Se stesse sulla scheda, passando il Capolavoro a un compagno l’uso tornerebbe disponibile, e la regola dice il contrario.',
  frequenza: 'sessione',
  per_oggetto: true,
  quantita: 1,
  uno_per_prova: true,
  ripetizioni_per_prova: 1,
  tiene_il_secondo: true,
  trasferimento: 'resta già usato fino alla sessione successiva',
  bonus_va: 1,
  testi: {
    riga: 'Ogni Capolavoro ha il suo uso: una volta per sessione, non una per personaggio.',
    ripeti: 'Ripeti il tiro con il Capolavoro',
    secondo: 'Vale il secondo risultato, anche se è peggiore del primo.',
    gia_usato: 'Già usato in questa sessione: torna alla prossima sessione.',
    gia_ripetuto: 'In questa prova il tiro è già stato ripetuto: si ripete una volta sola.',
    altro_in_prova: 'In questa prova è già stato usato un Capolavoro: se ne usa uno solo.',
    trasferito: 'Trasferito già usato: l’uso è dell’oggetto, non di chi lo porta (A.259).',
  },
  // quello che l'app non giudica: lo scrive accanto al pulsante invece di decidere (CLAUDE.md: propone, non obbliga)
  al_tavolo: {
    testo: 'Lo decide il tavolo: che la prova sia pertinente, che il Capolavoro ne sia lo strumento principale e che non sia offensiva.',
    non_giudica: ['la prova è pertinente', 'l’oggetto è lo strumento principale', 'la prova non è offensiva'],
  },
  rinnovo: 'Gli usi dei Capolavori si rinnovano con «Nuova sessione», come gli altri usi per sessione (A.233).',
};

// ───────────────────────── B. A.258: le creature provvisorie ─────────────────────────
// «Gli Eretici generici presenti nei dati precedenti non sono creature canoniche del nostro bestiario. […] gli
// Eretici e tutte le altre creature nemiche inserite in precedenza da Marcello devono essere superati dalle creature
// create da noi per il Manuale. Gli Eretici come creature dell'Oscura Simmetria devono ancora essere completati.»
nem.provvisorie = {
  fonte: 'A.258 (Davide, 06/11/2026), chiarimento provvisorio',
  _nota: 'Una creatura è provvisoria quando non viene da un manuale di Davide: si riconosce dalla sua «fonte», non da un elenco scritto a mano, così resta vera anche quando arrivano creature nuove. Niente si cancella e niente si disattiva: finché non arrivano le creature nuove queste servono al tavolo (A.258). Il segno è un’indicazione discreta, non un allarme.',
  fonti_canoniche: ['dal Manuale dei Mostri'],
  sigla: 'provvisoria',
  titolo: 'Creatura provvisoria: non è canonica del bestiario e verrà sostituita da quelle create per il Manuale (A.258).',
  testo: 'Provvisoria (A.258): verrà sostituita.',
  dove: ['bestiario', 'pagina online', 'crea nemico', 'mini-scheda'],
  eretici: 'Gli Eretici come creature dell’Oscura Simmetria devono ancora essere completati: i profili attuali restano come sono, al Minore con «Toccato» e al Boss con «Consacrato», e ai gradi Semplice e Medio senza Doni (A.117).',
};

// ───────────────────────── esito ─────────────────────────
console.log('A.259 · Capolavoro:', JSON.stringify(talentoCapolavoro.t.usi), `(${talentoCapolavoro.classe})`);
console.log('A.259 · regola:', `uno per prova: ${reg.capolavoro.uno_per_prova}`, `· ripetizioni: ${reg.capolavoro.ripetizioni_per_prova}`, `· tiene il secondo: ${reg.capolavoro.tiene_il_secondo}`);
console.log('A.259 · non giudica:', reg.capolavoro.al_tavolo.non_giudica.join('; '));
console.log('A.258 · provvisorie: canoniche se la fonte comincia con', JSON.stringify(nem.provvisorie.fonti_canoniche), '· segno in', nem.provvisorie.dove.join(', '));
if (process.argv.includes('--scrivi')) {
  for (const [f, j] of [[F_CLA, classi], [F_REG, reg], [F_NEM, nem]]) {
    fs.writeFileSync(join(R, f), `${JSON.stringify(j, null, 2)}\n`);
    console.log('scritto', f);
  }
}
