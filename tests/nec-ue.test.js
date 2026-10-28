// Lotto 1 dei manuali del 27–28/10/2026 (docs/diff-manuali-2026-10-28.md; tools/lotti/lotto_nec_ue.mjs): i NEC in
// Unità Energetiche e l'elettronica ordinaria senza conteggi (Equipaggiamento 0.13, §5.4).
//  - nessuna voce del catalogo ancora in Lx dove il manuale ha le UE (salvo il lotto 2: A.189–A.191);
//  - nessun contatore per l'elettronica ordinaria;
//  - i valori calcolati dei sette PG (copie in tests/fixtures/talenti-vecchi/) identici con i dati di prima e di dopo,
//    contatori dell'energia a parte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { datiReali } from './helpers.js';
import { caricaDati } from '../src/rules.js';
import { catalogo, riserveNec, infoNecSenzaConteggio } from '../src/equipaggiamento.js';
import { calcolaSchedaPersonaggio } from '../src/avanzamento.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const R = dati.regole.nec;
const LX = /\bLx\b|Lx\/h|cr\/Lx|_lx\b|lx_|"lx"/;
const lotto2 = (o) => R.lotto_2.file.includes(o.file) || R.lotto_2.voci.includes(`${o.file}:${o.id}`) || (o.file === 'nec' && R.lotto_2.nec.includes(o.id));

test('nessuna voce del catalogo in Lx fuori dal lotto 2 (celle d’arma, pacchi, caricatori, IAS: A.189–A.191)', () => {
  const inLx = cat.oggetti.filter((o) => !lotto2(o) && LX.test(JSON.stringify({ ...o, file: undefined })));
  assert.deepEqual(inLx.map((o) => o.rif), []);
  // le dotazioni del §2.16 (Giocatore 0.50) e le regole fuori dal lotto 2
  assert.ok(!LX.test(JSON.stringify(dati.dotazioni)), 'dotazioni.json');
  // fuori dal lotto 2 i Lx restano solo dove si parla delle riserve salvate prima (A.193) e nei passi del lotto 2
  const { lotto_2: _l2, da_convertire: _dc, _nota, passi_tavolo: { lx: _a, lx_grandi: _b, ...passi }, ...regole } = R;
  assert.ok(!LX.test(JSON.stringify({ ...regole, passi })), 'regole.json → nec');
  assert.equal(R.unita, 'UE');
});

test('nessun contatore per l’elettronica ordinaria; al suo posto la riga «NEC compreso, senza conteggio»', () => {
  const ordinarie = cat.oggetti.filter((o) => (o.alimentazione && !Array.isArray(o.alimentazione) && o.alimentazione.ordinaria) || o.nec?.uso === 'elettronica_ordinaria');
  assert.ok(ordinarie.length >= 35, `${ordinarie.length} voci`);
  for (const o of ordinarie) {
    const v = { uid: 'x', rif: o.rif, stato: 'zaino', quantita: 1, note: '' };
    assert.deepEqual(riserveNec([v], dati), [], o.rif);
    assert.match(infoNecSenzaConteggio(v, dati)?.testo ?? '', /senza conteggio/, o.rif);
  }
  // torcia, comunicatore, visore e mirino ci sono
  for (const rif of ['dotazioni_personali:torcia-elettrica', 'comunicazione:comunicatore-personale', 'comunicazione:visore-notturno', 'accessori_armi:torcia-tattica', 'elmetti:elmetto-asa-recon']) assert.ok(ordinarie.some((o) => o.rif === rif), rif);
  // i dispositivi con un contatore proprio lo tengono, in ore o usi (§5.4.8)
  const conti = (rif) => riserveNec([{ uid: 'x', rif, stato: 'zaino', quantita: 1, note: '' }], dati).map((x) => `${x.massimo} ${x.unita}`);
  assert.deepEqual(conti('esplorazione:verricello-portatile-chroma'), ['5 ore']);
  assert.deepEqual(conti('esplorazione:tuta-extraveicolare'), ['40 ore']);
  assert.deepEqual(conti('esplorazione:riparo-pressurizzato'), ['20 ore']);
  assert.deepEqual(conti('esplorazione:corredo-da-cucina-da-campo'), ['10 preparazioni']);
  assert.deepEqual(conti('strumenti_professionali:utensile-laser-da-taglio-e-saldatura'), ['5 ore']);
  assert.deepEqual(conti('nec:modulo-rosso'), ['10 UER']);
  assert.deepEqual(conti('nec:banco-verde'), ['100 UEV']);
  // il Rosso standard degli utensili: capacità da definire, nessun numero
  assert.deepEqual(conti('nec:rosso-standard'), []);
});

// --- i sette PG: valori calcolati con i dati di prima (commit c314aed) e di adesso ------------------------------
const RADICE = fileURLToPath(new URL('../', import.meta.url));
const daGit = (nome) => Promise.resolve(execFileSync('git', ['-C', RADICE, 'show', `c314aed:data/${nome}.json`], { encoding: 'utf8', maxBuffer: 1e8 }));
const prima = (await caricaDati(daGit)).dati;

/** I valori che contano al tavolo, senza i contatori dell'energia. */
function valori(o, d) {
  const p = { creazione: o.scelte, livelli: o.livelli, sessione: o.sessione };
  const s = calcolaSchedaPersonaggio(p, d);
  const m = massimiSessione(s, o.scelte, d);
  const ses = allineaSessione(o.sessione, m);
  const { nec: _n, ...sessioneSenzaNec } = ses;
  return JSON.stringify({
    pv: s.pv, pm: s.pm, iniziativa: s.iniziativa, movimento: s.movimento, salvezze: s.salvezze,
    abilita: s.abilita?.map((a) => [a.nome, a.totale, a.effettivo, a.vaEquip]),
    ar: s.equipaggiamento?.arEffettiva ?? s.equipaggiamento?.ar, carico: s.carico && { peso: s.carico.peso, livello: s.carico.livello?.id ?? s.carico.livello },
    armi: s.equipaggiamento?.armi?.map((x) => [x.nome, x.va, x.danno]),
    costi: (o.scelte.equipaggiamento ?? []).map((v) => catalogo(d).perRif.get(v.rif)?.costo ?? null),
    sessione: sessioneSenzaNec,
  });
}

test('i sette PG: PV, PM, VA, Salvezze, AR, carico, armi, costi e sessione identici prima e dopo (contatori dell’energia a parte)', () => {
  const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
  const files = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json');
  assert.equal(files.length, 7);
  for (const f of files) {
    const o = JSON.parse(readFileSync(new URL(f, FIX), 'utf8'));
    assert.equal(valori(o, dati), valori(o, prima), f);
    // C (A.193): nessuna riserva salvata sparisce dal file, anche quando non ha più contatore
    const sc = calcolaSchedaPersonaggio({ creazione: o.scelte, livelli: o.livelli }, dati);
    const ses = allineaSessione(o.sessione, massimiSessione(sc, o.scelte, dati));
    for (const [k, n] of Object.entries(o.sessione?.nec ?? {})) assert.equal(ses.nec[k], n, `${f}: ${k}`);
    // e nessuna riserva dell'elettronica ordinaria diventa un contatore
    const contati = riserveNec(o.scelte.equipaggiamento, dati).map((x) => x.uid);
    for (const v of o.scelte.equipaggiamento ?? []) if (infoNecSenzaConteggio(v, dati)) assert.ok(!contati.includes(v.uid), `${f}: ${v.uid}`);
  }
});
