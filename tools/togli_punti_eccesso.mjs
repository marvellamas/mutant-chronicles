// Punti Abilità Liberi in eccesso nei file dei PG d'esempio e di collaudo (E&L del 03/10/2026: 5 punti a ogni Grado,
// compreso il primo, invece di 10). Toglie da ogni evento, dal più vecchio, i punti in più con lo stesso motore di
// «Togli» della scheda (src/avanzamento.js → validaRiduzione, applicaRiduzione). Criterio: prima i punti che non
// aumentano più il VA personale (§8.3), poi le Abilità assegnate per ultime nell'evento (quelle in fondo all'ordine
// del file, che i generatori riempiono per preferenza del ruolo); a parità, quella con più punti.
// Cambiano solo scelte.puntiAbilitaLiberi e livelli[].puntiAbilita: il resto del file resta com'è.
//   node tools/togli_punti_eccesso.mjs <file.json> …            → prova a vuoto: che cosa toglierebbe
//   node tools/togli_punti_eccesso.mjs --scrivi <file.json> …   → scrive i file
import { readFileSync, writeFileSync } from 'node:fs';

const u = (p) => new URL(`../${p}`, import.meta.url).href;
const { datiReali } = await import(u('tests/helpers.js'));
const { deserializzaPersonaggio, normalizza } = await import(u('src/character.js'));
const { puntiDaTogliere, statoRiduzione, validaRiduzione, applicaRiduzione } = await import(u('src/avanzamento.js'));

const scrivi = process.argv.includes('--scrivi');
const files = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const { dati } = await datiReali();

/** Punti da togliere dal primo evento in eccesso, con il criterio descritto sopra. */
function scelta(p) {
  const st = statoRiduzione(p, {}, dati);
  if (!st) return null;
  const togli = {};
  let resta = st.eccesso;
  // 1. punti inattivi; 2. dall'ultima Abilità dell'evento verso la prima, un punto alla volta
  const coda = [...st.abilita.flatMap((a) => Array(a.inattivi).fill(a.nome)), ...[...st.abilita].reverse().flatMap((a) => Array(a.punti).fill(a.nome))];
  const punti = Object.fromEntries(st.abilita.map((a) => [a.nome, a.punti]));
  for (const nome of coda) {
    if (resta <= 0) break;
    if ((togli[nome] ?? 0) >= punti[nome]) continue;
    const prova = { ...togli, [nome]: (togli[nome] ?? 0) + 1 };
    if (validaRiduzione(p, st.livello, prova, dati).some((e) => e.tipo === 'violazione')) continue;
    togli[nome] = prova[nome];
    resta--;
  }
  if (resta > 0) throw new Error(`evento ${st.evento}: non riesco a togliere ${resta} punti senza violare le regole`);
  return { livello: st.livello, evento: st.evento, togli };
}

for (const f of files) {
  const testo = readFileSync(f, 'utf8');
  const file = JSON.parse(testo);
  const letto = deserializzaPersonaggio(testo);
  let p = { creazione: normalizza(letto.creazione, dati).scelte, livelli: letto.livelli ?? [] };
  const prima = puntiDaTogliere(p, dati).reduce((s, c) => s + c.eccesso, 0);
  const righe = [];
  for (let x = scelta(p); x; x = scelta(p)) {
    if (validaRiduzione(p, x.livello, x.togli, dati).length) throw new Error(`${f}: ${x.evento}: riduzione non valida`);
    p = applicaRiduzione(p, x.livello, x.togli);
    righe.push(`${x.evento}: ${Object.entries(x.togli).map(([a, n]) => `${a} −${n}`).join(', ')}`);
  }
  console.log(`${f}: ${prima} punti in eccesso${righe.length ? `\n  ${righe.join('\n  ')}` : ''}`);
  if (scrivi && righe.length) {
    file.scelte.puntiAbilitaLiberi = p.creazione.puntiAbilitaLiberi;
    file.livelli = file.livelli.map((v, i) => ({ ...v, puntiAbilita: p.livelli[i].puntiAbilita }));
    // stesso a capo finale del file originale (i file di collaudo si confrontano byte per byte con l'export)
    writeFileSync(f, `${JSON.stringify(file, null, 2)}${testo.endsWith('\n') ? '\n' : ''}`);
  }
}
