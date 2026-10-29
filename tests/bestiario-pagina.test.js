// Bestiario online (tools/bestiario_pagina.mjs): la pagina si costruisce dai dati del repo con un comando
// solo, contiene soltanto il bestiario e i nemici prestabiliti, e non resta indietro rispetto ai dati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { inflateRawSync, deflateRawSync } from 'node:zlib';
import { datiReali } from './helpers.js';
import {
  CARTELLE_VIETATE, FILE_PAGINA, aperta, condividiTesti, esempiNemici, vociPagina, paginaHtml, manualeHtml, stato,
  testoAzioni, testoAttacco, testoIncantesimo,
} from '../tools/bestiario_pagina.mjs';

const RADICE = new URL('../', import.meta.url);

// --- dati di prova: la pagina si costruisce anche da un bestiario inventato ---------------------------------

const DATI_PROVA = {
  bestiario: {
    versione_manuale: 'Bestiario di prova 9.9',
    fonte: 'dati inventati per il test',
    gradi: [{ id: 'minore', nome: 'Minore' }, { id: 'medio', nome: 'Medio' }, { id: 'potente', nome: 'Potente' }],
  },
  regole: { stati: { elenco: [{ id: 'terrorizzato', nome: 'Terrorizzato' }] } },
  formato_nemici: { campi: { movimento: { moltiplicatori: { corsa: 2, scatto: 3 } } } },
};

/** Una voce come quelle che costruisce vociPagina, con valori di prova. */
const vocePROVA = (extra = {}) => ({
  chiave: 'prova:uno', gruppo: 'Creature pronte', categoria: 'Insettoidi', titolo: 'Cosa <strana>',
  grado: 'medio', gradoNome: 'Medio', boss: false, riferimento: '§9.9.9', proposta: true,
  nemico: {
    nome: 'Cosa <strana> Medio', caratteristiche: { FOR: 6, COS: 7, DES: 8, INT: 2, SAG: 5, CAR: 1 },
    pv: 65, pm: 4, ar: { totale: 3, magica: 1 }, difese: 13, iniziativa: 6,
    movimento: { passo: 6, scatto: 'non_consentito' },
    salvezze: { tempra: 13, riflessi: 11, volonta: 11, magia: 8 },
    azioni: { principali: 2, movimento: 1, eccezioni: 'niente Scatto' },
    attacchi: [{ nome: 'Mandibole', tipo: 'ravvicinato', va: 15, danno: '2d6+1', natura: 'Naturale', portata_q: 1, ac: 1 }],
    abilita: [{ nome: 'Furtività', va: 11 }], contromisure: [{ nome: 'Imbottita', valore: 2 }],
    immunita: ['terrorizzato'],
    capacita: [{ nome: 'Scavo', effetto: 'Scava nel terreno sciolto.', limiti: 'non nella roccia' }],
    incantesimi: [{ nome: 'Dardo Psichico', livello: 3, va: 10, costo_pm: 3 }],
    fonte: 'bestiario di prova', note: 'Proposta, da validare con Davide.',
  },
  ...extra,
});

test('dati di prova: la pagina si genera e mostra i valori della plancia', () => {
  const voci = [vocePROVA(), vocePROVA({
    chiave: 'prova:due', categoria: 'Basi', gruppo: 'Basi', titolo: 'Base liscia', grado: 'minore',
    gradoNome: 'Minore', boss: true, proposta: false,
    nemico: { nome: 'Base liscia Minore', caratteristiche: { FOR: 5 }, pv: 21, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 4, movimento: { passo: 6 }, attacchi: [] },
  })];
  const html = paginaHtml(voci, DATI_PROVA);

  assert.equal((html.match(/<article class="scheda"/g) ?? []).length, 2);
  assert.match(html, /<title>Bestiario SIMPLY RPG<\/title>/);
  assert.match(html, /Bestiario di prova 9\.9/);
  // valori della plancia della prima scheda
  assert.match(html, /<b>PV<\/b> 65/);
  assert.match(html, /<b>PM<\/b> 4/);
  assert.match(html, /<b>AR<\/b> 3 \(di cui magica 1\)/);
  assert.match(html, /<b>Difese<\/b> 13/);
  assert.match(html, /<b>Iniziativa<\/b> \+6/);
  assert.match(html, /FOR 6 · COS 7 · DES 8 · INT 2 · SAG 5 · CAR 1/);
  assert.match(html, /Tempra 13 · Riflessi 11 · Volontà 11 · Magia 8/);
  assert.match(html, /Passo 6 Q · Corsa 12 Q\* · Scatto non consentito/);
  assert.match(html, /2 Azioni Principali e 1 di Movimento \(niente Scatto\)/);
  assert.match(html, /Mandibole<\/b> — ravvicinato, VA 15, 2d6\+1 Naturale, portata 1 Q, AC 1/);
  assert.match(html, /Dardo Psichico<\/b> — versione 3, VA 10, 3 PM/);
  assert.match(html, /Furtività 11/);
  assert.match(html, /Imbottita 2/);
  assert.match(html, /Terrorizzato/); // id dello Stato tradotto col nome dei dati
  assert.match(html, /Scavo<\/b> — Scava nel terreno sciolto\. <i>\(limiti: non nella roccia\)<\/i>/);
  // nessun HTML dei dati finisce nella pagina senza escape
  assert.doesNotMatch(html, /<strana>/);
  assert.match(html, /Cosa &lt;strana&gt;/);
});

test('dati di prova: ricerca per nome, filtro per categoria e marchio della proposta', () => {
  const html = paginaHtml([vocePROVA(), vocePROVA({ chiave: 'due', categoria: 'Basi', gruppo: 'Basi', proposta: false, boss: true })], DATI_PROVA);
  // la ricerca legge data-cerca: minuscole e senza accenti, con nome, grado e categoria
  assert.match(html, /data-cerca="cosa &lt;strana&gt; medio insettoidi creature pronte cosa &lt;strana&gt; medio mandibole"/);
  assert.match(html, /<input type="search" id="cerca"/);
  // un chip per categoria presente e uno per grado presente
  assert.match(html, /data-filtro="categoria" data-valore="Insettoidi"/);
  assert.match(html, /data-filtro="categoria" data-valore="Basi"/);
  assert.match(html, /data-filtro="grado" data-valore="medio"/);
  assert.doesNotMatch(html, /data-filtro="grado" data-valore="potente"/); // nessuna scheda Potente: nessun chip
  // le voci da validare restano segnate come tali, le altre no
  assert.equal((html.match(/bandiera proposta/g) ?? []).length, 1);
  assert.equal((html.match(/bandiera boss/g) ?? []).length, 1);
  assert.match(html, /schede su 2 sono una proposta da validare con Davide/);
  // telefono: una colonna sola e nessun scorrimento orizzontale forzato
  assert.match(html, /@media \(max-width:40rem\)/);
  assert.match(html, /main\{grid-template-columns:1fr/);
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1/);
});

const MD_PROVA = `**SIMPLY RPG**

# **Bestiario di prova**

## Sottotitolo

Un paragrafo di apertura.

# **Capitolo 1 — Prova**

| Valore | Minore |
| :---- | :---: |
| PV | 21 |

# **Appendice A — Taratura**

Ultimo paragrafo.
`;

test('dati di prova: il testo del manuale diventa la seconda vista, con indice e tabelle scorrevoli', () => {
  const m = manualeHtml(MD_PROVA);
  // il titolo del documento scende a h2 (in pagina il titolo è già in testata); i capitoli restano h1 con l'id
  assert.match(m, /<h2 id="bestiario-di-prova">Bestiario di prova<\/h2>/);
  assert.match(m, /<h1 id="capitolo-1-prova">Capitolo 1 — Prova<\/h1>/);
  assert.match(m, /<h1 id="appendice-a-taratura">Appendice A — Taratura<\/h1>/);
  // indice dei soli capitoli, prima del primo capitolo
  assert.match(m, /<nav class="indice">.*capitolo-1-prova.*appendice-a-taratura.*<\/nav>/s);
  assert.ok(m.indexOf('class="indice"') < m.indexOf('<h1 id="capitolo-1-prova"'));
  assert.doesNotMatch(m, /<li><a href="#bestiario-di-prova"/); // il titolo non è un capitolo
  // tabelle avvolte per lo scorrimento orizzontale sul telefono
  assert.match(m, /<div class="tw"><table>/);
  assert.match(m, /<\/table><\/div>/);

  const html = paginaHtml([vocePROVA()], DATI_PROVA, MD_PROVA);
  assert.match(html, /<article id="manuale">/);
  assert.match(html, /data-vista="creature"/);
  assert.match(html, /data-vista="manuale"/);
  // senza il testo la pagina si genera lo stesso e lo dice
  assert.match(paginaHtml([vocePROVA()], DATI_PROVA), /Il testo del manuale non è compreso/);
});

test('dati di prova: [hidden] batte i display delle due viste', () => {
  // main{display:grid} e .barra batterebbero il display:none predefinito di [hidden]:
  // senza questa regola il passaggio fra «Creature» e «Manuale» lascia le schede sullo schermo
  const html = paginaHtml([vocePROVA()], DATI_PROVA, MD_PROVA);
  assert.match(html, /\[hidden\]\{display:none!important\}/);
  assert.ok(html.indexOf('[hidden]{display:none!important}') < html.indexOf('main{max-width'));
});

test('dati di prova: i testi dei valori sono quelli della plancia', () => {
  assert.equal(testoAzioni({ principali: 1, movimento: 1 }), '1 Azione Principale e 1 di Movimento');
  assert.equal(testoAzioni(null), null);
  assert.equal(testoAttacco({ nome: 'Fucile', tipo: 'distanza', va: 11, danno: '1d8+1', natura: 'Naturale', gittata_q: 60, modalita: ['S', 'RB'], ac: 1 }),
    'a distanza, VA 11, 1d8+1 Naturale, gittata 60 Q, AC 1, modalità S, RB');
  assert.equal(testoIncantesimo({ nome: 'Rituale', note: 'promemoria' }), 'promemoria');
  assert.equal(testoIncantesimo({ nome: 'Rituale' }), 'promemoria: nessuna scheda');
});

// --- dati reali: copertura e nessun dato privato ------------------------------------------------------------

test('dati reali: una scheda per creatura e grado, per base e per nemico prestabilito', async () => {
  const { dati } = await datiReali();
  const { esempi, umani } = await esempiNemici(RADICE);
  const voci = vociPagina(dati, { esempi, umani });
  const B = dati.bestiario;

  // creature pronte: un grado per colonna, più la variante Boss dove la ricetta la prevede
  const attese = B.creature.reduce((n, c) => n + c.gradi.length + (c.boss ? 1 : 0), 0);
  assert.equal(voci.filter((v) => v.gruppo === 'Creature pronte').length, attese);
  for (const c of B.creature) {
    for (const g of c.gradi) assert.ok(voci.some((v) => v.chiave === `creatura:${c.id}:${g}`), `manca ${c.id} ${g}`);
    if (c.boss) assert.ok(voci.some((v) => v.chiave === `creatura:${c.id}:${c.boss.grado}:boss`), `manca il Boss di ${c.id}`);
  }
  // basi del cap. 3 a ogni grado, tranne Umano (è il bestiario umano)
  const basiNonUmane = Object.entries(B.basi).filter(([, b]) => !b.umano);
  assert.equal(voci.filter((v) => v.gruppo === 'Basi').length, basiNonUmane.length * B.gradi.length);
  // tutti i file prestabiliti hanno la loro scheda, nessuno in più
  assert.equal(voci.filter((v) => v.gruppo === 'Bestiario umano').length, Object.keys(umani).length);
  assert.equal(voci.filter((v) => v.gruppo === 'Esempi del Tavolo').length, Object.keys(esempi).length);
  assert.equal(new Set(voci.map((v) => v.chiave)).size, voci.length, 'chiavi doppie');

  // ogni scheda ha i valori che la plancia mostra sempre
  for (const v of voci) {
    assert.equal(typeof v.nemico.pv, 'number', `${v.chiave}: PV`);
    assert.ok(v.nemico.ar && typeof v.nemico.ar.totale === 'number', `${v.chiave}: AR`);
    assert.equal(typeof v.nemico.difese, 'number', `${v.chiave}: Difese`);
    assert.equal(typeof v.nemico.iniziativa, 'number', `${v.chiave}: Iniziativa`);
    assert.ok(v.nemico.movimento?.passo != null, `${v.chiave}: Movimento`);
    assert.ok(Object.keys(v.nemico.caratteristiche ?? {}).length > 0, `${v.chiave}: Caratteristiche`);
  }
  // il bestiario è una proposta: tutte le sue schede lo dicono; gli esempi del Tavolo no
  for (const v of voci) {
    const atteso = v.gruppo !== 'Esempi del Tavolo';
    assert.equal(v.proposta, atteso, `${v.chiave}: marchio della proposta`);
  }
});

test('nessun dato privato: lo strumento legge solo data/ ed esempi/nemici/', async () => {
  const sorgente = readFileSync(new URL('tools/bestiario_pagina.mjs', RADICE), 'utf8');
  // nessun percorso dentro le cartelle reali del server o dei PG («esempi/nemici/» è la cartella tracciata in git)
  const sorgenteNetta = sorgente.replaceAll('esempi/nemici/', '');
  for (const c of CARTELLE_VIETATE) {
    assert.doesNotMatch(sorgenteNetta, new RegExp(`['\`/]${c}/`), `lo strumento nomina la cartella ${c}/`);
  }
  // le sole radici di lettura dichiarate nel codice
  const letture = [...sorgente.matchAll(/new URL\(`([^`$]*)/g)].map((m) => m[1]).filter(Boolean);
  for (const p of letture) assert.ok(/^(data\/|esempi\/nemici\/)/.test(p), `radice di lettura inattesa: ${p}`);

  const html = aperta(readFileSync(new URL(FILE_PAGINA, RADICE), 'utf8'));
  for (const c of CARTELLE_VIETATE) {
    // «esempi/nemici/» è lecito: è la cartella tracciata in git
    const senzaEsempi = html.replaceAll('esempi/nemici/', '');
    assert.ok(!senzaEsempi.includes(`${c}/`), `la pagina nomina la cartella ${c}/`);
  }
  // niente nomi dei PG reali: la pagina non carica personaggi
  assert.doesNotMatch(html, /mutant-personaggio|"scelte"|correzioni_master|circostanze_master/);
});

// Fallisce se si cambiano i dati del bestiario o i nemici prestabiliti senza rigenerare la pagina
// (CLAUDE.md: si rigenera nello stesso commit). Rimedio: node tools/bestiario_pagina.mjs
test('la pagina sul disco corrisponde ai dati (node tools/bestiario_pagina.mjs --controlla)', async () => {
  const s = await stato(RADICE);
  assert.ok(s.aggiornato, `${FILE_PAGINA} è vecchia rispetto ai dati: esegui node tools/bestiario_pagina.mjs e committa la pagina`);
});

test('la pagina è un file solo: nessuna risorsa esterna e nessuna data di generazione', () => {
  const html = aperta(readFileSync(new URL(FILE_PAGINA, RADICE), 'utf8'));
  assert.doesNotMatch(html, /<(script|link|img|iframe)[^>]+(src|href)=/i, 'la pagina deve essere autosufficiente');
  // dagli stessi dati esce sempre lo stesso file: niente date dentro
  assert.doesNotMatch(html, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  // i file dei nemici prestabiliti ci sono tutti
  const umani = readdirSync(new URL('esempi/nemici/umani/', RADICE)).filter((x) => x.endsWith('.json'));
  assert.equal((html.match(/data-categoria="Bestiario umano"/g) ?? []).length, umani.length);
});

test('la pagina porta anche il testo del manuale proposto, con i suoi capitoli', () => {
  const html = aperta(readFileSync(new URL(FILE_PAGINA, RADICE), 'utf8'));
  const md = readFileSync(new URL('docs/bestiario/bestiario.md', RADICE), 'utf8');
  const capitoli = md.split(/\r?\n/).filter((r) => /^# /.test(r)).length - 1; // meno il titolo
  const manuale = html.slice(html.indexOf('<article id="manuale">'));
  assert.equal((manuale.match(/<h1 id="/g) ?? []).length, capitoli);
  assert.match(manuale, /<h1 id="capitolo-1-come-si-usa-il-bestiario">/);
  assert.match(manuale, /<h1 id="appendice-a-taratura">/);
  assert.equal((manuale.match(/<nav class="indice">/g) ?? []).length, 1);
});

// --- lotto 144: peso della pagina e testi comuni scritti una volta sola ---------------------------------------

test('peso: la pagina pubblicata sta sotto 1 MB (le schede viaggiano compresse) ed è completa una volta aperta', () => {
  const grezzo = readFileSync(new URL(FILE_PAGINA, RADICE), 'utf8');
  assert.ok(Buffer.byteLength(grezzo) < 1024 * 1024, `la pagina pesa ${Math.round(Buffer.byteLength(grezzo) / 1024)} KB`);
  assert.match(grezzo, /id="dati-schede"/);
  assert.match(grezzo, /id="caricamento"/);
  const aperto = aperta(grezzo);
  assert.ok((aperto.match(/<article class="scheda"/g) ?? []).length >= 451);
  // il testo di ogni scheda e il «(provvisori)» dei PX sono nella pagina aperta
  assert.match(aperto, /PX provvisori nel manuale: da verificare al tavolo/);
});

test('testi comuni: un testo lungo ripetuto sta una sola volta; la scheda lo richiama e mantiene il nome', () => {
  const lungo = 'Natura Comune, mente e PM personali; respira, mangia, beve e riposa; ' + 'x'.repeat(120);
  const a = `<article><ul><li><b>Corpo</b> — ${lungo}</li><li><b>Morso</b> — breve</li></ul></article>`;
  const b = `<article><ul><li><b>Corpo</b> — ${lungo}</li></ul><p class="nota">nota breve</p></article>`;
  const { schede, comuni } = condividiTesti([a, b]);
  assert.deepEqual(comuni, [lungo]);
  assert.ok(schede.every((s) => !s.includes(lungo)));
  assert.match(schede[0], /<li><b>Corpo<\/b> — <a class="comune" href="#comune-1" data-comune="1">testo comune<\/a><\/li>/);
  assert.match(schede[0], /<li><b>Morso<\/b> — breve<\/li>/); // il corto non si tocca
  assert.match(schede[1], /nota breve/);
  // un testo lungo ma unico resta nella scheda
  const solo = condividiTesti([`<li><b>A</b> — ${lungo}</li>`, '<li><b>B</b> — altro</li>']);
  assert.deepEqual(solo.comuni, []);
});

test('pagina compressa: lo script apre le schede, poi ricerca, filtri e testi comuni funzionano (simulazione senza browser)', async () => {
  const { dati } = await datiReali();
  const { esempi, umani, mostri } = await esempiNemici(RADICE);
  const voci = vociPagina(dati, { esempi, umani, mostri });
  const html = paginaHtml(voci, dati, '', { compressa: true });
  const m = html.match(/id="dati-schede" data-lunghezza="(\d+)">([^<]*)</);
  const corpo = inflateRawSync(Buffer.from(m[2], 'base64')).toString();
  assert.equal(Buffer.byteLength(corpo), Number(m[1]), 'la lunghezza dichiarata è quella vera');
  assert.equal((corpo.match(/<article class="scheda"/g) ?? []).length, voci.length);
  assert.equal((corpo.match(/<section id="comuni"/g) ?? []).length, 1);
  // ogni rimando punta a un testo che c'è, e ogni testo comune compare una volta sola
  const rimandi = new Set([...corpo.matchAll(/data-comune="(\d+)"/g)].map((x) => x[1]));
  for (const n of rimandi) assert.equal((corpo.match(new RegExp(`id="comune-${n}"`, 'g')) ?? []).length, 1, `testo comune ${n}`);
  assert.ok(rimandi.size > 0, 'nessun testo comune trovato');
  // il filtro del grado e il «Manuale dei Mostri» restano nella parte non compressa
  assert.match(html, /data-filtro="categoria"/);
  // niente funzioni recenti: la pagina non usa DecompressionStream, apre le schede con la sua inflar()
  assert.doesNotMatch(html, /DecompressionStream/);
  assert.match(html, /function inflar\(src,n\)/);
});

// --- lotto 145: la pagina si apre anche sui browser vecchi ---------------------------------------------------------

import { INFLATE_JS } from '../tools/bestiario_pagina.mjs';
const motore = (finestra = {}) => new Function('window', 'escape', `${INFLATE_JS}; return { inflar: inflar, daByte: daByte };`)(finestra, escape);

test('browser vecchi: inflar() della pagina dà gli stessi byte di zlib su ogni tipo di blocco (vuoto, fisso, dinamico, non compresso, ripetizioni lunghe)', () => {
  const { inflar } = motore();
  const casi = [
    ['vuoto', Buffer.alloc(0), 6],
    ['breve (Huffman fisso)', Buffer.from('ciao ciao ciao'), 6],
    ['non compresso (livello 0)', Buffer.from('testo senza compressione '.repeat(40)), 0],
    ['ripetizione lunga (258)', Buffer.alloc(5000, 97), 9],
    ['dinamico, testo italiano con accenti', Buffer.from('Perché l’Iniziativa è già così: «più è meglio» — àèéìòù '.repeat(300)), 9],
    ['casuale (blocchi non compressi misti)', Buffer.from(Array.from({ length: 70000 }, (_, i) => (i * 2654435761 >>> 24) & 255)), 1],
  ];
  for (const [nome, byte, livello] of casi) {
    const compresso = deflateRawSync(byte, { level: livello });
    assert.deepEqual(Buffer.from(inflar(new Uint8Array(compresso), byte.length)), byte, nome);
  }
});

test('browser vecchi: inflar() apre il blocco vero della pagina pubblicata, uguale a zlib, e dice che cosa non va se i dati sono rotti', () => {
  const { inflar, daByte } = motore();
  const grezzo = readFileSync(new URL(FILE_PAGINA, RADICE), 'utf8');
  const m = grezzo.match(/id="dati-schede" data-lunghezza="(\d+)">([^<]*)</);
  const compresso = Buffer.from(m[2], 'base64');
  const fuori = inflar(new Uint8Array(compresso), Number(m[1]));
  assert.equal(Buffer.compare(Buffer.from(fuori), inflateRawSync(compresso)), 0);
  // lettura UTF-8 con TextDecoder e senza (il ripiego dei browser che non lo hanno)
  const testo = inflateRawSync(compresso).toString();
  assert.equal(motore({ TextDecoder }).daByte(fuori), testo);
  assert.equal(motore({}).daByte(fuori), testo, 'senza TextDecoder');
  assert.match(testo, /Scavafosse/);
  // dati troncati, lunghezza sbagliata: un errore con il motivo, mai una pagina muta
  assert.throws(() => inflar(new Uint8Array(compresso.subarray(0, 100)), Number(m[1])), /troncati|non valid/);
  assert.throws(() => inflar(new Uint8Array(compresso), Number(m[1]) + 5), /lunghezza inattesa/);
  void daByte;
});

test('browser vecchi: il codice della pagina è ES5 (niente frecce, let/const, classi, template, async), con ripiego per ciò che manca', () => {
  const grezzo = readFileSync(new URL(FILE_PAGINA, RADICE), 'utf8');
  const script = grezzo.slice(grezzo.lastIndexOf('<script>'), grezzo.lastIndexOf('</script>'));
  assert.doesNotMatch(script, /=>|\blet |\bconst |\bclass |\basync |\bawait |\.\.\.|`/, 'sintassi recente nello script della pagina');
  assert.doesNotMatch(script, /querySelectorAll\([^)]*\)\.forEach/, 'NodeList.forEach non c’è nei browser vecchi');
  assert.match(script, /t\.normalize\?/, 'ripiego senza String.normalize');
  assert.match(grezzo, /Non riesco ad aprire le schede su questo browser/, 'messaggio se le schede non si aprono');
  assert.match(grezzo, /id="caricamento"/);
});
