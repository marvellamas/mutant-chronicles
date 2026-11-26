// Lotto 252, parte C — **una copia scrivibile dei sette, senza spegnere la protezione.**
//
// Il collaudo di Davide del 25/11, prova 04: «La copia locale sulla porta 3001 usa cartelle di prova separate. La
// protezione rifiuta però di scrivere nella cartella che contiene schede copiate, non create dalla prova. Serve la
// procedura supportata per usare una copia scrivibile degli stessi sette PG, senza disattivare la protezione».
//
// Ha ragione a chiederlo: il criterio del lotto 161 («in una prova non si scrive in una cartella con personaggi che la
// prova non ha creato») proibiva esattamente la prova che serve. La correzione sta in `tools/protezione-reali.mjs`: una
// cartella può **dichiararsi copia di prova** con un file dentro (`COPIA-DI-PROVA.json`), e dentro una cartella così si
// scrive. Le cartelle vere restano intoccabili: quella guardia è un'altra e non si sblocca con un file.
//
// Questo strumento fa la copia, la dichiara, e stampa il comando per accendere il server di prova.
//
// Uso:
//   node tools/copia-di-prova.mjs                       (dall'istantanea più recente in istantanee/)
//   node tools/copia-di-prova.mjs --da=<cartella>        (da una cartella di dati qualunque, in sola lettura)
//   node tools/copia-di-prova.mjs --dove=<cartella>      (dove metterla; per impostazione «copie-di-prova/» qui)
//   node tools/copia-di-prova.mjs --porta=3001           (la porta che il comando stampato userà)
import { existsSync, readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti } from './argomenti.mjs';
import { dichiaraCopiaDiProva, MARCATORE_COPIA } from './protezione-reali.mjs';
import { personaggiDellaCartella } from './personaggi-cartella.mjs';

fermaSeSconosciuti('copia-di-prova.mjs', process.argv.slice(2));
const arg = (n) => process.argv.slice(2).find((x) => x.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? null;
const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
const PORTA = Number(arg('porta') ?? 3001);
const CARTELLE = ['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'musica', 'galleria', 'px'];

/** L'istantanea aperta più recente in istantanee/ (la cartella, non lo zip). */
function ultimaIstantanea() {
  const base = join(RADICE, 'istantanee');
  if (!existsSync(base)) return null;
  const dirs = readdirSync(base).filter((d) => /^stato_\d{4}-\d{2}-\d{2}_\d{4}$/.test(d) && statSync(join(base, d)).isDirectory());
  return dirs.sort().at(-1) ? join(base, dirs.sort().at(-1)) : null;
}

const da = arg('da') ? resolve(arg('da')) : ultimaIstantanea();
if (!da || !existsSync(da)) {
  console.error('Non trovo da dove copiare: metti un’istantanea aperta in istantanee/ oppure indica --da=<cartella>.');
  process.exit(2);
}
const sorgentePg = existsSync(join(da, 'personaggi')) ? join(da, 'personaggi') : da;
const pg = personaggiDellaCartella(sorgentePg);
if (!pg.length) {
  console.error(`In ${sorgentePg} non ci sono personaggi (file con "formato": "mutant-personaggio").`);
  process.exit(2);
}

const adesso = new Date();
const stampa = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
// **il nome dice che cos'è**: chi apre questa cartella per sbaglio lo vede dal percorso, prima di guardare dentro
const nome = `COPIA-DI-PROVA_${stampa(adesso)}`;
const dove = resolve(arg('dove') ?? join(RADICE, 'copie-di-prova'), nome);
if (existsSync(dove)) {
  console.error(`${dove} esiste già: dagli un altro nome con --dove= oppure aspetta un minuto.`);
  process.exit(2);
}

for (const c of CARTELLE) mkdirSync(join(dove, c), { recursive: true });
// il marcatore **prima** dei file: se qualcosa va storto a metà, la cartella è già dichiarata copia
const dichiarazione = dichiaraCopiaDiProva(dove, {
  daDove: sorgentePg,
  chi: 'node tools/copia-di-prova.mjs',
  perche: 'Prova 04 del collaudo del 25/11/2026: distribuire i punti, confermare, riaprire e ricontrollare, senza toccare i PG veri.',
}, adesso);

// i personaggi: **il file attuale di ciascuno** (lotto 200), non tutte le versioni datate
let copiati = 0;
for (const p of pg) {
  copyFileSync(p.percorso, join(dove, 'personaggi', p.file));
  copiati += 1;
}
// e le altre cartelle di dati, se la sorgente le ha: veicoli, tavolo, scontri, scene, nemici, px
let altri = 0;
for (const c of CARTELLE.filter((x) => x !== 'personaggi')) {
  const sorgente = join(da, c);
  if (!existsSync(sorgente)) continue;
  for (const f of readdirSync(sorgente).filter((x) => x.endsWith('.json'))) {
    copyFileSync(join(sorgente, f), join(dove, c, f));
    altri += 1;
  }
}
// un LEGGIMI che si vede aprendo la cartella, oltre al marcatore che legge la guardia
writeFileSync(join(dove, 'LEGGIMI — COPIA DI PROVA.txt'), [
  'QUESTA NON È LA CARTELLA VERA.',
  '',
  `Copia di prova fatta il ${adesso.toLocaleString('it-IT')} da ${sorgentePg}.`,
  'Quello che si scrive qui NON arriva ai personaggi della campagna: è una copia per provare.',
  '',
  `Il server di prova si accende così (porta ${PORTA}, non la 3000 del server vero):`,
  `  node server.mjs --porta=${PORTA} --cartella=${join(dove, 'personaggi')}`,
  '',
  'Quando hai finito, questa cartella si butta: non serve a nessuno.',
  `Il file ${MARCATORE_COPIA} dice alla protezione che qui si può scrivere: non toglierlo.`,
  '',
].join('\n'));

console.log(`\nCOPIA DI PROVA PRONTA\n`);
console.log(`  da:      ${sorgentePg}`);
console.log(`  a:       ${dove}`);
console.log(`  dentro:  ${copiati} personaggi (il file attuale di ciascuno)${altri ? `, ${altri} file delle altre cartelle` : ''}`);
console.log(`  dichiarata copia di prova: ${MARCATORE_COPIA} (${new Date(dichiarazione.creata).toLocaleString('it-IT')})`);
console.log(`\nI personaggi copiati: ${pg.map((p) => p.nome).join(', ')}`);
console.log(`\nAccendi il server di prova (NON la porta 3000 del server vero):`);
console.log(`  node server.mjs --porta=${PORTA} --cartella=${join(dove, 'personaggi')}`);
console.log(`\nPoi apri  http://localhost:${PORTA}/  e lavora lì: la fascia in alto dice che è una copia di prova.`);
console.log('Per tornare indietro: chiudi il server e butta la cartella. I file veri non sono stati toccati.\n');
