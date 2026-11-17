import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 210 (17/11/2026), parte C — gli strumenti che riscrivono un file di personaggio non perdono, e non lasciano fermi, i
// metadati di salvataggio (`versione_salvataggio`, `aggiornato_il`, `aggiornato_da`).
//
// La rassegna è quella del lotto 200 (`fileAttuale`) su un'altra classe di difetti. Trovati cinque strumenti, due guasti:
//   - lo perdeva: `riserve-intere.mjs --scrivi` (passava da `serializza`, che non porta i metadati);
//   - non lo faceva salire: `adegua-abilita.mjs` (adeguamento e annulla), `migra-parata.mjs`, `riferimenti-rotti.mjs`
//     (copiavano il JSON con la versione e l'ora vecchie: per il server il file «non era cambiato»).
// Provati su una cartella come quella di Davide (più versioni per personaggio): cambia il solo file attuale, la versione sale di
// uno, `aggiornato_da` è «master», `aggiornato_il` è nuovo; le versioni vecchie non si muovono di un byte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { datiReali } from './helpers.js';
import { cartellaComeDavide, improntaCartella, differenze } from './cartella-come-davide.mjs';
import { personaggiDellaCartella } from '../tools/personaggi-cartella.mjs';
import { scriviPersonaggio } from '../tools/scrivi-personaggio.mjs';
import { applica as adegua, annulla as annullaAdeguamento } from '../tools/adegua-abilita.mjs';
import { applica as ricollega } from '../tools/riferimenti-rotti.mjs';

const { dati } = await datiReali();
const RADICE = new URL('../', import.meta.url);
const PRIMA = { versione_salvataggio: 7, aggiornato_il: '2026-11-11T19:52:00.000Z', aggiornato_da: 'giocatore' };

/** Mette metadati noti sul file attuale di ogni personaggio, così «sale di uno» si può misurare. */
function stampaMetadati(cartella) {
  for (const v of personaggiDellaCartella(cartella)) {
    writeFileSync(v.percorso, `${JSON.stringify({ ...v.json, ...PRIMA }, null, 2)}\n`);
  }
}
const attuali = (cartella) => Object.fromEntries(personaggiDellaCartella(cartella).map((v) => [v.file, v]));

/** I controlli comuni: versione +1, master, ora nuova, resto del file intatto (salvo ciò che lo strumento cambia). */
function controllaMetadati(prima, dopo, nome, { cambia = [] } = {}) {
  assert.equal(dopo.versione_salvataggio, PRIMA.versione_salvataggio + 1, `${nome}: la versione di salvataggio sale di uno (era ${dopo.versione_salvataggio})`);
  assert.equal(dopo.aggiornato_da, 'master', `${nome}: scritto dal PC del Direttore`);
  assert.ok(Number.isFinite(Date.parse(dopo.aggiornato_il)) && Date.parse(dopo.aggiornato_il) > Date.parse(PRIMA.aggiornato_il), `${nome}: aggiornato_il è nuovo`);
  assert.equal(dopo.formato, 'mutant-personaggio');
  // le chiavi di prima ci sono ancora tutte (un file che perde campi è il guasto di `serializza`)
  for (const k of Object.keys(prima)) assert.ok(k in dopo, `${nome}: il campo «${k}» non deve sparire`);
  for (const k of Object.keys(prima)) {
    if (['versione_salvataggio', 'aggiornato_il', 'aggiornato_da', ...cambia].includes(k)) continue;
    assert.deepEqual(dopo[k], prima[k], `${nome}: il campo «${k}» non deve cambiare`);
  }
}

// ───────────── l'helper ─────────────

test('scriviPersonaggio: versione +1, quando e da chi come l’app; «chi» e «quando» sono obbligatori', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mutant-scrivi-210-'));
  const f = join(dir, 'A.json');
  const base = { formato: 'mutant-personaggio', versione: 8, pg: 'pg-x', scelte: { nome: 'A' } };
  writeFileSync(f, JSON.stringify({ ...base, ...PRIMA }));
  const scritto = scriviPersonaggio(f, { ...base, scelte: { nome: 'B' }, versione_salvataggio: 1, aggiornato_il: 'x' }, { chi: 'master', quando: new Date('2026-11-17T08:00:00Z') });
  assert.equal(scritto.versione_salvataggio, 8, 'la versione è quella del file sul DISCO + 1, non quella che porta l’oggetto nuovo');
  assert.equal(scritto.aggiornato_il, '2026-11-17T08:00:00.000Z');
  assert.equal(JSON.parse(readFileSync(f, 'utf8')).scelte.nome, 'B');
  assert.ok(readFileSync(f, 'utf8').endsWith('\n'));
  // senza un file di prima: versione 1
  const g = join(dir, 'B.json');
  assert.equal(scriviPersonaggio(g, base, { chi: 'master', quando: new Date() }).versione_salvataggio, 1);
  // niente valori predefiniti (la lezione del 192)
  assert.throws(() => scriviPersonaggio(f, base, {}), /«chi»/);
  assert.throws(() => scriviPersonaggio(f, base, { chi: 'master' }), /«quando»/);
  assert.throws(() => scriviPersonaggio(f, base, { chi: 'qualcuno', quando: new Date() }), /«chi»/);
  assert.throws(() => scriviPersonaggio(f, { formato: 'altro' }, { chi: 'master', quando: new Date() }), /personaggio/);
});

// ───────────── la rassegna: nessuno strumento riscrive un personaggio senza passarne ─────────────

test('RASSEGNA: ogni strumento che scrive file di personaggi passa da scriviPersonaggio, o dichiara perché non serve', () => {
  // Gli strumenti che leggono i personaggi di una cartella E scrivono file. Chi non riscrive il contenuto di un personaggio
  // (copie zip, spostamenti, ripristino di file interi, il PUT del server) è qui, col motivo: un elenco che si dichiara.
  const NON_RISCRIVONO = {
    'migra-talenti.mjs': 'ogni scrittura passa dal PUT /api/personaggi del server, che mette i metadati (conMetadati); il resto sono zip di sicurezza',
    'pulizia-personaggi.mjs': 'sposta file interi in una cartella a parte: il contenuto non cambia',
    'ripristina.mjs': 'rimette file interi da uno zip: i byte sono quelli della copia, metadati compresi',
    'istantanea.mjs': 'scrive uno zip di copie in sola lettura',
    'esito-aggiornamento.mjs': 'scrive un rapporto di testo',
    'stato-personaggi.mjs': 'scrive un rapporto di testo',
    'cerca-personaggi.mjs': 'scrive un rapporto di testo',
    'ripara-installazione.mjs': 'scrive l’elenco delle cartelle del profilo, non i personaggi',
    'dati-pc.mjs': 'scrive dati.json del profilo di Windows',
    'protezione-reali.mjs': 'scrive il registro delle cartelle di prova',
    'dati-locali.mjs': 'copie zip di sicurezza',
    'salva-sessione.mjs': 'zip del salvataggio',
    'console.mjs': 'rapporti di testo e avvii',
    'impostazioni.mjs': 'config-salvataggi.json',
    'aggiorna-avviatori.mjs': 'file .bat del pacchetto',
    'collaudo_pdf.mjs': 'PDF',
    'genera_esempi.mjs': 'genera i personaggi d’esempio da zero, non riscrive quelli veri',
    'genera_esempio_tecniche.mjs': 'genera un esempio da zero',
    'esempio_cibernetica.mjs': 'genera un esempio da zero',
    'cartella-di-prova.mjs': 'crea una cartella vuota',
  };
  const lista = readdirSync(new URL('tools/', RADICE)).filter((f) => f.endsWith('.mjs'));
  const colpevoli = [];
  const visti = [];
  for (const f of lista) {
    const t = readFileSync(new URL(`tools/${f}`, RADICE), 'utf8');
    const scrive = /\b(writeFileSync|writeFile|scriviPersonaggio)\(/.test(t);
    const toccaPersonaggi = /personaggiDellaCartella|fileAttuale|mutant-personaggio|\.\/personaggi-cartella|attualiFraIFile|elencoDaDisco|perPersonaggio|formato.*personaggio/.test(t);
    if (!scrive || !toccaPersonaggi) continue;
    visti.push(f);
    if (/scriviPersonaggio\(/.test(t) || f === 'scrivi-personaggio.mjs' || f in NON_RISCRIVONO) continue;
    colpevoli.push(f);
  }
  assert.deepEqual(colpevoli, [], 'uno strumento scrive un personaggio senza passare da scriviPersonaggio (e non dichiara perché non serve)');
  // il controllo non passa a vuoto: i cinque strumenti del lotto ci sono e usano davvero l'helper
  for (const f of ['riserve-intere.mjs', 'adegua-abilita.mjs', 'migra-parata.mjs', 'riferimenti-rotti.mjs', 'correggi-cyberarma-dimitri.mjs']) {
    assert.ok(visti.includes(f), `${f} deve essere fra gli strumenti che scrivono personaggi`);
    assert.match(readFileSync(new URL(`tools/${f}`, RADICE), 'utf8'), /scriviPersonaggio\(/, `${f} deve passare dall'helper`);
  }
  // e niente scrive un personaggio a mano con JSON.stringify(...) nello stesso punto di una riscrittura dei file del disco
  for (const f of ['adegua-abilita.mjs', 'migra-parata.mjs', 'riferimenti-rotti.mjs', 'riserve-intere.mjs']) {
    const t = readFileSync(new URL(`tools/${f}`, RADICE), 'utf8');
    assert.doesNotMatch(t, /writeFileSync\((voce\.percorso|join\(cartella, p\.file\)|r\.file), `?\$\{JSON\.stringify/, `${f}: scrittura a mano di un personaggio`);
  }
});

// ───────────── gli strumenti, uno per uno, su una cartella come quella di Davide ─────────────

test('adegua-abilita: l’adeguamento e l’annullamento fanno salire la versione e mettono «master»; le versioni vecchie non si toccano', async () => {
  const { cartella, salvataggi, voci } = cartellaComeDavide({ quanti: 3, versioni: 5 });
  stampaMetadati(cartella);
  const prima = attuali(cartella);
  const impronte = improntaCartella(cartella);
  await adegua({ cartella, salvataggi, d: dati });
  const dopo = attuali(cartella);
  const cambiati = differenze(impronte, improntaCartella(cartella));
  assert.equal(cambiati.length, 3, 'solo i tre file attuali');
  for (const v of voci) controllaMetadati(prima[v.attuale.nome].json, dopo[v.attuale.nome].json, `adeguamento di ${v.nome}`, { cambia: ['scelte', 'livelli', 'sessione', 'correzioni_master'] });
  // l'annullamento è un'altra scrittura: la versione sale ancora
  const chi = voci[1];
  await annullaAdeguamento({ cartella, chi: chi.nome, d: dati });
  const finale = attuali(cartella)[chi.attuale.nome].json;
  assert.equal(finale.versione_salvataggio, PRIMA.versione_salvataggio + 2, 'adeguamento (+1) e annullamento (+1)');
  assert.equal(finale.aggiornato_da, 'master');
});

test('riferimenti-rotti --scrivi: il ricollegamento fa salire la versione del solo file attuale', async () => {
  const c = cartellaComeDavide();
  const veicoli = join(c.base, 'veicoli');
  mkdirSync(veicoli, { recursive: true });
  const FIAT = { formato: 'mutant-veicolo', versione: 1, id: 'veimvozx57q0', revisione: 21, aggiornato: '2026-11-14T19:00:36.994Z', proprietario: { tipo: 'gruppo' }, conducente: null, mitragliere: null,
    mezzo: { uid: 'veimvozx57q0', profilo: 'asa-scout-mk4', nome: 'FIAT LUX', andatura: 'fermo', pi: { corpo: 60, propulsione: 36, motore: 24 }, rinforzi: {}, munizioni: [] }, movimento: null };
  writeFileSync(join(veicoli, `${FIAT.id}.json`), JSON.stringify(FIAT));
  for (const v of c.voci.slice(0, 2)) for (const f of v.file) {
    const o = JSON.parse(readFileSync(f.percorso, 'utf8'));
    writeFileSync(f.percorso, `${JSON.stringify({ ...o, scelte: { ...o.scelte, veicoli: [{ uid: 'veimuu14mqa0', rif: 'veimuu14mqa0', nome: 'ASA Scout MK4' }] } }, null, 2)}\n`);
  }
  stampaMetadati(c.cartella);
  const prima = attuali(c.cartella);
  const impronte = improntaCartella(c.cartella);
  const r = await ricollega({ personaggi: c.cartella, veicoli, d: dati, quando: new Date('2026-11-17T09:00:00Z') });
  assert.equal(r.scritti.length, 2, 'due personaggi ricollegati');
  const dopo = attuali(c.cartella);
  for (const v of c.voci.slice(0, 2)) controllaMetadati(prima[v.attuale.nome].json, dopo[v.attuale.nome].json, `ricollegamento di ${v.nome}`, { cambia: ['scelte', 'sessione'] });
  assert.equal(differenze(impronte, improntaCartella(c.cartella)).length, 2, 'cambiano solo i due file attuali');
});

/** Un personaggio col nome di prima del Talento del Lottatore (A.206), perché migra-parata abbia qualcosa da fare. */
function conVecchiaParata(cartella) {
  const v = personaggiDellaCartella(cartella)[0];
  const o = { ...v.json, ...PRIMA, livelli: [...(v.json.livelli ?? []), { livello: 4, grado: { classe: 'Lottatore' }, talentoClasse: 'Parata a Mani Nude' }] };
  writeFileSync(v.percorso, `${JSON.stringify(o, null, 2)}\n`);
  return v;
}

test('migra-parata --scrivi: la riscrittura fa salire la versione e non perde campi', () => {
  const c = cartellaComeDavide({ quanti: 2, versioni: 3 });
  const v = conVecchiaParata(c.cartella);
  const prima = JSON.parse(readFileSync(v.percorso, 'utf8'));
  const impronte = improntaCartella(c.cartella);
  const r = spawnSync(process.execPath, ['tools/migra-parata.mjs', '--cartella', c.cartella, '--scrivi', '--backup', join(c.base, 'backup-parata')], { cwd: RADICE, encoding: 'utf8', timeout: 90000 });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /Riscritte 1 scelte/);
  const dopo = JSON.parse(readFileSync(v.percorso, 'utf8'));
  controllaMetadati(prima, dopo, 'migra-parata', { cambia: ['livelli'] });
  assert.equal(differenze(impronte, improntaCartella(c.cartella)).length, 1, 'cambia solo il file attuale di quel personaggio');
});

test('riserve-intere --scrivi: il file non perde versione_salvataggio e aggiornato_* (il difetto di serializza), e la versione sale', () => {
  const c = cartellaComeDavide({ quanti: 2, versioni: 3 });
  const v = personaggiDellaCartella(c.cartella)[0];
  // una riserva di CM con una frazione (4,2): è ciò che lo strumento arrotonda
  const uid = 'cyber-frazione';
  const o = { ...v.json, ...PRIMA };
  o.scelte = { ...o.scelte, equipaggiamento: [...(o.scelte.equipaggiamento ?? []), { uid, rif: 'armi:cyberarma-batteria-verde', stato: 'impugnata', quantita: 1, note: '' }] };
  o.sessione = { ...(o.sessione ?? {}), chroma: { ...(o.sessione?.chroma ?? {}), [uid]: { pmAttuali: 4.2, unita: 'CM' } } };
  writeFileSync(v.percorso, `${JSON.stringify(o, null, 2)}\n`);
  const prima = JSON.parse(readFileSync(v.percorso, 'utf8'));
  const impronte = improntaCartella(c.cartella);
  const sola = spawnSync(process.execPath, ['tools/riserve-intere.mjs', c.cartella], { cwd: RADICE, encoding: 'utf8', timeout: 90000 });
  assert.equal(sola.status, 0, sola.stderr);
  assert.deepEqual(differenze(impronte, improntaCartella(c.cartella)), [], 'senza --scrivi non cambia niente');
  const r = spawnSync(process.execPath, ['tools/riserve-intere.mjs', c.cartella, '--scrivi'], { cwd: RADICE, encoding: 'utf8', timeout: 90000 });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const dopo = JSON.parse(readFileSync(v.percorso, 'utf8'));
  assert.ok('versione_salvataggio' in dopo && 'aggiornato_il' in dopo && 'aggiornato_da' in dopo, 'i metadati di salvataggio non sono spariti');
  controllaMetadati(prima, dopo, 'riserve-intere', { cambia: ['sessione', 'scelte', 'livelli', 'calendario', 'versioni_dati'] });
  assert.equal(dopo.sessione.chroma[uid].pmAttuali, 5, 'la frazione è salita all’intero (A.252): lo strumento ha davvero scritto');
  assert.equal(differenze(impronte, improntaCartella(c.cartella)).length, 1, 'cambia solo il file attuale');
  void dati;
});
