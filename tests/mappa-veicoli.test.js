// Veicoli sulla mappa (fase 2, lotto 5; richiesta di Marcello del 07/10/2026; src/mappa/veicoli-mappa.js): immagine e
// ingombro dalla scheda del veicolo, rotazione a 90° con l'ingombro, salire e scendere (conducente e passeggeri, posti),
// passeggeri che si muovono con il mezzo, linea di tiro dal veicolo, vista giocatori senza i nascosti, formato e Ctrl+Z.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { datiReali, copia } from './helpers.js';
import { direzioneDi, ingombroOrientato, angoloImmagine, ruotaVeicolo, ruotaSeLibero, postiDi, sali, scendi, qPerScendere, veicoliVicini, aBordo, chiaviABordo, veicoloDi } from '../src/mappa/veicoli-mappa.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { annullaUltima, muoviToken } from '../src/mappa/annulla.js';
import { pezziDellaScena, pezziSenzaToken, tokenPerPezzo } from '../src/mappa/partecipanti.js';
import { profiloVeicolo } from '../src/veicoli.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { tokenPg, lineaDiTiro, ostacoliVista } from '../src/mappa/visuale.js';
import { celleToken } from '../src/mappa/token.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const scout = profiloVeicolo('asa-scout-mk4', dati);
const POSTI = postiDi(scout);
const tok = (id, q, o = {}) => ({ id, rif: { tipo: 'partecipante', id }, q, ingombro: 1, nascosto: false, ...o });
const veicolo = (q, o = {}) => ({ id: 'tv', rif: { tipo: 'veicolo', id: 'vei-scout' }, q, ingombro: [2, 4], direzione: 's', nascosto: false, ...o });
const scena = (token) => ({ ...nuovaScena({ id: 'vei', nome: 'Vei', colonne: 20, righe: 20, nebbia: 'scoperta', dati }), revisione: 0, token });

test('dati: immagine dello Scout leggera e tracciata; ingombro dal profilo (4 × 2 Q del manuale); posti 1 + 7', () => {
  assert.equal(scout.mappa.immagine, 'img/Tokens/ASAScout-mappa.png');
  assert.equal(scout.mappa.muso_immagine, 's');
  assert.ok(statSync(new URL(`../${scout.mappa.immagine}`, import.meta.url)).size < 80 * 1024);
  assert.equal(execFileSync('git', ['ls-files', scout.mappa.immagine], { cwd: new URL('..', import.meta.url) }).toString().trim(), scout.mappa.immagine);
  assert.equal(scout.dimensioni.ingombro_q, '4 × 2');
  assert.deepEqual(POSTI, { conducente: 1, passeggeri: 7 });
  assert.equal(dati.veicoli.mappa.salire_azioni, null, 'A.145: costo da definire');
  assert.match(dati.veicoli.mappa['TODO(Davide)'], /^A\.145/);
  assert.match(dati.veicoli.mappa['TODO(Davide) opportunita'], /^A\.146/);
  const d = copia(dati);
  d.veicoli.profili.find((p) => p.id === 'asa-scout-mk4').mappa.muso_immagine = 'nord';
  assert.ok(validaDati(d).some((e) => e.file === 'veicoli.json' && /muso_immagine/.test(e.chiave)));
  // il pezzo del veicolo: verticale (muso in basso), con immagine e posti; il token nuovo ha la direzione
  const pezzi = pezziDellaScena({ veicoli: [{ id: 'vei-scout', proprietario: { tipo: 'gruppo' }, conducente: null, mezzo: { profilo: 'asa-scout-mk4', nome: 'Scout' } }] }, dati);
  const v = pezzi.find((p) => p.tipo === 'veicolo');
  assert.deepEqual([v.ingombro, v.immagine, v.posti], [[2, 4], scout.mappa.immagine, POSTI]);
  assert.deepEqual(tokenPerPezzo(v, [3, 3]).direzione, 's');
});

test('orientamento: ingombro e immagine ruotano insieme a passi di 90°, attorno al centro e dentro la griglia', () => {
  assert.deepEqual(['s', 'o', 'n', 'e'].map((d) => ingombroOrientato([4, 2], d)), [[2, 4], [4, 2], [2, 4], [4, 2]]);
  assert.deepEqual(['s', 'o', 'n', 'e'].map((d) => angoloImmagine(d, 's')), [0, 90, 180, 270]);
  assert.equal(direzioneDi({ ingombro: [4, 2] }), 'e', 'scene di prima: più largo che alto');
  const v = veicolo([5, 5]);
  const r = ruotaVeicolo(v, 1, { colonne: 20, righe: 20 });
  assert.deepEqual([r.direzione, r.ingombro, r.q], ['o', [4, 2], [4, 6]]);
  const indietro = ruotaVeicolo(r, -1, { colonne: 20, righe: 20 });
  assert.deepEqual([indietro.direzione, indietro.ingombro, indietro.q], ['s', [2, 4], [5, 5]]);
  // quattro giri: come prima
  let x = v; for (let i = 0; i < 4; i++) x = ruotaVeicolo(x, 1, { colonne: 20, righe: 20 });
  assert.deepEqual([x.direzione, x.ingombro, x.q], ['s', [2, 4], [5, 5]]);
  // al bordo resta dentro la griglia
  assert.deepEqual(ruotaVeicolo(veicolo([0, 0]), 1, { colonne: 20, righe: 20 }).q, [0, 1]);
  // un token in mezzo o un muro impediscono la rotazione
  const s = scena([v, tok('pg:a', [7, 7])]);
  assert.match(ruotaSeLibero(s, 'tv', 1).errore, /altro token/);
  assert.ok(ruotaSeLibero(scena([v]), 'tv', 1).token);
  assert.match(ruotaSeLibero(scena([v]), 'tv', 1, (xx, yy) => xx === 4 && yy === 6).errore, /muro/);
});

test('salire: accanto al mezzo, posti e un solo conducente; il token esce dalla mappa e va a bordo; Ctrl+Z', () => {
  const lontano = tok('pg:lontano', [12, 12]);
  let s = scena([veicolo([5, 5]), tok('pg:lucas', [7, 5]), tok('pg:oshi', [4, 9]), tok('nem:x:1', [6, 9]), lontano]);
  assert.deepEqual(veicoliVicini(s, s.token[1]).map((v) => v.id), ['tv']);
  assert.deepEqual(veicoliVicini(s, lontano), []);
  assert.match(sali(s, 'pg:lontano', 'tv', 'passeggero', POSTI, dati).errore, /accanto/);
  s = sali(s, 'pg:lucas', 'tv', 'conducente', POSTI, dati).scena;
  assert.match(sali(s, 'pg:oshi', 'tv', 'conducente', POSTI, dati).errore, /conducente è già occupato/);
  s = sali(s, 'pg:oshi', 'tv', 'passeggero', POSTI, dati).scena;
  s = sali(s, 'nem:x:1', 'tv', 'passeggero', POSTI, dati).scena;
  const v = s.token.find((t) => t.id === 'tv');
  assert.deepEqual(aBordo(v).map((p) => [p.id, p.ruolo, p.q]), [['pg:lucas', 'conducente', undefined], ['pg:oshi', 'passeggero', undefined], ['nem:x:1', 'passeggero', undefined]]);
  assert.deepEqual(s.token.map((t) => t.id).sort(), ['pg:lontano', 'tv']);
  assert.equal(validaScena(s, dati), null);
  assert.deepEqual([...chiaviABordo(s)].sort(), ['partecipante:nem:x:1', 'partecipante:pg:lucas', 'partecipante:pg:oshi']);
  assert.equal(veicoloDi(s, 'partecipante:pg:oshi').passeggero.ruolo, 'passeggero');
  // posti finiti
  assert.match(sali(scena([veicolo([5, 5]), tok('pg:a', [7, 5])]), 'pg:a', 'tv', 'passeggero', { conducente: 1, passeggeri: 0 }, dati).errore, /posti/);
  // Ctrl+Z dell'ultima salita: il nemico torna in mappa dov'era
  const u = annullaUltima(s).scena;
  assert.deepEqual(u.token.find((t) => t.id === 'nem:x:1').q, [6, 9]);
  assert.equal(aBordo(u.token.find((t) => t.id === 'tv')).length, 2);
  // chi è a bordo ha un token: non è fra i «senza token»
  assert.deepEqual(pezziSenzaToken(s, [{ chiave: 'partecipante:pg:oshi' }, { chiave: 'partecipante:pg:nuovo' }]).map((p) => p.chiave), ['partecipante:pg:nuovo']);
});

test('i passeggeri vanno con il veicolo; scendere in un quadretto libero accanto; Ctrl+Z', () => {
  let s = scena([veicolo([5, 5]), tok('pg:lucas', [7, 5]), tok('pg:oshi', [7, 6])]);
  s = sali(s, 'pg:lucas', 'tv', 'conducente', POSTI, dati).scena;
  s = sali(s, 'pg:oshi', 'tv', 'passeggero', POSTI, dati).scena;
  // il veicolo si muove: chi è a bordo è con lui (nessun Q proprio)
  const mosso = muoviToken(s, 'tv', { da: [5, 5], a: [10, 5], percorso: [[5, 5], [10, 5]], costo: 5, fascia: 'passo', scontro: null, round: null }, dati);
  const v = (mosso.scena ?? mosso).token.find((t) => t.id === 'tv');
  assert.deepEqual([v.q, aBordo(v).length], [[10, 5], 2]);
  s = mosso.scena ?? mosso;
  // dove si può scendere: anello di 1 Q attorno al 2 × 4, liberi
  const celle = qPerScendere(s, 'tv', 'pg:oshi');
  assert.equal(celle.length, 2 * 2 + 2 * 4 + 4);
  assert.ok(celle.every(([x, y]) => !celleToken(v).some(([a, b]) => a === x && b === y)));
  assert.match(scendi(s, 'tv', 'pg:oshi', [15, 15], dati).errore, /accanto/);
  assert.match(scendi(s, 'tv', 'pg:oshi', [11, 6], dati).errore, /accanto/, 'dentro il veicolo no');
  const r = scendi(s, 'tv', 'pg:oshi', [12, 5], dati);
  assert.deepEqual(r.scena.token.find((t) => t.id === 'pg:oshi').q, [12, 5]);
  assert.equal(r.passeggero.ruolo, 'passeggero');
  assert.deepEqual(aBordo(r.scena.token.find((t) => t.id === 'tv')).map((p) => p.id), ['pg:lucas']);
  assert.equal(validaScena(r.scena, dati), null);
  // Ctrl+Z: di nuovo a bordo
  const u = annullaUltima(r.scena).scena;
  assert.equal(u.token.some((t) => t.id === 'pg:oshi'), false);
  assert.equal(aBordo(u.token.find((t) => t.id === 'tv')).length, 2);
});

test('formato della scena: direzione e passeggeri solo per i veicoli; un partecipante non sta a bordo e in mappa', () => {
  const s = scena([veicolo([5, 5], { passeggeri: [{ id: 'pg:a', rif: { tipo: 'partecipante', id: 'pg:a' }, ingombro: 1, nascosto: false, ruolo: 'passeggero' }] })]);
  assert.equal(validaScena(s, dati), null);
  assert.match(validaScena({ ...s, token: [...s.token, tok('pg:a', [1, 1], { id: 't-pg-a' })] }, dati), /ha già un token/);
  assert.match(validaScena(scena([tok('pg:b', [1, 1], { direzione: 's' })]), dati), /direzione/);
  assert.match(validaScena(scena([veicolo([5, 5], { direzione: 'nord' })]), dati), /direzione/);
  assert.match(validaScena(scena([veicolo([5, 5], { passeggeri: [{ id: 'x', rif: { tipo: 'partecipante', id: 'x' }, ingombro: 1, nascosto: false, ruolo: 'pilota' }] })]), dati), /ruolo/);
  const due = { id: 'c', rif: { tipo: 'partecipante', id: 'c' }, ingombro: 1, nascosto: false, ruolo: 'conducente' };
  assert.match(validaScena(scena([veicolo([5, 5], { passeggeri: [due, { ...due, id: 'd', rif: { tipo: 'partecipante', id: 'd' } }] })]), dati), /un solo conducente/);
});

test('linea di tiro: il veicolo è un ostacolo come un token grande; chi è a bordo tira dal mezzo; nebbia automatica', () => {
  const v = veicolo([8, 4]);
  const s = scena([tok('pg:a', [2, 5]), v, tok('nem:x:1', [14, 5])]);
  const ost = ostacoliVista(s, dati.mappa.porte);
  const r = lineaDiTiro(s, s.token[0], s.token[2], ost, dati.mappa.visuale);
  assert.ok(r.inMezzo.some((t) => t.id === 'tv') || r.causa.token.some((t) => t.id === 'tv'), 'il veicolo sta in mezzo');
  // dal veicolo (passeggero a bordo): la distanza si conta dall'ingombro del mezzo
  const dalMezzo = lineaDiTiro(s, v, s.token[2], ost, dati.mappa.visuale);
  assert.equal(dalMezzo.distanza, 5, 'dal bordo del 2 × 4 (colonne 8–9) al Q 14');
  // un PG a bordo guarda dal veicolo (nebbia automatica)
  const conPg = sali(scena([v, tok('pg:a', [10, 5])]), 'pg:a', 'tv', 'passeggero', POSTI, dati).scena;
  assert.deepEqual(tokenPg(conPg).map((t) => t.id), ['tv']);
  assert.deepEqual(tokenPg(scena([v])).map((t) => t.id), []);
});

test('vista giocatori: veicolo con muso e immagine, passeggeri visibili sì, nascosti no', () => {
  let s = scena([veicolo([5, 5]), tok('pg:lucas', [7, 5]), tok('nem:x:1', [7, 6], { nascosto: true })]);
  s = sali(s, 'pg:lucas', 'tv', 'conducente', POSTI, dati).scena;
  s = sali(s, 'nem:x:1', 'tv', 'passeggero', POSTI, dati).scena;
  const pezzi = [
    { chiave: 'veicolo:vei-scout', tipo: 'veicolo', lato: 'pg', nome: 'Scout', iniziali: 'SC', immagine: scout.mappa.immagine, musoImmagine: 's' },
    { chiave: 'partecipante:pg:lucas', tipo: 'pg', lato: 'pg', nome: 'Lucas', iniziali: 'LU' },
    { chiave: 'partecipante:nem:x:1', tipo: 'nemico', lato: 'avversario', nome: 'X 1', iniziali: 'X1' },
  ];
  const vista = vistaGiocatori(s, { pezzi, round: 1, regoleMappa: dati.mappa, regoleTemplate: dati.mappa.template });
  const v = vista.token.find((t) => t.id === 'tv');
  assert.equal(v.direzione, 's');
  assert.deepEqual([v.info.veicoloImmagine, v.info.musoImmagine], [scout.mappa.immagine, 's']);
  assert.deepEqual(v.passeggeri.map((p) => [p.id, p.ruolo, p.info?.nome]), [['pg:lucas', 'conducente', 'Lucas']]);
  assert.ok(!JSON.stringify(vista).includes('nem:x:1'), 'il nemico nascosto a bordo non arriva');
  // senza nessun passeggero visibile, niente campo
  const vuoto = vistaGiocatori(scena([veicolo([5, 5])]), { pezzi, round: 1, regoleMappa: dati.mappa, regoleTemplate: dati.mappa.template });
  assert.equal(vuoto.token[0].passeggeri, undefined);
});

test('cerchietti di chi è a bordo: due terzi di un Q, in griglia sull’ingombro (ritocchi del 08/10)', async () => {
  const { postiCerchietti } = await import('../src/mappa/veicoli-mappa.js');
  const qs = 60;
  // Scout verticale 2 × 4 Q: tre per riga, otto persone in tre righe, dentro il mezzo
  const p = postiCerchietti(8, { x: 0, y: 0, w: 2 * qs, h: 4 * qs }, qs);
  assert.ok(p.every((x) => Math.abs(x.lato - qs * 2 / 3) < 1e-9));
  assert.deepEqual([...new Set(p.map((x) => Math.round(x.y)))], [0, 40, 80]);
  assert.ok(p.every((x) => x.x >= 0 && x.x + x.lato <= 2 * qs + 1e-9 && x.y + x.lato <= 4 * qs));
  // orizzontale 4 × 2: sei per riga
  assert.equal(new Set(postiCerchietti(8, { x: 0, y: 0, w: 4 * qs, h: 2 * qs }, qs).map((x) => x.y)).size, 2);
  // uno solo: centrato in alto
  const [u] = postiCerchietti(1, { x: 0, y: 0, w: 2 * qs, h: 4 * qs }, qs);
  assert.equal(u.x, (2 * qs - u.lato) / 2);
});

test('veicolo che si muove (ritocchi del 08/10): area con il conducente anche fuori dal suo turno; motivi chiari altrimenti', async () => {
  const { statoMovimento, muoviVeicolo } = await import('../src/veicoli-registro.js');
  const { veicoloFermo } = await import('../src/mappa/veicoli-mappa.js');
  const scontro = { id: 'sc', stato: 'aperto', round: 2, partecipanti: [{ id: 'pg:lucas', tipo: 'pg', chiave: 'LUCAS' }, { id: 'pg:oshi', tipo: 'pg', chiave: 'OSHI' }] };
  const rec = { id: 'v', conducente: { chiave: 'LUCAS', nome: 'Lucas' }, movimento: null };
  const turnoOshi = { id: 'pg:oshi' }, turnoLucas = { id: 'pg:lucas' };
  // la plancia («Muovi») resta all'Iniziativa del conducente; la mappa lo lascia muovere al master anche fuori turno
  assert.equal(statoMovimento(rec, scontro, turnoOshi).puo, false);
  const fuori = statoMovimento(rec, scontro, turnoOshi, { fuoriTurno: true });
  assert.deepEqual([fuori.puo, fuori.fuori], [true, true]);
  assert.match(veicoloFermo(rec, scontro, fuori).nota, /Fuori dal turno di Lucas: il master lo muove comunque, una volta per Round/);
  assert.deepEqual(veicoloFermo(rec, scontro, statoMovimento(rec, scontro, turnoLucas, { fuoriTurno: true })), { motivo: null, nota: null });
  // una volta per Round anche fuori turno: il registro segna il movimento
  const mosso = muoviVeicolo(rec, scontro, turnoOshi, { fuoriTurno: true });
  assert.deepEqual(mosso.movimento, { scontro: 'sc', round: 2, da: 'Lucas' });
  assert.match(veicoloFermo(mosso, scontro, statoMovimento(mosso, scontro, turnoOshi, { fuoriTurno: true })).motivo, /già mosso nel Round 2.*un solo movimento per Round.*Libero \(Maiusc\)/);
  assert.throws(() => muoviVeicolo(rec, scontro, turnoOshi), /all’Iniziativa di Lucas/);
  // senza conducente, senza scontro, conducente fuori dallo scontro: il motivo dice cosa fare
  const senza = { ...rec, conducente: null };
  assert.equal(veicoloFermo(senza, scontro, statoMovimento(senza, scontro, turnoOshi, { fuoriTurno: true })).motivo, 'Nessun conducente a bordo: fai salire un PG come conducente, oppure usa Libero (Maiusc)');
  assert.match(veicoloFermo(rec, null, null).motivo, /^Nessuno scontro aperto: .*Libero \(Maiusc\)$/);
  const altro = { ...rec, conducente: { chiave: 'NADIA', nome: 'Nadia' } };
  assert.match(veicoloFermo(altro, scontro, statoMovimento(altro, scontro, turnoOshi, { fuoriTurno: true })).motivo, /Nadia \(il conducente\) non è nello scontro/);
});

test('area del veicolo sull’ingombro intero, anche ruotato di 90°', async () => {
  const { areaRaggiungibile, costoVerso } = await import('../src/mappa/area.js');
  const { nuovaMaschera, rettangolo, impostaCella } = await import('../src/mappa/celle.js');
  const C = 20, R = 20;
  // un muro verticale alla colonna 10, con un varco alto 3 Q (righe 8–10)
  const muri = rettangolo(nuovaMaschera(C, R), C, R, 10, 0, 10, 19, true);
  for (let y = 8; y <= 10; y++) impostaCella(muri, C, R, 10, y, false);
  const a = (ingombro) => areaRaggiungibile({ colonne: C, righe: R, muri, terreno: nuovaMaschera(C, R), token: [], chi: { id: 'tv', q: [4, 8], ingombro, lato: 'pg' }, massimo: 30, regole: dati.mappa.movimento });
  // in orizzontale (4 × 2) passa dal varco alto 3; in verticale (2 × 4) no
  assert.ok(Number.isFinite(costoVerso(a([4, 2]), [14, 8])));
  assert.equal(costoVerso(a([2, 4]), [14, 8]), Infinity);
  // il veicolo ruotato occupa i suoi Q: la prima cella oltre il bordo destro si raggiunge in 1 Q
  assert.equal(costoVerso(a([4, 2]), [5, 8]), 1);
});
