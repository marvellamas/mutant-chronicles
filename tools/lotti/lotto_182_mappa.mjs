// Lotto 182 (08/11/2026): le tre risposte di Davide del 06/11 sulla mappa — A.253 (decollo e atterraggio della
// Neverlost), A.254 (dove sta la testa della Madre delle Murene) e A.255 (la Murena eterea dentro la roccia).
// Scrive:
//  - data/veicoli.json → «volo»: le regole comuni dei mezzi che volano (a terra movimento 0, decollo e atterraggio
//    come manovre complesse, movimenti che non si convertono fuori dalla loro scala) e, sul profilo della
//    Neverlost, «vola: true» con i suoi movimenti per andatura;
//  - data/mappa.json → «testa»: quando il segno della testa si può spostare (A.254) e «roccia»: che cosa può e non
//    può fare una creatura completamente immersa nella roccia (A.255).
// Il comportamento è in src/volo-veicolo.js, src/mappa/sagoma.js e src/mappa/roccia.js.
// Uso: node tools/lotti/lotto_182_mappa.mjs [--scrivi]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => JSON.parse(fs.readFileSync(join(R, f), 'utf8'));
const F_VEI = 'data/veicoli.json';
const F_MAP = 'data/mappa.json';

const vei = leggi(F_VEI);
const map = leggi(F_MAP);

// ───────────────────────── A. A.253: la Neverlost decolla e atterra ─────────────────────────
// «A terra la Neverlost non rulla e ha movimento 0. Il decollo verticale è una manovra complessa: 1 AzM + 1 AzP del
// pilota; normalmente non richiede prova, salvo spazio ristretto, attacco in corso o danni. Nel round di decollo sale
// in stazionamento senza spostamento orizzontale; dal round successivo usa i movimenti della scala tattica 8/16/24,
// senza convertirli in 80/160/240 sulla mappa terrestre: si passa alla scala tattica o si esce dalla mappa.
// L'atterraggio è una manovra complessa e conclude il movimento.» (Davide, 06/11/2026)
vei.volo = {
  versione_manuale: 'Veicoli 0.10; scheda tecnica della Neverlost 1.6',
  fonte: 'A.253 (Davide, 06/11/2026); A.238 (03/11/2026) per le dimensioni in Q Base',
  _nota: 'Regole dei mezzi che volano (profilo con «vola: true»). Lo stato sta nel record del mezzo: mezzo.volo = { stato, dal_round? }. Tre stati: «a_terra», «stazionamento» (il Round del decollo) e «in_volo».',
  stati: [
    { id: 'a_terra', nome: 'A terra', mov_q: 0, nota: 'A terra non rulla e ha movimento 0: non si sposta di un quadretto stando a terra. Lo sposta soltanto il Direttore, a mano, se la storia lo richiede.' },
    { id: 'stazionamento', nome: 'In stazionamento', mov_q: 0, nota: 'Il Round del decollo: sale in stazionamento, senza spostamento orizzontale.' },
    { id: 'in_volo', nome: 'In volo', mov_q: null, nota: 'Dal Round successivo al decollo usa i movimenti della sua scala di combattimento.' },
  ],
  iniziale: 'a_terra',
  decollo: {
    nome: 'Decollo verticale',
    manovra: 'complessa',
    azioni: { azm: 1, azp: 1 },
    testo_azioni: '1 AzM + 1 AzP del pilota',
    prova: null,
    prova_nei_casi: [
      { id: 'spazio_ristretto', nome: 'Spazio ristretto' },
      { id: 'attacco_in_corso', nome: 'Attacco in corso' },
      { id: 'danni', nome: 'Danni al mezzo' },
    ],
    testo_prova: 'Normalmente non richiede prova; la richiede con spazio ristretto, attacco in corso o danni.',
    nel_round: 'sale in stazionamento, senza spostamento orizzontale',
    porta_a: 'stazionamento',
  },
  atterraggio: {
    nome: 'Atterraggio',
    manovra: 'complessa',
    conclude_movimento: true,
    testo: 'L’atterraggio è una manovra complessa e conclude il movimento del Round.',
    porta_a: 'a_terra',
  },
  senza_conversione: {
    _nota: 'A.253: i movimenti della scala tattica non si convertono sulla mappa terrestre. 8/16/24 Q Tattici non diventano 80/160/240 Q Base: la conversione della A.225 e del lotto 149 qui non si applica, e se l’app la applica è un difetto. L’app non mostra un numero di quadretti inventato: dice che non si convertono e quali sono le due strade.',
    titolo: 'I movimenti in volo non si convertono',
    testo: 'In volo la nave usa i movimenti della sua scala di combattimento, che su questa mappa non si convertono (A.253).',
    strade: [
      'passare alla scala tattica (regolazioni della mappa → Scala)',
      'uscire dalla mappa: il volo si gioca fuori dalla scena terrestre',
    ],
  },
};

const nev = vei.profili.find((p) => p.id === 'neverlost');
nev.vola = true;
nev.volo_andature = {
  fonte: 'A.253 (Davide, 06/11/2026); scheda tecnica della Neverlost 1.6',
  unita: 'tattica',
  per_andatura: { controllata: 8, veloce: 16, massima: 24 },
  _nota: 'I movimenti della scala tattica, 8 / 16 / 24 Q Tattici per Round. Non si convertono in Q Base (A.253): su una mappa terrestre si passa alla scala tattica o si esce dalla mappa.',
};
nev.mov_testo = `${nev.mov_testo} A.253 (06/11/2026): a terra la nave non rulla e ha movimento 0; il decollo verticale è una manovra complessa (1 AzM + 1 AzP) e nel suo Round sale in stazionamento senza spostamento orizzontale; dal Round successivo valgono 8 / 16 / 24 Q Tattici, che non si convertono sulla mappa in Q Base.`;

// ───────────────────────── B. A.254: dove sta la testa ─────────────────────────
// «Il Direttore può collocare la testa in qualunque casella occupata dalla sagoma corrente, anche centrale, purché la
// posizione sia anatomicamente plausibile rispetto alla posa o all'emersione parziale; mai fuori dalla sagoma. La
// posizione può cambiare quando la creatura si muove, ruota, cambia configurazione o assume una nuova posa, non fra un
// attacco e l'altro per ottenere una linea più favorevole. Il segnalino modifica soltanto l'origine di attacchi,
// soffio, aura ed effetti centrati sulla testa, non movimento, spazio occupato o portata.» (Davide, 06/11/2026)
map.testa = {
  fonte: 'A.254 (Davide, 06/11/2026), che precisa la A.223 (03/11/2026)',
  _nota: 'Conferma la A.223: qualunque quadretto della sagoma corrente, anche centrale, mai fuori. Aggiunge quando la posizione può cambiare, e che il segno sposta soltanto l’origine degli effetti centrati sulla testa.',
  dove: 'qualunque quadretto occupato dalla sagoma corrente, anche centrale',
  mai_fuori: 'La testa non esce mai dalla sagoma.',
  plausibile: 'La posizione dev’essere anatomicamente plausibile rispetto alla posa o all’emersione parziale: lo giudica il Direttore.',
  cambia_quando: [
    'la creatura si muove',
    'la creatura ruota',
    'la creatura cambia configurazione',
    'la creatura assume una nuova posa',
  ],
  non_fra_attacchi: {
    avviso: 'La testa non si sposta fra un attacco e l’altro per ottenere una linea più favorevole (A.254). Si sposta quando la creatura si muove, ruota, cambia configurazione o assume una posa nuova.',
    quando: 'la creatura ha già attaccato in questo Round',
  },
  sposta_solo: 'origine di attacchi, soffio, aura ed effetti centrati sulla testa',
  non_sposta: ['movimento', 'spazio occupato', 'portata'],
};

// A.253: le voci del menu del token per i mezzi che volano (data/mappa.json → menu.token, gruppo «Veicolo»)
const gruppoVeicolo = map.menu.token.gruppi.find((g) => g.titolo === 'Veicolo');
for (const v of ['decolla', 'atterra']) if (!gruppoVeicolo.voci.includes(v)) gruppoVeicolo.voci.push(v);

// A.255: la voce che propone l'uscita per una creatura resa corporea dentro la roccia (gruppo «Azioni»)
const gruppoAzioni = map.menu.token.gruppi.find((g) => g.titolo === 'Azioni');
if (!gruppoAzioni.voci.includes('uscita_roccia')) gruppoAzioni.voci.push('uscita_roccia');

// ───────────────────────── C. A.255: la Murena eterea dentro la roccia ─────────────────────────
// «La Murena eterea può terminare il movimento dentro la roccia. Finché è completamente immersa non ha linea di vista o
// d'effetto verso l'esterno, non può attaccare né essere normalmente bersagliata e non percepisce automaticamente oltre
// la parete. Per attaccare deve emergere quanto basta e spendere il normale movimento; se non lo esaurisce può rientrare
// con il movimento residuo. Se viene eccezionalmente resa corporea nella roccia, viene spostata nella casella libera più
// vicina alla superficie, diventa corporea e Prona, senza attacchi di opportunità; a parità di distanza decide il
// Direttore.» (Davide, 06/11/2026)
map.roccia = {
  fonte: 'A.255 (Davide, 06/11/2026); A.224 (03/11/2026) per il materiale Roccia, A.202 per la forma eterea',
  _nota: 'Chi attraversa la roccia (la Murena della Roccia in forma eterea) può terminarci il movimento. «Completamente immersa» vuol dire che ogni quadretto della sua sagoma è roccia: con un solo quadretto fuori è emersa, e vale tutto il normale.',
  immersione: {
    nome: 'Immersa nella roccia',
    completa_se: 'ogni quadretto occupato è roccia',
    puo_fermarsi: true,
    vista: false,
    effetto: false,
    attacca: false,
    bersagliabile: false,
    percepisce_oltre: false,
    testo: 'Completamente immersa: nessuna linea di vista o d’effetto verso l’esterno, non può attaccare né essere normalmente bersagliata, non percepisce automaticamente oltre la parete.',
    per_attaccare: 'Per attaccare deve emergere quanto basta, spendendo il normale movimento; se non lo esaurisce può rientrare con il movimento residuo nello stesso Round.',
  },
  resa_corporea: {
    _nota: 'Caso eccezionale: la forma corporea non attraversa la roccia, quindi dentro la parete non ci può stare.',
    sposta_a: 'la casella libera più vicina alla superficie',
    stato: 'Prona',
    senza_opportunita: true,
    decide_il_direttore: 'A parità di distanza sceglie il Direttore: l’app propone le caselle, non ne sceglie una da sola.',
    testo: 'Resa corporea nella roccia: si sposta nella casella libera più vicina alla superficie, diventa corporea e Prona, senza attacchi di opportunità.',
  },
};

// ───────────────────────── esito ─────────────────────────
console.log('A.253 · stati del volo:', vei.volo.stati.map((s) => `${s.id}${Number.isInteger(s.mov_q) ? ` (MOV ${s.mov_q})` : ''}`).join(', '));
console.log('A.253 · decollo:', vei.volo.decollo.testo_azioni, '·', vei.volo.decollo.testo_prova);
console.log('A.253 · Neverlost:', JSON.stringify(nev.volo_andature.per_andatura), nev.volo_andature.unita, '— senza conversione');
console.log('A.254 · testa:', map.testa.dove, '·', map.testa.cambia_quando.length, 'motivi per cambiarla');
console.log('A.255 · immersa:', map.roccia.immersione.testo.slice(0, 80), '…');
if (process.argv.includes('--scrivi')) {
  for (const [f, j] of [[F_VEI, vei], [F_MAP, map]]) {
    fs.writeFileSync(join(R, f), `${JSON.stringify(j, null, 2)}\n`);
    console.log('scritto', f);
  }
}
