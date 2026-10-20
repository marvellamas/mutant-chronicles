// «Medita» (richiesta del 20/10/2026, dal tavolo del 19/10): il recupero dei PM calcolato secondo il manuale, con il conto in
// chiaro prima di confermare, e — se il giocatore o il Direttore lo scelgono — il versamento diretto in un cristallo con
// la conversione. Funzioni pure. Principio di CLAUDE.md: l'app mostra il conto, il giocatore conferma, il Direttore ha
// l'ultima parola; nessun automatismo a sorpresa e nessun tiro di dado (l'esito della Prova di Potere lo indica chi gioca).
//
// Regole applicate (Manuale della Magia):
// - «Recupero naturale dei Punti Magia»: 0, 1, 2, 3 PM per ora completa e continuativa in Attività pesante, leggera, Riposo
//   breve, Riposo completo (6 ore di sonno = 18 PM); Recupero Mistico +1 PM per ora dove il recupero è consentito (non
//   in Attività pesante); un'interruzione fa perdere la frazione d'ora; non si supera il massimo personale. (regole.json →
//   recupero_pm)
// - «Meditazione»: 3 + Mod SAG PM per ora completa (minimo 3; +2 con Meditazione Migliorata), ore utili al giorno
//   2 + Mod SAG + Mod COS (minimo 1; raddoppiate da Meditazione Estesa); nessuna Prova; fermo e tranquillo, senza
//   esplorare, sorvegliare, ricaricare contenitori o mantenere la Concentrazione; sostituisce il recupero naturale della
//   stessa ora; Recupero Mistico non la aumenta. Valori già calcolati dalla scheda (scheda.magia.meditazione).
// - sez. 6 «Convertire Potere, ricaricare e prelevare»: ricarica riservata all'Addestramento Taumaturgo, con contatto con un
//   contenitore sintonizzato; 1 AzP; ogni gruppo aggiunge 1 PM al contenitore (non oltre la capacità) e costa 3 PM personali
//   (2 con Ricarica Efficiente o Conversione Migliorata, 1 con entrambi; Bianco sempre 2); un gruppo è automatico, due o
//   più richiedono una sola Prova di Potere con penalità per gruppi (regole.json → chroma.conversione.prova_gruppi).
//   Successo: tutti i gruppi; Fallimento: nessuno e nessuna spesa; Magistrale: si può aggiungere un gruppo se riserva e
//   spazio lo consentono; Fallimento Maldestro: nessun PM e perdita del costo di tutti i gruppi. «La ricarica non avviene
//   automaticamente durante il recupero personale»: qui è il giocatore che chiede l'operazione dopo il recupero.
import { rapportoConversione } from './equipaggiamento.js';
import { allineaSessione, modificaSessione } from './sessione.js';

const intero = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.max(0, Math.floor(Number(v))) : d);

function ha(scheda, id) {
  return (scheda?.talentiLiberi ?? []).some((t) => t.id === id);
}

/**
 * Le modalità di recupero: la Meditazione (con i valori della scheda) e le quattro fasi del recupero naturale.
 * [{ id, nome, pmOra, disponibile, motivo, oreGiorno?, dettaglio }]
 */
export function modiMedita(scheda, dati) {
  const rp = dati.regole.recupero_pm;
  const med = scheda?.magia?.meditazione ?? null;
  const mistico = rp.recupero_mistico;
  const conMistico = ha(scheda, mistico.talento) && scheda?.bonusTalenti !== false;
  const nomeMistico = (dati.talenti_liberi?.talenti ?? []).find((t) => t.id === mistico.talento)?.nome ?? 'Recupero Mistico';
  const mm = dati.regole.meditazione;
  const formula = (f) => `${f.fisso} + ${f.caratteristiche.map((c) => `Mod ${c}`).join(' + ')}, minimo ${f.minimo}`;
  return [
    {
      id: 'meditazione', nome: 'Meditazione', pmOra: med?.pmPerOra ?? null, oreGiorno: med?.orePerGiorno ?? null, disponibile: !!med,
      motivo: med ? null : 'serve l’Addestramento Taumaturgo, Recupero Meditativo o una capacità che la conceda (Magia, «Meditazione»)',
      dettaglio: med ? `${med.pmPerOra} PM per ora completa (${formula(mm.pm_per_ora)}; Meditazione Migliorata +2) · ${med.orePerGiorno} ${med.orePerGiorno === 1 ? 'ora utile' : 'ore utili'} al giorno (${formula(mm.ore_al_giorno)}; Meditazione Estesa raddoppia) · nessuna Prova; sostituisce il recupero naturale della stessa ora` : null,
    },
    ...rp.fasi.map((f) => {
      const extra = conMistico && !mistico.escluse.includes(f.id) ? mistico.pm_per_ora : 0;
      return { id: f.id, nome: f.nome, pmOra: f.pm_per_ora + extra, disponibile: true, motivo: null, extra, nomeExtra: extra ? nomeMistico : null,
        dettaglio: `${f.pm_per_ora} PM per ora${extra ? ` + ${extra} ${nomeMistico}` : ''} · ${f.esempi}` };
    }),
  ];
}

/** Penalità alla Prova di Potere per i gruppi dichiarati (chroma.conversione.prova_gruppi): 0 = nessuna Prova (automatico). */
export function provaGruppi(gruppi, dati) {
  const p = dati.regole.chroma.conversione.prova_gruppi;
  if (gruppi <= p.automatici) return { richiesta: false, penalita: 0 };
  const noto = p.penalita[String(gruppi)];
  const massimo = Math.max(...Object.keys(p.penalita).map(Number));
  const penalita = noto !== undefined ? noto : p.penalita[String(massimo)] + (gruppi - massimo) * p.per_gruppo_oltre;
  return { richiesta: true, penalita };
}

/** Perché un contenitore non si ricarica (avviso, non blocco), o null. */
export function motivoRicarica(c, cv) {
  if (!c) return 'contenitore non trovato';
  if (c.scheggia) return 'è una Scheggia instabile: si ricarica con un’altra procedura (Magia §26.5.2)';
  if (c.regoleRimandate) return `Chroma ${c.energia}: gli impieghi energetici sono ancora da definire (Magia sez. 6)`;
  if (!c.trasportato) return 'non è con te: serve il contatto con il contenitore (Magia sez. 6)';
  if (!c.sintonizzato) return 'non è sintonizzato (Magia sez. 6)';
  if (cv && !cv.disponibile) return `la ricarica è riservata all’Addestramento ${cv.addestramento} (Magia sez. 6)`;
  return null;
}

/** Testo della fonte del rapporto: ordinario, Talenti, o fisso del Bianco. */
function fonteRapporto(cv, energia) {
  if (cv.fissi?.[energia]) return `Chroma ${energia}: sempre ${cv.fissi[energia]}:1 (Magia sez. 6)`;
  if (cv.talenti.length) return `${cv.talenti.join(' e ')}: da ${cv.rapporto === 1 ? '3:1 a 1:1' : '3:1 a 2:1'} (Magia sez. 6)`;
  return 'rapporto ordinario 3:1 (Magia sez. 6)';
}

/**
 * Il conto di «Medita», prima di confermare.
 * @param ctx { scheda, sessione, massimi }
 * @param scelta { modo, ore, oreGia?, destinazione: 'personali' | uid del contenitore, gruppi?: number|null (null = quanti ne stanno), esito? }
 * @returns {{ modo, ore, oreEffettive, pmOra, recupero, pmPrima, pmDopoRecupero, sprecati, conversione, finale, righe, avvisi, registro, vuoto }}
 */
export function pianoMedita({ scheda, sessione, massimi }, scelta, dati) {
  const rp = dati.regole.recupero_pm;
  const modi = modiMedita(scheda, dati);
  const modo = modi.find((m) => m.id === scelta?.modo) ?? modi[0];
  const avvisi = [];
  const ore = intero(scelta?.ore, 0);
  const oreGia = intero(scelta?.oreGia, 0);
  let oreEffettive = ore;
  if (modo.id === 'meditazione') {
    if (!modo.disponibile) avvisi.push(`Meditazione: ${modo.motivo}. Il recupero qui sotto è 0: scegli un’altra modalità, o il Direttore decide.`);
    else {
      const utili = Math.max(0, modo.oreGiorno - oreGia);
      if (ore > utili) { oreEffettive = utili; avvisi.push(`Oltre le ${modo.oreGiorno} ore utili al giorno non si recuperano PM: ${utili} ore su ${ore} contano (${oreGia ? `${oreGia} già fatte oggi` : 'limite giornaliero'}; Magia, «Meditazione»).`); }
    }
  }
  const pmOra = modo.disponibile ? modo.pmOra : 0;
  const recupero = pmOra * oreEffettive;
  const pmPrima = sessione?.pmAttuali ?? 0;
  const max = massimi?.pm ?? 0;
  // i PM recuperati si possono versare nel cristallo man mano (un'ora alla volta): per la conversione vale tutto ciò che si è
  // recuperato; ai PM personali arriva solo ciò che sta entro il massimo (Magia, «Recupero naturale»: non si supera il massimo)
  const pool = pmPrima + recupero;
  const pmDopoRecupero = Math.min(max, pool);
  let sprecati = pool - pmDopoRecupero;
  if (ore === 0) avvisi.push('Indica almeno un’ora completa: una frazione d’ora non dà PM (Magia, «Recupero naturale dei Punti Magia»).');
  const righe = [
    { etichetta: `${modo.nome}: ${oreEffettive} ${oreEffettive === 1 ? 'ora' : 'ore'} × ${pmOra} PM`, valore: `+${recupero}`, nota: modo.extra ? `${modo.pmOra - modo.extra} + ${modo.extra} ${modo.nomeExtra}` : (modo.id === 'meditazione' ? 'valori della scheda' : null) },
    { etichetta: 'PM personali', valore: `${pmPrima} → ${pmDopoRecupero} / ${max}`, nota: sprecati ? `${sprecati} oltre il massimo` : null },
  ];

  let conversione = null;
  let finale = { personali: pmDopoRecupero, cristallo: null };
  const dest = scelta?.destinazione ?? 'personali';
  if (dest !== 'personali') {
    const cv = rapportoConversione(scheda, dati);
    const c = (scheda?.equipaggiamento?.contenitori ?? []).find((x) => x.uid === dest) ?? null;
    const motivo = motivoRicarica(c, cv);
    if (c && cv) {
      const rapporto = cv.fissi?.[c.energia] ?? cv.rapporto;
      const pmC = sessione?.chroma?.[c.uid]?.pmAttuali ?? 0;
      const spazio = Math.max(0, c.capacita - pmC);
      const perPm = Math.floor(pool / rapporto);
      const richiesti = scelta?.gruppi === null || scelta?.gruppi === undefined ? Math.min(perPm, spazio) : intero(scelta.gruppi, 0);
      let gruppi = richiesti;
      if (spazio === 0) { gruppi = 0; avvisi.push(`${c.nome} è già pieno (${pmC} / ${c.capacita}): niente da versare, i PM restano nei personali.`); }
      else if (gruppi > spazio) { gruppi = spazio; avvisi.push(`${c.nome} ha spazio per ${spazio} PM: mi fermo a ${spazio} gruppi, il resto resta nei PM personali.`); }
      if (gruppi > perPm) { gruppi = perPm; avvisi.push(`Servono ${rapporto} PM personali per gruppo: con ${pool} PM si possono convertire ${perPm} ${perPm === 1 ? 'gruppo' : 'gruppi'}.`); }
      if (motivo) avvisi.push(`${c.nome}: ${motivo}. Si può procedere comunque: l’ultima parola è del Direttore.`);
      const prova = provaGruppi(gruppi, dati);
      // la Prova di Potere (da due gruppi in su) non si salta e non ha un esito di comodo: finché chi gioca non indica come è andata
      // la conversione resta «in attesa» (nessun PM spostato). Un gruppo solo è automatico.
      const esito = prova.richiesta ? (rp.conversione.esiti.includes(scelta?.esito) ? scelta.esito : null) : 'successo';
      const inAttesa = esito === null;
      const potere = scheda?.abilita?.find((a) => a.nome === 'Potere');
      const vaPotere = potere ? (potere.effettivo ?? potere.totale) : null;
      if (prova.richiesta) Object.assign(prova, { va: vaPotere, totale: vaPotere === null ? null : vaPotere + prova.penalita });
      let convertiti = inAttesa ? 0 : gruppi;
      let spesa = inAttesa ? 0 : gruppi * rapporto;
      if (inAttesa) { /* niente si sposta finché non c'è l'esito */ }
      else if (esito === 'fallimento') { convertiti = 0; spesa = 0; }
      else if (esito === 'maldestro') { convertiti = 0; }
      else if (esito === 'magistrale') {
        const extra = gruppi + 1 <= spazio && pool - spesa >= rapporto ? 1 : 0;
        convertiti = gruppi + extra; spesa = convertiti * rapporto;
      }
      const entrano = Math.min(convertiti, spazio);
      finale = { personali: Math.min(max, pool - spesa), cristallo: pmC + entrano };
      sprecati = pool - spesa - finale.personali;
      if (prova.richiesta) avvisi.push(inAttesa
        ? `Prova di Potere da fare: una sola per l’intera operazione, ${gruppi} gruppi, Potere ${prova.penalita}${prova.totale !== null ? ` (VA ${prova.va} ${prova.penalita} = ${prova.totale})` : ''}. L’app non tira: indica l’esito qui sotto; finché non lo fai la conversione non si applica (Magia sez. 6).`
        : `Una sola Prova di Potere per l’intera operazione (${gruppi} gruppi: Potere ${prova.penalita}, Magia sez. 6): esito indicato, ${rp.conversione.nomi_esiti[esito]}.`);
      if (gruppi > 0) avvisi.push('Ricaricare richiede 1 AzP e il contatto con il contenitore: nel manuale non avviene durante la Meditazione, ma subito dopo, con la propria Azione (Magia sez. 6).');
      if (finale.personali === 0 && spesa > 0) avvisi.push('I PM personali arrivano a 0: Svenuto al termine dell’intera azione, dopo averne risolto l’esito (Magia sez. 6).');
      conversione = {
        uid: c.uid, nome: c.nome, energia: c.energia, capacita: c.capacita, pmPrima: pmC, spazio, rapporto, fonteRapporto: fonteRapporto(cv, c.energia), talenti: cv.talenti,
        gruppiRichiesti: richiesti, gruppi, convertiti, spesa, entrano, prova, esito, inAttesa, motivo,
      };
      righe.push(
        { etichetta: `Conversione ${rapporto}:1`, valore: `${gruppi} ${gruppi === 1 ? 'gruppo' : 'gruppi'}`, nota: fonteRapporto(cv, c.energia) },
        // i costi della ricarica fatta da sola, tutti nel conto: l'Azione, il contatto, la Prova (Magia sez. 6)
        ...(gruppi > 0 ? [{ etichetta: 'Azione', valore: '1 AzP', nota: 'contatto con il cristallo sintonizzato; si spende dopo il recupero, non durante la Meditazione' }] : []),
        ...(prova.richiesta ? [{ etichetta: 'Prova di Potere', valore: prova.totale !== null ? `VA ${prova.va} ${prova.penalita} = ${prova.totale}` : `Potere ${prova.penalita}`, nota: inAttesa ? 'esito da indicare' : rp.conversione.nomi_esiti[esito] }] : [{ etichetta: 'Prova di Potere', valore: 'automatica', nota: 'un gruppo solo' }]),
        { etichetta: 'PM personali spesi', valore: `−${spesa}`, nota: gruppi && !inAttesa ? `${convertiti} × ${rapporto}${esito !== 'successo' ? ` (${rp.conversione.nomi_esiti[esito]})` : ''}` : inAttesa ? 'in attesa dell’esito' : null },
        { etichetta: `Entrano in ${c.nome}`, valore: `+${entrano}`, nota: `${pmC} → ${pmC + entrano} / ${c.capacita}` },
        { etichetta: 'PM personali alla fine', valore: `${finale.personali} / ${max}`, nota: null },
      );
    } else if (!c) avvisi.push(`Destinazione non trovata: i PM vanno ai personali.`);
  }
  if (sprecati > 0) avvisi.push(`${sprecati} PM oltre il massimo personale (${max}) non entrano: Magia, «Recupero naturale», «non si supera il massimo».${conversione ? '' : ' Versandoli in un cristallo si usano.'}`);
  const quanto = `${oreEffettive} ${oreEffettive === 1 ? 'ora' : 'ore'}`;
  const registro = conversione
    ? `Medita (${modo.nome}, ${quanto}): +${recupero} PM personali (PM ${pmPrima} → ${finale.personali}); ricarica ${conversione.nome}: ${conversione.gruppi} ${conversione.gruppi === 1 ? 'gruppo' : 'gruppi'} a ${conversione.rapporto}:1, −${conversione.spesa} PM personali, +${conversione.entrano} PM nel cristallo (${conversione.pmPrima} → ${conversione.pmPrima + conversione.entrano})${conversione.prova.richiesta ? `, esito ${rp.conversione.nomi_esiti[conversione.esito]}` : ''}.`
    : `Medita (${modo.nome}, ${quanto}): +${recupero} PM personali (PM ${pmPrima} → ${pmDopoRecupero}).`;
  return {
    modo: { id: modo.id, nome: modo.nome }, ore, oreEffettive, pmOra, recupero, pmPrima, pmDopoRecupero, sprecati, conversione, finale, righe, avvisi, registro,
    vuoto: recupero === 0 && (!conversione || (conversione.entrano === 0 && conversione.spesa === 0)),
  };
}

/** La sessione dopo «Medita»: PM personali e cristallo in una modifica sola (così «Annulla» la copre tutta). */
export function applicaMedita(sessione, piano, m) {
  const s = allineaSessione(sessione, m);
  const chroma = piano.conversione ? { ...s.chroma, [piano.conversione.uid]: { ...s.chroma[piano.conversione.uid], pmAttuali: piano.finale.cristallo } } : s.chroma;
  return modificaSessione(s, { pmAttuali: piano.finale.personali, chroma }, m);
}

