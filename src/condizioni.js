// Condizioni di sessione nei valori: Ferite (§5.14), Affaticamento (§5.19), Stati (§5.18) e carico
// (Giocatore §5.2.6, Equipaggiamento §1.6).
// Funzioni pure. Il valore EFFETTIVO = valore da regole + equipaggiamento + condizioni attive;
// il `totale` da regole non cambia (serve all'avanzamento) e la stampa resta a riposo.

import { condizioniCircostanza } from './circostanze.js';
import { descriviFerite } from './sessione.js';
import { calcolaCarico } from './carico.js';
import { aggiungiDanno, infoArtefatto, applicaMunizione } from './equipaggiamento.js';
import { effettiTalenti, bonusTalentiAccesi } from './talenti.js';
import { calcolaAR, oggettiRotti } from './protezione.js';
import { chiaviTecnicheAttive, effettiTecniche } from './tecniche.js';
import { arIncantesimiInCorso } from './durate-incantesimi.js';
import { riga, provenienza, righeDaScomposizione, righeRegoleAbilita, righeRegoleSalvezza } from './provenienza.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Condizioni attive della sessione, con effetto strutturato:
 * [{ etichetta, fonte: 'ferite'|'affaticamento'|'corruzione'|'stato'|'carico', effetto: { va, salvezze, va_categorie, va_abilita, va_gruppi } }].
 * Gli Stati senza `effetto` nei dati non compaiono: restano promemoria. Con la scheda (per il peso
 * dell'equipaggiamento e FOR) si aggiunge il carico, se supera la soglia ordinaria.
 */
/** A.106: livello di luce della sessione (regole.json → illuminazione), null con luce sufficiente o ignoto. */
export function luceAttiva(sessione, dati) {
  return dati.regole.illuminazione?.livelli?.find((x) => x.id === sessione?.luce && !x.base) ?? null;
}

/**
 * A.116 (E&L del 05/10/2026): Abilità che possono ricevere la penalità di luce perché l'uso «richiede la vista», con lo
 * stato della casella: predefinita dai dati (regole.json → illuminazione.richiede_vista.predefinite), corretta dal
 * Direttore nella sessione (sessione.vistaAbilita: { nome: true|false }). Escluse Potere e Percezione (che ha il suo valore
 * visivo) e le Abilità che la ricevono già sempre (attacchi e Difese, categorie_prove.luce).
 * @returns {{ nome, attiva, predefinita, uso: string|null }[]}
 */
export function abilitaVista(sessione, dati) {
  const RV = dati.regole.illuminazione?.richiede_vista;
  if (!RV) return [];
  const sempre = new Set([...(RV.escluse ?? []), ...(dati.regole.categorie_prove?.luce ?? [])]);
  const scelte = isOggetto(sessione?.vistaAbilita) ? sessione.vistaAbilita : {};
  return (dati.abilita?.abilita ?? []).filter((a) => !sempre.has(a.nome)).map((a) => {
    const predefinita = Object.hasOwn(RV.predefinite ?? {}, a.nome);
    return { nome: a.nome, predefinita, attiva: typeof scelte[a.nome] === 'boolean' ? scelte[a.nome] : predefinita, uso: RV.predefinite?.[a.nome] ?? null };
  });
}

/**
 * Stati attivi, più quello imposto dalla luce (buio totale: Accecato, senza sommarli, A.106) e quelli implicati
 * (sintesi Svenuto del 05/10/2026: cade A Terra; regole.json → stati.elenco[].implica).
 */
export function statiEffettivi(sessione, dati) {
  const s = new Set(isOggetto(sessione) && Array.isArray(sessione.statiAttivi) ? sessione.statiAttivi : []);
  const l = luceAttiva(sessione, dati);
  if (l?.stato) s.add(l.stato);
  for (const st of dati.regole.stati?.elenco ?? []) if (s.has(st.id)) for (const k of st.implica ?? []) s.add(k);
  return s;
}

/**
 * A.119: intensità di uno Stato che ne ha (Ammalato 1–6), dalla sessione (sessione.intensitaStati) o la prima;
 * { livello, valore, etichetta } o null. Cambiare intensità sostituisce la penalità, non la somma.
 */
export function intensitaStato(stato, intensitaStati, dati = null) {
  const I = stato?.intensita;
  if (!I?.valori?.length) return null;
  const n = Number(intensitaStati?.[stato.id]);
  const livello = Number.isInteger(n) && n >= 1 && n <= I.valori.length ? n : 1;
  const valore = I.valori[livello - 1];
  const etichetta = I.etichetta.replace('{n}', String(livello)).replace('{v}', valore < 0 ? `−${-valore}` : String(valore));
  return { livello, valore, etichetta };
}

/** Effetto di uno Stato con intensità: una penalità alle Prove della categoria (A.119: tutte le Prove di Abilità). */
export function effettoIntensita(stato, intensitaStati) {
  const i = intensitaStato(stato, intensitaStati);
  return i ? { ...i, effetti: [{ tipo: 'va', prove: stato.intensita.prove, valore: i.valore, ambito: 'generale', condizione: i.etichetta, fonte: stato.intensita.fonte }] } : null;
}

/**
 * A.106: le visioni del personaggio che eliminano le penalità di luce entro la portata (impianti installati,
 * Tecniche in corso), dai dati (regole.json → illuminazione.visione.fonti).
 */
export function visioniPersonaggio(equipaggiamento, sessione, dati) {
  const F = dati.regole.illuminazione?.visione?.fonti ?? [];
  const voci = Array.isArray(equipaggiamento) ? equipaggiamento : [];
  const tecniche = new Set((Array.isArray(sessione?.tecnicheAttive) ? sessione.tecnicheAttive : []).map((x) => x.id));
  return F.filter((f) => (f.rif ? voci.some((v) => v.rif === f.rif && v.stato === 'installato') : f.tecnica ? tecniche.has(f.tecnica) : false));
}

export function condizioniAttive(sessione, dati, scheda = null) {
  if (!isOggetto(sessione)) return [];
  const r = dati.regole;
  const out = [];
  // §5.14: penalità a VA e Prove Salvezza (a che cosa si applica sta in regole.json)
  const ferita = descriviFerite(sessione.ferite, dati);
  if (sessione.ferite && ferita.penalita) out.push({ etichetta: `Ferita ${ferita.nome}`, fonte: 'ferite', effetto: perAmbiti(r.ferite.si_applica_a, ferita.penalita) });
  // §5.19: si applica solo la penalità dello Stato di Affaticamento attuale
  const aft = r.affaticamento.stati[sessione.affaticamento];
  if (aft?.penalita) out.push({ etichetta: aft.nome, fonte: 'affaticamento', effetto: perAmbiti(r.affaticamento.si_applica_a, aft.penalita) });
  // §5.20: solo la penalità dello Stato di Corruzione attuale, a tutte le Prove (Oscuro: nessuna, è un PNG)
  const cros = r.corruzione?.stati?.[sessione.corruzione ?? 0];
  if (cros?.penalita) out.push({ etichetta: cros.nome, fonte: 'corruzione', effetto: perAmbiti(r.corruzione.si_applica_a, cros.penalita) });
  // §5.18: solo gli Stati con effetti numerici nei dati; più Stati si sommano (il buio totale vale Accecato, A.106)
  const attivi = statiEffettivi(sessione, dati);
  // Talenti che riducono la penalità al VA di uno Stato, fino ad annullarla (effetti.valori
  // «riduzione_stato»): Combattere alla Cieca (Accecato), Sangue Freddo (Terrorizzato, situazionale).
  // Con l'interruttore «Bonus dei Talenti» spento non contano.
  const accesiT = new Set(Array.isArray(sessione.talentiAccesi) ? sessione.talentiAccesi : []);
  const riduzioni = scheda && bonusTalentiAccesi(sessione) ? effettiTalenti(scheda, dati)
    .filter((e) => e.tipo === 'riduzione_stato' && (e.ambito === 'generale' || (e.ambito === 'situazionale' && accesiT.has(e.chiave)))) : [];
  for (const s of r.stati.elenco) {
    // A.119: gli Stati con intensità (Ammalato) hanno la penalità dell'intensità scelta
    const conIntensita = attivi.has(s.id) ? effettoIntensita(s, sessione.intensitaStati) : null;
    const effetti = conIntensita?.effetti ?? s.effetti;
    if (!attivi.has(s.id) || !effetti?.length) continue;
    // anche con soli usi specifici (Assordato): il VA generale non cambia, il valore d'uso sì
    const effetto = effettoDaEffetti(effetti);
    out.push({ etichetta: conIntensita?.etichetta ?? s.nome, fonte: 'stato', effetto, usi: effetti.filter((e) => e.ambito === 'uso_specifico') });
    for (const t of riduzioni.filter((x) => x.stato === s.id)) {
      // solo le penalità al VA (non le Prove Salvezza), ciascuna ridotta al più di «valore» e non oltre 0;
      // con «prove» solo le Abilità di quel gruppo (Combattere alla Cieca: attaccare o difendersi)
      const meno = (v) => (v < 0 ? Math.min(t.valore, -v) : 0);
      const gruppi = r.categorie_prove ?? {};
      const ammessa = (nome) => !t.prove || (gruppi[t.prove] ?? []).includes(nome);
      const ridotto = {};
      const perAbilita = (nomi, v) => { for (const a of nomi.filter(ammessa)) (ridotto.va_abilita ??= {})[a] = (ridotto.va_abilita[a] ?? 0) + meno(v); };
      if (meno(effetto.va ?? 0)) { if (t.prove) perAbilita(gruppi[t.prove] ?? [], effetto.va); else ridotto.va = meno(effetto.va); }
      for (const [g, v] of Object.entries(effetto.va_gruppi ?? {})) {
        if (!meno(v)) continue;
        if (t.prove) perAbilita(gruppi[g] ?? [], v); else (ridotto.va_gruppi ??= {})[g] = meno(v);
      }
      for (const [a, v] of Object.entries(effetto.va_abilita ?? {})) if (meno(v)) perAbilita([a], v);
      if (Object.keys(ridotto).length) out.push({ etichetta: `${t.talento} (${s.nome})`, fonte: 'talento', effetto: ridotto });
    }
  }
  // A.106: penombra e luce molto scarsa (il buio è Accecato, sopra); la visione che copre il bersaglio le elimina;
  // Visione Perfetta riduce di 3, fino a 0, la penalità alla Percezione visiva
  const luce = luceAttiva(sessione, dati);
  // sintesi Accecato e A.116: chi è già Accecato non riceve anche la penalità di luce (la stessa impossibilità di vedere,
  // una volta sola)
  const cieco = attivi.has('accecato');
  if (!cieco && luce?.effetti?.length && !(sessione.luceVisione === true && (r.illuminazione.visione?.elimina ?? []).includes(luce.id))) {
    const VP = r.illuminazione.visione_perfetta;
    const perfetta = VP && scheda && (scheda.talentiLiberi ?? []).some((t) => (t.id ?? t) === VP.talento);
    const usi = luce.effetti.filter((e) => e.ambito === 'uso_specifico')
      .map((e) => (perfetta && e.uso === VP.uso ? { ...e, valore: Math.min(0, e.valore + VP.riduzione), condizione: `${e.condizione} Visione Perfetta: −${VP.riduzione} alla penalità.` } : e))
      .filter((e) => e.valore < 0);
    out.push({ etichetta: `Luce: ${luce.nome}`, fonte: 'stato', effetto: effettoDaEffetti(luce.effetti), usi });
  }
  // A.116: le Prove il cui uso «richiede la vista» ricevono la penalità di luce una volta sola (penombra −2, luce molto
  // scarsa −4; con una visione che copre il bersaglio nulla); nel buio −8 come Accecato, salvo le Abilità che Accecato
  // penalizza già (categorie_prove.vista)
  const vista = luce || cieco ? abilitaVista(sessione, dati).filter((x) => x.attiva) : [];
  if (vista.length) {
    const RV = r.illuminazione.richiede_vista;
    const coperta = !!luce && sessione.luceVisione === true && (r.illuminazione.visione?.elimina ?? []).includes(luce.id);
    const gen = (luce?.effetti ?? []).find((e) => e.ambito === 'generale' && e.prove === 'luce')?.valore ?? 0;
    // Accecato (Stato o buio) penalizza già le Prove della categoria «vista»: le altre con la casella ricevono il suo −8
    const giaAccecato = new Set(r.categorie_prove?.vista ?? []);
    const valore = cieco ? RV.buio_va : coperta ? 0 : gen;
    const nomi = vista.map((x) => x.nome).filter((n) => !(cieco && giaAccecato.has(n)));
    const etichetta = cieco ? (luce?.stato ? `Luce: ${luce.nome} (richiede la vista)` : 'Accecato (richiede la vista)') : `Luce: ${luce.nome} (richiede la vista)`;
    if (valore && nomi.length) out.push({ etichetta, fonte: 'stato', effetto: { va_abilita: Object.fromEntries(nomi.map((n) => [n, valore])) } });
  }
  // circostanze del Direttore (Giocatore §1.4; src/circostanze.js): una condizione per riga
  out.push(...condizioniCircostanza(sessione, dati));
  // §5.2.6: il Sovraccarico penalizza le Prove fisiche, compresi attacchi e Difese
  if (scheda && r.carico) {
    const c = calcolaCarico(scheda, sessione, dati);
    if (c.livello.effetto) out.push({ etichetta: c.livello.nome, fonte: 'carico', effetto: c.livello.effetto });
  }
  return out;
}

/**
 * Lista di effetti di uno Stato (schema degli effetti degli oggetti) → effetto di condizione
 * { va, salvezze, va_abilita, va_gruppi } per il VA generale. Gli usi specifici restano a parte.
 */
export function effettoDaEffetti(effetti) {
  const e = {};
  for (const x of effetti.filter((y) => y.ambito === 'generale')) {
    if (x.tipo === 'salvezza') e.salvezze = (e.salvezze ?? 0) + x.valore; // «tutte»: le quattro Prove Salvezza
    else if (x.prove === 'tutte') e.va = (e.va ?? 0) + x.valore;
    else if (x.prove) (e.va_gruppi ??= {})[x.prove] = (e.va_gruppi[x.prove] ?? 0) + x.valore;
    else if (x.abilita) (e.va_abilita ??= {})[x.abilita] = (e.va_abilita[x.abilita] ?? 0) + x.valore;
  }
  return e;
}

/**
 * Limiti degli Stati attivi per le utility (regole.json → stati: «azioni», «limiti»), dai dati e
 * mai scritti nel codice delle utility:
 * - senzaAzioniPrincipali: Stati con 0 Azioni Principali (Stordito, Svenuto);
 * - manovreVietate: id della manovra → Stato (Accecato: Tiro e Colpo Mirato);
 * - soloDifensive: Stati che lasciano le Azioni Principali solo per difendersi (Terrorizzato).
 */
export function limitiStati(sessione, dati) {
  const attivi = statiEffettivi(sessione, dati);
  const stati = dati.regole.stati.elenco.filter((s) => attivi.has(s.id));
  const manovreVietate = new Map();
  for (const s of stati) for (const m of s.limiti?.manovre_vietate ?? []) manovreVietate.set(m, { nome: s.nome, testo: s.limiti.testo, fonte: s.limiti.fonte });
  return {
    senzaAzioniPrincipali: stati.filter((s) => s.azioni?.principali === 0).map((s) => ({ nome: s.nome, testo: s.azioni.fonte })),
    manovreVietate,
    soloDifensive: stati.filter((s) => s.limiti?.solo_azioni_difensive).map((s) => ({ nome: s.nome, testo: s.limiti.testo, fonte: s.limiti.fonte })),
  };
}

/** Avvisi comuni delle utility d'attacco e di lancio per gli Stati attivi (testi dai dati). */
export function avvisiStati(sessione, dati, { offensiva = true } = {}) {
  const l = limitiStati(sessione, dati);
  return [
    ...l.senzaAzioniPrincipali.map((s) => `${s.nome}: nessuna Azione Principale (${s.testo}).`),
    ...(offensiva ? l.soloDifensive.map((s) => `${s.nome}: ${s.testo} (${s.fonte})`) : []),
  ];
}

function perAmbiti(ambiti, valore) {
  const e = {};
  for (const a of ambiti ?? ['abilita', 'salvezze']) e[a === 'abilita' ? 'va' : a] = valore;
  return e;
}

/** Contributo di una condizione al VA di un'Abilità (0 se non la riguarda). */
export function effettoSuAbilita(effetto, abilita, dati) {
  const gruppi = dati.regole.categorie_prove ?? {};
  let v = effetto.va ?? 0;
  v += effetto.va_categorie?.[abilita.categoria] ?? 0;
  v += effetto.va_abilita?.[abilita.nome] ?? 0;
  for (const [g, x] of Object.entries(effetto.va_gruppi ?? {})) if ((gruppi[g] ?? []).includes(abilita.nome)) v += x;
  return v;
}

const voce = (etichetta, valore, fonte) => ({ etichetta, valore, fonte });
const somma = (voci) => voci.reduce((s, x) => s + x.valore, 0);

/**
 * Penalità degli Stati su una Prova di Abilità per un partecipante senza scheda completa (nemico dello scontro): gli stessi
 * effetti dei PG (regole.json → stati, intensità di Ammalato, Stati implicati come Svenuto → A Terra), senza Ferite,
 * Affaticamento o luce. { totale, voci: [{ etichetta, valore }] }.
 * @param stati id degli Stati del partecipante; intensita { idStato: livello } (A.119)
 */
export function penalitaStatiAbilita(stati, intensita, nomeAbilita, dati) {
  const ab = (dati.abilita?.abilita ?? []).find((a) => a.nome === nomeAbilita) ?? { nome: nomeAbilita };
  const voci = condizioniAttive({ statiAttivi: Array.isArray(stati) ? stati : [], intensitaStati: intensita ?? {} }, dati)
    .map((c) => ({ etichetta: c.etichetta, valore: effettoSuAbilita(c.effetto, ab, dati) })).filter((x) => x.valore);
  return { totale: somma(voci), voci };
}

/** Gli Stati di un partecipante con quelli implicati (Svenuto → A Terra): per proporre «Bersaglio A Terra». */
export const statiConImplicati = (stati, dati) => [...statiEffettivi({ statiAttivi: Array.isArray(stati) ? stati : [] }, dati)];
/** Parte «da regole» di una scomposizione: il riferimento per colore e segno ▼/▲ nella scheda. */
const daRegole = (voci) => somma(voci.filter((x) => x.fonte === 'regole'));

const meno = (n) => (n < 0 ? `−${-n}` : String(n));

/**
 * Scomposizione in una riga: «Furtività 9 = 11 (Valore da regole) − 2 (Ferita Importante)».
 * @param {{etichetta, valore}[]} voci
 */
export function formulaScomposizione(nome, voci) {
  const totale = somma(voci);
  const parti = voci.map((x, i) => (i === 0 ? `${meno(x.valore)} (${x.etichetta})` : `${x.valore < 0 ? '−' : '+'} ${Math.abs(x.valore)} (${x.etichetta})`));
  return `${nome} ${meno(totale)} = ${parti.join(' ')}`;
}

/**
 * Effetti degli oggetti su un'Abilità nella modalità tavolo (docs/effetti-oggetti.md). I generali
 * sono già nel VA con l'equipaggiamento; qui:
 * - situazionali: con la condizione dell'oggetto accesa entrano nel VA effettivo; spenti restano
 *   «disponibili» (nel tooltip);
 * - usi specifici: il VA generale non cambia; per ogni uso un valore a parte.
 * Giocatore §1.4.1: «Si applica un solo modificatore complessivo per la qualità degli strumenti
 * impiegati»: fra i bonus degli oggetti per la stessa Prova vale il maggiore; le penalità si sommano.
 * A.114 (E&L del 05/10/2026): il chip del Processore non è uno strumento e si somma al migliore degli strumenti;
 * con i benefici tecnologici equivalenti (impianti, elmetti, esoscheletri: regole.json → impianti.chip.equivalenti,
 * Equipaggiamento §7.1) vale il maggiore, anche contro i bonus generali già nel VA.
 */
function effettiOggettiAbilita(effetti, accesi, a, dati = null) {
  const EQ = dati?.regole?.impianti?.chip?.equivalenti ?? null;
  const chip = (e) => e.beneficio === 'chip_processore';
  const tecnologico = (e) => chip(e) || (!!EQ && ((EQ.tipi ?? []).includes(e.tipoOggetto) || (EQ.famiglie ?? []).includes(e.famiglia)));
  const separaChip = !!EQ && dati?.regole?.impianti?.chip?.strumenti === 'si_somma';
  const miei = effetti.filter((e) => e.abilita === a.nome && e.ambito !== 'generale');
  const situ = miei.filter((e) => e.ambito === 'situazionale');
  const on = situ.filter((e) => accesi.has(e.uid));
  const migliore = (lista) => lista.filter((e) => e.valore > 0).reduce((m, e) => (!m || e.valore > m.valore ? e : m), null);
  // strumenti (§1.4.1) da una parte, benefici tecnologici con il chip dall'altra (§7.1)
  const bonusOn = migliore(separaChip ? on.filter((e) => !tecnologico(e)) : on);
  const tecOn = separaChip ? migliore(on.filter(tecnologico)) : null;
  // bonus tecnologico generale già nel VA per questa Abilità (impianto, elmetto, esoscheletro): il chip lo supera soltanto
  const tecGen = separaChip ? effetti.filter((e) => e.abilita === a.nome && e.ambito === 'generale' && e.valore > 0 && tecnologico(e)).reduce((m, e) => Math.max(m, e.valore), 0) : 0;
  const penalitaOn = on.filter((e) => e.valore < 0);
  const voci = [...(bonusOn ? [bonusOn] : []), ...penalitaOn].map((e) => voce(`${e.oggetto} (condizione attiva)`, e.valore, 'oggetto'));
  if (tecOn && tecOn.valore > tecGen) voci.push(voce(`${tecOn.oggetto} (${chip(tecOn) ? 'chip attivo' : 'condizione attiva'}${tecGen ? `, oltre il +${tecGen} tecnologico già nel VA` : ''})`, tecOn.valore - tecGen, 'oggetto'));
  const nonCumulati = on.filter((e) => (e.valore > 0 && e !== bonusOn && e !== tecOn) || (e === tecOn && tecOn.valore <= tecGen))
    .map((e) => ({ ...e, motivoNonCumulato: separaChip && tecnologico(e) ? 'non si somma: fra benefici tecnologici equivalenti vale il maggiore (Equipaggiamento §7.1, A.114)' : null }));
  const disponibili = situ.filter((e) => !accesi.has(e.uid));
  const usi = new Map();
  for (const e of miei.filter((x) => x.ambito === 'uso_specifico')) (usi.get(e.uso) ?? usi.set(e.uso, []).get(e.uso)).push(e);
  return { voci, nonCumulati, disponibili, usi, bonusOn };
}

/** Valore di ogni uso specifico: dal VA effettivo, con un solo bonus degli strumenti (§1.4.1). */
function valoriUsi(usi, effettivo, bonusOn) {
  return [...usi].map(([uso, lista]) => {
    // i Talenti non sono strumenti: i loro bonus si sommano (docs/effetti-oggetti.md, «Talenti»)
    const talenti = lista.filter((e) => e.talento).reduce((s, e) => s + e.valore, 0);
    const strumenti = lista.filter((e) => !e.talento);
    const bonus = strumenti.filter((e) => e.valore > 0).reduce((m, e) => (!m || e.valore > m.valore ? e : m), null);
    const penalita = strumenti.filter((e) => e.valore < 0).reduce((s, e) => s + e.valore, 0);
    const giaAcceso = bonusOn?.valore ?? 0;
    const valore = effettivo - giaAcceso + Math.max(giaAcceso, bonus?.valore ?? 0) + penalita + talenti;
    return {
      uso, valore, base: effettivo, modificatore: valore - effettivo,
      oggetti: lista.map((e) => ({ oggetto: e.oggetto, valore: e.valore, condizione: e.condizione ?? null, fonte: e.fonte ?? null, contato: e.talento || e.valore < 0 || e === bonus, talento: !!e.talento })),
      assorbito: !!bonus && giaAcceso >= bonus.valore, permanente: lista.every((e) => e.permanente),
    };
  });
}

/**
 * Effetti dei Talenti su un'Abilità al tavolo (docs/censimento-talenti.md): generali sempre,
 * situazionali con l'interruttore acceso (sessione → talentiAccesi), usi specifici come valore a parte.
 * Con l'interruttore «Bonus dei Talenti» spento non contano: la provenienza li mostra barrati.
 */
function talentiAbilita(effetti, accesi, vale, a) {
  const miei = effetti.filter((e) => (e.tipo ?? 'va') === 'va' && e.abilita === a.nome);
  const attivi = miei.filter((e) => e.ambito === 'generale' || (e.ambito === 'situazionale' && accesi.has(e.chiave)));
  const etichetta = (e) => (e.ambito === 'situazionale' ? `${e.talento} (condizione attiva)` : e.talento);
  return {
    voci: attivi.filter(vale).map((e) => voce(etichetta(e), e.valore, fonteEffetto(e))),
    spenti: attivi.filter((e) => !vale(e)).map((e) => ({ ...riga(etichetta(e), e.valore, 'Talenti spenti: non conta'), escluso: true, barrato: true })),
    disponibili: miei.filter((e) => e.ambito === 'situazionale' && (!vale(e) || !accesi.has(e.chiave)))
      .map((e) => ({ uid: e.chiave, oggetto: e.talento, valore: e.valore, condizione: e.condizione, fonte: e.fonte, talento: true })),
    usi: miei.filter((e) => e.ambito === 'uso_specifico' && vale(e)),
  };
}

/** Categoria della voce di un effetto di Talento o di Tecnica in corso (nota della provenienza). */
const fonteEffetto = (e) => (e.tecnica ? 'tecnica' : 'talento');

/** Voci delle condizioni per un'Abilità: [{ etichetta, valore, fonte }]. */
function vociCondizioniAbilita(condizioni, abilita, dati) {
  return condizioni.map((c) => voce(c.etichetta, effettoSuAbilita(c.effetto, abilita, dati), c.fonte)).filter((x) => x.valore);
}

/**
 * Aggiunge alla scheda i valori effettivi, sempre (senza sessione coincidono con quelli a riposo):
 * - abilita[i]: effettivo, daRegole, scomposizione (regole, equipaggiamento, condizioni);
 * - salvezze[id]: effettivo, daRegole, scomposizione;
 * - equipaggiamento.armi[i]: vaEffettivo, vaDaRegole, scomposizione; parata: vaEffettivo,
 *   distanzaEffettiva, vaDaRegole, scomposizione;
 * - equipaggiamento.protezioni[i].parata: ravvicinataEffettiva, distanzaEffettiva, daRegole,
 *   scomposizioneRavvicinata, scomposizioneDistanza;
 * - condizioni: le condizioni attive; carico: il carico trasportato (src/carico.js), con la sessione.
 * Ogni scomposizione è [{ etichetta, valore, fonte: 'regole'|'equipaggiamento'|'ferite'|'affaticamento'|'corruzione'|'stato'|'carico' }].
 * Accanto, `provenienza` { totale, righe: [{ fonte, valore, nota? }] } (src/provenienza.js): gli stessi
 * contributi con il valore da regole scomposto nelle sue voci (Caratteristica, Addestramento,
 * Corporazione, Classe, Avanzamento) e le righe che non contano ma si vedono (oggetti a 0, Rotti,
 * bonus non cumulabili). È quella che i tooltip della SD stampano.
 */
export function applicaCondizioni(scheda, sessione, dati) {
  const condizioni = condizioniAttive(sessione, dati, scheda);
  const perNome = new Map();
  // oggetti Rotti (0 PI, Armamenti §7.2.1): i loro effetti non valgono al tavolo
  const rotti = oggettiRotti(sessione, dati);
  const effettiOggetti = (scheda.equipaggiamento?.effettiOggetti ?? []).filter((e) => !rotti.has(e.uid));
  const accesi = new Set(isOggetto(sessione) && Array.isArray(sessione.condizioniOggetti) ? sessione.condizioniOggetti : []);
  // Talenti (docs/censimento-talenti.md): solo al tavolo, con la sessione; senza sessione (stampa,
  // avanzamento) i valori restano a riposo. L'interruttore «Bonus dei Talenti» li spegne tutti.
  const alTavolo = isOggetto(sessione);
  const talOn = bonusTalentiAccesi(sessione);
  const effT = alTavolo ? effettiTalenti(scheda, dati) : [];
  const talAccesi = new Set(alTavolo && Array.isArray(sessione.talentiAccesi) ? sessione.talentiAccesi : []);
  scheda.bonusTalenti = talOn;
  scheda.effettiTalenti = effT;
  scheda.talentiAccesi = [...talAccesi];
  // Tecniche Interiori in corso (src/tecniche.js): stesso schema dei Talenti, valgono finché sono attive
  // e anche con «Bonus dei Talenti» spento (sono attivazioni pagate, non Talenti passivi)
  const effTec = alTavolo ? effettiTecniche(sessione, dati) : [];
  scheda.effettiTecniche = effTec;
  const effV = [...effT, ...effTec];
  const vale = (e) => talOn || !!e.tecnica;
  const spento = (e, etichetta = e.talento) => ({ ...riga(etichetta, e.valore, 'Talenti spenti: non conta'), escluso: true, barrato: true });
  scheda.abilita = scheda.abilita.map((a) => {
    const cond = vociCondizioniAbilita(condizioni, a, dati);
    const ogg = effettiOggettiAbilita(effettiOggetti, accesi, a, dati);
    const tal = talentiAbilita(effV, talAccesi, vale, a);
    for (const e of tal.usi) (ogg.usi.get(e.uso) ?? ogg.usi.set(e.uso, []).get(e.uso)).push({ oggetto: e.talento, valore: e.valore, uso: e.uso, condizione: e.condizione, fonte: e.fonte, talento: true });
    // usi specifici degli Stati (A Terra: equilibrio; Assordato: udito): valore a parte, VA generale invariato
    for (const c of condizioni) {
      for (const e of c.usi ?? []) {
        const tocca = e.abilita ? e.abilita === a.nome : e.prove === 'tutte' || (dati.regole.categorie_prove?.[e.prove] ?? []).includes(a.nome);
        if (!tocca) continue;
        (ogg.usi.get(e.uso) ?? ogg.usi.set(e.uso, []).get(e.uso)).push({ oggetto: c.etichetta, valore: e.valore, uso: e.uso, condizione: e.condizione, fonte: e.fonte });
      }
    }
    const scomposizione = [
      voce('Valore da regole', a.totale, 'regole'),
      ...(a.componentiEquip ?? (a.equip ? [voce('Equipaggiamento', a.equip, 'equipaggiamento')] : [])).filter((c) => !(c.effetto && rotti.has(c.uid))),
      ...ogg.voci,
      ...tal.voci,
      ...cond,
    ];
    const effettivo = somma(scomposizione);
    const righe = [
      ...righeRegoleAbilita(a, scheda),
      ...(a.componentiEquip ?? (a.equip ? [voce('Equipaggiamento', a.equip, 'equipaggiamento')] : [])).map((c) => (c.effetto && rotti.has(c.uid)
        ? { ...riga(c.etichetta, c.valore, 'Rotto: non conta'), escluso: true, barrato: true }
        : riga(c.etichetta, c.valore, c.effetto ? 'effetto dell’oggetto' : 'equipaggiamento'))),
      ...(scheda.equipaggiamento?.zeriEquip?.[a.nome] ?? []).map((z) => riga(z.etichetta, z.valore, z.nota)),
      ...righeDaScomposizione(ogg.voci),
      ...ogg.nonCumulati.map((e) => ({ ...riga(`${e.oggetto} (condizione attiva)`, e.valore, e.motivoNonCumulato ?? 'non si somma: un solo modificatore degli strumenti per Prova (§1.4.1)'), escluso: true })),
      ...righeDaScomposizione(tal.voci),
      ...tal.spenti,
      ...righeDaScomposizione(cond),
    ];
    const x = {
      ...a, effettivo, daRegole: a.totale, scomposizione, provenienza: provenienza(righe, effettivo), condizioni: somma(cond),
      disponibili: [...ogg.disponibili, ...tal.disponibili], nonCumulati: ogg.nonCumulati, usiSpecifici: valoriUsi(ogg.usi, effettivo, ogg.bonusOn),
    };
    perNome.set(a.nome, x);
    return x;
  });
  scheda.oggettiAccesi = effettiOggetti.filter((e) => e.ambito === 'situazionale' && accesi.has(e.uid));
  // attivazioni di Artefatti accese al tavolo (Guanti da Combattimento Mistico, Armamenti §7.24): oggetto in uso
  if (scheda.equipaggiamento) scheda.equipaggiamento.attivazioniAccese = (scheda.equipaggiamento.attivazioniArtefatti ?? []).filter((x) => x.attivo && accesi.has(x.chiave) && !rotti.has(x.uid));

  for (const [id, s] of Object.entries(scheda.salvezze ?? {})) {
    const cond = condizioni.filter((c) => c.effetto.salvezze).map((c) => voce(c.etichetta, c.effetto.salvezze, c.fonte));
    // Talenti generali, o situazionali accesi, sulla Prova Salvezza (Scudo Spirituale)
    const attiviT = effV.filter((e) => e.tipo === 'salvezza' && e.salvezza === id
      && (e.ambito === 'generale' || (e.ambito === 'situazionale' && talAccesi.has(e.chiave))));
    const etichettaT = (e) => (e.ambito === 'situazionale' ? `${e.talento} (condizione attiva)` : e.talento);
    const vociT = attiviT.filter(vale).map((e) => voce(etichettaT(e), e.valore, fonteEffetto(e)));
    s.scomposizione = [voce('Valore da regole', s.totale, 'regole'), ...vociT, ...cond];
    s.effettivo = somma(s.scomposizione);
    s.daRegole = s.totale;
    s.provenienza = provenienza([...righeRegoleSalvezza(s, scheda), ...righeDaScomposizione(vociT), ...attiviT.filter((e) => !vale(e)).map((e) => spento(e, etichettaT(e))), ...righeDaScomposizione(cond)], s.effettivo);
  }
  // usi specifici dei Talenti (e delle Tecniche in corso) sulle Prove Salvezza e sulle Prove di
  // Caratteristica: valori a parte.
  // Giocatore §8.6: strutturale + Prova Salvezza Migliorata + Resistenza specifica non oltre il tetto
  scheda.usiSalvezzeTalenti = effV.filter((e) => e.tipo === 'salvezza' && e.ambito === 'uso_specifico' && vale(e)).map((e) => {
    const s = e.salvezza ? scheda.salvezze?.[e.salvezza] : null;
    if (!s) return { talento: e.talento, uso: e.uso, salvezza: null, nome: null, valore: null, modificatore: e.valore, condizione: e.condizione, fonte: e.fonte };
    const mod = e.resistenza ? Math.min(s.tetto ?? Infinity, s.totale + e.valore) - s.totale : e.valore;
    return { talento: e.talento, uso: e.uso, salvezza: e.salvezza, nome: s.nome, valore: s.effettivo + mod, modificatore: mod, limitato: mod < e.valore, condizione: e.condizione, fonte: e.fonte };
  });
  scheda.usiCaratteristicheTalenti = effV.filter((e) => e.tipo === 'caratteristica' && vale(e)).map((e) => ({
    talento: e.talento, uso: e.uso, caratteristiche: e.caratteristiche, valore: e.valore, condizione: e.condizione, fonte: e.fonte,
  }));
  // sensi delle Tecniche in corso (Vista Felina, Eco del Pipistrello): { nome, raggio_q, fonte, condizione }
  scheda.sensi = effTec.filter((e) => e.tipo === 'senso').map((e) => ({ nome: e.senso, raggioQ: e.raggio_q, fonte: e.talento, condizione: e.condizione }));

  const eq = scheda.equipaggiamento;
  if (eq) {
    const condDi = (nome) => { const a = perNome.get(nome); return a ? vociCondizioniAbilita(condizioni, a, dati) : []; };
    // «VA <Abilità>» dentro un altro valore: la riga porta la scomposizione dell'Abilità come dettaglio
    const conDettaglio = (v) => {
      const a = perNome.get(String(v.etichetta).replace(/^VA /, ''));
      return a && v.valore === a.totale ? [riga(v.etichetta, v.valore, null, { dettaglio: righeRegoleAbilita(a, scheda) })] : null;
    };
    const difese = eq.abilitaDifese ?? 'Difese';
    const condDifese = condDi(difese);
    const condArmi = new Map((dati.regole.condizioni_armi?.elenco ?? []).map((c) => [c.id, c]));
    const statiArmi = isOggetto(sessione?.condizioniArmi) ? sessione.condizioniArmi : {};
    for (const w of eq.armi) {
      // Armamenti §7.20.3: la granata caricata nel lanciatore stabilisce danno, AC, RS e proprietà; senza una
      // scelta resta la munizione di riferimento (§7.8). Le granate da lancio: quante ne restano nella voce.
      if (w.granate) {
        const g = w.granate.find((x) => x.uid === sessione?.munizioni?.[w.uid]?.tipo);
        if (g) applicaMunizione(w, g.esplosivo);
        w.granataCaricata = g ? { uid: g.uid, nome: g.nome } : w.munizioneRiferimento ? { uid: null, nome: w.munizioneRiferimento.nome } : null;
      }
      if (w.granata) w.granata.disponibili = Math.max(0, w.granata.quantita - (sessione?.scorte?.[w.uid] ?? 0));
      // A.49: condizione dell'arma al tavolo (Giocatore §5.17), distinta dai PI
      const ca = condArmi.get(statiArmi[String(w.uid).split(':')[0]] ?? statiArmi[w.uid]);
      w.condizioneArma = ca && ca.id !== 'integra' ? { id: ca.id, nome: ca.nome, va: ca.va, utilizzabile: ca.utilizzabile, testo: ca.testo } : null;
      // risposta A.10: stato al tavolo dell'attacco (lama estratta): cambia il danno, il resto no
      if (w.statoAlternativo) {
        w.statoAlternativo.acceso = accesi.has(w.statoAlternativo.chiave);
        if (w.statoAlternativo.acceso) {
          // §5.13: anche il danno dello stato alternativo riceve il bonus di Caratteristica
          w.danno = { una_mano: aggiungiDanno(w.statoAlternativo.danno, w.bonusCaratteristica?.bonus ?? 0), due_mani: null };
          w.nome = w.nome.replace(w.statoAlternativo.nomeOpposto, w.statoAlternativo.nome);
        }
      }
      // Talenti: danno (Meccanica Potenziata, solo armi Artefatto) e VA per colpire, al tavolo
      const def = (eq.oggetti ?? []).find((o) => o.uid === String(w.uid).split(':')[0])?.def ?? null;
      const valeT = (e) => (e.attacchi === 'tutti' || (e.attacchi === 'ravvicinati') === (w.tipo === 'arma_ravvicinata'))
        && (e.armi !== 'artefatto' || !!infoArtefatto(def, dati));
      const dannoT = effV.filter((e) => e.tipo === 'danno' && e.ambito === 'generale' && valeT(e));
      if (dannoT.length && w.danno) {
        const n = dannoT.filter(vale).reduce((s, e) => s + e.valore, 0);
        if (n) w.danno = { una_mano: aggiungiDanno(w.danno.una_mano, n), due_mani: aggiungiDanno(w.danno.due_mani, n) };
        if (w.righeDanno) w.righeDanno = [...w.righeDanno, ...dannoT.map((e) => (vale(e) ? riga(e.talento, e.valore, e.tecnica ? 'Tecnica Interiore (§8.9)' : 'Talento') : spento(e)))];
      }
      const attaccoT = effV.filter((e) => e.tipo === 'attacco' && e.ambito === 'generale' && valeT(e));
      const cond = [...condDi(w.abilita), ...attaccoT.filter(vale).map((e) => voce(e.talento, e.valore, fonteEffetto(e))), ...(w.condizioneArma?.va ? [voce(w.condizioneArma.nome, w.condizioneArma.va, 'condizione')] : [])];
      w.scomposizione = [...(w.componenti ?? []).map((c) => voce(c.nome, c.valore, c.fonte ?? 'equipaggiamento')), ...cond];
      w.vaEffettivo = w.va === null ? null : w.va + somma(cond);
      w.vaDaRegole = w.va === null ? null : daRegole(w.scomposizione);
      if (w.va !== null) w.provenienza = provenienza(righeDaScomposizione(w.scomposizione, { regole: conDettaglio }), w.vaEffettivo);
      if (w.righeDanno) {
        const righe = w.statoAlternativo?.acceso ? [riga(`Danno (${w.statoAlternativo.nome})`, w.statoAlternativo.danno), ...w.righeDanno.slice(1)] : w.righeDanno;
        w.provenienzaDanno = provenienza(righe, w.danno?.una_mano ?? w.danno?.due_mani ?? '—');
      }
      if (w.parata) {
        w.parata.scomposizione = [...w.parata.componenti.map((c) => voce(c.nome, c.valore, c.fonte ?? 'equipaggiamento')), ...condDifese];
        w.parata.vaEffettivo = w.parata.va + somma(condDifese);
        w.parata.vaDaRegole = daRegole(w.parata.scomposizione);
        w.parata.distanzaEffettiva = w.parata.distanza === null || w.parata.distanza === undefined ? null : w.parata.distanza + somma(condDifese);
        w.parata.provenienza = provenienza(righeDaScomposizione(w.parata.scomposizione, { regole: conDettaglio }), w.parata.vaEffettivo);
      }
    }
    // §7.4.11: Parata con lo Scudo = Difese (con l'equipaggiamento) + modificatori dello Scudo − FOR insufficiente
    const d = perNome.get(difese);
    for (const p of eq.protezioni) {
      if (!p.parata || !d) continue;
      const comuni = [voce(`VA ${difese}`, d.totale, 'regole'), ...(d.componentiEquip ?? []).map((c) => voce(c.etichetta, c.valore, 'equipaggiamento'))];
      const perDistanza = (k) => {
        const voci = [...comuni, voce(`${p.nome}, ${k === 'ravvicinata' ? 'ravvicinata' : 'a distanza'} (§7.4.11)`, p.parata.modificatori[k], 'equipaggiamento'),
          p.forMancante ? voce(`FOR insufficiente (${p.nome})`, -p.forMancante, 'equipaggiamento') : null].filter((x) => x && x.valore !== 0 || x?.fonte === 'regole');
        // se i conti a riposo non tornano (profili speciali) si tiene il valore calcolato come una voce sola
        const aRiposo = somma(voci) === p.parata[k] ? voci : [voce(`Parata di ${p.nome}`, p.parata[k], 'equipaggiamento')];
        // Talenti (Parata a Distanza: con lo scudo la penalità a distanza passa da −4 a −2)
        const talP = talOn && p.tipo === 'scudo' ? effT.filter((e) => e.tipo === 'parata' && e.con === 'scudo' && e.contro === k).map((e) => voce(e.talento, e.valore, 'talento')) : [];
        return [...aRiposo, ...talP, ...condDifese];
      };
      p.parata.scomposizioneRavvicinata = perDistanza('ravvicinata');
      p.parata.scomposizioneDistanza = perDistanza('distanza');
      p.parata.ravvicinataEffettiva = somma(p.parata.scomposizioneRavvicinata);
      p.parata.distanzaEffettiva = somma(p.parata.scomposizioneDistanza);
      p.parata.provenienzaRavvicinata = provenienza(righeDaScomposizione(p.parata.scomposizioneRavvicinata, { regole: conDettaglio }), p.parata.ravvicinataEffettiva);
      p.parata.provenienzaDistanza = provenienza(righeDaScomposizione(p.parata.scomposizioneDistanza, { regole: conDettaglio }), p.parata.distanzaEffettiva);
      p.parata.daRegole = d.totale;
    }
  }
  if (eq && d0(perNome, eq)) {
    // Difese: le proprietà difensive delle armi e i modificatori degli Scudi valgono solo nella Parata
    // (§7.1.3, §7.4.11): righe che non contano, così il tooltip delle Difese non ne omette nessuna
    const d = d0(perNome, eq);
    const altrove = [
      ...eq.armi.filter((w) => w.parata?.proprieta?.length).flatMap((w) => w.parata.proprieta.map((x) => ({ ...riga(x.nome, x.valore, 'solo nella Parata con l’arma (§7.1.3)'), escluso: true }))),
      ...eq.protezioni.filter((p) => p.parata?.modificatori).map((p) => ({
        ...riga(p.nome, p.parata.modificatori.ravvicinata, `solo nella Parata con lo Scudo: ${p.parata.modificatori.ravvicinata >= 0 ? '+' : '−'}${Math.abs(p.parata.modificatori.ravvicinata)} ravvicinata, ${p.parata.modificatori.distanza >= 0 ? '+' : '−'}${Math.abs(p.parata.modificatori.distanza)} a distanza (§7.4.11)`),
        escluso: true,
      })),
    ];
    if (altrove.length) d.provenienza = { ...d.provenienza, righe: [...d.provenienza.righe, ...altrove] };
  }
  if (eq) {
    // AR al tavolo: effetti situazionali accesi, oggetti Rotti esclusi (docs/ricognizione-ar-pi.md)
    const talenti = (scheda.classi ?? []).flatMap((c) => (c.talenti ?? []).map((t) => t.nome));
    // A.48: Aura di Resistenza e Pelle di Rinoceronte valgono finché sono attive («Attiva», §8.9.1)
    const conTecniche = new Set([...accesi, ...chiaviTecnicheAttive(sessione)]);
    eq.arEffettiva = calcolaAR(eq, dati, { talenti, accesi: conTecniche, rotti, tecniche: (scheda.tecniche ?? []).map((t) => t.id), incantesimi: arIncantesimiInCorso(sessione) });
    eq.rotti = [...rotti];
    for (const w of eq.armi) w.rotta = rotti.has(String(w.uid).split(':')[0]);
    for (const p of eq.protezioni) p.rotta = rotti.has(String(p.uid).split(':')[0]);
  }
  scheda.condizioni = condizioni;
  scheda.carico = isOggetto(sessione) && dati.regole.carico ? calcolaCarico(scheda, sessione, dati) : null;
  scheda.tavolo = valoriTavolo(scheda, sessione, dati);
  return scheda;
}

/** Abilità delle Difese già calcolata (applicaCondizioni). */
const d0 = (perNome, eq) => perNome.get(eq.abilitaDifese ?? 'Difese') ?? null;

/**
 * Iniziativa, Movimento e Azioni effettivi per la modalità tavolo, con la scomposizione:
 * - Iniziativa (§2.14): Mod DES + Mod INT e i Talenti (scheda.vociIniziativa), tutti «da regole»;
 * - Movimento (§5.2): Passo, Corsa, Scatto da regole (Talenti compresi); MOV dell'armatura una volta
 *   sul budget di ogni modalità (Armamenti §7.11.1); Sovraccarico −2 Q e solo Passo (§5.2.6);
 *   Stati con `movimento` in regole.json (A Terra, Immobilizzato, Rallentato, Stordito, Svenuto, §5.5, §5.18);
 * - Azioni (§5.1): Principali e di Movimento per Round; Stati con `azioni` (Stordito, Svenuto).
 * Ogni valore: { effettivo, daRegole, scomposizione, note }; le modalità non disponibili hanno effettivo null.
 */
export function valoriTavolo(scheda, sessione, dati) {
  const r = dati.regole;
  const attivi = statiEffettivi(sessione, dati);
  const stati = r.stati.elenco.filter((s) => attivi.has(s.id));

  // con l'interruttore «Bonus dei Talenti» spento le voci dei Talenti (Iniziativa Migliorata…) non contano
  const talOff = scheda.bonusTalenti === false;
  const tutteIni = (scheda.vociIniziativa ?? [{ etichetta: 'Iniziativa', valore: scheda.iniziativa ?? 0 }]).map((v) => voce(v.etichetta, v.valore, 'regole'));
  const eMod = (v) => /^Mod /.test(v.etichetta) || v.etichetta === 'Iniziativa';
  const vociIni = talOff ? tutteIni.filter(eMod) : tutteIni;
  const iniSpente = talOff ? tutteIni.filter((v) => !eMod(v)) : [];
  // effetti «iniziativa» dell'equipaggiamento in uso (Allerta tattica dell'elmetto, Armamenti §7.21.2)
  const vociIniEquip = (scheda.equipaggiamento?.iniziativa ?? []).map((v) => voce(v.etichetta, v.valore, 'equipaggiamento'));
  // circostanze del Direttore sulle Derivate (src/circostanze.js)
  const vociIniCond = (scheda.condizioni ?? condizioniAttive(sessione, dati, scheda)).filter((c) => c.effetto.iniziativa).map((c) => voce(c.etichetta, c.effetto.iniziativa, c.fonte));
  const iniziativa = { effettivo: somma([...vociIni, ...vociIniEquip, ...vociIniCond]), daRegole: somma(vociIni), scomposizione: [...vociIni, ...vociIniEquip, ...vociIniCond], note: [] };
  iniziativa.provenienza = provenienza([
    ...vociIni.map((v) => riga(v.etichetta, v.valore, /^Mod /.test(v.etichetta) ? 'Caratteristica (§2.14)' : 'Talento')),
    ...iniSpente.map((v) => ({ ...riga(v.etichetta, v.valore, 'Talenti spenti: non conta'), escluso: true, barrato: true })),
    ...righeDaScomposizione(vociIniEquip),
    ...righeDaScomposizione(vociIniCond),
  ], iniziativa.effettivo);

  const base = scheda.movimento ?? {};
  const mov = scheda.equipaggiamento?.movimentoQ ?? 0;
  // Assalto Armato (Assaltatore, Armamenti §7.11.1): riduce di 2 Q complessivi, fino a 0, la penalità
  // MOV di armatura indossata e scudo impugnato (non quella delle armi)
  const movProtezioni = scheda.equipaggiamento?.movimentoQProtezioni ?? 0;
  const assalto = talOff ? [] : effettiTalenti(scheda, dati).filter((e) => e.tipo === 'movimento_armatura');
  const vociAssalto = movProtezioni < 0 ? assalto.map((e) => voce(e.talento, Math.min(e.valore, -movProtezioni), 'talento')).slice(0, 1) : [];
  const carico = isOggetto(sessione) && r.carico ? (scheda.carico ?? calcolaCarico(scheda, sessione, dati)) : null;
  const liv = carico?.livello ?? null;
  const tecMov = scheda.effettiTecniche ?? [];
  const movimento = {};
  for (const modo of ['passo', 'corsa', 'scatto']) {
    const note = [];
    let voci = [voce(`${modo[0].toUpperCase()}${modo.slice(1)} da regole`, base[modo] ?? 0, 'regole')];
    if (mov) voci.push(voce('Armatura (MOV)', mov, 'equipaggiamento'), ...vociAssalto);
    // Equipaggiamento §7.5: Q in più al Movimento degli impianti installati (gambe potenziate)
    for (const m of scheda.equipaggiamento?.movimentoEquip ?? []) voci.push(voce(m.etichetta, m.valore, 'equipaggiamento'));
    let disponibile = true;
    if (liv?.movimento_q && modo === 'passo') voci.push(voce(liv.nome, liv.movimento_q, 'carico'));
    // E&L 5 (A.31): oltre il carico massimo Movimento 0 Q
    if (liv?.movimento_zero) { disponibile = modo === 'passo'; if (modo === 'passo') voci.push(voce(liv.nome, -Math.max(0, somma(voci)), 'carico')); else note.push(`${liv.nome}: Movimento 0 Q (§5.2.6)`); }
    if (liv?.solo_passo && modo !== 'passo') { disponibile = false; note.push(`${liv.nome}: soltanto Passo (§5.2.6)`); }
    // Tecniche in corso (§8.9): Corsa di Nomura raddoppia il movimento attuale
    for (const e of tecMov.filter((x) => x.tipo === 'movimento_moltiplicatore')) {
      const ora = Math.max(0, somma(voci));
      voci.push(voce(`${e.talento} (×${e.valore})`, ora * (e.valore - 1), 'tecnica'));
    }
    for (const s of stati) {
      const m = s.movimento;
      if (!m) continue;
      if (m.nessuno) { disponibile = false; note.push(`${s.nome}: ${m.fonte}`); continue; }
      if (m.solo_passo && modo !== 'passo') { disponibile = false; note.push(`${s.nome}: ${m.fonte}`); }
      if (modo === 'passo' && Number.isInteger(m.passo_q)) {
        const ora = Math.max(0, somma(voci));
        if (m.passo_q < ora) voci.push(voce(`${s.nome} (Passo ${m.passo_q} Q)`, m.passo_q - ora, 'stato'));
      }
    }
    // Radici della Montagna: «Il movimento disponibile diventa 0.»
    for (const e of tecMov.filter((x) => x.tipo === 'movimento_zero')) {
      const ora = Math.max(0, somma(voci));
      if (ora) voci.push(voce(e.talento, -ora, 'tecnica'));
    }
    // il budget non scende sotto 0 (§5.2.6: «minimo 0»)
    const totale = Math.max(0, somma(voci));
    if (totale !== somma(voci)) voci = [...voci, voce('minimo 0', totale - somma(voci), 'regole')];
    movimento[modo] = { effettivo: disponibile ? totale : null, daRegole: base[modo] ?? 0, scomposizione: voci, note };
    movimento[modo].provenienza = provenienza([...righeDaScomposizione(voci), ...(disponibile ? [] : note.map((n) => ({ ...riga(n, 0), escluso: true })))], disponibile ? totale : null);
  }
  movimento.unita = base.unita ?? 'Q';

  const azioni = {};
  for (const tipo of ['principali', 'movimento']) {
    const b = scheda.azioni?.[tipo] ?? 0;
    const voci = [voce(tipo === 'principali' ? 'Azioni Principali da regole' : 'Azioni di Movimento da regole', b, 'regole')];
    const note = [];
    for (const s of stati) {
      const x = s.azioni?.[tipo];
      if (!Number.isInteger(x)) continue;
      const ora = somma(voci);
      if (x < ora) voci.push(voce(s.nome, x - ora, 'stato'));
      note.push(`${s.nome}: ${s.azioni.fonte}`);
    }
    azioni[tipo] = { effettivo: somma(voci), daRegole: b, scomposizione: voci, note, provenienza: provenienza(righeDaScomposizione(voci)) };
  }
  return { iniziativa, movimento, azioni };
}
