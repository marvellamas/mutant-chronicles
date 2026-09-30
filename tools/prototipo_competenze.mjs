// Prototipo della regola delle categorie di competenza (Giocatore del 29/09, §§2.3, 2.13, 8.3, 8.7),
// indipendente dal motore: serve alla ricognizione (docs/ricognizione-abilita-2026-09-30.md) per
// confrontare i VA «prima → dopo» e trovare i punti liberi che la regola nuova renderebbe inattivi.
// Uso: node tools/prototipo_competenze.mjs tools/profili_competenze_29-09.json [--json]
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { datiReali } from '../tests/helpers.js';
import { MISHIMA_AGENTE } from '../tests/personaggi.js';

const profili = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { dati } = await datiReali();
const BASE = { S: 7, P: 6, G: 5, N: 3 };
const limite = (cat, G, gcat) => ({ S: 10 + G + gcat, P: 7 + G + gcat, G: 5 + 2 * G, N: 3 + 2 * G })[cat];
const trova = (l, n) => l.find((x) => x.nome === n);
const mod = (v) => v - 5;

function nuovo(p) {
  const cr = p.creazione;
  const corp = trova(dati.corporazioni.corporazioni, cr.corporazione);
  const car = { ...corp.caratteristiche };
  for (const [s, x] of Object.entries(cr.puntiCaratteristica ?? {})) car[s] += x;
  const prima = cr.classe;
  const classi = [{ nome: prima, grado: 1 }];
  const abil = Object.fromEntries(dati.abilita.abilita.map((a) => [a.nome, { classe: 0, liberi: 0 }]));
  const catDi = (cl, a) => Object.entries(profili[cl]).find(([, l]) => l.includes(a))[0];
  const bonusClasse = (cl) => { for (const a of trova(dati.classi.classi, cl).abilita) abil[a].classe += 1; };
  const lim = (a) => {
    const G = classi.reduce((s, c) => s + c.grado, 0);
    const per = {};
    for (const c of classi) { const k = catDi(c.nome, a); per[k] = (per[k] ?? 0) + c.grado; }
    return Math.max(...Object.keys(per).map((k) => limite(k, G, per[k])));
  };
  const grezzo = (a) => {
    const d = dati.abilita.abilita.find((x) => x.nome === a);
    return mod(car[d.caratteristica]) + BASE[catDi(prima, a)] + (corp.abilita_bonus.includes(a) ? 1 : 0) + abil[a].classe + abil[a].liberi;
  };
  const inattivi = [];
  const spendi = (punti, livello) => {
    for (const [a, x] of Object.entries(punti ?? {})) {
      const L = lim(a);
      const prima = grezzo(a);
      const utili = Math.max(0, Math.min(x, L - prima));
      if (utili < x) inattivi.push({ livello, abilita: a, punti: x, inattivi: x - utili, grezzoPrima: prima, limite: L });
      // i punti inattivi restano fuori dalla somma finché non si riassegnano (§8.3: non si accantonano)
      abil[a].liberi += utili;
    }
  };
  bonusClasse(prima);
  spendi(cr.puntiAbilitaLiberi, 1);
  (p.livelli ?? []).forEach((v, i) => {
    const n = i + 2;
    for (const [s, x] of Object.entries(v.caratteristiche ?? {})) car[s] += x;
    if (v.grado?.classe) {
      let c = classi.find((y) => y.nome === v.grado.classe);
      if (!c) { c = { nome: v.grado.classe, grado: 0 }; classi.push(c); }
      c.grado += 1;
      bonusClasse(c.nome);
    }
    spendi(v.puntiAbilita, n);
  });
  const va = Object.fromEntries(Object.keys(abil).map((a) => [a, { grezzo: grezzo(a), limite: lim(a), personale: Math.min(grezzo(a), lim(a)), cat: catDi(prima, a) }]));
  return { va, inattivi, classi };
}

const leggi = (f) => JSON.parse(readFileSync(new URL(`../tests/collaudo/${f}.json`, import.meta.url), 'utf8'));
const casi = [
  ['Mishima Agente (fixture dei test, §2.13 vecchio)', { creazione: MISHIMA_AGENTE, livelli: [] }],
  ['Mishima Agente (esempio del §2.13 nuovo)', { creazione: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 2, 'Tecnologia': 2, 'Cultura': 2, 'Raggirare': 4 } }, livelli: [] }],
  ...['a_imperiale_assaltatore_l8', 'b_fratellanza_arcanista_l12', 'c_freelance_tecnico_l5'].map((f) => { const j = leggi(f); return [f, { creazione: j.scelte, livelli: j.livelli }]; }),
];
const out = [];
for (const [nome, p] of casi) {
  const vecchia = calcolaScheda(p, dati);
  const n = nuovo(p);
  out.push({ nome, classi: n.classi, inattivi: n.inattivi, righe: dati.abilita.abilita.map(({ nome: a }) => ({ abilita: a, prima: vecchia.abilita.find((x) => x.nome === a).totale, ...n.va[a] })) });
}
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else for (const c of out) {
  console.log(`\n== ${c.nome} (${c.classi.map((x) => `${x.nome} ${x.grado}`).join(', ')})`);
  for (const r of c.righe) console.log(`${r.abilita.padEnd(16)} ${String(r.prima).padStart(3)} → ${String(r.personale).padStart(3)}  [${r.cat}] grezzo ${r.grezzo} limite ${r.limite}${r.grezzo > r.limite ? ' *' : ''}`);
  for (const x of c.inattivi) console.log(`  inattivi: ${x.livello}° livello ${x.abilita} ${x.inattivi}/${x.punti} (grezzo prima ${x.grezzoPrima}, limite ${x.limite})`);
}
