// CyberArma: A.158 (risposta di Davide approvata il 13/10/2026) e Armamenti 0.62 §7.25.1.
// Due configurazioni di catalogo, una sola voce di inventario (Armi e Artefatti), uso per Classe dai dati,
// −2 alle altre Classi, saldo in cariche e non in PM, durata dell'attivazione in «Attacca!».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { catalogo, infoArtefatto } from '../src/equipaggiamento.js';
import { calcolaScheda } from '../src/calc.js';
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
  assert.deepEqual([b.munizioni.capacita, b.munizioni.unita], [5, 'cariche'], 'saldo in cariche, non in PM');
});

test('Grado e SnT: la sintonizzazione si conta una volta sola', () => {
  const art = dati.equipaggiamento.file.artefatti.artefatti_catalogo;
  const o = art.find((x) => x.rif === 'armi:cyberarma');
  const b = art.find((x) => x.rif === 'armi:cyberarma-batteria-verde');
  assert.deepEqual([o.potenza, o.sintonizzazione], ['Comune', 1], 'Grado I, SnT 1');
  assert.deepEqual([b.potenza, b.sintonizzazione], ['Non Comune', 2], 'Grado II: il maggiore fra arma e riserva');
  assert.notEqual(b.sintonizzazione, o.sintonizzazione + 2, 'non si sommano due costi di sintonizzazione');
  assert.deepEqual(b.contenitore, { energia: 'Verde', capacita_pm: 5, integrato: true, riserva: 'cariche', alimentazione: 'esclusiva' });
  // riserva a cariche: non alimenta gli Incantesimi personali e le proprietà sono Esclusive
  assert.equal(b.contenitore.riserva, 'cariche');
  assert.equal(b.contenitore.alimentazione, 'esclusiva');
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
  const altreB = usoPerClasse(b, ['Agente']);
  assert.deepEqual([altreB.ammesso, altreB.cariche, altreB.round, altreB.va], [true, 1, 10, -2]);
  assert.equal(usoPerClasse(b, ['Custode']).cariche, 1, 'col la batteria anche il Custode può pagare una carica');
  assert.equal(usoPerClasse({ }, ['Custode']), null, 'le armi senza il blocco non si attivano');
});

test('«Attacca!»: l’arma attiva mostra costo, durata e Round che restano', () => {
  const scheda = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  assert.deepEqual(classiDi(scheda), ['Agente']);
  const b = r('armi:cyberarma-batteria-verde');
  const sessione = { ...inizializzaSessione(massimiSessione(scheda, MISHIMA_AGENTE, dati)), round: 3 };
  const prima = testoAttivazione(b, scheda, sessione, 'c1');
  assert.deepEqual([prima.attiva, prima.costo, prima.round, prima.va], [false, '1 carica', 10, -2]);
  assert.equal(prima.sintesi, '1 carica · 10 Round');
  // attivata al Round 3: al Round 3 restano 10 Round, al Round 12 ne resta 1, al 13 è finita
  const attiva = { ...sessione, attivazioniArmi: { c1: { dal: 3, round: 10 } } };
  assert.equal(statoAttivazioneArma(attiva, 'c1').rimasti, 10);
  assert.equal(testoAttivazione(b, scheda, attiva, 'c1').sintesi, 'attiva · 10 Round');
  assert.equal(statoAttivazioneArma({ ...attiva, round: 12 }, 'c1').rimasti, 1);
  assert.equal(statoAttivazioneArma({ ...attiva, round: 13 }, 'c1').attiva, false);
});

test('«Attiva» scala una carica, la durata parte dal Round e «Termina» la spegne', () => {
  const voce = { uid: 'c1', rif: 'armi:cyberarma-batteria-verde', stato: 'impugnata', sintonizzato: true };
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce] };
  const scheda = calcolaScheda({ creazione, livelli: [] }, dati);
  const m = massimiSessione(scheda, creazione, dati);
  const s = allineaSessione({ ...inizializzaSessione(m), round: 2 }, m);
  const uso = usoPerClasse(r('armi:cyberarma-batteria-verde'), classiDi(scheda));
  const cariche = s.chroma.c1?.pmAttuali ?? null;
  assert.equal(cariche, 5, 'la riserva integrata parte con le sue cinque cariche');
  const dopo = attivaArmaSessione(s, 'c1', uso, m);
  assert.equal(dopo.chroma.c1.pmAttuali, 4, 'una carica intera per attivazione');
  assert.deepEqual(dopo.attivazioniArmi.c1, { dal: 2, round: 10 });
  // finita la durata la chiave sparisce da sola
  assert.equal(allineaSessione({ ...dopo, round: 12 }, m).attivazioniArmi, undefined);
  const spenta = terminaArmaSessione(dopo, 'c1', m);
  assert.equal(spenta.attivazioniArmi, undefined);
  assert.equal(spenta.chroma.c1.pmAttuali, 4, 'il costo resta pagato');
  // senza cariche non si attiva, salvo «procedi comunque»
  const vuota = { ...dopo, chroma: { ...dopo.chroma, c1: { ...dopo.chroma.c1, pmAttuali: 0 } } };
  assert.equal(attivaArmaSessione(vuota, 'c1', uso, m), null);
  assert.equal(attivaArmaSessione(vuota, 'c1', uso, m, { forza: true }).chroma.c1.pmAttuali, 0);
});

test('Custodia del Silenzio (§7.25.1) nel catalogo', () => {
  const c = r('dotazioni_personali:custodia-del-silenzio');
  assert.equal(c.nome, 'Custodia del Silenzio');
  assert.equal(c.peso, 0.3);
  assert.equal(c.costo, null, 'prezzo non indicato dai manuali: non si inventa');
  assert.match(c._nota, /schermatura è passiva/);
  assert.match(c._nota, /A\.163/, 'lo stato chiuso/aperto resta da decidere');
});

test('la CyberArma resta fuori dagli acquisti automatici: niente prezzo', () => {
  for (const rif of ['armi:cyberarma', 'armi:cyberarma-batteria-verde']) {
    assert.equal(r(rif).costo, null);
    assert.match(r(rif)._nota_costo ?? r(rif)._nota_a158, /./);
  }
  // costruzione e modifica: solo testo (punti 6 e 7), nessuna procedura
  assert.match(r('armi:cyberarma').costruzione.totali, /1\.250 crediti, 17 ore e 3 PM/);
  assert.match(r('armi:cyberarma-batteria-verde').costruzione.totali, /2\.000 crediti, 10 ore e 6 PM/);
  assert.match(r('armi:cyberarma-batteria-verde').costruzione.nota, /0\/5 cariche/);
});
