// Vista giocatori (§3 della specifica; lotti 1 e 4 di docs/battlemap/piano.md): il server manda ai dispositivi dei
// giocatori una copia della scena già filtrata, così le informazioni nascoste non arrivano proprio. Funzione pura,
// condivisa da server e test.
//
// Si tolgono:
//   - i token nascosti dal master e quelli con tutti i Q sotto la nebbia (basta un Q scoperto per vederlo);
//   - i template nascosti e quelli con l'origine sotto la nebbia;
//   - muri e terreno difficile sotto la nebbia (la forma delle stanze non ancora viste);
//   - l'immagine originale (resta la copia ridotta, se c'è), il registro dei movimenti, la pila dell'annulla,
//     la bozza collegata e le date.
// Lotto 4: con il contesto dello scontro ogni token visibile porta solo ciò che serve a disegnarlo (lato, nome,
// iniziali, immagine, quota dei PV, a terra, di turno: niente PV esatti, Stati o schede), e la barra riceve il
// Round e chi è di turno, solo se il suo token è visibile.
// Lotto 6: con lo scontro aperto nel contesto arriva anche la barra dell'Iniziativa (src/mappa/iniziativa.js), solo con
// i partecipanti il cui token si vede (e i PG senza token in mappa).
// La nebbia arriva intera: i giocatori la vedono piena (§5). Limite accettato: i pixel dell'immagine di fondo arrivano
// comunque al dispositivo (decisione 118, ex A.130).
import { daBase64, inBase64, cella, senza } from './celle.js';
import { celleToken, chiaveRif, iniziali } from './token.js';
import { barraIniziativa, barraPerGiocatori } from './iniziativa.js';

/**
 * @param s la scena completa
 * @param contesto null, oppure { pezzi: [pezzo] (src/mappa/partecipanti.js), round: n | null,
 *   immagineDi: (pezzo) → indirizzo dell'immagine per i giocatori | null, scontro?: lo scontro aperto (barra dell'Iniziativa),
 *   bordoDi?: (pezzo) → bordo del token (src/mappa/colori.js) }
 */
export function vistaGiocatori(s, contesto = null) {
  const { colonne, righe } = s.griglia;
  const nebbia = daBase64(s.nebbia.coperti);
  const coperto = (x, y) => cella(nebbia, colonne, righe, x, y);
  const visibile = (t) => celleToken(t).some(([x, y]) => !coperto(x, y));
  const mappa = s.mappa
    ? { file: s.mappa.ridotta ?? s.mappa.file, larghezza: s.mappa.larghezza, altezza: s.mappa.altezza }
    : null;
  const pezzi = new Map((contesto?.pezzi ?? []).map((p) => [p.chiave, p]));
  const info = (t) => {
    if (!contesto) return {};
    if (t.rif.tipo === 'segnaposto') return { info: { lato: null, nome: t.nome, iniziali: iniziali(t.nome), immagine: null, pv: null, aZero: false, diTurno: false } };
    const p = pezzi.get(chiaveRif(t.rif));
    if (!p) return { info: null };
    // 07/10: la barretta dei PV dei PG (e degli alleati) sempre; dei nemici solo con scena.pvNemiciGiocatori
    const pvVisibile = p.lato !== 'avversario' || s.pvNemiciGiocatori === true;
    const quota = pvVisibile && p.pv?.massimo > 0 ? Math.max(0, Math.min(1, Math.round((p.pv.attuali / p.pv.massimo) * 20) / 20)) : null;
    return { info: { lato: p.lato, nome: p.nome, iniziali: p.iniziali, immagine: contesto.immagineDi?.(p) ?? null, pv: quota, aZero: !!p.aZero, diTurno: !!p.diTurno, bordo: contesto.bordoDi?.(p) ?? null } };
  };
  const token = s.token.filter((t) => !t.nascosto && visibile(t)).map(({ nascosto, ...t }) => ({ ...t, ...info(t) }));
  const vista = {
    formato: s.formato,
    versione: s.versione,
    vista: 'giocatori',
    id: s.id,
    nome: s.nome,
    revisione: s.revisione,
    mappa,
    griglia: { ...s.griglia },
    muri: inBase64(senza(daBase64(s.muri), nebbia)),
    terreno: inBase64(senza(daBase64(s.terreno), nebbia)),
    nebbia: { coperti: s.nebbia.coperti },
    token,
    template: s.template.filter((t) => !t.nascosto && !coperto(t.origine[0], t.origine[1])).map(({ nascosto, ...t }) => t),
    collegamento: { scontro: s.collegamento?.scontro ?? null },
  };
  if (contesto) {
    // chi è di turno: un partecipante (non il veicolo che si muove con lui), e solo se il suo token si vede; altrimenti
    // nessun nome (nemmeno «qualcuno di nascosto»: anche questo sarebbe un'informazione)
    const diTurno = token.find((t) => t.info?.diTurno && t.rif.tipo === 'partecipante');
    vista.turno = { round: contesto.round ?? null, nome: diTurno?.info.nome ?? null };
    if (contesto.scontro) {
      const visibili = new Set(token.filter((t) => t.rif.tipo === 'partecipante').map((t) => chiaveRif(t.rif)));
      const immagini = new Map(token.filter((t) => t.info).map((t) => [chiaveRif(t.rif), t.info.immagine]));
      const immagineDi = (k) => (immagini.has(k) ? immagini.get(k) : pezzi.has(k) ? contesto.immagineDi?.(pezzi.get(k)) ?? null : null);
      // ZoC (07/10): gli Attacchi di Opportunità segnalati in questo Round, solo con l'avversario visibile
      vista.opportunita = (contesto.scontro.registro ?? [])
        .filter((r) => r.opportunita && r.round === contesto.scontro.round && visibili.has(chiaveRif({ tipo: 'partecipante', id: r.opportunita.da })))
        .slice(-5).map((r) => ({ ora: r.ora, testo: r.testo.replace(/^Mappa: /, '') }));
      // 07/10: la barretta dei PV sui mini-token, con le stesse regole dei token (quota già filtrata nell'info)
      const quote = new Map(token.filter((t) => t.info).map((t) => [chiaveRif(t.rif), t.info.pv]));
      const pvDi = (k) => {
        if (quote.has(k)) return quote.get(k);
        const p = pezzi.get(k);
        return p && p.lato !== 'avversario' && p.pv?.massimo > 0 ? Math.max(0, Math.min(1, Math.round((p.pv.attuali / p.pv.massimo) * 20) / 20)) : null;
      };
      vista.iniziativa = barraPerGiocatori(barraIniziativa({ scontro: contesto.scontro, pezzi: contesto.pezzi, scena: s, bordoDi: contesto.bordoDi }), visibili, immagineDi, pvDi);
    }
  }
  return vista;
}
