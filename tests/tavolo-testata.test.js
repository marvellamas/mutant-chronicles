// Tavolo del Master, ritocchi del 09/10 (Marcello): nel riquadro «Scontro» senza scontro aperto «Nuovo scontro al volo»
// e accanto «Prepara scontro»; la testata della pagina a gruppi con etichetta (Tavolo, Gioco, Nemici, Sessione).
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installaDomFinto, togliDomFinto } from './dom-finto.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const testi = (el) => (el.children ?? []).flatMap((c) => [c.tagName === 'BUTTON' ? c.textContent : null, ...testi(c)]).filter(Boolean);
const trova = (el, testo) => (el.tagName === 'BUTTON' && el.textContent === testo ? el : (el.children ?? []).map((c) => trova(c, testo)).find(Boolean) ?? null);

test('«Scontro» senza scontro aperto: «Nuovo scontro al volo» e «Prepara scontro», che apre la preparazione', async () => {
  installaDomFinto();
  try {
    const { pannelloScontro } = await import('../src/ui/scontro.js');
    let creato = null;
    let preparato = 0;
    const pg = [{ chiaveCartella: 'Lia', nome: 'Lia', iniziativa: 3, des: 6, int: 5 }];
    const az = { crea: (s) => { creato = s; }, prepara: () => { preparato++; }, modifica: () => {}, ridisegna: () => {} };
    const p = pannelloScontro({ dati }, { scontro: null, pgAlTavolo: pg }, az);
    assert.deepEqual(testi(p), ['Nuovo scontro al volo', 'Prepara scontro']);
    trova(p, 'Prepara scontro').ascolti.click?.[0]?.() ?? trova(p, 'Prepara scontro').onclick?.();
    assert.equal(preparato, 1);
    // senza la preparazione (per esempio altre viste) resta il solo «Nuovo scontro al volo»
    assert.deepEqual(testi(pannelloScontro({ dati }, { scontro: null, pgAlTavolo: pg }, { ...az, prepara: null })), ['Nuovo scontro al volo']);
    // lotto 246: senza PG al tavolo «Nuovo scontro al volo» NON è più spento (una trappola o un pericolo d'ambiente
    // sono uno scontro di soli nemici): resta acceso, con il motivo scritto accanto e i partecipanti si aggiungono dopo
    const vuoto = pannelloScontro({ dati }, { scontro: null, pgAlTavolo: [] }, az);
    const b = trova(vuoto, 'Nuovo scontro al volo');
    assert.equal(b.attributi.disabled === undefined && b.disabled !== true, true, 'acceso');
    assert.match(b.attributi.title ?? b.title ?? '', /Nessun PG al tavolo/, 'con il motivo scritto');
    assert.equal(creato, null);
  } finally {
    togliDomFinto();
  }
});

test('testata del Tavolo: gruppi Tavolo, Gioco, Nemici e Sessione con i loro pulsanti; la guida è un pulsante', () => {
  const tavolo = readFileSync(new URL('../src/ui/tavolo.js', import.meta.url), 'utf8');
  const blocco = tavolo.slice(tavolo.indexOf('const testataGruppi'), tavolo.indexOf("gruppoTesta('Sessione'") + 120);
  const ordine = ["gruppoTesta('Tavolo'", 'btnChi', 'btnAggiungi', 'btnPersonaggi', "gruppoTesta('Gioco'", 'btnPrepara', "'Mappa')", 'guida', "gruppoTesta('Nemici'", 'btnCrea', 'btnEsempi', "gruppoTesta('Sessione'"];
  let da = 0;
  for (const pezzo of ordine) {
    const i = blocco.indexOf(pezzo, da);
    assert.ok(i >= 0, `manca o è fuori ordine: ${pezzo}`);
    da = i;
  }
  assert.match(tavolo, /guida\.className = 'btn'/);
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.plancia-gruppo\.gruppo-sessione \{ margin-left: auto; \}/);
  assert.match(css, /\.plancia-gruppo \{ display: inline-flex; flex-wrap: nowrap;/);
});
