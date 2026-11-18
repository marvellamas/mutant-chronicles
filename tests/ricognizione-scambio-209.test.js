import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 209 (17/11/2026), parte A — l'E&L si controlla come un manuale.
//
// Il difetto. Il documento «E&L – Risposte e correzioni approvate» è dov'è finita tre volte la specifica completa di un
// lavoro (l'adeguamento delle Abilità, i venticinque PNG, il raccordo sanitario), e la nostra copia è rimasta indietro di
// **un mese** (15/10 contro 15/11) con quattro raccordi non numerati dentro. Il registro lo conosceva (era un
// documento di scambio con la sua data), ma la ricognizione diceva «coincidono» a qualunque data, purché l'ID
// rispondesse: `coincidono: Boolean(f)`.
//
// Il criterio, dichiarato (l'E&L non ha un numero di versione e la regola 4 del 188 non si può applicare):
//  - la data esatta, al secondo, dice **che** è cambiato;
//  - l'impronta del testo dice **se** è cambiato quando la data è uguale o quando si ha il testo fresco;
//  - in tutti i casi la conseguenza è una: va letto per intero, blocchi non numerati compresi.
//
// Le prove che devono restare rosse: se l'E&L cambia su Drive e il controllo di inizio sessione non lo dice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { registro, testoManuale, improntaTesto } from '../tools/manuali.mjs';
import { referto, letturaScambio, righeDaLeggere, blocchiDelTesto } from '../tools/ricognizione-manuali.mjs';

const reg = registro();
const EL = reg.scambio.find((v) => v.id === 'e-l');
const PD = reg.scambio.find((v) => v.id === 'per-davide');

// Lotto 218: nessuna data è scritta a mano. La data dell'E&L e del Doc cambia ogni volta che Davide scrive e che noi
// riscarichiamo il testo (lo ha cambiato il 17/11 e il test è diventato rosso): il registro dice com'è oggi, il test
// ne ricava «un secondo dopo», «un giorno dopo» e «uguale tranne i millisecondi». Il senso è la differenza, non il giorno.
const unSecondoDopo = (iso) => new Date(Date.parse(iso) + 1000).toISOString();
const unGiornoDopo = (iso) => new Date(Date.parse(iso) + 86400000).toISOString();

/** L'elenco di Drive come lo darebbe la ricerca nella cartella: tutto uguale al registro, salvo `cambia`. */
function drive(cambia = {}) {
  return [...reg.manuali, ...reg.schede, ...reg.scambio].map((v) => ({
    id: v.drive,
    title: `${v.nome} ${v.versione ? `v${v.versione}` : ''}`.trim(),
    modifiedTime: cambia[v.id] ?? v.modificato,
  }));
}

test('i documenti di scambio sono nel registro con la data esatta e l\'impronta del testo salvato', () => {
  assert.equal(reg.scambio.length, 2);
  for (const v of reg.scambio) {
    assert.match(v.modificato, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/, `${v.id}: la data`);
    assert.match(v.impronta, /^[0-9a-f]{12}$/, `${v.id}: manca l'impronta`);
    // se qualcuno risalva il testo senza aggiornare il registro, l'impronta non torna e il controllo lo dice
    assert.equal(improntaTesto(testoManuale(v.id)), v.impronta, `${v.id}: il testo salvato non è quello che il registro dice (aggiorna modificato e impronta insieme)`);
  }
});

test('con tutto uguale al registro, l\'E&L e il Doc non risultano da leggere', () => {
  const r = referto(drive());
  assert.equal(r.daLeggere.length, 0);
  assert.equal(righeDaLeggere(r).length, 0);
  assert.equal(r.righe.find((x) => x.id === 'e-l').coincidono, true);
});

test('se l\'E&L cambia su Drive, la ricognizione lo dice: va letto per intero, blocchi non numerati compresi', () => {
  const r = referto(drive({ 'e-l': unGiornoDopo(EL.modificato) }));
  assert.deepEqual(r.daLeggere.map((x) => x.id), ['e-l'], 'solo l\'E&L');
  const riga = r.righe.find((x) => x.id === 'e-l');
  assert.equal(riga.coincidono, false, 'prima della correzione diceva «coincidono» purché l\'ID rispondesse');
  assert.match(riga.motivi_lettura[0], /la data è cambiata/);
  const testo = righeDaLeggere(r).join('\n');
  assert.match(testo, /DA LEGGERE PER INTERO — E&L/);
  assert.match(testo, /Blocchi non numerati compresi/);
  // un cambio d'ora di un solo secondo vale: un blocco aggiunto in coda cambia la data e non il titolo di niente
  assert.equal(referto(drive({ 'e-l': unSecondoDopo(EL.modificato) })).daLeggere.length, 1);
  // i millisecondi no: Drive li dà e il registro no
  assert.equal(referto(drive({ 'e-l': EL.modificato.replace('Z', '.177Z') })).daLeggere.length, 0);
  // vale anche per il Doc «per-davide»: è il secondo documento di scambio
  assert.deepEqual(referto(drive({ 'per-davide': unGiornoDopo(PD.modificato) })).daLeggere.map((x) => x.id), ['per-davide']);
});

test('con la stessa data ma il testo diverso, l\'impronta se ne accorge e nomina i blocchi nuovi (anche quelli senza numero)', () => {
  const salvato = testoManuale('e-l');
  const fresco = `${salvato}\n\n## **18 novembre 2026 — Raccordo dei Veicoli**\nTesto senza numero di domanda.\n\n# A.280 — Una domanda numerata\nTesto.\n`;
  const l = letturaScambio(EL, { modifiedTime: EL.modificato }, salvato, fresco);
  assert.equal(l.daLeggere, true, 'la data è uguale ma l\'impronta no');
  assert.match(l.motivi.join(' '), /impronta/);
  assert.equal(l.blocchiNuovi.length, 2);
  assert.deepEqual(l.blocchiNuovi.map((b) => b.numerato), [false, true]);
  const r = referto(drive(), { 'e-l': fresco });
  const testo = righeDaLeggere(r).join('\n');
  assert.match(testo, /senza numero: 1/);
  assert.match(testo, /\(!\) 18 novembre 2026 — Raccordo dei Veicoli/);
  // lo stesso testo, riletto, non è un cambiamento
  assert.equal(letturaScambio(EL, { modifiedTime: EL.modificato }, salvato, salvato).daLeggere, false);
});

test('blocchiDelTesto riconosce i titoli dell\'E&L, con e senza numero', () => {
  const b = blocchiDelTesto(testoManuale('e-l'));
  assert.ok(b.length > 200, `l'E&L ha centinaia di blocchi, ne ho letti ${b.length}`);
  const numerati = b.filter((x) => x.numerato).length;
  assert.ok(numerati > 100 && b.length - numerati > 10, 'ci sono blocchi con e senza numero: sono quelli senza che non passano dal Doc');
  assert.ok(b.some((x) => /Raccordo/.test(x.titolo) && !x.numerato), 'i raccordi non hanno numero');
});

test('dalla riga di comando, il controllo di inizio sessione dice che l\'E&L è cambiato (e con tutto uguale non lo dice)', () => {
  const cartella = mkdtempSync(join(tmpdir(), 'mutant-ricognizione-'));
  const lancia = (cambia) => {
    const f = join(cartella, 'drive.json');
    writeFileSync(f, JSON.stringify({ files: drive(cambia) }));
    return spawnSync(process.execPath, ['tools/ricognizione-manuali.mjs', `--drive=${f}`], { cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 90000 });
  };
  const uguale = lancia({});
  assert.doesNotMatch(uguale.stdout, /DA LEGGERE PER INTERO/);
  assert.notEqual(uguale.status, 3);
  const cambiato = lancia({ 'e-l': unGiornoDopo(EL.modificato) });
  assert.equal(cambiato.status, 3, `uscita 3 = documento di scambio da leggere. ${cambiato.stdout.slice(-400)}`);
  assert.match(cambiato.stdout, /DA LEGGERE PER INTERO — E&L/);
  assert.match(cambiato.stdout, /Blocchi non numerati compresi/);
  assert.doesNotMatch(cambiato.stdout, /Tutto in ordine/, 'un E&L cambiato non è «tutto in ordine»');
});
