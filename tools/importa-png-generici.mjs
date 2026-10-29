// Lotto 143 (C): i dieci modelli PNG generici Classe / Grado / EQ del Manuale dei Mostri 0.46 (Direttore 0.45 §9.6)
// → data/png_generici.json. Legge docs/manuali-txt/mostri-word.md e scrive solo ciò che il manuale dice: nessun valore
// calcolato o dedotto, un dato assente resta assente. Rilanciabile: senza --scrivi mostra soltanto cosa cambierebbe.
//   node tools/importa-png-generici.mjs [--scrivi] [--testo=file] [--dest=file]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const GRADI = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const CLASSI = {
  Avventurieri: ['Agente', 'Cacciatore', 'Esploratore', 'Lestofante', 'Paramedico'],
  Combattenti: ['Artigliere', 'Assaltatore', 'Incursore', 'Lottatore', 'Soldato'],
};
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function leggiRigheTesto(testo) {
  return testo.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('<!--'));
}

/** Tabella a celle: dopo l'intestazione `titolo` (riga `## …` o simile), `colonne` celle di testa e righe di `colonne` celle. */
function tabella(righe, da, colonne) {
  const testa = righe.slice(da, da + colonne);
  const out = [];
  let i = da + colonne;
  while (i + colonne <= righe.length && !/^#/.test(righe[i])) {
    const cella = righe.slice(i, i + colonne);
    if (cella.some((c) => c.length > 60 || /[.:]$/.test(c) && c.length > 30)) break;
    out.push(cella);
    i += colonne;
  }
  return { testa, righe: out, fine: i };
}

// «—» nel manuale = dato assente: resta null, non diventa 0
const nn = (v) => (v === '—' ? null : Number(v));
const num = (v) => (/^[+−-]?\d+$/.test(v) ? parseInt(v.replace('−', '-'), 10) : null);

function perGrado(righe, titolo, colonne) {
  const i = righe.findIndex((r) => r === titolo || r.startsWith(titolo));
  if (i < 0) return null;
  const t = tabella(righe, i + 1, colonne);
  return t;
}

export function leggiRegole(righe) {
  const i0 = righe.findIndex((r) => r === '# PNG generici Classe Grado ed EQ');
  if (i0 < 0) throw new Error('sezione «PNG generici Classe Grado ed EQ» non trovata');
  const blocco = righe.slice(i0);
  // PX pronti: Grado + sei colonne
  const ip = blocco.findIndex((r) => /^## PX pronti per un esemplare/.test(r));
  const tp = tabella(blocco, ip + 1, 7);
  const px = {};
  for (const r of tp.righe) { if (!GRADI.includes(r[0])) break; px[r[0]] = r.slice(1).map(Number); }
  // EQ
  const ie = blocco.findIndex((r) => r === '# PNG generici applicazione della Qualità');
  const te = tabella(blocco, ie + 1, 2);
  const eq = te.righe.filter((r) => num(r[1]) !== null && /^[A-Za-zÀ-ù ]+$/.test(r[0]) && r[0] !== 'Dotazione').map((r) => ({ eq: +r[1], nome: r[0] }));
  // applicazione di EQ
  const im = blocco.findIndex((r) => /^## Modifiche ai valori base Comune/.test(r));
  const fm = blocco.findIndex((r, k) => k > im && r.startsWith('Un solo bonus.'));
  const modifiche = [];
  for (let k = im + 3; k + 1 < fm; k += 2) modifiche.push({ valore: blocco[k], modifica: blocco[k + 1] });
  // armamenti astratti
  const ia = blocco.findIndex((r) => r === '# PNG generici armamenti astratti');
  const ta = tabella(blocco, ia + 2, 7);
  const armamenti = ta.righe.filter((r) => r[0] !== 'Tipo').map((r) => ({
    tipo: r[0], abilita: r[1], dado: r[2], mani: +r[3], q: r[4] === '—' ? null : +r[4], colpi: r[5] === '—' ? null : +r[5], modalita: r[6] === 'Ravvicinato' ? [] : r[6].split(/\s+/),
  }));
  const prima = (inizio) => { const k = blocco.findIndex((r) => r.startsWith(inizio)); return k < 0 ? null : blocco[k]; };
  const regole = {
    impiego: prima('Impiego.'), natura_spazio: prima('Natura e spazio.'), dadi_e_bonus: prima('Dadi e bonus.'), tiro_e_munizioni: prima('Tiro e munizioni.'), raffiche: prima('Raffiche.'),
    mani_e_protezioni: prima('Mani e protezioni.'), integrita: prima('Integrità operativa.'),
    base_umana: prima('Base umana.'), gradi: prima('Gradi.'), pv_pm: prima('PV e PM.'), azioni_difese: prima('Azioni e Difese.'), bonus_permanenti: prima('Bonus permanenti.'),
    un_solo_bonus: prima('Un solo bonus.'), ambiti: prima('Ambiti.'), cure: prima('Cure.'), tiri_obbligatori: prima('Tiri obbligatori.'),
    vantaggio_addestramento: prima('Vantaggio di Addestramento.'), opportunita: prima('Opportunità.'), pronto_soccorso: prima('Pronto Soccorso.'), trattamenti: prima('Trattamenti.'), ferite_e_pm: prima('Ferite e PM.'),
  };
  // Talenti Liberi condivisi
  const it = blocco.findIndex((r) => r === '## Talenti Liberi condivisi');
  const talenti = {};
  for (let k = it + 1; k < blocco.length && !/^#/.test(blocco[k]); k += 1) { const m = blocco[k].match(/^([^:]+):\s*(.+)$/); if (m) talenti[m[1].trim()] = m[2].trim(); }
  return { px, eq, modifiche, armamenti, regole, talenti_liberi_condivisi: talenti };
}

export function leggiClasse(righe, nome, categoria) {
  const i0 = righe.findIndex((r) => r === `# ${nome} PNG generico`);
  const i1 = righe.findIndex((r) => r === `# ${nome} Abilità e acquisizioni`);
  const i2 = righe.findIndex((r) => r === `# ${nome} Talenti di Classe`);
  if (i0 < 0 || i1 < 0 || i2 < 0) throw new Error(`modello ${nome} non trovato`);
  const fine = righe.findIndex((r, k) => k > i2 && /^# /.test(r));
  const A = righe.slice(i0, i1); const B = righe.slice(i1, i2); const C = righe.slice(i2, fine < 0 ? righe.length : fine);
  const c = { nome, categoria, descrizione: A[1] };
  // Caratteristiche per Grado
  let t = perGrado(A, '## Caratteristiche per Grado', 8);
  c.caratteristiche = {};
  for (const r of t.righe) { if (!GRADI.includes(r[0])) break; c.caratteristiche[r[0]] = { livello: +r[1], FOR: +r[2], DES: +r[3], COS: +r[4], INT: +r[5], SAG: +r[6], CAR: +r[7] }; }
  // Risorse e Difese base con EQ Comune
  t = perGrado(A, '## Risorse e Difese base', 8);
  c.risorse = {};
  for (const r of t.righe) { if (!GRADI.includes(r[0])) break; c.risorse[r[0]] = { pv: nn(r[1]), pm: nn(r[2]), ini: nn(r[3]), ap: nn(r[4]), ar: nn(r[5]), parata: nn(r[6]), schivata: nn(r[7]) }; }
  const dopoRisorse = A[A.indexOf(A.find((x, k) => k > A.findIndex((y) => y.startsWith('## Risorse')) && /^Aggiungere EQ/.test(x)))];
  c.nota_risorse = dopoRisorse ?? null;
  // Salvezze
  t = perGrado(A, '## Salvezze base', 5);
  c.salvezze = {};
  for (const r of t.righe) { if (!GRADI.includes(r[0])) break; c.salvezze[r[0]] = { tempra: +r[1], riflessi: +r[2], volonta: +r[3], magia: +r[4] }; }
  // Attacchi pronti: Grado + (VA, Danno) per ogni arma
  const ia = A.findIndex((r) => r.startsWith('## Attacchi pronti'));
  let k = ia + 1; const testa = [];
  while (!GRADI.includes(A[k])) { testa.push(A[k]); k += 1; }
  const armi = []; for (let x = 1; x < testa.length; x += 2) armi.push(testa[x].replace(/ VA$/, ''));
  c.attacchi = {};
  const colonne = testa.length;
  while (GRADI.includes(A[k])) {
    const cella = A.slice(k, k + colonne);
    c.attacchi[cella[0]] = armi.map((a, n) => ({ arma: a, va: +cella[1 + 2 * n], danno: cella[2 + 2 * n] }));
    k += colonne;
  }
  c.nota_attacchi = A.slice(k).find((x) => /^Aggiungere EQ/.test(x)) ?? null;
  // Abilità
  const ib = B.findIndex((r) => r === 'Abilità');
  c.abilita = {};
  let j = ib + 7;
  while (j + 7 <= B.length && !/^#/.test(B[j]) && num(B[j + 1]) !== null) { c.abilita[B[j]] = B.slice(j + 1, j + 7).map(Number); j += 7; }
  // Talenti Liberi acquisiti per livello
  const it = B.findIndex((r) => r.startsWith('## Talenti Liberi acquisiti'));
  c.talenti_liberi = [];
  for (let x = it + 3; x + 1 < B.length && num(B[x]) !== null; x += 2) c.talenti_liberi.push({ livello: +B[x], talento: B[x + 1] });
  // Talenti di Classe
  c.talenti_classe = {};
  for (const r of C) { const m = r.match(/^(I|II|III|IV|V|VI) Grado ([^.]+)\.\s*(.+)$/); if (m) c.talenti_classe[m[1]] = { nome: m[2], testo: m[3] }; }
  c.comportamento = C[C.findIndex((r) => r === '## Comportamento e gestione') + 1] ?? null;
  c.strumenti = C.find((r) => r.startsWith('Strumenti.')) ?? null;
  c.fonte_classe = C.find((r) => r.startsWith('Fonte della Classe.')) ?? null;
  c.costruzione = C.find((r) => r.startsWith('Costruzione.')) ?? null;
  return c;
}

export function importaPng(testo) {
  const righe = leggiRigheTesto(testo);
  const comuni = leggiRegole(righe);
  const classi = {};
  for (const [categoria, lista] of Object.entries(CLASSI)) for (const nome of lista) classi[slug(nome)] = leggiClasse(righe, nome, categoria);
  return {
    versione_manuale: 'Mostri 0.46 (Word del 27/10/2026); Direttore 0.45 §9.6',
    fonte: 'Manuale dei Mostri 0.46, cap. 8 «PNG generici Classe Grado ed EQ»; Manuale del Direttore 0.45 §9.6. Dieci dei venticinque modelli previsti: gli altri quindici (Lavoratori, Studiosi, Taumaturghi) non sono ancora compilati nel manuale.',
    gradi: GRADI,
    movimento: { passo: 6, corsa: 12, scatto: 18, nota: 'Movimento: 6/12/18 Q Base (Agente, tabella delle risorse); una AM per Round.' },
    ...comuni,
    classi,
  };
}

// ---------- uso da riga di comando ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = Object.fromEntries(process.argv.slice(2).map((x) => { const m = x.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [x, true]; }));
  const testo = readFileSync(a.testo ?? join(RADICE, 'docs/manuali-txt/mostri-word.md'), 'utf8');
  const dati = importaPng(testo);
  const dest = a.dest ?? join(RADICE, 'data/png_generici.json');
  const nuovo = JSON.stringify(dati, null, 2) + '\n';
  const vecchio = existsSync(dest) ? readFileSync(dest, 'utf8') : null;
  const classi = Object.values(dati.classi);
  console.log(`Modelli letti: ${classi.length} (${classi.map((c) => c.nome).join(', ')}); righe di Grado: ${classi.reduce((n, c) => n + Object.keys(c.risorse).length, 0)}.`);
  console.log(vecchio === null ? 'Il file non c’è ancora.' : vecchio === nuovo ? 'Nessuna differenza con il file attuale.' : 'Il file attuale è diverso da quello che verrebbe scritto.');
  if (a.scrivi) { writeFileSync(dest, nuovo); console.log(`Scritto ${dest}.`); } else console.log('(Nessun file scritto: usa --scrivi.)');
}
