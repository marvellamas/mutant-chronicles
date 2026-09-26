// Lotto 10 del catalogo dell'equipaggiamento: munizioni e alimentazioni (Manuale degli Armamenti
// v0.50, §7.20–7.20.9, pp. 114–121).
//   node tools/lotti/lotto10_munizioni.mjs            prova a vuoto
//   node tools/lotti/lotto10_munizioni.mjs --scrivi   scrive pulito/ e il JSON
//
// Fonti (docs/lotti/lotto10-munizioni/): grezzo/ (tools/estrai_manuali.py --tabelle, pp. 114–121)
// e prosa/ (il §7.20 da --prosa).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. grezzo → pulito: come i lotti precedenti (continuazioni unite per indice di colonna). Le due
//    tabelle dei prezzi speciali (pp. 118–119) sono la stessa tabella spezzata fra due pagine.
// 2. Oggetti di tipo «munizioni» (si contano con la quantità della voce): famiglie ordinarie,
//    varianti speciali per famiglia, cartucce Nimrod, caricatori e contenitori, granata pesante,
//    razzi, celle, combustibile e serbatoi, dardi chimici. La granata standard, la Fumogena e
//    l'Elettroshock sono già nel catalogo (lotti 2 e 7) e non si duplicano.
// 3. Compatibilità: `compatibile_con` con i riferimenti alle armi, trovate per nome nel Catalogo
//    della riga (nomi confrontati senza spazi e trattini). `munizioni_armi` è la tabella del §7.20.9
//    (famiglia di munizioni di ogni arma balistica corporativa).
// 4. Controlli incrociati (il generatore si ferma se non tornano):
//    - prezzi speciali = prezzo ordinario × moltiplicatore (§7.20.7), anche per il Nimrod;
//    - costi per colpo nelle intestazioni del §7.20.9 = costi unitari del §7.20.1;
//    - granate e razzi = munizioni di riferimento e granate già nel catalogo (lotti 2, 5, 7);
//    - capacità di celle, serbatoi e dardi = capacità delle armi compatibili;
//    - ogni riga di tabella ritrovata nel testo in prosa.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto10-munizioni/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const FILE_ID = 'munizioni';
const VERSIONE = 'Armamenti 0.50';
const scrivi = process.argv.includes('--scrivi');

function leggiCsv(testo) {
  const righe = [];
  for (const linea of testo.split('\n')) {
    if (!linea || linea.startsWith('#')) continue;
    const celle = [];
    let c = '';
    let virgolette = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (virgolette) {
        if (ch === '"' && linea[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') virgolette = false; else c += ch;
      } else if (ch === '"') virgolette = true;
      else if (ch === ',') { celle.push(c); c = ''; } else c += ch;
    }
    celle.push(c);
    righe.push(celle);
  }
  return righe;
}
let uniteACapo = 0;
function righeDi(testo) {
  const out = [];
  for (const r of leggiCsv(testo)) {
    const celle = r.map((c, i) => [i, c.trim()]).filter(([, c]) => c);
    if (!celle.length) continue;
    const prec = out.at(-1);
    if (prec && celle.length < prec.length && celle.every(([i]) => prec.some(([j]) => j === i))) {
      for (const [i, c] of celle) { const k = prec.find(([j]) => j === i); k[1] = `${k[1]} ${c}`; }
      uniteACapo++;
      continue;
    }
    out.push(celle);
  }
  return out.map((r) => r.map(([, c]) => c));
}
const T = {};
for (const f of readdirSync(new URL('grezzo/', LOTTO)).filter((x) => x.endsWith('.csv'))) T[f.slice(0, -4)] = righeDi(readFileSync(new URL(`grezzo/${f}`, LOTTO), 'utf8'));
const perNome = (id) => { const [int, ...righe] = T[id]; return righe.map((r) => Object.fromEntries(int.map((k, i) => [k, r[i]]))); };

const testo = readFileSync(new URL('prosa/7.20 Munizioni e alimentazioni.txt', LOTTO), 'utf8').split('\n').join(' ').replace(/\s+/g, ' ');
const tra = (a, b) => {
  const i = testo.indexOf(a);
  const j = b ? testo.indexOf(b, i + a.length) : testo.length;
  if (i < 0 || j < 0) throw new Error(`paragrafo «${a}» … «${b}» non trovato`);
  return testo.slice(i, j).trim();
};
const frase = (f) => { if (!testo.includes(f)) throw new Error(`frase non trovata: «${f}»`); return f; };
const num = (s) => Number(String(s).replace(/\./g, '').replace('−', '-'));
const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const controlla = (cond, msg) => { if (!cond) throw new Error(`controllo incrociato: ${msg}`); };
let controlli = 0;
const verifica = (cond, msg) => { controlla(cond, msg); controlli++; };

// armi già nel catalogo, per nome
const FILE_ARMI = ['armi', 'armi_corporative', 'armi_distanza', 'armi_distanza_corporative', 'corredi_dispositivi'];
const catalogoEsistente = Object.fromEntries(FILE_ARMI.map((f) => [f, JSON.parse(readFileSync(new URL(`${f}.json`, DEST), 'utf8'))]));
const armi = FILE_ARMI.flatMap((f) => catalogoEsistente[f].oggetti.filter((o) => /^arma_/.test(o.tipo)).map((o) => ({ ...o, rif: `${f}:${o.id}` })));
const norm = (s) => s.toLowerCase().replace(/[\s-]/g, '');
const ALIAS = { 'Pistola Punisher': 'Punisher' }; // §7.20.9: la pistola dell'Alleanza nel §7.8 si chiama «Punisher»
function arma(nome, catalogo = null) {
  const n = norm(ALIAS[nome] ?? nome);
  const trovate = armi.filter((o) => norm(o.nome) === n && (!catalogo || o.catalogo === catalogo));
  if (trovate.length !== 1) throw new Error(`arma «${nome}»${catalogo ? ` (${catalogo})` : ''}: ${trovate.length} corrispondenze`);
  return trovate[0];
}
const riferimentoLotto5 = (nome) => catalogoEsistente.armi_distanza_corporative.munizioni_riferimento.find((m) => m.nome === nome);

const oggetti = [];
const base = (nome, famiglia, paragrafo, note, extra, catalogo = 'Commerciale') => {
  oggetti.push({ id: idDa(nome), nome, tipo: 'munizioni', catalogo, famiglia, nomi_alternativi: [], note_manuale: note, paragrafo, versione_manuale: VERSIONE, ...extra });
};

// --- §7.20.1 famiglie ordinarie ------------------------------------------------------------------
const FAMIGLIE = {
  'Proiettili da pistola': 'pistola', 'Proiettili da fucile': 'fucile', 'Proiettili pesanti': 'pesanti', 'Cartucce a pallini': 'pallini',
  Frecce: 'frecce', 'Dardi da balestra piccola': 'dardi_balestra_piccola', 'Dardi da balestra grande': 'dardi_balestra_grande',
};
const ordinarie = perNome('114_1');
const unitario = {};
{
  const note = `${tra('Le munizioni ordinarie della stessa famiglia', 'Famiglia Confezione')} ${tra('La famiglia da fucile comprende', '7.20.2 Caricatori')}`;
  for (const r of ordinarie) {
    const fam = FAMIGLIE[r.Famiglia];
    if (!fam) throw new Error(`famiglia sconosciuta: ${r.Famiglia}`);
    unitario[fam] = num(r['Costo unitario']);
    verifica(num(r.Confezione) * num(r['Costo unitario']) === num(r['Costo confezione']), `${r.Famiglia}: confezione × unitario`);
    base(r.Famiglia, 'Munizioni ordinarie', '§7.20.1', note, {
      reperibilita: r.REP, costo: num(r['Costo unitario']),
      munizione: { famiglia: fam, confezione: { quantita: num(r.Confezione), costo: num(r['Costo confezione']) } },
      proprieta: [],
    });
  }
}

// --- §7.20.2 caricatori e contenitori ----------------------------------------------------------------
{
  const note = tra('Il prezzo del caricatore ordinario amovibile', 'Caricatore vuoto Costo');
  for (const r of perNome('114_2')) base(`Caricatore vuoto ${r['Caricatore vuoto'].replace(/^Per /, 'per ')}`, 'Caricatori e contenitori', '§7.20.2', note, { costo: num(r.Costo), proprieta: [] });
  const cont = tra('Le maglie dei nastri sono comprese', '7.20.3 Granate');
  frase('Un contenitore di alimentazione vuoto compatibile costa 200; quello del Nimrod costa 500.');
  base('Contenitore di alimentazione vuoto', 'Caricatori e contenitori', '§7.20.2', cont, { costo: 200, proprieta: [] });
  base('Contenitore di alimentazione Nimrod', 'Caricatori e contenitori', '§7.20.9', cont, { costo: 500, compatibile_con: [arma('Nimrod Autocannon').rif], proprieta: [] }, 'Alleanza');
}

// --- §7.20.3 granate ---------------------------------------------------------------------------------
const proprietaDa = (file, nome) => { for (const o of catalogoEsistente[file].oggetti) for (const p of o.proprieta ?? []) if (p.nome === nome) return p; throw new Error(`${file}: proprietà ${nome}`); };
{
  const GIA = { 'Frammentazione standard': 'armi_distanza:granata-a-frammentazione', Fumogena: 'corredi_dispositivi:granata-fumogena', Elettroshock: 'corredi_dispositivi:granata-elettroshock' };
  for (const g of perNome('115_1')) {
    const rs = num(g.RS.replace(/\s*Q$/, ''));
    if (GIA[g.Granata]) {
      // regola 2: già nel catalogo; i valori devono coincidere
      const [f, id] = GIA[g.Granata].split(':');
      const o = catalogoEsistente[f].oggetti.find((x) => x.id === id);
      verifica(o.costo === num(g.Costo) && o.reperibilita === g.REP, `${g.Granata}: costo e REP`);
      verifica(g.Danno === '—' ? o.nessun_danno === true : o.danno.una_mano === g.Danno, `${g.Granata}: danno`);
      verifica(o.proprieta.some((p) => p.nome === `RS ${rs}`), `${g.Granata}: RS`);
      continue;
    }
    const rif = riferimentoLotto5('Granata pesante a frammentazione');
    verifica(rif.danno === g.Danno && rif.ac === g.AC && rif.rs_q === rs, 'granata pesante = munizione di riferimento del Deathlock Drum (lotto 5)');
    base('Granata a frammentazione pesante', 'Granate', '§7.20.3', `${tra('La granata standard si usa sia', 'Granata Danno AC RS')} ${tra('Le granate a frammentazione hanno Sbilanciante', 'La granata a frammentazione standard e la Fumogena')} ${tra('Il modulo del Deathlock Drum usa esclusivamente', 'Fumogena La nube')}`, {
      reperibilita: g.REP, costo: num(g.Costo),
      esplosivo: { danno: g.Danno, ac: g.AC, rs_q: rs, proprieta: ['Sbilanciante', 'Sbalzante 1'] },
      compatibile_con: [arma('Lanciagranate Deathlock Drum').rif],
      proprieta: [],
    }, 'Alleanza');
    oggetti.at(-1).nomi_alternativi.push('Granata pesante a frammentazione');
  }
}

// --- §7.20.4 razzi -------------------------------------------------------------------------------------
{
  const note = `${tra('I razzi si acquistano singolarmente', 'Razzo Danno AC RS')} ${tra('Il lanciatore stabilisce Abilità', 'Formato Lanciatori compatibili')}`;
  const NOMI = { Standard: 'Razzo standard', 'A carica maggiorata': 'Razzo a carica maggiorata', 'ARG-17': 'Razzo ARG17', SSW5500: 'Razzo SSW5500' };
  const LANCIATORI = { 'Lanciarazzi commerciale': 'Lanciarazzi', 'ARG-17': 'ARG17', SSW5500: 'Lanciarazzi SSW5500', Deuce: 'Lanciarazzi Deuce', Daimyo: 'Lanciarazzi Daimyo', Southpaw: 'Lanciarazzi Southpaw' };
  const compat = new Map(perNome('117_1').map((r) => [r.Formato, r['Lanciatori compatibili'].split(/;\s*/).map((n) => arma(LANCIATORI[n] ?? n))]));
  for (const r of perNome('116_2')) {
    const nome = NOMI[r.Razzo];
    const rs = num(r.RS.replace(/\s*Q$/, ''));
    const rif = riferimentoLotto5(nome);
    verifica(rif && rif.danno === r.Danno && rif.ac === r.AC && rif.rs_q === rs, `${nome} = munizione di riferimento del lotto 5`);
    const lanciatori = compat.get(r.Razzo);
    const cataloghi = [...new Set(lanciatori.map((l) => l.catalogo))];
    base(nome, 'Razzi', '§7.20.4', note, {
      reperibilita: r.REP, costo: num(r.Costo),
      esplosivo: { danno: r.Danno, ac: r.AC, rs_q: rs, proprieta: ['Sbilanciante', 'Sbalzante 2'] },
      compatibile_con: lanciatori.map((l) => l.rif),
      proprieta: [],
    }, cataloghi.length === 1 ? cataloghi[0] : 'Commerciale');
    if (r.Razzo !== nome) oggetti.at(-1).nomi_alternativi.push(`Razzo ${r.Razzo.toLowerCase()}`);
  }
}

// --- §7.20.5 celle ---------------------------------------------------------------------------------------
{
  const note = `${tra('Le celle tecnologiche sono riutilizzabili', 'Cella Capacità Carica')} ${tra('Carica indica il prezzo della cella piena', 'Catalogo Armi compatibili')} ${tra('Per le armi ravvicinate si dichiara', 'Caricatore da campo Costa')}`;
  // §7.20.5: il formato ravvicinato da cinque cariche è comune alle armi ravvicinate con cella; la
  // tabella ne elenca 17 (il Tirapugni concussivo commerciale e 16 corporative)
  const ravvicinate = armi.filter((o) => o.tipo === 'arma_ravvicinata' && o.munizioni?.unita === 'cariche' && o.munizioni?.capacita === 5);
  verifica(ravvicinate.length === 17, `armi con cella ravvicinata da 5: ${ravvicinate.length} invece di 17`);
  for (const [cat, elenco] of perNome('117_3').map((r) => [r.Catalogo, r['Armi compatibili con la cella ravvicinata da 5']])) {
    verifica(ravvicinate.filter((o) => o.catalogo === cat).length > 0, `nessuna arma a cella nel catalogo ${cat} (${elenco})`);
  }
  const SPECIFICHE = { 'Fucile al plasma commerciale': 'Fucile al plasma', Hellblazer: 'Hellblazer', Intruder: 'Plasma Intruder' };
  for (const r of perNome('117_2')) {
    const [cap, unita] = r['Capacità'].split(' ');
    const compat = r.Cella === 'Ravvicinata comune' ? ravvicinate : [arma(SPECIFICHE[r.Cella])];
    for (const a of compat) verifica(a.munizioni?.capacita === num(cap), `${r.Cella}: capacità di ${a.nome}`);
    base(`Cella ${r.Cella === 'Ravvicinata comune' ? 'ravvicinata comune' : r.Cella.replace('Fucile al plasma commerciale', 'del fucile al plasma commerciale')}`, 'Celle energetiche', '§7.20.5', note, {
      reperibilita: r.REP, costo: num(r.Carica),
      cella: { capacita: num(cap), unita: unita === 'attivazioni' ? 'cariche' : 'colpi', ricarica_costo: num(r['Ricarica completa']) },
      compatibile_con: compat.map((a) => a.rif),
      proprieta: [],
    }, compat.length === 1 ? compat[0].catalogo : 'Commerciale');
  }
  frase('Costa 500, Reperibilità Non comune, PI 4, Qualità Comune e PS Integrità 10.');
  oggetti.push({
    id: 'caricatore-da-campo', nome: 'Caricatore da campo', tipo: 'altro', catalogo: 'Commerciale', famiglia: 'Celle energetiche', nomi_alternativi: [],
    note_manuale: tra('Caricatore da campo Costa', '7.20.6 Combustibile'), paragrafo: '§7.20.5', versione_manuale: VERSIONE,
    pi: 4, qualita: 'Comune', ps_int: 10, reperibilita: 'NC', costo: 500, proprieta: [],
  });
}

// --- §7.20.6 combustibile --------------------------------------------------------------------------------
{
  const note = `${tra('Il combustibile standard è compatibile', 'Arma Getti Pieno')} ${tra('Ogni attacco consuma un getto', '7.20.7 Munizioni balistiche')}`;
  frase('una scorta da 10 getti costa 100, Reperibilità Non comune, pari a 10 per getto');
  const MODULI = { 'Nemesis 214': 'Lanciafiamme Nemesis 214', 'Lanciafiamme commerciale': 'Lanciafiamme', Eruptor: 'Lanciafiamme Eruptor', Purifier: 'Lanciafiamme Purifier', Gehemmapuker: 'Gehemmapuker' };
  const serbatoi = perNome('118_1');
  const tutte = serbatoi.map((r) => arma(MODULI[r.Arma]));
  base('Combustibile per lanciafiamme', 'Combustibile e serbatoi', '§7.20.6', note, {
    reperibilita: 'NC', costo: 10, munizione: { famiglia: 'combustibile', confezione: { quantita: 10, costo: 100 } }, compatibile_con: tutte.map((a) => a.rif), proprieta: [],
  });
  serbatoi.forEach((r, i) => {
    const a = tutte[i];
    verifica(a.munizioni?.capacita === num(r.Getti), `serbatoio ${r.Arma}: getti = capacità di ${a.nome}`);
    verifica(num(r.Pieno) === num(r.Getti) * 10, `serbatoio ${r.Arma}: pieno = getti × 10`);
    base(`Serbatoio vuoto ${r.Arma === 'Lanciafiamme commerciale' ? 'del lanciafiamme commerciale' : r.Arma}`, 'Combustibile e serbatoi', '§7.20.6', note, {
      costo: num(r['Serbatoio vuoto']), cella: { capacita: num(r.Getti), unita: 'getti', ricarica_costo: num(r.Pieno) }, compatibile_con: [a.rif], proprieta: [],
    }, a.catalogo);
  });
}

// --- §7.20.7 munizioni speciali e §7.20.9 cartucce Nimrod ---------------------------------------------------
{
  const varianti = perNome('118_2');
  const prezzi = [...perNome('118_3'), ...perNome('119_1')]; // regola 1: la stessa tabella su due pagine
  const PER_FAM = { Pistola: 'pistola', Fucile: 'fucile', Pesanti: 'pesanti', Pallini: 'pallini' };
  const NOMI_FAM = { pistola: 'Proiettili da pistola', fucile: 'Proiettili da fucile', pesanti: 'Proiettili pesanti', pallini: 'Cartucce a pallini' };
  const TESTI = {
    'Perforante 1': tra('Perforante X Ignora X punti', 'Incendiaria Riduce di 1'), 'Perforante 2': tra('Perforante X Ignora X punti', 'Incendiaria Riduce di 1'),
    Incendiaria: tra('Incendiaria Riduce di 1', 'Concussiva Mantiene'), Concussiva: tra('Concussiva Mantiene', 'Le Contromisure seguono'),
  };
  const comune = `${tra('Le varianti speciali mantengono capacità', 'Variante Famiglie Costo')} ${tra('Le Contromisure seguono il §5.24', '7.20.8 Dardi chimici')}`;
  for (const r of prezzi) {
    const fam = PER_FAM[r.Famiglia];
    for (const v of varianti) {
      const prezzo = r[v.Variante];
      const ammessa = v.Famiglie.toLowerCase().includes(r.Famiglia.toLowerCase());
      verifica((prezzo === '—') === !ammessa, `${r.Famiglia} ${v.Variante}: variante ammessa`);
      if (!ammessa) continue;
      verifica(num(prezzo) === unitario[fam] * num(v['Costo ordinario ×']), `${r.Famiglia} ${v.Variante}: ${prezzo} = ${unitario[fam]} × ${v['Costo ordinario ×']}`);
      base(`${NOMI_FAM[fam]}, ${v.Variante.toLowerCase()}`, 'Munizioni speciali', '§7.20.7', comune, {
        reperibilita: v.REP, costo: num(prezzo),
        munizione: { famiglia: fam, variante: v.Variante, confezione: { quantita: 10, costo: num(prezzo) * 10 } },
        proprieta: [{ nome: v.Variante, testo: TESTI[v.Variante] }],
      });
    }
  }
  // Nimrod: ordinaria e varianti (§7.20.9)
  const nimrod = arma('Nimrod Autocannon');
  const noteNimrod = tra('Nimrod Autocannon Il Nimrod impiega', 'Cartuccia Nimrod Confezione');
  const [ord, ...spec] = perNome('121_2');
  const unit = num(ord['Costo unitario']);
  for (const r of [ord, ...spec]) {
    verifica(num(r.Confezione) * num(r['Costo unitario']) === num(r['Costo confezione']), `Nimrod ${r['Cartuccia Nimrod']}: confezione`);
    const v = varianti.find((x) => x.Variante === r['Cartuccia Nimrod']);
    if (v) verifica(num(r['Costo unitario']) === unit * num(v['Costo ordinario ×']), `Nimrod ${v.Variante}: prezzo = ordinaria × ${v['Costo ordinario ×']}`);
    base(`Cartucce Nimrod${v ? `, ${v.Variante.toLowerCase()}` : ''}`, v ? 'Munizioni speciali' : 'Munizioni ordinarie', '§7.20.9', noteNimrod, {
      reperibilita: r.REP, costo: num(r['Costo unitario']),
      munizione: { famiglia: 'nimrod', ...(v ? { variante: v.Variante } : {}), confezione: { quantita: num(r.Confezione), costo: num(r['Costo confezione']) } },
      compatibile_con: [nimrod.rif],
      proprieta: v ? [{ nome: v.Variante, testo: TESTI[v.Variante] }] : [],
    }, 'Alleanza');
  }
}

// --- §7.20.8 dardi chimici ---------------------------------------------------------------------------------
{
  const lanciatori = perNome('119_2').map((r) => {
    const a = arma(`${r.Lanciatore} a dardi`);
    verifica(a.danno.una_mano === r.Danno || a.danno.due_mani === r.Danno, `${r.Lanciatore}: danno`);
    verifica(a.gittata_q === num(r['Gittata massima'].replace(/\s*Q$/, '')), `${r.Lanciatore}: gittata`);
    verifica(a.munizioni.capacita === num(r.CC), `${r.Lanciatore}: CC`);
    return a;
  });
  const comune = `${tra('SA30 e SA50F utilizzano gli stessi dardi', 'Lanciatore Danno Gittata')} ${tra('Danno calibrato. Il lanciatore', 'Dardo completo Effetto')} ${tra('Immunità e dosi ripetute', '7.20.9 Compatibilità')}`;
  const TESTI = { Stordente: tra('Stordente Dopo l’iniezione', 'Sedativo L’effetto'), Sedativo: tra('Sedativo L’effetto si risolve', 'Immunità e dosi ripetute') };
  for (const r of perNome('120_1')) {
    base(`Dardo ${r['Dardo completo'].toLowerCase()}`, 'Dardi chimici', '§7.20.8', comune, {
      reperibilita: r.REP, costo: num(r['Costo unitario']),
      compatibile_con: lanciatori.map((a) => a.rif),
      proprieta: [{ nome: r['Dardo completo'], testo: `${r.Effetto}. ${TESTI[r['Dardo completo']].replace(/^\S+ /, '')}` }],
    }, 'Bauhaus');
  }
}

// --- §7.20.9 compatibilità balistiche ----------------------------------------------------------------------
const munizioniArmi = [];
{
  const COLONNE = { 'Pistola — 2 per colpo': ['pistola', 2], 'Pallini — 4 per cartuccia': ['pallini', 4], 'Fucile — 3 per colpo': ['fucile', 3], 'Pesanti — 8 per colpo': ['pesanti', 8] };
  for (const id of ['120_2', '121_1']) {
    const [int, ...righe] = T[id];
    for (const k of int.slice(1)) verifica(unitario[COLONNE[k][0]] === COLONNE[k][1], `§7.20.9 «${k}» = costo unitario del §7.20.1`);
    for (const r of righe) {
      int.slice(1).forEach((k, i) => {
        const cella = r[i + 1];
        if (cella === '—') return;
        for (const n of cella.split(/;\s*/).filter(Boolean)) munizioniArmi.push({ rif: arma(n, r[0]).rif, famiglia: COLONNE[k][0] });
      });
    }
  }
  munizioniArmi.push({ rif: arma('Nimrod Autocannon').rif, famiglia: 'nimrod' });
}

// --- controllo delle righe contro la prosa --------------------------------------------------------------
let righeControllate = 0;
for (const [id, righe] of Object.entries(T)) for (const r of righe) {
  const parole = r.join(' ').split(' ');
  let trovata = testo.includes(r.join(' '));
  for (let i = testo.indexOf(r[0]); !trovata && i >= 0; i = testo.indexOf(r[0], i + 1)) {
    const vicino = testo.slice(Math.max(0, i - 150), i + 250);
    trovata = parole.every((w) => vicino.includes(w));
  }
  if (!trovata) throw new Error(`${id}: riga «${r.join(' | ')}» non ritrovata nel testo`);
  righeControllate++;
}
if (new Set(oggetti.map((o) => o.id)).size !== oggetti.length) throw new Error('id ripetuti');

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.20 Munizioni e alimentazioni (pp. 114–121); lotto 10',
  _nota: 'Generato da tools/lotti/lotto10_munizioni.mjs; da qui in poi si modifica questo file. Le munizioni si contano con la quantità della voce; «costo» è il prezzo unitario, «munizione.confezione» la confezione del manuale. «munizioni_armi» è la tabella del §7.20.9: famiglia di munizioni ordinarie di ogni arma balistica dei cataloghi corporativi. Granata standard, Fumogena ed Elettroshock sono già nel catalogo come armi da lancio.',
  munizioni_armi: munizioniArmi,
  oggetti,
};

if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  const COL = ['catalogo', 'famiglia', 'nome', 'reperibilita', 'costo'];
  writeFileSync(new URL('pulito/munizioni.csv', LOTTO), [COL.join(','), ...oggetti.map((o) => COL.map((c) => String(o[c] ?? '')).join(','))].join('\n') + '\n');
  writeFileSync(new URL(`${FILE_ID}.json`, DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti pulito/munizioni.csv e data/equipaggiamento/${FILE_ID}.json (${oggetti.length} oggetti)`);
} else {
  for (const o of oggetti) console.log(`${o.catalogo} · ${o.famiglia} · ${o.nome} · ${o.reperibilita ?? ''} ${o.costo}${o.compatibile_con ? ` · ${o.compatibile_con.length} armi` : ''}`);
  const perFam = munizioniArmi.reduce((m, x) => ({ ...m, [x.famiglia]: (m[x.famiglia] ?? 0) + 1 }), {});
  console.log(`oggetti ${oggetti.length}; armi del §7.20.9 ${munizioniArmi.length}`, perFam, `; controlli incrociati ${controlli}; righe ritrovate nel testo ${righeControllate}; continuazioni unite ${uniteACapo}`);
}
