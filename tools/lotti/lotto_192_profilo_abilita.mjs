// Lotto 192 (13/11/2026): il profilo delle Abilità 4/7/9/4 del Manuale del Giocatore 0.62 nei dati.
//
//   node tools/lotti/lotto_192_profilo_abilita.mjs            dice che cosa cambierebbe
//   node tools/lotti/lotto_192_profilo_abilita.mjs --scrivi   scrive data/regole.json e data/classi.json
//
// Che cosa cambia, dal manuale:
//   - §2.3: il profilo passa da 2 Specializzate / 6 Professionali / 12 Generiche / 4 Non competenti a **4/7/9/4**,
//     e i punti base da 122 a 127 (le basi 7/6/5/3 non cambiano: 4×7 + 7×6 + 9×5 + 4×3 = 127);
//   - §8.3: i limiti del VA personale si distanziano di 2 — S 12…22 invariata, P 10…20, G 8…18, N 6…16, cioè
//     +1 a ogni Grado per P, G e N. Nelle formule del §8.7 (S = 10 + G + gS, P = 8 + G + gP, G = 6 + 2G,
//     N = 4 + 2G) cambia soltanto il termine `fisso`: P 7→8, G 5→6, N 3→4; S resta 10;
//   - §8.10 e Capitolo 3: tutti e venticinque i profili di Classe sono riscritti.
//
// I profili si **rileggono dal manuale**, non si ricavano per differenza da quelli vecchi: il manuale li ha
// riscritti tutti, e una differenza calcolata su venticinque elenchi è un errore che non si vede. L'appaiamento
// Classe ↔ profilo è **per posizione** (nel manuale escono nell'ordine delle Classi del Capitolo 3, lo stesso di
// `data/classi.json`) con l'assertivo che il titolo che precede ogni profilo contenga il nome di quella Classe:
// i titoli portano code («Artigliere — Talenti», «3.5.6 Soldato») e un `match` sul nome da solo ne perdeva cinque.
//
// Il profilo di prima **non si butta**: resta in `classi[].competenze_precedenti` e in
// `regole.competenze.precedente`, perché una scheda conserva le scelte e ricalcola i valori. Un personaggio
// salvato prima di oggi usa il profilo di prima finché non dichiara il nuovo (`scelte.regimeAbilita = 2`, il
// cancello del lotto C): senza quella riga la sua scheda non cambia di un punto.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RADICE, righeManuale, versioneManuale } from '../manuali.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

const CAT = { Specializzate: 'S', Professionali: 'P', Generiche: 'G', 'Non competenti': 'N' };

/** I limiti del §8.3 del Giocatore 0.62, per Grado I–VI: servono a controllare le formule, non a sostituirle. */
export const LIMITI_083 = {
  S: [12, 14, 16, 18, 20, 22],
  P: [10, 12, 14, 16, 18, 20],
  G: [8, 10, 12, 14, 16, 18],
  N: [6, 8, 10, 12, 14, 16],
};

/** I nuovi `fisso` del §8.7: S = 10 + G + gS, P = 8 + G + gP, G = 6 + 2G, N = 4 + 2G. */
export const FISSO = { S: 10, P: 8, G: 6, N: 4 };

/**
 * I venticinque profili del manuale, nell'ordine in cui escono, con il titolo che li precede.
 * @returns [{ titolo, S: [...], P: [...], G: [...], N: [...] }]
 */
export function profiliDalManuale(id = 'giocatore') {
  const righe = righeManuale(id);
  const out = [];
  let titolo = null;
  let corrente = null;
  righe.forEach((r) => {
    const t = r.trim();
    const h = /^(\d+(?:\.\d+)*\s+)?([A-ZÀ-Ù][^|]{2,60})$/.exec(t);
    if (h && !/[:.]$/.test(t)) titolo = t;
    const m = /^(Specializzate|Professionali|Generiche|Non competenti) \(([SPGN]), base (\d)\): (.+?)\.?$/.exec(t);
    if (!m) return;
    const cat = CAT[m[1]];
    const lista = m[4].split(',').map((x) => x.trim()).filter(Boolean);
    if (cat === 'S') { corrente = { titolo, S: lista }; out.push(corrente); } else if (corrente) corrente[cat] = lista;
  });
  return out;
}

/** Il numero di Abilità per categoria che il manuale dichiara, letto dalle sue stesse righe. */
export function conteggiDalManuale(profili) {
  const visti = new Set(profili.map((p) => ['S', 'P', 'G', 'N'].map((k) => (p[k] ?? []).length).join('/')));
  if (visti.size !== 1) throw new Error(`il manuale dichiara profili di misure diverse: ${[...visti].join(' · ')}`);
  const [S, P, G, N] = [...visti][0].split('/').map(Number);
  return { S, P, G, N };
}

/** I profili appaiati alle Classi di `data/classi.json`, per posizione, con il controllo sul titolo. */
export function profiliPerClasse(classi, profili) {
  if (profili.length !== classi.length) throw new Error(`profili nel manuale ${profili.length}, Classi in data/classi.json ${classi.length}`);
  const out = new Map();
  classi.forEach((c, i) => {
    const p = profili[i];
    if (!p.titolo || !p.titolo.includes(c.nome)) throw new Error(`profilo ${i + 1}: il titolo «${p.titolo ?? '(nessuno)'}» non contiene «${c.nome}»`);
    out.set(c.nome, { S: p.S, P: p.P, G: p.G, N: p.N });
  });
  return out;
}

const uguali = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_192_profilo_abilita.mjs'], 'lotto_192_profilo_abilita.mjs');
  const scrivi = argv.includes('--scrivi');
  const edizione = versioneManuale('giocatore');

  const fRegole = join(RADICE, 'data', 'regole.json');
  const fClassi = join(RADICE, 'data', 'classi.json');
  const regole = JSON.parse(readFileSync(fRegole, 'utf8'));
  const classi = JSON.parse(readFileSync(fClassi, 'utf8'));

  const profili = profiliDalManuale();
  const conteggi = conteggiDalManuale(profili);
  const perClasse = profiliPerClasse(classi.classi, profili);
  console.log(`Manuale del Giocatore ${edizione}: ${profili.length} profili, ${Object.entries(conteggi).map(([k, n]) => `${k} ${n}`).join(' / ')}.`);

  // --- regole.json → competenze ------------------------------------------------------------------------------
  const C = regole.competenze.categorie;
  const prima = {
    categorie: Object.fromEntries(Object.entries(C).map(([k, c]) => [k, { numero: c.numero, limite: { ...c.limite } }])),
    punti_base_totali: regole.competenze.punti_base_totali,
  };
  const cambi = [];
  for (const k of Object.keys(C)) {
    if (C[k].numero !== conteggi[k]) cambi.push(`regole: ${C[k].nome} numero ${C[k].numero} → ${conteggi[k]}`);
    if (C[k].limite.fisso !== FISSO[k]) cambi.push(`regole: ${C[k].nome} limite.fisso ${C[k].limite.fisso} → ${FISSO[k]}`);
  }
  const totale = Object.keys(C).reduce((s, k) => s + conteggi[k] * C[k].base, 0);
  if (regole.competenze.punti_base_totali !== totale) cambi.push(`regole: punti_base_totali ${regole.competenze.punti_base_totali} → ${totale}`);

  // --- classi.json → competenze ------------------------------------------------------------------------------
  let riscritte = 0;
  for (const c of classi.classi) {
    const nuovo = perClasse.get(c.nome);
    if (!uguali(c.competenze, nuovo)) riscritte += 1;
  }
  console.log(`${cambi.length} cambi in regole.json, ${riscritte} profili di Classe diversi da quelli in cartella.`);
  for (const x of cambi) console.log(`  ${x}`);

  // il controllo che conta: le formule devono dare la tabella del §8.3 con una sola Classe
  for (const k of Object.keys(C)) {
    for (let g = 1; g <= 6; g += 1) {
      const L = { ...C[k].limite, fisso: FISSO[k] };
      const v = L.fisso + L.per_grado_totale * g + L.per_grado_categoria * g;
      if (v !== LIMITI_083[k][g - 1]) throw new Error(`${C[k].nome} al Grado ${g}: la formula dà ${v}, il §8.3 dice ${LIMITI_083[k][g - 1]}`);
    }
  }
  console.log('Le formule del §8.7 danno esattamente la tabella del §8.3 per tutte e quattro le categorie, Gradi I–VI.');

  if (!scrivi) { console.log('\nNiente scritto. Con --scrivi si applica.'); process.exit(0); }

  for (const k of Object.keys(C)) {
    C[k].numero = conteggi[k];
    C[k].limite.fisso = FISSO[k];
  }
  regole.competenze.punti_base_totali = totale;
  regole.competenze.paragrafo = `Giocatore §§1.2.1, 2.3, 2.12, 2.13, 4.2, 8.3, 8.3.1, 8.7 (${edizione})`;
  regole.competenze.precedente = {
    ...prima,
    fino_a: 'Giocatore 0.54',
    _nota: 'Il profilo 2/6/12/4 e i limiti di prima (S 10 + 2g, P 7 + 2g, G 5 + 2g, N 3 + 2g, 122 punti base). Lo usa ogni personaggio salvato prima del lotto 192 che non ha dichiarato il profilo nuovo (scelte.regimeAbilita = 2): una scheda conserva le scelte e ricalcola i valori, quindi cambiare le categorie cambierebbe il VA di chi è già salvato. Lo adeguerà il lotto C, al tavolo, insieme al giocatore (§8.3.1).',
  };

  for (const c of classi.classi) c.competenze_precedenti = c.competenze;
  for (const c of classi.classi) {
    const nuovo = perClasse.get(c.nome);
    // l'ordine delle chiavi resta S, P, G, N, e `competenze` resta dove era nella voce
    c.competenze = { S: nuovo.S, P: nuovo.P, G: nuovo.G, N: nuovo.N };
  }
  classi.versione_manuale = `Giocatore ${edizione} (Google Doc del 12/11/2026)`;
  classi._nota_competenze = 'Lotto 192: `competenze` è il profilo 4/7/9/4 del Giocatore 0.62 (§8.10), `competenze_precedenti` il 2/6/12/4 di prima. Quale dei due vale per un personaggio lo decide un posto solo: `profiloCompetenze` di src/competenze.js, dal contrassegno scelte.regimeAbilita.';

  writeFileSync(fRegole, `${JSON.stringify(regole, null, 2)}\n`);
  writeFileSync(fClassi, `${JSON.stringify(classi, null, 2)}\n`);
  console.log('\nScritti data/regole.json e data/classi.json.');
}
