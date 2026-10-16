// Veicoli: A.113 (permessi, sola lettura senza server, denominazioni), A.145 (tabella delle azioni),
// A.146 (Attacchi di Opportunità) e A.147 (otto orientamenti a 45°). Risposte approvate il 15/10/2026.
// Tutti i valori stanno nei dati; nessuna automazione nuova (CLAUDE.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { riferimento, copiaDi, conCopie, mezzoDallaCopia, permessiVeicolo, nuovoRecord, vede } from '../src/veicoli-registro.js';
import { normalizzaVeicoli } from '../src/veicoli.js';
import { formaRuotata } from '../src/mappa/forma.js';
import { ruotaSeLibero } from '../src/mappa/veicoli-mappa.js';
import { celleToken } from '../src/mappa/token.js';

const { dati } = await datiReali();
const pablo = { pg: 'pg1', chiave: 'pablozaion', nome: 'Pablo Zaion' };
const altro = { pg: 'pg2', chiave: 'oshinagata', nome: 'Oshi Nagata' };
const scout = () => ({ uid: 'veimuu14mqa0', profilo: dati.veicoli.profili[0].id, nome: 'Scout', gruppo: false, conducente: false, andatura: 'fermo', pi: {}, rinforzi: {}, energia: {}, munizioni: {}, avarie: '' });

test('A.147: il passo di base sono gli otto orientamenti a 45°, il passo fine resta per il master', () => {
  const RV = dati.mappa.token.rotazione_veicoli;
  assert.equal(RV.passo_gradi, 45);
  assert.equal(RV.passo_fine_gradi, 10);
  assert.equal(RV['TODO(Davide)'], undefined, 'il TODO è stato tolto');
  const M = dati.veicoli.manovre_rotazione;
  assert.equal(M.costo_in_q, 0, 'nessun costo automatico «1 Q ogni 45°»');
  assert.deepEqual(M.orientamenti_gradi, [0, 45, 90, 135, 180, 225, 270, 315]);
  const nomi = M.manovre.map((x) => x.nome);
  assert.ok(nomi.includes('Sterzata stretta') && nomi.includes('Inversione rapida') && nomi.includes('Rotazione sul posto'));
  assert.equal(M.manovre.find((x) => x.nome === 'Sterzata stretta').prova, 'Pilotare −2');
  assert.equal(M.manovre.find((x) => x.nome === 'Inversione rapida').prova, 'Pilotare −4');
  // i gradi del passo di base danno tutti e otto gli orientamenti
  const giri = Array.from({ length: 360 / RV.passo_gradi }, (_, i) => i * RV.passo_gradi);
  for (const g of M.orientamenti_gradi) assert.ok(giri.includes(g), `${g}° raggiungibile`);
});

test('A.147: l’ingombro si controlla nell’orientamento effettivo, anche in diagonale', () => {
  // lo Scout 4 × 2 ruotato di 45° occupa i quadretti coperti per almeno metà, non un rettangolo dritto
  const a0 = formaRuotata([4, 2], 0);
  const a45 = formaRuotata([4, 2], 45);
  assert.deepEqual(a0.ingombro, [2, 4]);
  assert.notDeepEqual(a45.ingombro, a0.ingombro, 'a 45° l’ingombro cambia');
  assert.equal(a45.celle.length, a0.celle.length, 'stessi quadretti occupati, disposti in diagonale');
  // la rotazione non passa se i quadretti dell'orientamento effettivo finiscono su un muro
  const griglia = { colonne: 10, righe: 10, q_px: 50, scosto_x: 0, scosto_y: 0 };
  const scena = { griglia, token: [{ id: 'v', rif: { tipo: 'veicolo', id: 'v1' }, q: [4, 4], base: [4, 2], ingombro: a0.ingombro, angolo: 0 }] };
  const libero = ruotaSeLibero(scena, 'v', 45, () => false);
  assert.ok(libero.token, 'senza ostacoli si gira');
  assert.equal(libero.token.angolo, 45);
  const celle = celleToken(libero.token);
  const occupato = new Set(celle.map(([x, y]) => `${x},${y}`));
  const bloccato = ruotaSeLibero(scena, 'v', 45, (x, y) => occupato.has(`${x},${y}`));
  assert.equal(bloccato.token, undefined, 'con un muro nell’orientamento effettivo non si gira');
  assert.match(bloccato.errore, /muro|token/);
});

test('A.113: permessi, sola lettura senza server e denominazioni ufficiali', () => {
  const P = dati.veicoli.personaggio.permessi;
  assert.equal(P.direttore, 'tutti');
  assert.equal(P.proprieta_resta_al_pg, true);
  assert.equal(P.senza_server, 'sola_lettura');
  assert.deepEqual(P.denominazioni, ['Corpo principale', 'Propulsione', 'Motore']);
  assert.equal(dati.veicoli.personaggio['TODO(Davide)'], undefined);
  // le denominazioni ufficiali sono quelle del catalogo
  const nomi = dati.veicoli.strutture.elenco.map((s) => s.nome);
  for (const n of P.denominazioni) assert.ok(nomi.includes(n), `${n} fra le strutture`);
  assert.ok(!nomi.includes('Carrozzeria'));
  // il master cambia tutto, anche i mezzi che non vede come giocatore
  const rec = nuovoRecord(scout(), pablo);
  assert.equal(vede(rec, altro), false);
  assert.equal(permessiVeicolo(rec, altro, { server: true, master: true }, dati).puoCambiare, true);
  assert.equal(permessiVeicolo(rec, altro, { server: true, master: false }, dati).puoCambiare, false);
  assert.equal(permessiVeicolo(rec, pablo, { server: true, master: false }, dati).puoCambiare, true);
  // senza server nessuno scrive: si consulta l'ultima copia
  const senza = permessiVeicolo(rec, pablo, { server: false, master: true }, dati);
  assert.equal(senza.puoCambiare, false);
  assert.match(senza.motivo, /sola lettura/i);
});

test('A.113: l’ultima copia viaggia con il riferimento e si consulta senza server', () => {
  const rec = { ...nuovoRecord(scout(), pablo), revisione: 3, aggiornato: '2026-10-15T20:00:00.000Z' };
  const rif = riferimento(rec);
  assert.deepEqual(rif.copia, copiaDi(rec));
  assert.equal(rif.copia.revisione, 3);
  const mezzo = mezzoDallaCopia(rif);
  assert.equal(mezzo.nome, 'Scout');
  assert.equal(mezzo.conducente, false, 'la copia non fa guidare nessuno');
  assert.equal(mezzo._copia.revisione, 3);
  assert.equal(mezzoDallaCopia({ uid: 'x', rif: 'x', nome: 'x' }), null, 'un riferimento vecchio, senza copia, non rompe nulla');
  // la copia si aggiorna solo quando cambia davvero
  const scelte = [rif];
  assert.equal(conCopie(scelte, [rec]), scelte, 'niente da scrivere se la copia è già quella');
  const dopo = conCopie(scelte, [{ ...rec, revisione: 4, mezzo: { ...rec.mezzo, nome: 'Scout II' } }]);
  assert.notEqual(dopo, scelte);
  assert.equal(dopo[0].copia.revisione, 4);
  assert.equal(dopo[0].nome, 'Scout II');
  // e sopravvive al salvataggio del personaggio
  const [n] = normalizzaVeicoli(dopo, dati);
  assert.equal(n.copia.revisione, 4);
});

test('A.145: la tabella è un promemoria, senza conteggi automatici', () => {
  const T = dati.veicoli.azioni.tabella;
  assert.equal(dati.veicoli.azioni['TODO(Davide)'], undefined);
  assert.match(T.nota, /non conta le Azioni/);
  // le categorie della risposta ci sono tutte
  for (const c of ['Generale', 'Auto e moto', 'Moto', 'Imbarcazioni', 'Remi', 'Vela', 'Velivoli atmosferici', 'Astronavi']) {
    assert.ok(T.categorie.includes(c), c);
    assert.ok(T.righe.some((r) => r.categoria === c), `righe per ${c}`);
  }
  const generale = (op) => T.righe.find((r) => r.categoria === 'Generale' && r.operazione === op)?.costo ?? '';
  assert.match(generale('Salire o scendere'), /1 AzP/);
  assert.match(generale('Prendere posto ai comandi'), /1 AzP/);
  assert.match(generale('Avviare il mezzo già predisposto'), /1 AzP/);
  assert.match(generale('Condurre e muovere il mezzo'), /1 AzM per Round/);
  assert.match(generale('Manovra complessa volontaria'), /\+1 AzP/);
  // nessun campo numerico da sommare: i costi sono testo da leggere
  for (const r of T.righe) {
    assert.equal(typeof r.costo, 'string');
    assert.ok(!('azioni_principali' in r) && !('azioni_movimento' in r), `${r.operazione}: nessun numero da conteggiare`);
  }
});

test('A.146: gli Attacchi di Opportunità dei mezzi restano una riga da leggere', () => {
  const O = dati.veicoli.opportunita;
  assert.equal(O.provoca, true);
  assert.equal(O.zona_di_controllo_del_mezzo, false);
  assert.equal(O.avviso_automatico, false, 'nessun avviso automatico sulla mappa');
  assert.equal(dati.veicoli.azioni['TODO(Davide) opportunita'], undefined);
  assert.ok(O.frasi_risposta.some((x) => /una sola occasione/.test(x)));
  // la regola si legge anche dalla tabella delle azioni
  const riga = dati.veicoli.azioni.tabella.righe.find((r) => /portata di un nemico/.test(r.operazione));
  assert.ok(riga, 'riga nella tabella (A.146)');
  assert.match(riga.costo, /A\.146/);
});
