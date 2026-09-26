// Lotto 11 del catalogo dell'equipaggiamento: equipaggiamento sanitario (Manuale degli Armamenti
// v0.50, §7.19–7.19.5, pp. 109–113).
//   node tools/lotti/lotto11_sanitario.mjs            prova a vuoto
//   node tools/lotti/lotto11_sanitario.mjs --scrivi   scrive pulito/ e il JSON
//
// Fonti (docs/lotti/lotto11-sanitario/): grezzo/ (tools/estrai_manuali.py --tabelle, pp. 109–113)
// e prosa/ (il §7.19 da --prosa).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. Tabella degli esiti dei kit (p. 109): pdfplumber sposta le celle di una o due colonne e ne
//    stacca due frammenti in tabelle a parte (109_2, 109_3). Ogni cella va alla colonna
//    dell'intestazione più vicina per indice; una riga che non comincia dalla prima colonna
//    continua la precedente. I frammenti devono essere già contenuti nella tabella ricostruita.
// 2. Le altre tabelle: come i lotti precedenti.
// 3. Tipi: kit, cartucce, dispositivi portatili, diagnostica e chirurgia → «sanitario»; UMC →
//    «accessorio» montato su un'armatura (§7.19.3), una sola operativa per personaggio.
// 4. `applicazioni` (con `nome_applicazioni`: dosi, set) diventa il contatore della modalità tavolo;
//    `ricarica` il suo costo.
// 5. Controlli incrociati: il Kit trauma dei cataloghi (lotto 7) usa il profilo Professionale
//    (stessi PI, Qualità, PS, REP, costo, applicazioni e ricarica); i carichi di esempio delle UMC
//    (p. 112) tornano con i prezzi delle cartucce; ogni riga ritrovata nel testo in prosa.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto11-sanitario/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const FILE_ID = 'sanitario';
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
const cartella = new URL('grezzo/', LOTTO);
const T = {};
for (const f of readdirSync(cartella).filter((x) => x.endsWith('.csv') && !['109_1', '109_2', '109_3'].includes(x.slice(0, -4)))) T[f.slice(0, -4)] = righeDi(readFileSync(new URL(f, cartella), 'utf8'));
const perNome = (id) => { const [int, ...righe] = T[id]; return righe.map((r) => Object.fromEntries(int.map((k, i) => [k, r[i]]))); };

// regola 1: tabella degli esiti dei kit, per colonna più vicina
let esitiCorretti = 0;
const esitiKit = (() => {
  const grezze = leggiCsv(readFileSync(new URL('109_1.csv', cartella), 'utf8')).map((r) => r.map((c, i) => [i, c.trim()]).filter(([, c]) => c)).filter((r) => r.length);
  const [intestazione, ...resto] = grezze;
  const colonne = intestazione.map(([i, c]) => ({ i, nome: c }));
  const vicina = (i) => colonne.reduce((m, c) => (Math.abs(c.i - i) < Math.abs(m.i - i) || (Math.abs(c.i - i) === Math.abs(m.i - i) && c.i > m.i) ? c : m));
  const righe = [];
  for (const r of resto) {
    const nuova = r[0][0] === 0 && r.length > 1;
    // la riga «strumenti» completa l'intestazione «VA»
    if (r.length === 1 && r[0][1] === 'strumenti') continue;
    const dest = nuova ? {} : righe.at(-1);
    if (nuova) righe.push(dest);
    for (const [i, c] of r) {
      const col = vicina(i).nome;
      if (!intestazione.some(([j]) => j === i)) esitiCorretti++;
      dest[col] = dest[col] ? `${dest[col]} ${c}` : c;
    }
  }
  // i frammenti staccati da pdfplumber devono essere già dentro la tabella ricostruita
  const tutto = righe.map((r) => Object.values(r).join(' ')).join(' ');
  for (const f of ['109_2', '109_3']) {
    const frammento = leggiCsv(readFileSync(new URL(`${f}.csv`, cartella), 'utf8')).flat().map((c) => c.trim()).filter(Boolean).join(' ');
    if (!tutto.includes(frammento)) throw new Error(`${f}: frammento «${frammento}» assente dalla tabella degli esiti`);
  }
  return new Map(righe.map((r) => [r.Kit, r]));
})();

const testo = readFileSync(new URL('prosa/7.19 Equipaggiamento sanitario.txt', LOTTO), 'utf8').split('\n').join(' ').replace(/\s+/g, ' ');
const tra = (a, b) => {
  const i = testo.indexOf(a);
  const j = b ? testo.indexOf(b, i + a.length) : testo.length;
  if (i < 0 || j < 0) throw new Error(`paragrafo «${a}» … «${b}» non trovato`);
  return testo.slice(i, j).trim();
};
const num = (s) => Number(String(s).replace(/\./g, '').replace('−', '-').replace(/^\+/, ''));
const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo incrociato: ${msg}`); controlli++; };

const oggetti = [];
const base = (nome, famiglia, paragrafo, note, extra, tipo = 'sanitario') => {
  oggetti.push({ id: idDa(nome), nome, tipo, catalogo: 'Commerciale', famiglia, nomi_alternativi: [], note_manuale: note, paragrafo, versione_manuale: VERSIONE, ...extra });
};
const economia = (r) => ({ pi: num(r.PI), qualita: r['Qualità'], ps_int: num(r['PS INT']), reperibilita: r.REP });

// --- §7.19.1 kit di pronto soccorso ---------------------------------------------------------------
{
  const note = `${tra('Il kit Professionale cura Punti Vita', 'Kit PI Qualità')} ${tra('Standard e Professionale comprendono cinque', 'Procedura della medicazione')} ${tra('Procedura della medicazione', 'Raccordo con Talenti')}`;
  const talenti = tra('Raccordo con Talenti e cura delle Ferite', '7.19.2 Cartucce');
  for (const r of perNome('109_4')) {
    const e = esitiKit.get(r.Kit) ?? esitiKit.get(`${r.Kit} / Kit trauma`);
    if (!e) throw new Error(`kit ${r.Kit}: esiti non trovati`);
    const improvvisato = r.Kit === 'Improvvisato';
    const ric = /^(\d+) \/ (\d+) applicazioni$/.exec(r.Ricarica);
    verifica(improvvisato ? !ric : !!ric, `kit ${r.Kit}: ricarica «${r.Ricarica}»`);
    base(`Kit di pronto soccorso ${r.Kit.toLowerCase()}`, 'Pronto soccorso', '§7.19.1', `${note} ${talenti}`, {
      ...(improvvisato ? { costo: null } : { ...economia(r), costo: num(r.Costo) }),
      applicazioni: num(e.Usi),
      ...(ric ? { ricarica: { applicazioni: num(ric[2]), costo: num(ric[1]) } } : {}),
      strumenti: { va: num(e.VA), prova: 'Medicina (pronto soccorso)' },
      esiti: { successo: e.Successo, magistrale: e.Magistrale },
      proprieta: [],
    });
    if (r.Kit === 'Professionale') oggetti.at(-1).nomi_alternativi.push('Kit trauma');
  }
  // regola 5: il Kit trauma dei cataloghi usa il profilo Professionale
  const prof = oggetti.find((o) => o.nome === 'Kit di pronto soccorso professionale');
  const corredi = JSON.parse(readFileSync(new URL('corredi_dispositivi.json', DEST), 'utf8')).oggetti.filter((o) => /^Kit trauma/.test(o.nome));
  verifica(corredi.length === 5, 'cinque Kit trauma nei cataloghi');
  for (const k of corredi) for (const c of ['pi', 'qualita', 'ps_int', 'reperibilita', 'costo', 'applicazioni']) verifica(k[c] === prof[c], `${k.nome}: ${c} = profilo Professionale`);
  for (const k of corredi) verifica(JSON.stringify(k.ricarica) === JSON.stringify(prof.ricarica), `${k.nome}: ricarica`);
}

// --- §7.19.2 cartucce ------------------------------------------------------------------------------
const prezzoCartuccia = {};
{
  const note = `${tra('Le cartucce sono compatibili con UMC', 'Un’unica somministrazione rapida per Round')} ${tra('Un’unica somministrazione rapida per Round', '7.19.3 Unità Medica')}`;
  for (const r of perNome('110_1')) {
    prezzoCartuccia[r.Cartuccia] = num(r['Costo unitario']);
    base(`Cartuccia ${r.Cartuccia.toLowerCase()}`, 'Cartucce sanitarie', '§7.19.2', note, {
      reperibilita: r.REP, costo: num(r['Costo unitario']), effetto: r.Effetto, proprieta: [],
    });
  }
}

// --- §7.19.3 UMC --------------------------------------------------------------------------------------
{
  const comune = `${tra('La UMC è un modulo sanitario', 'Modello Cartucce PI')} ${tra('Compatibilità, montaggio e ricarica', 'Carico di esempio')}`;
  const NOTE = {
    Passiva: tra('UMC Passiva Il giocatore', 'UMC Attiva Modalità'), Attiva: tra('UMC Attiva Modalità', 'UMC Automatica Dopo'),
    Automatica: tra('UMC Automatica Dopo', 'Compatibilità, montaggio'),
  };
  const esempi = new Map(perNome('112_1').map((r) => [r['Carico di esempio'], r]));
  for (const r of perNome('111_1')) {
    const es = esempi.get(r.Modello);
    const carico = num(es['Emost.']) * prezzoCartuccia.Emostatica + num(es['Coag.']) * prezzoCartuccia.Coagulante + num(es.Curative) * prezzoCartuccia.Curativa;
    verifica(carico === num(es.Cartucce), `carico di esempio ${r.Modello}: ${carico} = ${es.Cartucce}`);
    verifica(carico + num(r['Costo vuoto']) === num(es['Totale con UMC']), `carico di esempio ${r.Modello}: totale con UMC`);
    verifica(num(es['Emost.']) + num(es['Coag.']) + num(es.Curative) <= num(r.Cartucce), `carico di esempio ${r.Modello}: entro la capacità`);
    base(`UMC ${r.Modello}`, 'Unità Medica di Combattimento', '§7.19.3', `${NOTE[r.Modello]} ${comune}`, {
      ...economia(r), costo: num(r['Costo vuoto']),
      si_monta_su: ['armatura'], uno_per_personaggio: 'umc',
      capacita_cartucce: num(r.Cartucce),
      tabelle: [{ titolo: 'Carico di esempio', colonne: ['Emostatiche', 'Coagulanti', 'Curative', 'Costo delle cartucce', 'Totale con UMC'], righe: [[es['Emost.'], es['Coag.'], es.Curative, es.Cartucce, es['Totale con UMC']]] }],
      proprieta: [],
    }, 'accessorio');
    oggetti.at(-1).nomi_alternativi.push(`Unità Medica di Combattimento ${r.Modello.toLowerCase()}`);
  }
}

// --- §7.19.4 dispositivi portatili ------------------------------------------------------------------------
{
  const comune = tra('Iniettore e Pistola sono venduti vuoti', 'Iniettore sanitario manuale Somministrare');
  const NOTE = {
    'Iniettore sanitario manuale': tra('Iniettore sanitario manuale Somministrare', 'Pistola sanitaria Somministrare'),
    'Pistola sanitaria': tra('Pistola sanitaria Somministrare', 'Spray rimarginante Spendendo'),
    'Spray rimarginante': tra('Spray rimarginante Spendendo', '7.19.5 Diagnostica'),
  };
  for (const r of perNome('112_2')) {
    const [n, unita] = r['Capacità'].split(' ');
    const spray = r.Dispositivo === 'Spray rimarginante';
    if (spray) verifica(/Un contenitore di ricambio da cinque dosi costa 1\.000/.test(testo), 'ricarica dello Spray');
    base(r.Dispositivo, 'Dispositivi portatili', '§7.19.4', `${NOTE[r.Dispositivo]} ${comune}`, {
      ...economia(r), costo: num(r.Costo),
      ...(spray ? { applicazioni: num(n), nome_applicazioni: 'dosi', ricarica: { applicazioni: 5, costo: 1000 } } : { capacita_cartucce: num(n) }),
      proprieta: [],
    });
    if (!spray && unita === 'miste') oggetti.at(-1).note_manuale += ' Capacità: 5 cartucce miste.';
  }
}

// --- §7.19.5 diagnostica e chirurgia ----------------------------------------------------------------------
{
  const NOTE = {
    'Scanner diagnostico portatile': tra('Scanner diagnostico portatile Richiede', 'Scanner diagnostico Cybertronic Mantiene'),
    'Scanner diagnostico Cybertronic': tra('Scanner diagnostico Cybertronic Mantiene', 'Kit chirurgico da campo Richiede'),
    'Kit chirurgico da campo': tra('Kit chirurgico da campo Richiede', 'Postazione medica da campo Richiede'),
    'Postazione medica da campo': tra('Postazione medica da campo Richiede', null),
  };
  const STRUMENTI = {
    'Scanner diagnostico portatile': { va: 2, prova: 'Medicina (diagnosi)' },
    'Scanner diagnostico Cybertronic': { va: 2, prova: 'Medicina (diagnosi); +1 con SIN 1 e interfaccia attiva' },
    'Kit chirurgico da campo': { va: 2, prova: 'Medicina (interventi chirurgici sul campo)' },
    'Postazione medica da campo': { va: 3, prova: 'Medicina (chirurgia, Ferite e Menomazioni)' },
  };
  verifica(/Un set di ricambio costa 500; una confezione da cinque costa 2\.500/.test(testo), 'ricambi del Kit chirurgico');
  for (const r of perNome('113_1')) {
    const nota = NOTE[r.Dispositivo];
    verifica(nota.includes(`+${STRUMENTI[r.Dispositivo].va} VA`), `${r.Dispositivo}: bonus degli strumenti nel testo`);
    const set = /chirurgico|Postazione/.test(r.Dispositivo);
    base(r.Dispositivo, 'Diagnostica e chirurgia', '§7.19.5', nota, {
      ...economia(r), costo: num(r.Costo), strumenti: STRUMENTI[r.Dispositivo],
      ...(set ? { applicazioni: 5, nome_applicazioni: 'set', ricarica: { applicazioni: 5, costo: 2500 } } : {}),
      proprieta: [],
    });
  }
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
// esiti dei kit: la prosa intreccia le celle andate a capo; le parole di ogni riga stanno vicino al nome del kit
for (const [kit, r] of esitiKit) {
  const i = testo.indexOf(kit.split(' ')[0]);
  const vicino = testo.slice(Math.max(0, i - 150), i + 300);
  const manca = Object.values(r).join(' ').split(' ').find((w) => !vicino.includes(w));
  if (i < 0 || manca) throw new Error(`esiti del kit ${kit}: «${manca}» non ritrovato nel testo`);
  righeControllate++;
}

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.19 Equipaggiamento sanitario (pp. 109–113); lotto 11',
  _nota: 'Generato da tools/lotti/lotto11_sanitario.mjs; da qui in poi si modifica questo file. «applicazioni» è il contatore della modalità tavolo (con «nome_applicazioni»: dosi, set); «ricarica» il costo per ripristinarlo. «strumenti» è il modificatore degli strumenti alla Prova indicata: resta un promemoria, non entra nei VA. La UMC si monta su un’armatura; ne vale una sola per personaggio.',
  oggetti,
};

if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  const COL = ['famiglia', 'nome', 'pi', 'qualita', 'ps_int', 'reperibilita', 'costo'];
  writeFileSync(new URL('pulito/sanitario.csv', LOTTO), [COL.join(','), ...oggetti.map((o) => COL.map((c) => String(o[c] ?? '')).join(','))].join('\n') + '\n');
  writeFileSync(new URL(`${FILE_ID}.json`, DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti pulito/sanitario.csv e data/equipaggiamento/${FILE_ID}.json (${oggetti.length} oggetti)`);
} else {
  for (const o of oggetti) console.log(`${o.famiglia} · ${o.nome} [${o.tipo}] · PI ${o.pi ?? '—'} ${o.qualita ?? ''} ${o.reperibilita ?? ''} ${o.costo} · ${o.applicazioni ? `${o.applicazioni} ${o.nome_applicazioni ?? 'applicazioni'}` : ''}${o.capacita_cartucce ? `${o.capacita_cartucce} cartucce` : ''}${o.esiti ? ` · ${JSON.stringify(o.esiti)}` : ''}`);
  console.log(`oggetti ${oggetti.length}; celle degli esiti riassegnate alla colonna più vicina ${esitiCorretti}; controlli incrociati ${controlli}; righe ritrovate nel testo ${righeControllate}; continuazioni unite ${uniteACapo}`);
}
