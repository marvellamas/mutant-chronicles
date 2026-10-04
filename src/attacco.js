// Utility d'attacco (backlog voci 5 e 6): funzioni pure, nessun tiro di dado. Il giocatore tira al
// tavolo; qui si calcolano VA finale con la provenienza, Azioni, munizioni, colpi a segno, danno e
// promemoria. Regole e valori in regole.json → attacco_distanza (Giocatore §5.2, §5.8, §5.10,
// §5.11) e negli effetti.attacco_distanza dei Talenti; le modalità di fuoco in modalita_di_fuoco.
//
// Impianto comune (anche per il corpo a corpo, docs/ricognizione-manovre.md §4.1): si parte dal
// VA per colpire effettivo dell'arma (regole, equipaggiamento, condizioni: scheda.equipaggiamento.armi[i]
// con vaEffettivo e scomposizione) e si aggiungono le voci della dichiarazione, ognuna con
// { etichetta, valore, fonte, paragrafo }. Le fonti: regole, equipaggiamento, condizioni già nella
// base; qui movimento, bersaglio, copertura, distanza, mirino, modalità, manovra, talento, situazione.
// Il risultato porta la `provenienza` (src/provenienza.js): le righe della base come nella SD (con la
// scomposizione dell'Abilità in dettaglio) e, sotto, una riga per voce della dichiarazione.
import { aggiungiDanno } from './equipaggiamento.js';
import { bonusDannoCaratteristica } from './calc.js';
import { avvisiStati, limitiStati } from './condizioni.js';
import { riga, provenienza, righeDaScomposizione, righeBase, rigaConDettaglio, rigaBonusCaratteristica } from './provenienza.js';
import { tecnicheAttacco, tecnicheInCorso, mezzoAmmesso } from './tecniche.js';
import { limiteMagistrale } from './prova.js';
import { moltiplicatoreMagistrale } from './danno.js';

export const voce = (etichetta, valore, fonte, paragrafo = null) => ({ etichetta, valore, fonte, paragrafo });
export const somma = (voci) => voci.reduce((s, x) => s + x.valore, 0);
const primaFrase = (t) => String(t ?? '').split(/(?<=\.)\s/)[0];

/**
 * Talenti del personaggio con un effetto sull'attacco: [{ nome, testo, e }].
 * Talenti Liberi dal loro id, Talenti di Classe posseduti dalla scheda (con i loro effetti).
 */
export function talentiAttacco(scheda, dati, chiave = 'attacco_distanza') {
  // interruttore «Bonus dei Talenti» spento (src/talenti.js): le utility calcolano senza i Talenti
  if (scheda?.bonusTalenti === false) return [];
  const liberi = (scheda?.talentiLiberi ?? []).map((t) => dati.talenti_liberi.talenti.find((x) => x.id === t.id)).filter(Boolean);
  const classe = (scheda?.classi ?? []).flatMap((c) => c.talenti ?? []);
  return [...liberi, ...classe].filter((t) => t.effetti?.[chiave] !== undefined)
    .map((t) => ({ nome: t.parametroNome ? `${t.nome} (${t.parametroNome})` : t.nome, testo: t.testo, e: t.effetti[chiave] }));
}

/**
 * Riga «Tecniche attive: …» del risultato di «Attacca!»: le Tecniche Interiori in corso con il loro
 * effetto in breve o la prima regola (§8.9). null se non ce ne sono.
 */
export function rigaTecnicheAttive(sessione, dati) {
  const c = tecnicheInCorso(sessione, dati);
  if (!c.length) return null;
  const parte = (x) => `${x.t.nome} (${x.al === null ? 'finché è attiva' : `fino al Round ${x.al}`})${x.t.effetti?.breve ? ` — ${x.t.effetti.breve}` : x.t.effetti?.promemoria?.[0] ? ` — ${x.t.effetti.promemoria[0]}` : ''}`;
  return `Tecniche attive: ${c.map(parte).join(' · ')}`;
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
 * VA per colpire effettivo con la provenienza, danno e Parata.
 */
export function attaccoBase(arma) {
  return {
    va_finale: arma.vaEffettivo ?? arma.va,
    provenienza: provenienza(righeBase(arma, arma.scomposizione), arma.vaEffettivo ?? arma.va),
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
      coperturaMigliorata: !!b.coperturaMigliorata,
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
    // Talenti con una condizione dichiarata: Rapidità Operativa (primo attacco del combattimento),
    // Tiratore Imboscato (nascosto), Bersaglio Designato (Azioni Principali di preparazione)
    primoAttacco: !!d.primoAttacco,
    nascosto: !!d.nascosto,
    preparazione: Number.isInteger(d.preparazione) && d.preparazione > 0 ? d.preparazione : 0,
    // §5.7: Combattere con due armi (due Armi leggere a distanza o combinazione mista), mano non dominante
    dueArmi: !!d.dueArmi,
    manoNonDominante: !!d.manoNonDominante && !d.dueArmi,
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
  // granate da lancio (§7.20.3): quelle rimaste nella voce
  const colpi = arma.granata ? arma.granata.disponibili ?? null : personaggio.sessione?.munizioni?.[arma.uid]?.colpi ?? null;
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
    // §5.7: due Armi leggere a distanza o combinazione mista; solo Tiro Singolo, senza Tiro Mirato
    dueArmi: (() => {
      const s = secondaArma(personaggio.scheda, arma);
      if (!s.arma) return 'serve una seconda arma impugnata';
      if (!['leggere_distanza', 'mista'].includes(s.combinazione)) return 'combinazione di armi non ammessa (§5.7)';
      if (d.modalita !== 'S') return 'si usa con il Tiro Singolo: non si combina con Tiro Rapido e Raffiche (§5.7)';
      if (d.mirato) return 'non si combina con il Tiro Mirato (§5.7)';
      return null;
    })(),
    secondaArma: secondaArma(personaggio.scheda, arma).arma,
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
 * Modificatori delle scelte dell'attacco a distanza con i Talenti del personaggio, per le etichette del
 * pannello (gli stessi del calcolo): movimento proprio (Movimento Fluido/Tattico), attacco dalla
 * Copertura (Copertura Tattica), bersaglio impegnato (Fuoco Controllato, Fuoco di Precisione).
 * @returns {{ movimento: {corsa, scatto}, copertura: {leggera, media}, impegnato: number, talenti: {movimento, copertura, impegnato} }}
 */
export function modificatoriDistanza(scheda, dati) {
  const A = dati.regole.attacco_distanza;
  const T = talentiAttacco(scheda, dati);
  const con = (k) => T.filter((t) => t.e[k] !== undefined);
  const ridMov = con('movimento_proprio').reduce((best, t) => (t.e.movimento_proprio.riduzione > (best?.e.movimento_proprio.riduzione ?? 0) ? t : best), null);
  const ct = con('copertura_propria')[0] ?? null;
  const imp = con('impegnato').sort((x, y) => (y.e.impegnato.va ?? -99) - (x.e.impegnato.va ?? -99))[0] ?? null;
  const conRid = (pen, r) => (pen < 0 && r ? pen + Math.min(r, -pen) : pen);
  return {
    movimento: { corsa: conRid(A.movimento.proprio.corsa, ridMov?.e.movimento_proprio.riduzione), scatto: conRid(A.movimento.proprio.scatto, ridMov?.e.movimento_proprio.riduzione) },
    copertura: { leggera: conRid(A.copertura.propria.leggera, ct?.e.copertura_propria.riduzione), media: conRid(A.copertura.propria.media, ct?.e.copertura_propria.riduzione) },
    impegnato: imp ? imp.e.impegnato.va : A.bersaglio_impegnato.va,
    talenti: { movimento: ridMov?.nome ?? null, copertura: ct?.nome ?? null, impegnato: imp?.nome ?? null },
  };
}

/** VA di Combattere con due armi per la coppia in mano (§5.7), con il Talento della combinazione. */
export function vaDueArmi(scheda, arma, dati) {
  const R7 = dati.regole.attacco_ravvicinato;
  const s = arma ? secondaArma(scheda, arma) : { combinazione: null };
  const tal = talentiAttacco(scheda, dati, 'attacco_ravvicinato').find((t) => t.e.due_armi?.combinazione === s.combinazione) ?? null;
  return { va: tal ? tal.e.due_armi.va : R7.due_armi.va, talento: tal?.nome ?? null };
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
    // con i Talenti (Tiro Ravvicinato Istintivo riduce la penalità, Migliorato aumenta il danno), come nel calcolo
    const base = M.va_per_abilita[arma?.abilita];
    const tal = T.filter((t) => t.e.ravvicinato);
    const rid = Math.max(0, ...tal.map((t) => t.e.ravvicinato.riduzione ?? 0));
    const danno = Math.max(M.danno, ...tal.map((t) => t.e.ravvicinato.danno ?? 0));
    const va = base === undefined ? undefined : base + Math.min(rid, -base);
    riga = `${va === undefined ? 'solo Armi leggere o medie' : `${conSegno(va)} VA`} · +${danno} danno${tal.length ? ` (${tal.map((t) => t.nome).join(', ')})` : ''}`;
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
 * @returns {{ va_finale, provenienza: { totale, righe }, azioni_principali, azioni_movimento, munizioni, colpi_a_segno, tiri,
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
  const nBase = scomposizione.length;
  const promemoria = [];
  // Stati attivi (regole.json → stati: azioni, limiti): avvisi e divieti dai dati
  const avvisi = avvisiStati(personaggio.sessione, dati);
  const limiti = limitiStati(personaggio.sessione, dati);
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
  // granate da lancio (§7.20.3): quelle rimaste nella voce
  const colpi = arma.granata ? arma.granata.disponibili ?? null : personaggio.sessione?.munizioni?.[arma.uid]?.colpi ?? null;
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
    const vieta = limiti.manovreVietate.get('mirato');
    if (vieta) blocca(`Tiro Mirato non ammesso: ${vieta.nome}. ${vieta.testo} (${vieta.fonte})`);
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
  let penCopertura = 0;
  if (b.copertura === 'totale') blocca('Il bersaglio in Copertura Totale non può essere attaccato direttamente (§5.8).');
  else if (b.copertura !== 'nessuna') {
    // §5.8: Copertura Migliorata del bersaglio porta le penalità a −4 e −6
    const pen = (b.coperturaMigliorata ? A.copertura.bersaglio_migliorata ?? A.copertura.bersaglio : A.copertura.bersaglio)[b.copertura];
    penCopertura = pen;
    aggiungi(`Bersaglio in Copertura ${b.copertura}${b.coperturaMigliorata ? ' (Copertura Migliorata)' : ''}`, pen, 'copertura', A.copertura.paragrafo);
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
  // Rapidità Operativa (Incursore): +2 VA al primo attacco del combattimento, a distanza entro 10 Q
  const primo = con('primo_attacco')[0];
  if (primo && d.primoAttacco && d.distanza <= primo.e.primo_attacco.distanza_max_q) aggiungi(`${primo.nome} (primo attacco)`, primo.e.primo_attacco.va, 'talento', 'Incursore');
  // Tiratore Imboscato (§8.6): nascosto contro un bersaglio inconsapevole, non ad Area: +2 danni al
  // primo colpo e Copertura Leggera ridotta di 2 fino a 0
  const imboscato = con('nascosto')[0];
  // con il Fuoco di Soppressione (effetto ad Area) il Talento non vale: lo si dice
  if (imboscato && d.nascosto && m === 'FS') promemoria.push(`${imboscato.nome}: non vale con il Fuoco di Soppressione (effetto ad Area).`);
  if (imboscato && d.nascosto && b.ignaro && m !== 'FS') {
    const n = imboscato.e.nascosto;
    dannoBonus += n.danno;
    if (n.coperture.includes(b.copertura) && penCopertura < 0) aggiungi(imboscato.nome, Math.min(n.riduzione_copertura, -penCopertura), 'talento', 'Giocatore §8.6');
    promemoria.push(`${imboscato.nome}: +${n.danno} danni soltanto al primo colpo, una volta per Round.`);
  }
  // danni dopo l'Armatura (§5.13): Punto Vitale (Tiro Mirato entro 10 Q), Bersaglio Designato (preparazione)
  const dopo = [];
  const vitale = con('mirato_dopo_armatura')[0];
  if (vitale && d.mirato && d.distanza <= vitale.e.mirato_dopo_armatura.distanza_max_q) {
    const v = vitale.e.mirato_dopo_armatura.valore;
    dopo.push({ etichetta: `+${v} dopo l’Armatura`, testo: `${vitale.nome}: +${v} danni ai PV dopo l’Armatura, solo se almeno 1 danno la supera; una volta per Round, solo la prima istanza, non si moltiplica.` });
  }
  const designato = con('preparazione')[0];
  if (designato && d.preparazione > 0) {
    const p = designato.e.preparazione;
    if (!p.modalita.includes(m)) promemoria.push(`${designato.nome}: vale solo con ${p.modalita.map((x) => MF[x].nome).join(' o ')}.`);
    else {
      const azioniPrep = Math.min(d.preparazione, Math.floor(p.massimo / p.dopo_armatura_per_azione));
      const v = azioniPrep * p.dopo_armatura_per_azione;
      azioniExtra.push(azioniPrep);
      dopo.push({ etichetta: `+${v} dopo l’Armatura`, testo: `${designato.nome}: ${azioniPrep} ${azioniPrep === 1 ? 'Azione Principale' : 'Azioni Principali'} di preparazione, +${v} danni dopo l’Armatura se almeno 1 danno l’ha superata.` });
    }
  }
  // §5.7: Combattere con due armi e mano non dominante (regole in attacco_ravvicinato, valgono per ogni
  // attacco; Talenti in effetti.attacco_ravvicinato: Pistolero, Duellante, Ambidestro)
  const R7 = dati.regole.attacco_ravvicinato;
  const T7 = talentiAttacco(personaggio.scheda, dati, 'attacco_ravvicinato');
  let attacchi = [];
  if (d.dueArmi) {
    if (vincoli.dueArmi) blocca(`Combattere con due armi non possibile: ${vincoli.dueArmi}.`);
    const s = secondaArma(personaggio.scheda, arma);
    const tal = T7.find((t) => t.e.due_armi?.combinazione === s.combinazione);
    scomposizione.push(voce(tal ? `Combattere con due armi (${tal.nome})` : 'Combattere con due armi', tal ? tal.e.due_armi.va : R7.due_armi.va, tal ? 'talento' : 'manovra', R7.due_armi.paragrafo));
    attacchi = [{ etichetta: arma.nome, va: somma(scomposizione) }];
    // la seconda arma a distanza ha gli stessi modificatori del tiro; nella combinazione mista l'arma
    // ravvicinata ha solo la penalità della manovra
    const situazione = s.arma?.tipo === arma.tipo ? somma(scomposizione.slice(nBase)) : scomposizione.at(-1).valore;
    if (s.arma) attacchi.push({ etichetta: s.arma.nome, va: (s.arma.vaEffettivo ?? s.arma.va ?? 0) + situazione, danno: dannoBase(s.arma) });
    promemoria.push('Combattere con due armi: due Prove e risoluzioni separate, ciascuna con il danno e le munizioni della propria arma (§5.7).');
    if (T7.some((t) => t.e.mano_non_dominante)) promemoria.push('Ambidestro non modifica Combattere con due armi (§5.7).');
  } else if (d.manoNonDominante) {
    const amb = T7.find((t) => t.e.mano_non_dominante);
    aggiungi('Mano non dominante', R7.mano_non_dominante.va, 'situazione', R7.mano_non_dominante.paragrafo);
    if (amb) aggiungi(amb.nome, amb.e.mano_non_dominante.va - R7.mano_non_dominante.va, 'talento', R7.mano_non_dominante.paragrafo);
  }
  // Talenti senza numero: una riga con la prima frase (come in «Lancia!»)
  const testuali = con('promemoria').filter((t) => {
    const quando = t.e.promemoria;
    return quando === 'sempre' || (quando === 'ignaro' && b.ignaro) || (quando === 'raffica' && ['RM', 'RL'].includes(m));
  });
  if (testuali.length) promemoria.push(`Talenti: ${testuali.map((t) => `${t.nome} — ${primaFrase(t.testo)}`).join(' · ')}`);
  const tecRiga = rigaTecnicheAttive(personaggio.sessione, dati);
  if (tecRiga) promemoria.push(tecRiga);

  // 8. Azioni (§5.11): distanza e mirino, Mira Rapida (minimo 1), poi Tiro Mirato e Movimento Evasivo
  let azioni = Math.max(azioniDistanza(d.distanza, dati), azioniMinime);
  if (con('azioni_distanza').length) {
    const prima = azioni;
    azioni = Math.max(1, azioni + con('azioni_distanza')[0].e.azioni_distanza);
    if (azioni !== prima) promemoria.push(`${con('azioni_distanza')[0].nome}: ${prima} → ${azioni} ${azioni === 1 ? 'Azione Principale' : 'Azioni Principali'} per la distanza e il mirino (§5.11).`);
  }
  azioni += azioniExtra.reduce((s, x) => s + x, 0);
  if (azioniDistanza(d.distanza, dati) > 1 || azioniMinime > 1) promemoria.push(D.frasi.at(-1));
  const doppie = (personaggio.scheda?.azioni?.principali ?? 1) >= 2;
  if (doppie && A.modalita.raffiche.includes(m)) promemoria.push(A.modalita.frasi[2]);
  if (m === 'FS') promemoria.push(`Fuoco di Soppressione: Area ${A.modalita.area.FS}, dura fino alla tua Iniziativa successiva; chi si espone fa una PS di Volontà (§5.10).`);

  // 9. danno, applicazioni e colpi (§5.10, AC)
  const base = dannoBase(arma);
  // Armamenti §7.20.3: la munizione caricata stabilisce danno, AC, RS e proprietà (Abilità, VA e gittata sono del lanciatore)
  const mun = arma.dannoDaMunizione ? arma.munizioneRiferimento : null;
  if (mun) promemoria.push(`Munizione caricata: ${mun.nome}${mun.danno ? `, danno ${mun.danno}, AC ${mun.ac}` : ', nessun danno'}, RS ${mun.rs_q} Q${mun.proprieta?.length ? `; ${mun.proprieta.join(', ')}` : ''} (§7.20.3). Un colpo consuma una munizione.`);
  else if (arma.dannoDaMunizione) promemoria.push('Il danno dipende dalla munizione caricata.');
  const formula = base ? aggiungiDanno(base, dannoBonus) : null;
  const G = dati.regole.magistrale;
  if (formula && G?.promemoria) promemoria.push(G.promemoria);
  // A.78: gli attacchi si tirano anche con VA finale 20 o più
  const mn = promemoriaMagistraleNaturale(somma(scomposizione), dati, { tiroSempre: true, magistraleMigliorato: haMagistraleMigliorato(personaggio.scheda, dati) });
  if (mn) promemoria.push(mn);

  return {
    va_finale: somma(scomposizione),
    provenienza: provenienza([...righeBase(arma, scomposizione.slice(0, nBase)), ...righeDaScomposizione(scomposizione.slice(nBase))], somma(scomposizione)),
    azioni_principali: azioni,
    azioni_movimento: azioniMovimento,
    munizioni,
    colpi_a_segno: A.modalita.colpi_a_segno[m] ?? 1,
    tiri: A.modalita.tiri[m] ?? 1,
    danno_per_colpo: testoDanno(formula, moltiplicatore),
    // §5.13: con il Successo Magistrale il moltiplicatore sale (come nel corpo a corpo)
    danno_magistrale: formula ? testoDanno(formula, moltiplicatoreMagistrale(moltiplicatore, dati)) : null,
    dopo_armatura: dopo,
    attacchi,
    applicazioni: A.modalita.applicazioni[m] ?? arma.ac ?? 1,
    seconda_prova: secondaProva,
    impossibile,
    promemoria,
    avvisi,
    fascia,
  };
}

// ---------------------------------------------------------------------------
// Attacco ravvicinato e senz'armi (Giocatore §1.6, §5.3–5.7, §5.12, §5.13; regole.json →
// attacco_ravvicinato; effetti.attacco_ravvicinato dei Talenti). Stesso contratto dell'attacco a
// distanza: VA finale con la provenienza, Azioni, danno con moltiplicatori e bonus nell'ordine del
// §5.13, Prova o Salvezza del bersaglio, effetti, promemoria. Nessun tiro, nessun consumo.

export const SENZ_ARMI = 'senz_armi';
/** uid del profilo d'attacco di Onda Interiore (§8.9.4), finché la Tecnica è in corso. */
export const ONDA = 'tecnica:onda-interiore';
const numeroTesto = (n) => (n < 0 ? `−${-n}` : `+${n}`);

/** Valore massimo di un danno «XdY+Z», per scegliere il dado più alto (Arti Marziali, §8.6.1). */
function massimoDanno(testo) {
  const m = /^(\d+)d(\d+)(?:\s*([+−-])\s*(\d+))?$/.exec(String(testo ?? '').trim());
  if (!m) return -Infinity;
  const extra = m[3] ? (m[3] === '+' ? 1 : -1) * Number(m[4]) : 0;
  return Number(m[1]) * Number(m[2]) + extra;
}

/**
 * Profilo «Senz'armi»: Abilità Corpo a corpo (VA effettivo con le condizioni), portata 1 Q. Danno
 * (§5.13; E&L 12, A.22): 1d4 di base, oppure il dado più alto dei Talenti (Arti Marziali 1d6, §8.6.1;
 * Disciplina del Lottatore al suo Grado, §3.5.5), più il bonus di FOR al danno e gli altri bonus.
 */
export function profiloSenzArmi(scheda, dati, { onda = null } = {}) {
  const S = dati.regole.attacco_ravvicinato.senz_armi;
  const a = (scheda?.abilita ?? []).find((x) => x.nome === S.abilita) ?? null;
  // effetti «attacco» e «danno» dell'equipaggiamento che valgono anche senz'armi (Assistenza offensiva
  // dell'elmetto: «comprese armi da lancio e attacchi senz’armi», §7.21.2). Onda Interiore ha Vettore
  // Distanza (§8.9.4): solo i bonus per tutti gli attacchi, non quelli dei soli ravvicinati
  const eq = scheda?.equipaggiamento ?? {};
  // «senz_armi»: solo i pugni (Guanti da Combattimento Mistico, Armamenti §7.24), non Onda Interiore
  const ravv = (b) => b.attacchi === 'tutti' || (!onda && (b.attacchi === 'ravvicinati' || b.attacchi === 'senz_armi'));
  // attivazione accesa dei Guanti: pugni Magici e +1 al danno (Armamenti §7.24)
  const attivazioni = onda ? [] : (eq.attivazioniAccese ?? []).filter((x) => x.attacchi === 'senz_armi');
  const bonusVa = (eq.bonusAttacco ?? []).filter(ravv).map((b) => voce(b.nome, b.valore, 'equipaggiamento'));
  const bonusDannoEq = (eq.bonusDanno ?? []).filter(ravv).reduce((s, b) => s + b.valore, 0);
  // Tecniche in corso con un bonus al danno (Pelle di Rinoceronte: +2 al danno Ravvicinato, §8.9.3)
  const dannoTec = (scheda?.effettiTecniche ?? []).filter((e) => e.tipo === 'danno' && e.ambito === 'generale' && ravv(e));
  const T = talentiAttacco(scheda, dati, 'attacco_ravvicinato');
  // il dado di un Talento vale solo se più alto della base (Lottatore: «si usa il dado più alto applicabile»)
  const daDati = onda ? null : T.filter((t) => t.e.senz_armi?.danno && massimoDanno(t.e.senz_armi.danno) > massimoDanno(S.danno))
    .sort((x, y) => massimoDanno(y.e.senz_armi.danno) - massimoDanno(x.e.senz_armi.danno))[0] ?? null;
  const dannoBase = onda ? onda.dado : daDati?.e.senz_armi.danno ?? S.danno ?? null;
  // §5.13: bonus di FOR al danno, limitato dal livello; Onda Interiore: SAG (A.82, E&L del 03/10/2026)
  const sigla = onda ? (typeof onda.bonusCaratteristica === 'string' ? onda.bonusCaratteristica : null) : dati.regole.danno_caratteristica?.senz_armi ?? null;
  const valoreCar = sigla ? scheda?.caratteristiche?.[sigla]?.valore ?? null : null;
  const bonusCaratteristica = sigla && valoreCar !== null ? { sigla, valore: valoreCar, bonus: bonusDannoCaratteristica(valoreCar, scheda?.livello ?? 1, dati.regole), esclusoDa: null } : null;
  const extra = bonusDannoEq + (bonusCaratteristica?.bonus ?? 0) + dannoTec.reduce((s, e) => s + e.valore, 0) + attivazioni.reduce((s, x) => s + (x.danno ?? 0), 0);
  const danno = dannoBase && extra ? aggiungiDanno(dannoBase, extra) : dannoBase;
  const scomposizione = a ? [...(a.scomposizione ?? [voce('Valore da regole', a.totale, 'regole')]), ...bonusVa] : [];
  const vaEffettivo = a ? (a.effettivo ?? a.totale) + somma(bonusVa) : null;
  // provenienza (src/provenienza.js): VA di Corpo a corpo con la sua scomposizione, poi i bonus
  // dell'equipaggiamento; danno: dado, bonus di FOR (tetto del livello), bonus dell'equipaggiamento
  const prov = a ? provenienza([rigaConDettaglio(`VA ${S.abilita}`, a.effettivo ?? a.totale, a.provenienza), ...righeDaScomposizione(bonusVa)], vaEffettivo) : null;
  const righeDanno = dannoBase ? [
    onda ? riga('Danno di Onda Interiore', dannoBase, onda.nota) : riga('Danno senz’armi', dannoBase, daDati ? `dado di ${daDati.nome}, il più alto (§5.13)` : 'base (§5.13)'),
    ...(bonusCaratteristica ? [rigaBonusCaratteristica(bonusCaratteristica, bonusDannoCaratteristica(valoreCar, Number.MAX_SAFE_INTEGER, dati.regole), scheda?.livello)] : []),
    ...(eq.bonusDanno ?? []).filter(ravv).map((b) => riga(b.nome, b.valore, 'effetto dell’oggetto')),
    ...dannoTec.map((e) => riga(e.talento, e.valore, 'Tecnica Interiore (§8.9)')),
    ...attivazioni.filter((x) => x.danno).map((x) => riga(`${x.nome} (attivazione)`, x.danno, `${x.durata}, ${x.fonte}`)),
  ] : null;
  if (onda) {
    return {
      uid: ONDA, rif: null, nome: 'Onda Interiore', tipo: 'arma_ravvicinata', senzArmi: true, onda: true, abilita: S.abilita,
      va: a?.totale ?? null, vaEffettivo: a ? (a.effettivo ?? a.totale) + somma(bonusVa) : null,
      provenienza: a ? provenienza([rigaConDettaglio(`VA ${S.abilita}`, a.effettivo ?? a.totale, a.provenienza), ...righeDaScomposizione(bonusVa)], (a.effettivo ?? a.totale) + somma(bonusVa)) : null,
      provenienzaDanno: righeDanno ? provenienza(righeDanno, danno) : null,
      scomposizione: (a ? [...(a.scomposizione ?? [voce('Valore da regole', a.totale, 'regole')]), ...bonusVa] : []).map((x, i) => (i === 0 && x.fonte === 'regole' ? { ...x, etichetta: `VA ${S.abilita}` } : x)),
      danno: { una_mano: danno, due_mani: null }, dannoBase, dannoOrigine: onda.nota, dannoDaDati: true, bonusCaratteristica,
      mani: 1, portataQ: onda.gittataQ, manovre: [], natura: onda.natura, tecnica: onda.tecnica,
    };
  }
  return {
    uid: SENZ_ARMI, rif: null, nome: 'Senz’armi', tipo: 'arma_ravvicinata', senzArmi: true, abilita: S.abilita,
    va: a?.totale ?? null, vaEffettivo, provenienza: prov,
    provenienzaDanno: righeDanno ? provenienza(righeDanno, danno) : null,
    scomposizione: scomposizione.map((x, i) => (i === 0 && x.fonte === 'regole' ? { ...x, etichetta: `VA ${S.abilita}` } : x)),
    danno: { una_mano: danno, due_mani: null }, dannoBase, dannoOrigine: daDati ? daDati.nome : 'base', dannoDaDati: true, bonusCaratteristica,
    mani: 1, portataQ: S.portata_q, manovre: [],
    // Guanti attivati: «i danni dei pugni diventano Magici» (Armamenti §7.24)
    ...(attivazioni.find((x) => x.natura) ? { natura: attivazioni.find((x) => x.natura).natura } : {}),
  };
}

/**
 * Profilo d'attacco di Onda Interiore (Giocatore §8.9.4), solo mentre la Tecnica è in corso: Prova di
 * Corpo a corpo, gittata 6 Q, Vettore Distanza, danno Magico; dado dalla tabella della scheda per la
 * Disciplina e il Grado nella Classe Lottatore (tecniche_interiori.json → effetti.attacco.onda), più i
 * bonus pertinenti al singolo attacco. null se Onda Interiore non è in corso.
 */
export function profiloOndaInteriore(scheda, sessione, dati) {
  const c = tecnicheAttacco(sessione, dati).find((x) => x.e.onda);
  if (!c) return null;
  const O = c.e.onda;
  const lot = (scheda?.classi ?? []).find((x) => x.nome === 'Lottatore');
  const t = lot?.talenti?.find((x) => x.sceltaParametro) ?? null;
  const tabella = O.danno_per_disciplina[t?.sceltaParametro] ?? null;
  const grado = lot?.grado ?? 1;
  const chiave = Object.keys(tabella ?? {}).map(Number).filter((k) => k <= grado).sort((a, b) => b - a)[0];
  const dado = tabella?.[chiave] ?? null;
  const nota = dado ? `${t.parametroNome ?? t.sceltaParametro}, Grado ${grado} di Lottatore (§8.9.4)` : 'Disciplina del Lottatore non scelta';
  return profiloSenzArmi(scheda, dati, { onda: { dado, nota, gittataQ: O.gittata_q, natura: O.natura, bonusCaratteristica: O.bonus_caratteristica ?? null, tecnica: c } });
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
      coperturaMigliorata: !!b.coperturaMigliorata,
      distanza: Number.isFinite(b.distanza) && b.distanza >= 1 ? Math.round(b.distanza) : 1,
    },
    manovra: manovra.length ? manovra : ['normale'],
    bersagli: [2, 3].includes(d.bersagli) ? d.bersagli : 2,
    // §5.12 (E&L 7–8): opposizione scelta dal bersaglio prima del tiro (Sbilanciare, Disarmare)
    opposizione: typeof d.opposizione === 'string' && d.opposizione ? d.opposizione : null,
    // §5.3 (E&L 14): attaccanti in ravvicinato contro lo stesso bersaglio, compreso il personaggio
    attaccanti: Number.isInteger(d.attaccanti) && d.attaccanti >= 1 ? d.attaccanti : 1,
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

/**
 * Valori a parte della Disciplina del Lottatore (§3.5.5) per la tab Combattimento: Guardia, bonus a
 * Difese contro gli attacchi ravvicinati (con Padronanza della Disciplina contro tutti gli attacchi
 * diretti percepibili, anche a distanza); Controllo con Padronanza, lo stesso bonus per resistere alle
 * Manovre, mantenere una presa o liberarsi da Immobilizzato. [{ nome, valore, contro, testo }]
 */
export function valoriDisciplina(scheda, dati) {
  const T = talentiAttacco(scheda, dati, 'attacco_ravvicinato');
  const pad = T.find((t) => t.e.padronanza_disciplina) ?? null;
  const out = [];
  for (const t of talentiAttacco(scheda, dati, 'difese_ravvicinate').filter((x) => x.e.va)) {
    const tutti = !!pad?.e.padronanza_disciplina.guardia?.anche_distanza;
    out.push({ nome: t.nome, valore: t.e.va, contro: tutti ? 'diretti' : 'ravvicinati',
      testo: tutti ? `Contro gli attacchi diretti percepibili, anche a distanza (${pad.nome})` : 'Contro attacchi ravvicinati' });
  }
  if (pad?.e.padronanza_disciplina.controllo?.anche_resistenza) {
    for (const t of T.filter((x) => x.e.controllo)) {
      out.push({ nome: t.nome, valore: t.e.controllo.va, contro: 'resistenza',
        testo: `Per resistere a ${t.e.controllo.manovre.map((x) => dati.regole.attacco_ravvicinato.manovre[x]?.nome ?? x).join(', ')}, mantenere una presa o liberarsi da Immobilizzato (${pad.nome})` });
    }
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
  // §5.7: «due armi ravvicinate a una mano, due armi leggere a distanza oppure una combinazione mista»
  const leggeraDistanza = (x) => x.tipo === 'arma_distanza' && x.abilita === 'Armi leggere';
  const combinazione = ravv(arma) && ravv(s) ? (unaMano(arma) && unaMano(s) ? 'ravvicinate' : null)
    : leggeraDistanza(arma) && leggeraDistanza(s) ? 'leggere_distanza'
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

/** Il personaggio ha Successo Magistrale Migliorato (§8.6.1), con i Talenti accesi? */
export function haMagistraleMigliorato(scheda, dati) {
  const id = dati.regole.prova.magistrale_migliorato?.talento;
  return !!id && scheda?.bonusTalenti !== false && (scheda?.talentiLiberi ?? []).some((t) => t.id === id);
}

/**
 * Promemoria del tiro per VA finale, o null:
 * - A.78 (E&L del 02/10): con `tiroSempre` (attacchi e Difese) e VA finale 20 o più si tira comunque;
 * - §1.6 (Giocatore del 29/09): con VA finale almeno 21 anche il 2 naturale è Magistrale;
 * - Successo Magistrale Migliorato (§8.6.1, A.78): naturali Magistrali 1–2, o 1–3 da VA 21.
 */
export function promemoriaMagistraleNaturale(va, dati, { tiroSempre = false, magistraleMigliorato = false } = {}) {
  if (!Number.isFinite(va)) return null;
  const M = dati.regole.magistrale_naturale;
  const P = dati.regole.prova;
  const parti = [];
  if (tiroSempre && va >= P.successo_automatico_da && P.tiro_sempre) parti.push(`VA finale ${va}: ${P.tiro_sempre.promemoria} (A.78).`);
  if (magistraleMigliorato) {
    const l = limiteMagistrale(va, dati, { magistraleMigliorato: true });
    parti.push(`Successo Magistrale Migliorato: con VA finale ${va} sono Magistrali i naturali 1–${l}, se la Prova riesce (§8.6.1, A.78).`);
  } else if (M && va >= M.soglia_va) parti.push(`VA finale ${va}: ${M.promemoria} (${M.paragrafo}).`);
  return parti.length ? parti.join(' ') : null;
}

// §1.6: il moltiplicatore con il Magistrale sta in src/danno.js (regola del danno, non del solo
// corpo a corpo: regole.json → magistrale), e lo usa anche il danno applicato al tavolo
export { moltiplicatoreMagistrale };

/**
 * Attacco ravvicinato o senz'armi.
 * @param personaggio { scheda (calcolaScheda, con la sessione), sessione }
 * @param arma una voce di scheda.equipaggiamento.armi (arma ravvicinata impugnata) o profiloSenzArmi()
 * @param dichiarazione vedi dichiarazioneRavvicinato()
 * @returns {{ va_finale, provenienza: { totale, righe }, attacchi: [{etichetta, va}], manovra, azioni_principali, azioni_movimento,
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
    return { va_finale: null, provenienza: provenienza([], null), attacchi: [], manovra: null, azioni_principali: 0, azioni_movimento: 0, prova: null, danno: null, dopo_armatura: [], effetti: [], impossibile: { motivo: `Manovra sconosciuta: ${id}.` }, promemoria, avvisi };
  }
  const vm = vincoli.manovre[id];
  if (vm?.motivo) blocca(`${m.nome} non ammessa: ${vm.motivo}.`);
  // Stati attivi (regole.json → stati: azioni, limiti): avvisi e divieti dai dati
  avvisi.push(...avvisiStati(personaggio.sessione, dati)); // ogni attacco è un'azione offensiva (Terrorizzato)
  const vieta = limitiStati(personaggio.sessione, dati).manovreVietate.get(id);
  if (vieta) blocca(`${m.nome} non ammessa: ${vieta.nome}. ${vieta.testo} (${vieta.fonte})`);
  const idMig = m.riduzione_da ?? id;
  const mig = con('manovra').find((t) => t.e.manovra[idMig]);
  const migE = mig?.e.manovra[idMig] ?? {};

  // 2. base: VA effettivo dell'arma. Prove contrapposte (§5.12): Corpo a corpo se la Manovra lo chiede
  // (Immobilizzare); altrimenti l'Abilità del mezzo dichiarato, senza scegliere il VA maggiore
  // (Sbilanciare, Disarmare: E&L 7–8, A.41): senz'armi Corpo a corpo, con un'arma la sua Abilità
  let base = (arma.scomposizione?.length ? arma.scomposizione : [voce(`VA ${arma.abilita}`, arma.va ?? 0, 'regole')]).map((x) => ({ paragrafo: null, ...x }));
  let baseRighe = righeBase(arma, base);
  const corpo = (personaggio.scheda?.abilita ?? []).find((x) => x.nome === R.senz_armi.abilita);
  const delMezzo = (m.prova?.abilita ?? []).includes('mezzo');
  if (m.prova?.tipo === 'contrapposta' && corpo && !arma.senzArmi && !delMezzo) {
    base = (corpo.scomposizione ?? [voce('Valore da regole', corpo.totale, 'regole')]).map((x, i) => ({ paragrafo: null, ...x, etichetta: i === 0 && x.fonte === 'regole' ? `VA ${corpo.nome}` : x.etichetta }));
    baseRighe = [rigaConDettaglio(`VA ${corpo.nome}`, somma(base), corpo.provenienza)];
  }
  if (delMezzo && !arma.senzArmi) promemoria.push(`${m.nome}: usi l’Abilità dell’arma dichiarata (${arma.abilita}); per usare Corpo a corpo scegli «Senz’armi» (§5.12).`);
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
      : `${m.nome}: bersagli adiacenti fra loro e tutti entro la portata (${vincoli.portata} Q), senza spostarti; una Prova, un colpo, le Difese e l’Armatura di ciascun bersaglio (§5.12).`);
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
  else if (b.copertura !== 'nessuna') {
    // §5.8 (E&L 13): vale se l'ostacolo protegge davvero dalla direzione dell'attacco
    const C = R.copertura;
    aggiungi(situazione, `Bersaglio in Copertura ${b.copertura}${b.coperturaMigliorata ? ' (Copertura Migliorata)' : ''}`, (b.coperturaMigliorata ? C.bersaglio_migliorata : C.bersaglio)[b.copertura], 'bersaglio', C.paragrafo);
    promemoria.push(C.frasi[0]);
  }
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
  // Tecniche Interiori in corso (§8.9, tecniche_interiori.json → effetti.attacco): lette da qui come i Talenti
  const TEC = tecnicheAttacco(personaggio.sessione, dati);
  const tecVale = TEC.filter((c) => mezzoAmmesso(c.e, arma));
  for (const c of TEC.filter((x) => (x.e.mezzi || x.e.armi) && !mezzoAmmesso(x.e, arma) && !x.e.onda)) {
    avvisi.push(`${c.nome}: non vale con ${arma.senzArmi ? 'un attacco senz’armi' : arma.nome}${c.e.armi ? ` (senz’armi o ${c.e.armi.join(', ')})` : ''}.`);
  }
  // Presa dell'Anima: +3 VA alla prova senz'armi per Immobilizzare, Sbilanciare, Disarmare
  for (const c of tecVale.filter((x) => (x.e.manovre ?? []).includes(id))) aggiungi(situazione, c.etichetta, c.e.va, 'tecnica', 'Giocatore §8.9.4');
  // Pelle di Rinoceronte (§8.9.3; A.81, E&L del 03/10/2026): +3 alla Prova offensiva di Corpo a corpo di
  // Immobilizzare, Sbilanciare, Disarmare e Incalzare; non con l'Abilità dell'arma, non a Difese
  for (const c of TEC.filter((x) => x.e.manovre_forza?.manovre?.includes(id))) {
    if (usaCorpo) aggiungi(situazione, c.etichetta, c.e.manovre_forza.va, 'tecnica', 'Giocatore §8.9.3');
    promemoria.push(`${c.nome}: ${c.e.manovre_forza.frase} ${c.e.manovre_forza.decisione ?? ''}${usaCorpo ? '' : ' Con quest’arma la Prova usa la sua Abilità: nessun +3.'}`);
  }
  // Onda Interiore: un singolo attacco normale a distanza (§8.9.4)
  if (arma.onda) {
    if (id !== 'normale' || m.attacchi || d.dueArmi || d.carica || d.controcarica) blocca(`Onda Interiore: ${arma.tecnica.e.onda.frasi.at(-1)}`);
    promemoria.push(...arma.tecnica.e.onda.frasi.slice(0, 3));
  }
  if (d.circostanza) aggiungi(situazione, 'Circostanza del Direttore', d.circostanza, 'situazione', 'Giocatore §1.4');
  // §5.3 (E&L 14): Superiorità numerica, secondo gli attaccanti che partecipano davvero
  const SN = R.superiorita_numerica;
  if (SN && d.attaccanti > 1) {
    const f = SN.fasce.find((x) => d.attaccanti >= x.da && (x.a === null || d.attaccanti <= x.a));
    aggiungi(situazione, `Superiorità numerica (${d.attaccanti} attaccanti)`, f?.va ?? 0, 'situazione', SN.paragrafo);
  }

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
    if (s.arma) attacchi.push({ etichetta: s.arma.nome, va: (s.arma.vaEffettivo ?? s.arma.va) + somma(situazione) + va2, danno: dannoBase(s.arma) });
    if (con('mano_non_dominante').length) promemoria.push('Ambidestro non modifica Combattere con due armi (§5.7).');
    if ((personaggio.scheda?.azioni?.principali ?? 1) >= 2) promemoria.push(D.frasi[2]);
  } else if (m.attacchi) {
    attacchi = Array.from({ length: m.attacchi }, (_, i) => ({ etichetta: `${m.nome}, attacco ${i + 1}`, va: somma(scomposizione) }));
  } else attacchi = [{ etichetta: m.va_per_bersagli ? `${m.nome} (una Prova)` : arma.nome, va: somma(scomposizione) }];

  // 7. danno (§5.13): dadi → bonus ordinari → moltiplicatore più alto → Difesa → Armatura → dopo l'Armatura
  const dopo = [];
  let danno = null;
  if (!(m.danno === null && !migE.danno_normale)) {
    // Immobilizzare Istintivo (§8.6): la presa infligge «il normale danno senz’armi», anche se è
    // dichiarata un’arma in mano
    const mezzoDanno = id === 'immobilizzare' && !arma.senzArmi ? profiloSenzArmi(personaggio.scheda, dati) : arma;
    const baseDanno = dannoBase(mezzoDanno);
    dannoBonus += migE.danno ?? m.danno ?? 0;
    if (!baseDanno) {
      avvisi.push('Danno dell’arma non definito.');
    }
    const formula = baseDanno ? aggiungiDanno(baseDanno, dannoBonus) : null;
    const mm = moltiplicatoreMagistrale(moltiplicatore, dati);
    // Salto della Rana in Carica (§8.9.3): +3 danni dopo il moltiplicatore e prima dell'AR, non moltiplicati
    const rana = d.carica ? tecVale.find((c) => c.e.carica) : null;
    const dopoMolt = rana?.e.carica.danno_dopo_moltiplicatore ?? 0;
    const conDopo = (t) => (t && dopoMolt ? `${t} +${dopoMolt}` : t);
    if (rana) promemoria.push(`${rana.nome}: ${rana.e.carica.frase}`);
    // natura del danno: Colpo Interiore lo rende Etereo, Onda Interiore è Magico (§8.9.2, §8.9.4)
    const natura = tecVale.find((c) => c.e.natura)?.e.natura ?? mezzoDanno.natura ?? null;
    danno = {
      base: baseDanno, bonus: dannoBonus, formula, moltiplicatore, moltiplicatore_magistrale: mm,
      testo: formula ? conDopo(testoDanno(formula, moltiplicatore)) : null, testo_magistrale: formula ? conDopo(testoDanno(formula, mm)) : null,
      origine: mezzoDanno.senzArmi ? mezzoDanno.dannoOrigine : null,
      ...(dopoMolt ? { dopo_moltiplicatore: dopoMolt } : {}), ...(natura ? { natura } : {}),
    };
    for (const c of tecVale.filter((x) => x.e.natura)) promemoria.push(`${c.nome}: ${c.e.frasi[0]}`);
    // Colpo del Cobra, Vipera dal Cappuccio, Pugno di Pietra: righe dopo l'Armatura
    for (const c of tecVale) for (const x of c.e.dopo_armatura ?? []) dopo.push({ etichetta: x.etichetta, testo: `${c.nome}: ${x.testo}` });
    if (m.dopo_armatura?.stato && !m.dopo_armatura.salvezza) {
      const v = migE.dopo_armatura ?? m.dopo_armatura.valore;
      dopo.push({ etichetta: `${m.dopo_armatura.stato} ${v}`, testo: `Se almeno 1 danno supera l’Armatura: ${m.dopo_armatura.stato} ${v} (§5.15).` });
    }
    if (m.dopo_armatura?.salvezza) dopo.push({ etichetta: `PS ${m.dopo_armatura.salvezza}`, testo: `Se almeno 1 danno supera l’Armatura, il bersaglio fa una PS ${m.dopo_armatura.salvezza}; se fallisce è ${m.dopo_armatura.stato} per ${m.dopo_armatura.durata} (§5.18).` });
    if (migE.dopo_armatura && !m.dopo_armatura) dopo.push({ etichetta: `+${migE.dopo_armatura} dopo l’Armatura`, testo: `${mig.nome}: +${migE.dopo_armatura} danni ai PV dopo l’Armatura, solo se almeno 1 danno la supera; non si moltiplica.` });
    if (moltiplicatore > 1) promemoria.push(`Con un Successo Magistrale il danno ×${moltiplicatore} diventa ×${mm} (§1.6).`);
    if (dati.regole.magistrale.promemoria) promemoria.push(dati.regole.magistrale.promemoria);
  }
  const effetti = [];
  if (m.effetto) effetti.push(`Con successo: ${m.effetto}.`);
  if (m.spinta_q) effetti.push(`Il bersaglio arretra di ${m.spinta_q} Q${migE.danno_normale ? ' e subisce il danno normale' : ' e non subisce danni'} (§5.5).`);
  if (m.preparazione) promemoria.push(`${m.nome}: ${m.frasi[0]}`);
  if (id === 'mirato') promemoria.push(`${m.nome}: ${m.frasi[1]} ${m.frasi[2]}`);

  // 8. Prova o Salvezza del bersaglio
  let prova;
  if (m.prova?.tipo === 'contrapposta') {
    const chi = m.prova.abilita.map((x) => (x === 'mezzo' || x === 'arma' ? arma.abilita : x)).join(' o ');
    const scelta = m.prova.scelta_bersaglio && m.prova.contro.includes(d.opposizione) ? d.opposizione : null;
    if (m.prova.scelta_bersaglio && !scelta) avvisi.push(`${m.nome}: il bersaglio sceglie prima del tiro fra ${m.prova.contro.join(' e ')}; selezionala nel pannello (§5.12).`);
    prova = { tipo: 'contrapposta', opposizione: scelta, opposizioni: m.prova.contro,
      testo: `Prova contrapposta: ${chi} contro ${scelta ?? m.prova.contro.join(' o ')} del bersaglio${m.prova.scelta_bersaglio ? (scelta ? ' (scelta dal bersaglio prima del tiro)' : ' (la sceglie il bersaglio prima del tiro)') : ''}.` };
  } else prova = { tipo: 'per_colpire', testo: `Il bersaglio si difende con le Difese (Parata o Schivata, §5.9)${m.dopo_armatura?.salvezza ? `, poi PS ${m.dopo_armatura.salvezza}` : ''}.` };
  if (id === 'incalzare') prova.testo += ' Incalzare: normale Prova per colpire, non contrapposta (§5.5).';
  // Vipera dal Cappuccio (§8.9.3), Onda Interiore (§8.9.4): non parabili con un'arma
  for (const c of tecVale.filter((x) => x.e.non_parabile)) prova.testo += ` ${c.nome}: ${c.e.frasi[0]}`;
  if (arma.onda) prova.testo = `Il bersaglio si difende con le Difese. ${arma.tecnica.e.onda.frasi[2]}`;
  for (const c of tecVale.filter((x) => x.e.dopo_armatura && x.e.frasi?.length && !x.e.non_parabile)) promemoria.push(`${c.nome}: ${c.e.frasi.join(' ')}`);

  // 9. Talenti senza numero: una riga con la prima frase (come in «Lancia!»)
  const testuali = con('promemoria').filter((t) => {
    const q = t.e.promemoria;
    return q === 'sempre' || (q === 'senz_armi' && arma.senzArmi) || (q === 'immobilizzare' && id === 'immobilizzare');
  });
  if (testuali.length) promemoria.push(`Talenti: ${testuali.map((t) => `${t.nome} — ${primaFrase(t.testo)}`).join(' · ')}`);
  const tecRiga = rigaTecnicheAttive(personaggio.sessione, dati);
  if (tecRiga) promemoria.push(tecRiga);

  const mn = promemoriaMagistraleNaturale(attacchi[0]?.va ?? somma(scomposizione), dati, { tiroSempre: true, magistraleMigliorato: haMagistraleMigliorato(personaggio.scheda, dati) });
  if (mn) promemoria.push(mn);

  return {
    va_finale: attacchi[0]?.va ?? somma(scomposizione),
    provenienza: provenienza([...baseRighe, ...righeDaScomposizione(scomposizione.slice(base.length))], attacchi[0]?.va ?? somma(scomposizione)),
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
  // la versione Migliorata della manovra di riferimento (Combattimento Multiplo usa Spazzata Migliorata), come nel calcolo
  const mig = T.find((t) => t.e.manovra?.[m.riduzione_da ?? id])?.e.manovra[m.riduzione_da ?? id] ?? {};
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
