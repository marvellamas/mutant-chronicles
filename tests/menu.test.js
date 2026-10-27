// «Un ingresso solo» (25/10/2026): Mutant.bat è l'unico programma; ogni funzione dei .bat tolti è una voce del menu;
// il ruolo del PC sta nel profilo e sopravvive agli aggiornamenti; la fascia della copia di prova ha il nome vero del PC;
// un PC senza ruolo si comporta come prima; la versione mostrata è quella del codice; «Aggiorna» dice che cosa è cambiato.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync, cpSync, copyFileSync, readdirSync } from 'node:fs';
import { tmpdir, hostname } from 'node:os';
import { join } from 'node:path';

const REPO = new URL('..', import.meta.url);
const leggi = (p) => readFileSync(new URL(p, REPO), 'utf8');
const profilo = mkdtempSync(join(tmpdir(), 'mutant-profilo-'));
process.env.MUTANT_CONFIG_DIR = profilo; // mai il profilo vero di chi lancia i test

const { VOCI, TASTI, righeMenu, ascii, testoStatoTalenti } = await import('../tools/menu.mjs');
const { leggiRuolo, scriviRuolo, percorsoRuoli, testoRuolo } = await import('../tools/ruolo-pc.mjs');
const { statoDaRuolo, fasciaDaMostrare, statoInstallazione, TESTO_COPIA } = await import('../src/copia-di-lavoro.js');
const { leggiVersione, leggiNovita, versioneInParole } = await import('../src/versione.js');
const { testoEsito, annotaPrima, esitoDopo } = await import('../tools/esito-aggiornamento.mjs');
const { testoVersione, voceTalenti, voceTalentiRipristina, voceControlla } = await import('../tools/console.mjs');
const { creaServer } = await import('../server.mjs');

after(() => rmSync(profilo, { recursive: true, force: true }));

test('ogni funzione dei .bat tolti è una voce del menu di Mutant.bat', () => {
  const ids = VOCI.map((v) => v.id);
  // salva-sessione.bat → 3; 3_avvia.bat e avvia.bat → 1; 4_controlla_personaggi.bat → 6; 5_passa_ai_talenti_nuovi.bat → 7 e 8
  for (const id of ['avvia', 'aggiorna', 'salva', 'ripristina', 'cartella', 'controlla', 'talenti', 'talenti-ripristina', 'impostazioni', 'esci']) assert.ok(ids.includes(id), id);
  const bat = leggi('Mutant.bat');
  // il menu lo stampa console.mjs, e choice ha esattamente i tasti delle voci
  assert.match(bat, /node "%QUI%tools\\console\.mjs" menu/);
  assert.ok(bat.includes(`choice /c ${TASTI} /n`), 'choice con i tasti delle voci');
  // ogni voce ha la sua etichetta, e la catena di errorlevel porta il tasto n-esimo alla voce n-esima
  VOCI.forEach((v, i) => {
    assert.match(bat, new RegExp(`^:${v.id}\\r?$`, 'm'), `etichetta :${v.id}`);
    assert.match(bat, new RegExp(`if errorlevel ${i + 1} goto ${v.id}\\r?$`, 'm'), `tasto ${v.tasto} → ${v.id}`);
  });
  // il collegamento sul desktop (crea-collegamento.bat) e l'installazione di Node (2_installa_node.bat) ci sono ancora
  const con = leggi('tools/console.mjs');
  assert.match(con, /export function creaCollegamento/);
  assert.match(con, /Metti il collegamento "Mutant" sul desktop/);
  assert.match(bat, /tools\\installa-node\.ps1/);
  // i .bat separati non ci sono più
  for (const f of ['avvia.bat', 'salva-sessione.bat', 'crea-collegamento.bat', 'distribuzione/2_installa_node.bat', 'distribuzione/3_avvia.bat', 'distribuzione/4_controlla_personaggi.bat', 'distribuzione/5_passa_ai_talenti_nuovi.bat']) {
    assert.equal(existsSync(new URL(f, REPO)), false, `${f} tolto`);
  }
  // le voci che cambiano i personaggi lo dicono
  for (const v of VOCI.filter((x) => x.cambiaPersonaggi)) assert.match(v.descrizione, /SI|conferma/, v.id);
});

test('il menu: righe in italiano, senza lettere accentate, con lo stato dei Talenti accanto alla voce', () => {
  const righe = righeMenu({ versione: 'Versione del 25/10 · Talenti nuovi', ruolo: 'copia di prova', talenti: { totale: 7, passati: 7, quando: new Date(2026, 9, 26, 21, 10), copie: 1 } });
  const t = righe.join('\n');
  for (const v of VOCI) assert.match(t, new RegExp(`${v.tasto}\\. ${v.etichetta.replace(/[()]/g, '.')}`));
  assert.match(t, /7\. Passa ai Talenti nuovi {3}\[Talenti nuovi: fatto il 26\/10 alle 21:10 \(7 personaggi su 7\)\]/);
  assert.doesNotMatch(t, /[^\x09\x0a\x0d\x20-\x7e]/, 'solo ASCII: la console di Windows non è in UTF-8');
  assert.equal(testoStatoTalenti({ totale: 7, passati: 0, quando: null, copie: 0 }), 'non ancora fatto');
  assert.equal(ascii('Più · «sì» — è'), 'Piu\' - "si\'" - e\'');
});

test('il ruolo del PC sta nel profilo e sopravvive a un aggiornamento simulato', () => {
  const radice = mkdtempSync(join(tmpdir(), 'mutant-app-'));
  writeFileSync(join(radice, 'server.mjs'), 'vecchio');
  assert.equal(leggiRuolo(radice).ruolo, null);
  scriviRuolo(radice, 'prova');
  // l'aggiornamento sostituisce tutti i file dell'app (Git o zip): il ruolo non sta fra quelli
  for (const f of readdirSync(radice)) rmSync(join(radice, f), { recursive: true, force: true });
  writeFileSync(join(radice, 'server.mjs'), 'nuovo');
  assert.equal(leggiRuolo(radice).ruolo, 'prova');
  assert.ok(!percorsoRuoli().startsWith(radice), 'il file del ruolo è fuori dalla cartella dell’app');
  // la stessa cartella scritta in un altro modo (maiuscole, barra finale) è la stessa installazione
  assert.equal(leggiRuolo(`${radice.toUpperCase()}\\`).ruolo, 'prova');
  // un'altra installazione dello stesso profilo ha il suo ruolo
  const altra = mkdtempSync(join(tmpdir(), 'mutant-app-'));
  assert.equal(leggiRuolo(altra).ruolo, null);
  scriviRuolo(altra, 'originale');
  assert.equal(leggiRuolo(radice).ruolo, 'prova');
  assert.match(testoRuolo(leggiRuolo(altra)), /^PC del Direttore \(originale\) · scelto il \d\d\/\d\d$/);
  assert.equal(leggiRuolo(radice).nomePc, hostname(), 'il nome del PC viene da Windows');
  rmSync(radice, { recursive: true, force: true });
  rmSync(altra, { recursive: true, force: true });
});

test('la fascia: copia di prova con il nome vero del PC; sul PC del Direttore niente; senza ruolo come prima', () => {
  const nome = hostname();
  assert.deepEqual(fasciaDaMostrare(statoDaRuolo({ ruolo: 'prova', nomePc: nome })), { testo: `Copia di prova su ${nome} — i personaggi veri sono sul PC del Direttore`, nota: '' });
  // il PC del Direttore non ha fascia, anche se il vecchio file scritto a mano c'è
  const vecchio = statoInstallazione('Il portatile di Marcello (sviluppo)');
  assert.equal(fasciaDaMostrare(statoDaRuolo({ ruolo: 'originale', nomePc: nome }, vecchio)), null);
  // la copia di prova non usa più la nota scritta a mano
  assert.doesNotMatch(fasciaDaMostrare(statoDaRuolo({ ruolo: 'prova', nomePc: nome }, vecchio)).testo, /portatile/);
  // senza ruolo: esattamente come prima (decide il vecchio file; senza file, niente)
  assert.equal(fasciaDaMostrare(statoDaRuolo({ ruolo: null, nomePc: nome }, statoInstallazione(null))), null);
  assert.deepEqual(fasciaDaMostrare(statoDaRuolo({ ruolo: null, nomePc: nome }, vecchio)), { testo: TESTO_COPIA, nota: 'Il portatile di Marcello (sviluppo)' });
});

test('dal server: /api/ping dice copia di prova con il nome del PC, solo con il ruolo scelto', async () => {
  const radice = mkdtempSync(join(tmpdir(), 'mutant-ping-'));
  for (const c of ['personaggi', 'tavolo', 'scontri', 'nemici', 'scene', 'mappe', 'px']) mkdirSync(join(radice, c));
  const srv = creaServer({ radice, cartella: join(radice, 'personaggi'), tavolo: join(radice, 'tavolo'), scontri: join(radice, 'scontri'), nemici: join(radice, 'nemici'), scene: join(radice, 'scene'), mappe: join(radice, 'mappe'), px: join(radice, 'px'), eMaster: () => true });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const ping = async () => (await fetch(`http://127.0.0.1:${srv.address().port}/api/ping`)).json();
  try {
    assert.equal((await ping()).copiaDiLavoro, undefined, 'senza ruolo e senza file: come il PC del Direttore di oggi');
    scriviRuolo(radice, 'prova');
    const p = await ping();
    assert.equal(p.copiaDiLavoro, true);
    assert.equal(p.nomePc, hostname());
    scriviRuolo(radice, 'originale');
    assert.equal((await ping()).copiaDiLavoro, undefined);
  } finally {
    await new Promise((ok) => srv.close(ok));
    rmSync(radice, { recursive: true, force: true });
  }
});

test('la versione mostrata (app e menu) è quella del codice: versione.json e novita.json', () => {
  const v = leggiVersione(JSON.parse(leggi('versione.json')));
  const titolo = leggiNovita(JSON.parse(leggi('novita.json')));
  assert.ok(v && titolo);
  const attesa = versioneInParole(v, titolo);
  assert.match(attesa, /^Versione del \d\d\/\d\d · /);
  assert.equal(testoVersione(new URL('.', REPO).pathname.replace(/^\/([A-Za-z]:)/, '$1')), `${attesa} (${v.versione})`);
  // il piè di pagina dell'app usa la stessa funzione con gli stessi file
  const ui = leggi('src/ui/aggiornamento.js');
  assert.match(ui, /versioneInParole\(v, titolo\)/);
  assert.match(ui, /fetch\('novita\.json'/);
});

test('«Aggiorna» dice in chiaro che cosa è cambiato, o che era già aggiornato', () => {
  const prima = { versione: 'aaa111', data: '2026-10-22 10:00', titolo: 'PX della partita' };
  const dopo = { versione: 'bbb222', data: '2026-10-25 14:01', titolo: 'Talenti nuovi' };
  assert.equal(testoEsito(prima, dopo), 'Aggiornato: prima eri alla versione del 22/10, ora sei a quella del 25/10 (Talenti nuovi).');
  assert.equal(testoEsito(dopo, dopo), 'Era gia\' aggiornato: sei alla versione del 25/10 (Talenti nuovi). Non e\' cambiato niente.');
  const radice = mkdtempSync(join(tmpdir(), 'mutant-agg-'));
  writeFileSync(join(radice, 'versione.json'), JSON.stringify({ versione: 'aaa111', data: '2026-10-22 10:00' }));
  annotaPrima(radice);
  writeFileSync(join(radice, 'versione.json'), JSON.stringify({ versione: 'bbb222', data: '2026-10-25 14:01' }));
  writeFileSync(join(radice, 'novita.json'), JSON.stringify({ titolo: 'Talenti nuovi' }));
  assert.equal(esitoDopo(radice), 'Aggiornato: prima eri alla versione del 22/10, ora sei a quella del 25/10 (Talenti nuovi).');
  assert.equal(testoEsito({ ...dopo, versione: 'ccc333', data: '2026-10-25 09:00' }, dopo), 'Aggiornato: eri gia\' a una versione del 25/10, ora sei all\'ultima di quel giorno (Talenti nuovi).');
  // stessa app ma zip nuovo (cambiati solo menu o strumenti): non si dice «non è cambiato niente»
  writeFileSync(join(radice, '.versione'), 'sha-vecchio\n');
  annotaPrima(radice);
  writeFileSync(join(radice, '.versione'), 'sha-nuovo\n');
  assert.match(esitoDopo(radice), /^Aggiornato: l'app resta alla versione del 25\/10 \(Talenti nuovi\); sono cambiati solo i programmi di servizio/);
  annotaPrima(radice);
  assert.match(esitoDopo(radice), /^Era gia' aggiornato/);
  // aggiorna.bat: con Git dice il branch e si ferma con modifiche non salvate, prima di toccare qualunque cosa
  const agg = leggi('aggiorna.bat');
  const iBranch = agg.indexOf('git rev-parse --abbrev-ref HEAD');
  const iSporchi = agg.indexOf('Non aggiorno: in questa cartella ci sono modifiche non salvate.');
  const iCopia = agg.indexOf('node tools\\dati-locali.mjs prima');
  assert.ok(iBranch > 0 && iSporchi > iBranch && iCopia > iSporchi, 'branch, poi controllo delle modifiche, poi la copia');
  assert.match(agg, /esito-aggiornamento\.mjs dopo/);
  // niente finestre aperte da sole: solo la voce 5 di Mutant.bat apre Esplora risorse
  for (const f of ['aggiorna.bat', 'avvia-server.bat', 'distribuzione/1_scarica_o_aggiorna_app.bat']) assert.doesNotMatch(leggi(f), /explorer/i, f);
  assert.equal((leggi('Mutant.bat').match(/explorer/gi) ?? []).length, 1);
  rmSync(radice, { recursive: true, force: true });
});

test('le voci che cambiano i personaggi: niente senza SI; con SI il passaggio e il ritorno indietro', async () => {
  const radice = mkdtempSync(join(tmpdir(), 'mutant-voci-'));
  mkdirSync(join(radice, 'personaggi'));
  const fix = new URL('./fixtures/talenti-vecchi/', import.meta.url);
  const pg = readdirSync(fix).filter((f) => f.endsWith('.json') && f !== 'attese.json');
  for (const f of pg) copyFileSync(new URL(f, fix), join(radice, 'personaggi', f));
  const prima = Object.fromEntries(pg.map((f) => [f, readFileSync(join(radice, 'personaggi', f), 'utf8')]));
  const rl = (risposta) => ({ chiedi: async () => risposta, chiudi: () => {} });
  const zitto = console.log;
  console.log = () => {};
  try {
    // senza SI non si tocca niente (chiudere la finestra = risposta vuota)
    assert.equal((await voceTalenti({ radice, rl: rl(''), porta: 9 })).fatto, false);
    assert.equal((await voceTalenti({ radice, rl: rl('si grazie'), porta: 9 })).fatto, false);
    for (const f of pg) assert.equal(readFileSync(join(radice, 'personaggi', f), 'utf8'), prima[f]);
    assert.equal(existsSync(join(radice, 'salvataggi')), false, 'nessuna copia senza SI');
    // con SI: copia, passaggio
    const e = await voceTalenti({ radice, rl: rl('SI'), porta: 9 });
    assert.equal(e.fatto, true);
    assert.equal(e.fatti.length, 7);
    assert.ok(existsSync(e.copia.zip));
    // il ritorno indietro: senza SI niente, con SI i file come prima
    assert.equal((await voceTalentiRipristina({ radice, rl: rl(''), porta: 9 })).fatto, false);
    assert.equal((await voceTalentiRipristina({ radice, rl: rl('SI'), porta: 9 })).fatto, true);
    for (const f of pg) assert.equal(readFileSync(join(radice, 'personaggi', f), 'utf8'), prima[f], `${f} identico`);
    // il controllo dei file: un file per personaggio, niente da mettere via e niente domande
    assert.deepEqual((await voceControlla({ radice, rl: rl('SI') })).fatti, []);
  } finally {
    console.log = zitto;
    rmSync(radice, { recursive: true, force: true });
  }
});
