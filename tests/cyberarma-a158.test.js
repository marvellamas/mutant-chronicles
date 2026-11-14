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
  // A.265 (Armamenti 0.83 §7.25): «Con un costo di costruzione base di 1.250 cr, il valore indicativo
  // dell’originale è 7.500 cr». Resta un pezzo unico e non si compra dal catalogo, ma il valore adesso c’è scritto.
  assert.deepEqual([o.costo, o.creazione_cr], [7500, 1250]);
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
  // A.265: potenza Rara, Grado III, SnT base 3; le riduzioni d’impiego sono 2 per il Tecnomante, 1 per un Custode
  // e 0 per il Custode che l’ha costruita e la usa come propria arma personale. La scala vale anche per le
  // conversioni: «Capacità della riserva e modulatore SIN non cambiano questa scala».
  assert.deepEqual([o.snt_per_impiego, o.sintonizzazione_per_classe], [true, { Tecnomante: 2, Custode: 1 }]);
  assert.deepEqual([o.potenza, o.grado, o.sintonizzazione], ['Rara', 'III', 3]);
  assert.deepEqual([o.sintonizzazione_costruttore.classe, o.sintonizzazione_costruttore.snt], ['Custode', 0]);
  assert.equal(b.sintonizzazione, 3, 'la SnT base è quella della scala generale, riserva compresa (A.265)');
  // revisione «Cariche Mistiche» e A.236 (lotto 171): riserva interna Verde da 5 CM, esclusiva dell'arma (non più una Batteria)
  assert.deepEqual(b.contenitore, { energia: 'Verde', integrato: true, riserva: 'cariche', alimentazione: 'esclusiva', capacita_cm: 5, precedente: { capacita_pm: 10, unita: 'PM', nota: 'CyberArma con batteria Verde' } });
  // una sola voce di inventario: l'oggetto sta fra le armi e il blocco artefatto lo raggiunge per rif
  assert.equal(infoArtefatto(r('armi:cyberarma-batteria-verde'), dati).sintonizzazione, 3);
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
  // Armamenti 0.74: le altre Classi solo con la conversione a NeC (1 carica; A.251 del 06/11: ogni 10 colpi)
  assert.equal(usoPerClasse(b, ['Agente']).ammesso, false);
  const altreN = usoPerClasse(r('armi:cyberarma-nec'), ['Agente']);
  assert.deepEqual([altreN.ammesso, altreN.nec, altreN.round, altreN.va], [undefined, 1, 10, 0]);
  // lotto 171: il Tecnomante paga 1 CM della riserva interna o 2 PM personali; per il Custode la revisione non dà un costo in CM (A.251)
  assert.deepEqual([usoPerClasse(b, ['Tecnomante']).cm, usoPerClasse(b, ['Tecnomante']).pm], [1, 2]);
  assert.match(usoPerClasse(b, ['Custode']).testo, /A.251/);
  assert.equal(usoPerClasse({ }, ['Custode']), null, 'le armi senza il blocco non si attivano');
});

test('«Attacca!»: l’arma attiva mostra costo, durata e Round che restano', () => {
  const scheda = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  assert.deepEqual(classiDi(scheda), ['Agente']);
  const b = r('armi:cyberarma-nec');
  const sessione = { ...inizializzaSessione(massimiSessione(scheda, MISHIMA_AGENTE, dati)), round: 3 };
  const prima = testoAttivazione(b, scheda, sessione, 'c1');
  assert.deepEqual([prima.attiva, prima.costo, prima.round, prima.va], [false, '1 carica NEC', 10, 0]);
  // A.251 (Davide, 06/11/2026; lotto 181): il consumo delle conversioni si conta in colpi, non in Round
  assert.equal(prima.sintesi, '1 carica NEC · 10 colpi');
  // attivata al Round 3: al Round 3 restano 10 Round, al Round 12 ne resta 1, al 13 è finita
  const attiva = { ...sessione, attivazioniArmi: { c1: { dal: 3, round: 10 } } };
  assert.equal(statoAttivazioneArma(attiva, 'c1').rimasti, 10);
  assert.equal(testoAttivazione(b, scheda, attiva, 'c1').sintesi, 'attiva · 10 Round');
  assert.equal(statoAttivazioneArma({ ...attiva, round: 12 }, 'c1').rimasti, 1);
  assert.equal(statoAttivazioneArma({ ...attiva, round: 13 }, 'c1').attiva, false);
});

test('«Attiva» del Tecnomante: 1 CM della riserva interna o 2 PM personali, la durata parte dal Round e «Termina» la spegne; riserva da 5 CM', () => {
  const p = deserializzaPersonaggio(readFileSync(new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url), 'utf8'));
  const base = normalizza(p.creazione, dati).scelte;
  const voce = { uid: 'c1', rif: 'armi:cyberarma-batteria-verde', stato: 'impugnata', quantita: 1, note: '', sintonizzato: true };
  const creazione = { ...base, equipaggiamento: [...base.equipaggiamento, voce] };
  const scheda = calcolaScheda({ creazione, livelli: p.livelli }, dati);
  const m = massimiSessione(scheda, creazione, dati);
  const s = allineaSessione({ ...inizializzaSessione(m), round: 2 }, m);
  assert.deepEqual([s.chroma.c1?.pmAttuali, s.chroma.c1?.unita], [5, 'CM'], 'la riserva interna Verde da 5 CM (A.236)');
  const uso = usoPerClasse(r('armi:cyberarma-batteria-verde'), classiDi(scheda));
  assert.deepEqual([uso.classe, uso.cm, uso.pm, uso.round], ['Tecnomante', 1, 2, 10]);
  // dalla riserva interna: 1 CM, i PM personali non si toccano
  const conCm = attivaArmaSessione(s, 'c1', uso, m);
  assert.deepEqual([conCm.chroma.c1.pmAttuali, conCm.pmAttuali], [4, s.pmAttuali]);
  // con l'alternativa dei PM personali (A.236): 2 PM, la riserva non si tocca
  const dopo = attivaArmaSessione(s, 'c1', { ...uso, conPm: true }, m);
  assert.equal(dopo.pmAttuali, s.pmAttuali - 2, '2 PM personali');
  assert.equal(dopo.chroma.c1.pmAttuali, 5);
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
  // A.265: l’originale ha un valore indicativo (7.500 cr) e le due conversioni no; nessuno dei tre si compra dal
  // catalogo, perché sono pezzi unici (`unico: true`, che tiene spento «Compra»).
  assert.deepEqual(['armi:cyberarma', 'armi:cyberarma-batteria-verde', 'armi:cyberarma-nec'].map((rif) => r(rif).costo), [7500, null, null]);
  for (const rif of ['armi:cyberarma', 'armi:cyberarma-batteria-verde', 'armi:cyberarma-nec']) {
    assert.equal(r(rif).unico, true, rif);
    assert.match(r(rif)._nota_costo, /valore indicativo/);
  }
  // Armamenti 0.74: costruzione dei soli Custodi; prezzi delle modifiche indicativi, in costo_modifica
  assert.match(r('armi:cyberarma').costruzione.chi, /Soltanto i Custodi/);
  assert.deepEqual([r('armi:cyberarma-batteria-verde').costo_modifica, r('armi:cyberarma-nec').costo_modifica], [3000, 2000]);
});
