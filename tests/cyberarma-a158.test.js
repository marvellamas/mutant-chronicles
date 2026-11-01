// CyberArma: A.158 (13/10/2026) aggiornata dagli Armamenti 0.74 §§7.25–7.25.2 (01/11/2026, lotto 157): originale,
// batteria interna Verde da 10 PM e conversione a NeC; una sola voce di inventario (Armi e Artefatti), uso per Classe
// dai dati, SnT secondo l'impiego, durata dell'attivazione in «Attacca!». Il resto in tests/cyberarma-progetto.test.js.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { catalogo, infoArtefatto } from '../src/equipaggiamento.js';
import { calcolaScheda } from '../src/calc.js';
import { readFileSync } from 'node:fs';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { massimiSessione, inizializzaSessione, allineaSessione, attivaArmaSessione, terminaArmaSessione } from '../src/sessione.js';
import { usoPerClasse, statoAttivazioneArma, testoAttivazione, classiDi } from '../src/attivazione-arma.js';

const { dati } = await datiReali();
const r = (rif) => catalogo(dati).perRif.get(rif);

test('due voci di catalogo con i valori della risposta', () => {
  const o = r('armi:cyberarma');
  assert.equal(o.nome, 'CyberArma');
  assert.deepEqual([o.qualita, o.ps_int, o.pi, o.peso, o.reperibilita], ['Non comune', 12, 4, 0.5, 'EP']);
  assert.equal(o.costo, null, 'non ha un prezzo di catalogo (la proposta di 3.000 cr è ritirata)');
  assert.deepEqual([o.abilita, o.mani, o.portata_q, o.for_richiesta, o.danno.una_mano, o.natura_danno], ['Armi da mischia', 1, 1, 3, '1d8', 'Magico']);
  const b = r('armi:cyberarma-batteria-verde');
  assert.deepEqual([b.qualita, b.ps_int, b.pi, b.peso, b.reperibilita], ['Non comune', 12, 4, 0.7, 'EP']);
  assert.equal(b.munizioni, undefined, 'Armamenti 0.74: batteria mistica da 10 PM, non più 5 cariche');
});

test('Grado e SnT: la sintonizzazione si conta una volta sola', () => {
  const art = dati.equipaggiamento.file.artefatti.artefatti_catalogo;
  const o = art.find((x) => x.rif === 'armi:cyberarma');
  const b = art.find((x) => x.rif === 'armi:cyberarma-batteria-verde');
  // Armamenti 0.74 §7.25: SnT secondo l'impiego (Custode 1, Tecnomante 2), non secondo la potenza
  assert.deepEqual([o.snt_per_impiego, o.sintonizzazione_per_classe], [true, { Custode: 1, Tecnomante: 2 }]);
  assert.equal(b.sintonizzazione, 2, 'la SnT 2 comprende manufatto e batteria');
  assert.deepEqual(b.contenitore, { energia: 'Verde', capacita_pm: 10, integrato: true, riserva: 'batteria', alimentazione: 'esclusiva' });
  // una sola voce di inventario: l'oggetto sta fra le armi e il blocco artefatto lo raggiunge per rif
  assert.equal(infoArtefatto(r('armi:cyberarma-batteria-verde'), dati).sintonizzazione, 2);
});

test('uso per Classe: i numeri stanno nei dati, non nel codice', () => {
  const o = r('armi:cyberarma');
  const b = r('armi:cyberarma-batteria-verde');
  const custode = usoPerClasse(o, ['Custode']);
  assert.deepEqual([custode.pm, custode.round, custode.danno_extra, custode.va], [1, 15, 1, 0]);
  const tecno = usoPerClasse(o, ['Tecnomante']);
  assert.deepEqual([tecno.pm, tecno.round, tecno.va], [2, 10, 0]);
  const altre = usoPerClasse(o, ['Agente']);
  assert.equal(altre.ammesso, false, 'il modello originale non si usa senza batteria');
  // Armamenti 0.74: le altre Classi solo con la conversione a NeC (1 carica, 10 Round, nessun −2)
  assert.equal(usoPerClasse(b, ['Agente']).ammesso, false);
  const altreN = usoPerClasse(r('armi:cyberarma-nec'), ['Agente']);
  assert.deepEqual([altreN.ammesso, altreN.nec, altreN.round, altreN.va], [undefined, 1, 10, 0]);
  assert.match(usoPerClasse(b, ['Custode']).testo, /2 PM della batteria interna/);
  assert.equal(usoPerClasse({ }, ['Custode']), null, 'le armi senza il blocco non si attivano');
});

test('«Attacca!»: l’arma attiva mostra costo, durata e Round che restano', () => {
  const scheda = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  assert.deepEqual(classiDi(scheda), ['Agente']);
  const b = r('armi:cyberarma-nec');
  const sessione = { ...inizializzaSessione(massimiSessione(scheda, MISHIMA_AGENTE, dati)), round: 3 };
  const prima = testoAttivazione(b, scheda, sessione, 'c1');
  assert.deepEqual([prima.attiva, prima.costo, prima.round, prima.va], [false, '1 carica NeC', 10, 0]);
  assert.equal(prima.sintesi, '1 carica NeC · 10 Round');
  // attivata al Round 3: al Round 3 restano 10 Round, al Round 12 ne resta 1, al 13 è finita
  const attiva = { ...sessione, attivazioniArmi: { c1: { dal: 3, round: 10 } } };
  assert.equal(statoAttivazioneArma(attiva, 'c1').rimasti, 10);
  assert.equal(testoAttivazione(b, scheda, attiva, 'c1').sintesi, 'attiva · 10 Round');
  assert.equal(statoAttivazioneArma({ ...attiva, round: 12 }, 'c1').rimasti, 1);
  assert.equal(statoAttivazioneArma({ ...attiva, round: 13 }, 'c1').attiva, false);
});

test('«Attiva» del Tecnomante: 2 PM personali, la durata parte dal Round e «Termina» la spegne; batteria da 10 PM', () => {
  const p = deserializzaPersonaggio(readFileSync(new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url), 'utf8'));
  const base = normalizza(p.creazione, dati).scelte;
  const voce = { uid: 'c1', rif: 'armi:cyberarma-batteria-verde', stato: 'impugnata', quantita: 1, note: '', sintonizzato: true };
  const creazione = { ...base, equipaggiamento: [...base.equipaggiamento, voce] };
  const scheda = calcolaScheda({ creazione, livelli: p.livelli }, dati);
  const m = massimiSessione(scheda, creazione, dati);
  const s = allineaSessione({ ...inizializzaSessione(m), round: 2 }, m);
  assert.equal(s.chroma.c1?.pmAttuali, 10, 'la batteria interna Verde da 10 PM');
  const uso = usoPerClasse(r('armi:cyberarma-batteria-verde'), classiDi(scheda));
  assert.deepEqual([uso.classe, uso.pm, uso.round], ['Tecnomante', 2, 10]);
  const dopo = attivaArmaSessione(s, 'c1', uso, m);
  assert.equal(dopo.pmAttuali, s.pmAttuali - 2, '2 PM personali');
  assert.deepEqual(dopo.attivazioniArmi.c1, { dal: 2, round: 10 });
  assert.equal(allineaSessione({ ...dopo, round: 12 }, m).attivazioniArmi, undefined);
  const spenta = terminaArmaSessione(dopo, 'c1', m);
  assert.equal(spenta.attivazioniArmi, undefined);
  assert.equal(spenta.pmAttuali, s.pmAttuali - 2, 'il costo resta pagato');
});

test('Custodia del Silenzio (§7.25.1) nel catalogo', () => {
  const c = r('dotazioni_personali:custodia-del-silenzio');
  assert.equal(c.nome, 'Custodia del Silenzio');
  assert.equal(c.peso, 0.3);
  assert.equal(c.costo, null, 'prezzo non indicato dai manuali: non si inventa');
  // A.163 (16/10): la schermatura vale per qualsiasi contenuto; «chiuso» e «riposto» si toccano nella riga
  assert.match(c._nota, /la schermatura vale per qualsiasi contenuto: A\.163/);
  assert.equal(c.schermatura.corruzione, 1);
  assert.equal(c.integrita, 'da_definire', 'Qualità, PI e PS Integrità restano da definire (§10.13)');
});

test('la CyberArma resta fuori dagli acquisti automatici: niente prezzo', () => {
  for (const rif of ['armi:cyberarma', 'armi:cyberarma-batteria-verde', 'armi:cyberarma-nec']) {
    assert.equal(r(rif).costo, null);
    assert.match(r(rif)._nota_costo, /prezzo unico/);
  }
  // Armamenti 0.74: costruzione dei soli Custodi; prezzi delle modifiche indicativi, in costo_modifica
  assert.match(r('armi:cyberarma').costruzione.chi, /Soltanto i Custodi/);
  assert.deepEqual([r('armi:cyberarma-batteria-verde').costo_modifica, r('armi:cyberarma-nec').costo_modifica], [3000, 2000]);
});
