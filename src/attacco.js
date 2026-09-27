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
  return [...liberi, ...classe].filter((t) => t.effetti?.[chiave] !== undefined)
    .map((t) => ({ nome: t.parametroNome ? `${t.nome} (${t.parametroNome})` : t.nome, testo: t.testo, e: t.effetti[chiave] }));
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

const conSegno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const pulisciRiga = (f) => String(f).replace(/^\|\s*/, '').replace(/\s*\|\s*$/, '').replace(/\s*\|\s*/g, ' · ');

/**
 * Pulsante di una modalità di fuoco (§5.10, regole.json → modalita_di_fuoco): riga compatta
 * («3 colpi · 1 a segno · +2 VA») e tooltip con la regola completa. Con i Talenti del personaggio
 * (munizioni e VA migliorati).
 * @returns {{ riga, info: { titolo, sottotitolo, sezioni } }}
 */
export function descriviModalita(m, dati, T = []) {
  const A = dati.regole.attacco_distanza;
  const M = dati.regole.modalita_di_fuoco[m];
  const consumo = munizioniModalita(m, dati, T);
  const tMig = T.find((t) => t.e.modalita?.[m]?.va !== undefined);
  const va = tMig ? tMig.e.modalita[m].va : M.modificatore_va;
  const tiri = A.modalita.tiri[m] ?? 1;
  const esito = m === 'FS' ? `Area ${A.modalita.area.FS}`
    : A.modalita.applicazioni[m] ? `${A.modalita.applicazioni[m]} applicazioni`
      : tiri > 1 ? `${tiri} tiri · 1 a segno ciascuno` : `${A.modalita.colpi_a_segno[m] ?? 1} a segno`;
  const riga = [`${consumo} ${consumo === 1 ? 'colpo' : 'colpi'}`, esito, `${conSegno(va)} VA`].join(' · ');
  const manovre = (A.modalita.manovre_ammesse[m] ?? []).map((id) => A.manovre[id].nome);
  const mig = M.migliorata;
  return {
    riga,
    info: {
      titolo: M.nome,
      sottotitolo: `Giocatore ${M.paragrafo}`,
      sezioni: [
        { etichetta: 'Munizioni consumate', testo: `${consumo}${consumo !== M.colpi_consumati ? ` (${M.colpi_consumati} da regole, ridotte dal Talento)` : ''}` },
        { etichetta: 'Colpi a segno', testo: M.colpi_a_segno },
        { etichetta: 'VA', testo: `${conSegno(M.modificatore_va)}${mig?.modificatore_va !== undefined ? `; ${mig.talento}: ${conSegno(mig.modificatore_va)}` : ''}${mig?.colpi_consumati !== undefined ? `; ${mig.talento}: ${mig.colpi_consumati} munizioni` : ''}${tMig ? ` (applicato: ${tMig.nome})` : ''}` },
        { etichetta: 'Azioni', testo: `${M.azioni_principali} ${M.azioni_principali === 1 ? 'Azione Principale' : 'Azioni Principali'}` },
        { etichetta: 'Manovre compatibili', testo: manovre.length ? manovre.join(', ') : 'nessuna (Tiro Mirato, Ravvicinato e a Bruciapelo esclusi)' },
        { etichetta: 'Regola', testo: M.regola },
        M.note ? { etichetta: 'Note', testo: M.note } : null,
      ].filter(Boolean),
    },
  };
}

/**
 * Interruttore di una manovra a distanza (Tiro Mirato, Ravvicinato, a Bruciapelo, §5.10): riga
 * compatta con l'effetto e tooltip con condizioni, incompatibilità e testo del manuale.
 */
export function descriviManovraDistanza(id, arma, dati, T = []) {
  const A = dati.regole.attacco_distanza;
  const M = A.manovre[id];
  const MF = dati.regole.modalita_di_fuoco;
  const modalita = Object.entries(A.modalita.manovre_ammesse).filter(([, l]) => l.includes(id)).map(([k]) => MF[k].nome);
  let riga;
  if (id === 'mirato') {
    const mig = T.find((t) => t.e.mirato)?.e.mirato;
    riga = `${conSegno(mig?.va ?? M.va)} VA · +${mig?.danno ?? M.danno} danno · +${M.azioni_principali} AzP`;
  } else if (id === 'ravvicinato') {
    const va = M.va_per_abilita[arma?.abilita];
    riga = `${va === undefined ? 'solo Armi leggere o medie' : `${conSegno(va)} VA`} · +${M.danno} danno`;
  } else riga = `danno ×${M.moltiplicatore}`;
  return {
    riga,
    info: {
      titolo: M.nome,
      sottotitolo: M.paragrafo,
      sezioni: [
        { etichetta: 'Effetto', testo: riga },
        M.distanza_max_q ? { etichetta: 'Distanza', testo: `entro ${M.distanza_max_q} Q` } : null,
        { etichetta: 'Modalità', testo: modalita.join(', ') },
        (M.incompatibili ?? []).length ? { etichetta: 'Non si combina con', testo: M.incompatibili.map((x) => A.manovre[x].nome).join(', ') } : null,
        ...(M.frasi ?? []).map((f) => ({ testo: pulisciRiga(f) })),
      ].filter(Boolean),
    },
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

// ---------------------------------------------------------------------------
// Attacco ravvicinato e senz'armi (Giocatore §1.6, §5.3–5.7, §5.12, §5.13; regole.json →
// attacco_ravvicinato; effetti.attacco_ravvicinato dei Talenti). Stesso contratto dell'attacco a
// distanza: VA finale con la scomposizione, Azioni, danno con moltiplicatori e bonus nell'ordine del
// §5.13, Prova o Salvezza del bersaglio, effetti, promemoria. Nessun tiro, nessun consumo.

export const SENZ_ARMI = 'senz_armi';
const numeroTesto = (n) => (n < 0 ? `−${-n}` : `+${n}`);

/** Valore massimo di un danno «XdY+Z», per scegliere il dado più alto (Arti Marziali, §8.6.1). */
function massimoDanno(testo) {
  const m = /^(\d+)d(\d+)(?:\s*([+−-])\s*(\d+))?$/.exec(String(testo ?? '').trim());
  if (!m) return -Infinity;
  const extra = m[3] ? (m[3] === '+' ? 1 : -1) * Number(m[4]) : 0;
  return Number(m[1]) * Number(m[2]) + extra;
}

/**
 * Profilo «Senz'armi»: Abilità Corpo a corpo (VA effettivo con le condizioni), portata 1 Q. Danno:
 * il dado dei dati se c'è (Disciplina del Lottatore al suo Grado, §3.5.5; Arti Marziali 1d6, §8.6.1;
 * «si usa il dado più alto applicabile»), altrimenti quello dichiarato dal giocatore (A.22: il manuale
 * non lo dà per gli altri).
 * @param dannoDichiarato testo del danno salvato nel personaggio (sessione → attacchi.senz_armi)
 */
export function profiloSenzArmi(scheda, dati, dannoDichiarato = null) {
  const S = dati.regole.attacco_ravvicinato.senz_armi;
  const a = (scheda?.abilita ?? []).find((x) => x.nome === S.abilita) ?? null;
  const T = talentiAttacco(scheda, dati, 'attacco_ravvicinato');
  const daDati = T.filter((t) => t.e.senz_armi?.danno).sort((x, y) => massimoDanno(y.e.senz_armi.danno) - massimoDanno(x.e.senz_armi.danno))[0] ?? null;
  const dichiarato = typeof dannoDichiarato === 'string' && dannoDichiarato.trim() ? dannoDichiarato.trim() : null;
  const danno = daDati?.e.senz_armi.danno ?? dichiarato;
  const scomposizione = a ? (a.scomposizione ?? [voce('Valore da regole', a.totale, 'regole')]) : [];
  return {
    uid: SENZ_ARMI, rif: null, nome: 'Senz’armi', tipo: 'arma_ravvicinata', senzArmi: true, abilita: S.abilita,
    va: a?.totale ?? null, vaEffettivo: a?.effettivo ?? a?.totale ?? null,
    scomposizione: scomposizione.map((x, i) => (i === 0 && x.fonte === 'regole' ? { ...x, etichetta: `VA ${S.abilita}` } : x)),
    danno: { una_mano: danno, due_mani: null }, dannoOrigine: daDati ? daDati.nome : dichiarato ? 'dichiarato' : null, dannoDaDati: !!daDati,
    mani: 1, portataQ: S.portata_q, manovre: [],
  };
}

/** «Senz'armi» compare fra le armi se il personaggio non impugna nulla, ha Arti Marziali o è Lottatore. */
export function senzArmiDisponibile(scheda, dati) {
  if (!(scheda?.equipaggiamento?.armi ?? []).length) return true;
  if (talentiAttacco(scheda, dati, 'attacco_ravvicinato').some((t) => t.e.senz_armi)) return true;
  return (scheda?.classi ?? []).some((c) => c.nome === 'Lottatore');
}

/** Dichiarazione completa del corpo a corpo, con i valori predefiniti (Attacco normale, a Contatto). */
export function dichiarazioneRavvicinato(d = {}) {
  const b = d.bersaglio ?? {};
  const manovra = Array.isArray(d.manovra) ? d.manovra.filter((x) => typeof x === 'string') : typeof d.manovra === 'string' ? [d.manovra] : ['normale'];
  return {
    movimento: ['fermo', 'passo', 'corsa', 'scatto'].includes(d.movimento) ? d.movimento : 'fermo',
    carica: !!d.carica,
    percorsoQ: Number.isFinite(d.percorsoQ) && d.percorsoQ >= 0 ? Math.round(d.percorsoQ) : 3,
    controcarica: !!d.controcarica,
    aTerra: !!d.aTerra,
    dueArmi: !!d.dueArmi,
    manoNonDominante: !!d.manoNonDominante,
    imboscata: !!d.imboscata,
    opportunita: !!d.opportunita,
    primoAttacco: !!d.primoAttacco,
    bersaglio: {
      aTerra: !!b.aTerra,
      ignaro: !!b.ignaro,
      alleatoAdiacente: !!b.alleatoAdiacente,
      copertura: ['leggera', 'media', 'totale'].includes(b.copertura) ? b.copertura : 'nessuna',
      distanza: Number.isFinite(b.distanza) && b.distanza >= 1 ? Math.round(b.distanza) : 1,
    },
    manovra: manovra.length ? manovra : ['normale'],
    bersagli: [2, 3].includes(d.bersagli) ? d.bersagli : 2,
    circostanza: Number.isInteger(d.circostanza) ? d.circostanza : 0,
  };
}

/** Manovre dei Talenti del Lottatore (senz'armi): Raffica di Colpi, Punto Debole. */
function manovreDiTalento(T) {
  const out = {};
  const raffica = T.find((t) => t.e.raffica_di_colpi);
  if (raffica) {
    out.raffica_di_colpi = {
      nome: raffica.nome, paragrafo: 'Lottatore §3.5.5', offensiva: true, azioni_principali: 1, va: raffica.e.raffica_di_colpi.va, danno: 0,
      attacchi: raffica.e.raffica_di_colpi.attacchi, solo_senz_armi: true, prova: { tipo: 'per_colpire', contro: ['Difese'] }, frasi: [primaFrase(raffica.testo)],
    };
  }
  const multiplo = T.find((t) => t.e.combattimento_multiplo);
  if (multiplo) {
    out.combattimento_multiplo = {
      nome: multiplo.nome, paragrafo: 'Lottatore §3.5.5', offensiva: true, azioni_principali: 1, va_per_bersagli: multiplo.e.combattimento_multiplo.va_per_bersagli,
      danno: 0, solo_senz_armi: true, senza_limite: true, riduzione_da: 'spazzata', prova: { tipo: 'per_colpire', contro: ['Difese'] }, frasi: [primaFrase(multiplo.testo)],
    };
  }
  const debole = T.find((t) => t.e.punto_debole);
  if (debole) {
    out.punto_debole = {
      nome: debole.nome, paragrafo: 'Lottatore §3.5.5', offensiva: true, azioni_principali: 1, va: 0, danno: 0,
      moltiplicatore: debole.e.punto_debole.moltiplicatore, solo_senz_armi: true, preparazione: true,
      prova: { tipo: 'per_colpire', contro: ['Difese'] }, frasi: [primaFrase(debole.testo)],
    };
  }
  return out;
}

/** Tutte le Manovre utilizzabili dal personaggio: quelle del §5.12 e quelle dei suoi Talenti. */
export function manovreRavvicinate(scheda, dati) {
  return { ...dati.regole.attacco_ravvicinato.manovre, ...manovreDiTalento(talentiAttacco(scheda, dati, 'attacco_ravvicinato')) };
}

/** Seconda arma impugnata per Combattere con due armi (§5.7) e la combinazione. */
export function secondaArma(scheda, arma) {
  const altre = (scheda?.equipaggiamento?.armi ?? []).filter((x) => x.uid !== arma.uid && !x.moduloDi && x.va !== null);
  const s = altre[0] ?? null;
  if (!s) return { arma: null, combinazione: null };
  const ravv = (x) => x.tipo === 'arma_ravvicinata';
  const unaMano = (x) => x.mani !== 2;
  const combinazione = ravv(arma) && ravv(s) ? (unaMano(arma) && unaMano(s) ? 'ravvicinate' : null)
    : (ravv(arma) && unaMano(arma) && s.abilita === 'Armi leggere') || (ravv(s) && unaMano(s) && arma.abilita === 'Armi leggere') ? 'mista' : null;
  return { arma: s, combinazione };
}

/**
 * Motivi per cui ogni Manovra non è ammessa (null se ammessa): manovre: { id: { motivo, nascosta } }.
 * `nascosta`: l'arma non la permette (Armamenti §7.1.7) e la scheda non la mostra; le altre si
 * mostrano disabilitate con il motivo (situazione del momento). Più i vincoli di Carica,
 * Controcarica e due armi.
 */
export function vincoliRavvicinato(personaggio, arma, dichiarazione, dati) {
  const R = dati.regole.attacco_ravvicinato;
  const d = dichiarazioneRavvicinato(dichiarazione);
  const M = manovreRavvicinate(personaggio.scheda, dati);
  const portata = arma.portataQ ?? 1;
  const manovre = {};
  for (const [id, m] of Object.entries(M)) {
    let motivo = null;
    let nascosta = false;
    if (m.solo_senz_armi && !arma.senzArmi) { motivo = 'solo senz’armi'; nascosta = true; } else if (m.compatibilita === 'arma' && !(arma.senzArmi ? m.senz_armi : (arma.manovre ?? []).includes(m.nome_catalogo))) {
      motivo = arma.senzArmi ? 'non senz’armi' : `l’arma non ha «${m.nome_catalogo}» fra le Manovre compatibili (Armamenti §7.1.7)`;
      nascosta = true;
    } else if (m.mano_libera && !arma.senzArmi && (arma.mani === 2 || d.dueArmi)) motivo = 'serve una mano libera';
    else if (m.contatto && d.bersaglio.distanza > 1) motivo = 'serve il Contatto (1 Q)';
    else if (id !== 'normale' && m.offensiva !== false) {
      if (d.carica) motivo = 'la Carica permette un solo attacco normale (§5.6)';
      else if (d.controcarica) motivo = 'la Controcarica è un attacco normale (§5.6)';
      else if (d.dueArmi) motivo = 'Combattere con due armi non si combina con altre manovre offensive (§5.7)';
      else if (d.opportunita) motivo = 'l’Attacco di Opportunità non incorpora manovre offensive (§5.3)';
      else if (id === 'mirato' && (m.movimenti_esclusi ?? []).includes(d.movimento)) motivo = 'la preparazione si perde con Corsa o Scatto (§5.10)';
    }
    manovre[id] = { motivo, nascosta };
  }
  const corsa = personaggio.scheda?.tavolo?.movimento?.corsa?.effettivo ?? personaggio.scheda?.movimento?.corsa ?? null;
  const ultima = R.carica.fasce.at(-1).a;
  const s = secondaArma(personaggio.scheda, arma);
  return {
    manovre,
    portata,
    carica: d.percorsoQ < R.carica.percorso_min_q ? `servono almeno ${R.carica.percorso_min_q} Q di percorso (§5.6)`
      : corsa !== null && d.percorsoQ > corsa ? `il percorso non può superare la Corsa (${corsa} Q, §5.6)`
        : d.percorsoQ > ultima ? `oltre ${ultima} Q la tabella della Carica non dà valori (§5.6)` : null,
    controcarica: d.bersaglio.distanza < R.controcarica.distanza_min_q ? `serve una distanza di almeno ${R.controcarica.distanza_min_q} Q (§5.6)` : null,
    dueArmi: arma.senzArmi ? 'serve un’arma in ciascuna mano' : !s.arma ? 'serve una seconda arma impugnata' : !s.combinazione ? 'combinazione di armi non ammessa (§5.7)' : null,
    secondaArma: s.arma,
  };
}

/** §1.6: moltiplicatore con il Magistrale (×1 → ×2, ×2 → ×3, ×3 resta ×3). */
export function moltiplicatoreMagistrale(m, dati) {
  const G = dati.regole.attacco_ravvicinato.magistrale;
  if (m <= 1) return G.raddoppio;
  if (m === 2) return G.da_x2;
  return Math.min(m, G.massimo);
}

/**
 * Attacco ravvicinato o senz'armi.
 * @param personaggio { scheda (calcolaScheda, con la sessione), sessione }
 * @param arma una voce di scheda.equipaggiamento.armi (arma ravvicinata impugnata) o profiloSenzArmi()
 * @param dichiarazione vedi dichiarazioneRavvicinato()
 * @returns {{ va_finale, scomposizione, attacchi: [{etichetta, va}], manovra, azioni_principali, azioni_movimento,
 *   prova: {tipo, testo}, danno: { base, bonus, formula, moltiplicatore, moltiplicatore_magistrale, testo, testo_magistrale }|null,
 *   dopo_armatura: [{etichetta, testo}], effetti, impossibile: {motivo}|null, promemoria, avvisi }}
 */
export function calcolaAttaccoRavvicinato(personaggio, arma, dichiarazione, dati) {
  const R = dati.regole.attacco_ravvicinato;
  const d = dichiarazioneRavvicinato(dichiarazione);
  const T = talentiAttacco(personaggio.scheda, dati, 'attacco_ravvicinato');
  const con = (k) => T.filter((t) => t.e[k] !== undefined);
  const M = manovreRavvicinate(personaggio.scheda, dati);
  const vincoli = vincoliRavvicinato(personaggio, arma, d, dati);
  const promemoria = [];
  const avvisi = [];
  let impossibile = null;
  const blocca = (motivo) => { impossibile ??= { motivo }; };
  const aggiungi = (lista, etichetta, valore, fonte, paragrafo) => { if (valore) lista.push(voce(etichetta, valore, fonte, paragrafo)); };

  // 1. Manovra: una sola offensiva (§5.12: «Le manovre offensive non si combinano fra loro»)
  const offensive = d.manovra.filter((x) => M[x] && M[x].offensiva !== false);
  if (offensive.length > 1) blocca(`${R.frasi[0]} (${offensive.map((x) => M[x].nome).join(' e ')}, §5.12)`);
  const sconosciuta = d.manovra.find((x) => !M[x]);
  const id = sconosciuta ?? offensive[0] ?? 'normale';
  const m = M[id];
  if (!m) {
    return { va_finale: null, scomposizione: [], attacchi: [], manovra: null, azioni_principali: 0, azioni_movimento: 0, prova: null, danno: null, dopo_armatura: [], effetti: [], impossibile: { motivo: `Manovra sconosciuta: ${id}.` }, promemoria, avvisi };
  }
  const vm = vincoli.manovre[id];
  if (vm?.motivo) blocca(`${m.nome} non ammessa: ${vm.motivo}.`);
  const idMig = m.riduzione_da ?? id;
  const mig = con('manovra').find((t) => t.e.manovra[idMig]);
  const migE = mig?.e.manovra[idMig] ?? {};

  // 2. base: VA effettivo dell'arma; per le Prove contrapposte Corpo a corpo, se lo chiede la Manovra
  let base = (arma.scomposizione?.length ? arma.scomposizione : [voce(`VA ${arma.abilita}`, arma.va ?? 0, 'regole')]).map((x) => ({ paragrafo: null, ...x }));
  const corpo = (personaggio.scheda?.abilita ?? []).find((x) => x.nome === R.senz_armi.abilita);
  if (m.prova?.tipo === 'contrapposta' && corpo && !arma.senzArmi) {
    const vaCorpo = corpo.effettivo ?? corpo.totale;
    const soloCorpo = !(m.prova.abilita ?? []).includes('arma');
    if (soloCorpo || vaCorpo > (arma.vaEffettivo ?? arma.va ?? -99)) {
      base = (corpo.scomposizione ?? [voce('Valore da regole', corpo.totale, 'regole')]).map((x, i) => ({ paragrafo: null, ...x, etichetta: i === 0 && x.fonte === 'regole' ? `VA ${corpo.nome}` : x.etichetta }));
      if (!soloCorpo) promemoria.push(`${m.nome}: usi Corpo a corpo (${vaCorpo}), migliore dell’Abilità dell’arma.`);
    }
  }
  if ((arma.va === null || arma.va === undefined) && !arma.senzArmi) blocca('VA dell’arma non calcolato.');
  if (arma.senzArmi && arma.va === null) blocca('VA di Corpo a corpo non calcolato.');
  const scomposizione = [...base];
  const situazione = []; // voci comuni a tutti gli attacchi (valgono anche per la seconda arma)

  // 3. VA della Manovra, con la versione Migliorata
  if (m.va_per_bersagli) {
    const va = m.va_per_bersagli[d.bersagli];
    aggiungi(situazione, `${m.nome} contro ${d.bersagli} bersagli`, va, 'manovra', m.paragrafo);
    if (migE.riduzione) aggiungi(situazione, mig.nome, Math.min(migE.riduzione, -va), 'talento', m.paragrafo);
    promemoria.push(m.senza_limite
      ? `${m.nome}: tutti gli avversari adiacenti raggiungibili; con «3» si intende tre o più. Una Prova, un colpo e un’Armatura per bersaglio.`
      : `${m.nome}: bersagli adiacenti entro la portata (${vincoli.portata} Q); una Prova, un colpo e un’Armatura per bersaglio (A.27 provvisoria).`);
  } else if (migE.va !== undefined) aggiungi(situazione, `${m.nome} (${mig.nome})`, migE.va, 'talento', m.paragrafo);
  else aggiungi(situazione, m.nome, m.va, 'manovra', m.paragrafo);

  // 4. Carica e Controcarica (§5.6)
  let moltiplicatore = m.moltiplicatore ?? 1;
  let dannoBonus = 0;
  let azioniMovimento = d.movimento === 'fermo' ? 0 : 1;
  const cm = con('carica').find((t) => t.e.carica.moltiplicatore);
  if (d.carica && d.controcarica) blocca('Carica e Controcarica sono alternative.');
  if (d.carica) {
    const C = R.carica;
    if (vincoli.carica) blocca(`Carica non possibile: ${vincoli.carica}.`);
    const f = C.fasce.find((x) => d.percorsoQ >= x.da && d.percorsoQ <= x.a) ?? C.fasce[0];
    aggiungi(situazione, `Carica (${d.percorsoQ} Q)`, f.va, 'manovra', C.paragrafo);
    moltiplicatore = Math.max(moltiplicatore, cm ? cm.e.carica.moltiplicatore : C.moltiplicatore);
    const brutale = con('carica').find((t) => t.e.carica.danno);
    if (brutale) { dannoBonus += brutale.e.carica.danno; promemoria.push(`${brutale.nome}: +${brutale.e.carica.danno} al danno base, prima del moltiplicatore.`); }
    azioniMovimento = Math.max(azioniMovimento, C.azioni_movimento);
    promemoria.push(`Dopo la Carica chi ti attacca ha ${numeroTesto(f.avversari)} VA fino alla tua Iniziativa successiva (§5.6).`);
  }
  if (d.controcarica) {
    const C = R.controcarica;
    if (vincoli.controcarica) blocca(`Controcarica non possibile: ${vincoli.controcarica}.`);
    aggiungi(situazione, 'Controcarica', C.va, 'manovra', C.paragrafo);
    moltiplicatore = Math.max(moltiplicatore, cm ? cm.e.carica.moltiplicatore : C.moltiplicatore);
    azioniMovimento = Math.max(azioniMovimento, 1);
    promemoria.push(C.frasi[0]);
  }

  // 5. situazione propria e del bersaglio
  const AT = R.a_terra;
  const statoATerra = (personaggio.sessione?.statiAttivi ?? []).includes(AT.stato);
  if (d.aTerra && !statoATerra) aggiungi(situazione, 'Sei A Terra', AT.proprio, 'situazione', AT.paragrafo);
  if (statoATerra) promemoria.push('Sei A Terra: il −4 è già nel VA dallo Stato della sessione (§5.5).');
  const b = d.bersaglio;
  if (b.aTerra) aggiungi(situazione, 'Bersaglio A Terra', AT.bersaglio, 'bersaglio', AT.paragrafo);
  if (b.distanza > vincoli.portata && !d.controcarica) blocca(`Bersaglio a ${b.distanza} Q, oltre la portata dell’arma (${vincoli.portata} Q).`);
  if (b.copertura === 'totale') blocca('Il bersaglio in Copertura Totale non può essere attaccato direttamente (§5.8).');
  else if (b.copertura !== 'nessuna') promemoria.push(`Bersaglio in Copertura ${b.copertura}: nel ravvicinato l’app non applica la penalità finché il master non decide (A.25).`);
  if (d.imboscata) {
    const t = con('imboscata')[0];
    aggiungi(situazione, t ? `Imboscata (${t.nome})` : 'Imboscata', t ? t.e.imboscata.va : R.imboscata.va, t ? 'talento' : 'manovra', R.imboscata.paragrafo);
  }
  if (d.opportunita) {
    const t = con('promemoria').find((x) => x.e.promemoria === 'opportunita');
    promemoria.push(`Attacco di Opportunità: gratuito, ${t ? `due per Round contro avversari diversi (${t.nome})` : 'una sola volta per Round'}; non consuma Azioni (§5.3).`);
  }
  // mano non dominante (A.23): solo fuori da Combattere con due armi
  if (d.manoNonDominante && !d.dueArmi) {
    const amb = con('mano_non_dominante')[0];
    aggiungi(situazione, 'Mano non dominante', R.mano_non_dominante.va, 'situazione', R.mano_non_dominante.paragrafo);
    if (amb) aggiungi(situazione, amb.nome, amb.e.mano_non_dominante.va - R.mano_non_dominante.va, 'talento', R.mano_non_dominante.paragrafo);
    else promemoria.push('Mano non dominante: −4 provvisorio (A.23).');
  }
  // Talenti con una condizione dichiarata
  const alleato = con('alleato_adiacente')[0];
  if (alleato && b.alleatoAdiacente) aggiungi(situazione, alleato.nome, alleato.e.alleato_adiacente.va, 'talento', 'Assaltatore');
  const silenzioso = con('ignaro')[0];
  if (silenzioso && b.ignaro) aggiungi(situazione, silenzioso.nome, silenzioso.e.ignaro.va, 'talento', 'Incursore');
  const primo = con('primo_attacco')[0];
  if (primo && d.primoAttacco) aggiungi(situazione, `${primo.nome} (primo attacco)`, primo.e.primo_attacco.va, 'talento', 'Incursore');
  if (arma.senzArmi) for (const t of con('senz_armi').filter((x) => x.e.senz_armi.va)) aggiungi(situazione, t.nome, t.e.senz_armi.va, 'talento', 'Giocatore §8.6.1');
  // §3.5.5, Disciplina Controllo: bonus alle Prove offensive di Corpo a corpo per quelle Manovre
  const usaCorpo = arma.senzArmi || base[0]?.etichetta === `VA ${R.senz_armi.abilita}`;
  for (const t of con('controllo').filter((x) => x.e.controllo.manovre.includes(id))) {
    if (usaCorpo) aggiungi(situazione, t.nome, t.e.controllo.va, 'talento', 'Lottatore §3.5.5');
    else promemoria.push(`${t.nome}: il bonus vale per le Prove di Corpo a corpo, non con l’Abilità dell’arma.`);
  }
  // §3.5.5, Disciplina Potenza: −1 a Difese dopo un attacco senz'armi (Padronanza della Disciplina la elimina)
  if (arma.senzArmi) {
    for (const t of con('dopo_attacco_senz_armi')) {
      const annullata = con('padronanza_disciplina').some((x) => x.e.padronanza_disciplina?.potenza?.annulla_dopo_attacco);
      if (!annullata) promemoria.push(`${t.nome}: dopo l’attacco senz’armi ${numeroTesto(t.e.dopo_attacco_senz_armi.difese)} VA a Difese fino alla tua Iniziativa successiva.`);
    }
  }
  if (d.circostanza) aggiungi(situazione, 'Circostanza del Direttore', d.circostanza, 'situazione', 'Giocatore §1.4');

  // 6. più attacchi: Combattere con due armi (§5.7), Raffica di Colpi (Lottatore)
  scomposizione.push(...situazione);
  let attacchi = [];
  if (d.dueArmi) {
    const D = R.due_armi;
    const s = secondaArma(personaggio.scheda, arma);
    if (vincoli.dueArmi) blocca(`Combattere con due armi non possibile: ${vincoli.dueArmi}.`);
    const tal = con('due_armi').find((t) => t.e.due_armi.combinazione === s.combinazione);
    scomposizione.push(voce(tal ? `Combattere con due armi (${tal.nome})` : 'Combattere con due armi', tal ? tal.e.due_armi.va : D.va, tal ? 'talento' : 'manovra', D.paragrafo));
    const va2 = tal ? tal.e.due_armi.va : D.va;
    attacchi = [{ etichetta: arma.nome, va: somma(scomposizione) }];
    if (s.arma) attacchi.push({ etichetta: s.arma.nome, va: (s.arma.vaEffettivo ?? s.arma.va) + somma(situazione) + va2 });
    if (con('mano_non_dominante').length) promemoria.push('Ambidestro non modifica Combattere con due armi (§5.7).');
    if ((personaggio.scheda?.azioni?.principali ?? 1) >= 2) promemoria.push(D.frasi[2]);
  } else if (m.attacchi) {
    attacchi = Array.from({ length: m.attacchi }, (_, i) => ({ etichetta: `${m.nome}, attacco ${i + 1}`, va: somma(scomposizione) }));
  } else attacchi = [{ etichetta: m.va_per_bersagli ? `${m.nome} (una Prova)` : arma.nome, va: somma(scomposizione) }];

  // 7. danno (§5.13): dadi → bonus ordinari → moltiplicatore più alto → Difesa → Armatura → dopo l'Armatura
  const dopo = [];
  let danno = null;
  if (!(m.danno === null && !migE.danno_normale)) {
    const baseDanno = dannoBase(arma);
    dannoBonus += migE.danno ?? m.danno ?? 0;
    if (!baseDanno) {
      avvisi.push(arma.senzArmi
        ? 'Danno senz’armi non definito: il manuale non lo dà (A.22). Scrivilo nel campo «danno senz’armi»; con Arti Marziali è 1d6.'
        : 'Danno dell’arma non definito.');
    }
    const formula = baseDanno ? aggiungiDanno(baseDanno, dannoBonus) : null;
    const mm = moltiplicatoreMagistrale(moltiplicatore, dati);
    danno = {
      base: baseDanno, bonus: dannoBonus, formula, moltiplicatore, moltiplicatore_magistrale: mm,
      testo: formula ? testoDanno(formula, moltiplicatore) : null, testo_magistrale: formula ? testoDanno(formula, mm) : null,
      origine: arma.senzArmi ? arma.dannoOrigine : null,
    };
    if (m.dopo_armatura?.stato && !m.dopo_armatura.salvezza) {
      const v = migE.dopo_armatura ?? m.dopo_armatura.valore;
      dopo.push({ etichetta: `${m.dopo_armatura.stato} ${v}`, testo: `Se almeno 1 danno supera l’Armatura: ${m.dopo_armatura.stato} ${v} (§5.15).` });
    }
    if (m.dopo_armatura?.salvezza) dopo.push({ etichetta: `PS ${m.dopo_armatura.salvezza}`, testo: `Se almeno 1 danno supera l’Armatura, il bersaglio fa una PS ${m.dopo_armatura.salvezza}; se fallisce è ${m.dopo_armatura.stato} per ${m.dopo_armatura.durata} (§5.18).` });
    if (migE.dopo_armatura && !m.dopo_armatura) dopo.push({ etichetta: `+${migE.dopo_armatura} dopo l’Armatura`, testo: `${mig.nome}: +${migE.dopo_armatura} danni ai PV dopo l’Armatura, solo se almeno 1 danno la supera; non si moltiplica.` });
    if (moltiplicatore > 1) promemoria.push(`Con un Successo Magistrale il danno ×${moltiplicatore} diventa ×${mm} (§1.6).`);
    if (dannoBonus && moltiplicatore > 1) promemoria.push('I bonus ordinari al danno si sommano prima del moltiplicatore (§5.13; A.29).');
  }
  const effetti = [];
  if (m.effetto) effetti.push(`Con successo: ${m.effetto}.`);
  if (m.spinta_q) effetti.push(`Il bersaglio arretra di ${m.spinta_q} Q${migE.danno_normale ? ' e subisce il danno normale' : ' e non subisce danni'} (§5.5).`);
  if (id === 'immobilizzare') for (const t of con('promemoria').filter((x) => x.e.promemoria === 'immobilizzare')) promemoria.push(`${t.nome}: ${primaFrase(t.testo)}`);
  if (m.preparazione) promemoria.push(`${m.nome}: ${m.frasi[0]}`);
  if (id === 'mirato') promemoria.push(`${m.nome}: ${m.frasi[1]} ${m.frasi[2]}`);

  // 8. Prova o Salvezza del bersaglio
  const prova = m.prova?.tipo === 'contrapposta'
    ? { tipo: 'contrapposta', testo: `Prova contrapposta: ${m.prova.abilita.map((x) => (x === 'arma' ? `Abilità dell’arma (${arma.abilita})` : x)).join(' o ')} contro ${m.prova.contro.join(' o ')} del bersaglio${m.prova.contro.length > 1 ? ' (A.28: sceglie il bersaglio, provvisorio)' : ''}.` }
    : { tipo: 'per_colpire', testo: `Il bersaglio si difende con le Difese (Parata o Schivata, §5.9)${m.dopo_armatura?.salvezza ? `, poi PS ${m.dopo_armatura.salvezza}` : ''}.` };
  if (id === 'incalzare') prova.testo += ' Incalzare: Prova per colpire contro le Difese, provvisoria (A.24).';

  // 9. promemoria dei Talenti senza numero
  for (const t of con('promemoria')) {
    const q = t.e.promemoria;
    if (q === 'sempre' || (q === 'senz_armi' && arma.senzArmi)) promemoria.push(`${t.nome}: ${primaFrase(t.testo)}`);
  }

  return {
    va_finale: attacchi[0]?.va ?? somma(scomposizione),
    scomposizione,
    attacchi,
    manovra: { id, nome: m.nome, paragrafo: m.paragrafo },
    azioni_principali: d.opportunita ? 0 : m.azioni_principali,
    azioni_movimento: azioniMovimento,
    prova,
    danno,
    dopo_armatura: dopo,
    effetti,
    impossibile,
    promemoria,
    avvisi,
  };
}

/**
 * Riga compatta e tooltip di una Manovra ravvicinata («−4 VA · +1 danno · Sanguinamento 1»), con le
 * versioni Migliorate dei Talenti del personaggio.
 */
export function descriviManovraRavvicinata(id, scheda, dati) {
  const m = manovreRavvicinate(scheda, dati)[id];
  const T = talentiAttacco(scheda, dati, 'attacco_ravvicinato');
  const mig = T.find((t) => t.e.manovra?.[id])?.e.manovra[id] ?? {};
  const parti = [];
  if (m.va_per_bersagli) parti.push(Object.entries(m.va_per_bersagli).map(([n, v]) => `${conSegno(Math.min(0, v + (mig.riduzione ?? 0)))} VA contro ${n}`).join(', '));
  else { const va = mig.va ?? m.va; if (va) parti.push(`${conSegno(va)} VA`); }
  if (m.attacchi) parti.push(`${m.attacchi} attacchi`);
  if (m.azioni_principali > 1) parti.push(`${m.azioni_principali} AzP`);
  const danno = mig.danno ?? m.danno;
  if (m.danno === null && !mig.danno_normale) parti.push('nessun danno');
  else if (danno) parti.push(`+${danno} danno`);
  if (m.moltiplicatore) parti.push(`danno ×${m.moltiplicatore}`);
  if (m.dopo_armatura?.stato && !m.dopo_armatura.salvezza) parti.push(`${m.dopo_armatura.stato} ${mig.dopo_armatura ?? m.dopo_armatura.valore}`);
  if (m.dopo_armatura?.salvezza) parti.push(`PS ${m.dopo_armatura.salvezza}`);
  if (m.prova?.tipo === 'contrapposta') parti.push('contrapposta');
  if (m.effetto) parti.push(m.effetto);
  if (m.spinta_q) parti.push(`spinta ${m.spinta_q} Q`);
  const riga = parti.join(' · ') || 'danno normale';
  return {
    riga,
    info: {
      titolo: m.nome,
      sottotitolo: m.paragrafo,
      sezioni: [
        { etichetta: 'Effetto', testo: riga },
        { etichetta: 'Azioni', testo: `${m.azioni_principali} ${m.azioni_principali === 1 ? 'Azione Principale' : 'Azioni Principali complessive'}` },
        m.prova ? { etichetta: 'Bersaglio', testo: m.prova.tipo === 'contrapposta' ? `Prova contrapposta contro ${m.prova.contro.join(' o ')}` : 'Difese (Parata o Schivata)' } : null,
        m.compatibilita === 'arma' ? { etichetta: 'Arma', testo: `serve «${m.nome_catalogo}» fra le Manovre compatibili (Armamenti §7.1.7)${m.senz_armi ? '; anche senz’armi' : ''}` } : null,
        m.contatto ? { etichetta: 'Distanza', testo: 'Contatto' } : m.portata ? { etichetta: 'Distanza', testo: 'Contatto o portata' } : null,
        m.mano_libera ? { etichetta: 'Mani', testo: 'una mano libera' } : null,
        m.offensiva !== false ? { etichetta: 'Non si combina', testo: 'con altre manovre offensive (§5.12)' } : null,
        ...(m.frasi ?? []).map((f) => ({ testo: f })),
        m['TODO(Davide)'] ? { etichetta: 'Provvisorio', testo: m['TODO(Davide)'] } : null,
      ].filter(Boolean),
    },
  };
}
