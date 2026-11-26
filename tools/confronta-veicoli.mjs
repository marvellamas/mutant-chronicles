// Lotto 252, parte B — **due record dello stesso mezzo, affiancati campo per campo.**
//
// Il collaudo di Davide del 25/11: Pablo vede due Neverlost, e le due righe puntano a file diversi. Davide chiede la
// cosa giusta — «verificare da dove proviene la voce personale e confrontare stato, riserve e collegamenti prima di
// qualunque fusione o rimozione. La revisione 1, da sola, non prova che sia priva di dati utili».
//
// Questo strumento **legge e confronta, non tocca niente**: la rimozione la fa il Direttore dal suo PC col pulsante
// del lotto 218, che mette prima il record in `veicoli/cancellati/`.
//
// Uso:
//   node tools/confronta-veicoli.mjs <cartella veicoli> [<cartella personaggi>] [<cartella scene>]
//   node tools/confronta-veicoli.mjs <cartella veicoli> --coppia=id1,id2
// Senza `--coppia` cerca da sé i record che condividono il profilo (i doppioni possibili) e li confronta a due a due.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fermaSeSconosciuti } from './argomenti.mjs';
import { personaggiDellaCartella } from './personaggi-cartella.mjs';
import { quandoNato } from '../src/veicoli.js';
import { vede } from '../src/veicoli-registro.js';

fermaSeSconosciuti('confronta-veicoli.mjs', process.argv.slice(2));
const arg = (n) => process.argv.slice(2).find((x) => x.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? null;
const liberi = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const [dirVeicoli, dirPg, dirScene] = liberi;
if (!dirVeicoli) {
  console.error('Uso: node tools/confronta-veicoli.mjs <cartella veicoli> [<personaggi>] [<scene>] [--coppia=id1,id2]');
  process.exit(2);
}

const leggi = (d) => (existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => ({ file: f, o: JSON.parse(readFileSync(join(d, f), 'utf8')) })) : []);
const record = leggi(dirVeicoli).filter((x) => x.o?.formato === 'mutant-veicolo');

/** I campi che contano al tavolo, con il percorso dentro il record. */
const CAMPI = [
  ['revisione', (o) => o.revisione],
  ['aggiornato', (o) => String(o.aggiornato ?? '').slice(0, 19).replace('T', ' ')],
  ['proprietario', (o) => (o.proprietario?.tipo === 'gruppo' ? 'il gruppo' : o.proprietario?.nome ?? '—')],
  ['conducente', (o) => o.conducente?.nome ?? 'nessuno'],
  ['mitragliere', (o) => o.mitragliere?.nome ?? 'nessuno'],
  ['nome dell’esemplare', (o) => o.mezzo?.nome ?? '—'],
  ['PI corpo / propulsione / motore', (o) => [o.mezzo?.pi?.corpo, o.mezzo?.pi?.propulsione, o.mezzo?.pi?.motore].join(' / ')],
  ['rinforzi', (o) => (Object.keys(o.mezzo?.rinforzi ?? {}).length ? JSON.stringify(o.mezzo.rinforzi) : 'nessuno')],
  ['energia: Rosso', (o) => segna(o.mezzo?.energia?.rosso)],
  ['energia: Blu', (o) => segna(o.mezzo?.energia?.blu)],
  ['energia: Verde', (o) => segna(o.mezzo?.energia?.verde)],
  ['cariche di volo', (o) => segna(o.mezzo?.energia?.volo_cariche)],
  ['traiettoria', (o) => (o.mezzo?.energia?.traiettoria?.dentro ? `dentro, ${o.mezzo.energia.traiettoria.giorni} giorni` : 'fuori')],
  ['traversate registrate', (o) => (o.mezzo?.energia?.traiettoria?.traversate ?? []).length],
  ['scudo (ScE)', (o) => segna(o.mezzo?.scudo?.sce)],
  ['scudo attivo', (o) => (o.mezzo?.scudo?.attivo ? 'sì' : 'no')],
  ['circuito Bianco (PM)', (o) => segna(o.mezzo?.circuito?.pm)],
  ['munizioni', (o) => (o.mezzo?.munizioni ?? []).map((m) => (m ? `${m.caricate}+${m.riserva}` : '—')).join(' | ')],
  ['avarie', (o) => o.mezzo?.avarie || 'nessuna'],
  ['energia da registrare', (o) => ['rosso', 'blu', 'verde'].filter((k) => o.mezzo?.energia?.[k] === null || o.mezzo?.energia?.[k] === undefined).join(', ') || 'niente'],
  ['storico (righe)', (o) => (o.mezzo?.storico ?? o.storico ?? []).length],
  ['byte del file', (o) => JSON.stringify(o).length],
];
const segna = (v) => (v === null || v === undefined ? '«da registrare»' : String(v));

/**
 * **Chi lo cita** (il riferimento scritto nel file del PG o il token di una scena) e **chi lo vede** (il registro lo
 * mostra a chi è proprietario, conducente, o a tutti se è del gruppo: `vede()` di src/veicoli-registro.js) sono due
 * cose diverse, e qui la differenza è la risposta: le due Neverlost non sono citate da nessun file, e Pablo le vede
 * tutte e due perché una è del gruppo e l'altra è sua.
 */
function chiVede(rec) {
  const out = [];
  // un personaggio, non un file (lotto 200): nella cartella vera convivono cinque versioni datate per PG, e
  // leggerle tutte faceva comparire lo stesso nome sei volte
  for (const p of (dirPg ? personaggiDellaCartella(dirPg) : [])) {
    const chi = { pg: p.json.pg ?? null, chiave: p.nome.replace(/s+/g, '-').toUpperCase(), nome: p.nome };
    if (vede(rec, chi)) out.push(p.nome);
  }
  return out;
}

/** Chi cita un id: personaggi (scelte.veicoli) e token delle scene. */
function chiCita(id) {
  const out = [];
  for (const p of (dirPg ? personaggiDellaCartella(dirPg) : [])) {
    const suoi = (p.json.scelte?.veicoli ?? []).filter((v) => v?.rif === id || v?.uid === id);
    if (suoi.length) out.push(`${p.nome} (scheda${suoi.length > 1 ? `, ${suoi.length} righe` : ''})`);
  }
  for (const { file, o } of leggi(dirScene ?? '')) {
    const token = (o?.token ?? o?.pezzi ?? []).filter((t) => t?.veicolo === id || t?.rif === id);
    if (token.length) out.push(`scena «${o?.nome ?? file}» (${token.length} pedin${token.length === 1 ? 'a' : 'e'})`);
  }
  return out;
}

const coppie = [];
if (arg('coppia')) {
  const [a, b] = arg('coppia').split(',');
  const ra = record.find((x) => x.o.id === a);
  const rb = record.find((x) => x.o.id === b);
  if (!ra || !rb) { console.error(`non trovo ${!ra ? a : b} in ${dirVeicoli}`); process.exit(2); }
  coppie.push([ra, rb]);
} else {
  const perProfilo = new Map();
  for (const r of record) {
    const p = r.o.mezzo?.profilo ?? '(senza profilo)';
    if (!perProfilo.has(p)) perProfilo.set(p, []);
    perProfilo.get(p).push(r);
  }
  for (const [, lista] of perProfilo) {
    if (lista.length < 2) continue;
    for (let i = 0; i < lista.length - 1; i += 1) for (let j = i + 1; j < lista.length; j += 1) coppie.push([lista[i], lista[j]]);
  }
}

console.log(`\nCONFRONTO DEI RECORD DEI VEICOLI — ${record.length} record in ${dirVeicoli}\n`);
if (!coppie.length) console.log('Nessun profilo con più di un record: niente da confrontare.');
for (const [A, B] of coppie) {
  const a = A.o;
  const b = B.o;
  console.log(`${a.id}  ↔  ${b.id}   (profilo ${a.mezzo?.profilo})`);
  console.log(`nati: ${quandoNato(a.id) ?? '?'} ${ora(a.id)}  ·  ${quandoNato(b.id) ?? '?'} ${ora(b.id)}${distanza(a.id, b.id)}`);
  const larghezza = Math.max(...CAMPI.map(([n]) => n.length));
  let differenze = 0;
  for (const [nome, leggiCampo] of CAMPI) {
    const va = String(leggiCampo(a));
    const vb = String(leggiCampo(b));
    const diverso = va !== vb;
    if (diverso) differenze += 1;
    console.log(`  ${diverso ? '≠' : ' '} ${nome.padEnd(larghezza)}  ${va.padEnd(26)}  ${vb}`);
  }
  const citaA = chiCita(a.id);
  const citaB = chiCita(b.id);
  console.log(`  ${citaA.join(' / ') === citaB.join(' / ') ? ' ' : '≠'} ${'chi lo cita nel suo file'.padEnd(larghezza)}  ${(citaA.join(' / ') || 'nessuno').padEnd(26)}  ${citaB.join(' / ') || 'nessuno'}`);
  const vedeA = chiVede(a);
  const vedeB = chiVede(b);
  console.log(`  ${vedeA.join(' / ') === vedeB.join(' / ') ? ' ' : '≠'} ${'chi lo vede nella tab'.padEnd(larghezza)}  ${(vedeA.join(', ') || 'nessuno').padEnd(26)}  ${vedeB.join(', ') || 'nessuno'}`);
  console.log(`\n  differenze: ${differenze} campi su ${CAMPI.length}`);
  console.log(`  togliendo ${a.id} si perderebbe: ${perdita(a, b)}`);
  console.log(`  togliendo ${b.id} si perderebbe: ${perdita(b, a)}`);
  console.log('  Nessuna rimozione da qui: la fa il Direttore dalla tab Veicoli (lotto 218), che mette prima il record in veicoli/cancellati/.\n');
}

// **La stessa famiglia: un riferimento che non punta a niente** (lotto 201). Un record doppio e un riferimento a un
// record che non c'è sono i due modi in cui l'elenco dei veicoli di un PG smette di dire il vero, e si leggono nello
// stesso posto: il riferimento rotto di LUCAS (il mezzo non si apre) sta qui accanto ai due Neverlost.
const idRegistro = new Set(record.map((r) => r.o.id));
const rotti = [];
for (const p of (dirPg ? personaggiDellaCartella(dirPg) : [])) {
  for (const v of p.json.scelte?.veicoli ?? []) {
    const id = v?.rif ?? v?.uid ?? null;
    if (!id || idRegistro.has(id)) continue;
    rotti.push(`${p.nome}: ${v.nome ?? 'veicolo'} → ${id}${quandoNato(id) ? ` (record del ${quandoNato(id)})` : ''}`);
  }
}
console.log(`
Riferimenti a record che nel registro non ci sono: ${rotti.length || 0}`);
for (const r of rotti) console.log(`  · ${r}`);
if (rotti.length) console.log("  Si ricollegano o si tolgono dalla tab Veicoli, in modalità master (lotto 201): «node tools/riferimenti-rotti.mjs» li elenca, «--scrivi» ricollega dove il candidato è uno solo.");

function ora(id) {
  const ms = Number.parseInt(String(id).slice(3, 11), 36);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(11, 19) : '';
}
function distanza(a, b) {
  const ma = Number.parseInt(String(a).slice(3, 11), 36);
  const mb = Number.parseInt(String(b).slice(3, 11), 36);
  if (!Number.isFinite(ma) || !Number.isFinite(mb)) return '';
  const s = Math.round(Math.abs(mb - ma) / 1000);
  return s < 300 ? `  — ${s} secondi uno dall'altro` : '';
}
/** Che cosa ha `x` che `altro` non ha: i campi che si perderebbero togliendo `x`. */
function perdita(x, altro) {
  const sue = [];
  for (const [nome, leggiCampo] of CAMPI) {
    if (['revisione', 'aggiornato', 'byte del file', 'storico (righe)', 'energia da registrare'].includes(nome)) continue;
    const vx = String(leggiCampo(x));
    const va = String(leggiCampo(altro));
    if (vx === va) continue;
    const vuoto = /«da registrare»|^nessun|^—|^fuori$|^no$|^0$|^niente$/.test(vx);
    if (!vuoto) sue.push(`${nome} = ${vx}`);
  }
  const cita = chiCita(x.id);
  if (cita.length) sue.push(`il collegamento di ${cita.join(' e ')}`);
  return sue.length ? sue.join('; ') : 'niente che l’altro record non abbia già';
}
