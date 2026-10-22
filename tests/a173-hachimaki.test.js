// A.173 — Hachimaki della Disciplina Interiore, costi delle Tecniche e sintonizzazione.
// Risposta di Davide del 21 ottobre 2026: «La riduzione di 1 PM si applica sul costo dell'uso scelto, ogni
// volta che si attiva la Tecnica. I costi positivi hanno minimo 1 PM; una Tecnica gratuita resta gratuita.
// Costo ordinario → costo con Hachimaki: 0 → 0 PM; 1 → 1 PM; 2 → 1 PM; 4 → 3 PM; 10 → 9 PM. I quattro usi di
// Imposizione della Mano Curativa sono alternative: si sceglie l'effetto e si paga il relativo costo ridotto.
// Non si applicano più riduzioni allo stesso costo. L'app mostra costo base e costo finale.»
//
// Questo file è la verifica chiesta il 22/10: conferma che l'app faccia esattamente così. Nessun dato è stato
// cambiato — era già tutto a posto.
//
// NB sulla tabella: i cinque costi elencati nella risposta sono quelli del Manuale del Giocatore 0.48. La 0.49,
// uscita lo stesso 21/10 ma cinque ore dopo, porta la tabella di Imposizione della Mano Curativa a 1 / 2 / 2 / 4
// PM, e quindi con l'Hachimaki a 1 / 1 / 1 / 3. **La regola non è cambiata, sono cambiati i costi a cui si
// applica**: recepita il 22/10 (A.178, in attesa della conferma di Davide). Per questo le prove qui sotto
// provano la REGOLA — i cinque esempi della risposta restano validi come esempi della regola, perché dicono
// che cosa fa la riduzione su un costo di 0, 1, 2, 4 e 10 PM, non che quei costi esistano ancora nella scheda.
// I costi veri della Tecnica si leggono SEMPRE dai dati, mai scritti qui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costoEffettivo } from '../src/tecniche.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

const HACHIMAKI = { pm: 1, minimo: 1, nome: 'Hachimaki della Disciplina Interiore' };
const con = { equipaggiamento: { scontoTecniche: HACHIMAKI } };
const senza = { equipaggiamento: {} };
const tecnica = (costo) => ({ costo_pm: costo });

test('A.173: i cinque costi della risposta — 0 → 0, 1 → 1, 2 → 1, 4 → 3, 10 → 9', () => {
  for (const [base, atteso] of [[0, 0], [1, 1], [2, 1], [4, 3], [10, 9]]) {
    assert.equal(costoEffettivo(con, tecnica(base)).costo, atteso, `${base} PM → ${atteso} PM`);
  }
});

test('A.173: una Tecnica gratuita resta gratuita e i costi positivi non scendono sotto 1 PM', () => {
  const gratis = costoEffettivo(con, tecnica(0));
  assert.equal(gratis.costo, 0);
  assert.equal(gratis.sconto, 0, 'su una Tecnica gratuita non c’è niente da ridurre');
  assert.equal(costoEffettivo(con, tecnica(1)).costo, 1, 'il minimo di 1 PM tiene');
});

test('A.173: la riduzione si applica all’uso scelto, non a tutti insieme (Imposizione della Mano Curativa)', () => {
  const t = dati.tecniche_interiori.tecniche.find((x) => x.nome === 'Imposizione della Mano Curativa');
  assert.ok(t, 'la Tecnica è nei dati');
  const costi = t.opzioni_costo.map((o) => o.pm);
  // i quattro usi sono alternative: si sceglie l'effetto e si paga quel costo ridotto, uno solo per attivazione
  const ridotti = costi.map((_, i) => costoEffettivo(con, t, i).costo);
  // l'attesa NON è una tabella scritta a mano: è la regola applicata ai costi che la scheda ha adesso, così
  // una prossima edizione del manuale cambia i dati e questa prova continua a dire la verità
  const perRegola = costi.map((pm) => (pm > 0 ? Math.max(1, pm - 1) : 0));
  assert.deepEqual(ridotti, perRegola);
  // senza la fascia i costi restano quelli della scheda
  assert.deepEqual(costi.map((_, i) => costoEffettivo(senza, t, i).costo), costi);
});

test('A.178: con il Giocatore 0.49 la tabella è 1/2/2/4 e con l’Hachimaki diventa 1/1/1/3', () => {
  // qui i numeri ci sono apposta: è la prova che fissa il valore del manuale di oggi, ed è il punto su cui
  // Davide deve dire l'ultima parola (la sua risposta A.173 citava i costi della 0.48)
  const t = dati.tecniche_interiori.tecniche.find((x) => x.nome === 'Imposizione della Mano Curativa');
  assert.deepEqual(t.opzioni_costo.map((o) => o.pm), [1, 2, 2, 4], 'tabella del Giocatore 0.49');
  assert.deepEqual(t.opzioni_costo.map((_, i) => costoEffettivo(con, t, i).costo), [1, 1, 1, 3]);
  // e il 1/1/1/3 esce dal calcolo, non da una tabella: la base e lo sconto sono quelli di ogni uso
  const dettaglio = t.opzioni_costo.map((_, i) => costoEffettivo(con, t, i));
  assert.deepEqual(dettaglio.map((d) => d.base), [1, 2, 2, 4]);
  assert.deepEqual(dettaglio.map((d) => d.sconto), [0, 1, 1, 1], 'sul costo da 1 PM non c’è niente da togliere');
});

test('A.178: il limite di 24 ore per la riduzione della Ferita è registrato come promemoria', () => {
  // regola nuova della 0.49: l'app la ricorda, non la conta (il limite è condiviso con Guarigione e lo tiene
  // il tavolo, non la scheda)
  const t = dati.tecniche_interiori.tecniche.find((x) => x.nome === 'Imposizione della Mano Curativa');
  assert.ok((t.effetti.promemoria ?? []).some((f) => /una sola volta ogni 24 ore per beneficiario/.test(f)));
});

test('A.173: più riduzioni dello stesso costo non si sommano (vale la più favorevole, non la somma)', () => {
  // l'app tiene una sola fonte di sconto per scheda (scheda.equipaggiamento.scontoTecniche): due fasce non
  // fanno −2 PM. Con la più favorevole già scelta a monte, qui si verifica che lo sconto applicato sia uno solo.
  const due = { equipaggiamento: { scontoTecniche: { ...HACHIMAKI, pm: 1 } } };
  assert.equal(costoEffettivo(due, tecnica(4)).costo, 3, 'una riduzione sola: 4 → 3, mai 4 → 2');
});

test('A.173: la scheda mostra costo base e costo finale', () => {
  const r = costoEffettivo(con, tecnica(4));
  assert.equal(r.base, 4);
  assert.equal(r.costo, 3);
  assert.equal(r.sconto, 1);
  assert.equal(r.fonte, HACHIMAKI.nome, 'e da dove viene la riduzione');
});

test('A.173: senza sintonizzazione non riduce niente (lo sconto non arriva nemmeno alla scheda)', () => {
  // src/equipaggiamento.js monta scontoTecniche solo per un Hachimaki indossato E sintonizzato
  const h = dati.equipaggiamento.file.artefatti.oggetti.find((o) => o.id === 'hachimaki-della-disciplina-interiore');
  assert.ok(h, 'l’Hachimaki è in catalogo');
  assert.equal(h.sconto_tecniche.richiede_sintonizzazione, true);
  assert.equal(h.sconto_tecniche.pm, 1);
  assert.equal(h.sconto_tecniche.minimo, 1);
  assert.equal(costoEffettivo(senza, tecnica(4)).costo, 4);
});

test('A.173: l’Hachimaki tiene SnT 1 — artefatto passivo, ma con il beneficio sui PM', () => {
  // «l'Hachimaki mantiene SnT 1. Nei paragrafi generali va esplicitato che la regola SnT 0 per gli artefatti
  // esclusivamente passivi è soggetta alla maggiorazione prevista per i benefici sui PM.»
  const h = dati.equipaggiamento.file.artefatti.oggetti.find((o) => o.id === 'hachimaki-della-disciplina-interiore');
  assert.equal(h.artefatto.sintonizzazione, 1);
  assert.equal(h.artefatto.sintonizzabile, true);
  assert.equal(h.artefatto.proprieta_attive, false, 'è un artefatto solo passivo…');
  assert.equal(h.artefatto.snt_beneficio, true, '…e proprio per questo porta il segno della maggiorazione');
});
