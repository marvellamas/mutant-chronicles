// Bonus dei Talenti nei valori effettivi (docs/censimento-talenti.md, src/talenti.js, src/condizioni.js):
// generali, situazionali con l'interruttore, usi specifici a parte, interruttore globale, non regressione
// e migrazione dei salvataggi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { applicaCondizioni } from '../src/condizioni.js';
import { effettiTalenti, talentiSituazionali, bonusTalentiAccesi } from '../src/talenti.js';
import { inizializzaSessione, allineaSessione, massimiSessione } from '../src/sessione.js';
import { talentiAttacco } from '../src/attacco.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato) => ({ uid, rif, stato, quantita: 1, note: '' });

// scheda a riposo con Talenti aggiunti a mano (Liberi per id, di Classe per Classe e nome), poi al tavolo
function alTavolo({ liberi = [], classi = [], equipaggiamento = [], sessione = {} } = {}) {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const s = calcolaScheda({ creazione, livelli: [] }, dati);
  const m = massimiSessione(s, creazione, dati);
  s.talentiLiberi = [...(s.talentiLiberi ?? []), ...liberi.map((x) => ({ parametro: null, annotazione: null, ...x }))];
  s.classi = [...s.classi, ...classi.map(([nome, talento]) => ({ nome, grado: 2, talenti: [{ nome: talento }] }))];
  return applicaCondizioni(s, { ...inizializzaSessione(m), ...sessione }, dati);
}
const ab = (s, n) => s.abilita.find((a) => a.nome === n);

test('effetti.valori dei Talenti posseduti, con la scelta del giocatore al posto di {parametro} e {annotazione}', () => {
  const s = { talentiLiberi: [
    { id: 'prova-di-caratteristica-migliorata', nome: 'Prova di Caratteristica Migliorata', parametro: 'FOR' },
    { id: 'sport', nome: 'Sport', annotazione: 'Nuoto' },
  ], classi: [{ nome: 'Mistico', talenti: [{ nome: 'Scudo Spirituale' }] }] };
  const e = effettiTalenti(s, dati);
  assert.deepEqual(e.find((x) => x.tipo === 'caratteristica').caratteristiche, ['FOR']);
  assert.equal(e.find((x) => x.abilita === 'Atletica').uso, 'sport: Nuoto');
  assert.deepEqual(e.filter((x) => x.talento === 'Scudo Spirituale').map((x) => [x.salvezza, x.valore, x.ambito]),
    [['volonta', 1, 'generale'], ['magia', 1, 'generale'], ['volonta', 2, 'situazionale'], ['magia', 2, 'situazionale']]);
  // un interruttore per acquisizione, con la frase del manuale
  assert.deepEqual(talentiSituazionali(e).map((x) => x.talento), ['Scudo Spirituale']);
});

test('Talento generale nel valore effettivo, con la riga di provenienza (Scudo Spirituale; Parata a Distanza)', () => {
  const riposo = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const s = alTavolo({ classi: [['Mistico', 'Scudo Spirituale']] });
  assert.equal(s.salvezze.volonta.effettivo, riposo.salvezze.volonta.effettivo + 1);
  assert.equal(s.salvezze.magia.effettivo, riposo.salvezze.magia.effettivo + 1);
  assert.equal(s.salvezze.tempra.effettivo, riposo.salvezze.tempra.effettivo);
  const rs = s.salvezze.volonta.provenienza.righe.find((r) => r.fonte === 'Scudo Spirituale');
  assert.deepEqual([rs.valore, rs.nota], [1, 'Talento']);
  // il totale da regole non cambia (avanzamento, SS)
  assert.equal(s.salvezze.volonta.totale, riposo.salvezze.volonta.totale);
  // Parata a Distanza: con lo scudo imbracciato la Parata a distanza sale di 2, la ravvicinata no
  const scudo = [voce('sc', 'scudi:scudo-medio', 'imbracciato')];
  const senza = alTavolo({ equipaggiamento: scudo }).equipaggiamento.protezioni.find((p) => p.parata).parata;
  const con = alTavolo({ equipaggiamento: scudo, liberi: [{ id: 'parata-a-distanza', nome: 'Parata a Distanza' }] }).equipaggiamento.protezioni.find((p) => p.parata).parata;
  assert.deepEqual([con.distanzaEffettiva - senza.distanzaEffettiva, con.ravvicinataEffettiva - senza.ravvicinataEffettiva], [2, 0]);
});

test('Talento situazionale: conta solo acceso (Campo Sterile, +2 Medicina); spento resta «disponibile»', () => {
  const chiave = 'classe:Paramedico:Campo Sterile';
  const spento = alTavolo({ classi: [['Paramedico', 'Campo Sterile']] });
  const acceso = alTavolo({ classi: [['Paramedico', 'Campo Sterile']], sessione: { talentiAccesi: [chiave] } });
  assert.equal(ab(acceso, 'Medicina').effettivo, ab(spento, 'Medicina').effettivo + 2);
  assert.ok(ab(spento, 'Medicina').disponibili.some((d) => d.uid === chiave && d.talento && d.valore === 2));
  assert.ok(ab(acceso, 'Medicina').provenienza.righe.some((r) => r.fonte === 'Campo Sterile (condizione attiva)' && r.valore === 2));
  assert.deepEqual(acceso.talentiAccesi, [chiave]);
});

test('Talento d’uso specifico: valore a parte, il VA generale non cambia (Sempre Allerta, dai livelli)', () => {
  const creazione = MISHIMA_AGENTE;
  const livelli = [{ livello: 2, caratteristiche: { DES: 2 } }, { livello: 3, talentoLibero: { id: 'sempre-allerta' } }];
  const riposo = calcolaScheda({ creazione, livelli }, dati);
  const m = massimiSessione(riposo, creazione, dati);
  const s = calcolaScheda({ creazione, livelli, sessione: inizializzaSessione(m) }, dati);
  const p = ab(s, 'Percezione');
  assert.equal(p.effettivo, ab(riposo, 'Percezione').effettivo);
  const uso = p.usiSpecifici.find((u) => u.uso === 'imboscate e pericoli improvvisi');
  assert.deepEqual([uso.valore, uso.modificatore, uso.oggetti[0].oggetto, uso.oggetti[0].talento], [p.effettivo + 3, 3, 'Sempre Allerta', true]);
});

test('Resistenze: +2 all’uso, ma strutturale + PS Migliorata + Resistenza non oltre il tetto (Giocatore §8.6)', () => {
  const s = alTavolo({ liberi: [{ id: 'resistenza-ai-veleni', nome: 'Resistenza ai Veleni' }] });
  const u = s.usiSalvezzeTalenti.find((x) => x.talento === 'Resistenza ai Veleni');
  assert.deepEqual([u.salvezza, u.modificatore, u.valore], ['tempra', 2, s.salvezze.tempra.effettivo + 2]);
  // a un punto dal tetto: la Resistenza conta +1, non +2
  const c = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const m = massimiSessione(c, MISHIMA_AGENTE, dati);
  c.talentiLiberi = [{ id: 'resistenza-ai-veleni', nome: 'Resistenza ai Veleni', parametro: null }];
  c.salvezze.tempra.totale = c.salvezze.tempra.tetto - 1;
  const u2 = applicaCondizioni(c, inizializzaSessione(m), dati).usiSalvezzeTalenti[0];
  assert.deepEqual([u2.modificatore, u2.limitato], [1, true]);
});

test('interruttore «Bonus dei Talenti» spento: nessun effetto dei Talenti nei valori, righe barrate, utility senza Talenti', () => {
  const chiave = 'classe:Paramedico:Campo Sterile';
  const base = { classi: [['Mistico', 'Scudo Spirituale'], ['Paramedico', 'Campo Sterile']], liberi: [{ id: 'sempre-allerta', nome: 'Sempre Allerta' }, { id: 'iniziativa-migliorata', nome: 'Iniziativa Migliorata' }] };
  const on = alTavolo({ ...base, sessione: { talentiAccesi: [chiave] } });
  const off = alTavolo({ ...base, sessione: { talentiAccesi: [chiave], bonusTalenti: false } });
  const riposo = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  assert.equal(off.bonusTalenti, false);
  assert.equal(off.salvezze.volonta.effettivo, riposo.salvezze.volonta.effettivo);
  assert.equal(ab(off, 'Medicina').effettivo, ab(riposo, 'Medicina').effettivo);
  assert.equal(ab(on, 'Medicina').effettivo, ab(riposo, 'Medicina').effettivo + 2);
  // la provenienza mostra che cosa manca
  const r = off.salvezze.volonta.provenienza.righe.find((x) => x.fonte === 'Scudo Spirituale');
  assert.deepEqual([r.escluso, r.barrato, r.nota], [true, true, 'Talenti spenti: non conta']);
  assert.ok(ab(off, 'Medicina').provenienza.righe.some((x) => x.fonte === 'Campo Sterile (condizione attiva)' && x.barrato));
  // usi specifici e Resistenze: niente valori a parte
  assert.deepEqual([ab(off, 'Percezione').usiSpecifici.filter((u) => u.oggetti.some((o) => o.talento)).length, off.usiSalvezzeTalenti.length], [0, 0]);
  // «Attacca!» e «Lancia!» leggono i Talenti da talentiAttacco: spento, nessun Talento
  assert.deepEqual(talentiAttacco(off, dati, 'attacco_ravvicinato'), []);
  assert.ok(talentiAttacco({ ...off, bonusTalenti: true, talentiLiberi: [{ id: 'arti-marziali' }] }, dati, 'attacco_ravvicinato').length > 0);
});

test('non regressione: i Talenti già gestiti danno lo stesso risultato (collaudo b, a riposo e al tavolo)', () => {
  const p = deserializzaPersonaggio(readFileSync(new URL('collaudo/b_fratellanza_arcanista_l12.json', import.meta.url), 'utf8'));
  const creazione = normalizza(p.creazione, dati).scelte;
  const riposo = calcolaScheda({ creazione, livelli: p.livelli }, dati);
  const m = massimiSessione(riposo, creazione, dati);
  const tavolo = calcolaScheda({ creazione, livelli: p.livelli, sessione: allineaSessione(p.sessione, m) }, dati);
  // come in tests/collaudo.test.js: Iniziativa Migliorata +3, Bordone Templare, sintonizzazione
  assert.equal(riposo.iniziativa, 7);
  assert.equal(tavolo.tavolo.iniziativa.effettivo, 7);
  const [bordone] = tavolo.equipaggiamento.armi;
  assert.deepEqual([bordone.va, bordone.danno.due_mani], [2, '1d8+1']);
  for (const a of tavolo.abilita) assert.equal(a.effettivo, riposo.abilita.find((x) => x.nome === a.nome).effettivo, a.nome);
});

test('migrazione: una sessione salvata prima ha i Talenti accesi e nessun situazionale acceso', () => {
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const m = massimiSessione(s, MISHIMA_AGENTE, dati);
  const vecchia = inizializzaSessione(m);
  delete vecchia.bonusTalenti; delete vecchia.talentiAccesi;
  const a = allineaSessione(vecchia, m);
  assert.deepEqual([a.bonusTalenti, a.talentiAccesi], [true, []]);
  assert.equal(bonusTalentiAccesi(vecchia), true);
  assert.equal(allineaSessione({ ...vecchia, bonusTalenti: false }, m).bonusTalenti, false);
});

test('SD: accendere un situazionale e spegnere il «Bonus dei Talenti» sono modifiche della sessione', async () => {
  const { commutaTalento, commutaBonusTalenti } = await import('../src/sessione.js');
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  const m = massimiSessione(s, MISHIMA_AGENTE, dati);
  const k = 'classe:Paramedico:Campo Sterile';
  const acceso = commutaTalento(inizializzaSessione(m), k, m);
  assert.deepEqual(acceso.talentiAccesi, [k]);
  assert.deepEqual(commutaTalento(acceso, k, m).talentiAccesi, []);
  const spento = commutaBonusTalenti(acceso, m);
  assert.equal(spento.bonusTalenti, false);
  assert.deepEqual(spento.talentiAccesi, [k]); // gli interruttori restano: riaccendendo, tornano
  assert.equal(commutaBonusTalenti(spento, m).bonusTalenti, true);
});
