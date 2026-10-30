// Bestiario online: una pagina sola, costruita dai dati del repo, con i valori come li mostra la plancia.
//   node tools/bestiario_pagina.mjs            → scrive docs/bestiario/bestiario-online.html
//   node tools/bestiario_pagina.mjs --controlla → dice se la pagina è vecchia rispetto ai dati (esce 1)
//
// Fonti, e soltanto queste (nessun dato privato: le cartelle reali del server non si leggono mai):
// - data/*.json, caricati e validati dallo stesso caricatore dell'app (src/rules.js → caricaDati);
// - data/bestiario.json → creature pronte (cap. 5) e basi (cap. 3), con i profili calcolati da
//   src/crea-nemico.js, lo stesso motore di «Crea nemico» del Tavolo del Master;
// - esempi/nemici/ ed esempi/nemici/umani/ → i nemici prestabiliti tracciati in git;
// - docs/bestiario/bestiario.md → il testo del manuale proposto (capitoli 1–6 e Appendice A), nella
//   seconda vista della pagina, convertito da tools/bestiario_html.mjs.
//
// La pagina è un file solo, senza risorse esterne e senza data di generazione: così è deterministica e
// tests/bestiario-pagina.test.js può accorgersi quando i dati cambiano e la pagina no (CLAUDE.md,
// «Regole permanenti di lavoro»).
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { caricaDati } from '../src/rules.js';
import { testoMovimento } from '../src/nemici.js';
import { profiloNemico, scelteCreatura, SUFFISSO_UMANO } from '../src/crea-nemico.js';
import { blocchiHtml } from './bestiario_html.mjs';

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

/** Il testo del manuale proposto. */
export const testoManuale = (radice = RADICE) => readFile(new URL('docs/bestiario/bestiario.md', radice), 'utf8');

/** I nemici prestabiliti tracciati in git: esempi/nemici/*.json, /umani/ e /mostri/. */
export async function esempiNemici(radice = RADICE) {
  const leggi = async (sotto) => {
    const base = new URL(`esempi/nemici/${sotto}`, radice);
    let file;
    try { file = (await readdir(base)).filter((x) => x.endsWith('.json')).sort(); } catch { return {}; }
    return Object.fromEntries(await Promise.all(file.map(async (x) => [x.replace(/\.json$/, ''),
      JSON.parse(await readFile(new URL(x, base), 'utf8'))])));
  };
  return { esempi: await leggi(''), umani: await leggi('umani/'), mostri: await leggi('mostri/') };
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
export function vociPagina(d, { esempi = {}, umani = {}, mostri = {} } = {}) {
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

  // 4. creature del Manuale dei Mostri (esempi/nemici/mostri/): categoria dalla famiglia della scheda
  for (const [id, n] of Object.entries(mostri)) {
    aggiungi({ chiave: `mostro:${id}`, gruppo: 'Manuale dei Mostri', categoria: n.famiglia ? maiuscola(n.famiglia) : 'Manuale dei Mostri',
      titolo: n.nome ?? id, grado: null, gradoNome: n.gs_px?.gs ? `GS ${n.gs_px.gs}` : null, gs: n.gs_px?.gs ?? null, boss: false,
      riferimento: n.fonte ?? null, nemico: n });
  }

  // 5. esempi del Tavolo del Master
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
/* le regole di display qui sotto (main{display:grid}…) batterebbero il display:none di [hidden] */
[hidden]{display:none!important}
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
.comune{font-size:.8rem;color:var(--tenue)}
#comuni{max-width:46rem;margin:0 auto;font-size:.86rem}
.nota{margin:.8em 0 0;padding-top:.6em;border-top:1px solid var(--linea);color:var(--tenue);font-size:.78rem}
.viste{display:flex;gap:6px;margin:12px 0 0}
.viste button{font:inherit;font-size:.9rem;padding:.35em .9em;border:1px solid var(--linea);border-radius:6px;
background:var(--pannello);color:var(--tenue);cursor:pointer}
.viste button[aria-pressed=true]{background:var(--accento);border-color:var(--accento);color:#fff}
#manuale{max-width:46rem;margin:0 auto;padding:8px 0 48px;font-size:1.02rem;line-height:1.6}
#manuale h1{font-size:1.9rem;color:var(--accento);border-top:3px solid var(--accento);
padding-top:.5em;margin-top:2.2em;text-transform:uppercase;line-height:1.15}
#manuale h1:first-of-type{margin-top:.6em}
#manuale h2{font-size:1.4rem;margin-top:1.8em;line-height:1.2}
#manuale h3{font-size:1.15rem;margin-top:1.4em;line-height:1.2}
#manuale h4{font-size:1rem;margin-top:1.2em}
#manuale p,#manuale li{max-width:65ch}
#manuale .tw{overflow-x:auto;margin:1em 0;border:1px solid var(--linea)}
#manuale table{border-collapse:collapse;font-size:.86rem;width:100%}
#manuale th,#manuale td{border:1px solid var(--linea);padding:.4em .6em;text-align:left;vertical-align:top}
#manuale th{background:var(--pannello)}
#manuale tr:nth-child(even) td{background:var(--pannello)}
.indice{background:var(--pannello);padding:1em 1.3em;margin:1.2em 0}
.indice p{margin:0 0 .3em;color:var(--tenue);font-size:.74rem;text-transform:uppercase;letter-spacing:.08em}
.indice ol{margin:0;padding-left:1.3em}
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

/**
 * Decompressione deflate e lettura UTF-8 scritte in ES5, dentro la pagina (lotto 145): le schede sono compresse e
 * devono aprirsi anche sui tablet con browser vecchi, che non hanno DecompressionStream. È l'algoritmo di puff (zlib,
 * Mark Adler) in poche righe: codici di Huffman canonici letti un bit alla volta. Niente backslash né apici inversi
 * qui dentro: finisce in una stringa della pagina. tests/bestiario-pagina.test.js la prova contro zlib di Node.
 */
export const INFLATE_JS = [
  "function inflar(src,n){",
  "var out=new Uint8Array(n),si=0,di=0,bb=0,bc=0;",
  "function bit(k){var v=bb;while(bc<k){if(si>=src.length)throw new Error('dati troncati');v|=src[si++]<<bc;bc+=8}bb=v>>k;bc-=k;return v&((1<<k)-1)}",
  "function tab(l,m){var h={c:new Uint16Array(16),s:new Uint16Array(m)},o=new Uint16Array(16),i;for(i=0;i<m;i++)h.c[l[i]]++;h.c[0]=0;for(i=1;i<15;i++)o[i+1]=o[i]+h.c[i];for(i=0;i<m;i++)if(l[i])h.s[o[l[i]]++]=i;return h}",
  "function dec(h){var code=0,first=0,idx=0,len,c;for(len=1;len<=15;len++){code|=bit(1);c=h.c[len];if(code-c<first)return h.s[idx+(code-first)];idx+=c;first+=c;first<<=1;code<<=1}throw new Error('codice non valido')}",
  "var LB=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],",
  "LE=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],",
  "DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],",
  "DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],",
  "OR=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];",
  "function blocco(lc,dc){for(;;){var sym=dec(lc),len,d,k;if(sym<256){out[di++]=sym}else if(sym===256){return}else{sym-=257;if(sym>=29)throw new Error('lunghezza non valida');len=LB[sym]+bit(LE[sym]);k=dec(dc);d=DB[k]+bit(DE[k]);if(d>di)throw new Error('distanza non valida');while(len--){out[di]=out[di-d];di++}}}}",
  "var last,type,i,l,lc,dc;",
  "do{last=bit(1);type=bit(2);",
  "if(type===0){bb=0;bc=0;l=src[si]|(src[si+1]<<8);si+=4;while(l--)out[di++]=src[si++]}",
  "else if(type===1){l=new Uint8Array(288);for(i=0;i<144;i++)l[i]=8;for(;i<256;i++)l[i]=9;for(;i<280;i++)l[i]=7;for(;i<288;i++)l[i]=8;lc=tab(l,288);l=new Uint8Array(30);for(i=0;i<30;i++)l[i]=5;dc=tab(l,30);blocco(lc,dc)}",
  "else if(type===2){var nl=bit(5)+257,nd=bit(5)+1,nc=bit(4)+4,lg=new Uint8Array(320),sym,r,p;",
  "for(i=0;i<nc;i++)lg[OR[i]]=bit(3);var cc=tab(lg.subarray(0,19),19);lg=new Uint8Array(320);",
  "for(i=0;i<nl+nd;){sym=dec(cc);if(sym<16){lg[i++]=sym}else{p=0;if(sym===16){if(!i)throw new Error('ripetizione non valida');p=lg[i-1];r=3+bit(2)}else if(sym===17){r=3+bit(3)}else{r=11+bit(7)}while(r--)lg[i++]=p}}",
  "lc=tab(lg.subarray(0,nl),nl);dc=tab(lg.subarray(nl,nl+nd),nd);blocco(lc,dc)}",
  "else throw new Error('blocco non valido')}while(!last);",
  "if(di!==n)throw new Error('lunghezza inattesa');return out}",
  "function daByte(u){if(window.TextDecoder)return new TextDecoder('utf-8').decode(u);var s='',i,n=u.length;for(i=0;i<n;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,Math.min(n,i+8192)));return decodeURIComponent(escape(s))}",
].join('\n');

const JS = `(function(){
${INFLATE_JS}
  // NodeList.forEach non c'è nei browser vecchi: si usa quello degli array
  function each(l,f){Array.prototype.forEach.call(l,f)}
  // due viste: lo schedario delle creature e il testo del manuale. Senza JS si vedono tutte e due.
  var viste={creature:[document.getElementById('barra'),document.getElementById('schede')],
             manuale:[document.getElementById('manuale')]};
  function mostra(quale){
    Object.keys(viste).forEach(function(k){viste[k].forEach(function(e){if(e)e.hidden=k!==quale})});
    each(document.querySelectorAll('.viste button'),function(b){
      b.setAttribute('aria-pressed',String(b.dataset.vista===quale));
    });
  }
  each(document.querySelectorAll('.viste button'),function(b){
    b.addEventListener('click',function(){mostra(b.dataset.vista);
      if(b.dataset.vista==='manuale')window.scrollTo(0,0);});
  });
  function vistaDaIndirizzo(){
    var id=location.hash.slice(1);
    if(!id)return 'creature';
    if(id==='manuale')return 'manuale';
    var e=document.getElementById(id);
    return e&&document.getElementById('manuale').contains(e)?'manuale':'creature';
  }
  mostra(vistaDaIndirizzo());
  window.addEventListener('hashchange',function(){
    mostra(vistaDaIndirizzo());
    var e=document.getElementById(location.hash.slice(1));
    if(e)e.scrollIntoView();
  });

  // le schede arrivano compresse (deflate, base64) in #dati-schede: si aprono all'avvio e poi parte tutto il resto
  function avvia(){
  // testi comuni: ogni rimando si apre sotto la scheda; il testo è scritto una volta sola in fondo alla pagina
  each(document.querySelectorAll('a.comune'),function(a){
    var t=document.getElementById('comune-'+a.dataset.comune);
    if(!t)return;
    var s=document.createElement('span');s.className='testo-comune';s.innerHTML=t.innerHTML;
    a.parentNode.replaceChild(s,a);
  });
  var com=document.getElementById('comuni');if(com)com.hidden=true;

  var cerca=document.getElementById('cerca'),conteggio=document.getElementById('conteggio');
  var schede=[].slice.call(document.querySelectorAll('.scheda'));
  var filtri={categoria:'',grado:'',gs:''};
  function senzaAccenti(t){return (t.normalize?t.normalize('NFD'):t).replace(/[\\u0300-\\u036f]/g,'')
    .replace(/[\\u2018\\u2019\\u201b\\u02bc]/g,"'").replace(/[\\u2010-\\u2015]/g,'-').toLowerCase()}
  function applica(){
    var q=senzaAccenti(cerca.value.trim()),visibili=0;
    schede.forEach(function(s){
      var ok=(!q||s.dataset.cerca.indexOf(q)>=0)
        &&(!filtri.categoria||s.dataset.categoria===filtri.categoria)
        &&(!filtri.grado||s.dataset.grado===filtri.grado)
        &&(!filtri.gs||s.dataset.gs===filtri.gs);
      s.hidden=!ok; if(ok)visibili++;
    });
    document.getElementById('vuoto').hidden=visibili>0;
    conteggio.textContent=visibili===1?'1 scheda':visibili+' schede';
  }
  each(document.querySelectorAll('.filtri button'),function(b){
    b.addEventListener('click',function(){
      var gruppo=b.dataset.filtro,valore=b.dataset.valore||'';
      filtri[gruppo]=filtri[gruppo]===valore?'':valore;
      each(document.querySelectorAll('.filtri button[data-filtro="'+gruppo+'"]'),function(x){
        x.setAttribute('aria-pressed',String(x.dataset.valore===filtri[gruppo]&&filtri[gruppo]!==''));
      });
      applica();
    });
  });
  cerca.addEventListener('input',applica);
  applica();
  var h=location.hash.slice(1),e=h&&document.getElementById(h);
  if(e&&!document.getElementById('manuale').contains(e))e.scrollIntoView();
  }
  var dati=document.getElementById('dati-schede');
  if(!dati){avvia();return}
  var caricamento=document.getElementById('caricamento');
  caricamento.textContent='Carico le schede…';
  // le schede sono compresse (deflate, base64) e si aprono con inflar(), scritta qui sotto: funziona in qualunque
  // browser che esegue JavaScript, senza chiedere funzioni recenti del browser
  try{
    var b=atob(dati.textContent.replace(/[^A-Za-z0-9+/=]/g,'')),byte=new Uint8Array(b.length);
    for(var i=0;i<b.length;i++)byte[i]=b.charCodeAt(i);
    var html=daByte(inflar(byte,Number(dati.getAttribute('data-lunghezza'))));
    caricamento.parentNode.removeChild(caricamento);
    document.getElementById('schede').insertAdjacentHTML('afterbegin',html);
  }catch(e){
    caricamento.textContent='Non riesco ad aprire le schede su questo browser ('+(e&&e.message?e.message:e)+'). Prova con una versione più recente di Chrome, Safari o Firefox, oppure con un altro dispositivo.';
    return;
  }
  avvia();
})();`;

/** Una scheda. */
function scheda(v, d) {
  const n = v.nemico;
  const righe = [];
  const riga = (dt, dd) => { if (dd) righe.push(`<dt>${esc(dt)}</dt><dd>${dd}</dd>`); };
  const elenco = (voci) => (voci.length ? `<ul>${voci.map((x) => `<li>${x}</li>`).join('')}</ul>` : '');

  const car = Object.entries(n.caratteristiche ?? {}).map(([k, x]) => `${k} ${x}`).join(' · ');
  riga('Caratteristiche', esc(car));
  // una Salvezza assente (senza_salvezza: «Volontà —» di melme e funghi senza mente) si mostra «—», mai «undefined»
  riga('Prove Salvezza', n.salvezze ? esc(`Tempra ${n.salvezze.tempra ?? '—'} · Riflessi ${n.salvezze.riflessi ?? '—'} · Volontà ${n.salvezze.volonta ?? '—'} · Magia ${n.salvezze.magia ?? '—'}`) : '');
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

  const cercabile = senzaAccenti([v.titolo, v.gradoNome, v.categoria, v.gruppo, n.nome, ...(n.alias ?? []), v.boss ? 'boss' : '',
    (n.attacchi ?? []).map((a) => a.nome).join(' ')].filter(Boolean).join(' '));

  const meta = [v.gruppo, v.riferimento].filter(Boolean).join(' · ');
  return `<article class="scheda" data-categoria="${esc(v.categoria)}" data-grado="${esc(v.grado ?? '')}" data-gs="${esc(v.gs ?? '')}" data-cerca="${esc(cercabile)}">
<h2>${esc(v.titolo)}${v.gradoNome ? ` <span class="grado">${esc(v.gradoNome)}</span>` : ''}</h2>
<p class="meta">${esc(meta)}</p>
${bandiere.length ? `<p class="bandiere">${bandiere.join('')}</p>` : ''}
<ul class="valori">${valori.map(([k, x]) => `<li><b>${esc(k)}</b> ${esc(x)}</li>`).join('')}</ul>
<dl>${righe.join('')}</dl>
${n.fonte ? `<p class="nota"><b>Fonte:</b> ${esc(n.fonte)}</p>` : ''}
${n.note ? `<p class="nota">${esc(n.note)}</p>` : ''}
</article>`;
}

// --- testi comuni -----------------------------------------------------------------------------------------
// I draghi, gli animali e gli elementali ripetono lo stesso testo di capacità e di nota (le pagine comuni del
// manuale): scritto in ogni scheda pesava 715 KB su 2 MB. Ogni testo lungo ripetuto sta una volta sola in
// «Testi comuni» in fondo alla pagina; la scheda lo richiama e il piccolo script lo apre sotto la scheda, così
// la scheda si legge da sola. Senza script resta il rimando «testo comune», un collegamento alla sezione.
const MIN_COMUNE = 150;
const RE_COMUNE = /(<li>)(<b>[^<]*<\/b> — )(.*?)(<\/li>)|(<p class="nota">)(.*?)(<\/p>)/gs;

/** Estrae dai testi delle schede quelli lunghi e ripetuti: restituisce le schede alleggerite e la tabella dei testi. */
export function condividiTesti(schedeHtml) {
  const conta = new Map();
  for (const h of schedeHtml) for (const m of h.matchAll(RE_COMUNE)) { const t = m[3] ?? m[6]; if (t.length >= MIN_COMUNE) conta.set(t, (conta.get(t) ?? 0) + 1); }
  const comuni = [...conta].filter(([, c]) => c > 1).map(([t]) => t);
  const indice = new Map(comuni.map((t, i) => [t, i + 1]));
  const schede = schedeHtml.map((h) => h.replace(RE_COMUNE, (tutto, a, nome, t1, chiusa, b, t2, chiusa2) => {
    const n = indice.get(t1 ?? t2);
    if (!n) return tutto;
    const rimando = `<a class="comune" href="#comune-${n}" data-comune="${n}">testo comune</a>`;
    return a ? `${a}${nome}${rimando}${chiusa}` : `${b}${rimando}${chiusa2}`;
  }));
  return { schede, comuni };
}

/** Slug per gli id dei titoli del manuale: «Capitolo 2 — Scala di potenza» → «capitolo-2-scala-di-potenza». */
const slug = (t) => senzaAccenti(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/**
 * Il testo del manuale proposto (docs/bestiario/bestiario.md) come sezione della pagina, con un indice
 * dei capitoli. Il titolo del documento diventa un h2: nella pagina il titolo è già in testata.
 */
export function manualeHtml(md) {
  const capitoli = [];
  const blocchi = blocchiHtml(md, (livello, testo) => {
    const id = slug(testo);
    if (livello === 1) capitoli.push({ id, testo });
    return id;
  });
  // il primo h1 è il titolo del documento: nella pagina lo degradiamo, la testata lo dice già
  const primo = blocchi.findIndex((b) => b.startsWith('<h1'));
  if (primo >= 0) {
    blocchi[primo] = blocchi[primo].replace(/^<h1/, '<h2').replace(/<\/h1>$/, '</h2>');
    capitoli.shift();
  }
  const corpo = blocchi.join('\n')
    .replace(/<table border="1">/g, '<div class="tw"><table>')
    .replace(/<\/table>/g, '</table></div>');
  const indice = capitoli.length
    ? `<nav class="indice"><p>Indice</p><ol>${capitoli.map((c) => `<li><a href="#${c.id}">${esc(c.testo)}</a></li>`).join('')}</ol></nav>`
    : '';
  // l'indice va dopo il frontespizio, cioè prima del primo capitolo
  const taglio = corpo.indexOf(`<h1 id="${capitoli[0]?.id}"`);
  return taglio > 0 ? `${corpo.slice(0, taglio)}${indice}${corpo.slice(taglio)}` : `${indice}${corpo}`;
}

/** La pagina completa. Nessuna data di generazione: dagli stessi dati esce sempre lo stesso file. */
export function paginaHtml(voci, d, md = '', { compressa = false } = {}) {
  const categorie = [];
  for (const v of voci) if (!categorie.includes(v.categoria)) categorie.push(v.categoria);
  const gradi = d.bestiario.gradi.filter((g) => voci.some((v) => v.grado === g.id));
  const chip = (filtro, valore, testo) => `<button type="button" data-filtro="${esc(filtro)}" data-valore="${esc(valore)}" aria-pressed="false">${esc(testo)}</button>`;
  // 29/10: la scala del GS fino a Entità Suprema (Direttore §9.3.1, data/formato_nemici.json → gs_scala), solo i GS che ci sono
  const gsPresenti = (d.formato_nemici?.gs_scala ?? []).filter((x) => voci.some((v) => v.gs === x.nome));
  const proposte = voci.filter((v) => v.proposta).length;
  const { schede, comuni } = condividiTesti(voci.map((v) => scheda(v, d)));
  // le schede e i testi comuni; con «compressa» viaggiano in gzip e la pagina li apre all'avvio
  const corpoSchede = `${schede.join('\n')}
<section id="comuni" aria-label="Testi comuni">
${comuni.length ? `<h2>Testi comuni a più schede</h2>\n${comuni.map((t, i) => `<p id="comune-${i + 1}">${t}</p>`).join('\n')}` : ''}
</section>`;

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
<div class="viste" role="group" aria-label="Vista">
<button type="button" data-vista="creature" aria-pressed="true">Creature (${esc(voci.length)})</button>
<button type="button" data-vista="manuale" aria-pressed="false">Manuale</button>
</div>
</header>
<form class="barra" id="barra" role="search" onsubmit="return false">
<input type="search" id="cerca" placeholder="Cerca un nome…" aria-label="Cerca una creatura per nome" autocomplete="off">
<div class="filtri" role="group" aria-label="Categoria">${categorie.map((c) => chip('categoria', c, c)).join('')}</div>
<div class="filtri" role="group" aria-label="Grado">${gradi.map((g) => chip('grado', g.id, g.nome)).join('')}</div>
${gsPresenti.length ? `<div class="filtri" role="group" aria-label="Grado di Sfida">${gsPresenti.map((x) => chip('gs', x.nome, `GS ${x.nome}`)).join('')}</div>` : ''}
<p class="conteggio" id="conteggio" aria-live="polite">${esc(voci.length)} schede</p>
</form>
<main id="schede">
${compressa ? '<p id="caricamento" class="vuoto">Le schede si aprono con JavaScript: se questo messaggio resta, il browser non lo esegue o è troppo vecchio. Il testo del manuale (pulsante «Manuale») si legge lo stesso.</p>' : corpoSchede}
<p class="vuoto" id="vuoto" hidden>Nessuna scheda con questi filtri.</p>
</main>
${compressa ? datiCompressi(corpoSchede) : ''}
<article id="manuale">
${md ? manualeHtml(md) : '<p>Il testo del manuale non è compreso in questa copia.</p>'}
</article>
<footer>
<p>Pagina generata dai dati del repository con <code>node tools/bestiario_pagina.mjs</code>: creature e basi di <code>data/bestiario.json</code> calcolate da <code>src/crea-nemico.js</code>, nemici prestabiliti di <code>esempi/nemici/</code>, testo del manuale di <code>docs/bestiario/bestiario.md</code>. Non contiene nulla delle cartelle del server né dei personaggi dei giocatori.</p>
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
  const { esempi, umani, mostri } = await esempiNemici(radice);
  return paginaHtml(vociPagina(d, { esempi, umani, mostri }), d, await testoManuale(radice), { compressa: true });
}

/** La pagina con il blocco compresso aperto: il gzip può cambiare da una versione di Node all'altra, il contenuto no. */
export const aperta = (html) => html.replace(/(<script type="application\/octet-stream" id="dati-schede"[^>]*>)([^<]*)(<\/script>)/,
  (_, a, b64, c) => `${a.replace(/ data-lunghezza="\d+"/, '')}${inflateRawSync(Buffer.from(b64, 'base64')).toString()}${c}`);

/** Il blocco compresso: deflate grezzo in base64, con la lunghezza da ottenere (la legge inflar() della pagina). */
export function datiCompressi(testo) {
  const byte = Buffer.from(testo);
  return `<script type="application/octet-stream" id="dati-schede" data-lunghezza="${byte.length}">${deflateRawSync(byte, { level: 9 }).toString('base64')}</script>`;
}

/** Come tools/versione.mjs --controlla: la pagina sul disco corrisponde ai dati? */
export async function stato(radice = RADICE) {
  const html = await genera(radice);
  let attuale = null;
  try { attuale = await readFile(new URL(FILE_PAGINA, radice), 'utf8'); } catch { /* non c'è ancora */ }
  return { aggiornato: attuale !== null && aperta(attuale) === aperta(html), html, attuale };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('bestiario_pagina.mjs')) {
  const s = await stato();
  if (process.argv.includes('--controlla')) {
    console.log(s.aggiornato ? `${FILE_PAGINA}: aggiornata` : `${FILE_PAGINA}: VECCHIA rispetto ai dati — esegui node tools/bestiario_pagina.mjs`);
    process.exit(s.aggiornato ? 0 : 1);
  }
  await writeFile(new URL(FILE_PAGINA, RADICE), s.html);
  console.log(`${FILE_PAGINA}: ${(aperta(s.html).match(/<article class="scheda"/g) ?? []).length} schede, ${Math.round(s.html.length / 1024)} KB${s.aggiornato ? ' (invariata)' : ''}`);
}
