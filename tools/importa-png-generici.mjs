// I venticinque modelli PNG generici Classe / Grado / EQ → data/png_generici.json.
//
// Lotto 143 (C, 29/10/2026): dieci modelli letti a fatica dalle tabelle del Word.
// Lotto 197 (E, 14/11/2026): **la fonte sono i dati strutturati di Davide**, non l'estrazione dal Word.
//
// Perché la fonte cambia. Davide pubblica insieme al Manuale dei Mostri un file JSON — oggi
// `SIMPLY_RPG_PNG_Abilita_v0.67.json`, in `docs/manuali-txt/png-abilita-0.67.json` — che contiene per tutti e
// venticinque i modelli le 24 Abilità ai sei Gradi (categoria, base, incrementi automatici, punti liberi, VA
// grezzo, limite, VA personale), le acquisizioni ai livelli raggiunti e le tabelle dei valori pronti. E dichiara
// lo **sha256 del Word a cui appartiene**: è la regola 4 del nostro protocollo (comanda la versione, non la data)
// applicata da chi pubblica. Leggere quei numeri da una tabella del Word è un ripiego che nel lotto 143 ci ha
// già fatto sbagliare sei schede.
//
// Che cosa resta al Word. Soltanto la prosa e i blocchi comuni, che il JSON non ha: descrizione del modello,
// Talenti di Classe, comportamento, strumenti, fonte della Classe, costruzione; e, in comune, PX pronti, scala
// EQ, applicazione di EQ, armamenti astratti, regole di lettura, acquisizioni condivise.
//
// La regola che non si tocca: **i valori pronti comprendono già i benefici fissi, una volta sola.** Un Agente di
// I Grado attacca con la Pistola a VA 12 perché la sua Specializzazione Pistole, posseduta dal livello 1, è già
// dentro quel 12 (Armi leggere personale 11, +1). Chi riapplica il bonus lo conta due volte: `tests/png-generici-197.test.js`
// fallisce se succede. Lo stesso vale al contrario per l'Artigliere, dove il +1 della Specializzazione e il −1
// della Protezione Media si annullano e la differenza col VA personale è 0: non è un bonus mancante.
//
//   node tools/importa-png-generici.mjs [--scrivi] [--testo=file] [--json=file] [--dest=file] [--verifica]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { testoManuale, fonteDati, percorsoFonteDati, voceDati } from './manuali.mjs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const GRADI = ['I', 'II', 'III', 'IV', 'V', 'VI'];
export const CATEGORIE = {
  Avventurieri: ['Agente', 'Cacciatore', 'Esploratore', 'Lestofante', 'Paramedico'],
  Combattenti: ['Artigliere', 'Assaltatore', 'Incursore', 'Lottatore', 'Soldato'],
  Lavoratori: ['Agricoltore', 'Artigiano', 'Operaio', 'Pilota', 'Tecnico'],
  Studiosi: ['Accademico', 'Amministrativo', 'Artista', 'Medico', 'Predicatore'],
  Taumaturghi: ['Arcanista', 'Custode', 'Invocatore', 'Mistico', 'Tecnomante'],
};
/** Le 3.600 voci attese: 25 modelli × 6 Gradi × 24 Abilità. Un controllo verde su zero voci è un controllo rotto. */
export const VOCI_ATTESE = 25 * 6 * 24;
export const RIGHE_DI_GRADO = 25 * 6;
/** I totali del blocco E&L del 13/11/2026: sei Specializzazioni, cinque Maestrie e nove Talenti Liberi per modello. */
export const ACQUISIZIONI_ATTESE = { specializzazioni: 150, maestrie: 125, talenti_liberi: 225 };

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function leggiRigheTesto(testo) {
  return testo.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('<!--'));
}

/** Tabella a celle: dopo l'intestazione, `colonne` celle di testa e righe di `colonne` celle. */
function tabella(righe, da, colonne) {
  const testa = righe.slice(da, da + colonne);
  const out = [];
  let i = da + colonne;
  while (i + colonne <= righe.length && !/^#/.test(righe[i])) {
    const cella = righe.slice(i, i + colonne);
    if (cella.some((c) => c.length > 60 || (/[.:]$/.test(c) && c.length > 30))) break;
    out.push(cella);
    i += colonne;
  }
  return { testa, righe: out, fine: i };
}

const num = (v) => (/^[+−-]?\d+$/.test(v) ? parseInt(v.replace('−', '-'), 10) : null);

// ---------- i blocchi comuni, dal Word ----------

export function leggiRegole(righe) {
  const i0 = righe.findIndex((r) => r === '# PNG generici Classe Grado ed EQ');
  if (i0 < 0) throw new Error('sezione «PNG generici Classe Grado ed EQ» non trovata');
  const blocco = righe.slice(i0);
  const ip = blocco.findIndex((r) => /^## PX pronti per un esemplare/.test(r));
  const tp = tabella(blocco, ip + 1, 7);
  const px = {};
  for (const r of tp.righe) { if (!GRADI.includes(r[0])) break; px[r[0]] = r.slice(1).map(Number); }
  const ie = blocco.findIndex((r) => r === '# PNG generici applicazione della Qualità');
  const te = tabella(blocco, ie + 1, 2);
  const eq = te.righe.filter((r) => num(r[1]) !== null && /^[A-Za-zÀ-ù ]+$/.test(r[0]) && r[0] !== 'Dotazione').map((r) => ({ eq: +r[1], nome: r[0] }));
  const im = blocco.findIndex((r) => /^## Modifiche ai valori base Comune/.test(r));
  const fm = blocco.findIndex((r, k) => k > im && r.startsWith('Un solo bonus.'));
  const modifiche = [];
  for (let k = im + 3; k + 1 < fm; k += 2) modifiche.push({ valore: blocco[k], modifica: blocco[k + 1] });
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
  // «## Acquisizioni regole condivise» (0.67; nella 0.47 era «## Talenti Liberi condivisi»): «Nome: testo»
  const it = blocco.findIndex((r) => r === '## Acquisizioni regole condivise' || r === '## Talenti Liberi condivisi');
  const condivise = {};
  if (it >= 0) for (let k = it + 1; k < blocco.length && !/^#/.test(blocco[k]); k += 1) { const m = blocco[k].match(/^([^:]+):\s*(.+)$/); if (m) condivise[m[1].trim()] = m[2].trim(); }
  return { px, eq, modifiche, armamenti, regole, acquisizioni_condivise: condivise };
}

/** La prosa di un modello: tutto ciò che il JSON non ha. */
export function leggiProsa(righe, nome, categoria) {
  const i0 = righe.findIndex((r) => r === `# ${nome} PNG generico`);
  const i2 = righe.findIndex((r) => r === `# ${nome} Talenti di Classe`);
  if (i0 < 0 || i2 < 0) throw new Error(`modello ${nome}: prosa non trovata nel Word (${i0}, ${i2})`);
  const fine = righe.findIndex((r, k) => k > i2 && /^# /.test(r));
  const C = righe.slice(i2, fine < 0 ? righe.length : fine);
  const talenti_classe = {};
  for (const r of C) { const m = r.match(/^(I|II|III|IV|V|VI) Grado ([^.]+)\.\s*(.+)$/); if (m) talenti_classe[m[1]] = { nome: m[2], testo: m[3] }; }
  return {
    nome, categoria,
    descrizione: righe[i0 + 1],
    talenti_classe,
    comportamento: C[C.findIndex((r) => r === '## Comportamento e gestione') + 1] ?? null,
    strumenti: C.find((r) => r.startsWith('Strumenti.')) ?? null,
    fonte_classe: C.find((r) => r.startsWith('Fonte della Classe.')) ?? null,
    costruzione: C.find((r) => r.startsWith('Costruzione.')) ?? null,
  };
}

// ---------- i numeri, dal JSON di Davide ----------

/** Riga di una tabella pronta → oggetto con le intestazioni come chiavi. */
const perColonne = (t) => Object.fromEntries(t.righe.map((r) => [r[0], Object.fromEntries(t.colonne.slice(1).map((c, i) => [c, r[i + 1]]))]));
const n0 = (v) => (v === '—' || v === undefined ? null : Number(String(v).replace('−', '-')));

/** Le armi della tabella degli attacchi pronti: colonne «<Arma> VA» seguite da «Danno». */
export function armiDellaTabella(t) {
  return t.colonne.map((c, i) => (/ VA$/.test(c) ? { arma: c.replace(/ VA$/, ''), va: i, danno: i + 1 } : null)).filter(Boolean);
}

export function dalJson(m) {
  const risorse = {}; const salvezze = {}; const attacchi = {}; const caratteristiche = {};
  const bonus_inclusi = {}; const contesto_difese = {}; const punti_liberi = {}; const acquisizioni_per_grado = {};
  const abilita = {};
  const tArmi = m.tabelle_derivate[1];
  const armi = armiDellaTabella(tArmi);
  const righeArmi = perColonne(tArmi);
  for (const [i, g] of m.progressione.entries()) {
    const R = g.risorse_e_difese_pronte; const S = g.salvezze_base;
    // «Difese» è un solo valore per i Taumaturghi; per gli altri la Difesa che si usa è la Parata. Il Lottatore
    // di I Grado ha Parata «—» (non para a mani nude prima del II Grado, Mostri 0.67 e blocco E&L del 12/11:
    // A.270, perché la A.206 aveva deciso il contrario): lì la Difesa che resta è la Schivata, e si dichiara.
    const difese = n0(R.Difese) ?? n0(R.Parata) ?? n0(R.Schivata);
    risorse[g.grado] = {
      pv: n0(R.PV), pm: n0(R.PM), ini: n0(R['INI +']), ap: n0(R.AP), ar: n0(R.AR),
      ar_magica: n0(R['AR mag.']) ?? 0,
      parata: n0(R.Parata), schivata: n0(R.Schivata),
      difese,
      difese_da: n0(R.Difese) !== null ? 'difese' : n0(R.Parata) !== null ? 'parata' : 'schivata',
    };
    salvezze[g.grado] = { tempra: n0(S.Tempra), riflessi: n0(S.Riflessi), volonta: n0(S['Volontà']), magia: n0(S.Magia) };
    caratteristiche[g.grado] = { livello: g.livello, ...g.caratteristiche };
    const riga = tArmi.righe[i];
    attacchi[g.grado] = armi.map((a) => ({ arma: a.arma, va: Number(riga[a.va]), danno: riga[a.danno] }));
    bonus_inclusi[g.grado] = g.bonus_fissi_gia_inclusi_nelle_risorse ?? [];
    contesto_difese[g.grado] = g.contesto_difese_pronte ?? null;
    punti_liberi[g.grado] = g.punti_liberi_totali;
    acquisizioni_per_grado[g.grado] = Object.fromEntries(Object.entries(g.acquisizioni_attive).map(([k, v]) => [k, v.map((x) => x.nome)]));
    for (const [nome, a] of Object.entries(g.abilita)) { abilita[nome] ??= []; abilita[nome][i] = a.va_personale; }
  }
  void righeArmi;
  return {
    sistema_salute: m.sistema_salute,
    bonus_corporazione: m.bonus_corporazione,
    competenze: m.competenze,
    abilita_automatiche: m.abilita_automatiche,
    priorita_operativa: m.priorita_operativa,
    caratteristiche, risorse, salvezze, attacchi,
    magia_pronta: m.tabelle_derivate[2] ?? null,
    contesto_difese, bonus_inclusi, punti_liberi,
    abilita,
    acquisizioni: m.acquisizioni,
    acquisizioni_per_grado,
    note_acquisizioni: m.note_acquisizioni,
    impiego_acquisizioni: m.istruzioni_di_aggiornamento,
  };
}

// ---------- le tre verifiche del lotto 190, rifatte a ogni importazione ----------

/**
 * 1. l'impronta: lo sha256 del Word dichiarato dal JSON deve essere quello registrato per l'edizione recepita;
 * 2. i numeri di controllo del Doc E&L;
 * 3. la coerenza interna di tutte e 3.600 le voci, **contate**.
 * @returns {{ impronta, numeri: [], voci, incoerenze: [], acquisizioni, profili: {} }}
 */
export function verificaFonte(j, { sha256 = null } = {}) {
  const GR = GRADI;
  const va = (classe, grado, ab, campo = 'va_personale') => j.modelli.find((x) => x.classe === classe)?.progressione[GR.indexOf(grado)]?.abilita?.[ab]?.[campo];
  const numeri = [
    ['Agente I Armi leggere', va('Agente', 'I', 'Armi leggere'), 11],
    ['Agente I Furtività', va('Agente', 'I', 'Furtività'), 10],
    ['Agente I Atletica', va('Agente', 'I', 'Atletica'), 6],
    ['Custode I Artefatti', va('Custode', 'I', 'Artefatti'), 7],
    ['Custode I Artefatti, limite', va('Custode', 'I', 'Artefatti', 'limite'), 8],
    ['Custode III Artefatti', va('Custode', 'III', 'Artefatti'), 8],
    ['Custode III Artefatti, limite', va('Custode', 'III', 'Artefatti', 'limite'), 12],
    ['Tecnomante I Occultismo', va('Tecnomante', 'I', 'Occultismo'), 12],
    ['Tecnomante I Potere', va('Tecnomante', 'I', 'Potere'), 9],
  ].map(([nome, avuto, atteso]) => ({ nome, avuto, atteso, ok: avuto === atteso }));
  const incoerenze = [];
  let voci = 0;
  const profili = {};
  const PL = [7, 14, 21, 28, 35, 42];
  const acquisizioni = { specializzazioni: 0, maestrie: 0, talenti_liberi: 0 };
  for (const m of j.modelli) {
    const cat = {};
    for (const c of ['S', 'P', 'G', 'N']) for (const nome of m.competenze[c]) cat[nome] = c;
    const forma = ['S', 'P', 'G', 'N'].map((c) => m.competenze[c].length).join('/');
    profili[forma] = (profili[forma] ?? 0) + 1;
    const puntiBase = ['S', 'P', 'G', 'N'].reduce((a, c) => a + m.competenze[c].length * j.basi[c], 0);
    if (puntiBase !== 127) incoerenze.push(`${m.classe}: punti base ${puntiBase}, attesi 127 (Giocatore §2.3)`);
    if (new Set(Object.values(m.competenze).flat()).size !== 24) incoerenze.push(`${m.classe}: le 24 Abilità non sono distinte`);
    if (m.abilita_automatiche.length !== 5) incoerenze.push(`${m.classe}: ${m.abilita_automatiche.length} Abilità automatiche, attese 5`);
    for (const [k, liv] of Object.entries(j.livelli_acquisizioni)) {
      acquisizioni[k] += m.acquisizioni[k].length;
      const avuti = m.acquisizioni[k].map((x) => x.livello);
      if (JSON.stringify(avuti) !== JSON.stringify(liv)) incoerenze.push(`${m.classe}: i livelli di ${k} sono ${avuti.join(', ')}, attesi ${liv.join(', ')}`);
    }
    for (const [i, g] of m.progressione.entries()) {
      if (g.punti_liberi_totali !== PL[i]) incoerenze.push(`${m.classe} ${g.grado}: ${g.punti_liberi_totali} punti liberi, attesi ${PL[i]}`);
      const somma = Object.values(g.punti_liberi_cumulativi).reduce((a, b) => a + b, 0);
      if (somma !== PL[i]) incoerenze.push(`${m.classe} ${g.grado}: i punti liberi cumulativi sommano ${somma}, attesi ${PL[i]}`);
      for (const [nome, a] of Object.entries(g.abilita)) {
        voci += 1;
        const grezzo = a.modificatore + a.base + a.corporazione + a.automatici + a.punti_liberi;
        if (grezzo !== a.va_grezzo) incoerenze.push(`${m.classe} ${g.grado} ${nome}: VA grezzo ${a.va_grezzo}, la somma dà ${grezzo}`);
        if (a.va_personale !== Math.min(a.va_grezzo, a.limite)) incoerenze.push(`${m.classe} ${g.grado} ${nome}: VA personale ${a.va_personale} ≠ min(${a.va_grezzo}, ${a.limite})`);
        if (a.categoria !== cat[nome]) incoerenze.push(`${m.classe} ${g.grado} ${nome}: categoria ${a.categoria}, nelle competenze ${cat[nome]}`);
        if (a.base !== j.basi[a.categoria]) incoerenze.push(`${m.classe} ${g.grado} ${nome}: base ${a.base}, attesa ${j.basi[a.categoria]}`);
        if (a.limite !== j.limiti_per_grado[a.categoria][i]) incoerenze.push(`${m.classe} ${g.grado} ${nome}: limite ${a.limite}, atteso ${j.limiti_per_grado[a.categoria][i]}`);
        if (a.punti_liberi !== g.punti_liberi_cumulativi[nome]) incoerenze.push(`${m.classe} ${g.grado} ${nome}: punti liberi ${a.punti_liberi} ≠ cumulativi ${g.punti_liberi_cumulativi[nome]}`);
        if (a.corporazione !== m.bonus_corporazione) incoerenze.push(`${m.classe} ${g.grado} ${nome}: Corporazione ${a.corporazione}, il modello dichiara ${m.bonus_corporazione}`);
      }
    }
  }
  return {
    impronta: sha256 === null ? null : sha256 === j.sha256_manuale_mostri,
    sha256_dichiarato: j.sha256_manuale_mostri,
    numeri, voci, incoerenze, acquisizioni, profili,
  };
}

/** Il profilo delle categorie del JSON deve essere il 4/7/9/4 di `regole.json` (lotto 192). */
export function profiloSiAccorda(j, regole) {
  const C = regole.competenze.categorie;
  const fuori = [];
  for (const c of ['S', 'P', 'G', 'N']) {
    if (j.basi[c] !== C[c].base) fuori.push(`base ${c}: il JSON dice ${j.basi[c]}, regole.json ${C[c].base}`);
    for (const [i, lim] of j.limiti_per_grado[c].entries()) {
      const g = i + 1;
      const atteso = C[c].limite.fisso + C[c].limite.per_grado_totale * g + C[c].limite.per_grado_categoria * g;
      if (lim !== atteso) fuori.push(`limite ${c} al ${g}° Grado: il JSON dice ${lim}, le formule del §8.7 danno ${atteso}`);
    }
  }
  for (const m of j.modelli) {
    for (const c of ['S', 'P', 'G', 'N']) if (m.competenze[c].length !== C[c].numero) fuori.push(`${m.classe}: ${m.competenze[c].length} Abilità ${c}, il profilo del Giocatore 0.62 ne vuole ${C[c].numero}`);
  }
  return fuori;
}

// ---------- il montaggio ----------

export function importaPng(testoWord, fonte, { versione_manuale, nota_fonte } = {}) {
  const righe = leggiRigheTesto(testoWord);
  const comuni = leggiRegole(righe);
  const perClasse = new Map(fonte.modelli.map((m) => [m.classe, m]));
  const classi = {};
  for (const [categoria, lista] of Object.entries(CATEGORIE)) for (const nome of lista) {
    const m = perClasse.get(nome);
    if (!m) throw new Error(`il JSON non ha il modello «${nome}»: ${[...perClasse.keys()].join(', ')}`);
    classi[slug(nome)] = { ...leggiProsa(righe, nome, categoria), ...dalJson(m) };
  }
  // «Spada» nelle tabelle di Classe, «Arma da guerra» nella tabella degli armamenti astratti: A.269.
  const tipi = new Set(comuni.armamenti.map((a) => a.tipo));
  const usate = new Set(Object.values(classi).flatMap((c) => Object.values(c.attacchi).flat().map((a) => a.arma)));
  const alias_armi = {};
  for (const a of usate) if (!tipi.has(a)) {
    if (a !== 'Spada') throw new Error(`l’arma «${a}» non è nella tabella degli armamenti astratti e non è un alias dichiarato`);
    alias_armi[a] = {
      riga: 'Arma da guerra',
      motivo: 'Mostri 0.67: le tabelle di Classe di Assaltatore e Incursore scrivono «Spada», la tabella degli armamenti astratti ha ancora la riga «Arma da guerra». Stesso dado (1d8), una mano, ravvicinato, e la Specializzazione della famiglia si chiama «Spade»: è la stessa riga con il nome nuovo. Ipotesi dichiarata, non una certezza.',
      domanda: 'A.269',
    };
  }
  return {
    versione_manuale: versione_manuale ?? 'Mostri 0.67; Direttore 0.51 §§9.6–9.6.2',
    fonte: nota_fonte ?? 'Manuale dei Mostri 0.67, «PNG generici Classe Grado ed EQ» (prosa, blocchi comuni) e SIMPLY_RPG_PNG_Abilita_v0.67.json di Davide (numeri, Abilità, acquisizioni, valori pronti): docs/manuali-txt/png-abilita-0.67.json, con lo sha256 del Word che dichiara. Venticinque modelli, centocinquanta righe di Grado.',
    gradi: GRADI,
    movimento: { passo: 6, corsa: 12, scatto: 18, nota: 'Movimento: 6/12/18 Q Base (Agente, tabella delle risorse); una AM per Round.' },
    valori_pronti: 'I valori pronti delle tabelle comprendono già i benefici fissi delle acquisizioni raggiunte, una volta sola (Mostri 0.67, «Bonus permanenti»; Direttore 0.51 §9.6.2). I VA delle 24 Abilità sono personali, prima di Specializzazioni, EQ, strumenti e condizioni. Non si risommano: si aggiunge EQ una volta sola e i soli modificatori condizionati pertinenti.',
    livelli_acquisizioni: fonte.livelli_acquisizioni,
    ...comuni,
    ...(Object.keys(alias_armi).length ? { alias_armi } : {}),
    classi,
  };
}

// ---------- uso da riga di comando ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = Object.fromEntries(process.argv.slice(2).map((x) => { const m = x.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [x, true]; }));
  const testo = a.testo ? readFileSync(a.testo, 'utf8') : testoManuale('mostri');
  const fonte = a.json ? JSON.parse(readFileSync(a.json, 'utf8')) : fonteDati('png-abilita');
  const v = voceDati('png-abilita');
  const esito = verificaFonte(fonte, { sha256: v.sha256_manuale ?? null });
  console.log(`Fonte: ${a.json ?? percorsoFonteDati('png-abilita')}`);
  console.log(`1. impronta del Word dichiarata dal JSON: ${esito.sha256_dichiarato.slice(0, 16)}… — ${esito.impronta === null ? 'nessuna impronta nel registro' : esito.impronta ? 'coincide con il registro' : 'NON coincide con il registro'}`);
  console.log(`2. numeri di controllo del Doc E&L: ${esito.numeri.filter((x) => x.ok).length}/${esito.numeri.length}` + esito.numeri.filter((x) => !x.ok).map((x) => `\n   ✗ ${x.nome}: ${x.avuto} invece di ${x.atteso}`).join(''));
  console.log(`   acquisizioni: ${esito.acquisizioni.specializzazioni} Specializzazioni, ${esito.acquisizioni.maestrie} Maestrie, ${esito.acquisizioni.talenti_liberi} Talenti Liberi`);
  console.log(`3. coerenza interna: ${esito.voci} voci viste su ${VOCI_ATTESE} attese, ${esito.incoerenze.length} incoerenze`);
  for (const x of esito.incoerenze.slice(0, 10)) console.log(`   ✗ ${x}`);
  console.log(`   profilo delle categorie: ${Object.entries(esito.profili).map(([k, n]) => `${k} × ${n}`).join(', ')}`);
  const regole = JSON.parse(readFileSync(join(RADICE, 'data/regole.json'), 'utf8'));
  const fuori = profiloSiAccorda(fonte, regole);
  console.log(`4. accordo con il profilo 4/7/9/4 di regole.json (lotto 192): ${fuori.length ? `${fuori.length} differenze` : 'tutto d’accordo'}`);
  for (const x of fuori.slice(0, 10)) console.log(`   ✗ ${x}`);
  if (a.verifica) process.exit(esito.voci === VOCI_ATTESE && !esito.incoerenze.length && !fuori.length && esito.impronta !== false ? 0 : 1);
  const dati = importaPng(testo, fonte);
  const dest = a.dest ?? join(RADICE, 'data/png_generici.json');
  const nuovo = `${JSON.stringify(dati, null, 2)}\n`;
  const vecchio = existsSync(dest) ? readFileSync(dest, 'utf8') : null;
  const classi = Object.values(dati.classi);
  console.log(`\nModelli montati: ${classi.length} (${Object.keys(CATEGORIE).map((c) => `${c} ${CATEGORIE[c].length}`).join(', ')}); righe di Grado: ${classi.reduce((n, c) => n + Object.keys(c.risorse).length, 0)} su ${RIGHE_DI_GRADO}.`);
  if (dati.alias_armi) console.log(`Alias dichiarati: ${Object.entries(dati.alias_armi).map(([k, x]) => `${k} → ${x.riga} (${x.domanda})`).join(', ')}.`);
  console.log(vecchio === null ? 'Il file non c’è ancora.' : vecchio === nuovo ? 'Nessuna differenza con il file attuale.' : 'Il file attuale è diverso da quello che verrebbe scritto.');
  if (a.scrivi) { writeFileSync(dest, nuovo); console.log(`Scritto ${dest} (${Math.round(nuovo.length / 1024)} KB).`); } else console.log('(Nessun file scritto: usa --scrivi.)');
  void createHash;
}
