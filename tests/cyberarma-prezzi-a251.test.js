import '../tools/guardia-subito.mjs';
// Lotto 181 (08/11/2026): A.251 (come si alimenta la CyberArma), A.256 (prezzo di vendita degli artefatti) e
// A.257 (valore corrente del FIAT LUX). Fra queste prove, due che devono fallire se si torna indietro:
//  - una CyberArma con la riserva interna di CM non accetta i PM personali (A.251);
//  - il valore del FIAT LUX segue l'inventario (A.257): consumare o trasferire una voce lo cambia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import {
  famiglieAlimentazione, famigliaAlimentazione, conversioniAlimentazione, perditeAlimentazione,
  alimentazioneCyberArma, consumoAlimentazione, opzioniAlimentazione, alimentazioneDaTablet,
} from '../src/cyberarma.js';
import { apriProgetto, scegliAlimentazione, scegliForma, registraTentativo, chiudiProgetto, consegnaArma, avvisiConsegna, riepilogoProgetto, normalizzaProgetti } from '../src/progetti.js';
import { prezzoArtefatto, prezzoDiVendita, coefficienteRarita, arrotondaPrezzo, raritaArtefatto } from '../src/prezzi-artefatti.js';
import { valoreEsemplare, cambiaDotazioneExtra, righeDotazioneExtra } from '../src/valore-veicolo.js';
import { normalizzaRecord } from '../src/veicoli-registro.js';
import { testoAttivazione } from '../src/attivazione-arma.js';

const { dati } = await caricaDati((n) => readFile(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const art = (id) => dati.equipaggiamento.file.artefatti.oggetti.find((x) => x.id === id);
const arma = (id) => dati.equipaggiamento.file.armi.oggetti.find((x) => x.id === id);
const profiloScout = dati.veicoli.profili.find((p) => p.id === 'asa-scout-mk4');

// ───────────────────────────── A. A.251: l'alimentazione ─────────────────────────────

test('A.251: cristallo e SIN tengono i PM personali e le proprietà da Custode, e coesistono', () => {
  for (const id of ['cristallo', 'sin']) {
    const f = famigliaAlimentazione(id, dati);
    assert.ok(f, `${id} deve stare nei dati`);
    assert.equal(f.conversione, false);
    assert.equal(f.pm_personali, true);
    assert.equal(f.proprieta_custode, true);
  }
  const a = alimentazioneCyberArma(['cristallo', 'sin'], dati);
  assert.equal(a.pmPersonali, true);
  assert.equal(a.proprietaCustode, true);
  assert.equal(a.conversione, null);
  assert.deepEqual(a.errori, []);
});

test('A.251: una CyberArma con la riserva interna di CM non accetta i PM personali e perde le proprietà da Custode', () => {
  const a = alimentazioneCyberArma('riserva_cm', dati);
  // la prova che deve fallire se si torna indietro
  assert.equal(a.pmPersonali, false, 'con la riserva interna di CM i PM personali non si usano più (A.251)');
  assert.equal(a.proprietaCustode, false, 'con la riserva interna di CM si perdono le proprietà da Custode (A.251)');
  assert.equal(a.conversione, 'riserva_cm');
  assert.equal(a.perde.length, 2);
  // la stessa cosa per la conversione a NeC
  const n = alimentazioneCyberArma('nec', dati);
  assert.equal(n.pmPersonali, false);
  assert.equal(n.proprietaCustode, false);
});

test('A.251: le due conversioni sono alternative e non si cumulano', () => {
  const conv = conversioniAlimentazione(dati).map((f) => f.id);
  assert.deepEqual(conv.sort(), ['nec', 'riserva_cm']);
  const a = alimentazioneCyberArma(['riserva_cm', 'nec'], dati);
  assert.equal(a.errori.length, 1);
  assert.match(a.errori[0], /non si cumulano/);
});

test('A.251: i consumi si contano in colpi — 1 CM + 1 AzP ogni 10 colpi, 1 carica ogni 10 colpi', () => {
  const cm = consumoAlimentazione('riserva_cm', dati);
  assert.equal(cm.cm, 1);
  assert.equal(cm.ogni_colpi, 10);
  assert.equal(cm.azione, '1 AzP');
  assert.match(cm.testo, /1 CM \+ 1 AzP ogni 10 colpi/);
  const nec = consumoAlimentazione('nec', dati);
  assert.equal(nec.cariche, 1);
  assert.equal(nec.colore, 'Rosso');
  assert.equal(nec.ogni_colpi, 10);
  assert.match(nec.testo, /ogni 10 colpi/);
  // niente consumo per cristallo e SIN: non cambiano l'alimentazione
  assert.equal(consumoAlimentazione('cristallo', dati), null);
});

test('A.251: nella scheda la sintesi dice i colpi, non i Round', () => {
  const scheda = { classi: [{ nome: 'Tecnomante', grado: 3 }] };
  const t = testoAttivazione(arma('cyberarma-batteria-verde'), scheda, {}, 'u1');
  assert.equal(t.ogniColpi, 10);
  assert.equal(t.sintesi, '1 CM · 10 colpi');
  // l'originale, senza conversione, resta a Round
  const o = testoAttivazione(arma('cyberarma'), scheda, {}, 'u1');
  assert.equal(o.ogniColpi, null);
  assert.match(o.sintesi, /Round$/);
});

test('A.251: su un esemplare convertito l’impiego del Custode non è disponibile', () => {
  for (const id of ['cyberarma-batteria-verde', 'cyberarma-nec']) {
    const cu = arma(id).uso_per_classe.classi.find((c) => c.classe === 'Custode');
    if (!cu) continue;
    assert.equal(cu.ammesso, false, `${id}: il Custode non usa un esemplare convertito (A.251)`);
    assert.match(cu.testo, /proprietà da Custode/);
  }
  // l'originale resta utilizzabile dal Custode
  const o = arma('cyberarma').uso_per_classe.classi.find((c) => c.classe === 'Custode');
  assert.notEqual(o.ammesso, false);
});

test('A.251: la scelta dice cosa si perde prima di confermare, e una conversione la autorizza il Direttore', () => {
  const p = perditeAlimentazione('riserva_cm', dati);
  assert.equal(p.conversione, true);
  assert.match(p.testo, /Si perdono l’alimentazione con i PM personali e le proprietà da Custode \(A\.251\)\./);
  const q = perditeAlimentazione('cristallo', dati);
  assert.equal(q.conversione, false);
  assert.match(q.testo, /continua a potersi alimentare con i PM personali/);
  const modello = arma('cyberarma').progetti.find((x) => x.id === 'paradise-dimitri');
  const giocatore = opzioniAlimentazione(modello, dati, { master: false });
  assert.equal(giocatore.find((o) => o.id === 'cristallo').sceglibile, true);
  assert.equal(giocatore.find((o) => o.id === 'riserva_cm').sceglibile, false);
  assert.match(giocatore.find((o) => o.id === 'nec').motivo, /autorizza il Direttore/);
  const direttore = opzioniAlimentazione(modello, dati, { master: true });
  assert.equal(direttore.find((o) => o.id === 'riserva_cm').sceglibile, true);
  // ogni opzione porta con sé che cosa si perde, da leggere prima di confermare
  for (const o of direttore) assert.ok(o.perdite.length > 10, `${o.id}: serve il testo di che cosa si perde`);
});

test('A.251: il giocatore non sceglie una conversione, il Direttore sì', () => {
  const { lista } = apriProgetto([], 'paradise-dimitri', dati, { quando: '2026-11-08T10:00:00Z' });
  const no = scegliAlimentazione(lista, lista[0].id, 'riserva_cm', dati, { quando: 'x', da: 'giocatore', master: false });
  assert.ok(no.errore, 'dal giocatore una conversione non passa');
  const si = scegliAlimentazione(lista, lista[0].id, 'riserva_cm', dati, { quando: 'x', da: 'Direttore', master: true });
  assert.equal(si.progetto.alimentazione.id, 'riserva_cm');
  const ok = scegliAlimentazione(lista, lista[0].id, 'cristallo', dati, { quando: 'x', da: 'giocatore' });
  assert.equal(ok.progetto.alimentazione.id, 'cristallo');
  // dopo il primo esito la scelta è fissata
  const dopo = registraTentativo(ok.lista, lista[0].id, 1, 'successo', { quando: 'y' });
  assert.ok(scegliAlimentazione(dopo.lista, lista[0].id, 'sin', dati, { quando: 'z', master: true }).errore);
});

test('A.251: dal tablet una conversione non si scrive; cristallo e SIN sì', () => {
  const { lista } = apriProgetto([], 'paradise-dimitri', dati, { quando: '2026-11-08T10:00:00Z' });
  const id = lista[0].id;
  const conv = alimentazioneDaTablet([{ ...lista[0], alimentazione: { id: 'nec', quando: 'x', da: 'giocatore' } }], lista, dati);
  assert.equal(conv[0].alimentazione, null, 'il server non lascia scrivere una conversione da un tablet (A.251)');
  const ok = alimentazioneDaTablet([{ ...lista[0], alimentazione: { id: 'sin', quando: 'x', da: 'Direttore' } }], lista, dati);
  assert.equal(ok[0].alimentazione.id, 'sin');
  assert.equal(ok[0].alimentazione.da, 'giocatore', 'da un tablet la scelta è sempre del giocatore');
  assert.equal(ok[0].id, id);
});

test('A.251: l’arma consegnata con una conversione ha il profilo della conversione, e la consegna avvisa', () => {
  const { lista } = apriProgetto([], 'paradise-dimitri', dati, { quando: '2026-11-08T10:00:00Z' });
  const id = lista[0].id;
  let l = scegliForma(lista, id, 'lama-lunga', dati, { quando: 'x' }).lista;
  l = scegliAlimentazione(l, id, 'nec', dati, { quando: 'x', master: true }).lista;
  for (const n of [1, 2, 3]) l = registraTentativo(l, id, n, 'successo', { quando: 'x' }).lista;
  l = chiudiProgetto(l, id, 'riuscito', { quando: 'x' }).lista;
  const avv = avvisiConsegna(l.find((p) => p.id === id), dati);
  assert.ok(avv.some((x) => /perde/.test(x) && /A\.251/.test(x)), `la consegna deve avvisare della perdita: ${avv.join(' | ')}`);
  const creazione = { progettiMaster: l, equipaggiamento: [{ uid: 'v1', rif: 'armi:cyberarma', stato: 'trasportato', quantita: 1, esemplare: { nome: 'CyberArma Park' } }] };
  const r = consegnaArma(creazione, id, dati, { quando: 'x', master: true, uid: 'v2' });
  assert.ok(!r.errore, r.errore);
  const voce = r.creazione.equipaggiamento.find((v) => v.uid === 'v1');
  assert.equal(voce.rif, 'armi:cyberarma-nec', 'con la conversione a NeC si consegna il profilo convertito (A.251)');
  assert.equal(voce.esemplare.alimentazione.pm_personali, false);
  assert.equal(voce.esemplare.alimentazione.proprieta_custode, false);
  assert.equal(r.creazione.equipaggiamento.filter((v) => String(v.rif).startsWith('armi:cyberarma')).length, 1, 'A.231: nessuna seconda CyberArma');
  assert.ok(r.creazione.equipaggiamento.some((v) => v.rif === 'artefatti:chroma-viola-frammento'), 'A.231: il Viola estratto resta un oggetto a parte');
  // il riepilogo porta la scelta e il suo consumo
  const rp = riepilogoProgetto(l.find((p) => p.id === id), dati);
  assert.equal(rp.alimentazione.id, 'nec');
  assert.match(rp.alimentazione.consumo.testo, /ogni 10 colpi/);
});

test('A.251: senza scelta l’arma consegnata resta a PM personali, come il progetto base', () => {
  const { lista } = apriProgetto([], 'paradise-dimitri', dati, { quando: 'x' });
  const id = lista[0].id;
  const creazione = { progettiMaster: lista, equipaggiamento: [{ uid: 'v1', rif: 'armi:cyberarma', stato: 'trasportato', quantita: 1 }] };
  const r = consegnaArma(creazione, id, dati, { quando: 'x', master: true, uid: 'v2' });
  const voce = r.creazione.equipaggiamento[0];
  assert.equal(voce.rif, 'armi:cyberarma');
  assert.equal(voce.esemplare.configurazione, 'PM personali');
  // e il file si rilegge con la sua alimentazione
  assert.equal(normalizzaProgetti([{ ...lista[0], alimentazione: { id: 'sin', quando: 'x', da: 'giocatore' } }])[0].alimentazione.id, 'sin');
});

// ───────────────────────────── B. A.256: il prezzo di vendita ─────────────────────────────

test('A.256: i coefficienti di rarità e l’arrotondamento ai 50 cr per eccesso', () => {
  assert.equal(coefficienteRarita('Comune', dati), 1);
  assert.equal(coefficienteRarita('Non Comune', dati), 1.5);
  assert.equal(coefficienteRarita('Rara', dati), 2);
  assert.equal(coefficienteRarita('Molto Rara', dati), 3);
  assert.equal(coefficienteRarita('Leggendaria', dati), 5);
  assert.equal(arrotondaPrezzo(1, dati), 50);
  assert.equal(arrotondaPrezzo(1950, dati), 1950);
  assert.equal(arrotondaPrezzo(1951, dati), 2000);
  assert.equal(arrotondaPrezzo(13500, dati), 13500);
});

test('A.256: l’Anello con Rigenerazione 9 è Molto raro e vale 13.500 cr', () => {
  const v = art('anello-di-rigenerazione-9');
  assert.equal(v.artefatto.potenza, 'Molto Rara', 'la A.256 lo dice Molto raro: nei dati era «Rara»');
  assert.equal(v.creazione_cr, 1500);
  const p = prezzoArtefatto(v, dati);
  assert.equal(p.cr, 13500, '1.500 × 3 × 3 = 13.500 cr');
  assert.equal(p.vendita, 13500);
  assert.equal(p.fonte, 'A.256', 'il catalogo non ne dava un prezzo: lo dà la formula');
  assert.equal(p.coefficiente, 3);
});

test('A.256: un Comune e un Leggendario, con il conto e l’arrotondamento', () => {
  const comune = art('batteria-da-5-pm-chroma-rosso');
  assert.equal(raritaArtefatto(comune, dati), 'Comune');
  const pc = prezzoArtefatto(comune, dati);
  // A.261 (risposta): la formula vince come regola, e Davide ha ricalcolato il catalogo con essa. Il prezzo
  // scritto nell’Equipaggiamento 0.41 §10.2 è 1.950 cr, non più 1.000: l’app lo legge dal manuale e la formula lo
  // conferma. Se un giorno i due numeri tornano a divergere, vince quello scritto.
  assert.equal(pc.vendita, 1950, '650 × 3 × 1 = 1.950 cr');
  assert.equal(pc.catalogo, 1950, 'il prezzo scritto nel manuale (§10.2)');
  assert.equal(pc.cr, 1950, 'dove il catalogo ha un prezzo, si usa quello');
  assert.equal(pc.verifica.torna, true, 'la formula ritrova la cifra scritta');
  const legg = art('batteria-da-30-pm-chroma-rosso');
  assert.equal(raritaArtefatto(legg, dati), 'Leggendaria');
  assert.equal(prezzoArtefatto(legg, dati).vendita, 51000, '3.400 × 3 × 5 = 51.000 cr');
  // l'arrotondamento per eccesso ai 50 si vede su un costo che non torna tondo
  assert.equal(prezzoDiVendita(101, 'Comune', dati).cr, 350, '101 × 3 × 1 = 303 → 350');
  assert.equal(prezzoDiVendita(101, 'Non Comune', dati).cr, 500, '101 × 3 × 1,5 = 454,5 → 500');
});

test('A.256: un «Unico o reliquia» non mostra un prezzo di catalogo', () => {
  for (const id of ['scrigno-del-primo-giuramento', 'tomo-dei-guardiani']) {
    const v = art(id);
    assert.equal(v.unico, true);
    assert.equal(raritaArtefatto(v, dati), 'Unico o reliquia');
    const p = prezzoArtefatto(v, dati);
    assert.equal(p.cr, null, `${id}: senza prezzo di catalogo (A.256)`);
    assert.match(p.motivo, /unico o reliquia/);
  }
  // ogni CyberArma originale è un pezzo unico (Armamenti §7.25)
  // A.265: le CyberArmi restano pezzi unici — niente prezzo di listino, «Compra» spento — ma l’originale ha un
  // valore indicativo scritto nel manuale, e la verifica della formula lo conferma senza sostituirlo.
  for (const id of ['cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec']) {
    assert.equal(arma(id).unico, true, `${id}: pezzo unico`);
    assert.equal(raritaArtefatto(arma(id), dati), 'Unico o reliquia', id);
    assert.equal(prezzoArtefatto(arma(id), dati).vendita, null, `${id}: nessun prezzo di listino`);
  }
  const cy = prezzoArtefatto(arma('cyberarma'), dati);
  assert.equal(cy.cr, 7500, 'il valore indicativo scritto nel §7.25');
  // la potenza di un'arma sta nel suo blocco Artefatto (artefatti_catalogo, per rif), non nella voce dell'arma:
  // la verifica della formula si fa con la potenza del blocco.
  assert.equal(prezzoDiVendita(1250, 'Rara', dati).cr, 7500, '1.250 × 3 × 2 = 7.500: la formula conferma la cifra scritta');
});

test('A.256: rarità e reperibilità restano separate, e l’Epica non ha coefficiente (A.262)', () => {
  const p = prezzoArtefatto(art('guanti-da-combattimento-mistico'), dati);
  assert.equal(p.rarita, 'Rara');
  assert.equal(p.reperibilita, 'MR', 'la reperibilità viaggia accanto al prezzo: il denaro non garantisce il venditore');
  assert.match(p.nota, /non garantisce/);
  // A.261 chiude anche la A.262: la scala ha sei gradini e l’«Epica» vale 4. Prima questa Batteria di Grado V
  // restava senza prezzo calcolato e l’app lo diceva; adesso il conto torna con la cifra scritta nel §10.2.
  const epica = art('batteria-da-25-pm-chroma-rosso');
  assert.equal(raritaArtefatto(epica, dati), 'Epica');
  const pe = prezzoArtefatto(epica, dati);
  assert.equal(pe.coefficiente, 4, 'Epica 4 (Magia 1.17 §24.3; Equipaggiamento 0.41 §10.1)');
  assert.equal(pe.cr, 34200, 'il prezzo scritto nel manuale');
  assert.equal(pe.vendita, 34200, '2.850 × 3 × 4 = 34.200: la formula lo conferma');
  assert.equal(pe.motivo, null);
});

test('A.256: le rarità dei dati stanno con il costo di sintonizzazione del §7.10 (o con un’eccezione dichiarata)', () => {
  const potenze = dati.equipaggiamento.file.artefatti.sintonizzazione.potenze;
  const fuori = [];
  for (const [id, f] of Object.entries(dati.equipaggiamento.file)) {
    for (const o of f.oggetti ?? []) {
      const a = o.artefatto;
      if (!a?.potenza || a.proprieta_attive !== true || a.snt_per_impiego === true || a.snt_eccezione) continue;
      if (potenze[a.potenza] !== a.sintonizzazione) fuori.push(`${id}:${o.id} ${a.potenza}/${a.sintonizzazione}`);
    }
    for (const c of f.artefatti_catalogo ?? []) {
      if (!c.potenza || c.proprieta_attive !== true || c.snt_per_impiego === true || c.snt_eccezione) continue;
      if (potenze[c.potenza] !== c.sintonizzazione) fuori.push(`${c.rif} ${c.potenza}/${c.sintonizzazione}`);
    }
  }
  assert.deepEqual(fuori, [], `rarità e SnT disallineate (§7.10): ${fuori.join(', ')}`);
  // la voce convertita a NeC ha SnT 3: la rarità è Rara (prima diceva «Non Comune»)
  const nec = dati.equipaggiamento.file.artefatti.artefatti_catalogo.find((x) => x.rif === 'armi:cyberarma-nec');
  assert.equal(nec.potenza, 'Rara');
  assert.equal(nec.sintonizzazione, 3);
});

// ───────────────────────────── C. A.257: il valore del FIAT LUX ─────────────────────────────

/** Il FIAT LUX come lo legge l'app: il record del registro, normalizzato (cariche, dotazione dell'esemplare). */
const fiatLux = () => normalizzaRecord({
  formato: 'mutant-veicolo', versione: 1, id: 'vei-prova', revisione: 1, proprietario: { tipo: 'gruppo' },
  mezzo: {
    uid: 'vei-prova', profilo: 'asa-scout-mk4', nome: 'FIAT LUX', andatura: 'fermo',
    pi: { corpo: 60, propulsione: 36, motore: 24 },
    rinforzi: { 'copriruote-petra': { montati: [3, 3, 3, 3], ricambi: [3, 3] } },
    energia: { rosso: [50000, 50000], rosso_ricambi: [50000], verde: [10000], verde_ricambi: [10000], aria: { fissa: 8, bombole: [8, 8] } },
    munizioni: [{ caricate: 400, riserva: 800 }],
    avarie: '',
  },
}, dati).mezzo;

test('A.257: tre righe separate — modello base, dotazione extra, totale', () => {
  const v = valoreEsemplare(fiatLux(), profiloScout, dati);
  assert.equal(v.base.cr, 126510, 'il prezzo di catalogo dello Scout standard resta 126.510 cr');
  assert.match(v.base.da, /prezzo di catalogo/);
  assert.equal(v.extra.cr, 62600);
  assert.equal(v.totale.cr, 189110);
  assert.equal(v.mancante, false);
  // non un numero solo: le tre righe hanno un nome ciascuna
  assert.deepEqual([v.base.nome, v.extra.nome, v.totale.nome], ['Modello base', 'Dotazione extra', 'Valore totale dell’esemplare']);
});

test('A.257: le voci che Davide elenca concorrono al totale finché sono a bordo', () => {
  const righe = righeDotazioneExtra(fiatLux(), profiloScout, dati);
  const per = Object.fromEntries(righe.map((r) => [r.id, r]));
  assert.equal(per['kit-trauma'].cr, 3000);
  assert.equal(per['pistola-sanitaria'].cr, 3500);
  assert.equal(per['cartucce-naniti'].quantita, 10);
  assert.equal(per['cartucce-naniti'].cr, 50000);
  assert.equal(per['colpi-m606'].quantita, 400, 'i 400 colpi oltre i 400 di riserva dello standard');
  assert.equal(per['colpi-m606'].cr, 1200);
  assert.equal(per['mec-rosso-ricambio'].cr, 3000);
  assert.equal(per['cec-verde-ricambio'].cr, 1000);
  assert.equal(per['copriruote-petra'].quantita, 6);
});

test('A.257: il valore segue l’inventario — consumare, rimuovere o trasferire lo cambia', () => {
  const mezzo = fiatLux();
  const prima = valoreEsemplare(mezzo, profiloScout, dati).totale.cr;
  // un consumabile usato: due cartucce di naniti
  const c = cambiaDotazioneExtra(mezzo, profiloScout, 'cartucce-naniti', 8);
  assert.ok(!c.errore, c.errore);
  const dopo = valoreEsemplare(c.mezzo, profiloScout, dati);
  // la prova che deve fallire se il valore torna a essere un numero scritto una volta
  assert.equal(dopo.totale.cr, prima - 10000, 'due cartucce consumate valgono 10.000 cr in meno (A.257)');
  assert.equal(dopo.extra.righe.find((r) => r.id === 'cartucce-naniti').quantita, 8);
  // un ricambio trasferito: esce dalle riserve del mezzo
  const senzaMec = { ...c.mezzo, energia: { ...c.mezzo.energia, rosso_ricambi: [] } };
  assert.equal(valoreEsemplare(senzaMec, profiloScout, dati).totale.cr, prima - 10000 - 3000);
  // le munizioni sparate
  const sparati = { ...c.mezzo, munizioni: [{ ...c.mezzo.munizioni[0], riserva: 500 }] };
  assert.equal(valoreEsemplare(sparati, profiloScout, dati).extra.righe.find((r) => r.id === 'colpi-m606').cr, 300);
  // un copriruota distrutto
  const rotto = { ...c.mezzo, rinforzi: { 'copriruote-petra': { montati: [0, 3, 3, 3], ricambi: [3, 3] } } };
  assert.equal(valoreEsemplare(rotto, profiloScout, dati).extra.righe.find((r) => r.id === 'copriruote-petra').quantita, 5);
  // il modello base non cambia per nessuna di queste
  assert.equal(valoreEsemplare(rotto, profiloScout, dati).base.cr, 126510);
});

test('A.257: un accumulatore di ricambio scarico vale meno (A.264), mai meno di zero', () => {
  const mezzo = fiatLux();
  const mezzoScarico = { ...mezzo, energia: { ...mezzo.energia, rosso_ricambi: [4] } };
  const r = righeDotazioneExtra(mezzoScarico, profiloScout, dati).find((x) => x.id === 'mec-rosso-ricambio');
  assert.deepEqual(r.cariche, [4]);
  assert.equal(r.mancanti, 6);
  assert.equal(r.calo, 180, '6 cariche mancanti × 30 cr la carica (tariffa del MEC nei dati)');
  assert.equal(r.cr, 2820);
  const vuoto = righeDotazioneExtra({ ...mezzo, energia: { ...mezzo.energia, rosso_ricambi: [0] } }, profiloScout, dati).find((x) => x.id === 'mec-rosso-ricambio');
  assert.equal(vuoto.cr, 2700, 'il calo non va oltre il prezzo pieno');
  assert.ok(vuoto.cr >= 0);
});

test('A.257 e A.226: il valore stimato del Direttore prende il posto del modello base', () => {
  const v = valoreEsemplare({ ...fiatLux(), valore_stimato_cr: 90000 }, profiloScout, dati);
  assert.equal(v.base.cr, 90000);
  assert.match(v.base.da, /Direttore/);
  assert.equal(v.totale.cr, 90000 + 62600, 'la dotazione extra si somma comunque');
});

test('A.257: un esemplare unico non ha modello base finché il Direttore non lo stima (A.240)', () => {
  const nev = dati.veicoli.profili.find((p) => p.esemplare_unico === true);
  assert.ok(nev, 'serve un esemplare unico nel catalogo (la Neverlost)');
  const v = valoreEsemplare({ profilo: nev.id, pi: {}, rinforzi: {} }, nev, dati);
  assert.equal(v.base.cr, null);
  assert.equal(v.totale.cr, null);
  assert.equal(v.mancante, true);
  assert.ok(v.base.nota);
});

test('A.257: le voci che si contano da munizioni, rinforzi e riserve si cambiano lì, non a mano', () => {
  const mezzo = fiatLux();
  for (const id of ['colpi-m606', 'copriruote-petra', 'mec-rosso-ricambio']) {
    const r = cambiaDotazioneExtra(mezzo, profiloScout, id, 0);
    assert.ok(r.errore, `${id}: non si cambia a mano`);
    assert.match(r.errore, /si cambia lì/);
  }
  assert.ok(cambiaDotazioneExtra(mezzo, profiloScout, 'non-esiste', 1).errore);
});

test('A.257: la vista del mezzo porta le tre righe, e il totale non è scritto nel file', async () => {
  const { vistaVeicoloPersonaggio } = await import('../src/veicoli.js');
  const mezzo = fiatLux();
  const prima = JSON.stringify(mezzo);
  const vista = vistaVeicoloPersonaggio({ ...mezzo, scheda: undefined }, dati);
  assert.equal(vista.valore.esemplare.totale.cr, 189110);
  assert.equal(vista.valore.catalogo, 126510);
  assert.equal(JSON.stringify(mezzo), prima, 'la vista non tocca il mezzo');
  assert.equal(mezzo.valore_totale_cr, undefined, 'il totale è un conto, non un campo del file');
});
