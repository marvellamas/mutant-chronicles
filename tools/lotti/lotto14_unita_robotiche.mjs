// Lotto 14 del catalogo dell'equipaggiamento: unità robotiche (Manuale degli Armamenti v0.50,
// §7.18–7.18.2, pp. 107–108).
//   node tools/lotti/lotto14_unita_robotiche.mjs            prova a vuoto
//   node tools/lotti/lotto14_unita_robotiche.mjs --scrivi   scrive il JSON
//
// Fonti (docs/lotti/lotto14-unita-robotiche/): grezzo/ (tools/estrai_manuali.py --tabelle,
// pp. 107–108) e prosa/ (il §7.18 da --prosa).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. Come l'Iron Mastiff (§7.14.5, lotto 7): il robot è un oggetto «altro» della famiglia «Unità
//    robotiche», con il profilo e i VA propri in `tabelle` (non sono valori del personaggio).
// 2. La tabella del robot contiene due tabelle impilate (profilo, Abilità | VA): si separano
//    all'intestazione ripetuta, come nei lotti precedenti.
// 3. Il Generatore RF366 è un modulo del robot: oggetto «altro» con la compatibilità in testo
//    (si monta sull'Attila, non su armi o armature del personaggio).
// 4. Controlli incrociati: costo di ogni configurazione = telaio + prezzo dell'arma già nel
//    catalogo (lotto 5); ogni riga ritrovata nel testo in prosa.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto14-unita-robotiche/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const FILE_ID = 'unita_robotiche';
const VERSIONE = 'Armamenti 0.50';
const scrivi = process.argv.includes('--scrivi');

const leggiCsv = (testo) => testo.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => {
  const celle = [];
  let c = '';
  let q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === ',') { celle.push(c); c = ''; } else c += ch;
  }
  celle.push(c);
  return celle.map((x) => x.trim()).filter(Boolean);
}).filter((r) => r.length);
const T = {};
for (const f of readdirSync(new URL('grezzo/', LOTTO)).filter((x) => x.endsWith('.csv'))) T[f.slice(0, -4)] = leggiCsv(readFileSync(new URL(`grezzo/${f}`, LOTTO), 'utf8'));
const righeProsa = readFileSync(new URL('prosa/7.18 Unità robotiche e accessori.txt', LOTTO), 'utf8').split('\n');
const testo = righeProsa.join(' ').replace(/\s+/g, ' ');
const tra = (a, b) => {
  const i = testo.indexOf(a);
  const j = b ? testo.indexOf(b, i + a.length) : testo.length;
  if (i < 0 || j < 0) throw new Error(`paragrafo «${a}» … «${b}» non trovato`);
  return testo.slice(i, j).trim();
};
const num = (s) => Number(String(s).replace(/\./g, ''));
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo incrociato: ${msg}`); controlli++; };
for (const [id, righe] of Object.entries(T)) for (const r of righe) verifica(righeProsa.includes(r.join(' ')), `${id}: riga «${r.join(' | ')}» ritrovata nel testo`);

// regola 2: profilo e Abilità impilati
const t = T['107_1'];
const iAbilita = t.findIndex((r) => r[0] === 'Abilità');
const profilo = Object.fromEntries(t[0].map((k, i) => [k, t[1][i]]));
const abilita = t.slice(iAbilita + 1);

const catalogo = JSON.parse(readFileSync(new URL('armi_distanza_corporative.json', DEST), 'utf8')).oggetti;
const configurazioni = T['107_2'].slice(1).map(([conf, comp, costo]) => {
  const m = /^Attila \+ (\S+)( con lanciagranate)?$/.exec(comp);
  if (!m) throw new Error(`configurazione non riconosciuta: ${comp}`);
  const arma = catalogo.find((o) => o.nome === m[1]);
  if (!arma) throw new Error(`arma ${m[1]} non trovata nel lotto 5`);
  verifica(num(profilo.Costo) + arma.costo === num(costo), `${conf}: ${profilo.Costo} + ${arma.nome} ${arma.costo} = ${costo}`);
  return [conf, comp, costo];
});

const oggetti = [
  {
    id: 'cuirassier-attila', nome: 'Cuirassier Attila', tipo: 'altro', catalogo: 'Cybertronic', famiglia: 'Unità robotiche', nomi_alternativi: ['Attila'],
    note_manuale: `${tra('Le unità robotiche sono equipaggiamenti speciali', '7.18.1 Cuirassier')} ${tra('Iniziativa 1d10; dispone', 'Configurazione Componenti compresi')} ${tra('I totali utilizzano i prezzi', '7.18.2 Generatore')}`,
    paragrafo: '§7.18.1', versione_manuale: VERSIONE,
    pi: num(profilo.PI), qualita: profilo['Qualità'], ps_int: num(profilo['PS INT']), reperibilita: profilo.REP, costo: num(profilo.Costo),
    tabelle: [
      { titolo: 'Profilo', colonne: ['AR', 'AR magica', 'FOR', 'PV meccanici'], righe: [[profilo.AR, profilo.Magica, profilo.FOR, profilo['PV mecc.']]] },
      { titolo: 'VA del robot', colonne: ['Abilità', 'VA'], righe: abilita },
      { titolo: 'Configurazioni', colonne: T['107_2'][0], righe: configurazioni },
    ],
    proprieta: [],
  },
  (() => {
    const [int, riga] = T['108_1'];
    const r = Object.fromEntries(int.map((k, i) => [k, riga[i]]));
    return {
      id: 'generatore-di-risonanza-rf366', nome: 'Generatore di risonanza RF366', tipo: 'altro', catalogo: 'Cybertronic', famiglia: 'Unità robotiche', nomi_alternativi: ['RF366'],
      note_manuale: tra('Modulo robotico con una cella IAS', null), paragrafo: '§7.18.2', versione_manuale: VERSIONE,
      pi: num(r.PI), qualita: r['Qualità'], ps_int: num(r['PS INT']), reperibilita: r.REP, costo: num(r.Costo),
      compatibilita: `${r['Compatibilità']} (modulo robotico).`,
      proprieta: [],
    };
  })(),
];

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.18 Unità robotiche e accessori (pp. 107–108); lotto 14',
  _nota: 'Generato da tools/lotti/lotto14_unita_robotiche.mjs; da qui in poi si modifica questo file. I VA delle tabelle sono del robot, non del personaggio. Il manuale rimanda a un’integrazione successiva le Prove Salvezza del robot, i tempi di ricarica e il costo dei ricambi energetici.',
  oggetti,
};
if (scrivi) {
  writeFileSync(new URL(`${FILE_ID}.json`, DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritto data/equipaggiamento/${FILE_ID}.json (${oggetti.length} oggetti)`);
} else {
  for (const o of oggetti) console.log(`${o.nome} · PI ${o.pi} ${o.qualita} ${o.ps_int} ${o.reperibilita} ${o.costo}`);
  console.log(`controlli incrociati ${controlli}`);
}
