import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 224 — la prova generale della serata del 23/11, rifatta sull'app di oggi (221 e 223 l'avevano cambiata sotto).
// Qui restano i tre controlli che, se un giorno si rompono, fermano la serata:
//   1. una concessione del Direttore NON cambia i PX (A.286: autorizza il passaggio, non lo paga);
//   2. «Sali al livello» non resta spento quando il PG ha la concessione e tutte le scelte fatte (il caso di Michele,
//      che il 23 sarà il primo tocco della serata: una Specializzazione del 1° livello ancora da scegliere);
//   3. la ricerca nella scheda trova un oggetto anche col nome di prima (il guasto trovato dalla prova: dopo il 223
//      l'Elmetto Recon ASA non si trovava più cercando «Elmetto ASA Recon», il nome che Davide ha in testa).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { datiReali, copia } from './helpers.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaSchedaPersonaggio, postiTalenti } from '../src/avanzamento.js';
import { calcolaScheda } from '../src/calc.js';
import { permessoSalita, TIPO_CONCESSIONE, CHIAVE_CONCESSIONE } from '../src/livello-px.js';
import { nuovaCorrezione, aggiungiCorrezione } from '../src/correzioni-master.js';
import { vociScheda, cercaVoci } from '../src/cerca-scheda.js';

const { dati } = await datiReali();
const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const ESEMPI = new URL('../esempi/', import.meta.url);
const leggi = (dir) => readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'attese.json').map((f) => ({ chi: f, pg: deserializzaPersonaggio(readFileSync(new URL(f, dir), 'utf8')) }));
const tuttiIPersonaggi = () => [...leggi(FIX), ...leggi(ESEMPI)];
const sette = readdirSync(FIX).filter((f) => f.endsWith('.json') && f !== 'attese.json')
  .map((f) => ({ file: f, pg: deserializzaPersonaggio(readFileSync(new URL(f, FIX), 'utf8')) }));

/** Il personaggio come lo legge l'app (le correzioni del master viaggiano dentro le scelte). */
const persona = (pg) => ({ creazione: normalizza(pg.creazione, dati).scelte, livelli: pg.livelli ?? [], sessione: pg.sessione });

test('A.286: la concessione autorizza il passaggio e NON tocca i PX (né il livello)', () => {
  const { pg } = sette[0];
  const p = persona(pg);
  const livello = 1 + p.livelli.length;
  const pxPrima = p.creazione.puntiEsperienza;
  const prima = permessoSalita({ livello, px: pxPrima, atto: 'V', correzioni: p.creazione.correzioniMaster ?? [] }, dati.px_partita);
  assert.equal(prima.ok, false, 'senza i PX il passaggio non è permesso (altrimenti il test non prova niente)');
  assert.match(prima.motivo, /PX/);
  // la riga che scrive «Concedi il passaggio al livello N» (src/ui/app.js → concediLivello)
  const correzioni = aggiungiCorrezione(copia(p.creazione.correzioniMaster ?? []), nuovaCorrezione({
    chiave: CHIAVE_CONCESSIONE, etichetta: `Passaggio al livello ${prima.prossimo} concesso dal Direttore (i PX non cambiano)`,
    tipo: TIPO_CONCESSIONE, motivo: 'prova del lotto 224', livello: prima.prossimo,
  }));
  const dopo = permessoSalita({ livello, px: pxPrima, atto: 'V', correzioni }, dati.px_partita);
  assert.equal(dopo.ok, true, 'con la concessione si può salire');
  // i PX non cambiano: né nelle scelte, né per il conto del permesso
  assert.equal(p.creazione.puntiEsperienza, pxPrima, 'la concessione non tocca i PX del personaggio');
  assert.equal(dopo.px ?? pxPrima, pxPrima);
  assert.equal(1 + p.livelli.length, livello, 'e non fa salire il livello: sale il giocatore, dal suo tablet');
});

test('«Sali al livello» non resta spento quando c’è la concessione e non ci sono scelte in sospeso', () => {
  // Il blocco della scheda (src/ui/app.js → motivoNoSalita) ha quattro ragioni, in ordine: creazione incompleta, posti
  // dei Talenti da scegliere, errori dei livelli, PX. La serata del 23 le incontra tutte: Michele chiude il suo posto,
  // Davide concede, e il pulsante si deve accendere. Qui si rifà lo stesso conto sui personaggi del repo.
  const ePostoVuoto = (e) => e.tipo === 'incompleto' && /talent|specializ|maestr/i.test(`${e.campo ?? ''} ${e.messaggio ?? ''}`);
  const motivoNoSalita = (p, permesso) => {
    const scheda = calcolaSchedaPersonaggio(p, dati);
    if ((scheda.errori ?? []).some(ePostoVuoto)) return 'posti da scegliere';
    return permesso.ok ? null : permesso.motivo;
  };
  let provati = 0;
  for (const { chi, pg } of tuttiIPersonaggi()) {
    const p = persona(pg);
    const livello = 1 + p.livelli.length;
    const px = p.creazione.puntiEsperienza;
    const senza = permessoSalita({ livello, px, atto: 'V', correzioni: p.creazione.correzioniMaster ?? [] }, dati.px_partita);
    if (senza.ok) continue; // chi ha già i PX non prova niente: la concessione non gli serve
    provati++;
    assert.match(motivoNoSalita(p, senza) ?? '', /PX|posti/, `${chi}: senza PX e senza concessione qualcosa deve bloccare`);
    const correzioni = aggiungiCorrezione(copia(p.creazione.correzioniMaster ?? []), nuovaCorrezione({
      chiave: CHIAVE_CONCESSIONE, etichetta: 'Passaggio concesso dal Direttore', tipo: TIPO_CONCESSIONE, motivo: 'prova 224', livello: senza.prossimo,
    }));
    const con = permessoSalita({ livello, px, atto: 'V', correzioni }, dati.px_partita);
    assert.equal(con.ok, true, `${chi}: la concessione deve togliere il blocco dei PX`);
    assert.equal(motivoNoSalita(p, con), null, `${chi}: con la concessione e nessuna scelta in sospeso «Sali al livello» non deve restare spento`);
  }
  assert.ok(provati >= 5, `servono personaggi senza i PX del livello dopo (provati ${provati})`);
});

test('la ricerca nella scheda trova un oggetto anche col nome di prima (nomi_alternativi del catalogo)', () => {
  const { pg } = sette.find((x) => /MICHELE|BOTHA|OSHI/i.test(x.file)) ?? sette[0];
  const p = persona(pg);
  const scheda = calcolaSchedaPersonaggio(p, dati);
  const voci = vociScheda(scheda, pg.sessione ?? {}, dati);
  const elmetto = (scheda.equipaggiamento?.oggetti ?? []).find((o) => /Elmetto Recon ASA/.test(o.nome));
  assert.ok(elmetto, 'il PG ha l’Elmetto Recon ASA (il caso che la serata incontra)');
  assert.ok((elmetto.def?.nomi_alternativi ?? []).includes('Elmetto ASA Recon'), 'il catalogo dichiara il nome di prima');
  for (const q of ['Elmetto Recon ASA', 'Elmetto ASA Recon', 'ASA Recon']) {
    const trovati = cercaVoci(voci, q).map((v) => v.nome);
    assert.ok(trovati.includes('Elmetto Recon ASA'), `cercando «${q}» l’elmetto deve comparire (trovati: ${trovati.slice(0, 3).join(', ') || 'niente'})`);
  }
  // e la ricerca non diventa un setaccio: una parola che non c'è non trova l'elmetto
  assert.ok(!cercaVoci(voci, 'balestra lunare').some((v) => v.nome === 'Elmetto Recon ASA'));
});

test('dopo l’adeguamento la creazione NON risulta incompleta: il totale dei punti liberi lo ha deciso il Direttore', () => {
  // Il guasto trovato dalla prova generale: l'adeguamento (§8.3.1) azzera i punti liberi di tutti gli eventi e li fa
  // riassegnare sull'ultimo, quindi la creazione resta con 0 punti su 7. `calcolaScheda` della sola creazione non
  // guardava `scelte.puntiDirettore` (che il lotto 165 ha messo proprio per questo) e la dava incompleta: tutti e
  // sette, dopo la serata, avevano «Sali al livello» spento con «Completa la creazione prima di salire di livello».
  const { pg } = sette[0];
  const base = normalizza(pg.creazione, dati).scelte;
  assert.equal(calcolaScheda(base, dati).completa, true, 'il personaggio di partenza è completo');
  const azzerata = copia(base);
  azzerata.puntiAbilitaLiberi = {};
  const senzaDirettore = calcolaScheda(azzerata, dati);
  assert.equal(senzaDirettore.completa, false, 'senza punti e senza il totale del Direttore è incompleta: giusto');
  assert.ok((senzaDirettore.errori ?? []).some((e) => e.campo === 'puntiAbilitaLiberi' && e.tipo === 'incompleto'));
  // come la lascia l'adeguamento: i punti sono 0 perché il Direttore ha deciso che quell'evento ne ha 0
  azzerata.puntiDirettore = { quando: '2026-11-19T07:11:26.220Z', motivo: 'Adeguamento straordinario delle Abilità (§8.3.1)', totale: 0, adeguamento: true };
  const conDirettore = calcolaScheda(azzerata, dati);
  assert.equal(conDirettore.completa, true, 'col totale deciso dal Direttore la creazione è completa');
  assert.ok(!(conDirettore.errori ?? []).some((e) => e.campo === 'puntiAbilitaLiberi'), 'e non resta nessun errore sui punti liberi');
  // e un totale diverso da zero vale come previsto: 3 punti su 3 è completo, 2 su 3 no
  const tre = copia(azzerata);
  tre.puntiDirettore = { ...tre.puntiDirettore, totale: 3 };
  tre.puntiAbilitaLiberi = { Percezione: 1, Cultura: 1, Atletica: 1 };
  assert.ok(!(calcolaScheda(tre, dati).errori ?? []).some((e) => e.campo === 'puntiAbilitaLiberi' && e.tipo === 'incompleto'), '3 su 3 non è incompleto');
  tre.puntiAbilitaLiberi = { Percezione: 1, Cultura: 1 };
  assert.ok((calcolaScheda(tre, dati).errori ?? []).some((e) => e.campo === 'puntiAbilitaLiberi' && e.tipo === 'incompleto'), '2 su 3 resta incompleto');
});
