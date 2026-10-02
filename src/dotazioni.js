// Equipaggiamento iniziale (Giocatore §2.16, E&L A.5–A.5.29; dati in data/dotazioni.json).
// Funzioni pure. Nelle scelte si salva solo `dotazione`:
//
//   { opzioni: { <gruppo>: <id opzione> }, sotto: { <oggetto di dotazione>: valore },
//     crediti: { valore, origine } | null   (il tiro dei 2d6 del §2.16.28),
//     acquisti: [ { rif, cede: [<gruppo>…] } ] }  (§2.16.29)
//
// Alla conferma gli oggetti entrano in `equipaggiamento` come voci con `dotazione_iniziale: true`;
// rifare la dotazione le sostituisce (non le somma) e lascia com'è tutto il resto. Crediti iniziali,
// conguagli e saldo si ricalcolano sempre dalle scelte.
import { specTiro, valoreTiro } from './tiri.js';
import { catalogo, risolvi, statoIniziale, puoMontare, rinforzoCompatibile, tabellaMunizioniArmi, testoEffettoOggetto, schedaDiDotazione } from './equipaggiamento.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// §2.16.27: «armamenti di base» abbinati al modello corporativo; gli altri oggetti restano commerciali
const TIPI_ARMAMENTO = new Set(['arma_ravvicinata', 'arma_distanza', 'scudo', 'armatura']);
export const NOTA_CORPORATIVO = 'modello corporativo da definire (A.5.27)';
export const NOTA_ACQUISTO = 'acquisto iniziale (§2.16.29)';

export function dotazioneVuota() {
  return { opzioni: {}, sotto: {}, crediti: null, acquisti: [] };
}

/** §2.16.28: tiro dei crediti iniziali (i soli 2d6; fisso e moltiplicatore si applicano dopo). */
export function specTiroCrediti(dati) {
  const { dadi, facce } = dati.regole.crediti_iniziali;
  return { ...specTiro({ dadi, facce }), formulaCompleta: dati.regole.crediti_iniziali.formula };
}

/** §2.16.28: 1.000 + 2d6 × 100 crediti, oppure null senza tiro. */
export function creditiIniziali(tiro, dati) {
  const v = valoreTiro(tiro);
  const cr = dati.regole.crediti_iniziali;
  return Number.isInteger(v) ? cr.fisso + v * cr.moltiplicatore : null;
}

/** Catalogo della Corporazione (Freelance → Commerciale). */
export function catalogoCorporazione(corporazione, dati) {
  return dati.dotazioni.cataloghi_corporazioni?.[corporazione] ?? 'Commerciale';
}

/**
 * §2.16.27: modello assegnato al posto del profilo commerciale delle tabelle. Con l'abbinamento
 * della Corporazione in dotazioni.json → il modello corporativo; senza → il commerciale con la nota
 * A.5.27. I Freelance (catalogo Commerciale) e gli oggetti che non sono armamenti restano commerciali.
 * @returns {{ rif, munizioni?: string, corporativo: boolean, nota: string|null }}
 */
export function modelloAssegnato(rif, corporazione, dati, cat = catalogo(dati)) {
  const def = cat.perRif.get(rif);
  if (!def || !TIPI_ARMAMENTO.has(def.tipo) || catalogoCorporazione(corporazione, dati) === 'Commerciale') {
    return { rif, corporativo: false, nota: null };
  }
  const ab = dati.dotazioni.corporativi?.abbinamenti?.[corporazione]?.[rif];
  if (ab?.rif && cat.perRif.has(ab.rif)) return { rif: ab.rif, ...(ab.munizioni ? { munizioni: ab.munizioni } : {}), corporativo: true, nota: null };
  // E&L 16 (A.33): profili che restano commerciali per tutte le Corporazioni (Revolver), senza nota
  if ((dati.dotazioni.corporativi?.commerciali ?? []).includes(rif)) return { rif, corporativo: false, nota: null };
  return { rif, corporativo: false, nota: NOTA_CORPORATIVO };
}

/** Munizione ordinaria commerciale di una famiglia (§7.20.1: intercambiabile fra Corporazioni). */
function munizioneOrdinaria(famiglia, cat) {
  if (!famiglia) return null;
  return cat.oggetti.find((o) => o.famiglia === 'Munizioni ordinarie' && o.munizione?.famiglia === famiglia)?.rif ?? null;
}

/** Gruppi di scelta della Classe (vuoto se la Classe non ha dotazione). */
export function gruppiClasse(classe, dati) {
  return dati.dotazioni.classi?.[classe]?.gruppi ?? [];
}

/**
 * Opzione effettiva di ogni gruppo: unica → automatica; legata a un altro gruppo («segue»: il mirino
 * dell'Artigliere segue l'arma) → automatica; altrimenti quella scelta, o null.
 * @returns {{ gruppo, opzione: object|null, automatica: boolean }[]}
 */
export function opzioniEffettive(dotazione, classe, dati) {
  const gruppi = gruppiClasse(classe, dati);
  const scelte = isOggetto(dotazione?.opzioni) ? dotazione.opzioni : {};
  const scelta = (g) => {
    if (g.opzioni.length === 1) return { opzione: g.opzioni[0], automatica: true };
    if (g.opzioni.every((o) => o.segue)) {
      const o = g.opzioni.find((x) => scelte[x.segue.gruppo] === x.segue.opzione);
      return { opzione: o ?? null, automatica: true };
    }
    return { opzione: g.opzioni.find((o) => o.id === scelte[g.id]) ?? null, automatica: false };
  };
  return gruppi.map((g) => ({ gruppo: g, ...scelta(g) }));
}

/** Oggetti di dotazione con una sotto-scelta (ambiente, corredo agricolo, ambito) fra quelli scelti. */
export function sottoScelteRichieste(dotazione, classe, dati) {
  const reg = dati.dotazioni.oggetti_dotazione;
  const out = [];
  for (const { opzione } of opzioniEffettive(dotazione, classe, dati)) {
    for (const x of opzione?.oggetti ?? []) {
      const s = x.dotazione && reg[x.dotazione]?.sotto;
      if (s && !out.some((y) => y.oggetto === x.dotazione)) out.push({ oggetto: x.dotazione, nome: reg[x.dotazione].nome, ...dati.dotazioni.sotto_scelte[s], id: s });
    }
  }
  return out;
}

/** Effetti di un oggetto di dotazione in breve: «+2 VA a Sopravvivenza (con la condizione attiva)». */
export function testoEffetto(o) {
  return (o?.effetti ?? []).map(testoEffettoOggetto).join('; ');
}

/** Valore di cessione di un armamento di base (§2.16.29: 100 % del prezzo del modello assegnato). */
function valoreCessione(rif, cat, dati) {
  const costo = cat.perRif.get(rif)?.costo;
  return Number.isFinite(costo) ? Math.round(costo * dati.dotazioni.scambio.valutazione_cessione) : null;
}

/**
 * Armamenti di base cedibili (§2.16.29): per ogni gruppo, l'armamento del catalogo assegnato con il
 * suo prezzo. { gruppo, nome, rif, valore } (gli oggetti senza prezzo non si possono cedere).
 */
export function armamentiCedibili(dotazione, classe, corporazione, dati, cat = catalogo(dati)) {
  const out = [];
  for (const { gruppo, opzione } of opzioniEffettive(dotazione, classe, dati)) {
    const primo = opzione?.oggetti[0];
    if (!primo?.rif || !TIPI_ARMAMENTO.has(cat.perRif.get(primo.rif)?.tipo)) continue;
    const m = modelloAssegnato(primo.rif, corporazione, dati, cat);
    const valore = valoreCessione(m.rif, cat, dati);
    if (valore !== null) out.push({ gruppo: gruppo.id, etichetta: gruppo.etichetta, rif: m.rif, nome: cat.perRif.get(m.rif).nome, valore });
  }
  return out;
}

/**
 * Oggetti acquistabili alla creazione: catalogo della Corporazione e Commerciale, con prezzo definito
 * (§2.16.29: le configurazioni senza profilo e prezzo non sono acquistabili).
 */
export function acquistabili(corporazione, dati, cat = catalogo(dati)) {
  const suo = catalogoCorporazione(corporazione, dati);
  return cat.oggetti.filter((o) => !o.modulo_di && Number.isFinite(o.costo) && o.costo > 0 && (o.catalogo === suo || o.catalogo === 'Commerciale'));
}

/**
 * Conti del §2.16.28–29: crediti iniziali, un conguaglio per acquisto (prezzo − valore dei ceduti,
 * mai negativo) e saldo. `errori`: acquisti non validi (oggetto inesistente o senza prezzo,
 * armamento ceduto due volte o non cedibile); `saldo < 0` blocca la conferma.
 */
export function contiDotazione(dotazione, classe, corporazione, dati, cat = catalogo(dati)) {
  const iniziali = creditiIniziali(dotazione?.crediti, dati);
  const cedibili = new Map(armamentiCedibili(dotazione, classe, corporazione, dati, cat).map((x) => [x.gruppo, x]));
  const ceduti = new Set();
  const errori = [];
  const acquisti = (Array.isArray(dotazione?.acquisti) ? dotazione.acquisti : []).map((a, i) => {
    const def = cat.perRif.get(a?.rif);
    const cede = (a?.cede ?? []).filter((g) => {
      if (!cedibili.has(g)) { errori.push(`Acquisto ${i + 1}: «${g}» non è un armamento di base cedibile.`); return false; }
      if (ceduti.has(g)) { errori.push(`Acquisto ${i + 1}: ${cedibili.get(g).nome} è già ceduto per un altro acquisto.`); return false; }
      ceduti.add(g);
      return true;
    });
    if (!def || !Number.isFinite(def.costo)) errori.push(`Acquisto ${i + 1}: ${def ? `${def.nome} non ha un prezzo` : `«${a?.rif}» non è nel catalogo`}.`);
    const prezzo = def?.costo ?? 0;
    const valoreCeduto = cede.reduce((s, g) => s + cedibili.get(g).valore, 0);
    // TODO(Davide): valore ceduto oltre il prezzo, resto in crediti o perso? Ipotesi: perso (per-davide A.35)
    return { rif: a?.rif, nome: def?.nome ?? a?.rif, prezzo, cede, valoreCeduto, conguaglio: Math.max(0, prezzo - valoreCeduto), eccedenza: Math.max(0, valoreCeduto - prezzo) };
  });
  const speso = acquisti.reduce((s, a) => s + a.conguaglio, 0);
  return { iniziali, acquisti, speso, saldo: iniziali === null ? null : iniziali - speso, errori };
}

/** Cosa manca per confermare: gruppi senza scelta, sotto-scelte vuote, tiro dei crediti, saldo. */
export function mancanzeDotazione(dotazione, classe, corporazione, dati) {
  const out = [];
  if (!classe) return ['Scegli prima la Classe.'];
  for (const { gruppo, opzione } of opzioniEffettive(dotazione, classe, dati)) if (!opzione) out.push(`Scegli: ${gruppo.etichetta}.`);
  for (const s of sottoScelteRichieste(dotazione, classe, dati)) {
    const v = dotazione?.sotto?.[s.oggetto];
    if (typeof v !== 'string' || !v.trim()) out.push(`${s.nome}: ${s.etichetta.toLowerCase()}.`);
  }
  const conti = contiDotazione(dotazione, classe, corporazione, dati);
  if (conti.iniziali === null) out.push('Tira o inserisci i crediti iniziali.');
  else if (conti.saldo < 0) out.push(`Crediti insufficienti: il saldo sarebbe ${conti.saldo}.`);
  out.push(...conti.errori);
  return out;
}

/**
 * §2.16.1–2.16.29: le voci dell'inventario della dotazione iniziale, tutte con
 * `dotazione_iniziale: true` e uid stabili (dot-…), così rifarla sostituisce le stesse voci.
 * Dotazione comune (tranne gli oggetti sostituiti da quelli della Classe), oggetti della Classe con
 * il modello assegnato (§2.16.27), munizioni legate all'arma, accessori montati sull'arma, acquisti
 * al posto degli armamenti ceduti.
 */
export function vociDotazione(dotazione, classe, corporazione, dati) {
  const cat = catalogo(dati);
  const reg = dati.dotazioni.oggetti_dotazione;
  const effettive = opzioniEffettive(dotazione, classe, dati);
  const conti = contiDotazione(dotazione, classe, corporazione, dati, cat);
  const ceduti = new Set(conti.acquisti.flatMap((a) => a.cede));
  const scelti = effettive.flatMap((e) => e.opzione?.oggetti ?? []);
  const sostituiti = new Set(scelti.map((x) => x.dotazione && reg[x.dotazione]?.sostituisce).filter(Boolean));
  const voci = [];

  const vocePersonalizzata = (uid, id, quantita) => {
    const o = reg[id];
    const sotto = o.sotto ? dotazione?.sotto?.[id]?.trim() : '';
    // E&L 15 (A.34): il peso, se il manuale lo dà (Binocolo, Registratore audiovisivo); senza, «da definire»
    const personalizzato = { nome: sotto ? `${o.nome} (${sotto})` : o.nome, tipo: 'altro', ...(Number.isFinite(o.peso) ? { peso: o.peso } : {}) };
    // gli effetti sui VA si leggono dai dati attraverso dotazione_id: dalla scheda di catalogo
    // collegata (oggetti_dotazione[id].rif, Equipaggiamento 0.3), altrimenti dalla dotazione
    const rifScheda = schedaDiDotazione(o, personalizzato.nome);
    const scheda = rifScheda ? cat.perRif.get(rifScheda) : null;
    const effetti = scheda?.effetti ?? o.effetti;
    const stato = effetti?.length ? statoIniziale(scheda?.tipo ?? 'altro', [], null, effetti) : null;
    return { uid, rif: null, personalizzato, stato, quantita: quantita ?? 1, note: '', dotazione_iniziale: true, dotazione_id: id };
  };
  const voceCatalogo = (uid, rif, quantita, note = '') => {
    const def = cat.perRif.get(rif);
    const v = { uid, rif, stato: null, quantita: quantita ?? 1, note, dotazione_iniziale: true };
    v.stato = statoIniziale(def?.tipo, voci, dati);
    return v;
  };

  dati.dotazioni.comune.oggetti.forEach((x, i) => {
    if (!sostituiti.has(x.dotazione)) voci.push(vocePersonalizzata(`dot-comune-${i + 1}`, x.dotazione, x.quantita));
  });
  const famiglie = tabellaMunizioniArmi(dati);
  for (const { gruppo, opzione } of effettive) {
    if (!opzione) continue;
    let arma = null;
    opzione.oggetti.forEach((x, k) => {
      const uid = `dot-${gruppo.id}-${k + 1}`;
      if (x.dotazione) return voci.push(vocePersonalizzata(uid, x.dotazione, x.quantita));
      const m = modelloAssegnato(x.rif, corporazione, dati, cat);
      if (k === 0) arma = m;
      if (k === 0 && ceduti.has(gruppo.id)) return; // §2.16.29: l'arma ceduta esce dall'inventario
      voci.push(voceCatalogo(uid, m.rif, x.quantita, m.nota ?? ''));
    });
    if (opzione.munizioni && arma) {
      const mun = opzione.munizioni;
      // §2.16.27 (Doc del 27/09, 09:52): con il modello corporativo il totale dei colpi resta quello
      // della Classe, nel tipo ordinario compatibile con il modello; i caricatori hanno la capacità
      // reale del modello e la ripartizione fra arma, caricatori e riserva si adegua
      const ordinaria = arma.corporativo && !arma.munizioni ? munizioneOrdinaria(famiglie.get(arma.rif), cat) : null;
      const rif = arma.munizioni ?? ordinaria ?? mun.rif;
      const capacita = cat.perRif.get(arma.rif)?.munizioni?.capacita ?? null;
      const car = !mun.caricatori ? `${mun.colpi} colpi`
        : !arma.corporativo || !capacita || capacita * mun.caricatori === mun.colpi
          ? `${mun.caricatori} caricatori compatibili da ${mun.colpi / mun.caricatori} colpi (uno inserito, gli altri di riserva)`
          : `${mun.colpi} colpi in ${mun.caricatori} caricatori compatibili da ${capacita} (uno inserito, gli altri di riserva)${capacita * mun.caricatori < mun.colpi ? `, ${mun.colpi - capacita * mun.caricatori} sciolti` : ', l’ultimo non pieno'} (§2.16.27)`;
      // §2.16.29: con l'arma ceduta le munizioni restano; valgono per il nuovo modello se della stessa famiglia
      const nuovo = ceduti.has(gruppo.id) ? conti.acquisti.find((a) => a.cede.includes(gruppo.id)) : null;
      const note = !nuovo ? `Per ${cat.perRif.get(arma.rif)?.nome}: ${car}.`
        : famiglie.get(nuovo.rif) && famiglie.get(nuovo.rif) === cat.perRif.get(rif)?.munizione?.famiglia
          ? `Per ${nuovo.nome} (al posto di ${cat.perRif.get(arma.rif)?.nome}, ceduto): ${mun.colpi} colpi; caricatori da adattare al modello (§2.16.29).`
          : `Munizioni di ${cat.perRif.get(arma.rif)?.nome}, ceduto: da adattare al modello acquistato (§2.16.29).`;
      voci.push(voceCatalogo(`dot-${gruppo.id}-munizioni`, rif, mun.colpi, note));
    }
  }
  conti.acquisti.forEach((a, i) => {
    if (cat.perRif.has(a.rif)) voci.push(voceCatalogo(`dot-acquisto-${i + 1}`, a.rif, 1, NOTA_ACQUISTO));
  });
  // Accessori della dotazione (mirini, bipiede, silenziatore): montati sulla prima arma compatibile
  // («L’arma viene fornita predisposta per gli accessori assegnati», §2.16.7)
  const risolte = voci.map((v) => risolvi(v, cat));
  for (const r of risolte) {
    if (r.tipo !== 'accessorio' && r.tipo !== 'rinforzo') continue;
    // un rinforzo (§7.11.2) va sulla prima armatura della dotazione che lo ammette
    const su = r.tipo === 'rinforzo' ? risolte.find((x) => rinforzoCompatibile(r, x))
      : risolte.find((x) => x.tipo !== 'accessorio' && puoMontare(r, x)) ?? risolte.find((x) => puoMontare(r, x));
    if (su) { r.voce.montato_su = su.uid; r.voce.stato = 'in_uso'; }
  }
  return voci;
}

/**
 * Sostituisce nell'inventario le voci della dotazione iniziale con quelle nuove: le altre voci
 * restano com'erano, dopo quelle della dotazione. Gli accessori montati su un'arma tolta si smontano.
 */
export function applicaDotazione(equipaggiamento, nuove) {
  const altre = (equipaggiamento ?? []).filter((v) => !v.dotazione_iniziale);
  const uid = new Set([...nuove, ...altre].map((v) => v.uid));
  return [...nuove, ...altre.map((v) => {
    if (!v.montato_su || uid.has(v.montato_su)) return v;
    const { montato_su: _, ...resto } = v;
    return { ...resto, stato: 'zaino' };
  })];
}

/** La dotazione iniziale è già nell'inventario? */
export const dotazioneApplicata = (equipaggiamento) => (equipaggiamento ?? []).some((v) => v.dotazione_iniziale === true);

/** Saldo iniziale dei crediti (§2.16.28–29), solo se la dotazione è nell'inventario; altrimenti null. */
export function saldoIniziale(scelte, dati) {
  if (!dotazioneApplicata(scelte?.equipaggiamento) || !scelte?.dotazione) return null;
  return contiDotazione(scelte.dotazione, scelte.classe, scelte.corporazione, dati).saldo;
}

/**
 * Avvisi di FOR (§2.16: «Ogni scelta deve rispettare i requisiti degli oggetti»): non bloccano,
 * decide il master. Per ogni voce del catalogo che richiede più FOR di quella del personaggio.
 */
export function avvisiForza(voci, forza, dati) {
  if (!Number.isInteger(forza)) return [];
  const cat = catalogo(dati);
  return voci.map((v) => risolvi(v, cat))
    .filter((r) => Number.isInteger(r.def?.for_richiesta) && r.def.for_richiesta > forza)
    .map((r) => ({ uid: r.uid, nome: r.nome, richiesta: r.def.for_richiesta, testo: `${r.nome} richiede FOR ${r.def.for_richiesta}: il personaggio ha FOR ${forza}.` }));
}

/**
 * Riporta `dotazione` delle scelte a una forma valida per la Classe e i dati attuali. Le scelte che
 * non esistono più si tolgono con un avviso; il tiro dei crediti fuori intervallo si scarta.
 */
export function normalizzaDotazione(v, classe, dati, normalizzaTiro, avvisi) {
  if (v === null || v === undefined) return null;
  if (!isOggetto(v)) { avvisi.push('Equipaggiamento iniziale non interpretabile: da rifare.'); return null; }
  const out = dotazioneVuota();
  const gruppi = gruppiClasse(classe, dati);
  for (const [g, o] of Object.entries(isOggetto(v.opzioni) ? v.opzioni : {})) {
    const gr = gruppi.find((x) => x.id === g);
    if (gr?.opzioni.some((x) => x.id === o)) out.opzioni[g] = o;
    else if (classe) avvisi.push(`Equipaggiamento iniziale: la scelta «${o}» (${g}) non esiste per ${classe}, da rifare.`);
  }
  for (const [k, s] of Object.entries(isOggetto(v.sotto) ? v.sotto : {})) {
    if (typeof s === 'string' && s.trim() && dati.dotazioni.oggetti_dotazione[k]?.sotto) out.sotto[k] = s.trim().slice(0, 60);
  }
  const spec = specTiroCrediti(dati);
  out.crediti = normalizzaTiro(v.crediti, spec, `Crediti iniziali (${spec.formula})`, avvisi);
  const cat = catalogo(dati);
  for (const a of Array.isArray(v.acquisti) ? v.acquisti : []) {
    if (!isOggetto(a) || !cat.perRif.has(a.rif)) { avvisi.push(`Acquisto iniziale «${a?.rif}» non più nel catalogo: tolto.`); continue; }
    out.acquisti.push({ rif: a.rif, cede: (Array.isArray(a.cede) ? a.cede : []).filter((g) => gruppi.some((x) => x.id === g)) });
  }
  return out;
}

/** 1700 → «1.700 cr»; null → «—». */
export function crediti(n) {
  if (!Number.isInteger(n)) return '—';
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '−' : ''}${s} cr`;
}
