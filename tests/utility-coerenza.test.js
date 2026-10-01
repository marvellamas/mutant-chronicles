// Coerenza fra le etichette delle utility e il calcolo (controllo dopo la correzione di «Lancia!»):
// le scelte mostrano i valori con i Talenti del personaggio, il Risultato mostra i valori che il calcolo
// usa, e un Talento che cambia un numero lo dice. «Attacca!» (src/attacco.js), «Ripara» (src/riparazione.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  modificatoriDistanza, vaDueArmi, descriviManovraDistanza, descriviManovraRavvicinata, talentiAttacco,
} from '../src/attacco.js';
import { vaRiparazione, regoleRiparazione } from '../src/riparazione.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const conLiberi = (...id) => ({ talentiLiberi: id.map((x) => ({ id: x })), classi: [], equipaggiamento: { armi: [] } });

test('«Attacca!» a distanza: Corsa, Scatto, Copertura e bersaglio impegnato con i Talenti', () => {
  const base = modificatoriDistanza(conLiberi(), dati);
  const A = dati.regole.attacco_distanza;
  assert.deepEqual([base.movimento.corsa, base.copertura.leggera, base.impegnato], [A.movimento.proprio.corsa, A.copertura.propria.leggera, A.bersaglio_impegnato.va]);
  const t = modificatoriDistanza(conLiberi('movimento-fluido', 'copertura-tattica', 'fuoco-di-precisione'), dati);
  assert.equal(t.movimento.corsa, Math.min(0, A.movimento.proprio.corsa + 2));
  assert.equal(t.movimento.scatto, A.movimento.proprio.scatto + 2);
  assert.equal(t.copertura.media, A.copertura.propria.media + 2);
  assert.equal(t.impegnato, -2);
  assert.deepEqual(t.talenti, { movimento: 'Movimento Fluido', copertura: 'Copertura Tattica', impegnato: 'Fuoco di Precisione' });
});

test('Tiro Ravvicinato: la riga mostra la penalità ridotta e il danno del Talento', () => {
  const s = conLiberi('tiro-ravvicinato-istintivo', 'tiro-ravvicinato-migliorato');
  const T = talentiAttacco(s, dati);
  const arma = { abilita: 'Armi leggere' };
  const M = dati.regole.attacco_distanza.manovre.ravvicinato;
  const va = M.va_per_abilita['Armi leggere'];
  const riga = descriviManovraDistanza('ravvicinato', arma, dati, T).riga;
  const atteso = va + Math.min(2, -va);
  assert.ok(riga.startsWith(`${atteso < 0 ? `−${-atteso}` : atteso === 0 ? '0' : `+${atteso}`} VA · +5 danno`), riga);
  assert.match(riga, /Tiro Ravvicinato Istintivo, Tiro Ravvicinato Migliorato/);
});

test('due armi: l’etichetta usa il Talento della combinazione in mano, non uno qualsiasi', () => {
  const pistola = { uid: 'p', tipo: 'arma_distanza', abilita: 'Armi leggere', va: 5, mani: 1 };
  const coltello = { uid: 'c', tipo: 'arma_ravvicinata', abilita: 'Armi da mischia', va: 5, mani: 1 };
  const s = { ...conLiberi('pistolero'), equipaggiamento: { armi: [coltello, pistola] } };
  // Pistolero vale per due armi leggere a distanza: con coltello + pistola (mista) resta la penalità ordinaria
  assert.deepEqual(vaDueArmi(s, pistola, dati), { va: dati.regole.attacco_ravvicinato.due_armi.va, talento: null });
  const s2 = { ...conLiberi('duellante'), equipaggiamento: { armi: [coltello, pistola] } };
  assert.deepEqual(vaDueArmi(s2, pistola, dati), { va: -2, talento: 'Duellante' });
});

test('Combattimento Multiplo: la riga usa Spazzata Migliorata come il calcolo', () => {
  const lottatore = dati.classi.classi.find((c) => c.nome === 'Lottatore');
  const cm = lottatore.talenti_fissi.find((t) => t.nome === 'Combattimento Multiplo');
  const s = { talentiLiberi: [{ id: 'spazzata-migliorata' }], classi: [{ nome: 'Lottatore', grado: 1, talenti: [cm] }], equipaggiamento: { armi: [] } };
  const riga = descriviManovraRavvicinata('combattimento_multiplo', s, dati).riga;
  assert.match(riga, /−2 VA contro 2, −4 VA contro 3/);
});

test('«Ripara»: gli usi specifici di riparazione si possono applicare, con la fonte', () => {
  const r = regoleRiparazione(dati);
  const scheda = { abilita: [{ nome: r.abilita, totale: 8, effettivo: 8, usiSpecifici: [
    { uso: 'riparare armi da fuoco', modificatore: 2, oggetti: [{ oggetto: 'Armaiolo da Campo', contato: true }] },
    { uso: 'scassinare', modificatore: 2, oggetti: [{ oggetto: 'Grimaldelli', contato: true }] },
  ] }] };
  const senza = vaRiparazione(scheda, false, r);
  assert.deepEqual([senza.totale, senza.usi.map((u) => u.uso)], [8, ['riparare armi da fuoco']]);
  const con = vaRiparazione(scheda, true, r, 'riparare armi da fuoco');
  assert.equal(con.totale, 8 + r.strumenti_improvvisati_va + 2);
  assert.deepEqual(con.uso.fonti, ['Armaiolo da Campo']);
});
