// Utility «Lancia un incantesimo» (backlog voce 4): funzione pura, nessun tiro di dado. Stesso
// impianto di src/attacco.js: si parte dal Potere effettivo per lanciare (regole, equipaggiamento,
// condizioni, penalità d'armatura al lancio) e si aggiungono le voci della dichiarazione, ognuna
// con { etichetta, valore, fonte, paragrafo }. Regole e frasi in regole.json → lancio (Magia sez.
// 1–3, 5–7, 12.3; Giocatore §1.4, §1.7); dati di ogni scheda in incantesimi.json → meccanica;
// Talenti con effetti.lancio (e effetti.magia già calcolati nella scheda: Focalizzazione, Ingaggio,
// tiro con Armi da lancio).
import { voce, somma, talentiAttacco, promemoriaMagistraleNaturale, haMagistraleMigliorato, rigaTecnicheAttive } from './attacco.js';
import { avvisiStati } from './condizioni.js';
import { provenienza, righeDaScomposizione, rigaConDettaglio } from './provenienza.js';
import { bonusDannoCaratteristica } from './calc.js';
import { aggiungiDanno } from './equipaggiamento.js';
import { effettiTalenti } from './talenti.js';
import { valoreAnticipato } from './anticipazione.js';

const GRADI_ROMANI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
/** «2d6+5» + 1 dado → «3d6+5» (il primo gruppo di dadi; Sovraccarico Controllato). */
export function aggiungiDado(formula, n = 1) {
  return n ? String(formula).replace(/(\d+)d(\d+)/, (_, a, f) => `${Number(a) + n}d${f}`) : formula;
}
/** Risultato massimo di una formula («3d6+2» → 20): ogni dado al massimo, poi i fissi (Magia, Incantesimi Massimizzati). */
export function massimoFormula(formula) {
  let tot = 0;
  for (const m of String(formula).replace(/\s+/g, '').matchAll(/([+-]?)(\d+)(?:d(\d+))?/g)) {
    const v = m[3] ? Number(m[2]) * Number(m[3]) : Number(m[2]);
    tot += m[1] === '-' ? -v : v;
  }
  return tot;
}

const numero = (v) => { const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : null; };
/** Livello di una riga delle versioni (colonne «Livello» oppure «Livello e PM»). */
export const livelloVersione = (r) => numero(r?.Livello ?? r?.['Livello e PM']);
const pmVersione = (r) => numero(r?.PM ?? r?.['Livello e PM']);
const modPsVersione = (r) => { const k = Object.keys(r ?? {}).find((x) => /^Mod\.? PS$/.test(x)); return k ? String(r[k]) : null; };
// energia dei contenitori → PM utilizzabili della scheda (Magia sez. 6)
const PM_DI_ENERGIA = { Universale: 'universali', Fisica: 'fisici', Mentale: 'mentali', Spirituale: 'spirituali' };

const CATEGORIE_TALENTO = { durata: 'la Durata', bersagli: 'il numero di Bersagli', area: 'l’Area', gittata: 'la Gittata', valori: 'i valori numerici' };

/**
 * Anticipazione di un lancio (Magia sez. 12.3, Talenti con effetti.lancio): cosa vale davvero con i
 * Talenti del personaggio (righe { testo, fonte } per il riquadro, con la provenienza), il valore
 * anticipato dalla scala della scheda (src/anticipazione.js) e gli aspetti consentiti dalla scheda.
 * @returns {{ regole: {testo, fonte}[], consentiti: string, talentiNonUsabili: string[], valore: object|null }|null}
 */
export function regoleAnticipazione(m, aspetto, versione, con, dati, righe = []) {
  const aspetti = m.anticipazione?.aspetti ?? [];
  if (!aspetti.length) return null;
  const A = dati.regole.lancio.anticipazione;
  const fonteSez = A.paragrafo;
  const raddoppio = con('anticipazione_senza_raddoppio');
  const migliorata = con('anticipazione_senza_difficolta')[0] ?? null;
  const categorie = new Set(aspetti.map((a) => a.categoria));
  const consentiti = `La scheda di questo incantesimo consente: ${aspetti.map((a) => a.nome ?? a.etichetta).join(', ')}.`;
  // Talenti di Anticipazione che questa scheda non permette di usare (Incantesimi Plurimi senza Bersagli)
  const talentiNonUsabili = raddoppio.filter((t) => !categorie.has(t.e.anticipazione_senza_raddoppio))
    .map((t) => `${t.nome}: qui non si usa, la scheda non consente di anticipare ${CATEGORIE_TALENTO[t.e.anticipazione_senza_raddoppio] ?? t.e.anticipazione_senza_raddoppio}.`);
  const regole = [];
  const pm = versione?.pm ?? null;
  if (aspetto) {
    const t = raddoppio.find((x) => x.e.anticipazione_senza_raddoppio === aspetto.categoria);
    regole.push(t ? { testo: `${t.nome}: niente raddoppio PM (${pm} PM).`, fonte: `Talento ${t.nome}` }
      : { testo: `PM ×${A.moltiplicatore_costo}: ${pm} → ${pm * A.moltiplicatore_costo} PM.`, fonte: fonteSez });
  } else {
    for (const t of raddoppio.filter((x) => categorie.has(x.e.anticipazione_senza_raddoppio))) {
      regole.push({ testo: `${t.nome}: anticipando ${CATEGORIE_TALENTO[t.e.anticipazione_senza_raddoppio]} niente raddoppio PM; gli altri aspetti costano ×${A.moltiplicatore_costo}.`, fonte: `Talento ${t.nome}` });
    }
    if (!regole.length) regole.push({ testo: `PM ×${A.moltiplicatore_costo} per l’aspetto anticipato.`, fonte: fonteSez });
  }
  regole.push(migliorata
    ? { testo: `${migliorata.nome}: Prova obbligatoria, con la difficoltà del livello dichiarato.`, fonte: `Talento ${migliorata.nome}` }
    : { testo: 'Prova obbligatoria, Potere più difficile di una categoria (Anticipazione Migliorata la eliminerebbe).', fonte: fonteSez });
  regole.push({ testo: 'Non cumulabile con Calcolo Arcano sullo stesso lancio.', fonte: fonteSez });
  const valore = aspetto ? { ...valoreAnticipato(aspetto, versione?.riga, righe), aspetto: aspetto.nome ?? aspetto.etichetta, conseguenze: aspetto.conseguenze ?? [] } : null;
  return { regole, consentiti, talentiNonUsabili, valore };
}

/** Dichiarazione completa, con i valori predefiniti. */
export function dichiarazioneLancio(d = {}) {
  return {
    versione: Number.isInteger(d.versione) ? d.versione : null,
    anticipazione: Number.isInteger(d.anticipazione) ? d.anticipazione : null, // indice dell'aspetto
    focalizzazione: !!d.focalizzazione,
    ingaggio: !!d.ingaggio,
    componentiMancanti: Array.isArray(d.componentiMancanti) ? d.componentiMancanti.filter((c) => typeof c === 'string') : [],
    circostanza: Number.isInteger(d.circostanza) ? Math.max(-8, Math.min(8, d.circostanza)) : 0,
    effettiMagici: Array.isArray(d.effettiMagici) ? d.effettiMagici.filter((e) => e && Number.isInteger(e.valore) && e.valore !== 0).map((e) => ({ nome: String(e.nome ?? 'Effetto magico'), valore: e.valore })) : [],
    fonte: ['personali', 'contenitore', 'misto'].includes(d.fonte) ? d.fonte : 'personali',
    contenitore: typeof d.contenitore === 'string' ? d.contenitore : null,
    quotaContenitore: Number.isInteger(d.quotaContenitore) && d.quotaContenitore > 0 ? d.quotaContenitore : 1,
    riservaTecnica: !!d.riservaTecnica,
    // Talenti di lancio situazionali accesi per questo lancio (chiavi di src/talenti.js): Sovraccarico
    // Controllato, Incantesimi Massimizzati
    talentiLancio: Array.isArray(d.talentiLancio) ? d.talentiLancio.filter((x) => typeof x === 'string') : [],
    // Rituale (Magia §24.6): i Canali, ciascuno con il VA pertinente e i PM che versa
    canali: Array.isArray(d.canali) ? d.canali.filter((c) => c && Number.isInteger(c.va) && Number.isInteger(c.pm) && c.pm >= 0).slice(0, 6).map((c) => ({ va: c.va, pm: c.pm })) : [],
  };
}

/**
 * Versioni della scheda con il motivo se non accessibili: livello oltre il massimo del personaggio; per
 * un Rituale con procedura definita (Rigenerazione, Magia §25.1) il Grado accessibile con Ritualista.
 */
export function versioniLancio(incantesimo, scheda, dati = null) {
  const max = scheda?.incantesimi?.livelloMassimo ?? 0;
  const P = incantesimo.meccanica?.procedura_rituale;
  if (P?.stato === 'definita' && dati?.regole?.rituali) {
    return (incantesimo.versioni ?? []).map((r) => {
      const livello = livelloVersione(r);
      const pv = P.versioni.find((x) => x.livello === livello);
      return { livello, pm: pv?.pm ?? livello, riga: r, motivo: pv ? accessoRituale(pv.grado, scheda, dati).motivo : 'versione assente dalla tabella del Rituale' };
    });
  }
  return (incantesimo.versioni ?? []).map((r) => {
    const livello = livelloVersione(r);
    return { livello, pm: pmVersione(r) ?? livello, riga: r, motivo: livello > max ? `oltre il tuo livello massimo (${max})` : null };
  });
}

/**
 * Stato del pulsante «Lancia!» di un incantesimo conosciuto: si lancia se almeno una versione è
 * accessibile, qualunque siano i livelli della scheda (anche solo 3 e 6) e le sue colonne. Altrimenti
 * il pulsante resta, disabilitato, con il motivo «richiede livello N» (la versione più bassa).
 */
export function statoPulsanteLancio(incantesimo, scheda, dati = null) {
  const v = versioniLancio(incantesimo, scheda, dati);
  if (v.some((x) => !x.motivo)) return { disabilitato: false, motivo: null };
  // Rituale (Magia §25.1): il motivo è il Talento che manca per il Grado più basso
  if (incantesimo.meccanica?.procedura_rituale?.stato === 'definita' && dati?.regole?.rituali && v.length) return { disabilitato: true, motivo: `Rituale: ${v[0].motivo}` };
  const minimo = v.map((x) => x.livello).filter(Number.isInteger).sort((a, b) => a - b)[0];
  return { disabilitato: true, motivo: minimo ? `richiede livello ${minimo}` : 'nessuna versione nella scheda' };
}

/**
 * Contenitori per il lancio: compatibilità con la macrofamiglia e con i PM utilizzabili della scheda.
 * Risposta A.18 (Magia §24.2, §24.7): la riserva integrata di un Artefatto alimenta soltanto le sue
 * funzioni, «non permette di prelevare PM né di alimentare gli incantesimi personali»: non è una fonte.
 */
export function contenitoriLancio(personaggio, incantesimo) {
  const m = incantesimo.meccanica ?? {};
  return (personaggio.scheda?.equipaggiamento?.contenitori ?? []).filter((c) => !c.integrato).map((c) => {
    const pm = personaggio.sessione?.chroma?.[c.uid]?.pmAttuali ?? c.capacita ?? 0;
    const tipoPm = PM_DI_ENERGIA[c.energiaNome];
    const motivo = !c.trasportato ? 'non trasportato' : !c.sintonizzato ? 'non sintonizzato'
      : c.regoleRimandate || !c.macrofamiglie?.includes(incantesimo.macrofamiglia) || (m.pm_utilizzabili && !m.pm_utilizzabili.includes(tipoPm))
        ? `energia ${c.energiaNome ?? c.energia} non compatibile con un incantesimo ${incantesimo.macrofamiglia} (PM ${(m.pm_utilizzabili ?? []).join(' o ')})`
        : pm <= 0 ? 'vuoto' : null;
    return { uid: c.uid, nome: c.nome, energia: c.energia, energiaNome: c.energiaNome, pm, capacita: c.capacita, motivo };
  });
}

/**
 * Lancio di un incantesimo conosciuto.
 * @param personaggio { scheda (calcolaScheda con la sessione), sessione }
 * @param incantesimo voce di incantesimi.json (con meccanica)
 * @returns {{ pm_costo, fonte_pm, prova_richiesta, motivi_prova, va_potere_finale, provenienza: { totale, righe }, cumulo,
 *   tiro_per_colpire?, contatto?, salvezza_bersaglio?, danno: {sigla, valore, bonus, voci: [{colonna, base, testo}]}|null,
 *   azioni, concentrazione, impossibile, promemoria }}
 */
export function calcolaLancio(personaggio, incantesimo, dichiarazione, dati) {
  const L = dati.regole.lancio;
  const d = dichiarazioneLancio(dichiarazione);
  const { scheda, sessione } = personaggio;
  const m = incantesimo.meccanica ?? {};
  // Magia sez. 25: incantesimo eseguito con un Rituale definito (Rigenerazione)
  if (m.procedura_rituale?.stato === 'definita' && dati.regole.rituali) return calcolaRituale(personaggio, incantesimo, d, dati);
  const T = talentiAttacco(scheda, dati, 'lancio');
  const con = (k) => T.filter((t) => t.e[k] !== undefined);
  const promemoria = [];
  let impossibile = null;
  const blocca = (motivo) => { impossibile ??= { motivo }; };
  const taumaturgo = scheda?.incantesimi?.scalaPotere !== 'altri_utilizzatori';

  // 1. versione (sez. 1): livello dichiarato = costo ordinario; entro il livello massimo
  const versioni = versioniLancio(incantesimo, scheda);
  const v = versioni.find((x) => x.livello === d.versione) ?? versioni.find((x) => !x.motivo) ?? versioni[0];
  if (!v) blocca('La scheda non ha versioni.');
  else if (v.motivo) blocca(`Versione di livello ${v.livello} ${v.motivo}.`);
  const livello = v?.livello ?? 1;
  for (const k of Object.keys(m).filter((x) => x.startsWith('TODO('))) promemoria.push(`Dati da completare: ${m[k]}`);
  // E&L 18: incantesimo solo rituale con procedura non definita (Rigenerazione): nessun calcolo
  if (m.procedura_rituale?.stato === 'non_definita') blocca(m.procedura_rituale.testo);

  // 2. Anticipazione (sez. 12.3): un aspetto della scheda, costo base ×2, Potere di una categoria più difficile
  const A = L.anticipazione;
  const aspetto = d.anticipazione !== null ? m.anticipazione?.aspetti?.[d.anticipazione] ?? null : null;
  if (d.anticipazione !== null && !aspetto) blocca('Aspetto dell’Anticipazione non previsto dalla scheda.');
  const senzaDifficolta = aspetto && con('anticipazione_senza_difficolta').length > 0;
  const senzaRaddoppio = aspetto ? con('anticipazione_senza_raddoppio').find((t) => t.e.anticipazione_senza_raddoppio === aspetto.categoria) : null;
  const anticipazione = regoleAnticipazione(m, aspetto, v, con, dati, incantesimo.versioni ?? []);

  // 3. costo in PM: base, raddoppio, riduzioni dei Talenti (minimo 1); le riduzioni non toccano livello e penalità
  let pm = v?.pm ?? livello;
  const costo = [{ etichetta: `Versione di livello ${livello}`, valore: pm }];
  if (aspetto && !senzaRaddoppio) { costo.push({ etichetta: `Anticipazione (${aspetto.nome ?? aspetto.etichetta}): ×${A.moltiplicatore_costo}`, valore: pm * (A.moltiplicatore_costo - 1) }); pm *= A.moltiplicatore_costo; }
  const minimo = Math.max(1, ...con('pm_minimo').map((t) => t.e.pm_minimo));
  for (const t of con('pm')) { const r = Math.max(minimo, pm + t.e.pm) - pm; if (r) { costo.push({ etichetta: t.nome, valore: r }); pm += r; } }
  if (d.riservaTecnica) for (const t of con('pm_una_volta_per_scena')) { const r = Math.max(minimo, pm + t.e.pm_una_volta_per_scena) - pm; if (r) { costo.push({ etichetta: `${t.nome} (una volta per scena)`, valore: r }); pm += r; } }

  // 4. la Prova di Potere è richiesta? (sez. 1, 2, 12.3)
  const fascia = L.penalita_livello.fasce.findIndex((f) => livello <= f.fino_a);
  const riga = L.penalita_livello.fasce[Math.max(0, fascia)];
  const esclusi = new Set(con('escludi_componente').map((t) => t.e.escludi_componente));
  const mancanti = d.componentiMancanti.filter((c) => (m.componenti ?? []).includes(c) || (c === 'invocazione' && m.invocazione_obbligatoria));
  const penalizzanti = mancanti.filter((c) => !esclusi.has(c));
  if (m.invocazione_obbligatoria && mancanti.includes('invocazione')) blocca('La componente vocale di questo incantesimo è obbligatoria e non può essere omessa (sez. 2).');
  const motiviProva = [];
  if (!taumaturgo) motiviProva.push('senza l’Addestramento Taumaturgo la Prova è sempre richiesta');
  else if (!riga.taumaturgo_automatico) motiviProva.push(`livello ${livello}: oltre il 3`);
  if (aspetto) motiviProva.push('Anticipazione: la Prova è sempre obbligatoria');
  if (d.ingaggio) motiviProva.push('Ingaggio: la Prova è sempre obbligatoria');
  if (penalizzanti.length) motiviProva.push('componenti mancanti');
  const prova = motiviProva.length > 0;

  // 5. VA di Potere per lanciare: Potere effettivo (con la penalità d'armatura al lancio, uso specifico)
  const potere = (scheda?.abilita ?? []).find((a) => a.nome === 'Potere');
  const scomposizione = (potere?.scomposizione?.length ? potere.scomposizione : [voce('VA Potere', potere?.effettivo ?? potere?.totale ?? 0, 'regole')]).map((x) => ({ paragrafo: null, ...x }));
  // provenienza (src/provenienza.js): VA di Potere con la sua scomposizione in dettaglio, poi le voci del lancio
  const nBase = scomposizione.length;
  const usoLancio = (potere?.usiSpecifici ?? []).find((u) => u.uso === 'lancio');
  if (usoLancio?.modificatore) scomposizione.push(voce(`Lancio: ${usoLancio.oggetti.map((o) => o.oggetto).join(', ')}`, usoLancio.modificatore, 'equipaggiamento', 'Armamenti §7.11.1'));
  // penalità di livello (colonna Taumaturgo o altri utilizzatori), più difficile di una categoria con l'Anticipazione
  let penLivello = taumaturgo ? riga.taumaturgo : riga.altri;
  if (aspetto && !senzaDifficolta) {
    const i = Math.max(0, fascia);
    penLivello = taumaturgo ? A.penalita_taumaturgo[i] : (L.penalita_livello.fasce[i + 1]?.altri ?? riga.altri - 2);
  }
  const etLivello = `Livello ${livello}${aspetto && !senzaDifficolta ? ', con Anticipazione' : ''} (${taumaturgo ? 'Taumaturgo' : 'altri utilizzatori'})`;
  if (penLivello) scomposizione.push(voce(etLivello, penLivello, 'livello', aspetto && !senzaDifficolta ? A.paragrafo : L.penalita_livello.paragrafo));
  const architetto = con('riduzione_penalita_livello')[0];
  if (architetto && penLivello < 0) scomposizione.push(voce(architetto.nome, Math.min(architetto.e.riduzione_penalita_livello, -penLivello), 'talento', 'Arcanista'));
  // manovre e situazione (sez. 2) e circostanze (Giocatore §1.4)
  const mg = scheda?.magia ?? {};
  if (d.focalizzazione) {
    if (prova) scomposizione.push(voce('Focalizzazione', mg.focalizzazioneVa ?? L.focalizzazione.va, 'manovra', L.focalizzazione.paragrafo));
    else promemoria.push(L.focalizzazione.frasi[2]);
    promemoria.push('Focalizzazione: 1 Azione Principale prima del lancio, senza Prova né PM; fra le due è consentito soltanto il Passo.');
  }
  if (d.ingaggio && (mg.penalitaIngaggio ?? L.ingaggio.va)) scomposizione.push(voce('Ingaggio', mg.penalitaIngaggio ?? L.ingaggio.va, 'situazione', L.ingaggio.paragrafo));
  if (d.ingaggio && mg.penalitaIngaggio === 0) promemoria.push(L.ingaggio.frasi[1]);
  if (penalizzanti.length) {
    const nomi = penalizzanti.map((c) => L.componenti.nomi[c]).join(', ');
    scomposizione.push(voce(`Componenti mancanti: ${nomi}`, Math.max(L.componenti.massimo, penalizzanti.length * L.componenti.penalita), 'componenti', L.componenti.paragrafo));
  }
  for (const c of mancanti.filter((x) => esclusi.has(x))) promemoria.push(`${con('escludi_componente').find((t) => t.e.escludi_componente === c).nome}: ${L.componenti.nomi[c]} non serve, niente penalità né obbligo di Prova.`);
  if (d.circostanza) scomposizione.push(voce('Circostanza (Direttore)', d.circostanza, 'circostanze', L.circostanze.paragrafo));
  const occhio = con('divinazione_va')[0];
  if (occhio && m.divinazione && prova) scomposizione.push(voce(occhio.nome, occhio.e.divinazione_va, 'talento', 'Mistico'));
  // cumulo della sez. 7: il maggiore bonus magico e la maggiore penalità magica
  const bonus = d.effettiMagici.filter((e) => e.valore > 0).sort((a, b) => b.valore - a.valore);
  const malus = d.effettiMagici.filter((e) => e.valore < 0).sort((a, b) => a.valore - b.valore);
  const applicati = [bonus[0], malus[0]].filter(Boolean);
  const esclusiCumulo = [...bonus.slice(1), ...malus.slice(1)];
  for (const e of applicati) scomposizione.push(voce(`${e.nome} (effetto magico)`, e.valore, 'magia', L.cumulo.paragrafo));
  if (esclusiCumulo.length) promemoria.push(`Cumulo (sez. 7): ${esclusiCumulo.map((e) => `${e.nome} ${e.valore > 0 ? '+' : ''}${e.valore}`).join(', ')} non si applica: vale solo il maggiore bonus e la maggiore penalità magica.`);
  const va = somma(scomposizione);
  if (prova && va <= 0) blocca(`VA ${va}: Prova impossibile nelle condizioni attuali (Giocatore §1.7).`);

  // 6. fonte dei PM (sez. 6): personali, un solo contenitore compatibile, o misti
  const personali = sessione?.pmAttuali ?? scheda?.pm ?? 0;
  const contenitori = contenitoriLancio(personaggio, incantesimo);
  const c = contenitori.find((x) => x.uid === d.contenitore) ?? null;
  let quotaContenitore = 0;
  if (d.fonte !== 'personali') {
    if (!c) blocca('Scegli un contenitore.');
    else if (c.motivo) blocca(`${c.nome}: ${c.motivo}.`);
    else quotaContenitore = d.fonte === 'contenitore' ? pm : Math.min(d.quotaContenitore, pm);
    if (c && !c.motivo && quotaContenitore > c.pm) blocca(`${c.nome}: ${c.pm} PM, ne servono ${quotaContenitore}.`);
  }
  const quotaPersonali = pm - quotaContenitore;
  if (quotaPersonali > personali) blocca(`PM personali insufficienti: ${personali}, ne servono ${quotaPersonali}.`);
  if (!impossibile && personali - quotaPersonali === 0) promemoria.push(L.svenimento.frasi[0] + ' ' + L.svenimento.frasi[1]);

  // 7. dopo il lancio: tiro per colpire, contatto, Salvezza del bersaglio (sez. 3)
  const abil = (n) => (scheda?.abilita ?? []).find((a) => a.nome === n);
  const tiro = m.richiede_colpire ? { abilita: L.colpire.abilita, va: (abil(L.colpire.abilita)?.effettivo ?? abil(L.colpire.abilita)?.totale ?? 0) + (mg.tiroArmiDaLancio ?? L.tiro_armi_da_lancio), bonus: mg.tiroArmiDaLancio ?? L.tiro_armi_da_lancio } : null;
  const gittata = String(v?.riga?.Gittata ?? v?.riga?.['Gittata Q'] ?? '');
  const contatto = /Contatto/.test(gittata) ? { abilita: L.contatto.abilita, va: (abil(L.contatto.abilita)?.effettivo ?? abil(L.contatto.abilita)?.totale ?? 0) + L.contatto.va, nota: L.contatto.frasi[1] } : null;
  const inarrestabili = con('salvezza_bersaglio')[0];
  const salvezza = m.salvezza?.tipi?.length ? { tipi: m.salvezza.tipi, testo: [m.salvezza.testo, m.salvezza.dettaglio].filter(Boolean).join(' '), mod_ps: modPsVersione(v?.riga), talento: inarrestabili ? { nome: inarrestabili.nome, valore: inarrestabili.e.salvezza_bersaglio } : null }
    : m.salvezza ? { tipi: [], testo: m.salvezza.testo, mod_ps: modPsVersione(v?.riga), talento: null } : null;

  // E&L 17: colpo automatico, difese ammesse (Colpo Elementale)
  if (m.colpo?.automatico) promemoria.unshift(m.colpo.testo);

  // 8. danno della versione con il bonus di SAG (Magia sez. 7; Giocatore §5.13, stessi tetti di livello):
  // colonne «Danno…» della riga con un dado; a ogni colpo o applicazione, prima di moltiplicatori e Armatura
  const Rd = dati.regole.danno_caratteristica;
  const siglaMagia = Rd?.magia ?? null;
  const valoreMagia = siglaMagia ? scheda?.caratteristiche?.[siglaMagia]?.valore ?? null : null;
  const colonneDanno = Object.entries(v?.riga ?? {}).filter(([k, t]) => /^Danno/.test(k) && /\d+d\d+/.test(String(t)));
  // Talenti di lancio (docs/censimento-talenti.md, effetti.valori con «incantesimi»): con l'interruttore
  // «Bonus dei Talenti» spento non contano. Offensivo = una colonna Danno con dadi; ad Area = una colonna
  // Area o Raggio, o l'Anticipazione dell'Area; di cura = una colonna Guarigione con dadi.
  const colonneCura = Object.entries(v?.riga ?? {}).filter(([k, t]) => /^Guarigione/.test(k) && /\d+d\d+/.test(String(t)));
  const offensivo = colonneDanno.length > 0;
  const adArea = Object.keys(v?.riga ?? {}).some((k) => /^(Area|Raggio)/.test(k)) || (m.anticipazione?.aspetti ?? []).some((a) => a.categoria === 'area');
  const valePer = { offensivi: offensivo, area: adArea && offensivo, cura: colonneCura.length > 0, cura_ferite_contatto: incantesimo.nome === 'Cura Ferite' && !!contatto, danno_o_cura: offensivo || colonneCura.length > 0 };
  const talentiLancio = scheda?.bonusTalenti === false ? [] : effettiTalenti(scheda, dati).filter((e) => e.incantesimi);
  const sceltiLancio = new Set(d.talentiLancio);
  const attiviLancio = talentiLancio.filter((e) => valePer[e.incantesimi] && (e.ambito === 'uso_specifico' || sceltiLancio.has(e.chiave)));
  const valoreTalento = (e) => {
    if (!e.valore_per_grado) return { valore: e.valore, grado: null };
    const g = (scheda?.classi ?? []).find((c) => c.nome === e.grado_di)?.grado ?? 0;
    const soglia = Object.entries(e.valore_per_grado).map(([k, x]) => [Number(k), x]).filter(([k]) => k <= g).sort((a, b) => b[0] - a[0])[0];
    return { valore: soglia?.[1] ?? 0, grado: g };
  };
  const extraDanno = attiviLancio.filter((e) => e.tipo === 'danno').map((e) => ({ nome: e.talento, ...valoreTalento(e), nota: e.nota ?? null })).filter((x) => x.valore);
  const dadiInPiu = attiviLancio.filter((e) => e.tipo === 'dado_danno');
  const massimizza = attiviLancio.filter((e) => e.tipo === 'massimizza');
  const extraCura = attiviLancio.filter((e) => e.tipo === 'cura').map((e) => ({ nome: e.talento, valore: e.valore, nota: e.nota ?? null }));
  const conSegno = (n) => (n < 0 ? `−${-n}` : `+${n}`);
  const etichettaTalento = (x) => `${conSegno(x.valore)} ${x.nome}${x.grado ? ` (Grado ${GRADI_ROMANI[x.grado] ?? x.grado})` : ''}`;
  const dannoIncantesimo = colonneDanno.length && valoreMagia !== null ? (() => {
    const bonus = bonusDannoCaratteristica(valoreMagia, scheda?.livello ?? 1, dati.regole);
    const sommaExtra = extraDanno.reduce((s, x) => s + x.valore, 0);
    const nDadi = dadiInPiu.reduce((s, e) => s + e.valore, 0);
    return {
      sigla: siglaMagia, valore: valoreMagia, bonus, talenti: extraDanno,
      voci: colonneDanno.map(([k, t]) => {
        const testo = aggiungiDanno(aggiungiDado(String(t), nDadi), bonus + sommaExtra);
        // provenienza in una riga: «1d6 +1 SAG +1 Incantesimi Aggressivi (Grado I)»
        const parti = [String(t), nDadi ? `${conSegno(nDadi)} dado (${dadiInPiu.map((e) => e.talento).join(', ')})` : null, bonus ? `${conSegno(bonus)} ${siglaMagia}` : null, ...extraDanno.map(etichettaTalento)].filter(Boolean);
        return { colonna: k, base: String(t), testo: massimizza.length ? `${testo} (massimo ${massimoFormula(testo)}: ${massimizza.map((e) => e.talento).join(', ')})` : testo, provenienza: parti.join(' ') };
      }),
      // note del manuale sotto il danno («una sola volta per bersaglio, al primo colpo»)
      note: [...extraDanno, ...dadiInPiu.map((e) => ({ nome: e.talento, nota: e.nota })), ...massimizza.map((e) => ({ nome: e.talento, nota: e.nota }))]
        .filter((x) => x.nota).map((x) => `${x.nome}: ${x.nota}`),
    };
  })() : null;
  // cura della versione (colonna Guarigione) con i Talenti di cura (Canale Vitale, Tocco Sacro)
  const curaIncantesimo = colonneCura.length ? (() => {
    const sommaExtra = extraCura.reduce((s, x) => s + x.valore, 0);
    return {
      talenti: extraCura,
      voci: colonneCura.map(([k, t]) => {
        const testo = aggiungiDanno(String(t), sommaExtra);
        const parti = [String(t), ...extraCura.map(etichettaTalento)];
        return { colonna: k, base: String(t), testo: massimizza.length ? `${testo} (dadi al massimo: ${massimoFormula(testo)}; ${massimizza.map((e) => e.talento).join(', ')})` : testo, provenienza: parti.join(' ') };
      }),
    };
  })() : null;
  if (dannoIncantesimo?.bonus) promemoria.push(`Bonus di ${siglaMagia} al danno: ${dannoIncantesimo.bonus > 0 ? '+' : ''}${dannoIncantesimo.bonus} a ogni colpo o applicazione di danno, prima di moltiplicatori, Difese e Armatura (Magia sez. 7; Giocatore §5.13).`);

  // 9. promemoria finali
  promemoria.push(L.magistrale.frasi[0], L.fallimento.frasi[0]);
  const mn = prova ? promemoriaMagistraleNaturale(va, dati, { magistraleMigliorato: haMagistraleMigliorato(scheda, dati) }) : null;
  if (mn) promemoria.push(mn);
  const conValori = new Set(talentiLancio.map((e) => e.talento));
  const modInt = Math.max(1, scheda?.caratteristiche?.INT?.mod ?? 0);
  const numeri = {
    'Canalizzazione Sicura': prova ? `se la Prova fallisce recuperi ${Math.floor(pm / 2)} PM` : null,
    'Geometria Arcana': adArea ? `qui puoi escludere fino a ${modInt} creature` : null,
  };
  const soloTesto = con('promemoria').filter((t) => !conValori.has(t.nome));
  if (soloTesto.length) {
    promemoria.push(`Talenti: ${soloTesto.map((t) => `${t.nome} — ${String(t.testo ?? '').split(/(?<=\.)\s/)[0]}${numeri[t.nome] ? ` (${numeri[t.nome]})` : ''}`).join(' · ')}`);
  }
  // Controllo Arcano: oltre al +1 danno, l'esclusione di 1 + Mod INT creature dagli Incantesimi ad Area
  // Tecniche Interiori in corso (§8.9): la stessa riga di «Attacca!» (src/attacco.js)
  const tecRiga = rigaTecnicheAttive(personaggio.sessione, dati);
  if (tecRiga) promemoria.push(tecRiga);
  if (adArea && T.some((t) => t.nome === 'Controllo Arcano')) promemoria.push(`Controllo Arcano: puoi escludere fino a ${1 + Math.max(0, scheda?.caratteristiche?.INT?.mod ?? 0)} creature dall’Area.`);

  return {
    livello,
    pm_costo: pm,
    costo,
    fonte_pm: { personali: quotaPersonali, contenitore: quotaContenitore ? { uid: c.uid, nome: c.nome, pm: quotaContenitore } : null },
    prova_richiesta: prova,
    motivi_prova: motiviProva,
    va_potere_finale: va,
    provenienza: provenienza([rigaConDettaglio('VA Potere', somma(scomposizione.slice(0, nBase)), potere?.provenienza), ...righeDaScomposizione(scomposizione.slice(nBase))], va),
    cumulo: { applicati, esclusi: esclusiCumulo },
    tiro_per_colpire: tiro,
    contatto,
    salvezza_bersaglio: salvezza,
    danno: dannoIncantesimo,
    cura: curaIncantesimo,
    // Talenti di lancio situazionali disponibili per questo incantesimo (interruttori del pannello)
    talenti_lancio: talentiLancio.filter((e) => e.ambito === 'situazionale' && valePer[e.incantesimi]).map((e) => ({ chiave: e.chiave, nome: e.talento, condizione: e.condizione, acceso: sceltiLancio.has(e.chiave) })),
    rituale_non_definito: m.procedura_rituale?.stato === 'non_definita',
    azioni: { ...m.azioni, focalizzazione: d.focalizzazione ? 1 : 0 },
    concentrazione: m.concentrazione ?? null,
    aspetto,
    // Anticipazione (sez. 12.3): regole che valgono per questo lancio con questi Talenti, il valore
    // anticipato dalla scala della scheda e gli aspetti che la scheda consente
    anticipazione,
    impossibile,
    promemoria,
    // Stati attivi senza Azione Principale o con sole azioni difensive (regole.json → stati)
    avvisi: avvisiStati(sessione, dati),
  };
}

// ---------------------------------------------------------------------------
// Rituali (Magia §24.6 e sez. 25): Rigenerazione si esegue con il Rituale, non con un lancio ordinario.

/** Gradi accessibili come Officiante dai Talenti (regole.json → rituali.accesso: Ritualista Minore e Maggiore). */
export function accessoRituale(grado, scheda, dati) {
  const R = dati?.regole?.rituali;
  const voce = (R?.accesso ?? []).find((a) => a.gradi.includes(grado));
  if (!voce) return { ok: false, motivo: `Grado ${GRADI_ROMANI[grado] ?? grado}: nessun accesso previsto` };
  const posseduti = new Set((scheda?.talentiLiberi ?? []).map((t) => t.id));
  if (voce.talenti.some((t) => posseduti.has(t))) return { ok: true, motivo: null };
  const nomi = voce.talenti.map((id) => dati.talenti_liberi?.talenti?.find((t) => t.id === id)?.nome ?? id);
  return { ok: false, motivo: `Grado ${GRADI_ROMANI[grado] ?? grado}: serve ${nomi.join(' o ')} (Magia §24.1, §25.1)` };
}

/** Aiuto al VA dell'Officiante dato da un Canale (Magia §24.6, tabella «VA pertinente del Canale»). */
export function aiutoCanale(va, dati) {
  const fasce = dati.regole.rituali.canali.aiuto_va;
  return (fasce.find((f) => f.fino_a === null || va <= f.fino_a) ?? fasce.at(-1)).aiuto;
}

/**
 * Rituale di un incantesimo con procedura definita (Rigenerazione, Magia sez. 25): un'unica Prova di
 * Rituali dell'Officiante al termine, con la penalità del Grado e l'aiuto dei Canali (fino a +5);
 * PM totali della versione ripartiti fra l'Officiante (almeno il Grado) e i Canali; reagenti, ore e
 * rigenerazione successiva dalla tabella. Stessa forma del risultato di calcolaLancio, più «rituale».
 * Scelte provvisorie in attesa di Davide (per-davide A.74, TODO nei dati): VA pertinente del Canale =
 * Rituali; PM solo personali (niente batterie); conta Ritualista, non il livello massimo degli Incantesimi;
 * con il Magistrale i Canali tengono le quote e l'Officiante paga il resto, almeno metà Grado.
 */
function calcolaRituale(personaggio, incantesimo, d, dati) {
  const R = dati.regole.rituali;
  const P = incantesimo.meccanica.procedura_rituale;
  const { scheda, sessione } = personaggio;
  const promemoria = [];
  let impossibile = null;
  const blocca = (motivo) => { impossibile ??= { motivo }; };
  const versioni = versioniLancio(incantesimo, scheda, dati);
  const v = versioni.find((x) => x.livello === d.versione) ?? versioni.find((x) => !x.motivo) ?? versioni[0];
  if (!v) blocca('La scheda non ha versioni.');
  else if (v.motivo) blocca(`Versione di livello ${v.livello}: ${v.motivo}.`);
  const pv = P.versioni.find((x) => x.livello === v?.livello) ?? P.versioni[0];
  const grado = pv.grado;

  // Canali (§24.6): al massimo tanti quanto il Grado; aiuto per VA, fino a +5 complessivo; nessun tiro separato
  const canali = d.canali.map((c) => ({ ...c, aiuto: aiutoCanale(c.va, dati) }));
  if (canali.length > grado) blocca(`Al massimo ${grado} Canali per un Rituale di Grado ${GRADI_ROMANI[grado]} (Magia §24.6).`);
  const aiutoGrezzo = canali.reduce((s, c) => s + c.aiuto, 0);
  const aiuto = Math.min(aiutoGrezzo, R.canali.aiuto_massimo);

  // Prova di Rituali dell'Officiante (§25.1): VA di Rituali, penalità del Grado, aiuto dei Canali, circostanza
  const abil = (scheda?.abilita ?? []).find((a) => a.nome === R.abilita);
  const scomposizione = (abil?.scomposizione?.length ? abil.scomposizione : [voce(`VA ${R.abilita}`, abil?.effettivo ?? abil?.totale ?? 0, 'regole')]).map((x) => ({ paragrafo: null, ...x }));
  const nBase = scomposizione.length;
  scomposizione.push(voce(`Rituale di Grado ${GRADI_ROMANI[grado]}`, pv.va, 'livello', P.paragrafo));
  if (aiuto) scomposizione.push(voce(`Canali (${canali.length})${aiutoGrezzo > aiuto ? `, massimo +${R.canali.aiuto_massimo}` : ''}`, aiuto, 'manovra', 'Magia §24.6'));
  if (d.circostanza) scomposizione.push(voce('Circostanza (Direttore)', d.circostanza, 'circostanze', dati.regole.lancio.circostanze.paragrafo));
  const va = somma(scomposizione);
  if (va <= 0) blocca(`VA ${va}: Prova impossibile nelle condizioni attuali (Giocatore §1.7).`);

  // PM (§25.1, §24.6): il totale della tabella, quote dichiarate; l'Officiante almeno il Grado
  const pmCanali = canali.reduce((s, c) => s + c.pm, 0);
  const officiante = pv.pm - pmCanali;
  if (officiante < grado) blocca(`L’Officiante versa almeno ${grado} PM personali (Magia §24.6): i Canali possono dare al massimo ${pv.pm - grado} PM.`);
  const personali = sessione?.pmAttuali ?? scheda?.pm ?? 0;
  if (officiante > personali) blocca(`PM personali insufficienti: ${personali}, ne servono ${officiante}.`);
  // Successo Magistrale: metà del totale per eccesso; i Canali tengono le quote, l'Officiante il resto (A.74)
  const totaleMagistrale = Math.ceil(pv.pm / 2);
  const minimoMagistrale = Math.ceil(grado / 2);
  const officianteMagistrale = Math.min(Math.max(officiante, 0), Math.max(minimoMagistrale, totaleMagistrale - pmCanali));

  const ritualista = (dati.talenti_liberi?.talenti ?? []).filter((t) => R.accesso.find((a) => a.gradi.includes(grado))?.talenti.includes(t.id)).map((t) => t.nome);
  promemoria.push(
    `Contatto con i beneficiari per tutte le ${pv.ore} ore della celebrazione; beneficiari viventi e consenzienti, oppure incoscienti soccorsi; nessuna PS.`,
    `Reagenti: ${pv.reagenti.toLocaleString('it-IT')} crediti (${P.reagenti_per_grado} per Grado), predisposti all’inizio; si scalano a parte dai Crediti.`,
    'Successo: inizia la rigenerazione. Successo Magistrale: metà dei PM e dei reagenti. Fallimento: PM e reagenti consumati, nessuna rigenerazione. Fallimento Maldestro: come il fallimento, e i beneficiari non possono ricevere un nuovo Rituale di Rigenerazione per 24 ore.',
    'Interruzione prima della Prova finale: reagenti consumati, PM non spesi, la rigenerazione non inizia.',
    `Rigenerazione completa ${pv.rigenerazione} dopo il successo. Un beneficiario può avere una sola Rigenerazione attiva.`,
    `Officiante: conoscere la procedura e possedere ${ritualista.join(' o ')}.`,
    'Scelte provvisorie (per-davide A.74): VA dei Canali = Rituali; PM solo personali; conta Ritualista, non il livello massimo degli Incantesimi.',
  );

  return {
    livello: pv.livello,
    pm_costo: pv.pm,
    costo: [{ etichetta: `Versione di livello ${pv.livello} (totale del Rituale)`, valore: pv.pm }],
    fonte_pm: { personali: officiante, contenitore: null },
    prova_richiesta: true,
    prova_abilita: R.abilita,
    motivi_prova: ['un’unica Prova dell’Officiante al termine del Rituale (Magia §25.1)'],
    va_potere_finale: va,
    provenienza: provenienza([rigaConDettaglio(`VA ${R.abilita}`, somma(scomposizione.slice(0, nBase)), abil?.provenienza), ...righeDaScomposizione(scomposizione.slice(nBase))], va),
    cumulo: { applicati: [], esclusi: [] },
    tiro_per_colpire: null,
    contatto: null,
    salvezza_bersaglio: { tipi: [], testo: 'Nessuna PS.', mod_ps: null, talento: null },
    danno: null,
    cura: null,
    talenti_lancio: [],
    rituale_non_definito: false,
    rituale: {
      grado, grado_romano: GRADI_ROMANI[grado], ore: pv.ore, reagenti: pv.reagenti, rigenerazione: pv.rigenerazione,
      canali, canali_massimo: grado, aiuto, aiuto_massimo: R.canali.aiuto_massimo, pm_canali: pmCanali,
      officiante, officiante_minimo: grado, abilita: R.abilita,
      magistrale: { totale: totaleMagistrale, officiante: officianteMagistrale, canali: totaleMagistrale - officianteMagistrale },
    },
    azioni: { tempo: `${pv.ore} ore di celebrazione continua`, focalizzazione: 0 },
    concentrazione: null,
    aspetto: null,
    anticipazione: null,
    impossibile,
    promemoria,
    avvisi: avvisiStati(sessione, dati),
  };
}

/**
 * Attivazione di un incantesimo infuso in un Artefatto (Magia §24.2; per Rigenerazione §25.4): dopo la
 * Sintonizzazione è automatica, senza Prove di Potere o Rituali, senza Componenti e senza Canali; l'intero
 * costo in PM della versione si paga dalla riserva integrata, che alimenta solo l'Artefatto (A.18).
 * @param infuso { incantesimo, livello } dell'Artefatto
 * @param riserva contenitore integrato dell'Artefatto ({ energia, energiaNome, macrofamiglie, capacita }) o null
 * @param stato { pm: PM nella riserva, sintonizzato, deposito }
 * @returns {{ incantesimo, livello, pm, tempo, prova: false, energie, motivo: string|null, frasi: string[] }|null}
 */
export function attivazioneInfusa(infuso, riserva, stato, dati) {
  const inc = (dati.incantesimi?.incantesimi ?? []).find((i) => i.nome === infuso?.incantesimo);
  if (!inc) return null;
  const riga = (inc.versioni ?? []).find((r) => livelloVersione(r) === infuso.livello);
  const P = inc.meccanica?.procedura_rituale;
  const pv = P?.stato === 'definita' ? P.versioni.find((x) => x.livello === infuso.livello) : null;
  const pm = pv?.pm ?? (riga ? pmVersione(riga) ?? infuso.livello : null);
  // §25.4: la durata della celebrazione diventa il tempo di attivazione continua dell'oggetto
  const tempo = pv ? `${pv.ore} ore di attivazione continua, con contatto` : inc.meccanica?.azioni?.azioni_principali
    ? `${inc.meccanica.azioni.azioni_principali} ${inc.meccanica.azioni.azioni_principali === 1 ? 'Azione Principale' : 'Azioni Principali'}` : inc.meccanica?.azioni?.tempo ?? '—';
  // energia: quella che la scheda ammette (§25.4: Verde o Bianca), altrimenti la macrofamiglia dell'incantesimo
  const energie = P?.artefatto?.energie ?? null;
  const compatibile = riserva ? (energie ? energie.includes(riserva.energia) : (riserva.macrofamiglie ?? []).includes(inc.macrofamiglia)) : false;
  const motivo = !riga ? `la scheda di ${inc.nome} non ha la versione di livello ${infuso.livello}`
    : !riserva ? 'nessuna riserva integrata: l’intero costo si paga dalla riserva dell’Artefatto (Magia §25.4)'
      : !compatibile ? `riserva ${riserva.energia} non compatibile${energie ? ` (serve ${energie.join(' o ')}, Magia §25.4)` : ` con un incantesimo ${inc.macrofamiglia}`}`
        : stato.deposito ? 'nel deposito comune' : !stato.sintonizzato ? 'non sintonizzato'
          : stato.pm < pm ? `la riserva ha ${stato.pm} PM, ne servono ${pm}` : null;
  return { incantesimo: inc.nome, livello: infuso.livello, pm, tempo, prova: false, energie, motivo, frasi: P?.artefatto?.frasi ?? [] };
}
