import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 236 (23/11/2026) — i Doc grandi si leggono in testo semplice.
//
// I due controlli che il lotto chiede per nome, e che devono restare verdi sempre:
//
//  1. **una coppia etichetta/valore spaiata non si riempie per deduzione.** È la regola del lettore del Bestiario
//     (lotto 204) nella sua forma più stretta: un'etichetta senza il suo valore è una lettura parziale, e una
//     lettura parziale non si scrive mai sopra un valore buono. Il mutante è il modo in cui un lettore «aggiusta»
//     una coppia spaiata — completarla con una stringa vuota, o scartare l'etichetta orfana — e questo controllo
//     deve diventare rosso;
//  2. **l'importatore non torna a dipendere dal solo Markdown.** Il motivo è scritto in CLAUDE.md: l'esportazione
//     in Markdown impacchetta le immagini e sopra una certa dimensione Drive la rifiuta, quindi un lettore che sa
//     leggere solo le barre non legge il Manuale dei Veicoli. Qui si prova che legge **entrambe** le forme, e che
//     nella forma che non sa leggere non finge di aver letto.
//
// Niente date né impronte scritte a mano: le edizioni si chiedono al registro (`tests/niente-date-del-registro-218`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  blocchiTesto, tabelleTesto, intestazioneDi, INTESTAZIONI, censiteNonViste,
  eTestoSemplice, righeTesto, titoloNumerato, capitoloTesto,
} from '../tools/tabelle-testo.mjs';
import { leggiTabelle, leggiSchede, confronta, refertoForma, CAPITOLO_PROFILO } from '../tools/importa-veicoli.mjs';
import { testoManuale, testoEdizione, versioneManuale } from '../tools/manuali.mjs';
import { senzaImmagini } from '../tools/estrai-doc-markdown.mjs';
import { condizioneCessione } from '../src/equipaggiamento.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const VEICOLI = testoManuale('veicoli');

// una tabella in testo semplice, scritta a mano: tre righe da due colonne
const DUE = ['Dato', 'Valore', 'Protezioni', 'AR 16; Corazzato 4', 'MAN', '−4', 'Prezzo', '4.800.000 cr'];
const tabella = (celle) => celle.map((c, i) => (i === 0 ? c : '\t' + c)).join('\r\n') + '\r\n\t\r\n';

test('una coppia spaiata si DICHIARA e non si riempie per deduzione', () => {
  // la tabella intera: tre righe, nessuna cella avanzata
  const piena = tabelleTesto(tabella(DUE));
  assert.equal(piena.tabelle.length, 1);
  assert.deepEqual(piena.tabelle[0].colonne, ['Dato', 'Valore']);
  assert.equal(piena.tabelle[0].righe.length, 3);
  assert.equal(piena.spaiate.length, 0, 'niente da dichiarare quando tutto combacia');

  // **l'etichetta orfana**: «Prezzo» senza il suo valore
  const orfana = tabelleTesto(tabella(DUE.slice(0, -1)));
  assert.equal(orfana.tabelle[0].righe.length, 2, 'le due righe intere restano');
  assert.equal(orfana.spaiate.length, 1, 'la coppia spaiata si dichiara');
  assert.deepEqual(orfana.spaiate[0].celle, ['Prezzo']);
  assert.equal(orfana.spaiate[0].colonne, 2);
  // e qui il punto: nessuna riga inventata, nessuna cella vuota, nessun valore attaccato alla riga precedente
  for (const r of orfana.tabelle[0].righe) {
    assert.equal(r.length, 2);
    for (const c of r) assert.ok(c && c.trim(), 'nessuna cella vuota messa al posto di un valore mancante');
  }
  assert.equal(orfana.tabelle[0].righe.flat().includes('Prezzo'), false, 'l’etichetta orfana non entra in una riga');

  // **il valore orfano**: un valore senza la sua etichetta, su una tabella a quattro colonne
  const QUATTRO = ['Andatura', 'Q Base/rnd', 'km/h', 'Modificatore a Pilotare', 'Controllata', '20', '18', '0', 'Rapida', '40'];
  const q = tabelleTesto(tabella(QUATTRO));
  assert.equal(q.tabelle[0].righe.length, 1);
  assert.deepEqual(q.spaiate[0].celle, ['Rapida', '40']);
  assert.equal(q.tabelle[0].righe.flat().includes('Rapida'), false);

  // il mutante, scritto per esteso: se qualcuno «aggiustasse» la coppia spaiata completandola, il totale delle
  // celle lette cambierebbe e questa somma non tornerebbe più. Le celle lette più quelle dichiarate spaiate
  // sono esattamente le celle dei dati, sempre: niente si perde e niente si inventa.
  for (const celle of [DUE, DUE.slice(0, -1), QUATTRO]) {
    const r = tabelleTesto(tabella(celle));
    const lette = r.tabelle.reduce((n, t) => n + t.righe.flat().length, 0);
    const dichiarate = r.spaiate.reduce((n, s) => n + s.celle.length, 0);
    const intestazione = r.tabelle.reduce((n, t) => n + t.colonne.length, 0);
    assert.equal(lette + dichiarate + intestazione, celle.length, `${celle.length} celle: ${lette} lette + ${dichiarate} spaiate + ${intestazione} d’intestazione`);
  }
});

test('un’intestazione che non è censita non si legge: si dichiara', () => {
  const ignota = tabella(['Fantasia', 'Valore', 'Qualcosa', '1', 'Altro', '2']);
  const r = tabelleTesto(ignota);
  assert.equal(r.tabelle.length, 0, 'niente si legge da un’intestazione che non conosciamo');
  assert.equal(r.nonRiconosciute.length, 1);
  assert.deepEqual(r.nonRiconosciute[0].prime.slice(0, 2), ['Fantasia', 'Valore']);
  // e il numero di colonne non si indovina dal conto delle celle
  assert.equal(intestazioneDi(['Fantasia', 'Valore', 'Qualcosa']), null);
  // una censita più lunga vince su una più corta: «Caratteristica|Valore|Caratteristica|Valore» non è due colonne
  assert.equal(intestazioneDi(['Caratteristica', 'Valore', 'Caratteristica', 'Valore', 'MOV / MAN', '30 Q / 0']).length, 4);
  assert.equal(intestazioneDi(['Caratteristica', 'Valore', 'Equipaggio', '1 + 4']).length, 2);
});

test('l’importatore dei Veicoli legge ENTRAMBE le forme, e il Manuale dei Veicoli è in testo semplice', () => {
  // il manuale corrente: quello che non si esporta in Markdown
  assert.equal(eTestoSemplice(VEICOLI), true, 'il Manuale dei Veicoli corrente è salvato in testo semplice');
  assert.equal(refertoForma(VEICOLI).forma, 'testo semplice');
  const tabPiano = leggiTabelle(VEICOLI);
  assert.ok(tabPiano.length > 100, `in testo semplice si leggono ${tabPiano.length} tabelle`);

  // **il mutante del lotto**: un lettore che dipende dal solo Markdown qui leggerebbe ZERO tabelle. Il controllo
  // non guarda il codice ma il risultato: se `leggiTabelle` tornasse a cercare solo le barre, questa riga cade.
  const soloBarre = VEICOLI.split('\n').filter((r) => /^\s*\|/.test(r)).length;
  assert.equal(soloBarre, 0, 'nel testo semplice non c’è una sola riga con le barre: un lettore tarato sul Markdown non leggerebbe niente');

  // e la rete: un'edizione in Markdown si legge ancora, con gli stessi campi e senza scarti
  const md = testoEdizione('veicoli', '0.19');
  assert.equal(eTestoSemplice(md), false, 'la 0.19 è un’esportazione in Markdown');
  assert.equal(refertoForma(md).forma, 'Markdown');
  assert.ok(leggiTabelle(md).length > 50);

  // le schede dei capitoli 9–13 si leggono in tutte e due le forme, e in nessuna delle due ci sono scarti
  for (const [etichetta, testo] of [['testo semplice', VEICOLI], ['Markdown', md]]) {
    const sch = leggiSchede(testo);
    const c = confronta(sch, dati.veicoli.profili);
    assert.equal(c.scarti.length, 0, `${etichetta}: nessuno scarto fra il manuale e il catalogo`);
    const letti = Object.keys(c.letti);
    assert.equal(letti.length, Object.keys(CAPITOLO_PROFILO).length, `${etichetta}: tutti i profili del catalogo hanno una scheda letta (${letti.join(', ')})`);
    for (const [id, n] of Object.entries(c.letti)) assert.ok(n >= 1, `${etichetta}: ${id} con ${n} campi letti`);
  }
});

test('nel testo semplice un titolo si riconosce dalla NUMERAZIONE, non dai cancelletti', () => {
  const righe = righeTesto(VEICOLI);
  // il paragrafo del mezzo più carico del manuale, letto per numerazione
  const i = righe.findIndex((r) => /^16\.11 Bastion TC$/.test(r));
  assert.ok(i > 0, 'il §16.11 c’è');
  const t = titoloNumerato(righe, i + 2);
  assert.deepEqual({ capitolo: t.capitolo, numero: t.numero, titolo: t.titolo }, { capitolo: 16, numero: '16.11', titolo: 'Bastion TC' });
  // e una CELLA non è mai un titolo: nel testo semplice ogni cella comincia con una tabulazione
  assert.equal(titoloNumerato(['\t20 ScE/rnd, fino al massimo', 'x'], 2), null);
  assert.equal(titoloNumerato(['\t1 CEC Rossa da 100 UER; 10 cariche', 'x'], 2), null);
  // né una riga di prosa, né un numero con un'unità, né un titolo di una parola sola
  assert.equal(titoloNumerato(['1 Round = 6 secondi; 1 Q = 1,5 m. Il mezzo si muove all’Iniziativa.', 'x'], 2), null);
  assert.equal(titoloNumerato(['18.000 cr', 'x'], 2), null);
  assert.equal(titoloNumerato(['12 PI', 'x'], 2), null);
  assert.equal(titoloNumerato(['80 giornate-persona', 'x'], 2), null);
  // ogni tabella del manuale cade in un capitolo che esiste
  const capitoli = new Set(tabelleTesto(VEICOLI).tabelle.map((x) => capitoloTesto(righe, x.riga)));
  for (const c of capitoli) assert.ok(c === null || (c >= 1 && c <= 18), `capitolo ${c} fuori dal manuale`);
});

test('l’estrattore riconosce la forma, e dichiara che nel testo semplice non ci sono immagini', () => {
  const p = senzaImmagini(VEICOLI);
  assert.equal(p.forma, 'testo semplice');
  assert.equal(p.immagini, 0);
  assert.deepEqual(p.richiami, []);
  // e la forma Markdown continua a togliere le immagini contandole
  const m = senzaImmagini('# **1 Titolo**\n\ntesto\n\n[image1]: <data:image/png;base64,AAAA>\n');
  assert.equal(m.forma, 'Markdown');
  assert.equal(m.immagini, 1);
});

test('il censimento non invecchia: ogni intestazione censita si vede nel manuale', () => {
  assert.deepEqual(censiteNonViste(VEICOLI), [], 'un’intestazione censita che non compare in nessun manuale è una nostra invenzione');
  assert.ok(INTESTAZIONI.length >= 10);
  // nei capitoli dei mezzi non resta una tabella non letta
  const righe = righeTesto(VEICOLI);
  const fuori = blocchiTesto(VEICOLI).filter((b) => {
    const t = titoloNumerato(righe, b.riga);
    return t && t.capitolo >= 16 && t.capitolo <= 18 && !intestazioneDi(b.celle);
  });
  assert.deepEqual(fuori.map((b) => b.celle.slice(0, 2)), [], 'capitoli 16–18: nessuna tabella senza intestazione censita');
  // e l'edizione la dà il registro, non questo test
  assert.equal(versioneManuale('veicoli'), JSON.parse(readFileSync(new URL('../tools/manuali.json', import.meta.url), 'utf8')).manuali.find((x) => x.id === 'veicoli').versione);
});

test('il motivo di «Compra» non si legge due volte, e dove serve il davanti resta', () => {
  const voci = Object.values(dati.equipaggiamento.file).flatMap((f) => f.oggetti ?? []);
  const ces = voci.map((o) => condizioneCessione(o)).filter(Boolean);
  assert.ok(ces.length >= 8, `le voci non in vendita sono ${ces.length}`);
  for (const c of ces) {
    // la frase non comincia mai due volte con «non in vendita»
    assert.equal(/^non in vendita\.\s*non\s+(è|sono)?\s*in vendita/i.test(c.motivoCompra), false, c.motivoCompra.slice(0, 90));
    assert.ok(/in vendita|dono|non per venderle|costruiscono/i.test(c.motivoCompra), `il motivo dice perché non si compra: ${c.motivoCompra.slice(0, 70)}`);
  }
  // il testo che lo dice già resta com'è; quello che non lo dice prende il davanti
  const dice = condizioneCessione({ non_in_vendita: true });
  assert.equal(dice.motivoCompra, dice.testo, 'il testo predefinito dice già «Non è in vendita»: niente davanti');
  const nonDice = condizioneCessione({ non_in_vendita: true, cessione: { testo: 'I Mutanti le costruiscono per uso personale, non per venderle.' } });
  assert.equal(nonDice.motivoCompra, `Non in vendita. ${nonDice.testo}`, 'un testo che non lo dice prende il davanti');
});
