import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 188 (10/11/2026), i due controlli del protocollo dei manuali. Nessuno dei due tocca la rete: leggono i file
// del repo, e basta. Il controllo dei doppioni su Drive ha bisogno della rete e sta nella ricognizione
// (tools/ricognizione-manuali.mjs), non qui: dopo il lotto 185 la suite è deterministica e ci resta.
//
// 1. La versione nel nome di un file di docs/manuali-txt/ e quella scritta nella sua prima pagina devono coincidere.
//    È il controllo che avrebbe preso il caso del Lorath: il 9/11 al tavolo un Lorath è stato descritto con il Getto
//    acido invece del veleno paralizzante, perché si era letto il Manuale dei Mostri 0.23 al posto del 0.46.
// 2. Nessuno strumento legge un manuale per un percorso senza versione. È il controllo che impedisce alla causa di
//    tornare: in docs/manuali-txt/ vivevano `giocatore.md` (0.50), `magia.md` (1.7), `armamenti.md` (0.68),
//    `equipaggiamento.md` (0.22), `revisione-nec.md` (2.7) e `mostri.md` (0.23), letti dai generatori.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { registro, voci, versioniChePartono, versioneDichiarata, versioneNelNome, CARTELLA_TESTI, RADICE, testoManuale, percorsoManuale } from '../tools/manuali.mjs';

const giro = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? giro(join(d, e.name)) : [join(d, e.name)]));
const codice = [...giro(join(RADICE, 'tools')), ...giro(join(RADICE, 'tests'))].filter((f) => /\.(mjs|js|py)$/.test(f));

// --- 1. versione nel nome = versione nella prima pagina -------------------------------------------------------

test('ogni manuale del registro: la versione del nome e quella scritta dentro coincidono', () => {
  assert.deepEqual(versioniChePartono(), [], 'il nome del file e la prima pagina del documento devono dire la stessa versione');
});

test('ogni file di docs/manuali-txt/ con la versione nel nome dichiara la stessa versione dentro', () => {
  const fuori = [];
  for (const f of readdirSync(CARTELLA_TESTI)) {
    const nome = versioneNelNome(f);
    if (!nome) continue;
    const dentro = versioneDichiarata(readFileSync(join(CARTELLA_TESTI, f), 'utf8'));
    if (dentro && dentro !== nome) fuori.push(`${f}: il nome dice ${nome}, la prima pagina ${dentro}`);
  }
  assert.deepEqual(fuori, []);
});

test('versioneDichiarata legge le tre forme che usano i documenti di Davide', () => {
  assert.equal(versioneDichiarata('SIMPLY RPG\nManuale dei Mostri\nVERSIONE 0.47 • COVATA • NOVEMBRE 2026'), '0.47');
  assert.equal(versioneDichiarata('**SIMPLY RPG**\n\n**EDIZIONE 0.74**'), '0.74');
  assert.equal(versioneDichiarata('EDIZIONE CONSULTABILE 0.54\nNovembre 2026'), '0.54');
  assert.equal(versioneDichiarata('Edizione 0.6   •   30 ottobre 2026'), '0.6');
  assert.equal(versioneDichiarata('Un documento che non dichiara niente'), null);
  // non deve pescare un numero da metà documento: si guardano solo le prime righe
  assert.equal(versioneDichiarata(`${'riga\n'.repeat(60)}EDIZIONE 9.9`), null);
});

test('versioneNelNome legge il nome del file e non si confonde', () => {
  assert.equal(versioneNelNome('magia-1.11.md'), '1.11');
  assert.equal(versioneNelNome('mostri-0.47.md'), '0.47');
  assert.equal(versioneNelNome('veicoli-0.10-2026-11-03.md'), '0.10');
  assert.equal(versioneNelNome('giocatore.md'), null);
  assert.equal(versioneNelNome('talenti-magici-mistici.md'), null);
});

// --- 2. nessuno strumento legge un manuale per un percorso senza versione -------------------------------------

/** I nomi senza versione che non sono manuali: appunti di layout e il Doc dei Talenti magici, che non ne hanno uno. */
const AMMESSI = new Set((registro().senza_versione ?? []).map((x) => x.testo));

test('nessuno strumento legge un manuale per un percorso senza versione', () => {
  const colpevoli = [];
  for (const f of codice) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/docs\/manuali-txt\/([A-Za-z0-9._-]+\.md)/g)) {
      const nome = m[1];
      if (versioneNelNome(nome) || AMMESSI.has(nome)) continue;
      // un riferimento a un commit di Git è legittimo: quel file esisteva allora
      const riga = t.slice(Math.max(0, m.index - 120), m.index);
      if (/git|show|[0-9a-f]{7}:/.test(riga)) continue;
      colpevoli.push(`${f.replace(RADICE, '').replace(/\\/g, '/')}: ${nome}`);
    }
  }
  assert.deepEqual(colpevoli, [], 'si legge dal registro (tools/manuali.mjs → testoManuale), non da un percorso senza versione');
});

test('i file del registro esistono tutti e il registro è l’unico posto che dice la versione', () => {
  for (const v of voci()) {
    assert.ok(existsSync(join(CARTELLA_TESTI, v.testo)), `manca il testo di ${v.id}: ${v.testo}`);
  }
  // dieci manuali, cinque schede, due documenti di scambio: lo stato concordato con Davide il 10/11
  assert.equal(registro().manuali.length, 10);
  assert.equal(registro().schede.length, 5);
  assert.equal(registro().scambio.length, 2);
  // ogni manuale ha un ID di Drive e una versione: la chiave del registro è quella, non la data
  for (const v of [...registro().manuali, ...registro().schede]) {
    assert.match(v.drive, /^[A-Za-z0-9_-]{20,}$/, `${v.id}: ID di Drive`);
    assert.match(v.versione, /^\d+(\.\d+)*$/, `${v.id}: numero di versione`);
  }
  // gli id sono unici e gli ID di Drive anche: due file dello stesso manuale non possono convivere nel registro
  const ids = voci().map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'id ripetuti nel registro');
  const drive = [...registro().manuali, ...registro().schede].map((x) => x.drive);
  assert.equal(new Set(drive).size, drive.length, 'due voci con lo stesso ID di Drive');
});

// Il numero non si scrive qui: lo dice il registro. Dal lotto 191 i manuali cambiano edizione a lotti interi, e un
// numero scritto in un test è un posto in più da ricordare — cioè un posto in cui restare indietro in silenzio.
test('testoManuale legge davvero la versione corrente, e un id sbagliato si ferma', () => {
  for (const id of ['mostri', 'giocatore', 'magia', 'armamenti', 'equipaggiamento', 'veicoli', 'direttore']) {
    const v = registro().manuali.find((x) => x.id === id).versione;
    assert.equal(versioneDichiarata(testoManuale(id)), v, `${id}: la prima pagina del testo letto deve dire ${v}`);
    assert.ok(percorsoManuale(id).replace(/\\/g, '/').endsWith(`${id}-${v}.md`), `${id}: il percorso deve portare la versione ${v}`);
  }
  assert.throws(() => testoManuale('mostri-vecchio'), /non è nel registro/);
});

// Lotto 191: un'edizione che su Drive c'è e in cartella no si dichiara, con il motivo. Non è un errore — è il
// contrario di un controllo che diventa verde per sbaglio: senza la riga, un registro fermo a un'edizione
// precedente sembrerebbe aggiornato.
test('un recepimento in attesa è dichiarato con il motivo, e non si confonde con la versione in cartella', async () => {
  const { recepimentiInAttesa } = await import('../tools/ricognizione-manuali.mjs');
  for (const x of recepimentiInAttesa()) {
    assert.ok(x.motivo && x.motivo.length > 40, `${x.id}: un recepimento in attesa senza motivo è un manuale dimenticato`);
    assert.notEqual(x.su_drive, x.in_cartella, `${x.id}: se le due versioni coincidono non c'è niente in attesa`);
    // il testo in cartella resta quello della versione del registro: l'attesa non cambia che cosa si legge
    assert.equal(versioneDichiarata(testoManuale(x.id)), x.in_cartella);
  }
});

// --- la ricognizione (parte D): le funzioni pure si provano qui, la rete no ------------------------------------

test('la ricognizione riconosce due file dello stesso manuale, e ignora gli archiviati', async () => {
  const { doppioni, eArchiviato, versioneNelTitolo } = await import('../tools/ricognizione-manuali.mjs');
  // il caso del 9/11, rimesso in piedi: i due Manuali dei Mostri nella stessa cartella
  const due = [
    { id: 'A', title: 'SIMPLY_RPG_Manuale_dei_Mostri_v0.47.docx', modifiedTime: '2026-11-10T09:42Z' },
    { id: 'B', title: 'Manuale dei Mostri 0.23', modifiedTime: '2026-11-09T20:00Z' },
  ];
  const d = doppioni(due);
  assert.equal(d.length, 1);
  assert.equal(d[0].id, 'mostri');
  assert.equal(d[0].titoli.length, 2);
  // un archiviato non è un doppione
  assert.deepEqual(doppioni([due[0], { id: 'C', title: 'ARCHIVIO — Manuale dei Mostri 0.23 — SUPERATO' }]), []);
  assert.equal(eArchiviato('ARCHIVIO — Manuale dei Mostri 0.23 — SUPERATO'), true);
  assert.equal(eArchiviato('Manuale dei Mostri v0.47'), false);
  assert.equal(versioneNelTitolo('SIMPLY_RPG_Manuale_dei_Mostri_v0.47.docx'), '0.47');
  assert.equal(versioneNelTitolo('Manuale della Magia v1.11'), '1.11');
  assert.equal(versioneNelTitolo('ASA Scout MK4 — scheda v0.6'), '0.6');
});

test('la ricognizione si ferma se un ID del registro non risponde più, e segue le scorciatoie', async () => {
  const { referto } = await import('../tools/ricognizione-manuali.mjs');
  const { registro: reg } = await import('../tools/manuali.mjs');
  const tutti = [...reg().manuali, ...reg().schede, ...reg().scambio]
    .map((v) => ({ id: v.drive, title: `${v.nome} v${v.versione ?? ''}`.trim(), modifiedTime: v.modificato }));
  assert.equal(referto(tutti).spariti.length, 0, 'con tutti gli ID presenti non sparisce nessuno');
  // tolto l'ID del Manuale dei Mostri: la ricognizione se ne accorge e si ferma
  const senzaMostri = tutti.filter((f) => f.id !== reg().manuali.find((m) => m.id === 'mostri').drive);
  const r = referto(senzaMostri);
  assert.deepEqual(r.spariti.map((x) => x.id), ['mostri']);
  assert.equal(r.fermati, true, 'un ID sparito deve fermare chi legge, non farlo tirare a indovinare');
  // una scorciatoia vale per il file che punta
  const conScorciatoia = tutti.map((f) => (f.id === reg().scambio[0].drive
    ? { id: 'scorciatoia', title: 'per-davide.md', shortcutDetails: { targetFileId: f.id } } : f));
  assert.equal(referto(conScorciatoia).spariti.length, 0);
});
