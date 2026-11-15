// Le creature senza Ferite, al tavolo (lotto 203, 15/11/2026; Manuale dei Mostri 0.69 §4.2 e §4.2.1).
//
// **Il confine col Morente, che è la cosa da non sbagliare.** Il Morente del lotto 193 vale per i personaggi e per
// chi ha il tracciato delle Ferite. Una creatura del Bestiario **non ce l'ha**: a 0 PV è fuori combattimento e
// **non ha nessun contatore**. Se la plancia le aprisse un contatore, al tavolo qualcuno le conterebbe i Round di
// sopravvivenza — e aspetterebbe una stabilizzazione che non esiste. Per questo la mini-scheda lo dice in chiaro
// invece di limitarsi a non mostrare il contatore: un'assenza non si legge, una frase sì.
//
// **Le due conversioni** (§4.2.1), per un bersaglio che non ha le Ferite:
//   - ogni **Ferita inflitta direttamente** vale −5 PV, ignorando l'Armatura e senza la PS ordinaria delle Ferite;
//   - ogni **stato di Ferita curato o ridotto** vale +5 PV, fino al massimo, e si somma all'eventuale cura dei PV.
//
// **E il +30% non c'entra con nessuna delle due.** Sta nei PV massimi stampati e in nient'altro: «Le cure ordinarie
// dei PV, la rigenerazione e i danni non ricevono l'aumento del 30%». Applicarlo a un danno o a una cura è il
// secondo modo di sbagliare, dopo quello di riapplicarlo ai massimi (lotto 203, parte B).
//
// Tutti i numeri vengono da `data/formato_nemici.json → sistema_salute`: qui non c'è nessuna costante.

const isOggetto = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);

/** Il blocco `sistema_salute` dei dati, o null. */
export const regoleSalute = (dati) => (isOggetto(dati?.formato_nemici?.sistema_salute) ? dati.formato_nemici.sistema_salute : null);

/** Il blocco del comportamento senza Ferite, o null. */
export const regoleSenzaFerite = (dati) => (isOggetto(regoleSalute(dati)?.senza_ferite) ? regoleSalute(dati).senza_ferite : null);

/**
 * Quale sistema di salute usa un profilo: `'solo_PV'` o `'PV_e_Ferite'`.
 *
 * Lo dice il profilo (`sistema_salute`, scritto dal lotto 197 su ogni nemico creato da un modello), e in mancanza
 * il predefinito dei dati. Un nemico salvato prima del lotto 197 non ha il campo: prende il predefinito e **non
 * cambia da sé**, perché i suoi valori viaggiano con lui.
 */
export function sistemaSalute(profilo, dati) {
  const SS = regoleSalute(dati);
  const dichiarato = profilo?.sistema_salute ?? profilo?._bestiario?.sistema_salute ?? null;
  if (dichiarato && SS?.sistemi?.[dichiarato]) return dichiarato;
  return SS?.predefinito ?? 'PV_e_Ferite';
}

/** Il profilo usa le Ferite? */
export const usaFerite = (profilo, dati) => sistemaSalute(profilo, dati) === 'PV_e_Ferite';

/** Il profilo è una creatura senza Ferite? */
export const senzaFerite = (profilo, dati) => !usaFerite(profilo, dati);

/**
 * Una creatura senza Ferite entra in Morente? **No, mai.**
 *
 * È una funzione e non un `if` sparso perché il confine va chiesto in un posto solo: `src/scontro.js` lo chiede
 * prima di aprire un contatore, e la mini-scheda prima di mostrarlo.
 */
export const puoEntrareInMorente = (profilo, dati) => usaFerite(profilo, dati);

/**
 * Che cosa si legge nella mini-scheda di una creatura senza Ferite a 0 PV.
 * @returns {{ fuoriCombattimento, contatore: false, testo, nota }} oppure null se il profilo usa le Ferite
 */
export function statoAZeroPv(profilo, dati) {
  if (usaFerite(profilo, dati)) return null;
  const Z = regoleSenzaFerite(dati)?.a_zero_pv ?? null;
  return {
    fuoriCombattimento: true,
    contatore: false,
    testo: Z?.testo ?? 'Fuori combattimento: non agisce e non usa Difese attive. Nessun contatore di Morente.',
    nota: Z?.nota_morente ?? null,
  };
}

/**
 * La riga che la mini-scheda scrive **sempre** per una creatura senza Ferite, anche sopra 0 PV: dice che non ha il
 * tracciato e che a 0 PV non avrà un contatore. Detta prima, evita la domanda al tavolo.
 */
export function rigaSistemaSalute(profilo, dati) {
  const SS = regoleSalute(dati);
  const quale = sistemaSalute(profilo, dati);
  const s = SS?.sistemi?.[quale] ?? null;
  if (quale === 'PV_e_Ferite') return null;
  return `${s?.nome ?? 'Solo PV'}: niente tracciato delle Ferite, niente penalità da Ferite, nessuna Menomazione automatica. A 0 PV è fuori combattimento e **non ha il contatore di Morente**.`;
}

/**
 * §4.2.1 — una **Ferita inflitta direttamente** a una creatura senza Ferite: −5 PV, ignorando l'Armatura e senza
 * la PS ordinaria per determinare le nuove Ferite. Il danno non porta i PV sotto 0 (§4.2).
 *
 * @param quante quanti stati di Ferita l'effetto infliggerebbe
 * @returns {{ pv, perdita, converso: true, ignoraAr, testo }} oppure null se il profilo usa le Ferite
 */
export function feritaDiretta(profilo, dati, pvAttuali, quante = 1) {
  if (usaFerite(profilo, dati)) return null;
  const R = regoleSenzaFerite(dati)?.ferita_diretta ?? null;
  const per = Number.isInteger(R?.pv) ? R.pv : 5;
  const n = Math.max(0, Math.trunc(quante));
  const sotto = regoleSenzaFerite(dati)?.danno_minimo?.sotto_zero === true;
  const grezzo = (Number.isInteger(pvAttuali) ? pvAttuali : 0) - per * n;
  const pv = sotto ? grezzo : Math.max(0, grezzo);
  return {
    pv,
    perdita: (Number.isInteger(pvAttuali) ? pvAttuali : 0) - pv,
    converso: true,
    ignoraAr: R?.ignora_ar === true,
    testo: n ? `${n} ${n === 1 ? 'Ferita diretta' : 'Ferite dirette'} → −${per * n} PV, ignorando l’AR (§4.2.1).` : 'Nessuna Ferita inflitta.',
  };
}

/**
 * §4.2.1 — ogni **stato di Ferita curato o ridotto** ridà 5 PV, fino al massimo; se lo stesso effetto cura anche
 * PV, i due recuperi **si sommano**. La cura ordinaria dei PV non riceve il +30%, e questa non è una resurrezione.
 *
 * @param opz.pvCurati i PV che l'effetto cura di suo (si sommano)
 * @returns {{ pv, recupero, convertito, testo, contaComeCuraFerite }} oppure null se il profilo usa le Ferite
 */
export function curaFerita(profilo, dati, pvAttuali, pvMassimi, quante = 1, { pvCurati = 0 } = {}) {
  if (usaFerite(profilo, dati)) return null;
  const R = regoleSenzaFerite(dati)?.cura_ferita ?? null;
  const per = Number.isInteger(R?.pv) ? R.pv : 5;
  const n = Math.max(0, Math.trunc(quante));
  const ora = Number.isInteger(pvAttuali) ? pvAttuali : 0;
  const max = Number.isInteger(pvMassimi) ? pvMassimi : ora;
  const convertito = per * n;
  const pv = Math.min(max, ora + convertito + Math.max(0, Math.trunc(pvCurati)));
  return {
    pv,
    recupero: pv - ora,
    convertito,
    // conta come cura di Ferite riuscita **solo** se ha recuperato PV per questa conversione
    contaComeCuraFerite: n > 0 && pv > ora,
    testo: n ? `${n} ${n === 1 ? 'stato di Ferita curato' : 'stati di Ferita curati'} → +${convertito} PV${pvCurati ? ` più i ${pvCurati} dell’effetto` : ''}, fino al massimo (§4.2.1).` : 'Nessuno stato curato.',
  };
}

/**
 * §4.2 — un recupero valido sopra 0 riporta la creatura attiva **al proprio turno successivo**, se è ancora viva.
 * La conversione non resuscita.
 */
export function tornaAttiva(profilo, dati, pvPrima, pvDopo) {
  if (usaFerite(profilo, dati)) return null;
  if (!(pvPrima <= 0 && pvDopo > 0)) return { attiva: pvDopo > 0, testo: null };
  return {
    attiva: false,
    alProssimoTurno: true,
    testo: regoleSenzaFerite(dati)?.ritorno_attivita?.testo ?? 'Sopra 0 PV torna attiva al proprio turno successivo.',
  };
}

/**
 * I testi delle regole portano l'enfasi del manuale fra `**` (Mostri 0.69 §4.2): «**non ha il contatore di
 * Morente**». L'enfasi è un dato della regola e sta nei dati, ma `**` sullo schermo è un difetto, non un grassetto.
 * Qui si divide il testo in pezzi, e la pagina decide come mostrarli.
 * @returns {{ t: string, forte: boolean }[]}
 */
export function pezziGrassetto(testo) {
  const s = String(testo ?? '');
  const fuori = [];
  let i = 0;
  for (const m of s.matchAll(/\*\*(.+?)\*\*/gs)) {
    if (m.index > i) fuori.push({ t: s.slice(i, m.index), forte: false });
    fuori.push({ t: m[1], forte: true });
    i = m.index + m[0].length;
  }
  if (i < s.length) fuori.push({ t: s.slice(i), forte: false });
  return fuori.filter((p) => p.t !== '');
}

/** Lo stesso testo senza i marcatori dell'enfasi: per il registro e per ogni posto che scrive testo e basta. */
export const testoSemplice = (testo) => pezziGrassetto(testo).map((p) => p.t).join('');
