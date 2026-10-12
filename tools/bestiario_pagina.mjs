// Bestiario online: una pagina sola, costruita dai dati del repo, con i valori come li mostra la plancia.
//   node tools/bestiario_pagina.mjs            → scrive docs/bestiario/bestiario-online.html
//   node tools/bestiario_pagina.mjs --controlla → dice se la pagina è vecchia rispetto ai dati (esce 1)
//
// Fonti, e soltanto queste (nessun dato privato: le cartelle reali del server non si leggono mai):
// - data/*.json, caricati e validati dallo stesso caricatore dell'app (src/rules.js → caricaDati);
// - data/bestiario.json → creature pronte (cap. 5) e basi (cap. 3), con i profili calcolati da
//   src/crea-nemico.js, lo stesso motore di «Crea nemico» del Tavolo del Master;
// - esempi/nemici/ ed esempi/nemici/umani/ → i nemici prestabiliti tracciati in git.
//
// La pagina è un file solo, senza risorse esterne e senza data di generazione: così è deterministica e
// tests/bestiario-pagina.test.js può accorgersi quando i dati cambiano e la pagina no (CLAUDE.md,
// «Regole permanenti di lavoro»).
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { testoMovimento } from '../src/nemici.js';
import { profiloNemico, scelteCreatura, SUFFISSO_UMANO } from '../src/crea-nemico.js';

const RADICE = new URL('../', import.meta.url);
export const FILE_PAGINA = 'docs/bestiario/bestiario-online.html';

/** Cartelle reali del server e dei PG: la pagina non ne legge nessuna (CLAUDE.md). */
export const CARTELLE_VIETATE = ['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe',
  'musica', 'galleria', 'salvataggi', 'autosave', 'backup-master', 'PersonaggiBackup'];

// --- dati -------------------------------------------------------------------------------------------------

/** Carica data/*.json con lo stesso caricatore dell'app. */
export async function dati(radice = RADICE) {
  const { dati: d, errori } = await caricaDati((nome) => readFile(new URL(`data/${nome}.json`, radice), 'utf8'));
  if (errori.length) throw new Error(`dati non validi: ${errori.map((e) => `${e.file} ${e.chiave}: ${e.problema}`).join('; ')}`);
  return d;
}

/** I nemici prestabiliti tracciati in git: esempi/nemici/*.json e esempi/nemici/umani/*.json. */
export async function esempiNemici(radice = RADICE) {
  const leggi = async (sotto) => {
    const base = new URL(`esempi/nemici/${sotto}`, radice);
    const file = (await readdir(base)).filter((x) => x.endsWith('.json')).sort();
    return Object.fromEntries(await Promise.all(file.map(async (x) => [x.replace(/\.json$/, ''),
      JSON.parse(await readFile(new URL(x, base), 'utf8'))])));
  };
  return { esempi: await leggi(''), umani: await leggi('umani/') };
}

// --- voci della pagina ------------------------------------------------------------------------------------

const GRADO_DI_SUFFISSO = Object.fromEntries(Object.entries(SUFFISSO_UMANO).map(([g, s]) => [s, g]));
const PROPOSTA = /da validare con Davide/i;
const maiuscola = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Le schede della pagina, in ordine fisso: creature pronte (cap. 5), basi (cap. 3), bestiario umano,
 * esempi del Tavolo. Ogni voce porta il nemico nel formato di data/formato_nemici.json, cioè i valori
 * come li mostra la plancia.
 */
export function vociPagina(d, { esempi = {}, umani = {} } = {}) {
  const B = d.bestiario;
  const nomeGrado = (id) => B.gradi.find((g) => g.id === id)?.nome ?? id;
  const voci = [];
  const aggiungi = (v) => { voci.push({ ...v, proposta: PROPOSTA.test(v.nemico.note ?? '') }); };

  // 1. creature pronte: una scheda per grado, più la variante Boss dove la ricetta la prevede
  for (const c of B.creature) {
    const colonne = [...c.gradi.map((g) => ({ grado: g, boss: false })), ...(c.boss ? [{ grado: c.boss.grado, boss: true }] : [])];
    for (const { grado, boss } of colonne) {
      const r = profiloNemico(scelteCreatura(c.id, grado, { boss }, d), d, { umani });
      if (r.errori.length) throw new Error(`${c.nome} ${grado}${boss ? ' Boss' : ''}: ${r.errori.join('; ')}`);
      aggiungi({
        chiave: `creatura:${c.id}:${grado}${boss ? ':boss' : ''}`, gruppo: 'Creature pronte',
        categoria: maiuscola(c.famiglia), titolo: c.nome, grado, gradoNome: nomeGrado(grado), boss,
        riferimento: c.paragrafo, nemico: r.nemico,
      });
    }
  }

  // 2. basi del cap. 3, senza moduli: Umano no, è il bestiario umano qui sotto
  for (const [idBase, base] of Object.entries(B.basi)) {
    if (base.umano) continue;
    for (const g of B.gradi) {
      const scelte = { base: idBase, grado: g.id, boss: false, mutazioni: [], corrotto: null, equipaggiamento: null };
      const r = profiloNemico(scelte, d, { umani });
      if (r.errori.length) throw new Error(`base ${idBase} ${g.id}: ${r.errori.join('; ')}`);
      aggiungi({
        chiave: `base:${idBase}:${g.id}`, gruppo: 'Basi', categoria: 'Basi', titolo: base.nome,
        grado: g.id, gradoNome: g.nome, boss: false, riferimento: base.paragrafo, nemico: r.nemico,
      });
    }
  }

  // 3. bestiario umano: i file già pronti di esempi/nemici/umani/, nell'ordine dei tipi del §3.2
  const ordineUmani = B.basi.umano.tipi;
  for (const tipo of ordineUmani) {
    for (const [grado, suffisso] of Object.entries(SUFFISSO_UMANO)) {
      const n = umani[`${tipo}-${suffisso}`];
      if (!n) continue;
      aggiungi({
        chiave: `umano:${tipo}:${grado}`, gruppo: 'Bestiario umano', categoria: 'Bestiario umano',
        titolo: B.basi.umano.nomi_tipi[tipo] ?? tipo, grado, gradoNome: nomeGrado(grado), boss: false,
        riferimento: B.basi.umano.paragrafo, nemico: n,
      });
    }
  }
  // eventuali file umani fuori dall'elenco dei tipi: meglio mostrarli che perderli
  for (const [id, n] of Object.entries(umani)) {
    const suffisso = id.slice(id.lastIndexOf('-') + 1);
    const tipo = id.slice(0, id.lastIndexOf('-'));
    if (ordineUmani.includes(tipo) && GRADO_DI_SUFFISSO[suffisso]) continue;
    aggiungi({ chiave: `umano:${id}`, gruppo: 'Bestiario umano', categoria: 'Bestiario umano',
      titolo: n.nome ?? id, grado: GRADO_DI_SUFFISSO[suffisso] ?? null, gradoNome: null, boss: false,
      riferimento: null, nemico: n });
  }

  // 4. esempi del Tavolo del Master
  for (const [id, n] of Object.entries(esempi)) {
    aggiungi({ chiave: `esempio:${id}`, gruppo: 'Esempi del Tavolo', categoria: 'Esempi del Tavolo',
      titolo: n.nome ?? id, grado: null, gradoNome: null, boss: false, riferimento: null, nemico: n });
  }
  return voci;
}

// --- testi (gli stessi della plancia, src/ui/nemici.js) ---------------------------------------------------

const numero = (n) => (n > 0 ? `+${n}` : String(n));
const plurale = (n, uno, molti) => `${n} ${n === 1 ? uno : molti}`;

/** «2 Azioni Principali e 1 di Movimento (eccezione)». */
export function testoAzioni(a) {
  if (!a) return null;
  return `${plurale(a.principali, 'Azione Principale', 'Azioni Principali')} e ${a.movimento} di Movimento${a.eccezioni ? ` (${a.eccezioni})` : ''}`;
}

/** Nome leggibile di uno Stato (regole.json → stati.elenco). */
const nomeStato = (id, d) => d.regole.stati.elenco.find((s) => s.id === id)?.nome ?? id;

/** «Lama nefaria — ravvicinato, VA 13, 1d10+3 Magico, portata 1 Q, AC 1, Perforante 1». */
export function testoAttacco(a) {
  const parti = [a.tipo === 'distanza' ? 'a distanza' : 'ravvicinato', `VA ${a.va}`,
    [a.danno, a.natura].filter(Boolean).join(' ')];
  if (a.portata_q != null) parti.push(`portata ${a.portata_q} Q`);
  if (a.gittata_q != null) parti.push(`gittata ${a.gittata_q} Q`);
  if (a.ac != null) parti.push(`AC ${a.ac}`);
  if (a.modalita?.length) parti.push(`modalità ${a.modalita.join(', ')}`);
  if (a.proprieta?.length) parti.push(a.proprieta.join(', '));
  if (a.note) parti.push(a.note);
  return parti.filter(Boolean).join(', ');
}

/** «Dardo Psichico — versione 3, VA 10, 3 PM». */
export function testoIncantesimo(i) {
  const parti = [];
  if (i.livello != null) parti.push(`versione ${i.livello}`);
  if (i.va != null) parti.push(`VA ${i.va}`);
  if (i.costo_pm != null) parti.push(`${i.costo_pm} PM`);
  if (i.note) parti.push(i.note);
  return parti.length ? parti.join(', ') : 'promemoria: nessuna scheda';
}

// --- pagina -----------------------------------------------------------------------------------------------

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/**
 * Chiave di ricerca: minuscole senza accenti, con apostrofi e trattini normalizzati, così «Tessitrice
 * d'Ombra» si trova anche digitando l'apostrofo diritto della tastiera e «Furtivita» trova «Furtività».
 */
const senzaAccenti = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[‘’‛ʼ]/g, "'").replace(/[‐-―]/g, '-').toLowerCase();

const CSS = `:root{color-scheme:light dark;--sfondo:#f3f2ef;--testo:#1d1f22;--tenue:#5d6168;--linea:#cfccc5;
--accento:#8a2b1f;--pannello:#e8e6e1;--scheda:#fbfaf8;--spia:#7a5a12;--spia-sfondo:#f6ecd2}
@media (prefers-color-scheme:dark){:root:not([data-tema="chiaro"]){--sfondo:#17181b;--testo:#e4e2dd;--tenue:#9a9ea6;
--linea:#34363b;--accento:#e0705c;--pannello:#202226;--scheda:#1d1f23;--spia:#e9c877;--spia-sfondo:#2e2616}}
*{box-sizing:border-box}
body{margin:0;background:var(--sfondo);color:var(--testo);
font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;
padding:0 16px env(safe-area-inset-bottom,16px);font-variant-numeric:tabular-nums}
.testata{max-width:72rem;margin:0 auto;padding:24px 0 8px}
.testata .sopra{margin:0;color:var(--tenue);letter-spacing:.12em;text-transform:uppercase;font-size:.72rem}
.testata h1{margin:.1em 0;font-size:2.1rem;line-height:1.1}
.testata .sotto{margin:.2em 0;color:var(--tenue);font-size:.85rem}
.avviso{margin:.8em 0 0;padding:.6em .9em;background:var(--spia-sfondo);color:var(--spia);
border-left:3px solid currentColor;font-size:.85rem}
.avviso b{color:inherit}
.barra{position:sticky;top:0;z-index:2;max-width:72rem;margin:0 auto;padding:10px 0;background:var(--sfondo);
border-bottom:1px solid var(--linea)}
.barra input[type=search]{width:100%;padding:.55em .8em;font:inherit;color:inherit;background:var(--scheda);
border:1px solid var(--linea);border-radius:6px}
.filtri{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.filtri button{font:inherit;font-size:.82rem;padding:.3em .7em;border:1px solid var(--linea);border-radius:999px;
background:var(--pannello);color:var(--tenue);cursor:pointer}
.filtri button[aria-pressed=true]{background:var(--accento);border-color:var(--accento);color:#fff}
.conteggio{margin:8px 0 0;color:var(--tenue);font-size:.8rem}
main{max-width:72rem;margin:0 auto;padding:16px 0 48px;
display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(20rem,1fr));align-items:start}
.vuoto{grid-column:1/-1;color:var(--tenue);padding:2em 0;text-align:center}
.scheda{background:var(--scheda);border:1px solid var(--linea);border-radius:8px;padding:14px 16px;font-size:.92rem}
.scheda h2{margin:0;font-size:1.15rem;line-height:1.2}
.scheda h2 .grado{color:var(--accento);font-weight:600}
.scheda .meta{margin:.25em 0 0;color:var(--tenue);font-size:.78rem}
.bandiere{display:flex;flex-wrap:wrap;gap:5px;margin:.5em 0 0}
.bandiera{font-size:.7rem;letter-spacing:.04em;text-transform:uppercase;padding:.2em .55em;border-radius:3px;
background:var(--pannello);color:var(--tenue)}
.bandiera.proposta{background:var(--spia-sfondo);color:var(--spia)}
.bandiera.boss{background:var(--accento);color:#fff}
.valori{display:flex;flex-wrap:wrap;gap:.35em .9em;margin:.7em 0 0;padding:0;list-style:none;
border-top:1px solid var(--linea);padding-top:.6em}
.valori li{font-size:.88rem}
.valori b{color:var(--tenue);font-weight:600;font-size:.74rem;text-transform:uppercase;letter-spacing:.05em}
.scheda dl{margin:.7em 0 0;display:grid;grid-template-columns:auto 1fr;gap:.25em .7em;font-size:.86rem}
.scheda dt{color:var(--tenue);font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;padding-top:.15em}
.scheda dd{margin:0}
.scheda dd ul{margin:0;padding-left:1.1em}
.scheda dd li{margin:.1em 0}
.nota{margin:.8em 0 0;padding-top:.6em;border-top:1px solid var(--linea);color:var(--tenue);font-size:.78rem}
footer{max-width:72rem;margin:0 auto;padding:16px 0 32px;border-top:1px solid var(--linea);
color:var(--tenue);font-size:.78rem}
@media (max-width:40rem){body{padding-inline:12px}.testata h1{font-size:1.7rem}
main{grid-template-columns:1fr;gap:12px}.scheda{padding:12px 13px}
.scheda dl{grid-template-columns:1fr;gap:.1em}.scheda dt{padding-top:.4em}
/* sul telefono i filtri stanno su una riga che scorre, per non mangiare mezzo schermo */
.filtri{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.filtri::-webkit-scrollbar{display:none}
.filtri button{flex:0 0 auto}
.conteggio{margin-top:6px}}
@media print{.barra{display:none}main{display:block}.scheda{break-inside:avoid;margin-bottom:10px}}`;

const JS = `(function(){
  var cerca=document.getElementById('cerca'),conteggio=document.getElementById('conteggio');
  var schede=[].slice.call(document.querySelectorAll('.scheda'));
  var filtri={categoria:'',grado:''};
  function senzaAccenti(t){return t.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')
    .replace(/[\\u2018\\u2019\\u201b\\u02bc]/g,"'").replace(/[\\u2010-\\u2015]/g,'-').toLowerCase()}
  function applica(){
    var q=senzaAccenti(cerca.value.trim()),visibili=0;
    schede.forEach(function(s){
      var ok=(!q||s.dataset.cerca.indexOf(q)>=0)
        &&(!filtri.categoria||s.dataset.categoria===filtri.categoria)
        &&(!filtri.grado||s.dataset.grado===filtri.grado);
      s.hidden=!ok; if(ok)visibili++;
    });
    document.getElementById('vuoto').hidden=visibili>0;
    conteggio.textContent=visibili===1?'1 scheda':visibili+' schede';
  }
  document.querySelectorAll('.filtri button').forEach(function(b){
    b.addEventListener('click',function(){
      var gruppo=b.dataset.filtro,valore=b.dataset.valore||'';
      filtri[gruppo]=filtri[gruppo]===valore?'':valore;
      document.querySelectorAll('.filtri button[data-filtro="'+gruppo+'"]').forEach(function(x){
        x.setAttribute('aria-pressed',String(x.dataset.valore===filtri[gruppo]&&filtri[gruppo]!==''));
      });
      applica();
    });
  });
  cerca.addEventListener('input',applica);
  applica();
})();`;

/** Una scheda. */
function scheda(v, d) {
  const n = v.nemico;
  const righe = [];
  const riga = (dt, dd) => { if (dd) righe.push(`<dt>${esc(dt)}</dt><dd>${dd}</dd>`); };
  const elenco = (voci) => (voci.length ? `<ul>${voci.map((x) => `<li>${x}</li>`).join('')}</ul>` : '');

  const car = Object.entries(n.caratteristiche ?? {}).map(([k, x]) => `${k} ${x}`).join(' · ');
  riga('Caratteristiche', esc(car));
  riga('Prove Salvezza', n.salvezze ? esc(`Tempra ${n.salvezze.tempra} · Riflessi ${n.salvezze.riflessi} · Volontà ${n.salvezze.volonta} · Magia ${n.salvezze.magia}`) : '');
  riga('Movimento', esc(testoMovimento(n, d)));
  riga('Azioni per Round', esc(testoAzioni(n.azioni) ?? ''));
  riga('Attacchi', elenco((n.attacchi ?? []).map((a) => `<b>${esc(a.nome)}</b> — ${esc(testoAttacco(a))}`)));
  riga('Incantesimi', elenco((n.incantesimi ?? []).map((i) => `<b>${esc(i.nome)}</b> — ${esc(testoIncantesimo(i))}`)));
  riga('Abilità', n.abilita?.length ? esc(n.abilita.map((a) => `${a.nome} ${a.va}`).join(' · ')) : '');
  riga('Contromisure', n.contromisure?.length ? esc(n.contromisure.map((c) => (c.valore ? `${c.nome} ${c.valore}` : c.nome)).join(', ')) : '');
  riga('Immunità', n.immunita?.length ? esc(n.immunita.map((s) => nomeStato(s, d)).join(', ')) : '');
  riga('Capacità', elenco((n.capacita ?? []).map((c) => {
    const coda = [c.costo ? `costo: ${c.costo}` : null, c.limiti ? `limiti: ${c.limiti}` : null].filter(Boolean);
    return `<b>${esc(c.nome)}</b> — ${esc(c.effetto ?? '')}${coda.length ? ` <i>(${esc(coda.join('; '))})</i>` : ''}`;
  })));

  const valori = [['PV', n.pv], n.pm != null ? ['PM', n.pm] : null,
    ['AR', `${n.ar.totale}${n.ar.magica ? ` (di cui magica ${n.ar.magica})` : ''}`],
    ['Difese', n.difese], ['Iniziativa', numero(n.iniziativa)]].filter(Boolean);

  const bandiere = [v.boss ? '<span class="bandiera boss">Boss</span>' : null,
    v.proposta ? '<span class="bandiera proposta">Proposta, da validare con Davide</span>' : null].filter(Boolean);

  const cercabile = senzaAccenti([v.titolo, v.gradoNome, v.categoria, v.gruppo, n.nome, v.boss ? 'boss' : '',
    (n.attacchi ?? []).map((a) => a.nome).join(' ')].filter(Boolean).join(' '));

  const meta = [v.gruppo, v.riferimento].filter(Boolean).join(' · ');
  return `<article class="scheda" data-categoria="${esc(v.categoria)}" data-grado="${esc(v.grado ?? '')}" data-cerca="${esc(cercabile)}">
<h2>${esc(v.titolo)}${v.gradoNome ? ` <span class="grado">${esc(v.gradoNome)}</span>` : ''}</h2>
<p class="meta">${esc(meta)}</p>
${bandiere.length ? `<p class="bandiere">${bandiere.join('')}</p>` : ''}
<ul class="valori">${valori.map(([k, x]) => `<li><b>${esc(k)}</b> ${esc(x)}</li>`).join('')}</ul>
<dl>${righe.join('')}</dl>
${n.fonte ? `<p class="nota"><b>Fonte:</b> ${esc(n.fonte)}</p>` : ''}
${n.note ? `<p class="nota">${esc(n.note)}</p>` : ''}
</article>`;
}

/** La pagina completa. Nessuna data di generazione: dagli stessi dati esce sempre lo stesso file. */
export function paginaHtml(voci, d) {
  const categorie = [];
  for (const v of voci) if (!categorie.includes(v.categoria)) categorie.push(v.categoria);
  const gradi = d.bestiario.gradi.filter((g) => voci.some((v) => v.grado === g.id));
  const chip = (filtro, valore, testo) => `<button type="button" data-filtro="${esc(filtro)}" data-valore="${esc(valore)}" aria-pressed="false">${esc(testo)}</button>`;
  const proposte = voci.filter((v) => v.proposta).length;

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Bestiario SIMPLY RPG</title>
<meta name="description" content="Bestiario di SIMPLY RPG: creature e nemici con i valori della plancia, con ricerca e filtri.">
<style>${CSS}</style>
</head>
<body>
<header class="testata">
<p class="sopra">SIMPLY RPG · Mutant</p>
<h1>Bestiario</h1>
<p class="sotto">${esc(voci.length)} schede con i valori come li mostra la plancia del Tavolo del Master. ${esc(d.bestiario.versione_manuale)}</p>
<p class="avviso"><b>${esc(proposte)} schede su ${esc(voci.length)} sono una proposta da validare con Davide</b> e lo dicono nella propria intestazione. La scala di potenza è una stima sperimentale, da verificare al tavolo.</p>
</header>
<form class="barra" role="search" onsubmit="return false">
<input type="search" id="cerca" placeholder="Cerca un nome…" aria-label="Cerca una creatura per nome" autocomplete="off">
<div class="filtri" role="group" aria-label="Categoria">${categorie.map((c) => chip('categoria', c, c)).join('')}</div>
<div class="filtri" role="group" aria-label="Grado">${gradi.map((g) => chip('grado', g.id, g.nome)).join('')}</div>
<p class="conteggio" id="conteggio" aria-live="polite">${esc(voci.length)} schede</p>
</form>
<main>
${voci.map((v) => scheda(v, d)).join('\n')}
<p class="vuoto" id="vuoto" hidden>Nessuna scheda con questi filtri.</p>
</main>
<footer>
<p>Pagina generata dai dati del repository con <code>node tools/bestiario_pagina.mjs</code>: creature e basi di <code>data/bestiario.json</code> calcolate da <code>src/crea-nemico.js</code>, nemici prestabiliti di <code>esempi/nemici/</code>. Non contiene nulla delle cartelle del server né dei personaggi dei giocatori.</p>
<p>${esc(d.bestiario.fonte ?? '')}</p>
</footer>
<script>${JS}</script>
</body>
</html>
`;
}

/** Tutto insieme: dati → pagina. */
export async function genera(radice = RADICE) {
  const d = await dati(radice);
  const { esempi, umani } = await esempiNemici(radice);
  return paginaHtml(vociPagina(d, { esempi, umani }), d);
}

/** Come tools/versione.mjs --controlla: la pagina sul disco corrisponde ai dati? */
export async function stato(radice = RADICE) {
  const html = await genera(radice);
  let attuale = null;
  try { attuale = await readFile(new URL(FILE_PAGINA, radice), 'utf8'); } catch { /* non c'è ancora */ }
  return { aggiornato: attuale === html, html, attuale };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('bestiario_pagina.mjs')) {
  const s = await stato();
  if (process.argv.includes('--controlla')) {
    console.log(s.aggiornato ? `${FILE_PAGINA}: aggiornata` : `${FILE_PAGINA}: VECCHIA rispetto ai dati — esegui node tools/bestiario_pagina.mjs`);
    process.exit(s.aggiornato ? 0 : 1);
  }
  await writeFile(new URL(FILE_PAGINA, RADICE), s.html);
  console.log(`${FILE_PAGINA}: ${(s.html.match(/<article class="scheda"/g) ?? []).length} schede, ${Math.round(s.html.length / 1024)} KB${s.aggiornato ? ' (invariata)' : ''}`);
}
