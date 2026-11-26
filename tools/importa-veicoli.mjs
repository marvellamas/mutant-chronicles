// Lettore del Manuale dei Veicoli (lotto 213, 17/11/2026): i numeri di scheda di ogni mezzo, confrontati col profilo del catalogo.
//
// Le lezioni dei lotti 204–212, nel codice:
//  - le intestazioni delle tabelle si **censiscono** (`censimento`), non si indovinano; le etichette di riga che non conosciamo vanno nel
//    referto come «non lette», mai come «zero»;
//  - **la rete**: si prova prima sull'edizione da cui i dati vengono (la 0.10), poi sulla corrente (la 0.19): ogni scarto sulla 0.10 è un
//    difetto del lettore o un dato rimasto indietro, mai una differenza della 0.19;
//  - **il profilo non è il record**: questo strumento legge e confronta il **profilo** del catalogo (`data/veicoli.json`). Non guarda mai
//    i record del registro (`veicoli/`), che hanno le loro Integrità, munizioni e riserve consumate (`tests/veicoli-record-213.test.js`);
//  - una lettura parziale non si scrive mai sopra un valore buono: un campo che il manuale non dà per intero è «non letto».
//
//   node tools/importa-veicoli.mjs [--file=<testo.md>]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { testoManuale } from './manuali.mjs';
import { leggiTabelle as leggiTabelleGrezze, censimentoIntestazioni, numeroDi, chiave } from './importa-equipaggiamento.mjs';
import { eTestoSemplice, tabelleTesto, capitoloTesto, righeTesto, censiteNonViste, INTESTAZIONI_VEICOLI } from './tabelle-testo.mjs';

export { censimentoIntestazioni };

/**
 * Le tabelle, con una correzione che la 0.10 ha reso necessaria (la rete sulla 0.10 leggeva **zero tabelle**): l'esportazione del Doc scrive a volte
 * una riga di intestazione **vuota** (`|  |  |`) e mette la vera intestazione, in grassetto, nella prima riga. Se tutte le colonne sono vuote la
 * prima riga di dati è l'intestazione.
 */
export function leggiTabelle(testo) {
  // Lotto 236: **due forme, due strade.** Un Doc esportato in Markdown ha le tabelle con le barre; uno esportato in
  // testo semplice ha una cella per riga, con la tabulazione, e nessuna barra. Il Manuale dei Veicoli si legge solo
  // in testo semplice, perché l'esportazione in Markdown impacchetta le immagini e Drive la rifiuta (67 MB).
  // Per il resto il lettore non cambia: le tabelle gli arrivano nella stessa forma `{ colonne, righe, riga }`.
  if (eTestoSemplice(testo)) return tabelleTesto(testo).tabelle;
  return leggiTabelleGrezze(testo).map((t) => (t.colonne.every((c) => c === '') && t.righe.length
    ? { ...t, colonne: t.righe[0], righe: t.righe.slice(1) } : t));
}

/** Il referto di quello che NON si è letto: le coppie spaiate e le intestazioni non censite (vuoto nel Markdown). */
export function refertoForma(testo) {
  if (!eTestoSemplice(testo)) return { forma: 'Markdown', spaiate: [], nonRiconosciute: [], censiteNonViste: [] };
  const r = tabelleTesto(testo);
  return { forma: 'testo semplice', spaiate: r.spaiate, nonRiconosciute: r.nonRiconosciute, censiteNonViste: censiteNonViste(testo, INTESTAZIONI_VEICOLI) };
}

/** Il capitolo → il profilo del catalogo. I capitoli 14 e 15 (astronavi) non hanno un profilo: sono dichiarati in `veicoli.json → fuori_catalogo`. */
export const CAPITOLO_PROFILO = { 9: 'autovettura-civile', 10: 'asa-scout-mk4', 11: 'neverlost', 12: 'motocicletta-civile', 13: 'furgone-civile' };
export const CAPITOLI_FUORI_CATALOGO = [14, 15];

/** Il capitolo (`# N …`) in cui sta una riga del testo. */
function capitoloDi(righe, riga) {
  for (let i = riga - 1; i >= 0; i--) {
    const m = /^# \*\*(\d+) /.exec(righe[i]); if (m) return Number(m[1]);
    // la 0.10 non numera la Neverlost: il suo titolo è «# **Neverlost…» (capitolo 11 dalla 0.19)
    if (/^# \*\*Neverlost/.test(righe[i])) return 11;
  }
  // nel testo semplice non ci sono i cancelletti né il grassetto: il titolo si riconosce dalla sua **numerazione**
  return capitoloTesto(righe, riga);
}

/** «30 Q / 0» → { mov: 30, man: 0 }; «40 Q; MAN 0» idem; «MAN −1» col segno vero. */
const segno = (s) => Number(String(s).replace(/[−–—]/g, '-').replace(/\+/g, ''));
function movMan(v) {
  const m = /(\d+)\s*Q\s*(?:\/|;)\s*(?:MAN\s*)?([−–+-]?\d+)/.exec(v);
  return m ? { mov: Number(m[1]), man: segno(m[2]) } : null;
}
const tre = (v) => { const m = /(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/.exec(v); return m ? { corpo: Number(m[1]), propulsione: Number(m[2]), motore: Number(m[3]) } : null; };

/**
 * Le schede: { [capitolo]: { campi, nonLette } }, dai soli capitoli 9–13. I campi letti sono quelli per cui il manuale ha un'etichetta
 * di riga nota; le altre etichette (equipaggio, dimensioni, autonomia…) finiscono in `nonLette` per capitolo.
 */
export function leggiSchede(testo) {
  const righe = righeTesto(testo);
  const out = {};
  const scheda = (c) => (out[c] ??= { campi: {}, nonLette: new Set() });
  for (const t of leggiTabelle(testo)) {
    const c = capitoloDi(righe, t.riga);
    if (!c || c < 9 || c > 13) continue;
    const s = scheda(c);
    const h = t.colonne.join('|');
    // coppie etichetta/valore: le tabelle a due colonne e quella a quattro (Scout: due coppie per riga)
    const coppie = [];
    if (/^(Caratteristica|Dato|Voce|Risorsa o dato|Risorsa)\|/.test(h) && !/PI massimi/.test(h)) {
      for (const r of t.righe) { coppie.push([r[0], r[1]]); if (t.colonne.length === 4) coppie.push([r[2], r[3]]); }
    }
    for (const [et, v] of coppie) {
      const e = chiave(et);
      let letto = true;
      if (/^mov( e| \/) man$/.test(e)) Object.assign(s.campi, movMan(v) ?? {});
      else if (/^(corpo|pi corpo) \/ propulsione \/ motore$/.test(e) && /PI/.test(v) && !/_/.test(v)) s.campi.pi = tre(v);
      else if (/^(corpo|pi corpo) \/ propulsione \/ motore$/.test(e)) letto = false; // la riga «attuale» della scheda da stampare: non è un dato
      else if (/^(ar|protezioni( strutturali)?)(\s*\/\s*ar magica)?$/.test(e)) {
        const m = /(?:AR\s*)?(\d+)\s*(?:\/|;)\s*(?:AR magica|componente magica)?\s*(\d+)/.exec(v);
        if (m) { s.campi.ar = Number(m[1]); s.campi.ar_magica = Number(m[2]); }
        const co = /Corazzato\s*(\d)/.exec(v); if (co) s.campi.corazzato = Number(co[1]);
      } else if (e === 'corazzato') s.campi.corazzato = numeroDi(v);
      else if (/^qualità( e| \/) ps integrità$/.test(e)) { const m = /^([^;/]+?)\s*(?:;|\/)\s*(?:PS\s*)?(\d+)/.exec(v); if (m) { s.campi.qualita = m[1].trim(); s.campi.ps_integrita = Number(m[2]); } }
      else if (/^carico utile( totale)?$/.test(e)) { const m = /^([\d.]+)\s*(kg|t)\b/.exec(v); if (m) s.campi.carico_kg = numeroDi(m[1]) * (m[2] === 't' ? 1000 : 1); }
      else if (/^prezzo( completo)?$/.test(e)) { const m = /^([\d.]+)\s*cr/.exec(v); if (m) s.campi.prezzo_cr = numeroDi(m[1]); }
      else if (e === 'rep' || e === 'reperibilità') s.campi.rep = v;
      else if (e === 'scudo energetico') { const m = /^(\d+)\s*ScE/.exec(v); if (m) s.campi.sce = Number(m[1]); }
      else if (e === 'riserva rossa / blu / verde') { const m = /^(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/.exec(v); if (m) s.campi.riserve = { rosso: Number(m[1]), blu: Number(m[2]), verde: Number(m[3]) }; }
      else if (e === 'circuito bianco') { const m = /^(\d+)\s*PM/.exec(v); if (m) s.campi.circuito_pm = Number(m[1]); }
      else letto = false;
      if (!letto) s.nonLette.add(et);
    }
    // PI massimi, ricambi (cr per PI)
    if (/PI massimi/.test(h) && /^Struttura\|/.test(h)) {
      const iPi = t.colonne.findIndex((x) => /PI massimi/i.test(x));
      const iCr = t.colonne.findIndex((x) => /(cr|ricambi) per PI/i.test(x));
      const pi = {}, cr = {};
      for (const r of t.righe) {
        const k = /^corpo/i.test(r[0]) ? 'corpo' : /^propulsione/i.test(r[0]) ? 'propulsione' : /^motore/i.test(r[0]) ? 'motore' : null;
        if (!k) continue;
        pi[k] = numeroDi(r[iPi]);
        if (iCr >= 0) cr[k] = numeroDi(String(r[iCr]).replace(/\s*cr\s*$/i, ''));
      }
      if (Object.values(pi).every((x) => Number.isFinite(x)) && Object.keys(pi).length === 3) s.campi.pi_tabella = pi;
      if (Object.keys(cr).length === 3 && Object.values(cr).every((x) => Number.isFinite(x))) s.campi.ricambi = cr;
    }
  }
  for (const c of Object.keys(out)) out[c].nonLette = [...out[c].nonLette];
  return out;
}

/** I profili del catalogo → i valori comparabili, con le stesse chiavi dei campi letti. */
export function valoriProfilo(p) {
  return {
    mov: p.mov_q, man: p.man, pi: p.pi, ar: p.ar?.totale, ar_magica: p.ar?.magica, corazzato: p.corazzato === true ? 1 : p.corazzato === false ? 0 : p.corazzato,
    qualita: p.qualita, ps_integrita: p.ps_integrita, carico_kg: p.carico_kg, prezzo_cr: p.prezzo_cr, ricambi: p.ricambi_cr_per_pi,
  };
}

/**
 * Il confronto: per ogni capitolo con un profilo, gli scarti sui campi **letti**; i campi che il manuale ha e il profilo no (o viceversa)
 * non sono scarti ma «solo da una parte». Torna { scarti, letti, soloManuale, capitoliSenzaProfilo }.
 */
export function confronta(schede, profili) {
  const scarti = []; const letti = {}; const soloManuale = [];
  for (const [cap, id] of Object.entries(CAPITOLO_PROFILO)) {
    const s = schede[cap]; const p = profili.find((x) => x.id === id);
    if (!s) continue;
    if (!p) { soloManuale.push(`${cap}: ${id} non è nel catalogo`); continue; }
    const v = valoriProfilo(p);
    letti[id] = Object.keys(s.campi).length;
    const confr = (campo, a, b) => { if (a === undefined || a === null || b === undefined || b === null) return; if (JSON.stringify(a) !== JSON.stringify(b)) scarti.push({ id, campo, manuale: a, dato: b }); };
    const c = s.campi;
    for (const k of ['mov', 'man', 'ar', 'ar_magica', 'corazzato', 'ps_integrita', 'carico_kg', 'prezzo_cr']) confr(k, c[k], v[k]);
    if (c.qualita !== undefined && v.qualita) confr('qualita', chiave(c.qualita), chiave(v.qualita));
    confr('pi', c.pi, v.pi); confr('pi_tabella', c.pi_tabella, v.pi); confr('ricambi', c.ricambi, v.ricambi);
  }
  return { scarti, letti, soloManuale };
}

const DIRETTO = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (DIRETTO) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  const testo = arg('file') ? readFileSync(arg('file'), 'utf8') : testoManuale('veicoli');
  const tab = leggiTabelle(testo);
  const dati = JSON.parse(readFileSync(new URL('../data/veicoli.json', import.meta.url), 'utf8'));
  const sch = leggiSchede(testo);
  const c = confronta(sch, dati.profili);
  const rf = refertoForma(testo);
  console.log(`forma: ${rf.forma}`);
  console.log(`tabelle ${tab.length}, intestazioni distinte ${Object.keys(censimentoIntestazioni(tab)).length}, schede lette ${Object.keys(sch).join(',')}`);
  if (rf.forma === 'testo semplice') {
    console.log(`  coppie spaiate: ${rf.spaiate.length}${rf.spaiate.length ? ' (dichiarate, non riempite per deduzione)' : ''} · intestazioni non censite: ${rf.nonRiconosciute.length} · censite che non si vedono: ${rf.censiteNonViste.length}`);
    for (const x of rf.spaiate) console.log(`    spaiata alla riga ${x.riga} (${x.colonne} colonne): ${JSON.stringify(x.celle).slice(0, 120)}`);
  }
  console.log('campi letti per profilo:', JSON.stringify(c.letti), '| scarti:', c.scarti.length);
  for (const s of c.scarti) console.log(`  ${s.id}.${s.campo}: manuale ${JSON.stringify(s.manuale)} · dato ${JSON.stringify(s.dato)}`);
  for (const [cap, s] of Object.entries(sch)) console.log(`  non lette cap ${cap}: ${s.nonLette.join('; ').slice(0, 200)}`);
}
