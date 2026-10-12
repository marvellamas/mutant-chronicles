// Bestiario online (tools/bestiario_pagina.mjs): la pagina si costruisce dai dati del repo con un comando
// solo, contiene soltanto il bestiario e i nemici prestabiliti, e non resta indietro rispetto ai dati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali } from './helpers.js';
import {
  CARTELLE_VIETATE, FILE_PAGINA, esempiNemici, vociPagina, paginaHtml, stato,
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

  const html = readFileSync(new URL(FILE_PAGINA, RADICE), 'utf8');
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
  const html = readFileSync(new URL(FILE_PAGINA, RADICE), 'utf8');
  assert.doesNotMatch(html, /<(script|link|img|iframe)[^>]+(src|href)=/i, 'la pagina deve essere autosufficiente');
  // dagli stessi dati esce sempre lo stesso file: niente date dentro
  assert.doesNotMatch(html, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  // i file dei nemici prestabiliti ci sono tutti
  const umani = readdirSync(new URL('esempi/nemici/umani/', RADICE)).filter((x) => x.endsWith('.json'));
  assert.equal((html.match(/data-categoria="Bestiario umano"/g) ?? []).length, umani.length);
});
