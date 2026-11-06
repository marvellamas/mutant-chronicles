// Le descrizioni del Bestiario proposto devono dire quello che il profilo fa davvero, grado per grado
// (lotto 177, 06/11/2026). Nasce dalla A.117: ai gradi Semplice e Medio l'Eretico corrotto non ha più i Doni,
// ma il suo testo prometteva ancora il sussurro, lo Sguardo del vuoto e la lama che passa l'acciaio.
//
// Regola: in una frase, una capacità può essere nominata solo se la possiedono tutti i profili a cui quella
// frase si riferisce. L'ambito della frase sono i gradi che nomina («Al grado Minore…», «Il Boss…»); una frase
// che non nomina nessun grado parla di tutti.
//
// Le capacità si riconoscono dai dati: i nomi delle Manifestazioni (§4.2.4) e delle Mutazioni (§4.2), più le
// parole con cui i testi narrativi alludono a una capacità senza chiamarla per nome
// (`data/bestiario.json` → `parole_capacita`). Il controllo gira in `tests/descrizioni-bestiario.test.js` e con
// `node tools/descrizioni-bestiario.mjs`: non blocca l'app, perché un testo è un testo («avvisa, non blocca»).

const B = (dati) => dati.bestiario;

/** Le capacità di un profilo, dai moduli scelti: manifestazioni, mutazioni e quelle del livello di Corruzione. */
export function capacitaProfilo(moduli, dati) {
  const corr = B(dati).moduli.corrotto;
  const s = new Set();
  for (const id of moduli?.mutazioni ?? []) s.add(`mutazione:${id}`);
  for (const id of moduli?.corrotto?.minori ?? []) s.add(id);
  for (const id of moduli?.corrotto?.maggiori ?? []) s.add(id);
  const liv = corr.livelli.find((l) => l.id === moduli?.corrotto?.livello);
  if (!liv) return s;
  s.add('corrotto');
  if ((liv.effetti?.capacita ?? []).includes('Presenza terrificante')) s.add('presenza-terrificante');
  if (liv.effetti?.attacchi_naturali === 'Magico') s.add('danno-magico');
  if (liv.effetti?.attacco_etereo) s.add('attacco-etereo');
  return s;
}

/** I profili di una creatura pronta: un grado per riga, più il Boss se la ricetta lo prevede. */
export function profiliCreatura(c, dati) {
  const out = (c.gradi ?? []).map((g) => ({
    grado: g, boss: false, capacita: capacitaProfilo(c.moduli_per_grado?.[g] ?? c.moduli, dati),
  }));
  if (c.boss) out.push({ grado: c.boss.grado, boss: true, capacita: capacitaProfilo(c.boss.moduli ?? c.moduli, dati) });
  return out;
}

/** Le parole che fanno riconoscere una capacità in un testo: il nome dai dati, più gli alias narrativi. */
export function parolePerCapacita(dati) {
  const BE = B(dati);
  const corr = BE.moduli.corrotto;
  const m = new Map();
  const aggiungi = (id, parola) => m.set(id, [...(m.get(id) ?? []), parola]);
  for (const x of [...corr.manifestazioni_minori, ...corr.manifestazioni_maggiori]) aggiungi(x.id, x.nome);
  for (const x of BE.moduli.mutazioni) aggiungi(`mutazione:${x.id}`, x.nome);
  for (const [id, parole] of Object.entries(BE.parole_capacita ?? {})) for (const p of parole) aggiungi(id, p);
  return m;
}

const FRASI = /(?<=[.;!?])\s+/;
const INCISO = /\s*\(([^()]*)\)/g;

/** I gradi nominati in un testo: [] vuol dire «vale per tutti». */
function ambito(testo, dati) {
  const gradi = B(dati).gradi.filter((g) => new RegExp(`\\b${g.nome}\\b`).test(testo)).map((g) => g.id);
  const boss = /\bBoss\b/.test(testo);
  return { gradi, boss };
}

/**
 * Una frase in parti: il corpo senza gli incisi fra parentesi e gli incisi, ciascuno con il suo ambito.
 * Un inciso aggiunge, non restringe: «Apre con l'Imboscata (il Boss anche con lo Sguardo del vuoto)» vale per
 * tutti, e la parentesi solo per il Boss. Un inciso che non nomina gradi (§3.2, A.117) segue la frase.
 */
function partiFrase(frase, dati) {
  const incisi = [...frase.matchAll(INCISO)].map((m) => ({ intero: m[0], dentro: m[1] }));
  const corpo = frase.replace(INCISO, '').replace(/\s+([,.;:!?])/g, '$1').trim();
  const ambitoCorpo = ambito(corpo, dati);
  return {
    corpo,
    ambitoCorpo,
    incisi: incisi.map((x) => {
      const a = ambito(x.dentro, dati);
      return { ...x, ambito: a.gradi.length || a.boss ? a : ambitoCorpo };
    }),
  };
}

/** Un profilo rientra nell'ambito della frase? Senza gradi nominati, ci rientrano tutti. */
function riguarda(p, { gradi, boss }) {
  if (boss && !gradi.length) return p.boss;
  if (!gradi.length) return true;
  return gradi.includes(p.grado) && (boss ? p.boss : !p.boss);
}

/**
 * Il testo di una creatura pronta per un solo profilo: tiene le frasi che riguardano quel grado e lascia fuori
 * quelle degli altri. Così la mini-scheda di un Eretico corrotto Semplice non promette i Doni del Boss (A.117).
 * @param profilo { grado, boss }
 */
export function testoPerProfilo(testo, profilo, dati) {
  if (typeof testo !== 'string' || !testo.trim()) return '';
  const tenute = [];
  for (const frase of testo.split(FRASI)) {
    const p = partiFrase(frase, dati);
    if (!riguarda(profilo, p.ambitoCorpo)) continue;
    let fuori = frase;
    for (const x of p.incisi) if (!riguarda(profilo, x.ambito)) fuori = fuori.replace(x.intero, '');
    tenute.push(fuori.replace(/\s+([,.;:!?])/g, '$1').trim());
  }
  return tenute.join(' ').trim().replace(/;$/, '.');
}

/** Descrizione e comportamento di una creatura pronta per un grado: `{ descrizione, comportamento }`. */
export function testiCreatura(c, profilo, dati) {
  return {
    descrizione: testoPerProfilo(c?.descrizione, profilo, dati),
    comportamento: testoPerProfilo(c?.comportamento, profilo, dati),
  };
}

/** Il nome del profilo, per gli avvisi: «Semplice», «Boss Medio». */
export const nomeProfilo = (p, dati) => `${p.boss ? 'Boss ' : ''}${B(dati).gradi.find((g) => g.id === p.grado)?.nome ?? p.grado}`;

/**
 * I testi che promettono una capacità a un profilo che non ce l'ha.
 * @returns [{ creatura, campo, frase, capacita, parola, mancano: ['Semplice', 'Medio'] }]
 */
export function promesseNonMantenute(dati, { creature = null } = {}) {
  const parole = parolePerCapacita(dati);
  const fuori = [];
  for (const c of creature ?? B(dati).creature) {
    const profili = profiliCreatura(c, dati);
    if (!profili.length) continue;
    for (const campo of ['descrizione', 'comportamento']) {
      const testo = c[campo];
      if (typeof testo !== 'string') continue;
      for (const frase of testo.split(FRASI)) {
        const p = partiFrase(frase, dati);
        // il corpo della frase e ogni inciso si controllano con il proprio ambito
        for (const [pezzo, amb] of [[p.corpo, p.ambitoCorpo], ...p.incisi.map((x) => [x.dentro, x.ambito])]) {
          const riguardati = profili.filter((x) => riguarda(x, amb));
          for (const [id, lista] of parole) {
            const parola = lista.find((x) => pezzo.includes(x));
            if (!parola) continue;
            const mancano = riguardati.filter((x) => !x.capacita.has(id));
            if (mancano.length) {
              fuori.push({ creatura: c.id, campo, frase: frase.trim(), capacita: id, parola, mancano: mancano.map((x) => nomeProfilo(x, dati)) });
            }
          }
        }
      }
    }
  }
  return fuori;
}

/** La riga da leggere di un problema, per il test e per lo strumento. */
export const descriviPromessa = (p) => `${p.creatura} (${p.campo}): «${p.parola}» promette ${p.capacita}, che manca a ${p.mancano.join(', ')} — «${p.frase}»`;
