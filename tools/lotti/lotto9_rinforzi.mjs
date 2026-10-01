// Lotto 9 del catalogo dell'equipaggiamento: kit di rinforzo delle armature (Manuale degli
// Armamenti v0.50, §7.11.2, p. 62; soprabiti corporativi dei §7.11.5 e §7.11.7).
//   node tools/lotti/lotto9_rinforzi.mjs            prova a vuoto
//   node tools/lotti/lotto9_rinforzi.mjs --scrivi   scrive pulito/ e il JSON
//
// Fonti (docs/lotti/lotto9-rinforzi/): grezzo/ (tools/estrai_manuali.py --tabelle, p. 62) e prosa/
// (il §7.11 da --prosa).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. La tabella «Rinforzo | AR | FOR richiesta | …» dà i due kit commerciali; «+1» diventa 1.
// 2. I due soprabiti (Soprabito blu di ordinanza della BLEU, Soprabito ASA) sono Rinforzi Leggeri
//    descritti in una frase: i valori si leggono dalla frase con un'espressione regolare e devono
//    coincidere con quelli del kit Leggero; la compatibilità viene dal testo (una sola armatura o
//    le due divise ASA).
// 3. Le configurazioni commerciali della tabella p. 62 («Leggera + Rinforzi Pesanti → AR 3, FOR 5,
//    Media») non diventano dati: sono il test del calcolo (tests/equipaggiamento.test.js).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { bloccaRiscrittura } from './superato.mjs';
bloccaRiscrittura('lotto9_rinforzi');

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto9-rinforzi/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const FILE_ID = 'rinforzi';
const VERSIONE = 'Armamenti 0.50';
const scrivi = process.argv.includes('--scrivi');

const leggiCsv = (testo) => testo.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(',').map((c) => c.trim()).filter(Boolean)).filter((r) => r.length);
const T = {};
for (const f of readdirSync(new URL('grezzo/', LOTTO)).filter((x) => x.endsWith('.csv'))) T[f.slice(0, -4)] = leggiCsv(readFileSync(new URL(`grezzo/${f}`, LOTTO), 'utf8'));
const testo = readFileSync(new URL('prosa/7.11 Armature e rinforzi.txt', LOTTO), 'utf8').split('\n').join(' ').replace(/\s+/g, ' ');
const tra = (a, b) => {
  const i = testo.indexOf(a);
  const j = testo.indexOf(b, i + a.length);
  if (i < 0 || j < 0) throw new Error(`paragrafo «${a}» … «${b}» non trovato`);
  return testo.slice(i, j).trim();
};
const num = (s) => Number(String(s).replace(/\./g, '').replace(/^\+/, ''));
const armature = JSON.parse(readFileSync(new URL('armature_corporative.json', DEST), 'utf8')).oggetti;
const rifArmatura = (nome) => { const a = armature.find((x) => x.nome === nome); if (!a) throw new Error(`armatura «${nome}» non trovata`); return `armature_corporative:${a.id}`; };

const regole = tra('Si può montare un solo kit di Rinforzi compatibile.', 'Configurazione commerciale AR finale');
const oggetti = [];

// 1. kit commerciali
const [int, ...righe] = T['062_2'];
if (int.join('|') !== 'Rinforzo|AR|FOR richiesta|PI|Qualità|PS INT|REP|Costo') throw new Error(`intestazione inattesa: ${int.join(' | ')}`);
for (const [kit, ar, forR, pi, qualita, ps, rep, costo] of righe) {
  if (!testo.includes([kit, ar, forR, pi, qualita, ps, rep, costo].join(' '))) throw new Error(`riga non ritrovata nel testo: ${kit}`);
  oggetti.push({
    id: `rinforzo-${kit.toLowerCase()}`, nome: `Rinforzo ${kit}`, tipo: 'accessorio', catalogo: 'Commerciale', famiglia: 'Rinforzi',
    nomi_alternativi: [`Rinforzi ${kit === 'Leggero' ? 'Leggeri' : 'Pesanti'}`, `Kit di rinforzo ${kit.toLowerCase()}`],
    note_manuale: regole, paragrafo: '§7.11.2', versione_manuale: VERSIONE,
    pi: num(pi), qualita, ps_int: num(ps), reperibilita: rep, costo: num(costo),
    si_monta_su: ['armatura'],
    // §7.11.2: il kit aumenta AR e requisito FOR; PI e PS restano del kit
    rinforzo: { kit, ar: num(ar), for: num(forR) },
    proprieta: [],
  });
}

// 2. soprabiti corporativi
const leggero = oggetti.find((o) => o.rinforzo.kit === 'Leggero');
const SOPRABITI = [
  {
    nome: 'Soprabito blu di ordinanza', catalogo: 'Bauhaus', paragrafo: '§7.11.5', armature: ['Armatura d’ordinanza BLEU'],
    re: /Il Soprabito blu di ordinanza è un Rinforzo Leggero opzionale, con AR \+(\d), FOR \+(\d), PI (\d+), Qualità (\S+), PS (\d+), REP (\S+) e costo ([\d.]+)\./,
    nota: ['Il Soprabito blu di', 'Armatura dell’Artillery Korps Per artiglieri'],
  },
  {
    nome: 'Soprabito ASA', catalogo: 'Alleanza', paragrafo: '§7.11.7', armature: ['Divisa d’ordinanza ASA', 'Divisa operativa ASA'],
    re: /Soprabito ASA Rinforzo Leggero opzionale: AR \+(\d), FOR \+(\d), PI (\d+), Qualità (\S+), PS Integrità (\d+), REP (\S+), costo ([\d.]+)\./,
    nota: ['Soprabito ASA Rinforzo Leggero opzionale', 'Armatura Marte Per gli Assaltatori'],
  },
];
for (const s of SOPRABITI) {
  const m = s.re.exec(testo);
  if (!m) throw new Error(`${s.nome}: frase dei valori non trovata`);
  const [, ar, forR, pi, qualita, ps, rep, costo] = m;
  const o = {
    id: s.nome.toLowerCase().replace(/ /g, '-'), nome: s.nome, tipo: 'accessorio', catalogo: s.catalogo, famiglia: 'Rinforzi', nomi_alternativi: [],
    note_manuale: tra(...s.nota), paragrafo: s.paragrafo, versione_manuale: VERSIONE,
    pi: num(pi), qualita, ps_int: num(ps), reperibilita: rep, costo: num(costo),
    si_monta_su: ['armatura'],
    rinforzo: { kit: 'Leggero', ar: num(ar), for: num(forR) },
    compatibile_con: s.armature.map(rifArmatura),
    proprieta: [],
  };
  for (const k of ['ar', 'for']) if (o.rinforzo[k] !== leggero.rinforzo[k]) throw new Error(`${s.nome}: ${k} diverso dal kit Leggero`);
  oggetti.push(o);
}

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.11.2 Rinforzi e sovrapponibilità (p. 62), soprabiti dei §7.11.5 e §7.11.7; lotto 9',
  _nota: 'Generato da tools/lotti/lotto9_rinforzi.mjs; da qui in poi si modifica questo file. Un kit «in uso» e montato su un’armatura indossata ne aumenta AR e FOR richiesta, se l’armatura lo ammette («rinforzi_ammessi», e «compatibile_con» del kit). Una Leggera portata fisicamente ad AR 3 o più usa le penalità della Media, con gli effetti delle proprietà native (§7.11.2).',
  oggetti,
};
if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  const COL = ['catalogo', 'nome', 'pi', 'qualita', 'ps_int', 'reperibilita', 'costo'];
  writeFileSync(new URL('pulito/rinforzi.csv', LOTTO), [COL.join(','), ...oggetti.map((o) => COL.map((c) => o[c]).join(','))].join('\n') + '\n');
  writeFileSync(new URL(`${FILE_ID}.json`, DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti pulito/rinforzi.csv e data/equipaggiamento/${FILE_ID}.json (${oggetti.length} oggetti)`);
} else {
  for (const o of oggetti) console.log(`${o.catalogo} · ${o.nome} · ${JSON.stringify(o.rinforzo)} · PI ${o.pi} ${o.qualita} ${o.ps_int} ${o.reperibilita} ${o.costo}${o.compatibile_con ? ` · ${o.compatibile_con.join(', ')}` : ''}`);
}
