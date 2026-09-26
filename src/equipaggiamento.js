// Equipaggiamento nella scheda (docs/roadmap-equipaggiamento-e-scheda.md, §1): modello delle voci
// del personaggio, catalogo caricato da data/equipaggiamento/ e calcolo degli effetti. Funzioni
// pure. Solo gli oggetti attivi (impugnati, imbracciati, indossati, in uso) producono effetti; le
// incoerenze (due armature, mani impegnate…) sono avvisi, non blocchi: decide il master.
//
// Voce del personaggio: { uid, rif: "armi:spada-leggera" | null, personalizzato?: { nome, tipo,
//   abilita?, danno?, ar?, testo? }, stato, quantita, montato_su?: uid, note }

export const TIPI = ['arma_ravvicinata', 'arma_distanza', 'scudo', 'armatura', 'accessorio', 'munizioni', 'sanitario', 'artefatto', 'altro'];

export const NOMI_TIPI = {
  arma_ravvicinata: 'Arma ravvicinata',
  arma_distanza: 'Arma a distanza',
  scudo: 'Scudo',
  armatura: 'Armatura',
  accessorio: 'Accessorio',
  munizioni: 'Munizioni',
  sanitario: 'Sanitario',
  artefatto: 'Artefatto',
  altro: 'Altro',
};

// Roadmap §1.3: stati possibili per tipo. I tipi senza stati hanno solo la quantità.
export const STATI = {
  arma_ravvicinata: ['impugnata', 'pronta', 'zaino'],
  arma_distanza: ['impugnata', 'pronta', 'zaino'],
  scudo: ['imbracciato', 'pronta', 'zaino'],
  armatura: ['indossata', 'zaino'],
  accessorio: ['in_uso', 'zaino'],
  munizioni: [],
  sanitario: [],
  artefatto: [],
  altro: [],
};

export const NOMI_STATI = {
  impugnata: 'Impugnata',
  pronta: 'Addosso (pronta)',
  zaino: 'Nello zaino',
  imbracciato: 'Imbracciato',
  indossata: 'Indossata',
  in_uso: 'In uso / montato',
};

const ATTIVI = new Set(['impugnata', 'imbracciato', 'indossata', 'in_uso']);
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

/**
 * Capacità del caricatore di ogni arma a distanza della lista (uid → numero o null), per il
 * contatore munizioni della modalità tavolo.
 */
export function caricatori(voci, dati) {
  const cat = catalogo(dati);
  const out = {};
  for (const v of voci ?? []) {
    const r = risolvi(v, cat);
    // armi a distanza (caricatore) e armi ravvicinate con cariche a cella o riserva di PM (§7.1.4)
    if (r.tipo === 'arma_distanza' || (r.tipo === 'arma_ravvicinata' && r.def?.munizioni?.capacita)) out[v.uid] = r.def?.munizioni?.capacita ?? null;
    // §7.8: i moduli integrati hanno un'alimentazione separata dall'arma principale
    for (const m of moduliDi(r.def, cat)) out[`${v.uid}:${m.id}`] = m.munizioni?.capacita ?? null;
  }
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
  return { oggetti, perRif: new Map(oggetti.map((o) => [o.rif, o])) };
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

/** Stato iniziale di una voce appena aggiunta: pronta per armi e scudi, indossata per armature se nessuna lo è. */
export function statoIniziale(tipo, voci = [], dati = null) {
  const stati = STATI[tipo] ?? [];
  if (!stati.length) return null;
  if (tipo === 'armatura') {
    const giaIndossata = dati && voci.some((v) => v.stato === 'indossata' && risolvi(v, catalogo(dati)).tipo === 'armatura');
    return giaIndossata ? 'zaino' : 'indossata';
  }
  if (tipo === 'accessorio') return 'zaino';
  return stati.includes('pronta') ? 'pronta' : stati[0];
}

/**
 * Porta il campo `equipaggiamento` delle scelte alla forma attuale. Il vecchio campo di testo
 * diventa un unico oggetto personalizzato di tipo «altro» con quel testo nelle note.
 * @returns {object[]}
 */
export function normalizzaEquipaggiamento(valore) {
  if (typeof valore === 'string') {
    const t = valore.trim();
    return t ? [{ uid: 'e1', rif: null, personalizzato: { nome: 'Equipaggiamento (testo precedente)', tipo: 'altro' }, stato: null, quantita: 1, note: t }] : [];
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
      };
    }
    if (typeof v.montato_su === 'string' && v.montato_su) out.montato_su = v.montato_su;
    return out;
  });
}

/**
 * Collega una voce al catalogo. Un riferimento che non esiste più resta in lista come «non più in
 * catalogo», senza effetti.
 */
export function risolvi(voce, cat) {
  const def = voce.rif ? cat.perRif.get(voce.rif) ?? null : null;
  const fuoriCatalogo = !!voce.rif && !def;
  const tipo = def?.tipo ?? voce.personalizzato?.tipo ?? 'altro';
  const nome = def?.nome ?? voce.personalizzato?.nome ?? (fuoriCatalogo ? voce.rif : 'Oggetto');
  const stati = STATI[tipo] ?? [];
  const attivo = !fuoriCatalogo && ATTIVI.has(voce.stato) && stati.includes(voce.stato);
  return { voce, uid: voce.uid, def, tipo, nome, fuoriCatalogo, attivo, personalizzato: !voce.rif };
}

// ---------------------------------------------------------------------------
// Calcolo

/** Aggiunge un bonus fisso a una formula di danno: "1d6+1" + 1 → "1d6+2"; "2" + 1 → "3". */
export function aggiungiDanno(formula, n) {
  if (!formula || !n) return formula ?? null;
  const s = String(formula).trim();
  let m = /^(\d+d\d+)([+-]\d+)?$/.exec(s);
  if (m) {
    const b = Number(m[2] ?? 0) + n;
    return b ? `${m[1]}${b > 0 ? '+' : ''}${b}` : m[1];
  }
  m = /^\d+$/.exec(s);
  if (m) return String(Number(s) + n);
  return `${s} ${n > 0 ? '+' : ''}${n}`;
}

const maniDi = (def) => (def?.mani === 2 ? 2 : 1); // "1/2" (Versatile) impegna almeno una mano

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

  // Protezioni (armature indossate, scudi imbracciati) — §7.11.1
  const protezioni = [];
  const equipAbilita = {};
  const aggiungi = (nome, v) => { if (nome && v) equipAbilita[nome] = (equipAbilita[nome] ?? 0) + v; };
  let attacchiRavv = 0;
  let attacchiDist = 0;
  let movimentoQ = 0;
  let lancioPotere = 0;
  let forMancanteArmature = 0;
  for (const o of oggetti.filter((x) => x.attivo && (x.tipo === 'armatura' || x.tipo === 'scudo'))) {
    const d = o.def;
    const penalita = d ? { ...(fileArmature.categorie?.[d.categoria] ?? {}), ...(d.penalita ?? {}) } : {};
    const forMancante = d?.for_richiesta ? Math.max(0, d.for_richiesta - FOR) : 0;
    protezioni.push({
      uid: o.uid, nome: o.nome, tipo: o.tipo, categoria: d?.categoria ?? null, taglia: d?.taglia ?? null,
      ar: d?.ar ?? (Number.isInteger(o.voce.personalizzato?.ar) ? { totale: o.voce.personalizzato.ar, magica: 0 } : null),
      penalita, forRichiesta: d?.for_richiesta ?? null, forMancante, personalizzato: o.personalizzato,
      mov: d?.mov ?? 0, parata: null, alternative: [], proprieta: d?.proprieta ?? [],
    });
    if (o.tipo === 'scudo') {
      // §7.4: il requisito FOR dello Scudo segue il §7.1.6 (Parate e attacchi con lo Scudo), non
      // penalizza Agilità, Difese o gli altri attacchi; gli Scudi enormi tolgono 1 Q al MOV
      movimentoQ += d?.mov ?? 0;
      continue;
    }
    // §7.11.1: armature — penalità di categoria e FOR mancante su Agilità, Difese e attacchi
    for (const a of agilitaAbilita) aggiungi(a, (penalita.agilita ?? 0) - forMancante);
    aggiungi(difeseAbilita, -forMancante);
    attacchiRavv += (penalita.attacchi_ravvicinati ?? 0) - forMancante;
    attacchiDist += (penalita.attacchi_distanza ?? 0) - forMancante;
    movimentoQ += penalita.movimento_q ?? 0;
    lancioPotere += penalita.lancio_potere ?? 0;
    forMancanteArmature += forMancante;
  }
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
    const componenti = a ? [
      { nome: `VA ${a.nome}`, valore: a.totale },
      spec ? { nome: `Specializzazione in ${spec.nome}`, valore: spec.effetto.va ?? 0 } : null,
      // §7.1.3: Precisa X concede +X VA alle Prove per colpire con l'arma
      ...(d?.proprieta ?? []).filter((p) => p.effetto?.va).map((p) => ({ nome: p.nome, valore: p.effetto.va })),
      d?.modificatore_va ? { nome: 'Modificatore VA dell’arma', valore: d.modificatore_va } : null,
      forPen ? { nome: `FOR ${FOR} su ${d.for_richiesta} richiesta (§7.1.6)`, valore: -forPen } : null,
      armatura ? { nome: 'Armatura (§7.11.1)', valore: armatura } : null,
    ].filter(Boolean) : [];
    const va = a ? componenti.reduce((s, c) => s + c.valore, 0) : null;
    const bonusDanno = spec?.effetto.danno ?? 0;
    const dannoBase = d?.danno ?? (o.voce.personalizzato?.danno ? { una_mano: o.voce.personalizzato.danno, due_mani: null } : null);
    const parataVa = (d?.proprieta ?? []).reduce((s, p) => s + (p.effetto?.parata_va ?? 0), 0);
    const difese = difeseVa;
    // Parata con l'arma: Difese + proprietà difensive − penalità FOR dell'arma (§7.1.3, §7.1.6);
    // a distanza si aggiunge la penalità del Giocatore §5.9 (−8 VA con un'arma)
    const parata = o.tipo === 'arma_ravvicinata' && difese !== null && d ? {
      va: difese + parataVa - forPen,
      distanza: parataDistanzaArma === null ? null : difese + parataVa - forPen + parataDistanzaArma,
      componenti: [
        { nome: `VA ${difeseAbilita}`, valore: difese },
        parataVa ? { nome: 'Proprietà difensive', valore: parataVa } : null,
        forPen ? { nome: 'FOR insufficiente', valore: -forPen } : null,
      ].filter(Boolean),
    } : null;
    // §7.7: «FOR × 3» nella colonna Max Q: la gittata dipende dalla Forza del personaggio
    const gittataQ = d?.gittata_q ?? (d?.gittata_per_for ? FOR * d.gittata_per_for : null);
    armi.push({
      uid: o.uid, nome: o.nome, tipo: o.tipo, abilita: nomeAbilita, va, componenti,
      danno: dannoBase ? { una_mano: aggiungiDanno(dannoBase.una_mano, bonusDanno), due_mani: aggiungiDanno(dannoBase.due_mani, bonusDanno) } : null,
      dannoDaMunizione: !!d?.danno_da_munizione,
      munizioneRiferimento: d?.danno_da_munizione ? munizioneDiRiferimento(d.munizioni?.riferimento, dati) : null,
      bonusDanno, mani: d?.mani ?? null, portataQ: d?.portata_q ?? null, gittataQ,
      gittataFormula: d?.gittata_per_for ? `FOR ${FOR} × ${d.gittata_per_for}` : null,
      ac: d?.ac ?? null, inc: d?.inc ?? null, mov: d?.mov ?? 0, modalita: d?.modalita ?? [],
      munizioni: d?.munizioni ?? null,
      attivazione: d?.attivazione ?? null, manovre: d?.manovre ?? [], naturaDanno: d?.natura_danno ?? null,
      proprieta: d?.proprieta ?? [], parata, personalizzato: o.personalizzato,
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

  // Attacchi con lo Scudo imbracciato (Scudo Punisher §7.4.1, lama delle Guardie Sacre §7.4.10)
  for (const p of scudiAttivi) {
    const d = cat.perRif.get(oggetti.find((o) => o.uid === p.uid)?.voce.rif ?? '');
    const att = d?.attacco;
    if (!att) continue;
    const a = abilitaPer(att.abilita);
    const componenti = a ? [
      { nome: `VA ${a.nome}`, valore: a.totale },
      p.forMancante ? { nome: `FOR ${FOR} su ${d.for_richiesta} richiesta (§7.1.6)`, valore: -p.forMancante } : null,
      attacchiRavv ? { nome: 'Armatura (§7.11.1)', valore: attacchiRavv } : null,
    ].filter(Boolean) : [];
    armi.push({
      uid: `${p.uid}:attacco`, nome: `${d.nome} (attacco${att.condizione ? `, ${att.condizione}` : ''})`, tipo: 'arma_ravvicinata',
      abilita: att.abilita, va: a ? componenti.reduce((x, c) => x + c.valore, 0) : null, componenti,
      danno: { una_mano: att.danno, due_mani: null }, dannoDaMunizione: false, bonusDanno: 0, mani: att.mani,
      portataQ: att.portata_q, gittataQ: null, gittataFormula: null, ac: null, inc: null, mov: 0, modalita: [], munizioni: null,
      proprieta: att.note ? [{ nome: 'Manovre e requisiti', testo: att.note }] : [], parata: null, personalizzato: false,
      specializzazione: null, daScudo: true,
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

  // Accessori montati
  for (const x of oggetti.filter((o) => o.attivo && o.tipo === 'accessorio' && o.voce.montato_su)) {
    const su = oggetti.find((o) => o.uid === x.voce.montato_su);
    if (!su) avvisi.push(`${x.nome} è montato su un oggetto che non è più nella lista.`);
    else if (!(su.attivo && (su.tipo === 'arma_ravvicinata' || su.tipo === 'arma_distanza'))) avvisi.push(`${x.nome} è montato su ${su.nome}, che non è impugnata: nessun effetto.`);
  }

  for (const x of oggetti.filter((o) => o.fuoriCatalogo)) avvisi.push(`«${x.voce.rif}» non è più nel catalogo: resta in lista senza effetti.`);

  return {
    oggetti,
    armi,
    protezioni,
    zaino: oggetti.filter((o) => !o.attivo),
    equipAbilita,
    movimentoQ,
    lancioPotere,
    forMancanteArmature,
    avvisi,
  };
}
