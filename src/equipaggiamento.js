// Equipaggiamento nella scheda (docs/roadmap-equipaggiamento-e-scheda.md, §1): modello delle voci
// del personaggio, catalogo caricato da data/equipaggiamento/ e calcolo degli effetti. Funzioni
// pure. Solo gli oggetti attivi (impugnati, imbracciati, indossati, in uso) producono effetti; le
// incoerenze (due armature, mani impegnate…) sono avvisi, non blocchi: decide il master.
//
// Voce del personaggio: { uid, rif: "armi:spada-leggera" | null, personalizzato?: { nome, tipo,
//   abilita?, danno?, ar?, testo?, peso?, effetti? }, stato, quantita, montato_su?: uid, note,
//   dotazione_iniziale?: true, dotazione_id?: id dell'oggetto di dotazione (§2.16, src/dotazioni.js) }
//
// Effetti sui VA (docs/effetti-oggetti.md): «effetti» dell'oggetto del catalogo, dell'oggetto di
// dotazione (data/dotazioni.json → oggetti_dotazione) o del personalizzato:
//   [{ tipo?, abilita, valore, ambito: 'generale'|'situazionale'|'uso_specifico', uso?, condizione?, fonte?, beneficio?, proprieta? }]
// tipo: va (predefinito), attacco, danno, iniziativa, salvezza, caratteristica, contromisura, ar_contro, ar.
// Copie dello stesso «beneficio» non si sommano: vale il maggiore (Armamenti §7.21.1).
// Contano solo con l'oggetto in uso (indossato, impugnato…): gli oggetti senza stati propri che
// hanno effetti ricevono «In uso» / «Nello zaino».
// peso: kg per unità (Equipaggiamento §1.6, §1.10), per il carico (src/carico.js).

import { bonusDannoCaratteristica, caratteristicaDanno } from './calc.js';
import { riga, provenienza, rigaBonusCaratteristica as rigaBonus } from './provenienza.js';
import { calcolaAR, oggettiConPi, oggettiSenzaPi } from './protezione.js';

export const TIPI = ['arma_ravvicinata', 'arma_distanza', 'scudo', 'armatura', 'elmetto', 'accessorio', 'munizioni', 'sanitario', 'artefatto', 'impianto', 'altro'];

export const NOMI_TIPI = {
  arma_ravvicinata: 'Arma ravvicinata',
  arma_distanza: 'Arma a distanza',
  scudo: 'Scudo',
  armatura: 'Armatura',
  elmetto: 'Elmetto',
  accessorio: 'Accessorio',
  munizioni: 'Munizioni',
  sanitario: 'Sanitario',
  artefatto: 'Artefatto',
  impianto: 'Impianto cibernetico',
  altro: 'Altro',
};

// Roadmap §1.3: stati possibili per tipo. I tipi senza stati hanno solo la quantità.
export const STATI = {
  arma_ravvicinata: ['impugnata', 'pronta', 'zaino'],
  arma_distanza: ['impugnata', 'pronta', 'zaino'],
  scudo: ['imbracciato', 'pronta', 'zaino'],
  armatura: ['indossata', 'zaino'],
  // Armamenti §7.21.1: un solo elmetto indossato; indossarlo o toglierlo costa 1 AzP
  elmetto: ['indossata', 'zaino'],
  accessorio: ['in_uso', 'zaino'],
  munizioni: [],
  sanitario: [],
  // Magia sez. 6: il contenitore deve essere trasportato per alimentare un lancio
  artefatto: ['trasportato', 'zaino'],
  // Equipaggiamento §7.1: l'impianto installato è parte del corpo; posseduto e non installato, nello zaino
  // (installare e togliere: cambi di stato fatti a mano, docs/ricognizione-cibernetica.md H3)
  impianto: ['installato', 'zaino'],
  altro: [],
};

// docs/layout-sd.md, «Inventario»: il deposito comune vale per ogni tipo. L'oggetto resta del
// personaggio, ma fuori dal carico, senza effetti e non disponibile al tavolo (munizioni, applicazioni).
export const STATO_DEPOSITO = 'deposito';

export const NOMI_STATI = {
  deposito: 'Deposito comune',
  impugnata: 'Impugnata',
  pronta: 'Addosso (pronta)',
  zaino: 'Nello zaino',
  imbracciato: 'Imbracciato',
  indossata: 'Indossata',
  in_uso: 'In uso / montato',
  trasportato: 'Trasportato',
  installato: 'Installato',
};

const ATTIVI = new Set(['impugnata', 'imbracciato', 'indossata', 'in_uso', 'installato']);
// stati degli oggetti senza stati propri (altro, sanitario, munizioni) quando hanno effetti sui VA
const STATI_CON_EFFETTI = ['in_uso', 'zaino'];
export const AMBITI_EFFETTO = ['generale', 'situazionale', 'uso_specifico'];
export const NOMI_AMBITI = { generale: 'sempre', situazionale: 'condizione da attivare al tavolo', uso_specifico: 'solo per un uso' };

/** Stati ammessi per un oggetto: quelli del tipo, oppure In uso / Nello zaino se ha effetti. */
export function statiPer(tipo, effetti = []) {
  const s = STATI[tipo] ?? [];
  return s.length || !effetti.length ? s : STATI_CON_EFFETTI;
}

/**
 * Scelte del controllo di stato dell'Inventario per una voce risolta: gli stati del tipo (null = «Con
 * sé» per i tipi senza stati) più il deposito comune.
 */
export function statiInventario(r) {
  return [...(r.stati.length ? r.stati : [null]), STATO_DEPOSITO];
}

/** true se la voce è nel deposito comune. */
export const inDeposito = (voce) => voce?.stato === STATO_DEPOSITO;

const NOMI_SALVEZZE = { tempra: 'Tempra', riflessi: 'Riflessi', volonta: 'Volontà', magia: 'Magia' };
const segnoEff = (n) => `${n > 0 ? '+' : '−'}${Math.abs(n)}`;
const ATTACCHI_TESTO = { tutti: 'alle Prove per colpire', ravvicinati: 'agli attacchi ravvicinati', distanza: 'agli attacchi a distanza' };

/** «+2 VA a Percezione (solo per tracce)», «+1 VA a Oratoria (con la condizione)», «Contromisura Concussivo 1». */
export function testoEffettoOggetto(e) {
  const tipo = e.tipo ?? 'va';
  if (tipo === 'attacco') return `${segnoEff(e.valore)} VA ${ATTACCHI_TESTO[e.attacchi] ?? ''}`.trim();
  if (tipo === 'danno') return `${segnoEff(e.valore)} danno ${ATTACCHI_TESTO[e.attacchi] ?? ''}`.trim();
  if (tipo === 'iniziativa') return `${segnoEff(e.valore)} Iniziativa`;
  if (tipo === 'movimento') return `${segnoEff(e.valore)} Q al Movimento`;
  if (tipo === 'salvezza') return `${segnoEff(e.valore)} alla PS ${e.salvezza ? NOMI_SALVEZZE[e.salvezza] ?? e.salvezza : 'già prevista'} (solo ${e.uso})`;
  if (tipo === 'caratteristica') return `${segnoEff(e.valore)} alla Prova di ${e.caratteristiche.join(' o ')} (solo ${e.uso})`;
  if (tipo === 'contromisura') return `Contromisura ${e.effetto} ${e.valore}`;
  if (tipo === 'ar_contro') return `${segnoEff(e.valore)} AR contro ${e.contro}`;
  if (tipo === 'riduzione_stato') return `riduce di ${e.valore} la penalità di ${e.stato[0].toUpperCase()}${e.stato.slice(1)}${e.ambito === 'situazionale' ? ' (con la condizione attiva)' : ''}`;
  if (tipo === 'movimento_armatura') return `riduce di ${e.valore} Q la penalità MOV di armatura e scudo`;
  if (tipo === 'ar') return `${segnoEff(e.valore)} AR${e.magica ? ` (di cui ${e.magica} magica)` : ''}${e.ambito === 'situazionale' ? ' (con la condizione attiva)' : ''}`;
  const v = `${e.valore > 0 ? '+' : '−'}${Math.abs(e.valore)} VA ${/^[aA]/.test(e.abilita) ? 'ad' : 'a'} ${e.abilita}`;
  if (e.ambito === 'uso_specifico') return `${v} (solo per ${e.uso})`;
  if (e.ambito === 'situazionale') return `${v} (con la condizione attiva)`;
  return v;
}

/**
 * Rapporto di Convertire Potere e della ricarica dei contenitori di Chroma (Magia sez. 6; Giocatore
 * §3.9.5; regole.json → chroma.conversione): ordinario 3:1, ridotto per ciascun Talento posseduto fra
 * quelli elencati (Ricarica Efficiente, Conversione Migliorata: 2:1, entrambi 1:1); il Bianco resta
 * 2:1 (rapporti_fissi). Serve l'Addestramento Taumaturgo. Con «Bonus dei Talenti» spento, il
 * rapporto ordinario.
 * @returns {{ rapporto, talenti: string[], fissi: {colore: n}, disponibile: boolean, addestramento } | null}
 */
export function rapportoConversione(scheda, dati) {
  const cv = dati.regole.chroma?.conversione;
  if (!cv) return null;
  const nomeLibero = new Map((dati.talenti_liberi?.talenti ?? []).map((t) => [t.id, t.nome]));
  const posseduti = new Set([
    ...(scheda?.talentiLiberi ?? []).map((t) => nomeLibero.get(t.id) ?? t.nome),
    ...(scheda?.classi ?? []).flatMap((c) => (c.talenti ?? []).map((t) => t.nome)),
  ]);
  const talenti = scheda?.bonusTalenti === false ? [] : cv.talenti_riduzione.filter((n) => posseduti.has(n));
  const addestramento = typeof scheda?.addestramento === 'string' ? scheda.addestramento : scheda?.addestramento?.nome ?? null;
  return {
    rapporto: cv.rapporto_per_talenti[talenti.length], talenti, fissi: cv.rapporti_fissi ?? {},
    disponibile: addestramento === cv.addestramento_richiesto, addestramento: cv.addestramento_richiesto,
  };
}

/** Effetti di un personaggio personalizzato, ripuliti (l'Abilità si controlla al calcolo). */
export function normalizzaEffetti(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter(isOggetto).map((e) => {
    const x = {
      abilita: testo(e.abilita).trim(),
      valore: Number.isInteger(e.valore) ? e.valore : 0,
      ambito: AMBITI_EFFETTO.includes(e.ambito) ? e.ambito : 'generale',
    };
    if (x.ambito === 'uso_specifico') x.uso = testo(e.uso).trim().slice(0, 40) || 'uso indicato';
    if (testo(e.condizione).trim()) x.condizione = testo(e.condizione).trim().slice(0, 300);
    return x;
  }).filter((e) => e.abilita && e.valore);
}
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const testo = (v) => (typeof v === 'string' ? v : '');
const normalizzaTesto = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------------------------------------------------------------------------
// Catalogo

/**
 * Catalogo piatto degli oggetti di tutti i file elencati in data/equipaggiamento/index.json.
 * Ogni oggetto riceve `rif` ("<file>:<id>") e un riferimento alle tabelle del suo file.
 */
/** Legenda delle modalità di fuoco (§7.7) raccolta dai file del catalogo. */
export function legendaModalita(dati) {
  const out = {};
  for (const f of Object.values(dati?.equipaggiamento?.file ?? {})) Object.assign(out, f.modalita ?? {});
  return out;
}

/** Regole di sintonizzazione (§7.10) dal file del catalogo che le definisce. */
export function regoleSintonizzazione(dati) {
  for (const f of Object.values(dati?.equipaggiamento?.file ?? {})) if (f.sintonizzazione) return f.sintonizzazione;
  return null;
}

/**
 * Dati di Artefatto di un oggetto del catalogo (§7.5, §7.10): il campo «artefatto» dell'oggetto
 * oppure la riga di «artefatti_catalogo» di un altro file (profili con riserva mistica).
 */
export function infoArtefatto(def, dati) {
  if (!def) return null;
  if (def.artefatto) return def.artefatto;
  for (const f of Object.values(dati?.equipaggiamento?.file ?? {})) {
    const a = (f.artefatti_catalogo ?? []).find((x) => x.rif === def.rif);
    if (a) return a;
  }
  return null;
}

/**
 * Dati di Artefatto di una voce risolta: dal catalogo (infoArtefatto) oppure dall'oggetto
 * personalizzato di tipo «artefatto» (§7.5: «qualunque forma e materiale»). Il costo di
 * sintonizzazione si ricava dalla potenza (§7.10); energia e capacita_pm ne fanno un contenitore.
 */
export function infoArtefattoVoce(r, dati) {
  if (r.def) return infoArtefatto(r.def, dati);
  const p = r.voce?.personalizzato;
  if (!p || p.tipo !== 'artefatto' || !p.potenza) return null;
  const costo = regoleSintonizzazione(dati)?.potenze?.[p.potenza];
  if (!Number.isInteger(costo)) return null;
  const contenitore = p.energia && Number.isInteger(p.capacita_pm) ? { energia: p.energia, capacita_pm: p.capacita_pm } : undefined;
  return { tipologia: contenitore ? 'Batterie e contenitori' : 'Accessori', potenza: p.potenza, sintonizzazione: costo, sintonizzabile: true, ...(contenitore ? { contenitore } : {}) };
}

/** Colori del Chroma (regole.json → chroma.colori), con il loro nome. */
export function coloriChroma(dati) {
  return dati?.regole?.chroma?.colori ?? {};
}

/**
 * Contenitori di Chroma della lista (Magia sez. 6; Armamenti §7.5, §7.5.1): uno per voce, con
 * energia, capacità, macrofamiglie alimentate, sintonizzazione e trasporto. I contenitori
 * «integrati» sono la riserva di un oggetto (Bordone Templare, Scudo delle Guardie Sacre…): hanno
 * lo stesso uid dell'oggetto e un solo costo di sintonizzazione, quello dell'oggetto.
 */
/**
 * Riserve dei NEC da segnare al tavolo (Equipaggiamento 0.5, §5.4; regole.json → nec), come i PM dei
 * contenitori di Chroma ma con unità tecnologiche:
 * - celle e pacchi del catalogo (nec.json): la riserva in Lx (capacità × quantità);
 * - apparecchi con un NEC compreso (campo «alimentazione»): ore di autonomia o usi, come la scheda
 *   («La scheda riporta ore oppure cariche», §5.4.2); una riserva per componente (videosorveglianza,
 *   allarme). Le alimentazioni «esterne» (postazioni, laboratorio) non hanno riserva propria: conta il
 *   Modulo che le alimenta. Le celle d'arma restano colpi e cariche delle munizioni.
 * `provenienza`: { totale, righe } come i valori calcolati (src/provenienza.js), per il tooltip.
 * @returns {{ chiave, uid, nome, unita, massimo, passi: number[], nec: string|null, provenienza }[]}
 */
export function riserveNec(voci, dati) {
  const R = dati?.regole?.nec;
  if (!R) return [];
  const cat = catalogo(dati);
  const passi = R.passi_tavolo ?? {};
  const par = (p) => (String(p).startsWith('§') ? `Equipaggiamento ${p}` : p);
  const out = [];
  for (const v of voci ?? []) {
    const r = risolvi(v, cat);
    if (r.fuoriCatalogo || !r.def) continue;
    const d = r.def;
    if (d.nec) {
      // §5.4.1: «La capacità massima e la carica residua si misurano in Lx»
      const q = Math.max(1, Number.isInteger(v.quantita) ? v.quantita : 1);
      const massimo = d.nec.capacita_lx * q;
      out.push({
        chiave: r.uid, uid: r.uid, nome: r.nome, unita: 'Lx', massimo, nec: d.rif,
        passi: massimo > 10000 ? passi.lx_grandi ?? [100, 1000] : passi.lx ?? [10, 100],
        provenienza: { totale: `${massimo.toLocaleString('it-IT')} Lx`, righe: [{ fonte: q > 1 ? `${d.nome} ×${q}` : d.nome, valore: `${d.nec.capacita_lx.toLocaleString('it-IT')} Lx`, nota: `erogazione fino a ${d.nec.erogazione_lxh.toLocaleString('it-IT')} Lx/h (${par(d.paragrafo)})` }] },
      });
      continue;
    }
    // un'alimentazione o più (postazioni medicochirurgiche: Rosso per le operazioni, Verdi per la degenza, §6.8)
    const alimentazioni = Array.isArray(d.alimentazione) ? d.alimentazione : d.alimentazione ? [d.alimentazione] : [];
    alimentazioni.forEach((a, j) => {
    if (a.esterna) return;
    const fonte = `${a.moduli > 1 ? `${a.moduli} × ` : ''}${a.nec ? cat.perRif.get(a.nec)?.nome ?? a.nec : a.descrizione}`;
    const base = j ? `${r.uid}#a${j}` : r.uid;
    const nomeBase = alimentazioni.length > 1 ? `${r.nome} (${a.unita_usi ?? 'ore'})` : r.nome;
    const usi = a.usi !== undefined;
    const massimo = usi ? a.usi : a.autonomia_ore;
    const unita = usi ? a.unita_usi : 'ore';
    const riga = usi
      ? { fonte, valore: `${a.usi} ${a.unita_usi}`, nota: `${a.lx_per_uso} Lx per uso${a.consumo_lxh ? `, ${a.consumo_lxh} Lx/h durante l’uso` : ''} (${par(a.paragrafo)})` }
      : { fonte, valore: `${a.autonomia_ore} ore`, nota: `${a.consumo_lxh ? `${a.consumo_lxh} Lx/h` : 'autonomia della scheda'} (${par(a.paragrafo)})` };
    (a.componenti ?? [null]).forEach((comp, i) => out.push({
      chiave: comp ? `${base}#${i}` : base, uid: r.uid, nome: comp ? `${nomeBase} (${comp})` : nomeBase, unita, massimo, nec: a.nec,
      passi: usi ? passi.usi ?? [1] : passi.ore ?? [1, 5],
      provenienza: { totale: `${massimo} ${unita}`, righe: [comp ? { ...riga, fonte: `${fonte}, ${comp}` } : riga] },
    }));
    });
  }
  return out;
}

/**
 * Promemoria delle cure di un oggetto sanitario (campo «cura», Equipaggiamento 0.5 cap. 6; Giocatore
 * §5.16): una frase con i numeri, per tooltip, Inventario e stampa. Nessun tiro: i dadi si tirano al tavolo.
 * @returns {string|null}
 */
export function testoCura(c) {
  if (!c) return null;
  const parti = [];
  if (c.sanguinamento === 'sospende') parti.push(`sospende il Sanguinamento per ${c.round} Round`);
  if (c.sanguinamento === 'arresta') parti.push('arresta il Sanguinamento');
  if (c.pv) parti.push(`recupera ${c.pv} PV fino al massimo${c.senza_sanguinamento ? ', solo senza Sanguinamento attivo (anche durante una sospensione)' : ''}`);
  if (c.ferita_stati) parti.push(`riduce la Ferita di ${c.ferita_stati === 1 ? 'uno stato' : `${c.ferita_stati} stati`}${c.durate ? ` in ${c.durate.map((x) => `${x.minuti}′ da ${x.stato}`).join(', ')}` : ''}`);
  if (c.procedure) parti.push(c.procedure.map((p) => `${p.nome} (${p.tempo}): ${p.effetto.replace(/\.$/, '')}`).join('; '));
  if (c.degenza_giorni_per_stato) parti.push(`degenza: uno stato di Ferita ogni ${c.degenza_giorni_per_stato} giorni`);
  if (c.intervallo_ore) parti.push(`una dose ogni ${c.intervallo_ore} ore`);
  if (c.tentativo_settimanale === false) parti.push('non consuma il tentativo ogni sette giorni');
  if (c.tentativo_settimanale === true) parti.push('un tentativo ogni sette giorni, condiviso con Intervento Mirato e Terapia Intensiva');
  if (c.azp) parti.push(`${c.azp} AzP${c.prova === false ? ', senza Prova' : ''}`);
  else if (c.prova === false) parti.push('senza Prova');
  if (!parti.length) return null;
  const t = parti.join('; ');
  return `${t[0].toUpperCase()}${t.slice(1)} (${c.fonte.startsWith('§') ? `Equipaggiamento ${c.fonte}` : c.fonte}).`;
}

/** Prova medica di una postazione medicochirurgica (§6.8.1): «Medicina dell’operatore +3» o «IA con VA 12». */
export function testoProvaPostazione(p) {
  if (!p?.prova) return null;
  return p.prova.tipo === 'ia' ? `IA con VA ${p.prova.va} (oppure, a scelta, Medicina dell’operatore +3)` : `Medicina dell’operatore +${p.prova.bonus} strumenti`;
}

export function contenitori(voci, dati) {
  const cat = catalogo(dati);
  return contenitoriRisolti((voci ?? []).map((v) => risolvi(v, cat)), dati);
}

function contenitoriRisolti(oggetti, dati) {
  const colori = coloriChroma(dati);
  const out = [];
  for (const r of oggetti) {
    if (r.fuoriCatalogo) continue;
    const a = infoArtefattoVoce(r, dati);
    const c = a?.contenitore;
    if (!c) continue;
    const colore = colori[c.energia] ?? {};
    out.push({
      uid: r.uid, nome: r.nome, tipo: r.tipo, integrato: !!c.integrato,
      energia: c.energia, energiaNome: colore.energia ?? null, macrofamiglie: colore.macrofamiglie ?? [], regoleRimandate: !!colore.regole_rimandate,
      capacita: c.capacita_pm, potenza: a.potenza, costo: a.sintonizzazione,
      // nel deposito comune non è sintonizzabile (docs/layout-sd.md, pezzo 4): la scelta resta nella voce
      sintonizzato: r.voce.sintonizzato === true && !r.deposito,
      // E&L 2 (A.19): PM di un contenitore trovato, impostati dal giocatore; null = acquistato, pieno
      pmIniziali: !c.integrato && Number.isInteger(r.voce.pm_iniziali) ? Math.min(r.voce.pm_iniziali, c.capacita_pm) : null,
      stato: r.voce.stato,
      // un contenitore a sé è trasportato nello stato omonimo; uno integrato segue l'oggetto
      trasportato: c.integrato ? ['impugnata', 'imbracciato', 'pronta', 'indossata', 'in_uso'].includes(r.voce.stato) : r.voce.stato === 'trasportato',
      personalizzato: r.personalizzato,
    });
  }
  return out;
}

/**
 * Oggetti con applicazioni da contare in modalità tavolo (kit di pronto soccorso, Spray, set
 * chirurgici, §7.19): uid → { nome, capacita (applicazioni × quantità), unita, ricarica }.
 */
export function consumabili(voci, dati) {
  const cat = catalogo(dati);
  const out = [];
  for (const r of (voci ?? []).map((v) => risolvi(v, cat))) {
    if (r.deposito) continue; // nel deposito comune non si usa al tavolo
    if (r.def?.applicazioni) {
      out.push({ uid: r.uid, nome: r.nome, capacita: r.def.applicazioni * (r.voce.quantita ?? 1), unita: r.def.nome_applicazioni ?? 'applicazioni', ricarica: r.def.ricarica ?? null, gruppo: 'sanitario', effettoBreve: r.def.effetto_breve ?? null });
    }
    // le riserve di PM degli Artefatti sono contenitori di Chroma: vedi contenitori()
  }
  return out;
}

/**
 * Capacità del caricatore di ogni arma della lista (uid → numero o null), per il contatore munizioni
 * della modalità tavolo, più le applicazioni dei consumabili sanitari. Le riserve di PM (Chroma
 * integrato, §7.5.1) non sono caricatori: non si ricaricano sostituendo la cella, ma solo
 * convertendo PM (Magia sez. 6). Stanno in contenitori().
 */
export function caricatori(voci, dati) {
  const cat = catalogo(dati);
  const out = {};
  for (const v of voci ?? []) {
    const r = risolvi(v, cat);
    // armi a distanza (caricatore) e armi ravvicinate con cariche a cella (§7.1.4)
    const integrato = !!infoArtefatto(r.def, dati)?.contenitore?.integrato;
    if (!integrato && (r.tipo === 'arma_distanza' || (r.tipo === 'arma_ravvicinata' && r.def?.munizioni?.capacita))) out[v.uid] = r.def?.munizioni?.capacita ?? null;
    // §7.8: i moduli integrati hanno un'alimentazione separata dall'arma principale
    for (const m of moduliDi(r.def, cat)) out[`${v.uid}:${m.id}`] = m.munizioni?.capacita ?? null;
  }
  // §7.19: applicazioni dei kit e dei dispositivi sanitari, con lo stesso contatore
  for (const c of consumabili(voci, dati)) out[c.uid] = c.capacita;
  return out;
}

/** Moduli integrati (§7.8) dell'arma del catalogo `def`: oggetti con `modulo_di` uguale al suo rif. */
export function moduliDi(def, cat) {
  if (!def?.rif) return [];
  return cat.oggetti.filter((o) => o.modulo_di === def.rif);
}

/** Dati della munizione di riferimento di un lanciatore (§7.8, «Munizioni di riferimento dei lanciatori»). */
export function munizioneDiRiferimento(nome, dati) {
  if (!nome) return null;
  for (const f of Object.values(dati?.equipaggiamento?.file ?? {})) {
    const m = (f.munizioni_riferimento ?? []).find((x) => x.nome === nome);
    if (m) return m;
  }
  return null;
}

export function catalogo(dati) {
  const eq = dati?.equipaggiamento;
  const oggetti = [];
  for (const { id: fileId } of eq?.indice?.file ?? []) {
    const f = eq.file?.[fileId];
    for (const o of f?.oggetti ?? []) oggetti.push({ ...o, rif: `${fileId}:${o.id}`, file: fileId });
  }
  // oggetti della dotazione iniziale senza scheda di catalogo (§2.16): servono per gli effetti
  return { oggetti, perRif: new Map(oggetti.map((o) => [o.rif, o])), dotazione: dati?.dotazioni?.oggetti_dotazione ?? {} };
}

/** Voci per la cascata Tipo → Catalogo → Famiglia → Profilo: ogni livello solo ciò che esiste. */
export function opzioniCascata(dati, { tipo = null, catalogo: cat = null, famiglia = null } = {}) {
  const tutti = catalogo(dati).oggetti.filter((o) => !o.modulo_di); // §7.8: il modulo integrato è compreso nell'arma
  const unici = (lista) => [...new Set(lista)];
  const perTipo = tipo ? tutti.filter((o) => o.tipo === tipo) : [];
  const perCatalogo = cat ? perTipo.filter((o) => o.catalogo === cat) : [];
  const perFamiglia = famiglia ? perCatalogo.filter((o) => o.famiglia === famiglia) : [];
  return {
    tipi: TIPI.filter((t) => tutti.some((o) => o.tipo === t)),
    cataloghi: unici(perTipo.map((o) => o.catalogo)),
    famiglie: unici(perCatalogo.map((o) => o.famiglia)),
    profili: perFamiglia,
  };
}

/** Ricerca per nome (anche fra i nomi alternativi), senza accenti né maiuscole. */
export function cercaNelCatalogo(dati, testoCercato, massimo = 12) {
  const q = normalizzaTesto(testoCercato.trim());
  if (q.length < 2) return [];
  return catalogo(dati).oggetti
    .filter((o) => !o.modulo_di)
    .filter((o) => [o.nome, ...(o.nomi_alternativi ?? [])].some((n) => normalizzaTesto(n).includes(q)))
    .slice(0, massimo);
}

// ---------------------------------------------------------------------------
// Voci del personaggio

/**
 * Stato iniziale di una voce appena aggiunta: pronta per armi e scudi, indossata per armature se
 * nessuna lo è; «in uso» per gli oggetti senza stati propri che hanno effetti.
 */
export function statoIniziale(tipo, voci = [], dati = null, effetti = []) {
  const stati = statiPer(tipo, effetti);
  if (!stati.length) return null;
  if (tipo === 'armatura') {
    const giaIndossata = dati && voci.some((v) => v.stato === 'indossata' && risolvi(v, catalogo(dati)).tipo === 'armatura');
    return giaIndossata ? 'zaino' : 'indossata';
  }
  if (tipo === 'accessorio') return 'zaino';
  return stati.includes('pronta') ? 'pronta' : stati[0];
}

/** Nome dell'oggetto che raccoglie il vecchio campo di testo libero (formato 4 e precedenti). */
export const NOME_TESTO_PRECEDENTE = 'Equipaggiamento (testo precedente)';

/** «Difensiva +2» → «Difensiva»: il valore compare già accanto all'etichetta nella scomposizione. */
const nomeProprieta = (p) => String(p.nome).replace(/\s*[+−-]?\s*\d+$/, '');

/**
 * Porta il campo `equipaggiamento` delle scelte alla forma attuale. Il vecchio campo di testo
 * diventa un unico oggetto personalizzato di tipo «altro» con quel testo nelle note.
 * @returns {object[]}
 */
export function normalizzaEquipaggiamento(valore) {
  if (typeof valore === 'string') {
    const t = valore.trim();
    return t ? [{ uid: 'e1', rif: null, personalizzato: { nome: NOME_TESTO_PRECEDENTE, tipo: 'altro' }, stato: null, quantita: 1, note: t }] : [];
  }
  if (!Array.isArray(valore)) return [];
  const usati = new Set();
  return valore.filter(isOggetto).map((v, i) => {
    let uid = typeof v.uid === 'string' && v.uid && !usati.has(v.uid) ? v.uid : `e${i + 1}`;
    while (usati.has(uid)) uid = `${uid}x`;
    usati.add(uid);
    const out = {
      uid,
      rif: typeof v.rif === 'string' && v.rif ? v.rif : null,
      stato: typeof v.stato === 'string' ? v.stato : null,
      quantita: Number.isInteger(v.quantita) && v.quantita >= 1 ? v.quantita : 1,
      note: testo(v.note),
    };
    if (!out.rif) {
      const p = isOggetto(v.personalizzato) ? v.personalizzato : {};
      out.personalizzato = {
        nome: testo(p.nome).trim() || 'Oggetto personalizzato',
        tipo: TIPI.includes(p.tipo) ? p.tipo : 'altro',
        ...(testo(p.abilita) ? { abilita: p.abilita } : {}),
        ...(testo(p.danno) ? { danno: p.danno } : {}),
        ...(Number.isInteger(p.ar) && p.ar >= 0 ? { ar: p.ar } : {}),
        ...(testo(p.testo) ? { testo: p.testo } : {}),
        // Artefatto personalizzato (§7.5, §7.10): potenza → costo di sintonizzazione; contenitore di Chroma
        ...(testo(p.potenza) ? { potenza: p.potenza } : {}),
        ...(testo(p.energia) ? { energia: p.energia } : {}),
        ...(Number.isInteger(p.capacita_pm) && p.capacita_pm >= 1 ? { capacita_pm: p.capacita_pm } : {}),
        // §1.6: peso in kg per unità, per il carico
        ...(typeof p.peso === 'number' && Number.isFinite(p.peso) && p.peso >= 0 ? { peso: Math.round(p.peso * 100) / 100 } : {}),
      };
      const effetti = normalizzaEffetti(p.effetti);
      if (effetti.length) out.personalizzato.effetti = effetti;
    }
    if (typeof v.montato_su === 'string' && v.montato_su) out.montato_su = v.montato_su;
    if (v.sintonizzato === true) out.sintonizzato = true; // §7.10: scelta del giocatore
    if (Number.isInteger(v.pi_direttore) && v.pi_direttore >= 1) out.pi_direttore = v.pi_direttore; // A.47: PI fissati dal Direttore
    if (Number.isInteger(v.pm_iniziali) && v.pm_iniziali >= 0) out.pm_iniziali = v.pm_iniziali; // E&L 2 (A.19): contenitore trovato
    if (v.dotazione_iniziale === true) out.dotazione_iniziale = true; // §2.16: voce della dotazione iniziale (src/dotazioni.js)
    if (!out.rif && testo(v.dotazione_id)) out.dotazione_id = v.dotazione_id; // oggetto di dotazione: effetti dai dati
    return out;
  });
}

/**
 * A.47: separa un esemplare da un gruppo (quantità > 1) in una voce propria, per tracciarne i PI.
 * @returns {{ voci, uid: string|null }} la lista nuova e l'uid dell'esemplare separato
 */
export function separaEsemplare(voci, uid) {
  const lista = normalizzaEquipaggiamento(voci);
  const i = lista.findIndex((v) => v.uid === uid);
  if (i < 0 || lista[i].quantita < 2) return { voci: lista, uid: null };
  const usati = new Set(lista.map((v) => v.uid));
  let k = 2;
  while (usati.has(`${uid}-${k}`)) k++;
  const nuovo = { ...structuredClone(lista[i]), uid: `${uid}-${k}`, quantita: 1 };
  delete nuovo.montato_su;
  const out = [...lista];
  out[i] = { ...lista[i], quantita: lista[i].quantita - 1 };
  out.splice(i + 1, 0, nuovo);
  return { voci: out, uid: nuovo.uid };
}

/**
 * Collega una voce al catalogo. Un riferimento che non esiste più resta in lista come «non più in
 * catalogo», senza effetti.
 */
export function risolvi(voce, cat) {
  // oggetto di dotazione con scheda di catalogo (Equipaggiamento 0.3, oggetti_dotazione[id].rif): peso,
  // prezzo, Qualità, PI ed effetti dalla scheda, anche per le voci salvate prima; il nome resta
  // quello della dotazione (porta l'ambiente scelto e le calzature comprese)
  const schedaDotazione = !voce.rif && voce.dotazione_id ? cat.dotazione?.[voce.dotazione_id]?.rif ?? null : null;
  const def = voce.rif ? cat.perRif.get(voce.rif) ?? null : schedaDotazione ? cat.perRif.get(schedaDotazione) ?? null : null;
  const fuoriCatalogo = !!voce.rif && !def;
  const tipo = def?.tipo ?? voce.personalizzato?.tipo ?? 'altro';
  const nome = (schedaDotazione ? voce.personalizzato?.nome : null) ?? def?.nome ?? voce.personalizzato?.nome ?? (fuoriCatalogo ? voce.rif : 'Oggetto');
  const effetti = fuoriCatalogo ? [] : def?.effetti ?? cat.dotazione?.[voce.dotazione_id]?.effetti ?? voce.personalizzato?.effetti ?? [];
  const stati = statiPer(tipo, effetti);
  const attivo = !fuoriCatalogo && ATTIVI.has(voce.stato) && stati.includes(voce.stato);
  return { voce, uid: voce.uid, def, tipo, nome, fuoriCatalogo, attivo, personalizzato: !voce.rif && !def, effetti, stati, deposito: inDeposito(voce) };
}

// ---------------------------------------------------------------------------
// Calcolo

/** Aggiunge un bonus fisso a una formula di danno: "1d6+1" + 1 → "1d6+2"; "1d6+1d4+1" + 1 → "1d6+1d4+2"; "2" + 1 → "3". */
export function aggiungiDanno(formula, n) {
  if (!formula || !n) return formula ?? null;
  const s = String(formula).trim();
  let m = /^((?:\d+d\d+\+)*\d+d\d+)([+-]\d+)?$/.exec(s);
  if (m) {
    const b = Number(m[2] ?? 0) + n;
    return b ? `${m[1]}${b > 0 ? '+' : ''}${b}` : m[1];
  }
  m = /^\d+$/.exec(s);
  if (m) return String(Number(s) + n);
  return `${s} ${n > 0 ? '+' : ''}${n}`;
}

// "1/2" (Versatile) impegna almeno una mano; 0 = da polso, non impegna la mano (Howler, §7.14.6)
const maniDi = (def) => (def?.mani === 2 ? 2 : def?.mani === 0 ? 0 : 1);

/**
 * Un accessorio si può montare su quell'oggetto? «si_monta_su» del catalogo: tipo di oggetto
 * (arma_distanza, arma_ravvicinata, armatura) oppure «mirino» (un accessorio con dati di mirino,
 * §7.3.3). Gli accessori personalizzati si montano sulle armi.
 */
/** Un effetto «attacco» o «danno» vale per il tipo d'arma: tutti, ravvicinati, a distanza. */
export function valePer(b, tipoArma) {
  return b.attacchi === 'tutti' || (b.attacchi === 'ravvicinati' ? tipoArma === 'arma_ravvicinata' : tipoArma === 'arma_distanza');
}

export function puoMontare(acc, su) {
  if (!su || su.uid === acc.uid) return false;
  const dove = acc.def?.si_monta_su ?? ['arma_ravvicinata', 'arma_distanza'];
  return dove.some((k) => (k === 'mirino' ? !!su.def?.mirino : su.tipo === k));
}

/**
 * Penalità di una categoria d'armatura con gli effetti delle proprietà native (§7.11.4, §7.17.1):
 * `effetto.penalita.annulla` porta a 0 le penalità indicate, `riduce` le avvicina a 0 del valore
 * indicato (Articolazione d'assalto: −2 → −1; Assetto mistico 2: −3 → −1).
 */
export function penalitaConEffetti(base, proprieta = []) {
  const out = { ...base };
  for (const p of proprieta) {
    const e = p.effetto?.penalita;
    if (!e) continue;
    for (const k of e.annulla ?? []) out[k] = 0;
    for (const [k, x] of Object.entries(e.riduce ?? {})) out[k] = Math.min(0, (out[k] ?? 0) + x);
  }
  return out;
}

/**
 * Il kit di rinforzo che vale per l'armatura (§7.11.2): il primo compatibile. Avvisi per kit non
 * ammessi dal modello («rinforzi_ammessi», «compatibile_con» del kit) e per più kit insieme.
 */
function rinforzoValido(armatura, kits, avvisi) {
  const d = armatura.def;
  const validi = kits.filter((x) => {
    const ammesso = (d.rinforzi_ammessi ?? []).includes(x.def.rinforzo.kit) && (!x.def.compatibile_con || x.def.compatibile_con.includes(d.rif));
    if (!ammesso) avvisi.push(`${x.nome} non è ammesso su ${armatura.nome} (rinforzi ammessi: ${(d.rinforzi_ammessi ?? []).join(', ') || 'nessuno'}): nessun effetto (§7.11.2).`);
    return ammesso;
  });
  if (validi.length > 1) avvisi.push(`Su ${armatura.nome} ci sono più kit di rinforzo: vale soltanto ${validi[0].nome} (§7.11.2).`);
  return validi[0] ?? null;
}

/** Famiglia di munizioni delle armi (§7.20.9), raccolta dai file del catalogo: rif → famiglia. */
export function tabellaMunizioniArmi(dati) {
  const out = new Map();
  for (const f of Object.values(dati?.equipaggiamento?.file ?? {})) for (const x of f.munizioni_armi ?? []) out.set(x.rif, x.famiglia);
  return out;
}

export const NOMI_FAMIGLIE_MUNIZIONI = {
  pistola: 'proiettili da pistola', fucile: 'proiettili da fucile', pesanti: 'proiettili pesanti', pallini: 'cartucce a pallini', frecce: 'frecce',
  dardi_balestra_piccola: 'dardi da balestra piccola', dardi_balestra_grande: 'dardi da balestra grande', nimrod: 'cartucce Nimrod', combustibile: 'combustibile',
};

/** Tabella SIN delle armi (§7.15.1), raccolta dai file del catalogo: rif → { valore, prova }. */
export function tabellaSin(dati) {
  const out = new Map();
  for (const f of Object.values(dati?.equipaggiamento?.file ?? {})) for (const x of f.sin_armi ?? []) out.set(x.rif, x);
  return out;
}

/**
 * Effetti dell'equipaggiamento attivo sulla scheda.
 * @param {object} base { caratteristiche, abilita (dalla scheda, con `totale`), specializzazioni: [{id}] }
 * @param {object[]} voci voci normalizzate del personaggio
 * @returns {{ oggetti, armi, protezioni, zaino, equipAbilita, movimentoQ, lancioPotere, avvisi }}
 */
export function calcolaEquipaggiamento(base, voci, dati) {
  const cat = catalogo(dati);
  const oggetti = (voci ?? []).map((v) => risolvi(v, cat));
  const FOR = base.caratteristiche.FOR.valore;
  const fileArmature = dati.equipaggiamento?.file?.armature ?? {};
  const agilitaAbilita = fileArmature.abilita_agilita ?? [];
  const difeseAbilita = fileArmature.abilita_difese ?? null;
  const avvisi = [];
  // accessori in uso montati su un altro oggetto (§7.3 sulle armi, §7.11.2 sulle armature)
  const accessoriMontati = oggetti.filter((x) => x.attivo && x.tipo === 'accessorio' && x.voce.montato_su);
  const montatiSu = (uid) => accessoriMontati.filter((x) => x.voce.montato_su === uid);

  // Protezioni (armature indossate, scudi imbracciati) — §7.11.1
  const protezioni = [];
  const equipAbilita = {};
  // per la scomposizione dei valori effettivi: ogni contributo con etichetta e oggetto di origine
  const componentiEquip = {};
  // `da`: { uid, effetto: true } per i contributi degli effetti degli oggetti, che al tavolo cadono
  // se l'oggetto è Rotto (0 PI, Armamenti §7.2.1); le penalità delle armature non lo hanno
  const aggiungi = (nome, v, etichetta, da = null) => {
    if (!nome || !v) return;
    equipAbilita[nome] = (equipAbilita[nome] ?? 0) + v;
    (componentiEquip[nome] ??= []).push({ etichetta, valore: v, fonte: 'equipaggiamento', ...(da ?? {}) });
  };
  // armature indossate che non cambiano il VA di un'Abilità d'Agilità o delle Difese: riga «+0» nella
  // provenienza (src/provenienza.js), così si vede che l'app le ha considerate; non entrano nei calcoli
  const zeriEquip = {};
  let attacchiRavv = 0;
  let attacchiDist = 0;
  let movimentoQ = 0;
  let movimentoQProtezioni = 0; // parte di armatura e scudo (Assalto Armato)
  let lancioPotere = 0;
  let forMancanteArmature = 0;
  const rinforziValidi = new Set();
  for (const o of oggetti.filter((x) => x.attivo && (x.tipo === 'armatura' || x.tipo === 'scudo' || x.tipo === 'elmetto'))) {
    const d = o.def;
    let penalita = d ? { ...(fileArmature.categorie?.[d.categoria] ?? {}), ...(d.penalita ?? {}) } : {};
    let ar = d?.ar ?? (Number.isInteger(o.voce.personalizzato?.ar) ? { totale: o.voce.personalizzato.ar, magica: 0 } : null);
    let forRichiesta = d?.for_richiesta ?? null;
    let categoria = d?.categoria ?? null;
    // §7.11.2: un solo kit di rinforzo compatibile; aumenta AR e FOR richiesta. Una Leggera portata
    // fisicamente ad AR 3 o più usa le penalità della Media; le proprietà native restano applicabili
    const kit = o.tipo === 'armatura' && d ? rinforzoValido(o, montatiSu(o.uid).filter((x) => x.def?.rinforzo && puoMontare(x, o)), avvisi) : null;
    if (kit) {
      const k = kit.def.rinforzo;
      ar = { totale: (ar?.totale ?? 0) + k.ar, magica: ar?.magica ?? 0 };
      forRichiesta = (forRichiesta ?? 0) + k.for;
      // §7.23.10 (Armamenti 0.55): un Abbinamento ottimizzato conserva la categoria originaria
      const ottimizzato = (kit.def.abbinamento_ottimizzato ?? []).includes(d.rif);
      if (d.categoria === 'Leggera' && !ottimizzato && ar.totale - ar.magica >= 3 && fileArmature.categorie?.Media) {
        categoria = 'Media';
        penalita = { ...penalitaConEffetti(fileArmature.categorie.Media, d.proprieta), ...(d.penalita?.abilita ? { abilita: d.penalita.abilita } : {}) };
      }
      // §7.23.7: le proprietà del rinforzo che riducono le penalità dell'armatura (Articolazione
      // d'assalto: −1 → 0, mai oltre 0); §7.23.9: la stessa proprietà già nativa non si somma
      const native = new Set((d.proprieta ?? []).map((x) => x.nome));
      penalita = penalitaConEffetti(penalita, (kit.def.proprieta ?? []).filter((x) => !native.has(x.nome)));
      rinforziValidi.add(kit.uid);
    }
    const forMancante = forRichiesta ? Math.max(0, forRichiesta - FOR) : 0;
    protezioni.push({
      uid: o.uid, nome: o.nome, tipo: o.tipo, categoria, taglia: d?.taglia ?? null,
      categoriaBase: d?.categoria ?? null, rinforzo: kit ? { nome: kit.nome, kit: kit.def.rinforzo.kit, uid: kit.uid } : null,
      arKit: kit ? kit.def.rinforzo.ar : 0,
      // A.48: protezione classificata Artefatto Mistico o TecnoMistico (Corazza Potenziata)
      artefatto: !!d && infoArtefatto(d, dati)?.tipologia === 'Protezioni',
      ar, penalita, forRichiesta, forMancante, personalizzato: o.personalizzato,
      mov: d?.mov ?? 0, parata: null, proprieta: d?.proprieta ?? [],
      // §7.14.2, §7.16.3: armature servoassistite a sistema spento (FOR e penalità proprie), mostrate
      // come promemoria; il calcolo usa il profilo acceso
      alternative: o.tipo === 'armatura' ? (d?.profili_alternativi ?? []).map((a) => ({
        condizione: a.condizione, ar: a.ar ?? null, parata: null, forRichiesta: a.for_richiesta ?? null, penalita: a.penalita ?? null,
      })) : [],
      rinforziAmmessi: d?.rinforzi_ammessi ?? null, supporti: d?.supporti ?? null,
      // Armamenti §7.21.4: modifiche montate sull'elmetto (o sull'elmetto standard dell'armatura)
      modifiche: montatiSu(o.uid).filter((x) => x.def?.modifica_elmetto && puoMontare(x, o)).map((x) => x.nome),
    });
    // §7.21.1: l'elmetto non fornisce AR e non ha requisiti FOR né penalità
    if (o.tipo === 'elmetto') continue;
    if (o.tipo === 'scudo') {
      // §7.4: il requisito FOR dello Scudo segue il §7.1.6 (Parate e attacchi con lo Scudo), non
      // penalizza Agilità, Difese o gli altri attacchi; gli Scudi enormi tolgono 1 Q al MOV
      movimentoQ += d?.mov ?? 0;
      movimentoQProtezioni += d?.mov ?? 0;
      continue;
    }
    // §7.11.1: armature — penalità di categoria e FOR mancante su Agilità, Difese e attacchi
    for (const a of agilitaAbilita) {
      aggiungi(a, penalita.agilita ?? 0, `Agilità (${o.nome})`);
      aggiungi(a, -forMancante, `FOR insufficiente (${o.nome})`);
    }
    for (const a of new Set([...agilitaAbilita, difeseAbilita].filter(Boolean))) {
      const tocca = (a !== difeseAbilita || agilitaAbilita.includes(a) ? penalita.agilita ?? 0 : 0) || forMancante || penalita.abilita?.[a];
      if (!tocca) (zeriEquip[a] ??= []).push({ etichetta: o.nome, valore: 0, nota: 'armatura: nessuna penalità (§7.11.1)' });
    }
    // penalità proprie del modello su singole Abilità (APE: Furtività −2, §7.13.6)
    for (const [a, v] of Object.entries(penalita.abilita ?? {})) aggiungi(a, v, o.nome);
    aggiungi(difeseAbilita, -forMancante, `FOR insufficiente (${o.nome})`);
    attacchiRavv += (penalita.attacchi_ravvicinati ?? 0) - forMancante;
    attacchiDist += (penalita.attacchi_distanza ?? 0) - forMancante;
    movimentoQ += penalita.movimento_q ?? 0;
    movimentoQProtezioni += penalita.movimento_q ?? 0;
    lancioPotere += penalita.lancio_potere ?? 0;
    forMancanteArmature += forMancante;
  }
  // Effetti degli oggetti in uso (docs/effetti-oggetti.md). I generali entrano nel VA con
  // l'equipaggiamento, come le penalità delle armature; situazionali e d'uso specifico si raccolgono
  // qui e si applicano nella modalità tavolo (src/condizioni.js), il totale da regole non cambia.
  const effettiOggetti = [];
  const nomiAbilita = new Set(base.abilita.map((a) => a.nome));
  const perUidOgg = new Map(oggetti.map((o) => [o.uid, o]));
  // una modifica d'elmetto conta solo montata su un elmetto (o un'armatura, per il suo elmetto
  // standard) indossato (Armamenti §7.21.1, §7.21.4)
  // un rinforzo conta solo come kit valido di un'armatura indossata (Armamenti §7.23.4, §7.23.9)
  const modificaOperativa = (o) => {
    if (o.def?.rinforzo) return rinforziValidi.has(o.uid);
    if (!o.def?.modifica_elmetto) return true;
    const su = perUidOgg.get(o.voce.montato_su);
    return !!su && su.attivo && puoMontare(o, su);
  };
  // Equipaggiamento §7.10: un chip conta solo con un Processore installato («richiede_innesto»)
  const innesti = new Set(oggetti.filter((x) => x.attivo && x.def?.innesto).map((x) => x.def.innesto));
  const conInnesto = (o) => !o.def?.richiede_innesto || innesti.has(o.def.richiede_innesto);
  const candidati = [];
  for (const o of oggetti.filter((x) => x.attivo && x.effetti.length && modificaOperativa(x) && conInnesto(x))) {
    for (const e of o.effetti) candidati.push({ o, e });
  }
  // §7.21.1: «copie dello stesso beneficio non si sommano»: vale il maggiore
  const migliore = new Map();
  for (const c of candidati) {
    const k = c.e.beneficio;
    if (k && (!migliore.has(k) || c.e.valore > migliore.get(k).e.valore)) migliore.set(k, c);
  }
  const bonusAttacco = [];
  const dannoEquip = [];
  const iniziativaEquip = [];
  const movimentoEquip = [];
  for (const { o, e } of candidati) {
    if (e.beneficio && migliore.get(e.beneficio) !== candidati.find((c) => c.o === o && c.e === e)) continue;
    const tipo = e.tipo ?? 'va';
    if (tipo === 'va') {
      if (!nomiAbilita.has(e.abilita)) { avvisi.push(`${o.nome}: «${e.abilita}» non è un’Abilità, effetto ignorato.`); continue; }
      if (e.ambito === 'generale') aggiungi(e.abilita, e.valore, o.nome, { uid: o.uid, effetto: true });
    } else if (tipo === 'attacco') bonusAttacco.push({ nome: o.nome, valore: e.valore, attacchi: e.attacchi });
    else if (tipo === 'danno') dannoEquip.push({ nome: o.nome, valore: e.valore, attacchi: e.attacchi });
    else if (tipo === 'iniziativa') iniziativaEquip.push({ etichetta: o.nome, valore: e.valore });
    // Equipaggiamento §7.5: Q in più al Movimento (gambe potenziate)
    else if (tipo === 'movimento') movimentoEquip.push({ etichetta: o.nome, valore: e.valore });
    effettiOggetti.push({ uid: o.uid, oggetto: o.nome, ...e });
  }
  // effetti e promemoria per protezione (SD, sezione Protezioni): le proprietà senza effetto e non
  // già gestite dalle penalità del modello restano promemoria (docs/proprieta-armature.md)
  const gestite = new Set(fileArmature.proprieta_gestite ?? []);
  for (const p of protezioni) {
    // con l'armatura anche il suo rinforzo valido (§7.23): effetti e proprietà testuali (Discreta)
    const kitDef = p.rinforzo ? perUidOgg.get(p.rinforzo.uid)?.def : null;
    const miei = effettiOggetti.filter((e) => e.uid === p.uid || (p.rinforzo && e.uid === p.rinforzo.uid));
    const tradotte = new Set(miei.map((e) => e.proprieta).filter(Boolean));
    p.effetti = miei;
    p.promemoria = [...p.proprieta, ...(kitDef?.proprieta ?? [])]
      .filter((x) => !tradotte.has(x.nome) && !gestite.has(nomeProprieta(x).replace(/\s+\d+$/, ''))).map((x) => x.nome);
  }
  // §7.11.1: la penalità dell'armatura al lancio con Potere vale solo per lanciare Incantesimi
  for (const p of protezioni.filter((x) => x.tipo === 'armatura' && x.penalita?.lancio_potere)) {
    effettiOggetti.push({
      uid: p.uid, oggetto: p.nome, abilita: 'Potere', valore: p.penalita.lancio_potere, ambito: 'uso_specifico', uso: 'lancio',
      condizione: 'Penalità dell’armatura alle Prove di Potere per lanciare Incantesimi.', fonte: 'Armamenti §7.11.1', permanente: true,
    });
  }

  // Giocatore §5.21: la fascia di Umanità penalizza soltanto le PS di Magia contro la Corruzione
  const umn = base.umanita;
  if (umn?.modificatori?.ps_magia_corruzione) {
    effettiOggetti.push({
      uid: null, oggetto: `Umanità ${umn.valore} (${umn.condizione})`, tipo: 'salvezza', salvezza: 'magia', valore: umn.modificatori.ps_magia_corruzione,
      ambito: 'uso_specifico', uso: 'contro la Corruzione', condizione: 'La penalità alla Salvezza si applica esclusivamente alle PS di Magia contro la Corruzione.',
      fonte: 'Giocatore §5.21', permanente: true, umanita: true,
    });
  }

  // §7.21.1: «Ogni personaggio può indossare un solo elmetto» (regole.json → elmetti)
  const elmettiIndossati = oggetti.filter((x) => x.attivo && x.tipo === 'elmetto');
  const maxElmetti = dati.regole?.elmetti?.massimo_indossati ?? 1;
  if (elmettiIndossati.length > maxElmetti) avvisi.push(`Più di un elmetto indossato (${elmettiIndossati.map((x) => x.nome).join(', ')}): se ne indossa uno solo (Armamenti §7.21.1).`);
  const armatureIndossate = oggetti.filter((x) => x.attivo && x.tipo === 'armatura');
  if (armatureIndossate.length > 1) {
    avvisi.push(`Due o più armature indossate (${armatureIndossate.map((x) => x.nome).join(', ')}): non si sovrappongono due armature complete (Armamenti §7.11.2). Le penalità sono sommate.`);
  }

  const abilitaPer = (nome) => base.abilita.find((a) => a.nome === nome);
  const vaEquip = (nome) => { const a = abilitaPer(nome); return a ? a.totale + (equipAbilita[nome] ?? 0) : null; };
  const specPosseduti = new Set((base.specializzazioni ?? []).map((s) => s.id));
  const difeseVa = difeseAbilita ? vaEquip(difeseAbilita) : null;

  // Parate con lo Scudo (§7.4.11): Difese + modificatori propri dello Scudo − FOR insufficiente (§7.1.6)
  const scudiAttivi = protezioni.filter((p) => p.tipo === 'scudo');
  for (const p of scudiAttivi) {
    const d = cat.perRif.get(oggetti.find((o) => o.uid === p.uid)?.voce.rif ?? '');
    if (!d?.parata || difeseVa === null) continue;
    const calcola = (par) => ({ ravvicinata: difeseVa + par.ravvicinata - p.forMancante, distanza: difeseVa + par.distanza - p.forMancante });
    p.parata = { ...calcola(d.parata), modificatori: d.parata, difese: difeseVa };
    p.alternative = (d.profili_alternativi ?? []).map((a) => ({ condizione: a.condizione, parata: a.parata ? calcola(a.parata) : null, ar: a.ar ?? null }));
  }
  if (scudiAttivi.length > 1) {
    avvisi.push(`Due o più scudi imbracciati (${scudiAttivi.map((x) => x.nome).join(', ')}): non sommano la protezione, vale soltanto il contributo maggiore (Armamenti §7.4).`);
  }
  // Parata a distanza con un'arma: Giocatore §5.9 (dai dati, regole.json → difese)
  const parataDistanzaArma = dati.regole?.difese?.parata_distanza_arma ?? null;

  // §7.15.1: con un Innesto di Interfaccia Neurale in uso, le armi con SIN ricevono +SIN al VA per colpire
  const interfaccia = oggetti.find((x) => x.attivo && x.def?.innesto === 'interfaccia_neurale') ?? null;
  const sin = interfaccia ? tabellaSin(dati) : new Map();

  // §7.3: accessori in uso montati su un'arma, oppure su un mirino montato su un'arma (moduli di
  // visione, §7.3.3). Per ogni gruppo esclusivo (mirino, riduzione del rumore, supporto, modulo di
  // visione) vale un solo accessorio per arma: il primo della lista.
  const accessoriArma = (w) => {
    const diretti = montatiSu(w.uid).filter((x) => puoMontare(x, w));
    const suMirini = diretti.filter((x) => x.def?.mirino).flatMap((m) => montatiSu(m.uid).filter((x) => puoMontare(x, m)));
    const gruppi = new Map();
    const out = [];
    for (const x of [...diretti, ...suMirini]) {
      const g = x.def?.gruppo_esclusivo;
      if (g && gruppi.has(g)) {
        avvisi.push(`Su ${w.nome} c’è già ${gruppi.get(g).nome}: ${x.nome} non ha effetto (un solo accessorio di questo tipo per arma, §7.3).`);
        continue;
      }
      if (g) gruppi.set(g, x);
      out.push(x);
    }
    return out;
  };

  // §7.20: scorte di munizioni della lista compatibili con un'arma: stessa famiglia (§7.20.9) oppure
  // compatibilità espressa (razzi, celle, serbatoi, dardi)
  const famigliaMunizioni = tabellaMunizioniArmi(dati);
  const munizioniInLista = oggetti.filter((x) => x.tipo === 'munizioni' && x.def && !x.deposito);
  const scorteDi = (rif) => {
    const fam = famigliaMunizioni.get(rif) ?? null;
    return {
      famiglia: fam,
      scorte: munizioniInLista.filter((x) => (fam && x.def.munizione?.famiglia === fam) || x.def.compatibile_con?.includes(rif))
        .map((x) => ({ uid: x.uid, nome: x.nome, quantita: x.voce.quantita })),
    };
  };

  // §5.13: bonus di Caratteristica al danno per un'Abilità d'attacco; null se non si applica
  const regoleCar = dati.regole?.danno_caratteristica ?? null;
  const bonusCaratteristicaArma = (nomeAbilita, proprieta) => {
    const sigla = regoleCar ? caratteristicaDanno(nomeAbilita, dati) : null;
    if (!sigla || !base.caratteristiche[sigla]) return null;
    const escluse = proprieta.map((p) => String(p.nome ?? p)).filter((n) => (regoleCar.proprieta_escluse ?? []).includes(n));
    const valore = base.caratteristiche[sigla].valore;
    return { sigla, valore, bonus: escluse.length ? 0 : bonusDannoCaratteristica(valore, base.livello ?? 1, dati.regole), esclusoDa: escluse[0] ?? null };
  };

  // §5.13: riga del bonus di Caratteristica al danno, con il tetto del livello quando scatta
  const rigaBonusCaratteristica = (bc) => rigaBonus(bc, bonusDannoCaratteristica(bc.valore, Number.MAX_SAFE_INTEGER, dati.regole), base.livello);

  // Armi impugnate: VA per colpire, danno, Parata
  const armi = [];
  const profiloArma = (o, d, extra = {}) => {
    const nomeAbilita = d?.abilita ?? o.voce.personalizzato?.abilita ?? null;
    const a = nomeAbilita ? abilitaPer(nomeAbilita) : null;
    const spec = d?.specializzazione && specPosseduti.has(d.specializzazione)
      ? dati.specializzazioni.specializzazioni.find((s) => s.id === d.specializzazione) : null;
    // §7.1.6: penalità pari alla differenza fra FOR richiesta e Forza posseduta (valori, non modificatori)
    const forPen = d?.for_richiesta ? Math.max(0, d.for_richiesta - FOR) : 0;
    const armatura = o.tipo === 'arma_ravvicinata' ? attacchiRavv : attacchiDist;
    const acc = accessoriArma(o);
    const componenti = a ? [
      { nome: `VA ${a.nome}`, valore: a.totale, fonte: 'regole' },
      spec ? { nome: `Specializzazione in ${spec.nome}`, valore: spec.effetto.va ?? 0, fonte: 'regole' } : null,
      // §7.1.3: Precisa X concede +X VA alle Prove per colpire con l'arma
      ...(d?.proprieta ?? []).filter((p) => p.effetto?.va).map((p) => ({ nome: `${nomeProprieta(p)} (${o.nome})`, valore: p.effetto.va })),
      d?.modificatore_va ? { nome: 'Modificatore VA dell’arma', valore: d.modificatore_va } : null,
      sin.has(d?.rif) ? { nome: `SIN ${sin.get(d.rif).valore} (${interfaccia.nome}, §7.15.1)`, valore: sin.get(d.rif).valore } : null,
      forPen ? { nome: `FOR ${FOR} su ${d.for_richiesta} richiesta (§7.1.6)`, valore: -forPen } : null,
      armatura ? { nome: 'Armatura (§7.11.1)', valore: armatura } : null,
      // §7.3.1: Smorzatore e Silenziatore peggiorano il VA per colpire
      ...acc.filter((x) => x.def?.effetto_arma?.va).map((x) => ({ nome: `${x.nome} (§7.3.1)`, valore: x.def.effetto_arma.va })),
      // effetti «attacco» dell'equipaggiamento (Assistenza offensiva dell'elmetto, §7.21.2)
      ...bonusAttacco.filter((b) => valePer(b, o.tipo)).map((b) => ({ nome: b.nome, valore: b.valore })),
    ].filter(Boolean) : [];
    const va = a ? componenti.reduce((s, c) => s + c.valore, 0) : null;
    // §8.8.1: +1 danno della Specializzazione, salvo le armi che lo escludono (SA30, Danno calibrato: risposta A.12)
    const bonusDanno = spec && d.specializzazione_danno !== false ? spec.effetto.danno ?? 0 : 0;
    // accessori dell'arma e effetti «danno» dell'equipaggiamento (Colpo assistito, §7.14.2): bonus ordinari (§5.13)
    const dannoAccessori = acc.reduce((s, x) => s + (x.def?.effetto_arma?.danno ?? 0), 0) + dannoEquip.filter((b) => valePer(b, o.tipo)).reduce((s, b) => s + b.valore, 0);
    const dannoBase = d?.danno ?? (o.voce.personalizzato?.danno ? { una_mano: o.voce.personalizzato.danno, due_mani: null } : null);
    // §5.13: bonus di Caratteristica al danno (Caratteristica dell'Abilità dell'arma, Armi pesanti INT),
    // salvo le esclusioni espresse delle schede (Danno calibrato)
    const bonusCaratteristica = bonusCaratteristicaArma(nomeAbilita, d?.proprieta ?? []);
    const dannoCar = bonusCaratteristica?.bonus ?? 0;
    const proprietaParata = (d?.proprieta ?? []).filter((p) => p.effetto?.parata_va);
    const parataVa = proprietaParata.reduce((s, p) => s + p.effetto.parata_va, 0);
    const difese = difeseVa;
    // Parata con l'arma: Difese + proprietà difensive − penalità FOR dell'arma (§7.1.3, §7.1.6);
    // a distanza si aggiunge la penalità del Giocatore §5.9 (−8 VA con un'arma)
    const parata = o.tipo === 'arma_ravvicinata' && difese !== null && d ? {
      va: difese + parataVa - forPen,
      distanza: parataDistanzaArma === null ? null : difese + parataVa - forPen + parataDistanzaArma,
      // proprietà difensive dell'arma: la provenienza delle Difese le mostra (valgono solo nella Parata)
      proprieta: proprietaParata.map((p) => ({ nome: `${nomeProprieta(p)} (${o.nome})`, valore: p.effetto.parata_va })),
      componenti: [
        { nome: `VA ${difeseAbilita}`, valore: abilitaPer(difeseAbilita).totale, fonte: 'regole' },
        ...(componentiEquip[difeseAbilita] ?? []).map((c) => ({ nome: c.etichetta, valore: c.valore })),
        ...proprietaParata.map((p) => ({ nome: `${nomeProprieta(p)} (${o.nome})`, valore: p.effetto.parata_va })),
        forPen ? { nome: `FOR insufficiente (${o.nome})`, valore: -forPen } : null,
      ].filter(Boolean),
    } : null;
    // §7.7: «FOR × 3» nella colonna Max Q: la gittata dipende dalla Forza del personaggio
    const gittataQ = d?.gittata_q ?? (d?.gittata_per_for ? FOR * d.gittata_per_for : null);
    // provenienza del danno (src/provenienza.js): dado dell'arma e bonus fissi, uno per riga
    const righeDanno = dannoBase ? [
      riga('Danno dell’arma', dannoBase.una_mano ?? dannoBase.due_mani ?? '—', dannoBase.una_mano && dannoBase.due_mani ? `a due mani ${dannoBase.due_mani}` : null),
      ...(bonusCaratteristica ? [rigaBonusCaratteristica(bonusCaratteristica)] : []),
      ...(spec ? [riga(`Specializzazione in ${spec.nome}`, bonusDanno, d.specializzazione_danno === false ? 'esclusa dalla scheda dell’arma (A.12)' : '§8.8.1')] : []),
      ...acc.filter((x) => x.def?.effetto_arma?.danno !== undefined).map((x) => riga(x.nome, x.def.effetto_arma.danno, 'accessorio (§7.3)')),
      ...dannoEquip.filter((b) => valePer(b, o.tipo)).map((b) => riga(b.nome, b.valore, 'effetto dell’oggetto')),
    ] : null;
    armi.push({
      uid: o.uid, rif: d?.rif ?? null, nome: o.nome, tipo: o.tipo, abilita: nomeAbilita, va, componenti,
      righeDanno,
      danno: dannoBase ? { una_mano: aggiungiDanno(dannoBase.una_mano, bonusDanno + dannoAccessori + dannoCar), due_mani: aggiungiDanno(dannoBase.due_mani, bonusDanno + dannoAccessori + dannoCar) } : null,
      dannoAccessori, bonusCaratteristica,
      ...(d?.rif ? (({ famiglia, scorte }) => ({ famigliaMunizioni: famiglia, scorte }))(scorteDi(d.rif)) : { famigliaMunizioni: null, scorte: [] }),
      accessori: acc.map((x) => ({ uid: x.uid, nome: x.nome, rif: x.def?.rif ?? null })),
      // §7.3: il mirino riduce la sola penalità di distanza, entro il proprio limite
      mirino: (() => { const m = acc.find((x) => x.def?.mirino); return m ? { nome: m.nome, ...m.def.mirino } : null; })(),
      // §7.3.2: supporti di tiro, bonus solo in appoggio
      condizionali: va === null ? [] : acc.filter((x) => x.def?.bonus_condizionato).map((x) => ({ nome: x.nome, va: x.def.bonus_condizionato.va, vaTotale: va + x.def.bonus_condizionato.va, condizione: x.def.bonus_condizionato.condizione })),
      dannoDaMunizione: !!d?.danno_da_munizione,
      munizioneRiferimento: d?.danno_da_munizione ? munizioneDiRiferimento(d.munizioni?.riferimento, dati) : null,
      bonusDanno, mani: d?.mani ?? null, portataQ: d?.portata_q ?? null, gittataQ,
      gittataFormula: d?.gittata_per_for ? `FOR ${FOR} × ${d.gittata_per_for}` : null,
      ac: d?.ac ?? null, inc: d?.inc ?? null, mov: d?.mov ?? 0, modalita: d?.modalita ?? [],
      munizioni: d?.munizioni ?? null,
      attivazione: d?.attivazione ?? null, manovre: d?.manovre ?? [], naturaDanno: d?.natura_danno ?? null,
      proprieta: d?.proprieta ?? [], parata, personalizzato: o.personalizzato,
      // §7.5.1: riserva di Chroma integrata (Bordone Templare…), mostrata accanto all'arma
      contenitore: extra.moduloDi ? null : (infoArtefatto(d, dati)?.contenitore ?? null),
      specializzazione: spec ? `Specializzazione in ${spec.nome}` : null,
      ...extra,
    });
    if (!a && o.personalizzato) avvisi.push(`${o.nome}: arma personalizzata senza Abilità, VA non calcolato.`);
  };
  for (const o of oggetti.filter((x) => x.attivo && (x.tipo === 'arma_ravvicinata' || x.tipo === 'arma_distanza'))) {
    profiloArma(o, o.def);
    // §7.7: le penalità MOV delle armi impugnate si sottraggono una sola volta al budget di movimento
    if (o.def?.mov) movimentoQ += o.def.mov;
    // §7.8: un modulo integrato usa la propria Abilità, gittata, INC, capacità e modalità; si sceglie
    // il profilo prima di ogni attacco. PI, Qualità e MOV sono quelli dell'arma principale.
    for (const m of moduliDi(o.def, cat)) {
      profiloArma({ ...o, uid: `${o.uid}:${m.id}`, nome: m.nome, tipo: m.tipo, personalizzato: false }, m, { moduloDi: o.nome, mov: 0 });
    }
  }

  // Armi che proteggono anche come Scudo (Rainy Dayer aperta, §7.14.6): AR passiva e Parata come
  // uno Scudo, con i modificatori propri e la FOR insufficiente dell'arma (§7.1.6)
  for (const o of oggetti.filter((x) => x.attivo && x.def?.scudo_integrato)) {
    const s = o.def.scudo_integrato;
    const forMancante = o.def.for_richiesta ? Math.max(0, o.def.for_richiesta - FOR) : 0;
    const calcola = (par) => ({ ravvicinata: difeseVa + par.ravvicinata - forMancante, distanza: difeseVa + par.distanza - forMancante });
    protezioni.push({
      uid: `${o.uid}:scudo`, nome: `${o.nome} (${s.condizione})`, tipo: 'scudo', categoria: null, taglia: null,
      ar: s.ar, penalita: {}, forRichiesta: o.def.for_richiesta ?? null, forMancante, personalizzato: false, mov: 0,
      parata: difeseVa === null ? null : { ...calcola(s.parata), modificatori: s.parata, difese: difeseVa },
      alternative: [], proprieta: [], rinforziAmmessi: null, supporti: null, daArma: true,
    });
  }

  // Attacchi con lo Scudo imbracciato (Scudo Punisher §7.4.1, lama delle Guardie Sacre §7.4.10)
  for (const p of scudiAttivi) {
    const d = cat.perRif.get(oggetti.find((o) => o.uid === p.uid)?.voce.rif ?? '');
    const att = d?.attacco;
    if (!att) continue;
    const a = abilitaPer(att.abilita);
    const componenti = a ? [
      { nome: `VA ${a.nome}`, valore: a.totale, fonte: 'regole' },
      p.forMancante ? { nome: `FOR ${FOR} su ${d.for_richiesta} richiesta (§7.1.6)`, valore: -p.forMancante } : null,
      attacchiRavv ? { nome: 'Armatura (§7.11.1)', valore: attacchiRavv } : null,
    ].filter(Boolean) : [];
    // risposta A.10: stato al tavolo che cambia il danno (lama estratta); a riposo vale il profilo base
    const stato = att.stato ? { chiave: `${p.uid}:${att.stato.id}`, nome: att.stato.nome, nomeOpposto: att.stato.nome_opposto, danno: att.stato.danno, costo: att.stato.costo } : null;
    armi.push({
      uid: `${p.uid}:attacco`, nome: `${d.nome} (attacco${att.condizione ? `, ${att.condizione}` : stato ? `, ${stato.nomeOpposto}` : ''})`, tipo: 'arma_ravvicinata',
      abilita: att.abilita, va: a ? componenti.reduce((x, c) => x + c.valore, 0) : null, componenti,
      ...(() => {
        const bc = bonusCaratteristicaArma(att.abilita, []);
        return {
          danno: { una_mano: aggiungiDanno(att.danno, bc?.bonus ?? 0), due_mani: null }, bonusCaratteristica: bc,
          righeDanno: [riga('Danno dello Scudo', att.danno), ...(bc ? [rigaBonusCaratteristica(bc)] : [])],
        };
      })(),
      dannoDaMunizione: false, bonusDanno: 0, mani: att.mani,
      portataQ: att.portata_q, gittataQ: null, gittataFormula: null, ac: null, inc: null, mov: 0, modalita: [], munizioni: null,
      proprieta: att.note ? [{ nome: 'Manovre e requisiti', testo: att.note }] : [], parata: null, personalizzato: false,
      // manovre: [] — la scheda dell'arma nella SD le legge; quelle dello scudo stanno nelle note
      manovre: [], attivazione: null, naturaDanno: null, specializzazione: null, daScudo: true, statoAlternativo: stato,
    });
  }

  // Mani impegnate: arma a due mani con scudo, più di due mani
  const scudi = oggetti.filter((x) => x.attivo && x.tipo === 'scudo');
  const impugnate = oggetti.filter((x) => x.attivo && (x.tipo === 'arma_ravvicinata' || x.tipo === 'arma_distanza'));
  for (const w of impugnate.filter((x) => x.def?.mani === 2)) {
    if (scudi.length) avvisi.push(`${w.nome} è un’arma a due mani, ma c’è uno scudo imbracciato (${scudi.map((x) => x.nome).join(', ')}).`);
  }
  const mani = impugnate.reduce((s, x) => s + maniDi(x.def), 0) + scudi.length;
  if (mani > 2) avvisi.push(`Mani impegnate: ${mani} (armi impugnate e scudi imbracciati) su 2.`);

  // Accessori montati: dove non si possono montare, o montati su un oggetto non attivo
  const perUid = new Map(oggetti.map((o) => [o.uid, o]));
  const operativo = (su) => (su.def?.mirino ? su.attivo && operativo(perUid.get(su.voce.montato_su) ?? {}) && puoMontare(su, perUid.get(su.voce.montato_su)) : !!su.attivo);
  const NON_ATTIVO = { armatura: 'indossata', elmetto: 'indossato', accessorio: 'montato su un’arma impugnata' };
  for (const x of accessoriMontati) {
    const su = perUid.get(x.voce.montato_su);
    if (!su) avvisi.push(`${x.nome} è montato su un oggetto che non è più nella lista.`);
    else if (!puoMontare(x, su)) avvisi.push(`${x.nome} non si monta su ${su.nome}: nessun effetto.`);
    else if (!operativo(su)) avvisi.push(`${x.nome} è montato su ${su.nome}, che non è ${NON_ATTIVO[su.tipo] ?? 'impugnata'}: nessun effetto.`);
  }

  // risposta A.21: fonti di Corruzione passiva nella lista (Chroma Viola), ovunque siano
  for (const o of oggetti.filter((x) => !x.fuoriCatalogo && x.def?.corruzione_passiva)) {
    const cp = dati.regole?.corruzione?.[o.def.corruzione_passiva];
    if (cp) avvisi.push(`${o.nome}: ${cp.avviso}`);
  }

  // §7.10: la somma dei costi degli Artefatti sintonizzati non supera la capacità del personaggio
  const rs = regoleSintonizzazione(dati);
  const artefatti = oggetti.filter((o) => !o.fuoriCatalogo).map((o) => ({ o, a: infoArtefattoVoce(o, dati) })).filter((x) => x.a);
  let sintonizzazione = null;
  if (rs && artefatti.length) {
    const gradi = Math.min(Math.max(base.gradiComplessivi ?? 1, 1), rs.capacita_per_gradi.length);
    const talento = (base.talenti ?? []).includes(rs.talento.nome);
    const daGradi = rs.capacita_per_gradi[gradi - 1] + (talento ? rs.talento.bonus : 0);
    // Giocatore §5.21: la fascia di Umanità riduce la Capacità complessiva, Talenti compresi, fino a 0
    const umn = base.umanita ?? null;
    const modUmn = umn?.modificatori?.sintonizzazione ?? 0;
    const capacita = modUmn ? Math.max(umn.sintonizzazioneMinimo ?? 0, daGradi + modUmn) : daGradi;
    const righe = [
      riga(`${gradi} Grad${gradi === 1 ? 'o' : 'i'} complessiv${gradi === 1 ? 'o' : 'i'}`, rs.capacita_per_gradi[gradi - 1], 'Armamenti §7.10'),
      ...(talento ? [riga(rs.talento.nome, rs.talento.bonus, 'Talento')] : []),
      ...(modUmn ? [riga(`Umanità ${umn.valore} (${umn.condizione})`, capacita - daGradi, capacita - daGradi !== modUmn ? `${modUmn}, fino a un minimo di ${umn.sintonizzazioneMinimo ?? 0} (Giocatore §5.21)` : 'Giocatore §5.21')] : []),
    ];
    // §7.10; un Artefatto nel deposito comune non è sintonizzabile e non occupa capacità (docs/layout-sd.md, pezzo 4)
    const elenco = artefatti.map(({ o, a }) => ({ uid: o.uid, nome: o.nome, costo: a.sintonizzazione, potenza: a.potenza, tipologia: a.tipologia, sintonizzato: o.voce.sintonizzato === true && !o.deposito, deposito: o.deposito }));
    const usata = elenco.filter((x) => x.sintonizzato).reduce((s, x) => s + x.costo, 0);
    sintonizzazione = { capacita, usata, gradi, talento: talento ? rs.talento.nome : null, artefatti: elenco, umanita: capacita - daGradi, provenienza: provenienza(righe, capacita) };
    if (usata > capacita) avvisi.push(`Sintonizzazioni oltre la capacità: ${usata} su ${capacita}. Il personaggio sceglie quali interrompere (§7.10).`);
  }

  // Equipaggiamento §7.10: chip senza Processore installato; un solo chip alla volta nell'alloggiamento
  const chip = oggetti.filter((x) => x.attivo && x.def?.richiede_innesto);
  for (const x of chip.filter((o) => !conInnesto(o))) avvisi.push(`${x.nome}: nessun effetto senza un Processore neurale di Abilità installato (Equipaggiamento §7.10).`);
  const chipInseriti = chip.filter(conInnesto);
  if (chipInseriti.length > (dati.regole?.impianti?.chip?.attivi_massimo ?? 1)) avvisi.push(`Chip in uso: ${chipInseriti.map((x) => x.nome).join(', ')}. Il Processore ne attiva uno alla volta (Equipaggiamento §7.10).`);

  // §7.19.3: «È consentita una sola UMC operativa per utilizzatore»
  const unici = new Map();
  for (const x of oggetti.filter((o) => o.attivo && o.def?.uno_per_personaggio)) {
    const k = x.def.uno_per_personaggio;
    if (unici.has(k)) avvisi.push(`${x.nome}: ne vale una sola per personaggio, già in uso ${unici.get(k).nome}.`);
    else unici.set(k, x);
  }

  for (const x of oggetti.filter((o) => o.fuoriCatalogo)) avvisi.push(`«${x.voce.rif}» non è più nel catalogo: resta in lista senza effetti.`);

  // AR a riposo (docs/ricognizione-ar-pi.md): al tavolo la ricalcola applicaCondizioni (src/condizioni.js)
  const ar = calcolaAR({ protezioni, effettiOggetti }, dati, { talenti: base.talenti ?? [] });

  return {
    oggetti,
    armi,
    protezioni,
    ar,
    // oggetti con Punti Integrità da tracciare (Armamenti §7.2.1)
    integrita: dati.regole?.integrita ? oggettiConPi(oggetti, dati) : [],
    // A.47: oggetti senza PI a catalogo, per il campo «PI (definito dal Direttore)»
    senzaPi: dati.regole?.integrita ? oggettiSenzaPi(oggetti, dati) : [],
    zaino: oggetti.filter((o) => !o.attivo),
    equipAbilita,
    componentiEquip,
    zeriEquip,
    effettiOggetti,
    bonusAttacco,
    bonusDanno: dannoEquip,
    iniziativa: iniziativaEquip,
    movimentoEquip,
    contenitori: contenitoriRisolti(oggetti, dati),
    abilitaDifese: difeseAbilita,
    movimentoQ,
    movimentoQProtezioni,
    lancioPotere,
    forMancanteArmature,
    sintonizzazione,
    avvisi,
  };
}
