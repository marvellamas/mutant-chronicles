// Utility d'attacco (backlog voci 5 e 6): funzioni pure, nessun tiro di dado. Il giocatore tira al
// tavolo; qui si calcolano VA finale con la scomposizione, Azioni, munizioni, colpi a segno, danno e
// promemoria. Regole e valori in regole.json → attacco_distanza (Giocatore §5.2, §5.8, §5.10,
// §5.11) e negli effetti.attacco_distanza dei Talenti; le modalità di fuoco in modalita_di_fuoco.
//
// Impianto comune (anche per il corpo a corpo, docs/ricognizione-manovre.md §4.1): si parte dal
// VA per colpire effettivo dell'arma (regole, equipaggiamento, condizioni: scheda.equipaggiamento.armi[i]
// con vaEffettivo e scomposizione) e si aggiungono le voci della dichiarazione, ognuna con
// { etichetta, valore, fonte, paragrafo }. Le fonti: regole, equipaggiamento, condizioni già nella
// base; qui movimento, bersaglio, copertura, distanza, mirino, modalità, manovra, talento, situazione.
import { aggiungiDanno } from './equipaggiamento.js';

export const voce = (etichetta, valore, fonte, paragrafo = null) => ({ etichetta, valore, fonte, paragrafo });
export const somma = (voci) => voci.reduce((s, x) => s + x.valore, 0);
const primaFrase = (t) => String(t ?? '').split(/(?<=\.)\s/)[0];

/**
 * Talenti del personaggio con un effetto sull'attacco: [{ nome, testo, e }].
 * Talenti Liberi dal loro id, Talenti di Classe posseduti dalla scheda (con i loro effetti).
 */
export function talentiAttacco(scheda, dati, chiave = 'attacco_distanza') {
  const liberi = (scheda?.talentiLiberi ?? []).map((t) => dati.talenti_liberi.talenti.find((x) => x.id === t.id)).filter(Boolean);
  const classe = (scheda?.classi ?? []).flatMap((c) => c.talenti ?? []);
  return [...liberi, ...classe].filter((t) => t.effetti?.[chiave] !== undefined).map((t) => ({ nome: t.nome, testo: t.testo, e: t.effetti[chiave] }));
}

/** Danno di un colpo in testo: «1d6+3», «(1d6+1) ×2». */
export function testoDanno(formula, moltiplicatore = 1) {
  if (!formula) return null;
  return moltiplicatore > 1 ? `(${formula}) ×${moltiplicatore}` : formula;
}

/** Profilo di danno dell'arma: a due mani se l'arma lo richiede e il profilo esiste. */
const dannoBase = (arma) => (arma.mani === 2 && arma.danno?.due_mani ? arma.danno.due_mani : arma.danno?.una_mano ?? null);

/**
 * Risultato base di un attacco (armi ravvicinate finché non arriva l'utility corpo a corpo):
 * VA per colpire effettivo con la scomposizione, danno e Parata.
 */
export function attaccoBase(arma) {
  return {
    va_finale: arma.vaEffettivo ?? arma.va,
    scomposizione: (arma.scomposizione ?? []).map((x) => ({ paragrafo: null, ...x })),
    danno_per_colpo: testoDanno(dannoBase(arma)),
    applicazioni: arma.ac ?? 1,
    parata: arma.parata ? { va: arma.parata.vaEffettivo ?? arma.parata.va, distanza: arma.parata.distanzaEffettiva ?? arma.parata.distanza ?? null } : null,
  };
}

// ---------------------------------------------------------------------------
// Attacco a distanza

/** Dichiarazione completa, con i valori predefiniti (niente movimento, niente copertura, Tiro Singolo). */
export function dichiarazioneDistanza(d = {}) {
  const b = d.bersaglio ?? {};
  return {
    movimento: ['fermo', 'passo', 'corsa', 'scatto'].includes(d.movimento) ? d.movimento : 'fermo',
    evasivo: !!d.evasivo,
    coperturaPropria: ['leggera', 'media'].includes(d.coperturaPropria) ? d.coperturaPropria : 'nessuna',
    bersaglio: {
      movimento: ['fermo', 'corsa', 'scatto'].includes(b.movimento) ? b.movimento : 'fermo',
      evasivo: !!b.evasivo,
      evasivoMigliorato: !!b.evasivoMigliorato,
      copertura: ['leggera', 'media', 'totale'].includes(b.copertura) ? b.copertura : 'nessuna',
      impegnato: !!b.impegnato,
      ignaro: !!b.ignaro,
      tiImpegna: !!b.tiImpegna,
    },
    distanza: Number.isFinite(d.distanza) && d.distanza >= 1 ? Math.round(d.distanza) : 10,
    modalita: typeof d.modalita === 'string' ? d.modalita : 'S',
    mirato: !!d.mirato,
    ravvicinato: !!d.ravvicinato,
    bruciapelo: !!d.bruciapelo,
    imbracciata: d.imbracciata !== false,
    analisiRapida: !!d.analisiRapida,
  };
}

/** §5.11: penalità della fascia di distanza e indice della fascia (le fasce oltre l'ultima si contano). */
export function fasciaDistanza(q, dati) {
  const D = dati.regole.attacco_distanza.distanza;
  const i = D.fasce.findIndex((f) => q <= f.fino_a);
  if (i >= 0) return { indice: i, va: D.fasce[i].va, fino_a: D.fasce[i].fino_a };
  const ultima = D.fasce.at(-1);
  const extra = Math.ceil((q - ultima.fino_a) / D.oltre.ogni_q);
  return { indice: D.fasce.length, va: ultima.va + extra * D.oltre.va, fino_a: ultima.fino_a + extra * D.oltre.ogni_q };
}

/** §5.11: Azioni Principali totali richieste dalla distanza (compresa quella del tiro). */
export function azioniDistanza(q, dati) {
  const D = dati.regole.attacco_distanza.distanza;
  const f = D.azioni.find((x) => q <= x.fino_a);
  if (f) return f.azioni;
  const ultima = D.azioni.at(-1);
  return ultima.azioni + Math.ceil((q - ultima.fino_a) / D.azioni_oltre.ogni_q) * D.azioni_oltre.azioni;
}

/** Munizioni consumate da una modalità, con il consumo più favorevole fra i Talenti (§5.10, §8.6.5). */
function munizioniModalita(m, dati, T) {
  const base = dati.regole.modalita_di_fuoco[m]?.colpi_consumati ?? 1;
  return Math.min(base, ...T.map((t) => t.e.modalita?.[m]?.munizioni).filter(Number.isInteger));
}

/** L'arma richiede Imbracciatura (Armi pesanti e lanciagranate, §5.10)? */
export function richiedeImbracciatura(arma, dati) {
  const I = dati.regole.attacco_distanza.imbracciatura;
  return I.abilita.includes(arma.abilita) || (!!arma.rif && I.armi.includes(arma.rif));
}

/**
 * Motivi per cui le scelte non sono ammesse (null se ammessa). Servono al calcolo (impossibile)
 * e all'interfaccia (pulsanti disabilitati con il motivo).
 */
export function vincoliDistanza(personaggio, arma, dichiarazione, dati) {
  const A = dati.regole.attacco_distanza;
  const MF = dati.regole.modalita_di_fuoco;
  const d = dichiarazioneDistanza(dichiarazione);
  const T = talentiAttacco(personaggio.scheda, dati);
  const colpi = personaggio.sessione?.munizioni?.[arma.uid]?.colpi ?? null;
  const ammesse = A.modalita.manovre_ammesse;
  const modalita = {};
  for (const m of (arma.modalita ?? []).filter((x) => x !== 'TM' && MF[x])) {
    const serve = munizioniModalita(m, dati, T);
    modalita[m] = colpi !== null && colpi < serve ? `servono ${serve} munizioni, nel caricatore ${colpi}` : null;
  }
  const manovra = (id) => {
    const M = A.manovre[id];
    if (!(ammesse[d.modalita] ?? []).includes(id)) return `${M.nome} si usa solo con ${Object.entries(ammesse).filter(([, l]) => l.includes(id)).map(([k]) => MF[k].nome).join(' o ')} (§5.10)`;
    for (const altra of M.incompatibili) if (d[altra]) return `${M.nome} non si combina con ${A.manovre[altra].nome} (§5.10)`;
    return null;
  };
  const mirato = (() => {
    if (!(arma.modalita ?? []).includes('TM') && !(arma.modalita ?? []).some((x) => ammesse[x]?.includes('mirato'))) return 'l’arma non permette il Tiro Mirato';
    if (A.manovre.mirato.movimenti_esclusi.includes(d.movimento)) return 'la preparazione si perde con Corsa o Scatto (§5.10)';
    return manovra('mirato');
  })();
  const ravvicinato = (() => {
    const R = A.manovre.ravvicinato;
    if (d.distanza > R.distanza_max_q) return `bersaglio oltre ${R.distanza_max_q} Q`;
    if (R.va_per_abilita[arma.abilita] === undefined) return 'serve un’Arma leggera o media';
    return manovra('ravvicinato');
  })();
  const bruciapelo = (() => {
    const B = A.manovre.bruciapelo;
    if (d.distanza > B.distanza_max_q) return 'serve il Contatto (1 Q)';
    if (!B.abilita.includes(arma.abilita)) return 'serve un’Arma leggera o media';
    if (!d.bersaglio.ignaro && !T.some((t) => t.e.bruciapelo?.consapevole)) return 'il bersaglio deve essere ignaro, immobilizzato o incapace di reagire (Tiro a Bruciapelo Migliorato: anche consapevole)';
    return manovra('bruciapelo');
  })();
  return {
    modalita,
    mirato,
    ravvicinato,
    bruciapelo,
    evasivo: d.movimento === 'fermo' ? 'il Movimento Evasivo si fa muovendosi (Passo, Corsa o Scatto)' : d.coperturaPropria !== 'nessuna' ? 'non si combina con l’attacco dalla Copertura' : null,
    coperturaPropria: !A.copertura.propria_movimenti.includes(d.movimento) || d.evasivo ? 'dalla Copertura ci si espone e si rientra con il solo Passo (§5.8)' : null,
    gittata: arma.gittataQ ?? null,
  };
}

/**
 * Attacco a distanza.
 * @param personaggio { scheda (calcolaScheda, con la sessione), sessione }
 * @param arma una voce di scheda.equipaggiamento.armi (arma a distanza impugnata)
 * @param dichiarazione vedi dichiarazioneDistanza()
 * @returns {{ va_finale, scomposizione, azioni_principali, azioni_movimento, munizioni, colpi_a_segno, tiri,
 *   danno_per_colpo, applicazioni, seconda_prova, impossibile: {motivo, proposta?}|null, promemoria }}
 */
export function calcolaAttaccoDistanza(personaggio, arma, dichiarazione, dati) {
  const A = dati.regole.attacco_distanza;
  const MF = dati.regole.modalita_di_fuoco;
  const d = dichiarazioneDistanza(dichiarazione);
  const T = talentiAttacco(personaggio.scheda, dati);
  const con = (k) => T.filter((t) => t.e[k] !== undefined);
  const vincoli = vincoliDistanza(personaggio, arma, d, dati);
  const scomposizione = (arma.scomposizione?.length ? arma.scomposizione : [voce(`VA ${arma.abilita}`, arma.va, 'regole')]).map((x) => ({ paragrafo: null, ...x }));
  const promemoria = [];
  let impossibile = null;
  const blocca = (motivo, proposta = null) => { impossibile ??= { motivo, ...(proposta ? { proposta } : {}) }; };
  const aggiungi = (etichetta, valore, fonte, paragrafo) => { if (valore) scomposizione.push(voce(etichetta, valore, fonte, paragrafo)); };

  // Tiro Ravvicinato obbligatorio se il tiratore è impegnato dal bersaglio (§5.10)
  if (d.bersaglio.tiImpegna && !d.ravvicinato) {
    d.ravvicinato = true;
    promemoria.push('Sei impegnato direttamente dal bersaglio: devi usare il Tiro Ravvicinato (§5.10).');
  }

  // 1. modalità di fuoco (§5.10) e munizioni
  const m = d.modalita;
  const M = MF[m];
  if (!M || !(arma.modalita ?? []).includes(m) || m === 'TM') blocca(`L’arma non ha la modalità ${M?.nome ?? m}.`);
  const colpi = personaggio.sessione?.munizioni?.[arma.uid]?.colpi ?? null;
  const munizioni = M ? munizioniModalita(m, dati, T) : 1;
  if (vincoli.modalita[m]) {
    const i = A.modalita.ordine_inferiore.indexOf(m);
    const candidati = i >= 0 ? A.modalita.ordine_inferiore.slice(i + 1) : ['S'];
    const proposta = candidati.find((x) => (arma.modalita ?? []).includes(x) && vincoli.modalita[x] === null) ?? null;
    blocca(`Munizioni insufficienti: ${vincoli.modalita[m]}.`, proposta ? { modalita: proposta, nome: MF[proposta].nome } : null);
  }
  if (M) {
    const migliorata = con('modalita').find((t) => t.e.modalita[m]?.va !== undefined);
    const va = migliorata ? migliorata.e.modalita[m].va : M.modificatore_va;
    aggiungi(migliorata ? `${M.nome} (${migliorata.nome})` : M.nome, va, migliorata ? 'talento' : 'modalità', 'Giocatore §5.10');
  }

  // 2. manovre: Tiro Mirato, Tiro Ravvicinato, Tiro a Bruciapelo (§5.10)
  let dannoBonus = 0;
  let moltiplicatore = 1;
  const azioniExtra = [];
  if (d.mirato) {
    if (vincoli.mirato) blocca(`Tiro Mirato non ammesso: ${vincoli.mirato}.`);
    const mig = con('mirato')[0];
    const MI = A.manovre.mirato;
    aggiungi(mig ? `Tiro Mirato (${mig.nome})` : 'Tiro Mirato', mig?.e.mirato.va ?? MI.va, mig ? 'talento' : 'manovra', MI.paragrafo);
    dannoBonus += mig?.e.mirato.danno ?? MI.danno;
    azioniExtra.push(MI.azioni_principali);
    promemoria.push(MI.frasi[3]);
  }
  if (d.ravvicinato) {
    if (vincoli.ravvicinato) blocca(`Tiro Ravvicinato non possibile: ${vincoli.ravvicinato}.`);
    const R = A.manovre.ravvicinato;
    const base = R.va_per_abilita[arma.abilita] ?? 0;
    const rid = Math.max(0, ...con('ravvicinato').map((t) => t.e.ravvicinato.riduzione ?? 0));
    aggiungi('Tiro Ravvicinato', base, 'manovra', R.paragrafo);
    if (rid) aggiungi(`${con('ravvicinato').find((t) => t.e.ravvicinato.riduzione).nome}`, Math.min(rid, -base), 'talento', R.paragrafo);
    if (!d.bruciapelo) dannoBonus += Math.max(R.danno, ...con('ravvicinato').map((t) => t.e.ravvicinato.danno ?? 0));
  }
  if (d.bruciapelo) {
    if (vincoli.bruciapelo) blocca(`Tiro a Bruciapelo non possibile: ${vincoli.bruciapelo}.`);
    moltiplicatore = A.manovre.bruciapelo.moltiplicatore;
    if (d.ravvicinato) promemoria.push(A.manovre.bruciapelo.frasi[1]);
  }

  // 3. movimento proprio (§5.2) e attacco dalla Copertura (§5.8)
  const EV = A.movimento_evasivo;
  let azioniMovimento = A.movimento.azioni_movimento[d.movimento];
  if (d.evasivo && vincoli.evasivo) blocca(`Movimento Evasivo non possibile: ${vincoli.evasivo}.`);
  const penMov = d.evasivo ? EV.proprio[d.movimento] ?? 0 : A.movimento.proprio[d.movimento];
  aggiungi(`Tuo movimento: ${d.movimento}${d.evasivo ? ' evasivo' : ''}`, penMov, 'movimento', d.evasivo ? EV.paragrafo : A.movimento.paragrafo);
  const ridMov = con('movimento_proprio').reduce((best, t) => (t.e.movimento_proprio.riduzione > (best?.e.movimento_proprio.riduzione ?? 0) ? t : best), null);
  if (penMov < 0 && ridMov) aggiungi(ridMov.nome, Math.min(ridMov.e.movimento_proprio.riduzione, -penMov), 'talento', A.movimento.paragrafo);
  if (d.evasivo) { azioniExtra.push(EV.azioni.principali); azioniMovimento = Math.max(azioniMovimento, EV.azioni.movimento); }
  if (d.coperturaPropria !== 'nessuna') {
    if (vincoli.coperturaPropria) blocca(`Attacco dalla Copertura non possibile: ${vincoli.coperturaPropria}.`);
    const pen = A.copertura.propria[d.coperturaPropria];
    aggiungi(`Attacchi dalla Copertura ${d.coperturaPropria}`, pen, 'copertura', A.copertura.paragrafo);
    const ct = con('copertura_propria')[0];
    if (ct) aggiungi(ct.nome, Math.min(ct.e.copertura_propria.riduzione, -pen), 'talento', A.copertura.paragrafo);
    azioniMovimento = Math.max(azioniMovimento, A.copertura.propria_azioni_movimento);
  }

  // 4. il bersaglio: movimento (§5.2), Copertura (§5.8), impegnato o protetto (§5.10)
  const b = d.bersaglio;
  if (b.evasivo) {
    const tab = b.evasivoMigliorato ? EV.bersaglio_migliorato : EV.bersaglio;
    const mov = b.movimento === 'fermo' ? 'passo' : b.movimento;
    aggiungi(`Bersaglio in Movimento Evasivo${b.evasivoMigliorato ? ' Migliorato' : ''} (${mov})`, tab[mov], 'bersaglio', EV.paragrafo);
  } else aggiungi(`Bersaglio in ${b.movimento}`, A.movimento.bersaglio[b.movimento], 'bersaglio', A.movimento.paragrafo);
  if (b.copertura === 'totale') blocca('Il bersaglio in Copertura Totale non può essere attaccato direttamente (§5.8).');
  else if (b.copertura !== 'nessuna') {
    const pen = A.copertura.bersaglio[b.copertura];
    aggiungi(`Bersaglio in Copertura ${b.copertura}`, pen, 'copertura', A.copertura.paragrafo);
    const ms = con('mira_selettiva')[0];
    if (ms && d.mirato && d.movimento === 'fermo') {
      aggiungi(ms.nome, Math.min(ms.e.mira_selettiva.riduzione, -pen), 'talento', 'Agente');
      promemoria.push(`${ms.nome}: vale se resti fermo per tutto il Round in cui spari.`);
    }
  }
  let secondaProva = null;
  if (b.impegnato) {
    const I = A.bersaglio_impegnato;
    // il Talento più favorevole (Fuoco Controllato elimina penalità e seconda Prova)
    const t = con('impegnato').sort((x, y) => (y.e.impegnato.va ?? -99) - (x.e.impegnato.va ?? -99))[0];
    const va = t ? t.e.impegnato.va : I.va;
    const seconda = t ? t.e.impegnato.seconda_prova : I.seconda_prova;
    aggiungi(t ? `Bersaglio impegnato o protetto (${t.nome})` : 'Bersaglio impegnato, protetto od ostaggio', va, t ? 'talento' : 'bersaglio', I.paragrafo);
    if (seconda !== null && seconda !== undefined) {
      secondaProva = { va: (arma.vaEffettivo ?? arma.va) + seconda, modificatore: seconda, testo: I.frasi[1] };
    }
  }

  // 5. distanza, mirino e Tiro a Lunga Distanza (§5.11)
  const D = A.distanza;
  if (arma.gittataQ !== null && arma.gittataQ !== undefined && d.distanza > arma.gittataQ) blocca(`Oltre la gittata massima dell’arma (${arma.gittataQ} Q): ${D.frasi[11]}`);
  const fascia = fasciaDistanza(d.distanza, dati);
  aggiungi(`Distanza ${d.distanza} Q`, fascia.va, 'distanza', D.paragrafo);
  let residuo = -fascia.va; // quanto si può ancora ridurre senza diventare un bonus
  const mirino = arma.mirino ?? null;
  let azioniMinime = 1;
  if (mirino) {
    const inRaggio = !mirino.distanza_max_q || d.distanza <= mirino.distanza_max_q;
    if (!inRaggio) promemoria.push(`${mirino.nome}: oltre ${mirino.distanza_max_q} Q non riduce la penalità (§5.11).`);
    else {
      const r = Math.min(mirino.riduzione ?? 0, residuo);
      aggiungi(mirino.nome, r, 'mirino', A.mirini.paragrafo);
      residuo -= r;
      azioniMinime = Math.max(azioniMinime, mirino.azp_minime ?? 1);
    }
  }
  const tld = con('distanza').find((t) => d.distanza > t.e.distanza.oltre_q);
  if (tld && residuo > 0) aggiungi(tld.nome, Math.min(tld.e.distanza.riduzione, residuo), 'talento', D.paragrafo);

  // 6. Imbracciatura (§5.10): Armi pesanti e lanciagranate
  if (richiedeImbracciatura(arma, dati)) {
    const I = A.imbracciatura;
    const postura = con('postura_assedio')[0];
    let imbracciata = d.imbracciata;
    if (postura && d.movimento === 'fermo') {
      imbracciata = true;
      dannoBonus += postura.e.postura_assedio.danno;
      promemoria.push(`${postura.nome}: senza usare l’Azione di Movimento l’arma è Imbracciata e infligge +${postura.e.postura_assedio.danno} danno.`);
    } else if (imbracciata && d.movimento !== 'fermo' && !con('imbracciatura').length) {
      imbracciata = false;
      promemoria.push(`Muovendoti perdi l’Imbracciatura: ${I.frasi[3]}`);
    }
    if (!imbracciata) aggiungi('Senza Imbracciatura', I.va, 'situazione', I.paragrafo);
    else if (d.movimento !== 'fermo' && con('imbracciatura').length) promemoria.push(`${con('imbracciatura')[0].nome}: imbracci senza spendere Azioni, una volta per Round.`);
  }

  // 7. Talenti con condizioni dichiarate
  const analisi = con('analisi_rapida')[0];
  if (analisi && d.analisiRapida) aggiungi(analisi.nome, analisi.e.analisi_rapida.va, 'talento', 'Agente');
  const silenzioso = con('silenzioso')[0];
  const silenziata = (arma.accessori ?? []).some((x) => /silenziat/i.test(x.nome));
  if (silenzioso && b.ignaro && silenziata && d.distanza <= silenzioso.e.silenzioso.distanza_max_q) aggiungi(silenzioso.nome, silenzioso.e.silenzioso.va, 'talento', 'Incursore');
  for (const t of con('promemoria')) {
    const quando = t.e.promemoria;
    const vale = (quando === 'ignaro' && b.ignaro) || (quando === 'raffica' && ['RM', 'RL'].includes(m))
      || (quando === 'entro_10' && d.distanza <= 10) || (quando === 'mirato' && d.mirato && d.distanza <= 10);
    if (vale) promemoria.push(`${t.nome}: ${primaFrase(t.testo)}`);
  }

  // 8. Azioni (§5.11): distanza e mirino, Mira Rapida (minimo 1), poi Tiro Mirato e Movimento Evasivo
  let azioni = Math.max(azioniDistanza(d.distanza, dati), azioniMinime);
  if (con('azioni_distanza').length) azioni = Math.max(1, azioni + con('azioni_distanza')[0].e.azioni_distanza);
  azioni += azioniExtra.reduce((s, x) => s + x, 0);
  if (azioniDistanza(d.distanza, dati) > 1 || azioniMinime > 1) promemoria.push(D.frasi.at(-1));
  const doppie = (personaggio.scheda?.azioni?.principali ?? 1) >= 2;
  if (doppie && A.modalita.raffiche.includes(m)) promemoria.push(A.modalita.frasi[2]);
  if (m === 'FS') promemoria.push(`Fuoco di Soppressione: Area ${A.modalita.area.FS}, dura fino alla tua Iniziativa successiva; chi si espone fa una PS di Volontà (§5.10).`);

  // 9. danno, applicazioni e colpi (§5.10, AC)
  const base = dannoBase(arma);
  if (arma.dannoDaMunizione) promemoria.push('Il danno dipende dalla munizione caricata.');
  const formula = base ? aggiungiDanno(base, dannoBonus) : null;

  return {
    va_finale: somma(scomposizione),
    scomposizione,
    azioni_principali: azioni,
    azioni_movimento: azioniMovimento,
    munizioni,
    colpi_a_segno: A.modalita.colpi_a_segno[m] ?? 1,
    tiri: A.modalita.tiri[m] ?? 1,
    danno_per_colpo: testoDanno(formula, moltiplicatore),
    applicazioni: A.modalita.applicazioni[m] ?? arma.ac ?? 1,
    seconda_prova: secondaProva,
    impossibile,
    promemoria,
    fascia,
  };
}
