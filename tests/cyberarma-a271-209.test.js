import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 209 (17/11/2026), parte B — A.271: la CyberArma di Dimitri non ha né SIN, né riserva di CM, né NeC.
//
// Le prove che devono restare rosse se si torna indietro:
//  1. una consegna di progetto non lascia MAI insieme riserva interna (o NeC) e PM personali: si ferma, col motivo;
//  2. nessuna voce di conversione offre l'alternativa dei PM personali accanto alla riserva (A.251 supera la A.236);
//  3. il progetto dice prima, e per intero, quale configurazione sta applicando;
//  4. lo strumento della voce di Dimitri: sola lettura di suo, `--scrivi` sul solo file attuale, una riga nello storico,
//     copia di sicurezza, idempotente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { datiReali } from './helpers.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { testoAttivazione } from '../src/attivazione-arma.js';
import { conversioneDellaVoce, alimentazioneDellaVoce, incoerenzeAlimentazione, controllaConsegna } from '../src/cyberarma.js';
import { apriProgetto, scegliAlimentazione, registraTentativo, chiudiProgetto, consegnaArma, configurazioneConsegna, modelliProgetto } from '../src/progetti.js';
import { correggi, rapporto, vociDaCorreggere, autonomia, VOCE_GIUSTA } from '../tools/correggi-cyberarma-dimitri.mjs';

const { dati } = await datiReali();
const Q = '2026-11-17T08:00:00.000Z';
const ORIGINALE = 'armi:cyberarma';
const BATTERIA = 'armi:cyberarma-batteria-verde';
const NEC = 'armi:cyberarma-nec';
const armi = dati.equipaggiamento.file.armi.oggetti;

/** Un progetto «Paradise» aperto, con l'alimentazione scelta dal Direttore (null = nessuna). */
function progetto(alimentazione) {
  let r = apriProgetto([], 'paradise-dimitri', dati, { quando: Q });
  const id = r.progetto.id;
  if (alimentazione) {
    r = scegliAlimentazione(r.lista, id, alimentazione, dati, { quando: Q, da: 'Direttore', master: true });
    assert.ok(!r.errore, `${alimentazione}: ${r.errore}`);
  }
  for (const n of [1, 2, 3]) r = registraTentativo(r.lista, id, n, 'successo', { quando: Q });
  r = chiudiProgetto(r.lista, id, 'riuscito', { quando: Q });
  return { lista: r.lista, id };
}
const creazioneCon = (rif) => ({ equipaggiamento: [{ uid: 'cyber1', rif, stato: 'pronta', quantita: 1, note: '' }] });

// ───────────────────────────── 1. la consegna non lascia riserva e PM insieme ─────────────────────────────

test('A.271: nessuna consegna lascia insieme riserva interna (o NeC) e PM personali — tutte le combinazioni', () => {
  const alimentazioni = [null, 'cristallo', 'sin', 'riserva_cm', 'nec'];
  let ferme = 0;
  let riuscite = 0;
  const mute = [];
  for (const rif of [ORIGINALE, BATTERIA, NEC]) {
    for (const al of alimentazioni) {
      const { lista, id } = progetto(al);
      const r = consegnaArma({ ...creazioneCon(rif), progettiMaster: lista }, id, dati, { quando: Q, master: true, uid: 'x' });
      if (r.errore) { ferme += 1; continue; }
      riuscite += 1;
      const voce = r.voce;
      const a = alimentazioneDellaVoce(voce, dati);
      // la prova che conta: se la voce consegnata ha una conversione, non può dichiarare i PM personali, né li spende
      if (a.conversione && a.pmPersonali) mute.push(`${rif} + ${al}: conversione ${a.conversione} con PM personali`);
      const inc = incoerenzeAlimentazione(voce, dati);
      if (inc.length) mute.push(`${rif} + ${al}: ${inc.join(' / ')}`);
      if (conversioneDellaVoce(voce.rif, dati) && voce.esemplare?.alimentazione?.pm_personali === true) mute.push(`${rif} + ${al}: l'esemplare dichiara PM personali su una voce di conversione`);
    }
  }
  assert.deepEqual(mute, [], 'una consegna ha lasciato insieme riserva interna e PM personali');
  // il test non passa a vuoto: ci sono combinazioni che si fermano e combinazioni che passano
  assert.equal(ferme + riuscite, 15);
  assert.ok(ferme >= 6, `si devono fermare almeno le sei combinazioni incompatibili, se ne sono fermate ${ferme}`);
  assert.ok(riuscite >= 7, `le combinazioni coerenti devono passare, ne sono passate ${riuscite}`);
});

test('A.271: la consegna di «cristallo» o «SIN» su una voce con riserva si ferma e dice perché', () => {
  for (const al of ['cristallo', 'sin']) {
    const { lista, id } = progetto(al);
    const r = consegnaArma({ ...creazioneCon(BATTERIA), progettiMaster: lista }, id, dati, { quando: Q, master: true, uid: 'x' });
    assert.ok(r.errore, `${al}: la consegna doveva fermarsi`);
    assert.match(r.errore, /riserva interna/);
    assert.match(r.errore, /PM personali/);
    assert.match(r.errore, /A\.251/);
    assert.match(r.errore, /correggi-cyberarma-dimitri/, 'dice anche come si rimedia');
  }
  // due conversioni non si cumulano: NeC su una voce che ha già la riserva
  const { lista, id } = progetto('nec');
  const r = consegnaArma({ ...creazioneCon(BATTERIA), progettiMaster: lista }, id, dati, { quando: Q, master: true, uid: 'x' });
  assert.match(r.errore ?? '', /non si cumulano/);
});

test('A.271: l\'originale con una conversione scelta passa alla voce della conversione, e non spende più i PM', () => {
  const { lista, id } = progetto('riserva_cm');
  const r = consegnaArma({ ...creazioneCon(ORIGINALE), progettiMaster: lista }, id, dati, { quando: Q, master: true, uid: 'x' });
  assert.ok(!r.errore, r.errore);
  assert.equal(r.voce.rif, BATTERIA);
  const a = alimentazioneDellaVoce(r.voce, dati);
  assert.deepEqual([a.conversione, a.pmPersonali, a.proprietaCustode], ['riserva_cm', false, false]);
});

test('A.271: una voce scritta a mano con riserva e PM personali insieme si riconosce', () => {
  const sbagliata = { rif: BATTERIA, esemplare: { alimentazione: { id: 'cristallo', pm_personali: true, proprieta_custode: true } } };
  assert.equal(incoerenzeAlimentazione(sbagliata, dati).length, 1);
  assert.deepEqual(incoerenzeAlimentazione({ rif: BATTERIA }, dati), [], 'una voce di conversione senza dichiarazioni è coerente');
  assert.deepEqual(incoerenzeAlimentazione({ rif: ORIGINALE, esemplare: { alimentazione: { id: 'cristallo', pm_personali: true } } }, dati), []);
  const doppia = { rif: BATTERIA, esemplare: { alimentazione: { id: 'nec', conversione: true, pm_personali: false } } };
  assert.match(incoerenzeAlimentazione(doppia, dati)[0], /non si cumulano/);
});

// ───────────────────────────── 2. nel catalogo, nessuna alternativa dei PM sulle conversioni ─────────────────────────────

test('A.271: nessuna voce di conversione offre i PM personali accanto alla riserva (A.251 supera la A.236)', () => {
  const conversioni = armi.filter((o) => conversioneDellaVoce(`armi:${o.id}`, dati));
  assert.deepEqual(conversioni.map((o) => o.id).sort(), ['cyberarma-batteria-verde', 'cyberarma-nec']);
  let righe = 0;
  for (const o of conversioni) {
    for (const riga of o.uso_per_classe?.classi ?? []) {
      righe += 1;
      const conRiserva = Number.isFinite(riga.cm) || Number.isFinite(riga.nec) || Number.isFinite(riga.cariche);
      assert.ok(!(conRiserva && Number.isFinite(riga.pm)), `${o.id} · ${riga.classe}: riserva e PM personali insieme`);
      // quello che la scheda mostra: il pulsante «con i PM personali» si accende se `alternativaPm` non è null
      const t = testoAttivazione({ uso_per_classe: o.uso_per_classe }, { classi: [{ nome: riga.classe }] }, {}, 'u');
      assert.equal(t.alternativaPm, null, `${o.id} · ${riga.classe}: la scheda offrirebbe l'alternativa dei PM`);
    }
  }
  assert.ok(righe >= 6, 'il controllo guarda davvero le righe');
  // e l'originale resta con i PM personali: la prova non spegne quello che deve restare
  const t = testoAttivazione({ uso_per_classe: armi.find((o) => o.id === 'cyberarma').uso_per_classe }, { classi: [{ nome: 'Tecnomante' }] }, {}, 'u');
  assert.equal(t.pm, 2);
  assert.equal(t.round, 10);
});

// ───────────────────────────── 3. il progetto dice prima quale configurazione applica ─────────────────────────────

test('A.271: il progetto dice prima quale configurazione sta applicando, che cosa si perde e quanto costa', () => {
  const orig = creazioneCon(ORIGINALE).equipaggiamento[0];
  const bat = creazioneCon(BATTERIA).equipaggiamento[0];
  // conversione su un originale: si perdono PM personali e proprietà da Custode, e si legge il consumo
  let cfg = configurazioneConsegna(progetto('riserva_cm').lista[0], orig, dati);
  assert.deepEqual(cfg.errori, []);
  assert.match(cfg.da.alimentazione, /PM personali/);
  assert.match(cfg.a.alimentazione, /niente PM personali/);
  assert.equal(cfg.perde.length, 2);
  assert.match(cfg.a.consumo, /1 CM/);
  // nessuna scelta: l'arma resta com'è, e lo dice
  cfg = configurazioneConsegna(progetto(null).lista[0], orig, dati);
  assert.match(cfg.nota, /resta alimentata com’è/);
  assert.match(cfg.a.alimentazione, /PM personali/);
  // la combinazione incompatibile: gli errori sono nel pannello, non solo nella consegna
  cfg = configurazioneConsegna(progetto('cristallo').lista[0], bat, dati);
  assert.ok(cfg.errori.length >= 1);
  assert.match(cfg.errori[0], /riserva interna/);
  // senza esemplare sicuro non inventa
  assert.match(configurazioneConsegna(progetto(null).lista[0], null, dati).nota, /quale/);
  // la tab mostra il riquadro e spegne il pulsante: lo dice il sorgente, la prova nel browser lo conferma
  const tab = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.match(tab, /data-configurazione-consegna/);
  assert.match(tab, /spento: cfg\?\.errori\.length/);
});

test('A.271: controllaConsegna non ferma le combinazioni coerenti', () => {
  assert.deepEqual(controllaConsegna({ rif: ORIGINALE }, 'cristallo', dati).errori, []);
  assert.deepEqual(controllaConsegna({ rif: ORIGINALE }, 'riserva_cm', dati).errori, []);
  assert.deepEqual(controllaConsegna({ rif: BATTERIA }, 'riserva_cm', dati).errori, [], 'stessa conversione: niente da dire');
  assert.deepEqual(controllaConsegna({ rif: BATTERIA }, null, dati).errori, []);
});

// ───────────────────────────── 4. lo strumento della voce di Dimitri ─────────────────────────────

/** Dimitri com'è nel file dell'11/11: la voce con la riserva interna e 5 CM, che l'arma non ha. Dalla fixture del 04/10. */
function dimitriSbagliato() {
  const p = deserializzaPersonaggio(readFileSync(new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url), 'utf8'));
  const c = normalizza(p.creazione, dati).scelte;
  const voce = { uid: 'cyber-sbagliata', rif: BATTERIA, stato: 'impugnata', quantita: 1, note: '', mano: 'destra' };
  return {
    creazione: { ...c, equipaggiamento: [...c.equipaggiamento, voce] },
    livelli: p.livelli,
    sessione: { ...(p.sessione ?? {}), chroma: { ...(p.sessione?.chroma ?? {}), 'cyber-sbagliata': { pmAttuali: 5, unita: 'CM' } } },
  };
}

test('A.271: lo strumento riconosce la voce sbagliata, la riporta all\'originale e toglie la riserva che non esiste', () => {
  const d = dimitriSbagliato();
  assert.equal(vociDaCorreggere(d.creazione.equipaggiamento, dati).length, 1);
  const c = correggi(d, dati, new Date(Q));
  assert.ok(!c.niente, c.niente);
  const voce = c.creazione.equipaggiamento.find((v) => v.uid === 'cyber-sbagliata');
  assert.equal(voce.rif, VOCE_GIUSTA);
  assert.equal(voce.esemplare.focalizzatore, 'Verde');
  assert.equal(voce.esemplare.alimentazione.pm_personali, true);
  assert.equal(voce.stato, 'impugnata', 'lo stato e la mano di chi la impugna non cambiano');
  assert.equal(c.sessione.chroma['cyber-sbagliata'], undefined, 'la riserva di CM non c’è più');
  assert.equal(c.sessione.storico.length, (d.sessione.storico?.length ?? 0) + 1, 'una riga nello storico');
  assert.match(c.sessione.storico.at(-1).testo, /A\.271/);
  assert.deepEqual(incoerenzeAlimentazione(voce, dati), []);
  // idempotente: sulla voce già corretta non c'è più niente
  const diNuovo = correggi({ creazione: c.creazione, livelli: d.livelli, sessione: c.sessione }, dati, new Date(Q));
  assert.ok(diNuovo.niente);
});

test('A.271: lo strumento non tocca una conversione che il Direttore ha consegnato o ricondotto', () => {
  const d = dimitriSbagliato();
  for (const extra of [{ consegna: { quando: Q, da: 'Direttore', progetto: 'p' } }, { esemplare: { nome: 'CyberArma Dimitri' } }, { esemplare: { storico: [{ quando: Q, cosa: 'x' }] } }]) {
    const eq = d.creazione.equipaggiamento.map((v) => (v.uid === 'cyber-sbagliata' ? { ...v, ...extra } : v));
    assert.equal(vociDaCorreggere(eq, dati).length, 0, `una voce con ${Object.keys(extra)[0]} è una conversione voluta`);
  }
});

test('A.271: l\'autonomia della CyberArma giusta, con la A.260: 2 PM per 10 Round, qualunque cosa si faccia', () => {
  const a = autonomia({ pmAttuali: 21, pmMassimi: 21, cm: 5 }, dati);
  assert.equal(a.costoPm, 2);
  assert.equal(a.round, 10);
  assert.deepEqual([a.pmPersonali.ora.attivazioni, a.pmPersonali.ora.round], [10, 100]);
  assert.deepEqual([a.riservaCm.attivazioni, a.riservaCm.round], [5, 50]);
  // non si arrotonda per eccesso: con 3 PM ci sono 1 attivazione sola
  assert.equal(autonomia({ pmAttuali: 3, pmMassimi: 21 }, dati).pmPersonali.ora.attivazioni, 1);
});

/** Una cartella di prova nata nel test (la guardia la riconosce), con due versioni di Dimitri. */
function cartellaConDimitri() {
  const base = mkdtempSync(join(tmpdir(), 'mutant-a271-'));
  const d = dimitriSbagliato();
  const scrivi = (nome, quando, sessione = d.sessione) => {
    const json = JSON.parse(serializza(d.creazione, { livelli: d.livelli, sessione }));
    json.versione_salvataggio = 4;
    json.aggiornato_il = quando;
    json.aggiornato_da = 'master';
    writeFileSync(join(base, nome), `${JSON.stringify(json, null, 2)}\n`);
  };
  scrivi('Dimitri-Orlav_liv7_2026-11-02.json', '2026-11-02T20:00:00.000Z');
  scrivi('Dimitri-Orlav_liv7_2026-11-11.json', '2026-11-11T19:52:10.000Z');
  return base;
}
const sha = (f) => createHash('sha1').update(readFileSync(f)).digest('hex');
const lancia = (cartella, ...extra) => spawnSync(process.execPath, ['tools/correggi-cyberarma-dimitri.mjs', `--cartella=${cartella}`, '--nome=Dimitri Orlav', ...extra], { cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 90000 });

test('A.271: da riga di comando — sola lettura di suo, --scrivi sul solo file attuale, copia di sicurezza, idempotente', () => {
  const cartella = cartellaConDimitri();
  const vecchio = join(cartella, 'Dimitri-Orlav_liv7_2026-11-02.json');
  const attuale = join(cartella, 'Dimitri-Orlav_liv7_2026-11-11.json');
  const prima = [sha(vecchio), sha(attuale)];

  const lettura = lancia(cartella);
  assert.equal(lettura.status, 0, lettura.stderr);
  assert.match(lettura.stdout, /1 personaggio/);
  assert.match(lettura.stdout, /file attuale: Dimitri-Orlav_liv7_2026-11-11\.json/);
  assert.match(lettura.stdout, /\d+ attivazioni = \d+ Round/, 'dice l\'autonomia');
  assert.match(lettura.stdout, /nessun file toccato/);
  assert.deepEqual([sha(vecchio), sha(attuale)], prima, 'senza --scrivi non cambia niente');
  assert.ok(!existsSync(`${attuale}.prima-a271`));

  const scritto = lancia(cartella, '--scrivi');
  assert.equal(scritto.status, 0, scritto.stderr);
  assert.equal(sha(vecchio), prima[0], 'la versione vecchia non si tocca');
  assert.notEqual(sha(attuale), prima[1], 'il file attuale cambia');
  assert.equal(sha(`${attuale}.prima-a271`), prima[1], 'la copia di sicurezza è il file di prima, identico');
  assert.ok(!readdirSync(cartella).some((n) => /\.json$/.test(n) && n.includes('prima-a271')), 'la copia non è un personaggio per l’app');
  const dopo = JSON.parse(readFileSync(attuale, 'utf8'));
  assert.equal(dopo.versione_salvataggio, 5, 'la versione di salvataggio sale di uno, come per l’app');
  assert.equal(dopo.aggiornato_da, 'master');
  assert.notEqual(dopo.aggiornato_il, '2026-11-11T19:52:10.000Z');
  assert.equal(dopo.scelte.equipaggiamento.find((v) => v.uid === 'cyber-sbagliata').rif, VOCE_GIUSTA);
  assert.equal(dopo.sessione.chroma?.['cyber-sbagliata'], undefined);

  // rilanciato: non trova più niente, e non riscrive
  const dopoScrittura = sha(attuale);
  const diNuovo = lancia(cartella, '--scrivi');
  assert.equal(diNuovo.status, 0, diNuovo.stderr);
  assert.match(diNuovo.stdout, /niente da correggere/);
  assert.equal(sha(attuale), dopoScrittura, 'idempotente');
  assert.equal(sha(`${attuale}.prima-a271`), prima[1], 'la copia di sicurezza resta quella di prima');
});

test('A.271: lo strumento si rifiuta di scegliere fra due personaggi dallo stesso nome', () => {
  const cartella = cartellaConDimitri();
  const p = JSON.parse(readFileSync(join(cartella, 'Dimitri-Orlav_liv7_2026-11-11.json'), 'utf8'));
  p.pg = 'pg-altro-dimitri';
  writeFileSync(join(cartella, 'Dimitri-Altro_liv7_2026-11-11.json'), `${JSON.stringify(p, null, 2)}\n`);
  const r = lancia(cartella, '--scrivi');
  assert.notEqual(r.status, 0, 'con due Dimitri si ferma');
  assert.match(r.stderr, /non scelgo io|più di un personaggio/);
});
