// Lotto 174 (05/11/2026): su un PC «copia di prova» (la fascia gialla in cima) la pagina della mappa si riduceva a
// circa 50 px. Causa: una regola del 20/10, «body.con-fascia-copia:has(.mappa-pagina) { height: auto; min-height:
// 100dvh }», che toglieva al body l'altezza fissa della finestra: il main (flex: 1) non aveva più un'altezza da
// riempire e la tela, che si misura sul suo contenitore, si schiacciava o cresceva senza fine. Questi controlli
// falliscono se l'altezza della mappa torna a dipendere dalla fascia, e se le colonne incollate delle altre pagine
// tornano a misurarsi sulla finestra intera, finendo dietro la fascia.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { altezzaCoperta, SELETTORE_FASCE } from '../src/ui/altezza-fasce.js';

const CSS = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

/** Le regole del foglio, appiattite: { selettore, dichiarazioni: Map, media }. Basta per questo foglio (niente stringhe con graffe). */
function regole(testo) {
  const t = testo.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const leggi = (da, a, media) => {
    let i = da;
    while (i < a) {
      const ap = t.indexOf('{', i);
      if (ap < 0 || ap >= a) break;
      const testa = t.slice(i, ap).trim();
      let livello = 1; let j = ap + 1;
      while (j < a && livello) { if (t[j] === '{') livello++; else if (t[j] === '}') livello--; j++; }
      const corpo = t.slice(ap + 1, j - 1);
      if (testa.startsWith('@')) leggi(ap + 1, j - 1, `${media} ${testa}`.trim());
      else {
        const d = new Map();
        for (const pezzo of corpo.split(';')) {
          const k = pezzo.indexOf(':');
          if (k > 0) d.set(pezzo.slice(0, k).trim(), pezzo.slice(k + 1).trim());
        }
        out.push({ selettore: testa.replace(/\s+/g, ' '), dichiarazioni: d, media });
      }
      i = j;
    }
  };
  leggi(0, t.length, '');
  return out;
}

const TUTTE = regole(CSS);
const ALTEZZE = ['height', 'min-height', 'max-height', 'flex', 'flex-grow', 'flex-basis', 'display', 'position', 'top'];
const classiFasce = SELETTORE_FASCE.split(',').map((s) => s.trim().slice(1));

test('il lettore del foglio trova le regole della mappa (se non le trova, il resto non prova niente)', () => {
  assert.ok(TUTTE.length > 500);
  assert.ok(TUTTE.some((r) => r.selettore === 'body:has(.mappa-pagina)'));
});

test('nessuna regola che dipende dalla fascia cambia l’altezza o la disposizione della mappa', () => {
  for (const r of TUTTE) {
    if (!r.selettore.includes('con-fascia-copia')) continue;
    for (const p of ALTEZZE) assert.ok(!r.dichiarazioni.has(p), `«${r.selettore}» imposta ${p}: l’altezza della pagina non deve dipendere dalla fascia`);
  }
  // e nessuna regola sulla mappa che nomina il body con o senza fascia
  for (const r of TUTTE) {
    if (!r.selettore.includes('mappa-pagina')) continue;
    assert.ok(!/con-fascia|senza-fascia/.test(r.selettore), `«${r.selettore}»: la mappa non distingue le installazioni`);
  }
});

test('la catena delle altezze della mappa parte dalla finestra e non dalla fascia', () => {
  const una = (sel) => {
    const rr = TUTTE.filter((r) => r.selettore === sel && !r.media);
    assert.equal(rr.length, 1, `una regola sola per «${sel}»`);
    return rr[0].dichiarazioni;
  };
  const body = una('body:has(.mappa-pagina)');
  assert.equal(body.get('display'), 'flex');
  assert.equal(body.get('flex-direction'), 'column');
  assert.equal(body.get('height'), '100dvh', 'il body della mappa è alto quanto la finestra');
  assert.equal(body.get('overflow'), 'hidden');
  const main = una('main:has(> .mappa-pagina)');
  assert.equal(main.get('flex'), '1', 'il main prende quello che resta');
  assert.equal(main.get('min-height'), '0');
  // le righe sopra la mappa (fascia compresa) tengono la loro altezza e non si allungano
  assert.equal(una('body:has(.mappa-pagina) > :not(main)').get('flex'), 'none');
  const fascia = una('body:has(.mappa-pagina) .fascia-copia-di-lavoro');
  assert.equal(fascia.get('position'), 'static', 'sulla mappa la fascia è una riga della colonna, non incollata sopra');
  assert.equal(fascia.get('flex'), 'none');
  // nessun’altra regola, nemmeno in un @media, rimette un’altezza al body della mappa
  for (const r of TUTTE.filter((x) => /^body[^ ]*:has\(\.mappa-pagina\)$/.test(x.selettore))) {
    for (const p of ['height', 'min-height', 'max-height']) {
      if (!r.dichiarazioni.has(p)) continue;
      assert.equal(r.dichiarazioni.get(p), '100dvh', `«${r.selettore}» ${r.media}: ${p} ${r.dichiarazioni.get(p)}`);
    }
  }
});

test('la fascia non sparisce e non si riduce (si corregge la mappa, non la fascia)', () => {
  const f = TUTTE.find((r) => r.selettore === '.fascia-copia-di-lavoro' && !r.media);
  assert.ok(f);
  assert.equal(f.dichiarazioni.get('position'), 'sticky');
  for (const r of TUTTE.filter((x) => x.selettore.includes('fascia-copia-di-lavoro') && !x.media.includes('print'))) {
    assert.notEqual(r.dichiarazioni.get('display'), 'none', `«${r.selettore}» nasconde la fascia`);
    assert.ok(!r.dichiarazioni.has('height') && !r.dichiarazioni.has('max-height'), `«${r.selettore}» limita la fascia`);
  }
});

test('le colonne incollate delle altre pagine si fermano sotto le fasce e ne sottraggono l’altezza', () => {
  // ogni elemento della pagina incollato in alto (sticky con top) che non è una delle fasce stesse parte da --alto-fasce
  const eccezioni = [
    /\.attacco-passo\.passo-risultato/, // dentro il pannello di «Attacca!», che scorre per conto suo
    /\.pannello-testa/, // testata dei pannelli in sovrimpressione
    /\.laterale-segnalibri/, // dentro la barra laterale della mappa, che scorre per conto suo
  ];
  const incollate = TUTTE.filter((r) => r.dichiarazioni.get('position') === 'sticky' && r.dichiarazioni.has('top'));
  assert.ok(incollate.length >= 10);
  for (const r of incollate) {
    if (classiFasce.some((c) => r.selettore === `.${c}`) || r.selettore === '.barra-aggiornamento') continue;
    if (eccezioni.some((e) => e.test(r.selettore))) continue;
    assert.match(r.dichiarazioni.get('top'), /--alto-fasce/, `«${r.selettore}» (top ${r.dichiarazioni.get('top')}) finisce dietro la fascia`);
  }
  // le altezze massime calcolate sulla finestra tolgono le fasce (salvo i pannelli in sovrimpressione, sopra tutto)
  const sopra = [/\.pannello-scheda/, /\.finestrella/, /\.galleria-sovrapposizione/, /\.menu-voci/];
  for (const r of TUTTE) {
    const v = r.dichiarazioni.get('max-height');
    if (!v || !/100d?vh/.test(v) || !/calc/.test(v)) continue;
    if (sopra.some((e) => e.test(r.selettore))) continue;
    assert.match(v, /--alto-fasce/, `«${r.selettore}»: max-height ${v} non toglie le fasce`);
  }
});

// lotto 177: le righe in cima si impilano, quindi coprono la somma e non più la più alta
test('altezzaCoperta: quanto coprono in tutto le righe incollate in cima; 0 senza righe', () => {
  assert.equal(altezzaCoperta([]), 0);
  assert.equal(altezzaCoperta(undefined), 0);
  assert.equal(altezzaCoperta([{ position: 'sticky', top: '0px', altezza: 41.6 }]), 42);
  assert.equal(altezzaCoperta([{ position: 'sticky', top: '0px', altezza: 42 }, { position: 'sticky', top: '0px', altezza: 30 }]), 72);
  // sulla mappa la fascia è static: non copre niente, occupa il suo posto nella colonna
  assert.equal(altezzaCoperta([{ position: 'static', top: 'auto', altezza: 42 }]), 0);
  // la pillola del rientro sulla mappa è fixed in basso: non copre l’alto
  assert.equal(altezzaCoperta([{ position: 'fixed', top: 'auto', altezza: 50 }]), 0);
});
