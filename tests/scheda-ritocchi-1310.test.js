// Ritocchi della scheda del giocatore (13/10/2026, richieste di Marcello dopo la sessione del 12/10): solo
// disposizione, salvo le Ferite «Oltre» (tests/ferite-oltre.test.js). Si rende la scheda con il DOM finto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, clic, TAB, ESEMPI, dati } from './scheda-aiuti.js';

const TORVALD = ESEMPI.find((f) => f.startsWith('Torvald'));

// ---------------------------------------------------------------------------
// punto 2: «Bonus dei Talenti» nelle Opzioni, con il segno in testata se è spento

test('l’interruttore dei Talenti non sta più nelle tab: è nelle Opzioni (⚙)', () => {
  for (const attiva of TAB) {
    const r = resa(contesto(TORVALD, { attiva }));
    assert.equal(r.classe('interruttore-talenti').length, 0, `${attiva}: niente riquadro nelle tab`);
    assert.equal(r.classe('opzione-talenti').length, 1, `${attiva}: una voce nelle Opzioni`);
  }
  // e funziona come prima: il tocco chiama la stessa azione
  const ctx = contesto(TORVALD, { attiva: 'combattimento' });
  const r = resa(ctx);
  const casella = r.classe('opzione-talenti')[0].tutti().find((n) => n.tagName === 'INPUT');
  casella.ascolti.change[0]({ target: casella });
  assert.deepEqual(ctx.chiamate.map((x) => x[0]), ['bonusTalenti']);
});

test('con i Talenti spenti la testata lo dice, in ogni tab; accesi non c’è nulla', () => {
  for (const attiva of TAB) {
    const acceso = resa(contesto(TORVALD, { attiva }));
    assert.equal(acceso.classe('segno-talenti-spenti').length, 0, `${attiva}: niente segno con i Talenti accesi`);
    const spento = resa(contesto(TORVALD, { attiva, cambia: (s) => { s.bonusTalenti = false; } }));
    const segno = spento.classe('segno-talenti-spenti');
    assert.equal(segno.length, 1, `${attiva}: il segno c’è`);
    assert.match(segno[0].textContent, /Talenti spenti/);
    assert.ok(spento.classe('testata-comune')[0].tutti().some((n) => n.className === 'segno-talenti-spenti'), `${attiva}: il segno sta nella testata`);
  }
});

// ---------------------------------------------------------------------------
// punto 3: i sei riquadri in basso nel Combattimento

test('Combattimento: sei riquadri in una griglia, Difese per prima e Luce in coda', () => {
  const r = resa(contesto(TORVALD, { attiva: 'combattimento' }));
  const griglia = r.classe('griglia-valori');
  assert.equal(griglia.length, 1, 'una sola griglia dei valori');
  const titoli = griglia[0].children.map((c) => c.tutti().find((n) => n.tagName === 'H3' || n.tagName === 'H2')?.textContent ?? '');
  assert.deepEqual(titoli.map((t) => t.replace(/\s*\(.*$/, '').trim()),
    ['Difese', 'Prove Salvezza', 'Iniziativa', 'Movimento', 'Azioni', 'Luce sul bersaglio'],
    'ordine chiesto: Difese, Prove Salvezza (la più evidente), Iniziativa, Movimento, Azioni, Luce');
  // «Luce sul bersaglio» non è più fuori dalla griglia
  assert.equal(r.classe('riquadro-luce').filter((n) => !n.parent?.className?.includes('griglia-valori')).length, 0);
  // Prove Salvezza: il riquadro grande con il suo colore
  const ps = griglia[0].children.find((c) => /Prove Salvezza/.test(c.textContent));
  assert.match(ps.className, /riquadro-grande/);
});

test('i sei riquadri hanno la stessa struttura: una section con il titolo', () => {
  for (const f of ESEMPI) {
    const r = resa(contesto(f, { attiva: 'combattimento' }));
    const g = r.classe('griglia-valori')[0];
    assert.equal(g.children.length, 6, `${f}: sei riquadri`);
    for (const c of g.children) assert.equal(c.tagName, 'SECTION', `${f}: ogni riquadro è una section`);
  }
});

test('il foglio di stile allinea la griglia e dà un colore proprio alle Prove Salvezza', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.griglia-valori \{[^}]*grid-template-columns[^}]*\}/, 'griglia a colonne');
  assert.match(css, /\.griglia-valori \{[^}]*align-items: stretch/, 'riquadri della stessa altezza');
  assert.match(css, /\.griglia-valori > \.riquadro-grande \{/, 'le Prove Salvezza più grandi');
  assert.match(css, /--salvezze-sfondo/, 'colore proprio, definito nella palette (chiaro e scuro)');
  const palette = readFileSync(new URL('../css/palette.css', import.meta.url), 'utf8');
  assert.ok((palette.match(/--salvezze-sfondo/g) ?? []).length >= 2, 'definito per tema chiaro e scuro');
});

// ---------------------------------------------------------------------------
// punto 4: gli Artefatti con PM nel riquadro laterale dei Punti Magia

test('nel riquadro laterale «Punti Magia» ci sono anche gli Artefatti con PM, a parte', () => {
  const conArtefatti = ESEMPI.map((f) => contesto(f, { attiva: 'combattimento' }))
    .find((c) => (c.tab.scheda.equipaggiamento?.contenitori ?? []).length);
  assert.ok(conArtefatti, 'serve un PG d’esempio con un contenitore di Chroma');
  const r = resa(conArtefatti);
  const lato = r.classe('colonna-risorse')[0] ?? r.radice;
  const blocco = lato.tutti().find((n) => n.className?.includes('cristalli-compatti'));
  assert.ok(blocco, 'il blocco degli Artefatti con PM è nella colonna di sinistra');
  const righe = blocco.tutti().filter((n) => n.className === 'riga-cristallo' || n.className?.startsWith('riga-cristallo'));
  assert.equal(righe.length, conArtefatti.tab.scheda.equipaggiamento.contenitori.length, 'una riga per Artefatto');
  // PM attuali su massimi e i tasti per spendere o ricaricare, come nella tab Artefatti
  assert.match(blocco.textContent, /\d+ \/ \d+/);
  const tasti = righe[0].tutti().filter((n) => n.tagName === 'BUTTON');
  assert.deepEqual(tasti.map((b) => b.textContent), ['−1', '+1', 'Applica']); // 19/10: più il campo ±N con «Applica»
  // non si sommano ai PM del personaggio
  const pm = r.classe('riquadro-pm')[0];
  assert.match(pm.textContent, /non si sommano ai PM personali/);
  assert.match(pm.tutti().find((n) => n.className === 'valore-tavolo').textContent, new RegExp(`^${conArtefatti.sessione.pmAttuali} / ${conArtefatti.massimi.pm}$`));
});

test('chi non ha Artefatti con PM non vede righe in più', () => {
  const senza = ESEMPI.map((f) => contesto(f, { attiva: 'combattimento' }))
    .find((c) => !(c.tab.scheda.equipaggiamento?.contenitori ?? []).length);
  assert.ok(senza);
  assert.equal(resa(senza).classe('cristalli-compatti').length, 0);
});

// ---------------------------------------------------------------------------
// punto 5: «Cerca nella scheda»

test('la ricerca trova la Prova Salvezza Tempra, con qualunque scrittura', async () => {
  const { vociScheda, cercaVoci, testoVoce } = await import('../src/cerca-scheda.js');
  const ctx = contesto(TORVALD, { attiva: 'identita' });
  const voci = vociScheda(ctx.tab.scheda, ctx.sessione, dati);
  for (const q of ['tempra', 'temp', 'TEMPRA', 'Tèmpra']) {
    const r = cercaVoci(voci, q);
    const ps = r.find((x) => x.gruppo === 'Prova Salvezza' && x.nome === 'Tempra');
    assert.ok(ps, `«${q}» deve trovare la Prova Salvezza`);
    assert.match(testoVoce(ps), /^Prova Salvezza Tempra — VA \d+$/);
    assert.equal(ps.tab, 'identita', 'porta alla tab giusta');
    assert.ok(Number.isFinite(ps.tiro.va), 'si può tirare da lì (prompt 78)');
    assert.equal(r.indexOf(ps), 0, 'chi comincia con la parola cercata viene prima');
  }
  assert.deepEqual(cercaVoci(voci, 't'), [], 'con una lettera sola non si cerca');
  assert.deepEqual(cercaVoci(voci, 'zzzz'), []);
});

test('la ricerca copre Abilità, Talenti, oggetti, Stati e il resto della scheda', async () => {
  const { vociScheda } = await import('../src/cerca-scheda.js');
  const ctx = contesto(TORVALD, { attiva: 'identita', cambia: (s) => { s.statiAttivi = ['a-terra']; s.note = 'appunti del giocatore'; } });
  const voci = vociScheda(ctx.tab.scheda, ctx.sessione, dati);
  const gruppi = new Set(voci.map((v) => v.gruppo));
  for (const g of ['Caratteristica', 'Prova Salvezza', 'Abilità', 'Talento', 'Arma', 'Protezione', 'Oggetto', 'Valore', 'Stato attivo', 'Note']) {
    assert.ok(gruppi.has(g), `manca il gruppo ${g}`);
  }
  // ogni voce dice dove andare e che cosa evidenziare
  for (const v of voci) {
    assert.ok(TAB.includes(v.tab), `${v.nome}: tab valida (${v.tab})`);
    assert.ok(v.cerca, `${v.nome}: testo da evidenziare`);
  }
});

test('il campo si apre dall’icona 🔍 della testata e si chiude con ✕', () => {
  const ctx = contesto(TORVALD, { attiva: 'identita' });
  const chiuso = resa(ctx);
  const icona = chiuso.classe('btn-cerca')[0];
  assert.ok(icona, 'l’icona c’è nella testata');
  assert.equal(chiuso.classe('campo-cerca').length, 0, 'il campo si apre solo al tocco');
  clic(icona);
  const aperto = resa(ctx);
  assert.equal(aperto.classe('campo-cerca').length, 1);
  // si scrive «tempra» e compare l'elenco, con il tocco che porta alla tab
  ctx.ui.cerca.testo = 'tempra';
  const conEsiti = resa(ctx);
  const esiti = conEsiti.classe('esiti-cerca')[0];
  assert.ok(esiti, 'l’elenco dei risultati');
  assert.match(esiti.textContent, /Prova Salvezza/);
  assert.match(esiti.textContent, /VA \d+/);
  const primo = esiti.tutti().find((n) => n.className === 'risultato-cerca');
  clic(primo);
  assert.ok(ctx.chiamate.some((c) => c[0] === 'vaiTab' || c[0] === 'ridisegna'), 'porta alla tab giusta');
  assert.equal(ctx.ui.cerca.aperta, false, 'e la ricerca si chiude');
});

test('fuori dalla scheda la ricerca non cambia nessun valore calcolato', () => {
  const a = contesto(TORVALD, { attiva: 'combattimento' });
  const prima = JSON.stringify(a.tab.scheda);
  const r = resa(a);
  clic(r.classe('btn-cerca')[0]);
  a.ui.cerca.testo = 'tempra';
  resa(a);
  assert.equal(JSON.stringify(a.tab.scheda), prima);
});
