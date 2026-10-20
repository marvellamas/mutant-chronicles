// Parte A del 20/10/2026: un incantesimo che arriva da un oggetto (artefatto con un incantesimo infuso, Consumabile,
// Pietra della Vigilanza, Guanti) si lancia come quelli conosciuti, con la riserva giusta, senza diventare conosciuto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contesto, resa, clic, dati } from './scheda-aiuti.js';
import { incantesimiDaOggetti, attivazioneOggetto, trovaIncantesimoOggetto } from '../src/incantesimi-artefatti.js';
import { normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { spendiPmLancio, massimiSessione, allineaSessione } from '../src/sessione.js';
import { registraIncantesimo, incantesimiInCorso } from '../src/durate-incantesimi.js';
import { preparaTab } from '../src/stampa.js';
import { applicaModifica } from '../src/character.js';

const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'trasportato', quantita: 1, note: '', ...extra });
const BASTONE = (alim = 'esclusiva', inc = 'Cura Ferite', livello = 3) => voce('bast', null, {
  stato: 'trasportato', sintonizzato: true,
  personalizzato: { nome: 'Bastone di prova', tipo: 'artefatto', potenza: 'Non Comune', energia: 'Verde', capacita_pm: 6, riserva: 'cariche', alimentazione: alim, infuso: { incantesimo: inc, livello } },
});
const PIETRA = voce('pietra', 'artefatti:pietra-della-vigilanza', { sintonizzato: true });
const PERGAMENA = (uid = 'perg') => voce(uid, 'artefatti:pergamena-di-cura-ferite-3', { quantita: 2 });
const GUANTI = voce('guanti', 'artefatti:guanti-da-combattimento-mistico', { stato: 'indossata', sintonizzato: true });

function ctxCon(equip, opz = {}) {
  return contesto('Aiko-Tenzan_liv5_2026-10-02.json', { attiva: 'poteri', scelte: (s) => { s.equipaggiamento = [...s.equipaggiamento, ...equip]; return s; }, ...opz });
}
const elenco = (c) => incantesimiDaOggetti({ voci: c.scelte.equipaggiamento, scheda: c.tab.scheda }, dati);

test('l’elenco comprende artefatti, Pietra della Vigilanza, pergamene e Guanti, dall’Inventario', () => {
  const c = ctxCon([BASTONE(), PIETRA, PERGAMENA(), GUANTI]);
  const e = elenco(c);
  assert.deepEqual(e.map((x) => [x.origine, x.oggetto, x.incantesimo ?? null]).sort((a, b) => String(a).localeCompare(String(b))), [
    ['artefatto', 'Bastone di prova', 'Cura Ferite'],
    ['artefatto', 'Pietra della Vigilanza', 'Esorcizzare Corruzione'],
    ['artefatto', 'Pietra della Vigilanza', 'Individuare'],
    ['consumabile', 'Pergamena di Cura Ferite 3', 'Cura Ferite'],
    ['proprieta', 'Guanti da Combattimento Mistico', null],
  ].sort((a, b) => String(a).localeCompare(String(b))));
  assert.ok(e.every((x) => x.trovato));
  assert.equal(new Set(e.map((x) => x.chiave)).size, e.length, 'chiavi uniche');
});

test('non diventano incantesimi conosciuti, e se l’oggetto esce dall’Inventario spariscono dalla scheda', () => {
  const c = ctxCon([BASTONE(), PERGAMENA()]);
  assert.deepEqual(c.tab.scheda.incantesimi?.conosciuti ?? [], [], 'nessun incantesimo conosciuto');
  assert.deepEqual(c.scelte.incantesimi, [], 'e niente nelle scelte');
  assert.equal(elenco(c).length, 2);
  // l'oggetto esce dall'Inventario: la scheda ricalcolata non li ha più
  const senza = ctxCon([]);
  assert.equal(elenco(senza).length, 0);
  const tolto = c.scelte.equipaggiamento.filter((v) => v.uid !== 'bast');
  assert.deepEqual(incantesimiDaOggetti({ voci: tolto, scheda: c.tab.scheda }, dati).map((x) => x.oggetto), ['Pergamena di Cura Ferite 3']);
  // il consumabile finito (ultimo esemplare) sparisce da sé
  const finito = c.scelte.equipaggiamento.filter((v) => v.uid !== 'perg');
  assert.ok(!incantesimiDaOggetti({ voci: finito, scheda: c.tab.scheda }, dati).some((x) => x.origine === 'consumabile'));
});

test('riserva giusta: Esclusiva solo dalla riserva interna, Universale la riserva per quanto ha e il resto personali', () => {
  const c = ctxCon([BASTONE('esclusiva')]);
  const e = elenco(c)[0];
  assert.equal(e.riserva?.uid, 'bast');
  let a = attivazioneOggetto(e, { sessione: c.sessione }, dati);
  assert.equal(a.pm, 3);
  assert.deepEqual(a.fonte, { personali: 0, contenitore: { uid: 'bast', pm: 3, nome: e.riserva.nome } });
  assert.equal(a.tipoPagamento, 'esclusiva');
  assert.equal(a.motivo, null);
  // riserva a 1 PM: l'Esclusiva avvisa (non blocca)
  const povera = { ...c.sessione, chroma: { ...c.sessione.chroma, bast: { pmAttuali: 1 } } };
  a = attivazioneOggetto(e, { sessione: povera }, dati);
  assert.match(a.motivo, /la riserva ha 1 PM, ne servono 3/);
  // Universale: 1 PM dalla riserva e 2 personali
  const cu = ctxCon([BASTONE('universale')]);
  const eu = elenco(cu)[0];
  const sessU = { ...cu.sessione, chroma: { ...cu.sessione.chroma, bast: { pmAttuali: 1 } } };
  const au = attivazioneOggetto(eu, { sessione: sessU }, dati);
  assert.equal(au.tipoPagamento, 'universale');
  assert.deepEqual(au.fonte, { personali: 2, contenitore: { uid: 'bast', pm: 1, nome: eu.riserva.nome } });
  assert.equal(au.motivo, null);
  // non sintonizzato: avviso
  const ns = elenco(ctxCon([{ ...BASTONE(), sintonizzato: false }]))[0];
  assert.match(attivazioneOggetto(ns, { sessione: c.sessione }, dati).motivo, /non sintonizzato/);
});

test('la fonte scala davvero la riserva dell’oggetto (Esclusiva) o la riserva e i PM personali (Universale)', () => {
  const c = ctxCon([BASTONE('esclusiva')]);
  const m = massimiSessione(c.tab.scheda, c.scelte, dati);
  let s = allineaSessione(c.sessione, m);
  const pm0 = s.pmAttuali;
  const a = attivazioneOggetto(elenco(c)[0], { sessione: s }, dati);
  s = spendiPmLancio(s, a.fonte, m);
  assert.equal(s.chroma.bast.pmAttuali, 6 - 3, 'la riserva dell’artefatto scende di 3');
  assert.equal(s.pmAttuali, pm0, 'i PM del personaggio non cambiano');
  // Universale con riserva a 1: scala 1 dalla riserva e 2 dai personali
  const cu = ctxCon([BASTONE('universale')]);
  const mu = massimiSessione(cu.tab.scheda, cu.scelte, dati);
  let su = { ...allineaSessione(cu.sessione, mu) };
  su = { ...su, chroma: { ...su.chroma, bast: { pmAttuali: 1 } } };
  const pmu = su.pmAttuali;
  su = spendiPmLancio(su, attivazioneOggetto(elenco(cu)[0], { sessione: su }, dati).fonte, mu);
  assert.equal(su.chroma.bast.pmAttuali, 0);
  assert.equal(su.pmAttuali, pmu - 2);
});

test('Consumabile: PM sigillati (non del personaggio), nessuna fonte da scalare, si consuma con «Attivazione completata»', () => {
  const c = ctxCon([PERGAMENA()]);
  const e = elenco(c)[0];
  const a = attivazioneOggetto(e, { sessione: c.sessione }, dati);
  assert.equal(a.pm, 3);
  assert.equal(a.fonte, null);
  assert.equal(a.tipoPagamento, 'sigillati');
  assert.equal(e.quantita, 2);
});

test('Poteri: gli incantesimi dagli oggetti stanno nell’elenco unico con «(Artefatto)» e «(Pergamena)»; il nome apre la stessa scheda e «Lancia!» il pannello', () => {
  const c = ctxCon([BASTONE(), PERGAMENA(), PIETRA, GUANTI]);
  const r = resa(c);
  const testo = r.testo();
  assert.doesNotMatch(testo, /Incantesimi dagli oggetti/, 'nessuna sezione a parte');
  assert.doesNotMatch(testo, /Nessun potere/, 'con incantesimi dagli oggetti non è «Nessun potere»');
  const schede = r.radice.tutti().filter((n) => n.className?.includes('incantesimo-da-oggetto'));
  assert.equal(schede.length, 4, 'Bastone, Pietra ×2, pergamena');
  // stanno sotto la loro macrofamiglia, come gli altri incantesimi
  const intestazioni = r.radice.tutti().filter((n) => n.tagName === 'H2').map((n) => n.textContent);
  for (const m of ['Spirituale']) assert.ok(intestazioni.includes(m), `sezione ${m}`);
  const etichette = schede.map((s) => s.tutti().find((n) => n.className === 'etichetta-origine').textContent.trim());
  assert.deepEqual(etichette.sort(), ['(Artefatto)', '(Artefatto)', '(Artefatto)', '(Pergamena)']);
  // il nome è lo stesso pulsante «info» degli incantesimi conosciuti
  const cura = schede.find((s) => s.textContent.includes('Bastone di prova'));
  const infoBtn = cura.tutti().find((n) => n.className === 'voce-info');
  assert.equal(infoBtn.dataset.infoTipo, 'incantesimo');
  assert.equal(infoBtn.dataset.infoId, 'Cura Ferite');
  const lancia = schede.flatMap((s) => s.tutti().filter((n) => n.tagName === 'BUTTON' && n.textContent === 'Lancia!'));
  assert.equal(lancia.length, 4, 'un «Lancia!» per ogni incantesimo');
  // i Guanti hanno la loro attivazione, non sono un incantesimo
  assert.match(testo, /Proprietà attive degli oggetti/);
  assert.match(testo, /Guanti da Combattimento Mistico/);
  clic(lancia[schede.indexOf(cura)]);
  assert.equal(c.ui.lancio.nome, 'Cura Ferite');
  assert.equal(c.ui.lancio.da, 'bast#0');
  assert.ok(c.chiamate.some(([n]) => n === 'ridisegna'));
});

test('un PG con la magia: gli incantesimi dagli oggetti stanno nello stesso elenco dei conosciuti, accanto a quelli della stessa specializzazione', async () => {
  const { contesto: cx, resa: rx } = await import('./scheda-aiuti.js');
  const c = cx('Fratello-Anselmo-Viri_liv3_2026-10-02.json', { attiva: 'poteri', scelte: (s) => { s.equipaggiamento = [...s.equipaggiamento, PERGAMENA()]; return s; } });
  const r = rx(c);
  const conosciuti = r.radice.tutti().filter((n) => n.className?.startsWith('incantesimo-scheda') && !n.className.includes('incantesimo-da-oggetto'));
  const dalla = r.radice.tutti().filter((n) => n.className?.includes('incantesimo-da-oggetto'));
  assert.ok(conosciuti.length >= 8 && dalla.length === 1);
  // stesso contenitore (la specializzazione) di Cura Ferite se è anche conosciuto, altrimenti comunque nella sezione Spirituale
  assert.equal(dalla[0].parent.parent.tutti().some((n) => n.tagName === 'H2' && n.textContent === 'Spirituale') || dalla[0].parent.tutti().length > 0, true);
  // il contatore «conosciuti / quota» non conta gli incantesimi dagli oggetti
  assert.equal(c.tab.scheda.incantesimi.conosciuti.length, 8);
});

test('il pannello «Lancia!» dell’oggetto: Esclusiva scala la riserva con registrazione della durata; il Consumabile si consuma', () => {
  // Arma Mistica 6: durata 10 RND, entra fra gli incantesimi in corso con il nome dell'oggetto
  const c = ctxCon([BASTONE('esclusiva', 'Arma Mistica', 6)]);
  const e = elenco(c)[0];
  c.ui.lancio = { nome: 'Arma Mistica', passo: 2, da: e.chiave };
  const r = resa(c);
  const pannello = r.radice.tutti().find((n) => n.className?.includes('attacco-sfondo'));
  assert.ok(pannello, 'il pannello è aperto');
  const t = pannello.textContent;
  assert.match(t, /Lancia! · Arma Mistica da Bastone di prova/);
  assert.match(t, /Prova di Potere: non richiesta/);
  assert.match(t, /10 RND/);
  const bottone = pannello.tutti().find((n) => n.tagName === 'BUTTON' && /^Lancia \(−6 PM\)$/.test(n.textContent));
  assert.ok(bottone, 'Lancia (−6 PM)');
  clic(bottone);
  return new Promise((ok) => setTimeout(() => {
    const [nome, fonte, registrazione] = c.chiamate.find(([n]) => n === 'lancia');
    assert.equal(nome, 'lancia');
    assert.deepEqual(fonte, { personali: 0, contenitore: { uid: 'bast', pm: 6, nome: e.riserva.nome } });
    assert.equal(registrazione.nome, 'Arma Mistica (Bastone di prova)');
    assert.equal(registrazione.livello, 6);
    assert.equal(registrazione.durata.round, 10);
    // la registrazione finisce fra gli incantesimi in corso, come per gli altri
    const m = massimiSessione(c.tab.scheda, c.scelte, dati);
    const dopo = registraIncantesimo(spendiPmLancio(allineaSessione(c.sessione, m), fonte, m), registrazione, dati);
    assert.equal(incantesimiInCorso(dopo)[0].nome, 'Arma Mistica (Bastone di prova)');
    assert.equal(dopo.chroma.bast.pmAttuali, 0);
    ok();
  }, 20));
});

test('il pannello del Consumabile usa «usaConsumabile» (un esemplare in meno) e non spende PM del personaggio', () => {
  const c = ctxCon([PERGAMENA()]);
  const e = elenco(c)[0];
  c.ui.lancio = { nome: 'Cura Ferite', passo: 2, da: e.chiave };
  const r = resa(c);
  const pannello = r.radice.tutti().find((n) => n.className?.includes('attacco-sfondo'));
  assert.match(pannello.textContent, /3 PM sigillati nel Consumabile \(non sono PM tuoi\)/);
  const bottone = pannello.tutti().find((n) => n.tagName === 'BUTTON' && /Attivazione completata/.test(n.textContent));
  clic(bottone);
  return new Promise((ok) => setTimeout(() => {
    const chiamata = c.chiamate.find(([n]) => n === 'usaConsumabile');
    assert.ok(chiamata);
    assert.equal(chiamata[1], 'perg');
    assert.ok(!c.chiamate.some(([n]) => n === 'lancia'), 'nessuna spesa di PM del personaggio');
    ok();
  }, 20));
});

test('un oggetto uscito dall’Inventario chiude il pannello senza errori', () => {
  const c = ctxCon([BASTONE()]);
  c.ui.lancio = { nome: 'Cura Ferite', passo: 0, da: 'sparito#0' };
  const r = resa(c);
  assert.equal(c.ui.lancio, null);
  assert.ok(!r.radice.tutti().some((n) => n.className?.includes('attacco-sfondo')));
});

test('tab Artefatti: la riga dell’incantesimo infuso ha «Lancia!» con la stessa chiave, non più il solo «Attiva»', () => {
  const c = ctxCon([BASTONE()], { attiva: 'artefatti' });
  const r = resa(c);
  const bottoni = r.radice.tutti().filter((n) => n.tagName === 'BUTTON').map((n) => n.textContent);
  assert.ok(bottoni.includes('Lancia!'));
  assert.ok(!bottoni.some((t) => /^Attiva \(−/.test(t)));
  const b = r.radice.tutti().find((n) => n.tagName === 'BUTTON' && n.textContent === 'Lancia!');
  clic(b);
  assert.deepEqual([c.ui.lancio.nome, c.ui.lancio.da], ['Cura Ferite', 'bast#0']);
});

test('nessuna regressione: le pergamene restano nella tab Artefatti con «Usa»; il foglio Poteri non cambia per i PG senza oggetti', () => {
  const c = ctxCon([PERGAMENA()], { attiva: 'artefatti' });
  const r = resa(c);
  assert.ok(r.radice.tutti().some((n) => n.tagName === 'BUTTON' && /^Usa \(/.test(n.textContent)));
  const senza = preparaTab({ creazione: ctxCon([]).scelte, livelli: [] }, dati);
  assert.ok(senza.tab.length > 0);
  // trovaIncantesimoOggetto: chiave sconosciuta → null
  assert.equal(trovaIncantesimoOggetto(elenco(c), 'xx#9'), null);
  assert.equal(normalizzaEquipaggiamento(c.scelte.equipaggiamento).length, c.scelte.equipaggiamento.length);
  assert.ok(applicaModifica);
});

test('senza magia propria, un effetto lanciato da un oggetto compare fra gli «Incantesimi in corso» nei Poteri', () => {
  const c = ctxCon([BASTONE('esclusiva', 'Arma Mistica', 6)], {
    cambia: (s) => { s.incantesimiAttivi = [{ uid: 'inc:a', nome: 'Arma Mistica (Bastone di prova)', livello: 6, dal: 1, al: 11, testo: '10 RND', concentrazione: false, bersagli: [{ nome: 'sé', se: true }] }]; },
  });
  const t = resa(c).testo();
  assert.match(t, /Incantesimi in corso/);
  assert.match(t, /Arma Mistica \(Bastone di prova\)/);
  // senza effetti in corso il riquadro non c'è
  assert.doesNotMatch(resa(ctxCon([BASTONE()])).testo(), /Incantesimi in corso/);
});
