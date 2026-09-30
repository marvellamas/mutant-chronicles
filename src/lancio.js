// Utility «Lancia un incantesimo» (backlog voce 4): funzione pura, nessun tiro di dado. Stesso
// impianto di src/attacco.js: si parte dal Potere effettivo per lanciare (regole, equipaggiamento,
// condizioni, penalità d'armatura al lancio) e si aggiungono le voci della dichiarazione, ognuna
// con { etichetta, valore, fonte, paragrafo }. Regole e frasi in regole.json → lancio (Magia sez.
// 1–3, 5–7, 12.3; Giocatore §1.4, §1.7); dati di ogni scheda in incantesimi.json → meccanica;
// Talenti con effetti.lancio (e effetti.magia già calcolati nella scheda: Focalizzazione, Ingaggio,
// tiro con Armi da lancio).
import { voce, somma, talentiAttacco, promemoriaMagistraleNaturale } from './attacco.js';
import { avvisiStati } from './condizioni.js';
import { provenienza, righeDaScomposizione, rigaConDettaglio } from './provenienza.js';
import { bonusDannoCaratteristica } from './calc.js';
import { aggiungiDanno } from './equipaggiamento.js';

const numero = (v) => { const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : null; };
/** Livello di una riga delle versioni (colonne «Livello» oppure «Livello e PM»). */
export const livelloVersione = (r) => numero(r?.Livello ?? r?.['Livello e PM']);
const pmVersione = (r) => numero(r?.PM ?? r?.['Livello e PM']);
const modPsVersione = (r) => { const k = Object.keys(r ?? {}).find((x) => /^Mod\.? PS$/.test(x)); return k ? String(r[k]) : null; };
// energia dei contenitori → PM utilizzabili della scheda (Magia sez. 6)
const PM_DI_ENERGIA = { Universale: 'universali', Fisica: 'fisici', Mentale: 'mentali', Spirituale: 'spirituali' };

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
  };
}

/** Versioni della scheda con il motivo se non accessibili (livello oltre il massimo del personaggio). */
export function versioniLancio(incantesimo, scheda) {
  const max = scheda?.incantesimi?.livelloMassimo ?? 0;
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
export function statoPulsanteLancio(incantesimo, scheda) {
  const v = versioniLancio(incantesimo, scheda);
  if (v.some((x) => !x.motivo)) return { disabilitato: false, motivo: null };
  const minimo = v.map((x) => x.livello).filter(Number.isInteger).sort((a, b) => a - b)[0];
  return { disabilitato: true, motivo: minimo ? `richiede livello ${minimo}` : 'nessuna versione nella scheda' };
}

/** Contenitori per il lancio: compatibilità con la macrofamiglia e con i PM utilizzabili della scheda. */
export function contenitoriLancio(personaggio, incantesimo) {
  const m = incantesimo.meccanica ?? {};
  return (personaggio.scheda?.equipaggiamento?.contenitori ?? []).map((c) => {
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

  // 3. costo in PM: base, raddoppio, riduzioni dei Talenti (minimo 1); le riduzioni non toccano livello e penalità
  let pm = v?.pm ?? livello;
  const costo = [{ etichetta: `Versione di livello ${livello}`, valore: pm }];
  if (aspetto && !senzaRaddoppio) { costo.push({ etichetta: `Anticipazione (${aspetto.nome ?? aspetto.etichetta}): ×${A.moltiplicatore_costo}`, valore: pm * (A.moltiplicatore_costo - 1) }); pm *= A.moltiplicatore_costo; }
  if (aspetto && senzaRaddoppio) promemoria.push(`${senzaRaddoppio.nome}: l’Anticipazione di questo aspetto non raddoppia il costo.`);
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
  } else if (aspetto && senzaDifficolta) promemoria.push(`${con('anticipazione_senza_difficolta')[0].nome}: la difficoltà resta quella del livello dichiarato; la Prova resta obbligatoria.`);
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
  const dannoIncantesimo = colonneDanno.length && valoreMagia !== null ? (() => {
    const bonus = bonusDannoCaratteristica(valoreMagia, scheda?.livello ?? 1, dati.regole);
    return { sigla: siglaMagia, valore: valoreMagia, bonus, voci: colonneDanno.map(([k, t]) => ({ colonna: k, base: String(t), testo: aggiungiDanno(String(t), bonus) })) };
  })() : null;
  if (dannoIncantesimo?.bonus) promemoria.push(`Bonus di ${siglaMagia} al danno: ${dannoIncantesimo.bonus > 0 ? '+' : ''}${dannoIncantesimo.bonus} a ogni colpo o applicazione di danno, prima di moltiplicatori, Difese e Armatura (Magia sez. 7; Giocatore §5.13).`);

  // 9. promemoria finali
  promemoria.push(L.magistrale.frasi[0], L.fallimento.frasi[0]);
  const mn = prova ? promemoriaMagistraleNaturale(va, dati) : null;
  if (mn) promemoria.push(mn);
  for (const t of con('promemoria')) promemoria.push(`${t.nome}: ${String(t.testo ?? '').split(/(?<=\.)\s/)[0]}`);
  if (aspetto && T.some((t) => t.nome === 'Calcolo Arcano')) promemoria.push(`Calcolo Arcano: ${A.frasi.at(-1)}`);

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
    rituale_non_definito: m.procedura_rituale?.stato === 'non_definita',
    azioni: { ...m.azioni, focalizzazione: d.focalizzazione ? 1 : 0 },
    concentrazione: m.concentrazione ?? null,
    aspetto,
    impossibile,
    promemoria,
    // Stati attivi senza Azione Principale o con sole azioni difensive (regole.json → stati)
    avvisi: avvisiStati(sessione, dati),
  };
}
