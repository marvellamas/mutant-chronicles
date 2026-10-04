// Verifica che le frasi del manuale copiate nei dati esistano davvero nel testo dei Google Doc
// (docs/manuali-txt/*.md): effetti degli oggetti («condizione») e regole dell'attacco a distanza
// (regole.json → attacco_distanza, «frasi»).
// Uso:  node tools/verifica_frasi.mjs     → elenca le frasi non trovate ed esce con codice 1
// Lo usa anche tests/effetti-oggetti.test.js.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RADICE = new URL('../', import.meta.url);

/** Testo confrontabile: senza escape e grassetti del Markdown esportato, spazi compattati. */
export const normalizza = (t) => String(t).replace(/\\/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();

/** Testo dei manuali, normalizzato. */
export function testoManuali() {
  const cartella = new URL('docs/manuali-txt/', RADICE);
  return readdirSync(cartella).filter((f) => f.endsWith('.md'))
    .map((f) => normalizza(readFileSync(new URL(f, cartella), 'utf8'))).join('\n');
}

/**
 * Frasi degli effetti: catalogo (data/equipaggiamento/) e oggetti di dotazione (data/dotazioni.json).
 * @returns {{dove: string, frase: string}[]}
 */
export function frasiEffetti() {
  const leggi = (p) => JSON.parse(readFileSync(new URL(p, RADICE), 'utf8'));
  const out = [];
  const indice = leggi('data/equipaggiamento/index.json');
  for (const { id, file } of indice.file) {
    for (const o of leggi(`data/equipaggiamento/${file}`).oggetti ?? []) {
      (o.effetti ?? []).forEach((e, i) => { if (e.condizione) out.push({ dove: `${id}:${o.id} effetti[${i}]`, frase: e.condizione }); });
    }
  }
  for (const [id, o] of Object.entries(leggi('data/dotazioni.json').oggetti_dotazione)) {
    (o.effetti ?? []).forEach((e, i) => { if (e.condizione) out.push({ dove: `dotazioni:${id} effetti[${i}]`, frase: e.condizione }); });
  }
  // Talenti Liberi e di Classe: effetti.valori (docs/censimento-talenti.md)
  for (const t of leggi('data/talenti_liberi.json').talenti) {
    (t.effetti?.valori ?? []).forEach((e, i) => { for (const k of ['condizione', 'nota']) if (e[k]) out.push({ dove: `talenti_liberi:${t.id} effetti.valori[${i}].${k}`, frase: e[k] }); });
  }
  for (const c of leggi('data/classi.json').classi) {
    for (const t of [...c.talenti_fissi, ...c.talenti_a_scelta]) {
      (t.effetti?.valori ?? []).forEach((e, i) => { for (const k of ['condizione', 'nota']) if (e[k]) out.push({ dove: `classi:${c.nome}/${t.nome} effetti.valori[${i}].${k}`, frase: e[k] }); });
    }
  }
  // Tecniche Interiori: effetti delle schede (tools/effetti_tecniche.mjs), frasi copiate dal §8.9
  for (const t of leggi('data/tecniche_interiori.json').tecniche) {
    const E = t.effetti ?? {};
    (E.valori ?? []).forEach((e, i) => { if (e.condizione) out.push({ dove: `tecniche:${t.id} effetti.valori[${i}]`, frase: e.condizione }); });
    for (const k of ['promemoria', 'frasi']) (E[k] ?? []).forEach((f, i) => out.push({ dove: `tecniche:${t.id} effetti.${k}[${i}]`, frase: f }));
    const A = E.attacco ?? {};
    (A.frasi ?? []).forEach((f, i) => out.push({ dove: `tecniche:${t.id} effetti.attacco.frasi[${i}]`, frase: f }));
    (A.dopo_armatura ?? []).forEach((x, i) => out.push({ dove: `tecniche:${t.id} effetti.attacco.dopo_armatura[${i}]`, frase: x.testo }));
    (A.onda?.frasi ?? []).forEach((f, i) => out.push({ dove: `tecniche:${t.id} effetti.attacco.onda.frasi[${i}]`, frase: f }));
    for (const k of ['manovre_forza', 'carica']) if (A[k]?.frase) out.push({ dove: `tecniche:${t.id} effetti.attacco.${k}`, frase: A[k].frase });
  }
  // regole.json → attacco_distanza: ogni «frasi» del blocco, a ogni profondità
  const visita = (v, dove) => {
    if (Array.isArray(v)) v.forEach((x, i) => visita(x, `${dove}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'frasi' && Array.isArray(x)) x.forEach((f, i) => out.push({ dove: `${dove}.frasi[${i}]`, frase: f }));
        else visita(x, `${dove}.${k}`);
      }
    }
  };
  visita(leggi('data/regole.json').attacco_distanza ?? {}, 'regole:attacco_distanza');
  // Magia §26.2: riserve Batteria/Cariche e alimentazione Esclusiva/Universale (frasi e testi delle tabelle)
  const RIS = leggi('data/regole.json').chroma?.riserve ?? {};
  visita(RIS, 'regole:chroma.riserve');
  // Magia §26.3–26.5: Batterie Matrice, Cristalli Matrice, Schegge instabili
  for (const k of ['matrice', 'cristalli_matrice', 'schegge']) visita(leggi('data/regole.json').chroma?.[k] ?? {}, `regole:chroma.${k}`);
  for (const g of ['tipi', 'alimentazioni']) for (const [k, x] of Object.entries(RIS[g] ?? {})) if (x.testo) out.push({ dove: `regole:chroma.riserve.${g}.${k}`, frase: x.testo });
  visita(leggi('data/regole.json').lancio ?? {}, 'regole:lancio');
  visita(leggi('data/regole.json').rituali ?? {}, 'regole:rituali');
  visita(leggi('data/regole.json').danno_applicato ?? {}, 'regole:danno_applicato');
  visita(leggi('data/regole.json').prova ?? {}, 'regole:prova');
  visita(leggi('data/regole.json').attacco_ravvicinato ?? {}, 'regole:attacco_ravvicinato');
  visita(leggi('data/regole.json').elmetti ?? {}, 'regole:elmetti');
  visita(leggi('data/regole.json').dotazioni_iniziali ?? {}, 'regole:dotazioni_iniziali');
  visita(leggi('data/regole.json').nec ?? {}, 'regole:nec');
  // durate in Round (Tecniche, Stati, Incantesimi) e Round collegato allo scontro (src/round-scontro.js)
  visita(leggi('data/regole.json').durate_round ?? {}, 'regole:durate_round');
  (leggi('data/regole.json').ar?.frasi_incantesimi ?? []).forEach((f, i) => out.push({ dove: `regole:ar.frasi_incantesimi[${i}]`, frase: f }));
  // Armamenti §7.10: SnT 0 per gli Artefatti con sole proprietà passive (docs/diff-manuali-2026-10-02.md)
  visita(leggi('data/equipaggiamento/artefatti.json').sintonizzazione ?? {}, 'artefatti:sintonizzazione');
  // veicoli.json: ogni «frasi» del file, a ogni profondità, più i testi degli esempi del manuale
  visita(leggi('data/veicoli.json'), 'veicoli');
  for (const v of leggi('data/veicoli.json').profili ?? []) {
    for (const r of v.rinforzi ?? []) if (r.esempio?.testo) out.push({ dove: `veicoli:${v.id} rinforzi ${r.id} esempio`, frase: r.esempio.testo });
  }
  // regole.json → stati: la «condizione» degli effetti e il testo dei limiti (docs/ricognizione-stati.md)
  for (const s of leggi('data/regole.json').stati?.elenco ?? []) {
    (s.effetti ?? []).forEach((e, i) => out.push({ dove: `regole:stati ${s.nome} effetti[${i}]`, frase: e.condizione }));
    if (s.limiti?.testo) out.push({ dove: `regole:stati ${s.nome} limiti`, frase: s.limiti.testo });
  }
  // incantesimi.json → meccanica: la riga «Lancio:», la Salvezza, il paragrafo «Anticipazione:» e le frasi delle correzioni
  for (const i of leggi('data/incantesimi.json').incantesimi) {
    const m = i.meccanica ?? {};
    const dove = `incantesimi:${i.scheda} ${i.nome}`;
    if (i.lancio) out.push({ dove: `${dove} lancio`, frase: i.lancio });
    if (m.salvezza?.testo) out.push({ dove: `${dove} salvezza`, frase: m.salvezza.testo });
    if (m.anticipazione?.frase) out.push({ dove: `${dove} anticipazione`, frase: m.anticipazione.frase });
    // conseguenze legate a un aspetto (tools/scale_anticipazione.mjs): frasi del paragrafo, una per una
    (m.anticipazione?.aspetti ?? []).forEach((x, k) => (x.conseguenze ?? []).forEach((f, j) => out.push({ dove: `${dove} anticipazione.aspetti[${k}].conseguenze[${j}]`, frase: f })));
    (m.frasi ?? []).forEach((f, k) => out.push({ dove: `${dove} frasi[${k}]`, frase: f }));
    // Magia §25.4: attivazione da Artefatto
    (m.procedura_rituale?.artefatto?.frasi ?? []).forEach((f, k) => out.push({ dove: `${dove} procedura_rituale.artefatto.frasi[${k}]`, frase: f }));
  }
  return out;
}

/** Frasi che non compaiono nei manuali. */
export function frasiMancanti() {
  const testo = testoManuali();
  return frasiEffetti().filter((x) => !testo.includes(normalizza(x.frase)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tutte = frasiEffetti();
  const mancanti = frasiMancanti();
  for (const m of mancanti) console.log(`NON TROVATA  ${m.dove}\n  «${m.frase}»`);
  console.log(`${tutte.length - mancanti.length} frasi su ${tutte.length} trovate nei manuali.`);
  process.exitCode = mancanti.length ? 1 : 0;
}
