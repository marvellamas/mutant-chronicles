// Tecniche Interiori al tavolo: «Attiva» nella tab Poteri (Giocatore §8.9, §8.9.1; regole dei dati in
// tecniche_interiori.json → attivazione, costi e durate nelle schede). Funzioni pure.
//
// Regole comuni (§8.9.1), applicate qui e non nell'interfaccia:
// - il costo si paga solo con i PM personali (le batterie e le riserve di Chroma non pagano);
// - una sola attivazione per Round, reazioni comprese: il Round è il contatore della sessione
//   (`sessione.round`, avanzato a mano con «Nuovo Round»);
// - le durate in Round vanno dal Round R di attivazione alla fine del Round R + N; quelle in minuti,
//   ore o «fino all'interruzione» restano attive finché il giocatore non le termina; le istantanee
//   non restano attive (contano solo per il limite di una per Round);
// - se la riserva resta a 0 PM dopo l'azione, Svenuto (`attivazione.stato_a_zero_pm`) fino al
//   recupero di almeno 1 PM; con PM insufficienti la Tecnica non si attiva;
// - a Umanità 0 niente Tecniche dipendenti da Risorse Interiori (Giocatore §5.21);
// - nessuna Prova di Potere, salvo le eccezioni (Silenzio Mentale: promemoria, la PS è al tavolo).
// Sessione: round (≥ 1), ultimaTecnica { id, round } | null, tecnicheAttive [{ id, dal, al, opzione? }]
// (al = ultimo Round in cui vale; null = finché non la si termina). «Annulla» è quello della
// sessione (l'ultima modifica): l'attivazione è una modifica sola.
//
// Effetti (tecniche_interiori.json → effetti, scritti da tools/effetti_tecniche.mjs): finché la Tecnica
// è in corso, i suoi «valori» entrano nei valori effettivi come quelli dei Talenti (src/condizioni.js),
// con la provenienza «Tecnica: Nome (fino al Round N)»; «attacco» lo legge «Attacca!» (src/attacco.js).
// Le istantanee restano in corso fino alla fine del Round di attivazione: è la finestra in cui
// «Attacca!» ne usa l'effetto (un colpo, una reazione); si possono terminare prima a mano.
// L'interruttore «Bonus dei Talenti» non le spegne: sono attivazioni pagate, non Talenti passivi.

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const ARTICOLI_SCUOLE = { Sole: 'del Sole', Luna: 'della Luna', Terra: 'della Terra' };

/** Gruppo di una Tecnica (§8.9.2–8.9.4): titolo della sezione ed etichetta breve. */
export function gruppoTecnica(gruppo) {
  if (gruppo === 'generica') return { titolo: 'Tecniche generiche (§8.9.2)', etichetta: 'Generica' };
  if (gruppo === 'lottatore') return { titolo: 'Tecniche del Lottatore (§8.9.4)', etichetta: 'Lottatore' };
  const s = String(gruppo).replace(/^scuola:/, '');
  const nome = `Scuola ${ARTICOLI_SCUOLE[s] ?? s}`;
  return { titolo: `${nome} (§8.9.3)`, etichetta: nome };
}

/** Ordine dei gruppi come nel manuale: generiche, Scuole, Lottatore. */
export const ordineGruppo = (g) => (g === 'generica' ? 0 : g === 'lottatore' ? 2 : 1);

/** Il personaggio ha accesso alle Tecniche (Risorse Interiori, come Talento Libero o di Classe). */
export const haRisorseInteriori = (scheda) => (scheda?.tecnicheAmmesse ?? 0) > 0 || (scheda?.tecniche?.length ?? 0) > 0;

/** Scheda di una Tecnica del catalogo. */
export const tecnicaDi = (id, dati) => dati.tecniche_interiori?.tecniche?.find((t) => t.id === id) ?? null;

/** Costo in PM: fisso, oppure quello dell'opzione scelta (Imposizione della Mano Curativa). */
export function costoTecnica(t, opzione = 0) {
  if (Array.isArray(t?.opzioni_costo)) return t.opzioni_costo[opzione]?.pm ?? t.opzioni_costo[0]?.pm ?? 0;
  return Number.isInteger(t?.costo_pm) ? t.costo_pm : 0;
}

/** Round attuale della sessione (≥ 1). */
export const roundAttuale = (sessione) => (Number.isInteger(sessione?.round) && sessione.round >= 1 ? sessione.round : 1);

/**
 * Ultimo Round in cui vale una durata di N Round iniziata nel Round `dal`: alla fine del Round R + N, il Round
 * dell'attivazione non conta (regole.json → durate_round; Giocatore §8.9.1, §5.18).
 */
export function fineDurata(dal, n, dati) {
  const conta = dati?.regole?.durate_round?.round_attivazione_conta === true;
  return dal + n - (conta ? 1 : 0);
}

/** Ultimo Round in cui vale una Tecnica attivata nel Round `dal` (null: finché non la si termina). */
export function fineTecnica(t, dal, dati = null) {
  if (t.durata_tipo === 'round') return fineDurata(dal, t.durata_round ?? 0, dati);
  return null;
}

/** Testo della durata di una Tecnica attiva: «fino alla fine del Round 5» o la durata della scheda. */
export function testoFine(t, attiva) {
  return attiva.al === null ? `${t.durata} (si termina a mano)` : `fino alla fine del Round ${attiva.al}`;
}

/**
 * Si può attivare la Tecnica ora? { possibile, motivo, costo, pm, pmDopo, svenimento, conferma,
 * potere, avvisi }. `motivo` blocca; `conferma` chiede una conferma esplicita (la riserva resta a 0).
 * @param scheda calcolaScheda con la sessione (tecniche, umanita, pm)
 * @param opz { opzione: indice di opzioni_costo, silenzioMentale: il personaggio è sotto Silenzio Mentale }
 */
export function statoAttivazione(scheda, sessione, t, dati, { opzione = 0, silenzioMentale = false } = {}) {
  const A = dati.tecniche_interiori?.attivazione ?? {};
  const costo = costoTecnica(t, opzione);
  const pm = Number.isInteger(sessione?.pmAttuali) ? sessione.pmAttuali : (scheda?.pm ?? 0);
  const round = roundAttuale(sessione);
  const pmDopo = pm - costo;
  const avvisi = [];
  let motivo = null;
  if (!(scheda?.tecniche ?? []).some((x) => x.id === t.id)) motivo = 'Tecnica non appresa';
  // Giocatore §5.21, §8.9.1: a Umanità 0 niente Risorse Interiori
  else if (scheda?.umanita && scheda.umanita.risorseInteriori === false) motivo = `Umanità ${scheda.umanita.valore}: le Tecniche dipendenti da Risorse Interiori non sono utilizzabili (§8.9.1, §5.21)`;
  else if (A.una_per_round !== false && sessione?.ultimaTecnica?.round === round) {
    const prima = tecnicaDi(sessione.ultimaTecnica.id, dati)?.nome ?? sessione.ultimaTecnica.id;
    motivo = `già attivata una Tecnica in questo Round (${prima}): una sola per Round, reazioni comprese (§8.9.1). «Nuovo Round» per la prossima`;
  } else if (pmDopo < 0) motivo = `PM personali insufficienti: servono ${costo}, ne hai ${pm}. Si usano solo i PM personali, non le batterie né le riserve di Chroma (§8.9.1)`;
  const svenimento = !motivo && costo > 0 && pmDopo === 0;
  if (svenimento) avvisi.push('La riserva resterà a 0 PM: dopo l’azione il personaggio è Svenuto fino al recupero di almeno 1 PM (§8.9.1).');
  const potere = silenzioMentale && A.silenzio_mentale
    ? `Sotto Silenzio Mentale: ${A.silenzio_mentale.testo} (${A.silenzio_mentale.fonte}). La PS si risolve al tavolo.`
    : 'Nessuna Prova di Potere (§8.9.1).';
  return { possibile: !motivo, motivo, costo, pm, pmDopo, round, svenimento, conferma: svenimento, potere, avvisi };
}

/**
 * Sessione dopo l'attivazione: PM personali scalati, Tecnica registrata per il limite del Round,
 * effetto attivo con la sua durata, Svenuto se la riserva resta a 0. null se non si può attivare.
 * La sessione va poi riportata nei limiti dal chiamante (modificaSessione in src/sessione.js).
 */
export function attivaTecnica(scheda, sessione, t, dati, opz = {}) {
  const st = statoAttivazione(scheda, sessione, t, dati, opz);
  if (!st.possibile) return null;
  const round = st.round;
  const attive = (Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : []).filter((x) => x.id !== t.id);
  // più applicazioni della stessa Tecnica non si sommano: la nuova sostituisce quella in corso.
  // Le istantanee restano in corso fino alla fine del Round (la finestra del colpo o della reazione)
  const cura = curaTecnica(scheda, sessione, t, opz.opzione ?? 0, dati, opz.cura);
  if (cura && !cura.pronto) return null;
  const al = cura?.al ?? fineTecnica(t, round, dati) ?? (t.durata_tipo === 'istantanea' ? round : null);
  attive.push({ id: t.id, dal: round, al, ...(Array.isArray(t.opzioni_costo) ? { opzione: opz.opzione ?? 0 } : {}) });
  const stato = dati.tecniche_interiori?.attivazione?.stato_a_zero_pm;
  const dopo = cura?.applica ? cura.applica(sessione) : sessione;
  const stati = Array.isArray(dopo?.statiAttivi) ? dopo.statiAttivi : [];
  return {
    ...dopo,
    pmAttuali: st.pmDopo,
    ultimaTecnica: { id: t.id, round },
    tecnicheAttive: attive,
    ...(st.svenimento && stato && !stati.includes(stato) ? { statiAttivi: [...stati, stato] } : {}),
  };
}

/** «Nuovo Round»: il contatore avanza e le Tecniche finite nel Round appena chiuso scadono. */
export function nuovoRound(sessione) {
  const round = roundAttuale(sessione) + 1;
  const attive = Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : [];
  return { ...sessione, round, tecnicheAttive: attive.filter((x) => x.al === null || x.al >= round) };
}

/** Tecniche che scadono passando al Round successivo (per l'avviso del pulsante). */
export function inScadenza(sessione) {
  const r = roundAttuale(sessione);
  return (Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : []).filter((x) => x.al !== null && x.al < r + 1);
}

/** Termina a mano una Tecnica attiva (durate in minuti, ore, fino all'interruzione). */
export function terminaTecnica(sessione, id) {
  const attive = Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : [];
  return { ...sessione, tecnicheAttive: attive.filter((x) => x.id !== id) };
}

/** Tecniche attive ripulite: Tecniche apprese, Round coerenti, una per id. */
export function allineaTecnicheAttive(v, idAmmessi = null) {
  const visti = new Set();
  return (Array.isArray(v) ? v : []).filter((x) => isOggetto(x) && typeof x.id === 'string' && Number.isInteger(x.dal) && x.dal >= 1
    && (x.al === null || (Number.isInteger(x.al) && x.al >= x.dal)) && (!idAmmessi || idAmmessi.includes(x.id)) && !visti.has(x.id) && visti.add(x.id))
    .map((x) => ({ id: x.id, dal: x.dal, al: x.al, ...(Number.isInteger(x.opzione) ? { opzione: x.opzione } : {}) }));
}

/** Chiavi «tecnica:<id>» delle Tecniche attive, per gli effetti al tavolo (AR di Aura e Pelle, A.48). */
export const chiaviTecnicheAttive = (sessione) => (Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : []).map((x) => `tecnica:${x.id}`);

/** Provenienza di una Tecnica in corso: «Tecnica: Aura di Resistenza (fino al Round 4)». */
export const etichettaInCorso = (t, x) => `Tecnica: ${t.nome} (${x.al === null ? 'finché è attiva' : `fino al Round ${x.al}`})`;

/** Tecniche in corso (sessione → tecnicheAttive), con la scheda e l'etichetta: [{ id, dal, al, opzione?, t, etichetta }]. */
export function tecnicheInCorso(sessione, dati) {
  return (Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : []).map((x) => {
    const t = tecnicaDi(x.id, dati);
    return t ? { ...x, t, etichetta: etichettaInCorso(t, x) } : null;
  }).filter(Boolean);
}

/**
 * Effetti delle Tecniche in corso, nello schema degli effetti dei Talenti (docs/effetti-oggetti.md):
 * [{ chiave: 'tecnica:<id>', talento: etichetta, tecnica: true, ...effetto }]. Valgono anche con
 * «Bonus dei Talenti» spento (src/condizioni.js).
 */
export function effettiTecniche(sessione, dati) {
  return tecnicheInCorso(sessione, dati).flatMap((c) => (c.t.effetti?.valori ?? [])
    .map((e) => ({ chiave: `tecnica:${c.id}`, talento: c.etichetta, tecnica: true, ...e, fonte: e.fonte ?? `${c.t.effetti.fonte ?? 'Giocatore §8.9'}, ${c.t.nome}` })));
}

/** Tecniche in corso con un effetto sull'attacco, per «Attacca!»: [{ id, nome, etichetta, breve, e }]. */
export function tecnicheAttacco(sessione, dati) {
  return tecnicheInCorso(sessione, dati).filter((c) => c.t.effetti?.attacco)
    .map((c) => ({ id: c.id, nome: c.t.nome, etichetta: c.etichetta, breve: c.t.effetti.breve ?? null, e: c.t.effetti.attacco }));
}

/** La Tecnica vale con quest'arma? Senz'armi, armi ravvicinate o le armi nominate dalla scheda (Cobra, Vipera). */
export function mezzoAmmesso(e, arma) {
  if (!e.mezzi && !e.armi) return true;
  if (arma?.senzArmi) return (e.mezzi ?? []).includes('senz_armi');
  if ((e.mezzi ?? []).includes('ravvicinate') && arma?.tipo === 'arma_ravvicinata') return true;
  const nome = String(arma?.nome ?? '').toLowerCase();
  return (e.armi ?? []).some((a) => nome === a.toLowerCase() || nome.startsWith(`${a.toLowerCase()} `));
}

/** Riduzione calcolata (Corpo Infrangibile): «1d4 + 2 (Mod COS), minimo 1». */
export function testoRiduzione(e, scheda) {
  const mod = scheda?.caratteristiche?.[e.caratteristica]?.mod ?? 0;
  return `${e.dado} ${mod < 0 ? '−' : '+'} ${Math.abs(mod)} (Mod ${e.caratteristica}), minimo ${e.minimo}`;
}

/**
 * Righe di una Tecnica in corso (riquadro delle Tecniche attive, «Attacca!»): riduzioni calcolate,
 * sospensione del Sanguinamento e frasi delle regole che non sono un numero.
 */
export function righeInCorso(c, scheda) {
  const E = c.t.effetti ?? {};
  const righe = [];
  for (const e of (E.valori ?? []).filter((x) => x.tipo === 'riduzione_danno')) righe.push(`Riduce ${e.uso} di ${testoRiduzione(e, scheda)}.`);
  if (E.cura && Number.isInteger(c.opzione) && E.cura[c.opzione]?.effetto === 'sospendi_sanguinamento' && c.al > c.dal) righe.push(`Sanguinamento sospeso fino alla fine del Round ${c.al}.`);
  righe.push(...(E.promemoria ?? []));
  return righe;
}

/** Numero principale in forma breve (SS, riquadro): «+1 AR rav., +2 danno rav., +3 FOR»; null se non ce n'è. */
export const sintesiTecnica = (t) => t?.effetti?.breve ?? null;

const formaDado = (dado) => { const m = /^(\d*)d(\d+)$/.exec(String(dado)); return m ? { n: Number(m[1] || 1), facce: Number(m[2]) } : null; };

/**
 * Cura di Imposizione della Mano Curativa (effetti.cura, in ordine con opzioni_costo; Giocatore
 * §8.9.2), sul proprio personaggio o, per un altro, come promemoria. Nessun tiro: il dado lo tira il
 * giocatore e lo scrive (`cura.dado`). null se la Tecnica non cura.
 * @returns {{ opzione, sul: 'se'|'altro', righe: string[], avvisi: string[], pronto: boolean, al?: number, applica: ((s) => object)|null }}
 */
export function curaTecnica(scheda, sessione, t, opzione, dati, cura = {}) {
  const o = t?.effetti?.cura?.[opzione];
  if (!o) return null;
  const sul = cura?.bersaglio === 'altro' ? 'altro' : 'se';
  const round = roundAttuale(sessione);
  const stati = Array.isArray(sessione?.statiAttivi) ? sessione.statiAttivi : [];
  const sospensione = (x) => x.id === t.id && t.effetti.cura[x.opzione]?.effetto === 'sospendi_sanguinamento';
  const sospeso = (Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : []).some((x) => sospensione(x) && (x.al === null || x.al >= round));
  const sanguina = stati.includes('sanguinamento') && !sospeso;
  const righe = [];
  const avvisi = [];
  let applica = null;
  let al;
  let pronto = true;
  if (o.effetto === 'sospendi_sanguinamento') {
    righe.push(`Sanguinamento sospeso per ${o.round} Round: fino alla fine del Round ${round + o.round}.`);
    if (sul === 'se') al = round + o.round;
    if (sul === 'se' && !stati.includes('sanguinamento')) avvisi.push('Il personaggio non ha il Sanguinamento attivo: la sospensione non ha effetto.');
  } else if (o.effetto === 'arresta_sanguinamento') {
    righe.push('Il Sanguinamento si arresta.');
    if (sul === 'se') {
      if (!stati.includes('sanguinamento')) avvisi.push('Il personaggio non ha il Sanguinamento attivo.');
      applica = (s) => ({ ...s, statiAttivi: (s.statiAttivi ?? []).filter((x) => x !== 'sanguinamento'), tecnicheAttive: (s.tecnicheAttive ?? []).filter((x) => !sospensione(x)) });
    }
  } else if (o.effetto === 'pv') {
    const mod = scheda?.caratteristiche?.[o.caratteristica]?.mod ?? 0;
    const d = formaDado(o.dado);
    const dado = Number.isInteger(cura?.dado) && d && cura.dado >= d.n && cura.dado <= d.n * d.facce ? cura.dado : null;
    const recupero = dado === null ? null : Math.max(o.minimo ?? 0, dado + mod);
    righe.push(`Recupera ${o.dado} ${mod < 0 ? '−' : '+'} ${Math.abs(mod)} (Mod ${o.caratteristica}) PV, minimo ${o.minimo ?? 0}${recupero === null ? '' : `: ${recupero} PV`}.`);
    if (dado === null) { pronto = false; avvisi.push(`Tira ${o.dado} e scrivi il risultato.`); }
    if (sul === 'se') {
      if (sanguina) avvisi.push('Sanguinamento attivo: il recupero non avviene (§8.9.2). Prima arrestalo o sospendilo.');
      const max = scheda?.pv ?? Infinity;
      const ora = Number.isInteger(sessione?.pvAttuali) ? sessione.pvAttuali : max;
      if (recupero !== null && !sanguina) {
        const dopo = Math.min(max, ora + recupero);
        righe.push(`PV ${ora} → ${dopo}${dopo - ora < recupero ? ' (non oltre i PV massimi)' : ''}.`);
        applica = (s) => ({ ...s, pvAttuali: Math.min(max, (Number.isInteger(s.pvAttuali) ? s.pvAttuali : max) + recupero) });
      }
    }
  } else if (o.effetto === 'ferita') {
    righe.push('La Ferita migliora di uno stato; una Superficiale guarisce.');
    if (sul === 'se') {
      const f = Number.isInteger(sessione?.ferite) ? sessione.ferite : 0;
      const nomi = dati.regole.ferite.stati.map((x) => x.nome);
      if (!f) avvisi.push('Il personaggio non ha Ferite.');
      else {
        righe.push(`Ferita ${nomi[f - 1] ?? 'oltre Grave'} → ${f - o.gradini > 0 ? nomi[f - o.gradini - 1] : 'nessuna'}.`);
        applica = (s) => ({ ...s, ferite: Math.max(0, (Number.isInteger(s.ferite) ? s.ferite : 0) - o.gradini) });
      }
    }
  }
  if (sul === 'altro') {
    righe.push('Su un altro personaggio: applica l’effetto sulla sua scheda; qui si scalano solo i tuoi PM.');
    applica = null;
  }
  return { opzione, sul, righe, avvisi, pronto, ...(al !== undefined ? { al } : {}), applica };
}
