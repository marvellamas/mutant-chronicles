import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 204 (16/11/2026), parte C — **quello che si vede al tavolo.**
//
// Davide prepara gli scontri dal suo manuale. Se una scheda porta valori di due edizioni deve saperlo guardandola,
// altrimenti legge un numero sul manuale, ne vede un altro nell'app e non ha modo di capire quale vale.
// Una riga, non un riquadro: in alto lo spazio è quello che è (regola del 26/10).
//
// **I due controlli che devono restare verdi sempre:** la riga c'è quando la scheda è mista, e **sparisce da sé**
// quando è tutta all'edizione corrente — come il segno delle creature provvisorie del lotto 183, che si spegne
// quando la fonte cambia. Un avviso che resta acceso per sempre si smette di leggere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rigaProvenienza, edizioneCorrente, schedaMista, quadroProvenienza, campiNonCorrenti } from '../src/provenienza-bestiario.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const RADICE = fileURLToPath(new URL('..', import.meta.url));

/** Tutte le schede del corpus, dai file. */
function corpus() {
  const out = [];
  const visita = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      if (f.isDirectory()) visita(join(d, f.name));
      else if (f.name.endsWith('.json')) {
        const j = JSON.parse(readFileSync(join(d, f.name), 'utf8'));
        if (j?.nome) out.push(j);
      }
    }
  };
  visita(join(RADICE, 'esempi', 'nemici'));
  return out;
}
const C = corpus();

test('l’edizione corrente si chiede ai dati, non a una scritta nel codice', () => {
  const ed = edizioneCorrente(dati);
  assert.equal(ed, 'Mostri 0.69');
  assert.equal(edizioneCorrente({}), null, 'senza i dati non si inventa un’edizione');
});

test('una scheda mista lo dice, e la riga nomina i campi che non vengono dall’edizione corrente', () => {
  const ed = edizioneCorrente(dati);
  const mista = C.find((n) => schedaMista(n, ed));
  assert.ok(mista, 'nel corpus ci sono schede miste: se non ce ne fossero, questo controllo non proverebbe niente');
  const riga = rigaProvenienza(mista, ed);
  assert.ok(riga && riga.length > 20, `${mista.nome}: la riga deve esserci`);
  assert.match(riga, /Mostri 0\.69/, 'si legge qual è l’edizione corrente');
  for (const c of campiNonCorrenti(mista, ed)) assert.ok(riga.includes(c.nome), `${mista.nome}: la riga deve nominare «${c.nome}»`);
  assert.ok(!riga.includes('**'), 'niente marcatori sullo schermo (lezione del lotto 203)');
});

test('una scheda tutta all’edizione corrente non dice niente: la riga si spegne da sé', () => {
  const ed = edizioneCorrente(dati);
  const tutta = C.find((n) => n._bestiario?.campi && !schedaMista(n, ed));
  assert.ok(tutta, 'nel corpus ci sono schede tutte alla 0.69');
  assert.equal(rigaProvenienza(tutta, ed), null, `${tutta.nome}: non c’è niente da dire, e non si dice niente`);
});

test('le schede provvisorie non diventano «miste»: non vengono da un’edizione, e non ne dichiarano una', () => {
  const ed = edizioneCorrente(dati);
  const provvisorie = C.filter((n) => /costruito come PG|esempio del Tavolo/i.test(String(n.fonte ?? '')));
  assert.equal(provvisorie.length, 32, 'le 32 della A.258');
  for (const p of provvisorie) {
    assert.equal(rigaProvenienza(p, ed), null, `${p.nome}: ha già il suo segno «provvisoria», non serve un secondo avviso`);
  }
});

test('il conto dichiarato nei dati coincide con i file: se i due non tornano, uno dei due mente', () => {
  const ed = edizioneCorrente(dati);
  const q = quadroProvenienza(C, ed);
  const CO = dati.formato_nemici.corpus;
  assert.equal(q.schede, CO.schede, 'quante schede');
  assert.equal(q.letti, CO.campi.letti, 'campi letti dall’edizione corrente');
  assert.equal(q.ereditati, CO.campi.ereditati, 'campi ereditati');
  assert.equal(q.senzaProvenienza, CO.campi.senza_provenienza, 'campi delle schede provvisorie');
  assert.equal(q.miste.length, CO.campi.miste, 'schede miste');
  // e il conto per campo
  const perCampo = {};
  for (const m of q.miste) for (const c of m.campi) perCampo[c.campo] = (perCampo[c.campo] ?? 0) + 1;
  assert.deepEqual(perCampo, CO.campi.ereditati_per_campo, 'il conto per campo dichiarato nei dati');
  // il numero dichiarato nei dati si somma davvero
  assert.equal(Object.values(CO.campi.ereditati_per_campo).reduce((a, x) => a + x, 0), CO.campi.ereditati);
});

test('ogni scheda che viene dal manuale dichiara la provenienza di ogni campo che ha', () => {
  const senza = C.filter((n) => n._bestiario?.edizione && !n._bestiario?.campi);
  assert.deepEqual(senza.map((n) => n.nome), [], 'una scheda dal manuale senza la mappa dei campi non si può raccontare al tavolo');
});

test('la mini-scheda della plancia disegna la riga, e solo per le schede miste', () => {
  const src = readFileSync(join(RADICE, 'src', 'ui', 'nemici.js'), 'utf8');
  assert.match(src, /rigaProvenienza/, 'la carta del nemico deve chiamare rigaProvenienza');
  assert.match(src, /edizioneCorrente/, 'e prendere l’edizione dai dati');
  assert.match(src, /riga-provenienza/, 'con la sua classe, per poterla riconoscere nella prova nel browser');
  // niente riquadro: una riga (regola del 26/10, «in alto il minimo spazio possibile»)
  assert.ok(!/riquadro-provenienza/.test(src), 'una riga, non un riquadro');
});
