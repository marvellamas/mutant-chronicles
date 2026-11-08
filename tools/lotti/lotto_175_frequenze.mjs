// Lotto 175 (05/11/2026): le frequenze degli usi (Giocatore 0.54 §3.2; A.233, Davide 02/11/2026).
//
// Che cosa scrive:
//  - regole.json → frequenze: le sei del manuale (combattimento, sessione, giorno, settimana, scena, capitolo), con il
//    testo di «quando torna» che la tab Combattimento mostra accanto a un uso consumato;
//  - `usi: { ambito }` del lotto 129 → `usi: { frequenza }` (scontro → combattimento) in addestramenti.json e
//    talenti_liberi.json;
//  - `usi: { frequenza, quantita: 1 }` ai Talenti (Liberi e di Classe) il cui testo comincia una frase con «Una volta per
//    <frequenza>» (o «La prima volta per <frequenza>») detto di chi possiede il Talento: lo decide il testo del catalogo,
//    non un elenco nel codice. Hacker: `per: 'sistema'` («una volta per sessione per ciascun sistema»);
//  - Maestria Hacker: `toglie_limite: ['hacker']` («Il precedente limite … viene eliminato»).
// Restano «Da applicare al tavolo» (nessun contatore) le voci il cui limite non è un numero di usi di chi le possiede:
// AL_TAVOLO qui sotto, con il motivo.
// Il Capolavoro era fra questi fino al 08/11/2026: la A.259 ne ha fatto un numero («ogni singolo Capolavoro concede
// un proprio uso una volta per sessione»), quindi adesso ha il suo «usi» con «per: 'capolavoro'» e l'app lo conta
// (lotto 183, tools/lotti/lotto_183_capolavori.mjs, src/capolavori.js).
//
// Uso: node tools/lotti/lotto_175_frequenze.mjs [--scrivi]   (senza --scrivi dice soltanto cosa cambierebbe)
// Rilanciabile.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => JSON.parse(fs.readFileSync(join(R, f), 'utf8'));
const SCRIVI = process.argv.includes('--scrivi');
const scrivi = (f, x) => { if (SCRIVI) fs.writeFileSync(join(R, f), `${JSON.stringify(x, null, 2)}\n`); };
const cambi = [];
const uguale = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// voci con una frequenza nel testo che NON diventano un contatore: il limite riguarda chi riceve, o non è un numero
export const AL_TAVOLO = {
  'Protocollo Shock': 'il limite è per beneficiario («ogni beneficiario può ricevere questo intervento una volta per combattimento»): il Talento si usa su più persone',
  'Fede Incrollabile': 'il limite è «per ciascun beneficiario»: il Talento si usa su più alleati',
  Consolazione: 'il limite è di chi riceve («ogni creatura può ricevere Consolazione una sola volta per scena»)',
  'Interposizione Armata': 'nessun limite («senza ulteriori limiti per Round o per combattimento»)',
};
const DA_AMBITO = { scontro: 'combattimento', sessione: 'sessione', giorno: 'giorno' };
// «Una volta per scena, …» / «La prima volta per scena che …» / «…, una volta per scena, può …»
const RE = /(?:^|[.,;:]\s*|\be,\s*)(?:una volta|la prima volta)\s+per\s+(combattimento|sessione|giorno|settimana|scena|capitolo)\b(?!\s+per\s+(?:ciascun|beneficiario))/i;

/** La frequenza di un testo di Talento, o null. */
export function frequenzaDaTesto(t) {
  const m = RE.exec(String(t ?? ''));
  return m ? m[1].toLowerCase() : null;
}

// --- regole
const regole = leggi('data/regole.json');
const FREQ = {
  fonte: 'Giocatore 0.54 §3.2 (tabella delle frequenze); A.233 (Davide, 02/11/2026): il capitolo è distinto dall’Atto dei PX; scena e capitolo li comincia il Direttore dalla plancia; gli usi per sessione si rinnovano all’inizio della partita; giorno e settimana seguono il calendario della campagna; i comandi non ripristinano PM, munizioni o altre risorse.',
  _nota: 'Le frequenze degli «usi» dei Talenti (src/usi-talenti.js). «torna»: quando torna disponibile un uso consumato, come lo legge il giocatore (nel titolo); «breve»: lo stesso sul pulsante dell’uso consumato, per non allungare la riga; «a_mano»: quando l’app non ha il momento (Calendario spento, nessun server) e il contatore si rimette con «↺».',
  combattimento: { nome: 'per combattimento', torna: 'torna al prossimo scontro', breve: 'prossimo scontro' },
  sessione: { nome: 'per sessione', torna: 'torna con «Nuova sessione»', breve: 'nuova sessione' },
  giorno: { nome: 'al giorno', torna: 'torna domani', breve: 'domani', a_mano: 'torna domani (senza Calendario: «↺» a mano)' },
  settimana: { nome: 'alla settimana', torna: 'torna fra 7 giorni', breve: 'fra 7 giorni', a_mano: 'torna fra 7 giorni (senza Calendario: «↺» a mano)' },
  scena: { nome: 'per scena', torna: 'torna a inizio scena', breve: 'nuova scena', a_mano: 'torna a inizio scena (senza server: «↺» a mano)' },
  capitolo: { nome: 'per capitolo', torna: 'torna al prossimo capitolo', breve: 'nuovo capitolo', a_mano: 'torna al prossimo capitolo (senza server: «↺» a mano)' },
};
if (!uguale(regole.frequenze, FREQ)) cambi.push('regole.frequenze');
regole.frequenze = FREQ;
scrivi('data/regole.json', regole);

/** Il vecchio «ambito» → «frequenza». */
function migra(usi, dove) {
  if (!usi || usi.frequenza) return usi;
  const { ambito, ...resto } = usi;
  cambi.push(`${dove}: ambito ${ambito} → frequenza ${DA_AMBITO[ambito]}`);
  return { frequenza: DA_AMBITO[ambito], ...resto };
}

// --- addestramenti: solo la migrazione (i vantaggi hanno già il loro «usi»)
const addestramenti = leggi('data/addestramenti.json');
const visita = (o, f) => { if (Array.isArray(o)) o.forEach((x) => visita(x, f)); else if (o && typeof o === 'object') { f(o); for (const k in o) visita(o[k], f); } };
visita(addestramenti, (o) => { if (o.usi && typeof o.usi === 'object' && !Array.isArray(o.usi) && o.usi.ambito) o.usi = migra(o.usi, `addestramenti ${o.nome}`); });
scrivi('data/addestramenti.json', addestramenti);

// --- Talenti Liberi
const liberi = leggi('data/talenti_liberi.json');
visita(liberi, (o) => {
  if (!o.id || typeof o.testo !== 'string') return;
  if (o.usi?.ambito) o.usi = migra(o.usi, `talenti_liberi ${o.id}`);
  if (o.id === 'hacker') {
    const u = { frequenza: 'sessione', quantita: 1, per: 'sistema' };
    if (!uguale(o.usi, u)) cambi.push('talenti_liberi hacker: per sistema');
    o.usi = u;
    return;
  }
  if (o.id === 'maestria-hacker') {
    if (!uguale(o.toglie_limite, ['hacker'])) cambi.push('talenti_liberi maestria-hacker: toglie_limite hacker');
    o.toglie_limite = ['hacker'];
    return;
  }
  if (o.usi || AL_TAVOLO[o.nome]) return;
  const f = frequenzaDaTesto(o.testo);
  if (f) { o.usi = { frequenza: f, quantita: 1 }; cambi.push(`talenti_liberi ${o.id}: ${f}`); }
});
scrivi('data/talenti_liberi.json', liberi);

// --- Talenti di Classe (talenti_fissi e talenti_a_scelta)
const classi = leggi('data/classi.json');
for (const c of classi.classi) {
  for (const t of [...(c.talenti_fissi ?? []), ...(c.talenti_a_scelta ?? [])]) {
    if (typeof t.testo !== 'string' || AL_TAVOLO[t.nome]) continue;
    const f = frequenzaDaTesto(t.testo);
    if (!f) continue;
    const u = { frequenza: f, quantita: 1 };
    if (!uguale(t.usi, u)) cambi.push(`classi ${c.nome} · ${t.nome}: ${f}`);
    t.usi = u;
  }
}
scrivi('data/classi.json', classi);

console.log(cambi.length ? `${SCRIVI ? 'Scritto' : 'Cambierebbe'} (${cambi.length}):\n  ${cambi.join('\n  ')}` : 'Niente da cambiare.');
