import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 200 (15/11/2026), parte B: **la classe del difetto**, non il caso singolo.
//
// `tools/adegua-abilita.mjs` camminava sui file invece che sui personaggi, e su una cartella con cinque versioni
// per personaggio `--annulla` mentiva. Ma quello era un caso di una classe: ogni strumento che legge
// `personaggi/*.json` aveva la stessa scelta da fare, e quasi nessuno la faceva. Qui si controlla la classe.
//
// **Chi scrive senza scegliere l'attuale è un difetto** (riscrive anche le versioni vecchie, e il conto mente).
// **Chi legge deve contare per personaggio**, altrimenti ci racconta trentasette cose dove ce ne sono sette.
// **Chi deve guardare la storia lo fa, e c'è scritto perché**: la copia zip di sicurezza prende tutto, altrimenti
// non si torna indietro; la pulizia dei doppioni e la ricerca dei personaggi su un PC devono vedere ogni file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { personaggiDellaCartella, trovaPersonaggio, tuttiIFileDiPersonaggio, attualiFraIFile, rigaSuCosa } from '../tools/personaggi-cartella.mjs';
import { fileDiPersonaggi } from '../tools/prezzi-prima-dopo.mjs';
import { rapporto as rapportoParata } from '../tools/migra-parata.mjs';
import { quadroScout } from '../tools/fiat-lux.mjs';
import { cartellaComeDavide, improntaCartella, differenze } from './cartella-come-davide.mjs';

// --- il posto unico ---------------------------------------------------------------------------------------

test('personaggiDellaCartella: un personaggio per personaggio, col suo file attuale e le versioni contate', () => {
  const c = cartellaComeDavide();
  const voci = personaggiDellaCartella(c.cartella);
  assert.equal(voci.length, 7, `${voci.length} voci per sette personaggi su ${c.quantiFile} file`);
  for (const v of voci) {
    const mio = c.voci.find((x) => x.nome === v.nome);
    assert.equal(v.file, mio.attuale.nome, `${v.nome}: non ha scelto il file attuale`);
    assert.equal(v.versioni, 5);
    assert.equal(v.altri.length, 4, 'le altre versioni si sanno, per poter dire che non si toccano');
    assert.ok(v.percorso.endsWith(v.file) && v.json?.scelte, `${v.nome}: voce incompleta`);
  }
  assert.match(rigaSuCosa(voci, c.cartella), /7 personaggi.*35 file/s);
});

test('trovaPersonaggio si rifiuta invece di scegliere, e lo dice', () => {
  const c = cartellaComeDavide();
  const voci = personaggiDellaCartella(c.cartella);
  assert.equal(trovaPersonaggio(voci, 'LUCAS').voce.nome, 'LUCAS');
  assert.equal(trovaPersonaggio(voci, 'lucas').voce.nome, 'LUCAS', 'il nome non è sensibile alle maiuscole');
  // anche per nome di file, compresa una versione vecchia: si risponde col personaggio, non col file chiesto
  const lucas = voci.find((v) => v.nome === 'LUCAS');
  assert.equal(trovaPersonaggio(voci, lucas.altri[0]).voce.file, lucas.file, 'chiesto per una versione vecchia, torna l’attuale');
  const niente = trovaPersonaggio(voci, 'NESSUNO');
  assert.equal(niente.ok, false);
  assert.match(niente.motivo, /non trovo/);
  assert.match(niente.motivo, /LUCAS/, 'dice anche chi c’è, altrimenti il Direttore tira a indovinare');
  assert.equal(trovaPersonaggio(voci, '').ok, false);
});

test('tuttiIFileDiPersonaggio vede ogni file, anche nelle sottocartelle: serve alla copia di sicurezza', async () => {
  const c = cartellaComeDavide();
  const dentro = join(c.cartella, 'storico');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(dentro, { recursive: true });
  writeFileSync(join(dentro, 'LUCAS_liv1_2026-01-01.json'), readFileSync(join(c.cartella, c.voci[3].attuale.nome)));
  const tutti = tuttiIFileDiPersonaggio(c.cartella);
  assert.equal(tutti.length, c.quantiFile + 1, 'una copia zip che non prende tutto non riporta la cartella com’era');
  // e la vista per personaggio raggruppa per cartella: la copia nello storico è un'altra cosa
  const attuali = attualiFraIFile(tutti, (f) => JSON.parse(readFileSync(f, 'utf8')));
  assert.equal(attuali.length, 8, 'la copia in una sottocartella non si mescola con la cartella di lavoro');
});

// --- chi legge conta per personaggio ----------------------------------------------------------------------

test('prezzi-prima-dopo: sette file da una cartella da trentacinque', () => {
  const c = cartellaComeDavide();
  const file = fileDiPersonaggi(c.cartella);
  assert.equal(file.length, 7, `${file.length} file: stampava «${file.length} personaggi»`);
  const attesi = c.voci.map((v) => v.attuale.nome).sort();
  assert.deepEqual(file.map((f) => f.split(/[\\/]/).pop()).sort(), attesi);
  // un file solo resta un file solo
  assert.deepEqual(fileDiPersonaggi(file[0]), [file[0]]);
});

test('fiat-lux: un riferimento a un veicolo che nel registro non c’è è un avviso, non un silenzio', () => {
  const pg = [{ file: 'PABLO ZAION [attuale]', pg: { scelte: { veicoli: [{ uid: 'veix', rif: 'veix', nome: 'ASA Scout MK4' }] } } }];
  const registro = [{ id: 'veiy', mezzo: { profilo: 'asa-scout-mk4', nome: 'FIAT LUX' }, proprietario: { tipo: 'gruppo' } }];
  const q = quadroScout(registro, pg);
  assert.equal(q.copie.length, 1);
  assert.match(q.copie[0].tipo, /non c’è/);
  assert.equal(q.avvisi.length, 1);
  assert.match(q.avvisi[0], /veix/);
  // un riferimento buono resta un riferimento, senza avvisi
  const buono = quadroScout(registro, [{ file: 'x', pg: { scelte: { veicoli: [{ uid: 'veiy', rif: 'veiy' }] } } }]);
  assert.deepEqual(buono.avvisi, []);
  assert.equal(buono.copie[0].tipo, 'riferimento');
});

// --- chi scrive tocca solo il file attuale ----------------------------------------------------------------

test('migra-parata: un personaggio per riga, e il file attuale', () => {
  const c = cartellaComeDavide();
  // si mette il Talento di prima in TUTTE le versioni di un personaggio: il rapporto deve dare una riga sola
  const chi = c.voci[0];
  for (const f of chi.file) {
    const o = JSON.parse(readFileSync(f.percorso, 'utf8'));
    o.livelli = [...(o.livelli ?? [])];
    if (!o.livelli.length) o.livelli.push({});
    o.livelli[0] = { ...o.livelli[0], talentoClasse: 'Parata a Mani Nude' };
    writeFileSync(f.percorso, `${JSON.stringify(o, null, 2)}\n`);
  }
  const righe = rapportoParata(c.cartella);
  const mie = righe.filter((r) => r.nome.includes(chi.chiave));
  assert.equal(mie.length, 1, `${mie.length} righe per un personaggio: con cinque versioni ne dava cinque, e --scrivi le riscriveva tutte`);
  assert.equal(mie[0].nome, chi.attuale.nome, 'la riga non è sul file attuale');
  assert.equal(mie[0].versioni, 5);
});

test('la copia zip di sicurezza prende tutto, di proposito: è quella a cui si torna indietro', async () => {
  const { copiaZip } = await import('../tools/adegua-abilita.mjs');
  const c = cartellaComeDavide();
  const z = copiaZip({ cartella: c.cartella, salvataggi: c.salvataggi });
  assert.equal(z.quanti, c.quantiFile,
    'la copia contiene solo i file attuali: non riporterebbe la cartella com’era, e l’annullamento non avrebbe una rete');
});

test('applica e annulla non toccano un solo byte delle versioni vecchie', async () => {
  const { applica, annulla } = await import('../tools/adegua-abilita.mjs');
  const { datiReali } = await import('./helpers.js');
  const { dati } = await datiReali();
  const c = cartellaComeDavide({ escludi: ['Fratello-Anselmo-Viri'] });
  const vecchie = Object.fromEntries(Object.entries(improntaCartella(c.cartella))
    .filter(([f]) => !c.voci.some((v) => v.attuale.nome === f)));
  await applica({ cartella: c.cartella, salvataggi: c.salvataggi, d: dati });
  for (const v of c.voci) await annulla({ cartella: c.cartella, chi: v.nome, d: dati });
  const dopo = improntaCartella(c.cartella);
  assert.deepEqual(differenze(vecchie, Object.fromEntries(Object.entries(dopo).filter(([f]) => f in vecchie))), [],
    'una versione vecchia è cambiata: le serate di prima non si riscrivono');
  assert.equal(Object.keys(vecchie).length, c.quantiFile - c.voci.length);
});
