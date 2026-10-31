// NEC e accumulatori: lotto 1 (28/10, Unità Energetiche, elettronica ordinaria senza conteggi) rifatto dal lotto 2 (30/10,
// lotto 146) sulle edizioni nuove (Equipaggiamento 0.22 §5.4, Armamenti 0.68, registro Revisione NEC 2.7): si contano le
// cariche di NEC, pacchi, CEC, MEC e BEC; le UE sono solo dimensionamento.
//  - nessuna voce del catalogo in Lx;
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

test('nessuna voce del catalogo in Lx: né le celle d’arma, né i pacchi, né gli IAS (A.189–A.191, Armamenti 0.68)', () => {
  // `precedente` è la capacità di prima, tenuta apposta per convertire le riserve salvate (A.193): non è una voce in Lx
  const inLx = cat.oggetti.filter((o) => LX.test(JSON.stringify({ ...o, file: undefined }, (k, v) => (k === 'precedente' ? undefined : v))));
  assert.deepEqual(inLx.map((o) => o.rif), []);
  // le dotazioni del §2.16 (Giocatore 0.50) e le regole dei NEC
  assert.ok(!LX.test(JSON.stringify(dati.dotazioni)), 'dotazioni.json');
  const { da_convertire: _dc, _nota, ...regole } = R;
  assert.ok(!LX.test(JSON.stringify(regole)), 'regole.json → nec');
  assert.equal(R.unita, 'carica');
  assert.equal(R.lotto_2, undefined, 'il lotto 2 è chiuso');
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
  // i dispositivi con un contatore proprio lo tengono, in cariche (0.22, §5.4.8)
  const conti = (rif) => riserveNec([{ uid: 'x', rif, stato: 'zaino', quantita: 1, note: '' }], dati).map((x) => `${x.massimo} ${x.unita}`);
  assert.deepEqual(conti('esplorazione:verricello-portatile-chroma'), ['5 cariche (sessioni da un’ora)']);
  assert.deepEqual(conti('esplorazione:tuta-extraveicolare'), ['10 cariche (impieghi da 4 ore)']);
  assert.deepEqual(conti('esplorazione:riparo-pressurizzato'), ['10 cariche (impieghi da 2 ore)']);
  assert.deepEqual(conti('esplorazione:corredo-da-cucina-da-campo'), ['10 cariche (preparazioni)']);
  assert.deepEqual(conti('strumenti_professionali:utensile-laser-da-taglio-e-saldatura'), ['5 cariche (sessioni da un’ora)']);
  // gli accumulatori in cariche: NEC, pacchi, CEC, MEC e BEC
  assert.deepEqual(conti('nec:cec-rosso'), ['10 cariche']);
  assert.deepEqual(conti('nec:bec-verde'), ['10 cariche']);
  assert.deepEqual(conti('nec:rosso-standard'), ['5 cariche']);
  assert.deepEqual(conti('nec:pacco-30-blu'), ['30 cariche']);
  // il NEC Verde 1 e 3 dell'elettronica ordinaria non si contano
  assert.deepEqual(conti('nec:verde-compatto'), []);
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
  const { nec: _n, trasformatori: _t, ...sessioneSenzaNec } = ses;
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
    // C (A.193): nessuna riserva salvata sparisce dal file, anche quando non ha più contatore o è «da convertire»
    const sc = calcolaSchedaPersonaggio({ creazione: o.scelte, livelli: o.livelli }, dati);
    const ses = allineaSessione(o.sessione, massimiSessione(sc, o.scelte, dati));
    for (const [k, n] of Object.entries(o.sessione?.nec ?? {})) assert.equal(ses.nec[k], n, `${f}: ${k}`);
    // e nessuna riserva dell'elettronica ordinaria diventa un contatore
    const contati = riserveNec(o.scelte.equipaggiamento, dati).map((x) => x.uid);
    for (const v of o.scelte.equipaggiamento ?? []) if (infoNecSenzaConteggio(v, dati)) assert.ok(!contati.includes(v.uid), `${f}: ${v.uid}`);
  }
});
