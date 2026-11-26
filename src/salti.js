// Lotto 255, parte B — **i Salti ordinari a fasce di Atletica** (Giocatore 0.69 §5.2.8, Direttore 0.53 §9.10,
// blocco E&L del 24/11/2026 approvato da Davide).
//
// Quello che Davide chiede alla scheda è preciso: «mostrare i quattro valori di salto già ricavati dalla fascia nelle
// regole di movimento». Quindi **quattro numeri letti, non un calcolatore**: qui si ricava la fascia dal VA e si
// restituiscono i quattro valori, più i Q di Movimento che il salto consuma. Niente Prove, niente tiri, niente
// applicazione sulla mappa: l'app mostra, il Direttore decide quando una Prova serve.
//
// Le tre cose da non sbagliare, tutte e tre scritte nel manuale:
//
//   1. **la fascia si legge sul VA personale, prima dei modificatori alla Prova** — «bonus e penalità alla Prova non
//      cambiano la fascia della tabella». Quindi `fasciaSalto` prende il VA personale e non quello effettivo del
//      tavolo, e il chiamante passa quello giusto;
//   2. **«saltare 1 Q» è scavalcare un Q vuoto e atterrare nel successivo** (chiarimento esplicito di Davide): i Q di
//      Movimento spesi sono i Q vuoti **più uno**, e con la rincorsa anche i 2 Q della rincorsa;
//   3. **rincorsa e arrivo consumano il Movimento della stessa AzM**: non c'è movimento aggiuntivo. L'esempio del
//      manuale, che è il metro di questo file: Atletica 18 → da fermo 2 Q vuoti o 1,5 m; con rincorsa 4 Q vuoti o
//      3 m; e il lungo massimo con rincorsa richiede **7 Q** di Movimento, 2 di rincorsa e 5 dallo stacco all'arrivo.
//
// I numeri stanno in `data/regole.json` → `salti` (letti dalla tabella del manuale da tools/lotti/lotto_255_salti.mjs).

const lista = (x) => (Array.isArray(x) ? x : []);

/**
 * La fascia di un VA di Atletica e i suoi quattro valori.
 *
 * Oltre l'ultima fascia della tabella si applica la formula dichiarata nei dati (`oltre_la_tabella`): ogni ulteriore
 * fascia di 10 punti aggiunge 1 Q vuoto e 50 cm ai valori da fermo, e quelli con rincorsa restano doppi. Sotto la
 * prima fascia (VA 0 o assente) non c'è salto da mostrare: torna null, e il chiamante non inventa una riga.
 *
 * @param va il VA **personale** di Atletica, prima dei modificatori alla Prova
 * @returns {{ da, a, oltre, lungoFermoQ, lungoRincorsaQ, altoFermoCm, altoRincorsaCm }} oppure null
 */
export function fasciaSalto(va, regole) {
  const s = regole?.salti;
  const fasce = lista(s?.fasce);
  if (!fasce.length || !Number.isFinite(va) || va < (fasce[0]?.da ?? 1)) return null;
  const dentro = fasce.find((f) => va >= f.da && va <= f.a);
  if (dentro) {
    return {
      da: dentro.da, a: dentro.a, oltre: 0,
      lungoFermoQ: dentro.lungo_fermo_q, lungoRincorsaQ: dentro.lungo_rincorsa_q,
      altoFermoCm: dentro.alto_fermo_cm, altoRincorsaCm: dentro.alto_rincorsa_cm,
    };
  }
  // oltre la tabella: la formula, dichiarata nei dati
  const ultima = fasce[fasce.length - 1];
  const o = s?.oltre_la_tabella;
  if (!o || !Number.isFinite(o.ogni_punti) || o.ogni_punti <= 0) return null;
  const passi = Math.floor((va - ultima.a - 1) / o.ogni_punti) + 1;
  const lungo = ultima.lungo_fermo_q + passi * (o.lungo_q ?? 0);
  const alto = ultima.alto_fermo_cm + passi * (o.alto_cm ?? 0);
  return {
    da: ultima.a + 1 + (passi - 1) * o.ogni_punti, a: ultima.a + passi * o.ogni_punti, oltre: passi,
    lungoFermoQ: lungo, lungoRincorsaQ: lungo * 2, altoFermoCm: alto, altoRincorsaCm: alto * 2,
  };
}

/** L'altezza come si legge: 50 cm, 1 m, 1,5 m. */
export function testoAltezza(cm) {
  if (!Number.isFinite(cm)) return null;
  if (cm < 100) return `${cm} cm`;
  const m = cm / 100;
  return `${String(m).replace('.', ',')} m`;
}

/** I Q vuoti come si leggono: «Q adiacente» quando non se ne scavalca nessuno. */
export function testoLungo(q, regole) {
  if (!Number.isFinite(q)) return null;
  if (q <= 0) return regole?.salti?.testo_zero ?? 'Q adiacente';
  return `${q} Q vuoti`.replace(/^1 Q vuoti$/, '1 Q vuoto');
}

/**
 * I Q di Movimento che un salto in lungo consuma: i Q vuoti scavalcati **più il Q di atterraggio**, e con la rincorsa
 * anche i suoi Q. È il conto dell'esempio del manuale: Atletica 18 con rincorsa → 2 + (4 + 1) = 7 Q.
 */
export function movimentoDelSalto(f, { rincorsa = false, regole } = {}) {
  if (!f) return null;
  const atterraggio = regole?.salti?.movimento?.atterraggio_q ?? 1;
  const q = rincorsa ? f.lungoRincorsaQ : f.lungoFermoQ;
  if (!Number.isFinite(q)) return null;
  const rinc = rincorsa ? (regole?.salti?.rincorsa?.q_minimi ?? 2) : 0;
  // «Q adiacente»: non si scavalca niente, si entra nel Q accanto
  return rinc + (q > 0 ? q + atterraggio : atterraggio);
}

/**
 * I quattro valori di salto di un personaggio, pronti da mostrare, con i Q di Movimento che richiedono e il motivo
 * quando non si possono spendere. **Non** dice se la Prova serve: lo decide il Direttore (§5.2.8).
 *
 * @param vaAtletica il VA personale di Atletica (prima dei modificatori alla Prova)
 * @param movimento  i Q di Movimento disponibili per modalità ({ passo, corsa, scatto }), per la riga «richiede N Q»
 */
export function vistaSalti(vaAtletica, regole, movimento = null) {
  const f = fasciaSalto(vaAtletica, regole);
  if (!f) return null;
  const q = {
    fermo: movimentoDelSalto(f, { regole }),
    rincorsa: movimentoDelSalto(f, { rincorsa: true, regole }),
  };
  const massimo = Math.max(...['passo', 'corsa', 'scatto'].map((k) => movimento?.[k] ?? 0).filter((x) => Number.isFinite(x)), 0);
  const r = regole?.salti?.rincorsa ?? {};
  return {
    va: vaAtletica,
    fascia: `${f.da}–${f.a}`,
    oltreLaTabella: f.oltre > 0,
    lungoFermo: testoLungo(f.lungoFermoQ, regole),
    lungoRincorsa: testoLungo(f.lungoRincorsaQ, regole),
    altoFermo: testoAltezza(f.altoFermoCm),
    altoRincorsa: testoAltezza(f.altoRincorsaCm),
    qFermo: q.fermo,
    qRincorsa: q.rincorsa,
    // avvisi, non divieti: il movimento è del Direttore e del tavolo
    bastaIlMovimento: massimo ? { fermo: q.fermo <= massimo, rincorsa: q.rincorsa <= massimo, massimo } : null,
    rincorsa: { qMinimi: r.q_minimi ?? null, metri: r.metri ?? null, serveCorsa: r.serve_corsa === true },
    nota: regole?.salti?.al_tavolo ?? null,
    paragrafo: regole?.salti?.paragrafo ?? '§5.2.8',
  };
}
