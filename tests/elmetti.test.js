// Lotto elmetti: Armamenti v0.52 §7.21 (data/equipaggiamento/elmetti.json, regole.json → elmetti).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo } from '../src/equipaggiamento.js';
import { inizializzaSessione } from '../src/sessione.js';
import { preparaStampa } from '../src/stampa.js';
import { acquistabili } from '../src/dotazioni.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const sessione = { ...inizializzaSessione({ pv: 10, pm: 5, puntiEroe: 10, ferite: 6, caricatori: {} }) };
const scheda = (equipaggiamento) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento }, livelli: [], sessione }, dati);
const PISTOLA = voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata');

test('catalogo: 16 elmetti (standard e 15 corporativi) e 15 modifiche commerciali, senza AR e senza peso', () => {
  const el = cat.oggetti.filter((o) => o.file === 'elmetti');
  assert.equal(el.filter((o) => o.tipo === 'elmetto').length, 16);
  assert.equal(el.filter((o) => o.tipo === 'accessorio').length, 15);
  assert.ok(el.every((o) => o.peso === undefined)); // il manuale non lo dà (A.30)
  assert.ok(el.filter((o) => o.tipo === 'elmetto').every((o) => o.ar.totale === 0 && o.pi === 4));
  const commando = cat.perRif.get('elmetti:elmetto-commando');
  assert.deepEqual([commando.catalogo, commando.qualita, commando.ps_int, commando.reperibilita, commando.costo], ['Alleanza', 'Non comune', 12, 'MR', 12000]);
  assert.deepEqual([cat.perRif.get('elmetti:elmetto-standard').costo, cat.perRif.get('elmetti:elmetto-standard').ps_int], [200, 10]);
  assert.equal(cat.perRif.get('elmetti:elmetto-trencher-mk-ii').catalogo, 'Imperial');
  // fra gli acquisti della creazione (§2.16.29): catalogo della Corporazione e Commerciale
  assert.ok(acquistabili('Mishima', dati).some((o) => o.rif === 'elmetti:elmetto-kabuto-senshi'));
  assert.ok(acquistabili('Mishima', dati).some((o) => o.rif === 'elmetti:visore-notturno'));
  assert.ok(!acquistabili('Mishima', dati).some((o) => o.rif === 'elmetti:elmetto-wacht'));
});

test('§7.21.7: con il Commando VA per colpire +1, Difese +1, Riflessi +1 solo per Elusione, Iniziativa +1', () => {
  const senza = scheda([PISTOLA]);
  const con = scheda([PISTOLA, voce('e', 'elmetti:elmetto-commando', 'indossata')]);
  const arma = (s) => s.equipaggiamento.armi.find((a) => a.uid === 'p');
  assert.equal(arma(con).vaEffettivo, arma(senza).vaEffettivo + 1);
  const dif = (s) => s.abilita.find((a) => a.nome === 'Difese').effettivo;
  assert.equal(dif(con), dif(senza) + 1);
  assert.equal(con.salvezze.riflessi.effettivo, senza.salvezze.riflessi.effettivo); // Riflessi per gli altri impieghi resta
  const elusione = con.equipaggiamento.effettiOggetti.find((e) => e.tipo === 'salvezza');
  assert.deepEqual([elusione.salvezza, elusione.valore, elusione.uso], ['riflessi', 1, 'Elusione']);
  assert.equal(con.tavolo.iniziativa.effettivo, senza.tavolo.iniziativa.effettivo + 1);
  assert.equal(con.tavolo.iniziativa.scomposizione.at(-1).fonte, 'equipaggiamento');
  // nello zaino non conta
  assert.equal(arma(scheda([PISTOLA, voce('e', 'elmetti:elmetto-commando', 'zaino')])).vaEffettivo, arma(senza).vaEffettivo);
  // stampa: l'elmetto nella riga dell'armatura (qui senza armatura: riga propria), Iniziativa con l'Allerta
  const st = preparaStampa({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [PISTOLA, voce('e', 'elmetti:elmetto-commando', 'indossata')] }, livelli: [] }, dati);
  const fogli = JSON.stringify(st);
  assert.match(fogli, /Elmetto Commando/);
});

test('modifiche: contano solo montate su un elmetto (o sull’armatura, per l’elmetto standard) indossato', () => {
  const ARM = voce('a', 'armature:armatura-civile-leggera', 'indossata');
  const tempra = (s) => s.equipaggiamento.effettiOggetti.filter((e) => e.tipo === 'salvezza' && e.salvezza === 'tempra');
  assert.equal(tempra(scheda([ARM, voce('m', 'elmetti:maschera-filtrante', 'in_uso')])).length, 0); // non montata
  assert.equal(tempra(scheda([ARM, voce('m', 'elmetti:maschera-filtrante', 'in_uso', { montato_su: 'a' })])).length, 1);
  const armZaino = { ...ARM, stato: 'zaino' };
  assert.equal(tempra(scheda([armZaino, voce('m', 'elmetti:maschera-filtrante', 'in_uso', { montato_su: 'a' })])).length, 0);
  // §7.21.1: copie dello stesso beneficio non si sommano (Custode ha già Filtro respiratorio 2)
  const doppio = scheda([voce('e', 'elmetti:elmetto-custode', 'indossata'), voce('m', 'elmetti:maschera-filtrante', 'in_uso', { montato_su: 'e' })]);
  assert.equal(tempra(doppio).length, 1);
  assert.equal(tempra(doppio)[0].valore, 2);
  // Sensori: situazionali, da accendere al tavolo
  const s = scheda([voce('e', 'elmetti:elmetto-kabuto-senshi', 'indossata')]);
  assert.ok(s.equipaggiamento.effettiOggetti.some((e) => e.abilita === 'Percezione' && e.valore === 2 && e.ambito === 'situazionale'));
});

test('regole.json → elmetti: un solo elmetto indossato (avviso), nessuna AR', () => {
  assert.equal(dati.regole.elmetti.massimo_indossati, 1);
  const s = scheda([voce('e', 'elmetti:elmetto-commando', 'indossata'), voce('f', 'elmetti:elmetto-wacht', 'indossata')]);
  assert.ok(s.equipaggiamento.avvisi.some((a) => /Più di un elmetto indossato/.test(a)));
  const p = s.equipaggiamento.protezioni.filter((x) => x.tipo === 'elmetto');
  assert.equal(p.length, 2);
  assert.ok(p.every((x) => x.ar.totale === 0 && !x.forRichiesta));
});
