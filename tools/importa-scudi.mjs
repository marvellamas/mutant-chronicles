// Lotto 255 — **il lettore degli scudi del §7.4 degli Armamenti**, e il confronto con `data/equipaggiamento/scudi.json`.
//
// Perché un lettore e non una patch a mano: la revisione approvata il 24/11 cambia il MOV di 25 scudi su 37 e
// aggiunge al solo Enorme un −1 VA, e quei numeri li dà il manuale modello per modello (tabella del §7.4.2, colonna
// MOV) oltre che per categoria (il quadro in testa al §7.4). Scriverli dalla taglia sarebbe dedurli; leggerli dalla
// tabella è il mestiere dei lotti 206, 213 e 236 — **etichette censite** (`INTESTAZIONI_ARMAMENTI` in
// tools/tabelle-testo.mjs: un'intestazione nuova compare nel referto invece di far cadere delle voci), **una lettura
// parziale non sovrascrive un valore buono**, **provenienza per campo**.
//
// Uso:
//   node tools/importa-scudi.mjs                 (confronto col manuale corrente: dice cosa cambierebbe)
//   node tools/importa-scudi.mjs --scrivi        (scrive mov, le penalità di categoria e la provenienza)
//   node tools/importa-scudi.mjs --edizione=0.90 (il confronto contro un'altra edizione salvata: la rete)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti } from './argomenti.mjs';
import { tabelleTesto, righeTesto, comeTestoSemplice } from './tabelle-testo.mjs';
import { testoManuale, versioneManuale } from './manuali.mjs';

fermaSeSconosciuti('importa-scudi.mjs', process.argv.slice(2));
const arg = (n) => process.argv.slice(2).find((x) => x.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? null;
const SCRIVI = process.argv.includes('--scrivi');
const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
const FILE = join(RADICE, 'data', 'equipaggiamento', 'scudi.json');

/** Il §7.4 del testo salvato: dal titolo «7.4 Scudi e protezioni» al «7.5». */
export function sezione74(testo) {
  const r = righeTesto(testo);
  // il titolo nelle due forme: testo semplice («7.4 Scudi e protezioni») e Markdown («## **7.4 Scudi e protezioni**»)
  // il titolo nelle due forme: testo semplice («7.4 Scudi e protezioni») e Markdown («## **7.4 Scudi e protezioni**»).
  // Nell'indice del documento la stessa riga finisce col numero di pagina (e il separatore è una tabulazione o due
  // spazi, secondo l'esportazione): quella non è il titolo, e prenderla ritaglierebbe una sezione di una riga.
  const titolo = (x, n) => new RegExp('^#*\\s*\\**\\s*7\\.' + n + '( |$)').test(String(x).trim())
    && !/\d\s*$/.test(x) && (n !== 4 || /Scudi e protezioni/.test(x));
  const da = r.findIndex((x) => titolo(x, 4));
  const a = r.findIndex((x, n2) => n2 > da && titolo(x, 5));
  if (da < 0) return null;
  return r.slice(da, a > da ? a : r.length).join('\n');
}

const numero = (s) => {
  const m = String(s).replace(/−/g, '-').match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : null;
};
/** «—» = nessuna penalità, «−1 Q» = −1. Un valore che non si riconosce torna undefined: non si deduce. */
const movDiCella = (s) => {
  const t = String(s).trim();
  if (/^[—–-]$/.test(t)) return 0;
  if (/^[−-]?\d+\s*Q$/.test(t.replace(/−/g, '-'))) return numero(t);
  return undefined;
};
const chiave = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Le categorie dal quadro in testa al §7.4: per ciascuna, AR, penalità al VA e al MOV. I numeri vengono da lì e non
 * da un elenco scritto qui: se Davide cambia una categoria, il referto lo dice.
 * @returns {{ nome, ar, mov, va, va_difese }[]}
 */
export function categorieDalManuale(sez) {
  // nella 0.92 la colonna si chiama «Protezione e penalità» e porta AR, VA e MOV in una frase; nella 0.90 si
  // chiamava «Armatura passiva» e portava la sola AR — le penalità stavano nella prosa. Si leggono entrambe: così la
  // rete all'indietro dice i valori di prima invece di tornare «0 categorie», che sarebbe un verde su niente.
  const t = tabelleTesto(comeTestoSemplice(sez)).tabelle.find((x) => x.colonne[0] === 'Scudo');
  if (!t) return [];
  return t.righe.map(([nome, testo]) => {
    // «+2 AR; …» nella 0.92, il solo «+2» nella 0.90: due forme della stessa colonna
    const ar = numero((testo.match(/([+−-]?\d+)\s*AR/) ?? [])[1])
      ?? (/^[+−-]?\d+$/.test(testo.trim()) ? numero(testo) : null);
    const mov = /nessuna penalità al VA o al MOV|nessuna penalità.*MOV\b(?!.*\d)/.test(testo) && !/\d+\s*Q al MOV/.test(testo)
      ? 0 : numero((testo.match(/([+−-]?\d+)\s*Q al MOV/) ?? [])[1]);
    const va = /nessuna penalità al VA/.test(testo) ? 0 : numero((testo.match(/([+−-]?\d+)\s*VA/) ?? [])[1]);
    return { nome, ar, mov: mov ?? null, va: va ?? null, testo };
  });
}

/** I modelli del catalogo generale (§7.4.2): Taglia, AR, FOR, PI, MOV, e dall'altra tabella Qualità, PS, REP, costo. */
export function modelliDalManuale(sez) {
  const r = tabelleTesto(comeTestoSemplice(sez));
  const prof = r.tabelle.find((x) => x.colonne.join('|') === 'Catalogo e modello|Taglia|AR|FOR|PI|MOV');
  const costi = r.tabelle.find((x) => x.colonne.join('|') === 'Catalogo e modello|Qualità|PS INT|REP|Costo');
  const out = new Map();
  for (const [nome, taglia, ar, forR, pi, mov] of prof?.righe ?? []) {
    const m = movDiCella(mov);
    out.set(chiave(nome), {
      nome, taglia, ar: numero(ar), for_richiesta: numero(forR), pi: numero(pi),
      ...(m === undefined ? { mov_non_letto: String(mov) } : { mov: m }),
    });
  }
  for (const [nome, qualita, ps, rep, costo] of costi?.righe ?? []) {
    const v = out.get(chiave(nome)) ?? {};
    out.set(chiave(nome), { ...v, nome: v.nome ?? nome, qualita, ps_int: numero(ps), reperibilita: rep, costo: numero(String(costo).replace(/\./g, '')) });
  }
  return out;
}

/**
 * I testi delle proprietà comuni (§7.4.3): nel testo semplice sono coppie di righe — il nome da solo, poi il testo.
 * Si leggono **solo** le proprietà che il catalogo già nomina: un nome nuovo nel manuale si dichiara nel referto e
 * non entra da sé, come un'intestazione non censita.
 * @returns Map nome → testo
 */
export function proprietaDalManuale(sez, nomiNoti) {
  const r = righeTesto(sez);
  const out = new Map();
  const pulito = (x) => String(x).replace(/\\([^A-Za-z0-9\s])/g, '$1').replace(/\*/g, '').replace(/^#+\s*/, '').trim();
  for (let i = 0; i < r.length - 1; i += 1) {
    const nome = pulito(r[i]);
    if (!nomiNoti.has(nome)) continue;
    // nel testo semplice il testo è la riga dopo; in Markdown fra i due c'è una riga vuota
    let j = i + 1;
    while (j < r.length && !pulito(r[j])) j += 1;
    const testo = pulito(r[j] ?? '');
    // il testo di una proprietà è prosa: una riga che è un altro nome, una cella o un titolo non lo è
    if (!testo || testo.length < 40 || /^\t/.test(r[j] ?? '') || nomiNoti.has(testo)) continue;
    out.set(nome, testo);
  }
  return out;
}

/** Il nome del modello nel manuale è «Catalogo — Modello»: la parte dopo il trattino lungo. */
const soloModello = (nome) => String(nome).split(/\s[—–]\s/).pop().trim();

/** La categoria di una taglia: «Medio, detto anche Grande» → «Medio o grande». */
export function categoriaDiTaglia(taglia, categorie) {
  const k = chiave(taglia).split(' ')[0];
  return categorie.find((c) => chiave(c.nome).split(/\s+o\s+|\s/)[0] === k)
    ?? categorie.find((c) => chiave(c.nome).split(/\s+/).includes(k))
    ?? null;
}

// La parte che segue è il programma: gira solo quando questo file è lanciato, non quando un test importa le
// funzioni pure qui sopra (la stessa guardia di tools/importa-armi.mjs).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  // ---------------------------------------------------------------- il confronto
  const edizione = arg('edizione');
  const testo = edizione
    ? readFileSync(join(RADICE, 'docs', 'manuali-txt', `armamenti-${edizione}.md`), 'utf8')
    : testoManuale('armamenti');
  const etichetta = `Armamenti ${edizione ?? versioneManuale('armamenti')}`;
  const sez = sezione74(testo);
  if (!sez) { console.error(`Nel testo di ${etichetta} non trovo il §7.4.`); process.exit(2); }
  const referto = tabelleTesto(comeTestoSemplice(sez));
  const categorie = categorieDalManuale(sez);
  const modelli = modelliDalManuale(sez);
  const file = JSON.parse(readFileSync(FILE, 'utf8'));

  console.log(`${etichetta} · §7.4: ${referto.tabelle.length} tabelle lette, ${referto.spaiate.length} coppie spaiate (dichiarate), ${referto.nonRiconosciute.length} intestazioni non censite`);
  for (const n of referto.nonRiconosciute) console.log('  NON CENSITA:', JSON.stringify(n.prime));
  console.log(`categorie lette: ${categorie.length} — ${categorie.map((c) => `${c.nome}: AR ${c.ar}, VA ${c.va}, MOV ${c.mov}`).join(' · ')}`);
  console.log(`modelli letti dal catalogo generale: ${modelli.size}`);


  const nomiProprieta = new Set(file.oggetti.flatMap((o) => (o.proprieta ?? []).map((p) => p.nome)));
  const proprieta = proprietaDalManuale(sez, nomiProprieta);
  console.log(`testi di proprietà letti dal §7.4.3: ${proprieta.size} su ${nomiProprieta.size} nomi del catalogo`);
  for (const n of [...nomiProprieta].filter((x) => !proprieta.has(x))) console.log(`  senza testo nel manuale: «${n}» (resta quello del catalogo)`);

  const differenze = [];
  const senzaScheda = [];
  for (const o of file.oggetti) {
    const m = modelli.get(chiave(`${o.catalogo} — ${o.nome}`)) ?? modelli.get(chiave(o.nome))
      ?? [...modelli.values()].find((x) => chiave(soloModello(x.nome)) === chiave(o.nome));
    const cat = categoriaDiTaglia(o.taglia, categorie);
    if (!cat) { senzaScheda.push(`${o.id}: taglia «${o.taglia}» non corrisponde a nessuna categoria del manuale`); continue; }
    const movAtteso = m && Number.isInteger(m.mov) ? m.mov : cat.mov;
    const daModello = !!(m && Number.isInteger(m.mov));
    if ((o.mov ?? 0) !== movAtteso) differenze.push({ id: o.id, campo: 'mov', prima: o.mov ?? 0, dopo: movAtteso, da: daModello ? 'tabella del modello' : `categoria «${cat.nome}»` });
    const vaAtteso = cat.va ?? 0;
    const vaOra = o.penalita?.agilita ?? 0;
    if (vaOra !== vaAtteso) differenze.push({ id: o.id, campo: 'penalita VA', prima: vaOra, dopo: vaAtteso, da: `categoria «${cat.nome}»` });
    if (m && Number.isInteger(m.ar) && (o.ar?.totale ?? null) !== m.ar) differenze.push({ id: o.id, campo: 'ar.totale', prima: o.ar?.totale, dopo: m.ar, da: 'tabella del modello' });
    if (m && Number.isInteger(m.for_richiesta) && o.for_richiesta !== m.for_richiesta) differenze.push({ id: o.id, campo: 'for_richiesta', prima: o.for_richiesta, dopo: m.for_richiesta, da: 'tabella del modello' });
    if (m && Number.isInteger(m.pi) && o.pi !== m.pi) differenze.push({ id: o.id, campo: 'pi', prima: o.pi, dopo: m.pi, da: 'tabella del modello' });
    if (m && Number.isInteger(m.costo) && o.costo !== m.costo) differenze.push({ id: o.id, campo: 'costo', prima: o.costo, dopo: m.costo, da: 'tabella del modello' });
    if (m?.mov_non_letto) senzaScheda.push(`${o.id}: la cella MOV del manuale dice «${m.mov_non_letto}» e non la leggo: non la deduco dalla taglia`);
    for (const p of o.proprieta ?? []) {
      const testo = proprieta.get(p.nome);
      if (testo && p.testo !== testo) differenze.push({ id: o.id, campo: `proprietà «${p.nome}»`, prima: (p.testo ?? '').slice(0, 60) + '…', dopo: testo.slice(0, 60) + '…', da: '§7.4.3' });
    }
  }

  console.log(`\ndifferenze: ${differenze.length}`);
  const perCampo = {};
  for (const d of differenze) (perCampo[d.campo] ??= []).push(d);
  for (const [campo, l] of Object.entries(perCampo)) {
    console.log(`  ${campo}: ${l.length}`);
    for (const d of l.slice(0, 40)) console.log(`    ${d.id}: ${d.prima} → ${d.dopo}  (${d.da})`);
    if (l.length > 40) console.log(`    …e altre ${l.length - 40}`);
  }
  if (senzaScheda.length) { console.log('\nda guardare a mano:'); for (const s of senzaScheda) console.log('  ' + s); }

  if (!SCRIVI) { console.log('\n(sola lettura: con --scrivi applico mov, le penalità di categoria e la provenienza per campo)'); process.exit(differenze.length ? 0 : 0); }

  // ---------------------------------------------------------------- la scrittura
  const indentazione = (grezzo) => (/^\s+/.exec(grezzo.split('\n')[2] ?? '') ?? [''])[0].length || 1;
  const grezzo = readFileSync(FILE, 'utf8');
  const ind = indentazione(grezzo);
  for (const o of file.oggetti) {
    const cat = categoriaDiTaglia(o.taglia, categorie);
    if (!cat) continue;
    const m = modelli.get(chiave(`${o.catalogo} — ${o.nome}`)) ?? [...modelli.values()].find((x) => chiave(soloModello(x.nome)) === chiave(o.nome));
    const mov = m && Number.isInteger(m.mov) ? m.mov : cat.mov;
    const campi = {};
    if (Number.isInteger(mov)) { o.mov = mov; campi.mov = etichetta; }
    // il −1 VA della categoria Enorme: attacchi e Prove di Agilità, **non** le Prove di Difese
    if (cat.va) {
      // **non** si scrive una penalità alle Difese: il validatore non ammette la chiave, ed è giusto — il −1 VA
      // della categoria Enorme non si applica alle Prove di Difese, Schivate e Parate comprese (§7.4, §5.9).
      o.penalita = { ...(o.penalita ?? {}), agilita: cat.va, attacchi_ravvicinati: cat.va, attacchi_distanza: cat.va };
      o._nota_penalita = 'Armamenti 0.92 §7.4 e Giocatore 0.69 §5.9 (revisione approvata il 24/11/2026): la categoria Enorme dà −1 VA agli attacchi e alle Prove di Agilità. Il −1 NON si applica alle Prove di Difese, comprese Schivate e Parate: per questo qui non c’è una chiave «difese», e il validatore non la ammette. Lo esclude src/equipaggiamento.js → penalitaScudo.';
      campi.penalita = etichetta;
    } else if (o.penalita?.agilita || o.penalita?.attacchi_ravvicinati || o.penalita?.attacchi_distanza) {
      o.penalita = { ...(o.penalita ?? {}), agilita: 0, attacchi_ravvicinati: 0, attacchi_distanza: 0 };
      campi.penalita = etichetta;
    }
    for (const p of o.proprieta ?? []) {
      const testo = proprieta.get(p.nome);
      if (testo && p.testo !== testo) { p.testo = testo; campi[`proprieta.${p.nome}`] = etichetta; }
    }
    if (Object.keys(campi).length) {
      o._edizione = { ...(o._edizione ?? {}), campi: { ...(o._edizione?.campi ?? {}), ...campi } };
    }
  }
  file.versione_manuale = etichetta;
  writeFileSync(FILE, JSON.stringify(file, null, ind) + (grezzo.endsWith('\n') ? '\n' : ''));
  console.log(`\nscritto ${FILE} (indentazione ${ind})`);

}
