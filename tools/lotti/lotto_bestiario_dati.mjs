// Il Bestiario proposto come dati (data/bestiario.json), per «Crea nemico» e «Prepara scontro» del Tavolo del
// Master (richiesta di Marcello del 03/10/2026). Fonte: docs/bestiario/bestiario.md (bozza 0.2, proposta in attesa
// di Davide: docs/bestiario/domande-per-davide.md).
// - Le tabelle si leggono dal Markdown: scala dei gradi (§2.1–2.3, §2.5.1, A.3), basi (cap. 3), equipaggiamento
//   (§4.4), tabelle casuali (cap. 6). Così dati e documento dicono gli stessi numeri (tests/bestiario.test.js).
// - Gli effetti numerici dei moduli (cap. 4) e le ricette delle creature pronte (cap. 5) sono scritti qui, dal
//   testo dei paragrafi; il motore (src/crea-nemico.js) calcola i profili e il test li confronta con il cap. 5.
//   node tools/lotti/lotto_bestiario_dati.mjs           → controlli e prova a vuoto
//   node tools/lotti/lotto_bestiario_dati.mjs --scrivi  → scrive data/bestiario.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../', import.meta.url);
const md = readFileSync(new URL('docs/bestiario/bestiario.md', R), 'utf8').split(/\r?\n/);
const scrivi = process.argv.includes('--scrivi');
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo: ${msg}`); controlli++; };

const pulisci = (t) => String(t).replace(/\*\*/g, '').replace(/\\/g, '').trim();
/** Tabelle della sezione che comincia con il titolo dato, fino al titolo successivo dello stesso livello o superiore. */
function tabelle(titolo) {
  const i = md.findIndex((r) => /^#+\s/.test(r) && pulisci(r.replace(/^#+\s*/, '')).startsWith(titolo));
  verifica(i >= 0, `sezione «${titolo}»`);
  const livello = /^(#+)/.exec(md[i])[1].length;
  const out = [];
  for (let k = i + 1; k < md.length; k++) {
    const t = /^(#+)\s/.exec(md[k]);
    if (t && t[1].length <= livello) break;
    if (md[k].startsWith('|') && /^\|\s*:?-{3,}/.test(md[k + 1] ?? '')) {
      const celle = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(pulisci);
      const testa = celle(md[k]);
      const righe = [];
      let j = k + 2;
      for (; md[j]?.startsWith('|'); j++) righe.push(celle(md[j]));
      out.push({ testa, righe });
      k = j;
    }
  }
  return out;
}
const num = (s) => Number(String(s).replace(/\s/g, '').replace(',', '.').replace('−', '-').replace(/[^\d.+-]/g, ''));
const GRADI = [['minore', 'Minore'], ['semplice', 'Semplice'], ['medio', 'Medio'], ['potente', 'Potente'], ['molto-potente', 'Molto potente']];
const idGrado = (nome) => GRADI.find(([, n]) => n === nome)?.[0];

// --- cap. 2: scala --------------------------------------------------------------------------------------------
const [t21] = tabelle('2.1 I sei gradi');
const [t22] = tabelle('2.2 Valori derivati per grado');
const [, t251] = tabelle('2.5.1 Valori del Boss');
const tA3 = tabelle('A.3 Modello dello scontro');
const misti = tA3.find((t) => t.testa[0] === 'Livello dei PG');
const equil = tA3.find((t) => t.testa.join() === 'Grado,Facile,Normale,Duro');
verifica(t21.righe.length === 6 && t22.righe.length === 5 && t251.righe.length === 5 && misti && equil, 'tabelle della scala');
const gradi = GRADI.map(([id, nome], i) => {
  const r = t21.righe[i];
  const d = t22.righe[i];
  const b = t251.righe[i];
  verifica(r[0] === nome && d[0] === nome && b[0] === nome, `grado ${nome}`);
  const [forte, media, debole] = [num(d[2]), num(d[3]), num(d[4])];
  return {
    id, nome, livelli: r[1], livello_rif: num(r[2]), pv: num(r[3]), va: num(r[4]), difese: num(r[5]), ar: num(r[6]),
    danno_medio: num(r[7]), danno: r[8], azp: num(r[9]), round_resistenza: num(r[10]), round_abbattere: num(r[11]),
    iniziativa: num(d[1]), ps: { forte, media, debole }, passo: num(d[5]), spazio: d[6],
    boss: { pv: num(b[1]), azp: num(b[2]), round_resistenza: num(b[3]) },
    equilibrato: Object.fromEntries(['facile', 'normale', 'duro'].map((k, j) => [k, num(equil.righe.find((x) => x[0] === nome)[j + 1])])),
  };
});
const gruppiMisti = misti.righe.map((r) => ({ livello: num(r[0]), ...Object.fromEntries(GRADI.map(([id], j) => [id, num(r[j + 1])])) }));

// --- cap. 3: basi ---------------------------------------------------------------------------------------------
const [t32] = tabelle('3.2 Umano');
verifica(t32.testa[0] === 'Bestiario umano', 'tabella del bestiario umano');
const umano = Object.fromEntries(t32.righe.map((r) => [idGrado(r[2]), {
  tipo: r[0].replace(/ \(da preparare\)$/, ''), da_preparare: /da preparare/.test(r[0]), livello: num(r[1]),
  pv_molt: num(r[3]), azp: num(r[4]), bonus_danno: num(r[5]), round_resistenza: num(r[6]), round_abbattere: num(r[7]),
}]));
// i dieci tipi del bestiario umano, con il nome del §3.2 («I tipi sono: …»); l'id è quello dei file esempi/nemici/umani/
const frase = md.find((r) => r.startsWith('I tipi sono: '));
const NOMI_UMANI = frase.replace('I tipi sono: ', '').split('.')[0].split(', ');
const TIPI_UMANI = NOMI_UMANI.map((nome) => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
verifica(TIPI_UMANI.length === 10 && TIPI_UMANI.every((t) => ['recluta', 'veterano', 'elite'].every((g) => existsSync(new URL(`esempi/nemici/umani/${t}-${g}.json`, R)))), 'tipi del bestiario umano e loro file');

/** Tabella di una base: righe per Caratteristica e valori, poi «Attacco» e «Abilità». */
function base(titolo) {
  const [t] = tabelle(titolo);
  const per = GRADI.map(() => ({ caratteristiche: {}, salvezze: {}, attacchi: [], abilita: [] }));
  let parte = 'valori';
  let attacco = null;
  for (const r of t.righe) {
    if (r[0] === 'Attacco') { parte = 'attacco'; continue; }
    if (r[0] === 'Abilità') { parte = 'abilita'; continue; }
    const v = r.slice(1);
    if (parte === 'abilita') { v.forEach((x, i) => per[i].abilita.push({ nome: r[0], va: num(x) })); continue; }
    if (parte === 'attacco') {
      if (['Natura', 'Portata Q', 'AC'].includes(r[0]) || r[0].startsWith('Ragnatela')) {
        if (r[0].startsWith('Ragnatela')) v.forEach((x, i) => { per[i].ragnatela = { ...(per[i].ragnatela ?? {}), gittata_q: num(x) }; });
        else v.forEach((x, i) => { const a = per[i].attacchi.at(-1); if (r[0] === 'Natura') a.natura = x; if (r[0] === 'Portata Q') a.portata_q = num(x); if (r[0] === 'AC') a.ac = num(x); });
        continue;
      }
      attacco = r[0];
      v.forEach((x, i) => per[i].attacchi.push({ nome: attacco, danno: x }));
      continue;
    }
    if (['FOR', 'COS', 'DES', 'INT', 'SAG', 'CAR'].includes(r[0])) { v.forEach((x, i) => { per[i].caratteristiche[r[0]] = num(x); }); continue; }
    const mappa = { PV: 'pv', AR: 'ar', 'VA Difese': 'difese', Iniziativa: 'iniziativa', 'Passo Q': 'passo', 'Passo in volo Q': 'volo', AzP: 'azp' };
    if (mappa[r[0]]) { v.forEach((x, i) => { per[i][mappa[r[0]]] = num(x); }); continue; }
    if (r[0] === 'Spazio occupato') { v.forEach((x, i) => { per[i].spazio = x; }); continue; }
    // §3.1.1: taglia Grande (proposta), nel formato dei nemici in minuscolo
    if (r[0] === 'Taglia') { v.forEach((x, i) => { per[i].taglia = x.toLowerCase(); }); continue; }
    if (r[0] === 'Natura AR') continue;
    const ps = /^PS (Tempra|Riflessi|Volontà|Magia)$/.exec(r[0]);
    if (ps) { const k = { Tempra: 'tempra', Riflessi: 'riflessi', Volontà: 'volonta', Magia: 'magia' }[ps[1]]; v.forEach((x, i) => { per[i].salvezze[k] = num(x); }); continue; }
    const va = /^VA (.+)$/.exec(r[0]);
    if (va) { v.forEach((x, i) => { (per[i].va ??= {})[va[1]] = num(x); }); continue; }
    throw new Error(`${titolo}: riga «${r[0]}» non riconosciuta`);
  }
  // VA dell'attacco nella sua riga «VA <nome>»
  per.forEach((p) => {
    for (const a of p.attacchi) { a.va = p.va[a.nome]; verifica(Number.isInteger(a.va), `${titolo}: VA di ${a.nome}`); }
    if (p.ragnatela) p.ragnatela.va = p.va.Ragnatela;
    delete p.va;
  });
  return Object.fromEntries(GRADI.map(([id], i) => [id, per[i]]));
}
const basi = {
  umano: {
    nome: 'Umano', paragrafo: '§3.2', natura: 'Comune', umano: true, tipi: TIPI_UMANI, nomi_tipi: Object.fromEntries(TIPI_UMANI.map((t, i) => [t, NOMI_UMANI[i]])), per_grado: umano,
    nota: 'Gli umani vengono dal bestiario umano del Tavolo del Master (esempi/nemici/umani/), portati al grado con PV × moltiplicatore, AzP del grado e bonus di grado al danno. Comandante (12°) e Campione (16°) sono da preparare.',
  },
  insettoide: {
    nome: 'Insettoide', paragrafo: '§3.3', natura: 'Comune', per_grado: base('3.3 Insettoide'),
    movimento: { arrampicata: 'pareti al Passo senza Prova; soffitti a Passo dimezzato' },
    capacita: [
      { nome: 'Arrampicata', effetto: 'Si muove su pareti verticali al Passo, senza Prova; sui soffitti con Passo dimezzato. Non nuota.' },
      { nome: 'Vibrazioni', effetto: 'Percepisce entro 6 Q le creature che si muovono a contatto con il suolo anche senza vederle; contro di loro niente penalità di Accecato o dell’oscurità.' },
    ],
    immunita: ['terrorizzato'], immunita_nota: 'salvo effetti magici',
    comportamento: 'Attacca in gruppo il bersaglio più vicino; ogni Insettoide oltre il primo ingaggiato con lo stesso bersaglio applica la Superiorità numerica. Fugge quando metà del gruppo è a 0 PV.',
  },
  aracnoide: {
    nome: 'Aracnoide', paragrafo: '§3.4', natura: 'Comune', per_grado: base('3.4 Aracnoide'),
    capacita: [
      { nome: 'Ragnatela', effetto: 'Attacco a distanza con 1 AzP, senza danno: PS di Riflessi o Immobilizzato. Liberarsi: 1 AzP e Atletica o Forza contro il VA della Ragnatela; il fuoco libera. Una sola Ragnatela per bersaglio.' },
      { nome: 'Arrampicata', effetto: 'Si muove su pareti e soffitti al Passo, senza Prova, anche capovolto.' },
      { nome: 'Visione al buio', effetto: 'Non subisce le penalità dell’oscurità ordinaria.' },
      { nome: 'Vibrazioni nella tela', effetto: 'Percepisce ogni creatura che tocca i propri fili entro 12 Q.' },
    ],
    immunita: [],
    danno_ricevuto: 'Il Fuoco gli applica sempre la PS per Incendiato anche quando il danno non supera l’Armatura, senza perdita di PV.',
    comportamento: 'Prepara la zona con i fili, attende in alto, usa la Ragnatela sul bersaglio più pericoloso e morde quello Immobilizzato. Si ritira sotto un quarto dei PV.',
  },
  'umanoide-mostruoso': {
    nome: 'Umanoide mostruoso', paragrafo: '§3.5', natura: 'Comune', per_grado: base('3.5 Umanoide mostruoso'), equipaggiabile: true,
    capacita: [
      { nome: 'Artigli', effetto: 'Arma ravvicinata leggera; consentono le Manovre del §5.12 che non richiedono lama o asta. Con una Carica riuscita il colpo applica Sbalzante 1.' },
      { nome: 'Olfatto', effetto: 'Segue una traccia fino a un giorno di età; +2 alle Prove di Percezione basate sull’odore entro 30 Q.' },
    ],
    immunita: [],
    comportamento: 'Carica il bersaglio più vicino o quello che lo ha ferito per ultimo; non usa le Difese se può attaccare.',
  },
  // basi del 03/10/2026 (richiesta di Marcello), con le regole del §3.1.1: volo e Carica dal Giocatore §5.2 e §5.6,
  // Spazzata dal §5.12, Sorpresa e Imboscata dal §5.1 e §5.4; bersaglio in volo e taglia Grande sono proposte (TODO(Davide))
  quadrupede: {
    nome: 'Quadrupede', paragrafo: '§3.6', natura: 'Comune', per_grado: base('3.6 Quadrupede'),
    capacita: [
      { nome: 'Carica del branco', effetto: 'Carica del Giocatore §5.6 (almeno 3 Q in linea retta, danno ×2) senza la penalità al VA per chi carica; il bersaglio colpito effettua una PS di Riflessi o cade A Terra (§5.5).' },
      { nome: 'Olfatto', effetto: 'Segue una traccia fino a un giorno di età; +2 alle Prove di Percezione basate sull’odore entro 30 Q.' },
    ],
    immunita: [],
    comportamento: 'In branco circonda il gruppo, carica chi si stacca e applica la Superiorità numerica. Fugge quando il capobranco va a 0 PV.',
  },
  alato: {
    nome: 'Alato', paragrafo: '§3.7', natura: 'Comune', per_grado: base('3.7 Alato'), va_contro: -2,
    capacita: [
      { nome: 'Volo', effetto: 'Volo del Giocatore §5.2.3–5.2.5 con il Passo in volo della scheda; Corsa e Scatto il doppio e il triplo. Non resta sospeso fermo. Chi lo attacca mentre vola subisce −2 VA (Bestiario §3.1.1, proposta).' },
      { nome: 'Picchiata', effetto: 'Carica in volo (Giocatore §5.2.4, §5.6) da almeno 3 Q più in alto del bersaglio; dopo l’attacco riprende quota con il movimento che resta, senza Attacchi di Opportunità dal bersaglio.' },
      { nome: 'Vista acuta', effetto: '+2 alle Prove di Percezione basate sulla vista.' },
    ],
    immunita: [],
    danno_ricevuto: 'A 0 PV in volo precipita (Giocatore §5.22).',
    comportamento: 'Gira in alto fuori portata, sceglie chi non ha armi a distanza e piomba con la Picchiata; risale e ripete. Fugge a metà dei PV.',
  },
  strisciante: {
    nome: 'Strisciante', paragrafo: '§3.8', natura: 'Comune', per_grado: base('3.8 Strisciante'),
    capacita: [
      { nome: 'Spire', effetto: 'Se le Spire infliggono almeno 1 danno dopo l’Armatura il bersaglio è Immobilizzato, salvo una PS di Riflessi. Liberarsi: 1 AzP e Atletica o Corpo a corpo contro il VA delle Spire. Un solo bersaglio alla volta; mentre lo trattiene morde solo lui.' },
      { nome: 'Agguato dal basso', effetto: 'Sepolto nel terreno sciolto o nelle macerie: +4 a Furtività. Se esce attaccando senza essere individuato, il bersaglio è Sorpreso (Giocatore §5.1) e il primo attacco segue l’Imboscata (§5.4) senza penalità.' },
      { nome: 'Scavo', effetto: 'Scava con Passo 4 Q nel terreno sciolto e nelle macerie, senza Corsa né Scatto; non nella roccia o nel cemento.' },
      { nome: 'Vibrazioni', effetto: 'Percepisce entro 9 Q le creature che si muovono a contatto con il suolo anche senza vederle.' },
    ],
    immunita: [],
    comportamento: 'Aspetta sepolto sotto il passaggio, esce sul primo che passa, lo avvolge e lo trascina verso il cunicolo. Si rintana sotto un quarto dei PV.',
  },
  gigante: {
    nome: 'Gigante', paragrafo: '§3.9', natura: 'Comune', per_grado: base('3.9 Gigante'), va_contro: 2, massimo_per_scontro: { sotto: 'potente', numero: 1 },
    capacita: [
      { nome: 'Taglia Grande', effetto: 'Chi lo attacca ottiene +2 VA; Sbalzante non lo sposta (Bestiario §3.1.1, proposta).' },
      { nome: 'Spazzata del gigante', effetto: 'Spazzata del Giocatore §5.12 come con Spazzata Migliorata: −2 VA contro due bersagli, −4 contro tre, entro la portata di 2 Q. Con una Carica riuscita lo Schianto applica Sbalzante 1.' },
      { nome: 'Raro', effetto: 'Al massimo un Gigante per scontro sotto il grado Potente.' },
    ],
    immunita: [],
    comportamento: 'Avanza verso il gruppo più folto per colpirne più d’uno con la Spazzata; abbatte le Coperture leggere. Non fugge.',
  },
};
// moltiplicatori della base rispetto al grado (§3.1), usati per i PV del Boss (§2.5.1)
basi.umano.pv_molt_boss = 1;
basi.insettoide.pv_molt_boss = 0.9;
basi.aracnoide.pv_molt_boss = 0.9;
basi['umanoide-mostruoso'].pv_molt_boss = 1.1;
basi.quadrupede.pv_molt_boss = 1;
basi.alato.pv_molt_boss = 0.85;
basi.strisciante.pv_molt_boss = 1.2;
basi.gigante.pv_molt_boss = 1.25;
// controllo: i PV delle basi sono quelli del grado × il moltiplicatore, arrotondati
for (const [id, b] of Object.entries(basi)) if (!b.umano) for (const g of gradi) verifica(b.per_grado[g.id].pv === Math.round(g.pv * b.pv_molt_boss), `${id} ${g.nome}: PV = grado × ${b.pv_molt_boss}`);

// --- cap. 4: moduli -------------------------------------------------------------------------------------------
const [t42] = tabelle('4.2 Corrotto dall’Oscura Simmetria');
const [tMin, tMag] = tabelle('4.2.4 Manifestazioni oscure');
const [t425] = tabelle('4.2.5 Esposizione alla Corruzione');
const [t43] = tabelle('4.3 Mutazioni');
const [t44, t44c] = tabelle('4.4 Equipaggiamento');
const idDa = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const testoDi = (t, nome) => t.righe.find((r) => r[0] === nome)?.[1];
verifica(t42.righe.map((r) => r[0]).join() === 'Toccato,Posseduto,Consacrato', 'livelli del Corrotto');
const EFFETTI_LIVELLO = {
  toccato: { volonta: 2, natura: 'Oscura Simmetria' },
  posseduto: { volonta: 2, natura: 'Oscura Simmetria', ar_magica: 1, attacchi_naturali: 'Magico', capacita: ['Presenza terrificante'] },
  consacrato: { volonta: 2, natura: 'Oscura Simmetria', ar_magica: 2, attacchi_naturali: 'Magico', attacco_etereo: true, immunita: ['terrorizzato'], capacita: ['Presenza terrificante'] },
};
const corrotto = {
  paragrafo: '§4.2',
  livelli: t42.righe.map((r) => {
    const id = idDa(r[0]);
    const [min, mag] = r[4] === '1 minore' ? [1, 0] : r[4] === '1 minore e 1 maggiore' ? [1, 1] : [1, 2];
    const esp = t425.righe.find((x) => x[0] === r[0]);
    return { id, nome: r[0], costo: num(r[1].replace('½', '.5')), effetto: r[3], manifestazioni: { minori: min, maggiori: mag }, esposizione: { nome: esp[1], modificatore: esp[2], intensita: num(esp[3]) }, effetti: EFFETTI_LIVELLO[id] };
  }),
  presenza_terrificante: 'La prima volta in una Scena che un personaggio vede la creatura agire in combattimento: PS di Volontà o Terrorizzato. Una volta per personaggio e per Scena.',
};
const EFFETTI_MANIFESTAZIONE = {
  'pelle-di-cenere': { ar_magica: 1, costo: 0.5 },
  'sangue-fermo': { immunita: ['sanguinamento'] },
  'gelo-dell-abisso': { proprieta_naturali: ['Gelo'] },
  'ferite-che-non-si-chiudono': { proprieta_naturali: ['Sanguinante 1'], dal_potente: { proprieta_naturali: ['Sanguinante 2'] } },
  'fiamma-nera': { proprieta_naturali: ['Fuoco'] },
  'carne-che-ricorda': { recupero_pv: { minore: 3, semplice: 3, medio: 3, potente: 10, 'molto-potente': 10 } },
};
const manifestazioni = (t) => t.righe.map((r) => ({ id: idDa(r[0]), nome: r[0], effetto: r[1], ...(EFFETTI_MANIFESTAZIONE[idDa(r[0])] ? { effetti: EFFETTI_MANIFESTAZIONE[idDa(r[0])] } : {}) }));
corrotto.manifestazioni_minori = manifestazioni(tMin);
corrotto.manifestazioni_maggiori = manifestazioni(tMag);
const BASI_ID = { Tutte: Object.keys(basi) };
const EFFETTI_MUTAZIONE = {
  carapace: { ar: 1, passo_da_8: 6 },
  'arti-in-piu': {},
  veleno: { veleno: { minore: '1d4', semplice: '1d4', medio: '1d6', potente: '1d6', 'molto-potente': '1d6' } },
  rigenerazione: { recupero_pv: { minore: 2, semplice: 3, medio: 5, potente: 10, 'molto-potente': 15 }, costo_dal_potente: 1 },
  'sangue-acido': {},
  'sensi-oscuri': {},
  aculei: { proprieta_naturali: ['Sanguinante 1'] },
  mole: { pv_molt: 1.5, difese: -2, portata_q: 2, spazio: '2 × 2 Q' },
  'ali-membranose': { volo_q: 6 },
  scavatore: { scavo_q: 2 },
  mimetismo: { abilita: { Furtività: 4 } },
  balzo: { proprieta_carica: ['Sbilanciante'] },
};
const mutazioni = t43.righe.map((r) => {
  const id = idDa(r[0]);
  const testo = md.find((x) => x.startsWith(`**${r[0]}.**`));
  verifica(testo, `testo di ${r[0]}`);
  const basiAmmesse = r[2] === 'Tutte' ? BASI_ID.Tutte : r[2].split(', ').map((n) => Object.entries(basi).find(([, b]) => b.nome === n)?.[0]);
  verifica(basiAmmesse.every(Boolean), `${r[0]}: basi`);
  return { id, nome: r[0], costo: num(r[1].replace(/\s*\(.*$/, '').replace('½', '.5')), basi: basiAmmesse, breve: r[3], effetto: pulisci(testo).replace(/^[^.]+\.\s*/, ''), effetti: EFFETTI_MUTAZIONE[id] ?? {} };
});
verifica(mutazioni.length === 12 && mutazioni.every((m) => EFFETTI_MUTAZIONE[m.id]), '12 Mutazioni');
// §4.3 Mole: per un Aracnoide Potente o Molto potente (già 2 × 2 Q) vale soltanto PV e portata, con costo +½
mutazioni.find((m) => m.id === 'mole').eccezioni = [{ base: 'aracnoide', gradi: ['potente', 'molto-potente'], costo: 0.5, senza: ['difese', 'spazio'] }];

// §4.4: equipaggiamento per grado, armi e armature del catalogo dell'app
const ARMI = {
  'Pistola semiautomatica': 'armi_distanza:pistola-semiautomatica', Carabina: 'armi_distanza:carabina', Coltello: 'armi:coltello',
  'Fucile d’assalto': 'armi_distanza:fucile-d-assalto', Revolver: 'armi_distanza:revolver', 'Spada leggera': 'armi:spada-leggera', 'Spada lunga': 'armi:spada-lunga',
  'Mitragliatore leggero': 'armi_distanza:mitragliatore-leggero', Spadone: 'armi:spadone', 'Mitragliatore pesante': 'armi_distanza:mitragliatore-pesante', 'Ascia bipenne': 'armi:ascia-bipenne',
};
const equipaggiamento = {
  paragrafo: '§4.4', basi: ['umano', 'umanoide-mostruoso'],
  per_grado: Object.fromEntries(t44.righe.map((r) => [idGrado(r[0]), { protezione: r[1], ar: num(r[2].split('–')[0]), armi: r[3].split(', ').map((n) => ARMI[n]) }])),
  fasce: t44c.righe.map((r, i) => ({ id: ['del-grado', 'grado-successivo', 'due-fasce-sopra'][i], nome: r[0], costo: num(r[1].replace('½', '.5')), salto: i })),
  distanza_va: -2,
};
verifica(Object.values(equipaggiamento.per_grado).every((g) => g.armi.every(Boolean)), 'armi del §4.4 nel catalogo');

// --- cap. 5: creature pronte (ricette: base, moduli, gradi) ---------------------------------------------------
const descr = (titolo) => {
  const i = md.findIndex((r) => pulisci(r.replace(/^#+\s*/, '')) === titolo);
  return pulisci(md[i + 2]);
};
const comport = (titolo) => {
  const i = md.findIndex((r) => pulisci(r.replace(/^#+\s*/, '')) === titolo);
  return pulisci(md.slice(i).find((r) => r.startsWith('**Comportamento.**')) ?? '').replace(/^Comportamento\.\s*/, '');
};
const creature = [
  { id: 'scavafosse', nome: 'Scavafosse', titolo: '5.2.1 Scavafosse', famiglia: 'insettoidi', base: 'insettoide', gradi: ['minore', 'semplice', 'medio'], moduli: { mutazioni: ['carapace', 'scavatore'] } },
  { id: 'regina-della-covata', nome: 'Regina della Covata', titolo: '5.2.2 Regina della Covata', famiglia: 'insettoidi', base: 'insettoide', gradi: ['medio', 'potente', 'molto-potente'], moduli: { mutazioni: ['mole'], corrotto: { livello: 'posseduto', minori: ['sussurro-continuo'], maggiori: ['grido-dell-oscura-simmetria'] } },
    boss: { grado: 'potente', capacita: { nome: 'Covata', effetto: 'Alla soglia di fase 1d6 Scavafosse Minori escono dal terreno entro 6 Q e agiscono alla sua Iniziativa del Round successivo.' } } },
  { id: 'pungiglione-dei-condotti', nome: 'Pungiglione dei Condotti', titolo: '5.2.3 Pungiglione dei Condotti', famiglia: 'insettoidi', base: 'insettoide', gradi: ['semplice', 'medio', 'potente'], moduli: { mutazioni: ['ali-membranose', 'veleno'] } },
  { id: 'tessitrice-d-ombra', nome: 'Tessitrice d’Ombra', titolo: '5.3.1 Tessitrice d’Ombra', famiglia: 'aracnoidi', base: 'aracnoide', gradi: ['minore', 'semplice', 'medio'], moduli: { mutazioni: ['mimetismo', 'veleno'] } },
  { id: 'madre-dei-fili-neri', nome: 'Madre dei Fili Neri', titolo: '5.3.2 Madre dei Fili Neri', famiglia: 'aracnoidi', base: 'aracnoide', gradi: ['medio', 'potente', 'molto-potente'], moduli: { corrotto: { livello: 'consacrato', minori: ['gelo-dell-abisso'], maggiori: ['ferite-che-non-si-chiudono', 'sguardo-del-vuoto'] } },
    boss: { grado: 'potente', capacita: { nome: 'Tela che beve la luce', effetto: 'Alla soglia di fase spegne ogni luce non magica entro 12 Q fino alla fine della Scena; chi non ha Visione al buio subisce le penalità dell’oscurità.' } } },
  { id: 'rodiroccia', nome: 'Rodiroccia', titolo: '5.3.3 Rodiroccia', famiglia: 'aracnoidi', base: 'aracnoide', gradi: ['semplice', 'medio', 'potente'], moduli: { mutazioni: ['mole', 'sangue-acido'] } },
  { id: 'squarciatore', nome: 'Squarciatore', titolo: '5.4.1 Squarciatore', famiglia: 'umanoidi mostruosi', base: 'umanoide-mostruoso', gradi: ['minore', 'semplice', 'medio'], moduli: { mutazioni: ['aculei', 'balzo'] } },
  { id: 'bruto-della-breccia', nome: 'Bruto della Breccia', titolo: '5.4.2 Bruto della Breccia', famiglia: 'umanoidi mostruosi', base: 'umanoide-mostruoso', gradi: ['semplice', 'medio', 'potente'], moduli: { mutazioni: ['carapace', 'rigenerazione'], corrotto: { livello: 'toccato', minori: ['sangue-fermo'], maggiori: [] } },
    boss: { grado: 'medio', capacita: { nome: 'Non si ferma', effetto: 'Alla soglia di fase termina gli Stati, recupera 15 PV e per il resto della Scena non subisce le penalità degli Stati di Ferita.' } } },
  { id: 'cantore-sfigurato', nome: 'Cantore Sfigurato', titolo: '5.4.3 Cantore Sfigurato', famiglia: 'umanoidi mostruosi', base: 'umanoide-mostruoso', gradi: ['semplice', 'medio', 'potente'], moduli: { corrotto: { livello: 'posseduto', minori: ['sussurro-continuo'], maggiori: ['sguardo-del-vuoto'] } } },
  { id: 'eretico-corrotto', nome: 'Eretico corrotto', titolo: '5.5.1 Eretico corrotto', famiglia: 'umani corrotti', base: 'umano', tipo_umano: 'eretico', gradi: ['minore', 'semplice', 'medio'],
    moduli: { corrotto: { livello: 'posseduto', minori: ['sussurro-continuo'], maggiori: ['sguardo-del-vuoto'] } },
    moduli_per_grado: { minore: { corrotto: { livello: 'toccato', minori: ['sussurro-continuo'], maggiori: [] } } },
    boss: { grado: 'medio', moduli: { corrotto: { livello: 'consacrato', minori: ['sussurro-continuo'], maggiori: ['sguardo-del-vuoto', 'grido-dell-oscura-simmetria'] } } } },
  // creature delle basi del §3.6–3.9 (03/10/2026); le terze di ogni famiglia e le nuove del 03/10/2026 sera
  { id: 'levriero-delle-discariche', nome: 'Levriero delle Discariche', titolo: '5.6.1 Levriero delle Discariche', famiglia: 'quadrupedi', base: 'quadrupede', gradi: ['minore', 'semplice', 'medio'],
    moduli: { mutazioni: ['sensi-oscuri'], corrotto: { livello: 'toccato', minori: ['occhi-senza-luce'], maggiori: [] } } },
  { id: 'cornofango', nome: 'Cornofango', titolo: '5.6.2 Cornofango', famiglia: 'quadrupedi', base: 'quadrupede', gradi: ['medio', 'potente', 'molto-potente'], moduli: { mutazioni: ['mole', 'carapace'] } },
  { id: 'lupo-senz-ombra', nome: 'Lupo senz’Ombra', titolo: '5.6.3 Lupo senz’Ombra', famiglia: 'quadrupedi', base: 'quadrupede', gradi: ['semplice', 'medio', 'potente'], moduli: { mutazioni: ['balzo'], corrotto: { livello: 'posseduto', minori: ['gelo-dell-abisso'], maggiori: ['ritorno'] } },
    boss: { grado: 'medio', capacita: { nome: 'Branco', effetto: 'Alla soglia di fase 1d4+1 Levrieri delle Discariche Minori arrivano di corsa entro 12 Q e agiscono alla sua Iniziativa del Round successivo.' } } },
  { id: 'gracchia-di-ruggine', nome: 'Gracchia di Ruggine', titolo: '5.7.1 Gracchia di Ruggine', famiglia: 'alati', base: 'alato', gradi: ['minore', 'semplice', 'medio'], moduli: { mutazioni: ['aculei'] } },
  { id: 'lamentatrice', nome: 'Lamentatrice', titolo: '5.7.2 Lamentatrice', famiglia: 'alati', base: 'alato', gradi: ['semplice', 'medio', 'potente'], moduli: { corrotto: { livello: 'posseduto', minori: ['occhi-senza-luce'], maggiori: ['grido-dell-oscura-simmetria'] } } },
  { id: 'falco-dei-tralicci', nome: 'Falco dei Tralicci', titolo: '5.7.3 Falco dei Tralicci', famiglia: 'alati', base: 'alato', gradi: ['medio', 'potente', 'molto-potente'], moduli: { mutazioni: ['arti-in-piu', 'veleno'] },
    boss: { grado: 'potente', capacita: { nome: 'Vento delle ali', effetto: 'Alla soglia di fase scende a terra battendo le ali: ogni personaggio entro 3 Q effettua una PS di Riflessi o cade A Terra; poi riprende quota con l’Azione di Movimento.' } } },
  { id: 'verme-dei-crolli', nome: 'Verme dei Crolli', titolo: '5.8.1 Verme dei Crolli', famiglia: 'striscianti', base: 'strisciante', gradi: ['semplice', 'medio', 'potente'], moduli: { mutazioni: ['carapace'] } },
  { id: 'lamprede-di-sentina', nome: 'Lamprede di Sentina', titolo: '5.8.2 Lamprede di Sentina', famiglia: 'striscianti', base: 'strisciante', gradi: ['minore', 'semplice', 'medio'], moduli: { mutazioni: ['veleno', 'sensi-oscuri'] } },
  { id: 'serpe-del-reliquiario', nome: 'Serpe del Reliquiario', titolo: '5.8.3 Serpe del Reliquiario', famiglia: 'striscianti', base: 'strisciante', gradi: ['medio', 'potente', 'molto-potente'], moduli: { corrotto: { livello: 'consacrato', minori: ['occhi-senza-luce'], maggiori: ['ferite-che-non-si-chiudono', 'carne-che-ricorda'] } },
    boss: { grado: 'potente', capacita: { nome: 'Ritorno nella cripta', effetto: 'Alla soglia di fase si inabissa nelle macerie con lo Scavo, senza Attacchi di Opportunità, e nel Round successivo riemerge con l’Agguato dal basso contro un personaggio a sua scelta entro 8 Q.' } } },
  { id: 'colosso-delle-fonderie', nome: 'Colosso delle Fonderie', titolo: '5.9.1 Colosso delle Fonderie', famiglia: 'giganti', base: 'gigante', gradi: ['medio', 'potente', 'molto-potente'],
    moduli: { corrotto: { livello: 'posseduto', minori: ['sussurro-continuo'], maggiori: ['fiamma-nera'] } },
    boss: { grado: 'potente', capacita: { nome: 'Colata', effetto: 'Alla soglia di fase la crosta si spacca: ogni personaggio entro 2 Q effettua una PS di Riflessi o è Incendiato, e il Colosso recupera 20 PV.' } } },
  { id: 'sgorbio-delle-vasche', nome: 'Sgorbio delle Vasche', titolo: '5.9.2 Sgorbio delle Vasche', famiglia: 'giganti', base: 'gigante', gradi: ['minore', 'semplice', 'medio'], moduli: { mutazioni: ['sangue-acido'] } },
  { id: 'mietitore-delle-serre', nome: 'Mietitore delle Serre', titolo: '5.9.3 Mietitore delle Serre', famiglia: 'giganti', base: 'gigante', gradi: ['semplice', 'medio', 'potente'], moduli: { mutazioni: ['arti-in-piu'], corrotto: { livello: 'toccato', minori: ['sangue-fermo'], maggiori: [] } },
    boss: { grado: 'medio', capacita: { nome: 'Mietitura', effetto: 'Alla soglia di fase esegue subito, fuori dall’Iniziativa, una Spazzata del gigante contro fino a tre personaggi entro portata.' } } },
].map((c) => ({ ...c, descrizione: descr(c.titolo), comportamento: comport(c.titolo), paragrafo: `§${c.titolo.split(' ')[0]}` }));
for (const c of creature) { verifica(c.descrizione.length > 80, `${c.nome}: descrizione`); delete c.titolo; }

// --- cap. 6: tabelle casuali ----------------------------------------------------------------------------------
const tabella = (titolo, campi = []) => {
  const [t] = tabelle(titolo);
  const dado = t.testa[0];
  const facce = num(dado.slice(1));
  const righe = t.righe.map((r) => {
    const [da, a] = r[0].split('–').map(num);
    const out = { da, a: a ?? da, id: r[2], nome: r[1] };
    campi.forEach(([k, j, f]) => { out[k] = f ? f(r[j]) : r[j]; });
    return out;
  });
  // ogni faccia una volta sola, in ordine
  verifica(righe[0].da === 1 && righe.at(-1).a === facce && righe.every((r, i) => i === 0 || r.da === righe[i - 1].a + 1), `${titolo}: facce del ${dado}`);
  return { dado, righe };
};
const costo = (s) => (s === '—' ? null : num(String(s).replace(/\s*\(.*$/, '').replace('½', '.5')));
const scarto = (s) => num(s);
const tabelleCasuali = {
  base: tabella('6.2 Base'),
  grado_pattuglia: tabella('6.3.1 Pattuglia', [['scarto', 3, scarto]]),
  grado_scontro: tabella('6.3.2 Scontro', [['scarto', 3, scarto]]),
  grado_tana: tabella('6.3.3 Tana', [['scarto', 3, scarto]]),
  difficolta: tabella('6.3.4 Difficoltà', [['fattore', 3, num]]),
  numero_moduli: tabella('6.4.1 Numero di moduli', [['numero', 3, num]]),
  tipo_modulo: tabella('6.4.2 Tipo di modulo'),
  mutazione: tabella('6.4.3 Mutazione', [['costo', 3, costo]]),
  equipaggiamento: tabella('6.4.4 Equipaggiamento', [['costo', 3, costo]]),
  corruzione: tabella('6.5.1 Livello di Corruzione', [['costo', 3, costo]]),
  manifestazione_minore: tabella('6.5.2 Manifestazione minore', [['costo', 3, costo]]),
  manifestazione_maggiore: tabella('6.5.3 Manifestazione maggiore', [['costo', 3, costo]]),
};
// gli id delle tabelle sono quelli dei dati
verifica(tabelleCasuali.base.righe.every((r) => basi[r.id]), 'tabella 6.2: basi');
verifica(tabelleCasuali.mutazione.righe.every((r) => mutazioni.some((m) => m.id === r.id)), 'tabella 6.4.3: Mutazioni');
verifica(tabelleCasuali.corruzione.righe.every((r) => corrotto.livelli.some((l) => l.id === r.id)), 'tabella 6.5.1: livelli');
verifica(tabelleCasuali.manifestazione_minore.righe.every((r) => corrotto.manifestazioni_minori.some((m) => m.id === r.id)), 'tabella 6.5.2');
verifica(tabelleCasuali.manifestazione_maggiore.righe.every((r) => corrotto.manifestazioni_maggiori.some((m) => m.id === r.id)), 'tabella 6.5.3');
verifica(tabelleCasuali.equipaggiamento.righe.every((r, i) => r.id === equipaggiamento.fasce[i].id), 'tabella 6.4.4: fasce');

const bestiario = {
  versione_manuale: 'Bestiario, proposta (bozza 0.2, docs/bestiario/bestiario.md, 02/10/2026)',
  fonte: 'Bestiario, proposta: docs/bestiario/bestiario.md, cap. 2–6 e Appendice A; lotto tools/lotti/lotto_bestiario_dati.mjs. Le tabelle si leggono dal documento; effetti dei moduli e ricette delle creature pronte dal testo dei paragrafi.',
  'TODO(Davide)': 'Bestiario proposto, in attesa di Davide: scala tarata su 7 PG, costi dei moduli, Boss, creature pronte e tabelle casuali; basi del §3.6–3.9 con le proposte su bersaglio in volo (−2 VA) e taglia Grande (+2 VA), che il Giocatore non ha (docs/bestiario/domande-per-davide.md).',
  gruppo_pg: 7,
  gradi,
  boss: { round_resistenza: 12, azp_in_piu: 1, riduzione_pv_per_ar: 0.7, paragrafo: '§2.5' },
  equilibrato: { paragrafo: '§2.3', gruppi_misti: gruppiMisti, soglie: [{ fino_a: 0.75, id: 'facile', nome: 'facile' }, { fino_a: 1.25, id: 'normale', nome: 'normale' }, { fino_a: 1.75, id: 'duro', nome: 'duro' }, { fino_a: null, id: 'mortale', nome: 'mortale' }] },
  costo_massimo: 2,
  basi,
  moduli: { corrotto, mutazioni, equipaggiamento },
  creature,
  tabelle: tabelleCasuali,
};

console.log(`${controlli} controlli superati; ${gradi.length} gradi, ${Object.keys(basi).length} basi, ${mutazioni.length} Mutazioni, ${creature.length} creature, ${Object.keys(tabelleCasuali).length} tabelle`);
if (scrivi) {
  writeFileSync(new URL('data/bestiario.json', R), `${JSON.stringify(bestiario, null, 2)}\n`);
  console.log('scritto data/bestiario.json');
}
